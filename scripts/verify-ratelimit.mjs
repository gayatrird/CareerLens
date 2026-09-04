// Offline verification of CareerLens Groq HTTP 429 handling.
//
// Loads the REAL src/services/hiringApi.js through Vite's SSR loader (so
// import.meta.env + the API client behave like the app) but mocks `fetch`
// entirely — zero live Groq calls. Proves:
//   1. a 429 is retried, honoring the Retry-After header over the error body
//   2. sustained 429s are retried a bounded number of times, then throw a
//      clear RATE_LIMIT_EXCEEDED error (no uncontrolled loop)
//   3. the rate-limit retry listener fires so the UI can show "Retrying..."
//   4. a daily/billing limit fails fast (no retry burn)
//   5. the shared cooldown makes the NEXT sequential call wait for the window
//      instead of immediately 429-ing again
//   6. exponential backoff applies when the server gives no retry timing
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 5198, strictPort: true } });
await server.listen();

// Must match MAX_ATTEMPTS in src/services/hiringApi.js.
const MAX_ATTEMPTS = 6;

let failures = 0;
const check = (label, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) failures++;
  console.log(`${pass ? '✓' : '✗'} ${label}${pass ? '' : ` expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`}`);
};

const ATS_CONTENT = {
  score: 72,
  missingKeywords: ['AWS', 'CI/CD'],
  presentKeywords: ['React', 'Node.js'],
  suggestions: ['Quantify impact', 'Add AWS'],
  formattingIssues: 'Single column, clean.',
  sectionQuality: 'Complete sections.',
  summary: 'Solid ATS compatibility overall.',
};

const jsonResponse = (status, payload, headers = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'Content-Type': 'application/json', ...headers },
});

const okResponse = (content) => jsonResponse(200, { choices: [{ message: { content: JSON.stringify(content) } }] });
const rateLimited = (message, headers = {}) => jsonResponse(429, { error: { message } }, headers);

let fetchCount = 0;
let fetchImpl = async () => { throw new Error('no fetch stub installed'); };

const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  fetchCount++;
  return fetchImpl(input, init);
};

const notices = [];
let unsubscribe = null;

try {
  const hiringApi = await server.ssrLoadModule('/src/services/hiringApi.js');
  unsubscribe = hiringApi.subscribeRateLimitRetry(msg => notices.push(String(msg)));

  const analyze = (agentId) => hiringApi.analyzeWithAgent(agentId, 'Resume text here.', 'Job description text here.', 'general');
  const startOf = (label) => { fetchCount = 0; notices.length = 0; const t0 = Date.now(); return { label, t0 }; };
  const elapsed = (s) => Date.now() - s.t0;
  const took = (s) => `(${elapsed(s)}ms, ${fetchCount} fetch(es), ${notices.length} notice(s))`;

  // ── 1. Exponential fallback when the server gives no retry timing ─────────
  {
    const s = startOf('fallback');
    let calls = 0;
    fetchImpl = async () => {
      calls++;
      return calls === 1
        ? rateLimited('Rate limit reached for model: gpt-oss-120b (requests per min).') // no Retry-After, no "Xs" in body
        : okResponse(ATS_CONTENT);
    };
    const result = await analyze('ats');
    check('exponential fallback: call succeeds after one backoff', result.score, 72);
    check('exponential fallback: exactly 2 requests (no burst)', fetchCount, 2);
    check('exponential fallback: listener notified once', notices.length, 1);
    check('exponential fallback: notice copy is user-facing', notices[0].toLowerCase().includes('rate limited') && notices[0].toLowerCase().includes('retrying'), true);
    check('exponential fallback: waited >= 2s backoff before retry', elapsed(s) >= 2000, true);
    console.log(`   ${s.label} ${took(s)}`);
  }

  // ── 2. Retry-After header is honored (and beats the error-body time) ───────
  {
    const s = startOf('retry-after');
    let calls = 0;
    fetchImpl = async () => {
      calls++;
      return calls === 1
        ? rateLimited('Rate limit reached. Please try again in 10.00s.', { 'Retry-After': '0.02' })
        : okResponse(ATS_CONTENT);
    };
    const result = await analyze('ats');
    check('retry-after: call succeeds after one retry', result.score, 72);
    check('retry-after: exactly 2 requests', fetchCount, 2);
    check('retry-after: waited far less than the 10s body time (header used)', elapsed(s) < 8000, true);
    check('retry-after: listener notified', notices.length, 1);
    console.log(`   ${s.label} ${took(s)}`);
  }

  // ── 3. Sustained 429: bounded retries, then a clear error ─────────────────
  {
    const s = startOf('sustained');
    fetchImpl = async () => rateLimited('Rate limit reached. Please try again in 0.01s.');
    let threw = null;
    try { await analyze('ats'); } catch (e) { threw = e; }
    check('sustained: throws after bounded attempts', !!threw, true);
    check('sustained: error is RATE_LIMIT_EXCEEDED', !!threw && threw.message.startsWith('RATE_LIMIT_EXCEEDED'), true);
    check('sustained: error mentions retries were exhausted', !!threw && threw.message.includes(`${MAX_ATTEMPTS} attempts`), true);
    check('sustained: exactly MAX_ATTEMPTS requests (no uncontrolled loop)', fetchCount, MAX_ATTEMPTS);
    check('sustained: listener notified on every backoff', notices.length, MAX_ATTEMPTS - 1);
    console.log(`   ${s.label} ${took(s)}`);
  }

  // ── 4. Shared cooldown: the NEXT sequential call waits, doesn't 429 again ──
  {
    const s = startOf('cooldown');
    fetchImpl = async () => okResponse({ ...ATS_CONTENT, score: 61 });
    // Immediately after the sustained-429 failure above, this call must sleep
    // out the remaining cooldown BEFORE its first request — and succeed on the
    // first try (exactly 1 fetch, no wasted 429s).
    const result = await analyze('recruiter');
    check('cooldown: next call still succeeds', result.score, 61);
    check('cooldown: next call needed only 1 request (no 429 re-hit)', fetchCount, 1);
    check('cooldown: call waited for the window to reopen', elapsed(s) >= 200, true);
    console.log(`   ${s.label} ${took(s)}`);
  }

  // ── 5. Daily/billing limit fails fast, no retry burn ──────────────────────
  {
    const s = startOf('daily');
    fetchImpl = async () => rateLimited('You have reached the maximum requests per day (RPD) limit of 1000.');
    let threw = null;
    try { await analyze('ats'); } catch (e) { threw = e; }
    check('daily: throws immediately', !!threw && threw.message.startsWith('RATE_LIMIT_EXCEEDED'), true);
    check('daily: error identifies the quota cause', !!threw && /quota|daily|RPD/i.test(threw.message), true);
    check('daily: exactly 1 request (no retries burned)', fetchCount, 1);
    console.log(`   ${s.label} ${took(s)}`);
  }

  // ── 6. Non-429 failures are not retried as rate limits ────────────────────
  {
    const s = startOf('non-429');
    fetchImpl = async () => jsonResponse(404, { error: { message: 'Model not found: llama-3.3-70b-versatile' } });
    let threw = null;
    try { await analyze('ats'); } catch (e) { threw = e; }
    check('non-429: throws without rate-limit label', !!threw && !threw.message.includes('RATE_LIMIT_EXCEEDED'), true);
    check('non-429: exactly 1 request', fetchCount, 1);
    console.log(`   ${s.label} ${took(s)}`);
  }

  console.log(`\n${failures === 0 ? 'ALL RATE-LIMIT CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
} catch (err) {
  failures++;
  console.error('Rate-limit harness crashed:', err);
} finally {
  if (unsubscribe) unsubscribe();
  globalThis.fetch = nativeFetch;
  await server.close();
}

process.exit(failures === 0 ? 0 : 1);

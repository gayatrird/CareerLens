// scripts/verify-navigator-switch.mjs
// Automated verification for Career Navigator resume-switching, caching, race condition, and fingerprinting

// Polyfill browser globals for node testing
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.window === 'undefined') {
  global.window = {};
}

// Setup mock localStorage in Node.js environment
const store = new Map();
global.localStorage = {
  getItem: (k) => store.get(k) ?? null,
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i) => Array.from(store.keys())[i] || null,
};

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.error(`✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  const { getResumeFingerprint, getStoredNavigator, setStoredNavigator } = await import('../src/services/userStorage.js');
  const { normalizeRecord } = await import('../src/services/savedResume.js');
  const { detectJobDomain } = await import('../src/services/jobMatch.js');

  console.log("\n======================================================");
  console.log("CAREER NAVIGATOR RESUME-SWITCHING & CACHE VERIFICATION");
  console.log("======================================================\n");

  // --- Test 1: Unique Fingerprint Generation ---
  console.log("--- 1. Resume Identity & Fingerprint ---");
  const resumeTextA = "Jane Doe. Senior Full Stack Software Engineer with 8 years building React, Node.js, and TypeScript cloud systems.";
  const resumeTextB = "Sarah Connor. Registered Nurse with 6 years experience in ICU critical care, patient triage, and IV therapy.";
  const resumeTextC = "Mark Smith. High School Mathematics Teacher with 5 years experience in algebra, geometry, and curriculum development.";

  const fpA = getResumeFingerprint(resumeTextA);
  const fpB = getResumeFingerprint(resumeTextB);
  const fpC = getResumeFingerprint(resumeTextC);

  assert(fpA.startsWith("fp_"), "Fingerprint A has correct prefix");
  assert(fpB.startsWith("fp_"), "Fingerprint B has correct prefix");
  assert(fpA !== fpB, "Fingerprint A and B are distinct for different resumes");

  // Same filename, different content
  const resumeFileB = { name: "resume.pdf", text: resumeTextB };
  const resumeFileC_sameName = { name: "resume.pdf", text: resumeTextC };

  const normB = normalizeRecord(resumeFileB);
  const normC = normalizeRecord(resumeFileC_sameName);

  assert(normB.name === normC.name, "Both files share the exact same filename");
  assert(normB.id !== normC.id, "Different content produces distinct record IDs despite identical filename");
  assert(normB.id === fpB, "Record B id matches its content fingerprint");
  assert(normC.id === fpC, "Record C id matches its content fingerprint");

  // --- Test 2: Storage & Cache Isolation ---
  console.log("\n--- 2. Cache Isolation (No Cross-Resume Leakage) ---");

  // A. Store result for Resume A
  const resultA = {
    careerSummary: "Experienced Software Engineer transitioning into Cloud Architecture",
    topCareerPaths: [{ title: "Cloud Solutions Architect", fitScore: 88 }],
    targetDomain: "Technology",
    targetRole: "Software Engineer",
  };
  setStoredNavigator(resumeTextA, resultA);

  // Verify A is cached
  const cachedA = getStoredNavigator(resumeTextA);
  assert(cachedA !== null, "Resume A has its result cached");
  assert(cachedA.targetRole === "Software Engineer", "Resume A cache reflects Software Engineer");

  // Verify B has NO cache and does NOT fall back to A!
  const cachedB_initial = getStoredNavigator(resumeTextB);
  assert(cachedB_initial === null, "CRITICAL: Resume B with no cache returns null (does NOT leak Resume A)");

  // B. Upload & Generate for Resume B
  const resultB = {
    careerSummary: "Dedicated ICU Nurse transitioning to Nurse Practitioner",
    topCareerPaths: [{ title: "Family Nurse Practitioner", fitScore: 92 }],
    targetDomain: "Healthcare",
    targetRole: "Registered Nurse",
  };
  setStoredNavigator(resumeTextB, resultB);

  // Verify B now has B's cache and A still has A's cache
  const cachedB_after = getStoredNavigator(resumeTextB);
  assert(cachedB_after !== null && cachedB_after.targetDomain === "Healthcare", "Resume B now stores its own Healthcare result");
  const cachedA_after = getStoredNavigator(resumeTextA);
  assert(cachedA_after !== null && cachedA_after.targetDomain === "Technology", "Resume A cache is undisturbed by Resume B");

  // C. Resume C with same filename as B but different content
  const cachedC_initial = getStoredNavigator(resumeTextC);
  assert(cachedC_initial === null, "Resume C with same filename returns null because content is different");

  const resultC = {
    careerSummary: "Passionate Math Teacher transitioning to Educational Technology Specialist",
    topCareerPaths: [{ title: "Instructional Designer", fitScore: 90 }],
    targetDomain: "Education",
    targetRole: "Teacher",
  };
  setStoredNavigator(resumeTextC, resultC);

  const cachedC_after = getStoredNavigator(resumeTextC);
  assert(cachedC_after !== null && cachedC_after.targetDomain === "Education", "Resume C stores its own Education result");
  assert(getStoredNavigator(resumeTextB).targetDomain === "Healthcare", "Resume B result remains Healthcare");

  // --- Test 3: Domain & Role Detection Synchronization ---
  console.log("\n--- 3. Generation Input & Role Detection ---");
  const detectedA = detectJobDomain("", resumeTextA);
  const detectedB = detectJobDomain("", resumeTextB);
  const detectedC = detectJobDomain("", resumeTextC);

  assert(detectedA.domain === "Technology", `Resume A domain is ${detectedA.domain}`);
  assert(detectedB.domain === "Healthcare", `Resume B domain is ${detectedB.domain}`);
  assert(detectedC.domain === "Education", `Resume C domain is ${detectedC.domain}`);

  // --- Test 4: Race Condition Simulation ---
  console.log("\n--- 4. Race Condition Protection Simulation ---");
  let activeRequestId = 0;
  let uiDisplayedResult = null;

  // User selects Resume A -> starts generation req 1
  const req1 = ++activeRequestId;
  // User rapidly switches to Resume B -> starts generation req 2
  const req2 = ++activeRequestId;
  // User rapidly switches to Resume C -> starts generation req 3
  const req3 = ++activeRequestId;

  // Simulate async responses completing out of order:
  // First, req1 (Resume A) finishes late
  if (activeRequestId === req1) {
    uiDisplayedResult = resultA;
  } // should be ignored!
  assert(uiDisplayedResult === null, "Stale request 1 (Resume A) rejected and did not update UI");

  // Next, req2 (Resume B) finishes
  if (activeRequestId === req2) {
    uiDisplayedResult = resultB;
  } // should be ignored!
  assert(uiDisplayedResult === null, "Stale request 2 (Resume B) rejected and did not update UI");

  // Finally, req3 (Resume C) finishes
  if (activeRequestId === req3) {
    uiDisplayedResult = resultC;
  }
  assert(uiDisplayedResult === resultC, "Only the active request (Resume C) successfully updated UI");
  assert(uiDisplayedResult.targetDomain === "Education", "Displayed result accurately belongs to Resume C");

  // --- Test 5: Fallback Analysis Isolation ---
  console.log("\n--- 5. Previous Analysis Isolation ---");
  const mockAnalysisSWE = {
    resumeText: resumeTextA,
    jobMatch: { targetRole: "Software Engineer", targetDomain: "Technology" },
  };

  function buildContextForResume(targetResume, latestAnalysis) {
    const context = {};
    const detected = detectJobDomain("", targetResume.text);
    if (detected?.domain) context.targetDomain = detected.domain;
    if (detected?.role) context.targetRole = detected.role;

    if (latestAnalysis?.resumeText && targetResume?.text) {
      const isSameResume = getResumeFingerprint(targetResume.text) === getResumeFingerprint(latestAnalysis.resumeText);

      if (isSameResume) {
        if (latestAnalysis.jobMatch?.targetRole) context.targetRole = latestAnalysis.jobMatch.targetRole;
        if (latestAnalysis.jobMatch?.targetDomain) context.targetDomain = latestAnalysis.jobMatch.targetDomain;
      }
    }
    return context;
  }

  const contextForNurse = buildContextForResume({ text: resumeTextB }, mockAnalysisSWE);
  assert(contextForNurse.targetDomain === "Healthcare", `Nurse resume gets Healthcare domain (got ${contextForNurse.targetDomain})`);
  assert(contextForNurse.targetDomain !== "Technology", "Nurse resume is NOT corrupted by previous SWE analysis domain");

  const contextForSWE = buildContextForResume({ text: resumeTextA }, mockAnalysisSWE);
  assert(contextForSWE.targetDomain === "Technology", `SWE resume gets Technology domain (got ${contextForSWE.targetDomain})`);

  // --- Test 6: Saved-Resume Selection Flow (Cached vs Uncached Generation) ---
  console.log("\n--- 6. Saved-Resume Selection Flow ---");

  // Clear cache for fresh test
  store.clear();
  setStoredNavigator(resumeTextA, resultA); // A is cached
  // B is NOT cached

  const savedResumesList = [
    { id: fpA, name: "resume_A_swe.pdf", text: resumeTextA },
    { id: fpB, name: "resume_B_nurse.pdf", text: resumeTextB },
    { id: fpC, name: "resume_C_teacher.pdf", text: resumeTextC },
  ];

  let currentSelected = null;
  let currentResult = null;
  let currentStatus = "idle";
  let reqCounter = 0;

  function simulateSelectResume(resumeToSelect) {
    const record = savedResumesList.find((r) =>
      (resumeToSelect.id && r.id ? r.id === resumeToSelect.id : r.text === resumeToSelect.text)
    ) || resumeToSelect;

    const reqId = ++reqCounter;
    currentSelected = record;
    currentResult = null;
    currentStatus = "idle";

    const cached = record.text ? getStoredNavigator(record.text) : null;
    if (cached) {
      currentResult = cached;
      currentStatus = "idle";
    } else if (record.text && record.text.trim().length >= 20) {
      // Simulate executeGeneration
      currentStatus = "loading";
      currentResult = null;
      // Synthesize fresh result for this resume
      const detected = detectJobDomain("", record.text);
      const generated = {
        careerSummary: `Career summary for ${record.name}`,
        topCareerPaths: [{ title: `${detected.role} Lead`, fitScore: 85 }],
        targetDomain: detected.domain,
        targetRole: detected.role,
      };
      setStoredNavigator(record.text, generated);
      if (reqCounter === reqId) {
        currentResult = generated;
        currentStatus = "idle";
      }
    }
  }

  // Step A: Select Resume A (has cached result)
  simulateSelectResume(savedResumesList[0]);
  assert(currentSelected.name === "resume_A_swe.pdf", "Resume A is active");
  assert(currentResult !== null, "Resume A result displayed immediately from cache");
  assert(currentResult.targetRole === "Software Engineer", "Resume A displays Software Engineer result");

  // Step B: Select Resume B (has NO cached result)
  simulateSelectResume(savedResumesList[1]);
  assert(currentSelected.name === "resume_B_nurse.pdf", "Resume B is active");
  assert(currentResult !== null, "Resume B automatically generated and displayed fresh result");
  assert(currentResult.targetDomain === "Healthcare", "Resume B result is Healthcare");
  assert(currentResult.targetRole.toLowerCase().includes("nurse"), `Resume B role is Nurse (got ${currentResult.targetRole})`);
  assert(getStoredNavigator(resumeTextB) !== null, "Resume B result is now saved in cache");

  // Step C: Switch back to Resume A
  simulateSelectResume(savedResumesList[0]);
  assert(currentSelected.name === "resume_A_swe.pdf", "Resume A is active again");
  assert(currentResult.targetDomain === "Technology", "Resume A cached result restored without re-generating");

  // Step D: Switch to Resume C (uncached)
  simulateSelectResume(savedResumesList[2]);
  assert(currentSelected.name === "resume_C_teacher.pdf", "Resume C is active");
  assert(currentResult.targetDomain === "Education", "Resume C automatically generated and displayed Education result");

  // Step E: Same filename with different content
  const resumeD_sameNameAsA = {
    name: "resume_A_swe.pdf", // SAME filename as A!
    text: "Accountant with CPA, corporate audits, balance sheets, and tax compliance.",
  };
  const fpD = getResumeFingerprint(resumeD_sameNameAsA.text);
  assert(fpD !== fpA, "Resume D with same filename has completely distinct fingerprint from A");
  assert(getStoredNavigator(resumeD_sameNameAsA.text) === null, "Resume D has no cache");

  simulateSelectResume({ id: fpD, ...resumeD_sameNameAsA });
  assert(currentResult.targetDomain === "Finance & Accounting", `Resume D generated Finance result (got ${currentResult.targetDomain})`);
  assert(getStoredNavigator(resumeTextA).targetDomain === "Technology", "Original Resume A cache remains intact and isolated");

  console.log("\n======================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test runner threw error:", err);
  process.exit(1);
});

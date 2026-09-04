// CareerLens — Saved Resume persistence (browser-local via IndexedDB).
//
// Stores up to MAX_RESUMES recently used resumes so the user does not have to
// re-upload the same file for every analysis. Everything lives in the
// browser's IndexedDB — nothing is sent to any server automatically.
//
// Records are kept as an array under one key, ordered most-recently-used
// first; every write preserves that order and caps the list at 5.
//
// Record shape:
// {
//   name: string,        // original filename, e.g. "Gayatri_Resume.pdf"
//   type: string,        // MIME type
//   size: number,        // byte size
//   lastModified: number,
//   text: string,        // extracted resume text (what the analysis pipeline uses)
//   file: Blob | null,   // original file, kept for future re-use
//   savedAt: number,     // epoch ms
//   lastUsedAt: number,  // epoch ms — drives the "Last used • …" label + order
// }
//
// All functions degrade gracefully: when IndexedDB is unavailable or an entry
// is corrupt, loadSavedResumes() resolves to [] and callers fall back to the
// normal upload UI. Nothing here logs resume contents.

const DB_NAME = 'careerlens';
const DB_VERSION = 1;
const STORE_NAME = 'saved_resume';
const LIST_KEY = 'saved';
const LEGACY_KEY = 'current'; // single-resume entry written by earlier builds
const MAX_RESUMES = 5;

const isSupported = () => typeof indexedDB !== 'undefined';

function openDb() {
  return new Promise((resolve, reject) => {
    if (!isSupported()) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

function runRequest(mode, fn) {
  return openDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const request = fn(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
  });
}

// Persist the full list (plus best-effort cleanup of the legacy key) in one
// transaction, resolving when the transaction commits.
function writeRecords(list) {
  return openDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(list, LIST_KEY);
      store.delete(LEGACY_KEY); // no-op when the legacy key is already gone
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
  });
}

const isValidRecord = (record) =>
  !!record &&
  typeof record === 'object' &&
  typeof record.name === 'string' &&
  record.name.trim().length > 0 &&
  typeof record.text === 'string' &&
  record.text.trim().length > 0;

function normalizeRecord(entry) {
  const now = Date.now();
  return {
    name: entry.name,
    type: typeof entry.type === 'string' ? entry.type : '',
    size: typeof entry.size === 'number' ? entry.size : 0,
    lastModified: typeof entry.lastModified === 'number' ? entry.lastModified : 0,
    text: entry.text,
    file: entry.file || null,
    savedAt: typeof entry.savedAt === 'number' ? entry.savedAt : now,
    lastUsedAt:
      typeof entry.lastUsedAt === 'number'
        ? entry.lastUsedAt
        : typeof entry.savedAt === 'number'
          ? entry.savedAt
          : now,
  };
}

/**
 * Load all saved resumes, most recently used first (max MAX_RESUMES).
 * Migrates the legacy single-resume record written by earlier builds.
 * @returns {Promise<Array<{name: string, type: string, size: number, lastModified: number, text: string, file: Blob|null, savedAt: number, lastUsedAt: number}>>}
 */
export async function loadSavedResumes() {
  if (!isSupported()) return [];
  try {
    const raw = await runRequest('readonly', (store) => store.get(LIST_KEY));
    const list = Array.isArray(raw)
      ? raw.filter(isValidRecord).map(normalizeRecord).slice(0, MAX_RESUMES)
      : null;
    if (list && list.length > 0) return list;
    // Nothing usable under LIST_KEY — migrate the legacy single-entry record
    // written by earlier builds. This covers both "never saved before" and an
    // emptied list (e.g. after a downgrade/upgrade cycle), so an old resume is
    // never silently lost.
    const legacy = await runRequest('readonly', (store) => store.get(LEGACY_KEY));
    if (isValidRecord(legacy)) {
      const migrated = [normalizeRecord(legacy)].slice(0, MAX_RESUMES);
      writeRecords(migrated).catch(() => {});
      return migrated;
    }
    return list || [];
  } catch {
    return [];
  }
}

/**
 * Persist (or replace, by filename) a resume and move it to the top of the
 * saved list. Trims the list to MAX_RESUMES. Non-fatal on failure.
 * @param {{name: string, type?: string, size?: number, lastModified?: number, text: string, file?: Blob}} entry
 * @returns {Promise<boolean>}
 */
export async function saveResume(entry) {
  if (!isSupported() || !entry || !entry.name || typeof entry.text !== 'string') return false;
  try {
    const current = await loadSavedResumes();
    const record = normalizeRecord({ ...entry, savedAt: Date.now(), lastUsedAt: Date.now() });
    const rest = current.filter((r) => r.name !== record.name); // never duplicate the same file
    await writeRecords([record, ...rest].slice(0, MAX_RESUMES));
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark a saved resume as the one just used: bump its lastUsedAt and move it to
 * the front of the list (persisted, so the order survives a refresh).
 * @param {string} name
 * @returns {Promise<boolean>}
 */
export async function markResumeUsed(name) {
  if (!isSupported() || !name) return false;
  try {
    const current = await loadSavedResumes();
    const entry = current.find((r) => r.name === name);
    if (!entry) return false;
    const rest = current.filter((r) => r.name !== name);
    await writeRecords([normalizeRecord({ ...entry, lastUsedAt: Date.now() }), ...rest]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a saved resume by filename. Without a name, clears the whole saved
 * list (kept for compatibility with earlier callers). Resolves true when a
 * record was actually removed.
 * @param {string} [name]
 * @returns {Promise<boolean>}
 */
export async function removeSavedResume(name) {
  if (!isSupported()) return false;
  try {
    const current = await loadSavedResumes();
    if (!name) {
      if (current.length === 0) return false;
      await writeRecords([]);
      return true;
    }
    const next = current.filter((r) => r.name !== name);
    if (next.length === current.length) return false;
    await writeRecords(next);
    return true;
  } catch {
    return false;
  }
}

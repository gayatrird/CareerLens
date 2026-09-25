import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { auth } from './firebase.js';
import { getResumeFingerprint } from './userStorage.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

// CareerLens — Saved Resume persistence (browser-local via IndexedDB).
//
// Stores up to MAX_RESUMES recently used resumes per authenticated user so the
// user does not have to re-upload the same file for every analysis.
// Everything lives in the browser's IndexedDB scoped to the Firebase UID.
//
// Records are kept as an array under key `saved_${uid}`, ordered most-recently-used
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
//   userId: string,      // Firebase UID
// }

const DB_NAME = 'careerlens';
const DB_VERSION = 1;
const STORE_NAME = 'saved_resume';
const LEGACY_LIST_KEY = 'saved';
const LEGACY_SINGLE_KEY = 'current';
export const MAX_RESUMES = 5;

const isSupported = () => typeof indexedDB !== 'undefined';

function resolveUid(explicitUid) {
  if (explicitUid && typeof explicitUid === 'string') return explicitUid;
  return auth?.currentUser?.uid || 'anonymous';
}

function getUserStoreKey(explicitUid) {
  const uid = resolveUid(explicitUid);
  return `saved_${uid}`;
}

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

// Persist the user's list under their user-scoped key in one transaction.
function writeRecords(list, key) {
  return openDb().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(list, key);
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

export function normalizeRecord(entry, uid) {
  const now = Date.now();
  const text = typeof entry.text === 'string' ? entry.text : '';
  const fingerprint = entry.id || (text ? getResumeFingerprint(text) : `res_${now}`);
  return {
    id: fingerprint,
    name: entry.name,
    type: typeof entry.type === 'string' ? entry.type : '',
    size: typeof entry.size === 'number' ? entry.size : 0,
    lastModified: typeof entry.lastModified === 'number' ? entry.lastModified : 0,
    text,
    file: entry.file || null,
    savedAt: typeof entry.savedAt === 'number' ? entry.savedAt : now,
    lastUsedAt:
      typeof entry.lastUsedAt === 'number'
        ? entry.lastUsedAt
        : typeof entry.savedAt === 'number'
          ? entry.savedAt
          : now,
    userId: entry.userId || uid || 'anonymous',
  };
}

/**
 * Load saved resumes for the current authenticated user, MRU first (max MAX_RESUMES).
 * Performs safe one-time migration of legacy unscoped records only for the initial migrating user.
 * @param {string} [explicitUid]
 * @returns {Promise<Array<{name: string, type: string, size: number, lastModified: number, text: string, file: Blob|null, savedAt: number, lastUsedAt: number, userId: string}>>}
 */
export async function loadSavedResumes(explicitUid) {
  if (!isSupported()) return [];
  const uid = resolveUid(explicitUid);
  const userKey = getUserStoreKey(uid);

  try {
    const raw = await runRequest('readonly', (store) => store.get(userKey));
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.filter(isValidRecord).map((r) => normalizeRecord(r, uid)).slice(0, MAX_RESUMES);
    }

    // Check if legacy migration applies for this user
    if (uid !== 'anonymous') {
      const migratedTo = localStorage.getItem('careerlens_legacy_migrated_to');
      const isMigrated = localStorage.getItem('careerlens_legacy_migrated') === 'true';

      // Migrate only if not migrated yet or if this is the user designated for legacy migration
      if (!isMigrated || migratedTo === uid) {
        const legacySaved = await runRequest('readonly', (store) => store.get(LEGACY_LIST_KEY));
        const legacySingle = await runRequest('readonly', (store) => store.get(LEGACY_SINGLE_KEY));
        const legacyList = Array.isArray(legacySaved)
          ? legacySaved
          : isValidRecord(legacySingle)
            ? [legacySingle]
            : [];

        if (legacyList.length > 0) {
          const migrated = legacyList
            .filter(isValidRecord)
            .map((r) => normalizeRecord({ ...r, userId: uid }, uid))
            .slice(0, MAX_RESUMES);

          if (migrated.length > 0) {
            await writeRecords(migrated, userKey);
            // Clean up legacy unscoped keys so they cannot be accessed by other users
            await runRequest('readwrite', (store) => {
              store.delete(LEGACY_LIST_KEY);
              store.delete(LEGACY_SINGLE_KEY);
            }).catch(() => {});
            return migrated;
          }
        }
      }
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Persist (or replace, by filename) a resume for the current user and move it to the top.
 * Trims the list to MAX_RESUMES. Non-fatal on failure.
 * @param {{name: string, type?: string, size?: number, lastModified?: number, text: string, file?: Blob}} entry
 * @param {string} [explicitUid]
 * @returns {Promise<boolean>}
 */
export async function saveResume(entry, explicitUid) {
  if (!isSupported() || !entry || !entry.name || typeof entry.text !== 'string') return false;
  const uid = resolveUid(explicitUid);
  const userKey = getUserStoreKey(uid);

  try {
    const current = await loadSavedResumes(uid);
    const record = normalizeRecord(
      { ...entry, userId: uid, savedAt: Date.now(), lastUsedAt: Date.now() },
      uid
    );
    // Filter out old records that either share the exact same content ID or same filename
    const rest = current.filter((r) => r.id !== record.id && r.name !== record.name);
    await writeRecords([record, ...rest].slice(0, MAX_RESUMES), userKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark a saved resume as the one just used for current user.
 * @param {string} identifier - Resume name or id
 * @param {string} [explicitUid]
 * @returns {Promise<boolean>}
 */
export async function markResumeUsed(identifier, explicitUid) {
  if (!isSupported() || !identifier) return false;
  const uid = resolveUid(explicitUid);
  const userKey = getUserStoreKey(uid);

  try {
    const current = await loadSavedResumes(uid);
    const entry = current.find((r) => r.id === identifier || r.name === identifier);
    if (!entry) return false;
    const rest = current.filter((r) => (entry.id ? r.id !== entry.id : r.name !== entry.name));
    await writeRecords(
      [normalizeRecord({ ...entry, lastUsedAt: Date.now() }, uid), ...rest],
      userKey
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove a saved resume by filename or id for the current user.
 * @param {string} [identifier] - Resume name or id
 * @param {string} [explicitUid]
 * @returns {Promise<boolean>}
 */
export async function removeSavedResume(identifier, explicitUid) {
  if (!isSupported()) return false;
  const uid = resolveUid(explicitUid);
  const userKey = getUserStoreKey(uid);

  try {
    const current = await loadSavedResumes(uid);
    if (!identifier) {
      if (current.length === 0) return false;
      await writeRecords([], userKey);
      return true;
    }
    const next = current.filter((r) => r.id !== identifier && r.name !== identifier);
    if (next.length === current.length) return false;
    await writeRecords(next, userKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract text from a PDF ArrayBuffer using pdfjsLib.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';
  }
  return fullText;
}

/**
 * Extract text from a DOCX ArrayBuffer using mammoth.
 * @param {ArrayBuffer} arrayBuffer
 * @returns {Promise<string>}
 */
export async function extractTextFromDocx(arrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Parse an uploaded resume File (.pdf, .docx, .doc, .txt) and extract cleaned text.
 * @param {File} file
 * @returns {Promise<{name: string, type: string, size: number, lastModified: number, text: string, file: File}>}
 */
export async function parseResumeFile(file) {
  if (!file) throw new Error('No file selected.');
  if (!file.name.match(/\.(txt|pdf|docx|doc)$/i)) {
    throw new Error('Unsupported format. Please upload a .pdf, .docx, or .txt file.');
  }

  const arrayBuffer = await file.arrayBuffer();
  let text = '';

  if (file.name.toLowerCase().endsWith('.pdf')) {
    text = await extractTextFromPDF(arrayBuffer);
  } else if (file.name.toLowerCase().match(/\.docx?$/)) {
    text = await extractTextFromDocx(arrayBuffer);
  } else {
    // Plain text
    text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read text file.'));
      reader.readAsText(file);
    });
  }

  const cleaned = text.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{3,}/g, '\n').trim();
  const resumeSource = cleaned || text;

  if (!resumeSource || resumeSource.trim().length < 20) {
    throw new Error('Extracted text is empty or too short to be a valid resume.');
  }

  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size || 0,
    lastModified: file.lastModified || Date.now(),
    text: resumeSource,
    file,
  };
}

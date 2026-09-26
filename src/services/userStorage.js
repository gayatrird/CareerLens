import { auth } from './firebase.js';

/**
 * Centralized User Storage Helper for CareerLens
 *
 * Scopes all persistent user data to the authenticated Firebase UID.
 * Unauthenticated / anonymous sessions fallback safely to 'anonymous'.
 */

export function getUserUid(explicitUid) {
  if (explicitUid && typeof explicitUid === 'string') return explicitUid;
  return auth?.currentUser?.uid || 'anonymous';
}

function legacyResumeHash(text) {
  if (!text) return 'empty';
  let h = 0;
  for (let i = 0; i < Math.min(text.length, 500); i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

export function getResumeFingerprint(text) {
  if (!text || typeof text !== 'string') return 'empty';
  const clean = text.trim();
  const len = clean.length;
  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < len; i++) {
    const code = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193);
    h2 = ((h2 << 5) + h2 + code) | 0;
  }
  return `fp_${len.toString(36)}_${Math.abs(h1).toString(36)}_${Math.abs(h2).toString(36)}`;
}

// ─── Key Builders ─────────────────────────────────────────────────────────────

export function getStorageKey(type, explicitUid) {
  const uid = getUserUid(explicitUid);
  return `careerlens_user_${uid}_${type}`;
}

export function getNavigatorCacheKey(resumeText, explicitUid) {
  const uid = getUserUid(explicitUid);
  return `careerlens_user_${uid}_navigator_${getResumeFingerprint(resumeText)}`;
}

// ─── Latest Analysis ─────────────────────────────────────────────────────────

export function getStoredLastAnalysis(explicitUid) {
  try {
    const key = getStorageKey('last_analysis', explicitUid);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    return null;
  } catch {
    return null;
  }
}

export function setStoredLastAnalysis(data, explicitUid) {
  try {
    const key = getStorageKey('last_analysis', explicitUid);
    if (!data) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('Failed to store last analysis', err);
  }
}

// ─── Archives / History ──────────────────────────────────────────────────────

export function getStoredArchives(explicitUid) {
  try {
    const key = getStorageKey('archives', explicitUid);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function setStoredArchives(data, explicitUid) {
  try {
    const key = getStorageKey('archives', explicitUid);
    const list = Array.isArray(data) ? data : [];
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to store archives', err);
  }
}
// ─── Resume-Linked Analysis Lookup ───────────────────────────────────────────

/**
 * Find the analysis specifically belonging to a given resume.
 * Strict isolation: checks only this resume's content fingerprint.
 * Never falls back to another resume's analysis.
 */
export function findAnalysisForResume(resume, options = {}) {
  if (!resume) return null;
  const { currentAnalysis = null, explicitUid = null } = options;
  const resumeText = resume.text || (typeof resume === 'string' ? resume : '');
  const resumeFp = resume.id || (resumeText ? getResumeFingerprint(resumeText) : null);
  if (!resumeFp && !resumeText) return null;

  // 1. Current in-memory analysis (e.g. active Job Match run)
  if (currentAnalysis) {
    const curFp =
      currentAnalysis.resumeId ||
      currentAnalysis.resumeFp ||
      (currentAnalysis.resumeText ? getResumeFingerprint(currentAnalysis.resumeText) : null);
    if (
      (curFp && resumeFp && curFp === resumeFp) ||
      (currentAnalysis.resumeText && resumeText && getResumeFingerprint(currentAnalysis.resumeText) === getResumeFingerprint(resumeText))
    ) {
      return currentAnalysis;
    }
  }

  // 2. Latest stored analysis for this user
  try {
    const last = getStoredLastAnalysis(explicitUid);
    if (last) {
      const lastFp =
        last.resumeId ||
        last.resumeFp ||
        (last.resumeText ? getResumeFingerprint(last.resumeText) : null);
      if (
        (lastFp && resumeFp && lastFp === resumeFp) ||
        (last.resumeText && resumeText && getResumeFingerprint(last.resumeText) === getResumeFingerprint(resumeText))
      ) {
        return last;
      }
    }
  } catch (_) {}

  // 3. Stored user history/archives (most recent first)
  try {
    const archives = getStoredArchives(explicitUid);
    if (Array.isArray(archives)) {
      for (let i = archives.length - 1; i >= 0; i--) {
        const arch = archives[i];
        if (arch) {
          const archFp =
            arch.resumeId ||
            arch.resumeFp ||
            (arch.resumeText ? getResumeFingerprint(arch.resumeText) : null);
          if (
            (archFp && resumeFp && archFp === resumeFp) ||
            (arch.resumeText && resumeText && getResumeFingerprint(arch.resumeText) === getResumeFingerprint(resumeText))
          ) {
            return arch;
          }
        }
      }
    }
  } catch (_) {}

  return null;
}

// ─── Mock Interviews ─────────────────────────────────────────────────────────

export function getStoredMockInterviews(explicitUid) {
  try {
    const key = getStorageKey('mock_interviews', explicitUid);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function setStoredMockInterviews(data, explicitUid) {
  try {
    const key = getStorageKey('mock_interviews', explicitUid);
    const list = Array.isArray(data) ? data : [];
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed to store mock interviews', err);
  }
}

// ─── Career Navigator Cache ──────────────────────────────────────────────────

export function getStoredNavigator(resumeText, explicitUid) {
  try {
    const uid = getUserUid(explicitUid);
    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
      return null;
    }

    // 1. Direct lookup by robust content fingerprint
    const directKey = getNavigatorCacheKey(resumeText, uid);
    const raw = localStorage.getItem(directKey);
    if (raw) return JSON.parse(raw);

    // 2. Backward compatibility: check legacy 500-char hash key for this specific resume
    const legacyKey = `careerlens_user_${uid}_navigator_${legacyResumeHash(resumeText)}`;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) return JSON.parse(legacyRaw);

    // Explicitly return null if no cached result exists for this specific resume.
    // Never fall back to another resume's cached result!
    return null;
  } catch {
    return null;
  }
}

export function setStoredNavigator(resumeText, data, explicitUid) {
  try {
    if (!resumeText || typeof resumeText !== 'string') return;
    const uid = getUserUid(explicitUid);
    const directKey = getNavigatorCacheKey(resumeText, uid);
    const legacyKey = `careerlens_user_${uid}_navigator_${legacyResumeHash(resumeText)}`;

    if (!data) {
      localStorage.removeItem(directKey);
      localStorage.removeItem(legacyKey);
    } else {
      localStorage.setItem(directKey, JSON.stringify(data));
    }
  } catch (err) {
    console.warn('Failed to store navigator cache', err);
  }
}

// ─── Clear User History ───────────────────────────────────────────────────────

export function clearUserHistory(explicitUid) {
  try {
    const uid = getUserUid(explicitUid);
    localStorage.removeItem(getStorageKey('archives', uid));
    localStorage.removeItem(getStorageKey('last_analysis', uid));
  } catch (err) {
    console.warn('Failed to clear user history', err);
  }
}

// ─── User Motion Preferences ──────────────────────────────────────────────────

export function getStoredUserMotion(explicitUid) {
  try {
    const uid = getUserUid(explicitUid);
    const key = `careerlens_user_${uid}_reduce_motion`;
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return saved === 'true';
    }
    // Check system prefers-reduced-motion fallback
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function setStoredUserMotion(enabled, explicitUid) {
  try {
    const uid = getUserUid(explicitUid);
    const key = `careerlens_user_${uid}_reduce_motion`;
    localStorage.setItem(key, enabled ? 'true' : 'false');
    if (typeof document !== 'undefined') {
      if (enabled) {
        document.documentElement.setAttribute('data-reduce-motion', 'true');
      } else {
        document.documentElement.removeAttribute('data-reduce-motion');
      }
    }
  } catch (err) {
    console.warn('Failed to store reduce motion preference', err);
  }
}

// ─── Job Applications Tracker ───────────────────────────────────────────────

export function getStoredApplications(explicitUid) {
  try {
    const key = getStorageKey('job_applications', explicitUid);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch {
    return [];
  }
}

export function setStoredApplications(data, explicitUid) {
  try {
    const key = getStorageKey('job_applications', explicitUid);
    const list = Array.isArray(data) ? data : [];
    localStorage.setItem(key, JSON.stringify(list));
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      try {
        window.dispatchEvent(new CustomEvent('careerlens_applications_updated', {
          detail: { uid: getUserUid(explicitUid), count: list.length }
        }));
      } catch (_) {}
    }
  } catch (err) {
    console.warn('Failed to store job applications', err);
  }
}

export function addStoredApplication(appData, explicitUid) {
  try {
    const existing = getStoredApplications(explicitUid);
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const company = (appData?.company || appData?.companyName || '').trim();
    const jobTitle = (appData?.jobTitle || '').trim();

    const newApp = {
      id: 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
      company,
      jobTitle,
      jobDescription: (appData?.jobDescription || '').trim(),
      location: (appData?.location || '').trim(),
      applicationDate: appData?.applicationDate || today,
      status: appData?.status || 'Saved',
      matchScore: typeof appData?.matchScore === 'number' ? appData.matchScore : null,
      notes: (appData?.notes || '').trim(),
      resumeId: appData?.resumeId || null,
      resumeName: appData?.resumeName || null,
      createdAt: now,
      updatedAt: now,
    };

    const updatedList = [newApp, ...existing];
    setStoredApplications(updatedList, explicitUid);
    return newApp;
  } catch (err) {
    console.warn('Failed to add job application', err);
    return null;
  }
}

export function updateStoredApplication(id, updates, explicitUid) {
  try {
    const existing = getStoredApplications(explicitUid);
    let updatedItem = null;
    const now = new Date().toISOString();

    const updatedList = existing.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          ...updates,
          updatedAt: now,
        };
        return updatedItem;
      }
      return item;
    });

    if (updatedItem) {
      setStoredApplications(updatedList, explicitUid);
    }
    return updatedItem;
  } catch (err) {
    console.warn('Failed to update job application', err);
    return null;
  }
}

export function deleteStoredApplication(id, explicitUid) {
  try {
    const existing = getStoredApplications(explicitUid);
    const filtered = existing.filter((item) => item.id !== id);
    setStoredApplications(filtered, explicitUid);
    return filtered.length < existing.length;
  } catch (err) {
    console.warn('Failed to delete job application', err);
    return false;
  }
}

// ─── User Scoped Data Export & Wipe ───────────────────────────────────────────

export function exportAllUserData(explicitUid) {
  const uid = getUserUid(explicitUid);
  return {
    app: 'CareerLens',
    version: '2.0',
    exportedAt: new Date().toISOString(),
    user: uid,
    preferences: {
      reduceMotion: getStoredUserMotion(uid),
    },
    lastAnalysis: getStoredLastAnalysis(uid),
    archives: getStoredArchives(uid),
    mockInterviews: getStoredMockInterviews(uid),
    applications: getStoredApplications(uid),
  };
}

export function clearAllUserData(explicitUid) {
  try {
    const uid = getUserUid(explicitUid);
    clearUserHistory(uid);
    localStorage.removeItem(getStorageKey('mock_interviews', uid));
    localStorage.removeItem(getStorageKey('job_applications', uid));
    localStorage.removeItem(`careerlens_user_${uid}_reduce_motion`);

    // Clean user navigator caches
    const prefix = `careerlens_user_${uid}_navigator_`;
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('Failed to clear all user data', err);
  }
}

// ─── One-Time Legacy Migration ────────────────────────────────────────────────

export function migrateLegacyDataIfNeeded(uid) {
  if (!uid || uid === 'anonymous') return;

  try {
    const migrationFlag = localStorage.getItem('careerlens_legacy_migrated');
    if (migrationFlag === 'true') return; // Already migrated once to the original user

    // Check if target user already has data in their namespace
    const existingUserAnalysis = localStorage.getItem(`careerlens_user_${uid}_last_analysis`);
    const existingUserArchives = localStorage.getItem(`careerlens_user_${uid}_archives`);
    if (existingUserAnalysis || existingUserArchives) {
      // User already has their own data; do not overwrite
      localStorage.setItem('careerlens_legacy_migrated', 'true');
      localStorage.setItem('careerlens_legacy_migrated_to', uid);
      return;
    }

    // Inspect legacy unscoped items
    const legacyAnalysis =
      localStorage.getItem('careerlens_last_analysis') ||
      localStorage.getItem('hireflow_last_analysis');
    const legacyArchives =
      localStorage.getItem('courtroom_archives') ||
      localStorage.getItem('courtRoomArchives') ||
      localStorage.getItem('careerlens_history');
    const legacyMocks = localStorage.getItem('careerlens_mock_interviews');

    let migratedAny = false;

    if (legacyAnalysis) {
      localStorage.setItem(`careerlens_user_${uid}_last_analysis`, legacyAnalysis);
      migratedAny = true;
    }

    if (legacyArchives) {
      localStorage.setItem(`careerlens_user_${uid}_archives`, legacyArchives);
      migratedAny = true;
    }

    if (legacyMocks) {
      localStorage.setItem(`careerlens_user_${uid}_mock_interviews`, legacyMocks);
      migratedAny = true;
    }

    // Migrate unscoped navigator caches
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('careerlens_navigator_') && !k.includes('_user_')) {
        const hash = k.replace('careerlens_navigator_', '');
        const val = localStorage.getItem(k);
        if (val) {
          localStorage.setItem(`careerlens_user_${uid}_navigator_${hash}`, val);
          migratedAny = true;
        }
      }
    }

    // Mark migration complete
    localStorage.setItem('careerlens_legacy_migrated', 'true');
    localStorage.setItem('careerlens_legacy_migrated_to', uid);

    // Clean up global legacy keys so subsequent new users never see them
    if (migratedAny) {
      localStorage.removeItem('careerlens_last_analysis');
      localStorage.removeItem('hireflow_last_analysis');
      localStorage.removeItem('courtroom_archives');
      localStorage.removeItem('courtRoomArchives');
      localStorage.removeItem('careerlens_history');
      localStorage.removeItem('careerlens_mock_interviews');
      // Clean unscoped navigator caches
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('careerlens_navigator_') && !k.includes('_user_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch (err) {
    console.warn('Legacy migration error', err);
  }
}

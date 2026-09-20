import { auth } from './firebase';

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

function resumeHash(text) {
  if (!text) return 'empty';
  let h = 0;
  for (let i = 0; i < Math.min(text.length, 500); i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// ─── Key Builders ─────────────────────────────────────────────────────────────

export function getStorageKey(type, explicitUid) {
  const uid = getUserUid(explicitUid);
  return `careerlens_user_${uid}_${type}`;
}

export function getNavigatorCacheKey(resumeText, explicitUid) {
  const uid = getUserUid(explicitUid);
  return `careerlens_user_${uid}_navigator_${resumeHash(resumeText)}`;
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
    if (resumeText) {
      const directKey = getNavigatorCacheKey(resumeText, uid);
      const raw = localStorage.getItem(directKey);
      if (raw) return JSON.parse(raw);
    }

    // Fallback: search across this user's stored navigator keys
    const prefix = `careerlens_user_${uid}_navigator_`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        const raw = localStorage.getItem(k);
        if (raw) return JSON.parse(raw);
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function setStoredNavigator(resumeText, data, explicitUid) {
  try {
    const key = getNavigatorCacheKey(resumeText, explicitUid);
    if (!data) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(data));
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

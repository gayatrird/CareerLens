/**
 * Verification test for Job Application Tracker:
 * - Application creation with defaults and custom fields
 * - Unique ID generation across multiple applications
 * - Strict user-scoped isolation (User Alpha vs User Beta vs Anonymous)
 * - Status updates across all stages (Saved -> Applied -> Interview -> Offer -> Rejected)
 * - Notes updates and timestamp tracking
 * - Deletion with isolation (does not affect other applications)
 * - Real-time Search by company and job title
 * - Status filtering (All, Saved, Applied, Interview, Offer, Rejected)
 * - Empty state verification
 * - Persistence after reload (re-reading from storage)
 */

import fs from 'fs';
import path from 'path';

// Mock localStorage for Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
  get length() {
    return Object.keys(this.store).length;
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

globalThis.localStorage = new MockLocalStorage();

// Import storage functions
const {
  getStoredApplications,
  setStoredApplications,
  addStoredApplication,
  updateStoredApplication,
  deleteStoredApplication,
  getStorageKey,
} = await import('../src/services/userStorage.js');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✓ ${message}`);
    passed++;
  }
}

console.log('\n======================================================');
console.log('CAREERLENS JOB APPLICATION TRACKER VERIFICATION');
console.log('======================================================\n');

// ─── 1. EMPTY STATE & STORAGE INITIALIZATION ───
console.log('--- 1. Empty State & Storage Key Initialization ---');

const emptyApps = getStoredApplications('user_test_1');
assert(Array.isArray(emptyApps), 'getStoredApplications returns an array');
assert(emptyApps.length === 0, 'Initial state is completely empty');

const testStorageKey = getStorageKey('job_applications', 'user_test_1');
assert(
  testStorageKey === 'careerlens_user_user_test_1_job_applications',
  `Storage key is user-scoped (got "${testStorageKey}")`
);
assert(!testStorageKey.includes('undefined'), 'Storage key does not contain undefined');

// ─── 2. APPLICATION CREATION WITH DEFAULTS ───
console.log('\n--- 2. Application Creation & Defaults ---');

const app1 = addStoredApplication(
  {
    company: 'Stripe',
    jobTitle: 'Senior Full Stack Engineer',
    location: 'Remote, US',
    jobDescription: 'Design and build resilient payment infrastructure.',
    matchScore: 92,
    notes: 'Referral from Sarah on LinkedIn',
  },
  'user_alpha'
);

assert(Boolean(app1), 'Application was created successfully');
assert(typeof app1.id === 'string' && app1.id.startsWith('app_'), 'Application has a generated ID prefixed with app_');
assert(app1.company === 'Stripe', 'Company name stored correctly');
assert(app1.jobTitle === 'Senior Full Stack Engineer', 'Job title stored correctly');
assert(app1.status === 'Saved', 'Status defaulted to "Saved"');
assert(typeof app1.applicationDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(app1.applicationDate), 'Application date defaulted to YYYY-MM-DD');
assert(app1.matchScore === 92, 'Match score stored correctly');
assert(app1.notes === 'Referral from Sarah on LinkedIn', 'Notes stored correctly');
assert(Boolean(app1.createdAt), 'createdAt timestamp generated');
assert(Boolean(app1.updatedAt), 'updatedAt timestamp generated');

// Create second application with custom status and date
const app2 = addStoredApplication(
  {
    company: 'Google',
    jobTitle: 'Staff Software Engineer',
    location: 'Mountain View, CA',
    applicationDate: '2026-09-15',
    status: 'Applied',
    matchScore: 88,
  },
  'user_alpha'
);

assert(app2.company === 'Google', 'Second app company stored');
assert(app2.status === 'Applied', 'Custom status "Applied" honored');
assert(app2.applicationDate === '2026-09-15', 'Custom applicationDate honored');

// ─── 3. UNIQUE IDS ───
console.log('\n--- 3. Unique IDs Generation ---');

const app3 = addStoredApplication(
  {
    company: 'Microsoft',
    jobTitle: 'Principal Cloud Architect',
  },
  'user_alpha'
);

assert(app1.id !== app2.id, 'app1.id and app2.id are unique');
assert(app2.id !== app3.id, 'app2.id and app3.id are unique');
assert(app1.id !== app3.id, 'app1.id and app3.id are unique');

const allAlphaApps = getStoredApplications('user_alpha');
assert(allAlphaApps.length === 3, 'User Alpha has exactly 3 applications');
const idSet = new Set(allAlphaApps.map((a) => a.id));
assert(idSet.size === 3, 'All 3 application IDs are completely distinct');

// ─── 4. STRICT USER ISOLATION ───
console.log('\n--- 4. Strict User-Scoped Isolation ---');

// User Beta should have 0 applications initially
const betaAppsInitial = getStoredApplications('user_beta');
assert(betaAppsInitial.length === 0, 'User Beta initially has 0 applications (isolated from Alpha)');

// Anonymous user should have 0 applications initially
const anonAppsInitial = getStoredApplications('anonymous');
assert(anonAppsInitial.length === 0, 'Anonymous user has 0 applications (isolated from Alpha)');

// Add application for User Beta
const betaApp = addStoredApplication(
  {
    company: 'Mayo Clinic',
    jobTitle: 'Clinical Nurse Specialist',
    location: 'Rochester, MN',
    status: 'Interview',
    matchScore: 95,
  },
  'user_beta'
);

const alphaAfterBeta = getStoredApplications('user_alpha');
const betaAfterBeta = getStoredApplications('user_beta');

assert(alphaAfterBeta.length === 3, 'User Alpha still has exactly 3 applications');
assert(betaAfterBeta.length === 1, 'User Beta has exactly 1 application');
assert(
  !alphaAfterBeta.some((a) => a.company === 'Mayo Clinic'),
  'User Alpha cannot see User Beta\'s Mayo Clinic application'
);
assert(
  !betaAfterBeta.some((a) => a.company === 'Stripe'),
  'User Beta cannot see User Alpha\'s Stripe application'
);

// Verify distinct keys in raw storage
const rawAlpha = localStorage.getItem('careerlens_user_user_alpha_job_applications');
const rawBeta = localStorage.getItem('careerlens_user_user_beta_job_applications');
const rawGlobal = localStorage.getItem('job_applications');

assert(Boolean(rawAlpha), 'User Alpha data exists in scoped key');
assert(Boolean(rawBeta), 'User Beta data exists in scoped key');
assert(rawGlobal === null, 'No global unscoped "job_applications" key exists');

// ─── 5. STATUS UPDATES ACROSS LIFECYCLE ───
console.log('\n--- 5. Status Management Across Lifecycle ---');

// Saved -> Applied
const updatedToApplied = updateStoredApplication(app1.id, { status: 'Applied' }, 'user_alpha');
assert(updatedToApplied.status === 'Applied', 'Status successfully changed from Saved to Applied');

// Applied -> Interview
const updatedToInterview = updateStoredApplication(app1.id, { status: 'Interview' }, 'user_alpha');
assert(updatedToInterview.status === 'Interview', 'Status successfully changed to Interview');

// Interview -> Offer
const updatedToOffer = updateStoredApplication(app1.id, { status: 'Offer' }, 'user_alpha');
assert(updatedToOffer.status === 'Offer', 'Status successfully changed to Offer');

// Non-linear transition (Offer -> Rejected or backwards)
const updatedToRejected = updateStoredApplication(app1.id, { status: 'Rejected' }, 'user_alpha');
assert(updatedToRejected.status === 'Rejected', 'Status successfully changed to Rejected');

const updatedBackToSaved = updateStoredApplication(app1.id, { status: 'Saved' }, 'user_alpha');
assert(updatedBackToSaved.status === 'Saved', 'Status can move backwards freely to Saved');

// Verify updatedAt timestamp changed
assert(new Date(updatedBackToSaved.updatedAt) >= new Date(app1.createdAt), 'updatedAt timestamp reflects update');

// ─── 6. NOTES UPDATES ───
console.log('\n--- 6. Notes Updates ---');

const updatedNotes = updateStoredApplication(
  app1.id,
  { notes: 'Completed Round 1 technical interview on Zoom. Reviewing system design concepts.' },
  'user_alpha'
);

assert(
  updatedNotes.notes.includes('Completed Round 1 technical interview'),
  'Notes updated successfully'
);

const refreshedAlpha = getStoredApplications('user_alpha');
const reloadedApp1 = refreshedAlpha.find((a) => a.id === app1.id);
assert(
  reloadedApp1.notes.includes('Completed Round 1 technical interview'),
  'Updated notes persisted into storage'
);

// ─── 7. DELETION ───
console.log('\n--- 7. Application Deletion ---');

const deleteSuccess = deleteStoredApplication(app3.id, 'user_alpha');
assert(deleteSuccess === true, 'deleteStoredApplication returns true on successful delete');

const alphaAfterDelete = getStoredApplications('user_alpha');
assert(alphaAfterDelete.length === 2, 'User Alpha application count reduced to 2');
assert(!alphaAfterDelete.some((a) => a.id === app3.id), 'Deleted application app3 no longer in list');
assert(alphaAfterDelete.some((a) => a.id === app1.id), 'app1 remains intact after deleting app3');
assert(alphaAfterDelete.some((a) => a.id === app2.id), 'app2 remains intact after deleting app3');

// Deleting non-existent ID
const deleteNonExistent = deleteStoredApplication('non_existent_id', 'user_alpha');
assert(deleteNonExistent === false, 'Deleting non-existent ID returns false');

// ─── 8. SEARCH & FILTERING LOGIC ───
console.log('\n--- 8. Real-Time Search & Status Filtering ---');

// Set statuses for filtering test
updateStoredApplication(app1.id, { status: 'Offer', company: 'Stripe Payments' }, 'user_alpha');
updateStoredApplication(app2.id, { status: 'Applied', jobTitle: 'Staff Infrastructure Lead' }, 'user_alpha');

const currentAlphaApps = getStoredApplications('user_alpha');

// Filter: Status = 'Offer'
const offerFiltered = currentAlphaApps.filter((a) => a.status === 'Offer');
assert(offerFiltered.length === 1, 'Status filter "Offer" returns 1 item');
assert(offerFiltered[0].company === 'Stripe Payments', 'Filter "Offer" returns Stripe Payments');

// Filter: Status = 'Applied'
const appliedFiltered = currentAlphaApps.filter((a) => a.status === 'Applied');
assert(appliedFiltered.length === 1, 'Status filter "Applied" returns 1 item');
assert(appliedFiltered[0].jobTitle === 'Staff Infrastructure Lead', 'Filter "Applied" returns Staff Infrastructure Lead');

// Filter: Status = 'Interview'
const interviewFiltered = currentAlphaApps.filter((a) => a.status === 'Interview');
assert(interviewFiltered.length === 0, 'Status filter "Interview" returns 0 items');

// Search: By Company name (case-insensitive)
function searchApps(apps, query) {
  if (!query) return apps;
  const q = query.toLowerCase().trim();
  return apps.filter(
    (a) =>
      (a.company && a.company.toLowerCase().includes(q)) ||
      (a.jobTitle && a.jobTitle.toLowerCase().includes(q))
  );
}

const searchStripe = searchApps(currentAlphaApps, 'stripe');
assert(searchStripe.length === 1, 'Search "stripe" matches 1 application');
assert(searchStripe[0].company === 'Stripe Payments', 'Matched correct company');

const searchStaff = searchApps(currentAlphaApps, 'staff');
assert(searchStaff.length === 1, 'Search "staff" matches Staff Infrastructure Lead');

const searchNotFound = searchApps(currentAlphaApps, 'nonexistent');
assert(searchNotFound.length === 0, 'Search "nonexistent" returns 0 results');

// ─── 9. PERSISTENCE AFTER RELOAD SIMULATION ───
console.log('\n--- 9. Persistence Simulation ---');

// Simulate page reload by re-reading directly from serialized JSON in storage
const rawStorageJson = localStorage.getItem('careerlens_user_user_alpha_job_applications');
assert(Boolean(rawStorageJson), 'Raw storage contains serialized JSON string');

const parsedFromDisk = JSON.parse(rawStorageJson);
assert(Array.isArray(parsedFromDisk), 'Parsed storage is an array');
assert(parsedFromDisk.length === 2, 'Persisted array has 2 applications');
assert(parsedFromDisk[0].id === app1.id || parsedFromDisk[1].id === app1.id, 'app1 persisted with full fidelity');

// ─── 10. UI COMPONENT & NAVIGATION INSPECTION ───
console.log('\n--- 10. UI Component & Navigation Files Verification ---');

const sidebarPath = path.resolve('src/components/Sidebar.jsx');
const mobileNavPath = path.resolve('src/components/MobileNav.jsx');
const headerPath = path.resolve('src/components/Header.jsx');
const appPath = path.resolve('src/App.jsx');
const appSectionPath = path.resolve('src/components/ApplicationsSection.jsx');

const sidebarSrc = fs.readFileSync(sidebarPath, 'utf8');
const mobileNavSrc = fs.readFileSync(mobileNavPath, 'utf8');
const headerSrc = fs.readFileSync(headerPath, 'utf8');
const appSrc = fs.readFileSync(appPath, 'utf8');

// Verify Applications tab in Sidebar
assert(sidebarSrc.includes('APPLICATIONS'), 'Sidebar.jsx includes APPLICATIONS tab');
assert(sidebarSrc.includes('Applications'), 'Sidebar.jsx includes "Applications" label');

// Verify order in Sidebar: Dashboard -> Analyze -> Career Navigator -> Mock Interview -> Applications -> History -> Settings
const sidebarOrderRegex = /DASHBOARD[\s\S]*?DOCKET[\s\S]*?NAVIGATOR[\s\S]*?EVIDENCE[\s\S]*?APPLICATIONS[\s\S]*?ARCHIVES[\s\S]*?CHAMBERS/;
assert(sidebarOrderRegex.test(sidebarSrc), 'Sidebar nav order is strictly: Dashboard -> Analyze -> Career Navigator -> Mock Interview -> Applications -> History -> Settings');

// Verify MobileNav includes APPLICATIONS
assert(mobileNavSrc.includes('APPLICATIONS'), 'MobileNav.jsx includes APPLICATIONS tab');

// Verify Header includes APPLICATIONS
assert(headerSrc.includes('APPLICATIONS'), 'Header.jsx includes APPLICATIONS tab');

// Verify App.jsx imports and routes ApplicationsSection
assert(appSrc.includes('ApplicationsSection'), 'App.jsx imports ApplicationsSection');
assert(appSrc.includes("activeTab === 'APPLICATIONS'"), 'App.jsx renders ApplicationsSection on activeTab === "APPLICATIONS"');

// Verify ApplicationsSection file exists
assert(fs.existsSync(appSectionPath), 'src/components/ApplicationsSection.jsx exists');
const appSectionSrc = fs.readFileSync(appSectionPath, 'utf8');
assert(appSectionSrc.includes('Add Application') || appSectionSrc.includes('Add Your First Application'), 'ApplicationsSection contains Add Application UI');
assert(appSectionSrc.includes('No applications yet'), 'ApplicationsSection contains "No applications yet" empty state');
assert(appSectionSrc.includes('Saved'), 'ApplicationsSection includes "Saved" status');
assert(appSectionSrc.includes('Applied'), 'ApplicationsSection includes "Applied" status');
assert(appSectionSrc.includes('Interview'), 'ApplicationsSection includes "Interview" status');
assert(appSectionSrc.includes('Offer'), 'ApplicationsSection includes "Offer" status');
assert(appSectionSrc.includes('Rejected'), 'ApplicationsSection includes "Rejected" status');

// ─── 11. MODAL BACKDROP & DOMAIN-NEUTRAL PLACEHOLDERS ───
console.log('\n--- 11. Modal Backdrop & Domain-Neutral Placeholders ---');

// A. Modal backdrop class & dynamic light theme handling (blur only, transparent)
assert(
  appSectionSrc.includes('modal-backdrop-overlay'),
  'ApplicationsSection uses "modal-backdrop-overlay" class for theme-adaptive styling'
);
assert(
  appSectionSrc.includes("isLight\n    ? 'bg-transparent backdrop-blur-[6px]'") ||
  appSectionSrc.includes("bg-transparent backdrop-blur-[6px]"),
  'ApplicationsSection uses transparent backdrop with 6px blur for Clean Light (no dark/gray overlay)'
);
assert(
  !appSectionSrc.includes("'bg-black/25"),
  'ApplicationsSection does NOT use bg-black/25 for Clean Light'
);

// B. CSS backdrop definitions in index.css
const indexCssPath = path.resolve('src/index.css');
const indexCssSrc = fs.readFileSync(indexCssPath, 'utf8');
assert(
  indexCssSrc.includes('.modal-backdrop-overlay'),
  'index.css defines .modal-backdrop-overlay rule'
);
assert(
  /html\[data-theme="light"\]\s+\.modal-backdrop-overlay\s*\{[^}]*background-color:\s*transparent\s*!important/.test(indexCssSrc),
  'index.css sets Clean Light modal-backdrop-overlay to transparent'
);
assert(
  /html\[data-theme="light"\]\s+\.modal-backdrop-overlay\s*\{[^}]*backdrop-filter:\s*blur\(6px\)\s*!important/.test(indexCssSrc),
  'index.css sets Clean Light modal-backdrop-overlay to blur(6px)'
);
assert(
  /html\[data-theme="light"\]\s+\.modal-backdrop-overlay\s*>\s*div\s*\{[^}]*background-color:\s*#FFFFFF/.test(indexCssSrc),
  'index.css preserves crisp white modal background in Clean Light'
);

// C. Domain-neutral placeholders in Add Application modal
assert(
  appSectionSrc.includes('placeholder="e.g. TCS, Apollo Hospitals, ABC School"'),
  'Company input placeholder is domain-neutral: "e.g. TCS, Apollo Hospitals, ABC School"'
);
assert(
  appSectionSrc.includes('placeholder="e.g. Software Developer, Registered Nurse, Primary School Teacher"'),
  'Job Title input placeholder is domain-neutral: "e.g. Software Developer, Registered Nurse, Primary School Teacher"'
);
assert(
  appSectionSrc.includes('placeholder="e.g. Mumbai, Remote, Pune"'),
  'Location input placeholder is domain-neutral: "e.g. Mumbai, Remote, Pune"'
);

// ─── 12. STATUS-AWARE APPLICATION DATE LABELS ───
console.log('\n--- 12. Status-Aware Application Date Labels ---');

const { getStatusDateLabel, formatDate } = await import('../src/services/jobMatch.js');
const expectedDate = formatDate('2026-09-26');

assert(typeof getStatusDateLabel === 'function', 'getStatusDateLabel function is exported');
assert(
  getStatusDateLabel('Saved', '2026-09-26') === `Saved: ${expectedDate}`,
  `Saved status renders "Saved: ${expectedDate}" (got "${getStatusDateLabel('Saved', '2026-09-26')}")`
);
assert(
  getStatusDateLabel('Applied', '2026-09-26') === `Applied: ${expectedDate}`,
  `Applied status renders "Applied: ${expectedDate}" (got "${getStatusDateLabel('Applied', '2026-09-26')}")`
);
assert(
  getStatusDateLabel('Interview', '2026-09-26') === `Interview: ${expectedDate}`,
  `Interview status renders "Interview: ${expectedDate}" (got "${getStatusDateLabel('Interview', '2026-09-26')}")`
);
assert(
  getStatusDateLabel('Offer', '2026-09-26') === `Offer: ${expectedDate}`,
  `Offer status renders "Offer: ${expectedDate}" (got "${getStatusDateLabel('Offer', '2026-09-26')}")`
);
assert(
  getStatusDateLabel('Rejected', '2026-09-26') === `Rejected: ${expectedDate}`,
  `Rejected status renders "Rejected: ${expectedDate}" (got "${getStatusDateLabel('Rejected', '2026-09-26')}")`
);
assert(
  getStatusDateLabel('UnknownStatus', '2026-09-26') === `Added: ${expectedDate}`,
  `Fallback status renders "Added: ${expectedDate}" (got "${getStatusDateLabel('UnknownStatus', '2026-09-26')}")`
);

// Verify card footer uses getStatusDateLabel instead of hardcoded Applied: label
assert(
  appSectionSrc.includes('getStatusDateLabel(app.status, app.applicationDate)'),
  'ApplicationsSection card footer calls getStatusDateLabel(app.status, app.applicationDate)'
);
assert(
  !appSectionSrc.includes('<span>Applied: {formatDate(app.applicationDate)}</span>'),
  'ApplicationsSection does NOT use hardcoded "Applied: {formatDate(...)}" for all statuses'
);

// ─── 13. SIDEBAR APPLICATIONS COUNT DERIVED FROM USER-SCOPED STORAGE ───
console.log('\n--- 13. Sidebar Application Count Derived From Storage ---');

assert(sidebarSrc.includes('getStoredApplications'), 'Sidebar.jsx imports getStoredApplications from userStorage');
assert(!sidebarSrc.includes('<span className="text-xs font-semibold text-[#FAFAFA]">4</span>'), 'Sidebar.jsx does NOT contain hardcoded Applications count "4"');
assert(sidebarSrc.includes('{applicationsCount}'), 'Sidebar.jsx renders dynamic {applicationsCount}');
assert(sidebarSrc.includes('getStoredApplications(uid)'), 'Sidebar.jsx queries user-scoped application storage with uid');
assert(sidebarSrc.includes('careerlens_applications_updated'), 'Sidebar.jsx listens to live storage update events');
assert(appSrc.includes('user={user}'), 'App.jsx passes user prop to Sidebar');

// Verify counts match user-scoped stored applications
const alphaAppsCount = getStoredApplications('user_alpha').length;
const betaAppsCount = getStoredApplications('user_beta').length;
const anonAppsCount = getStoredApplications('anonymous').length;

assert(alphaAppsCount === 2, `User Alpha has 2 applications in storage (got ${alphaAppsCount})`);
assert(betaAppsCount === 1, `User Beta has 1 application in storage (got ${betaAppsCount})`);
assert(anonAppsCount === 0, `Anonymous user has 0 applications in storage (got ${anonAppsCount})`);

// ─── 14. RESUME SELECTOR IN ADD JOB APPLICATION MODAL ───
console.log('\n--- 14. Resume Selector in Add Job Application Modal ---');

const {
  getResumeFingerprint,
  setStoredLastAnalysis,
  getStoredLastAnalysis,
  setStoredArchives,
  findAnalysisForResume,
} = await import('../src/services/userStorage.js');
const {
  loadSavedResumes,
  saveResume,
} = await import('../src/services/savedResume.js');
const {
  extractJobApplicationPrefill,
} = await import('../src/services/jobMatch.js');

// 1. Resume selector lists all saved resumes for current user
const userResumeUid = 'user_resume_test';
const resumeA = {
  name: 'Primary_School_Teacher_Sample_Resume.docx',
  text: 'Gayatri Sharma. Primary School Teacher with 5 years experience in lesson planning, classroom management, and CTET qualified.',
};
const resumeB = {
  name: 'Software_Engineer_Resume.pdf',
  text: 'Alex Chen. Full Stack Software Engineer with 6 years experience in Node.js, React, PostgreSQL, and cloud deployments.',
};
const resumeC_noAnalysis = {
  name: 'Finance_Accountant_Resume.pdf',
  text: 'Sarah Jenkins. Staff Accountant with CPA eligibility, US GAAP compliance, and general ledger reconciliation.',
};

await saveResume(resumeA, userResumeUid);
await saveResume(resumeB, userResumeUid);
await saveResume(resumeC_noAnalysis, userResumeUid);

const userSavedList = await loadSavedResumes(userResumeUid);
assert(userSavedList.length === 3, `Resume selector lists all 3 saved resumes (got ${userSavedList.length})`);
assert(userSavedList.some(r => r.name === resumeA.name), 'Lists Resume A (Primary School Teacher)');
assert(userSavedList.some(r => r.name === resumeB.name), 'Lists Resume B (Software Engineer)');
assert(userSavedList.some(r => r.name === resumeC_noAnalysis.name), 'Lists Resume C (Accountant)');

const selectedA = userSavedList.find(r => r.name === resumeA.name);
const selectedB = userSavedList.find(r => r.name === resumeB.name);
const selectedC = userSavedList.find(r => r.name === resumeC_noAnalysis.name);

// Setup analyses for Resume A and Resume B
const teacherAnalysis = {
  id: 'ANALYSIS_TEACHER',
  jobDescription: 'Company: DPS Academy\nSeeking Primary School Teacher for Grade 4 English and Math.',
  resumeText: resumeA.text,
  companyMode: 'general',
  jobMatch: {
    targetRole: 'Primary School Teacher',
    targetCompany: 'DPS Academy',
    targetDomain: 'Education',
    overallMatch: 88,
  },
  agentResults: { ats: { detectedRole: 'Primary School Teacher' } },
};
const sweAnalysis = {
  id: 'ANALYSIS_SWE_LATEST',
  jobDescription: 'Company: CloudScale\nHiring Senior Software Engineer for backend distributed systems.',
  resumeText: resumeB.text,
  companyMode: 'general',
  jobMatch: {
    targetRole: 'Senior Software Engineer',
    targetCompany: 'CloudScale',
    targetDomain: 'Technology',
    overallMatch: 95,
  },
  agentResults: { ats: { detectedRole: 'Senior Software Engineer' } },
};

setStoredArchives([teacherAnalysis], userResumeUid);
setStoredLastAnalysis(sweAnalysis, userResumeUid);

// Form simulation helper matching modal handleSelectResume behavior
function simulateModalState(initial = {}) {
  let state = {
    selectedResume: initial.selectedResume || null,
    company: initial.company || '',
    jobTitle: initial.jobTitle || '',
    location: initial.location || '',
    applicationDate: initial.applicationDate || '2026-09-26',
    status: initial.status || 'Saved',
    jobDescription: initial.jobDescription || '',
    matchScore: initial.matchScore || '',
    notes: initial.notes || '',
    prefillNotice: '',
  };

  function selectResume(resumeRecord, currentAnalysis = null) {
    state.selectedResume = resumeRecord;
    if (!resumeRecord) {
      state.prefillNotice = '';
      return;
    }

    const matchingAnalysis = findAnalysisForResume(resumeRecord, {
      currentAnalysis,
      explicitUid: userResumeUid,
    });

    if (matchingAnalysis) {
      const prefill = extractJobApplicationPrefill({
        jobMatch: matchingAnalysis.jobMatch,
        jobDescription: matchingAnalysis.jobDescription || '',
        resumeText: matchingAnalysis.resumeText || resumeRecord.text || '',
        companyMode: matchingAnalysis.companyMode || 'general',
        agentResults: matchingAnalysis.agentResults || {},
      });

      state.company = prefill.company || '';
      state.jobTitle = prefill.jobTitle || '';
      state.location = prefill.location || '';
      state.jobDescription = prefill.jobDescription || '';
      state.matchScore =
        prefill.matchScore !== null && prefill.matchScore !== undefined
          ? String(prefill.matchScore)
          : '';
      state.prefillNotice = '';
    } else {
      state.company = '';
      state.jobTitle = '';
      state.location = '';
      state.jobDescription = '';
      state.matchScore = '';
      state.prefillNotice = 'No analysis found for this resume yet.';
    }
  }

  return { state, selectResume };
}

// 1. Select Resume A → fields populated from A analysis
const modalSim = simulateModalState();
modalSim.selectResume(selectedA);
assert(modalSim.state.selectedResume.name === resumeA.name, 'Select Resume A makes A active');
assert(modalSim.state.jobTitle === 'Primary School Teacher', `Fields populated with A analysis: Job Title is Primary School Teacher (got "${modalSim.state.jobTitle}")`);
assert(modalSim.state.matchScore === '88', `Fields populated with A analysis: Match Score is 88 (got "${modalSim.state.matchScore}")`);
assert(modalSim.state.company === 'DPS Academy', `Fields populated with A analysis: Company is DPS Academy (got "${modalSim.state.company}")`);
assert(modalSim.state.prefillNotice === '', 'No warning notice when matching analysis is found');

// 2. Select Resume B → A fields are replaced by B fields
modalSim.selectResume(selectedB);
assert(modalSim.state.selectedResume.name === resumeB.name, 'Select Resume B makes B active');
assert(modalSim.state.jobTitle === 'Senior Software Engineer', `A fields replaced by B: Job Title is now Senior Software Engineer (got "${modalSim.state.jobTitle}")`);
assert(modalSim.state.matchScore === '95', `A fields replaced by B: Match Score is now 95 (got "${modalSim.state.matchScore}")`);
assert(modalSim.state.company === 'CloudScale', `A fields replaced by B: Company is now CloudScale (got "${modalSim.state.company}")`);
assert(modalSim.state.jobTitle !== 'Primary School Teacher', 'Resume A data completely replaced, no stale Teacher data');

// 3. Same filename + different content → correct analysis selected
const resumeDupTech = {
  name: 'Resume.pdf',
  text: 'Jane Doe. Senior DevOps Cloud Engineer with Docker, Kubernetes, Terraform, and AWS CI/CD pipelines.',
};
const resumeDupNurse = {
  name: 'Resume.pdf',
  text: 'Priya Patel. Registered Nurse with acute care bedside experience, BLS and ACLS certification.',
};
const dupUserUid = 'user_duplicate_filename_test';
await saveResume(resumeDupTech, dupUserUid);
await saveResume(resumeDupNurse, dupUserUid);

const dupList = await loadSavedResumes(dupUserUid);
assert(dupList.length === 2, `Same filename with different content stores both resumes without clobbering (got ${dupList.length})`);
const dupFp1 = getResumeFingerprint(resumeDupTech.text);
const dupFp2 = getResumeFingerprint(resumeDupNurse.text);
assert(dupFp1 !== dupFp2, 'Different content produces distinct fingerprints');

const devOpsAnalysis = {
  id: 'ANALYSIS_DEVOPS',
  jobDescription: 'DevOps position at InfraCorp.',
  resumeText: resumeDupTech.text,
  jobMatch: { targetRole: 'DevOps Engineer', overallMatch: 91 },
};
const nurseAnalysis = {
  id: 'ANALYSIS_NURSE',
  jobDescription: 'Registered Nurse position at CareCenter.',
  resumeText: resumeDupNurse.text,
  jobMatch: { targetRole: 'Registered Nurse', overallMatch: 89 },
};
setStoredArchives([devOpsAnalysis, nurseAnalysis], dupUserUid);

const lookedUpDevOps = findAnalysisForResume(dupList.find(r => r.id === dupFp1), { explicitUid: dupUserUid });
const lookedUpNurse = findAnalysisForResume(dupList.find(r => r.id === dupFp2), { explicitUid: dupUserUid });
assert(lookedUpDevOps.jobMatch.targetRole === 'DevOps Engineer', 'Same filename: DevOps resume matches DevOps analysis');
assert(lookedUpNurse.jobMatch.targetRole === 'Registered Nurse', 'Same filename: Nurse resume matches Nurse analysis');

// 4. Selected resume with no analysis → analysis fields cleared
modalSim.selectResume(selectedC);
assert(modalSim.state.selectedResume.name === resumeC_noAnalysis.name, 'Select Resume C makes C active');
assert(modalSim.state.jobTitle === '', `Resume C with no analysis clears Job Title (got "${modalSim.state.jobTitle}")`);
assert(modalSim.state.company === '', `Resume C with no analysis clears Company (got "${modalSim.state.company}")`);
assert(modalSim.state.location === '', `Resume C with no analysis clears Location (got "${modalSim.state.location}")`);
assert(modalSim.state.jobDescription === '', `Resume C with no analysis clears Job Description (got "${modalSim.state.jobDescription}")`);
assert(modalSim.state.matchScore === '', `Resume C with no analysis clears Match Score (got "${modalSim.state.matchScore}")`);
assert(modalSim.state.prefillNotice === 'No analysis found for this resume yet.', 'Shows neutral notice: "No analysis found for this resume yet."');

// 5. Previous global analysis cannot leak into selected resume
assert(getStoredLastAnalysis(userResumeUid).jobMatch.targetRole === 'Senior Software Engineer', 'Global latest analysis is SWE');
const analysisForC = findAnalysisForResume(selectedC, { explicitUid: userResumeUid });
assert(analysisForC === null, 'Resume C analysis lookup returns null (does NOT leak global SWE analysis)');
const analysisForA = findAnalysisForResume(selectedA, { explicitUid: userResumeUid });
assert(analysisForA.jobMatch.targetRole === 'Primary School Teacher', 'Resume A analysis lookup returns Teacher (does NOT leak global SWE analysis)');

// 6. Job Match opens with the current analysis resume
const currentJobMatchAnalysis = {
  id: 'ANALYSIS_JM_ACTIVE',
  resumeText: resumeB.text,
  jobDescription: 'Software Developer role at Stripe Payments.',
  jobMatch: {
    targetRole: 'Software Developer',
    overallMatch: 92,
  },
  companyMode: 'general',
};
const jmModalSim = simulateModalState({
  selectedResume: selectedB,
  company: 'Stripe Payments',
  jobTitle: 'Software Developer',
  matchScore: '92',
  jobDescription: 'Software Developer role at Stripe Payments.',
});
assert(jmModalSim.state.selectedResume.name === resumeB.name, 'Job Match modal opens with Resume B selected');
assert(jmModalSim.state.company === 'Stripe Payments', 'Job Match modal preserves current company');
assert(jmModalSim.state.jobTitle === 'Software Developer', 'Job Match modal preserves current target role');
assert(jmModalSim.state.matchScore === '92', 'Job Match modal preserves current match score');

// 7. Switching resume from Job Match intentionally changes the form context
jmModalSim.selectResume(selectedA, currentJobMatchAnalysis);
assert(jmModalSim.state.selectedResume.name === resumeA.name, 'Intentionally switched to Resume A');
assert(jmModalSim.state.jobTitle === 'Primary School Teacher', `Old Job Match fields replaced by Resume A: Job Title is Primary School Teacher (got "${jmModalSim.state.jobTitle}")`);
assert(jmModalSim.state.company === 'DPS Academy', `Old Job Match company replaced by Resume A: Company is DPS Academy (got "${jmModalSim.state.company}")`);
assert(jmModalSim.state.matchScore === '88', `Old Job Match score replaced by Resume A: Match Score is 88 (got "${jmModalSim.state.matchScore}")`);

// 8. Notes are preserved during resume switching
const notesSim = simulateModalState({
  notes: 'Follow up with HR regarding benefits package after round 2',
});
notesSim.selectResume(selectedA);
assert(notesSim.state.notes === 'Follow up with HR regarding benefits package after round 2', 'Notes preserved on selecting Resume A');
notesSim.selectResume(selectedB);
assert(notesSim.state.notes === 'Follow up with HR regarding benefits package after round 2', 'Notes preserved on selecting Resume B');
notesSim.selectResume(selectedC);
assert(notesSim.state.notes === 'Follow up with HR regarding benefits package after round 2', 'Notes preserved on selecting Resume C with no analysis');

// 9. Application Date and Status remain unchanged during resume switching
const statusSim = simulateModalState({
  applicationDate: '2026-09-15',
  status: 'Interview',
});
statusSim.selectResume(selectedA);
assert(statusSim.state.applicationDate === '2026-09-15', 'Application Date preserved on selecting Resume A');
assert(statusSim.state.status === 'Interview', 'Status preserved on selecting Resume A');
statusSim.selectResume(selectedB);
assert(statusSim.state.applicationDate === '2026-09-15', 'Application Date preserved on selecting Resume B');
assert(statusSim.state.status === 'Interview', 'Status preserved on selecting Resume B');
statusSim.selectResume(selectedC);
assert(statusSim.state.applicationDate === '2026-09-15', 'Application Date preserved on selecting Resume C');
assert(statusSim.state.status === 'Interview', 'Status preserved on selecting Resume C');

// 10. User-scoped resume and analysis isolation
const isolatedUserAlpha = 'user_isolation_alpha';
const isolatedUserBeta = 'user_isolation_beta';

await saveResume({ name: 'Alpha_Secret_Resume.pdf', text: 'Alpha user private executive resume.' }, isolatedUserAlpha);
await saveResume({ name: 'Beta_Private_Resume.docx', text: 'Beta user private engineering resume.' }, isolatedUserBeta);

setStoredArchives([{ resumeText: 'Alpha user private executive resume.', jobMatch: { targetRole: 'Chief Executive' } }], isolatedUserAlpha);
setStoredArchives([{ resumeText: 'Beta user private engineering resume.', jobMatch: { targetRole: 'Principal Architect' } }], isolatedUserBeta);

const alphaResumes = await loadSavedResumes(isolatedUserAlpha);
const betaResumes = await loadSavedResumes(isolatedUserBeta);

assert(alphaResumes.length === 1, 'User Alpha has 1 saved resume');
assert(alphaResumes[0].name === 'Alpha_Secret_Resume.pdf', 'User Alpha sees Alpha resume');
assert(!alphaResumes.some(r => r.name.includes('Beta')), 'User Alpha CANNOT see User Beta resumes');

assert(betaResumes.length === 1, 'User Beta has 1 saved resume');
assert(betaResumes[0].name === 'Beta_Private_Resume.docx', 'User Beta sees Beta resume');
assert(!betaResumes.some(r => r.name.includes('Alpha')), 'User Beta CANNOT see User Alpha resumes');

const alphaAnalysisForBeta = findAnalysisForResume(betaResumes[0], { explicitUid: isolatedUserAlpha });
assert(alphaAnalysisForBeta === null, 'User Alpha context CANNOT access User Beta analysis');
const betaAnalysisForAlpha = findAnalysisForResume(alphaResumes[0], { explicitUid: isolatedUserBeta });
assert(betaAnalysisForAlpha === null, 'User Beta context CANNOT access User Alpha analysis');

// 11. Stored application stores selected resume identity & backward compatibility
const appWithResume = addStoredApplication({
  company: 'DPS Academy',
  jobTitle: 'Primary School Teacher',
  status: 'Saved',
  matchScore: 88,
  resumeId: selectedA.id,
  resumeName: selectedA.name,
}, userResumeUid);
assert(Boolean(appWithResume), 'Application with resume was created');
assert(appWithResume.resumeId === selectedA.id, `Application stores resumeId (got "${appWithResume.resumeId}")`);
assert(appWithResume.resumeName === selectedA.name, `Application stores resumeName (got "${appWithResume.resumeName}")`);

const legacyApp = addStoredApplication({
  company: 'Legacy Corp',
  jobTitle: 'Data Analyst',
  status: 'Applied',
  matchScore: 75,
}, userResumeUid);
assert(legacyApp.resumeId === null, 'Legacy application has resumeId defaulted to null');
assert(legacyApp.resumeName === null, 'Legacy application has resumeName defaulted to null');

// 12. UI Component Architecture Inspection for Resume Selector & Auto-Refresh
assert(appSectionSrc.includes('RESUME'), 'ApplicationsSection contains "RESUME" section header');
assert(appSectionSrc.includes('Refresh from selected resume'), 'ApplicationsSection contains "Refresh from selected resume" banner');
assert(appSectionSrc.includes('+ Upload New Resume'), 'ApplicationsSection contains "+ Upload New Resume" button');
assert(appSectionSrc.includes('handleModalSelectResume'), 'ApplicationsSection implements handleModalSelectResume');

const addModalSrc = fs.readFileSync(path.resolve('src/components/AddApplicationModal.jsx'), 'utf8');
assert(addModalSrc.includes('RESUME'), 'AddApplicationModal contains "RESUME" section header');
assert(addModalSrc.includes('Refresh from selected resume'), 'AddApplicationModal contains "Refresh from selected resume" banner');
assert(addModalSrc.includes('+ Upload New Resume'), 'AddApplicationModal contains "+ Upload New Resume" button');
assert(addModalSrc.includes('No analysis found for this resume yet.'), 'AddApplicationModal includes neutral missing analysis notice');
assert(addModalSrc.includes('handleSelectResume'), 'AddApplicationModal implements handleSelectResume');

const jobMatchSrc = fs.readFileSync(path.resolve('src/components/JobMatchSection.jsx'), 'utf8');
assert(jobMatchSrc.includes('currentAnalysis={currentAnalysis}'), 'JobMatchSection passes currentAnalysis to AddApplicationModal');

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}



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

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}

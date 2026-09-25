/**
 * Verification test for Education/Primary School Teacher JD parsing,
 * section-aware requirement extraction, metadata filtering, and test instruction exclusion.
 */

import {
  computeJobMatch,
  detectJobDomain,
  analyzeJdRequirements,
  isInvalidJdRequirement,
  isJdSectionHeading,
  isJdMetadata,
  isJdInstructionOrTestText,
  parseJdSections,
  toRequirementSegments,
  extractExperienceRequirements,
  parseExperienceRange,
  isExperienceSatisfied,
  estimateResumeYears,
} from '../src/services/jobMatch.js';
import { getDomainSpecialistPersona } from '../src/services/hiringApi.js';

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
console.log('CAREERLENS EDUCATION & JD REQUIREMENT EXTRACTION VERIFICATION');
console.log('======================================================\n');

// ─── 1. STRUCTURAL FILTERS UNIT TESTS ───
console.log('--- 1. Structural Filters (Headings, Metadata, Test Instructions) ---');

const headings = [
  'Responsibilities:',
  'Required Skills',
  'Preferred Qualifications',
  'Qualifications',
  'About the Role',
  'Education',
  'Key Technologies',
  'Job Type',
  'Location',
  'Job Overview',
];
for (const h of headings) {
  assert(isJdSectionHeading(h), `Heading recognized: "${h}"`);
  assert(isInvalidJdRequirement(h), `Heading rejected as requirement: "${h}"`);
}

const metadataExamples = [
  'DOMAIN: EDUCATION',
  'LOCATION: MUMBAI, MAHARASHTRA',
  'ROLE: PRIMARY SCHOOL TEACHER',
  'JOB TYPE: FULL-TIME',
  'Job Title: Primary School Teacher',
  'Location: Mumbai',
  'Full-time',
  'Remote',
];
for (const m of metadataExamples) {
  assert(isJdMetadata(m), `Metadata recognized: "${m}"`);
  assert(isInvalidJdRequirement(m), `Metadata rejected as requirement: "${m}"`);
}

const instructionExamples = [
  'FOR YOUR CAREERLENS TEST',
  'THIS SHOULD IDEALLY PRODUCE SOMETHING LIKE:',
  'For your CareerLens test',
  'This should ideally produce...',
  'Use this job description for testing',
  'Expected extracted requirements:',
  'You should see high scores',
  'For testing purposes only',
];
for (const inst of instructionExamples) {
  assert(isJdInstructionOrTestText(inst), `Instruction recognized: "${inst}"`);
  assert(isInvalidJdRequirement(inst), `Instruction rejected as requirement: "${inst}"`);
}

// ─── 2. EDUCATION / PRIMARY SCHOOL TEACHER REGRESSION TEST ───
console.log('\n--- 2. Primary School Teacher Clean JD with Test Context ---');

const testJdWithNoise = `Job Title: Primary School Teacher
Domain: Education
Location: Mumbai, Maharashtra
Job Type: Full-time
For your CareerLens test
This should ideally produce something like:

We are looking for a dedicated and compassionate Primary School Teacher to create an engaging learning environment and support the academic and personal development of students.

Responsibilities:
- Plan and deliver age-appropriate lessons.
- Teach students in primary grades using engaging learning methods.
- Monitor and assess student progress.
- Maintain accurate student records and attendance.
- Communicate regularly with parents about student performance.
- Manage classroom activities and student behaviour.
- Organize educational activities and school events.
- Use digital tools and technology to enhance classroom learning.
- Provide additional academic support to students who need it.

Required Skills:
- Bachelor's degree in Education or related field.
- Strong communication and interpersonal skills.
- Classroom management abilities.
- Lesson planning and student assessment skills.
- Ability to work effectively with children.

Preferred Qualifications:
- B.Ed. qualification.
- 2–5 years of teaching experience.
- Experience with Google Classroom or similar platforms.
- Ability to create activity-based learning experiences.`;

const teacherResume = `
Ananya Sharma
Primary School Teacher
Contact: ananya@example.com

Summary:
Dedicated and compassionate Primary School Teacher with 3 years of classroom experience delivering engaging lessons to primary students. Skilled in classroom management, lesson planning, student assessment, and utilizing Google Classroom for interactive learning.

Experience:
Primary Teacher | Greenfield International School (2021 - Present)
- Planned and delivered age-appropriate lessons across English, Mathematics, and Science for Grade 3 and 4 students.
- Taught students using interactive and activity-based learning methods.
- Monitored and assessed student progress through regular evaluations and recorded attendance.
- Communicated regularly with parents regarding student progress and behavioral development.
- Managed classroom activities and fostered a supportive, inclusive learning environment.
- Used Google Classroom and digital educational tools to enhance daily classroom engagement.

Education & Qualifications:
Bachelor of Arts in English Literature — 2020
Bachelor of Education (B.Ed.) — 2021
`;

// Test domain and role detection
const detected = detectJobDomain(testJdWithNoise, teacherResume);
assert(detected.domain === 'Education', `Domain detected as Education (got "${detected.domain}")`);
assert(/teacher/i.test(detected.role), `Role detected as Teacher (got "${detected.role}")`);

// Test persona assignment
const persona = getDomainSpecialistPersona(detected.domain, detected.role);
assert(persona.title === 'Instructional & Academic Specialist', `Agent 3 persona is Instructional & Academic Specialist (got "${persona.title}")`);

// Test section-aware parsing
const sections = parseJdSections(testJdWithNoise);
assert(sections.responsibilities.length >= 8, `Parsed ${sections.responsibilities.length} responsibilities`);
assert(sections.skills.length >= 4, `Parsed ${sections.skills.length} skills`);
assert(sections.qualifications.length >= 3, `Parsed ${sections.qualifications.length} qualifications`);

// Test analyzeJdRequirements output
const reqAnalysis = analyzeJdRequirements(testJdWithNoise, teacherResume);

// Disallowed terms in all lists
const FORBIDDEN_STRINGS = [
  'job type',
  'location',
  'domain',
  'role: primary school teacher',
  'required skills',
  'preferred qualifications',
  'responsibilities',
  'careerlens test',
  'ideally produce',
  'for your careerlens test',
  'this should ideally produce',
];

const checkNoForbidden = (items, listName) => {
  for (const item of items) {
    const text = (typeof item === 'string' ? item : item.name || item.skill || '').toLowerCase();
    for (const forbidden of FORBIDDEN_STRINGS) {
      assert(!text.includes(forbidden), `[${listName}] Does not contain "${forbidden}": "${text}"`);
    }
  }
};

console.log('\nChecking analyzeJdRequirements for exclusion of headings/metadata/instructions:');
checkNoForbidden(reqAnalysis.extractedRequirements, 'extractedRequirements');
checkNoForbidden(reqAnalysis.matchedList, 'matchedList');
checkNoForbidden(reqAnalysis.missingList, 'missingList');
checkNoForbidden(reqAnalysis.responsibilities, 'responsibilities');
checkNoForbidden(reqAnalysis.coreDomainSkills, 'coreDomainSkills');

// Verify inclusion of real responsibilities
const respNames = reqAnalysis.responsibilities.map(r => r.name.toLowerCase());
assert(respNames.some(r => r.includes('plan and deliver')), 'Contains responsibility: Plan and deliver age-appropriate lessons');
assert(respNames.some(r => r.includes('monitor and assess')), 'Contains responsibility: Monitor and assess student progress');
assert(respNames.some(r => r.includes('student records')), 'Contains responsibility: Maintain accurate student records');
assert(respNames.some(r => r.includes('digital tools')), 'Contains responsibility: Use digital tools');

// Verify inclusion of real skills and qualifications
const skillNames = reqAnalysis.coreDomainSkills.map(s => s.name.toLowerCase());
assert(skillNames.some(s => s.includes('classroom management')), 'Contains skill: Classroom management abilities');
assert(skillNames.some(s => s.includes('lesson planning')), 'Contains skill: Lesson planning and student assessment skills');
assert(skillNames.some(s => s.includes('b.ed')), 'Contains qualification: B.Ed. qualification');
assert(skillNames.some(s => s.includes('google classroom')), 'Contains platform/tool: Google Classroom');

// Verify experience requirements
const expNames = reqAnalysis.experienceRequirements.map(e => e.name.toLowerCase());
assert(expNames.some(e => e.includes('bachelor')), "Contains experience/degree: Bachelor's degree");
assert(expNames.some(e => e.includes('year')), 'Contains experience requirement: 2–5 years');

// Test computeJobMatch output
console.log('\n--- 3. computeJobMatch Validation ---');
const match = computeJobMatch({ resumeText: teacherResume, jobDescription: testJdWithNoise });

assert(match.targetDomain === 'Education', `Match target domain is Education (got "${match.targetDomain}")`);
assert(match.overallMatch >= 75, `High overall match score for qualified teacher (got ${match.overallMatch}%)`);

checkNoForbidden(match.matchedSkills, 'matchedSkills');
checkNoForbidden(match.missingSkills, 'missingSkills');
checkNoForbidden(match.weakSkills, 'weakSkills');
checkNoForbidden(match.topGaps, 'topGaps');
checkNoForbidden(match.recommendations, 'recommendations');
checkNoForbidden(match.requirementBreakdown.coreDomainSkills, 'requirementBreakdown.coreDomainSkills');
checkNoForbidden(match.requirementBreakdown.responsibilities, 'requirementBreakdown.responsibilities');

// ─── 4. EXPERIENCE-RANGE MATCHING REGRESSION TESTS ───
console.log('\n--- 4. Experience-Range Matching Regression Tests ---');

// Primary School Teacher experience range test case
const regressionJd = `Role: Primary School Teacher
Preferred Qualifications:
- 2–5 years of teaching experience.
- Lesson planning`;

const regressionResume = `Ananya Sharma
Primary School Teacher
Summary:
Primary School Teacher with 4 years of primary teaching experience delivering interactive lessons.`;

// Test parsing functions
const parsedRange = parseExperienceRange('2–5 years of teaching experience');
assert(parsedRange && parsedRange.isRange && parsedRange.min === 2 && parsedRange.max === 5, 'Parsed "2–5 years of teaching experience" as range 2 to 5');
assert(isExperienceSatisfied('2–5 years of teaching experience', 4), '4 years satisfies 2–5 years range');
assert(isExperienceSatisfied('2–5 years of teaching experience', 2), '2 years satisfies 2–5 years range');
assert(isExperienceSatisfied('2–5 years of teaching experience', 5), '5 years satisfies 2–5 years range');
assert(!isExperienceSatisfied('2–5 years of teaching experience', 1), '1 year does not satisfy 2–5 years range');
assert(!isExperienceSatisfied('2–5 years of teaching experience', 6), '6 years does not satisfy 2–5 years range');

// Test support for common forms
assert(isExperienceSatisfied('2–5 years', 4), '"2–5 years" satisfies 4 years');
assert(isExperienceSatisfied('2-5 years', 4), '"2-5 years" satisfies 4 years');
assert(isExperienceSatisfied('2+ years', 4), '"2+ years" satisfies 4 years');
assert(isExperienceSatisfied('at least 3 years', 4), '"at least 3 years" satisfies 4 years');
assert(isExperienceSatisfied('3 years of experience', 4), '"3 years of experience" satisfies 4 years');

// Test candidate years extraction
const extractedYears = estimateResumeYears(regressionResume);
assert(extractedYears === 4, `Extracted candidate years from resume as 4 (got ${extractedYears})`);

// Test extractExperienceRequirements
const expReqs = extractExperienceRequirements(regressionJd, regressionResume);
const teachingExp = expReqs.find(e => /year/i.test(e.name));
assert(teachingExp && teachingExp.status === 'matched', `Experience requirement is MATCHED (status: "${teachingExp?.status}")`);

// Test analyzeJdRequirements consistency
const reqBreakdown = analyzeJdRequirements(regressionJd, regressionResume);
assert(reqBreakdown.matchedList.some(m => /year/i.test(m)), 'Experience requirement appears in matchedList');
assert(!reqBreakdown.missingList.some(m => /year/i.test(m)), 'Experience requirement does NOT appear in missingList');

// Test computeJobMatch consistency across all outputs
const matchRes = computeJobMatch({ resumeText: regressionResume, jobDescription: regressionJd });
const expInBreakdown = matchRes.requirementBreakdown.experienceRequirements.find(e => /year/i.test(e.name));
assert(expInBreakdown && expInBreakdown.status === 'matched', 'Requirement Breakdown marks experience as MATCHED');
assert(!matchRes.missingSkills.some(s => /year/i.test(s)), 'Experience requirement is NOT in missingSkills');
assert(!matchRes.topGaps.some(g => /year/i.test(g.skill)), 'Experience requirement is NOT in topGaps');
assert(!matchRes.recommendations.some(r => /year/i.test(r)), 'Experience requirement is NOT in recommendations');
assert(matchRes.experienceMatch >= 80, `Experience match score is high (got ${matchRes.experienceMatch}%)`);

console.log('\n======================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}

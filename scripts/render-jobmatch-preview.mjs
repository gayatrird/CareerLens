// Renders <JobMatchSection> (and an empty-state guard check) to a static HTML
// page so the Job Match Analysis UI can be visually verified in all three
// themes (Cyber Dark, Midnight Navy, Clean Light) via the Preview tab.
//
// Uses Vite's SSR loader for the JSX component and the PRODUCTION CSS from
// dist/ so the preview styles are byte-for-byte what the built app ships.
import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, '.preview');
const PORT = 5198;

// Realistic jobMatch payload (shape produced by src/services/jobMatch.js).
const jobMatch = {
  overallMatch: 62,
  atsCompatibility: 55,
  skillsMatch: 68,
  experienceMatch: 70,
  technicalMatch: 45,
  matchedSkills: ['React', 'Node.js', 'Python', 'Docker', 'PostgreSQL', 'REST APIs', 'Git'],
  missingSkills: ['AWS', 'TypeScript', 'CI/CD', 'GraphQL'],
  weakSkills: ['SQL', 'Kubernetes'],
  topGaps: [
    { skill: 'AWS', importance: 'high', reason: 'Required by the job description but not demonstrated in the resume' },
    { skill: 'TypeScript', importance: 'high', reason: 'Listed as a primary requirement and missing from the resume' },
    { skill: 'SQL', importance: 'medium', reason: 'Some evidence in the resume, but expert reviewers flagged insufficient depth for this role' },
  ],
  recommendations: [
    'Add AWS experience — the job description requires it but it is not currently demonstrated in your skills or experience.',
    'Strengthen the SQL evidence on the resume — the job description values it and the current mention is too shallow.',
    'Lead the resume with the experience and keywords this job description emphasizes.',
    'Quantify the impact of your React project with measurable outcomes so reviewers can gauge the scale of your work.',
  ],
  requirementBreakdown: {
    technicalSkills: [
      { name: 'React', status: 'matched' },
      { name: 'Node.js', status: 'matched' },
      { name: 'Programming', status: 'matched' },
      { name: 'AWS', status: 'missing' },
      { name: 'TypeScript', status: 'weak' },
      { name: 'Databases', status: 'weak' },
    ],
    responsibilities: [
      { name: 'design, develop, test, and maintain web applications', status: 'matched' },
      { name: 'deploy and monitor production services', status: 'missing' },
      { name: 'collaborate with cross-functional teams', status: 'matched' },
    ],
    experienceRequirements: [
      { name: 'Fresher', status: 'missing' },
      { name: '2+ years', status: 'matched' },
      { name: "Bachelor's degree", status: 'matched' },
    ],
    softSkills: [
      { name: 'Problem Solving', status: 'matched' },
      { name: 'Communication', status: 'weak' },
      { name: 'Willingness to Learn', status: 'matched' },
    ],
  },
};

const server = await createServer({
  root,
  logLevel: 'error',
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
});
await server.listen();

try {
  const { default: JobMatchSection } = await server.ssrLoadModule('/src/components/JobMatchSection.jsx');

  // Guard: old records without jobMatch must render nothing (no crash).
  const emptyHtml = renderToString(React.createElement(JobMatchSection, { jobMatch: null }));
  if (emptyHtml.trim() !== '') throw new Error('JobMatchSection rendered content with jobMatch=null!');
  console.log('✓ jobMatch=null renders empty (backward compatible)');

  let rendered = renderToString(React.createElement(JobMatchSection, { jobMatch }));

  // Static preview has no React hydration, so bake in the ring's FINAL animated
  // values (the score the real app counts up to): dashoffset for the score and
  // the displayed number. The in-app behavior is unchanged — this only makes
  // the static snapshot show the end state.
  const ringRadius = 64;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const finalOffset = ringCircumference * (1 - jobMatch.overallMatch / 100);
  rendered = rendered.replace(/stroke-dashoffset="[^"]*"/, `stroke-dashoffset="${finalOffset}"`);
  rendered = rendered.replace(
    /(<span class="text-5xl font-black" style="color:#[0-9A-Fa-f]{6}">)0(<\/span>)/,
    `$1${jobMatch.overallMatch}$2`
  );

  // Production CSS (whole app, including theme overrides from index.css).
  const distDir = path.join(root, 'dist', 'assets');
  const cssFile = fs.readdirSync(distDir).find((f) => f.endsWith('.css'));
  if (!cssFile) throw new Error('No CSS found in dist/assets — run npm run build first.');
  const css = fs.readFileSync(path.join(distDir, cssFile), 'utf8');

  fs.mkdirSync(outDir, { recursive: true });
  const page = `<!doctype html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Job Match Analysis — preview</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
<style>${css}</style>
<style>
  .theme-bar { position: fixed; top: 12px; right: 12px; z-index: 100; display: flex; gap: 8px;
    background: rgba(20,20,24,0.9); border: 1px solid #2D2F36; border-radius: 12px; padding: 6px; backdrop-filter: blur(8px); }
  .theme-bar button { border: 1px solid #3F3F46; background: transparent; color: #A1A1AA; font: 600 11px Inter, sans-serif;
    letter-spacing: 0.06em; text-transform: uppercase; padding: 6px 10px; border-radius: 8px; cursor: pointer; }
  .theme-bar button.active { border-color: #5B8CFF; color: #5B8CFF; }
</style>
</head>
<body>
<div style="max-width: 1024px; margin: 0 auto; padding: 72px 20px 40px;">
${rendered}
</div>
<div class="theme-bar">
  <button data-theme="dark"  class="active">Cyber Dark</button>
  <button data-theme="light">Clean Light</button>
  <button data-theme="navy">Midnight Navy</button>
</div>
<script>
  document.querySelectorAll('.theme-bar button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.documentElement.setAttribute('data-theme', btn.dataset.theme);
      document.querySelectorAll('.theme-bar button').forEach((b) => b.classList.toggle('active', b === btn));
    });
  });
</script>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'jobmatch-preview.html'), page, 'utf8');
  console.log(`✓ preview written: .preview/jobmatch-preview.html (${(page.length / 1024).toFixed(1)} kB)`);
} finally {
  await server.close();
}
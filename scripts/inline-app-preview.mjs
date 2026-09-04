// Dev utility: inline the Vite build output (JS + CSS) into a single HTML file
// so the full app can be served from the preview's single-file static server.
// Usage: node scripts/inline-app-preview.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, '.preview', 'app');
const htmlPath = join(dir, 'index.html');

let html = readFileSync(htmlPath, 'utf8');

// Inline CSS assets: <link rel="stylesheet" ... href="(./)assets/xxx.css">
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="(\.?\/?assets\/[^"]+\.css)"[^>]*>/g, (m, href) => {
  const css = readFileSync(join(dir, href.replace(/^\.\//, '')), 'utf8');
  return `<style>\n${css}\n</style>`;
});

// Inline JS assets: <script type="module" ... src="(./)assets/xxx.js"></script>
html = html.replace(/<script[^>]*src="(\.?\/?assets\/[^"]+\.js)"[^>]*><\/script>/g, (m, src) => {
  const js = readFileSync(join(dir, src.replace(/^\.\//, '')), 'utf8');
  return `<script type="module">\n${js}\n</script>`;
});

// Drop favicon (absolute path that 404s on the preview server)
html = html.replace(/<link[^>]*rel="icon"[^>]*>/g, '');

writeFileSync(htmlPath, html, 'utf8');
console.log('Inlined build into', htmlPath, `(${Math.round(html.length / 1024)} KB)`);
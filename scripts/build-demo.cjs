'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const web = path.join(root, 'web');
const overlay = path.join(root, 'demo', 'overrides');
const out = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'demo', 'manifest.json'), 'utf8'));

for (const file of manifest.files) {
  const source = path.resolve(overlay, file.path);
  if (!source.startsWith(overlay + path.sep)) throw Error('Overlay path leaves its directory');
  const digest = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  if (digest !== file.sha256) throw Error('Overlay changed; update demo/manifest.json: ' + file.path);
}
fs.mkdirSync(out, { recursive: true });
fs.cpSync(web, out, { recursive: true });
fs.cpSync(overlay, out, { recursive: true });
// Remove only named obsolete generated files; no recursive cleanup of user folders.
for (const name of ['store-clerk.js', 'store-clerk.css']) {
  const target = path.join(out, 'src', name);
  if (fs.existsSync(target)) fs.unlinkSync(target);
}
const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
if (/store-clerk|chunk-loader/.test(html)) throw Error('Unexpected obsolete module');
if (!html.includes('demo/demo-client.js')) throw Error('Prepared client is missing');
console.log('Built API-free guided Demo in dist/. Serve it with a static HTTP server.');

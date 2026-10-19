const fs = require('fs');
const path = require('path');

const required = ['jsdom', 'fake-indexeddb', 'esbuild'];
const missing = [];
for (const name of required) {
  try { require.resolve(name); }
  catch { missing.push(name); }
}

const bundle = path.join(__dirname, 'bundle.js');
const manifest = path.join(__dirname, 'sim-manifest.json');

if (missing.length) {
  console.error('SIM KIT 2.0 — dependências ausentes: ' + missing.join(', '));
  console.error('Execute: npm install');
  process.exit(2);
}
if (!fs.existsSync(bundle) || !fs.existsSync(manifest)) {
  console.error('SIM KIT 2.0 — bundle não gerado.');
  console.error('Execute: python3 build-sim.py /caminho/para/Blue-Ocean-Service-Studio-V1.19.2-Linux-Source-Launcher');
  process.exit(2);
}
console.log('SIM KIT 2.0 — preflight OK');

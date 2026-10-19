const fs = require('fs');
const path = require('path');
const dir = path.resolve(process.env.SIM_OUTPUT_DIR || path.join(__dirname, 'results'));
const rows = [];
const crashes = [];
for (let p = 0; p <= 7; p++) {
  const file = path.join(dir, `r${p}.json`);
  if (!fs.existsSync(file)) { crashes.push(`F${p}: resultado ausente`); continue; }
  try { rows.push(...JSON.parse(fs.readFileSync(file, 'utf8'))); }
  catch (e) { crashes.push(`F${p}: JSON inválido (${e.message})`); }
}
for (const file of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
  if (file.startsWith('crash-')) crashes.push(fs.readFileSync(path.join(dir, file), 'utf8').trim());
}
const count = (kind, status) => rows.filter(r => (!kind || r.kind === kind) && (!status || r.status === status)).length;
const summary = {
  totalRecords: rows.length,
  assertions: { pass: count('assertion', 'PASS'), fail: count('assertion', 'FAIL') },
  knownIssues: { open: count('known_issue', 'KNOWN'), resolved: count('known_issue', 'RESOLVED') },
  diagnostics: count('diagnostic'),
  benchmarks: count('benchmark'),
  crashes,
};
summary.gate = summary.assertions.fail === 0 && crashes.length === 0 ? 'PASS' : 'FAIL';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log('\n=== RESUMO SIM KIT 2.0 ===');
console.log(`ASSERTIONS  PASS ${summary.assertions.pass}  FAIL ${summary.assertions.fail}`);
console.log(`KNOWN ISSUES abertas ${summary.knownIssues.open}  resolvidas ${summary.knownIssues.resolved}`);
console.log(`DIAGNOSTICS ${summary.diagnostics}  BENCHMARKS ${summary.benchmarks}`);
if (crashes.length) console.log('CRASHES: ' + crashes.join(' | '));
console.log(`GATE FINAL: ${summary.gate}`);
if (summary.assertions.fail) {
  console.log('\nFalhas bloqueantes:');
  rows.filter(r => r.kind === 'assertion' && r.status === 'FAIL').forEach(r => console.log(`- ${r.id} ${r.title}${r.detail ? ` — ${r.detail}` : ''}`));
}
if (summary.knownIssues.open) {
  console.log('\nKnown issues:');
  rows.filter(r => r.kind === 'known_issue' && r.status === 'KNOWN').forEach(r => console.log(`- ${r.id} ${r.title}${r.detail ? ` — ${r.detail}` : ''}`));
}
process.exit(summary.gate === 'PASS' ? 0 : 1);

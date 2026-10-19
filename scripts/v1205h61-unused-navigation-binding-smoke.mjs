import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
let okCount = 0;
let failCount = 0;
function check(condition, label) {
  if (condition) { console.log(`OK   ${label}`); okCount += 1; }
  else { console.error(`FAIL ${label}`); failCount += 1; }
}

check(!/\{[^}]*activeTab\s*,\s*setActiveTab\s*,\s*graph/s.test(app), 'App não extrai setActiveTab sem uso');
check(!/\bsetActiveTab\b/.test(app), 'App não mantém referência residual a setActiveTab');
check(/const \{ activeTab, graph, journey, hasService/.test(app), 'destructuring preserva activeTab e graph');
check(/const selectCore =/.test(app) && /const openLibraryPage =/.test(app) && /hideLegacyPageSurfaces/.test(app), 'coordenadores de navegação H6 permanecem presentes');
check(/rt-navigation/.test(app), 'navegação canônica rt-navigation permanece presente');

console.log(`\nV1.20.5-H6.1 Unused Navigation Binding: ${okCount} OK / ${failCount} FAIL`);
if (failCount) process.exit(1);

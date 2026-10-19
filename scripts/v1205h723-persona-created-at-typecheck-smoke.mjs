import { readFileSync } from 'node:fs';

const personas = readFileSync(new URL('../src/views/PersonasView.tsx', import.meta.url), 'utf8');
let okCount = 0;
let failCount = 0;
const check = (condition, label) => {
  if (condition) { console.log(`OK   ${label}`); okCount += 1; }
  else { console.error(`FAIL ${label}`); failCount += 1; }
};

check(personas.includes("const now = new Date().toISOString();"), 'criação da Persona gera timestamp explícito');
check(/createDiscoveryEntity\(\{[^}]*kind:\s*'persona'[^}]*now\s*\}\)/s.test(personas), 'timestamp é repassado para createDiscoveryEntity');
check(personas.includes('service: { ...current.service, updatedAt: now }'), 'service.updatedAt usa o mesmo timestamp explícito');
check(!personas.includes('String(entity.updatedAt)'), 'criação não acessa entity.updatedAt pelo GraphEntity genérico');
check(!/\bas any\b/.test(personas), 'hotfix não usa as any');

console.log(`\nV1.20.5-H7.2.3 Persona timestamp typecheck: ${okCount} OK / ${failCount} FAIL`);
if (failCount) process.exit(1);

import fs from 'node:fs';

const file = 'src/views/WorkspaceHome.tsx';
const src = fs.readFileSync(file, 'utf8');
let ok = 0;
let fail = 0;
const check = (condition, label) => {
  if (condition) { console.log(`OK   ${label}`); ok += 1; }
  else { console.error(`FAIL ${label}`); fail += 1; }
};

check(!src.includes('const jobs = discoveryWorkspace.collections.job.items;'), 'jobs morto removido');
check(!src.includes('const pains = discoveryWorkspace.collections.pain.items;'), 'pains morto removido');
check(!src.includes('const designCount ='), 'designCount morto removido');
check(!src.includes('const validationCount ='), 'validationCount morto removido');
check(!src.includes('const improvementCount ='), 'improvementCount morto removido');
check(src.includes("import type { ActiveTab, GraphEntity, ServiceProjectPhase } from '../domain/model';"), 'GraphEntity importado como type');
check(src.includes('const entity: GraphEntity = { ...createDiscoveryEntity('), 'entidade de Discovery possui anotação GraphEntity');
check(src.includes('type: discoveryCreate }'), 'contrato legado type: discoveryCreate preservado');
check(src.includes('updatedAt: String(entity.updatedAt)'), 'updatedAt acessado somente após anotação GraphEntity');

console.log(`\nV1.20.1-H1 WorkspaceHome typecheck hotfix: ${ok} OK / ${fail} FAIL`);
if (fail) process.exit(1);

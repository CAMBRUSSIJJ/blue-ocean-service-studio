import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  projectContextRecords, projectRelatedRecords, projectHasLinkedEvidence, filterProjectContext,
} from '../src/services/project-context-index.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const graph = (id, records) => ({service:{id},entities:records});
const records = {
  persona: {
    p1: {id:'p1',serviceId:'s1',title:'Paciente',relatedIds:['n1']},
    p2: {id:'p2',serviceId:'s2',title:'Outro projeto'},
  },
  need: {
    n1: {id:'n1',serviceId:'s1',title:'Agendar sem demora',personaIds:['p1'],evidenceIds:['e1'],description:'Atendimento rápido'},
    n2: {id:'n2',serviceId:'s1',title:'Informações claras',personaIds:['p1']},
    nx: {id:'nx',serviceId:'s2',title:'Necessidade de outro projeto'},
  },
  evidence: {e1:{id:'e1',serviceId:'s1',title:'Entrevista',relatedIds:['n1']}},
  pain: {pain1:{id:'pain1',serviceId:'s1',title:'Fila demorada'}},
};
const base = graph('s1',records);
const all = projectContextRecords(base);
assert.equal(all.length,5,'only current service/project records are listed');
assert(!all.some(item=>item.serviceId==='s2'),'records from another project cannot leak');
assert.deepEqual(projectRelatedRecords(all,'n1').map(item=>item.id).sort(),['e1','p1'],'relations work in both directions');
assert(projectHasLinkedEvidence(all,'n1'),'evidence relation is recognized');
assert(!projectHasLinkedEvidence(all,'n2'),'unlinked evidence is not fabricated');
assert.deepEqual(filterProjectContext(all,{area:'audience',kind:'need',personaId:'p1',hasEvidence:true}).map(x=>x.id),['n1'],'multiple filters are combined');
assert.equal(filterProjectContext(all,{area:'audience',kind:'need',query:'CLARAS'}).length,1,'search is case-insensitive');
assert.deepEqual(filterProjectContext(all,{area:'research'}).map(x=>x.id),['e1'],'research tab includes only research-related types');
assert(!filterProjectContext(all,{area:'audience',kind:'need',personaId:'p2'}).length,'another project persona does not match');
assert.equal(base.entities.need.n1.projectId,undefined,'filtering does not add or mutate project references');
const copy = JSON.stringify(base);
filterProjectContext(all,{area:'audience',hasEvidence:true});
assert.equal(JSON.stringify(base),copy,'all selectors are read-only');
assert.equal(projectContextRecords(graph('s2',records)).length,2,'switching projects changes the dataset');

const app = readFileSync(join(root,'src/App.tsx'),'utf8');
const view = readFileSync(join(root,'src/views/ProjectShellView.tsx'),'utf8');
const maps = readFileSync(join(root,'src/views/BlueprintWorkspaceView.tsx'),'utf8');
assert(app.includes('isProjectHome && hasService && <ProjectShellView'),'project home is reachable from the primary app');
assert(app.includes('data-project-context-nav="h1"'),'project overview navigation is available');
assert(app.includes("detail: 'home'"),'opening project returns to the contextual home');
for (const area of ['overview','audience','research','maps','improvement']) {
  assert(view.includes("id:'"+area+"'"),area+' is reachable as a project tab');
}
assert(view.includes("sessionStorage.setItem('bo-service-object-focus'"),'linked records open their existing detail views');
assert(view.includes('onClick={recentMap ? openService : onCreateMap}') && view.includes("{recentMap ? 'Continuar mapa' : 'Criar mapa'}"),'project overview has one context-sensitive map CTA including quick-create');
assert(app.includes('createMapIntent={createMapIntent}'),'the quick-create intent reaches the map editor');
assert(maps.includes('if (!createMapIntent) return;') && maps.includes('setJourneyCreateOpen(true);'),'the existing creation dialog consumes the intent');
console.log('H1 project context: scope, relations, filters, navigation and quick-create assertions passed.');

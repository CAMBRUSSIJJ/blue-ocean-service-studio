import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
// Load the actual production function with its adjacent dependencies isolated.
// Node 22+ strips TypeScript types. Replacing imports avoids requiring the UI/runtime.
const source = fs.readFileSync(new URL('../src/domain/graph-operations.ts', import.meta.url), 'utf8');
const start = source.indexOf('export const deleteStageFromGraph =');
const end = source.indexOf('\n};', start) + 3;
assert.ok(start >= 0 && end > start, 'Production deletion function found');
const actualFunction = source.slice(start, end).replace('export const deleteStageFromGraph', 'const deleteStageFromGraph');
const dir = mkdtempSync(join(tmpdir(), 'blue-ocean-a2-'));
try {
  const modulePath = join(dir, 'delete.ts');
  writeFileSync(modulePath, `type Id = string; type ServiceGraph = any; const nowIso = () => '2026-10-19T00:00:00Z'; const repairGraphReferences = (g: ServiceGraph) => g;\n${actualFunction}\nexport {deleteStageFromGraph};`);
  execFileSync('tsc', [modulePath, '--outDir', dir, '--target', 'ES2022', '--module', 'ES2022', '--noCheck'], { stdio: 'pipe' });
  writeFileSync(join(dir, 'package.json'), '{"type":"module"}');
  const { deleteStageFromGraph } = await import(pathToFileURL(join(dir, 'delete.js')));
  const stage = { id:'s1', journeyId:'j1', title:'Descoberta', problemIds:['p1'], opportunityIds:['o1'], touchpointIds:['t1'], needIds:[],painIds:[] };
  const graph = {
    service: {id:'svc', updatedAt:''}, journeys:{j1:{id:'j1',stageIds:['s1','s2'],mapLayout:{version:1,lanes:[{id:'l1',cards:{s1:'Texto original',s2:'Outro texto'}}]}}},
    stages:{s1:stage,s2:{id:'s2',journeyId:'j1',title:'Compra',problemIds:[],opportunityIds:[],touchpointIds:['t1']}},
    touchpoints:{t1:{id:'t1',name:'Website'}},
    problems:{p1:{id:'p1',stageId:'s1',description:'Dor'},p2:{id:'p2',stageId:'s2',description:'Outra dor'}},
    opportunities:{o1:{id:'o1',stageId:'s1',title:'Melhoria',problemIds:['p1'],taskIds:['task1']}},
    tasks:{task1:{id:'task1',stageId:'s1',opportunityId:'o1',title:'Trabalho'}},
    entities:{pain:{e1:{id:'e1',stageId:'s1',name:'Dor comum'},e2:{id:'e2',stageId:'s2',name:'Outra'}}},
  };
  const before = structuredClone(graph);
  const result = deleteStageFromGraph(graph,'s1');
  assert.deepEqual(graph,before,'Input not mutated');
  assert.deepEqual(result.journeys.j1.stageIds,['s2'],'Stage removed from journey');
  assert.equal(result.stages.s1,undefined,'Stage removed');
  assert.equal(result.journeys.j1.mapLayout.lanes[0].cards.s1,undefined,'Cell contents removed');
  assert.equal(result.journeys.j1.mapLayout.lanes[0].cards.s2,'Outro texto','Other contents preserved');
  assert.equal(result.problems.p1.stageId,'','Problem preserved and detached');
  assert.equal(result.opportunities.o1.stageId,'','Opportunity preserved and detached');
  assert.equal(result.tasks.task1.stageId,'','Task preserved and detached');
  assert.equal(result.entities.pain.e1.stageId,'','Linked entity preserved and detached');
  assert.equal(result.touchpoints.t1.name,'Website','Shared touchpoint preserved');
  assert.equal(result.problems.p2.stageId,'s2','Other stage relation unchanged');
  assert.deepEqual(deleteStageFromGraph(result,'s1'),result,'Repeated deletion safe');
  console.log('PASS: 12 behavioral assertions — deletion, retention, immutability, cell cleanup and idempotence');
} finally { rmSync(dir,{recursive:true,force:true}); }

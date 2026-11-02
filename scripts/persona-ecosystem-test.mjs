import assert from 'node:assert/strict';
import { createDiscoveryEntity } from '../src/services/discovery-workspace.ts';
import { personaProfileFromEntity, buildPersonaStudioReport } from '../src/services/persona-studio.ts';
import { changePersonaEcosystem, personaEcosystemMaps, personaSourceUrl } from '../src/services/persona-ecosystem.ts';

let count=0;
const test=(label,run)=>{run();count++;console.log('PASS '+label)};
function fixture(){
 const graph={service:{id:'service1',name:'Atendimento',updatedAt:'2026-11-02T12:00:00Z'},entities:{},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},views:{whiteboards:{}}};
 const p=createDiscoveryEntity({graph,kind:'persona',title:'Cliente digital',id:'p1'});
 graph.entities.persona={p1:p};
 return graph;
}
test('Quick creation is atomic, bidirectional and does not mutate the original graph',()=>{
 const graph=fixture(),original=structuredClone(graph),draft={...personaProfileFromEntity(graph.entities.persona.p1),primaryGoal:'Receber no prazo'};
 const next=changePersonaEcosystem(graph,'p1',draft,[],{type:'create',kind:'pain',title:'Não sabe o prazo',id:'pain1'});
 assert.deepEqual(graph,original);
 assert.deepEqual(next.entities.persona.p1.relatedIds,['pain1']);
 assert.deepEqual(next.entities.pain.pain1.personaIds,['p1']);
 assert.deepEqual(next.entities.pain.pain1.relatedIds,['p1']);
 assert.equal(next.entities.persona.p1.primaryGoal,draft.primaryGoal);
});
test('Existing shared records are linked and unlinked without deleting them or other Persona links',()=>{
 const graph=fixture();graph.entities.need={n1:{id:'n1',type:'need',serviceId:graph.service.id,title:'Atendimento rápido',relatedIds:['p2'],personaIds:['p2']}};
 const draft=personaProfileFromEntity(graph.entities.persona.p1);
 const linked=changePersonaEcosystem(graph,'p1',draft,[],{type:'link',id:'n1'});
 assert.equal(Object.keys(linked.entities.need).length,1);
 const unlinked=changePersonaEcosystem(linked,'p1',personaProfileFromEntity(linked.entities.persona.p1),['n1'],{type:'unlink',id:'n1'});
 assert.deepEqual(unlinked.entities.need.n1.personaIds,['p2']);
 assert.deepEqual(unlinked.entities.need.n1.relatedIds,['p2']);
 assert.equal(unlinked.entities.need.n1.title,'Atendimento rápido');
 assert.equal(buildPersonaStudioReport(unlinked,'p1').connectionCounts.need,0);
});
test('Source URLs persist in canonical evidence and an existing source is reused without renaming it',()=>{
 let graph=fixture();
 graph=changePersonaEcosystem(graph,'p1',personaProfileFromEntity(graph.entities.persona.p1),[],{type:'create',kind:'evidence',title:'Entrevistas',url:'https://example.org/entrevistas',id:'e1'});
 assert.equal(graph.entities.evidence.e1.sourceName,'https://example.org/entrevistas');
 assert.equal(graph.entities.evidence.e1.confidence,'low');
 const next=changePersonaEcosystem(graph,'p1',personaProfileFromEntity(graph.entities.persona.p1),['e1'],{type:'create',kind:'evidence',title:'Outro título',url:'https://example.org/entrevistas',id:'e2'});
 assert.equal(Object.keys(next.entities.evidence).length,1);
 assert.equal(next.entities.evidence.e1.title,'Entrevistas');
 assert.equal(buildPersonaStudioReport(JSON.parse(JSON.stringify(next)),'p1').connectionCounts.evidence,1);
});
test('Unlinking a research source removes its claim anchors and preserves the source record',()=>{
 const graph=fixture();graph.entities.evidence={e1:{id:'e1',type:'evidence',serviceId:graph.service.id,title:'Entrevista',relatedIds:['p1'],personaIds:['p1']}};
 const draft={...personaProfileFromEntity(graph.entities.persona.p1),primaryGoal:'Resolver rápido',evidenceClaims:[{field:'primaryGoal',statement:'Resolver rápido',evidenceIds:['e1']}]};
 const next=changePersonaEcosystem(graph,'p1',draft,['e1'],{type:'unlink',id:'e1'});
 assert.deepEqual(next.entities.persona.p1.personaEvidenceClaims,[]);
 assert.ok(next.entities.evidence.e1);
 assert.equal(buildPersonaStudioReport(next,'p1').connectionCounts.evidence,0);
});
test('Invalid links and records from another service are rejected before any mutation',()=>{
 const graph=fixture(),draft=personaProfileFromEntity(graph.entities.persona.p1),original=structuredClone(graph);
 for(const url of ['javascript:alert(1)','file:///etc/passwd','data:text/html,x','https://user:password@example.org','not-a-url']){
  assert.equal(personaSourceUrl(url),'');
  assert.throws(()=>changePersonaEcosystem(graph,'p1',draft,[],{type:'create',kind:'evidence',title:'Inválido',url}));
 }
 assert.deepEqual(graph,original);
 graph.entities.need={foreign:{id:'foreign',type:'need',serviceId:'another',title:'Fora do serviço'}};
 assert.throws(()=>changePersonaEcosystem(graph,'p1',draft,[],{type:'link',id:'foreign'}));
});
test('Map counts reflect canonical usage and do not count unrelated maps',()=>{
 const graph=fixture();
 graph.journeys.j1={id:'j1',serviceId:graph.service.id,name:'Entrega',stageIds:[],personaId:'p1'};
 graph.journeys.j2={id:'j2',serviceId:graph.service.id,name:'Outro mapa',stageIds:[]};
 assert.deepEqual(personaEcosystemMaps(graph,'p1'),[{id:'j1',kind:'journey',title:'Entrega'}]);
 graph.views.whiteboards.b1={id:'b1',viewKind:'blueprint',journeyId:'j1',name:'Entrega Blueprint',items:{},designContext:{personaIds:['p1']}};
 assert.equal(personaEcosystemMaps(graph,'p1').length,1,'Blueprint and Journey are one canonical map');
 graph.journeys.j2.matrixContent={cells:{s1:{ac:[{type:'persona',referenceId:'p1'}]}}};
 assert.equal(personaEcosystemMaps(graph,'p1').length,2,'A Persona card is actual usage even without a selected map Persona');
});
console.log(`Persona ecosystem: ${count}/${count} PASS`);

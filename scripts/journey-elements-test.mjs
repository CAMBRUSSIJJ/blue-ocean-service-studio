import assert from 'node:assert/strict';
import { prepareJourneyElement, JOURNEY_ELEMENT_TYPES } from '../src/services/journey-elements.js';
import { matrixServiceReferences, matrixContentFromDocument, restoreMatrixContent } from '../src/services/journey-content.js';

let count=0;
const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
function fixture(){
  const graph={service:{id:'service'},journeys:{j:{id:'j',serviceId:'service',stageIds:['s']},other:{id:'other',stageIds:['s2']}},
    stages:{s:{id:'s',title:'Usar',journeyId:'j',opportunityIds:[]},s2:{id:'s2',title:'Pesquisar',journeyId:'other'}},
    entities:{pain:{p:{id:'p',title:'Espera',serviceId:'service',category:'Tempo',relatedIds:['n'],evidenceIds:['e'],createdBy:'actor'},
      foreign:{id:'foreign',title:'Outro serviço',serviceId:'foreign'}},need:{n:{id:'n',title:'Receber previsão',serviceId:'service'}},
      evidence:{e:{id:'e',title:'Entrevista',source:'Pesquisa',serviceId:'service'}},persona:{},channel:{}},problems:{},opportunities:{}};
  const doc={steps:[{hostStageId:'s',n:'Usar'}],c:{'ac|0':[{i:'existing',type:'card',t:'Ação original'}]}};
  const input={elementType:'pain',stageId:'s',rowId:'ac',referenceId:'p'};
  return {graph,doc,input};
}
check('Linking reuses the canonical record without changing it or either input',()=>{
  const {graph,doc,input}=fixture(),before=structuredClone({graph,doc}),result=prepareJourneyElement(graph,'j',doc,input,'actor');
  assert.deepEqual({graph,doc},before);assert.deepEqual(result.graph.entities,graph.entities);
  assert.equal(result.document.c['ac|0'][1].referenceId,'p');assert.equal(result.document.c['ac|0'][0].t,'Ação original');
});
check('Creation and placement work for all six types and retain real authorship',()=>{
  for(const type of JOURNEY_ELEMENT_TYPES){
    const {graph,doc,input}=fixture(),before=structuredClone(graph);
    const result=prepareJourneyElement(graph,'j',doc,{...input,elementType:type,referenceId:'',newRecord:{title:'Novo registro',description:'Contexto',source:'Entrevista'}},'actor','2026-10-23T12:00:00Z');
    const record=type==='opportunity'?result.graph.opportunities[result.referenceId]:result.graph.entities[type][result.referenceId];
    assert.equal(record.title,'Novo registro');assert.equal(record.createdBy,'actor');assert.equal(record.serviceId,'service');
    assert.equal(result.document.c['ac|0'][1].referenceId,record.id);assert.deepEqual(graph,before);
    if(type==='opportunity')assert.deepEqual(result.graph.stages.s.opportunityIds,[record.id]);
  }
});
check('Invalid types, foreign records, vanished stages and stale insertion points fail without mutation',()=>{
  const {graph,doc,input}=fixture(),before=structuredClone({graph,doc});
  for(const patch of [{elementType:'metric'},{referenceId:'foreign'},{referenceId:'gone'},{stageId:'s2'},{rowId:'bad|0'},
    {editingId:'gone'},{beforeId:'gone'},{referenceId:'',newRecord:{title:'  '}},{newRecord:{title:'Ambiguous'}},
    {elementType:'evidence',referenceId:'',newRecord:{title:'Sem fonte'}}]){
    assert.throws(()=>prepareJourneyElement(graph,'j',doc,{...input,...patch},'actor'));
    assert.deepEqual({graph,doc},before);
  }
});
check('Full cells reject creation before a canonical record can be orphaned',()=>{
  const {graph,doc,input}=fixture();doc.c['ac|0']=Array.from({length:100},(_,i)=>({i:'n'+i,type:'card',t:''}));
  const before=structuredClone({graph,doc});assert.throws(()=>prepareJourneyElement(graph,'j',doc,{...input,referenceId:'',newRecord:{title:'Novo'}}));assert.deepEqual({graph,doc},before);
});
check('Existing cards retain identity and metadata when a reference is edited',()=>{
  const {graph,doc,input}=fixture();doc.c['ac|0'].push({i:'linked',type:'pain',referenceId:'p',t:'Anterior',tags:['Pesquisa'],tone:'blue'});
  const result=prepareJourneyElement(graph,'j',doc,{...input,editingId:'linked',caption:'Legenda local'});
  assert.equal(result.noteId,'linked');assert.equal(result.document.c['ac|0'].length,2);assert.deepEqual(result.document.c['ac|0'][1].tags,['Pesquisa']);assert.equal(graph.entities.pain.p.title,'Espera');
  assert.throws(()=>prepareJourneyElement(graph,'j',doc,input));
});
check('Insertion order and stable stage identity survive reordering and JSON roundtrips',()=>{
  const {graph,doc,input}=fixture();doc.steps.unshift({hostStageId:'s2'});doc.c={'ac|1':doc.c['ac|0']};
  const result=prepareJourneyElement(graph,'j',doc,{...input,beforeId:'existing'}),content=matrixContentFromDocument(result.document,['s2','s']);
  const restored={c:{'ac|0':[{i:'existing',type:'card',t:'Ação original'}]}};restoreMatrixContent(restored,JSON.parse(JSON.stringify(content)),['s','s2']);
  assert.equal(restored.c['ac|0'][0].referenceId,'p');assert.equal(restored.c['ac|0'][1].i,'existing');
});
check('Details include only real related needs, evidence, stage usage and known creators',()=>{
  const {graph}=fixture();graph.journeys.j.matrixContent={cells:{s:{xpain:[{id:'card',type:'pain',referenceId:'p'}]}}};
  graph.entities.pain.p.relatedIds.push('foreign-evidence');graph.entities.evidence['foreign-evidence']={id:'foreign-evidence',title:'Foreign',serviceId:'foreign'};
  const before=structuredClone(graph),record=matrixServiceReferences(graph,{journeyId:'j',actorId:'actor'}).pain[0];
  assert.equal(record.inJourney,true);assert.equal(record.createdByMe,true);assert.deepEqual(record.stages,[{id:'s',title:'Usar',journeyId:'j'}]);
  assert.deepEqual(record.needs.map(r=>r.id),['n']);assert.deepEqual(record.evidence.map(r=>r.id),['e']);assert.deepEqual(graph,before);
  delete graph.entities.pain.p.createdBy;assert.equal(matrixServiceReferences(graph,{journeyId:'j',actorId:'actor'}).pain[0].createdByMe,false);
});
check('Fresh stage local identities resolve without accepting a stale canonical ID',()=>{
  const {graph,doc,input}=fixture();doc.steps[0].hostLocalId='fresh';
  const result=prepareJourneyElement(graph,'j',doc,{...input,stageId:undefined,stageLocalId:'fresh'});
  assert.equal(result.document.c['ac|0'][1].referenceId,'p');
  for(const patch of [{stageId:'stale',stageLocalId:'fresh'},{stageId:undefined,stageLocalId:'gone'},{stageId:undefined,stageLocalId:undefined}])assert.throws(()=>prepareJourneyElement(graph,'j',doc,{...input,...patch}));
});
check('Persona context changes only after explicit choice and stays atomic on failure',()=>{
  const {graph,doc,input}=fixture(),persona={...input,elementType:'persona',referenceId:'',newRecord:{title:'Cliente'}};
  assert.equal(prepareJourneyElement(graph,'j',doc,persona).graph.journeys.j.personaId,undefined);
  const result=prepareJourneyElement(graph,'j',doc,{...persona,useAsJourneyPersona:true});
  assert.equal(result.graph.journeys.j.personaId,result.referenceId);assert.equal(graph.journeys.j.personaId,undefined);
  const before=structuredClone(graph);assert.throws(()=>prepareJourneyElement(graph,'j',doc,{...persona,useAsJourneyPersona:true,beforeId:'gone'}));assert.deepEqual(graph,before);
});
check('Choosing a Persona never copies generic emotional observations into that person',()=>{
  const {graph,doc,input}=fixture();graph.stages.s.emotion='negative';graph.stages.s.emotionScore=-2;graph.stages.s.emotionRecorded=true;graph.stages.s.emotionNote='Observação geral';Object.assign(doc.steps[0],{e:-2,note:'Observação geral',emotionRecorded:true});
  const result=prepareJourneyElement(graph,'j',doc,{...input,elementType:'persona',referenceId:'',newRecord:{title:'Pessoa nova'},useAsJourneyPersona:true});
  assert.equal(result.document.steps[0].emotionRecorded,false);assert.equal(result.document.steps[0].note,'');assert.equal(result.graph.stages.s.emotionNote,'Observação geral');assert.equal(result.graph.entities.emotion,undefined);
});
console.log(`Journey elements: ${count}/${count} PASS`);

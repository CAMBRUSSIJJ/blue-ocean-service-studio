import assert from 'node:assert/strict';
import { validateMatrixDocument, normalizeMatrixActivity, matrixActivityFromRecord, writeMatrixActivity, normalizeMatrixConnection, validateMatrixConnections, matrixStageGeometry, matrixContentFromDocument, restoreMatrixContent, duplicateMatrixBlock } from '../src/services/journey-content.js';
let count=0;const check=(name,run)=>{run();count++;console.log('PASS '+name)};
check('Geometry follows unequal column widths, including widths beyond manual limits in fit mode',()=>{
 const geometry=matrixStageGeometry([600,500,260,720]);assert.deepEqual(geometry.stages.map(stage=>stage.center),[300,850,1230,1720]);assert.equal(geometry.total,2080);
 assert.deepEqual(matrixStageGeometry([]),{stages:[],total:0});assert.throws(()=>matrixStageGeometry([NaN]));assert.throws(()=>matrixStageGeometry([-1]));
});
check('Operational values preserve absent versus explicit zero estimates',()=>{
 const empty=normalizeMatrixActivity(),actual=normalizeMatrixActivity({owner:' Ana ',team:' Atendimento ',durationMinutes:0,targetMinutes:''});
 assert.equal(empty.durationMinutes,null);assert.equal(actual.durationMinutes,0);assert.equal(actual.targetMinutes,null);assert.equal(actual.owner,'Ana');assert.equal(actual.team,'Atendimento');
 for(const input of [{durationMinutes:-1},{durationMinutes:'bad'},{targetMinutes:Infinity}])assert.throws(()=>normalizeMatrixActivity(input));
});
check('Canonical activity editing preserves advanced operational fields, identity and unrelated relations',()=>{
 const record={id:'canonical',roleIds:['role'],operationalDetails:{failureMode:'Falha',predecessors:[{kind:'backstage',id:'earlier'}],capacityPerHour:12}};
 writeMatrixActivity(record,{owner:'Ana',team:'Suporte',resourceRefs:['system:crm'],rule:'Validar protocolo',durationMinutes:0});
 assert.equal(record.id,'canonical');assert.deepEqual(record.roleIds,['role']);assert.equal(record.operationalDetails.failureMode,'Falha');assert.equal(record.operationalDetails.capacityPerHour,12);assert.equal(record.operationalDetails.predecessors[0].id,'earlier');
 assert.equal(matrixActivityFromRecord(record).resourceRefs[0],'system:crm');assert.equal(matrixActivityFromRecord({}),null);
});
const cells=()=>({'ac|0':[{i:'action',t:'Enviar pedido'}],'fl|0':[{i:'front',hostItemId:'canonical-front',t:'Confirmar',activity:normalizeMatrixActivity({team:'Atendimento'})}],'bk|1':[{i:'back',hostItemId:'canonical-back',t:'Resolver',activity:normalizeMatrixActivity({team:'Especialistas'})}],'sy|0':[{i:'resource',t:'Sistema',activity:normalizeMatrixActivity({category:'resource'})}]});
const connection=(a,b,type='sequence')=>({id:a+'-'+b+'-'+type,a,b,type});
check('Typed links support customer actions, cross-stage activities and explicit resource use',()=>{
 const source=cells(),before=structuredClone(source),links=[connection('action','front'),connection('front','back','dependency'),connection('back','resource','uses')];
 assert.equal(validateMatrixConnections(source,links).length,3);assert.deepEqual(source,before);
 assert.throws(()=>validateMatrixConnections(source,[connection('front','back','uses')]));
 assert.throws(()=>validateMatrixConnections(source,[connection('front','missing')]));assert.throws(()=>validateMatrixConnections(source,[connection('front','front')]));
});
check('Handoffs require distinct teams and a deliverable and retain acceptance and deadline',()=>{
 for(const handoff of [{},{fromTeam:' Suporte ',toTeam:'suporte',deliverable:'Chamado'},{fromTeam:'A',toTeam:'B'}])assert.throws(()=>normalizeMatrixConnection({...connection('front','back','handoff'),handoff}));
 const handoff={fromTeam:'Atendimento',toTeam:'Especialistas',deliverable:'Chamado com diagnóstico',deadlineMinutes:0,acceptance:'Protocolo válido'};
 assert.deepEqual(normalizeMatrixConnection({...connection('front','back','handoff'),handoff}).handoff,handoff);
 assert.equal(normalizeMatrixConnection({...connection('front','back'),handoff}).handoff,undefined);
});
check('Only explicit dependencies prohibit cycles, while valid service loops remain possible',()=>{
 assert.throws(()=>validateMatrixConnections(cells(),[connection('front','back','dependency'),connection('back','front','dependency')]));
 assert.equal(validateMatrixConnections(cells(),[connection('front','back'),connection('back','front')]).length,2);
});
check('Connection and activity serialization remaps visual IDs to canonical IDs and back without duplication',()=>{
 const source=cells(),doc={c:source,links:[connection('action','front'),connection('front','back','dependency'),connection('back','resource','uses')]};
 const stored=JSON.parse(JSON.stringify(matrixContentFromDocument(doc,['stage-a','stage-b'],{notes:{resource:'canonical-resource'}})));
 assert.equal(stored.connections[0].b,'canonical-front');assert.equal(stored.connections[2].b,'canonical-resource');assert.equal(stored.cells['stage-a'].fl[0].activity.team,'Atendimento');
 const fresh={c:{'ac|0':[{i:'action',t:'Enviar pedido'}],'fl|0':[{i:'new-front',hostItemId:'canonical-front',t:'Confirmação atualizada'}],'bk|1':[{i:'new-back',hostItemId:'canonical-back',t:'Resolver'}],'sy|0':[{i:'new-resource',hostItemId:'canonical-resource',t:'Sistema'}]}};
 restoreMatrixContent(fresh,stored,['stage-a','stage-b']);assert.equal(fresh.links[0].b,'new-front');assert.equal(fresh.links[2].b,'new-resource');assert.equal(fresh.c['fl|0'][0].t,'Confirmação atualizada');
 restoreMatrixContent(fresh,stored,['stage-a','stage-b']);assert.equal(fresh.links.length,3);
 const removed={c:{'ac|0':[{i:'action',t:'Enviar pedido'}]}};restoreMatrixContent(removed,stored,[]);assert.equal(removed.links.length,0);
});
check('Legacy graph links survive reconstruction when a saved matrix has no connection data',()=>{
 const ref={c:{},links:[connection('old','legacy')]};restoreMatrixContent(ref,{rows:{},cells:{}},[]);assert.equal(ref.links.length,1);
});
check('Duplicated activity cards keep independent ownership and resource metadata without copying connections',()=>{
 const source=cells()['fl|0'][0],copy=duplicateMatrixBlock(source,'copy');copy.activity.resourceRefs.push('resource:new');copy.activity.team='Nova equipe';assert.equal(source.activity.team,'Atendimento');assert.equal(source.activity.resourceRefs.length,0);assert.equal(copy.hostItemId,undefined);
});
check('Legacy support records retain their category while new placements enforce method semantics',()=>{
 const legacy={owner:'Equipe de TI',operationalDetails:{durationMinutes:5}};assert.equal(matrixActivityFromRecord(legacy,'resource').category,'resource');
 assert.throws(()=>validateMatrixDocument({c:{'sy|0':[{i:'a',t:'Resolver',activity:normalizeMatrixActivity()}]}}));
 assert.throws(()=>validateMatrixDocument({c:{'fl|0':[{i:'a',t:'Sistema',activity:normalizeMatrixActivity({category:'resource'})}]}}));
 validateMatrixDocument({c:{'sy|0':[{i:'a',t:'Manter acesso',activity:normalizeMatrixActivity({category:'support-process'})}]}});
});
console.log(`Blueprint connections: ${count}/${count} PASS`);

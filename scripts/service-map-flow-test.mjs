import assert from 'node:assert/strict';
import { CANVAS_COMPONENTS, canvasAcceptsRow, prepareCanvasInput, moveCanvasCard, insertCanvasStage } from '../src/services/blueprint-canvas.js';
import { matrixContentFromDocument, restoreMatrixContent } from '../src/services/journey-content.js';
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name)};
const source=()=>({title:'Mapa',steps:[{n:'Agendar',hostStageId:'s1',e:-1,note:'Espera',emotionRecorded:true,emotionStatus:'hypothesis',emotionSource:''},{n:'Atender',hostStageId:'s2',e:0,emotionRecorded:false}],c:{'ac|0':[{i:'a',t:'Agendar',canvas:{version:1,kind:'customer-action',description:'',channelId:'',metricId:''},activity:{category:'activity',owner:'Ana',resourceRefs:[]}}],'em|0':[{i:'e',t:'Emoção do cliente',canvas:{version:1,kind:'emotion',description:'',channelId:'',metricId:''}}],'th|0':[{i:'t',t:'Vai demorar?',canvas:{version:1,kind:'thought',description:'',channelId:'',metricId:''}}]},iss:[{s:1,t:'d',x:'Espera'}],links:[{id:'l',a:'a',b:'e',type:'sequence'}]});
check('Service catalog includes customer actions, channels, emotions and existing operational components',()=>{
 for(const kind of ['customer-action','channel','emotion','thought','activity','touchpoint','artifact','decision','system','resource','metric','persona','need','pain','opportunity','text'])assert.ok(CANVAS_COMPONENTS[kind]);
 assert.equal(canvasAcceptsRow('channel','xcustom'),true);assert.equal(canvasAcceptsRow('activity','ev'),false);assert.equal(prepareCanvasInput(source(),{kind:'channel',stageId:'s1',title:'WhatsApp'}).row,'ch');
});
check('Subtle adjacent stage insertion preserves stage IDs, cells, issue placement and connections',()=>{
 const doc=source(),before=structuredClone(doc),next=insertCanvasStage(doc,{title:'Confirmar',localId:'new',afterStageId:'s1'});
 assert.deepEqual(next.steps.map(step=>step.hostStageId||step.hostLocalId),['s1','new','s2']);assert.equal(next.iss[0].s,2);assert.equal(next.c['ac|0'][0].i,'a');assert.deepEqual(next.links,doc.links);assert.deepEqual(doc,before);
 assert.throws(()=>insertCanvasStage(doc,{title:'Novo',localId:'new',afterStageId:'missing'}));
});
check('Moving actions between customer and operational blocks keeps visual identity and provenance intent',()=>{
 const doc=source(),back=moveCanvasCard(doc,'a',{stageId:'s2',row:'bk'});assert.equal(back.c['bk|1'][0].i,'a');assert.equal(back.c['bk|1'][0].canvas.kind,'activity');assert.equal(back.c['bk|1'][0].reclassifyActivity,true);
 const customer=moveCanvasCard(back,'a',{stageId:'s1',row:'ac'});assert.equal(customer.c['ac|0'][0].canvas.kind,'customer-action');assert.equal(customer.links[0].a,'a');
});
check('Moving an emotion carries the current context observation and rejects occupied destinations',()=>{
 const doc=source(),next=moveCanvasCard(doc,'e',{stageId:'s2',row:'em'});assert.equal(next.steps[1].e,-1);assert.equal(next.steps[1].note,'Espera');assert.equal(next.steps[0].emotionRecorded,false);
 const occupied=source();occupied.steps[1].emotionRecorded=true;assert.throws(()=>moveCanvasCard(occupied,'e',{stageId:'s2',row:'em'}));assert.equal(occupied.steps[0].note,'Espera');
});
check('Experience notes and emotion placements survive canonical JSON reload without a duplicate graph store',()=>{
 const doc=source(),stored=JSON.parse(JSON.stringify(matrixContentFromDocument(doc,['s1','s2']))),fresh={c:{}};restoreMatrixContent(fresh,stored,['s1','s2']);
 assert.equal(fresh.c['th|0'][0].i,'t');assert.equal(fresh.c['em|0'][0].canvas.kind,'emotion');assert.equal(fresh.c['ac|0'][0].canvas.kind,'customer-action');assert.equal(fresh.links.length,1);
});
console.log(`Service map flow: ${count}/${count} PASS`);

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as canvas from '../src/services/blueprint-canvas.js';
import * as content from '../src/services/journey-content.js';

const doc=()=>({id:'qa',steps:[{hostStageId:'s1',n:'Etapa 1',e:0,emotionRecorded:false},{hostStageId:'s2',n:'Etapa 2'}],c:{
 'ch|0':[{i:'channel',t:'WhatsApp',canvas:{kind:'channel',linkUrl:'https://example.org/canal'}}],
 'im|0':[{i:'pain',t:'Espera',canvas:{kind:'pain',description:'Original'},activity:{owner:'Ana',resourceRefs:['resource:r1']},tags:['preservar']}],
 'fl|0':[{i:'a',t:'Primeiro',canvas:{kind:'activity',width:250,height:160}},{i:'b',t:'Segundo',canvas:{kind:'activity'}}],
 'em|0':[{i:'emotion',t:'Emoção',canvas:{kind:'emotion'}}]
},links:[{id:'link',a:'a',b:'pain',type:'dependency'}]});
const sandbox={S:doc(),window:{BlueOceanBlueprintCanvas:canvas,BlueOceanJourneyContent:content},localStorage:{getItem:()=>null},structuredClone,setTimeout,clearTimeout,
 EM:['Frustrada','Ansiosa','Neutra','Animada','Satisfeita'],
 blueprintActivity:note=>content.normalizeMatrixActivity(note.activity),
 rowDefs:()=>['ch','im','fl','bk','ac','em'].map(id=>({id,n:id})),
 esc:value=>String(value??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;'),
 blueprintResourceName:ref=>ref,
};
sandbox.blueprintNote=id=>{for(const [key,notes]of Object.entries(sandbox.S.c)){const note=notes.find(value=>value.i===id);if(note)return {key,note}}};
vm.createContext(sandbox);
vm.runInContext(readFileSync('src/runtime/journey-cad-ui.js','utf8')+'\nthis.inspector={change:cadInspectorChange,render:cadInspector,state:cadState};',sandbox);
let count=0;const check=(name,run)=>{sandbox.S=doc();sandbox.inspector.state.drafts.clear();run();count++;console.log('PASS '+name)};
check('Content autosaves preserve card order, identity, dimensions, links and source document',()=>{
 const before=structuredClone(sandbox.S),next=sandbox.inspector.change('a',{title:'Renomeado',description:'Texto novo'}).state;
 assert.deepEqual(next.c['fl|0'].map(n=>n.i),['a','b']);
 assert.equal(next.c['fl|0'][0].t,'Renomeado');assert.equal(next.c['fl|0'][0].canvas.width,250);
 assert.equal(next.c['fl|0'][0].canvas.height,160);assert.deepEqual(next.links,before.links);assert.deepEqual(sandbox.S,before);
});
check('Hidden legacy properties survive contextual edits',()=>{
 const note=sandbox.inspector.change('pain',{description:'Atualizada'}).state.c['im|0'][0];
 assert.equal(note.activity.owner,'Ana');assert.deepEqual(note.activity.resourceRefs,['resource:r1']);assert.deepEqual(note.tags,['preservar']);
});
check('Clearing a description stays empty when reopening a legacy card',()=>{
 sandbox.S.c['im|0'][0].canonicalDescription='Descrição legada';
 sandbox.S=sandbox.inspector.change('pain',{description:''}).state;
 sandbox.inspector.state.selected='pain';const html=sandbox.inspector.render();
 assert.ok(html.includes('name="description" maxlength="1000"></textarea>'));
});
check('Delayed content patches rebase on current location instead of stale inspector drafts',()=>{
 sandbox.inspector.state.drafts.set('a',{row:'fl',stageKey:'s1'});
 sandbox.S=canvas.moveCanvasCard(sandbox.S,'a',{stageId:'s2',row:'bk'});
 const next=sandbox.inspector.change('a',{description:'Digitado antes de mover'}).state;
 assert.equal(next.c['bk|1'][0].canvas.description,'Digitado antes de mover');assert.equal(next.c['fl|0'].length,1);
});
check('Emotion changes update the canonical stage including an explicitly unknown score',()=>{
 const positive=sandbox.inspector.change('emotion',{emotionScore:'2'}).state;
 assert.equal(positive.steps[0].e,2);assert.equal(positive.steps[0].emotionRecorded,true);
 sandbox.S=positive;const unknown=sandbox.inspector.change('emotion',{emotionScore:'unknown'}).state;
 assert.equal(unknown.steps[0].e,0);assert.equal(unknown.steps[0].emotionRecorded,false);
});
check('Only semantic location changes request conversion',()=>{
 assert.equal(sandbox.inspector.change('a',{row:'bk'}).convert,false);
 assert.equal(sandbox.inspector.change('a',{row:'ac'}).convert,true);
});
check('Invalid titles, unsafe links and unavailable destinations are rejected before mutation',()=>{
 const before=structuredClone(sandbox.S);
 for(const patch of [{title:'   '},{linkUrl:'javascript:alert(1)'},{stageKey:'missing'}])assert.throws(()=>sandbox.inspector.change('channel',patch));
 assert.deepEqual(sandbox.S,before);
});
check('Emotion and pain inspectors expose no channel link or generic operational inputs',()=>{
 for(const id of ['emotion','pain']){
  sandbox.inspector.state.selected=id;const html=sandbox.inspector.render();
  for(const name of ['linkUrl','channelId','durationMinutes','owner'])assert.ok(!html.includes('name="'+name+'"'));
  assert.ok(html.includes('name="title"'));assert.ok(html.includes('name="description"'));
  if(id==='emotion')assert.ok(html.includes('name="emotionScore"'));
 }
 sandbox.inspector.state.selected='channel';assert.ok(sandbox.inspector.render().includes('name="linkUrl"'));
});
console.log(`Contextual inspector: ${count}/${count} PASS`);

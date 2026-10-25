import assert from 'node:assert/strict';
import { CANVAS_COMPONENTS, prepareCanvasInput, moveCanvasCard, buildCanvasLayout, exportCanvasSvg, canvasConnectionOffsets, canvasEdgeGeometry, canvasTitleLines, canvasBoundary } from '../src/services/blueprint-canvas.js';
import { matrixContentFromDocument, restoreMatrixContent, normalizeMatrixActivity } from '../src/services/journey-content.js';
import { normalizeSavedMatrixView, switchMatrixPerspective } from '../src/services/journey-views.js';
let count=0;const check=(name,run)=>{run();count++;console.log('PASS '+name)};
const rows=[{id:'ac',n:'Ações do cliente'},{id:'fl',n:'Linha de frente'},{id:'bk',n:'Bastidores'},{id:'sy',n:'Sistemas e apoio'}];
const doc=()=>({title:'Clínica < & "',steps:[{hostStageId:'s1',hostLocalId:'l1',n:'Agendar'},{hostStageId:'s2',n:'Atender'}],c:{'fl|0':[{i:'a',hostItemId:'a',t:'Confirmar',activity:normalizeMatrixActivity({owner:'Ana',waitMinutes:0}),canvas:{version:1,kind:'activity',description:'Detalhes',channelId:'whatsapp',metricId:'tempo'},tags:['tag'],unknown:{preserve:true}}],'bk|1':[{i:'b',t:'Prontuário',activity:normalizeMatrixActivity({team:'Clínica'})}],'sy|0':[{i:'c',t:'Agenda',activity:normalizeMatrixActivity({category:'resource'})}]},links:[{id:'dep',a:'b',b:'a',type:'dependency',label:'Liberar'}]});
check('Library validates service component kinds and canonical stage/layer boundaries without mutation',()=>{
 const source=doc(),before=structuredClone(source);assert.ok(Object.keys(CANVAS_COMPONENTS).length>=16);
 for(const [kind,component]of Object.entries(CANVAS_COMPONENTS))assert.equal(prepareCanvasInput(source,{kind,title:'Teste',stageId:'s1',row:component.row}).kind,kind);
 for(const input of [{kind:'bogus'},{kind:'system',row:'fl'},{kind:'activity',stageId:'missing'},{kind:'activity',title:''}])assert.throws(()=>prepareCanvasInput(source,{title:'Nome',stageId:'s1',...input}));assert.deepEqual(source,before);
});
check('Move/reorder preserves card identity, all metadata and connection endpoints',()=>{
 const source=doc(),before=structuredClone(source),next=moveCanvasCard(source,'a',{stageId:'s2',row:'bk',beforeId:'b'});
 assert.equal(next.c['bk|1'][0].i,'a');assert.deepEqual(next.c['bk|1'][0].unknown,{preserve:true});assert.equal(next.c['bk|1'][0].canvas.channelId,'whatsapp');assert.equal(next.links[0].b,'a');assert.deepEqual(source,before);assert.equal(next.c['bk|1'][0].reclassifyActivity,true);
 assert.throws(()=>moveCanvasCard(source,'a',{stageId:'s1',row:'sy',beforeId:'missing'}));assert.throws(()=>moveCanvasCard(source,'missing',{stageId:'s1',row:'fl'}));
 const support=moveCanvasCard(source,'a',{stageLocalId:'l1',row:'sy'});assert.equal(support.c['sy|0'][1].activity.category,'support-process');
});
check('Automatic layout never overlaps densely populated cells or loses original stage indices',()=>{
 const source=doc();source.c['fl|0']=Array.from({length:25},(_,i)=>({i:'n'+i,t:'Item '+i}));
 const layout=buildCanvasLayout(source,rows);for(const [i,a]of layout.nodes.entries())for(const b of layout.nodes.slice(i+1))assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
 assert.equal(buildCanvasLayout(source,rows,[1]).nodes[0].stageIndex,1);
});
check('Canvas metadata and explicit zero waits survive canonical JSON roundtrip',()=>{
 const source=doc(),stored=JSON.parse(JSON.stringify(matrixContentFromDocument(source,['s1','s2'],{notes:{}}))),fresh={c:{'fl|0':[{i:'a',hostItemId:'a',t:'Confirmar'}]}};
 restoreMatrixContent(fresh,stored,['s1','s2']);assert.deepEqual(fresh.c['fl|0'][0].canvas,source.c['fl|0'][0].canvas);assert.equal(fresh.c['fl|0'][0].activity.waitMinutes,0);
});
check('SVG export contains arrowheads, full handoff details and escaped user text',()=>{
 const source=doc();source.links.push({id:'h',a:'a',b:'b',type:'handoff',label:'Pacote <ok>',handoff:{fromTeam:'Recepção',toTeam:'Clínica',deliverable:'Prontuário',deadlineMinutes:10,acceptance:'Identificação & histórico'}});
 const svg=exportCanvasSvg(source,rows);assert.match(svg,/marker-end="url\(#arrow-handoff\)"/);assert.match(svg,/Identificação &amp; histórico/);assert.match(svg,/Pacote &lt;ok&gt;/);assert.doesNotMatch(svg,/<ok>/);assert.match(svg,/Clínica &lt; &amp; &quot;/);
});
check('Canvas/matrix choice is bounded and independently remembered per perspective',()=>{
 const input=normalizeSavedMatrixView({perspective:'blueprint',blueprintRenderer:'matrix'}),journey=switchMatrixPerspective(input,'journey',rows),back=switchMatrixPerspective(journey,'blueprint',rows);
 assert.equal(back.blueprintRenderer,'matrix');assert.equal(normalizeSavedMatrixView({blueprintRenderer:'bogus'}).blueprintRenderer,'canvas');assert.equal(normalizeSavedMatrixView({}).blueprintRenderer,'canvas');
});
check('Parallel connection types remain distinct and semantic captions follow visible layer order',()=>{
 const source=doc(),nodes=buildCanvasLayout(source,rows).nodes,a=nodes.find(node=>node.id==='a'),b=nodes.find(node=>node.id==='b');
 const offsets=canvasConnectionOffsets([{id:'one',a:'a',b:'b'},{id:'two',a:'b',b:'a'}]);
 assert.notEqual(canvasEdgeGeometry(a,b,offsets.get('one')).d,canvasEdgeGeometry(a,b,offsets.get('two')).d);
 assert.deepEqual(canvasTitleLines('Confirmação por mensagem',22),['Confirmação por','mensagem']);
 assert.ok(canvasBoundary(rows[2],2,rows).includes('visibilidade'));assert.equal(canvasBoundary(rows[2],0,[rows[2],rows[1]]),'');
});
console.log(`Blueprint canvas: ${count}/${count} PASS`);

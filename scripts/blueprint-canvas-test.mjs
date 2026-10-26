import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CANVAS_COMPONENTS, CANVAS_GRID, canvasSafeUrl, canvasDimension, canvasCardWidth, canvasRowHeight, canvasCardHeight, normalizeCanvasMetadata, prepareCanvasInput, moveCanvasCard, buildCanvasLayout, exportCanvasSvg, canvasConnectionOffsets, canvasEdgeGeometry, canvasTitleLines, canvasBoundary } from '../src/services/blueprint-canvas.js';
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
 restoreMatrixContent(fresh,stored,['s1','s2']);assert.deepEqual(fresh.c['fl|0'][0].canvas,normalizeCanvasMetadata(source.c['fl|0'][0].canvas));assert.equal(fresh.c['fl|0'][0].activity.waitMinutes,0);
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
check('Custom stage widths resize each column without stretching neighboring cards',()=>{
 const source=doc(),rowsWithEmotion=[{id:'em',n:'Emoções'},...rows],widths=[210,540];
 source.steps[0].e=-1;source.steps[0].emotionRecorded=true;
 source.steps[1].e=2;source.steps[1].emotionRecorded=true;
 source.c['em|0']=[{i:'old-emotion',t:'Ansiosa',type:'card',canvas:{kind:'emotion'}}];
 const layout=buildCanvasLayout(source,rowsWithEmotion,null,widths);
 assert.equal(layout.stages[0].width,210);
 assert.equal(layout.stages[1].x,CANVAS_GRID.label+layout.stages[0].width);
 assert.equal(layout.stages[1].width,540);
 assert.ok(layout.nodes.find(node=>node.id==='old-emotion'),'Old emotion card IDs remain in layout for saved links');
 for(const node of layout.nodes.filter(value=>value.row!=='em')){
  const stage=layout.stages[node.stageIndex];
  assert.ok(node.x>=stage.x&&node.x+node.width<=stage.x+stage.width,'Card must fit its resized column');
 }
 const svg=exportCanvasSvg(source,rowsWithEmotion,note=>note.t,widths);
 assert.match(svg,/stroke="#dc821c"/);
 assert.match(svg,/>Ansiosa<\/text>/);
 assert.match(svg,/>Satisfeita<\/text>/);
 assert.doesNotMatch(svg,/old-emotion/);
 assert.ok(svg.includes('width="'+layout.width+'"'));
});
check('Stage width boundaries are constrained and empty emotion cells do not become cards',()=>{
 const source=doc(),withEmotion=[{id:'em',n:'Emoções'}];
 const layout=buildCanvasLayout(source,withEmotion,null,[10,999]);
 assert.deepEqual(layout.stages.map(stage=>stage.width),[210,600]);
 assert.equal(layout.nodes.length,0);
 assert.ok(layout.rows[0].height>=128,'Emotion plot has enough height for labels');
});
check('New canvas opens with readable stage and card geometry',()=>{
 assert.equal(CANVAS_GRID.stage,392);
 assert.equal(CANVAS_GRID.cardWidth,328);
 assert.equal(CANVAS_GRID.cardHeight,112);
 const source=doc(),layout=buildCanvasLayout(source,rows);
 assert.deepEqual(layout.stages.map(stage=>stage.width),[392,392]);
 assert.equal(layout.nodes.find(node=>node.id==='a').width,328);
 assert.equal(layout.nodes.find(node=>node.id==='a').height,112);
});
check('Editor places lane management in sidebar and keeps 100% left-aligned opening',()=>{
 const editor=readFileSync(new URL('../src/runtime/journey-cad-ui.js',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/runtime/journey-cad.css',import.meta.url),'utf8');
 assert.doesNotThrow(()=>new Function(editor));
 assert.match(editor,/function cadSidebarTabs\(\)/);
 assert.match(editor,/function cadLanePanel\(\)/);
 assert.match(editor,/data-act="cad-lane-toggle"/);
 assert.match(editor,/data-act="cad-lane-order"/);
 assert.match(editor,/function cadInitialCamera\(\)/);
 assert.match(editor,/cadState\.camera=\{x:16,y:16,zoom:1\}/);
 assert.doesNotMatch(editor,/cadButton\('customize','Faixas'/);
 assert.match(editor,/const cadIconPaths=\{/);
 assert.match(css,/\.cad-professional-icon/);
 assert.match(css,/\.cad-library-tabs/);
});
check('Empty lanes are compact, populated lanes grow and manual height never clips cards',()=>{
 const source=doc(),lanes=[{id:'ev',n:'Evidências'},{id:'ch',n:'Canais'},{id:'fl',n:'Linha de frente'},{id:'em',n:'Emoções'}];
 source.c['ev|0']=[{i:'image',t:'Fachada',canvas:{kind:'artifact',imageUrl:'https://example.org/fachada.jpg',tone:'teal'}}];
 source.c['ch|0']=[{i:'channel',t:'WhatsApp',canvas:{kind:'channel'}}];
 const auto=buildCanvasLayout(source,lanes),manual=buildCanvasLayout(source,lanes,null,null,{ch:180,ev:90});
 assert.equal(auto.rows.find(r=>r.id==='ev').height,200);
 assert.equal(auto.nodes.find(n=>n.id==='image').height,164);
 assert.equal(auto.nodes.find(n=>n.id==='channel').height,88);
 assert.equal(auto.rows.find(r=>r.id==='em').height,132);
 assert.equal(manual.rows.find(r=>r.id==='ch').height,180);
 assert.equal(manual.rows.find(r=>r.id==='ev').height,200);
 assert.equal(canvasCardHeight({canvas:{kind:'text'}},'sd'),98);
 assert.equal(canvasRowHeight(source,{id:'fl'},[1]),90);
 for(const node of manual.nodes.filter(n=>n.row!=='em')){
  const row=manual.rows.find(r=>r.id===node.row);
  assert.ok(node.y>=row.y&&node.y+node.height<=row.y+row.height);
 }
});
check('Safe media metadata rejects unsafe schemes, preserves kind and icon, and renders evidence in SVG',()=>{
 const meta=normalizeCanvasMetadata({kind:'artifact',imageUrl:'https://example.org/capa.png',linkUrl:'https://example.org/documento.pdf',iconKey:'artifact',tone:'teal',evidenceType:'image'});
 assert.equal(meta.imageUrl,'https://example.org/capa.png');
 assert.equal(meta.linkUrl,'https://example.org/documento.pdf');
 assert.equal(meta.iconKey,'artifact');
 assert.equal(meta.tone,'teal');
 assert.equal(meta.evidenceType,'image');
 assert.equal(canvasSafeUrl('javascript:alert(1)'),'');
 assert.equal(canvasSafeUrl('data:image/svg+xml,<svg/>'),'');
 assert.equal(canvasSafeUrl('file:///etc/passwd'),'');
 const fallback=normalizeCanvasMetadata({kind:'artifact',iconKey:'nonexistent',tone:'javascript:bad',imageUrl:'javascript:bad'});
 assert.equal(fallback.iconKey,'artifact');
 assert.equal(fallback.tone,'default');
 assert.equal(fallback.imageUrl,'');
 const source=doc();source.c['ev|0']=[{i:'screen',t:'Tela do app',canvas:meta}];
 const svg=exportCanvasSvg(source,[{id:'ev',n:'Evidências'}]);
 assert.match(svg,/<image /);
 assert.match(svg,/https:\/\/example\.org\/capa\.png/);
 assert.match(svg,/fill="#f0fdf9"/);
});
check('Every card and lane exposes controls without splitting canonical documents',()=>{
 const editor=readFileSync(new URL('../src/runtime/journey-cad-ui.js',import.meta.url),'utf8');
 assert.match(editor,/function cadLaneInspector\(\)/);
 assert.match(editor,/function cadSelect\(id,point=\{\},inline=false\)/);
 assert.match(editor,/function cadRowHeights\(\)/);
 assert.match(editor,/data-act="cad-lane-resize"/);
 assert.match(editor,/cad-lane-height-apply/);
 assert.match(editor,/cad-lane-auto/);
 assert.match(editor,/cad-evidence-fields/);
 assert.match(editor,/cad-duplicate/);
 assert.match(editor,/cad-photo-/);
 assert.match(editor,/function cadEmotionSvg\(row,layout\)/);
});
check('Cards resize independently and their new geometry survives canvas serialization',()=>{
 const source=doc();
 source.c['fl|0']=[{i:'card1',t:'Primeiro cartão',type:'card',canvas:normalizeCanvasMetadata({kind:'activity',width:220,height:176})},{i:'card2',t:'Segundo cartão',type:'card',canvas:normalizeCanvasMetadata({kind:'activity',width:185,height:108})}];
 const layout=buildCanvasLayout(source,rows);
 const a=layout.nodes.find(n=>n.id==='card1'),b=layout.nodes.find(n=>n.id==='card2');
 assert.deepEqual([a.width,a.height,b.width,b.height],[220,176,185,108]);
 assert.ok(b.y>=a.y+a.height);
 assert.ok(layout.rows.find(row=>row.id==='fl').height>=b.y+b.height-layout.rows.find(row=>row.id==='fl').y);
 const saved=matrixContentFromDocument(source,['s1','s2'],{notes:{}}),restored={c:{'fl|0':[]},links:[]};
 restoreMatrixContent(restored,saved,['s1','s2']);
 assert.deepEqual(restored.c['fl|0'].map(n=>[n.canvas.width,n.canvas.height]),[[220,176],[185,108]]);
 assert.equal(canvasCardWidth({canvas:{kind:'activity',width:580}},210),182);
 assert.equal(canvasCardHeight({canvas:{kind:'activity',height:76}},'fl'),80);
 assert.equal(canvasDimension('nope',150,600),null);
});
check('Resize controls remain hidden until hover or keyboard focus',()=>{
 const css=readFileSync(new URL('../src/runtime/journey-cad.css',import.meta.url),'utf8');
 const editor=readFileSync(new URL('../src/runtime/journey-cad-ui.js',import.meta.url),'utf8');
 assert.match(css,/#cad-svg \.cad-stage-resize,\s*#cad-svg \.cad-lane-resize,\s*#cad-svg \.cad-node-resize\s*\{\s*opacity:0/);
 assert.match(css,/\.cad-node-wrap:hover > \.cad-node-resize/);
 assert.match(css,/\.cad-lane-select:hover \+ \.cad-lane-resize/);
 assert.match(editor,/class="cad-node-resize"/);
 assert.match(editor,/cardResizePreview/);
 assert.match(editor,/pointer:event.pointerId,id,startX:event.clientX,startY:event.clientY/);
 assert.match(editor,/width:preview.width,height:preview.height/);
 assert.match(editor,/ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home'/);
 assert.doesNotThrow(()=>new Function(editor));
});
console.log(`Blueprint canvas: ${count}/${count} PASS`);

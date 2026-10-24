import assert from 'node:assert/strict';
import { normalizeSavedMatrixView, switchMatrixPerspective, matrixBlueprintBoundary, manageJourneySavedView } from '../src/services/journey-views.js';
import { matrixCardHasContent, normalizeMatrixRow, matrixContentFromDocument } from '../src/services/journey-content.js';
let count=0;
const check=(name,run)=>{run();count++;console.log('PASS '+name)};
const definitions=['sd','ev','ac','em','fl','bk','sy','im'].map(id=>({id})).concat({id:'xnotes',custom:true});
const view=()=>normalizeSavedMatrixView({perspective:'journey',preset:'custom',rowOrder:['xnotes','ac','em','sd'],hiddenRows:['ev','fl','bk','sy','im'],cardFilters:{query:'espera'},stageWidths:[410],rowHeights:{ac:150},collapsedRows:['sd'],zoom:110});
check('Perspective switching restores independent order, visibility, filters and geometry after JSON reload',()=>{
  const original=view(),before=structuredClone(original);
  let next=switchMatrixPerspective(original,'blueprint',definitions);
  assert.equal(next.preset,'operational');assert.ok(!next.hiddenRows.includes('fl'));assert.ok(!next.hiddenRows.includes('xnotes'));assert.equal(next.cardFilters.query,'');
  next.hiddenRows.push('fl');next.rowOrder.reverse();next.cardFilters.query='equipe';next.zoom=90;
  const operation=structuredClone(next);
  next=switchMatrixPerspective(JSON.parse(JSON.stringify(next)),'journey',definitions);
  for(const key of ['hiddenRows','rowOrder','cardFilters','stageWidths','rowHeights','collapsedRows','zoom'])assert.deepEqual(next[key],original[key]);
  const returned=switchMatrixPerspective(next,'blueprint',definitions);
  for(const key of ['hiddenRows','rowOrder','cardFilters','zoom'])assert.deepEqual(returned[key],operation[key]);
  assert.deepEqual(original,before);
});
check('Selecting the active perspective is idempotent and preserves customization',()=>{
  const original=view();assert.deepEqual(switchMatrixPerspective(original,'journey',definitions),original);
});
check('Perspective memory is bounded and excludes cards, observations and recursive snapshots',()=>{
  const malicious={...view(),c:{private:'content'},perspectiveViews:{journey:{...view(),steps:['private'],perspectiveViews:{journey:view()},zoom:999},foreign:view()}};
  const normalized=normalizeSavedMatrixView(malicious);
  assert.equal(normalized.c,undefined);assert.equal(normalized.perspectiveViews.foreign,undefined);
  assert.equal(normalized.perspectiveViews.journey.steps,undefined);assert.equal(normalized.perspectiveViews.journey.perspectiveViews,undefined);assert.equal(normalized.perspectiveViews.journey.zoom,150);
});
check('Blueprint boundaries require the proper visible semantic layers and order',()=>{
  const standard=['sd','ev','ac','em','fl','bk','sy','im'];
  for(const id of ['fl','bk','sy'])assert.equal(matrixBlueprintBoundary(id,standard).valid,true);
  assert.equal(matrixBlueprintBoundary('bk',standard.filter(id=>id!=='fl')).valid,false);
  assert.equal(matrixBlueprintBoundary('bk',standard.filter(id=>id!=='fl')).hidden,true);
  assert.equal(matrixBlueprintBoundary('sy',standard.filter(id=>id!=='bk')).valid,false);
  assert.equal(matrixBlueprintBoundary('bk',['ac','bk','fl','sy']).valid,false);
  assert.equal(matrixBlueprintBoundary('sy',['ac','bk','fl','sy']).valid,false);
  assert.equal(matrixBlueprintBoundary('ac',standard),null);
});
check('Saved configurations reconcile removed and added lanes in both perspective memories without rewriting content',()=>{
  const content={rows:{xnotes:{n:'Observações'}},cells:{one:{ac:[{id:'stable',text:'Pedir ajuda'}]}}};
  const graph={service:{id:'service'},journeys:{j:{matrixContent:content}},entities:{persona:{}}};
  const saved=switchMatrixPerspective(view(),'blueprint',definitions);
  manageJourneySavedView(graph,'j','create',{name:'Equipe',view:saved});
  delete content.rows.xnotes;content.rows.xnew={n:'Nova'};
  const before=structuredClone(content),id=graph.journeys.j.savedMatrixViews[0].id;
  manageJourneySavedView(graph,'j','apply',{id});
  for(const config of [graph.journeys.j.matrixView,...Object.values(graph.journeys.j.matrixView.perspectiveViews)]){
    assert.ok(!config.rowOrder.includes('xnotes'));assert.ok(config.hiddenRows.includes('xnew'));
  }
  assert.deepEqual(content,before);
});
check('Empty text drafts are distinct from content, including reference cards with optional captions and zero scales',()=>{
  for(const note of [{t:''},{t:'  ',type:'text'},{text:'',type:'card'}])assert.equal(matrixCardHasContent(note),false);
  for(const note of [{t:'Ação'},{text:'Ação'},{type:'channel',t:'',referenceId:'channel'},{type:'scale',scale:{value:0}},{type:'emoji',icon:'🙂'}])assert.equal(matrixCardHasContent(note),true);
});
check('Row appearance changes retain stable semantic IDs, canonical references and original card types',()=>{
  const doc={rowSettings:{bk:{n:'Preparação',h:'Equipe de apoio',tone:'violet',defaultType:'emoji'}},c:{'bk|0':[{i:'activity',type:'card',t:'Preparar pedido',referenceId:'source'}]}};
  const before=structuredClone(doc),stored=matrixContentFromDocument(doc,['stage']);
  assert.deepEqual(doc,before);assert.equal(stored.rows.bk.tone,'violet');assert.equal(stored.cells.stage.bk[0].id,'activity');assert.equal(stored.cells.stage.bk[0].type,'card');
  assert.equal(normalizeMatrixRow({tone:'untrusted'}).tone,'neutral');
});
console.log(`Journey editor UX: ${count}/${count} PASS`);

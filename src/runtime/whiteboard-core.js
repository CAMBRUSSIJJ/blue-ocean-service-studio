import { BLUEPRINT_FRAME_LAYERS, BLUEPRINT_BOUNDARIES, BLUEPRINT_MARKETING_DIMENSIONS, BLUEPRINT_QUALITY_DIMENSIONS, buildBlueprintDeliveryReport, blueprintServicePromise, validateActivityNumbers, isCustomerServiceEvidence } from './blueprint-methodology.js';
import { runtime } from './runtime-registry.js';
import { renderBlueprintReference } from './blueprint-reference-view.js';
import { buildBlueprintGuidedReading, BLUEPRINT_EMOTION_LABELS } from '../services/blueprint-guided-reading.js';
import { migrateGraphV3, validateGraphDeep, repairGraphIntegrity, deletePlan, applyDeletePlan, isSafeImageDataUrl } from './data-integrity.js';
import { createRecoveryStore, createSessionManager, hashString, safeParse } from './persistence-kernel.js';
import { blueprintLanes, VIEW_DEFS, journeyLanes, JOURNEY_LANE_PRESETS, tone, toneBg } from './view-config.js';
import { JOURNEY_HOME_TEMPLATES } from './journey-templates.js';
import { blueprintSelection, createBlueprintFromSelection } from './blueprint-from-selection.js';
import { GUIDANCE_TOPICS, guidanceTopic, normalizeAssistanceMode, topicForBuilderStep, topicForObjectKind, buildGuidanceSnapshot } from './guidance-engine.js';
(() => {
  'use strict';
  const GRAPH_KEY = 'realtalent-service-studio-v3-service-graph';
  const LEGACY_GRAPH_KEY_V2 = 'realtalent-service-studio-v2-service-graph';
  const META_KEY = 'realtalent-service-studio-v186-whiteboard-meta';
  const LEGACY_META_KEY_V185 = 'realtalent-service-studio-v185-whiteboard-meta';
  const LEGACY_META_KEY_V184 = 'realtalent-service-studio-v184-whiteboard-meta';
  const LEGACY_META_KEY_V183 = 'realtalent-service-studio-v183-whiteboard-meta';
  const LEGACY_META_KEY_V182 = 'realtalent-service-studio-v182-whiteboard-meta';
  const LEGACY_META_KEY_V181 = 'realtalent-service-studio-v181-whiteboard-meta';
  const LEGACY_META_KEY_V180 = 'realtalent-service-studio-v180-whiteboard-meta';
  const LEGACY_META_KEY_V170 = 'realtalent-service-studio-v170-whiteboard-meta';
  const LEGACY_META_KEY_V160 = 'realtalent-service-studio-v160-whiteboard-meta';
  const LEGACY_META_KEY_V159 = 'realtalent-service-studio-v159-whiteboard-meta';
  const LEGACY_META_KEY_V158 = 'realtalent-service-studio-v158-whiteboard-meta';
  const LEGACY_META_KEY_V157 = 'realtalent-service-studio-v157-whiteboard-meta';
  const LEGACY_META_KEY_V156 = 'realtalent-service-studio-v156-whiteboard-meta';
  const LEGACY_META_KEY_V1551 = 'realtalent-service-studio-v1551-whiteboard-meta';
  const LEGACY_META_KEY_V155 = 'realtalent-service-studio-v155-whiteboard-meta';
  const LEGACY_META_KEY_V154 = 'realtalent-service-studio-v154-whiteboard-meta';
  const LEGACY_META_KEY_00 = 'realtalent-service-studio-v153-whiteboard-meta';
  const RECOVERY_DB = 'realtalent-service-studio-v155-recovery';
  const RECOVERY_STORE = 'states';
  const SESSION_KEY = 'realtalent-service-studio-v186-session';
  const QUARANTINE_KEY = 'realtalent-service-studio-v1120-recovery-quarantine';
  const APP_VERSION = '__APP_VERSION__';
  const DESIGN_SYSTEM_VERSION = '1.0';
  const JOURNEY_STUDIO_VERSION = '1.0';
  const BLUEPRINT_STUDIO_VERSION = '1.0';
  const BLUEPRINT_GRID_UX_VERSION = '1.0';
  const BLUEPRINT_LEARNING_VERSION = '1.0';
  const BLUEPRINT_HEALTH_VERSION = '1.0';
  const WHITEBOARD_CORE_VERSION = '1.0';
  const WHITEBOARD_STUDIO_VERSION = '2.0';
  const WHITEBOARD_UX_VERSION = '1.16.2';
  const CORE_AUDIT_VERSION = 1;
  const PERSISTENCE_SCHEMA = 1;
  const LEGACY_META_KEY_000 = 'realtalent-service-studio-v152-whiteboard-meta';
  const TEMPLATE_KEY = 'realtalent-service-studio-v151-template-library';
  const LEGACY_META_KEY_0 = 'realtalent-service-studio-v151-whiteboard-meta';
  const LEGACY_META_KEY_1 = 'realtalent-service-studio-v150-whiteboard-meta';
  const LEGACY_META_KEY = 'realtalent-service-studio-v1410-whiteboard-meta';
  const LEGACY_META_KEY_2 = 'realtalent-service-studio-v149-whiteboard-meta';
  const LEGACY_META_KEY_3 = 'realtalent-service-studio-v148-whiteboard-meta';
  const LEGACY_META_KEY_4 = 'realtalent-service-studio-v147-whiteboard-meta';
  const LEGACY_META_KEY_5 = 'realtalent-service-studio-v146-whiteboard-meta';
  const LEGACY_META_KEY_6 = 'realtalent-service-studio-v145-whiteboard-meta';
  const LEGACY_META_KEY_7 = 'realtalent-service-studio-v144-whiteboard-meta';
  const LEGACY_META_KEY_8 = 'realtalent-service-studio-v143-whiteboard-meta';
  const MIN_BOARD_W = 5200, MIN_BOARD_H = 3200, GRID = 24;
  const ZOOM_MIN = 0.10, ZOOM_MAX = 4;
  const CONFLICT_DRAFT_KEY = 'blue-ocean-whiteboard-conflict-draft-v1';
  const laneNames = blueprintLanes.map(x=>x.label);
  const legacyLaneNames = [...laneNames,'Processos / sistemas'];
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const uid = (p='id') => `${p}-${(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2))}`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const gridSnap = (v,on)=>on?Math.round(v/GRID)*GRID:v;

  let graph=null, meta=null, boardId=null, overlay=null;
  let selected=[], selectedEdge=null, zoom=.88, pan={x:88,y:78}, tool='select';
  let showLibrary=false, showLayers=false, showOutline=false, showInspector=false, showBoardMenu=false, showBlueprintDocument=false, blueprintDocumentTab='structure', libraryQuery='', outlineQuery='';
  let inspectorMode='selection', inspectorTab='essential', connectFrom=null, drag=null, clipboard=[], guides={x:null,y:null}, quickCreate=null;
  let spaceDown=false, wheelNavTimer=null, navHistory=[], navIndex=-1;
  let libraryWide=false, libraryCategory='Serviço', showCanvasPrefs=false, saveState='saved', saveTimer=null;
  let editHistory=[], editIndex=-1, historyReady=false, restoringEdit=false, pendingEditLabel='Editar quadro';
  let showEditHistory=false, showCommandPalette=false, commandQuery='', contextMenu=null, clipboardPayload=null, pasteSerial=0;
  let lastPointer={x:window.innerWidth/2,y:window.innerHeight/2};
  let persistence={durableState:'pending',lastDurableAt:null,lastCheckpointAt:null,error:null,recovered:false,recoveryReason:'',uncleanSession:false,revision:0};
  let persistenceTimer=null, lastMirrorChecksum='', recoveryNoticeShown=false, bootstrapPrepared=false;
  let liveTextEditing=false;
  let frameRenderPending=false;
  const perf={cullThreshold:220,minimapLimit:520,lastRenderMs:0,avgRenderMs:0,renderSamples:0,totalItems:0,renderedItems:0,runtimeErrors:0,lastError:''};
  const recoveryStore=createRecoveryStore({dbName:RECOVERY_DB,storeName:RECOVERY_STORE});
  const sessionManager=createSessionManager({storageKey:SESSION_KEY,appVersion:APP_VERSION,makeId:uid,getRevision:()=>persistence.revision||0});
  function scheduleFrameRender(){if(frameRenderPending||!overlay)return;frameRenderPending=true;requestAnimationFrame(()=>{frameRenderPending=false;renderAll()})}
  function boardWorldSize(){const items=Object.values(board()?.items||{});let maxX=MIN_BOARD_W,maxY=MIN_BOARD_H;for(const it of items){maxX=Math.max(maxX,Math.ceil((Number(it.x)||0)+(Number(it.width)||0)+720));maxY=Math.max(maxY,Math.ceil((Number(it.y)||0)+(Number(it.height)||0)+560))}return{width:gridSnap(maxX,true),height:gridSnap(maxY,true)}}
  function worldViewportRect(margin=260){const v=overlay&&$('.rt144-view',overlay),world=boardWorldSize();if(!v)return{minX:0,minY:0,maxX:world.width,maxY:world.height};const r=v.getBoundingClientRect(),z=Math.max(.01,zoom);return{minX:(-pan.x)/z-margin,minY:(-pan.y)/z-margin,maxX:(r.width-pan.x)/z+margin,maxY:(r.height-pan.y)/z+margin}}
  function rectIntersectsItem(rect,it){return !!it&&it.x+it.width>=rect.minX&&it.x<=rect.maxX&&it.y+it.height>=rect.minY&&it.y<=rect.maxY}
  function renderableItems(){const all=visibleItems();perf.totalItems=all.length;if(all.length<=perf.cullThreshold){perf.renderedItems=all.length;return all}const rect=worldViewportRect(360),ids=new Set(selected);for(const it of all)if(rectIntersectsItem(rect,it))ids.add(it.id);for(const id of [...ids])ancestorFrames(id).forEach(fid=>ids.add(fid));const out=all.filter(it=>ids.has(it.id));perf.renderedItems=out.length;return out}
  function edgeMayRender(ed){const count=Object.keys(board()?.items||{}).length;if(count<=perf.cullThreshold||selectedEdge===ed.id)return true;const a=board()?.items?.[ed.fromId],b=board()?.items?.[ed.toId];if(!a||!b)return false;const r=worldViewportRect(420);if(rectIntersectsItem(r,a)||rectIntersectsItem(r,b))return true;const ac=itemCenter(a),bc=itemCenter(b),box={minX:Math.min(ac.x,bc.x),minY:Math.min(ac.y,bc.y),maxX:Math.max(ac.x,bc.x),maxY:Math.max(ac.y,bc.y)};return !(box.maxX<r.minX||box.minX>r.maxX||box.maxY<r.minY||box.minY>r.maxY)}
  function performanceMode(){return perf.totalItems>perf.cullThreshold}

  function defaultGraph(){
    const now=new Date().toISOString();
    return {schemaVersion:3,entities:{},research:{sources:{},collections:{},createdAt:now,updatedAt:now},integrity:{schemaVersion:3,migratedAt:now},views:{whiteboards:{}},service:{id:'workspace-uninitialized',name:'',description:'',journeyIds:[],createdAt:now,updatedAt:now},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''}};
  }
  function isWorkspaceEmptyGraph(g){return !String(g?.service?.name||'').trim()||g?.service?.id==='workspace-uninitialized'}
  function isUntouchedLegacyStarter(g){
    if(!g?.service||g.service.id!=='service-main'||g.service.name!=='Serviço principal')return false;
    const journeys=Object.keys(g.journeys||{}),stages=Object.keys(g.stages||{}).sort();
    if(journeys.length!==1||journeys[0]!=='journey-main')return false;
    if(stages.join('|')!==['stage-contact','stage-discovery','stage-payment'].sort().join('|'))return false;
    const extras=['persona','evidence','metric','process','system','benefit','initiative','comment','decision','incident'];
    if(extras.some(k=>Object.keys(g.entities?.[k]||{}).length))return false;
    if(Object.keys(g.research?.sources||{}).length||Object.keys(g.research?.collections||{}).length)return false;
    const boards=Object.values(g.views?.whiteboards||{});
    return boards.length<=1&&boards.every(b=>!Object.keys(b.items||{}).length&&!Object.keys(b.edges||{}).length);
  }
  function stateValid(g,m,{allowLegacy=true}={}){
    if(!g||typeof g!=='object'||!g.service||!g.views||typeof g.views.whiteboards!=='object')return false;
    if(!m||typeof m!=='object')return false;
    if(![2,3].includes(Number(g.schemaVersion||0)))return false;
    const gr=Number(g.persistenceRevision||0),mr=Number(m.persistenceRevision||0);
    if(gr&&mr&&gr!==mr)return false;if(!allowLegacy&&(gr<1||mr<1))return false;
    try{return validateGraphDeep(repairGraphIntegrity(migrateGraphV3(g)).graph).ok}catch{return false}
  }
  const idbPut=record=>recoveryStore.put(record);
  const idbGet=id=>recoveryStore.get(id);
  const idbAll=()=>recoveryStore.all();
  const idbDelete=id=>recoveryStore.remove(id);
  function rawGraphFromStorage(){return localStorage.getItem(GRAPH_KEY)||localStorage.getItem(LEGACY_GRAPH_KEY_V2)}
  function rawMetaFromStorage(){return localStorage.getItem(META_KEY)||localStorage.getItem(LEGACY_META_KEY_V185)||localStorage.getItem(LEGACY_META_KEY_V184)||localStorage.getItem(LEGACY_META_KEY_V183)||localStorage.getItem(LEGACY_META_KEY_V182)||localStorage.getItem(LEGACY_META_KEY_V181)||localStorage.getItem(LEGACY_META_KEY_V180)||localStorage.getItem(LEGACY_META_KEY_V170)||localStorage.getItem(LEGACY_META_KEY_V160)||localStorage.getItem(LEGACY_META_KEY_V159)||localStorage.getItem(LEGACY_META_KEY_V158)||localStorage.getItem(LEGACY_META_KEY_V157)||localStorage.getItem(LEGACY_META_KEY_V156)||localStorage.getItem(LEGACY_META_KEY_V1551)||localStorage.getItem(LEGACY_META_KEY_V155)||localStorage.getItem(LEGACY_META_KEY_V154)||localStorage.getItem(LEGACY_META_KEY_00)||localStorage.getItem(LEGACY_META_KEY_000)||localStorage.getItem(LEGACY_META_KEY_0)||localStorage.getItem(LEGACY_META_KEY_1)||localStorage.getItem(LEGACY_META_KEY)||localStorage.getItem(LEGACY_META_KEY_2)||localStorage.getItem(LEGACY_META_KEY_3)||localStorage.getItem(LEGACY_META_KEY_4)||localStorage.getItem(LEGACY_META_KEY_5)||localStorage.getItem(LEGACY_META_KEY_6)||localStorage.getItem(LEGACY_META_KEY_7)||localStorage.getItem(LEGACY_META_KEY_8)}
  function applyRawState(graphRaw,metaRaw){localStorage.setItem(GRAPH_KEY,graphRaw);localStorage.setItem(META_KEY,metaRaw)}
  function quarantineInvalidState(reason='Estado local inválido'){
    try{
      const graphRaw=rawGraphFromStorage(),metaRaw=rawMetaFromStorage();
      if(!graphRaw&&!metaRaw)return false;
      const payload={savedAt:Date.now(),reason,graphRaw:graphRaw||null,metaRaw:metaRaw||null};
      localStorage.setItem(QUARANTINE_KEY,JSON.stringify(payload));
      return true;
    }catch{return false}
  }
  async function newestValidRecovery(){
    try{const latest=await idbGet('latest-good');if(latest&&stateValid(latest.graph,latest.meta,{allowLegacy:false}))return latest;const all=(await idbAll()).filter(r=>r.kind==='snapshot'&&stateValid(r.graph,r.meta,{allowLegacy:false})).sort((a,b)=>b.savedAt-a.savedAt);return all[0]||null}catch{return null}
  }
  async function recoverBeforeLoad(){
    const graphRaw=rawGraphFromStorage(),metaRaw=rawMetaFromStorage(),g=safeParse(graphRaw),m=safeParse(metaRaw),currentOk=stateValid(g,m);
    let durable=null;try{durable=await idbGet('latest-good')}catch{}
    const durableOk=!!durable&&stateValid(durable.graph,durable.meta,{allowLegacy:false});
    const localRevision=Number(g?.persistenceRevision||0),durableRevision=Number(durable?.revision||durable?.graph?.persistenceRevision||0);
    if(durableOk&&(!currentOk||durableRevision>=localRevision)){
      try{applyRawState(JSON.stringify(durable.graph),JSON.stringify(durable.meta));persistence.recovered=!currentOk||durableRevision>localRevision;persistence.recoveryReason=!currentOk?'O cache local estava incompleto. O projeto íntegro do IndexedDB foi restaurado.':durableRevision>localRevision?'Uma versão durável mais recente foi restaurada do IndexedDB.':'';persistence.lastDurableAt=durable.savedAt||null;return}catch(e){persistence.error=String(e?.message||e)}
    }
    if(currentOk)return;
    const recovered=await newestValidRecovery();if(recovered){try{quarantineInvalidState('Substituído por checkpoint íntegro');applyRawState(JSON.stringify(recovered.graph),JSON.stringify(recovered.meta));persistence.recovered=true;persistence.recoveryReason='O estado local estava incompleto ou corrompido. A última cópia íntegra foi restaurada automaticamente.';persistence.lastDurableAt=recovered.savedAt||null;return}catch(e){persistence.error=String(e?.message||e)}}
    if(graphRaw||metaRaw){quarantineInvalidState('Nenhuma cópia íntegra disponível; estado original preservado para diagnóstico.');persistence.error='O estado local estava inválido e foi preservado em quarentena antes da abertura segura.'}
  }
  async function prepareBeforeApp(){
    if(bootstrapPrepared&&graph&&meta)return{graph:clone(graph),recovered:persistence.recovered,reason:persistence.recoveryReason};
    await recoverBeforeLoad();
    graph=null;meta=null;boardId=null;
    load();
    bootstrapPrepared=true;
    return{graph:clone(graph),recovered:persistence.recovered,reason:persistence.recoveryReason};
  }
  function runPersistenceMigrations(){
    meta.persistenceSchemaVersion=Number(meta.persistenceSchemaVersion||0);meta.migrationLog ||= [];
    const migrations=[{to:1,id:'v155-persistence-v1',run:()=>{meta.reliability ||= {snapshotLimit:12,autoCheckpointMinutes:3};meta.persistenceSchemaVersion=1}}];
    migrations.forEach(m=>{if(meta.persistenceSchemaVersion<m.to){m.run();meta.migrationLog.push({id:m.id,at:new Date().toISOString(),appVersion:APP_VERSION})}});meta.appDataVersion=APP_VERSION
  }
  function beginSession(){const result=sessionManager.begin(meta);if(result.unclean)persistence.uncleanSession=true;if(result.degraded){persistence.error='O navegador bloqueou o heartbeat da sessão. O autosave principal continua ativo.';window.dispatchEvent(new CustomEvent('rt-data-notice',{detail:persistence.error}))}}
  function endSession(){sessionManager.end(meta)}
  function stateRecord(kind='latest',label='Autosave'){
    const g=clone(graph),m=clone(meta),graphRaw=JSON.stringify(g),metaRaw=JSON.stringify(m),checksum=hashString(graphRaw+'|'+metaRaw);return{id:kind==='latest'?'latest-good':`snapshot-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,kind:kind==='latest'?'latest':'snapshot',label,appVersion:APP_VERSION,persistenceSchema:PERSISTENCE_SCHEMA,savedAt:Date.now(),revision:Number(g.persistenceRevision||0),checksum,sizeBytes:graphRaw.length+metaRaw.length,boardId,graph:g,meta:m}
  }
  async function pruneSnapshots(){try{const all=(await idbAll()).filter(r=>r.kind==='snapshot').sort((a,b)=>b.savedAt-a.savedAt),limit=Number(meta?.reliability?.snapshotLimit||12);for(const r of all.slice(limit))await idbDelete(r.id)}catch{}}
  async function durableMirror(label='Autosave',{checkpoint=false}={}){
    try{const latest=stateRecord('latest',label);if(latest.checksum!==lastMirrorChecksum||checkpoint){await idbPut(latest);lastMirrorChecksum=latest.checksum;persistence.lastDurableAt=latest.savedAt;persistence.durableState='protected';persistence.error=null}
      const interval=Number(meta?.reliability?.autoCheckpointMinutes||3)*60000,needsAuto=!persistence.lastCheckpointAt||Date.now()-persistence.lastCheckpointAt>=interval;
      if(checkpoint||needsAuto){const snap=stateRecord('snapshot',checkpoint?label:'Checkpoint automático');await idbPut(snap);persistence.lastCheckpointAt=snap.savedAt;await pruneSnapshots()}
    }catch(e){persistence.durableState='local';persistence.error=String(e?.message||e)}updateSaveIndicator()
  }
  function scheduleDurableMirror(label='Autosave',checkpoint=false){persistence.durableState='pending';clearTimeout(persistenceTimer);persistenceTimer=setTimeout(()=>durableMirror(label,{checkpoint}),450);updateSaveIndicator()}
  async function createCheckpoint(label='Checkpoint manual'){await durableMirror(label,{checkpoint:true});if(overlay)toast('Checkpoint protegido criado.')}
  async function recoverySnapshots(){try{return(await idbAll()).filter(r=>r.kind==='snapshot').sort((a,b)=>b.savedAt-a.savedAt)}catch{return[]}}
  async function restoreRecoveryRecord(rec){if(!rec||!stateValid(rec.graph,rec.meta,{allowLegacy:false}))return false;if(!await confirmDialog('Restaurar checkpoint',`Restaurar “${rec.label||'checkpoint'}”? O estado atual será preservado em um checkpoint antes da restauração.`,'Restaurar',true))return false;await createCheckpoint('Antes da restauração');graph=clone(rec.graph);meta=clone(rec.meta);boardId=graph.views.whiteboards[rec.boardId]?rec.boardId:(meta.activeBoardId&&graph.views.whiteboards[meta.activeBoardId]?meta.activeBoardId:Object.keys(graph.views.whiteboards)[0]);meta.activeBoardId=boardId;normalizeContainers();normalizeLayers();normalizeEdges();normalizeVisualItems();normalizeInstances();runPersistenceMigrations();save(false,{checkpoint:true,label:'Restauração de checkpoint'});resetEditHistory('Checkpoint restaurado');resetNavigationHistory('Checkpoint restaurado');renderAll();toast('Checkpoint restaurado.');return true}
  async function validatePersistence(){const g=safeParse(rawGraphFromStorage()),m=safeParse(localStorage.getItem(META_KEY));const localOk=stateValid(g,m,{allowLegacy:false});let durable=null;try{durable=await idbGet('latest-good')}catch{}const durableOk=!!durable&&stateValid(durable.graph,durable.meta,{allowLegacy:false});const revision=Number(g?.persistenceRevision||0),durableRevision=Number(durable?.revision||0);return{localOk,durableOk,revision,durableRevision,preferred:durableOk&&durableRevision>=revision?'indexeddb':localOk?'local-cache':'none'}}

  function load(){
    let legacyReset=false;
    try { graph=JSON.parse(rawGraphFromStorage()||'null')||defaultGraph(); if(isUntouchedLegacyStarter(graph)){graph=defaultGraph();legacyReset=true} graph=repairGraphIntegrity(migrateGraphV3(graph)).graph; } catch { graph=defaultGraph(); }
    try { meta=JSON.parse(localStorage.getItem(META_KEY)||localStorage.getItem(LEGACY_META_KEY_V181)||localStorage.getItem(LEGACY_META_KEY_V180)||localStorage.getItem(LEGACY_META_KEY_V170)||localStorage.getItem(LEGACY_META_KEY_V160)||localStorage.getItem(LEGACY_META_KEY_V159)||localStorage.getItem(LEGACY_META_KEY_V158)||localStorage.getItem(LEGACY_META_KEY_V157)||localStorage.getItem(LEGACY_META_KEY_V156)||localStorage.getItem(LEGACY_META_KEY_V1551)||localStorage.getItem(LEGACY_META_KEY_V155)||localStorage.getItem(LEGACY_META_KEY_V154)||localStorage.getItem(LEGACY_META_KEY_00)||localStorage.getItem(LEGACY_META_KEY_000)||localStorage.getItem(LEGACY_META_KEY_0)||localStorage.getItem(LEGACY_META_KEY_1)||localStorage.getItem(LEGACY_META_KEY)||localStorage.getItem(LEGACY_META_KEY_2)||localStorage.getItem(LEGACY_META_KEY_3)||localStorage.getItem(LEGACY_META_KEY_4)||localStorage.getItem(LEGACY_META_KEY_5)||localStorage.getItem(LEGACY_META_KEY_6)||localStorage.getItem(LEGACY_META_KEY_7)||localStorage.getItem(LEGACY_META_KEY_8)||'null')||{}; } catch { meta={}; }
    if(legacyReset)meta={};
    graph.views ||= {whiteboards:{}}; graph.views.whiteboards ||= {}; ensureGraphEntityStore();
    meta.boardPrefs ||= {}; meta.groups ||= {}; meta.frameParents ||= {}; meta.viewLayouts ||= {}; meta.smartLayoutSnapshots ||= {}; meta.smartLayoutPrefs ||= {}; meta.viewEngine ||= {}; meta.structuredViews ||= {}; meta.instanceSchemaVersion=2; meta.visualizationEngineVersion=1; meta.structuredViewsVersion=1; meta.journeyPrimitivesVersion=1; meta.importExportVersion=1; meta.performanceUxVersion=1; meta.whiteboardCoreVersion=WHITEBOARD_CORE_VERSION; meta.coreAuditVersion=CORE_AUDIT_VERSION; meta.coreBaseline='stable'; meta.journeyStudioVersion=1; meta.journeyStudio ||= {}; meta.blueprintStudioVersion=1; meta.blueprintStudio ||= {}; meta.blueprintHomeVersion=1; meta.blueprintHome ||= {records:{},viewMode:'cards',statusFilter:'all',search:''}; meta.blueprintGridUxVersion=1; meta.blueprintLearningVersion=1; meta.blueprintLearning ||= {mode:'guided',showTips:true,onboardingCompleted:false,onboardingStep:0,learned:{stages:false,lanes:false,lines:false,cells:false}}; meta.blueprintLearning.learned ||= {stages:false,lanes:false,lines:false,cells:false}; meta.blueprintHome.records ||= {}; meta.welcomeSeen = true;
    normalizeBoardKinds();
    const ids=Object.keys(graph.views.whiteboards);
    boardId = meta.activeBoardId && graph.views.whiteboards[meta.activeBoardId] ? meta.activeBoardId : (ids[0]||null);
    meta.activeBoardId=boardId;
    if(boardId){normalizeContainers(); normalizeLayers(); normalizeEdges(); normalizeVisualItems(); normalizeInstances(); migrateLegacyBlueprintLanes(); ensureViewLayoutStore(); structuredState(); ensureJourneyPrimitives();}
    ensureBlueprintHome(); runPersistenceMigrations(); persistence.revision=Math.max(Number(graph.persistenceRevision||0),Number(meta.persistenceRevision||0)); save(false,{checkpoint:false,label:legacyReset?'Remover base demonstrativa antiga':'Migração / abertura'});
    if(legacyReset)window.dispatchEvent(new CustomEvent('rt-data-notice',{detail:'A base demonstrativa antiga foi removida. Crie seu primeiro serviço para começar.'}));
  }
  function localStorageFallbackGraph(source){const cp=clone(source);for(const b of Object.values(cp.views?.whiteboards||{}))for(const it of Object.values(b.items||{}))if(it.asset?.dataUrl){it.asset={...it.asset,dataUrl:'',durableAsset:true}}cp.integrity={...(cp.integrity||{}),localCacheCompactedAt:new Date().toISOString()};return cp}
  function preserveConflictDraft(externalRevision=0){
    const payload={version:1,savedAt:new Date().toISOString(),boardId,baseRevision:Number(persistence.revision||0),externalRevision:Number(externalRevision||0),graph:clone(graph),meta:clone(meta)};
    try{localStorage.setItem(CONFLICT_DRAFT_KEY,JSON.stringify(payload));persistence.conflictDraftSavedAt=payload.savedAt;persistence.conflictPending=true;return true}catch{}
    try{sessionStorage.setItem(CONFLICT_DRAFT_KEY,JSON.stringify(payload));persistence.conflictDraftSavedAt=payload.savedAt;persistence.conflictPending=true;return true}catch{return false}
  }
  function conflictDraft(){return safeParse(localStorage.getItem(CONFLICT_DRAFT_KEY)||sessionStorage.getItem(CONFLICT_DRAFT_KEY)||'null')}
  function clearConflictDraft(){try{localStorage.removeItem(CONFLICT_DRAFT_KEY)}catch{}try{sessionStorage.removeItem(CONFLICT_DRAFT_KEY)}catch{}persistence.conflictPending=false;persistence.conflictDraftSavedAt=null}
  function save(render=true,opts={}){
    const stored=safeParse(rawGraphFromStorage());if(stored&&Number(stored.persistenceRevision||0)>Number(persistence.revision||0)){const protectedDraft=preserveConflictDraft(Number(stored.persistenceRevision||0));saveState='error';persistence.error=protectedDraft?'O projeto mudou em outra aba. Suas alterações foram preservadas em um rascunho de conflito.':'O projeto mudou em outra aba. Não foi possível proteger o rascunho local.';window.dispatchEvent(new CustomEvent('rt-data-error',{detail:persistence.error}));updateSaveIndicator();return false}
    const previousGraph=localStorage.getItem(GRAPH_KEY),previousMeta=localStorage.getItem(META_KEY),previousRevision=persistence.revision;
    normalizeContainers();normalizeEdges();normalizeInstances();storeCurrentViewLayout();graph.service.updatedAt=new Date().toISOString();if(board()?.viewKind==='journey'&&activeJourney()&&opts.content!==false)activeJourney().updatedAt=graph.service.updatedAt;if(liveTextEditing)render=false;
    try{const hardened=repairGraphIntegrity(migrateGraphV3(graph));if(!hardened.report.ok)throw Error(hardened.report.errors[0]?.message||'Falha de integridade');graph=hardened.graph;graph.integrity={...(graph.integrity||{}),schemaVersion:3,lastValidatedAt:new Date().toISOString()}}catch(e){saveState='error';persistence.error='Integridade: '+String(e?.message||e);window.dispatchEvent(new CustomEvent('rt-data-error',{detail:'O projeto não foi salvo porque contém referências inválidas.'}));updateSaveIndicator();return false}
    const label=opts.label||pendingEditLabel||'Editar quadro';const rev=Math.max(Number(graph.persistenceRevision||0),Number(meta.persistenceRevision||0),Number(persistence.revision||0))+1;graph.persistenceRevision=rev;meta.persistenceRevision=rev;meta.persistenceSchemaVersion=PERSISTENCE_SCHEMA;meta.appDataVersion=APP_VERSION;persistence.revision=rev;saveState='saving';persistence.durableState='pending';
    let ok=false;try{const graphRaw=JSON.stringify(graph),metaRaw=JSON.stringify(meta);localStorage.setItem(GRAPH_KEY,graphRaw);localStorage.setItem(META_KEY,metaRaw);ok=true;persistence.error=null}catch(e){
      try{const compactRaw=JSON.stringify(localStorageFallbackGraph(graph));localStorage.setItem(GRAPH_KEY,compactRaw);localStorage.setItem(META_KEY,JSON.stringify(meta));ok=true;persistence.error='Cache local compactado; projeto completo protegido no IndexedDB.';persistence.durableState='pending';window.dispatchEvent(new CustomEvent('rt-data-notice',{detail:'O projeto ficou grande para o cache local. A cópia completa será mantida no armazenamento durável do navegador.'}))}catch(e2){saveState='error';persistence.durableState='local';persistence.error=String(e2?.message||e?.message||e2);try{if(previousGraph!==null)localStorage.setItem(GRAPH_KEY,previousGraph);else localStorage.removeItem(GRAPH_KEY);if(previousMeta!==null)localStorage.setItem(META_KEY,previousMeta);else localStorage.removeItem(META_KEY)}catch{}graph.persistenceRevision=previousRevision;meta.persistenceRevision=previousRevision;persistence.revision=previousRevision;window.dispatchEvent(new CustomEvent('rt-data-error',{detail:'Não foi possível salvar. O armazenamento local e o cache de fallback estão indisponíveis.'}))}}

    if(ok)window.dispatchEvent(new CustomEvent('rt-graph-changed',{detail:clone(graph)}));
    if(ok&&opts.history!==false&&historyReady&&!restoringEdit&&!liveTextEditing)recordEditSnapshot(label);pendingEditLabel='Editar quadro';
    if(render)renderAll();else updateSaveIndicator();clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(saveState!=='error')saveState='saved';updateSaveIndicator()},220);
    if(ok)scheduleDurableMirror(label,!!opts.checkpoint);return ok
  }
  function board(){return boardId?graph.views.whiteboards[boardId]:null}
  function pref(){const key=boardId||'__workspace__';const p=meta.boardPrefs[key] ||= {layoutMode:'free',gridVisible:true,snapToGrid:true,smartGuides:true,minimap:true,cardDensity:'normal'};if(typeof p.minimap!=='boolean')p.minimap=true;if(!['compact','normal','detailed'].includes(p.cardDensity))p.cardDensity='normal';return p;}
  function ensureViewLayoutStore(){meta.viewLayouts ||= {};const key=boardId||'__workspace__';return meta.viewLayouts[key] ||= {}}
  function viewLayouts(){return ensureViewLayoutStore()}
  function viewEnginePref(){meta.viewEngine ||= {};return meta.viewEngine[boardId] ||= {flowDirection:'horizontal'}}
  function viewDef(mode=pref().layoutMode||'free'){return VIEW_DEFS[mode]||VIEW_DEFS.free}
  function viewLabel(mode=pref().layoutMode||'free'){return viewDef(mode).label}
  function viewLayoutStats(mode){const st=viewLayouts()[mode];return{saved:!!st?.items,count:Object.keys(st?.items||{}).length,updatedAt:st?.updatedAt||null}}
  function structuredState(){
    meta.structuredViews ||= {};const key=boardId||'__workspace__';const s=meta.structuredViews[key] ||= {schemaVersion:2,savedViews:[],filters:{},visibility:{},journey:{}};s.schemaVersion=2;s.savedViews ||= [];s.filters ||= {};s.visibility ||= {};s.journey ||= {};return s
  }
  function journeyPrimitiveState(){
    const j=structuredState().journey ||= {};const personas=Object.values(entityCollection('persona')||{});if(!j.activePersonaId||!entityRecord('persona',j.activePersonaId))j.activePersonaId=personas[0]?.id||'';if(j.showEmotionCurve===undefined)j.showEmotionCurve=true;if(j.showChannels===undefined)j.showChannels=true;if(!j.lanePreset)j.lanePreset='essential';if(!['current','future','compare'].includes(j.stateMode))j.stateMode='current';return j
  }
  function applyJourneyLanePreset(key){const preset=JOURNEY_LANE_PRESETS[key]||JOURNEY_LANE_PRESETS.essential;journeyPrimitiveState().lanePreset=key;viewVisibility('journey').hiddenLanes=journeyLanes.filter(x=>!preset.lanes.includes(x.key)).map(x=>x.key);invalidateViewLayout('journey');save(false);if((pref().layoutMode||'free')==='journey')applyLayout('journey',true)}
  function evidenceConfidence(rec){const key=rec?.confidence||'hypothesis';return ({hypothesis:{label:'Hipótese',mark:'○'},partial:{label:'Evidência parcial',mark:'◐'},evidenced:{label:'Evidenciado',mark:'●'}})[key]||{label:'Hipótese',mark:'○'}}
  function journeyStateLabel(v){return v==='future'?'Futuro':v==='both'?'Atual + Futuro':'Atual'}
  function journeyStateForRecord(rec){return rec?.experienceState||'current'}
  function seedFutureScenario(){orderedStages().forEach(st=>{if(!String(st.futureCustomerAction||'').trim())st.futureCustomerAction=st.customerAction||''});Object.values(board()?.items||{}).filter(it=>it.kind==='smart'&&it.objectKind!=='stage').forEach(it=>{const rec=entityRecord(it.objectKind,it.objectId);if(rec&&!rec.experienceState)rec.experienceState='current'});journeyPrimitiveState().stateMode='future';invalidateViewLayout('journey');save(false,{label:'Criar cenário futuro'});if((pref().layoutMode||'free')==='journey')applyLayout('journey',true);toast('Cenário Futuro preparado a partir da jornada atual.')}
  function emotionLabel(score){const n=Number(score||0);return n>=2?'Muito positiva':n===1?'Positiva':n===0?'Neutra':n===-1?'Negativa':'Muito negativa'}
  function emotionGlyph(score){const n=Number(score||0);return n>=2?'😄':n===1?'🙂':n===0?'😐':n===-1?'🙁':'😣'}
  function emotionForStage(stageId,personaId=journeyPrimitiveState().activePersonaId,stateMode=journeyPrimitiveState().stateMode){const all=Object.values(entityCollection('emotion')||{}).filter(e=>e.stageId===stageId&&(!personaId||e.personaId===personaId));if(stateMode==='future')return all.find(e=>journeyStateForRecord(e)==='future'||journeyStateForRecord(e)==='both')||null;if(stateMode==='compare')return all.find(e=>journeyStateForRecord(e)==='current'||journeyStateForRecord(e)==='both')||all[0]||null;return all.find(e=>journeyStateForRecord(e)==='current'||journeyStateForRecord(e)==='both')||all[0]||null}
  function personaTitle(id){return entityTitle('persona',entityRecord('persona',id))||'Persona'}
  function channelTitle(id){return entityTitle('channel',entityRecord('channel',id))||''}
  function viewFilter(mode=pref().layoutMode||'free'){
    const s=structuredState();return s.filters[mode] ||= {query:'',types:[],stageIds:[],source:'all',owner:'',tags:[],personaIds:[]}
  }
  function viewVisibility(mode=pref().layoutMode||'free'){
    const s=structuredState();return s.visibility[mode] ||= {hiddenTypes:[],hiddenLanes:[]}
  }
  function filterCount(mode=pref().layoutMode||'free'){
    const f=viewFilter(mode),v=viewVisibility(mode);return (f.query?1:0)+(f.types?.length||0)+(f.stageIds?.length||0)+(f.source&&f.source!=='all'?1:0)+(f.owner?1:0)+(f.tags?.length||0)+(f.personaIds?.length||0)+(v.hiddenTypes?.length||0)+(v.hiddenLanes?.length||0)
  }
  function structuredGridModel(mode=pref().layoutMode||'free'){
    const stages=orderedStages(),lanes=mode==='journey'?journeyLanes:mode==='blueprint'?blueprintLanes:mode==='service'?SERVICE_FRAME_LAYERS:[],cells=[];
    if(lanes.length)for(const st of stages)for(const ln of lanes){const ids=Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&stageForItem(it)===st.id&&((mode==='journey'?journeyLaneForItem(it):mode==='service'?serviceFrameLayerForItem(it):laneForItem(it))===ln.key)).map(it=>it.id);cells.push({id:`${mode}:${st.id}:${ln.key}`,columnId:st.id,laneKey:ln.key,itemIds:ids})}
    return{schemaVersion:1,mode,columns:stages.map((s,i)=>({id:s.id,label:s.title,index:i})),lanes:lanes.map((l,i)=>({key:l.key,label:l.label,index:i})),cells}
  }
  function itemPassesActiveView(it){
    if(!it)return false;if(isContainer(it))return true;const mode=pref().layoutMode||'free',f=viewFilter(mode),v=viewVisibility(mode),sem=semanticKind(it);
    // V1.15.4: Journey/Blueprint already render canonical stage headers. Do not draw the
    // underlying Stage Smart Object a second time on top of the same header.
    if((mode==='journey'||mode==='blueprint'||mode==='service')&&it.kind==='smart'&&it.objectKind==='stage')return false;
    if((v.hiddenTypes||[]).includes(sem))return false;
    const lane=mode==='journey'?journeyLaneForItem(it):mode==='blueprint'?laneForItem(it):mode==='service'?serviceFrameLayerForItem(it):null;if(lane&&(v.hiddenLanes||[]).includes(lane))return false;
    if(f.source==='linked'&&it.kind!=='smart'&&visualKind(it)!=='linked')return false;if(f.source==='free'&&(it.kind==='smart'||visualKind(it)==='linked'))return false;
    if(f.types?.length&&!f.types.includes(sem))return false;
    if(f.stageIds?.length){const sid=stageForItem(it);if(!sid||!f.stageIds.includes(sid))return false}
    const rec=it.kind==='smart'?entityRecord(it.objectKind,it.objectId):null;const layerApi=runtime.api('serviceLayers');if(layerApi?.itemVisible&&!layerApi.itemVisible({kind:sem,record:rec,item:it}))return false;if(mode==='journey'&&it.kind==='smart'&&it.objectKind!=='stage'){const scenarioMode=layerApi?.model?.()?.state?.mode||'all';if(scenarioMode==='all'){const sm=journeyPrimitiveState().stateMode||'current',rs=journeyStateForRecord(rec);if(sm!=='compare'&&rs!=='both'&&rs!==sm)return false}}if(f.owner&&String(rec?.owner||'').toLowerCase().indexOf(String(f.owner).toLowerCase())<0)return false;if(f.tags?.length){const tags=(rec?.tags||it.tags||[]).map(x=>String(x).toLowerCase());if(!f.tags.every(t=>tags.includes(String(t).toLowerCase())))return false}
    if(f.personaIds?.length){const pids=(rec?.personaIds||[]).concat(rec?.personaId?[rec.personaId]:[]);if(!f.personaIds.some(pid=>pids.includes(pid)))return false}
    if(f.query){const c=content(it),hay=`${c.title} ${c.sub} ${semanticLabel(it)} ${rec?.owner||''} ${(rec?.tags||[]).join(' ')}`.toLowerCase();if(!hay.includes(String(f.query).toLowerCase()))return false}
    return true
  }
  function availableSemanticTypes(){return [...new Set(Object.values(board()?.items||{}).filter(it=>!isContainer(it)).map(semanticKind))].sort((a,b)=>String(smartLabel(a)||freeLabel(a)).localeCompare(String(smartLabel(b)||freeLabel(b)),'pt-BR'))}
  async function saveCurrentViewDefinition(){
    const name=await promptDialog('Salvar visualização','Nome da visualização','Nova visão','Ex.: Problemas da etapa Compra');if(!name)return;const mode=pref().layoutMode||'free',s=structuredState();s.savedViews.push({id:uid('saved-view'),name:name.trim(),layoutMode:mode,filters:clone(viewFilter(mode)),visibility:clone(viewVisibility(mode)),viewport:{zoom,pan:clone(pan)},createdAt:new Date().toISOString()});save(false,{label:'Salvar visão'});renderAll();toast('Visão salva.')
  }
  function applySavedView(sv){
    if(!sv)return;structuredState().filters[sv.layoutMode]=clone(sv.filters||{query:'',types:[],stageIds:[],source:'all',owner:'',tags:[],personaIds:[]});structuredState().visibility[sv.layoutMode]=clone(sv.visibility||{hiddenTypes:[],hiddenLanes:[]});applyLayout(sv.layoutMode);setTimeout(()=>{if(sv.viewport){zoom=sv.viewport.zoom||zoom;pan=clone(sv.viewport.pan||pan)}renderAll()},30)
  }
  function showSavedViews(){
    const m=modalShell('Visualizações salvas','Salve filtros, visibilidade, visualização e enquadramento sem duplicar o conteúdo.');m.box.classList.add('rt156-savedviews-modal');const top=document.createElement('div');top.className='rt156-savedviews-top';top.innerHTML='<div><b>Leituras do mesmo serviço</b><span>Cada visualização guarda apenas filtros, layout e enquadramento.</span></div>';top.appendChild(btn('Salvar visualização atual',()=>{m.root.remove();saveCurrentViewDefinition()},'primary'));m.box.appendChild(top);const list=document.createElement('div');list.className='rt156-savedviews-list';m.box.appendChild(list);const draw=()=>{list.innerHTML='';const all=structuredState().savedViews||[];if(!all.length){list.innerHTML='<div class="rt156-empty"><b>Nenhuma visão salva</b><span>Configure filtros ou uma visualização e salve sua primeira leitura.</span></div>';return}all.forEach(sv=>{const r=document.createElement('article');r.className='rt156-savedview';r.innerHTML=`<div><small>${esc(viewLabel(sv.layoutMode))}</small><b>${esc(sv.name)}</b><span>${filterSummary(sv.filters,sv.visibility)}</span></div><div class="rt156-savedview-actions"></div>`;const a=$('.rt156-savedview-actions',r);a.append(btn('Abrir',()=>{m.root.remove();applySavedView(sv)},'primary'),btn('Excluir',()=>{structuredState().savedViews=structuredState().savedViews.filter(x=>x.id!==sv.id);save(false,{label:'Excluir visão'});draw()},'danger'));list.appendChild(r)})};draw()
  }
  function filterSummary(f={},v={}){const bits=[];if(f.query)bits.push(`Busca: ${f.query}`);if(f.types?.length)bits.push(`${f.types.length} tipo(s)`);if(f.stageIds?.length)bits.push(`${f.stageIds.length} etapa(s)`);if(f.source&&f.source!=='all')bits.push(f.source==='linked'?'Somente vinculados':'Somente livres');if(f.owner)bits.push('Owner: '+f.owner);if(f.tags?.length)bits.push('Tags: '+f.tags.join(', '));if(f.personaIds?.length)bits.push('Persona: '+f.personaIds.map(personaTitle).join(', '));if(v.hiddenTypes?.length||v.hiddenLanes?.length)bits.push(`${(v.hiddenTypes?.length||0)+(v.hiddenLanes?.length||0)} oculto(s)`);return bits.length?bits.join(' · '):'Sem filtros adicionais'}
  function showViewFilters(){
    const mode=pref().layoutMode||'free',f=clone(viewFilter(mode)),vis=clone(viewVisibility(mode)),m=modalShell('Filtros e visibilidade',`Configure a leitura da visualização ${viewLabel(mode)} sem alterar o Service Graph.`);m.box.classList.add('rt156-filter-modal');
    const search=document.createElement('label');search.className='rt144-field';search.innerHTML='<span>Buscar no quadro</span><input class="rt156-filter-query" placeholder="Título, descrição ou tipo…">';m.box.appendChild(search);$('.rt156-filter-query',search).value=f.query||'';
    const source=document.createElement('label');source.className='rt144-field';source.innerHTML='<span>Origem do objeto</span><select><option value="all">Todos</option><option value="linked">Vinculados ao Graph / links</option><option value="free">Objetos livres</option></select>';source.querySelector('select').value=f.source||'all';m.box.appendChild(source);const owner=document.createElement('label');owner.className='rt144-field';owner.innerHTML='<span>Responsável / owner</span><input class="rt156-filter-owner" placeholder="Ex.: Atendimento">';owner.querySelector('input').value=f.owner||'';m.box.appendChild(owner);const tags=document.createElement('label');tags.className='rt144-field';tags.innerHTML='<span>Tags</span><input class="rt156-filter-tags" placeholder="Ex.: crítico, pagamento">';tags.querySelector('input').value=(f.tags||[]).join(', ');m.box.appendChild(tags);
    sectionTitle(m.box,'Tipos de objeto');const typeGrid=document.createElement('div');typeGrid.className='rt156-chip-grid';m.box.appendChild(typeGrid);availableSemanticTypes().forEach(k=>{const label=smartLabel(k)!==k?smartLabel(k):freeLabel(k),b=document.createElement('button');b.className=f.types?.includes(k)?'active':'';b.textContent=label;b.dataset.value=k;b.onclick=()=>b.classList.toggle('active');typeGrid.appendChild(b)});
    sectionTitle(m.box,'Etapas');const stageGrid=document.createElement('div');stageGrid.className='rt156-chip-grid stages';m.box.appendChild(stageGrid);orderedStages().forEach(st=>{const b=document.createElement('button');b.className=f.stageIds?.includes(st.id)?'active':'';b.textContent=st.title;b.dataset.value=st.id;b.onclick=()=>b.classList.toggle('active');stageGrid.appendChild(b)});
    sectionTitle(m.box,'Personas');const personaGrid=document.createElement('div');personaGrid.className='rt156-chip-grid rt157-persona-filter';m.box.appendChild(personaGrid);Object.values(entityCollection('persona')||{}).forEach(p=>{const b=document.createElement('button');b.className=f.personaIds?.includes(p.id)?'active':'';b.textContent=entityTitle('persona',p);b.dataset.value=p.id;b.onclick=()=>b.classList.toggle('active');personaGrid.appendChild(b)});
    sectionTitle(m.box,'Visibilidade desta visualização');const hideGrid=document.createElement('div');hideGrid.className='rt156-visibility-grid';m.box.appendChild(hideGrid);const laneDefs=mode==='journey'?journeyLanes:mode==='blueprint'?blueprintLanes:mode==='service'?SERVICE_FRAME_LAYERS:[];if(laneDefs.length){laneDefs.forEach(ln=>{const lab=document.createElement('label');lab.innerHTML=`<input type="checkbox" data-lane="${esc(ln.key)}" ${!vis.hiddenLanes?.includes(ln.key)?'checked':''}><span>${esc(ln.label)}</span>`;hideGrid.appendChild(lab)})}else availableSemanticTypes().forEach(k=>{const lab=document.createElement('label');lab.innerHTML=`<input type="checkbox" data-type="${esc(k)}" ${!vis.hiddenTypes?.includes(k)?'checked':''}><span>${esc(smartLabel(k)!==k?smartLabel(k):freeLabel(k))}</span>`;hideGrid.appendChild(lab)});
    const foot=document.createElement('div');foot.className='rt156-filter-actions';foot.append(btn('Limpar',()=>{structuredState().filters[mode]={query:'',types:[],stageIds:[],source:'all',owner:'',tags:[],personaIds:[]};structuredState().visibility[mode]={hiddenTypes:[],hiddenLanes:[]};save();m.root.remove();toast('Filtros removidos.')}),btn('Aplicar',()=>{f.query=$('.rt156-filter-query',search).value.trim();f.source=source.querySelector('select').value;f.owner=owner.querySelector('input').value.trim();f.tags=tags.querySelector('input').value.split(',').map(x=>x.trim()).filter(Boolean);f.types=[...typeGrid.querySelectorAll('button.active')].map(b=>b.dataset.value);f.stageIds=[...stageGrid.querySelectorAll('button.active')].map(b=>b.dataset.value);f.personaIds=[...personaGrid.querySelectorAll('button.active')].map(b=>b.dataset.value);vis.hiddenLanes=[...hideGrid.querySelectorAll('input[data-lane]')].filter(x=>!x.checked).map(x=>x.dataset.lane);vis.hiddenTypes=[...hideGrid.querySelectorAll('input[data-type]')].filter(x=>!x.checked).map(x=>x.dataset.type);structuredState().filters[mode]=f;structuredState().visibility[mode]=vis;save();m.root.remove();toast('Filtros aplicados.')},'primary'));m.box.appendChild(foot)
  }
  function linkedTargetTitle(ref){if(!ref)return'Destino';if(ref.type==='board')return graph.views.whiteboards?.[ref.id]?.name||'Quadro';if(ref.type==='journey')return graph.journeys?.[ref.id]?.name||'Jornada';if(ref.type==='entity')return entityTitle(ref.kind,entityRecord(ref.kind,ref.id))||smartLabel(ref.kind);return'Destino'}
  function addLinkedObject(ref,title){const it=addFree('linked','linked',title||linkedTargetTitle(ref),'violet',null,{width:290,height:150});it.visualKind='linked';it.linkedRef=clone(ref);it.text=title||linkedTargetTitle(ref);save();return it}
  function showLinkedObjectPicker(existingItem=null){
    const m=modalShell('Objeto vinculado','Crie um atalho vivo para outro quadro, jornada ou entidade do Service Graph.');m.box.classList.add('rt156-linked-modal');const q=document.createElement('input');q.className='rt144-search';q.placeholder='Buscar destino…';m.box.appendChild(q);const tabs=document.createElement('div');tabs.className='rt156-chip-grid';m.box.appendChild(tabs);const list=document.createElement('div');list.className='rt156-linked-list';m.box.appendChild(list);let active='board';[['board','Quadros'],['journey','Jornadas'],['entity','Entidades']].forEach(([k,l])=>{const b=btn(l,()=>{active=k;draw()},k===active?'active':'');b.dataset.tab=k;tabs.appendChild(b)});const draw=()=>{tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.tab===active));list.innerHTML='';const s=q.value.trim().toLowerCase(),rows=[];if(active==='board')Object.values(graph.views.whiteboards||{}).forEach(b=>rows.push({title:b.name,sub:'Whiteboard',ref:{type:'board',id:b.id}}));if(active==='journey')Object.values(graph.journeys||{}).forEach(j=>rows.push({title:j.name,sub:'Jornada',ref:{type:'journey',id:j.id}}));if(active==='entity')allEntities().forEach(e=>rows.push({title:e.title,sub:smartLabel(e.kind),ref:{type:'entity',kind:e.kind,id:e.id}}));rows.filter(r=>!s||(r.title+' '+r.sub).toLowerCase().includes(s)).forEach(r=>{const b=document.createElement('button');b.className='rt156-linked-row';b.innerHTML=`<span><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></span><em>Vincular</em>`;b.onclick=()=>{if(existingItem){existingItem.linkedRef=clone(r.ref);existingItem.text=r.title;markEdit('Alterar objeto vinculado');save()}else addLinkedObject(r.ref,r.title);m.root.remove()};list.appendChild(b)});if(!list.children.length)list.innerHTML='<div class="rt156-empty">Nenhum destino encontrado.</div>'};q.oninput=draw;draw();setTimeout(()=>q.focus(),0)
  }
  function openLinkedTarget(it){const ref=it?.linkedRef;if(!ref)return;if(ref.type==='board'&&graph.views.whiteboards[ref.id]){boardId=ref.id;meta.activeBoardId=boardId;selected=[];selectedEdge=null;showInspector=false;zoom=.88;pan={x:88,y:78};normalizeContainers();normalizeLayers();normalizeEdges();save();resetEditHistory('Abrir quadro vinculado');resetNavigationHistory('Abrir quadro vinculado');fit();return}if(ref.type==='journey'){pref().layoutMode='journey';const j=graph.journeys?.[ref.id];if(j&&graph.service.journeyIds?.includes(ref.id)){ensureJourney();placeJourneyItems();save();setTimeout(fitCurrentView,0)}else toast('Esta jornada ainda não possui uma view navegável neste serviço.');return}if(ref.type==='entity'){const u=entityInstances(ref.kind,ref.id)[0];if(u){if(u.boardId!==boardId){boardId=u.boardId;meta.activeBoardId=boardId;normalizeContainers();normalizeLayers();normalizeEdges()}save(false);setTimeout(()=>focusItem(u.itemId,{fitItem:true,record:true}),20)}else toast('A entidade ainda não possui instância em um quadro.')}
  }
  function journeyLaneForItem(it){
    if(!it)return 'other';
    if(it.kind==='smart'){
      if(it.objectKind==='need'||it.objectKind==='expectation')return 'need';
      if(it.objectKind==='touchpoint'||it.objectKind==='channel')return 'touchpoint';
      if(it.objectKind==='emotion')return 'emotion';
      if(it.objectKind==='evidence'||it.objectKind==='insight')return 'evidence';
      if(it.objectKind==='problem')return 'problem';
      if(it.objectKind==='opportunity')return 'opportunity';
      if(it.objectKind==='metric')return 'metric';
      if(it.objectKind==='customerAction'||it.objectKind==='persona')return 'other';
    }
    if(it.semantic==='evidence')return 'evidence';
    return 'other';
  }
  function structuredCardSize(){const d=pref().cardDensity||'normal';return d==='compact'?{width:236,height:96,step:118}:d==='detailed'?{width:292,height:142,step:170}:{width:264,height:120,step:148}}
  function journeyMetrics(){
    const stages=orderedStages(),colW=360,left=300,headerY=105,actionTop=290,gap=18,width=Math.max(1320,left+Math.max(1,stages.length)*colW+120),stageIndex=new Map(stages.map((s,i)=>[s.id,i])),counts=journeyLanes.map(()=>Array(Math.max(1,stages.length)).fill(0));
    Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&!(it.kind==='smart'&&it.objectKind==='stage')).forEach(it=>{const sid=stageForItem(it)||stages[0]?.id,c=Math.max(0,stageIndex.get(sid)??0),r=Math.max(0,journeyLanes.findIndex(x=>x.key===journeyLaneForItem(it)));if(counts[r])counts[r][c]=(counts[r][c]||0)+1});
    const actionH=150,card=structuredCardSize(),laneHeights=counts.map((row,i)=>viewVisibility('journey').hiddenLanes.includes(journeyLanes[i].key)?0:Math.max(190,76+Math.max(1,...row)*card.step)),rowTops=[];let y=actionTop+actionH+gap;laneHeights.forEach(h=>{rowTops.push(y);if(h)y+=h+gap});return{stages,colW,left,headerY,actionTop,actionH,gap,width,laneHeights,rowTops,totalHeight:y+80,card};
  }
  function placeJourneyItems(ids=null){
    const m=journeyMetrics(),stageIndex=new Map(m.stages.map((s,i)=>[s.id,i])),all=Object.values(board().items).filter(it=>!isContainer(it)),targetSet=ids?new Set(ids):null,targets=targetSet?all.filter(it=>targetSet.has(it.id)):all,counts={};
    if(targetSet)all.filter(it=>!targetSet.has(it.id)&&!(it.kind==='smart'&&it.objectKind==='stage')).forEach(it=>{const sid=stageForItem(it)||m.stages[0]?.id,c=Math.max(0,stageIndex.get(sid)??0),lane=journeyLaneForItem(it),r=Math.max(0,journeyLanes.findIndex(x=>x.key===lane)),k=c+':'+r;counts[k]=(counts[k]||0)+1});
    targets.forEach(it=>{
      if(it.kind==='smart'&&it.objectKind==='stage'){const c=stageIndex.get(it.objectId)??0;it.x=m.left+c*m.colW+26;it.y=m.headerY;it.width=300;it.height=126;setParentFrame(it.id,null);return}
      const sid=stageForItem(it)||m.stages[0]?.id,c=Math.max(0,stageIndex.get(sid)??0),lane=journeyLaneForItem(it),r=Math.max(0,journeyLanes.findIndex(x=>x.key===lane)),k=c+':'+r,n=counts[k]||0;counts[k]=n+1;
      it.journeyStageId=sid||null;it.journeyLane=lane;it.x=m.left+c*m.colW+32;it.y=m.rowTops[r]+48+n*m.card.step;it.width=m.card.width;it.height=m.card.height;setParentFrame(it.id,null);
    });
  }
  function flowLevels(items){
    const ids=new Set(items.map(i=>i.id)),edges=Object.values(board().edges||{}).filter(e=>ids.has(e.fromId)&&ids.has(e.toId));
    if(!edges.length)return items.sort((a,b)=>{const sa=orderedStages().findIndex(s=>s.id===stageForItem(a)),sb=orderedStages().findIndex(s=>s.id===stageForItem(b));return (sa<0?999:sa)-(sb<0?999:sb)||a.y-b.y||a.x-b.x}).map((it,i)=>({it,level:i,row:0}));
    const indeg=new Map(items.map(i=>[i.id,0])),out=new Map(items.map(i=>[i.id,[]])),level=new Map(items.map(i=>[i.id,0]));edges.forEach(e=>{indeg.set(e.toId,(indeg.get(e.toId)||0)+1);out.get(e.fromId)?.push(e.toId)});
    const q=items.filter(i=>(indeg.get(i.id)||0)===0).map(i=>i.id),seen=[];while(q.length){const id=q.shift();if(seen.includes(id))continue;seen.push(id);for(const n of out.get(id)||[]){level.set(n,Math.max(level.get(n)||0,(level.get(id)||0)+1));indeg.set(n,(indeg.get(n)||0)-1);if((indeg.get(n)||0)<=0)q.push(n)}}
    let max=Math.max(0,...level.values());items.forEach(i=>{if(!seen.includes(i.id))level.set(i.id,++max)});const rows=new Map();return items.map(it=>{const l=level.get(it.id)||0,r=rows.get(l)||0;rows.set(l,r+1);return{it,level:l,row:r}});
  }
  function boxesOverlap(a,b,margin=24){return !(a.x+a.width+margin<=b.x||b.x+b.width+margin<=a.x||a.y+a.height+margin<=b.y||b.y+b.height+margin<=a.y)}
  function resolveLayoutCollisions(items,axis='vertical'){
    const arr=[...items].sort((a,b)=>a.y-b.y||a.x-b.x);const placed=[];
    arr.forEach(it=>{let guard=0;while(placed.some(p=>boxesOverlap(it,p,28))&&guard++<200){if(axis==='horizontal')it.x=Math.max(...placed.filter(p=>boxesOverlap({...it,x:it.x,y:it.y-99999,height:200000},p,28)).map(p=>p.x+p.width+56),it.x+56);else it.y=Math.max(...placed.filter(p=>boxesOverlap({...it,x:it.x-99999,y:it.y,width:200000},p,28)).map(p=>p.y+p.height+56),it.y+56)}placed.push(it)});return arr
  }
  function placeFlowItems(ids=null){
    const all=Object.values(board().items).filter(it=>!isContainer(it)),targetSet=ids?new Set(ids):null;
    if(targetSet){
      const target=all.filter(it=>targetSet.has(it.id));const others=all.filter(it=>!targetSet.has(it.id));
      const originX=Math.max(180,...others.map(it=>it.x+it.width+120));let y=220;
      target.forEach(it=>{it.x=originX;it.y=y;y+=Math.max(180,it.height+56);setParentFrame(it.id,null)});resolveLayoutCollisions(target,'vertical');return;
    }
    const idsSet=new Set(all.map(i=>i.id)),edges=Object.values(board().edges||{}).filter(e=>idsSet.has(e.fromId)&&idsSet.has(e.toId)),adj=new Map(all.map(i=>[i.id,new Set()]));
    edges.forEach(e=>{adj.get(e.fromId)?.add(e.toId);adj.get(e.toId)?.add(e.fromId)});
    const seen=new Set(),components=[];all.forEach(it=>{if(seen.has(it.id))return;const stack=[it.id],comp=[];seen.add(it.id);while(stack.length){const id=stack.pop(),obj=board().items[id];if(obj)comp.push(obj);for(const n of adj.get(id)||[]){if(!seen.has(n)){seen.add(n);stack.push(n)}}}components.push(comp)});
    const connected=components.filter(c=>c.length>1||edges.some(e=>e.fromId===c[0]?.id||e.toId===c[0]?.id)),isolated=components.filter(c=>!connected.includes(c)).flat();
    const dir=viewEnginePref().flowDirection||'horizontal',mainGap=110,crossGap=64,componentGap=180;let cursor=220;
    const componentBounds=[];
    connected.sort((a,b)=>b.length-a.length).forEach((comp,ci)=>{
      const levels=flowLevels(comp),byLevel=new Map();levels.forEach(x=>{if(!byLevel.has(x.level))byLevel.set(x.level,[]);byLevel.get(x.level).push(x.it)});
      const levelKeys=[...byLevel.keys()].sort((a,b)=>a-b),base=180,maxW=Math.max(...comp.map(i=>Math.max(220,Math.min(i.width||260,300)))),maxH=Math.max(...comp.map(i=>Math.max(100,Math.min(i.height||132,150))));let compCross=0;
      levelKeys.forEach((lv,li)=>{const nodes=byLevel.get(lv);nodes.forEach((it,ri)=>{it.width=Math.min(Math.max(it.width||260,220),300);it.height=Math.min(Math.max(it.height||120,96),150);if(dir==='vertical'){it.x=base+ri*(maxW+crossGap);it.y=cursor+li*(maxH+mainGap)}else{it.x=base+li*(maxW+mainGap);it.y=cursor+ri*(maxH+crossGap)}setParentFrame(it.id,null)});compCross=Math.max(compCross,nodes.length*(dir==='vertical'?(maxW+crossGap):(maxH+crossGap)))});
      resolveLayoutCollisions(comp,dir==='vertical'?'horizontal':'vertical');
      const b=smartLayoutBounds(comp);componentBounds.push(b);cursor=b.y+b.h+componentGap;
    });
    if(isolated.length){
      const cols=Math.max(1,Math.min(4,Math.ceil(Math.sqrt(isolated.length)))),startX=180,startY=connected.length?cursor:220,maxW=Math.max(...isolated.map(i=>Math.max(220,Math.min(i.width||260,300)))),maxH=Math.max(...isolated.map(i=>Math.max(100,Math.min(i.height||132,150))));
      isolated.sort((a,b)=>a.y-b.y||a.x-b.x).forEach((it,i)=>{it.width=Math.min(Math.max(it.width||260,220),300);it.height=Math.min(Math.max(it.height||120,96),150);it.x=startX+(i%cols)*(maxW+70);it.y=startY+70+Math.floor(i/cols)*(maxH+64);it.flowIsolated=true;setParentFrame(it.id,null)});resolveLayoutCollisions(isolated,'vertical');
      viewEnginePref().isolatedStart={x:startX,y:startY,count:isolated.length};
    }else viewEnginePref().isolatedStart=null;
    all.filter(it=>!isolated.includes(it)).forEach(it=>delete it.flowIsolated);
  }
  function fitJourneyWidth(){const v=$('.rt144-view',overlay);if(!v)return;const r=v.getBoundingClientRect(),m=journeyMetrics(),pad=110;zoom=clamp((r.width-pad*2)/m.width,.55,1.05);pan={x:(r.width-m.width*zoom)/2-90*zoom,y:30-70*zoom};renderAll()}
  function fitServiceFrameWidth(){const v=$('.rt144-view',overlay);if(!v)return;const r=v.getBoundingClientRect(),m=serviceFrameMetrics(),pad=96;zoom=clamp((r.width-pad*2)/m.width,.48,1);pan={x:(r.width-m.width*zoom)/2-m.rootX*zoom,y:26-m.rootY*zoom};renderAll()}
  function fitCurrentView(){const mode=pref().layoutMode||'free';if(mode==='service')return fitServiceFrameWidth();if(mode==='blueprint')return fitBlueprintWidth();if(mode==='journey')return fitJourneyWidth();return fit()}
  function normalizeInstances(){
    if(!board())return;
    Object.values(board().items).forEach(it=>{
      it.instanceId ||= it.id;
      it.instanceSchemaVersion=2;
      if(it.kind==='smart'){
        it.entityRef={type:it.objectKind,id:it.objectId};
        it.entityStatus=entityRecord(it.objectKind,it.objectId)?'linked':'missing';
        it.presentation ||= {tone:it.tone||null}; it.presentation.visualKind ||= 'card'; it.semanticType ||= it.objectKind;
      } else {
        if(!('entityRef' in it))it.entityRef=null;
        it.entityStatus='unlinked'; it.semanticType ||= it.semantic||null;
      }
    });
  }
  function layoutState(it){return{x:it.x,y:it.y,width:it.width,height:it.height,z:itemZ(it),parentId:parentFrame(it.id)||null}}
  function storeCurrentViewLayout(mode=(pref().layoutMode||'free')){
    if(!board()||!mode)return;
    const state={updatedAt:new Date().toISOString(),items:{}};
    Object.values(board().items).forEach(it=>{state.items[it.id]=layoutState(it)});
    viewLayouts()[mode]=state;
  }
  function restoreViewLayout(mode){
    const state=viewLayouts()[mode];if(!state?.items)return false;
    Object.entries(state.items).forEach(([id,s])=>{const it=board().items[id];if(!it)return;['x','y','width','height','z'].forEach(k=>{if(Number.isFinite(s[k]))it[k]=s[k]});setParentFrame(id,s.parentId&&board().items[s.parentId]?s.parentId:null)});
    return true;
  }
  function migrateLegacyBlueprintLanes(){
    if(!board())return;const legacy=[];
    Object.values(board().items).forEach(it=>{if(isContainer(it)&&containerType(it)==='swimlane'&&legacyLaneNames.includes(it.text)&&it.width>=2500)legacy.push(it.id)});
    legacy.forEach(id=>{childrenOf(id).forEach(cid=>setParentFrame(cid,null));delete board().items[id];delete groups()[id];delete frameParents()[id]});
  }
  function stageForItem(it){
    if(!it)return null;if(it.kind==='smart'&&it.objectKind==='stage')return it.objectId;if(it.serviceStageId&&graph.stages[it.serviceStageId])return it.serviceStageId;if(it.blueprintStageId&&graph.stages[it.blueprintStageId])return it.blueprintStageId;
    const stages=orderedStages();if(it.kind==='smart'&&it.objectKind==='touchpoint'){const s=stages.find(x=>(x.touchpointIds||[]).includes(it.objectId));return s?.id||null}
    if(it.kind==='smart'&&it.objectKind==='problem')return graph.problems[it.objectId]?.stageId||null;
    if(it.kind==='smart'&&it.objectKind==='opportunity')return graph.opportunities[it.objectId]?.stageId||null;
    if(it.kind==='smart'&&it.objectKind==='emotion')return entityRecord('emotion',it.objectId)?.stageId||null;
    if(it.kind==='smart'&&it.objectKind==='channel'){const rec=entityRecord('channel',it.objectId),tp=stages.flatMap(s=>(s.touchpointIds||[]).map(id=>({s,tp:graph.touchpoints[id]}))).find(x=>x.tp?.channelId===rec?.id);return tp?.s?.id||null}
    if(it.kind==='smart'){const rec=entityRecord(it.objectKind,it.objectId);if(rec?.stageId&&graph.stages[rec.stageId])return rec.stageId}
    return stages[0]?.id||null;
  }
  function laneForItem(it){
    if(!it)return 'customer';if(it.blueprintLane&&blueprintLanes.some(x=>x.key===it.blueprintLane))return it.blueprintLane;
    if(it.kind==='smart'){
      if(it.objectKind==='evidence')return 'evidence';
      if(it.objectKind==='customerAction'||it.objectKind==='touchpoint'||it.objectKind==='stage'||it.objectKind==='problem'||it.objectKind==='insight'||it.objectKind==='person')return 'customer';
      if(it.objectKind==='frontstage'||it.objectKind==='opportunity')return 'frontstage';
      if(it.objectKind==='backstage')return 'backstage';
      if(it.objectKind==='process')return 'process';
      if(it.objectKind==='system')return 'system';
    }
    if(it.semantic==='evidence')return 'evidence';if(it.semantic==='customerAction')return 'customer';if(it.semantic==='frontstage')return 'frontstage';if(it.semantic==='backstage')return 'backstage';if(it.semantic==='process')return 'process';if(it.semantic==='system')return 'system';return 'customer';
  }
  function blueprintMetrics(){
    const stages=orderedStages(),colW=360,left=300,headerY=105,laneTop=300,gap=18,width=Math.max(1320,left+Math.max(1,stages.length)*colW+120),stageIndex=new Map(stages.map((s,i)=>[s.id,i])),counts=blueprintLanes.map(()=>Array(Math.max(1,stages.length)).fill(0));
    Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&!(it.kind==='smart'&&it.objectKind==='stage')).forEach(it=>{const sid=stageForItem(it)||stages[0]?.id,c=Math.max(0,stageIndex.get(sid)??0),r=Math.max(0,blueprintLanes.findIndex(x=>x.key===laneForItem(it)));if(counts[r])counts[r][c]=(counts[r][c]||0)+1});
    const card=structuredCardSize(),laneHeights=counts.map(row=>Math.max(220,88+Math.max(1,...row)*card.step)),rowTops=[];let y=laneTop;laneHeights.forEach(h=>{rowTops.push(y);y+=h+gap});return{stages,colW,left,headerY,laneTop,gap,width,laneHeights,rowTops,totalHeight:y+80,card};
  }
  function placeBlueprintItems(ids=null){
    const m=blueprintMetrics(),stageIndex=new Map(m.stages.map((s,i)=>[s.id,i])),all=Object.values(board().items).filter(it=>!isContainer(it)),targetSet=ids?new Set(ids):null,targets=targetSet?all.filter(it=>targetSet.has(it.id)):all,counts={};
    if(targetSet)all.filter(it=>!targetSet.has(it.id)&&!(it.kind==='smart'&&it.objectKind==='stage')).forEach(it=>{const sid=stageForItem(it)||m.stages[0]?.id,c=Math.max(0,stageIndex.get(sid)??0),lane=laneForItem(it),r=Math.max(0,blueprintLanes.findIndex(x=>x.key===lane)),k=c+':'+r;counts[k]=(counts[k]||0)+1});
    targets.forEach(it=>{
      if(it.kind==='smart'&&it.objectKind==='stage'){const c=stageIndex.get(it.objectId)??0;it.x=m.left+c*m.colW+26;it.y=m.headerY;it.width=300;it.height=126;setParentFrame(it.id,null);return}
      const sid=stageForItem(it)||m.stages[0]?.id,c=Math.max(0,stageIndex.get(sid)??0),lane=laneForItem(it),r=Math.max(0,blueprintLanes.findIndex(x=>x.key===lane)),k=c+':'+r,n=counts[k]||0;counts[k]=n+1;
      it.blueprintStageId=sid||null;it.blueprintLane=lane;it.x=m.left+c*m.colW+32;it.y=m.rowTops[r]+54+n*m.card.step;it.width=m.card.width;it.height=m.card.height;setParentFrame(it.id,null);
    });
  }
  function renderEmotionCurve(root,m){
    const state=journeyPrimitiveState();if(state.showEmotionCurve===false||viewVisibility('journey').hiddenLanes.includes('emotion'))return;const r=journeyLanes.findIndex(x=>x.key==='emotion');if(r<0)return;const top=m.rowTops[r]-70,height=m.laneHeights[r],left=m.left-90,w=Math.max(1,m.stages.length*m.colW),personaId=state.activePersonaId,points=m.stages.map((st,i)=>{const e=emotionForStage(st.id,personaId),score=Number(e?.score||0),x=i*m.colW+m.colW/2,y=height/2-score*(height*.24);return{x,y,score,label:e?.title||emotionLabel(score),id:e?.id||'',stageId:st.id}});
    const wrap=document.createElement('div');wrap.className='rt157-emotion-curve';wrap.style.left=left+'px';wrap.style.top=top+'px';wrap.style.width=w+'px';wrap.style.height=height+'px';const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${w} ${height}`);svg.setAttribute('preserveAspectRatio','none');const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('class','rt157-emotion-line');path.setAttribute('d',points.map((p,i)=>(i?'L':'M')+p.x+' '+p.y).join(' '));svg.appendChild(path);points.forEach(p=>{const g=document.createElementNS(svg.namespaceURI,'g');g.setAttribute('class','rt157-emotion-point');const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r','7');g.appendChild(c);const t=document.createElementNS(svg.namespaceURI,'text');t.setAttribute('x',p.x);t.setAttribute('y',p.y-13);t.setAttribute('text-anchor','middle');t.textContent=emotionGlyph(p.score)+' '+p.label;g.appendChild(t);svg.appendChild(g)});wrap.appendChild(svg);root.appendChild(wrap)
  }


  // The guided interpretation is additive: the actual Service Frame and canonical objects never change views.
  function guidedBlueprintUiState(){
    meta.blueprintGuidedUi ||= {version:1,boards:{}};
    const id=boardId||'global';
    return meta.blueprintGuidedUi.boards[id] ||= {open:false,tab:'steps'};
  }
  function toggleGuidedBlueprintPanel(){
    const state=guidedBlueprintUiState();state.open=!state.open;
    if(state.open){closeEditorSidePanels();showBoardMenu=false;showLibrary=false;showLayers=false;showOutline=false;}
    save(false,{content:false,history:false,label:'Leitura guiada do Blueprint'});renderAll();
  }
  function renderGuidedBlueprintPanel(parent){
    if(editorContextKind()!=='blueprint')return;
    const ui=guidedBlueprintUiState();if(!ui.open)return;
    const stages=serviceFrameStages(),rows=stages.map(st=>({stage:st,...serviceFrameStageCoverage(st.id)}));
    const delivery=buildBlueprintDeliveryReport(graph,boardId);
    const model=buildBlueprintGuidedReading({
      stages,lanes:SERVICE_FRAME_LAYERS,rows,issues:delivery.issues,
      qualityDimensions:BLUEPRINT_QUALITY_DIMENSIONS,
      qualityCriteria:board()?.serviceStrategy?.qualityCriteria||{}
    });
    const panel=document.createElement('aside');panel.className='bo-guided-reading';
    panel.setAttribute('aria-label','Leitura guiada do Blueprint');
    panel.innerHTML='<header><div><small>BLUE OCEAN · BLUEPRINT</small><strong>Leitura guiada</strong><small>O mesmo serviço, sem duplicar objetos</small></div><button class="bo-guided-close" type="button" aria-label="Fechar leitura guiada">×</button></header><nav class="bo-guided-tabs" role="tablist" aria-label="Visões da leitura guiada"></nav><div class="bo-guided-body"></div>';
    parent.appendChild(panel);
    $('.bo-guided-close',panel).onclick=toggleGuidedBlueprintPanel;
    const tabs=$('.bo-guided-tabs',panel),body=$('.bo-guided-body',panel);
    [['steps','Passo a passo'],['customer','Visão do cliente'],['quality','Qualidade']].forEach(([key,label])=>{
      const b=btn(label,()=>{ui.tab=key;save(false,{content:false,history:false,label:'Guia: alterar leitura'});renderAll()},'');
      b.setAttribute('role','tab');b.setAttribute('aria-selected',String(ui.tab===key));tabs.appendChild(b);
    });
    const heading=(label,description='')=>{const section=document.createElement('section');section.innerHTML='<h3>'+esc(label)+'</h3>'+(description?'<p>'+esc(description)+'</p>':'');body.appendChild(section);return section;};
    const gotoCell=(stageId,laneKey)=>{
      ui.open=false;save(false,{content:false,history:false,label:'Abrir etapa do Blueprint'});
      renderAll();
      setTimeout(()=>{
        if(pref().layoutMode==='service'){
          const cell=$('.bo1203-service-cell',overlay).find(el=>el.dataset.stageId===stageId&&el.dataset.layer===laneKey);
          if(cell){cell.scrollIntoView({block:'center',inline:'center'});if(!mobileReadOnly())beginBlueprintCellEntry(cell,laneKey,stageId);return}
        }
        if(!mobileReadOnly()&&pref().layoutMode==='blueprint'&&stageId&&laneKey)showBlueprintCellAdd(stageId,laneKey);
      },40);
    };
    if(ui.tab==='steps'){
      const intro=heading('Preenchimento por camadas','Comece pelo cliente e pelo atendimento visível; depois aprofunde operação, evidências e suporte.');
      intro.innerHTML+='<div class="bo-guided-note"><strong>'+model.coverage+'% de cobertura estrutural</strong><br>Contagem de etapas com conteúdo por camada. Não é satisfação medida nem validação de qualidade.</div>';
      const progress=heading('O que falta preencher');
      const list=document.createElement('div');list.className='bo-guided-progress';
      model.checklist.forEach(item=>{
        const row=document.createElement('div');row.className='bo-guided-row';
        const proportion=item.total?Math.round(item.covered/item.total*100):0;
        row.innerHTML='<span><b>'+esc(item.label)+'</b><small>'+item.covered+' de '+item.total+' etapas<div class="bo-guided-progress-meter"><i style="width:'+proportion+'%"></i></div></small></span><em>'+proportion+'%</em>';
        list.appendChild(row);
      });
      progress.appendChild(list);
      const next=heading('Próximo passo');
      if(!model.steps)next.innerHTML+='<p>Adicione a primeira etapa para começar. As etapas são compartilhadas com a Jornada.</p>';
      else if(model.next){
        const first=rows.find(row=>row.missing.some(lane=>lane.key===model.next.key));
        next.innerHTML+='<div class="bo-guided-note">'+esc(model.next.label)+' · '+esc(first?.stage?.title||'Próxima etapa')+'</div>';
        if(first&&!mobileReadOnly()){
          const actions=document.createElement('div');actions.className='bo-guided-actions';
          actions.append(btn('Preencher esta célula',()=>gotoCell(first.stage.id,model.next.key),'bo-guided-action'));
          next.appendChild(actions);
        }
      }else next.innerHTML+='<p>Todas as etapas têm conteúdo nas camadas obrigatórias. Revise relações e operação antes de validar.</p>';
      const priority=heading('Prioridades de revisão','Ordenadas por severidade dos gaps reais. Não são pontuações simuladas de satisfação.');
      if(!model.priorities.length)priority.innerHTML+='<p>Nenhuma pendência listada na revisão. Confirme o serviço com a equipe e os clientes.</p>';
      model.priorities.forEach(issue=>{
        const item=document.createElement('div');item.className='bo-guided-priority';
        item.innerHTML='<i class="bo-guided-tag '+(issue.severity==='critical'?'critical':'')+'">'+(issue.severity==='critical'?'Crítico':'Revisar')+'</i><span><b>'+esc(issue.stageTitle||'Serviço')+'</b><small>'+esc(issue.message)+'</small></span>';
        priority.appendChild(item);
      });
      const check=document.createElement('div');check.className='bo-guided-actions';check.append(btn('Revisar entrega completa',()=>{ui.open=false;renderAll();showBlueprintDeliveryReview()},'bo-guided-action'));priority.appendChild(check);
    }else if(ui.tab==='customer'){
      const focus=heading('Experiência percebida','Esta é uma leitura resumida. Frontstage, bastidores, processos, sistemas e vínculos continuam intactos no mapa.');
      if(!model.steps)focus.innerHTML+='<p>Adicione etapas à Jornada para construir esta leitura.</p>';
      stages.forEach(stage=>{
        const evidence=serviceFrameItemsFor(stage.id,'evidence').filter(it=>it.kind==='smart'&&isCustomerServiceEvidence(entityRecord(it.objectKind,it.objectId))).map(it=>entityTitle(it.objectKind,entityRecord(it.objectKind,it.objectId)));
        const visible=serviceFrameItemsFor(stage.id,'frontstage').map(it=>it.kind==='smart'?entityTitle(it.objectKind,entityRecord(it.objectKind,it.objectId)):it.text).filter(Boolean);
        const card=document.createElement('div');card.className='bo-guided-row';
        card.innerHTML='<span><b>'+esc(stage.title)+'</b><small>Cliente: '+esc(stage.customerAction||'Ação ainda não definida')+'</small><small>Interação visível: '+esc(visible.join(' · ')||'Sem atividade registrada')+'</small><small>Evidências percebidas: '+esc(evidence.join(' · ')||'Sem evidência classificada')+'</small></span>';
        focus.appendChild(card);
      });
      const curve=heading('Curva de emoções','Estados registrados na Jornada (−2 a +2). Trata-se de um mapa de percepção, não de uma pesquisa de satisfação.');
      if(model.emotion.length){
        const points=model.emotion.map((entry,index)=>[model.emotion.length===1?180:24+index*312/(model.emotion.length-1),55-entry.value*17]);
        const svg=document.createElement('div');svg.className='bo-guided-emotion-chart';
        svg.innerHTML='<svg role="img" aria-label="Curva de emoções da Jornada" viewBox="0 0 360 110"><line x1="12" y1="55" x2="348" y2="55" stroke="#cddcec" stroke-dasharray="4 4"/><polyline points="'+points.map(p=>p.join(',')).join(' ')+'"/>'+points.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4"/>').join('')+'</svg>';
        curve.appendChild(svg);
        model.emotion.forEach(entry=>{
          const row=document.createElement('label');row.className='bo-guided-emotion-row';
          row.innerHTML='<span>'+esc(entry.stageTitle)+'</span><input type="range" min="-2" max="2" step="1" value="'+entry.value+'" aria-label="Emoção · '+esc(entry.stageTitle)+'" '+(mobileReadOnly()?'disabled':'')+'><small>'+esc(BLUEPRINT_EMOTION_LABELS[entry.value+2])+'</small>';
          const slider=$('input',row);slider.onchange=()=>{
            if(mobileReadOnly())return;
            const target=graph.stages?.[entry.stageId];if(!target)return;
            const next=Number(slider.value);if(!Number.isInteger(next)||next < -2||next>2)return;
            markEdit('Ajustar emoção na Jornada');
            target.emotionScore=next;target.emotion=next<0?'negative':next>0?'positive':'neutral';
            target.updatedAt=new Date().toISOString();
            if(graph.journeys?.[target.journeyId])graph.journeys[target.journeyId].updatedAt=target.updatedAt;
            graph.service.updatedAt=target.updatedAt;
            save();
            renderAll();
          };
          curve.appendChild(row);
        });
      }else curve.innerHTML+='<p>Sem etapas para representar.</p>';
    }else{
      const quality=heading('Critérios de qualidade percebida','O Blueprint conserva seus critérios de Confiabilidade, Responsividade, Segurança, Empatia e Tangibilidade.');
      quality.innerHTML+='<div class="bo-guided-note">'+model.qualityConfigured+' de '+model.quality.length+' critérios descritos. Indicador de documentação — não é SERVQUAL medido com clientes.</div>';
      const list=document.createElement('div');list.className='bo-guided-progress';
      model.quality.forEach(item=>{const row=document.createElement('div');row.className='bo-guided-row';row.innerHTML='<span><b>'+esc(item.label)+'</b><small>'+(item.configured?'Critério documentado':'Defina como observar esta dimensão')+'</small></span><em>'+(item.configured?'✓':'—')+'</em>';list.appendChild(row)});
      quality.appendChild(list);
      const actions=document.createElement('div');actions.className='bo-guided-actions';
      if(!mobileReadOnly())actions.append(btn('Editar critérios do serviço',()=>{ui.open=false;renderAll();showBlueprintServiceStrategy()},'bo-guided-action'));
      actions.append(btn('Revisão de entrega',()=>{ui.open=false;renderAll();showBlueprintDeliveryReview()},'bo-guided-action'));
      quality.appendChild(actions);
    }
  }

  function blueprintLearningState(){
    meta.blueprintLearningVersion=1;meta.blueprintLearning ||= {mode:'guided',showTips:true,onboardingCompleted:false,onboardingStep:0,learned:{stages:false,lanes:false,lines:false,cells:false}};
    const s=meta.blueprintLearning;s.mode=s.mode==='professional'?'professional':'guided';if(s.showTips===undefined)s.showTips=true;if(s.onboardingCompleted===undefined)s.onboardingCompleted=false;if(!Number.isFinite(s.onboardingStep))s.onboardingStep=0;s.learned ||= {stages:false,lanes:false,lines:false,cells:false};['stages','lanes','lines','cells'].forEach(k=>{if(typeof s.learned[k]!=='boolean')s.learned[k]=false});return s
  }
  const BLUEPRINT_GUIDED_LANES={
    evidence:{label:'O que o cliente vê',technical:'Evidências',hint:'Telas, mensagens, documentos, ambiente e outros sinais percebidos pelo cliente.'},
    customer:{label:'O que o cliente faz',technical:'Customer Action',hint:'A ação ou objetivo do cliente nesta etapa.'},
    frontstage:{label:'Ação visível da equipe',technical:'Frontstage',hint:'O que pessoas ou canais da empresa fazem diante do cliente.'},
    backstage:{label:'Ação de bastidor',technical:'Backstage',hint:'Atividades internas que sustentam a entrega, mas o cliente não vê.'},
    process:{label:'Processos internos',technical:'Support Process',hint:'Fluxos, regras e rotinas que tornam a entrega possível.'},
    system:{label:'Sistemas e ferramentas',technical:'System',hint:'Softwares, integrações e recursos usados pela operação.'}
  };
  const BLUEPRINT_PRO_LANES={
    evidence:{label:'Evidence',technical:'Evidências',hint:'Physical/digital evidence perceived by the customer.'},
    customer:{label:'Customer Action',technical:'Ação do cliente',hint:'Customer behavior in the stage.'},
    frontstage:{label:'Frontstage',technical:'Ação visível',hint:'Customer-visible service actions.'},
    backstage:{label:'Backstage',technical:'Ação de bastidor',hint:'Invisible internal service actions.'},
    process:{label:'Support Process',technical:'Processos internos',hint:'Internal supporting processes and rules.'},
    system:{label:'System',technical:'Sistemas',hint:'Technology and tools that support delivery.'}
  };
  function blueprintLanePresentation(key){const st=blueprintLearningState(),base=blueprintLanes.find(x=>x.key===key)||{key,label:key,hint:'',tone:'slate'},d=(st.mode==='professional'?BLUEPRINT_PRO_LANES:BLUEPRINT_GUIDED_LANES)[key]||{};return{...base,label:d.label||base.label,technical:d.technical||base.label,hint:d.hint||base.hint}}
  function blueprintLinePresentation(kind){const professional=blueprintLearningState().mode==='professional',defs={interaction:{guided:'Linha de interação',professional:'Line of Interaction',body:'Separa o que o cliente faz das ações visíveis da equipe durante a entrega do serviço.'},visibility:{guided:'Linha de visibilidade',professional:'Line of Visibility',body:'Separa aquilo que o cliente consegue perceber das atividades que acontecem nos bastidores.'},internal:{guided:'Linha de interação interna',professional:'Line of Internal Interaction',body:'Separa ações de bastidor dos processos e sistemas internos que sustentam a operação.'}};const d=defs[kind];return d?{label:professional?d.professional:d.guided,body:d.body}:null}
  function blueprintLearningProgress(){const l=blueprintLearningState().learned,done=['stages','lanes','lines','cells'].filter(k=>l[k]).length;return{done,total:4,percent:done*25}}
  function markBlueprintLearned(topic,quiet=false){const s=blueprintLearningState();if(topic&&topic in s.learned)s.learned[topic]=true;save(false);if(!quiet)renderAll()}
  function setBlueprintLearningMode(mode){const s=blueprintLearningState();s.mode=mode==='professional'?'professional':'guided';save(false);renderAll();toast(s.mode==='guided'?'Modo guiado ativado.':'Modo profissional ativado.')}
  function blueprintLearningTopic(topic){const d={stages:{title:'Etapas',text:'Etapas são os grandes momentos da experiência. Journey e Blueprint compartilham a mesma ordem.',example:'Ex.: Descoberta → Contato → Pagamento'},lanes:{title:'Camadas do Blueprint',text:'Cada linha responde a uma pergunta diferente sobre como o serviço é percebido e entregue.',example:'Cliente → Frontstage → Backstage → Processos → Sistemas'},lines:{title:'Linhas do serviço',text:'As linhas mostram onde a responsabilidade e a visibilidade mudam durante a entrega.',example:'A Linha de Visibilidade separa o que o cliente vê do que acontece nos bastidores.'},cells:{title:'Células contextuais',text:'Cada célula já conhece a Etapa e a Camada. Use o + para criar informação diretamente no contexto correto.',example:'Pagamento × Processos → Validar pagamento'}};return d[topic]||null}
  function showBlueprintLearningTopic(topic){const d=blueprintLearningTopic(topic);if(!d)return;markBlueprintLearned(topic,true);const m=modalShell(d.title,'Aprendizado contextual · Service Blueprint');m.box.classList.add('rt185-learning-modal');const card=document.createElement('div');card.className='rt185-learning-topic';card.innerHTML=`<b>${esc(d.title)}</b><p>${esc(d.text)}</p><span>${esc(d.example)}</span>`;m.box.appendChild(card);const foot=document.createElement('div');foot.className='rt156-filter-actions';foot.append(btn('Entendi',()=>{m.root.remove();renderAll()},'primary'));m.box.appendChild(foot)}
  function showBlueprintOnboarding(start=0){
    if(!overlay||(pref().layoutMode||'free')!=='blueprint')return;document.querySelector('.rt185-coachmark')?.remove();$$('.rt185-learning-focus').forEach(x=>x.classList.remove('rt185-learning-focus'));
    const s=blueprintLearningState(),steps=[{topic:'stages',title:'1. Etapas',text:'As colunas representam os momentos da experiência. Journey e Blueprint usam as mesmas Etapas.',selector:'.rt184-sticky-stage'},{topic:'lanes',title:'2. Camadas',text:'Cada lane descreve uma perspectiva da entrega: cliente, frontstage, backstage, processos e sistemas.',selector:'.rt184-sticky-lane'},{topic:'lines',title:'3. Linhas do serviço',text:'As linhas mostram mudanças de interação e visibilidade ao longo da operação.',selector:'.rt184-blueprint-separator'},{topic:'cells',title:'4. Células',text:'Clique no + de uma célula: a Etapa e a Camada já são preenchidas automaticamente.',selector:'.rt184-blueprint-cell'}];
    const idx=clamp(Number(start)||0,0,steps.length-1),step=steps[idx],target=$(step.selector,overlay);if(target)target.classList.add('rt185-learning-focus');const card=document.createElement('div');card.className='rt185-coachmark';card.setAttribute('role','dialog');card.setAttribute('aria-label',`Tutorial Blueprint · ${step.title}`);card.innerHTML=`<div class="rt185-coach-head"><small>${idx+1}/${steps.length}</small><b>${esc(step.title)}</b></div><p>${esc(step.text)}</p><div class="rt185-coach-actions"></div>`;overlay.appendChild(card);
    if(target){const r=target.getBoundingClientRect(),cw=310,ch=170,left=clamp(r.right+14,82,window.innerWidth-cw-18),top=clamp(r.top,76,window.innerHeight-ch-18);card.style.left=left+'px';card.style.top=top+'px'}
    const a=$('.rt185-coach-actions',card);if(idx>0)a.append(btn('Voltar',()=>showBlueprintOnboarding(idx-1)));a.append(btn('Pular',()=>{s.onboardingCompleted=true;s.onboardingStep=steps.length;save(false);card.remove();$$('.rt185-learning-focus').forEach(x=>x.classList.remove('rt185-learning-focus'))}));a.append(btn(idx===steps.length-1?'Concluir':'Próximo',()=>{markBlueprintLearned(step.topic,true);if(idx===steps.length-1){s.onboardingCompleted=true;s.onboardingStep=steps.length;save(false);card.remove();$$('.rt185-learning-focus').forEach(x=>x.classList.remove('rt185-learning-focus'));renderAll()}else{s.onboardingStep=idx+1;save(false);showBlueprintOnboarding(idx+1)}},'primary'))
  }
  function maybeStartBlueprintLearning(){const s=blueprintLearningState();if(s.mode==='guided'&&!s.onboardingCompleted){s.onboardingDeferred=true;save(false,{content:false,label:'Adiar tour do Blueprint'})}}
  function renderBlueprintLearningPanel(body){
    const s=blueprintLearningState(),p=blueprintLearningProgress(),mode=document.createElement('section');mode.className='rt183-doc-section rt185-mode-section';mode.innerHTML=`<div class="rt183-doc-section-head"><div><b>Modo de trabalho</b><span>Altere a linguagem sem mudar nenhum dado do Blueprint.</span></div></div><div class="rt185-mode-switch"><button data-mode="guided">Guiado</button><button data-mode="professional">Profissional</button></div>`;body.appendChild(mode);$$('[data-mode]',mode).forEach(b=>{b.classList.toggle('active',b.dataset.mode===s.mode);b.setAttribute('aria-pressed',String(b.dataset.mode===s.mode));b.onclick=()=>setBlueprintLearningMode(b.dataset.mode)});
    const prog=document.createElement('section');prog.className='rt183-doc-section rt185-progress-section';prog.innerHTML=`<div class="rt183-doc-section-head"><div><b>Aprendizado do Blueprint</b><span>${p.done}/${p.total} conceitos vistos</span></div><em>${p.percent}%</em></div><div class="rt183-progress"><i style="width:${p.percent}%"></i></div>`;const topics=document.createElement('div');topics.className='rt185-learning-list';['stages','lanes','lines','cells'].forEach(k=>{const d=blueprintLearningTopic(k),row=document.createElement('button');row.className=s.learned[k]?'done':'';row.innerHTML=`<i>${s.learned[k]?'✓':'?'}</i><span><b>${esc(d.title)}</b><small>${esc(d.text)}</small></span>`;row.onclick=()=>showBlueprintLearningTopic(k);topics.appendChild(row)});prog.appendChild(topics);prog.appendChild(btn(s.onboardingCompleted?'Rever tour guiado':'Iniciar tour guiado',()=>{showBlueprintDocument=false;renderAll();setTimeout(()=>showBlueprintOnboarding(0),60)},'primary wide'));body.appendChild(prog);
    const tips=document.createElement('section');tips.className='rt183-doc-section';sectionTitle(tips,'Ajuda no canvas');toggle(tips,'Mostrar dicas contextuais',s.showTips!==false,v=>{s.showTips=v;save(false);renderAll()});body.appendChild(tips)
  }
  function blueprintCellItemCount(stageId,laneKey){
    return Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&!(it.kind==='smart'&&it.objectKind==='stage')&&stageForItem(it)===stageId&&laneForItem(it)===laneKey).length;
  }
  function blueprintCellKind(laneKey){return ({evidence:'evidence',customer:'customerAction',frontstage:'frontstage',backstage:'backstage',process:'process',system:'system'})[laneKey]||null}
  function blueprintCellLabel(laneKey){const ln=blueprintLanes.find(x=>x.key===laneKey);return ln?.label||laneKey}
  function showBlueprintLineHelp(kind){
    const d=blueprintLinePresentation(kind);if(!d)return;markBlueprintLearned('lines',true);const m=modalShell(d.label,'Referência rápida do Service Blueprint.');const box=document.createElement('div');box.className='rt184-line-help-copy rt185-line-help-copy';box.innerHTML=`<b>${esc(d.label)}</b><p>${esc(d.body)}</p><span>Essas linhas ajudam a localizar falhas de passagem entre experiência, operação visível e suporte interno.</span>`;m.box.appendChild(box);const foot=document.createElement('div');foot.className='rt156-filter-actions';foot.appendChild(btn('Entendi',()=>{m.root.remove();renderAll()},'primary'));m.box.appendChild(foot)
  }
  function showBlueprintCellAdd(stageId,laneKey){
    const st=graph.stages?.[stageId],ln=blueprintLanePresentation(laneKey);if(!st||!ln)return;markBlueprintLearned('cells',true);
    if(laneKey==='customer'){
      editStageCustomerAction(stageId);
      return;
    }
    const kind=blueprintCellKind(laneKey),label=smartLabel(kind);if(!kind)return;
    const m=modalShell(`Adicionar em ${st.title}` ,`${ln.label} · esta célula já conhece a etapa e a camada do Blueprint.`);m.box.classList.add('rt184-cell-modal');
    const context=document.createElement('div');context.className='rt184-cell-context';context.innerHTML=`<div><small>ETAPA</small><b>${esc(st.title)}</b></div><div><small>CAMADA</small><b>${esc(ln.label)}</b>${blueprintLearningState().mode==='guided'?`<span>${esc(ln.technical)}</span>`:''}</div>`;m.box.appendChild(context);if(blueprintLearningState().mode==='guided'&&blueprintLearningState().showTips!==false){const tip=document.createElement('div');tip.className='rt185-cell-tip';tip.innerHTML=`<b>O que colocar aqui?</b><span>${esc(ln.hint)}</span>`;m.box.appendChild(tip)}
    const actions=document.createElement('div');actions.className='rt184-cell-modal-actions';
    actions.appendChild(btn(`＋ Criar ${label}`,()=>{m.root.remove();addBlueprintEntity(kind,stageId)},'primary'));
    actions.appendChild(btn('Cancelar',()=>m.root.remove()));m.box.appendChild(actions)
  }
  function renderBlueprintStickyGuides(wrap){
    if(pref().layoutMode==='service'){renderServiceFrameStickyGuides(wrap);return}
    if((pref().layoutMode||'free')!=='blueprint')return;const m=blueprintMetrics(),width=wrap.clientWidth||window.innerWidth||1366,rightPad=(showBlueprintDocument&&!showInspector?360:12),leftRail=72,usableRight=Math.max(leftRail+220,width-rightPad);
    const naturalHeaderY=pan.y+70*zoom,naturalLaneX=pan.x+90*zoom;
    const stickHeads=naturalHeaderY<58,stickLanes=naturalLaneX<leftRail;
    if(!stickHeads&&!stickLanes)return;
    const layer=document.createElement('div');layer.className='rt184-sticky-layer';wrap.appendChild(layer);
    if(stickHeads&&stickLanes){const corner=document.createElement('div');corner.className='rt184-sticky-corner';corner.innerHTML=`<small>BLUEPRINT · ${blueprintLearningState().mode==='guided'?'GUIADO':'PRO'}</small><b>${blueprintLearningState().mode==='guided'?'Etapas × operação':'Stages × operations'}</b>`;layer.appendChild(corner)}
    if(stickHeads){const heads=document.createElement('div');heads.className='rt184-sticky-heads';layer.appendChild(heads);m.stages.forEach((st,i)=>{const x=pan.x+(m.left+i*m.colW)*zoom,w=m.colW*zoom;if(x+w<leftRail||x>usableRight)return;const h=document.createElement('div');h.className='rt184-sticky-stage';h.style.left=Math.max(leftRail,x)+'px';h.style.width=Math.max(88,Math.min(w,usableRight-Math.max(leftRail,x)))+'px';h.innerHTML=`<small>ETAPA ${String(i+1).padStart(2,'0')}</small><b>${esc(st.title)}</b>`;heads.appendChild(h)})}
    if(stickLanes){const lanes=document.createElement('div');lanes.className='rt184-sticky-lanes';layer.appendChild(lanes);blueprintLanes.forEach((base,i)=>{const ln=blueprintLanePresentation(base.key);if(viewVisibility('blueprint').hiddenLanes.includes(ln.key))return;const y=pan.y+m.rowTops[i]*zoom,h=m.laneHeights[i]*zoom;if(y+h<52||y>wrap.clientHeight-48)return;const lab=document.createElement('div');lab.className='rt184-sticky-lane';lab.style.top=Math.max(58,y)+'px';lab.style.height=Math.max(38,Math.min(h,(wrap.clientHeight||800)-Math.max(58,y)-48))+'px';lab.innerHTML=`<i style="background:${tone[ln.tone]}"></i><div><b>${esc(ln.label)}</b><span>${blueprintLearningState().showTips!==false?esc(ln.hint):''}</span></div>`;lanes.appendChild(lab)})}
  }
  function renderViewStructure(canvas){
    const mode=pref().layoutMode||'free';
    if(mode==='service'){
      renderServiceCompositionStructure(canvas);
    } else if(mode==='blueprint'){
      const m=blueprintMetrics(),root=document.createElement('div');root.className='rt1410-blueprint-grid rt154-blueprint-grid';root.style.left='90px';root.style.top='70px';root.style.width=m.width+'px';root.style.height=m.totalHeight+'px';
      const corner=document.createElement('div');corner.className='rt1410-matrix-corner rt185-matrix-corner';corner.innerHTML=`<b>Service Blueprint</b><span>${blueprintLearningState().mode==='guided'?'Etapas × como o serviço é entregue':'Stages × service operations'}</span>${blueprintLearningState().mode==='guided'?'<button type="button" class="rt185-learn-inline">? Como usar</button>':''}`;root.appendChild(corner);const learnInline=$('.rt185-learn-inline',corner);if(learnInline)learnInline.onclick=e=>{e.preventDefault();e.stopPropagation();showBlueprintDocument=true;blueprintDocumentTab='learning';renderAll()};
      m.stages.forEach((st,i)=>{const col=document.createElement('div');col.className='rt1410-stage-column rt156-structured-column rt184-stage-column';col.dataset.columnId=st.id;col.style.left=(m.left-90+i*m.colW)+'px';col.style.width=m.colW+'px';col.style.height='100%';col.innerHTML=`<div class="rt1410-stage-caption rt184-stage-caption"><small>ETAPA ${String(i+1).padStart(2,'0')}</small><b>${esc(st.title)}</b><span>${esc(st.customerAction||'Ação do cliente ainda não descrita')}</span><button type="button" class="rt1812-stage-build ${stageFlowReport(st.id)?.continuous?'is-ready':''}">${stageFlowReport(st.id)?.continuous?'Etapa conectada':'Fluxo · '+(stageFlowReport(st.id)?.flowPercent??0)+'%'}</button>${i<m.stages.length-1?'<span class="rt1813-stage-next">→</span>':''}</div>`;col.querySelector('.rt1812-stage-build').onclick=e=>{e.preventDefault();e.stopPropagation();showStageFlowBuilder(st.id)};root.appendChild(col)});
      blueprintLanes.forEach((base,r)=>m.stages.forEach((st,c)=>{const ln=blueprintLanePresentation(base.key),count=blueprintCellItemCount(st.id,ln.key),cell=document.createElement('div');cell.className='rt156-structured-cell rt184-blueprint-cell '+(count?'has-content':'is-empty');cell.dataset.cellId=`blueprint:${st.id}:${ln.key}`;cell.dataset.columnId=st.id;cell.dataset.laneKey=ln.key;cell.dataset.count=String(count);cell.style.left=(m.left-90+c*m.colW)+'px';cell.style.top=(m.rowTops[r]-70)+'px';cell.style.width=m.colW+'px';cell.style.height=m.laneHeights[r]+'px';if(viewVisibility('blueprint').hiddenLanes.includes(ln.key))cell.classList.add('hidden-structure');const add=document.createElement('button');add.type='button';add.className='rt184-cell-add';add.setAttribute('aria-label',`Adicionar em ${st.title} · ${ln.label}`);add.innerHTML=`<strong>＋</strong><span>${esc(ln.label)}</span>${count?`<em>${count} ${count===1?'item':'itens'}</em>`:'<em>Adicionar</em>'}`;add.onclick=e=>{e.preventDefault();e.stopPropagation();showBlueprintCellAdd(st.id,ln.key)};cell.appendChild(add);const healthGap=blueprintHealthState().showMarkers!==false?blueprintHealthGapForCell(st.id,ln.key):null;if(healthGap){cell.classList.add('rt186-health-gap','rt186-health-'+healthGap.severity);const flag=document.createElement('button');flag.type='button';flag.className='rt186-gap-flag';flag.title=healthGap.title;flag.setAttribute('aria-label',healthGap.title);flag.textContent='!';flag.onclick=e=>{e.preventDefault();e.stopPropagation();closeEditorSidePanels('blueprint');showBlueprintDocument=true;blueprintDocumentTab='health';renderAll()};cell.appendChild(flag)}root.appendChild(cell)}));
      blueprintLanes.forEach((base,i)=>{const ln=blueprintLanePresentation(base.key),row=document.createElement('div');row.className='rt1410-lane-row rt156-structured-lane rt184-lane-row lane-'+ln.key+(viewVisibility('blueprint').hiddenLanes.includes(ln.key)?' hidden-structure':'');row.dataset.laneKey=ln.key;row.style.top=(m.rowTops[i]-70)+'px';row.style.height=m.laneHeights[i]+'px';row.innerHTML=`<div class="rt1410-lane-label rt184-lane-label rt185-lane-label"><i style="background:${tone[ln.tone]}"></i><b>${esc(ln.label)}</b>${blueprintLearningState().mode==='guided'?`<em>${esc(ln.technical)}</em>`:''}<span>${blueprintLearningState().showTips!==false?esc(ln.hint):''}</span>${blueprintLearningState().mode==='guided'?`<button type="button" class="rt185-lane-help" aria-label="Aprender sobre ${esc(ln.label)}">?</button>`:''}</div>`;const hb=$('.rt185-lane-help',row);if(hb)hb.onclick=e=>{e.preventDefault();e.stopPropagation();markBlueprintLearned('lanes',true);showBlueprintLearningTopic('lanes')};root.appendChild(row)});
      const separators=[{after:1,kind:'interaction'},{after:2,kind:'visibility'},{after:3,kind:'internal'}];if(blueprintStudioState().showServiceLines!==false)separators.forEach(sp=>{const lp=blueprintLinePresentation(sp.kind),line=document.createElement('div');line.className='rt1410-blueprint-line rt154-blueprint-separator rt184-blueprint-separator';line.style.top=(m.rowTops[sp.after]-70-10)+'px';line.innerHTML=`<span>${esc(lp.label)}<button type="button" class="rt184-line-help" aria-label="Explicar ${esc(lp.label)}">?</button></span>`;const hb=line.querySelector('.rt184-line-help');hb.onclick=e=>{e.preventDefault();e.stopPropagation();showBlueprintLineHelp(sp.kind)};root.appendChild(line)});
      canvas.appendChild(root);
    } else if(mode==='journey'){
      const m=journeyMetrics(),root=document.createElement('div');root.className='rt154-journey-grid';root.style.left='90px';root.style.top='70px';root.style.width=m.width+'px';root.style.height=m.totalHeight+'px';
      const corner=document.createElement('div');corner.className='rt154-journey-corner';corner.innerHTML=`<b>Jornada do Cliente</b><span>Customer Journey · etapas × experiência</span><em>Persona: ${esc(personaTitle(journeyPrimitiveState().activePersonaId))} · ${esc(journeyPrimitiveState().stateMode==='compare'?'Atual × Futuro':journeyStateLabel(journeyPrimitiveState().stateMode))}</em>`;root.appendChild(corner);
      m.stages.forEach((st,i)=>{const col=document.createElement('div');col.className='rt154-journey-column rt156-structured-column';col.dataset.columnId=st.id;col.style.left=(m.left-90+i*m.colW)+'px';col.style.width=m.colW+'px';col.style.height='100%';const stateMode=journeyPrimitiveState().stateMode||'current',currentAction=st.customerAction||'—',futureAction=st.futureCustomerAction||'Defina a ação desejada no Futuro';col.innerHTML=`<div class="rt154-stage-caption"><small>ETAPA ${String(i+1).padStart(2,'0')}</small><b>${esc(st.title)}</b><button type="button" class="rt1812-stage-build ${stageFlowReport(st.id)?.continuous?'is-ready':''}">${stageFlowReport(st.id)?.continuous?'Etapa conectada':'Fluxo · '+(stageFlowReport(st.id)?.flowPercent??0)+'%'}</button>${i<m.stages.length-1?'<span class="rt1813-stage-next">→</span>':''}</div><div class="rt154-action-cell rt1814-state-${stateMode}"><small>AÇÃO DO CLIENTE · ${stateMode==='future'?'FUTURO':stateMode==='compare'?'ATUAL × FUTURO':'ATUAL'}</small>${stateMode==='compare'?`<span class="rt1814-current-action"><em>Atual</em>${esc(currentAction)}</span><span class="rt1814-future-action"><em>Futuro</em>${esc(futureAction)}</span>`:`<span>${esc(stateMode==='future'?futureAction:currentAction)}</span>`}</div>`;col.querySelector('.rt1812-stage-build').onclick=e=>{e.preventDefault();e.stopPropagation();showStageFlowBuilder(st.id)};root.appendChild(col)});
      journeyLanes.forEach((ln,r)=>m.stages.forEach((st,c)=>{const cell=document.createElement('div');cell.className='rt156-structured-cell';cell.dataset.cellId=`journey:${st.id}:${ln.key}`;cell.dataset.columnId=st.id;cell.dataset.laneKey=ln.key;cell.style.left=(m.left-90+c*m.colW)+'px';cell.style.top=(m.rowTops[r]-70)+'px';cell.style.width=m.colW+'px';cell.style.height=m.laneHeights[r]+'px';if(viewVisibility('journey').hiddenLanes.includes(ln.key))cell.classList.add('hidden-structure');if(ln.key!=='other'){const addKind=({touchpoint:'touchpoint',need:'need',emotion:'emotion',evidence:'evidence',problem:'problem',opportunity:'opportunity',metric:'metric'})[ln.key],addLabel=({touchpoint:'Ponto de contato',need:'Necessidade',emotion:'Emoção',evidence:'Evidência',problem:'Problema',opportunity:'Oportunidade',metric:'Métrica'})[ln.key]||'Item';const add=btn('＋ '+addLabel,()=>addJourneyEntity(addKind,st.id),'rt188-journey-cell-add');add.setAttribute('aria-label',`Adicionar em ${st.title} · ${ln.label}`);cell.appendChild(add)}root.appendChild(cell)}));
      journeyLanes.forEach((ln,i)=>{const row=document.createElement('div');row.className='rt154-journey-lane rt156-structured-lane lane-'+ln.key+(viewVisibility('journey').hiddenLanes.includes(ln.key)?' hidden-structure':'');row.dataset.laneKey=ln.key;row.style.top=(m.rowTops[i]-70)+'px';row.style.height=m.laneHeights[i]+'px';row.innerHTML=`<div class="rt154-journey-label"><i style="background:${tone[ln.tone]}"></i><b>${esc(journeyLaneTitle(ln))}</b><span>${esc(ln.hint)}</span></div>`;root.appendChild(row)});renderEmotionCurve(root,m);canvas.appendChild(root);
    } else if(mode==='flow'){
      const root=document.createElement('div');root.className='rt154-flow-guide rt1551-flow-guide';const iso=viewEnginePref().isolatedStart;root.innerHTML=`<b>Fluxo de serviço</b><span>${viewEnginePref().flowDirection==='vertical'?'Sequência vertical':'Sequência horizontal'} · componentes conectados são organizados separadamente · zero sobreposição automática</span>`;canvas.appendChild(root);if(iso?.count){const label=document.createElement('div');label.className='rt1551-isolated-label';label.style.left=iso.x+'px';label.style.top=iso.y+'px';label.innerHTML=`<b>Sem conexões</b><span>${iso.count} objeto${iso.count===1?'':'s'} fora do fluxo conectado</span>`;canvas.appendChild(label)}
    }
  }
  function currentDropContainer(){
    if(!drag||drag.type!=='items')return null;const it=board().items[drag.primary];if(!it)return null;const candidates=Object.values(board().items).filter(f=>isContainer(f)&&f.id!==it.id&&!isCollapsed(f)&&!wouldCreateContainerCycle(it.id,f.id)&&frameContains(f,it)).sort((a,b)=>a.width*a.height-b.width*b.height);return candidates[0]?.id||null;
  }
  function updateSaveIndicator(){
    const el=overlay&&$('.rt1410-save',overlay);if(!el)return;
    el.textContent=saveState==='error'?'Erro ao salvar':saveState==='saving'?'Salvando…':persistence.durableState==='pending'?'Salvo no dispositivo · protegendo…':'Salvo neste dispositivo';
    el.classList.toggle('saving',saveState==='saving'||persistence.durableState==='pending');el.classList.toggle('error',saveState==='error');
    el.title=persistence.error||'Suas alterações estão neste navegador. Exporte um backup para guardar outra cópia.';
  }
  function invalidateViewLayout(mode=pref().layoutMode||'free'){delete viewLayouts()[mode]}
  function smartLayoutSnapshot(){meta.smartLayoutSnapshots ||= {};return meta.smartLayoutSnapshots[boardId]||null}
  function smartLayoutPref(){meta.smartLayoutPrefs ||= {};return meta.smartLayoutPrefs[boardId] ||= {scope:'selection',density:'normal'}}
  function smartSpacing(density){return density==='compact'?28:density==='spacious'?84:52}
  function smartLayoutBaseItems(scope='selection'){
    const source=scope==='selection'?selected:visibleItems().map(it=>it.id),ids=new Set();
    source.forEach(id=>{const it=board().items[id];if(!it)return;if(isContainer(it)){descendantsOf(id).forEach(cid=>{const ch=board().items[cid];if(ch&&!isContainer(ch)&&!isHidden(ch)&&!isLocked(ch))ids.add(cid)})}else if(!isHidden(it)&&!isLocked(it))ids.add(id)});
    return [...ids].map(id=>board().items[id]).filter(Boolean);
  }
  function smartLayoutGroups(items){
    const map=new Map();items.forEach(it=>{const p=parentFrame(it.id)||'__root';if(!map.has(p))map.set(p,[]);map.get(p).push(it)});return [...map.entries()]
  }
  function smartLayoutBounds(items){
    if(!items.length)return{x:180,y:180,w:0,h:0};const minX=Math.min(...items.map(i=>i.x)),minY=Math.min(...items.map(i=>i.y)),maxX=Math.max(...items.map(i=>i.x+i.width)),maxY=Math.max(...items.map(i=>i.y+i.height));return{x:minX,y:minY,w:maxX-minX,h:maxY-minY}
  }
  function smartOrigin(items,parentId){
    const b=smartLayoutBounds(items);if(parentId&&parentId!=='__root'&&board().items[parentId]){const f=board().items[parentId],pad=containerPadding(f);return{x:f.x+pad,y:f.y+pad+38}}return{x:Math.max(120,b.x),y:Math.max(120,b.y)}
  }
  function smartOrder(items){return [...items].sort((a,b)=>a.y-b.y||a.x-b.x||String(a.id).localeCompare(String(b.id)))}
  function edgeOrder(items){
    const ids=new Set(items.map(i=>i.id)),inside=Object.values(board().edges||{}).filter(e=>ids.has(e.fromId)&&ids.has(e.toId)),ind=new Map(items.map(i=>[i.id,0])),next=new Map(items.map(i=>[i.id,[]]));inside.forEach(e=>{ind.set(e.toId,(ind.get(e.toId)||0)+1);next.get(e.fromId)?.push(e.toId)});const base=smartOrder(items),q=base.filter(i=>(ind.get(i.id)||0)===0).map(i=>i.id),out=[];while(q.length){const id=q.shift();if(out.includes(id))continue;out.push(id);(next.get(id)||[]).forEach(n=>{ind.set(n,(ind.get(n)||0)-1);if((ind.get(n)||0)<=0)q.push(n)})}base.forEach(i=>{if(!out.includes(i.id))out.push(i.id)});return out.map(id=>board().items[id]).filter(Boolean)
  }
  function treeLevels(items){
    const ids=new Set(items.map(i=>i.id)),inside=Object.values(board().edges||{}).filter(e=>ids.has(e.fromId)&&ids.has(e.toId)),incoming=new Map(items.map(i=>[i.id,0])),children=new Map(items.map(i=>[i.id,[]]));inside.forEach(e=>{incoming.set(e.toId,(incoming.get(e.toId)||0)+1);children.get(e.fromId)?.push(e.toId)});let roots=smartOrder(items).filter(i=>(incoming.get(i.id)||0)===0).map(i=>i.id);if(!roots.length&&items.length)roots=[smartOrder(items)[0].id];const level=new Map(roots.map(id=>[id,0])),q=[...roots];while(q.length){const id=q.shift(),lv=level.get(id)||0;(children.get(id)||[]).forEach(ch=>{const nv=Math.max(level.get(ch)??0,lv+1);if((level.get(ch)??-1)<nv){level.set(ch,nv);q.push(ch)}})}smartOrder(items).forEach((it,i)=>{if(!level.has(it.id))level.set(it.id,Math.floor(Math.log2(i+1)))});const groups=new Map();items.forEach(it=>{const lv=level.get(it.id)||0;if(!groups.has(lv))groups.set(lv,[]);groups.get(lv).push(it)});return [...groups.entries()].sort((a,b)=>a[0]-b[0])
  }
  function positionSmartGroup(items,type,density,parentId){
    if(!items.length)return;const gap=smartSpacing(density),origin=smartOrigin(items,parentId),ordered=smartOrder(items),maxW=Math.max(...items.map(i=>i.width||220)),maxH=Math.max(...items.map(i=>i.height||120));
    if(type==='grid'){const cols=Math.max(1,Math.ceil(Math.sqrt(items.length*1.35)));ordered.forEach((it,i)=>{it.x=origin.x+(i%cols)*(maxW+gap);it.y=origin.y+Math.floor(i/cols)*(maxH+gap)})}
    else if(type==='row'){let x=origin.x;ordered.forEach(it=>{it.x=x;it.y=origin.y;x+=it.width+gap})}
    else if(type==='column'){let y=origin.y;ordered.forEach(it=>{it.x=origin.x;it.y=y;y+=it.height+gap})}
    else if(type==='flow'){let x=origin.x,y=origin.y,rowH=0;edgeOrder(items).forEach((it,i)=>{if(i&&i%6===0){x=origin.x;y+=rowH+gap*1.5;rowH=0}it.x=x;it.y=y;x+=it.width+gap*1.25;rowH=Math.max(rowH,it.height)})}
    else if(type==='tree'){treeLevels(items).forEach(([lv,nodes])=>{let y=origin.y;const colX=origin.x+lv*(maxW+gap*1.8);smartOrder(nodes).forEach(it=>{it.x=colX;it.y=y;y+=it.height+gap})})}
    else if(type==='radial'){const cx=origin.x+Math.max(340,items.length*34),cy=origin.y+Math.max(280,items.length*26),rx=Math.max(260,items.length*34),ry=Math.max(190,items.length*24);ordered.forEach((it,i)=>{const a=-Math.PI/2+(Math.PI*2*i/items.length);it.x=cx+Math.cos(a)*rx-it.width/2;it.y=cy+Math.sin(a)*ry-it.height/2})}
    else if(type==='journey'){const stages=orderedStages(),si=new Map(stages.map((st,i)=>[st.id,i])),counts={};ordered.forEach(it=>{const c=Math.max(0,si.get(stageForItem(it))??0),r=it.kind==='smart'?(it.objectKind==='stage'?0:it.objectKind==='touchpoint'?1:it.objectKind==='problem'?2:it.objectKind==='opportunity'?3:4):4,k=c+':'+r,n=counts[k]||0;counts[k]=n+1;it.x=origin.x+c*(maxW+gap*1.4);it.y=origin.y+r*(maxH+gap*1.25)+n*(it.height+18)})}
    else if(type==='swimlane'){const lanes=['evidence','customer','frontstage','backstage','process','system'],li=new Map(lanes.map((x,i)=>[x,i])),counts={};ordered.forEach(it=>{const r=Math.max(0,li.get(laneForItem(it))??1),n=counts[r]||0;counts[r]=n+1;it.x=origin.x+n*(maxW+gap);it.y=origin.y+r*(maxH+gap*1.25)})}
    resolveLayoutCollisions(items,type==='row'||type==='flow'||type==='tree'?'vertical':'horizontal');
    if(parentId&&parentId!=='__root'&&board().items[parentId])ensureContainerFits(parentId,false)
  }
  function captureSmartLayout(ids,type,scope,density){
    const captureIds=new Set(ids);ids.forEach(id=>ancestorFrames(id).forEach(pid=>captureIds.add(pid)));const items={};captureIds.forEach(id=>{const it=board().items[id];if(it)items[id]={x:it.x,y:it.y,width:it.width,height:it.height,parentId:parentFrame(id)||null}});meta.smartLayoutSnapshots[boardId]={at:new Date().toISOString(),mode:pref().layoutMode||'free',type,scope,density,targetIds:[...ids],items}
  }
  function restoreSmartLayout(){
    const snap=smartLayoutSnapshot();if(!snap?.items){toast('Ainda não existe um layout anterior para restaurar.');return}markEdit('Restaurar layout anterior');if(snap.mode)pref().layoutMode=snap.mode;Object.entries(snap.items).forEach(([id,pos])=>{const it=board().items[id];if(!it)return;it.x=pos.x;it.y=pos.y;if(Number.isFinite(pos.width))it.width=pos.width;if(Number.isFinite(pos.height))it.height=pos.height;setParentFrame(id,pos.parentId&&board().items[pos.parentId]?pos.parentId:null)});selected=(snap.targetIds||Object.keys(snap.items)).filter(id=>board().items[id]);save();setTimeout(()=>selected.length?fitSelection():fit(),0);toast('Posições anteriores restauradas.')
  }
  function applySmartLayout(type,scope='selection',density='normal'){
    const items=smartLayoutBaseItems(scope);if(items.length<2){toast(scope==='selection'?'Selecione pelo menos dois objetos desbloqueados.':'O quadro precisa de pelo menos dois objetos desbloqueados.');return false}markEdit('Smart Layout · '+({grid:'Grade',row:'Linha',column:'Coluna',flow:'Fluxo',tree:'Árvore',journey:'Journey',swimlane:'Swimlane',radial:'Radial'})[type]);captureSmartLayout(items.map(i=>i.id),type,scope,density);smartLayoutGroups(items).forEach(([parentId,group])=>positionSmartGroup(group,type,density,parentId));selected=items.map(i=>i.id);meta.smartLayoutPrefs[boardId]={scope,density,lastType:type};invalidateViewLayout(pref().layoutMode||'free');save();setTimeout(()=>scope==='selection'?fitSelection():fit(),0);toast('Smart Layout aplicado. Use “Restaurar layout anterior” se quiser voltar.');return true
  }
  function smartPreviewCoords(type){
    const pts={grid:[[14,18],[43,18],[72,18],[14,50],[43,50],[72,50]],row:[[7,36],[24,36],[41,36],[58,36],[75,36],[92,36]],column:[[48,4],[48,20],[48,36],[48,52],[48,68],[48,84]],flow:[[7,24],[27,24],[47,24],[67,24],[87,24],[47,66]],tree:[[8,45],[34,18],[34,72],[65,8],[65,32],[65,62],[65,86]],journey:[[12,14],[38,14],[64,14],[12,45],[38,45],[64,45],[38,76]],swimlane:[[12,14],[42,14],[72,14],[22,44],[54,44],[12,76],[42,76],[72,76]],radial:[[48,8],[78,24],[88,54],[68,80],[32,80],[8,54],[18,24],[48,48]]};return pts[type]||pts.grid
  }
  function openSmartLayout(){
    const sp=smartLayoutPref(),m=modalShell('Smart Layout','Organize objetos automaticamente sem perder a possibilidade de voltar às posições anteriores.');m.box.classList.add('rt152-layout-modal');const top=document.createElement('div');top.className='rt152-layout-options';top.innerHTML=`<label><span>Aplicar em</span><select class="rt152-scope"><option value="selection">Seleção</option><option value="board">Quadro inteiro</option></select></label><label><span>Espaçamento</span><select class="rt152-density"><option value="compact">Compacto</option><option value="normal">Equilibrado</option><option value="spacious">Amplo</option></select></label>`;m.box.appendChild(top);const scope=$('.rt152-scope',top),density=$('.rt152-density',top);scope.value=selected.length>=2?(sp.scope||'selection'):'board';density.value=sp.density||'normal';if(selected.length<2)scope.querySelector('option[value="selection"]').disabled=true;
    const defs=[['grid','Grade','Equilibra os objetos em linhas e colunas.'],['row','Linha','Organiza tudo em uma única linha.'],['column','Coluna','Empilha os objetos verticalmente.'],['flow','Fluxo','Respeita conexões e cria uma sequência legível.'],['tree','Árvore','Distribui relações por níveis hierárquicos.'],['journey','Journey','Usa etapas como colunas e tipos como lanes.'],['swimlane','Swimlane','Agrupa por camada operacional do serviço.'],['radial','Radial','Distribui os objetos ao redor de um centro.']];const grid=document.createElement('div');grid.className='rt152-layout-grid';defs.forEach(([id,name,desc])=>{const card=document.createElement('button');card.className='rt152-layout-card';const preview=document.createElement('span');preview.className='rt152-layout-preview';smartPreviewCoords(id).forEach(([x,y],i)=>{const dot=document.createElement('i');dot.style.left=x+'%';dot.style.top=y+'%';if(i===0)dot.classList.add('root');preview.appendChild(dot)});const copy=document.createElement('span');copy.className='rt152-layout-copy';copy.innerHTML=`<b>${name}</b><small>${desc}</small>`;card.append(preview,copy);card.onclick=()=>{const ok=applySmartLayout(id,scope.value,density.value);if(ok)m.root.remove()};grid.appendChild(card)});m.box.appendChild(grid);const foot=document.createElement('div');foot.className='rt152-layout-foot';const prev=smartLayoutSnapshot();const restore=btn('Restaurar layout anterior',()=>{m.root.remove();restoreSmartLayout()},'');restore.disabled=!prev?.items;foot.append(restore,btn('Cancelar',()=>m.root.remove()));m.box.appendChild(foot)
  }
  function groups(){return meta.groups[boardId] ||= {}}
  function frameParents(){return meta.frameParents[boardId] ||= {}}
  function itemGroup(id){return groups()[id]||null}
  function setGroup(id,g){ if(g) groups()[id]=g; else delete groups()[id]; }
  function parentFrame(id){return frameParents()[id]||null}
  function setParentFrame(id,f){ if(f&&f!==id) frameParents()[id]=f; else delete frameParents()[id]; }
  function isFrame(it){return it?.kind==='free'&&it.shape==='frame'}
  function isContainer(it){return isFrame(it)}
  function containerType(it){return isContainer(it)?(it.containerType||'frame'):null}
  function containerLabel(it){return ({frame:'Frame',section:'Section',swimlane:'Swimlane'})[containerType(it)]||'Frame'}
  function containerPadding(it){const n=Number(it?.padding);return Number.isFinite(n)?clamp(n,8,96):24}
  function childrenOf(id){return Object.keys(frameParents()).filter(cid=>frameParents()[cid]===id&&board().items[cid])}
  function descendantsOf(id){const out=[],seen=new Set();const walk=pid=>childrenOf(pid).forEach(cid=>{if(seen.has(cid))return;seen.add(cid);out.push(cid);if(isContainer(board().items[cid]))walk(cid)});walk(id);return out}
  function ancestorFrames(id){const out=[],seen=new Set();let p=parentFrame(id);while(p&&board().items[p]&&!seen.has(p)){seen.add(p);out.push(p);p=parentFrame(p)}return out}
  function isCollapsed(it){return !!it?.collapsed}
  function isStructurallyHidden(it){return ancestorFrames(it.id).some(id=>{const a=board().items[id];return isCollapsed(a)||isHidden(a)})}
  function isHidden(it){return !!it?.hidden}
  function isLocked(it){return !!it?.locked}
  function itemZ(it){return Number.isFinite(it?.z)?it.z:0}
  function visibleItems(){return Object.values(board().items).filter(it=>!isHidden(it)&&!isStructurallyHidden(it)&&itemPassesActiveView(it))}
  function normalizeContainers(){
    if(!board())return;
    Object.values(board().items).filter(isContainer).forEach(it=>{it.containerType ||= laneNames.includes(it.text)?'swimlane':'frame';it.padding=containerPadding(it);if(typeof it.autoResize!=='boolean')it.autoResize=false;if(typeof it.collapsed!=='boolean')it.collapsed=false;if(it.collapsed&&!Number.isFinite(it.expandedHeight))it.expandedHeight=Math.max(180,it.height||340)});
    Object.keys(frameParents()).forEach(id=>{const p=frameParents()[id];if(!board().items[id]||!board().items[p]||!isContainer(board().items[p])||id===p)delete frameParents()[id]});
    Object.keys(frameParents()).forEach(id=>{const seen=new Set([id]);let p=parentFrame(id);while(p){if(seen.has(p)){delete frameParents()[id];break}seen.add(p);p=parentFrame(p)}});
  }
  function normalizeLayers(){
    if(!board())return;const items=Object.values(board().items);let next=0;
    [...items.filter(isFrame),...items.filter(it=>!isFrame(it))].forEach(it=>{if(!Number.isFinite(it.z))it.z=next;next=Math.max(next,it.z+1)});
  }
  function normalizeEdges(){
    if(!board())return;
    Object.values(board().edges||{}).forEach(ed=>{
      ed.route ||= 'curve';
      ed.fromHandle ||= 'auto';
      ed.toHandle ||= 'auto';
      if(!('waypoint' in ed))ed.waypoint=null;
      ed.style ||= 'solid';
      ed.arrow ||= 'end';
    });
  }
  function visualKind(it){
    if(!it)return 'card';
    if(it.kind==='smart')return it.presentation?.visualKind||'card';
    if(isContainer(it))return containerType(it)||'frame';
    if(it.visualKind)return it.visualKind;
    if(it.shape==='text')return 'text';
    if(it.shape==='shape')return 'shape';
    if(it.shape==='image')return 'image';
    if(it.shape==='link')return 'link';
    if(it.shape==='file')return 'file';
    if(it.shape==='icon')return 'icon';
    if(it.shape==='card')return 'card';
    return it.semantic==='note'?'note':'card';
  }
  function normalizeVisualItems(){
    if(!board())return;
    Object.values(board().items).forEach(it=>{
      if(it.kind!=='free'||isContainer(it))return;
      it.visualKind ||= visualKind(it);
      if(it.visualKind==='text')it.textStyle ||= {variant:'body',align:'left',bold:false,italic:false};
      if(it.visualKind==='note'){if(!Array.isArray(it.tags))it.tags=[];if(typeof it.checked!=='boolean')it.checked=false;it.noteSize ||= 'medium'}
      if(it.visualKind==='card'){it.description ||= '';it.status ||= '';it.badge ||= ''}
      if(it.visualKind==='shape'){it.shapeStyle ||= 'rounded'}
      if(it.visualKind==='image'){it.caption ||= '';it.asset ||= {name:'Imagem',dataUrl:'',mime:'image/*'}}
      if(it.visualKind==='link'){it.link ||= {url:'https://',title:it.text||'Link',domain:''}}
      if(it.visualKind==='linked'){it.linkedRef ||= null}
      if(it.visualKind==='file'){it.asset ||= {name:it.text||'Arquivo',mime:'application/octet-stream',size:0}}
      if(it.visualKind==='icon'){it.icon ||= '★';it.iconLabel ||= it.text||'Ícone'}
    });
  }
  function visualLabel(it){
    if(!it)return 'Objeto';
    if(it.kind==='smart')return smartLabel(it.objectKind);
    if(isContainer(it))return containerLabel(it);
    return ({note:'Post-it',text:'Texto',shape:'Forma',card:'Card',image:'Imagem',link:'Link',linked:'Objeto vinculado',file:'Arquivo',icon:'Ícone'})[visualKind(it)]||freeLabel(it.semantic||'note');
  }
  function semanticKind(it){return it?.kind==='smart'?(it.objectKind||'object'):(it?.semantic||visualKind(it)||'object')}
  function semanticLabel(it){return it?.kind==='smart'?smartLabel(it.objectKind):freeLabel(it?.semantic||visualKind(it))}
  function urlDomain(url){try{return new URL(url).hostname.replace(/^www\./,'')}catch{return ''}}
  function renderRichText(text,style={}){
    const safe=esc(text||'Texto').replace(/\n/g,'<br>');
    return `<div class="rt149-rich variant-${esc(style.variant||'body')} align-${esc(style.align||'left')}${style.bold?' bold':''}${style.italic?' italic':''}">${safe}</div>`;
  }
  function maxZ(){const xs=Object.values(board().items).map(itemZ);return xs.length?Math.max(...xs):0}
  function minZ(){const xs=Object.values(board().items).map(itemZ);return xs.length?Math.min(...xs):0}
  function setVisibility(id,visible){markEdit(visible?'Mostrar objeto':'Ocultar objeto');const it=board().items[id];if(!it)return;it.hidden=!visible;if(it.hidden){selected=selected.filter(x=>x!==id);if(selectedEdge){const e=board().edges[selectedEdge];if(e&&(e.fromId===id||e.toId===id))selectedEdge=null}}save()}
  function setLocked(id,locked){markEdit(locked?'Bloquear objeto':'Desbloquear objeto');const it=board().items[id];if(!it)return;it.locked=locked;save()}
  function arrange(id,mode){markEdit('Alterar ordem de camada');const it=board().items[id];if(!it)return;const peers=Object.values(board().items).filter(x=>isFrame(x)===isFrame(it)).sort((a,b)=>itemZ(a)-itemZ(b));const idx=peers.findIndex(x=>x.id===id);if(idx<0)return;
    if(mode==='front')it.z=Math.max(...peers.map(itemZ),itemZ(it))+1;
    else if(mode==='back')it.z=Math.min(...peers.map(itemZ),itemZ(it))-1;
    else if(mode==='forward'&&idx<peers.length-1){const n=peers[idx+1],z=it.z;it.z=n.z; n.z=z}
    else if(mode==='backward'&&idx>0){const n=peers[idx-1],z=it.z;it.z=n.z;n.z=z}
    save()
  }
  function itemTone(it){ if(it.tone) return it.tone; if(it.kind==='smart') return ({stage:'blue',touchpoint:'violet',problem:'rose',job:'blue',pain:'rose',problemHypothesis:'amber',opportunity:'emerald',task:'slate',evidence:'slate',customerAction:'blue',frontstage:'emerald',backstage:'amber',persona:'blue',channel:'violet',emotion:'rose',process:'blue',system:'violet',resource:'violet',role:'emerald',dependency:'amber',policy:'slate',person:'amber',insight:'yellow'})[it.objectKind]||'slate'; return it.semantic==='frontstage'?'emerald':it.semantic==='backstage'?'amber':it.semantic==='system'?'violet':it.shape==='note'?'yellow':'slate'; }
  function content(it){
    if(it.kind!=='smart'){
      const vk=visualKind(it);
      if(vk==='image')return {title:it.caption||it.asset?.name||'Imagem',sub:it.asset?.name||'Imagem'};
      if(vk==='link')return {title:it.link?.title||it.text||'Link',sub:it.link?.domain||urlDomain(it.link?.url||'')||it.link?.url||'URL'};
      if(vk==='linked')return {title:it.text||linkedTargetTitle(it.linkedRef),sub:`Vinculado · ${it.linkedRef?.type==='board'?'Whiteboard':it.linkedRef?.type==='journey'?'Jornada':it.linkedRef?.type==='entity'?smartLabel(it.linkedRef?.kind):'Destino'}`};
      if(vk==='file')return {title:it.asset?.name||it.text||'Arquivo',sub:it.asset?.mime||'Arquivo'};
      if(vk==='icon')return {title:it.iconLabel||it.text||'Ícone',sub:'Ícone visual'};
      if(vk==='card')return {title:it.text||'Novo card',sub:it.description||it.semantic||'Card'};
      if(vk==='shape')return {title:it.text||'Forma',sub:it.shapeStyle||'Forma'};
      return {title:it.text||'Sem título',sub:it.semantic||'Objeto livre'};
    }
    const x=entityRecord(it.objectKind,it.objectId);if(!x)return {title:'Entidade não encontrada',sub:'Referência do Service Graph indisponível'};
    return {title:entityTitle(it.objectKind,x),sub:entityDescription(it.objectKind,x)||smartLabel(it.objectKind)};
  }
  function smartCardContext(it){
    if(!it||it.kind!=='smart')return '';const sid=stageForItem(it),stage=sid?graph.stages?.[sid]:null,usage=graphUsage(it.objectKind,it.objectId);const bits=[];if(stage&&it.objectKind!=='stage')bits.push(stage.title);if(usage>1)bits.push(`${usage} instâncias`);return bits.join(' · ')
  }
  function smartFlowOptions(kind){
    const map={stage:[['touchpoint','Onde interage'],['problem','Um problema'],['opportunity','Uma oportunidade'],['metric','Uma métrica'],['frontstage','Ação visível da equipe']],touchpoint:[['problem','Problema neste contato'],['evidence','Evidência'],['metric','Métrica'],['frontstage','Resposta visível']],problem:[['evidence','Evidência do problema'],['insight','Insight'],['opportunity','Oportunidade'],['metric','Métrica']],opportunity:[['metric','Métrica de sucesso'],['process','Processo necessário'],['system','Sistema de suporte']],frontstage:[['backstage','Ação de bastidor'],['process','Processo'],['system','Sistema'],['metric','Métrica']],backstage:[['process','Processo'],['system','Sistema'],['person','Responsável']],process:[['system','Sistema'],['person','Responsável'],['metric','Métrica']],system:[['process','Processo relacionado'],['person','Responsável'],['metric','Métrica']],evidence:[['problem','Problema observado'],['insight','Insight'],['metric','Métrica']],insight:[['problem','Problema'],['opportunity','Oportunidade']],metric:[['problem','Problema relacionado'],['opportunity','Oportunidade relacionada']]};return map[kind]||[['touchpoint','Ponto de contato'],['problem','Problema'],['opportunity','Oportunidade'],['metric','Métrica']]
  }
  function showSmartFlowMenu(it){
    if(!it||it.kind!=='smart')return;const sid=stageForItem(it)||orderedStages()[0]?.id,m=modalShell('Próximo objeto','Crie o próximo elemento já relacionado e dentro do mesmo contexto.');m.box.classList.add('rt1811-smartflow-modal','rt1812-smartflow-modal');const source=content(it),head=document.createElement('div');head.className='rt1811-smartflow-source';head.innerHTML=`<small>PARTINDO DE</small><b>${esc(source.title)}</b><span>${esc(smartLabel(it.objectKind))}${sid&&graph.stages?.[sid]?' · '+esc(graph.stages[sid].title):''}</span>`;m.box.appendChild(head);const grid=document.createElement('div');grid.className='rt1811-smartflow-grid';const options=smartFlowOptions(it.objectKind),recommended=options.find(([kind])=>!stageHasKind(sid,kind))?.[0]||options[0]?.[0];options.forEach(([kind,label])=>{const b=document.createElement('button');b.type='button';const rec=kind===recommended;b.className=rec?'recommended':'';b.innerHTML=`<i style="background:${tone[itemTone({kind:'smart',objectKind:kind})]||tone.slate}"></i><span><b>${esc(label)}</b><small>${esc(smartLabel(kind))}</small></span><em>${rec?'Recomendado':'＋'}</em>`;b.onclick=()=>{m.root.remove();if(['frontstage','backstage','process','system'].includes(kind)){if((pref().layoutMode||'free')!=='blueprint'){applyLayout('blueprint');setTimeout(()=>addBlueprintEntity(kind,sid,it.id),40)}else addBlueprintEntity(kind,sid,it.id)}else addJourneyEntity(kind,sid,it.id)};grid.appendChild(b)});m.box.appendChild(grid);const foot=document.createElement('div');foot.className='rt1811-smartflow-foot';foot.innerHTML='<span>O sistema cria a relação e mantém a etapa atual automaticamente.</span>';m.box.appendChild(foot)
  }
  function smartLabel(k){return ({stage:'Etapa',touchpoint:'Ponto de contato',problem:'Problema',opportunity:'Oportunidade',task:'Tarefa',evidence:'Evidência',customerAction:'Ação do cliente',frontstage:'Ação visível · Frontstage',backstage:'Ação de bastidor · Backstage',process:'Processo',system:'Sistema',resource:'Recurso',role:'Papel',dependency:'Dependência',policy:'Política',person:'Pessoa',insight:'Insight',persona:'Persona',channel:'Canal',emotion:'Emoção',need:'Necessidade',job:'Job',pain:'Dor',problemHypothesis:'Hipótese de problema',expectation:'Expectativa',metric:'Métrica'})[k]||k}
  const GENERIC_ENTITY_KINDS=['role','dependency','policy','evidence','customerAction','frontstage','backstage','process','system','resource','person','insight','persona','channel','emotion','need','job','pain','problemHypothesis','expectation','metric'];
  const SMART_ENTITY_KINDS=['stage','touchpoint','problem','opportunity','task',...GENERIC_ENTITY_KINDS];
  function ensureGraphEntityStore(){
    graph.entities ||= {};
    GENERIC_ENTITY_KINDS.forEach(k=>graph.entities[k] ||= {});
    graph.entityRelations ||= {};
    graph.entitySchemaVersion=2;
  }
  function entityCollection(kind){
    if(kind==='stage')return graph.stages||{};
    if(kind==='touchpoint')return graph.touchpoints||{};
    if(kind==='problem')return graph.problems||{};
    if(kind==='opportunity')return graph.opportunities||{};
    if(kind==='task')return graph.tasks||{};
    ensureGraphEntityStore();return graph.entities[kind]||{};
  }
  function entityRecord(kind,id){if(kind==='problem')return graph.entities?.problem?.[id]||graph.problems?.[id]||null;return entityCollection(kind)?.[id]||null}
  function entityTitle(kind,x){if(!x)return '';if(kind==='stage'||kind==='opportunity'||kind==='task')return x.title||'';if(kind==='touchpoint')return x.name||'';if(kind==='problem')return x.title||x.description||'';if(kind==='emotion')return x.title||emotionLabel(x.score);return x.title||x.name||''}
  function entityDescription(kind,x){if(!x)return '';if(kind==='stage')return x.customerAction||'';if(kind==='touchpoint')return x.channelId?channelTitle(x.channelId):(x.channel||'');if(kind==='emotion')return `${emotionGlyph(x.score)} ${emotionLabel(x.score)}${x.note?' · '+x.note:''}`;if(kind==='persona')return x.description||x.context||'';if(kind==='channel')return x.description||x.category||'';if(kind==='metric')return `${x.value??'—'}${x.unit||''}${x.target!==''&&x.target!=null?' · meta '+x.target+(x.unit||''):''}`;if(kind==='need'||kind==='job'||kind==='pain'||kind==='problemHypothesis'||kind==='expectation')return x.description||'';if(kind==='problem')return x.description||'Fricção / problema';if(kind==='opportunity')return x.description||'Oportunidade de melhoria';if(kind==='task')return x.status?`Status: ${x.status}`:'';return x.description||''}
  function setEntityTitle(kind,id,value){if(activeJourney())activeJourney().updatedAt=new Date().toISOString();const x=entityRecord(kind,id);if(!x)return;const v=String(value||'').trim();if(kind==='customerAction'&&graph.stages[x.stageId]?.customerAction===x.title)graph.stages[x.stageId].customerAction=v;if(kind==='touchpoint')x.name=v;else if(kind==='problem'&&!graph.entities?.problem?.[id])x.description=v;else x.title=v;x.updatedAt=new Date().toISOString()}
  function setEntityDescription(kind,id,value){const x=entityRecord(kind,id);if(!x)return;const v=String(value||'');if(kind==='stage')x.customerAction=v;else if(kind==='touchpoint')x.channel=v;else if(kind==='emotion')x.note=v;else if(kind==='task')x.status=v;else x.description=v;x.updatedAt=new Date().toISOString()}
  function entityInstances(kind,id){const out=[];Object.values(graph.views.whiteboards||{}).forEach(b=>Object.values(b.items||{}).forEach(it=>{if(it.kind==='smart'&&it.objectKind===kind&&it.objectId===id)out.push({boardId:b.id,boardName:b.name,itemId:it.id})}));return out}
  function allEntities(){const out=[];SMART_ENTITY_KINDS.forEach(kind=>Object.values(entityCollection(kind)||{}).forEach(x=>out.push({kind,id:x.id,record:x,title:entityTitle(kind,x),description:entityDescription(kind,x),usage:entityInstances(kind,x.id)})));Object.values(graph.entities?.problem||{}).forEach(x=>{if(!out.some(e=>e.kind==='problem'&&e.id===x.id))out.push({kind:'problem',id:x.id,record:x,title:entityTitle('problem',x),description:entityDescription('problem',x),usage:entityInstances('problem',x.id)})});return out}
  function graphStats(){const entities=allEntities(),instances=[];Object.values(graph.views.whiteboards||{}).forEach(b=>Object.values(b.items||{}).forEach(it=>{if(it.kind==='smart')instances.push(it)}));const missing=instances.filter(it=>!entityRecord(it.objectKind,it.objectId));const candidates=[];Object.values(graph.views.whiteboards||{}).forEach(b=>Object.values(b.items||{}).forEach(it=>{if(it.kind==='free'&&convertibleKind(it))candidates.push(it)}));return{entities:entities.length,instances:instances.length,missing:missing.length,candidates:candidates.length}}
  function createGraphEntityWithTitle(kind,title,description=''){
    ensureGraphEntityStore();const id=uid(kind),now=new Date().toISOString(),stage0=orderedStages()[0]?.id,j=activeJourney(),t=String(title||smartLabel(kind)).trim()||smartLabel(kind);
    if(kind==='stage'){if(!j){toast('Crie uma Jornada antes de transformar este objeto em Etapa.');return null}graph.stages[id]={id,journeyId:j.id,title:t,customerAction:description||'',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[],createdAt:now,updatedAt:now};j.stageIds ||= [];j.stageIds.push(id)}
    else if(kind==='touchpoint'){graph.touchpoints[id]={id,serviceId:graph.service.id,name:t,channel:description||'',personaIds:journeyPrimitiveState().activePersonaId?[journeyPrimitiveState().activePersonaId]:[],createdAt:now,updatedAt:now};if(stage0){graph.stages[stage0].touchpointIds ||= [];if(!graph.stages[stage0].touchpointIds.includes(id))graph.stages[stage0].touchpointIds.push(id)}}
    else if(kind==='problem'){graph.problems[id]={id,stageId:stage0||'',description:t,createdAt:now,updatedAt:now};if(stage0){graph.stages[stage0].problemIds ||= [];if(!graph.stages[stage0].problemIds.includes(id))graph.stages[stage0].problemIds.push(id)}}
    else if(kind==='opportunity'){graph.opportunities[id]={id,stageId:stage0||'',title:t,description:description||'',problemIds:[],taskIds:[],createdAt:now,updatedAt:now};if(stage0){graph.stages[stage0].opportunityIds ||= [];if(!graph.stages[stage0].opportunityIds.includes(id))graph.stages[stage0].opportunityIds.push(id)}}
    else if(kind==='task')graph.tasks[id]={id,opportunityId:'',title:t,status:description||'todo',createdAt:now,updatedAt:now};
    else if(kind==='persona'){graph.entities[kind][id]={id,type:kind,serviceId:graph.service.id,title:t,description:description||'',needs:[],jobs:[],createdAt:now,updatedAt:now};Object.values(graph.stages||{}).forEach(st=>{st.personaIds ||= [];if(!st.personaIds.includes(id))st.personaIds.push(id);const eid=uid('emotion');graph.entities.emotion[eid]={id:eid,type:'emotion',serviceId:graph.service.id,stageId:st.id,personaId:id,title:emotionLabel(0),score:0,note:'',createdAt:now,updatedAt:now};st.emotionIds ||= [];st.emotionIds.push(eid)})}
    else if(kind==='channel')graph.entities[kind][id]={id,type:kind,serviceId:graph.service.id,title:t,description:description||'',category:description||'',createdAt:now,updatedAt:now};
    else if(kind==='emotion'){const pid=journeyPrimitiveState().activePersonaId||Object.keys(entityCollection('persona'))[0]||'',score=0;graph.entities[kind][id]={id,type:kind,serviceId:graph.service.id,title:t||emotionLabel(score),stageId:stage0||'',personaId:pid,score,note:description||'',createdAt:now,updatedAt:now}}
    else if(kind==='metric'){graph.entities[kind][id]={id,type:kind,serviceId:graph.service.id,title:t,description:description||'',stageId:stage0||'',value:'',unit:'',target:'',direction:'higher',personaIds:journeyPrimitiveState().activePersonaId?[journeyPrimitiveState().activePersonaId]:[],createdAt:now,updatedAt:now}}
    else if(kind==='need'||kind==='job'||kind==='pain'||kind==='problemHypothesis'||kind==='expectation'){graph.entities[kind][id]={id,type:kind,serviceId:graph.service.id,title:t,description:description||'',stageId:stage0||'',personaIds:journeyPrimitiveState().activePersonaId?[journeyPrimitiveState().activePersonaId]:[],createdAt:now,updatedAt:now}}
    else graph.entities[kind][id]={id,type:kind,serviceId:graph.service.id,title:t,description:description||'',createdAt:now,updatedAt:now};
    return id
  }
  function ensureJourneyPrimitives(){
    // V1.18.9: normalize legacy Journey primitives without inventing a Persona.
    // A blank Service/Whiteboard must remain semantically blank until the user creates objects explicitly.
    ensureGraphEntityStore();const now=new Date().toISOString();
    const personas=graph.entities.persona,channels=graph.entities.channel,emotions=graph.entities.emotion;
    const primary=Object.values(personas)[0]||null;
    const channelByName=new Map(Object.values(channels).map(c=>[String(c.title||'').trim().toLowerCase(),c]));
    Object.values(graph.touchpoints||{}).forEach(tp=>{let name=String(tp.channel||'Canal não definido').trim()||'Canal não definido',key=name.toLowerCase(),ch=tp.channelId&&channels[tp.channelId];if(!ch){ch=channelByName.get(key);if(!ch){const id=uid('channel');ch={id,type:'channel',serviceId:graph.service.id,title:name,description:'',category:name,createdAt:now,updatedAt:now};channels[id]=ch;channelByName.set(key,ch)}tp.channelId=ch.id}tp.personaIds ||= primary?[primary.id]:[]});
    const scoreMap={positive:1,neutral:0,negative:-1};Object.values(graph.stages||{}).forEach(st=>{st.personaIds ||= primary?[primary.id]:[];if(!primary)return;let emo=Object.values(emotions).find(e=>e.stageId===st.id&&e.personaId===primary.id);if(!emo){const score=scoreMap[st.emotion]??0,id=uid('emotion');emo={id,type:'emotion',serviceId:graph.service.id,stageId:st.id,personaId:primary.id,title:emotionLabel(score),score,note:'',experienceState:'current',createdAt:now,updatedAt:now};emotions[id]=emo}emo.experienceState ||= 'current';st.emotionIds ||= [];if(!st.emotionIds.includes(emo.id))st.emotionIds.push(emo.id)});
    graph.journeyPrimitivesVersion=1;meta.journeyPrimitivesVersion=1;structuredState().journey ||= {};journeyPrimitiveState();
  }

  function convertibleKind(it){if(!it||it.kind==='smart'||isContainer(it))return null;const s=it.semantic;if(['evidence','customerAction','frontstage','backstage','process','system','person','insight'].includes(s))return s;if(s==='note'&&/insight/i.test(it.text||''))return 'insight';return null}
  function convertToSmart(it,kind=convertibleKind(it)){
    if(!it||!kind)return;markEdit('Converter para Smart Object');const c=content(it),id=createGraphEntityWithTitle(kind,c.title,c.sub);if(!id)return;it.kind='smart';it.objectKind=kind;it.objectId=id;it.entityRef={type:kind,id};it.entityStatus='linked';it.instanceSchemaVersion=2;it.presentation={tone:it.tone||null};save();toast(`${smartLabel(kind)} convertido em entidade do Service Graph.`)
  }
  function showContextConversion(it){
    if(!it||it.kind==='smart'||isContainer(it))return;const m=modalShell('Transformar em objeto do serviço','Converta este conteúdo em um objeto canônico da Context Library. O card atual vira a primeira representação visual desse objeto.');m.box.classList.add('bo1202-convert-modal');const grid=document.createElement('div');grid.className='rt1811-smartflow-grid';[['persona','Persona'],['need','Necessidade'],['job','Job'],['pain','Dor'],['problemHypothesis','Hipótese de problema'],['evidence','Evidência'],['insight','Insight'],['opportunity','Oportunidade']].forEach(([kind,label])=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<i style="background:${tone[({persona:'violet',need:'blue',job:'blue',pain:'rose',problemHypothesis:'amber',evidence:'emerald',insight:'yellow',opportunity:'emerald'})[kind]||'slate']}"></i><span><b>${esc(label)}</b><small>Adicionar à biblioteca do serviço</small></span><em>＋</em>`;b.onclick=()=>{m.root.remove();convertToSmart(it,kind)}});m.box.appendChild(grid);const note=document.createElement('p');note.className='rt1811-smartflow-foot';note.textContent='Problema validado não é criado diretamente: converta em Hipótese de problema e valide com evidências na Context Library.';m.box.appendChild(note)
  }
  function detachSmart(it){if(!it||it.kind!=='smart')return;markEdit('Desvincular instância');const c=content(it),sem=it.objectKind;it.kind='free';it.shape='card';it.visualKind='card';it.semantic=sem;it.text=c.title;it.description=c.sub;it.entityRef=null;it.entityStatus='unlinked';delete it.objectKind;delete it.objectId;save();toast('Instância desvinculada. A entidade original permanece no Service Graph.')}
  function cloneEntityForInstance(it){if(!it||it.kind!=='smart')return;const src=entityRecord(it.objectKind,it.objectId);if(!src)return;markEdit('Duplicar entidade');const kind=it.objectKind,newId=createGraphEntityWithTitle(kind,entityTitle(kind,src)+' — cópia',entityDescription(kind,src));if(!newId)return;it.objectId=newId;it.entityRef={type:kind,id:newId};it.entityStatus='linked';save();toast('Nova entidade criada para esta instância.')}
  function switchToInstance(ref){if(!graph.views.whiteboards[ref.boardId])return;boardId=ref.boardId;meta.activeBoardId=boardId;selected=[];selectedEdge=null;showLibrary=false;showLayers=false;showOutline=false;normalizeContainers();normalizeLayers();normalizeEdges();normalizeInstances();save(false);renderAll();setTimeout(()=>focusItem(ref.itemId,{fitItem:true,record:true}),0)}
  function freeLabel(s){return ({note:'Post-it',text:'Texto',shape:'Forma',card:'Card',image:'Imagem',link:'Link',file:'Arquivo',icon:'Ícone',linked:'Objeto vinculado',evidence:'Evidência',customerAction:'Ação do cliente',frontstage:'Ação visível · Frontstage',backstage:'Ação de bastidor · Backstage',process:'Processo',system:'Sistema',person:'Pessoa',persona:'Persona',channel:'Canal',emotion:'Emoção',need:'Necessidade',job:'Job',pain:'Dor',problemHypothesis:'Hipótese de problema',expectation:'Expectativa',metric:'Métrica',frame:'Frame',section:'Section',swimlane:'Swimlane'})[s]||'Objeto'}
  function toast(msg){if(!overlay){window.dispatchEvent(new CustomEvent('rt-data-notice',{detail:msg}));return} let t=$('.rt144-toast',overlay); if(!t){t=document.createElement('div');t.className='rt144-toast';t.setAttribute('role','status');t.setAttribute('aria-live','polite');t.setAttribute('aria-atomic','true');overlay.appendChild(t)} t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2200); }

  function markEdit(label){pendingEditLabel=label||'Editar quadro'}
  function clone(v){return JSON.parse(JSON.stringify(v))}
  function historyPayload(){return {graph:clone(graph),meta:clone(meta),boardId}}
  function historyKey(data){return JSON.stringify(data,(key,value)=>['updatedAt','persistenceRevision','lastOpenedAt','heartbeatAt','sessionId'].includes(key)?undefined:value)}
  function resetEditHistory(label='Estado inicial'){
    const data=historyPayload();editHistory=[{label,at:Date.now(),data,key:historyKey(data)}];editIndex=0;historyReady=true;pendingEditLabel='Editar quadro';renderHistoryState();
  }
  function semanticHistoryLabel(label){
    if(label==='Editar quadro'&&inspectorMode==='board')return 'Editar configurações do quadro';
    if((label==='Editar quadro'||label==='Editar entidade')&&selected.length===1){const it=board()?.items?.[selected[0]];if(it){const c=content(it);return `${it.kind==='smart'?'Editar '+semanticLabel(it):'Editar'} “${c.title||'objeto'}”`}}
    if(label==='Editar quadro'&&selected.length>1)return `Editar ${selected.length} objetos`;
    if(label==='Editar quadro')return `Atualizar layout · ${viewLabel()}`;
    if(label==='Mover objetos'&&selected.length>1)return `Mover ${selected.length} objetos`;
    if(label==='Distribuir objetos'&&selected.length>1)return `Distribuir ${selected.length} objetos`;
    if(label==='Alinhar objetos'&&selected.length>1)return `Alinhar ${selected.length} objetos`;
    return label
  }
  function recordEditSnapshot(label='Editar quadro'){
    label=semanticHistoryLabel(label);
    if(!historyReady||restoringEdit)return;const data=historyPayload(),key=historyKey(data);const cur=editHistory[editIndex];if(cur?.key===key)return;
    if(editIndex<editHistory.length-1)editHistory=editHistory.slice(0,editIndex+1);
    const now=Date.now(),prev=editHistory[editIndex],coalesce=prev&&prev.label===label&&(label==='Editar quadro'||label==='Mover objetos'||label==='Redimensionar objeto')&&(now-prev.at)<700;
    if(coalesce)editHistory[editIndex]={label,at:now,data,key};else{editHistory.push({label,at:now,data,key});if(editHistory.length>80)editHistory.shift();editIndex=editHistory.length-1}renderHistoryState();
  }
  function restoreEditSnapshot(index){
    const snap=editHistory[index];if(!snap)return;restoringEdit=true;const data=clone(snap.data);graph=data.graph;const currentRevision=persistence.revision;meta=data.meta;meta.persistenceRevision=currentRevision;graph.persistenceRevision=currentRevision;boardId=graph.views.whiteboards[data.boardId]?data.boardId:Object.keys(graph.views.whiteboards)[0];meta.activeBoardId=boardId;
    normalizeContainers();normalizeLayers();normalizeEdges();normalizeVisualItems();normalizeInstances();selected=[];selectedEdge=null;showInspector=false;drag=null;quickCreate=null;contextMenu=null;editIndex=index;
    save(false,{label:'Restaurar histórico'});restoringEdit=false;saveState='saved';renderAll();toast(snap.label);renderHistoryState();
  }
  function undoEdit(){if(editIndex<=0){toast('Nada para desfazer.');return}restoreEditSnapshot(editIndex-1)}
  function redoEdit(){if(editIndex<0||editIndex>=editHistory.length-1){toast('Nada para refazer.');return}restoreEditSnapshot(editIndex+1)}
  function renderHistoryState(){if(!overlay)return;const u=$('.rt150-undo',overlay),r=$('.rt150-redo',overlay);if(u)u.disabled=editIndex<=0;if(r)r.disabled=editIndex<0||editIndex>=editHistory.length-1}

  function selectionPayload(){
    if(!selected.length)return null;const ids=new Set(selected);selected.forEach(id=>{const it=board().items[id];if(isContainer(it))descendantsOf(id).forEach(x=>ids.add(x))});
    const items={};ids.forEach(id=>{if(board().items[id])items[id]=clone(board().items[id])});
    const edges={};Object.values(board().edges).forEach(e=>{if(ids.has(e.fromId)&&ids.has(e.toId))edges[e.id]=clone(e)});
    const parents={};ids.forEach(id=>{const p=parentFrame(id);if(p&&ids.has(p))parents[id]=p});
    const gs={};ids.forEach(id=>{const g=itemGroup(id);if(g)gs[id]=g});
    return{version:1,items,edges,parents,groups:gs,top:selected.filter(id=>ids.has(id)),sourceBoardId:boardId};
  }
  function copySelection(cut=false){const p=selectionPayload();if(!p){toast('Selecione algo para copiar.');return}clipboardPayload=p;clipboard=[];pasteSerial=0;try{navigator.clipboard?.writeText('RT_WHITEBOARD_CLIPBOARD:'+JSON.stringify(p))}catch{}toast(cut?'Recortado para a área de transferência.':'Copiado para a área de transferência.');if(cut){markEdit('Recortar objetos');removeSelection()}}
  function pastePayload(payload,point=null){
    if(!payload?.items||!Object.keys(payload.items).length)return false;const ids=Object.keys(payload.items),idMap={},groupMap={},offset=36*(++pasteSerial),zBase=maxZ()+1;ids.forEach(id=>idMap[id]=uid(isContainer(payload.items[id])?containerType(payload.items[id]):'item'));
    const xs=ids.map(id=>payload.items[id].x),ys=ids.map(id=>payload.items[id].y),minX=Math.min(...xs),minY=Math.min(...ys),target=point||null,dx=target?target.x-minX:offset,dy=target?target.y-minY:offset;
    ids.forEach((id,idx)=>{const cp=clone(payload.items[id]);cp.id=idMap[id];cp.instanceId=cp.id;cp.x=Math.max(0,cp.x+dx);cp.y=Math.max(0,cp.y+dy);cp.z=zBase+idx;cp.locked=false;cp.hidden=false;if(cp.kind==='smart')cp.entityRef={type:cp.objectKind,id:cp.objectId};board().items[cp.id]=cp;const g=payload.groups?.[id];if(g){groupMap[g]||=uid('group');setGroup(cp.id,groupMap[g])}});
    Object.entries(payload.parents||{}).forEach(([id,p])=>{if(idMap[id]&&idMap[p])setParentFrame(idMap[id],idMap[p])});
    Object.values(payload.edges||{}).forEach(e=>{if(idMap[e.fromId]&&idMap[e.toId]){const ne=clone(e);ne.id=uid('edge');ne.fromId=idMap[e.fromId];ne.toId=idMap[e.toId];board().edges[ne.id]=ne}});
    const tops=(payload.top||ids).map(id=>idMap[id]).filter(Boolean);selected=tops.length?tops:ids.map(id=>idMap[id]);selectedEdge=null;showInspector=true;updateFrameMembership(selected);markEdit('Colar objetos');save();return true;
  }
  function pasteInternalAt(point=null){if(clipboardPayload)return pastePayload(clipboardPayload,point);toast('A área de transferência interna está vazia.');return false}

  function templateLibrary(){try{return JSON.parse(localStorage.getItem(TEMPLATE_KEY)||'[]')||[]}catch{return[]}}
  function saveTemplateLibrary(arr){localStorage.setItem(TEMPLATE_KEY,JSON.stringify(arr,null,2))}
  function boardPayload(){
    const ids=Object.keys(board().items),items=clone(board().items),edges=clone(board().edges),parents={},gs={};ids.forEach(id=>{const p=parentFrame(id);if(p)parents[id]=p;const g=itemGroup(id);if(g)gs[id]=g});
    const childSet=new Set(Object.keys(parents));return{version:1,items,edges,parents,groups:gs,top:ids.filter(id=>!childSet.has(id)),sourceBoardId:boardId};
  }
  function templateVariables(payload){const found=new Set(),walk=v=>{if(typeof v==='string'){for(const m of v.matchAll(/\{(Serviço|Persona|Etapa)\}/g))found.add(m[1])}else if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')Object.values(v).forEach(walk)};walk(payload);return [...found]}
  function replaceTemplateVariables(payload,values){const walk=v=>{if(typeof v==='string')return v.replace(/\{(Serviço|Persona|Etapa)\}/g,(_,k)=>values[k]??`{${k}}`);if(Array.isArray(v))return v.map(walk);if(v&&typeof v==='object'){const o={};Object.entries(v).forEach(([k,x])=>o[k]=walk(x));return o}return v};return walk(payload)}
  function templateDefaults(){return{'Serviço':graph.service?.name||'Serviço','Persona':'Persona','Etapa':orderedStages()[0]?.title||'Etapa'}}
  function payloadFromItems(items,edges={},parents={},groups={}){const map=Object.fromEntries(items.map(x=>[x.id,x]));const childSet=new Set(Object.keys(parents));return{version:1,items:map,edges,parents,groups,top:items.map(x=>x.id).filter(id=>!childSet.has(id))}}
  function builtinTemplatePayload(id){
    const semantic=(text,kind,toneName,x,y,w=260,h=126)=>{const it=free(text,kind,toneName,x,y,w,h);it.visualKind='card';it.shape='card';it.templateEntityKind=kind;return it};
    if(id==='blueprint'){
      const sid=orderedStages()[0]?.id||null,defs=[['{Etapa} · evidência','evidence','slate'],['Ação do cliente','customerAction','blue'],['Ação visível','frontstage','emerald'],['Ação de bastidor','backstage','amber'],['Processo de suporte','process','blue'],['Sistema de suporte','system','violet']],arr=defs.map((d,i)=>semantic(d[0],d[1],d[2],160,120+i*220));arr.forEach((it,i)=>{it.blueprintLane=blueprintLanes[i].key;if(sid)it.blueprintStageId=sid});return payloadFromItems(arr)
    }
    if(id==='journey'){
      const labels=['Descoberta','Consideração','Decisão','Uso'],secs=[],notes=[],parents={};labels.forEach((l,i)=>{const f=frame(i===0?'{Etapa}':l,i===0?'blue':'slate',140+i*760);f.width=680;f.height=520;secs.push(f);const n1=semantic(i===0?'{Persona}: o que tenta fazer?':'Ação do cliente','customerAction','blue',f.x+70,310,260,130),n2=semantic('Touchpoint / canal','touchpoint','violet',f.x+350,310,250,130),n3=semantic('Oportunidade','opportunity','emerald',f.x+210,500,270,130);notes.push(n1,n2,n3);parents[n1.id]=f.id;parents[n2.id]=f.id;parents[n3.id]=f.id});return payloadFromItems([...secs,...notes],{},parents)
    }
    if(id==='flow'){
      const labels=['Início','Contato','Atendimento','Execução','Entrega','Pós-serviço'],arr=labels.map((l,i)=>semantic(l,'process',i===0?'blue':i===labels.length-1?'emerald':'slate',160+i*360,420,250,126)),edges={};arr.slice(0,-1).forEach((x,i)=>{const eid=uid('edge');edges[eid]={id:eid,fromId:x.id,toId:arr[i+1].id,label:'precede',style:'solid',arrow:'end',route:'orthogonal',waypoint:null}});return payloadFromItems(arr,edges)
    }
    if(id==='discovery'){
      const fs=[frame('Problemas','rose',120),frame('Insights','yellow',1040),frame('Oportunidades','emerald',1960)],ns=[semantic('Qual é a principal fricção?','problem','rose',210,310),semantic('O que aprendemos com a evidência?','insight','yellow',1130,310),semantic('O que podemos melhorar?','opportunity','emerald',2050,310)],parents={};ns.forEach((n,i)=>parents[n.id]=fs[i].id);return payloadFromItems([...fs,...ns],{},parents)
    }
    if(id==='brainstorm'){
      const f=frame('{Serviço} · Brainstorm','blue',160);f.width=1500;f.height=820;const notes=['Ideia','Dúvida','Risco','Evidência','Hipótese','Próximo passo'].map((t,i)=>free(t,'note',['yellow','blue','rose','slate','violet','emerald'][i],260+(i%3)*390,320+Math.floor(i/3)*250,300,150)),parents={};notes.forEach(n=>parents[n.id]=f.id);return payloadFromItems([f,...notes],{},parents)
    }
    const lanes=['Cliente','Ação visível · Frontstage','Ação de bastidor · Backstage','Sistemas'],fs=lanes.map((l,i)=>{const x=frame(l,['blue','emerald','amber','violet'][i],160);x.containerType='swimlane';x.semantic='swimlane';x.x=160;x.y=160+i*230;x.width=1700;x.height=190;return x}),p1=semantic('Entrada','process','blue',330,240,240,120),p2=semantic('Atividade principal','process','slate',760,470,280,120),p3=semantic('Saída','process','emerald',1220,700,240,120),edges={};[[p1,p2],[p2,p3]].forEach(([a,b])=>{const e=uid('edge');edges[e]={id:e,fromId:a.id,toId:b.id,label:'precede',style:'solid',arrow:'end',route:'orthogonal'}});return payloadFromItems([...fs,p1,p2,p3],edges)
  }
  function builtinTemplates(){return[
    {id:'builtin-blueprint',builtin:true,seed:'blueprint',name:'Service Blueprint essencial',category:'Service Design',description:'Matriz inicial para evidências, cliente, frontstage, backstage, processos e sistemas.',recommendedView:'blueprint'},
    {id:'builtin-journey',builtin:true,seed:'journey',name:'Journey visual',category:'Jornada',description:'Etapas com ações, touchpoints e oportunidades para começar rapidamente.',recommendedView:'journey'},
    {id:'builtin-flow',builtin:true,seed:'flow',name:'Fluxo de serviço',category:'Operação',description:'Sequência operacional conectada de ponta a ponta.',recommendedView:'flow'},
    {id:'builtin-discovery',builtin:true,seed:'discovery',name:'Descoberta e oportunidades',category:'Descoberta',description:'Problemas → insights → oportunidades em sections estruturadas.',recommendedView:'free'},
    {id:'builtin-brainstorm',builtin:true,seed:'brainstorm',name:'Brainstorm de serviço',category:'Workshop',description:'Section com post-its para ideias, riscos, evidências e hipóteses.',recommendedView:'free'},
    {id:'builtin-process',builtin:true,seed:'process',name:'Mapa de processo',category:'Operação',description:'Swimlanes e fluxo conectado para mapear a entrega do serviço.',recommendedView:'free'}
  ]}
  function allTemplates(){return[...builtinTemplates(),...templateLibrary().map(t=>({...t,builtin:false}))]}
  function templatePayload(tpl){return tpl.builtin?builtinTemplatePayload(tpl.seed):clone(tpl.payload)}
  function previewTemplate(el,payload){el.innerHTML='';const ids=Object.keys(payload?.items||{});if(!ids.length){el.innerHTML='<span>Template vazio</span>';return}const its=ids.map(id=>payload.items[id]),minX=Math.min(...its.map(i=>i.x||0)),minY=Math.min(...its.map(i=>i.y||0)),maxX=Math.max(...its.map(i=>(i.x||0)+(i.width||180))),maxY=Math.max(...its.map(i=>(i.y||0)+(i.height||100))),w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY);its.slice(0,40).forEach(it=>{const n=document.createElement('i');const c=tone[it.tone]||'#64748b';n.style.left=((it.x-minX)/w*88+6)+'%';n.style.top=((it.y-minY)/h*78+10)+'%';n.style.width=Math.max(5,(it.width||180)/w*88)+'%';n.style.height=Math.max(6,(it.height||100)/h*78)+'%';n.style.borderColor=c;n.style.background=isContainer(it)?'transparent':c+'22';if(isContainer(it))n.classList.add('container');el.appendChild(n)});Object.values(payload.edges||{}).slice(0,20).forEach(()=>{const e=document.createElement('b');el.appendChild(e)})}
  function templateVariableDialog(tpl,payload,done){const vars=templateVariables(payload);if(!vars.length){done(payload);return}const m=modalShell('Variáveis do template','Preencha o contexto antes de inserir.');m.box.classList.add('rt151-variable-modal');const values=templateDefaults(),form=document.createElement('div');form.className='rt151-variable-form';vars.forEach(v=>{const row=document.createElement('label');row.innerHTML=`<span>{${esc(v)}}</span><input value="${esc(values[v]||'')}">`;const inp=$('input',row);inp.oninput=()=>values[v]=inp.value;form.appendChild(row)});m.box.appendChild(form);const actions=document.createElement('div');actions.className='rt151-modal-actions';actions.append(btn('Cancelar',()=>m.root.remove()),btn('Continuar',()=>{m.root.remove();done(replaceTemplateVariables(payload,values))},'primary'));m.box.appendChild(actions)}
  function materializeTemplateSemantics(payload){
    const out=clone(payload);Object.values(out.items||{}).forEach(it=>{const kind=it.templateEntityKind;if(!kind)return;const title=String(it.text||smartLabel(kind)),desc=it.description||it.templateDescription||'';const entityId=createGraphEntityWithTitle(kind,title,desc);it.kind='smart';it.objectKind=kind;it.objectId=entityId;it.entityRef={type:kind,id:entityId};it.entityStatus='linked';it.instanceSchemaVersion=2;it.semanticType=kind;it.presentation={...(it.presentation||{}),tone:it.tone||null,visualKind:'card'};delete it.templateEntityKind;delete it.shape;delete it.visualKind;delete it.semantic;delete it.text;delete it.description});return out
  }
  function insertTemplatePayload(tpl,payload,asNew=false){
    const action=resolved=>{const semanticPayload=materializeTemplateSemantics(resolved);if(asNew){createBoard(tpl.name);pasteSerial=0;pastePayload(semanticPayload,{x:180,y:180});if(tpl.recommendedView&&tpl.recommendedView!=='free')setTimeout(()=>applyLayout(tpl.recommendedView,true),20);else setTimeout(()=>{selected.length?fitSelection():fit()},20);toast('Novo quadro criado e organizado pelo template.')}else{pasteSerial=0;pastePayload(semanticPayload,center());if(tpl.recommendedView&&tpl.recommendedView!=='free')setTimeout(()=>applyLayout(tpl.recommendedView,true),20);else setTimeout(()=>fitSelection(),20);toast('Template inserido, organizado e centralizado.')}};templateVariableDialog(tpl,payload,action)
  }
  function saveAsTemplate(scope='selection'){
    const payload=scope==='board'?boardPayload():selectionPayload();if(!payload||!Object.keys(payload.items||{}).length){toast(scope==='board'?'O quadro está vazio.':'Selecione objetos para salvar como template.');return}
    const m=modalShell(scope==='board'?'Salvar quadro como template':'Salvar seleção como template','O template ficará disponível em Meus templates.');m.box.classList.add('rt151-save-template');const form=document.createElement('div');form.className='rt151-save-form';form.innerHTML='<label><span>Nome</span><input class="tpl-name" placeholder="Ex.: Onboarding de cliente"></label><label><span>Categoria</span><input class="tpl-category" value="Meus templates"></label><label><span>Descrição</span><textarea class="tpl-description" placeholder="Quando usar este template?"></textarea></label><div class="rt151-var-hint"><b>Variáveis disponíveis</b><span>Use <code>{Serviço}</code>, <code>{Persona}</code> ou <code>{Etapa}</code> em textos para pedir valores no momento da inserção.</span></div>';m.box.appendChild(form);const actions=document.createElement('div');actions.className='rt151-modal-actions';actions.append(btn('Cancelar',()=>m.root.remove()),btn('Salvar template',()=>{const name=$('.tpl-name',form).value.trim();if(!name){$('.tpl-name',form).focus();return}const arr=templateLibrary();arr.unshift({id:uid('template'),name,category:$('.tpl-category',form).value.trim()||'Meus templates',description:$('.tpl-description',form).value.trim()||`${scope==='board'?'Quadro':'Seleção'} reutilizável`,scope,recommendedView:pref().layoutMode||'free',createdAt:new Date().toISOString(),payload:clone(payload)});saveTemplateLibrary(arr);m.root.remove();toast('Template salvo em Meus templates.');},'primary'));m.box.appendChild(actions);setTimeout(()=>$('.tpl-name',form)?.focus(),0)
  }
  function removeUserTemplate(id){const arr=templateLibrary().filter(t=>t.id!==id);saveTemplateLibrary(arr);toast('Template removido.');showTemplates()}
  function commandList(){return[
    {label:'Desfazer',hint:'Ctrl+Z',run:undoEdit,keywords:'undo voltar'}, {label:'Refazer',hint:'Ctrl+Shift+Z',run:redoEdit,keywords:'redo'},
    {label:'Adicionar post-it',hint:'S',run:()=>{markEdit('Adicionar post-it');addFree('note','note','Novo post-it','yellow')}}, {label:'Adicionar texto',hint:'T',run:()=>{markEdit('Adicionar texto');addFree('text','text','Texto','slate')}},
    {label:'Adicionar card',run:()=>{markEdit('Adicionar card');addFree('card','card','Novo card','blue')}}, {label:'Abrir Journey Studio',keywords:'journey jornada etapas lanes persona emoção métricas',run:showJourneyStudio}, {label:'Abrir Blueprint Studio',keywords:'blueprint operação frontstage backstage processo sistema linha visibilidade',run:showBlueprintStudio}, {label:'Abrir templates',keywords:'template modelo biblioteca',run:showTemplates}, {label:'Salvar seleção como template',keywords:'template salvar reutilizar',run:()=>saveAsTemplate('selection')}, {label:'Salvar quadro como template',keywords:'template quadro salvar',run:()=>saveAsTemplate('board')}, {label:'Adicionar frame',run:()=>{markEdit('Adicionar frame');addContainer('frame','Novo frame','slate')}}, {label:'Adicionar section',run:()=>{markEdit('Adicionar section');addContainer('section','Nova section','blue')}},
    {label:'Copiar seleção',hint:'Ctrl+C',run:()=>copySelection(false)}, {label:'Recortar seleção',hint:'Ctrl+X',run:()=>copySelection(true)}, {label:'Colar',hint:'Ctrl+V',run:()=>pasteInternalAt()}, {label:'Duplicar seleção',hint:'Ctrl+D',run:()=>{markEdit('Duplicar objetos');duplicateItems()}},
    {label:'Agrupar seleção',hint:'Ctrl+G',run:()=>{markEdit('Agrupar objetos');group()}}, {label:'Desagrupar',hint:'Ctrl+Shift+G',run:()=>{markEdit('Desagrupar objetos');ungroup()}},
    {label:'Bloquear seleção',run:()=>{markEdit('Bloquear objetos');lockSelection(true)}}, {label:'Desbloquear seleção',run:()=>{markEdit('Desbloquear objetos');lockSelection(false)}},
    {label:'Trazer para frente',run:()=>{if(selected[0]){markEdit('Trazer para frente');arrange(selected[0],'front')}}}, {label:'Enviar para o fundo',run:()=>{if(selected[0]){markEdit('Enviar para o fundo');arrange(selected[0],'back')}}},
    {label:'Ajustar conteúdo',hint:'Ctrl+0',run:fitContent}, {label:'Ajustar seleção',hint:'Ctrl+2',run:fitSelection}, {label:'Zoom 100%',hint:'Ctrl+1',run:setZoom100},
    {label:'Abrir Service Graph',keywords:'entidade smart object instância grafo',run:showGraphBrowser}, {label:'Smart Layout…',hint:'Shift+L',keywords:'organizar grade linha coluna fluxo arvore radial swimlane journey',run:openSmartLayout}, {label:'Restaurar layout anterior',keywords:'layout voltar posições restore',run:restoreSmartLayout},
    {label:'Abrir biblioteca',run:()=>{showLibrary=true;showLayers=false;showOutline=false;renderAll()}}, {label:'Abrir camadas',run:()=>{showLayers=true;showLibrary=false;showOutline=false;renderAll()}}, {label:'Navegar / buscar',hint:'Ctrl+F',run:()=>{showOutline=true;showLibrary=false;showLayers=false;renderAll()}},
    {label:'Filtros e visibilidade',keywords:'filtro lane coluna view',run:showViewFilters},{label:'Visualizações salvas',keywords:'view visão salvar filtro',run:showSavedViews},{label:'Salvar visão atual',keywords:'view visão salvar',run:saveCurrentViewDefinition},{label:'Adicionar objeto vinculado',keywords:'linked object link quadro jornada entidade',run:showLinkedObjectPicker},
    {label:'Centro de Recuperação',keywords:'backup checkpoint recuperar confiabilidade salvar',run:showRecoveryCenter},{label:'Criar checkpoint agora',keywords:'backup snapshot proteger',run:()=>createCheckpoint('Checkpoint manual')},
    {label:'Importar / Exportar…',keywords:'import export backup png svg pdf json csv arquivo',run:showImportExportCenter},{label:'Backup completo',keywords:'export backup projeto json',run:exportFullBackup},{label:'Exportar visual atual',keywords:'png svg pdf imagem',run:()=>showImportExportCenter('visual')},
    {label:'Status Whiteboard Core 1.0',keywords:'core auditoria integridade baseline qa saúde',run:showCoreStatus},
    {label:'Visualização Livre',run:()=>applyLayout('free')},{label:'Service Frame',run:()=>applyLayout('service',true)},{label:'Visualização Blueprint',run:()=>applyLayout('blueprint')},{label:'Visualização Fluxo',run:()=>applyLayout('flow')},{label:'Visualização Journey',run:()=>applyLayout('journey')}
  ]}
  function openCommandPalette(){showCommandPalette=true;commandQuery='';contextMenu=null;renderAll();setTimeout(()=>$('.rt150-command-input',overlay)?.focus(),0)}
  function renderCommandPalette(){if(!showCommandPalette)return;const root=document.createElement('div');root.className='rt150-command-backdrop';root.innerHTML='<div class="rt150-command"><div class="rt150-command-head"><span>⌘</span><input class="rt150-command-input" placeholder="Digite um comando…"><kbd>Esc</kbd></div><div class="rt150-command-list"></div></div>';overlay.appendChild(root);const input=$('.rt150-command-input',root),list=$('.rt150-command-list',root);const draw=()=>{list.innerHTML='';const q=input.value.trim().toLowerCase();const cmds=commandList().filter(c=>!q||(c.label+' '+(c.keywords||'')).toLowerCase().includes(q)).slice(0,18);cmds.forEach((c,i)=>{const b=document.createElement('button');b.className='rt150-command-row'+(i===0?' active':'');b.innerHTML=`<span>${esc(c.label)}</span>${c.hint?`<kbd>${esc(c.hint)}</kbd>`:''}`;b.onclick=()=>{showCommandPalette=false;c.run();if(overlay&&!document.querySelector('.rt150-command-backdrop'))renderAll()};list.appendChild(b)});if(!cmds.length)list.innerHTML='<div class="rt150-command-empty">Nenhum comando encontrado.</div>'};input.oninput=draw;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();list.querySelector('button')?.click()}if(e.key==='Escape'){e.preventDefault();showCommandPalette=false;renderAll()}};root.onpointerdown=e=>{if(e.target===root){showCommandPalette=false;renderAll()}};draw()}
  function contextPoint(){return contextMenu?.canvasPoint||center()}
  function renderContextMenu(){if(!contextMenu)return;const m=document.createElement('div');m.className='rt150-context';m.style.left=clamp(contextMenu.x,8,window.innerWidth-260)+'px';m.style.top=clamp(contextMenu.y,64,window.innerHeight-430)+'px';const add=(label,fn,hint='',danger=false,disabled=false)=>{const b=document.createElement('button');b.disabled=disabled;b.className=danger?'danger':'';b.innerHTML=`<span>${esc(label)}</span>${hint?`<kbd>${esc(hint)}</kbd>`:''}`;b.onclick=()=>{contextMenu=null;m.remove();fn()};m.appendChild(b)};if(contextMenu.kind==='canvas'){add('Colar',()=>pasteInternalAt(contextPoint()),'Ctrl+V',false,!clipboardPayload);add('Inserir template…',showTemplates);add('Smart Layout…',openSmartLayout,'Shift+L');add('Restaurar layout anterior',restoreSmartLayout,'',false,!smartLayoutSnapshot()?.items);add('Adicionar post-it',()=>{markEdit('Adicionar post-it');addFree('note','note','Novo post-it','yellow',contextPoint())},'S');add('Adicionar texto',()=>{markEdit('Adicionar texto');addFree('text','text','Texto','slate',contextPoint())},'T');add('Adicionar card',()=>{markEdit('Adicionar card');addFree('card','card','Novo card','blue',contextPoint())});add('Adicionar frame',()=>{markEdit('Adicionar frame');addContainer('frame','Novo frame','slate',contextPoint())});}else if(contextMenu.kind==='edge'){add('Excluir conexão',()=>{selected=[];selectedEdge=contextMenu.id;markEdit('Excluir conexão');removeSelection()},'Del',true)}else{add('Propriedades',()=>{selected=[contextMenu.id];selectedEdge=null;showInspector=true;inspectorMode='selection';inspectorTab='essential';renderAll()});const contextItem=board().items[contextMenu.id];if(contextItem&&contextItem.kind!=='smart'&&!isContainer(contextItem))add('Transformar em objeto…',()=>showContextConversion(contextItem));add('Comentários',()=>runtime.api('collaboration')?.show?.('comments'));m.appendChild(document.createElement('hr'));add('Copiar',()=>copySelection(false),'Ctrl+C');add('Recortar',()=>copySelection(true),'Ctrl+X');add('Colar',()=>pasteInternalAt(contextPoint()),'Ctrl+V',false,!clipboardPayload);add('Duplicar',()=>{markEdit('Duplicar objetos');duplicateItems()},'Ctrl+D');m.appendChild(document.createElement('hr'));add(itemGroup(contextMenu.id)?'Desagrupar':'Agrupar',()=>{markEdit(itemGroup(contextMenu.id)?'Desagrupar objetos':'Agrupar objetos');itemGroup(contextMenu.id)?ungroup():group()},itemGroup(contextMenu.id)?'Ctrl+Shift+G':'Ctrl+G',false,selected.length<2&&!itemGroup(contextMenu.id));add(isLocked(board().items[contextMenu.id])?'Desbloquear':'Bloquear',()=>{markEdit(isLocked(board().items[contextMenu.id])?'Desbloquear objeto':'Bloquear objeto');lockSelection(!isLocked(board().items[contextMenu.id]))});add('Trazer para frente',()=>{markEdit('Trazer para frente');arrange(contextMenu.id,'front')});add('Enviar para o fundo',()=>{markEdit('Enviar para o fundo');arrange(contextMenu.id,'back')});add('Conectar',()=>{connectFrom=contextMenu.id;tool='connect';renderAll()});add('Smart Layout da seleção…',openSmartLayout,'Shift+L');add('Salvar seleção como template',()=>saveAsTemplate('selection'));m.appendChild(document.createElement('hr'));add('Excluir',()=>{markEdit('Excluir objetos');removeSelection()},'Del',true)}overlay.appendChild(m)}
  function renderEditHistory(){if(!showEditHistory)return;const p=document.createElement('aside');p.className='rt150-history';p.innerHTML='<div class="rt150-history-head"><div><b>Histórico de edição</b><small>Últimas alterações deste quadro</small></div><button>×</button></div><div class="rt150-history-list"></div>';overlay.appendChild(p);$('.rt150-history-head button',p).onclick=()=>{showEditHistory=false;renderAll()};const list=$('.rt150-history-list',p);[...editHistory].reverse().forEach((h,ri)=>{const idx=editHistory.length-1-ri,b=document.createElement('button');b.className=idx===editIndex?'current':'';const tm=new Date(h.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});b.innerHTML=`<span><b>${esc(h.label)}</b><small>${tm}</small></span>${idx===editIndex?'<em>Atual</em>':''}`;b.onclick=()=>restoreEditSnapshot(idx);list.appendChild(b)})}

  async function open(){if(overlay)return true;await recoverBeforeLoad();load();if(!boardId||!board()){window.dispatchEvent(new CustomEvent('rt-data-notice',{detail:'Crie ou abra um quadro antes de entrar no canvas.'}));return false}beginSession();resetEditHistory('Estado inicial');overlay=document.createElement('div');overlay.className='rt144 rt148 rt149 rt1410 rt152 rt153 rt154 rt155 rt156 rt157 rt158 rt159 rt170 rt180 rt181 rt183 rt184 rt185 rt186 rt188 rt190 bo1174-board';if(mobileReadOnly())overlay.classList.add('bo1175-mobile-read');document.body.appendChild(overlay);document.body.classList.add('bo-whiteboard-open');document.body.style.overflow='hidden';const host=document.getElementById('root');if(host)host.inert=true;overlay.setAttribute('role','region');overlay.setAttribute('aria-label','Editor visual do serviço');overlay.tabIndex=-1;overlay.focus({preventScroll:true});if(editorContextKind()==='blueprint')blueprintReferenceState().mode='reference';renderAll();resetNavigationHistory('Abrir quadro');await durableMirror('Início da sessão',{checkpoint:false});if((persistence.recovered||persistence.uncleanSession)&&!recoveryNoticeShown){recoveryNoticeShown=true;setTimeout(()=>showRecoveryNotice(),120)}return true}
  function close(reload=true){if(!overlay)return;if(hostedBlueprintListener){window.removeEventListener('message',hostedBlueprintListener);hostedBlueprintListener=null}pref().viewport={zoom,pan:clone(pan)};save(false,{checkpoint:true,label:'Fechar sessão'});endSession();overlay.remove();overlay=null;document.body.classList.remove('bo-whiteboard-open');document.body.style.overflow='';const host=document.getElementById('root');if(host)host.inert=false;if(reload)location.reload()}
  function closeToWhiteboards(){close(false);window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'whiteboards'}))}
  function btn(label,on,kind=''){const b=document.createElement('button');b.type='button';b.className=`rt144-btn ${kind}`;b.textContent=label;b.setAttribute('aria-label',String(label).replace(/[✓⚡◉↶↷⌘◇⌗☷⌕▣□◎＋↗✋↖]/g,'').trim()||String(label));b.onclick=on;return b}

  function selectorAttr(value){return String(value??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/[\n\r]/g,' ')}
  function focusDescriptor(el){if(!el||!overlay?.contains(el))return null;const tag=el.tagName?.toLowerCase();if(el.matches?.('.rt144-tool')&&el.getAttribute('aria-label'))return{selector:`.rt144-tool[aria-label="${selectorAttr(el.getAttribute('aria-label'))}"]`};if(el.id)return{selector:`[id="${selectorAttr(el.id)}"]`};if(el.getAttribute?.('data-focus-key'))return{selector:`[data-focus-key="${selectorAttr(el.getAttribute('data-focus-key'))}"]`};if(el.matches?.('button')&&el.getAttribute('title'))return{selector:`button[title="${selectorAttr(el.getAttribute('title'))}"]`};if(['input','textarea','select'].includes(tag)){const parent=el.closest?.('.rt144-field');const label=parent?.querySelector('span')?.textContent?.trim();if(label)return{fieldLabel:label,tag,selectionStart:el.selectionStart,selectionEnd:el.selectionEnd}}return null}
  function restoreFocusDescriptor(desc){if(!desc||!overlay)return;let el=null;if(desc.selector){try{el=overlay.querySelector(desc.selector)}catch{}}else if(desc.fieldLabel){for(const f of $$('.rt144-field',overlay)){if(f.querySelector('span')?.textContent?.trim()===desc.fieldLabel){el=f.querySelector(desc.tag);break}}}if(el){el.focus?.();if(typeof desc.selectionStart==='number'&&el.setSelectionRange)try{el.setSelectionRange(desc.selectionStart,desc.selectionEnd??desc.selectionStart)}catch{}}}

  // The reference view is the default presentation of an existing canonical Blueprint.
  // Switching to professional mode never deletes, migrates or duplicates Service Graph records.
  function blueprintReferenceState(){
    meta.blueprintReference ||= {version:1,boards:{}};
    return meta.blueprintReference.boards[boardId||'global'] ||= {mode:'reference',client:false};
  }

  function hostedBlueprintDocument(){
    const b=board(),j=activeJourney(),stages=serviceFrameStages(),saved=b.blueprintHosted||{};
    const ref={id:'host',title:b.name||'Blueprint de serviço',persona:saved.persona||j?.name||'',
      guide:1,start:stages.length?0:1,steps:[],c:{},iss:[],lanes:clone(saved.lanes||[]),links:[]};
    const laneId={evidence:'ev',customer:'ac',frontstage:'fl',backstage:'bk',process:'sy',enablement:'sy'};
    const order=new Map(stages.map((stage,index)=>[stage.id,index]));
    stages.forEach(st=>ref.steps.push({
      n:st.title||'Etapa',e:Number.isInteger(st.emotionScore)?Math.max(-2,Math.min(2,st.emotionScore)):st.emotion==='positive'?1:st.emotion==='negative'?-1:0,
      d:st.thoughts||st.customerAction||'',hostStageId:st.id,hostLocalId:st.blueprintHostLocalId||st.id
    }));
    const presented=new Set();
    Object.values(b.items||{}).forEach(it=>{
      if(isContainer(it)||it.kind==='smart'&&it.objectKind==='stage')return;
      const stageId=serviceFrameStageForItem(it),index=order.get(stageId),lane=laneId[serviceFrameLayerForItem(it)];
      if(index===undefined||!lane)return;
      const rec=it.kind==='smart'?entityRecord(it.objectKind,it.objectId):null;
      const value=it.kind==='smart'?entityTitle(it.objectKind,rec):it.text;
      if(!String(value||'').trim())return;
      (ref.c[lane+'|'+index] ||= []).push({i:it.id,t:String(value),hostItemId:it.id,hostKind:it.objectKind||'free'});
      presented.add(it.id);
    });
    stages.forEach((st,index)=>{
      if(!(ref.c['ac|'+index]?.length)&&st.customerAction)
        ref.c['ac|'+index]=[{i:'action-'+st.id,t:String(st.customerAction),hostAction:true}];
    });
    const issues=[...Object.values(graph.problems||{}).map(r=>({...r,sourceType:'d'})),
      ...Object.values(graph.opportunities||{}).map(r=>({...r,sourceType:'i'}))];
    issues.forEach(issue=>{
      const index=order.get(issue.stageId);
      if(index===undefined||issue.blueprintHiddenOn?.includes?.(boardId))return;
      const val=String(issue.sourceType==='d'?issue.description||issue.title:issue.title||issue.description||'').trim();
      if(!val)return;
      ref.iss.push({s:index,t:issue.sourceType,x:val,v:Number(issue.blueprintSeverity||2),d:Number(issue.blueprintDimension||1),
        hostEntityId:issue.id,hostLocalId:issue.blueprintHostLocalId||issue.id});
    });
    const listed=new Map();
    Object.values(ref.c).flat().forEach(note=>{if(note.hostItemId)listed.set(note.hostItemId,note.i)});
    Object.values(b.edges||{}).forEach(edge=>{
      if(listed.has(edge.fromId)&&listed.has(edge.toId))
        ref.links.push({a:listed.get(edge.fromId),b:listed.get(edge.toId),hostEdgeId:edge.id});
    });
    for(const [key,values] of Object.entries(saved.customCells||{})){
      if(/^x[a-z0-9]{1,12}\|\d+$/.test(key)&&Array.isArray(values))ref.c[key]=clone(values);
    }
    b.blueprintHostedShown=Array.from(presented);
    return ref;
  }
  function applyHostedBlueprintPatch(doc){
    if(!doc||!Array.isArray(doc.steps)||!doc.c||typeof doc.c!=='object'||mobileReadOnly())return;
    if(doc.steps.length>90||Object.values(doc.c).some(x=>!Array.isArray(x)||x.length>100))return;
    const b=board();if(!b)return;
    let j=activeJourney();
    if(!j){
      const id=uid('journey'),now=new Date().toISOString();
      graph.journeys ||= {};graph.journeys[id]={id,serviceId:graph.service.id,name:doc.title||'Jornada do Blueprint',
        stageIds:[],createdAt:now,updatedAt:now};
      graph.service.journeyIds ||= [];graph.service.journeyIds.push(id);b.journeyId=id;j=graph.journeys[id];
    }
    const sync=b.blueprintHostedSync ||= {stages:{},notes:{},issues:{}};
    const previousShown=new Set(b.blueprintHostedShown||[]);
    markEdit('Editar matriz do Blueprint');
    const timestamp=new Date().toISOString(),stageIds=[];
    doc.steps.forEach(step=>{
      const local=String(step.hostLocalId||step.hostStageId||'').slice(0,100),name=String(step.n||'Etapa').trim().slice(0,240)||'Etapa';
      let id=step.hostStageId&&graph.stages?.[step.hostStageId]?step.hostStageId:sync.stages[local];
      if(!id||!graph.stages?.[id])id=createGraphEntityWithTitle('stage',name,String(step.d||'').slice(0,1000));
      if(!id)return;
      sync.stages[local]=id;const st=graph.stages[id];
      st.title=name;st.thoughts=String(step.d||'').slice(0,1000);
      const emotion=Number(step.e);st.emotionScore=Number.isInteger(emotion)?Math.max(-2,Math.min(2,emotion)):0;
      st.emotion=st.emotionScore<0?'negative':st.emotionScore>0?'positive':'neutral';
      st.blueprintHostLocalId=local||id;st.updatedAt=timestamp;stageIds.push(id);
    });
    j.stageIds=stageIds;j.updatedAt=timestamp;
    const kindFor={ev:'evidence',fl:'frontstage',bk:'backstage',sy:'system'};
    const serviceLane={ev:'evidence',fl:'frontstage',bk:'backstage',sy:'enablement'};
    const nextShown=new Set(),newEdges=new Map();
    for(const [key,notes] of Object.entries(doc.c)){
      if(!Array.isArray(notes))continue;
      const match=/^([a-z][a-z0-9]*)\|(\d+)$/.exec(key);
      if(!match)continue;
      const [,lane,indexString]=match,index=Number(indexString),sid=stageIds[index];
      if(!sid)continue;
      if(lane==='ac'){
        graph.stages[sid].customerAction=notes.map(x=>String(x?.t||'').trim()).filter(Boolean).join(' · ').slice(0,1500);
        continue;
      }
      if(!kindFor[lane])continue;
      for(const note of notes){
        const value=String(note?.t||'').trim().slice(0,1000),nid=String(note?.i||'');
        if(!value||!nid)continue;
        let itemId=(note.hostItemId&&b.items[note.hostItemId])?note.hostItemId:
          (b.items[nid]?nid:sync.notes[nid]);
        let item=itemId?b.items[itemId]:null;
        if(!item){
          const kind=note.hostKind&&note.hostKind!=='free'?note.hostKind:kindFor[lane];
          const entityId=createGraphEntityWithTitle(kind,value);
          if(!entityId)continue;
          itemId=uid('smart');
          item={id:itemId,instanceId:itemId,instanceSchemaVersion:2,
            kind:'smart',objectKind:kind,objectId:entityId,entityRef:{type:kind,id:entityId},
            entityStatus:'linked',presentation:{tone:null},
            x:180+index*300,y:160+Object.keys(kindFor).indexOf(lane)*185,width:260,height:132,z:maxZ()+1};
          b.items[itemId]=item;
        }
        sync.notes[nid]=itemId;nextShown.add(itemId);
        // The original UI groups processes and systems in one visual row. Keep their distinct canonical layers.
        const canonicalLane=lane==='sy'&&item.serviceLayer==='process'?'process':serviceLane[lane];
        item.serviceStageId=sid;item.blueprintStageId=sid;item.serviceLayer=canonicalLane;
        item.blueprintLane=canonicalLane;
        if(item.kind==='smart'){
          const rec=entityRecord(item.objectKind,item.objectId);
          if(rec){
            if(item.objectKind==='touchpoint'||item.objectKind==='system'&&'name' in rec)rec.name=value;
            else if(item.objectKind==='problem')rec.description=value;
            else rec.title=value;
            rec.updatedAt=timestamp;
            assignBlueprintEntityStage(item.objectKind,item.objectId,sid,canonicalLane);
          }
        }else item.text=value;
        newEdges.set(nid,itemId);
      }
    }
    previousShown.forEach(id=>{if(!nextShown.has(id)&&b.items[id]){
      delete b.items[id];
      Object.entries(b.edges||{}).forEach(([eid,e])=>{if(e.fromId===id||e.toId===id)delete b.edges[eid]});
    }});
    b.blueprintHostedShown=[...nextShown];
    const nextIssues=new Set();
    (doc.iss||[]).slice(0,400).forEach(issue=>{
      const stageId=stageIds[Number(issue.s)],txt=String(issue.x||'').trim().slice(0,1000);
      if(!stageId||!txt||!['d','i'].includes(issue.t))return;
      const kind=issue.t==='d'?'problem':'opportunity',idKey=String(issue.hostLocalId||issue.hostEntityId||'');
      let id=issue.hostEntityId&&entityRecord(kind,issue.hostEntityId)?issue.hostEntityId:sync.issues[idKey];
      if(!id||!entityRecord(kind,id))id=createGraphEntityWithTitle(kind,txt);
      if(!id)return;
      sync.issues[idKey||id]=id;nextIssues.add(id);
      const rec=entityRecord(kind,id);
      rec.stageId=stageId;
      if(kind==='problem')rec.description=txt;else rec.title=txt;
      rec.blueprintSeverity=Math.min(3,Math.max(0,Number(issue.v)||0));
      rec.blueprintDimension=Math.min(4,Math.max(0,Number(issue.d)||0));
      rec.blueprintHostLocalId=idKey||id;
      rec.blueprintHiddenOn=(rec.blueprintHiddenOn||[]).filter(bid=>bid!==boardId);rec.updatedAt=timestamp;
      const st=graph.stages[stageId],field=kind==='problem'?'problemIds':'opportunityIds';
      st[field] ||= [];if(!st[field].includes(id))st[field].push(id);
    });
    const previousIssueIds=b.blueprintHostedShownIssues||[];
    previousIssueIds.forEach(id=>{
      if(nextIssues.has(id))return;
      const rec=graph.problems?.[id]||graph.opportunities?.[id];
      if(rec){rec.blueprintHiddenOn ||= [];if(!rec.blueprintHiddenOn.includes(boardId))rec.blueprintHiddenOn.push(boardId)}
    });
    b.blueprintHostedShownIssues=[...nextIssues];
    const referenced=new Set();
    (doc.links||[]).forEach(link=>{
      const from=newEdges.get(link.a),to=newEdges.get(link.b);
      if(!from||!to||from===to)return;
      const id=link.hostEdgeId&&b.edges[link.hostEdgeId]?link.hostEdgeId:uid('edge');
      b.edges[id] ||= {id,fromId:from,toId:to,fromHandle:'auto',toHandle:'auto',label:'',style:'solid',arrow:'end',route:'curve',waypoint:null};
      b.edges[id].blueprintHostedLink=true;referenced.add(id);
    });
    Object.entries(b.edges||{}).forEach(([id,edge])=>{
      if(edge.blueprintHostedLink&&!referenced.has(id))delete b.edges[id];
    });
    b.name=String(doc.title||b.name||'Blueprint de serviço').slice(0,240);
    const customCells={};Object.entries(doc.c).forEach(([key,value])=>{
      if(/^x[a-z0-9]{1,12}\|\d+$/.test(key)&&Array.isArray(value))
        customCells[key]=value.slice(0,100).map(n=>({i:String(n.i||uid('note')),t:String(n.t||'').slice(0,1000)}));
    });
    b.blueprintHosted={persona:String(doc.persona||'').slice(0,400),lanes:Array.isArray(doc.lanes)?clone(doc.lanes):[],
      customCells};
    invalidateViewLayout('journey');invalidateViewLayout('blueprint');
    save(false,{label:'Editar matriz do Blueprint'});
  }
  let hostedBlueprintListener=null;
  function renderReferenceCanvas(){
    if(hostedBlueprintListener){window.removeEventListener('message',hostedBlueprintListener);hostedBlueprintListener=null}
    const outer=document.createElement('section');outer.className='bo-blueprint-exact-host';
    outer.style.cssText='position:absolute;inset:0;z-index:210;background:#f5f7fb;overflow:hidden';
    const frame=document.createElement('iframe');frame.className='bo-blueprint-reference-frame';
    frame.title='Blue Ocean · Blueprint de Serviço';frame.src='/blueprint-reference-original.html?service-graph=1';
    frame.style.cssText='width:100%;height:100%;border:0;display:block;background:#f5f7fb';
    const viewBoardId=boardId;
    hostedBlueprintListener=event=>{
      if(!overlay||boardId!==viewBoardId||event.source!==frame.contentWindow||
        event.origin!==location.origin||event.data?.boBlueprintHost!==1)return;
      const {type,state}=event.data;
      if(type==='ready'){frame.contentWindow.postMessage({boBlueprintHost:1,type:'hydrate',state:hostedBlueprintDocument()},location.origin)}
      else if(type==='patch'){
        try{applyHostedBlueprintPatch(state)}catch(error){
          console.error('Falha ao editar Blueprint da referência',error);
          toast('Não foi possível atualizar o Blueprint. Verifique os dados.');
        }
      }else if(type==='professional'){
        blueprintReferenceState().mode='professional';
        save(false,{content:false,history:false,label:'Abrir ferramentas profissionais'});renderAll();
      }else if(type==='back'){
        close(false);window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'canvas'}));
        setTimeout(()=>window.dispatchEvent(new CustomEvent('bo-service-workspace-tab',{detail:'blueprint'})),0);
      }else if(type==='library'){
        close(false);window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'journeys'}));
      }
    };
    window.addEventListener('message',hostedBlueprintListener);
    outer.appendChild(frame);overlay.appendChild(outer);
  }

  function renderAll(){
    if(!overlay)return;const focusBefore=focusDescriptor(document.activeElement);const renderStarted=performance.now(); overlay.innerHTML='';overlay.dataset.view=pref().layoutMode||'free';overlay.classList.toggle('bo-simple-blueprint',editorContextKind()==='blueprint'&&blueprintLearningState().mode==='guided');overlay.dataset.cardDensity=pref().cardDensity||'normal';overlay.classList.toggle('rt1811-density-compact',pref().cardDensity==='compact');overlay.classList.toggle('rt1811-density-normal',pref().cardDensity==='normal');overlay.classList.toggle('rt1811-density-detailed',pref().cardDensity==='detailed');overlay.classList.toggle('zoom-far',zoom<.58);overlay.classList.toggle('zoom-near',zoom>1.18);overlay.classList.toggle('rt159-performance',Object.keys(board()?.items||{}).length>perf.cullThreshold);overlay.classList.toggle('rt183-blueprint-editor',(pref().layoutMode||'free')==='blueprint');const __learn=blueprintLearningState();overlay.classList.toggle('rt185-guided',(pref().layoutMode||'free')==='blueprint'&&__learn.mode==='guided');overlay.classList.toggle('rt185-professional',(pref().layoutMode||'free')==='blueprint'&&__learn.mode==='professional');overlay.classList.toggle('rt185-show-tips',__learn.showTips!==false);if(showInspector&&(selected.length||selectedEdge))showBlueprintDocument=false;overlay.classList.toggle('rt183-document-open',!!showBlueprintDocument&&(pref().layoutMode||'free')==='blueprint');if(editorContextKind()==='blueprint'&&blueprintReferenceState().mode!=='professional'){renderReferenceCanvas();return}renderTop();
    const body=document.createElement('div');body.className='rt144-body';overlay.appendChild(body);
    renderViewport(body); renderToolbar(body);
    if(showLibrary)renderLibrary(body);
    if(showLayers)renderLayers(body);
    if(showOutline)renderOutline(body);
    if(showInspector&&(selected.length||selectedEdge||inspectorMode==='board'))renderInspector(body);
    renderInspectorHandle(body);
    if(showBlueprintDocument&&(pref().layoutMode||'free')==='blueprint'&&!showInspector)renderBlueprintDocumentPanel(body);
    if(editorContextKind()==='blueprint')renderGuidedBlueprintPanel(body);
    if(showBoardMenu)renderBoardMenu();
    if(showEditHistory)renderEditHistory();
    if(quickCreate)renderQuickCreate();
    if(contextMenu)renderContextMenu();
    if(showCommandPalette)renderCommandPalette();
    renderHistoryState();
    perf.lastRenderMs=Math.max(0,performance.now()-renderStarted);perf.renderSamples++;perf.avgRenderMs=perf.renderSamples===1?perf.lastRenderMs:(perf.avgRenderMs*.88+perf.lastRenderMs*.12);overlay.dataset.renderMs=perf.lastRenderMs.toFixed(1);overlay.dataset.renderedItems=String(perf.renderedItems);overlay.dataset.totalItems=String(perf.totalItems);restoreFocusDescriptor(focusBefore);
  }

  function activeJourney(){const id=graph.views?.whiteboards?.[boardId]?.journeyId||meta.blueprintHome?.records?.[boardId]?.journeyId||meta.journeyStudio?.activeJourneyId||graph.service?.journeyIds?.[0];return graph.journeys?.[id]||graph.journeys?.[graph.service?.journeyIds?.[0]]||null}
  function journeyStudioState(){meta.journeyStudio ||= {};const j=activeJourney();if(j)meta.journeyStudio.activeJourneyId=j.id;meta.journeyStudio.version=1;return meta.journeyStudio}
  function stageStats(stageId){const items=Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&stageForItem(it)===stageId);return{items:items.length,touchpoints:items.filter(it=>it.kind==='smart'&&it.objectKind==='touchpoint').length,problems:items.filter(it=>it.kind==='smart'&&it.objectKind==='problem').length,metrics:items.filter(it=>it.kind==='smart'&&it.objectKind==='metric').length}}
  function moveJourneyStage(stageId,dir){const j=activeJourney();if(!j)return;const a=j.stageIds||[],i=a.indexOf(stageId),n=i+dir;if(i<0||n<0||n>=a.length)return;[a[i],a[n]]=[a[n],a[i]];markEdit('Reordenar etapas da Jornada');invalidateViewLayout('journey');invalidateViewLayout('blueprint');invalidateViewLayout('service');save(false);applyLayout((pref().layoutMode||'journey')==='service'?'service':'journey',true)}
  function addJourneyStage(options={}){
    const returnMode=options.returnTo==='service'||(pref().layoutMode||'free')==='service'?'service':'journey';
    if(returnMode==='service'&&!activeJourney()){const created=createJourneyFromHome({name:(graph.service?.name||'Serviço')+' · Fluxo principal',status:'draft'});if(created?.id){board().journeyId=created.id;meta.journeyStudio ||= {};meta.journeyStudio.activeJourneyId=created.id}}
    const m=modalShell('Nova etapa','Defina o momento da jornada e o que o cliente faz.');if(options.fromBuilder)appendBuilderStepper(m,'stages');appendContextGuidance(m,'stage');const form=document.createElement('form');form.className='rt188-stage-form';form.innerHTML='<label>Nome da etapa<input name="title" required maxlength="160" placeholder="Ex.: Pagamento"></label><label>O que o cliente faz?<textarea name="action" rows="3" placeholder="Ex.: escolhe uma forma de pagamento"></textarea></label><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Criar etapa</button></footer>';m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const title=form.elements.title.value.trim();if(!title)return;const j=activeJourney(),id=createGraphEntityWithTitle('stage',title,form.elements.action.value.trim());if(j)j.updatedAt=new Date().toISOString();markEdit('Adicionar etapa à Jornada');invalidateViewLayout('journey');invalidateViewLayout('blueprint');invalidateViewLayout('service');ensureJourney();save(false);applyLayout(returnMode,true);m.root.remove();if(options.fromBuilder)setTimeout(()=>resumeGuidedBuilder('stages'),55);return id};form.querySelector('input').focus();return m
  }
  async function archiveJourneyStage(stageId){const j=activeJourney(),st=graph.stages?.[stageId];if(!j||!st)return;if((j.stageIds||[]).length<=1){toast('A Jornada precisa manter ao menos uma etapa.');return}if(!await confirmDialog('Arquivar etapa',`Arquivar a etapa “${st.title}”? Os objetos relacionados continuam no Service Graph.`,'Arquivar',true))return;j.stageIds=j.stageIds.filter(id=>id!==stageId);st.archived=true;markEdit('Arquivar etapa da Jornada');invalidateViewLayout('journey');invalidateViewLayout('blueprint');invalidateViewLayout('service');save(false);applyLayout((pref().layoutMode||'journey')==='service'?'service':'journey',true)}
  function assignJourneyEntityStage(kind,id,stageId){const rec=entityRecord(kind,id);if(!rec||!stageId||!graph.stages?.[stageId])return;if(kind==='touchpoint'){Object.values(graph.stages||{}).forEach(st=>st.touchpointIds=(st.touchpointIds||[]).filter(x=>x!==id));graph.stages[stageId].touchpointIds ||= [];graph.stages[stageId].touchpointIds.push(id)}else if(kind==='problem'){Object.values(graph.stages||{}).forEach(st=>st.problemIds=(st.problemIds||[]).filter(x=>x!==id));graph.stages[stageId].problemIds ||= [];graph.stages[stageId].problemIds.push(id);rec.stageId=stageId}else if(kind==='opportunity'){Object.values(graph.stages||{}).forEach(st=>st.opportunityIds=(st.opportunityIds||[]).filter(x=>x!==id));graph.stages[stageId].opportunityIds ||= [];graph.stages[stageId].opportunityIds.push(id);rec.stageId=stageId}else rec.stageId=stageId}
  function addJourneyEntity(kind,stageId,sourceItemId=null,options={}){const label=smartLabel(kind),m=modalShell('Adicionar '+label,'Crie este objeto já ligado à etapa correta.');if(options.fromBuilder)appendBuilderStepper(m,options.builderStep||kind);appendContextGuidance(m,topicForObjectKind(kind)||topicForBuilderStep(options.builderStep||kind));const form=document.createElement('form');form.className='rt188-stage-form';form.innerHTML='<label>Nome<input name="title" required maxlength="240" placeholder="Descreva o objeto"></label><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Adicionar</button></footer>';m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const title=form.elements.title.value.trim();if(!title)return;const id=createGraphEntityWithTitle(kind,title,''),rec=entityRecord(kind,id);assignJourneyEntityStage(kind,id,stageId);if(rec){rec.experienceState=journeyPrimitiveState().stateMode==='future'?'future':'current';if(kind==='evidence')rec.confidence=rec.confidence||'hypothesis'}if(rec&&['need','expectation','metric'].includes(kind))rec.personaIds=journeyPrimitiveState().activePersonaId?[journeyPrimitiveState().activePersonaId]:[];const itemId=addSmart(kind,id);const createdItem=itemId?board().items[itemId]:null;if(createdItem&&(options.serviceLayer||(pref().layoutMode||'free')==='service')){createdItem.serviceStageId=stageId;createdItem.serviceLayer=options.serviceLayer||serviceFrameLayerForKind(kind)}if(options.fromAssistant){assistantTagSmartItem(itemId,kind,id,stageId);assistantArrangeVisualBoard()}if(sourceItemId&&itemId&&board().items[sourceItemId]){const edgeId=uid('edge');board().edges[edgeId]={id:edgeId,fromId:sourceItemId,toId:itemId,fromHandle:'auto',toHandle:'auto',label:'relaciona',style:'solid',arrow:'end',route:'curve',waypoint:null}}invalidateViewLayout('journey');invalidateViewLayout('blueprint');invalidateViewLayout('service');save(false);const mode=pref().layoutMode||'journey';if(mode==='journey'||mode==='blueprint'||mode==='service')applyLayout(mode,true);else renderAll();m.root.remove();if(options.fromAssistant){showInspector=false;selected=[];const st=serviceBuilderAssistantState();st.panelOpen=true;st.currentStep=options.builderStep||kind;save(false,{content:false,label:'Atualizar Assistente'});setTimeout(()=>{renderAll();if(options.builderStep==='experience')showStageFlowBuilder(stageId,options)},45)}else if(options.fromBuilder&&options.builderStep&&['experience','operation'].includes(options.builderStep))setTimeout(()=>resumeGuidedStageFlow(options.builderStep,stageId),55);else if(options.fromBuilder)setTimeout(()=>resumeGuidedBuilder(options.builderStep||kind),55)};form.querySelector('input').focus();return m}
  function journeyStudioSummary(){const j=activeJourney(),stages=orderedStages(),pid=journeyPrimitiveState().activePersonaId;return{journey:j,stages,personaId:pid,touchpoints:Object.values(graph.touchpoints||{}).length,problems:Object.values(graph.problems||{}).length,opportunities:Object.values(graph.opportunities||{}).length,metrics:Object.values(entityCollection('metric')||{}).length,emotions:stages.map(s=>emotionForStage(s.id,pid)).filter(Boolean).length}}
  function guidedBuilderState(){
    meta.guidedServiceBuilder ||= {version:2,reviewed:{evidence:false,problems:false,improvements:false,metrics:false},lastStep:'service',assistanceMode:'guided'};
    meta.guidedServiceBuilder.reviewed ||= {evidence:false,problems:false,improvements:false,metrics:false};
    meta.guidedServiceBuilder.assistanceMode=normalizeAssistanceMode(meta.guidedServiceBuilder.assistanceMode||'guided');
    meta.guidedServiceBuilder.version=2;
    if(meta.guidedCoachPinned==null)meta.guidedCoachPinned=false;
    return meta.guidedServiceBuilder
  }
  function guidanceMode(){return guidedBuilderState().assistanceMode}
  function setGuidanceMode(mode,{quiet=false}={}){const s=guidedBuilderState(),next=normalizeAssistanceMode(mode);s.assistanceMode=next;save(false,{content:false,label:'Alterar nível de assistência'});if(!quiet){renderAll();toast(next==='guided'?'Assistência guiada ativada.':next==='essential'?'Assistência essencial ativada.':'Assistência desligada.')}return next}
  function guidanceModeLabel(mode=guidanceMode()){return mode==='guided'?'Guiada':mode==='essential'?'Essencial':'Desligada'}
  function closeGuidanceDrawer(){document.querySelector('.bo1188-guidance-scrim')?.remove();document.querySelector('.bo1188-guidance-drawer')?.remove()}
  function showGuidanceDrawer(topicKey='service'){
    const guide=guidanceTopic(topicKey);closeGuidanceDrawer();
    const scrim=document.createElement('div');scrim.className='bo1188-guidance-scrim';scrim.onclick=()=>closeGuidanceDrawer();
    const drawer=document.createElement('aside');drawer.className='bo1188-guidance-drawer';drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-label',guide.title);
    drawer.innerHTML=`<header><div><small>${esc(guide.eyebrow)}</small><h2>${esc(guide.title)}</h2><p>${esc(guide.summary)}</p></div><button type="button" data-close aria-label="Fechar">×</button></header><div class="bo1188-guidance-body"><section class="bo1188-guidance-section"><h3>Por que isso importa</h3><p>${esc(guide.why)}</p></section><section class="bo1188-guidance-section"><h3>Como fazer</h3><ol>${guide.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section><section class="bo1188-guidance-section"><h3>Exemplo</h3><div class="bo1188-example">${esc(guide.example)}</div></section><section class="bo1188-guidance-section"><h3>Erros comuns</h3><ul>${guide.mistakes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section><section class="bo1188-guidance-section"><h3>Checklist</h3><div class="bo1188-checklist">${guide.checklist.map(x=>`<span><i>✓</i>${esc(x)}</span>`).join('')}</div></section></div><footer class="bo1188-guidance-footer"><span>Assistência ${guidanceModeLabel()}</span><button type="button" data-understood>Entendi</button></footer>`;
    document.body.append(scrim,drawer);drawer.querySelector('[data-close]').onclick=closeGuidanceDrawer;drawer.querySelector('[data-understood]').onclick=closeGuidanceDrawer;setTimeout(()=>drawer.querySelector('[data-close]')?.focus(),0);return drawer
  }
  function appendContextGuidance(modal,topicKey){
    const mode=guidanceMode();if(mode==='off')return null;const guide=guidanceTopic(topicKey),card=document.createElement('section');card.className='bo1188-context-guide '+(mode==='essential'?'essential':'guided');
    card.innerHTML=`<div><small>${esc(guide.eyebrow)}</small><b>${esc(guide.title)}</b><span>${mode==='guided'?esc(guide.summary):'Ajuda contextual disponível para esta atividade.'}</span></div>`;const help=document.createElement('button');help.type='button';help.textContent='Como fazer';help.onclick=()=>showGuidanceDrawer(topicKey);card.appendChild(help);modal.box.appendChild(card);return card
  }
  function appendAssistanceBar(modal){
    const mode=guidanceMode(),bar=document.createElement('section');bar.className='bo1188-assistance-bar';bar.innerHTML=`<div><small>NÍVEL DE ASSISTÊNCIA</small><strong>${mode==='guided'?'Explicações, exemplos e próximo passo':mode==='essential'?'Dicas curtas sem interromper o trabalho':'Interface limpa; ajuda apenas quando solicitada'}</strong></div><div class="bo1188-mode-switch"></div>`;const sw=bar.querySelector('.bo1188-mode-switch');[['guided','Guiada'],['essential','Essencial'],['off','Desligada']].forEach(([value,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.classList.toggle('active',value===mode);b.setAttribute('aria-pressed',String(value===mode));b.onclick=()=>{setGuidanceMode(value,{quiet:true});modal.root.remove();setTimeout(showGuidedServiceBuilder,20)};sw.appendChild(b)});modal.box.appendChild(bar);return bar
  }
  function currentGuidanceTopic(){const context=editorContextKind();if(context==='blueprint')return 'blueprint';if(context==='journey')return 'journey';const next=guidedBuilderProgress().steps.find(x=>!x.done);return topicForBuilderStep(next?.key||guidedBuilderState().lastStep||'service')}
  function showContextGuidance(){return showGuidanceDrawer(currentGuidanceTopic())}
  function guidanceSnapshot(){const state=guidedBuilderState();return buildGuidanceSnapshot(graph,{activeJourneyId:activeJourney()?.id,reviewed:state.reviewed,mode:state.assistanceMode,completedAt:state.completedAt})}
  function builderStepIndex(key){return Math.max(0,guidedBuilderProgress().steps.findIndex(x=>x.key===key))}
  function appendBuilderStepper(modal,activeKey){
    const p=guidedBuilderProgress(),state=guidedBuilderState(),active=activeKey||state.lastStep||p.steps.find(x=>!x.done)?.key||'complete';
    const nav=document.createElement('nav');nav.className='bo1172-builder-stepper';nav.setAttribute('aria-label','Etapas da montagem do serviço');
    p.steps.forEach((step,i)=>{const b=document.createElement('button');b.type='button';b.className=(step.done?'done ':'')+(step.key===active?'active':'');b.innerHTML=`<i>${step.done?'✓':i+1}</i><span>${esc(step.label)}</span>`;b.title=step.detail;b.onclick=()=>{modal.root.remove();guidedBuilderState().lastStep=step.key;save(false);builderActionFor(step.key)};nav.appendChild(b)});
    modal.box.appendChild(nav);return nav
  }
  function builderPreviewElement(){
    const p=guidedBuilderProgress(),stages=p.stages||[],sec=document.createElement('section');sec.className='bo1172-live-preview';
    const counts={touchpoints:Object.values(graph.touchpoints||{}).length,problems:Object.values(graph.problems||{}).length,opportunities:Object.values(graph.opportunities||{}).length,metrics:Object.values(entityCollection('metric')||{}).length};
    sec.innerHTML=`<header><div><small>PRÉVIA AO VIVO</small><b>${esc(graph.service?.name||'Serviço')}</b><span>Atualiza a cada passo sem criar uma cópia dos dados.</span></div><em>${p.percent}%</em></header>`;
    const canvas=document.createElement('div');canvas.className='bo1172-preview-canvas';
    if(!stages.length){canvas.innerHTML='<div class="bo1172-preview-empty"><b>O quadro começa pelas etapas</b><span>Crie o primeiro momento do serviço para visualizar a estrutura aqui.</span></div>'}
    else stages.slice(0,6).forEach((st,i)=>{const op=operationKindsForStage(st.id).size,col=document.createElement('article');col.className='bo1172-preview-stage';col.innerHTML=`<small>ETAPA ${String(i+1).padStart(2,'0')}</small><b>${esc(st.title||'Etapa')}</b><p>${esc(st.customerAction||'Ação do cliente ainda não definida')}</p><div><span>${(st.touchpointIds||[]).length} contato${(st.touchpointIds||[]).length===1?'':'s'}</span><span>${op}/4 operação</span></div>`;canvas.appendChild(col)});
    sec.appendChild(canvas);const stats=document.createElement('footer');stats.innerHTML=`<span><b>${stages.length}</b> etapas</span><span><b>${counts.touchpoints}</b> touchpoints</span><span><b>${counts.problems}</b> problemas</span><span><b>${counts.opportunities}</b> oportunidades</span><span><b>${counts.metrics}</b> métricas</span>`;sec.appendChild(stats);
    return sec
  }
  function builderFinalSummaryElement(modal){
    const p=guidedBuilderProgress(),continuity=serviceContinuitySummary(),stages=p.stages||[],sec=document.createElement('section');sec.className='bo1172-builder-summary';
    const count=k=>Object.values(entityCollection(k)||{}).length;
    sec.innerHTML=`<header><small>RESUMO FINAL</small><b>Base do serviço estruturada</b><span>O roteiro terminou. Os mesmos objetos já estão disponíveis em Jornada, Blueprint, Fluxo e Livre.</span></header><div class="bo1172-summary-grid"><div><strong>${p.percent}%</strong><span>Readiness</span></div><div><strong>${stages.length}</strong><span>Etapas</span></div><div><strong>${continuity.percent}%</strong><span>Continuidade</span></div><div><strong>${count('metric')}</strong><span>Métricas</span></div></div>`;
    const actions=document.createElement('div');actions.className='bo1172-summary-actions';actions.append(btn('Abrir Jornada',()=>{modal.root.remove();applyLayout('journey',true);setTimeout(fitCurrentView,40)},'primary'),btn('Abrir Blueprint',()=>{modal.root.remove();applyLayout('blueprint',true);setTimeout(fitCurrentView,40)}),btn('Concluir roteiro',()=>{guidedBuilderState().completedAt=new Date().toISOString();guidedBuilderState().lastStep='complete';save(false);modal.root.remove();toast('Montagem do serviço concluída.')}));sec.appendChild(actions);return sec
  }
  function resumeGuidedBuilder(stepKey){
    const p=guidedBuilderProgress(),next=p.steps.find(x=>!x.done),state=guidedBuilderState();state.lastStep=next?.key||'complete';state.lastCompletedStep=stepKey;save(false);renderAll();setTimeout(showGuidedServiceBuilder,55)
  }
  function resumeGuidedStageFlow(stepKey,stageId){
    const p=guidedBuilderProgress(),current=p.steps.find(x=>x.key===stepKey);if(current?.done){resumeGuidedBuilder(stepKey);return}
    const stages=p.stages||[],gap=stepKey==='experience'?stages.find(st=>!stageHasKind(st.id,'customerAction')||!stageHasKind(st.id,'touchpoint')||!stageHasKind(st.id,'emotion')):stages.find(st=>['frontstage','backstage','process','system'].some(k=>!stageHasKind(st.id,k)));
    guidedBuilderState().lastStep=stepKey;save(false);renderAll();setTimeout(()=>showStageFlowBuilder((gap||graph.stages?.[stageId])?.id||stageId,{fromBuilder:true,builderStep:stepKey}),55)
  }
  function meaningfulServiceBasics(){
    const name=String(graph.service?.name||'').trim(),desc=String(graph.service?.description||'').trim();
    return !!name&&!/^Serviço principal$/i.test(name)&&!!desc&&!/^Experiência ponta a ponta do serviço\.?$/i.test(desc)
  }
  function primaryPersona(){
    const all=Object.values(graph?.entities?.persona||{});return all.find(p=>!/^Cliente principal$/i.test(String(p?.title||p?.name||''))||!/^Persona principal deste serviço$/i.test(String(p?.description||'')))||all[0]||null
  }
  function operationKindsForStage(stageId){
    const kinds=new Set();Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&stageForItem(it)===stageId).forEach(it=>{const lane=laneForItem(it);if(['frontstage','backstage','process','system'].includes(lane))kinds.add(lane)});return kinds
  }
  function guidedBuilderProgress(){
    const state=guidedBuilderState(),stages=orderedStages(),persona=primaryPersona();
    const serviceDone=meaningfulServiceBasics();
    const customerDone=!!persona&&!(/^Cliente principal$/i.test(String(entityTitle('persona',persona)||''))&&/^Persona principal deste serviço$/i.test(String(persona.description||'')));
    const stagesDone=stages.length>0;
    const experienceDone=stagesDone&&stages.every(st=>String(st.customerAction||'').trim()&&(st.touchpointIds||[]).length>0&&!!emotionForStage(st.id));
    const operationDone=stagesDone&&stages.every(st=>operationKindsForStage(st.id).size>=4);
    const problemCount=Object.values(graph.problems||{}).filter(x=>stages.some(st=>st.id===x.stageId)).length;
    const opportunityCount=Object.values(graph.opportunities||{}).filter(x=>stages.some(st=>st.id===x.stageId)).length;
    const metricCount=Object.values(graph?.entities?.metric||{}).filter(x=>!x.stageId||stages.some(st=>st.id===x.stageId)).length;
    const steps=[
      {key:'service',label:'Serviço',done:serviceDone,detail:serviceDone?'Proposta e escopo definidos':'Defina o que está sendo entregue'},
      {key:'customer',label:'Cliente',done:customerDone,detail:customerDone?entityTitle('persona',persona):'Diga quem vive esta experiência'},
      {key:'stages',label:'Etapas',done:stagesDone,detail:stagesDone?`${stages.length} etapa(s)`:'Crie os grandes momentos do serviço'},
      {key:'experience',label:'Experiência',done:experienceDone,detail:experienceDone?'Ações e pontos de contato mapeados':'Mapeie ações e pontos de contato'},
      {key:'operation',label:'Operação',done:operationDone,detail:operationDone?'Entrega conectada às etapas':'Ligue experiência e bastidores'},
      {key:'problems',label:'Problemas',done:problemCount>0||state.reviewed.problems,detail:problemCount?`${problemCount} problema(s)`:(state.reviewed.problems?'Revisado sem problema':'Procure fricções')},
      {key:'improvements',label:'Melhorias',done:opportunityCount>0||state.reviewed.improvements,detail:opportunityCount?`${opportunityCount} oportunidade(s)`:(state.reviewed.improvements?'Revisado':'Transforme fricções em oportunidades')},
      {key:'metrics',label:'Métricas',done:metricCount>0||state.reviewed.metrics,detail:metricCount?`${metricCount} métrica(s)`:(state.reviewed.metrics?'Revisado':'Defina como saber se melhorou')}
    ];
    const done=steps.filter(x=>x.done).length;return{steps,done,total:steps.length,percent:Math.round(done/steps.length*100),stages,problemCount,opportunityCount,metricCount,persona}
  }
  function whiteboardUxState(){
    meta.whiteboardUx ||= {version:1,autoInspector:false,showReadiness:true};
    if(meta.whiteboardUx.autoInspector==null)meta.whiteboardUx.autoInspector=false;
    if(meta.whiteboardUx.showReadiness==null)meta.whiteboardUx.showReadiness=true;
    meta.whiteboardUx.version=1;
    return meta.whiteboardUx
  }
  function serviceReadinessReport(){
    const p=guidedBuilderProgress(),score=p.percent;
    return{score,done:p.done,total:p.total,status:blueprintHealthStatus(score),formula:'8 blocos: Serviço, Cliente, Etapas, Experiência, Operação, Problemas, Melhorias e Métricas',next:p.steps.find(x=>!x.done)||null}
  }
  function showReadinessDetails(){
    const r=serviceReadinessReport(),journey=journeyHealthReport(),blueprint=blueprintHealthReport(),m=modalShell('Readiness do serviço','Um indicador geral para responder se a base do serviço está estruturada. Diagnósticos específicos permanecem separados.');
    m.box.classList.add('rt1161-readiness-modal');
    const hero=document.createElement('section');hero.className=`rt1161-readiness-hero ${r.status.key}`;hero.innerHTML=`<div><small>READINESS</small><strong>${r.score}<em>%</em></strong></div><div><b>${esc(r.status.label)}</b><span>${r.done}/${r.total} blocos estruturados</span><p>${esc(r.formula)}</p></div>`;m.box.appendChild(hero);
    if(r.next){const next=document.createElement('section');next.className='rt1161-readiness-next';next.innerHTML=`<small>PRÓXIMO PASSO</small><b>${esc(r.next.label)}</b><span>${esc(r.next.detail)}</span>`;next.appendChild(btn('Continuar montagem',()=>{m.root.remove();builderActionFor(r.next.key)},'primary'));m.box.appendChild(next)}
    const diagnostics=document.createElement('section');diagnostics.className='rt1161-readiness-diagnostics';diagnostics.innerHTML=`<header><b>Diagnósticos específicos</b><span>Estes números medem coisas diferentes e não substituem o Readiness.</span></header><button data-kind="journey"><span><b>Completude da Jornada</b><small>Cobertura de etapas, contatos, canais e emoções.</small></span><strong>${journey.score}%</strong></button><button data-kind="blueprint"><span><b>Saúde do Blueprint</b><small>Consistência operacional e gaps estruturais.</small></span><strong>${blueprint.score}%</strong></button>`;m.box.appendChild(diagnostics);
    diagnostics.querySelector('[data-kind="journey"]').onclick=()=>{m.root.remove();showJourneyHealth()};
    diagnostics.querySelector('[data-kind="blueprint"]').onclick=()=>{m.root.remove();showBlueprintDocument=true;blueprintDocumentTab='health';renderAll()};
  }

  function editServiceBasics(){
    const m=modalShell('1. Defina o serviço','Comece pelo contexto. O quadro vem depois.');m.box.classList.add('rt1811-builder-modal');appendBuilderStepper(m,'service');appendContextGuidance(m,'service');const form=document.createElement('form');form.className='rt1811-builder-form';form.innerHTML=`<label><span>Qual serviço você quer mapear?</span><input name="name" required maxlength="160" value="${esc(graph.service?.name||'')}" placeholder="Ex.: Implantação do cliente"></label><label><span>O que o cliente está tentando conseguir?</span><textarea name="description" rows="4" required placeholder="Descreva o resultado que o serviço entrega">${esc(graph.service?.description||'')}</textarea></label><footer><button type="button" data-cancel>Cancelar</button><button class="primary" type="submit">Salvar e continuar</button></footer>`;m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),name=String(fd.get('name')||'').trim(),description=String(fd.get('description')||'').trim();if(!name||!description)return;markEdit('Definir serviço');graph.service.name=name;graph.service.description=description;graph.service.updatedAt=new Date().toISOString();guidedBuilderState().lastStep='customer';save(false);m.root.remove();renderAll();setTimeout(showGuidedServiceBuilder,40)};form.querySelector('input')?.focus()
  }
  function editBuilderPersona(){
    const current=primaryPersona(),m=modalShell('2. Quem vive esta experiência?','Use linguagem simples agora; detalhes de Persona podem ser aprofundados depois.');m.box.classList.add('rt1811-builder-modal');appendBuilderStepper(m,'customer');appendContextGuidance(m,'persona');const form=document.createElement('form');form.className='rt1811-builder-form';form.innerHTML=`<label><span>Cliente / persona</span><input name="name" required maxlength="160" value="${esc(current?entityTitle('persona',current):'')}" placeholder="Ex.: Dono de pequena empresa"></label><label><span>Necessidade principal</span><textarea name="description" rows="4" placeholder="O que essa pessoa precisa resolver?">${esc(current?.description||'')}</textarea></label><footer><button type="button" data-cancel>Cancelar</button><button class="primary" type="submit">Salvar cliente</button></footer>`;m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),name=String(fd.get('name')||'').trim(),description=String(fd.get('description')||'').trim();if(!name)return;markEdit('Definir cliente');let persona=current;if(!persona){const id=createGraphEntityWithTitle('persona',name,description);persona=entityRecord('persona',id)}else{persona.title=name;persona.description=description;persona.updatedAt=new Date().toISOString()}if(persona){journeyPrimitiveState().activePersonaId=persona.id;guidedBuilderState().lastStep='stages'}save(false);m.root.remove();if(overlay)renderAll();setTimeout(showGuidedServiceBuilder,40)};form.querySelector('input')?.focus()
  }
  function editStageCustomerAction(stageId,options={}){
    const st=graph.stages?.[stageId];if(!st)return;const m=modalShell(`O que acontece em “${st.title}”?`,'Descreva a ação do cliente antes de adicionar outros objetos.');m.box.classList.add('rt1811-builder-modal');if(options.fromBuilder)appendBuilderStepper(m,options.builderStep||'experience');appendContextGuidance(m,'customerAction');const form=document.createElement('form');form.className='rt1811-builder-form';form.innerHTML=`<label><span>O que o cliente faz nesta etapa?</span><textarea name="action" rows="4" required placeholder="Ex.: compara opções e tira dúvidas">${esc(st.customerAction||'')}</textarea></label><footer><button type="button" data-cancel>Cancelar</button><button class="primary" type="submit">Salvar ação</button></footer>`;m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const v=String(new FormData(form).get('action')||'').trim();if(!v)return;markEdit('Editar ação do cliente');st.customerAction=v;st.updatedAt=new Date().toISOString();invalidateViewLayout('journey');invalidateViewLayout('blueprint');if(options.fromAssistant)assistantArrangeVisualBoard();save(false);if((pref().layoutMode||'free')==='journey')applyLayout('journey',true);else renderAll();m.root.remove();if(options.fromAssistant){showInspector=false;selected=[];const ast=serviceBuilderAssistantState();ast.panelOpen=true;ast.currentStep=options.builderStep||'experience';save(false,{content:false,label:'Atualizar Assistente'});setTimeout(()=>{renderAll();showStageFlowBuilder(stageId,options)},45)}else if(options.fromBuilder&&options.builderStep)setTimeout(()=>resumeGuidedStageFlow(options.builderStep,stageId),55);else if(options.returnToStageFlow)setTimeout(()=>showStageFlowBuilder(stageId,options),45)};form.querySelector('textarea')?.focus()
  }
  function stageHasKind(stageId,kind){
    const st=graph.stages?.[stageId];if(!st)return false;
    if(kind==='customerAction')return String(st.customerAction||'').trim().length>2;
    if(kind==='touchpoint')return (st.touchpointIds||[]).length>0;
    if(kind==='emotion')return !!emotionForStage(stageId);
    if(['frontstage','backstage','process','system'].includes(kind))return operationKindsForStage(stageId).has(kind);
    if(kind==='problem')return Object.values(graph.problems||{}).some(x=>x.stageId===stageId)||Object.values(board()?.items||{}).some(it=>stageForItem(it)===stageId&&it.kind==='smart'&&it.objectKind==='problem');
    if(kind==='opportunity')return Object.values(graph.opportunities||{}).some(x=>x.stageId===stageId)||Object.values(board()?.items||{}).some(it=>stageForItem(it)===stageId&&it.kind==='smart'&&it.objectKind==='opportunity');
    if(kind==='metric')return Object.values(entityCollection('metric')||{}).some(x=>x.stageId===stageId)||Object.values(board()?.items||{}).some(it=>stageForItem(it)===stageId&&it.kind==='smart'&&it.objectKind==='metric');
    return Object.values(board()?.items||{}).some(it=>stageForItem(it)===stageId&&it.kind==='smart'&&it.objectKind===kind)
  }
  function serviceContinuitySummary(){
    const stages=orderedStages(),links=stages.slice(0,-1).map((st,i)=>({from:st,to:stages[i+1],done:String(st.handoffOut||'').trim().length>2,text:String(st.handoffOut||'').trim()}));
    const done=links.filter(x=>x.done).length;return{links,done,total:links.length,percent:links.length?Math.round(done/links.length*100):100,ready:done===links.length}
  }
  function editStageHandoff(stageId,options={}){
    const stages=orderedStages(),idx=stages.findIndex(x=>x.id===stageId),st=stages[idx],next=stages[idx+1];if(!st||!next){toast('Esta é a última etapa do serviço.');return}
    const m=modalShell(`Passagem · ${st.title} → ${next.title}`,'Explique o que encerra esta etapa e faz o serviço avançar. Isso conecta os momentos sem criar mais cards.');m.box.classList.add('rt1811-builder-modal','rt1813-handoff-modal');
    if(options.fromBuilder)appendBuilderStepper(m,options.builderStep||'experience');
    const form=document.createElement('form');form.className='rt1811-builder-form';form.innerHTML=`<label><span>O que faz o cliente ou o serviço avançar para “${esc(next.title)}”?</span><textarea name="handoff" rows="4" required placeholder="Ex.: cliente escolhe uma opção e confirma que quer avançar">${esc(st.handoffOut||'')}</textarea></label><div class="rt1813-handoff-example"><small>EXEMPLOS</small><span>Decide comprar · Agenda atendimento · Recebe confirmação · Conclui cadastro · Solicita suporte</span></div><footer><button type="button" data-cancel>Cancelar</button><button class="primary" type="submit">Salvar passagem</button></footer>`;m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const value=String(new FormData(form).get('handoff')||'').trim();if(!value)return;markEdit('Definir passagem de etapa');st.handoffOut=value;st.updatedAt=new Date().toISOString();next.handoffIn=value;next.updatedAt=new Date().toISOString();if(options.fromAssistant)assistantArrangeVisualBoard();save(false);m.root.remove();renderAll();setTimeout(()=>showStageFlowBuilder(stageId,options),30)};form.querySelector('textarea')?.focus()
  }
  function stageFlowReport(stageId){
    const st=graph.stages?.[stageId];if(!st)return null;
    const stages=orderedStages(),idx=stages.findIndex(x=>x.id===stageId),prev=idx>0?stages[idx-1]:null,next=idx>=0&&idx<stages.length-1?stages[idx+1]:null;
    const experience=[
      {key:'customerAction',label:'Ação do cliente',hint:'O que a pessoa faz ou tenta alcançar nesta etapa.',done:stageHasKind(stageId,'customerAction')},
      {key:'touchpoint',label:'Ponto de contato',hint:'Onde a interação acontece.',done:stageHasKind(stageId,'touchpoint')},
      {key:'emotion',label:'Emoção',hint:'Como a pessoa se sente neste momento.',done:stageHasKind(stageId,'emotion')}
    ];
    const operation=[
      {key:'frontstage',label:'Ação visível',hint:'O que a equipe faz diante do cliente.',done:stageHasKind(stageId,'frontstage')},
      {key:'backstage',label:'Ação de bastidor',hint:'O que acontece internamente para sustentar a entrega.',done:stageHasKind(stageId,'backstage')},
      {key:'process',label:'Processo',hint:'Qual fluxo operacional sustenta este momento.',done:stageHasKind(stageId,'process')},
      {key:'system',label:'Sistema',hint:'Qual ferramenta ou tecnologia dá suporte.',done:stageHasKind(stageId,'system')}
    ];
    const improve=[
      {key:'problem',label:'Problema',hint:'Existe alguma fricção ou dificuldade?',done:stageHasKind(stageId,'problem'),optional:true},
      {key:'opportunity',label:'Oportunidade',hint:'O que pode ser melhorado?',done:stageHasKind(stageId,'opportunity'),optional:true},
      {key:'metric',label:'Métrica',hint:'Como saber se este momento está funcionando?',done:stageHasKind(stageId,'metric'),optional:true}
    ];
    const core=[...experience,...operation],done=core.filter(x=>x.done).length,ready=done===core.length,handoffDone=!next||String(st.handoffOut||'').trim().length>2,flowTotal=core.length+(next?1:0),flowDone=done+(next&&handoffDone?1:0);
    return{stage:st,prev,next,experience,operation,improve,core,done,total:core.length,percent:Math.round(done/core.length*100),ready,handoffDone,continuous:ready&&handoffDone,flowDone,flowTotal,flowPercent:Math.round(flowDone/flowTotal*100)}
  }
  function stageFlowAction(stageId,key,options={}){
    if(key==='customerAction')return editStageCustomerAction(stageId,{...options,returnToStageFlow:true});
    if(['frontstage','backstage','process','system'].includes(key)){
      if(options.fromAssistant)return addBlueprintEntity(key,stageId,null,options);
      if((pref().layoutMode||'free')!=='blueprint'){applyLayout('blueprint');setTimeout(()=>addBlueprintEntity(key,stageId,null,options),40);return}
      return addBlueprintEntity(key,stageId,null,options)
    }
    return addJourneyEntity(key,stageId,null,options)
  }
  function showStageFlowBuilder(stageId,options={}){
    const report=stageFlowReport(stageId);if(!report)return;const stages=orderedStages(),idx=stages.findIndex(x=>x.id===stageId),m=modalShell(`Construir etapa · ${report.stage.title}`,'Construa o fluxo deste momento e deixe clara a passagem para o próximo. Jornada e Blueprint continuam usando os mesmos dados.');m.box.classList.add('rt1812-stageflow-modal','rt1813-stageflow-modal');
    if(options.fromBuilder)appendBuilderStepper(m,options.builderStep||'experience');
    appendContextGuidance(m,options.builderStep==='operation'?'blueprint':'journey');
    const strip=document.createElement('nav');strip.className='rt1813-stage-strip';stages.forEach((st,i)=>{const r=stageFlowReport(st.id),b=document.createElement('button');b.type='button';b.className=(st.id===stageId?'active ':'')+(r?.continuous?'ready':r?.flowPercent>0?'started':'');b.innerHTML=`<i>${r?.continuous?'✓':i+1}</i><span><b>${esc(st.title)}</b><small>${r?.flowPercent||0}%</small></span>`;b.onclick=()=>{m.root.remove();showStageFlowBuilder(st.id,options)};strip.appendChild(b)});m.box.appendChild(strip);
    const hero=document.createElement('div');hero.className='rt1812-stageflow-hero rt1813-stageflow-hero';hero.innerHTML=`<div><small>ETAPA ${String(idx+1).padStart(2,'0')} DE ${String(stages.length).padStart(2,'0')}</small><b>${report.continuous?'Etapa conectada':report.flowPercent+'% do fluxo pronto'}</b><span>${report.flowDone}/${report.flowTotal} pontos do fluxo definidos</span></div><div class="rt1812-stageflow-progress"><i style="width:${report.flowPercent}%"></i></div>`;m.box.appendChild(hero);
    const chain=document.createElement('section');chain.className='rt1813-flow-chain';chain.innerHTML='<header><div><b>Fluxo da etapa</b><span>Leia da esquerda para a direita. Clique no que estiver faltando.</span></div></header>';const chainRow=document.createElement('div');chainRow.className='rt1813-flow-chain-row';report.core.forEach((row,i)=>{const b=document.createElement('button');b.type='button';b.className=row.done?'done':'missing';b.innerHTML=`<i>${row.done?'✓':i+1}</i><span>${esc(row.label)}</span>${i<report.core.length-1?'<em>→</em>':''}`;b.onclick=()=>{m.root.remove();stageFlowAction(stageId,row.key,options)};chainRow.appendChild(b)});chain.appendChild(chainRow);m.box.appendChild(chain);
    const renderGroup=(title,subtitle,rows)=>{const sec=document.createElement('section');sec.className='rt1812-stageflow-group';sec.innerHTML=`<header><div><b>${esc(title)}</b><span>${esc(subtitle)}</span></div></header>`;rows.forEach(row=>{const item=document.createElement('div');item.className='rt1812-stageflow-row '+(row.done?'done':'pending');item.innerHTML=`<i>${row.done?'✓':'○'}</i><span><b>${esc(row.label)}</b><small>${esc(row.hint)}</small></span>`;const action=btn(row.done?(row.key==='customerAction'?'Editar':'Adicionar outro'):'Adicionar',()=>{m.root.remove();stageFlowAction(stageId,row.key,options)},row.done?'ghost':'primary');item.appendChild(action);sec.appendChild(item)});m.box.appendChild(sec)};
    renderGroup('Experiência do cliente','Primeiro entenda o que acontece para a pessoa.',report.experience);
    renderGroup('Como o serviço entrega','Depois conecte a experiência à operação.',report.operation);
    if(report.next){const hand=document.createElement('section');hand.className='rt1813-handoff '+(report.handoffDone?'done':'pending');hand.innerHTML=`<div class="rt1813-handoff-icon">${report.handoffDone?'✓':'→'}</div><div><small>PASSAGEM PARA A PRÓXIMA ETAPA</small><b>${esc(report.stage.title)} → ${esc(report.next.title)}</b><span>${report.handoffDone?esc(report.stage.handoffOut):'O que faz o cliente ou a operação avançar para o próximo momento?'}</span></div>`;hand.appendChild(btn(report.handoffDone?'Editar passagem':'Definir passagem',()=>{m.root.remove();editStageHandoff(stageId,options)},report.handoffDone?'ghost':'primary'));m.box.appendChild(hand)}
    renderGroup('Aprender e melhorar','Use quando houver evidência suficiente; estes itens não bloqueiam a etapa.',report.improve);
    const foot=document.createElement('footer');foot.className='rt1812-stageflow-footer';const nav=document.createElement('div');if(idx>0)nav.appendChild(btn('← Etapa anterior',()=>{m.root.remove();showStageFlowBuilder(stages[idx-1].id,options)}));if(idx<stages.length-1){if(report.ready&&!report.handoffDone)nav.appendChild(btn('Definir passagem →',()=>{m.root.remove();editStageHandoff(stageId,options)},'primary'));else nav.appendChild(btn('Próxima etapa →',()=>{m.root.remove();showStageFlowBuilder(stages[idx+1].id,options)},report.continuous?'primary':''))}const view=document.createElement('div');if(options.fromAssistant)view.append(btn('← Voltar ao assistente',()=>{m.root.remove();const st=serviceBuilderAssistantState();st.panelOpen=true;renderAll()}));else if(options.fromBuilder)view.append(btn('← Voltar ao roteiro',()=>{m.root.remove();showGuidedServiceBuilder()}));view.append(btn('Ver na Jornada',()=>{m.root.remove();applyLayout('journey');setTimeout(fitCurrentView,30)}),btn('Ver no Blueprint',()=>{m.root.remove();applyLayout('blueprint');setTimeout(fitCurrentView,30)}));foot.append(nav,view);m.box.appendChild(foot)
  }
  function markBuilderReviewed(key){const s=guidedBuilderState();if(key==='problems')s.reviewed.problems=true;if(key==='improvements')s.reviewed.improvements=true;if(key==='metrics')s.reviewed.metrics=true;save(false);renderAll();setTimeout(showGuidedServiceBuilder,20)}
  function createGuidedJourney(){
    const m=modalShell('3. Crie a Jornada base','As etapas precisam pertencer a uma Jornada. Nada será preenchido automaticamente.');m.box.classList.add('rt1811-builder-modal');appendBuilderStepper(m,'stages');appendContextGuidance(m,'journey');const form=document.createElement('form');form.className='rt188-stage-form';form.innerHTML='<label>Nome da Jornada<input name="name" required maxlength="160" placeholder="Ex.: Contratação do serviço"></label><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Criar Jornada vazia</button></footer>';m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=async e=>{e.preventDefault();const name=String(form.elements.name.value||'').trim();if(!name)return;const created=createJourneyFromHome({name,status:'draft'});if(!created?.id)return;meta.journeyStudio ||= {};meta.journeyStudio.activeJourneyId=created.id;guidedBuilderState().lastStep='stages';m.root.remove();await openJourneyFromHome(created.id);setTimeout(()=>addJourneyStage({fromBuilder:true}),60)};form.querySelector('input')?.focus();return m
  }
  function builderActionFor(stepKey){
    const p=guidedBuilderProgress(),stages=p.stages,first=stages[0];
    if(stepKey==='service')return editServiceBasics();
    if(stepKey==='objective')return editServiceIntent();
    if(stepKey==='customer')return editBuilderPersona();
    if(stepKey==='stages')return activeJourney()?addJourneyStage({fromBuilder:true}):createGuidedJourney();
    if(stepKey==='experience'){
      if(!activeJourney())return createGuidedJourney();
      const gap=stages.find(st=>!stageHasKind(st.id,'customerAction')||!stageHasKind(st.id,'touchpoint')||!stageHasKind(st.id,'emotion'))||first;return gap?showStageFlowBuilder(gap.id,{fromBuilder:true,builderStep:'experience'}):addJourneyStage({fromBuilder:true})
    }
    if(stepKey==='operation'){
      if(!activeJourney())return createGuidedJourney();
      const gap=stages.find(st=>['frontstage','backstage','process','system'].some(k=>!stageHasKind(st.id,k)))||first;return gap?showStageFlowBuilder(gap.id,{fromBuilder:true,builderStep:'operation'}):addJourneyStage({fromBuilder:true})
    }
    if(stepKey==='evidence'){if(!activeJourney())return createGuidedJourney();const target=stages.find(st=>(st.touchpointIds||[]).length)||first;return addJourneyEntity('evidence',target?.id,null,{fromBuilder:true,builderStep:'evidence'})}
    if(stepKey==='problems'){if(!activeJourney())return createGuidedJourney();const target=stages.find(st=>(st.touchpointIds||[]).length)||first;return addJourneyEntity('problem',target?.id,null,{fromBuilder:true,builderStep:'problems'})}
    if(stepKey==='improvements'){if(!activeJourney())return createGuidedJourney();const target=stages.find(st=>(st.problemIds||[]).length)||first;return addJourneyEntity('opportunity',target?.id,null,{fromBuilder:true,builderStep:'improvements'})}
    if(stepKey==='metrics'){if(!activeJourney())return createGuidedJourney();const target=stages.find(st=>(st.touchpointIds||[]).length)||first;return addJourneyEntity('metric',target?.id,null,{fromBuilder:true,builderStep:'metrics'})}
  }
  function nextBuilderStep(){const p=guidedBuilderProgress();return p.steps.find(x=>!x.done)||null}
  function showGuidedServiceBuilder(){
    const p=guidedBuilderProgress(),state=guidedBuilderState(),next=p.steps.find(x=>!x.done),active=state.lastStep&&state.lastStep!=='complete'?state.lastStep:(next?.key||'complete');
    const m=modalShell('Montar serviço','Comece pelo contexto, acompanhe a prévia e avance sem perder o quadro. Tudo continua no mesmo Service Graph.');m.box.classList.add('rt1811-builder-modal','rt1811-builder-overview','bo1172-builder-modal');
    appendBuilderStepper(m,active);
    appendAssistanceBar(m);
    const hero=document.createElement('div');hero.className='rt1811-builder-hero bo1172-builder-hero';hero.innerHTML=`<div><small>PROGRESSO DO GUIA</small><b>${p.percent}% concluído</b><span>${p.done}/${p.total} blocos do guia</span></div><div class="rt1811-builder-progress"><i style="width:${p.percent}%"></i></div>`;m.box.appendChild(hero);
    const body=document.createElement('div');body.className='bo1172-builder-body';
    const route=document.createElement('div');route.className='bo1172-builder-route';const grid=document.createElement('div');grid.className='rt1811-builder-steps';p.steps.forEach((step,i)=>{const row=document.createElement('button');row.type='button';row.className='rt1811-builder-step '+(step.done?'done ':'pending ')+(step.key===active?'active':'');row.innerHTML=`<i>${step.done?'✓':i+1}</i><span><b>${esc(step.label)}</b><small>${esc(step.detail)}</small></span><em>${step.done?'Revisar':step.key===active?'Fazer agora →':'Abrir →'}</em>`;row.onclick=()=>{state.lastStep=step.key;save(false);m.root.remove();builderActionFor(step.key)};grid.appendChild(row)});route.appendChild(grid);
    const continuity=serviceContinuitySummary();if(continuity.total){const flow=document.createElement('section');flow.className='rt1813-builder-continuity '+(continuity.ready?'ready':'pending');const missing=continuity.links.find(x=>!x.done);flow.innerHTML=`<div><small>CONTINUIDADE ENTRE ETAPAS</small><b>${continuity.done}/${continuity.total} passagens definidas</b><span>${continuity.ready?'O serviço tem uma sequência explícita entre todos os momentos.':`Ainda falta explicar como “${esc(missing?.from?.title||'uma etapa')}” leva a “${esc(missing?.to?.title||'próxima etapa')}”.`}</span></div><em>${continuity.percent}%</em>`;if(missing)flow.appendChild(btn('Conectar etapas',()=>{m.root.remove();showStageFlowBuilder(missing.from.id,{fromBuilder:true,builderStep:active==='operation'?'operation':'experience'})},'primary'));route.appendChild(flow)}
    body.append(route,builderPreviewElement());m.box.appendChild(body);
    if(!next)m.box.appendChild(builderFinalSummaryElement(m));
    const foot=document.createElement('div');foot.className='rt1811-builder-footer bo1172-builder-footer';if(next){const copy=document.createElement('div');copy.innerHTML=`<small>PRÓXIMO PASSO</small><b>${esc(next.label)}</b><span>${esc(next.detail)}</span>`;foot.appendChild(copy);foot.appendChild(btn('Continuar',()=>{state.lastStep=next.key;save(false);m.root.remove();builderActionFor(next.key)},'primary'))}else{const copy=document.createElement('div');copy.innerHTML='<small>SERVIÇO ESTRUTURADO</small><b>Roteiro concluído</b><span>Use o resumo acima para abrir a leitura que você precisa.</span>';foot.appendChild(copy)}m.box.appendChild(foot);
    const review=document.createElement('div');review.className='rt1811-builder-review';[['problems','Nenhum problema identificado por enquanto'],['improvements','Melhorias revisadas por enquanto'],['metrics','Métricas serão definidas depois']].forEach(([k,l])=>{const step=p.steps.find(x=>x.key===k);if(step&&!step.done){const b=btn(l,()=>{m.root.remove();markBuilderReviewed(k)},'ghost');review.appendChild(b)}});if(review.children.length)m.box.appendChild(review)
  }
  function renderGuidedServiceCoach(wrap){
    const mode=guidanceMode();if(mode==='off'||meta.guidedCoachPinned!==true||showLibrary||showLayers||showOutline||showInspector||showBlueprintDocument||selected.length||selectedEdge)return;
    const p=guidedBuilderProgress(),next=p.steps.find(x=>!x.done),d=document.createElement('aside');d.className='rt1811-coach bo1188-coach '+mode;
    d.innerHTML=`<div class="rt1811-coach-top"><span>${mode==='guided'?'Montagem do primeiro serviço':'Assistência'}</span><b>${p.percent}%</b></div><div class="rt1811-coach-progress"><i style="width:${p.percent}%"></i></div>${next?`<small>PRÓXIMO PASSO</small><strong>${esc(next.label)}</strong><p>${mode==='guided'?esc(next.detail):'Há um próximo passo recomendado.'}</p>`:'<small>BASE CONCLUÍDA</small><strong>Continue refinando</strong><p>Use Saúde, Evidências e Relações para aprofundar o serviço.</p>'}<div class="rt1811-coach-actions"></div>`;
    const a=$('.rt1811-coach-actions',d);if(next)a.appendChild(btn('Fazer agora',()=>builderActionFor(next.key),'primary'));a.appendChild(btn('Como fazer',()=>showGuidanceDrawer(topicForBuilderStep(next?.key||'service'))));a.appendChild(btn('Ver roteiro',showGuidedServiceBuilder));wrap.appendChild(d)
  }
  const SERVICE_RECIPE_TEMPLATES={
    generic:{label:'Serviço geral',hint:'Base flexível para serviços presenciais, digitais ou híbridos.',ingredients:['client','promise','journey','channels','people','processes','systems','rules','resources','metrics']},
    restaurant:{label:'Restaurante / Delivery',hint:'Atendimento, pedido, produção, pagamento e entrega.',ingredients:['client','promise','journey','channels','people','processes','systems','rules','resources','metrics','capacity']},
    clinic:{label:'Clínica / Saúde',hint:'Agendamento, atendimento, prontuário, retorno e experiência.',ingredients:['client','promise','journey','channels','people','processes','systems','rules','resources','metrics','evidence']},
    consulting:{label:'Consultoria / Serviço profissional',hint:'Diagnóstico, proposta, execução, comunicação e resultado.',ingredients:['client','promise','journey','channels','people','processes','systems','rules','resources','metrics','evidence']},
    saas:{label:'SaaS / Produto digital',hint:'Aquisição, onboarding, uso, suporte, retenção e métricas.',ingredients:['client','promise','journey','channels','people','processes','systems','rules','metrics','evidence']},
    field:{label:'Serviço técnico / Campo',hint:'Solicitação, triagem, deslocamento, execução e encerramento.',ingredients:['client','promise','journey','channels','people','processes','systems','rules','resources','metrics','capacity']}
  };
  const SERVICE_RECIPE_INGREDIENTS={
    client:{label:'Cliente',question:'Para quem este serviço existe?',icon:'◎'},promise:{label:'Promessa',question:'Qual resultado prometemos entregar?',icon:'✦'},journey:{label:'Jornada',question:'Quais momentos o cliente percorre?',icon:'→'},channels:{label:'Canais',question:'Onde o cliente interage?',icon:'◉'},people:{label:'Pessoas',question:'Quem participa da entrega?',icon:'♟'},processes:{label:'Processos',question:'Como o trabalho é executado?',icon:'↻'},systems:{label:'Sistemas',question:'Quais ferramentas sustentam a operação?',icon:'▣'},rules:{label:'Regras',question:'Quais políticas e limites precisam ser respeitados?',icon:'§'},resources:{label:'Recursos',question:'O que é necessário para operar?',icon:'◆'},metrics:{label:'Métricas',question:'Como sabemos se está funcionando?',icon:'↗'},capacity:{label:'Capacidade',question:'Quais limites de volume, fila ou disponibilidade existem?',icon:'▥'},evidence:{label:'Evidências',question:'O que comprova que o desenho representa a realidade?',icon:'⌕'}
  };
  const SERVICE_FRAME_LAYERS=BLUEPRINT_FRAME_LAYERS.map(layer=>({...layer,hint:layer.question,visible:layer.visibleToCustomer}));
  const SERVICE_FRAME_LAYER_KEYS=SERVICE_FRAME_LAYERS.map(x=>x.key);
  const SERVICE_FRAME_KIND_TO_LAYER={persona:'customer',need:'customer',job:'customer',pain:'customer',problemHypothesis:'customer',problem:'customer',evidence:'evidence',emotion:'customer',customerAction:'customer',touchpoint:'frontstage',channel:'frontstage',frontstage:'frontstage',person:'frontstage',responsible:'frontstage',role:'frontstage',backstage:'backstage',process:'process',task:'process',opportunity:'process',dependency:'process',policy:'process',system:'enablement',resource:'enablement',metric:'enablement'};
  function serviceFrameLayerForKind(kind){return SERVICE_FRAME_KIND_TO_LAYER[kind]||'customer'}
  function serviceFrameLayerForItem(it){if(!it)return'customer';if(it.kind==='smart'&&it.objectKind==='evidence'&&(!it.serviceLayer||it.serviceLayer==='customer'))return'evidence';if(SERVICE_FRAME_LAYER_KEYS.includes(it.serviceLayer))return it.serviceLayer;if(it.kind==='smart')return serviceFrameLayerForKind(it.objectKind);return serviceFrameLayerForKind(it.semantic||visualKind(it))}
  function serviceFrameStages(){return assistantScopedStages().length?assistantScopedStages():orderedStages()}
  function serviceFrameStageForItem(it){if(it?.serviceStageId&&graph.stages?.[it.serviceStageId])return it.serviceStageId;return stageForItem(it)}
  function serviceCompositionState(){
    meta.serviceComposition ||= {version:2,boards:{}};meta.serviceComposition.boards ||= {};
    const key=boardId||'global';const st=meta.serviceComposition.boards[key] ||= {version:2,businessType:'',selectedIngredients:[],preparedAt:null,experienceMode:'undecided',showRecipePrompt:true,frameMode:'structured',showLines:true};
    st.version=2;if(!Array.isArray(st.selectedIngredients))st.selectedIngredients=[];if(st.showLines===undefined)st.showLines=true;st.frameMode='structured';return st
  }
  function serviceRecipeTemplate(){return SERVICE_RECIPE_TEMPLATES[serviceCompositionState().businessType]||SERVICE_RECIPE_TEMPLATES.generic}
  function serviceRecipeProgress(){const st=serviceCompositionState(),tpl=serviceRecipeTemplate(),selected=new Set(st.selectedIngredients);const done=tpl.ingredients.filter(k=>selected.has(k)).length;return{done,total:tpl.ingredients.length,percent:tpl.ingredients.length?Math.round(done/tpl.ingredients.length*100):0}}
  function setBoardExperienceMode(mode){const st=serviceCompositionState();st.experienceMode=mode;st.showRecipePrompt=mode==='undecided';save(false,{content:false,label:'Modo do Whiteboard'});renderAll()}
  function discoveryContextReady(){
    const personas=Object.keys(graph?.entities?.persona||{}).length;
    const hypotheses=Object.keys(graph?.entities?.problemHypothesis||{}).length;
    const staged=Object.keys(graph?.problems||{}).length;
    return personas>0&&(hypotheses+staged)>0
  }
  function openServiceContextHome(){
    if(overlay)close(false);
    try{sessionStorage.setItem('bo-context-kind','persona')}catch{}
    window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'context'}));
    return true
  }
  function smartObjectOrigin(it){
    if(!it||it.kind!=='smart')return {type:'service'};
    const rec=entityRecord(it.objectKind,it.objectId)||{};
    if(rec.sourceBlueprintBoardId&&graph.views?.whiteboards?.[rec.sourceBlueprintBoardId])return {type:'blueprint',boardId:rec.sourceBlueprintBoardId};
    if(it.objectKind==='problem'&&graph.problems?.[it.objectId])return {type:'journey',stageId:graph.problems[it.objectId]?.stageId};
    const pages={persona:'personas',need:'needs',job:'jobs',pain:'pains',problemHypothesis:'hypotheses',problem:'problems',evidence:'evidence',metric:'metrics'};
    if(pages[it.objectKind])return {type:'context',page:pages[it.objectKind]};
    if(['stage','touchpoint','emotion','customerAction'].includes(it.objectKind))return {type:'journey',stageId:it.objectKind==='stage'?it.objectId:(rec.stageId||stageForItem(it)||null)};
    if(it.objectKind==='task')return {type:'action'};
    if(['frontstage','backstage','process','system','resource','person','role','dependency','policy'].includes(it.objectKind)){const bp=Object.values(graph.views?.whiteboards||{}).find(b=>b.viewKind==='blueprint'&&(it.blueprintStageId?b.journeyId===graph.stages?.[it.blueprintStageId]?.journeyId:true));if(bp)return {type:'blueprint',boardId:bp.id}}
    return {type:'service'}
  }
  function openSmartObjectOrigin(it){
    const origin=smartObjectOrigin(it);
    if(origin.type==='blueprint'&&origin.boardId){close(false);setTimeout(()=>openServiceBlueprint(origin.boardId),40);return true}
    if(origin.type==='context'&&origin.page){close(false);try{sessionStorage.setItem('bo-context-kind',it.objectKind)}catch{}window.dispatchEvent(new CustomEvent('bo-open-context-page',{detail:origin.page}));return true}
    if(origin.type==='journey'){const stageId=origin.stageId||stageForItem(it)||null;close(false);window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'journey'}));if(stageId)setTimeout(()=>window.dispatchEvent(new CustomEvent('bo-global-object-focus',{detail:{kind:it.objectKind,id:it.objectId,stageId}})),30);return true}
    if(origin.type==='action'){close(false);window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'action'}));return true}
    close(false);window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'home'}));return true
  }
  function showServiceRecipe(){return openServiceContextHome()}
  function ensureServiceCompositionInstances(){
    const j=assistantScopedJourney?.()||activeJourney();const stages=j?.stageIds?.map(id=>graph.stages?.[id]).filter(Boolean)||orderedStages();
    const stageSet=new Set(stages.map(s=>s.id));
    const addKind=kind=>Object.values(entityCollection(kind)||{}).forEach(rec=>{const sid=kind==='touchpoint'?stages.find(st=>(st.touchpointIds||[]).includes(rec.id))?.id:rec.stageId;if(sid&&stageSet.has(sid)){const it=assistantEnsureSmartItem(kind,rec.id);it.serviceStageId=sid;it.serviceLayer ||= serviceFrameLayerForKind(kind)}});
    ['evidence','touchpoint','frontstage','backstage','process','system','resource'].forEach(addKind)
  }
  function serviceFrameMetrics(){
    const stages=serviceFrameStages(),rootX=120,rootY=120,labelW=380,gutter=20,colW=340,headerH=158,rowGap=16,stageIndex=new Map(stages.map((s,i)=>[s.id,i])),counts=SERVICE_FRAME_LAYERS.map(()=>Array(Math.max(1,stages.length)).fill(0));
    Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&!(it.kind==='smart'&&it.objectKind==='stage')).forEach(it=>{const sid=serviceFrameStageForItem(it),c=stageIndex.get(sid);if(c==null)return;const r=SERVICE_FRAME_LAYERS.findIndex(x=>x.key===serviceFrameLayerForItem(it));if(r>=0)counts[r][c]=(counts[r][c]||0)+1});
    const cardStep=118,rowHeights=counts.map((row,r)=>Math.max(r===0?200:188,78+Math.max(1,...row)*cardStep)),rowTops=[];let y=headerH+34;rowHeights.forEach(h=>{rowTops.push(y);y+=h+rowGap});
    const stageLeft=labelW+gutter,width=stageLeft+Math.max(1,stages.length)*colW,totalHeight=y+54;return{stages,rootX,rootY,labelW,gutter,colW,headerH,rowGap,stageLeft,width,totalHeight,rowHeights,rowTops,cardStep,stageIndex}
  }
  function serviceFrameItemsFor(stageId,layerKey){return Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&!(it.kind==='smart'&&it.objectKind==='stage')&&serviceFrameStageForItem(it)===stageId&&serviceFrameLayerForItem(it)===layerKey)}
  function serviceFrameStageCoverage(stageId){
    const st=graph.stages?.[stageId],present=new Set();if(String(st?.customerAction||'').trim())present.add('customer');
    SERVICE_FRAME_LAYERS.forEach(layer=>{if(serviceFrameItemsFor(stageId,layer.key).some(item=>{const record=item.kind==='smart'?entityRecord(item.objectKind,item.objectId):null;return layer.key==='evidence'?isCustomerServiceEvidence(record):String(record?.title||record?.name||record?.description||item.text||'').trim()}))present.add(layer.key)});
    const missing=SERVICE_FRAME_LAYERS.filter(layer=>!present.has(layer.key)),complete=SERVICE_FRAME_LAYERS.length-missing.length;return{complete,total:SERVICE_FRAME_LAYERS.length,percent:Math.round(complete/SERVICE_FRAME_LAYERS.length*100),missing}
  }
  function serviceFrameCoverageReport(){const stages=serviceFrameStages(),rows=stages.map(st=>({stage:st,...serviceFrameStageCoverage(st.id)})),complete=rows.reduce((n,x)=>n+x.complete,0),total=rows.reduce((n,x)=>n+x.total,0);return{stages:rows,complete,total,percent:total?Math.round(complete/total*100):0}}
  function editServiceCustomerAction(stageId){
    const st=graph.stages?.[stageId];if(!st)return;const m=modalShell('Ação do cliente','Descreva o que a pessoa faz ou tenta alcançar nesta etapa.');const form=document.createElement('form');form.className='rt188-stage-form';form.innerHTML='<label>Ação do cliente<textarea name="action" rows="4" maxlength="500" placeholder="Ex.: escolhe um horário para a coleta"></textarea></label><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Salvar ação</button></footer>';m.box.appendChild(form);form.elements.action.value=st.customerAction||'';form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();st.customerAction=form.elements.action.value.trim();st.updatedAt=new Date().toISOString();invalidateViewLayout('service');save(false,{label:'Atualizar ação do cliente'});m.root.remove();applyLayout('service',true)};setTimeout(()=>form.elements.action.focus(),0)
  }
  function addServiceFrameEntity(layerKey,stageId){
    if(layerKey==='customer'){editServiceCustomerAction(stageId);return}
    const layer=SERVICE_FRAME_LAYERS.find(x=>x.key===layerKey)||SERVICE_FRAME_LAYERS[0],kind=layer.defaultKind;addJourneyEntity(kind,stageId,null,{serviceLayer:layerKey})
  }
  const SERVICE_OPERATION_DEFS=[
    {kind:'role',field:'roleIds',label:'Papel',plural:'Papéis',hint:'Quem executa ou responde por esta parte da entrega?'},
    {kind:'channel',field:'channelIds',label:'Canal',plural:'Canais',hint:'Por qual canal a interação ou handoff acontece?'},
    {kind:'dependency',field:'dependencyIds',label:'Dependência',plural:'Dependências',hint:'Do que esta atividade depende para acontecer?'},
    {kind:'policy',field:'policyIds',label:'Política',plural:'Políticas',hint:'Que regra, limite ou política condiciona esta atividade?'},
    {kind:'evidence',field:'evidenceIds',label:'Evidência',plural:'Evidências',hint:'Que evidência física ou digital torna a entrega observável?'}
  ];
  function serviceVisibilityForLayer(layer){return layer==='evidence'||layer==='customer'||layer==='frontstage'?'customer-visible':'internal'}
  function operationalIds(rec,field){return Array.isArray(rec?.[field])?[...new Set(rec[field].filter(Boolean))]:[]}
  function operationalDef(kind){return SERVICE_OPERATION_DEFS.find(x=>x.kind===kind)||null}
  function setOperationalLink(rec,def,id,on){if(!rec||!def)return;const set=new Set(operationalIds(rec,def.field));on?set.add(id):set.delete(id);rec[def.field]=[...set];rec.updatedAt=new Date().toISOString()}
  function operationalEntities(kind,stageId=null){return Object.values(entityCollection(kind)||{}).filter(rec=>!stageId||!rec.stageId||rec.stageId===stageId)}
  function createOperationalEntity(kind,stageId,onCreated){
    const def=operationalDef(kind);if(!def)return;const m=modalShell('Novo '+def.label,def.hint),form=document.createElement('form');form.className='rt188-stage-form bo1205-operational-form';form.innerHTML=`<label>Nome<input name="title" required maxlength="180" placeholder="${esc(def.label)}"></label>${kind==='evidence'?'<label>Tipo de evidência<select name="medium"><option value="physical">Física</option><option value="digital">Digital</option><option value="human">Humana</option><option value="documentary">Documental</option><option value="operational">Operacional</option></select></label>':''}<footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Criar</button></footer>`;m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const title=form.elements.title.value.trim();if(!title)return;const id=createGraphEntityWithTitle(kind,title,''),rec=entityRecord(kind,id);if(rec){rec.stageId=stageId||rec.stageId||null;rec.serviceId=graph.service.id;if(kind==='evidence'){rec.evidenceMedium=form.elements.medium.value||'operational';rec.evidencePurpose='service'};rec.updatedAt=new Date().toISOString()}save(false,{label:'Criar '+def.label});m.root.remove();onCreated?.(id,rec)};setTimeout(()=>form.elements.title.focus(),0)
  }
  function serviceOperationStageSummary(stageId){
    const items=Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&serviceFrameStageForItem(it)===stageId),front=items.filter(it=>serviceFrameLayerForItem(it)==='frontstage'),back=items.filter(it=>serviceFrameLayerForItem(it)==='backstage'),proc=items.filter(it=>serviceFrameLayerForItem(it)==='process'),enable=items.filter(it=>serviceFrameLayerForItem(it)==='enablement'),records=[...front,...back,...proc,...enable].filter(it=>it.kind==='smart').map(it=>entityRecord(it.objectKind,it.objectId)).filter(Boolean);const countField=field=>new Set(records.flatMap(rec=>operationalIds(rec,field))).size,frontRecords=front.filter(it=>it.kind==='smart').map(it=>entityRecord(it.objectKind,it.objectId)).filter(Boolean),channels=new Set(frontRecords.flatMap(rec=>operationalIds(rec,'channelIds'))).size,visibleEvidence=Object.values(entityCollection('evidence')||{}).filter(ev=>ev.stageId===stageId&&isCustomerServiceEvidence(ev)).length,roles=countField('roleIds'),dependencies=countField('dependencyIds'),policies=countField('policyIds'),checks=[front.length>0,back.length>0,roles>0,channels>0,dependencies>0,policies>0,visibleEvidence>0],complete=checks.filter(Boolean).length;return{frontstage:front.length,backstage:back.length,roles,channels,dependencies,policies,visibleEvidence,complete,total:checks.length,percent:Math.round(complete/checks.length*100)}
  }
  function methodologyField(parent,label,value='',options={}){
    const wrapper=document.createElement('label');wrapper.className='bo-method-field';
    const caption=document.createElement('span');caption.textContent=label;wrapper.appendChild(caption);
    const control=document.createElement(options.multiline?'textarea':'input');
    control.setAttribute('aria-label',label);control.value=value??'';
    if(options.multiline)control.rows=options.rows||2;
    else control.type=options.numeric?'number':'text';
    if(options.numeric){control.min=options.positive?'0.01':'0';control.step='any';control.inputMode='decimal'}
    if(options.hint){const hint=document.createElement('small');hint.textContent=options.hint;wrapper.appendChild(hint)}
    wrapper.appendChild(control);parent.appendChild(wrapper);return control;
  }
  function methodologySection(parent,title,description=''){
    const section=document.createElement('section');section.className='bo-method-section';const heading=document.createElement('h3');heading.textContent=title;section.appendChild(heading);
    if(description){const hint=document.createElement('p');hint.textContent=description;section.appendChild(hint)}parent.appendChild(section);return section;
  }
  function methodologyActions(form,m,label,onSubmit){
    const status=document.createElement('p');status.className='bo-method-error';status.setAttribute('role','alert');form.appendChild(status);
    const footer=document.createElement('footer');footer.className='bo-method-actions';footer.appendChild(btn('Cancelar',()=>m.root.remove()));
    const submit=btn(label,()=>{},'primary');submit.type='submit';footer.appendChild(submit);form.appendChild(footer);
    form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;onSubmit(status)};
  }
  function showBlueprintActivityDetails(item){
    if(mobileReadOnly()||item?.kind!=='smart')return;
    const original=entityRecord(item.objectKind,item.objectId);if(!original)return;
    const activeBoardId=boardId,stageId=serviceFrameStageForItem(item);
    const evidence=item.objectKind==='evidence',m=modalShell(evidence?'Evidência do serviço':'Detalhes da atividade',graph.stages[stageId]?.title||'Blueprint');m.box.classList.add('bo-method-dialog');
    const form=document.createElement('form');form.className='bo-method-form';m.box.appendChild(form);
    const title=methodologyField(form,'Nome',entityTitle(item.objectKind,original));title.required=true;title.maxLength=300;
    if(evidence){
      const description=methodologyField(form,'Descrição',original.description||'',{multiline:true});
      const purposeLabel=document.createElement('label');purposeLabel.className='bo-method-field';purposeLabel.textContent='Uso da evidência';
      const purpose=document.createElement('select');purpose.setAttribute('aria-label','Uso da evidência');purpose.required=true;purpose.innerHTML='<option value="">Selecione o uso</option><option value="service">Artefato percebido pelo cliente</option><option value="research">Evidência de pesquisa</option>';purpose.value=original.evidencePurpose||'';purposeLabel.appendChild(purpose);form.appendChild(purposeLabel);
      const mediumLabel=document.createElement('label');mediumLabel.className='bo-method-field';mediumLabel.textContent='Formato';const medium=document.createElement('select');medium.setAttribute('aria-label','Formato');medium.innerHTML='<option value="digital">Digital</option><option value="physical">Física</option><option value="documentary">Documento</option><option value="human">Interação humana</option><option value="operational">Registro operacional</option>';medium.value=original.evidenceMedium||original.medium||'operational';mediumLabel.appendChild(medium);form.appendChild(mediumLabel);
      const hint=document.createElement('p');hint.className='bo-method-note';hint.textContent='Telas, mensagens, documentos e ambientes tornam o serviço perceptível. Entrevistas e observações ajudam a compreender o serviço e ficam identificadas como pesquisa.';form.appendChild(hint);
      methodologyActions(form,m,'Salvar evidência',status=>{
        const record=entityRecord(item.objectKind,item.objectId);if(boardId!==activeBoardId||!record){status.textContent='Este registro não está mais disponível.';return}
        if(purpose.value==='service'&&medium.value==='operational'){status.textContent='Escolha um formato percebido pelo cliente: físico, digital, documento ou interação humana.';return}
        markEdit('Classificar evidência do serviço');setEntityTitle(item.objectKind,item.objectId,title.value.trim());record.description=description.value.trim();record.evidencePurpose=purpose.value;record.evidenceMedium=medium.value;record.updatedAt=new Date().toISOString();m.root.remove();save();
      });title.focus();return;
    }
    const details=original.operationalDetails||{},previousRefs=Array.isArray(details.predecessors)?details.predecessors.filter(ref=>ref&&typeof ref==='object'&&typeof ref.kind==='string'&&typeof ref.id==='string'):[],linkDraft={};
    const links=methodologySection(form,'Pessoas e relações','As relações continuam ligadas aos registros do serviço.');
    for(const definition of SERVICE_OPERATION_DEFS){
      const fieldset=document.createElement('fieldset');fieldset.className='bo-method-links';const legend=document.createElement('legend');legend.textContent=definition.plural;fieldset.appendChild(legend);
      const selectedIds=new Set(operationalIds(original,definition.field));const records=Object.values(entityCollection(definition.kind)||{}).filter(record=>!record.serviceId||record.serviceId===graph.service.id);
      const checks=[];
      for(const record of records){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=selectedIds.has(record.id);input.value=record.id;const name=document.createElement('span');name.textContent=entityTitle(definition.kind,record);label.append(input,name);fieldset.appendChild(label);checks.push(input)}
      for(const id of selectedIds)if(!records.some(record=>record.id===id)){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.value=id;const name=document.createElement('span');name.textContent='Vínculo indisponível · '+id;label.append(input,name);fieldset.appendChild(label);checks.push(input)}
      let create=null;if(definition.kind!=='evidence')create=methodologyField(fieldset,(['dependency','policy'].includes(definition.kind)?'Nova ':'Novo ')+definition.label.toLowerCase(),'');
      else if(!records.length){const hint=document.createElement('p');hint.textContent='Adicione evidências pela faixa “O que o cliente percebe” no mapa.';fieldset.appendChild(hint)}
      linkDraft[definition.field]={checks,create,definition};links.appendChild(fieldset);
    }
    const timings=methodologySection(form,'Tempo e capacidade','Informe estimativas. Campos vazios permanecem sem informação; zero representa uma estimativa explícita.');
    const timingGrid=document.createElement('div');timingGrid.className='bo-method-grid';timings.appendChild(timingGrid);
    const numeric={};for(const [key,label] of [['durationMinutes','Tempo de execução (min)'],['waitMinutes','Tempo de espera (min)'],['targetMinutes','Prazo combinado (min)'],['capacityPerHour','Capacidade (atendimentos/h)'],['demandPerHour','Demanda prevista (atendimentos/h)']])numeric[key]=methodologyField(timingGrid,label,details[key]??'',{numeric:true,positive:key==='targetMinutes'});
    const recovery=methodologySection(form,'Falhas e recuperação');const failure=methodologyField(recovery,'O que pode dar errado?',details.failureMode||'',{multiline:true});const recoveryAction=methodologyField(recovery,'Como recuperar a entrega?',details.recoveryAction||'',{multiline:true});
    const delivery=methodologySection(form,'Promessa e comunicação');const promise=document.createElement('p');promise.className='bo-method-promise';promise.textContent=blueprintServicePromise(graph,board().serviceStrategy)||'Defina a promessa em Opções → Estratégia do serviço.';delivery.appendChild(promise);
    const linkedLabel=document.createElement('label');linkedLabel.className='bo-method-check';const linked=document.createElement('input');linked.type='checkbox';linked.checked=details.promiseLinked===true;const linkedText=document.createElement('span');linkedText.textContent='Esta atividade contribui para a promessa';linkedLabel.append(linked,linkedText);delivery.appendChild(linkedLabel);
    const contribution=methodologyField(delivery,'Como contribui para a promessa?',details.promiseContribution||'',{multiline:true});const message=methodologyField(delivery,'O que é comunicado ao cliente?',details.customerMessage||'',{multiline:true});
    const sequence=methodologySection(form,'Depende destas atividades','Escolha o que precisa acontecer antes desta atividade.');const predecessors=[];
    const candidates=Object.values(board().items).filter(candidate=>candidate.kind==='smart'&&candidate.id!==item.id&&['frontstage','backstage','process'].includes(candidate.objectKind));const seen=new Set();
    for(const candidate of candidates){const key=candidate.objectKind+':'+candidate.objectId;if(seen.has(key))continue;seen.add(key);const record=entityRecord(candidate.objectKind,candidate.objectId);if(!record)continue;const label=document.createElement('label');label.className='bo-method-check';const input=document.createElement('input');input.type='checkbox';input.dataset.kind=candidate.objectKind;input.value=candidate.objectId;input.checked=previousRefs.some(ref=>ref.kind===candidate.objectKind&&ref.id===candidate.objectId);const caption=document.createElement('span');caption.textContent=entityTitle(candidate.objectKind,record)+' · '+(graph.stages[serviceFrameStageForItem(candidate)]?.title||'Sem etapa');label.append(input,caption);sequence.appendChild(label);predecessors.push(input)}
    for(const ref of previousRefs)if(!seen.has(ref.kind+':'+ref.id)){const label=document.createElement('label');label.className='bo-method-check';const input=document.createElement('input');input.type='checkbox';input.checked=true;input.dataset.kind=ref.kind;input.value=ref.id;const caption=document.createElement('span');caption.textContent='Atividade indisponível · '+ref.id;label.append(input,caption);sequence.appendChild(label);predecessors.push(input)}
    methodologyActions(form,m,'Salvar atividade',status=>{
      const record=entityRecord(item.objectKind,item.objectId);if(boardId!==activeBoardId||!record){status.textContent='Esta atividade não está mais disponível.';return}
      const next={...record.operationalDetails,failureMode:failure.value.trim(),recoveryAction:recoveryAction.value.trim(),promiseLinked:linked.checked,promiseContribution:contribution.value.trim(),customerMessage:message.value.trim(),predecessors:predecessors.filter(input=>input.checked).map(input=>({kind:input.dataset.kind,id:input.value}))};
      for(const [key,input] of Object.entries(numeric))next[key]=input.value===''?undefined:input.valueAsNumber;
      if(validateActivityNumbers(next).length){status.textContent='Revise os tempos e a capacidade. Use números positivos ou zero; o prazo deve ser maior que zero.';return}
      markEdit('Atualizar detalhes da atividade');setEntityTitle(item.objectKind,item.objectId,title.value.trim());record.operationalDetails=next;
      for(const [field,draft] of Object.entries(linkDraft)){
        const selected=draft.checks.filter(input=>input.checked).map(input=>input.value),name=draft.create?.value.trim();
        if(name){let created=Object.values(entityCollection(draft.definition.kind)||{}).find(value=>(!value.serviceId||value.serviceId===graph.service.id)&&entityTitle(draft.definition.kind,value).trim().toLocaleLowerCase()===name.toLocaleLowerCase());if(!created){const id=createGraphEntityWithTitle(draft.definition.kind,name);created=entityRecord(draft.definition.kind,id);created.serviceId=graph.service.id;created.stageId=stageId}selected.push(created.id)}
        record[field]=[...new Set(selected)];
      }
      record.updatedAt=new Date().toISOString();m.root.remove();save();
    });title.focus();
  }
  function showBlueprintServiceStrategy(){
    if(mobileReadOnly())return;
    const activeBoardId=boardId,current=board().serviceStrategy||{},m=modalShell('Estratégia do serviço','Relacione a promessa à entrega. Os 7 Ps e os critérios de qualidade são complementos opcionais.');m.box.classList.add('bo-method-dialog');const form=document.createElement('form');form.className='bo-method-form';m.box.appendChild(form);
    const section=methodologySection(form,'Promessa do serviço');const sourceLabel=document.createElement('label');sourceLabel.className='bo-method-field';sourceLabel.textContent='Origem da promessa';const source=document.createElement('select');source.setAttribute('aria-label','Origem da promessa');source.innerHTML='<option value="service">Usar a promessa da proposta do serviço</option><option value="custom">Definir uma promessa para este Blueprint</option>';source.value=current.promiseSource||'service';sourceLabel.appendChild(source);section.appendChild(sourceLabel);
    const inherited=document.createElement('p');inherited.className='bo-method-promise';inherited.textContent=blueprintServicePromise(graph,{...current,promiseSource:'service'})||'A proposta do serviço ainda não tem uma promessa definida.';section.appendChild(inherited);
    const custom=methodologyField(section,'Promessa deste Blueprint',current.servicePromise||'',{multiline:true});const updateSource=()=>{custom.closest('label').hidden=source.value!=='custom';custom.required=source.value==='custom';inherited.hidden=source.value==='custom'};source.onchange=updateSource;updateSource();
    const marketing=document.createElement('details');marketing.className='bo-method-optional';marketing.innerHTML='<summary>Marketing de serviços · 7 Ps</summary>';form.appendChild(marketing);const dimensions={};for(const dimension of BLUEPRINT_MARKETING_DIMENSIONS)dimensions[dimension.key]=methodologyField(marketing,dimension.label,current[dimension.key]||'',{multiline:true,hint:dimension.hint});
    const quality=document.createElement('details');quality.className='bo-method-optional';quality.innerHTML='<summary>Qualidade percebida</summary>';form.appendChild(quality);const notice=document.createElement('p');notice.textContent='Defina critérios observáveis e, se houver, associe uma métrica. Estes registros não substituem uma pesquisa de expectativas e percepções.';quality.appendChild(notice);const criteria={};
    for(const dimension of BLUEPRINT_QUALITY_DIMENSIONS){const section=methodologySection(quality,dimension.label,dimension.hint),criterion=methodologyField(section,'Critério de '+dimension.label.toLowerCase(),current.qualityCriteria?.[dimension.key]?.criterion||'',{multiline:true});const label=document.createElement('label');label.className='bo-method-field';label.textContent='Métrica associada';const metric=document.createElement('select');metric.setAttribute('aria-label','Métrica de '+dimension.label.toLowerCase());metric.appendChild(new Option('Sem métrica associada',''));for(const record of Object.values(entityCollection('metric')||{}))metric.appendChild(new Option(entityTitle('metric',record),record.id));const previous=current.qualityCriteria?.[dimension.key]?.metricId;if(previous&&!entityRecord('metric',previous))metric.appendChild(new Option('Métrica indisponível · '+previous,previous));metric.value=previous||'';label.appendChild(metric);section.appendChild(label);criteria[dimension.key]={criterion,metric}}
    methodologyActions(form,m,'Salvar estratégia',status=>{if(boardId!==activeBoardId){status.textContent='Este Blueprint não está mais aberto.';return}const next={...board().serviceStrategy,version:1,promiseSource:source.value,servicePromise:custom.value.trim(),qualityCriteria:{...board().serviceStrategy?.qualityCriteria}};for(const [key,input] of Object.entries(dimensions))next[key]=input.value.trim();for(const [key,inputs] of Object.entries(criteria)){if(!inputs.criterion.value.trim()&&!inputs.metric.value)delete next.qualityCriteria[key];else next.qualityCriteria[key]={criterion:inputs.criterion.value.trim(),metricId:inputs.metric.value||undefined}}markEdit('Atualizar estratégia do serviço');board().serviceStrategy=next;m.root.remove();save();});source.focus();
  }
  function showBlueprintDeliveryReview(stageId=null){
    const report=buildBlueprintDeliveryReport(graph,boardId,stageId||undefined),m=modalShell('Revisão da entrega','Revise o conteúdo e suas relações. A ocupação das camadas não confirma a qualidade do serviço.');m.box.classList.add('bo-method-dialog','bo-method-review');
    const summary=document.createElement('div');summary.className='bo-method-review-summary';const title=document.createElement('strong');title.textContent=({incomplete:'Há inconsistências para resolver',attention:'Há informações para completar',ready_for_review:'Pronto para revisão humana'})[report.status];const counts=document.createElement('span');counts.textContent=`${report.coverage.complete}/${report.coverage.total} camadas com conteúdo · ${report.activities} atividades · ${report.issues.length} apontamentos`;summary.append(title,counts);m.box.appendChild(summary);
    const promise=document.createElement('p');promise.className='bo-method-promise';promise.textContent=report.promise||'Promessa do serviço ainda não definida.';m.box.appendChild(promise);
    if(!report.issues.length){const success=document.createElement('p');success.textContent='As verificações estruturais não encontraram pendências. Confirme o desenho com a equipe e com pessoas que usam o serviço.';m.box.appendChild(success)}
    const list=document.createElement('div');list.className='bo-method-issues';for(const issue of report.issues){const row=document.createElement('article');row.className='bo-method-issue '+issue.severity;row.dataset.issueCode=issue.code;const text=document.createElement('p');text.textContent=issue.message;row.appendChild(text);const item=board().items[issue.itemId];if(item?.kind==='smart'&&entityRecord(item.objectKind,item.objectId)&&['frontstage','backstage','process','evidence'].includes(item.objectKind)&&!mobileReadOnly()){const action=btn('Revisar atividade',()=>{m.root.remove();showBlueprintActivityDetails(item)});if(item.objectKind==='evidence')action.textContent='Revisar evidência';row.appendChild(action)}else if(issue.code==='promise-missing'&&!mobileReadOnly())row.appendChild(btn('Definir promessa',()=>{m.root.remove();showBlueprintServiceStrategy()}));list.appendChild(row)}m.box.appendChild(list);
    const optional=document.createElement('details');optional.className='bo-method-optional';optional.innerHTML='<summary>Marketing e qualidade · complementos</summary>';const info=document.createElement('p');info.textContent=`${report.marketing.complete}/${report.marketing.total} dimensões de marketing descritas. Esses complementos não bloqueiam o desenho do Blueprint.`;optional.appendChild(info);if(report.marketing.missing.length){const missing=document.createElement('p');missing.textContent='Ainda sem descrição: '+report.marketing.missing.join(', ')+'.';optional.appendChild(missing)}if(!mobileReadOnly())optional.appendChild(btn('Abrir estratégia do serviço',()=>{m.root.remove();showBlueprintServiceStrategy()}));m.box.appendChild(optional);
    const footer=document.createElement('footer');footer.className='bo-method-actions';footer.appendChild(btn('Voltar ao mapa',()=>m.root.remove(),'primary'));m.box.appendChild(footer);footer.querySelector('button').focus();
  }

  function showServiceOperations(stageId=null){
    const m=modalShell('Operação do Service Frame','Aprofunde Frontstage e Backstage sem criar novas linhas: papéis, canais, dependências, políticas e evidências ficam ligados aos objetos do serviço.');m.box.classList.add('bo1205-operations-modal');const stages=serviceFrameStages().filter(st=>!stageId||st.id===stageId),summary=document.createElement('div');summary.className='bo1205-operation-summary';stages.forEach(st=>{const r=serviceOperationStageSummary(st.id),card=document.createElement('article');card.innerHTML=`<div><small>${esc(st.title)}</small><strong>${r.percent}%</strong></div><p>${r.frontstage} frontstage · ${r.backstage} backstage</p><span>${r.roles} papel(is) · ${r.channels} canal(is) · ${r.dependencies} dependência(s) · ${r.policies} política(s) · ${r.visibleEvidence} evidência(s) visível(is)</span>`;summary.appendChild(card)});m.box.appendChild(summary);sectionTitle(m.box,'Biblioteca operacional');const actions=document.createElement('div');actions.className='bo1205-operation-actions';SERVICE_OPERATION_DEFS.forEach(def=>{const b=btn('＋ '+def.label,()=>createOperationalEntity(def.kind,stageId||stages[0]?.id,()=>{m.root.remove();showServiceOperations(stageId)}));b.title=def.hint;actions.appendChild(b)});m.box.appendChild(actions);const help=document.createElement('div');help.className='bo1205-operation-help';help.innerHTML='<b>Como usar</b><span>Selecione uma ação de Frontstage, Backstage, Processo ou Sistema/Recurso no frame e abra <strong>Contexto operacional</strong> no Inspector para relacionar estes objetos.</span>';m.box.appendChild(help);return m
  }
  function showOperationalLinks(it){
    if(!it||it.kind!=='smart')return;if(editorContextKind()==='blueprint'){showBlueprintActivityDetails(it);return}const rec=entityRecord(it.objectKind,it.objectId);if(!rec)return;const stageId=serviceFrameStageForItem(it),m=modalShell('Contexto operacional',entityTitle(it.objectKind,rec)+' · '+(graph.stages?.[stageId]?.title||'Sem etapa'));m.box.classList.add('bo1205-links-modal');const intro=document.createElement('div');intro.className='bo1205-links-intro';const layer=serviceFrameLayerForItem(it),visibility=serviceVisibilityForLayer(layer);intro.innerHTML=`<small>${esc(SERVICE_FRAME_LAYERS.find(x=>x.key===layer)?.label||layer)}</small><b>${visibility==='customer-visible'?'Visível ao cliente':'Operação interna'}</b><span>As relações abaixo pertencem ao objeto canônico do Service Graph e podem aparecer em outras visualizações.</span>`;m.box.appendChild(intro);SERVICE_OPERATION_DEFS.forEach(def=>{sectionTitle(m.box,def.plural);const list=document.createElement('div');list.className='bo1205-link-list';const current=new Set(operationalIds(rec,def.field)),rows=operationalEntities(def.kind,stageId);rows.forEach(entity=>{const lab=document.createElement('label');const medium=def.kind==='evidence'?` · ${({physical:'Física',digital:'Digital',human:'Humana',documentary:'Documental',operational:'Operacional'})[entity.evidenceMedium||entity.medium]||'Operacional'}`:'';lab.innerHTML=`<input type="checkbox" ${current.has(entity.id)?'checked':''}><span>${esc(entityTitle(def.kind,entity))}<small>${esc(medium)}</small></span>`;lab.querySelector('input').onchange=e=>{setOperationalLink(rec,def,entity.id,e.target.checked);save(false,{label:'Relacionar '+def.label})};list.appendChild(lab)});const add=btn('＋ Criar '+def.label,()=>createOperationalEntity(def.kind,stageId,(id)=>{setOperationalLink(rec,def,id,true);save(false,{label:'Criar e relacionar '+def.label});m.root.remove();showOperationalLinks(it)}),'bo1205-add-link');list.appendChild(add);m.box.appendChild(list)});return m
  }
  function serviceCompositionLayout(ids=null){
    if(!ids){ensureServiceCompositionInstances();board().serviceFrameVersion=2}const m=serviceFrameMetrics();if(!m.stages.length)return false;const all=Object.values(board().items||{}).filter(it=>!isContainer(it)&&!(it.kind==='smart'&&it.objectKind==='stage')),targetSet=ids?new Set(ids):null,targets=targetSet?all.filter(it=>targetSet.has(it.id)):all,counts={};
    if(targetSet)all.filter(it=>!targetSet.has(it.id)).forEach(it=>{const sid=serviceFrameStageForItem(it),c=m.stageIndex.get(sid),r=SERVICE_FRAME_LAYERS.findIndex(x=>x.key===serviceFrameLayerForItem(it));if(c==null||r<0)return;const k=c+':'+r;counts[k]=(counts[k]||0)+1});
    targets.forEach(it=>{const sid=serviceFrameStageForItem(it)||m.stages[0]?.id,c=m.stageIndex.get(sid);if(c==null)return;const layer=serviceFrameLayerForItem(it),r=Math.max(0,SERVICE_FRAME_LAYERS.findIndex(x=>x.key===layer)),k=c+':'+r,n=counts[k]||0;counts[k]=n+1;it.serviceStageId=sid;it.serviceLayer=layer;it.serviceVisibility=serviceVisibilityForLayer(layer);if(it.kind==='smart'){const rec=entityRecord(it.objectKind,it.objectId);if(rec){rec.serviceVisibility=it.serviceVisibility;rec.stageId ||= sid}}it.x=m.rootX+m.stageLeft+c*m.colW+26;it.y=m.rootY+m.rowTops[r]+54+n*m.cardStep;it.width=288;it.height=104;setParentFrame(it.id,null)});return true
  }
  function blueprintEvidenceLabel(item){if(editorContextKind()!=='blueprint'||item.kind!=='smart'||item.objectKind!=='evidence')return semanticLabel(item);const record=entityRecord('evidence',item.objectId);return record?.evidencePurpose==='research'?'Evidência de pesquisa':isCustomerServiceEvidence(record)?'Evidência do serviço':'Evidência · uso a definir'}
  function serviceLayerLabel(layer){
    if(blueprintLearningState().mode==='professional')return layer.label;
    return ({evidence:'O que o cliente percebe',customer:'O que o cliente faz',frontstage:'Interações visíveis',backstage:'Bastidores',process:'Processos de apoio',enablement:'Sistemas e ferramentas'})[layer.key]||layer.label;
  }
  function renderServiceCompositionStructure(canvas){
    if(board().serviceFrameVersion!==2){serviceCompositionLayout();board().serviceFrameVersion=2;save(false,{content:false,history:false,label:'Atualizar camadas do Blueprint'})}
    const m=serviceFrameMetrics(),root=document.createElement('div');root.className='bo1194-service-grid bo1203-service-frame';root.style.left=m.rootX+'px';root.style.top=m.rootY+'px';root.style.width=m.width+'px';root.style.height=m.totalHeight+'px';
    const corner=document.createElement('div');corner.className='bo1194-service-corner bo1203-service-corner';
    corner.innerHTML=`<small>BLUEPRINT</small><b>${esc(board()?.name||graph.service?.name||'Serviço')}</b><span>${esc(activeJourney()?.name||'Organize a operação por etapas')}</span><div class="bo-editor-structure-summary">${m.stages.length} etapa${m.stages.length===1?'':'s'} · ${SERVICE_FRAME_LAYERS.length} camadas</div>`;
    root.appendChild(corner);
    m.stages.forEach((st,i)=>{const cov=serviceFrameStageCoverage(st.id),missing=cov.missing.slice(0,2).map(x=>x.label).join(' · '),col=document.createElement('div');col.className='bo1194-stage-column bo1203-stage-column';col.style.left=(m.stageLeft+i*m.colW)+'px';col.style.width=m.colW+'px';const op=serviceOperationStageSummary(st.id);col.innerHTML=`<small>ETAPA ${String(i+1).padStart(2,'0')}</small><b>${esc(st.title)}</b><span>${esc(st.customerAction||'Ação do cliente ainda não definida')}</span><button type="button" class="bo1205-stage-operation ${op.percent===100?'complete':''}"><b>Detalhes da etapa</b><span>${op.roles} papel · ${op.channels} canal · ${op.dependencies} depend.</span></button>`;col.querySelector('.bo1205-stage-operation').onclick=e=>{e.stopPropagation();editorContextKind()==='blueprint'?showBlueprintDeliveryReview(st.id):showServiceOperations(st.id)};root.appendChild(col)});
    let nextCellMarked=false;
    SERVICE_FRAME_LAYERS.forEach((layer,r)=>{const y=m.rowTops[r],row=document.createElement('div');row.className='bo1194-service-lane bo1203-service-lane lane-'+layer.key;row.style.top=y+'px';row.style.height=m.rowHeights[r]+'px';row.innerHTML=`<div class="bo1194-lane-label bo1203-lane-label"><i style="background:${tone[layer.tone]||tone.slate}"></i><div><b>${esc(serviceLayerLabel(layer))}</b><span>${esc(layer.hint)}</span>${layer.visible?'<em>VISÍVEL AO CLIENTE</em>':'<em>INTERNO</em>'}</div></div>`;root.appendChild(row);m.stages.forEach((st,c)=>{const cell=document.createElement('div');cell.className='bo1194-service-cell bo1203-service-cell';cell.style.left=(m.stageLeft+c*m.colW)+'px';cell.style.top=y+'px';cell.style.width=m.colW+'px';cell.style.height=m.rowHeights[r]+'px';cell.dataset.stageId=st.id;cell.dataset.layer=layer.key;const occupied=(layer.key==='customer'&&String(st.customerAction||'').trim())||Object.values(board().items).some(item=>!isContainer(item)&&serviceFrameStageForItem(item)===st.id&&serviceFrameLayerForItem(item)===layer.key);if(!occupied){cell.classList.add('bo-simple-empty-cell');if(!nextCellMarked){cell.classList.add('bo-simple-next-cell');nextCellMarked=true}}cell.onclick=event=>{if(event.target===cell&&!mobileReadOnly()){event.stopPropagation();beginBlueprintCellEntry(cell,layer.key,st.id)}};if(layer.key==='customer'&&String(st.customerAction||'').trim()&&!Object.values(board().items).some(item=>item.objectKind==='customerAction'&&serviceFrameStageForItem(item)===st.id)){const action=document.createElement('button');action.type='button';action.className='bo1203-customer-action';action.innerHTML=`<small>AÇÃO DO CLIENTE</small><span>${esc(st.customerAction)}</span>`;action.onclick=e=>{e.stopPropagation();beginBlueprintCellEntry(cell,'customer',st.id,st.customerAction)};cell.appendChild(action)}const add=btn(layer.key==='customer'&&st.customerAction?'Editar ação':'＋ Adicionar',()=>beginBlueprintCellEntry(cell,layer.key,st.id),'bo1194-cell-add bo1203-cell-add');add.setAttribute('aria-label',(layer.key==='customer'&&st.customerAction?'Editar':'Adicionar')+' atividade · '+serviceLayerLabel(layer)+' · '+st.title);add.title='Escrever nesta etapa: '+serviceLayerLabel(layer);cell.appendChild(add);root.appendChild(cell)})});
    if(serviceCompositionState().showLines!==false){const boundaries=BLUEPRINT_BOUNDARIES;boundaries.forEach(def=>{const r=SERVICE_FRAME_LAYERS.findIndex(x=>x.key===def.after);if(r<0)return;const line=document.createElement('div');line.className='bo1203-service-line '+def.kind;line.style.top=(m.rowTops[r]+m.rowHeights[r]+m.rowGap/2-2)+'px';line.style.left=m.stageLeft+'px';line.style.width=(Math.max(1,m.stages.length)*m.colW)+'px';line.innerHTML=`<span>${def.label}<em>${def.detail}</em></span>`;root.appendChild(line)})}
    canvas.appendChild(root)
  }
  function assistantSessionDefault(intent=''){
    const now=new Date().toISOString();
    return {version:1,id:intent?uid('builder-session'):'',intent:intent||'',journeyId:'',createdAt:intent?now:null,updatedAt:intent?now:null,completed:{service:false,objective:false},entityIds:{persona:[],stage:[],touchpoint:[],emotion:[],frontstage:[],backstage:[],process:[],system:[],evidence:[],problem:[],metric:[],opportunity:[]},itemIds:[],visualAutoLayout:true}
  }
  function serviceBuilderAssistantState(){
    meta.serviceBuilderAssistant ||= {version:2,boards:{}};
    meta.serviceBuilderAssistant.boards ||= {};
    const key=boardId||'global',boards=meta.serviceBuilderAssistant.boards;
    boards[key] ||= {version:2,active:false,panelOpen:false,mode:'create',currentStep:'service',startedAt:null,completedAt:null,lastQuestion:'',lastAnswer:'',reviewed:{evidence:false,problems:false,improvements:false,metrics:false},serviceContext:{objective:'',startBoundary:'',endBoundary:''},session:assistantSessionDefault()};
    const st=boards[key];st.version=2;st.mode=['create','understand','review','improve'].includes(st.mode)?st.mode:'create';st.reviewed ||= {evidence:false,problems:false,improvements:false,metrics:false};st.serviceContext ||= {objective:'',startBoundary:'',endBoundary:''};st.session ||= assistantSessionDefault();st.session.completed ||= {service:false,objective:false};st.session.entityIds ||= assistantSessionDefault().entityIds;st.session.itemIds ||= [];if(st.session.intent!=='create_new'&&graph.service?.designContext&&!st.serviceContext.objective)st.serviceContext={...st.serviceContext,...graph.service.designContext};return st
  }
  function assistantSessionState(){return serviceBuilderAssistantState().session}
  function assistantSessionEntityIds(kind){const s=assistantSessionState();s.entityIds[kind] ||= [];return s.entityIds[kind]}
  function assistantRememberEntity(kind,id){if(!kind||!id)return;const ids=assistantSessionEntityIds(kind);if(!ids.includes(id))ids.push(id);assistantSessionState().updatedAt=new Date().toISOString()}
  function assistantRememberItem(itemId){if(!itemId)return;const s=assistantSessionState();if(!s.itemIds.includes(itemId))s.itemIds.push(itemId);const it=board()?.items?.[itemId];if(it){it.assistantSessionId=s.id;it.assistantManaged=true}}
  function assistantScopedStages(){return assistantSessionEntityIds('stage').map(id=>graph.stages?.[id]).filter(Boolean)}
  function assistantScopedJourney(){const id=assistantSessionState().journeyId;return id?graph.journeys?.[id]||null:null}
  function assistantEntityStageId(kind,id){if(kind==='stage')return id;const rec=entityRecord(kind,id);if(rec?.stageId&&graph.stages?.[rec.stageId])return rec.stageId;if(kind==='touchpoint'){const st=assistantScopedStages().find(x=>(x.touchpointIds||[]).includes(id));return st?.id||null}return null}
  function assistantFindSmartItem(kind,id){return Object.values(board()?.items||{}).find(it=>it.kind==='smart'&&it.objectKind===kind&&it.objectId===id)||null}
  function assistantEnsureSmartItem(kind,id){let it=assistantFindSmartItem(kind,id);if(it){assistantRememberItem(it.id);return it}const itemId=uid('smart');it={id:itemId,instanceId:itemId,instanceSchemaVersion:2,entityRef:{type:kind,id},entityStatus:entityRecord(kind,id)?'linked':'missing',presentation:{tone:null},kind:'smart',objectKind:kind,objectId:id,x:0,y:0,width:260,height:132,z:maxZ()+1,assistantSessionId:assistantSessionState().id,assistantManaged:true};board().items[itemId]=it;assistantRememberItem(itemId);return it}
  function assistantContextItem(role,title,description,point,size={width:300,height:150},toneName='blue'){
    const s=assistantSessionState();let it=Object.values(board()?.items||{}).find(x=>x.assistantSessionId===s.id&&x.assistantRole===role);
    if(!it){const id=uid('builder');it={id,instanceId:id,entityRef:null,kind:'free',shape:'card',visualKind:'card',semantic:'builderContext',tone:toneName,text:title,description:description||'',status:'',badge:'',x:point.x,y:point.y,width:size.width,height:size.height,z:maxZ()+1,assistantSessionId:s.id,assistantRole:role,assistantManaged:true};board().items[id]=it;assistantRememberItem(id)}
    it.text=title;it.description=description||'';it.x=point.x;it.y=point.y;it.width=size.width;it.height=size.height;return it
  }
  function assistantLaneLabel(role,label,y){const s=assistantSessionState();let it=Object.values(board()?.items||{}).find(x=>x.assistantSessionId===s.id&&x.assistantRole===`lane:${role}`);if(!it){const id=uid('builder-label');it={id,instanceId:id,entityRef:null,kind:'free',shape:'text',visualKind:'text',semantic:'builderLane',tone:'slate',text:label,textStyle:{variant:'label',align:'right',bold:true,italic:false},x:360,y,width:180,height:52,z:maxZ()+1,assistantSessionId:s.id,assistantRole:`lane:${role}`,assistantManaged:true,locked:true};board().items[id]=it;assistantRememberItem(id)}it.text=label;it.x=360;it.y=y;return it}
  function assistantTagSmartItem(itemId,kind,id,stageId=null){const it=board()?.items?.[itemId]||assistantFindSmartItem(kind,id);if(!it)return null;assistantRememberEntity(kind,id);assistantRememberItem(it.id);if(stageId)it.blueprintStageId=stageId;return it}
  const ASSISTANT_VISUAL_LANES={touchpoint:{label:'Ponto de contato',y:760},emotion:{label:'Emoção',y:920},frontstage:{label:'Ação visível',y:1120},backstage:{label:'Bastidores',y:1280},process:{label:'Processo',y:1440},system:{label:'Sistema',y:1600},evidence:{label:'Evidência',y:1800},problem:{label:'Problema',y:1960},metric:{label:'Métrica',y:2120},opportunity:{label:'Melhoria',y:2280}};
  function assistantArrangeVisualBoard(){
    const st=serviceBuilderAssistantState(),s=st.session;if(!board()||!s?.id||!s.visualAutoLayout)return;
    const stages=assistantScopedStages(),ctx=st.serviceContext||{},createMode=s.intent==='create_new';
    if((createMode?s.completed.service:meaningfulServiceBasics())&&graph.service?.name){assistantContextItem('service',graph.service.name,graph.service.description||'Serviço em construção',{x:280,y:160},{width:360,height:170},'blue')}
    if((createMode?s.completed.objective:!!String(ctx.objective||'').trim())&&ctx.objective){assistantContextItem('objective','Resultado esperado',ctx.objective,{x:680,y:160},{width:360,height:170},'emerald');assistantContextItem('start','Início',ctx.startBoundary,{x:1080,y:160},{width:280,height:150},'slate');assistantContextItem('end','Fim',ctx.endBoundary,{x:1400,y:160},{width:280,height:150},'slate')}
    const personas=assistantSessionEntityIds('persona').map(id=>entityRecord('persona',id)).filter(Boolean);personas.forEach((rec,i)=>{const it=assistantEnsureSmartItem('persona',rec.id);it.x=120;it.y=520+i*170;it.width=260;it.height=132});
    const stageX=new Map();stages.forEach((stage,i)=>{const x=600+i*340;stageX.set(stage.id,x);const it=assistantEnsureSmartItem('stage',stage.id);it.x=x;it.y=520;it.width=280;it.height=132;it.blueprintStageId=stage.id});
    if(stages.length){assistantLaneLabel('stage','ETAPAS',555);assistantLaneLabel('action','AÇÃO DO CLIENTE',675);Object.entries(ASSISTANT_VISUAL_LANES).forEach(([kind,row])=>assistantLaneLabel(kind,row.label.toUpperCase(),row.y+34))}
    stages.forEach(stage=>{const x=stageX.get(stage.id);const stageIt=assistantFindSmartItem('stage',stage.id);if(stageIt&&String(stage.customerAction||'').trim())stageIt.height=150;Object.entries(ASSISTANT_VISUAL_LANES).forEach(([kind,row])=>{const ids=assistantSessionEntityIds(kind).filter(id=>assistantEntityStageId(kind,id)===stage.id);ids.forEach((id,idx)=>{const it=assistantEnsureSmartItem(kind,id);it.x=x;it.y=row.y+idx*148;it.width=280;it.height=126;it.blueprintStageId=stage.id;if(['frontstage','backstage','process','system'].includes(kind))it.blueprintLane=kind})})});
    Object.values(board().edges||{}).filter(e=>e.assistantSessionId===s.id&&e.assistantRole==='stage-sequence').forEach(e=>delete board().edges[e.id]);
    for(let i=0;i<stages.length-1;i++){const a=assistantFindSmartItem('stage',stages[i].id),b=assistantFindSmartItem('stage',stages[i+1].id);if(!a||!b)continue;const id=uid('edge');board().edges[id]={id,fromId:a.id,toId:b.id,fromHandle:'right',toHandle:'left',label:stages[i].handoffOut||'',style:'solid',arrow:'end',route:'curve',waypoint:null,assistantSessionId:s.id,assistantRole:'stage-sequence'}}
    const firstStage=stages[0]&&assistantFindSmartItem('stage',stages[0].id),personaItem=personas[0]&&assistantFindSmartItem('persona',personas[0].id);const existingPersonaEdge=Object.values(board().edges||{}).find(e=>e.assistantSessionId===s.id&&e.assistantRole==='persona-flow');if(existingPersonaEdge)delete board().edges[existingPersonaEdge.id];if(firstStage&&personaItem){const id=uid('edge');board().edges[id]={id,fromId:personaItem.id,toId:firstStage.id,fromHandle:'right',toHandle:'left',label:'vive a jornada',style:'dashed',arrow:'end',route:'curve',waypoint:null,assistantSessionId:s.id,assistantRole:'persona-flow'}}
  }
  function assistantImportExistingScope(){
    const s=assistantSessionState(),j=activeJourney();if(!j)return;s.journeyId=j.id;if(board())board().journeyId=j.id;meta.journeyStudio ||= {};meta.journeyStudio.activeJourneyId=j.id;assistantSessionEntityIds('stage').splice(0,999,...(j.stageIds||[]).filter(id=>graph.stages?.[id]));const stageSet=new Set(assistantSessionEntityIds('stage'));for(const stg of assistantScopedStages()){for(const id of stg.touchpointIds||[])assistantRememberEntity('touchpoint',id);for(const id of stg.problemIds||[])assistantRememberEntity('problem',id);for(const id of stg.opportunityIds||[])assistantRememberEntity('opportunity',id);for(const id of stg.personaIds||[])assistantRememberEntity('persona',id)}for(const kind of ['emotion','frontstage','backstage','process','system','evidence','metric'])for(const rec of Object.values(entityCollection(kind)||{}))if(stageSet.has(rec.stageId))assistantRememberEntity(kind,rec.id);if(!assistantSessionEntityIds('persona').length){const pid=journeyPrimitiveState().activePersonaId;if(pid&&entityRecord('persona',pid))assistantRememberEntity('persona',pid)}}
  function assistantImportDefinitionContext(){
    const state=serviceBuilderAssistantState(),session=state.session,definition=graph.service?.project?.definition||{};
    for(const id of definition.personaIds||[])if(entityRecord('persona',id))assistantRememberEntity('persona',id);
    for(const id of definition.problemIds||[])if(entityRecord('problem',id)||graph.problems?.[id])assistantRememberEntity('problem',id);
    for(const id of definition.evidenceIds||[])if(entityRecord('evidence',id))assistantRememberEntity('evidence',id);
    const objective=String(definition.outcome||'').trim(),startBoundary=String(definition.startBoundary||'').trim(),endBoundary=String(definition.endBoundary||'').trim();
    state.serviceContext={objective,startBoundary,endBoundary};
    graph.service.designContext={objective,startBoundary,endBoundary,source:'service-definition',personaIds:[...(definition.personaIds||[])],problemIds:[...(definition.problemIds||[])],evidenceIds:[...(definition.evidenceIds||[])]};
    session.completed.service=meaningfulServiceBasics()||!!String(definition.promise||graph.service?.name||'').trim();
    session.completed.objective=!!objective&&!!startBoundary&&!!endBoundary;
  }
  function assistantBeginFromDefinition(){
    if(!board()||board().viewKind!=='free'){toast('Abra um Whiteboard livre para iniciar a composição contextual.');return false}
    const definition=graph.service?.project?.definition||{},hasContext=(definition.personaIds||[]).length&&(definition.problemIds||[]).length&&(definition.evidenceIds||[]).length;
    if(!hasContext){toast('Conecte Persona, Problema e Evidência na Service Definition antes de montar com contexto.');return false}
    const state=serviceBuilderAssistantState();state.session=assistantSessionDefault('map_existing');state.reviewed={evidence:false,problems:false,improvements:false,metrics:false};state.completedAt=null;state.active=true;state.panelOpen=true;state.startedAt=new Date().toISOString();state.mode='create';assistantImportDefinitionContext();assistantImportExistingScope();const scoped=assistantScopedJourney();state.currentStep=scoped&&assistantScopedStages().length?'experience':'stages';assistantArrangeVisualBoard();save(false,{label:'Iniciar Assistente com Service Definition'});renderAll();toast('Contexto da Service Definition carregado no Assistente.');return true
  }
  function assistantBeginSession(intent){
    const state=serviceBuilderAssistantState();state.session=assistantSessionDefault(intent);state.reviewed={evidence:false,problems:false,improvements:false,metrics:false};state.serviceContext={objective:'',startBoundary:'',endBoundary:''};state.completedAt=null;state.active=true;state.panelOpen=true;state.startedAt=new Date().toISOString();state.mode=intent==='improve_existing'?'improve':intent==='map_existing'?'review':'create';state.currentStep=intent==='create_new'?'service':'experience';if(intent!=='create_new'){if(graph.service?.designContext)state.serviceContext={...state.serviceContext,...graph.service.designContext};assistantImportExistingScope();state.session.completed.service=meaningfulServiceBasics();state.session.completed.objective=!!String(state.serviceContext.objective||'').trim()}assistantArrangeVisualBoard();save(false,{label:'Iniciar sessão do Assistente'});renderAll();return true
  }
  function showAssistantIntentChooser(){
    const m=modalShell('Como você quer trabalhar?','Escolha o tipo de sessão. O Assistente usa esta decisão para não misturar conteúdo antigo com uma construção nova.');m.box.classList.add('bo1192-intent-modal');const grid=document.createElement('div');grid.className='bo1192-intent-grid';const choices=[['create_new','Criar do zero','Comece uma construção isolada. Só o que for criado nesta sessão entra no progresso.'],['map_existing','Mapear o que já existe','Use o serviço e a Jornada atuais como ponto de partida, sem apagar nada.'],['improve_existing','Melhorar o serviço','Revise problemas, métricas e oportunidades do serviço atual.']];choices.forEach(([key,title,desc],idx)=>{const b=document.createElement('button');b.type='button';b.className=idx===0?'recommended':'';b.innerHTML=`<span>${idx===0?'✦':'○'}</span><div><b>${esc(title)}</b><small>${esc(desc)}</small></div><em>→</em>`;b.onclick=()=>{m.root.remove();assistantBeginSession(key)};grid.appendChild(b)});m.box.appendChild(grid);return m
  }
  function serviceBuilderEvidenceCount(){return assistantSessionEntityIds('evidence').filter(id=>entityRecord('evidence',id)).length}
  function serviceBuilderAssistantProgress(){
    const state=serviceBuilderAssistantState(),session=state.session,ctx=state.serviceContext||{},stages=assistantScopedStages(),createMode=session.intent==='create_new';
    const objectiveDone=createMode?!!session.completed.objective:(String(ctx.objective||'').trim().length>3&&String(ctx.startBoundary||'').trim().length>2&&String(ctx.endBoundary||'').trim().length>2);
    const serviceDone=createMode?!!session.completed.service:meaningfulServiceBasics();
    const personaCount=assistantSessionEntityIds('persona').filter(id=>entityRecord('persona',id)).length;
    const evidenceCount=serviceBuilderEvidenceCount();
    const problemCount=assistantSessionEntityIds('problem').filter(id=>entityRecord('problem',id)).length;
    const opportunityCount=assistantSessionEntityIds('opportunity').filter(id=>entityRecord('opportunity',id)).length;
    const metricCount=assistantSessionEntityIds('metric').filter(id=>entityRecord('metric',id)).length;
    const stagesDone=stages.length>=2;
    const experienceDone=stagesDone&&stages.every(stg=>String(stg.customerAction||'').trim()&&(stg.touchpointIds||[]).some(id=>assistantSessionEntityIds('touchpoint').includes(id))&&assistantSessionEntityIds('emotion').some(id=>entityRecord('emotion',id)?.stageId===stg.id));
    const operationDone=stagesDone&&stages.every(stg=>['frontstage','backstage','process','system'].every(kind=>assistantSessionEntityIds(kind).some(id=>entityRecord(kind,id)?.stageId===stg.id)));
    const steps=[
      {key:'service',label:'Definir o serviço',question:'O que exatamente este serviço entrega?',detail:'Dê nome e descreva o resultado que o cliente busca.',done:serviceDone,topic:'service'},
      {key:'objective',label:'Objetivo e limites',question:'Onde o serviço começa, onde termina e qual resultado deve produzir?',detail:'Delimite o serviço para não misturar jornadas diferentes.',done:objectiveDone,topic:'service'},
      {key:'customer',label:'Cliente / Persona',question:'Quem vive esta experiência e o que precisa resolver?',detail:'Comece por uma persona relevante; outras podem ser adicionadas depois.',done:personaCount>0,topic:'persona'},
      {key:'stages',label:'Etapas da experiência',question:'Quais são os grandes momentos do início ao fim?',detail:'Crie a Jornada vazia e adicione pelo menos dois momentos.',done:stagesDone,topic:'stage'},
      {key:'experience',label:'Experiência',question:'O que o cliente faz e onde interage em cada etapa?',detail:'Ações, touchpoints e emoção aparecem no Whiteboard enquanto você constrói.',done:experienceDone,topic:'journey'},
      {key:'operation',label:'Operação',question:'O que acontece na frente, nos bastidores, nos processos e sistemas?',detail:'Conecte a experiência à forma como o serviço é entregue.',done:operationDone,topic:'blueprint'},
      {key:'evidence',label:'Evidências',question:'O que prova que este desenho representa a realidade?',detail:'Adicione observações, dados, pesquisas ou documentos.',done:evidenceCount>0||state.reviewed.evidence,topic:'evidence'},
      {key:'problems',label:'Problemas',question:'Onde existem fricções para cliente, equipe ou resultado?',detail:'Transforme sinais e evidências em problemas claros.',done:problemCount>0||state.reviewed.problems,topic:'problem'},
      {key:'metrics',label:'Métricas',question:'Como você saberá se o serviço está funcionando bem?',detail:'Defina medidas e metas para os momentos importantes.',done:metricCount>0||state.reviewed.metrics,topic:'metric'},
      {key:'improvements',label:'Melhorias',question:'O que vale a pena mudar primeiro?',detail:'Transforme problemas em oportunidades de melhoria.',done:opportunityCount>0||state.reviewed.improvements,topic:'opportunity'},
      {key:'review',label:'Revisão final',question:'O serviço está compreensível, conectado e pronto para ser aprofundado?',detail:'Revise lacunas antes de considerar a primeira versão concluída.',done:!!state.completedAt,topic:'service'}
    ];
    const done=steps.filter(x=>x.done).length;return{steps,done,total:steps.length,percent:Math.round(done/steps.length*100),stages,evidenceCount,problemCount,metricCount,opportunityCount,next:steps.find(x=>!x.done)||null}
  }
  function assistantCurrentStep(){const state=serviceBuilderAssistantState(),p=serviceBuilderAssistantProgress();return p.steps.find(x=>x.key===state.currentStep)||p.next||p.steps[p.steps.length-1]}
  function assistantSetMode(mode){const state=serviceBuilderAssistantState();state.mode=['create','understand','review','improve'].includes(mode)?mode:'create';state.panelOpen=true;save(false,{content:false,label:'Modo do Assistente'});renderAll()}
  function startServiceBuilderAssistant(){
    if(!board()||board().viewKind!=='free'){toast('Abra um Whiteboard livre para iniciar o Assistente de Serviço.');return false}
    if(!discoveryContextReady()&&!Object.keys(graph.stages||{}).length){toast('Antes de montar o serviço, registre ao menos 1 Persona e 1 Problema/Hipótese no Dashboard.');openServiceContextHome();return false}
    const state=serviceBuilderAssistantState();meta.guidedCoachPinned=false;if(!state.session?.intent)return showAssistantIntentChooser();const p=serviceBuilderAssistantProgress();state.active=true;state.panelOpen=true;state.startedAt ||= new Date().toISOString();state.currentStep=state.currentStep||p.next?.key||'review';save(false,{content:false,label:'Retomar Assistente de Serviço'});renderAll();return true
  }
  function pauseServiceBuilderAssistant(){const state=serviceBuilderAssistantState();state.panelOpen=false;save(false,{content:false,label:'Pausar Assistente de Serviço'});renderAll()}
  function assistantMarkReviewed(key){const state=serviceBuilderAssistantState();if(key in state.reviewed)state.reviewed[key]=true;const p=serviceBuilderAssistantProgress(),next=p.steps.find(x=>!x.done);state.currentStep=next?.key||'review';save(false,{content:false,label:'Revisar etapa no Assistente'});renderAll()}
  function editServiceIntent(){
    const state=serviceBuilderAssistantState(),ctx=state.serviceContext,m=modalShell('Objetivo e limites do serviço','Delimite o serviço antes de aprofundar Jornada e Blueprint.');m.box.classList.add('rt1811-builder-modal','bo1190-intent-modal');appendContextGuidance(m,'service');
    const form=document.createElement('form');form.className='rt1811-builder-form';form.innerHTML=`<label><span>Resultado que o cliente precisa alcançar</span><textarea name="objective" rows="3" required placeholder="Ex.: receber as roupas limpas e prontas no prazo combinado">${esc(ctx.objective||'')}</textarea></label><label><span>Onde o serviço começa?</span><input name="startBoundary" required maxlength="220" value="${esc(ctx.startBoundary||'')}" placeholder="Ex.: cliente solicita a coleta"></label><label><span>Onde o serviço termina?</span><input name="endBoundary" required maxlength="220" value="${esc(ctx.endBoundary||'')}" placeholder="Ex.: cliente recebe e confirma a entrega"></label><footer><button type="button" data-cancel>Cancelar</button><button class="primary" type="submit">Salvar e continuar</button></footer>`;m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),objective=String(fd.get('objective')||'').trim(),startBoundary=String(fd.get('startBoundary')||'').trim(),endBoundary=String(fd.get('endBoundary')||'').trim();if(!objective||!startBoundary||!endBoundary)return;state.serviceContext={objective,startBoundary,endBoundary};graph.service.designContext={objective,startBoundary,endBoundary};graph.service.updatedAt=new Date().toISOString();state.session.completed.objective=true;state.currentStep='customer';assistantArrangeVisualBoard();save(false,{label:'Definir objetivo e limites'});m.root.remove();renderAll()};setTimeout(()=>form.querySelector('textarea')?.focus(),0)
  }
  function serviceBuilderReview(){
    const state=serviceBuilderAssistantState(),p=serviceBuilderAssistantProgress(),pending=p.steps.filter(x=>!x.done&&x.key!=='review'),m=modalShell('Revisar primeira versão do serviço','O Assistente verifica a estrutura criada; ele não inventa conteúdo para fechar lacunas.');m.box.classList.add('bo1190-review-modal');
    const hero=document.createElement('section');hero.className='bo1190-review-hero';hero.innerHTML=`<div><small>SERVICE BUILDER</small><b>${pending.length?'Ainda existem pontos para revisar':'Primeira versão pronta para concluir'}</b><span>${p.done}/${p.total} etapas do roteiro · ${p.percent}%</span></div><strong>${p.percent}%</strong>`;m.box.appendChild(hero);
    const list=document.createElement('div');list.className='bo1190-review-list';if(pending.length)pending.forEach(step=>{const row=document.createElement('button');row.type='button';row.innerHTML=`<span><b>${esc(step.label)}</b><small>${esc(step.detail)}</small></span><em>Revisar →</em>`;row.onclick=()=>{m.root.remove();state.currentStep=step.key;serviceBuilderAssistantAction(step.key)};list.appendChild(row)});else list.innerHTML='<p>Serviço, cliente, etapas, experiência, operação, evidências, problemas, métricas e melhorias foram revisados.</p>';m.box.appendChild(list);
    const foot=document.createElement('footer');if(!pending.length){const finish=btn('Concluir primeira versão',()=>{state.completedAt=new Date().toISOString();state.currentStep='review';assistantArrangeVisualBoard();save(false,{content:false,label:'Concluir primeira versão do serviço'});m.root.remove();renderAll();toast('Primeira versão do serviço concluída.');},'primary');foot.appendChild(finish)}foot.appendChild(btn('Voltar ao quadro',()=>m.root.remove()));m.box.appendChild(foot)
  }
  function assistantAnswer(question){
    const q=String(question||'').trim().toLowerCase(),step=assistantCurrentStep();if(!q)return'';
    const match=(words,key)=>words.some(w=>q.includes(w))?guidanceTopic(key):null;
    const guide=match(['touchpoint','ponto de contato','canal'],'touchpoint')||match(['persona','cliente'],'persona')||match(['etapa','stage'],'stage')||match(['frontstage','frente'],'frontstage')||match(['backstage','bastidor'],'backstage')||match(['processo'],'process')||match(['sistema','tecnologia'],'system')||match(['evidência','evidencia','prova','dado'],'evidence')||match(['problema','fricção','friccao'],'problem')||match(['métrica','metrica','indicador','meta'],'metric')||match(['oportunidade','melhoria'],'opportunity')||match(['blueprint'],'blueprint')||match(['jornada','journey'],'journey')||guidanceTopic(step?.topic||'service');
    if(q.includes('não sei')||q.includes('nao sei')||q.includes('por onde'))return`Comece pelo passo “${step?.label||'Definir o serviço'}”. ${step?.detail||guide.summary} Exemplo: ${guide.example}`;
    if(q.includes('diferença')||q.includes('diferenca'))return`${guide.summary} Regra prática: ${guide.steps[0]||guide.why}`;
    if(q.includes('terminei')||q.includes('pronto')||q.includes('acabei')){const p=serviceBuilderAssistantProgress(),pending=p.steps.filter(x=>!x.done);return pending.length?`Ainda faltam ${pending.length} parte(s): ${pending.slice(0,4).map(x=>x.label).join(', ')}. O próximo passo recomendado é “${p.next?.label}”.`:'A primeira versão está estruturada. Faça a Revisão final e depois aprofunde evidências, métricas e operação conforme necessário.'}
    return`${guide.summary} ${guide.why} Exemplo: ${guide.example}`
  }
  function assistantAsk(question){const state=serviceBuilderAssistantState(),answer=assistantAnswer(question);if(!answer)return;state.lastQuestion=String(question||'').trim();state.lastAnswer=answer;save(false,{content:false,label:'Perguntar ao Assistente'});renderAll()}
  function assistantEditServiceBasics(){
    const state=serviceBuilderAssistantState(),m=modalShell('Definir o serviço','Comece pela entrega e pelo resultado, não pela ferramenta.');m.box.classList.add('rt1811-builder-modal','bo1190-assistant-modal');appendContextGuidance(m,'service');const form=document.createElement('form');form.className='rt1811-builder-form';form.innerHTML=`<label><span>Nome do serviço</span><input name="name" required maxlength="160" value="${esc(graph.service?.name||'')}" placeholder="Ex.: Lavanderia com coleta e entrega"></label><label><span>O que este serviço entrega para o cliente?</span><textarea name="description" rows="4" required placeholder="Ex.: retira roupas, processa e devolve prontas no prazo combinado">${esc(graph.service?.description||'')}</textarea></label><footer><button type="button" data-cancel>Cancelar</button><button class="primary" type="submit">Salvar e continuar</button></footer>`;m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),name=String(fd.get('name')||'').trim(),description=String(fd.get('description')||'').trim();if(!name||!description)return;graph.service.name=name;graph.service.description=description;graph.service.updatedAt=new Date().toISOString();state.session.completed.service=true;state.currentStep='objective';assistantArrangeVisualBoard();save(false,{label:'Definir serviço pelo Assistente'});m.root.remove();renderAll()};setTimeout(()=>form.querySelector('input')?.focus(),0)
  }
  function assistantEditPersona(){
    const state=serviceBuilderAssistantState(),m=modalShell('Cliente / Persona','Descreva uma pessoa realista no contexto do serviço.');m.box.classList.add('rt1811-builder-modal','bo1190-assistant-modal');appendContextGuidance(m,'persona');const form=document.createElement('form');form.className='rt1811-builder-form';form.innerHTML='<label><span>Quem é essa pessoa?</span><input name="name" required autocomplete="off" maxlength="160" placeholder="Ex.: Profissional com pouco tempo"></label><label><span>O que ela precisa resolver?</span><textarea name="description" rows="4" placeholder="Contexto, necessidade e o que ela valoriza"></textarea></label><footer><button type="button" data-cancel>Cancelar</button><button class="primary" type="submit">Criar Persona</button></footer>';m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),name=String(fd.get('name')||'').trim(),description=String(fd.get('description')||'').trim();if(!name)return;ensureGraphEntityStore();const id=uid('persona'),now=new Date().toISOString();graph.entities.persona[id]={id,type:'persona',serviceId:graph.service.id,title:name,description,needs:[],jobs:[],createdAt:now,updatedAt:now};assistantRememberEntity('persona',id);journeyPrimitiveState().activePersonaId=id;const it=assistantEnsureSmartItem('persona',id);assistantRememberItem(it.id);showInspector=false;selected=[];state.currentStep='stages';assistantArrangeVisualBoard();save(false,{label:'Criar Persona pelo Assistente'});m.root.remove();renderAll()};setTimeout(()=>form.querySelector('input')?.focus(),0)
  }
  function assistantCreateJourney(){
    const state=serviceBuilderAssistantState(),m=modalShell('Criar a Jornada base','A Jornada organiza as etapas, mas você continua trabalhando no Whiteboard.');m.box.classList.add('rt1811-builder-modal','bo1190-assistant-modal');appendContextGuidance(m,'journey');const form=document.createElement('form');form.className='rt188-stage-form';form.innerHTML='<label>Nome da Jornada<input name="name" required autocomplete="off" maxlength="160" placeholder="Ex.: Coleta até devolução das roupas"></label><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Criar Jornada vazia</button></footer>';m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const name=String(form.elements.name.value||'').trim();if(!name)return;const created=createJourneyFromHome({name,status:'draft'});if(!created?.id)return;meta.journeyStudio ||= {};meta.journeyStudio.activeJourneyId=created.id;board().journeyId=created.id;state.session.journeyId=created.id;state.currentStep='stages';assistantArrangeVisualBoard();save(false,{label:'Criar Jornada pelo Assistente'});m.root.remove();renderAll();setTimeout(assistantAddStage,30)};form.querySelector('input')?.focus();return m
  }
  function assistantAddStage(){
    const state=serviceBuilderAssistantState(),j=assistantScopedJourney();if(!j)return assistantCreateJourney();const m=modalShell('Adicionar etapa da experiência','Crie um grande momento. Ele aparecerá imediatamente no Whiteboard.');m.box.classList.add('rt1811-builder-modal','bo1190-assistant-modal');appendContextGuidance(m,'stage');const form=document.createElement('form');form.className='rt188-stage-form';form.innerHTML='<label>Nome da etapa<input name="title" required autocomplete="off" maxlength="160" placeholder="Ex.: Agendar coleta"></label><label>O que o cliente tenta fazer aqui?<textarea name="action" rows="3" placeholder="Ex.: escolhe o melhor horário para a coleta"></textarea></label><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Criar etapa</button></footer>';m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const title=String(form.elements.title.value||'').trim();if(!title)return;const now=new Date().toISOString(),id=uid('stage'),action=String(form.elements.action.value||'').trim(),personaIds=[...assistantSessionEntityIds('persona')];graph.stages[id]={id,journeyId:j.id,title,customerAction:action,emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[],personaIds,createdAt:now,updatedAt:now};j.stageIds ||= [];j.stageIds.push(id);j.updatedAt=now;assistantRememberEntity('stage',id);const it=assistantEnsureSmartItem('stage',id);assistantRememberItem(it.id);showInspector=false;selected=[];state.currentStep='stages';assistantArrangeVisualBoard();save(false,{label:'Criar etapa pelo Assistente'});m.root.remove();renderAll();toast('Etapa criada no Whiteboard. Crie outra etapa ou avance para Experiência.')};form.querySelector('input')?.focus();return m
  }
  function serviceBuilderAssistantAction(stepKey){
    const p=serviceBuilderAssistantProgress(),state=serviceBuilderAssistantState(),stages=p.stages||[],first=stages[0];state.currentStep=stepKey;state.panelOpen=true;save(false,{content:false,label:'Passo do Assistente'});
    if(stepKey==='service')return assistantEditServiceBasics();
    if(stepKey==='objective')return editServiceIntent();
    if(stepKey==='customer')return assistantEditPersona();
    if(stepKey==='stages')return assistantAddStage();
    if(stepKey==='experience'){if(!assistantScopedJourney())return assistantCreateJourney();const gap=stages.find(st=>!String(st.customerAction||'').trim()||!assistantSessionEntityIds('touchpoint').some(id=>(st.touchpointIds||[]).includes(id))||!assistantSessionEntityIds('emotion').some(id=>entityRecord('emotion',id)?.stageId===st.id))||first;return gap?showStageFlowBuilder(gap.id,{fromAssistant:true,builderStep:'experience'}):assistantAddStage()}
    if(stepKey==='operation'){if(!assistantScopedJourney())return assistantCreateJourney();const gap=stages.find(st=>['frontstage','backstage','process','system'].some(k=>!assistantSessionEntityIds(k).some(id=>entityRecord(k,id)?.stageId===st.id)))||first;return gap?showStageFlowBuilder(gap.id,{fromAssistant:true,builderStep:'operation'}):assistantAddStage()}
    if(stepKey==='evidence'){if(!assistantScopedJourney())return assistantCreateJourney();const target=stages.find(st=>(st.touchpointIds||[]).length)||first;return addJourneyEntity('evidence',target?.id,null,{fromAssistant:true,builderStep:'evidence'})}
    if(stepKey==='problems'){if(!assistantScopedJourney())return assistantCreateJourney();const target=stages.find(st=>(st.touchpointIds||[]).length)||first;return addJourneyEntity('problem',target?.id,null,{fromAssistant:true,builderStep:'problems'})}
    if(stepKey==='metrics'){if(!assistantScopedJourney())return assistantCreateJourney();const target=stages.find(st=>(st.touchpointIds||[]).length)||first;return addJourneyEntity('metric',target?.id,null,{fromAssistant:true,builderStep:'metrics'})}
    if(stepKey==='improvements'){if(!assistantScopedJourney())return assistantCreateJourney();const target=stages.find(st=>(st.problemIds||[]).length)||first;return addJourneyEntity('opportunity',target?.id,null,{fromAssistant:true,builderStep:'improvements'})}
    if(stepKey==='review')return serviceBuilderReview()
  }
  function renderAssistantCreateMode(body){
    const state=serviceBuilderAssistantState(),p=serviceBuilderAssistantProgress(),current=assistantCurrentStep(),head=document.createElement('section');head.className='bo1190-assistant-progress';const sessionLabel=state.session?.intent==='create_new'?'SESSÃO · DO ZERO':state.session?.intent==='map_existing'?'SESSÃO · MAPEAR EXISTENTE':'SESSÃO · MELHORAR';head.innerHTML=`<div><small>${sessionLabel}</small><b>${p.percent}%</b><span>${p.done}/${p.total} etapas desta sessão</span></div><div><i style="width:${p.percent}%"></i></div>`;body.appendChild(head);
    const card=document.createElement('section');card.className='bo1190-assistant-step';card.innerHTML=`<small>PASSO ${String(Math.max(1,p.steps.findIndex(x=>x.key===current?.key)+1)).padStart(2,'0')} · ${esc(current?.label||'Revisão')}</small><h3>${esc(current?.question||'Revise a estrutura criada.')}</h3><p>${esc(current?.detail||'')}</p>`;const actions=document.createElement('div');actions.className='bo1190-assistant-step-actions';if(current&&!current.done)actions.appendChild(btn('Fazer agora',()=>serviceBuilderAssistantAction(current.key),'primary'));else if(current?.key!=='review')actions.appendChild(btn('Revisar este passo',()=>serviceBuilderAssistantAction(current.key),'primary'));if(current&&['evidence','problems','metrics','improvements'].includes(current.key)&&!current.done)actions.appendChild(btn('Fazer depois',()=>assistantMarkReviewed(current.key)));actions.appendChild(btn('Como fazer',()=>showGuidanceDrawer(current?.topic||'service')));card.appendChild(actions);body.appendChild(card);
    const route=document.createElement('div');route.className='bo1190-assistant-route';p.steps.forEach((step,i)=>{const b=document.createElement('button');b.type='button';b.className=(step.done?'done ':'')+(step.key===current?.key?'active':'');b.innerHTML=`<i>${step.done?'✓':i+1}</i><span><b>${esc(step.label)}</b><small>${esc(step.detail)}</small></span>`;b.onclick=()=>{state.currentStep=step.key;save(false,{content:false,label:'Navegar no Assistente'});renderAll()};route.appendChild(b)});body.appendChild(route)
  }
  function renderAssistantUnderstandMode(body){const current=assistantCurrentStep(),intro=document.createElement('section');intro.className='bo1190-assistant-insight';intro.innerHTML=`<small>ENTENDER</small><h3>Aprenda no contexto do que está construindo</h3><p>O Blue Ocean explica conceitos sem tirar você do Whiteboard.</p>`;body.appendChild(intro);const grid=document.createElement('div');grid.className='bo1190-understand-grid';[['service','Serviço'],['persona','Persona'],['stage','Etapa'],['touchpoint','Touchpoint'],['blueprint','Blueprint'],['evidence','Evidência'],['problem','Problema'],['metric','Métrica']].forEach(([key,label])=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<b>${label}</b><span>${esc(guidanceTopic(key).summary)}</span>`;b.onclick=()=>showGuidanceDrawer(key);grid.appendChild(b)});body.appendChild(grid);const hint=document.createElement('p');hint.className='bo1190-context-hint';hint.textContent=`Contexto atual: ${current?.label||'Serviço'}.`;body.appendChild(hint)}
  function renderAssistantReviewMode(body){const p=serviceBuilderAssistantProgress(),pending=p.steps.filter(x=>!x.done&&x.key!=='review'),sec=document.createElement('section');sec.className='bo1190-assistant-insight';sec.innerHTML=`<small>REVISAR</small><h3>${pending.length?`${pending.length} ponto(s) ainda pedem atenção`:'Estrutura pronta para revisão final'}</h3><p>O assistente procura lacunas estruturais, sem inventar conteúdo.</p>`;body.appendChild(sec);const list=document.createElement('div');list.className='bo1190-gap-list';(pending.length?pending:[{key:'review',label:'Revisão final',detail:'Conclua a primeira versão e escolha a próxima leitura.'}]).forEach(step=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<span><b>${esc(step.label)}</b><small>${esc(step.detail)}</small></span><em>→</em>`;b.onclick=()=>serviceBuilderAssistantAction(step.key);list.appendChild(b)});body.appendChild(list)}
  function renderAssistantImproveMode(body){const p=serviceBuilderAssistantProgress(),sec=document.createElement('section');sec.className='bo1190-assistant-insight';sec.innerHTML=`<small>MELHORAR</small><h3>Da fricção para a melhoria</h3><p>${p.problemCount} problema(s) · ${p.opportunityCount} oportunidade(s) · ${p.metricCount} métrica(s).</p>`;body.appendChild(sec);const actions=document.createElement('div');actions.className='bo1190-improve-actions';actions.appendChild(btn('Adicionar problema',()=>serviceBuilderAssistantAction('problems'),'primary'));actions.appendChild(btn('Criar oportunidade',()=>serviceBuilderAssistantAction('improvements')));actions.appendChild(btn('Definir métrica',()=>serviceBuilderAssistantAction('metrics')));body.appendChild(actions)}
  function renderServiceBuilderAssistant(wrap){
    if(board()?.viewKind==='free'&&!serviceBuilderAssistantState().active)return;
    if(!board()||board().viewKind!=='free'||(pref().layoutMode||'free')!=='free'||showLibrary||showLayers||showOutline||showBlueprintDocument)return;const state=serviceBuilderAssistantState();
    if(!state.active){if(!Object.keys(board().items||{}).length){const badge=document.createElement('button');badge.type='button';badge.className='bo1190-assistant-start';badge.innerHTML='<span>✦</span><div><b>Assistente de Serviço</b><small>Montar do zero, passo a passo</small></div><em>Começar →</em>';badge.onclick=startServiceBuilderAssistant;wrap.appendChild(badge)}return}
    if(!state.panelOpen){const handle=document.createElement('button');handle.type='button';handle.className='bo1190-assistant-handle';handle.innerHTML='<span>✦</span><b>Assistente</b>';handle.onclick=()=>{state.panelOpen=true;save(false,{content:false,label:'Abrir Assistente'});renderAll()};wrap.appendChild(handle);return}
    const panel=document.createElement('aside');panel.className='bo1190-assistant-panel';panel.setAttribute('aria-label','Assistente de Serviço');
    const header=document.createElement('header');header.innerHTML=`<div><span>✦</span><div><small>BLUE OCEAN</small><b>Assistente de Serviço</b></div></div><button type="button" aria-label="Pausar assistente">×</button>`;header.querySelector('button').onclick=pauseServiceBuilderAssistant;panel.appendChild(header);
    const tabs=document.createElement('nav');tabs.className='bo1190-assistant-tabs';[['create','Criar'],['understand','Entender'],['review','Revisar'],['improve','Melhorar']].forEach(([mode,label])=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.classList.toggle('active',state.mode===mode);b.onclick=()=>assistantSetMode(mode);tabs.appendChild(b)});panel.appendChild(tabs);
    const body=document.createElement('div');body.className='bo1190-assistant-body';if(state.mode==='understand')renderAssistantUnderstandMode(body);else if(state.mode==='review')renderAssistantReviewMode(body);else if(state.mode==='improve')renderAssistantImproveMode(body);else renderAssistantCreateMode(body);panel.appendChild(body);
    const ask=document.createElement('form');ask.className='bo1190-assistant-ask';ask.innerHTML=`<label><span>Perguntar ao assistente</span><textarea rows="2" name="question" placeholder="Ex.: qual a diferença entre etapa e touchpoint?">${esc(state.lastQuestion||'')}</textarea></label><button type="submit">Perguntar</button>${state.lastAnswer?`<div class="bo1190-assistant-answer"><small>RESPOSTA</small><p>${esc(state.lastAnswer)}</p></div>`:''}`;ask.onsubmit=e=>{e.preventDefault();assistantAsk(String(new FormData(ask).get('question')||''))};panel.appendChild(ask);wrap.appendChild(panel)
  }

  function showJourneyStudio(){
    ensureJourneyPrimitives();const state=journeyStudioState(),sum=journeyStudioSummary(),j=sum.journey;if(!j){toast('Nenhuma Jornada disponível.');return}
    const m=modalShell('Journey Studio 1.0','Estruture a experiência sem duplicar dados: etapas, persona, lanes e indicadores usam o mesmo Service Graph.');m.box.classList.add('rt170-journey-modal');
    const hero=document.createElement('div');hero.className='rt170-journey-hero';hero.innerHTML=`<div><small>JORNADA ATIVA</small><b>${esc(j.name||'Jornada')}</b><span>${sum.stages.length} etapas · ${sum.touchpoints} touchpoints · ${sum.problems} problemas · ${sum.metrics} métricas</span></div><div class="rt170-health"><strong>${sum.emotions}/${sum.stages.length}</strong><span>etapas com emoção</span></div>`;m.box.appendChild(hero);
    const general=document.createElement('div');general.className='rt170-general';m.box.appendChild(general);field(general,'Nome da Jornada',j.name||'',v=>{j.name=v||'Jornada sem nome';markEdit('Renomear Jornada');save(false)});field(general,'Responsável',j.owner||'',v=>{j.owner=v;save(false)});selectField(general,'Status',j.status||'active',[['draft','Rascunho'],['active','Ativa'],['review','Em revisão'],['archived','Arquivada']],v=>{j.status=v;save(false)});
    const personas=Object.values(entityCollection('persona')||{}).map(p=>[p.id,entityTitle('persona',p)]);selectField(general,'Persona ativa',journeyPrimitiveState().activePersonaId||'',personas,v=>{journeyPrimitiveState().activePersonaId=v;invalidateViewLayout('journey');save(false);applyLayout('journey',true)});
    const stageSec=document.createElement('section');stageSec.className='rt170-stage-section';stageSec.innerHTML='<div class="rt170-section-head"><div><b>Etapas</b><span>Ordenam Journey e Blueprint ao mesmo tempo.</span></div></div>';const addSt=btn('+ Nova etapa',()=>{m.root.remove();addJourneyStage();setTimeout(showJourneyStudio,40)},'primary');$('.rt170-section-head',stageSec).appendChild(addSt);const stageList=document.createElement('div');stageList.className='rt170-stage-list';stageSec.appendChild(stageList);orderedStages().forEach((st,i)=>{const stats=stageStats(st.id),row=document.createElement('article');row.className='rt170-stage-row';row.innerHTML=`<div class="rt170-stage-index">${String(i+1).padStart(2,'0')}</div><div class="rt170-stage-copy"><input value="${esc(st.title)}"><textarea placeholder="Ação do cliente">${esc(st.customerAction||'')}</textarea><small>${stats.items} objetos · ${stats.touchpoints} touchpoints · ${stats.problems} problemas · ${stats.metrics} métricas</small></div><div class="rt170-stage-actions"></div>`;const input=$('input',row),ta=$('textarea',row);input.onchange=()=>{setEntityTitle('stage',st.id,input.value);markEdit('Editar etapa');invalidateViewLayout('journey');invalidateViewLayout('blueprint');save(false)};ta.onchange=()=>{st.customerAction=ta.value;if(activeJourney())activeJourney().updatedAt=new Date().toISOString();markEdit('Editar ação do cliente');save(false)};const acts=$('.rt170-stage-actions',row);acts.append(btn('↑',()=>{m.root.remove();moveJourneyStage(st.id,-1);setTimeout(showJourneyStudio,40)},'icon'),btn('↓',()=>{m.root.remove();moveJourneyStage(st.id,1);setTimeout(showJourneyStudio,40)},'icon'),btn('+',()=>showJourneyAddMenu(st.id,m),'icon'),btn('•••',async()=>{m.root.remove();await archiveJourneyStage(st.id);setTimeout(showJourneyStudio,40)},'icon'));stageList.appendChild(row)});m.box.appendChild(stageSec);
    const lanes=document.createElement('section');lanes.className='rt170-lanes';lanes.innerHTML='<div class="rt170-section-head"><div><b>Lanes da Jornada</b><span>Escolha o que esta leitura precisa mostrar.</span></div></div>';const grid=document.createElement('div');grid.className='rt170-lane-grid';const hidden=new Set(viewVisibility('journey').hiddenLanes||[]);journeyLanes.forEach(ln=>{const lab=document.createElement('label');lab.innerHTML=`<input type="checkbox" ${hidden.has(ln.key)?'':'checked'}><i style="background:${tone[ln.tone]}"></i><span><b>${esc(ln.label)}</b><small>${esc(ln.hint)}</small></span>`;lab.querySelector('input').onchange=e=>{const h=new Set(viewVisibility('journey').hiddenLanes||[]);e.target.checked?h.delete(ln.key):h.add(ln.key);viewVisibility('journey').hiddenLanes=[...h];invalidateViewLayout('journey');save(false);applyLayout('journey',true)};grid.appendChild(lab)});lanes.appendChild(grid);m.box.appendChild(lanes);
    const quick=document.createElement('section');quick.className='rt170-quick';quick.innerHTML='<div class="rt170-section-head"><div><b>Adicionar à Jornada</b><span>Cria entidades canônicas e posiciona na etapa escolhida.</span></div></div>';const qrow=document.createElement('div');qrow.className='rt170-quick-grid';[['Necessidade','need'],['Expectativa','expectation'],['Touchpoint','touchpoint'],['Evidência','evidence'],['Problema','problem'],['Oportunidade','opportunity'],['Métrica','metric']].forEach(([l,k])=>qrow.appendChild(btn(l,()=>{m.root.remove();const sid=orderedStages()[0]?.id;addJourneyEntity(k,sid)},k==='metric'?'primary':'')));quick.appendChild(qrow);m.box.appendChild(quick);
    const foot=document.createElement('div');foot.className='rt170-footer';foot.append(btn('Filtros e visibilidade',()=>{m.root.remove();showViewFilters()}),btn('Service Graph',()=>{m.root.remove();showGraphBrowser()}),btn('Abrir Jornada',()=>{m.root.remove();pref().layoutMode='journey';invalidateViewLayout('journey');save(false);applyLayout('journey',true)},'primary'));m.box.appendChild(foot)
  }
  function showJourneyAddMenu(stageId,parentModal){const st=graph.stages?.[stageId];if(!st)return;const m=modalShell(`Adicionar em ${st.title}`,'Escolha o tipo de informação que pertence a esta etapa.');m.box.classList.add('rt170-add-modal');const g=document.createElement('div');g.className='rt170-add-grid';[['Necessidade','need'],['Expectativa','expectation'],['Ponto de contato','touchpoint'],['Emoção','emotion'],['Evidência','evidence'],['Problema','problem'],['Oportunidade','opportunity'],['Métrica','metric']].forEach(([l,k])=>{const b=btn(l,()=>{m.root.remove();parentModal?.root?.remove();addJourneyEntity(k,stageId)},k==='metric'?'primary':'');g.appendChild(b)});m.box.appendChild(g)}


  function journeyEvidenceSummary(){const all=Object.values(entityCollection('evidence')||{}),counts={hypothesis:0,partial:0,evidenced:0};all.forEach(e=>counts[e.confidence||'hypothesis']=(counts[e.confidence||'hypothesis']||0)+1);return{total:all.length,...counts}}
  function createPersonaFromMapping(){const m=modalShell('Nova persona','Crie uma persona reutilizável para todas as jornadas do serviço.');const form=document.createElement('form');form.className='rt1814-persona-form';form.innerHTML='<label><span>Nome</span><input name="name" required placeholder="Ex.: Dono de pequena empresa"></label><label><span>Contexto</span><textarea name="description" rows="3" placeholder="Objetivos, contexto e necessidades principais"></textarea></label><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Criar persona</button></footer>';m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),name=String(fd.get('name')||'').trim();if(!name)return;const id=createGraphEntityWithTitle('persona',name,String(fd.get('description')||'').trim());journeyPrimitiveState().activePersonaId=id;save(false,{label:'Criar persona'});m.root.remove();if((pref().layoutMode||'free')==='journey'){invalidateViewLayout('journey');applyLayout('journey',true)}toast('Persona criada e ativada.')};setTimeout(()=>form.querySelector('input')?.focus(),0)}
  function createSubJourneyForStage(stageId){const parent=activeJourney(),st=graph.stages?.[stageId];if(!parent||!st)return;const now=new Date().toISOString(),jid=uid('journey');graph.journeys[jid]={id:jid,serviceId:graph.service.id,name:`${parent.name} · ${st.title}`,stageIds:[],parentJourneyId:parent.id,sourceStageId:st.id,status:'draft',createdAt:now,updatedAt:now,lastOpenedAt:null};graph.service.journeyIds.push(jid);['Início','Interação principal','Resultado'].forEach((title,i)=>{const sid=uid('stage');graph.stages[sid]={id:sid,journeyId:jid,title,customerAction:i===0?`Entra em ${st.title}`:'',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[],createdAt:now,updatedAt:now};graph.journeys[jid].stageIds.push(sid)});save(false,{label:'Criar sub-jornada'});toast(`Sub-jornada criada para ${st.title}.`);return jid}
  function showJourneyHierarchy(){const j=activeJourney(),m=modalShell('Hierarquia de jornadas','Quebre jornadas grandes em níveis sem duplicar o Service Graph.');m.box.classList.add('rt1814-hierarchy-modal');const parent=j?.parentJourneyId?graph.journeys[j.parentJourneyId]:null,children=Object.values(graph.journeys||{}).filter(x=>x.parentJourneyId===j?.id);const hero=document.createElement('div');hero.className='rt1814-hierarchy-hero';hero.innerHTML=`<small>JORNADA ATUAL</small><b>${esc(j?.name||'Jornada')}</b><span>${parent?'Nível abaixo de '+esc(parent.name):'Jornada de alto nível'} · ${children.length} sub-jornada(s)</span>`;m.box.appendChild(hero);if(parent){const p=document.createElement('button');p.className='rt1814-hierarchy-parent';p.innerHTML=`<span>↑ Jornada pai</span><b>${esc(parent.name)}</b>`;p.onclick=()=>{m.root.remove();openJourneyFromHome(parent.id)};m.box.appendChild(p)}const list=document.createElement('div');list.className='rt1814-hierarchy-list';orderedStages().forEach(st=>{const child=children.find(x=>x.sourceStageId===st.id),row=document.createElement('article');row.innerHTML=`<div><small>ETAPA</small><b>${esc(st.title)}</b><span>${child?'Sub-jornada conectada':'Pode ser detalhada em uma sub-jornada'}</span></div><div class="rt1814-hierarchy-actions"></div>`;const a=row.querySelector('.rt1814-hierarchy-actions');if(child)a.append(btn('Abrir',()=>{m.root.remove();openJourneyFromHome(child.id)},'primary'));else a.append(btn('Criar sub-jornada',()=>{createSubJourneyForStage(st.id);m.root.remove();showJourneyHierarchy()}));list.appendChild(row)});m.box.appendChild(list)}
  function editFutureStageActions(){const m=modalShell('Current × Future','Descreva como a ação do cliente deve funcionar no cenário Futuro.');m.box.classList.add('rt1814-future-modal');const list=document.createElement('div');list.className='rt1814-future-list';orderedStages().forEach(st=>{const row=document.createElement('label');row.innerHTML=`<span><b>${esc(st.title)}</b><small>Atual: ${esc(st.customerAction||'—')}</small></span><textarea rows="2" placeholder="Ação desejada no Futuro">${esc(st.futureCustomerAction||'')}</textarea>`;row.querySelector('textarea').onchange=e=>{st.futureCustomerAction=e.target.value;st.updatedAt=new Date().toISOString();save(false,{label:'Editar cenário futuro'})};list.appendChild(row)});m.box.appendChild(list);const foot=document.createElement('div');foot.className='rt1814-mapping-footer';foot.append(btn('Concluir',()=>{m.root.remove();invalidateViewLayout('journey');if((pref().layoutMode||'free')==='journey')applyLayout('journey',true)},'primary'));m.box.appendChild(foot)}
  function showJourneyMappingExperience(){ensureJourneyPrimitives();const state=journeyPrimitiveState(),m=modalShell('Mapa da jornada','Matriz estruturada para mapear a experiência sem transformar o trabalho em um whiteboard solto.');m.box.classList.add('rt1814-mapping-modal');const hero=document.createElement('div');hero.className='rt1814-mapping-hero';hero.innerHTML=`<div><small>JOURNEY MAPPING EXPERIENCE</small><b>${esc(activeJourney()?.name||'Jornada')}</b><span>${orderedStages().length} etapas · ${esc(personaTitle(state.activePersonaId))}</span></div><div class="rt1814-mapping-kpis"><span><b>${journeyEvidenceSummary().evidenced}</b> evidenciadas</span><span><b>${structuredState().savedViews.length}</b> visões salvas</span></div>`;m.box.appendChild(hero);
    const presets=document.createElement('section');presets.className='rt1814-mapping-section';presets.innerHTML='<header><div><b>1. Estrutura da matriz</b><span>Escolha a quantidade de informação que precisa enxergar.</span></div></header>';const pg=document.createElement('div');pg.className='rt1814-preset-grid';Object.entries(JOURNEY_LANE_PRESETS).forEach(([key,p])=>{const b=btn(p.label,()=>{m.root.remove();applyJourneyLanePreset(key);setTimeout(showJourneyMappingExperience,40)},state.lanePreset===key?'active':'');pg.appendChild(b)});presets.appendChild(pg);const lanes=document.createElement('div');lanes.className='rt1814-lane-grid';const hidden=new Set(viewVisibility('journey').hiddenLanes||[]);journeyLanes.forEach(ln=>{const lab=document.createElement('label');lab.innerHTML=`<input type="checkbox" ${hidden.has(ln.key)?'':'checked'}><i style="background:${tone[ln.tone]}"></i><span>${esc(ln.label)}</span>`;lab.querySelector('input').onchange=e=>{const h=new Set(viewVisibility('journey').hiddenLanes||[]);e.target.checked?h.delete(ln.key):h.add(ln.key);viewVisibility('journey').hiddenLanes=[...h];state.lanePreset='custom';invalidateViewLayout('journey');save(false);if((pref().layoutMode||'free')==='journey')applyLayout('journey',true)};lanes.appendChild(lab)});presets.appendChild(lanes);m.box.appendChild(presets);
    const persona=document.createElement('section');persona.className='rt1814-mapping-section';persona.innerHTML='<header><div><b>2. Persona e emoção</b><span>Use a mesma persona em várias jornadas e filtre a experiência.</span></div></header>';const prow=document.createElement('div');prow.className='rt1814-persona-row';const sel=document.createElement('select');Object.values(entityCollection('persona')||{}).forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=entityTitle('persona',p);o.selected=p.id===state.activePersonaId;sel.appendChild(o)});sel.onchange=()=>{state.activePersonaId=sel.value;invalidateViewLayout('journey');save(false);if((pref().layoutMode||'free')==='journey')applyLayout('journey',true)};prow.append(sel,btn('+ Persona',createPersonaFromMapping));persona.appendChild(prow);const curve=document.createElement('label');curve.className='rt1814-toggle-row';curve.innerHTML=`<span><b>Emotion Curve</b><small>Mostra a variação emocional ao longo das etapas.</small></span><input type="checkbox" ${state.showEmotionCurve!==false?'checked':''}>`;curve.querySelector('input').onchange=e=>{state.showEmotionCurve=e.target.checked;save();renderAll()};persona.appendChild(curve);m.box.appendChild(persona);
    const scenario=document.createElement('section');scenario.className='rt1814-mapping-section';scenario.innerHTML='<header><div><b>3. Current × Future</b><span>Compare a experiência atual com a experiência desejada no mesmo mapa.</span></div></header>';const switcher=document.createElement('div');switcher.className='rt1814-state-switch';[['current','Atual'],['future','Futuro'],['compare','Comparar']].forEach(([v,l])=>switcher.appendChild(btn(l,()=>{state.stateMode=v;invalidateViewLayout('journey');save(false);if((pref().layoutMode||'free')==='journey')applyLayout('journey',true);m.root.remove();setTimeout(showJourneyMappingExperience,30)},state.stateMode===v?'active':'')));scenario.appendChild(switcher);const sa=document.createElement('div');sa.className='rt1814-inline-actions';sa.append(btn('Preparar cenário Futuro',()=>{seedFutureScenario();m.root.remove();setTimeout(showJourneyMappingExperience,30)}),btn('Editar ações futuras',editFutureStageActions));scenario.appendChild(sa);m.box.appendChild(scenario);
    const evidence=document.createElement('section');evidence.className='rt1814-mapping-section';const es=journeyEvidenceSummary();evidence.innerHTML=`<header><div><b>4. Evidência e confiança</b><span>Separe hipótese de evidência observada para evitar decisões baseadas apenas em opinião.</span></div></header><div class="rt1814-evidence-summary"><span><i>○</i><b>${es.hypothesis}</b> hipóteses</span><span><i>◐</i><b>${es.partial}</b> parciais</span><span><i>●</i><b>${es.evidenced}</b> evidenciadas</span></div><small>Selecione um card de Evidência e ajuste Confiança, Fonte e Amostra no Inspector.</small>`;m.box.appendChild(evidence);
    const structure=document.createElement('section');structure.className='rt1814-mapping-section';structure.innerHTML='<header><div><b>5. Escala e reutilização</b><span>Evite jornadas gigantes: use hierarquia e salve leituras específicas.</span></div></header>';const actions=document.createElement('div');actions.className='rt1814-structure-actions';actions.append(btn('Hierarquia de jornadas',()=>{m.root.remove();showJourneyHierarchy()}),btn('Visualizações salvas',()=>{m.root.remove();showSavedViews()}),btn('Templates com exemplos',()=>{m.root.remove();showTemplates()}));structure.appendChild(actions);m.box.appendChild(structure);
    const foot=document.createElement('div');foot.className='rt1814-mapping-footer';foot.append(btn('Abrir matriz da Jornada',()=>{m.root.remove();applyLayout('journey',true)},'primary'));m.box.appendChild(foot)
  }


  function blueprintStudioState(){
    meta.blueprintStudio ||= {};
    const j=activeJourney();
    if(j)meta.blueprintStudio.activeJourneyId=j.id;
    meta.blueprintStudio.version=1;
    if(meta.blueprintStudio.showServiceLines===undefined)meta.blueprintStudio.showServiceLines=true;
    if(!meta.blueprintStudio.status)meta.blueprintStudio.status='active';
    return meta.blueprintStudio;
  }
  function blueprintStageStats(stageId){
    const items=Object.values(board()?.items||{}).filter(it=>!isContainer(it)&&stageForItem(it)===stageId),count=k=>items.filter(it=>laneForItem(it)===k).length;
    const st=graph.stages?.[stageId];
    return {items:items.length,evidence:count('evidence'),customer:st?.customerAction?1:0,frontstage:count('frontstage'),backstage:count('backstage'),process:count('process'),system:count('system')};
  }
  function blueprintCoverage(stageId){
    const s=blueprintStageStats(stageId),required=['customer','frontstage','backstage','process','system'],done=required.filter(k=>Number(s[k]||0)>0).length;
    return Math.round(done/required.length*100);
  }
  function assignBlueprintEntityStage(kind,id,stageId,lane=null){
    const rec=entityRecord(kind,id);if(!rec||!stageId||!graph.stages?.[stageId])return;
    rec.stageId=stageId;rec.blueprintLane=lane||({evidence:'evidence',customerAction:'customer',frontstage:'frontstage',backstage:'backstage',process:'process',system:'system'})[kind]||laneForItem({kind:'smart',objectKind:kind,objectId:id});rec.updatedAt=new Date().toISOString();
  }
  function addBlueprintEntity(kind,stageId,sourceItemId=null,options={}){
    const label=smartLabel(kind),st=graph.stages?.[stageId],m=modalShell('Adicionar '+label,`${st?.title||'Etapa'} · o contexto de etapa e camada já será aplicado.`);m.box.classList.add('rt1811-builder-modal');if(options.fromBuilder)appendBuilderStepper(m,options.builderStep||'operation');const form=document.createElement('form');form.className='rt1811-builder-form';const suggestion=kind==='process'?'Novo processo':kind==='system'?'Novo sistema':'';form.innerHTML=`<label><span>${esc(label)}</span><input name="title" required maxlength="240" value="${esc(suggestion)}" placeholder="Descreva o objeto"></label><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Adicionar</button></footer>`;m.box.appendChild(form);form.querySelector('[data-cancel]').onclick=()=>m.root.remove();form.onsubmit=e=>{e.preventDefault();const title=String(new FormData(form).get('title')||'').trim();if(!title)return;const id=createGraphEntityWithTitle(kind,title,''),itemId=addSmart(kind,id);assignBlueprintEntityStage(kind,id,stageId);if(options.fromAssistant){assistantTagSmartItem(itemId,kind,id,stageId);assistantArrangeVisualBoard()}const it=itemId?board().items[itemId]:Object.values(board().items).find(x=>x.kind==='smart'&&x.objectKind===kind&&x.objectId===id);if(it){it.blueprintStageId=stageId;it.blueprintLane=({evidence:'evidence',customerAction:'customer',frontstage:'frontstage',backstage:'backstage',process:'process',system:'system'})[kind]||laneForItem(it)}if(sourceItemId&&itemId&&board().items[sourceItemId]){const edgeId=uid('edge');board().edges[edgeId]={id:edgeId,fromId:sourceItemId,toId:itemId,fromHandle:'auto',toHandle:'auto',label:'relaciona',style:'solid',arrow:'end',route:'curve',waypoint:null}}invalidateViewLayout('blueprint');invalidateViewLayout('journey');save(false);const mode=pref().layoutMode||'blueprint';if(mode==='blueprint'||mode==='journey')applyLayout(mode,true);else renderAll();m.root.remove();if(options.fromAssistant){showInspector=false;selected=[];const ast=serviceBuilderAssistantState();ast.panelOpen=true;ast.currentStep=options.builderStep||'operation';save(false,{content:false,label:'Atualizar Assistente'});setTimeout(()=>{renderAll();showStageFlowBuilder(stageId,options)},45)}else if(options.fromBuilder&&options.builderStep)setTimeout(()=>resumeGuidedStageFlow(options.builderStep,stageId),55)};form.querySelector('input')?.select();return m
  }
  function moveBlueprintStage(stageId,dir){
    const j=activeJourney();if(!j)return;const a=j.stageIds||[],i=a.indexOf(stageId),n=i+dir;if(i<0||n<0||n>=a.length)return;[a[i],a[n]]=[a[n],a[i]];
    markEdit('Reordenar etapas do Blueprint');invalidateViewLayout('journey');invalidateViewLayout('blueprint');save(false);applyLayout('blueprint',true)
  }
  function showBlueprintAddMenu(stageId,parentModal){
    const st=graph.stages?.[stageId];if(!st)return;const m=modalShell(`Adicionar em ${st.title}`,'Adicione a camada operacional desta etapa usando entidades canônicas do Service Graph.');m.box.classList.add('rt180-add-modal');
    const g=document.createElement('div');g.className='rt180-add-grid';
    [['evidence'],['frontstage'],['backstage'],['process'],['system']].forEach(([k])=>{const lp=blueprintLanePresentation(k);g.appendChild(btn(lp.label,()=>{m.root.remove();parentModal?.root?.remove();addBlueprintEntity(k,stageId)},k==='process'?'primary':''))});
    const edit=btn('Editar ação do cliente',()=>{m.root.remove();parentModal?.root?.remove();editStageCustomerAction(stageId)},'');g.appendChild(edit);m.box.appendChild(g)
  }
  function blueprintStudioSummary(){
    const j=activeJourney(),stages=orderedStages(),all=Object.values(board()?.items||{}).filter(it=>!isContainer(it));const count=k=>all.filter(it=>laneForItem(it)===k).length;
    const scores=stages.map(st=>blueprintCoverage(st.id));return{journey:j,stages,evidence:count('evidence'),frontstage:count('frontstage'),backstage:count('backstage'),process:count('process'),system:count('system'),coverage:scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0}
  }
  function blueprintHealthState(){
    meta.blueprintHealthVersion=1;meta.blueprintHealth ||= {version:1,showMarkers:true,includeEvidence:true,includeOwnership:true,includeProcessIO:true};
    if(meta.blueprintHealth.showMarkers===undefined)meta.blueprintHealth.showMarkers=true;if(meta.blueprintHealth.includeEvidence===undefined)meta.blueprintHealth.includeEvidence=true;if(meta.blueprintHealth.includeOwnership===undefined)meta.blueprintHealth.includeOwnership=true;if(meta.blueprintHealth.includeProcessIO===undefined)meta.blueprintHealth.includeProcessIO=true;return meta.blueprintHealth
  }
  function blueprintHealthStatus(score){return score>=85?{key:'healthy',label:'Saudável'}:score>=65?{key:'attention',label:'Atenção'}:{key:'critical',label:'Crítico'}}
  function blueprintBoardStages(targetBoardId=boardId){const rec=ensureBlueprintHome().records?.[targetBoardId],j=graph.journeys?.[rec?.journeyId]||activeJourney();return (j?.stageIds||[]).map(id=>graph.stages?.[id]).filter(Boolean)}
  function blueprintHealthItemStage(it,stages){if(!it)return null;if(it.kind==='smart'&&it.objectKind==='stage')return it.objectId;if(it.blueprintStageId&&graph.stages?.[it.blueprintStageId])return it.blueprintStageId;const rec=it.kind==='smart'?entityRecord(it.objectKind,it.objectId):null;if(rec?.stageId&&graph.stages?.[rec.stageId])return rec.stageId;if(it.kind==='smart'&&it.objectKind==='touchpoint'){const st=stages.find(x=>(x.touchpointIds||[]).includes(it.objectId));if(st)return st.id}if(it.kind==='smart'&&it.objectKind==='problem')return graph.problems?.[it.objectId]?.stageId||null;if(it.kind==='smart'&&it.objectKind==='opportunity')return graph.opportunities?.[it.objectId]?.stageId||null;return null}
  const healthCache=new Map();
  function blueprintHealthReport(targetBoardId=boardId){
    const target=graph.views?.whiteboards?.[targetBoardId]||board(),home=ensureBlueprintHome(),rec=home.records?.[targetBoardId]||{},stages=blueprintBoardStages(targetBoardId),items=Object.values(target?.items||{}).filter(it=>!isContainer(it)&&!(it.kind==='smart'&&it.objectKind==='stage')),settings=blueprintHealthState();
    const criteria={evidence:settings.includeEvidence!==false,ownership:settings.includeOwnership!==false,processIO:settings.includeProcessIO!==false,systems:settings.includeSystems!==false},key=JSON.stringify([graph.persistenceRevision||0,targetBoardId,criteria,rec.owner||'']);if(healthCache.has(key))return healthCache.get(key);
    const gaps=[],stageReports=[],addGap=g=>gaps.push({id:g.id||`gap-${g.stageId||'document'}-${g.laneKey||g.type}-${g.entityId||''}`,severity:g.severity||'medium',...g});
    const useful=it=>{const text=it.kind==='smart'?entityTitle(it.objectKind,entityRecord(it.objectKind,it.objectId)):it.text;return String(text||'').trim().length>=3&&!/^(novo|nova|sem nome|untitled)(\s|$)/i.test(String(text||'').trim())};
    const unlinked=items.filter(it=>!stages.some(st=>blueprintHealthItemStage(it,stages)===st.id));if(unlinked.length)addGap({type:'unlinked-items',severity:'high',title:`${unlinked.length} objeto(s) sem etapa válida`,detail:'Vincule cada objeto operacional à etapa correspondente; o sistema não presume a primeira etapa.'});
    stages.forEach((st,index)=>{
      const si=items.filter(it=>blueprintHealthItemStage(it,stages)===st.id),kind=k=>si.filter(it=>((it.kind==='smart'&&it.objectKind===k)||(it.kind!=='smart'&&it.semantic===k))&&useful(it));
      const core=[{key:'customer',label:'Ação do cliente',ok:String(st.customerAction||'').trim().length>=3,weight:20,severity:'high'},{key:'frontstage',label:'Frontstage',ok:kind('frontstage').length>0,weight:18,severity:'high'},{key:'backstage',label:'Backstage',ok:kind('backstage').length>0,weight:14,severity:'medium'},{key:'process',label:'Processo',ok:kind('process').length>0,weight:18,severity:'high'},{key:'system',label:'Sistema',ok:kind('system').length>0,weight:10,severity:'medium',enabled:criteria.systems},{key:'evidence',label:'Evidência',ok:kind('evidence').length>0,weight:10,severity:'medium',enabled:criteria.evidence}];
      let earned=0,total=0;core.filter(c=>c.enabled!==false).forEach(c=>{total+=c.weight;if(c.ok)earned+=c.weight;else addGap({stageId:st.id,stageTitle:st.title,laneKey:c.key,type:'missing-layer',severity:c.severity,title:`${st.title}: ${c.label} ausente ou incompleto`,detail:'Crie um objeto com conteúdo útil e vínculo explícito a esta etapa.'})});
      const operational=si.filter(it=>it.kind==='smart'&&['frontstage','backstage','process','system'].includes(it.objectKind)),owned=operational.filter(it=>String(entityRecord(it.objectKind,it.objectId)?.owner||'').trim());
      if(criteria.ownership){total+=6;earned+=operational.length?6*owned.length/operational.length:0;const missing=operational.filter(it=>!owned.includes(it));if(missing.length)addGap({stageId:st.id,stageTitle:st.title,type:'missing-owner',severity:'medium',title:`${st.title}: ${missing.length} objeto(s) sem responsável`,detail:'Defina o responsável pelo objeto operacional.',entityId:missing[0].objectId,entityKind:missing[0].objectKind})}
      if(criteria.processIO){total+=4;const processes=kind('process').filter(it=>it.kind==='smart'),complete=processes.filter(it=>{const r=entityRecord('process',it.objectId);return String(r?.input||'').trim()&&String(r?.output||'').trim()});earned+=processes.length?4*complete.length/processes.length:0;const missing=processes.filter(it=>!complete.includes(it));if(missing.length)addGap({stageId:st.id,stageTitle:st.title,type:'process-io',severity:'medium',title:`${st.title}: processo sem entrada/saída completa`,detail:'Defina entrada e saída do processo. Este critério também reduz a pontuação.',entityId:missing[0].objectId,entityKind:'process'})}
      const score=total?Math.round(earned/total*100):0;stageReports.push({stageId:st.id,stageTitle:st.title,index:index+1,score,status:blueprintHealthStatus(score),counts:{customer:core[0].ok?1:0,frontstage:kind('frontstage').length,backstage:kind('backstage').length,process:kind('process').length,system:kind('system').length,evidence:kind('evidence').length},ownership:{total:operational.length,owned:owned.length}})
    });
    const avg=stageReports.length?stageReports.reduce((a,b)=>a+b.score,0)/stageReports.length:0,hasOwner=!!String(rec.owner||'').trim(),score=clamp(Math.round(avg*.95+(hasOwner?5:0)),0,100);if(!hasOwner)addGap({type:'document-owner',severity:'medium',title:'Blueprint sem responsável',detail:'Defina um responsável por este documento.'});
    const result={version:'1.1',score,status:blueprintHealthStatus(score),gaps,severity:{high:gaps.filter(g=>g.severity==='high').length,medium:gaps.filter(g=>g.severity==='medium').length,low:gaps.filter(g=>g.severity==='low').length},stages:stageReports,ownerAssigned:hasOwner,criteria,criteriaLabel:Object.entries(criteria).filter(([,v])=>v).map(([k])=>({evidence:'Evidências',ownership:'Responsáveis',processIO:'Entrada/saída',systems:'Sistemas'})[k]).join(' · '),generatedAt:new Date().toISOString(),boardId:targetBoardId};healthCache.clear();healthCache.set(key,result);return result
  }
  function blueprintHealthGapForCell(stageId,laneKey){return blueprintHealthReport().gaps.find(g=>g.stageId===stageId&&g.laneKey===laneKey&&g.type==='missing-layer')||null}
  function focusBlueprintHealthGap(gapId){const report=blueprintHealthReport(),g=report.gaps.find(x=>x.id===gapId);if(!g)return false;if(g.type==='document-owner'){showInspector=false;showBlueprintDocument=true;blueprintDocumentTab='governance';renderAll();return true}if(g.entityId){const it=Object.values(board().items||{}).find(x=>x.kind==='smart'&&x.objectId===g.entityId&&(g.entityKind?x.objectKind===g.entityKind:true));if(it){selected=[it.id];selectedEdge=null;showBlueprintDocument=false;showInspector=true;renderAll();setTimeout(fitSelection,30);return true}}if(g.stageId&&g.laneKey){showBlueprintDocument=false;renderAll();setTimeout(()=>showBlueprintCellAdd(g.stageId,g.laneKey),30);return true}return false}
  function renderBlueprintHealthPanel(body){
    const r=blueprintHealthReport(),settings=blueprintHealthState(),hero=document.createElement('section');hero.className=`rt186-health-hero ${r.status.key}`;hero.innerHTML=`<div class="rt186-health-score"><strong>${r.score}</strong><span>/100</span></div><div><small>BLUEPRINT HEALTH</small><b>${esc(r.status.label)}</b><span>${r.gaps.length?r.gaps.length+' gap'+(r.gaps.length===1?'':'s')+' identificado'+(r.gaps.length===1?'':'s'):'Nenhum gap estrutural encontrado'}</span></div><div class="rt186-health-severity"><em class="high">${r.severity.high} críticos</em><em class="medium">${r.severity.medium} atenção</em><em class="low">${r.severity.low} melhorias</em></div>`;body.appendChild(hero);
    const settingsSec=document.createElement('section');settingsSec.className='rt183-doc-section rt186-health-settings';settingsSec.innerHTML='<div class="rt183-doc-section-head"><div><b>Critérios</b><span>Regras determinísticas; nenhuma IA é usada neste diagnóstico.</span></div></div>';toggle(settingsSec,'Mostrar gaps no canvas',settings.showMarkers!==false,v=>{settings.showMarkers=v;save(false);renderAll()});toggle(settingsSec,'Considerar sistemas (desative em serviços manuais)',settings.includeSystems!==false,v=>{settings.includeSystems=v;save(false);renderAll()});const criteriaInfo=document.createElement('p');criteriaInfo.className='rt188-criteria';criteriaInfo.textContent='Critérios ativos: '+r.criteriaLabel+'. Pontuação normalizada pelos critérios ativos; compare documentos com a mesma configuração.';settingsSec.appendChild(criteriaInfo);toggle(settingsSec,'Considerar evidências',settings.includeEvidence!==false,v=>{settings.includeEvidence=v;save(false);renderAll()});toggle(settingsSec,'Considerar responsáveis',settings.includeOwnership!==false,v=>{settings.includeOwnership=v;save(false);renderAll()});toggle(settingsSec,'Verificar entrada/saída de processos',settings.includeProcessIO!==false,v=>{settings.includeProcessIO=v;save(false);renderAll()});body.appendChild(settingsSec);
    const stageSec=document.createElement('section');stageSec.className='rt183-doc-section';stageSec.innerHTML='<div class="rt183-doc-section-head"><div><b>Saúde por etapa</b><span>Veja rapidamente onde a operação está incompleta.</span></div></div>';const stageList=document.createElement('div');stageList.className='rt186-stage-health';r.stages.forEach(st=>{const row=document.createElement('div');row.className=`rt186-stage-health-row ${st.status.key}`;row.innerHTML=`<i>${String(st.index).padStart(2,'0')}</i><span><b>${esc(st.stageTitle)}</b><small>${st.ownership.owned}/${st.ownership.total} itens operacionais com responsável</small></span><div class="rt186-mini-progress"><i style="width:${st.score}%"></i></div><strong>${st.score}%</strong>`;stageList.appendChild(row)});stageSec.appendChild(stageList);body.appendChild(stageSec);
    const gapSec=document.createElement('section');gapSec.className='rt183-doc-section';gapSec.innerHTML=`<div class="rt183-doc-section-head"><div><b>Gaps acionáveis</b><span>${r.gaps.length?'Corrija diretamente no ponto onde a lacuna acontece.':'O Blueprint atende aos critérios configurados.'}</span></div><em>${r.gaps.length}</em></div>`;const list=document.createElement('div');list.className='rt186-gap-list';r.gaps.forEach(g=>{const row=document.createElement('article');row.className=`rt186-gap ${g.severity}`;row.innerHTML=`<i>${g.severity==='high'?'!':g.severity==='medium'?'△':'○'}</i><span><b>${esc(g.title)}</b><small>${esc(g.detail)}</small></span>`;const action=btn(g.entityId?'Abrir':'Corrigir',()=>focusBlueprintHealthGap(g.id),g.severity==='high'?'primary':'');row.appendChild(action);list.appendChild(row)});if(!r.gaps.length)list.innerHTML='<div class="rt186-health-empty"><b>✓ Blueprint saudável</b><span>Nenhum gap estrutural foi encontrado com os critérios atuais.</span></div>';gapSec.appendChild(list);body.appendChild(gapSec)
  }

  function showBlueprintStudio(){
    const state=blueprintStudioState(),sum=blueprintStudioSummary(),j=sum.journey;if(!j){toast('Nenhuma Jornada disponível para estruturar o Blueprint.');return}
    const m=modalShell('Service Blueprint 1.0','Estruture como o serviço é entregue sem duplicar as etapas da Jornada: cliente, frontstage, backstage, processos e sistemas usam o mesmo Service Graph.');m.box.classList.add('rt180-blueprint-modal');
    const hero=document.createElement('div');hero.className='rt180-blueprint-hero';hero.innerHTML=`<div><small>BLUEPRINT ATIVO</small><b>Blueprint · ${esc(j.name||'Jornada')}</b><span>${sum.stages.length} etapas · ${sum.frontstage} frontstage · ${sum.backstage} backstage · ${sum.process} processos · ${sum.system} sistemas</span></div><div class="rt180-coverage"><strong>${sum.coverage}%</strong><span>cobertura operacional</span></div>`;m.box.appendChild(hero);
    const general=document.createElement('div');general.className='rt180-general';m.box.appendChild(general);field(general,'Responsável',state.owner||'',v=>{state.owner=v;save(false)});selectField(general,'Status',state.status||'active',[['draft','Rascunho'],['active','Ativo'],['review','Em revisão'],['archived','Arquivado']],v=>{state.status=v;save(false)});toggle(general,'Linhas de serviço',state.showServiceLines!==false,v=>{state.showServiceLines=v;save(false);renderAll()});
    const lines=document.createElement('div');lines.className='rt180-lines-guide';lines.innerHTML='<div><b>Linha de interação</b><span>Separa ações do cliente das ações visíveis da equipe.</span></div><div><b>Linha de visibilidade</b><span>Separa o que o cliente vê do que acontece nos bastidores.</span></div><div><b>Linha de interação interna</b><span>Separa backstage dos processos e sistemas de suporte.</span></div>';m.box.appendChild(lines);
    const sec=document.createElement('section');sec.className='rt180-stage-section';sec.innerHTML='<div class="rt180-section-head"><div><b>Operação por etapa</b><span>As etapas são compartilhadas com o Journey Studio.</span></div></div>';const list=document.createElement('div');list.className='rt180-stage-list';sec.appendChild(list);
    orderedStages().forEach((st,i)=>{const s=blueprintStageStats(st.id),score=blueprintCoverage(st.id),row=document.createElement('article');row.className='rt180-stage-row';row.innerHTML=`<div class="rt180-stage-index">${String(i+1).padStart(2,'0')}</div><div class="rt180-stage-main"><div><b>${esc(st.title)}</b><span>${esc(st.customerAction||'Sem ação do cliente descrita')}</span></div><div class="rt180-stage-chips"><i>F ${s.frontstage}</i><i>B ${s.backstage}</i><i>P ${s.process}</i><i>S ${s.system}</i><i>E ${s.evidence}</i></div></div><div class="rt180-score ${score===100?'ok':score>=60?'warn':'bad'}"><strong>${score}%</strong><span>cobertura</span></div><div class="rt180-stage-actions"></div>`;const a=$('.rt180-stage-actions',row);a.append(btn('↑',()=>{m.root.remove();moveBlueprintStage(st.id,-1);setTimeout(showBlueprintStudio,40)},'icon'),btn('↓',()=>{m.root.remove();moveBlueprintStage(st.id,1);setTimeout(showBlueprintStudio,40)},'icon'),btn('+',()=>showBlueprintAddMenu(st.id,m),'icon'));list.appendChild(row)});m.box.appendChild(sec);
    const lanes=document.createElement('section');lanes.className='rt180-lanes';lanes.innerHTML='<div class="rt180-section-head"><div><b>Camadas do Blueprint</b><span>Oculte camadas sem apagar entidades ou relações.</span></div></div>';const grid=document.createElement('div');grid.className='rt180-lane-grid';const hidden=new Set(viewVisibility('blueprint').hiddenLanes||[]);blueprintLanes.forEach(base=>{const ln=blueprintLanePresentation(base.key),lab=document.createElement('label');lab.innerHTML=`<input type="checkbox" ${hidden.has(ln.key)?'':'checked'}><i style="background:${tone[ln.tone]}"></i><span><b>${esc(ln.label)}</b><small>${esc(ln.hint)}</small></span>`;lab.querySelector('input').onchange=e=>{const h=new Set(viewVisibility('blueprint').hiddenLanes||[]);e.target.checked?h.delete(ln.key):h.add(ln.key);viewVisibility('blueprint').hiddenLanes=[...h];invalidateViewLayout('blueprint');save(false);applyLayout('blueprint',true)};grid.appendChild(lab)});lanes.appendChild(grid);m.box.appendChild(lanes);
    const quick=document.createElement('section');quick.className='rt180-quick';quick.innerHTML='<div class="rt180-section-head"><div><b>Adicionar ao Blueprint</b><span>Cria a entidade e posiciona na primeira etapa; depois você pode trocar a etapa pelo Inspector.</span></div></div>';const q=document.createElement('div');q.className='rt180-quick-grid';['evidence','frontstage','backstage','process','system'].forEach(k=>{const lp=blueprintLanePresentation(k);q.appendChild(btn(lp.label,()=>{m.root.remove();addBlueprintEntity(k,orderedStages()[0]?.id)},k==='process'?'primary':''))});quick.appendChild(q);m.box.appendChild(quick);
    const foot=document.createElement('div');foot.className='rt180-footer';foot.append(btn('Filtros e visibilidade',()=>{m.root.remove();showViewFilters()}),btn('Service Graph',()=>{m.root.remove();showGraphBrowser()}),btn('Abrir Blueprint',()=>{m.root.remove();pref().layoutMode='blueprint';invalidateViewLayout('blueprint');save(false);applyLayout('blueprint',true)},'primary'));m.box.appendChild(foot)
  }

  function blueprintStatusLabel(v){return v==='active'?'Ativo':v==='review'?'Em revisão':v==='archived'?'Arquivado':'Em construção'}
  function closeEditorSidePanels(keep=''){
    if(keep!=='library')showLibrary=false;if(keep!=='layers')showLayers=false;if(keep!=='outline')showOutline=false;if(keep!=='inspector'){showInspector=false;inspectorMode='selection'}if(keep!=='blueprint')showBlueprintDocument=false;
  }
  function toggleBlueprintDocument(tab='structure'){
    if((pref().layoutMode||'free')!=='blueprint')return;const opening=!showBlueprintDocument||blueprintDocumentTab!==tab;closeEditorSidePanels('blueprint');showBlueprintDocument=opening;blueprintDocumentTab=tab;showBoardMenu=false;renderAll()
  }
  function blueprintDocumentSummary(){const rec=blueprintHomeRecord(),sum=blueprintStudioSummary(),j=activeJourney();return{rec,sum,journey:j,stages:orderedStages(),state:blueprintStudioState(),health:blueprintHealthReport()}}
  function renderBlueprintDocumentPanel(parent){
    const d=blueprintDocumentSummary(),rec=d.rec||{},sum=d.sum||{},state=d.state||{},panel=document.createElement('aside');panel.className='rt183-blueprint-document';parent.appendChild(panel);
    panel.innerHTML=`<div class="rt183-doc-head"><div><small>DOCUMENTO</small><b>Blueprint</b><span>${esc(board().name||'Blueprint')}</span></div><button class="rt144-x" aria-label="Fechar">×</button></div><div class="rt183-doc-tabs"><button data-tab="structure">Estrutura</button><button data-tab="context">Contexto</button><button data-tab="governance">Governança</button><button data-tab="health">Saúde</button><button data-tab="learning">Aprender</button></div><div class="rt183-doc-body"></div>`;
    $('.rt144-x',panel).onclick=()=>{showBlueprintDocument=false;renderAll()};$$('[data-tab]',panel).forEach(b=>{b.classList.toggle('active',b.dataset.tab===blueprintDocumentTab);b.onclick=()=>{blueprintDocumentTab=b.dataset.tab;renderAll()}});
    const body=$('.rt183-doc-body',panel),coverage=Number(sum.coverage||0),hero=document.createElement('div');hero.className='rt183-doc-coverage';hero.innerHTML=`<div><span>Cobertura operacional</span><b>${coverage}%</b></div><div class="rt183-progress"><i style="width:${clamp(coverage,0,100)}%"></i></div><small>${sum.frontstage||0} frontstage · ${sum.backstage||0} backstage · ${sum.process||0} processos · ${sum.system||0} sistemas</small>`;if(blueprintDocumentTab!=='health')body.appendChild(hero);
    if(blueprintDocumentTab==='structure'){
      const sec=document.createElement('section');sec.className='rt183-doc-section';sec.innerHTML=`<div class="rt183-doc-section-head"><div><b>Camadas</b><span>Escolha o que esta leitura mostra.</span></div><em>${d.stages.length} etapas</em></div>`;const hidden=new Set(viewVisibility('blueprint').hiddenLanes||[]),grid=document.createElement('div');grid.className='rt183-doc-lanes';blueprintLanes.forEach(base=>{const ln=blueprintLanePresentation(base.key),lab=document.createElement('label');lab.innerHTML=`<input type="checkbox" ${hidden.has(ln.key)?'':'checked'}><i style="background:${tone[ln.tone]}"></i><span>${esc(ln.label)}${blueprintLearningState().mode==='guided'?`<small>${esc(ln.technical)}</small>`:''}</span>`;lab.querySelector('input').onchange=e=>{const h=new Set(viewVisibility('blueprint').hiddenLanes||[]);e.target.checked?h.delete(ln.key):h.add(ln.key);viewVisibility('blueprint').hiddenLanes=[...h];invalidateViewLayout('blueprint');save(false);applyLayout('blueprint',true)};grid.appendChild(lab)});sec.appendChild(grid);body.appendChild(sec);
      const lines=document.createElement('section');lines.className='rt183-doc-section';lines.innerHTML='<div class="rt183-doc-section-head"><div><b>Linhas do serviço</b><span>Interação, visibilidade e interação interna.</span></div></div>';toggle(lines,'Exibir linhas semânticas',state.showServiceLines!==false,v=>{state.showServiceLines=v;save(false);renderAll()});body.appendChild(lines);
      const actions=document.createElement('div');actions.className='rt183-doc-actions';actions.append(btn('Reorganizar Blueprint',()=>{invalidateViewLayout('blueprint');applyLayout('blueprint',true)},'primary wide'),btn('Filtros e visibilidade',()=>{showBlueprintDocument=false;showViewFilters()},'wide'),btn('Visualizações salvas',()=>{showBlueprintDocument=false;showSavedViews()},'wide'));body.appendChild(actions)
    } else if(blueprintDocumentTab==='context'){
      const sec=document.createElement('section');sec.className='rt183-doc-section';sectionTitle(sec,'Identificação');field(sec,'Nome do Blueprint',board().name||'',v=>{const name=(v||'Blueprint').trim()||'Blueprint';board().name=name;if(rec){rec.name=name;rec.updatedAt=new Date().toISOString()}save(false)});const svc=document.createElement('div');svc.className='rt183-readonly';svc.innerHTML=`<small>Serviço</small><b>${esc(graph.service?.name||'Serviço')}</b>`;sec.appendChild(svc);
      const journeys=Object.values(graph.journeys||{}).map(j=>[j.id,j.name||'Jornada']);selectField(sec,'Jornada vinculada',rec.journeyId||d.journey?.id||'',journeys,v=>{if(rec){rec.journeyId=v;rec.updatedAt=new Date().toISOString()}meta.journeyStudio ||= {};meta.journeyStudio.activeJourneyId=v;state.activeJourneyId=v;invalidateViewLayout('journey');invalidateViewLayout('blueprint');save(false);applyLayout('blueprint',true)});body.appendChild(sec);
      const st=document.createElement('section');st.className='rt183-doc-section';st.innerHTML=`<div class="rt183-doc-section-head"><div><b>Etapas compartilhadas</b><span>Journey e Blueprint usam a mesma ordem.</span></div><em>${d.stages.length}</em></div><div class="rt183-stage-mini">${d.stages.map((x,i)=>`<span><i>${String(i+1).padStart(2,'0')}</i>${esc(x.title)}</span>`).join('')}</div>`;st.appendChild(btn('Gerenciar etapas',()=>{showBlueprintDocument=false;showBlueprintStudio()},'wide'));body.appendChild(st)
    } else if(blueprintDocumentTab==='governance'){
      const sec=document.createElement('section');sec.className='rt183-doc-section';sectionTitle(sec,'Governança');field(sec,'Responsável',rec.owner||state.owner||'',v=>{state.owner=v;if(rec){rec.owner=v;rec.updatedAt=new Date().toISOString()}save(false)});selectField(sec,'Status',rec.status||state.status||'draft',[['draft','Em construção'],['active','Ativo'],['review','Em revisão'],['archived','Arquivado']],v=>{state.status=v;if(rec){rec.status=v;rec.updatedAt=new Date().toISOString()}save(false)});body.appendChild(sec);
      const info=document.createElement('div');info.className='rt183-doc-info';info.innerHTML=`<b>Governança do documento</b><span>Responsável e status pertencem ao Blueprint. Responsáveis de processos e ações continuam nas próprias entidades do Service Graph.</span>`;body.appendChild(info)
    } else if(blueprintDocumentTab==='health'){
      renderBlueprintHealthPanel(body)
    } else {
      renderBlueprintLearningPanel(body)
    }
    const foot=document.createElement('div');foot.className='rt183-doc-foot';foot.append(btn('Configuração avançada',()=>{showBlueprintDocument=false;showBlueprintStudio()},'rt181-secondary'),btn('Service Graph',()=>{showBlueprintDocument=false;showGraphBrowser()},'rt181-ghost'));body.appendChild(foot)
  }

  function editorContextKind(){
    const b=board();
    if(b?.viewKind==='journey')return 'journey';
    if(b?.viewKind==='blueprint')return 'blueprint';
    if(meta?.blueprintHome?.records?.[boardId])return 'blueprint';
    return (pref().layoutMode||'free')==='journey'?'journey':(pref().layoutMode||'free')==='blueprint'?'blueprint':'whiteboard';
  }
  function rememberContextView(mode){
    const context=editorContextKind(),now=new Date().toISOString();
    if(context==='journey'){const j=activeJourney();if(j){j.lastView=mode;j.updatedAt=now}}
    if(context==='blueprint'){const r=meta?.blueprintHome?.records?.[boardId];if(r){r.lastView=mode;r.updatedAt=now}}
  }
  function inspectorGuided(){
    const context=editorContextKind();
    if(context==='journey')return journeyMode()==='guided';
    if(context==='blueprint')return blueprintLearningState().mode==='guided';
    return false;
  }
  function mobileReadOnly(){return typeof window!=='undefined'&&window.matchMedia?.('(max-width:599px)').matches}

  function renderSimpleVisualInspector(parent,item){
    const id=item.id;
    const hint=document.createElement('p');hint.className='bo-editor-hint';hint.textContent='Dê duplo clique no objeto para escrever no quadro.';parent.appendChild(hint);
    textareaField(parent,'Conteúdo',item.text||'',value=>{const current=board().items[id];if(current){current.text=value;save(false)}});
    sectionTitle(parent,'Cor');
    const colors=document.createElement('div');colors.className='rt144-colors';
    const names={slate:'Cinza',blue:'Azul',emerald:'Verde',amber:'Laranja',violet:'Violeta',rose:'Rosa',yellow:'Amarelo'};
    Object.keys(tone).forEach(key=>{const color=btn('',()=>{const current=board().items[id];if(current){markEdit('Alterar cor');current.tone=key;save()}});color.style.setProperty('background',toneBg[key]||tone[key],'important');color.title=names[key]||key;color.setAttribute('aria-label',color.title);color.setAttribute('aria-pressed',String(itemTone(item)===key));colors.appendChild(color)});parent.appendChild(colors);
    const details=document.createElement('details');details.className='bo-editor-details';details.innerHTML='<summary>Mais propriedades</summary>';
    selectField(details,'Tamanho',item.noteSize||'medium',[['small','Pequeno'],['medium','Médio'],['large','Grande']],value=>{const current=board().items[id];if(!current)return;markEdit('Redimensionar objeto');current.noteSize=value;[current.width,current.height]={small:[200,120],medium:[250,150],large:[340,210]}[value];save()});
    field(details,'Tags',(item.tags||[]).join(', '),value=>{const current=board().items[id];if(current){current.tags=value.split(',').map(x=>x.trim()).filter(Boolean).slice(0,6);save()}});
    toggle(details,'Bloquear objeto',isLocked(item),value=>setLocked(id,value));parent.appendChild(details);
    const row=document.createElement('div');row.className='rt144-row';row.append(btn('Duplicar',()=>duplicateItems([board().items[id]])),btn('Organizar em Blueprint',showBlueprintSelectionPreview));parent.appendChild(row);
    parent.appendChild(btn('Remover deste quadro',removeSelection,'danger wide'));
  }

  function showBlueprintJourneyPicker(){
    const journeys=graph.service.journeyIds.map(id=>graph.journeys[id]).filter(j=>j?.stageIds?.length);
    const modal=modalShell('Usar Jornada existente','As etapas e ações do cliente continuam ligadas à Jornada.');
    journeys.forEach(journey=>{const choose=btn(journey.name,()=>{markEdit('Vincular Jornada');board().journeyId=journey.id;serviceCompositionState().showRecipePrompt=false;modal.root.remove();serviceCompositionLayout();save();fitCurrentView()},'wide');modal.box.appendChild(choose)});
  }

  function showBlueprintSelectionPreview(){
    if(board()?.viewKind!=='free'){toast('Abra o Whiteboard de origem para organizar uma seleção.');return}
    const sourceId=boardId,sourceIds=[...selected];
    if(!sourceIds.length){toast('Selecione as ideias que deseja organizar em um Blueprint.');return}
    const selection=blueprintSelection(graph,sourceId,sourceIds);
    const modal=modalShell('Organizar em Blueprint','Revise as etapas, as camadas e o vínculo antes de criar. O quadro de origem mantém suas posições.');
    modal.box.classList.add('bo-editor-preview');
    const form=document.createElement('form');form.className='bo-editor-preview-form';
    form.innerHTML='<label>Nome do Blueprint<input name="blueprintName" required maxlength="160"></label><label>Jornada<select name="journey"></select></label><label data-new-stages>Etapas da nova Jornada <small>Uma etapa por linha</small><textarea name="stages" rows="3" required>Etapa 1</textarea></label><label>Conteúdo compartilhado<select name="binding"><option value="linked">Manter vínculo com o Whiteboard</option><option value="copy">Criar cópias independentes</option></select></label><p class="bo-editor-hint" data-binding-hint></p><div class="bo-editor-preview-table"><table><thead><tr><th>Ideia selecionada</th><th>Camada</th><th>Etapa</th></tr></thead><tbody></tbody></table></div><p class="bo-editor-form-error" role="alert" hidden></p><footer><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Criar Blueprint</button></footer>';
    modal.box.appendChild(form);form.elements.blueprintName.value=board().name+' · Blueprint';
    const journeySelect=form.elements.journey,journeys=graph.service.journeyIds.map(id=>graph.journeys[id]).filter(j=>j?.stageIds?.length);
    journeySelect.appendChild(new Option('Criar nova Jornada',''));journeys.forEach(j=>journeySelect.appendChild(new Option(j.name,j.id)));
    if(journeys.some(j=>j.id===board().journeyId))journeySelect.value=board().journeyId;
    const tbody=form.querySelector('tbody'),rows=[];
    selection.forEach(item=>{
      const tr=document.createElement('tr'),title=document.createElement('td');title.textContent=item.title;
      if(item.excluded){const detail=document.createElement('small');detail.textContent=item.reason;title.appendChild(detail)}
      const layerCell=document.createElement('td'),layer=document.createElement('select');layer.setAttribute('aria-label','Camada de '+item.title);
      [['customer','Ação do cliente'],['frontstage','Frontstage'],['backstage','Backstage'],['process','Processos de suporte'],['enablement','Sistemas e recursos'],['skip','Manter somente no Whiteboard']].forEach(([value,label])=>layer.appendChild(new Option(label,value)));
      layer.value=item.excluded?'skip':item.layer;layer.disabled=item.excluded;layerCell.appendChild(layer);
      const stageCell=document.createElement('td'),stage=document.createElement('select');stage.setAttribute('aria-label','Etapa de '+item.title);stageCell.appendChild(stage);
      tr.append(title,layerCell,stageCell);tbody.appendChild(tr);rows.push({item,layer,stage});
    });
    const redrawStages=()=>{
      const journey=graph.journeys[journeySelect.value],names=form.elements.stages.value.split('\n').map(x=>x.trim()).filter(Boolean);
      form.querySelector('[data-new-stages]').hidden=!!journey;form.elements.stages.required=!journey;
      rows.forEach(({item,layer,stage})=>{const previous=stage.value;stage.replaceChildren();
        if(journey)journey.stageIds.forEach(id=>{if(graph.stages[id])stage.appendChild(new Option(graph.stages[id].title,id))});
        else names.forEach((name,index)=>stage.appendChild(new Option(name,String(index))));
        const values=[...stage.options].map(option=>option.value);if(values.includes(previous))stage.value=previous;else if(values.includes(item.stageId))stage.value=item.stageId;
        stage.disabled=layer.value==='skip';
      });
    };
    const explainBinding=()=>{form.querySelector('[data-binding-hint]').textContent=form.elements.binding.value==='linked'?'As ideias incluídas passam a compartilhar conteúdo com o Blueprint. Mover um objeto mantém o layout de cada quadro independente.':'O Blueprint recebe cópias do conteúdo. Alterações posteriores ficam independentes do Whiteboard.'};
    journeySelect.onchange=redrawStages;form.elements.stages.oninput=redrawStages;form.elements.binding.onchange=explainBinding;
    rows.forEach(row=>row.layer.onchange=redrawStages);redrawStages();explainBinding();
    form.querySelector('[data-cancel]').onclick=()=>modal.root.remove();
    form.onsubmit=event=>{
      event.preventDefault();const error=form.querySelector('[role=alert]');error.hidden=true;
      const before=clone(graph),beforeMeta=clone(meta),beforeBoard=boardId;
      try{
        const linked=form.elements.binding.value==='linked';
        if(linked&&rows.some(row=>row.layer.value!=='skip'&&isLocked(graph.views.whiteboards[sourceId].items[row.item.id])))throw Error('Desbloqueie os objetos antes de vinculá-los.');
        const result=createBlueprintFromSelection(graph,{sourceBoardId:sourceId,name:form.elements.blueprintName.value,journeyId:journeySelect.value,
          stageNames:form.elements.stages.value.split('\n'),linked,items:rows.map(({item,layer,stage})=>({itemId:item.id,layer:layer.value,stageId:stage.value,stageIndex:Number(stage.value)}))},uid);
        markEdit('Organizar seleção em Blueprint');pref().viewport={zoom,pan:clone(pan)};graph=result.graph;boardId=result.boardId;meta.activeBoardId=boardId;
        meta.boardPrefs[boardId]={layoutMode:'service',gridVisible:false,snapToGrid:true,smartGuides:true,minimap:true,cardDensity:'normal'};
        meta.frameParents[boardId]={};meta.groups[boardId]={};meta.viewLayouts[boardId]={};
        selected=[];selectedEdge=null;showInspector=false;serviceCompositionState().experienceMode='free';serviceCompositionState().showRecipePrompt=false;
        restoringEdit=true;serviceCompositionLayout();
        if(!save(false,{label:'Organizar seleção em Blueprint'}))throw Error(persistence.error||'Não foi possível salvar o Blueprint.');
        restoringEdit=false;recordEditSnapshot('Organizar seleção em Blueprint');modal.root.remove();renderAll();fitCurrentView();
        toast(result.count+' objeto(s) organizados. O Whiteboard de origem foi preservado.');
      }catch(cause){restoringEdit=false;graph=before;meta=beforeMeta;boardId=beforeBoard;selected=sourceIds.filter(id=>board().items[id]);error.textContent=cause.message||String(cause);error.hidden=false;}
    };
    form.elements.blueprintName.focus();
  }

  function beginBlueprintCellEntry(cell,layerKey,stageId,value=''){
    if(mobileReadOnly())return;
    if(cell.querySelector('.bo-editor-cell-entry'))return;
    const layer=SERVICE_FRAME_LAYERS.find(layer=>layer.key===layerKey),stage=graph.stages[stageId];if(!layer||!stage)return;
    const form=document.createElement('form');form.className='bo-editor-cell-entry';form.setAttribute('aria-label',layer.label+' · '+stage.title);
    const input=document.createElement('textarea');input.rows=3;input.value=value;input.placeholder=layerKey==='customer'?'O que o cliente faz?':layerKey==='evidence'?'Ex.: Comprovante de confirmação':'Descreva a atividade';input.setAttribute('aria-label',layer.label+' · '+stage.title);
    let evidenceFormat=null;if(layerKey==='evidence'){const label=document.createElement('label');label.textContent='Formato da evidência';evidenceFormat=document.createElement('select');evidenceFormat.setAttribute('aria-label','Formato da evidência');evidenceFormat.innerHTML='<option value="digital">Digital</option><option value="physical">Física</option><option value="documentary">Documento</option><option value="human">Interação humana</option>';label.appendChild(evidenceFormat);form.appendChild(label)}
    const hint=document.createElement('small');hint.textContent='Enter para concluir · Shift+Enter para nova linha';
    const actions=document.createElement('div');actions.append(btn('Cancelar',()=>form.remove()));const submit=btn('Concluir',()=>{} ,'primary');submit.type='submit';actions.appendChild(submit);form.append(input,hint,actions);
    form.onpointerdown=event=>event.stopPropagation();form.onclick=event=>event.stopPropagation();
    input.onkeydown=event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();form.remove()}else if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit()}};
    form.onsubmit=event=>{
      event.preventDefault();const text=input.value.trim();if(!text){input.focus();return}
      markEdit('Editar '+layer.label);
      if(layerKey==='customer'){
        graph.stages[stageId].customerAction=text;
        Object.values(board().items).filter(item=>item.objectKind==='customerAction'&&serviceFrameStageForItem(item)===stageId).forEach(item=>setEntityTitle(item.objectKind,item.objectId,text));
      }else{
        const objectId=createGraphEntityWithTitle(layer.defaultKind,text);assignJourneyEntityStage(layer.defaultKind,objectId,stageId);
        if(layerKey==='evidence'){const record=entityRecord('evidence',objectId);record.evidencePurpose='service';record.evidenceMedium=evidenceFormat.value;record.serviceVisibility='customer-visible'}
        const id=uid('smart');board().items[id]={id,instanceId:id,kind:'smart',objectKind:layer.defaultKind,objectId,entityRef:{type:layer.defaultKind,id:objectId},entityStatus:'linked',serviceStageId:stageId,serviceLayer:layerKey,tone:layer.tone,x:0,y:0,width:288,height:104};
        serviceCompositionLayout([id]);selected=[id];selectedEdge=null;showInspector=false;
      }
      serviceCompositionState().showRecipePrompt=false;save();
    };
    cell.appendChild(form);input.focus();
  }

  function renderServiceFrameStickyGuides(wrap){
    const m=serviceFrameMetrics();if(!m.stages.length)return;
    const top=pan.y+m.rootY*zoom,left=pan.x+m.rootX*zoom,rail=76,right=wrap.clientWidth-(showInspector?334:14);
    const heads=top<8,lanes=left<rail;if(!heads&&!lanes)return;
    const layer=document.createElement('div');layer.className='bo-editor-sticky-guides';wrap.appendChild(layer);
    if(heads)m.stages.forEach((stage,index)=>{const x=pan.x+(m.rootX+m.stageLeft+index*m.colW)*zoom,width=m.colW*zoom;if(x+width<rail||x>right)return;
      const head=document.createElement('div');head.className='bo-editor-sticky-stage';head.style.left=Math.max(rail,x)+'px';head.style.width=Math.max(60,Math.min(x+width,right)-Math.max(rail,x))+'px';head.textContent=stage.title;head.title=stage.title;layer.appendChild(head)});
    if(lanes)SERVICE_FRAME_LAYERS.forEach((definition,index)=>{const y=pan.y+(m.rootY+m.rowTops[index])*zoom;if(y+m.rowHeights[index]*zoom<50||y>wrap.clientHeight-70)return;
      const label=document.createElement('div');label.className='bo-editor-sticky-lane';label.style.top=Math.max(64,y)+'px';label.textContent=serviceLayerLabel(definition);layer.appendChild(label)});
  }

  function renderTop(){
    const top=document.createElement('header');
    top.className='rt144-top rt154-top rt1551-top rt181-top rt183-top rt1810-top rt190-top bo1174-board-header';
    top.innerHTML='<div class="rt181-context rt183-context rt190-context"></div><div class="rt181-topmid rt183-topmid rt190-topmid"></div><div class="rt181-actions rt183-actions rt190-actions"></div>';
    overlay.appendChild(top);
    const context=$('.rt181-context',top),mid=$('.rt181-topmid',top),actions=$('.rt181-actions',top),kind=editorContextKind();
    const label=kind==='blueprint'?'Blueprint':kind==='journey'?'Jornada':'Whiteboard';
    const back=btn('‹',()=>{
      if(kind==='blueprint'){
        close(false);window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'canvas'}));
        setTimeout(()=>window.dispatchEvent(new CustomEvent('bo-service-workspace-tab',{detail:'blueprint'})),0);
      }else if(kind==='journey'&&runtime.api('journeyHomeShell')){close(false);runtime.api('journeyHomeShell').show()}
      else closeToWhiteboards();
    },'icon rt181-back rt190-back');
    back.title='Voltar para '+(kind==='blueprint'?'Blueprints':kind==='journey'?'Jornadas':'Whiteboards');back.setAttribute('aria-label',back.title);
    const copy=document.createElement('div');copy.className='rt181-context-copy rt183-context-copy rt190-context-copy';
    copy.innerHTML=`<small class="bo1174-board-crumb">${label} <i>·</i> ${esc(graph.service.name)}</small><div class="rt183-doc-title rt190-doc-title"><b>${esc(board().name||label)}</b></div>`;
    context.append(back,copy);
    if(kind==='whiteboard'){
      const organize=btn('Organizar em Blueprint',showBlueprintSelectionPreview,'bo-editor-organize');
      organize.disabled=!selected.length;organize.title=selected.length?'Revisar etapas, camadas e vínculos da seleção':'Selecione as ideias que deseja organizar';mid.appendChild(organize);
    }else if(kind==='blueprint'&&!mobileReadOnly()){
      const simple=btn('Visão simplificada',()=>{blueprintReferenceState().mode='reference';save(false,{content:false,history:false,label:'Visão simplificada'});renderAll()},'bo-guided-reading-trigger');mid.appendChild(simple);
      const stage=btn('＋ Adicionar etapa',()=>addJourneyStage({returnTo:'service'}),'primary bo-editor-add-stage');
      stage.setAttribute('aria-label','Adicionar etapa');mid.appendChild(stage);
    }
    if(!mobileReadOnly()&&!(kind==='blueprint'&&blueprintLearningState().mode==='guided')){
      const undo=btn('↶',undoEdit,'icon rt150-undo');undo.title='Desfazer · Ctrl/Cmd Z';undo.setAttribute('aria-label','Desfazer');
      const redo=btn('↷',redoEdit,'icon rt150-redo');redo.title='Refazer · Ctrl/Cmd Shift Z';redo.setAttribute('aria-label','Refazer');actions.append(undo,redo);
    }
    const saved=document.createElement('span');saved.className='rt1410-save rt181-save rt190-save';saved.setAttribute('role','status');saved.setAttribute('aria-live','polite');saved.textContent='Salvando…';actions.appendChild(saved);setTimeout(updateSaveIndicator,0);
    if(mobileReadOnly()){const badge=document.createElement('span');badge.className='bo1175-mobile-read-badge';badge.textContent='Modo leitura';actions.appendChild(badge);const comment=btn('Comentar',()=>runtime.api('collaboration')?.show?.('comments'),'bo1175-mobile-comment');comment.title='Abrir comentários';actions.appendChild(comment)}
    if(kind==='blueprint'){
      const guide=btn('Leitura guiada',toggleGuidedBlueprintPanel,'bo-guided-reading-trigger');
      guide.setAttribute('aria-pressed',String(guidedBlueprintUiState().open));guide.title='Passo a passo, visão do cliente e critérios de qualidade';mid.appendChild(guide);
    }
    if(kind!=='blueprint'){
    const present=btn('Apresentar',()=>runtime.api('presentationWorkshop')?.show?.('presentation'),'rt194-present-btn');present.title='Apresentar o conteúdo deste documento';actions.appendChild(present);
    const commands=btn('⌘ K',openCommandPalette,'rt190-command');commands.title='Buscar comandos';commands.setAttribute('aria-label','Buscar comandos');actions.appendChild(commands);
    }
    const tools=btn(kind==='blueprint'?'Opções':'Mais',showEditorToolsMenu,'rt190-tools-menu');tools.title='Visualizações, ajuda e ferramentas';actions.appendChild(tools);
    // Shared action variants also apply to the runtime editor header.
    top.querySelectorAll('button').forEach(button=>{button.classList.add('bo-button',button.classList.contains('primary')?'bo-button--primary':button.classList.contains('icon')?'bo-button--ghost':'bo-button--secondary');if(button.classList.contains('icon'))button.classList.add('bo-button--icon')});
    if(kind!=='blueprint'){const menu=btn('•••',()=>{showBoardMenu=!showBoardMenu;showBlueprintDocument=false;renderAll()},'icon menu rt190-more');menu.title='Ações do documento';menu.setAttribute('aria-label',menu.title);actions.appendChild(menu);}
  }
  function showEditorToolsMenu(){
    const contextKind=editorContextKind(),m=modalShell('Ferramentas do editor','Ações secundárias ficam aqui para manter o canvas limpo.');m.box.classList.add('rt190-tools-dialog');
    let grid=document.createElement('div');grid.className='rt190-tools-grid';m.box.appendChild(grid);
    const addTool=(icon,title,desc,fn,primary=false)=>{const b=document.createElement('button');b.className='rt190-tool-card'+(primary?' primary':'');b.innerHTML=`<span>${icon}</span><div><b>${esc(title)}</b><small>${esc(desc)}</small></div><em>›</em>`;b.onclick=()=>{m.root.remove();fn()};grid.appendChild(b)};
    const addSection=label=>{const h=document.createElement('div');h.className='rt190-tools-section';h.textContent=label;grid.appendChild(h)};
    if(contextKind==='blueprint'){
      addSection('COMEÇAR');
      addTool('？','Como montar o Blueprint','Um guia curto para entender etapas, atividades e bastidores',showBlueprintQuickStart,true);
      addTool('▦','Visualizações','Trocar entre vista operacional e matriz detalhada',showVisualizationEngine);
      addTool('✓','Revisar entrega','Verificar relações, prazos, capacidade e promessa do serviço',()=>showBlueprintDeliveryReview());
      if(!mobileReadOnly())addTool('◇','Estratégia do serviço','Promessa, 7 Ps e critérios de qualidade',showBlueprintServiceStrategy);
      addTool('⇩','Importar / Exportar','Salvar uma cópia ou trazer um arquivo',showImportExportCenter);
      if(board().sourceBoardId&&graph.views.whiteboards[board().sourceBoardId])addTool('↗','Quadro de origem','Reabrir as ideias que originaram este Blueprint',()=>{const id=board().sourceBoardId;close(false);openWhiteboard(id)});
      const advanced=document.createElement('details');advanced.className='bo-simple-advanced';advanced.innerHTML='<summary>Ferramentas avançadas</summary>';m.box.appendChild(advanced);
      grid=document.createElement('div');grid.className='rt190-tools-grid';advanced.appendChild(grid);
      addTool('•••','Ações do documento','Duplicação, histórico e configurações',()=>{showBoardMenu=true;showBlueprintDocument=false;renderAll()});
    }
    addSection('CONSTRUIR SERVIÇO');
    addTool('✦','Contexto do serviço','Revise Personas, necessidades, problemas e evidências antes de estruturar o serviço',openServiceContextHome,true);
    addTool('▤','Blueprint operacional','Etapas × Cliente × Frontstage × Backstage × Processos × Sistemas/Recursos',()=>applyLayout('service',true),true);
    addSection('EDITAR');
    addTool('⌕','Filtros e visibilidade',filterCount()?`${filterCount()} filtro(s) ativo(s)`:'Escolha o que aparece nesta leitura',showViewFilters);
    addTool('◇','Visualizações salvas',`${structuredState().savedViews.length} leitura(s) salva(s)`,showSavedViews);
    addTool('⌘','Paleta de comandos','Acesse qualquer ação sem procurar botões',openCommandPalette);
    addSection('ANALISAR');
    addTool('✓','Revisão do serviço','Ver lacunas e critérios de completude',showReadinessDetails);
    addTool('⌕','Pesquisa & Evidências','Fontes, evidências, insights e rastreabilidade',()=>runtime.api('researchWorkspace')?.show?.());
    addTool('▧','Camadas & Cenários','Controle complexidade e compare alternativas sem duplicar dados',()=>runtime.api('serviceLayers')?.show?.());
    addTool('▶','Apresentação & Workshop','Frames como slides, narrativa, timer, votação e facilitação',()=>runtime.api('presentationWorkshop')?.show?.());
    addTool('◈','Inteligência do Serviço','Dependências, responsabilidades, métricas e roadmap de transformação',()=>runtime.api('serviceIntelligence')?.show?.());
    addSection('GERENCIAR');
    addTool('◎','Benefícios & Transformação','Iniciativas, métricas, resultados e realização de benefícios',()=>runtime.api('benefitsRealization')?.show?.());
    addTool('◉','Colaboração & Comentários','Membros, comentários, presença local e fundação de sincronização',()=>runtime.api('collaboration')?.show?.('comments'));
    addTool('◴','Revisão Operacional','Cadência, agenda automática, decisões e acompanhamento contínuo',()=>runtime.api('operatingReview')?.show?.());
    addTool('✓','Integridade dos dados','Schema V3 · relações, órfãos e reparos seguros',()=>runtime.api('dataIntegrity')?.showReport?.());
    addTool('▶','Simulação prática','Carregue um serviço completo e percorra o produto de ponta a ponta',()=>runtime.api('practicalSimulation')?.show?.(),true);
    addSection('AJUDA');
    addTool('ⓘ','Sobre este editor',`Versão V${APP_VERSION} · diagnósticos e recuperação`,showCoreStatus);
    if(contextKind==='journey'){
      addSection('JORNADA');
      addTool('＋','Nova etapa','Adicionar um novo momento da experiência',addJourneyStage,true);
      addTool('⌁','Mapa da jornada','Lanes, personas, emoção e Current × Future',showJourneyMappingExperience);
      addTool('✓','Completude da Jornada',`Completude ${journeyHealthReport().score}%`,showJourneyHealth);
      addTool('⚙','Configurar jornada','Nome, owner, prioridade, objetivo e revisão',showJourneyStudio);
      addTool('◎',journeyMode()==='guided'?'Modo profissional':'Modo guiado',journeyMode()==='guided'?'Exibir controles e detalhes avançados':'Reduzir a interface ao essencial',()=>{setJourneyMode(journeyMode()==='guided'?'professional':'guided');inspectorTab='essential'});
    }else if(contextKind==='blueprint'){
      addSection('BLUEPRINT');
      const health=blueprintHealthReport(),learn=blueprintLearningState();
      addTool('♥','Saúde do Blueprint',`${health.score} · ${health.status.label}`,()=>toggleBlueprintDocument('health'));
      addTool('▦','Estrutura do Blueprint','Camadas, contexto e governança',()=>toggleBlueprintDocument('structure'));
      addTool('◎',learn.mode==='guided'?'Modo profissional':'Modo guiado',learn.mode==='guided'?'Exibir Service Graph e controles avançados':'Mostrar somente o essencial',()=>{setBlueprintLearningMode(learn.mode==='guided'?'professional':'guided');inspectorTab='essential'});
    }
    addTool('⇩','Importar / Exportar','Backup, JSON, CSV, SVG, PNG e PDF',showImportExportCenter);
  }
  function showBlueprintQuickStart(){
    const m=modalShell('Como montar o Blueprint','Comece pela experiência do cliente e detalhe a entrega aos poucos.');
    const guide=document.createElement('div');guide.className='bo-simple-quick-start';
    guide.innerHTML='<ol><li><b>1. Crie as etapas</b><p>Cada coluna é um momento, como solicitar atendimento ou receber a entrega.</p></li><li><b>2. Conte o que acontece</b><p>Clique em uma célula e escreva uma atividade. Comece pelo cliente e pelo atendimento que ele vê.</p></li><li><b>3. Complete os bastidores</b><p>Registre o trabalho interno, os processos e os sistemas que tornam a entrega possível.</p></li></ol><p>As alterações são salvas neste dispositivo. Use Importar / Exportar para guardar uma cópia.</p>';
    m.box.appendChild(guide);m.box.appendChild(btn('Entendi, começar',()=>m.root.remove(),'primary'));return m;
  }
  function showVisualizationEngine(){
    const isBlueprint=editorContextKind()==='blueprint';
    const modes=isBlueprint?['service','blueprint']:['free','service','journey','blueprint','flow'];
    const definitions={
      service:{...viewDef('service'),label:'Vista operacional',description:'Etapas e cinco camadas: cliente, frontstage, backstage, processos e sistemas.'},
      blueprint:{...viewDef('blueprint'),label:'Matriz detalhada',description:'Camadas, contexto e relações para aprofundar o mapeamento do serviço.'}
    };
    const m=modalShell(isBlueprint?'Vistas do Blueprint':'Visualizações do serviço','Escolha como enxergar o mesmo serviço. Os dados e relações não são duplicados.');
    m.box.classList.add('rt154-views-modal');
    const stats=graphStats(),intro=document.createElement('div');intro.className='rt154-engine-summary';
    intro.innerHTML=`<div><b>${stats.entities}</b><span>Objetos do serviço</span></div><div><b>${stats.instances}</b><span>Representações</span></div><div><b>${modes.length}</b><span>Visualizações</span></div><p>Trocar de visualização altera a forma de organizar o serviço, não os dados.</p>`;
    m.box.appendChild(intro);
    const grid=document.createElement('div');grid.className='rt154-view-cards';m.box.appendChild(grid);
    modes.forEach(mode=>{
      const d=isBlueprint?definitions[mode]:viewDef(mode),st=viewLayoutStats(mode),card=document.createElement('article');
      card.className='rt154-view-card'+((pref().layoutMode||'free')===mode?' active':'');
      card.innerHTML=`<div class="rt154-view-icon">${d.icon}</div><div class="rt154-view-copy"><b>${esc(d.label)}</b><p>${esc(d.description)}</p><small>${st.saved?`${st.count} objetos com layout salvo`:'Layout ainda não salvo'}</small></div><div class="rt154-view-actions"></div>`;
      const actions=$('.rt154-view-actions',card);
      actions.append(btn((pref().layoutMode||'free')===mode?'Atual':'Abrir',()=>{m.root.remove();applyLayout(mode)},(pref().layoutMode||'free')===mode?'':'primary'),btn('Organizar automaticamente',()=>{m.root.remove();invalidateViewLayout(mode);applyLayout(mode,true)}));
      grid.appendChild(card);
    });
    const settings=document.createElement('div');settings.className='rt154-engine-settings';
    settings.innerHTML=isBlueprint?'<b>Duas vistas do mesmo Blueprint</b><span>Use a vista operacional para mapear as atividades e a matriz detalhada para aprofundar o contexto. Cada vista mantém seu próprio layout.</span>':'<b>Uma base, cinco leituras</b><span>Livre = explorar · Service Frame = estruturar frontstage/backstage · Jornada = experiência · Blueprint = operação formal · Relações = dependências.</span>';
    if(!isBlueprint&&(pref().layoutMode||'free')==='flow'){
      const label=document.createElement('label');label.innerHTML='<span>Direção do Fluxo</span>';const select=document.createElement('select');
      [['horizontal','Horizontal'],['vertical','Vertical']].forEach(([value,text])=>{const option=new Option(text,value);option.selected=(viewEnginePref().flowDirection||'horizontal')===value;select.appendChild(option)});
      select.onchange=()=>{viewEnginePref().flowDirection=select.value;invalidateViewLayout('flow');save(false);applyLayout('flow',true)};label.appendChild(select);settings.appendChild(label);
    }
    m.box.appendChild(settings);
  }
  function showRecoveryNotice(){
    if(!overlay)return;const msg=persistence.recovered?persistence.recoveryReason:'A sessão anterior não foi encerrada normalmente. O estado atual foi validado e existe uma cópia durável para recuperação.';const n=document.createElement('div');n.className='rt155-recovery-notice';n.innerHTML=`<div><b>${persistence.recovered?'Estado recuperado automaticamente':'Sessão anterior interrompida'}</b><span>${esc(msg)}</span></div><button>Ver recuperação</button><i>×</i>`;overlay.appendChild(n);n.querySelector('button').onclick=()=>{n.remove();showRecoveryCenter()};n.querySelector('i').onclick=()=>n.remove();setTimeout(()=>n.isConnected&&n.classList.add('show'),30)
  }
  async function showRecoveryCenter(){
    if(!overlay)return;const m=modalShell('Centro de Recuperação','Autosave, cópias duráveis e checkpoints locais deste projeto.');m.box.classList.add('rt155-recovery-modal');const status=document.createElement('div');status.className='rt155-recovery-status';status.innerHTML='<div class="loading">Validando armazenamento…</div>';m.box.appendChild(status);const actions=document.createElement('div');actions.className='rt155-recovery-actions';actions.append(btn('Criar checkpoint agora',async()=>{await createCheckpoint('Checkpoint manual');await draw()},'primary'),btn('Validar armazenamento',async()=>{await draw()}));m.box.appendChild(actions);const list=document.createElement('div');list.className='rt155-snapshots';m.box.appendChild(list);
    async function draw(){const v=await validatePersistence(),snaps=await recoverySnapshots(),last=persistence.lastDurableAt?new Date(persistence.lastDurableAt).toLocaleString('pt-BR'):'—';status.innerHTML=`<div class="${v.localOk?'ok':'bad'}"><b>${v.localOk?'✓':'!'}</b><span><strong>Autosave atual</strong><small>${v.localOk?'Estrutura íntegra · revisão '+v.revision:'Estado local inconsistente'}</small></span></div><div class="${v.durableOk?'ok':'warn'}"><b>${v.durableOk?'✓':'○'}</b><span><strong>Cópia durável</strong><small>${v.durableOk?'Protegida no IndexedDB · revisão '+v.durableRevision:'Ainda não disponível'}</small></span></div><div class="${persistence.uncleanSession?'warn':'ok'}"><b>${persistence.uncleanSession?'!':'✓'}</b><span><strong>Sessão</strong><small>${persistence.uncleanSession?'Foi detectado um encerramento inesperado anteriormente.':'Sessão atual monitorada normalmente.'}</small></span></div><div><b>◷</b><span><strong>Última proteção</strong><small>${esc(last)}</small></span></div>`;list.innerHTML='<div class="rt155-snapshots-head"><b>Checkpoints</b><span>Até '+esc(meta.reliability?.snapshotLimit||12)+' cópias rotativas</span></div>';if(!snaps.length){list.innerHTML+='<div class="rt155-empty">Nenhum checkpoint ainda.</div>';return}snaps.forEach(rec=>{const row=document.createElement('div');row.className='rt155-snapshot';const when=new Date(rec.savedAt).toLocaleString('pt-BR'),kb=Math.max(1,Math.round((rec.sizeBytes||0)/1024));row.innerHTML=`<div><b>${esc(rec.label||'Checkpoint')}</b><span>${esc(when)} · revisão ${esc(rec.revision||0)} · ${kb} KB</span></div><button>Restaurar</button>`;row.querySelector('button').onclick=async()=>{if(await restoreRecoveryRecord(rec)){m.root.remove()}};list.appendChild(row)})}await draw()
  }


  function coreAudit(){
    const tests=[],b=board(),items=Object.values(b?.items||{}),edges=Object.values(b?.edges||{}),ids=new Set(items.map(x=>x.id)),instanceIds=new Set();
    const add=(id,label,status,detail,group='Core')=>tests.push({id,label,status,detail,group});
    add('service-root','Service Graph / Serviço',graph?.schemaVersion>=2&&!!graph?.service?.id?'pass':'error',graph?.service?.id?`Schema ${graph.schemaVersion} · ${graph.service.name||graph.service.id}`:'Serviço raiz ausente','Dados');
    add('boards','Quadros',b&&graph?.views?.whiteboards?.[boardId]?'pass':'error',b?`${Object.keys(graph.views.whiteboards||{}).length} quadro(s) · atual: ${b.name}`:'Quadro ativo ausente','Dados');
    let duplicateInstances=0;for(const it of items){if(!it.instanceId)continue;if(instanceIds.has(it.instanceId))duplicateInstances++;instanceIds.add(it.instanceId)}
    add('instances','Entidade × Instância',duplicateInstances===0?'pass':'error',duplicateInstances?`${duplicateInstances} instanceId duplicado(s)`:`${items.length} instância(s) · IDs únicos`,'Smart Objects');
    const missing=items.filter(it=>it.kind==='smart'&&!entityRecord(it.objectKind,it.objectId));
    add('entity-refs','Referências do Service Graph',missing.length?'warn':'pass',missing.length?`${missing.length} Smart Object(s) com referência ausente`:'Todas as referências Smart resolvidas','Smart Objects');
    const invalidEdges=edges.filter(ed=>!ids.has(ed.fromId)||!ids.has(ed.toId));
    add('edges','Conexões',invalidEdges.length?'error':'pass',invalidEdges.length?`${invalidEdges.length} conexão(ões) com endpoint ausente`:`${edges.length} conexão(ões) estruturalmente válidas`,'Interação');
    const parents=frameParents(),badParents=Object.entries(parents).filter(([id,p])=>!ids.has(id)||!ids.has(p)||!isContainer(b?.items?.[p])||id===p);
    let cycles=0;for(const id of Object.keys(parents)){const seen=new Set([id]);let p=parents[id];while(p){if(seen.has(p)){cycles++;break}seen.add(p);p=parents[p]}}
    add('containers','Containers e hierarquia',badParents.length||cycles?'error':'pass',badParents.length||cycles?`${badParents.length} vínculo(s) inválido(s) · ${cycles} ciclo(s)`:`${items.filter(isContainer).length} container(s) · hierarquia íntegra`,'Estrutura');
    const modes=['free','flow','journey','blueprint'],layouts=viewLayouts()||{},layoutCount=modes.filter(x=>layouts[x]?.items).length;
    add('views','Visualizações',meta.visualizationEngineVersion>=1&&meta.structuredViewsVersion>=1?'pass':'error',`${layoutCount}/4 layout(s) materializado(s) · engine ${meta.visualizationEngineVersion||0}`,'Views');
    const st=structuredState(),journeyOk=!!st&&st.schemaVersion>=2&&meta.journeyPrimitivesVersion>=1;
    add('journey','Jornada estruturada',journeyOk?'pass':'error',journeyOk?`${journeyLanes.length} lanes · Journey Studio ${JOURNEY_STUDIO_VERSION} · Persona/Canal/Emoção/Métricas ativos`:'Primitives da Jornada incompletas','Views');
    add('blueprint','Blueprint estruturado',blueprintLanes.length===6&&meta.blueprintStudioVersion>=1?'pass':'error',`${blueprintLanes.length} camadas operacionais · Blueprint Studio ${BLUEPRINT_STUDIO_VERSION} · Etapas × Camadas`,'Views');
    const gr=Number(graph?.persistenceRevision||0),mr=Number(meta?.persistenceRevision||0);
    add('persistence','Persistência revisionada',gr>0&&mr>0&&gr===mr?'pass':'error',gr===mr?`Revisão ${gr} sincronizada`:`Graph ${gr} × meta ${mr}`,'Confiabilidade');
    add('recovery','Recovery / checkpoints',persistence.durableState==='protected'?'pass':persistence.durableState==='pending'||persistence.durableState==='local'?'warn':'error',persistence.durableState==='protected'?'Cópia durável protegida':`Estado durável: ${persistence.durableState}`,'Confiabilidade');
    add('io','Import / Export',meta.importExportVersion>=1?'pass':'error',meta.importExportVersion>=1?'Backup, JSON, CSV, SVG, PNG e PDF habilitados':'Engine de import/export ausente','Portabilidade');
    add('performance','Performance',meta.performanceUxVersion>=1?'pass':'error',`Culling ativo acima de ${perf.cullThreshold} objetos · ${perf.totalItems||items.length} no modelo`,'Performance');
    add('runtime','Runtime',perf.runtimeErrors===0?'pass':'warn',perf.runtimeErrors?`${perf.runtimeErrors} erro(s) nesta sessão · ${perf.lastError||'sem detalhe'}`:'Nenhum erro JavaScript registrado nesta sessão','Qualidade');
    const errors=tests.filter(t=>t.status==='error').length,warnings=tests.filter(t=>t.status==='warn').length,passed=tests.filter(t=>t.status==='pass').length;
    return{version:WHITEBOARD_CORE_VERSION,auditVersion:CORE_AUDIT_VERSION,at:new Date().toISOString(),boardId,passed,warnings,errors,total:tests.length,tests,stats:{items:items.length,edges:edges.length,entities:allEntities().length,boards:Object.keys(graph?.views?.whiteboards||{}).length,renderedItems:perf.renderedItems,avgRenderMs:Number(perf.avgRenderMs.toFixed(2))}}
  }
  async function repairCoreIntegrity(){
    if(!await confirmDialog('Reparo estrutural seguro','Um checkpoint será criado antes. O conteúdo semântico não será apagado; apenas referências impossíveis e estruturas inválidas serão normalizadas.','Executar reparo',true))return;
    await createCheckpoint('Antes do reparo Core 1.0');const b=board();
    Object.keys(b.edges||{}).forEach(id=>{const ed=b.edges[id];if(!b.items?.[ed.fromId]||!b.items?.[ed.toId])delete b.edges[id]});
    const seenInstances=new Set();Object.values(b.items||{}).forEach(it=>{if(!it.instanceId||seenInstances.has(it.instanceId))it.instanceId=uid('instance');seenInstances.add(it.instanceId)});
    normalizeContainers();normalizeLayers();normalizeEdges();normalizeVisualItems();normalizeInstances();ensureViewLayoutStore();structuredState();ensureJourneyPrimitives();runPersistenceMigrations();
    meta.whiteboardCoreVersion=WHITEBOARD_CORE_VERSION;meta.coreAuditVersion=CORE_AUDIT_VERSION;meta.coreBaseline='stable';save(false,{checkpoint:true,label:'Reparo Core 1.0'});resetEditHistory('Reparo Core 1.0');renderAll();toast('Integridade estrutural revisada.');showCoreStatus();
  }
  function exportCoreDiagnostic(){const audit=coreAudit(),payload={format:'realtalent.whiteboard-core-diagnostic',appVersion:APP_VERSION,coreVersion:WHITEBOARD_CORE_VERSION,exportedAt:new Date().toISOString(),audit,service:{id:graph.service?.id,name:graph.service?.name},activeBoard:{id:boardId,name:board()?.name},persistence:{revision:persistence.revision,durableState:persistence.durableState,lastDurableAt:persistence.lastDurableAt},capabilities:{interaction:true,connections:true,containers:true,navigation:true,visualObjects:true,editing:true,templates:true,smartLayout:true,serviceGraph:true,visualizations:true,persistence:true,structuredViews:true,journeyPrimitives:true,importExport:true,performance:true}};downloadText(JSON.stringify(payload,null,2),`Blue-Ocean-Whiteboard-Core-${WHITEBOARD_CORE_VERSION}-diagnostico.json`);toast('Diagnóstico Core exportado.')}
  async function showCoreStatus(){
    if(!overlay)return;const audit=coreAudit();meta.coreLastAudit={at:audit.at,errors:audit.errors,warnings:audit.warnings,passed:audit.passed,total:audit.total};try{localStorage.setItem(META_KEY,JSON.stringify(meta,null,2))}catch{}
    const m=modalShell(`Whiteboard Core ${WHITEBOARD_CORE_VERSION}`,'Baseline estável do motor visual do BLUE OCEAN Service Studio.');m.box.classList.add('rt160-core-modal');
    const hero=document.createElement('div');hero.className='rt160-core-hero '+(audit.errors?'bad':audit.warnings?'warn':'ok');hero.innerHTML=`<div><span class="rt160-core-mark">${audit.errors?'!':audit.warnings?'△':'✓'}</span><div><b>${audit.errors?'Requer correção':audit.warnings?'Core operacional com avisos':'Core íntegro'}</b><small>${audit.passed}/${audit.total} contratos aprovados · ${audit.warnings} aviso(s) · ${audit.errors} erro(s)</small></div></div><em>V${esc(APP_VERSION)} · Core ${esc(WHITEBOARD_CORE_VERSION)}</em>`;m.box.appendChild(hero);
    const stats=document.createElement('div');stats.className='rt160-core-stats';[['Entidades',audit.stats.entities],['Instâncias',audit.stats.items],['Conexões',audit.stats.edges],['Quadros',audit.stats.boards]].forEach(([l,v])=>{const d=document.createElement('div');d.innerHTML=`<b>${esc(v)}</b><span>${esc(l)}</span>`;stats.appendChild(d)});m.box.appendChild(stats);
    const groups=[...new Set(audit.tests.map(t=>t.group))];const list=document.createElement('div');list.className='rt160-contracts';m.box.appendChild(list);groups.forEach(g=>{const sec=document.createElement('section');sec.innerHTML=`<h4>${esc(g)}</h4>`;audit.tests.filter(t=>t.group===g).forEach(t=>{const r=document.createElement('div');r.className='rt160-contract '+t.status;r.innerHTML=`<i>${t.status==='pass'?'✓':t.status==='warn'?'△':'!'}</i><span><b>${esc(t.label)}</b><small>${esc(t.detail)}</small></span>`;sec.appendChild(r)});list.appendChild(sec)});
    const foot=document.createElement('div');foot.className='rt160-core-actions';foot.append(btn('Exportar diagnóstico',exportCoreDiagnostic),btn('Criar checkpoint',()=>createCheckpoint('Checkpoint Core 1.0')));if(audit.errors||audit.warnings)foot.append(btn('Reparo seguro',()=>{m.root.remove();repairCoreIntegrity()},'primary'));else foot.append(btn('Revalidar',()=>{m.root.remove();showCoreStatus()},'primary'));m.box.appendChild(foot);
  }

  function renderBoardMenu(){
    const m=document.createElement('div');m.className='rt144-boardmenu rt181-boardmenu';
    const groups=[
      [['Desfazer',()=>{showBoardMenu=false;undoEdit()}],['Refazer',()=>{showBoardMenu=false;redoEdit()}],['Comandos',()=>{showBoardMenu=false;openCommandPalette()}]],
      [['Journey Studio',()=>{showBoardMenu=false;showJourneyStudio()}],['Configuração avançada do Blueprint',()=>{showBoardMenu=false;showBlueprintStudio()}],['Templates',()=>{showBoardMenu=false;showTemplates()}],['Smart Layout',()=>{showBoardMenu=false;openSmartLayout()}],['Service Graph',()=>{showBoardMenu=false;showGraphBrowser()}]],
      [['Histórico e recuperação',()=>{showBoardMenu=false;showRecoveryCenter()}],['Criar checkpoint',()=>{showBoardMenu=false;createCheckpoint('Checkpoint manual')}],['Importar / Exportar',()=>{showBoardMenu=false;showImportExportCenter()}],['Status Whiteboard Core 1.0',()=>{showBoardMenu=false;showCoreStatus()}]],
      [['Configurações do canvas',()=>{showBlueprintDocument=false;inspectorMode='board';showInspector=true;showBoardMenu=false;renderAll()}],['Duplicar quadro',()=>{showBoardMenu=false;duplicateBoard()}],['Excluir quadro',()=>{showBoardMenu=false;deleteBoard()}]]
    ];
    groups.forEach((g,gi)=>{if(gi){const sep=document.createElement('div');sep.className='rt181-menu-sep';m.appendChild(sep)}g.forEach(([l,fn])=>m.appendChild(btn(l,fn,l==='Excluir quadro'?'danger':'')))});overlay.appendChild(m);
  }
  function toolbarIcon(name){const paths={Selecionar:'M4 3l13 7-6 2-3 6z',Mão:'M7 10V5a1 1 0 012 0v4V3a1 1 0 012 0v6V4a1 1 0 012 0v6V6a1 1 0 012 0v7c0 4-2 6-5 6s-4-2-6-5l-2-3a1 1 0 012-1z',Adicionar:'M10 3v14M3 10h14',Texto:'M3 4h14M10 4v13M7 17h6', 'Post-it':'M3 3h14v10l-4 4H3zM13 13h4M13 13v4',Card:'M3 4h14v12H3zM6 7h8M6 10h5',Conexão:'M3 16L16 3M8 3h8v8',Frame:'M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4',Buscar:'M13 13l4 4M14 8a6 6 0 11-12 0 6 6 0 0112 0',Camadas:'M10 2l8 4-8 4-8-4zM2 10l8 4 8-4M2 14l8 4 8-4'};return `<svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]||paths.Adicionar}"/></svg>`}

  function renderToolbar(parent){
    const bar=document.createElement('aside');bar.className='rt144-tools rt181-tools rt190-tools bo1174-toolrail';bar.setAttribute('aria-label','Ferramentas do quadro');
    const dock=editorContextKind()==='blueprint'&&blueprintLearningState().mode==='guided'?$('.bo1174-statusbar',parent):null;
    if(dock)dock.prepend(bar);else parent.appendChild(bar);
    let defs=[
      {label:'Selecionar',shortcut:'V',group:'navigate',run:()=>{tool='select';connectFrom=null;renderAll()}},
      {label:'Mão',shortcut:'H',group:'navigate',run:()=>{tool='hand';connectFrom=null;renderAll()}},
      {label:'Adicionar',shortcut:'',group:'create',run:()=>{const next=!showLibrary;closeEditorSidePanels(next?'library':'');showLibrary=next;renderAll()}},
      {label:'Texto',shortcut:'T',group:'create',run:()=>addFree('text','text','Texto','slate')},
      {label:'Post-it',shortcut:'S',group:'create',run:()=>addFree('note','note','Novo post-it','yellow')},
      {label:'Conexão',shortcut:'C',group:'create',run:()=>{tool=tool==='connect'?'select':'connect';connectFrom=null;renderAll()}},
      {label:'Frame',shortcut:'',group:'create',run:()=>addContainer('frame','Novo frame','slate')},
      {label:'Buscar',shortcut:'/',group:'manage',run:()=>{const next=!showOutline;closeEditorSidePanels(next?'outline':'');showOutline=next;renderAll();if(showOutline)setTimeout(()=>$('.rt148-outline-search',overlay)?.focus(),0)}},
      {label:'Camadas',shortcut:'',group:'manage',run:()=>{const next=!showLayers;closeEditorSidePanels(next?'layers':'');showLayers=next;renderAll()}}
    ];
    if(editorContextKind()==='blueprint'&&blueprintLearningState().mode==='guided')defs=defs.filter(entry=>['Selecionar','Mão'].includes(entry.label));
    if(mobileReadOnly())defs=defs.filter(entry=>['Selecionar','Mão','Buscar'].includes(entry.label));
    let lastGroup='';
    defs.forEach(entry=>{
      if(lastGroup&&lastGroup!==entry.group){const sep=document.createElement('div');sep.className='rt144-sep';sep.setAttribute('aria-hidden','true');bar.appendChild(sep)}lastGroup=entry.group;
      const tt=entry.label,active=(tt==='Selecionar'&&tool==='select')||(tt==='Mão'&&tool==='hand')||(tt==='Conexão'&&tool==='connect')||(tt==='Adicionar'&&showLibrary)||(tt==='Camadas'&&showLayers)||(tt==='Buscar'&&showOutline);
      const b=document.createElement('button');b.className='rt144-tool'+(active?' active':'');b.innerHTML=`<span>${toolbarIcon(tt)}</span><em><span>${tt}</span>${entry.shortcut?`<kbd>${entry.shortcut}</kbd>`:''}</em>`;b.title=tt+(entry.shortcut?` · ${entry.shortcut}`:'');b.setAttribute('aria-label',tt);b.setAttribute('aria-pressed',String(active));if(entry.shortcut)b.setAttribute('aria-keyshortcuts',entry.shortcut==='/'?'/':entry.shortcut.toLowerCase());b.onclick=entry.run;bar.appendChild(b)
    });
  }
  function renderLibrary(parent){
    const lib=document.createElement('aside');lib.className='rt144-library rt1410-library'+(libraryWide?' wide':'');parent.appendChild(lib);
    lib.innerHTML='<div class="rt144-panelhead"><div><b>Adicionar ao quadro</b><small>Escolha uma categoria ou pesquise.</small></div><div class="rt1410-panelactions"><button class="rt1410-expand" title="Alternar largura">⇔</button><button class="rt144-x">×</button></div></div>';
    $('.rt144-x',lib).onclick=()=>{showLibrary=false;renderAll()};$('.rt1410-expand',lib).onclick=()=>{libraryWide=!libraryWide;renderAll()};
    const c=document.createElement('div');c.className='rt144-libbody';lib.appendChild(c);
    const search=document.createElement('input');search.className='rt144-search';search.placeholder='Buscar objeto…';search.value=libraryQuery;search.oninput=()=>{libraryQuery=search.value.toLowerCase();renderLibraryBody(c)};c.appendChild(search);renderLibraryBody(c);
  }
  function renderLayers(parent){
    const panel=document.createElement('aside');panel.className='rt144-library rt145-layers';parent.appendChild(panel);
    panel.innerHTML='<div class="rt144-panelhead"><div><b>Camadas</b><small>Hierarquia, ordem, visibilidade e bloqueio.</small></div><button class="rt144-x">×</button></div>';
    $('.rt144-x',panel).onclick=()=>{showLayers=false;renderAll()};
    const body=document.createElement('div');body.className='rt145-layerbody';panel.appendChild(body);
    const all=Object.values(board().items),byId=board().items;if(!all.length){const empty=document.createElement('div');empty.className='rt145-layerempty';empty.textContent='O quadro ainda não possui objetos.';body.appendChild(empty);return}
    const roots=all.filter(it=>!parentFrame(it.id)||!byId[parentFrame(it.id)]).sort((a,b)=>itemZ(b)-itemZ(a));
    const rowFor=(it,depth=0)=>{const c=content(it),row=document.createElement('div');row.className='rt145-layerrow'+(selected.includes(it.id)?' selected':'')+(isHidden(it)?' hidden':'')+(isStructurallyHidden(it)?' structurally-hidden':'');row.style.setProperty('--depth',depth);
      const main=document.createElement('button');main.className='rt145-layermain';const hasKids=isContainer(it)&&childrenOf(it.id).length;main.innerHTML=`<span class="rt147-indent"></span>${isContainer(it)?`<span class="rt147-tree">${hasKids?(isCollapsed(it)?'▸':'▾'):'·'}</span>`:''}<i style="background:${tone[itemTone(it)]}"></i><span><b>${esc(c.title)}</b><small>${esc(isContainer(it)?containerLabel(it):(it.kind==='smart'?smartLabel(it.objectKind):freeLabel(it.semantic||'note')))}</small></span>`;main.onclick=()=>{selected=[it.id];selectedEdge=null;showInspector=true;inspectorMode='selection';renderAll()};row.appendChild(main);
      const acts=document.createElement('div');acts.className='rt145-layeracts';
      if(isContainer(it)&&hasKids){const col=btn(isCollapsed(it)?'▸':'▾',()=>toggleContainerCollapse(it.id),'icon');col.title=isCollapsed(it)?'Expandir':'Recolher';acts.appendChild(col)}
      const eye=btn(isHidden(it)?'○':'●',()=>setVisibility(it.id,isHidden(it)),'icon');eye.title=isHidden(it)?'Mostrar':'Ocultar';
      const lock=btn(isLocked(it)?'🔒':'🔓',()=>setLocked(it.id,!isLocked(it)),'icon');lock.title=isLocked(it)?'Desbloquear':'Bloquear';
      const up=btn('↑',()=>arrange(it.id,'forward'),'icon');up.title='Trazer para frente';
      const down=btn('↓',()=>arrange(it.id,'backward'),'icon');down.title='Enviar para trás';acts.append(eye,lock,up,down);row.appendChild(acts);body.appendChild(row);
      if(isContainer(it)&&!isCollapsed(it))childrenOf(it.id).map(id=>byId[id]).filter(Boolean).sort((a,b)=>itemZ(b)-itemZ(a)).forEach(ch=>rowFor(ch,depth+1));
    };roots.forEach(it=>rowFor(it,0));
  }

  function renderLibraryBody(c){
    [...c.children].slice(1).forEach(x=>x.remove());
    const q=libraryQuery.trim(),cats=['Contexto','Serviço','Experiência','Operação','Análise','Conteúdo','Formas','Estrutura'];
    if(!q&&!libraryWide){const nav=document.createElement('div');nav.className='rt1410-libcats';cats.forEach(name=>{const b=btn(name,()=>{libraryCategory=name;renderLibraryBody(c)},name===libraryCategory?'active':'');nav.appendChild(b)});c.appendChild(nav)}
    const category=(title,items)=>{if(!q&&!libraryWide&&title!==libraryCategory)return;const filtered=items.filter(x=>!q||(`${x[0]} ${x[1]||''}`).toLowerCase().includes(q));if(!filtered.length)return;sectionTitle(c,title);const grid=document.createElement('div');grid.className='rt144-libgrid';c.appendChild(grid);filtered.forEach(x=>grid.appendChild(libBtn(x[0],x[2],x[3]||'slate')))};
    category('Contexto',[
      ['Persona','persona',()=>showGraphPicker('persona'),'blue'],['Necessidade','need',()=>showGraphPicker('need'),'blue'],['Job','job',()=>showGraphPicker('job'),'blue'],['Dor','pain',()=>showGraphPicker('pain'),'rose'],['Hipótese','problemHypothesis',()=>showGraphPicker('problemHypothesis'),'amber'],['Problema validado','problem',()=>showValidatedProblemPicker(),'rose'],['Evidência','evidence',()=>showGraphPicker('evidence'),'emerald']
    ]);
    category('Serviço',[
      ['Etapa','stage',()=>showGraphPicker('stage')],['Ponto de contato','touchpoint',()=>showGraphPicker('touchpoint')]
    ].map(([a,b,fn])=>[a,b,fn,b==='stage'?'blue':'violet']));
    category('Experiência',[
      ['Expectativa','expectation',()=>showGraphPicker('expectation'),'slate'],['Emoção','emotion',()=>showGraphPicker('emotion'),'rose'],['Canal','channel',()=>showGraphPicker('channel'),'violet'],['Métrica','metric',()=>showGraphPicker('metric'),'amber']
    ]);
    category('Operação',[
      ['Ação visível','frontstage',()=>showGraphPicker('frontstage'),'emerald'],['Ação de bastidor','backstage',()=>showGraphPicker('backstage'),'amber'],['Processo','process',()=>showGraphPicker('process'),'blue'],['Sistema','system',()=>showGraphPicker('system'),'violet'],['Pessoa','person',()=>showGraphPicker('person'),'amber']
    ]);
    category('Análise',[
      ['Oportunidade','opportunity',()=>showGraphPicker('opportunity'),'emerald'],['Insight','insight',()=>showGraphPicker('insight'),'yellow']
    ]);
    category('Conteúdo',[
      ['Post-it','note',()=>addFree('note','note','Novo post-it','yellow'),'yellow'],['Texto','text',()=>addFree('text','text','Texto','slate'),'slate'],['Card','card',()=>addFree('card','card','Novo card','blue'),'blue'],['Imagem','image',()=>pickImage(),'emerald'],['Link','link',()=>promptLink(),'violet'],['Objeto vinculado','linked',()=>showLinkedObjectPicker(),'violet'],['Arquivo','file',()=>pickFile(),'slate'],['Ícone','icon',()=>showIconPicker(),'amber']
    ]);
    category('Formas',[
      ['Retângulo','shape',()=>addShape('rectangle'),'slate'],['Arredondado','shape',()=>addShape('rounded'),'blue'],['Círculo','shape',()=>addShape('circle'),'emerald'],['Losango','shape',()=>addShape('diamond'),'violet']
    ]);
    category('Estrutura',[
      ['Service Frame','service',()=>applyLayout('service',true),'blue'],['Frame','frame',()=>addContainer('frame','Novo frame','slate'),'slate'],['Section','section',()=>addContainer('section','Nova section','blue'),'blue'],['Swimlane','swimlane',()=>addContainer('swimlane','Nova swimlane','violet'),'violet']
    ]);
    if(libraryWide||q||libraryCategory==='Contexto'||libraryCategory==='Serviço'){sectionTitle(c,'Estrutura do serviço');c.appendChild(btn('Explorar relações do serviço',showGraphBrowser,'primary wide'));c.appendChild(btn('Trazer Jornada…',showJourneyImport,'wide'))}
  }
  let usageCache={revision:-1,counts:{}};function graphUsage(kind,id){const rev=graph.persistenceRevision||0;if(usageCache.revision!==rev){const counts={};for(const b of Object.values(graph.views.whiteboards||{}))for(const i of Object.values(b.items||{}))if(i.kind==='smart'){const k=i.objectKind+':'+i.objectId;counts[k]=(counts[k]||0)+1}usageCache={revision:rev,counts}}return usageCache.counts[kind+':'+id]||0}
  async function createGraphEntity(kind){
    const label=smartLabel(kind),title=await promptDialog(`Criar ${label}`,'Nome','',`Ex.: ${label}`);if(!title)return null;return createGraphEntityWithTitle(kind,title,'')
  }
  function normalizeEntityName(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
  function entityPickerCopy(kind){
    const map={
      stage:{title:'Etapa',question:'Qual é o próximo momento relevante da experiência?',placeholder:'Ex.: Agendar coleta',hint:'Uma etapa representa uma mudança de objetivo, contexto ou momento para o cliente.',reuse:'Reutilize uma etapa que você já mapeou neste serviço.'},
      touchpoint:{title:'Ponto de contato',question:'Onde o cliente interage com o serviço?',placeholder:'Ex.: WhatsApp',hint:'Pense no canal ou lugar percebido pelo cliente, não na atividade interna.',reuse:'Reutilize um ponto de contato já conhecido ou crie um novo.'},
      persona:{title:'Persona',question:'Quem vive esta experiência?',placeholder:'Ex.: Profissional com pouco tempo',hint:'Use um grupo ou perfil relevante para esta jornada.',reuse:'Reutilize uma Persona existente ou crie uma nova.'},
      customerAction:{title:'Ação do cliente',question:'O que o cliente faz ou tenta alcançar?',placeholder:'Ex.: Escolhe um horário',hint:'Descreva a ação em linguagem simples e observável.',reuse:'Reutilize uma ação já mapeada se ela realmente representar o mesmo comportamento.'},
      frontstage:{title:'Ação visível',question:'O que a equipe faz diante do cliente?',placeholder:'Ex.: Confirma o horário',hint:'É aquilo que o cliente consegue perceber.',reuse:'Reutilize somente quando a mesma ação realmente acontece em outro ponto.'},
      backstage:{title:'Ação de bastidor',question:'O que precisa acontecer internamente?',placeholder:'Ex.: Reservar janela de coleta',hint:'É o trabalho invisível que sustenta a entrega.',reuse:'Reutilize somente quando o mesmo bastidor é compartilhado.'},
      process:{title:'Processo',question:'Qual processo sustenta este momento?',placeholder:'Ex.: Planejamento de coleta',hint:'Descreva o fluxo operacional que organiza o trabalho.',reuse:'Reutilize processos existentes quando forem realmente compartilhados.'},
      system:{title:'Sistema',question:'Qual ferramenta ou tecnologia dá suporte?',placeholder:'Ex.: Agenda / CRM',hint:'Pode ser um sistema, aplicativo, planilha ou integração.',reuse:'Reutilize sistemas existentes para manter o mapa consistente.'},
      evidence:{title:'Evidência',question:'O que prova que este desenho representa a realidade?',placeholder:'Ex.: Reclamações sobre atraso',hint:'Pode ser dado, entrevista, observação, métrica ou documento.',reuse:'Reutilize evidências somente quando sustentarem o mesmo ponto.'},
      problem:{title:'Problema',question:'Qual fricção ou dificuldade acontece aqui?',placeholder:'Ex.: Cliente não sabe quando a coleta chegará',hint:'Descreva o problema observável, não a solução.',reuse:'Reutilize um problema existente se for a mesma fricção.'},
      opportunity:{title:'Oportunidade',question:'O que podemos melhorar?',placeholder:'Ex.: Confirmar janela automaticamente',hint:'Conecte a oportunidade ao problema que ela pretende resolver.',reuse:'Reutilize uma oportunidade quando o objetivo for o mesmo.'},
      metric:{title:'Métrica',question:'Como saber se este momento está funcionando?',placeholder:'Ex.: Tempo médio até confirmação',hint:'Prefira uma medida que possa ter valor atual, meta e responsável.',reuse:'Reutilize métricas quando a definição for exatamente a mesma.'}
    };return map[kind]||{title:smartLabel(kind),question:`Como você quer chamar este ${smartLabel(kind).toLowerCase()}?`,placeholder:`Ex.: ${smartLabel(kind)}`,hint:'Crie um objeto claro e reutilizável.',reuse:'Reutilize um objeto existente quando ele representar exatamente a mesma coisa.'}
  }
  function entityPickerGroup(kind,rec){
    if(rec?.archived)return 'Arquivados';
    const ast=serviceBuilderAssistantState(),session=ast?.session,sessionIds=session?.entityIds?.[kind]||[];
    if(session?.id&&sessionIds.includes(rec.id))return 'Desta construção';
    const usages=entityInstances(kind,rec.id);if(usages.some(u=>u.boardId===boardId))return 'Neste quadro';
    return 'Deste serviço'
  }
  function entityPickerContext(kind,rec){
    const uses=entityInstances(kind,rec.id),boards=new Set(uses.map(u=>u.boardId)).size,bits=[];
    if(kind==='stage'){const j=graph.journeys?.[rec.journeyId];if(j?.name)bits.push(j.name)}
    if(rec.stageId&&graph.stages?.[rec.stageId])bits.push(graph.stages[rec.stageId].title);
    if(kind==='touchpoint'&&(rec.channel||rec.channelId))bits.push(rec.channelId?channelTitle(rec.channelId):rec.channel);
    if(boards)bits.push(`${boards} quadro${boards>1?'s':''}`);else bits.push('ainda não usado em quadros');
    return bits.join(' · ')
  }
  function entityPickerStatus(kind,rec){const group=entityPickerGroup(kind,rec);return group==='Desta construção'?'●':group==='Neste quadro'?'✓':group==='Arquivados'?'◌':'○'}
  function addOrFocusEntityInstance(kind,id,repairItem=null){
    if(repairItem){repairItem.objectId=id;repairItem.entityRef={type:kind,id};repairItem.entityStatus='linked';save();return true}
    const here=entityInstances(kind,id).find(u=>u.boardId===boardId);if(here){focusItem(here.itemId,{fitItem:true,record:true});toast('Este objeto já está neste quadro.');return true}
    const itemId=addSmart(kind,id);if(itemId){const ast=serviceBuilderAssistantState();if(ast?.active&&ast.session?.id&&ast.session.entityIds?.[kind]?.includes(id)){assistantRememberItem(itemId);assistantArrangeVisualBoard()}setTimeout(()=>focusItem(itemId,{fitItem:false,record:false}),20)}return !!itemId
  }
  function showValidatedProblemPicker(){
    const rows=Object.values(graph.entities?.problem||{}),m=modalShell('Adicionar problema validado','Reutilize um problema validado na Context Library. Novos problemas começam como hipótese e não são validados diretamente pelo Whiteboard.');m.box.classList.add('bo1193-entity-picker');
    const intro=document.createElement('div');intro.className='bo1193-picker-reuse-intro';intro.innerHTML='<div><small>CONTEXT LIBRARY</small><b>Problemas validados</b><span>Uma entidade, várias representações. Adicionar ao quadro não cria uma cópia.</span></div>';const search=document.createElement('input');search.className='rt144-search bo1193-picker-search';search.placeholder='Buscar problema validado…';intro.appendChild(search);m.box.appendChild(intro);
    const list=document.createElement('div');list.className='bo1193-picker-list';m.box.appendChild(list);
    const draw=()=>{list.innerHTML='';const q=normalizeEntityName(search.value),filtered=rows.filter(rec=>!q||normalizeEntityName(entityTitle('problem',rec)+' '+entityDescription('problem',rec)).includes(q));filtered.forEach(rec=>{const here=entityInstances('problem',rec.id).find(u=>u.boardId===boardId),row=document.createElement('div');row.className='bo1193-picker-row'+(here?' already-here':'');row.innerHTML=`<i>${here?'✓':'○'}</i><span><b>${esc(entityTitle('problem',rec)||'Sem título')}</b><small>${esc(entityDescription('problem',rec)||'Problema validado')}</small></span><button type="button">${here?'Localizar':'Adicionar'}</button>`;row.querySelector('button').onclick=()=>{addOrFocusEntityInstance('problem',rec.id);m.root.remove()};list.appendChild(row)});if(!filtered.length)list.innerHTML='<div class="bo1193-picker-empty"><b>Nenhum problema validado</b><span>Valide uma hipótese na Context Library antes de trazê-la para o quadro.</span></div>'};search.oninput=draw;draw();setTimeout(()=>search.focus(),0)
  }
  function showGraphPicker(kind,repairItem=null){
    const copy=entityPickerCopy(kind),source=()=>Object.values(entityCollection(kind)||{}),title=`${repairItem?'Reconectar':'Adicionar'} ${copy.title}`;
    const subtitle=repairItem?'Escolha qual objeto esta representação deve usar.':`Crie um novo ${copy.title.toLowerCase()} ou reutilize algo que você já mapeou.`;
    const m=modalShell(title,subtitle);m.box.classList.add('bo1193-entity-picker');
    let mode=repairItem?'reuse':'create';
    const tabs=document.createElement('div');tabs.className='bo1193-picker-tabs';m.box.appendChild(tabs);
    const body=document.createElement('div');body.className='bo1193-picker-body';m.box.appendChild(body);
    const setMode=v=>{mode=v;drawTabs();draw()};
    const drawTabs=()=>{tabs.innerHTML='';if(!repairItem){const a=btn(`＋ Criar ${copy.title.toLowerCase()}`,()=>setMode('create'),mode==='create'?'active':'');const b=btn('Reutilizar existente',()=>setMode('reuse'),mode==='reuse'?'active':'');tabs.append(a,b)}else{const lab=document.createElement('div');lab.className='bo1193-picker-repair-label';lab.textContent='Escolha uma entidade existente';tabs.appendChild(lab)}};
    const drawCreate=()=>{
      const card=document.createElement('form');card.className='bo1193-picker-create';card.autocomplete='off';
      card.innerHTML=`<div class="bo1193-picker-guidance"><small>CRIAR NOVO</small><b>${esc(copy.question)}</b><span>${esc(copy.hint)}</span></div><label><span>${esc(copy.title)}</span><input name="title" autocomplete="off" maxlength="240" required placeholder="${esc(copy.placeholder)}"></label><div class="bo1193-duplicate-hint" hidden></div><div class="bo1193-picker-suggestions"></div><footer><button type="button" data-reuse>Ver existentes</button><button type="submit" class="primary">Criar e adicionar</button></footer>`;
      body.appendChild(card);const input=card.querySelector('input'),dup=card.querySelector('.bo1193-duplicate-hint'),suggest=card.querySelector('.bo1193-picker-suggestions');
      if(kind==='touchpoint'){['WhatsApp','Site','Aplicativo','Telefone','Loja física','Atendente','E-mail','Outro'].forEach(name=>{const b=btn(name,()=>{input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()},'bo1193-suggestion');suggest.appendChild(b)})}
      if(kind==='stage'){['Descobrir','Escolher','Agendar','Receber','Utilizar','Resolver','Encerrar'].forEach(name=>{const b=btn(name,()=>{input.value=name;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus()},'bo1193-suggestion');suggest.appendChild(b)})}
      if(!suggest.children.length)suggest.remove();
      let duplicate=null;const updateDuplicate=()=>{const key=normalizeEntityName(input.value),rows=source();duplicate=key?rows.find(x=>normalizeEntityName(entityTitle(kind,x))===key):null;if(duplicate){dup.hidden=false;dup.innerHTML=`<span><b>Já existe “${esc(entityTitle(kind,duplicate))}”.</b><small>Evite duplicar o mesmo objeto.</small></span><button type="button">Reutilizar</button>`;dup.querySelector('button').onclick=()=>{addOrFocusEntityInstance(kind,duplicate.id,repairItem);m.root.remove()}}else{dup.hidden=true;dup.innerHTML=''}};input.oninput=updateDuplicate;card.querySelector('[data-reuse]').onclick=()=>setMode('reuse');
      card.onsubmit=e=>{e.preventDefault();const value=input.value.trim();if(!value)return;if(duplicate){dup.querySelector('button')?.focus();return}const id=createGraphEntityWithTitle(kind,value,'');if(!id)return;addOrFocusEntityInstance(kind,id,repairItem);m.root.remove()};setTimeout(()=>input.focus(),0)
    };
    const drawReuse=()=>{
      const intro=document.createElement('div');intro.className='bo1193-picker-reuse-intro';intro.innerHTML=`<div><small>REUTILIZAR</small><b>${esc(copy.reuse)}</b></div>`;const search=document.createElement('input');search.className='rt144-search bo1193-picker-search';search.placeholder=`Buscar ${copy.title.toLowerCase()}…`;intro.appendChild(search);body.appendChild(intro);
      const list=document.createElement('div');list.className='bo1193-picker-list';body.appendChild(list);
      const renderList=()=>{list.innerHTML='';const q=normalizeEntityName(search.value),rows=source().filter(x=>!q||normalizeEntityName(entityTitle(kind,x)+' '+entityDescription(kind,x)).includes(q)),groups=['Desta construção','Neste quadro','Deste serviço','Arquivados'];let rendered=0;for(const group of groups){const candidates=rows.filter(x=>entityPickerGroup(kind,x)===group);if(!candidates.length)continue;const sec=document.createElement('section');sec.className='bo1193-picker-group';sec.innerHTML=`<header><span>${esc(group)}</span><em>${candidates.length}</em></header>`;for(const rec of candidates){const here=entityInstances(kind,rec.id).find(u=>u.boardId===boardId),row=document.createElement('div');row.className='bo1193-picker-row'+(here?' already-here':'');row.innerHTML=`<i>${entityPickerStatus(kind,rec)}</i><span><b>${esc(entityTitle(kind,rec)||'Sem título')}</b><small>${esc(entityPickerContext(kind,rec))}</small></span><button type="button">${here?'Localizar':repairItem?'Vincular':'Adicionar'}</button>`;row.querySelector('button').onclick=()=>{addOrFocusEntityInstance(kind,rec.id,repairItem);m.root.remove()};sec.appendChild(row);rendered++}list.appendChild(sec)}if(!rendered)list.innerHTML='<div class="bo1193-picker-empty"><b>Nada encontrado</b><span>Crie um novo objeto ou altere a busca.</span></div>'};search.oninput=renderList;renderList();setTimeout(()=>search.focus(),0)
    };
    const draw=()=>{body.innerHTML='';mode==='create'?drawCreate():drawReuse()};drawTabs();draw()
  }
  function showGraphBrowser(){
    const m=modalShell('Service Graph','Entidades do serviço. Adicione uma instância sem duplicar os dados.');m.box.classList.add('rt153-graph-modal','rt1551-graph-modal');const stats=graphStats(),head=document.createElement('div');head.className='rt153-graph-stats';head.innerHTML=`<div><b>${stats.entities}</b><span>Entidades</span></div><div><b>${stats.instances}</b><span>Instâncias</span></div><div><b>${stats.candidates}</b><span>Conversões possíveis</span></div><div class="${stats.missing?'warn':''}"><b>${stats.missing}</b><span>Referências ausentes</span></div>`;m.box.appendChild(head);
    const filters=document.createElement('div');filters.className='rt1551-graph-filters';m.box.appendChild(filters);const groups={Todos:SMART_ENTITY_KINDS,Contexto:['persona','need','job','pain','problemHypothesis','problem','evidence'],Serviço:['stage','touchpoint','customerAction'],Experiência:['expectation','channel','emotion','touchpoint','metric'],Operação:['frontstage','backstage','process','system','resource','person','role','channel','dependency','policy'],Análise:['insight','opportunity','task']};let active='Todos';Object.keys(groups).forEach(name=>{const b=btn(name,()=>{active=name;draw()},name===active?'active':'');b.dataset.graphFilter=name;filters.appendChild(b)});
    const search=document.createElement('input');search.className='rt144-search rt153-graph-search';search.placeholder='Buscar entidade, tipo ou descrição…';m.box.appendChild(search);const list=document.createElement('div');list.className='rt153-graph-list';m.box.appendChild(list);
    const draw=()=>{filters.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.graphFilter===active));list.innerHTML='';const q=search.value.trim().toLowerCase(),allowed=new Set(groups[active]),rows=allEntities().filter(e=>allowed.has(e.kind)&&(!q||(`${smartLabel(e.kind)} ${e.title} ${e.description}`).toLowerCase().includes(q)));SMART_ENTITY_KINDS.forEach(kind=>{if(!allowed.has(kind))return;const ks=rows.filter(x=>x.kind===kind);if(!ks.length)return;const sec=document.createElement('section');sec.className='rt153-graph-section';sec.innerHTML=`<h4>${esc(smartLabel(kind))}<span>${ks.length}</span></h4>`;ks.forEach(e=>{const row=document.createElement('div');row.className='rt153-graph-row';const boards=new Set(e.usage.map(u=>u.boardId)).size;row.innerHTML=`<div class="rt153-entity-dot" style="background:${tone[({stage:'blue',touchpoint:'violet',problem:'rose',job:'blue',pain:'rose',problemHypothesis:'amber',opportunity:'emerald',process:'blue',system:'violet',resource:'violet',role:'emerald',dependency:'amber',policy:'slate',person:'amber',insight:'yellow',evidence:'slate',customerAction:'blue',frontstage:'emerald',backstage:'amber',persona:'blue',channel:'violet',emotion:'rose',need:'blue',expectation:'slate',metric:'amber'})[kind]||'slate']}"></div><div class="rt153-entity-copy"><b>${esc(e.title||'Sem título')}</b><small>${esc(e.description||smartLabel(kind))}</small><em>${e.usage.length} instância(s) · ${boards} quadro(s)</em></div><div class="rt153-entity-actions"></div>`;const a=$('.rt153-entity-actions',row);a.append(btn('Adicionar',()=>{addSmart(kind,e.id);m.root.remove()},'small'));const here=e.usage.find(u=>u.boardId===boardId);if(here)a.append(btn('Localizar',()=>{m.root.remove();focusItem(here.itemId,{fitItem:true,record:true})},'small'));sec.appendChild(row)});list.appendChild(sec)});if(!rows.length)list.innerHTML='<div class="rt151-template-empty"><b>Nenhuma entidade encontrada</b><span>Altere o filtro ou crie uma entidade pela biblioteca.</span></div>'};search.oninput=draw;draw();setTimeout(()=>search.focus(),0)
  }
  function sectionTitle(p,t){const d=document.createElement('div');d.className='rt144-section';d.textContent=t;p.appendChild(d)}
  function libBtn(l,on,t){const b=document.createElement('button');b.className='rt144-libbtn';b.innerHTML=`<i style="background:${tone[t]}"></i><span>${esc(l)}</span>`;b.onclick=on;return b}
  function orderedStages(){const j=activeJourney();return (j?.stageIds||[]).map(id=>graph.stages[id]).filter(Boolean)}

  function renderViewport(parent){
    const wrap=document.createElement('main');wrap.className='rt144-view'+((tool==='hand'||spaceDown)?' rt148-panmode':'');parent.appendChild(wrap);
    const p=pref();if(p.gridVisible){wrap.style.backgroundImage='radial-gradient(#cbd5e1 1px, transparent 1px)';wrap.style.backgroundSize=`${GRID*zoom}px ${GRID*zoom}px`;wrap.style.backgroundPosition=`${pan.x}px ${pan.y}px`}
    wrap.ondragover=e=>{e.preventDefault();wrap.classList.add('rt149-drop-ready')};wrap.ondragleave=e=>{if(e.target===wrap)wrap.classList.remove('rt149-drop-ready')};wrap.ondrop=e=>handleDrop(e,wrap);
    const world=boardWorldSize(),canvas=document.createElement('div');canvas.className='rt144-canvas';canvas.style.width=world.width+'px';canvas.style.height=world.height+'px';canvas.style.transform=`translate(${pan.x}px,${pan.y}px) scale(${zoom})`;wrap.appendChild(canvas);
    wrap.addEventListener('pointerdown',e=>{if(spaceDown){e.preventDefault();e.stopPropagation();startPanDrag(e)}},true);
    canvas.addEventListener('pointerdown',e=>{if(e.target===canvas){selectedEdge=null;connectFrom=null;inspectorMode='selection';guides={x:null,y:null};if(tool==='hand'||spaceDown){startPanDrag(e);return}if(tool==='select'){startLasso(e);return}}});
    wrap.addEventListener('pointerdown',e=>{if((tool==='hand'||spaceDown)&&e.target===wrap)startPanDrag(e)});
    renderViewStructure(canvas);renderGuides(canvas);renderEdges(canvas);renderItems(canvas);renderLasso(canvas);
    if(!Object.keys(board().items).length&&!serviceBuilderAssistantState().active&&(board()?.viewKind!=='blueprint'||!serviceFrameStages().length))emptyState(wrap);
    if(selected.length>1)renderSelectionToolbar(wrap);else if(selected.length===1)renderContextToolbar(wrap);
    renderBreadcrumbs(wrap);renderBottomControls(wrap);renderMinimap(wrap);renderBlueprintStickyGuides(wrap);renderGuidedServiceCoach(wrap);renderServiceBuilderAssistant(wrap);
    wrap.addEventListener('wheel',e=>{
      e.preventDefault();
      if(e.ctrlKey||e.metaKey){
        const factor=Math.exp(-e.deltaY*.0018);zoomAtClient(clamp(zoom*factor,ZOOM_MIN,ZOOM_MAX),e.clientX,e.clientY,false);
      }else{
        const dx=e.shiftKey&&Math.abs(e.deltaX)<1?e.deltaY:e.deltaX,dy=e.shiftKey?0:e.deltaY;pan.x-=dx;pan.y-=dy;scheduleFrameRender();
      }
      scheduleNavigationSnapshot('Navegação');
    },{passive:false});
  }
  function startPanDrag(e){drag={type:'pan',sx:e.clientX,sy:e.clientY,px:pan.x,py:pan.y};e.currentTarget?.setPointerCapture?.(e.pointerId)}
  function zoomAtClient(next,cx,cy,record=true){const v=$('.rt144-view',overlay);if(!v)return;const r=v.getBoundingClientRect(),mx=cx-r.left,my=cy-r.top,old=zoom;zoom=clamp(next,ZOOM_MIN,ZOOM_MAX);pan.x=mx-(mx-pan.x)*(zoom/old);pan.y=my-(my-pan.y)*(zoom/old);renderAll();if(record)pushNavigationSnapshot('Zoom')}
  function renderGuides(canvas){
    if(guides.x!=null){const v=document.createElement('div');v.className='rt144-guide vertical';v.style.left=guides.x+'px';canvas.appendChild(v)}
    if(guides.y!=null){const h=document.createElement('div');h.className='rt144-guide horizontal';h.style.top=guides.y+'px';canvas.appendChild(h)}
  }
  function itemCenter(it){return{x:it.x+it.width/2,y:it.y+it.height/2}}
  function pointForSide(it,side){
    if(side==='left')return{x:it.x,y:it.y+it.height/2};
    if(side==='right')return{x:it.x+it.width,y:it.y+it.height/2};
    if(side==='top')return{x:it.x+it.width/2,y:it.y};
    if(side==='bottom')return{x:it.x+it.width/2,y:it.y+it.height};
    return itemCenter(it)
  }
  function autoSides(a,b){const ac=itemCenter(a),bc=itemCenter(b),dx=bc.x-ac.x,dy=bc.y-ac.y;if(Math.abs(dx)>=Math.abs(dy))return dx>=0?{from:'right',to:'left'}:{from:'left',to:'right'};return dy>=0?{from:'bottom',to:'top'}:{from:'top',to:'bottom'}}
  function edgeEndpoints(ed){
    const a=board().items[ed.fromId],b=board().items[ed.toId];if(!a||!b)return null;
    if((pref().layoutMode||'free')==='flow'){
      const vertical=(viewEnginePref().flowDirection||'horizontal')==='vertical',fromSide=vertical?'bottom':'right',toSide=vertical?'top':'left';
      return{a:pointForSide(a,fromSide),b:pointForSide(b,toSide),fromSide,toSide};
    }
    const auto=autoSides(a,b),fromSide=ed.fromHandle&&ed.fromHandle!=='auto'?ed.fromHandle:auto.from,toSide=ed.toHandle&&ed.toHandle!=='auto'?ed.toHandle:auto.to;return{a:pointForSide(a,fromSide),b:pointForSide(b,toSide),fromSide,toSide}
  }
  function sideVector(side){return side==='left'?{x:-1,y:0}:side==='right'?{x:1,y:0}:side==='top'?{x:0,y:-1}:{x:0,y:1}}
  function edgeGeometry(ed){
    const ep=edgeEndpoints(ed);if(!ep)return null;const {a,b,fromSide,toSide}=ep,flowMode=(pref().layoutMode||'free')==='flow',route=flowMode?'orthogonal':(ed.route||'curve'),wp=flowMode?null:ed.waypoint;
    let d='',labelPoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2},routePoint=wp?{x:wp.x,y:wp.y}:{...labelPoint};
    if(route==='straight'){
      if(wp){d=`M ${a.x} ${a.y} L ${wp.x} ${wp.y} L ${b.x} ${b.y}`;labelPoint={x:wp.x,y:wp.y};routePoint={x:wp.x,y:wp.y}}
      else d=`M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    }else if(route==='orthogonal'){
      if(wp){d=`M ${a.x} ${a.y} L ${wp.x} ${a.y} L ${wp.x} ${wp.y} L ${b.x} ${wp.y} L ${b.x} ${b.y}`;labelPoint={x:wp.x,y:wp.y};routePoint={x:wp.x,y:wp.y}}
      else if(fromSide==='left'||fromSide==='right') {const mx=(a.x+b.x)/2;d=`M ${a.x} ${a.y} L ${mx} ${a.y} L ${mx} ${b.y} L ${b.x} ${b.y}`;routePoint={x:mx,y:(a.y+b.y)/2};labelPoint={...routePoint}}
      else {const my=(a.y+b.y)/2;d=`M ${a.x} ${a.y} L ${a.x} ${my} L ${b.x} ${my} L ${b.x} ${b.y}`;routePoint={x:(a.x+b.x)/2,y:my};labelPoint={...routePoint}}
    }else{
      if(wp){d=`M ${a.x} ${a.y} Q ${wp.x} ${wp.y} ${b.x} ${b.y}`;const t=.5;labelPoint={x:(1-t)*(1-t)*a.x+2*(1-t)*t*wp.x+t*t*b.x,y:(1-t)*(1-t)*a.y+2*(1-t)*t*wp.y+t*t*b.y};routePoint={x:wp.x,y:wp.y}}
      else {const v1=sideVector(fromSide),v2=sideVector(toSide),dist=Math.max(70,Math.min(260,Math.hypot(b.x-a.x,b.y-a.y)*.38)),c1={x:a.x+v1.x*dist,y:a.y+v1.y*dist},c2={x:b.x+v2.x*dist,y:b.y+v2.y*dist};d=`M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;routePoint={x:(a.x+b.x)/2,y:(a.y+b.y)/2};labelPoint={...routePoint}}
    }
    return{...ep,d,labelPoint,routePoint}
  }
  function previewPath(a,b,fromSide='right'){
    const v=sideVector(fromSide),dist=Math.max(60,Math.min(220,Math.hypot(b.x-a.x,b.y-a.y)*.35)),c1={x:a.x+v.x*dist,y:a.y+v.y*dist};return`M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${b.x} ${b.y}, ${b.x} ${b.y}`
  }
  function renderEdges(canvas){
    const world=boardWorldSize(),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width',world.width);svg.setAttribute('height',world.height);svg.classList.add('rt144-edges');
    const defs=document.createElementNS(svg.namespaceURI,'defs');defs.innerHTML='<marker id="rt144-arrow" markerWidth="11" markerHeight="11" refX="9" refY="4" orient="auto"><path d="M0,0 L0,7 L8,3.5 z" fill="#64748b"/></marker><marker id="rt144-start" markerWidth="11" markerHeight="11" refX="1" refY="4" orient="auto-start-reverse"><path d="M0,0 L0,7 L8,3.5 z" fill="#64748b"/></marker>';svg.appendChild(defs);
    Object.values(board().edges||{}).forEach(ed=>{const a=board().items[ed.fromId],b=board().items[ed.toId];if(!a||!b||isHidden(a)||isHidden(b)||isStructurallyHidden(a)||isStructurallyHidden(b)||!itemPassesActiveView(a)||!itemPassesActiveView(b))return;if(!edgeMayRender(ed))return;const g=edgeGeometry(ed);if(!g)return;
      const hit=document.createElementNS(svg.namespaceURI,'path');hit.setAttribute('d',g.d);hit.setAttribute('class','edgehit');hit.dataset.id=ed.id;hit.onclick=e=>{e.stopPropagation();selected=[];selectedEdge=ed.id;connectFrom=null;showInspector=true;inspectorMode='selection';renderAll()};hit.ondblclick=e=>{e.stopPropagation();selected=[];selectedEdge=ed.id;showInspector=true;renderAll();setTimeout(()=>$('.rt144-inspector input',overlay)?.focus(),0)};hit.onmouseenter=()=>{const from=overlay?.querySelector(`.rt144-item[data-id="${ed.fromId}"]`),to=overlay?.querySelector(`.rt144-item[data-id="${ed.toId}"]`);from?.classList.add('rt1551-relation-focus');to?.classList.add('rt1551-relation-focus');svg.classList.add('rt1551-edge-hover');hit.classList.add('rt1551-hovered')};hit.onmouseleave=()=>{overlay?.querySelectorAll('.rt1551-relation-focus').forEach(x=>x.classList.remove('rt1551-relation-focus'));svg.classList.remove('rt1551-edge-hover');hit.classList.remove('rt1551-hovered')};const title=document.createElementNS(svg.namespaceURI,'title');title.textContent=`${content(a).title} → ${content(b).title}${ed.label?' · '+ed.label:''}`;hit.appendChild(title);svg.appendChild(hit);
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',g.d);path.setAttribute('class','edge'+(selectedEdge===ed.id?' selected':'')+(ed.style==='dashed'?' dashed':'')+` route-${ed.route||'curve'}`);if(ed.arrow==='end'||ed.arrow==='both')path.setAttribute('marker-end','url(#rt144-arrow)');if(ed.arrow==='both')path.setAttribute('marker-start','url(#rt144-start)');svg.appendChild(path);
      if(ed.label){const tx=document.createElementNS(svg.namespaceURI,'text');tx.setAttribute('x',g.labelPoint.x);tx.setAttribute('y',g.labelPoint.y-8);tx.setAttribute('class','edgelabel');tx.textContent=ed.label;tx.onclick=e=>{e.stopPropagation();selected=[];selectedEdge=ed.id;showInspector=true;renderAll()};svg.appendChild(tx)}
      if(selectedEdge===ed.id){
        [['from',g.a],['to',g.b]].forEach(([end,p])=>{const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('cx',p.x);c.setAttribute('cy',p.y);c.setAttribute('r','7');c.setAttribute('class','rt146-edge-endpoint '+end);c.onpointerdown=e=>startReconnectDrag(e,ed.id,end);svg.appendChild(c)});
        const r=document.createElementNS(svg.namespaceURI,'circle');r.setAttribute('cx',g.routePoint.x);r.setAttribute('cy',g.routePoint.y);r.setAttribute('r','6');r.setAttribute('class','rt146-route-handle');r.onpointerdown=e=>startRouteDrag(e,ed.id);svg.appendChild(r)
      }
    });
    if(drag&&(drag.type==='connect'||drag.type==='reconnect')){let start=null,side='right';if(drag.type==='connect'){const it=board().items[drag.fromId];if(it){start=pointForSide(it,drag.fromHandle);side=drag.fromHandle}}else{const ed=board().edges[drag.edgeId],geo=ed&&edgeGeometry(ed);if(geo){start=drag.end==='from'?geo.b:geo.a;side=drag.end==='from'?geo.toSide:geo.fromSide}}if(start&&drag.current){const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',previewPath(start,drag.current,side));p.setAttribute('class','rt146-edge-preview');svg.appendChild(p);const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('cx',drag.current.x);c.setAttribute('cy',drag.current.y);c.setAttribute('r','5');c.setAttribute('class','rt146-edge-preview-dot');svg.appendChild(c)}}
    canvas.appendChild(svg);
  }
  function itemRenameValue(it){if(it.kind==='smart')return entityTitle(it.objectKind,entityRecord(it.objectKind,it.objectId));if(visualKind(it)==='image')return it.caption||it.asset?.name||'';return it.text||''}
  function commitItemRename(it,value){if(!it)return false;const clean=String(value||'').trim();if(it.kind==='smart'&&!clean){renderAll();return false;}markEdit('Renomear objeto');if(it.kind==='smart')setEntityTitle(it.objectKind,it.objectId,clean);else if(visualKind(it)==='image')it.caption=clean;else it.text=clean;save(true,{label:'Renomear objeto'});toast(it.kind==='smart'?`${smartLabel(it.objectKind)} renomeado em todas as visualizações.`:'Objeto renomeado.');return true}
  function startInlineRename(it,el){
    if(!it||isLocked(it)||mobileReadOnly())return false;
    const title=el.querySelector('.itemtitle');if(!title)return false;
    const multiline=it.kind==='free'&&['note','text'].includes(visualKind(it)),before=itemRenameValue(it),input=document.createElement(multiline?'textarea':'input');
    input.className='bo1193-inline-rename';input.value=before;input.setAttribute('aria-label','Editar '+semanticLabel(it));input.title='Enter para concluir · Shift+Enter para nova linha · Esc para cancelar';
    if(multiline)input.rows=3;title.replaceWith(input);let finished=false;
    const finish=(commit=true)=>{if(finished||!input.isConnected)return;finished=true;if(commit&&input.value!==before)commitItemRename(board().items[it.id],input.value);else renderAll()};
    input.onpointerdown=e=>e.stopPropagation();input.onclick=e=>e.stopPropagation();
    input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();finish(true)}else if(e.key==='Escape'){e.preventDefault();finish(false)}};
    input.onblur=()=>finish(true);setTimeout(()=>{if(input.isConnected){input.focus();input.select()}},0);return true;
  }
  function renderItems(canvas){
    const list=renderableItems().sort((a,b)=>itemZ(a)-itemZ(b)),dropContainer=currentDropContainer();
    list.forEach(it=>{const c=content(it),t=itemTone(it),frame=isContainer(it),parent=parentFrame(it.id),ctype=containerType(it),vk=visualKind(it);const semantic=semanticKind(it),lod=zoom<.30?'dot':zoom<.50?'minimal':zoom<.80?'compact':'full';const el=document.createElement('div');el.className='rt144-item rt1551-lod-'+lod+' '+(frame?`frame container-${ctype}${isCollapsed(it)?' collapsed':''}`:`card visual-${vk} semantic-${semantic}`)+(selected.includes(it.id)?' selected':'')+(connectFrom===it.id?' connecting':'')+(dropContainer===it.id?' rt1410-drop-container':'')+((pref().layoutMode==='blueprint'&&it.kind==='smart'&&it.objectKind==='stage')?' rt1410-stage-instance':'')+(it.assistantSessionId?' bo1192-session-item':'')+(it.assistantManaged?' bo1192-managed-item':'')+(it.kind==='smart'?' bo1194-smart-card bo1194-smart-'+semantic:'');el.dataset.id=it.id;el.dataset.visualKind=vk;el.dataset.semanticKind=semantic;el.tabIndex=0;el.setAttribute('role','group');el.setAttribute('aria-label',`${semanticLabel(it)}: ${c.title||'Sem título'}`);el.style.left=it.x+'px';el.style.top=it.y+'px';el.style.width=it.width+'px';el.style.height=it.height+'px';el.style.zIndex=String(frame?Math.max(1,itemZ(it)):Math.max(10,itemZ(it)+10));el.style.background=frame?'rgba(255,255,255,.62)':it.kind==='smart'?'#ffffff':toneBg[t];el.style.borderColor=tone[t];
      if(frame){const direct=childrenOf(it.id).length,total=descendantsOf(it.id).length;el.innerHTML=`<div class="frametag" style="color:${tone[t]}"><div class="rt147-frametitle"><span class="rt147-containerbadge">${esc(containerLabel(it))}</span><b>${esc(c.title)}</b></div><div class="rt147-frameactions"><span>${total?total+' item'+(total>1?'s':''):''}</span><button class="frame-collapse" title="${isCollapsed(it)?'Expandir':'Recolher'}">${isCollapsed(it)?'▸':'▾'}</button></div></div>${ctype==='swimlane'?'<div class="rt147-swimrail"></div>':''}`;const cb=$('.frame-collapse',el);if(cb){cb.onpointerdown=e=>e.stopPropagation();cb.onclick=e=>{e.stopPropagation();toggleContainerCollapse(it.id)}}}
      else{
        const relation=((lod==='dot'||lod==='minimal')?'':it.kind==='smart'?(entityRecord(it.objectKind,it.objectId)?`<span class="graphlink rt153-graphlink" title="Entidade do Service Graph · ${graphUsage(it.objectKind,it.objectId)} instância(s)">↗<i>${graphUsage(it.objectKind,it.objectId)}</i></span>`:'<span class="graphlink rt153-missinglink" title="Entidade ausente">!</span>'):'')+(isLocked(it)?'<span class="lockmark" title="Objeto bloqueado">🔒</span>':'');
        const meta=`<div class="itemmeta"><i style="background:${tone[t]}"></i><small>${esc(blueprintEvidenceLabel(it))}</small>${relation}</div>`;
        if(lod==='dot'){
          el.classList.add('rt159-lite');el.innerHTML=`<div class="itemmeta"><i style="background:${tone[t]}"></i></div><div class="itemtitle">${esc(c.title)}</div>`;
        }else if(lod==='minimal'){
          el.classList.add('rt159-lite');el.innerHTML=`<div class="itemmeta"><i style="background:${tone[t]}"></i><small>${esc(semanticLabel(it))}</small></div><div class="itemtitle">${esc(c.title)}</div>`;
        }else if(vk==='image'){
          el.classList.add('rt149-media-card');el.innerHTML=`<div class="rt149-imagewrap">${it.asset?.dataUrl&&isSafeImageDataUrl(it.asset.dataUrl)?`<img src="${it.asset.dataUrl}" alt="${esc(it.caption||it.asset?.name||'Imagem')}">`:'<div class="rt149-missing-media">Imagem indisponível</div>'}</div>${it.caption?`<div class="rt149-caption">${esc(it.caption)}</div>`:''}`;
        }else if(vk==='linked'){
          el.classList.add('rt156-linked-card');el.innerHTML=`${meta}<div class="rt156-linked-icon">↗</div><div class="itemtitle">${esc(c.title)}</div><div class="itemsub">${esc(c.sub||'Objeto vinculado')}</div><button class="rt156-open-linked">Abrir destino</button>`;const ob=$('.rt156-open-linked',el);if(ob){ob.onpointerdown=e=>e.stopPropagation();ob.onclick=e=>{e.stopPropagation();openLinkedTarget(it)}}
        }else if(vk==='link'){
          const u=it.link?.url||'';el.innerHTML=`${meta}<div class="rt149-linkicon">↗</div><div class="itemtitle">${esc(it.link?.title||c.title)}</div><div class="itemsub rt149-domain">${esc(it.link?.domain||urlDomain(u)||u)}</div>`;
        }else if(vk==='file'){
          el.innerHTML=`${meta}<div class="rt149-fileicon">${fileGlyph(it.asset?.mime)}</div><div class="itemtitle">${esc(it.asset?.name||c.title)}</div><div class="itemsub">${esc(formatBytes(it.asset?.size||0))} · ${esc(it.asset?.mime||'arquivo')}</div>`;
        }else if(vk==='icon'){
          el.innerHTML=`${meta}<div class="rt149-iconhero">${esc(it.icon||'★')}</div><div class="itemsub rt149-iconlabel">${esc(it.iconLabel||'Ícone')}</div>`;
        }else if(vk==='text'){
          el.classList.add('rt149-text-object');el.innerHTML=renderRichText(it.text,it.textStyle||{});
        }else if(vk==='shape'){
          el.classList.add('rt149-shape','shape-'+(it.shapeStyle||'rounded'));el.innerHTML=`<div class="rt149-shapeinner"><span>${esc(it.text||'')}</span></div>`;
        }else if(vk==='note'){
          if(it.checked)el.classList.add('checked');const tags=(it.tags||[]).slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('');el.innerHTML=`${meta}<div class="rt149-notecheck">${it.checked?'✓':''}</div><div class="itemtitle">${esc(c.title)}</div>${tags?`<div class="rt149-tags">${tags}</div>`:''}`;
        }else{
          const status=it.status?`<span class="rt149-status">${esc(it.status)}</span>`:'';const badge=it.badge?`<span class="rt149-badge">${esc(it.badge)}</span>`:'';let primitive='';if(it.kind==='smart'&&it.objectKind==='touchpoint'){const r=entityRecord('touchpoint',it.objectId),ch=r?.channelId?channelTitle(r.channelId):(r?.channel||'');primitive=ch?`<div class="rt157-primitive-badge">Canal · ${esc(ch)}</div>`:''}else if(it.kind==='smart'&&it.objectKind==='emotion'){const r=entityRecord('emotion',it.objectId);primitive=`<div class="rt157-emotion-badge">${emotionGlyph(r?.score)} ${esc(emotionLabel(r?.score))}</div>`}else if(it.kind==='smart'&&it.objectKind==='evidence'){const r=entityRecord('evidence',it.objectId),cf=evidenceConfidence(r);primitive=`<div class="rt1814-evidence-badge ${esc(r?.confidence||'hypothesis')}">${cf.mark} ${esc(cf.label)}</div>`}else if(it.kind==='smart'&&it.objectKind==='persona'){primitive='<div class="rt157-primitive-badge">Persona</div>'}else if(it.kind==='smart'&&it.objectKind==='channel'){primitive='<div class="rt157-primitive-badge">Canal</div>'}const ctxLine=it.kind==='smart'?smartCardContext(it):'',stateRec=it.kind==='smart'?entityRecord(it.objectKind,it.objectId):null,stateBadge=(pref().layoutMode||'free')==='journey'&&it.kind==='smart'&&it.objectKind!=='stage'?`<span class="rt1814-state-badge ${esc(journeyStateForRecord(stateRec))}">${esc(journeyStateLabel(journeyStateForRecord(stateRec)))}</span>`:'';el.innerHTML=`${meta}<div class="itemtitle">${esc(c.title)}</div><div class="itemsub">${esc(c.sub||'')}</div>${ctxLine?`<div class="rt1811-card-context">${esc(ctxLine)}</div>`:''}${primitive}${stateBadge}${status||badge?`<div class="rt149-cardfooter">${badge}${status}</div>`:''}`;
        }
        if((zoom>=.5&&(vk!=='text'&&vk!=='shape'))||selected.includes(it.id)){
          const q=document.createElement('div');q.className='itemquick';q.innerHTML=mobileReadOnly()?'<button data-act="inspect" title="Ver propriedades">⚙</button>':(it.kind==='smart'?'<button class="smart-next" data-act="smart-add" title="Criar próximo objeto relacionado">＋<span>Próximo</span></button>':'')+'<button data-act="connect" title="Conectar">↗</button><button data-act="inspect" title="Propriedades">⚙</button><button data-act="duplicate" title="Duplicar">⧉</button>';el.appendChild(q)
        }
        if(!mobileReadOnly()&&(zoom>=.5||selected.includes(it.id)))['top','right','bottom','left'].forEach(side=>{const b=document.createElement('button');b.className='conn-handle '+side;b.dataset.side=side;b.title='Conectar';el.appendChild(b)});
        $$('.itemquick button',el).forEach(b=>{b.onpointerdown=e=>e.stopPropagation();b.onclick=e=>{e.stopPropagation();const act=b.dataset.act;if(act==='smart-add'){showSmartFlowMenu(it)}else if(act==='connect'){connectFrom=it.id;selected=[it.id];tool='connect';toast('Clique em outro objeto ou arraste um dos quatro handles.');renderAll()}else if(act==='inspect'){selected=[it.id];showInspector=true;inspectorMode='selection';renderAll()}else duplicateItems([it])}});
        $$('.conn-handle',el).forEach(b=>{b.onpointerdown=e=>startConnectDrag(e,it.id,b.dataset.side);b.onclick=e=>{e.preventDefault();e.stopPropagation()}})
      }
      if(!mobileReadOnly()&&selected.includes(it.id)&&!isLocked(it)&&!isCollapsed(it)){const r=document.createElement('button');r.className='resize-handle';r.title='Redimensionar';r.addEventListener('pointerdown',e=>startResize(e,it.id));el.appendChild(r)}
      if(parent){el.dataset.parentFrame=parent;el.title=`Dentro de ${board().items[parent]?.text||'container'}`}
      el.addEventListener('pointerdown',e=>startItemDrag(e,it.id));el.onclick=e=>selectItem(e,it.id);el.ondblclick=e=>{e.stopPropagation();selected=[it.id];selectedEdge=null;if(startInlineRename(it,el))return;showInspector=true;inspectorMode='selection';renderAll();setTimeout(()=>$('.rt144-inspector textarea,.rt144-inspector input',overlay)?.focus(),0)};el.addEventListener('keydown',e=>{if(e.target!==el||e.ctrlKey||e.metaKey||e.altKey)return;if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();selected=[it.id];selectedEdge=null;showInspector=true;inspectorMode='selection';renderAll();return}if(['Delete','Backspace'].includes(e.key)){e.preventDefault();e.stopPropagation();selected=[it.id];removeSelection();return}const k=e.key.toLowerCase();if(['arrowleft','arrowright','arrowup','arrowdown'].includes(k)&&!isLocked(it)){e.preventDefault();e.stopPropagation();markEdit('Mover objeto por teclado');const step=e.shiftKey?GRID:1;if(k==='arrowleft')it.x=Math.max(0,it.x-step);if(k==='arrowright')it.x+=step;if(k==='arrowup')it.y=Math.max(0,it.y-step);if(k==='arrowdown')it.y+=step;updateFrameMembership([it.id]);save()}});canvas.appendChild(el)
    });
  }
  function clientToCanvas(cx,cy){const v=$('.rt144-view',overlay),r=v?.getBoundingClientRect()||{left:0,top:0};return{x:(cx-r.left-pan.x)/zoom,y:(cy-r.top-pan.y)/zoom}}
  function startLasso(e){const p=clientToCanvas(e.clientX,e.clientY),add=e.ctrlKey||e.metaKey||e.shiftKey;drag={type:'lasso',sx:e.clientX,sy:e.clientY,start:p,current:p,base:add?[...selected]:[]};if(!add)selected=[];showInspector=false;renderAll()}
  function lassoRect(){if(!drag||drag.type!=='lasso')return null;const a=drag.start,b=drag.current;return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)}}
  function renderLasso(canvas){const r=lassoRect();if(!r||r.w<1||r.h<1)return;const d=document.createElement('div');d.className='rt145-lasso';d.style.left=r.x+'px';d.style.top=r.y+'px';d.style.width=r.w+'px';d.style.height=r.h+'px';canvas.appendChild(d)}
  function lassoSelection(rect){const ids=visibleItems().filter(it=>{if(isFrame(it))return it.x>=rect.x&&it.y>=rect.y&&it.x+it.width<=rect.x+rect.w&&it.y+it.height<=rect.y+rect.h;const cx=it.x+it.width/2,cy=it.y+it.height/2;return cx>=rect.x&&cx<=rect.x+rect.w&&cy>=rect.y&&cy<=rect.y+rect.h}).map(it=>it.id);return [...new Set([...(drag.base||[]),...ids])]}

  function nearestSide(it,p){const d={left:Math.abs(p.x-it.x),right:Math.abs(p.x-(it.x+it.width)),top:Math.abs(p.y-it.y),bottom:Math.abs(p.y-(it.y+it.height))};return Object.entries(d).sort((a,b)=>a[1]-b[1])[0][0]}
  function startConnectDrag(e,id,side){e.preventDefault();e.stopPropagation();if(mobileReadOnly()){toast('No celular, o quadro está em modo leitura.');return}if(isLocked(board().items[id])){toast('Objeto bloqueado.');return}selected=[id];selectedEdge=null;connectFrom=null;showInspector=false;const p=clientToCanvas(e.clientX,e.clientY);drag={type:'connect',fromId:id,fromHandle:side||'auto',current:p,clientX:e.clientX,clientY:e.clientY};e.currentTarget.setPointerCapture?.(e.pointerId);syncSelectionDom();scheduleFrameRender()}
  function startReconnectDrag(e,edgeId,end){e.preventDefault();e.stopPropagation();if(mobileReadOnly()){toast('No celular, o quadro está em modo leitura.');return}const ed=board().edges[edgeId],geo=ed&&edgeGeometry(ed);if(!geo)return;drag={type:'reconnect',edgeId,end,current:end==='from'?geo.a:geo.b,clientX:e.clientX,clientY:e.clientY};renderAll()}
  function startRouteDrag(e,edgeId){e.preventDefault();e.stopPropagation();if(mobileReadOnly()){toast('No celular, o quadro está em modo leitura.');return}const ed=board().edges[edgeId],geo=ed&&edgeGeometry(ed);if(!geo)return;drag={type:'route',edgeId,current:{...geo.routePoint}};renderAll()}
  function dropTargetAt(clientX,clientY){const el=document.elementFromPoint(clientX,clientY);const card=el?.closest?.('.rt144-item.card');if(!card)return null;const it=board().items[card.dataset.id];if(!it||isHidden(it))return null;const handle=el?.closest?.('.conn-handle');const p=clientToCanvas(clientX,clientY);return{id:it.id,side:handle?.dataset?.side||nearestSide(it,p)}}
  function finishConnect(e,d){const target=dropTargetAt(e.clientX,e.clientY);if(target&&target.id!==d.fromId){addEdge(d.fromId,target.id,{fromHandle:d.fromHandle,toHandle:target.side});return true}const p=clientToCanvas(e.clientX,e.clientY);quickCreate={clientX:e.clientX,clientY:e.clientY,point:p,fromId:d.fromId,fromHandle:d.fromHandle};connectFrom=null;renderAll();return false}
  function finishReconnect(e,d){markEdit('Reconectar');const target=dropTargetAt(e.clientX,e.clientY),ed=board().edges[d.edgeId];if(!ed)return;if(!target){toast('Solte sobre outro objeto para reconectar.');return}if(d.end==='from'){if(target.id===ed.toId){toast('A conexão precisa ter dois objetos diferentes.');return}ed.fromId=target.id;ed.fromHandle=target.side}else{if(target.id===ed.fromId){toast('A conexão precisa ter dois objetos diferentes.');return}ed.toId=target.id;ed.toHandle=target.side}ed.waypoint=null;selectedEdge=ed.id;showInspector=true;save()}
  function renderQuickCreate(){const q=quickCreate;if(!q)return;const menu=document.createElement('div');menu.className='rt146-quickcreate';menu.style.left=`${clamp(q.clientX+10,76,window.innerWidth-260)}px`;menu.style.top=`${clamp(q.clientY+10,68,window.innerHeight-310)}px`;menu.innerHTML='<div class="rt146-qhead"><b>Criar e conectar</b><small>Soltou a conexão no vazio.</small></div>';const options=[['Ponto de contato','touchpoint','violet'],['Emoção','emotion','rose'],['Processo','process','blue'],['Sistema','system','violet'],['Frontstage','frontstage','emerald'],['Backstage','backstage','amber'],['Post-it','note','yellow']];options.forEach(([label,semantic,toneName])=>{const b=document.createElement('button');b.innerHTML=`<i style="background:${tone[toneName]}"></i><span>${label}</span>`;b.onclick=()=>quickCreateFromConnection(semantic,label,toneName);menu.appendChild(b)});const cancel=document.createElement('button');cancel.className='cancel';cancel.textContent='Cancelar';cancel.onclick=()=>{quickCreate=null;renderAll()};menu.appendChild(cancel);overlay.appendChild(menu)}
  function quickCreateFromConnection(semantic,label,toneName){
    markEdit('Criar e conectar '+label);const q=quickCreate;if(!q)return;let id,p=q.point;
    if(semantic==='note'){id=uid('item');board().items[id]={id,instanceId:id,entityRef:null,kind:'free',shape:'note',visualKind:'note',semantic:'note',semanticType:'note',tone:toneName,text:'Novo post-it',x:Math.max(0,p.x),y:Math.max(0,p.y),width:270,height:152,z:maxZ()+1}}
    else{const entityId=createGraphEntityWithTitle(semantic,`Novo ${label.toLowerCase()}`,'');id=uid('smart');board().items[id]={id,instanceId:id,instanceSchemaVersion:2,entityRef:{type:semantic,id:entityId},entityStatus:'linked',kind:'smart',objectKind:semantic,objectId:entityId,semanticType:semantic,presentation:{tone:toneName,visualKind:'card'},x:Math.max(0,p.x),y:Math.max(0,p.y),width:270,height:152,z:maxZ()+1}}
    const edgeId=uid('edge');board().edges[edgeId]={id:edgeId,fromId:q.fromId,toId:id,fromHandle:q.fromHandle||'auto',toHandle:'left',label:'precede',style:'solid',arrow:'end',route:'orthogonal',waypoint:null};quickCreate=null;selected=[id];selectedEdge=null;showInspector=true;inspectorMode='selection';updateFrameMembership([id]);save();toast(`${label} criado como objeto semântico e conectado.`)
  }
  function selectItem(e,id){e.stopPropagation()}
  function startItemDrag(e,id){
    if(mobileReadOnly()){e.stopPropagation();selected=[id];selectedEdge=null;showInspector=true;inspectorMode='selection';renderAll();return}
    markEdit('Mover objetos');
    if(tool==='hand'||spaceDown||e.target.closest?.('.itemquick,.conn-handle,.resize-handle'))return;e.stopPropagation();
    if(tool==='connect'){if(connectFrom&&connectFrom!==id){addEdge(connectFrom,id);tool='select';return}connectFrom=id;selected=[id];selectedEdge=null;toast('Clique no destino ou arraste um handle para conectar.');renderAll();return}
    if(connectFrom&&connectFrom!==id){addEdge(connectFrom,id);return}
    selectedEdge=null;const multi=e.ctrlKey||e.metaKey||e.shiftKey,it=board().items[id];
    if(multi){if(selected.includes(id)){selected=selected.filter(x=>x!==id);showInspector=selected.length>0;renderAll();return}else selected=[...selected,id]}
    else if(!selected.includes(id)) selected=[id];
    if(showInspector)inspectorMode='selection';let ids=selected.includes(id)?[...selected]:[id];
    const g=itemGroup(id);if(g&&!multi){ids=Object.keys(board().items).filter(x=>itemGroup(x)===g&&!isHidden(board().items[x]));selected=[...ids]}
    if(isContainer(it)){const children=descendantsOf(id);ids=[...new Set([...ids,...children])];selected=[id]}
    if(isLocked(it)){toast('Objeto bloqueado. Desbloqueie para mover.');renderAll();return}
    ids=ids.filter(x=>board().items[x]&&(!isLocked(board().items[x])||isContainer(it)));
    if(!ids.length)return;
    drag={type:'items',sx:e.clientX,sy:e.clientY,orig:Object.fromEntries(ids.map(x=>[x,{x:board().items[x].x,y:board().items[x].y}])),primary:id,ids};e.currentTarget.setPointerCapture?.(e.pointerId);syncSelectionDom()
  }
  function startResize(e,id){if(mobileReadOnly()){e.preventDefault();e.stopPropagation();toast('No celular, o quadro está em modo leitura.');return}markEdit('Redimensionar objeto');e.stopPropagation();const it=board().items[id];if(isLocked(it)){toast('Objeto bloqueado.');return}drag={type:'resize',sx:e.clientX,sy:e.clientY,id,ow:it.width,oh:it.height};e.currentTarget.setPointerCapture?.(e.pointerId)}
  function emptyState(w){
    if(mobileReadOnly())return;
    const comp=serviceCompositionState();if(comp.experienceMode==='free'&&!comp.showRecipePrompt)return;
    const blueprint=board()?.viewKind==='blueprint',d=document.createElement('div');d.className='rt144-empty bo-editor-empty';
    d.innerHTML=blueprint?'<small>SEU BLUEPRINT</small><b>Comece pela primeira etapa</b><span>Organize o que o cliente faz e como a equipe entrega o serviço.</span>':'<small>SEU WHITEBOARD</small><b>Qual é a primeira ideia?</b><span>Adicione um post-it e escreva. Você pode organizar as ideias em um Blueprint depois.</span>';
    const actions=document.createElement('div');actions.className='emptyactions';
    if(blueprint){
      actions.appendChild(btn('Adicionar primeira etapa',()=>addJourneyStage({returnTo:'service'}),'primary'));
      if(graph.service.journeyIds.some(id=>graph.journeys[id]?.stageIds?.length))actions.appendChild(btn('Usar Jornada existente',showBlueprintJourneyPicker));
    }else{
      actions.appendChild(btn('Adicionar post-it',()=>addFree('note','note','','yellow'),'primary'));
      actions.appendChild(btn('Usar template',showTemplates));
    }
    actions.appendChild(btn('Dispensar',()=>{comp.experienceMode='free';comp.showRecipePrompt=false;save(false,{content:false,label:'Fechar orientação'});renderAll()}));
    d.appendChild(actions);w.appendChild(d);
  }
  function renderSelectionToolbar(w){
    if(mobileReadOnly())return;
    const arr=selected.map(id=>board().items[id]).filter(Boolean);if(arr.length<2)return;const minX=Math.min(...arr.map(i=>i.x)),minY=Math.min(...arr.map(i=>i.y)),maxX=Math.max(...arr.map(i=>i.x+i.width));const d=document.createElement('div');d.className='rt144-selectionbar';const cx=pan.x+((minX+maxX)/2)*zoom,cy=pan.y+minY*zoom;d.style.left=`${clamp(cx,180,w.clientWidth-180)}px`;d.style.top=`${Math.max(14,cy-52)}px`;
    [['Agrupar',group],['Esq',()=>align('left')],['Centro',()=>align('hcenter')],['Topo',()=>align('top')],['Meio',()=>align('vmiddle')],['↔',()=>distribute('horizontal')],['↕',()=>distribute('vertical')],['🔒',()=>lockSelection(true)],['⧉',()=>duplicateItems()],['🗑',removeSelection]].forEach(([l,fn],i)=>d.appendChild(btn(l,fn,i===9?'danger':'')));w.appendChild(d)
  }
  function renderContextToolbar(w){
    if(mobileReadOnly())return;
    if(selected.length!==1||selectedEdge||drag)return;const it=board().items[selected[0]];if(!it||isHidden(it))return;
    const cx=pan.x+(it.x+it.width/2)*zoom,cy=pan.y+it.y*zoom,d=document.createElement('div');d.className='rt190-context-toolbar';d.style.left=`${clamp(cx,150,Math.max(150,w.clientWidth-150))}px`;d.style.top=`${Math.max(12,cy-50)}px`;
    const type=document.createElement('span');type.className='rt190-context-type';type.textContent=semanticLabel(it);d.appendChild(type);
    if(!(editorContextKind()==='blueprint'&&blueprintLearningState().mode==='guided')&&it.kind==='smart'){const next=btn('Próximo',()=>showSmartFlowMenu(it),'rt190-context-primary');next.title='Criar o próximo objeto relacionado';d.appendChild(next);const origin=btn('Origem',()=>openSmartObjectOrigin(it),'rt190-context-action');origin.title='Abrir a origem canônica deste Smart Object';d.appendChild(origin)}
    if(!(editorContextKind()==='blueprint'&&blueprintLearningState().mode==='guided')&&!isContainer(it)){const con=btn('Conectar',()=>{connectFrom=it.id;tool='connect';toast('Escolha o objeto de destino.');renderAll()},'rt190-context-action');d.appendChild(con)}
    const edit=btn('Editar',()=>{if(editorContextKind()==='blueprint'&&it.kind==='smart'&&['frontstage','backstage','process','evidence'].includes(it.objectKind)){showBlueprintActivityDetails(it);return}showInspector=true;inspectorMode='selection';inspectorTab='essential';renderAll()},'rt190-context-action');edit.title='Abrir Inspector';d.appendChild(edit);
    const more=btn('•••',()=>{const r=d.getBoundingClientRect();contextMenu={kind:'item',id:it.id,x:r.right-8,y:r.bottom+6,canvasPoint:{x:it.x+it.width/2,y:it.y+it.height/2}};renderAll()},'rt190-context-more');more.title='Mais ações';d.appendChild(more);w.appendChild(d)
  }
  function renderInspectorHandle(parent){
    if(editorContextKind()==='blueprint'&&blueprintLearningState().mode==='guided'&&selected.length===1&&!selectedEdge)return;
    if(showInspector||(!selected.length&&!selectedEdge))return;const b=document.createElement('button');b.className='rt190-inspector-handle';b.innerHTML='<span>⚙</span><em>Propriedades</em>';b.title='Abrir Inspector';b.onclick=()=>{showInspector=true;inspectorMode='selection';renderAll()};parent.appendChild(b)
  }

  function renderBottomControls(w){
    const p=pref();
    const d=document.createElement('div');d.className='rt144-bottom rt148-bottom rt1410-bottom bo1174-statusbar';d.setAttribute('role','toolbar');d.setAttribute('aria-label','Navegação e estado do quadro');
    const group=cls=>{const x=document.createElement('div');x.className='bo1174-status-group '+cls;d.appendChild(x);return x};
    const nav=group('navigation');const back=btn('←',()=>navigateHistory(-1),'nav');back.disabled=navIndex<=0;back.title='Voltar na navegação · Alt+←';const fwd=btn('→',()=>navigateHistory(1),'nav');fwd.disabled=navIndex<0||navIndex>=navHistory.length-1;fwd.title='Avançar na navegação · Alt+→';nav.append(back,fwd);
    if(editorContextKind()==='blueprint'&&blueprintLearningState().mode==='guided'&&!mobileReadOnly()){
      const history=group('history');
      const undo=btn('↶',undoEdit,'icon rt150-undo');undo.title='Desfazer · Ctrl/Cmd Z';undo.setAttribute('aria-label','Desfazer');
      const redo=btn('↷',redoEdit,'icon rt150-redo');redo.title='Refazer · Ctrl/Cmd Shift Z';redo.setAttribute('aria-label','Refazer');history.append(undo,redo);
    }
    const zoomGroup=group('zoom');zoomGroup.classList.add('bo1193-zoom');const minus=btn('−',()=>zoomAtClient(zoom/1.15,window.innerWidth/2,window.innerHeight/2,true));minus.title='Reduzir zoom';const slider=document.createElement('input');slider.type='range';slider.min=String(Math.round(ZOOM_MIN*100));slider.max=String(Math.round(ZOOM_MAX*100));slider.step='5';slider.value=String(Math.round(zoom*100));slider.className='bo1193-zoom-slider';slider.setAttribute('aria-label','Zoom do quadro');const z=btn(Math.round(zoom*100)+'%',setZoom100,'zoom');z.title='Voltar para 100% · Ctrl+1';const plus=btn('+',()=>zoomAtClient(zoom*1.15,window.innerWidth/2,window.innerHeight/2,true));plus.title='Aumentar zoom';slider.oninput=()=>{const v=$('.rt144-view',overlay),r=v?.getBoundingClientRect();if(!r)return;zoomAtClient(Number(slider.value)/100,r.left+r.width/2,r.top+r.height/2,false)};slider.onchange=()=>pushNavigationSnapshot('Zoom');zoomGroup.append(minus,slider,z,plus);
    const fitGroup=group('fit');const contentFit=btn('Ajustar tudo',()=>{fitContent();pushNavigationSnapshot('Ajustar conteúdo')});contentFit.title='Ajustar todo o conteúdo · Ctrl+0';const selectionFit=btn('Ajustar seleção',()=>{fitSelection();pushNavigationSnapshot('Ajustar seleção')});selectionFit.title='Ajustar a seleção · Ctrl+2';if(editorContextKind()==='blueprint'&&blueprintLearningState().mode==='guided'&&!selected.length)selectionFit.hidden=true;fitGroup.append(contentFit,selectionFit);
    const densityLabel={compact:'Compacta',normal:'Normal',detailed:'Detalhada'}[p.cardDensity||'normal'];
    const viewState=group('state');const settings=btn(`Cards · ${densityLabel}`,()=>{showCanvasPrefs=!showCanvasPrefs;renderAll()},showCanvasPrefs?'active':'');settings.title='Grade, snap, guias, minimapa e densidade';const map=btn(p.minimap===false?'Mapa':'Mapa ✓',()=>{p.minimap=p.minimap===false;save(false,{label:'Minimapa'});renderAll()},p.minimap===false?'':'active');map.title=p.minimap===false?'Mostrar minimapa':'Ocultar minimapa';viewState.append(settings,map);
    const metaGroup=group('meta');const grid=document.createElement('span');grid.className='bo1174-canvas-state';grid.textContent=`${p.gridVisible?'Grade':'Sem grade'} · ${p.snapToGrid?'Snap':'Livre'}`;const count=document.createElement('span');count.className='bo1174-object-count';count.textContent=`${visibleItems().filter(it=>!isContainer(it)).length} objetos`;metaGroup.append(grid,count);
    w.appendChild(d);
    if(showCanvasPrefs){const pop=document.createElement('div');pop.className='rt1410-canvasprefs bo1174-canvasprefs';[['Grade',()=>{p.gridVisible=!p.gridVisible},()=>p.gridVisible],['Snap',()=>{p.snapToGrid=!p.snapToGrid},()=>p.snapToGrid],['Guias',()=>{p.smartGuides=p.smartGuides===false},()=>p.smartGuides!==false],['Minimapa',()=>{p.minimap=p.minimap===false},()=>p.minimap!==false]].forEach(([l,fn,on])=>{const b=btn((on()?'✓ ':'')+l,()=>{fn();save(false);renderAll()},on()?'active':'');pop.appendChild(b)});const sep=document.createElement('div');sep.className='rt1811-density-sep';sep.textContent='Densidade dos cards';pop.appendChild(sep);const density=document.createElement('div');density.className='rt1811-density-switch';[['compact','Compacta'],['normal','Normal'],['detailed','Detalhada']].forEach(([v,l])=>{const b=btn(l,()=>{p.cardDensity=v;invalidateViewLayout(pref().layoutMode||'free');save(false,{label:'Densidade dos cards'});const mode=pref().layoutMode||'free';if(mode==='journey'||mode==='blueprint')applyLayout(mode,true);else renderAll()},p.cardDensity===v?'active':'');density.appendChild(b)});pop.appendChild(density);w.appendChild(pop)}
  }
  function meaningfulExtentItems(){const visible=visibleItems(),visibleIds=new Set(visible.map(i=>i.id));const meaningful=visible.filter(it=>!isContainer(it)||descendantsOf(it.id).some(id=>visibleIds.has(id)&&!isContainer(board().items[id])));return meaningful.length?meaningful:visible.filter(it=>!isContainer(it))}
  function contentBounds(){const arr=meaningfulExtentItems();if(!arr.length)return null;return {minX:Math.min(...arr.map(i=>i.x)),minY:Math.min(...arr.map(i=>i.y)),maxX:Math.max(...arr.map(i=>i.x+i.width)),maxY:Math.max(...arr.map(i=>i.y+i.height))}}
  function minimapWorld(w,bounds){const r=w.getBoundingClientRect(),vl=(-pan.x)/zoom,vt=(-pan.y)/zoom,vr=vl+r.width/zoom,vb=vt+r.height/zoom,pad=180,world=boardWorldSize();return{minX:Math.max(0,Math.min(bounds?.minX??0,vl)-pad),minY:Math.max(0,Math.min(bounds?.minY??0,vt)-pad),maxX:Math.min(world.width,Math.max(bounds?.maxX??world.width*.2,vr)+pad),maxY:Math.min(world.height,Math.max(bounds?.maxY??world.height*.2,vb)+pad)}}
  function renderMinimap(w){
    if(editorContextKind()==='blueprint'&&blueprintLearningState().mode==='guided'&&orderedStages().length<4)return;
    const p=pref();if(p.minimap===false)return;const bounds=contentBounds(),count=Object.keys(board().items).length;if(!bounds||count<2)return;const r=w.getBoundingClientRect(),world=minimapWorld(w,bounds),mw=168,mh=104,ww=Math.max(1,world.maxX-world.minX),wh=Math.max(1,world.maxY-world.minY),scale=Math.min(mw/ww,mh/wh),drawW=ww*scale,drawH=wh*scale,ox=(mw-drawW)/2,oy=(mh-drawH)/2;
    const d=document.createElement('div');d.className='rt144-minimap rt148-minimap';d.style.right=showInspector?(window.innerWidth<=900?'304px':'330px'):'14px';d.innerHTML='<div class="rt148-minimap-head"><span>Mapa</span><small>arraste para navegar</small></div><div class="minicanvas"></div>';const c=$('.minicanvas',d);c.style.width=mw+'px';c.style.height=mh+'px';const toMap=(x,y)=>({x:ox+(x-world.minX)*scale,y:oy+(y-world.minY)*scale});
    const miniAll=visibleItems(),miniStep=Math.max(1,Math.ceil(miniAll.length/perf.minimapLimit));miniAll.filter((it,i)=>i%miniStep===0||selected.includes(it.id)).forEach(it=>{const q=document.createElement('i'),a=toMap(it.x,it.y);q.style.left=a.x+'px';q.style.top=a.y+'px';q.style.width=Math.max(2,it.width*scale)+'px';q.style.height=Math.max(2,it.height*scale)+'px';q.style.background=tone[itemTone(it)];if(isContainer(it))q.classList.add('container');c.appendChild(q)});
    const vl=(-pan.x)/zoom,vt=(-pan.y)/zoom,a=toMap(vl,vt),view=document.createElement('em');view.className='rt148-miniview';view.style.left=a.x+'px';view.style.top=a.y+'px';view.style.width=Math.max(14,Math.min(mw,r.width/zoom*scale))+'px';view.style.height=Math.max(10,Math.min(mh,r.height/zoom*scale))+'px';c.appendChild(view);
    const startMini=e=>{e.preventDefault();e.stopPropagation();const rr=c.getBoundingClientRect();drag={type:'minimap',rect:rr,world,scale,ox,oy,viewW:r.width,viewH:r.height};c.setPointerCapture?.(e.pointerId);moveMinimapDrag(e)};c.onpointerdown=startMini;w.appendChild(d)
  }
  function moveMinimapDrag(e){if(!drag||drag.type!=='minimap')return;const d=drag,x=clamp(e.clientX-d.rect.left-d.ox,0,(d.world.maxX-d.world.minX)*d.scale)/d.scale+d.world.minX,y=clamp(e.clientY-d.rect.top-d.oy,0,(d.world.maxY-d.world.minY)*d.scale)/d.scale+d.world.minY;pan={x:d.viewW/2-x*zoom,y:d.viewH/2-y*zoom};scheduleFrameRender()}

  function viewportSnapshot(label=''){return{boardId,pan:{x:Math.round(pan.x*100)/100,y:Math.round(pan.y*100)/100},zoom:Math.round(zoom*10000)/10000,selected:[...selected],label,ts:Date.now()}}
  function sameViewport(a,b){return a&&b&&a.boardId===b.boardId&&Math.abs(a.pan.x-b.pan.x)<2&&Math.abs(a.pan.y-b.pan.y)<2&&Math.abs(a.zoom-b.zoom)<.004&&String(a.selected||[])===String(b.selected||[])}
  function resetNavigationHistory(label=''){navHistory=[viewportSnapshot(label)];navIndex=0;renderAll()}
  function pushNavigationSnapshot(label=''){const n=viewportSnapshot(label),cur=navHistory[navIndex];pref().viewport={zoom,pan:clone(pan)};if(sameViewport(cur,n))return;if(navIndex<navHistory.length-1)navHistory=navHistory.slice(0,navIndex+1);navHistory.push(n);if(navHistory.length>60)navHistory.shift();navIndex=navHistory.length-1}
  function scheduleNavigationSnapshot(label=''){clearTimeout(wheelNavTimer);wheelNavTimer=setTimeout(()=>pushNavigationSnapshot(label),240)}
  function navigateHistory(delta){const next=navIndex+delta;if(next<0||next>=navHistory.length)return;navIndex=next;const st=navHistory[navIndex];if(graph.views.whiteboards[st.boardId]){boardId=st.boardId;meta.activeBoardId=boardId}pan={...st.pan};zoom=st.zoom;selected=(st.selected||[]).filter(id=>board().items[id]);selectedEdge=null;showInspector=selected.length>0;renderAll()}
  function centerOnWorld(x,y,record=true){const v=$('.rt144-view',overlay);if(!v)return;const r=v.getBoundingClientRect();pan={x:r.width/2-x*zoom,y:r.height/2-y*zoom};renderAll();if(record)pushNavigationSnapshot('Centralizar')}
  function focusItem(id,{fitItem=false,record=true}={}){const it=board().items[id];if(!it)return;ancestorFrames(id).forEach(fid=>{const f=board().items[fid];if(f)f.collapsed=false});if(isHidden(it))it.hidden=false;selected=[id];selectedEdge=null;showInspector=true;inspectorMode='selection';const v=$('.rt144-view',overlay);if(v&&fitItem){const r=v.getBoundingClientRect(),zw=clamp(Math.min((r.width-260)/Math.max(it.width,200),(r.height-220)/Math.max(it.height,120)),.45,1.5);zoom=zw}centerOnWorld(it.x+it.width/2,it.y+it.height/2,false);save(false);renderAll();if(record)pushNavigationSnapshot('Localizar '+content(it).title)}
  function outlineMatches(it,q){if(!q)return true;const c=content(it),txt=[c.title,c.sub,it.semantic,it.objectKind,isContainer(it)?containerLabel(it):''].join(' ').toLowerCase();return txt.includes(q.toLowerCase())}
  function renderOutline(parent){
    const panel=document.createElement('aside');panel.className='rt144-library rt148-outline';parent.appendChild(panel);
    panel.innerHTML='<div class="rt144-panelhead"><div><b>Navegação</b><small>Localize objetos e percorra a estrutura.</small></div><button class="rt144-x">×</button></div>';
    $('.rt144-x',panel).onclick=()=>{showOutline=false;renderAll()};
    const body=document.createElement('div');body.className='rt148-outline-body';panel.appendChild(body);
    const search=document.createElement('div');search.className='rt148-outline-searchbox';search.innerHTML='<span>⌕</span><input class="rt148-outline-search" placeholder="Buscar no quadro…"><kbd>Ctrl F</kbd>';body.appendChild(search);const input=$('input',search);input.value=outlineQuery;input.oninput=()=>{outlineQuery=input.value;renderAll();setTimeout(()=>{const el=$('.rt148-outline-search',overlay);if(el){el.focus();el.setSelectionRange(el.value.length,el.value.length)}},0)};
    const controls=document.createElement('div');controls.className='rt148-outline-actions';controls.append(btn('Tudo',fit),btn('Seleção',fitSelection),btn('100%',()=>{setZoom100();}));body.appendChild(controls);
    const list=document.createElement('div');list.className='rt148-outline-list';body.appendChild(list);const all=Object.values(board().items),byId=board().items,q=outlineQuery.trim();
    if(q){const hits=all.filter(it=>outlineMatches(it,q)).sort((a,b)=>content(a).title.localeCompare(content(b).title));const metaLine=document.createElement('div');metaLine.className='rt148-outline-meta';metaLine.textContent=`${hits.length} resultado${hits.length===1?'':'s'}`;list.appendChild(metaLine);hits.forEach(it=>renderOutlineRow(list,it,ancestorFrames(it.id).length,true));if(!hits.length){const e=document.createElement('div');e.className='rt145-layerempty';e.textContent='Nenhum objeto encontrado.';list.appendChild(e)}return}
    const roots=all.filter(it=>!parentFrame(it.id)||!byId[parentFrame(it.id)]).sort((a,b)=>itemZ(b)-itemZ(a));if(!roots.length){const e=document.createElement('div');e.className='rt145-layerempty';e.textContent='O quadro ainda não possui objetos.';list.appendChild(e);return}
    const walk=(it,depth=0)=>{renderOutlineRow(list,it,depth,false);if(isContainer(it)&&!isCollapsed(it))childrenOf(it.id).map(id=>byId[id]).filter(Boolean).sort((a,b)=>itemZ(b)-itemZ(a)).forEach(ch=>walk(ch,depth+1))};roots.forEach(x=>walk(x,0));
  }
  function renderOutlineRow(list,it,depth,searchMode){const c=content(it),row=document.createElement('button');row.className='rt148-outline-row'+(selected.includes(it.id)?' selected':'');row.style.setProperty('--depth',depth);const path=searchMode?ancestorFrames(it.id).reverse().map(id=>content(board().items[id]).title).filter(Boolean).join(' › '):'';row.innerHTML=`<span class="rt148-odot" style="background:${tone[itemTone(it)]}"></span><span class="rt148-otext"><b>${esc(c.title)}</b><small>${esc(path|| (isContainer(it)?containerLabel(it):(it.kind==='smart'?smartLabel(it.objectKind):freeLabel(it.semantic||'note'))))}</small></span><span class="rt148-target">◎</span>`;row.onclick=()=>focusItem(it.id,{record:true});list.appendChild(row)}
  function renderBreadcrumbs(w){if(selected.length!==1)return;const it=board().items[selected[0]];if(!it)return;const chain=ancestorFrames(it.id).reverse().map(id=>board().items[id]).filter(Boolean);if(!chain.length&&!isContainer(it))return;const d=document.createElement('nav');d.className='rt148-breadcrumbs';const root=document.createElement('button');root.textContent='Quadro';root.onclick=()=>{selected=[];showInspector=false;fit();pushNavigationSnapshot('Quadro')};d.appendChild(root);[...chain,it].forEach((node,i)=>{const sep=document.createElement('span');sep.textContent='›';d.appendChild(sep);const b=document.createElement('button');b.textContent=content(node).title;b.title=content(node).title;b.onclick=()=>focusItem(node.id,{record:true});if(i===[...chain,it].length-1)b.classList.add('current');d.appendChild(b)});w.appendChild(d)}
  function setZoom100(){const v=$('.rt144-view',overlay);if(!v)return;const r=v.getBoundingClientRect(),wx=(r.width/2-pan.x)/zoom,wy=(r.height/2-pan.y)/zoom;zoom=1;pan={x:r.width/2-wx,y:r.height/2-wy};renderAll();pushNavigationSnapshot('100%')}
  function inspectorGroupForTitle(title){
    const t=String(title||'').toLowerCase();
    if(t.includes('aparência'))return 'appearance';
    if(t.includes('relaç')||t.includes('contexto'))return 'relations';
    if(t.includes('service graph')||t.includes('estrutura')||t.includes('organização'))return 'advanced';
    return 'essential';
  }
  function applyInspectorProgressive(c){
    const guided=inspectorGuided(),allowed=guided?['essential','relations','appearance']:['essential','relations','appearance','advanced'];
    if(!allowed.includes(inspectorTab))inspectorTab='essential';
    let group='essential';
    [...c.children].forEach(node=>{
      if(node.classList?.contains('rt144-section'))group=inspectorGroupForTitle(node.textContent);
      if(node.classList?.contains('rt153-entitybox')||node.classList?.contains('rt153-usage'))group='advanced';
      node.dataset.inspectorGroup=group;
    });
    const tabs=document.createElement('nav');tabs.className='rt1810-inspector-tabs';tabs.setAttribute('aria-label','Seções do Inspector');
    const defs=[['essential','Essencial'],['relations','Relações'],['appearance','Aparência'],['advanced','Avançado']];
    defs.filter(([k])=>allowed.includes(k)).forEach(([k,label])=>{const b=document.createElement('button');b.textContent=label;b.className=inspectorTab===k?'active':'';b.setAttribute('aria-pressed',String(inspectorTab===k));b.onclick=()=>{inspectorTab=k;renderAll()};tabs.appendChild(b)});
    c.prepend(tabs);
    [...c.children].forEach(node=>{if(node===tabs)return;const g=node.dataset?.inspectorGroup||'essential';node.hidden=g!==inspectorTab});
    if(guided){const hint=document.createElement('div');hint.className='rt1810-guided-hint';hint.innerHTML='<b>Modo guiado</b><span>Controles técnicos do Service Graph ficam ocultos. Troque para Profissional no topo para acessá-los.</span>';c.insertBefore(hint,tabs.nextSibling)}
  }

  function renderInspector(parent){
    const ins=document.createElement('aside');ins.className='rt144-inspector rt183-inspector';parent.appendChild(ins);const head=document.createElement('div');head.className='rt144-panelhead';const single=selected.length===1?board().items[selected[0]]:null,title=inspectorMode==='board'?'Canvas':selectedEdge?'Conexão':single?semanticLabel(single):selected.length?`${selected.length} objetos`:'Propriedades';head.innerHTML=`<div><b>${esc(title)}</b><small>${inspectorMode==='board'?'Preferências visuais do canvas.':selectedEdge?'Propriedades da conexão.':'Propriedades do objeto selecionado.'}</small></div><button class="rt144-x">×</button>`;ins.appendChild(head);$('.rt144-x',ins).setAttribute('aria-label','Fechar propriedades');$('.rt144-x',ins).onclick=()=>{showInspector=false;inspectorMode='selection';renderAll()};const c=document.createElement('div');c.className='rt144-insbody';ins.appendChild(c);
    if(inspectorMode==='board'){renderBoardInspector(c);return}
    if(selectedEdge){const ed=board().edges[selectedEdge];if(!ed)return;const from=board().items[ed.fromId],to=board().items[ed.toId];const info=document.createElement('div');info.className='rt144-infobox';info.innerHTML=`<small>Conexão</small><b>${esc(content(from||{}).title||'Origem')} → ${esc(content(to||{}).title||'Destino')}</b><p>${esc((ed.route||'curve')==='curve'?'Curva':ed.route==='straight'?'Reta':'Ortogonal')} · ${esc(ed.fromHandle||'auto')} → ${esc(ed.toHandle||'auto')}</p>`;c.appendChild(info);field(c,'Legenda',ed.label,v=>{ed.label=v;save()});selectField(c,'Roteamento',ed.route||'curve',[['curve','Curva'],['straight','Reta'],['orthogonal','Ortogonal']],v=>{ed.route=v;ed.waypoint=null;save()});selectField(c,'Linha',ed.style,[['solid','Contínua'],['dashed','Tracejada']],v=>{ed.style=v;save()});selectField(c,'Seta',ed.arrow,[['end','Destino'],['both','Duas pontas'],['none','Sem seta']],v=>{ed.arrow=v;save()});sectionTitle(c,'Reconectar');const row=document.createElement('div');row.className='rt144-row';row.append(btn('Origem',()=>{toast('Arraste o círculo da origem até outro objeto.');renderAll()}),btn('Destino',()=>{toast('Arraste o círculo do destino até outro objeto.');renderAll()}));c.appendChild(row);c.appendChild(btn('Limpar desvio manual',()=>{ed.waypoint=null;save()},'wide'));c.appendChild(btn('Excluir conexão',()=>{delete board().edges[selectedEdge];selectedEdge=null;showInspector=false;save()},'danger wide'));return}
    if(selected.length===1){const it=board().items[selected[0]];if(!it)return;if(it.kind==='free'&&['note','text'].includes(visualKind(it))){renderSimpleVisualInspector(c,it);return}const vk=visualKind(it),guided=inspectorGuided();const info=document.createElement('div');info.className='rt144-infobox rt1551-typebox';info.innerHTML=`<small>${guided?'Tipo':'Semântica'}</small><b>${esc(semanticLabel(it))}</b><span>Visual: ${esc(visualKind(it)==='card'?'Card':visualLabel(it))}</span>${!guided?(it.kind==='smart'?'<em>↗ Entidade do Service Graph</em>':'<em class="rt149-ready">◇ Objeto visual livre</em>'):''}${parentFrame(it.id)?'<em class="violet">Dentro de '+esc(board().items[parentFrame(it.id)]?.text||'frame')+'</em>':''}`;c.appendChild(info);if(it.kind==='smart')renderSmartObjectInspector(c,it);else{renderVisualInspector(c,it,vk);const ck=convertibleKind(it);if(ck){sectionTitle(c,'Service Graph');const ready=document.createElement('div');ready.className='rt153-convert-card';ready.innerHTML=`<b>Transformar em ${esc(smartLabel(ck))}</b><span>Cria uma entidade canônica e mantém este objeto como a primeira instância visual.</span>`;ready.appendChild(btn('Converter em Smart Object',()=>convertToSmart(it,ck),'primary wide'));c.appendChild(ready)}}if(!isContainer(it)){const imageContext=vk==='image';sectionTitle(c,imageContext?'Onde esta imagem entra?':((pref().layoutMode||'free')==='blueprint'?'Contexto no Blueprint':'Contexto'));if(imageContext){const hint=document.createElement('div');hint.className='bo1193-context-hint';hint.innerHTML='<b>Organize a imagem no serviço</b><span>Associe à etapa e à área em que ela ajuda a explicar a experiência ou a operação.</span>';c.appendChild(hint)}const stages=orderedStages();if(!(it.kind==='smart'&&it.objectKind==='stage')&&stages.length)selectField(c,imageContext?'Etapa relacionada':'Etapa',stageForItem(it)||stages[0].id,stages.map(s=>[s.id,s.title]),v=>{if(pref().layoutMode==='service'){it.serviceStageId=v;invalidateViewLayout('service');serviceCompositionLayout([it.id]);save()}else{it.blueprintStageId=v;invalidateViewLayout('blueprint');if(pref().layoutMode==='blueprint'){placeBlueprintItems();save()}else save()}});(pref().layoutMode==='service'?selectField(c,imageContext?'Área do serviço':'Camada do Blueprint',serviceFrameLayerForItem(it),SERVICE_FRAME_LAYERS.map(x=>[x.key,x.label]),v=>{it.serviceLayer=v;it.serviceStageId=stageForItem(it);invalidateViewLayout('service');serviceCompositionLayout([it.id]);save()}):selectField(c,imageContext?'Área do serviço':'Camada',laneForItem(it),blueprintLanes.map(x=>[x.key,x.label]),v=>{it.blueprintLane=v;invalidateViewLayout('blueprint');if(pref().layoutMode==='blueprint'){placeBlueprintItems();save()}else save()}))}sectionTitle(c,'Aparência');const colors=document.createElement('div');colors.className='rt144-colors';c.appendChild(colors);Object.keys(tone).forEach(t=>{const b=document.createElement('button');b.style.background=tone[t];b.setAttribute('aria-label','Cor '+t);if(itemTone(it)===t)b.classList.add('active');b.onclick=()=>{it.tone=t;save()};colors.appendChild(b)});if(isContainer(it)){sectionTitle(c,'Estrutura');selectField(c,'Tipo de container',containerType(it),[['frame','Frame'],['section','Section'],['swimlane','Swimlane']],v=>setContainerType(it.id,v));toggle(c,'Recolhido',isCollapsed(it),()=>toggleContainerCollapse(it.id));toggle(c,'Auto-resize',!!it.autoResize,v=>{it.autoResize=v;if(v)fitContainerToContent(it.id,true);save()});selectField(c,'Padding',String(containerPadding(it)),[['16','16 px'],['24','24 px'],['32','32 px'],['48','48 px'],['64','64 px']],v=>{it.padding=Number(v);if(it.autoResize)fitContainerToContent(it.id,true);save()});const hierarchy=document.createElement('div');hierarchy.className='rt147-hierarchy';const path=ancestorFrames(it.id).reverse().map(id=>board().items[id]?.text).filter(Boolean);hierarchy.innerHTML=`<small>Hierarquia</small><b>${path.length?esc(path.join(' › ')+' › '+(it.text||containerLabel(it))):'Raiz do quadro'}</b><span>${childrenOf(it.id).length} filho(s) diretos · ${descendantsOf(it.id).length} descendente(s)</span>`;c.appendChild(hierarchy);const sr=document.createElement('div');sr.className='rt144-row';sr.append(btn('Ajustar conteúdo',()=>fitContainerToContent(it.id,true)),btn('Selecionar conteúdo',()=>selectContainerContent(it.id)));c.appendChild(sr)}sectionTitle(c,'Organização');toggle(c,'Bloquear objeto',isLocked(it),v=>setLocked(it.id,v));toggle(c,'Visível no quadro',!isHidden(it),v=>setVisibility(it.id,v));const order=document.createElement('div');order.className='rt145-ordergrid';order.append(btn('Frente',()=>arrange(it.id,'front')),btn('Avançar',()=>arrange(it.id,'forward')),btn('Recuar',()=>arrange(it.id,'backward')),btn('Fundo',()=>arrange(it.id,'back')));c.appendChild(order);const row=document.createElement('div');row.className='rt144-row';row.append(btn('Conectar',()=>{connectFrom=it.id;showInspector=false;toast('Escolha o objeto de destino.');renderAll()}),btn('Duplicar',()=>duplicateItems([it])));c.appendChild(row);const adv=document.createElement('details');adv.className='rt1410-advanced';adv.innerHTML='<summary>Mais ações</summary>';if(isContainer(it)){adv.appendChild(btn('Excluir container e preservar conteúdo',()=>deleteContainer(it.id,false),'danger wide'));adv.appendChild(btn('Excluir container + conteúdo',()=>deleteContainer(it.id,true),'danger wide'))}else adv.appendChild(btn(it.kind==='smart'?'Remover do quadro':'Excluir objeto',removeSelection,'danger wide'));c.appendChild(adv);applyInspectorProgressive(c);return}
    if(selected.length>1){
      const arr=selected.map(id=>board().items[id]).filter(Boolean),locked=arr.filter(isLocked).length,containers=arr.filter(isContainer).length,smart=arr.filter(it=>it.kind==='smart').length;
      const box=document.createElement('div');box.className='rt1551-selection-summary';box.innerHTML=`<b>${arr.length} objetos selecionados</b><div><span>${smart} semânticos</span><span>${containers} containers</span><span>${locked} bloqueados</span></div><small>Use a barra flutuante para alinhar, distribuir e agrupar. O Inspector mantém apenas ações de estado e estrutura.</small>`;c.appendChild(box);
      sectionTitle(c,'Organização');const row=document.createElement('div');row.className='rt144-row';row.append(btn('Smart Layout…',openSmartLayout),btn(itemGroup(selected[0])?'Desagrupar':'Agrupar',()=>itemGroup(selected[0])?ungroup():group()));c.appendChild(row);
      if(locked===arr.length)c.appendChild(btn('Desbloquear todos',()=>lockSelection(false),'wide'));else if(locked===0)c.appendChild(btn('Bloquear todos',()=>lockSelection(true),'wide'));else{const mixed=document.createElement('div');mixed.className='rt1551-mixed-lock';mixed.innerHTML=`<span>${locked} bloqueados · ${arr.length-locked} desbloqueados</span>`;mixed.append(btn('Bloquear todos',()=>lockSelection(true)),btn('Desbloquear todos',()=>lockSelection(false)));c.appendChild(mixed)}
      const adv=document.createElement('details');adv.className='rt1410-advanced';adv.innerHTML='<summary>Mais ações</summary>';adv.appendChild(btn('Excluir seleção',removeSelection,'danger wide'));c.appendChild(adv);return}
  }
  function renderSmartObjectInspector(c,it){
    const rec=entityRecord(it.objectKind,it.objectId),usage=entityInstances(it.objectKind,it.objectId);sectionTitle(c,'Objeto');
    if(!rec){const w=document.createElement('div');w.className='rt153-missing';w.innerHTML=`<b>Referência ausente</b><span>A instância aponta para uma entidade que não existe mais no Service Graph.</span>`;w.appendChild(btn('Reconectar entidade',()=>showGraphPicker(it.objectKind,it),'primary wide'));c.appendChild(w);return}
    liveField(c,'Nome',entityTitle(it.objectKind,rec),v=>setEntityTitle(it.objectKind,it.objectId,v),v=>setEntityTitle(it.objectKind,it.objectId,v),'Renomear '+smartLabel(it.objectKind));
    if(it.objectKind!=='problem'){const dl=it.objectKind==='touchpoint'?'Canal / contexto':it.objectKind==='stage'?'Ação do cliente':it.objectKind==='emotion'?'Nota / evidência emocional':'Descrição',dv=it.objectKind==='emotion'?(rec.note||''):entityDescription(it.objectKind,rec);textareaField(c,dl,dv,v=>{markEdit('Editar entidade');setEntityDescription(it.objectKind,it.objectId,v);save()})}
    if(it.objectKind==='touchpoint'){const channels=Object.values(entityCollection('channel')||{}),opts=[['','Sem canal'],...channels.map(ch=>[ch.id,entityTitle('channel',ch)])];selectField(c,'Canal',rec.channelId||'',opts,v=>{markEdit('Alterar canal');rec.channelId=v;rec.channel=v?channelTitle(v):rec.channel;rec.updatedAt=new Date().toISOString();save()})}
    if(['frontstage','backstage','process','system'].includes(it.objectKind)){field(c,'Responsável',rec.owner||'',v=>{markEdit('Alterar responsável');rec.owner=v;rec.updatedAt=new Date().toISOString();save()});if(it.objectKind!=='system')field(c,'SLA / tempo esperado',rec.sla||'',v=>{markEdit('Alterar SLA');rec.sla=v;rec.updatedAt=new Date().toISOString();save()});if(it.objectKind==='process'){field(c,'Entrada',rec.input||'',v=>{rec.input=v;rec.updatedAt=new Date().toISOString();save()});field(c,'Saída',rec.output||'',v=>{rec.output=v;rec.updatedAt=new Date().toISOString();save()})}}
    if(it.objectKind==='emotion'){selectField(c,'Intensidade',String(rec.score??0),[['-2','Muito negativa'],['-1','Negativa'],['0','Neutra'],['1','Positiva'],['2','Muito positiva']],v=>{markEdit('Alterar emoção');rec.score=Number(v);rec.title=emotionLabel(rec.score);rec.updatedAt=new Date().toISOString();save()});const stages=orderedStages().map(s=>[s.id,s.title]);selectField(c,'Etapa',rec.stageId||'',stages,v=>{markEdit('Alterar etapa da emoção');rec.stageId=v;save()})}
    if(['need','expectation','metric'].includes(it.objectKind)){const stages=orderedStages().map(s=>[s.id,s.title]);selectField(c,'Etapa',rec.stageId||'',stages,v=>{markEdit('Alterar etapa');rec.stageId=v;invalidateViewLayout('journey');save()})}
    if(it.objectKind==='metric'){sectionTitle(c,'Dados da métrica');field(c,'Valor',String(rec.value??''),v=>{markEdit('Editar métrica');rec.value=v;save()});field(c,'Unidade',rec.unit||'',v=>{markEdit('Editar métrica');rec.unit=v;save()});field(c,'Meta',String(rec.target??''),v=>{markEdit('Editar métrica');rec.target=v;save()});selectField(c,'Direção',rec.direction||'higher',[['higher','Maior é melhor'],['lower','Menor é melhor'],['target','Faixa/meta']],v=>{rec.direction=v;save()})}
    if(it.objectKind==='evidence'){sectionTitle(c,'Força da evidência');selectField(c,'Confiança',rec.confidence||'hypothesis',[['hypothesis','○ Hipótese'],['partial','◐ Evidência parcial'],['evidenced','● Evidenciado']],v=>{markEdit('Alterar confiança da evidência');rec.confidence=v;rec.updatedAt=new Date().toISOString();save()});field(c,'Fonte / pesquisa',rec.source||'',v=>{rec.source=v;rec.updatedAt=new Date().toISOString();save()});field(c,'Amostra / volume',String(rec.sampleSize||''),v=>{rec.sampleSize=v;rec.updatedAt=new Date().toISOString();save()});selectField(c,'Meio da evidência',rec.evidenceMedium||'operational',[['physical','Física'],['digital','Digital'],['human','Humana'],['documentary','Documental'],['operational','Operacional']],v=>{rec.evidenceMedium=v;rec.updatedAt=new Date().toISOString();save()})}
    if(['touchpoint','emotion','evidence','problem','opportunity','customerAction','need','expectation','metric'].includes(it.objectKind)){sectionTitle(c,'Cenário da experiência');selectField(c,'Estado',journeyStateForRecord(rec),[['current','Atual'],['future','Futuro'],['both','Atual + Futuro']],v=>{rec.experienceState=v;rec.updatedAt=new Date().toISOString();invalidateViewLayout('journey');save(false);if((pref().layoutMode||'free')==='journey')applyLayout('journey',true)})}
    if(['stage','touchpoint','emotion','evidence','problem','opportunity','customerAction','need','expectation','metric'].includes(it.objectKind)){sectionTitle(c,'Relações · Personas');const pg=document.createElement('div');pg.className='rt157-persona-links';const current=new Set((rec.personaIds||[]).concat(rec.personaId?[rec.personaId]:[]));Object.values(entityCollection('persona')||{}).forEach(p=>{const lab=document.createElement('label');lab.innerHTML=`<input type="checkbox" ${current.has(p.id)?'checked':''}><span>${esc(entityTitle('persona',p))}</span>`;lab.querySelector('input').onchange=e=>{markEdit('Relacionar persona');if(it.objectKind==='emotion'){if(e.target.checked)rec.personaId=p.id}else{const s=new Set(rec.personaIds||[]);e.target.checked?s.add(p.id):s.delete(p.id);rec.personaIds=[...s]}rec.updatedAt=new Date().toISOString();save()};pg.appendChild(lab)});c.appendChild(pg)}
    if((pref().layoutMode||'free')==='service'&&['frontstage','backstage','process','system','resource','touchpoint'].includes(it.objectKind)){const layer=serviceFrameLayerForItem(it),links=SERVICE_OPERATION_DEFS.map(def=>[def,operationalIds(rec,def.field).length]);sectionTitle(c,'Contexto operacional');const op=document.createElement('div');op.className='bo1205-inspector-operation';op.innerHTML=`<div><b>${serviceVisibilityForLayer(layer)==='customer-visible'?'Visível ao cliente':'Operação interna'}</b><span>${esc(SERVICE_FRAME_LAYERS.find(x=>x.key===layer)?.label||layer)}</span></div><p>${links.map(([def,n])=>`${n} ${def.plural.toLowerCase()}`).join(' · ')}</p>`;op.appendChild(btn('Editar relações operacionais',()=>showOperationalLinks(it),'primary wide'));c.appendChild(op)}
    const scenarioApi=runtime.api('serviceLayers');if(scenarioApi?.appendScenarioControl){sectionTitle(c,'Cenários');scenarioApi.appendScenarioControl(c,it.objectKind,it.objectId)}
    field(c,'Responsável',rec.owner||'',v=>{markEdit('Editar responsável');rec.owner=v;rec.updatedAt=new Date().toISOString();save()});
    field(c,'Tags',(rec.tags||[]).join(', '),v=>{markEdit('Editar tags');rec.tags=String(v||'').split(',').map(x=>x.trim()).filter(Boolean);rec.updatedAt=new Date().toISOString();save()});
    const box=document.createElement('div');box.className='rt153-entitybox';box.innerHTML=`<div><span>${esc(smartLabel(it.objectKind))}</span><code>${esc(it.objectId)}</code></div><p><b>${usage.length}</b> instância(s) em <b>${new Set(usage.map(u=>u.boardId)).size}</b> quadro(s). Alterações no conteúdo são globais; posição, tamanho e cor são locais desta instância.</p>`;c.appendChild(box);
    sectionTitle(c,'Relações · Instâncias');const list=document.createElement('div');list.className='rt153-usage';usage.slice(0,8).forEach(u=>{const b=document.createElement('button');b.innerHTML=`<span><b>${esc(u.boardName)}</b><small>${u.itemId===it.id&&u.boardId===boardId?'Esta instância':'Abrir instância'}</small></span><em>◎</em>`;b.disabled=u.itemId===it.id&&u.boardId===boardId;b.onclick=()=>switchToInstance(u);list.appendChild(b)});c.appendChild(list);
    const row=document.createElement('div');row.className='rt144-row';row.append(btn('Abrir origem',()=>openSmartObjectOrigin(it),'primary'),btn('Nova representação',()=>addSmart(it.objectKind,it.objectId)),btn('Explorar relações',showGraphBrowser));c.appendChild(row);
    const removeBox=document.createElement('div');removeBox.className='bo1193-delete-choices';removeBox.innerHTML='<small>REMOVER OU EXCLUIR</small><span>Remover do quadro mantém o objeto no serviço. Excluir do serviço remove todas as representações e relações dependentes.</span>';removeBox.append(btn('Remover do quadro',removeSelection,'wide'),btn('Excluir do serviço…',()=>deleteEntityFromService(it),'danger wide'));c.appendChild(removeBox);
    const d=document.createElement('details');d.className='rt1410-advanced';d.innerHTML='<summary>Vínculo com a entidade</summary>';d.appendChild(btn('Duplicar como nova entidade',()=>cloneEntityForInstance(it),'wide'));d.appendChild(btn('Transformar em objeto livre',()=>detachSmart(it),'wide'));c.appendChild(d)
  }
  function renderBoardInspector(c){
    liveField(c,'Nome do quadro',board().name,v=>{board().name=v},v=>{board().name=String(v||'').trim()||'Whiteboard'},'Renomear quadro');const mode=pref().layoutMode||'free',d=viewDef(mode),box=document.createElement('div');box.className='rt144-infobox rt154-view-infobox';box.innerHTML=`<small>Visualização atual</small><b>${d.icon} ${d.label}</b><p>${d.description}</p>`;c.appendChild(box);c.appendChild(btn('Gerenciar visualizações',showVisualizationEngine,'primary wide'));c.appendChild(btn('Filtros e visibilidade',showViewFilters,'wide'));c.appendChild(btn('Visualizações salvas',showSavedViews,'wide'));sectionTitle(c,'Experiência do editor');toggle(c,'Abrir Inspector ao selecionar',whiteboardUxState().autoInspector!==false,v=>{whiteboardUxState().autoInspector=v;save(false);renderAll()});toggle(c,'Mostrar Readiness no cabeçalho',whiteboardUxState().showReadiness!==false,v=>{whiteboardUxState().showReadiness=v;save(false);renderAll()});c.appendChild(btn('Entender Readiness',showReadinessDetails,'wide'));
    if(mode==='flow')selectField(c,'Direção do fluxo',viewEnginePref().flowDirection||'horizontal',[['horizontal','Horizontal'],['vertical','Vertical']],v=>{viewEnginePref().flowDirection=v;invalidateViewLayout('flow');save(false);applyLayout('flow',true)});
    if(mode==='journey'){c.appendChild(btn('Abrir Journey Studio',showJourneyStudio,'primary wide'));sectionTitle(c,'Experiência da Jornada');const personas=Object.values(entityCollection('persona')||{}).map(p=>[p.id,entityTitle('persona',p)]);selectField(c,'Persona ativa',journeyPrimitiveState().activePersonaId||'',personas,v=>{journeyPrimitiveState().activePersonaId=v;invalidateViewLayout('journey');save(false);applyLayout('journey',true)});toggle(c,'Curva emocional',journeyPrimitiveState().showEmotionCurve!==false,v=>{journeyPrimitiveState().showEmotionCurve=v;save()});const ebox=document.createElement('div');ebox.className='rt157-experience-summary';const emos=orderedStages().map(st=>emotionForStage(st.id)).filter(Boolean);ebox.innerHTML=`<b>Emotion Curve</b><span>${emos.length}/${orderedStages().length} etapas com emoção · ${esc(personaTitle(journeyPrimitiveState().activePersonaId))}</span>`;c.appendChild(ebox)}if(mode==='blueprint'){const sm=blueprintStudioSummary(),ebox=document.createElement('div');ebox.className='rt180-blueprint-summary';ebox.innerHTML=`<b>Blueprint ${sm.coverage}% estruturado</b><span>${sm.frontstage} frontstage · ${sm.backstage} backstage · ${sm.process} processos · ${sm.system} sistemas</span>`;c.appendChild(ebox);c.appendChild(btn('Abrir configurações do Blueprint',()=>{showInspector=false;inspectorMode='selection';showBlueprintDocument=true;blueprintDocumentTab='structure';renderAll()},'primary wide'))}
    toggle(c,'Grade visual',pref().gridVisible,v=>{pref().gridVisible=v;save()});toggle(c,'Snap na grade',pref().snapToGrid,v=>{pref().snapToGrid=v;save()});toggle(c,'Guias inteligentes',pref().smartGuides!==false,v=>{pref().smartGuides=v;save()});const arch=document.createElement('div');arch.className='rt1410-architecture';const gs=graphStats(),saved=['free','service','flow','journey','blueprint'].filter(v=>viewLayouts()[v]?.items).length;arch.innerHTML=`<b>Entity × Instance × View</b><span>Entidades e conteúdo são globais. Cada view mantém somente sua representação espacial.</span><div class="rt153-boardstats"><i>${gs.entities} entidades</i><i>${gs.instances} instâncias</i><i>${saved}/5 layouts salvos</i>${gs.missing?`<i class="warn">${gs.missing} ausentes</i>`:''}</div>`;c.appendChild(arch);c.appendChild(btn('Explorar relações do serviço',showGraphBrowser,'wide'));c.append(btn('Trazer Jornada…',showJourneyImport,'wide'),btn('Reorganizar visualização atual',()=>{invalidateViewLayout(mode);applyLayout(mode,true)},'wide'),btn('Smart Layout…',openSmartLayout,'wide'),btn('Restaurar layout anterior',restoreSmartLayout,'wide'),btn('Adicionar Section',()=>addContainer('section','Nova section','blue'),'wide'),btn('Adicionar Swimlane',()=>addContainer('swimlane','Nova swimlane','violet'),'wide'),btn('Ajustar containers automáticos',fitAllAutoContainers,'wide'),btn('Novo quadro por template',showTemplates,'wide'));
  }
  function liveField(p,l,v,onLive,onCommit,label='Editar texto'){const w=document.createElement('label');w.className='rt144-field bo1193-live-field';w.innerHTML=`<span>${esc(l)}</span>`;const i=document.createElement('input');i.value=v||'';i.autocomplete='off';let changed=false;i.oninput=()=>{changed=true;liveTextEditing=true;try{onLive(i.value)}finally{liveTextEditing=false}refreshSelectedItemDom()};i.onblur=()=>{if(!changed)return;changed=false;markEdit(label);onCommit?.(i.value);save(false,{label})};i.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();i.blur()}else if(e.key==='Escape'){e.preventDefault();i.value=v||'';changed=false;i.blur()}};w.appendChild(i);p.appendChild(w);return i}
  function field(p,l,v,on){const w=document.createElement('label');w.className='rt144-field';w.innerHTML=`<span>${esc(l)}</span>`;const i=document.createElement('input');i.value=v||'';i.onchange=()=>on(i.value);w.appendChild(i);p.appendChild(w)}
  function textareaField(p,l,v,on){const w=document.createElement('label');w.className='rt144-field';w.innerHTML=`<span>${esc(l)}</span>`;const i=document.createElement('textarea');i.value=v||'';let changed=false;i.oninput=()=>{changed=true;liveTextEditing=true;try{on(i.value)}finally{liveTextEditing=false}refreshSelectedItemDom()};i.onblur=()=>{if(!changed)return;changed=false;markEdit('Editar texto');save(false,{label:'Editar texto'})};w.appendChild(i);p.appendChild(w)}
  function selectField(p,l,v,opts,on){const w=document.createElement('label');w.className='rt144-field';w.innerHTML=`<span>${esc(l)}</span>`;const s=document.createElement('select');opts.forEach(([a,b])=>{const o=document.createElement('option');o.value=a;o.textContent=b;o.selected=v===a;s.appendChild(o)});s.onchange=()=>on(s.value);w.appendChild(s);p.appendChild(w)}
  function toggle(p,l,v,on){const r=document.createElement('div');r.className='rt144-toggle';r.innerHTML=`<span>${esc(l)}</span><button class="${v?'on':''}"><i></i></button>`;r.querySelector('button').onclick=()=>on(!v);p.appendChild(r)}

  function itemElementById(id){return [...(overlay?.querySelectorAll?.('.rt144-item')||[])].find(el=>el.dataset.id===id)||null}
  function refreshSelectedItemDom(){if(selected.length!==1)return;const it=board()?.items?.[selected[0]],el=it&&itemElementById(it.id);if(!it||!el)return;const vk=visualKind(it),c=content(it);if(vk==='note'||vk==='card'||it.kind==='smart'){const title=el.querySelector('.itemtitle');if(title)title.textContent=c.title||''}else if(vk==='shape'){const span=el.querySelector('.rt149-shapeinner span');if(span)span.textContent=it.text||''}else if(vk==='text'){const rich=el.querySelector('.rt149-rich');if(rich){rich.textContent=it.text||'';rich.style.whiteSpace='pre-wrap'}}else if(vk==='icon'){const lab=el.querySelector('.rt149-iconlabel');if(lab)lab.textContent=it.iconLabel||''}}
  function updateItemGeometryDom(ids){for(const id of ids||[]){const it=board()?.items?.[id],el=it&&itemElementById(id);if(!it||!el)continue;el.style.left=it.x+'px';el.style.top=it.y+'px';el.style.width=it.width+'px';el.style.height=it.height+'px'}}
  function syncSelectionDom(){if(!overlay)return;for(const el of $$('.rt144-item',overlay))el.classList.toggle('selected',selected.includes(el.dataset.id))}
  function rectanglesOverlap(a,b,gap=12){return !(a.x+a.width+gap<=b.x||b.x+b.width+gap<=a.x||a.y+a.height+gap<=b.y||b.y+b.height+gap<=a.y)}
  function findOpenPlacement(base,size){const snap=pref().snapToGrid!==false,stepX=gridSnap(size.width+48,snap),stepY=gridSnap(size.height+48,snap),existing=Object.values(board()?.items||{}).filter(it=>!isHidden(it));const test=(x,y)=>{const r={x:Math.max(0,gridSnap(x,snap)),y:Math.max(0,gridSnap(y,snap)),width:size.width,height:size.height};return existing.some(it=>rectanglesOverlap(r,it))?null:r};for(let row=0;row<8;row++)for(let col=0;col<6;col++){const r=test(base.x+col*stepX,base.y+row*stepY);if(r)return{x:r.x,y:r.y}}for(let ring=1;ring<=8;ring++){for(const [dx,dy] of [[ring,0],[0,ring],[-ring,0],[0,-ring],[ring,ring],[-ring,ring]]){const r=test(base.x+dx*stepX,base.y+dy*stepY);if(r)return{x:r.x,y:r.y}}}return{x:Math.max(0,gridSnap(base.x+stepX,snap)),y:Math.max(0,gridSnap(base.y+stepY,snap))}}
  function center(){const v=$('.rt144-view',overlay),r=v?.getBoundingClientRect()||{width:900,height:700};return{x:Math.max(40,gridSnap((r.width/2-pan.x)/zoom-125,pref().snapToGrid)),y:Math.max(40,gridSnap((r.height/2-pan.y)/zoom-70,pref().snapToGrid))}}
  function addFree(shape,semantic,text,t='slate',point=null,size=null){
    markEdit('Adicionar '+freeLabel(semantic||shape));
    const id=uid('item');
    const defaults=shape==='text'?{width:340,height:92}:shape==='card'?{width:280,height:160}:shape==='shape'?{width:240,height:150}:shape==='image'?{width:360,height:240}:shape==='link'?{width:300,height:150}:shape==='file'?{width:300,height:140}:shape==='icon'?{width:160,height:160}:{width:250,height:150};
    const d=size||defaults,vk=shape==='note'?'note':shape,base=point||center(),p=point?base:findOpenPlacement(base,d);
    const it={id,instanceId:id,entityRef:null,kind:'free',shape,visualKind:vk,semantic,tone:t,text,x:p.x,y:p.y,width:d.width,height:d.height,z:maxZ()+1};
    if(vk==='text')it.textStyle={variant:'body',align:'left',bold:false,italic:false};
    if(vk==='note'){it.tags=[];it.checked=false;it.noteSize='medium'}
    if(vk==='card'){it.description='Descrição do card';it.status='';it.badge=''}
    if(vk==='shape')it.shapeStyle='rounded';
    if(vk==='icon'){it.icon='★';it.iconLabel=text||'Ícone'}
    board().items[id]=it;selected=[id];selectedEdge=null;tool='select';showLibrary=false;showInspector=!['note','text'].includes(vk);inspectorMode='selection';serviceCompositionState().experienceMode='free';serviceCompositionState().showRecipePrompt=false;updateFrameMembership([id]);save();if(['note','text'].includes(vk))setTimeout(()=>{const el=overlay?.querySelector('[data-id=\"'+id+'\"]');if(el)startInlineRename(board().items[id],el)},0);return it;
  }
  function addShape(style='rounded',point=null){const it=addFree('shape','shape','',style==='circle'?'emerald':style==='diamond'?'violet':'slate',point,style==='circle'?{width:180,height:180}:{width:240,height:150});it.shapeStyle=style;save()}
  async function promptLink(point=null){const raw=await promptDialog('Adicionar link','URL','https://','https://exemplo.com');if(!raw)return;addLinkItem(raw,point)}
  function addLinkItem(url,point=null){let u=String(url||'').trim();if(!/^https?:\/\//i.test(u))u='https://'+u;const it=addFree('link','link','Link','violet',point,{width:300,height:150});it.link={url:u,title:urlDomain(u)||'Novo link',domain:urlDomain(u)};it.text=it.link.title;save()}
  function pickImage(point=null){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files?.[0];if(f)readImageFile(f,point)};i.click()}
  function readImageFile(file,point=null){if(!file.type.startsWith('image/'))return;const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(img,0,0,w,h);let dataUrl;try{dataUrl=cv.toDataURL(file.type==='image/png'&&file.size<1200000?'image/png':'image/jpeg',.84)}catch{dataUrl=String(fr.result)}const ratio=w/h,displayW=Math.min(520,Math.max(240,w)),displayH=clamp(displayW/ratio,160,420),it=addFree('image','image',file.name,'emerald',point,{width:displayW,height:displayH});it.asset={name:file.name,mime:file.type,size:file.size,dataUrl};it.caption='';save()};img.src=String(fr.result)};fr.readAsDataURL(file)}
  function pickFile(point=null){const i=document.createElement('input');i.type='file';i.onchange=()=>{const f=i.files?.[0];if(f)addFileItem(f,point)};i.click()}
  function addFileItem(file,point=null){const it=addFree('file','file',file.name,'slate',point,{width:310,height:140});it.asset={name:file.name,mime:file.type||'application/octet-stream',size:file.size,lastModified:file.lastModified};save();toast('Arquivo adicionado como referência visual.')}
  function showIconPicker(point=null){const m=modalShell('Adicionar ícone','Escolha um símbolo visual.');const g=document.createElement('div');g.className='rt149-iconpicker';m.box.appendChild(g);['★','✓','!','?','♥','⚙','☁','✉','☎','⌂','◆','●','▲','↗','⚑','☰','◎','⏱','€','$','⚡','♟','☕','✦'].forEach(ic=>{const b=btn(ic,()=>{const it=addFree('icon','icon','Ícone','amber',point,{width:160,height:160});it.icon=ic;it.iconLabel='Ícone';save();m.root.remove()},'rt149-iconpick');g.appendChild(b)})}
  function fileGlyph(mime=''){if(mime.includes('pdf'))return 'PDF';if(mime.includes('spreadsheet')||mime.includes('excel'))return 'XLS';if(mime.includes('presentation')||mime.includes('powerpoint'))return 'PPT';if(mime.includes('word')||mime.includes('document'))return 'DOC';return 'FILE'}
  function formatBytes(n){if(!n)return '0 KB';if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(1)+' MB'}
  function renderVisualInspector(c,it,vk){
    if(vk==='linked'){field(c,'Título',it.text||linkedTargetTitle(it.linkedRef),v=>{it.text=v;save()});const box=document.createElement('div');box.className='rt156-linked-info';box.innerHTML=`<small>Destino vinculado</small><b>${esc(linkedTargetTitle(it.linkedRef))}</b><span>${esc(it.linkedRef?.type||'destino')}</span>`;c.appendChild(box);c.append(btn('Abrir destino',()=>openLinkedTarget(it),'primary wide'),btn('Alterar vínculo',()=>showLinkedObjectPicker(it),'wide'));return}
    if(vk==='image'){field(c,'Legenda',it.caption||'',v=>{it.caption=v;save()});const box=document.createElement('div');box.className='rt149-assetinfo';box.innerHTML=`<b>${esc(it.asset?.name||'Imagem')}</b><span>${esc(formatBytes(it.asset?.size||0))} · ${esc(it.asset?.mime||'imagem')}</span>`;c.appendChild(box);c.appendChild(btn('Substituir imagem',()=>pickImageAtItem(it),'wide'));return}
    if(vk==='link'){field(c,'Título',it.link?.title||it.text||'',v=>{it.link ||= {};it.link.title=v;it.text=v;save()});field(c,'URL',it.link?.url||'',v=>{it.link ||= {};it.link.url=v;it.link.domain=urlDomain(v);save()});c.appendChild(btn('Abrir link',()=>{const u=it.link?.url;if(u)window.open(u,'_blank','noopener')},'wide'));return}
    if(vk==='file'){field(c,'Nome',it.asset?.name||it.text||'',v=>{it.asset ||= {};it.asset.name=v;it.text=v;save()});const box=document.createElement('div');box.className='rt149-assetinfo';box.innerHTML=`<b>${esc(fileGlyph(it.asset?.mime))}</b><span>${esc(formatBytes(it.asset?.size||0))} · referência local</span>`;c.appendChild(box);c.appendChild(btn('Substituir arquivo',()=>pickFileAtItem(it),'wide'));return}
    if(vk==='icon'){field(c,'Legenda',it.iconLabel||'',v=>{it.iconLabel=v;it.text=v;save()});field(c,'Símbolo',it.icon||'★',v=>{it.icon=v.slice(0,4);save()});return}
    textareaField(c,'Conteúdo',it.text||'',v=>{it.text=v;save()});
    if(vk==='text'){sectionTitle(c,'Tipografia');selectField(c,'Estilo',it.textStyle?.variant||'body',[['title','Título'],['subtitle','Subtítulo'],['body','Corpo'],['caption','Legenda']],v=>{it.textStyle ||= {};it.textStyle.variant=v;save()});selectField(c,'Alinhamento',it.textStyle?.align||'left',[['left','Esquerda'],['center','Centro'],['right','Direita']],v=>{it.textStyle ||= {};it.textStyle.align=v;save()});toggle(c,'Negrito',!!it.textStyle?.bold,v=>{it.textStyle ||= {};it.textStyle.bold=v;save()});toggle(c,'Itálico',!!it.textStyle?.italic,v=>{it.textStyle ||= {};it.textStyle.italic=v;save()})}
    if(vk==='note'){sectionTitle(c,'Post-it');toggle(c,'Concluído',!!it.checked,v=>{it.checked=v;save()});field(c,'Tags',(it.tags||[]).join(', '),v=>{it.tags=v.split(',').map(x=>x.trim()).filter(Boolean).slice(0,6);save()});selectField(c,'Tamanho',it.noteSize||'medium',[['small','Pequeno'],['medium','Médio'],['large','Grande']],v=>{it.noteSize=v;const z={small:[200,120],medium:[250,150],large:[340,210]}[v];it.width=z[0];it.height=z[1];save()})}
    if(vk==='card'){sectionTitle(c,'Card');textareaField(c,'Descrição',it.description||'',v=>{it.description=v;save()});field(c,'Badge',it.badge||'',v=>{it.badge=v;save()});field(c,'Status',it.status||'',v=>{it.status=v;save()})}
    if(vk==='shape'){sectionTitle(c,'Forma');selectField(c,'Geometria',it.shapeStyle||'rounded',[['rectangle','Retângulo'],['rounded','Arredondado'],['circle','Círculo'],['diamond','Losango']],v=>{it.shapeStyle=v;if(v==='circle'){it.height=it.width=Math.max(160,Math.min(it.width,it.height))}save()})}
  }
  function pickImageAtItem(it){const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=()=>{const f=i.files?.[0];if(!f)return;const fr=new FileReader();fr.onload=()=>{const img=new Image();img.onload=()=>{const cv=document.createElement('canvas'),max=1600,scale=Math.min(1,max/Math.max(img.width,img.height));cv.width=Math.round(img.width*scale);cv.height=Math.round(img.height*scale);cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);it.asset={name:f.name,mime:f.type,size:f.size,dataUrl:cv.toDataURL(f.type==='image/png'&&f.size<1200000?'image/png':'image/jpeg',.84)};save()};img.src=String(fr.result)};fr.readAsDataURL(f)};i.click()}
  function pickFileAtItem(it){const i=document.createElement('input');i.type='file';i.onchange=()=>{const f=i.files?.[0];if(f){it.asset={name:f.name,mime:f.type||'application/octet-stream',size:f.size,lastModified:f.lastModified};it.text=f.name;save()}};i.click()}
  function handleDrop(e,wrap){e.preventDefault();wrap.classList.remove('rt149-drop-ready');const point=clientToCanvas(e.clientX,e.clientY),files=[...(e.dataTransfer?.files||[])];if(files.length){files.forEach((f,idx)=>{const p={x:point.x+idx*28,y:point.y+idx*28};if(f.type.startsWith('image/'))readImageFile(f,p);else addFileItem(f,p)});return}const url=e.dataTransfer?.getData('text/uri-list')||e.dataTransfer?.getData('text/plain')||'';if(/^https?:\/\//i.test(url.trim()))addLinkItem(url.trim(),point);else if(url.trim())addFree('text','text',url.trim(),'slate',point)}
  function addContainer(type='frame',text=null,t='slate',point=null,size=null){markEdit('Adicionar '+({frame:'Frame',section:'Section',swimlane:'Swimlane'}[type]||'container'));const p=point||center(),id=uid(type),defaults=type==='swimlane'?{width:1180,height:220}:type==='section'?{width:900,height:560}:{width:760,height:340},d=size||defaults;board().items[id]={id,kind:'free',shape:'frame',semantic:type,tone:t,text:text||`Novo ${type}`,containerType:type,padding:24,autoResize:false,collapsed:false,x:p.x,y:p.y,width:d.width,height:d.height,z:minZ()-1};selected=[id];selectedEdge=null;tool='select';showInspector=true;inspectorMode='selection';updateFrameMembership([id]);save()}
  function addSmart(kind,objId,point=null){markEdit('Adicionar '+smartLabel(kind));const p=point||center(),id=uid('smart');board().items[id]={id,instanceId:id,instanceSchemaVersion:2,entityRef:{type:kind,id:objId},entityStatus:entityRecord(kind,objId)?'linked':'missing',presentation:{tone:null},kind:'smart',objectKind:kind,objectId:objId,x:p.x,y:p.y,width:260,height:132,z:maxZ()+1};selected=[id];showLibrary=false;showInspector=true;inspectorMode='selection';updateFrameMembership([id]);save();return id}
  function addEdge(a,b,opts={}){markEdit('Criar conexão');if(a===b)return;const ex=Object.values(board().edges).find(e=>e.fromId===a&&e.toId===b);if(ex){selectedEdge=ex.id;selected=[];connectFrom=null;showInspector=true;renderAll();return}const id=uid('edge');board().edges[id]={id,fromId:a,toId:b,fromHandle:opts.fromHandle||'auto',toHandle:opts.toHandle||'auto',label:'',style:'solid',arrow:'end',route:opts.route||'curve',waypoint:null};connectFrom=null;selected=[];selectedEdge=id;showInspector=true;save()}
  function entityDeleteImpact(kind,id){const plan=deletePlan(graph,kind,id),instances=entityInstances(kind,id),boards=new Set(instances.map(x=>x.boardId));return{plan,instances:instances.length,boards:boards.size,cascade:(plan.cascade||[]).length,detach:(plan.detach||[]).length}}
  async function deleteEntityFromService(it){if(!it||it.kind!=='smart')return false;const rec=entityRecord(it.objectKind,it.objectId);if(!rec)return false;const impact=entityDeleteImpact(it.objectKind,it.objectId),title=entityTitle(it.objectKind,rec)||smartLabel(it.objectKind),parts=[`${impact.instances} representação(ões) em ${impact.boards} quadro(s)`];if(impact.cascade)parts.push(`${impact.cascade} objeto(s) relacionado(s) serão removidos`);if(impact.detach)parts.push(`${impact.detach} relação(ões) serão desvinculadas`);const ok=await confirmDialog(`Excluir ${smartLabel(it.objectKind)} do serviço?`,`“${title}” será removido do serviço inteiro. ${parts.join(' · ')}.`,'Excluir do serviço',true);if(!ok)return false;const before=clone(graph);try{graph=applyDeletePlan(graph,impact.plan)}catch(e){toast(String(e?.message||e));return false}if(!save(false,{label:'Excluir '+smartLabel(it.objectKind)+' do serviço'})){graph=before;return false}selected=[];selectedEdge=null;showInspector=false;renderAll();toast(`${smartLabel(it.objectKind)} excluído do serviço.`);return true}
  function removeItemInstances(ids){const set=new Set(ids);ids.forEach(id=>{delete board().items[id];delete groups()[id];delete frameParents()[id];Object.keys(frameParents()).forEach(cid=>{if(frameParents()[cid]===id)delete frameParents()[cid]})});Object.entries(board().edges).forEach(([id,e])=>{if(set.has(e.fromId)||set.has(e.toId))delete board().edges[id]})}
  function removeSelection(){markEdit(selectedEdge?'Excluir conexão':'Excluir objetos');if(selectedEdge){delete board().edges[selectedEdge];selectedEdge=null;showInspector=false;save();return}const removable=selected.filter(id=>board().items[id]&&!isLocked(board().items[id])),lockedCount=selected.length-removable.length;if(!removable.length){if(lockedCount)toast('A seleção está bloqueada.');return}const set=new Set(removable);removeItemInstances(removable);selected=selected.filter(id=>!set.has(id));showInspector=selected.length>0;if(lockedCount)toast(`${lockedCount} objeto(s) bloqueado(s) foram preservados.`);save()}
  function deleteContainer(id,withChildren=false){markEdit(withChildren?'Excluir container e conteúdo':'Excluir container');const it=board().items[id];if(!isContainer(it))return;const parent=parentFrame(id),kids=childrenOf(id),desc=descendantsOf(id),removeIds=withChildren?[id,...desc]:[id];if(!withChildren)kids.forEach(cid=>setParentFrame(cid,parent||null));const set=new Set(removeIds);removeIds.forEach(x=>{delete board().items[x];delete groups()[x];delete frameParents()[x]});Object.keys(frameParents()).forEach(cid=>{if(set.has(frameParents()[cid]))setParentFrame(cid,parent&&!set.has(parent)?parent:null)});Object.entries(board().edges).forEach(([eid,e])=>{if(set.has(e.fromId)||set.has(e.toId))delete board().edges[eid]});selected=[];selectedEdge=null;showInspector=false;autoResizeAncestors(parent?[parent]:[]);save();toast(withChildren?'Container e conteúdo excluídos.':'Container excluído; conteúdo preservado.')}
  function duplicateItems(src=null){markEdit('Duplicar objetos');let arr=src||selected.map(id=>board().items[id]).filter(Boolean);if(!arr.length)return;const explicit=new Set(arr.map(x=>x.id));arr=[...arr];arr.filter(isContainer).forEach(it=>descendantsOf(it.id).forEach(cid=>{if(!explicit.has(cid)){const child=board().items[cid];if(child){explicit.add(cid);arr.push(child)}}}));const idMap={},groupMap={},zBase=maxZ()+1;arr.forEach(it=>idMap[it.id]=uid(isContainer(it)?containerType(it):'item'));const created=arr.map((it,idx)=>{const cp=JSON.parse(JSON.stringify(it));cp.id=idMap[it.id];cp.instanceId=cp.id;cp.instanceSchemaVersion=2;if(cp.kind==='smart')cp.entityRef={type:cp.objectKind,id:cp.objectId};cp.x+=36;cp.y+=36;cp.z=zBase+idx;cp.locked=false;cp.hidden=false;const g=itemGroup(it.id);if(g){groupMap[g]||=uid('group');setGroup(cp.id,groupMap[g])}board().items[cp.id]=cp;return cp});const srcIds=new Set(arr.map(x=>x.id));arr.forEach(it=>{const oldParent=parentFrame(it.id);if(oldParent&&idMap[oldParent])setParentFrame(idMap[it.id],idMap[oldParent]);else if(oldParent)setParentFrame(idMap[it.id],oldParent)});Object.values(board().edges).filter(e=>srcIds.has(e.fromId)&&srcIds.has(e.toId)).forEach(e=>{const id=uid('edge');board().edges[id]={...e,id,fromId:idMap[e.fromId],toId:idMap[e.toId]}});const topLevel=arr.filter(it=>!srcIds.has(parentFrame(it.id))).map(it=>idMap[it.id]);selected=topLevel.length?topLevel:created.map(x=>x.id);autoResizeAncestors(created.map(x=>x.id));showInspector=true;save()}
  function group(){markEdit('Agrupar objetos');if(selected.length<2){toast('Selecione pelo menos dois objetos.');return}const g=uid('group');selected.forEach(id=>setGroup(id,g));save()}
  function ungroup(){markEdit('Desagrupar objetos');const gs=new Set(selected.map(itemGroup).filter(Boolean));if(!gs.size){toast('A seleção não pertence a um grupo.');return}Object.keys(board().items).forEach(id=>{if(gs.has(itemGroup(id)))setGroup(id,null)});save()}
  function unlockedSelection(){return selected.map(id=>board().items[id]).filter(it=>it&&!isLocked(it))}
  function lockSelection(v){markEdit(v?'Bloquear objetos':'Desbloquear objetos');selected.forEach(id=>{const it=board().items[id];if(it)it.locked=v});save()}
  function align(mode){markEdit('Alinhar objetos');const arr=unlockedSelection();if(arr.length<2){toast('Selecione pelo menos dois objetos desbloqueados.');return}const minX=Math.min(...arr.map(i=>i.x)),maxX=Math.max(...arr.map(i=>i.x+i.width)),minY=Math.min(...arr.map(i=>i.y)),maxY=Math.max(...arr.map(i=>i.y+i.height));if(mode==='left')arr.forEach(i=>i.x=minX);else if(mode==='hcenter'){const c=(minX+maxX)/2;arr.forEach(i=>i.x=c-i.width/2)}else if(mode==='right')arr.forEach(i=>i.x=maxX-i.width);else if(mode==='top')arr.forEach(i=>i.y=minY);else if(mode==='vmiddle'){const c=(minY+maxY)/2;arr.forEach(i=>i.y=c-i.height/2)}else if(mode==='bottom')arr.forEach(i=>i.y=maxY-i.height);updateFrameMembership(arr.map(i=>i.id));save()}
  function distribute(axis){markEdit('Distribuir objetos');const arr=unlockedSelection();if(arr.length<3){toast('Distribuição precisa de pelo menos três objetos desbloqueados.');return}if(axis==='horizontal'){arr.sort((a,b)=>a.x-b.x);const first=arr[0],last=arr[arr.length-1],inner=arr.slice(1,-1),space=((last.x+last.width)-first.x-arr.reduce((s,i)=>s+i.width,0))/(arr.length-1);let x=first.x+first.width+space;inner.forEach(it=>{it.x=x;x+=it.width+space})}else{arr.sort((a,b)=>a.y-b.y);const first=arr[0],last=arr[arr.length-1],inner=arr.slice(1,-1),space=((last.y+last.height)-first.y-arr.reduce((s,i)=>s+i.height,0))/(arr.length-1);let y=first.y+first.height+space;inner.forEach(it=>{it.y=y;y+=it.height+space})}updateFrameMembership(arr.map(i=>i.id));save()}
  function frameContains(frame,it){const cx=it.x+it.width/2,cy=it.y+it.height/2;const header=containerType(frame)==='swimlane'?44:42;return cx>frame.x+4&&cx<frame.x+frame.width-4&&cy>frame.y+header&&cy<frame.y+frame.height-4}
  function wouldCreateContainerCycle(id,parentId){if(!id||!parentId)return false;if(id===parentId)return true;return descendantsOf(id).includes(parentId)}
  function frameContainsExpanded(frame,it,margin=150){const cx=it.x+it.width/2,cy=it.y+it.height/2;return cx>frame.x-margin&&cx<frame.x+frame.width+margin&&cy>frame.y-margin&&cy<frame.y+frame.height+margin}
  function updateFrameMembership(ids){if((pref().layoutMode||'free')!=='free')return;const frames=Object.values(board().items).filter(isContainer).filter(f=>!isCollapsed(f));ids.forEach(id=>{const it=board().items[id];if(!it)return;const current=parentFrame(id),currentFrame=current&&board().items[current];if(currentFrame?.autoResize&&current!==id&&!wouldCreateContainerCycle(id,current)&&frameContainsExpanded(currentFrame,it)){setParentFrame(id,current);it.z=Math.max(itemZ(it),itemZ(currentFrame)+1);ensureContainerFits(current,false);return}const matches=frames.filter(f=>f.id!==id&&!wouldCreateContainerCycle(id,f.id)&&frameContains(f,it)).sort((a,b)=>a.width*a.height-b.width*b.height);const next=matches[0]?.id||null;setParentFrame(id,next);if(next)it.z=Math.max(itemZ(it),itemZ(board().items[next])+1)});autoResizeAncestors(ids)}
  function autoResizeAncestors(ids){const chain=[];ids.forEach(id=>{const start=isContainer(board().items[id])?id:parentFrame(id);if(start&&!chain.includes(start))chain.push(start);ancestorFrames(id).forEach(p=>{if(!chain.includes(p))chain.push(p)})});chain.forEach(id=>{const f=board().items[id];if(f?.autoResize&&!isCollapsed(f))ensureContainerFits(id,false)})}
  function ensureContainerFits(id,shrink=false){const f=board().items[id];if(!isContainer(f)||isCollapsed(f))return;const kids=childrenOf(id).map(cid=>board().items[cid]).filter(Boolean).filter(it=>!isHidden(it));if(!kids.length)return;const pad=containerPadding(f),header=46;const minX=Math.min(...kids.map(i=>i.x))-pad,minY=Math.min(...kids.map(i=>i.y))-header-pad/2,maxX=Math.max(...kids.map(i=>i.x+i.width))+pad,maxY=Math.max(...kids.map(i=>i.y+i.height))+pad;if(shrink){f.x=Math.max(0,minX);f.y=Math.max(0,minY);f.width=Math.max(280,maxX-f.x);f.height=Math.max(containerType(f)==='swimlane'?140:180,maxY-f.y)}else{const oldRight=f.x+f.width,oldBottom=f.y+f.height,newX=Math.min(f.x,minX),newY=Math.min(f.y,minY);f.x=Math.max(0,newX);f.y=Math.max(0,newY);f.width=Math.max(f.width,oldRight-f.x,maxX-f.x);f.height=Math.max(f.height,oldBottom-f.y,maxY-f.y)}f.expandedHeight=f.height}
  function fitContainerToContent(id,render=true){ensureContainerFits(id,true);autoResizeAncestors([id]);if(render)save()}
  function fitAllAutoContainers(){Object.values(board().items).filter(it=>isContainer(it)&&it.autoResize&&!isCollapsed(it)).sort((a,b)=>descendantsOf(a.id).length-descendantsOf(b.id).length).forEach(it=>ensureContainerFits(it.id,true));save();toast('Containers automáticos ajustados.')}
  function toggleContainerCollapse(id){markEdit('Recolher/expandir container');const it=board().items[id];if(!isContainer(it))return;if(isCollapsed(it)){it.collapsed=false;it.height=Math.max(containerType(it)==='swimlane'?140:180,it.expandedHeight||340)}else{it.expandedHeight=Math.max(it.height,containerType(it)==='swimlane'?140:180);it.collapsed=true;it.height=54}save()}
  function setContainerType(id,type){markEdit('Alterar tipo de container');const it=board().items[id];if(!isContainer(it))return;it.containerType=type;it.semantic=type;if(type==='swimlane'&&it.height<140)it.height=220;if(type==='section'&&it.width<600)it.width=900;save()}
  function selectContainerContent(id){const it=board().items[id];const ids=descendantsOf(id).filter(cid=>!isHidden(board().items[cid]));if(!ids.length){toast('O container não possui conteúdo.');return}if(isCollapsed(it)){it.collapsed=false;it.height=Math.max(containerType(it)==='swimlane'?140:180,it.expandedHeight||340)}selected=ids;selectedEdge=null;showInspector=true;save()}

  function ensureJourney(b=board()){
    const existing=new Set(Object.values(b.items).filter(x=>x.kind==='smart').map(x=>`${x.objectKind}:${x.objectId}`));let col=0,added=[];const j=activeJourney();
    for(const sid of (j?.stageIds||[])){const st=graph.stages[sid];if(!st)continue;const x=220+col*330;if(!existing.has(`stage:${sid}`))added.push({id:uid('stage'),kind:'smart',objectKind:'stage',objectId:sid,x,y:220,width:270,height:132,tone:'blue'});let y=430;(st.touchpointIds||[]).forEach(id=>{if(!existing.has(`touchpoint:${id}`))added.push({id:uid('tp'),kind:'smart',objectKind:'touchpoint',objectId:id,x,y,width:270,height:112,tone:'violet'}),y+=126});y=760;(st.problemIds||[]).forEach(id=>{if(!existing.has(`problem:${id}`))added.push({id:uid('pr'),kind:'smart',objectKind:'problem',objectId:id,x,y,width:270,height:112,tone:'rose'}),y+=126});y=1090;(st.opportunityIds||[]).forEach(id=>{if(!existing.has(`opportunity:${id}`))added.push({id:uid('op'),kind:'smart',objectKind:'opportunity',objectId:id,x,y,width:270,height:120,tone:'emerald'}),y+=134});const emo=emotionForStage(sid);if(emo&&!existing.has(`emotion:${emo.id}`))added.push({id:uid('emo'),kind:'smart',objectKind:'emotion',objectId:emo.id,x,y:610,width:270,height:112,tone:'rose'});col++}added.forEach(it=>b.items[it.id]=it);return added.length
  }
  function showJourneyImport(){
    const m=modalShell('Trazer Jornada','Escolha como os objetos da Jornada entram neste quadro.');const g=document.createElement('div');g.className='rt144-importgrid';m.box.appendChild(g);
    const opts=[['new','Adicionar apenas itens novos','Preserva tudo exatamente onde está.'],['keep','Manter posições existentes','Inclui o que falta sem reorganizar o quadro.'],['journey','Organizar como Journey','Distribui Etapas, Touchpoints, Problemas e Oportunidades por etapa.'],['flow','Organizar como Fluxo','Transforma os objetos em uma sequência operacional.'],['blueprint','Organizar como Blueprint','Organiza as Etapas em colunas e as camadas do serviço em linhas.']];
    opts.forEach(([k,t,d])=>{const b=document.createElement('button');b.innerHTML=`<b>${esc(t)}</b><span>${esc(d)}</span>`;b.onclick=()=>{const n=ensureJourney();if(k==='journey'||k==='flow'||k==='blueprint'||k==='service')applyLayout(k);else{save();toast(n?`${n} objeto(s) adicionados.`:'A Jornada já está neste quadro.')}m.root.remove()};g.appendChild(b)})
  }
  function frameItems(width=3600){return []}
  function removeLanes(){Object.entries(board().items).forEach(([id,it])=>{if(isFrame(it)&&legacyLaneNames.includes(it.text)){delete board().items[id];delete groups()[id];Object.keys(frameParents()).forEach(cid=>{if(frameParents()[cid]===id)delete frameParents()[cid]})}})}
  function addFrames(){invalidateViewLayout('blueprint');applyLayout('blueprint',true)}
  
  const STRUCTURED_GEOMETRY_VERSION=2;
  function structuredLayoutDeviation(mode){
    if(mode!=='journey'&&mode!=='blueprint')return{stale:false,count:0,total:0};
    const m=mode==='journey'?journeyMetrics():blueprintMetrics(),stageIndex=new Map(m.stages.map((st,i)=>[st.id,i]));let count=0,total=0;
    Object.values(board()?.items||{}).filter(it=>!isContainer(it)).forEach(it=>{
      total++;
      if(it.kind==='smart'&&it.objectKind==='stage'){
        const c=stageIndex.get(it.objectId);if(c==null)return;const ex=m.left+c*m.colW+26,ey=m.headerY;if(Math.abs(it.x-ex)>80||Math.abs(it.y-ey)>80)count++;return;
      }
      const sid=stageForItem(it)||m.stages[0]?.id,c=Math.max(0,stageIndex.get(sid)??0),lane=mode==='journey'?journeyLaneForItem(it):laneForItem(it),lanes=mode==='journey'?journeyLanes:blueprintLanes,r=Math.max(0,lanes.findIndex(x=>x.key===lane));
      if((viewVisibility(mode).hiddenLanes||[]).includes(lane)||!m.laneHeights[r])return;
      const minX=m.left+c*m.colW+8,maxX=m.left+(c+1)*m.colW-8,minY=m.rowTops[r]+20,maxY=m.rowTops[r]+m.laneHeights[r]-20;
      const cx=it.x+it.width/2,cy=it.y+it.height/2;if(cx<minX||cx>maxX||cy<minY||cy>maxY)count++;
    });
    const version=Number(meta.structuredGeometryVersion||0);return{stale:version<STRUCTURED_GEOMETRY_VERSION||count>0,count,total,version};
  }
  function reconcileStructuredLayout(mode,notify=true){
    const report=structuredLayoutDeviation(mode);if(!report.stale)return report;
    if(mode==='journey')placeJourneyItems();else if(mode==='blueprint')placeBlueprintItems();
    meta.structuredGeometryVersion=STRUCTURED_GEOMETRY_VERSION;storeCurrentViewLayout(mode);save(false,{content:false,label:'Reconciliar geometria da visualização'});
    if(notify&&report.count)toast(`Layout atualizado · ${report.count} objeto(s) reposicionado(s).`);return{...report,reconciled:true};
  }

  function applyLayout(mode,force=false){
    if(!VIEW_DEFS[mode])mode='free';if(mode==='journey'||mode==='blueprint')ensureJourney();const current=pref().layoutMode||'free';storeCurrentViewLayout(current);pref().layoutMode=mode;rememberContextView(mode);showCanvasPrefs=false;migrateLegacyBlueprintLanes();
    if(!force&&restoreViewLayout(mode)){
      const saved=viewLayouts()[mode]?.items||{},missing=Object.keys(board().items).filter(id=>!saved[id]);
      if(missing.length){if(mode==='service')serviceCompositionLayout();else if(mode==='blueprint')placeBlueprintItems(missing);else if(mode==='journey')placeJourneyItems(missing);else if(mode==='flow')placeFlowItems(missing)}
      if(mode==='blueprint'||mode==='journey')reconcileStructuredLayout(mode,true);
      selected=[];selectedEdge=null;showInspector=false;save(true,{content:false,label:'Alterar visualização'});setTimeout(fitCurrentView,0);if(mode==='blueprint')setTimeout(maybeStartBlueprintLearning,340);toast(`Visualização ${viewLabel(mode)} restaurada.`);return;
    }
    if(mode==='free'){selected=[];selectedEdge=null;showInspector=false;save(true,{content:false,label:'Alterar visualização'});toast('Layout livre ativado.');return}
    if(mode==='service')serviceCompositionLayout();else if(mode==='flow')placeFlowItems();else if(mode==='journey')placeJourneyItems();else if(mode==='blueprint')placeBlueprintItems();
    if(mode==='journey'||mode==='blueprint'||mode==='service'){meta.structuredGeometryVersion=STRUCTURED_GEOMETRY_VERSION;storeCurrentViewLayout(mode)}
    selected=[];selectedEdge=null;showInspector=false;save(true,{content:false,label:'Alterar visualização'});setTimeout(fitCurrentView,0);if(mode==='blueprint')setTimeout(maybeStartBlueprintLearning,340);toast(`Visualização ${viewLabel(mode)} aplicada.`)
  }



  function normalizeBoardKinds(){
    meta.blueprintHome ||= {records:{}};meta.blueprintHome.records ||= {};
    for(const [id,b] of Object.entries(graph.views?.whiteboards||{})){
      if(b.viewKind)continue;
      const mode=meta.boardPrefs?.[id]?.layoutMode;
      if(meta.blueprintHome.records?.[id]||mode==='blueprint')b.viewKind='blueprint';
      else if(mode==='journey'||b.journeyId)b.viewKind='journey';
      else b.viewKind='free';
    }
  }
  function ensureBlueprintHome(){
    meta.blueprintHomeVersion=1;meta.blueprintHome ||= {records:{},viewMode:'cards',statusFilter:'all',search:'',sortBy:'updated',libraryPreset:'all'};meta.blueprintHome.records ||= {};meta.blueprintHome.sortBy ||= 'updated';meta.blueprintHome.libraryPreset ||= 'all';
    const home=meta.blueprintHome,now=new Date().toISOString();
    Object.entries(graph.views?.whiteboards||{}).forEach(([id,b])=>{if(b.viewKind!=='blueprint')return;const explicitJourney=b.journeyId&&graph.journeys?.[b.journeyId]?b.journeyId:'';if(!home.records[id])home.records[id]={id:`blueprint-record-${id}`,boardId:id,name:b.name||'Blueprint',serviceId:b.serviceId||graph.service.id,journeyId:explicitJourney,owner:'',status:'draft',favorite:false,createdAt:graph.service?.createdAt||now,updatedAt:graph.service?.updatedAt||now,lastOpenedAt:id===boardId?now:null,startMode:explicitJourney?'journey':'blank'};else{home.records[id].name=b.name||home.records[id].name||'Blueprint';home.records[id].serviceId=b.serviceId||graph.service.id;if(explicitJourney)home.records[id].journeyId=explicitJourney;else home.records[id].journeyId ||= ''}});
    Object.keys(home.records).forEach(id=>{const b=graph.views?.whiteboards?.[id];if(!b||b.viewKind!=='blueprint')delete home.records[id]});return home
  }
  function blueprintHomeRecord(id=boardId){const h=ensureBlueprintHome();return h.records[id]}
  function blueprintHomeList(){
    if(!graph)load();const h=ensureBlueprintHome(),sum=blueprintStudioSummary(),stages=orderedStages();
    return Object.values(h.records).map(r=>{const b=graph.views.whiteboards[r.boardId];if(!b)return null;const p=meta.boardPrefs?.[r.boardId]||{},sv=meta.structuredViews?.[r.boardId]||{};return{...clone(r),name:b.name||r.name||'Blueprint',serviceName:graph.service?.name||'Serviço',journeyName:graph.journeys?.[r.journeyId]?.name||'Sem jornada vinculada',stageCount:(graph.journeys?.[r.journeyId]?.stageIds||[]).length,itemCount:Object.keys(b.items||{}).length,edgeCount:Object.keys(b.edges||{}).length,coverage:blueprintBoardCoverage(r.boardId),layoutMode:p.layoutMode||'free',savedViews:(sv.savedViews||[]).length,updatedAt:r.updatedAt||graph.service?.updatedAt||r.createdAt}}).filter(Boolean).sort((a,b)=>String(b.lastOpenedAt||b.updatedAt||'').localeCompare(String(a.lastOpenedAt||a.updatedAt||'')))
  }
  function blueprintHomeModel(){
    if(!graph)load();const home=ensureBlueprintHome(),records=blueprintHomeList(),j=graph.journeys?.[graph.service?.journeyIds?.[0]];return{version:'1.0',appVersion:APP_VERSION,service:{id:graph.service?.id,name:graph.service?.name||'Nenhum serviço'},journey:{id:j?.id||'',name:j?.name||'Sem jornada'},journeys:Object.values(graph.journeys||{}).map(j=>({id:j.id,name:j.name})),viewMode:home.viewMode||'cards',statusFilter:home.statusFilter||'all',search:home.search||'',sortBy:home.sortBy||'updated',libraryPreset:home.libraryPreset||'all',records,recent:records.slice(0,4),favorites:records.filter(x=>x.favorite),templates:[{id:'essential',name:'Service Blueprint essencial',description:'Cliente, frontstage, backstage, processos e sistemas.',tone:'emerald'},{id:'service',name:'Blueprint de atendimento',description:'Estrutura focada em atendimento e handoffs.',tone:'blue'},{id:'delivery',name:'Blueprint de delivery',description:'Entrega, operação e sistemas de suporte.',tone:'amber'},{id:'digital',name:'Blueprint digital',description:'Jornada digital, frontstage e integrações.',tone:'violet'}]}
  }
  function blueprintHomeTemplatePayload(id='essential'){
    const payload=builtinTemplatePayload('blueprint'),profiles={
      essential:{evidence:'{Etapa} · evidência',customerAction:'Ação do cliente',frontstage:'Ação visível',backstage:'Ação de bastidor',process:'Processo de suporte',system:'Sistema de suporte'},
      service:{evidence:'Mensagem, protocolo ou ambiente',customerAction:'Solicita atendimento',frontstage:'Atender e orientar o cliente',backstage:'Triar e consultar histórico',process:'Resolver solicitação',system:'CRM / Helpdesk'},
      delivery:{evidence:'Pedido, embalagem e rastreio',customerAction:'Faz e acompanha o pedido',frontstage:'Confirmar e comunicar a entrega',backstage:'Separar, preparar e despachar',process:'Processar pedido e entrega',system:'Pedidos / Logística'},
      digital:{evidence:'Tela, e-mail ou confirmação digital',customerAction:'Navega e conclui uma ação',frontstage:'Interface e mensagens ao usuário',backstage:'Automação e validações internas',process:'Processar transação digital',system:'Site / App / Integrações'}
    },profile=profiles[id]||profiles.essential;Object.values(payload.items||{}).forEach(it=>{const k=it.templateEntityKind;if(k&&profile[k])it.text=profile[k]});return payload
  }
  function insertBlueprintHomeTemplate(id='essential'){
    const payload=replaceTemplateVariables(blueprintHomeTemplatePayload(id),templateDefaults()),semanticPayload=materializeTemplateSemantics(payload);pasteSerial=0;pastePayload(semanticPayload,{x:160,y:120});applyLayout('blueprint',true);return true
  }
  function setBlueprintHomePrefs(patch={}){if(!graph)load();const h=ensureBlueprintHome();Object.assign(h,patch);save(false,{label:'Preferências Blueprint Home'});return blueprintHomeModel()}
  function updateBlueprintHomeRecord(id,patch={}){if(!graph)load();const h=ensureBlueprintHome(),r=h.records[id];if(!r)return null;Object.assign(r,patch,{updatedAt:new Date().toISOString()});const b=graph.views.whiteboards[id];if(b&&patch.name)b.name=String(patch.name);save(false,{label:'Atualizar Blueprint'});if(typeof patch.favorite==='boolean')window.dispatchEvent(new CustomEvent('bo-workspace-preference',{detail:{workspaceId:graph.service.id,targetType:'blueprint',targetId:id,title:r.name||b?.name||'Blueprint',preference:'favorite',enabled:patch.favorite}}));return blueprintHomeModel()}
  function initBlueprintBoard(id,name){
    const now=new Date().toISOString();graph.views.whiteboards[id]={id,serviceId:graph.service.id,name:name||'Novo Blueprint',viewKind:'blueprint',items:{},edges:{}};meta.boardPrefs[id]={layoutMode:'free',gridVisible:true,snapToGrid:true,smartGuides:true,minimap:true};meta.groups[id]={};meta.frameParents[id]={};meta.viewLayouts[id]={};meta.structuredViews ||= {};meta.structuredViews[id]={schemaVersion:2,savedViews:[],filters:{},visibility:{},journey:{}};ensureBlueprintHome().records[id]={id:`blueprint-record-${id}`,boardId:id,name:name||'Novo Blueprint',serviceId:graph.service.id,journeyId:'',owner:'',status:'draft',favorite:false,createdAt:now,updatedAt:now,lastOpenedAt:null,startMode:'blank'};return id
  }
  function createBlueprintFromHome(opts={}){
    if(!graph)load();if(isWorkspaceEmptyGraph(graph))return null;const mode=opts.mode||'blank';
    if(mode==='journey'&&(!opts.journeyId||!graph.journeys?.[opts.journeyId]))return null;
    const journeyName=mode==='journey'?graph.journeys[opts.journeyId]?.name:'';
    const name=String(opts.name||(mode==='journey'?`Blueprint · ${journeyName}`:'Novo Blueprint')).trim()||'Novo Blueprint';let id;
    if(mode==='duplicate'&&opts.sourceBoardId&&graph.views.whiteboards[opts.sourceBoardId]?.viewKind==='blueprint'){const src=graph.views.whiteboards[opts.sourceBoardId];id=uid('blueprint');graph.views.whiteboards[id]={...clone(src),id,name,viewKind:'blueprint'};meta.boardPrefs[id]={...(meta.boardPrefs[opts.sourceBoardId]||{}),layoutMode:'free'};meta.groups[id]=clone(meta.groups?.[opts.sourceBoardId]||{});meta.frameParents[id]=clone(meta.frameParents?.[opts.sourceBoardId]||{});meta.viewLayouts[id]=clone(meta.viewLayouts?.[opts.sourceBoardId]||{});meta.structuredViews ||= {};meta.structuredViews[id]=clone(meta.structuredViews?.[opts.sourceBoardId]||{schemaVersion:2,savedViews:[],filters:{},visibility:{},journey:{}});if(meta.structuredViews[id])meta.structuredViews[id].savedViews=[]}
    else{id=uid('blueprint');initBlueprintBoard(id,name)}
    const rec=ensureBlueprintHome().records[id];rec.owner=String(opts.owner||'').trim();rec.status=opts.status||'draft';rec.journeyId=mode==='journey'?opts.journeyId:'';rec.startMode=mode;rec.templateId=opts.templateId||'';graph.views.whiteboards[id].journeyId=rec.journeyId||undefined;boardId=id;meta.activeBoardId=id;save(false,{label:'Criar Blueprint'});return{id,record:clone(rec)}
  }
  async function openBlueprintFromHome(id,opts={}){
    if(!graph)load();const target=graph.views?.whiteboards?.[id];if(!target||target.viewKind!=='blueprint')return false;boardId=id;meta.activeBoardId=id;const rec=blueprintHomeRecord(id);if(rec){rec.lastOpenedAt=new Date().toISOString();rec.updatedAt=rec.updatedAt||rec.lastOpenedAt}window.dispatchEvent(new CustomEvent('bo-workspace-context',{detail:{workspaceId:graph.service.id,targetType:'blueprint',targetId:id,title:rec?.name||target.name||'Blueprint',subtitle:'Blueprint',activity:'opened',occurredAt:rec?.lastOpenedAt||new Date().toISOString(),context:{serviceId:graph.service.id,journeyId:rec?.journeyId||null}}}));meta.journeyStudio ||= {};if(rec?.journeyId&&graph.journeys?.[rec.journeyId])meta.journeyStudio.activeJourneyId=rec.journeyId;const bs=blueprintStudioState();if(rec){bs.owner=rec.owner||bs.owner||'';bs.status=rec.status||bs.status||'draft'}save(false,{label:'Abrir Blueprint'});await open();boardId=id;meta.activeBoardId=id;const startMode=opts.mode||rec?.startMode||'blank',targetView=opts.view||rec?.lastView||(startMode==='journey'?'blueprint':'free');if(startMode==='blank'){pref().layoutMode='free';renderAll();setTimeout(fit,0)}else if(startMode==='template'&&rec?.templateId&&!Object.keys(board().items||{}).length){insertBlueprintHomeTemplate(rec.templateId);if(targetView!=='blueprint')applyLayout(targetView,false)}else if(startMode==='journey'){applyLayout(targetView==='free'?'blueprint':targetView,false)}else{pref().layoutMode=targetView;renderAll();setTimeout(fitCurrentView,0)}save(false,{label:'Abrir Blueprint'});return true
  }
  function removeBlueprintFromHome(id){if(!graph)load();if(graph.views.whiteboards?.[id]?.viewKind!=='blueprint')return false;delete graph.views.whiteboards[id];delete meta.boardPrefs[id];delete meta.groups[id];delete meta.frameParents[id];delete meta.viewLayouts[id];if(meta.structuredViews)delete meta.structuredViews[id];if(meta.blueprintHome?.records)delete meta.blueprintHome.records[id];if(boardId===id){boardId=Object.keys(graph.views.whiteboards)[0]||null;meta.activeBoardId=boardId}save(false,{label:'Excluir Blueprint'});return true
  }
  function createBoard(name='Novo quadro',seed=null){if(isWorkspaceEmptyGraph(graph)){toast('Crie um serviço antes de criar quadros.');return null}const id=uid('whiteboard');graph.views.whiteboards[id]={id,serviceId:graph.service.id,name,viewKind:seed?.viewKind||'free',items:seed?.items||{},edges:seed?.edges||{}};boardId=id;meta.activeBoardId=id;meta.boardPrefs[id]={layoutMode:seed?.layoutMode||'free',gridVisible:true,snapToGrid:true,smartGuides:true,minimap:true,cardDensity:'normal'};meta.frameParents[id]={};meta.groups[id]={};meta.viewLayouts[id]={};meta.structuredViews ||= {};meta.structuredViews[id]={schemaVersion:2,savedViews:[],filters:{},visibility:{},journey:{}};selected=[];showInspector=false;normalizeLayers();normalizeEdges();normalizeInstances();save(false,{label:'Criar quadro'});return id}
  function duplicateBoard(){const b=board();if(!b)return null;const sourceId=boardId,id=uid('whiteboard');graph.views.whiteboards[id]={...clone(b),id,name:b.name+' — cópia',viewKind:b.viewKind||'free'};meta.boardPrefs[id]={...pref()};meta.groups[id]={...groups()};meta.frameParents[id]={...frameParents()};meta.viewLayouts[id]=clone(viewLayouts());meta.structuredViews ||= {};meta.structuredViews[id]=clone(structuredState());meta.structuredViews[id].savedViews=[];if(b.viewKind==='blueprint'){ensureBlueprintHome();const src=meta.blueprintHome.records[sourceId];meta.blueprintHome.records[id]={...(src?clone(src):{}),id:`blueprint-record-${id}`,boardId:id,name:graph.views.whiteboards[id].name,favorite:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),lastOpenedAt:null}}boardId=id;meta.activeBoardId=id;selected=[];showInspector=false;save(false,{label:'Duplicar quadro'});return id}
  function cleanupBoardState(id){delete meta.boardPrefs?.[id];delete meta.groups?.[id];delete meta.frameParents?.[id];delete meta.viewLayouts?.[id];if(meta.structuredViews)delete meta.structuredViews[id];if(meta.blueprintHome?.records)delete meta.blueprintHome.records[id]}
  async function deleteBoardById(id,{confirm=true}={}){if(!id||!graph.views.whiteboards[id])return false;const target=graph.views.whiteboards[id],count=Object.keys(target.items||{}).length;if(confirm){const ok=await confirmDialog('Excluir quadro?',`O quadro “${target.name||'Whiteboard'}” será removido permanentemente. ${count?`${count} item(ns) visual(is) deixarão este quadro. `:''}Personas, etapas e outros objetos reutilizados em outras visualizações do serviço continuarão disponíveis.`,'Excluir quadro',true);if(!ok)return false}delete graph.views.whiteboards[id];cleanupBoardState(id);if(boardId===id){const ids=Object.keys(graph.views.whiteboards);boardId=ids[0]||null;meta.activeBoardId=boardId;selected=[];selectedEdge=null;showInspector=false}save(false,{label:'Excluir quadro'});if(!boardId&&overlay)close(false);return true}
  async function deleteBoard(){return deleteBoardById(boardId,{confirm:true})}
  function renameBoardById(id,name){if(!graph)load();const b=graph.views.whiteboards?.[id];if(!b)return false;const clean=String(name||'').trim();if(!clean)return false;b.name=clean;b.updatedAt=new Date().toISOString();if(meta.blueprintHome?.records?.[id])meta.blueprintHome.records[id].name=clean;if(boardId===id&&overlay)renderAll();save(false,{label:'Renomear quadro'});return true}
  function duplicateBoardById(id){if(!graph)load();const b=graph.views.whiteboards?.[id];if(!b)return null;const previous=boardId;boardId=id;meta.activeBoardId=id;const newId=duplicateBoard();if(previous&&graph.views.whiteboards[previous]){boardId=previous;meta.activeBoardId=previous;save(false,{content:false,label:'Restaurar quadro ativo'})}return newId}
  function dialogHost(){return overlay||document.body}
  function mountDialog(root){const standalone=!overlay;if(standalone)root.classList.add('rt1120-standalone-modal');dialogHost().appendChild(root);return root}
  function confirmDialog(title,message,confirmLabel='Confirmar',danger=false){return new Promise(resolve=>{let settled=false;const root=document.createElement('div');root.className='rt144-modal rt190-native-dialog';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',title);const box=document.createElement('div');box.className='rt144-modalbox rt190-confirm-dialog';box.innerHTML=`<div class="rt144-panelhead"><div><b>${esc(title)}</b><small>${esc(message)}</small></div><button class="rt144-x" aria-label="Fechar">×</button></div>`;const actions=document.createElement('div');actions.className='rt190-dialog-actions';const finish=v=>{if(settled)return;settled=true;document.removeEventListener('keydown',key,true);root.remove();resolve(v)};const cancel=btn('Cancelar',()=>finish(false));const ok=btn(confirmLabel,()=>finish(true),danger?'danger':'primary');actions.append(cancel,ok);box.appendChild(actions);root.appendChild(box);mountDialog(root);$('.rt144-x',box).setAttribute('aria-label','Fechar diálogo');$('.rt144-x',box).onclick=()=>finish(false);root.onclick=e=>{if(e.target===root)finish(false)};const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(false)}if(e.key==='Tab'){const nodes=[...root.querySelectorAll('button,input,textarea,select')].filter(n=>!n.disabled),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key,true);setTimeout(()=>ok.focus(),0)})}
  function promptDialog(title,label,initial='',placeholder=''){return new Promise(resolve=>{let settled=false;const root=document.createElement('div');root.className='rt144-modal rt190-native-dialog';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',title);const box=document.createElement('div');box.className='rt144-modalbox rt190-prompt-dialog';box.innerHTML=`<div class="rt144-panelhead"><div><b>${esc(title)}</b><small>Preencha o campo abaixo para continuar.</small></div><button class="rt144-x" aria-label="Fechar">×</button></div>`;const form=document.createElement('form');form.className='rt190-prompt-form';form.innerHTML=`<label><span>${esc(label)}</span><input value="${esc(initial)}" placeholder="${esc(placeholder)}"></label><div class="rt190-dialog-actions"><button type="button" data-cancel>Cancelar</button><button type="submit" class="primary">Continuar</button></div>`;box.appendChild(form);root.appendChild(box);mountDialog(root);const input=form.querySelector('input'),finish=v=>{if(settled)return;settled=true;document.removeEventListener('keydown',key,true);root.remove();resolve(v)};form.querySelector('[data-cancel]').onclick=()=>finish(null);form.onsubmit=e=>{e.preventDefault();finish(input.value.trim()||null)};$('.rt144-x',box).onclick=()=>finish(null);root.onclick=e=>{if(e.target===root)finish(null)};const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish(null)}if(e.key==='Tab'){const nodes=[...root.querySelectorAll('button,input')].filter(n=>!n.disabled),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key,true);setTimeout(()=>{input.focus();input.select()},0)})}

  function modalShell(title,subtitle){const root=document.createElement('div');root.className='rt144-modal';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label',title);const box=document.createElement('div');box.className='rt144-modalbox';box.innerHTML=`<div class="rt144-panelhead"><div><b>${esc(title)}</b><small>${esc(subtitle)}</small></div><button class="rt144-x">×</button></div>`;root.appendChild(box);mountDialog(root);$('.rt144-x',box).onclick=()=>root.remove();root.onclick=e=>{if(e.target===root)root.remove()};const focusBack=document.activeElement;const key=e=>{if(!root.isConnected){document.removeEventListener('keydown',key);return}if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();root.remove();focusBack?.focus?.();return}if(e.key==='Tab'){const nodes=[...root.querySelectorAll('button,input,textarea,select,a[href]')].filter(n=>!n.disabled&&n.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus()}}};document.addEventListener('keydown',key,true);return{root,box}}
  function showTemplates(){
    $$('.rt144-modal',overlay).forEach(x=>x.remove());
    const m=modalShell('Biblioteca de templates','Insira no quadro atual, crie um novo quadro ou salve seus próprios modelos.');m.box.classList.add('rt151-template-modal');
    const top=document.createElement('div');top.className='rt151-template-top';top.innerHTML='<input class="rt151-template-search" placeholder="Buscar templates…"><div class="rt151-template-actions"></div>';m.box.appendChild(top);const acts=$('.rt151-template-actions',top);acts.append(btn('Salvar seleção',()=>{m.root.remove();saveAsTemplate('selection')}),btn('Salvar quadro',()=>{m.root.remove();saveAsTemplate('board')}));
    const body=document.createElement('div');body.className='rt151-template-body';body.innerHTML='<nav class="rt151-template-cats"></nav><section class="rt151-template-list"></section>';m.box.appendChild(body);const cats=$('.rt151-template-cats',body),list=$('.rt151-template-list',body),search=$('.rt151-template-search',top);let category='Todos';
    const redraw=()=>{const all=allTemplates(),q=search.value.trim().toLowerCase(),catNames=['Todos',...new Set(all.map(t=>t.category))];cats.innerHTML='';catNames.forEach(c=>{const b=document.createElement('button');b.className=c===category?'active':'';b.innerHTML=`<span>${esc(c)}</span><em>${c==='Todos'?all.length:all.filter(t=>t.category===c).length}</em>`;b.onclick=()=>{category=c;redraw()};cats.appendChild(b)});list.innerHTML='';const visible=all.filter(t=>(category==='Todos'||t.category===category)&&(!q||(t.name+' '+t.description+' '+t.category).toLowerCase().includes(q)));visible.forEach(t=>{const payload=templatePayload(t),card=document.createElement('article');card.className='rt151-template-card';card.innerHTML=`<div class="rt151-template-preview"></div><div class="rt151-template-copy"><div class="rt151-template-badges"><span>${esc(t.category)}</span>${t.builtin?'<em>BLUE OCEAN</em>':'<em>Meu template</em>'}</div><b>${esc(t.name)}</b><p>${esc(t.description||'')}</p><small>${Object.keys(payload.items||{}).length} objetos · ${Object.keys(payload.edges||{}).length} conexões${templateVariables(payload).length?' · variáveis':''}</small></div><div class="rt151-template-card-actions"></div>`;previewTemplate($('.rt151-template-preview',card),payload);const a=$('.rt151-template-card-actions',card);a.append(btn('Inserir no quadro',()=>{m.root.remove();insertTemplatePayload(t,payload,false)},'primary'),btn('Novo quadro',()=>{m.root.remove();insertTemplatePayload(t,payload,true)}));if(!t.builtin)a.append(btn('Excluir',()=>{m.root.remove();removeUserTemplate(t.id)},'danger'));list.appendChild(card)});if(!visible.length)list.innerHTML='<div class="rt151-template-empty"><b>Nenhum template encontrado</b><span>Altere a busca ou salve uma seleção como template.</span></div>'};search.oninput=redraw;redraw();setTimeout(()=>search.focus(),0)
  }
  function template(k){const t=builtinTemplates().find(x=>x.seed===k)||builtinTemplates()[0];insertTemplatePayload(t,templatePayload(t),true)}
  function free(text,semantic,t,x,y,w=250,h=132){return{id:uid('item'),kind:'free',shape:'note',semantic,tone:t,text,x,y,width:w,height:h}}
  function frame(text,t,x){return{id:uid('frame'),kind:'free',shape:'frame',semantic:'section',containerType:'section',padding:28,autoResize:false,collapsed:false,tone:t,text,x,y:180,width:850,height:620}}
  function fitItems(arr){const v=$('.rt144-view',overlay);if(!v||!arr.length)return;const minX=Math.min(...arr.map(i=>i.x)),minY=Math.min(...arr.map(i=>i.y)),maxX=Math.max(...arr.map(i=>i.x+i.width)),maxY=Math.max(...arr.map(i=>i.y+i.height)),w=Math.max(300,maxX-minX),h=Math.max(220,maxY-minY),r=v.getBoundingClientRect(),pad=110;zoom=clamp(Math.min((r.width-pad*2)/w,(r.height-pad*2)/h),.15,1.5);pan={x:(r.width-w*zoom)/2-minX*zoom,y:(r.height-h*zoom)/2-minY*zoom};renderAll()}
  function fitBlueprintWidth(){const v=$('.rt144-view',overlay);if(!v)return;const r=v.getBoundingClientRect(),m=blueprintMetrics(),pad=110;zoom=clamp((r.width-pad*2)/m.width,.55,1.05);pan={x:(r.width-m.width*zoom)/2-90*zoom,y:30-70*zoom};renderAll()}
  function fit(){return fitContent()}
  function fitContent(){const arr=meaningfulExtentItems();if(!arr.length){zoom=.88;pan={x:88,y:78};renderAll();return}fitItems(arr)}
  function fitSelection(){const arr=selected.map(id=>board().items[id]).filter(it=>it&&!isHidden(it)&&!isStructurallyHidden(it));if(!arr.length){toast('Selecione um ou mais objetos visíveis.');return}fitItems(arr)}
  function fitCurrentFrame(){let id=selected.length===1?selected[0]:null,it=id?board().items[id]:null;if(it&&!isContainer(it)){id=parentFrame(id);it=id?board().items[id]:null}if(!it||!isContainer(it)){toast('Selecione um frame ou um objeto dentro dele.');return}fitItems([it]);pushNavigationSnapshot('Ajustar frame')}
  function safeFilename(s){return String(s||'arquivo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,100)||'arquivo'}
  function downloadBlob(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1600)}
  function downloadText(text,name,type='application/json'){downloadBlob(new Blob([text],{type}),name)}
  function backupPayload(){return{format:'realtalent.service-studio.backup',schemaVersion:1,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),project:{serviceId:graph.service?.id||'',serviceName:graph.service?.name||'',boards:Object.keys(graph.views?.whiteboards||{}).length},graph:clone(graph),meta:clone(meta)}}
  function exportFullBackup(){save(false,{label:'Preparar backup'});downloadText(JSON.stringify(backupPayload(),null,2),`Blue-Ocean-Service-Studio-${safeFilename(graph.service?.name||'Projeto')}-backup-v${APP_VERSION}.json`);toast('Backup completo exportado.')}
  function exportGraph(){downloadText(JSON.stringify(graph,null,2),`Blue-Ocean-Service-Studio-${safeFilename(graph.service?.name||'Projeto')}-service-graph.json`);toast('Service Graph exportado.')}
  function expandedScopeIds(scope){const b=board(),ids=new Set();if(scope==='selection'){selected.forEach(id=>{if(b.items[id]){ids.add(id);if(isContainer(b.items[id]))descendantsOf(id).forEach(x=>ids.add(x))}})}else if(scope==='container'){const root=selected.map(id=>b.items[id]).find(isContainer);if(root){ids.add(root.id);descendantsOf(root.id).forEach(x=>ids.add(x))}}else Object.values(b.items||{}).forEach(it=>ids.add(it.id));return ids}
  function exportScopeModel(scope='board',respectFilters=true){const b=board(),ids=expandedScopeIds(scope),items=Object.values(b.items||{}).filter(it=>ids.has(it.id)&&(!respectFilters||itemPassesActiveView(it))&&!isHidden(it)&&!isStructurallyHidden(it));const keep=new Set(items.map(i=>i.id)),edges=Object.values(b.edges||{}).filter(e=>keep.has(e.fromId)&&keep.has(e.toId));return{items,edges,ids:keep,scope,view:pref().layoutMode||'free'}}
  function boardFragment(scope='board'){const m=exportScopeModel(scope,false),items={},edges={},parents={},grps={};m.items.forEach(it=>items[it.id]=clone(it));m.edges.forEach(e=>edges[e.id]=clone(e));m.items.forEach(it=>{const p=parentFrame(it.id);if(p&&m.ids.has(p))parents[it.id]=p;const g=itemGroup(it.id);if(g)grps[it.id]=g});const entities={};m.items.filter(i=>i.kind==='smart').forEach(it=>{const r=entityRecord(it.objectKind,it.objectId);if(r){entities[it.objectKind] ||= {};entities[it.objectKind][it.objectId]=clone(r)}});return{format:'realtalent.service-studio.board-fragment',schemaVersion:1,appVersion:APP_VERSION,exportedAt:new Date().toISOString(),source:{boardId,boardName:board().name,view:pref().layoutMode||'free'},payload:{items,edges,parents,groups:grps,entities}}}
  function exportBoardJson(scope='board'){downloadText(JSON.stringify(boardFragment(scope),null,2),`Blue-Ocean-${safeFilename(board().name)}-${scope}-v${APP_VERSION}.json`);toast('JSON do quadro exportado.')}
  function csvCell(v){const s=Array.isArray(v)?v.join(' | '):typeof v==='object'&&v!==null?JSON.stringify(v):String(v??'');return '"'+s.replace(/"/g,'""')+'"'}
  function exportEntitiesCsv(){const rows=[['Tipo','ID','Título','Descrição','Owner','Tags','Instâncias']];allEntities().forEach(e=>rows.push([smartLabel(e.kind),e.id,e.title,e.description,e.record?.owner||'',(e.record?.tags||[]).join(' | '),e.usage.length]));downloadText('\ufeff'+rows.map(r=>r.map(csvCell).join(';')).join('\n'),`Blue-Ocean-${safeFilename(graph.service?.name||'Projeto')}-entidades.csv`,'text/csv;charset=utf-8');toast('Entidades exportadas em CSV.')}
  function xmlEsc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]))}
  function wrapTextSvg(text,maxChars=28,maxLines=4){const words=String(text||'').trim().split(/\s+/),lines=[];let line='';for(const w of words){const n=(line+' '+w).trim();if(n.length>maxChars&&line){lines.push(line);line=w;if(lines.length>=maxLines-1)break}else line=n}if(line&&lines.length<maxLines)lines.push(line);if(words.join(' ').length>lines.join(' ').length&&lines.length)lines[lines.length-1]=lines[lines.length-1].replace(/[.…]*$/,'')+'…';return lines}
  function toneColor(t){return tone[t]||'#64748b'}
  function visualExportBounds(model){if(model.scope==='board'&&(model.view==='journey'||model.view==='blueprint')){const m=model.view==='journey'?journeyMetrics():blueprintMetrics();return{minX:0,minY:0,maxX:m.width,maxY:m.totalHeight}}if(!model.items.length)return{minX:0,minY:0,maxX:1200,maxY:800};return{minX:Math.min(...model.items.map(i=>i.x))-60,minY:Math.min(...model.items.map(i=>i.y))-90,maxX:Math.max(...model.items.map(i=>i.x+i.width))+60,maxY:Math.max(...model.items.map(i=>i.y+i.height))+60}}
  function structuredSvgBackground(model,b){if(model.scope!=='board'||!['journey','blueprint'].includes(model.view))return'';const m=model.view==='journey'?journeyMetrics():blueprintMetrics(),lanes=model.view==='journey'?journeyLanes:blueprintLanes;let s='';m.stages.forEach((st,i)=>{const x=m.left-90+i*m.colW;s+=`<rect x="${x}" y="35" width="${m.colW}" height="${m.totalHeight-70}" fill="${i%2?'#fbfdff':'#ffffff'}" stroke="#e2e8f0"/><text x="${x+22}" y="72" font-size="11" fill="#64748b">ETAPA ${String(i+1).padStart(2,'0')}</text><text x="${x+22}" y="98" font-size="17" font-weight="700" fill="#0f172a">${xmlEsc(st.title)}</text>`});lanes.forEach((ln,r)=>{if(viewVisibility(model.view).hiddenLanes.includes(ln.key))return;const y=m.rowTops[r]-70,h=m.laneHeights[r];s+=`<rect x="0" y="${y}" width="${m.width}" height="${h}" fill="none" stroke="#e2e8f0"/><rect x="16" y="${y+18}" width="8" height="8" rx="4" fill="${toneColor(ln.tone)}"/><text x="34" y="${y+28}" font-size="14" font-weight="700" fill="#334155">${xmlEsc(ln.label)}</text>`});if(model.view==='blueprint'){[{after:1,label:'Linha de interação'},{after:2,label:'Linha de visibilidade'},{after:3,label:'Linha de interação interna'}].forEach(sp=>{const y=m.rowTops[sp.after]-80;s+=`<line x1="0" y1="${y}" x2="${m.width}" y2="${y}" stroke="#94a3b8" stroke-dasharray="8 6"/><text x="18" y="${y-7}" font-size="10" fill="#64748b">${sp.label}</text>`})}return s}
  function itemSvg(it){const c=content(it),t=itemTone(it)||'slate',stroke=toneColor(t),bg=toneBg[t]||'#fff';if(isContainer(it)){return`<g><rect x="${it.x}" y="${it.y}" width="${it.width}" height="${it.height}" rx="16" fill="${bg}" fill-opacity="0.34" stroke="${stroke}" stroke-width="2" stroke-dasharray="8 6"/><text x="${it.x+18}" y="${it.y+28}" font-size="14" font-weight="700" fill="#334155">${xmlEsc(c.title)}</text></g>`}const title=wrapTextSvg(c.title,Math.max(18,Math.floor(it.width/8.5)),3),sub=wrapTextSvg(c.sub||'',Math.max(20,Math.floor(it.width/7.5)),2);let body='';if(visualKind(it)==='image'&&it.asset?.dataUrl&&isSafeImageDataUrl(it.asset.dataUrl))body+=`<image href="${xmlEsc(it.asset.dataUrl)}" x="${it.x+8}" y="${it.y+34}" width="${it.width-16}" height="${Math.max(40,it.height-48)}" preserveAspectRatio="xMidYMid slice"/>`;else{title.forEach((ln,i)=>body+=`<text x="${it.x+16}" y="${it.y+45+i*20}" font-size="15" font-weight="700" fill="#0f172a">${xmlEsc(ln)}</text>`);sub.forEach((ln,i)=>body+=`<text x="${it.x+16}" y="${it.y+48+title.length*20+i*17}" font-size="11" fill="#64748b">${xmlEsc(ln)}</text>`)}return`<g><rect x="${it.x}" y="${it.y}" width="${it.width}" height="${it.height}" rx="12" fill="${bg}" stroke="${stroke}" stroke-width="2"/><circle cx="${it.x+16}" cy="${it.y+17}" r="4" fill="${stroke}"/><text x="${it.x+28}" y="${it.y+21}" font-size="9" font-weight="700" fill="#64748b">${xmlEsc(semanticLabel(it).toUpperCase())}</text>${body}</g>`}
  function edgeSvg(ed,model){const a=board().items[ed.fromId],b=board().items[ed.toId];if(!a||!b)return'';const x1=a.x+a.width/2,y1=a.y+a.height/2,x2=b.x+b.width/2,y2=b.y+b.height/2,d=ed.route==='orthogonal'?`M ${x1} ${y1} H ${(x1+x2)/2} V ${y2} H ${x2}`:`M ${x1} ${y1} L ${x2} ${y2}`;return`<path d="${d}" fill="none" stroke="#64748b" stroke-width="2" ${ed.style==='dashed'?'stroke-dasharray="7 6"':''} marker-end="url(#rtArrow)"/>${ed.label?`<text x="${(x1+x2)/2}" y="${(y1+y2)/2-7}" font-size="10" fill="#475569">${xmlEsc(ed.label)}</text>`:''}`}
  function buildExportSvg(scope='board',respectFilters=true){const model=exportScopeModel(scope,respectFilters),b=visualExportBounds(model),w=Math.max(320,Math.ceil(b.maxX-b.minX)),h=Math.max(220,Math.ceil(b.maxY-b.minY)),title=`${board().name} · ${viewLabel(model.view)}`;let body=structuredSvgBackground(model,b);model.edges.forEach(e=>body+=edgeSvg(e,model));[...model.items].sort((a,b)=>(a.z||0)-(b.z||0)).forEach(it=>body+=itemSvg(it));return{svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${b.minX} ${b.minY} ${w} ${h}"><defs><marker id="rtArrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#64748b"/></marker></defs><rect x="${b.minX}" y="${b.minY}" width="${w}" height="${h}" fill="#f8fafc"/>${body}<text x="${b.minX+18}" y="${b.minY+26}" font-size="12" fill="#64748b">${xmlEsc(title)}</text></svg>`,width:w,height:h,model}}
  function exportSvg(scope='board',respectFilters=true){const r=buildExportSvg(scope,respectFilters);downloadText(r.svg,`Blue-Ocean-${safeFilename(board().name)}-${scope}.svg`,'image/svg+xml;charset=utf-8');toast('SVG exportado.')}
  async function rasterizeExport(scope='board',respectFilters=true,scale=2){const r=buildExportSvg(scope,respectFilters),blob=new Blob([r.svg],{type:'image/svg+xml'}),u=URL.createObjectURL(blob);try{return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const max=8192,s=Math.min(scale,max/r.width,max/r.height),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(r.width*s));cv.height=Math.max(1,Math.round(r.height*s));const ctx=cv.getContext('2d');ctx.fillStyle='#f8fafc';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(img,0,0,cv.width,cv.height);resolve(cv)};img.onerror=reject;img.src=u})}finally{setTimeout(()=>URL.revokeObjectURL(u),1200)}}
  async function exportPng(scope='board',respectFilters=true){try{const cv=await rasterizeExport(scope,respectFilters,2);cv.toBlob(blob=>{if(blob)downloadBlob(blob,`Blue-Ocean-${safeFilename(board().name)}-${scope}@2x.png`)},'image/png');toast('PNG em alta resolução exportado.')}catch(e){toast('Não foi possível gerar o PNG.') }}
  function concatBytes(parts){let len=0;parts.forEach(p=>len+=p.length);const out=new Uint8Array(len);let o=0;parts.forEach(p=>{out.set(p,o);o+=p.length});return out}
  async function exportPdf(scope='board',respectFilters=true){try{const cv=await rasterizeExport(scope,respectFilters,1.5),data=cv.toDataURL('image/jpeg',.9).split(',')[1],bin=atob(data),jpg=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)jpg[i]=bin.charCodeAt(i);const enc=new TextEncoder(),land=cv.width>=cv.height,pw=land?842:595,ph=land?595:842,margin=24,ratio=Math.min((pw-margin*2)/cv.width,(ph-margin*2)/cv.height),dw=cv.width*ratio,dh=cv.height*ratio,x=(pw-dw)/2,y=(ph-dh)/2,objs=[];objs[1]=enc.encode('<< /Type /Catalog /Pages 2 0 R >>');objs[2]=enc.encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');objs[3]=enc.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);objs[4]=concatBytes([enc.encode(`<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`),jpg,enc.encode('\nendstream')]);const cmds=`q\n${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;objs[5]=enc.encode(`<< /Length ${cmds.length} >>\nstream\n${cmds}endstream`);let parts=[enc.encode('%PDF-1.4\n%RTSS\n')],offsets=[0];for(let i=1;i<=5;i++){offsets[i]=parts.reduce((n,p)=>n+p.length,0);parts.push(enc.encode(`${i} 0 obj\n`),objs[i],enc.encode('\nendobj\n'))}const xref=parts.reduce((n,p)=>n+p.length,0);let xt=`xref\n0 6\n0000000000 65535 f \n`;for(let i=1;i<=5;i++)xt+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';xt+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;parts.push(enc.encode(xt));downloadBlob(new Blob([concatBytes(parts)],{type:'application/pdf'}),`Blue-Ocean-${safeFilename(board().name)}-${scope}.pdf`);toast('PDF exportado.')}catch(e){toast('Não foi possível gerar o PDF.')}}
  function importKind(data){if(data?.format==='realtalent.service-studio.backup'&&data.graph&&data.meta)return'backup';if(data?.format==='realtalent.service-studio.board-fragment'&&data.payload?.items)return'fragment';if(data?.service&&data?.views?.whiteboards)return'legacy-graph';return'unknown'}
  function importStats(data){const k=importKind(data);if(k==='backup'||k==='legacy-graph'){const g=k==='backup'?data.graph:data,boards=Object.values(g.views?.whiteboards||{}),objects=boards.reduce((n,b)=>n+Object.keys(b.items||{}).length,0);return{kind:k,boards:boards.length,objects,entities:(()=>{try{const x=g;let n=Object.keys(x.stages||{}).length+Object.keys(x.touchpoints||{}).length+Object.keys(x.problems||{}).length+Object.keys(x.opportunities||{}).length+Object.keys(x.tasks||{}).length;Object.values(x.entities||{}).forEach(c=>n+=Object.keys(c||{}).length);return n}catch{return 0}})(),version:data.appVersion||data.meta?.appDataVersion||'legado'}}if(k==='fragment')return{kind:k,boards:1,objects:Object.keys(data.payload.items||{}).length,entities:Object.values(data.payload.entities||{}).reduce((n,c)=>n+Object.keys(c||{}).length,0),version:data.appVersion||'—'};return{kind:'unknown',boards:0,objects:0,entities:0,version:'—'}}
  async function importFullProject(data){
    const k=importKind(data);
    if(!['backup','legacy-graph'].includes(k))throw Error('Este arquivo não é um backup completo ou Service Graph reconhecido.');
    const importedGraph=validateImportedGraph(k==='backup'?data.graph:data);
    if(!await confirmDialog('Substituir projeto','O projeto atual será substituído pelo arquivo importado. Um checkpoint será criado antes da troca.','Substituir',true))throw Error('Importação cancelada. Nenhum dado foi alterado.');
    const previous={graph:clone(graph),meta:clone(meta),boardId,persistenceRevision:persistence.revision};
    await createCheckpoint('Antes da importação');
    try{
      graph=clone(importedGraph);meta=clone(k==='backup'?data.meta:{});graph.views ||= {whiteboards:{}};graph.views.whiteboards ||= {};ensureGraphEntityStore();meta.boardPrefs ||= {};meta.groups ||= {};meta.frameParents ||= {};meta.viewLayouts ||= {};meta.smartLayoutSnapshots ||= {};meta.smartLayoutPrefs ||= {};meta.viewEngine ||= {};meta.structuredViews ||= {};meta.instanceSchemaVersion=2;meta.visualizationEngineVersion=1;meta.structuredViewsVersion=1;meta.journeyPrimitivesVersion=1;meta.importExportVersion=1;meta.performanceUxVersion=1;meta.whiteboardCoreVersion=WHITEBOARD_CORE_VERSION;meta.coreAuditVersion=CORE_AUDIT_VERSION;meta.coreBaseline='stable';meta.journeyStudioVersion=1;meta.journeyStudio ||= {};meta.blueprintStudioVersion=1;meta.blueprintStudio ||= {};meta.blueprintHomeVersion=1;meta.blueprintHome ||= {records:{},viewMode:'cards',statusFilter:'all',search:'',sortBy:'updated',libraryPreset:'all'};meta.blueprintHome.records ||= {};meta.blueprintHome.sortBy ||= 'updated';meta.blueprintHome.libraryPreset ||= 'all';meta.welcomeSeen=true;normalizeBoardKinds();const ids=Object.keys(graph.views.whiteboards);boardId=meta.activeBoardId&&graph.views.whiteboards[meta.activeBoardId]?meta.activeBoardId:(ids[0]||null);meta.activeBoardId=boardId;if(boardId){normalizeContainers();normalizeLayers();normalizeEdges();normalizeVisualItems();normalizeInstances();migrateLegacyBlueprintLanes();ensureViewLayoutStore();structuredState();ensureJourneyPrimitives()}ensureBlueprintHome();runPersistenceMigrations();
      if(!save(false,{checkpoint:true,label:'Importar projeto'}))throw Error(persistence.error||'Não foi possível persistir o projeto importado.');
      resetEditHistory('Projeto importado');resetNavigationHistory('Projeto importado');renderAll();toast('Projeto importado e protegido.');return clone(graph);
    }catch(error){
      graph=previous.graph;meta=previous.meta;boardId=previous.boardId;persistence.revision=previous.persistenceRevision;
      try{save(false,{checkpoint:false,label:'Rollback de importação'})}catch{}
      window.dispatchEvent(new CustomEvent('rt-graph-changed',{detail:clone(graph)}));
      throw error;
    }
  }
  function importFragment(data,newBoard=false){if(importKind(data)!=='fragment'){toast('Este arquivo não é um fragmento de quadro.');return}const p=data.payload,bundle=p.entities||{};Object.entries(bundle).forEach(([kind,col])=>Object.entries(col||{}).forEach(([id,rec])=>{if(!entityRecord(kind,id)){const target=entityCollection(kind);if(target)target[id]=clone(rec)}}));if(newBoard){const id=uid('board');graph.views.whiteboards[id]={id,serviceId:graph.service.id,name:(data.source?.boardName||'Quadro importado')+' · importado',viewKind:'free',items:{},edges:{}};meta.boardPrefs[id]={layoutMode:data.source?.view||'free',gridVisible:true,snapToGrid:true,smartGuides:true,minimap:true};meta.groups[id]={};meta.frameParents[id]={};meta.viewLayouts[id]={};meta.structuredViews[id]={schemaVersion:2,savedViews:[],filters:{},visibility:{},journey:{}};boardId=id;meta.activeBoardId=id}const target=board(),idMap={},groupMap={},offset=newBoard?{x:0,y:0}:{x:64,y:64};Object.values(p.items||{}).forEach(it=>{const cp=clone(it),nid=uid(isContainer(cp)?containerType(cp):'item');if(cp.asset?.dataUrl&&!isSafeImageDataUrl(cp.asset.dataUrl))cp.asset.dataUrl='';if(cp.url&&!/^https?:\/\//i.test(String(cp.url)))cp.url='';idMap[it.id]=nid;cp.id=nid;cp.instanceId=nid;cp.x=(cp.x||0)+offset.x;cp.y=(cp.y||0)+offset.y;if(cp.kind==='smart')cp.entityRef={type:cp.objectKind,id:cp.objectId};target.items[nid]=cp});Object.entries(p.parents||{}).forEach(([child,parent])=>{if(idMap[child])setParentFrame(idMap[child],idMap[parent]||null)});Object.entries(p.groups||{}).forEach(([old,g])=>{if(idMap[old]){groupMap[g] ||= uid('group');setGroup(idMap[old],groupMap[g])}});Object.values(p.edges||{}).forEach(e=>{if(idMap[e.fromId]&&idMap[e.toId]){const ne=clone(e);ne.id=uid('edge');ne.fromId=idMap[e.fromId];ne.toId=idMap[e.toId];target.edges[ne.id]=ne}});selected=Object.values(idMap);showInspector=selected.length>0;normalizeContainers();normalizeLayers();normalizeEdges();normalizeInstances();save(true,{label:'Importar fragmento'});setTimeout(()=>selected.length?fitSelection():fit(),30);toast(newBoard?'Novo quadro importado.':'Fragmento inserido no quadro.')}
  function showImportExportCenter(initial='backup'){
    const m=modalShell('Importar / Exportar','Backups portáteis, dados estruturados e saídas visuais do Service Whiteboard.');m.box.classList.add('rt158-io-modal');let tab=initial;const tabs=document.createElement('nav');tabs.className='rt158-io-tabs';m.box.appendChild(tabs);const body=document.createElement('div');body.className='rt158-io-body';m.box.appendChild(body);const defs=[['backup','Backup'],['visual','Visual'],['data','Dados'],['import','Importar']];const drawTabs=()=>{tabs.innerHTML='';defs.forEach(([k,l])=>{const b=btn(l,()=>{tab=k;drawTabs();draw()},k===tab?'active':'');tabs.appendChild(b)})};const scopeSelect=()=>{const s=document.createElement('select');[['board','Quadro inteiro'],['selection','Seleção atual'],['container','Container selecionado']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;s.appendChild(o)});if(!selected.length)s.querySelector('[value="selection"]').disabled=true;if(!selected.some(id=>isContainer(board().items[id])))s.querySelector('[value="container"]').disabled=true;return s};const draw=()=>{body.innerHTML='';if(tab==='backup'){body.innerHTML='<div class="rt158-io-hero"><b>Backup completo e portátil</b><span>Inclui Service Graph, quadros, layouts, filtros, personas, emoções e preferências. Imagens incorporadas também seguem no JSON.</span></div>';const row=document.createElement('div');row.className='rt158-io-actions';row.append(btn('Exportar backup completo',exportFullBackup,'primary'),btn('Exportar Service Graph',exportGraph));body.appendChild(row);const inf=document.createElement('div');inf.className='rt158-format-info';inf.innerHTML=`<b>${esc(graph.service?.name||'Serviço')}</b><span>${Object.keys(graph.views?.whiteboards||{}).length} quadro(s) · ${allEntities().length} entidade(s) · app ${APP_VERSION}</span>`;body.appendChild(inf)}else if(tab==='visual'){const card=document.createElement('div');card.className='rt158-io-card';card.innerHTML='<b>Exportação visual</b><span>Exporte o quadro inteiro, a seleção ou um container. PNG é gerado em alta resolução.</span>';const s=scopeSelect(),lab=document.createElement('label');lab.className='rt158-io-field';lab.innerHTML='<span>Escopo</span>';lab.appendChild(s);card.appendChild(lab);const ck=document.createElement('label');ck.className='rt158-check';ck.innerHTML='<input type="checkbox" checked><span>Respeitar filtros e visibilidade da View atual</span>';card.appendChild(ck);const row=document.createElement('div');row.className='rt158-io-actions';row.append(btn('SVG',()=>exportSvg(s.value,ck.querySelector('input').checked)),btn('PNG @2x',()=>exportPng(s.value,ck.querySelector('input').checked),'primary'),btn('PDF',()=>exportPdf(s.value,ck.querySelector('input').checked)));card.appendChild(row);body.appendChild(card)}else if(tab==='data'){const card=document.createElement('div');card.className='rt158-io-card';card.innerHTML='<b>Dados estruturados</b><span>Use JSON para mover partes do quadro e CSV para analisar as entidades em planilhas.</span>';const s=scopeSelect(),lab=document.createElement('label');lab.className='rt158-io-field';lab.innerHTML='<span>Escopo do JSON</span>';lab.appendChild(s);card.appendChild(lab);const row=document.createElement('div');row.className='rt158-io-actions';row.append(btn('Exportar JSON',()=>exportBoardJson(s.value),'primary'),btn('Entidades CSV',exportEntitiesCsv));card.appendChild(row);body.appendChild(card)}else{const card=document.createElement('div');card.className='rt158-io-card';card.innerHTML='<b>Importação segura</b><span>O arquivo é validado antes de qualquer alteração. Backups completos criam um checkpoint antes de substituir o projeto.</span>';const pick=document.createElement('input');pick.type='file';pick.accept='.json,.rtservice,.rtboard,application/json';pick.className='rt158-file';card.appendChild(pick);const preview=document.createElement('div');preview.className='rt158-import-preview';preview.innerHTML='<span>Selecione um arquivo JSON do BLUE OCEAN Service Studio.</span>';card.appendChild(preview);let parsed=null;pick.onchange=()=>{const f=pick.files?.[0];if(!f)return;if(f.size>25*1024*1024){toast('O arquivo excede 25 MB.');return}const fr=new FileReader();fr.onload=()=>{try{parsed=JSON.parse(String(fr.result));const st=importStats(parsed),labels={backup:'Backup completo',fragment:'Fragmento de quadro','legacy-graph':'Service Graph legado',unknown:'Formato desconhecido'};preview.innerHTML=`<b>${labels[st.kind]}</b><span>Versão: ${esc(st.version)} · ${st.boards} quadro(s) · ${st.objects} objeto(s) · ${st.entities} entidade(s)</span><div class="rt158-import-actions"></div>`;const a=$('.rt158-import-actions',preview);if(st.kind==='backup'||st.kind==='legacy-graph')a.append(btn('Substituir projeto',()=>importFullProject(parsed),'danger'));else if(st.kind==='fragment')a.append(btn('Inserir no quadro',()=>{importFragment(parsed,false);m.root.remove()},'primary'),btn('Criar novo quadro',()=>{importFragment(parsed,true);m.root.remove()}));else preview.innerHTML+='<em>Este arquivo não corresponde a um formato reconhecido do Service Studio.</em>'}catch(e){parsed=null;preview.innerHTML='<b>Arquivo inválido</b><span>O JSON não pôde ser interpretado.</span>'}};fr.readAsText(f)};body.appendChild(card)}};drawTabs();draw()
  }

  function smartSnapFor(primaryId,rawDx,rawDy,ids){
    const p=pref(),primary=board().items[primaryId];if(!primary)return{dx:rawDx,dy:rawDy,guides:{x:null,y:null}};let dx=rawDx,dy=rawDy;const o=drag.orig[primaryId];let x=gridSnap(o.x+dx,p.snapToGrid),y=gridSnap(o.y+dy,p.snapToGrid);dx=x-o.x;dy=y-o.y;if(p.smartGuides===false)return{dx,dy,guides:{x:null,y:null}};
    const moving={x:o.x+dx,y:o.y+dy,width:primary.width,height:primary.height};const xs=[moving.x,moving.x+moving.width/2,moving.x+moving.width],ys=[moving.y,moving.y+moving.height/2,moving.y+moving.height];let bestX={d:Infinity,val:null,shift:0},bestY={d:Infinity,val:null,shift:0};const ignore=new Set(ids);visibleItems().filter(it=>!ignore.has(it.id)&&!isFrame(it)).forEach(it=>{const ox=[it.x,it.x+it.width/2,it.x+it.width],oy=[it.y,it.y+it.height/2,it.y+it.height];xs.forEach(mx=>ox.forEach(tx=>{const dd=Math.abs(mx-tx);if(dd<bestX.d){bestX={d:dd,val:tx,shift:tx-mx}}}));ys.forEach(my=>oy.forEach(ty=>{const dd=Math.abs(my-ty);if(dd<bestY.d){bestY={d:dd,val:ty,shift:ty-my}}}))});const threshold=10/zoom;if(bestX.d<=threshold)dx+=bestX.shift;else bestX.val=null;if(bestY.d<=threshold)dy+=bestY.shift;else bestY.val=null;return{dx,dy,guides:{x:bestX.val,y:bestY.val}}
  }

  function structuredDropIndex(value,starts,sizes){let best=0,dist=Infinity;for(let i=0;i<starts.length;i++){const center=starts[i]+(sizes?.[i]||0)/2,d=Math.abs(value-center);if(d<dist){dist=d;best=i}}return best}
  function applyStructuredDrop(ids){
    const mode=pref().layoutMode||'free';if(!['journey','blueprint','service'].includes(mode))return false;
    const m=mode==='journey'?journeyMetrics():mode==='blueprint'?blueprintMetrics():serviceFrameMetrics();if(!m.stages.length)return false;let changed=false;
    ids.forEach(id=>{const it=board().items[id];if(!it||isContainer(it)||(it.kind==='smart'&&it.objectKind==='stage'))return;const cx=it.x+it.width/2,cy=it.y+it.height/2;
      const baseLeft=mode==='service'?m.rootX+m.stageLeft:m.left,col=clamp(Math.floor((cx-baseLeft)/m.colW),0,m.stages.length-1),stage=m.stages[col];if(!stage)return;
      const oldStage=stageForItem(it);if(oldStage!==stage.id){if(mode==='service')it.serviceStageId=stage.id;else{it.blueprintStageId=stage.id;it.journeyStageId=stage.id}if(it.kind==='smart')assignJourneyEntityStage(it.objectKind,it.objectId,stage.id);changed=true}
      if(mode==='blueprint'){const row=structuredDropIndex(cy,m.rowTops,m.laneHeights),lane=blueprintLanes[clamp(row,0,blueprintLanes.length-1)]?.key||laneForItem(it);if(it.blueprintLane!==lane){it.blueprintLane=lane;if(it.kind==='smart')assignBlueprintEntityStage(it.objectKind,it.objectId,stage.id,lane);changed=true}}
      if(mode==='service'){const rowStarts=m.rowTops.map(y=>m.rootY+y),row=structuredDropIndex(cy,rowStarts,m.rowHeights),layer=SERVICE_FRAME_LAYERS[clamp(row,0,SERVICE_FRAME_LAYERS.length-1)]?.key||serviceFrameLayerForItem(it);if(it.serviceLayer!==layer){it.serviceLayer=layer;changed=true}it.serviceStageId=stage.id;it.serviceVisibility=serviceVisibilityForLayer(layer);if(it.kind==='smart'){const rec=entityRecord(it.objectKind,it.objectId);if(rec){rec.serviceVisibility=it.serviceVisibility;rec.stageId=stage.id;rec.updatedAt=new Date().toISOString()}}}
    });
    if(changed){markEdit('Mover no canvas estruturado');invalidateViewLayout(mode);if(mode==='journey')placeJourneyItems(ids);else if(mode==='blueprint')placeBlueprintItems(ids);else serviceCompositionLayout(ids);toast('Contexto atualizado: etapa'+(mode==='service'||mode==='blueprint'?' e camada':'')+' ajustada automaticamente.')}return changed
  }
  document.addEventListener('pointermove',e=>{
    if(!overlay||!drag)return;
    if(drag.type==='pan'){pan={x:drag.px+e.clientX-drag.sx,y:drag.py+e.clientY-drag.sy};scheduleFrameRender();return}
    if(drag.type==='minimap'){moveMinimapDrag(e);return}
    if(drag.type==='lasso'){drag.current=clientToCanvas(e.clientX,e.clientY);const r=lassoRect();if(r)selected=lassoSelection(r);showInspector=selected.length>0;scheduleFrameRender();return}
    if(drag.type==='connect'||drag.type==='reconnect'){drag.current=clientToCanvas(e.clientX,e.clientY);drag.clientX=e.clientX;drag.clientY=e.clientY;scheduleFrameRender();return}
    if(drag.type==='route'){const ed=board().edges[drag.edgeId];if(ed){drag.current=clientToCanvas(e.clientX,e.clientY);ed.waypoint={x:gridSnap(drag.current.x,pref().snapToGrid),y:gridSnap(drag.current.y,pref().snapToGrid)};scheduleFrameRender()}return}
    if(drag.type==='resize'){const it=board().items[drag.id];if(it){it.width=Math.max(isContainer(it)?280:140,gridSnap(drag.ow+(e.clientX-drag.sx)/zoom,pref().snapToGrid));it.height=Math.max(isContainer(it)?(containerType(it)==='swimlane'?140:180):80,gridSnap(drag.oh+(e.clientY-drag.sy)/zoom,pref().snapToGrid));if(isContainer(it))it.expandedHeight=it.height;scheduleFrameRender()}return}
    if(drag.type==='items'){const rawDx=(e.clientX-drag.sx)/zoom,rawDy=(e.clientY-drag.sy)/zoom,s=smartSnapFor(drag.primary,rawDx,rawDy,drag.ids);guides=s.guides;Object.entries(drag.orig).forEach(([id,o])=>{const it=board().items[id];if(it){it.x=Math.max(0,o.x+s.dx);it.y=Math.max(0,o.y+s.dy)}});updateItemGeometryDom(drag.ids);return}
  },{passive:true});
  document.addEventListener('pointerup',e=>{if(drag){const d=drag;
    if(d.type==='items'&&Math.hypot(e.clientX-d.sx,e.clientY-d.sy)<3){
      drag=null;guides={x:null,y:null};syncSelectionDom();
      const oldHeader=$('.rt144-top',overlay);if(oldHeader)oldHeader.remove();renderTop();overlay.prepend(overlay.lastElementChild);renderHistoryState();
      const view=$('.rt144-view',overlay);$$('.rt190-context-toolbar,.rt144-selectionbar',view).forEach(node=>node.remove());
      if(selected.length>1)renderSelectionToolbar(view);else if(selected.length===1)renderContextToolbar(view);
      if(showInspector){$('.rt144-inspector',overlay)?.remove();renderInspector($('.rt144-body',overlay))}
      const item=itemElementById(d.primary);if(item&&!isLocked(board().items[d.primary])&&!item.querySelector('.resize-handle')){const handle=document.createElement('button');handle.className='resize-handle';handle.title='Redimensionar';handle.setAttribute('aria-label','Redimensionar objeto');handle.onpointerdown=event=>startResize(event,d.primary);item.appendChild(handle)}
      item?.focus({preventScroll:true});return;
    }
    if(d.type==='connect'){drag=null;guides={x:null,y:null};finishConnect(e,d);return}else if(d.type==='reconnect'){drag=null;guides={x:null,y:null};finishReconnect(e,d);renderAll();return}else if(d.type==='route'){drag=null;guides={x:null,y:null};selectedEdge=d.edgeId;showInspector=true;markEdit('Redirecionar conexão');save(false);renderAll();return}if(d.type==='pan'||d.type==='minimap')pushNavigationSnapshot('Mover viewport');if(d.type==='items'){if(!applyStructuredDrop(d.ids))updateFrameMembership(d.ids);if(whiteboardUxState().autoInspector!==false&&selected.length){showInspector=true;inspectorMode='selection'}}else if(d.type==='resize'){updateFrameMembership([d.id]);if(isContainer(board().items[d.id])&&board().items[d.id].autoResize)ensureContainerFits(d.id,false)}else if(d.type==='lasso'){showInspector=selected.length>0;inspectorMode='selection'}drag=null;guides={x:null,y:null};save(false);renderAll()}});
  function isTypingTarget(target){return !!(target?.isContentEditable||target?.closest?.('input,textarea,select,[contenteditable],[role="textbox"],[role="combobox"]'))}
  function isUiControlTarget(target){if(!target?.closest)return false;if(target.matches?.('.rt144-item'))return false;return !!target.closest('button,a[href],[role="button"],[role="menuitem"],[role="option"],[role="tab"],summary')}
  document.addEventListener('keydown',e=>{if(!overlay)return;const cmd=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();if(isTypingTarget(e.target)){if(e.key==='Escape'){e.preventDefault();e.target.blur();}if(cmd&&k==='k'){e.preventDefault();openCommandPalette()}return}if(isUiControlTarget(e.target)){if(cmd&&k==='k'){e.preventDefault();openCommandPalette()}return}
    if(cmd&&k==='k'){e.preventDefault();openCommandPalette();return}
    if(e.shiftKey&&k==='l'&&!cmd){e.preventDefault();openSmartLayout();return}
    if(cmd&&k==='z'){e.preventDefault();if(e.shiftKey)redoEdit();else undoEdit();return}
    if(cmd&&k==='y'){e.preventDefault();redoEdit();return}
    if(cmd&&k==='x'){e.preventDefault();copySelection(true);return}
    if(e.code==='Space'&&!cmd){e.preventDefault();if(!spaceDown){spaceDown=true;renderAll()}return}
    if((cmd&&k==='f')||k==='/'){e.preventDefault();showOutline=true;showLibrary=false;showLayers=false;renderAll();setTimeout(()=>$('.rt148-outline-search',overlay)?.focus(),0);return}
    if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();navigateHistory(-1);return}if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();navigateHistory(1);return}
    if(cmd&&k==='0'){e.preventDefault();fit();pushNavigationSnapshot('Ajustar tudo');return}if(cmd&&k==='1'){e.preventDefault();setZoom100();return}if(cmd&&k==='2'){e.preventDefault();fitSelection();pushNavigationSnapshot('Ajustar seleção');return}
    if(k==='escape'){if(showCommandPalette||contextMenu){showCommandPalette=false;contextMenu=null;renderAll();return}connectFrom=null;quickCreate=null;selected=[];selectedEdge=null;showInspector=false;showLibrary=false;showLayers=false;showOutline=false;showBoardMenu=false;showEditHistory=false;drag=null;tool='select';renderAll();return}
    if(mobileReadOnly()){if(k==='v'&&!cmd){tool='select';renderAll()}if(k==='h'&&!cmd){tool='hand';renderAll()}if(k==='f'&&!cmd){fit();pushNavigationSnapshot('Ajustar tudo')}return}
    if(k==='v'&&!cmd){tool='select';connectFrom=null;renderAll()}if(k==='h'&&!cmd){tool='hand';connectFrom=null;renderAll()}if(k==='c'&&!cmd){tool='connect';connectFrom=null;renderAll()}if(k==='f'&&!cmd){fit();pushNavigationSnapshot('Ajustar tudo')}if(k==='t'&&!cmd){addFree('text','text','Texto','slate')}if(k==='s'&&!cmd){addFree('note','note','Novo post-it','yellow')}
    if((e.key==='Delete'||e.key==='Backspace')&&(selected.length||selectedEdge)){e.preventDefault();removeSelection()}if(cmd&&k==='a'){e.preventDefault();selected=visibleItems().filter(it=>!isFrame(it)).map(it=>it.id);showInspector=true;renderAll()}if(cmd&&k==='c'){e.preventDefault();copySelection(false);return}if(cmd&&k==='v'&&clipboardPayload){e.preventDefault();pasteInternalAt();return}if(cmd&&k==='d'){e.preventDefault();duplicateItems()}if(cmd&&k==='g'){e.preventDefault();group()}if(cmd&&e.shiftKey&&k==='g'){e.preventDefault();ungroup()}if(cmd&&k===']'&&selected.length===1){e.preventDefault();arrange(selected[0],e.shiftKey?'front':'forward')}if(cmd&&k==='['&&selected.length===1){e.preventDefault();arrange(selected[0],e.shiftKey?'back':'backward')}if(['arrowleft','arrowright','arrowup','arrowdown'].includes(k)&&selected.length){e.preventDefault();markEdit('Mover objetos');const step=e.shiftKey?10:1;unlockedSelection().forEach(it=>{if(k==='arrowleft')it.x=Math.max(0,it.x-step);if(k==='arrowright')it.x+=step;if(k==='arrowup')it.y=Math.max(0,it.y-step);if(k==='arrowdown')it.y+=step});updateFrameMembership(selected);save()}});
  document.addEventListener('paste',e=>{if(!overlay)return;if(mobileReadOnly()){toast('No celular, o quadro está em modo leitura.');return}const tag=e.target?.tagName;if(['INPUT','TEXTAREA'].includes(tag))return;const txt=e.clipboardData?.getData('text/plain')?.trim()||'';if(txt.startsWith('RT_WHITEBOARD_CLIPBOARD:')){e.preventDefault();try{clipboardPayload=JSON.parse(txt.slice('RT_WHITEBOARD_CLIPBOARD:'.length));pastePayload(clipboardPayload)}catch{toast('Não foi possível colar estes objetos.')}return}if(clipboardPayload&&(!txt||txt.startsWith('RT_WHITEBOARD_CLIPBOARD:'))){e.preventDefault();pasteInternalAt();return}const items=[...(e.clipboardData?.items||[])],img=items.find(x=>x.type?.startsWith('image/'));if(img){e.preventDefault();const f=img.getAsFile();if(f){markEdit('Colar imagem');readImageFile(f)}return}if(!txt)return;e.preventDefault();if(/^https?:\/\//i.test(txt)){markEdit('Colar link');addLinkItem(txt)}else{markEdit('Colar texto');addFree('text','text',txt,'slate')}});
  document.addEventListener('keyup',e=>{if(!overlay)return;if(e.code==='Space'&&spaceDown){spaceDown=false;if(drag?.type==='pan')drag=null;renderAll()}});
  document.addEventListener('contextmenu',e=>{if(!overlay)return;e.preventDefault();if(mobileReadOnly())return;lastPointer={x:e.clientX,y:e.clientY};const item=e.target.closest?.('.rt144-item'),edge=e.target.closest?.('.edgehit');if(item){const id=item.dataset.id;if(!selected.includes(id)){selected=[id];selectedEdge=null;showInspector=true}contextMenu={kind:'item',id,x:e.clientX,y:e.clientY,canvasPoint:clientToCanvas(e.clientX,e.clientY)}}else if(edge){selected=[];selectedEdge=edge.dataset.id||selectedEdge;showInspector=true;contextMenu={kind:'edge',id:selectedEdge,x:e.clientX,y:e.clientY,canvasPoint:clientToCanvas(e.clientX,e.clientY)}}else{selectedEdge=null;contextMenu={kind:'canvas',x:e.clientX,y:e.clientY,canvasPoint:clientToCanvas(e.clientX,e.clientY)}}renderAll()});
  document.addEventListener('pointermove',e=>{lastPointer={x:e.clientX,y:e.clientY}},{passive:true});
  document.addEventListener('pointerdown',e=>{if(!overlay)return;if(contextMenu&&!e.target.closest('.rt150-context')){contextMenu=null;setTimeout(()=>overlay&&renderAll(),0)}if(quickCreate&&!e.target.closest('.rt146-quickcreate')){quickCreate=null;renderAll();return}if(showBoardMenu&&!e.target.closest('.rt144-boardmenu,.rt144-actions')){showBoardMenu=false;renderAll()}},true);
  window.addEventListener('resize',()=>{if(overlay){overlay.classList.toggle('bo1175-mobile-read',mobileReadOnly());renderAll()}},{passive:true});
  window.addEventListener('error',e=>{perf.runtimeErrors++;perf.lastError=String(e?.message||'Erro inesperado');if(overlay)toast('O Whiteboard encontrou um erro de interface. Seu trabalho salvo permanece protegido.')});
  window.addEventListener('unhandledrejection',e=>{perf.runtimeErrors++;perf.lastError=String(e?.reason?.message||e?.reason||'Falha inesperada');if(overlay)toast('Uma operação não foi concluída. O autosave continua protegido.')});
  window.addEventListener('beforeunload',()=>{try{save(false,{label:'Encerramento'});endSession()}catch{}});
  document.addEventListener('visibilitychange',()=>{if(overlay&&document.visibilityState==='hidden'){try{save(false,{label:'Autosave em segundo plano'});durableMirror('Segundo plano',{checkpoint:false})}catch{}}});
  document.addEventListener('click',e=>{const b=e.target.closest?.('button[title="Blueprint Whiteboard"]');if(b){e.preventDefault();e.stopImmediatePropagation();open()}},true);

  function ensureJourneyHome(){meta.journeyHome ||= {viewMode:'cards',statusFilter:'all',priorityFilter:'all',sortBy:'updated',libraryPreset:'all'};meta.journeyHome.priorityFilter ||= 'all';meta.journeyHome.sortBy ||= 'updated';meta.journeyHome.libraryPreset ||= 'all';for(const j of Object.values(graph.journeys||{})){j.createdAt ||= graph.service.createdAt;j.updatedAt ||= graph.service.updatedAt;j.status ||= 'draft';j.priority ||= 'medium';j.objective ||= '';j.nextReviewAt ||= ''}return meta.journeyHome}
  function journeyManagementStats(j){
    const stageIds=new Set(j?.stageIds||[]),stages=[...stageIds].map(id=>graph.stages?.[id]).filter(Boolean),stageCount=stages.length;
    const emotions=Object.values(entityCollection('emotion')||{}).filter(r=>stageIds.has(r.stageId));
    const evidences=Object.values(entityCollection('evidence')||{}).filter(r=>stageIds.has(r.stageId));
    const metrics=Object.values(entityCollection('metric')||{}).filter(r=>stageIds.has(r.stageId));
    const problems=Object.values(graph.problems||{}).filter(r=>stageIds.has(r.stageId));
    const opportunities=Object.values(graph.opportunities||{}).filter(r=>stageIds.has(r.stageId));
    const hasByStage=(rows,sid)=>rows.some(r=>r.stageId===sid);
    let experience=0,evidence=0,measurement=0,improvement=0;
    if(stageCount){
      experience=stages.reduce((sum,st)=>sum+(String(st.customerAction||'').trim().length>2?1:0)+((st.touchpointIds||[]).length?1:0)+(hasByStage(emotions,st.id)?1:0),0)/(stageCount*3);
      evidence=stages.reduce((sum,st)=>{const rows=evidences.filter(r=>r.stageId===st.id);if(!rows.length)return sum;const best=Math.max(...rows.map(r=>r.confidence==='evidenced'?1:r.confidence==='partial'?.65:.25));return sum+best},0)/stageCount;
      measurement=stages.filter(st=>hasByStage(metrics,st.id)).length/stageCount;
      improvement=stages.filter(st=>!(st.problemIds||[]).length||(st.opportunityIds||[]).length).length/stageCount;
    }
    const health=stageCount?Math.round((experience*.5+evidence*.2+measurement*.15+improvement*.15)*100):0;
    const evidenced=evidences.filter(r=>r.confidence==='evidenced').length,partial=evidences.filter(r=>r.confidence==='partial').length;
    return{health,healthStatus:health>=80?'healthy':health>=60?'attention':'gaps',stageCount,touchpoints:stages.reduce((n,st)=>n+(st.touchpointIds||[]).length,0),problems:problems.length,opportunities:opportunities.length,metrics:metrics.length,evidence:evidences.length,evidenced,partial,experienceCoverage:Math.round(experience*100),evidenceCoverage:Math.round(evidence*100),measurementCoverage:Math.round(measurement*100),improvementCoverage:Math.round(improvement*100)}
  }
  function journeyHomeModel(){
    if(!graph)load();const h=ensureJourneyHome();const records=graph.service.journeyIds.map(id=>graph.journeys[id]).filter(Boolean).map(j=>{const stats=journeyManagementStats(j);return{id:j.id,name:j.name,owner:j.owner||'',status:j.status||'draft',priority:j.priority||'medium',objective:j.objective||'',nextReviewAt:j.nextReviewAt||'',favorite:!!j.favorite,createdAt:j.createdAt||graph.service.createdAt,updatedAt:j.updatedAt||graph.service.updatedAt,lastOpenedAt:j.lastOpenedAt||null,coverImage:j.coverImage||'',coverUpdatedAt:j.coverUpdatedAt||'',serviceName:graph.service.name,...stats}}).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const averageHealth=records.length?Math.round(records.reduce((n,r)=>n+r.health,0)/records.length):0;const management={averageHealth,evidence:records.reduce((n,r)=>n+r.evidence,0),metrics:records.reduce((n,r)=>n+r.metrics,0),problems:records.reduce((n,r)=>n+r.problems,0),attention:records.filter(r=>r.health<70||['high','critical'].includes(r.priority)).length,ownerMissing:records.filter(r=>!r.owner).length};
    return{service:{id:graph.service.id,name:graph.service.name},records,recent:records.filter(r=>r.lastOpenedAt).sort((a,b)=>String(b.lastOpenedAt).localeCompare(String(a.lastOpenedAt))).slice(0,4),templates:JOURNEY_HOME_TEMPLATES,viewMode:h.viewMode,statusFilter:h.statusFilter,priorityFilter:h.priorityFilter,sortBy:h.sortBy||'updated',libraryPreset:h.libraryPreset||'all',management}
  }
  function createJourneyFromHome(opts={}){
    if(!graph)load();const name=String(opts.name||'').trim();if(!name)return null;
    const id=uid('journey'),now=new Date().toISOString();const priority=['low','medium','high','critical'].includes(opts.priority)?opts.priority:'medium';const j={id,serviceId:graph.service.id,name,owner:String(opts.owner||'').trim(),status:opts.status==='active'?'active':'draft',priority,objective:String(opts.objective||'').trim(),nextReviewAt:String(opts.nextReviewAt||''),favorite:false,stageIds:[],createdAt:now,updatedAt:now,lastOpenedAt:null};
    graph.journeys[id]=j;graph.service.journeyIds.push(id);
    const t=JOURNEY_HOME_TEMPLATES.find(t=>t.id===opts.templateId);
    if(t)for(const [idx,title] of t.stages.entries()){const sid=uid('stage');graph.stages[sid]={id:sid,journeyId:id,title,customerAction:t.actions?.[idx]||'',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[],createdAt:now,updatedAt:now};j.stageIds.push(sid)}
    if(!save(false,{label:'Criar Jornada'})){delete graph.journeys[id];graph.service.journeyIds=graph.service.journeyIds.filter(x=>x!==id);j.stageIds.forEach(sid=>delete graph.stages[sid]);return null}return{id}
  }

  function duplicateJourneyFromHome(id){
    if(!graph)load();const src=graph.journeys[id];if(!src)return null;const beforeGraph=clone(graph),beforeMeta=clone(meta),mapping={},stageSet=new Set(src.stageIds||[]),jid=uid('journey');mapping[id]=jid;
    for(const sid of stageSet)mapping[sid]=uid('stage');
    for(const [kind,col]of [['problem',graph.problems],['opportunity',graph.opportunities],['task',graph.tasks]])for(const r of Object.values(col||{}))if(stageSet.has(r.stageId)||stageSet.has(graph.opportunities[r.opportunityId]?.stageId)||r.journeyId===id)mapping[r.id]=uid(kind);
    for(const [kind,col]of Object.entries(graph.entities||{}))for(const r of Object.values(col))if(stageSet.has(r.stageId))mapping[r.id]=uid(kind);
    const remap=v=>typeof v==='string'?(mapping[v]||v):Array.isArray(v)?v.map(remap):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[mapping[k]||k,remap(x)])):v,now=new Date().toISOString();
    graph.journeys[jid]={...remap(src),id:jid,name:src.name+' · cópia',createdAt:now,updatedAt:now,lastOpenedAt:null,favorite:false,status:'draft'};graph.service.journeyIds.push(jid);
    for(const col of [graph.stages,graph.problems,graph.opportunities,graph.tasks,...Object.values(graph.entities||{})])for(const r of Object.values({...col}))if(mapping[r.id]){const cp=remap(r);cp.createdAt=now;cp.updatedAt=now;col[cp.id]=cp}
    const sourceBoard=Object.values(graph.views.whiteboards).find(b=>b.viewKind==='journey'&&b.journeyId===id);
    if(sourceBoard){const bid=uid('journey-board');mapping[sourceBoard.id]=bid;for(const i of Object.values(sourceBoard.items))mapping[i.id]=uid('item');for(const e of Object.values(sourceBoard.edges))mapping[e.id]=uid('edge');const b=remap(sourceBoard);b.id=bid;b.journeyId=jid;b.name=graph.journeys[jid].name;graph.views.whiteboards[bid]=b;for(const k of ['boardPrefs','groups','frameParents','viewLayouts','structuredViews']){meta[k] ||= {};meta[k][bid]=remap(meta[k][sourceBoard.id]||{})}}
    if(!save(false,{label:'Duplicar Jornada'})){graph=beforeGraph;meta=beforeMeta;return null}return{id:jid}
  }
  function removeJourneyFromHome(id){
    if(!graph)load();
    const linked=Object.values(ensureBlueprintHome().records).filter(r=>r.journeyId===id);if(linked.length)return{ok:false,message:'Esta jornada está vinculada a '+linked.length+' Blueprint(s). Arquive-a ou altere o vínculo dos Blueprints antes de excluir.'};
    const beforeGraph=clone(graph),beforeMeta=clone(meta),plan=deletePlan(graph,'journey',id);if(!plan.exists)return{ok:false,message:'Jornada inexistente.'};if(plan.block?.length)return{ok:false,message:plan.block[0].reason};
    const boardIds=(plan.cascade||[]).filter(x=>x.kind==='board').map(x=>x.id);
    try{graph=applyDeletePlan(graph,plan)}catch(e){return{ok:false,message:String(e?.message||e)}}
    for(const bid of boardIds)for(const k of ['boardPrefs','groups','frameParents','viewLayouts','structuredViews'])delete meta[k]?.[bid];
    if(!graph.views.whiteboards[boardId])boardId=Object.keys(graph.views.whiteboards)[0]||null;meta.activeBoardId=boardId;meta.journeyStudio.activeJourneyId=graph.service.journeyIds[0]||null;
    if(!save(false,{label:'Excluir Jornada'})){graph=beforeGraph;meta=beforeMeta;return{ok:false,message:'Não foi possível salvar a exclusão.'}}return{ok:true}
  }

  function updateJourneyFromHome(id,patch={}){
    if(!graph)load();const j=graph.journeys[id];if(!j)return false;
    const before=clone(j);if(typeof patch.name==='string'&&patch.name.trim())j.name=patch.name.trim();if(typeof patch.owner==='string')j.owner=patch.owner.trim();if(['draft','active','archived'].includes(patch.status))j.status=patch.status;if(['low','medium','high','critical'].includes(patch.priority))j.priority=patch.priority;if(typeof patch.objective==='string')j.objective=patch.objective.trim();if(typeof patch.nextReviewAt==='string')j.nextReviewAt=patch.nextReviewAt;if(typeof patch.favorite==='boolean')j.favorite=patch.favorite;j.updatedAt=new Date().toISOString();
    if(!save(false,{label:'Atualizar Jornada'})){graph.journeys[id]=before;return false}if(typeof patch.favorite==='boolean')window.dispatchEvent(new CustomEvent('bo-workspace-preference',{detail:{workspaceId:graph.service.id,targetType:'journey',targetId:id,title:j.name,preference:'favorite',enabled:patch.favorite}}));return true
  }
  function setJourneyHomePrefs(patch={}){if(!graph)load();Object.assign(ensureJourneyHome(),patch);save(false,{label:'Preferências Journey Home'})}
  // H17.0.4 · Seleciona Jornada no editor integrado, sem montar o canvas sobreposto.
  function selectJourneyInWorkspace(id){
    if(!graph)load();const journey=graph.journeys?.[id];if(!journey)return false;
    meta.journeyStudio ||= {};meta.journeyStudio.activeJourneyId=id;
    let linked=Object.values(graph.views?.whiteboards||{}).find(b=>b.viewKind==='journey'&&b.journeyId===id);
    if(!linked){const bid=uid('journey-board');linked={id:bid,serviceId:graph.service.id,name:journey.name,viewKind:'journey',journeyId:id,items:{},edges:{}};graph.views.whiteboards[bid]=linked;meta.boardPrefs[bid]={layoutMode:'journey',gridVisible:true,snapToGrid:true,smartGuides:true,minimap:true};meta.groups[bid]={};meta.frameParents[bid]={};meta.viewLayouts[bid]={}}
    boardId=linked.id;meta.activeBoardId=linked.id;
    journey.lastOpenedAt=new Date().toISOString();
    return save(false,{content:false,label:'Selecionar Jornada no editor integrado'});
  }
  async function openJourneyFromHome(id){
    if(!graph)load();if(!graph.journeys[id])return false;
    meta.journeyStudio ||= {};meta.journeyStudio.activeJourneyId=id;graph.journeys[id].lastOpenedAt=new Date().toISOString();window.dispatchEvent(new CustomEvent('bo-workspace-context',{detail:{workspaceId:graph.service.id,targetType:'journey',targetId:id,title:graph.journeys[id].name,subtitle:'Jornada',activity:'opened',occurredAt:graph.journeys[id].lastOpenedAt,context:{serviceId:graph.service.id,journeyId:id}}}));
    let b=Object.values(graph.views.whiteboards).find(b=>b.viewKind==='journey'&&b.journeyId===id);
    if(!b){const bid=uid('journey-board');b={id:bid,serviceId:graph.service.id,name:graph.journeys[id].name,viewKind:'journey',journeyId:id,items:{},edges:{}};graph.views.whiteboards[bid]=b;meta.boardPrefs[bid]={layoutMode:'journey',gridVisible:true,snapToGrid:true,smartGuides:true,minimap:true};meta.groups[bid]={};meta.frameParents[bid]={};meta.viewLayouts[bid]={}}
    b.name=graph.journeys[id].name;boardId=b.id;meta.activeBoardId=b.id;if(!save(false,{label:'Abrir Jornada'}))return false;
    await open();meta.journeyStudio.activeJourneyId=id;boardId=b.id;meta.activeBoardId=b.id;selected=[];selectedEdge=null;showInspector=false;ensureJourneyPrimitives();if(!pref().journeyMode){pref().journeyMode='guided';journeyPrimitiveState().lanePreset='essential';viewVisibility('journey').hiddenLanes=['evidence','metric','other']}const targetView=graph.journeys[id].lastView||'journey';applyLayout(targetView,false);save(false,{label:'Abrir Jornada'});return true
  }


  function validateImportedGraph(g){
    const migrated=migrateGraphV3(g),repaired=repairGraphIntegrity(migrated),report=validateGraphDeep(repaired.graph);
    if(!report.ok){const first=report.errors[0];throw Error(`Projeto com referência inválida: ${first?.message||'verifique o arquivo'}${first?.path?' · '+first.path:''}`)}
    return repaired.graph
  }

  function journeyMode(){return pref().journeyMode||'guided'}
  function journeyLaneTitle(ln){return journeyMode()==='guided'?({need:'O que o cliente precisa?',touchpoint:'Onde ele interage?',emotion:'Como ele se sente?',evidence:'O que comprova isso?',problem:'O que atrapalha?',opportunity:'O que podemos melhorar?',metric:'Como acompanhar?',other:'Outras informações'})[ln.key]||ln.label:ln.label}
  function setJourneyMode(mode){const current=pref().layoutMode||'journey';pref().journeyMode=mode;const v=viewVisibility('journey');if(mode==='guided'){pref().professionalHiddenLanes=clone(v.hiddenLanes);journeyPrimitiveState().lanePreset='essential';v.hiddenLanes=['evidence','metric','other']}else v.hiddenLanes=pref().professionalHiddenLanes||[];invalidateViewLayout('journey');save(false,{label:'Modo da Jornada'});if(current==='journey')applyLayout('journey',true);else renderAll()}
  function journeyHealthReport(){const j=activeJourney(),gaps=[],stages=orderedStages();for(const st of stages){if(String(st.customerAction||'').trim().length<3)gaps.push({stageId:st.id,title:st.title+': descreva a ação do cliente',kind:'action'});if(!st.touchpointIds?.length)gaps.push({stageId:st.id,title:st.title+': adicione um ponto de contato',kind:'touchpoint'});for(const tid of st.touchpointIds||[]){const tp=graph.touchpoints[tid];if(!String(tp?.channel||'').trim()||tp.channel==='Não classificado')gaps.push({stageId:st.id,title:st.title+': defina o canal de '+(tp?.name||'contato'),kind:'channel',entityId:tid})}if(!emotionForStage(st.id))gaps.push({stageId:st.id,title:st.title+': registre como o cliente se sente',kind:'emotion'})}if(!stages.length)gaps.push({title:'Crie a primeira etapa da Jornada',kind:'stage'});const possible=stages.reduce((n,st)=>n+3+(st.touchpointIds||[]).length,0),score=possible?Math.max(0,Math.round((possible-gaps.length)/possible*100)):0;return{journeyId:j?.id,score,status:blueprintHealthStatus(score),gaps,stageCount:stages.length}}
  function showJourneyHealth(){const r=journeyHealthReport(),m=modalShell('Completude da Jornada','Completude = cobertura estrutural de etapas, contatos, canais e emoções. Não mede satisfação real nem qualidade do serviço.');m.box.classList.add('rt188-health-modal');const hero=document.createElement('div');hero.className='rt188-health-hero';hero.innerHTML=`<strong>${r.score}<small>/100</small></strong><span>${r.status.label}<br>${r.gaps.length} ponto(s) para completar</span>`;m.box.appendChild(hero);const list=document.createElement('div');list.className='rt188-health-list';if(!r.gaps.length)list.innerHTML='<p>Nenhum gap encontrado nos critérios verificados.</p>';r.gaps.forEach(g=>{const row=btn(g.title+' →',()=>{m.root.remove();if(g.kind==='stage'){addJourneyStage();return}if(g.kind==='touchpoint'||g.kind==='emotion'){addJourneyEntity(g.kind,g.stageId);return}if(g.entityId){const it=Object.values(board().items).find(i=>i.kind==='smart'&&i.objectId===g.entityId);if(it){selected=[it.id];showInspector=true;renderAll();fitSelection();return}}showJourneyStudio();setTimeout(()=>{const row=[...overlay.querySelectorAll('.rt170-stage-row')].find(x=>x.querySelector('input')?.value===graph.stages[g.stageId]?.title);row?.scrollIntoView({block:'center'});row?.querySelector('textarea')?.focus()},0)},'rt188-gap-row');list.appendChild(row)});m.box.appendChild(list)}
  runtime.register('journeyExperience',{version:APP_VERSION,mode:journeyMode,setMode:setJourneyMode,health:journeyHealthReport,showHealth:showJourneyHealth,mapping:showJourneyMappingExperience,hierarchy:showJourneyHierarchy,state:()=>clone(journeyPrimitiveState()),evidence:()=>clone(journeyEvidenceSummary()),seedFuture:seedFutureScenario},APP_VERSION);

  function blueprintBoardCoverage(id){const b=graph.views.whiteboards[id],stages=blueprintBoardStages(id);if(!stages.length)return 0;const items=Object.values(b.items||{}).filter(it=>!isContainer(it));return Math.round(stages.reduce((sum,st)=>sum+(['frontstage','backstage','process','system','evidence'].filter(k=>items.some(it=>blueprintHealthItemStage(it,stages)===st.id&&((it.kind==='smart'&&it.objectKind===k)||(it.kind==='free'&&it.semantic===k)))).length+(String(st.customerAction||'').trim()?1:0))/6*100,0)/stages.length)}
  function dataBridgeGet(){if(!graph)load();return clone(graph)}

  window.addEventListener('storage',event=>{if(![GRAPH_KEY,LEGACY_GRAPH_KEY_V2,META_KEY].includes(event.key))return;const g=safeParse(rawGraphFromStorage()),m=safeParse(localStorage.getItem(META_KEY));if(!stateValid(g,m,{allowLegacy:false})||Number(g.persistenceRevision||0)<=Number(persistence.revision||0))return;graph=g;meta=m;persistence.revision=g.persistenceRevision;boardId=graph.views.whiteboards[boardId]?boardId:meta.activeBoardId||Object.keys(graph.views.whiteboards)[0];saveState='saved';resetEditHistory('Atualizado por outra aba');window.dispatchEvent(new CustomEvent('rt-graph-changed',{detail:clone(graph)}));if(overlay)renderAll();runtime.api('journeyHomeShell')?.refresh?.();runtime.api('globalShell')?.refreshBlueprintHome?.()});

  const dataBridgeApi={
    get:dataBridgeGet,currentJourneyId:()=>{if(!graph)load();return activeJourney()?.id||graph.service.journeyIds[0]||null},
    save:()=>{if(!graph)load();return save(false,{label:'Salvar projeto',checkpoint:true})},
    transact:(updater,label='Editar projeto')=>{if(!graph)load();const collab=runtime.api('collaboration');if(!collab?.internalWrite?.()&&collab?.can&&!collab.can('edit'))throw Error('Seu papel atual permite somente leitura/comentários.');if(!historyReady)resetEditHistory('Antes da edição');const before=clone(graph),next=updater(clone(graph));if(!next?.service||!next?.journeys||!next?.views)throw Error('Projeto inválido');const hardened=repairGraphIntegrity(migrateGraphV3(next));if(!hardened.report.ok)throw Error('Operação bloqueada por integridade: '+(hardened.report.errors[0]?.message||'referência inválida'));graph=hardened.graph;if(!save(false,{label})){graph=before;throw Error(persistence.error||'Falha ao salvar')}if(overlay)renderAll();return clone(graph)},
    undo:()=>{if(!graph)load();undoEdit()},redo:()=>{if(!graph)load();redoEdit()},
    historyState:()=>({canUndo:editIndex>0,canRedo:editIndex>=0&&editIndex<editHistory.length-1}),
    export:()=>{if(!graph)load();exportFullBackup()},
    import:async data=>{if(!graph)load();await importFullProject(data);return clone(graph)},
    recovery:validatePersistence,
    prepare:prepareBeforeApp,
  };
  runtime.register('dataBridge',dataBridgeApi,APP_VERSION);
  runtime.register('journeyHome',{version:'1.0',appVersion:APP_VERSION,model:journeyHomeModel,create:createJourneyFromHome,duplicate:duplicateJourneyFromHome,remove:removeJourneyFromHome,update:updateJourneyFromHome,open:openJourneyFromHome,selectInWorkspace:selectJourneyInWorkspace,prefs:setJourneyHomePrefs},APP_VERSION);
  runtime.register('guidedBuilder',{version:'2.0',appVersion:APP_VERSION,open:showGuidedServiceBuilder,stage:showStageFlowBuilder,stageReport:id=>clone(stageFlowReport(id)),continuity:()=>clone(serviceContinuitySummary()),progress:()=>clone(guidedBuilderProgress()),snapshot:()=>clone(guidanceSnapshot()),next:()=>clone(nextBuilderStep()),act:key=>builderActionFor(key),mode:()=>guidanceMode(),setMode:mode=>setGuidanceMode(mode),help:showContextGuidance,topic:key=>showGuidanceDrawer(key),catalog:()=>clone(GUIDANCE_TOPICS)},APP_VERSION);
  runtime.register('serviceComposition',{version:'2.0',appVersion:APP_VERSION,state:()=>clone(serviceCompositionState()),recipe:()=>clone(serviceRecipeTemplate()),progress:()=>clone(serviceRecipeProgress()),showRecipe:showServiceRecipe,prepare:showServiceRecipe,open:()=>applyLayout('service',true),setExperienceMode:setBoardExperienceMode},APP_VERSION);

  runtime.register('serviceBuilderAssistant',{version:'1.3',appVersion:APP_VERSION,start:startServiceBuilderAssistant,open:startServiceBuilderAssistant,startFromDefinition:assistantBeginFromDefinition,pause:pauseServiceBuilderAssistant,progress:()=>clone(serviceBuilderAssistantProgress()),state:()=>clone(serviceBuilderAssistantState()),mode:assistantSetMode,setMode:assistantSetMode,session:()=>clone(assistantSessionState()),restart:()=>{const st=serviceBuilderAssistantState();st.session=assistantSessionDefault();st.active=false;st.panelOpen=false;st.currentStep='service';st.completedAt=null;save(false,{content:false,label:'Reiniciar Assistente'});renderAll();return true},act:key=>serviceBuilderAssistantAction(key),ask:q=>{const answer=assistantAnswer(q);assistantAsk(q);return answer},review:serviceBuilderReview,help:key=>showGuidanceDrawer(key||assistantCurrentStep()?.topic||'service')},APP_VERSION);
  runtime.register('journeyStudio',{version:JOURNEY_STUDIO_VERSION,show:showJourneyStudio,summary:journeyStudioSummary,addStage:addJourneyStage},JOURNEY_STUDIO_VERSION);
  runtime.register('blueprintStudio',{version:BLUEPRINT_STUDIO_VERSION,show:showBlueprintStudio,summary:blueprintStudioSummary,add:addBlueprintEntity,coverage:blueprintCoverage},BLUEPRINT_STUDIO_VERSION);
  runtime.register('blueprintHome',{version:'1.0',appVersion:APP_VERSION,model:blueprintHomeModel,list:blueprintHomeList,create:createBlueprintFromHome,open:openBlueprintFromHome,update:updateBlueprintHomeRecord,remove:removeBlueprintFromHome,prefs:setBlueprintHomePrefs},APP_VERSION);
  runtime.register('blueprintGrid',{version:BLUEPRINT_GRID_UX_VERSION,appVersion:APP_VERSION,metrics:blueprintMetrics,cellCount:blueprintCellItemCount,addToCell:showBlueprintCellAdd},BLUEPRINT_GRID_UX_VERSION);
  runtime.register('blueprintMethodology',{version:'1.0',report:()=>buildBlueprintDeliveryReport(graph,boardId),showReview:showBlueprintDeliveryReview},'1.0');
  runtime.register('blueprintLearning',{version:BLUEPRINT_LEARNING_VERSION,appVersion:APP_VERSION,state:()=>clone(blueprintLearningState()),progress:blueprintLearningProgress,setMode:setBlueprintLearningMode,startTour:(step=0)=>showBlueprintOnboarding(step),topic:showBlueprintLearningTopic},BLUEPRINT_LEARNING_VERSION);
  runtime.register('whiteboardUx',{version:WHITEBOARD_UX_VERSION,appVersion:APP_VERSION,state:()=>clone(whiteboardUxState()),readiness:()=>clone(serviceReadinessReport()),openReadiness:showReadinessDetails,cardDensity:()=>pref().cardDensity||'normal',setCardDensity:v=>{if(!['compact','normal','detailed'].includes(v))return false;pref().cardDensity=v;invalidateViewLayout(pref().layoutMode||'free');save(false,{label:'Densidade dos cards'});const mode=pref().layoutMode||'free';if(mode==='journey'||mode==='blueprint')applyLayout(mode,true);else renderAll();return true},setAutoInspector:v=>{whiteboardUxState().autoInspector=!!v;save(false);renderAll()}},WHITEBOARD_UX_VERSION);
  runtime.register('blueprintHealth',{version:BLUEPRINT_HEALTH_VERSION,appVersion:APP_VERSION,state:()=>clone(blueprintHealthState()),report:()=>clone(blueprintHealthReport()),fix:focusBlueprintHealthGap,open:()=>{if(!overlay)return false;closeEditorSidePanels('blueprint');showBlueprintDocument=true;blueprintDocumentTab='health';renderAll();return true}},BLUEPRINT_HEALTH_VERSION);
  runtime.register('blueprintEditor',{version:'1.0',appVersion:APP_VERSION,showDocument:(tab='structure')=>{if(!overlay)return false;blueprintDocumentTab=tab;showBlueprintDocument=true;renderAll();return true},hideDocument:()=>{showBlueprintDocument=false;renderAll()},model:blueprintDocumentSummary},APP_VERSION);
  runtime.register('designSystem',{version:DESIGN_SYSTEM_VERSION,appVersion:APP_VERSION,tokens:{primary:'#1E63F0',accent:'#00A3FF',surface:'#F7F8FA',text:'#172033',header:48,sidebar:216,inspector:320}},DESIGN_SYSTEM_VERSION);
  runtime.register('presentationBridge',{version:APP_VERSION,context:()=>({boardId,boardName:board()?.name||'Quadro',viewKind:board()?.viewKind||'whiteboard',journeyId:board()?.journeyId||activeJourney()?.id||null,activeJourneyId:activeJourney()?.id||null}),frames:()=>Object.values(board()?.items||{}).filter(isFrame).sort((a,b)=>itemZ(a)-itemZ(b)).map((it,index)=>({id:it.id,title:content(it).title||it.text||`Frame ${index+1}`,subtitle:content(it).sub||'',x:it.x,y:it.y,width:it.width,height:it.height,order:index})),selection:()=>{const it=selected.length?board()?.items?.[selected[0]]:null;if(!it)return null;const c=content(it);return{id:it.id,label:c.title||it.text||smartLabel(it.objectKind)||'Objeto',kind:it.kind==='smart'?it.objectKind:(it.semantic||it.shape||'object')}},focusFrame:id=>{const it=board()?.items?.[id];if(!isFrame(it))return false;selected=[id];selectedEdge=null;showInspector=false;renderAll();setTimeout(fitSelection,0);return true},focusItem:id=>{const it=board()?.items?.[id];if(!it)return false;selected=[id];selectedEdge=null;showInspector=false;renderAll();setTimeout(fitSelection,0);return true}},APP_VERSION);
  function refreshGraphFromStorageIfInitialized(){const stored=safeParse(rawGraphFromStorage());if(!stored||isWorkspaceEmptyGraph(stored))return false;const currentRev=Number(graph?.persistenceRevision||0),storedRev=Number(stored.persistenceRevision||0);if(!graph||isWorkspaceEmptyGraph(graph)||storedRev>currentRev){try{graph=repairGraphIntegrity(migrateGraphV3(stored)).graph;graph.views ||= {whiteboards:{}};graph.views.whiteboards ||= {};ensureGraphEntityStore();const storedMeta=safeParse(localStorage.getItem(META_KEY)||'null');if(storedMeta&&typeof storedMeta==='object')meta=storedMeta;meta ||= {};meta.boardPrefs ||= {};meta.groups ||= {};meta.frameParents ||= {};meta.viewLayouts ||= {};meta.smartLayoutSnapshots ||= {};meta.smartLayoutPrefs ||= {};meta.viewEngine ||= {};meta.structuredViews ||= {};persistence.revision=Math.max(Number(graph.persistenceRevision||0),Number(meta.persistenceRevision||0));return true}catch{return false}}return true}
  async function createBlankWhiteboard(name='Novo Whiteboard'){if(!graph)load();if(isWorkspaceEmptyGraph(graph))refreshGraphFromStorageIfInitialized();if(isWorkspaceEmptyGraph(graph)){window.dispatchEvent(new CustomEvent('bo-create-service'));return null}const clean=String(name||'Novo Whiteboard').trim()||'Novo Whiteboard',id=createBoard(clean,{viewKind:'free',layoutMode:'free',items:{},edges:{}});if(!id)return null;const b=board();b.viewKind='free';b.name=clean;pref().layoutMode='free';save(false,{label:'Criar Whiteboard'});await open();if(overlay){renderAll();setTimeout(fit,0)}return{id:boardId,name:b.name}}
  async function openWhiteboard(id){if(!graph)load();const b=graph.views?.whiteboards?.[id];if(!b||b.viewKind!=='free')return false;boardId=id;meta.activeBoardId=id;await open();boardId=id;meta.activeBoardId=id;pref().layoutMode='free';if(pref().viewport){zoom=pref().viewport.zoom;pan=clone(pref().viewport.pan)}save(false,{label:'Abrir Whiteboard'});if(overlay){renderAll();if(!pref().viewport)setTimeout(fit,0)}return true}
  async function createServiceFrameWhiteboard(){toast('O Service Frame agora pertence a Blueprints.');return null}
  async function createServiceBlueprint(name='Service Blueprint'){blueprintReferenceState().mode='reference';if(!graph)load();if(isWorkspaceEmptyGraph(graph))refreshGraphFromStorageIfInitialized();if(isWorkspaceEmptyGraph(graph)){window.dispatchEvent(new CustomEvent('bo-create-service'));return null}const clean=String(name||'Service Blueprint').trim()||'Service Blueprint',id=createBoard(clean,{viewKind:'blueprint',layoutMode:'service',items:{},edges:{}});if(!id)return null;const b=board();b.viewKind='blueprint';b.name=clean;pref().layoutMode='service';serviceCompositionState().experienceMode='guided';serviceCompositionState().showRecipePrompt=false;save(false,{label:'Criar Service Blueprint'});await open();boardId=id;meta.activeBoardId=id;pref().layoutMode='service';applyLayout('service',true);if(overlay){renderAll();setTimeout(fit,0)}return{id:boardId,name:b.name}}
  async function openServiceBlueprint(id){if(!graph)load();const b=graph.views?.whiteboards?.[id];if(!b||b.viewKind!=='blueprint')return false;boardId=id;meta.activeBoardId=id;blueprintReferenceState().mode='reference';await open();boardId=id;meta.activeBoardId=id;pref().layoutMode=b.layoutMode==='service'?'service':'blueprint';save(false,{label:'Abrir Service Blueprint'});if(overlay){if(pref().viewport){zoom=pref().viewport.zoom;pan=clone(pref().viewport.pan);renderAll()}else{applyLayout(pref().layoutMode||'service');renderAll();setTimeout(fit,0)}}return true}
  function listServiceBlueprints(){if(!graph)load();return Object.values(graph.views?.whiteboards||{}).filter(b=>b.viewKind==='blueprint').map(b=>({id:b.id,name:b.name||'Service Blueprint',layoutMode:b.layoutMode||meta.boardPrefs?.[b.id]?.layoutMode||'service',itemCount:Object.keys(b.items||{}).length,updatedAt:b.updatedAt||graph.service.updatedAt||null}))}
  function listWhiteboards(){if(!graph)load();return Object.values(graph.views?.whiteboards||{}).filter(b=>b.viewKind==='free').map(b=>({id:b.id,name:b.name||'Whiteboard',itemCount:Object.keys(b.items||{}).length,edgeCount:Object.keys(b.edges||{}).length,updatedAt:b.updatedAt||graph.service.updatedAt||null}))}
  runtime.register('whiteboardCore',{appVersion:APP_VERSION,coreVersion:WHITEBOARD_CORE_VERSION,studioVersion:WHITEBOARD_STUDIO_VERSION,audit:coreAudit,repair:repairCoreIntegrity,show:showCoreStatus,createBlank:createBlankWhiteboard,createServiceFrame:createServiceFrameWhiteboard,openBoard:openWhiteboard,list:listWhiteboards,renameBoard:renameBoardById,duplicateBoard:duplicateBoardById,deleteBoard:deleteBoardById,focusItem:(id)=>focusItem(id,{fitItem:true,record:true}),openOrigin:(id)=>{const it=board()?.items?.[id];return it?openSmartObjectOrigin(it):false},conflictDraft:()=>clone(conflictDraft()),clearConflictDraft},WHITEBOARD_CORE_VERSION);
  runtime.register('serviceBlueprintFrame',{appVersion:APP_VERSION,create:createServiceBlueprint,open:openServiceBlueprint,list:listServiceBlueprints},APP_VERSION);
  const diagnosticsApi={version:APP_VERSION,coreVersion:WHITEBOARD_CORE_VERSION,audit:coreAudit,open:()=>open(),stats:()=>({boardId,totalItems:Object.keys(board()?.items||{}).length,visibleItems:visibleItems().length,renderedItems:perf.renderedItems,lastRenderMs:perf.lastRenderMs,avgRenderMs:perf.avgRenderMs,runtimeErrors:perf.runtimeErrors,lastError:perf.lastError,zoom}),createStressBoard:(count=1000)=>{count=clamp(Number(count)||1000,10,5000);createBoard(`Stress ${count}`);const b=board(),cols=Math.ceil(Math.sqrt(count)),gapX=300,gapY=190;for(let i=0;i<count;i++){const id=`stress-${i}`;b.items[id]={id,instanceId:id,entityRef:null,kind:'free',shape:'card',visualKind:'card',semantic:'card',semanticType:'card',tone:['blue','emerald','amber','violet','rose','slate'][i%6],text:`Objeto ${i+1}`,description:'Stress test do Whiteboard',x:120+(i%cols)*gapX,y:120+Math.floor(i/cols)*gapY,width:250,height:132,z:i+1}}normalizeLayers();save(false,{label:`Stress test ${count}`});fit();return diagnosticsApi.stats()},benchmark:async(frames=20)=>{const samples=[];for(let i=0;i<frames;i++){const t=performance.now();renderAll();samples.push(performance.now()-t);await new Promise(r=>requestAnimationFrame(r))}return{count:frames,min:Math.min(...samples),max:Math.max(...samples),avg:samples.reduce((a,b)=>a+b,0)/samples.length,stats:diagnosticsApi.stats()}}};
  runtime.register('whiteboardDiagnostics',diagnosticsApi,APP_VERSION);
  if(location.hash==='#blueprint-v186'||location.hash==='#blueprint-v185'||location.hash==='#blueprint-v184'||location.hash==='#blueprint-v183'||location.hash==='#blueprint-v182'||location.hash==='#blueprint-v181'||location.hash==='#blueprint-v180'||location.hash==='#blueprint-v170'||location.hash==='#blueprint-v160'||location.hash==='#blueprint-v159'||location.hash==='#blueprint-v158'||location.hash==='#blueprint-v157'||location.hash==='#blueprint-v156'||location.hash==='#blueprint-v1551'||location.hash==='#blueprint-v155'||location.hash==='#blueprint-v154'||location.hash==='#blueprint-v153'||location.hash==='#blueprint-v152'||location.hash==='#blueprint-v151'||location.hash==='#blueprint-v150'||location.hash==='#blueprint-v1410'||location.hash==='#blueprint-v149'||location.hash==='#blueprint-v148'||location.hash==='#blueprint-v147'||location.hash==='#blueprint-v146'||location.hash==='#blueprint-v145'||location.hash==='#blueprint-v144'||location.hash==='#blueprint-v143')setTimeout(open,700);
  document.title=`BLUE OCEAN Service Studio · V${APP_VERSION}`;
})();

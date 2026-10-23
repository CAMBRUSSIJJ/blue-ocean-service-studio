import { runtime } from './runtime-registry.js';

export const SCHEMA_VERSION = 3;
const CORE = ['journeys','stages','touchpoints','problems','opportunities','tasks'];
const EXTENDED_KINDS = ['persona','need','job','pain','problemHypothesis','problem','expectation','channel','emotion','evidence','insight','metric','customerAction','frontstage','backstage','process','system','person','solution','experiment','resource','responsible','role','dependency','policy','benefit'];
export const isSafeImageDataUrl = value => /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i.test(String(value||''));
const IMAGE_DATA_RE = /^data:image\/(?:png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$/i;
const HTTP_RE = /^https?:\/\//i;
const clone = value => typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const PROJECT_PHASES=['discovery','definition','design','validation','improvement'];
function ensureServiceProject(g){
  const service=g?.service;if(!service?.id||service.id==='workspace-uninitialized'||!String(service.name||'').trim())return g;
  const now=new Date().toISOString(),current=service.project||{};
  service.project={
    version:1,id:current.id||`project-${service.id}`,serviceId:service.id,status:['draft','active','validated','archived'].includes(current.status)?current.status:'active',
    currentPhase:PROJECT_PHASES.includes(current.currentPhase)?current.currentPhase:'discovery',
    definition:{promise:'',outcome:'',scope:'',startBoundary:'',endBoundary:'',principles:[],successCriteria:[],outOfScope:[],assumptions:[],personaIds:[],problemIds:[],evidenceIds:[],...(current.definition||{}),principles:Array.isArray(current.definition?.principles)?current.definition.principles.filter(Boolean):[],successCriteria:Array.isArray(current.definition?.successCriteria)?current.definition.successCriteria.filter(Boolean):[],outOfScope:Array.isArray(current.definition?.outOfScope)?current.definition.outOfScope.filter(Boolean):[],assumptions:Array.isArray(current.definition?.assumptions)?current.definition.assumptions.filter(Boolean):[],personaIds:uniq(current.definition?.personaIds),problemIds:uniq(current.definition?.problemIds),evidenceIds:uniq(current.definition?.evidenceIds)},
    createdAt:current.createdAt||service.createdAt||now,updatedAt:current.updatedAt||service.updatedAt||now,
  };
  return g;
}
const values = obj => Object.values(obj || {});
const uniq = arr => [...new Set((arr || []).filter(Boolean))];

export function migrateGraphV3(input) {
  const g = clone(input || {});
  if (!g || typeof g !== 'object' || Array.isArray(g)) throw new Error('Projeto inválido.');
  if (g.schemaVersion != null && ![2,3].includes(Number(g.schemaVersion))) throw new Error(`Versão de dados incompatível: ${String(g.schemaVersion)}.`);
  g.schemaVersion = 3;
  g.entities ||= {};
  for (const kind of EXTENDED_KINDS) g.entities[kind] ||= {};
  g.views ||= { whiteboards: {} }; g.views.whiteboards ||= {};
  g.research ||= { sources: {}, collections: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  g.research.sources ||= {}; g.research.collections ||= {};
  g.integrity ||= {};
  g.integrity.schemaVersion = 3;
  g.integrity.migratedAt ||= new Date().toISOString();
  ensureServiceProject(g);
  sanitizeGraph(g);
  return g;
}

function collectionFor(g, kind) {
  if (kind === 'journey') return g.journeys;
  if (kind === 'stage') return g.stages;
  if (kind === 'touchpoint') return g.touchpoints;
  if (kind === 'problem') return g.problems;
  if (kind === 'opportunity') return g.opportunities;
  if (kind === 'task') return g.tasks;
  return g.entities?.[kind];
}
function entityExists(g, kind, id) { return !!(id && collectionFor(g, kind)?.[id]); }
function addIssue(out, severity, code, path, message, extra={}) { out[severity === 'error' ? 'errors' : 'warnings'].push({ severity, code, path, message, ...extra }); }
function checkRecordKeys(out, record, key) { for (const [id, rec] of Object.entries(record || {})) if (!rec || rec.id !== id) addIssue(out,'error','id-key-mismatch',`${key}.${id}`,'A chave não corresponde ao ID do objeto.'); }
function checkIds(out, ids, exists, path, label) { (ids || []).forEach((id,i)=>{ if (!exists(id)) addIssue(out,'error','missing-reference',`${path}.${i}`,`${label} inexistente: ${id}`,{targetId:id}); }); }

export function validateGraphDeep(input) {
  const out={ok:true,schemaVersion:Number(input?.schemaVersion||0),errors:[],warnings:[],stats:{objects:0,references:0,orphanSmartItems:0,danglingEdges:0,unsafeAssets:0}};
  const g=input;
  if (!g || typeof g !== 'object' || Array.isArray(g)) { addIssue(out,'error','not-object','graph','Projeto não é um objeto válido.'); out.ok=false; return out; }
  if (![2,3].includes(Number(g.schemaVersion))) addIssue(out,'error','schema-version','schemaVersion','Schema não suportado.');
  if (!g.service?.id) addIssue(out,'error','missing-service','service','Serviço ausente.');
  if (g.service?.project && g.service.project.serviceId!==g.service.id) addIssue(out,'error','wrong-project-service','service.project.serviceId','Service Project pertence a outro serviço.');
  if (g.service?.project && !PROJECT_PHASES.includes(g.service.project.currentPhase)) addIssue(out,'error','invalid-project-phase','service.project.currentPhase','Fase atual do Service Project é inválida.');
  if (g.service?.project?.definition) {
    checkIds(out,g.service.project.definition.personaIds,id=>entityExists(g,'persona',id),'service.project.definition.personaIds','Persona');
    checkIds(out,g.service.project.definition.problemIds,id=>entityExists(g,'problem',id)||!!g.problems?.[id],'service.project.definition.problemIds','Problema');
    checkIds(out,g.service.project.definition.evidenceIds,id=>entityExists(g,'evidence',id),'service.project.definition.evidenceIds','Evidência');
  }
  if (!g.views?.whiteboards || typeof g.views.whiteboards!=='object') addIssue(out,'error','missing-views','views.whiteboards','Coleção de quadros ausente.');
  for (const key of CORE) if (!g[key] || typeof g[key]!=='object') addIssue(out,'error','missing-collection',key,`Coleção ausente: ${key}.`);
  if (out.errors.length) { out.ok=false; return out; }
  for (const key of CORE) { checkRecordKeys(out,g[key],key); out.stats.objects += Object.keys(g[key]||{}).length; }
  checkRecordKeys(out,g.views.whiteboards,'views.whiteboards');
  for (const [kind,col] of Object.entries(g.entities||{})) { checkRecordKeys(out,col,`entities.${kind}`); out.stats.objects += Object.keys(col||{}).length; }
  checkRecordKeys(out,g.research?.sources,'research.sources');

  checkIds(out,g.service.journeyIds,id=>!!g.journeys[id],'service.journeyIds','Jornada');
  for (const [jid,j] of Object.entries(g.journeys||{})) {
    if (j.serviceId !== g.service.id) addIssue(out,'error','wrong-service',`journeys.${jid}.serviceId`,'Jornada pertence a outro serviço.');
    checkIds(out,j.stageIds,id=>g.stages[id]?.journeyId===jid,`journeys.${jid}.stageIds`,'Etapa');
  }
  for (const [sid,st] of Object.entries(g.stages||{})) {
    if (!g.journeys[st.journeyId]) addIssue(out,'error','orphan-stage',`stages.${sid}.journeyId`,'Etapa sem jornada.');
    checkIds(out,st.touchpointIds,id=>!!g.touchpoints[id],`stages.${sid}.touchpointIds`,'Touchpoint');
    checkIds(out,st.problemIds,id=>g.problems[id]?.stageId===sid,`stages.${sid}.problemIds`,'Problema');
    checkIds(out,st.opportunityIds,id=>g.opportunities[id]?.stageId===sid,`stages.${sid}.opportunityIds`,'Oportunidade');
  }
  for (const [pid,p] of Object.entries(g.problems||{})) if (!g.stages[p.stageId]) addIssue(out,'error','orphan-problem',`problems.${pid}.stageId`,'Problema aponta para etapa inexistente.');
  for (const [oid,o] of Object.entries(g.opportunities||{})) {
    if (!g.stages[o.stageId]) addIssue(out,'error','orphan-opportunity',`opportunities.${oid}.stageId`,'Oportunidade aponta para etapa inexistente.');
    checkIds(out,o.problemIds,id=>!!g.problems[id],`opportunities.${oid}.problemIds`,'Problema');
    checkIds(out,o.taskIds,id=>!!g.tasks[id],`opportunities.${oid}.taskIds`,'Iniciativa');
    checkIds(out,o.metricIds,id=>entityExists(g,'metric',id),`opportunities.${oid}.metricIds`,'Métrica');
  }
  for (const [tid,t] of Object.entries(g.tasks||{})) {
    if (t.opportunityId && !g.opportunities[t.opportunityId]) addIssue(out,'warning','detached-task',`tasks.${tid}.opportunityId`,'Iniciativa sem oportunidade válida.');
    if (t.stageId && !g.stages[t.stageId]) addIssue(out,'error','orphan-task-stage',`tasks.${tid}.stageId`,'Iniciativa aponta para etapa inexistente.');
    if (t.journeyId && !g.journeys[t.journeyId]) addIssue(out,'error','orphan-task-journey',`tasks.${tid}.journeyId`,'Iniciativa aponta para jornada inexistente.');
    checkIds(out,t.dependencyIds,id=>!!g.tasks[id]&&id!==tid,`tasks.${tid}.dependencyIds`,'Dependência');
    checkIds(out,t.metricIds,id=>entityExists(g,'metric',id),`tasks.${tid}.metricIds`,'Métrica');
  }
  for (const [kind,col] of Object.entries(g.entities||{})) for (const [id,rec] of Object.entries(col||{})) {
    if (rec.stageId && !g.stages[rec.stageId]) addIssue(out,'error','orphan-entity-stage',`entities.${kind}.${id}.stageId`,`${kind} aponta para etapa inexistente.`);
    if (rec.journeyId && !g.journeys[rec.journeyId]) addIssue(out,'error','orphan-entity-journey',`entities.${kind}.${id}.journeyId`,`${kind} aponta para jornada inexistente.`);
    if (rec.serviceId && rec.serviceId!==g.service.id) addIssue(out,'error','wrong-entity-service',`entities.${kind}.${id}.serviceId`,`${kind} pertence a outro serviço.`);
    if (Array.isArray(rec.sourceIds)) checkIds(out,rec.sourceIds,x=>!!g.research?.sources?.[x],`entities.${kind}.${id}.sourceIds`,'Fonte de pesquisa');
    if (rec.sourceId && !g.research?.sources?.[rec.sourceId]) addIssue(out,'error','orphan-research-source',`entities.${kind}.${id}.sourceId`,'Fonte de pesquisa inexistente.');
    if (Array.isArray(rec.evidenceIds)) checkIds(out,rec.evidenceIds,x=>entityExists(g,'evidence',x),`entities.${kind}.${id}.evidenceIds`,'Evidência');
    if (Array.isArray(rec.metricIds)) checkIds(out,rec.metricIds,x=>entityExists(g,'metric',x),`entities.${kind}.${id}.metricIds`,'Métrica');
    if (Array.isArray(rec.taskIds)) checkIds(out,rec.taskIds,x=>!!g.tasks[x],`entities.${kind}.${id}.taskIds`,'Iniciativa');
    if (Array.isArray(rec.opportunityIds)) checkIds(out,rec.opportunityIds,x=>!!g.opportunities[x],`entities.${kind}.${id}.opportunityIds`,'Oportunidade');
    if (Array.isArray(rec.scenarioIds)) checkIds(out,rec.scenarioIds,x=>!!g.service?.scenarios?.[x],`entities.${kind}.${id}.scenarioIds`,'Cenário');
  }
  for (const [bid,b] of Object.entries(g.views?.whiteboards||{})) {
    if (b.serviceId!==g.service.id) addIssue(out,'error','wrong-board-service',`views.whiteboards.${bid}.serviceId`,'Quadro pertence a outro serviço.');
    if (b.journeyId && !g.journeys[b.journeyId]) addIssue(out,'error','orphan-board-journey',`views.whiteboards.${bid}.journeyId`,'Quadro aponta para jornada inexistente.');
    for (const [iid,it] of Object.entries(b.items||{})) {
      if (iid!==it.id) addIssue(out,'error','item-id-key',`views.whiteboards.${bid}.items.${iid}`,'Chave e ID visual divergem.');
      if (it.kind==='smart' && !entityExists(g,it.objectKind,it.objectId)) { out.stats.orphanSmartItems++; addIssue(out,'error','orphan-smart-item',`views.whiteboards.${bid}.items.${iid}`,`Card aponta para ${it.objectKind}/${it.objectId} inexistente.`); }
      if (it.asset?.dataUrl && !isSafeImageDataUrl(it.asset.dataUrl)) { out.stats.unsafeAssets++; addIssue(out,'error','unsafe-image-data',`views.whiteboards.${bid}.items.${iid}.asset.dataUrl`,'Imagem possui origem insegura.'); }
      if (it.url && !HTTP_RE.test(String(it.url))) addIssue(out,'warning','unsafe-link',`views.whiteboards.${bid}.items.${iid}.url`,'Link externo não usa HTTP(S).');
    }
    for (const [eid,e] of Object.entries(b.edges||{})) if (!b.items?.[e.fromId] || !b.items?.[e.toId] || e.fromId===e.toId) { out.stats.danglingEdges++; addIssue(out,'error','dangling-edge',`views.whiteboards.${bid}.edges.${eid}`,'Conexão aponta para objeto inexistente ou para si mesma.'); }
  }
  const collab=g.service?.collaboration;
  if(collab){
    const members=collab.members||{};
    if(collab.currentUserId&&!members[collab.currentUserId])addIssue(out,'warning','collab-current-user-missing','service.collaboration.currentUserId','Usuário atual da colaboração não existe mais.');
    const itemExists=id=>values(g.views?.whiteboards).some(b=>!!b.items?.[id]);
    for(const c of collab.comments||[]){
      if(c.authorId&&!members[c.authorId])addIssue(out,'warning','collab-comment-author','service.collaboration.comments','Comentário aponta para autor inexistente.',{targetId:c.id});
      const valid=c.targetType==='service'?c.targetId===g.service.id:c.targetType==='journey'?!!g.journeys[c.targetId]:c.targetType==='stage'?!!g.stages[c.targetId]:c.targetType==='board'?!!g.views?.whiteboards?.[c.targetId]:c.targetType==='item'?itemExists(c.targetId):true;
      if(!valid)addIssue(out,'warning','collab-comment-target','service.collaboration.comments','Comentário aponta para alvo removido.',{targetId:c.id});
    }
  }
  const orState=g.service?.operatingReview;
  if (orState) {
    for (const d of orState.decisions||[]) {
      if (d.taskId && !g.tasks[d.taskId]) addIssue(out,'warning','decision-task-missing',`service.operatingReview.decisions.${d.id}.taskId`,'Decisão aponta para iniciativa removida.');
    }
    const decisionIds=new Set((orState.decisions||[]).map(d=>d.id));
    for (const m of orState.meetings||[]) for (const did of m.decisionIds||[]) if (!decisionIds.has(did)) addIssue(out,'warning','meeting-decision-missing',`service.operatingReview.meetings.${m.id}.decisionIds`,'Reunião referencia decisão inexistente.');
  }
  out.stats.references=out.errors.length+out.warnings.length;
  out.ok=out.errors.length===0;
  return out;
}

function sanitizeGraph(g) {
  for (const b of values(g.views?.whiteboards)) for (const it of values(b.items)) {
    if (it.asset?.dataUrl && !isSafeImageDataUrl(it.asset.dataUrl)) it.asset.dataUrl='';
    if (it.url && !HTTP_RE.test(String(it.url))) it.url='';
  }
  return g;
}

function filterIds(arr,exists){return uniq(arr).filter(exists)}
export function repairGraphIntegrity(input) {
  const g=migrateGraphV3(input); const repairs=[];
  g.service.journeyIds=filterIds(g.service.journeyIds,id=>!!g.journeys[id]);
  for (const [jid,j] of Object.entries(g.journeys||{})) {
    j.stageIds=filterIds(j.stageIds,id=>g.stages[id]?.journeyId===jid);
    if (j.serviceId!==g.service.id){j.serviceId=g.service.id;repairs.push(`journey:${jid}:serviceId`)}
  }
  for (const [sid,st] of Object.entries(g.stages||{})) {
    st.touchpointIds=filterIds(st.touchpointIds,id=>!!g.touchpoints[id]);
    st.problemIds=filterIds(st.problemIds,id=>g.problems[id]?.stageId===sid);
    st.opportunityIds=filterIds(st.opportunityIds,id=>g.opportunities[id]?.stageId===sid);
  }
  for (const o of values(g.opportunities)) { o.problemIds=filterIds(o.problemIds,id=>!!g.problems[id]); o.taskIds=filterIds(o.taskIds,id=>!!g.tasks[id]); o.metricIds=filterIds(o.metricIds,id=>entityExists(g,'metric',id)); }
  for (const t of values(g.tasks)) { if(t.stageId&&!g.stages[t.stageId]){t.stageId='';repairs.push(`task:${t.id}:stageId`)} if(t.journeyId&&!g.journeys[t.journeyId])t.journeyId=''; if(t.opportunityId&&!g.opportunities[t.opportunityId])t.opportunityId=''; t.dependencyIds=filterIds(t.dependencyIds,id=>!!g.tasks[id]&&id!==t.id); t.metricIds=filterIds(t.metricIds,id=>entityExists(g,'metric',id)); }
  for (const [kind,col] of Object.entries(g.entities||{})) for (const rec of values(col)) {
    if(rec.stageId&&!g.stages[rec.stageId]){rec.stageId='';repairs.push(`${kind}:${rec.id}:stageId`)}
    if(rec.journeyId&&!g.journeys[rec.journeyId])rec.journeyId='';
    if(Array.isArray(rec.sourceIds))rec.sourceIds=filterIds(rec.sourceIds,id=>!!g.research?.sources?.[id]);
    if(rec.sourceId&&!g.research?.sources?.[rec.sourceId])rec.sourceId='';
    if(Array.isArray(rec.evidenceIds))rec.evidenceIds=filterIds(rec.evidenceIds,id=>entityExists(g,'evidence',id));
    if(Array.isArray(rec.metricIds))rec.metricIds=filterIds(rec.metricIds,id=>entityExists(g,'metric',id));
    if(Array.isArray(rec.taskIds))rec.taskIds=filterIds(rec.taskIds,id=>!!g.tasks[id]);
    if(Array.isArray(rec.opportunityIds))rec.opportunityIds=filterIds(rec.opportunityIds,id=>!!g.opportunities[id]);
    if(Array.isArray(rec.scenarioIds))rec.scenarioIds=filterIds(rec.scenarioIds,id=>!!g.service?.scenarios?.[id]);
  }
  for (const b of values(g.views?.whiteboards)) {
    if(b.journeyId&&!g.journeys[b.journeyId])b.journeyId='';
    for (const [iid,it] of Object.entries(b.items||{})) if(it.kind==='smart'&&!entityExists(g,it.objectKind,it.objectId)){delete b.items[iid];repairs.push(`board:${b.id}:item:${iid}`)}
    for (const [eid,e] of Object.entries(b.edges||{})) if(!b.items?.[e.fromId]||!b.items?.[e.toId]||e.fromId===e.toId){delete b.edges[eid];repairs.push(`board:${b.id}:edge:${eid}`)}
  }
  const os=g.service?.operatingReview;if(os){const dset=new Set((os.decisions||[]).map(d=>d.id));for(const d of os.decisions||[])if(d.taskId&&!g.tasks[d.taskId])d.taskId='';for(const m of os.meetings||[])m.decisionIds=filterIds(m.decisionIds,id=>dset.has(id))}
  const cs=g.service?.collaboration;if(cs){cs.members ||= {};const ids=Object.keys(cs.members);if(!cs.currentUserId||!cs.members[cs.currentUserId])cs.currentUserId=ids[0]||'';const itemExists=id=>values(g.views?.whiteboards).some(b=>!!b.items?.[id]);for(const c of cs.comments||[]){if(c.authorId&&!cs.members[c.authorId])c.authorId=cs.currentUserId;const valid=c.targetType==='service'?c.targetId===g.service.id:c.targetType==='journey'?!!g.journeys[c.targetId]:c.targetType==='stage'?!!g.stages[c.targetId]:c.targetType==='board'?!!g.views?.whiteboards?.[c.targetId]:c.targetType==='item'?itemExists(c.targetId):true;if(!valid){c.targetType='service';c.targetId=g.service.id;c.targetLabel=g.service.name||'Serviço';repairs.push(`collaboration:comment:${c.id}:target`)}}}
  sanitizeGraph(g);g.integrity={...(g.integrity||{}),schemaVersion:3,lastValidatedAt:new Date().toISOString(),lastRepairAt:new Date().toISOString(),repairCount:(g.integrity?.repairCount||0)+repairs.length};
  return {graph:g,repairs,report:validateGraphDeep(g)};
}

export function deletePlan(g,kind,id){const plan={kind,id,exists:entityExists(g,kind,id),cascade:[],detach:[],block:[]};if(!plan.exists)return plan;
  const cascade=(k,x)=>plan.cascade.push({kind:k,id:x}),detach=(k,x,field)=>plan.detach.push({kind:k,id:x,field});
  if(kind==='stage'){
    for(const j of values(g.journeys))if(j.sourceStageId===id){detach('journey',j.id,'parentJourneyId');detach('journey',j.id,'sourceStageId')}
    const st=g.stages[id];for(const pid of st.problemIds||[])cascade('problem',pid);for(const oid of st.opportunityIds||[]){cascade('opportunity',oid);for(const tid of g.opportunities?.[oid]?.taskIds||[])cascade('task',tid)}
    for(const [ek,col] of Object.entries(g.entities||{}))for(const rec of values(col))if(rec.stageId===id)detach(ek,rec.id,'stageId');
  } else if(kind==='journey'){
    for(const j of values(g.journeys))if(j.parentJourneyId===id){detach('journey',j.id,'parentJourneyId');detach('journey',j.id,'sourceStageId')}
    const j=g.journeys[id];
    for(const sid of j.stageIds||[]){
      const sub=deletePlan(g,'stage',sid);cascade('stage',sid);for(const c of sub.cascade||[])cascade(c.kind,c.id);for(const d of sub.detach||[])detach(d.kind,d.id,d.field);
    }
    for(const [ek,col] of Object.entries(g.entities||{}))for(const rec of values(col))if(rec.journeyId===id)detach(ek,rec.id,'journeyId');
    for(const b of values(g.views?.whiteboards))if(b.journeyId===id)plan.cascade.push({kind:'board',id:b.id});
  }
  const uniq=(arr,key)=>[...new Map(arr.map(x=>[key(x),x])).values()];plan.cascade=uniq(plan.cascade,x=>`${x.kind}:${x.id}`);plan.detach=uniq(plan.detach,x=>`${x.kind}:${x.id}:${x.field}`);return plan;
}

function removeIdFromAllArrays(g,id){const walk=o=>{if(!o||typeof o!=='object')return;if(Array.isArray(o))return;for(const [k,v]of Object.entries(o)){if(Array.isArray(v)&&/(Ids|ids)$/.test(k))o[k]=v.filter(x=>x!==id);else if(v&&typeof v==='object')walk(v)}};walk(g)}
function deleteOne(g,kind,id){const col=collectionFor(g,kind);if(col)delete col[id];removeIdFromAllArrays(g,id);for(const b of values(g.views?.whiteboards)){for(const [iid,it]of Object.entries(b.items||{}))if(it.kind==='smart'&&it.objectKind===kind&&it.objectId===id)delete b.items[iid];for(const [eid,e]of Object.entries(b.edges||{}))if(!b.items?.[e.fromId]||!b.items?.[e.toId])delete b.edges[eid]}}
export function applyDeletePlan(input,plan){const g=clone(input);if(plan.block?.length)throw new Error(plan.block[0].reason||'Exclusão bloqueada por integridade.');for(const d of plan.detach||[]){const rec=collectionFor(g,d.kind)?.[d.id];if(rec)rec[d.field]=''}for(const c of [...(plan.cascade||[])].reverse()){if(c.kind==='board')delete g.views.whiteboards[c.id];else deleteOne(g,c.kind,c.id)}deleteOne(g,plan.kind,plan.id);return repairGraphIntegrity(g).graph}

function reportModal(report){document.getElementById('rt1100-integrity-modal')?.remove();const root=document.createElement('div');root.id='rt1100-integrity-modal';root.style.cssText='position:fixed;inset:0;z-index:12000;background:rgba(15,23,42,.42);display:grid;place-items:center;padding:24px';const box=document.createElement('div');box.style.cssText='width:min(760px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;padding:24px;font:14px system-ui;color:#172033;box-shadow:0 30px 80px rgba(0,0,0,.22)';const h=document.createElement('h2');h.textContent='Integridade dos dados';h.style.margin='0 0 8px';const p=document.createElement('p');p.textContent=report.ok?'Nenhuma referência quebrada foi encontrada.':`${report.errors.length} erro(s) e ${report.warnings.length} aviso(s) encontrados.`;box.append(h,p);const list=document.createElement('div');list.style.cssText='display:grid;gap:8px;margin:18px 0';for(const x of [...report.errors,...report.warnings].slice(0,30)){const row=document.createElement('div');row.style.cssText='padding:10px 12px;border:1px solid #e4e1d8;border-radius:10px;background:#f7f6f2';row.textContent=`${x.severity==='error'?'Erro':'Aviso'} · ${x.message} (${x.path})`;list.appendChild(row)}if(!list.childNodes.length){const ok=document.createElement('div');ok.textContent='✓ Service Graph consistente';ok.style.cssText='padding:18px;border-radius:10px;background:#e7f4ee;color:#0b6b4d;font-weight:700';list.appendChild(ok)}box.appendChild(list);const foot=document.createElement('div');foot.style.cssText='display:flex;justify-content:flex-end;gap:8px';const close=document.createElement('button');close.textContent='Fechar';close.onclick=()=>root.remove();const repair=document.createElement('button');repair.textContent='Reparar referências seguras';repair.disabled=report.ok;repair.onclick=()=>{const b=runtime.api('dataBridge');if(!b?.transact)return;b.transact(g=>repairGraphIntegrity(g).graph,'Reparar integridade do Service Graph');root.remove();setTimeout(showReport,40)};for(const b of [close,repair])b.style.cssText='border:1px solid #d7d3c8;border-radius:9px;padding:9px 12px;background:#fff;font-weight:700;cursor:pointer';repair.style.background='#0B1F3B';repair.style.color='#fff';foot.append(close,repair);box.appendChild(foot);root.appendChild(box);root.onclick=e=>{if(e.target===root)root.remove()};document.body.appendChild(root)}
export function showReport(){const g=runtime.api('dataBridge')?.get?.();if(!g)return;reportModal(validateGraphDeep(g))}

function bootstrap(){runtime.register('dataIntegrity',{version:'1.10.2',schemaVersion:3,validate:validateGraphDeep,repair:repairGraphIntegrity,migrate:migrateGraphV3,deletePlan,applyDeletePlan,showReport},'1.10.1')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();

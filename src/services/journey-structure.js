import { duplicateMatrixBlock, validateMatrixDocument, normalizeMatrixSpanIds } from './journey-content.js';

export const matrixStageKey = stage => stage.hostStageId || stage.hostLocalId || '';
export const matrixStageIds = normalizeMatrixSpanIds;
export function normalizeMatrixStructure(input = {}) {
  const phases = input?.phases || [];
  if (!Array.isArray(phases) || phases.length > 20) throw Error('A Jornada pode ter até 20 fases.');
  const names = new Set(), ids = new Set(), members = new Set();
  return { version:1, phases:phases.map(phase => {
    const name = typeof phase.name === 'string' ? phase.name.trim().replace(/\s+/g,' ') : '';
    if (!phase.id || typeof phase.id !== 'string' || phase.id.length > 160 || ids.has(phase.id)) throw Error('Identificação de fase inválida.');
    if (!name || name.length > 80 || names.has(name.toLocaleLowerCase())) throw Error('Use nomes únicos de 1 a 80 caracteres para as fases.');
    const stageIds = matrixStageIds(phase.stageIds);
    if (!stageIds.length || stageIds.some(id => members.has(id))) throw Error('Escolha etapas que não pertençam a outra fase.');
    ids.add(phase.id); names.add(name.toLocaleLowerCase()); stageIds.forEach(id => members.add(id));
    return { id:phase.id, name, stageIds };
  }) };
}
export function validateMatrixStructure(doc) {
  const keys = (doc.steps || []).map(matrixStageKey), known = new Set(keys);
  if(keys.length>90)throw Error('A Jornada pode ter até 90 etapas.');
  if (keys.some(id => !id) || keys.length !== known.size) throw Error('As etapas precisam de identidades distintas.');
  const structure = normalizeMatrixStructure(doc.structure);
  if (structure.phases.some(phase => phase.stageIds.some(id => !known.has(id)))) throw Error('Uma etapa da fase foi removida. Reabra a organização.');
  for (const [key, notes] of Object.entries(doc.c || {})) for (const note of notes) {
    const ids = matrixStageIds(note.spanStageIds);
    if (ids.length && (!ids.includes(keys[Number(key.split('|')[1])]) || ids.some(id => !known.has(id)))) throw Error('A abrangência deve incluir a origem e somente etapas existentes.');
  }
  return structure;
}
export function matrixStructureFromDocument(doc, stageIds) {
  const aliases = new Map();
  (doc.steps || []).forEach((step,i) => { for (const key of [step.hostStageId,step.hostLocalId]) if(key) aliases.set(key,stageIds[i]); });
  const structure = normalizeMatrixStructure(doc.structure);
  return { version:1, phases:structure.phases.map(phase => ({...phase,stageIds:phase.stageIds.map(id => aliases.get(id) || id)})) };
}
export function matrixSpanSegments(ids, stages) {
  const set = new Set(matrixStageIds(ids)), segments = [];
  stages.forEach((stage,index) => {
    if (!set.has(matrixStageKey(stage))) return;
    const last = segments.at(-1);
    if (last && last.end === index-1) last.end=index;
    else segments.push({start:index,end:index});
  });
  return segments;
}
const noteId = note => note.i || note.id;
function validate(doc) { validateMatrixDocument(doc); doc.structure=validateMatrixStructure(doc); return doc; }
export function setMatrixSpan(doc, key, id, input) {
  const next = structuredClone(doc), note = next.c[key]?.find(value => noteId(value) === id);
  if (!note) throw Error('O cartão mudou. Reabra a abrangência.');
  const ids = matrixStageIds(input);
  if (ids.length > 1) note.spanStageIds = ids;
  else { if (ids[0] !== matrixStageKey(next.steps[Number(key.split('|')[1])])) throw Error('Inclua a etapa de origem.'); delete note.spanStageIds; }
  return validate(next);
}
export function manageMatrixPhase(doc, action, input = {}) {
  const next=structuredClone(doc), phases=normalizeMatrixStructure(next.structure).phases, previous=phases.find(phase=>phase.id===input.id);
  if (!['save','remove'].includes(action) || (input.id || action==='remove') && !previous) throw Error('Fase indisponível.');
  const record={id:previous?.id || 'phase-'+crypto.randomUUID(),name:input.name,stageIds:input.stageIds};
  next.structure={version:1,phases:action==='remove'?phases.filter(phase=>phase.id!==input.id):previous?phases.map(phase=>phase.id===input.id?record:phase):[...phases,record]};
  return validate(next);
}
/** Source stays complete; callers pass only the identities explicitly selected in the visible view. */
export function operateMatrixSelection(doc, selected, action, targetIndex, newId=()=>crypto.randomUUID()) {
  const ids=new Set(selected), next=structuredClone(doc); let found=0;
  if (!ids.size || ids.size>100) throw Error('Selecione de 1 a 100 cartões.');
  if (!['duplicate','remove','move'].includes(action)) throw Error('Ação de seleção inválida.');
  if (action==='move' && !next.steps[targetIndex]) throw Error('Etapa de destino indisponível.');
  const moves=[];
  for (const [key,notes] of Object.entries(next.c)) {
    const output=[];
    for (const note of notes) {
      if (!ids.has(noteId(note))) { output.push(note); continue; }
      found++;
      if (action==='duplicate') output.push(note,duplicateMatrixBlock(note,newId()));
      if (action==='move') {
        const target=key.split('|')[0]+'|'+targetIndex;
        if (target===key) output.push(note);
        else { if(note.spanStageIds)note.spanStageIds=[...new Set([...note.spanStageIds,matrixStageKey(next.steps[targetIndex])])]; moves.push({target,note}); }
      }
    }
    next.c[key]=output;
  }
  if (found!==ids.size) throw Error('A seleção mudou. Selecione os cartões novamente.');
  for (const {target,note} of moves) (next.c[target] ||= []).push(note);
  return validate(next);
}
export function operateMatrixStages(doc, action, index, direction=1, newId=()=>crypto.randomUUID()) {
  const next=structuredClone(doc), keys=next.steps.map(matrixStageKey), source=next.steps[index];
  if (!source || !['move','remove','duplicate'].includes(action)) throw Error('Etapa indisponível.');
  const sourceKey=keys[index], oldCells=next.c, remap=new Map();
  if (action==='move') {
    const target=index+direction;if(!next.steps[target])throw Error('Não há etapa nessa direção.');
    [next.steps[index],next.steps[target]]=[next.steps[target],next.steps[index]];
  } else if (action==='remove') next.steps.splice(index,1);
  else { const copy={...source,n:source.n+' (cópia)',hostLocalId:newId()};delete copy.hostStageId;next.steps.splice(index+1,0,copy); }
  const current=next.steps.map(matrixStageKey), known=new Set(current);
  keys.forEach((key,oldIndex)=>remap.set(oldIndex,current.indexOf(key)));
  next.c={}; const rescued=[];
  for (const [key,notes] of Object.entries(oldCells)) {
    const [row,col]=key.split('|'), target=remap.get(Number(col));
    for (const note of notes) {
      const surviving=matrixStageIds(note.spanStageIds).filter(id=>known.has(id));
      if (surviving.length>1) note.spanStageIds=surviving;else delete note.spanStageIds;
      if (target>=0) (next.c[row+'|'+target] ||= []).push(note);
      else if (surviving.length) rescued.push({row,target:current.findIndex(id=>surviving.includes(id)),note});
    }
  }
  for (const {row,target,note} of rescued) (next.c[row+'|'+target] ||= []).push(note);
  next.iss=(next.iss||[]).map(issue=>({...issue,s:remap.get(issue.s)})).filter(issue=>issue.s>=0);
  next.structure=normalizeMatrixStructure(next.structure);
  next.structure.phases=next.structure.phases.map(phase=>({...phase,stageIds:phase.stageIds.filter(id=>known.has(id))})).filter(phase=>phase.stageIds.length);
  if(action==='duplicate') {
    const duplicateKey=current[index+1];
    for(const [key,notes] of Object.entries(oldCells)) if(Number(key.split('|')[1])===index) next.c[key.split('|')[0]+'|'+(index+1)]=notes.map(note=>{const copy=duplicateMatrixBlock(note,newId());delete copy.spanStageIds;return copy});
    for(const issue of doc.iss||[])if(issue.s===index){const copy={...issue,s:index+1,hostLocalId:newId()};delete copy.hostEntityId;next.iss.push(copy)}
    const phase=next.structure.phases.find(phase=>phase.stageIds.includes(sourceKey));if(phase)phase.stageIds.push(duplicateKey);
  }
  return validate(next);
}

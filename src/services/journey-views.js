import { normalizeMatrixCardFilters } from './journey-content.js';
const baseRows = ['sd','ev','ac','em','fl','bk','sy','im','go','ch','pr','br','rr','ki'];
const rows = value => Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-z][a-z0-9]{0,24}$/.test(id)))].slice(0,150) : [];
const bounded = (value,min,max,fallback) => Number.isFinite(Number(value)) ? Math.round(Math.max(min,Math.min(max,Number(value)))) : fallback;
const stageWidths = value => Array.isArray(value) ? value.slice(0,100).map(v=>bounded(v,210,600,290)) : [];
const rowHeights = value => Object.fromEntries(Object.entries(value && typeof value==='object' && !Array.isArray(value) ? value : {})
  .filter(([id])=>/^[a-z][a-z0-9]{0,24}$/.test(id)).slice(0,150)
  .map(([id,height])=>[id,bounded(height,76,540,110)]));
const name = value => {
  const result = typeof value === 'string' ? value.trim().replace(/\s+/g,' ') : '';
  if (!result || result.length > 80) throw Error('Use um nome de 1 a 80 caracteres.');
  return result;
};
function normalizeMatrixViewSnapshot(input = {}) {
  return { version:1, perspective:input.perspective==='blueprint'||!input.perspective&&input.preset==='operational'?'blueprint':'journey',preset:['essential','detailed','operational','acquisition','complete','custom'].includes(input.preset)?input.preset:'custom',
    hiddenRows:rows(input.hiddenRows),rowOrder:rows(input.rowOrder),insightsOpen:input.insightsOpen===true,
    insightsTab:['guidance','analysis','quality'].includes(input.insightsTab)?input.insightsTab:'guidance',
    emotionsExpanded:input.emotionsExpanded===true,fitToScreen:input.fitToScreen===true,
    zoom:bounded(input.zoom,75,150,100),stageWidths:stageWidths(input.stageWidths),rowHeights:rowHeights(input.rowHeights),collapsedRows:rows(input.collapsedRows),
    cardFilters:normalizeMatrixCardFilters(input.cardFilters) };
}
/** Each perspective remembers configuration only, with a bounded, non-recursive shape. */
export function normalizeSavedMatrixView(input = {}) {
  const view = normalizeMatrixViewSnapshot(input);
  view.perspectiveViews = Object.fromEntries(['journey','blueprint']
    .filter(key => input.perspectiveViews?.[key] && typeof input.perspectiveViews[key] === 'object')
    .map(key => [key, {...normalizeMatrixViewSnapshot(input.perspectiveViews[key]),perspective:key}]));
  return view;
}
export function switchMatrixPerspective(input, perspective, definitions) {
  const current = normalizeSavedMatrixView(input);
  if (!['journey','blueprint'].includes(perspective) || perspective === current.perspective) return current;
  const memory = {...current.perspectiveViews,[current.perspective]:normalizeMatrixViewSnapshot(current)};
  const visible = perspective === 'blueprint' ? ['sd','ev','ac','em','fl','bk','sy','im'] : ['sd','ac','em'];
  const defaults = {...current,perspective,preset:perspective === 'blueprint' ? 'operational' : 'essential',
    rowOrder:definitions.map(row=>row.id),hiddenRows:definitions.filter(row=>!visible.includes(row.id)&&!row.custom).map(row=>row.id),
    collapsedRows:[],cardFilters:{}};
  const next = normalizeMatrixViewSnapshot(memory[perspective] || defaults);
  return {...next,perspective,perspectiveViews:memory};
}
/** A divider is meaningful only when its two semantic layers are in the right order. */
export function matrixBlueprintBoundary(id, visibleRows) {
  const previous = {fl:'ac',bk:'fl',sy:'bk'}[id];
  if (!previous) return null;
  const at = visibleRows.indexOf(id), before = visibleRows.indexOf(previous);
  const between = visibleRows.slice(before+1,at);
  return {previous,valid:before >= 0 && before < at && !between.some(row=>['fl','bk','sy'].includes(row)),
    hidden:before < 0};
}
/** Configuration only: never copies or rewrites the map's cards, stages or observations. */
export function manageJourneySavedView(graph, journeyId, action, input = {}, now = new Date().toISOString()) {
  const journey = graph.journeys[journeyId];
  if (!journey) throw Error('Jornada indisponível.');
  const list = Array.isArray(journey.savedMatrixViews) ? journey.savedMatrixViews : [];
  const previous = list.find(record => record.id === input.id);
  if (!['create','update','rename','remove','apply'].includes(action)) throw Error('Ação de visualização inválida.');
  if (action !== 'create' && !previous) throw Error('Visualização indisponível nesta Jornada.');
  if (action === 'remove') { journey.savedMatrixViews = list.filter(record => record.id !== input.id); return graph; }
  const personaId = action === 'apply' ? previous.personaId || '' : action === 'rename' ? previous.personaId || '' : journey.personaId || '';
  const persona = graph.entities?.persona?.[personaId];
  if (action !== 'rename' && personaId && (!persona || persona.serviceId && persona.serviceId !== graph.service.id)) throw Error('A Persona desta visualização está indisponível. Selecione outra Persona e atualize a visualização.');
  if (action === 'apply') {
    const legacyRows=Object.values(graph.views?.whiteboards||{}).filter(board=>board.journeyId===journeyId).flatMap(board=>(board.blueprintHosted?.lanes||[]).map(row=>row.id));
    const allowed = new Set([...baseRows,...Object.keys(journey.matrixContent?.rows||{}),...rows(legacyRows)]);
    const reconcile = snapshot => {
      const captured = snapshot.rowOrder.filter(id => allowed.has(id));
      const added = [...allowed].filter(id => !captured.includes(id));
      return {...snapshot,rowOrder:[...captured,...added],hiddenRows:[...new Set([...snapshot.hiddenRows.filter(id=>allowed.has(id)),...added])]};
    };
    const snapshot = normalizeSavedMatrixView(previous.view);
    journey.matrixView = {...reconcile(snapshot),perspectiveViews:Object.fromEntries(Object.entries(snapshot.perspectiveViews).map(([key,value])=>[key,reconcile(value)]))};
    journey.personaId = personaId;
    return graph;
  }
  const title = action === 'update' ? previous.name : name(input.name);
  if (list.some(record => record.id !== previous?.id && record.name.toLocaleLowerCase() === title.toLocaleLowerCase())) throw Error('Já existe uma visualização com esse nome.');
  if (action === 'create' && list.length >= 20) throw Error('Esta Jornada pode ter até 20 visualizações salvas.');
  const record = action === 'rename' ? {...previous,name:title,updatedAt:now} : {id:previous?.id||'view-'+crypto.randomUUID(),name:title,personaId,view:normalizeSavedMatrixView(input.view),createdAt:previous?.createdAt||now,updatedAt:now};
  journey.savedMatrixViews = previous ? list.map(value=>value.id===record.id?record:value) : [...list,record];
  return graph;
}

const baseRows = ['sd','ev','ac','em','fl','bk','sy','im','go','ch','pr','br','rr','ki'];
const rows = value => Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string' && /^[a-z][a-z0-9]{0,24}$/.test(id)))].slice(0,150) : [];
const name = value => {
  const result = typeof value === 'string' ? value.trim().replace(/\s+/g,' ') : '';
  if (!result || result.length > 80) throw Error('Use um nome de 1 a 80 caracteres.');
  return result;
};
export function normalizeSavedMatrixView(input = {}) {
  return { version:1, preset:['essential','detailed','operational','acquisition','complete','custom'].includes(input.preset)?input.preset:'custom',
    hiddenRows:rows(input.hiddenRows),rowOrder:rows(input.rowOrder),insightsOpen:input.insightsOpen===true,
    insightsTab:['guidance','analysis','quality'].includes(input.insightsTab)?input.insightsTab:'guidance',
    emotionsExpanded:input.emotionsExpanded===true,fitToScreen:input.fitToScreen===true };
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
    const snapshot = normalizeSavedMatrixView(previous.view), captured = snapshot.rowOrder.filter(id => allowed.has(id));
    const added = [...allowed].filter(id => !captured.includes(id));
    journey.matrixView = {...snapshot,rowOrder:[...captured,...added],hiddenRows:[...new Set([...snapshot.hiddenRows.filter(id=>allowed.has(id)),...added])]};
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

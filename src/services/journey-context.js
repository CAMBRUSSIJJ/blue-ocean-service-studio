const text = (value, limit = 1000) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const belongs = (graph, record) => record && (!record.serviceId || record.serviceId === graph.service.id);
const journeyFor = (graph, id) => {
  const journey = graph.journeys[id];
  if (!journey) throw Error('Jornada indisponível.');
  return journey;
};
export function selectJourneyPersona(graph, journeyId, personaId) {
  const journey = journeyFor(graph, journeyId), id = text(personaId, 160);
  if (id && !belongs(graph, graph.entities?.persona?.[id])) throw Error('Esta Persona não está disponível no serviço.');
  journey.personaId = id;
  return graph;
}
function personaEmotion(graph, journey, stage) {
  return Object.values(graph.entities?.emotion || {}).find(record => belongs(graph, record) && record.stageId === stage.id && record.personaId === journey.personaId && record.experienceState !== 'future');
}
export function readJourneyEmotion(graph, journey, stage) {
  const record = journey.personaId ? personaEmotion(graph, journey, stage) : stage;
  const raw = journey.personaId ? record?.score : record?.emotionScore;
  const score = Number.isInteger(raw) ? Math.max(-2, Math.min(2, raw)) : !journey.personaId && record?.emotion === 'negative' ? -1 : !journey.personaId && record?.emotion === 'positive' ? 1 : 0;
  const note = text(journey.personaId ? record?.note : record?.emotionNote);
  const known = record?.emotionRecorded === true || record?.emotionRecorded === undefined && (score !== 0 || !!note);
  return { e: known ? score : 0, note, emotionRecorded: known, emotionStatus: record?.emotionStatus || 'hypothesis', emotionSource: text(record?.emotionSource) };
}
export function writeJourneyEmotion(graph, journey, stage, input, now = new Date().toISOString()) {
  const score = Number(input.e), recorded = input.emotionRecorded === true;
  if (!Number.isInteger(score) || score < -2 || score > 2) throw Error('Intensidade emocional inválida.');
  const source = text(input.emotionSource), note = text(input.note);
  if (recorded && input.emotionStatus === 'validated' && !source) throw Error('Informe a fonte da evidência para validar uma emoção.');
  const fields = { emotionRecorded: recorded, emotionStatus: recorded ? input.emotionStatus === 'validated' ? 'validated' : 'hypothesis' : undefined, emotionSource: source };
  if (!journey.personaId) {
    Object.assign(stage, fields, { emotion: recorded && score < 0 ? 'negative' : recorded && score > 0 ? 'positive' : 'neutral', emotionNote: note });
    if (recorded) stage.emotionScore = score; else delete stage.emotionScore;
    return;
  }
  if (!belongs(graph, graph.entities?.persona?.[journey.personaId])) throw Error('Selecione uma Persona disponível antes de registrar emoções.');
  let record = personaEmotion(graph, journey, stage);
  if (!record && !recorded && !note && !source) return;
  graph.entities.emotion ||= {};
  if (!record) {
    const id = 'emotion-' + crypto.randomUUID();
    record = graph.entities.emotion[id] = { id, type: 'emotion', serviceId: graph.service.id, stageId: stage.id, personaId: journey.personaId, experienceState: 'current', createdAt: now };
  }
  Object.assign(record, fields, { score: recorded ? score : 0, note, title: recorded ? ['Muito negativa', 'Negativa', 'Neutra', 'Positiva', 'Muito positiva'][score + 2] : 'Não informada', updatedAt: now });
  stage.emotionIds ||= []; if (!stage.emotionIds.includes(record.id)) stage.emotionIds.push(record.id);
  stage.personaIds ||= []; if (!stage.personaIds.includes(journey.personaId)) stage.personaIds.push(journey.personaId);
}
export function journeyPainContexts(graph, journeyId) {
  const journey = journeyFor(graph, journeyId), evidence = graph.entities?.evidence || {};
  return [...Object.values(graph.entities?.pain || {}).filter(record => belongs(graph, record)).map(record => ({ record, kind: 'research' })),
    ...Object.values(graph.problems || {}).map(record => ({ record, kind: 'journey' }))].map(({ record, kind }) => ({
    id: record.id, localId: record.blueprintHostLocalId || '', kind, title: text(record.description || record.title), stageId: record.stageId || '',
    stage: text(graph.stages[record.stageId]?.title, 240), inJourney: kind === 'journey' && journey.stageIds.includes(record.stageId),
    sourcePainId: record.sourcePainId || '',
    evidenceIds: Array.isArray(record.evidenceIds) ? [...record.evidenceIds] : [],
    evidence: (record.evidenceIds || []).map(id => evidence[id]).filter(record => belongs(graph, record)).map(record => ({ id: record.id, title: text(record.title || record.name), description: text(record.description), source: text(record.source) }))
  }));
}
export function saveJourneyPainEvidence(graph, journeyId, sourceId, evidenceIds, stageId, planNext = false, now = new Date().toISOString()) {
  const journey = journeyFor(graph, journeyId), source = graph.problems[sourceId] || graph.entities?.pain?.[sourceId];
  if (!belongs(graph, source)) throw Error('Dor indisponível neste serviço.');
  if (!Array.isArray(evidenceIds) || evidenceIds.length > 100) throw Error('Seleção de evidências inválida.');
  const ids = [...new Set(evidenceIds)];
  if (ids.some(id => typeof id !== 'string' || !belongs(graph, graph.entities?.evidence?.[id]))) throw Error('Selecione apenas evidências disponíveis no serviço.');
  const native = !!graph.problems[sourceId];
  if (native && !journey.stageIds.includes(source.stageId)) throw Error('Esta dor pertence a outra Jornada.');
  if (planNext && !native && !journey.stageIds.includes(stageId)) throw Error('Escolha uma etapa desta Jornada.');
  source.evidenceIds = ids; source.updatedAt = now;
  let problem = native ? source : null;
  if (planNext && !native) {
    problem = Object.values(graph.problems).find(record => record.stageId === stageId && record.sourcePainId === sourceId);
    if (!problem) {
      const id = 'problem-' + crypto.randomUUID();
      problem = graph.problems[id] = { id, stageId, sourcePainId: sourceId, description: text(source.description || source.title), createdAt: now };
      graph.stages[stageId].problemIds ||= []; graph.stages[stageId].problemIds.push(id);
    }
    problem.evidenceIds = [...ids]; problem.updatedAt = now;
  }
  if (problem) {
    for (const record of Object.values(graph.service.improvementBacklog?.problems || {})) {
      if (record.sourceKey === 'journey-problem:' + problem.id) { record.evidenceIds = [...ids]; record.updatedAt = now; }
    }
  }
  return { graph, problemId: problem?.id || '' };
}

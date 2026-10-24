import { insertMatrixBlock, normalizeMatrixBlock, validateMatrixDocument } from './journey-content.js';
import { readJourneyEmotion } from './journey-context.js';

export const JOURNEY_ELEMENT_TYPES = ['pain', 'need', 'persona', 'evidence', 'channel', 'opportunity'];
const field = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';

/** Prepare creation and placement together. Validation failures never mutate either input. */
export function prepareJourneyElement(graph, journeyId, document, input, actorId = '', now = new Date().toISOString()) {
  const journey = graph.journeys?.[journeyId], type = input?.elementType;
  if (!journey || journey.serviceId && journey.serviceId !== graph.service.id) throw Error('Jornada indisponível neste serviço.');
  if (!JOURNEY_ELEMENT_TYPES.includes(type)) throw Error('Tipo de elemento inválido.');
  const index = document.steps.findIndex(step => input.stageId ? step.hostStageId === input.stageId : input.stageLocalId && step.hostLocalId === input.stageLocalId);
  const stageId = document.steps[index]?.hostStageId;
  if (index < 0 || !stageId || !journey.stageIds.includes(stageId)) throw Error('A etapa mudou. Abra o seletor novamente.');
  const row = field(input.rowId, 25);
  if (!/^[a-z][a-z0-9]{0,24}$/.test(row) || row !== input.rowId) throw Error('Faixa inválida.');
  const key = row + '|' + index, notes = document.c[key] || [], editingId = field(input.editingId, 160);
  const old = editingId ? notes.find(note => note.i === editingId) : null;
  if (editingId && (!old || old.type !== type)) throw Error('O cartão mudou. Abra o seletor novamente.');
  let referenceId = field(input.referenceId, 160), record;
  if (input.newRecord) {
    if (referenceId) throw Error('Escolha um registro existente ou crie um novo.');
    const title = field(input.newRecord.title, 240);
    if (!title) throw Error('Informe o nome do registro.');
    if (type === 'evidence' && !field(input.newRecord.source, 1000)) throw Error('Informe a fonte da evidência.');
    const id = type + '-' + crypto.randomUUID();
    record = { id, type, serviceId: graph.service.id, title, description: field(input.newRecord.description, 1000),
      category: field(input.newRecord.category, 160), source: field(input.newRecord.source, 1000), relatedIds: [],
      createdBy: field(actorId, 160), createdAt: now, updatedAt: now, status: type === 'evidence' ? 'captured' : 'active' };
    if (type === 'opportunity') Object.assign(record, { stageId, problemIds: [], taskIds: [] });
    referenceId = id;
  } else {
    const record = (type === 'pain' ? graph.problems?.[referenceId] : type === 'opportunity' ? graph.opportunities?.[referenceId] : null) || graph.entities?.[type]?.[referenceId];
    if (!record || record.serviceId && record.serviceId !== graph.service.id) throw Error('Este registro não está mais disponível neste serviço.');
  }
  if (notes.some(note => note.i !== editingId && note.type === type && note.referenceId === referenceId)) throw Error('Este registro já está vinculado nesta célula.');
  const note = { ...old, i: old?.i || 'element-' + crypto.randomUUID(), type, referenceId, t: field(input.caption, 1000) };
  normalizeMatrixBlock(note);
  const nextDocument = structuredClone(document);
  nextDocument.c[key] = old ? notes.map(value => value.i === old.i ? note : value) : insertMatrixBlock(notes, note, input.beforeId || null);
  validateMatrixDocument(nextDocument);
  const nextGraph = structuredClone(graph);
  if (record) {
    if (type === 'opportunity') {
      nextGraph.opportunities ||= {}; nextGraph.opportunities[record.id] = record;
      (nextGraph.stages[stageId].opportunityIds ||= []).push(record.id);
    } else {
      nextGraph.entities ||= {}; nextGraph.entities[type] ||= {}; nextGraph.entities[type][record.id] = record;
    }
  }
  if (type === 'persona' && input.useAsJourneyPersona === true) {
    const nextJourney = nextGraph.journeys[journeyId];
    nextJourney.personaId = referenceId;
    nextDocument.personaId = referenceId;
    // A context switch must read that Persona's own observations, never copy another person's emotions.
    nextDocument.steps.forEach(step => Object.assign(step, readJourneyEmotion(nextGraph, nextJourney, nextGraph.stages[step.hostStageId])));
  }
  return { graph: nextGraph, document: nextDocument, noteId: note.i, referenceId };
}

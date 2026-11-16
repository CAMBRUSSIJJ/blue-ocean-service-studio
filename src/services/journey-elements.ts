import { insertMatrixBlock, normalizeMatrixBlock, validateMatrixDocument } from './journey-content.ts';
import { readJourneyEmotion } from './journey-context.ts';
import type { ServiceGraph } from '../domain/model';

export const JOURNEY_ELEMENT_TYPES = ['pain', 'need', 'persona', 'evidence', 'channel', 'opportunity'] as const;
export type JourneyElementType = typeof JOURNEY_ELEMENT_TYPES[number];

const field = (value: unknown, limit: number): string =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

type AnyRecord = Record<string, unknown>;

export interface JourneyElementInput {
  elementType?: string;
  stageId?: string;
  stageLocalId?: string;
  rowId?: string;
  editingId?: string;
  referenceId?: string;
  newRecord?: { title?: unknown; description?: unknown; category?: unknown; source?: unknown };
  caption?: unknown;
  beforeId?: string | null;
  useAsJourneyPersona?: boolean;
}

export interface MatrixDocument {
  steps: Array<{ hostStageId: string; hostLocalId: string; personaId?: string } & AnyRecord>;
  c: Record<string, AnyRecord[]>;
  personaId?: string;
  [key: string]: unknown;
}

export interface JourneyElementResult {
  graph: ServiceGraph;
  document: MatrixDocument;
  noteId: string;
  referenceId: string;
}

/** Prepare creation and placement together. Validation failures never mutate either input. */
export function prepareJourneyElement(
  graph: ServiceGraph,
  journeyId: string,
  document: MatrixDocument,
  input: JourneyElementInput,
  actorId = '',
  now = new Date().toISOString()
): JourneyElementResult {
  const journey = (graph.journeys as unknown as Record<string, AnyRecord>)?.[journeyId];
  const type = input?.elementType;
  if (!journey || (journey['serviceId'] && journey['serviceId'] !== graph.service.id)) throw Error('Jornada indisponível neste serviço.');
  if (!JOURNEY_ELEMENT_TYPES.includes(type as JourneyElementType)) throw Error('Tipo de elemento inválido.');
  const index = document.steps.findIndex(step =>
    input.stageId ? step.hostStageId === input.stageId : input.stageLocalId && step.hostLocalId === input.stageLocalId
  );
  const stageId = document.steps[index]?.hostStageId;
  const stageIds = journey['stageIds'] as string[];
  if (index < 0 || !stageId || !stageIds.includes(stageId)) throw Error('A etapa mudou. Abra o seletor novamente.');
  const row = field(input.rowId, 25);
  if (!/^[a-z][a-z0-9]{0,24}$/.test(row) || row !== input.rowId) throw Error('Faixa inválida.');
  const key = row + '|' + index, notes = document.c[key] || [], editingId = field(input.editingId, 160);
  const old = editingId ? notes.find(note => (note as AnyRecord)['i'] === editingId) : null;
  if (editingId && (!old || old['type'] !== type)) throw Error('O cartão mudou. Abra o seletor novamente.');
  let referenceId = field(input.referenceId, 160);
  let newRecord: AnyRecord | null = null;
  if (input.newRecord) {
    if (referenceId) throw Error('Escolha um registro existente ou crie um novo.');
    const title = field(input.newRecord.title, 240);
    if (!title) throw Error('Informe o nome do registro.');
    if (type === 'evidence' && !field(input.newRecord.source, 1000)) throw Error('Informe a fonte da evidência.');
    const id = type + '-' + crypto.randomUUID();
    newRecord = {
      id, type, serviceId: graph.service.id, title,
      description: field(input.newRecord.description, 1000),
      category: field(input.newRecord.category, 160),
      source: field(input.newRecord.source, 1000),
      relatedIds: [], createdBy: field(actorId, 160), createdAt: now, updatedAt: now,
      status: type === 'evidence' ? 'captured' : 'active',
    };
    if (type === 'opportunity') Object.assign(newRecord, { stageId, problemIds: [], taskIds: [] });
    referenceId = id;
  } else {
    const entities = (graph as unknown as AnyRecord)['entities'] as Record<string, Record<string, AnyRecord>> | undefined;
    const existing = (type === 'pain' ? (graph as unknown as AnyRecord)['problems'] as Record<string, AnyRecord> : type === 'opportunity' ? (graph as unknown as AnyRecord)['opportunities'] as Record<string, AnyRecord> : null)?.[referenceId]
      || entities?.[type!]?.[referenceId];
    if (!existing || (existing['serviceId'] && existing['serviceId'] !== graph.service.id)) throw Error('Este registro não está mais disponível neste serviço.');
  }
  if (notes.some(note => (note as AnyRecord)['i'] !== editingId && note['type'] === type && note['referenceId'] === referenceId)) throw Error('Este registro já está vinculado nesta célula.');
  const note: AnyRecord = { ...old, i: (old as AnyRecord | null)?.['i'] || 'element-' + crypto.randomUUID(), type, referenceId, t: field(input.caption, 1000) };
  normalizeMatrixBlock(note as unknown as Parameters<typeof normalizeMatrixBlock>[0]);
  const nextDocument = structuredClone(document) as MatrixDocument;
  nextDocument.c[key] = old
    ? notes.map(value => (value as AnyRecord)['i'] === (old as AnyRecord)['i'] ? note : value) as AnyRecord[]
    : insertMatrixBlock(notes as unknown as Parameters<typeof insertMatrixBlock>[1][], note as unknown as Parameters<typeof insertMatrixBlock>[1], input.beforeId || null) as unknown as AnyRecord[];
  validateMatrixDocument(nextDocument as unknown as Parameters<typeof validateMatrixDocument>[0]);
  const nextGraph = structuredClone(graph) as ServiceGraph;
  if (newRecord) {
    if (type === 'opportunity') {
      (nextGraph as unknown as AnyRecord)['opportunities'] ||= {};
      ((nextGraph as unknown as AnyRecord)['opportunities'] as AnyRecord)[newRecord['id'] as string] = newRecord;
      const nextStage = (nextGraph.stages as unknown as Record<string, AnyRecord>)[stageId];
      (nextStage['opportunityIds'] as string[]) ||= [];
      (nextStage['opportunityIds'] as string[]).push(newRecord['id'] as string);
    } else {
      let nextEntities = (nextGraph as unknown as AnyRecord)['entities'] as Record<string, Record<string, AnyRecord>> | undefined;
      if (!nextEntities) { nextEntities = {} as Record<string, Record<string, AnyRecord>>; (nextGraph as unknown as AnyRecord)['entities'] = nextEntities; }
      nextEntities[type!] ||= {};
      nextEntities[type!][newRecord['id'] as string] = newRecord;
    }
  }
  if (type === 'persona' && input.useAsJourneyPersona === true) {
    const nextJourney = (nextGraph.journeys as unknown as Record<string, AnyRecord>)[journeyId];
    nextJourney['personaId'] = referenceId;
    nextDocument.personaId = referenceId;
    // A context switch must read that Persona's own observations, never copy another person's emotions.
    nextDocument.steps.forEach(step =>
      Object.assign(step, readJourneyEmotion(nextGraph, nextJourney as unknown as { personaId?: string }, (nextGraph.stages as unknown as Record<string, AnyRecord>)[step.hostStageId]))
    );
  }
  return { graph: nextGraph, document: nextDocument, noteId: note['i'] as string, referenceId };
}

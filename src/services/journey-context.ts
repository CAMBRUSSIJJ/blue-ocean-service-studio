import type { ServiceGraph } from '../domain/model';

const text = (value: unknown, limit = 1000): string =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

type GraphRecord = Record<string, unknown>;

const belongs = (graph: ServiceGraph, record: GraphRecord | null | undefined): boolean =>
  !!record && (!record['serviceId'] || record['serviceId'] === graph.service.id);

const journeyFor = (graph: ServiceGraph, id: string) => {
  const journey = graph.journeys[id];
  if (!journey) throw Error('Jornada indisponível.');
  return journey;
};

export interface JourneyEmotionState {
  e: number;
  note: string;
  emotionRecorded: boolean;
  emotionStatus: string;
  emotionSource: string;
}

function personaEmotion(graph: ServiceGraph, journey: { personaId?: string }, stage: { id: string }): GraphRecord | undefined {
  const entities = graph.entities as unknown as Record<string, Record<string, GraphRecord>>;
  return Object.values(entities?.['emotion'] || {}).find(record =>
    belongs(graph, record) &&
    record['stageId'] === stage.id &&
    record['personaId'] === journey.personaId &&
    record['experienceState'] !== 'future'
  );
}

export function selectJourneyPersona(graph: ServiceGraph, journeyId: string, personaId: string): ServiceGraph {
  const journey = journeyFor(graph, journeyId), id = text(personaId, 160);
  const entities = graph.entities as unknown as Record<string, Record<string, GraphRecord>>;
  if (id && !belongs(graph, entities?.['persona']?.[id] ?? null)) throw Error('Esta Persona não está disponível no serviço.');
  (journey as unknown as GraphRecord)['personaId'] = id;
  return graph;
}

export function readJourneyEmotion(graph: ServiceGraph, journey: { personaId?: string }, stage: GraphRecord): JourneyEmotionState {
  const record = journey.personaId ? personaEmotion(graph, journey, stage as { id: string }) : stage;
  const raw = journey.personaId ? (record as GraphRecord)?.['score'] : stage['emotionScore'];
  const score = Number.isInteger(raw) ? Math.max(-2, Math.min(2, raw as number)) :
    !journey.personaId && stage['emotion'] === 'negative' ? -1 :
    !journey.personaId && stage['emotion'] === 'positive' ? 1 : 0;
  const note = text(journey.personaId ? (record as GraphRecord)?.['note'] : stage['emotionNote']);
  const known = (record as GraphRecord)?.['emotionRecorded'] === true ||
    (record as GraphRecord)?.['emotionRecorded'] === undefined && (score !== 0 || !!note);
  return {
    e: known ? score : 0, note,
    emotionRecorded: !!known,
    emotionStatus: ((record as GraphRecord)?.['emotionStatus'] as string) || 'hypothesis',
    emotionSource: text((record as GraphRecord)?.['emotionSource']),
  };
}

export function writeJourneyEmotion(
  graph: ServiceGraph,
  journey: { personaId?: string },
  stage: GraphRecord,
  input: { e: unknown; emotionRecorded?: boolean; emotionStatus?: string; emotionSource?: unknown; note?: unknown },
  now = new Date().toISOString()
): void {
  const score = Number(input.e), recorded = input.emotionRecorded === true;
  if (!Number.isInteger(score) || score < -2 || score > 2) throw Error('Intensidade emocional inválida.');
  const source = text(input.emotionSource), note = text(input.note);
  if (recorded && input.emotionStatus === 'validated' && !source) throw Error('Informe a fonte da evidência para validar uma emoção.');
  const fields: GraphRecord = {
    emotionRecorded: recorded,
    emotionStatus: recorded ? (input.emotionStatus === 'validated' ? 'validated' : 'hypothesis') : undefined,
    emotionSource: source,
  };
  if (!journey.personaId) {
    Object.assign(stage, fields, {
      emotion: recorded && score < 0 ? 'negative' : recorded && score > 0 ? 'positive' : 'neutral',
      emotionNote: note,
    });
    if (recorded) stage['emotionScore'] = score; else delete stage['emotionScore'];
    return;
  }
  const entities = graph.entities as unknown as Record<string, Record<string, GraphRecord>>;
  if (!belongs(graph, entities?.['persona']?.[journey.personaId] ?? null)) throw Error('Selecione uma Persona disponível antes de registrar emoções.');
  let record = personaEmotion(graph, journey, stage as { id: string });
  if (!record && !recorded && !note && !source) return;
  (entities as unknown as GraphRecord)['emotion'] = entities['emotion'] || {};
  if (!record) {
    const id = 'emotion-' + crypto.randomUUID();
    record = entities['emotion'][id] = {
      id, type: 'emotion', serviceId: graph.service.id,
      stageId: stage['id'], personaId: journey.personaId, experienceState: 'current', createdAt: now,
    };
  }
  Object.assign(record, fields, {
    score: recorded ? score : 0, note,
    title: recorded ? ['Muito negativa', 'Negativa', 'Neutra', 'Positiva', 'Muito positiva'][score + 2] : 'Não informada',
    updatedAt: now,
  });
  (stage['emotionIds'] as string[]) ||= [];
  if (!(stage['emotionIds'] as string[]).includes(record['id'] as string)) (stage['emotionIds'] as string[]).push(record['id'] as string);
  (stage['personaIds'] as string[]) ||= [];
  if (!(stage['personaIds'] as string[]).includes(journey.personaId)) (stage['personaIds'] as string[]).push(journey.personaId);
}

export interface PainContext {
  id: string;
  localId: string;
  kind: 'research' | 'journey';
  title: string;
  stageId: string;
  stage: string;
  inJourney: boolean;
  sourcePainId: string;
  evidenceIds: string[];
  evidence: Array<{ id: string; title: string; description: string; source: string }>;
}

export function journeyPainContexts(graph: ServiceGraph, journeyId: string): PainContext[] {
  const journey = journeyFor(graph, journeyId);
  const entities = graph.entities as unknown as Record<string, Record<string, GraphRecord>>;
  const evidence = entities?.['evidence'] || {};
  return [
    ...Object.values(entities?.['pain'] || {}).filter(record => belongs(graph, record)).map(record => ({ record, kind: 'research' as const })),
    ...Object.values(graph.problems as unknown as Record<string, GraphRecord>).map(record => ({ record, kind: 'journey' as const })),
  ].map(({ record, kind }) => ({
    id: record['id'] as string,
    localId: (record['blueprintHostLocalId'] as string) || '',
    kind, title: text(record['description'] || record['title']),
    stageId: (record['stageId'] as string) || '',
    stage: text((graph.stages[(record['stageId'] as string)] as unknown as GraphRecord)?.['title'], 240),
    inJourney: kind === 'journey' && journey.stageIds.includes(record['stageId'] as string),
    sourcePainId: (record['sourcePainId'] as string) || '',
    evidenceIds: Array.isArray(record['evidenceIds']) ? [...record['evidenceIds'] as string[]] : [],
    evidence: ((record['evidenceIds'] as string[]) || []).map(id => evidence[id]).filter(r => belongs(graph, r)).map(r => ({
      id: r['id'] as string, title: text(r['title'] || r['name']), description: text(r['description']), source: text(r['source']),
    })),
  }));
}

export function saveJourneyPainEvidence(
  graph: ServiceGraph,
  journeyId: string,
  sourceId: string,
  evidenceIds: string[],
  stageId: string,
  planNext = false,
  now = new Date().toISOString()
): { graph: ServiceGraph; problemId: string } {
  const journey = journeyFor(graph, journeyId);
  const problems = graph.problems as unknown as Record<string, GraphRecord>;
  const entities = graph.entities as unknown as Record<string, Record<string, GraphRecord>>;
  const source = problems[sourceId] || entities?.['pain']?.[sourceId];
  if (!belongs(graph, source ?? null)) throw Error('Dor indisponível neste serviço.');
  if (!Array.isArray(evidenceIds) || evidenceIds.length > 100) throw Error('Seleção de evidências inválida.');
  const ids = [...new Set(evidenceIds)];
  if (ids.some(id => typeof id !== 'string' || !belongs(graph, entities?.['evidence']?.[id] ?? null))) throw Error('Selecione apenas evidências disponíveis no serviço.');
  const native = !!problems[sourceId];
  if (native && !journey.stageIds.includes(source!['stageId'] as string)) throw Error('Esta dor pertence a outra Jornada.');
  if (planNext && !native && !journey.stageIds.includes(stageId)) throw Error('Escolha uma etapa desta Jornada.');
  source!['evidenceIds'] = ids; source!['updatedAt'] = now;
  let problem: GraphRecord | null = native ? source! : null;
  if (planNext && !native) {
    problem = Object.values(problems).find(record => record['stageId'] === stageId && record['sourcePainId'] === sourceId) ?? null;
    if (!problem) {
      const id = 'problem-' + crypto.randomUUID();
      problem = problems[id] = { id, stageId, sourcePainId: sourceId, description: text(source!['description'] || source!['title']), createdAt: now };
      const stages = graph.stages as unknown as Record<string, GraphRecord>;
      (stages[stageId]['problemIds'] as string[]) ||= [];
      (stages[stageId]['problemIds'] as string[]).push(id);
    }
    problem['evidenceIds'] = [...ids]; problem['updatedAt'] = now;
  }
  if (problem) {
    const backlog = (graph.service as unknown as GraphRecord)['improvementBacklog'] as { problems?: Record<string, GraphRecord> } | undefined;
    for (const record of Object.values(backlog?.problems || {})) {
      if (record['sourceKey'] === 'journey-problem:' + problem['id']) { record['evidenceIds'] = [...ids]; record['updatedAt'] = now; }
    }
  }
  return { graph, problemId: (problem?.['id'] as string) || '' };
}

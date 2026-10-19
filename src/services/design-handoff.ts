import type { DesignContextRef, GraphEntity, Id, Journey, ServiceGraph, WhiteboardView } from '../domain/model';
import { buildServiceDefinitionStudioReport } from './service-definition.ts';
import { touchServiceProject } from './service-project.ts';
import { syncWhiteboardDesignContext } from './whiteboard-studio.ts';

export type DesignInputKind = 'persona' | 'need' | 'job' | 'pain' | 'problem' | 'evidence';

export type DesignInputItem = {
  id: Id;
  kind: DesignInputKind;
  title: string;
  description: string;
  selectedByDefinition: boolean;
  confidence?: 'low' | 'medium' | 'high';
};

export type DesignHandoffReport = {
  definitionReady: boolean;
  score: number;
  checks: Array<{ id: string; label: string; complete: boolean; detail: string }>;
  context: DesignContextRef;
  primary: DesignInputItem[];
  supporting: DesignInputItem[];
  counts: Record<DesignInputKind, number>;
  readyForJourney: boolean;
  readyForWhiteboard: boolean;
  readyForBlueprint: boolean;
  journeyStageCount: number;
};

const makeId = (prefix: string): Id => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? `${prefix}-${crypto.randomUUID()}`
  : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const ids = (value: unknown): Id[] => Array.isArray(value)
  ? [...new Set(value.filter((id): id is Id => typeof id === 'string' && Boolean(id)))]
  : [];
const titleOf = (entity: GraphEntity | undefined, fallback = 'Sem título') => String(entity?.title ?? entity?.name ?? fallback);
const descriptionOf = (entity: GraphEntity | undefined) => String(entity?.description ?? '');
const selectedEntity = (graph: ServiceGraph, kind: 'persona' | 'problem' | 'evidence', id: Id): GraphEntity | undefined => {
  if (kind === 'problem') {
    const entity = graph.entities?.problem?.[id];
    if (entity) return entity;
    const problem = graph.problems?.[id];
    if (problem) return { id: problem.id, type: 'problem', title: problem.description, description: problem.description, stageId: problem.stageId };
    return undefined;
  }
  return graph.entities?.[kind]?.[id];
};

function inferSupportingIds(graph: ServiceGraph, seedIds: Set<Id>) {
  const result = { need: new Set<Id>(), job: new Set<Id>(), pain: new Set<Id>() };
  const seedEntities: GraphEntity[] = [];
  for (const kind of ['persona', 'problem', 'evidence'] as const) {
    for (const id of seedIds) {
      const entity = selectedEntity(graph, kind, id);
      if (entity) seedEntities.push(entity);
    }
  }
  for (const entity of seedEntities) {
    for (const id of ids(entity.needIds)) result.need.add(id);
    for (const id of ids(entity.jobIds)) result.job.add(id);
    for (const id of ids(entity.painIds)) result.pain.add(id);
    for (const id of ids(entity.relatedIds)) {
      if (graph.entities?.need?.[id]) result.need.add(id);
      if (graph.entities?.job?.[id]) result.job.add(id);
      if (graph.entities?.pain?.[id]) result.pain.add(id);
    }
  }
  for (const kind of ['need', 'job', 'pain'] as const) {
    for (const entity of Object.values(graph.entities?.[kind] ?? {})) {
      const links = new Set([
        ...ids(entity.relatedIds), ...ids(entity.personaIds), ...ids(entity.problemIds), ...ids(entity.evidenceIds),
      ]);
      if ([...seedIds].some((id) => links.has(id))) result[kind].add(entity.id);
    }
  }
  return result;
}

function contextRef(graph: ServiceGraph, createdAt = new Date().toISOString()): DesignContextRef {
  const definition = graph.service.project?.definition;
  const personaIds = ids(definition?.personaIds).filter((id) => Boolean(graph.entities?.persona?.[id]));
  const problemIds = ids(definition?.problemIds).filter((id) => Boolean(selectedEntity(graph, 'problem', id)));
  const evidenceIds = ids(definition?.evidenceIds).filter((id) => Boolean(graph.entities?.evidence?.[id]));
  const support = inferSupportingIds(graph, new Set([...personaIds, ...problemIds, ...evidenceIds]));
  return {
    version: 1,
    source: 'service-definition',
    createdAt,
    personaIds,
    needIds: [...support.need].filter((id) => Boolean(graph.entities?.need?.[id])),
    jobIds: [...support.job].filter((id) => Boolean(graph.entities?.job?.[id])),
    painIds: [...support.pain].filter((id) => Boolean(graph.entities?.pain?.[id])),
    problemIds,
    evidenceIds,
  };
}

const item = (graph: ServiceGraph, kind: DesignInputKind, id: Id, selectedByDefinition: boolean): DesignInputItem | null => {
  const entity = kind === 'problem' ? selectedEntity(graph, 'problem', id) : graph.entities?.[kind]?.[id];
  if (!entity) return null;
  const confidence = kind === 'evidence' && ['low', 'medium', 'high'].includes(String(entity.confidence))
    ? entity.confidence as 'low' | 'medium' | 'high'
    : undefined;
  return { id, kind, title: titleOf(entity), description: descriptionOf(entity), selectedByDefinition, confidence };
};

export function buildDesignHandoffReport(graph: ServiceGraph): DesignHandoffReport {
  const definition = buildServiceDefinitionStudioReport(graph);
  const context = contextRef(graph);
  const primary = [
    ...context.personaIds.map((id) => item(graph, 'persona', id, true)),
    ...context.problemIds.map((id) => item(graph, 'problem', id, true)),
    ...context.evidenceIds.map((id) => item(graph, 'evidence', id, true)),
  ].filter((value): value is DesignInputItem => Boolean(value));
  const supporting = [
    ...context.needIds.map((id) => item(graph, 'need', id, false)),
    ...context.jobIds.map((id) => item(graph, 'job', id, false)),
    ...context.painIds.map((id) => item(graph, 'pain', id, false)),
  ].filter((value): value is DesignInputItem => Boolean(value));
  const counts: Record<DesignInputKind, number> = {
    persona: context.personaIds.length,
    need: context.needIds.length,
    job: context.jobIds.length,
    pain: context.painIds.length,
    problem: context.problemIds.length,
    evidence: context.evidenceIds.length,
  };
  const journeyStageCount = Object.values(graph.journeys ?? {}).reduce((max, journey) => Math.max(max, journey.stageIds?.length ?? 0), 0);
  const checks = [
    { id: 'definition', label: 'Service Definition pronta', complete: definition.readyToDesign, detail: 'Promessa, outcome, escopo, limites e critérios foram fechados.' },
    { id: 'persona', label: 'Persona-alvo conectada', complete: context.personaIds.length > 0, detail: 'O desenho sabe para quem o serviço deve funcionar.' },
    { id: 'problem', label: 'Problema validado conectado', complete: context.problemIds.length > 0, detail: 'O desenho nasce de um problema rastreável, não de uma solução presumida.' },
    { id: 'evidence', label: 'Evidência conectada', complete: context.evidenceIds.length > 0, detail: 'Decisões de desenho mantêm base observável.' },
    { id: 'support', label: 'Contexto de suporte recuperado', complete: supporting.length > 0, detail: 'Necessidades, Jobs e Dores relacionados são carregados como contexto secundário quando existem.' },
  ];
  const completed = checks.filter((check) => check.complete).length;
  const score = Math.round((completed / checks.length) * 100);
  const readyForJourney = definition.readyToDesign && context.personaIds.length > 0 && context.problemIds.length > 0 && context.evidenceIds.length > 0;
  return {
    definitionReady: definition.readyToDesign,
    score,
    checks,
    context,
    primary,
    supporting,
    counts,
    readyForJourney,
    readyForWhiteboard: readyForJourney,
    readyForBlueprint: readyForJourney && journeyStageCount >= 2,
    journeyStageCount,
  };
}

export function prepareJourneyFromDefinition(graph: ServiceGraph, options: { id?: Id; now?: string; name?: string } = {}) {
  const report = buildDesignHandoffReport(graph);
  if (!report.readyForJourney) return { graph, journeyId: null as Id | null, created: false };
  const now = options.now ?? new Date().toISOString();
  const id = options.id ?? makeId('journey');
  const existing = graph.journeys[id];
  const journey: Journey = existing ?? {
    id,
    serviceId: graph.service.id,
    name: options.name?.trim() || `${graph.service.name || 'Serviço'} · Jornada principal`,
    stageIds: [],
    status: 'draft',
    priority: 'high',
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: null,
  };
  const nextJourney: Journey = { ...journey, designContext: { ...report.context, createdAt: now }, updatedAt: now };
  const next: ServiceGraph = {
    ...graph,
    service: { ...graph.service, journeyIds: [id, ...graph.service.journeyIds.filter((value) => value !== id)], updatedAt: now },
    journeys: { ...graph.journeys, [id]: nextJourney },
  };
  return { graph: touchServiceProject(next, { currentPhase: 'design' }), journeyId: id, created: !existing };
}

export function prepareWhiteboardFromDefinition(graph: ServiceGraph, options: { id?: Id; now?: string; name?: string } = {}) {
  const report = buildDesignHandoffReport(graph);
  if (!report.readyForWhiteboard) return { graph, boardId: null as Id | null, created: false };
  const now = options.now ?? new Date().toISOString();
  const id = options.id ?? makeId('board');
  if (graph.views.whiteboards[id]) return { graph, boardId: id, created: false };
  const board: WhiteboardView = {
    id,
    serviceId: graph.service.id,
    name: options.name?.trim() || `${graph.service.name || 'Serviço'} · Contexto de desenho`,
    viewKind: 'free',
    items: {},
    edges: {},
    layoutMode: 'free',
    gridVisible: true,
    snapToGrid: true,
    designContext: { ...report.context, createdAt: now },
    updatedAt: now,
  };
  const seeded: ServiceGraph = {
    ...graph,
    service: { ...graph.service, updatedAt: now },
    views: { ...graph.views, whiteboards: { ...graph.views.whiteboards, [id]: board } },
  };
  const synced = syncWhiteboardDesignContext(seeded, id, now);
  return { graph: synced.graph, boardId: id, created: true };
}

export function prepareBlueprintFromDefinition(graph: ServiceGraph, options: { id?: Id; now?: string; name?: string; journeyId?: Id } = {}) {
  const report = buildDesignHandoffReport(graph);
  if (!report.readyForJourney) return { graph, boardId: null as Id | null, journeyId: null as Id | null, created: false };
  const now = options.now ?? new Date().toISOString();
  let working = graph;
  let journeyId = options.journeyId && graph.journeys[options.journeyId] ? options.journeyId : graph.service.journeyIds.find((id) => Boolean(graph.journeys[id]));
  if (!journeyId) {
    const prepared = prepareJourneyFromDefinition(working, { now });
    working = prepared.graph;
    journeyId = prepared.journeyId ?? undefined;
  }
  if (!journeyId) return { graph, boardId: null as Id | null, journeyId: null as Id | null, created: false };
  const id = options.id ?? makeId('blueprint');
  if (working.views.whiteboards[id]) return { graph: working, boardId: id, journeyId, created: false };
  const board: WhiteboardView = {
    id,
    serviceId: working.service.id,
    journeyId,
    name: options.name?.trim() || `${working.service.name || 'Serviço'} · Service Blueprint`,
    viewKind: 'blueprint',
    items: {},
    edges: {},
    layoutMode: 'blueprint',
    gridVisible: true,
    snapToGrid: true,
    designContext: { ...buildDesignHandoffReport(working).context, createdAt: now },
    updatedAt: now,
  };
  const next: ServiceGraph = {
    ...working,
    service: { ...working.service, updatedAt: now },
    views: { ...working.views, whiteboards: { ...working.views.whiteboards, [id]: board } },
  };
  return { graph: touchServiceProject(next, { currentPhase: 'design' }), boardId: id, journeyId, created: true };
}

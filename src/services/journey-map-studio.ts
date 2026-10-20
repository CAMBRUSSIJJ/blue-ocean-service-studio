import type { GraphEntity, Id, JourneyMomentType, ServiceGraph, Stage, WhiteboardView } from '../domain/model';
import { touchServiceProject } from './service-project.ts';

export type JourneyContextKind = 'need' | 'problem' | 'evidence';

export type JourneyStageReport = {
  stage: Stage;
  position: number;
  checks: Array<{ id: string; label: string; complete: boolean }>;
  qualityScore: number;
  needIds: Id[];
  validatedProblemIds: Id[];
  evidenceIds: Id[];
  touchpointCount: number;
  frictionCount: number;
  momentOfTruth: JourneyMomentType;
};

export type JourneyMapReport = {
  journeyId: Id;
  stageCount: number;
  stages: JourneyStageReport[];
  overallScore: number;
  readyForBlueprint: boolean;
  blueprintBlockers: string[];
  momentCount: number;
  evidenceCoverage: number;
  needCoverage: number;
  problemCoverage: number;
  context: {
    needs: GraphEntity[];
    problems: GraphEntity[];
    evidence: GraphEntity[];
  };
};

const ids = (value: unknown): Id[] => Array.isArray(value)
  ? [...new Set(value.filter((id): id is Id => typeof id === 'string' && Boolean(id)))]
  : [];
const moment = (value: unknown): JourneyMomentType => ['positive', 'negative', 'critical'].includes(String(value))
  ? value as JourneyMomentType
  : 'none';

export function journeyStageNeedIds(stage: Stage): Id[] { return ids(stage.needIds); }
export function journeyStageEvidenceIds(stage: Stage): Id[] { return ids(stage.evidenceIds); }
export function journeyStageValidatedProblemIds(stage: Stage): Id[] { return ids(stage.validatedProblemIds); }

const validEntity = (graph: ServiceGraph, kind: JourneyContextKind, id: Id) => {
  if (kind === 'problem') return graph.entities?.problem?.[id];
  return graph.entities?.[kind]?.[id];
};

export function journeyContextItems(graph: ServiceGraph, journeyId: Id) {
  const journey = graph.journeys[journeyId];
  const context = journey?.designContext;
  const read = (kind: JourneyContextKind, source: unknown) => ids(source)
    .map((id) => validEntity(graph, kind, id))
    .filter((entity): entity is GraphEntity => Boolean(entity));
  return {
    needs: read('need', context?.needIds),
    problems: read('problem', context?.problemIds),
    evidence: read('evidence', context?.evidenceIds),
  };
}

export function buildJourneyMapReport(graph: ServiceGraph, journeyId: Id): JourneyMapReport | null {
  const journey = graph.journeys[journeyId];
  if (!journey) return null;
  const ordered = journey.stageIds.map((id) => graph.stages[id]).filter((stage): stage is Stage => Boolean(stage));
  const stages = ordered.map((stage, index): JourneyStageReport => {
    const needIds = journeyStageNeedIds(stage).filter((id) => Boolean(graph.entities?.need?.[id]));
    const validatedProblemIds = journeyStageValidatedProblemIds(stage).filter((id) => Boolean(graph.entities?.problem?.[id]));
    const evidenceIds = journeyStageEvidenceIds(stage).filter((id) => Boolean(graph.entities?.evidence?.[id]));
    const checks = [
      { id: 'title', label: 'Etapa nomeada', complete: Boolean(stage.title.trim()) },
      { id: 'action', label: 'Ação do cliente', complete: Boolean(stage.customerAction.trim()) },
      { id: 'thoughts', label: 'Pensamentos', complete: Boolean(String(stage.thoughts ?? '').trim()) },
      { id: 'emotion', label: 'Emoção mapeada', complete: ['negative', 'neutral', 'positive'].includes(stage.emotion) },
      { id: 'needs', label: 'Necessidade conectada', complete: needIds.length > 0 },
      { id: 'touchpoints', label: 'Touchpoint mapeado', complete: stage.touchpointIds.length > 0 },
      { id: 'evidence', label: 'Evidência conectada', complete: evidenceIds.length > 0 },
    ];
    return {
      stage,
      position: index + 1,
      checks,
      qualityScore: Math.round((checks.filter((check) => check.complete).length / checks.length) * 100),
      needIds,
      validatedProblemIds,
      evidenceIds,
      touchpointCount: stage.touchpointIds.length,
      frictionCount: stage.problemIds.length,
      momentOfTruth: moment(stage.momentOfTruth),
    };
  });
  const blueprintBlockers: string[] = [];
  if (stages.length < 2) blueprintBlockers.push('Mapeie pelo menos duas etapas para formar a sequência do Blueprint.');
  if (stages.some(({ stage }) => !stage.title.trim() || !stage.customerAction.trim())) blueprintBlockers.push('Todas as etapas precisam de nome e ação do cliente.');
  if (stages.length >= 2 && !stages.some((stage) => stage.touchpointCount > 0)) blueprintBlockers.push('Mapeie ao menos um touchpoint para indicar onde o serviço encontra o cliente.');
  const overallScore = stages.length ? Math.round(stages.reduce((sum, stage) => sum + stage.qualityScore, 0) / stages.length) : 0;
  const percentage = (count: number) => stages.length ? Math.round((count / stages.length) * 100) : 0;
  return {
    journeyId,
    stageCount: stages.length,
    stages,
    overallScore,
    readyForBlueprint: blueprintBlockers.length === 0,
    blueprintBlockers,
    momentCount: stages.filter((stage) => stage.momentOfTruth !== 'none').length,
    evidenceCoverage: percentage(stages.filter((stage) => stage.evidenceIds.length > 0).length),
    needCoverage: percentage(stages.filter((stage) => stage.needIds.length > 0).length),
    problemCoverage: percentage(stages.filter((stage) => stage.validatedProblemIds.length > 0 || stage.frictionCount > 0).length),
    context: journeyContextItems(graph, journeyId),
  };
}

export function updateJourneyStageExperience(input: {
  graph: ServiceGraph;
  stageId: Id;
  patch: Partial<Pick<Stage, 'thoughts' | 'momentOfTruth' | 'momentNote'>>;
  now?: string;
}): ServiceGraph {
  const stage = input.graph.stages[input.stageId];
  if (!stage) return input.graph;
  const now = input.now ?? new Date().toISOString();
  return {
    ...input.graph,
    service: { ...input.graph.service, updatedAt: now },
    stages: { ...input.graph.stages, [input.stageId]: { ...stage, ...input.patch, updatedAt: now } },
    journeys: {
      ...input.graph.journeys,
      [stage.journeyId]: { ...input.graph.journeys[stage.journeyId], updatedAt: now },
    },
  };
}

export function setJourneyStageContextLink(input: {
  graph: ServiceGraph;
  stageId: Id;
  kind: JourneyContextKind;
  entityId: Id;
  enabled: boolean;
  now?: string;
}): ServiceGraph {
  const stage = input.graph.stages[input.stageId];
  const journey = stage ? input.graph.journeys[stage.journeyId] : undefined;
  if (!stage || !journey) return input.graph;
  const allowed = input.kind === 'need'
    ? ids(journey.designContext?.needIds)
    : input.kind === 'problem'
      ? ids(journey.designContext?.problemIds)
      : ids(journey.designContext?.evidenceIds);
  if (!allowed.includes(input.entityId) || !validEntity(input.graph, input.kind, input.entityId)) return input.graph;
  const currentSource = input.kind === 'need' ? stage.needIds : input.kind === 'problem' ? stage.validatedProblemIds : stage.evidenceIds;
  const current = new Set(ids(currentSource));
  if (input.enabled) current.add(input.entityId); else current.delete(input.entityId);
  const nextIds = [...current];
  const nextStage: Stage = input.kind === 'need'
    ? { ...stage, needIds: nextIds }
    : input.kind === 'problem'
      ? { ...stage, validatedProblemIds: nextIds }
      : { ...stage, evidenceIds: nextIds };
  const now = input.now ?? new Date().toISOString();
  nextStage.updatedAt = now;
  return {
    ...input.graph,
    service: { ...input.graph.service, updatedAt: now },
    stages: { ...input.graph.stages, [stage.id]: nextStage },
    journeys: { ...input.graph.journeys, [journey.id]: { ...journey, updatedAt: now } },
  };
}

const generatedId = (prefix: string): Id => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? `${prefix}-${crypto.randomUUID()}`
  : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** A draft shares the Journey stages without claiming research or operational readiness. */
export function prepareJourneyBlueprintDraft(graph: ServiceGraph, journeyId: Id, options: { id?: Id; now?: string } = {}) {
  const journey = graph.journeys[journeyId];
  if (!journey || !journey.stageIds.some(id => Boolean(graph.stages[id]))) {
    return { graph, boardId: null as Id | null, created: false };
  }
  const existing = Object.values(graph.views.whiteboards).find(board => board.viewKind === 'blueprint' && board.journeyId === journeyId);
  if (existing) return { graph, boardId: existing.id, created: false };
  const id = options.id ?? generatedId('blueprint'), now = options.now ?? new Date().toISOString();
  if (graph.views.whiteboards[id]) return { graph, boardId: null as Id | null, created: false };
  const board: WhiteboardView = { id, serviceId: graph.service.id, journeyId, name: `${journey.name} · Blueprint`,
    viewKind: 'blueprint', layoutMode: 'service', items: {}, edges: {}, gridVisible: false,
    designContext: journey.designContext ? { ...structuredClone(journey.designContext), createdAt: now } : undefined, updatedAt: now };
  return { graph: { ...graph, views: { ...graph.views, whiteboards: { ...graph.views.whiteboards, [id]: board } },
    service: { ...graph.service, updatedAt: now } }, boardId: id, created: true };
}

export function prepareBlueprintFromJourney(graph: ServiceGraph, journeyId: Id, options: { id?: Id; now?: string; name?: string } = {}) {
  const report = buildJourneyMapReport(graph, journeyId);
  if (!report?.readyForBlueprint) {
    return { graph, boardId: null as Id | null, journeyId, created: false, blockers: report?.blueprintBlockers ?? ['Journey não encontrada.'] };
  }
  const journey = graph.journeys[journeyId];
  const context = journey?.designContext;
  if (!context || !context.personaIds.length || !context.problemIds.length || !context.evidenceIds.length) {
    return { graph, boardId: null as Id | null, journeyId, created: false, blockers: ['A Journey precisa manter Persona, Problema e Evidência do Context-to-Service Handoff.'] };
  }
  const now = options.now ?? new Date().toISOString();
  const id = options.id ?? generatedId('blueprint');
  if (graph.views.whiteboards[id]) return { graph, boardId: id, journeyId, created: false, blockers: [] as string[] };
  const board: WhiteboardView = {
    id,
    serviceId: graph.service.id,
    journeyId,
    name: options.name?.trim() || `${journey.name || graph.service.name || 'Serviço'} · Service Blueprint`,
    viewKind: 'blueprint',
    items: {},
    edges: {},
    layoutMode: 'blueprint',
    gridVisible: true,
    snapToGrid: true,
    designContext: { ...context, createdAt: now },
    updatedAt: now,
  };
  const next: ServiceGraph = {
    ...graph,
    service: { ...graph.service, updatedAt: now },
    journeys: { ...graph.journeys, [journeyId]: { ...journey, updatedAt: now } },
    views: { ...graph.views, whiteboards: { ...graph.views.whiteboards, [id]: board } },
  };
  return { graph: touchServiceProject(next, { currentPhase: 'design' }), boardId: id, journeyId, created: true, blockers: [] as string[] };
}

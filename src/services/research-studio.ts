import type {
  GraphEntity, Id, ResearchMethod, ResearchObservation, ResearchObservationKind,
  ResearchProject, ResearchProjectStatus, ResearchRepository, ResearchSource, ServiceGraph,
} from '../domain/model';
import { createDiscoveryEntity } from './discovery-workspace.ts';

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string): Id => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const RESEARCH_METHOD_LABELS: Record<ResearchMethod, string> = {
  interview: 'Entrevista', observation: 'Observação', service_safari: 'Service Safari', shadowing: 'Shadowing',
  survey: 'Pesquisa', support: 'Atendimento', analytics: 'Analytics', document: 'Documento',
  workshop: 'Workshop', experiment: 'Experimento', other: 'Outro',
};

export const OBSERVATION_KIND_LABELS: Record<ResearchObservationKind, string> = {
  said: 'O que disseram', observed: 'O que observamos', measured: 'O que medimos', context: 'Contexto',
};

export const RESEARCH_PROJECT_STATUS_LABELS: Record<ResearchProjectStatus, string> = {
  draft: 'Rascunho', active: 'Em campo', synthesis: 'Síntese', complete: 'Concluído',
};

export type ResearchPipelineStage = 'material' | 'observation' | 'evidence' | 'insight' | 'decision';
export type ResearchStudioReport = {
  projects: ResearchProject[];
  sources: ResearchSource[];
  observations: ResearchObservation[];
  evidence: GraphEntity[];
  insights: GraphEntity[];
  needs: GraphEntity[];
  hypotheses: GraphEntity[];
  problems: GraphEntity[];
  counts: Record<ResearchPipelineStage, number> & { projects: number };
  traceabilityScore: number;
  researchReady: boolean;
  unpromotedObservationIds: Id[];
  unsupportedInsightIds: Id[];
  orphanEvidenceIds: Id[];
  activeProject: ResearchProject | null;
};

const ids = (value: unknown): Id[] => Array.isArray(value)
  ? value.filter((item): item is Id => typeof item === 'string' && Boolean(item))
  : [];
const unique = <T,>(values: T[]) => [...new Set(values)];
const entityValues = (graph: ServiceGraph, kind: string) => Object.values(graph.entities?.[kind] ?? {})
  .filter((entity) => !entity.serviceId || entity.serviceId === graph.service.id);

export function normalizeResearchRepository(repository: ResearchRepository | undefined, now = nowIso()): ResearchRepository {
  return {
    sources: { ...(repository?.sources ?? {}) },
    projects: { ...(repository?.projects ?? {}) },
    observations: { ...(repository?.observations ?? {}) },
    collections: { ...(repository?.collections ?? {}) },
    activeProjectId: repository?.activeProjectId,
    createdAt: repository?.createdAt ?? now,
    updatedAt: repository?.updatedAt ?? now,
  };
}

function touch(graph: ServiceGraph, repository: ResearchRepository, now: string): ServiceGraph {
  return {
    ...graph,
    research: { ...repository, updatedAt: now },
    service: { ...graph.service, updatedAt: now },
  };
}

export function buildResearchStudioReport(graph: ServiceGraph): ResearchStudioReport {
  const repository = normalizeResearchRepository(graph.research, String(graph.service.updatedAt || nowIso()));
  const projects = Object.values(repository.projects ?? {}).filter((item) => item.serviceId === graph.service.id)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const projectIds = new Set(projects.map((item) => item.id));
  const sources = Object.values(repository.sources ?? {}).filter((source) => !source.projectId || projectIds.has(source.projectId))
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const observations = Object.values(repository.observations ?? {}).filter((item) => item.serviceId === graph.service.id)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const evidence = entityValues(graph, 'evidence');
  const insights = entityValues(graph, 'insight');
  const needs = entityValues(graph, 'need');
  const hypotheses = entityValues(graph, 'problemHypothesis');
  const problems = entityValues(graph, 'problem');
  const decisionIds = new Set([
    ...needs.map((item) => item.id), ...hypotheses.map((item) => item.id), ...problems.map((item) => item.id),
  ]);
  const linkedDecisionCount = insights.filter((item) => ids(item.promotedToIds).some((id) => decisionIds.has(id))).length;
  const traceableEvidence = evidence.filter((item) => ids(item.sourceIds).length > 0 && ids(item.observationIds).length > 0).length;
  const supportedInsights = insights.filter((item) => ids(item.evidenceIds).length > 0).length;
  const checks = [sources.length > 0, observations.length > 0, traceableEvidence > 0, supportedInsights > 0, linkedDecisionCount > 0];
  const traceabilityScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return {
    projects, sources, observations, evidence, insights, needs, hypotheses, problems,
    counts: {
      projects: projects.length,
      material: sources.length,
      observation: observations.length,
      evidence: evidence.length,
      insight: insights.length,
      decision: needs.length + hypotheses.length + problems.length,
    },
    traceabilityScore,
    researchReady: sources.length > 0 && observations.length > 0 && evidence.length > 0 && insights.length > 0,
    unpromotedObservationIds: observations.filter((item) => !item.evidenceId).map((item) => item.id),
    unsupportedInsightIds: insights.filter((item) => ids(item.evidenceIds).length === 0).map((item) => item.id),
    orphanEvidenceIds: evidence.filter((item) => ids(item.sourceIds).length === 0 || ids(item.observationIds).length === 0).map((item) => item.id),
    activeProject: repository.activeProjectId ? (repository.projects?.[repository.activeProjectId] ?? null) : (projects[0] ?? null),
  };
}

export function createResearchProject(input: {
  graph: ServiceGraph; title: string; goal?: string; owner?: string; methods?: ResearchMethod[]; status?: ResearchProjectStatus; now?: string; id?: Id;
}): { graph: ServiceGraph; projectId: Id } {
  const now = input.now ?? nowIso();
  const repository = normalizeResearchRepository(input.graph.research, now);
  const id = input.id ?? makeId('research-project');
  const project: ResearchProject = {
    id, serviceId: input.graph.service.id, title: input.title.trim(), goal: input.goal?.trim() ?? '',
    status: input.status ?? 'draft', methodIds: unique(input.methods ?? []), owner: input.owner?.trim() || undefined,
    sourceIds: [], observationIds: [], createdAt: now, updatedAt: now,
  };
  repository.projects = { ...(repository.projects ?? {}), [id]: project };
  repository.activeProjectId = id;
  return { graph: touch(input.graph, repository, now), projectId: id };
}

export function updateResearchProject(input: {
  graph: ServiceGraph; projectId: Id; patch: Partial<Pick<ResearchProject, 'title' | 'goal' | 'owner' | 'status' | 'methodIds' | 'participantCount'>>; now?: string;
}): ServiceGraph {
  const now = input.now ?? nowIso();
  const repository = normalizeResearchRepository(input.graph.research, now);
  const current = repository.projects?.[input.projectId];
  if (!current) return input.graph;
  repository.projects = { ...(repository.projects ?? {}), [input.projectId]: { ...current, ...input.patch, updatedAt: now } };
  return touch(input.graph, repository, now);
}

export function createResearchSource(input: {
  graph: ServiceGraph; title: string; type: ResearchMethod; projectId?: Id; summary?: string; owner?: string; participant?: string; date?: string; tags?: string[]; method?: string; sample?: string; now?: string; id?: Id;
}): { graph: ServiceGraph; sourceId: Id } {
  const now = input.now ?? nowIso();
  const repository = normalizeResearchRepository(input.graph.research, now);
  const id = input.id ?? makeId('research-source');
  const source: ResearchSource = {
    id, type: input.type, title: input.title.trim(), summary: input.summary?.trim() ?? '', projectId: input.projectId,
    owner: input.owner?.trim() || undefined, participant: input.participant?.trim() || undefined, date: input.date,
    tags: unique(input.tags ?? []), method: input.method?.trim() || undefined, sample: input.sample?.trim() || undefined,
    createdAt: now, updatedAt: now,
  };
  repository.sources = { ...repository.sources, [id]: source };
  if (input.projectId && repository.projects?.[input.projectId]) {
    const project = repository.projects[input.projectId];
    repository.projects = { ...repository.projects, [input.projectId]: { ...project, sourceIds: unique([...project.sourceIds, id]), updatedAt: now } };
  }
  return { graph: touch(input.graph, repository, now), sourceId: id };
}

export function createResearchObservation(input: {
  graph: ServiceGraph; text: string; kind: ResearchObservationKind; projectId?: Id; sourceId?: Id; context?: string; participant?: string; observedAt?: string; now?: string; id?: Id;
}): { graph: ServiceGraph; observationId: Id } {
  const now = input.now ?? nowIso();
  const repository = normalizeResearchRepository(input.graph.research, now);
  const id = input.id ?? makeId('observation');
  const observation: ResearchObservation = {
    id, serviceId: input.graph.service.id, projectId: input.projectId, sourceId: input.sourceId, kind: input.kind,
    text: input.text.trim(), context: input.context?.trim() || undefined, participant: input.participant?.trim() || undefined,
    observedAt: input.observedAt || undefined, createdAt: now, updatedAt: now,
  };
  repository.observations = { ...(repository.observations ?? {}), [id]: observation };
  if (input.projectId && repository.projects?.[input.projectId]) {
    const project = repository.projects[input.projectId];
    repository.projects = { ...repository.projects, [input.projectId]: { ...project, observationIds: unique([...project.observationIds, id]), updatedAt: now } };
  }
  return { graph: touch(input.graph, repository, now), observationId: id };
}

export function promoteObservationToEvidence(input: { graph: ServiceGraph; observationId: Id; title?: string; now?: string }): { graph: ServiceGraph; evidenceId: Id | null } {
  const now = input.now ?? nowIso();
  const repository = normalizeResearchRepository(input.graph.research, now);
  const observation = repository.observations?.[input.observationId];
  if (!observation) return { graph: input.graph, evidenceId: null };
  if (observation.evidenceId && input.graph.entities?.evidence?.[observation.evidenceId]) return { graph: input.graph, evidenceId: observation.evidenceId };
  const source = observation.sourceId ? repository.sources[observation.sourceId] : undefined;
  const evidenceId = makeId('evidence');
  const evidence: GraphEntity = {
    id: evidenceId, type: 'evidence', serviceId: input.graph.service.id,
    title: input.title?.trim() || observation.text.slice(0, 96) || 'Evidência de pesquisa',
    description: observation.text, interpretation: '', sourceType: source?.type ?? 'observation', sourceName: source?.title ?? '',
    method: source?.method ?? (source ? RESEARCH_METHOD_LABELS[source.type] : OBSERVATION_KIND_LABELS[observation.kind]),
    collectedAt: observation.observedAt ?? source?.date ?? '', sample: source?.sample ?? observation.participant ?? '', confidence: 'medium',
    sourceIds: observation.sourceId ? [observation.sourceId] : [], observationIds: [observation.id], insightIds: [], relatedIds: [], status: 'captured', evidenceVersion: 2,
    createdAt: now, updatedAt: now,
  };
  const entities = { ...(input.graph.entities ?? {}), evidence: { ...(input.graph.entities?.evidence ?? {}), [evidenceId]: evidence } };
  repository.observations = { ...(repository.observations ?? {}), [observation.id]: { ...observation, evidenceId, updatedAt: now } };
  return { graph: touch({ ...input.graph, entities }, repository, now), evidenceId };
}

export function createResearchInsight(input: { graph: ServiceGraph; title: string; description?: string; evidenceIds: Id[]; now?: string; id?: Id }): { graph: ServiceGraph; insightId: Id } {
  const now = input.now ?? nowIso();
  const validEvidence = unique(input.evidenceIds).filter((id) => Boolean(input.graph.entities?.evidence?.[id]));
  const insightId = input.id ?? makeId('insight');
  const evidenceRecords = validEvidence.map((id) => input.graph.entities.evidence[id]);
  const sourceIds = unique(evidenceRecords.flatMap((item) => ids(item.sourceIds)));
  const observationIds = unique(evidenceRecords.flatMap((item) => ids(item.observationIds)));
  const insight: GraphEntity = {
    id: insightId, type: 'insight', serviceId: input.graph.service.id, title: input.title.trim(), description: input.description?.trim() ?? '',
    insightLevel: 'meaning', evidenceIds: validEvidence, sourceIds, observationIds, relatedIds: [...validEvidence], promotedToIds: [],
    createdAt: now, updatedAt: now,
  };
  const evidenceCollection = { ...(input.graph.entities?.evidence ?? {}) };
  for (const evidenceId of validEvidence) {
    const evidence = evidenceCollection[evidenceId];
    evidenceCollection[evidenceId] = { ...evidence, insightIds: unique([...ids(evidence.insightIds), insightId]), relatedIds: unique([...ids(evidence.relatedIds), insightId]), updatedAt: now };
  }
  const entities = {
    ...(input.graph.entities ?? {}), evidence: evidenceCollection,
    insight: { ...(input.graph.entities?.insight ?? {}), [insightId]: insight },
  };
  return { graph: { ...input.graph, entities, service: { ...input.graph.service, updatedAt: now } }, insightId };
}

export function promoteResearchInsight(input: { graph: ServiceGraph; insightId: Id; target: 'need' | 'problemHypothesis'; title?: string; description?: string; now?: string }): { graph: ServiceGraph; entityId: Id | null } {
  const insight = input.graph.entities?.insight?.[input.insightId];
  if (!insight) return { graph: input.graph, entityId: null };
  const now = input.now ?? nowIso();
  const evidenceIds = ids(insight.evidenceIds);
  const entity = createDiscoveryEntity({
    graph: input.graph, kind: input.target, title: input.title?.trim() || String(insight.title ?? 'Insight de pesquisa'),
    description: input.description?.trim() || String(insight.description ?? ''), relatedIds: unique([input.insightId, ...evidenceIds]),
    confidence: input.target === 'problemHypothesis' ? 'medium' : undefined, now,
  });
  const collection = { ...(input.graph.entities?.[input.target] ?? {}), [entity.id]: {
    ...entity, sourceInsightId: input.insightId, evidenceIds, insightIds: [input.insightId],
  } };
  const evidenceCollection = { ...(input.graph.entities?.evidence ?? {}) };
  for (const evidenceId of evidenceIds) {
    const evidence = evidenceCollection[evidenceId];
    if (!evidence) continue;
    evidenceCollection[evidenceId] = { ...evidence, relatedIds: unique([...ids(evidence.relatedIds), entity.id]), updatedAt: now };
  }
  const insights = { ...(input.graph.entities?.insight ?? {}), [input.insightId]: {
    ...insight, promotedToIds: unique([...ids(insight.promotedToIds), entity.id]), relatedIds: unique([...ids(insight.relatedIds), entity.id]), updatedAt: now,
  } };
  const entities = { ...(input.graph.entities ?? {}), [input.target]: collection, evidence: evidenceCollection, insight: insights };
  return { graph: { ...input.graph, entities, service: { ...input.graph.service, updatedAt: now } }, entityId: entity.id };
}

export function researchTraceRows(graph: ServiceGraph) {
  const report = buildResearchStudioReport(graph);
  const sources = new Map(report.sources.map((item) => [item.id, item]));
  const observations = new Map(report.observations.map((item) => [item.id, item]));
  return report.evidence.map((evidence) => {
    const sourceId = ids(evidence.sourceIds)[0];
    const observationId = ids(evidence.observationIds)[0];
    const insightRecords = ids(evidence.insightIds).map((id) => graph.entities?.insight?.[id]).filter(Boolean) as GraphEntity[];
    return {
      evidence,
      source: sourceId ? sources.get(sourceId) ?? null : null,
      observation: observationId ? observations.get(observationId) ?? null : null,
      insights: insightRecords,
      decisions: insightRecords.flatMap((insight) => ids(insight.promotedToIds).map((id) => {
        for (const kind of ['need', 'problemHypothesis', 'problem'] as const) {
          const entity = graph.entities?.[kind]?.[id];
          if (entity) return { kind, entity };
        }
        return null;
      }).filter(Boolean)),
    };
  });
}

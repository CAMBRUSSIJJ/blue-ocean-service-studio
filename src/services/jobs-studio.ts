import type { GraphEntity, Id, ServiceGraph } from '../domain/model';
import type { ContextKind } from './context-library';

export type JobImportance = 'low' | 'medium' | 'high' | 'critical';
export type JobRelationKind = Exclude<ContextKind, 'job'>;

export type JobProfileDraft = {
  title: string;
  description: string;
  situation: string;
  desiredProgress: string;
  motivation: string;
  barriers: string;
  currentAlternative: string;
  successSignal: string;
  importance: JobImportance;
};

export type JobConnection = {
  id: Id;
  kind: JobRelationKind;
  title: string;
  description: string;
  direction: 'outbound' | 'inbound' | 'both';
  confidence?: 'low' | 'medium' | 'high';
};

export type JobStudioReport = {
  job: GraphEntity;
  draft: JobProfileDraft;
  connections: JobConnection[];
  connectionCounts: Record<JobRelationKind, number>;
  foundationChecks: Array<{ id: string; label: string; complete: boolean }>;
  foundationScore: number;
  evidenceConfidence: { low: number; medium: number; high: number };
  readyForDesign: boolean;
};

const RELATION_KINDS: JobRelationKind[] = ['persona', 'need', 'pain', 'problemHypothesis', 'problem', 'evidence'];
const relatedIds = (entity?: GraphEntity): Id[] => Array.isArray(entity?.relatedIds)
  ? entity.relatedIds.filter((id): id is Id => typeof id === 'string' && Boolean(id))
  : [];
const title = (entity: GraphEntity) => String(entity.title ?? entity.name ?? 'Sem título');
const description = (entity: GraphEntity) => String(entity.description ?? '');

export const jobProfileFromEntity = (entity: GraphEntity): JobProfileDraft => ({
  title: title(entity) === 'Sem título' ? '' : title(entity),
  description: description(entity),
  situation: String(entity.situation ?? entity.context ?? ''),
  desiredProgress: String(entity.desiredProgress ?? entity.desiredOutcome ?? ''),
  motivation: String(entity.motivation ?? ''),
  barriers: String(entity.barriers ?? ''),
  currentAlternative: String(entity.currentAlternative ?? entity.currentWorkaround ?? ''),
  successSignal: String(entity.successSignal ?? ''),
  importance: ['low', 'medium', 'high', 'critical'].includes(String(entity.importance)) ? entity.importance as JobImportance : 'medium',
});

const relationUniverse = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({ kind, entity })),
);

export function buildJobStudioReport(graph: ServiceGraph, jobId: Id): JobStudioReport | null {
  const job = graph.entities?.job?.[jobId];
  if (!job) return null;
  const outbound = new Set(relatedIds(job));
  const connections: JobConnection[] = [];
  const connectionCounts = Object.fromEntries(RELATION_KINDS.map((kind) => [kind, 0])) as Record<JobRelationKind, number>;
  const evidenceConfidence = { low: 0, medium: 0, high: 0 };

  for (const { kind, entity } of relationUniverse(graph)) {
    const isOutbound = outbound.has(entity.id);
    const isInbound = relatedIds(entity).includes(jobId)
      || (Array.isArray(entity.jobIds) && entity.jobIds.map(String).includes(jobId));
    if (!isOutbound && !isInbound) continue;
    const direction: JobConnection['direction'] = isOutbound && isInbound ? 'both' : isOutbound ? 'outbound' : 'inbound';
    const confidence = kind === 'evidence' && ['low', 'medium', 'high'].includes(String(entity.confidence))
      ? entity.confidence as 'low' | 'medium' | 'high'
      : undefined;
    connections.push({ id: entity.id, kind, title: title(entity), description: description(entity), direction, confidence });
    connectionCounts[kind] += 1;
    if (confidence) evidenceConfidence[confidence] += 1;
  }

  const draft = jobProfileFromEntity(job);
  const foundationChecks = [
    { id: 'statement', label: 'Job claramente enunciado', complete: Boolean(draft.title.trim() && draft.description.trim()) },
    { id: 'situation', label: 'Situação / gatilho registrado', complete: Boolean(draft.situation.trim()) },
    { id: 'progress', label: 'Progresso desejado explícito', complete: Boolean(draft.desiredProgress.trim()) },
    { id: 'motivation', label: 'Motivação registrada', complete: Boolean(draft.motivation.trim()) },
    { id: 'persona', label: 'Persona conectada', complete: connectionCounts.persona > 0 },
    { id: 'context', label: 'Necessidade, dor ou problema conectado', complete: connectionCounts.need + connectionCounts.pain + connectionCounts.problemHypothesis + connectionCounts.problem > 0 },
    { id: 'evidence', label: 'Evidência conectada', complete: connectionCounts.evidence > 0 },
  ];
  const foundationScore = Math.round((foundationChecks.filter((item) => item.complete).length / foundationChecks.length) * 100);

  return {
    job,
    draft,
    connections: connections.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'pt-BR')),
    connectionCounts,
    foundationChecks,
    foundationScore,
    evidenceConfidence,
    readyForDesign: foundationChecks.every((item) => item.complete),
  };
}

export function updateJobProfile(input: { graph: ServiceGraph; jobId: Id; draft: JobProfileDraft; connectedIds: Id[]; now?: string }): ServiceGraph {
  const existing = input.graph.entities?.job?.[input.jobId];
  if (!existing) return input.graph;
  const now = input.now ?? new Date().toISOString();
  const managed = relationUniverse(input.graph);
  const managedIds = new Set(managed.map(({ entity }) => entity.id));
  const selected = new Set(input.connectedIds.filter((id) => managedIds.has(id)));
  const preservedExternal = relatedIds(existing).filter((id) => !managedIds.has(id));
  const entities: ServiceGraph['entities'] = { ...(input.graph.entities ?? {}) };
  const jobs = { ...(entities.job ?? {}) };

  jobs[input.jobId] = {
    ...existing,
    type: 'job', serviceId: input.graph.service.id,
    title: input.draft.title.trim(), description: input.draft.description.trim(),
    situation: input.draft.situation.trim(), desiredProgress: input.draft.desiredProgress.trim(),
    motivation: input.draft.motivation.trim(), barriers: input.draft.barriers.trim(),
    currentAlternative: input.draft.currentAlternative.trim(), successSignal: input.draft.successSignal.trim(),
    importance: input.draft.importance,
    relatedIds: [...new Set([...preservedExternal, ...selected])],
    profileVersion: 1, updatedAt: now,
  };
  entities.job = jobs;

  for (const { kind, entity } of managed) {
    const collection = { ...(entities[kind] ?? {}) };
    const relationSet = new Set(relatedIds(entity));
    if (selected.has(entity.id)) relationSet.add(input.jobId); else relationSet.delete(input.jobId);
    const jobIds = Array.isArray(entity.jobIds) ? entity.jobIds.map(String) : [];
    collection[entity.id] = {
      ...entity,
      relatedIds: [...relationSet],
      jobIds: selected.has(entity.id) ? [...new Set([...jobIds, input.jobId])] : jobIds.filter((id) => id !== input.jobId),
      updatedAt: selected.has(entity.id) || relatedIds(entity).includes(input.jobId) ? now : entity.updatedAt,
    };
    entities[kind] = collection;
  }
  return { ...input.graph, entities, service: { ...input.graph.service, updatedAt: now } };
}

export const jobRelationOptions = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({
    id: entity.id,
    kind,
    title: title(entity),
    description: description(entity),
    confidence: kind === 'evidence' ? String(entity.confidence ?? 'medium') : undefined,
  })),
);

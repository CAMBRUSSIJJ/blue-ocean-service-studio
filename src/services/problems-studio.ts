import type { GraphEntity, Id, ServiceGraph } from '../domain/model';
import type { ContextKind } from './context-library';

export type ProblemSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ProblemPriority = 'low' | 'medium' | 'high' | 'critical';
export type ProblemRelationKind = Exclude<ContextKind, 'problem'>;

export type ProblemProfileDraft = {
  title: string;
  description: string;
  rootCause: string;
  impact: string;
  affectedPopulation: string;
  observableSignal: string;
  severity: ProblemSeverity;
  priority: ProblemPriority;
};

export type ProblemConnection = {
  id: Id;
  kind: ProblemRelationKind;
  title: string;
  description: string;
  direction: 'outbound' | 'inbound' | 'both';
  confidence?: 'low' | 'medium' | 'high';
};

export type ProblemStudioReport = {
  problem: GraphEntity;
  draft: ProblemProfileDraft;
  connections: ProblemConnection[];
  connectionCounts: Record<ProblemRelationKind, number>;
  qualityChecks: Array<{ id: string; label: string; complete: boolean; detail: string }>;
  qualityScore: number;
  sourceHypothesis: GraphEntity | null;
  evidenceConfidence: { low: number; medium: number; high: number };
  readyForDefinition: boolean;
};

const RELATION_KINDS: ProblemRelationKind[] = ['persona', 'need', 'job', 'pain', 'problemHypothesis', 'evidence'];
const relatedIds = (entity?: GraphEntity): Id[] => Array.isArray(entity?.relatedIds)
  ? entity.relatedIds.filter((id): id is Id => typeof id === 'string' && Boolean(id))
  : [];
const titleOf = (entity: GraphEntity) => String(entity.title ?? entity.name ?? 'Sem título');
const descriptionOf = (entity: GraphEntity) => String(entity.description ?? '');

export const problemProfileFromEntity = (entity: GraphEntity): ProblemProfileDraft => ({
  title: titleOf(entity) === 'Sem título' ? '' : titleOf(entity),
  description: descriptionOf(entity),
  rootCause: String(entity.rootCause ?? entity.cause ?? ''),
  impact: String(entity.impact ?? ''),
  affectedPopulation: String(entity.affectedPopulation ?? entity.audience ?? ''),
  observableSignal: String(entity.observableSignal ?? entity.signal ?? ''),
  severity: ['low', 'medium', 'high', 'critical'].includes(String(entity.severity)) ? entity.severity as ProblemSeverity : 'medium',
  priority: ['low', 'medium', 'high', 'critical'].includes(String(entity.priority)) ? entity.priority as ProblemPriority : 'medium',
});

const relationUniverse = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({ kind, entity })),
);

export function buildProblemStudioReport(graph: ServiceGraph, problemId: Id): ProblemStudioReport | null {
  const problem = graph.entities?.problem?.[problemId];
  if (!problem) return null;
  const outbound = new Set(relatedIds(problem));
  const connections: ProblemConnection[] = [];
  const connectionCounts = Object.fromEntries(RELATION_KINDS.map((kind) => [kind, 0])) as Record<ProblemRelationKind, number>;
  const evidenceConfidence = { low: 0, medium: 0, high: 0 };

  for (const { kind, entity } of relationUniverse(graph)) {
    const isOutbound = outbound.has(entity.id)
      || (kind === 'evidence' && Array.isArray(problem.evidenceIds) && problem.evidenceIds.map(String).includes(entity.id))
      || (kind === 'problemHypothesis' && String(problem.sourceHypothesisId ?? '') === entity.id);
    const isInbound = relatedIds(entity).includes(problemId)
      || (Array.isArray(entity.problemIds) && entity.problemIds.map(String).includes(problemId))
      || (kind === 'problemHypothesis' && String(entity.validatedProblemId ?? '') === problemId);
    if (!isOutbound && !isInbound) continue;
    const direction: ProblemConnection['direction'] = isOutbound && isInbound ? 'both' : isOutbound ? 'outbound' : 'inbound';
    const confidence = kind === 'evidence' && ['low', 'medium', 'high'].includes(String(entity.confidence))
      ? entity.confidence as 'low' | 'medium' | 'high'
      : undefined;
    connections.push({ id: entity.id, kind, title: titleOf(entity), description: descriptionOf(entity), direction, confidence });
    connectionCounts[kind] += 1;
    if (confidence) evidenceConfidence[confidence] += 1;
  }

  const draft = problemProfileFromEntity(problem);
  const sourceHypothesisId = String(problem.sourceHypothesisId ?? '');
  const sourceHypothesis = sourceHypothesisId ? graph.entities?.problemHypothesis?.[sourceHypothesisId] ?? null : null;
  const qualityChecks = [
    { id: 'validated', label: 'Problema validado', complete: String(problem.status ?? '') === 'validated', detail: 'O problema foi promovido a partir de uma hipótese sustentada.' },
    { id: 'statement', label: 'Problema claramente enunciado', complete: Boolean(draft.title.trim() && draft.description.trim()), detail: 'O problema é compreensível sem depender de uma solução proposta.' },
    { id: 'cause', label: 'Causa raiz registrada', complete: Boolean(draft.rootCause.trim()), detail: 'Existe uma explicação causal explícita para orientar investigação e melhoria.' },
    { id: 'impact', label: 'Impacto explícito', complete: Boolean(draft.impact.trim()), detail: 'Está claro por que este problema importa para cliente ou operação.' },
    { id: 'population', label: 'População afetada delimitada', complete: Boolean(draft.affectedPopulation.trim()) || connectionCounts.persona > 0, detail: 'Sabemos quem é afetado e em qual contexto.' },
    { id: 'signal', label: 'Sinal observável', complete: Boolean(draft.observableSignal.trim()), detail: 'Existe um indicador ou comportamento que torna o problema observável.' },
    { id: 'context', label: 'Contexto conectado', complete: connectionCounts.persona + connectionCounts.need + connectionCounts.job + connectionCounts.pain > 0, detail: 'O problema mantém rastreabilidade com o Discovery.' },
    { id: 'evidence', label: 'Evidência conectada', complete: connectionCounts.evidence > 0, detail: 'Há evidência que sustenta a existência do problema.' },
  ];
  const qualityScore = Math.round((qualityChecks.filter((item) => item.complete).length / qualityChecks.length) * 100);

  return {
    problem,
    draft,
    connections: connections.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'pt-BR')),
    connectionCounts,
    qualityChecks,
    qualityScore,
    sourceHypothesis,
    evidenceConfidence,
    readyForDefinition: qualityChecks.every((item) => item.complete),
  };
}

export function updateProblemProfile(input: { graph: ServiceGraph; problemId: Id; draft: ProblemProfileDraft; connectedIds: Id[]; now?: string }): ServiceGraph {
  const existing = input.graph.entities?.problem?.[input.problemId];
  if (!existing) return input.graph;
  const now = input.now ?? new Date().toISOString();
  const managed = relationUniverse(input.graph);
  const managedIds = new Set(managed.map(({ entity }) => entity.id));
  const sourceHypothesisId = String(existing.sourceHypothesisId ?? '');
  const selected = new Set(input.connectedIds.filter((id) => managedIds.has(id)));
  if (sourceHypothesisId) selected.add(sourceHypothesisId);
  const preservedExternal = relatedIds(existing).filter((id) => !managedIds.has(id));
  const entities: ServiceGraph['entities'] = { ...(input.graph.entities ?? {}) };
  const problems = { ...(entities.problem ?? {}) };
  const evidenceIds = [...selected].filter((id) => Boolean(input.graph.entities?.evidence?.[id]));

  problems[input.problemId] = {
    ...existing,
    type: 'problem', serviceId: input.graph.service.id, status: 'validated',
    title: input.draft.title.trim(), description: input.draft.description.trim(),
    rootCause: input.draft.rootCause.trim(), impact: input.draft.impact.trim(),
    affectedPopulation: input.draft.affectedPopulation.trim(), observableSignal: input.draft.observableSignal.trim(),
    severity: input.draft.severity, priority: input.draft.priority,
    evidenceIds,
    supportingEvidenceIds: Array.isArray(existing.supportingEvidenceIds) ? existing.supportingEvidenceIds.filter((id): id is string => typeof id === 'string' && evidenceIds.includes(id)) : [],
    contradictingEvidenceIds: Array.isArray(existing.contradictingEvidenceIds) ? existing.contradictingEvidenceIds.filter((id): id is string => typeof id === 'string' && evidenceIds.includes(id)) : [],
    relatedIds: [...new Set([...preservedExternal, ...selected])], problemProfileVersion: 2, updatedAt: now,
  };
  entities.problem = problems;

  for (const { kind, entity } of managed) {
    const collection = { ...(entities[kind] ?? {}) };
    const shouldLink = selected.has(entity.id);
    const relationSet = new Set(relatedIds(entity));
    if (shouldLink) relationSet.add(input.problemId); else relationSet.delete(input.problemId);
    const problemIds = Array.isArray(entity.problemIds) ? entity.problemIds.map(String) : [];
    const nextEntity: GraphEntity = {
      ...entity,
      relatedIds: [...relationSet],
      problemIds: shouldLink ? [...new Set([...problemIds, input.problemId])] : problemIds.filter((id) => id !== input.problemId),
      updatedAt: shouldLink || relatedIds(entity).includes(input.problemId) ? now : entity.updatedAt,
    };
    if (kind === 'problemHypothesis' && entity.id === sourceHypothesisId) nextEntity.validatedProblemId = input.problemId;
    collection[entity.id] = nextEntity;
    entities[kind] = collection;
  }

  return { ...input.graph, entities, service: { ...input.graph.service, updatedAt: now } };
}

export const problemRelationOptions = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({
    id: entity.id,
    kind,
    title: titleOf(entity),
    description: descriptionOf(entity),
    confidence: kind === 'evidence' ? String(entity.confidence ?? 'medium') : undefined,
  })),
);

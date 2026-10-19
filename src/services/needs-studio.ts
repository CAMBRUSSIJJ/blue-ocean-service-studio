import type { GraphEntity, Id, ServiceGraph } from '../domain/model';
import type { ContextKind } from './context-library';

export type NeedImportance = 'low' | 'medium' | 'high' | 'critical';
export type NeedRelationKind = Exclude<ContextKind, 'need'>;

export type NeedProfileDraft = {
  title: string;
  description: string;
  context: string;
  desiredOutcome: string;
  currentWorkaround: string;
  successSignal: string;
  importance: NeedImportance;
};

export type NeedConnection = {
  id: Id;
  kind: NeedRelationKind;
  title: string;
  description: string;
  direction: 'outbound' | 'inbound' | 'both';
  confidence?: 'low' | 'medium' | 'high';
};

export type NeedStudioReport = {
  need: GraphEntity;
  draft: NeedProfileDraft;
  connections: NeedConnection[];
  connectionCounts: Record<NeedRelationKind, number>;
  foundationChecks: Array<{ id: string; label: string; complete: boolean }>;
  foundationScore: number;
  evidenceConfidence: { low: number; medium: number; high: number };
  readyForDesign: boolean;
};

const RELATION_KINDS: NeedRelationKind[] = ['persona', 'job', 'pain', 'problemHypothesis', 'problem', 'evidence'];
const relatedIds = (entity?: GraphEntity): Id[] => Array.isArray(entity?.relatedIds) ? entity.relatedIds.filter((id): id is Id => typeof id === 'string' && Boolean(id)) : [];
const title = (entity: GraphEntity) => String(entity.title ?? entity.name ?? 'Sem título');
const description = (entity: GraphEntity) => String(entity.description ?? '');

export const needProfileFromEntity = (entity: GraphEntity): NeedProfileDraft => ({
  title: title(entity) === 'Sem título' ? '' : title(entity),
  description: description(entity),
  context: String(entity.context ?? ''),
  desiredOutcome: String(entity.desiredOutcome ?? ''),
  currentWorkaround: String(entity.currentWorkaround ?? ''),
  successSignal: String(entity.successSignal ?? ''),
  importance: ['low', 'medium', 'high', 'critical'].includes(String(entity.importance)) ? entity.importance as NeedImportance : 'medium',
});

const relationUniverse = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) => Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({ kind, entity })));

export function buildNeedStudioReport(graph: ServiceGraph, needId: Id): NeedStudioReport | null {
  const need = graph.entities?.need?.[needId];
  if (!need) return null;
  const outbound = new Set(relatedIds(need));
  const connections: NeedConnection[] = [];
  const connectionCounts = Object.fromEntries(RELATION_KINDS.map((kind) => [kind, 0])) as Record<NeedRelationKind, number>;
  const evidenceConfidence = { low: 0, medium: 0, high: 0 };

  for (const { kind, entity } of relationUniverse(graph)) {
    const isOutbound = outbound.has(entity.id);
    const isInbound = relatedIds(entity).includes(needId)
      || (Array.isArray(entity.needIds) && entity.needIds.includes(needId));
    if (!isOutbound && !isInbound) continue;
    const direction: NeedConnection['direction'] = isOutbound && isInbound ? 'both' : isOutbound ? 'outbound' : 'inbound';
    const confidence = kind === 'evidence' && ['low', 'medium', 'high'].includes(String(entity.confidence))
      ? entity.confidence as 'low' | 'medium' | 'high'
      : undefined;
    connections.push({ id: entity.id, kind, title: title(entity), description: description(entity), direction, confidence });
    connectionCounts[kind] += 1;
    if (confidence) evidenceConfidence[confidence] += 1;
  }

  const draft = needProfileFromEntity(need);
  const foundationChecks = [
    { id: 'statement', label: 'Necessidade claramente enunciada', complete: Boolean(draft.title.trim() && draft.description.trim()) },
    { id: 'context', label: 'Contexto registrado', complete: Boolean(draft.context.trim()) },
    { id: 'outcome', label: 'Resultado desejado explícito', complete: Boolean(draft.desiredOutcome.trim()) },
    { id: 'persona', label: 'Persona conectada', complete: connectionCounts.persona > 0 },
    { id: 'friction', label: 'Job, dor ou problema conectado', complete: connectionCounts.job + connectionCounts.pain + connectionCounts.problemHypothesis + connectionCounts.problem > 0 },
    { id: 'evidence', label: 'Evidência conectada', complete: connectionCounts.evidence > 0 },
  ];
  const foundationScore = Math.round((foundationChecks.filter((item) => item.complete).length / foundationChecks.length) * 100);
  return {
    need,
    draft,
    connections: connections.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'pt-BR')),
    connectionCounts,
    foundationChecks,
    foundationScore,
    evidenceConfidence,
    readyForDesign: foundationChecks.every((item) => item.complete),
  };
}

export function updateNeedProfile(input: { graph: ServiceGraph; needId: Id; draft: NeedProfileDraft; connectedIds: Id[]; now?: string }): ServiceGraph {
  const existing = input.graph.entities?.need?.[input.needId];
  if (!existing) return input.graph;
  const now = input.now ?? new Date().toISOString();
  const managed = relationUniverse(input.graph);
  const managedIds = new Set(managed.map(({ entity }) => entity.id));
  const selected = new Set(input.connectedIds.filter((id) => managedIds.has(id)));
  const preservedExternal = relatedIds(existing).filter((id) => !managedIds.has(id));
  const entities: ServiceGraph['entities'] = { ...(input.graph.entities ?? {}) };
  const needs = { ...(entities.need ?? {}) };
  needs[input.needId] = {
    ...existing,
    type: 'need', serviceId: input.graph.service.id,
    title: input.draft.title.trim(), description: input.draft.description.trim(),
    context: input.draft.context.trim(), desiredOutcome: input.draft.desiredOutcome.trim(),
    currentWorkaround: input.draft.currentWorkaround.trim(), successSignal: input.draft.successSignal.trim(),
    importance: input.draft.importance, relatedIds: [...new Set([...preservedExternal, ...selected])],
    profileVersion: 1, updatedAt: now,
  };
  entities.need = needs;

  for (const { kind, entity } of managed) {
    const collection = { ...(entities[kind] ?? {}) };
    const relationSet = new Set(relatedIds(entity));
    if (selected.has(entity.id)) relationSet.add(input.needId); else relationSet.delete(input.needId);
    const needIds = Array.isArray(entity.needIds) ? entity.needIds.map(String) : [];
    collection[entity.id] = {
      ...entity,
      relatedIds: [...relationSet],
      needIds: selected.has(entity.id) ? [...new Set([...needIds, input.needId])] : needIds.filter((id) => id !== input.needId),
      updatedAt: selected.has(entity.id) || relatedIds(entity).includes(input.needId) ? now : entity.updatedAt,
    };
    entities[kind] = collection;
  }
  return { ...input.graph, entities, service: { ...input.graph.service, updatedAt: now } };
}

export const needRelationOptions = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) => Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({
  id: entity.id, kind, title: title(entity), description: description(entity), confidence: kind === 'evidence' ? String(entity.confidence || 'medium') : undefined,
})));

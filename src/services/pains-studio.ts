import type { GraphEntity, Id, ServiceGraph } from '../domain/model';
import type { ContextKind } from './context-library';

export type PainSeverity = 'low' | 'medium' | 'high' | 'critical';
export type PainFrequency = 'rare' | 'occasional' | 'frequent' | 'constant';
export type PainRelationKind = Exclude<ContextKind, 'pain'>;

export type PainProfileDraft = {
  title: string;
  description: string;
  context: string;
  impact: string;
  observableSignal: string;
  currentWorkaround: string;
  consequence: string;
  severity: PainSeverity;
  frequency: PainFrequency;
};

export type PainConnection = {
  id: Id;
  kind: PainRelationKind;
  title: string;
  description: string;
  direction: 'outbound' | 'inbound' | 'both';
  confidence?: 'low' | 'medium' | 'high';
};

export type PainStudioReport = {
  pain: GraphEntity;
  draft: PainProfileDraft;
  connections: PainConnection[];
  connectionCounts: Record<PainRelationKind, number>;
  foundationChecks: Array<{ id: string; label: string; complete: boolean }>;
  foundationScore: number;
  evidenceConfidence: { low: number; medium: number; high: number };
  readyForProblemFraming: boolean;
};

const RELATION_KINDS: PainRelationKind[] = ['persona', 'need', 'job', 'problemHypothesis', 'problem', 'evidence'];
const relatedIds = (entity?: GraphEntity): Id[] => Array.isArray(entity?.relatedIds)
  ? entity.relatedIds.filter((id): id is Id => typeof id === 'string' && Boolean(id))
  : [];
const title = (entity: GraphEntity) => String(entity.title ?? entity.name ?? 'Sem título');
const description = (entity: GraphEntity) => String(entity.description ?? '');

export const painProfileFromEntity = (entity: GraphEntity): PainProfileDraft => ({
  title: title(entity) === 'Sem título' ? '' : title(entity),
  description: description(entity),
  context: String(entity.context ?? entity.situation ?? ''),
  impact: String(entity.impact ?? entity.consequence ?? ''),
  observableSignal: String(entity.observableSignal ?? entity.signal ?? ''),
  currentWorkaround: String(entity.currentWorkaround ?? entity.currentAlternative ?? ''),
  consequence: String(entity.consequence ?? ''),
  severity: ['low', 'medium', 'high', 'critical'].includes(String(entity.severity)) ? entity.severity as PainSeverity : 'medium',
  frequency: ['rare', 'occasional', 'frequent', 'constant'].includes(String(entity.frequency)) ? entity.frequency as PainFrequency : 'occasional',
});

const relationUniverse = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({ kind, entity })),
);

export function buildPainStudioReport(graph: ServiceGraph, painId: Id): PainStudioReport | null {
  const pain = graph.entities?.pain?.[painId];
  if (!pain) return null;
  const outbound = new Set(relatedIds(pain));
  const connections: PainConnection[] = [];
  const connectionCounts = Object.fromEntries(RELATION_KINDS.map((kind) => [kind, 0])) as Record<PainRelationKind, number>;
  const evidenceConfidence = { low: 0, medium: 0, high: 0 };

  for (const { kind, entity } of relationUniverse(graph)) {
    const isOutbound = outbound.has(entity.id);
    const isInbound = relatedIds(entity).includes(painId)
      || (Array.isArray(entity.painIds) && entity.painIds.map(String).includes(painId));
    if (!isOutbound && !isInbound) continue;
    const direction: PainConnection['direction'] = isOutbound && isInbound ? 'both' : isOutbound ? 'outbound' : 'inbound';
    const confidence = kind === 'evidence' && ['low', 'medium', 'high'].includes(String(entity.confidence))
      ? entity.confidence as 'low' | 'medium' | 'high'
      : undefined;
    connections.push({ id: entity.id, kind, title: title(entity), description: description(entity), direction, confidence });
    connectionCounts[kind] += 1;
    if (confidence) evidenceConfidence[confidence] += 1;
  }

  const draft = painProfileFromEntity(pain);
  const foundationChecks = [
    { id: 'statement', label: 'Dor claramente enunciada', complete: Boolean(draft.title.trim() && draft.description.trim()) },
    { id: 'context', label: 'Contexto da fricção registrado', complete: Boolean(draft.context.trim()) },
    { id: 'impact', label: 'Impacto explícito', complete: Boolean(draft.impact.trim()) },
    { id: 'signal', label: 'Sinal observável registrado', complete: Boolean(draft.observableSignal.trim()) },
    { id: 'persona', label: 'Persona conectada', complete: connectionCounts.persona > 0 },
    { id: 'journeyContext', label: 'Necessidade ou Job conectado', complete: connectionCounts.need + connectionCounts.job > 0 },
    { id: 'evidence', label: 'Evidência conectada', complete: connectionCounts.evidence > 0 },
  ];
  const foundationScore = Math.round((foundationChecks.filter((item) => item.complete).length / foundationChecks.length) * 100);

  return {
    pain,
    draft,
    connections: connections.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'pt-BR')),
    connectionCounts,
    foundationChecks,
    foundationScore,
    evidenceConfidence,
    readyForProblemFraming: foundationChecks.every((item) => item.complete),
  };
}

export function updatePainProfile(input: { graph: ServiceGraph; painId: Id; draft: PainProfileDraft; connectedIds: Id[]; now?: string }): ServiceGraph {
  const existing = input.graph.entities?.pain?.[input.painId];
  if (!existing) return input.graph;
  const now = input.now ?? new Date().toISOString();
  const managed = relationUniverse(input.graph);
  const managedIds = new Set(managed.map(({ entity }) => entity.id));
  const selected = new Set(input.connectedIds.filter((id) => managedIds.has(id)));
  const preservedExternal = relatedIds(existing).filter((id) => !managedIds.has(id));
  const entities: ServiceGraph['entities'] = { ...(input.graph.entities ?? {}) };
  const pains = { ...(entities.pain ?? {}) };

  pains[input.painId] = {
    ...existing,
    type: 'pain', serviceId: input.graph.service.id,
    title: input.draft.title.trim(), description: input.draft.description.trim(),
    context: input.draft.context.trim(), impact: input.draft.impact.trim(),
    observableSignal: input.draft.observableSignal.trim(), currentWorkaround: input.draft.currentWorkaround.trim(),
    consequence: input.draft.consequence.trim(), severity: input.draft.severity, frequency: input.draft.frequency,
    relatedIds: [...new Set([...preservedExternal, ...selected])], profileVersion: 1, updatedAt: now,
  };
  entities.pain = pains;

  for (const { kind, entity } of managed) {
    const collection = { ...(entities[kind] ?? {}) };
    const relationSet = new Set(relatedIds(entity));
    if (selected.has(entity.id)) relationSet.add(input.painId); else relationSet.delete(input.painId);
    const painIds = Array.isArray(entity.painIds) ? entity.painIds.map(String) : [];
    collection[entity.id] = {
      ...entity,
      relatedIds: [...relationSet],
      painIds: selected.has(entity.id) ? [...new Set([...painIds, input.painId])] : painIds.filter((id) => id !== input.painId),
      updatedAt: selected.has(entity.id) || relatedIds(entity).includes(input.painId) ? now : entity.updatedAt,
    };
    entities[kind] = collection;
  }
  return { ...input.graph, entities, service: { ...input.graph.service, updatedAt: now } };
}

export const painRelationOptions = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({
    id: entity.id,
    kind,
    title: title(entity),
    description: description(entity),
    confidence: kind === 'evidence' ? String(entity.confidence ?? 'medium') : undefined,
  })),
);

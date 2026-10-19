import type { GraphEntity, Id, ServiceGraph } from '../domain/model';
import { createDiscoveryEntity } from './discovery-workspace.ts';
import type { EvidenceConfidence, EvidenceStance } from './problem-evidence-studio';

export type EvidenceSourceType = 'interview' | 'observation' | 'survey' | 'analytics' | 'document' | 'support' | 'experiment' | 'other';
export type EvidenceRelationKind = 'persona' | 'need' | 'job' | 'pain' | 'problemHypothesis' | 'problem';

export type EvidenceProfileDraft = {
  title: string;
  description: string;
  interpretation: string;
  sourceType: EvidenceSourceType;
  sourceName: string;
  method: string;
  collectedAt: string;
  sample: string;
  confidence: EvidenceConfidence;
};

export type EvidenceConnection = {
  id: Id;
  kind: EvidenceRelationKind;
  title: string;
  description: string;
  direction: 'outbound' | 'inbound' | 'both';
  stance?: EvidenceStance;
};

export type EvidenceStudioReport = {
  evidence: GraphEntity;
  draft: EvidenceProfileDraft;
  connections: EvidenceConnection[];
  connectionCounts: Record<EvidenceRelationKind, number>;
  supportCount: number;
  contradictionCount: number;
  contextualCount: number;
  qualityChecks: Array<{ id: string; label: string; complete: boolean; detail: string }>;
  qualityScore: number;
  readyForDecision: boolean;
};

const RELATION_KINDS: EvidenceRelationKind[] = ['persona', 'need', 'job', 'pain', 'problemHypothesis', 'problem'];
const SOURCE_TYPES = new Set<EvidenceSourceType>(['interview', 'observation', 'survey', 'analytics', 'document', 'support', 'experiment', 'other']);
const CONFIDENCE = new Set<EvidenceConfidence>(['low', 'medium', 'high']);
const STANCES = new Set<EvidenceStance>(['supports', 'contradicts', 'neutral']);

const typedField: Record<EvidenceRelationKind, string> = {
  persona: 'personaIds',
  need: 'needIds',
  job: 'jobIds',
  pain: 'painIds',
  problemHypothesis: 'hypothesisIds',
  problem: 'problemIds',
};

const relatedIds = (entity?: GraphEntity): Id[] => Array.isArray(entity?.relatedIds)
  ? entity.relatedIds.filter((id): id is Id => typeof id === 'string' && Boolean(id))
  : [];
const idsOf = (value: unknown): Id[] => Array.isArray(value) ? value.filter((id): id is Id => typeof id === 'string' && Boolean(id)) : [];
const titleOf = (entity: GraphEntity) => String(entity.title ?? entity.name ?? 'Sem título');
const descriptionOf = (entity: GraphEntity) => String(entity.description ?? '');
const unique = <T,>(values: T[]) => [...new Set(values)];
const sourceTypeOf = (entity: GraphEntity): EvidenceSourceType => SOURCE_TYPES.has(entity.sourceType as EvidenceSourceType)
  ? entity.sourceType as EvidenceSourceType
  : 'observation';
const confidenceOf = (entity: GraphEntity): EvidenceConfidence => CONFIDENCE.has(entity.confidence as EvidenceConfidence)
  ? entity.confidence as EvidenceConfidence
  : 'medium';
const stanceOf = (value: unknown): EvidenceStance => STANCES.has(value as EvidenceStance) ? value as EvidenceStance : 'neutral';

const relationUniverse = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {})
    .filter((entity) => !entity.serviceId || entity.serviceId === graph.service.id)
    .map((entity) => ({ kind, entity })),
);

const hypothesisStanceFor = (hypothesis: GraphEntity, evidenceId: Id): EvidenceStance => {
  if (Array.isArray(hypothesis.evidenceLinks)) {
    for (const value of hypothesis.evidenceLinks) {
      if (!value || typeof value !== 'object') continue;
      const record = value as Record<string, unknown>;
      if (record.evidenceId === evidenceId) return stanceOf(record.stance);
    }
  }
  return 'neutral';
};

const problemStanceFor = (problem: GraphEntity, evidenceId: Id): EvidenceStance => {
  if (idsOf(problem.supportingEvidenceIds).includes(evidenceId)) return 'supports';
  if (idsOf(problem.contradictingEvidenceIds).includes(evidenceId)) return 'contradicts';
  return 'neutral';
};

export const evidenceProfileFromEntity = (entity: GraphEntity): EvidenceProfileDraft => ({
  title: titleOf(entity) === 'Sem título' ? '' : titleOf(entity),
  description: descriptionOf(entity),
  interpretation: String(entity.interpretation ?? ''),
  sourceType: sourceTypeOf(entity),
  sourceName: String(entity.sourceName ?? entity.source ?? ''),
  method: String(entity.method ?? ''),
  collectedAt: String(entity.collectedAt ?? entity.observedAt ?? ''),
  sample: String(entity.sample ?? entity.sampleContext ?? ''),
  confidence: confidenceOf(entity),
});

export function buildEvidenceStudioReport(graph: ServiceGraph, evidenceId: Id): EvidenceStudioReport | null {
  const evidence = graph.entities?.evidence?.[evidenceId];
  if (!evidence) return null;
  const outbound = new Set(relatedIds(evidence));
  const connections: EvidenceConnection[] = [];
  const connectionCounts = Object.fromEntries(RELATION_KINDS.map((kind) => [kind, 0])) as Record<EvidenceRelationKind, number>;

  for (const { kind, entity } of relationUniverse(graph)) {
    const typedIds = idsOf(evidence[typedField[kind]]);
    const isOutbound = outbound.has(entity.id) || typedIds.includes(entity.id);
    const targetRelated = relatedIds(entity);
    const isInbound = targetRelated.includes(evidenceId) || idsOf(entity.evidenceIds).includes(evidenceId);
    if (!isOutbound && !isInbound) continue;
    const stance = kind === 'problemHypothesis'
      ? hypothesisStanceFor(entity, evidenceId)
      : kind === 'problem'
        ? problemStanceFor(entity, evidenceId)
        : undefined;
    connections.push({
      id: entity.id,
      kind,
      title: titleOf(entity),
      description: descriptionOf(entity),
      direction: isOutbound && isInbound ? 'both' : isOutbound ? 'outbound' : 'inbound',
      stance,
    });
    connectionCounts[kind] += 1;
  }

  const draft = evidenceProfileFromEntity(evidence);
  const decisionConnections = connections.filter((item) => item.kind === 'problemHypothesis' || item.kind === 'problem');
  const supportCount = decisionConnections.filter((item) => item.stance === 'supports').length;
  const contradictionCount = decisionConnections.filter((item) => item.stance === 'contradicts').length;
  const contextualCount = decisionConnections.filter((item) => item.stance === 'neutral').length;
  const hasDiscoveryContext = connectionCounts.persona + connectionCounts.need + connectionCounts.job + connectionCounts.pain > 0;
  const hasDecisionUse = connectionCounts.problemHypothesis + connectionCounts.problem > 0;
  const qualityChecks = [
    { id: 'observation', label: 'Observação clara', complete: Boolean(draft.title.trim() && draft.description.trim()), detail: 'O registro separa um fato observável de um título genérico.' },
    { id: 'source-type', label: 'Tipo de fonte identificado', complete: SOURCE_TYPES.has(draft.sourceType), detail: 'A natureza da evidência está classificada.' },
    { id: 'source', label: 'Origem registrada', complete: Boolean(draft.sourceName.trim()), detail: 'É possível saber de onde o dado, relato ou observação veio.' },
    { id: 'method', label: 'Método ou contexto de coleta', complete: Boolean(draft.method.trim() || draft.sample.trim()), detail: 'Há contexto suficiente para interpretar como a evidência foi obtida.' },
    { id: 'date', label: 'Data de coleta', complete: Boolean(draft.collectedAt.trim()), detail: 'A evidência possui referência temporal.' },
    { id: 'confidence', label: 'Confiança explicitada', complete: CONFIDENCE.has(draft.confidence), detail: 'A força percebida da evidência está declarada.' },
    { id: 'context', label: 'Contexto Discovery conectado', complete: hasDiscoveryContext, detail: 'A evidência está ligada a Persona, Necessidade, Job ou Dor.' },
    { id: 'decision', label: 'Uso em hipótese ou problema', complete: hasDecisionUse, detail: 'A evidência participa explicitamente de uma decisão de Discovery.' },
  ];
  const qualityScore = Math.round((qualityChecks.filter((item) => item.complete).length / qualityChecks.length) * 100);

  return {
    evidence,
    draft,
    connections: connections.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'pt-BR')),
    connectionCounts,
    supportCount,
    contradictionCount,
    contextualCount,
    qualityChecks,
    qualityScore,
    readyForDecision: qualityChecks.every((item) => item.complete),
  };
}

export function createEvidenceRecord(input: {
  graph: ServiceGraph;
  title: string;
  description?: string;
  sourceType?: EvidenceSourceType;
  confidence?: EvidenceConfidence;
  now?: string;
  id?: Id;
}): { graph: ServiceGraph; evidenceId: Id } {
  const entity = createDiscoveryEntity({
    graph: input.graph,
    kind: 'evidence',
    title: input.title,
    description: input.description ?? '',
    sourceType: input.sourceType ?? 'observation',
    confidence: input.confidence ?? 'medium',
    now: input.now,
    id: input.id,
  });
  const entities: ServiceGraph['entities'] = { ...(input.graph.entities ?? {}) };
  entities.evidence = { ...(entities.evidence ?? {}), [entity.id]: { ...entity, evidenceVersion: 2 } };
  return {
    evidenceId: entity.id,
    graph: { ...input.graph, entities, service: { ...input.graph.service, updatedAt: String(entity.updatedAt ?? new Date().toISOString()) } },
  };
}

export function updateEvidenceProfile(input: {
  graph: ServiceGraph;
  evidenceId: Id;
  draft: EvidenceProfileDraft;
  connectedIds: Id[];
  relationStances?: Record<Id, EvidenceStance>;
  owner?: string;
  tags?: string[];
  now?: string;
}): ServiceGraph {
  const existing = input.graph.entities?.evidence?.[input.evidenceId];
  if (!existing) return input.graph;
  const now = input.now ?? new Date().toISOString();
  const universe = relationUniverse(input.graph);
  const validIds = new Set(universe.map(({ entity }) => entity.id));
  const selected = new Set(input.connectedIds.filter((id) => validIds.has(id)));
  const managedIds = validIds;
  const preservedExternal = relatedIds(existing).filter((id) => !managedIds.has(id));
  const entities: ServiceGraph['entities'] = { ...(input.graph.entities ?? {}) };
  const evidenceCollection = { ...(entities.evidence ?? {}) };
  const typedSelections = Object.fromEntries(RELATION_KINDS.map((kind) => [typedField[kind], universe.filter((item) => item.kind === kind && selected.has(item.entity.id)).map((item) => item.entity.id)]));

  evidenceCollection[input.evidenceId] = {
    ...existing,
    type: 'evidence',
    serviceId: input.graph.service.id,
    status: 'captured',
    title: input.draft.title.trim(),
    description: input.draft.description.trim(),
    interpretation: input.draft.interpretation.trim(),
    sourceType: input.draft.sourceType,
    sourceName: input.draft.sourceName.trim(),
    method: input.draft.method.trim(),
    collectedAt: input.draft.collectedAt.trim(),
    sample: input.draft.sample.trim(),
    confidence: input.draft.confidence,
    owner: input.owner?.trim() ?? String(existing.owner ?? ''),
    tags: input.tags ?? (Array.isArray(existing.tags) ? existing.tags : []),
    ...typedSelections,
    relatedIds: unique([...preservedExternal, ...selected]),
    evidenceVersion: 2,
    updatedAt: now,
  };
  entities.evidence = evidenceCollection;

  for (const { kind, entity } of universe) {
    const collection = { ...(entities[kind] ?? {}) };
    const shouldLink = selected.has(entity.id);
    const relationSet = new Set(relatedIds(entity));
    if (shouldLink) relationSet.add(input.evidenceId); else relationSet.delete(input.evidenceId);
    const targetEvidenceIds = new Set(idsOf(entity.evidenceIds));
    if (shouldLink) targetEvidenceIds.add(input.evidenceId); else targetEvidenceIds.delete(input.evidenceId);
    const nextEntity: GraphEntity = {
      ...entity,
      relatedIds: [...relationSet],
      evidenceIds: [...targetEvidenceIds],
      updatedAt: shouldLink || relatedIds(entity).includes(input.evidenceId) || idsOf(entity.evidenceIds).includes(input.evidenceId) ? now : entity.updatedAt,
    };

    if (kind === 'problemHypothesis') {
      const links: Array<{ evidenceId: Id; stance: EvidenceStance }> = [];
      if (Array.isArray(entity.evidenceLinks)) {
        for (const value of entity.evidenceLinks) {
          if (!value || typeof value !== 'object') continue;
          const record = value as Record<string, unknown>;
          if (typeof record.evidenceId !== 'string' || !record.evidenceId || record.evidenceId === input.evidenceId) continue;
          links.push({ evidenceId: record.evidenceId, stance: stanceOf(record.stance) });
        }
      }
      if (shouldLink) links.push({ evidenceId: input.evidenceId, stance: stanceOf(input.relationStances?.[entity.id]) });
      nextEntity.evidenceLinks = links;
      const hypothesisIds = new Set(idsOf(evidenceCollection[input.evidenceId].hypothesisIds));
      if (shouldLink) hypothesisIds.add(entity.id); else hypothesisIds.delete(entity.id);
      evidenceCollection[input.evidenceId].hypothesisIds = [...hypothesisIds];
    }

    if (kind === 'problem') {
      const supporting = new Set(idsOf(entity.supportingEvidenceIds));
      const contradicting = new Set(idsOf(entity.contradictingEvidenceIds));
      supporting.delete(input.evidenceId);
      contradicting.delete(input.evidenceId);
      if (shouldLink) {
        const stance = stanceOf(input.relationStances?.[entity.id]);
        if (stance === 'supports') supporting.add(input.evidenceId);
        if (stance === 'contradicts') contradicting.add(input.evidenceId);
      }
      nextEntity.supportingEvidenceIds = [...supporting];
      nextEntity.contradictingEvidenceIds = [...contradicting];
    }

    collection[entity.id] = nextEntity;
    entities[kind] = collection;
  }

  entities.evidence = { ...(entities.evidence ?? {}), [input.evidenceId]: evidenceCollection[input.evidenceId] };
  return { ...input.graph, entities, service: { ...input.graph.service, updatedAt: now } };
}

export const evidenceRelationOptions = (graph: ServiceGraph) => relationUniverse(graph).map(({ kind, entity }) => ({
  id: entity.id,
  kind,
  title: titleOf(entity),
  description: descriptionOf(entity),
}));

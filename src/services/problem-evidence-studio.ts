import type { GraphEntity, Id, ServiceGraph } from '../domain/model';

export type EvidenceConfidence = 'low' | 'medium' | 'high';
export type EvidenceStance = 'supports' | 'contradicts' | 'neutral';
export type ProblemContextKind = 'persona' | 'need' | 'job' | 'pain';

export type ProblemHypothesisDraft = {
  title: string;
  description: string;
  impact: string;
};

export type EvidenceDraft = {
  title: string;
  description: string;
  confidence: EvidenceConfidence;
  sourceType: string;
};

export type HypothesisEvidenceLink = {
  evidenceId: Id;
  stance: EvidenceStance;
};

export type ProblemContextConnection = {
  id: Id;
  kind: ProblemContextKind;
  title: string;
  description: string;
  direction: 'outbound' | 'inbound' | 'both';
};

export type ProblemEvidenceConnection = {
  id: Id;
  title: string;
  description: string;
  confidence: EvidenceConfidence;
  sourceType: string;
  stance: EvidenceStance;
  direction: 'outbound' | 'inbound' | 'both';
};

export type ProblemEvidenceStudioReport = {
  hypothesis: GraphEntity;
  draft: ProblemHypothesisDraft;
  contextConnections: ProblemContextConnection[];
  evidenceConnections: ProblemEvidenceConnection[];
  supportCount: number;
  contradictionCount: number;
  neutralCount: number;
  highConfidenceSupportCount: number;
  highConfidenceContradictionCount: number;
  validationChecks: Array<{ id: string; label: string; complete: boolean; detail: string }>;
  validationScore: number;
  readyToValidate: boolean;
  status: 'hypothesis' | 'testing' | 'validated';
  validatedProblem: GraphEntity | null;
};

const CONTEXT_KINDS: ProblemContextKind[] = ['persona', 'need', 'job', 'pain'];
const VALID_CONFIDENCE = new Set<EvidenceConfidence>(['low', 'medium', 'high']);
const VALID_STANCE = new Set<EvidenceStance>(['supports', 'contradicts', 'neutral']);

const relatedIds = (entity: GraphEntity | undefined): Id[] => Array.isArray(entity?.relatedIds)
  ? entity.relatedIds.filter((id): id is Id => typeof id === 'string' && Boolean(id))
  : [];
const titleOf = (entity: GraphEntity) => String(entity.title ?? entity.name ?? 'Sem título');
const descriptionOf = (entity: GraphEntity) => String(entity.description ?? '');
const confidenceOf = (entity: GraphEntity): EvidenceConfidence => VALID_CONFIDENCE.has(entity.confidence as EvidenceConfidence)
  ? entity.confidence as EvidenceConfidence
  : 'medium';
const stanceOf = (value: unknown): EvidenceStance => VALID_STANCE.has(value as EvidenceStance) ? value as EvidenceStance : 'neutral';
const unique = <T,>(values: T[]) => [...new Set(values)];

const contextUniverse = (graph: ServiceGraph) => CONTEXT_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({ kind, entity })),
);
const evidenceUniverse = (graph: ServiceGraph) => Object.values(graph.entities?.evidence ?? {});

export const problemHypothesisDraftFromEntity = (entity: GraphEntity): ProblemHypothesisDraft => ({
  title: titleOf(entity) === 'Sem título' ? '' : titleOf(entity),
  description: descriptionOf(entity),
  impact: String(entity.impact ?? ''),
});

export const evidenceDraftFromEntity = (entity: GraphEntity): EvidenceDraft => ({
  title: titleOf(entity) === 'Sem título' ? '' : titleOf(entity),
  description: descriptionOf(entity),
  confidence: confidenceOf(entity),
  sourceType: String(entity.sourceType ?? 'observation'),
});

const evidenceLinkMap = (hypothesis: GraphEntity): Map<Id, EvidenceStance> => {
  const map = new Map<Id, EvidenceStance>();
  if (Array.isArray(hypothesis.evidenceLinks)) {
    for (const value of hypothesis.evidenceLinks) {
      if (!value || typeof value !== 'object') continue;
      const record = value as Record<string, unknown>;
      if (typeof record.evidenceId === 'string' && record.evidenceId) map.set(record.evidenceId, stanceOf(record.stance));
    }
  }
  if (Array.isArray(hypothesis.evidenceIds)) {
    for (const id of hypothesis.evidenceIds) if (typeof id === 'string' && id && !map.has(id)) map.set(id, 'neutral');
  }
  return map;
};

export function buildProblemEvidenceStudioReport(graph: ServiceGraph, hypothesisId: Id): ProblemEvidenceStudioReport | null {
  const hypothesis = graph.entities?.problemHypothesis?.[hypothesisId];
  if (!hypothesis) return null;
  const outbound = new Set(relatedIds(hypothesis));
  const contextConnections: ProblemContextConnection[] = [];
  for (const { kind, entity } of contextUniverse(graph)) {
    const isOutbound = outbound.has(entity.id);
    const isInbound = relatedIds(entity).includes(hypothesisId)
      || (Array.isArray(entity.hypothesisIds) && entity.hypothesisIds.includes(hypothesisId));
    if (!isOutbound && !isInbound) continue;
    contextConnections.push({
      id: entity.id,
      kind,
      title: titleOf(entity),
      description: descriptionOf(entity),
      direction: isOutbound && isInbound ? 'both' : isOutbound ? 'outbound' : 'inbound',
    });
  }

  const storedLinks = evidenceLinkMap(hypothesis);
  const evidenceConnections: ProblemEvidenceConnection[] = [];
  for (const evidence of evidenceUniverse(graph)) {
    const isOutbound = outbound.has(evidence.id) || storedLinks.has(evidence.id);
    const isInbound = relatedIds(evidence).includes(hypothesisId)
      || (Array.isArray(evidence.hypothesisIds) && evidence.hypothesisIds.includes(hypothesisId));
    if (!isOutbound && !isInbound) continue;
    evidenceConnections.push({
      id: evidence.id,
      title: titleOf(evidence),
      description: descriptionOf(evidence),
      confidence: confidenceOf(evidence),
      sourceType: String(evidence.sourceType ?? 'observation'),
      stance: storedLinks.get(evidence.id) ?? 'neutral',
      direction: isOutbound && isInbound ? 'both' : isOutbound ? 'outbound' : 'inbound',
    });
  }

  const support = evidenceConnections.filter((item) => item.stance === 'supports');
  const contradiction = evidenceConnections.filter((item) => item.stance === 'contradicts');
  const neutral = evidenceConnections.filter((item) => item.stance === 'neutral');
  const mediumOrHighSupport = support.filter((item) => item.confidence === 'medium' || item.confidence === 'high');
  const highContradiction = contradiction.filter((item) => item.confidence === 'high');
  const hasPain = contextConnections.some((item) => item.kind === 'pain');
  const hasCustomerContext = contextConnections.some((item) => item.kind === 'persona' || item.kind === 'need' || item.kind === 'job');
  const draft = problemHypothesisDraftFromEntity(hypothesis);
  const validationChecks = [
    { id: 'statement', label: 'Hipótese formulada claramente', complete: Boolean(draft.title.trim()), detail: 'Existe uma afirmação que pode ser confrontada com observação.' },
    { id: 'pain', label: 'Dor / fricção conectada', complete: hasPain, detail: 'A hipótese está ancorada em uma dor registrada no Discovery.' },
    { id: 'context', label: 'Contexto de cliente conectado', complete: hasCustomerContext, detail: 'Há Persona, Necessidade ou Job para delimitar onde o problema acontece.' },
    { id: 'evidence', label: 'Evidência relacionada', complete: evidenceConnections.length > 0, detail: 'Existe pelo menos uma evidência explicitamente vinculada à hipótese.' },
    { id: 'support', label: 'Suporte observável suficiente', complete: mediumOrHighSupport.length > 0, detail: 'Ao menos uma evidência favorável tem confiança média ou alta.' },
    { id: 'contradiction', label: 'Sem contradição forte não resolvida', complete: highContradiction.length === 0, detail: 'Nenhuma evidência contraditória de alta confiança permanece aberta.' },
  ];
  const validationScore = Math.round((validationChecks.filter((item) => item.complete).length / validationChecks.length) * 100);
  const validatedProblemId = typeof hypothesis.validatedProblemId === 'string' ? hypothesis.validatedProblemId : '';
  const validatedProblem = (validatedProblemId && graph.entities?.problem?.[validatedProblemId])
    || Object.values(graph.entities?.problem ?? {}).find((problem) => problem.sourceHypothesisId === hypothesisId && problem.status === 'validated')
    || null;
  const status: ProblemEvidenceStudioReport['status'] = validatedProblem ? 'validated' : evidenceConnections.length ? 'testing' : 'hypothesis';
  return {
    hypothesis,
    draft,
    contextConnections: contextConnections.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'pt-BR')),
    evidenceConnections: evidenceConnections.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    supportCount: support.length,
    contradictionCount: contradiction.length,
    neutralCount: neutral.length,
    highConfidenceSupportCount: support.filter((item) => item.confidence === 'high').length,
    highConfidenceContradictionCount: highContradiction.length,
    validationChecks,
    validationScore,
    readyToValidate: validationChecks.every((item) => item.complete),
    status,
    validatedProblem,
  };
}

export function updateProblemHypothesis(input: {
  graph: ServiceGraph;
  hypothesisId: Id;
  draft: ProblemHypothesisDraft;
  contextIds: Id[];
  evidenceLinks: HypothesisEvidenceLink[];
  now?: string;
}): ServiceGraph {
  const existing = input.graph.entities?.problemHypothesis?.[input.hypothesisId];
  if (!existing) return input.graph;
  const now = input.now ?? new Date().toISOString();
  const contexts = contextUniverse(input.graph);
  const evidences = evidenceUniverse(input.graph);
  const managedIds = new Set([...contexts.map(({ entity }) => entity.id), ...evidences.map((entity) => entity.id)]);
  const selectedContext = new Set(input.contextIds.filter((id) => contexts.some(({ entity }) => entity.id === id)));
  const normalizedEvidenceLinks = input.evidenceLinks
    .filter((link) => evidences.some((entity) => entity.id === link.evidenceId))
    .map((link) => ({ evidenceId: link.evidenceId, stance: stanceOf(link.stance) }));
  const selectedEvidence = new Set(normalizedEvidenceLinks.map((link) => link.evidenceId));
  const preservedExternal = relatedIds(existing).filter((id) => !managedIds.has(id));
  const entities: ServiceGraph['entities'] = { ...(input.graph.entities ?? {}) };
  const hypothesisCollection = { ...(entities.problemHypothesis ?? {}) };
  hypothesisCollection[input.hypothesisId] = {
    ...existing,
    type: 'problemHypothesis',
    serviceId: input.graph.service.id,
    title: input.draft.title.trim(),
    description: input.draft.description.trim(),
    impact: input.draft.impact.trim(),
    status: existing.status === 'validated' ? 'validated' : normalizedEvidenceLinks.length ? 'testing' : 'hypothesis',
    contextIds: [...selectedContext],
    evidenceIds: [...selectedEvidence],
    evidenceLinks: normalizedEvidenceLinks,
    relatedIds: unique([...preservedExternal, ...selectedContext, ...selectedEvidence]),
    hypothesisVersion: 1,
    validationNeedsReview: Boolean(existing.validatedProblemId),
    updatedAt: now,
  };
  entities.problemHypothesis = hypothesisCollection;

  for (const { kind, entity } of contexts) {
    const collection = { ...(entities[kind] ?? {}) };
    const relationSet = new Set(relatedIds(entity));
    const selected = selectedContext.has(entity.id);
    if (selected) relationSet.add(input.hypothesisId); else relationSet.delete(input.hypothesisId);
    const hypothesisIds = new Set(Array.isArray(entity.hypothesisIds) ? entity.hypothesisIds.filter((id): id is Id => typeof id === 'string') : []);
    if (selected) hypothesisIds.add(input.hypothesisId); else hypothesisIds.delete(input.hypothesisId);
    collection[entity.id] = { ...entity, relatedIds: [...relationSet], hypothesisIds: [...hypothesisIds], updatedAt: selected || relatedIds(entity).includes(input.hypothesisId) ? now : entity.updatedAt };
    entities[kind] = collection;
  }
  for (const evidence of evidences) {
    const collection = { ...(entities.evidence ?? {}) };
    const relationSet = new Set(relatedIds(evidence));
    const selected = selectedEvidence.has(evidence.id);
    if (selected) relationSet.add(input.hypothesisId); else relationSet.delete(input.hypothesisId);
    const hypothesisIds = new Set(Array.isArray(evidence.hypothesisIds) ? evidence.hypothesisIds.filter((id): id is Id => typeof id === 'string') : []);
    if (selected) hypothesisIds.add(input.hypothesisId); else hypothesisIds.delete(input.hypothesisId);
    collection[evidence.id] = { ...evidence, relatedIds: [...relationSet], hypothesisIds: [...hypothesisIds], updatedAt: selected || relatedIds(evidence).includes(input.hypothesisId) ? now : evidence.updatedAt };
    entities.evidence = collection;
  }
  return { ...input.graph, entities, service: { ...input.graph.service, updatedAt: now } };
}

export function updateEvidenceRecord(input: { graph: ServiceGraph; evidenceId: Id; draft: EvidenceDraft; now?: string }): ServiceGraph {
  const existing = input.graph.entities?.evidence?.[input.evidenceId];
  if (!existing) return input.graph;
  const now = input.now ?? new Date().toISOString();
  const entities: ServiceGraph['entities'] = { ...(input.graph.entities ?? {}) };
  entities.evidence = {
    ...(entities.evidence ?? {}),
    [input.evidenceId]: {
      ...existing,
      type: 'evidence',
      serviceId: input.graph.service.id,
      title: input.draft.title.trim(),
      description: input.draft.description.trim(),
      confidence: input.draft.confidence,
      sourceType: input.draft.sourceType.trim() || 'observation',
      evidenceVersion: 1,
      updatedAt: now,
    },
  };
  return { ...input.graph, entities, service: { ...input.graph.service, updatedAt: now } };
}

export function validateProblemHypothesis(graph: ServiceGraph, hypothesisId: Id, now = new Date().toISOString()): ServiceGraph {
  const report = buildProblemEvidenceStudioReport(graph, hypothesisId);
  if (!report?.readyToValidate) return graph;
  const hypothesis = report.hypothesis;
  const existingId = typeof hypothesis.validatedProblemId === 'string' && hypothesis.validatedProblemId
    ? hypothesis.validatedProblemId
    : `validated-problem-${hypothesisId}`;
  const existingProblem = graph.entities?.problem?.[existingId];
  const contextIds = report.contextConnections.map((item) => item.id);
  const evidenceIds = report.evidenceConnections.map((item) => item.id);
  const supportingEvidenceIds = report.evidenceConnections.filter((item) => item.stance === 'supports').map((item) => item.id);
  const contradictingEvidenceIds = report.evidenceConnections.filter((item) => item.stance === 'contradicts').map((item) => item.id);
  const entities: ServiceGraph['entities'] = { ...(graph.entities ?? {}) };
  entities.problem = {
    ...(entities.problem ?? {}),
    [existingId]: {
      ...(existingProblem ?? {}),
      id: existingId,
      type: 'problem',
      serviceId: graph.service.id,
      title: titleOf(hypothesis),
      description: descriptionOf(hypothesis),
      impact: String(hypothesis.impact ?? ''),
      status: 'validated',
      sourceHypothesisId: hypothesisId,
      contextIds,
      evidenceIds,
      supportingEvidenceIds,
      contradictingEvidenceIds,
      relatedIds: unique([hypothesisId, ...contextIds, ...evidenceIds]),
      validationVersion: 1,
      validatedAt: existingProblem?.validatedAt ?? now,
      updatedAt: now,
      createdAt: existingProblem?.createdAt ?? now,
    },
  };
  entities.problemHypothesis = {
    ...(entities.problemHypothesis ?? {}),
    [hypothesisId]: {
      ...hypothesis,
      status: 'validated',
      validatedProblemId: existingId,
      validationNeedsReview: false,
      validatedAt: now,
      updatedAt: now,
    },
  };
  return { ...graph, entities, service: { ...graph.service, updatedAt: now } };
}

export const problemContextOptions = (graph: ServiceGraph) => contextUniverse(graph).map(({ kind, entity }) => ({
  id: entity.id,
  kind,
  title: titleOf(entity),
  description: descriptionOf(entity),
}));

export const problemEvidenceOptions = (graph: ServiceGraph) => evidenceUniverse(graph).map((entity) => ({
  id: entity.id,
  title: titleOf(entity),
  description: descriptionOf(entity),
  confidence: confidenceOf(entity),
  sourceType: String(entity.sourceType ?? 'observation'),
}));

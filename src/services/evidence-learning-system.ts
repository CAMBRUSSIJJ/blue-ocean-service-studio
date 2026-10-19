import type {
  GraphEntity, Id, LearningConfidence, LearningHypothesisVerdict, LearningRecommendation,
  LearningStatus, ServiceGraph, ServiceLearningRecord, ServiceLearningState, ServicePrototypeExperiment,
} from '../domain/model';
import { createEvidenceRecord } from './evidence-studio.ts';
import { buildPrototypeLabReport } from './service-prototype-lab.ts';

const nowIso = () => new Date().toISOString();
const clean = (value: unknown) => String(value ?? '').trim();
const unique = <T,>(values: T[]) => [...new Set(values)];
const makeId = (prefix: string): Id => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const LEARNING_VERDICT_LABELS: Record<LearningHypothesisVerdict, string> = {
  validated: 'Hipótese validada',
  refuted: 'Hipótese refutada',
  inconclusive: 'Resultado inconclusivo',
};

export const LEARNING_RECOMMENDATION_LABELS: Record<LearningRecommendation, string> = {
  keep: 'Manter',
  iterate: 'Iterar',
  discard: 'Descartar',
  retest: 'Testar novamente',
};

export const LEARNING_CONFIDENCE_LABELS: Record<LearningConfidence, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta',
};

export function emptyLearningSystem(now = nowIso()): ServiceLearningState {
  return { version: 1, records: {}, updatedAt: now };
}

export function normalizeLearningSystem(graph: ServiceGraph, now = nowIso()): ServiceLearningState {
  const current = graph.service.learningSystem;
  if (!current) return emptyLearningSystem(now);
  const records = Object.fromEntries(Object.entries(current.records ?? {}).map(([id, record]) => [id, {
    ...record,
    id,
    serviceId: graph.service.id,
    experimentId: clean(record.experimentId),
    experimentCompletedAt: clean(record.experimentCompletedAt),
    hypothesisSnapshot: clean(record.hypothesisSnapshot),
    verdict: record.verdict || 'inconclusive',
    confidence: record.confidence || 'low',
    recommendation: record.recommendation || 'retest',
    status: record.status || 'draft',
    summary: clean(record.summary),
    rationale: clean(record.rationale) || undefined,
    evidenceIds: unique((record.evidenceIds ?? []).filter((value): value is Id => typeof value === 'string' && Boolean(value))),
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
  }])) as Record<Id, ServiceLearningRecord>;
  const activeLearningId = current.activeLearningId && records[current.activeLearningId] ? current.activeLearningId : undefined;
  return { version: 1, records, activeLearningId, updatedAt: current.updatedAt || now };
}

function withLearning(graph: ServiceGraph, learningSystem: ServiceLearningState, now: string): ServiceGraph {
  return { ...graph, service: { ...graph.service, learningSystem: { ...learningSystem, updatedAt: now }, updatedAt: now } };
}

export function deriveLearningVerdict(experiment: ServicePrototypeExperiment): LearningHypothesisVerdict {
  if (experiment.outcome === 'passed') return 'validated';
  if (experiment.outcome === 'failed') return 'refuted';
  return 'inconclusive';
}

export function deriveLearningConfidence(experiment: ServicePrototypeExperiment): LearningConfidence {
  const assessed = experiment.criteria.filter((criterion) => criterion.result !== 'pending').length;
  const allAssessed = experiment.criteria.length > 0 && assessed === experiment.criteria.length;
  const evidenceNotes = experiment.criteria.filter((criterion) => clean(criterion.evidenceNote)).length + experiment.observationNotes.length;
  if (allAssessed && experiment.participantIds.length >= 3 && evidenceNotes >= 3) return 'high';
  if (allAssessed && experiment.participantIds.length >= 1 && evidenceNotes >= 1) return 'medium';
  return 'low';
}

export function deriveLearningRecommendation(verdict: LearningHypothesisVerdict): LearningRecommendation {
  if (verdict === 'validated') return 'keep';
  if (verdict === 'refuted') return 'iterate';
  return 'retest';
}

function evidenceDescription(experiment: ServicePrototypeExperiment, kind: 'criterion' | 'observation', value: string, result?: string) {
  const prefix = kind === 'criterion' ? `Critério do experimento “${experiment.title}”` : `Observação do experimento “${experiment.title}”`;
  return result ? `${prefix}. Resultado: ${result}. ${value}` : `${prefix}. ${value}`;
}

function patchEvidence(graph: ServiceGraph, evidenceId: Id, patch: Record<string, unknown>): ServiceGraph {
  const existing = graph.entities?.evidence?.[evidenceId];
  if (!existing) return graph;
  const entities = { ...(graph.entities ?? {}), evidence: { ...(graph.entities?.evidence ?? {}) } };
  entities.evidence[evidenceId] = { ...existing, ...patch } as GraphEntity;
  return { ...graph, entities };
}

function createExperimentEvidence(graph: ServiceGraph, experiment: ServicePrototypeExperiment, now: string): { graph: ServiceGraph; evidenceIds: Id[] } {
  let next = graph;
  const evidenceIds: Id[] = [];
  for (const criterion of experiment.criteria.filter((item) => item.result !== 'pending')) {
    const description = clean(criterion.evidenceNote) || `O critério “${criterion.label}” foi avaliado como ${criterion.result === 'pass' ? 'atendido' : 'não atendido'}.`;
    const created = createEvidenceRecord({
      graph: next,
      title: `${criterion.result === 'pass' ? '✓' : '✕'} ${criterion.label}`,
      description: evidenceDescription(experiment, 'criterion', description, criterion.result === 'pass' ? 'passou' : 'falhou'),
      sourceType: 'experiment',
      confidence: deriveLearningConfidence(experiment),
      now,
    });
    next = patchEvidence(created.graph, created.evidenceId, {
      sourceName: `Service Prototype Lab · ${experiment.title}`,
      method: `Experimento de serviço · ${experiment.fidelity}`,
      collectedAt: experiment.completedAt || now,
      sample: `${experiment.participantIds.length} participante${experiment.participantIds.length === 1 ? '' : 's'}`,
      interpretation: criterion.result === 'pass' ? 'O critério suporta a hipótese testada.' : 'O critério contradiz a hipótese testada.',
      experimentId: experiment.id,
      prototypeCriterionId: criterion.id,
      prototypeOutcome: experiment.outcome,
      provenance: 'H7.31 Evidence & Learning System',
      updatedAt: now,
    });
    evidenceIds.push(created.evidenceId);
  }
  experiment.observationNotes.forEach((note, index) => {
    const created = createEvidenceRecord({
      graph: next,
      title: `Observação ${index + 1} · ${experiment.title}`,
      description: evidenceDescription(experiment, 'observation', note),
      sourceType: 'experiment',
      confidence: deriveLearningConfidence(experiment),
      now,
    });
    next = patchEvidence(created.graph, created.evidenceId, {
      sourceName: `Service Prototype Lab · ${experiment.title}`,
      method: `Observação durante experimento · ${experiment.fidelity}`,
      collectedAt: experiment.completedAt || now,
      sample: `${experiment.participantIds.length} participante${experiment.participantIds.length === 1 ? '' : 's'}`,
      interpretation: 'Observação registrada durante a execução do protótipo.',
      experimentId: experiment.id,
      prototypeObservationIndex: index,
      prototypeOutcome: experiment.outcome,
      provenance: 'H7.31 Evidence & Learning System',
      updatedAt: now,
    });
    evidenceIds.push(created.evidenceId);
  });
  return { graph: next, evidenceIds };
}

export function materializeExperimentLearning(
  graph: ServiceGraph,
  experimentId: Id,
  now = nowIso(),
): { graph: ServiceGraph; learningId: Id | null; created: boolean; reason?: string } {
  const prototype = buildPrototypeLabReport(graph).lab.experiments[experimentId];
  if (!prototype) return { graph, learningId: null, created: false, reason: 'Experimento não encontrado.' };
  if (prototype.status !== 'completed' || prototype.outcome === 'pending') return { graph, learningId: null, created: false, reason: 'Conclua o experimento antes de gerar evidências e aprendizado.' };
  const completedAt = prototype.completedAt || prototype.updatedAt;
  const system = normalizeLearningSystem(graph, now);
  const existing = Object.values(system.records).find((record) => record.experimentId === experimentId && record.experimentCompletedAt === completedAt && record.status !== 'archived');
  if (existing) return { graph: withLearning(graph, { ...system, activeLearningId: existing.id }, now), learningId: existing.id, created: false, reason: 'Esta rodada do experimento já possui aprendizado.' };

  const evidencePack = createExperimentEvidence(graph, prototype, now);
  const verdict = deriveLearningVerdict(prototype);
  const confidence = deriveLearningConfidence(prototype);
  const recommendation = deriveLearningRecommendation(verdict);
  const learningId = makeId('learning');
  const passCount = prototype.criteria.filter((item) => item.result === 'pass').length;
  const failCount = prototype.criteria.filter((item) => item.result === 'fail').length;
  const summary = verdict === 'validated'
    ? `A hipótese foi suportada pela rodada: ${passCount} critério${passCount === 1 ? '' : 's'} passou/passaram e nenhum critério falhou.`
    : verdict === 'refuted'
      ? `A hipótese encontrou contradições: ${failCount} critério${failCount === 1 ? '' : 's'} falhou/falharam nesta rodada.`
      : 'A rodada não produziu evidência suficiente para confirmar ou refutar a hipótese.';
  const record: ServiceLearningRecord = {
    id: learningId,
    serviceId: graph.service.id,
    experimentId,
    experimentCompletedAt: completedAt,
    hypothesisSnapshot: prototype.hypothesis,
    experimentOutcome: prototype.outcome,
    verdict,
    confidence,
    recommendation,
    status: 'draft',
    summary,
    evidenceIds: evidencePack.evidenceIds,
    createdAt: now,
    updatedAt: now,
  };
  const normalizedAfterEvidence = normalizeLearningSystem(evidencePack.graph, now);
  return {
    graph: withLearning(evidencePack.graph, { ...normalizedAfterEvidence, records: { ...normalizedAfterEvidence.records, [learningId]: record }, activeLearningId: learningId }, now),
    learningId,
    created: true,
  };
}

export function updateLearningRecord(
  graph: ServiceGraph,
  learningId: Id,
  patch: Partial<Pick<ServiceLearningRecord, 'summary' | 'rationale' | 'confidence' | 'recommendation'>>,
  now = nowIso(),
): ServiceGraph {
  const system = normalizeLearningSystem(graph, now);
  const current = system.records[learningId];
  if (!current || current.status === 'archived') return graph;
  const next: ServiceLearningRecord = {
    ...current,
    summary: patch.summary === undefined ? current.summary : clean(patch.summary),
    rationale: patch.rationale === undefined ? current.rationale : clean(patch.rationale) || undefined,
    confidence: patch.confidence ?? current.confidence,
    recommendation: patch.recommendation ?? current.recommendation,
    updatedAt: now,
  };
  return withLearning(graph, { ...system, records: { ...system.records, [learningId]: next }, activeLearningId: learningId }, now);
}

export function setLearningStatus(graph: ServiceGraph, learningId: Id, status: LearningStatus, now = nowIso()): ServiceGraph {
  const system = normalizeLearningSystem(graph, now);
  const current = system.records[learningId];
  if (!current) return graph;
  const next = { ...current, status, reviewedAt: status === 'reviewed' ? now : current.reviewedAt, updatedAt: now };
  return withLearning(graph, { ...system, records: { ...system.records, [learningId]: next }, activeLearningId: status === 'archived' ? undefined : learningId }, now);
}

export function buildLearningSystemReport(graph: ServiceGraph) {
  const system = normalizeLearningSystem(graph, String(graph.service.updatedAt || nowIso()));
  const prototypeReport = buildPrototypeLabReport(graph);
  const records = Object.values(system.records).filter((record) => record.status !== 'archived').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const archivedRecords = Object.values(system.records).filter((record) => record.status === 'archived').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const learnedRoundKeys = new Set(Object.values(system.records).map((record) => `${record.experimentId}::${record.experimentCompletedAt}`));
  const pendingExperiments = prototypeReport.experiments.filter((experiment) => experiment.status === 'completed' && experiment.outcome !== 'pending' && !learnedRoundKeys.has(`${experiment.id}::${experiment.completedAt || experiment.updatedAt}`));
  const activeLearningId = system.activeLearningId && records.some((record) => record.id === system.activeLearningId) ? system.activeLearningId : records[0]?.id;
  const evidenceIds = unique(records.flatMap((record) => record.evidenceIds));
  const reviewable = records.filter((record) => Boolean(record.summary.trim()) && record.evidenceIds.length > 0);
  return {
    system,
    records,
    archivedRecords,
    pendingExperiments,
    activeLearningId,
    activeLearning: activeLearningId ? records.find((record) => record.id === activeLearningId) ?? null : null,
    evidenceIds,
    counts: {
      completedExperiments: prototypeReport.counts.completed,
      pending: pendingExperiments.length,
      learnings: records.length,
      reviewed: records.filter((record) => record.status === 'reviewed').length,
      evidence: evidenceIds.length,
      validated: records.filter((record) => record.verdict === 'validated').length,
      refuted: records.filter((record) => record.verdict === 'refuted').length,
      inconclusive: records.filter((record) => record.verdict === 'inconclusive').length,
    },
    learningCoverage: prototypeReport.counts.completed ? Math.round(((prototypeReport.counts.completed - pendingExperiments.length) / prototypeReport.counts.completed) * 100) : 0,
    reviewReady: reviewable.length,
  };
}

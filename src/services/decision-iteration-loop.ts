import type {
  Id, ServiceDecisionChange, ServiceDecisionRecord,
  ServiceDecisionState, ServiceDecisionStatus, ServiceDecisionTargetKind, ServiceGraph,
} from '../domain/model';
import { normalizeLearningSystem } from './evidence-learning-system.ts';

const nowIso = () => new Date().toISOString();
const clean = (value: unknown) => String(value ?? '').trim();
const makeId = (prefix: string): Id => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const DECISION_STATUS_LABELS: Record<ServiceDecisionStatus, string> = {
  draft: 'Rascunho', proposed: 'Em aprovação', approved: 'Aprovada', rejected: 'Rejeitada', applied: 'Aplicada', archived: 'Arquivada',
};

export const DECISION_TARGET_LABELS: Record<ServiceDecisionTargetKind, string> = {
  proposition: 'Proposição', journey: 'Journey', blueprint: 'Blueprint',
};

export const DECISION_TARGET_FIELDS: Record<ServiceDecisionTargetKind, Array<{ value: string; label: string }>> = {
  proposition: [
    { value: 'audience', label: 'Público' }, { value: 'problem', label: 'Problema' }, { value: 'promise', label: 'Promessa' },
    { value: 'outcome', label: 'Resultado' }, { value: 'experience', label: 'Experiência' }, { value: 'differentiator', label: 'Diferencial' },
    { value: 'businessValue', label: 'Valor para o negócio' }, { value: 'status', label: 'Status' },
  ],
  journey: [
    { value: 'name', label: 'Nome' }, { value: 'owner', label: 'Responsável' }, { value: 'status', label: 'Status' },
    { value: 'priority', label: 'Prioridade' }, { value: 'objective', label: 'Objetivo' },
  ],
  blueprint: [{ value: 'name', label: 'Nome' }],
};


export const DECISION_VALUE_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  'proposition:status': [{ value: 'draft', label: 'Rascunho' }, { value: 'ready', label: 'Pronta' }, { value: 'validated', label: 'Validada' }],
  'journey:status': [{ value: 'draft', label: 'Rascunho' }, { value: 'active', label: 'Ativa' }, { value: 'archived', label: 'Arquivada' }],
  'journey:priority': [{ value: 'low', label: 'Baixa' }, { value: 'medium', label: 'Média' }, { value: 'high', label: 'Alta' }, { value: 'critical', label: 'Crítica' }],
};

export function validateDecisionProposedValue(kind: ServiceDecisionTargetKind, field: string, value: string): string | null {
  const cleanValue = String(value ?? '').trim();
  if ((field === 'name' || kind === 'proposition') && !cleanValue) return 'O novo valor não pode ficar vazio.';
  const options = DECISION_VALUE_OPTIONS[`${kind}:${field}`];
  if (options && !options.some((option) => option.value === cleanValue)) return 'Valor inválido para este campo.';
  return null;
}

export function emptyDecisionSystem(now = nowIso()): ServiceDecisionState {
  return { version: 1, records: {}, updatedAt: now };
}

export function normalizeDecisionSystem(graph: ServiceGraph, now = nowIso()): ServiceDecisionState {
  const current = graph.service.decisionSystem;
  if (!current) return emptyDecisionSystem(now);
  const records = Object.fromEntries(Object.entries(current.records ?? {}).map(([id, record]) => [id, {
    ...record,
    id,
    serviceId: graph.service.id,
    learningId: clean(record.learningId),
    title: clean(record.title),
    rationale: clean(record.rationale),
    status: record.status || 'draft',
    recommendationSnapshot: record.recommendationSnapshot || 'iterate',
    confidenceSnapshot: record.confidenceSnapshot || 'low',
    learningSummarySnapshot: clean(record.learningSummarySnapshot),
    changes: (record.changes ?? []).map((change) => ({
      ...change,
      id: clean(change.id) || makeId('change'),
      targetKind: change.targetKind || 'journey',
      targetId: clean(change.targetId) || undefined,
      targetLabel: clean(change.targetLabel),
      field: clean(change.field),
      beforeValue: String(change.beforeValue ?? ''),
      proposedValue: String(change.proposedValue ?? ''),
    })),
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
  }])) as Record<Id, ServiceDecisionRecord>;
  const activeDecisionId = current.activeDecisionId && records[current.activeDecisionId] ? current.activeDecisionId : undefined;
  return { version: 1, records, activeDecisionId, updatedAt: current.updatedAt || now };
}

function withDecisions(graph: ServiceGraph, decisionSystem: ServiceDecisionState, now: string): ServiceGraph {
  return { ...graph, service: { ...graph.service, decisionSystem: { ...decisionSystem, updatedAt: now }, updatedAt: now } };
}

function findTargetLabel(graph: ServiceGraph, kind: ServiceDecisionTargetKind, targetId?: Id) {
  if (kind === 'proposition') return 'Proposição atual';
  if (kind === 'journey') return graph.journeys[targetId ?? '']?.name || 'Journey';
  return graph.views.whiteboards[targetId ?? '']?.name || 'Blueprint';
}

export function readDecisionTargetValue(graph: ServiceGraph, kind: ServiceDecisionTargetKind, field: string, targetId?: Id): string | null {
  if (!DECISION_TARGET_FIELDS[kind].some((item) => item.value === field)) return null;
  if (kind === 'proposition') {
    const proposition = graph.service.proposition?.current as unknown as Record<string, unknown> | undefined;
    if (!proposition) return null;
    return String(proposition[field] ?? '');
  }
  if (kind === 'journey') {
    const journey = graph.journeys[targetId ?? ''] as unknown as Record<string, unknown> | undefined;
    if (!journey) return null;
    return String(journey[field] ?? '');
  }
  const board = graph.views.whiteboards[targetId ?? ''] as unknown as Record<string, unknown> | undefined;
  if (!board || board.viewKind !== 'blueprint') return null;
  return String(board[field] ?? '');
}

export function createDecisionFromLearning(graph: ServiceGraph, learningId: Id, now = nowIso()): { graph: ServiceGraph; decisionId: Id | null; created: boolean; reason?: string } {
  const learning = normalizeLearningSystem(graph, now).records[learningId];
  if (!learning) return { graph, decisionId: null, created: false, reason: 'Aprendizado não encontrado.' };
  if (learning.status !== 'reviewed') return { graph, decisionId: null, created: false, reason: 'Revise o aprendizado antes de abrir uma decisão.' };
  const system = normalizeDecisionSystem(graph, now);
  const existing = Object.values(system.records).find((record) => record.learningId === learningId && record.status !== 'archived');
  if (existing) return { graph: withDecisions(graph, { ...system, activeDecisionId: existing.id }, now), decisionId: existing.id, created: false, reason: 'Este aprendizado já possui uma decisão ativa.' };
  const decisionId = makeId('decision');
  const record: ServiceDecisionRecord = {
    id: decisionId,
    serviceId: graph.service.id,
    learningId,
    title: `Decidir: ${learning.hypothesisSnapshot || 'aprendizado do experimento'}`,
    rationale: learning.rationale || learning.summary,
    status: 'draft',
    recommendationSnapshot: learning.recommendation,
    confidenceSnapshot: learning.confidence,
    learningSummarySnapshot: learning.summary,
    changes: [],
    createdAt: now,
    updatedAt: now,
  };
  return { graph: withDecisions(graph, { ...system, records: { ...system.records, [decisionId]: record }, activeDecisionId: decisionId }, now), decisionId, created: true };
}

export function updateDecisionRecord(graph: ServiceGraph, decisionId: Id, patch: Partial<Pick<ServiceDecisionRecord, 'title' | 'rationale'>>, now = nowIso()): ServiceGraph {
  const system = normalizeDecisionSystem(graph, now); const record = system.records[decisionId];
  if (!record || record.status !== 'draft') return graph;
  const next = { ...record, ...patch, title: patch.title === undefined ? record.title : clean(patch.title), rationale: patch.rationale === undefined ? record.rationale : clean(patch.rationale), updatedAt: now };
  return withDecisions(graph, { ...system, records: { ...system.records, [decisionId]: next }, activeDecisionId: decisionId }, now);
}

export function addDecisionChange(
  graph: ServiceGraph,
  decisionId: Id,
  input: { targetKind: ServiceDecisionTargetKind; targetId?: Id; field: string; proposedValue: string },
  now = nowIso(),
): { graph: ServiceGraph; changeId: Id | null; reason?: string } {
  const system = normalizeDecisionSystem(graph, now); const record = system.records[decisionId];
  if (!record) return { graph, changeId: null, reason: 'Decisão não encontrada.' };
  if (record.status !== 'draft') return { graph, changeId: null, reason: 'Só é possível editar mudanças enquanto a decisão estiver em rascunho.' };
  const beforeValue = readDecisionTargetValue(graph, input.targetKind, input.field, input.targetId);
  if (beforeValue === null) return { graph, changeId: null, reason: 'Alvo ou campo inválido para esta mudança.' };
  const proposedValue = String(input.proposedValue ?? '').trim();
  const valueError = validateDecisionProposedValue(input.targetKind, input.field, proposedValue);
  if (valueError) return { graph, changeId: null, reason: valueError };
  if (proposedValue === beforeValue) return { graph, changeId: null, reason: 'O valor proposto precisa ser diferente do valor atual.' };
  const existing = record.changes.find((change) => change.targetKind === input.targetKind && change.targetId === input.targetId && change.field === input.field);
  const changeId = existing?.id || makeId('change');
  const change: ServiceDecisionChange = { id: changeId, targetKind: input.targetKind, targetId: input.targetId, targetLabel: findTargetLabel(graph, input.targetKind, input.targetId), field: input.field, beforeValue, proposedValue };
  const changes = existing ? record.changes.map((item) => item.id === changeId ? change : item) : [...record.changes, change];
  const next = { ...record, changes, applicationResult: undefined, applicationNote: undefined, updatedAt: now };
  return { graph: withDecisions(graph, { ...system, records: { ...system.records, [decisionId]: next }, activeDecisionId: decisionId }, now), changeId };
}

export function removeDecisionChange(graph: ServiceGraph, decisionId: Id, changeId: Id, now = nowIso()): ServiceGraph {
  const system = normalizeDecisionSystem(graph, now); const record = system.records[decisionId];
  if (!record || record.status !== 'draft') return graph;
  return withDecisions(graph, { ...system, records: { ...system.records, [decisionId]: { ...record, changes: record.changes.filter((change) => change.id !== changeId), updatedAt: now } }, activeDecisionId: decisionId }, now);
}

export function submitDecision(graph: ServiceGraph, decisionId: Id, now = nowIso()): { graph: ServiceGraph; submitted: boolean; reason?: string } {
  const system = normalizeDecisionSystem(graph, now); const record = system.records[decisionId];
  if (!record) return { graph, submitted: false, reason: 'Decisão não encontrada.' };
  if (record.status !== 'draft') return { graph, submitted: false, reason: 'A decisão não está em rascunho.' };
  if (!record.changes.length) return { graph, submitted: false, reason: 'Adicione ao menos uma mudança antes de enviar para aprovação.' };
  const next = { ...record, status: 'proposed' as const, submittedAt: now, updatedAt: now };
  return { graph: withDecisions(graph, { ...system, records: { ...system.records, [decisionId]: next }, activeDecisionId: decisionId }, now), submitted: true };
}

export function decideServiceChange(graph: ServiceGraph, decisionId: Id, outcome: 'approved' | 'rejected', options: { decidedBy?: string; decisionNote?: string } = {}, now = nowIso()): { graph: ServiceGraph; decided: boolean; reason?: string } {
  const system = normalizeDecisionSystem(graph, now); const record = system.records[decisionId];
  if (!record) return { graph, decided: false, reason: 'Decisão não encontrada.' };
  if (record.status !== 'proposed') return { graph, decided: false, reason: 'A decisão precisa estar em aprovação.' };
  const next: ServiceDecisionRecord = { ...record, status: outcome, decidedAt: now, decidedBy: clean(options.decidedBy) || undefined, decisionNote: clean(options.decisionNote) || undefined, applicationResult: undefined, applicationNote: undefined, updatedAt: now };
  return { graph: withDecisions(graph, { ...system, records: { ...system.records, [decisionId]: next }, activeDecisionId: decisionId }, now), decided: true };
}

export function reopenDecision(graph: ServiceGraph, decisionId: Id, now = nowIso()): ServiceGraph {
  const system = normalizeDecisionSystem(graph, now); const record = system.records[decisionId];
  if (!record || !['rejected', 'approved'].includes(record.status) || record.status === 'applied') return graph;
  const next: ServiceDecisionRecord = { ...record, status: 'draft', submittedAt: undefined, decidedAt: undefined, decidedBy: undefined, decisionNote: undefined, applicationResult: undefined, applicationNote: undefined, updatedAt: now };
  return withDecisions(graph, { ...system, records: { ...system.records, [decisionId]: next }, activeDecisionId: decisionId }, now);
}

function applyChange(graph: ServiceGraph, change: ServiceDecisionChange, now: string): ServiceGraph {
  if (change.targetKind === 'proposition') {
    const state = graph.service.proposition; if (!state) return graph;
    const current = { ...state.current, [change.field]: change.proposedValue, updatedAt: now };
    return { ...graph, service: { ...graph.service, proposition: { ...state, current, updatedAt: now }, updatedAt: now } };
  }
  if (change.targetKind === 'journey') {
    const targetId = change.targetId ?? ''; const journey = graph.journeys[targetId]; if (!journey) return graph;
    return { ...graph, journeys: { ...graph.journeys, [targetId]: { ...journey, [change.field]: change.proposedValue, updatedAt: now } }, service: { ...graph.service, updatedAt: now } };
  }
  const targetId = change.targetId ?? ''; const board = graph.views.whiteboards[targetId]; if (!board) return graph;
  return { ...graph, views: { ...graph.views, whiteboards: { ...graph.views.whiteboards, [targetId]: { ...board, [change.field]: change.proposedValue, updatedAt: now } } }, service: { ...graph.service, updatedAt: now } };
}

export function applyApprovedDecision(graph: ServiceGraph, decisionId: Id, now = nowIso()): { graph: ServiceGraph; applied: boolean; conflict: boolean; reason?: string } {
  const system = normalizeDecisionSystem(graph, now); const record = system.records[decisionId];
  if (!record) return { graph, applied: false, conflict: false, reason: 'Decisão não encontrada.' };
  if (record.status !== 'approved') return { graph, applied: false, conflict: false, reason: 'Somente decisões aprovadas podem ser aplicadas.' };
  const conflicts = record.changes.filter((change) => readDecisionTargetValue(graph, change.targetKind, change.field, change.targetId) !== change.beforeValue);
  if (conflicts.length) {
    const labels = conflicts.map((change) => `${change.targetLabel} · ${change.field}`).join(', ');
    const next: ServiceDecisionRecord = { ...record, applicationResult: 'conflict', applicationNote: `Aplicação bloqueada: o estado atual mudou desde a proposta (${labels}).`, updatedAt: now };
    return { graph: withDecisions(graph, { ...system, records: { ...system.records, [decisionId]: next }, activeDecisionId: decisionId }, now), applied: false, conflict: true, reason: next.applicationNote };
  }
  let nextGraph = graph;
  const effective = record.changes.filter((change) => change.beforeValue !== change.proposedValue);
  effective.forEach((change) => { nextGraph = applyChange(nextGraph, change, now); });
  const normalized = normalizeDecisionSystem(nextGraph, now);
  const currentRecord = normalized.records[decisionId] ?? record;
  const result = effective.length ? 'applied' as const : 'noop' as const;
  const nextRecord: ServiceDecisionRecord = { ...currentRecord, status: 'applied', appliedAt: now, applicationResult: result, applicationNote: result === 'applied' ? `${effective.length} mudança${effective.length === 1 ? '' : 's'} aplicada${effective.length === 1 ? '' : 's'} com sucesso.` : 'Nenhuma alteração efetiva era necessária.', changes: currentRecord.changes.map((change) => ({ ...change, appliedAt: now })), updatedAt: now };
  return { graph: withDecisions(nextGraph, { ...normalized, records: { ...normalized.records, [decisionId]: nextRecord }, activeDecisionId: decisionId }, now), applied: true, conflict: false };
}

export function archiveDecision(graph: ServiceGraph, decisionId: Id, now = nowIso()): ServiceGraph {
  const system = normalizeDecisionSystem(graph, now); const record = system.records[decisionId];
  if (!record || record.status === 'applied') return graph;
  const next: ServiceDecisionRecord = { ...record, status: 'archived', updatedAt: now };
  return withDecisions(graph, { ...system, records: { ...system.records, [decisionId]: next }, activeDecisionId: system.activeDecisionId === decisionId ? undefined : system.activeDecisionId }, now);
}

export function buildDecisionLoopReport(graph: ServiceGraph) {
  const decisionSystem = normalizeDecisionSystem(graph);
  const learningSystem = normalizeLearningSystem(graph);
  const records = Object.values(decisionSystem.records).filter((record) => record.status !== 'archived').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const coveredLearningIds = new Set(Object.values(decisionSystem.records).filter((record) => record.status !== 'archived').map((record) => record.learningId));
  const eligibleLearnings = Object.values(learningSystem.records).filter((record) => record.status === 'reviewed' && !coveredLearningIds.has(record.id)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const counts = {
    decisions: records.length,
    draft: records.filter((record) => record.status === 'draft').length,
    proposed: records.filter((record) => record.status === 'proposed').length,
    approved: records.filter((record) => record.status === 'approved').length,
    rejected: records.filter((record) => record.status === 'rejected').length,
    applied: records.filter((record) => record.status === 'applied').length,
    conflicts: records.filter((record) => record.applicationResult === 'conflict').length,
    eligible: eligibleLearnings.length,
  };
  return { decisionSystem, activeDecisionId: decisionSystem.activeDecisionId, records, eligibleLearnings, counts };
}

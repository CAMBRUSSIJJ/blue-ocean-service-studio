import type {
  Id, ImprovementInitiativeRisk, ImprovementInitiativeStatus, ServiceGraph,
  ServiceImprovementInitiative, ServiceImprovementPortfolioState,
} from '../domain/model';
import { normalizeImprovementBacklogState } from './improvement-backlog.ts';

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};
const bounded5 = (value: unknown, fallback = 3): 1 | 2 | 3 | 4 | 5 => {
  const number = Math.round(Number(value));
  return (Number.isFinite(number) ? Math.min(5, Math.max(1, number)) : fallback) as 1 | 2 | 3 | 4 | 5;
};
const boundedProgress = (value: unknown, fallback = 0) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : fallback;
};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const unique = (values: Id[]) => [...new Set(values.filter(Boolean))];

export const IMPROVEMENT_INITIATIVE_STATUS_LABELS: Record<ImprovementInitiativeStatus, string> = {
  backlog: 'Backlog', planned: 'Planejada', in_progress: 'Em execução', validating: 'Validando', implemented: 'Implementada',
};
export const IMPROVEMENT_INITIATIVE_RISK_LABELS: Record<ImprovementInitiativeRisk, string> = {
  low: 'Baixo', medium: 'Médio', high: 'Alto',
};

export function emptyImprovementPortfolioState(now = nowIso()): ServiceImprovementPortfolioState {
  return { version: 1, initiatives: {}, updatedAt: now };
}
export function normalizeImprovementPortfolioState(graph: ServiceGraph, now = nowIso()): ServiceImprovementPortfolioState {
  const state = graph.service.improvementPortfolio;
  return { version: 1, initiatives: { ...(state?.initiatives ?? {}) }, updatedAt: state?.updatedAt ?? now };
}

export function eligibleImprovementOpportunities(graph: ServiceGraph) {
  const backlog = normalizeImprovementBacklogState(graph);
  const portfolio = normalizeImprovementPortfolioState(graph);
  const used = new Set(Object.values(portfolio.initiatives).map((item) => item.opportunityId));
  return Object.values(backlog.opportunities)
    .filter((item) => ['selected','planned'].includes(item.status) && !used.has(item.id))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function validRefs(graph: ServiceGraph, currentId: Id, values: Partial<Pick<ServiceImprovementInitiative, 'dependencyIds'|'decisionIds'|'experimentIds'|'metricIds'>>) {
  const portfolio = normalizeImprovementPortfolioState(graph);
  const decisions = graph.service.decisionSystem?.records ?? {};
  const experiments = graph.service.prototypeLab?.experiments ?? {};
  const metrics = graph.entities?.metric ?? {};
  return {
    dependencyIds: unique(values.dependencyIds ?? []).filter((id) => id !== currentId && Boolean(portfolio.initiatives[id])),
    decisionIds: unique(values.decisionIds ?? []).filter((id) => Boolean(decisions[id])),
    experimentIds: unique(values.experimentIds ?? []).filter((id) => Boolean(experiments[id])),
    metricIds: unique(values.metricIds ?? []).filter((id) => Boolean(metrics[id])),
  };
}

function inferredExperiments(graph: ServiceGraph, problemIds: Id[]) {
  const backlog = normalizeImprovementBacklogState(graph);
  const experiments = graph.service.prototypeLab?.experiments ?? {};
  const refs = problemIds.flatMap((id) => backlog.problems[id]?.sourceRefs ?? [])
    .filter((ref) => ref.kind === 'prototype' && Boolean(experiments[ref.sourceId]))
    .map((ref) => ref.sourceId);
  return unique(refs);
}

export function createImprovementInitiative(graph: ServiceGraph, input: {
  opportunityId: Id; title?: string; owner?: string; expectedOutcome?: string; effort?: number; expectedImpact?: number;
  deliveryRisk?: ImprovementInitiativeRisk; targetDate?: string; id?: Id;
}, now = nowIso()): { graph: ServiceGraph; initiativeId: Id | null; created: boolean; reason?: string } {
  const backlog = normalizeImprovementBacklogState(graph, now);
  const opportunity = backlog.opportunities[input.opportunityId];
  if (!opportunity) return { graph, initiativeId: null, created: false, reason: 'opportunity_not_found' };
  if (!['selected','planned'].includes(opportunity.status)) return { graph, initiativeId: null, created: false, reason: 'opportunity_not_selected' };
  const state = normalizeImprovementPortfolioState(graph, now);
  const existing = Object.values(state.initiatives).find((item) => item.opportunityId === opportunity.id);
  if (existing) return { graph, initiativeId: existing.id, created: false, reason: 'already_exists' };
  const id = input.id ?? makeId('improvement-initiative');
  state.initiatives[id] = {
    id, serviceId: graph.service.id, opportunityId: opportunity.id,
    title: text(input.title) || opportunity.title,
    problemIds: unique(opportunity.problemIds), status: 'backlog',
    owner: text(input.owner) || opportunity.owner || undefined,
    expectedOutcome: text(input.expectedOutcome) || undefined,
    effort: bounded5(input.effort, 3), expectedImpact: bounded5(input.expectedImpact, 4),
    deliveryRisk: input.deliveryRisk ?? 'medium', progress: 0,
    targetDate: text(input.targetDate) || undefined, dependencyIds: [], decisionIds: [],
    experimentIds: inferredExperiments(graph, opportunity.problemIds), metricIds: [],
    note: opportunity.note, createdAt: now, updatedAt: now,
  };
  state.updatedAt = now;
  return { graph: { ...graph, service: { ...graph.service, improvementPortfolio: state, updatedAt: now } }, initiativeId: id, created: true };
}

export function updateImprovementInitiative(graph: ServiceGraph, initiativeId: Id, patch: Partial<Pick<ServiceImprovementInitiative,
  'title'|'status'|'owner'|'expectedOutcome'|'effort'|'expectedImpact'|'deliveryRisk'|'progress'|'startDate'|'targetDate'|'dependencyIds'|'decisionIds'|'experimentIds'|'metricIds'|'note'
>>, now = nowIso()): ServiceGraph {
  const state = normalizeImprovementPortfolioState(graph, now);
  const current = state.initiatives[initiativeId];
  if (!current) return graph;
  const refs = validRefs(graph, initiativeId, {
    dependencyIds: patch.dependencyIds ?? current.dependencyIds,
    decisionIds: patch.decisionIds ?? current.decisionIds,
    experimentIds: patch.experimentIds ?? current.experimentIds,
    metricIds: patch.metricIds ?? current.metricIds,
  });
  const status = patch.status ?? current.status;
  const implemented = status === 'implemented';
  const next: ServiceImprovementInitiative = {
    ...current, ...patch, ...refs, status,
    title: text(patch.title) || current.title,
    owner: patch.owner === undefined ? current.owner : text(patch.owner) || undefined,
    expectedOutcome: patch.expectedOutcome === undefined ? current.expectedOutcome : text(patch.expectedOutcome) || undefined,
    effort: bounded5(patch.effort ?? current.effort, current.effort),
    expectedImpact: bounded5(patch.expectedImpact ?? current.expectedImpact, current.expectedImpact),
    progress: implemented ? 100 : boundedProgress(patch.progress ?? current.progress, current.progress),
    startDate: patch.startDate === undefined ? current.startDate : text(patch.startDate) || undefined,
    targetDate: patch.targetDate === undefined ? current.targetDate : text(patch.targetDate) || undefined,
    note: patch.note === undefined ? current.note : text(patch.note) || undefined,
    implementedAt: implemented ? (current.implementedAt ?? now) : undefined,
    updatedAt: now,
  };
  state.initiatives[initiativeId] = next; state.updatedAt = now;
  return { ...graph, service: { ...graph.service, improvementPortfolio: state, updatedAt: now } };
}

export function buildImprovementPortfolioReport(graph: ServiceGraph, now = nowIso()) {
  const state = normalizeImprovementPortfolioState(graph, now);
  const backlog = normalizeImprovementBacklogState(graph, now);
  const date = now.slice(0, 10);
  const initiatives = Object.values(state.initiatives).map((item) => {
    const dependencyItems = item.dependencyIds.map((id) => state.initiatives[id]).filter(Boolean);
    const blockedBy = dependencyItems.filter((dep) => dep.status !== 'implemented').map((dep) => dep.id);
    const overdue = Boolean(item.targetDate && item.targetDate < date && item.status !== 'implemented');
    const sourceProblems = item.problemIds.map((id) => backlog.problems[id]).filter(Boolean);
    const sourceOpportunity = backlog.opportunities[item.opportunityId];
    const valueScore = Math.round(((item.expectedImpact * 0.7) + ((6 - item.effort) * 0.3)) / 5 * 100);
    return { ...item, blockedBy, blocked: blockedBy.length > 0, overdue, sourceProblems, sourceOpportunity, valueScore };
  }).sort((a, b) => {
    const rank: Record<ImprovementInitiativeStatus, number> = { in_progress: 0, validating: 1, planned: 2, backlog: 3, implemented: 4 };
    return rank[a.status] - rank[b.status] || b.valueScore - a.valueScore || b.updatedAt.localeCompare(a.updatedAt);
  });
  const eligibleOpportunities = eligibleImprovementOpportunities(graph);
  const active = initiatives.filter((item) => item.status !== 'implemented');
  const counts = {
    initiatives: initiatives.length, backlog: initiatives.filter((i) => i.status === 'backlog').length,
    planned: initiatives.filter((i) => i.status === 'planned').length, inProgress: initiatives.filter((i) => i.status === 'in_progress').length,
    validating: initiatives.filter((i) => i.status === 'validating').length, implemented: initiatives.filter((i) => i.status === 'implemented').length,
    blocked: active.filter((i) => i.blocked).length, overdue: active.filter((i) => i.overdue).length,
    eligibleOpportunities: eligibleOpportunities.length,
  };
  const averageProgress = initiatives.length ? Math.round(initiatives.reduce((sum, item) => sum + item.progress, 0) / initiatives.length) : 0;
  return { state, initiatives, eligibleOpportunities, counts, averageProgress, portfolioReady: initiatives.length > 0 };
}

import type {
  GraphEntity, Id, ImprovementOpportunityStatus, ImprovementPriorityBand, ImprovementProblemStatus,
  ImprovementSourceKind, ImprovementSourceRef, ServiceGraph, ServiceImprovementBacklogState,
  ServiceImprovementOpportunity, ServiceImprovementProblem,
} from '../domain/model';
import { deriveCurrentFutureGaps, normalizeCurrentFutureState } from './current-future-service.ts';

const nowIso = () => new Date().toISOString();
const bounded = (value: unknown, fallback = 3): 1 | 2 | 3 | 4 | 5 => {
  const number = Math.round(Number(value));
  return (Number.isFinite(number) ? Math.min(5, Math.max(1, number)) : fallback) as 1 | 2 | 3 | 4 | 5;
};
const ids = (value: unknown): Id[] => Array.isArray(value) ? value.filter((item): item is Id => typeof item === 'string' && Boolean(item)) : [];
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const titleOf = (entity: GraphEntity) => text(entity.title) || text(entity.name) || 'Problema sem título';
const descriptionOf = (entity: GraphEntity) => text(entity.description) || text(entity.impact) || '';
const stableHash = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(36);
};
const stableId = (prefix: string, key: string) => `${prefix}-${stableHash(key)}`;
const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};
const levelFrom = (value: unknown): 1 | 2 | 3 | 4 | 5 => {
  const normalized = String(value ?? '').toLowerCase();
  return ({ low: 2, medium: 3, high: 4, critical: 5 } as Record<string, 1 | 2 | 3 | 4 | 5>)[normalized] ?? 3;
};
const refKey = (ref: ImprovementSourceRef) => `${ref.kind}|${ref.sourceId}|${ref.label}`;
const mergeRefs = (...groups: ImprovementSourceRef[][]) => {
  const map = new Map<string, ImprovementSourceRef>();
  for (const ref of groups.flat()) map.set(refKey(ref), ref);
  return [...map.values()];
};

export const IMPROVEMENT_SOURCE_LABELS: Record<ImprovementSourceKind, string> = {
  research: 'Pesquisa', validated_problem: 'Problema validado', journey: 'Journey', channel: 'Canais',
  prototype: 'Protótipos', current_future: 'Atual × Futuro', blueprint: 'Blueprint',
};
export const IMPROVEMENT_PROBLEM_STATUS_LABELS: Record<ImprovementProblemStatus, string> = {
  new: 'Novo', triaged: 'Triado', accepted: 'Aceito', resolved: 'Resolvido', dismissed: 'Descartado',
};
export const IMPROVEMENT_OPPORTUNITY_STATUS_LABELS: Record<ImprovementOpportunityStatus, string> = {
  candidate: 'Candidata', selected: 'Selecionada', planned: 'Planejada', discarded: 'Descartada',
};
export const IMPROVEMENT_PRIORITY_LABELS: Record<ImprovementPriorityBand, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
};

export function improvementPriorityScore(problem: Pick<ServiceImprovementProblem, 'impact' | 'frequency' | 'effort' | 'risk' | 'urgency'>): number {
  const value = (problem.impact * 0.30) + (problem.frequency * 0.20) + (problem.risk * 0.15) + (problem.urgency * 0.25) + ((6 - problem.effort) * 0.10);
  return Math.round((value / 5) * 100);
}
export function improvementPriorityBand(score: number): ImprovementPriorityBand {
  if (score >= 80) return 'critical';
  if (score >= 65) return 'high';
  if (score >= 45) return 'medium';
  return 'low';
}

export function emptyImprovementBacklogState(now = nowIso()): ServiceImprovementBacklogState {
  return { version: 1, problems: {}, opportunities: {}, updatedAt: now };
}
export function normalizeImprovementBacklogState(graph: ServiceGraph, now = nowIso()): ServiceImprovementBacklogState {
  const state = graph.service.improvementBacklog;
  return { version: 1, problems: { ...(state?.problems ?? {}) }, opportunities: { ...(state?.opportunities ?? {}) }, updatedAt: state?.updatedAt ?? now };
}

type ProblemCandidate = Omit<ServiceImprovementProblem, 'id' | 'serviceId' | 'status' | 'owner' | 'note' | 'createdAt' | 'updatedAt' | 'lastSeenAt' | 'sourceActive'>;

function blueprintRefsForProblem(graph: ServiceGraph, problemId: Id): ImprovementSourceRef[] {
  return Object.values(graph.views.whiteboards ?? {}).filter((board) => board.viewKind === 'blueprint' && board.designContext?.problemIds?.includes(problemId))
    .map((board) => ({ kind: 'blueprint' as const, sourceId: board.id, label: board.name || 'Service Blueprint', detail: 'Problema usado no contexto do Blueprint' }));
}

export function discoverImprovementProblems(graph: ServiceGraph): ProblemCandidate[] {
  const candidates: ProblemCandidate[] = [];
  const push = (candidate: ProblemCandidate) => {
    const existing = candidates.find((item) => item.sourceKey === candidate.sourceKey);
    if (!existing) { candidates.push(candidate); return; }
    existing.sourceRefs = mergeRefs(existing.sourceRefs, candidate.sourceRefs);
    existing.evidenceIds = [...new Set([...existing.evidenceIds, ...candidate.evidenceIds])];
  };

  for (const problem of Object.values(graph.entities?.problem ?? {})) {
    if (problem.serviceId && problem.serviceId !== graph.service.id) continue;
    const severity = levelFrom(problem.severity); const urgency = levelFrom(problem.priority);
    push({ sourceKey: `validated-problem:${problem.id}`, sourceRefs: [
      { kind: 'validated_problem', sourceId: problem.id, label: titleOf(problem), detail: 'Problema canônico validado por evidência' },
      ...blueprintRefsForProblem(graph, problem.id),
    ], title: titleOf(problem), description: descriptionOf(problem), impact: severity, frequency: 3, effort: 3, risk: severity, urgency, evidenceIds: ids(problem.evidenceIds) });
  }

  for (const hypothesis of Object.values(graph.entities?.problemHypothesis ?? {})) {
    if (hypothesis.serviceId && hypothesis.serviceId !== graph.service.id) continue;
    if (text(hypothesis.validatedProblemId)) continue;
    push({ sourceKey: `research-hypothesis:${hypothesis.id}`, sourceRefs: [{ kind: 'research', sourceId: hypothesis.id, label: titleOf(hypothesis), detail: 'Hipótese de problema ainda não convertida em problema validado' }], title: titleOf(hypothesis), description: descriptionOf(hypothesis), impact: 3, frequency: 3, effort: 3, risk: 3, urgency: 3, evidenceIds: ids(hypothesis.evidenceIds) });
  }

  for (const problem of Object.values(graph.problems ?? {})) {
    const stage = graph.stages[problem.stageId]; const journey = stage ? graph.journeys[stage.journeyId] : undefined;
    push({ sourceKey: `journey-problem:${problem.id}`, sourceRefs: [{ kind: 'journey', sourceId: problem.id, label: journey ? `${journey.name} · ${stage?.title || 'Etapa'}` : stage?.title || 'Journey', detail: problem.description }], title: problem.description || 'Problema na Journey', description: problem.description, impact: 3, frequency: 3, effort: 3, risk: 3, urgency: 3, evidenceIds: ids((problem as unknown as Record<string, unknown>).evidenceIds) });
  }

  for (const handoff of Object.values(graph.channelHandoffs ?? {})) {
    const failed = Object.entries(handoff.ratings ?? {}).filter(([, rating]) => rating === 'fail').map(([dimension]) => dimension);
    if (!failed.length) continue;
    const from = graph.channels?.[handoff.fromChannelId]?.name ?? handoff.fromChannelId;
    const to = graph.channels?.[handoff.toChannelId]?.name ?? handoff.toChannelId;
    push({ sourceKey: `channel-handoff:${handoff.id}`, sourceRefs: [{ kind: 'channel', sourceId: handoff.id, label: `${from} → ${to}`, detail: `${failed.length} dimensão${failed.length === 1 ? '' : 'ões'} de continuidade falharam` }], title: `Quebra de continuidade: ${from} → ${to}`, description: `Falhas em: ${failed.join(', ')}${handoff.note ? `. ${handoff.note}` : ''}`, impact: 3, frequency: 3, effort: 3, risk: bounded(2 + failed.length), urgency: 3, evidenceIds: [] });
  }
  for (const touchpoint of Object.values(graph.touchpoints ?? {})) {
    if (touchpoint.channelId && graph.channels?.[touchpoint.channelId]) continue;
    push({ sourceKey: `channel-unmapped:${touchpoint.id}`, sourceRefs: [{ kind: 'channel', sourceId: touchpoint.id, label: touchpoint.name, detail: 'Touchpoint sem canal canônico' }], title: `Touchpoint sem canal: ${touchpoint.name}`, description: 'O touchpoint ainda não possui um canal canônico válido para análise omnichannel.', impact: 3, frequency: 3, effort: 2, risk: 3, urgency: 3, evidenceIds: [] });
  }

  for (const experiment of Object.values(graph.service.prototypeLab?.experiments ?? {})) {
    if (experiment.status !== 'completed' || !['failed','inconclusive'].includes(experiment.outcome)) continue;
    const failedCriteria = experiment.criteria.filter((criterion) => criterion.result === 'fail').length;
    push({ sourceKey: `prototype:${experiment.id}`, sourceRefs: [{ kind: 'prototype', sourceId: experiment.id, label: experiment.title, detail: experiment.outcome === 'failed' ? 'Experimento falhou' : 'Experimento inconclusivo' }], title: experiment.outcome === 'failed' ? `Teste falhou: ${experiment.title}` : `Teste inconclusivo: ${experiment.title}`, description: experiment.hypothesis, impact: 3, frequency: 3, effort: 3, risk: experiment.outcome === 'failed' ? 4 : 3, urgency: failedCriteria > 0 ? 4 : 3, evidenceIds: [] });
  }

  const cf = normalizeCurrentFutureState(graph);
  for (const gap of deriveCurrentFutureGaps(cf)) {
    if (['resolved','dismissed'].includes(gap.metadata.status)) continue;
    push({ sourceKey: `current-future:${gap.key}`, sourceRefs: [{ kind: 'current_future', sourceId: gap.key, label: `${gap.targetLabel} · ${gap.field}`, detail: `${gap.currentValue || '—'} → ${gap.futureValue || '—'}` }], title: `Gap ${gap.targetLabel}: ${gap.field}`, description: `Estado atual: ${gap.currentValue || '—'}. Estado futuro: ${gap.futureValue || '—'}.`, impact: 3, frequency: 3, effort: 3, risk: 3, urgency: gap.metadata.status === 'in_progress' ? 4 : 3, evidenceIds: [] });
  }

  for (const board of Object.values(graph.views.whiteboards ?? {}).filter((item) => item.viewKind === 'blueprint')) {
    if (board.journeyId && graph.journeys[board.journeyId]) continue;
    push({ sourceKey: `blueprint-orphan:${board.id}`, sourceRefs: [{ kind: 'blueprint', sourceId: board.id, label: board.name || 'Service Blueprint', detail: 'Blueprint sem Journey vinculada' }], title: `Blueprint sem Journey: ${board.name || 'Service Blueprint'}`, description: 'O Blueprint não está ligado a uma Journey canônica, reduzindo a rastreabilidade entre experiência e operação.', impact: 3, frequency: 3, effort: 2, risk: 3, urgency: 3, evidenceIds: [] });
  }
  return candidates;
}

function legacyOpportunities(graph: ServiceGraph, problemBySourceId: Map<string, Id>, now: string): ServiceImprovementOpportunity[] {
  const values: Array<{ id: Id; title: string; owner?: string; problemIds?: Id[] }> = [
    ...Object.values(graph.opportunities ?? {}).map((item) => ({ id: item.id, title: item.title, owner: item.owner, problemIds: item.problemIds })),
    ...Object.values(graph.entities?.opportunity ?? {}).map((item) => ({ id: item.id, title: titleOf(item), owner: text(item.owner) || undefined, problemIds: ids(item.problemIds) })),
  ];
  return values.filter((item, index) => values.findIndex((other) => other.id === item.id) === index).map((item) => ({
    id: stableId('improvement-opportunity', `legacy-opportunity:${item.id}`), serviceId: graph.service.id, sourceKey: `legacy-opportunity:${item.id}`,
    title: item.title || 'Oportunidade', problemIds: (item.problemIds ?? []).map((id) => problemBySourceId.get(id)).filter((id): id is Id => Boolean(id)),
    status: 'candidate', owner: item.owner, createdAt: now, updatedAt: now,
  }));
}

export function syncImprovementBacklog(graph: ServiceGraph, now = nowIso()): { graph: ServiceGraph; added: number; refreshed: number; deactivated: number; importedOpportunities: number } {
  const state = normalizeImprovementBacklogState(graph, now); const candidates = discoverImprovementProblems(graph);
  const bySourceKey = new Map(Object.values(state.problems).map((item) => [item.sourceKey, item]));
  const seen = new Set<string>(); let added = 0; let refreshed = 0;
  for (const candidate of candidates) {
    seen.add(candidate.sourceKey); const existing = bySourceKey.get(candidate.sourceKey);
    if (existing) {
      state.problems[existing.id] = { ...existing, sourceRefs: mergeRefs(candidate.sourceRefs), sourceActive: true, evidenceIds: [...new Set([...existing.evidenceIds, ...candidate.evidenceIds])], lastSeenAt: now, updatedAt: now };
      refreshed += 1;
    } else {
      const id = stableId('improvement-problem', candidate.sourceKey);
      state.problems[id] = { id, serviceId: graph.service.id, ...candidate, sourceActive: true, status: 'new', createdAt: now, updatedAt: now, lastSeenAt: now };
      added += 1;
    }
  }
  let deactivated = 0;
  for (const [id, problem] of Object.entries(state.problems)) {
    if (!seen.has(problem.sourceKey) && problem.sourceActive) { state.problems[id] = { ...problem, sourceActive: false, updatedAt: now }; deactivated += 1; }
  }
  const problemBySourceId = new Map<string, Id>();
  for (const problem of Object.values(state.problems)) for (const ref of problem.sourceRefs) problemBySourceId.set(ref.sourceId, problem.id);
  let importedOpportunities = 0;
  for (const candidate of legacyOpportunities(graph, problemBySourceId, now)) {
    const existing = Object.values(state.opportunities).find((item) => item.sourceKey === candidate.sourceKey);
    if (existing) continue;
    state.opportunities[candidate.id] = candidate; importedOpportunities += 1;
  }
  state.updatedAt = now;
  return { graph: { ...graph, service: { ...graph.service, improvementBacklog: state, updatedAt: now } }, added, refreshed, deactivated, importedOpportunities };
}

export function updateImprovementProblem(graph: ServiceGraph, problemId: Id, patch: Partial<Pick<ServiceImprovementProblem, 'title' | 'description' | 'impact' | 'frequency' | 'effort' | 'risk' | 'urgency' | 'status' | 'owner' | 'note'>>, now = nowIso()): ServiceGraph {
  const state = normalizeImprovementBacklogState(graph, now); const current = state.problems[problemId]; if (!current) return graph;
  const next: ServiceImprovementProblem = { ...current, ...patch, impact: bounded(patch.impact ?? current.impact), frequency: bounded(patch.frequency ?? current.frequency), effort: bounded(patch.effort ?? current.effort), risk: bounded(patch.risk ?? current.risk), urgency: bounded(patch.urgency ?? current.urgency), updatedAt: now };
  state.problems[problemId] = next; state.updatedAt = now;
  return { ...graph, service: { ...graph.service, improvementBacklog: state, updatedAt: now } };
}

export function createImprovementOpportunity(graph: ServiceGraph, input: { title: string; problemIds: Id[]; owner?: string; note?: string; status?: ImprovementOpportunityStatus; id?: Id }, now = nowIso()): { graph: ServiceGraph; opportunityId: Id | null } {
  const state = normalizeImprovementBacklogState(graph, now); const validProblems = [...new Set(input.problemIds)].filter((id) => Boolean(state.problems[id]));
  if (!input.title.trim() || !validProblems.length) return { graph, opportunityId: null };
  const id = input.id ?? makeId('improvement-opportunity');
  state.opportunities[id] = { id, serviceId: graph.service.id, title: input.title.trim(), problemIds: validProblems, status: input.status ?? 'candidate', owner: input.owner?.trim() || undefined, note: input.note?.trim() || undefined, createdAt: now, updatedAt: now };
  state.updatedAt = now;
  return { graph: { ...graph, service: { ...graph.service, improvementBacklog: state, updatedAt: now } }, opportunityId: id };
}

export function updateImprovementOpportunity(graph: ServiceGraph, opportunityId: Id, patch: Partial<Pick<ServiceImprovementOpportunity, 'title' | 'problemIds' | 'status' | 'owner' | 'note'>>, now = nowIso()): ServiceGraph {
  const state = normalizeImprovementBacklogState(graph, now); const current = state.opportunities[opportunityId]; if (!current) return graph;
  const problemIds = patch.problemIds ? [...new Set(patch.problemIds)].filter((id) => Boolean(state.problems[id])) : current.problemIds;
  state.opportunities[opportunityId] = { ...current, ...patch, problemIds, title: patch.title?.trim() || current.title, owner: patch.owner?.trim() || undefined, note: patch.note?.trim() || undefined, updatedAt: now };
  state.updatedAt = now; return { ...graph, service: { ...graph.service, improvementBacklog: state, updatedAt: now } };
}

export function buildImprovementBacklogReport(graph: ServiceGraph) {
  const state = normalizeImprovementBacklogState(graph); const problems = Object.values(state.problems).map((problem) => {
    const score = improvementPriorityScore(problem); return { ...problem, score, band: improvementPriorityBand(score) };
  }).sort((a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt));
  const activeProblems = problems.filter((item) => item.sourceActive && !['resolved','dismissed'].includes(item.status));
  const opportunities = Object.values(state.opportunities).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const sourceCounts = Object.fromEntries((Object.keys(IMPROVEMENT_SOURCE_LABELS) as ImprovementSourceKind[]).map((kind) => [kind, activeProblems.filter((item) => item.sourceRefs.some((ref) => ref.kind === kind)).length])) as Record<ImprovementSourceKind, number>;
  const discovered = discoverImprovementProblems(graph); const persistedKeys = new Set(Object.values(state.problems).map((item) => item.sourceKey));
  return { state, problems, activeProblems, opportunities, sourceCounts, pendingDiscovery: discovered.filter((item) => !persistedKeys.has(item.sourceKey)).length,
    counts: { problems: problems.length, active: activeProblems.length, critical: activeProblems.filter((item) => item.band === 'critical').length, high: activeProblems.filter((item) => item.band === 'high').length, triaged: activeProblems.filter((item) => item.status !== 'new').length, opportunities: opportunities.length, selectedOpportunities: opportunities.filter((item) => ['selected','planned'].includes(item.status)).length },
    backlogReady: activeProblems.length > 0,
  };
}

import type {
  Id, ServiceGovernanceApprovalStatus, ServiceGovernanceCadence, ServiceGovernanceRecord, ServiceGovernanceReview,
  ServiceGovernanceReviewOutcome, ServiceGovernanceState, ServiceGovernanceTargetKind, ServiceGraph,
} from '../domain/model';

const nowIso = () => new Date().toISOString();
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const uniqueText = (values: string[]) => [...new Set(values.map(text).filter(Boolean))];
const makeId = (prefix: string) => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const governanceId = (kind: ServiceGovernanceTargetKind, targetId: Id) => `governance:${kind}:${targetId}`;

export const SERVICE_GOVERNANCE_TARGET_LABELS: Record<ServiceGovernanceTargetKind, string> = {
  journey: 'Journey', blueprint: 'Blueprint', channel: 'Canal', metric: 'Métrica', initiative: 'Iniciativa',
};
export const SERVICE_GOVERNANCE_CADENCE_LABELS: Record<ServiceGovernanceCadence, string> = {
  monthly: 'Mensal', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual', custom: 'Personalizada',
};
export const SERVICE_GOVERNANCE_APPROVAL_LABELS: Record<ServiceGovernanceApprovalStatus, string> = {
  not_required: 'Não exige aprovação', pending: 'Aguardando aprovação', approved: 'Aprovado', rejected: 'Rejeitado',
};
export const SERVICE_GOVERNANCE_REVIEW_LABELS: Record<ServiceGovernanceReviewOutcome, string> = {
  healthy: 'Saudável', attention: 'Atenção', action_required: 'Ação necessária',
};

export function emptyServiceGovernanceState(now = nowIso()): ServiceGovernanceState {
  return { version: 1, records: {}, reviews: {}, updatedAt: now };
}
export function normalizeServiceGovernanceState(graph: ServiceGraph, now = nowIso()): ServiceGovernanceState {
  const state = graph.service.governance;
  return { version: 1, records: { ...(state?.records ?? {}) }, reviews: { ...(state?.reviews ?? {}) }, updatedAt: state?.updatedAt ?? now };
}

export function listGovernanceTargets(graph: ServiceGraph): Array<{ kind: ServiceGovernanceTargetKind; id: Id; label: string; owner?: string }> {
  const rows: Array<{ kind: ServiceGovernanceTargetKind; id: Id; label: string; owner?: string }> = [];
  for (const item of Object.values(graph.journeys)) rows.push({ kind: 'journey', id: item.id, label: item.name || item.id, owner: text(item.owner) || undefined });
  for (const item of Object.values(graph.views.whiteboards ?? {}).filter((row) => row.viewKind === 'blueprint')) rows.push({ kind: 'blueprint', id: item.id, label: item.name || 'Service Blueprint' });
  for (const item of Object.values(graph.channels ?? {})) rows.push({ kind: 'channel', id: item.id, label: item.name || item.id, owner: text(item.owner) || undefined });
  for (const item of Object.values(graph.entities?.metric ?? {})) rows.push({ kind: 'metric', id: item.id, label: text(item.title) || text(item.name) || item.id, owner: text(item.owner) || undefined });
  for (const item of Object.values(graph.service.improvementPortfolio?.initiatives ?? {})) rows.push({ kind: 'initiative', id: item.id, label: item.title || item.id, owner: text(item.owner) || undefined });
  return rows;
}

function defaultCadence(kind: ServiceGovernanceTargetKind): ServiceGovernanceCadence {
  return kind === 'initiative' ? 'monthly' : kind === 'metric' ? 'monthly' : 'quarterly';
}
function addDays(iso: string, days: number) { const d = new Date(iso); d.setUTCDate(d.getUTCDate() + days); return d.toISOString(); }
function cadenceDays(record: Pick<ServiceGovernanceRecord,'cadence'|'customIntervalDays'>) {
  return record.cadence === 'monthly' ? 30 : record.cadence === 'quarterly' ? 90 : record.cadence === 'semiannual' ? 182 : record.cadence === 'annual' ? 365 : Math.max(1, record.customIntervalDays || 30);
}
export function nextReviewAt(record: Pick<ServiceGovernanceRecord,'cadence'|'customIntervalDays'>, baseIso: string) { return addDays(baseIso, cadenceDays(record)); }

export function syncServiceGovernance(graph: ServiceGraph, now = nowIso()): ServiceGraph {
  const state = normalizeServiceGovernanceState(graph, now); const targets = listGovernanceTargets(graph); const activeIds = new Set<string>();
  for (const target of targets) {
    const id = governanceId(target.kind, target.id); activeIds.add(id); const current = state.records[id];
    if (current) state.records[id] = { ...current, targetLabel: target.label, active: true, updatedAt: current.updatedAt };
    else state.records[id] = { id, serviceId: graph.service.id, targetKind: target.kind, targetId: target.id, targetLabel: target.label, active: true,
      owner: target.owner, reviewers: [], cadence: defaultCadence(target.kind), approvalRequired: target.kind === 'blueprint' || target.kind === 'journey', approvalStatus: target.kind === 'blueprint' || target.kind === 'journey' ? 'pending' : 'not_required', createdAt: now, updatedAt: now };
  }
  for (const [id, current] of Object.entries(state.records)) if (!activeIds.has(id) && current.active) state.records[id] = { ...current, active: false, updatedAt: now };
  state.updatedAt = now; return { ...graph, service: { ...graph.service, governance: state, updatedAt: now } };
}

export function updateGovernanceRecord(graph: ServiceGraph, recordId: Id, patch: Partial<Pick<ServiceGovernanceRecord,
  'owner'|'accountable'|'reviewers'|'cadence'|'customIntervalDays'|'nextReviewAt'|'approvalRequired'|'approver'|'note'>>, now = nowIso()): ServiceGraph {
  const state = normalizeServiceGovernanceState(graph, now); const current = state.records[recordId]; if (!current) return graph;
  const next: ServiceGovernanceRecord = { ...current, updatedAt: now };
  if (patch.owner !== undefined) next.owner = text(patch.owner) || undefined;
  if (patch.accountable !== undefined) next.accountable = text(patch.accountable) || undefined;
  if (patch.reviewers !== undefined) next.reviewers = uniqueText(patch.reviewers);
  if (patch.cadence !== undefined) next.cadence = patch.cadence;
  if (patch.customIntervalDays !== undefined) next.customIntervalDays = Math.max(1, Math.round(Number(patch.customIntervalDays) || 30));
  if (patch.nextReviewAt !== undefined) next.nextReviewAt = text(patch.nextReviewAt) || undefined;
  if (patch.approvalRequired !== undefined) { next.approvalRequired = patch.approvalRequired; next.approvalStatus = patch.approvalRequired ? (next.approvalStatus === 'not_required' ? 'pending' : next.approvalStatus) : 'not_required'; if (!patch.approvalRequired) { next.approver=undefined; next.approvedAt=undefined; next.approvalNote=undefined; } }
  if (patch.approver !== undefined) next.approver = text(patch.approver) || undefined;
  if (patch.note !== undefined) next.note = text(patch.note) || undefined;
  state.records[recordId] = next; state.updatedAt = now; return { ...graph, service: { ...graph.service, governance: state, updatedAt: now } };
}

export function requestGovernanceApproval(graph: ServiceGraph, recordId: Id, approver = '', now = nowIso()): ServiceGraph {
  const state = normalizeServiceGovernanceState(graph, now); const current = state.records[recordId]; if (!current || !current.approvalRequired) return graph;
  state.records[recordId] = { ...current, approver: text(approver) || current.approver, approvalStatus: 'pending', approvedAt: undefined, approvalNote: undefined, updatedAt: now }; state.updatedAt=now;
  return { ...graph, service: { ...graph.service, governance: state, updatedAt: now } };
}
export function decideGovernanceApproval(graph: ServiceGraph, recordId: Id, decision: 'approved'|'rejected', decidedBy = '', note = '', now = nowIso()): ServiceGraph {
  const state = normalizeServiceGovernanceState(graph, now); const current = state.records[recordId]; if (!current || !current.approvalRequired) return graph;
  state.records[recordId] = { ...current, approver: text(decidedBy) || current.approver, approvalStatus: decision, approvedAt: decision === 'approved' ? now : undefined, approvalNote: text(note) || undefined, updatedAt: now }; state.updatedAt=now;
  return { ...graph, service: { ...graph.service, governance: state, updatedAt: now } };
}

export function recordGovernanceReview(graph: ServiceGraph, recordId: Id, input: { reviewer: string; outcome: ServiceGovernanceReviewOutcome; note?: string; reviewedAt?: string }, now = nowIso()) {
  const state = normalizeServiceGovernanceState(graph, now); const current = state.records[recordId]; if (!current) return { graph, reviewId: null as Id|null, created: false, reason: 'record_not_found' };
  const reviewer = text(input.reviewer); if (!reviewer) return { graph, reviewId: null as Id|null, created: false, reason: 'reviewer_required' };
  const reviewedAt = text(input.reviewedAt) || now; const id = makeId('governance-review'); const nextDue = nextReviewAt(current, reviewedAt);
  const review: ServiceGovernanceReview = { id, governanceId: recordId, reviewedAt, reviewer, outcome: input.outcome, note: text(input.note) || undefined, nextReviewAt: nextDue, createdAt: now };
  state.reviews[id] = review; state.records[recordId] = { ...current, lastReviewedAt: reviewedAt, nextReviewAt: nextDue, reviewers: uniqueText([...current.reviewers, reviewer]), updatedAt: now }; state.updatedAt=now;
  return { graph: { ...graph, service: { ...graph.service, governance: state, updatedAt: now } }, reviewId: id, created: true };
}

export function buildServiceGovernanceReport(graph: ServiceGraph, now = nowIso()) {
  const synced = syncServiceGovernance(graph, now); const state = normalizeServiceGovernanceState(synced, now); const active = Object.values(state.records).filter((row) => row.active);
  const today = new Date(now).getTime(); const rows = active.map((record) => {
    const dueAt = record.nextReviewAt ? new Date(record.nextReviewAt).getTime() : NaN; const overdue = Number.isFinite(dueAt) && dueAt < today;
    const reviewHistory = Object.values(state.reviews).filter((review) => review.governanceId === record.id).sort((a,b)=>b.reviewedAt.localeCompare(a.reviewedAt));
    const latestReview = reviewHistory[0]; const ownershipReady = Boolean(text(record.owner) && text(record.accountable || record.owner));
    const approvalIssue = record.approvalRequired && record.approvalStatus !== 'approved';
    const health = !ownershipReady || overdue || approvalIssue || latestReview?.outcome === 'action_required' ? 'action_required' : latestReview?.outcome === 'attention' ? 'attention' : 'healthy';
    return { ...record, overdue, ownershipReady, approvalIssue, health, reviewHistory, latestReview };
  });
  const owned = rows.filter((row) => Boolean(text(row.owner))).length; const accountable = rows.filter((row) => Boolean(text(row.accountable || row.owner))).length;
  const reviewed = rows.filter((row) => Boolean(row.lastReviewedAt)).length; const overdue = rows.filter((row) => row.overdue).length; const pendingApproval = rows.filter((row) => row.approvalRequired && row.approvalStatus === 'pending').length;
  const coverage = rows.length ? Math.round((owned / rows.length) * 100) : 100; const reviewCoverage = rows.length ? Math.round((reviewed / rows.length) * 100) : 100;
  const governanceScore = rows.length ? Math.round((coverage * .45) + (reviewCoverage * .25) + ((1-overdue/rows.length)*100*.2) + ((1-pendingApproval/rows.length)*100*.1)) : 100;
  const byKind = (Object.keys(SERVICE_GOVERNANCE_TARGET_LABELS) as ServiceGovernanceTargetKind[]).map((kind) => { const list=rows.filter((row)=>row.targetKind===kind); const withOwner=list.filter((row)=>Boolean(text(row.owner))).length; return { kind, label:SERVICE_GOVERNANCE_TARGET_LABELS[kind], total:list.length, owned:withOwner, coverage:list.length?Math.round(withOwner/list.length*100):100 }; });
  return { graph: synced, records: rows.sort((a,b)=>Number(b.overdue)-Number(a.overdue)||a.targetLabel.localeCompare(b.targetLabel)), byKind, counts: { total: rows.length, owned, accountable, reviewed, overdue, pendingApproval, actionRequired: rows.filter((r)=>r.health==='action_required').length }, coverage, reviewCoverage, governanceScore };
}

import type {
  Id, ServiceGraph, ServiceOperationBinding, ServiceOperationBindingStatus, ServiceOperationDirection,
  ServiceOperationKind, ServiceOperationProvider, ServiceOperationRun, ServiceOperationRunStatus,
  ServiceOperationSyncMode, ServiceOperationTargetKind, ServiceOperationsBridgeState,
} from '../domain/model';

const nowIso = () => new Date().toISOString();
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const makeId = (prefix: string) => typeof crypto !== 'undefined' && 'randomUUID' in crypto ? `${prefix}-${crypto.randomUUID()}` : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const SERVICE_OPERATION_TARGET_LABELS: Record<ServiceOperationTargetKind, string> = {
  touchpoint: 'Touchpoint', journey: 'Journey', channel: 'Canal', blueprint: 'Blueprint', initiative: 'Iniciativa', metric: 'Métrica',
};
export const SERVICE_OPERATION_KIND_LABELS: Record<ServiceOperationKind, string> = {
  activity: 'Atividade', workflow: 'Fluxo operacional', communication: 'Comunicação', process: 'Processo', execution: 'Execução', data_source: 'Fonte de dados',
};
export const SERVICE_OPERATION_PROVIDER_LABELS: Record<ServiceOperationProvider, string> = {
  internal: 'Blue Ocean', realtalent_crm: 'RealTalent CRM', webhook: 'Webhook', manual: 'Operação manual', other: 'Outro sistema',
};
export const SERVICE_OPERATION_DIRECTION_LABELS: Record<ServiceOperationDirection, string> = {
  design_to_ops: 'Design → Operação', ops_to_design: 'Operação → Design', bidirectional: 'Bidirecional',
};
export const SERVICE_OPERATION_SYNC_LABELS: Record<ServiceOperationSyncMode, string> = {
  reference: 'Somente referência', manual: 'Manual', scheduled: 'Agendada', event: 'Por evento',
};
export const SERVICE_OPERATION_STATUS_LABELS: Record<ServiceOperationBindingStatus, string> = {
  draft: 'Rascunho', active: 'Ativa', paused: 'Pausada', error: 'Com erro', archived: 'Arquivada',
};
export const SERVICE_OPERATION_RUN_LABELS: Record<ServiceOperationRunStatus, string> = {
  simulated: 'Simulada', success: 'Sucesso', partial: 'Parcial', failed: 'Falhou',
};

export function defaultOperationKind(kind: ServiceOperationTargetKind): ServiceOperationKind {
  return kind === 'touchpoint' ? 'activity' : kind === 'journey' ? 'workflow' : kind === 'channel' ? 'communication' : kind === 'blueprint' ? 'process' : kind === 'initiative' ? 'execution' : 'data_source';
}
export function emptyServiceOperationsBridgeState(now = nowIso()): ServiceOperationsBridgeState {
  return { version: 1, bindings: {}, runs: {}, updatedAt: now };
}
export function normalizeServiceOperationsBridgeState(graph: ServiceGraph, now = nowIso()): ServiceOperationsBridgeState {
  const state = graph.service.operationsBridge;
  return { version: 1, bindings: { ...(state?.bindings ?? {}) }, runs: { ...(state?.runs ?? {}) }, updatedAt: state?.updatedAt ?? now };
}

export type ServiceOperationTarget = { kind: ServiceOperationTargetKind; id: Id; label: string; owner?: string };
export function listServiceOperationTargets(graph: ServiceGraph, kind?: ServiceOperationTargetKind): ServiceOperationTarget[] {
  const rows: ServiceOperationTarget[] = [];
  for (const item of Object.values(graph.touchpoints ?? {})) rows.push({ kind: 'touchpoint', id: item.id, label: item.name || item.id });
  for (const item of Object.values(graph.journeys ?? {})) rows.push({ kind: 'journey', id: item.id, label: item.name || item.id, owner: text(item.owner) || undefined });
  for (const item of Object.values(graph.channels ?? {})) rows.push({ kind: 'channel', id: item.id, label: item.name || item.id, owner: text(item.owner) || undefined });
  for (const item of Object.values(graph.views?.whiteboards ?? {}).filter((row) => row.viewKind === 'blueprint')) rows.push({ kind: 'blueprint', id: item.id, label: item.name || 'Service Blueprint' });
  for (const item of Object.values(graph.service.improvementPortfolio?.initiatives ?? {})) rows.push({ kind: 'initiative', id: item.id, label: item.title || item.id, owner: text(item.owner) || undefined });
  for (const item of Object.values(graph.entities?.metric ?? {})) rows.push({ kind: 'metric', id: item.id, label: text(item.title) || text(item.name) || item.id, owner: text(item.owner) || undefined });
  return rows.filter((item) => !kind || item.kind === kind).sort((a,b) => a.label.localeCompare(b.label, 'pt-BR'));
}
function findTarget(graph: ServiceGraph, kind: ServiceOperationTargetKind, id: Id) { return listServiceOperationTargets(graph, kind).find((item) => item.id === id); }
function externalRefRequired(provider: ServiceOperationProvider) { return provider === 'realtalent_crm' || provider === 'webhook' || provider === 'other'; }

export function createServiceOperationBinding(graph: ServiceGraph, input: {
  targetKind: ServiceOperationTargetKind; targetId: Id; operationKind?: ServiceOperationKind; provider?: ServiceOperationProvider;
  externalRef?: string; direction?: ServiceOperationDirection; syncMode?: ServiceOperationSyncMode; status?: ServiceOperationBindingStatus; owner?: string; note?: string;
}, now = nowIso()): { graph: ServiceGraph; bindingId: Id | null; created: boolean; reason?: string } {
  const target = findTarget(graph, input.targetKind, input.targetId); if (!target) return { graph, bindingId: null, created: false, reason: 'target_not_found' };
  const provider = input.provider ?? 'manual'; const operationKind = input.operationKind ?? defaultOperationKind(input.targetKind); const externalRef = text(input.externalRef) || undefined;
  const status = input.status ?? 'draft'; if (status === 'active' && externalRefRequired(provider) && !externalRef) return { graph, bindingId: null, created: false, reason: 'external_ref_required' };
  const state = normalizeServiceOperationsBridgeState(graph, now);
  const duplicate = Object.values(state.bindings).find((item) => item.status !== 'archived' && item.targetKind === input.targetKind && item.targetId === input.targetId && item.operationKind === operationKind && item.provider === provider && (item.externalRef || '') === (externalRef || ''));
  if (duplicate) return { graph, bindingId: duplicate.id, created: false, reason: 'duplicate_binding' };
  const id = makeId('ops-binding');
  state.bindings[id] = { id, serviceId: graph.service.id, targetKind: input.targetKind, targetId: input.targetId, targetLabel: target.label, targetActive: true, operationKind, provider, externalRef,
    direction: input.direction ?? 'design_to_ops', syncMode: input.syncMode ?? 'reference', status, owner: text(input.owner) || target.owner || undefined, note: text(input.note) || undefined, createdAt: now, updatedAt: now };
  state.updatedAt = now; return { graph: { ...graph, service: { ...graph.service, operationsBridge: state, updatedAt: now } }, bindingId: id, created: true };
}

export function updateServiceOperationBinding(graph: ServiceGraph, bindingId: Id, patch: Partial<Pick<ServiceOperationBinding,
  'operationKind'|'provider'|'externalRef'|'direction'|'syncMode'|'status'|'owner'|'note'>>, now = nowIso()): { graph: ServiceGraph; updated: boolean; reason?: string } {
  const state = normalizeServiceOperationsBridgeState(graph, now); const current = state.bindings[bindingId]; if (!current) return { graph, updated: false, reason: 'binding_not_found' };
  const next: ServiceOperationBinding = { ...current, updatedAt: now };
  if (patch.operationKind !== undefined) next.operationKind = patch.operationKind;
  if (patch.provider !== undefined) next.provider = patch.provider;
  if (patch.externalRef !== undefined) next.externalRef = text(patch.externalRef) || undefined;
  if (patch.direction !== undefined) next.direction = patch.direction;
  if (patch.syncMode !== undefined) next.syncMode = patch.syncMode;
  if (patch.owner !== undefined) next.owner = text(patch.owner) || undefined;
  if (patch.note !== undefined) next.note = text(patch.note) || undefined;
  if (patch.status !== undefined) {
    if (patch.status === 'active' && (!next.targetActive || (externalRefRequired(next.provider) && !next.externalRef))) return { graph, updated: false, reason: !next.targetActive ? 'target_inactive' : 'external_ref_required' };
    next.status = patch.status;
  }
  if (next.status === 'active' && externalRefRequired(next.provider) && !next.externalRef) next.status = 'draft';
  state.bindings[bindingId] = next; state.updatedAt = now;
  return { graph: { ...graph, service: { ...graph.service, operationsBridge: state, updatedAt: now } }, updated: true };
}

export function syncServiceOperationsBridge(graph: ServiceGraph, now = nowIso()): ServiceGraph {
  const state = normalizeServiceOperationsBridgeState(graph, now);
  for (const [id, binding] of Object.entries(state.bindings)) {
    const target = findTarget(graph, binding.targetKind, binding.targetId); const active = Boolean(target);
    const nextStatus = !active && binding.status === 'active' ? 'error' : binding.status;
    state.bindings[id] = { ...binding, targetLabel: target?.label ?? binding.targetLabel, targetActive: active, status: nextStatus, updatedAt: active === binding.targetActive && target?.label === binding.targetLabel && nextStatus === binding.status ? binding.updatedAt : now };
  }
  state.updatedAt = now; return { ...graph, service: { ...graph.service, operationsBridge: state, updatedAt: now } };
}

export function recordServiceOperationRun(graph: ServiceGraph, bindingId: Id, status: ServiceOperationRunStatus, message = '', now = nowIso()): { graph: ServiceGraph; runId: Id | null; created: boolean; reason?: string } {
  const state = normalizeServiceOperationsBridgeState(graph, now); const binding = state.bindings[bindingId]; if (!binding) return { graph, runId: null, created: false, reason: 'binding_not_found' };
  if (!binding.targetActive || binding.status === 'archived') return { graph, runId: null, created: false, reason: !binding.targetActive ? 'target_inactive' : 'binding_archived' };
  if (status !== 'simulated' && binding.status !== 'active') return { graph, runId: null, created: false, reason: 'binding_not_active' };
  const id = makeId('ops-run'); const run: ServiceOperationRun = { id, serviceId: graph.service.id, bindingId, startedAt: now, completedAt: now, status, message: text(message) || undefined, createdAt: now };
  state.runs[id] = run; state.bindings[bindingId] = { ...binding, lastRunAt: now, lastRunStatus: status, lastRunMessage: run.message, status: status === 'failed' ? 'error' : binding.status, updatedAt: now }; state.updatedAt = now;
  return { graph: { ...graph, service: { ...graph.service, operationsBridge: state, updatedAt: now } }, runId: id, created: true };
}

export function buildServiceOperationsBridgeReport(graph: ServiceGraph, now = nowIso()) {
  const synced = syncServiceOperationsBridge(graph, now); const state = normalizeServiceOperationsBridgeState(synced, now); const targets = listServiceOperationTargets(synced);
  const bindings = Object.values(state.bindings).map((binding) => ({ ...binding, runs: Object.values(state.runs).filter((run) => run.bindingId === binding.id).sort((a,b) => b.createdAt.localeCompare(a.createdAt)) })).sort((a,b) => a.targetLabel.localeCompare(b.targetLabel,'pt-BR'));
  const activeBindings = bindings.filter((item) => item.status === 'active' && item.targetActive); const connectedKeys = new Set(activeBindings.map((item) => `${item.targetKind}:${item.targetId}`));
  const targetKinds = Object.keys(SERVICE_OPERATION_TARGET_LABELS) as ServiceOperationTargetKind[];
  const coverage = targetKinds.map((kind) => { const rows = targets.filter((target) => target.kind === kind); const connected = rows.filter((target) => connectedKeys.has(`${kind}:${target.id}`)).length; return { kind, label: SERVICE_OPERATION_TARGET_LABELS[kind], total: rows.length, connected, percent: rows.length ? Math.round(connected / rows.length * 100) : 0 }; });
  const counts = {
    targets: targets.length, bindings: bindings.length, active: activeBindings.length, draft: bindings.filter((item) => item.status === 'draft').length,
    errors: bindings.filter((item) => item.status === 'error').length, missingTargets: bindings.filter((item) => !item.targetActive).length, runs: Object.keys(state.runs).length,
    realTalentConfigured: bindings.filter((item) => item.provider === 'realtalent_crm' && Boolean(item.externalRef)).length,
  };
  const coveragePercent = targets.length ? Math.round(connectedKeys.size / targets.length * 100) : 0;
  const healthyActive = activeBindings.filter((item) => item.lastRunStatus !== 'failed').length;
  const healthScore = bindings.length ? Math.max(0, Math.round(((healthyActive + bindings.filter((item) => item.status === 'draft' || item.status === 'paused').length * .5) / bindings.length) * 100) - counts.missingTargets * 10) : 0;
  return { state, targets, bindings, coverage, counts, coveragePercent, healthScore, operationsReady: counts.active > 0 && counts.errors === 0 && counts.missingTargets === 0 };
}

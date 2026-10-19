import type {
  GraphEntity, Id, ServiceGraph, ServiceMetricBinding, ServiceMetricDirection, ServiceMetricMeasurement,
  ServiceMetricRole, ServiceMetricTargetKind, ServiceOutcomesState,
} from '../domain/model';

const nowIso = () => new Date().toISOString();
const makeId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const finite = (value: unknown): number | undefined => {
  const n = Number(value); return Number.isFinite(n) ? n : undefined;
};
const unique = (values: Id[]) => [...new Set(values.filter(Boolean))];
const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export const SERVICE_METRIC_TARGET_LABELS: Record<ServiceMetricTargetKind, string> = {
  proposition: 'Proposição', journey: 'Journey', touchpoint: 'Touchpoint', handoff: 'Handoff', blueprint: 'Blueprint', initiative: 'Iniciativa',
};
export const SERVICE_METRIC_ROLE_LABELS: Record<ServiceMetricRole, string> = {
  value: 'Percepção de valor', outcome: 'Outcome', experience: 'Experiência', sla: 'SLA', operation: 'Operação', result: 'Resultado',
};
export const SERVICE_METRIC_DIRECTION_LABELS: Record<ServiceMetricDirection, string> = {
  at_least: 'Quanto maior, melhor', at_most: 'Quanto menor, melhor',
};
const DEFAULT_ROLE: Record<ServiceMetricTargetKind, ServiceMetricRole> = {
  proposition: 'value', journey: 'outcome', touchpoint: 'experience', handoff: 'sla', blueprint: 'operation', initiative: 'result',
};

export function emptyServiceOutcomesState(now = nowIso()): ServiceOutcomesState {
  return { version: 1, bindings: {}, measurements: {}, updatedAt: now };
}
export function normalizeServiceOutcomesState(graph: ServiceGraph, now = nowIso()): ServiceOutcomesState {
  const state = graph.service.outcomes;
  return { version: 1, bindings: { ...(state?.bindings ?? {}) }, measurements: { ...(state?.measurements ?? {}) }, updatedAt: state?.updatedAt ?? now };
}

export function listServiceMetricTargets(graph: ServiceGraph, kind: ServiceMetricTargetKind): Array<{ id: Id; label: string }> {
  if (kind === 'proposition') return graph.service.proposition ? [{ id: graph.service.id, label: graph.service.proposition.current?.promise || graph.service.name || 'Proposição do serviço' }] : [];
  if (kind === 'journey') return Object.values(graph.journeys).map((item) => ({ id: item.id, label: item.name || item.id }));
  if (kind === 'touchpoint') return Object.values(graph.touchpoints).map((item) => ({ id: item.id, label: item.name || item.id }));
  if (kind === 'handoff') return Object.values(graph.channelHandoffs ?? {}).map((item) => ({ id: item.id, label: `${graph.channels?.[item.fromChannelId]?.name || item.fromChannelId} → ${graph.channels?.[item.toChannelId]?.name || item.toChannelId}` }));
  if (kind === 'blueprint') return Object.values(graph.views.whiteboards ?? {}).filter((item) => item.viewKind === 'blueprint').map((item) => ({ id: item.id, label: item.name || 'Service Blueprint' }));
  return Object.values(graph.service.improvementPortfolio?.initiatives ?? {}).map((item) => ({ id: item.id, label: item.title }));
}
function targetExists(graph: ServiceGraph, kind: ServiceMetricTargetKind, targetId: Id) {
  return listServiceMetricTargets(graph, kind).some((item) => item.id === targetId);
}
export function serviceMetricTargetLabel(graph: ServiceGraph, binding: Pick<ServiceMetricBinding, 'targetKind'|'targetId'>) {
  return listServiceMetricTargets(graph, binding.targetKind).find((item) => item.id === binding.targetId)?.label || binding.targetId;
}

function cloneMetrics(graph: ServiceGraph) {
  return { ...(graph.entities?.metric ?? {}) } as Record<Id, GraphEntity>;
}
export function createServiceMetric(graph: ServiceGraph, input: {
  title: string; owner?: string; unit?: string; direction?: ServiceMetricDirection; baseline?: number; target?: number; current?: number; id?: Id;
}, now = nowIso()): { graph: ServiceGraph; metricId: Id | null; created: boolean; reason?: string } {
  const title = text(input.title); if (!title) return { graph, metricId: null, created: false, reason: 'title_required' };
  const metrics = cloneMetrics(graph); const id = input.id ?? makeId('metric');
  if (metrics[id]) return { graph, metricId: id, created: false, reason: 'already_exists' };
  const metric: GraphEntity = { id, type: 'metric', serviceId: graph.service.id, title, owner: text(input.owner) || undefined, unit: text(input.unit) || undefined,
    direction: input.direction ?? 'at_least', baseline: finite(input.baseline), target: finite(input.target), value: finite(input.current), createdAt: now, updatedAt: now };
  metrics[id] = metric;
  return { graph: { ...graph, entities: { ...graph.entities, metric: metrics }, service: { ...graph.service, updatedAt: now } }, metricId: id, created: true };
}
export function updateServiceMetric(graph: ServiceGraph, metricId: Id, patch: {
  title?: string; owner?: string; unit?: string; direction?: ServiceMetricDirection; baseline?: number | ''; target?: number | ''; current?: number | '';
}, now = nowIso()): ServiceGraph {
  const metrics = cloneMetrics(graph); const current = metrics[metricId]; if (!current) return graph;
  const next: GraphEntity = { ...current, updatedAt: now };
  if (patch.title !== undefined) next.title = text(patch.title) || current.title;
  if (patch.owner !== undefined) next.owner = text(patch.owner) || undefined;
  if (patch.unit !== undefined) next.unit = text(patch.unit) || undefined;
  if (patch.direction !== undefined) next.direction = patch.direction;
  if (patch.baseline !== undefined) next.baseline = patch.baseline === '' ? undefined : finite(patch.baseline);
  if (patch.target !== undefined) next.target = patch.target === '' ? undefined : finite(patch.target);
  if (patch.current !== undefined) next.value = patch.current === '' ? undefined : finite(patch.current);
  metrics[metricId] = next;
  return { ...graph, entities: { ...graph.entities, metric: metrics }, service: { ...graph.service, updatedAt: now } };
}

function syncInitiativeMetric(graph: ServiceGraph, initiativeId: Id, metricId: Id, include: boolean, now: string): ServiceGraph {
  const state = graph.service.improvementPortfolio;
  const initiative = state?.initiatives?.[initiativeId]; if (!state || !initiative) return graph;
  const metricIds = include ? unique([...(initiative.metricIds ?? []), metricId]) : (initiative.metricIds ?? []).filter((id) => id !== metricId);
  return { ...graph, service: { ...graph.service, improvementPortfolio: { ...state, initiatives: { ...state.initiatives, [initiativeId]: { ...initiative, metricIds, updatedAt: now } }, updatedAt: now }, updatedAt: now } };
}
export function bindServiceMetric(graph: ServiceGraph, metricId: Id, targetKind: ServiceMetricTargetKind, targetId: Id, role: ServiceMetricRole = DEFAULT_ROLE[targetKind], now = nowIso()) {
  if (!graph.entities?.metric?.[metricId]) return { graph, bindingId: null as Id | null, created: false, reason: 'metric_not_found' };
  if (!targetExists(graph, targetKind, targetId)) return { graph, bindingId: null as Id | null, created: false, reason: 'target_not_found' };
  const state = normalizeServiceOutcomesState(graph, now);
  const existing = Object.values(state.bindings).find((item) => item.metricId === metricId && item.targetKind === targetKind && item.targetId === targetId);
  if (existing) return { graph, bindingId: existing.id, created: false, reason: 'already_exists' };
  const id = makeId('metric-binding'); state.bindings[id] = { id, serviceId: graph.service.id, metricId, targetKind, targetId, role, createdAt: now }; state.updatedAt = now;
  let next: ServiceGraph = { ...graph, service: { ...graph.service, outcomes: state, updatedAt: now } };
  if (targetKind === 'initiative') next = syncInitiativeMetric(next, targetId, metricId, true, now);
  return { graph: next, bindingId: id, created: true };
}
export function unbindServiceMetric(graph: ServiceGraph, bindingId: Id, now = nowIso()): ServiceGraph {
  const state = normalizeServiceOutcomesState(graph, now); const binding = state.bindings[bindingId]; if (!binding) return graph;
  delete state.bindings[bindingId]; state.updatedAt = now;
  let next: ServiceGraph = { ...graph, service: { ...graph.service, outcomes: state, updatedAt: now } };
  if (binding.targetKind === 'initiative') {
    const stillLinked = Object.values(state.bindings).some((item) => item.metricId === binding.metricId && item.targetKind === 'initiative' && item.targetId === binding.targetId);
    if (!stillLinked) next = syncInitiativeMetric(next, binding.targetId, binding.metricId, false, now);
  }
  return next;
}
export function recordServiceMetricMeasurement(graph: ServiceGraph, metricId: Id, value: number, measuredAt = nowIso(), note = '', now = nowIso()): { graph: ServiceGraph; measurementId: Id | null; created: boolean; reason?: string } {
  if (!graph.entities?.metric?.[metricId]) return { graph, measurementId: null, created: false, reason: 'metric_not_found' };
  const numeric = finite(value); if (numeric === undefined) return { graph, measurementId: null, created: false, reason: 'invalid_value' };
  const state = normalizeServiceOutcomesState(graph, now); const id = makeId('metric-reading');
  state.measurements[id] = { id, serviceId: graph.service.id, metricId, value: numeric, measuredAt, note: text(note) || undefined, createdAt: now }; state.updatedAt = now;
  const updated = updateServiceMetric({ ...graph, service: { ...graph.service, outcomes: state } }, metricId, { current: numeric }, now);
  return { graph: { ...updated, service: { ...updated.service, outcomes: state, updatedAt: now } }, measurementId: id, created: true };
}

export function serviceMetricStatus(metric: GraphEntity, currentOverride?: number) {
  const current = currentOverride ?? finite(metric.value ?? metric.current); const target = finite(metric.target); const direction = (metric.direction === 'at_most' ? 'at_most' : 'at_least') as ServiceMetricDirection;
  if (current === undefined || target === undefined) return 'unmeasured' as const;
  return (direction === 'at_most' ? current <= target : current >= target) ? 'on_target' as const : 'off_target' as const;
}
export function serviceMetricProgress(metric: GraphEntity, currentOverride?: number): number | null {
  const baseline = finite(metric.baseline), target = finite(metric.target), current = currentOverride ?? finite(metric.value ?? metric.current);
  if (baseline === undefined || target === undefined || current === undefined) return null;
  const direction = metric.direction === 'at_most' ? 'at_most' : 'at_least';
  const needed = direction === 'at_most' ? baseline - target : target - baseline;
  if (needed === 0) return serviceMetricStatus(metric, current) === 'on_target' ? 100 : 0;
  const achieved = direction === 'at_most' ? baseline - current : current - baseline;
  return Math.round(clamp((achieved / needed) * 100));
}
function readingsFor(state: ServiceOutcomesState, metricId: Id) {
  return Object.values(state.measurements).filter((item) => item.metricId === metricId).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.createdAt.localeCompare(b.createdAt));
}
function metricTrend(metric: GraphEntity, readings: ServiceMetricMeasurement[]) {
  if (readings.length < 2) return 'unknown' as const;
  const a = readings[readings.length - 2].value, b = readings[readings.length - 1].value;
  if (a === b) return 'flat' as const;
  const improved = metric.direction === 'at_most' ? b < a : b > a;
  return improved ? 'improving' as const : 'worsening' as const;
}

export function buildServiceOutcomesReport(graph: ServiceGraph, now = nowIso()) {
  const state = normalizeServiceOutcomesState(graph, now); const metrics = Object.values(graph.entities?.metric ?? {});
  const explicit = Object.values(state.bindings).filter((item) => Boolean(graph.entities?.metric?.[item.metricId]) && targetExists(graph, item.targetKind, item.targetId));
  const initiativeImplicit: ServiceMetricBinding[] = Object.values(graph.service.improvementPortfolio?.initiatives ?? {}).flatMap((initiative) => (initiative.metricIds ?? []).filter((metricId) => Boolean(graph.entities?.metric?.[metricId])).map((metricId) => ({
    id: `implicit:${initiative.id}:${metricId}`, serviceId: graph.service.id, metricId, targetKind: 'initiative' as const, targetId: initiative.id, role: 'result' as const, createdAt: initiative.updatedAt,
  }))).filter((candidate) => !explicit.some((item) => item.metricId === candidate.metricId && item.targetKind === 'initiative' && item.targetId === candidate.targetId));
  const bindings = [...explicit, ...initiativeImplicit];
  const metricRows = metrics.map((metric) => {
    const readings = readingsFor(state, metric.id); const latest = readings[readings.length - 1]; const current = latest?.value ?? finite(metric.value ?? metric.current);
    const status = serviceMetricStatus(metric, current); const progress = serviceMetricProgress(metric, current); const trend = metricTrend(metric, readings);
    const related = bindings.filter((item) => item.metricId === metric.id).map((item) => ({ ...item, targetLabel: serviceMetricTargetLabel(graph, item), implicit: item.id.startsWith('implicit:') }));
    return { ...metric, current, baseline: finite(metric.baseline), target: finite(metric.target), unit: text(metric.unit), direction: metric.direction === 'at_most' ? 'at_most' as const : 'at_least' as const, status, progress, trend, readings, bindings: related };
  }).sort((a, b) => String(a.title || a.name || a.id).localeCompare(String(b.title || b.name || b.id), 'pt-BR'));
  const byId = Object.fromEntries(metricRows.map((item) => [item.id, item]));
  const initiativeOutcomes = Object.values(graph.service.improvementPortfolio?.initiatives ?? {}).map((initiative) => {
    const linkedIds = unique([...(initiative.metricIds ?? []), ...bindings.filter((item) => item.targetKind === 'initiative' && item.targetId === initiative.id).map((item) => item.metricId)]);
    const linked = linkedIds.map((id) => byId[id]).filter(Boolean); const measured = linked.filter((item) => item.current !== undefined && item.target !== undefined);
    const achieved = measured.filter((item) => item.status === 'on_target').length;
    const outcomeStatus = !linked.length || !measured.length ? 'unmeasured' : achieved === measured.length ? 'achieved' : achieved > 0 ? 'partial' : initiative.status === 'implemented' ? 'not_achieved' : 'tracking';
    const progressValues = measured.map((item) => item.progress).filter((value): value is number => value !== null);
    const outcomeProgress = progressValues.length ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) : null;
    return { ...initiative, linkedMetrics: linked, measuredCount: measured.length, achievedCount: achieved, outcomeStatus, outcomeProgress, implementedWithoutProof: initiative.status === 'implemented' && (!linked.length || !measured.length) };
  });
  const targetKinds = Object.keys(SERVICE_METRIC_TARGET_LABELS) as ServiceMetricTargetKind[];
  const coverage = targetKinds.map((kind) => {
    const targets = listServiceMetricTargets(graph, kind); const covered = targets.filter((target) => bindings.some((binding) => binding.targetKind === kind && binding.targetId === target.id)).length;
    return { kind, label: SERVICE_METRIC_TARGET_LABELS[kind], total: targets.length, covered, percent: targets.length ? Math.round(covered / targets.length * 100) : 0 };
  });
  const counts = { metrics: metricRows.length, measured: metricRows.filter((item) => item.current !== undefined).length, onTarget: metricRows.filter((item) => item.status === 'on_target').length, offTarget: metricRows.filter((item) => item.status === 'off_target').length, bindings: bindings.length, readings: Object.keys(state.measurements).length, implementedWithoutProof: initiativeOutcomes.filter((item) => item.implementedWithoutProof).length };
  const outcomeScore = counts.metrics ? Math.round(metricRows.reduce((sum, item) => sum + (item.status === 'on_target' ? 100 : item.progress ?? 0), 0) / counts.metrics) : 0;
  return { state, metrics: metricRows, bindings, initiativeOutcomes, coverage, counts, outcomeScore, outcomesReady: counts.metrics > 0 && counts.bindings > 0 };
}

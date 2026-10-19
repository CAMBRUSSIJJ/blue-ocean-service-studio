import type {
  CurrentFutureServiceState, Id, ServiceGapChangeType, ServiceGapMetadata, ServiceGapStatus,
  ServiceGraph, ServiceStateEntry, ServiceStateEntryKind, ServiceStateSnapshot,
} from '../domain/model';

const nowIso = () => new Date().toISOString();
const clean = (value: unknown) => String(value ?? '').trim();
const asText = (value: unknown) => value === undefined || value === null ? '' : String(value);
const boolText = (value: unknown) => value === false ? 'false' : value === true ? 'true' : asText(value);

export const SERVICE_STATE_KIND_LABELS: Record<ServiceStateEntryKind, string> = {
  proposition: 'Proposição', journey: 'Journey', channel: 'Canal', blueprint: 'Blueprint', responsibility: 'Responsabilidade',
};
export const SERVICE_GAP_STATUS_LABELS: Record<ServiceGapStatus, string> = {
  unreviewed: 'Não revisado', accepted: 'Aceito', in_progress: 'Em execução', resolved: 'Resolvido', dismissed: 'Descartado',
};
export const SERVICE_GAP_CHANGE_LABELS: Record<ServiceGapChangeType, string> = {
  changed: 'Alterado', added: 'Adicionado', removed: 'Removido',
};

const makeSnapshotId = (perspective: 'current' | 'future', now: string) => `${perspective}-${now.replace(/[^0-9]/g, '').slice(0, 17)}`;
const entryId = (kind: ServiceStateEntryKind, sourceId: string) => `${kind}:${sourceId}`;
const gapKey = (kind: ServiceStateEntryKind, sourceId: string, field: string) => `${kind}|${sourceId}|${field}`;

export function emptyCurrentFutureState(now = nowIso()): CurrentFutureServiceState {
  return { version: 1, gapMetadata: {}, projectedDecisionIds: [], updatedAt: now };
}

function normalizeEntry(id: string, entry: ServiceStateEntry): ServiceStateEntry {
  return {
    ...entry, id, kind: entry.kind || 'journey', sourceId: clean(entry.sourceId) || undefined,
    label: clean(entry.label) || 'Componente do serviço',
    fields: Object.fromEntries(Object.entries(entry.fields ?? {}).map(([key, value]) => [key, asText(value)])),
  };
}
function normalizeSnapshot(snapshot: ServiceStateSnapshot | undefined, perspective: 'current' | 'future', graph: ServiceGraph): ServiceStateSnapshot | undefined {
  if (!snapshot) return undefined;
  return {
    ...snapshot, perspective, serviceId: graph.service.id,
    label: clean(snapshot.label) || (perspective === 'current' ? 'Estado atual' : 'Estado futuro'),
    capturedAt: snapshot.capturedAt || graph.service.updatedAt || nowIso(),
    sourceServiceUpdatedAt: snapshot.sourceServiceUpdatedAt || graph.service.updatedAt || '',
    entries: Object.fromEntries(Object.entries(snapshot.entries ?? {}).map(([id, entry]) => [id, normalizeEntry(id, entry)])),
  };
}
export function normalizeCurrentFutureState(graph: ServiceGraph, now = nowIso()): CurrentFutureServiceState {
  const state = graph.service.currentFuture;
  if (!state) return emptyCurrentFutureState(now);
  return {
    version: 1,
    current: normalizeSnapshot(state.current, 'current', graph),
    future: normalizeSnapshot(state.future, 'future', graph),
    gapMetadata: Object.fromEntries(Object.entries(state.gapMetadata ?? {}).map(([key, meta]) => [key, {
      status: meta.status || 'unreviewed', owner: clean(meta.owner) || undefined, note: clean(meta.note) || undefined, updatedAt: meta.updatedAt || now,
    }])),
    projectedDecisionIds: [...new Set(state.projectedDecisionIds ?? [])], updatedAt: state.updatedAt || now,
  };
}
function withState(graph: ServiceGraph, state: CurrentFutureServiceState, now: string): ServiceGraph {
  return { ...graph, service: { ...graph.service, currentFuture: { ...state, updatedAt: now }, updatedAt: now } };
}

function canonicalEntries(graph: ServiceGraph): Record<Id, ServiceStateEntry> {
  const entries: Record<Id, ServiceStateEntry> = {};
  const proposition = graph.service.proposition?.current;
  if (proposition) {
    const id = entryId('proposition', graph.service.id);
    entries[id] = { id, kind: 'proposition', sourceId: graph.service.id, label: 'Proposição atual', sourceUpdatedAt: proposition.updatedAt, fields: {
      status: proposition.status, audience: proposition.audience, problem: proposition.problem, promise: proposition.promise,
      outcome: proposition.outcome, experience: proposition.experience, differentiator: proposition.differentiator, businessValue: proposition.businessValue,
    }};
  }
  graph.service.journeyIds.map((id) => graph.journeys[id]).filter(Boolean).forEach((journey) => {
    const id = entryId('journey', journey.id);
    entries[id] = { id, kind: 'journey', sourceId: journey.id, label: journey.name || 'Journey', sourceUpdatedAt: journey.updatedAt, fields: {
      name: journey.name, status: journey.status || 'draft', priority: journey.priority || 'medium', owner: journey.owner || '', objective: journey.objective || '', stageCount: String(journey.stageIds.length),
    }};
    const responsibilityId = entryId('responsibility', `journey:${journey.id}`);
    entries[responsibilityId] = { id: responsibilityId, kind: 'responsibility', sourceId: `journey:${journey.id}`, label: `Journey · ${journey.name}`, sourceUpdatedAt: journey.updatedAt, fields: { owner: journey.owner || '', accountable: '', consulted: '', informed: '' } };
  });
  Object.values(graph.channels ?? {}).filter((channel) => channel.serviceId === graph.service.id).forEach((channel) => {
    const id = entryId('channel', channel.id);
    entries[id] = { id, kind: 'channel', sourceId: channel.id, label: channel.name, sourceUpdatedAt: channel.updatedAt, fields: {
      name: channel.name, kind: channel.kind, owner: channel.owner || '', active: boolText(channel.active !== false),
    }};
    const responsibilityId = entryId('responsibility', `channel:${channel.id}`);
    entries[responsibilityId] = { id: responsibilityId, kind: 'responsibility', sourceId: `channel:${channel.id}`, label: `Canal · ${channel.name}`, sourceUpdatedAt: channel.updatedAt, fields: { owner: channel.owner || '', accountable: '', consulted: '', informed: '' } };
  });
  Object.values(graph.views.whiteboards ?? {}).filter((board) => board.serviceId === graph.service.id && board.viewKind === 'blueprint').forEach((board) => {
    const id = entryId('blueprint', board.id);
    entries[id] = { id, kind: 'blueprint', sourceId: board.id, label: board.name || 'Service Blueprint', sourceUpdatedAt: board.updatedAt, fields: {
      name: board.name || 'Service Blueprint', journeyId: board.journeyId || '', layoutMode: board.layoutMode || 'blueprint', itemCount: String(Object.keys(board.items ?? {}).length), laneCount: String(board.blueprintSettings?.lanes?.length ?? 0),
    }};
  });
  Object.values(graph.tasks ?? {}).forEach((task) => {
    const owner = clean(task.owner); const accountable = clean(task.accountable); const consulted = clean(task.consulted); const informed = clean(task.informed);
    if (!owner && !accountable && !consulted && !informed) return;
    const id = entryId('responsibility', `task:${task.id}`);
    entries[id] = { id, kind: 'responsibility', sourceId: `task:${task.id}`, label: `Atividade · ${task.title}`, sourceUpdatedAt: task.updatedAt, fields: { owner, accountable, consulted, informed } };
  });
  return entries;
}

export function captureCurrentServiceState(graph: ServiceGraph, now = nowIso()): ServiceGraph {
  const state = normalizeCurrentFutureState(graph, now);
  const current: ServiceStateSnapshot = { id: makeSnapshotId('current', now), perspective: 'current', serviceId: graph.service.id, label: 'Estado atual', capturedAt: now, sourceServiceUpdatedAt: graph.service.updatedAt || now, entries: canonicalEntries(graph) };
  return withState(graph, { ...state, current }, now);
}

export function initializeFutureServiceState(graph: ServiceGraph, options: { reset?: boolean } = {}, now = nowIso()): ServiceGraph {
  let sourceGraph = graph; let state = normalizeCurrentFutureState(sourceGraph, now);
  if (!state.current) { sourceGraph = captureCurrentServiceState(sourceGraph, now); state = normalizeCurrentFutureState(sourceGraph, now); }
  if (state.future && !options.reset) return sourceGraph;
  const current = state.current!;
  const entries = Object.fromEntries(Object.entries(current.entries).map(([id, entry]) => [id, { ...entry, fields: { ...entry.fields } }]));
  const future: ServiceStateSnapshot = { ...current, id: makeSnapshotId('future', now), perspective: 'future', label: 'Estado futuro', capturedAt: now, entries };
  return withState(sourceGraph, { ...state, future, gapMetadata: options.reset ? {} : state.gapMetadata, projectedDecisionIds: options.reset ? [] : state.projectedDecisionIds }, now);
}

export function updateFutureServiceField(graph: ServiceGraph, input: { entryId: Id; field: string; value: string }, now = nowIso()): { graph: ServiceGraph; updated: boolean; reason?: string } {
  const state = normalizeCurrentFutureState(graph, now); const future = state.future;
  if (!future) return { graph, updated: false, reason: 'Crie o estado futuro antes de editar.' };
  const entry = future.entries[input.entryId]; if (!entry) return { graph, updated: false, reason: 'Componente futuro não encontrado.' };
  const field = clean(input.field); if (!field || !(field in entry.fields)) return { graph, updated: false, reason: 'Campo futuro inválido.' };
  const nextEntry = { ...entry, fields: { ...entry.fields, [field]: asText(input.value) } };
  const nextFuture = { ...future, entries: { ...future.entries, [entry.id]: nextEntry }, capturedAt: now };
  return { graph: withState(graph, { ...state, future: nextFuture }, now), updated: true };
}

function decisionEntryId(kind: 'proposition' | 'journey' | 'blueprint', sourceId: string, serviceId: string) {
  return kind === 'proposition' ? entryId('proposition', serviceId) : entryId(kind, sourceId);
}
export function projectDecisionIntoFuture(graph: ServiceGraph, decisionId: Id, now = nowIso()): { graph: ServiceGraph; projected: boolean; count: number; reason?: string } {
  let sourceGraph = graph; let state = normalizeCurrentFutureState(sourceGraph, now);
  if (!state.future) { sourceGraph = initializeFutureServiceState(sourceGraph, {}, now); state = normalizeCurrentFutureState(sourceGraph, now); }
  const decision = sourceGraph.service.decisionSystem?.records?.[decisionId];
  if (!decision) return { graph: sourceGraph, projected: false, count: 0, reason: 'Decisão não encontrada.' };
  if (!['approved', 'applied'].includes(decision.status)) return { graph: sourceGraph, projected: false, count: 0, reason: 'Somente decisões aprovadas ou aplicadas podem ser projetadas.' };
  if (state.projectedDecisionIds.includes(decisionId)) return { graph: sourceGraph, projected: false, count: 0, reason: 'Esta decisão já foi projetada no estado futuro.' };
  const future = state.future!; let count = 0; const entries = { ...future.entries };
  decision.changes.forEach((change) => {
    const id = decisionEntryId(change.targetKind, change.targetId ?? sourceGraph.service.id, sourceGraph.service.id);
    const target = entries[id]; if (!target || !(change.field in target.fields)) return;
    entries[id] = { ...target, fields: { ...target.fields, [change.field]: change.proposedValue } }; count += 1;
    if (change.targetKind === 'journey' && change.field === 'owner') {
      const responsibilityId = entryId('responsibility', `journey:${change.targetId ?? ''}`); const responsibility = entries[responsibilityId];
      if (responsibility) entries[responsibilityId] = { ...responsibility, fields: { ...responsibility.fields, owner: change.proposedValue } };
    }
  });
  if (!count) return { graph: sourceGraph, projected: false, count: 0, reason: 'A decisão não possui mudanças compatíveis com o modelo Current × Future.' };
  const nextFuture = { ...future, entries, capturedAt: now };
  return { graph: withState(sourceGraph, { ...state, future: nextFuture, projectedDecisionIds: [...state.projectedDecisionIds, decisionId] }, now), projected: true, count };
}

export type ServiceGap = {
  key: string; kind: ServiceStateEntryKind; sourceId: string; targetLabel: string; field: string;
  currentValue: string; futureValue: string; changeType: ServiceGapChangeType; metadata: ServiceGapMetadata;
};
function defaultGapMeta(now: string): ServiceGapMetadata { return { status: 'unreviewed', updatedAt: now }; }
export function deriveCurrentFutureGaps(state: CurrentFutureServiceState, now = nowIso()): ServiceGap[] {
  if (!state.current || !state.future) return [];
  const ids = [...new Set([...Object.keys(state.current.entries), ...Object.keys(state.future.entries)])].sort(); const gaps: ServiceGap[] = [];
  ids.forEach((id) => {
    const current = state.current!.entries[id]; const future = state.future!.entries[id]; const base = current || future; if (!base) return;
    const fields = [...new Set([...Object.keys(current?.fields ?? {}), ...Object.keys(future?.fields ?? {})])].sort();
    fields.forEach((field) => {
      const currentValue = current?.fields[field] ?? ''; const futureValue = future?.fields[field] ?? '';
      if (current && future && currentValue === futureValue) return;
      const changeType: ServiceGapChangeType = !current ? 'added' : !future ? 'removed' : 'changed';
      const sourceId = base.sourceId || id; const key = gapKey(base.kind, sourceId, field);
      gaps.push({ key, kind: base.kind, sourceId, targetLabel: base.label, field, currentValue, futureValue, changeType, metadata: state.gapMetadata[key] || defaultGapMeta(now) });
    });
  });
  return gaps;
}

export function setServiceGapMetadata(graph: ServiceGraph, key: string, patch: Partial<Pick<ServiceGapMetadata, 'status' | 'owner' | 'note'>>, now = nowIso()): ServiceGraph {
  const state = normalizeCurrentFutureState(graph, now); const gaps = deriveCurrentFutureGaps(state, now);
  if (!gaps.some((gap) => gap.key === key)) return graph;
  const previous = state.gapMetadata[key] || defaultGapMeta(now);
  const next: ServiceGapMetadata = { ...previous, ...patch, owner: patch.owner === undefined ? previous.owner : clean(patch.owner) || undefined, note: patch.note === undefined ? previous.note : clean(patch.note) || undefined, updatedAt: now };
  return withState(graph, { ...state, gapMetadata: { ...state.gapMetadata, [key]: next } }, now);
}

export function buildCurrentFutureReport(graph: ServiceGraph) {
  const state = normalizeCurrentFutureState(graph); const gaps = deriveCurrentFutureGaps(state);
  const currentEntries = Object.values(state.current?.entries ?? {}); const futureEntries = Object.values(state.future?.entries ?? {});
  const byKind = (kind: ServiceStateEntryKind) => gaps.filter((gap) => gap.kind === kind);
  const resolved = gaps.filter((gap) => ['resolved','dismissed'].includes(gap.metadata.status)).length;
  const projectableDecisions = Object.values(graph.service.decisionSystem?.records ?? {}).filter((record) => ['approved','applied'].includes(record.status) && !state.projectedDecisionIds.includes(record.id));
  const counts = {
    currentEntries: currentEntries.length, futureEntries: futureEntries.length, gaps: gaps.length,
    unresolved: gaps.filter((gap) => !['resolved','dismissed'].includes(gap.metadata.status)).length,
    inProgress: gaps.filter((gap) => gap.metadata.status === 'in_progress').length, resolved,
    proposition: byKind('proposition').length, journey: byKind('journey').length, channel: byKind('channel').length,
    blueprint: byKind('blueprint').length, responsibility: byKind('responsibility').length,
    projectableDecisions: projectableDecisions.length,
  };
  const alignmentScore = gaps.length ? Math.round((resolved / gaps.length) * 100) : (state.current && state.future ? 100 : 0);
  return { state, gaps, counts, alignmentScore, projectableDecisions, currentEntries, futureEntries };
}

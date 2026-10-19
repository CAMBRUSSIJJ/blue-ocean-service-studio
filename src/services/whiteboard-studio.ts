import type { GraphEntity, Id, ServiceGraph, SmartObjectKind, WhiteboardEdge, WhiteboardItem, WhiteboardTone, WhiteboardView } from '../domain/model';
import { touchServiceProject } from './service-project.ts';

export type WhiteboardStudioStatus = 'blank' | 'contextual' | 'composing' | 'connected';
export type WhiteboardOriginTarget =
  | { type: 'context'; page: 'personas' | 'needs' | 'jobs' | 'pains' | 'hypotheses' | 'problems' | 'evidence' | 'metrics' }
  | { type: 'journey'; journeyId?: Id; stageId?: Id }
  | { type: 'blueprint'; boardId?: Id }
  | { type: 'action' }
  | { type: 'service' };

export type WhiteboardStudioReport = {
  boardId: Id;
  status: WhiteboardStudioStatus;
  totalItems: number;
  freeItems: number;
  smartItems: number;
  frames: number;
  connections: number;
  danglingSmartObjects: number;
  contextTotal: number;
  contextCovered: number;
  contextCoverage: number;
  journeyStageTotal: number;
  journeyStageCovered: number;
  journeyCoverage: number;
  operationalSmartObjects: number;
  qualityScore: number;
  readyForComposition: boolean;
  checks: Array<{ id: string; label: string; complete: boolean; detail: string }>;
};

type SyncResult = { graph: ServiceGraph; added: number; framesAdded: number; edgesAdded: number };

const CONTEXT_KINDS = ['persona', 'need', 'job', 'pain', 'problem', 'evidence'] as const;
type ContextKind = typeof CONTEXT_KINDS[number];
const OPERATIONAL_KINDS = ['frontstage', 'backstage', 'process', 'system'] as const;
type OperationalKind = typeof OPERATIONAL_KINDS[number];

const makeId = (prefix: string): Id => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? `${prefix}-${crypto.randomUUID()}`
  : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const uniq = <T>(values: T[]) => [...new Set(values)];
const safeIds = (value: unknown): Id[] => Array.isArray(value)
  ? uniq(value.filter((id): id is Id => typeof id === 'string' && Boolean(id)))
  : [];
const asRecord = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};

function resolveSmartRecord(graph: ServiceGraph, kind: SmartObjectKind, id: Id): unknown | null {
  if (kind === 'stage') return graph.stages[id] ?? null;
  if (kind === 'touchpoint') return graph.touchpoints[id] ?? null;
  if (kind === 'problem') return graph.entities?.problem?.[id] ?? graph.problems[id] ?? null;
  if (kind === 'opportunity') return graph.opportunities[id] ?? null;
  if (kind === 'task') return graph.tasks[id] ?? null;
  return graph.entities?.[kind]?.[id] ?? null;
}

function contextTargets(board: WhiteboardView): Array<{ kind: ContextKind; id: Id }> {
  const context = board.designContext;
  if (!context) return [];
  return [
    ...safeIds(context.personaIds).map((id) => ({ kind: 'persona' as const, id })),
    ...safeIds(context.needIds).map((id) => ({ kind: 'need' as const, id })),
    ...safeIds(context.jobIds).map((id) => ({ kind: 'job' as const, id })),
    ...safeIds(context.painIds).map((id) => ({ kind: 'pain' as const, id })),
    ...safeIds(context.problemIds).map((id) => ({ kind: 'problem' as const, id })),
    ...safeIds(context.evidenceIds).map((id) => ({ kind: 'evidence' as const, id })),
  ];
}

function hasSmart(items: Record<Id, WhiteboardItem>, kind: SmartObjectKind, objectId: Id): boolean {
  return Object.values(items).some((item) => item.kind === 'smart' && item.objectKind === kind && item.objectId === objectId);
}

function smartItem(kind: SmartObjectKind, objectId: Id, x: number, y: number, tone: WhiteboardTone = 'slate', extra: Partial<Extract<WhiteboardItem, { kind: 'smart' }>> = {}): WhiteboardItem {
  return { id: makeId(`h711-${kind}`), kind: 'smart', objectKind: kind, objectId, tone, x, y, width: 260, height: 120, ...extra };
}

function frameItem(id: Id, text: string, x: number, y: number, width: number, height: number, tone: WhiteboardTone): WhiteboardItem {
  return { id, kind: 'free', shape: 'frame', semantic: 'frame', tone, text, x, y, width, height };
}

function boardBottom(board: WhiteboardView): number {
  const values = Object.values(board.items ?? {});
  return values.length ? Math.max(...values.map((item) => item.y + item.height)) : 80;
}

function explicitRelatedIds(record: unknown): Id[] {
  const rec = asRecord(record);
  const ids: Id[] = [];
  for (const [key, value] of Object.entries(rec)) {
    if (key === 'id' || key === 'serviceId' || key === 'journeyId' || key === 'sourceBlueprintBoardId' || key === 'sourceBlueprintItemId') continue;
    if (key.endsWith('Ids') || key === 'relatedIds') ids.push(...safeIds(value));
    else if ((key.endsWith('Id') || ['sourceHypothesisId', 'validatedProblemId'].includes(key)) && typeof value === 'string' && value) ids.push(value);
  }
  return uniq(ids);
}

function addExplicitRelationEdges(graph: ServiceGraph, items: Record<Id, WhiteboardItem>, edges: Record<Id, WhiteboardEdge>): number {
  const smart = Object.values(items).filter((item): item is Extract<WhiteboardItem, { kind: 'smart' }> => item.kind === 'smart');
  const byObjectId = new Map<Id, Extract<WhiteboardItem, { kind: 'smart' }>[] >();
  smart.forEach((item) => byObjectId.set(item.objectId, [...(byObjectId.get(item.objectId) ?? []), item]));
  const existingPairs = new Set(Object.values(edges).map((edge) => [edge.fromId, edge.toId].sort().join('|')));
  let added = 0;
  for (const item of smart) {
    const record = resolveSmartRecord(graph, item.objectKind, item.objectId);
    for (const relatedId of explicitRelatedIds(record)) {
      for (const target of byObjectId.get(relatedId) ?? []) {
        if (target.id === item.id) continue;
        const pair = [item.id, target.id].sort().join('|');
        if (existingPairs.has(pair)) continue;
        const id = makeId('h711-edge');
        edges[id] = { id, fromId: item.id, toId: target.id, label: 'relaciona', style: 'dashed', arrow: 'end' };
        existingPairs.add(pair); added += 1;
      }
    }
  }
  return added;
}

function replaceBoard(graph: ServiceGraph, board: WhiteboardView, now: string): ServiceGraph {
  return touchServiceProject({
    ...graph,
    service: { ...graph.service, updatedAt: now },
    views: { ...graph.views, whiteboards: { ...graph.views.whiteboards, [board.id]: { ...board, updatedAt: now } } },
  }, { currentPhase: 'design' });
}

export function buildWhiteboardStudioReport(graph: ServiceGraph, boardId: Id): WhiteboardStudioReport | null {
  const board = graph.views.whiteboards?.[boardId];
  if (!board || board.viewKind !== 'free') return null;
  const all = Object.values(board.items ?? {});
  const smart = all.filter((item): item is Extract<WhiteboardItem, { kind: 'smart' }> => item.kind === 'smart');
  const free = all.filter((item) => item.kind === 'free');
  const targets = contextTargets(board);
  const contextCovered = targets.filter((target) => hasSmart(board.items, target.kind, target.id)).length;
  const dangling = smart.filter((item) => !resolveSmartRecord(graph, item.objectKind, item.objectId)).length;
  const journey = board.journeyId ? graph.journeys[board.journeyId] : undefined;
  const journeyStageIds = safeIds(journey?.stageIds);
  const journeyCovered = journeyStageIds.filter((id) => hasSmart(board.items, 'stage', id)).length;
  const operation = smart.filter((item) => (OPERATIONAL_KINDS as readonly string[]).includes(item.objectKind)).length;
  const frames = free.filter((item) => item.shape === 'frame').length;
  const connections = Object.keys(board.edges ?? {}).length;
  const checks = [
    { id: 'integrity', label: 'Smart Objects íntegros', complete: dangling === 0, detail: dangling ? `${dangling} referência(s) sem origem.` : 'Nenhuma referência órfã.' },
    { id: 'context', label: 'Contexto representado', complete: !targets.length || contextCovered === targets.length, detail: targets.length ? `${contextCovered}/${targets.length} itens do Contexto no quadro.` : 'Quadro sem Design Context obrigatório.' },
    { id: 'frames', label: 'Composição estruturada', complete: frames > 0 || all.length === 0, detail: frames ? `${frames} frame(s) organizando o quadro.` : all.length ? 'Conteúdo ainda sem frames.' : 'Quadro em branco.' },
    { id: 'relations', label: 'Relações visíveis', complete: smart.length < 2 || connections > 0, detail: smart.length < 2 ? 'Ainda não há objetos suficientes para conexões.' : `${connections} conexão(ões) explícitas.` },
    { id: 'journey', label: 'Journey conectada', complete: !journey || journeyStageIds.length === 0 || journeyCovered > 0, detail: journey ? `${journeyCovered}/${journeyStageIds.length} etapas representadas.` : 'Nenhuma Journey vinculada ao quadro.' },
  ];
  const applicable = checks.filter((check) => check.id !== 'journey' || Boolean(journey));
  const qualityScore = applicable.length ? Math.round(applicable.filter((check) => check.complete).length / applicable.length * 100) : 0;
  const contextCoverage = targets.length ? Math.round(contextCovered / targets.length * 100) : 100;
  const journeyCoverage = journeyStageIds.length ? Math.round(journeyCovered / journeyStageIds.length * 100) : 0;
  const status: WhiteboardStudioStatus = all.length === 0 ? 'blank' : operation > 0 && connections > 0 ? 'connected' : targets.length && contextCovered > 0 ? 'contextual' : 'composing';
  return {
    boardId, status, totalItems: all.length, freeItems: free.length, smartItems: smart.length, frames, connections,
    danglingSmartObjects: dangling, contextTotal: targets.length, contextCovered, contextCoverage,
    journeyStageTotal: journeyStageIds.length, journeyStageCovered: journeyCovered, journeyCoverage,
    operationalSmartObjects: operation, qualityScore,
    readyForComposition: dangling === 0 && (!targets.length || contextCovered === targets.length), checks,
  };
}

export function syncWhiteboardDesignContext(graph: ServiceGraph, boardId: Id, now = new Date().toISOString()): SyncResult {
  const board = graph.views.whiteboards?.[boardId];
  if (!board || board.viewKind !== 'free' || !board.designContext) return { graph, added: 0, framesAdded: 0, edgesAdded: 0 };
  const items = { ...board.items }; const edges = { ...board.edges };
  const groups: Array<{ id: string; title: string; x: number; tone: WhiteboardTone; targets: Array<{ kind: ContextKind; id: Id }> }> = [
    { id: 'client', title: 'PARA QUEM', x: 120, tone: 'blue', targets: safeIds(board.designContext.personaIds).map((id) => ({ kind: 'persona', id })) },
    { id: 'needs', title: 'NECESSIDADES · JOBS · DORES', x: 460, tone: 'amber', targets: [
      ...safeIds(board.designContext.needIds).map((id) => ({ kind: 'need' as const, id })),
      ...safeIds(board.designContext.jobIds).map((id) => ({ kind: 'job' as const, id })),
      ...safeIds(board.designContext.painIds).map((id) => ({ kind: 'pain' as const, id })),
    ] },
    { id: 'problems', title: 'PROBLEMAS VALIDADOS', x: 800, tone: 'rose', targets: safeIds(board.designContext.problemIds).map((id) => ({ kind: 'problem', id })) },
    { id: 'evidence', title: 'EVIDÊNCIAS', x: 1140, tone: 'emerald', targets: safeIds(board.designContext.evidenceIds).map((id) => ({ kind: 'evidence', id })) },
  ];
  let added = 0; let framesAdded = 0;
  for (const group of groups) {
    const frameId = `h711-context-frame-${group.id}`;
    if (!items[frameId]) {
      items[frameId] = frameItem(frameId, group.title, group.x, 100, 310, Math.max(390, 150 + Math.max(1, group.targets.length) * 145), group.tone);
      framesAdded += 1;
    }
    group.targets.forEach((target, index) => {
      if (!resolveSmartRecord(graph, target.kind, target.id) || hasSmart(items, target.kind, target.id)) return;
      const item = smartItem(target.kind, target.id, group.x + 24, 180 + index * 145, group.tone);
      items[item.id] = item; added += 1;
    });
  }
  const nextBoard: WhiteboardView = { ...board, items, edges, layoutMode: 'free', gridVisible: true, snapToGrid: true, updatedAt: now };
  const edgesAdded = addExplicitRelationEdges(graph, items, edges);
  if (!added && !framesAdded && !edgesAdded) return { graph, added: 0, framesAdded: 0, edgesAdded: 0 };
  return { graph: replaceBoard(graph, { ...nextBoard, edges }, now), added, framesAdded, edgesAdded };
}

export function syncWhiteboardJourney(graph: ServiceGraph, boardId: Id, journeyId?: Id, now = new Date().toISOString()): SyncResult {
  const board = graph.views.whiteboards?.[boardId];
  const selectedJourneyId = journeyId && graph.journeys[journeyId] ? journeyId : board?.journeyId;
  const journey = selectedJourneyId ? graph.journeys[selectedJourneyId] : undefined;
  if (!board || board.viewKind !== 'free' || !journey) return { graph, added: 0, framesAdded: 0, edgesAdded: 0 };
  const items = { ...board.items }; const edges = { ...board.edges };
  const baseY = Math.max(720, boardBottom(board) + 180); let added = 0; let framesAdded = 0;
  journey.stageIds.forEach((stageId, stageIndex) => {
    const stage = graph.stages[stageId]; if (!stage) return;
    const x = 120 + stageIndex * 350;
    const frameId = `h711-journey-frame-${stage.id}`;
    if (!items[frameId]) { items[frameId] = frameItem(frameId, `ETAPA · ${stage.title}`, x, baseY, 320, 700, 'blue'); framesAdded += 1; }
    const stageEntries: Array<{ kind: SmartObjectKind; id: Id; tone: WhiteboardTone }> = [
      { kind: 'stage', id: stage.id, tone: 'blue' },
      ...safeIds(stage.touchpointIds).map((id) => ({ kind: 'touchpoint' as const, id, tone: 'violet' as const })),
      ...safeIds(stage.validatedProblemIds).map((id) => ({ kind: 'problem' as const, id, tone: 'rose' as const })),
      ...safeIds(stage.problemIds).map((id) => ({ kind: 'problem' as const, id, tone: 'amber' as const })),
      ...safeIds(stage.evidenceIds).map((id) => ({ kind: 'evidence' as const, id, tone: 'emerald' as const })),
    ];
    let row = 0;
    for (const entry of stageEntries) {
      if (!resolveSmartRecord(graph, entry.kind, entry.id) || hasSmart(items, entry.kind, entry.id)) continue;
      const item = smartItem(entry.kind, entry.id, x + 30, baseY + 90 + row * 132, entry.tone, { serviceStageId: stage.id });
      items[item.id] = item; added += 1; row += 1;
    }
  });
  const nextBoard: WhiteboardView = { ...board, journeyId: journey.id, items, edges, updatedAt: now };
  const edgesAdded = addExplicitRelationEdges(graph, items, edges);
  if (!added && !framesAdded && !edgesAdded && board.journeyId === journey.id) return { graph, added: 0, framesAdded: 0, edgesAdded: 0 };
  return { graph: replaceBoard(graph, { ...nextBoard, edges }, now), added, framesAdded, edgesAdded };
}

function operationalKindForBlueprintItem(item: WhiteboardItem): OperationalKind | 'evidence' | null {
  const lane = String(item.blueprintLane ?? '');
  if ((OPERATIONAL_KINDS as readonly string[]).includes(lane)) return lane as OperationalKind;
  if (lane === 'evidence' || (item.kind === 'free' && item.semantic === 'evidence')) return 'evidence';
  if (item.kind === 'free' && ['frontstage', 'backstage', 'process', 'system'].includes(String(item.semantic))) return item.semantic as OperationalKind;
  return null;
}

function canonicalEntityFromBlueprintItem(graph: ServiceGraph, sourceBoard: WhiteboardView, sourceItem: Extract<WhiteboardItem, { kind: 'free' }>, kind: OperationalKind | 'evidence', now: string): { graph: ServiceGraph; entityId: Id; created: boolean } {
  const store = graph.entities?.[kind] ?? {};
  const existing = Object.values(store).find((entity) => entity.sourceBlueprintBoardId === sourceBoard.id && entity.sourceBlueprintItemId === sourceItem.id);
  if (existing) return { graph, entityId: existing.id, created: false };
  const id = makeId(`blueprint-${kind}`);
  const entity: GraphEntity = {
    id, type: kind, serviceId: graph.service.id, title: sourceItem.text || `Novo ${kind}`, description: sourceItem.text || '',
    stageId: sourceItem.blueprintStageId, sourceBlueprintBoardId: sourceBoard.id, sourceBlueprintItemId: sourceItem.id,
    blueprintLane: sourceItem.blueprintLane ?? kind, createdAt: now, updatedAt: now,
  };
  return { graph: { ...graph, entities: { ...graph.entities, [kind]: { ...store, [id]: entity } } }, entityId: id, created: true };
}

export function syncWhiteboardBlueprint(graph: ServiceGraph, boardId: Id, blueprintBoardId?: Id, now = new Date().toISOString()): SyncResult & { entitiesCreated: number; sourceBoardId: Id | null } {
  const target = graph.views.whiteboards?.[boardId];
  const candidates = Object.values(graph.views.whiteboards ?? {}).filter((board) => board.viewKind === 'blueprint');
  const source = blueprintBoardId ? graph.views.whiteboards?.[blueprintBoardId] : candidates.find((board) => target?.journeyId && board.journeyId === target.journeyId) ?? candidates[0];
  if (!target || target.viewKind !== 'free' || !source || source.viewKind !== 'blueprint') return { graph, added: 0, framesAdded: 0, edgesAdded: 0, entitiesCreated: 0, sourceBoardId: null };
  let working = graph;
  const items = { ...target.items }; const edges = { ...target.edges }; let added = 0; let framesAdded = 0; let entitiesCreated = 0;
  const baseY = Math.max(1500, boardBottom(target) + 180);
  const sourceItems = Object.values(source.items ?? {});
  const stages = source.journeyId ? safeIds(graph.journeys[source.journeyId]?.stageIds) : uniq(sourceItems.map((item) => item.blueprintStageId).filter((id): id is Id => Boolean(id)));
  stages.forEach((stageId, stageIndex) => {
    const stage = graph.stages[stageId]; const x = 120 + stageIndex * 360;
    const frameId = `h711-blueprint-frame-${source.id}-${stageId}`;
    if (!items[frameId]) { items[frameId] = frameItem(frameId, `BLUEPRINT · ${stage?.title ?? `Etapa ${stageIndex + 1}`}`, x, baseY, 330, 850, 'violet'); framesAdded += 1; }
  });
  for (const sourceItem of sourceItems) {
    let kind: SmartObjectKind | null = null; let objectId: Id | null = null; let tone: WhiteboardTone = 'violet';
    if (sourceItem.kind === 'smart' && resolveSmartRecord(working, sourceItem.objectKind, sourceItem.objectId)) {
      kind = sourceItem.objectKind; objectId = sourceItem.objectId; tone = sourceItem.tone ?? 'violet';
    } else if (sourceItem.kind === 'free') {
      const operationKind = operationalKindForBlueprintItem(sourceItem);
      if (!operationKind) continue;
      const promoted = canonicalEntityFromBlueprintItem(working, source, sourceItem, operationKind, now);
      working = promoted.graph; objectId = promoted.entityId; kind = operationKind; entitiesCreated += promoted.created ? 1 : 0;
      tone = operationKind === 'frontstage' ? 'emerald' : operationKind === 'backstage' ? 'amber' : operationKind === 'process' ? 'blue' : operationKind === 'system' ? 'violet' : 'slate';
    }
    if (!kind || !objectId || hasSmart(items, kind, objectId)) continue;
    const stageIndex = Math.max(0, stages.indexOf(sourceItem.blueprintStageId ?? (kind === 'stage' ? objectId : '')));
    const sameStageCount = Object.values(items).filter((item) => item.serviceStageId === sourceItem.blueprintStageId || item.blueprintStageId === sourceItem.blueprintStageId).length;
    const item = smartItem(kind, objectId, 145 + stageIndex * 360, baseY + 90 + sameStageCount * 128, tone, { serviceStageId: sourceItem.blueprintStageId, blueprintStageId: sourceItem.blueprintStageId, blueprintLane: sourceItem.blueprintLane });
    items[item.id] = item; added += 1;
  }
  const nextTarget: WhiteboardView = { ...target, journeyId: target.journeyId ?? source.journeyId, items, edges, updatedAt: now };
  const edgesAdded = addExplicitRelationEdges(working, items, edges);
  if (!added && !framesAdded && !edgesAdded && !entitiesCreated && target.journeyId === nextTarget.journeyId) return { graph, added: 0, framesAdded: 0, edgesAdded: 0, entitiesCreated: 0, sourceBoardId: source.id };
  return { graph: replaceBoard(working, { ...nextTarget, edges }, now), added, framesAdded, edgesAdded, entitiesCreated, sourceBoardId: source.id };
}

export function whiteboardOriginForKind(kind: SmartObjectKind, record?: unknown): WhiteboardOriginTarget {
  const rec = asRecord(record);
  if (typeof rec.sourceBlueprintBoardId === 'string' && rec.sourceBlueprintBoardId) return { type: 'blueprint', boardId: rec.sourceBlueprintBoardId };
  const context: Partial<Record<SmartObjectKind, WhiteboardOriginTarget>> = {
    persona: { type: 'context', page: 'personas' }, need: { type: 'context', page: 'needs' }, job: { type: 'context', page: 'jobs' }, pain: { type: 'context', page: 'pains' },
    problemHypothesis: { type: 'context', page: 'hypotheses' }, problem: { type: 'context', page: 'problems' }, evidence: { type: 'context', page: 'evidence' }, metric: { type: 'context', page: 'metrics' },
  };
  if (context[kind]) return context[kind]!;
  if (kind === 'stage' || kind === 'touchpoint' || kind === 'emotion' || kind === 'customerAction') return { type: 'journey', journeyId: typeof rec.journeyId === 'string' ? rec.journeyId : undefined, stageId: kind === 'stage' ? (typeof rec.id === 'string' ? rec.id : undefined) : (typeof rec.stageId === 'string' ? rec.stageId : undefined) };
  if (kind === 'task') return { type: 'action' };
  return { type: 'service' };
}

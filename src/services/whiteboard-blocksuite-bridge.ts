import type { Id, ServiceGraph, SmartObjectKind, WhiteboardItem } from '../domain/model';
import { createContextEntity, contextEntityTitle } from './context-library';

export type WhiteboardCanvasKind = 'persona' | 'need' | 'pain' | 'job' | 'problemHypothesis' | 'evidence';
export type LegacyCanvasItem = { id: Id; text: string; x: number; y: number; width: number; height: number; kind: 'note' | 'frame' | 'reference' };

/** All edits to canonical entities stay in the Service Graph. The visual Yjs document holds representations only. */
export function linkEntityToWhiteboard(
  graph: ServiceGraph, boardId: Id, kind: WhiteboardCanvasKind, entityId: Id,
): { graph: ServiceGraph; linked: boolean } {
  const board = graph.views.whiteboards[boardId];
  const entity = graph.entities?.[kind]?.[entityId];
  if (!board || board.viewKind !== 'free' || !entity || (entity.serviceId && entity.serviceId !== graph.service.id)) {
    return { graph, linked: false };
  }
  if (Object.values(board.items).some(item => item.kind === 'smart' && item.objectKind === kind && item.objectId === entityId)) {
    return { graph, linked: false };
  }
  const now = new Date().toISOString();
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? 'bo-visual-' + crypto.randomUUID() : 'bo-visual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const index = Object.keys(board.items).length;
  const item: WhiteboardItem = {
    id, kind: 'smart', objectKind: kind, objectId: entityId,
    x: 80 + index % 4 * 300, y: 100 + Math.floor(index / 4) * 170,
    width: 260, height: 120, tone: 'blue',
  };
  return {
    linked: true,
    graph: {
      ...graph,
      service: { ...graph.service, updatedAt: now },
      views: { ...graph.views, whiteboards: { ...graph.views.whiteboards,
        [boardId]: { ...board, items: { ...board.items, [id]: item }, updatedAt: now },
      } },
    },
  };
}

/** Create once, then place a linked Smart Object in the preserved legacy graph. */
export function createCanvasEntity(
  graph: ServiceGraph, boardId: Id, kind: WhiteboardCanvasKind, title: string,
): { graph: ServiceGraph; entityId: Id | null } {
  const clean = title.trim().slice(0, 240);
  if (!clean || !graph.views.whiteboards[boardId]) return { graph, entityId: null };
  const created = createContextEntity(graph, kind, clean);
  const entityId = Object.keys(created.entities?.[kind] ?? {})
    .find(id => !(id in (graph.entities?.[kind] ?? {}))) ?? null;
  if (!entityId) return { graph, entityId: null };
  return { graph: linkEntityToWhiteboard(created, boardId, kind, entityId).graph, entityId };
}

function smartTitle(graph: ServiceGraph, kind: SmartObjectKind, objectId: Id): string {
  const entity = graph.entities?.[kind]?.[objectId];
  if (entity) return contextEntityTitle(entity);
  if (kind === 'stage') return graph.stages[objectId]?.title ?? 'Etapa vinculada';
  if (kind === 'touchpoint') return graph.touchpoints[objectId]?.name ?? 'Touchpoint vinculado';
  if (kind === 'opportunity') return graph.opportunities[objectId]?.title ?? 'Oportunidade vinculada';
  if (kind === 'task') return graph.tasks[objectId]?.title ?? 'Tarefa vinculada';
  return 'Objeto vinculado';
}

/** Non-destructive one-way copy for the new visual canvas. Original cards remain editable in the classic editor. */
export function legacyItemsForCanvas(graph: ServiceGraph, boardId: Id): LegacyCanvasItem[] {
  const board = graph.views.whiteboards[boardId];
  if (!board) return [];
  return Object.values(board.items ?? {}).slice(0, 250).map(item => ({
    id: item.id, text: item.kind === 'free' ? item.text : smartTitle(graph, item.objectKind, item.objectId),
    x: Math.max(-100000, Math.min(100000, item.x)),
    y: Math.max(-100000, Math.min(100000, item.y)),
    width: Math.max(160, Math.min(1800, item.width)),
    height: Math.max(90, Math.min(1200, item.height)),
    kind: item.kind === 'smart' ? 'reference' as const : item.shape === 'frame' ? 'frame' as const : 'note' as const,
  })).filter(item => item.text.trim().length > 0);
}

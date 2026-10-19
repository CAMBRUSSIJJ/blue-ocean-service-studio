import type { Id, ServiceGraph, SmartObjectKind, WhiteboardItem } from '../domain/model';

type SmartRecordMap = Partial<Record<SmartObjectKind, Record<Id, unknown>>>;

const records = (graph: ServiceGraph): SmartRecordMap => ({
  stage: graph.stages, touchpoint: graph.touchpoints, problem: graph.problems,
  opportunity: graph.opportunities, task: graph.tasks,
});

function resolveSmartRecord(graph: ServiceGraph, kind: SmartObjectKind, objectId: Id): unknown | null {
  return records(graph)[kind]?.[objectId] ?? graph.entities?.[kind]?.[objectId] ?? null;
}

export function resolveSmartObject(graph: ServiceGraph, item: WhiteboardItem): unknown | null {
  return item.kind === 'smart' ? resolveSmartRecord(graph, item.objectKind, item.objectId) : null;
}

export function linkObjectToWhiteboard(graph: ServiceGraph, boardId: Id, kind: SmartObjectKind, objectId: Id, itemId: Id, x: number, y: number): ServiceGraph {
  const board = graph.views.whiteboards[boardId];
  if (!board || !resolveSmartRecord(graph, kind, objectId)) throw new Error('Quadro ou objeto inexistente.');
  const item: WhiteboardItem = { id: itemId, kind: 'smart', objectKind: kind, objectId, x, y, width: 240, height: 120 };
  return { ...graph, views: { whiteboards: { ...graph.views.whiteboards, [boardId]: { ...board, items: { ...board.items, [itemId]: item } } } } };
}

export function pruneDanglingBoardReferences(graph: ServiceGraph): ServiceGraph {
  let changed = false;
  const whiteboards = Object.fromEntries(Object.entries(graph.views.whiteboards).map(([boardId, board]) => {
    const items = Object.fromEntries(Object.entries(board.items).filter(([, item]) => {
      const keep = item.kind === 'free' || Boolean(resolveSmartObject(graph, item));
      if (!keep) changed = true;
      return keep;
    }));
    return [boardId, changed ? { ...board, items } : board];
  }));
  return changed ? { ...graph, views: { whiteboards } } : graph;
}

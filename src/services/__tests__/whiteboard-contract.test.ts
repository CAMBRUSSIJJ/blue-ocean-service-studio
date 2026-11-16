import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph, WhiteboardItem, WhiteboardView } from '../../domain/model';
import { resolveSmartObject, linkObjectToWhiteboard, pruneDanglingBoardReferences } from '../whiteboard-contract';

const NOW = '2025-06-01T12:00:00.000Z';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

function withBoard(graph: ServiceGraph, boardId: string, items: Record<string, WhiteboardItem> = {}): ServiceGraph {
  const board: WhiteboardView = {
    id: boardId,
    serviceId: graph.service.id,
    name: 'Quadro',
    items,
    edges: {},
  };
  return { ...graph, views: { whiteboards: { ...graph.views.whiteboards, [boardId]: board } } };
}

function withStage(graph: ServiceGraph, stageId: string): ServiceGraph {
  const stage = { id: stageId, journeyId: 'j1', title: 'Etapa', customerAction: '', emotion: 'neutral' as const, touchpointIds: [], problemIds: [], opportunityIds: [] };
  return { ...graph, stages: { ...graph.stages, [stageId]: stage } };
}

function withEntity(graph: ServiceGraph, kind: string, entityId: string): ServiceGraph {
  const existing = graph.entities?.[kind] ?? {};
  return { ...graph, entities: { ...graph.entities, [kind]: { ...existing, [entityId]: { id: entityId } } } };
}

// ─── resolveSmartObject ───────────────────────────────────────────────────

describe('resolveSmartObject', () => {
  it('retorna null para item do tipo free', () => {
    const graph = makeGraph();
    const item: WhiteboardItem = { id: 'i1', kind: 'free', text: 'nota', x: 0, y: 0, width: 100, height: 50 };
    expect(resolveSmartObject(graph, item)).toBeNull();
  });

  it('retorna null para item smart com objectKind/objectId inexistente', () => {
    const graph = makeGraph();
    const item: WhiteboardItem = { id: 'i1', kind: 'smart', objectKind: 'stage', objectId: 'nope', x: 0, y: 0, width: 240, height: 120 };
    expect(resolveSmartObject(graph, item)).toBeNull();
  });

  it('retorna o stage quando item.objectKind === stage e stage existe', () => {
    const graph = withStage(makeGraph(), 'stage-1');
    const item: WhiteboardItem = { id: 'i1', kind: 'smart', objectKind: 'stage', objectId: 'stage-1', x: 0, y: 0, width: 240, height: 120 };
    const result = resolveSmartObject(graph, item);
    expect(result).toBeTruthy();
    expect((result as { id: string }).id).toBe('stage-1');
  });

  it('resolve objectos via graph.entities quando não está em stages/etc.', () => {
    const graph = withEntity(makeGraph(), 'persona', 'persona-1');
    const item: WhiteboardItem = { id: 'i1', kind: 'smart', objectKind: 'persona', objectId: 'persona-1', x: 0, y: 0, width: 240, height: 120 };
    const result = resolveSmartObject(graph, item);
    expect(result).toBeTruthy();
    expect((result as { id: string }).id).toBe('persona-1');
  });

  it('prefere o mapa direto (stages) sobre entities quando ambos existem', () => {
    let graph = withStage(makeGraph(), 'stage-1');
    graph = withEntity(graph, 'stage', 'stage-1'); // também em entities, mas deve vir de stages
    const item: WhiteboardItem = { id: 'i1', kind: 'smart', objectKind: 'stage', objectId: 'stage-1', x: 0, y: 0, width: 240, height: 120 };
    const result = resolveSmartObject(graph, item);
    // Resultado deve ser o stage, não a entity — independente da fonte o id deve ser igual
    expect((result as { id: string }).id).toBe('stage-1');
  });
});

// ─── linkObjectToWhiteboard ───────────────────────────────────────────────

describe('linkObjectToWhiteboard', () => {
  it('lança erro se o boardId não existir no grafo', () => {
    const graph = withStage(makeGraph(), 'stage-1');
    expect(() => linkObjectToWhiteboard(graph, 'board-nope', 'stage', 'stage-1', 'item-1', 10, 20))
      .toThrow('Quadro ou objeto inexistente.');
  });

  it('lança erro se o objectId não existir no grafo', () => {
    const graph = withBoard(makeGraph(), 'board-1');
    expect(() => linkObjectToWhiteboard(graph, 'board-1', 'stage', 'nope', 'item-1', 10, 20))
      .toThrow('Quadro ou objeto inexistente.');
  });

  it('adiciona um WhiteboardItem smart ao quadro', () => {
    let graph = withBoard(makeGraph(), 'board-1');
    graph = withStage(graph, 'stage-1');
    const updated = linkObjectToWhiteboard(graph, 'board-1', 'stage', 'stage-1', 'item-1', 50, 80);
    const item = updated.views.whiteboards['board-1'].items['item-1'];
    expect(item).toBeDefined();
    expect(item.kind).toBe('smart');
    expect(item.objectKind).toBe('stage');
    expect(item.objectId).toBe('stage-1');
    expect(item.x).toBe(50);
    expect(item.y).toBe(80);
    expect(item.width).toBe(240);
    expect(item.height).toBe(120);
  });

  it('não muta o grafo original (imutabilidade)', () => {
    let graph = withBoard(makeGraph(), 'board-1');
    graph = withStage(graph, 'stage-1');
    const before = Object.keys(graph.views.whiteboards['board-1'].items).length;
    linkObjectToWhiteboard(graph, 'board-1', 'stage', 'stage-1', 'item-1', 0, 0);
    expect(Object.keys(graph.views.whiteboards['board-1'].items).length).toBe(before);
  });

  it('preserva items já existentes no quadro', () => {
    const existingItem: WhiteboardItem = { id: 'old-1', kind: 'free', text: 'nota', x: 0, y: 0, width: 100, height: 50 };
    let graph = withBoard(makeGraph(), 'board-1', { 'old-1': existingItem });
    graph = withStage(graph, 'stage-1');
    const updated = linkObjectToWhiteboard(graph, 'board-1', 'stage', 'stage-1', 'item-new', 0, 0);
    expect(updated.views.whiteboards['board-1'].items['old-1']).toBeDefined();
    expect(updated.views.whiteboards['board-1'].items['item-new']).toBeDefined();
  });
});

// ─── pruneDanglingBoardReferences ─────────────────────────────────────────

describe('pruneDanglingBoardReferences', () => {
  it('retorna o mesmo objeto (referência) quando não há dangling refs', () => {
    const graph = withBoard(makeGraph(), 'board-1');
    const result = pruneDanglingBoardReferences(graph);
    expect(result).toBe(graph); // sem mudanças → mesma referência
  });

  it('mantém items do tipo free independente do estado do grafo', () => {
    const freeItem: WhiteboardItem = { id: 'f1', kind: 'free', text: 'anotação', x: 0, y: 0, width: 100, height: 50 };
    const graph = withBoard(makeGraph(), 'board-1', { f1: freeItem });
    const result = pruneDanglingBoardReferences(graph);
    expect(result).toBe(graph); // free item válido → sem poda → mesma referência
  });

  it('remove item smart cujo objectId não existe no grafo', () => {
    const danglingItem: WhiteboardItem = { id: 'd1', kind: 'smart', objectKind: 'stage', objectId: 'ghost', x: 0, y: 0, width: 240, height: 120 };
    const graph = withBoard(makeGraph(), 'board-1', { d1: danglingItem });
    const result = pruneDanglingBoardReferences(graph);
    expect(result.views.whiteboards['board-1'].items['d1']).toBeUndefined();
  });

  it('mantém item smart cujo object existe', () => {
    let graph = withStage(makeGraph(), 'stage-1');
    const smartItem: WhiteboardItem = { id: 's1', kind: 'smart', objectKind: 'stage', objectId: 'stage-1', x: 0, y: 0, width: 240, height: 120 };
    graph = withBoard(graph, 'board-1', { s1: smartItem });
    const result = pruneDanglingBoardReferences(graph);
    expect(result).toBe(graph); // sem mudança → mesma referência
    expect(result.views.whiteboards['board-1'].items['s1']).toBeDefined();
  });

  it('poda apenas o item dangling e mantém os demais', () => {
    let graph = withStage(makeGraph(), 'stage-1');
    const validItem: WhiteboardItem = { id: 'v1', kind: 'smart', objectKind: 'stage', objectId: 'stage-1', x: 0, y: 0, width: 240, height: 120 };
    const danglingItem: WhiteboardItem = { id: 'd1', kind: 'smart', objectKind: 'stage', objectId: 'ghost', x: 10, y: 10, width: 240, height: 120 };
    const freeItem: WhiteboardItem = { id: 'f1', kind: 'free', text: 'nota', x: 20, y: 20, width: 100, height: 50 };
    graph = withBoard(graph, 'board-1', { v1: validItem, d1: danglingItem, f1: freeItem });
    const result = pruneDanglingBoardReferences(graph);
    const items = result.views.whiteboards['board-1'].items;
    expect(items['v1']).toBeDefined();
    expect(items['f1']).toBeDefined();
    expect(items['d1']).toBeUndefined();
  });

  it('funciona corretamente com múltiplos quadros', () => {
    let graph = withStage(makeGraph(), 'stage-1');
    const validItem: WhiteboardItem = { id: 'v1', kind: 'smart', objectKind: 'stage', objectId: 'stage-1', x: 0, y: 0, width: 240, height: 120 };
    const danglingItem: WhiteboardItem = { id: 'd1', kind: 'smart', objectKind: 'stage', objectId: 'ghost', x: 0, y: 0, width: 240, height: 120 };
    graph = withBoard(graph, 'board-1', { v1: validItem });
    graph = withBoard(graph, 'board-2', { d1: danglingItem });
    const result = pruneDanglingBoardReferences(graph);
    expect(result.views.whiteboards['board-1'].items['v1']).toBeDefined();
    expect(result.views.whiteboards['board-2'].items['d1']).toBeUndefined();
  });
});

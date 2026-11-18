import { describe, it, expect } from 'vitest';
import {
  linkEntityToWhiteboard,
  createCanvasEntity,
  legacyItemsForCanvas,
} from '../whiteboard-blocksuite-bridge';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withFreeBoard(graph: ServiceGraph, boardId = 'b1'): ServiceGraph {
  return {
    ...graph,
    views: {
      ...graph.views,
      whiteboards: {
        ...graph.views.whiteboards,
        [boardId]: {
          id: boardId, serviceId: 'S', name: 'Canvas', viewKind: 'free',
          items: {}, createdAt: NOW, updatedAt: NOW,
        } as ServiceGraph['views']['whiteboards'][string],
      },
    },
  };
}

function withEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: { ...(graph.entities?.[kind] ?? {}), [id]: { id, serviceId: 'S', kind, createdAt: NOW, updatedAt: NOW, title: `${kind} ${id}`, ...extra } },
    },
  } as ServiceGraph;
}

// ─── linkEntityToWhiteboard ───────────────────────────────────────────────────

describe('linkEntityToWhiteboard', () => {
  it('links entity to free board successfully', () => {
    let g = withFreeBoard(base());
    g = withEntity(g, 'persona', 'p1');
    const result = linkEntityToWhiteboard(g, 'b1', 'persona', 'p1');
    expect(result.linked).toBe(true);
    const items = Object.values(result.graph.views.whiteboards['b1'].items);
    expect(items.some(item => item.kind === 'smart' && item.objectKind === 'persona' && item.objectId === 'p1')).toBe(true);
  });

  it('returns linked=false for missing board', () => {
    const g = withEntity(base(), 'persona', 'p1');
    const result = linkEntityToWhiteboard(g, 'ghost', 'persona', 'p1');
    expect(result.linked).toBe(false);
  });

  it('returns linked=false for non-free board (blueprint)', () => {
    const g = {
      ...withEntity(base(), 'persona', 'p1'),
      views: {
        ...base().views,
        whiteboards: {
          b1: { id: 'b1', serviceId: 'S', name: 'Blueprint', viewKind: 'blueprint', items: {}, createdAt: NOW, updatedAt: NOW } as ServiceGraph['views']['whiteboards'][string],
        },
      },
    };
    const result = linkEntityToWhiteboard(g, 'b1', 'persona', 'p1');
    expect(result.linked).toBe(false);
  });

  it('returns linked=false for missing entity', () => {
    const g = withFreeBoard(base());
    const result = linkEntityToWhiteboard(g, 'b1', 'persona', 'ghost');
    expect(result.linked).toBe(false);
  });

  it('returns linked=false if entity already linked', () => {
    let g = withFreeBoard(base());
    g = withEntity(g, 'persona', 'p1');
    const r1 = linkEntityToWhiteboard(g, 'b1', 'persona', 'p1');
    const r2 = linkEntityToWhiteboard(r1.graph, 'b1', 'persona', 'p1');
    expect(r2.linked).toBe(false);
  });

  it('places item with layout coordinates', () => {
    let g = withFreeBoard(base());
    g = withEntity(g, 'persona', 'p1');
    const result = linkEntityToWhiteboard(g, 'b1', 'persona', 'p1');
    const item = Object.values(result.graph.views.whiteboards['b1'].items)[0];
    expect(item.width).toBe(260);
    expect(item.height).toBe(120);
    expect(item.tone).toBe('blue');
  });

  it('returns linked=false for entity from another service', () => {
    let g = withFreeBoard(base());
    g = withEntity(g, 'persona', 'p1', { serviceId: 'OTHER' });
    const result = linkEntityToWhiteboard(g, 'b1', 'persona', 'p1');
    expect(result.linked).toBe(false);
  });
});

// ─── createCanvasEntity ───────────────────────────────────────────────────────

describe('createCanvasEntity', () => {
  it('creates entity and links to board', () => {
    const g = withFreeBoard(base());
    const result = createCanvasEntity(g, 'b1', 'persona', 'Nova Persona');
    expect(result.entityId).not.toBeNull();
    const entity = result.graph.entities?.persona?.[result.entityId!];
    expect(entity).toBeDefined();
  });

  it('places the entity on the board as a smart item', () => {
    const g = withFreeBoard(base());
    const result = createCanvasEntity(g, 'b1', 'need', 'Nova Necessidade');
    const items = Object.values(result.graph.views.whiteboards['b1'].items);
    expect(items.some(i => i.kind === 'smart' && i.objectKind === 'need')).toBe(true);
  });

  it('returns entityId=null for empty title', () => {
    const g = withFreeBoard(base());
    const result = createCanvasEntity(g, 'b1', 'persona', '   ');
    expect(result.entityId).toBeNull();
  });

  it('returns entityId=null for missing board', () => {
    const result = createCanvasEntity(base(), 'ghost', 'persona', 'Test');
    expect(result.entityId).toBeNull();
  });

  it('truncates title at 240 characters', () => {
    const g = withFreeBoard(base());
    const longTitle = 'a'.repeat(300);
    const result = createCanvasEntity(g, 'b1', 'persona', longTitle);
    const entity = result.graph.entities?.persona?.[result.entityId!];
    expect(entity?.title?.length).toBeLessThanOrEqual(240);
  });
});

// ─── legacyItemsForCanvas ─────────────────────────────────────────────────────

describe('legacyItemsForCanvas', () => {
  it('returns empty for missing board', () => {
    expect(legacyItemsForCanvas(base(), 'ghost')).toHaveLength(0);
  });

  it('converts free-text item to note kind', () => {
    const g = {
      ...withFreeBoard(base()),
      views: {
        ...withFreeBoard(base()).views,
        whiteboards: {
          b1: {
            ...withFreeBoard(base()).views.whiteboards['b1'],
            items: { i1: { id: 'i1', kind: 'free', text: 'Hello', x: 10, y: 20, width: 300, height: 150, shape: 'note' } as ServiceGraph['views']['whiteboards'][string]['items'][string] },
          },
        },
      },
    };
    const items = legacyItemsForCanvas(g, 'b1');
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('note');
    expect(items[0].text).toBe('Hello');
  });

  it('converts frame shape to frame kind', () => {
    const g = {
      ...withFreeBoard(base()),
      views: {
        ...withFreeBoard(base()).views,
        whiteboards: {
          b1: {
            ...withFreeBoard(base()).views.whiteboards['b1'],
            items: { i1: { id: 'i1', kind: 'free', text: 'Frame', x: 0, y: 0, width: 400, height: 200, shape: 'frame' } as ServiceGraph['views']['whiteboards'][string]['items'][string] },
          },
        },
      },
    };
    const items = legacyItemsForCanvas(g, 'b1');
    expect(items[0].kind).toBe('frame');
  });

  it('filters out items with empty text', () => {
    const g = {
      ...withFreeBoard(base()),
      views: {
        ...withFreeBoard(base()).views,
        whiteboards: {
          b1: {
            ...withFreeBoard(base()).views.whiteboards['b1'],
            items: { i1: { id: 'i1', kind: 'free', text: '   ', x: 0, y: 0, width: 300, height: 150, shape: 'note' } as ServiceGraph['views']['whiteboards'][string]['items'][string] },
          },
        },
      },
    };
    expect(legacyItemsForCanvas(g, 'b1')).toHaveLength(0);
  });

  it('clamps coordinates within bounds', () => {
    const g = {
      ...withFreeBoard(base()),
      views: {
        ...withFreeBoard(base()).views,
        whiteboards: {
          b1: {
            ...withFreeBoard(base()).views.whiteboards['b1'],
            items: { i1: { id: 'i1', kind: 'free', text: 'Clamped', x: 999999, y: -999999, width: 50, height: 50, shape: 'note' } as ServiceGraph['views']['whiteboards'][string]['items'][string] },
          },
        },
      },
    };
    const items = legacyItemsForCanvas(g, 'b1');
    expect(items[0].x).toBe(100000);
    expect(items[0].y).toBe(-100000);
  });
});

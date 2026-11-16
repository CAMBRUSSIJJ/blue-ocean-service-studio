import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import type { ServiceGraph } from '../../domain/model.ts';
import {
  CONTEXT_KIND_DEFINITIONS,
  contextDefinition,
  listContextEntities,
  allContextEntities,
  contextEntityTitle,
  contextEntityDescription,
  contextRelatedIds,
  contextEntityById,
  contextEntityUsage,
  createContextEntity,
  updateContextEntity,
  setContextRelation,
  removeContextEntity,
  contextLibraryStats,
  isContextKind,
} from '../context-library.ts';
import type { ContextKind } from '../context-library.ts';

function base(): ServiceGraph {
  return createServiceGraph('S');
}

function addEntity(graph: ServiceGraph, kind: ContextKind, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: {
        ...(graph.entities?.[kind] ?? {}),
        [id]: { id, serviceId: graph.service.id, kind, title: `${kind} ${id}`, createdAt: '2025-01-01T00:00:00Z', updatedAt: '2025-01-01T00:00:00Z', ...extra },
      },
    },
  } as ServiceGraph;
}

// ─── CONTEXT_KIND_DEFINITIONS ─────────────────────────────────────────────────

describe('CONTEXT_KIND_DEFINITIONS', () => {
  it('has 7 entries', () => {
    expect(CONTEXT_KIND_DEFINITIONS).toHaveLength(7);
  });

  it('contains all expected kinds', () => {
    const kinds = CONTEXT_KIND_DEFINITIONS.map((d) => d.kind);
    expect(kinds).toContain('persona');
    expect(kinds).toContain('need');
    expect(kinds).toContain('job');
    expect(kinds).toContain('pain');
    expect(kinds).toContain('problemHypothesis');
    expect(kinds).toContain('problem');
    expect(kinds).toContain('evidence');
  });

  it('every definition has required fields', () => {
    for (const def of CONTEXT_KIND_DEFINITIONS) {
      expect(def.label).toBeTruthy();
      expect(def.singular).toBeTruthy();
      expect(def.eyebrow).toBeTruthy();
      expect(def.question).toBeTruthy();
      expect(def.createLabel).toBeTruthy();
    }
  });
});

// ─── contextDefinition ────────────────────────────────────────────────────────

describe('contextDefinition', () => {
  it('returns correct definition for a known kind', () => {
    expect(contextDefinition('evidence').singular).toBe('Evidência');
  });

  it('returns first definition for unknown kind', () => {
    expect(contextDefinition('unknown' as ContextKind).kind).toBe('persona');
  });
});

// ─── listContextEntities ──────────────────────────────────────────────────────

describe('listContextEntities', () => {
  it('returns empty array for empty graph', () => {
    expect(listContextEntities(base(), 'persona')).toEqual([]);
  });

  it('returns entities of the given kind', () => {
    const g = addEntity(base(), 'persona', 'p1');
    expect(listContextEntities(g, 'persona')).toHaveLength(1);
  });

  it('filters out entities with a different serviceId', () => {
    const g: ServiceGraph = {
      ...addEntity(base(), 'persona', 'p1'),
      entities: {
        persona: { p1: { id: 'p1', serviceId: 'other-service', kind: 'persona', title: 'P1', createdAt: '', updatedAt: '' } },
      },
    } as ServiceGraph;
    expect(listContextEntities(g, 'persona')).toHaveLength(0);
  });

  it('includes entities with no serviceId', () => {
    const g = base();
    const withEntity = {
      ...g,
      entities: { persona: { p1: { id: 'p1', kind: 'persona', title: 'P1', createdAt: '', updatedAt: '' } } },
    } as ServiceGraph;
    expect(listContextEntities(withEntity, 'persona')).toHaveLength(1);
  });

  it('sorts by updatedAt descending', () => {
    let g = addEntity(base(), 'persona', 'p1', { updatedAt: '2025-01-01T00:00:00Z' });
    g = addEntity(g, 'persona', 'p2', { updatedAt: '2025-06-01T00:00:00Z' });
    const list = listContextEntities(g, 'persona');
    expect(list[0].id).toBe('p2');
  });
});

// ─── allContextEntities ───────────────────────────────────────────────────────

describe('allContextEntities', () => {
  it('returns empty array for empty graph', () => {
    expect(allContextEntities(base())).toEqual([]);
  });

  it('includes entities from all kinds with contextKind attached', () => {
    let g = addEntity(base(), 'persona', 'p1');
    g = addEntity(g, 'evidence', 'e1');
    const all = allContextEntities(g);
    expect(all.length).toBe(2);
    expect(all.find((e) => e.id === 'p1')?.contextKind).toBe('persona');
    expect(all.find((e) => e.id === 'e1')?.contextKind).toBe('evidence');
  });
});

// ─── contextEntityTitle ───────────────────────────────────────────────────────

describe('contextEntityTitle', () => {
  it('returns title when present', () => {
    expect(contextEntityTitle({ title: 'My Title' } as never)).toBe('My Title');
  });

  it('falls back to name when no title', () => {
    expect(contextEntityTitle({ name: 'My Name' } as never)).toBe('My Name');
  });

  it('returns "Sem título" for null', () => {
    expect(contextEntityTitle(null)).toBe('Sem título');
  });

  it('returns "Sem título" for empty string title', () => {
    expect(contextEntityTitle({ title: '   ' } as never)).toBe('Sem título');
  });
});

// ─── contextEntityDescription ────────────────────────────────────────────────

describe('contextEntityDescription', () => {
  it('returns description when present', () => {
    expect(contextEntityDescription({ description: 'desc' } as never)).toBe('desc');
  });

  it('falls back to context when no description', () => {
    expect(contextEntityDescription({ context: 'ctx' } as never)).toBe('ctx');
  });

  it('returns empty string for null', () => {
    expect(contextEntityDescription(null)).toBe('');
  });

  it('trims whitespace', () => {
    expect(contextEntityDescription({ description: '  trimmed  ' } as never)).toBe('trimmed');
  });
});

// ─── contextRelatedIds ────────────────────────────────────────────────────────

describe('contextRelatedIds', () => {
  it('returns empty array for null', () => {
    expect(contextRelatedIds(null)).toEqual([]);
  });

  it('collects relatedIds, personaIds, evidenceIds, contextIds', () => {
    const entity = { relatedIds: ['r1'], personaIds: ['p1'], evidenceIds: ['e1'], contextIds: ['c1'] } as never;
    const ids = contextRelatedIds(entity);
    expect(ids).toContain('r1');
    expect(ids).toContain('p1');
    expect(ids).toContain('e1');
    expect(ids).toContain('c1');
  });

  it('deduplicates ids across arrays', () => {
    const entity = { relatedIds: ['r1'], personaIds: ['r1'] } as never;
    expect(contextRelatedIds(entity)).toHaveLength(1);
  });

  it('filters empty strings', () => {
    const entity = { relatedIds: ['', 'r1'] } as never;
    expect(contextRelatedIds(entity)).toEqual(['r1']);
  });
});

// ─── contextEntityById ────────────────────────────────────────────────────────

describe('contextEntityById', () => {
  it('returns null for empty graph', () => {
    expect(contextEntityById(base(), 'nonexistent')).toBeNull();
  });

  it('finds entity by id across all kinds', () => {
    const g = addEntity(base(), 'evidence', 'e1');
    const result = contextEntityById(g, 'e1');
    expect(result).not.toBeNull();
    expect(result?.kind).toBe('evidence');
    expect(result?.entity.id).toBe('e1');
  });
});

// ─── contextEntityUsage ───────────────────────────────────────────────────────

describe('contextEntityUsage', () => {
  it('returns zeros for entity with no whiteboard items', () => {
    const g = addEntity(base(), 'persona', 'p1');
    const usage = contextEntityUsage(g, 'persona', 'p1');
    expect(usage.whiteboards).toBe(0);
    expect(usage.instances).toBe(0);
    expect(usage.relatedCount).toBe(0);
  });

  it('counts smart items on a whiteboard', () => {
    let g = addEntity(base(), 'persona', 'p1');
    const board = { id: 'b1', serviceId: g.service.id, name: 'Board', viewKind: 'free' as const, items: { i1: { id: 'i1', kind: 'smart' as const, objectKind: 'persona', objectId: 'p1', x: 0, y: 0, width: 260, height: 120 } }, edges: {} };
    g = { ...g, views: { whiteboards: { b1: board } } } as ServiceGraph;
    const usage = contextEntityUsage(g, 'persona', 'p1');
    expect(usage.whiteboards).toBe(1);
    expect(usage.instances).toBe(1);
  });

  it('counts relatedCount from other entities referencing this id', () => {
    let g = addEntity(base(), 'persona', 'p1');
    g = addEntity(g, 'need', 'n1', { relatedIds: ['p1'] });
    const usage = contextEntityUsage(g, 'persona', 'p1');
    expect(usage.relatedCount).toBe(1);
  });
});

// ─── createContextEntity ──────────────────────────────────────────────────────

describe('createContextEntity', () => {
  it('creates a persona entity', () => {
    const g = createContextEntity(base(), 'persona', 'My Persona');
    const personas = Object.values(g.entities?.persona ?? {});
    expect(personas).toHaveLength(1);
    expect(personas[0].title).toBe('My Persona');
  });

  it('creating "problem" kind redirects to problemHypothesis', () => {
    const g = createContextEntity(base(), 'problem', 'My Problem');
    expect(Object.values(g.entities?.problemHypothesis ?? {})).toHaveLength(1);
    expect(Object.values(g.entities?.problem ?? {})).toHaveLength(0);
  });

  it('updates service.updatedAt', () => {
    const g0 = { ...base(), service: { ...base().service, updatedAt: '2000-01-01T00:00:00.000Z' } } as ServiceGraph;
    const g = createContextEntity(g0, 'need', 'Need 1');
    expect(g.service.updatedAt).not.toBe('2000-01-01T00:00:00.000Z');
  });

  it('does not mutate the original graph', () => {
    const original = base();
    createContextEntity(original, 'persona', 'P');
    expect(Object.keys(original.entities?.persona ?? {})).toHaveLength(0);
  });
});

// ─── updateContextEntity ──────────────────────────────────────────────────────

describe('updateContextEntity', () => {
  it('returns same graph if entity does not exist', () => {
    const g = base();
    expect(updateContextEntity(g, 'persona', 'nonexistent', { title: 'X' })).toBe(g);
  });

  it('updates title and description', () => {
    const g = addEntity(base(), 'persona', 'p1');
    const updated = updateContextEntity(g, 'persona', 'p1', { title: 'New Title', description: 'New Desc' });
    expect(updated.entities?.persona?.p1.title).toBe('New Title');
    expect(updated.entities?.persona?.p1.description).toBe('New Desc');
  });

  it('trims whitespace from title and description', () => {
    const g = addEntity(base(), 'persona', 'p1');
    const updated = updateContextEntity(g, 'persona', 'p1', { title: '  Trimmed  ', description: '  Desc  ' });
    expect(updated.entities?.persona?.p1.title).toBe('Trimmed');
    expect(updated.entities?.persona?.p1.description).toBe('Desc');
  });

  it('sets confidence only for evidence kind', () => {
    const g = addEntity(base(), 'evidence', 'e1');
    const updated = updateContextEntity(g, 'evidence', 'e1', { confidence: 'high' });
    expect(updated.entities?.evidence?.e1.confidence).toBe('high');
  });

  it('ignores confidence for non-evidence kind', () => {
    const g = addEntity(base(), 'persona', 'p1');
    const updated = updateContextEntity(g, 'persona', 'p1', { confidence: 'high' });
    expect(updated.entities?.persona?.p1.confidence).toBeUndefined();
  });

  it('sets status only for problemHypothesis kind', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1');
    const updated = updateContextEntity(g, 'problemHypothesis', 'h1', { status: 'validated' });
    expect(updated.entities?.problemHypothesis?.h1.status).toBe('validated');
  });
});

// ─── setContextRelation ───────────────────────────────────────────────────────

describe('setContextRelation', () => {
  it('no-ops if source does not exist', () => {
    const g = addEntity(base(), 'evidence', 'e1');
    expect(setContextRelation(g, 'persona', 'nonexistent', 'e1', true)).toBe(g);
  });

  it('no-ops if target does not exist', () => {
    const g = addEntity(base(), 'persona', 'p1');
    expect(setContextRelation(g, 'persona', 'p1', 'nonexistent', true)).toBe(g);
  });

  it('no-ops if sourceId === targetId', () => {
    let g = addEntity(base(), 'persona', 'p1');
    g = addEntity(g, 'evidence', 'e1');
    expect(setContextRelation(g, 'persona', 'p1', 'p1', true)).toBe(g);
  });

  it('adds relatedIds bidirectionally', () => {
    let g = addEntity(base(), 'persona', 'p1');
    g = addEntity(g, 'need', 'n1');
    const result = setContextRelation(g, 'persona', 'p1', 'n1', true);
    expect(result.entities?.persona?.p1.relatedIds).toContain('n1');
    expect(result.entities?.need?.n1.relatedIds).toContain('p1');
  });

  it('removes relatedIds bidirectionally when disabled', () => {
    let g = addEntity(base(), 'persona', 'p1', { relatedIds: ['n1'] });
    g = addEntity(g, 'need', 'n1', { relatedIds: ['p1'] });
    const result = setContextRelation(g, 'persona', 'p1', 'n1', false);
    expect(result.entities?.persona?.p1.relatedIds).not.toContain('n1');
    expect(result.entities?.need?.n1.relatedIds).not.toContain('p1');
  });

  it('sets personaIds when source is persona', () => {
    let g = addEntity(base(), 'persona', 'p1');
    g = addEntity(g, 'need', 'n1');
    const result = setContextRelation(g, 'persona', 'p1', 'n1', true);
    expect(result.entities?.need?.n1.personaIds).toContain('p1');
  });

  it('sets evidenceIds when source is evidence', () => {
    let g = addEntity(base(), 'evidence', 'e1');
    g = addEntity(g, 'need', 'n1');
    const result = setContextRelation(g, 'evidence', 'e1', 'n1', true);
    expect(result.entities?.need?.n1.evidenceIds).toContain('e1');
  });
});

// ─── removeContextEntity ─────────────────────────────────────────────────────

describe('removeContextEntity', () => {
  it('returns same graph if entity does not exist', () => {
    const g = base();
    expect(removeContextEntity(g, 'persona', 'nonexistent')).toBe(g);
  });

  it('removes entity from its collection', () => {
    const g = addEntity(base(), 'persona', 'p1');
    const result = removeContextEntity(g, 'persona', 'p1');
    expect(result.entities?.persona?.p1).toBeUndefined();
  });

  it('cleans relatedIds from other entities', () => {
    let g = addEntity(base(), 'persona', 'p1');
    g = addEntity(g, 'need', 'n1', { relatedIds: ['p1'] });
    const result = removeContextEntity(g, 'persona', 'p1');
    expect(result.entities?.need?.n1.relatedIds).not.toContain('p1');
  });

  it('removes smart items from whiteboards', () => {
    let g = addEntity(base(), 'persona', 'p1');
    const board = { id: 'b1', serviceId: g.service.id, name: 'Board', viewKind: 'free' as const, items: { i1: { id: 'i1', kind: 'smart' as const, objectKind: 'persona', objectId: 'p1', x: 0, y: 0, width: 260, height: 120 } }, edges: {} };
    g = { ...g, views: { whiteboards: { b1: board } } } as ServiceGraph;
    const result = removeContextEntity(g, 'persona', 'p1');
    expect(result.views?.whiteboards?.b1.items?.i1).toBeUndefined();
  });

  it('removes related whiteboard edges when item is removed', () => {
    let g = addEntity(base(), 'persona', 'p1');
    const board = {
      id: 'b1', serviceId: g.service.id, name: 'Board', viewKind: 'free' as const,
      items: { i1: { id: 'i1', kind: 'smart' as const, objectKind: 'persona', objectId: 'p1', x: 0, y: 0, width: 260, height: 120 } },
      edges: { e1: { id: 'e1', fromId: 'i1', toId: 'other' } },
    };
    g = { ...g, views: { whiteboards: { b1: board } } } as ServiceGraph;
    const result = removeContextEntity(g, 'persona', 'p1');
    expect(result.views?.whiteboards?.b1.edges?.e1).toBeUndefined();
  });

  it('does not mutate original graph', () => {
    const original = addEntity(base(), 'persona', 'p1');
    removeContextEntity(original, 'persona', 'p1');
    expect(original.entities?.persona?.p1).toBeDefined();
  });
});

// ─── contextLibraryStats ─────────────────────────────────────────────────────

describe('contextLibraryStats', () => {
  it('returns zero counts for empty graph', () => {
    const stats = contextLibraryStats(base());
    expect(stats.total).toBe(0);
    expect(stats.counts.persona).toBe(0);
  });

  it('counts each kind correctly', () => {
    let g = addEntity(base(), 'persona', 'p1');
    g = addEntity(g, 'persona', 'p2');
    g = addEntity(g, 'evidence', 'e1');
    const stats = contextLibraryStats(g);
    expect(stats.counts.persona).toBe(2);
    expect(stats.counts.evidence).toBe(1);
    expect(stats.total).toBe(3);
  });

  it('exposes validatedProblems and hypotheses as aliases', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1');
    const stats = contextLibraryStats(g);
    expect(stats.hypotheses).toBe(1);
    expect(stats.validatedProblems).toBe(0);
  });
});

// ─── isContextKind ────────────────────────────────────────────────────────────

describe('isContextKind', () => {
  it('returns true for valid kinds', () => {
    for (const def of CONTEXT_KIND_DEFINITIONS) {
      expect(isContextKind(def.kind)).toBe(true);
    }
  });

  it('returns false for invalid kind', () => {
    expect(isContextKind('unknown')).toBe(false);
    expect(isContextKind('')).toBe(false);
  });
});

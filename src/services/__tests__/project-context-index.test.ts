import { describe, it, expect } from 'vitest';
import {
  projectContextRecords,
  projectRelatedIds,
  projectRelatedRecords,
  projectHasLinkedEvidence,
  filterProjectContext,
} from '../project-context-index';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
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

// ─── projectContextRecords ───────────────────────────────────────────────────

describe('projectContextRecords', () => {
  it('returns empty array for base graph', () => {
    expect(projectContextRecords(base())).toHaveLength(0);
  });

  it('includes persona entity with contextKind set', () => {
    const g = withEntity(base(), 'persona', 'p1', { title: 'Persona A' });
    const records = projectContextRecords(g);
    expect(records).toHaveLength(1);
    expect(records[0].contextKind).toBe('persona');
    expect(records[0].id).toBe('p1');
  });

  it('includes all supported kinds', () => {
    let g = base();
    g = withEntity(g, 'persona', 'p1');
    g = withEntity(g, 'need', 'n1');
    g = withEntity(g, 'job', 'j1');
    g = withEntity(g, 'pain', 'pa1');
    g = withEntity(g, 'problemHypothesis', 'ph1');
    g = withEntity(g, 'problem', 'pr1');
    g = withEntity(g, 'evidence', 'ev1');
    const records = projectContextRecords(g);
    expect(records).toHaveLength(7);
    const kinds = records.map(r => r.contextKind);
    expect(kinds).toContain('persona');
    expect(kinds).toContain('need');
    expect(kinds).toContain('job');
    expect(kinds).toContain('pain');
    expect(kinds).toContain('problemHypothesis');
    expect(kinds).toContain('problem');
    expect(kinds).toContain('evidence');
  });

  it('excludes entities from other services', () => {
    const g = withEntity(base(), 'persona', 'p1', { serviceId: 'OTHER' });
    expect(projectContextRecords(g)).toHaveLength(0);
  });

  it('includes entities with no serviceId', () => {
    const g = withEntity(base(), 'persona', 'p1', { serviceId: undefined });
    expect(projectContextRecords(g)).toHaveLength(1);
  });
});

// ─── projectRelatedIds ───────────────────────────────────────────────────────

describe('projectRelatedIds', () => {
  it('returns empty array for undefined', () => {
    expect(projectRelatedIds(undefined)).toEqual([]);
  });

  it('returns empty array for null', () => {
    expect(projectRelatedIds(null)).toEqual([]);
  });

  it('extracts ids from relatedIds', () => {
    const entity = { id: 'e1', relatedIds: ['a', 'b'], serviceId: 'S', kind: 'persona', createdAt: NOW, updatedAt: NOW };
    expect(projectRelatedIds(entity)).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('extracts ids from personaIds', () => {
    const entity = { id: 'e1', personaIds: ['p1', 'p2'], serviceId: 'S', kind: 'need', createdAt: NOW, updatedAt: NOW };
    expect(projectRelatedIds(entity)).toEqual(expect.arrayContaining(['p1', 'p2']));
  });

  it('deduplicates ids across fields', () => {
    const entity = { id: 'e1', relatedIds: ['a'], contextIds: ['a', 'b'], serviceId: 'S', kind: 'need', createdAt: NOW, updatedAt: NOW };
    const ids = projectRelatedIds(entity);
    expect(ids.filter(x => x === 'a')).toHaveLength(1);
  });

  it('ignores non-array fields', () => {
    const entity = { id: 'e1', relatedIds: 'not-array', serviceId: 'S', kind: 'persona', createdAt: NOW, updatedAt: NOW };
    expect(projectRelatedIds(entity)).toEqual([]);
  });
});

// ─── projectRelatedRecords ───────────────────────────────────────────────────

describe('projectRelatedRecords', () => {
  it('finds outbound relations', () => {
    let g = withEntity(base(), 'persona', 'p1');
    g = withEntity(g, 'need', 'n1', { relatedIds: ['p1'] });
    const records = projectContextRecords(g);
    const related = projectRelatedRecords(records, 'n1');
    expect(related.some(r => r.id === 'p1')).toBe(true);
  });

  it('finds inbound relations (bidirectional)', () => {
    let g = withEntity(base(), 'persona', 'p1');
    g = withEntity(g, 'need', 'n1', { personaIds: ['p1'] });
    const records = projectContextRecords(g);
    // p1 is related to n1 because n1 points at p1
    const related = projectRelatedRecords(records, 'p1');
    expect(related.some(r => r.id === 'n1')).toBe(true);
  });

  it('excludes the entity itself', () => {
    let g = withEntity(base(), 'persona', 'p1', { relatedIds: ['p1'] });
    const records = projectContextRecords(g);
    const related = projectRelatedRecords(records, 'p1');
    expect(related.every(r => r.id !== 'p1')).toBe(true);
  });

  it('returns empty for unrelated entity', () => {
    let g = withEntity(base(), 'persona', 'p1');
    g = withEntity(g, 'need', 'n1');
    const records = projectContextRecords(g);
    expect(projectRelatedRecords(records, 'p1')).toHaveLength(0);
  });
});

// ─── projectHasLinkedEvidence ─────────────────────────────────────────────────

describe('projectHasLinkedEvidence', () => {
  it('returns true when related evidence exists', () => {
    let g = withEntity(base(), 'need', 'n1');
    g = withEntity(g, 'evidence', 'ev1', { relatedIds: ['n1'] });
    const records = projectContextRecords(g);
    expect(projectHasLinkedEvidence(records, 'n1')).toBe(true);
  });

  it('returns false when no evidence linked', () => {
    const g = withEntity(base(), 'need', 'n1');
    const records = projectContextRecords(g);
    expect(projectHasLinkedEvidence(records, 'n1')).toBe(false);
  });
});

// ─── filterProjectContext ─────────────────────────────────────────────────────

describe('filterProjectContext', () => {
  it('audience area includes persona, need, job, pain, problemHypothesis, problem, evidence', () => {
    let g = withEntity(base(), 'persona', 'p1');
    g = withEntity(g, 'evidence', 'ev1');
    const records = projectContextRecords(g);
    const result = filterProjectContext(records, { area: 'audience' });
    expect(result).toHaveLength(2);
  });

  it('research area restricts to problemHypothesis, problem, evidence', () => {
    let g = withEntity(base(), 'persona', 'p1');
    g = withEntity(g, 'problem', 'pr1');
    g = withEntity(g, 'evidence', 'ev1');
    const records = projectContextRecords(g);
    const result = filterProjectContext(records, { area: 'research' });
    expect(result).toHaveLength(2);
    expect(result.every(r => ['problem', 'evidence', 'problemHypothesis'].includes(r.contextKind))).toBe(true);
  });

  it('filters by kind', () => {
    let g = withEntity(base(), 'persona', 'p1');
    g = withEntity(g, 'need', 'n1');
    const records = projectContextRecords(g);
    const result = filterProjectContext(records, { area: 'audience', kind: 'persona' });
    expect(result).toHaveLength(1);
    expect(result[0].contextKind).toBe('persona');
  });

  it('kind "all" returns all kinds', () => {
    let g = withEntity(base(), 'persona', 'p1');
    g = withEntity(g, 'need', 'n1');
    const records = projectContextRecords(g);
    const result = filterProjectContext(records, { area: 'audience', kind: 'all' });
    expect(result).toHaveLength(2);
  });

  it('filters by text query (case insensitive)', () => {
    let g = withEntity(base(), 'persona', 'p1', { title: 'João Idoso' });
    g = withEntity(g, 'persona', 'p2', { title: 'Maria Jovem' });
    const records = projectContextRecords(g);
    const result = filterProjectContext(records, { area: 'audience', query: 'idoso' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('p1');
  });

  it('filters by hasEvidence — only items with linked evidence', () => {
    let g = withEntity(base(), 'need', 'n1');
    g = withEntity(g, 'need', 'n2');
    g = withEntity(g, 'evidence', 'ev1', { relatedIds: ['n1'] });
    const records = projectContextRecords(g);
    const result = filterProjectContext(records, { area: 'audience', hasEvidence: true });
    // n1 and ev1 itself
    expect(result.some(r => r.id === 'n1')).toBe(true);
    expect(result.some(r => r.id === 'n2')).toBe(false);
  });
});

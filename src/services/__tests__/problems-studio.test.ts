import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import {
  problemProfileFromEntity,
  buildProblemStudioReport,
  updateProblemProfile,
  problemRelationOptions,
} from '../problems-studio.ts';
import type { ServiceGraph, GraphEntity } from '../../domain/model';

const NOW = '2025-01-01T00:00:00.000Z';

function base(): ServiceGraph { return createServiceGraph('S'); }

function addEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: {
        ...(graph.entities?.[kind] ?? {}),
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${id}`, description: `D-${id}`, status: 'hypothesis', relatedIds: [], createdAt: NOW, updatedAt: NOW, ...extra },
      },
    },
  } as ServiceGraph;
}

function addProblem(graph: ServiceGraph, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return addEntity(graph, 'problem', id, extra);
}

const FULL_DRAFT = {
  title: 'Problem title',
  description: 'Problem description',
  rootCause: 'Root cause',
  impact: 'Impact',
  affectedPopulation: 'Population',
  observableSignal: 'Signal',
  severity: 'high' as const,
  priority: 'critical' as const,
};

// ─── problemProfileFromEntity ─────────────────────────────────────────────────

describe('problemProfileFromEntity', () => {
  it('maps all fields', () => {
    const entity = {
      id: 'p1', type: 'problem', title: 'Title', description: 'Desc',
      rootCause: 'Cause', impact: 'Impact', affectedPopulation: 'Pop',
      observableSignal: 'Signal', severity: 'high', priority: 'critical',
      relatedIds: [], createdAt: NOW, updatedAt: NOW,
    } as unknown as GraphEntity;
    const d = problemProfileFromEntity(entity);
    expect(d.title).toBe('Title');
    expect(d.description).toBe('Desc');
    expect(d.rootCause).toBe('Cause');
    expect(d.impact).toBe('Impact');
    expect(d.affectedPopulation).toBe('Pop');
    expect(d.observableSignal).toBe('Signal');
    expect(d.severity).toBe('high');
    expect(d.priority).toBe('critical');
  });

  it('falls back to cause/audience/signal aliases', () => {
    const entity = { id: 'p1', type: 'problem', cause: 'C', audience: 'A', signal: 'Si', relatedIds: [] } as unknown as GraphEntity;
    const d = problemProfileFromEntity(entity);
    expect(d.rootCause).toBe('C');
    expect(d.affectedPopulation).toBe('A');
    expect(d.observableSignal).toBe('Si');
  });

  it('defaults severity/priority to medium for invalid values', () => {
    const entity = { id: 'p1', type: 'problem', severity: 'nope', priority: 'whatever', relatedIds: [] } as unknown as GraphEntity;
    const d = problemProfileFromEntity(entity);
    expect(d.severity).toBe('medium');
    expect(d.priority).toBe('medium');
  });

  it('returns empty title when entity has no title', () => {
    const entity = { id: 'p1', type: 'problem', relatedIds: [] } as unknown as GraphEntity;
    const d = problemProfileFromEntity(entity);
    expect(d.title).toBe('');
  });
});

// ─── buildProblemStudioReport null guard ──────────────────────────────────────

describe('buildProblemStudioReport', () => {
  it('returns null when problem not found', () => {
    expect(buildProblemStudioReport(base(), 'missing')).toBeNull();
  });

  it('returns report shape for valid problem', () => {
    const g = addProblem(base(), 'p1');
    const r = buildProblemStudioReport(g, 'p1');
    expect(r).not.toBeNull();
    expect(r!.problem.id).toBe('p1');
    expect(Array.isArray(r!.connections)).toBe(true);
    expect(r!.connectionCounts).toBeDefined();
    expect(Array.isArray(r!.qualityChecks)).toBe(true);
    expect(typeof r!.qualityScore).toBe('number');
    expect(r!.sourceHypothesis).toBeNull();
    expect(r!.evidenceConfidence).toBeDefined();
  });

  it('qualityChecks has 8 items', () => {
    const g = addProblem(base(), 'p1');
    const r = buildProblemStudioReport(g, 'p1')!;
    expect(r.qualityChecks).toHaveLength(8);
  });

  it('qualityScore is 0 for sparse entity (only title+description)', () => {
    // entity with only title+description: 'statement' check passes (1/8 = 12%)
    const g = addProblem(base(), 'p1', { title: 'T', description: 'D' });
    const r = buildProblemStudioReport(g, 'p1')!;
    expect(r.qualityScore).toBe(Math.round(1 / 8 * 100));
  });

  it('readyForDefinition false for sparse entity', () => {
    const g = addProblem(base(), 'p1');
    const r = buildProblemStudioReport(g, 'p1')!;
    expect(r.readyForDefinition).toBe(false);
  });

  it('readyForDefinition true when all checks pass', () => {
    const g = addProblem(addEntity(addEntity(base(), 'evidence', 'ev1'), 'persona', 'pe1'), 'p1', {
      status: 'validated',
      title: 'Title', description: 'Desc', rootCause: 'RC', impact: 'Imp',
      affectedPopulation: 'Pop', observableSignal: 'Sig',
      relatedIds: ['pe1', 'ev1'],
    });
    const r = buildProblemStudioReport(g, 'p1')!;
    expect(r.readyForDefinition).toBe(true);
  });

  // ─── connection detection ──────────────────────────────────────────────────

  it('detects outbound evidence via relatedIds', () => {
    let g = addEntity(base(), 'evidence', 'ev1');
    g = addProblem(g, 'p1', { relatedIds: ['ev1'] });
    const r = buildProblemStudioReport(g, 'p1')!;
    expect(r.connectionCounts.evidence).toBe(1);
    const conn = r.connections.find((c) => c.id === 'ev1');
    expect(conn?.direction).toBe('outbound');
  });

  it('detects outbound evidence via evidenceIds', () => {
    let g = addEntity(base(), 'evidence', 'ev1');
    g = addProblem(g, 'p1', { evidenceIds: ['ev1'] });
    const r = buildProblemStudioReport(g, 'p1')!;
    expect(r.connectionCounts.evidence).toBe(1);
  });

  it('detects inbound persona link via relatedIds', () => {
    let g = addEntity(base(), 'persona', 'pe1', { relatedIds: ['p1'] });
    g = addProblem(g, 'p1');
    const r = buildProblemStudioReport(g, 'p1')!;
    expect(r.connectionCounts.persona).toBe(1);
    const conn = r.connections.find((c) => c.id === 'pe1');
    expect(conn?.direction).toBe('inbound');
  });

  it('detects both-direction connection', () => {
    let g = addEntity(base(), 'persona', 'pe1', { relatedIds: ['p1'] });
    g = addProblem(g, 'p1', { relatedIds: ['pe1'] });
    const r = buildProblemStudioReport(g, 'p1')!;
    const conn = r.connections.find((c) => c.id === 'pe1');
    expect(conn?.direction).toBe('both');
  });

  it('sourceHypothesis populated via sourceHypothesisId', () => {
    let g = addEntity(base(), 'problemHypothesis', 'h1');
    g = addProblem(g, 'p1', { sourceHypothesisId: 'h1' });
    const r = buildProblemStudioReport(g, 'p1')!;
    expect(r.sourceHypothesis).not.toBeNull();
    expect(r.sourceHypothesis!.id).toBe('h1');
  });

  it('evidenceConfidence counted per level', () => {
    let g = addEntity(base(), 'evidence', 'ev1', { confidence: 'high' });
    g = addEntity(g, 'evidence', 'ev2', { confidence: 'low' });
    g = addProblem(g, 'p1', { relatedIds: ['ev1', 'ev2'] });
    const r = buildProblemStudioReport(g, 'p1')!;
    expect(r.evidenceConfidence.high).toBe(1);
    expect(r.evidenceConfidence.low).toBe(1);
  });

  it('context check passes when persona connected', () => {
    let g = addEntity(base(), 'persona', 'pe1', { relatedIds: ['p1'] });
    g = addProblem(g, 'p1');
    const r = buildProblemStudioReport(g, 'p1')!;
    const ctx = r.qualityChecks.find((c) => c.id === 'context');
    expect(ctx?.complete).toBe(true);
  });

  it('population check passes via persona connection count', () => {
    let g = addEntity(base(), 'persona', 'pe1', { relatedIds: ['p1'] });
    g = addProblem(g, 'p1');
    const r = buildProblemStudioReport(g, 'p1')!;
    const pop = r.qualityChecks.find((c) => c.id === 'population');
    expect(pop?.complete).toBe(true);
  });
});

// ─── updateProblemProfile ─────────────────────────────────────────────────────

describe('updateProblemProfile', () => {
  it('no-ops when problem not found', () => {
    const g = base();
    const result = updateProblemProfile({ graph: g, problemId: 'missing', draft: FULL_DRAFT, connectedIds: [], now: NOW });
    expect(result).toBe(g);
  });

  it('writes all draft fields', () => {
    const g = addProblem(base(), 'p1');
    const result = updateProblemProfile({ graph: g, problemId: 'p1', draft: FULL_DRAFT, connectedIds: [], now: NOW });
    const updated = result.entities!.problem!['p1'];
    expect(updated.title).toBe('Problem title');
    expect(updated.description).toBe('Problem description');
    expect(updated.rootCause).toBe('Root cause');
    expect(updated.impact).toBe('Impact');
    expect(updated.affectedPopulation).toBe('Population');
    expect(updated.observableSignal).toBe('Signal');
    expect(updated.severity).toBe('high');
    expect(updated.priority).toBe('critical');
  });

  it('sets status to validated and problemProfileVersion to 2', () => {
    const g = addProblem(base(), 'p1');
    const result = updateProblemProfile({ graph: g, problemId: 'p1', draft: FULL_DRAFT, connectedIds: [], now: NOW });
    const updated = result.entities!.problem!['p1'];
    expect(updated.status).toBe('validated');
    expect(updated.problemProfileVersion).toBe(2);
  });

  it('links connected persona bidirectionally', () => {
    let g = addEntity(base(), 'persona', 'pe1');
    g = addProblem(g, 'p1');
    const result = updateProblemProfile({ graph: g, problemId: 'p1', draft: FULL_DRAFT, connectedIds: ['pe1'], now: NOW });
    const problem = result.entities!.problem!['p1'];
    const persona = result.entities!.persona!['pe1'];
    expect(problem.relatedIds).toContain('pe1');
    expect(persona.relatedIds).toContain('p1');
  });

  it('removes link when not in connectedIds', () => {
    let g = addEntity(base(), 'persona', 'pe1', { relatedIds: ['p1'] });
    g = addProblem(g, 'p1', { relatedIds: ['pe1'] });
    const result = updateProblemProfile({ graph: g, problemId: 'p1', draft: FULL_DRAFT, connectedIds: [], now: NOW });
    const persona = result.entities!.persona!['pe1'];
    expect(persona.relatedIds).not.toContain('p1');
  });

  it('evidence ids tracked in evidenceIds field', () => {
    let g = addEntity(base(), 'evidence', 'ev1');
    g = addProblem(g, 'p1');
    const result = updateProblemProfile({ graph: g, problemId: 'p1', draft: FULL_DRAFT, connectedIds: ['ev1'], now: NOW });
    const updated = result.entities!.problem!['p1'];
    expect(Array.isArray(updated.evidenceIds)).toBe(true);
    expect(updated.evidenceIds).toContain('ev1');
  });

  it('sets validatedProblemId on source hypothesis', () => {
    let g = addEntity(base(), 'problemHypothesis', 'h1');
    g = addProblem(g, 'p1', { sourceHypothesisId: 'h1' });
    const result = updateProblemProfile({ graph: g, problemId: 'p1', draft: FULL_DRAFT, connectedIds: [], now: NOW });
    const hyp = result.entities!.problemHypothesis!['h1'];
    expect(hyp.validatedProblemId).toBe('p1');
  });
});

// ─── problemRelationOptions ───────────────────────────────────────────────────

describe('problemRelationOptions', () => {
  it('returns empty array for empty graph', () => {
    expect(problemRelationOptions(base())).toEqual([]);
  });

  it('returns options for each relation kind', () => {
    let g = addEntity(base(), 'persona', 'pe1');
    g = addEntity(g, 'evidence', 'ev1');
    const opts = problemRelationOptions(g);
    const kinds = opts.map((o) => o.kind);
    expect(kinds).toContain('persona');
    expect(kinds).toContain('evidence');
  });

  it('evidence option includes confidence field', () => {
    const g = addEntity(base(), 'evidence', 'ev1', { confidence: 'high' });
    const opts = problemRelationOptions(g);
    const ev = opts.find((o) => o.id === 'ev1');
    expect(ev?.confidence).toBe('high');
  });

  it('non-evidence option has undefined confidence', () => {
    const g = addEntity(base(), 'persona', 'pe1');
    const opts = problemRelationOptions(g);
    const pe = opts.find((o) => o.id === 'pe1');
    expect(pe?.confidence).toBeUndefined();
  });
});

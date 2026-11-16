import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import {
  serviceDefinitionDraftFromDefinition,
  normalizeServiceDefinitionDraft,
  serviceDefinitionConnectionOptions,
  buildServiceDefinitionStudioReport,
} from '../service-definition.ts';
import type { ServiceGraph, ServiceProjectDefinition } from '../../domain/model';

const NOW = '2025-01-01T00:00:00.000Z';

function base(): ServiceGraph { return createServiceGraph('S'); }

function addEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: {
        ...(graph.entities?.[kind] ?? {}),
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${id}`, status: 'active', relatedIds: [], createdAt: NOW, updatedAt: NOW, ...extra },
      },
    },
  } as ServiceGraph;
}

function withDefinition(graph: ServiceGraph, definition: Partial<ServiceProjectDefinition>): ServiceGraph {
  return {
    ...graph,
    service: {
      ...graph.service,
      project: {
        ...(graph.service.project ?? {}),
        definition: { ...(graph.service.project?.definition ?? {}), ...definition } as ServiceProjectDefinition,
      },
    },
  };
}

// ─── serviceDefinitionDraftFromDefinition ─────────────────────────────────────

describe('serviceDefinitionDraftFromDefinition', () => {
  it('maps all scalar fields', () => {
    const def: ServiceProjectDefinition = {
      promise: 'P', outcome: 'O', scope: 'S', startBoundary: 'Start', endBoundary: 'End',
      principles: ['A', 'B'], successCriteria: ['SC1'], outOfScope: ['X'], assumptions: ['Y'],
      personaIds: ['p1'], problemIds: ['pb1'], evidenceIds: ['ev1'],
    };
    const d = serviceDefinitionDraftFromDefinition(def);
    expect(d.promise).toBe('P');
    expect(d.outcome).toBe('O');
    expect(d.scope).toBe('S');
    expect(d.startBoundary).toBe('Start');
    expect(d.endBoundary).toBe('End');
    expect(d.principles).toEqual(['A', 'B']);
    expect(d.successCriteria).toEqual(['SC1']);
    expect(d.outOfScope).toEqual(['X']);
    expect(d.assumptions).toEqual(['Y']);
    expect(d.personaIds).toEqual(['p1']);
    expect(d.problemIds).toEqual(['pb1']);
    expect(d.evidenceIds).toEqual(['ev1']);
  });

  it('filters duplicate ids in arrays', () => {
    const def = { promise: '', outcome: '', scope: '', startBoundary: '', endBoundary: '', personaIds: ['p1', 'p1', 'p2'], problemIds: [], evidenceIds: [] } as unknown as ServiceProjectDefinition;
    expect(serviceDefinitionDraftFromDefinition(def).personaIds).toEqual(['p1', 'p2']);
  });

  it('returns empty arrays for undefined optional fields', () => {
    const def = { promise: '', outcome: '' } as unknown as ServiceProjectDefinition;
    const d = serviceDefinitionDraftFromDefinition(def);
    expect(d.principles).toEqual([]);
    expect(d.personaIds).toEqual([]);
  });
});

// ─── normalizeServiceDefinitionDraft ─────────────────────────────────────────

describe('normalizeServiceDefinitionDraft', () => {
  it('trims scalar fields', () => {
    const d = normalizeServiceDefinitionDraft({ promise: '  Promessa  ', outcome: ' Out ' });
    expect(d.promise).toBe('Promessa');
    expect(d.outcome).toBe('Out');
  });

  it('deduplicates and trims array fields', () => {
    const d = normalizeServiceDefinitionDraft({ principles: ['  A  ', 'A', 'B'] });
    expect(d.principles).toEqual(['A', 'B']);
  });

  it('filters empty strings from arrays', () => {
    const d = normalizeServiceDefinitionDraft({ successCriteria: ['', 'SC1', '  '] });
    expect(d.successCriteria).toEqual(['SC1']);
  });

  it('handles completely empty input', () => {
    const d = normalizeServiceDefinitionDraft({});
    expect(d.promise).toBe('');
    expect(d.principles).toEqual([]);
    expect(d.personaIds).toEqual([]);
  });
});

// ─── serviceDefinitionConnectionOptions ───────────────────────────────────────

describe('serviceDefinitionConnectionOptions', () => {
  it('returns empty for empty graph', () => {
    expect(serviceDefinitionConnectionOptions(base(), { promise: '', outcome: '', scope: '', startBoundary: '', endBoundary: '', principles: [], successCriteria: [], outOfScope: [], assumptions: [], personaIds: [], problemIds: [], evidenceIds: [] })).toEqual([]);
  });

  it('marks persona as selected when in draft personaIds', () => {
    const g = addEntity(base(), 'persona', 'per1');
    const draft = { promise: '', outcome: '', scope: '', startBoundary: '', endBoundary: '', principles: [], successCriteria: [], outOfScope: [], assumptions: [], personaIds: ['per1'], problemIds: [], evidenceIds: [] };
    const opts = serviceDefinitionConnectionOptions(g, draft);
    expect(opts.find(o => o.id === 'per1')!.selected).toBe(true);
  });

  it('marks validated problem as kind=problem', () => {
    const g = addEntity(base(), 'problem', 'pb1', { status: 'validated' });
    const draft = { promise: '', outcome: '', scope: '', startBoundary: '', endBoundary: '', principles: [], successCriteria: [], outOfScope: [], assumptions: [], personaIds: [], problemIds: [], evidenceIds: [] };
    const opts = serviceDefinitionConnectionOptions(g, draft);
    expect(opts.find(o => o.id === 'pb1')!.kind).toBe('problem');
  });

  it('excludes non-validated entity problems', () => {
    const g = addEntity(base(), 'problem', 'pb1', { status: 'hypothesis' });
    const draft = { promise: '', outcome: '', scope: '', startBoundary: '', endBoundary: '', principles: [], successCriteria: [], outOfScope: [], assumptions: [], personaIds: [], problemIds: [], evidenceIds: [] };
    const opts = serviceDefinitionConnectionOptions(g, draft);
    expect(opts.find(o => o.id === 'pb1')).toBeUndefined();
  });

  it('evidence has confidence field', () => {
    const g = addEntity(base(), 'evidence', 'ev1', { confidence: 'high' });
    const draft = { promise: '', outcome: '', scope: '', startBoundary: '', endBoundary: '', principles: [], successCriteria: [], outOfScope: [], assumptions: [], personaIds: [], problemIds: [], evidenceIds: [] };
    expect(serviceDefinitionConnectionOptions(g, draft).find(o => o.id === 'ev1')!.confidence).toBe('high');
  });

  it('evidence defaults confidence to medium when missing', () => {
    const g = addEntity(base(), 'evidence', 'ev1');
    const draft = { promise: '', outcome: '', scope: '', startBoundary: '', endBoundary: '', principles: [], successCriteria: [], outOfScope: [], assumptions: [], personaIds: [], problemIds: [], evidenceIds: [] };
    expect(serviceDefinitionConnectionOptions(g, draft).find(o => o.id === 'ev1')!.confidence).toBe('medium');
  });
});

// ─── buildServiceDefinitionStudioReport ──────────────────────────────────────

describe('buildServiceDefinitionStudioReport', () => {
  it('returns report with 9 checks', () => {
    expect(buildServiceDefinitionStudioReport(base()).checks).toHaveLength(9);
  });

  it('score=0 and completed=0 on empty graph', () => {
    const r = buildServiceDefinitionStudioReport(base());
    expect(r.completed).toBe(0);
    expect(r.score).toBe(0);
  });

  it('total=9', () => {
    expect(buildServiceDefinitionStudioReport(base()).total).toBe(9);
  });

  it('promise check passes when draft has promise', () => {
    const g = withDefinition(base(), { promise: 'Promessa' });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'promise')!.complete).toBe(true);
  });

  it('outcome check passes when draft has outcome', () => {
    const g = withDefinition(base(), { outcome: 'Resultado' });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'outcome')!.complete).toBe(true);
  });

  it('scope check passes when draft has scope', () => {
    const g = withDefinition(base(), { scope: 'Escopo' });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'scope')!.complete).toBe(true);
  });

  it('boundaries check requires both start and end', () => {
    let g = withDefinition(base(), { startBoundary: 'Início' });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'boundaries')!.complete).toBe(false);
    g = withDefinition(base(), { startBoundary: 'Início', endBoundary: 'Fim' });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'boundaries')!.complete).toBe(true);
  });

  it('principles check passes when at least 1 principle', () => {
    const g = withDefinition(base(), { principles: ['P1'] });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'principles')!.complete).toBe(true);
  });

  it('personas check requires valid persona in graph + selected in draft', () => {
    let g = addEntity(base(), 'persona', 'per1');
    g = withDefinition(g, { personaIds: ['per1'] });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'personas')!.complete).toBe(true);
  });

  it('personas check fails when persona id not in graph', () => {
    const g = withDefinition(base(), { personaIds: ['nonexistent'] });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'personas')!.complete).toBe(false);
  });

  it('problems check requires validated problem', () => {
    let g = addEntity(base(), 'problem', 'pb1', { status: 'validated' });
    g = withDefinition(g, { problemIds: ['pb1'] });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'problems')!.complete).toBe(true);
  });

  it('evidence check requires valid evidence in graph + selected', () => {
    let g = addEntity(base(), 'evidence', 'ev1');
    g = withDefinition(g, { evidenceIds: ['ev1'] });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'evidence')!.complete).toBe(true);
  });

  it('success check passes when at least 1 successCriteria', () => {
    const g = withDefinition(base(), { successCriteria: ['Critério 1'] });
    expect(buildServiceDefinitionStudioReport(g).checks.find(c => c.id === 'success')!.complete).toBe(true);
  });

  it('readyToDesign=true when all 9 checks pass', () => {
    let g = addEntity(base(), 'persona', 'per1');
    g = addEntity(g, 'problem', 'pb1', { status: 'validated' });
    g = addEntity(g, 'evidence', 'ev1');
    g = withDefinition(g, {
      promise: 'P', outcome: 'O', scope: 'S', startBoundary: 'Start', endBoundary: 'End',
      principles: ['P1'], successCriteria: ['SC1'], personaIds: ['per1'], problemIds: ['pb1'], evidenceIds: ['ev1'],
    });
    expect(buildServiceDefinitionStudioReport(g).readyToDesign).toBe(true);
  });

  it('score = round(completed/total*100)', () => {
    let g = withDefinition(base(), { promise: 'P' }); // 1 check
    const r = buildServiceDefinitionStudioReport(g);
    expect(r.score).toBe(Math.round((r.completed / r.total) * 100));
  });

  it('draft input overrides stored definition', () => {
    const g = withDefinition(base(), { promise: 'Stored' });
    const r = buildServiceDefinitionStudioReport(g, { promise: 'Override' });
    expect(r.draft.promise).toBe('Override');
  });

  it('targetPersonaCount counts valid selected personas', () => {
    let g = addEntity(base(), 'persona', 'per1');
    g = addEntity(g, 'persona', 'per2');
    g = withDefinition(g, { personaIds: ['per1', 'per2'] });
    expect(buildServiceDefinitionStudioReport(g).targetPersonaCount).toBe(2);
  });

  it('validatedProblemCount counts valid selected problems', () => {
    let g = addEntity(base(), 'problem', 'pb1', { status: 'validated' });
    g = withDefinition(g, { problemIds: ['pb1'] });
    expect(buildServiceDefinitionStudioReport(g).validatedProblemCount).toBe(1);
  });

  it('evidenceCount counts valid selected evidence', () => {
    let g = addEntity(base(), 'evidence', 'ev1');
    g = withDefinition(g, { evidenceIds: ['ev1'] });
    expect(buildServiceDefinitionStudioReport(g).evidenceCount).toBe(1);
  });
});

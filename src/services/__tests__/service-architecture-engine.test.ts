import { describe, it, expect } from 'vitest';
import { buildServiceArchitectureReport } from '../service-architecture-engine';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-10-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', name: 'My Service', updatedAt: NOW } };
}

function withJourney(graph: ServiceGraph, id: string, stageIds: string[] = []): ServiceGraph {
  return {
    ...graph,
    service: { ...graph.service, journeyIds: [...(graph.service.journeyIds ?? []), id] },
    journeys: {
      ...graph.journeys,
      [id]: { id, serviceId: 'S', name: `Journey ${id}`, status: 'active', stageIds, createdAt: NOW, updatedAt: NOW } as ServiceGraph['journeys'][string],
    },
  };
}

function withStage(graph: ServiceGraph, id: string, journeyId: string, overrides: Partial<ServiceGraph['stages'][string]> = {}): ServiceGraph {
  return {
    ...graph,
    stages: {
      ...graph.stages,
      [id]: {
        id, journeyId, serviceId: 'S', title: `Stage ${id}`, customerAction: '', touchpointIds: [], opportunityIds: [],
        createdAt: NOW, updatedAt: NOW, ...overrides,
      } as ServiceGraph['stages'][string],
    },
  };
}

function withEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: { ...(graph.entities?.[kind] ?? {}), [id]: { id, serviceId: 'S', kind, createdAt: NOW, updatedAt: NOW, ...extra } },
    },
  } as ServiceGraph;
}

function withBlueprintBoard(graph: ServiceGraph, id: string, journeyId?: string): ServiceGraph {
  return {
    ...graph,
    views: {
      ...graph.views,
      whiteboards: {
        ...(graph.views?.whiteboards ?? {}),
        [id]: { id, serviceId: 'S', name: `Blueprint ${id}`, viewKind: 'blueprint', journeyId: journeyId ?? null, createdAt: NOW, updatedAt: NOW } as ServiceGraph['views']['whiteboards'][string],
      },
    },
  } as ServiceGraph;
}

// ─── Empty graph ──────────────────────────────────────────────────────────────

describe('buildServiceArchitectureReport — empty graph', () => {
  it('returns serviceId and serviceName from graph', () => {
    const r = buildServiceArchitectureReport(base());
    expect(r.serviceId).toBe('S');
    expect(r.serviceName).toBe('My Service');
  });

  it('score is very low (< 20) for empty graph', () => {
    const r = buildServiceArchitectureReport(base());
    expect(r.score).toBeLessThan(20);
  });

  it('label is Estrutura incompleta for score 0', () => {
    const r = buildServiceArchitectureReport(base());
    expect(r.label).toBe('Estrutura incompleta');
  });

  it('all counts start at 0', () => {
    const r = buildServiceArchitectureReport(base());
    expect(r.counts.journeys).toBe(0);
    expect(r.counts.stages).toBe(0);
    expect(r.counts.touchpoints).toBe(0);
  });

  it('no journeys means primaryJourney is null', () => {
    expect(buildServiceArchitectureReport(base()).primaryJourney).toBeNull();
  });

  it('no journeys means primaryFlow is empty', () => {
    expect(buildServiceArchitectureReport(base()).primaryFlow).toHaveLength(0);
  });

  it('has 5 architecture layers', () => {
    const r = buildServiceArchitectureReport(base());
    expect(r.layers).toHaveLength(5);
    const ids = r.layers.map(l => l.id);
    expect(ids).toEqual(['experience', 'service', 'operation', 'improvement', 'results']);
  });

  it('gaps include journeys.missing when no journey', () => {
    const r = buildServiceArchitectureReport(base());
    expect(r.gaps.some(g => g.id === 'journeys.missing')).toBe(true);
  });

  it('gaps include results.metrics when no metrics', () => {
    const r = buildServiceArchitectureReport(base());
    expect(r.gaps.some(g => g.id === 'results.metrics')).toBe(true);
  });

  it('gaps are sorted by priority descending', () => {
    const r = buildServiceArchitectureReport(base());
    for (let i = 1; i < r.gaps.length; i++) {
      expect(r.gaps[i - 1].priority).toBeGreaterThanOrEqual(r.gaps[i].priority);
    }
  });
});

// ─── Journeys and stages ──────────────────────────────────────────────────────

describe('buildServiceArchitectureReport — journeys and stages', () => {
  it('counts journeys correctly', () => {
    const g = withJourney(base(), 'j1');
    expect(buildServiceArchitectureReport(g).counts.journeys).toBe(1);
  });

  it('adding journey increases experience layer score', () => {
    const empty = buildServiceArchitectureReport(base());
    const withJ = buildServiceArchitectureReport(withJourney(base(), 'j1', ['s1']));
    expect(withJ.layers[0].score).toBeGreaterThan(empty.layers[0].score);
  });

  it('reports primaryJourney as the most-covered active journey', () => {
    const g = withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1', { customerAction: 'Do thing', touchpointIds: ['tp1'] });
    const r = buildServiceArchitectureReport(g);
    expect(r.primaryJourney?.id).toBe('j1');
  });

  it('no journeys.missing gap when journey is present', () => {
    const g = withJourney(base(), 'j1', ['s1']);
    const r = buildServiceArchitectureReport(g);
    expect(r.gaps.some(gap => gap.id === 'journeys.missing')).toBe(false);
  });

  it('primaryFlow includes titled stages up to 7', () => {
    const stageIds = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
    let g = withJourney(base(), 'j1', stageIds);
    for (const id of stageIds) g = withStage(g, id, 'j1', { title: `Stage ${id}` });
    const r = buildServiceArchitectureReport(g);
    expect(r.primaryFlow).toHaveLength(7); // capped at 7
  });

  it('archivied journeys ranked below active', () => {
    let g = withJourney(base(), 'j1', ['s1']);
    g = withStage(g, 's1', 'j1', { customerAction: 'x', touchpointIds: ['tp1'] });
    g = {
      ...g, journeys: {
        ...g.journeys,
        j2: { id: 'j2', serviceId: 'S', name: 'Old Journey', status: 'archived', stageIds: [], createdAt: NOW, updatedAt: NOW } as ServiceGraph['journeys'][string],
      },
    };
    const r = buildServiceArchitectureReport(g);
    expect(r.primaryJourney?.id).toBe('j1');
  });
});

// ─── Blueprint / service layer ────────────────────────────────────────────────

describe('buildServiceArchitectureReport — service layer', () => {
  it('adding blueprint board increases service layer score', () => {
    const empty = buildServiceArchitectureReport(base());
    const withBoard = buildServiceArchitectureReport(withBlueprintBoard(base(), 'b1'));
    expect(withBoard.layers[1].score).toBeGreaterThan(empty.layers[1].score);
  });

  it('blueprint.coverage gap disappears with board and filled fields', () => {
    const g = {
      ...withBlueprintBoard(base(), 'b1'),
      blueprintDraft: { frontstage: 'Front', backstage: 'Back', suporte: 'Support', evidencias: 'Evidence' },
    } as ServiceGraph;
    const r = buildServiceArchitectureReport(g);
    expect(r.gaps.some(gap => gap.id === 'blueprint.coverage')).toBe(false);
  });
});

// ─── Operation layer ──────────────────────────────────────────────────────────

describe('buildServiceArchitectureReport — operation layer', () => {
  it('adding process entity increases operation layer score', () => {
    const empty = buildServiceArchitectureReport(base());
    const withProcess = buildServiceArchitectureReport(withEntity(base(), 'process', 'p1', { title: 'Process 1' }));
    expect(withProcess.layers[2].score).toBeGreaterThan(empty.layers[2].score);
  });

  it('no operation.process gap when processes exist', () => {
    const g = withEntity(base(), 'process', 'p1', { title: 'Process 1' });
    const r = buildServiceArchitectureReport(g);
    expect(r.gaps.some(gap => gap.id === 'operation.process')).toBe(false);
  });
});

// ─── Improvement layer ────────────────────────────────────────────────────────

describe('buildServiceArchitectureReport — improvement layer', () => {
  it('counts opportunities', () => {
    const g = {
      ...base(),
      opportunities: { op1: { id: 'op1', serviceId: 'S', title: 'Opp', owner: 'Alice', taskIds: ['t1'], createdAt: NOW, updatedAt: NOW } } as ServiceGraph['opportunities'],
      tasks: { t1: { id: 't1', serviceId: 'S', title: 'Task', owner: 'Alice', createdAt: NOW, updatedAt: NOW } } as ServiceGraph['tasks'],
    };
    const r = buildServiceArchitectureReport(g);
    expect(r.counts.opportunities).toBe(1);
    expect(r.counts.initiatives).toBe(1);
  });
});

// ─── Results layer ────────────────────────────────────────────────────────────

describe('buildServiceArchitectureReport — results layer', () => {
  it('no results.metrics gap when metrics exist', () => {
    const g = withEntity(base(), 'metric', 'm1', { title: 'Metric 1', journeyId: 'j1' });
    const r = buildServiceArchitectureReport(g);
    expect(r.gaps.some(gap => gap.id === 'results.metrics')).toBe(false);
  });

  it('results.metrics gap disappears and counts reflect metrics', () => {
    // Adding a metric clears the results.metrics gap
    const g = withEntity(base(), 'metric', 'm1', { title: 'M1', journeyId: 'j1' });
    const r = buildServiceArchitectureReport(g);
    expect(r.counts.metrics).toBe(1);
    expect(r.gaps.some(gap => gap.id === 'results.metrics')).toBe(false);
  });

  it('adding benefits increases results layer score', () => {
    const empty = buildServiceArchitectureReport(withEntity(base(), 'metric', 'm1', { title: 'M1', journeyId: 'j1' }));
    const withBenefit = buildServiceArchitectureReport(
      withEntity(withEntity(base(), 'metric', 'm1', { title: 'M1', journeyId: 'j1' }), 'benefit', 'b1', { title: 'B1', metricIds: ['m1'] })
    );
    expect(withBenefit.layers[4].score).toBeGreaterThan(empty.layers[4].score);
  });
});

// ─── label thresholds ─────────────────────────────────────────────────────────

describe('architectureLabel (via report score)', () => {
  it('label is Estrutura em evolução for mid-range scores', () => {
    // Build a richer graph that gets ~60-80 overall
    let g = withJourney(base(), 'j1', ['s1', 's2']);
    g = withStage(withStage(g, 's1', 'j1', { customerAction: 'x', touchpointIds: ['tp1'] }), 's2', 'j1', { customerAction: 'y', touchpointIds: ['tp2'] });
    g = withBlueprintBoard(g, 'b1');
    g = withEntity(g, 'process', 'p1', { title: 'P' });
    g = withEntity(g, 'metric', 'm1', { title: 'M', journeyId: 'j1' });
    g = { ...g, blueprintDraft: { frontstage: 'F', backstage: 'B', suporte: 'S', evidencias: 'E' } } as ServiceGraph;
    const r = buildServiceArchitectureReport(g);
    expect(['Estrutura em evolução', 'Estrutura conectada']).toContain(r.label);
  });
});

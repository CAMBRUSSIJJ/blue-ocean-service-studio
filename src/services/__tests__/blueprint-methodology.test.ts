import { describe, it, expect } from 'vitest';
import type { ServiceGraph } from '../../domain/model';
import { createServiceGraph } from '../../domain/graph-operations';
import {
  BLUEPRINT_FRAME_LAYERS,
  BLUEPRINT_BOUNDARIES,
  BLUEPRINT_MARKETING_DIMENSIONS,
  BLUEPRINT_QUALITY_DIMENSIONS,
  isCustomerServiceEvidence,
  blueprintServicePromise,
  validateActivityNumbers,
  buildBlueprintDeliveryReport,
} from '../blueprint-methodology';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withBoard(graph: ServiceGraph, boardId: string, journeyId?: string): ServiceGraph {
  return {
    ...graph,
    views: {
      ...graph.views,
      whiteboards: {
        ...graph.views.whiteboards,
        [boardId]: {
          id: boardId,
          serviceId: 'S',
          name: 'Service Blueprint',
          viewKind: 'blueprint',
          journeyId: journeyId ?? '',
          items: {},
          createdAt: NOW,
          updatedAt: NOW,
        } as never,
      },
    },
  };
}

function withJourney(graph: ServiceGraph, id: string, stageIds: string[] = []): ServiceGraph {
  return {
    ...graph,
    service: { ...graph.service, journeyIds: [...(graph.service.journeyIds ?? []), id] },
    journeys: {
      ...graph.journeys,
      [id]: { id, serviceId: 'S', name: 'Journey', status: 'active', stageIds, owner: '', createdAt: NOW, updatedAt: NOW },
    },
  };
}

function withStage(graph: ServiceGraph, id: string, journeyId: string, customerAction = 'User clicks button'): ServiceGraph {
  // Update journey's stageIds
  const journey = graph.journeys[journeyId];
  return {
    ...graph,
    journeys: {
      ...graph.journeys,
      [journeyId]: { ...journey, stageIds: [...(journey?.stageIds ?? []), id] },
    },
    stages: {
      ...graph.stages,
      [id]: { id, serviceId: 'S', journeyId, title: `Stage ${id}`, customerAction, touchpointIds: [], createdAt: NOW, updatedAt: NOW } as never,
    },
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('BLUEPRINT_FRAME_LAYERS', () => {
  it('has 6 layers', () => {
    expect(BLUEPRINT_FRAME_LAYERS).toHaveLength(6);
  });

  it('contains evidence, customer, frontstage, backstage, process, enablement', () => {
    const keys = BLUEPRINT_FRAME_LAYERS.map(l => l.key);
    expect(keys).toContain('evidence');
    expect(keys).toContain('customer');
    expect(keys).toContain('frontstage');
    expect(keys).toContain('backstage');
    expect(keys).toContain('process');
    expect(keys).toContain('enablement');
  });

  it('marks evidence, customer, frontstage as visible to customer', () => {
    const visible = BLUEPRINT_FRAME_LAYERS.filter(l => l.visibleToCustomer).map(l => l.key);
    expect(visible).toContain('evidence');
    expect(visible).toContain('customer');
    expect(visible).toContain('frontstage');
    expect(visible).not.toContain('backstage');
    expect(visible).not.toContain('process');
    expect(visible).not.toContain('enablement');
  });
});

describe('BLUEPRINT_BOUNDARIES', () => {
  it('has 3 boundaries', () => {
    expect(BLUEPRINT_BOUNDARIES).toHaveLength(3);
  });

  it('defines interaction, visibility and internal boundaries', () => {
    const kinds = BLUEPRINT_BOUNDARIES.map(b => b.kind);
    expect(kinds).toContain('interaction');
    expect(kinds).toContain('visibility');
    expect(kinds).toContain('internal');
  });
});

describe('BLUEPRINT_MARKETING_DIMENSIONS', () => {
  it('has 7 dimensions (7P)', () => {
    expect(BLUEPRINT_MARKETING_DIMENSIONS).toHaveLength(7);
  });

  it('includes product, price, place, promotion, people, process, physicalEvidence', () => {
    const keys = BLUEPRINT_MARKETING_DIMENSIONS.map(d => d.key);
    expect(keys).toContain('product');
    expect(keys).toContain('price');
    expect(keys).toContain('place');
    expect(keys).toContain('promotion');
    expect(keys).toContain('people');
    expect(keys).toContain('process');
    expect(keys).toContain('physicalEvidence');
  });
});

describe('BLUEPRINT_QUALITY_DIMENSIONS', () => {
  it('has 5 SERVQUAL dimensions', () => {
    expect(BLUEPRINT_QUALITY_DIMENSIONS).toHaveLength(5);
  });

  it('contains reliability, responsiveness, assurance, empathy, tangibles', () => {
    const keys = BLUEPRINT_QUALITY_DIMENSIONS.map(d => d.key);
    expect(keys).toContain('reliability');
    expect(keys).toContain('responsiveness');
    expect(keys).toContain('assurance');
    expect(keys).toContain('empathy');
    expect(keys).toContain('tangibles');
  });
});

// ─── isCustomerServiceEvidence ────────────────────────────────────────────────

describe('isCustomerServiceEvidence', () => {
  it('returns false for undefined', () => {
    expect(isCustomerServiceEvidence(undefined)).toBe(false);
  });

  it('returns true for physical service evidence', () => {
    expect(isCustomerServiceEvidence({ evidencePurpose: 'service', evidenceMedium: 'physical' } as never)).toBe(true);
  });

  it('returns true for digital service evidence', () => {
    expect(isCustomerServiceEvidence({ evidencePurpose: 'service', evidenceMedium: 'digital' } as never)).toBe(true);
  });

  it('returns false for research evidence', () => {
    expect(isCustomerServiceEvidence({ evidencePurpose: 'research', evidenceMedium: 'physical' } as never)).toBe(false);
  });

  it('returns false for unknown medium', () => {
    expect(isCustomerServiceEvidence({ evidencePurpose: 'service', evidenceMedium: 'unknown' } as never)).toBe(false);
  });

  it('falls back to medium field', () => {
    expect(isCustomerServiceEvidence({ evidencePurpose: 'service', medium: 'documentary' } as never)).toBe(true);
  });
});

// ─── blueprintServicePromise ──────────────────────────────────────────────────

describe('blueprintServicePromise', () => {
  it('returns empty string when no data', () => {
    expect(blueprintServicePromise(base())).toBe('');
  });

  it('returns proposition promise when available', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        proposition: { current: { promise: 'We deliver in 24h' } },
      },
    } as never;
    expect(blueprintServicePromise(g)).toBe('We deliver in 24h');
  });

  it('uses strategy custom promise when promiseSource is custom', () => {
    const result = blueprintServicePromise(base(), { promiseSource: 'custom', servicePromise: 'Custom promise' } as never);
    expect(result).toBe('Custom promise');
  });

  it('falls back to project definition promise', () => {
    const g = {
      ...base(),
      service: { ...base().service, project: { definition: { promise: 'Project promise' } } },
    } as never;
    expect(blueprintServicePromise(g)).toBe('Project promise');
  });
});

// ─── validateActivityNumbers ──────────────────────────────────────────────────

describe('validateActivityNumbers', () => {
  it('returns empty array for valid activity numbers', () => {
    expect(validateActivityNumbers({ durationMinutes: 30, waitMinutes: 10, targetMinutes: 60, capacityPerHour: 5, demandPerHour: 3 })).toEqual([]);
  });

  it('flags Infinity values', () => {
    const result = validateActivityNumbers({ durationMinutes: Infinity } as never);
    expect(result).toContain('durationMinutes');
  });

  it('flags negative values', () => {
    const result = validateActivityNumbers({ waitMinutes: -5 } as never);
    expect(result).toContain('waitMinutes');
  });

  it('flags targetMinutes === 0', () => {
    const result = validateActivityNumbers({ targetMinutes: 0 } as never);
    expect(result).toContain('targetMinutes');
  });

  it('allows targetMinutes > 0', () => {
    const result = validateActivityNumbers({ targetMinutes: 1 } as never);
    expect(result).not.toContain('targetMinutes');
  });

  it('ignores undefined fields', () => {
    const result = validateActivityNumbers({});
    expect(result).toEqual([]);
  });
});

// ─── buildBlueprintDeliveryReport ─────────────────────────────────────────────

describe('buildBlueprintDeliveryReport', () => {
  it('returns board-missing issue when boardId is invalid', () => {
    const report = buildBlueprintDeliveryReport(base(), 'missing-board');
    expect(report.status).toBe('incomplete');
    expect(report.issues.some(i => i.code === 'board-missing')).toBe(true);
  });

  it('returns stages-missing issue for board without stages', () => {
    const g = withBoard(withJourney(base(), 'j1'), 'board1', 'j1');
    const report = buildBlueprintDeliveryReport(g, 'board1');
    expect(report.issues.some(i => i.code === 'stages-missing')).toBe(true);
  });

  it('returns promise-missing warning when no promise is defined', () => {
    const g = withBoard(withJourney(base(), 'j1'), 'board1', 'j1');
    const report = buildBlueprintDeliveryReport(g, 'board1');
    expect(report.issues.some(i => i.code === 'promise-missing')).toBe(true);
  });

  it('coverage.total increases per stage × BLUEPRINT_FRAME_LAYERS.length', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 's1', 'j1');
    g = withStage(g, 's2', 'j1');
    g = withBoard(g, 'board1', 'j1');
    const report = buildBlueprintDeliveryReport(g, 'board1');
    // 2 stages × 6 layers = 12
    expect(report.coverage.total).toBe(12);
  });

  it('status is incomplete when there are critical issues', () => {
    const report = buildBlueprintDeliveryReport(base(), 'missing');
    expect(report.status).toBe('incomplete');
  });

  it('reports marketing completeness', () => {
    const g = withBoard(withJourney(base(), 'j1'), 'board1', 'j1');
    const report = buildBlueprintDeliveryReport(g, 'board1');
    expect(report.marketing.total).toBe(7);
    expect(report.marketing.complete).toBe(0);
    expect(report.marketing.missing).toHaveLength(7);
  });

  it('issues include customer-action critical issue per stage without customerAction', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 's1', 'j1', ''); // empty customerAction
    g = withBoard(g, 'board1', 'j1');
    const report = buildBlueprintDeliveryReport(g, 'board1');
    expect(report.issues.some(i => i.code === 'customer-action')).toBe(true);
  });

  it('no customer-action issue when stage has customerAction', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 's1', 'j1', 'User clicks button');
    g = withBoard(g, 'board1', 'j1');
    const report = buildBlueprintDeliveryReport(g, 'board1');
    expect(report.issues.some(i => i.code === 'customer-action')).toBe(false);
  });
});

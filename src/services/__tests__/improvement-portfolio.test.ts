import { describe, it, expect } from 'vitest';
import {
  IMPROVEMENT_INITIATIVE_STATUS_LABELS,
  IMPROVEMENT_INITIATIVE_RISK_LABELS,
  emptyImprovementPortfolioState,
  normalizeImprovementPortfolioState,
  eligibleImprovementOpportunities,
  createImprovementInitiative,
  updateImprovementInitiative,
  buildImprovementPortfolioReport,
} from '../improvement-portfolio';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

/** Add an opportunity to the backlog with the given status */
function withOpportunity(graph: ServiceGraph, id: string, status = 'selected', problemIds: string[] = []): ServiceGraph {
  const existing = (graph.service as unknown as Record<string, unknown>)['improvementBacklog'] as Record<string, unknown> | undefined;
  return {
    ...graph,
    service: {
      ...graph.service,
      improvementBacklog: {
        version: 1,
        opportunities: {
          ...((existing?.['opportunities'] as Record<string, unknown>) ?? {}),
          [id]: { id, serviceId: 'S', title: `Opportunity ${id}`, status, problemIds, owner: '', note: '', updatedAt: NOW, createdAt: NOW },
        },
        problems: (existing?.['problems'] as Record<string, unknown>) ?? {},
        updatedAt: NOW,
      },
    },
  } as ServiceGraph;
}

function withInitiative(graph: ServiceGraph, id: string, opportunityId: string, status = 'backlog'): ServiceGraph {
  const existing = (graph.service as unknown as Record<string, unknown>)['improvementPortfolio'] as Record<string, unknown> | undefined;
  return {
    ...graph,
    service: {
      ...graph.service,
      improvementPortfolio: {
        version: 1,
        initiatives: {
          ...((existing?.['initiatives'] as Record<string, unknown>) ?? {}),
          [id]: {
            id, serviceId: 'S', opportunityId, title: `Initiative ${id}`,
            status, effort: 3, expectedImpact: 4, deliveryRisk: 'medium',
            progress: 0, problemIds: [], dependencyIds: [], decisionIds: [],
            experimentIds: [], metricIds: [], createdAt: NOW, updatedAt: NOW,
          },
        },
        updatedAt: NOW,
      },
    },
  } as ServiceGraph;
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('IMPROVEMENT_INITIATIVE_STATUS_LABELS covers all statuses', () => {
    expect(Object.keys(IMPROVEMENT_INITIATIVE_STATUS_LABELS)).toEqual(
      expect.arrayContaining(['backlog', 'planned', 'in_progress', 'validating', 'implemented'])
    );
  });

  it('IMPROVEMENT_INITIATIVE_RISK_LABELS covers all risk levels', () => {
    expect(Object.keys(IMPROVEMENT_INITIATIVE_RISK_LABELS)).toEqual(
      expect.arrayContaining(['low', 'medium', 'high'])
    );
  });
});

// ─── emptyImprovementPortfolioState ───────────────────────────────────────────

describe('emptyImprovementPortfolioState', () => {
  it('returns version 1 with empty initiatives', () => {
    const state = emptyImprovementPortfolioState(NOW);
    expect(state.version).toBe(1);
    expect(state.initiatives).toEqual({});
    expect(state.updatedAt).toBe(NOW);
  });
});

// ─── normalizeImprovementPortfolioState ───────────────────────────────────────

describe('normalizeImprovementPortfolioState', () => {
  it('returns empty state when no portfolio in service', () => {
    const state = normalizeImprovementPortfolioState(base(), NOW);
    expect(state.version).toBe(1);
    expect(state.initiatives).toEqual({});
  });

  it('returns existing initiatives', () => {
    const g = withOpportunity(base(), 'opp1');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const state = normalizeImprovementPortfolioState(g2, NOW);
    expect(state.initiatives['init1']).toBeDefined();
  });
});

// ─── eligibleImprovementOpportunities ─────────────────────────────────────────

describe('eligibleImprovementOpportunities', () => {
  it('returns empty for graph with no backlog', () => {
    expect(eligibleImprovementOpportunities(base())).toHaveLength(0);
  });

  it('returns selected/planned opportunities not yet in portfolio', () => {
    const g = withOpportunity(base(), 'opp1', 'selected');
    const result = eligibleImprovementOpportunities(g);
    expect(result.some(o => o.id === 'opp1')).toBe(true);
  });

  it('excludes opportunities already in portfolio', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1' }, NOW);
    const result = eligibleImprovementOpportunities(g2);
    expect(result.some(o => o.id === 'opp1')).toBe(false);
  });

  it('excludes opportunities with status other than selected/planned', () => {
    const g = withOpportunity(base(), 'opp1', 'draft');
    expect(eligibleImprovementOpportunities(g)).toHaveLength(0);
  });
});

// ─── createImprovementInitiative ──────────────────────────────────────────────

describe('createImprovementInitiative', () => {
  it('creates initiative from selected opportunity', () => {
    const g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2, initiativeId, created } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    expect(created).toBe(true);
    expect(initiativeId).toBe('init1');
    const state = normalizeImprovementPortfolioState(g2, NOW);
    expect(state.initiatives['init1'].opportunityId).toBe('opp1');
    expect(state.initiatives['init1'].status).toBe('backlog');
  });

  it('uses opportunity title when no title provided', () => {
    const g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2, initiativeId } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const state = normalizeImprovementPortfolioState(g2, NOW);
    expect(state.initiatives[initiativeId!].title).toBe('Opportunity opp1');
  });

  it('uses provided title when given', () => {
    const g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2, initiativeId } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1', title: 'Custom Title' }, NOW);
    const state = normalizeImprovementPortfolioState(g2, NOW);
    expect(state.initiatives[initiativeId!].title).toBe('Custom Title');
  });

  it('returns reason=opportunity_not_found for missing opportunity', () => {
    const g = base();
    const { initiativeId, created, reason } = createImprovementInitiative(g, { opportunityId: 'missing' }, NOW);
    expect(created).toBe(false);
    expect(initiativeId).toBeNull();
    expect(reason).toBe('opportunity_not_found');
  });

  it('returns reason=opportunity_not_selected for draft opportunity', () => {
    const g = withOpportunity(base(), 'opp1', 'draft');
    const { created, reason } = createImprovementInitiative(g, { opportunityId: 'opp1' }, NOW);
    expect(created).toBe(false);
    expect(reason).toBe('opportunity_not_selected');
  });

  it('returns reason=already_exists when initiative for opportunity exists', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const { created, reason, initiativeId } = createImprovementInitiative(g2, { opportunityId: 'opp1' }, NOW);
    expect(created).toBe(false);
    expect(reason).toBe('already_exists');
    expect(initiativeId).toBe('init1');
  });

  it('applies clamped effort and expectedImpact', () => {
    const g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2, initiativeId } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1', effort: 10, expectedImpact: 0 }, NOW);
    const state = normalizeImprovementPortfolioState(g2, NOW);
    expect(state.initiatives[initiativeId!].effort).toBe(5);
    expect(state.initiatives[initiativeId!].expectedImpact).toBe(1);
  });
});

// ─── updateImprovementInitiative ──────────────────────────────────────────────

describe('updateImprovementInitiative', () => {
  it('updates status and progress', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const g3 = updateImprovementInitiative(g2, 'init1', { status: 'in_progress', progress: 50 }, NOW);
    const state = normalizeImprovementPortfolioState(g3, NOW);
    expect(state.initiatives['init1'].status).toBe('in_progress');
    expect(state.initiatives['init1'].progress).toBe(50);
  });

  it('sets progress to 100 when status is implemented', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const g3 = updateImprovementInitiative(g2, 'init1', { status: 'implemented' }, NOW);
    const state = normalizeImprovementPortfolioState(g3, NOW);
    expect(state.initiatives['init1'].progress).toBe(100);
    expect(state.initiatives['init1'].implementedAt).toBe(NOW);
  });

  it('no-op for missing initiative', () => {
    const g = withOpportunity(base(), 'opp1', 'selected');
    const g2 = updateImprovementInitiative(g, 'ghost', { status: 'planned' }, NOW);
    expect(g2).toBe(g); // returned unchanged
  });

  it('filters out invalid dependencyIds', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const g3 = updateImprovementInitiative(g2, 'init1', { dependencyIds: ['nonexistent'] }, NOW);
    const state = normalizeImprovementPortfolioState(g3, NOW);
    expect(state.initiatives['init1'].dependencyIds).toEqual([]);
  });

  it('allows valid dependency between two initiatives', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    g = withOpportunity(g, 'opp2', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const { graph: g3 } = createImprovementInitiative(g2, { opportunityId: 'opp2', id: 'init2' }, NOW);
    const g4 = updateImprovementInitiative(g3, 'init2', { dependencyIds: ['init1'] }, NOW);
    const state = normalizeImprovementPortfolioState(g4, NOW);
    expect(state.initiatives['init2'].dependencyIds).toEqual(['init1']);
  });

  it('updates title and owner', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const g3 = updateImprovementInitiative(g2, 'init1', { title: 'New Title', owner: 'Alice' }, NOW);
    const state = normalizeImprovementPortfolioState(g3, NOW);
    expect(state.initiatives['init1'].title).toBe('New Title');
    expect(state.initiatives['init1'].owner).toBe('Alice');
  });

  it('clears owner when empty string provided', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1', owner: 'Alice' }, NOW);
    const g3 = updateImprovementInitiative(g2, 'init1', { owner: '' }, NOW);
    const state = normalizeImprovementPortfolioState(g3, NOW);
    expect(state.initiatives['init1'].owner).toBeUndefined();
  });
});

// ─── buildImprovementPortfolioReport ──────────────────────────────────────────

describe('buildImprovementPortfolioReport', () => {
  it('returns empty initiatives and counts for empty portfolio', () => {
    const report = buildImprovementPortfolioReport(base(), NOW);
    expect(report.initiatives).toHaveLength(0);
    expect(report.counts.initiatives).toBe(0);
    expect(report.portfolioReady).toBe(false);
    expect(report.averageProgress).toBe(0);
  });

  it('computes counts correctly with one initiative', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const report = buildImprovementPortfolioReport(g2, NOW);
    expect(report.counts.initiatives).toBe(1);
    expect(report.counts.backlog).toBe(1);
    expect(report.portfolioReady).toBe(true);
  });

  it('marks initiative as blocked when dependency is not implemented', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    g = withOpportunity(g, 'opp2', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const { graph: g3 } = createImprovementInitiative(g2, { opportunityId: 'opp2', id: 'init2' }, NOW);
    const g4 = updateImprovementInitiative(g3, 'init2', { dependencyIds: ['init1'] }, NOW);
    const report = buildImprovementPortfolioReport(g4, NOW);
    const init2 = report.initiatives.find(i => i.id === 'init2');
    expect(init2?.blocked).toBe(true);
    expect(report.counts.blocked).toBe(1);
  });

  it('marks initiative as overdue when targetDate is in the past', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const g3 = updateImprovementInitiative(g2, 'init1', { status: 'in_progress', targetDate: '2020-01-01' }, NOW);
    const report = buildImprovementPortfolioReport(g3, NOW);
    expect(report.counts.overdue).toBe(1);
  });

  it('computes averageProgress', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const g3 = updateImprovementInitiative(g2, 'init1', { progress: 60 }, NOW);
    const report = buildImprovementPortfolioReport(g3, NOW);
    expect(report.averageProgress).toBe(60);
  });

  it('computes valueScore from impact and effort', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1', expectedImpact: 5, effort: 1 }, NOW);
    const report = buildImprovementPortfolioReport(g2, NOW);
    const init = report.initiatives.find(i => i.id === 'init1');
    // valueScore = round((5*0.7 + (6-1)*0.3) / 5 * 100) = round((3.5+1.5)/5*100) = 100
    expect(init?.valueScore).toBe(100);
  });

  it('sorts by status rank, then valueScore descending', () => {
    let g = withOpportunity(base(), 'opp1', 'selected');
    g = withOpportunity(g, 'opp2', 'selected');
    const { graph: g2 } = createImprovementInitiative(g, { opportunityId: 'opp1', id: 'init1' }, NOW);
    const { graph: g3 } = createImprovementInitiative(g2, { opportunityId: 'opp2', id: 'init2' }, NOW);
    const g4 = updateImprovementInitiative(g3, 'init2', { status: 'in_progress' }, NOW);
    const report = buildImprovementPortfolioReport(g4, NOW);
    expect(report.initiatives[0].id).toBe('init2'); // in_progress ranks before backlog
  });
});

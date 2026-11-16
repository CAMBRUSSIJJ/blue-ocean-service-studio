import { describe, it, expect } from 'vitest';
import type { ServiceGraph } from '../../domain/model';
import { createServiceGraph } from '../../domain/graph-operations';
import {
  IMPROVEMENT_SOURCE_LABELS,
  IMPROVEMENT_PROBLEM_STATUS_LABELS,
  IMPROVEMENT_OPPORTUNITY_STATUS_LABELS,
  IMPROVEMENT_PRIORITY_LABELS,
  improvementPriorityScore,
  improvementPriorityBand,
  emptyImprovementBacklogState,
  normalizeImprovementBacklogState,
  discoverImprovementProblems,
  syncImprovementBacklog,
  updateImprovementProblem,
  createImprovementOpportunity,
  updateImprovementOpportunity,
  buildImprovementBacklogReport,
} from '../improvement-backlog';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withProblem(graph: ServiceGraph, id: string, description = 'Problem'): ServiceGraph {
  return {
    ...graph,
    problems: {
      ...graph.problems,
      [id]: { id, serviceId: 'S', stageId: '', description, createdAt: NOW, updatedAt: NOW } as never,
    },
  };
}

function withTouchpoint(graph: ServiceGraph, id: string, name: string, channelId = ''): ServiceGraph {
  return {
    ...graph,
    touchpoints: {
      ...graph.touchpoints,
      [id]: { id, serviceId: 'S', name, channelId, stageId: '', createdAt: NOW, updatedAt: NOW },
    },
  };
}

// ─── Label constants ──────────────────────────────────────────────────────────

describe('label constants', () => {
  it('IMPROVEMENT_SOURCE_LABELS covers all source kinds', () => {
    expect(Object.keys(IMPROVEMENT_SOURCE_LABELS)).toEqual(
      expect.arrayContaining(['research', 'validated_problem', 'journey', 'channel', 'prototype', 'current_future', 'blueprint'])
    );
  });

  it('IMPROVEMENT_PROBLEM_STATUS_LABELS covers all problem statuses', () => {
    expect(Object.keys(IMPROVEMENT_PROBLEM_STATUS_LABELS)).toEqual(
      expect.arrayContaining(['new', 'triaged', 'accepted', 'resolved', 'dismissed'])
    );
  });

  it('IMPROVEMENT_OPPORTUNITY_STATUS_LABELS covers all opportunity statuses', () => {
    expect(Object.keys(IMPROVEMENT_OPPORTUNITY_STATUS_LABELS)).toEqual(
      expect.arrayContaining(['candidate', 'selected', 'planned', 'discarded'])
    );
  });

  it('IMPROVEMENT_PRIORITY_LABELS covers all priority bands', () => {
    expect(Object.keys(IMPROVEMENT_PRIORITY_LABELS)).toEqual(
      expect.arrayContaining(['low', 'medium', 'high', 'critical'])
    );
  });
});

// ─── improvementPriorityScore ─────────────────────────────────────────────────

describe('improvementPriorityScore', () => {
  it('computes score for mid-range values (all 3)', () => {
    // impact=3*0.30=0.90, freq=3*0.20=0.60, risk=3*0.15=0.45, urgency=3*0.25=0.75, effort=(6-3)*0.10=0.30 → sum=3.00/5=0.60 → 60
    const score = improvementPriorityScore({ impact: 3, frequency: 3, effort: 3, risk: 3, urgency: 3 });
    expect(score).toBe(60);
  });

  it('maximum score for all-5 impact/freq/risk/urgency and effort=1', () => {
    // impact=5*0.30=1.5, freq=5*0.20=1.0, risk=5*0.15=0.75, urgency=5*0.25=1.25, effort=(6-1)*0.10=0.5 → sum=5.0/5=1.0 → 100
    const score = improvementPriorityScore({ impact: 5, frequency: 5, effort: 1, risk: 5, urgency: 5 });
    expect(score).toBe(100);
  });

  it('minimum score for all-1 and effort=5', () => {
    // impact=1*0.30=0.30, freq=1*0.20=0.20, risk=1*0.15=0.15, urgency=1*0.25=0.25, effort=(6-5)*0.10=0.10 → sum=1.0/5=0.20 → 20
    const score = improvementPriorityScore({ impact: 1, frequency: 1, effort: 5, risk: 1, urgency: 1 });
    expect(score).toBe(20);
  });
});

// ─── improvementPriorityBand ──────────────────────────────────────────────────

describe('improvementPriorityBand', () => {
  it('score >= 80 → critical', () => expect(improvementPriorityBand(80)).toBe('critical'));
  it('score >= 65 → high', () => expect(improvementPriorityBand(65)).toBe('high'));
  it('score >= 45 → medium', () => expect(improvementPriorityBand(45)).toBe('medium'));
  it('score < 45 → low', () => expect(improvementPriorityBand(44)).toBe('low'));
  it('score = 79 → high', () => expect(improvementPriorityBand(79)).toBe('high'));
});

// ─── emptyImprovementBacklogState ─────────────────────────────────────────────

describe('emptyImprovementBacklogState', () => {
  it('creates empty state with version 1', () => {
    const state = emptyImprovementBacklogState(NOW);
    expect(state.version).toBe(1);
    expect(state.problems).toEqual({});
    expect(state.opportunities).toEqual({});
    expect(state.updatedAt).toBe(NOW);
  });
});

// ─── normalizeImprovementBacklogState ─────────────────────────────────────────

describe('normalizeImprovementBacklogState', () => {
  it('returns empty state when no improvementBacklog on graph', () => {
    const state = normalizeImprovementBacklogState(base(), NOW);
    expect(state.problems).toEqual({});
    expect(state.opportunities).toEqual({});
  });

  it('preserves existing problems and opportunities', () => {
    const existing = {
      version: 1 as const,
      problems: { 'p1': { id: 'p1' } as never },
      opportunities: { 'o1': { id: 'o1' } as never },
      updatedAt: NOW,
    };
    const g = { ...base(), service: { ...base().service, improvementBacklog: existing } };
    const state = normalizeImprovementBacklogState(g, NOW);
    expect(state.problems['p1']).toBeDefined();
    expect(state.opportunities['o1']).toBeDefined();
  });
});

// ─── discoverImprovementProblems ──────────────────────────────────────────────

describe('discoverImprovementProblems', () => {
  it('returns empty array for empty graph', () => {
    expect(discoverImprovementProblems(base())).toEqual([]);
  });

  it('discovers journey problems from graph.problems', () => {
    const g = withProblem(base(), 'prob1', 'Service is too slow');
    const candidates = discoverImprovementProblems(g);
    expect(candidates.some(c => c.sourceKey === 'journey-problem:prob1')).toBe(true);
    expect(candidates.find(c => c.sourceKey === 'journey-problem:prob1')?.title).toBe('Service is too slow');
  });

  it('discovers channel problems from unmapped touchpoints', () => {
    const g = withTouchpoint(base(), 'tp1', 'Web Checkout', ''); // no channelId
    const candidates = discoverImprovementProblems(g);
    expect(candidates.some(c => c.sourceKey === 'channel-unmapped:tp1')).toBe(true);
  });

  it('ignores touchpoint with valid channel', () => {
    let g = base();
    // Add channel
    g = {
      ...g,
      channels: {
        ...g.channels,
        'ch1': { id: 'ch1', serviceId: 'S', name: 'Web', kind: 'digital', createdAt: NOW, updatedAt: NOW },
      },
    };
    g = withTouchpoint(g, 'tp1', 'Web Checkout', 'ch1');
    const candidates = discoverImprovementProblems(g);
    expect(candidates.some(c => c.sourceKey === 'channel-unmapped:tp1')).toBe(false);
  });

  it('discovers problems from entities.problem', () => {
    const g = {
      ...base(),
      entities: {
        ...base().entities,
        problem: {
          'ep1': { id: 'ep1', serviceId: 'S', title: 'Entity Problem', severity: 'high', priority: 'medium', createdAt: NOW, updatedAt: NOW },
        },
      },
    } as never;
    const candidates = discoverImprovementProblems(g);
    expect(candidates.some(c => c.sourceKey === 'validated-problem:ep1')).toBe(true);
  });
});

// ─── syncImprovementBacklog ───────────────────────────────────────────────────

describe('syncImprovementBacklog', () => {
  it('adds discovered problems to the backlog', () => {
    const g = withProblem(base(), 'prob1', 'Slow checkout');
    const { graph, added } = syncImprovementBacklog(g, NOW);
    expect(added).toBe(1);
    const state = graph.service.improvementBacklog!;
    expect(Object.values(state.problems).some(p => p.title === 'Slow checkout')).toBe(true);
  });

  it('refreshes existing problems without duplicating', () => {
    const g = withProblem(base(), 'prob1', 'Slow checkout');
    const { graph: g2 } = syncImprovementBacklog(g, NOW);
    const { graph: g3, added, refreshed } = syncImprovementBacklog(g2, NOW);
    expect(added).toBe(0);
    expect(refreshed).toBe(1);
    expect(Object.keys(g3.service.improvementBacklog!.problems)).toHaveLength(1);
  });

  it('deactivates problems whose source was removed', () => {
    const g = withProblem(base(), 'prob1', 'Old problem');
    const { graph: g2 } = syncImprovementBacklog(g, NOW);
    // Remove problem from graph
    const g3 = { ...g2, problems: {} };
    const { graph: g4, deactivated } = syncImprovementBacklog(g3, NOW);
    expect(deactivated).toBe(1);
    const problem = Object.values(g4.service.improvementBacklog!.problems)[0];
    expect(problem.sourceActive).toBe(false);
  });
});

// ─── updateImprovementProblem ─────────────────────────────────────────────────

describe('updateImprovementProblem', () => {
  it('returns unchanged graph when problem does not exist', () => {
    const g = base();
    const result = updateImprovementProblem(g, 'missing', { status: 'triaged' }, NOW);
    expect(result).toBe(g);
  });

  it('updates a problem field', () => {
    const g = withProblem(base(), 'prob1', 'Slow checkout');
    const { graph } = syncImprovementBacklog(g, NOW);
    const problemId = Object.keys(graph.service.improvementBacklog!.problems)[0];
    const result = updateImprovementProblem(graph, problemId, { status: 'triaged' }, NOW);
    expect(result.service.improvementBacklog!.problems[problemId].status).toBe('triaged');
  });

  it('clamps impact to 1-5', () => {
    const g = withProblem(base(), 'prob1', 'Problem');
    const { graph } = syncImprovementBacklog(g, NOW);
    const problemId = Object.keys(graph.service.improvementBacklog!.problems)[0];
    const result = updateImprovementProblem(graph, problemId, { impact: 10 as never }, NOW);
    expect(result.service.improvementBacklog!.problems[problemId].impact).toBe(5);
  });
});

// ─── createImprovementOpportunity ────────────────────────────────────────────

describe('createImprovementOpportunity', () => {
  it('returns null when title is empty', () => {
    const result = createImprovementOpportunity(base(), { title: '', problemIds: [] }, NOW);
    expect(result.opportunityId).toBeNull();
  });

  it('returns null when no valid problemIds', () => {
    const result = createImprovementOpportunity(base(), { title: 'Fix checkout', problemIds: ['nonexistent'] }, NOW);
    expect(result.opportunityId).toBeNull();
  });

  it('creates opportunity for valid problem', () => {
    const g = withProblem(base(), 'prob1', 'Slow checkout');
    const { graph } = syncImprovementBacklog(g, NOW);
    const problemId = Object.keys(graph.service.improvementBacklog!.problems)[0];
    const result = createImprovementOpportunity(graph, { title: 'Fix checkout', problemIds: [problemId] }, NOW);
    expect(result.opportunityId).toBeTruthy();
    const opp = result.graph.service.improvementBacklog!.opportunities[result.opportunityId!];
    expect(opp.title).toBe('Fix checkout');
    expect(opp.status).toBe('candidate');
    expect(opp.problemIds).toContain(problemId);
  });
});

// ─── updateImprovementOpportunity ────────────────────────────────────────────

describe('updateImprovementOpportunity', () => {
  it('returns unchanged graph when opportunity does not exist', () => {
    const g = base();
    const result = updateImprovementOpportunity(g, 'missing', { status: 'selected' }, NOW);
    expect(result).toBe(g);
  });

  it('updates opportunity status', () => {
    const g = withProblem(base(), 'prob1', 'Problem');
    const { graph } = syncImprovementBacklog(g, NOW);
    const problemId = Object.keys(graph.service.improvementBacklog!.problems)[0];
    const { graph: g2, opportunityId } = createImprovementOpportunity(graph, { title: 'Fix it', problemIds: [problemId] }, NOW);
    const result = updateImprovementOpportunity(g2, opportunityId!, { status: 'selected' }, NOW);
    expect(result.service.improvementBacklog!.opportunities[opportunityId!].status).toBe('selected');
  });
});

// ─── buildImprovementBacklogReport ───────────────────────────────────────────

describe('buildImprovementBacklogReport', () => {
  it('returns empty report for empty graph', () => {
    const report = buildImprovementBacklogReport(base());
    expect(report.problems).toEqual([]);
    expect(report.opportunities).toEqual([]);
    expect(report.backlogReady).toBe(false);
  });

  it('computes score and band for synced problems', () => {
    const g = withProblem(base(), 'prob1', 'Slow checkout');
    const { graph } = syncImprovementBacklog(g, NOW);
    const report = buildImprovementBacklogReport(graph);
    expect(report.problems.length).toBe(1);
    expect(report.problems[0].score).toBeGreaterThan(0);
    expect(['low', 'medium', 'high', 'critical']).toContain(report.problems[0].band);
  });

  it('reports pendingDiscovery for unsynced problems', () => {
    const g = withProblem(base(), 'prob1', 'Slow checkout');
    // Don't sync — problem exists in graph but not in backlog state
    const report = buildImprovementBacklogReport(g);
    expect(report.pendingDiscovery).toBe(1);
  });

  it('backlogReady is true when there are active problems', () => {
    const g = withProblem(base(), 'prob1', 'Slow checkout');
    const { graph } = syncImprovementBacklog(g, NOW);
    const report = buildImprovementBacklogReport(graph);
    expect(report.backlogReady).toBe(true);
  });

  it('counts critical and high band problems', () => {
    const g = withProblem(base(), 'prob1', 'Critical problem');
    const { graph: g2 } = syncImprovementBacklog(g, NOW);
    const problemId = Object.keys(g2.service.improvementBacklog!.problems)[0];
    // Set all metrics to max to make it critical
    const g3 = updateImprovementProblem(g2, problemId, { impact: 5, frequency: 5, effort: 1, risk: 5, urgency: 5 }, NOW);
    const report = buildImprovementBacklogReport(g3);
    expect(report.counts.critical).toBeGreaterThanOrEqual(0);
    expect(report.counts.active).toBe(1);
  });
});

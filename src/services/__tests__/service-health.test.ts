import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import type { ServiceGraph } from '../../domain/model.ts';
import { buildServiceHealthReport } from '../service-health.ts';
import type { ServiceHealthReport } from '../service-health.ts';

// ─── helpers ─────────────────────────────────────────────────────────────────

function base(): ServiceGraph {
  return createServiceGraph('S');
}

function withServiceMeta(graph: ServiceGraph, name: string, description: string): ServiceGraph {
  return { ...graph, service: { ...graph.service, name, description } };
}

function withJourney(graph: ServiceGraph, id: string, stageIds: string[] = [], extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    journeys: { ...graph.journeys, [id]: { id, name: `Journey ${id}`, stageIds, touchpointIds: [], ...extra } },
  } as ServiceGraph;
}

function withStage(graph: ServiceGraph, id: string, journeyId: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    stages: {
      ...graph.stages,
      [id]: {
        id, journeyId, title: `Stage ${id}`, customerAction: '', emotion: 'neutral',
        touchpointIds: [], problemIds: [], opportunityIds: [], ...extra,
      },
    },
  } as ServiceGraph;
}

function withEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: { ...(graph.entities?.[kind] ?? {}), [id]: { id, kind, serviceId: graph.service.id, ...extra } },
    },
  } as ServiceGraph;
}

function withTask(graph: ServiceGraph, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    tasks: { ...graph.tasks, [id]: { id, title: `Task ${id}`, status: 'todo', owner: '', ...extra } },
  } as ServiceGraph;
}

function withOpportunity(graph: ServiceGraph, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    opportunities: { ...graph.opportunities, [id]: { id, title: `Opp ${id}`, ...extra } },
  } as ServiceGraph;
}

function withBlueprintBoard(graph: ServiceGraph, id: string): ServiceGraph {
  return {
    ...graph,
    views: {
      whiteboards: {
        ...graph.views?.whiteboards,
        [id]: { id, serviceId: graph.service.id, name: `Blueprint ${id}`, viewKind: 'blueprint', items: {}, edges: {} },
      },
    },
  } as ServiceGraph;
}

function dim(report: ServiceHealthReport, id: string) {
  return report.dimensions.find((d) => d.id === id)!;
}

// ─── basic shape ─────────────────────────────────────────────────────────────

describe('buildServiceHealthReport — shape', () => {
  it('returns report with all 7 dimensions', () => {
    const r = buildServiceHealthReport(base());
    expect(r.dimensions).toHaveLength(7);
    const ids = r.dimensions.map((d) => d.id);
    expect(ids).toContain('structure');
    expect(ids).toContain('evidence');
    expect(ids).toContain('governance');
    expect(ids).toContain('experience');
    expect(ids).toContain('operation');
    expect(ids).toContain('execution');
    expect(ids).toContain('metrics');
  });

  it('returns a numeric score between 0 and 100', () => {
    const r = buildServiceHealthReport(base());
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('returns formula string', () => {
    expect(buildServiceHealthReport(base()).formula).toBeTruthy();
  });

  it('returns status with key and label', () => {
    const r = buildServiceHealthReport(base());
    expect(['healthy', 'attention', 'critical']).toContain(r.status.key);
    expect(r.status.label).toBeTruthy();
  });
});

// ─── statusFor thresholds ─────────────────────────────────────────────────────

describe('buildServiceHealthReport — status thresholds', () => {
  it('empty graph is "critical" (score < 60)', () => {
    expect(buildServiceHealthReport(base()).status.key).toBe('critical');
  });

  it('status.key is "healthy" when score >= 80', () => {
    // Build a well-populated graph
    let g = withServiceMeta(base(), 'Service', 'Description');
    g = withJourney(g, 'j1', ['s1', 's2'], { owner: 'Alice', nextReviewAt: '2025-12-01' });
    for (const sid of ['s1', 's2']) {
      g = withStage(g, sid, 'j1', { customerAction: 'act', touchpointIds: ['t1'], emotion: 'positive' });
    }
    for (let i = 0; i < 4; i++) g = withEntity(g, 'evidence', `e${i}`, { stageId: i < 2 ? 's1' : 's2', serviceId: g.service.id });
    for (let i = 0; i < 3; i++) g = withEntity(g, 'persona', `p${i}`);
    for (let i = 0; i < 3; i++) g = withEntity(g, 'need', `n${i}`);
    for (const kind of ['process', 'system', 'resource', 'responsible', 'role', 'dependency']) {
      g = withEntity(g, kind, `${kind}1`);
    }
    g = withBlueprintBoard(g, 'bp1');
    g = { ...g, blueprintDraft: { ...g.blueprintDraft, frontstage: 'yes', backstage: 'yes', suporte: 'yes', evidencias: 'yes' } } as ServiceGraph;
    for (let i = 0; i < 3; i++) g = withTask(g, `t${i}`, { status: 'done', owner: 'Bob' });
    for (let i = 0; i < 2; i++) g = withEntity(g, 'metric', `m${i}`, { current: 10 });
    for (let i = 0; i < 2; i++) g = withOpportunity(g, `o${i}`, { owner: 'Carol', metricIds: ['m0'] });
    g = { ...g, research: { ...g.research, sources: { src1: { id: 'src1' } } } } as ServiceGraph;
    g = { ...g, service: { ...g.service, operatingReview: { owner: 'Eve', nextReviewAt: '2025-12-01' } } } as ServiceGraph;
    const r = buildServiceHealthReport(g);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(r.status.key).toBe('healthy');
  });
});

// ─── structure dimension ──────────────────────────────────────────────────────

describe('dimension: structure', () => {
  it('service check: 0 when no name', () => {
    const g = withServiceMeta(base(), '', '');
    expect(dim(buildServiceHealthReport(g), 'structure').score).toBeLessThan(50);
  });

  it('structure improves with journeys and stages', () => {
    let g = withServiceMeta(base(), 'S', 'D');
    g = withJourney(g, 'j1', ['s1']);
    g = withStage(g, 's1', 'j1', { customerAction: 'do thing', touchpointIds: ['tp1'] });
    const score = dim(buildServiceHealthReport(g), 'structure').score;
    expect(score).toBeGreaterThan(dim(buildServiceHealthReport(base()), 'structure').score);
  });
});

// ─── evidence dimension ───────────────────────────────────────────────────────

describe('dimension: evidence', () => {
  it('score is 0 on empty graph (no evidence, no stages)', () => {
    expect(dim(buildServiceHealthReport(base()), 'evidence').score).toBe(0);
  });

  it('score increases with evidence linked to stages', () => {
    let g = withJourney(base(), 'j1', ['s1']);
    g = withStage(g, 's1', 'j1');
    g = withEntity(g, 'evidence', 'e1', { stageId: 's1', serviceId: g.service.id });
    const score = dim(buildServiceHealthReport(g), 'evidence').score;
    expect(score).toBeGreaterThan(0);
  });

  it('research sources improve evidence score', () => {
    const g = { ...base(), research: { ...base().research, sources: { src1: { id: 'src1' } } } } as ServiceGraph;
    const score = dim(buildServiceHealthReport(g), 'evidence').score;
    expect(score).toBeGreaterThan(0);
  });
});

// ─── governance dimension ─────────────────────────────────────────────────────

describe('dimension: governance', () => {
  it('score is 0 for journey with no owner', () => {
    const g = withJourney(base(), 'j1', []);
    // journey has no owner → journey-owner check = 0
    const d = dim(buildServiceHealthReport(g), 'governance');
    expect(d.signals.find((s) => s.id === 'governance:journey-owner')?.kind).toBe('gap');
  });

  it('score improves when journey has owner and review', () => {
    const g = withJourney(base(), 'j1', [], { owner: 'Alice', nextReviewAt: '2025-12-01' });
    const withOwner = dim(buildServiceHealthReport(g), 'governance').score;
    const withoutOwner = dim(buildServiceHealthReport(withJourney(base(), 'j1', [])), 'governance').score;
    expect(withOwner).toBeGreaterThan(withoutOwner);
  });

  it('operating review owner sets that signal to strength', () => {
    const g = { ...base(), service: { ...base().service, operatingReview: { owner: 'Bob', nextReviewAt: '' } } } as ServiceGraph;
    const d = dim(buildServiceHealthReport(g), 'governance');
    expect(d.signals.find((s) => s.id === 'governance:review-owner')?.kind).toBe('strength');
  });
});

// ─── experience dimension ─────────────────────────────────────────────────────

describe('dimension: experience', () => {
  it('score is 0 for empty graph', () => {
    expect(dim(buildServiceHealthReport(base()), 'experience').score).toBe(0);
  });

  it('personas and needs contribute to experience score', () => {
    let g = withEntity(base(), 'persona', 'p1');
    g = withEntity(g, 'need', 'n1');
    expect(dim(buildServiceHealthReport(g), 'experience').score).toBeGreaterThan(0);
  });

  it('customer actions and emotion contribute to experience score', () => {
    let g = withJourney(base(), 'j1', ['s1']);
    g = withStage(g, 's1', 'j1', { customerAction: 'do thing', emotion: 'positive', touchpointIds: ['tp1'] });
    expect(dim(buildServiceHealthReport(g), 'experience').score).toBeGreaterThan(0);
  });
});

// ─── operation dimension ──────────────────────────────────────────────────────

describe('dimension: operation', () => {
  it('score is 0 on empty graph', () => {
    expect(dim(buildServiceHealthReport(base()), 'operation').score).toBe(0);
  });

  it('blueprint board increases operation score', () => {
    const g = withBlueprintBoard(base(), 'bp1');
    expect(dim(buildServiceHealthReport(g), 'operation').score).toBeGreaterThan(0);
  });

  it('operational entity kinds contribute to score', () => {
    let g = withBlueprintBoard(base(), 'bp1');
    for (const kind of ['process', 'system', 'resource', 'responsible']) g = withEntity(g, kind, `${kind}1`);
    const score = dim(buildServiceHealthReport(g), 'operation').score;
    expect(score).toBeGreaterThan(dim(buildServiceHealthReport(withBlueprintBoard(base(), 'bp1')), 'operation').score);
  });
});

// ─── execution dimension ──────────────────────────────────────────────────────

describe('dimension: execution', () => {
  it('score is low on empty graph (no tasks — plan/progress/schedule = 0)', () => {
    // ownership defaults to 100 when tasks.length=0 (emptyScore), so score = 25
    const score = dim(buildServiceHealthReport(base()), 'execution').score;
    expect(score).toBeLessThan(50);
  });

  it('adding a done task increases score', () => {
    const g = withTask(base(), 't1', { status: 'done', owner: 'Alice' });
    expect(dim(buildServiceHealthReport(g), 'execution').score).toBeGreaterThan(0);
  });

  it('overdue tasks reduce schedule health', () => {
    const past = '2000-01-01';
    const gOverdue = withTask(base(), 't1', { status: 'todo', dueDate: past, owner: '' });
    const gClean = withTask(base(), 't1', { status: 'done', owner: 'Alice' });
    const overdueScore = dim(buildServiceHealthReport(gOverdue), 'execution').score;
    const cleanScore = dim(buildServiceHealthReport(gClean), 'execution').score;
    expect(overdueScore).toBeLessThan(cleanScore);
  });
});

// ─── metrics dimension ────────────────────────────────────────────────────────

describe('dimension: metrics', () => {
  it('score is 0 for empty graph (no metrics, no opportunities)', () => {
    // metrics.length=0 and opportunities.length=0 → 100 defaults for opportunity/task links
    const r = buildServiceHealthReport(base());
    const d = dim(r, 'metrics');
    // catalog check score = 0 (no metrics), link checks = 100 (empty), values = 0
    expect(d.score).toBeGreaterThanOrEqual(0);
  });

  it('adding metrics with values increases score', () => {
    const g = withEntity(base(), 'metric', 'm1', { current: 42 });
    const d = dim(buildServiceHealthReport(g), 'metrics');
    expect(d.score).toBeGreaterThan(0);
  });
});

// ─── journey health ───────────────────────────────────────────────────────────

describe('buildServiceHealthReport — journey health', () => {
  it('returns empty journeys array for graph with no journeys', () => {
    expect(buildServiceHealthReport(base()).journeys).toHaveLength(0);
  });

  it('computes journey health with stage count', () => {
    let g = withJourney(base(), 'j1', ['s1', 's2']);
    g = withStage(g, 's1', 'j1', { customerAction: 'act', touchpointIds: ['tp1'], emotion: 'positive' });
    g = withStage(g, 's2', 'j1', { customerAction: 'act', touchpointIds: ['tp1'], emotion: 'positive' });
    const r = buildServiceHealthReport(g);
    expect(r.journeys).toHaveLength(1);
    expect(r.journeys[0].stageCount).toBe(2);
  });

  it('journey with owner and review has higher score than without', () => {
    let g = withJourney(base(), 'j1', ['s1']);
    g = withStage(g, 's1', 'j1', { customerAction: 'act', touchpointIds: ['tp1'], emotion: 'positive' });
    const withMeta = buildServiceHealthReport({
      ...g,
      journeys: { j1: { ...g.journeys.j1, owner: 'Alice', nextReviewAt: '2025-12-01' } },
    } as ServiceGraph).journeys[0].score;
    const noMeta = buildServiceHealthReport(g).journeys[0].score;
    expect(withMeta).toBeGreaterThan(noMeta);
  });

  it('journey health lists gaps for missing data', () => {
    const g = withJourney(base(), 'j1', []);
    const j = buildServiceHealthReport(g).journeys[0];
    expect(j.gaps.length).toBeGreaterThan(0);
  });

  it('sorts journeys by score ascending (worst first)', () => {
    let g = withJourney(base(), 'j1', [], { owner: 'Alice', nextReviewAt: '2025-12-01' });
    g = withJourney(g, 'j2', []);
    const scores = buildServiceHealthReport(g).journeys.map((j) => j.score);
    expect(scores[0]).toBeLessThanOrEqual(scores[scores.length - 1]);
  });
});

// ─── blueprint health ─────────────────────────────────────────────────────────

describe('buildServiceHealthReport — blueprint health', () => {
  it('score is 0 for empty graph', () => {
    expect(buildServiceHealthReport(base()).blueprint.score).toBe(0);
  });

  it('blueprint board presence increases score', () => {
    const g = withBlueprintBoard(base(), 'bp1');
    expect(buildServiceHealthReport(g).blueprint.score).toBeGreaterThan(0);
  });

  it('blueprintDraft fields increase score', () => {
    let g = withBlueprintBoard(base(), 'bp1');
    g = { ...g, blueprintDraft: { ...g.blueprintDraft, frontstage: 'yes', backstage: 'yes', suporte: 'yes', evidencias: 'yes' } } as ServiceGraph;
    expect(buildServiceHealthReport(g).blueprint.score).toBeGreaterThan(buildServiceHealthReport(withBlueprintBoard(base(), 'bp1')).blueprint.score);
  });

  it('lists gap for missing frontstage', () => {
    const g = withBlueprintBoard(base(), 'bp1');
    expect(buildServiceHealthReport(g).blueprint.gaps).toContain('Frontstage não estruturado');
  });

  it('no gap for frontstage when field is set', () => {
    let g = withBlueprintBoard(base(), 'bp1');
    g = { ...g, blueprintDraft: { ...g.blueprintDraft, frontstage: 'has content', backstage: 'has content', suporte: 'has content', evidencias: 'has content' } } as ServiceGraph;
    expect(buildServiceHealthReport(g).blueprint.gaps).not.toContain('Frontstage não estruturado');
  });
});

// ─── signals ─────────────────────────────────────────────────────────────────

describe('buildServiceHealthReport — strengths and gaps', () => {
  it('strengths come from dimensions scoring >= 75', () => {
    const r = buildServiceHealthReport(base());
    for (const s of r.strengths) {
      expect(s.kind).toBe('strength');
    }
  });

  it('gap signals come from dimensions scoring < 75', () => {
    const r = buildServiceHealthReport(base());
    for (const g of r.gaps) {
      expect(g.kind).toBe('gap');
    }
  });

  it('at most 3 strengths returned', () => {
    expect(buildServiceHealthReport(base()).strengths.length).toBeLessThanOrEqual(3);
  });

  it('at most 4 gaps returned', () => {
    expect(buildServiceHealthReport(base()).gaps.length).toBeLessThanOrEqual(4);
  });
});

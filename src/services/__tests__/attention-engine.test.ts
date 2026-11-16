import { describe, it, expect } from 'vitest';
import { buildAttentionReport } from '../attention-engine';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const DAY = 86_400_000;
const NOW_MS = new Date('2024-06-01T12:00:00.000Z').getTime();
const NOW_ISO = new Date(NOW_MS).toISOString();

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW_ISO } };
}

function dateFromNow(daysOffset: number): string {
  const d = new Date(NOW_MS + daysOffset * DAY);
  return d.toISOString().slice(0, 10);
}

function withTask(
  graph: ServiceGraph,
  id: string,
  patch: Partial<{ dueDate: string; owner: string; status: string }> = {},
): ServiceGraph {
  return {
    ...graph,
    tasks: {
      ...graph.tasks,
      [id]: {
        id,
        serviceId: 'S',
        title: `Task ${id}`,
        status: patch.status ?? 'todo',
        owner: patch.owner,
        dueDate: patch.dueDate,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      } as unknown as ServiceGraph['tasks'][string],
    },
  };
}

function withJourney(
  graph: ServiceGraph,
  id: string,
  patch: Partial<{ owner: string; status: string; nextReviewAt: string }> = {},
): ServiceGraph {
  return {
    ...graph,
    journeys: {
      ...graph.journeys,
      [id]: {
        id,
        serviceId: 'S',
        name: `Journey ${id}`,
        status: patch.status ?? 'active',
        owner: patch.owner,
        nextReviewAt: patch.nextReviewAt,
        stageIds: [],
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      } as unknown as ServiceGraph['journeys'][string],
    },
  };
}

function withStage(
  graph: ServiceGraph,
  id: string,
  patch: Partial<{ customerAction: string; touchpointIds: string[]; archived: boolean }> = {},
): ServiceGraph {
  return {
    ...graph,
    stages: {
      ...graph.stages,
      [id]: {
        id,
        serviceId: 'S',
        name: `Stage ${id}`,
        archived: patch.archived ?? false,
        customerAction: patch.customerAction ?? '',
        touchpointIds: patch.touchpointIds ?? [],
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      } as unknown as ServiceGraph['stages'][string],
    },
  };
}

function withOpportunity(graph: ServiceGraph, id: string, owner?: string): ServiceGraph {
  return {
    ...graph,
    opportunities: {
      ...graph.opportunities,
      [id]: {
        id,
        serviceId: 'S',
        title: `Opp ${id}`,
        owner: owner,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
      } as unknown as ServiceGraph['opportunities'][string],
    },
  };
}

function withOpenComment(graph: ServiceGraph, id: string): ServiceGraph {
  return {
    ...graph,
    service: {
      ...graph.service,
      collaboration: {
        comments: [
          ...((graph.service.collaboration?.comments) ?? []),
          { id, status: 'open', text: 'Comment', createdAt: NOW_ISO, updatedAt: NOW_ISO },
        ],
      },
    },
  } as ServiceGraph;
}

function withBenefit(graph: ServiceGraph, id: string, status: string): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      benefit: {
        ...(graph.entities?.benefit ?? {}),
        [id]: {
          id,
          serviceId: 'S',
          kind: 'benefit',
          title: `Benefit ${id}`,
          status,
          createdAt: NOW_ISO,
          updatedAt: NOW_ISO,
        },
      },
    },
  } as ServiceGraph;
}

function withEvidence(graph: ServiceGraph, id: string, updatedAt: string): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      evidence: {
        ...(graph.entities?.evidence ?? {}),
        [id]: {
          id,
          serviceId: 'S',
          kind: 'evidence',
          title: `Evidence ${id}`,
          createdAt: updatedAt,
          updatedAt,
        },
      },
    },
  } as ServiceGraph;
}

// ─── empty graph ──────────────────────────────────────────────────────────────

describe('buildAttentionReport — empty graph', () => {
  it('returns generatedAt, items array and summary shape', () => {
    const r = buildAttentionReport(base(), NOW_MS);
    expect(r.generatedAt).toBeDefined();
    expect(Array.isArray(r.items)).toBe(true);
    // top is first item or null
    if (r.items.length === 0) {
      expect(r.top).toBeNull();
    } else {
      expect(r.top).toBe(r.items[0]);
    }
    expect(typeof r.summary.total).toBe('number');
  });

  it('overdue and unassigned counts are 0 on empty graph', () => {
    const r = buildAttentionReport(base(), NOW_MS);
    expect(r.summary.overdue).toBe(0);
    expect(r.summary.unassigned).toBe(0);
  });
});

// ─── rule 1: overdue tasks ────────────────────────────────────────────────────

describe('overdue tasks', () => {
  it('no item when tasks have no dueDate', () => {
    const g = withTask(base(), 't1', { status: 'todo' });
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((item) => item.ruleId === 'task.overdue')).toBeUndefined();
  });

  it('high severity for 1 task overdue less than 14 days', () => {
    const g = withTask(base(), 't1', { dueDate: dateFromNow(-3) });
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'task.overdue');
    expect(item?.severity).toBe('high');
  });

  it('critical when 14+ days late', () => {
    const g = withTask(base(), 't1', { dueDate: dateFromNow(-15) });
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'task.overdue');
    expect(item?.severity).toBe('critical');
  });

  it('critical when 3+ overdue tasks', () => {
    let g = base();
    for (let i = 1; i <= 3; i++) g = withTask(g, `t${i}`, { dueDate: dateFromNow(-2) });
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'task.overdue');
    expect(item?.severity).toBe('critical');
    expect(item?.targetCount).toBe(3);
  });

  it('done tasks are excluded from overdue', () => {
    const g = withTask(base(), 't1', { dueDate: dateFromNow(-5), status: 'done' });
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'task.overdue')).toBeUndefined();
  });
});

// ─── rule 2: at-risk benefits ─────────────────────────────────────────────────

describe('at-risk benefits', () => {
  it('critical item when benefit has status at_risk', () => {
    const g = withBenefit(base(), 'b1', 'at_risk');
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'benefit.at_risk');
    expect(item?.severity).toBe('critical');
    expect(item?.targetCount).toBe(1);
  });

  it('no item when benefit status is not at_risk', () => {
    const g = withBenefit(base(), 'b1', 'on_track');
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'benefit.at_risk')).toBeUndefined();
  });
});

// ─── rule 3: review overdue ───────────────────────────────────────────────────

describe('review overdue', () => {
  it('high severity when review is 1–6 days late', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        operatingReview: { nextReviewAt: dateFromNow(-3) },
      },
    } as ServiceGraph;
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'review.overdue');
    expect(item?.severity).toBe('high');
  });

  it('critical when review is 7+ days late', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        operatingReview: { nextReviewAt: dateFromNow(-8) },
      },
    } as ServiceGraph;
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'review.overdue');
    expect(item?.severity).toBe('critical');
  });

  it('uses journey nextReviewAt when no operatingReview', () => {
    const g = withJourney(base(), 'j1', { nextReviewAt: dateFromNow(-2) });
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'review.overdue');
    expect(item).toBeDefined();
  });
});

// ─── rule 4: review due soon ──────────────────────────────────────────────────

describe('review due soon', () => {
  it('medium item when review is within 7 days', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        operatingReview: { nextReviewAt: dateFromNow(5) },
      },
    } as ServiceGraph;
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'review.due_soon');
    expect(item?.severity).toBe('medium');
  });

  it('no due_soon item when review is 8+ days away', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        operatingReview: { nextReviewAt: dateFromNow(10) },
      },
    } as ServiceGraph;
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'review.due_soon')).toBeUndefined();
  });
});

// ─── rule 5: ownerless opportunities ─────────────────────────────────────────

describe('ownerless opportunities', () => {
  it('medium when < 3 without owner', () => {
    let g = base();
    for (let i = 1; i <= 2; i++) g = withOpportunity(g, `o${i}`);
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'opportunity.owner_missing');
    expect(item?.severity).toBe('medium');
  });

  it('high when 3+ without owner', () => {
    let g = base();
    for (let i = 1; i <= 3; i++) g = withOpportunity(g, `o${i}`);
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'opportunity.owner_missing');
    expect(item?.severity).toBe('high');
    expect(item?.targetCount).toBe(3);
  });

  it('no item when all opportunities have owner', () => {
    const g = withOpportunity(base(), 'o1', 'Alice');
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'opportunity.owner_missing')).toBeUndefined();
  });
});

// ─── rule 6: ownerless tasks ──────────────────────────────────────────────────

describe('ownerless tasks', () => {
  it('medium when 1–2 tasks without owner', () => {
    const g = withTask(base(), 't1');
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'task.owner_missing');
    expect(item?.severity).toBe('medium');
  });

  it('high when 3+ tasks without owner', () => {
    let g = base();
    for (let i = 1; i <= 3; i++) g = withTask(g, `t${i}`);
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'task.owner_missing');
    expect(item?.severity).toBe('high');
  });

  it('no item when all tasks have owner or are done', () => {
    const g = withTask(base(), 't1', { owner: 'Alice', status: 'done' });
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'task.owner_missing')).toBeUndefined();
  });
});

// ─── rule 7: incomplete stages ────────────────────────────────────────────────

describe('incomplete stages', () => {
  it('medium when < 3 incomplete stages', () => {
    const g = withStage(base(), 'st1');
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'stage.incomplete');
    expect(item?.severity).toBe('medium');
  });

  it('high when 3+ incomplete stages', () => {
    let g = base();
    for (let i = 1; i <= 3; i++) g = withStage(g, `st${i}`);
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'stage.incomplete');
    expect(item?.severity).toBe('high');
  });

  it('no item when stage has customerAction and touchpoints', () => {
    const g = withStage(base(), 'st1', { customerAction: 'User logs in', touchpointIds: ['tp1'] });
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'stage.incomplete')).toBeUndefined();
  });

  it('archived stages are excluded', () => {
    const g = withStage(base(), 'st1', { archived: true });
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'stage.incomplete')).toBeUndefined();
  });
});

// ─── rule 8: ownerless journeys ───────────────────────────────────────────────

describe('ownerless journeys', () => {
  it('medium item for active journey without owner', () => {
    const g = withJourney(base(), 'j1');
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'journey.owner_missing');
    expect(item?.severity).toBe('medium');
  });

  it('no item when journey has owner', () => {
    const g = withJourney(base(), 'j1', { owner: 'Bob' });
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'journey.owner_missing')).toBeUndefined();
  });

  it('archived journeys excluded', () => {
    const g = withJourney(base(), 'j1', { status: 'archived' });
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'journey.owner_missing')).toBeUndefined();
  });
});

// ─── rule 9: open comments ────────────────────────────────────────────────────

describe('open comments', () => {
  it('low when fewer than 5 open comments', () => {
    let g = base();
    for (let i = 1; i <= 3; i++) g = withOpenComment(g, `c${i}`);
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'comment.open');
    expect(item?.severity).toBe('low');
  });

  it('medium when 5+ open comments', () => {
    let g = base();
    for (let i = 1; i <= 5; i++) g = withOpenComment(g, `c${i}`);
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'comment.open');
    expect(item?.severity).toBe('medium');
    expect(item?.targetCount).toBe(5);
  });
});

// ─── rule 13: stale evidence ──────────────────────────────────────────────────

describe('stale evidence', () => {
  it('no item when fewer than 3 stale evidences', () => {
    const staleDate = new Date(NOW_MS - 100 * DAY).toISOString();
    let g = withEvidence(base(), 'e1', staleDate);
    g = withEvidence(g, 'e2', staleDate);
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'evidence.stale')).toBeUndefined();
  });

  it('low item when 3+ evidences older than 90 days', () => {
    const staleDate = new Date(NOW_MS - 100 * DAY).toISOString();
    let g = base();
    for (let i = 1; i <= 3; i++) g = withEvidence(g, `e${i}`, staleDate);
    const r = buildAttentionReport(g, NOW_MS);
    const item = r.items.find((i) => i.ruleId === 'evidence.stale');
    expect(item?.severity).toBe('low');
    expect(item?.targetCount).toBe(3);
  });

  it('recent evidence (< 90 days) is not stale', () => {
    const freshDate = new Date(NOW_MS - 30 * DAY).toISOString();
    let g = base();
    for (let i = 1; i <= 3; i++) g = withEvidence(g, `e${i}`, freshDate);
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.items.find((i) => i.ruleId === 'evidence.stale')).toBeUndefined();
  });
});

// ─── sorting ──────────────────────────────────────────────────────────────────

describe('items sorting', () => {
  it('top item is the highest priority', () => {
    const g = withBenefit(withTask(base(), 't1', { dueDate: dateFromNow(-20) }), 'b1', 'at_risk');
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.top).toBe(r.items[0]);
    expect(r.top!.priority).toBeGreaterThanOrEqual(r.items[r.items.length - 1].priority);
  });
});

// ─── summary counts ───────────────────────────────────────────────────────────

describe('summary', () => {
  it('counts match items array', () => {
    const staleDate = new Date(NOW_MS - 100 * DAY).toISOString();
    let g = withBenefit(base(), 'b1', 'at_risk');
    for (let i = 1; i <= 3; i++) g = withEvidence(g, `e${i}`, staleDate);
    const r = buildAttentionReport(g, NOW_MS);
    expect(r.summary.total).toBe(r.items.length);
    expect(r.summary.critical).toBe(r.items.filter((i) => i.severity === 'critical').length);
    expect(r.summary.low).toBe(r.items.filter((i) => i.severity === 'low').length);
  });
});

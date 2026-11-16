import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import { buildExecutiveServiceCockpitReport } from '../executive-service-cockpit.ts';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2025-06-01T00:00:00.000Z';

function base(): ServiceGraph { return createServiceGraph('S'); }

// ─── basic shape ──────────────────────────────────────────────────────────────

describe('buildExecutiveServiceCockpitReport shape', () => {
  it('returns all top-level keys', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r).toHaveProperty('generatedAt');
    expect(r).toHaveProperty('executiveScore');
    expect(r).toHaveProperty('status');
    expect(r).toHaveProperty('executiveSummary');
    expect(r).toHaveProperty('dimensions');
    expect(r).toHaveProperty('actions');
    expect(r).toHaveProperty('topActions');
    expect(r).toHaveProperty('topRisks');
    expect(r).toHaveProperty('strengths');
    expect(r).toHaveProperty('weakDimensions');
    expect(r).toHaveProperty('health');
    expect(r).toHaveProperty('priorities');
    expect(r).toHaveProperty('portfolio');
    expect(r).toHaveProperty('outcomes');
    expect(r).toHaveProperty('governance');
    expect(r).toHaveProperty('operations');
    expect(r).toHaveProperty('counts');
  });

  it('generatedAt equals now arg', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.generatedAt).toBe(NOW);
  });

  it('executiveScore is clamped 0-100', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.executiveScore).toBeGreaterThanOrEqual(0);
    expect(r.executiveScore).toBeLessThanOrEqual(100);
  });

  it('dimensions has 6 entries with correct ids', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    const ids = r.dimensions.map((d) => d.id);
    expect(ids).toContain('health');
    expect(ids).toContain('outcomes');
    expect(ids).toContain('governance');
    expect(ids).toContain('operations');
    expect(ids).toContain('portfolio');
    expect(ids).toContain('priorities');
    expect(r.dimensions).toHaveLength(6);
  });

  it('dimension weights sum to 100', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    const total = r.dimensions.reduce((sum, d) => sum + d.weight, 0);
    expect(total).toBe(100);
  });

  it('topActions is at most 8 items', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.topActions.length).toBeLessThanOrEqual(8);
  });

  it('topRisks contains only critical/high severity', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    for (const action of r.topRisks) {
      expect(['critical', 'high']).toContain(action.severity);
    }
  });

  it('topRisks is at most 6 items', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.topRisks.length).toBeLessThanOrEqual(6);
  });

  it('strengths have score >= 80', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    for (const s of r.strengths) {
      expect(s.score).toBeGreaterThanOrEqual(80);
    }
  });

  it('strengths is at most 3 items', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.strengths.length).toBeLessThanOrEqual(3);
  });

  it('weakDimensions have score < 70', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    for (const d of r.weakDimensions) {
      expect(d.score).toBeLessThan(70);
    }
  });

  it('weakDimensions is at most 3 items', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.weakDimensions.length).toBeLessThanOrEqual(3);
  });
});

// ─── statusFor ────────────────────────────────────────────────────────────────

describe('buildExecutiveServiceCockpitReport status', () => {
  it('empty graph returns a valid status', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(['healthy', 'attention', 'critical']).toContain(r.status);
  });
});

// ─── executiveSummary ─────────────────────────────────────────────────────────

describe('buildExecutiveServiceCockpitReport executiveSummary', () => {
  it('summary is a non-empty string', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(typeof r.executiveSummary).toBe('string');
    expect(r.executiveSummary.length).toBeGreaterThan(0);
  });
});

// ─── counts ───────────────────────────────────────────────────────────────────

describe('buildExecutiveServiceCockpitReport counts', () => {
  it('counts all keys present', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.counts).toHaveProperty('openActions');
    expect(r.counts).toHaveProperty('criticalActions');
    expect(r.counts).toHaveProperty('highActions');
    expect(r.counts).toHaveProperty('activeProblems');
    expect(r.counts).toHaveProperty('activeInitiatives');
    expect(r.counts).toHaveProperty('overdueInitiatives');
    expect(r.counts).toHaveProperty('metrics');
    expect(r.counts).toHaveProperty('metricsOnTarget');
    expect(r.counts).toHaveProperty('governanceOverdue');
    expect(r.counts).toHaveProperty('operationsErrors');
  });

  it('openActions equals actions.length', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.counts.openActions).toBe(r.actions.length);
  });

  it('criticalActions + highActions <= openActions', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.counts.criticalActions + r.counts.highActions).toBeLessThanOrEqual(r.counts.openActions);
  });
});

// ─── nextReview ───────────────────────────────────────────────────────────────

describe('buildExecutiveServiceCockpitReport nextReview', () => {
  it('is null for empty graph', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(r.nextReview).toBeNull();
  });
});

// ─── actions sort order ───────────────────────────────────────────────────────

describe('buildExecutiveServiceCockpitReport actions sort', () => {
  it('actions sorted by priority desc', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    for (let i = 1; i < r.actions.length; i++) {
      expect(r.actions[i - 1].priority).toBeGreaterThanOrEqual(r.actions[i].priority);
    }
  });
});

// ─── sub-reports wired ────────────────────────────────────────────────────────

describe('buildExecutiveServiceCockpitReport sub-reports', () => {
  it('health sub-report has score field', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(typeof r.health.score).toBe('number');
  });

  it('priorities sub-report has counts.active', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(typeof r.priorities.counts.active).toBe('number');
  });

  it('portfolio sub-report has initiatives array', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(Array.isArray(r.portfolio.initiatives)).toBe(true);
  });

  it('outcomes sub-report has metrics array', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(Array.isArray(r.outcomes.metrics)).toBe(true);
  });

  it('governance sub-report has records array', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(Array.isArray(r.governance.records)).toBe(true);
  });

  it('operations sub-report has bindings array', () => {
    const r = buildExecutiveServiceCockpitReport(base(), NOW);
    expect(Array.isArray(r.operations.bindings)).toBe(true);
  });
});

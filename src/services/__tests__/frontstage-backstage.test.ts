import { describe, it, expect } from 'vitest';
import {
  OPERATIONAL_CONTEXT,
  serviceVisibilityForLayer,
  operationalLinkField,
  operationalLinks,
  setOperationalLink,
  evidenceMedium,
  setEvidenceMedium,
  buildFrontstageBackstageReport,
} from '../frontstage-backstage';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function mkEntity(id: string, kind: string, extra: Record<string, unknown> = {}) {
  return { id, kind, serviceId: 'S', createdAt: NOW, updatedAt: NOW, ...extra };
}

function withJourneySetup(graph: ServiceGraph, boardId = 'b1'): ServiceGraph {
  const g1 = {
    ...graph,
    service: { ...graph.service, journeyIds: ['j1'] },
    journeys: { j1: { id: 'j1', serviceId: 'S', name: 'Journey', status: 'active', stageIds: ['s1'], createdAt: NOW, updatedAt: NOW } as ServiceGraph['journeys'][string] },
    stages: { s1: { id: 's1', journeyId: 'j1', serviceId: 'S', title: 'Stage 1', customerAction: '', touchpointIds: [], opportunityIds: [], problemIds: [], createdAt: NOW, updatedAt: NOW } as ServiceGraph['stages'][string] },
    views: {
      ...graph.views,
      whiteboards: {
        [boardId]: {
          id: boardId, serviceId: 'S', name: 'Blueprint', viewKind: 'blueprint', journeyId: 'j1',
          items: {}, createdAt: NOW, updatedAt: NOW,
        } as ServiceGraph['views']['whiteboards'][string],
      },
    },
  };
  return g1;
}

function addBlueprintItem(graph: ServiceGraph, boardId: string, itemId: string, layer: string, stageId: string): ServiceGraph {
  const board = graph.views.whiteboards[boardId];
  return {
    ...graph,
    views: {
      ...graph.views,
      whiteboards: {
        ...graph.views.whiteboards,
        [boardId]: {
          ...board,
          items: {
            ...board.items,
            [itemId]: {
              id: itemId, kind: 'free', text: 'Item', x: 0, y: 0, width: 200, height: 100,
              serviceLayer: layer, serviceStageId: stageId,
            } as ServiceGraph['views']['whiteboards'][string]['items'][string],
          },
        },
      },
    },
  };
}

// ─── OPERATIONAL_CONTEXT ─────────────────────────────────────────────────────

describe('OPERATIONAL_CONTEXT', () => {
  it('has 5 entries covering all operational kinds', () => {
    expect(OPERATIONAL_CONTEXT).toHaveLength(5);
    const kinds = OPERATIONAL_CONTEXT.map(c => c.kind);
    expect(kinds).toContain('role');
    expect(kinds).toContain('channel');
    expect(kinds).toContain('dependency');
    expect(kinds).toContain('policy');
    expect(kinds).toContain('evidence');
  });

  it('each entry has kind, field, label and question', () => {
    for (const ctx of OPERATIONAL_CONTEXT) {
      expect(ctx.kind).toBeTruthy();
      expect(ctx.field).toBeTruthy();
      expect(ctx.label).toBeTruthy();
      expect(ctx.question).toBeTruthy();
    }
  });
});

// ─── serviceVisibilityForLayer ────────────────────────────────────────────────

describe('serviceVisibilityForLayer', () => {
  it('frontstage → customer-visible', () => {
    expect(serviceVisibilityForLayer('frontstage')).toBe('customer-visible');
  });

  it('customer → customer-visible', () => {
    expect(serviceVisibilityForLayer('customer')).toBe('customer-visible');
  });

  it('evidence → customer-visible', () => {
    expect(serviceVisibilityForLayer('evidence')).toBe('customer-visible');
  });

  it('backstage → internal', () => {
    expect(serviceVisibilityForLayer('backstage')).toBe('internal');
  });

  it('process → internal', () => {
    expect(serviceVisibilityForLayer('process')).toBe('internal');
  });

  it('enablement → internal', () => {
    expect(serviceVisibilityForLayer('enablement')).toBe('internal');
  });
});

// ─── operationalLinkField ─────────────────────────────────────────────────────

describe('operationalLinkField', () => {
  it('maps role → roleIds', () => expect(operationalLinkField('role')).toBe('roleIds'));
  it('maps channel → channelIds', () => expect(operationalLinkField('channel')).toBe('channelIds'));
  it('maps dependency → dependencyIds', () => expect(operationalLinkField('dependency')).toBe('dependencyIds'));
  it('maps policy → policyIds', () => expect(operationalLinkField('policy')).toBe('policyIds'));
  it('maps evidence → evidenceIds', () => expect(operationalLinkField('evidence')).toBe('evidenceIds'));
});

// ─── operationalLinks ─────────────────────────────────────────────────────────

describe('operationalLinks', () => {
  it('returns all empty arrays for undefined entity', () => {
    const links = operationalLinks(undefined);
    expect(links.roleIds).toEqual([]);
    expect(links.channelIds).toEqual([]);
    expect(links.dependencyIds).toEqual([]);
    expect(links.policyIds).toEqual([]);
    expect(links.evidenceIds).toEqual([]);
  });

  it('extracts ids from entity fields', () => {
    const entity = mkEntity('e1', 'action', { roleIds: ['r1', 'r2'], channelIds: ['ch1'] });
    const links = operationalLinks(entity as never);
    expect(links.roleIds).toEqual(['r1', 'r2']);
    expect(links.channelIds).toEqual(['ch1']);
  });

  it('deduplicates ids', () => {
    const entity = mkEntity('e1', 'action', { roleIds: ['r1', 'r1', 'r2'] });
    const links = operationalLinks(entity as never);
    expect(links.roleIds).toHaveLength(2);
  });
});

// ─── setOperationalLink ───────────────────────────────────────────────────────

describe('setOperationalLink', () => {
  it('adds a role id when linked=true', () => {
    const entity = mkEntity('e1', 'action', { roleIds: [] });
    const updated = setOperationalLink(entity as never, 'role', 'r1', true);
    expect(updated.roleIds).toContain('r1');
  });

  it('removes a role id when linked=false', () => {
    const entity = mkEntity('e1', 'action', { roleIds: ['r1', 'r2'] });
    const updated = setOperationalLink(entity as never, 'role', 'r1', false);
    expect(updated.roleIds).not.toContain('r1');
    expect(updated.roleIds).toContain('r2');
  });

  it('is idempotent — adding same id twice keeps one', () => {
    const entity = mkEntity('e1', 'action', { roleIds: ['r1'] });
    const updated = setOperationalLink(entity as never, 'role', 'r1', true);
    expect((updated.roleIds as string[]).filter(id => id === 'r1')).toHaveLength(1);
  });
});

// ─── evidenceMedium ───────────────────────────────────────────────────────────

describe('evidenceMedium', () => {
  it('returns valid medium from evidenceMedium field', () => {
    expect(evidenceMedium(mkEntity('e1', 'ev', { evidenceMedium: 'digital' }) as never)).toBe('digital');
  });

  it('falls back to medium field', () => {
    expect(evidenceMedium(mkEntity('e1', 'ev', { medium: 'physical' }) as never)).toBe('physical');
  });

  it('defaults to operational for unknown value', () => {
    expect(evidenceMedium(mkEntity('e1', 'ev', { evidenceMedium: 'unknown' }) as never)).toBe('operational');
  });

  it('returns operational for undefined entity', () => {
    expect(evidenceMedium(undefined)).toBe('operational');
  });
});

// ─── setEvidenceMedium ────────────────────────────────────────────────────────

describe('setEvidenceMedium', () => {
  it('sets the evidenceMedium field on entity', () => {
    const entity = mkEntity('e1', 'ev');
    const updated = setEvidenceMedium(entity as never, 'human');
    expect(updated.evidenceMedium).toBe('human');
  });
});

// ─── buildFrontstageBackstageReport ──────────────────────────────────────────

describe('buildFrontstageBackstageReport', () => {
  it('returns empty report for missing board', () => {
    const report = buildFrontstageBackstageReport(base(), 'ghost');
    expect(report.stages).toHaveLength(0);
    expect(report.total).toBe(0);
    expect(report.percent).toBe(0);
  });

  it('returns one stage report per journey stage', () => {
    const g = withJourneySetup(base());
    const report = buildFrontstageBackstageReport(g, 'b1');
    expect(report.stages).toHaveLength(1);
    expect(report.stages[0].stageId).toBe('s1');
  });

  it('detects frontstage absence gap', () => {
    const g = withJourneySetup(base());
    const report = buildFrontstageBackstageReport(g, 'b1');
    const stage = report.stages[0];
    expect(stage.gaps.some(gap => gap.area === 'frontstage' && gap.id.includes('frontstage'))).toBe(true);
  });

  it('no frontstage gap when frontstage item present', () => {
    const g = addBlueprintItem(withJourneySetup(base()), 'b1', 'i1', 'frontstage', 's1');
    const report = buildFrontstageBackstageReport(g, 'b1');
    const stage = report.stages[0];
    expect(stage.frontstage).toBe(1);
    // frontstage gap no longer appears
    expect(stage.gaps.every(gap => !gap.id.endsWith('.frontstage'))).toBe(true);
  });

  it('stage with no items has frontstage and backstage gaps (partial score)', () => {
    const g = withJourneySetup(base());
    const report = buildFrontstageBackstageReport(g, 'b1');
    const stage = report.stages[0];
    expect(stage.gaps.some(gap => gap.area === 'frontstage')).toBe(true);
    expect(stage.gaps.some(gap => gap.area === 'backstage')).toBe(true);
    expect(stage.percent).toBeLessThan(100);
  });

  it('total and complete aggregate across all stages', () => {
    const g = withJourneySetup(base());
    const report = buildFrontstageBackstageReport(g, 'b1');
    expect(report.total).toBe(report.stages.reduce((s, r) => s + r.total, 0));
    expect(report.complete).toBe(report.stages.reduce((s, r) => s + r.complete, 0));
  });
});

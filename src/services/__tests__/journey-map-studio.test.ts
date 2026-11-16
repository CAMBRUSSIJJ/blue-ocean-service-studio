import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import {
  journeyStageNeedIds,
  journeyStageEvidenceIds,
  journeyStageValidatedProblemIds,
  journeyContextItems,
  buildJourneyMapReport,
  updateJourneyStageExperience,
  setJourneyStageContextLink,
  prepareJourneyBlueprintDraft,
  prepareBlueprintFromJourney,
} from '../journey-map-studio.ts';
import type { ServiceGraph, Stage, Id } from '../../domain/model';

const NOW = '2025-01-01T00:00:00.000Z';

function base(): ServiceGraph { return createServiceGraph('S'); }

function addEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: {
        ...(graph.entities?.[kind] ?? {}),
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${id}`, description: `D-${id}`, createdAt: NOW, updatedAt: NOW, relatedIds: [], ...extra },
      },
    },
  } as ServiceGraph;
}

function makeStage(id: Id, journeyId: Id, extra: Partial<Stage> = {}): Stage {
  return {
    id, journeyId, title: `Stage ${id}`, customerAction: 'act', emotion: 'neutral',
    touchpointIds: [], problemIds: [], opportunityIds: [], ...extra,
  } as Stage;
}

function addJourney(graph: ServiceGraph, journeyId: Id, stageIds: Id[], extra: Record<string, unknown> = {}): ServiceGraph {
  return { ...graph, journeys: { ...graph.journeys, [journeyId]: { id: journeyId, serviceId: graph.service.id, name: `J-${journeyId}`, stageIds, ...extra } } } as ServiceGraph;
}

function addStage(graph: ServiceGraph, stage: Stage): ServiceGraph {
  return { ...graph, stages: { ...graph.stages, [stage.id]: stage } } as ServiceGraph;
}

// ─── stage accessor helpers ───────────────────────────────────────────────────

describe('journeyStageNeedIds', () => {
  it('returns empty array when needIds absent', () => {
    expect(journeyStageNeedIds(makeStage('s1', 'j1'))).toEqual([]);
  });

  it('returns deduped needIds', () => {
    const stage = makeStage('s1', 'j1', { needIds: ['n1', 'n1', 'n2'] });
    expect(journeyStageNeedIds(stage)).toEqual(['n1', 'n2']);
  });
});

describe('journeyStageEvidenceIds', () => {
  it('returns empty array when evidenceIds absent', () => {
    expect(journeyStageEvidenceIds(makeStage('s1', 'j1'))).toEqual([]);
  });

  it('returns evidenceIds', () => {
    const stage = makeStage('s1', 'j1', { evidenceIds: ['ev1'] });
    expect(journeyStageEvidenceIds(stage)).toContain('ev1');
  });
});

describe('journeyStageValidatedProblemIds', () => {
  it('returns empty array when validatedProblemIds absent', () => {
    expect(journeyStageValidatedProblemIds(makeStage('s1', 'j1'))).toEqual([]);
  });

  it('returns validatedProblemIds', () => {
    const stage = makeStage('s1', 'j1', { validatedProblemIds: ['p1'] });
    expect(journeyStageValidatedProblemIds(stage)).toContain('p1');
  });
});

// ─── journeyContextItems ──────────────────────────────────────────────────────

describe('journeyContextItems', () => {
  it('returns empty arrays for journey with no designContext', () => {
    let g = addJourney(base(), 'j1', []);
    const items = journeyContextItems(g, 'j1');
    expect(items.needs).toHaveLength(0);
    expect(items.problems).toHaveLength(0);
    expect(items.evidence).toHaveLength(0);
  });

  it('resolves entities from designContext ids', () => {
    let g = base();
    g = addEntity(g, 'need', 'n1');
    g = addEntity(g, 'problem', 'pr1');
    g = addJourney(g, 'j1', [], {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: [], needIds: ['n1'], jobIds: [], painIds: [], problemIds: ['pr1'], evidenceIds: [] },
    });
    const items = journeyContextItems(g, 'j1');
    expect(items.needs.map((e) => e.id)).toContain('n1');
    expect(items.problems.map((e) => e.id)).toContain('pr1');
  });

  it('filters out ids with no matching entity', () => {
    const g = addJourney(base(), 'j1', [], {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: [], needIds: ['ghost'], jobIds: [], painIds: [], problemIds: [], evidenceIds: [] },
    });
    const items = journeyContextItems(g, 'j1');
    expect(items.needs).toHaveLength(0);
  });
});

// ─── buildJourneyMapReport ────────────────────────────────────────────────────

describe('buildJourneyMapReport', () => {
  it('returns null for unknown journeyId', () => {
    expect(buildJourneyMapReport(base(), 'unknown')).toBeNull();
  });

  it('returns report with 0 stages for empty journey', () => {
    const g = addJourney(base(), 'j1', []);
    const r = buildJourneyMapReport(g, 'j1');
    expect(r).not.toBeNull();
    expect(r!.stageCount).toBe(0);
    expect(r!.overallScore).toBe(0);
  });

  it('reports position (1-indexed) for each stage', () => {
    const stage = makeStage('s1', 'j1');
    let g = addJourney(base(), 'j1', ['s1']);
    g = addStage(g, stage);
    const r = buildJourneyMapReport(g, 'j1')!;
    expect(r.stages[0].position).toBe(1);
  });

  it('qualityScore = Math.round(passed/7*100) based on checks', () => {
    // minimal stage: title+customerAction pass but thoughts/needs/touchpoints/evidence fail
    // emotion: 'neutral' passes; title passes; customerAction passes → 3/7 = 43
    const stage = makeStage('s1', 'j1', { title: 'T', customerAction: 'A', thoughts: '', emotion: 'neutral' });
    let g = addJourney(base(), 'j1', ['s1']);
    g = addStage(g, stage);
    const r = buildJourneyMapReport(g, 'j1')!;
    expect(r.stages[0].qualityScore).toBe(Math.round(3 / 7 * 100));
  });

  it('blueprintBlockers includes message when fewer than 2 stages', () => {
    const stage = makeStage('s1', 'j1');
    let g = addJourney(base(), 'j1', ['s1']);
    g = addStage(g, stage);
    const r = buildJourneyMapReport(g, 'j1')!;
    expect(r.readyForBlueprint).toBe(false);
    expect(r.blueprintBlockers.length).toBeGreaterThan(0);
  });

  it('readyForBlueprint is true when 2+ named stages and touchpoints covered', () => {
    let g = base();
    g = addEntity(g, 'need', 'n1');
    // 2 stages with title, customerAction, and touchpoints
    const s1 = makeStage('s1', 'j1', { title: 'S1', customerAction: 'A1', touchpointIds: ['tp1'] });
    const s2 = makeStage('s2', 'j1', { title: 'S2', customerAction: 'A2', touchpointIds: ['tp2'] });
    g = addJourney(g, 'j1', ['s1', 's2']);
    g = addStage(g, s1);
    g = addStage(g, s2);
    const r = buildJourneyMapReport(g, 'j1')!;
    expect(r.blueprintBlockers).toHaveLength(0);
    expect(r.readyForBlueprint).toBe(true);
  });

  it('computes evidenceCoverage as percentage of stages with evidence', () => {
    let g = base();
    g = addEntity(g, 'evidence', 'ev1');
    const s1 = makeStage('s1', 'j1', { evidenceIds: ['ev1'] });
    const s2 = makeStage('s2', 'j1');
    g = addJourney(g, 'j1', ['s1', 's2']);
    g = addStage(g, s1);
    g = addStage(g, s2);
    const r = buildJourneyMapReport(g, 'j1')!;
    expect(r.evidenceCoverage).toBe(50);
  });

  it('counts momentOfTruth stages (non-none)', () => {
    let g = base();
    const s1 = makeStage('s1', 'j1', { momentOfTruth: 'critical' });
    const s2 = makeStage('s2', 'j1');
    g = addJourney(g, 'j1', ['s1', 's2']);
    g = addStage(g, s1);
    g = addStage(g, s2);
    const r = buildJourneyMapReport(g, 'j1')!;
    expect(r.momentCount).toBe(1);
  });

  it('filters out stageIds with no stage record', () => {
    const g = addJourney(base(), 'j1', ['missing-stage']);
    const r = buildJourneyMapReport(g, 'j1')!;
    expect(r.stageCount).toBe(0);
  });
});

// ─── updateJourneyStageExperience ─────────────────────────────────────────────

describe('updateJourneyStageExperience', () => {
  it('no-ops for unknown stageId', () => {
    const g = base();
    expect(updateJourneyStageExperience({ graph: g, stageId: 'unknown', patch: { thoughts: 'x' }, now: NOW })).toBe(g);
  });

  it('updates thoughts and momentOfTruth on stage', () => {
    let g = base();
    const stage = makeStage('s1', 'j1');
    g = addJourney(g, 'j1', ['s1']);
    g = addStage(g, stage);
    const g2 = updateJourneyStageExperience({ graph: g, stageId: 's1', patch: { thoughts: 'Deep thought', momentOfTruth: 'critical' }, now: NOW });
    expect(g2.stages['s1'].thoughts).toBe('Deep thought');
    expect(g2.stages['s1'].momentOfTruth).toBe('critical');
  });

  it('updates journey updatedAt', () => {
    let g = base();
    const stage = makeStage('s1', 'j1');
    g = addJourney(g, 'j1', ['s1']);
    g = addStage(g, stage);
    const g2 = updateJourneyStageExperience({ graph: g, stageId: 's1', patch: {}, now: NOW });
    expect(g2.journeys['j1'].updatedAt).toBe(NOW);
  });
});

// ─── setJourneyStageContextLink ───────────────────────────────────────────────

describe('setJourneyStageContextLink', () => {
  function graphWithContext() {
    let g = base();
    g = addEntity(g, 'need', 'n1');
    g = addEntity(g, 'problem', 'pr1');
    g = addEntity(g, 'evidence', 'ev1');
    const stage = makeStage('s1', 'j1');
    g = addJourney(g, 'j1', ['s1'], {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: [], needIds: ['n1'], jobIds: [], painIds: [], problemIds: ['pr1'], evidenceIds: ['ev1'] },
    });
    g = addStage(g, stage);
    return g;
  }

  it('no-ops for unknown stageId', () => {
    const g = base();
    expect(setJourneyStageContextLink({ graph: g, stageId: 'unknown', kind: 'need', entityId: 'n1', enabled: true, now: NOW })).toBe(g);
  });

  it('no-ops when entityId not in designContext allowed list', () => {
    const g = graphWithContext();
    // 'n2' is not in designContext.needIds
    const result = setJourneyStageContextLink({ graph: g, stageId: 's1', kind: 'need', entityId: 'n2', enabled: true, now: NOW });
    expect(result).toBe(g);
  });

  it('adds need to stage when enabled=true', () => {
    const g = graphWithContext();
    const g2 = setJourneyStageContextLink({ graph: g, stageId: 's1', kind: 'need', entityId: 'n1', enabled: true, now: NOW });
    expect(g2.stages['s1'].needIds).toContain('n1');
  });

  it('removes need from stage when enabled=false', () => {
    const g = graphWithContext();
    const g2 = setJourneyStageContextLink({ graph: g, stageId: 's1', kind: 'need', entityId: 'n1', enabled: true, now: NOW });
    const g3 = setJourneyStageContextLink({ graph: g2, stageId: 's1', kind: 'need', entityId: 'n1', enabled: false, now: NOW });
    expect(g3.stages['s1'].needIds ?? []).not.toContain('n1');
  });

  it('links problem via validatedProblemIds', () => {
    const g = graphWithContext();
    const g2 = setJourneyStageContextLink({ graph: g, stageId: 's1', kind: 'problem', entityId: 'pr1', enabled: true, now: NOW });
    expect(g2.stages['s1'].validatedProblemIds).toContain('pr1');
  });

  it('links evidence via evidenceIds', () => {
    const g = graphWithContext();
    const g2 = setJourneyStageContextLink({ graph: g, stageId: 's1', kind: 'evidence', entityId: 'ev1', enabled: true, now: NOW });
    expect(g2.stages['s1'].evidenceIds).toContain('ev1');
  });
});

// ─── prepareJourneyBlueprintDraft ─────────────────────────────────────────────

describe('prepareJourneyBlueprintDraft', () => {
  it('returns boardId=null for unknown journey', () => {
    const result = prepareJourneyBlueprintDraft(base(), 'unknown');
    expect(result.boardId).toBeNull();
    expect(result.created).toBe(false);
  });

  it('creates blueprint board for valid journey with stages', () => {
    let g = base();
    const stage = makeStage('s1', 'j1');
    g = addJourney(g, 'j1', ['s1']);
    g = addStage(g, stage);
    const result = prepareJourneyBlueprintDraft(g, 'j1', { id: 'bp1', now: NOW });
    expect(result.created).toBe(true);
    expect(result.boardId).toBe('bp1');
    const board = result.graph.views.whiteboards['bp1'];
    expect(board.viewKind).toBe('blueprint');
    expect(board.journeyId).toBe('j1');
  });

  it('returns existing board without creating new one', () => {
    let g = base();
    const stage = makeStage('s1', 'j1');
    g = addJourney(g, 'j1', ['s1']);
    g = addStage(g, stage);
    const { graph: g2, boardId: bp1 } = prepareJourneyBlueprintDraft(g, 'j1', { id: 'bp1', now: NOW });
    const { created, boardId: bp2 } = prepareJourneyBlueprintDraft(g2, 'j1', { now: NOW });
    expect(created).toBe(false);
    expect(bp2).toBe(bp1);
  });

  it('no-ops for journey with no stages unless allowEmpty', () => {
    const g = addJourney(base(), 'j1', []);
    const result = prepareJourneyBlueprintDraft(g, 'j1');
    expect(result.boardId).toBeNull();
    // With allowEmpty:
    const result2 = prepareJourneyBlueprintDraft(g, 'j1', { id: 'bp1', allowEmpty: true, now: NOW });
    expect(result2.created).toBe(true);
  });
});

// ─── prepareBlueprintFromJourney ─────────────────────────────────────────────

describe('prepareBlueprintFromJourney', () => {
  it('returns blockers when journey not ready for blueprint', () => {
    let g = base();
    const stage = makeStage('s1', 'j1', { title: 'S', customerAction: 'A', touchpointIds: ['tp1'] });
    const s2 = makeStage('s2', 'j1', { title: 'S2', customerAction: 'A2', touchpointIds: [] });
    g = addJourney(g, 'j1', ['s1', 's2']);
    g = addStage(g, stage);
    g = addStage(g, s2);
    // No touchpoints on s2 → not ready
    const result = prepareBlueprintFromJourney(g, 'j1', { now: NOW });
    expect(result.created).toBe(false);
    expect(result.boardId).toBeNull();
  });

  it('returns blocker when journey has no designContext with persona/problem/evidence', () => {
    let g = base();
    const s1 = makeStage('s1', 'j1', { title: 'S1', customerAction: 'A', touchpointIds: ['tp1'] });
    const s2 = makeStage('s2', 'j1', { title: 'S2', customerAction: 'A', touchpointIds: ['tp2'] });
    g = addJourney(g, 'j1', ['s1', 's2']); // no designContext
    g = addStage(g, s1);
    g = addStage(g, s2);
    const result = prepareBlueprintFromJourney(g, 'j1', { now: NOW });
    expect(result.created).toBe(false);
    expect(result.blockers.length).toBeGreaterThan(0);
  });

  it('creates blueprint board when journey is fully ready', () => {
    let g = base();
    g = addEntity(g, 'persona', 'per1');
    g = addEntity(g, 'problem', 'pr1');
    g = addEntity(g, 'evidence', 'ev1');
    const s1 = makeStage('s1', 'j1', { title: 'S1', customerAction: 'A', touchpointIds: ['tp1'] });
    const s2 = makeStage('s2', 'j1', { title: 'S2', customerAction: 'A', touchpointIds: ['tp2'] });
    g = addJourney(g, 'j1', ['s1', 's2'], {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: ['per1'], needIds: [], jobIds: [], painIds: [], problemIds: ['pr1'], evidenceIds: ['ev1'] },
    });
    g = addStage(g, s1);
    g = addStage(g, s2);
    const result = prepareBlueprintFromJourney(g, 'j1', { id: 'bp1', now: NOW });
    expect(result.created).toBe(true);
    expect(result.boardId).toBe('bp1');
    const board = result.graph.views.whiteboards['bp1'];
    expect(board.viewKind).toBe('blueprint');
    expect(board.journeyId).toBe('j1');
  });
});

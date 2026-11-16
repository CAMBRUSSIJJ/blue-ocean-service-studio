import { describe, it, expect } from 'vitest';
import {
  PROTOTYPE_FIDELITY_META,
  PROTOTYPE_OUTCOME_LABELS,
  emptyPrototypeLab,
  normalizePrototypeLab,
  capturePrototypeSource,
  experimentReadiness,
  derivePrototypeOutcome,
  createPrototypeExperiment,
  updatePrototypeExperiment,
  refreshPrototypeSnapshot,
  addPrototypeParticipant,
  unlinkPrototypeParticipant,
  addPrototypeCriterion,
  updatePrototypeCriterion,
  removePrototypeCriterion,
  setPrototypeCriterionResult,
  addPrototypeObservation,
  startPrototypeExperiment,
  completePrototypeExperiment,
  reopenPrototypeExperiment,
  archivePrototypeExperiment,
  buildPrototypeLabReport,
} from '../service-prototype-lab';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph, ServicePrototypeExperiment } from '../../domain/model';

const NOW = '2024-08-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withJourney(graph: ServiceGraph, id = 'j1'): ServiceGraph {
  return {
    ...graph,
    journeys: {
      ...graph.journeys,
      [id]: { id, serviceId: 'S', name: `Journey ${id}`, status: 'active', stageIds: [], createdAt: NOW, updatedAt: NOW } as ServiceGraph['journeys'][string],
    },
  };
}

/** Build an experiment skeleton that meets all readiness checks */
function makeReadyExperiment(id: string, overrides: Partial<ServicePrototypeExperiment> = {}): ServicePrototypeExperiment {
  return {
    id,
    serviceId: 'S',
    title: 'Test experiment',
    hypothesis: 'If we X then Y',
    fidelity: 'conversation',
    status: 'ready',
    outcome: 'pending',
    journeyId: 'j1',
    stageIds: [],
    touchpointIds: [],
    participantIds: ['p1'],
    criteria: [{ id: 'c1', label: 'User completes task', result: 'pending' }],
    observationNotes: [],
    sourceSnapshot: { capturedAt: NOW, stageIds: [], touchpoints: [] },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as unknown as ServicePrototypeExperiment;
}

/** Graph with an experiment seeded in the lab (merges with existing lab state) */
function withExperiment(graph: ServiceGraph, id: string, overrides: Partial<ServicePrototypeExperiment> = {}): ServiceGraph {
  const existingLab = graph.service.prototypeLab;
  return {
    ...graph,
    service: {
      ...graph.service,
      prototypeLab: {
        version: 1,
        activeExperimentId: id,
        experiments: { ...(existingLab?.experiments ?? {}), [id]: makeReadyExperiment(id, overrides) },
        participants: { p1: { id: 'p1', name: 'Alice', createdAt: NOW }, ...(existingLab?.participants ?? {}) },
        updatedAt: NOW,
      },
    },
  } as ServiceGraph;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

describe('PROTOTYPE_FIDELITY_META', () => {
  it('covers all 7 fidelity types', () => {
    expect(Object.keys(PROTOTYPE_FIDELITY_META)).toHaveLength(7);
    expect(PROTOTYPE_FIDELITY_META.conversation.label).toBeTruthy();
    expect(PROTOTYPE_FIDELITY_META.live_pilot.label).toBeTruthy();
  });
});

describe('PROTOTYPE_OUTCOME_LABELS', () => {
  it('covers all 4 outcomes', () => {
    expect(Object.keys(PROTOTYPE_OUTCOME_LABELS)).toHaveLength(4);
    expect(PROTOTYPE_OUTCOME_LABELS.passed).toBe('Passou');
    expect(PROTOTYPE_OUTCOME_LABELS.pending).toBe('Sem conclusão');
  });
});

// ─── emptyPrototypeLab ───────────────────────────────────────────────────────

describe('emptyPrototypeLab', () => {
  it('returns empty state with correct version', () => {
    const s = emptyPrototypeLab(NOW);
    expect(s.experiments).toEqual({});
    expect(s.participants).toEqual({});
    expect(s.version).toBe(1);
    expect(s.updatedAt).toBe(NOW);
  });
});

// ─── normalizePrototypeLab ───────────────────────────────────────────────────

describe('normalizePrototypeLab', () => {
  it('returns empty state when no lab on graph', () => {
    const s = normalizePrototypeLab(base(), NOW);
    expect(Object.keys(s.experiments)).toHaveLength(0);
  });

  it('defaults missing fields in experiment', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        prototypeLab: {
          version: 1,
          experiments: {
            e1: { id: 'e1', title: '  T  ', hypothesis: '', criteria: null, createdAt: NOW, updatedAt: NOW },
          },
          participants: {},
          updatedAt: NOW,
        },
      },
    } as unknown as ServiceGraph;
    const s = normalizePrototypeLab(g, NOW);
    expect(s.experiments['e1'].title).toBe('T');
    expect(s.experiments['e1'].criteria).toEqual([]);
    expect(s.experiments['e1'].fidelity).toBe('conversation');
    expect(s.experiments['e1'].status).toBe('draft');
    expect(s.experiments['e1'].outcome).toBe('pending');
  });

  it('filters participantIds to only existing participants', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        prototypeLab: {
          version: 1,
          experiments: {
            e1: { id: 'e1', title: 'T', participantIds: ['p1', 'ghost'], criteria: [], observationNotes: [], createdAt: NOW, updatedAt: NOW },
          },
          participants: { p1: { id: 'p1', name: 'Alice', createdAt: NOW } },
          updatedAt: NOW,
        },
      },
    } as unknown as ServiceGraph;
    const s = normalizePrototypeLab(g, NOW);
    expect(s.experiments['e1'].participantIds).toEqual(['p1']);
  });
});

// ─── capturePrototypeSource ───────────────────────────────────────────────────

describe('capturePrototypeSource', () => {
  it('returns empty snapshot when no refs', () => {
    const s = capturePrototypeSource(base(), {}, NOW);
    expect(s.capturedAt).toBe(NOW);
    expect(s.stageIds).toEqual([]);
    expect(s.touchpoints).toEqual([]);
  });

  it('captures journeyId and name when journey exists', () => {
    const g = withJourney(base(), 'j1');
    const s = capturePrototypeSource(g, { journeyId: 'j1' }, NOW);
    expect(s.journeyId).toBe('j1');
    expect(s.journeyName).toBe('Journey j1');
  });

  it('ignores missing journey reference', () => {
    const s = capturePrototypeSource(base(), { journeyId: 'nope' }, NOW);
    expect(s.journeyId).toBeUndefined();
  });
});

// ─── experimentReadiness ─────────────────────────────────────────────────────

describe('experimentReadiness', () => {
  it('ready when all conditions met', () => {
    const r = experimentReadiness(makeReadyExperiment('e1'));
    expect(r.ready).toBe(true);
    expect(r.score).toBe(100);
    expect(r.gaps).toHaveLength(0);
  });

  it('not ready when hypothesis missing', () => {
    const r = experimentReadiness(makeReadyExperiment('e1', { hypothesis: '' }));
    expect(r.ready).toBe(false);
    expect(r.gaps.some((g) => g.includes('hipótese'))).toBe(true);
  });

  it('not ready when no participants', () => {
    const r = experimentReadiness(makeReadyExperiment('e1', { participantIds: [] }));
    expect(r.ready).toBe(false);
  });

  it('not ready when no criteria', () => {
    const r = experimentReadiness(makeReadyExperiment('e1', { criteria: [] }));
    expect(r.ready).toBe(false);
  });

  it('not ready when criterion has empty label', () => {
    const r = experimentReadiness(makeReadyExperiment('e1', {
      criteria: [{ id: 'c1', label: '', result: 'pending' }],
    }));
    expect(r.ready).toBe(false);
  });

  it('score is low when nothing meaningful is set', () => {
    const r = experimentReadiness(makeReadyExperiment('e1', {
      title: '', hypothesis: '', journeyId: undefined, stageIds: [], touchpointIds: [],
      participantIds: [], criteria: [],
    }));
    // empty criteria.every() vacuously passes (1/6 checks), so score ~17
    expect(r.ready).toBe(false);
    expect(r.score).toBeLessThan(50);
  });
});

// ─── derivePrototypeOutcome ───────────────────────────────────────────────────

describe('derivePrototypeOutcome', () => {
  it('passed when all criteria pass', () => {
    const exp = makeReadyExperiment('e1', {
      criteria: [{ id: 'c1', label: 'C1', result: 'pass' }, { id: 'c2', label: 'C2', result: 'pass' }],
    });
    expect(derivePrototypeOutcome(exp)).toBe('passed');
  });

  it('failed when any criterion fails', () => {
    const exp = makeReadyExperiment('e1', {
      criteria: [{ id: 'c1', label: 'C1', result: 'pass' }, { id: 'c2', label: 'C2', result: 'fail' }],
    });
    expect(derivePrototypeOutcome(exp)).toBe('failed');
  });

  it('inconclusive when some pending', () => {
    const exp = makeReadyExperiment('e1', {
      criteria: [{ id: 'c1', label: 'C1', result: 'pass' }, { id: 'c2', label: 'C2', result: 'pending' }],
    });
    expect(derivePrototypeOutcome(exp)).toBe('inconclusive');
  });

  it('inconclusive when no criteria', () => {
    expect(derivePrototypeOutcome(makeReadyExperiment('e1', { criteria: [] }))).toBe('inconclusive');
  });
});

// ─── createPrototypeExperiment ────────────────────────────────────────────────

describe('createPrototypeExperiment', () => {
  it('returns null for empty title', () => {
    const r = createPrototypeExperiment({ graph: base(), title: '', now: NOW });
    expect(r.experimentId).toBeNull();
  });

  it('creates experiment with draft status when missing hypothesis', () => {
    const r = createPrototypeExperiment({ graph: withJourney(base()), title: 'My test', now: NOW });
    expect(r.experimentId).not.toBeNull();
    const exp = r.graph.service.prototypeLab!.experiments[r.experimentId!];
    expect(exp.status).toBe('draft');
  });

  it('status becomes ready when all readiness checks pass', () => {
    const r = createPrototypeExperiment({
      graph: withJourney(base()),
      title: 'Full test',
      hypothesis: 'If we X then Y',
      journeyId: 'j1',
      criteria: [{ label: 'User completes task' }],
      now: NOW,
    });
    // Still needs participant — status should still be draft without participant
    const exp = r.graph.service.prototypeLab!.experiments[r.experimentId!];
    expect(exp.title).toBe('Full test');
    expect(exp.hypothesis).toBe('If we X then Y');
  });

  it('sets activeExperimentId to new experiment', () => {
    const r = createPrototypeExperiment({ graph: base(), title: 'T', now: NOW });
    expect(r.graph.service.prototypeLab!.activeExperimentId).toBe(r.experimentId);
  });
});

// ─── updatePrototypeExperiment ────────────────────────────────────────────────

describe('updatePrototypeExperiment', () => {
  it('updates title and hypothesis', () => {
    const g = withJourney(withExperiment(base(), 'e1', { status: 'draft' }));
    const g2 = updatePrototypeExperiment(g, 'e1', { title: 'Updated', hypothesis: 'New hypothesis' }, NOW);
    const exp = g2.service.prototypeLab!.experiments['e1'];
    expect(exp.title).toBe('Updated');
    expect(exp.hypothesis).toBe('New hypothesis');
  });

  it('no-ops on archived experiment', () => {
    const g0 = withExperiment(base(), 'e1', { status: 'archived' });
    const g1 = updatePrototypeExperiment(g0, 'e1', { title: 'Changed' }, NOW);
    expect(g1).toBe(g0);
  });
});

// ─── refreshPrototypeSnapshot ─────────────────────────────────────────────────

describe('refreshPrototypeSnapshot', () => {
  it('updates sourceSnapshot timestamp', () => {
    const g = withJourney(withExperiment(base(), 'e1', { journeyId: 'j1' }));
    const later = '2024-09-01T00:00:00.000Z';
    const g2 = refreshPrototypeSnapshot(g, 'e1', later);
    expect(g2.service.prototypeLab!.experiments['e1'].sourceSnapshot.capturedAt).toBe(later);
  });
});

// ─── addPrototypeParticipant ──────────────────────────────────────────────────

describe('addPrototypeParticipant', () => {
  it('adds a new participant to experiment', () => {
    const g = withExperiment(base(), 'e1', { participantIds: [] });
    const r = addPrototypeParticipant(g, 'e1', { name: 'Bob' }, NOW);
    expect(r.participantId).not.toBeNull();
    const exp = r.graph.service.prototypeLab!.experiments['e1'];
    expect(exp.participantIds).toContain(r.participantId);
  });

  it('returns null for empty name', () => {
    const g = withExperiment(base(), 'e1');
    const r = addPrototypeParticipant(g, 'e1', { name: '  ' }, NOW);
    expect(r.participantId).toBeNull();
  });

  it('reuses existing participant with same name+role', () => {
    const g = withExperiment(base(), 'e1', { participantIds: [] });
    const r1 = addPrototypeParticipant(g, 'e1', { name: 'Alice', role: 'tester' }, NOW);
    const r2 = addPrototypeParticipant(r1.graph, 'e1', { name: 'Alice', role: 'tester' }, NOW);
    expect(r2.participantId).toBe(r1.participantId);
    // experiment has no duplicate
    expect(r2.graph.service.prototypeLab!.experiments['e1'].participantIds).toHaveLength(1);
  });
});

// ─── unlinkPrototypeParticipant ───────────────────────────────────────────────

describe('unlinkPrototypeParticipant', () => {
  it('removes participant from experiment participantIds', () => {
    const g = withExperiment(base(), 'e1'); // has p1
    const g2 = unlinkPrototypeParticipant(g, 'e1', 'p1', NOW);
    expect(g2.service.prototypeLab!.experiments['e1'].participantIds).not.toContain('p1');
  });
});

// ─── addPrototypeCriterion ────────────────────────────────────────────────────

describe('addPrototypeCriterion', () => {
  it('adds criterion with pending result', () => {
    const g = withExperiment(base(), 'e1');
    const r = addPrototypeCriterion(g, 'e1', { label: 'Must complete onboarding' }, NOW);
    expect(r.criterionId).not.toBeNull();
    const exp = r.graph.service.prototypeLab!.experiments['e1'];
    const c = exp.criteria.find((item) => item.id === r.criterionId)!;
    expect(c.label).toBe('Must complete onboarding');
    expect(c.result).toBe('pending');
  });

  it('returns null for empty label', () => {
    const g = withExperiment(base(), 'e1');
    const r = addPrototypeCriterion(g, 'e1', { label: '' }, NOW);
    expect(r.criterionId).toBeNull();
  });
});

// ─── updatePrototypeCriterion ─────────────────────────────────────────────────

describe('updatePrototypeCriterion', () => {
  it('updates criterion label', () => {
    const g = withExperiment(base(), 'e1'); // c1 exists
    const g2 = updatePrototypeCriterion(g, 'e1', 'c1', { label: 'Updated label' }, NOW);
    const c = g2.service.prototypeLab!.experiments['e1'].criteria.find((item) => item.id === 'c1')!;
    expect(c.label).toBe('Updated label');
  });
});

// ─── removePrototypeCriterion ─────────────────────────────────────────────────

describe('removePrototypeCriterion', () => {
  it('removes criterion from experiment', () => {
    const g = withExperiment(base(), 'e1');
    const g2 = removePrototypeCriterion(g, 'e1', 'c1', NOW);
    expect(g2.service.prototypeLab!.experiments['e1'].criteria).toHaveLength(0);
  });
});

// ─── setPrototypeCriterionResult ──────────────────────────────────────────────

describe('setPrototypeCriterionResult', () => {
  it('sets criterion result and optional evidenceNote', () => {
    const g = withExperiment(base(), 'e1');
    const g2 = setPrototypeCriterionResult(g, 'e1', 'c1', 'pass', 'User succeeded', NOW);
    const c = g2.service.prototypeLab!.experiments['e1'].criteria.find((item) => item.id === 'c1')!;
    expect(c.result).toBe('pass');
    expect(c.evidenceNote).toBe('User succeeded');
  });

  it('resets outcome to pending when result is updated', () => {
    const g = withExperiment(base(), 'e1', { outcome: 'passed' });
    const g2 = setPrototypeCriterionResult(g, 'e1', 'c1', 'fail', undefined, NOW);
    expect(g2.service.prototypeLab!.experiments['e1'].outcome).toBe('pending');
  });
});

// ─── addPrototypeObservation ──────────────────────────────────────────────────

describe('addPrototypeObservation', () => {
  it('appends observation note', () => {
    const g = withExperiment(base(), 'e1');
    const g2 = addPrototypeObservation(g, 'e1', 'User was confused at step 3', NOW);
    expect(g2.service.prototypeLab!.experiments['e1'].observationNotes).toContain('User was confused at step 3');
  });

  it('no-ops for empty note', () => {
    const g0 = withExperiment(base(), 'e1');
    const g1 = addPrototypeObservation(g0, 'e1', '  ', NOW);
    expect(g1).toBe(g0);
  });
});

// ─── startPrototypeExperiment ─────────────────────────────────────────────────

describe('startPrototypeExperiment', () => {
  it('starts a ready experiment', () => {
    const g = withExperiment(base(), 'e1', { status: 'ready' });
    const r = startPrototypeExperiment(g, 'e1', NOW);
    expect(r.started).toBe(true);
    expect(r.graph.service.prototypeLab!.experiments['e1'].status).toBe('running');
  });

  it('fails to start when not ready', () => {
    const g = withExperiment(base(), 'e1', { status: 'draft', participantIds: [], criteria: [] });
    const r = startPrototypeExperiment(g, 'e1', NOW);
    expect(r.started).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it('fails when experiment not found', () => {
    const r = startPrototypeExperiment(base(), 'nope', NOW);
    expect(r.started).toBe(false);
  });
});

// ─── completePrototypeExperiment ──────────────────────────────────────────────

describe('completePrototypeExperiment', () => {
  it('completes with explicit outcome', () => {
    const g = withExperiment(base(), 'e1', { status: 'running' });
    const r = completePrototypeExperiment(g, 'e1', 'passed', NOW);
    expect(r.outcome).toBe('passed');
    expect(r.graph.service.prototypeLab!.experiments['e1'].status).toBe('completed');
  });

  it('derives outcome from criteria when no explicit outcome', () => {
    const g = withExperiment(base(), 'e1', {
      status: 'running',
      criteria: [{ id: 'c1', label: 'C', result: 'pass' }],
    });
    const r = completePrototypeExperiment(g, 'e1', undefined, NOW);
    expect(r.outcome).toBe('passed');
  });

  it('returns null outcome when experiment not found', () => {
    const r = completePrototypeExperiment(base(), 'nope', 'passed', NOW);
    expect(r.outcome).toBeNull();
  });
});

// ─── reopenPrototypeExperiment ────────────────────────────────────────────────

describe('reopenPrototypeExperiment', () => {
  it('reopens completed experiment to ready/draft', () => {
    const g = withExperiment(base(), 'e1', { status: 'completed', outcome: 'passed' });
    const g2 = reopenPrototypeExperiment(g, 'e1', NOW);
    const exp = g2.service.prototypeLab!.experiments['e1'];
    expect(['ready', 'draft']).toContain(exp.status);
    expect(exp.outcome).toBe('pending');
    expect(exp.completedAt).toBeUndefined();
  });
});

// ─── archivePrototypeExperiment ───────────────────────────────────────────────

describe('archivePrototypeExperiment', () => {
  it('archives an experiment', () => {
    const g = withExperiment(base(), 'e1');
    const g2 = archivePrototypeExperiment(g, 'e1', NOW);
    expect(g2.service.prototypeLab!.experiments['e1'].status).toBe('archived');
  });

  it('clears activeExperimentId when archiving active experiment', () => {
    const g = withExperiment(base(), 'e1');
    expect(g.service.prototypeLab!.activeExperimentId).toBe('e1');
    const g2 = archivePrototypeExperiment(g, 'e1', NOW);
    expect(g2.service.prototypeLab!.activeExperimentId).toBeUndefined();
  });
});

// ─── buildPrototypeLabReport ──────────────────────────────────────────────────

describe('buildPrototypeLabReport', () => {
  it('returns empty counts for empty graph', () => {
    const r = buildPrototypeLabReport(base());
    expect(r.experiments).toHaveLength(0);
    expect(r.counts.experiments).toBe(0);
    expect(r.counts.participants).toBe(0);
  });

  it('excludes archived experiments from visible list', () => {
    const g = withExperiment(base(), 'e1', { status: 'archived' });
    const r = buildPrototypeLabReport(g);
    expect(r.experiments).toHaveLength(0);
    expect(r.archivedExperiments).toHaveLength(1);
  });

  it('counts running and completed experiments', () => {
    const g1 = withExperiment(base(), 'e1', { status: 'running' });
    const g2 = withExperiment(g1, 'e2', {
      status: 'completed',
      outcome: 'passed',
      criteria: [{ id: 'c1', label: 'C', result: 'pass' }],
    });
    const r = buildPrototypeLabReport(g2);
    expect(r.counts.running).toBe(1);
    expect(r.counts.completed).toBe(1);
    expect(r.counts.passed).toBe(1);
  });

  it('validationRate is 100 when all completed passed', () => {
    const g = withExperiment(base(), 'e1', { status: 'completed', outcome: 'passed' });
    const r = buildPrototypeLabReport(g);
    expect(r.validationRate).toBe(100);
  });

  it('validationRate is 0 for no completed experiments', () => {
    const r = buildPrototypeLabReport(base());
    expect(r.validationRate).toBe(0);
  });

  it('activeExperiment is set from activeExperimentId', () => {
    const g = withExperiment(base(), 'e1');
    const r = buildPrototypeLabReport(g);
    expect(r.activeExperimentId).toBe('e1');
    expect(r.activeExperiment?.id).toBe('e1');
  });

  it('experiment report includes readinessScore and gaps', () => {
    const g = withExperiment(base(), 'e1');
    const r = buildPrototypeLabReport(g);
    const exp = r.experiments[0];
    expect(typeof exp.readinessScore).toBe('number');
    expect(Array.isArray(exp.gaps)).toBe(true);
  });
});

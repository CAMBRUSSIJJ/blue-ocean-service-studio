import { describe, it, expect } from 'vitest';
import {
  DECISION_STATUS_LABELS,
  DECISION_TARGET_LABELS,
  DECISION_TARGET_FIELDS,
  DECISION_VALUE_OPTIONS,
  validateDecisionProposedValue,
  emptyDecisionSystem,
  normalizeDecisionSystem,
  readDecisionTargetValue,
  createDecisionFromLearning,
  updateDecisionRecord,
  addDecisionChange,
  removeDecisionChange,
  submitDecision,
  decideServiceChange,
  reopenDecision,
  applyApprovedDecision,
  archiveDecision,
  buildDecisionLoopReport,
} from '../decision-iteration-loop';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-07-01T12:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withLearningRecord(graph: ServiceGraph, id: string, status = 'reviewed'): ServiceGraph {
  return {
    ...graph,
    service: {
      ...graph.service,
      learningSystem: {
        version: 1,
        records: {
          ...graph.service.learningSystem?.records,
          [id]: {
            id, serviceId: 'S', experimentId: 'exp1', experimentCompletedAt: NOW,
            hypothesisSnapshot: 'If we X then Y', verdict: 'validated', confidence: 'high',
            recommendation: 'adopt', status, summary: 'Experiment passed convincingly',
            evidenceIds: [], createdAt: NOW, updatedAt: NOW,
          },
        },
        updatedAt: NOW,
      },
    },
  } as ServiceGraph;
}

function withJourney(graph: ServiceGraph, id: string, status = 'draft'): ServiceGraph {
  return {
    ...graph,
    journeys: {
      ...graph.journeys,
      [id]: {
        id, serviceId: 'S', name: `Journey ${id}`, status, stageIds: [],
        createdAt: NOW, updatedAt: NOW,
      } as ServiceGraph['journeys'][string],
    },
  };
}

function withProposition(graph: ServiceGraph): ServiceGraph {
  return {
    ...graph,
    service: {
      ...graph.service,
      proposition: {
        version: 1,
        current: {
          version: 1, status: 'draft', audience: 'SaaS companies', problem: 'High churn',
          promise: 'Onboarding platform', outcome: 'More retained customers',
          experience: 'Guided flow', differentiator: 'No-code',
          businessValue: 'Reduce churn 20%', capabilities: [], principles: [],
          linkedInsightIds: [], linkedNeedIds: [], linkedProblemIds: [], linkedEvidenceIds: [],
          createdAt: NOW, updatedAt: NOW,
        },
        updatedAt: NOW,
      },
    },
  } as ServiceGraph;
}

/** Build a decision already in `approved` state with one journey-status change */
function withApprovedDecision(graph: ServiceGraph, decisionId: string): ServiceGraph {
  const g = withJourney(graph, 'j1', 'draft');
  return {
    ...g,
    service: {
      ...g.service,
      decisionSystem: {
        version: 1,
        activeDecisionId: decisionId,
        records: {
          [decisionId]: {
            id: decisionId, serviceId: 'S', learningId: 'lr1',
            title: 'Change journey status', rationale: 'Based on learning',
            status: 'approved', recommendationSnapshot: 'adopt', confidenceSnapshot: 'high',
            learningSummarySnapshot: 'Summary',
            changes: [{
              id: 'ch1', targetKind: 'journey', targetId: 'j1', targetLabel: 'Journey j1',
              field: 'status', beforeValue: 'draft', proposedValue: 'active',
            }],
            submittedAt: NOW, decidedAt: NOW,
            createdAt: NOW, updatedAt: NOW,
          },
        },
        updatedAt: NOW,
      },
    },
  } as ServiceGraph;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

describe('DECISION_STATUS_LABELS', () => {
  it('covers all 6 statuses', () => {
    expect(Object.keys(DECISION_STATUS_LABELS)).toHaveLength(6);
    expect(DECISION_STATUS_LABELS.draft).toBe('Rascunho');
    expect(DECISION_STATUS_LABELS.applied).toBe('Aplicada');
  });
});

describe('DECISION_TARGET_LABELS', () => {
  it('covers proposition, journey, blueprint', () => {
    expect(DECISION_TARGET_LABELS.proposition).toBe('Proposição');
    expect(DECISION_TARGET_LABELS.journey).toBe('Journey');
    expect(DECISION_TARGET_LABELS.blueprint).toBe('Blueprint');
  });
});

describe('DECISION_TARGET_FIELDS', () => {
  it('proposition has 8 fields', () => {
    expect(DECISION_TARGET_FIELDS.proposition).toHaveLength(8);
  });
  it('journey has 5 fields', () => {
    expect(DECISION_TARGET_FIELDS.journey).toHaveLength(5);
  });
  it('blueprint has 1 field (name)', () => {
    expect(DECISION_TARGET_FIELDS.blueprint).toHaveLength(1);
    expect(DECISION_TARGET_FIELDS.blueprint[0].value).toBe('name');
  });
});

describe('DECISION_VALUE_OPTIONS', () => {
  it('provides options for proposition:status', () => {
    expect(DECISION_VALUE_OPTIONS['proposition:status']).toHaveLength(3);
  });
  it('provides options for journey:priority', () => {
    const opts = DECISION_VALUE_OPTIONS['journey:priority'];
    expect(opts.map((o) => o.value)).toContain('critical');
  });
});

// ─── validateDecisionProposedValue ───────────────────────────────────────────

describe('validateDecisionProposedValue', () => {
  it('returns null for valid journey name', () => {
    expect(validateDecisionProposedValue('journey', 'name', 'New name')).toBeNull();
  });

  it('returns error for empty journey name', () => {
    expect(validateDecisionProposedValue('journey', 'name', '')).not.toBeNull();
  });

  it('returns error for invalid enumerated value', () => {
    expect(validateDecisionProposedValue('journey', 'status', 'unknown')).not.toBeNull();
  });

  it('returns null for valid enumerated value', () => {
    expect(validateDecisionProposedValue('journey', 'status', 'active')).toBeNull();
  });

  it('returns error for empty proposition field', () => {
    expect(validateDecisionProposedValue('proposition', 'audience', '')).not.toBeNull();
  });
});

// ─── emptyDecisionSystem ─────────────────────────────────────────────────────

describe('emptyDecisionSystem', () => {
  it('returns state with empty records', () => {
    const s = emptyDecisionSystem(NOW);
    expect(s.records).toEqual({});
    expect(s.updatedAt).toBe(NOW);
    expect(s.version).toBe(1);
  });
});

// ─── normalizeDecisionSystem ──────────────────────────────────────────────────

describe('normalizeDecisionSystem', () => {
  it('returns empty state when no decisionSystem on graph', () => {
    const s = normalizeDecisionSystem(base(), NOW);
    expect(Object.keys(s.records)).toHaveLength(0);
  });

  it('normalizes record fields to clean strings', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        decisionSystem: {
          version: 1,
          records: {
            d1: {
              id: 'd1', serviceId: 'S', learningId: '  lr1  ', title: '  T  ', rationale: '',
              status: 'draft', recommendationSnapshot: undefined, confidenceSnapshot: undefined,
              learningSummarySnapshot: '', changes: [], createdAt: NOW, updatedAt: NOW,
            },
          },
          updatedAt: NOW,
        },
      },
    } as unknown as ServiceGraph;
    const s = normalizeDecisionSystem(g, NOW);
    expect(s.records['d1'].learningId).toBe('lr1');
    expect(s.records['d1'].title).toBe('T');
    expect(s.records['d1'].recommendationSnapshot).toBe('iterate');
  });

  it('clears activeDecisionId when record does not exist', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        decisionSystem: {
          version: 1, records: {}, activeDecisionId: 'ghost', updatedAt: NOW,
        },
      },
    } as unknown as ServiceGraph;
    expect(normalizeDecisionSystem(g, NOW).activeDecisionId).toBeUndefined();
  });
});

// ─── readDecisionTargetValue ──────────────────────────────────────────────────

describe('readDecisionTargetValue', () => {
  it('reads proposition field', () => {
    const g = withProposition(base());
    expect(readDecisionTargetValue(g, 'proposition', 'audience')).toBe('SaaS companies');
  });

  it('returns null for missing proposition', () => {
    expect(readDecisionTargetValue(base(), 'proposition', 'audience')).toBeNull();
  });

  it('reads journey field', () => {
    const g = withJourney(base(), 'j1', 'draft');
    expect(readDecisionTargetValue(g, 'journey', 'status', 'j1')).toBe('draft');
  });

  it('returns null for missing journey', () => {
    expect(readDecisionTargetValue(base(), 'journey', 'status', 'nope')).toBeNull();
  });

  it('returns null for invalid field', () => {
    const g = withJourney(base(), 'j1');
    expect(readDecisionTargetValue(g, 'journey', 'nonexistent', 'j1')).toBeNull();
  });
});

// ─── createDecisionFromLearning ───────────────────────────────────────────────

describe('createDecisionFromLearning', () => {
  it('returns created: false when learning not found', () => {
    const r = createDecisionFromLearning(base(), 'missing', NOW);
    expect(r.created).toBe(false);
    expect(r.decisionId).toBeNull();
  });

  it('returns created: false when learning not reviewed', () => {
    const g = withLearningRecord(base(), 'lr1', 'draft');
    const r = createDecisionFromLearning(g, 'lr1', NOW);
    expect(r.created).toBe(false);
  });

  it('creates decision from reviewed learning', () => {
    const g = withLearningRecord(base(), 'lr1', 'reviewed');
    const r = createDecisionFromLearning(g, 'lr1', NOW);
    expect(r.created).toBe(true);
    expect(r.decisionId).not.toBeNull();
    const system = r.graph.service.decisionSystem!;
    expect(system.records[r.decisionId!]).toBeDefined();
    expect(system.records[r.decisionId!].status).toBe('draft');
    expect(system.activeDecisionId).toBe(r.decisionId);
  });

  it('reuses existing active decision for same learning', () => {
    const g = withLearningRecord(base(), 'lr1', 'reviewed');
    const r1 = createDecisionFromLearning(g, 'lr1', NOW);
    const r2 = createDecisionFromLearning(r1.graph, 'lr1', NOW);
    expect(r2.created).toBe(false);
    expect(r2.decisionId).toBe(r1.decisionId);
  });
});

// ─── updateDecisionRecord ─────────────────────────────────────────────────────

describe('updateDecisionRecord', () => {
  it('updates title and rationale on draft decision', () => {
    const g = withLearningRecord(base(), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    const g3 = updateDecisionRecord(g2, decisionId!, { title: 'New title', rationale: 'New rationale' }, NOW);
    const record = g3.service.decisionSystem!.records[decisionId!];
    expect(record.title).toBe('New title');
    expect(record.rationale).toBe('New rationale');
  });

  it('no-ops when decision does not exist', () => {
    const g0 = base();
    const g1 = updateDecisionRecord(g0, 'ghost', { title: 'X' }, NOW);
    expect(g1).toBe(g0); // same reference — nothing was mutated
  });
});

// ─── addDecisionChange ────────────────────────────────────────────────────────

describe('addDecisionChange', () => {
  function draftDecision() {
    const g = withLearningRecord(withJourney(base(), 'j1', 'draft'), 'lr1', 'reviewed');
    return createDecisionFromLearning(g, 'lr1', NOW);
  }

  it('adds change with valid target and value', () => {
    const { graph: g2, decisionId } = draftDecision();
    const r = addDecisionChange(g2, decisionId!, {
      targetKind: 'journey', targetId: 'j1', field: 'status', proposedValue: 'active',
    }, NOW);
    expect(r.changeId).not.toBeNull();
    const changes = r.graph.service.decisionSystem!.records[decisionId!].changes;
    expect(changes).toHaveLength(1);
    expect(changes[0].beforeValue).toBe('draft');
    expect(changes[0].proposedValue).toBe('active');
  });

  it('returns reason when target is missing', () => {
    const { graph: g2, decisionId } = draftDecision();
    const r = addDecisionChange(g2, decisionId!, {
      targetKind: 'journey', targetId: 'missing', field: 'status', proposedValue: 'active',
    }, NOW);
    expect(r.changeId).toBeNull();
    expect(r.reason).toBeTruthy();
  });

  it('returns reason when proposed value equals current', () => {
    const { graph: g2, decisionId } = draftDecision();
    const r = addDecisionChange(g2, decisionId!, {
      targetKind: 'journey', targetId: 'j1', field: 'status', proposedValue: 'draft',
    }, NOW);
    expect(r.changeId).toBeNull();
  });

  it('updates existing change for same target+field', () => {
    const { graph: g2, decisionId } = draftDecision();
    const r1 = addDecisionChange(g2, decisionId!, { targetKind: 'journey', targetId: 'j1', field: 'status', proposedValue: 'active' }, NOW);
    const r2 = addDecisionChange(r1.graph, decisionId!, { targetKind: 'journey', targetId: 'j1', field: 'status', proposedValue: 'archived' }, NOW);
    const changes = r2.graph.service.decisionSystem!.records[decisionId!].changes;
    expect(changes).toHaveLength(1); // updated, not duplicated
    expect(changes[0].proposedValue).toBe('archived');
  });
});

// ─── removeDecisionChange ──────────────────────────────────────────────────────

describe('removeDecisionChange', () => {
  it('removes an existing change', () => {
    const g = withLearningRecord(withJourney(base(), 'j1', 'draft'), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    const r = addDecisionChange(g2, decisionId!, { targetKind: 'journey', targetId: 'j1', field: 'status', proposedValue: 'active' }, NOW);
    const changeId = r.changeId!;
    const g3 = removeDecisionChange(r.graph, decisionId!, changeId, NOW);
    expect(g3.service.decisionSystem!.records[decisionId!].changes).toHaveLength(0);
  });
});

// ─── submitDecision ───────────────────────────────────────────────────────────

describe('submitDecision', () => {
  function readyToSubmit() {
    const g = withLearningRecord(withJourney(base(), 'j1', 'draft'), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    const { graph: g3 } = addDecisionChange(g2, decisionId!, { targetKind: 'journey', targetId: 'j1', field: 'status', proposedValue: 'active' }, NOW);
    return { graph: g3, decisionId: decisionId! };
  }

  it('submits draft with changes', () => {
    const { graph: g, decisionId } = readyToSubmit();
    const r = submitDecision(g, decisionId, NOW);
    expect(r.submitted).toBe(true);
    expect(r.graph.service.decisionSystem!.records[decisionId].status).toBe('proposed');
  });

  it('fails when no changes', () => {
    const g2 = withLearningRecord(base(), 'lr1', 'reviewed');
    const { graph: g3, decisionId } = createDecisionFromLearning(g2, 'lr1', NOW);
    const r = submitDecision(g3, decisionId!, NOW);
    expect(r.submitted).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it('fails when not in draft', () => {
    const { graph: g, decisionId } = readyToSubmit();
    const r1 = submitDecision(g, decisionId, NOW);
    const r2 = submitDecision(r1.graph, decisionId, NOW);
    expect(r2.submitted).toBe(false);
  });
});

// ─── decideServiceChange ──────────────────────────────────────────────────────

describe('decideServiceChange', () => {
  function proposedDecision() {
    const g = withLearningRecord(withJourney(base(), 'j1', 'draft'), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    const { graph: g3 } = addDecisionChange(g2, decisionId!, { targetKind: 'journey', targetId: 'j1', field: 'status', proposedValue: 'active' }, NOW);
    const { graph: g4 } = submitDecision(g3, decisionId!, NOW);
    return { graph: g4, decisionId: decisionId! };
  }

  it('approves a proposed decision', () => {
    const { graph: g, decisionId } = proposedDecision();
    const r = decideServiceChange(g, decisionId, 'approved', { decidedBy: 'owner' }, NOW);
    expect(r.decided).toBe(true);
    expect(r.graph.service.decisionSystem!.records[decisionId].status).toBe('approved');
    expect(r.graph.service.decisionSystem!.records[decisionId].decidedBy).toBe('owner');
  });

  it('rejects a proposed decision', () => {
    const { graph: g, decisionId } = proposedDecision();
    const r = decideServiceChange(g, decisionId, 'rejected', {}, NOW);
    expect(r.decided).toBe(true);
    expect(r.graph.service.decisionSystem!.records[decisionId].status).toBe('rejected');
  });

  it('fails when not proposed', () => {
    const r = decideServiceChange(base(), 'ghost', 'approved', {}, NOW);
    expect(r.decided).toBe(false);
  });
});

// ─── reopenDecision ───────────────────────────────────────────────────────────

describe('reopenDecision', () => {
  it('reopens a rejected decision to draft', () => {
    const g = withLearningRecord(withJourney(base(), 'j1', 'draft'), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    const { graph: g3 } = addDecisionChange(g2, decisionId!, { targetKind: 'journey', targetId: 'j1', field: 'status', proposedValue: 'active' }, NOW);
    const { graph: g4 } = submitDecision(g3, decisionId!, NOW);
    const { graph: g5 } = decideServiceChange(g4, decisionId!, 'rejected', {}, NOW);
    const g6 = reopenDecision(g5, decisionId!, NOW);
    expect(g6.service.decisionSystem!.records[decisionId!].status).toBe('draft');
  });

  it('no-ops on applied decision', () => {
    const g = withApprovedDecision(base(), 'd1');
    const applied = applyApprovedDecision(g, 'd1', NOW);
    const r = reopenDecision(applied.graph, 'd1', NOW);
    expect(r.service.decisionSystem!.records['d1'].status).toBe('applied');
  });
});

// ─── applyApprovedDecision ────────────────────────────────────────────────────

describe('applyApprovedDecision', () => {
  it('applies changes and transitions to applied', () => {
    const g = withApprovedDecision(base(), 'd1');
    const r = applyApprovedDecision(g, 'd1', NOW);
    expect(r.applied).toBe(true);
    expect(r.conflict).toBe(false);
    expect(r.graph.journeys['j1']?.status).toBe('active');
    expect(r.graph.service.decisionSystem!.records['d1'].status).toBe('applied');
  });

  it('returns conflict when beforeValue no longer matches', () => {
    // Journey status has already changed to 'active' — different from beforeValue 'draft'
    const base2 = withJourney(base(), 'j1', 'active');
    const g = {
      ...base2,
      service: {
        ...base2.service,
        decisionSystem: {
          version: 1,
          activeDecisionId: 'd1',
          records: {
            d1: {
              id: 'd1', serviceId: 'S', learningId: 'lr1',
              title: 'T', rationale: 'R', status: 'approved',
              recommendationSnapshot: 'adopt', confidenceSnapshot: 'high',
              learningSummarySnapshot: '', changes: [{
                id: 'ch1', targetKind: 'journey', targetId: 'j1', targetLabel: 'Journey j1',
                field: 'status', beforeValue: 'draft', proposedValue: 'archived',
              }],
              createdAt: NOW, updatedAt: NOW,
            },
          },
          updatedAt: NOW,
        },
      },
    } as unknown as ServiceGraph;
    const r = applyApprovedDecision(g, 'd1', NOW);
    expect(r.applied).toBe(false);
    expect(r.conflict).toBe(true);
  });

  it('fails when decision not found', () => {
    const r = applyApprovedDecision(base(), 'ghost', NOW);
    expect(r.applied).toBe(false);
    expect(r.conflict).toBe(false);
  });
});

// ─── archiveDecision ──────────────────────────────────────────────────────────

describe('archiveDecision', () => {
  it('archives a draft decision', () => {
    const g = withLearningRecord(base(), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    const g3 = archiveDecision(g2, decisionId!, NOW);
    expect(g3.service.decisionSystem!.records[decisionId!].status).toBe('archived');
  });

  it('clears activeDecisionId when archiving active decision', () => {
    const g = withLearningRecord(base(), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    expect(g2.service.decisionSystem!.activeDecisionId).toBe(decisionId);
    const g3 = archiveDecision(g2, decisionId!, NOW);
    expect(g3.service.decisionSystem!.activeDecisionId).toBeUndefined();
  });

  it('does not archive applied decision', () => {
    const g = withApprovedDecision(base(), 'd1');
    const applied = applyApprovedDecision(g, 'd1', NOW);
    const r = archiveDecision(applied.graph, 'd1', NOW);
    expect(r.service.decisionSystem!.records['d1'].status).toBe('applied');
  });
});

// ─── buildDecisionLoopReport ──────────────────────────────────────────────────

describe('buildDecisionLoopReport', () => {
  it('returns empty counts for empty graph', () => {
    const r = buildDecisionLoopReport(base());
    expect(r.records).toHaveLength(0);
    expect(r.counts.decisions).toBe(0);
    expect(r.eligibleLearnings).toHaveLength(0);
  });

  it('counts decisions by status', () => {
    const g = withLearningRecord(withJourney(base(), 'j1', 'draft'), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    const r = buildDecisionLoopReport(g2);
    expect(r.counts.draft).toBe(1);
    expect(r.counts.decisions).toBe(1);
  });

  it('excludes archived decisions from counts', () => {
    const g = withLearningRecord(base(), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    const g3 = archiveDecision(g2, decisionId!, NOW);
    const r = buildDecisionLoopReport(g3);
    expect(r.records).toHaveLength(0);
    expect(r.counts.decisions).toBe(0);
  });

  it('shows eligible learnings not yet covered by a decision', () => {
    // Two reviewed learnings; only one has a decision
    const g = withLearningRecord(withLearningRecord(base(), 'lr1', 'reviewed'), 'lr2', 'reviewed');
    const { graph: g2 } = createDecisionFromLearning(g, 'lr1', NOW);
    const r = buildDecisionLoopReport(g2);
    expect(r.eligibleLearnings.map((l) => l.id)).toContain('lr2');
    expect(r.eligibleLearnings.map((l) => l.id)).not.toContain('lr1');
  });

  it('activeDecisionId reflects current system', () => {
    const g = withLearningRecord(base(), 'lr1', 'reviewed');
    const { graph: g2, decisionId } = createDecisionFromLearning(g, 'lr1', NOW);
    const r = buildDecisionLoopReport(g2);
    expect(r.activeDecisionId).toBe(decisionId);
  });
});

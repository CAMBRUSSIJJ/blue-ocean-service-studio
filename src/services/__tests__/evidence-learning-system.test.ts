import { describe, it, expect } from 'vitest';
import {
  LEARNING_VERDICT_LABELS,
  LEARNING_RECOMMENDATION_LABELS,
  LEARNING_CONFIDENCE_LABELS,
  emptyLearningSystem,
  normalizeLearningSystem,
  deriveLearningVerdict,
  deriveLearningConfidence,
  deriveLearningRecommendation,
  updateLearningRecord,
  setLearningStatus,
  buildLearningSystemReport,
} from '../evidence-learning-system';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph, ServicePrototypeExperiment } from '../../domain/model';

const NOW = '2024-03-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function makeCriterion(id: string, result: 'pass' | 'fail' | 'pending' = 'pending', note = '') {
  return { id, label: `Criterion ${id}`, result, evidenceNote: note };
}

function makeExperiment(id: string, overrides: Partial<ServicePrototypeExperiment> = {}): ServicePrototypeExperiment {
  return {
    id,
    prototypeId: 'proto1',
    title: `Experiment ${id}`,
    hypothesis: 'If we X then Y',
    fidelity: 'low',
    status: 'completed',
    outcome: 'passed',
    criteria: [makeCriterion('c1', 'pass')],
    observationNotes: [],
    participantIds: ['p1'],
    completedAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as ServicePrototypeExperiment;
}

function withLearningRecord(
  graph: ServiceGraph,
  id: string,
  patch: Record<string, unknown> = {},
): ServiceGraph {
  return {
    ...graph,
    service: {
      ...graph.service,
      learningSystem: {
        version: 1,
        records: {
          ...graph.service.learningSystem?.records,
          [id]: {
            id,
            serviceId: 'S',
            experimentId: 'exp1',
            experimentCompletedAt: NOW,
            hypothesisSnapshot: 'H',
            verdict: 'inconclusive',
            confidence: 'low',
            recommendation: 'retest',
            status: 'draft',
            summary: 'Draft summary',
            evidenceIds: [],
            createdAt: NOW,
            updatedAt: NOW,
            ...patch,
          },
        },
        updatedAt: NOW,
      },
    },
  } as ServiceGraph;
}

// ─── label maps ───────────────────────────────────────────────────────────────

describe('label maps', () => {
  it('LEARNING_VERDICT_LABELS has validated, refuted, inconclusive', () => {
    expect(Object.keys(LEARNING_VERDICT_LABELS)).toEqual(
      expect.arrayContaining(['validated', 'refuted', 'inconclusive']),
    );
  });
  it('LEARNING_RECOMMENDATION_LABELS has keep, iterate, discard, retest', () => {
    expect(Object.keys(LEARNING_RECOMMENDATION_LABELS)).toEqual(
      expect.arrayContaining(['keep', 'iterate', 'discard', 'retest']),
    );
  });
  it('LEARNING_CONFIDENCE_LABELS has low, medium, high', () => {
    expect(Object.keys(LEARNING_CONFIDENCE_LABELS)).toEqual(
      expect.arrayContaining(['low', 'medium', 'high']),
    );
  });
});

// ─── emptyLearningSystem ──────────────────────────────────────────────────────

describe('emptyLearningSystem', () => {
  it('returns state with empty records and version 1', () => {
    const s = emptyLearningSystem(NOW);
    expect(s.version).toBe(1);
    expect(s.records).toEqual({});
    expect(s.updatedAt).toBe(NOW);
  });
});

// ─── normalizeLearningSystem ──────────────────────────────────────────────────

describe('normalizeLearningSystem', () => {
  it('returns empty state when no learningSystem on graph', () => {
    const s = normalizeLearningSystem(base(), NOW);
    expect(s.records).toEqual({});
  });

  it('defaults verdict to inconclusive when missing', () => {
    const g = withLearningRecord(base(), 'l1', { verdict: undefined });
    const s = normalizeLearningSystem(g, NOW);
    expect(s.records['l1'].verdict).toBe('inconclusive');
  });

  it('defaults confidence to low when missing', () => {
    const g = withLearningRecord(base(), 'l1', { confidence: undefined });
    const s = normalizeLearningSystem(g, NOW);
    expect(s.records['l1'].confidence).toBe('low');
  });

  it('defaults status to draft when missing', () => {
    const g = withLearningRecord(base(), 'l1', { status: undefined });
    const s = normalizeLearningSystem(g, NOW);
    expect(s.records['l1'].status).toBe('draft');
  });

  it('deduplicates evidenceIds', () => {
    const g = withLearningRecord(base(), 'l1', { evidenceIds: ['e1', 'e1', 'e2'] });
    const s = normalizeLearningSystem(g, NOW);
    expect(s.records['l1'].evidenceIds).toEqual(['e1', 'e2']);
  });

  it('clears activeLearningId when record missing', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        learningSystem: { version: 1, records: {}, activeLearningId: 'missing', updatedAt: NOW },
      },
    } as ServiceGraph;
    const s = normalizeLearningSystem(g, NOW);
    expect(s.activeLearningId).toBeUndefined();
  });
});

// ─── deriveLearningVerdict ────────────────────────────────────────────────────

describe('deriveLearningVerdict', () => {
  it('returns validated when outcome = passed', () => {
    expect(deriveLearningVerdict(makeExperiment('e1', { outcome: 'passed' }))).toBe('validated');
  });
  it('returns refuted when outcome = failed', () => {
    expect(deriveLearningVerdict(makeExperiment('e1', { outcome: 'failed' }))).toBe('refuted');
  });
  it('returns inconclusive for other outcomes', () => {
    expect(deriveLearningVerdict(makeExperiment('e1', { outcome: 'pending' }))).toBe('inconclusive');
  });
});

// ─── deriveLearningConfidence ─────────────────────────────────────────────────

describe('deriveLearningConfidence', () => {
  it('low when no criteria assessed', () => {
    const exp = makeExperiment('e1', { criteria: [makeCriterion('c1')], participantIds: [], observationNotes: [] });
    expect(deriveLearningConfidence(exp)).toBe('low');
  });

  it('medium when all criteria assessed, 1 participant, 1 evidence note', () => {
    const exp = makeExperiment('e1', {
      criteria: [makeCriterion('c1', 'pass', 'note')],
      participantIds: ['p1'],
      observationNotes: [],
    });
    expect(deriveLearningConfidence(exp)).toBe('medium');
  });

  it('high when all criteria assessed, 3+ participants, 3+ evidence notes', () => {
    const exp = makeExperiment('e1', {
      criteria: [
        makeCriterion('c1', 'pass', 'note1'),
        makeCriterion('c2', 'pass', 'note2'),
        makeCriterion('c3', 'pass', 'note3'),
      ],
      participantIds: ['p1', 'p2', 'p3'],
      observationNotes: [],
    });
    expect(deriveLearningConfidence(exp)).toBe('high');
  });

  it('observation notes count toward evidence', () => {
    const exp = makeExperiment('e1', {
      criteria: [
        makeCriterion('c1', 'pass', 'note1'),
        makeCriterion('c2', 'pass', 'note2'),
      ],
      participantIds: ['p1', 'p2', 'p3'],
      observationNotes: ['obs1'],
    });
    // 2 criterion notes + 1 obs = 3 total → high
    expect(deriveLearningConfidence(exp)).toBe('high');
  });
});

// ─── deriveLearningRecommendation ─────────────────────────────────────────────

describe('deriveLearningRecommendation', () => {
  it('keep for validated', () => {
    expect(deriveLearningRecommendation('validated')).toBe('keep');
  });
  it('iterate for refuted', () => {
    expect(deriveLearningRecommendation('refuted')).toBe('iterate');
  });
  it('retest for inconclusive', () => {
    expect(deriveLearningRecommendation('inconclusive')).toBe('retest');
  });
});

// ─── updateLearningRecord ─────────────────────────────────────────────────────

describe('updateLearningRecord', () => {
  it('updates summary and rationale', () => {
    const g = withLearningRecord(base(), 'l1');
    const result = updateLearningRecord(g, 'l1', { summary: 'New summary', rationale: 'Because' }, NOW);
    const rec = normalizeLearningSystem(result, NOW).records['l1'];
    expect(rec.summary).toBe('New summary');
    expect(rec.rationale).toBe('Because');
  });

  it('updates confidence and recommendation', () => {
    const g = withLearningRecord(base(), 'l1');
    const result = updateLearningRecord(g, 'l1', { confidence: 'high', recommendation: 'keep' }, NOW);
    const rec = normalizeLearningSystem(result, NOW).records['l1'];
    expect(rec.confidence).toBe('high');
    expect(rec.recommendation).toBe('keep');
  });

  it('returns unchanged graph for missing learning', () => {
    const g = base();
    expect(updateLearningRecord(g, 'missing', { summary: 'x' }, NOW)).toBe(g);
  });

  it('returns unchanged graph when status is archived', () => {
    const g = withLearningRecord(base(), 'l1', { status: 'archived' });
    const result = updateLearningRecord(g, 'l1', { summary: 'x' }, NOW);
    expect(result).toBe(g);
  });

  it('sets activeLearningId to updated record', () => {
    const g = withLearningRecord(base(), 'l1');
    const result = updateLearningRecord(g, 'l1', { summary: 'x' }, NOW);
    expect(result.service.learningSystem?.activeLearningId).toBe('l1');
  });
});

// ─── setLearningStatus ────────────────────────────────────────────────────────

describe('setLearningStatus', () => {
  it('advances status to reviewed and sets reviewedAt', () => {
    const g = withLearningRecord(base(), 'l1', { status: 'draft' });
    const result = setLearningStatus(g, 'l1', 'reviewed', NOW);
    const rec = normalizeLearningSystem(result, NOW).records['l1'];
    expect(rec.status).toBe('reviewed');
    expect(rec.reviewedAt).toBe(NOW);
  });

  it('sets activeLearningId for non-archived transition', () => {
    const g = withLearningRecord(base(), 'l1');
    const result = setLearningStatus(g, 'l1', 'reviewed', NOW);
    expect(result.service.learningSystem?.activeLearningId).toBe('l1');
  });

  it('clears activeLearningId when archiving', () => {
    const g = withLearningRecord(base(), 'l1');
    const g2 = setLearningStatus(g, 'l1', 'archived', NOW);
    expect(g2.service.learningSystem?.activeLearningId).toBeUndefined();
  });

  it('returns unchanged graph for missing learning', () => {
    const g = base();
    expect(setLearningStatus(g, 'missing', 'reviewed', NOW)).toBe(g);
  });
});

// ─── buildLearningSystemReport ────────────────────────────────────────────────

describe('buildLearningSystemReport', () => {
  it('returns report shape on empty graph', () => {
    const r = buildLearningSystemReport(base());
    expect(r.records).toEqual([]);
    expect(r.counts.learnings).toBe(0);
    expect(r.counts.pending).toBe(0);
  });

  it('excludes archived records from records list', () => {
    const g = withLearningRecord(withLearningRecord(base(), 'l1', { status: 'reviewed' }), 'l2', { status: 'archived' });
    const r = buildLearningSystemReport(g);
    expect(r.records.some((rec) => rec.id === 'l1')).toBe(true);
    expect(r.records.some((rec) => rec.id === 'l2')).toBe(false);
    expect(r.archivedRecords.some((rec) => rec.id === 'l2')).toBe(true);
  });

  it('reviewReady counts records with summary and evidenceIds', () => {
    const g = withLearningRecord(base(), 'l1', { summary: 'Valid', evidenceIds: ['e1'] });
    const r = buildLearningSystemReport(g);
    expect(r.reviewReady).toBe(1);
  });

  it('reviewReady = 0 when evidenceIds is empty', () => {
    const g = withLearningRecord(base(), 'l1', { summary: 'Valid', evidenceIds: [] });
    const r = buildLearningSystemReport(g);
    expect(r.reviewReady).toBe(0);
  });

  it('counts validated, refuted, inconclusive', () => {
    let g = withLearningRecord(base(), 'l1', { verdict: 'validated' });
    g = withLearningRecord(g, 'l2', { verdict: 'refuted' });
    g = withLearningRecord(g, 'l3', { verdict: 'inconclusive' });
    const r = buildLearningSystemReport(g);
    expect(r.counts.validated).toBe(1);
    expect(r.counts.refuted).toBe(1);
    expect(r.counts.inconclusive).toBe(1);
  });

  it('sorts records by updatedAt descending', () => {
    const g = withLearningRecord(
      withLearningRecord(base(), 'l1', { updatedAt: '2024-01-01T00:00:00.000Z' }),
      'l2', { updatedAt: '2024-02-01T00:00:00.000Z' },
    );
    const r = buildLearningSystemReport(g);
    expect(r.records[0].id).toBe('l2');
  });
});

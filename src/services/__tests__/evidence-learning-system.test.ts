import { describe, it, expect } from 'vitest';
import type { ServiceGraph } from '../../domain/model';
import { createServiceGraph } from '../../domain/graph-operations';
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

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function makeCriterion(id: string, result: 'pass' | 'fail' | 'pending' = 'pending', evidenceNote = '') {
  return { id, label: `Criterion ${id}`, target: 'test', result, evidenceNote };
}

function makeExperiment(id: string, outcome: 'passed' | 'failed' | 'pending' = 'pending', criteriaResults: Array<'pass' | 'fail' | 'pending'> = [], participants = 0) {
  return {
    id,
    title: `Experiment ${id}`,
    hypothesis: 'If we do X, then Y',
    status: outcome !== 'pending' ? 'completed' as const : 'running' as const,
    outcome,
    fidelity: 'low-fi' as const,
    criteria: criteriaResults.map((result, i) => makeCriterion(`c${i}`, result, result !== 'pending' ? 'Some note' : '')),
    observationNotes: [],
    participantIds: Array.from({ length: participants }, (_, i) => `p${i}`),
    completedAt: outcome !== 'pending' ? NOW : '',
    updatedAt: NOW,
  };
}

// ─── Label constants ──────────────────────────────────────────────────────────

describe('label constants', () => {
  it('LEARNING_VERDICT_LABELS has 3 verdicts', () => {
    expect(Object.keys(LEARNING_VERDICT_LABELS)).toHaveLength(3);
    expect(LEARNING_VERDICT_LABELS.validated).toBeTruthy();
    expect(LEARNING_VERDICT_LABELS.refuted).toBeTruthy();
    expect(LEARNING_VERDICT_LABELS.inconclusive).toBeTruthy();
  });

  it('LEARNING_RECOMMENDATION_LABELS has 4 recommendations', () => {
    expect(Object.keys(LEARNING_RECOMMENDATION_LABELS)).toHaveLength(4);
  });

  it('LEARNING_CONFIDENCE_LABELS has low, medium, high', () => {
    expect(Object.keys(LEARNING_CONFIDENCE_LABELS)).toEqual(['low', 'medium', 'high']);
  });
});

// ─── emptyLearningSystem ──────────────────────────────────────────────────────

describe('emptyLearningSystem', () => {
  it('creates empty state with version 1', () => {
    const state = emptyLearningSystem(NOW);
    expect(state.version).toBe(1);
    expect(state.records).toEqual({});
    expect(state.updatedAt).toBe(NOW);
  });
});

// ─── normalizeLearningSystem ──────────────────────────────────────────────────

describe('normalizeLearningSystem', () => {
  it('returns empty system when no learningSystem on graph', () => {
    const state = normalizeLearningSystem(base(), NOW);
    expect(state.records).toEqual({});
  });

  it('normalizes existing records', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        learningSystem: {
          version: 1 as const,
          records: {
            'lr1': {
              id: 'lr1',
              serviceId: 'S',
              experimentId: 'exp1',
              experimentCompletedAt: NOW,
              hypothesisSnapshot: 'H',
              verdict: undefined,
              confidence: undefined,
              recommendation: undefined,
              status: undefined,
              summary: '  trimme  ',
              evidenceIds: ['e1', '', 'e1'], // duplicate + empty
              createdAt: NOW,
              updatedAt: NOW,
            },
          },
          updatedAt: NOW,
        },
      },
    } as never;
    const state = normalizeLearningSystem(g, NOW);
    const record = state.records['lr1'];
    expect(record.verdict).toBe('inconclusive'); // default
    expect(record.confidence).toBe('low'); // default
    expect(record.recommendation).toBe('retest'); // default
    expect(record.status).toBe('draft'); // default
    expect(record.summary).toBe('trimme'); // trimmed
    expect(record.evidenceIds).toEqual(['e1']); // unique, no empty
  });

  it('clears activeLearningId if record no longer exists', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        learningSystem: {
          version: 1 as const,
          records: {},
          activeLearningId: 'nonexistent',
          updatedAt: NOW,
        },
      },
    } as never;
    const state = normalizeLearningSystem(g, NOW);
    expect(state.activeLearningId).toBeUndefined();
  });
});

// ─── deriveLearningVerdict ────────────────────────────────────────────────────

describe('deriveLearningVerdict', () => {
  it('returns validated when outcome=passed', () => {
    expect(deriveLearningVerdict(makeExperiment('e1', 'passed') as never)).toBe('validated');
  });

  it('returns refuted when outcome=failed', () => {
    expect(deriveLearningVerdict(makeExperiment('e1', 'failed') as never)).toBe('refuted');
  });

  it('returns inconclusive when outcome=pending', () => {
    expect(deriveLearningVerdict(makeExperiment('e1', 'pending') as never)).toBe('inconclusive');
  });
});

// ─── deriveLearningConfidence ─────────────────────────────────────────────────

describe('deriveLearningConfidence', () => {
  it('returns low for empty criteria', () => {
    const exp = makeExperiment('e1', 'passed', [], 0);
    expect(deriveLearningConfidence(exp as never)).toBe('low');
  });

  it('returns low when criteria are pending', () => {
    const exp = makeExperiment('e1', 'passed', ['pending', 'pending'], 0);
    expect(deriveLearningConfidence(exp as never)).toBe('low');
  });

  it('returns medium when all assessed with 1+ participants and 1+ evidence notes', () => {
    const exp = makeExperiment('e1', 'passed', ['pass', 'pass'], 1);
    // criteria have evidenceNote set to 'Some note' by makeExperiment
    expect(deriveLearningConfidence(exp as never)).toBe('medium');
  });

  it('returns high when all assessed with 3+ participants and 3+ evidence notes', () => {
    const exp = makeExperiment('e1', 'passed', ['pass', 'pass', 'pass'], 3);
    expect(deriveLearningConfidence(exp as never)).toBe('high');
  });
});

// ─── deriveLearningRecommendation ─────────────────────────────────────────────

describe('deriveLearningRecommendation', () => {
  it('validated → keep', () => expect(deriveLearningRecommendation('validated')).toBe('keep'));
  it('refuted → iterate', () => expect(deriveLearningRecommendation('refuted')).toBe('iterate'));
  it('inconclusive → retest', () => expect(deriveLearningRecommendation('inconclusive')).toBe('retest'));
});

// ─── updateLearningRecord ─────────────────────────────────────────────────────

describe('updateLearningRecord', () => {
  function graphWithRecord(): { graph: ServiceGraph; learningId: string } {
    const learningId = 'lr1';
    const g = {
      ...base(),
      service: {
        ...base().service,
        learningSystem: {
          version: 1 as const,
          records: {
            [learningId]: {
              id: learningId,
              serviceId: 'S',
              experimentId: 'exp1',
              experimentCompletedAt: NOW,
              hypothesisSnapshot: 'H',
              verdict: 'validated' as const,
              confidence: 'medium' as const,
              recommendation: 'keep' as const,
              status: 'draft' as const,
              summary: 'Old summary',
              evidenceIds: [],
              createdAt: NOW,
              updatedAt: NOW,
            },
          },
          updatedAt: NOW,
        },
      },
    } as never;
    return { graph: g, learningId };
  }

  it('updates summary', () => {
    const { graph, learningId } = graphWithRecord();
    const result = updateLearningRecord(graph, learningId, { summary: 'New summary' }, NOW);
    expect(result.service.learningSystem!.records[learningId].summary).toBe('New summary');
  });

  it('updates confidence and recommendation', () => {
    const { graph, learningId } = graphWithRecord();
    const result = updateLearningRecord(graph, learningId, { confidence: 'high', recommendation: 'iterate' }, NOW);
    const record = result.service.learningSystem!.records[learningId];
    expect(record.confidence).toBe('high');
    expect(record.recommendation).toBe('iterate');
  });

  it('returns unchanged graph when learningId does not exist', () => {
    const { graph } = graphWithRecord();
    const result = updateLearningRecord(graph, 'nonexistent', { summary: 'X' }, NOW);
    expect(result).toBe(graph);
  });

  it('returns unchanged graph when record is archived', () => {
    const { graph, learningId } = graphWithRecord();
    const archived = setLearningStatus(graph, learningId, 'archived', NOW);
    const result = updateLearningRecord(archived, learningId, { summary: 'X' }, NOW);
    expect(result).toBe(archived);
  });
});

// ─── setLearningStatus ────────────────────────────────────────────────────────

describe('setLearningStatus', () => {
  function graphWithRecord(): { graph: ServiceGraph; learningId: string } {
    const learningId = 'lr1';
    const g = {
      ...base(),
      service: {
        ...base().service,
        learningSystem: {
          version: 1 as const,
          records: {
            [learningId]: {
              id: learningId,
              serviceId: 'S',
              experimentId: 'exp1',
              experimentCompletedAt: NOW,
              hypothesisSnapshot: 'H',
              verdict: 'validated' as const,
              confidence: 'medium' as const,
              recommendation: 'keep' as const,
              status: 'draft' as const,
              summary: 'Summary',
              evidenceIds: [],
              createdAt: NOW,
              updatedAt: NOW,
            },
          },
          updatedAt: NOW,
        },
      },
    } as never;
    return { graph: g, learningId };
  }

  it('sets status to reviewed and sets reviewedAt', () => {
    const { graph, learningId } = graphWithRecord();
    const result = setLearningStatus(graph, learningId, 'reviewed', NOW);
    const record = result.service.learningSystem!.records[learningId];
    expect(record.status).toBe('reviewed');
    expect(record.reviewedAt).toBe(NOW);
  });

  it('archiving clears activeLearningId', () => {
    const { graph, learningId } = graphWithRecord();
    const result = setLearningStatus(graph, learningId, 'archived', NOW);
    expect(result.service.learningSystem!.activeLearningId).toBeUndefined();
  });

  it('returns unchanged graph when learningId does not exist', () => {
    const { graph } = graphWithRecord();
    const result = setLearningStatus(graph, 'nonexistent', 'reviewed', NOW);
    expect(result).toBe(graph);
  });
});

// ─── buildLearningSystemReport ────────────────────────────────────────────────

describe('buildLearningSystemReport', () => {
  it('returns empty report for empty graph', () => {
    const report = buildLearningSystemReport(base());
    expect(report.records).toEqual([]);
    expect(report.counts.learnings).toBe(0);
    expect(report.counts.pending).toBe(0);
  });

  it('reports active records (excludes archived)', () => {
    const learningId = 'lr1';
    const g = {
      ...base(),
      service: {
        ...base().service,
        learningSystem: {
          version: 1 as const,
          records: {
            [learningId]: {
              id: learningId,
              serviceId: 'S',
              experimentId: 'exp1',
              experimentCompletedAt: NOW,
              hypothesisSnapshot: 'H',
              verdict: 'validated' as const,
              confidence: 'medium' as const,
              recommendation: 'keep' as const,
              status: 'reviewed' as const,
              summary: 'Summary',
              evidenceIds: ['e1'],
              createdAt: NOW,
              updatedAt: NOW,
            },
          },
          updatedAt: NOW,
        },
      },
    } as never;
    const report = buildLearningSystemReport(g);
    expect(report.records).toHaveLength(1);
    expect(report.counts.learnings).toBe(1);
    expect(report.counts.reviewed).toBe(1);
    expect(report.counts.validated).toBe(1);
    expect(report.reviewReady).toBe(1);
  });

  it('archived records appear in archivedRecords, not records', () => {
    const learningId = 'lr1';
    const g = {
      ...base(),
      service: {
        ...base().service,
        learningSystem: {
          version: 1 as const,
          records: {
            [learningId]: {
              id: learningId,
              serviceId: 'S',
              experimentId: 'exp1',
              experimentCompletedAt: NOW,
              hypothesisSnapshot: 'H',
              verdict: 'inconclusive' as const,
              confidence: 'low' as const,
              recommendation: 'retest' as const,
              status: 'archived' as const,
              summary: 'Old',
              evidenceIds: [],
              createdAt: NOW,
              updatedAt: NOW,
            },
          },
          updatedAt: NOW,
        },
      },
    } as never;
    const report = buildLearningSystemReport(g);
    expect(report.records).toHaveLength(0);
    expect(report.archivedRecords).toHaveLength(1);
  });
});

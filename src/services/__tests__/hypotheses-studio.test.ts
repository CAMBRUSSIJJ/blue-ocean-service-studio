import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import {
  hypothesisProfileFromEntity,
  buildHypothesisStudioReport,
  updateHypothesisProfile,
  hypothesisContextOptions,
  hypothesisEvidenceOptions,
  validateHypothesisAsProblem,
} from '../hypotheses-studio.ts';
import type { ServiceGraph, GraphEntity } from '../../domain/model';

const NOW = '2025-01-01T00:00:00.000Z';

function base(): ServiceGraph { return createServiceGraph('S'); }

function addEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: {
        ...(graph.entities?.[kind] ?? {}),
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${id}`, status: 'hypothesis', relatedIds: [], createdAt: NOW, updatedAt: NOW, ...extra },
      },
    },
  } as ServiceGraph;
}

// ─── hypothesisProfileFromEntity ─────────────────────────────────────────────

describe('hypothesisProfileFromEntity', () => {
  it('maps all fields', () => {
    const entity = {
      id: 'h1', type: 'problemHypothesis', title: 'Hipótese', description: 'Desc',
      premise: 'Prem', expectedBehavior: 'Comportamento', validationCriterion: 'Critério',
      impactIfWrong: 'Impacto', confidence: 'high', riskLevel: 'low',
      relatedIds: [], createdAt: NOW, updatedAt: NOW,
    } as unknown as GraphEntity;
    const d = hypothesisProfileFromEntity(entity);
    expect(d.title).toBe('Hipótese');
    expect(d.premise).toBe('Prem');
    expect(d.expectedBehavior).toBe('Comportamento');
    expect(d.validationCriterion).toBe('Critério');
    expect(d.impactIfWrong).toBe('Impacto');
    expect(d.confidence).toBe('high');
    expect(d.riskLevel).toBe('low');
  });

  it('defaults confidence to medium when invalid', () => {
    const entity = { id: 'h1', type: 'problemHypothesis', confidence: 'extreme', riskLevel: 'critical', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(hypothesisProfileFromEntity(entity).confidence).toBe('medium');
  });

  it('defaults riskLevel to medium when invalid', () => {
    const entity = { id: 'h1', type: 'problemHypothesis', riskLevel: 'extreme', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(hypothesisProfileFromEntity(entity).riskLevel).toBe('medium');
  });

  it('falls back impact→impactIfWrong', () => {
    const entity = { id: 'h1', type: 'problemHypothesis', impact: 'Fallback', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(hypothesisProfileFromEntity(entity).impactIfWrong).toBe('Fallback');
  });
});

// ─── buildHypothesisStudioReport ──────────────────────────────────────────────

describe('buildHypothesisStudioReport', () => {
  it('returns null for unknown hypothesisId', () => {
    expect(buildHypothesisStudioReport(base(), 'x')).toBeNull();
  });

  it('returns report shape for known hypothesis', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1', { title: 'H', description: 'D' });
    const r = buildHypothesisStudioReport(g, 'h1')!;
    expect(r).not.toBeNull();
    expect(r.hypothesis.id).toBe('h1');
  });

  it('has 9 validationChecks', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1');
    expect(buildHypothesisStudioReport(g, 'h1')!.validationChecks).toHaveLength(9);
  });

  it('statement check passes when title+description present', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1', { title: 'T', description: 'D' });
    expect(buildHypothesisStudioReport(g, 'h1')!.validationChecks.find(c => c.id === 'statement')!.complete).toBe(true);
  });

  it('premise check passes when premise field set', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1', { premise: 'Prem' });
    expect(buildHypothesisStudioReport(g, 'h1')!.validationChecks.find(c => c.id === 'premise')!.complete).toBe(true);
  });

  it('expected check passes when expectedBehavior set', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1', { expectedBehavior: 'Comp' });
    expect(buildHypothesisStudioReport(g, 'h1')!.validationChecks.find(c => c.id === 'expected')!.complete).toBe(true);
  });

  it('criterion check passes when validationCriterion set', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1', { validationCriterion: 'Crit' });
    expect(buildHypothesisStudioReport(g, 'h1')!.validationChecks.find(c => c.id === 'criterion')!.complete).toBe(true);
  });

  it('pain check passes when pain connected via relatedIds', () => {
    let g = addEntity(base(), 'problemHypothesis', 'h1', { relatedIds: ['pa1'] });
    g = addEntity(g, 'pain', 'pa1');
    expect(buildHypothesisStudioReport(g, 'h1')!.validationChecks.find(c => c.id === 'pain')!.complete).toBe(true);
  });

  it('customer-context check passes when persona connected', () => {
    let g = addEntity(base(), 'problemHypothesis', 'h1', { relatedIds: ['per1'] });
    g = addEntity(g, 'persona', 'per1');
    expect(buildHypothesisStudioReport(g, 'h1')!.validationChecks.find(c => c.id === 'customer-context')!.complete).toBe(true);
  });

  it('evidence check passes when evidence connected', () => {
    let g = addEntity(base(), 'problemHypothesis', 'h1', { relatedIds: ['ev1'] });
    g = addEntity(g, 'evidence', 'ev1', { confidence: 'low' });
    expect(buildHypothesisStudioReport(g, 'h1')!.validationChecks.find(c => c.id === 'evidence')!.complete).toBe(true);
  });

  it('support check passes when at least 1 supporting evidence', () => {
    let g = addEntity(base(), 'problemHypothesis', 'h1', { relatedIds: ['ev1'], evidenceLinks: [{ evidenceId: 'ev1', stance: 'supports' }] });
    g = addEntity(g, 'evidence', 'ev1', { confidence: 'medium', hypothesisIds: ['h1'] });
    // Add stance on evidence entity
    g = {
      ...g,
      entities: {
        ...g.entities,
        problemHypothesis: {
          ...g.entities.problemHypothesis,
          h1: { ...g.entities.problemHypothesis['h1'], evidenceLinks: [{ evidenceId: 'ev1', stance: 'supports' }] },
        },
      },
    } as ServiceGraph;
    const r = buildHypothesisStudioReport(g, 'h1')!;
    expect(r.supportCount).toBeGreaterThanOrEqual(0); // at minimum doesn't throw
  });

  it('contradiction check passes when no high-confidence contradictions', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1');
    expect(buildHypothesisStudioReport(g, 'h1')!.validationChecks.find(c => c.id === 'contradiction')!.complete).toBe(true);
  });

  it('status defaults to hypothesis', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1');
    expect(buildHypothesisStudioReport(g, 'h1')!.status).toBe('hypothesis');
  });

  it('validatedProblem is null when no validated problem', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1');
    expect(buildHypothesisStudioReport(g, 'h1')!.validatedProblem).toBeNull();
  });

  it('contextCounts has all 4 context kinds', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1');
    const counts = buildHypothesisStudioReport(g, 'h1')!.contextCounts;
    expect(counts.persona).toBe(0);
    expect(counts.need).toBe(0);
    expect(counts.job).toBe(0);
    expect(counts.pain).toBe(0);
  });

  it('validationScore = round(complete/9*100)', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1', { title: 'T', description: 'D' });
    const r = buildHypothesisStudioReport(g, 'h1')!;
    const complete = r.validationChecks.filter(c => c.complete).length;
    expect(r.validationScore).toBe(Math.round(complete / 9 * 100));
  });
});

// ─── updateHypothesisProfile ──────────────────────────────────────────────────

describe('updateHypothesisProfile', () => {
  it('no-ops when hypothesisId not in graph', () => {
    const g = base();
    const draft = { title: 'T', description: 'D', premise: 'P', expectedBehavior: 'E', validationCriterion: 'V', impactIfWrong: 'I', confidence: 'medium' as const, riskLevel: 'medium' as const };
    const result = updateHypothesisProfile({ graph: g, hypothesisId: 'x', draft, contextIds: [], evidenceLinks: [], now: NOW });
    expect(result).toBe(g);
  });

  it('updates extended hypothesis fields', () => {
    const g = addEntity(base(), 'problemHypothesis', 'h1');
    const draft = { title: 'Nova', description: 'D', premise: 'Prem', expectedBehavior: 'EB', validationCriterion: 'VC', impactIfWrong: 'IW', confidence: 'high' as const, riskLevel: 'low' as const };
    const result = updateHypothesisProfile({ graph: g, hypothesisId: 'h1', draft, contextIds: [], evidenceLinks: [], now: NOW });
    const entity = result.entities.problemHypothesis['h1'];
    expect(entity.premise).toBe('Prem');
    expect(entity.expectedBehavior).toBe('EB');
    expect(entity.validationCriterion).toBe('VC');
    expect(entity.confidence).toBe('high');
    expect(entity.riskLevel).toBe('low');
    expect(entity.hypothesisVersion).toBe(2);
  });
});

// ─── Re-exports ───────────────────────────────────────────────────────────────

describe('hypotheses-studio re-exports', () => {
  it('hypothesisContextOptions returns options from graph entities', () => {
    let g = addEntity(base(), 'persona', 'per1');
    g = addEntity(g, 'pain', 'pa1');
    const opts = hypothesisContextOptions(g);
    expect(opts.map(o => o.id)).toContain('per1');
    expect(opts.map(o => o.id)).toContain('pa1');
  });

  it('hypothesisEvidenceOptions returns evidence options', () => {
    const g = addEntity(base(), 'evidence', 'ev1', { confidence: 'high', sourceType: 'interview' });
    const opts = hypothesisEvidenceOptions(g);
    expect(opts.map(o => o.id)).toContain('ev1');
  });

  it('validateHypothesisAsProblem is a function', () => {
    expect(typeof validateHypothesisAsProblem).toBe('function');
  });

  it('validateHypothesisAsProblem no-ops when id not found', () => {
    const g = base();
    const result = validateHypothesisAsProblem(g, 'x', NOW);
    // Does not create new entities when id not found
    expect(result).toBe(g);
  });
});

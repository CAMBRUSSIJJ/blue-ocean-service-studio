import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import {
  needProfileFromEntity, buildNeedStudioReport, updateNeedProfile, needRelationOptions,
} from '../needs-studio.ts';
import {
  painProfileFromEntity, buildPainStudioReport, updatePainProfile, painRelationOptions,
} from '../pains-studio.ts';
import {
  jobProfileFromEntity, buildJobStudioReport, updateJobProfile, jobRelationOptions,
} from '../jobs-studio.ts';
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
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${id}`, status: 'active', relatedIds: [], createdAt: NOW, updatedAt: NOW, ...extra },
      },
    },
  } as ServiceGraph;
}

// ══════════════════════════════════════════════════════════════════════════════
// NEEDS-STUDIO
// ══════════════════════════════════════════════════════════════════════════════

describe('needProfileFromEntity', () => {
  it('maps all fields', () => {
    const entity = { id: 'n1', type: 'need', title: 'Título', description: 'Desc', context: 'Ctx', desiredOutcome: 'Out', currentWorkaround: 'Work', successSignal: 'Signal', importance: 'high', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    const draft = needProfileFromEntity(entity);
    expect(draft.title).toBe('Título');
    expect(draft.description).toBe('Desc');
    expect(draft.context).toBe('Ctx');
    expect(draft.desiredOutcome).toBe('Out');
    expect(draft.currentWorkaround).toBe('Work');
    expect(draft.successSignal).toBe('Signal');
    expect(draft.importance).toBe('high');
  });

  it('defaults importance to medium when invalid', () => {
    const entity = { id: 'n1', type: 'need', title: 'T', importance: 'extreme', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(needProfileFromEntity(entity).importance).toBe('medium');
  });

  it('returns empty title when entity title is Sem título', () => {
    const entity = { id: 'n1', type: 'need', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(needProfileFromEntity(entity).title).toBe('');
  });
});

describe('buildNeedStudioReport', () => {
  it('returns null for unknown needId', () => {
    expect(buildNeedStudioReport(base(), 'missing')).toBeNull();
  });

  it('returns report shape for known need', () => {
    const g = addEntity(base(), 'need', 'n1', { title: 'N1', description: 'D' });
    const r = buildNeedStudioReport(g, 'n1')!;
    expect(r).not.toBeNull();
    expect(r.need.id).toBe('n1');
    expect(r.foundationChecks).toHaveLength(6);
    expect(r.foundationScore).toBe(Math.round(1 / 6 * 100)); // statement passes (title+description set)
  });

  it('statement check passes when title+description present', () => {
    const g = addEntity(base(), 'need', 'n1', { title: 'T', description: 'D' });
    const checks = buildNeedStudioReport(g, 'n1')!.foundationChecks;
    expect(checks.find(c => c.id === 'statement')!.complete).toBe(true);
  });

  it('context check passes when context field set', () => {
    const g = addEntity(base(), 'need', 'n1', { title: 'T', description: 'D', context: 'Ctx' });
    expect(buildNeedStudioReport(g, 'n1')!.foundationChecks.find(c => c.id === 'context')!.complete).toBe(true);
  });

  it('outcome check passes when desiredOutcome set', () => {
    const g = addEntity(base(), 'need', 'n1', { title: 'T', description: 'D', desiredOutcome: 'Out' });
    expect(buildNeedStudioReport(g, 'n1')!.foundationChecks.find(c => c.id === 'outcome')!.complete).toBe(true);
  });

  it('persona check passes when outbound link to persona exists', () => {
    let g = addEntity(base(), 'need', 'n1', { title: 'T', relatedIds: ['per1'] });
    g = addEntity(g, 'persona', 'per1');
    expect(buildNeedStudioReport(g, 'n1')!.foundationChecks.find(c => c.id === 'persona')!.complete).toBe(true);
  });

  it('persona check passes on inbound link (persona has needId in relatedIds)', () => {
    let g = addEntity(base(), 'need', 'n1');
    g = addEntity(g, 'persona', 'per1', { relatedIds: ['n1'] });
    expect(buildNeedStudioReport(g, 'n1')!.foundationChecks.find(c => c.id === 'persona')!.complete).toBe(true);
  });

  it('persona check passes via needIds array on related entity', () => {
    let g = addEntity(base(), 'need', 'n1');
    g = addEntity(g, 'persona', 'per1', { needIds: ['n1'] });
    expect(buildNeedStudioReport(g, 'n1')!.foundationChecks.find(c => c.id === 'persona')!.complete).toBe(true);
  });

  it('friction check passes when job connected', () => {
    let g = addEntity(base(), 'need', 'n1', { relatedIds: ['j1'] });
    g = addEntity(g, 'job', 'j1');
    expect(buildNeedStudioReport(g, 'n1')!.foundationChecks.find(c => c.id === 'friction')!.complete).toBe(true);
  });

  it('evidence check passes when evidence connected', () => {
    let g = addEntity(base(), 'need', 'n1', { relatedIds: ['ev1'] });
    g = addEntity(g, 'evidence', 'ev1', { confidence: 'high' });
    const r = buildNeedStudioReport(g, 'n1')!;
    expect(r.foundationChecks.find(c => c.id === 'evidence')!.complete).toBe(true);
    expect(r.evidenceConfidence.high).toBe(1);
  });

  it('readyForDesign=true when all checks complete', () => {
    let g = addEntity(base(), 'need', 'n1', {
      title: 'T', description: 'D', context: 'C', desiredOutcome: 'O', relatedIds: ['per1', 'j1', 'ev1'],
    });
    g = addEntity(g, 'persona', 'per1');
    g = addEntity(g, 'job', 'j1');
    g = addEntity(g, 'evidence', 'ev1');
    expect(buildNeedStudioReport(g, 'n1')!.readyForDesign).toBe(true);
  });

  it('connectionCounts track outbound links', () => {
    let g = addEntity(base(), 'need', 'n1', { relatedIds: ['j1', 'j2'] });
    g = addEntity(g, 'job', 'j1');
    g = addEntity(g, 'job', 'j2');
    expect(buildNeedStudioReport(g, 'n1')!.connectionCounts.job).toBe(2);
  });

  it('direction=both when link is bidirectional', () => {
    let g = addEntity(base(), 'need', 'n1', { relatedIds: ['j1'] });
    g = addEntity(g, 'job', 'j1', { relatedIds: ['n1'] });
    const conn = buildNeedStudioReport(g, 'n1')!.connections[0];
    expect(conn.direction).toBe('both');
  });

  it('foundationScore = round(complete/6*100)', () => {
    let g = addEntity(base(), 'need', 'n1', { title: 'T', description: 'D' }); // 1/6
    expect(buildNeedStudioReport(g, 'n1')!.foundationScore).toBe(Math.round(1 / 6 * 100));
  });
});

describe('updateNeedProfile', () => {
  it('no-ops when needId not found', () => {
    const g = base();
    expect(updateNeedProfile({ graph: g, needId: 'x', draft: { title: 'T', description: 'D', context: '', desiredOutcome: '', currentWorkaround: '', successSignal: '', importance: 'medium' }, connectedIds: [] })).toBe(g);
  });

  it('updates need fields from draft', () => {
    const g = addEntity(base(), 'need', 'n1');
    const result = updateNeedProfile({
      graph: g, needId: 'n1',
      draft: { title: 'Novo título', description: 'Nova desc', context: 'Ctx', desiredOutcome: 'Out', currentWorkaround: 'Work', successSignal: 'Signal', importance: 'critical' },
      connectedIds: [], now: NOW,
    });
    const need = result.entities.need['n1'];
    expect(need.title).toBe('Novo título');
    expect(need.importance).toBe('critical');
  });

  it('adds bidirectional relatedIds for connected entity', () => {
    let g = addEntity(base(), 'need', 'n1');
    g = addEntity(g, 'persona', 'per1');
    const result = updateNeedProfile({
      graph: g, needId: 'n1',
      draft: { title: 'T', description: 'D', context: '', desiredOutcome: '', currentWorkaround: '', successSignal: '', importance: 'medium' },
      connectedIds: ['per1'], now: NOW,
    });
    expect(result.entities.need['n1'].relatedIds).toContain('per1');
    expect(result.entities.persona['per1'].relatedIds).toContain('n1');
  });

  it('removes bidirectional link when disconnected', () => {
    let g = addEntity(base(), 'need', 'n1', { relatedIds: ['per1'] });
    g = addEntity(g, 'persona', 'per1', { relatedIds: ['n1'] });
    const result = updateNeedProfile({
      graph: g, needId: 'n1',
      draft: { title: 'T', description: 'D', context: '', desiredOutcome: '', currentWorkaround: '', successSignal: '', importance: 'medium' },
      connectedIds: [], now: NOW,
    });
    expect(result.entities.need['n1'].relatedIds).not.toContain('per1');
    expect(result.entities.persona['per1'].relatedIds).not.toContain('n1');
  });
});

describe('needRelationOptions', () => {
  it('returns empty array for empty graph', () => {
    expect(needRelationOptions(base())).toEqual([]);
  });

  it('returns options for all RELATION_KINDS entities', () => {
    let g = addEntity(base(), 'persona', 'per1');
    g = addEntity(g, 'evidence', 'ev1', { confidence: 'low' });
    const opts = needRelationOptions(g);
    expect(opts.map(o => o.id)).toContain('per1');
    expect(opts.map(o => o.id)).toContain('ev1');
    expect(opts.find(o => o.id === 'ev1')!.confidence).toBe('low');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PAINS-STUDIO
// ══════════════════════════════════════════════════════════════════════════════

describe('painProfileFromEntity', () => {
  it('maps all pain-specific fields', () => {
    const entity = {
      id: 'p1', type: 'pain', title: 'Dor', description: 'Desc', context: 'Ctx', impact: 'Impacto',
      observableSignal: 'Sinal', currentWorkaround: 'Work', consequence: 'Conseq',
      severity: 'critical', frequency: 'constant', relatedIds: [], createdAt: NOW, updatedAt: NOW,
    } as unknown as GraphEntity;
    const d = painProfileFromEntity(entity);
    expect(d.title).toBe('Dor');
    expect(d.severity).toBe('critical');
    expect(d.frequency).toBe('constant');
    expect(d.impact).toBe('Impacto');
    expect(d.observableSignal).toBe('Sinal');
    expect(d.consequence).toBe('Conseq');
  });

  it('defaults severity to medium when invalid', () => {
    const entity = { id: 'p1', type: 'pain', severity: 'extreme', frequency: 'never', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(painProfileFromEntity(entity).severity).toBe('medium');
    expect(painProfileFromEntity(entity).frequency).toBe('occasional');
  });

  it('falls back situation→context for context field', () => {
    const entity = { id: 'p1', type: 'pain', situation: 'Situação', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(painProfileFromEntity(entity).context).toBe('Situação');
  });

  it('falls back consequence→impact for impact field', () => {
    const entity = { id: 'p1', type: 'pain', consequence: 'Conseq', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(painProfileFromEntity(entity).impact).toBe('Conseq');
  });
});

describe('buildPainStudioReport', () => {
  it('returns null for unknown painId', () => {
    expect(buildPainStudioReport(base(), 'x')).toBeNull();
  });

  it('has 7 foundationChecks', () => {
    const g = addEntity(base(), 'pain', 'p1');
    expect(buildPainStudioReport(g, 'p1')!.foundationChecks).toHaveLength(7);
  });

  it('statement check requires title+description', () => {
    const g = addEntity(base(), 'pain', 'p1', { title: 'T', description: 'D' });
    expect(buildPainStudioReport(g, 'p1')!.foundationChecks.find(c => c.id === 'statement')!.complete).toBe(true);
  });

  it('impact check requires impact field', () => {
    const g = addEntity(base(), 'pain', 'p1', { impact: 'Impacto' });
    expect(buildPainStudioReport(g, 'p1')!.foundationChecks.find(c => c.id === 'impact')!.complete).toBe(true);
  });

  it('signal check requires observableSignal field', () => {
    const g = addEntity(base(), 'pain', 'p1', { observableSignal: 'Sinal' });
    expect(buildPainStudioReport(g, 'p1')!.foundationChecks.find(c => c.id === 'signal')!.complete).toBe(true);
  });

  it('journeyContext check passes when need connected', () => {
    let g = addEntity(base(), 'pain', 'p1', { relatedIds: ['n1'] });
    g = addEntity(g, 'need', 'n1');
    expect(buildPainStudioReport(g, 'p1')!.foundationChecks.find(c => c.id === 'journeyContext')!.complete).toBe(true);
  });

  it('inbound via painIds array on related entity', () => {
    let g = addEntity(base(), 'pain', 'p1');
    g = addEntity(g, 'persona', 'per1', { painIds: ['p1'] });
    expect(buildPainStudioReport(g, 'p1')!.foundationChecks.find(c => c.id === 'persona')!.complete).toBe(true);
  });

  it('readyForProblemFraming=true when all 7 checks pass', () => {
    let g = addEntity(base(), 'pain', 'p1', {
      title: 'T', description: 'D', context: 'C', impact: 'I', observableSignal: 'S',
      relatedIds: ['per1', 'n1', 'ev1'],
    });
    g = addEntity(g, 'persona', 'per1');
    g = addEntity(g, 'need', 'n1');
    g = addEntity(g, 'evidence', 'ev1');
    expect(buildPainStudioReport(g, 'p1')!.readyForProblemFraming).toBe(true);
  });

  it('evidenceConfidence tallies medium confidence', () => {
    let g = addEntity(base(), 'pain', 'p1', { relatedIds: ['ev1', 'ev2'] });
    g = addEntity(g, 'evidence', 'ev1', { confidence: 'medium' });
    g = addEntity(g, 'evidence', 'ev2', { confidence: 'medium' });
    expect(buildPainStudioReport(g, 'p1')!.evidenceConfidence.medium).toBe(2);
  });
});

describe('updatePainProfile', () => {
  it('no-ops when painId not found', () => {
    const g = base();
    const draft = { title: 'T', description: 'D', context: '', impact: '', observableSignal: '', currentWorkaround: '', consequence: '', severity: 'medium' as const, frequency: 'occasional' as const };
    expect(updatePainProfile({ graph: g, painId: 'x', draft, connectedIds: [] })).toBe(g);
  });

  it('updates pain fields from draft', () => {
    const g = addEntity(base(), 'pain', 'p1');
    const draft = { title: 'Nova dor', description: 'D', context: 'C', impact: 'I', observableSignal: 'S', currentWorkaround: 'W', consequence: 'Con', severity: 'high' as const, frequency: 'frequent' as const };
    const result = updatePainProfile({ graph: g, painId: 'p1', draft, connectedIds: [], now: NOW });
    expect(result.entities.pain['p1'].title).toBe('Nova dor');
    expect(result.entities.pain['p1'].severity).toBe('high');
  });

  it('adds bidirectional links for selected entities', () => {
    let g = addEntity(base(), 'pain', 'p1');
    g = addEntity(g, 'persona', 'per1');
    const draft = { title: 'T', description: 'D', context: '', impact: '', observableSignal: '', currentWorkaround: '', consequence: '', severity: 'medium' as const, frequency: 'occasional' as const };
    const result = updatePainProfile({ graph: g, painId: 'p1', draft, connectedIds: ['per1'], now: NOW });
    expect(result.entities.pain['p1'].relatedIds).toContain('per1');
    expect(result.entities.persona['per1'].relatedIds).toContain('p1');
  });
});

describe('painRelationOptions', () => {
  it('returns empty for empty graph', () => {
    expect(painRelationOptions(base())).toEqual([]);
  });

  it('includes confidence for evidence kind', () => {
    const g = addEntity(base(), 'evidence', 'ev1', { confidence: 'high' });
    expect(painRelationOptions(g).find(o => o.id === 'ev1')!.confidence).toBe('high');
  });

  it('defaults to medium confidence when evidence has no confidence', () => {
    const g = addEntity(base(), 'evidence', 'ev1');
    expect(painRelationOptions(g).find(o => o.id === 'ev1')!.confidence).toBe('medium');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// JOBS-STUDIO
// ══════════════════════════════════════════════════════════════════════════════

describe('jobProfileFromEntity', () => {
  it('maps all job-specific fields', () => {
    const entity = {
      id: 'j1', type: 'job', title: 'Job', description: 'D', situation: 'Sit', desiredProgress: 'DP',
      motivation: 'M', barriers: 'B', currentAlternative: 'CA', successSignal: 'SS', importance: 'low',
      relatedIds: [], createdAt: NOW, updatedAt: NOW,
    } as unknown as GraphEntity;
    const d = jobProfileFromEntity(entity);
    expect(d.title).toBe('Job');
    expect(d.situation).toBe('Sit');
    expect(d.desiredProgress).toBe('DP');
    expect(d.motivation).toBe('M');
    expect(d.barriers).toBe('B');
    expect(d.currentAlternative).toBe('CA');
    expect(d.successSignal).toBe('SS');
    expect(d.importance).toBe('low');
  });

  it('falls back context→situation for situation field', () => {
    const entity = { id: 'j1', type: 'job', context: 'Ctx', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(jobProfileFromEntity(entity).situation).toBe('Ctx');
  });

  it('falls back desiredOutcome→desiredProgress', () => {
    const entity = { id: 'j1', type: 'job', desiredOutcome: 'Out', relatedIds: [], createdAt: NOW, updatedAt: NOW } as unknown as GraphEntity;
    expect(jobProfileFromEntity(entity).desiredProgress).toBe('Out');
  });
});

describe('buildJobStudioReport', () => {
  it('returns null for unknown jobId', () => {
    expect(buildJobStudioReport(base(), 'x')).toBeNull();
  });

  it('has 7 foundationChecks', () => {
    const g = addEntity(base(), 'job', 'j1');
    expect(buildJobStudioReport(g, 'j1')!.foundationChecks).toHaveLength(7);
  });

  it('situation check requires situation field', () => {
    const g = addEntity(base(), 'job', 'j1', { situation: 'Sit' });
    expect(buildJobStudioReport(g, 'j1')!.foundationChecks.find(c => c.id === 'situation')!.complete).toBe(true);
  });

  it('progress check requires desiredProgress field', () => {
    const g = addEntity(base(), 'job', 'j1', { desiredProgress: 'DP' });
    expect(buildJobStudioReport(g, 'j1')!.foundationChecks.find(c => c.id === 'progress')!.complete).toBe(true);
  });

  it('motivation check requires motivation field', () => {
    const g = addEntity(base(), 'job', 'j1', { motivation: 'M' });
    expect(buildJobStudioReport(g, 'j1')!.foundationChecks.find(c => c.id === 'motivation')!.complete).toBe(true);
  });

  it('context check passes when need connected', () => {
    let g = addEntity(base(), 'job', 'j1', { relatedIds: ['n1'] });
    g = addEntity(g, 'need', 'n1');
    expect(buildJobStudioReport(g, 'j1')!.foundationChecks.find(c => c.id === 'context')!.complete).toBe(true);
  });

  it('context check passes when pain connected', () => {
    let g = addEntity(base(), 'job', 'j1', { relatedIds: ['p1'] });
    g = addEntity(g, 'pain', 'p1');
    expect(buildJobStudioReport(g, 'j1')!.foundationChecks.find(c => c.id === 'context')!.complete).toBe(true);
  });

  it('inbound via jobIds array on related entity', () => {
    let g = addEntity(base(), 'job', 'j1');
    g = addEntity(g, 'persona', 'per1', { jobIds: ['j1'] });
    expect(buildJobStudioReport(g, 'j1')!.foundationChecks.find(c => c.id === 'persona')!.complete).toBe(true);
  });

  it('readyForDesign=true when all 7 checks pass', () => {
    let g = addEntity(base(), 'job', 'j1', {
      title: 'T', description: 'D', situation: 'S', desiredProgress: 'DP', motivation: 'M',
      relatedIds: ['per1', 'n1', 'ev1'],
    });
    g = addEntity(g, 'persona', 'per1');
    g = addEntity(g, 'need', 'n1');
    g = addEntity(g, 'evidence', 'ev1');
    expect(buildJobStudioReport(g, 'j1')!.readyForDesign).toBe(true);
  });
});

describe('updateJobProfile', () => {
  it('no-ops when jobId not found', () => {
    const g = base();
    const draft = { title: 'T', description: 'D', situation: '', desiredProgress: '', motivation: '', barriers: '', currentAlternative: '', successSignal: '', importance: 'medium' as const };
    expect(updateJobProfile({ graph: g, jobId: 'x', draft, connectedIds: [] })).toBe(g);
  });

  it('updates job fields from draft', () => {
    const g = addEntity(base(), 'job', 'j1');
    const draft = { title: 'Novo job', description: 'D', situation: 'S', desiredProgress: 'DP', motivation: 'M', barriers: 'B', currentAlternative: 'CA', successSignal: 'SS', importance: 'high' as const };
    const result = updateJobProfile({ graph: g, jobId: 'j1', draft, connectedIds: [], now: NOW });
    expect(result.entities.job['j1'].title).toBe('Novo job');
    expect(result.entities.job['j1'].importance).toBe('high');
  });

  it('adds bidirectional links for selected entities', () => {
    let g = addEntity(base(), 'job', 'j1');
    g = addEntity(g, 'persona', 'per1');
    const draft = { title: 'T', description: 'D', situation: '', desiredProgress: '', motivation: '', barriers: '', currentAlternative: '', successSignal: '', importance: 'medium' as const };
    const result = updateJobProfile({ graph: g, jobId: 'j1', draft, connectedIds: ['per1'], now: NOW });
    expect(result.entities.job['j1'].relatedIds).toContain('per1');
    expect(result.entities.persona['per1'].relatedIds).toContain('j1');
  });
});

describe('jobRelationOptions', () => {
  it('returns empty for empty graph', () => {
    expect(jobRelationOptions(base())).toEqual([]);
  });

  it('includes evidence confidence', () => {
    const g = addEntity(base(), 'evidence', 'ev1', { confidence: 'low' });
    expect(jobRelationOptions(g).find(o => o.id === 'ev1')!.confidence).toBe('low');
  });
});

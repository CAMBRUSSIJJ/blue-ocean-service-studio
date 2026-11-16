import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import {
  evidenceProfileFromEntity,
  buildEvidenceStudioReport,
  createEvidenceRecord,
  updateEvidenceProfile,
  evidenceRelationOptions,
} from '../evidence-studio.ts';
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
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${id}`, description: `D-${id}`, status: 'hypothesis', relatedIds: [], createdAt: NOW, updatedAt: NOW, ...extra },
      },
    },
  } as ServiceGraph;
}

function addEvidence(graph: ServiceGraph, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return addEntity(graph, 'evidence', id, extra);
}

const FULL_DRAFT = {
  title: 'Evidence title',
  description: 'Evidence description',
  interpretation: 'Interpretation',
  sourceType: 'interview' as const,
  sourceName: 'Source',
  method: 'Method',
  collectedAt: '2025-01-01',
  sample: 'Sample',
  confidence: 'high' as const,
};

// ─── evidenceProfileFromEntity ────────────────────────────────────────────────

describe('evidenceProfileFromEntity', () => {
  it('maps all fields', () => {
    const entity = {
      id: 'e1', type: 'evidence', title: 'Title', description: 'Desc',
      interpretation: 'Interp', sourceType: 'interview', sourceName: 'Src',
      method: 'M', collectedAt: '2024-12-01', sample: 'S', confidence: 'high',
      relatedIds: [],
    } as unknown as GraphEntity;
    const d = evidenceProfileFromEntity(entity);
    expect(d.title).toBe('Title');
    expect(d.description).toBe('Desc');
    expect(d.interpretation).toBe('Interp');
    expect(d.sourceType).toBe('interview');
    expect(d.sourceName).toBe('Src');
    expect(d.method).toBe('M');
    expect(d.collectedAt).toBe('2024-12-01');
    expect(d.sample).toBe('S');
    expect(d.confidence).toBe('high');
  });

  it('falls back to source/observedAt/sampleContext aliases', () => {
    const entity = { id: 'e1', type: 'evidence', source: 'SRC', observedAt: '2024-01', sampleContext: 'SC', relatedIds: [] } as unknown as GraphEntity;
    const d = evidenceProfileFromEntity(entity);
    expect(d.sourceName).toBe('SRC');
    expect(d.collectedAt).toBe('2024-01');
    expect(d.sample).toBe('SC');
  });

  it('defaults confidence to medium for invalid value', () => {
    const entity = { id: 'e1', type: 'evidence', confidence: 'nope', relatedIds: [] } as unknown as GraphEntity;
    const d = evidenceProfileFromEntity(entity);
    expect(d.confidence).toBe('medium');
  });

  it('defaults sourceType to observation for invalid value', () => {
    const entity = { id: 'e1', type: 'evidence', sourceType: 'unknown', relatedIds: [] } as unknown as GraphEntity;
    const d = evidenceProfileFromEntity(entity);
    expect(d.sourceType).toBe('observation');
  });

  it('returns empty title when entity has no title', () => {
    const entity = { id: 'e1', type: 'evidence', relatedIds: [] } as unknown as GraphEntity;
    const d = evidenceProfileFromEntity(entity);
    expect(d.title).toBe('');
  });
});

// ─── buildEvidenceStudioReport ────────────────────────────────────────────────

describe('buildEvidenceStudioReport null guard', () => {
  it('returns null when evidence not found', () => {
    expect(buildEvidenceStudioReport(base(), 'missing')).toBeNull();
  });
});

describe('buildEvidenceStudioReport shape', () => {
  it('returns report shape for valid evidence', () => {
    const g = addEvidence(base(), 'e1');
    const r = buildEvidenceStudioReport(g, 'e1');
    expect(r).not.toBeNull();
    expect(r!.evidence.id).toBe('e1');
    expect(Array.isArray(r!.connections)).toBe(true);
    expect(r!.connectionCounts).toBeDefined();
    expect(Array.isArray(r!.qualityChecks)).toBe(true);
    expect(typeof r!.qualityScore).toBe('number');
    expect(typeof r!.supportCount).toBe('number');
    expect(typeof r!.contradictionCount).toBe('number');
    expect(typeof r!.contextualCount).toBe('number');
  });

  it('qualityChecks has 8 items', () => {
    const g = addEvidence(base(), 'e1');
    const r = buildEvidenceStudioReport(g, 'e1')!;
    expect(r.qualityChecks).toHaveLength(8);
  });

  it('source-type check passes for all valid types', () => {
    for (const st of ['interview', 'observation', 'survey', 'analytics', 'document', 'support', 'experiment', 'other']) {
      const g = addEvidence(base(), 'e1', { sourceType: st });
      const r = buildEvidenceStudioReport(g, 'e1')!;
      const check = r.qualityChecks.find((c) => c.id === 'source-type');
      expect(check?.complete).toBe(true);
    }
  });

  it('readyForDecision false for sparse entity', () => {
    const g = addEvidence(base(), 'e1');
    const r = buildEvidenceStudioReport(g, 'e1')!;
    expect(r.readyForDecision).toBe(false);
  });

  it('readyForDecision true when all checks complete', () => {
    let g = addEntity(base(), 'persona', 'pe1');
    g = addEntity(g, 'problem', 'pr1');
    g = addEvidence(g, 'e1', {
      title: 'T', description: 'D', sourceName: 'Src', method: 'M', collectedAt: '2025-01-01',
      sourceType: 'interview', confidence: 'high', relatedIds: ['pe1', 'pr1'],
    });
    const r = buildEvidenceStudioReport(g, 'e1')!;
    expect(r.readyForDecision).toBe(true);
  });
});

describe('buildEvidenceStudioReport connections', () => {
  it('detects outbound connection via relatedIds', () => {
    let g = addEntity(base(), 'persona', 'pe1');
    g = addEvidence(g, 'e1', { relatedIds: ['pe1'] });
    const r = buildEvidenceStudioReport(g, 'e1')!;
    expect(r.connectionCounts.persona).toBe(1);
    const conn = r.connections.find((c) => c.id === 'pe1');
    expect(conn?.direction).toBe('outbound');
  });

  it('detects outbound connection via typed ids (personaIds)', () => {
    let g = addEntity(base(), 'persona', 'pe1');
    g = addEvidence(g, 'e1', { personaIds: ['pe1'] });
    const r = buildEvidenceStudioReport(g, 'e1')!;
    expect(r.connectionCounts.persona).toBe(1);
  });

  it('detects inbound connection via entity.evidenceIds', () => {
    let g = addEntity(base(), 'problem', 'pr1', { evidenceIds: ['e1'] });
    g = addEvidence(g, 'e1');
    const r = buildEvidenceStudioReport(g, 'e1')!;
    expect(r.connectionCounts.problem).toBe(1);
    const conn = r.connections.find((c) => c.id === 'pr1');
    expect(conn?.direction).toBe('inbound');
  });

  it('detects both-direction connection', () => {
    let g = addEntity(base(), 'problem', 'pr1', { relatedIds: ['e1'] });
    g = addEvidence(g, 'e1', { relatedIds: ['pr1'] });
    const r = buildEvidenceStudioReport(g, 'e1')!;
    const conn = r.connections.find((c) => c.id === 'pr1');
    expect(conn?.direction).toBe('both');
  });

  it('supportCount from supporting problem evidence', () => {
    let g = addEntity(base(), 'problem', 'pr1', { supportingEvidenceIds: ['e1'], relatedIds: [] });
    g = addEvidence(g, 'e1', { relatedIds: ['pr1'] });
    const r = buildEvidenceStudioReport(g, 'e1')!;
    expect(r.supportCount).toBe(1);
  });

  it('contradictionCount from contradicting problem evidence', () => {
    let g = addEntity(base(), 'problem', 'pr1', { contradictingEvidenceIds: ['e1'], relatedIds: [] });
    g = addEvidence(g, 'e1', { relatedIds: ['pr1'] });
    const r = buildEvidenceStudioReport(g, 'e1')!;
    expect(r.contradictionCount).toBe(1);
  });
});

// ─── createEvidenceRecord ─────────────────────────────────────────────────────

describe('createEvidenceRecord', () => {
  it('creates a new evidence entity', () => {
    const { graph, evidenceId } = createEvidenceRecord({ graph: base(), title: 'New Evidence', now: NOW });
    expect(typeof evidenceId).toBe('string');
    expect(graph.entities?.evidence?.[evidenceId]).toBeDefined();
  });

  it('sets title from input', () => {
    const { graph, evidenceId } = createEvidenceRecord({ graph: base(), title: 'My Evidence', now: NOW });
    expect(graph.entities!.evidence![evidenceId].title).toBe('My Evidence');
  });

  it('defaults sourceType to observation when not provided', () => {
    const { graph, evidenceId } = createEvidenceRecord({ graph: base(), title: 'E', now: NOW });
    expect(graph.entities!.evidence![evidenceId].sourceType).toBe('observation');
  });

  it('sets sourceType from input', () => {
    const { graph, evidenceId } = createEvidenceRecord({ graph: base(), title: 'E', sourceType: 'survey', now: NOW });
    expect(graph.entities!.evidence![evidenceId].sourceType).toBe('survey');
  });

  it('sets evidenceVersion to 2', () => {
    const { graph, evidenceId } = createEvidenceRecord({ graph: base(), title: 'E', now: NOW });
    expect(graph.entities!.evidence![evidenceId].evidenceVersion).toBe(2);
  });

  it('uses provided id when given', () => {
    const { evidenceId } = createEvidenceRecord({ graph: base(), title: 'E', id: 'custom-id', now: NOW });
    expect(evidenceId).toBe('custom-id');
  });
});

// ─── updateEvidenceProfile ────────────────────────────────────────────────────

describe('updateEvidenceProfile', () => {
  it('no-ops when evidence not found', () => {
    const g = base();
    const result = updateEvidenceProfile({ graph: g, evidenceId: 'missing', draft: FULL_DRAFT, connectedIds: [], now: NOW });
    expect(result).toBe(g);
  });

  it('writes all draft fields', () => {
    const g = addEvidence(base(), 'e1');
    const result = updateEvidenceProfile({ graph: g, evidenceId: 'e1', draft: FULL_DRAFT, connectedIds: [], now: NOW });
    const updated = result.entities!.evidence!['e1'];
    expect(updated.title).toBe('Evidence title');
    expect(updated.description).toBe('Evidence description');
    expect(updated.interpretation).toBe('Interpretation');
    expect(updated.sourceType).toBe('interview');
    expect(updated.sourceName).toBe('Source');
    expect(updated.method).toBe('Method');
    expect(updated.collectedAt).toBe('2025-01-01');
    expect(updated.sample).toBe('Sample');
    expect(updated.confidence).toBe('high');
  });

  it('sets status to captured and evidenceVersion to 2', () => {
    const g = addEvidence(base(), 'e1');
    const result = updateEvidenceProfile({ graph: g, evidenceId: 'e1', draft: FULL_DRAFT, connectedIds: [], now: NOW });
    const updated = result.entities!.evidence!['e1'];
    expect(updated.status).toBe('captured');
    expect(updated.evidenceVersion).toBe(2);
  });

  it('links connected persona bidirectionally', () => {
    let g = addEntity(base(), 'persona', 'pe1');
    g = addEvidence(g, 'e1');
    const result = updateEvidenceProfile({ graph: g, evidenceId: 'e1', draft: FULL_DRAFT, connectedIds: ['pe1'], now: NOW });
    const evidence = result.entities!.evidence!['e1'];
    const persona = result.entities!.persona!['pe1'];
    expect(evidence.relatedIds).toContain('pe1');
    expect(persona.relatedIds).toContain('e1');
    expect(persona.evidenceIds).toContain('e1');
  });

  it('removes link when not in connectedIds', () => {
    let g = addEntity(base(), 'persona', 'pe1', { relatedIds: ['e1'], evidenceIds: ['e1'] });
    g = addEvidence(g, 'e1', { relatedIds: ['pe1'] });
    const result = updateEvidenceProfile({ graph: g, evidenceId: 'e1', draft: FULL_DRAFT, connectedIds: [], now: NOW });
    const persona = result.entities!.persona!['pe1'];
    expect(persona.relatedIds).not.toContain('e1');
    expect(persona.evidenceIds).not.toContain('e1');
  });

  it('sets problem supportingEvidenceIds for supports stance', () => {
    let g = addEntity(base(), 'problem', 'pr1');
    g = addEvidence(g, 'e1');
    const result = updateEvidenceProfile({ graph: g, evidenceId: 'e1', draft: FULL_DRAFT, connectedIds: ['pr1'], relationStances: { pr1: 'supports' }, now: NOW });
    const problem = result.entities!.problem!['pr1'];
    expect(problem.supportingEvidenceIds).toContain('e1');
  });

  it('sets problem contradictingEvidenceIds for contradicts stance', () => {
    let g = addEntity(base(), 'problem', 'pr1');
    g = addEvidence(g, 'e1');
    const result = updateEvidenceProfile({ graph: g, evidenceId: 'e1', draft: FULL_DRAFT, connectedIds: ['pr1'], relationStances: { pr1: 'contradicts' }, now: NOW });
    const problem = result.entities!.problem!['pr1'];
    expect(problem.contradictingEvidenceIds).toContain('e1');
  });
});

// ─── evidenceRelationOptions ──────────────────────────────────────────────────

describe('evidenceRelationOptions', () => {
  it('returns empty array for empty graph', () => {
    expect(evidenceRelationOptions(base())).toEqual([]);
  });

  it('returns options for each relation kind', () => {
    let g = addEntity(base(), 'persona', 'pe1');
    g = addEntity(g, 'problem', 'pr1');
    const opts = evidenceRelationOptions(g);
    const kinds = opts.map((o) => o.kind);
    expect(kinds).toContain('persona');
    expect(kinds).toContain('problem');
  });

  it('each option has id, kind, title, description', () => {
    const g = addEntity(base(), 'persona', 'pe1');
    const [opt] = evidenceRelationOptions(g);
    expect(opt).toHaveProperty('id');
    expect(opt).toHaveProperty('kind');
    expect(opt).toHaveProperty('title');
    expect(opt).toHaveProperty('description');
  });
});

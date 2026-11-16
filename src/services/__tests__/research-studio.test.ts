import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import {
  RESEARCH_METHOD_LABELS,
  OBSERVATION_KIND_LABELS,
  RESEARCH_PROJECT_STATUS_LABELS,
  normalizeResearchRepository,
  buildResearchStudioReport,
  createResearchProject,
  updateResearchProject,
  createResearchSource,
  createResearchObservation,
  promoteObservationToEvidence,
  createResearchInsight,
  promoteResearchInsight,
  researchTraceRows,
} from '../research-studio.ts';
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
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${id}`, description: `D-${id}`, createdAt: NOW, updatedAt: NOW, relatedIds: [], ...extra },
      },
    },
  } as ServiceGraph;
}

// ─── label maps ──────────────────────────────────────────────────────────────

describe('RESEARCH_METHOD_LABELS', () => {
  it('has Portuguese label for each method', () => {
    expect(RESEARCH_METHOD_LABELS.interview).toBe('Entrevista');
    expect(RESEARCH_METHOD_LABELS.survey).toBe('Pesquisa');
    expect(RESEARCH_METHOD_LABELS.analytics).toBe('Analytics');
  });
});

describe('OBSERVATION_KIND_LABELS', () => {
  it('has labels for all 4 kinds', () => {
    expect(OBSERVATION_KIND_LABELS.said).toBeTruthy();
    expect(OBSERVATION_KIND_LABELS.observed).toBeTruthy();
    expect(OBSERVATION_KIND_LABELS.measured).toBeTruthy();
    expect(OBSERVATION_KIND_LABELS.context).toBeTruthy();
  });
});

describe('RESEARCH_PROJECT_STATUS_LABELS', () => {
  it('has labels for all 4 statuses', () => {
    expect(RESEARCH_PROJECT_STATUS_LABELS.draft).toBe('Rascunho');
    expect(RESEARCH_PROJECT_STATUS_LABELS.complete).toBe('Concluído');
  });
});

// ─── normalizeResearchRepository ─────────────────────────────────────────────

describe('normalizeResearchRepository', () => {
  it('returns empty repository when input is undefined', () => {
    const r = normalizeResearchRepository(undefined, NOW);
    expect(r.sources).toEqual({});
    expect(r.projects).toEqual({});
    expect(r.observations).toEqual({});
    expect(r.collections).toEqual({});
    expect(r.createdAt).toBe(NOW);
    expect(r.updatedAt).toBe(NOW);
  });

  it('preserves existing data', () => {
    const r = normalizeResearchRepository({ sources: { s1: { id: 's1' } as never }, projects: {}, observations: {}, collections: {}, createdAt: NOW, updatedAt: NOW }, NOW);
    expect(r.sources).toHaveProperty('s1');
  });
});

// ─── buildResearchStudioReport ────────────────────────────────────────────────

describe('buildResearchStudioReport', () => {
  it('returns empty report for base graph', () => {
    const r = buildResearchStudioReport(base());
    expect(r.projects).toHaveLength(0);
    expect(r.sources).toHaveLength(0);
    expect(r.observations).toHaveLength(0);
    expect(r.evidence).toHaveLength(0);
    expect(r.insights).toHaveLength(0);
    expect(r.counts.projects).toBe(0);
    expect(r.traceabilityScore).toBe(0);
    expect(r.researchReady).toBe(false);
    expect(r.activeProject).toBeNull();
  });

  it('counts projects from repository', () => {
    const { graph } = createResearchProject({ graph: base(), title: 'P1', now: NOW });
    const r = buildResearchStudioReport(graph);
    expect(r.counts.projects).toBe(1);
    expect(r.projects).toHaveLength(1);
  });

  it('counts sources as material pipeline stage', () => {
    const { graph: g1 } = createResearchProject({ graph: base(), title: 'P1', id: 'p1', now: NOW });
    const { graph: g2 } = createResearchSource({ graph: g1, title: 'Source 1', type: 'interview', projectId: 'p1', now: NOW });
    const r = buildResearchStudioReport(g2);
    expect(r.counts.material).toBe(1);
  });

  it('computes traceabilityScore based on 5 checks', () => {
    // With only sources: 1 of 5 checks → 20
    const { graph: g1 } = createResearchProject({ graph: base(), title: 'P1', id: 'p1', now: NOW });
    const { graph: g2 } = createResearchSource({ graph: g1, title: 'S1', type: 'interview', projectId: 'p1', now: NOW });
    const r = buildResearchStudioReport(g2);
    expect(r.traceabilityScore).toBe(20);
  });

  it('marks unpromotedObservationIds for observations with no evidenceId', () => {
    const { graph: g1 } = createResearchProject({ graph: base(), title: 'P1', id: 'p1', now: NOW });
    const { graph: g2, observationId } = createResearchObservation({ graph: g1, text: 'obs', kind: 'said', projectId: 'p1', now: NOW });
    const r = buildResearchStudioReport(g2);
    expect(r.unpromotedObservationIds).toContain(observationId);
  });

  it('marks unsupportedInsightIds for insights with no evidenceIds', () => {
    // createResearchInsight with no evidence
    const { graph: g1, insightId } = createResearchInsight({ graph: base(), title: 'I1', evidenceIds: [], now: NOW });
    const r = buildResearchStudioReport(g1);
    expect(r.unsupportedInsightIds).toContain(insightId);
  });

  it('marks orphanEvidenceIds for evidence with no sourceIds or observationIds', () => {
    const g = addEntity(base(), 'evidence', 'ev1', { sourceIds: [], observationIds: [] });
    const r = buildResearchStudioReport(g);
    expect(r.orphanEvidenceIds).toContain('ev1');
  });

  it('activeProject is first project when no activeProjectId', () => {
    const { graph } = createResearchProject({ graph: base(), title: 'P1', now: NOW });
    const r = buildResearchStudioReport(graph);
    expect(r.activeProject).not.toBeNull();
    expect(r.activeProject!.title).toBe('P1');
  });
});

// ─── createResearchProject ────────────────────────────────────────────────────

describe('createResearchProject', () => {
  it('creates project with given title and default status=draft', () => {
    const { graph, projectId } = createResearchProject({ graph: base(), title: 'My Project', now: NOW });
    const project = graph.research?.projects?.[projectId];
    expect(project).toBeDefined();
    expect(project!.title).toBe('My Project');
    expect(project!.status).toBe('draft');
    expect(project!.serviceId).toBe(graph.service.id);
  });

  it('sets activeProjectId to new project', () => {
    const { graph, projectId } = createResearchProject({ graph: base(), title: 'P1', now: NOW });
    expect(graph.research?.activeProjectId).toBe(projectId);
  });

  it('uses provided id when given', () => {
    const { projectId } = createResearchProject({ graph: base(), title: 'P', id: 'custom-id', now: NOW });
    expect(projectId).toBe('custom-id');
  });

  it('uses provided status', () => {
    const { graph, projectId } = createResearchProject({ graph: base(), title: 'P', status: 'active', now: NOW });
    expect(graph.research?.projects?.[projectId].status).toBe('active');
  });
});

// ─── updateResearchProject ────────────────────────────────────────────────────

describe('updateResearchProject', () => {
  it('updates project fields', () => {
    const { graph: g1, projectId } = createResearchProject({ graph: base(), title: 'Old', now: NOW });
    const g2 = updateResearchProject({ graph: g1, projectId, patch: { title: 'New', status: 'active' }, now: NOW });
    const project = g2.research?.projects?.[projectId];
    expect(project!.title).toBe('New');
    expect(project!.status).toBe('active');
  });

  it('no-ops for unknown projectId', () => {
    const g = base();
    const result = updateResearchProject({ graph: g, projectId: 'unknown', patch: { title: 'X' }, now: NOW });
    expect(result).toBe(g);
  });
});

// ─── createResearchSource ─────────────────────────────────────────────────────

describe('createResearchSource', () => {
  it('creates source with correct type', () => {
    const { graph, sourceId } = createResearchSource({ graph: base(), title: 'Interview 1', type: 'interview', now: NOW });
    const source = graph.research?.sources?.[sourceId];
    expect(source!.type).toBe('interview');
    expect(source!.title).toBe('Interview 1');
  });

  it('links source to project and updates project sourceIds', () => {
    const { graph: g1, projectId } = createResearchProject({ graph: base(), title: 'P1', id: 'p1', now: NOW });
    const { graph: g2, sourceId } = createResearchSource({ graph: g1, title: 'S1', type: 'survey', projectId, now: NOW });
    expect(g2.research?.projects?.[projectId].sourceIds).toContain(sourceId);
  });

  it('deduplicates tags', () => {
    const { graph, sourceId } = createResearchSource({ graph: base(), title: 'S', type: 'other', tags: ['a', 'a', 'b'], now: NOW });
    expect(graph.research?.sources?.[sourceId].tags).toEqual(['a', 'b']);
  });
});

// ─── createResearchObservation ────────────────────────────────────────────────

describe('createResearchObservation', () => {
  it('creates observation with text and kind', () => {
    const { graph, observationId } = createResearchObservation({ graph: base(), text: 'User said X', kind: 'said', now: NOW });
    const obs = graph.research?.observations?.[observationId];
    expect(obs!.text).toBe('User said X');
    expect(obs!.kind).toBe('said');
    expect(obs!.serviceId).toBe(graph.service.id);
  });

  it('links observation to project and updates observationIds', () => {
    const { graph: g1, projectId } = createResearchProject({ graph: base(), title: 'P1', id: 'p1', now: NOW });
    const { graph: g2, observationId } = createResearchObservation({ graph: g1, text: 'obs', kind: 'observed', projectId, now: NOW });
    expect(g2.research?.projects?.[projectId].observationIds).toContain(observationId);
  });

  it('trims context and participant', () => {
    const { graph, observationId } = createResearchObservation({ graph: base(), text: 'obs', kind: 'measured', context: '  ctx  ', participant: '  user  ', now: NOW });
    const obs = graph.research?.observations?.[observationId];
    expect(obs!.context).toBe('ctx');
    expect(obs!.participant).toBe('user');
  });
});

// ─── promoteObservationToEvidence ─────────────────────────────────────────────

describe('promoteObservationToEvidence', () => {
  it('creates an evidence entity from observation', () => {
    const { graph: g1 } = createResearchProject({ graph: base(), title: 'P', id: 'p1', now: NOW });
    const { graph: g2, observationId } = createResearchObservation({ graph: g1, text: 'obs text', kind: 'said', now: NOW });
    const { graph: g3, evidenceId } = promoteObservationToEvidence({ graph: g2, observationId, now: NOW });
    expect(evidenceId).not.toBeNull();
    const evidence = g3.entities?.evidence?.[evidenceId!];
    expect(evidence).toBeDefined();
    expect(evidence!.type).toBe('evidence');
    expect(evidence!.observationIds).toContain(observationId);
  });

  it('marks observation as evidenceId after promotion', () => {
    const { graph: g1 } = createResearchProject({ graph: base(), title: 'P', id: 'p1', now: NOW });
    const { graph: g2, observationId } = createResearchObservation({ graph: g1, text: 'obs', kind: 'said', now: NOW });
    const { graph: g3, evidenceId } = promoteObservationToEvidence({ graph: g2, observationId, now: NOW });
    const obs = g3.research?.observations?.[observationId];
    expect(obs!.evidenceId).toBe(evidenceId);
  });

  it('returns null for unknown observationId', () => {
    const { evidenceId } = promoteObservationToEvidence({ graph: base(), observationId: 'missing', now: NOW });
    expect(evidenceId).toBeNull();
  });

  it('no-ops if observation already has evidenceId pointing to existing entity', () => {
    const { graph: g1 } = createResearchProject({ graph: base(), title: 'P', id: 'p1', now: NOW });
    const { graph: g2, observationId } = createResearchObservation({ graph: g1, text: 'obs', kind: 'said', now: NOW });
    const { graph: g3, evidenceId: ev1 } = promoteObservationToEvidence({ graph: g2, observationId, now: NOW });
    const { graph: g4, evidenceId: ev2 } = promoteObservationToEvidence({ graph: g3, observationId, now: NOW });
    expect(g4).toBe(g3); // no change
    expect(ev2).toBe(ev1);
  });

  it('uses source info for evidence when observation has sourceId', () => {
    const { graph: g1, projectId } = createResearchProject({ graph: base(), title: 'P', id: 'p1', now: NOW });
    const { graph: g2, sourceId } = createResearchSource({ graph: g1, title: 'Interview A', type: 'interview', projectId, now: NOW });
    const { graph: g3, observationId } = createResearchObservation({ graph: g2, text: 'obs', kind: 'said', sourceId, projectId, now: NOW });
    const { graph: g4, evidenceId } = promoteObservationToEvidence({ graph: g3, observationId, now: NOW });
    const evidence = g4.entities?.evidence?.[evidenceId!];
    expect(evidence!.sourceType).toBe('interview');
    expect(evidence!.sourceName).toBe('Interview A');
  });
});

// ─── createResearchInsight ────────────────────────────────────────────────────

describe('createResearchInsight', () => {
  it('creates insight with evidenceIds', () => {
    let g = base();
    g = addEntity(g, 'evidence', 'ev1', { sourceIds: ['src1'], observationIds: ['obs1'], insightIds: [], relatedIds: [] });
    const { graph, insightId } = createResearchInsight({ graph: g, title: 'Key Insight', evidenceIds: ['ev1'], now: NOW });
    const insight = graph.entities?.insight?.[insightId];
    expect(insight!.title).toBe('Key Insight');
    expect(insight!.evidenceIds).toContain('ev1');
  });

  it('filters out non-existent evidenceIds', () => {
    const { graph, insightId } = createResearchInsight({ graph: base(), title: 'I1', evidenceIds: ['missing'], now: NOW });
    const insight = graph.entities?.insight?.[insightId];
    expect(insight!.evidenceIds).toHaveLength(0);
  });

  it('back-links insight on evidence entities', () => {
    let g = base();
    g = addEntity(g, 'evidence', 'ev1', { insightIds: [], relatedIds: [] });
    const { graph, insightId } = createResearchInsight({ graph: g, title: 'I', evidenceIds: ['ev1'], now: NOW });
    expect(graph.entities?.evidence?.['ev1'].insightIds).toContain(insightId);
  });

  it('sets sourceIds and observationIds from evidence', () => {
    let g = base();
    g = addEntity(g, 'evidence', 'ev1', { sourceIds: ['src1'], observationIds: ['obs1'], insightIds: [], relatedIds: [] });
    const { graph, insightId } = createResearchInsight({ graph: g, title: 'I', evidenceIds: ['ev1'], now: NOW });
    const insight = graph.entities?.insight?.[insightId];
    expect(insight!.sourceIds).toContain('src1');
    expect(insight!.observationIds).toContain('obs1');
  });
});

// ─── promoteResearchInsight ───────────────────────────────────────────────────

describe('promoteResearchInsight', () => {
  it('returns null for unknown insightId', () => {
    const { entityId } = promoteResearchInsight({ graph: base(), insightId: 'missing', target: 'need', now: NOW });
    expect(entityId).toBeNull();
  });

  it('promotes insight to need entity', () => {
    let g = base();
    g = addEntity(g, 'evidence', 'ev1', { insightIds: [], relatedIds: [] });
    const { graph: g2, insightId } = createResearchInsight({ graph: g, title: 'I', evidenceIds: ['ev1'], now: NOW });
    const { graph: g3, entityId } = promoteResearchInsight({ graph: g2, insightId, target: 'need', now: NOW });
    expect(entityId).not.toBeNull();
    const need = g3.entities?.need?.[entityId!];
    expect(need!.type).toBe('need');
  });

  it('promotes insight to problemHypothesis entity', () => {
    let g = base();
    g = addEntity(g, 'evidence', 'ev1', { insightIds: [], relatedIds: [] });
    const { graph: g2, insightId } = createResearchInsight({ graph: g, title: 'I', evidenceIds: ['ev1'], now: NOW });
    const { graph: g3, entityId } = promoteResearchInsight({ graph: g2, insightId, target: 'problemHypothesis', now: NOW });
    expect(entityId).not.toBeNull();
    const hyp = g3.entities?.problemHypothesis?.[entityId!];
    expect(hyp!.type).toBe('problemHypothesis');
  });

  it('adds promotedToIds on insight after promotion', () => {
    let g = base();
    g = addEntity(g, 'evidence', 'ev1', { insightIds: [], relatedIds: [] });
    const { graph: g2, insightId } = createResearchInsight({ graph: g, title: 'I', evidenceIds: ['ev1'], now: NOW });
    const { graph: g3, entityId } = promoteResearchInsight({ graph: g2, insightId, target: 'need', now: NOW });
    const insight = g3.entities?.insight?.[insightId];
    expect(insight!.promotedToIds).toContain(entityId);
  });
});

// ─── researchTraceRows ────────────────────────────────────────────────────────

describe('researchTraceRows', () => {
  it('returns empty array for base graph', () => {
    expect(researchTraceRows(base())).toHaveLength(0);
  });

  it('returns one row per evidence entity', () => {
    const g = addEntity(base(), 'evidence', 'ev1', { sourceIds: [], observationIds: [] });
    const rows = researchTraceRows(g);
    expect(rows).toHaveLength(1);
    expect(rows[0].evidence.id).toBe('ev1');
    expect(rows[0].source).toBeNull();
    expect(rows[0].observation).toBeNull();
    expect(rows[0].insights).toHaveLength(0);
  });

  it('resolves source and observation for evidence with references', () => {
    const { graph: g1, projectId } = createResearchProject({ graph: base(), title: 'P', id: 'p1', now: NOW });
    const { graph: g2, sourceId } = createResearchSource({ graph: g1, title: 'Src', type: 'interview', projectId, now: NOW });
    const { graph: g3, observationId } = createResearchObservation({ graph: g2, text: 'obs', kind: 'said', sourceId, projectId, now: NOW });
    const { graph: g4, evidenceId } = promoteObservationToEvidence({ graph: g3, observationId, now: NOW });
    const rows = researchTraceRows(g4);
    expect(rows).toHaveLength(1);
    expect(rows[0].source?.id).toBe(sourceId);
    expect(rows[0].observation?.id).toBe(observationId);
  });

  it('includes insight records linked to evidence', () => {
    let g = base();
    g = addEntity(g, 'evidence', 'ev1', { sourceIds: ['src1'], observationIds: ['obs1'], insightIds: [], relatedIds: [] });
    const { graph: g2, insightId } = createResearchInsight({ graph: g, title: 'I', evidenceIds: ['ev1'], now: NOW });
    const rows = researchTraceRows(g2);
    expect(rows[0].insights.map((i) => i.id)).toContain(insightId);
  });
});

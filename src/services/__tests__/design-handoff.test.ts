import { describe, it, expect } from 'vitest';
import {
  buildDesignHandoffReport,
  prepareJourneyFromDefinition,
  prepareWhiteboardFromDefinition,
  prepareBlueprintFromDefinition,
} from '../design-handoff';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-05-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', name: 'My Service', updatedAt: NOW } };
}

/** Seed a minimal service definition that passes readyToDesign */
function withReadyDefinition(graph: ServiceGraph): ServiceGraph {
  return {
    ...graph,
    service: {
      ...graph.service,
      project: {
        ...graph.service.project,
        definition: {
          promise: 'Deliver value',
          outcome: 'Happy customers',
          scope: 'Web app',
          startBoundary: 'Customer signs up',
          endBoundary: 'First value delivered',
          outOfScope: [],
          assumptions: [],
          principles: ['User first'],
          successCriteria: ['NPS > 50'],
          problemIds: ['p1'],
          personaIds: ['per1'],
          evidenceIds: ['ev1'],
        },
      } as NonNullable<ServiceGraph['service']['project']>,
    },
  } as ServiceGraph;
}

function withEntities(graph: ServiceGraph): ServiceGraph {
  return {
    ...graph,
    entities: {
      persona: {
        per1: { id: 'per1', serviceId: 'S', kind: 'persona', title: 'Main Persona', description: 'Key persona', createdAt: NOW, updatedAt: NOW },
      },
      problem: {
        // must have status: 'validated' so buildServiceDefinitionStudioReport includes it in validProblemIds
        p1: { id: 'p1', serviceId: 'S', kind: 'problem', title: 'Core Problem', description: 'The main problem', status: 'validated', createdAt: NOW, updatedAt: NOW },
      },
      evidence: {
        ev1: { id: 'ev1', serviceId: 'S', kind: 'evidence', title: 'Key Evidence', description: 'Research finding', confidence: 'high', createdAt: NOW, updatedAt: NOW },
      },
    },
  } as ServiceGraph;
}

function readyGraph(): ServiceGraph {
  return withEntities(withReadyDefinition(base()));
}

// ─── buildDesignHandoffReport ─────────────────────────────────────────────────

describe('buildDesignHandoffReport', () => {
  it('returns score 0 for empty graph', () => {
    const r = buildDesignHandoffReport(base());
    expect(r.score).toBe(0);
    expect(r.definitionReady).toBe(false);
  });

  it('score > 0 when personas, problems, evidence all present', () => {
    const r = buildDesignHandoffReport(readyGraph());
    expect(r.score).toBeGreaterThan(0);
  });

  it('context includes personaIds, problemIds, evidenceIds', () => {
    const r = buildDesignHandoffReport(readyGraph());
    expect(r.context.personaIds).toContain('per1');
    expect(r.context.problemIds).toContain('p1');
    expect(r.context.evidenceIds).toContain('ev1');
  });

  it('primary items include persona, problem, evidence', () => {
    const r = buildDesignHandoffReport(readyGraph());
    const kinds = r.primary.map((item) => item.kind);
    expect(kinds).toContain('persona');
    expect(kinds).toContain('problem');
    expect(kinds).toContain('evidence');
  });

  it('evidence item has confidence field', () => {
    const r = buildDesignHandoffReport(readyGraph());
    const ev = r.primary.find((item) => item.kind === 'evidence');
    expect(ev?.confidence).toBe('high');
  });

  it('counts match context ids length', () => {
    const r = buildDesignHandoffReport(readyGraph());
    expect(r.counts.persona).toBe(r.context.personaIds.length);
    expect(r.counts.problem).toBe(r.context.problemIds.length);
    expect(r.counts.evidence).toBe(r.context.evidenceIds.length);
  });

  it('checks array has 5 entries', () => {
    const r = buildDesignHandoffReport(readyGraph());
    expect(r.checks.length).toBe(5);
  });

  it('readyForJourney requires definition + persona + problem + evidence', () => {
    // Without entities even if definition present, not ready
    const r = buildDesignHandoffReport(withReadyDefinition(base()));
    expect(r.readyForJourney).toBe(false);

    // With all three
    const r2 = buildDesignHandoffReport(readyGraph());
    expect(r2.readyForJourney).toBe(true);
  });

  it('readyForBlueprint requires journey with 2+ stages', () => {
    const r = buildDesignHandoffReport(readyGraph());
    expect(r.readyForBlueprint).toBe(false); // no stages
    expect(r.journeyStageCount).toBe(0);
  });
});

// ─── prepareJourneyFromDefinition ────────────────────────────────────────────

describe('prepareJourneyFromDefinition', () => {
  it('returns created: false when not readyForJourney', () => {
    const result = prepareJourneyFromDefinition(base(), { now: NOW, id: 'j1' });
    expect(result.created).toBe(false);
    expect(result.journeyId).toBeNull();
  });

  it('creates journey when readyForJourney', () => {
    const result = prepareJourneyFromDefinition(readyGraph(), { now: NOW, id: 'j1' });
    expect(result.created).toBe(true);
    expect(result.journeyId).toBe('j1');
    expect(result.graph.journeys['j1']).toBeDefined();
  });

  it('journey includes designContext from definition', () => {
    const result = prepareJourneyFromDefinition(readyGraph(), { now: NOW, id: 'j1' });
    const journey = result.graph.journeys['j1'];
    expect(journey?.designContext).toBeDefined();
    expect(journey?.designContext?.personaIds).toContain('per1');
  });

  it('uses custom name when provided', () => {
    const result = prepareJourneyFromDefinition(readyGraph(), { now: NOW, id: 'j1', name: 'Custom Journey' });
    expect(result.graph.journeys['j1']?.name).toBe('Custom Journey');
  });

  it('adds journey to service.journeyIds', () => {
    const result = prepareJourneyFromDefinition(readyGraph(), { now: NOW, id: 'j1' });
    expect(result.graph.service.journeyIds).toContain('j1');
  });

  it('returns created: false when journey already exists', () => {
    const r1 = prepareJourneyFromDefinition(readyGraph(), { now: NOW, id: 'j1' });
    const r2 = prepareJourneyFromDefinition(r1.graph, { now: NOW, id: 'j1' });
    expect(r2.created).toBe(false);
    expect(r2.journeyId).toBe('j1');
  });
});

// ─── prepareWhiteboardFromDefinition ─────────────────────────────────────────

describe('prepareWhiteboardFromDefinition', () => {
  it('returns created: false when not readyForWhiteboard', () => {
    const result = prepareWhiteboardFromDefinition(base(), { now: NOW, id: 'wb1' });
    expect(result.created).toBe(false);
    expect(result.boardId).toBeNull();
  });

  it('creates whiteboard when readyForWhiteboard', () => {
    const result = prepareWhiteboardFromDefinition(readyGraph(), { now: NOW, id: 'wb1' });
    expect(result.created).toBe(true);
    expect(result.boardId).toBe('wb1');
    expect(result.graph.views.whiteboards['wb1']).toBeDefined();
  });

  it('whiteboard has viewKind free', () => {
    const result = prepareWhiteboardFromDefinition(readyGraph(), { now: NOW, id: 'wb1' });
    expect(result.graph.views.whiteboards['wb1']?.viewKind).toBe('free');
  });

  it('whiteboard has designContext', () => {
    const result = prepareWhiteboardFromDefinition(readyGraph(), { now: NOW, id: 'wb1' });
    expect(result.graph.views.whiteboards['wb1']?.designContext).toBeDefined();
  });

  it('returns created: false when whiteboard already exists', () => {
    const r1 = prepareWhiteboardFromDefinition(readyGraph(), { now: NOW, id: 'wb1' });
    const r2 = prepareWhiteboardFromDefinition(r1.graph, { now: NOW, id: 'wb1' });
    expect(r2.created).toBe(false);
  });
});

// ─── prepareBlueprintFromDefinition ──────────────────────────────────────────

describe('prepareBlueprintFromDefinition', () => {
  it('returns created: false when not readyForJourney', () => {
    const result = prepareBlueprintFromDefinition(base(), { now: NOW, id: 'bp1' });
    expect(result.created).toBe(false);
    expect(result.boardId).toBeNull();
  });

  it('creates blueprint board with viewKind blueprint', () => {
    const result = prepareBlueprintFromDefinition(readyGraph(), { now: NOW, id: 'bp1' });
    expect(result.created).toBe(true);
    expect(result.boardId).toBe('bp1');
    const board = result.graph.views.whiteboards['bp1'];
    expect(board?.viewKind).toBe('blueprint');
  });

  it('blueprint also creates or reuses a journey', () => {
    const result = prepareBlueprintFromDefinition(readyGraph(), { now: NOW, id: 'bp1' });
    expect(result.journeyId).toBeTruthy();
  });

  it('uses provided journeyId when exists', () => {
    const { graph: g, journeyId } = prepareJourneyFromDefinition(readyGraph(), { now: NOW, id: 'j1' });
    const result = prepareBlueprintFromDefinition(g, { now: NOW, id: 'bp1', journeyId: 'j1' });
    expect(result.journeyId).toBe('j1');
    expect(result.graph.views.whiteboards['bp1']?.journeyId).toBe('j1');
  });

  it('returns created: false when board already exists', () => {
    const r1 = prepareBlueprintFromDefinition(readyGraph(), { now: NOW, id: 'bp1' });
    const r2 = prepareBlueprintFromDefinition(r1.graph, { now: NOW, id: 'bp1' });
    expect(r2.created).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import {
  selectJourneyPersona,
  readJourneyEmotion,
  writeJourneyEmotion,
  journeyPainContexts,
} from '../journey-context';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withJourneyAndStage(graph: ServiceGraph): ServiceGraph {
  return {
    ...graph,
    service: { ...graph.service, journeyIds: ['j1'] },
    journeys: { j1: { id: 'j1', serviceId: 'S', name: 'Journey 1', status: 'active', stageIds: ['s1'], createdAt: NOW, updatedAt: NOW } as ServiceGraph['journeys'][string] },
    stages: { s1: { id: 's1', journeyId: 'j1', serviceId: 'S', title: 'Stage 1', customerAction: '', touchpointIds: [], opportunityIds: [], problemIds: [], createdAt: NOW, updatedAt: NOW } as ServiceGraph['stages'][string] },
  };
}

function withPersona(graph: ServiceGraph, id: string): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      persona: { ...(graph.entities?.persona ?? {}), [id]: { id, serviceId: 'S', kind: 'persona', title: `Persona ${id}`, createdAt: NOW, updatedAt: NOW } },
    },
  } as ServiceGraph;
}

// ─── selectJourneyPersona ─────────────────────────────────────────────────────

describe('selectJourneyPersona', () => {
  it('assigns personaId to journey', () => {
    let g = withJourneyAndStage(base());
    g = withPersona(g, 'p1');
    const result = selectJourneyPersona(g, 'j1', 'p1');
    expect((result.journeys['j1'] as unknown as Record<string, unknown>)['personaId']).toBe('p1');
  });

  it('allows empty string to unset persona', () => {
    let g = withJourneyAndStage(base());
    g = withPersona(g, 'p1');
    const result = selectJourneyPersona(g, 'j1', '');
    expect((result.journeys['j1'] as unknown as Record<string, unknown>)['personaId']).toBe('');
  });

  it('throws for missing journey', () => {
    expect(() => selectJourneyPersona(base(), 'ghost', 'p1')).toThrow('Jornada indisponível');
  });

  it('throws for persona from another service', () => {
    let g = withJourneyAndStage(base());
    g = {
      ...g,
      entities: { ...g.entities, persona: { 'p-other': { id: 'p-other', serviceId: 'OTHER', kind: 'persona', createdAt: NOW, updatedAt: NOW } } },
    } as ServiceGraph;
    expect(() => selectJourneyPersona(g, 'j1', 'p-other')).toThrow('Persona não está disponível');
  });
});

// ─── readJourneyEmotion ───────────────────────────────────────────────────────

describe('readJourneyEmotion', () => {
  it('returns neutral emotion when no data', () => {
    const g = withJourneyAndStage(base());
    const stage = { id: 's1', emotionScore: undefined, emotionNote: '', emotionRecorded: false } as unknown as Record<string, unknown>;
    const result = readJourneyEmotion(g, { personaId: undefined }, stage);
    expect(result.e).toBe(0);
    expect(result.emotionRecorded).toBe(false);
  });

  it('reads positive emotion from stage', () => {
    const g = withJourneyAndStage(base());
    const stage = { id: 's1', emotionScore: 2, emotionRecorded: true, emotionStatus: 'validated', emotionSource: 'survey' } as unknown as Record<string, unknown>;
    const result = readJourneyEmotion(g, {}, stage);
    expect(result.e).toBe(2);
    expect(result.emotionRecorded).toBe(true);
  });

  it('clamps score between -2 and 2', () => {
    const g = withJourneyAndStage(base());
    const stage = { id: 's1', emotionScore: 10, emotionRecorded: true } as unknown as Record<string, unknown>;
    const result = readJourneyEmotion(g, {}, stage);
    expect(result.e).toBe(2);
  });

  it('maps legacy emotion=negative to -1', () => {
    const g = withJourneyAndStage(base());
    const stage = { id: 's1', emotion: 'negative' } as unknown as Record<string, unknown>;
    const result = readJourneyEmotion(g, {}, stage);
    expect(result.e).toBe(-1);
  });

  it('maps legacy emotion=positive to 1', () => {
    const g = withJourneyAndStage(base());
    const stage = { id: 's1', emotion: 'positive' } as unknown as Record<string, unknown>;
    const result = readJourneyEmotion(g, {}, stage);
    expect(result.e).toBe(1);
  });
});

// ─── writeJourneyEmotion ──────────────────────────────────────────────────────

describe('writeJourneyEmotion', () => {
  it('writes emotion to stage (no persona)', () => {
    const g = withJourneyAndStage(base());
    const stage: Record<string, unknown> = { id: 's1' };
    writeJourneyEmotion(g, {}, stage, { e: 1, emotionRecorded: true, emotionStatus: 'hypothesis' }, NOW);
    expect(stage['emotionRecorded']).toBe(true);
    expect(stage['emotionScore']).toBe(1);
    expect(stage['emotion']).toBe('positive');
  });

  it('sets emotion to negative for score < 0', () => {
    const g = withJourneyAndStage(base());
    const stage: Record<string, unknown> = { id: 's1' };
    writeJourneyEmotion(g, {}, stage, { e: -2, emotionRecorded: true }, NOW);
    expect(stage['emotion']).toBe('negative');
  });

  it('removes emotionScore when not recorded', () => {
    const g = withJourneyAndStage(base());
    const stage: Record<string, unknown> = { id: 's1', emotionScore: 1 };
    writeJourneyEmotion(g, {}, stage, { e: 0, emotionRecorded: false }, NOW);
    expect(stage['emotionScore']).toBeUndefined();
  });

  it('throws for invalid score', () => {
    const g = withJourneyAndStage(base());
    const stage: Record<string, unknown> = { id: 's1' };
    expect(() => writeJourneyEmotion(g, {}, stage, { e: 5 }, NOW)).toThrow('Intensidade emocional inválida');
  });

  it('throws for validated emotion without source', () => {
    const g = withJourneyAndStage(base());
    const stage: Record<string, unknown> = { id: 's1' };
    expect(() => writeJourneyEmotion(g, {}, stage, { e: 1, emotionRecorded: true, emotionStatus: 'validated', emotionSource: '' }, NOW)).toThrow('fonte da evidência');
  });
});

// ─── journeyPainContexts ──────────────────────────────────────────────────────

describe('journeyPainContexts', () => {
  it('returns empty array for journey with no pains', () => {
    const g = withJourneyAndStage(base());
    expect(journeyPainContexts(g, 'j1')).toHaveLength(0);
  });

  it('throws for missing journey', () => {
    expect(() => journeyPainContexts(base(), 'ghost')).toThrow('Jornada indisponível');
  });

  it('includes research pains from entities', () => {
    let g = withJourneyAndStage(base());
    g = {
      ...g,
      entities: {
        ...g.entities,
        pain: { 'pa1': { id: 'pa1', serviceId: 'S', kind: 'pain', title: 'Espera longa', description: 'Espera muito longa', stageId: 's1', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const contexts = journeyPainContexts(g, 'j1');
    expect(contexts.some(c => c.id === 'pa1' && c.kind === 'research')).toBe(true);
  });

  it('includes journey problems from graph.problems', () => {
    let g = withJourneyAndStage(base());
    g = {
      ...g,
      problems: {
        'prob1': { id: 'prob1', stageId: 's1', serviceId: 'S', description: 'Bug no sistema', createdAt: NOW, updatedAt: NOW } as ServiceGraph['problems'][string],
      },
    };
    const contexts = journeyPainContexts(g, 'j1');
    expect(contexts.some(c => c.id === 'prob1' && c.kind === 'journey')).toBe(true);
  });

  it('marks inJourney=true for problem in journey stage', () => {
    let g = withJourneyAndStage(base());
    g = {
      ...g,
      problems: {
        'prob1': { id: 'prob1', stageId: 's1', serviceId: 'S', description: 'Issue', createdAt: NOW, updatedAt: NOW } as ServiceGraph['problems'][string],
      },
    };
    const contexts = journeyPainContexts(g, 'j1');
    const ctx = contexts.find(c => c.id === 'prob1');
    expect(ctx?.inJourney).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import { buildServiceReadinessReport } from '../service-readiness.ts';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import { updateServiceProjectDefinition } from '../service-project.ts';
import type { ServiceGraph, GraphEntity, WhiteboardView, WhiteboardItem } from '../../domain/model';

const NOW = '2025-01-01T00:00:00.000Z';

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

// ─── Helpers para construir o grafo ─────────────────────────────────────────

function withEntity(graph: ServiceGraph, kind: string, id: string, extra: Partial<GraphEntity> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: {
        ...(graph.entities?.[kind] ?? {}),
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${kind}-${id}`, status: 'active', relatedIds: [], createdAt: NOW, updatedAt: NOW, ...extra },
      },
    },
  } as ServiceGraph;
}

function withStage(graph: ServiceGraph, stageId: string, journeyId: string, overrides: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    stages: {
      ...graph.stages,
      [stageId]: {
        id: stageId, journeyId, title: 'Etapa', customerAction: '', emotion: 'neutral' as const,
        touchpointIds: [], problemIds: [], opportunityIds: [], ...overrides,
      },
    },
  };
}

function withJourney(graph: ServiceGraph, journeyId: string, stageIds: string[] = []): ServiceGraph {
  return {
    ...graph,
    journeys: {
      ...graph.journeys,
      [journeyId]: { id: journeyId, serviceId: graph.service.id, name: 'Jornada', stageIds, createdAt: NOW, updatedAt: NOW },
    },
    service: { ...graph.service, journeyIds: [...(graph.service.journeyIds ?? []), journeyId] },
  };
}

function withServiceBoard(graph: ServiceGraph, boardId: string, journeyId?: string, items: Record<string, WhiteboardItem> = {}): ServiceGraph {
  const board: WhiteboardView = {
    id: boardId,
    serviceId: graph.service.id,
    name: 'Service Frame',
    journeyId,
    layoutMode: 'service',
    items,
    edges: {},
  };
  return {
    ...graph,
    views: {
      ...graph.views,
      whiteboards: {
        ...(graph.views?.whiteboards ?? {}),
        [boardId]: board,
      },
    },
  };
}

function withValidatedProblem(graph: ServiceGraph, problemId: string, stageId: string, evidenceIds: string[] = []): ServiceGraph {
  const problem: GraphEntity = {
    id: problemId, type: 'problem', serviceId: graph.service.id, title: 'Problema',
    status: 'validated', stageId, relatedIds: [], evidenceIds, createdAt: NOW, updatedAt: NOW,
  } as any;
  return {
    ...graph,
    entities: {
      ...graph.entities,
      problem: { ...(graph.entities?.problem ?? {}), [problemId]: problem },
    },
  } as ServiceGraph;
}

function withFullDefinition(graph: ServiceGraph): ServiceGraph {
  return updateServiceProjectDefinition(graph, {
    promise: 'Promessa do serviço',
    outcome: 'Resultado esperado',
    scope: 'Escopo do serviço',
    startBoundary: 'Início do serviço',
    endBoundary: 'Fim do serviço',
    principles: ['Princípio 1'],
    successCriteria: ['Critério 1'],
    personaIds: [],
    problemIds: [],
    evidenceIds: [],
  });
}

// ─── Grafo vazio ─────────────────────────────────────────────────────────────

describe('buildServiceReadinessReport — grafo vazio', () => {
  it('retorna version=1', () => {
    expect(buildServiceReadinessReport(makeGraph()).version).toBe(1);
  });

  it('score=0', () => {
    expect(buildServiceReadinessReport(makeGraph()).score).toBe(0);
  });

  it('complete=0', () => {
    expect(buildServiceReadinessReport(makeGraph()).complete).toBe(0);
  });

  it('total=17 (5 context + 6 definition + 6 structure)', () => {
    expect(buildServiceReadinessReport(makeGraph()).total).toBe(17);
  });

  it('state="blocked" quando score<50', () => {
    expect(buildServiceReadinessReport(makeGraph()).state).toBe('blocked');
  });

  it('readyForDesign=false quando há gaps', () => {
    expect(buildServiceReadinessReport(makeGraph()).readyForDesign).toBe(false);
  });

  it('nextAction não nulo (aponta para o primeiro gap)', () => {
    expect(buildServiceReadinessReport(makeGraph()).nextAction).not.toBeNull();
  });

  it('blockingGaps tem 17 items', () => {
    expect(buildServiceReadinessReport(makeGraph()).blockingGaps).toHaveLength(17);
  });

  it('frame.boardId=null', () => {
    expect(buildServiceReadinessReport(makeGraph()).frame.boardId).toBeNull();
  });

  it('frame.stageCount=0', () => {
    expect(buildServiceReadinessReport(makeGraph()).frame.stageCount).toBe(0);
  });

  it('frame.coverage=0', () => {
    expect(buildServiceReadinessReport(makeGraph()).frame.coverage).toBe(0);
  });

  it('sections contém context, definition, structure', () => {
    const { sections } = buildServiceReadinessReport(makeGraph());
    expect(sections.context).toBeDefined();
    expect(sections.definition).toBeDefined();
    expect(sections.structure).toBeDefined();
  });
});

// ─── Critérios de Contexto ───────────────────────────────────────────────────

describe('buildServiceReadinessReport — context criteria', () => {
  it('context.persona: complete=true quando há persona', () => {
    let g = makeGraph();
    g = withEntity(g, 'persona', 'p1');
    const { sections } = buildServiceReadinessReport(g);
    const criterion = sections.context.criteria.find(c => c.id === 'context.persona')!;
    expect(criterion.complete).toBe(true);
  });

  it('context.persona: complete=false sem personas', () => {
    const { sections } = buildServiceReadinessReport(makeGraph());
    expect(sections.context.criteria.find(c => c.id === 'context.persona')!.complete).toBe(false);
  });

  it('context.need-job: complete=true quando há need', () => {
    let g = makeGraph();
    g = withEntity(g, 'need', 'n1');
    expect(buildServiceReadinessReport(g).sections.context.criteria.find(c => c.id === 'context.need-job')!.complete).toBe(true);
  });

  it('context.need-job: complete=true quando há job', () => {
    let g = makeGraph();
    g = withEntity(g, 'job', 'j1');
    expect(buildServiceReadinessReport(g).sections.context.criteria.find(c => c.id === 'context.need-job')!.complete).toBe(true);
  });

  it('context.problem: complete=true quando há problema validado', () => {
    let g = makeGraph();
    g = withStage(g, 's1', 'j1');
    g = withValidatedProblem(g, 'prob1', 's1');
    expect(buildServiceReadinessReport(g).sections.context.criteria.find(c => c.id === 'context.problem')!.complete).toBe(true);
  });

  it('context.evidence: complete=true quando há evidência', () => {
    let g = makeGraph();
    g = withEntity(g, 'evidence', 'e1');
    expect(buildServiceReadinessReport(g).sections.context.criteria.find(c => c.id === 'context.evidence')!.complete).toBe(true);
  });

  it('context.problem-evidence: complete=true quando problema tem evidenceIds', () => {
    let g = makeGraph();
    g = withStage(g, 's1', 'j1');
    g = withEntity(g, 'evidence', 'e1');
    g = withValidatedProblem(g, 'prob1', 's1', ['e1']);
    expect(buildServiceReadinessReport(g).sections.context.criteria.find(c => c.id === 'context.problem-evidence')!.complete).toBe(true);
  });

  it('context.problem-evidence: complete=false quando problema não tem evidenceIds', () => {
    let g = makeGraph();
    g = withStage(g, 's1', 'j1');
    g = withValidatedProblem(g, 'prob1', 's1', []);
    expect(buildServiceReadinessReport(g).sections.context.criteria.find(c => c.id === 'context.problem-evidence')!.complete).toBe(false);
  });
});

// ─── Critérios de Definição ──────────────────────────────────────────────────

describe('buildServiceReadinessReport — definition criteria', () => {
  it('definition.promise-outcome: complete=true quando promise e outcome preenchidos', () => {
    let g = updateServiceProjectDefinition(makeGraph(), { promise: 'Promessa', outcome: 'Resultado' });
    expect(buildServiceReadinessReport(g).sections.definition.criteria.find(c => c.id === 'definition.promise-outcome')!.complete).toBe(true);
  });

  it('definition.promise-outcome: complete=false quando só promise preenchido', () => {
    let g = updateServiceProjectDefinition(makeGraph(), { promise: 'Promessa' });
    expect(buildServiceReadinessReport(g).sections.definition.criteria.find(c => c.id === 'definition.promise-outcome')!.complete).toBe(false);
  });

  it('definition.scope: complete=true quando scope preenchido', () => {
    let g = updateServiceProjectDefinition(makeGraph(), { scope: 'Escopo' });
    expect(buildServiceReadinessReport(g).sections.definition.criteria.find(c => c.id === 'definition.scope')!.complete).toBe(true);
  });

  it('definition.boundaries: complete=true quando start e end preenchidos', () => {
    let g = updateServiceProjectDefinition(makeGraph(), { startBoundary: 'Início', endBoundary: 'Fim' });
    expect(buildServiceReadinessReport(g).sections.definition.criteria.find(c => c.id === 'definition.boundaries')!.complete).toBe(true);
  });

  it('definition.principles: complete=true quando há ao menos 1 princípio', () => {
    let g = updateServiceProjectDefinition(makeGraph(), { principles: ['Foco no cliente'] });
    expect(buildServiceReadinessReport(g).sections.definition.criteria.find(c => c.id === 'definition.principles')!.complete).toBe(true);
  });

  it('definition.success: complete=true quando há critério de sucesso', () => {
    let g = updateServiceProjectDefinition(makeGraph(), { successCriteria: ['NPS > 70'] });
    expect(buildServiceReadinessReport(g).sections.definition.criteria.find(c => c.id === 'definition.success')!.complete).toBe(true);
  });

  it('definition.traceability: complete=true quando personaIds, problemIds e evidenceIds têm referências válidas no graph', () => {
    let g = makeGraph();
    g = withEntity(g, 'persona', 'per1');
    g = withStage(g, 's1', 'j1');
    g = withValidatedProblem(g, 'prob1', 's1', ['ev1']);
    g = withEntity(g, 'evidence', 'ev1');
    g = updateServiceProjectDefinition(g, { personaIds: ['per1'], problemIds: ['prob1'], evidenceIds: ['ev1'] });
    expect(buildServiceReadinessReport(g).sections.definition.criteria.find(c => c.id === 'definition.traceability')!.complete).toBe(true);
  });

  it('definition.traceability: complete=false quando personaIds vazio', () => {
    expect(buildServiceReadinessReport(makeGraph()).sections.definition.criteria.find(c => c.id === 'definition.traceability')!.complete).toBe(false);
  });
});

// ─── Critérios de Estrutura ───────────────────────────────────────────────────

describe('buildServiceReadinessReport — structure criteria', () => {
  it('structure.frame: complete=false sem service board', () => {
    expect(buildServiceReadinessReport(makeGraph()).sections.structure.criteria.find(c => c.id === 'structure.frame')!.complete).toBe(false);
  });

  it('structure.frame: complete=true quando há whiteboard com layoutMode=service', () => {
    let g = makeGraph();
    g = withServiceBoard(g, 'board1');
    expect(buildServiceReadinessReport(g).sections.structure.criteria.find(c => c.id === 'structure.frame')!.complete).toBe(true);
  });

  it('frame.boardId aponta para o board do service frame', () => {
    let g = makeGraph();
    g = withServiceBoard(g, 'board1');
    expect(buildServiceReadinessReport(g).frame.boardId).toBe('board1');
  });

  it('frame.boardName é o nome do board', () => {
    let g = makeGraph();
    g = withServiceBoard(g, 'board1');
    expect(buildServiceReadinessReport(g).frame.boardName).toBe('Service Frame');
  });

  it('structure.stages: complete=false quando journey tem menos de 2 etapas', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1']);
    g = withStage(g, 's1', 'j1');
    g = withServiceBoard(g, 'board1', 'j1');
    expect(buildServiceReadinessReport(g).sections.structure.criteria.find(c => c.id === 'structure.stages')!.complete).toBe(false);
  });

  it('structure.stages: complete=true quando journey tem 2+ etapas', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1', 's2']);
    g = withStage(g, 's1', 'j1');
    g = withStage(g, 's2', 'j1');
    g = withServiceBoard(g, 'board1', 'j1');
    expect(buildServiceReadinessReport(g).sections.structure.criteria.find(c => c.id === 'structure.stages')!.complete).toBe(true);
  });

  it('frame.stageCount reflete as etapas da jornada', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1', 's2', 's3']);
    g = withStage(g, 's1', 'j1');
    g = withStage(g, 's2', 'j1');
    g = withStage(g, 's3', 'j1');
    g = withServiceBoard(g, 'board1', 'j1');
    expect(buildServiceReadinessReport(g).frame.stageCount).toBe(3);
  });

  it('structure.customer-actions: complete=true quando >=80% das etapas têm customerAction', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1', 's2', 's3', 's4', 's5']);
    g = withStage(g, 's1', 'j1', { customerAction: 'Ação 1' });
    g = withStage(g, 's2', 'j1', { customerAction: 'Ação 2' });
    g = withStage(g, 's3', 'j1', { customerAction: 'Ação 3' });
    g = withStage(g, 's4', 'j1', { customerAction: 'Ação 4' });
    g = withStage(g, 's5', 'j1', { customerAction: '' }); // 80% → 4/5
    g = withServiceBoard(g, 'board1', 'j1');
    expect(buildServiceReadinessReport(g).sections.structure.criteria.find(c => c.id === 'structure.customer-actions')!.complete).toBe(true);
  });

  it('structure.customer-actions: complete=false quando <80% das etapas têm customerAction', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1', 's2', 's3']);
    g = withStage(g, 's1', 'j1', { customerAction: 'Ação' });
    g = withStage(g, 's2', 'j1', { customerAction: '' });
    g = withStage(g, 's3', 'j1', { customerAction: '' });
    g = withServiceBoard(g, 'board1', 'j1');
    expect(buildServiceReadinessReport(g).sections.structure.criteria.find(c => c.id === 'structure.customer-actions')!.complete).toBe(false);
  });
});

// ─── Score e State ────────────────────────────────────────────────────────────

describe('buildServiceReadinessReport — score e state', () => {
  it('state="building" quando score>=50', () => {
    // Preencher contexto completo (5) + definição completa (6) = 11/17 ≈ 65%
    let g = makeGraph();
    g = withEntity(g, 'persona', 'per1');
    g = withEntity(g, 'need', 'n1');
    g = withStage(g, 's1', 'j1');
    g = withEntity(g, 'evidence', 'ev1');
    g = withValidatedProblem(g, 'prob1', 's1', ['ev1']);
    g = withFullDefinition(g);
    // Need traceability too; set with valid refs via definition
    g = updateServiceProjectDefinition(g, { personaIds: ['per1'], problemIds: ['prob1'], evidenceIds: ['ev1'] });
    const report = buildServiceReadinessReport(g);
    expect(report.score).toBeGreaterThanOrEqual(50);
    expect(report.state).toBe('building');
  });

  it('state="blocked" quando score<50', () => {
    expect(buildServiceReadinessReport(makeGraph()).state).toBe('blocked');
  });

  it('score = round(complete/total * 100)', () => {
    let g = makeGraph();
    g = withEntity(g, 'persona', 'per1');
    const report = buildServiceReadinessReport(g);
    expect(report.score).toBe(Math.round((report.complete / report.total) * 100));
  });
});

// ─── Sections ────────────────────────────────────────────────────────────────

describe('buildServiceReadinessReport — sections', () => {
  it('context section tem 5 critérios', () => {
    expect(buildServiceReadinessReport(makeGraph()).sections.context.criteria).toHaveLength(5);
  });

  it('definition section tem 6 critérios', () => {
    expect(buildServiceReadinessReport(makeGraph()).sections.definition.criteria).toHaveLength(6);
  });

  it('structure section tem 6 critérios', () => {
    expect(buildServiceReadinessReport(makeGraph()).sections.structure.criteria).toHaveLength(6);
  });

  it('section.score = round(complete/total * 100)', () => {
    let g = makeGraph();
    g = withEntity(g, 'persona', 'per1');
    const { context } = buildServiceReadinessReport(g).sections;
    expect(context.score).toBe(Math.round((context.complete / context.total) * 100));
  });

  it('context section label = "Contexto"', () => {
    expect(buildServiceReadinessReport(makeGraph()).sections.context.label).toBe('Contexto');
  });

  it('definition section label = "Definição"', () => {
    expect(buildServiceReadinessReport(makeGraph()).sections.definition.label).toBe('Definição');
  });

  it('structure section label = "Estrutura"', () => {
    expect(buildServiceReadinessReport(makeGraph()).sections.structure.label).toBe('Estrutura');
  });

  it('todos os critérios têm blocking=true', () => {
    const report = buildServiceReadinessReport(makeGraph());
    const all = [...report.sections.context.criteria, ...report.sections.definition.criteria, ...report.sections.structure.criteria];
    expect(all.every(c => c.blocking === true)).toBe(true);
  });
});

// ─── nextAction ───────────────────────────────────────────────────────────────

describe('buildServiceReadinessReport — nextAction', () => {
  it('nextAction aponta para context.persona quando não há personas', () => {
    expect(buildServiceReadinessReport(makeGraph()).nextAction?.id).toBe('context.persona');
  });

  it('nextAction avança para context.need-job quando persona existe', () => {
    let g = makeGraph();
    g = withEntity(g, 'persona', 'per1');
    expect(buildServiceReadinessReport(g).nextAction?.id).toBe('context.need-job');
  });
});

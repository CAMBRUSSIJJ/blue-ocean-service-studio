import { describe, it, expect } from 'vitest';
import type { ServiceFrameLayerKey, WhiteboardItem, WhiteboardView } from '../../domain/model';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';
import {
  SERVICE_FRAME_LAYERS,
  isServiceFrameLayer,
  defaultServiceFrameLayer,
  serviceFrameLayerForItem,
  serviceFrameStageForItem,
  placeItemInServiceFrame,
  buildServiceFrameCoverage,
} from '../service-frame';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

type FreeItemOpts = Partial<WhiteboardItem & { kind: 'free' }>;
function freeItem(overrides: FreeItemOpts = {}): WhiteboardItem {
  return {
    id: 'item-1',
    kind: 'free',
    shape: 'note',
    text: 'texto',
    x: 0, y: 0, width: 100, height: 60,
    ...overrides,
  } as WhiteboardItem;
}

type SmartItemOpts = { id?: string; objectKind: string; objectId: string } & Partial<WhiteboardItem>;
function smartItem(opts: SmartItemOpts): WhiteboardItem {
  return {
    id: opts.id ?? 'item-s1',
    kind: 'smart',
    objectKind: opts.objectKind as WhiteboardItem extends { kind: 'smart'; objectKind: infer K } ? K : never,
    objectId: opts.objectId,
    x: 0, y: 0, width: 100, height: 60,
    ...opts,
  } as WhiteboardItem;
}

function withStage(graph: ServiceGraph, stageId: string, journeyId = 'j1'): ServiceGraph {
  const stage = {
    id: stageId, journeyId, title: 'Etapa', customerAction: 'Ação do cliente',
    emotion: 'neutral' as const, touchpointIds: [], problemIds: [], opportunityIds: [],
  };
  return { ...graph, stages: { ...graph.stages, [stageId]: stage } };
}

function withJourney(graph: ServiceGraph, journeyId = 'j1', stageIds: string[] = []): ServiceGraph {
  const journey = { id: journeyId, serviceId: graph.service.id, name: 'Jornada', stageIds, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' };
  return { ...graph, journeys: { ...graph.journeys, [journeyId]: journey } };
}

function withBoard(graph: ServiceGraph, boardId: string, items: Record<string, WhiteboardItem> = {}, journeyId?: string): ServiceGraph {
  const board: WhiteboardView = { id: boardId, serviceId: graph.service.id, name: 'Quadro', items, edges: {}, journeyId };
  return { ...graph, views: { whiteboards: { ...graph.views.whiteboards, [boardId]: board } } };
}

// ── SERVICE_FRAME_LAYERS ──────────────────────────────────────────────────────

describe('SERVICE_FRAME_LAYERS', () => {
  it('contém exatamente 6 camadas', () => {
    expect(SERVICE_FRAME_LAYERS).toHaveLength(6);
  });

  it('contém as 6 chaves esperadas', () => {
    const keys = SERVICE_FRAME_LAYERS.map(l => l.key);
    expect(keys).toContain('evidence');
    expect(keys).toContain('customer');
    expect(keys).toContain('frontstage');
    expect(keys).toContain('backstage');
    expect(keys).toContain('process');
    expect(keys).toContain('enablement');
  });

  it('cada layer tem label e question não vazios', () => {
    for (const layer of SERVICE_FRAME_LAYERS) {
      expect(layer.label.length).toBeGreaterThan(0);
      expect(layer.question.length).toBeGreaterThan(0);
    }
  });
});

// ── isServiceFrameLayer ───────────────────────────────────────────────────────

describe('isServiceFrameLayer', () => {
  const validLayers: ServiceFrameLayerKey[] = ['evidence', 'customer', 'frontstage', 'backstage', 'process', 'enablement'];

  it.each(validLayers)('retorna true para "%s"', (key) => {
    expect(isServiceFrameLayer(key)).toBe(true);
  });

  it('retorna false para string não mapeada', () => {
    expect(isServiceFrameLayer('unknown-layer')).toBe(false);
  });

  it('retorna false para undefined', () => {
    expect(isServiceFrameLayer(undefined)).toBe(false);
  });

  it('retorna false para null', () => {
    expect(isServiceFrameLayer(null)).toBe(false);
  });

  it('retorna false para número', () => {
    expect(isServiceFrameLayer(42)).toBe(false);
  });
});

// ── defaultServiceFrameLayer ──────────────────────────────────────────────────

describe('defaultServiceFrameLayer', () => {
  it('retorna "customer" para kind undefined', () => {
    expect(defaultServiceFrameLayer(undefined)).toBe('customer');
  });

  it('retorna "customer" para kind não mapeado', () => {
    expect(defaultServiceFrameLayer('nada')).toBe('customer');
  });

  it('mapeia "persona" → "customer"', () => {
    expect(defaultServiceFrameLayer('persona')).toBe('customer');
  });

  it('mapeia "need" → "customer"', () => {
    expect(defaultServiceFrameLayer('need')).toBe('customer');
  });

  it('mapeia "job" → "customer"', () => {
    expect(defaultServiceFrameLayer('job')).toBe('customer');
  });

  it('mapeia "pain" → "customer"', () => {
    expect(defaultServiceFrameLayer('pain')).toBe('customer');
  });

  it('mapeia "problem" → "customer"', () => {
    expect(defaultServiceFrameLayer('problem')).toBe('customer');
  });

  it('mapeia "evidence" → "evidence"', () => {
    expect(defaultServiceFrameLayer('evidence')).toBe('evidence');
  });

  it('mapeia "touchpoint" → "frontstage"', () => {
    expect(defaultServiceFrameLayer('touchpoint')).toBe('frontstage');
  });

  it('mapeia "channel" → "frontstage"', () => {
    expect(defaultServiceFrameLayer('channel')).toBe('frontstage');
  });

  it('mapeia "backstage" → "backstage"', () => {
    expect(defaultServiceFrameLayer('backstage')).toBe('backstage');
  });

  it('mapeia "process" → "process"', () => {
    expect(defaultServiceFrameLayer('process')).toBe('process');
  });

  it('mapeia "task" → "process"', () => {
    expect(defaultServiceFrameLayer('task')).toBe('process');
  });

  it('mapeia "opportunity" → "process"', () => {
    expect(defaultServiceFrameLayer('opportunity')).toBe('process');
  });

  it('mapeia "system" → "enablement"', () => {
    expect(defaultServiceFrameLayer('system')).toBe('enablement');
  });

  it('mapeia "metric" → "enablement"', () => {
    expect(defaultServiceFrameLayer('metric')).toBe('enablement');
  });

  it('mapeia "resource" → "enablement"', () => {
    expect(defaultServiceFrameLayer('resource')).toBe('enablement');
  });
});

// ── serviceFrameLayerForItem ──────────────────────────────────────────────────

describe('serviceFrameLayerForItem', () => {
  it('free item sem serviceLayer usa semantic → "customer" para kind não mapeado', () => {
    expect(serviceFrameLayerForItem(freeItem({ semantic: undefined }))).toBe('customer');
  });

  it('free item com serviceLayer válida usa a serviceLayer', () => {
    expect(serviceFrameLayerForItem(freeItem({ serviceLayer: 'backstage' }))).toBe('backstage');
  });

  it('free item com serviceLayer inválida cai para defaultServiceFrameLayer(semantic)', () => {
    // serviceLayer inválido → isServiceFrameLayer retorna false → usa semantic
    expect(serviceFrameLayerForItem(freeItem({ serviceLayer: 'invalid' as ServiceFrameLayerKey, semantic: 'task' as never }))).toBe('process');
  });

  it('smart item de evidence sem serviceLayer → "evidence"', () => {
    expect(serviceFrameLayerForItem(smartItem({ objectKind: 'evidence', objectId: 'e1' }))).toBe('evidence');
  });

  it('smart item de evidence com serviceLayer "customer" → "evidence"', () => {
    expect(serviceFrameLayerForItem(smartItem({ objectKind: 'evidence', objectId: 'e1', serviceLayer: 'customer' }))).toBe('evidence');
  });

  it('smart item de evidence com serviceLayer "frontstage" → "frontstage" (não aplica override)', () => {
    // serviceLayer é "frontstage" (válida e não "customer") → retorna a própria serviceLayer
    expect(serviceFrameLayerForItem(smartItem({ objectKind: 'evidence', objectId: 'e1', serviceLayer: 'frontstage' }))).toBe('frontstage');
  });

  it('smart item com serviceLayer válida usa a serviceLayer', () => {
    expect(serviceFrameLayerForItem(smartItem({ objectKind: 'persona', objectId: 'p1', serviceLayer: 'backstage' }))).toBe('backstage');
  });

  it('smart item sem serviceLayer usa defaultServiceFrameLayer(objectKind)', () => {
    expect(serviceFrameLayerForItem(smartItem({ objectKind: 'channel', objectId: 'c1' }))).toBe('frontstage');
  });

  it('smart item objectKind não mapeado → "customer"', () => {
    expect(serviceFrameLayerForItem(smartItem({ objectKind: 'unknown', objectId: 'u1' }))).toBe('customer');
  });
});

// ── serviceFrameStageForItem ──────────────────────────────────────────────────

describe('serviceFrameStageForItem', () => {
  it('retorna null quando não há stageId associado', () => {
    const graph = makeGraph();
    expect(serviceFrameStageForItem(freeItem(), graph)).toBeNull();
  });

  it('retorna serviceStageId quando stage existe no graph', () => {
    const graph = withStage(makeGraph(), 's1');
    expect(serviceFrameStageForItem(freeItem({ serviceStageId: 's1' }), graph)).toBe('s1');
  });

  it('retorna null para serviceStageId que não existe no graph', () => {
    const graph = makeGraph();
    expect(serviceFrameStageForItem(freeItem({ serviceStageId: 'nao-existe' }), graph)).toBeNull();
  });

  it('retorna blueprintStageId quando serviceStageId ausente e stage existe', () => {
    const graph = withStage(makeGraph(), 's2');
    expect(serviceFrameStageForItem(freeItem({ blueprintStageId: 's2' }), graph)).toBe('s2');
  });

  it('smart item: retorna stageId da entidade quando stage existe', () => {
    const graph = withStage(makeGraph(), 's3');
    const graphWithEntity = { ...graph, entities: { myKind: { e1: { id: 'e1', stageId: 's3' } } } } as unknown as ServiceGraph;
    const item = smartItem({ objectKind: 'myKind', objectId: 'e1' });
    expect(serviceFrameStageForItem(item, graphWithEntity)).toBe('s3');
  });

  it('smart item: problema → retorna stageId do problems[objectId]', () => {
    const graph = withStage(makeGraph(), 's4');
    const graphWithProblem = { ...graph, problems: { p1: { id: 'p1', stageId: 's4' } } } as unknown as ServiceGraph;
    const item = smartItem({ objectKind: 'problem', objectId: 'p1' });
    expect(serviceFrameStageForItem(item, graphWithProblem)).toBe('s4');
  });

  it('smart item: opportunity → retorna stageId do opportunities[objectId]', () => {
    const graph = withStage(makeGraph(), 's5');
    const graphWithOpp = { ...graph, opportunities: { o1: { id: 'o1', stageId: 's5' } } } as unknown as ServiceGraph;
    const item = smartItem({ objectKind: 'opportunity', objectId: 'o1' });
    expect(serviceFrameStageForItem(item, graphWithOpp)).toBe('s5');
  });

  it('smart item de problema retorna stageId do problems[objectId] mesmo que o stage não exista no graph', () => {
    // A função retorna o stageId diretamente sem validar se o stage existe em graph.stages
    const graph = makeGraph();
    const graphWithProblem = { ...graph, problems: { p1: { id: 'p1', stageId: 'nao-existe' } } } as unknown as ServiceGraph;
    const item = smartItem({ objectKind: 'problem', objectId: 'p1' });
    expect(serviceFrameStageForItem(item, graphWithProblem)).toBe('nao-existe');
  });
});

// ── placeItemInServiceFrame ───────────────────────────────────────────────────

describe('placeItemInServiceFrame', () => {
  it('retorna novo objeto com serviceStageId e serviceLayer definidos', () => {
    const item = freeItem({ id: 'item-x' });
    const result = placeItemInServiceFrame(item, 's1', 'frontstage');
    expect(result.serviceStageId).toBe('s1');
    expect(result.serviceLayer).toBe('frontstage');
  });

  it('não muta o objeto original', () => {
    const item = freeItem({ id: 'item-x', serviceStageId: 's0', serviceLayer: 'customer' });
    placeItemInServiceFrame(item, 's1', 'backstage');
    expect((item as WhiteboardItem).serviceStageId).toBe('s0');
    expect((item as WhiteboardItem).serviceLayer).toBe('customer');
  });

  it('preserva as outras propriedades do item', () => {
    const item = freeItem({ id: 'item-x', text: 'meu texto' });
    const result = placeItemInServiceFrame(item, 's1', 'process');
    expect((result as typeof item).text).toBe('meu texto');
    expect(result.id).toBe('item-x');
  });
});

// ── buildServiceFrameCoverage ─────────────────────────────────────────────────

describe('buildServiceFrameCoverage', () => {
  it('retorna zeros quando board não existe', () => {
    const graph = makeGraph();
    const result = buildServiceFrameCoverage(graph, 'nao-existe');
    expect(result).toEqual({ complete: 0, total: 0, percent: 0, stages: [] });
  });

  it('retorna zeros quando board não tem journey associada', () => {
    const graph = withBoard(makeGraph(), 'b1');
    const result = buildServiceFrameCoverage(graph, 'b1');
    expect(result).toEqual({ complete: 0, total: 0, percent: 0, stages: [] });
  });

  it('calcula cobertura para stage com customerAction preenchido', () => {
    let graph = makeGraph();
    graph = withStage(graph, 's1');
    graph = withJourney(graph, 'j1', ['s1']);
    graph = withBoard(graph, 'b1', {}, 'j1');

    const result = buildServiceFrameCoverage(graph, 'b1');
    expect(result.stages).toHaveLength(1);
    // "customer" presente via customerAction, 5 missing
    const stage = result.stages[0];
    expect(stage.stageId).toBe('s1');
    expect(stage.complete).toBe(1);
    expect(stage.total).toBe(SERVICE_FRAME_LAYERS.length);
    expect(stage.missing).not.toContain('customer');
    expect(stage.missing).toContain('frontstage');
  });

  it('stage sem customerAction tem complete=0 sem itens', () => {
    let graph = makeGraph();
    const stage = { id: 's1', journeyId: 'j1', title: 'Etapa', customerAction: '', emotion: 'neutral' as const, touchpointIds: [], problemIds: [], opportunityIds: [] };
    graph = { ...graph, stages: { s1: stage } };
    graph = withJourney(graph, 'j1', ['s1']);
    graph = withBoard(graph, 'b1', {}, 'j1');

    const result = buildServiceFrameCoverage(graph, 'b1');
    expect(result.stages[0].complete).toBe(0);
  });

  it('free item com texto e serviceStageId adiciona camada à cobertura', () => {
    let graph = makeGraph();
    graph = withStage(graph, 's1');
    graph = withJourney(graph, 'j1', ['s1']);
    const item = freeItem({ id: 'i1', text: 'Backstage action', serviceStageId: 's1', serviceLayer: 'backstage' });
    graph = withBoard(graph, 'b1', { i1: item }, 'j1');

    const result = buildServiceFrameCoverage(graph, 'b1');
    expect(result.stages[0].missing).not.toContain('backstage');
  });

  it('free item sem texto não adiciona camada', () => {
    let graph = makeGraph();
    const stage = { id: 's1', journeyId: 'j1', title: 'Etapa', customerAction: '', emotion: 'neutral' as const, touchpointIds: [], problemIds: [], opportunityIds: [] };
    graph = { ...graph, stages: { s1: stage } };
    graph = withJourney(graph, 'j1', ['s1']);
    const item = freeItem({ id: 'i1', text: '', serviceStageId: 's1', serviceLayer: 'backstage' });
    graph = withBoard(graph, 'b1', { i1: item }, 'j1');

    const result = buildServiceFrameCoverage(graph, 'b1');
    expect(result.stages[0].missing).toContain('backstage');
  });

  it('smart item de stage é ignorado na cobertura', () => {
    let graph = makeGraph();
    graph = withStage(graph, 's1');
    graph = withJourney(graph, 'j1', ['s1']);
    const item = smartItem({ id: 'i1', objectKind: 'stage', objectId: 's1', serviceStageId: 's1' });
    graph = withBoard(graph, 'b1', { i1: item }, 'j1');

    const result = buildServiceFrameCoverage(graph, 'b1');
    // stage item ignorado — customer presente por customerAction
    expect(result.stages[0].complete).toBe(1); // customerAction
  });

  it('smart item com título na entity adiciona camada', () => {
    let graph = makeGraph();
    graph = withStage(graph, 's1');
    graph = withJourney(graph, 'j1', ['s1']);
    const item = smartItem({ id: 'i1', objectKind: 'channel', objectId: 'ch1', serviceStageId: 's1' });
    const graphWithEntity = { ...graph, entities: { channel: { ch1: { id: 'ch1', title: 'Canal Digital' } } } } as unknown as ServiceGraph;
    const withBoardGraph = withBoard(graphWithEntity, 'b1', { i1: item }, 'j1');

    const result = buildServiceFrameCoverage(withBoardGraph, 'b1');
    expect(result.stages[0].missing).not.toContain('frontstage');
  });

  it('percent é calculado corretamente (5/6 camadas via free items + 1 via customerAction)', () => {
    let graph = makeGraph();
    // customerAction preenchido → cobre "customer"
    graph = withStage(graph, 's1');
    graph = withJourney(graph, 'j1', ['s1']);
    // Preenche 4 camadas via itens free (evidence NÃO é coberta por free items — requer smart com evidencePurpose)
    const items: Record<string, WhiteboardItem> = {};
    const layers: ServiceFrameLayerKey[] = ['frontstage', 'backstage', 'process', 'enablement'];
    layers.forEach((layer, i) => {
      const id = `i${i}`;
      items[id] = freeItem({ id, text: `Texto ${layer}`, serviceStageId: 's1', serviceLayer: layer });
    });
    graph = withBoard(graph, 'b1', items, 'j1');

    const result = buildServiceFrameCoverage(graph, 'b1');
    // customer (customerAction) + frontstage + backstage + process + enablement = 5/6 = 83%
    expect(result.stages[0].complete).toBe(5);
    expect(result.stages[0].percent).toBe(83);
    expect(result.stages[0].missing).toContain('evidence');
  });

  it('usa primeira journey do serviço quando board não tem journeyId explícito', () => {
    let graph = makeGraph();
    graph = withStage(graph, 's1');
    // Adiciona journeyId à lista do serviço
    graph = { ...graph, service: { ...graph.service, journeyIds: ['j1'] } };
    graph = withJourney(graph, 'j1', ['s1']);
    graph = withBoard(graph, 'b1', {}, undefined); // sem journeyId explícito no board

    const result = buildServiceFrameCoverage(graph, 'b1');
    expect(result.stages).toHaveLength(1);
  });
});

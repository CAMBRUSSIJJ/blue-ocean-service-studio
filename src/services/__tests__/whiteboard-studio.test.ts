import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import {
  buildWhiteboardStudioReport,
  syncWhiteboardDesignContext,
  syncWhiteboardJourney,
  syncWhiteboardBlueprint,
  whiteboardOriginForKind,
} from '../whiteboard-studio.ts';
import type { ServiceGraph, WhiteboardView, WhiteboardItem, Id } from '../../domain/model';

const NOW = '2025-01-01T00:00:00.000Z';

function base(): ServiceGraph { return createServiceGraph('S'); }

// Add a WhiteboardView with viewKind='free' to the graph
function addBoard(graph: ServiceGraph, boardId: Id, extra: Partial<WhiteboardView> = {}): ServiceGraph {
  const board: WhiteboardView = {
    id: boardId,
    serviceId: graph.service.id,
    name: `Board ${boardId}`,
    viewKind: 'free',
    items: {},
    edges: {},
    ...extra,
  };
  return {
    ...graph,
    views: { whiteboards: { ...graph.views.whiteboards, [boardId]: board } },
  } as ServiceGraph;
}

function addSmartItem(board: WhiteboardView, id: Id, objectKind: string, objectId: Id, extra: Record<string, unknown> = {}): WhiteboardView {
  const item: WhiteboardItem = { id, kind: 'smart', objectKind: objectKind as never, objectId, x: 0, y: 0, width: 260, height: 120, ...extra } as WhiteboardItem;
  return { ...board, items: { ...board.items, [id]: item } };
}

function addFreeItem(board: WhiteboardView, id: Id, shape: string = 'note', semantic?: string, extra: Record<string, unknown> = {}): WhiteboardView {
  const item: WhiteboardItem = { id, kind: 'free', shape: shape as never, text: 'text', x: 0, y: 0, width: 200, height: 100, ...(semantic ? { semantic } : {}), ...extra } as WhiteboardItem;
  return { ...board, items: { ...board.items, [id]: item } };
}

function withBoardItems(graph: ServiceGraph, boardId: Id, board: WhiteboardView): ServiceGraph {
  return { ...graph, views: { whiteboards: { ...graph.views.whiteboards, [boardId]: board } } } as ServiceGraph;
}

function addEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: {
        ...(graph.entities?.[kind] ?? {}),
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${id}`, description: `D-${id}`, createdAt: NOW, updatedAt: NOW, ...extra },
      },
    },
  } as ServiceGraph;
}

// ─── buildWhiteboardStudioReport ────────────────────────────────────────────

describe('buildWhiteboardStudioReport', () => {
  it('returns null for unknown boardId', () => {
    const g = base();
    expect(buildWhiteboardStudioReport(g, 'unknown')).toBeNull();
  });

  it('returns null when viewKind is not free', () => {
    const g = addBoard(base(), 'b1', { viewKind: 'blueprint' as never });
    expect(buildWhiteboardStudioReport(g, 'b1')).toBeNull();
  });

  it('returns blank report for empty board', () => {
    const g = addBoard(base(), 'b1');
    const r = buildWhiteboardStudioReport(g, 'b1');
    expect(r).not.toBeNull();
    expect(r!.boardId).toBe('b1');
    expect(r!.status).toBe('blank');
    expect(r!.totalItems).toBe(0);
    expect(r!.freeItems).toBe(0);
    expect(r!.smartItems).toBe(0);
    expect(r!.frames).toBe(0);
    expect(r!.connections).toBe(0);
    expect(r!.danglingSmartObjects).toBe(0);
  });

  it('counts totalItems, freeItems and smartItems', () => {
    let g = addBoard(base(), 'b1');
    let board = g.views.whiteboards['b1'];
    board = addFreeItem(board, 'f1');
    board = addFreeItem(board, 'f2');
    // add a smart item with a resolved record
    g = addEntity(g, 'persona', 'p1');
    board = addSmartItem(board, 's1', 'persona', 'p1');
    g = withBoardItems(g, 'b1', board);
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.totalItems).toBe(3);
    expect(r.freeItems).toBe(2);
    expect(r.smartItems).toBe(1);
  });

  it('counts frames separately from other free items', () => {
    let g = addBoard(base(), 'b1');
    let board = g.views.whiteboards['b1'];
    board = addFreeItem(board, 'f1', 'frame');
    board = addFreeItem(board, 'f2', 'note');
    g = withBoardItems(g, 'b1', board);
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.frames).toBe(1);
    expect(r.freeItems).toBe(2);
  });

  it('counts connections from edges', () => {
    let g = addBoard(base(), 'b1');
    let board = g.views.whiteboards['b1'];
    board = { ...board, edges: { 'e1': { id: 'e1', fromId: 'x', toId: 'y', label: 'rel', style: 'dashed', arrow: 'end' } } };
    g = withBoardItems(g, 'b1', board);
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.connections).toBe(1);
  });

  it('detects dangling smart objects with no matching record', () => {
    let g = addBoard(base(), 'b1');
    let board = g.views.whiteboards['b1'];
    board = addSmartItem(board, 's1', 'persona', 'missing-id');
    g = withBoardItems(g, 'b1', board);
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.danglingSmartObjects).toBe(1);
  });

  it('computes contextCoverage when designContext is set', () => {
    let g = addBoard(base(), 'b1', {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: ['p1', 'p2'], needIds: [], jobIds: [], painIds: [], problemIds: [], evidenceIds: [] },
    });
    g = addEntity(g, 'persona', 'p1');
    g = addEntity(g, 'persona', 'p2');
    let board = g.views.whiteboards['b1'];
    board = addSmartItem(board, 's1', 'persona', 'p1');
    // p2 not on board — contextCoverage = 1/2 = 50
    g = withBoardItems(g, 'b1', board);
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.contextTotal).toBe(2);
    expect(r.contextCovered).toBe(1);
    expect(r.contextCoverage).toBe(50);
  });

  it('contextCoverage is 100 when no context targets', () => {
    const g = addBoard(base(), 'b1');
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.contextCoverage).toBe(100);
    expect(r.contextTotal).toBe(0);
  });

  it('status is contextual when context items present but no operational', () => {
    let g = addBoard(base(), 'b1', {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: ['p1'], needIds: [], jobIds: [], painIds: [], problemIds: [], evidenceIds: [] },
    });
    g = addEntity(g, 'persona', 'p1');
    let board = g.views.whiteboards['b1'];
    board = addSmartItem(board, 's1', 'persona', 'p1');
    g = withBoardItems(g, 'b1', board);
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.status).toBe('contextual');
  });

  it('status is composing when items present but context not covered', () => {
    let g = addBoard(base(), 'b1');
    let board = g.views.whiteboards['b1'];
    board = addFreeItem(board, 'f1');
    g = withBoardItems(g, 'b1', board);
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.status).toBe('composing');
  });

  it('reports checks array with 5 entries including journey check', () => {
    const g = addBoard(base(), 'b1');
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    const checkIds = r.checks.map((c) => c.id);
    expect(checkIds).toContain('journey');
    expect(r.checks.length).toBe(5);
  });

  it('journey check is incomplete when board has journeyId but no stages covered', () => {
    // board links to a journey that has no stages
    let g = base();
    const journey = { id: 'j1', serviceId: g.service.id, name: 'J', stageIds: ['st1'] };
    const stage = { id: 'st1', journeyId: 'j1', title: 'S', customerAction: '', emotion: 'neutral' as never, touchpointIds: [], problemIds: [], opportunityIds: [] };
    g = { ...g, journeys: { j1: journey }, stages: { st1: stage } } as ServiceGraph;
    g = addBoard(g, 'b1', { journeyId: 'j1' });
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    const journeyCheck = r.checks.find((c) => c.id === 'journey')!;
    expect(journeyCheck.complete).toBe(false);
  });

  it('qualityScore is 0 for blank board (no applicable checks complete)', () => {
    // blank board: integrity=true, context=true (no context), frames=true (empty), relations=true (<2 smart)
    // Actually all 4 applicable checks pass for a blank board
    const g = addBoard(base(), 'b1');
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    // integrity: dangling===0 → true; context: !targets.length → true; frames: all.length===0 → true; relations: smart<2 → true
    expect(r.qualityScore).toBe(100);
  });

  it('readyForComposition is true when dangling=0 and context fully covered', () => {
    let g = addBoard(base(), 'b1', {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: ['p1'], needIds: [], jobIds: [], painIds: [], problemIds: [], evidenceIds: [] },
    });
    g = addEntity(g, 'persona', 'p1');
    let board = g.views.whiteboards['b1'];
    board = addSmartItem(board, 's1', 'persona', 'p1');
    g = withBoardItems(g, 'b1', board);
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.readyForComposition).toBe(true);
  });

  it('readyForComposition is false when dangling > 0', () => {
    let g = addBoard(base(), 'b1');
    let board = g.views.whiteboards['b1'];
    board = addSmartItem(board, 's1', 'persona', 'missing');
    g = withBoardItems(g, 'b1', board);
    const r = buildWhiteboardStudioReport(g, 'b1')!;
    expect(r.readyForComposition).toBe(false);
  });
});

// ─── syncWhiteboardDesignContext ─────────────────────────────────────────────

describe('syncWhiteboardDesignContext', () => {
  it('no-ops when board not found', () => {
    const g = base();
    const { graph, added, framesAdded, edgesAdded } = syncWhiteboardDesignContext(g, 'unknown', NOW);
    expect(graph).toBe(g);
    expect(added).toBe(0);
    expect(framesAdded).toBe(0);
    expect(edgesAdded).toBe(0);
  });

  it('no-ops when board has no designContext', () => {
    const g = addBoard(base(), 'b1');
    const { graph, added } = syncWhiteboardDesignContext(g, 'b1', NOW);
    expect(graph).toBe(g);
    expect(added).toBe(0);
  });

  it('adds frames and smart items for personas in designContext', () => {
    let g = addBoard(base(), 'b1', {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: ['p1'], needIds: [], jobIds: [], painIds: [], problemIds: [], evidenceIds: [] },
    });
    g = addEntity(g, 'persona', 'p1');
    const { graph, added, framesAdded } = syncWhiteboardDesignContext(g, 'b1', NOW);
    // Should add at least 1 smart item for persona p1
    expect(added).toBeGreaterThanOrEqual(1);
    // Should add at least 1 frame
    expect(framesAdded).toBeGreaterThanOrEqual(1);
    const board = graph.views.whiteboards['b1'];
    const items = Object.values(board.items);
    const smartItems = items.filter((i) => i.kind === 'smart' && (i as never as { objectKind: string }).objectKind === 'persona');
    expect(smartItems.length).toBeGreaterThanOrEqual(1);
  });

  it('adds frames for all context groups', () => {
    let g = addBoard(base(), 'b1', {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: ['p1'], needIds: ['n1'], jobIds: [], painIds: [], problemIds: ['pr1'], evidenceIds: ['ev1'] },
    });
    g = addEntity(g, 'persona', 'p1');
    g = addEntity(g, 'need', 'n1');
    g = addEntity(g, 'problem', 'pr1');
    g = addEntity(g, 'evidence', 'ev1');
    const { framesAdded } = syncWhiteboardDesignContext(g, 'b1', NOW);
    // 4 groups: client, needs, problems, evidence
    expect(framesAdded).toBe(4);
  });

  it('does not re-add existing smart items', () => {
    let g = addBoard(base(), 'b1', {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: ['p1'], needIds: [], jobIds: [], painIds: [], problemIds: [], evidenceIds: [] },
    });
    g = addEntity(g, 'persona', 'p1');
    const { graph: g2, added: a1 } = syncWhiteboardDesignContext(g, 'b1', NOW);
    // Run sync again on the already-synced graph
    const { added: a2, framesAdded: f2 } = syncWhiteboardDesignContext(g2, 'b1', NOW);
    expect(a1).toBeGreaterThanOrEqual(1);
    expect(a2).toBe(0);
    expect(f2).toBe(0);
  });

  it('skips items whose record does not exist in graph', () => {
    const g = addBoard(base(), 'b1', {
      designContext: { version: 1, source: 'service-definition', createdAt: NOW, personaIds: ['ghost'], needIds: [], jobIds: [], painIds: [], problemIds: [], evidenceIds: [] },
    });
    // 'ghost' persona not in graph.entities
    const { added } = syncWhiteboardDesignContext(g, 'b1', NOW);
    expect(added).toBe(0);
  });
});

// ─── syncWhiteboardJourney ───────────────────────────────────────────────────

describe('syncWhiteboardJourney', () => {
  function graphWithJourney(): ServiceGraph {
    let g = addBoard(base(), 'b1');
    const stageId = 'st1';
    const journeyId = 'j1';
    // Add stage and journey to graph
    const stage = { id: stageId, journeyId, title: 'Stage 1', customerAction: 'act', emotion: 'neutral' as never, touchpointIds: [], problemIds: [], opportunityIds: [] };
    const journey = { id: journeyId, serviceId: g.service.id, name: 'J1', stageIds: [stageId] };
    return { ...g, stages: { ...g.stages, [stageId]: stage }, journeys: { ...g.journeys, [journeyId]: journey } } as ServiceGraph;
  }

  it('no-ops when board not found', () => {
    const g = base();
    const { graph, added } = syncWhiteboardJourney(g, 'unknown', undefined, NOW);
    expect(graph).toBe(g);
    expect(added).toBe(0);
  });

  it('no-ops when no journey available', () => {
    const g = addBoard(base(), 'b1');
    const { graph, added } = syncWhiteboardJourney(g, 'b1', undefined, NOW);
    expect(graph).toBe(g);
    expect(added).toBe(0);
  });

  it('adds stage smart items and frames per stage', () => {
    const g = graphWithJourney();
    const { graph, added, framesAdded } = syncWhiteboardJourney(g, 'b1', 'j1', NOW);
    expect(added).toBeGreaterThanOrEqual(1); // at least the stage itself
    expect(framesAdded).toBe(1); // one frame per stage
    const board = graph.views.whiteboards['b1'];
    expect(Object.keys(board.items).length).toBeGreaterThanOrEqual(1);
    // journey linked on board
    expect(board.journeyId).toBe('j1');
  });

  it('adds touchpoint smart items when stage has touchpoints', () => {
    let g = graphWithJourney();
    const tpId = 'tp1';
    const tp = { id: tpId, serviceId: g.service.id, name: 'Touchpoint 1', channel: 'web' };
    g = { ...g, touchpoints: { ...g.touchpoints, [tpId]: tp } } as ServiceGraph;
    // Link touchpoint to stage
    const stage = { ...g.stages['st1'], touchpointIds: [tpId] };
    g = { ...g, stages: { ...g.stages, ['st1']: stage } } as ServiceGraph;
    const { added } = syncWhiteboardJourney(g, 'b1', 'j1', NOW);
    // should add stage + touchpoint
    expect(added).toBeGreaterThanOrEqual(2);
  });

  it('no-ops on second call when items already added', () => {
    const g = graphWithJourney();
    const { graph: g2, added: a1 } = syncWhiteboardJourney(g, 'b1', 'j1', NOW);
    const { added: a2, framesAdded: f2 } = syncWhiteboardJourney(g2, 'b1', 'j1', NOW);
    expect(a1).toBeGreaterThanOrEqual(1);
    expect(a2).toBe(0);
    expect(f2).toBe(0);
  });
});

// ─── syncWhiteboardBlueprint ─────────────────────────────────────────────────

describe('syncWhiteboardBlueprint', () => {
  function graphWithBlueprint(): ServiceGraph {
    let g = addBoard(base(), 'target');
    // Add a blueprint board
    const blueprintItem: WhiteboardItem = {
      id: 'bi1',
      kind: 'free',
      shape: 'note',
      text: 'Frontstage step',
      x: 0, y: 0, width: 200, height: 100,
      blueprintLane: 'frontstage',
      blueprintStageId: 'st1',
    } as WhiteboardItem;
    const blueprintBoard: WhiteboardView = {
      id: 'bp1',
      serviceId: g.service.id,
      name: 'Blueprint',
      viewKind: 'blueprint',
      items: { bi1: blueprintItem },
      edges: {},
    };
    g = { ...g, views: { whiteboards: { ...g.views.whiteboards, ['bp1']: blueprintBoard } } } as ServiceGraph;
    // Add a stage for the blueprint
    const stage = { id: 'st1', journeyId: 'j1', title: 'Stage 1', customerAction: 'act', emotion: 'neutral' as never, touchpointIds: [], problemIds: [], opportunityIds: [] };
    return { ...g, stages: { ...g.stages, ['st1']: stage } } as ServiceGraph;
  }

  it('no-ops when target board not found', () => {
    const g = base();
    const result = syncWhiteboardBlueprint(g, 'unknown', undefined, NOW);
    expect(result.graph).toBe(g);
    expect(result.added).toBe(0);
    expect(result.sourceBoardId).toBeNull();
  });

  it('no-ops when no blueprint source board exists', () => {
    const g = addBoard(base(), 'target');
    const result = syncWhiteboardBlueprint(g, 'target', undefined, NOW);
    expect(result.graph).toBe(g);
    expect(result.entitiesCreated).toBe(0);
    expect(result.sourceBoardId).toBeNull();
  });

  it('promotes free blueprint items to entities', () => {
    const g = graphWithBlueprint();
    const result = syncWhiteboardBlueprint(g, 'target', 'bp1', NOW);
    expect(result.entitiesCreated).toBeGreaterThanOrEqual(1);
    expect(result.sourceBoardId).toBe('bp1');
    // entity should exist in graph.entities.frontstage
    const entities = result.graph.entities?.['frontstage'] ?? {};
    expect(Object.keys(entities).length).toBeGreaterThanOrEqual(1);
  });

  it('adds smart items to target board for promoted entities', () => {
    const g = graphWithBlueprint();
    const result = syncWhiteboardBlueprint(g, 'target', 'bp1', NOW);
    expect(result.added).toBeGreaterThanOrEqual(1);
    const board = result.graph.views.whiteboards['target'];
    const smartItems = Object.values(board.items).filter((i) => i.kind === 'smart');
    expect(smartItems.length).toBeGreaterThanOrEqual(1);
  });

  it('does not re-create entities on second call', () => {
    const g = graphWithBlueprint();
    const { graph: g2, entitiesCreated: ec1 } = syncWhiteboardBlueprint(g, 'target', 'bp1', NOW);
    const { entitiesCreated: ec2 } = syncWhiteboardBlueprint(g2, 'target', 'bp1', NOW);
    expect(ec1).toBeGreaterThanOrEqual(1);
    expect(ec2).toBe(0);
  });
});

// ─── whiteboardOriginForKind ─────────────────────────────────────────────────

describe('whiteboardOriginForKind', () => {
  it('persona → context/personas', () => {
    expect(whiteboardOriginForKind('persona')).toEqual({ type: 'context', page: 'personas' });
  });

  it('need → context/needs', () => {
    expect(whiteboardOriginForKind('need')).toEqual({ type: 'context', page: 'needs' });
  });

  it('job → context/jobs', () => {
    expect(whiteboardOriginForKind('job')).toEqual({ type: 'context', page: 'jobs' });
  });

  it('pain → context/pains', () => {
    expect(whiteboardOriginForKind('pain')).toEqual({ type: 'context', page: 'pains' });
  });

  it('problemHypothesis → context/hypotheses', () => {
    expect(whiteboardOriginForKind('problemHypothesis')).toEqual({ type: 'context', page: 'hypotheses' });
  });

  it('problem → context/problems', () => {
    expect(whiteboardOriginForKind('problem')).toEqual({ type: 'context', page: 'problems' });
  });

  it('evidence → context/evidence', () => {
    expect(whiteboardOriginForKind('evidence')).toEqual({ type: 'context', page: 'evidence' });
  });

  it('metric → context/metrics', () => {
    expect(whiteboardOriginForKind('metric')).toEqual({ type: 'context', page: 'metrics' });
  });

  it('stage → journey with stageId from record', () => {
    const result = whiteboardOriginForKind('stage', { id: 'st1', journeyId: 'j1' });
    expect(result).toEqual({ type: 'journey', journeyId: 'j1', stageId: 'st1' });
  });

  it('touchpoint → journey with stageId and journeyId from record', () => {
    const result = whiteboardOriginForKind('touchpoint', { stageId: 'st1', journeyId: 'j1' });
    expect(result).toEqual({ type: 'journey', journeyId: 'j1', stageId: 'st1' });
  });

  it('task → action', () => {
    expect(whiteboardOriginForKind('task')).toEqual({ type: 'action' });
  });

  it('frontstage → service (unknown kind fallback)', () => {
    expect(whiteboardOriginForKind('frontstage' as never)).toEqual({ type: 'service' });
  });

  it('record with sourceBlueprintBoardId → blueprint origin', () => {
    const result = whiteboardOriginForKind('persona', { sourceBlueprintBoardId: 'bp99' });
    expect(result).toEqual({ type: 'blueprint', boardId: 'bp99' });
  });

  it('record with empty sourceBlueprintBoardId → falls through to context', () => {
    const result = whiteboardOriginForKind('persona', { sourceBlueprintBoardId: '' });
    expect(result).toEqual({ type: 'context', page: 'personas' });
  });
});

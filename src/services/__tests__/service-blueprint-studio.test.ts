import { describe, it, expect } from 'vitest';
import type { ServiceGraph, WhiteboardView, WhiteboardItem } from '../../domain/model';
import { createServiceGraph } from '../../domain/graph-operations';
import {
  SERVICE_BLUEPRINT_LANES,
  SERVICE_BLUEPRINT_LINES,
  BLUEPRINT_SEMANTIC_ZOOM_META,
  BLUEPRINT_LANE_PRESETS,
  createDefaultBlueprintSettings,
  getBlueprintSettings,
  getBlueprintLanes,
  getVisibleBlueprintLanes,
  setBlueprintSemanticZoom,
  updateBlueprintLaneConfig,
  addCustomBlueprintLane,
  removeCustomBlueprintLane,
  applyBlueprintLanePreset,
  blueprintLaneForItem,
  blueprintStageIdForItem,
  blueprintCellItems,
  buildServiceBlueprintReport,
  addBlueprintLaneItem,
  updateBlueprintItemText,
  removeBlueprintItem,
  syncBlueprintFromJourney,
  blueprintItemLabel,
} from '../service-blueprint-studio';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withBoard(graph: ServiceGraph, boardId: string, journeyId?: string): ServiceGraph {
  return {
    ...graph,
    views: {
      ...graph.views,
      whiteboards: {
        ...graph.views.whiteboards,
        [boardId]: {
          id: boardId,
          serviceId: 'S',
          name: 'Service Blueprint',
          viewKind: 'blueprint',
          journeyId: journeyId ?? '',
          items: {},
          createdAt: NOW,
          updatedAt: NOW,
        } as WhiteboardView,
      },
    },
  };
}

function withJourney(graph: ServiceGraph, id: string, stageIds: string[] = []): ServiceGraph {
  return {
    ...graph,
    journeys: {
      ...graph.journeys,
      [id]: { id, serviceId: 'S', name: 'Journey', stageIds, createdAt: NOW, updatedAt: NOW },
    },
  };
}

function withStage(graph: ServiceGraph, id: string, journeyId: string, customerAction = 'User clicks'): ServiceGraph {
  const journey = graph.journeys[journeyId];
  return {
    ...graph,
    journeys: {
      ...graph.journeys,
      [journeyId]: { ...journey, stageIds: [...(journey?.stageIds ?? []), id] },
    },
    stages: {
      ...graph.stages,
      [id]: { id, serviceId: 'S', journeyId, title: `Stage ${id}`, customerAction, stageIds: [], createdAt: NOW, updatedAt: NOW } as never,
    },
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('SERVICE_BLUEPRINT_LANES', () => {
  it('has 6 lanes', () => expect(SERVICE_BLUEPRINT_LANES).toHaveLength(6));
  it('first lane is evidence', () => expect(SERVICE_BLUEPRINT_LANES[0].key).toBe('evidence'));
  it('customer lane is not editable', () => {
    const customerLane = SERVICE_BLUEPRINT_LANES.find(l => l.key === 'customer');
    expect(customerLane?.editable).toBe(false);
  });
  it('all required lanes have required=true', () => {
    SERVICE_BLUEPRINT_LANES.forEach(lane => expect(lane.required).toBe(true));
  });
  it('evidence lane is not visible in strategic zoom', () => {
    const evidenceLane = SERVICE_BLUEPRINT_LANES.find(l => l.key === 'evidence');
    expect(evidenceLane?.visibleIn).not.toContain('strategic');
  });
  it('customer lane is visible in all zooms', () => {
    const customerLane = SERVICE_BLUEPRINT_LANES.find(l => l.key === 'customer');
    expect(customerLane?.visibleIn).toEqual(['strategic', 'journey', 'operational']);
  });
});

describe('SERVICE_BLUEPRINT_LINES', () => {
  it('has 3 boundary lines', () => expect(SERVICE_BLUEPRINT_LINES).toHaveLength(3));
  it('first line is after customer lane', () => expect(SERVICE_BLUEPRINT_LINES[0].after).toBe('customer'));
});

describe('BLUEPRINT_SEMANTIC_ZOOM_META', () => {
  it('has strategic, journey, operational keys', () => {
    expect(Object.keys(BLUEPRINT_SEMANTIC_ZOOM_META)).toEqual(['strategic', 'journey', 'operational']);
  });
});

describe('BLUEPRINT_LANE_PRESETS', () => {
  it('has standard, healthcare, hospitality, saas', () => {
    expect(Object.keys(BLUEPRINT_LANE_PRESETS)).toEqual(expect.arrayContaining(['standard', 'healthcare', 'hospitality', 'saas']));
  });
  it('standard preset has no custom lanes', () => {
    expect(BLUEPRINT_LANE_PRESETS.standard.custom).toEqual([]);
  });
  it('saas preset has custom lanes', () => {
    expect(BLUEPRINT_LANE_PRESETS.saas.custom.length).toBeGreaterThan(0);
  });
});

// ─── createDefaultBlueprintSettings ──────────────────────────────────────────

describe('createDefaultBlueprintSettings', () => {
  it('creates settings with operational zoom and standard preset', () => {
    const settings = createDefaultBlueprintSettings(NOW);
    expect(settings.semanticZoom).toBe('operational');
    expect(settings.preset).toBe('standard');
    expect(settings.version).toBe(1);
    expect(settings.updatedAt).toBe(NOW);
  });

  it('contains all 6 lanes', () => {
    const settings = createDefaultBlueprintSettings(NOW);
    expect(settings.lanes).toHaveLength(6);
  });
});

// ─── getBlueprintSettings ─────────────────────────────────────────────────────

describe('getBlueprintSettings', () => {
  it('returns defaults when board has no blueprintSettings', () => {
    const board: WhiteboardView = { id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: '', items: {}, createdAt: NOW, updatedAt: NOW } as WhiteboardView;
    const settings = getBlueprintSettings(board, NOW);
    expect(settings.semanticZoom).toBe('operational');
    expect(settings.lanes).toHaveLength(6);
  });

  it('merges existing settings with core lanes', () => {
    const board: WhiteboardView = {
      id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: '', items: {}, createdAt: NOW, updatedAt: NOW,
      blueprintSettings: {
        version: 1,
        semanticZoom: 'strategic',
        preset: 'standard',
        lanes: SERVICE_BLUEPRINT_LANES.map(l => ({ ...l })),
        updatedAt: NOW,
      },
    } as WhiteboardView;
    const settings = getBlueprintSettings(board, NOW);
    expect(settings.semanticZoom).toBe('strategic');
    expect(settings.lanes).toHaveLength(6);
  });
});

// ─── getBlueprintLanes / getVisibleBlueprintLanes ─────────────────────────────

describe('getBlueprintLanes', () => {
  it('returns all 6 lanes for a fresh board', () => {
    const board = { id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: '', items: {}, createdAt: NOW, updatedAt: NOW } as WhiteboardView;
    expect(getBlueprintLanes(board)).toHaveLength(6);
  });
});

describe('getVisibleBlueprintLanes', () => {
  it('returns only strategic-visible lanes for strategic zoom', () => {
    const board: WhiteboardView = {
      id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: '', items: {}, createdAt: NOW, updatedAt: NOW,
      blueprintSettings: { version: 1, semanticZoom: 'strategic', preset: 'standard', lanes: SERVICE_BLUEPRINT_LANES.map(l => ({ ...l })), updatedAt: NOW },
    } as WhiteboardView;
    const visible = getVisibleBlueprintLanes(board);
    expect(visible.every(l => l.visibleIn.includes('strategic'))).toBe(true);
    // evidence is NOT visible in strategic
    expect(visible.some(l => l.key === 'evidence')).toBe(false);
  });

  it('returns all lanes for operational zoom', () => {
    const board: WhiteboardView = {
      id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: '', items: {}, createdAt: NOW, updatedAt: NOW,
      blueprintSettings: { version: 1, semanticZoom: 'operational', preset: 'standard', lanes: SERVICE_BLUEPRINT_LANES.map(l => ({ ...l })), updatedAt: NOW },
    } as WhiteboardView;
    const visible = getVisibleBlueprintLanes(board);
    expect(visible).toHaveLength(6);
  });
});

// ─── setBlueprintSemanticZoom ─────────────────────────────────────────────────

describe('setBlueprintSemanticZoom', () => {
  it('updates semantic zoom on board', () => {
    const g = withBoard(base(), 'b1');
    const result = setBlueprintSemanticZoom(g, 'b1', 'strategic', NOW);
    const board = result.views.whiteboards!['b1'];
    expect(board.blueprintSettings?.semanticZoom).toBe('strategic');
  });

  it('returns unchanged graph for missing board', () => {
    const g = base();
    const result = setBlueprintSemanticZoom(g, 'missing', 'strategic', NOW);
    expect(result).toBe(g);
  });

  it('ignores non-blueprint board', () => {
    const g = {
      ...base(),
      views: {
        ...base().views,
        whiteboards: {
          'b1': { id: 'b1', serviceId: 'S', name: 'WB', viewKind: 'freeform', journeyId: '', items: {}, createdAt: NOW, updatedAt: NOW } as WhiteboardView,
        },
      },
    };
    const result = setBlueprintSemanticZoom(g, 'b1', 'strategic', NOW);
    expect(result).toBe(g);
  });
});

// ─── updateBlueprintLaneConfig ────────────────────────────────────────────────

describe('updateBlueprintLaneConfig', () => {
  it('updates a lane label', () => {
    const g = withBoard(base(), 'b1');
    const result = updateBlueprintLaneConfig(g, 'b1', 'frontstage', { label: 'Ações de palco' }, NOW);
    const settings = result.views.whiteboards!['b1'].blueprintSettings!;
    const lane = settings.lanes.find(l => l.key === 'frontstage');
    expect(lane?.label).toBe('Ações de palco');
  });

  it('deduplicates visibleIn values', () => {
    const g = withBoard(base(), 'b1');
    const result = updateBlueprintLaneConfig(g, 'b1', 'frontstage', { visibleIn: ['strategic', 'strategic', 'journey'] }, NOW);
    const settings = result.views.whiteboards!['b1'].blueprintSettings!;
    const lane = settings.lanes.find(l => l.key === 'frontstage');
    expect(lane?.visibleIn).toEqual(['strategic', 'journey']);
  });
});

// ─── addCustomBlueprintLane ───────────────────────────────────────────────────

describe('addCustomBlueprintLane', () => {
  it('adds a new custom lane', () => {
    const g = withBoard(base(), 'b1');
    const result = addCustomBlueprintLane({ graph: g, boardId: 'b1', label: 'Minha Camada', now: NOW });
    expect(result.laneKey).toBe('minha-camada');
    const settings = result.graph.views.whiteboards!['b1'].blueprintSettings!;
    expect(settings.lanes.some(l => l.key === 'minha-camada')).toBe(true);
    expect(settings.preset).toBe('custom');
  });

  it('returns null laneKey for empty label', () => {
    const g = withBoard(base(), 'b1');
    const result = addCustomBlueprintLane({ graph: g, boardId: 'b1', label: '', now: NOW });
    expect(result.laneKey).toBeNull();
  });

  it('deduplicates key with suffix when key already exists', () => {
    const g = withBoard(base(), 'b1');
    const { graph: g2 } = addCustomBlueprintLane({ graph: g, boardId: 'b1', label: 'Minha Camada', now: NOW });
    const result = addCustomBlueprintLane({ graph: g2, boardId: 'b1', label: 'Minha Camada', now: NOW });
    expect(result.laneKey).toBe('minha-camada-2');
  });

  it('uses provided key when given', () => {
    const g = withBoard(base(), 'b1');
    const result = addCustomBlueprintLane({ graph: g, boardId: 'b1', label: 'My Lane', key: 'custom-key', now: NOW });
    expect(result.laneKey).toBe('custom-key');
  });

  it('returns null for non-blueprint board', () => {
    const result = addCustomBlueprintLane({ graph: base(), boardId: 'missing', label: 'Test', now: NOW });
    expect(result.laneKey).toBeNull();
  });
});

// ─── removeCustomBlueprintLane ────────────────────────────────────────────────

describe('removeCustomBlueprintLane', () => {
  it('removes a custom lane with no items', () => {
    const g = withBoard(base(), 'b1');
    const { graph: g2 } = addCustomBlueprintLane({ graph: g, boardId: 'b1', label: 'Extra', now: NOW });
    const result = removeCustomBlueprintLane({ graph: g2, boardId: 'b1', laneKey: 'extra', now: NOW });
    expect(result.removed).toBe(true);
    const settings = result.graph.views.whiteboards!['b1'].blueprintSettings!;
    expect(settings.lanes.some(l => l.key === 'extra')).toBe(false);
  });

  it('refuses to remove a core lane', () => {
    const g = withBoard(base(), 'b1');
    const result = removeCustomBlueprintLane({ graph: g, boardId: 'b1', laneKey: 'frontstage', now: NOW });
    expect(result.removed).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('refuses when lane has items', () => {
    const g = withBoard(base(), 'b1');
    const { graph: g2, laneKey } = addCustomBlueprintLane({ graph: g, boardId: 'b1', label: 'Extra', now: NOW });
    // Add an item in the custom lane
    const board = g2.views.whiteboards!['b1'];
    const g3 = {
      ...g2,
      views: {
        ...g2.views,
        whiteboards: {
          'b1': {
            ...board,
            items: {
              'item1': { id: 'item1', kind: 'free', shape: 'note', blueprintLane: laneKey!, text: 'X', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem,
            },
          },
        },
      },
    };
    const result = removeCustomBlueprintLane({ graph: g3, boardId: 'b1', laneKey: laneKey!, now: NOW });
    expect(result.removed).toBe(false);
  });

  it('returns error for missing board', () => {
    const g = base();
    const result = removeCustomBlueprintLane({ graph: g, boardId: 'missing', laneKey: 'x', now: NOW });
    expect(result.removed).toBe(false);
  });
});

// ─── applyBlueprintLanePreset ─────────────────────────────────────────────────

describe('applyBlueprintLanePreset', () => {
  it('adds saas preset lanes', () => {
    const g = withBoard(base(), 'b1');
    const result = applyBlueprintLanePreset({ graph: g, boardId: 'b1', preset: 'saas', now: NOW });
    expect(result.added).toBe(BLUEPRINT_LANE_PRESETS.saas.custom.length);
    const settings = result.graph.views.whiteboards!['b1'].blueprintSettings!;
    expect(settings.preset).toBe('saas');
    expect(settings.lanes.some(l => l.key === 'interface')).toBe(true);
  });

  it('does not duplicate lanes on second apply', () => {
    const g = withBoard(base(), 'b1');
    const { graph: g2 } = applyBlueprintLanePreset({ graph: g, boardId: 'b1', preset: 'healthcare', now: NOW });
    const result = applyBlueprintLanePreset({ graph: g2, boardId: 'b1', preset: 'healthcare', now: NOW });
    expect(result.added).toBe(0);
  });

  it('returns unchanged graph for missing board', () => {
    const g = base();
    const result = applyBlueprintLanePreset({ graph: g, boardId: 'missing', preset: 'saas', now: NOW });
    expect(result.added).toBe(0);
    expect(result.graph).toBe(g);
  });
});

// ─── blueprintLaneForItem ─────────────────────────────────────────────────────

describe('blueprintLaneForItem', () => {
  it('returns explicit blueprintLane if set', () => {
    const item = { id: 'i1', kind: 'free', blueprintLane: 'my-lane', text: 'X', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintLaneForItem(item)).toBe('my-lane');
  });

  it('maps serviceLayer=enablement → system', () => {
    const item = { id: 'i1', kind: 'free', serviceLayer: 'enablement', text: 'X', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintLaneForItem(item)).toBe('system');
  });

  it('maps serviceLayer=frontstage → frontstage', () => {
    const item = { id: 'i1', kind: 'free', serviceLayer: 'frontstage', text: 'X', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintLaneForItem(item)).toBe('frontstage');
  });

  it('maps smart objectKind=stage → customer', () => {
    const item = { id: 'i1', kind: 'smart', objectKind: 'stage', objectId: 's1', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintLaneForItem(item)).toBe('customer');
  });

  it('maps smart objectKind=evidence → evidence', () => {
    const item = { id: 'i1', kind: 'smart', objectKind: 'evidence', objectId: 'ev1', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintLaneForItem(item)).toBe('evidence');
  });

  it('maps smart objectKind=resource → system', () => {
    const item = { id: 'i1', kind: 'smart', objectKind: 'resource', objectId: 'r1', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintLaneForItem(item)).toBe('system');
  });

  it('maps smart objectKind=frontstage → frontstage', () => {
    const item = { id: 'i1', kind: 'smart', objectKind: 'frontstage', objectId: 'f1', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintLaneForItem(item)).toBe('frontstage');
  });

  it('maps free item with semantic=backstage → backstage', () => {
    const item = { id: 'i1', kind: 'free', semantic: 'backstage', text: 'X', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintLaneForItem(item)).toBe('backstage');
  });

  it('returns null for free item with no semantic or layer', () => {
    const item = { id: 'i1', kind: 'free', text: 'X', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintLaneForItem(item)).toBeNull();
  });
});

// ─── blueprintStageIdForItem ──────────────────────────────────────────────────

describe('blueprintStageIdForItem', () => {
  it('returns serviceStageId when it exists in graph', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1');
    const board = { id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: 'j1', items: {}, createdAt: NOW, updatedAt: NOW } as WhiteboardView;
    const item = { id: 'i1', kind: 'free', serviceStageId: 'st1', text: 'X', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintStageIdForItem(g, board, item)).toBe('st1');
  });

  it('returns blueprintStageId when serviceStageId is absent', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1');
    const board = { id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: 'j1', items: {}, createdAt: NOW, updatedAt: NOW } as WhiteboardView;
    const item = { id: 'i1', kind: 'free', blueprintStageId: 'st1', text: 'X', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintStageIdForItem(g, board, item)).toBe('st1');
  });

  it('returns null when stage does not exist', () => {
    const g = base();
    const board = { id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: 'j1', items: {}, createdAt: NOW, updatedAt: NOW } as WhiteboardView;
    const item = { id: 'i1', kind: 'free', text: 'X', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintStageIdForItem(g, board, item)).toBeNull();
  });
});

// ─── blueprintCellItems ───────────────────────────────────────────────────────

describe('blueprintCellItems', () => {
  it('returns items in correct cell', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1');
    const item1: WhiteboardItem = { id: 'i1', kind: 'free', blueprintStageId: 'st1', blueprintLane: 'frontstage', text: 'Action', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    const item2: WhiteboardItem = { id: 'i2', kind: 'free', blueprintStageId: 'st1', blueprintLane: 'backstage', text: 'Other', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    const board: WhiteboardView = { id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: 'j1', items: { i1: item1, i2: item2 }, createdAt: NOW, updatedAt: NOW } as WhiteboardView;
    const result = blueprintCellItems(g, board, 'st1', 'frontstage');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i1');
  });

  it('excludes frame items', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1');
    const frameItem: WhiteboardItem = { id: 'f1', kind: 'free', shape: 'frame', blueprintStageId: 'st1', blueprintLane: 'frontstage', text: '', x: 0, y: 0, width: 300, height: 300 } as WhiteboardItem;
    const board: WhiteboardView = { id: 'b1', serviceId: 'S', name: 'BP', viewKind: 'blueprint', journeyId: 'j1', items: { f1: frameItem }, createdAt: NOW, updatedAt: NOW } as WhiteboardView;
    expect(blueprintCellItems(g, board, 'st1', 'frontstage')).toHaveLength(0);
  });
});

// ─── buildServiceBlueprintReport ─────────────────────────────────────────────

describe('buildServiceBlueprintReport', () => {
  it('returns null for missing board', () => {
    expect(buildServiceBlueprintReport(base(), 'missing')).toBeNull();
  });

  it('returns null for non-blueprint board', () => {
    const g = {
      ...base(),
      views: {
        ...base().views,
        whiteboards: {
          'b1': { id: 'b1', serviceId: 'S', name: 'WB', viewKind: 'freeform', journeyId: '', items: {}, createdAt: NOW, updatedAt: NOW } as WhiteboardView,
        },
      },
    };
    expect(buildServiceBlueprintReport(g, 'b1')).toBeNull();
  });

  it('returns empty stage report for board without journey', () => {
    const g = withBoard(base(), 'b1');
    const report = buildServiceBlueprintReport(g, 'b1');
    expect(report).not.toBeNull();
    expect(report!.stageCount).toBe(0);
    expect(report!.overallScore).toBe(0);
  });

  it('computes stage gaps for empty stages', () => {
    let g = withBoard(base(), 'b1', 'j1');
    g = withJourney(g, 'j1', []);
    g = withStage(g, 'st1', 'j1', 'User clicks');
    // Reconnect board after adding stage
    const board = g.views.whiteboards!['b1'];
    g = {
      ...g,
      views: {
        ...g.views,
        whiteboards: { 'b1': { ...board, journeyId: 'j1' } },
      },
    };
    const report = buildServiceBlueprintReport(g, 'b1');
    expect(report).not.toBeNull();
    expect(report!.stageCount).toBe(1);
    expect(report!.gapCount).toBeGreaterThan(0);
  });

  it('marks readyForValidation false when gaps exist', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1', 'User clicks');
    g = withStage(g, 'st2', 'j1', 'User confirms');
    g = withBoard(g, 'b1', 'j1');
    const report = buildServiceBlueprintReport(g, 'b1');
    expect(report!.readyForValidation).toBe(false);
  });

  it('reports journeyName correctly', () => {
    let g = withJourney(base(), 'j1');
    g = { ...g, journeys: { ...g.journeys, j1: { ...g.journeys.j1!, name: 'Minha Journey' } } };
    g = withBoard(g, 'b1', 'j1');
    const report = buildServiceBlueprintReport(g, 'b1');
    expect(report!.journeyName).toBe('Minha Journey');
  });
});

// ─── addBlueprintLaneItem ─────────────────────────────────────────────────────

describe('addBlueprintLaneItem', () => {
  it('adds an item to the board', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1');
    g = withBoard(g, 'b1', 'j1');
    const result = addBlueprintLaneItem({ graph: g, boardId: 'b1', stageId: 'st1', lane: 'frontstage', text: 'Action', now: NOW });
    expect(result.itemId).toBeTruthy();
    const board = result.graph.views.whiteboards!['b1'];
    expect(Object.keys(board.items ?? {})).toContain(result.itemId);
  });

  it('returns null for customer lane (not editable)', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1');
    g = withBoard(g, 'b1', 'j1');
    const result = addBlueprintLaneItem({ graph: g, boardId: 'b1', stageId: 'st1', lane: 'customer', now: NOW });
    expect(result.itemId).toBeNull();
  });

  it('returns null for missing board', () => {
    const g = base();
    const result = addBlueprintLaneItem({ graph: g, boardId: 'missing', stageId: 'st1', lane: 'frontstage', now: NOW });
    expect(result.itemId).toBeNull();
  });

  it('returns null for missing stage', () => {
    let g = withBoard(base(), 'b1', 'j1');
    const result = addBlueprintLaneItem({ graph: g, boardId: 'b1', stageId: 'nonexistent', lane: 'frontstage', now: NOW });
    expect(result.itemId).toBeNull();
  });

  it('uses itemId when provided', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1');
    g = withBoard(g, 'b1', 'j1');
    const result = addBlueprintLaneItem({ graph: g, boardId: 'b1', stageId: 'st1', lane: 'frontstage', itemId: 'custom-id', now: NOW });
    expect(result.itemId).toBe('custom-id');
  });
});

// ─── updateBlueprintItemText ──────────────────────────────────────────────────

describe('updateBlueprintItemText', () => {
  it('updates the text of a free item', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1');
    g = withBoard(g, 'b1', 'j1');
    const { graph: g2, itemId } = addBlueprintLaneItem({ graph: g, boardId: 'b1', stageId: 'st1', lane: 'frontstage', text: 'Old text', itemId: 'i1', now: NOW });
    const result = updateBlueprintItemText({ graph: g2, boardId: 'b1', itemId: 'i1', text: 'New text', now: NOW });
    const item = result.views.whiteboards!['b1'].items!['i1'];
    expect(item.kind === 'free' && item.text).toBe('New text');
  });

  it('returns unchanged graph when item is missing', () => {
    const g = withBoard(base(), 'b1');
    const result = updateBlueprintItemText({ graph: g, boardId: 'b1', itemId: 'nonexistent', text: 'Text', now: NOW });
    expect(result).toBe(g);
  });
});

// ─── removeBlueprintItem ──────────────────────────────────────────────────────

describe('removeBlueprintItem', () => {
  it('removes an item from the board', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1');
    g = withBoard(g, 'b1', 'j1');
    const { graph: g2 } = addBlueprintLaneItem({ graph: g, boardId: 'b1', stageId: 'st1', lane: 'frontstage', itemId: 'i1', now: NOW });
    const result = removeBlueprintItem({ graph: g2, boardId: 'b1', itemId: 'i1', now: NOW });
    expect(result.views.whiteboards!['b1'].items!['i1']).toBeUndefined();
  });

  it('returns unchanged graph when item is missing', () => {
    const g = withBoard(base(), 'b1');
    const result = removeBlueprintItem({ graph: g, boardId: 'b1', itemId: 'nonexistent', now: NOW });
    expect(result).toBe(g);
  });
});

// ─── syncBlueprintFromJourney ─────────────────────────────────────────────────

describe('syncBlueprintFromJourney', () => {
  it('adds stage items for each journey stage', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1', 'User clicks');
    g = withStage(g, 'st2', 'j1', 'User confirms');
    g = withBoard(g, 'b1', 'j1');
    const result = syncBlueprintFromJourney(g, 'b1', NOW);
    expect(result.stageItems).toBe(2);
    expect(result.added).toBeGreaterThanOrEqual(2);
  });

  it('does nothing for a board without journey', () => {
    const g = withBoard(base(), 'b1');
    const result = syncBlueprintFromJourney(g, 'b1', NOW);
    expect(result.added).toBe(0);
  });

  it('does not duplicate stage items on second sync', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1', 'User clicks');
    g = withBoard(g, 'b1', 'j1');
    const { graph: g2 } = syncBlueprintFromJourney(g, 'b1', NOW);
    const result = syncBlueprintFromJourney(g2, 'b1', NOW);
    expect(result.stageItems).toBe(0);
  });

  it('returns unchanged graph for missing board', () => {
    const g = base();
    const result = syncBlueprintFromJourney(g, 'missing', NOW);
    expect(result.graph).toBe(g);
  });
});

// ─── blueprintItemLabel ───────────────────────────────────────────────────────

describe('blueprintItemLabel', () => {
  it('returns text for free item', () => {
    const item: WhiteboardItem = { id: 'i1', kind: 'free', text: 'My label', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintItemLabel(base(), item)).toBe('My label');
  });

  it('returns customerAction for smart stage item', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1', 'User fills form');
    const item: WhiteboardItem = { id: 'i1', kind: 'smart', objectKind: 'stage', objectId: 'st1', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintItemLabel(g, item)).toBe('User fills form');
  });

  it('falls back to stage title when customerAction is empty', () => {
    let g = withJourney(base(), 'j1');
    g = withStage(g, 'st1', 'j1', '');
    const item: WhiteboardItem = { id: 'i1', kind: 'smart', objectKind: 'stage', objectId: 'st1', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintItemLabel(g, item)).toBe('Stage st1');
  });

  it('returns objectKind as fallback for unknown smart entity', () => {
    const item: WhiteboardItem = { id: 'i1', kind: 'smart', objectKind: 'frontstage', objectId: 'nonexistent', x: 0, y: 0, width: 100, height: 100 } as WhiteboardItem;
    expect(blueprintItemLabel(base(), item)).toBe('frontstage');
  });
});

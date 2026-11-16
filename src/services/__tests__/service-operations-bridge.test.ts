import { describe, it, expect } from 'vitest';
import type { ServiceGraph } from '../../domain/model';
import { createServiceGraph } from '../../domain/graph-operations';
import {
  SERVICE_OPERATION_TARGET_LABELS,
  SERVICE_OPERATION_KIND_LABELS,
  SERVICE_OPERATION_PROVIDER_LABELS,
  SERVICE_OPERATION_DIRECTION_LABELS,
  SERVICE_OPERATION_SYNC_LABELS,
  SERVICE_OPERATION_STATUS_LABELS,
  SERVICE_OPERATION_RUN_LABELS,
  defaultOperationKind,
  emptyServiceOperationsBridgeState,
  normalizeServiceOperationsBridgeState,
  listServiceOperationTargets,
  createServiceOperationBinding,
  updateServiceOperationBinding,
  syncServiceOperationsBridge,
  recordServiceOperationRun,
  buildServiceOperationsBridgeReport,
} from '../service-operations-bridge';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withTouchpoint(graph: ServiceGraph, id: string, name: string): ServiceGraph {
  return {
    ...graph,
    touchpoints: {
      ...graph.touchpoints,
      [id]: { id, serviceId: 'S', name, channelId: '', stageId: '', createdAt: NOW, updatedAt: NOW },
    },
  };
}

function withJourney(graph: ServiceGraph, id: string, name: string): ServiceGraph {
  return {
    ...graph,
    service: { ...graph.service, journeyIds: [...(graph.service.journeyIds ?? []), id] },
    journeys: {
      ...graph.journeys,
      [id]: { id, serviceId: 'S', name, status: 'active', stageIds: [], owner: '', createdAt: NOW, updatedAt: NOW },
    },
  };
}

function withChannel(graph: ServiceGraph, id: string, name: string): ServiceGraph {
  return {
    ...graph,
    channels: {
      ...graph.channels,
      [id]: { id, serviceId: 'S', name, kind: 'digital', createdAt: NOW, updatedAt: NOW },
    },
  };
}

describe('label constants', () => {
  it('SERVICE_OPERATION_TARGET_LABELS covers all target kinds', () => {
    expect(Object.keys(SERVICE_OPERATION_TARGET_LABELS)).toEqual(
      expect.arrayContaining(['touchpoint', 'journey', 'channel', 'blueprint', 'initiative', 'metric'])
    );
  });

  it('SERVICE_OPERATION_KIND_LABELS covers all operation kinds', () => {
    expect(Object.keys(SERVICE_OPERATION_KIND_LABELS)).toEqual(
      expect.arrayContaining(['activity', 'workflow', 'communication', 'process', 'execution', 'data_source'])
    );
  });

  it('SERVICE_OPERATION_PROVIDER_LABELS covers all providers', () => {
    expect(Object.keys(SERVICE_OPERATION_PROVIDER_LABELS)).toEqual(
      expect.arrayContaining(['internal', 'realtalent_crm', 'webhook', 'manual', 'other'])
    );
  });

  it('SERVICE_OPERATION_DIRECTION_LABELS covers all directions', () => {
    expect(Object.keys(SERVICE_OPERATION_DIRECTION_LABELS)).toEqual(
      expect.arrayContaining(['design_to_ops', 'ops_to_design', 'bidirectional'])
    );
  });

  it('SERVICE_OPERATION_SYNC_LABELS covers all sync modes', () => {
    expect(Object.keys(SERVICE_OPERATION_SYNC_LABELS)).toEqual(
      expect.arrayContaining(['reference', 'manual', 'scheduled', 'event'])
    );
  });

  it('SERVICE_OPERATION_STATUS_LABELS covers all statuses', () => {
    expect(Object.keys(SERVICE_OPERATION_STATUS_LABELS)).toEqual(
      expect.arrayContaining(['draft', 'active', 'paused', 'error', 'archived'])
    );
  });

  it('SERVICE_OPERATION_RUN_LABELS covers all run statuses', () => {
    expect(Object.keys(SERVICE_OPERATION_RUN_LABELS)).toEqual(
      expect.arrayContaining(['simulated', 'success', 'partial', 'failed'])
    );
  });
});

describe('defaultOperationKind', () => {
  it('touchpoint → activity', () => expect(defaultOperationKind('touchpoint')).toBe('activity'));
  it('journey → workflow', () => expect(defaultOperationKind('journey')).toBe('workflow'));
  it('channel → communication', () => expect(defaultOperationKind('channel')).toBe('communication'));
  it('blueprint → process', () => expect(defaultOperationKind('blueprint')).toBe('process'));
  it('initiative → execution', () => expect(defaultOperationKind('initiative')).toBe('execution'));
  it('metric → data_source', () => expect(defaultOperationKind('metric')).toBe('data_source'));
});

describe('emptyServiceOperationsBridgeState', () => {
  it('returns state with version 1 and empty bindings/runs', () => {
    const state = emptyServiceOperationsBridgeState(NOW);
    expect(state.version).toBe(1);
    expect(state.bindings).toEqual({});
    expect(state.runs).toEqual({});
    expect(state.updatedAt).toBe(NOW);
  });
});

describe('normalizeServiceOperationsBridgeState', () => {
  it('returns empty state when no operationsBridge on graph', () => {
    const state = normalizeServiceOperationsBridgeState(base(), NOW);
    expect(state.bindings).toEqual({});
    expect(state.runs).toEqual({});
  });

  it('preserves existing bindings and runs', () => {
    const graph = base();
    const existing = {
      version: 1 as const,
      bindings: { 'b1': { id: 'b1' } as never },
      runs: { 'r1': { id: 'r1' } as never },
      updatedAt: NOW,
    };
    const g2 = { ...graph, service: { ...graph.service, operationsBridge: existing } };
    const state = normalizeServiceOperationsBridgeState(g2, NOW);
    expect(state.bindings['b1']).toBeDefined();
    expect(state.runs['r1']).toBeDefined();
  });
});

describe('listServiceOperationTargets', () => {
  it('returns empty list for empty graph', () => {
    expect(listServiceOperationTargets(base())).toEqual([]);
  });

  it('includes touchpoints', () => {
    const g = withTouchpoint(base(), 'tp1', 'Web Checkout');
    const targets = listServiceOperationTargets(g);
    expect(targets.some(t => t.kind === 'touchpoint' && t.id === 'tp1')).toBe(true);
  });

  it('includes journeys with owner', () => {
    const g = withJourney(base(), 'j1', 'Purchase Journey');
    const targets = listServiceOperationTargets(g);
    const t = targets.find(t => t.id === 'j1');
    expect(t).toBeDefined();
    expect(t!.kind).toBe('journey');
  });

  it('includes channels', () => {
    const g = withChannel(base(), 'ch1', 'Mobile App');
    const targets = listServiceOperationTargets(g);
    expect(targets.some(t => t.kind === 'channel' && t.id === 'ch1')).toBe(true);
  });

  it('filters by kind', () => {
    const g = withTouchpoint(withJourney(base(), 'j1', 'Journey'), 'tp1', 'Touchpoint');
    const targets = listServiceOperationTargets(g, 'touchpoint');
    expect(targets.every(t => t.kind === 'touchpoint')).toBe(true);
    expect(targets.length).toBe(1);
  });

  it('sorts targets alphabetically by label', () => {
    const g = withTouchpoint(withTouchpoint(base(), 'tp2', 'Beta'), 'tp1', 'Alpha');
    const targets = listServiceOperationTargets(g);
    expect(targets[0].label).toBe('Alpha');
    expect(targets[1].label).toBe('Beta');
  });
});

describe('createServiceOperationBinding', () => {
  it('returns target_not_found when target does not exist', () => {
    const result = createServiceOperationBinding(base(), { targetKind: 'touchpoint', targetId: 'missing' }, NOW);
    expect(result.created).toBe(false);
    expect(result.reason).toBe('target_not_found');
  });

  it('creates a binding for a valid target', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const result = createServiceOperationBinding(g, { targetKind: 'touchpoint', targetId: 'tp1' }, NOW);
    expect(result.created).toBe(true);
    expect(result.bindingId).toBeTruthy();
    const state = result.graph.service.operationsBridge!;
    const binding = Object.values(state.bindings)[0];
    expect(binding.targetKind).toBe('touchpoint');
    expect(binding.targetId).toBe('tp1');
    expect(binding.status).toBe('draft');
  });

  it('requires externalRef when activating with realtalent_crm provider', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const result = createServiceOperationBinding(g, {
      targetKind: 'touchpoint', targetId: 'tp1',
      provider: 'realtalent_crm', status: 'active',
    }, NOW);
    expect(result.created).toBe(false);
    expect(result.reason).toBe('external_ref_required');
  });

  it('creates active binding with externalRef for webhook provider', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const result = createServiceOperationBinding(g, {
      targetKind: 'touchpoint', targetId: 'tp1',
      provider: 'webhook', externalRef: 'https://hook.example.com', status: 'active',
    }, NOW);
    expect(result.created).toBe(true);
    const binding = Object.values(result.graph.service.operationsBridge!.bindings)[0];
    expect(binding.status).toBe('active');
  });

  it('detects duplicate bindings', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const { graph } = createServiceOperationBinding(g, { targetKind: 'touchpoint', targetId: 'tp1' }, NOW);
    const dup = createServiceOperationBinding(graph, { targetKind: 'touchpoint', targetId: 'tp1' }, NOW);
    expect(dup.created).toBe(false);
    expect(dup.reason).toBe('duplicate_binding');
  });
});

describe('updateServiceOperationBinding', () => {
  it('returns binding_not_found when id does not exist', () => {
    const result = updateServiceOperationBinding(base(), 'missing', { note: 'test' }, NOW);
    expect(result.updated).toBe(false);
    expect(result.reason).toBe('binding_not_found');
  });

  it('updates a field on an existing binding', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const { graph, bindingId } = createServiceOperationBinding(g, { targetKind: 'touchpoint', targetId: 'tp1' }, NOW);
    const result = updateServiceOperationBinding(graph, bindingId!, { note: 'Updated note' }, NOW);
    expect(result.updated).toBe(true);
    const binding = result.graph.service.operationsBridge!.bindings[bindingId!];
    expect(binding.note).toBe('Updated note');
  });

  it('blocks activation when externalRef is required but missing', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const { graph, bindingId } = createServiceOperationBinding(g, {
      targetKind: 'touchpoint', targetId: 'tp1', provider: 'webhook',
    }, NOW);
    const result = updateServiceOperationBinding(graph, bindingId!, { status: 'active' }, NOW);
    expect(result.updated).toBe(false);
    expect(result.reason).toBe('external_ref_required');
  });
});

describe('syncServiceOperationsBridge', () => {
  it('marks bindings as error when target is removed', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const { graph, bindingId } = createServiceOperationBinding(g, {
      targetKind: 'touchpoint', targetId: 'tp1', provider: 'webhook',
      externalRef: 'https://hook.example.com', status: 'active',
    }, NOW);
    // Remove touchpoint from graph
    const withoutTp = { ...graph, touchpoints: {} };
    const synced = syncServiceOperationsBridge(withoutTp, NOW);
    const binding = synced.service.operationsBridge!.bindings[bindingId!];
    expect(binding.status).toBe('error');
    expect(binding.targetActive).toBe(false);
  });

  it('updates target label when it changes', () => {
    const g = withTouchpoint(base(), 'tp1', 'Old Name');
    const { graph, bindingId } = createServiceOperationBinding(g, { targetKind: 'touchpoint', targetId: 'tp1' }, NOW);
    const renamed = withTouchpoint({ ...graph, touchpoints: {} }, 'tp1', 'New Name');
    const synced = syncServiceOperationsBridge(renamed, NOW);
    expect(synced.service.operationsBridge!.bindings[bindingId!].targetLabel).toBe('New Name');
  });
});

describe('recordServiceOperationRun', () => {
  it('returns binding_not_found when binding does not exist', () => {
    const result = recordServiceOperationRun(base(), 'missing', 'success', '', NOW);
    expect(result.created).toBe(false);
    expect(result.reason).toBe('binding_not_found');
  });

  it('records a simulated run on a draft binding', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const { graph, bindingId } = createServiceOperationBinding(g, { targetKind: 'touchpoint', targetId: 'tp1' }, NOW);
    const result = recordServiceOperationRun(graph, bindingId!, 'simulated', 'test run', NOW);
    expect(result.created).toBe(true);
    expect(result.runId).toBeTruthy();
  });

  it('requires active binding for non-simulated runs', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const { graph, bindingId } = createServiceOperationBinding(g, { targetKind: 'touchpoint', targetId: 'tp1' }, NOW);
    const result = recordServiceOperationRun(graph, bindingId!, 'success', '', NOW);
    expect(result.created).toBe(false);
    expect(result.reason).toBe('binding_not_active');
  });

  it('marks binding as error on failed run', () => {
    const g = withTouchpoint(base(), 'tp1', 'Checkout');
    const { graph, bindingId } = createServiceOperationBinding(g, {
      targetKind: 'touchpoint', targetId: 'tp1',
      provider: 'webhook', externalRef: 'https://hook.example.com', status: 'active',
    }, NOW);
    const result = recordServiceOperationRun(graph, bindingId!, 'failed', 'Connection error', NOW);
    expect(result.created).toBe(true);
    const binding = result.graph.service.operationsBridge!.bindings[bindingId!];
    expect(binding.status).toBe('error');
    expect(binding.lastRunStatus).toBe('failed');
  });
});

describe('buildServiceOperationsBridgeReport', () => {
  it('returns empty report for empty graph', () => {
    const report = buildServiceOperationsBridgeReport(base(), NOW);
    expect(report.targets).toEqual([]);
    expect(report.bindings).toEqual([]);
    expect(report.coveragePercent).toBe(0);
    expect(report.operationsReady).toBe(false);
  });

  it('computes coverage and counts for a graph with binding', () => {
    const g = withTouchpoint(withChannel(base(), 'ch1', 'Web'), 'tp1', 'Checkout');
    const { graph, bindingId } = createServiceOperationBinding(g, {
      targetKind: 'touchpoint', targetId: 'tp1',
      provider: 'webhook', externalRef: 'https://hook.example.com', status: 'active',
    }, NOW);
    const report = buildServiceOperationsBridgeReport(graph, NOW);
    expect(report.counts.bindings).toBe(1);
    expect(report.counts.active).toBe(1);
    expect(report.counts.errors).toBe(0);
    expect(report.operationsReady).toBe(true);
  });

  it('coverage.percent is 0 when no targets of a kind', () => {
    const report = buildServiceOperationsBridgeReport(base(), NOW);
    const touchpointCoverage = report.coverage.find(c => c.kind === 'touchpoint');
    expect(touchpointCoverage?.percent).toBe(0);
  });
});

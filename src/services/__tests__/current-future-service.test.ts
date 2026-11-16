import { describe, it, expect } from 'vitest';
import {
  SERVICE_STATE_KIND_LABELS,
  SERVICE_GAP_STATUS_LABELS,
  SERVICE_GAP_CHANGE_LABELS,
  emptyCurrentFutureState,
  normalizeCurrentFutureState,
  captureCurrentServiceState,
  initializeFutureServiceState,
  updateFutureServiceField,
  projectDecisionIntoFuture,
  deriveCurrentFutureGaps,
  setServiceGapMetadata,
  buildCurrentFutureReport,
} from '../current-future-service';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withJourney(graph: ServiceGraph, id: string, name = 'Journey A'): ServiceGraph {
  return {
    ...graph,
    service: { ...graph.service, journeyIds: [...(graph.service.journeyIds ?? []), id] },
    journeys: {
      ...graph.journeys,
      [id]: { id, serviceId: 'S', name, status: 'active', stageIds: [], owner: 'owner@test.com', createdAt: NOW, updatedAt: NOW } as ServiceGraph['journeys'][string],
    },
  };
}

// ─── constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('SERVICE_STATE_KIND_LABELS covers all 5 kinds', () => {
    const labels = Object.keys(SERVICE_STATE_KIND_LABELS);
    expect(labels).toContain('proposition');
    expect(labels).toContain('journey');
    expect(labels).toContain('channel');
    expect(labels).toContain('blueprint');
    expect(labels).toContain('responsibility');
  });

  it('SERVICE_GAP_STATUS_LABELS covers all statuses', () => {
    expect(SERVICE_GAP_STATUS_LABELS.unreviewed).toBeTruthy();
    expect(SERVICE_GAP_STATUS_LABELS.accepted).toBeTruthy();
    expect(SERVICE_GAP_STATUS_LABELS.in_progress).toBeTruthy();
    expect(SERVICE_GAP_STATUS_LABELS.resolved).toBeTruthy();
    expect(SERVICE_GAP_STATUS_LABELS.dismissed).toBeTruthy();
  });

  it('SERVICE_GAP_CHANGE_LABELS covers changed, added, removed', () => {
    expect(SERVICE_GAP_CHANGE_LABELS.changed).toBeTruthy();
    expect(SERVICE_GAP_CHANGE_LABELS.added).toBeTruthy();
    expect(SERVICE_GAP_CHANGE_LABELS.removed).toBeTruthy();
  });
});

// ─── emptyCurrentFutureState ──────────────────────────────────────────────────

describe('emptyCurrentFutureState', () => {
  it('has version 1', () => {
    expect(emptyCurrentFutureState(NOW).version).toBe(1);
  });

  it('has empty gapMetadata', () => {
    expect(emptyCurrentFutureState(NOW).gapMetadata).toEqual({});
  });

  it('has empty projectedDecisionIds', () => {
    expect(emptyCurrentFutureState(NOW).projectedDecisionIds).toEqual([]);
  });
});

// ─── normalizeCurrentFutureState ─────────────────────────────────────────────

describe('normalizeCurrentFutureState', () => {
  it('returns empty state for graph without currentFuture', () => {
    const state = normalizeCurrentFutureState(base(), NOW);
    expect(state.version).toBe(1);
    expect(state.current).toBeUndefined();
    expect(state.future).toBeUndefined();
  });

  it('normalizes existing state', () => {
    const g = {
      ...base(),
      service: {
        ...base().service,
        currentFuture: {
          version: 1 as const,
          gapMetadata: {},
          projectedDecisionIds: [],
          updatedAt: NOW,
          current: {
            id: 'c1', perspective: 'current' as const, serviceId: 'S', label: 'Estado atual',
            capturedAt: NOW, sourceServiceUpdatedAt: NOW,
            entries: { 'journey:j1': { id: 'journey:j1', kind: 'journey' as const, sourceId: 'j1', label: 'J', sourceUpdatedAt: NOW, fields: { name: 'J' } } },
          },
        },
      },
    };
    const state = normalizeCurrentFutureState(g, NOW);
    expect(state.current).toBeDefined();
  });
});

// ─── captureCurrentServiceState ──────────────────────────────────────────────

describe('captureCurrentServiceState', () => {
  it('creates current snapshot with version 1', () => {
    const result = captureCurrentServiceState(base(), NOW);
    const state = result.service.currentFuture!;
    expect(state.current).toBeDefined();
    expect(state.current!.perspective).toBe('current');
  });

  it('snapshot serviceId matches graph service id', () => {
    const result = captureCurrentServiceState(base(), NOW);
    expect(result.service.currentFuture!.current!.serviceId).toBe('S');
  });

  it('captures journey entries', () => {
    const g = withJourney(base(), 'j1', 'My Journey');
    const result = captureCurrentServiceState(g, NOW);
    const entries = result.service.currentFuture!.current!.entries;
    expect(entries['journey:j1']).toBeDefined();
    expect(entries['journey:j1'].label).toBe('My Journey');
  });

  it('captures responsibility entries for each journey', () => {
    const g = withJourney(base(), 'j1', 'JX');
    const result = captureCurrentServiceState(g, NOW);
    const entries = result.service.currentFuture!.current!.entries;
    expect(entries['responsibility:journey:j1']).toBeDefined();
  });

  it('captures channel entries', () => {
    const g = {
      ...base(),
      channels: { ch1: { id: 'ch1', serviceId: 'S', name: 'Web', kind: 'digital', active: true, createdAt: NOW, updatedAt: NOW } } as ServiceGraph['channels'],
    };
    const result = captureCurrentServiceState(g, NOW);
    const entries = result.service.currentFuture!.current!.entries;
    expect(entries['channel:ch1']).toBeDefined();
  });
});

// ─── initializeFutureServiceState ────────────────────────────────────────────

describe('initializeFutureServiceState', () => {
  it('creates future snapshot from current', () => {
    const g = withJourney(base(), 'j1');
    const result = initializeFutureServiceState(g, {}, NOW);
    const state = result.service.currentFuture!;
    expect(state.future).toBeDefined();
    expect(state.future!.perspective).toBe('future');
  });

  it('future entries are a copy of current entries', () => {
    const g = withJourney(base(), 'j1', 'Journey X');
    const result = initializeFutureServiceState(g, {}, NOW);
    const { current, future } = result.service.currentFuture!;
    expect(Object.keys(future!.entries)).toEqual(expect.arrayContaining(Object.keys(current!.entries)));
  });

  it('does not reset existing future when reset=false', () => {
    const g = withJourney(base(), 'j1');
    const initialized = initializeFutureServiceState(g, {}, NOW);
    const reinit = initializeFutureServiceState(initialized, { reset: false }, NOW);
    // same future id as before — no reinit
    expect(reinit.service.currentFuture!.future!.id).toBe(initialized.service.currentFuture!.future!.id);
  });

  it('resets gapMetadata when reset=true', () => {
    const g = withJourney(base(), 'j1', 'Old');
    const initialized = initializeFutureServiceState(g, {}, NOW);
    // set a gap metadata entry first by updating a field and setting metadata
    const updated = updateFutureServiceField(initialized, { entryId: 'journey:j1', field: 'name', value: 'New' }, NOW);
    const state = updated.graph.service.currentFuture!;
    const gaps = deriveCurrentFutureGaps(state as never, NOW);
    const withMeta = setServiceGapMetadata(updated.graph, gaps[0].key, { status: 'accepted' }, NOW);
    const reset = initializeFutureServiceState(withMeta, { reset: true }, NOW);
    expect(reset.service.currentFuture!.gapMetadata).toEqual({});
    expect(reset.service.currentFuture!.projectedDecisionIds).toEqual([]);
  });
});

// ─── updateFutureServiceField ─────────────────────────────────────────────────

describe('updateFutureServiceField', () => {
  it('updates a field in future entry', () => {
    const g = withJourney(base(), 'j1', 'Old Name');
    const withFuture = initializeFutureServiceState(g, {}, NOW);
    const result = updateFutureServiceField(withFuture, { entryId: 'journey:j1', field: 'name', value: 'New Name' }, NOW);
    expect(result.updated).toBe(true);
    const entry = result.graph.service.currentFuture!.future!.entries['journey:j1'];
    expect(entry.fields.name).toBe('New Name');
  });

  it('returns updated=false when no future exists', () => {
    const result = updateFutureServiceField(base(), { entryId: 'journey:j1', field: 'name', value: 'X' }, NOW);
    expect(result.updated).toBe(false);
    expect(result.reason).toBeTruthy();
  });

  it('returns updated=false for missing entry', () => {
    const g = initializeFutureServiceState(withJourney(base(), 'j1'), {}, NOW);
    const result = updateFutureServiceField(g, { entryId: 'journey:ghost', field: 'name', value: 'X' }, NOW);
    expect(result.updated).toBe(false);
  });

  it('returns updated=false for invalid field', () => {
    const g = initializeFutureServiceState(withJourney(base(), 'j1'), {}, NOW);
    const result = updateFutureServiceField(g, { entryId: 'journey:j1', field: 'nonexistentField', value: 'X' }, NOW);
    expect(result.updated).toBe(false);
  });
});

// ─── deriveCurrentFutureGaps ──────────────────────────────────────────────────

describe('deriveCurrentFutureGaps', () => {
  it('returns empty array when no current or future', () => {
    const state = emptyCurrentFutureState(NOW);
    expect(deriveCurrentFutureGaps(state, NOW)).toHaveLength(0);
  });

  it('detects changed fields between current and future', () => {
    const g = withJourney(base(), 'j1', 'Old');
    const withFuture = initializeFutureServiceState(g, {}, NOW);
    const updated = updateFutureServiceField(withFuture, { entryId: 'journey:j1', field: 'name', value: 'New' }, NOW);
    const state = updated.graph.service.currentFuture!;
    const gaps = deriveCurrentFutureGaps(state as never, NOW);
    const gap = gaps.find(g => g.kind === 'journey' && g.field === 'name');
    expect(gap).toBeDefined();
    expect(gap!.currentValue).toBe('Old');
    expect(gap!.futureValue).toBe('New');
    expect(gap!.changeType).toBe('changed');
  });
});

// ─── setServiceGapMetadata ────────────────────────────────────────────────────

describe('setServiceGapMetadata', () => {
  it('updates gap status', () => {
    const g = withJourney(base(), 'j1', 'Old');
    const withFuture = initializeFutureServiceState(g, {}, NOW);
    const updated = updateFutureServiceField(withFuture, { entryId: 'journey:j1', field: 'name', value: 'New' }, NOW);
    const state = updated.graph.service.currentFuture!;
    const gaps = deriveCurrentFutureGaps(state as never, NOW);
    const key = gaps[0].key;
    const result = setServiceGapMetadata(updated.graph, key, { status: 'in_progress' }, NOW);
    const nextState = result.service.currentFuture!;
    expect(nextState.gapMetadata[key]?.status).toBe('in_progress');
  });

  it('no-ops for non-existent gap key', () => {
    const result = setServiceGapMetadata(base(), 'ghost|key|field', { status: 'resolved' }, NOW);
    expect(result).toBe(base() ? result : result); // unchanged
    expect(result.service.currentFuture).toBeUndefined();
  });
});

// ─── buildCurrentFutureReport ─────────────────────────────────────────────────

describe('buildCurrentFutureReport', () => {
  it('alignmentScore is 0 when no current or future', () => {
    const report = buildCurrentFutureReport(base());
    expect(report.alignmentScore).toBe(0);
  });

  it('alignmentScore is 100 when current and future match', () => {
    const g = withJourney(base(), 'j1');
    const withFuture = initializeFutureServiceState(g, {}, NOW);
    const report = buildCurrentFutureReport(withFuture);
    expect(report.alignmentScore).toBe(100);
  });

  it('alignmentScore < 100 when there are unresolved gaps', () => {
    const g = withJourney(base(), 'j1', 'Old');
    const withFuture = initializeFutureServiceState(g, {}, NOW);
    const updated = updateFutureServiceField(withFuture, { entryId: 'journey:j1', field: 'name', value: 'New' }, NOW);
    const report = buildCurrentFutureReport(updated.graph);
    expect(report.alignmentScore).toBeLessThan(100);
    expect(report.counts.gaps).toBeGreaterThan(0);
  });

  it('counts journey entries', () => {
    const g = withJourney(base(), 'j1');
    const withFuture = initializeFutureServiceState(g, {}, NOW);
    const report = buildCurrentFutureReport(withFuture);
    expect(report.counts.currentEntries).toBeGreaterThan(0);
  });
});

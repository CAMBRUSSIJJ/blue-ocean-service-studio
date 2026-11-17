import { describe, it, expect } from 'vitest';
import {
  workspacePreferenceId,
  createEmptyWorkspacePreferences,
  normalizeWorkspacePreferences,
  setFavorite,
  setPinned,
  movePin,
  recordRecentContext,
  pruneWorkspacePreferences,
} from '../workspace-preferences';
import type { WorkspacePreferences, WorkspacePreferenceScope, WorkspaceReference } from '../workspace-preferences';

const NOW = '2024-11-01T10:00:00.000Z';

const scope: WorkspacePreferenceScope = { userId: 'user1', workspaceId: 'ws1' };

function ref(targetType: WorkspaceReference['targetType'], targetId: string, title?: string): WorkspaceReference {
  return { targetType, targetId, title };
}

function emptyPrefs(): WorkspacePreferences {
  return { ...createEmptyWorkspacePreferences(scope), updatedAt: NOW };
}

// ─── workspacePreferenceId ────────────────────────────────────────────────────

describe('workspacePreferenceId', () => {
  it('combines userId and workspaceId', () => {
    expect(workspacePreferenceId(scope)).toBe('user1::ws1');
  });
});

// ─── createEmptyWorkspacePreferences ─────────────────────────────────────────

describe('createEmptyWorkspacePreferences', () => {
  it('creates empty preferences with correct id', () => {
    const prefs = createEmptyWorkspacePreferences(scope);
    expect(prefs.id).toBe('user1::ws1');
    expect(prefs.userId).toBe('user1');
    expect(prefs.workspaceId).toBe('ws1');
    expect(prefs.favorites).toEqual([]);
    expect(prefs.pins).toEqual([]);
    expect(prefs.recentContexts).toEqual([]);
    expect(prefs.version).toBe(1);
  });
});

// ─── normalizeWorkspacePreferences ───────────────────────────────────────────

describe('normalizeWorkspacePreferences', () => {
  it('returns empty preferences for null input', () => {
    const prefs = normalizeWorkspacePreferences(null, scope);
    expect(prefs.favorites).toEqual([]);
  });

  it('normalizes favorites', () => {
    const prefs = normalizeWorkspacePreferences({
      favorites: [
        { targetType: 'journey', targetId: 'j1', title: '  Journey 1  ' },
      ],
      updatedAt: NOW,
    }, scope);
    expect(prefs.favorites).toHaveLength(1);
    expect(prefs.favorites[0].title).toBe('Journey 1'); // trimmed
  });

  it('deduplicates favorites keeping last', () => {
    const prefs = normalizeWorkspacePreferences({
      favorites: [
        { targetType: 'journey', targetId: 'j1', title: 'First' },
        { targetType: 'journey', targetId: 'j1', title: 'Second' },
      ],
    }, scope);
    expect(prefs.favorites).toHaveLength(1);
    // Map keeps last insertion, so 'Second' wins
    expect(prefs.favorites[0].title).toBe('Second');
  });

  it('sorts pins by order', () => {
    const prefs = normalizeWorkspacePreferences({
      pins: [
        { targetType: 'blueprint', targetId: 'b2', order: 2, pinnedAt: NOW },
        { targetType: 'blueprint', targetId: 'b1', order: 0, pinnedAt: NOW },
      ],
    }, scope);
    expect(prefs.pins[0].targetId).toBe('b1');
    expect(prefs.pins[1].targetId).toBe('b2');
  });

  it('deduplicates recentContexts keeping most recent occurrence', () => {
    const earlier = '2024-10-01T00:00:00.000Z';
    const later = '2024-11-01T00:00:00.000Z';
    const prefs = normalizeWorkspacePreferences({
      recentContexts: [
        { targetType: 'journey', targetId: 'j1', activity: 'opened', occurredAt: earlier },
        { targetType: 'journey', targetId: 'j1', activity: 'edited', occurredAt: later },
      ],
    }, scope);
    expect(prefs.recentContexts).toHaveLength(1);
    expect(prefs.recentContexts[0].occurredAt).toBe(later);
  });

  it('limits recentContexts to 50', () => {
    const many = Array.from({ length: 60 }, (_, i) => ({
      targetType: 'journey' as const,
      targetId: `j${i}`,
      activity: 'opened' as const,
      occurredAt: `2024-11-01T${String(i).padStart(2, '0')}:00:00.000Z`,
    }));
    const prefs = normalizeWorkspacePreferences({ recentContexts: many }, scope);
    expect(prefs.recentContexts).toHaveLength(50);
  });

  it('assigns context property when provided', () => {
    const prefs = normalizeWorkspacePreferences({
      favorites: [
        {
          targetType: 'journey',
          targetId: 'j1',
          context: { serviceId: 'svc1', journeyId: 'j1' },
        },
      ],
    }, scope);
    expect(prefs.favorites[0].context?.serviceId).toBe('svc1');
  });
});

// ─── setFavorite ──────────────────────────────────────────────────────────────

describe('setFavorite', () => {
  it('adds a favorite', () => {
    const prefs = emptyPrefs();
    const result = setFavorite(prefs, ref('journey', 'j1', 'My Journey'), true);
    expect(result.favorites).toHaveLength(1);
    expect(result.favorites[0].targetId).toBe('j1');
  });

  it('removes a favorite', () => {
    const prefs = setFavorite(emptyPrefs(), ref('journey', 'j1'), true);
    const result = setFavorite(prefs, ref('journey', 'j1'), false);
    expect(result.favorites).toHaveLength(0);
  });

  it('adding again moves it to front', () => {
    let prefs = emptyPrefs();
    prefs = setFavorite(prefs, ref('journey', 'j1'), true);
    prefs = setFavorite(prefs, ref('blueprint', 'b1'), true);
    prefs = setFavorite(prefs, ref('journey', 'j1'), true); // re-add j1
    expect(prefs.favorites[0].targetId).toBe('j1');
  });
});

// ─── setPinned ────────────────────────────────────────────────────────────────

describe('setPinned', () => {
  it('adds a pin', () => {
    const prefs = emptyPrefs();
    const result = setPinned(prefs, ref('journey', 'j1', 'Journey'), true);
    expect(result.pins).toHaveLength(1);
    expect(result.pins[0].targetId).toBe('j1');
    expect(result.pins[0].order).toBe(0);
  });

  it('removes a pin and re-orders remaining pins', () => {
    let prefs = emptyPrefs();
    prefs = setPinned(prefs, ref('journey', 'j1'), true);
    prefs = setPinned(prefs, ref('blueprint', 'b1'), true);
    prefs = setPinned(prefs, ref('journey', 'j1'), false);
    expect(prefs.pins).toHaveLength(1);
    expect(prefs.pins[0].order).toBe(0);
    expect(prefs.pins[0].targetId).toBe('b1');
  });

  it('assigns consecutive orders', () => {
    let prefs = emptyPrefs();
    prefs = setPinned(prefs, ref('journey', 'j1'), true);
    prefs = setPinned(prefs, ref('blueprint', 'b2'), true);
    expect(prefs.pins[0].order).toBe(0);
    expect(prefs.pins[1].order).toBe(1);
  });
});

// ─── movePin ──────────────────────────────────────────────────────────────────

describe('movePin', () => {
  it('moves a pin down', () => {
    let prefs = emptyPrefs();
    prefs = setPinned(prefs, ref('journey', 'j1'), true);
    prefs = setPinned(prefs, ref('blueprint', 'b2'), true);
    const result = movePin(prefs, 'j1', 'journey', 1);
    expect(result.pins[0].targetId).toBe('b2');
    expect(result.pins[1].targetId).toBe('j1');
  });

  it('moves a pin up', () => {
    let prefs = emptyPrefs();
    prefs = setPinned(prefs, ref('journey', 'j1'), true);
    prefs = setPinned(prefs, ref('blueprint', 'b2'), true);
    const result = movePin(prefs, 'b2', 'blueprint', -1);
    expect(result.pins[0].targetId).toBe('b2');
  });

  it('does nothing when at boundary', () => {
    let prefs = emptyPrefs();
    prefs = setPinned(prefs, ref('journey', 'j1'), true);
    const result = movePin(prefs, 'j1', 'journey', -1);
    expect(result).toBe(prefs);
  });

  it('does nothing for missing pin', () => {
    const prefs = emptyPrefs();
    const result = movePin(prefs, 'nonexistent', 'journey', 1);
    expect(result).toBe(prefs);
  });
});

// ─── recordRecentContext ──────────────────────────────────────────────────────

describe('recordRecentContext', () => {
  it('adds a recent context', () => {
    const prefs = emptyPrefs();
    const result = recordRecentContext(prefs, ref('journey', 'j1', 'Journey'), 'opened', NOW);
    expect(result.recentContexts).toHaveLength(1);
    expect(result.recentContexts[0].targetId).toBe('j1');
    expect(result.recentContexts[0].activity).toBe('opened');
  });

  it('replaces existing entry for same targetId+targetType', () => {
    let prefs = emptyPrefs();
    prefs = recordRecentContext(prefs, ref('journey', 'j1'), 'opened', '2024-10-01T00:00:00.000Z');
    prefs = recordRecentContext(prefs, ref('journey', 'j1'), 'edited', NOW);
    expect(prefs.recentContexts).toHaveLength(1);
    expect(prefs.recentContexts[0].activity).toBe('edited');
  });

  it('sorts by most recent first', () => {
    let prefs = emptyPrefs();
    prefs = recordRecentContext(prefs, ref('journey', 'j1'), 'opened', '2024-10-01T00:00:00.000Z');
    prefs = recordRecentContext(prefs, ref('blueprint', 'b1'), 'opened', NOW);
    expect(prefs.recentContexts[0].targetId).toBe('b1');
  });
});

// ─── pruneWorkspacePreferences ────────────────────────────────────────────────

describe('pruneWorkspacePreferences', () => {
  it('removes favorites that no longer exist', () => {
    let prefs = emptyPrefs();
    prefs = setFavorite(prefs, ref('journey', 'j1'), true);
    prefs = setFavorite(prefs, ref('journey', 'j2'), true);
    const existing = new Set(['journey:j1']);
    const result = pruneWorkspacePreferences(prefs, existing);
    expect(result.favorites).toHaveLength(1);
    expect(result.favorites[0].targetId).toBe('j1');
  });

  it('removes pins that no longer exist', () => {
    let prefs = emptyPrefs();
    prefs = setPinned(prefs, ref('blueprint', 'b1'), true);
    prefs = setPinned(prefs, ref('blueprint', 'b2'), true);
    const existing = new Set(['blueprint:b1']);
    const result = pruneWorkspacePreferences(prefs, existing);
    expect(result.pins).toHaveLength(1);
    expect(result.pins[0].order).toBe(0); // re-ordered
  });

  it('removes recent contexts that no longer exist', () => {
    let prefs = emptyPrefs();
    prefs = recordRecentContext(prefs, ref('journey', 'j1'), 'opened', NOW);
    prefs = recordRecentContext(prefs, ref('journey', 'j2'), 'opened', NOW);
    const existing = new Set(['journey:j1']);
    const result = pruneWorkspacePreferences(prefs, existing);
    expect(result.recentContexts).toHaveLength(1);
  });

  it('returns same reference when nothing changed', () => {
    let prefs = emptyPrefs();
    prefs = setFavorite(prefs, ref('journey', 'j1'), true);
    const existing = new Set(['journey:j1']);
    const result = pruneWorkspacePreferences(prefs, existing);
    expect(result).toBe(prefs);
  });
});

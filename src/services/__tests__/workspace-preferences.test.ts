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
  readCachedWorkspacePreferences,
} from '../workspace-preferences.ts';
import type { WorkspacePreferences, WorkspaceReference } from '../workspace-preferences.ts';

const SCOPE = { userId: 'user1', workspaceId: 'ws1' };
const NOW = '2025-01-01T00:00:00.000Z';

function ref(targetType: string, targetId: string, extra: Partial<WorkspaceReference> = {}): WorkspaceReference {
  return { targetType: targetType as WorkspaceReference['targetType'], targetId, ...extra };
}

function emptyPrefs(): WorkspacePreferences {
  return { ...createEmptyWorkspacePreferences(SCOPE), updatedAt: NOW };
}

// ─── workspacePreferenceId ────────────────────────────────────────────────────

describe('workspacePreferenceId', () => {
  it('formats id as userId::workspaceId', () => {
    expect(workspacePreferenceId(SCOPE)).toBe('user1::ws1');
  });

  it('different scopes produce different ids', () => {
    expect(workspacePreferenceId({ userId: 'a', workspaceId: 'b' }))
      .not.toBe(workspacePreferenceId({ userId: 'c', workspaceId: 'd' }));
  });
});

// ─── createEmptyWorkspacePreferences ─────────────────────────────────────────

describe('createEmptyWorkspacePreferences', () => {
  it('creates preferences with version=1 and empty lists', () => {
    const p = createEmptyWorkspacePreferences(SCOPE);
    expect(p.version).toBe(1);
    expect(p.userId).toBe(SCOPE.userId);
    expect(p.workspaceId).toBe(SCOPE.workspaceId);
    expect(p.id).toBe(workspacePreferenceId(SCOPE));
    expect(p.favorites).toEqual([]);
    expect(p.pins).toEqual([]);
    expect(p.recentContexts).toEqual([]);
  });
});

// ─── normalizeWorkspacePreferences ───────────────────────────────────────────

describe('normalizeWorkspacePreferences', () => {
  it('returns empty prefs for null input', () => {
    const p = normalizeWorkspacePreferences(null, SCOPE);
    expect(p.favorites).toEqual([]);
    expect(p.pins).toEqual([]);
    expect(p.recentContexts).toEqual([]);
  });

  it('deduplicates favorites keeping last definition per key', () => {
    const r1 = ref('journey', 'j1', { title: 'J1-old' });
    const r2 = ref('journey', 'j1', { title: 'J1-new' });
    const p = normalizeWorkspacePreferences({ favorites: [r1, r2] } as Partial<WorkspacePreferences>, SCOPE);
    // Map keeps the last one for the key
    expect(p.favorites.length).toBe(1);
  });

  it('deduplicates pins by key', () => {
    const p1 = { ...ref('journey', 'j1'), order: 0, pinnedAt: NOW };
    const p2 = { ...ref('journey', 'j1'), order: 1, pinnedAt: NOW };
    const p = normalizeWorkspacePreferences({ pins: [p1, p2] } as Partial<WorkspacePreferences>, SCOPE);
    expect(p.pins.length).toBe(1);
  });

  it('sorts pins by order', () => {
    const pa = { ...ref('journey', 'ja'), order: 2, pinnedAt: NOW };
    const pb = { ...ref('journey', 'jb'), order: 0, pinnedAt: NOW };
    const p = normalizeWorkspacePreferences({ pins: [pa, pb] } as Partial<WorkspacePreferences>, SCOPE);
    expect(p.pins[0].targetId).toBe('jb');
    expect(p.pins[1].targetId).toBe('ja');
  });

  it('re-indexes pins orders sequentially after sort', () => {
    const pa = { ...ref('journey', 'ja'), order: 10, pinnedAt: NOW };
    const pb = { ...ref('journey', 'jb'), order: 20, pinnedAt: NOW };
    const p = normalizeWorkspacePreferences({ pins: [pa, pb] } as Partial<WorkspacePreferences>, SCOPE);
    expect(p.pins[0].order).toBe(0);
    expect(p.pins[1].order).toBe(1);
  });

  it('deduplicates recentContexts by key keeping most-recent occurredAt', () => {
    const rc1 = { ...ref('journey', 'j1'), activity: 'opened' as const, occurredAt: '2025-01-01T00:00:00Z' };
    const rc2 = { ...ref('journey', 'j1'), activity: 'edited' as const, occurredAt: '2025-06-01T00:00:00Z' };
    const p = normalizeWorkspacePreferences({ recentContexts: [rc1, rc2] } as Partial<WorkspacePreferences>, SCOPE);
    expect(p.recentContexts.length).toBe(1);
    expect(p.recentContexts[0].occurredAt).toBe('2025-06-01T00:00:00Z');
  });

  it('sorts recentContexts by occurredAt descending', () => {
    const rc1 = { ...ref('journey', 'j1'), activity: 'opened' as const, occurredAt: '2025-01-01T00:00:00Z' };
    const rc2 = { ...ref('journey', 'j2'), activity: 'opened' as const, occurredAt: '2025-06-01T00:00:00Z' };
    const p = normalizeWorkspacePreferences({ recentContexts: [rc1, rc2] } as Partial<WorkspacePreferences>, SCOPE);
    expect(p.recentContexts[0].targetId).toBe('j2');
  });

  it('trims title and subtitle from references', () => {
    const r = ref('journey', 'j1', { title: '  My Journey  ', subtitle: '  Sub  ' });
    const p = normalizeWorkspacePreferences({ favorites: [r] } as Partial<WorkspacePreferences>, SCOPE);
    expect(p.favorites[0].title).toBe('My Journey');
    expect(p.favorites[0].subtitle).toBe('Sub');
  });
});

// ─── setFavorite ─────────────────────────────────────────────────────────────

describe('setFavorite', () => {
  it('adds reference to favorites when enabled=true', () => {
    const r = ref('journey', 'j1');
    const p = setFavorite(emptyPrefs(), r, true);
    expect(p.favorites.map((f) => f.targetId)).toContain('j1');
  });

  it('removes reference from favorites when enabled=false', () => {
    const r = ref('journey', 'j1');
    const p1 = setFavorite(emptyPrefs(), r, true);
    const p2 = setFavorite(p1, r, false);
    expect(p2.favorites.map((f) => f.targetId)).not.toContain('j1');
  });

  it('prepends to existing favorites', () => {
    const r1 = ref('journey', 'j1');
    const r2 = ref('journey', 'j2');
    const p1 = setFavorite(emptyPrefs(), r1, true);
    const p2 = setFavorite(p1, r2, true);
    expect(p2.favorites[0].targetId).toBe('j2');
  });

  it('no-op remove on empty favorites does not throw', () => {
    const r = ref('journey', 'j1');
    expect(() => setFavorite(emptyPrefs(), r, false)).not.toThrow();
  });
});

// ─── setPinned ────────────────────────────────────────────────────────────────

describe('setPinned', () => {
  it('adds pin when enabled=true', () => {
    const r = ref('journey', 'j1');
    const p = setPinned(emptyPrefs(), r, true);
    expect(p.pins.map((pin) => pin.targetId)).toContain('j1');
  });

  it('removes pin when enabled=false', () => {
    const r = ref('journey', 'j1');
    const p1 = setPinned(emptyPrefs(), r, true);
    const p2 = setPinned(p1, r, false);
    expect(p2.pins.map((pin) => pin.targetId)).not.toContain('j1');
  });

  it('re-indexes pin orders after removal', () => {
    const r1 = ref('journey', 'j1');
    const r2 = ref('journey', 'j2');
    const r3 = ref('journey', 'j3');
    let p = setPinned(emptyPrefs(), r1, true);
    p = setPinned(p, r2, true);
    p = setPinned(p, r3, true);
    p = setPinned(p, r2, false);
    expect(p.pins[0].order).toBe(0);
    expect(p.pins[1].order).toBe(1);
  });

  it('assigns correct order on new pin', () => {
    const r1 = ref('journey', 'j1');
    const r2 = ref('journey', 'j2');
    let p = setPinned(emptyPrefs(), r1, true);
    p = setPinned(p, r2, true);
    expect(p.pins[1].order).toBe(1);
  });
});

// ─── movePin ──────────────────────────────────────────────────────────────────

describe('movePin', () => {
  it('no-ops for unknown targetId', () => {
    const p = emptyPrefs();
    expect(movePin(p, 'unknown', 'journey', 1)).toBe(p);
  });

  it('no-ops when moving first pin up (-1)', () => {
    const r = ref('journey', 'j1');
    const p = setPinned(emptyPrefs(), r, true);
    expect(movePin(p, 'j1', 'journey', -1)).toBe(p);
  });

  it('no-ops when moving last pin down (+1)', () => {
    const r = ref('journey', 'j1');
    const p = setPinned(emptyPrefs(), r, true);
    expect(movePin(p, 'j1', 'journey', 1)).toBe(p);
  });

  it('swaps pin order when moving down (+1)', () => {
    const r1 = ref('journey', 'j1');
    const r2 = ref('journey', 'j2');
    let p = setPinned(emptyPrefs(), r1, true);
    p = setPinned(p, r2, true);
    const p2 = movePin(p, 'j1', 'journey', 1);
    expect(p2.pins[0].targetId).toBe('j2');
    expect(p2.pins[1].targetId).toBe('j1');
  });

  it('swaps pin order when moving up (-1)', () => {
    const r1 = ref('journey', 'j1');
    const r2 = ref('journey', 'j2');
    let p = setPinned(emptyPrefs(), r1, true);
    p = setPinned(p, r2, true);
    const p2 = movePin(p, 'j2', 'journey', -1);
    expect(p2.pins[0].targetId).toBe('j2');
    expect(p2.pins[1].targetId).toBe('j1');
  });
});

// ─── recordRecentContext ──────────────────────────────────────────────────────

describe('recordRecentContext', () => {
  it('adds entry to recentContexts', () => {
    const r = ref('journey', 'j1');
    const p = recordRecentContext(emptyPrefs(), r, 'opened', NOW);
    expect(p.recentContexts.map((rc) => rc.targetId)).toContain('j1');
  });

  it('replaces existing entry for same key with newest', () => {
    const r = ref('journey', 'j1');
    let p = recordRecentContext(emptyPrefs(), r, 'opened', '2025-01-01T00:00:00Z');
    p = recordRecentContext(p, r, 'edited', '2025-06-01T00:00:00Z');
    expect(p.recentContexts.filter((rc) => rc.targetId === 'j1')).toHaveLength(1);
    expect(p.recentContexts[0].activity).toBe('edited');
  });

  it('sorts by occurredAt descending', () => {
    const r1 = ref('journey', 'j1');
    const r2 = ref('blueprint', 'b1');
    let p = recordRecentContext(emptyPrefs(), r1, 'opened', '2025-01-01T00:00:00Z');
    p = recordRecentContext(p, r2, 'opened', '2025-06-01T00:00:00Z');
    expect(p.recentContexts[0].targetId).toBe('b1');
  });

  it('caps at MAX_RECENT_CONTEXTS (50)', () => {
    let p = emptyPrefs();
    for (let i = 0; i < 55; i++) {
      p = recordRecentContext(p, ref('journey', `j${i}`), 'opened', `2025-01-${String(i).padStart(2, '0')}T00:00:00Z`);
    }
    expect(p.recentContexts.length).toBeLessThanOrEqual(50);
  });
});

// ─── pruneWorkspacePreferences ────────────────────────────────────────────────

describe('pruneWorkspacePreferences', () => {
  it('returns same reference when nothing is pruned', () => {
    const r = ref('journey', 'j1');
    let p = setFavorite(emptyPrefs(), r, true);
    p = setPinned(p, r, true);
    p = recordRecentContext(p, r, 'opened', NOW);
    const existing = new Set(['journey:j1']);
    expect(pruneWorkspacePreferences(p, existing)).toBe(p);
  });

  it('removes favorites whose key is not in existingKeys', () => {
    const r = ref('journey', 'j1');
    const p = setFavorite(emptyPrefs(), r, true);
    const pruned = pruneWorkspacePreferences(p, new Set());
    expect(pruned.favorites).toHaveLength(0);
  });

  it('removes pins whose key is not in existingKeys', () => {
    const r = ref('journey', 'j1');
    const p = setPinned(emptyPrefs(), r, true);
    const pruned = pruneWorkspacePreferences(p, new Set());
    expect(pruned.pins).toHaveLength(0);
  });

  it('removes recentContexts whose key is not in existingKeys', () => {
    const r = ref('journey', 'j1');
    const p = recordRecentContext(emptyPrefs(), r, 'opened', NOW);
    const pruned = pruneWorkspacePreferences(p, new Set());
    expect(pruned.recentContexts).toHaveLength(0);
  });

  it('re-indexes pin orders after pruning', () => {
    const r1 = ref('journey', 'j1');
    const r2 = ref('journey', 'j2');
    let p = setPinned(emptyPrefs(), r1, true);
    p = setPinned(p, r2, true);
    const pruned = pruneWorkspacePreferences(p, new Set(['journey:j2']));
    expect(pruned.pins[0].order).toBe(0);
  });
});

// ─── readCachedWorkspacePreferences ───────────────────────────────────────────

describe('readCachedWorkspacePreferences', () => {
  it('returns empty preferences in test environment (no localStorage)', () => {
    // In happy-dom/test env, localStorage is likely unavailable or empty
    const p = readCachedWorkspacePreferences(SCOPE);
    expect(p.version).toBe(1);
    expect(p.userId).toBe(SCOPE.userId);
  });
});

import { describe, it, expect } from 'vitest';
import {
  MATRIX_REFERENCE_TYPES,
  MATRIX_CONTENT_TYPES,
  MATRIX_IMAGE_LIMIT,
  MATRIX_IMAGE_BUDGET,
  MATRIX_CARD_TONES,
  MATRIX_CONNECTION_TYPES,
  insertMatrixBlock,
  duplicateMatrixBlock,
  matrixCardHasContent,
  normalizeMatrixActivity,
  matrixActivityFromRecord,
  normalizeMatrixConnection,
  validateMatrixConnections,
  matrixStageGeometry,
  normalizeMatrixCardMetadata,
  normalizeMatrixCardFilters,
  matrixCardMatches,
  matrixSafeUrl,
  matrixEmbedUrl,
  normalizeMatrixScale,
  normalizeMatrixBlock,
  normalizeMatrixRow,
  validateMatrixDocument,
  applyMatrixCardAction,
  matrixServiceReferences,
  matrixContentFromDocument,
  restoreMatrixContent,
} from '../journey-content';
import { createServiceGraph } from '../../domain/graph-operations';
import type { JourneyMatrixBlock, ServiceGraph } from '../../domain/model';

const NOW = '2024-11-01T10:00:00.000Z';

function baseGraph(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function makeBlock(id: string, text = 'Hello', type = 'card'): Record<string, unknown> {
  return { id, type, text, i: id };
}

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('MATRIX_REFERENCE_TYPES are a subset of MATRIX_CONTENT_TYPES', () => {
    for (const t of MATRIX_REFERENCE_TYPES) expect(MATRIX_CONTENT_TYPES).toContain(t);
  });

  it('MATRIX_IMAGE_LIMIT is 500 KB', () => expect(MATRIX_IMAGE_LIMIT).toBe(500 * 1024));
  it('MATRIX_IMAGE_BUDGET is 2 MB', () => expect(MATRIX_IMAGE_BUDGET).toBe(2 * 1024 * 1024));

  it('MATRIX_CARD_TONES includes neutral and named tones', () => {
    expect(MATRIX_CARD_TONES).toContain('neutral');
    expect(MATRIX_CARD_TONES).toContain('blue');
    expect(MATRIX_CARD_TONES).toContain('rose');
  });

  it('MATRIX_CONNECTION_TYPES has sequence, dependency, uses, handoff', () => {
    expect(Object.keys(MATRIX_CONNECTION_TYPES)).toEqual(
      expect.arrayContaining(['sequence', 'dependency', 'uses', 'handoff'])
    );
  });
});

// ─── insertMatrixBlock ────────────────────────────────────────────────────────

describe('insertMatrixBlock', () => {
  it('appends block when beforeId is null', () => {
    const block = makeBlock('b1') as unknown as JourneyMatrixBlock;
    const result = insertMatrixBlock([], block);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(block);
  });

  it('inserts before existing block', () => {
    const b1 = makeBlock('b1') as unknown as JourneyMatrixBlock;
    const b2 = makeBlock('b2') as unknown as JourneyMatrixBlock;
    const result = insertMatrixBlock([b1], b2, 'b1');
    expect(result[0]).toBe(b2);
    expect(result[1]).toBe(b1);
  });

  it('throws when already at 100 items', () => {
    const blocks = Array.from({ length: 100 }, (_, i) => makeBlock(`b${i}`)) as unknown as JourneyMatrixBlock[];
    expect(() => insertMatrixBlock(blocks, makeBlock('x') as unknown as JourneyMatrixBlock)).toThrow();
  });

  it('throws when block already exists', () => {
    const b1 = makeBlock('b1') as unknown as JourneyMatrixBlock;
    expect(() => insertMatrixBlock([b1], b1)).toThrow();
  });

  it('throws when beforeId not found', () => {
    const b1 = makeBlock('b1') as unknown as JourneyMatrixBlock;
    expect(() => insertMatrixBlock([], b1, 'missing')).toThrow();
  });
});

// ─── duplicateMatrixBlock ─────────────────────────────────────────────────────

describe('duplicateMatrixBlock', () => {
  it('creates a copy with new id under key i', () => {
    const original = makeBlock('b1') as unknown as JourneyMatrixBlock;
    const copy = duplicateMatrixBlock(original, 'b2') as unknown as Record<string, unknown>;
    expect(copy['i']).toBe('b2');
    expect(copy['id']).toBeUndefined();
  });
});

// ─── matrixCardHasContent ─────────────────────────────────────────────────────

describe('matrixCardHasContent', () => {
  it('returns false for empty text card', () => {
    expect(matrixCardHasContent({ type: 'card', t: '' })).toBe(false);
  });

  it('returns true for card with text', () => {
    expect(matrixCardHasContent({ type: 'card', t: 'Hello' })).toBe(true);
  });

  it('returns true for non-text/card type regardless of text', () => {
    expect(matrixCardHasContent({ type: 'link', t: '' })).toBe(true);
  });
});

// ─── normalizeMatrixActivity ──────────────────────────────────────────────────

describe('normalizeMatrixActivity', () => {
  it('returns defaults for empty input', () => {
    const a = normalizeMatrixActivity();
    expect(a.category).toBe('activity');
    expect(a.owner).toBe('');
    expect(a.resourceRefs).toEqual([]);
    expect(a.durationMinutes).toBeNull();
  });

  it('normalizes valid category', () => {
    const a = normalizeMatrixActivity({ category: 'resource' });
    expect(a.category).toBe('resource');
  });

  it('defaults invalid category to activity', () => {
    const a = normalizeMatrixActivity({ category: 'unknown' });
    expect(a.category).toBe('activity');
  });

  it('trims and clips owner', () => {
    const a = normalizeMatrixActivity({ owner: '  Ops Team  ' });
    expect(a.owner).toBe('Ops Team');
  });

  it('throws for negative duration', () => {
    expect(() => normalizeMatrixActivity({ durationMinutes: -1 })).toThrow();
  });

  it('throws for duration over 525600', () => {
    expect(() => normalizeMatrixActivity({ durationMinutes: 999999 })).toThrow();
  });

  it('accepts null for duration via empty string', () => {
    const a = normalizeMatrixActivity({ durationMinutes: '' });
    expect(a.durationMinutes).toBeNull();
  });
});

// ─── matrixActivityFromRecord ─────────────────────────────────────────────────

describe('matrixActivityFromRecord', () => {
  it('returns null for empty record', () => {
    expect(matrixActivityFromRecord({})).toBeNull();
  });

  it('returns activity when owner is set', () => {
    const a = matrixActivityFromRecord({ owner: 'Sales' });
    expect(a).not.toBeNull();
    expect(a!.owner).toBe('Sales');
  });

  it('reads from operationalDetails', () => {
    const a = matrixActivityFromRecord({ operationalDetails: { matrixCategory: 'resource', durationMinutes: 30 } });
    expect(a).not.toBeNull();
    expect(a!.category).toBe('resource');
    expect(a!.durationMinutes).toBe(30);
  });
});

// ─── normalizeMatrixConnection ────────────────────────────────────────────────

describe('normalizeMatrixConnection', () => {
  it('creates a sequence connection', () => {
    const link = normalizeMatrixConnection({ a: 'act1', b: 'act2', id: 'link1' });
    expect(link.type).toBe('sequence');
    expect(link.a).toBe('act1');
    expect(link.b).toBe('act2');
  });

  it('defaults unknown type to sequence', () => {
    const link = normalizeMatrixConnection({ a: 'x', b: 'y', type: 'unknown' });
    expect(link.type).toBe('sequence');
  });

  it('throws when a === b', () => {
    expect(() => normalizeMatrixConnection({ a: 'x', b: 'x' })).toThrow();
  });

  it('throws for missing a or b', () => {
    expect(() => normalizeMatrixConnection({ a: '', b: 'y' })).toThrow();
    expect(() => normalizeMatrixConnection({ a: 'x', b: '' })).toThrow();
  });

  it('validates handoff requires fromTeam/toTeam/deliverable', () => {
    expect(() =>
      normalizeMatrixConnection({ a: 'x', b: 'y', type: 'handoff', handoff: { fromTeam: '', toTeam: '', deliverable: '' } })
    ).toThrow();
  });

  it('creates valid handoff connection', () => {
    const link = normalizeMatrixConnection({
      a: 'act1', b: 'act2', type: 'handoff',
      handoff: { fromTeam: 'Sales', toTeam: 'Support', deliverable: 'Contract signed' },
    });
    expect(link.type).toBe('handoff');
    expect((link as unknown as Record<string, unknown>)['handoff']).toBeDefined();
  });
});

// ─── matrixStageGeometry ──────────────────────────────────────────────────────

describe('matrixStageGeometry', () => {
  it('computes geometry for uniform widths', () => {
    const { stages, total } = matrixStageGeometry([100, 100, 100]);
    expect(total).toBe(300);
    expect(stages).toHaveLength(3);
    expect(stages[0]).toEqual({ left: 0, width: 100, center: 50 });
    expect(stages[1]).toEqual({ left: 100, width: 100, center: 150 });
    expect(stages[2]).toEqual({ left: 200, width: 100, center: 250 });
  });

  it('throws for zero or negative width', () => {
    expect(() => matrixStageGeometry([100, 0, 100])).toThrow();
    expect(() => matrixStageGeometry([100, -50, 100])).toThrow();
  });

  it('handles single stage', () => {
    const { stages, total } = matrixStageGeometry([200]);
    expect(total).toBe(200);
    expect(stages[0].center).toBe(100);
  });
});

// ─── normalizeMatrixCardMetadata ──────────────────────────────────────────────

describe('normalizeMatrixCardMetadata', () => {
  it('returns defaults for empty input', () => {
    const m = normalizeMatrixCardMetadata();
    expect(m.personaIds).toEqual([]);
    expect(m.tags).toEqual([]);
    expect(m.tone).toBe('neutral');
  });

  it('normalizes valid tone', () => {
    const m = normalizeMatrixCardMetadata({ tone: 'blue' });
    expect(m.tone).toBe('blue');
  });

  it('defaults invalid tone to neutral', () => {
    const m = normalizeMatrixCardMetadata({ tone: 'rainbow' });
    expect(m.tone).toBe('neutral');
  });

  it('deduplicates tags case-insensitively', () => {
    const m = normalizeMatrixCardMetadata({ tags: ['Hello', 'hello', 'World'] });
    expect(m.tags).toHaveLength(2);
  });

  it('throws when too many personas', () => {
    const ids = Array.from({ length: 21 }, (_, i) => `p${i}`);
    expect(() => normalizeMatrixCardMetadata({ personaIds: ids })).toThrow();
  });
});

// ─── normalizeMatrixCardFilters ───────────────────────────────────────────────

describe('normalizeMatrixCardFilters', () => {
  it('returns defaults for empty input', () => {
    const f = normalizeMatrixCardFilters();
    expect(f.query).toBe('');
    expect(f.type).toBe('');
    expect(f.includeUnassigned).toBe(true);
  });

  it('normalizes valid type', () => {
    const f = normalizeMatrixCardFilters({ type: 'link' });
    expect(f.type).toBe('link');
  });

  it('ignores unknown type', () => {
    const f = normalizeMatrixCardFilters({ type: 'unknown' });
    expect(f.type).toBe('');
  });

  it('respects includeUnassigned: false', () => {
    const f = normalizeMatrixCardFilters({ includeUnassigned: false });
    expect(f.includeUnassigned).toBe(false);
  });
});

// ─── matrixCardMatches ────────────────────────────────────────────────────────

describe('matrixCardMatches', () => {
  it('matches without filters', () => {
    expect(matrixCardMatches({ type: 'card', t: 'Hello' })).toBe(true);
  });

  it('filters by type', () => {
    expect(matrixCardMatches({ type: 'card' }, { type: 'link' })).toBe(false);
    expect(matrixCardMatches({ type: 'link' }, { type: 'link' })).toBe(true);
  });

  it('filters by query in text', () => {
    expect(matrixCardMatches({ type: 'card', t: 'Service Design' }, { query: 'design' })).toBe(true);
    expect(matrixCardMatches({ type: 'card', t: 'Service Design' }, { query: 'pizza' })).toBe(false);
  });

  it('filters by tag case-insensitively', () => {
    expect(matrixCardMatches({ type: 'card', tags: ['UX'] }, { tag: 'ux' })).toBe(true);
    expect(matrixCardMatches({ type: 'card', tags: ['UX'] }, { tag: 'dev' })).toBe(false);
  });

  it('filters by personaId with includeUnassigned', () => {
    // Unassigned card is included when includeUnassigned: true
    expect(matrixCardMatches({ type: 'card' }, { personaId: 'p1', includeUnassigned: true })).toBe(true);
    // Unassigned card is excluded when includeUnassigned: false
    expect(matrixCardMatches({ type: 'card' }, { personaId: 'p1', includeUnassigned: false })).toBe(false);
  });
});

// ─── matrixSafeUrl ────────────────────────────────────────────────────────────

describe('matrixSafeUrl', () => {
  it('returns empty for non-string', () => {
    expect(matrixSafeUrl(null)).toBe('');
    expect(matrixSafeUrl(42)).toBe('');
  });

  it('returns valid HTTPS url', () => {
    expect(matrixSafeUrl('https://example.com/page')).toBe('https://example.com/page');
  });

  it('allows http for non-image', () => {
    expect(matrixSafeUrl('http://example.com')).toBe('http://example.com/');
  });

  it('rejects http for image', () => {
    expect(matrixSafeUrl('http://example.com/img.png', true)).toBe('');
  });

  it('allows valid data URL for image', () => {
    const small = 'data:image/png;base64,abc123=';
    expect(matrixSafeUrl(small, true)).toBe(small);
  });

  it('rejects URL with credentials', () => {
    expect(matrixSafeUrl('https://user:pass@example.com')).toBe('');
  });

  it('rejects very long URL', () => {
    expect(matrixSafeUrl('https://example.com/' + 'a'.repeat(2048))).toBe('');
  });
});

// ─── matrixEmbedUrl ───────────────────────────────────────────────────────────

describe('matrixEmbedUrl', () => {
  it('returns empty for non-embeddable URL', () => {
    expect(matrixEmbedUrl('https://example.com')).toBe('');
  });

  it('returns YouTube nocookie embed for youtu.be', () => {
    const url = matrixEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('returns YouTube nocookie embed for youtube.com', () => {
    const url = matrixEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  });

  it('returns Vimeo embed URL', () => {
    const url = matrixEmbedUrl('https://vimeo.com/123456789');
    expect(url).toBe('https://player.vimeo.com/video/123456789');
  });

  it('returns Figma embed URL', () => {
    const url = matrixEmbedUrl('https://www.figma.com/file/abc123/Design');
    expect(url).toContain('figma.com/embed');
  });

  it('returns empty for data URL', () => {
    expect(matrixEmbedUrl('data:image/png;base64,abc')).toBe('');
  });
});

// ─── normalizeMatrixScale ─────────────────────────────────────────────────────

describe('normalizeMatrixScale', () => {
  it('returns valid scale with defaults', () => {
    const s = normalizeMatrixScale({ min: 0, max: 10, step: 1 });
    expect(s.min).toBe(0);
    expect(s.max).toBe(10);
    expect(s.step).toBe(1);
    expect(s.value).toBeUndefined();
  });

  it('throws when min >= max', () => {
    expect(() => normalizeMatrixScale({ min: 5, max: 5, step: 1 })).toThrow();
  });

  it('throws when step > range', () => {
    expect(() => normalizeMatrixScale({ min: 0, max: 5, step: 10 })).toThrow();
  });

  it('allows valid value within range', () => {
    const s = normalizeMatrixScale({ min: 0, max: 10, step: 1, value: 5 });
    expect(s.value).toBe(5);
  });

  it('throws for value out of range', () => {
    expect(() => normalizeMatrixScale({ min: 0, max: 10, step: 1, value: 15 })).toThrow();
  });

  it('clips labels', () => {
    const s = normalizeMatrixScale({ min: 0, max: 10, step: 1, minLabel: 'Low', maxLabel: 'High' });
    expect(s.minLabel).toBe('Low');
    expect(s.maxLabel).toBe('High');
  });
});

// ─── normalizeMatrixBlock ─────────────────────────────────────────────────────

describe('normalizeMatrixBlock', () => {
  it('normalizes a card block', () => {
    const b = normalizeMatrixBlock({ id: 'b1', type: 'card', text: 'Hello' });
    expect(b.id).toBe('b1');
    expect(b.type).toBe('card');
    expect(b.text).toBe('Hello');
  });

  it('throws when id is missing', () => {
    expect(() => normalizeMatrixBlock({ type: 'card', text: 'Hello' })).toThrow();
  });

  it('throws for link without URL', () => {
    expect(() => normalizeMatrixBlock({ id: 'b1', type: 'link', text: 'No link' })).toThrow();
  });

  it('throws for link without text', () => {
    expect(() => normalizeMatrixBlock({ id: 'b1', type: 'link', url: 'https://example.com', text: '' })).toThrow();
  });

  it('normalizes valid link block', () => {
    const b = normalizeMatrixBlock({ id: 'b1', type: 'link', url: 'https://example.com', text: 'Example' });
    expect((b as unknown as Record<string, unknown>)['url']).toBe('https://example.com/');
  });

  it('throws for reference block without referenceId', () => {
    expect(() => normalizeMatrixBlock({ id: 'b1', type: 'plan' })).toThrow();
  });

  it('normalizes reference block with referenceId', () => {
    const b = normalizeMatrixBlock({ id: 'b1', type: 'plan', referenceId: 'plan-1' });
    expect((b as unknown as Record<string, unknown>)['referenceId']).toBe('plan-1');
  });

  it('defaults unknown type to card', () => {
    const b = normalizeMatrixBlock({ id: 'b1', type: 'unknown' });
    expect(b.type).toBe('card');
  });
});

// ─── normalizeMatrixRow ───────────────────────────────────────────────────────

describe('normalizeMatrixRow', () => {
  it('returns defaults for empty input', () => {
    const r = normalizeMatrixRow();
    expect(r.defaultType).toBe('card');
    expect(r.tone).toBe('neutral');
    expect(r.n).toBe('');
  });

  it('normalizes valid fields', () => {
    const r = normalizeMatrixRow({ n: 'Row Name', tone: 'amber', defaultType: 'text' });
    expect(r.n).toBe('Row Name');
    expect(r.tone).toBe('amber');
    expect(r.defaultType).toBe('text');
  });
});

// ─── validateMatrixDocument ───────────────────────────────────────────────────

describe('validateMatrixDocument', () => {
  it('passes for empty document', () => {
    expect(() => validateMatrixDocument({})).not.toThrow();
  });

  it('passes for valid document', () => {
    const doc = {
      c: {
        'fl|0': [{ id: 'b1', i: 'b1', type: 'card', text: 'Task' }],
      },
    };
    expect(() => validateMatrixDocument(doc)).not.toThrow();
  });

  it('throws when cells exceed 100 items', () => {
    const notes = Array.from({ length: 101 }, (_, i) => ({ id: `b${i}`, i: `b${i}`, type: 'card', text: `Block ${i}` }));
    expect(() => validateMatrixDocument({ c: { 'fl|0': notes } })).toThrow();
  });
});

// ─── applyMatrixCardAction ────────────────────────────────────────────────────

describe('applyMatrixCardAction', () => {
  const cells = {
    'fl|0': [
      { id: 'b1', i: 'b1', type: 'card', text: 'Card 1', tags: [], personaIds: [], tone: 'neutral' },
      { id: 'b2', i: 'b2', type: 'card', text: 'Card 2', tags: [], personaIds: [], tone: 'neutral' },
    ],
  };

  it('removes selected cards', () => {
    const result = applyMatrixCardAction(cells, ['b1'], 'remove');
    expect(result['fl|0']).toHaveLength(1);
    expect(result['fl|0'][0]['id']).toBe('b2');
  });

  it('adds tags to selected cards', () => {
    const result = applyMatrixCardAction(cells, ['b1'], 'tags-add', { tags: ['ux'] });
    const card = result['fl|0'].find(n => n['id'] === 'b1') as Record<string, unknown>;
    expect(card['tags']).toContain('ux');
  });

  it('removes tags from selected cards', () => {
    const c = { 'fl|0': [{ id: 'b1', i: 'b1', type: 'card', text: 'Card 1', tags: ['ux', 'dev'], personaIds: [], tone: 'neutral' }] };
    const result = applyMatrixCardAction(c, ['b1'], 'tags-remove', { tags: ['ux'] });
    const card = result['fl|0'][0] as Record<string, unknown>;
    expect(card['tags']).not.toContain('ux');
    expect(card['tags']).toContain('dev');
  });

  it('sets tone on selected cards', () => {
    const result = applyMatrixCardAction(cells, ['b1'], 'tone', { tone: 'emerald' });
    const card = result['fl|0'].find(n => n['id'] === 'b1') as Record<string, unknown>;
    expect(card['tone']).toBe('emerald');
  });

  it('throws when no cards selected', () => {
    expect(() => applyMatrixCardAction(cells, [], 'tone', { tone: 'blue' })).toThrow();
  });

  it('throws for invalid action', () => {
    expect(() => applyMatrixCardAction(cells, ['b1'], 'unknown-action')).toThrow();
  });

  it('throws when selected id not found', () => {
    expect(() => applyMatrixCardAction(cells, ['missing'], 'tone', { tone: 'blue' })).toThrow();
  });
});

// ─── matrixServiceReferences ───────────────────────────────────────────────────

describe('matrixServiceReferences', () => {
  it('returns empty arrays for empty graph', () => {
    const result = matrixServiceReferences(baseGraph());
    expect(result['channel']).toHaveLength(0);
    expect(result['persona']).toHaveLength(0);
    expect(result['pain']).toHaveLength(0);
  });

  it('includes personas from entities', () => {
    const g: ServiceGraph = {
      ...baseGraph(),
      entities: {
        ...baseGraph().entities,
        persona: { 'p1': { id: 'p1', serviceId: 'S', kind: 'persona', title: 'Alice', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const result = matrixServiceReferences(g);
    expect(result['persona'].some(r => r['id'] === 'p1')).toBe(true);
  });

  it('includes pain from entities', () => {
    const g: ServiceGraph = {
      ...baseGraph(),
      entities: {
        ...baseGraph().entities,
        pain: { 'pa1': { id: 'pa1', serviceId: 'S', kind: 'pain', title: 'Pain 1', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const result = matrixServiceReferences(g);
    expect(result['pain'].some(r => r['id'] === 'pa1')).toBe(true);
  });

  it('includes problems as pain', () => {
    const g: ServiceGraph = {
      ...baseGraph(),
      problems: { 'prob1': { id: 'prob1', serviceId: 'S', description: 'Issue', createdAt: NOW, updatedAt: NOW } as ServiceGraph['problems'][string] },
    };
    const result = matrixServiceReferences(g);
    expect(result['pain'].some(r => r['id'] === 'prob1')).toBe(true);
  });

  it('excludes entities from other services', () => {
    const g: ServiceGraph = {
      ...baseGraph(),
      entities: {
        ...baseGraph().entities,
        persona: { 'p-other': { id: 'p-other', serviceId: 'OTHER', kind: 'persona', title: 'Bob', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const result = matrixServiceReferences(g);
    expect(result['persona'].some(r => r['id'] === 'p-other')).toBe(false);
  });

  it('marks inJourney for persona linked to journey', () => {
    const g: ServiceGraph = {
      ...baseGraph(),
      journeys: { j1: { id: 'j1', serviceId: 'S', name: 'J', status: 'active', stageIds: [], personaId: 'p1', createdAt: NOW, updatedAt: NOW } as ServiceGraph['journeys'][string] },
      entities: {
        ...baseGraph().entities,
        persona: { 'p1': { id: 'p1', serviceId: 'S', kind: 'persona', title: 'Alice', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const result = matrixServiceReferences(g, { journeyId: 'j1' });
    const alice = result['persona'].find(r => r['id'] === 'p1');
    expect(alice?.['inJourney']).toBe(true);
  });
});

// ─── matrixContentFromDocument ────────────────────────────────────────────────

describe('matrixContentFromDocument', () => {
  it('returns empty structure for empty doc', () => {
    const result = matrixContentFromDocument({}, ['s1']);
    expect(result.version).toBe(1);
    expect(result.cells['s1']).toEqual({});
    expect(result.connections).toHaveLength(0);
  });

  it('maps cells from doc columns to stageIds', () => {
    const doc = {
      c: { 'fl|0': [{ i: 'card1', id: 'card1', type: 'card', text: 'Hello', personaIds: [], tags: [], tone: 'neutral' }] },
    };
    const result = matrixContentFromDocument(doc, ['s1']);
    expect(result.cells['s1']['fl']).toHaveLength(1);
    expect(result.cells['s1']['fl'][0].id).toBe('card1');
  });

  it('remaps ids using syncNotes', () => {
    const doc = {
      c: { 'fl|0': [{ i: 'local1', type: 'card', text: 'Card', personaIds: [], tags: [], tone: 'neutral' }] },
    };
    const result = matrixContentFromDocument(doc, ['s1'], { notes: { local1: 'global-id-1' } });
    expect(result.cells['s1']['fl'][0].id).toBe('global-id-1');
  });

  it('ignores columns not matching stageId index', () => {
    const doc = {
      c: {
        'fl|0': [{ i: 'c1', type: 'card', text: 'C1', personaIds: [], tags: [], tone: 'neutral' }],
        'fl|1': [{ i: 'c2', type: 'card', text: 'C2', personaIds: [], tags: [], tone: 'neutral' }],
      },
    };
    // Only stageId 's1' maps to column 0
    const result = matrixContentFromDocument(doc, ['s1']);
    expect(result.cells['s1']['fl']).toHaveLength(1);
  });

  it('extracts rowSettings from doc', () => {
    const doc = {
      rowSettings: { 'custom': { n: 'Custom Row', h: 'Help', icon: '★', defaultType: 'card', tone: 'neutral' } },
      c: {},
    };
    const result = matrixContentFromDocument(doc, ['s1']);
    expect(result.rows['custom']).toBeDefined();
    expect(result.rows['custom'].n).toBe('Custom Row');
  });
});

// ─── restoreMatrixContent ─────────────────────────────────────────────────────

describe('restoreMatrixContent', () => {
  it('returns ref unchanged when stored is null', () => {
    const ref = { c: { 'fl|0': [] }, steps: [] } as Record<string, unknown>;
    const result = restoreMatrixContent(ref, null, ['s1']);
    expect(result).toBe(ref);
  });

  it('restores supplemental row cells from stored content', () => {
    const ref: Record<string, unknown> = { c: { 'sd|0': [] }, steps: [] };
    const stored = {
      cells: { 's1': { 'sd': [{ id: 'note1', type: 'card', text: 'Note', personaIds: [], tags: [], tone: 'neutral' }] } },
    };
    restoreMatrixContent(ref, stored, ['s1']);
    const cells = ref['c'] as Record<string, unknown[]>;
    expect(cells['sd|0']).toHaveLength(1);
  });

  it('merges existing notes from ref with stored metadata', () => {
    const ref: Record<string, unknown> = {
      c: { 'fl|0': [{ i: 'x1', type: 'card', text: 'Title', personaIds: [], tags: [], tone: 'neutral' }] },
      steps: [],
    };
    const stored = {
      cells: { 's1': { 'fl': [{ id: 'x1', type: 'card', text: 'Title Updated', tone: 'blue', personaIds: [], tags: [] }] } },
    };
    restoreMatrixContent(ref, stored, ['s1']);
    const cells = ref['c'] as Record<string, Record<string, unknown>[]>;
    // existing note should be preserved with merged metadata
    expect(cells['fl|0']).toHaveLength(1);
  });

  it('restores connections from stored content', () => {
    const ref: Record<string, unknown> = {
      c: {
        'fl|0': [{ i: 'a1', type: 'card', text: 'A', personaIds: [], tags: [], tone: 'neutral' }],
        'fl|1': [{ i: 'b1', type: 'card', text: 'B', personaIds: [], tags: [], tone: 'neutral' }],
      },
      steps: [],
    };
    const stored = {
      cells: {},
      connections: [{ id: 'conn1', a: 'a1', b: 'b1', type: 'sequence', label: '' }],
    };
    restoreMatrixContent(ref, stored, ['s1', 's2']);
    expect(Array.isArray(ref['links'])).toBe(true);
    expect((ref['links'] as unknown[]).length).toBeGreaterThan(0);
  });
});

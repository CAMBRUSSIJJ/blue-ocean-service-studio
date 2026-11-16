import { describe, it, expect } from 'vitest';
import {
  CANVAS_COMPONENTS,
  CANVAS_GRID,
  CANVAS_STAGE_MIN,
  CANVAS_STAGE_MAX,
  canvasAcceptsRow,
  canvasAcceptsNewRow,
  canvasPlacementHint,
  canvasSafeUrl,
  canvasDimension,
  canvasCardWidth,
  canvasCardHeight,
  canvasKind,
  canvasStageIndex,
  canvasStageWidth,
  canvasEmotionScore,
  canvasEmotionPoint,
  canvasBoundary,
  buildCanvasLayout,
  canvasTitleLines,
  canvasConnectionOffsets,
  canvasEdgeGeometry,
  normalizeCanvasMetadata,
} from '../blueprint-canvas';

// ─── CANVAS_COMPONENTS ────────────────────────────────────────────────────────

describe('CANVAS_COMPONENTS', () => {
  it('has 16 component kinds', () => {
    expect(Object.keys(CANVAS_COMPONENTS)).toHaveLength(16);
  });
  it('customer-action targets row ac', () => {
    expect(CANVAS_COMPONENTS['customer-action'].row).toBe('ac');
  });
  it('channel targets row ch', () => {
    expect(CANVAS_COMPONENTS.channel.row).toBe('ch');
  });
  it('channel spans all rows (wildcard)', () => {
    expect(CANVAS_COMPONENTS.channel.rows).toContain('*');
  });
  it('metric spans specific rows, not wildcard', () => {
    expect(CANVAS_COMPONENTS.metric.rows).toContain('sy');
    expect(CANVAS_COMPONENTS.metric.rows).toContain('ac');
  });
});

// ─── canvasAcceptsRow ─────────────────────────────────────────────────────────

describe('canvasAcceptsRow', () => {
  it('channel (wildcard) accepts any row', () => {
    expect(canvasAcceptsRow('channel', 'bk')).toBe(true);
    expect(canvasAcceptsRow('channel', 'ev')).toBe(true);
  });
  it('artifact is restricted to ev', () => {
    expect(canvasAcceptsRow('artifact', 'ev')).toBe(true);
    expect(canvasAcceptsRow('artifact', 'ac')).toBe(false);
  });
  it('returns false for unknown kind', () => {
    expect(canvasAcceptsRow('ghost-kind', 'ac')).toBe(false);
  });
  it('customer-action accepts ac and fl', () => {
    expect(canvasAcceptsRow('customer-action', 'ac')).toBe(true);
    expect(canvasAcceptsRow('customer-action', 'fl')).toBe(true);
  });
});

// ─── canvasAcceptsNewRow ──────────────────────────────────────────────────────

describe('canvasAcceptsNewRow', () => {
  it('customer-action new placements restricted to ac', () => {
    expect(canvasAcceptsNewRow('customer-action', 'ac')).toBe(true);
    expect(canvasAcceptsNewRow('customer-action', 'fl')).toBe(false);
  });
  it('activity new placements excluded from ac', () => {
    expect(canvasAcceptsNewRow('activity', 'fl')).toBe(true);
    expect(canvasAcceptsNewRow('activity', 'ac')).toBe(false);
  });
  it('channel (wildcard) still accepted anywhere with new placement', () => {
    expect(canvasAcceptsNewRow('channel', 'bk')).toBe(true);
  });
});

// ─── canvasPlacementHint ──────────────────────────────────────────────────────

describe('canvasPlacementHint', () => {
  it('returns Portuguese message for customer-action not in ac', () => {
    const hint = canvasPlacementHint('customer-action', 'bk');
    expect(hint).toContain('Ação do cliente');
  });
  it('returns Portuguese message for activity in ac', () => {
    const hint = canvasPlacementHint('activity', 'ac');
    expect(hint).toContain('Atividade');
  });
  it('returns generic hint for other mismatches', () => {
    const hint = canvasPlacementHint('artifact', 'bk');
    expect(hint.length).toBeGreaterThan(10);
  });
});

// ─── canvasSafeUrl ────────────────────────────────────────────────────────────

describe('canvasSafeUrl', () => {
  it('passes through valid https URLs', () => {
    expect(canvasSafeUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
  });
  it('passes through http URLs', () => {
    expect(canvasSafeUrl('http://example.com')).toBeTruthy();
  });
  it('rejects javascript: protocol', () => {
    expect(canvasSafeUrl('javascript:alert(1)')).toBe('');
  });
  it('rejects non-string values', () => {
    expect(canvasSafeUrl(null)).toBe('');
    expect(canvasSafeUrl(42)).toBe('');
  });
  it('returns empty for empty string', () => {
    expect(canvasSafeUrl('')).toBe('');
  });
  it('rejects invalid URL', () => {
    expect(canvasSafeUrl('not a url')).toBe('');
  });
});

// ─── canvasDimension ─────────────────────────────────────────────────────────

describe('canvasDimension', () => {
  it('returns null for null input', () => {
    expect(canvasDimension(null, 100, 500)).toBeNull();
  });
  it('returns null for empty string', () => {
    expect(canvasDimension('', 100, 500)).toBeNull();
  });
  it('clamps to minimum', () => {
    expect(canvasDimension(50, 100, 500)).toBe(100);
  });
  it('clamps to maximum', () => {
    expect(canvasDimension(600, 100, 500)).toBe(500);
  });
  it('rounds to integer', () => {
    expect(canvasDimension(123.7, 100, 500)).toBe(124);
  });
  it('returns null for NaN string', () => {
    expect(canvasDimension('abc', 100, 500)).toBeNull();
  });
});

// ─── canvasCardWidth ─────────────────────────────────────────────────────────

describe('canvasCardWidth', () => {
  it('returns default card width for no canvas metadata', () => {
    expect(canvasCardWidth()).toBe(CANVAS_GRID.cardWidth);
  });
  it('applies custom width from canvas metadata', () => {
    const note = { canvas: { width: 200 } };
    const result = canvasCardWidth(note, 400);
    expect(result).toBe(200);
  });
  it('limits card width to stage width minus margin', () => {
    // stage is 300, so max is 300 - 28 = 272; custom width 500 clamped
    const note = { canvas: { width: 500 } };
    const result = canvasCardWidth(note, 300);
    expect(result).toBe(272);
  });
});

// ─── canvasCardHeight ─────────────────────────────────────────────────────────

describe('canvasCardHeight', () => {
  it('returns default height for plain note', () => {
    expect(canvasCardHeight()).toBe(CANVAS_GRID.cardHeight);
  });
  it('channel row returns smaller height', () => {
    const note = { canvas: { kind: 'channel' } };
    expect(canvasCardHeight(note, 'ch')).toBe(88);
  });
  it('text kind returns 98', () => {
    const note = { canvas: { kind: 'text' } };
    expect(canvasCardHeight(note, 'sd')).toBe(98);
  });
  it('artifact with valid image URL returns taller height', () => {
    const note = { canvas: { kind: 'artifact', imageUrl: 'https://example.com/img.png' } };
    expect(canvasCardHeight(note, 'ev')).toBe(164);
  });
  it('applies custom height from canvas metadata', () => {
    const note = { canvas: { height: 200 } };
    expect(canvasCardHeight(note)).toBe(200);
  });
});

// ─── canvasKind ───────────────────────────────────────────────────────────────

describe('canvasKind', () => {
  it('uses explicit canvas kind when present', () => {
    const note = { canvas: { kind: 'metric' } };
    expect(canvasKind(note, 'sy')).toBe('metric');
  });
  it('falls back to metric for type=metric', () => {
    const note = { type: 'metric' };
    expect(canvasKind(note, 'sy')).toBe('metric');
  });
  it('touchpoint host resolves to touchpoint', () => {
    const note = { hostKind: 'touchpoint' };
    expect(canvasKind(note, 'ac')).toBe('touchpoint');
  });
  it('resource host resolves to resource', () => {
    const note = { hostKind: 'resource' };
    expect(canvasKind(note, 'sy')).toBe('resource');
  });
  it('ev row without special type resolves to artifact', () => {
    const note = { type: 'activity' };
    expect(canvasKind(note, 'ev')).toBe('artifact');
  });
  it('sy row without support-process category resolves to system', () => {
    const note = { activity: { category: 'activity' } };
    expect(canvasKind(note, 'sy')).toBe('system');
  });
  it('falls back to activity for other rows', () => {
    expect(canvasKind({}, 'bk')).toBe('activity');
  });
});

// ─── canvasStageIndex ─────────────────────────────────────────────────────────

describe('canvasStageIndex', () => {
  const doc = { steps: [{ hostStageId: 'st1', hostLocalId: 'l1' }, { hostStageId: 'st2', hostLocalId: 'l2' }] };

  it('finds stage index by stageId', () => {
    expect(canvasStageIndex(doc, { stageId: 'st2' })).toBe(1);
  });
  it('finds stage index by stageLocalId', () => {
    expect(canvasStageIndex(doc, { stageLocalId: 'l1' })).toBe(0);
  });
  it('throws for missing stage', () => {
    expect(() => canvasStageIndex(doc, { stageId: 'ghost' })).toThrow();
  });
});

// ─── canvasStageWidth ─────────────────────────────────────────────────────────

describe('canvasStageWidth', () => {
  it('clamps to minimum', () => {
    expect(canvasStageWidth(50)).toBe(CANVAS_STAGE_MIN);
  });
  it('clamps to maximum', () => {
    expect(canvasStageWidth(1000)).toBe(CANVAS_STAGE_MAX);
  });
  it('returns fallback for null', () => {
    expect(canvasStageWidth(null, 400)).toBe(400);
  });
  it('passes through valid width', () => {
    expect(canvasStageWidth(300)).toBe(300);
  });
});

// ─── canvasEmotionScore ───────────────────────────────────────────────────────

describe('canvasEmotionScore', () => {
  it('passes through valid score', () => {
    expect(canvasEmotionScore({ e: 1 })).toBe(1);
  });
  it('clamps to -2', () => {
    expect(canvasEmotionScore({ e: -5 })).toBe(-2);
  });
  it('clamps to 2', () => {
    expect(canvasEmotionScore({ e: 10 })).toBe(2);
  });
  it('rounds to integer', () => {
    expect(canvasEmotionScore({ e: 1.6 })).toBe(2);
  });
  it('defaults to 0 for empty step', () => {
    expect(canvasEmotionScore({})).toBe(0);
  });
});

// ─── canvasEmotionPoint ───────────────────────────────────────────────────────

describe('canvasEmotionPoint', () => {
  it('centers x at mid-stage', () => {
    const point = canvasEmotionPoint({ x: 100, width: 200, step: { e: 0 } }, { y: 0 });
    expect(point.x).toBe(200); // 100 + 200/2
  });
  it('higher score yields lower y value', () => {
    const happy = canvasEmotionPoint({ x: 0, width: 200, step: { e: 2 } }, { y: 0 });
    const sad = canvasEmotionPoint({ x: 0, width: 200, step: { e: -2 } }, { y: 0 });
    expect(happy.y).toBeLessThan(sad.y);
  });
});

// ─── canvasBoundary ───────────────────────────────────────────────────────────

describe('canvasBoundary', () => {
  const rows = [
    { id: 'ac', n: 'Actions' },
    { id: 'fl', n: 'Frontstage' },
    { id: 'bk', n: 'Backstage' },
    { id: 'sy', n: 'Systems' },
  ];

  it('returns boundary label for fl row after ac', () => {
    const result = canvasBoundary(rows[1], 1, rows);
    expect(result).toContain('interação');
  });
  it('returns boundary label for bk row after fl', () => {
    const result = canvasBoundary(rows[2], 2, rows);
    expect(result).toContain('visibilidade');
  });
  it('returns empty for non-boundary row', () => {
    expect(canvasBoundary(rows[0], 0, rows)).toBe('');
  });
});

// ─── canvasTitleLines ─────────────────────────────────────────────────────────

describe('canvasTitleLines', () => {
  it('returns single line for short title', () => {
    expect(canvasTitleLines('Hello')).toEqual(['Hello']);
  });
  it('wraps long title to two lines', () => {
    const lines = canvasTitleLines('This is a moderately long title that wraps');
    expect(lines).toHaveLength(2);
  });
  it('truncates to maxLines', () => {
    const lines = canvasTitleLines('One Two Three Four Five Six Seven Eight', 10, 2);
    expect(lines).toHaveLength(2);
  });
  it('adds ellipsis when truncated', () => {
    const lines = canvasTitleLines('one two three four five six seven eight nine', 10, 2);
    expect(lines[lines.length - 1]).toMatch(/…$/);
  });
});

// ─── canvasConnectionOffsets ──────────────────────────────────────────────────

describe('canvasConnectionOffsets', () => {
  it('returns empty map for no links', () => {
    expect(canvasConnectionOffsets([]).size).toBe(0);
  });
  it('single link gets offset 0', () => {
    const links = [{ id: 'l1', a: 'n1', b: 'n2' }];
    const map = canvasConnectionOffsets(links);
    expect(map.get('l1')).toBe(0);
  });
  it('two parallel links get symmetric offsets', () => {
    const links = [
      { id: 'l1', a: 'n1', b: 'n2' },
      { id: 'l2', a: 'n1', b: 'n2' },
    ];
    const map = canvasConnectionOffsets(links);
    const o1 = map.get('l1')!, o2 = map.get('l2')!;
    expect(o1).not.toBe(0);
    expect(o1 + o2).toBeCloseTo(0); // symmetric around zero
  });
});

// ─── canvasEdgeGeometry ───────────────────────────────────────────────────────

describe('canvasEdgeGeometry', () => {
  const makeNode = (id: string, row: string, stageIndex: number, x: number, y: number, w = 100, h = 80) =>
    ({ id, row, stageIndex, x, y, width: w, height: h, note: {}, position: 0, key: row + '|' + stageIndex } as Parameters<typeof canvasEdgeGeometry>[0]);

  it('returns SVG path string for same-row nodes', () => {
    const a = makeNode('a', 'fl', 0, 100, 100);
    const b = makeNode('b', 'fl', 1, 300, 100);
    const { d } = canvasEdgeGeometry(a, b);
    expect(d).toMatch(/^M /);
  });
  it('returns SVG path string for same-stage nodes', () => {
    const a = makeNode('a', 'ac', 0, 100, 50);
    const b = makeNode('b', 'fl', 0, 100, 150);
    const { d } = canvasEdgeGeometry(a, b);
    expect(d).toMatch(/^M /);
  });
  it('applies offset for staggered connections', () => {
    const a = makeNode('a', 'fl', 0, 100, 100);
    const b = makeNode('b', 'bk', 1, 300, 200);
    const r0 = canvasEdgeGeometry(a, b, 0);
    const r9 = canvasEdgeGeometry(a, b, 9);
    expect(r0.d).not.toBe(r9.d);
  });
});

// ─── normalizeCanvasMetadata ──────────────────────────────────────────────────

describe('normalizeCanvasMetadata', () => {
  it('throws for unknown kind', () => {
    expect(() => normalizeCanvasMetadata({ kind: 'ghost' })).toThrow();
  });
  it('normalizes valid kind with defaults', () => {
    const m = normalizeCanvasMetadata({ kind: 'metric' });
    expect(m.kind).toBe('metric');
    expect(m.tone).toBe('default');
    expect(m.evidenceType).toBe('physical');
    expect(m.width).toBeNull();
  });
  it('falls back invalid tone to default', () => {
    const m = normalizeCanvasMetadata({ kind: 'activity', tone: 'rainbow' });
    expect(m.tone).toBe('default');
  });
  it('accepts valid tone', () => {
    const m = normalizeCanvasMetadata({ kind: 'activity', tone: 'amber' });
    expect(m.tone).toBe('amber');
  });
  it('sanitizes imageUrl', () => {
    const m = normalizeCanvasMetadata({ kind: 'artifact', imageUrl: 'javascript:alert()' });
    expect(m.imageUrl).toBe('');
  });
  it('falls back iconKey to kind when invalid', () => {
    const m = normalizeCanvasMetadata({ kind: 'metric', iconKey: 'ghost' });
    expect(m.iconKey).toBe('metric');
  });
});

// ─── buildCanvasLayout ────────────────────────────────────────────────────────

describe('buildCanvasLayout', () => {
  const doc = {
    title: 'Test map',
    steps: [
      { n: 'Stage 1', e: 0, emotionRecorded: false },
      { n: 'Stage 2', e: 1, emotionRecorded: true },
    ],
    c: { 'ac|0': [{ i: 'n1', t: 'Action', canvas: { kind: 'customer-action' } }], 'em|1': [{ i: 'em1', virtualLabel: false }] },
    links: [],
    iss: [],
  };
  const defs = [
    { id: 'ac', n: 'Ações' },
    { id: 'em', n: 'Emoção' },
    { id: 'fl', n: 'Frontstage' },
  ];

  it('returns stages with correct count', () => {
    const layout = buildCanvasLayout(doc, defs);
    expect(layout.stages).toHaveLength(2);
  });
  it('returns rows for all definitions', () => {
    const layout = buildCanvasLayout(doc, defs);
    expect(layout.rows).toHaveLength(3);
  });
  it('total width is greater than label offset', () => {
    const layout = buildCanvasLayout(doc, defs);
    expect(layout.width).toBeGreaterThan(CANVAS_GRID.label);
  });
  it('nodes contains card for ac|0', () => {
    const layout = buildCanvasLayout(doc, defs);
    const node = layout.nodes.find(n => n.id === 'n1');
    expect(node).toBeDefined();
    expect(node?.row).toBe('ac');
  });
});

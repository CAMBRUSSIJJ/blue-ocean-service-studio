import { describe, it, expect } from 'vitest';
import {
  cardsInCell,
  setCellCards,
  addCellCard,
  editCellCard,
  removeCellCard,
  moveJourneyCard,
  duplicateCellCard,
  formatCardText,
} from '../journey-card-operations';
import type { JourneyCard, JourneyLane } from '../model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeLane(overrides: Partial<JourneyLane> = {}): JourneyLane {
  return {
    id: 'lane-1',
    type: 'text',
    label: 'Lane',
    tone: 'blue',
    cards: {},
    height: 164,
    ...overrides,
  } as JourneyLane;
}

function card(id: string, content = ''): JourneyCard {
  return { id, content };
}

// ─── cardsInCell ─────────────────────────────────────────────────────────────

describe('cardsInCell', () => {
  it('retorna [] para lane sem nada', () => {
    const lane = makeLane();
    expect(cardsInCell(lane, 'stage-1')).toEqual([]);
  });

  it('retorna cards de cardItems quando existe', () => {
    const lane = makeLane({ cardItems: { 'stage-1': [card('c1', 'olá')] } });
    expect(cardsInCell(lane, 'stage-1')).toEqual([{ id: 'c1', content: 'olá' }]);
  });

  it('prefere cardItems sobre legacy cards quando ambos existem', () => {
    const lane = makeLane({
      cardItems: { 'stage-1': [card('c1', 'novo')] },
      cards: { 'stage-1': 'antigo' },
    });
    expect(cardsInCell(lane, 'stage-1')).toEqual([{ id: 'c1', content: 'novo' }]);
  });

  it('retorna card sintético para texto legacy', () => {
    const lane = makeLane({ cards: { 'stage-1': 'texto legado' } });
    const result = cardsInCell(lane, 'stage-1');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('texto legado');
    expect(result[0].id).toMatch(/legacy/);
  });

  it('retorna [] para stage sem entrada em cardItems (key inexistente)', () => {
    const lane = makeLane({ cardItems: { 'stage-2': [card('c2')] } });
    expect(cardsInCell(lane, 'stage-1')).toEqual([]);
  });

  it('retorna [] para cardItems com entry explicitamente vazia', () => {
    const lane = makeLane({ cardItems: { 'stage-1': [] } });
    expect(cardsInCell(lane, 'stage-1')).toEqual([]);
  });
});

// ─── setCellCards ─────────────────────────────────────────────────────────────

describe('setCellCards', () => {
  it('escreve cardItems e atualiza legacy cards', () => {
    const lane = makeLane();
    const next = setCellCards(lane, 'stage-1', [card('c1', 'a'), card('c2', 'b')]);
    expect(next.cardItems?.['stage-1']).toEqual([{ id: 'c1', content: 'a' }, { id: 'c2', content: 'b' }]);
    expect(next.cards?.['stage-1']).toBe('a\nb');
  });

  it('lista vazia resulta em texto vazio no legacy', () => {
    const lane = makeLane();
    const next = setCellCards(lane, 'stage-1', []);
    expect(next.cardItems?.['stage-1']).toEqual([]);
    expect(next.cards?.['stage-1']).toBe('');
  });

  it('não muta a lane original', () => {
    const lane = makeLane();
    setCellCards(lane, 'stage-1', [card('c1')]);
    expect(lane.cardItems).toBeUndefined();
  });
});

// ─── addCellCard ──────────────────────────────────────────────────────────────

describe('addCellCard', () => {
  it('adiciona card vazio ao final', () => {
    const lane = makeLane({ cardItems: { 'stage-1': [card('c1', 'x')] } });
    const next = addCellCard(lane, 'stage-1', 'c2');
    const cards = next.cardItems?.['stage-1'] ?? [];
    expect(cards).toHaveLength(2);
    expect(cards[1]).toEqual({ id: 'c2', content: '' });
  });

  it('cria célula nova quando stage não existe', () => {
    const lane = makeLane();
    const next = addCellCard(lane, 'stage-1', 'c1');
    expect(next.cardItems?.['stage-1']).toEqual([{ id: 'c1', content: '' }]);
  });
});

// ─── editCellCard ─────────────────────────────────────────────────────────────

describe('editCellCard', () => {
  it('atualiza conteúdo do card correto', () => {
    const lane = makeLane({ cardItems: { 'stage-1': [card('c1', 'antes'), card('c2', 'intacto')] } });
    const next = editCellCard(lane, 'stage-1', 'c1', 'depois');
    const cards = next.cardItems?.['stage-1'] ?? [];
    expect(cards[0].content).toBe('depois');
    expect(cards[1].content).toBe('intacto');
  });

  it('não muta a lane original', () => {
    const lane = makeLane({ cardItems: { 'stage-1': [card('c1', 'x')] } });
    editCellCard(lane, 'stage-1', 'c1', 'y');
    expect(lane.cardItems?.['stage-1'][0].content).toBe('x');
  });
});

// ─── removeCellCard ───────────────────────────────────────────────────────────

describe('removeCellCard', () => {
  it('remove o card pelo id', () => {
    const lane = makeLane({ cardItems: { 'stage-1': [card('c1'), card('c2')] } });
    const next = removeCellCard(lane, 'stage-1', 'c1');
    const cards = next.cardItems?.['stage-1'] ?? [];
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('c2');
  });

  it('id inexistente retorna lista inalterada', () => {
    const lane = makeLane({ cardItems: { 'stage-1': [card('c1')] } });
    const next = removeCellCard(lane, 'stage-1', 'nope');
    expect(next.cardItems?.['stage-1']).toHaveLength(1);
  });
});

// ─── moveJourneyCard ──────────────────────────────────────────────────────────

describe('moveJourneyCard', () => {
  function lanes(...types: Array<JourneyLane['type']>): JourneyLane[] {
    return types.map((type, i) => ({
      id: `lane-${i + 1}`,
      type,
      label: `Lane ${i + 1}`,
      tone: 'blue' as const,
      height: 164,
      cards: {},
    } as JourneyLane));
  }

  it('move card para outra célula na mesma lane', () => {
    const ls = [makeLane({ id: 'l1', type: 'text', cardItems: { 'stage-1': [card('c1')] } })];
    const result = moveJourneyCard(ls, 'l1', 'stage-1', 'c1', 'l1', 'stage-2');
    expect(cardsInCell(result[0], 'stage-1')).toHaveLength(0);
    expect(cardsInCell(result[0], 'stage-2')).toHaveLength(1);
  });

  it('move card entre lanes diferentes', () => {
    const ls = [
      makeLane({ id: 'l1', type: 'text', cardItems: { 's1': [card('c1')] } }),
      makeLane({ id: 'l2', type: 'text', cardItems: {} }),
    ];
    const result = moveJourneyCard(ls, 'l1', 's1', 'c1', 'l2', 's1');
    expect(cardsInCell(result[0], 's1')).toHaveLength(0);
    expect(cardsInCell(result[1], 's1')).toHaveLength(1);
  });

  it('rejeita quando card não existe na origem', () => {
    const ls = [makeLane({ id: 'l1', type: 'text' })];
    const result = moveJourneyCard(ls, 'l1', 's1', 'nope', 'l1', 's2');
    expect(result).toBe(ls);
  });

  it('rejeita quando lane tem binding (texto canônico)', () => {
    const ls = [
      makeLane({ id: 'l1', type: 'text', binding: 'customerAction', cardItems: { 's1': [card('c1')] } }),
      makeLane({ id: 'l2', type: 'text' }),
    ];
    const result = moveJourneyCard(ls, 'l1', 's1', 'c1', 'l2', 's1');
    expect(result).toBe(ls);
  });

  it('rejeita movida para lane do tipo divider', () => {
    const ls = [
      makeLane({ id: 'l1', type: 'text', cardItems: { 's1': [card('c1')] } }),
      ...lanes('divider'),
    ].map((l, i) => ({ ...l, id: `l${i + 1}` }));
    const result = moveJourneyCard(ls, 'l1', 's1', 'c1', 'l2', 's1');
    expect(result).toBe(ls);
  });

  it('insere na posição target correta', () => {
    const ls = [makeLane({
      id: 'l1',
      type: 'text',
      cardItems: { 's1': [card('c1', 'a'), card('c2', 'b'), card('c3', 'c')] },
    })];
    const result = moveJourneyCard(ls, 'l1', 's1', 'c3', 'l1', 's1', 0);
    const cards = cardsInCell(result[0], 's1');
    expect(cards[0].id).toBe('c3');
    expect(cards[1].id).toBe('c1');
  });

  it('rejeita quando lane origem não existe', () => {
    const ls = [makeLane({ id: 'l1', type: 'text' })];
    const result = moveJourneyCard(ls, 'nope', 's1', 'c1', 'l1', 's1');
    expect(result).toBe(ls);
  });
});

// ─── duplicateCellCard ────────────────────────────────────────────────────────

describe('duplicateCellCard', () => {
  it('duplica card logo após o original', () => {
    const lane = makeLane({ cardItems: { 's1': [card('c1', 'x'), card('c2', 'y')] } });
    const next = duplicateCellCard(lane, 's1', 'c1', 'c3');
    const cards = next.cardItems?.['s1'] ?? [];
    expect(cards).toHaveLength(3);
    expect(cards[0].id).toBe('c1');
    expect(cards[1].id).toBe('c3');
    expect(cards[1].content).toBe('x');
    expect(cards[2].id).toBe('c2');
  });

  it('retorna lane inalterada se card não existe', () => {
    const lane = makeLane({ cardItems: { 's1': [card('c1')] } });
    const next = duplicateCellCard(lane, 's1', 'nope', 'c2');
    expect(next).toBe(lane);
  });

  it('retorna lane inalterada se novo id já existe', () => {
    const lane = makeLane({ cardItems: { 's1': [card('c1'), card('c2')] } });
    const next = duplicateCellCard(lane, 's1', 'c1', 'c2');
    expect(next).toBe(lane);
  });
});

// ─── formatCardText ───────────────────────────────────────────────────────────

describe('formatCardText', () => {
  it('bold — sem seleção usa placeholder "texto"', () => {
    const r = formatCardText('', 0, 0, 'bold');
    expect(r.content).toBe('**texto**');
  });

  it('bold — envolve seleção', () => {
    const content = 'olá mundo';
    const r = formatCardText(content, 4, 9, 'bold');
    expect(r.content).toBe('olá **mundo**');
  });

  it('italic — envolve seleção', () => {
    const r = formatCardText('abc', 0, 3, 'italic');
    expect(r.content).toBe('*abc*');
  });

  it('list — adiciona "- " a cada linha', () => {
    const r = formatCardText('a\nb', 0, 3, 'list');
    expect(r.content).toBe('- a\n- b');
  });

  it('list — seleção vazia adiciona "- " (placeholder é fallback morto)', () => {
    // ''.split('\n').map(l => '- ' + l) => ['- '] — truthy, || '- Item' nunca dispara
    const r = formatCardText('x', 1, 1, 'list');
    expect(r.content).toBe('x- ');
  });

  it('link — envolve seleção', () => {
    const r = formatCardText('texto', 0, 5, 'link');
    expect(r.content).toBe('[texto](https://)');
  });

  it('link — sem seleção usa placeholder "link"', () => {
    const r = formatCardText('', 0, 0, 'link');
    expect(r.content).toBe('[link](https://)');
  });

  it('retorna posições start/end apontando para o replacement completo', () => {
    const r = formatCardText('hello', 0, 5, 'bold');
    expect(r.start).toBe(0);
    expect(r.end).toBe(r.content.length);
  });

  it('clampeia posições fora dos limites', () => {
    const r = formatCardText('ab', -99, 999, 'bold');
    expect(r.content).toBe('**ab**');
  });
});

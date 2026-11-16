import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../graph-operations';
import { applyJourneyStarter } from '../journey-starter';
import {
  updateJourneyLayout,
  reorderJourneyLane,
  duplicateJourneyLane,
} from '../journey-layout-operations';
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
import type { Journey, JourneyLane } from '../model';

// ─── helpers ─────────────────────────────────────────────────────────────────

let _seq = 0;
const id = (kind: string) => `${kind}-${++_seq}`;

function makeLane(overrides?: Partial<JourneyLane>): JourneyLane {
  return {
    id: id('lane'),
    type: 'text',
    label: 'Lane',
    cards: {},
    ...overrides,
  };
}

function graphWithJourney() {
  const base = createServiceGraph('Serviço Teste');
  const journeyId = id('journey');
  const graph = {
    ...base,
    service: { ...base.service, journeyIds: [journeyId] },
    journeys: {
      [journeyId]: {
        id: journeyId,
        serviceId: base.service.id,
        name: 'Jornada Teste',
        stageIds: [] as string[],
        status: 'draft' as const,
      } as Journey,
    },
  };
  return { graph, journeyId };
}

// ─── applyJourneyStarter ──────────────────────────────────────────────────────

describe('applyJourneyStarter', () => {
  it('retorna o grafo intacto se journeyId não existir', () => {
    const { graph } = graphWithJourney();
    const result = applyJourneyStarter(graph, 'id-inexistente', id);
    expect(result).toBe(graph);
  });

  it('cria 3 estágios padrão quando a jornada está vazia', () => {
    const { graph, journeyId } = graphWithJourney();
    const result = applyJourneyStarter(graph, journeyId, id);
    const journey = result.journeys[journeyId];
    expect(journey.stageIds).toHaveLength(3);
    const titles = journey.stageIds.map(sid => result.stages[sid].title);
    expect(titles).toEqual(['Antes', 'Durante', 'Depois']);
  });

  it('não adiciona estágios extras se a jornada já tiver estágios', () => {
    const { graph, journeyId } = graphWithJourney();
    const withStages = applyJourneyStarter(graph, journeyId, id);
    const stageCount = withStages.journeys[journeyId].stageIds.length;
    // Aplicar novamente não deve duplicar
    const again = applyJourneyStarter(withStages, journeyId, id);
    expect(again.journeys[journeyId].stageIds).toHaveLength(stageCount);
  });

  it('cria as 3 lanes essenciais (customerAction, thoughts, emotion)', () => {
    const { graph, journeyId } = graphWithJourney();
    const result = applyJourneyStarter(graph, journeyId, id);
    const lanes = result.journeys[journeyId].mapLayout?.lanes ?? [];
    expect(lanes.some(l => l.binding === 'customerAction')).toBe(true);
    expect(lanes.some(l => l.binding === 'thoughts')).toBe(true);
    expect(lanes.some(l => l.type === 'emotion')).toBe(true);
  });

  it('não duplica lanes se já existirem', () => {
    const { graph, journeyId } = graphWithJourney();
    const first = applyJourneyStarter(graph, journeyId, id);
    const second = applyJourneyStarter(first, journeyId, id);
    const lanes = second.journeys[journeyId].mapLayout?.lanes ?? [];
    const customerActionLanes = lanes.filter(l => l.binding === 'customerAction');
    expect(customerActionLanes).toHaveLength(1);
  });

  it('marca introDismissed como true', () => {
    const { graph, journeyId } = graphWithJourney();
    const result = applyJourneyStarter(graph, journeyId, id);
    expect(result.journeys[journeyId].mapLayout?.introDismissed).toBe(true);
  });

  it('atualiza updatedAt no service e na jornada', () => {
    const { graph, journeyId } = graphWithJourney();
    const before = graph.service.updatedAt;
    const result = applyJourneyStarter(graph, journeyId, id, '2030-01-01T00:00:00.000Z');
    expect(result.journeys[journeyId].updatedAt).toBe('2030-01-01T00:00:00.000Z');
    expect(result.service.updatedAt).toBe('2030-01-01T00:00:00.000Z');
    expect(result.service.updatedAt).not.toBe(before);
  });

  it('não muta o grafo original', () => {
    const { graph, journeyId } = graphWithJourney();
    const stagesBefore = { ...graph.stages };
    applyJourneyStarter(graph, journeyId, id);
    expect(graph.stages).toEqual(stagesBefore);
  });
});

// ─── updateJourneyLayout ──────────────────────────────────────────────────────

describe('updateJourneyLayout', () => {
  it('retorna o grafo intacto se journeyId não existir', () => {
    const { graph } = graphWithJourney();
    const result = updateJourneyLayout(graph, 'id-inexistente', l => l);
    expect(result).toBe(graph);
  });

  it('aplica a transformação no layout', () => {
    const { graph, journeyId } = graphWithJourney();
    const result = updateJourneyLayout(graph, journeyId, l => ({ ...l, stageWidth: 220 }));
    expect(result.journeys[journeyId].mapLayout?.stageWidth).toBe(220);
  });

  it('retorna o grafo intacto quando a transformação retorna o mesmo objeto', () => {
    const { graph, journeyId } = graphWithJourney();
    const withLayout = updateJourneyLayout(graph, journeyId, l => ({ ...l }));
    const result = updateJourneyLayout(withLayout, journeyId, l => l);
    expect(result).toBe(withLayout);
  });

  it('usa layout vazio como base quando mapLayout é undefined', () => {
    const { graph, journeyId } = graphWithJourney();
    // A jornada nova não tem mapLayout
    expect(graph.journeys[journeyId].mapLayout).toBeUndefined();
    const result = updateJourneyLayout(graph, journeyId, l => ({ ...l, stageWidth: 180 }));
    expect(result.journeys[journeyId].mapLayout?.stageWidth).toBe(180);
  });
});

// ─── reorderJourneyLane ───────────────────────────────────────────────────────

describe('reorderJourneyLane', () => {
  it('move uma lane para cima (-1)', () => {
    const a = makeLane({ id: 'a', label: 'A' });
    const b = makeLane({ id: 'b', label: 'B' });
    const result = reorderJourneyLane([a, b], 'b', -1);
    expect(result.map(l => l.id)).toEqual(['b', 'a']);
  });

  it('move uma lane para baixo (+1)', () => {
    const a = makeLane({ id: 'a', label: 'A' });
    const b = makeLane({ id: 'b', label: 'B' });
    const result = reorderJourneyLane([a, b], 'a', 1);
    expect(result.map(l => l.id)).toEqual(['b', 'a']);
  });

  it('retorna o array intacto se laneId não existir', () => {
    const lanes = [makeLane()];
    expect(reorderJourneyLane(lanes, 'nope', 1)).toBe(lanes);
  });

  it('retorna o array intacto se mover além do início', () => {
    const a = makeLane({ id: 'a' });
    const b = makeLane({ id: 'b' });
    const lanes = [a, b];
    const result = reorderJourneyLane(lanes, 'a', -1);
    expect(result).toBe(lanes);
  });

  it('retorna o array intacto se mover além do fim', () => {
    const a = makeLane({ id: 'a' });
    const b = makeLane({ id: 'b' });
    const lanes = [a, b];
    const result = reorderJourneyLane(lanes, 'b', 1);
    expect(result).toBe(lanes);
  });
});

// ─── duplicateJourneyLane ─────────────────────────────────────────────────────

describe('duplicateJourneyLane', () => {
  it('duplica a lane imediatamente após a original', () => {
    const a = makeLane({ id: 'a', label: 'Lane A' });
    const b = makeLane({ id: 'b', label: 'Lane B' });
    const result = duplicateJourneyLane([a, b], 'a', id);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('a');
    expect(result[1].label).toMatch(/Lane A/);
    expect(result[2].id).toBe('b');
  });

  it('o duplicado tem id diferente', () => {
    const a = makeLane({ id: 'a', label: 'L' });
    const result = duplicateJourneyLane([a], 'a', id);
    expect(result[1].id).not.toBe('a');
  });

  it('o duplicado não fica hidden mesmo que o original esteja', () => {
    const a = makeLane({ id: 'a', label: 'L', hidden: true });
    const result = duplicateJourneyLane([a], 'a', id);
    expect(result[1].hidden).toBe(false);
  });

  it('retorna o array intacto se laneId não existir', () => {
    const lanes = [makeLane()];
    expect(duplicateJourneyLane(lanes, 'nope', id)).toBe(lanes);
  });

  it('resolve colisão de nome adicionando "· cópia 2"', () => {
    const a = makeLane({ id: 'a', label: 'L' });
    const copy1 = makeLane({ id: 'c1', label: 'L · cópia' });
    const result = duplicateJourneyLane([a, copy1], 'a', id);
    const labels = result.map(l => l.label);
    expect(labels).toContain('L · cópia 2');
  });
});

// ─── cardsInCell ──────────────────────────────────────────────────────────────

describe('cardsInCell', () => {
  it('retorna array vazio se não houver conteúdo', () => {
    const lane = makeLane();
    expect(cardsInCell(lane, 's1')).toEqual([]);
  });

  it('prefere cardItems quando disponível', () => {
    const lane = makeLane({
      cardItems: { s1: [{ id: 'c1', content: 'novo' }] },
      cards: { s1: 'legado' },
    });
    const result = cardsInCell(lane, 's1');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('novo');
  });

  it('cria card legado quando só cards está preenchido', () => {
    const lane = makeLane({ cards: { s1: 'texto legado' } });
    const result = cardsInCell(lane, 's1');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('texto legado');
    expect(result[0].id).toMatch(/^legacy:/);
  });
});

// ─── setCellCards ─────────────────────────────────────────────────────────────

describe('setCellCards', () => {
  it('escreve em cardItems e espelha em cards', () => {
    const lane = makeLane();
    const next = setCellCards(lane, 's1', [{ id: 'c1', content: 'hello' }]);
    expect(next.cardItems?.['s1']).toHaveLength(1);
    expect(next.cards['s1']).toBe('hello');
  });

  it('múltiplos cards juntam conteúdo com newline em cards', () => {
    const lane = makeLane();
    const next = setCellCards(lane, 's1', [
      { id: 'c1', content: 'linha 1' },
      { id: 'c2', content: 'linha 2' },
    ]);
    expect(next.cards['s1']).toBe('linha 1\nlinha 2');
  });
});

// ─── addCellCard / editCellCard / removeCellCard ──────────────────────────────

describe('addCellCard', () => {
  it('adiciona um card vazio ao fim da célula', () => {
    const lane = makeLane();
    const result = addCellCard(lane, 's1', 'c1');
    expect(cardsInCell(result, 's1')).toHaveLength(1);
    expect(cardsInCell(result, 's1')[0].id).toBe('c1');
  });
});

describe('editCellCard', () => {
  it('edita o conteúdo do card correto', () => {
    const lane = addCellCard(makeLane(), 's1', 'c1');
    const edited = editCellCard(lane, 's1', 'c1', 'novo conteúdo');
    expect(cardsInCell(edited, 's1')[0].content).toBe('novo conteúdo');
  });

  it('não muta cards de outras células', () => {
    let lane = addCellCard(makeLane(), 's1', 'c1');
    lane = addCellCard(lane, 's2', 'c2');
    const edited = editCellCard(lane, 's1', 'c1', 'x');
    expect(cardsInCell(edited, 's2')[0].content).toBe('');
  });
});

describe('removeCellCard', () => {
  it('remove o card pelo id', () => {
    let lane = addCellCard(makeLane(), 's1', 'c1');
    lane = addCellCard(lane, 's1', 'c2');
    const result = removeCellCard(lane, 's1', 'c1');
    const ids = cardsInCell(result, 's1').map(c => c.id);
    expect(ids).not.toContain('c1');
    expect(ids).toContain('c2');
  });
});

// ─── moveJourneyCard ──────────────────────────────────────────────────────────

describe('moveJourneyCard', () => {
  it('move card entre lanes diferentes', () => {
    const laneA = addCellCard(makeLane({ id: 'la' }), 's1', 'c1');
    const laneB = makeLane({ id: 'lb' });
    const result = moveJourneyCard([laneA, laneB], 'la', 's1', 'c1', 'lb', 's1');
    expect(cardsInCell(result.find(l => l.id === 'la')!, 's1')).toHaveLength(0);
    expect(cardsInCell(result.find(l => l.id === 'lb')!, 's1')).toHaveLength(1);
  });

  it('reordena dentro da mesma célula', () => {
    let lane = addCellCard(makeLane({ id: 'la' }), 's1', 'c1');
    lane = addCellCard(lane, 's1', 'c2');
    const result = moveJourneyCard([lane], 'la', 's1', 'c1', 'la', 's1', 1);
    const ids = cardsInCell(result[0], 's1').map(c => c.id);
    expect(ids).toEqual(['c2', 'c1']);
  });

  it('rejeita quando laneId não existe', () => {
    const lane = addCellCard(makeLane({ id: 'la' }), 's1', 'c1');
    const lanes = [lane];
    expect(moveJourneyCard(lanes, 'nope', 's1', 'c1', 'la', 's1')).toBe(lanes);
  });

  it('rejeita mover para/de lanes bound (binding definido)', () => {
    const laneA = addCellCard(makeLane({ id: 'la' }), 's1', 'c1');
    const laneB = makeLane({ id: 'lb', binding: 'customerAction' });
    const lanes = [laneA, laneB];
    expect(moveJourneyCard(lanes, 'la', 's1', 'c1', 'lb', 's1')).toBe(lanes);
  });

  it('rejeita mover para/de lanes de tipo divider', () => {
    const laneA = addCellCard(makeLane({ id: 'la' }), 's1', 'c1');
    const laneB = makeLane({ id: 'lb', type: 'divider' });
    const lanes = [laneA, laneB];
    expect(moveJourneyCard(lanes, 'la', 's1', 'c1', 'lb', 's1')).toBe(lanes);
  });

  it('rejeita quando cardId não existe na célula de origem', () => {
    const lane = makeLane({ id: 'la' });
    const lanes = [lane];
    expect(moveJourneyCard(lanes, 'la', 's1', 'nope', 'la', 's2')).toBe(lanes);
  });

  it('rejeita quando já existe card com mesmo id no destino', () => {
    let laneA = addCellCard(makeLane({ id: 'la' }), 's1', 'c1');
    let laneB = addCellCard(makeLane({ id: 'lb' }), 's2', 'c1'); // mesmo id
    const lanes = [laneA, laneB];
    expect(moveJourneyCard(lanes, 'la', 's1', 'c1', 'lb', 's2')).toBe(lanes);
  });
});

// ─── duplicateCellCard ────────────────────────────────────────────────────────

describe('duplicateCellCard', () => {
  it('insere o duplicado logo após o original', () => {
    let lane = addCellCard(makeLane({ id: 'la' }), 's1', 'c1');
    lane = addCellCard(lane, 's1', 'c2');
    const result = duplicateCellCard(lane, 's1', 'c1', 'c1-dup');
    const ids = cardsInCell(result, 's1').map(c => c.id);
    expect(ids).toEqual(['c1', 'c1-dup', 'c2']);
  });

  it('copia o conteúdo', () => {
    const lane = editCellCard(addCellCard(makeLane(), 's1', 'c1'), 's1', 'c1', 'olá');
    const result = duplicateCellCard(lane, 's1', 'c1', 'c1-dup');
    expect(cardsInCell(result, 's1')[1].content).toBe('olá');
  });

  it('retorna a lane intacta se newId já existir na célula', () => {
    let lane = addCellCard(makeLane(), 's1', 'c1');
    lane = addCellCard(lane, 's1', 'c2');
    expect(duplicateCellCard(lane, 's1', 'c1', 'c2')).toBe(lane);
  });

  it('retorna a lane intacta se cardId não existir', () => {
    const lane = makeLane();
    expect(duplicateCellCard(lane, 's1', 'nope', 'novo')).toBe(lane);
  });
});

// ─── formatCardText ───────────────────────────────────────────────────────────

describe('formatCardText', () => {
  it('bold — envolve seleção em **', () => {
    const { content } = formatCardText('hello world', 6, 11, 'bold');
    expect(content).toBe('hello **world**');
  });

  it('italic — envolve seleção em *', () => {
    const { content } = formatCardText('hello world', 0, 5, 'italic');
    expect(content).toBe('*hello* world');
  });

  it('list — adiciona "- " a cada linha', () => {
    const { content } = formatCardText('a\nb', 0, 3, 'list');
    expect(content).toBe('- a\n- b');
  });

  it('link — envolve seleção em [texto](https://)', () => {
    const { content } = formatCardText('visitar site', 0, 7, 'link');
    expect(content).toBe('[visitar](https://) site');
  });

  it('sem seleção (start === end) usa placeholder bold', () => {
    const { content } = formatCardText('abc', 1, 1, 'bold');
    expect(content).toContain('**texto**');
  });

  it('retorna posições start/end apontando para o replacement completo', () => {
    const result = formatCardText('abc', 0, 3, 'bold');
    const inserted = result.content.slice(result.start, result.end);
    expect(inserted).toBe('**abc**');
  });

  it('clipa start/end fora dos limites do conteúdo', () => {
    const { content } = formatCardText('hi', -5, 999, 'bold');
    expect(content).toContain('**hi**');
  });
});

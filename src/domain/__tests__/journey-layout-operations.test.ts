import { describe, it, expect } from 'vitest';
import {
  updateJourneyLayout,
  reorderJourneyLane,
  duplicateJourneyLane,
  JOURNEY_LANE_LABELS,
} from '../journey-layout-operations';
import { createServiceGraph } from '../graph-operations';
import type { Journey, JourneyLane, ServiceGraph } from '../model';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _seq = 0;
const nextId = (kind: string) => `${kind}-${++_seq}`;

function makeLane(id: string, label = 'Lane', extra: Partial<JourneyLane> = {}): JourneyLane {
  return { id, type: 'text', label, tone: 'blue', height: 164, cards: {}, ...extra } as JourneyLane;
}

function graphWithLayout(lanes: JourneyLane[]): { graph: ServiceGraph; journeyId: string } {
  const base = createServiceGraph('Serviço');
  const journeyId = nextId('journey');
  const graph: ServiceGraph = {
    ...base,
    service: { ...base.service, journeyIds: [journeyId] },
    journeys: {
      [journeyId]: {
        id: journeyId,
        serviceId: base.service.id,
        name: 'Jornada Teste',
        stageIds: [],
        status: 'draft',
        mapLayout: { version: 1, lanes },
      } as Journey,
    },
  };
  return { graph, journeyId };
}

// ─── JOURNEY_LANE_LABELS ──────────────────────────────────────────────────────

describe('JOURNEY_LANE_LABELS', () => {
  it('contém rótulo para cada tipo de lane', () => {
    const types = ['text', 'image', 'stage', 'icons', 'grid', 'divider', 'emotion', 'metric', 'embed'] as const;
    for (const t of types) {
      expect(JOURNEY_LANE_LABELS[t]).toBeTruthy();
    }
  });
});

// ─── updateJourneyLayout ──────────────────────────────────────────────────────

describe('updateJourneyLayout', () => {
  it('aplica função de update ao layout da jornada', () => {
    const { graph, journeyId } = graphWithLayout([makeLane('l1', 'A')]);
    const result = updateJourneyLayout(graph, journeyId, layout => ({
      ...layout,
      lanes: [...layout.lanes, makeLane('l2', 'B')],
    }));
    expect(result.journeys[journeyId].mapLayout?.lanes).toHaveLength(2);
  });

  it('cria layout padrão quando jornada não tem um ainda', () => {
    const base = createServiceGraph('Serviço');
    const journeyId = nextId('journey');
    const graph: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [journeyId] },
      journeys: {
        [journeyId]: {
          id: journeyId, serviceId: base.service.id,
          name: 'Jornada', stageIds: [], status: 'draft',
        } as Journey,
      },
    };
    // journey não tem mapLayout — updateJourneyLayout usa { version: 1, lanes: [] } como base
    const result = updateJourneyLayout(graph, journeyId, layout => ({
      ...layout,
      lanes: [makeLane('l1')],
    }));
    expect(result.journeys[journeyId].mapLayout?.lanes).toHaveLength(1);
  });

  it('retorna grafo inalterado quando journeyId não existe', () => {
    const graph = createServiceGraph('Serviço');
    const result = updateJourneyLayout(graph, 'nope', layout => layout);
    expect(result).toBe(graph);
  });

  it('retorna grafo inalterado quando update retorna mesmo objeto', () => {
    const { graph, journeyId } = graphWithLayout([makeLane('l1')]);
    const result = updateJourneyLayout(graph, journeyId, layout => layout);
    expect(result).toBe(graph);
  });

  it('atualiza updatedAt da jornada e do serviço', () => {
    const { graph, journeyId } = graphWithLayout([]);
    const before = graph.journeys[journeyId].updatedAt;
    const fakeNow = '2030-01-01T00:00:00.000Z';
    const result = updateJourneyLayout(
      graph, journeyId,
      layout => ({ ...layout, lanes: [makeLane('l1')] }),
      fakeNow,
    );
    expect(result.journeys[journeyId].updatedAt).toBe(fakeNow);
    expect(result.service.updatedAt).toBe(fakeNow);
    expect(result.journeys[journeyId].updatedAt).not.toBe(before);
  });

  it('não muta o grafo original', () => {
    const { graph, journeyId } = graphWithLayout([makeLane('l1')]);
    const originalLanes = graph.journeys[journeyId].mapLayout!.lanes;
    updateJourneyLayout(graph, journeyId, layout => ({
      ...layout,
      lanes: [...layout.lanes, makeLane('l2')],
    }));
    expect(graph.journeys[journeyId].mapLayout!.lanes).toBe(originalLanes);
  });
});

// ─── reorderJourneyLane ───────────────────────────────────────────────────────

describe('reorderJourneyLane', () => {
  it('move lane uma posição acima (direction: -1)', () => {
    const lanes = [makeLane('l1', 'A'), makeLane('l2', 'B'), makeLane('l3', 'C')];
    const result = reorderJourneyLane(lanes, 'l2', -1);
    expect(result.map(l => l.id)).toEqual(['l2', 'l1', 'l3']);
  });

  it('move lane uma posição abaixo (direction: 1)', () => {
    const lanes = [makeLane('l1', 'A'), makeLane('l2', 'B'), makeLane('l3', 'C')];
    const result = reorderJourneyLane(lanes, 'l2', 1);
    expect(result.map(l => l.id)).toEqual(['l1', 'l3', 'l2']);
  });

  it('retorna lista inalterada ao subir além do início', () => {
    const lanes = [makeLane('l1'), makeLane('l2')];
    const result = reorderJourneyLane(lanes, 'l1', -1);
    expect(result).toBe(lanes);
  });

  it('retorna lista inalterada ao descer além do fim', () => {
    const lanes = [makeLane('l1'), makeLane('l2')];
    const result = reorderJourneyLane(lanes, 'l2', 1);
    expect(result).toBe(lanes);
  });

  it('retorna lista inalterada quando id não existe', () => {
    const lanes = [makeLane('l1')];
    const result = reorderJourneyLane(lanes, 'nope', 1);
    expect(result).toBe(lanes);
  });

  it('não muta o array original', () => {
    const lanes = [makeLane('l1'), makeLane('l2')];
    const original = [...lanes];
    reorderJourneyLane(lanes, 'l1', 1);
    expect(lanes[0].id).toBe(original[0].id);
  });
});

// ─── duplicateJourneyLane ─────────────────────────────────────────────────────

describe('duplicateJourneyLane', () => {
  it('insere cópia logo após o original', () => {
    const lanes = [makeLane('l1', 'Ações'), makeLane('l2', 'Notas')];
    const result = duplicateJourneyLane(lanes, 'l1', () => 'l3');
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('l1');
    expect(result[1].id).toBe('l3');
    expect(result[2].id).toBe('l2');
  });

  it('cópia recebe label "… · cópia"', () => {
    const lanes = [makeLane('l1', 'Ações')];
    const result = duplicateJourneyLane(lanes, 'l1', () => 'l2');
    expect(result[1].label).toBe('Ações · cópia');
  });

  it('incrementa número se label "cópia" já existir', () => {
    const lanes = [
      makeLane('l1', 'Ações'),
      makeLane('l2', 'Ações · cópia'),
    ];
    let counter = 3;
    const result = duplicateJourneyLane(lanes, 'l1', () => `l${counter++}`);
    expect(result[1].label).toBe('Ações · cópia 2');
  });

  it('cópia começa visível (hidden: false)', () => {
    const lanes = [makeLane('l1', 'L', { hidden: true })];
    const result = duplicateJourneyLane(lanes, 'l1', () => 'l2');
    expect(result[1].hidden).toBe(false);
  });

  it('renova ids dos cardItems na cópia', () => {
    let counter = 100;
    const idFn = () => `card-${counter++}`;
    const lane: JourneyLane = {
      ...makeLane('l1', 'Cards'),
      cardItems: {
        's1': [{ id: 'orig-1', content: 'x' }, { id: 'orig-2', content: 'y' }],
      },
    };
    const result = duplicateJourneyLane([lane], 'l1', idFn);
    const copy = result[1];
    const cards = copy.cardItems?.['s1'] ?? [];
    expect(cards.map(c => c.id)).not.toContain('orig-1');
    expect(cards.map(c => c.id)).not.toContain('orig-2');
    expect(cards.map(c => c.content)).toEqual(['x', 'y']);
  });

  it('retorna lista inalterada quando id não existe', () => {
    const lanes = [makeLane('l1')];
    const result = duplicateJourneyLane(lanes, 'nope', () => 'l2');
    expect(result).toBe(lanes);
  });

  it('não muta o array original', () => {
    const lanes = [makeLane('l1')];
    const len = lanes.length;
    duplicateJourneyLane(lanes, 'l1', () => 'l2');
    expect(lanes).toHaveLength(len);
  });
});

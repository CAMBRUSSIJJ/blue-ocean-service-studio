import { describe, it, expect } from 'vitest';
import {
  makeId,
  normalizeName,
  parseList,
  createBlankWorkspaceGraph,
  createServiceGraph,
  isWorkspaceEmpty,
  EMPTY_WORKSPACE_SERVICE_ID,
  snapshotStage,
  pasteStageBundles,
  deleteStageFromGraph,
} from '../graph-operations';
import type { ServiceGraph, Stage, Journey } from '../model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _seq = 0;
const nextId = (prefix: string) => `${prefix}-${++_seq}`;

function makeGraph(opts: { stages?: number; withTouchpoint?: boolean } = {}): {
  graph: ServiceGraph;
  journeyId: string;
  stageIds: string[];
  touchpointId?: string;
} {
  const base = createServiceGraph('Serviço Teste');
  const journeyId = nextId('journey');
  const stageIds: string[] = [];
  const stages: ServiceGraph['stages'] = {};
  let touchpointId: string | undefined;
  let touchpoints: ServiceGraph['touchpoints'] = {};

  if (opts.withTouchpoint) {
    touchpointId = nextId('tp');
    touchpoints[touchpointId] = { id: touchpointId, serviceId: base.service.id, name: 'Site', channel: 'Digital' };
  }

  for (let i = 0; i < (opts.stages ?? 2); i++) {
    const sid = nextId('stage');
    stageIds.push(sid);
    stages[sid] = {
      id: sid, journeyId,
      title: `Etapa ${i + 1}`, customerAction: 'Ação', emotion: 'neutral',
      touchpointIds: touchpointId ? [touchpointId] : [],
      problemIds: [], opportunityIds: [],
    } as Stage;
  }

  const journey: Journey = {
    id: journeyId, serviceId: base.service.id,
    name: 'Jornada Teste', stageIds, status: 'draft',
  };

  const graph: ServiceGraph = {
    ...base,
    service: { ...base.service, journeyIds: [journeyId] },
    journeys: { [journeyId]: journey },
    stages,
    touchpoints,
  };
  return { graph, journeyId, stageIds, touchpointId };
}

// ─── makeId ──────────────────────────────────────────────────────────────────

describe('makeId', () => {
  it('inclui o prefixo informado', () => {
    expect(makeId('stage')).toMatch(/^stage-/);
  });

  it('dois IDs com mesmo prefixo são distintos', () => {
    expect(makeId('x')).not.toBe(makeId('x'));
  });
});

// ─── normalizeName ───────────────────────────────────────────────────────────

describe('normalizeName', () => {
  it('remove espaços e converte para minúsculas', () => {
    expect(normalizeName('  Atendimento  ')).toBe('atendimento');
  });

  it('trata acento pt-BR', () => {
    expect(normalizeName('Ação')).toBe('ação');
  });
});

// ─── parseList ───────────────────────────────────────────────────────────────

describe('parseList', () => {
  it('separa por vírgula', () => {
    expect(parseList('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  it('separa por newline', () => {
    expect(parseList('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('remove duplicatas', () => {
    expect(parseList('a, a, b')).toEqual(['a', 'b']);
  });

  it('ignora itens vazios', () => {
    expect(parseList('a,,b')).toEqual(['a', 'b']);
  });
});

// ─── createBlankWorkspaceGraph ───────────────────────────────────────────────

describe('createBlankWorkspaceGraph', () => {
  it('service.id é EMPTY_WORKSPACE_SERVICE_ID', () => {
    const g = createBlankWorkspaceGraph();
    expect(g.service.id).toBe(EMPTY_WORKSPACE_SERVICE_ID);
  });

  it('journeyIds está vazio', () => {
    const g = createBlankWorkspaceGraph();
    expect(g.service.journeyIds).toHaveLength(0);
  });

  it('schemaVersion é 3', () => {
    expect(createBlankWorkspaceGraph().schemaVersion).toBe(3);
  });
});

// ─── createServiceGraph ──────────────────────────────────────────────────────

describe('createServiceGraph', () => {
  it('define o nome informado', () => {
    expect(createServiceGraph('Meu Serviço').service.name).toBe('Meu Serviço');
  });

  it('trimeia o nome', () => {
    expect(createServiceGraph('  Teste  ').service.name).toBe('Teste');
  });

  it('description padrão é string vazia', () => {
    expect(createServiceGraph('S').service.description).toBe('');
  });

  it('aceita description customizada', () => {
    expect(createServiceGraph('S', 'Desc').service.description).toBe('Desc');
  });

  it('service.id não é EMPTY_WORKSPACE_SERVICE_ID', () => {
    expect(createServiceGraph('S').service.id).not.toBe(EMPTY_WORKSPACE_SERVICE_ID);
  });
});

// ─── isWorkspaceEmpty ────────────────────────────────────────────────────────

describe('isWorkspaceEmpty', () => {
  it('workspace em branco → true', () => {
    expect(isWorkspaceEmpty(createBlankWorkspaceGraph())).toBe(true);
  });

  it('serviço com nome → false', () => {
    expect(isWorkspaceEmpty(createServiceGraph('Serviço'))).toBe(false);
  });

  it('nome só de espaços → true', () => {
    const g = createServiceGraph('S');
    const blank = { ...g, service: { ...g.service, name: '   ' } };
    expect(isWorkspaceEmpty(blank)).toBe(true);
  });
});

// ─── snapshotStage ───────────────────────────────────────────────────────────

describe('snapshotStage', () => {
  it('captura a etapa com touchpoints, problemas, oportunidades e tasks', () => {
    const base = createServiceGraph('S');
    const journeyId = nextId('journey');
    const stageId = nextId('stage');
    const tpId = nextId('tp');
    const probId = nextId('prob');
    const oppId = nextId('opp');
    const taskId = nextId('task');

    const stage: Stage = {
      id: stageId, journeyId,
      title: 'Descoberta', customerAction: 'Ação', emotion: 'neutral',
      touchpointIds: [tpId], problemIds: [probId], opportunityIds: [oppId],
    };
    const graph: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [journeyId] },
      journeys: { [journeyId]: { id: journeyId, serviceId: base.service.id, name: 'J', stageIds: [stageId], status: 'draft' } },
      stages: { [stageId]: stage },
      touchpoints: { [tpId]: { id: tpId, serviceId: base.service.id, name: 'Site', channel: 'Digital' } },
      problems: { [probId]: { id: probId, stageId, description: 'Problema' } },
      opportunities: { [oppId]: { id: oppId, stageId, title: 'Opp', problemIds: [probId], taskIds: [taskId], metricIds: [] } },
      tasks: { [taskId]: { id: taskId, opportunityId: oppId, title: 'Task', status: 'todo' } },
    };

    const bundle = snapshotStage(graph, stage);

    expect(bundle.stage.id).toBe(stageId);
    expect(bundle.touchpoints).toHaveLength(1);
    expect(bundle.problems).toHaveLength(1);
    expect(bundle.opportunities).toHaveLength(1);
    expect(bundle.tasks).toHaveLength(1);
  });

  it('ignora touchpoints inexistentes no grafo', () => {
    const base = createServiceGraph('S');
    const journeyId = nextId('journey');
    const stageId = nextId('stage');
    const stage: Stage = {
      id: stageId, journeyId, title: 'E', customerAction: 'A', emotion: 'neutral',
      touchpointIds: ['ghost-tp'], problemIds: [], opportunityIds: [],
    };
    const graph: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [journeyId] },
      journeys: { [journeyId]: { id: journeyId, serviceId: base.service.id, name: 'J', stageIds: [stageId], status: 'draft' } },
      stages: { [stageId]: stage },
      touchpoints: {},
    };

    const bundle = snapshotStage(graph, stage);
    expect(bundle.touchpoints).toHaveLength(0);
  });

  it('snapshot é cópia independente (imutabilidade)', () => {
    const { graph, stageIds } = makeGraph({ stages: 1 });
    const stage = graph.stages[stageIds[0]];
    const bundle = snapshotStage(graph, stage);

    // Mutando o bundle não afeta o grafo original
    (bundle.stage as Stage).title = 'MUTADO';
    expect(graph.stages[stageIds[0]].title).toBe('Etapa 1');
  });
});

// ─── pasteStageBundles ───────────────────────────────────────────────────────

describe('pasteStageBundles', () => {
  it('cola uma etapa no final da jornada', () => {
    const { graph, journeyId, stageIds } = makeGraph({ stages: 2 });
    const sourceStage = graph.stages[stageIds[0]];
    const bundle = snapshotStage(graph, sourceStage);

    const { graph: g2, newIds } = pasteStageBundles(graph, [bundle]);

    expect(newIds).toHaveLength(1);
    const journey = g2.journeys[journeyId];
    expect(journey.stageIds).toHaveLength(3);
    expect(journey.stageIds[2]).toBe(newIds[0]);
  });

  it('cola depois de uma etapa específica (afterId)', () => {
    const { graph, journeyId, stageIds } = makeGraph({ stages: 2 });
    const sourceStage = graph.stages[stageIds[0]];
    const bundle = snapshotStage(graph, sourceStage);

    const { graph: g2, newIds } = pasteStageBundles(graph, [bundle], stageIds[0]);

    const journey = g2.journeys[journeyId];
    expect(journey.stageIds[1]).toBe(newIds[0]);
  });

  it('cria novos IDs para stage, problemas, oportunidades e tasks', () => {
    const base = createServiceGraph('S');
    const journeyId = nextId('journey');
    const stageId = nextId('stage');
    const probId = nextId('prob');
    const oppId = nextId('opp');
    const taskId = nextId('task');

    const stage: Stage = {
      id: stageId, journeyId, title: 'Orig', customerAction: 'A', emotion: 'neutral',
      touchpointIds: [], problemIds: [probId], opportunityIds: [oppId],
    };
    const graph: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [journeyId] },
      journeys: { [journeyId]: { id: journeyId, serviceId: base.service.id, name: 'J', stageIds: [stageId], status: 'draft' } },
      stages: { [stageId]: stage },
      problems: { [probId]: { id: probId, stageId, description: 'P' } },
      opportunities: { [oppId]: { id: oppId, stageId, title: 'O', problemIds: [probId], taskIds: [taskId], metricIds: [] } },
      tasks: { [taskId]: { id: taskId, opportunityId: oppId, title: 'T', status: 'todo' } },
      touchpoints: {},
    };

    const bundle = snapshotStage(graph, stage);
    const { graph: g2, newIds } = pasteStageBundles(graph, [bundle]);

    const newStageId = newIds[0];
    expect(newStageId).not.toBe(stageId);

    const newStage = g2.stages[newStageId];
    const newProbId = newStage.problemIds[0];
    const newOppId = newStage.opportunityIds[0];
    expect(newProbId).not.toBe(probId);
    expect(newOppId).not.toBe(oppId);

    const newOpp = g2.opportunities[newOppId];
    expect(newOpp.taskIds[0]).not.toBe(taskId);
  });

  it('adiciona "(cópia)" ao título da etapa colada', () => {
    const { graph } = makeGraph({ stages: 1 });
    const stage = graph.stages[Object.keys(graph.stages)[0]];
    const bundle = snapshotStage(graph, stage);
    const { graph: g2, newIds } = pasteStageBundles(graph, [bundle]);
    expect(g2.stages[newIds[0]].title).toContain('cópia');
  });

  it('reutiliza touchpoint existente pelo nome normalizado', () => {
    const { graph, stageIds, touchpointId, journeyId } = makeGraph({ stages: 1, withTouchpoint: true });
    const stage = graph.stages[stageIds[0]];
    const bundle = snapshotStage(graph, stage);
    const { graph: g2 } = pasteStageBundles(graph, [bundle]);

    // O touchpoint colado deve apontar para o mesmo ID existente, não criar novo
    const pastedStageId = g2.journeys[journeyId].stageIds[1];
    const pastedStage = g2.stages[pastedStageId];
    expect(pastedStage.touchpointIds[0]).toBe(touchpointId);
  });

  it('cola múltiplos bundles de uma vez', () => {
    const { graph, journeyId } = makeGraph({ stages: 2 });
    const stageArr = Object.values(graph.stages);
    const bundles = stageArr.map(s => snapshotStage(graph, s));

    const { graph: g2, newIds } = pasteStageBundles(graph, bundles);

    expect(newIds).toHaveLength(2);
    expect(g2.journeys[journeyId].stageIds).toHaveLength(4);
  });
});

// ─── deleteStageFromGraph ────────────────────────────────────────────────────

describe('deleteStageFromGraph', () => {
  it('remove a etapa do stages e do stageIds da jornada', () => {
    const { graph, journeyId, stageIds } = makeGraph({ stages: 2 });
    const [s1, s2] = stageIds;

    const g2 = deleteStageFromGraph(graph, s1);

    expect(g2.stages[s1]).toBeUndefined();
    expect(g2.journeys[journeyId].stageIds).toEqual([s2]);
  });

  it('retorna o grafo inalterado para stageId inexistente', () => {
    const { graph } = makeGraph({ stages: 1 });
    const result = deleteStageFromGraph(graph, 'ghost-stage');
    expect(result).toBe(graph);
  });

  it('desvincula problemas da etapa removida (stageId → "")', () => {
    const base = createServiceGraph('S');
    const journeyId = nextId('journey');
    const stageId = nextId('stage');
    const probId = nextId('prob');

    const stage: Stage = {
      id: stageId, journeyId, title: 'E', customerAction: 'A', emotion: 'neutral',
      touchpointIds: [], problemIds: [probId], opportunityIds: [],
    };
    const graph: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [journeyId] },
      journeys: { [journeyId]: { id: journeyId, serviceId: base.service.id, name: 'J', stageIds: [stageId], status: 'draft' } },
      stages: { [stageId]: stage },
      problems: { [probId]: { id: probId, stageId, description: 'P' } },
      opportunities: {},
      touchpoints: {},
    };

    const g2 = deleteStageFromGraph(graph, stageId);
    expect(g2.problems[probId].stageId).toBe('');
  });

  it('desvincula oportunidades da etapa removida (stageId → "")', () => {
    const base = createServiceGraph('S');
    const journeyId = nextId('journey');
    const stageId = nextId('stage');
    const oppId = nextId('opp');

    const stage: Stage = {
      id: stageId, journeyId, title: 'E', customerAction: 'A', emotion: 'neutral',
      touchpointIds: [], problemIds: [], opportunityIds: [oppId],
    };
    const graph: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [journeyId] },
      journeys: { [journeyId]: { id: journeyId, serviceId: base.service.id, name: 'J', stageIds: [stageId], status: 'draft' } },
      stages: { [stageId]: stage },
      opportunities: { [oppId]: { id: oppId, stageId, title: 'O', problemIds: [], taskIds: [], metricIds: [] } },
      problems: {},
      touchpoints: {},
    };

    const g2 = deleteStageFromGraph(graph, stageId);
    expect(g2.opportunities[oppId].stageId).toBe('');
  });

  it('desvincula tasks da etapa removida (stageId → "")', () => {
    const base = createServiceGraph('S');
    const journeyId = nextId('journey');
    const stageId = nextId('stage');
    const oppId = nextId('opp');
    const taskId = nextId('task');

    const stage: Stage = {
      id: stageId, journeyId, title: 'E', customerAction: 'A', emotion: 'neutral',
      touchpointIds: [], problemIds: [], opportunityIds: [oppId],
    };
    const graph: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [journeyId] },
      journeys: { [journeyId]: { id: journeyId, serviceId: base.service.id, name: 'J', stageIds: [stageId], status: 'draft' } },
      stages: { [stageId]: stage },
      opportunities: { [oppId]: { id: oppId, stageId, title: 'O', problemIds: [], taskIds: [taskId], metricIds: [] } },
      tasks: { [taskId]: { id: taskId, opportunityId: oppId, title: 'T', status: 'todo', stageId } },
      problems: {},
      touchpoints: {},
    };

    const g2 = deleteStageFromGraph(graph, stageId);
    expect(g2.tasks[taskId].stageId).toBe('');
  });

  it('remove cards da lane referenciando a etapa deletada', () => {
    const base = createServiceGraph('S');
    const journeyId = nextId('journey');
    const stageId = nextId('stage');
    const laneId = nextId('lane');

    const stage: Stage = {
      id: stageId, journeyId, title: 'E', customerAction: 'A', emotion: 'neutral',
      touchpointIds: [], problemIds: [], opportunityIds: [],
    };
    const graph: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [journeyId] },
      journeys: {
        [journeyId]: {
          id: journeyId, serviceId: base.service.id, name: 'J', stageIds: [stageId], status: 'draft',
          mapLayout: { version: 1, lanes: [{ id: laneId, type: 'text', label: 'L', tone: 'blue', height: 164, cards: { [stageId]: [{ id: 'card-1', kind: 'text', content: 'x', x: 0, y: 0 }] } }] },
        } as Journey,
      },
      stages: { [stageId]: stage },
      touchpoints: {},
    };

    const g2 = deleteStageFromGraph(graph, stageId);
    const lane = g2.journeys[journeyId].mapLayout!.lanes[0];
    expect(stageId in lane.cards).toBe(false);
  });

  it('não muta o grafo original', () => {
    const { graph, stageIds } = makeGraph({ stages: 2 });
    const before = graph.journeys[Object.keys(graph.journeys)[0]].stageIds.length;
    deleteStageFromGraph(graph, stageIds[0]);
    expect(graph.journeys[Object.keys(graph.journeys)[0]].stageIds).toHaveLength(before);
  });
});

/**
 * Cobertura adicional de integrity.ts — foca nas lacunas não exercidas em
 * graph-operations.test.ts: repairGraphReferences (completo) e os warnings de
 * colaboração de validateGraphIntegrity.
 */
import { describe, it, expect } from 'vitest';
import { validateGraphIntegrity, repairGraphReferences } from '../integrity';
import { createServiceGraph } from '../graph-operations';
import { applyJourneyStarter } from '../journey-starter';
import type { CollaborationState, ServiceGraph } from '../model';

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _seq = 0;
const id = (kind: string) => `${kind}-${++_seq}`;

/** Grafo limpo com 1 jornada e 3 etapas (via applyJourneyStarter). */
function baseGraph(): { graph: ServiceGraph; journeyId: string; stageIds: string[] } {
  const base = createServiceGraph('Serviço Base');
  const journeyId = id('journey');
  const withJourney: ServiceGraph = {
    ...base,
    service: { ...base.service, journeyIds: [journeyId] },
    journeys: {
      [journeyId]: { id: journeyId, serviceId: base.service.id, name: 'Jornada', stageIds: [], status: 'draft' as const },
    },
  };
  const started = applyJourneyStarter(withJourney, journeyId, id);
  const stageIds = started.journeys[journeyId].stageIds;
  return { graph: started, journeyId, stageIds };
}

/** Adiciona colaboração mínima ao grafo. */
function withCollab(graph: ServiceGraph, overrides: Partial<CollaborationState> = {}): ServiceGraph {
  const collab: CollaborationState = {
    version: 1,
    workspaceId: 'ws-1',
    workspaceName: 'WS',
    currentUserId: 'user-1',
    members: { 'user-1': { id: 'user-1', name: 'Alice', role: 'owner', status: 'active', createdAt: '2024-01-01T00:00:00Z' } },
    comments: [],
    activity: [],
    sync: { mode: 'local-only' },
    ...overrides,
  };
  return { ...graph, service: { ...graph.service, collaboration: collab } };
}

// ─── repairGraphReferences ────────────────────────────────────────────────────

describe('repairGraphReferences', () => {
  it('grafo válido sai intacto em conteúdo', () => {
    const { graph } = baseGraph();
    const repaired = repairGraphReferences(graph);
    expect(repaired.service.journeyIds).toEqual(graph.service.journeyIds);
    expect(Object.keys(repaired.journeys)).toEqual(Object.keys(graph.journeys));
  });

  it('remove journeyId inexistente de service.journeyIds', () => {
    const { graph, journeyId } = baseGraph();
    const broken: ServiceGraph = {
      ...graph,
      service: { ...graph.service, journeyIds: [journeyId, 'ghost-journey'] },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.service.journeyIds).toEqual([journeyId]);
  });

  it('remove stageId com journeyId errado da lista da jornada', () => {
    const { graph, journeyId, stageIds } = baseGraph();
    const orphanStageId = id('stage');
    const broken: ServiceGraph = {
      ...graph,
      stages: {
        ...graph.stages,
        [orphanStageId]: { id: orphanStageId, journeyId: 'other-journey', title: 'Órfã', customerAction: '', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      },
      journeys: {
        ...graph.journeys,
        [journeyId]: { ...graph.journeys[journeyId], stageIds: [...stageIds, orphanStageId] },
      },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.journeys[journeyId].stageIds).toEqual(stageIds);
  });

  it('remove touchpointId inexistente da etapa', () => {
    const { graph, stageIds } = baseGraph();
    const stageId = stageIds[0];
    const broken: ServiceGraph = {
      ...graph,
      stages: { ...graph.stages, [stageId]: { ...graph.stages[stageId], touchpointIds: ['ghost-tp'] } },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.stages[stageId].touchpointIds).toEqual([]);
  });

  it('remove problemId cujo problema pertence a outra etapa', () => {
    const { graph, stageIds } = baseGraph();
    const stageA = stageIds[0];
    const stageB = stageIds[1];
    const problemId = id('problem');
    const broken: ServiceGraph = {
      ...graph,
      problems: { [problemId]: { id: problemId, stageId: stageB, description: 'P' } },
      stages: { ...graph.stages, [stageA]: { ...graph.stages[stageA], problemIds: [problemId] } },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.stages[stageA].problemIds).toEqual([]);
  });

  it('remove opportunityId cujo opportunity pertence a outra etapa', () => {
    const { graph, stageIds } = baseGraph();
    const stageA = stageIds[0];
    const stageB = stageIds[1];
    const oppId = id('opp');
    const broken: ServiceGraph = {
      ...graph,
      opportunities: { [oppId]: { id: oppId, stageId: stageB, title: 'O', problemIds: [], taskIds: [] } },
      stages: { ...graph.stages, [stageA]: { ...graph.stages[stageA], opportunityIds: [oppId] } },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.stages[stageA].opportunityIds).toEqual([]);
  });

  it('remove dependência circular de task (task que depende de si mesma)', () => {
    const { graph } = baseGraph();
    const taskId = id('task');
    const broken: ServiceGraph = {
      ...graph,
      tasks: { [taskId]: { id: taskId, opportunityId: 'opp-x', title: 'T', status: 'todo', dependencyIds: [taskId] } },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.tasks[taskId].dependencyIds).toEqual([]);
  });

  it('limpa stageId inválido de task', () => {
    const { graph } = baseGraph();
    const taskId = id('task');
    const broken: ServiceGraph = {
      ...graph,
      tasks: { [taskId]: { id: taskId, opportunityId: 'opp-x', title: 'T', status: 'todo', stageId: 'ghost-stage' } },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.tasks[taskId].stageId).toBe('');
  });

  it('limpa journeyId inválido de task', () => {
    const { graph } = baseGraph();
    const taskId = id('task');
    const broken: ServiceGraph = {
      ...graph,
      tasks: { [taskId]: { id: taskId, opportunityId: 'opp-x', title: 'T', status: 'todo', journeyId: 'ghost-journey' } },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.tasks[taskId].journeyId).toBe('');
  });

  it('remove edge de whiteboard com fromId ou toId inexistente', () => {
    const { graph } = baseGraph();
    const boardId = id('board');
    const itemId = id('item');
    const edgeId = id('edge');
    const broken: ServiceGraph = {
      ...graph,
      views: {
        whiteboards: {
          [boardId]: {
            id: boardId, serviceId: graph.service.id, name: 'Board', viewKind: 'free',
            items: { [itemId]: { id: itemId, kind: 'free', shape: 'shape', text: '', x: 0, y: 0, width: 100, height: 50 } },
            edges: { [edgeId]: { id: edgeId, fromId: itemId, toId: 'ghost-item', label: '', style: 'solid', arrow: 'end' } },
          },
        },
      },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.views.whiteboards[boardId].edges).toEqual({});
  });

  it('remove edge com fromId === toId (self-loop)', () => {
    const { graph } = baseGraph();
    const boardId = id('board');
    const itemId = id('item');
    const edgeId = id('edge');
    const broken: ServiceGraph = {
      ...graph,
      views: {
        whiteboards: {
          [boardId]: {
            id: boardId, serviceId: graph.service.id, name: 'Board', viewKind: 'free',
            items: { [itemId]: { id: itemId, kind: 'free', shape: 'shape', text: '', x: 0, y: 0, width: 100, height: 50 } },
            edges: { [edgeId]: { id: edgeId, fromId: itemId, toId: itemId, label: '', style: 'solid', arrow: 'end' } },
          },
        },
      },
    };
    const repaired = repairGraphReferences(broken);
    expect(repaired.views.whiteboards[boardId].edges).toEqual({});
  });

  it('repara currentUserId inválido na colaboração — usa primeiro membro', () => {
    const { graph } = baseGraph();
    const g = withCollab(graph, { currentUserId: 'ghost-user' });
    const repaired = repairGraphReferences(g);
    expect(repaired.service.collaboration?.currentUserId).toBe('user-1');
  });

  it('repara authorId inválido em comentário — redireciona para currentUserId', () => {
    const { graph, journeyId } = baseGraph();
    const g = withCollab(graph, {
      comments: [{
        id: 'comment-1', targetType: 'journey', targetId: journeyId,
        authorId: 'ghost-author', body: 'Texto', status: 'open', createdAt: '2024-01-01T00:00:00Z',
      }],
    });
    const repaired = repairGraphReferences(g);
    const comment = repaired.service.collaboration!.comments![0];
    expect(comment.authorId).toBe('user-1');
  });

  it('repara alvo removido em comentário — redireciona para service', () => {
    const { graph } = baseGraph();
    const g = withCollab(graph, {
      comments: [{
        id: 'comment-2', targetType: 'journey', targetId: 'ghost-journey',
        authorId: 'user-1', body: 'Texto', status: 'open', createdAt: '2024-01-01T00:00:00Z',
      }],
    });
    const repaired = repairGraphReferences(g);
    const comment = repaired.service.collaboration!.comments![0];
    expect(comment.targetType).toBe('service');
    expect(comment.targetId).toBe(graph.service.id);
  });

  it('não muta o grafo original', () => {
    const { graph } = baseGraph();
    const original = { ...graph, service: { ...graph.service, journeyIds: [...graph.service.journeyIds, 'ghost'] } };
    repairGraphReferences(original);
    expect(original.service.journeyIds).toContain('ghost');
  });
});

// ─── validateGraphIntegrity — warnings de colaboração ────────────────────────

describe('validateGraphIntegrity — colaboração', () => {
  it('warning quando currentUserId não existe em members', () => {
    const { graph } = baseGraph();
    const g = withCollab(graph, { currentUserId: 'ghost-user' });
    const report = validateGraphIntegrity(g);
    expect(report.warnings.some(w => w.code === 'collab-current-user')).toBe(true);
  });

  it('warning quando comentário tem authorId inexistente', () => {
    const { graph, journeyId } = baseGraph();
    const g = withCollab(graph, {
      comments: [{
        id: 'c1', targetType: 'journey', targetId: journeyId,
        authorId: 'ghost-author', body: 'X', status: 'open', createdAt: '2024-01-01T00:00:00Z',
      }],
    });
    const report = validateGraphIntegrity(g);
    expect(report.warnings.some(w => w.code === 'collab-author')).toBe(true);
  });

  it('warning quando comentário tem alvo de journey removida', () => {
    const { graph } = baseGraph();
    const g = withCollab(graph, {
      comments: [{
        id: 'c2', targetType: 'journey', targetId: 'ghost-journey',
        authorId: 'user-1', body: 'X', status: 'open', createdAt: '2024-01-01T00:00:00Z',
      }],
    });
    const report = validateGraphIntegrity(g);
    expect(report.warnings.some(w => w.code === 'collab-target')).toBe(true);
  });

  it('warning quando comentário aponta stage removida', () => {
    const { graph } = baseGraph();
    const g = withCollab(graph, {
      comments: [{
        id: 'c3', targetType: 'stage', targetId: 'ghost-stage',
        authorId: 'user-1', body: 'X', status: 'open', createdAt: '2024-01-01T00:00:00Z',
      }],
    });
    const report = validateGraphIntegrity(g);
    expect(report.warnings.some(w => w.code === 'collab-target')).toBe(true);
  });

  it('sem warnings para colaboração íntegra', () => {
    const { graph, journeyId } = baseGraph();
    const g = withCollab(graph, {
      comments: [{
        id: 'c4', targetType: 'journey', targetId: journeyId,
        authorId: 'user-1', body: 'OK', status: 'open', createdAt: '2024-01-01T00:00:00Z',
      }],
    });
    const report = validateGraphIntegrity(g);
    const collabWarnings = report.warnings.filter(w => w.code.startsWith('collab-'));
    expect(collabWarnings).toHaveLength(0);
  });
});

// ─── journey-starter.ts — applyJourneyStarter ────────────────────────────────

import { applyJourneyStarter as _applyJourneyStarter } from '../journey-starter';

describe('applyJourneyStarter', () => {
  it('retorna grafo inalterado para journeyId inexistente', () => {
    const graph = createServiceGraph('S');
    const result = _applyJourneyStarter(graph, 'nope', id);
    expect(result).toBe(graph);
  });

  it('cria 3 etapas padrão quando jornada não tem nenhuma', () => {
    // baseGraph já chamou applyJourneyStarter — usamos uma jornada nova e vazia
    const base = createServiceGraph('S2');
    const jid = id('journey');
    const g: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [jid] },
      journeys: { [jid]: { id: jid, serviceId: base.service.id, name: 'Vazia', stageIds: [], status: 'draft' as const } },
    };
    const result = _applyJourneyStarter(g, jid, id);
    expect(result.journeys[jid].stageIds).toHaveLength(3);
  });

  it('mantém etapas existentes quando já houver stageIds', () => {
    const { graph, journeyId, stageIds } = baseGraph();
    const result = _applyJourneyStarter(graph, journeyId, id);
    // com etapas existentes, não adiciona novas
    expect(result.journeys[journeyId].stageIds).toHaveLength(stageIds.length);
  });

  it('adiciona lanes essenciais ao mapLayout', () => {
    const base = createServiceGraph('S3');
    const jid = id('journey');
    const g: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [jid] },
      journeys: { [jid]: { id: jid, serviceId: base.service.id, name: 'J', stageIds: [], status: 'draft' as const } },
    };
    const result = _applyJourneyStarter(g, jid, id);
    const lanes = result.journeys[jid].mapLayout?.lanes ?? [];
    expect(lanes.some(l => l.binding === 'customerAction')).toBe(true);
    expect(lanes.some(l => l.binding === 'thoughts')).toBe(true);
    expect(lanes.some(l => l.type === 'emotion')).toBe(true);
  });

  it('exibe lane oculta em vez de duplicar', () => {
    const base = createServiceGraph('S4');
    const jid = id('journey');
    const g: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [jid] },
      journeys: {
        [jid]: {
          id: jid, serviceId: base.service.id, name: 'J', stageIds: [], status: 'draft' as const,
          mapLayout: {
            version: 1,
            lanes: [{ id: id('lane'), type: 'text', binding: 'customerAction', label: 'Ações', tone: 'blue', height: 164, cards: {}, hidden: true }],
          },
        },
      },
    };
    const result = _applyJourneyStarter(g, jid, id);
    const lanes = result.journeys[jid].mapLayout?.lanes ?? [];
    const actionLanes = lanes.filter(l => l.binding === 'customerAction');
    expect(actionLanes).toHaveLength(1);
    expect(actionLanes[0].hidden).toBe(false);
  });

  it('atualiza updatedAt da jornada e do serviço', () => {
    const base = createServiceGraph('S5');
    const jid = id('journey');
    const g: ServiceGraph = {
      ...base,
      service: { ...base.service, journeyIds: [jid] },
      journeys: { [jid]: { id: jid, serviceId: base.service.id, name: 'J', stageIds: [], status: 'draft' as const } },
    };
    const fakeNow = '2030-06-01T00:00:00.000Z';
    const result = _applyJourneyStarter(g, jid, id, fakeNow);
    expect(result.journeys[jid].updatedAt).toBe(fakeNow);
    expect(result.service.updatedAt).toBe(fakeNow);
  });
});

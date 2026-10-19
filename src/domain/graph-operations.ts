import type { Id, ServiceGraph, Stage, StageBundle } from './model';
import { repairGraphReferences } from './integrity';
import { createServiceProjectState } from '../services/service-project';

export const makeId = (prefix: string): Id => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};

export const normalizeName = (value: string) => value.trim().toLocaleLowerCase('pt-BR');

export const parseList = (value: string) =>
  Array.from(
    new Set(
      value
        .split(/[,\n]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

export const nowIso = () => new Date().toISOString();

export const EMPTY_WORKSPACE_SERVICE_ID = 'workspace-uninitialized';

export const createBlankWorkspaceGraph = (): ServiceGraph => {
  const createdAt = nowIso();
  return {
    schemaVersion: 3,
    entities: {},
    research: { sources: {}, projects: {}, observations: {}, collections: {}, createdAt, updatedAt: createdAt },
    integrity: { schemaVersion: 3, migratedAt: createdAt },
    views: { whiteboards: {} },
    service: {
      id: EMPTY_WORKSPACE_SERVICE_ID,
      name: '',
      description: '',
      journeyIds: [],
      createdAt,
      updatedAt: createdAt,
      project: createServiceProjectState('service-demo', createdAt, 'design'),
    },
    journeys: {},
    stages: {},
    touchpoints: {},
    channels: {},
    channelHandoffs: {},
    problems: {},
    opportunities: {},
    tasks: {},
    blueprintDraft: { evidencias: '', frontstage: '', backstage: '', suporte: '' },
  };
};

export const createInitialGraph = createBlankWorkspaceGraph;

export const isWorkspaceEmpty = (graph: ServiceGraph) =>
  graph.service.id === EMPTY_WORKSPACE_SERVICE_ID || !graph.service.name.trim();

export const createServiceGraph = (name: string, description = ''): ServiceGraph => {
  const graph = createBlankWorkspaceGraph();
  const id = makeId('service');
  const now = nowIso();
  return {
    ...graph,
    service: {
      ...graph.service,
      id,
      name: name.trim(),
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
      project: createServiceProjectState(id, now),
    },
  };
};

// Explicit sample only. Production initialization never calls this function.
export const createDemoGraph = (): ServiceGraph => {
  const createdAt = nowIso();
  return {
    schemaVersion: 3,
    entities: {},
    research: { sources: {}, projects: {}, observations: {}, collections: {}, createdAt, updatedAt: createdAt },
    integrity: { schemaVersion: 3, migratedAt: createdAt },
    views: { whiteboards: {} },
    service: {
      id: 'service-demo',
      name: 'Serviço de exemplo',
      description: 'Exemplo demonstrativo para explorar o Blue Ocean sem alterar seu primeiro serviço.',
      journeyIds: ['journey-demo'],
      createdAt,
      updatedAt: createdAt,
    },
    journeys: {
      'journey-demo': {
        id: 'journey-demo', serviceId: 'service-demo', name: 'Jornada de exemplo',
        stageIds: ['stage-demo-discovery', 'stage-demo-use', 'stage-demo-followup'], status: 'draft',
      },
    },
    stages: {
      'stage-demo-discovery': { id: 'stage-demo-discovery', journeyId: 'journey-demo', title: 'Descoberta', customerAction: 'Descobre o serviço e avalia se faz sentido.', emotion: 'neutral', touchpointIds: ['tp-demo-site'], problemIds: [], opportunityIds: [] },
      'stage-demo-use': { id: 'stage-demo-use', journeyId: 'journey-demo', title: 'Uso', customerAction: 'Usa o serviço para resolver sua necessidade.', emotion: 'positive', touchpointIds: ['tp-demo-service'], problemIds: ['problem-demo'], opportunityIds: ['opp-demo'] },
      'stage-demo-followup': { id: 'stage-demo-followup', journeyId: 'journey-demo', title: 'Pós-serviço', customerAction: 'Avalia o resultado e decide se volta.', emotion: 'neutral', touchpointIds: ['tp-demo-followup'], problemIds: [], opportunityIds: [] },
    },
    channels: {
      'channel-demo-digital': { id: 'channel-demo-digital', serviceId: 'service-demo', name: 'Digital', kind: 'digital', description: 'Site e autosserviço digital.', active: true, createdAt, updatedAt: createdAt },
      'channel-demo-operation': { id: 'channel-demo-operation', serviceId: 'service-demo', name: 'Operação', kind: 'system', description: 'Ponto operacional principal.', active: true, createdAt, updatedAt: createdAt },
      'channel-demo-messaging': { id: 'channel-demo-messaging', serviceId: 'service-demo', name: 'Mensageria', kind: 'messaging', description: 'Mensagens e contato assíncrono.', active: true, createdAt, updatedAt: createdAt },
    },
    channelHandoffs: {},
    touchpoints: {
      'tp-demo-site': { id: 'tp-demo-site', serviceId: 'service-demo', name: 'Site', channel: 'Digital', channelId: 'channel-demo-digital' },
      'tp-demo-service': { id: 'tp-demo-service', serviceId: 'service-demo', name: 'Ponto principal do serviço', channel: 'Operação', channelId: 'channel-demo-operation' },
      'tp-demo-followup': { id: 'tp-demo-followup', serviceId: 'service-demo', name: 'Mensagem pós-serviço', channel: 'Mensageria', channelId: 'channel-demo-messaging' },
    },
    problems: {
      'problem-demo': { id: 'problem-demo', stageId: 'stage-demo-use', description: 'O cliente recebe pouca visibilidade sobre o andamento.' },
    },
    opportunities: {
      'opp-demo': { id: 'opp-demo', stageId: 'stage-demo-use', title: 'Dar visibilidade do status durante a execução', problemIds: ['problem-demo'], taskIds: ['task-demo'] },
    },
    tasks: {
      'task-demo': { id: 'task-demo', opportunityId: 'opp-demo', title: 'Criar atualização de status do serviço', status: 'todo' },
    },
    blueprintDraft: { evidencias: '', frontstage: '', backstage: '', suporte: '' },
  };
};

export const snapshotStage = (graph: ServiceGraph, stage: Stage): StageBundle => {
  const opportunities = stage.opportunityIds.map((id) => graph.opportunities[id]).filter(Boolean);
  return {
    stage: { ...stage, needIds: [...(stage.needIds ?? [])], touchpointIds: [...stage.touchpointIds], validatedProblemIds: [...(stage.validatedProblemIds ?? [])], evidenceIds: [...(stage.evidenceIds ?? [])], problemIds: [...stage.problemIds], opportunityIds: [...stage.opportunityIds] },
    touchpoints: stage.touchpointIds.map((id) => graph.touchpoints[id]).filter(Boolean).map((item) => ({ ...item })),
    problems: stage.problemIds.map((id) => graph.problems[id]).filter(Boolean).map((item) => ({ ...item })),
    opportunities: opportunities.map((item) => ({ ...item, problemIds: [...item.problemIds], taskIds: [...item.taskIds] })),
    tasks: opportunities.flatMap((item) => item.taskIds.map((id) => graph.tasks[id]).filter(Boolean)).map((item) => ({ ...item })),
  };
};

export const pasteStageBundles = (graph: ServiceGraph, bundles: StageBundle[], afterId?: Id, targetJourneyId = graph.service.journeyIds[0]) => {
  const stages = { ...graph.stages };
  const touchpoints = { ...graph.touchpoints };
  const problems = { ...graph.problems };
  const opportunities = { ...graph.opportunities };
  const tasks = { ...graph.tasks };
  const newIds: Id[] = [];

  for (const bundle of bundles) {
    const stageId = makeId('stage');
    const problemIds = bundle.problems.map((problem) => {
      const id = makeId('problem');
      problems[id] = { ...problem, id, stageId };
      return id;
    });
    const problemIdMap = new Map(bundle.problems.map((problem, index) => [problem.id, problemIds[index]]));
    const opportunityIds = bundle.opportunities.map((opportunity) => {
      const id = makeId('opportunity');
      const taskIds = opportunity.taskIds.map((oldTaskId) => {
        const original = bundle.tasks.find((task) => task.id === oldTaskId);
        if (!original) return null;
        const taskId = makeId('task');
        tasks[taskId] = { ...original, id: taskId, opportunityId: id };
        return taskId;
      }).filter((item): item is Id => Boolean(item));
      opportunities[id] = {
        ...opportunity, id, stageId,
        problemIds: opportunity.problemIds.map((problemId) => problemIdMap.get(problemId)).filter((item): item is Id => Boolean(item)),
        taskIds,
      };
      return id;
    });
    const touchpointIds = bundle.touchpoints.map((point) => {
      const existing = touchpoints[point.id] ?? Object.values(touchpoints).find((item) => normalizeName(item.name) === normalizeName(point.name));
      if (existing) return existing.id;
      const id = makeId('touchpoint');
      touchpoints[id] = { ...point, id, serviceId: graph.service.id };
      return id;
    });
    stages[stageId] = {
      ...bundle.stage, id: stageId, journeyId: targetJourneyId,
      title: `${bundle.stage.title} (cópia)`, touchpointIds, problemIds, opportunityIds,
    };
    newIds.push(stageId);
  }

  const journeyId = targetJourneyId;
  const originalIds = graph.journeys[journeyId].stageIds;
  const index = afterId ? originalIds.indexOf(afterId) + 1 : originalIds.length;
  const stageIds = [...originalIds];
  stageIds.splice(index, 0, ...newIds);
  return {
    graph: {
      ...graph, stages, touchpoints, problems, opportunities, tasks,
      journeys: { ...graph.journeys, [journeyId]: { ...graph.journeys[journeyId], stageIds } },
      service: { ...graph.service, updatedAt: nowIso() },
    },
    newIds,
  };
};

export const deleteStageFromGraph = (graph: ServiceGraph, stageId: Id): ServiceGraph => {
  const stage = graph.stages[stageId];
  if (!stage) return graph;
  const stages = { ...graph.stages };
  delete stages[stageId];
  // Retention policy A2: service entities survive deletion of their map stage.
  // Only references to the removed stage are detached; entity IDs stay stable.
  const journey = graph.journeys[stage.journeyId];
  const entities = structuredClone(graph.entities ?? {});
  for (const collection of Object.values(entities)) {
    for (const entity of Object.values(collection)) {
      if (entity.stageId === stageId) entity.stageId = '';
    }
  }
  const next: ServiceGraph = {
    ...graph,
    service: { ...graph.service, updatedAt: nowIso() },
    journeys: { ...graph.journeys, [stage.journeyId]: { ...journey, stageIds: journey.stageIds.filter((id) => id !== stageId),
      mapLayout: journey.mapLayout ? { ...journey.mapLayout, lanes: journey.mapLayout.lanes.map((lane) => {
        if (!(stageId in lane.cards) && !(stageId in (lane.cardItems ?? {}))) return lane;
        const cards = { ...lane.cards };
        const cardItems = { ...lane.cardItems };
        delete cards[stageId];
        delete cardItems[stageId];
        return { ...lane, cards, cardItems };
      }) } : undefined } },
    stages,
    touchpoints: graph.touchpoints,
    problems: Object.fromEntries(Object.entries(graph.problems).map(([id, problem]) =>
      [id, problem.stageId === stageId ? { ...problem, stageId: '' } : problem])),
    opportunities: Object.fromEntries(Object.entries(graph.opportunities).map(([id, opportunity]) =>
      [id, opportunity.stageId === stageId ? { ...opportunity, stageId: '' } : opportunity])),
    tasks: Object.fromEntries(Object.entries(graph.tasks).map(([id, task]) =>
      [id, task.stageId === stageId ? { ...task, stageId: '' } : task])),
    entities,
  };
  return repairGraphReferences(next);
};

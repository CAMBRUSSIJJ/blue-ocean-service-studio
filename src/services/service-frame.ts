import type { GraphEntity, Id, ServiceFrameLayerKey, ServiceGraph, WhiteboardItem } from '../domain/model';

export type ServiceFrameLayerDefinition = {
  key: ServiceFrameLayerKey;
  label: string;
  question: string;
  defaultKind: string;
  visibleToCustomer: boolean;
};

export const SERVICE_FRAME_LAYERS: ServiceFrameLayerDefinition[] = [
  { key: 'customer', label: 'Cliente', question: 'O que a pessoa faz, precisa ou tenta alcançar?', defaultKind: 'customerAction', visibleToCustomer: true },
  { key: 'frontstage', label: 'Frontstage', question: 'Com quem ou com o que o cliente interage?', defaultKind: 'frontstage', visibleToCustomer: true },
  { key: 'backstage', label: 'Backstage', question: 'O que precisa acontecer sem o cliente ver?', defaultKind: 'backstage', visibleToCustomer: false },
  { key: 'process', label: 'Processos de suporte', question: 'Que processo, regra ou rotina sustenta este momento?', defaultKind: 'process', visibleToCustomer: false },
  { key: 'enablement', label: 'Sistemas e recursos', question: 'Que tecnologia, recurso ou infraestrutura permite a operação?', defaultKind: 'system', visibleToCustomer: false },
];

const KIND_TO_LAYER: Record<string, ServiceFrameLayerKey> = {
  persona: 'customer', need: 'customer', job: 'customer', pain: 'customer', problemHypothesis: 'customer', problem: 'customer', evidence: 'customer', emotion: 'customer', customerAction: 'customer',
  touchpoint: 'frontstage', channel: 'frontstage', frontstage: 'frontstage', person: 'frontstage', responsible: 'frontstage',
  backstage: 'backstage',
  process: 'process', task: 'process', opportunity: 'process',
  system: 'enablement', resource: 'enablement', metric: 'enablement',
};

export function isServiceFrameLayer(value: unknown): value is ServiceFrameLayerKey {
  return SERVICE_FRAME_LAYERS.some(layer => layer.key === value);
}

export function defaultServiceFrameLayer(kind?: string): ServiceFrameLayerKey {
  return KIND_TO_LAYER[String(kind ?? '')] ?? 'customer';
}

export function serviceFrameLayerForItem(item: WhiteboardItem): ServiceFrameLayerKey {
  if (isServiceFrameLayer(item.serviceLayer)) return item.serviceLayer;
  if (item.kind === 'smart') return defaultServiceFrameLayer(item.objectKind);
  return defaultServiceFrameLayer(item.semantic);
}

export function serviceFrameStageForItem(item: WhiteboardItem, graph: ServiceGraph): Id | null {
  if (item.serviceStageId && graph.stages[item.serviceStageId]) return item.serviceStageId;
  if (item.blueprintStageId && graph.stages[item.blueprintStageId]) return item.blueprintStageId;
  if (item.kind === 'smart') {
    const record = graph.entities[item.objectKind]?.[item.objectId] as GraphEntity | undefined;
    if (record?.stageId && graph.stages[record.stageId]) return record.stageId;
    if (item.objectKind === 'problem') return graph.problems[item.objectId]?.stageId ?? null;
    if (item.objectKind === 'opportunity') return graph.opportunities[item.objectId]?.stageId ?? null;
  }
  return null;
}

export function placeItemInServiceFrame<T extends WhiteboardItem>(item: T, stageId: Id, layer: ServiceFrameLayerKey): T {
  return { ...item, serviceStageId: stageId, serviceLayer: layer };
}

export type ServiceFrameStageCoverage = {
  stageId: Id;
  complete: number;
  total: number;
  percent: number;
  missing: ServiceFrameLayerKey[];
};

export type ServiceFrameCoverage = {
  complete: number;
  total: number;
  percent: number;
  stages: ServiceFrameStageCoverage[];
};

export function buildServiceFrameCoverage(graph: ServiceGraph, boardId: Id): ServiceFrameCoverage {
  const board = graph.views.whiteboards[boardId];
  if (!board) return { complete: 0, total: 0, percent: 0, stages: [] };
  const journeyId = board.journeyId ?? graph.service.journeyIds[0];
  const journey = journeyId ? graph.journeys[journeyId] : undefined;
  const stages = (journey?.stageIds ?? []).map(id => graph.stages[id]).filter(Boolean);
  const items = Object.values(board.items);
  const stageReports = stages.map(stage => {
    const present = new Set<ServiceFrameLayerKey>();
    if (String(stage.customerAction ?? '').trim()) present.add('customer');
    for (const item of items) {
      if (item.kind === 'smart' && item.objectKind === 'stage') continue;
      if (serviceFrameStageForItem(item, graph) !== stage.id) continue;
      present.add(serviceFrameLayerForItem(item));
    }
    const missing = SERVICE_FRAME_LAYERS.map(layer => layer.key).filter(key => !present.has(key));
    const complete = SERVICE_FRAME_LAYERS.length - missing.length;
    return { stageId: stage.id, complete, total: SERVICE_FRAME_LAYERS.length, percent: Math.round((complete / SERVICE_FRAME_LAYERS.length) * 100), missing };
  });
  const complete = stageReports.reduce((sum, stage) => sum + stage.complete, 0);
  const total = stageReports.reduce((sum, stage) => sum + stage.total, 0);
  return { complete, total, percent: total ? Math.round((complete / total) * 100) : 0, stages: stageReports };
}

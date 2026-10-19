import type { GraphEntity, Id, ServiceFrameLayerKey, ServiceGraph, WhiteboardItem } from '../domain/model.ts';
import { serviceFrameLayerForItem, serviceFrameStageForItem } from './service-frame.ts';

export type OperationalEntityKind = 'role' | 'channel' | 'dependency' | 'policy' | 'evidence';
export type OperationalLinkField = 'roleIds' | 'channelIds' | 'dependencyIds' | 'policyIds' | 'evidenceIds';
export type ServiceVisibility = 'customer-visible' | 'internal';
export type EvidenceMedium = 'physical' | 'digital' | 'human' | 'documentary' | 'operational';

export const OPERATIONAL_CONTEXT: Array<{
  kind: OperationalEntityKind;
  field: OperationalLinkField;
  label: string;
  question: string;
}> = [
  { kind: 'role', field: 'roleIds', label: 'Papéis', question: 'Quem executa ou responde por esta parte da entrega?' },
  { kind: 'channel', field: 'channelIds', label: 'Canais', question: 'Por qual canal a interação ou handoff acontece?' },
  { kind: 'dependency', field: 'dependencyIds', label: 'Dependências', question: 'Do que esta atividade depende para acontecer?' },
  { kind: 'policy', field: 'policyIds', label: 'Políticas', question: 'Que regra, limite ou política condiciona esta atividade?' },
  { kind: 'evidence', field: 'evidenceIds', label: 'Evidências', question: 'Que evidência física ou digital torna esta entrega observável?' },
];

const FIELD_BY_KIND: Record<OperationalEntityKind, OperationalLinkField> = {
  role: 'roleIds',
  channel: 'channelIds',
  dependency: 'dependencyIds',
  policy: 'policyIds',
  evidence: 'evidenceIds',
};

function ids(value: unknown): Id[] {
  return Array.isArray(value) ? [...new Set(value.filter((id): id is Id => typeof id === 'string' && id.length > 0))] : [];
}

export function serviceVisibilityForLayer(layer: ServiceFrameLayerKey): ServiceVisibility {
  return layer === 'customer' || layer === 'frontstage' ? 'customer-visible' : 'internal';
}

export function operationalLinkField(kind: OperationalEntityKind): OperationalLinkField {
  return FIELD_BY_KIND[kind];
}

export function operationalLinks(entity: GraphEntity | undefined): Record<OperationalLinkField, Id[]> {
  return {
    roleIds: ids(entity?.roleIds),
    channelIds: ids(entity?.channelIds),
    dependencyIds: ids(entity?.dependencyIds),
    policyIds: ids(entity?.policyIds),
    evidenceIds: ids(entity?.evidenceIds),
  };
}

export function setOperationalLink(entity: GraphEntity, kind: OperationalEntityKind, targetId: Id, linked: boolean): GraphEntity {
  const field = operationalLinkField(kind);
  const next = new Set(ids(entity[field]));
  if (linked) next.add(targetId);
  else next.delete(targetId);
  entity[field] = [...next];
  entity.updatedAt = new Date().toISOString();
  return entity;
}

export function evidenceMedium(entity: GraphEntity | undefined): EvidenceMedium {
  const value = String(entity?.evidenceMedium ?? entity?.medium ?? '').toLowerCase();
  return ['physical', 'digital', 'human', 'documentary', 'operational'].includes(value) ? value as EvidenceMedium : 'operational';
}

export function setEvidenceMedium(entity: GraphEntity, medium: EvidenceMedium): GraphEntity {
  entity.evidenceMedium = medium;
  entity.updatedAt = new Date().toISOString();
  return entity;
}

function entityForItem(graph: ServiceGraph, item: WhiteboardItem): GraphEntity | undefined {
  if (item.kind !== 'smart') return undefined;
  return graph.entities[item.objectKind]?.[item.objectId] as GraphEntity | undefined;
}

function linkedCount(graph: ServiceGraph, entity: GraphEntity | undefined, kind: OperationalEntityKind): number {
  const collection = graph.entities[kind] ?? {};
  return ids(entity?.[operationalLinkField(kind)]).filter(id => !!collection[id]).length;
}

function stageEvidence(graph: ServiceGraph, stageId: Id, media: EvidenceMedium[]): number {
  return Object.values(graph.entities?.evidence ?? {}).filter(entity => entity.stageId === stageId && media.includes(evidenceMedium(entity))).length;
}

export type FrontstageBackstageGap = {
  id: string;
  stageId: Id;
  area: 'frontstage' | 'backstage' | 'process' | 'enablement';
  label: string;
  detail: string;
};

export type FrontstageBackstageStageReport = {
  stageId: Id;
  frontstage: number;
  backstage: number;
  roles: number;
  channels: number;
  dependencies: number;
  policies: number;
  visibleEvidence: number;
  complete: number;
  total: number;
  percent: number;
  gaps: FrontstageBackstageGap[];
};

export type FrontstageBackstageReport = {
  version: 1;
  boardId: Id;
  stages: FrontstageBackstageStageReport[];
  complete: number;
  total: number;
  percent: number;
  gaps: FrontstageBackstageGap[];
};

export function buildFrontstageBackstageReport(graph: ServiceGraph, boardId: Id): FrontstageBackstageReport {
  const board = graph.views.whiteboards[boardId];
  if (!board) return { version: 1, boardId, stages: [], complete: 0, total: 0, percent: 0, gaps: [] };
  const journeyId = board.journeyId ?? graph.service.journeyIds[0];
  const journey = journeyId ? graph.journeys[journeyId] : undefined;
  const stages = (journey?.stageIds ?? []).map(id => graph.stages[id]).filter(Boolean);
  const items = Object.values(board.items ?? {});

  const reports = stages.map(stage => {
    const stageItems = items.filter(item => serviceFrameStageForItem(item, graph) === stage.id);
    const frontstageItems = stageItems.filter(item => serviceFrameLayerForItem(item) === 'frontstage');
    const backstageItems = stageItems.filter(item => serviceFrameLayerForItem(item) === 'backstage');
    const processItems = stageItems.filter(item => serviceFrameLayerForItem(item) === 'process');
    const enablementItems = stageItems.filter(item => serviceFrameLayerForItem(item) === 'enablement');
    const operational = [...frontstageItems, ...backstageItems, ...processItems, ...enablementItems].map(item => entityForItem(graph, item)).filter(Boolean) as GraphEntity[];
    const roles = operational.reduce((sum, entity) => sum + linkedCount(graph, entity, 'role'), 0);
    const channels = frontstageItems.map(item => entityForItem(graph, item)).filter(Boolean).reduce((sum, entity) => sum + linkedCount(graph, entity, 'channel'), 0);
    const dependencies = [...backstageItems, ...processItems, ...enablementItems].map(item => entityForItem(graph, item)).filter(Boolean).reduce((sum, entity) => sum + linkedCount(graph, entity, 'dependency'), 0);
    const policies = [...backstageItems, ...processItems].map(item => entityForItem(graph, item)).filter(Boolean).reduce((sum, entity) => sum + linkedCount(graph, entity, 'policy'), 0);
    const visibleEvidence = stageEvidence(graph, stage.id, ['physical', 'digital']);
    const gaps: FrontstageBackstageGap[] = [];
    const push = (id: string, area: FrontstageBackstageGap['area'], label: string, detail: string) => gaps.push({ id: `${stage.id}.${id}`, stageId: stage.id, area, label, detail });
    if (!frontstageItems.length) push('frontstage', 'frontstage', 'Frontstage ausente', 'Mapeie pelo menos uma interação visível ao cliente.');
    if (!backstageItems.length) push('backstage', 'backstage', 'Backstage ausente', 'Mapeie pelo menos uma atividade interna que sustente a interação visível.');
    if (frontstageItems.length && !channels) push('channel', 'frontstage', 'Canal não definido', 'A interação de Frontstage precisa indicar por onde acontece.');
    if ((frontstageItems.length || backstageItems.length || processItems.length) && !roles) push('role', 'backstage', 'Papel responsável não definido', 'Associe pelo menos um papel responsável à entrega desta etapa.');
    if ((backstageItems.length || processItems.length || enablementItems.length) && !dependencies) push('dependency', 'backstage', 'Dependências não mapeadas', 'Explicite o que precisa estar disponível antes desta operação acontecer.');
    if ((backstageItems.length || processItems.length) && !policies) push('policy', 'process', 'Política/regra não mapeada', 'Registre regras, limites ou políticas que condicionam a operação.');
    if (frontstageItems.length && !visibleEvidence) push('evidence', 'frontstage', 'Evidência visível ausente', 'Associe uma evidência física ou digital que o cliente percebe nesta etapa.');
    const total = 7;
    const complete = total - gaps.length;
    return { stageId: stage.id, frontstage: frontstageItems.length, backstage: backstageItems.length, roles, channels, dependencies, policies, visibleEvidence, complete, total, percent: Math.round((complete / total) * 100), gaps };
  });
  const complete = reports.reduce((sum, stage) => sum + stage.complete, 0);
  const total = reports.reduce((sum, stage) => sum + stage.total, 0);
  const gaps = reports.flatMap(stage => stage.gaps);
  return { version: 1, boardId, stages: reports, complete, total, percent: total ? Math.round((complete / total) * 100) : 0, gaps };
}

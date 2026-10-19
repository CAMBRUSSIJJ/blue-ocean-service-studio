import type {
  Id,
  ServiceGraph,
  ServiceMetricTargetKind,
  ServiceOperationTargetKind,
  ServiceGovernanceTargetKind,
} from '../domain/model';

/**
 * H7.40-H15 — Service Model Index
 *
 * Read-only projection over the canonical ServiceGraph. It does not migrate,
 * duplicate or mutate persisted objects. The index gives the product one
 * vocabulary for resolving objects, traversing relations, answering
 * "onde isso é usado?" and calculating model coverage.
 */

export type ServiceModelDomain =
  | 'service'
  | 'definition'
  | 'people'
  | 'discovery'
  | 'design'
  | 'improvement'
  | 'measurement'
  | 'operation'
  | 'governance'
  | 'research'
  | 'learning'
  | 'other';

export type ServiceModelKind =
  | 'service'
  | 'persona'
  | 'need'
  | 'job'
  | 'pain'
  | 'hypothesis'
  | 'validatedProblem'
  | 'evidence'
  | 'actor'
  | 'journey'
  | 'stage'
  | 'touchpoint'
  | 'channel'
  | 'stageProblem'
  | 'stageOpportunity'
  | 'task'
  | 'whiteboard'
  | 'blueprint'
  | 'improvementProblem'
  | 'improvementOpportunity'
  | 'initiative'
  | 'metric'
  | 'measurement'
  | 'researchProject'
  | 'researchSource'
  | 'researchObservation'
  | 'experiment'
  | 'learning'
  | 'decision'
  | 'governance'
  | 'operationBinding'
  | `entity:${string}`;

export type ServiceModelNode = {
  key: string;
  kind: ServiceModelKind;
  id: Id;
  label: string;
  domain: ServiceModelDomain;
  source: unknown;
};

export type ServiceModelRelation = {
  id: string;
  fromKey: string;
  toKey: string;
  type: string;
  label: string;
  source: string;
  metadata?: Record<string, string | number | boolean | undefined>;
};

export type ServiceModelIndex = {
  version: 1;
  serviceId: Id;
  nodes: Record<string, ServiceModelNode>;
  relations: ServiceModelRelation[];
  outgoing: Record<string, ServiceModelRelation[]>;
  incoming: Record<string, ServiceModelRelation[]>;
  keysById: Record<Id, string[]>;
};

export type ServiceModelUsage = {
  key: string;
  relationCount: number;
  relatedCount: number;
  incomingCount: number;
  outgoingCount: number;
  whiteboards: number;
  instances: number;
  byKind: Partial<Record<ServiceModelKind, number>>;
  relations: ServiceModelRelation[];
};

export type ServiceModelCoverage = {
  serviceId: Id;
  totalNodes: number;
  totalRelations: number;
  linkedNodes: number;
  orphanNodes: number;
  linkagePercent: number;
  countsByKind: Partial<Record<ServiceModelKind, number>>;
  countsByDomain: Record<ServiceModelDomain, number>;
  critical: Record<string, { total: number; linked: number; coverage: number }>;
};

const OBJECT_KIND_MAP: Record<string, ServiceModelKind> = {
  persona: 'persona',
  need: 'need',
  job: 'job',
  pain: 'pain',
  problemHypothesis: 'hypothesis',
  problem: 'validatedProblem',
  evidence: 'evidence',
  metric: 'metric',
  stage: 'stage',
  touchpoint: 'touchpoint',
  opportunity: 'stageOpportunity',
  task: 'task',
  channel: 'channel',
};

const DOMAIN_BY_KIND: Partial<Record<ServiceModelKind, ServiceModelDomain>> = {
  service: 'service',
  persona: 'people',
  actor: 'people',
  need: 'discovery',
  job: 'discovery',
  pain: 'discovery',
  hypothesis: 'discovery',
  validatedProblem: 'discovery',
  evidence: 'discovery',
  journey: 'design',
  stage: 'design',
  touchpoint: 'design',
  channel: 'design',
  stageProblem: 'design',
  stageOpportunity: 'improvement',
  task: 'improvement',
  whiteboard: 'design',
  blueprint: 'design',
  improvementProblem: 'improvement',
  improvementOpportunity: 'improvement',
  initiative: 'improvement',
  metric: 'measurement',
  measurement: 'measurement',
  researchProject: 'research',
  researchSource: 'research',
  researchObservation: 'research',
  experiment: 'learning',
  learning: 'learning',
  decision: 'learning',
  governance: 'governance',
  operationBinding: 'operation',
};

const keyOf = (kind: ServiceModelKind, id: Id) => `${kind}:${id}`;
const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const ids = (value: unknown): Id[] => Array.isArray(value) ? value.map(String).filter(Boolean) : [];
const percent = (done: number, total: number) => total > 0 ? Math.round((done / total) * 100) : 0;

function entityKind(kind: string): ServiceModelKind {
  return OBJECT_KIND_MAP[kind] ?? `entity:${kind}`;
}

function domainFor(kind: ServiceModelKind): ServiceModelDomain {
  if (kind.startsWith('entity:')) {
    const raw = kind.slice('entity:'.length);
    if (['frontstage', 'backstage', 'process', 'system', 'resource', 'responsible', 'role', 'dependency', 'policy', 'customerAction'].includes(raw)) return 'operation';
    if (['insight', 'expectation', 'emotion'].includes(raw)) return 'discovery';
    if (['benefit', 'solution'].includes(raw)) return 'improvement';
    return 'other';
  }
  return DOMAIN_BY_KIND[kind] ?? 'other';
}

function labelFor(value: unknown, fallback: string): string {
  if (!value || typeof value !== 'object') return fallback;
  const record = value as Record<string, unknown>;
  return text(record.title) || text(record.name) || text(record.description) || text(record.label) || fallback;
}

function targetKindForMetric(kind: ServiceMetricTargetKind): ServiceModelKind {
  return ({ proposition: 'entity:proposition', journey: 'journey', touchpoint: 'touchpoint', handoff: 'entity:handoff', blueprint: 'blueprint', initiative: 'initiative' } as const)[kind];
}

function targetKindForGovernance(kind: ServiceGovernanceTargetKind): ServiceModelKind {
  return ({ journey: 'journey', blueprint: 'blueprint', channel: 'channel', metric: 'metric', initiative: 'initiative' } as const)[kind];
}

function targetKindForOperation(kind: ServiceOperationTargetKind): ServiceModelKind {
  return ({ touchpoint: 'touchpoint', journey: 'journey', channel: 'channel', blueprint: 'blueprint', initiative: 'initiative', metric: 'metric' } as const)[kind];
}

export function serviceModelKindFromContextKind(kind: string): ServiceModelKind {
  return OBJECT_KIND_MAP[kind] ?? entityKind(kind);
}

export function serviceModelIndex(graph: ServiceGraph): ServiceModelIndex {
  const nodes: Record<string, ServiceModelNode> = {};
  const keysById: Record<Id, string[]> = {};
  const relations: ServiceModelRelation[] = [];
  const relationIds = new Set<string>();

  const addNode = (kind: ServiceModelKind, id: Id | undefined, value: unknown, fallback: string, domain = domainFor(kind)) => {
    if (!id) return '';
    const key = keyOf(kind, id);
    if (!nodes[key]) {
      nodes[key] = { key, kind, id, label: labelFor(value, fallback), domain, source: value };
      (keysById[id] ||= []).push(key);
    }
    return key;
  };

  const addRelation = (
    fromKey: string,
    toKey: string,
    type: string,
    label: string,
    source: string,
    occurrence = '',
    metadata?: ServiceModelRelation['metadata'],
  ) => {
    if (!fromKey || !toKey || fromKey === toKey || !nodes[fromKey] || !nodes[toKey]) return;
    const id = `${fromKey}>${type}>${toKey}${occurrence ? `@${occurrence}` : ''}`;
    if (relationIds.has(id)) return;
    relationIds.add(id);
    relations.push({ id, fromKey, toKey, type, label, source, metadata });
  };

  const firstKey = (id: Id, preferred?: ServiceModelKind): string => {
    if (preferred) {
      const exact = keyOf(preferred, id);
      if (nodes[exact]) return exact;
    }
    return keysById[id]?.[0] ?? '';
  };

  const addIdRelation = (fromKey: string, id: Id, preferred: ServiceModelKind | undefined, type: string, label: string, source: string, occurrence = '') => {
    addRelation(fromKey, firstKey(id, preferred), type, label, source, occurrence);
  };

  // 1. Register canonical nodes first so relation resolution never depends on traversal order.
  addNode('service', graph.service.id, graph.service, graph.service.name || 'Serviço');

  for (const [rawKind, collection] of Object.entries(graph.entities ?? {})) {
    const kind = entityKind(rawKind);
    for (const entity of Object.values(collection)) addNode(kind, entity.id, entity, rawKind);
  }
  for (const item of Object.values(graph.journeys ?? {})) addNode('journey', item.id, item, 'Journey');
  for (const item of Object.values(graph.stages ?? {})) addNode('stage', item.id, item, 'Etapa');
  for (const item of Object.values(graph.touchpoints ?? {})) addNode('touchpoint', item.id, item, 'Touchpoint');
  for (const item of Object.values(graph.channels ?? {})) addNode('channel', item.id, item, 'Canal');
  for (const item of Object.values(graph.channelHandoffs ?? {})) {
    const from = graph.channels?.[item.fromChannelId]?.name ?? item.fromChannelId;
    const to = graph.channels?.[item.toChannelId]?.name ?? item.toChannelId;
    addNode('entity:handoff', item.id, { ...item, label: `${from} → ${to}` }, 'Handoff de canal', 'design');
  }
  for (const item of Object.values(graph.problems ?? {})) addNode('stageProblem', item.id, item, 'Problema observado');
  for (const item of Object.values(graph.opportunities ?? {})) addNode('stageOpportunity', item.id, item, 'Oportunidade');
  for (const item of Object.values(graph.tasks ?? {})) addNode('task', item.id, item, 'Ação');

  for (const board of Object.values(graph.views?.whiteboards ?? {})) {
    const kind: ServiceModelKind = board.viewKind === 'blueprint' || board.layoutMode === 'blueprint' ? 'blueprint' : 'whiteboard';
    addNode(kind, board.id, board, kind === 'blueprint' ? 'Service Blueprint' : 'Whiteboard');
  }

  for (const actor of Object.values(graph.service.ecology?.stakeholders ?? {})) addNode('actor', actor.id, actor, 'Ator');
  for (const problem of Object.values(graph.service.improvementBacklog?.problems ?? {})) addNode('improvementProblem', problem.id, problem, 'Problema priorizado');
  for (const opportunity of Object.values(graph.service.improvementBacklog?.opportunities ?? {})) addNode('improvementOpportunity', opportunity.id, opportunity, 'Oportunidade de melhoria');
  for (const initiative of Object.values(graph.service.improvementPortfolio?.initiatives ?? {})) addNode('initiative', initiative.id, initiative, 'Iniciativa');
  for (const measurement of Object.values(graph.service.outcomes?.measurements ?? {})) addNode('measurement', measurement.id, measurement, 'Medição');

  for (const project of Object.values(graph.research?.projects ?? {})) addNode('researchProject', project.id, project, 'Pesquisa');
  for (const source of Object.values(graph.research?.sources ?? {})) addNode('researchSource', source.id, source, 'Fonte de pesquisa');
  for (const observation of Object.values(graph.research?.observations ?? {})) addNode('researchObservation', observation.id, observation, 'Observação');

  for (const experiment of Object.values(graph.service.prototypeLab?.experiments ?? {})) addNode('experiment', experiment.id, experiment, 'Experimento');
  for (const learning of Object.values(graph.service.learningSystem?.records ?? {})) addNode('learning', learning.id, learning, 'Aprendizado');
  for (const decision of Object.values(graph.service.decisionSystem?.records ?? {})) addNode('decision', decision.id, decision, 'Decisão');
  for (const governance of Object.values(graph.service.governance?.records ?? {})) addNode('governance', governance.id, governance, 'Governança');
  for (const binding of Object.values(graph.service.operationsBridge?.bindings ?? {})) addNode('operationBinding', binding.id, binding, 'Vínculo operacional');

  // 2. Context/discovery relations. Generic fields preserve the existing flexible GraphEntity model.
  const contextHints: Array<[string, ServiceModelKind | undefined, string]> = [
    ['personaIds', 'persona', 'persona'], ['needIds', 'need', 'necessidade'], ['jobIds', 'job', 'job'], ['painIds', 'pain', 'dor'],
    ['hypothesisIds', 'hypothesis', 'hipótese'], ['problemIds', 'validatedProblem', 'problema'], ['evidenceIds', 'evidence', 'evidência'],
    ['supportingEvidenceIds', 'evidence', 'evidência que sustenta'], ['contradictingEvidenceIds', 'evidence', 'evidência que contradiz'],
    ['contextIds', undefined, 'contexto'], ['relatedIds', undefined, 'relacionado'],
  ];
  for (const [rawKind, collection] of Object.entries(graph.entities ?? {})) {
    const kind = entityKind(rawKind);
    for (const entity of Object.values(collection)) {
      const fromKey = keyOf(kind, entity.id);
      for (const [field, preferred, label] of contextHints) {
        for (const id of ids(entity[field])) addIdRelation(fromKey, id, preferred, field, label, `entity.${rawKind}.${field}`);
      }
      if (text(entity.sourceHypothesisId)) addIdRelation(fromKey, String(entity.sourceHypothesisId), 'hypothesis', 'sourceHypothesis', 'hipótese de origem', `entity.${rawKind}.sourceHypothesisId`);
      if (text(entity.validatedProblemId)) addIdRelation(fromKey, String(entity.validatedProblemId), 'validatedProblem', 'validatedProblem', 'problema validado', `entity.${rawKind}.validatedProblemId`);
    }
  }

  // 3. Journey, stages and touchpoints.
  for (const journey of Object.values(graph.journeys ?? {})) {
    const from = keyOf('journey', journey.id);
    for (const id of journey.stageIds) addIdRelation(from, id, 'stage', 'containsStage', 'contém etapa', 'journey.stageIds');
    for (const id of journey.designContext?.personaIds ?? []) addIdRelation(from, id, 'persona', 'designContext', 'contexto de design', 'journey.designContext.personaIds');
    for (const id of journey.designContext?.needIds ?? []) addIdRelation(from, id, 'need', 'designContext', 'contexto de design', 'journey.designContext.needIds');
    for (const id of journey.designContext?.jobIds ?? []) addIdRelation(from, id, 'job', 'designContext', 'contexto de design', 'journey.designContext.jobIds');
    for (const id of journey.designContext?.painIds ?? []) addIdRelation(from, id, 'pain', 'designContext', 'contexto de design', 'journey.designContext.painIds');
    for (const id of journey.designContext?.problemIds ?? []) addIdRelation(from, id, 'validatedProblem', 'designContext', 'contexto de design', 'journey.designContext.problemIds');
    for (const id of journey.designContext?.evidenceIds ?? []) addIdRelation(from, id, 'evidence', 'designContext', 'contexto de design', 'journey.designContext.evidenceIds');
  }
  for (const stage of Object.values(graph.stages ?? {})) {
    const from = keyOf('stage', stage.id);
    addIdRelation(from, stage.journeyId, 'journey', 'belongsToJourney', 'pertence à Journey', 'stage.journeyId');
    for (const id of stage.needIds ?? []) addIdRelation(from, id, 'need', 'need', 'necessidade', 'stage.needIds');
    for (const id of stage.touchpointIds) addIdRelation(from, id, 'touchpoint', 'touchpoint', 'ponto de contato', 'stage.touchpointIds');
    for (const id of stage.validatedProblemIds ?? []) addIdRelation(from, id, 'validatedProblem', 'validatedProblem', 'problema validado', 'stage.validatedProblemIds');
    for (const id of stage.evidenceIds ?? []) addIdRelation(from, id, 'evidence', 'evidence', 'evidência', 'stage.evidenceIds');
    for (const id of stage.problemIds) addIdRelation(from, id, 'stageProblem', 'observedProblem', 'problema observado', 'stage.problemIds');
    for (const id of stage.opportunityIds) addIdRelation(from, id, 'stageOpportunity', 'opportunity', 'oportunidade', 'stage.opportunityIds');
  }
  for (const point of Object.values(graph.touchpoints ?? {})) if (point.channelId) addIdRelation(keyOf('touchpoint', point.id), point.channelId, 'channel', 'channel', 'canal', 'touchpoint.channelId');

  for (const handoff of Object.values(graph.channelHandoffs ?? {})) {
    const handoffKey = keyOf('entity:handoff', handoff.id);
    const from = firstKey(handoff.fromChannelId, 'channel');
    const to = firstKey(handoff.toChannelId, 'channel');
    addRelation(handoffKey, from, 'fromChannel', 'canal de origem', 'channelHandoffs', handoff.id);
    addRelation(handoffKey, to, 'toChannel', 'canal de destino', 'channelHandoffs', handoff.id);
    addRelation(from, to, 'channelHandoff', 'handoff de canal', 'channelHandoffs', handoff.id, { handoffId: handoff.id });
  }

  // 4. Operational work objects already present in the graph.
  for (const problem of Object.values(graph.problems ?? {})) addIdRelation(keyOf('stageProblem', problem.id), problem.stageId, 'stage', 'observedAt', 'observado na etapa', 'problem.stageId');
  for (const opportunity of Object.values(graph.opportunities ?? {})) {
    const from = keyOf('stageOpportunity', opportunity.id);
    addIdRelation(from, opportunity.stageId, 'stage', 'belongsToStage', 'pertence à etapa', 'opportunity.stageId');
    for (const id of opportunity.problemIds) addIdRelation(from, id, 'stageProblem', 'addressesProblem', 'responde ao problema', 'opportunity.problemIds');
    for (const id of opportunity.taskIds) addIdRelation(from, id, 'task', 'hasTask', 'possui ação', 'opportunity.taskIds');
    for (const id of opportunity.metricIds ?? []) addIdRelation(from, id, 'metric', 'metric', 'métrica', 'opportunity.metricIds');
  }
  for (const task of Object.values(graph.tasks ?? {})) {
    const from = keyOf('task', task.id);
    addIdRelation(from, task.opportunityId, 'stageOpportunity', 'belongsToOpportunity', 'pertence à oportunidade', 'task.opportunityId');
    if (task.stageId) addIdRelation(from, task.stageId, 'stage', 'stage', 'etapa', 'task.stageId');
    if (task.journeyId) addIdRelation(from, task.journeyId, 'journey', 'journey', 'Journey', 'task.journeyId');
    for (const id of task.metricIds ?? []) addIdRelation(from, id, 'metric', 'metric', 'métrica', 'task.metricIds');
    for (const id of task.dependencyIds ?? []) addIdRelation(from, id, 'task', 'dependsOn', 'depende de', 'task.dependencyIds');
  }

  // 5. Whiteboards/Blueprints are views. Each smart card becomes a usage instance.
  for (const board of Object.values(graph.views?.whiteboards ?? {})) {
    const boardKind: ServiceModelKind = board.viewKind === 'blueprint' || board.layoutMode === 'blueprint' ? 'blueprint' : 'whiteboard';
    const from = keyOf(boardKind, board.id);
    if (board.journeyId) addIdRelation(from, board.journeyId, 'journey', 'journey', 'Journey do quadro', 'whiteboard.journeyId');
    for (const id of board.designContext?.personaIds ?? []) addIdRelation(from, id, 'persona', 'designContext', 'contexto de design', 'whiteboard.designContext.personaIds');
    for (const id of board.designContext?.needIds ?? []) addIdRelation(from, id, 'need', 'designContext', 'contexto de design', 'whiteboard.designContext.needIds');
    for (const id of board.designContext?.jobIds ?? []) addIdRelation(from, id, 'job', 'designContext', 'contexto de design', 'whiteboard.designContext.jobIds');
    for (const id of board.designContext?.painIds ?? []) addIdRelation(from, id, 'pain', 'designContext', 'contexto de design', 'whiteboard.designContext.painIds');
    for (const id of board.designContext?.problemIds ?? []) addIdRelation(from, id, 'validatedProblem', 'designContext', 'contexto de design', 'whiteboard.designContext.problemIds');
    for (const id of board.designContext?.evidenceIds ?? []) addIdRelation(from, id, 'evidence', 'designContext', 'contexto de design', 'whiteboard.designContext.evidenceIds');
    for (const item of Object.values(board.items ?? {})) {
      if (item.kind !== 'smart') continue;
      const preferred = item.objectKind === 'problem'
        ? (nodes[keyOf('validatedProblem', item.objectId)] ? 'validatedProblem' : 'stageProblem')
        : serviceModelKindFromContextKind(item.objectKind);
      addIdRelation(from, item.objectId, preferred, 'visualizes', 'usado no quadro', 'whiteboard.smartItem', item.id);
    }
  }

  // 6. Service definition/project context.
  const serviceKey = keyOf('service', graph.service.id);
  const definition = graph.service.project?.definition;
  if (definition) {
    for (const id of definition.personaIds) addIdRelation(serviceKey, id, 'persona', 'definition', 'incluído na definição', 'service.project.definition.personaIds');
    for (const id of definition.problemIds) addIdRelation(serviceKey, id, 'validatedProblem', 'definition', 'incluído na definição', 'service.project.definition.problemIds');
    for (const id of definition.evidenceIds) addIdRelation(serviceKey, id, 'evidence', 'definition', 'incluído na definição', 'service.project.definition.evidenceIds');
  }

  // 7. Service ecology: actors are canonical, the network is a projection of actor relations.
  for (const actor of Object.values(graph.service.ecology?.stakeholders ?? {})) {
    const from = keyOf('actor', actor.id);
    if (actor.personaId) addIdRelation(from, actor.personaId, 'persona', 'persona', 'persona relacionada', 'ecology.stakeholder.personaId');
    for (const id of actor.evidenceIds) addIdRelation(from, id, 'evidence', 'evidence', 'evidência', 'ecology.stakeholder.evidenceIds');
  }
  for (const relation of Object.values(graph.service.ecology?.relations ?? {})) {
    addRelation(firstKey(relation.fromId, 'actor'), firstKey(relation.toId, 'actor'), `actor:${relation.kind}`, relation.kind, 'ecology.relations', relation.id, { strength: relation.strength });
  }

  // 8. Proposition, research and learning chain.
  const proposition = graph.service.proposition?.current;
  if (proposition) {
    addNode('entity:proposition', graph.service.id, proposition, 'Proposição do serviço', 'definition');
    const from = keyOf('entity:proposition', graph.service.id);
    for (const id of proposition.linkedInsightIds) addIdRelation(from, id, 'entity:insight', 'insight', 'insight', 'proposition.linkedInsightIds');
    for (const id of proposition.linkedNeedIds) addIdRelation(from, id, 'need', 'need', 'necessidade', 'proposition.linkedNeedIds');
    for (const id of proposition.linkedProblemIds) addIdRelation(from, id, 'validatedProblem', 'problem', 'problema', 'proposition.linkedProblemIds');
    for (const id of proposition.linkedEvidenceIds) addIdRelation(from, id, 'evidence', 'evidence', 'evidência', 'proposition.linkedEvidenceIds');
  }
  for (const project of Object.values(graph.research?.projects ?? {})) {
    const from = keyOf('researchProject', project.id);
    for (const id of project.sourceIds) addIdRelation(from, id, 'researchSource', 'source', 'fonte', 'research.project.sourceIds');
    for (const id of project.observationIds) addIdRelation(from, id, 'researchObservation', 'observation', 'observação', 'research.project.observationIds');
  }
  for (const observation of Object.values(graph.research?.observations ?? {})) {
    const from = keyOf('researchObservation', observation.id);
    if (observation.projectId) addIdRelation(from, observation.projectId, 'researchProject', 'project', 'pesquisa', 'research.observation.projectId');
    if (observation.sourceId) addIdRelation(from, observation.sourceId, 'researchSource', 'source', 'fonte', 'research.observation.sourceId');
    if (observation.evidenceId) addIdRelation(from, observation.evidenceId, 'evidence', 'evidence', 'evidência', 'research.observation.evidenceId');
  }
  for (const experiment of Object.values(graph.service.prototypeLab?.experiments ?? {})) {
    const from = keyOf('experiment', experiment.id);
    if (experiment.journeyId) addIdRelation(from, experiment.journeyId, 'journey', 'journey', 'Journey', 'prototype.experiment.journeyId');
    for (const id of experiment.stageIds) addIdRelation(from, id, 'stage', 'stage', 'etapa', 'prototype.experiment.stageIds');
    for (const id of experiment.touchpointIds) addIdRelation(from, id, 'touchpoint', 'touchpoint', 'touchpoint', 'prototype.experiment.touchpointIds');
  }
  for (const learning of Object.values(graph.service.learningSystem?.records ?? {})) {
    const from = keyOf('learning', learning.id);
    addIdRelation(from, learning.experimentId, 'experiment', 'experiment', 'experimento', 'learning.experimentId');
    for (const id of learning.evidenceIds) addIdRelation(from, id, 'evidence', 'evidence', 'evidência', 'learning.evidenceIds');
  }
  for (const decision of Object.values(graph.service.decisionSystem?.records ?? {})) {
    const from = keyOf('decision', decision.id);
    addIdRelation(from, decision.learningId, 'learning', 'learning', 'aprendizado', 'decision.learningId');
    for (const change of decision.changes) {
      if (!change.targetId) continue;
      const targetKind: ServiceModelKind = change.targetKind === 'journey' ? 'journey' : change.targetKind === 'blueprint' ? 'blueprint' : 'entity:proposition';
      addIdRelation(from, change.targetId, targetKind, 'changes', 'altera', 'decision.change', change.id);
    }
  }

  // 9. Improvement lifecycle.
  for (const problem of Object.values(graph.service.improvementBacklog?.problems ?? {})) {
    const from = keyOf('improvementProblem', problem.id);
    for (const id of problem.evidenceIds) addIdRelation(from, id, 'evidence', 'evidence', 'evidência', 'improvementProblem.evidenceIds');
    for (const source of problem.sourceRefs) {
      const preferred: ServiceModelKind | undefined = ({
        validated_problem: 'validatedProblem', journey: 'journey', channel: 'channel', prototype: 'experiment', blueprint: 'blueprint', research: undefined, current_future: undefined,
      } as const)[source.kind];
      addIdRelation(from, source.sourceId, preferred, 'source', 'origem', `improvementProblem.sourceRefs.${source.kind}`, `${source.kind}:${source.sourceId}`);
    }
  }
  for (const opportunity of Object.values(graph.service.improvementBacklog?.opportunities ?? {})) {
    const from = keyOf('improvementOpportunity', opportunity.id);
    for (const id of opportunity.problemIds) addIdRelation(from, id, 'improvementProblem', 'problem', 'problema priorizado', 'improvementOpportunity.problemIds');
  }
  for (const initiative of Object.values(graph.service.improvementPortfolio?.initiatives ?? {})) {
    const from = keyOf('initiative', initiative.id);
    addIdRelation(from, initiative.opportunityId, 'improvementOpportunity', 'opportunity', 'oportunidade', 'initiative.opportunityId');
    for (const id of initiative.problemIds) addIdRelation(from, id, 'improvementProblem', 'problem', 'problema', 'initiative.problemIds');
    for (const id of initiative.dependencyIds) addIdRelation(from, id, 'initiative', 'dependsOn', 'depende de', 'initiative.dependencyIds');
    for (const id of initiative.decisionIds) addIdRelation(from, id, 'decision', 'decision', 'decisão', 'initiative.decisionIds');
    for (const id of initiative.experimentIds) addIdRelation(from, id, 'experiment', 'experiment', 'experimento', 'initiative.experimentIds');
    for (const id of initiative.metricIds) addIdRelation(from, id, 'metric', 'metric', 'métrica', 'initiative.metricIds');
  }

  // 10. Measurement, governance and operations reuse the same object resolver.
  for (const binding of Object.values(graph.service.outcomes?.bindings ?? {})) {
    addIdRelation(firstKey(binding.metricId, 'metric'), binding.targetId, targetKindForMetric(binding.targetKind), `metric:${binding.role}`, 'mede', 'outcomes.bindings', binding.id);
  }
  for (const measurement of Object.values(graph.service.outcomes?.measurements ?? {})) {
    addIdRelation(keyOf('measurement', measurement.id), measurement.metricId, 'metric', 'measurement', 'medição de', 'outcomes.measurements');
  }
  for (const governance of Object.values(graph.service.governance?.records ?? {})) {
    addIdRelation(keyOf('governance', governance.id), governance.targetId, targetKindForGovernance(governance.targetKind), 'governs', 'governa', 'governance.records');
  }
  for (const binding of Object.values(graph.service.operationsBridge?.bindings ?? {})) {
    addIdRelation(keyOf('operationBinding', binding.id), binding.targetId, targetKindForOperation(binding.targetKind), 'operates', 'conecta à operação', 'operationsBridge.bindings');
  }

  const outgoing: Record<string, ServiceModelRelation[]> = {};
  const incoming: Record<string, ServiceModelRelation[]> = {};
  for (const relation of relations) {
    (outgoing[relation.fromKey] ||= []).push(relation);
    (incoming[relation.toKey] ||= []).push(relation);
  }

  return { version: 1, serviceId: graph.service.id, nodes, relations, outgoing, incoming, keysById };
}

export function resolveObject(index: ServiceModelIndex, kind: ServiceModelKind, id: Id): ServiceModelNode | null {
  return index.nodes[keyOf(kind, id)] ?? null;
}

export function relationsFor(index: ServiceModelIndex, kind: ServiceModelKind, id: Id): ServiceModelRelation[] {
  const key = keyOf(kind, id);
  const relations = [...(index.outgoing[key] ?? []), ...(index.incoming[key] ?? [])];
  return [...new Map(relations.map((item) => [item.id, item])).values()];
}

export function usageFor(index: ServiceModelIndex, kind: ServiceModelKind, id: Id): ServiceModelUsage {
  const key = keyOf(kind, id);
  const incoming = index.incoming[key] ?? [];
  const outgoing = index.outgoing[key] ?? [];
  const relations = [...new Map([...incoming, ...outgoing].map((item) => [item.id, item])).values()];
  const relatedKeys = new Set<string>();
  const whiteboardKeys = new Set<string>();
  let instances = 0;
  for (const relation of relations) {
    const other = relation.fromKey === key ? relation.toKey : relation.fromKey;
    if (other !== key) relatedKeys.add(other);
    if (relation.type === 'visualizes' && relation.toKey === key) {
      whiteboardKeys.add(relation.fromKey);
      instances += 1;
    }
  }
  const byKind: Partial<Record<ServiceModelKind, number>> = {};
  for (const relatedKey of relatedKeys) {
    const related = index.nodes[relatedKey];
    if (related) byKind[related.kind] = (byKind[related.kind] ?? 0) + 1;
  }
  return {
    key,
    relationCount: relations.length,
    relatedCount: relatedKeys.size,
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
    whiteboards: whiteboardKeys.size,
    instances,
    byKind,
    relations,
  };
}

export function coverageFor(index: ServiceModelIndex, serviceId = index.serviceId): ServiceModelCoverage {
  const modelNodes = Object.values(index.nodes).filter((node) => node.kind !== 'service');
  const linked = modelNodes.filter((node) => (index.incoming[node.key]?.length ?? 0) + (index.outgoing[node.key]?.length ?? 0) > 0);
  const countsByKind: Partial<Record<ServiceModelKind, number>> = {};
  const countsByDomain: Record<ServiceModelDomain, number> = {
    service: 0, definition: 0, people: 0, discovery: 0, design: 0, improvement: 0, measurement: 0, operation: 0, governance: 0, research: 0, learning: 0, other: 0,
  };
  for (const node of modelNodes) {
    countsByKind[node.kind] = (countsByKind[node.kind] ?? 0) + 1;
    countsByDomain[node.domain] += 1;
  }
  const criticalKinds: ServiceModelKind[] = ['persona', 'need', 'pain', 'validatedProblem', 'evidence', 'actor', 'journey', 'touchpoint', 'blueprint', 'initiative', 'metric'];
  const critical: ServiceModelCoverage['critical'] = {};
  for (const kind of criticalKinds) {
    const nodes = modelNodes.filter((node) => node.kind === kind);
    const linkedCount = nodes.filter((node) => (index.incoming[node.key]?.length ?? 0) + (index.outgoing[node.key]?.length ?? 0) > 0).length;
    critical[kind] = { total: nodes.length, linked: linkedCount, coverage: percent(linkedCount, nodes.length) };
  }
  return {
    serviceId,
    totalNodes: modelNodes.length,
    totalRelations: index.relations.length,
    linkedNodes: linked.length,
    orphanNodes: modelNodes.length - linked.length,
    linkagePercent: percent(linked.length, modelNodes.length),
    countsByKind,
    countsByDomain,
    critical,
  };
}

/** Convenience helper for consumers that only have the graph. */
export function serviceModelUsage(graph: ServiceGraph, kind: ServiceModelKind, id: Id): ServiceModelUsage {
  return usageFor(serviceModelIndex(graph), kind, id);
}

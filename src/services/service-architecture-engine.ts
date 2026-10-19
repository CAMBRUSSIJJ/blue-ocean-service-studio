import type { GraphEntity, Journey, ServiceGraph, Stage, WhiteboardView } from '../domain/model';

export type ArchitectureLayerId = 'experience' | 'service' | 'operation' | 'improvement' | 'results';
export type ArchitectureActionId = 'journey' | 'blueprint' | 'action' | 'intelligence' | 'research';
export type ArchitectureGapSeverity = 'high' | 'medium' | 'low';

export type ArchitectureCount = {
  id: string;
  label: string;
  value: number;
};

export type ArchitectureLayer = {
  id: ArchitectureLayerId;
  label: string;
  score: number;
  summary: string;
  actionId: ArchitectureActionId;
  actionLabel: string;
  counts: ArchitectureCount[];
};

export type ArchitectureJourney = {
  id: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  stageCount: number;
  touchpointCount: number;
  blueprintCount: number;
  opportunityCount: number;
  metricCount: number;
  stageTitles: string[];
  coverage: number;
};

export type ArchitectureGap = {
  id: string;
  severity: ArchitectureGapSeverity;
  priority: number;
  label: string;
  detail: string;
  actionId: ArchitectureActionId;
  actionLabel: string;
};

export type ServiceArchitectureReport = {
  serviceId: string;
  serviceName: string;
  score: number;
  label: string;
  formula: string;
  counts: {
    journeys: number;
    stages: number;
    touchpoints: number;
    blueprints: number;
    processes: number;
    systems: number;
    opportunities: number;
    initiatives: number;
    metrics: number;
    benefits: number;
  };
  layers: ArchitectureLayer[];
  journeys: ArchitectureJourney[];
  primaryJourney: ArchitectureJourney | null;
  primaryFlow: Array<{ id: string; title: string; touchpoints: number; opportunities: number }>;
  gaps: ArchitectureGap[];
};

type WeightedCheck = { score: number; weight: number };

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const ratio = (done: number, total: number, emptyScore = 0) => total > 0 ? clamp((done / total) * 100) : emptyScore;
const entityValues = (graph: ServiceGraph, kind: string) => Object.values(graph.entities?.[kind] ?? {}) as GraphEntity[];
const boardValues = (graph: ServiceGraph) => Object.values(graph.views?.whiteboards ?? {}) as WhiteboardView[];
const blueprintBoards = (graph: ServiceGraph) => boardValues(graph).filter((board) => board.viewKind === 'blueprint' || board.layoutMode === 'blueprint');

function weighted(checks: WeightedCheck[]) {
  const denominator = checks.reduce((sum, item) => sum + item.weight, 0) || 1;
  return clamp(checks.reduce((sum, item) => sum + clamp(item.score) * item.weight, 0) / denominator);
}

function stagesFor(graph: ServiceGraph, journey: Journey) {
  return journey.stageIds.map((id) => graph.stages[id]).filter((item): item is Stage => Boolean(item));
}

function journeyCoverage(graph: ServiceGraph, journey: Journey) {
  const stages = stagesFor(graph, journey);
  const actionCoverage = ratio(stages.filter((stage) => hasText(stage.customerAction)).length, stages.length);
  const touchpointCoverage = ratio(stages.filter((stage) => stage.touchpointIds.length > 0).length, stages.length);
  const evidence = entityValues(graph, 'evidence');
  const evidenceCoverage = ratio(stages.filter((stage) => evidence.some((item) => item.stageId === stage.id)).length, stages.length);
  return weighted([
    { score: stages.length ? 100 : 0, weight: 25 },
    { score: actionCoverage, weight: 30 },
    { score: touchpointCoverage, weight: 30 },
    { score: evidenceCoverage, weight: 15 },
  ]);
}

function journeyReport(graph: ServiceGraph, journey: Journey): ArchitectureJourney {
  const stages = stagesFor(graph, journey);
  const stageIds = new Set(stages.map((stage) => stage.id));
  const opportunityIds = new Set(stages.flatMap((stage) => stage.opportunityIds));
  const linkedBlueprints = blueprintBoards(graph).filter((board) => board.journeyId === journey.id);
  const metricCount = entityValues(graph, 'metric').filter((item) => item.journeyId === journey.id || (hasText(item.stageId) && stageIds.has(String(item.stageId)))).length;
  return {
    id: journey.id,
    name: journey.name,
    status: journey.status ?? 'draft',
    stageCount: stages.length,
    touchpointCount: new Set(stages.flatMap((stage) => stage.touchpointIds)).size,
    blueprintCount: linkedBlueprints.length,
    opportunityCount: opportunityIds.size,
    metricCount,
    stageTitles: stages.map((stage) => stage.title).filter(Boolean),
    coverage: journeyCoverage(graph, journey),
  };
}

function architectureLabel(score: number) {
  if (score >= 80) return 'Estrutura conectada';
  if (score >= 60) return 'Estrutura em evolução';
  return 'Estrutura incompleta';
}

export function buildServiceArchitectureReport(graph: ServiceGraph): ServiceArchitectureReport {
  const journeys = Object.values(graph.journeys);
  const stages = Object.values(graph.stages);
  const touchpoints = Object.values(graph.touchpoints);
  const opportunities = Object.values(graph.opportunities);
  const tasks = Object.values(graph.tasks);
  const boards = blueprintBoards(graph);
  const processes = entityValues(graph, 'process');
  const systems = entityValues(graph, 'system');
  const resources = entityValues(graph, 'resource');
  const responsible = entityValues(graph, 'responsible');
  const metrics = entityValues(graph, 'metric');
  const benefits = entityValues(graph, 'benefit');
  const evidence = entityValues(graph, 'evidence');

  const customerActionCoverage = ratio(stages.filter((stage) => hasText(stage.customerAction)).length, stages.length);
  const touchpointStageCoverage = ratio(stages.filter((stage) => stage.touchpointIds.length > 0).length, stages.length);
  const emotionCoverage = ratio(stages.filter((stage) => Boolean(stage.emotion)).length, stages.length);
  const evidenceCoverage = ratio(stages.filter((stage) => evidence.some((item) => item.stageId === stage.id)).length, stages.length);
  const blueprintFieldCoverage = ratio([
    graph.blueprintDraft.frontstage,
    graph.blueprintDraft.backstage,
    graph.blueprintDraft.suporte,
    graph.blueprintDraft.evidencias,
  ].filter(hasText).length, 4);
  const opportunityOwnerCoverage = ratio(opportunities.filter((item) => hasText(item.owner)).length, opportunities.length, 100);
  const opportunityExecutionCoverage = ratio(opportunities.filter((item) => item.taskIds.length > 0).length, opportunities.length, tasks.length ? 100 : 0);
  const taskOwnerCoverage = ratio(tasks.filter((item) => hasText(item.owner)).length, tasks.length, 100);
  const metricLinks = metrics.filter((metric) => hasText(metric.stageId) || hasText(metric.journeyId) || hasText(metric.serviceId)).length;
  const metricLinkCoverage = ratio(metricLinks, metrics.length);
  const benefitMetricCoverage = ratio(benefits.filter((item) => Array.isArray(item.metricIds) && item.metricIds.length > 0).length, benefits.length, metrics.length ? 100 : 0);

  const experienceScore = weighted([
    { score: journeys.length ? 100 : 0, weight: 20 },
    { score: stages.length ? 100 : 0, weight: 15 },
    { score: customerActionCoverage, weight: 20 },
    { score: touchpointStageCoverage, weight: 25 },
    { score: emotionCoverage, weight: 10 },
    { score: evidenceCoverage, weight: 10 },
  ]);
  const serviceScore = weighted([
    { score: boards.length ? 100 : 0, weight: 35 },
    { score: blueprintFieldCoverage, weight: 45 },
    { score: evidence.length ? 100 : 0, weight: 20 },
  ]);
  const operationScore = weighted([
    { score: processes.length ? 100 : 0, weight: 30 },
    { score: systems.length ? 100 : 0, weight: 25 },
    { score: responsible.length ? 100 : 0, weight: 25 },
    { score: resources.length ? 100 : 0, weight: 20 },
  ]);
  const improvementScore = weighted([
    { score: Object.keys(graph.problems).length ? 100 : 0, weight: 20 },
    { score: opportunities.length ? 100 : 0, weight: 20 },
    { score: opportunityOwnerCoverage, weight: 20 },
    { score: opportunityExecutionCoverage, weight: 25 },
    { score: taskOwnerCoverage, weight: 15 },
  ]);
  const resultsScore = weighted([
    { score: metrics.length ? 100 : 0, weight: 35 },
    { score: metricLinkCoverage, weight: 25 },
    { score: benefits.length ? 100 : 0, weight: 20 },
    { score: benefitMetricCoverage, weight: 20 },
  ]);

  const layers: ArchitectureLayer[] = [
    {
      id: 'experience', label: 'Experiência', score: experienceScore, actionId: 'journey', actionLabel: 'Abrir Jornadas',
      summary: `${journeys.length} ${journeys.length === 1 ? 'jornada' : 'jornadas'} · ${stages.length} ${stages.length === 1 ? 'etapa' : 'etapas'} · ${touchpoints.length} touchpoints`,
      counts: [{ id: 'journeys', label: 'Jornadas', value: journeys.length }, { id: 'stages', label: 'Etapas', value: stages.length }, { id: 'touchpoints', label: 'Touchpoints', value: touchpoints.length }],
    },
    {
      id: 'service', label: 'Serviço', score: serviceScore, actionId: 'blueprint', actionLabel: 'Abrir Blueprints',
      summary: `${boards.length} ${boards.length === 1 ? 'blueprint' : 'blueprints'} · ${evidence.length} ${evidence.length === 1 ? 'evidência' : 'evidências'}`,
      counts: [{ id: 'blueprints', label: 'Blueprints', value: boards.length }, { id: 'evidence', label: 'Evidências', value: evidence.length }],
    },
    {
      id: 'operation', label: 'Operação', score: operationScore, actionId: 'blueprint', actionLabel: 'Abrir operação',
      summary: `${processes.length} processos · ${systems.length} sistemas · ${responsible.length} responsáveis`,
      counts: [{ id: 'processes', label: 'Processos', value: processes.length }, { id: 'systems', label: 'Sistemas', value: systems.length }, { id: 'responsible', label: 'Responsáveis', value: responsible.length }],
    },
    {
      id: 'improvement', label: 'Melhoria', score: improvementScore, actionId: 'action', actionLabel: 'Abrir melhorias',
      summary: `${opportunities.length} oportunidades · ${tasks.length} ${tasks.length === 1 ? 'iniciativa' : 'iniciativas'}`,
      counts: [{ id: 'opportunities', label: 'Oportunidades', value: opportunities.length }, { id: 'initiatives', label: 'Iniciativas', value: tasks.length }],
    },
    {
      id: 'results', label: 'Resultados', score: resultsScore, actionId: 'intelligence', actionLabel: 'Abrir métricas',
      summary: `${metrics.length} métricas · ${benefits.length} ${benefits.length === 1 ? 'benefício' : 'benefícios'}`,
      counts: [{ id: 'metrics', label: 'Métricas', value: metrics.length }, { id: 'benefits', label: 'Benefícios', value: benefits.length }],
    },
  ];

  const score = weighted([
    { score: experienceScore, weight: 25 },
    { score: serviceScore, weight: 20 },
    { score: operationScore, weight: 20 },
    { score: improvementScore, weight: 20 },
    { score: resultsScore, weight: 15 },
  ]);

  const gaps: ArchitectureGap[] = [];
  const addGap = (gap: ArchitectureGap) => gaps.push(gap);
  if (!journeys.length) addGap({ id: 'journeys.missing', severity: 'high', priority: 96, label: 'Nenhuma Jornada estruturada', detail: 'A arquitetura ainda não possui um fluxo de experiência para organizar etapas e touchpoints.', actionId: 'journey', actionLabel: 'Criar Jornada' });
  else if (touchpointStageCoverage < 70) addGap({ id: 'touchpoints.coverage', severity: 'medium', priority: 76, label: 'Etapas sem touchpoint', detail: `${100 - touchpointStageCoverage}% das etapas ainda não possuem touchpoint associado.`, actionId: 'journey', actionLabel: 'Revisar Jornada' });
  if (!boards.length || blueprintFieldCoverage < 50) addGap({ id: 'blueprint.coverage', severity: 'high', priority: 88, label: 'Camada de serviço pouco estruturada', detail: boards.length ? `O Blueprint possui ${blueprintFieldCoverage}% dos campos estruturais preenchidos.` : 'Nenhuma visualização Blueprint estruturada foi encontrada.', actionId: 'blueprint', actionLabel: 'Abrir Blueprint' });
  if (!processes.length) addGap({ id: 'operation.process', severity: 'medium', priority: 72, label: 'Processos não conectados', detail: 'A arquitetura ainda não explicita os processos que sustentam a entrega do serviço.', actionId: 'blueprint', actionLabel: 'Estruturar operação' });
  if (!responsible.length && tasks.length === 0) addGap({ id: 'operation.owner', severity: 'medium', priority: 68, label: 'Responsabilidades pouco visíveis', detail: 'Não há responsáveis operacionais nem iniciativas para explicitar ownership.', actionId: 'action', actionLabel: 'Definir responsáveis' });
  if (opportunities.length && opportunityExecutionCoverage < 70) addGap({ id: 'improvement.execution', severity: 'medium', priority: 74, label: 'Oportunidades sem execução', detail: `${100 - opportunityExecutionCoverage}% das oportunidades ainda não possuem iniciativa associada.`, actionId: 'action', actionLabel: 'Planejar iniciativas' });
  if (!metrics.length) addGap({ id: 'results.metrics', severity: 'high', priority: 82, label: 'Resultados sem métricas', detail: 'A arquitetura não possui métricas para conectar mudanças a resultados observáveis.', actionId: 'intelligence', actionLabel: 'Criar métricas' });
  else if (metricLinkCoverage < 70) addGap({ id: 'results.metric-links', severity: 'low', priority: 54, label: 'Métricas pouco conectadas', detail: `${100 - metricLinkCoverage}% das métricas não apontam para serviço, Jornada ou etapa.`, actionId: 'intelligence', actionLabel: 'Conectar métricas' });
  gaps.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));

  const journeyReports = journeys.map((journey) => journeyReport(graph, journey)).sort((a, b) => {
    const activeA = a.status === 'archived' ? 0 : 1;
    const activeB = b.status === 'archived' ? 0 : 1;
    return activeB - activeA || b.stageCount - a.stageCount || b.coverage - a.coverage || a.name.localeCompare(b.name, 'pt-BR');
  });
  const primaryJourney = journeyReports[0] ?? null;
  const primaryJourneyModel = primaryJourney ? graph.journeys[primaryJourney.id] : null;
  const primaryFlow = primaryJourneyModel
    ? stagesFor(graph, primaryJourneyModel)
      .filter((stage) => hasText(stage.title))
      .slice(0, 7)
      .map((stage) => ({ id: stage.id, title: stage.title, touchpoints: stage.touchpointIds.length, opportunities: stage.opportunityIds.length }))
    : [];

  return {
    serviceId: graph.service.id,
    serviceName: graph.service.name,
    score,
    label: architectureLabel(score),
    formula: 'Cobertura estrutural = Experiência 25% + Serviço 20% + Operação 20% + Melhoria 20% + Resultados 15%.',
    counts: {
      journeys: journeys.length,
      stages: stages.length,
      touchpoints: touchpoints.length,
      blueprints: boards.length,
      processes: processes.length,
      systems: systems.length,
      opportunities: opportunities.length,
      initiatives: tasks.length,
      metrics: metrics.length,
      benefits: benefits.length,
    },
    layers,
    journeys: journeyReports,
    primaryJourney,
    primaryFlow,
    gaps,
  };
}

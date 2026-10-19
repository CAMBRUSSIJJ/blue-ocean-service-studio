import type { GraphEntity, Journey, ServiceGraph, Task } from '../domain/model';

export type HealthDimensionId = 'structure' | 'evidence' | 'governance' | 'experience' | 'operation' | 'execution' | 'metrics';
export type HealthStatusKey = 'healthy' | 'attention' | 'critical';

export type HealthSignal = {
  id: string;
  kind: 'strength' | 'gap';
  label: string;
  detail: string;
};

export type HealthDimension = {
  id: HealthDimensionId;
  label: string;
  score: number;
  weight: number;
  summary: string;
  signals: HealthSignal[];
};

export type JourneyHealth = {
  id: string;
  name: string;
  score: number;
  status: HealthStatusKey;
  stageCount: number;
  gaps: string[];
};

export type BlueprintHealth = {
  score: number;
  status: HealthStatusKey;
  boardCount: number;
  gaps: string[];
};

export type ServiceHealthReport = {
  score: number;
  status: { key: HealthStatusKey; label: string };
  formula: string;
  dimensions: HealthDimension[];
  strengths: HealthSignal[];
  gaps: HealthSignal[];
  journeys: JourneyHealth[];
  blueprint: BlueprintHealth;
};

type Check = {
  id: string;
  weight: number;
  score: number;
  positive: string;
  negative: string;
  detail: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const ratio = (done: number, total: number, emptyScore = 0) => total > 0 ? clamp((done / total) * 100) : emptyScore;
const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const entityValues = (graph: ServiceGraph, kind: string) => Object.values(graph.entities?.[kind] ?? {}) as GraphEntity[];
const statusFor = (score: number): { key: HealthStatusKey; label: string } => score >= 80
  ? { key: 'healthy', label: 'Saudável' }
  : score >= 60
    ? { key: 'attention', label: 'Atenção' }
    : { key: 'critical', label: 'Crítico' };

function dimension(id: HealthDimensionId, label: string, weight: number, checks: Check[], summary: string): HealthDimension {
  const totalWeight = checks.reduce((sum, item) => sum + item.weight, 0) || 1;
  const score = clamp(checks.reduce((sum, item) => sum + (clamp(item.score) * item.weight), 0) / totalWeight);
  const signals = checks.map<HealthSignal>((item) => ({
    id: `${id}:${item.id}`,
    kind: item.score >= 75 ? 'strength' : 'gap',
    label: item.score >= 75 ? item.positive : item.negative,
    detail: item.detail,
  }));
  return { id, label, weight, score, summary, signals };
}

function linkedEvidenceForStage(graph: ServiceGraph, stageId: string) {
  return entityValues(graph, 'evidence').filter((item) => item.stageId === stageId);
}

function buildJourneyHealth(graph: ServiceGraph, journey: Journey): JourneyHealth {
  const stages = journey.stageIds.map((id) => graph.stages[id]).filter(Boolean);
  const customerAction = ratio(stages.filter((item) => hasText(item.customerAction)).length, stages.length);
  const touchpoints = ratio(stages.filter((item) => item.touchpointIds.length > 0).length, stages.length);
  const emotion = ratio(stages.filter((item) => Boolean(item.emotion)).length, stages.length);
  const evidence = ratio(stages.filter((item) => linkedEvidenceForStage(graph, item.id).length > 0).length, stages.length);
  const owner = hasText(journey.owner) ? 100 : 0;
  const review = hasText(journey.nextReviewAt) ? 100 : 0;
  const score = clamp(customerAction * .30 + touchpoints * .20 + emotion * .15 + evidence * .15 + owner * .10 + review * .10);
  const gaps: string[] = [];
  if (customerAction < 100) gaps.push('Ações do cliente incompletas');
  if (touchpoints < 100) gaps.push('Etapas sem touchpoint');
  if (evidence < 70) gaps.push('Cobertura de evidências baixa');
  if (!owner) gaps.push('Jornada sem owner');
  if (!review) gaps.push('Revisão não agendada');
  return { id: journey.id, name: journey.name, score, status: statusFor(score).key, stageCount: stages.length, gaps };
}

function buildBlueprintHealth(graph: ServiceGraph): BlueprintHealth {
  const blueprintBoards = Object.values(graph.views?.whiteboards ?? {}).filter((board) => board.viewKind === 'blueprint' || board.layoutMode === 'blueprint');
  const draft = graph.blueprintDraft;
  const fields = [draft.evidencias, draft.frontstage, draft.backstage, draft.suporte];
  const fieldCoverage = ratio(fields.filter(hasText).length, fields.length);
  const operationKinds = ['process', 'system', 'resource', 'responsible', 'role', 'dependency', 'policy'];
  const operationCoverage = ratio(operationKinds.filter((kind) => entityValues(graph, kind).length > 0).length, operationKinds.length);
  const boardScore = blueprintBoards.length > 0 ? 100 : 0;
  const score = clamp(boardScore * .25 + fieldCoverage * .50 + operationCoverage * .25);
  const gaps: string[] = [];
  if (!blueprintBoards.length) gaps.push('Nenhuma visualização Blueprint estruturada');
  if (!hasText(draft.frontstage)) gaps.push('Frontstage não estruturado');
  if (!hasText(draft.backstage)) gaps.push('Backstage não estruturado');
  if (!hasText(draft.suporte)) gaps.push('Processos/suporte não estruturados');
  if (operationCoverage < 50) gaps.push('Camada operacional pouco conectada');
  return { score, status: statusFor(score).key, boardCount: blueprintBoards.length, gaps };
}

export function buildServiceHealthReport(graph: ServiceGraph): ServiceHealthReport {
  const journeys = Object.values(graph.journeys);
  const stages = Object.values(graph.stages);
  const opportunities = Object.values(graph.opportunities);
  const tasks = Object.values(graph.tasks);
  const evidence = entityValues(graph, 'evidence');
  const metrics = entityValues(graph, 'metric');
  const personas = entityValues(graph, 'persona');
  const needs = entityValues(graph, 'need');
  const benefits = entityValues(graph, 'benefit');
  const researchSources = Object.values(graph.research?.sources ?? {});
  const blueprint = buildBlueprintHealth(graph);

  const customerActionCoverage = ratio(stages.filter((item) => hasText(item.customerAction)).length, stages.length);
  const touchpointCoverage = ratio(stages.filter((item) => item.touchpointIds.length > 0).length, stages.length);
  const evidenceStageCoverage = ratio(stages.filter((item) => evidence.some((row) => row.stageId === item.id)).length, stages.length);
  const evidenceLinkCoverage = ratio(evidence.filter((item) => hasText(item.stageId) || hasText(item.journeyId) || hasText(item.serviceId)).length, evidence.length);
  const journeyOwnerCoverage = ratio(journeys.filter((item) => hasText(item.owner)).length, journeys.length);
  const opportunityOwnerCoverage = ratio(opportunities.filter((item) => hasText(item.owner)).length, opportunities.length, 100);
  const taskOwnerCoverage = ratio(tasks.filter((item) => hasText(item.owner)).length, tasks.length, 100);
  const reviewCoverage = ratio(journeys.filter((item) => hasText(item.nextReviewAt)).length + (hasText(graph.service.operatingReview?.nextReviewAt) ? 1 : 0), journeys.length + 1);
  const personaContext = personas.length > 0 ? 100 : 0;
  const needContext = needs.length > 0 ? 100 : 0;
  const emotionCoverage = ratio(stages.filter((item) => Boolean(item.emotion)).length, stages.length);
  const doneTasks = tasks.filter((item) => item.status === 'done').length;
  const taskProgress = ratio(doneTasks, tasks.length);
  const overdueTasks = tasks.filter((item: Task) => item.status !== 'done' && item.dueDate && new Date(`${item.dueDate}T23:59:59`).getTime() < Date.now()).length;
  const scheduleHealth = tasks.length ? clamp(100 - (overdueTasks / tasks.length) * 100) : 0;
  const opportunityMetricCoverage = ratio(opportunities.filter((item) => (item.metricIds?.length ?? 0) > 0).length, opportunities.length, metrics.length ? 100 : 0);
  const taskMetricCoverage = ratio(tasks.filter((item) => (item.metricIds?.length ?? 0) > 0).length, tasks.length, metrics.length ? 100 : 0);
  const benefitMetricCoverage = ratio(benefits.filter((item) => Array.isArray(item.metricIds) && item.metricIds.length > 0).length, benefits.length, metrics.length ? 100 : 0);
  const metricValues = ratio(metrics.filter((item) => item.current != null || item.value != null || item.target != null).length, metrics.length);
  const blueprintBoards = Object.values(graph.views?.whiteboards ?? {}).filter((board) => board.viewKind === 'blueprint' || board.layoutMode === 'blueprint').length;
  const operationEntities = ['process', 'system', 'resource', 'responsible', 'role', 'dependency', 'policy'].filter((kind) => entityValues(graph, kind).length > 0).length;

  const dimensions: HealthDimension[] = [
    dimension('structure', 'Estrutura', 20, [
      { id: 'service', weight: 15, score: hasText(graph.service.name) && hasText(graph.service.description) ? 100 : hasText(graph.service.name) ? 60 : 0, positive: 'Serviço contextualizado', negative: 'Contexto do serviço incompleto', detail: 'Nome e descrição dão contexto para as decisões do workspace.' },
      { id: 'journeys', weight: 15, score: journeys.length ? 100 : 0, positive: 'Jornadas conectadas', negative: 'Nenhuma Jornada estruturada', detail: `${journeys.length} ${journeys.length === 1 ? 'Jornada conectada' : 'Jornadas conectadas'} ao serviço.` },
      { id: 'stages', weight: 15, score: stages.length ? 100 : 0, positive: 'Etapas estruturadas', negative: 'Etapas ainda não estruturadas', detail: `${stages.length} ${stages.length === 1 ? 'etapa estruturada' : 'etapas estruturadas'} no Service Graph.` },
      { id: 'actions', weight: 25, score: customerActionCoverage, positive: 'Ações do cliente bem cobertas', negative: 'Há ações do cliente incompletas', detail: `${customerActionCoverage}% das etapas possuem ação do cliente.` },
      { id: 'touchpoints', weight: 20, score: touchpointCoverage, positive: 'Touchpoints bem distribuídos', negative: 'Há etapas sem touchpoints', detail: `${touchpointCoverage}% das etapas possuem pelo menos um touchpoint.` },
      { id: 'views', weight: 10, score: Object.keys(graph.views?.whiteboards ?? {}).length ? 100 : 0, positive: 'Visualizações estruturais disponíveis', negative: 'Faltam visualizações estruturais', detail: `${Object.keys(graph.views?.whiteboards ?? {}).length} visualizações salvas no workspace.` },
    ], 'Quanto da estrutura-base do serviço está realmente modelada.'),

    dimension('evidence', 'Evidências', 15, [
      { id: 'research', weight: 20, score: researchSources.length ? 100 : 0, positive: 'Pesquisa registrada', negative: 'Nenhuma fonte de pesquisa registrada', detail: `${researchSources.length} fontes disponíveis no repositório de pesquisa.` },
      { id: 'evidence', weight: 20, score: evidence.length ? 100 : 0, positive: 'Evidências registradas', negative: 'Nenhuma evidência registrada', detail: `${evidence.length} evidências disponíveis no Service Graph.` },
      { id: 'stage-coverage', weight: 45, score: evidenceStageCoverage, positive: 'Boa cobertura por etapa', negative: 'Há etapas sem evidência', detail: `${evidenceStageCoverage}% das etapas possuem evidência conectada.` },
      { id: 'link-quality', weight: 15, score: evidenceLinkCoverage, positive: 'Evidências possuem contexto', negative: 'Evidências soltas no grafo', detail: `${evidenceLinkCoverage}% das evidências estão ligadas a serviço, Jornada ou etapa.` },
    ], 'Quanto das decisões do serviço está sustentado por pesquisa e evidência conectada.'),

    dimension('governance', 'Governança', 15, [
      { id: 'journey-owner', weight: 25, score: journeyOwnerCoverage, positive: 'Jornadas possuem owner', negative: 'Há Jornadas sem owner', detail: `${journeyOwnerCoverage}% das Jornadas possuem responsável.` },
      { id: 'opportunity-owner', weight: 20, score: opportunityOwnerCoverage, positive: 'Oportunidades possuem owner', negative: 'Há oportunidades sem owner', detail: `${opportunityOwnerCoverage}% das oportunidades possuem responsável.` },
      { id: 'task-owner', weight: 20, score: taskOwnerCoverage, positive: 'Ações possuem owner', negative: 'Há ações sem owner', detail: `${taskOwnerCoverage}% das ações possuem responsável.` },
      { id: 'review', weight: 25, score: reviewCoverage, positive: 'Ciclo de revisão definido', negative: 'Revisões não estão programadas', detail: `${reviewCoverage}% das entidades governáveis possuem revisão programada.` },
      { id: 'review-owner', weight: 10, score: hasText(graph.service.operatingReview?.owner) ? 100 : 0, positive: 'Revisão operacional tem owner', negative: 'Revisão operacional sem owner', detail: hasText(graph.service.operatingReview?.owner) ? `Responsável: ${graph.service.operatingReview?.owner}.` : 'Defina quem conduz a revisão operacional do serviço.' },
    ], 'Clareza de ownership, responsabilidade e cadência de revisão.'),

    dimension('experience', 'Experiência', 15, [
      { id: 'customer-actions', weight: 25, score: customerActionCoverage, positive: 'Ações do cliente mapeadas', negative: 'Ações do cliente incompletas', detail: `${customerActionCoverage}% das etapas descrevem o que o cliente faz.` },
      { id: 'touchpoints', weight: 25, score: touchpointCoverage, positive: 'Pontos de contato mapeados', negative: 'Pontos de contato insuficientes', detail: `${touchpointCoverage}% das etapas possuem touchpoints.` },
      { id: 'emotion', weight: 15, score: emotionCoverage, positive: 'Emoção registrada', negative: 'Emoção pouco estruturada', detail: `${emotionCoverage}% das etapas registram estado emocional.` },
      { id: 'persona', weight: 15, score: personaContext, positive: 'Personas conectadas', negative: 'Personas ainda não conectadas', detail: `${personas.length} personas registradas para contextualizar a experiência.` },
      { id: 'needs', weight: 20, score: needContext, positive: 'Necessidades registradas', negative: 'Necessidades ainda não estruturadas', detail: `${needs.length} necessidades registradas no Service Graph.` },
    ], 'Qualidade do contexto de cliente presente nas Jornadas.'),

    dimension('operation', 'Operação', 15, [
      { id: 'blueprint', weight: 25, score: blueprintBoards ? 100 : 0, positive: 'Blueprint operacional disponível', negative: 'Falta Blueprint operacional', detail: `${blueprintBoards} ${blueprintBoards === 1 ? 'Blueprint estruturado' : 'Blueprints estruturados'} no workspace.` },
      { id: 'blueprint-health', weight: 50, score: blueprint.score, positive: 'Blueprint consistente', negative: 'Blueprint possui gaps operacionais', detail: `Saúde estrutural do Blueprint em ${blueprint.score}%.` },
      { id: 'operational-entities', weight: 25, score: ratio(operationEntities, 4), positive: 'Camada operacional conectada', negative: 'Camada operacional pouco conectada', detail: `${operationEntities}/4 tipos operacionais presentes: processo, sistema, recurso e responsável.` },
    ], 'Quanto o serviço está traduzido para frontstage, backstage e operação.'),

    dimension('execution', 'Execução', 10, [
      { id: 'plan', weight: 20, score: tasks.length ? 100 : 0, positive: 'Plano de ação existe', negative: 'Plano de ação ainda vazio', detail: `${tasks.length} ações registradas no plano.` },
      { id: 'progress', weight: 35, score: taskProgress, positive: 'Execução está avançando', negative: 'Execução abaixo do esperado', detail: `${doneTasks}/${tasks.length} ações concluídas.` },
      { id: 'ownership', weight: 25, score: taskOwnerCoverage, positive: 'Ações possuem responsáveis', negative: 'Há ações sem responsável', detail: `${taskOwnerCoverage}% das ações possuem owner.` },
      { id: 'schedule', weight: 20, score: scheduleHealth, positive: 'Prazos sob controle', negative: 'Existem ações atrasadas', detail: `${overdueTasks} ${overdueTasks === 1 ? 'ação atrasada' : 'ações atrasadas'} no momento.` },
    ], 'Capacidade do serviço de transformar oportunidades em execução acompanhada.'),

    dimension('metrics', 'Métricas', 10, [
      { id: 'catalog', weight: 25, score: metrics.length ? 100 : 0, positive: 'Métricas registradas', negative: 'Nenhuma métrica registrada', detail: `${metrics.length} métricas disponíveis no Service Graph.` },
      { id: 'opportunity-links', weight: 25, score: opportunityMetricCoverage, positive: 'Oportunidades ligadas a métricas', negative: 'Oportunidades sem métrica', detail: `${opportunityMetricCoverage}% das oportunidades possuem métrica associada.` },
      { id: 'task-links', weight: 20, score: taskMetricCoverage, positive: 'Ações ligadas a métricas', negative: 'Ações sem métrica', detail: `${taskMetricCoverage}% das ações possuem métrica associada.` },
      { id: 'benefit-links', weight: 15, score: benefitMetricCoverage, positive: 'Benefícios mensuráveis', negative: 'Benefícios sem métrica', detail: `${benefitMetricCoverage}% dos benefícios possuem métrica associada.` },
      { id: 'values', weight: 15, score: metricValues, positive: 'Métricas possuem valores', negative: 'Métricas sem baseline/valor/meta', detail: `${metricValues}% das métricas possuem valor atual, baseline ou meta.` },
    ], 'Capacidade de medir mudança, resultado e realização de benefícios.'),
  ];

  const score = clamp(dimensions.reduce((sum, item) => sum + item.score * item.weight, 0) / dimensions.reduce((sum, item) => sum + item.weight, 0));
  const strengths = dimensions
    .filter((item) => item.score >= 75)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map<HealthSignal>((item) => ({ id: `strength:${item.id}`, kind: 'strength', label: `${item.label} ${item.score}%`, detail: item.summary }));
  const gaps = dimensions
    .filter((item) => item.score < 75)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map<HealthSignal>((item) => ({ id: `gap:${item.id}`, kind: 'gap', label: `${item.label} ${item.score}%`, detail: item.signals.find((signal) => signal.kind === 'gap')?.detail ?? item.summary }));

  return {
    score,
    status: statusFor(score),
    formula: 'Estrutura 20% · Evidências 15% · Governança 15% · Experiência 15% · Operação 15% · Execução 10% · Métricas 10%',
    dimensions,
    strengths,
    gaps,
    journeys: journeys.map((item) => buildJourneyHealth(graph, item)).sort((a, b) => a.score - b.score),
    blueprint,
  };
}

import type { Id, ImprovementInitiativeStatus, ServiceGraph } from '../domain/model';
import { normalizeImprovementBacklogState, createImprovementOpportunity } from './improvement-backlog.ts';
import { createImprovementInitiative, updateImprovementInitiative } from './improvement-portfolio.ts';
import { createServiceMetric, bindServiceMetric, recordServiceMetricMeasurement, serviceMetricStatus } from './service-outcomes.ts';

export const ACQUISITION_ROWS = ['go', 'ch', 'pr', 'br', 'rr', 'ki'] as const;
const text = (value: unknown, limit = 1000) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const numeric = (value: unknown): number | undefined => {
  if (value === '' || value === undefined || value === null) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n)) throw Error('Informe um número válido para o indicador.');
  return n;
};
function sourceProblem(graph: ServiceGraph, journeyId: Id, problemId: Id) {
  const journey = graph.journeys[journeyId], problem = graph.problems[problemId];
  if (!journey || !problem || !journey.stageIds.includes(problem.stageId)) throw Error('Esta dor não pertence à Jornada aberta.');
  if (!problem.description?.trim()) throw Error('Descreva a dor antes de planejar uma melhoria.');
  return { journey, problem, stage: graph.stages[problem.stageId] };
}

export type JourneyImprovementInput = {
  title?: unknown; owner?: unknown; targetDate?: unknown; expectedOutcome?: unknown; status?: unknown;
  metricId?: unknown; metricName?: unknown; unit?: unknown; direction?: unknown; baseline?: unknown; target?: unknown;
};

/** One canonical backlog problem → opportunity → initiative; opening/editing never duplicates it. */
export function saveJourneyImprovement(graph: ServiceGraph, journeyId: Id, problemId: Id, input: JourneyImprovementInput, now = new Date().toISOString()) {
  const { problem, stage, journey } = sourceProblem(graph, journeyId, problemId);
  const title = text(input.title, 240);
  if (!title) throw Error('Descreva a ação proposta.');
  const date = text(input.targetDate, 10);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw Error('Informe um prazo válido.');
  const statuses: ImprovementInitiativeStatus[] = ['backlog', 'planned', 'in_progress', 'validating', 'implemented'];
  const status = statuses.includes(input.status as ImprovementInitiativeStatus) ? input.status as ImprovementInitiativeStatus : 'planned';
  const metricId = text(input.metricId, 160), metricName = text(input.metricName, 240);
  if (metricId && (!graph.entities?.metric?.[metricId] || graph.entities.metric[metricId].serviceId && graph.entities.metric[metricId].serviceId !== graph.service.id)) throw Error('O indicador selecionado não está disponível neste serviço.');
  const baseline = numeric(input.baseline), target = numeric(input.target);
  if (!metricId && !metricName && (baseline !== undefined || target !== undefined || text(input.unit))) throw Error('Dê um nome ao indicador ou selecione um existente.');
  const backlog = normalizeImprovementBacklogState(graph, now);
  let linkedProblem = Object.values(backlog.problems).find(p => p.sourceKey === `journey-problem:${problemId}`);
  if (!linkedProblem) {
    const id = `improvement-problem-${crypto.randomUUID()}`;
    linkedProblem = { id, serviceId: graph.service.id, sourceKey: `journey-problem:${problemId}`,
      sourceRefs: [{ kind: 'journey', sourceId: problemId, label: `${journey.name} · ${stage.title}`, detail: problem.description }],
      sourceActive: true, title: problem.description, description: problem.description, impact: 3, frequency: 3, effort: 3, risk: 3, urgency: 3,
      status: 'new', evidenceIds: [...(stage.evidenceIds ?? [])], createdAt: now, updatedAt: now, lastSeenAt: now };
    backlog.problems[id] = linkedProblem;
  }
  let next: ServiceGraph = { ...graph, service: { ...graph.service, improvementBacklog: backlog } };
  let initiativeId = Object.values(graph.service.improvementPortfolio?.initiatives ?? {}).find(i => i.problemIds.includes(linkedProblem.id))?.id;
  if (!initiativeId) {
    const opportunity = createImprovementOpportunity(next, { title, problemIds: [linkedProblem.id], owner: text(input.owner, 240), status: 'selected' }, now);
    if (!opportunity.opportunityId) throw Error('Não foi possível vincular a oportunidade.');
    const initiative = createImprovementInitiative(opportunity.graph, { opportunityId: opportunity.opportunityId, title, owner: text(input.owner, 240), targetDate: date }, now);
    if (!initiative.initiativeId) throw Error('Não foi possível criar o plano.');
    next = initiative.graph; initiativeId = initiative.initiativeId;
  }
  next = updateImprovementInitiative(next, initiativeId, { title, owner: text(input.owner, 240), targetDate: date,
    expectedOutcome: text(input.expectedOutcome), status }, now);
  let selectedMetric = metricId;
  if (!selectedMetric && metricName) {
    const created = createServiceMetric(next, { title: metricName, unit: text(input.unit, 80), baseline, target,
      direction: input.direction === 'at_least' ? 'at_least' : 'at_most', owner: text(input.owner, 240) }, now);
    next = created.graph; selectedMetric = created.metricId ?? '';
  }
  if (selectedMetric) {
    next = bindServiceMetric(next, selectedMetric, 'initiative', initiativeId, 'result', now).graph;
    next = bindServiceMetric(next, selectedMetric, 'journey', journeyId, 'outcome', now).graph;
  }
  return { graph: next, initiativeId };
}

/** Results are derived from the same portfolio and metrics used by the rest of the product. */
export function journeyImprovementPlans(graph: ServiceGraph, journeyId: Id) {
  const journey = graph.journeys[journeyId];
  if (!journey) return [];
  const backlog = graph.service.improvementBacklog?.problems ?? {};
  return Object.values(graph.service.improvementPortfolio?.initiatives ?? {}).flatMap(initiative => {
    const refs = initiative.problemIds.flatMap(id => backlog[id]?.sourceRefs ?? []).filter(ref => ref.kind === 'journey');
    const problemId = refs.map(ref => ref.sourceId).find(id => graph.problems[id] && journey.stageIds.includes(graph.problems[id].stageId));
    if (!problemId) return [];
    const problem = graph.problems[problemId];
    const metrics = initiative.metricIds.flatMap(id => {
      const metric = graph.entities?.metric?.[id];
      if (!metric) return [];
      const readings = Object.values(graph.service.outcomes?.measurements ?? {}).filter(m => m.metricId === id).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.createdAt.localeCompare(b.createdAt));
      const latest = readings.at(-1);
      const current = latest?.value ?? (typeof metric.value === 'number' ? metric.value : undefined);
      return [{ id, name: String(metric.title || metric.name || 'Indicador'), unit: text(metric.unit), baseline: typeof metric.baseline === 'number' ? metric.baseline : undefined,
        target: typeof metric.target === 'number' ? metric.target : undefined, current, direction: metric.direction === 'at_most' ? 'at_most' : 'at_least',
        status: current === undefined || typeof metric.target !== 'number' ? 'unmeasured' : serviceMetricStatus(metric, current), readings }];
    });
    return [{ id: initiative.id, problemId, problem: problem.description, stageId: problem.stageId, stage: graph.stages[problem.stageId]?.title || 'Etapa',
      title: initiative.title, owner: initiative.owner || '', targetDate: initiative.targetDate || '', expectedOutcome: initiative.expectedOutcome || '', status: initiative.status, metrics }];
  });
}

export function measureJourneyImprovement(graph: ServiceGraph, journeyId: Id, initiativeId: Id, metricId: Id, value: unknown, note = '', now = new Date().toISOString()) {
  const plan = journeyImprovementPlans(graph, journeyId).find(p => p.id === initiativeId);
  if (!plan?.metrics.some(m => m.id === metricId)) throw Error('Este indicador não está vinculado ao plano desta Jornada.');
  const measurement = numeric(value);
  if (measurement === undefined) throw Error('Informe o valor medido.');
  const result = recordServiceMetricMeasurement(graph, metricId, measurement, now, text(note), now);
  if (!result.created) throw Error('Não foi possível registrar a medição.');
  return result.graph;
}

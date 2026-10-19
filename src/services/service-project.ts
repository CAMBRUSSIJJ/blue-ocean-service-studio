import type { Id, ServiceGraph, ServiceProjectDefinition, ServiceProjectPhase, ServiceProjectState } from '../domain/model';

const PHASES: ServiceProjectPhase[] = ['discovery', 'definition', 'design', 'validation', 'improvement'];

export type ServiceProjectPhaseReport = {
  key: ServiceProjectPhase;
  label: string;
  score: number;
  state: 'not_started' | 'in_progress' | 'ready' | 'complete';
  completed: number;
  total: number;
  detail: string;
};

export type ServiceProjectReport = {
  project: ServiceProjectState;
  currentPhase: ServiceProjectPhase;
  overallScore: number;
  phases: Record<ServiceProjectPhase, ServiceProjectPhaseReport>;
  discoveryReady: boolean;
  designReady: boolean;
};

const nowIso = () => new Date().toISOString();
const count = (value: Record<string, unknown> | undefined) => Object.keys(value ?? {}).length;
const filled = (value?: string) => Boolean(value?.trim());

export function createServiceProjectState(serviceId: Id, createdAt = nowIso(), phase: ServiceProjectPhase = 'discovery'): ServiceProjectState {
  return {
    version: 1,
    id: `project-${serviceId}`,
    serviceId,
    status: 'active',
    currentPhase: phase,
    definition: {
      promise: '',
      outcome: '',
      scope: '',
      startBoundary: '',
      endBoundary: '',
      principles: [],
      successCriteria: [],
      outOfScope: [],
      assumptions: [],
      personaIds: [],
      problemIds: [],
      evidenceIds: [],
    },
    createdAt,
    updatedAt: createdAt,
  };
}

export function normalizeServiceProjectState(graph: ServiceGraph): ServiceGraph {
  if (!graph.service?.id || graph.service.id === 'workspace-uninitialized' || !graph.service.name.trim()) return graph;
  const current = graph.service.project;
  const createdAt = current?.createdAt || graph.service.createdAt || nowIso();
  const base = createServiceProjectState(graph.service.id, createdAt, current?.currentPhase ?? 'discovery');
  const project: ServiceProjectState = {
    ...base,
    ...current,
    version: 1,
    id: current?.id || base.id,
    serviceId: graph.service.id,
    status: current?.status ?? 'active',
    currentPhase: PHASES.includes(current?.currentPhase as ServiceProjectPhase) ? current!.currentPhase : 'discovery',
    definition: {
      ...base.definition,
      ...(current?.definition ?? {}),
      principles: Array.isArray(current?.definition?.principles) ? current!.definition.principles.filter(Boolean) : [],
      successCriteria: Array.isArray(current?.definition?.successCriteria) ? current!.definition.successCriteria.filter(Boolean) : [],
      outOfScope: Array.isArray(current?.definition?.outOfScope) ? current!.definition.outOfScope.filter(Boolean) : [],
      assumptions: Array.isArray(current?.definition?.assumptions) ? current!.definition.assumptions.filter(Boolean) : [],
      personaIds: Array.isArray(current?.definition?.personaIds) ? current!.definition.personaIds.filter(Boolean) : [],
      problemIds: Array.isArray(current?.definition?.problemIds) ? current!.definition.problemIds.filter(Boolean) : [],
      evidenceIds: Array.isArray(current?.definition?.evidenceIds) ? current!.definition.evidenceIds.filter(Boolean) : [],
    },
    createdAt,
    updatedAt: current?.updatedAt || graph.service.updatedAt || createdAt,
  };
  return { ...graph, service: { ...graph.service, project } };
}

export function touchServiceProject(graph: ServiceGraph, patch: Partial<ServiceProjectState> = {}): ServiceGraph {
  const normalized = normalizeServiceProjectState(graph);
  if (!normalized.service.project) return normalized;
  const current = normalized.service.project;
  const definition = patch.definition ? { ...current.definition, ...patch.definition } : current.definition;
  const project: ServiceProjectState = {
    ...current,
    ...patch,
    serviceId: normalized.service.id,
    definition,
    updatedAt: nowIso(),
  };
  return { ...normalized, service: { ...normalized.service, project, updatedAt: project.updatedAt } };
}

function phase(key: ServiceProjectPhase, label: string, checks: boolean[], detail: string): ServiceProjectPhaseReport {
  const completed = checks.filter(Boolean).length;
  const total = checks.length;
  const score = total ? Math.round((completed / total) * 100) : 0;
  const state = score === 0 ? 'not_started' : score === 100 ? 'complete' : score >= 50 ? 'ready' : 'in_progress';
  return { key, label, score, state, completed, total, detail };
}

export function buildServiceProjectReport(input: ServiceGraph): ServiceProjectReport {
  const graph = normalizeServiceProjectState(input);
  const project = graph.service.project ?? createServiceProjectState(graph.service.id, graph.service.createdAt);
  const personas = count(graph.entities?.persona);
  const needs = count(graph.entities?.need);
  const jobs = count(graph.entities?.job);
  const pains = count(graph.entities?.pain);
  const hypothesisProblems = count(graph.entities?.problemHypothesis);
  const validatedProblems = count(graph.entities?.problem);
  const stagedProblems = count(graph.problems);
  const evidences = count(graph.entities?.evidence) + count(graph.research?.sources);
  const journeys = count(graph.journeys);
  const stages = count(graph.stages);
  const freeBoards = Object.values(graph.views?.whiteboards ?? {}).filter((board) => board.viewKind === 'free').length;
  const blueprintBoards = Object.values(graph.views?.whiteboards ?? {}).filter((board) => board.viewKind === 'blueprint' || board.layoutMode === 'blueprint').length;
  const metrics = count(graph.entities?.metric);
  const experiments = count(graph.entities?.experiment);
  const opportunities = count(graph.opportunities) + count(graph.entities?.opportunity);
  const initiatives = count(graph.tasks);
  const definition = project.definition;

  const discovery = phase('discovery', 'Entender', [personas > 0, needs > 0, jobs > 0, pains > 0, hypothesisProblems + stagedProblems > 0, evidences > 0], `${personas} persona(s), ${needs} necessidade(s), ${jobs} job(s), ${pains} dor(es), ${hypothesisProblems} hipótese(s), ${validatedProblems + stagedProblems} problema(s) validado(s)/estruturado(s), ${evidences} evidência(s).`);
  const definitionPhase = phase('definition', 'Definir', [filled(definition.promise), filled(definition.outcome), filled(definition.scope), filled(definition.startBoundary) && filled(definition.endBoundary), definition.principles.length > 0, definition.personaIds.length > 0, definition.problemIds.length > 0, definition.evidenceIds.length > 0, definition.successCriteria.length > 0], 'Promessa, outcome, escopo, limites, princípios, sucesso e rastreabilidade do Discovery.');
  const design = phase('design', 'Desenhar', [freeBoards > 0, journeys > 0, stages > 0, blueprintBoards > 0], `${freeBoards} whiteboard(s), ${journeys} jornada(s), ${stages} etapa(s), ${blueprintBoards} blueprint(s).`);
  const validation = phase('validation', 'Validar', [evidences > 0, metrics > 0, experiments > 0], `${evidences} evidência(s), ${metrics} métrica(s), ${experiments} experimento(s).`);
  const improvement = phase('improvement', 'Melhorar', [validatedProblems + stagedProblems > 0, opportunities > 0, initiatives > 0], `${validatedProblems + stagedProblems} problema(s) validado(s)/estruturado(s), ${opportunities} oportunidade(s), ${initiatives} iniciativa(s).`);
  const phases = { discovery, definition: definitionPhase, design, validation, improvement };
  const overallScore = Math.round(PHASES.reduce((sum, key) => sum + phases[key].score, 0) / PHASES.length);
  return {
    project,
    currentPhase: project.currentPhase,
    overallScore,
    phases,
    discoveryReady: personas > 0 && hypothesisProblems + stagedProblems > 0 && (needs > 0 || jobs > 0) && (pains > 0 || hypothesisProblems + stagedProblems > 0) && evidences > 0,
    designReady: journeys > 0 && stages > 0,
  };
}

export function setServiceProjectPhase(graph: ServiceGraph, currentPhase: ServiceProjectPhase): ServiceGraph {
  return touchServiceProject(graph, { currentPhase });
}

export function updateServiceProjectDefinition(graph: ServiceGraph, definition: Partial<ServiceProjectDefinition>): ServiceGraph {
  return touchServiceProject(graph, { definition: { ...(normalizeServiceProjectState(graph).service.project?.definition ?? createServiceProjectState(graph.service.id).definition), ...definition } });
}

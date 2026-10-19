import type {
  Id, PrototypeCriterionResult, PrototypeExperimentOutcome, PrototypeFidelity, PrototypeParticipant,
  PrototypeSourceSnapshot, PrototypeSuccessCriterion, ServiceGraph, ServicePrototypeExperiment,
  ServicePrototypeLabState,
} from '../domain/model';

const nowIso = () => new Date().toISOString();
const unique = <T,>(values: T[]) => [...new Set(values)];
const makeId = (prefix: string): Id => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};
const clean = (value: unknown) => String(value ?? '').trim();
const ids = (values: unknown): Id[] => Array.isArray(values) ? unique(values.filter((value): value is Id => typeof value === 'string' && Boolean(value))) : [];

export const PROTOTYPE_FIDELITY_META: Record<PrototypeFidelity, { label: string; description: string }> = {
  conversation: { label: 'Conversa / roteiro', description: 'Teste promessa, linguagem e entendimento antes de produzir interfaces.' },
  paper: { label: 'Papel / storyboard', description: 'Simule a sequência do serviço com materiais simples.' },
  clickable: { label: 'Protótipo clicável', description: 'Teste fluxos digitais e decisões sem construir o produto final.' },
  roleplay: { label: 'Role-play', description: 'Encene frontstage, cliente e handoffs para observar comportamento.' },
  concierge: { label: 'Concierge', description: 'Entregue manualmente uma experiência que depois poderá ser sistematizada.' },
  process: { label: 'Processo simulado', description: 'Teste backstage, regras, tempos e responsabilidades.' },
  live_pilot: { label: 'Piloto controlado', description: 'Execute com usuários reais em escopo reduzido e reversível.' },
};

export const PROTOTYPE_OUTCOME_LABELS: Record<PrototypeExperimentOutcome, string> = {
  pending: 'Sem conclusão', passed: 'Passou', failed: 'Falhou', inconclusive: 'Inconclusivo',
};

export function emptyPrototypeLab(now = nowIso()): ServicePrototypeLabState {
  return { version: 1, experiments: {}, participants: {}, updatedAt: now };
}

export function normalizePrototypeLab(graph: ServiceGraph, now = nowIso()): ServicePrototypeLabState {
  const current = graph.service.prototypeLab;
  if (!current) return emptyPrototypeLab(now);
  const participants = Object.fromEntries(Object.entries(current.participants ?? {}).map(([id, participant]) => [id, {
    ...participant, id, name: clean(participant.name), createdAt: participant.createdAt || now,
  }])) as Record<Id, PrototypeParticipant>;
  const experiments = Object.fromEntries(Object.entries(current.experiments ?? {}).map(([id, experiment]) => [id, {
    ...experiment,
    id,
    serviceId: graph.service.id,
    title: clean(experiment.title) || 'Experimento sem título',
    hypothesis: clean(experiment.hypothesis),
    fidelity: experiment.fidelity || 'conversation',
    status: experiment.status || 'draft',
    outcome: experiment.outcome || 'pending',
    stageIds: ids(experiment.stageIds),
    touchpointIds: ids(experiment.touchpointIds),
    participantIds: ids(experiment.participantIds).filter((participantId) => Boolean(participants[participantId])),
    criteria: (experiment.criteria ?? []).map((criterion) => ({ ...criterion, result: criterion.result || 'pending' })),
    observationNotes: (experiment.observationNotes ?? []).map(clean).filter(Boolean),
    sourceSnapshot: experiment.sourceSnapshot ?? capturePrototypeSource(graph, {
      journeyId: experiment.journeyId,
      stageIds: experiment.stageIds,
      touchpointIds: experiment.touchpointIds,
      scenarioId: experiment.scenarioId,
    }, experiment.createdAt || now),
    createdAt: experiment.createdAt || now,
    updatedAt: experiment.updatedAt || now,
  }])) as Record<Id, ServicePrototypeExperiment>;
  const activeExperimentId = current.activeExperimentId && experiments[current.activeExperimentId] ? current.activeExperimentId : undefined;
  return { version: 1, experiments, participants, activeExperimentId, updatedAt: current.updatedAt || now };
}

export function capturePrototypeSource(
  graph: ServiceGraph,
  refs: { journeyId?: Id; stageIds?: Id[]; touchpointIds?: Id[]; scenarioId?: Id } = {},
  now = nowIso(),
): PrototypeSourceSnapshot {
  const journey = refs.journeyId ? graph.journeys[refs.journeyId] : undefined;
  const selectedStageIds = ids(refs.stageIds).filter((id) => Boolean(graph.stages[id]));
  const stageIds = selectedStageIds.length ? selectedStageIds : (journey?.stageIds ?? []);
  const stageTouchpointIds = stageIds.flatMap((stageId) => graph.stages[stageId]?.touchpointIds ?? []);
  const requestedTouchpoints = ids(refs.touchpointIds);
  const touchpointIds = (requestedTouchpoints.length ? requestedTouchpoints : stageTouchpointIds).filter((id) => Boolean(graph.touchpoints[id]));
  const scenario = refs.scenarioId ? graph.service.scenarios?.[refs.scenarioId] : undefined;
  const proposition = graph.service.proposition?.current;
  return {
    capturedAt: now,
    journeyId: journey?.id,
    journeyName: journey?.name,
    stageIds,
    touchpoints: unique(touchpointIds).map((id) => {
      const point = graph.touchpoints[id];
      return { id, name: point.name, channelId: point.channelId, channel: point.channel };
    }),
    scenarioId: scenario?.id,
    scenarioName: scenario?.name,
    proposition: proposition ? {
      status: proposition.status,
      audience: proposition.audience,
      promise: proposition.promise,
      outcome: proposition.outcome,
      experience: proposition.experience,
    } : undefined,
  };
}

function withLab(graph: ServiceGraph, lab: ServicePrototypeLabState, now: string): ServiceGraph {
  return { ...graph, service: { ...graph.service, prototypeLab: { ...lab, updatedAt: now }, updatedAt: now } };
}

export function experimentReadiness(experiment: ServicePrototypeExperiment): { score: number; ready: boolean; gaps: string[] } {
  const checks = [
    Boolean(experiment.title.trim()),
    Boolean(experiment.hypothesis.trim()),
    Boolean(experiment.journeyId || experiment.stageIds.length || experiment.touchpointIds.length || experiment.scenarioId),
    experiment.participantIds.length > 0,
    experiment.criteria.length > 0,
    experiment.criteria.every((criterion) => Boolean(criterion.label.trim())),
  ];
  const gaps: string[] = [];
  if (!experiment.hypothesis.trim()) gaps.push('Defina uma hipótese testável.');
  if (!(experiment.journeyId || experiment.stageIds.length || experiment.touchpointIds.length || experiment.scenarioId)) gaps.push('Conecte Journey, etapa, touchpoint ou cenário “E se?”.');
  if (!experiment.participantIds.length) gaps.push('Adicione pelo menos um participante.');
  if (!experiment.criteria.length) gaps.push('Defina ao menos um critério de sucesso.');
  if (experiment.criteria.some((criterion) => !criterion.label.trim())) gaps.push('Complete os critérios de sucesso vazios.');
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return { score, ready: checks.every(Boolean), gaps };
}

export function derivePrototypeOutcome(experiment: ServicePrototypeExperiment): PrototypeExperimentOutcome {
  if (!experiment.criteria.length) return 'inconclusive';
  const results = experiment.criteria.map((criterion) => criterion.result);
  if (results.every((result) => result === 'pass')) return 'passed';
  if (results.some((result) => result === 'fail')) return 'failed';
  return 'inconclusive';
}

export function createPrototypeExperiment(input: {
  graph: ServiceGraph;
  title: string;
  hypothesis?: string;
  fidelity?: PrototypeFidelity;
  objective?: string;
  journeyId?: Id;
  stageIds?: Id[];
  touchpointIds?: Id[];
  scenarioId?: Id;
  criteria?: Array<Pick<PrototypeSuccessCriterion, 'label' | 'measure' | 'target'>>;
  now?: string;
}): { graph: ServiceGraph; experimentId: Id | null } {
  const title = clean(input.title);
  if (!title) return { graph: input.graph, experimentId: null };
  const now = input.now ?? nowIso();
  const lab = normalizePrototypeLab(input.graph, now);
  const id = makeId('prototype');
  const sourceSnapshot = capturePrototypeSource(input.graph, input, now);
  const criteria: PrototypeSuccessCriterion[] = (input.criteria ?? []).filter((item) => clean(item.label)).map((item) => ({
    id: makeId('criterion'), label: clean(item.label), measure: clean(item.measure) || undefined, target: clean(item.target) || undefined, result: 'pending',
  }));
  const experiment: ServicePrototypeExperiment = {
    id, serviceId: input.graph.service.id, title, hypothesis: clean(input.hypothesis), fidelity: input.fidelity ?? 'conversation',
    status: 'draft', outcome: 'pending', objective: clean(input.objective) || undefined,
    journeyId: sourceSnapshot.journeyId, stageIds: sourceSnapshot.stageIds, touchpointIds: sourceSnapshot.touchpoints.map((item) => item.id),
    scenarioId: sourceSnapshot.scenarioId, participantIds: [], criteria, observationNotes: [], sourceSnapshot,
    createdAt: now, updatedAt: now,
  };
  const readiness = experimentReadiness(experiment);
  if (readiness.ready) experiment.status = 'ready';
  const next = { ...lab, experiments: { ...lab.experiments, [id]: experiment }, activeExperimentId: id, updatedAt: now };
  return { graph: withLab(input.graph, next, now), experimentId: id };
}

export function updatePrototypeExperiment(
  graph: ServiceGraph,
  experimentId: Id,
  patch: Partial<Pick<ServicePrototypeExperiment, 'title' | 'hypothesis' | 'fidelity' | 'objective' | 'instructions' | 'journeyId' | 'stageIds' | 'touchpointIds' | 'scenarioId'>>,
  now = nowIso(),
): ServiceGraph {
  const lab = normalizePrototypeLab(graph, now);
  const current = lab.experiments[experimentId];
  if (!current || current.status === 'archived') return graph;
  const nextExperiment: ServicePrototypeExperiment = {
    ...current,
    ...patch,
    title: patch.title === undefined ? current.title : clean(patch.title) || current.title,
    hypothesis: patch.hypothesis === undefined ? current.hypothesis : clean(patch.hypothesis),
    objective: patch.objective === undefined ? current.objective : clean(patch.objective) || undefined,
    instructions: patch.instructions === undefined ? current.instructions : clean(patch.instructions) || undefined,
    stageIds: patch.stageIds === undefined ? current.stageIds : ids(patch.stageIds).filter((id) => Boolean(graph.stages[id])),
    touchpointIds: patch.touchpointIds === undefined ? current.touchpointIds : ids(patch.touchpointIds).filter((id) => Boolean(graph.touchpoints[id])),
    updatedAt: now,
  };
  if (current.status === 'draft' || current.status === 'ready') nextExperiment.status = experimentReadiness(nextExperiment).ready ? 'ready' : 'draft';
  return withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: nextExperiment } }, now);
}

export function refreshPrototypeSnapshot(graph: ServiceGraph, experimentId: Id, now = nowIso()): ServiceGraph {
  const lab = normalizePrototypeLab(graph, now);
  const current = lab.experiments[experimentId];
  if (!current) return graph;
  const sourceSnapshot = capturePrototypeSource(graph, current, now);
  return withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: { ...current, sourceSnapshot, updatedAt: now } } }, now);
}

export function addPrototypeParticipant(
  graph: ServiceGraph,
  experimentId: Id,
  input: { name: string; role?: string; segment?: string; note?: string },
  now = nowIso(),
): { graph: ServiceGraph; participantId: Id | null } {
  const name = clean(input.name);
  if (!name) return { graph, participantId: null };
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return { graph, participantId: null };
  const existing = Object.values(lab.participants).find((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase() && clean(item.role).toLocaleLowerCase() === clean(input.role).toLocaleLowerCase());
  const participantId = existing?.id ?? makeId('participant');
  const participant: PrototypeParticipant = existing ?? { id: participantId, name, role: clean(input.role) || undefined, segment: clean(input.segment) || undefined, note: clean(input.note) || undefined, createdAt: now };
  const nextExperiment = { ...experiment, participantIds: unique([...experiment.participantIds, participantId]), updatedAt: now };
  if (nextExperiment.status === 'draft' || nextExperiment.status === 'ready') nextExperiment.status = experimentReadiness(nextExperiment).ready ? 'ready' : 'draft';
  return {
    graph: withLab(graph, { ...lab, participants: { ...lab.participants, [participantId]: participant }, experiments: { ...lab.experiments, [experimentId]: nextExperiment } }, now),
    participantId,
  };
}

export function unlinkPrototypeParticipant(graph: ServiceGraph, experimentId: Id, participantId: Id, now = nowIso()): ServiceGraph {
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return graph;
  const nextExperiment = { ...experiment, participantIds: experiment.participantIds.filter((id) => id !== participantId), updatedAt: now };
  if (nextExperiment.status === 'draft' || nextExperiment.status === 'ready') nextExperiment.status = experimentReadiness(nextExperiment).ready ? 'ready' : 'draft';
  return withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: nextExperiment } }, now);
}

export function addPrototypeCriterion(
  graph: ServiceGraph,
  experimentId: Id,
  input: { label: string; measure?: string; target?: string },
  now = nowIso(),
): { graph: ServiceGraph; criterionId: Id | null } {
  const label = clean(input.label);
  if (!label) return { graph, criterionId: null };
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return { graph, criterionId: null };
  const criterion: PrototypeSuccessCriterion = { id: makeId('criterion'), label, measure: clean(input.measure) || undefined, target: clean(input.target) || undefined, result: 'pending' };
  const nextExperiment = { ...experiment, criteria: [...experiment.criteria, criterion], updatedAt: now };
  if (nextExperiment.status === 'draft' || nextExperiment.status === 'ready') nextExperiment.status = experimentReadiness(nextExperiment).ready ? 'ready' : 'draft';
  return { graph: withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: nextExperiment } }, now), criterionId: criterion.id };
}

export function updatePrototypeCriterion(
  graph: ServiceGraph,
  experimentId: Id,
  criterionId: Id,
  patch: Partial<Pick<PrototypeSuccessCriterion, 'label' | 'measure' | 'target' | 'evidenceNote'>>,
  now = nowIso(),
): ServiceGraph {
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return graph;
  const criteria = experiment.criteria.map((criterion) => criterion.id !== criterionId ? criterion : {
    ...criterion,
    label: patch.label === undefined ? criterion.label : clean(patch.label),
    measure: patch.measure === undefined ? criterion.measure : clean(patch.measure) || undefined,
    target: patch.target === undefined ? criterion.target : clean(patch.target) || undefined,
    evidenceNote: patch.evidenceNote === undefined ? criterion.evidenceNote : clean(patch.evidenceNote) || undefined,
  });
  const nextExperiment = { ...experiment, criteria, updatedAt: now };
  if (nextExperiment.status === 'draft' || nextExperiment.status === 'ready') nextExperiment.status = experimentReadiness(nextExperiment).ready ? 'ready' : 'draft';
  return withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: nextExperiment } }, now);
}

export function removePrototypeCriterion(graph: ServiceGraph, experimentId: Id, criterionId: Id, now = nowIso()): ServiceGraph {
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return graph;
  const nextExperiment = { ...experiment, criteria: experiment.criteria.filter((criterion) => criterion.id !== criterionId), updatedAt: now };
  if (nextExperiment.status === 'draft' || nextExperiment.status === 'ready') nextExperiment.status = experimentReadiness(nextExperiment).ready ? 'ready' : 'draft';
  return withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: nextExperiment } }, now);
}

export function setPrototypeCriterionResult(
  graph: ServiceGraph,
  experimentId: Id,
  criterionId: Id,
  result: PrototypeCriterionResult,
  evidenceNote?: string,
  now = nowIso(),
): ServiceGraph {
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return graph;
  const criteria = experiment.criteria.map((criterion) => criterion.id === criterionId ? { ...criterion, result, evidenceNote: evidenceNote === undefined ? criterion.evidenceNote : clean(evidenceNote) || undefined } : criterion);
  return withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: { ...experiment, criteria, outcome: 'pending', updatedAt: now } } }, now);
}

export function addPrototypeObservation(graph: ServiceGraph, experimentId: Id, note: string, now = nowIso()): ServiceGraph {
  const value = clean(note);
  if (!value) return graph;
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return graph;
  return withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: { ...experiment, observationNotes: [...experiment.observationNotes, value], updatedAt: now } } }, now);
}

export function startPrototypeExperiment(graph: ServiceGraph, experimentId: Id, now = nowIso()): { graph: ServiceGraph; started: boolean; reason?: string } {
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return { graph, started: false, reason: 'Experimento não encontrado.' };
  const readiness = experimentReadiness(experiment);
  if (!readiness.ready) return { graph, started: false, reason: readiness.gaps[0] ?? 'Plano de teste incompleto.' };
  const next = { ...experiment, status: 'running' as const, outcome: 'pending' as const, startedAt: experiment.startedAt || now, completedAt: undefined, updatedAt: now };
  return { graph: withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: next }, activeExperimentId: experimentId }, now), started: true };
}

export function completePrototypeExperiment(
  graph: ServiceGraph,
  experimentId: Id,
  outcome?: Exclude<PrototypeExperimentOutcome, 'pending'>,
  now = nowIso(),
): { graph: ServiceGraph; outcome: PrototypeExperimentOutcome | null } {
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return { graph, outcome: null };
  const finalOutcome = outcome ?? derivePrototypeOutcome(experiment);
  const next = { ...experiment, status: 'completed' as const, outcome: finalOutcome, completedAt: now, updatedAt: now };
  return { graph: withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: next }, activeExperimentId: experimentId }, now), outcome: finalOutcome };
}

export function reopenPrototypeExperiment(graph: ServiceGraph, experimentId: Id, now = nowIso()): ServiceGraph {
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return graph;
  const next = { ...experiment, status: experimentReadiness(experiment).ready ? 'ready' as const : 'draft' as const, outcome: 'pending' as const, completedAt: undefined, updatedAt: now };
  return withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: next } }, now);
}

export function archivePrototypeExperiment(graph: ServiceGraph, experimentId: Id, now = nowIso()): ServiceGraph {
  const lab = normalizePrototypeLab(graph, now);
  const experiment = lab.experiments[experimentId];
  if (!experiment) return graph;
  return withLab(graph, { ...lab, experiments: { ...lab.experiments, [experimentId]: { ...experiment, status: 'archived', updatedAt: now } }, activeExperimentId: lab.activeExperimentId === experimentId ? undefined : lab.activeExperimentId }, now);
}

export type PrototypeExperimentReport = ServicePrototypeExperiment & {
  readinessScore: number;
  ready: boolean;
  gaps: string[];
  participantCount: number;
  assessedCriteria: number;
  suggestedOutcome: PrototypeExperimentOutcome;
};

export function buildPrototypeLabReport(graph: ServiceGraph) {
  const lab = normalizePrototypeLab(graph, String(graph.service.updatedAt || nowIso()));
  const experiments: PrototypeExperimentReport[] = Object.values(lab.experiments)
    .map((experiment) => {
      const readiness = experimentReadiness(experiment);
      return {
        ...experiment,
        readinessScore: readiness.score,
        ready: readiness.ready,
        gaps: readiness.gaps,
        participantCount: experiment.participantIds.length,
        assessedCriteria: experiment.criteria.filter((criterion) => criterion.result !== 'pending').length,
        suggestedOutcome: derivePrototypeOutcome(experiment),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const visible = experiments.filter((experiment) => experiment.status !== 'archived');
  const completed = visible.filter((experiment) => experiment.status === 'completed');
  const activeExperimentId = lab.activeExperimentId && lab.experiments[lab.activeExperimentId] ? lab.activeExperimentId : visible[0]?.id;
  return {
    lab,
    experiments: visible,
    archivedExperiments: experiments.filter((experiment) => experiment.status === 'archived'),
    activeExperimentId,
    activeExperiment: activeExperimentId ? visible.find((experiment) => experiment.id === activeExperimentId) ?? null : null,
    counts: {
      experiments: visible.length,
      ready: visible.filter((experiment) => experiment.ready && ['draft', 'ready'].includes(experiment.status)).length,
      running: visible.filter((experiment) => experiment.status === 'running').length,
      completed: completed.length,
      passed: completed.filter((experiment) => experiment.outcome === 'passed').length,
      failed: completed.filter((experiment) => experiment.outcome === 'failed').length,
      inconclusive: completed.filter((experiment) => experiment.outcome === 'inconclusive').length,
      participants: Object.keys(lab.participants).length,
    },
    validationRate: completed.length ? Math.round((completed.filter((experiment) => experiment.outcome === 'passed').length / completed.length) * 100) : 0,
  };
}

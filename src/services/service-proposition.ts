import type {
  GraphEntity, Id, ServiceGraph, ServiceProposition, ServicePropositionState,
  ServicePropositionStatus, ServiceScenario, ServiceScenarioStatus,
} from '../domain/model';

const nowIso = () => new Date().toISOString();
const unique = <T,>(values: T[]) => [...new Set(values)];
const makeId = (prefix: string): Id => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
};
const cleanList = (values: unknown): string[] => Array.isArray(values)
  ? unique(values.map((value) => String(value).trim()).filter(Boolean))
  : String(values ?? '').split(/\n|,/).map((value) => value.trim()).filter(Boolean);
const ids = (value: unknown): Id[] => Array.isArray(value)
  ? unique(value.filter((item): item is Id => typeof item === 'string' && Boolean(item)))
  : [];

export const PROPOSITION_STATUS_LABELS: Record<ServicePropositionStatus, string> = {
  draft: 'Rascunho', ready: 'Pronta para testar', validated: 'Validada',
};
export const SCENARIO_STATUS_LABELS: Record<ServiceScenarioStatus, string> = {
  draft: 'Rascunho', testing: 'Em teste', accepted: 'Aceito', rejected: 'Descartado',
};

function entityValues(graph: ServiceGraph, kind: string): GraphEntity[] {
  return Object.values(graph.entities?.[kind] ?? {}).filter((entity) => !entity.serviceId || entity.serviceId === graph.service.id);
}

export function emptyServiceProposition(graph: ServiceGraph, now = nowIso()): ServiceProposition {
  const definition = graph.service.project?.definition;
  return {
    version: 1,
    status: 'draft',
    audience: '',
    problem: '',
    promise: definition?.promise ?? '',
    outcome: definition?.outcome ?? '',
    experience: '',
    differentiator: '',
    businessValue: '',
    capabilities: [],
    principles: [...(definition?.principles ?? [])],
    linkedInsightIds: [],
    linkedNeedIds: [],
    linkedProblemIds: [...(definition?.problemIds ?? [])],
    linkedEvidenceIds: [...(definition?.evidenceIds ?? [])],
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeServicePropositionState(graph: ServiceGraph, now = nowIso()): ServicePropositionState {
  const current = graph.service.proposition?.current;
  const fallback = emptyServiceProposition(graph, now);
  return {
    version: 1,
    current: current ? {
      ...fallback,
      ...current,
      version: 1,
      capabilities: cleanList(current.capabilities),
      principles: cleanList(current.principles),
      linkedInsightIds: ids(current.linkedInsightIds),
      linkedNeedIds: ids(current.linkedNeedIds),
      linkedProblemIds: ids(current.linkedProblemIds),
      linkedEvidenceIds: ids(current.linkedEvidenceIds),
      createdAt: current.createdAt || now,
      updatedAt: current.updatedAt || now,
    } : fallback,
    updatedAt: graph.service.proposition?.updatedAt || current?.updatedAt || now,
  };
}

export function propositionStatement(proposition: ServiceProposition): string {
  const audience = proposition.audience.trim() || '[pessoa / público]';
  const promise = proposition.promise.trim() || '[serviço / proposta]';
  const outcome = proposition.outcome.trim() || '[resultado esperado]';
  const experience = proposition.experience.trim();
  const differentiator = proposition.differentiator.trim();
  let statement = `Para ${audience}, ${promise} permite ${outcome}`;
  if (experience) statement += ` por meio de ${experience}`;
  if (differentiator) statement += `, diferentemente de ${differentiator}`;
  return `${statement}.`;
}

export type ServicePropositionReport = {
  current: ServiceProposition;
  statement: string;
  readinessScore: number;
  propositionReady: boolean;
  sourceCount: number;
  linkedInsights: GraphEntity[];
  linkedNeeds: GraphEntity[];
  linkedProblems: GraphEntity[];
  linkedEvidence: GraphEntity[];
  scenarios: ServiceScenario[];
  acceptedScenario: ServiceScenario | null;
  gaps: string[];
};

export function buildServicePropositionReport(graph: ServiceGraph): ServicePropositionReport {
  const state = normalizeServicePropositionState(graph, String(graph.service.updatedAt || nowIso()));
  const current = state.current;
  const insightMap = graph.entities?.insight ?? {};
  const needMap = graph.entities?.need ?? {};
  const problemMap = { ...(graph.entities?.problem ?? {}), ...(graph.entities?.problemHypothesis ?? {}) };
  const evidenceMap = graph.entities?.evidence ?? {};
  const linkedInsights = current.linkedInsightIds.map((id) => insightMap[id]).filter(Boolean);
  const linkedNeeds = current.linkedNeedIds.map((id) => needMap[id]).filter(Boolean);
  const linkedProblems = current.linkedProblemIds.map((id) => problemMap[id]).filter(Boolean);
  const linkedEvidence = current.linkedEvidenceIds.map((id) => evidenceMap[id]).filter(Boolean);
  const sourceCount = linkedInsights.length + linkedNeeds.length + linkedProblems.length + linkedEvidence.length;
  const checks = [
    Boolean(current.audience.trim()), Boolean(current.problem.trim()), Boolean(current.promise.trim()), Boolean(current.outcome.trim()),
    Boolean(current.experience.trim()), Boolean(current.differentiator.trim()), Boolean(current.businessValue.trim()), current.capabilities.length > 0,
    sourceCount > 0,
  ];
  const readinessScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const gaps: string[] = [];
  if (!current.audience.trim()) gaps.push('Defina para quem o serviço é desenhado.');
  if (!current.problem.trim()) gaps.push('Explicite o problema ou tensão central.');
  if (!current.promise.trim()) gaps.push('Descreva a promessa do serviço.');
  if (!current.outcome.trim()) gaps.push('Defina o resultado que deve ser produzido.');
  if (!current.experience.trim()) gaps.push('Descreva como a experiência será percebida.');
  if (!current.businessValue.trim()) gaps.push('Explique como o negócio captura valor.');
  if (!current.capabilities.length) gaps.push('Liste as capacidades necessárias para entregar a proposta.');
  if (!sourceCount) gaps.push('Conecte Insights, Necessidades, Problemas ou Evidências antes de validar a proposta.');
  const scenarios = Object.values(graph.service.scenarios ?? {})
    .filter((scenario) => scenario.kind === 'alternative' && Boolean(scenario.propositionPatch || scenario.hypothesis))
    .sort((a, b) => String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));
  return {
    current,
    statement: propositionStatement(current),
    readinessScore,
    propositionReady: readinessScore >= 70 && sourceCount > 0,
    sourceCount,
    linkedInsights, linkedNeeds, linkedProblems, linkedEvidence,
    scenarios,
    acceptedScenario: scenarios.find((scenario) => scenario.status === 'accepted') ?? null,
    gaps,
  };
}

export function saveServiceProposition(input: {
  graph: ServiceGraph;
  patch: Partial<ServiceProposition>;
  status?: ServicePropositionStatus;
  now?: string;
}): ServiceGraph {
  const now = input.now ?? nowIso();
  const state = normalizeServicePropositionState(input.graph, now);
  const current: ServiceProposition = {
    ...state.current,
    ...input.patch,
    version: 1,
    status: input.status ?? input.patch.status ?? state.current.status,
    capabilities: cleanList(input.patch.capabilities ?? state.current.capabilities),
    principles: cleanList(input.patch.principles ?? state.current.principles),
    linkedInsightIds: ids(input.patch.linkedInsightIds ?? state.current.linkedInsightIds),
    linkedNeedIds: ids(input.patch.linkedNeedIds ?? state.current.linkedNeedIds),
    linkedProblemIds: ids(input.patch.linkedProblemIds ?? state.current.linkedProblemIds),
    linkedEvidenceIds: ids(input.patch.linkedEvidenceIds ?? state.current.linkedEvidenceIds),
    updatedAt: now,
  };
  return {
    ...input.graph,
    service: {
      ...input.graph.service,
      proposition: { version: 1, current, updatedAt: now },
      updatedAt: now,
    },
  };
}

export function createWhatIfScenario(input: {
  graph: ServiceGraph;
  name: string;
  description?: string;
  hypothesis: string;
  patch?: Partial<ServiceProposition>;
  successCriteria?: string[];
  insightIds?: Id[];
  needIds?: Id[];
  problemIds?: Id[];
  evidenceIds?: Id[];
  now?: string;
  id?: Id;
}): { graph: ServiceGraph; scenarioId: Id } {
  const now = input.now ?? nowIso();
  const id = input.id ?? makeId('scenario');
  const current = normalizeServicePropositionState(input.graph, now).current;
  const patch = input.patch ?? {};
  const scenario: ServiceScenario = {
    id,
    name: input.name.trim() || 'Novo cenário',
    description: input.description?.trim() || undefined,
    kind: 'alternative',
    status: 'draft',
    hypothesis: input.hypothesis.trim(),
    baselineScenarioId: 'current',
    propositionPatch: {
      ...patch,
      version: 1,
      capabilities: patch.capabilities === undefined ? undefined : cleanList(patch.capabilities),
      principles: patch.principles === undefined ? undefined : cleanList(patch.principles),
      linkedInsightIds: patch.linkedInsightIds === undefined ? undefined : ids(patch.linkedInsightIds),
      linkedNeedIds: patch.linkedNeedIds === undefined ? undefined : ids(patch.linkedNeedIds),
      linkedProblemIds: patch.linkedProblemIds === undefined ? undefined : ids(patch.linkedProblemIds),
      linkedEvidenceIds: patch.linkedEvidenceIds === undefined ? undefined : ids(patch.linkedEvidenceIds),
      createdAt: current.createdAt,
      updatedAt: now,
    },
    successCriteria: cleanList(input.successCriteria ?? []),
    insightIds: ids(input.insightIds), needIds: ids(input.needIds), problemIds: ids(input.problemIds), evidenceIds: ids(input.evidenceIds),
    createdAt: now,
    updatedAt: now,
  };
  return {
    graph: {
      ...input.graph,
      service: {
        ...input.graph.service,
        scenarios: { ...(input.graph.service.scenarios ?? {}), [id]: scenario },
        scenarioState: input.graph.service.scenarioState ?? { mode: 'all', activeScenarioId: 'current', compareScenarioId: id },
        updatedAt: now,
      },
    },
    scenarioId: id,
  };
}

export function updateWhatIfScenarioStatus(input: { graph: ServiceGraph; scenarioId: Id; status: ServiceScenarioStatus; now?: string }): ServiceGraph {
  const scenario = input.graph.service.scenarios?.[input.scenarioId];
  if (!scenario || scenario.kind !== 'alternative') return input.graph;
  const now = input.now ?? nowIso();
  return {
    ...input.graph,
    service: {
      ...input.graph.service,
      scenarios: { ...input.graph.service.scenarios, [scenario.id]: { ...scenario, status: input.status, updatedAt: now } },
      updatedAt: now,
    },
  };
}

export function promoteWhatIfScenario(input: { graph: ServiceGraph; scenarioId: Id; now?: string }): ServiceGraph {
  const scenario = input.graph.service.scenarios?.[input.scenarioId];
  if (!scenario || scenario.kind !== 'alternative' || !scenario.propositionPatch) return input.graph;
  const now = input.now ?? nowIso();
  const state = normalizeServicePropositionState(input.graph, now);
  const patch = scenario.propositionPatch;
  const current: ServiceProposition = {
    ...state.current,
    ...patch,
    version: 1,
    status: 'ready',
    capabilities: patch.capabilities === undefined ? state.current.capabilities : cleanList(patch.capabilities),
    principles: patch.principles === undefined ? state.current.principles : cleanList(patch.principles),
    linkedInsightIds: unique([...state.current.linkedInsightIds, ...ids(scenario.insightIds), ...ids(patch.linkedInsightIds)]),
    linkedNeedIds: unique([...state.current.linkedNeedIds, ...ids(scenario.needIds), ...ids(patch.linkedNeedIds)]),
    linkedProblemIds: unique([...state.current.linkedProblemIds, ...ids(scenario.problemIds), ...ids(patch.linkedProblemIds)]),
    linkedEvidenceIds: unique([...state.current.linkedEvidenceIds, ...ids(scenario.evidenceIds), ...ids(patch.linkedEvidenceIds)]),
    updatedAt: now,
  };
  const scenarios = { ...(input.graph.service.scenarios ?? {}) };
  for (const [id, item] of Object.entries(scenarios)) {
    if (item.kind === 'alternative' && item.status === 'accepted') scenarios[id] = { ...item, status: 'testing', updatedAt: now };
  }
  scenarios[scenario.id] = { ...scenario, status: 'accepted', promotedAt: now, updatedAt: now };
  return {
    ...input.graph,
    service: {
      ...input.graph.service,
      proposition: { version: 1, current, updatedAt: now },
      scenarios,
      scenarioState: {
        mode: 'single',
        activeScenarioId: scenario.id,
        compareScenarioId: input.graph.service.scenarioState?.compareScenarioId || 'current',
      },
      updatedAt: now,
    },
  };
}

export function removeWhatIfScenario(input: { graph: ServiceGraph; scenarioId: Id; now?: string }): ServiceGraph {
  const scenario = input.graph.service.scenarios?.[input.scenarioId];
  if (!scenario || scenario.kind !== 'alternative') return input.graph;
  const now = input.now ?? nowIso();
  const scenarios = { ...(input.graph.service.scenarios ?? {}) };
  delete scenarios[input.scenarioId];
  const state = input.graph.service.scenarioState;
  return {
    ...input.graph,
    service: {
      ...input.graph.service,
      scenarios,
      scenarioState: state ? {
        ...state,
        activeScenarioId: state.activeScenarioId === input.scenarioId ? 'current' : state.activeScenarioId,
        compareScenarioId: state.compareScenarioId === input.scenarioId ? 'current' : state.compareScenarioId,
      } : state,
      updatedAt: now,
    },
  };
}

export type PropositionDifference = { field: keyof ServiceProposition; label: string; current: string; alternative: string };
const comparisonFields: Array<[keyof ServiceProposition, string]> = [
  ['audience', 'Para quem'], ['problem', 'Problema'], ['promise', 'Promessa'], ['outcome', 'Resultado'],
  ['experience', 'Experiência'], ['differentiator', 'Diferencial'], ['businessValue', 'Valor para o negócio'], ['capabilities', 'Capacidades'],
];
export function scenarioDifferences(graph: ServiceGraph, scenarioId: Id): PropositionDifference[] {
  const current = normalizeServicePropositionState(graph).current;
  const scenario = graph.service.scenarios?.[scenarioId];
  if (!scenario?.propositionPatch) return [];
  return comparisonFields.flatMap(([field, label]) => {
    const before = current[field];
    const after = scenario.propositionPatch?.[field];
    if (after === undefined) return [];
    const currentText = Array.isArray(before) ? before.join(' · ') : String(before ?? '');
    const alternativeText = Array.isArray(after) ? after.join(' · ') : String(after ?? '');
    return currentText === alternativeText ? [] : [{ field, label, current: currentText, alternative: alternativeText }];
  });
}

export function propositionSourceOptions(graph: ServiceGraph) {
  return {
    insights: entityValues(graph, 'insight'),
    needs: entityValues(graph, 'need'),
    problems: [...entityValues(graph, 'problem'), ...entityValues(graph, 'problemHypothesis')],
    evidence: entityValues(graph, 'evidence'),
  };
}

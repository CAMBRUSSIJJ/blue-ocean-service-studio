import type { GraphEntity, Id, ServiceGraph, ServiceProjectDefinition } from '../domain/model';

export type ServiceDefinitionDraft = {
  promise: string;
  outcome: string;
  scope: string;
  startBoundary: string;
  endBoundary: string;
  principles: string[];
  successCriteria: string[];
  outOfScope: string[];
  assumptions: string[];
  personaIds: Id[];
  problemIds: Id[];
  evidenceIds: Id[];
};

export type DefinitionConnection = {
  id: Id;
  kind: 'persona' | 'problem' | 'evidence';
  title: string;
  description: string;
  selected: boolean;
  confidence?: 'low' | 'medium' | 'high';
};

export type ServiceDefinitionStudioReport = {
  draft: ServiceDefinitionDraft;
  connections: DefinitionConnection[];
  checks: Array<{ id: string; label: string; complete: boolean; detail: string }>;
  completed: number;
  total: number;
  score: number;
  readyToDesign: boolean;
  targetPersonaCount: number;
  validatedProblemCount: number;
  evidenceCount: number;
};

const text = (value: unknown) => typeof value === 'string' ? value : '';
const textArray = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))]
  : [];
const idArray = (value: unknown): Id[] => Array.isArray(value)
  ? [...new Set(value.filter((item): item is Id => typeof item === 'string' && Boolean(item)))]
  : [];
const titleOf = (entity: GraphEntity) => String(entity.title ?? entity.name ?? 'Sem título');
const descriptionOf = (entity: GraphEntity) => String(entity.description ?? '');

export function serviceDefinitionDraftFromDefinition(definition: ServiceProjectDefinition): ServiceDefinitionDraft {
  return {
    promise: text(definition.promise),
    outcome: text(definition.outcome),
    scope: text(definition.scope),
    startBoundary: text(definition.startBoundary),
    endBoundary: text(definition.endBoundary),
    principles: textArray(definition.principles),
    successCriteria: textArray(definition.successCriteria),
    outOfScope: textArray(definition.outOfScope),
    assumptions: textArray(definition.assumptions),
    personaIds: idArray(definition.personaIds),
    problemIds: idArray(definition.problemIds),
    evidenceIds: idArray(definition.evidenceIds),
  };
}

export function normalizeServiceDefinitionDraft(draft: Partial<ServiceDefinitionDraft>): ServiceDefinitionDraft {
  return {
    promise: text(draft.promise).trim(),
    outcome: text(draft.outcome).trim(),
    scope: text(draft.scope).trim(),
    startBoundary: text(draft.startBoundary).trim(),
    endBoundary: text(draft.endBoundary).trim(),
    principles: textArray(draft.principles),
    successCriteria: textArray(draft.successCriteria),
    outOfScope: textArray(draft.outOfScope),
    assumptions: textArray(draft.assumptions),
    personaIds: idArray(draft.personaIds),
    problemIds: idArray(draft.problemIds),
    evidenceIds: idArray(draft.evidenceIds),
  };
}

export function serviceDefinitionConnectionOptions(graph: ServiceGraph, draft: ServiceDefinitionDraft): DefinitionConnection[] {
  const selectedPersonas = new Set(draft.personaIds);
  const selectedProblems = new Set(draft.problemIds);
  const selectedEvidence = new Set(draft.evidenceIds);
  const personas = Object.values(graph.entities?.persona ?? {}).map((entity): DefinitionConnection => ({
    id: entity.id,
    kind: 'persona',
    title: titleOf(entity),
    description: descriptionOf(entity),
    selected: selectedPersonas.has(entity.id),
  }));
  const validatedEntityProblems = Object.values(graph.entities?.problem ?? {})
    .filter((entity) => entity.status === 'validated')
    .map((entity): DefinitionConnection => ({ id: entity.id, kind: 'problem', title: titleOf(entity), description: descriptionOf(entity), selected: selectedProblems.has(entity.id) }));
  const structuredProblems = Object.values(graph.problems ?? {}).map((problem): DefinitionConnection => ({
    id: problem.id,
    kind: 'problem',
    title: String(problem.description || 'Problema'),
    description: String(problem.description ?? ''),
    selected: selectedProblems.has(problem.id),
  }));
  const problemMap = new Map<Id, DefinitionConnection>();
  for (const item of [...validatedEntityProblems, ...structuredProblems]) if (!problemMap.has(item.id)) problemMap.set(item.id, item);
  const evidence = Object.values(graph.entities?.evidence ?? {}).map((entity): DefinitionConnection => ({
    id: entity.id,
    kind: 'evidence',
    title: titleOf(entity),
    description: descriptionOf(entity),
    selected: selectedEvidence.has(entity.id),
    confidence: ['low', 'medium', 'high'].includes(String(entity.confidence)) ? entity.confidence as 'low' | 'medium' | 'high' : 'medium',
  }));
  return [...personas, ...problemMap.values(), ...evidence].sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'pt-BR'));
}

export function buildServiceDefinitionStudioReport(graph: ServiceGraph, draftInput?: Partial<ServiceDefinitionDraft>): ServiceDefinitionStudioReport {
  const stored = graph.service.project?.definition;
  const draft = normalizeServiceDefinitionDraft(draftInput ?? (stored ? serviceDefinitionDraftFromDefinition(stored) : {}));
  const options = serviceDefinitionConnectionOptions(graph, draft);
  const validPersonaIds = new Set(options.filter((item) => item.kind === 'persona').map((item) => item.id));
  const validProblemIds = new Set(options.filter((item) => item.kind === 'problem').map((item) => item.id));
  const validEvidenceIds = new Set(options.filter((item) => item.kind === 'evidence').map((item) => item.id));
  const personaIds = draft.personaIds.filter((id) => validPersonaIds.has(id));
  const problemIds = draft.problemIds.filter((id) => validProblemIds.has(id));
  const evidenceIds = draft.evidenceIds.filter((id) => validEvidenceIds.has(id));
  const checks = [
    { id: 'promise', label: 'Promessa explícita', complete: Boolean(draft.promise), detail: 'A proposta de valor do serviço está escrita sem depender do desenho.' },
    { id: 'outcome', label: 'Outcome definido', complete: Boolean(draft.outcome), detail: 'Existe um resultado desejado observável para cliente e negócio.' },
    { id: 'scope', label: 'Escopo delimitado', complete: Boolean(draft.scope), detail: 'O que o serviço cobre está descrito.' },
    { id: 'boundaries', label: 'Início e fim definidos', complete: Boolean(draft.startBoundary && draft.endBoundary), detail: 'O gatilho de entrada e a condição de encerramento estão explícitos.' },
    { id: 'principles', label: 'Princípios de desenho', complete: draft.principles.length > 0, detail: 'Há ao menos um princípio para orientar decisões futuras.' },
    { id: 'personas', label: 'Público-alvo conectado', complete: personaIds.length > 0, detail: 'A definição aponta para ao menos uma Persona do Discovery.' },
    { id: 'problems', label: 'Problema validado conectado', complete: problemIds.length > 0, detail: 'A definição está ancorada em um problema validado ou estruturado.' },
    { id: 'evidence', label: 'Evidência rastreável', complete: evidenceIds.length > 0, detail: 'Há evidência explicitamente ligada às decisões de definição.' },
    { id: 'success', label: 'Critério de sucesso', complete: draft.successCriteria.length > 0, detail: 'Existe ao menos um sinal que permitirá saber se a promessa foi cumprida.' },
  ];
  const completed = checks.filter((item) => item.complete).length;
  const total = checks.length;
  const score = Math.round((completed / total) * 100);
  return {
    draft: { ...draft, personaIds, problemIds, evidenceIds },
    connections: options,
    checks,
    completed,
    total,
    score,
    readyToDesign: checks.every((item) => item.complete),
    targetPersonaCount: personaIds.length,
    validatedProblemCount: problemIds.length,
    evidenceCount: evidenceIds.length,
  };
}

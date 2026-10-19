import type { Id, ServiceGraph, ServiceFrameLayerKey } from '../domain/model';
import { buildServiceProjectReport } from './service-project.ts';
import { buildServiceFrameCoverage, serviceFrameLayerForItem, serviceFrameStageForItem } from './service-frame.ts';

export type ServiceReadinessAreaKey = 'context' | 'definition' | 'structure';
export type ServiceReadinessTarget = 'context' | 'definition' | 'service-frame';
export type ServiceReadinessContextKind = 'persona' | 'need' | 'job' | 'problem' | 'evidence';

export type ServiceReadinessAction = {
  target: ServiceReadinessTarget;
  label: string;
  contextKind?: ServiceReadinessContextKind;
  boardId?: Id;
};

export type ServiceReadinessCriterion = {
  id: string;
  area: ServiceReadinessAreaKey;
  label: string;
  detail: string;
  complete: boolean;
  blocking: true;
  action: ServiceReadinessAction;
};

export type ServiceReadinessSection = {
  key: ServiceReadinessAreaKey;
  label: string;
  description: string;
  complete: number;
  total: number;
  score: number;
  criteria: ServiceReadinessCriterion[];
};

export type ServiceReadinessReport = {
  version: 1;
  score: number;
  complete: number;
  total: number;
  state: 'blocked' | 'building' | 'ready';
  readyForDesign: boolean;
  blockingGaps: ServiceReadinessCriterion[];
  nextAction: ServiceReadinessCriterion | null;
  sections: Record<ServiceReadinessAreaKey, ServiceReadinessSection>;
  frame: {
    boardId: Id | null;
    boardName: string | null;
    stageCount: number;
    coverage: number;
  };
};

const count = (value?: Record<string, unknown>) => Object.keys(value ?? {}).length;
const text = (value: unknown) => String(value ?? '').trim();
const ids = (value: unknown): Id[] => Array.isArray(value) ? value.filter((id): id is Id => typeof id === 'string' && !!id) : [];

function criterion(input: Omit<ServiceReadinessCriterion, 'blocking'>): ServiceReadinessCriterion {
  return { ...input, blocking: true };
}

function section(key: ServiceReadinessAreaKey, label: string, description: string, criteria: ServiceReadinessCriterion[]): ServiceReadinessSection {
  const complete = criteria.filter((item) => item.complete).length;
  const total = criteria.length;
  return { key, label, description, criteria, complete, total, score: total ? Math.round((complete / total) * 100) : 0 };
}

function validReferences(graph: ServiceGraph, kind: 'persona' | 'problem' | 'evidence', values: Id[]) {
  return values.length > 0 && values.some((id) => !!graph.entities?.[kind]?.[id]);
}

export function buildServiceReadinessReport(graph: ServiceGraph): ServiceReadinessReport {
  const projectReport = buildServiceProjectReport(graph);
  const definition = projectReport.project.definition;
  const personas = count(graph.entities?.persona);
  const needs = count(graph.entities?.need);
  const jobs = count(graph.entities?.job);
  const evidences = count(graph.entities?.evidence) + count(graph.research?.sources as Record<string, unknown> | undefined);
  const validatedProblems = Object.values(graph.entities?.problem ?? {}).filter((item) => item.status === 'validated');
  const evidenceBackedProblems = validatedProblems.filter((item) => ids(item.evidenceIds).length > 0);

  const serviceBoards = Object.values(graph.views?.whiteboards ?? {}).filter((board) => board.layoutMode === 'service');
  const evaluatedBoards = serviceBoards.map((board) => ({ board, coverage: buildServiceFrameCoverage(graph, board.id) }));
  evaluatedBoards.sort((a, b) => b.coverage.percent - a.coverage.percent || b.coverage.total - a.coverage.total);
  const selected = evaluatedBoards[0];
  const frameBoard = selected?.board;
  const frameCoverage = selected?.coverage ?? { complete: 0, total: 0, percent: 0, stages: [] };
  const journeyId = frameBoard?.journeyId ?? graph.service.journeyIds[0];
  const journey = journeyId ? graph.journeys[journeyId] : undefined;
  const stages = (journey?.stageIds ?? []).map((id) => graph.stages[id]).filter(Boolean);
  const customerActionCount = stages.filter((stage) => text(stage.customerAction)).length;
  const customerActionCoverage = stages.length ? Math.round((customerActionCount / stages.length) * 100) : 0;
  const presentLayers = new Set<ServiceFrameLayerKey>();
  if (frameBoard) {
    for (const item of Object.values(frameBoard.items ?? {})) {
      if (item.kind === 'smart' && item.objectKind === 'stage') continue;
      if (!serviceFrameStageForItem(item, graph)) continue;
      presentLayers.add(serviceFrameLayerForItem(item));
    }
  }

  const contextCriteria = [
    criterion({ id: 'context.persona', area: 'context', label: 'Persona identificada', detail: personas ? `${personas} Persona(s) disponível(is).` : 'Defina pelo menos uma Persona real do serviço.', complete: personas > 0, action: { target: 'context', contextKind: 'persona', label: 'Abrir Personas' } }),
    criterion({ id: 'context.need-job', area: 'context', label: 'Necessidade ou Job explícito', detail: needs + jobs ? `${needs} necessidade(s) · ${jobs} Job(s).` : 'Registre o que a pessoa precisa ou tenta alcançar.', complete: needs + jobs > 0, action: { target: 'context', contextKind: needs ? 'job' : 'need', label: needs ? 'Abrir Jobs' : 'Abrir Necessidades' } }),
    criterion({ id: 'context.problem', area: 'context', label: 'Problema validado', detail: validatedProblems.length ? `${validatedProblems.length} problema(s) validado(s).` : 'Valide pelo menos uma hipótese com evidência antes de estruturar a solução.', complete: validatedProblems.length > 0, action: { target: 'context', contextKind: 'problem', label: 'Abrir Problemas' } }),
    criterion({ id: 'context.evidence', area: 'context', label: 'Evidência registrada', detail: evidences ? `${evidences} evidência(s) disponível(is).` : 'Adicione evidência observável para sustentar decisões.', complete: evidences > 0, action: { target: 'context', contextKind: 'evidence', label: 'Abrir Evidências' } }),
    criterion({ id: 'context.problem-evidence', area: 'context', label: 'Problema sustentado por evidência', detail: evidenceBackedProblems.length ? `${evidenceBackedProblems.length} problema(s) mantém rastreabilidade para evidências.` : 'O problema validado precisa manter as evidências que sustentaram a validação.', complete: evidenceBackedProblems.length > 0, action: { target: 'context', contextKind: 'problem', label: 'Revisar Problemas' } }),
  ];

  const definitionCriteria = [
    criterion({ id: 'definition.promise-outcome', area: 'definition', label: 'Promessa e outcome', detail: text(definition.promise) && text(definition.outcome) ? 'O valor prometido e o resultado esperado estão explícitos.' : 'Defina o que o serviço promete e qual resultado deve produzir.', complete: !!text(definition.promise) && !!text(definition.outcome), action: { target: 'definition', label: 'Completar proposta' } }),
    criterion({ id: 'definition.scope', area: 'definition', label: 'Escopo delimitado', detail: text(definition.scope) ? 'O escopo está registrado.' : 'Defina o que faz parte do serviço.', complete: !!text(definition.scope), action: { target: 'definition', label: 'Definir escopo' } }),
    criterion({ id: 'definition.boundaries', area: 'definition', label: 'Início e fim definidos', detail: text(definition.startBoundary) && text(definition.endBoundary) ? 'Os limites do serviço estão explícitos.' : 'Defina onde o serviço começa e onde termina.', complete: !!text(definition.startBoundary) && !!text(definition.endBoundary), action: { target: 'definition', label: 'Definir limites' } }),
    criterion({ id: 'definition.principles', area: 'definition', label: 'Princípios de desenho', detail: definition.principles.length ? `${definition.principles.length} princípio(s) registrado(s).` : 'Registre as regras que devem orientar decisões de desenho.', complete: definition.principles.length > 0, action: { target: 'definition', label: 'Adicionar princípios' } }),
    criterion({ id: 'definition.success', area: 'definition', label: 'Critério de sucesso', detail: definition.successCriteria.length ? `${definition.successCriteria.length} critério(s) de sucesso.` : 'Defina como saberemos se o serviço funciona.', complete: definition.successCriteria.length > 0, action: { target: 'definition', label: 'Definir sucesso' } }),
    criterion({ id: 'definition.traceability', area: 'definition', label: 'Rastreabilidade ao Discovery', detail: validReferences(graph, 'persona', definition.personaIds) && validReferences(graph, 'problem', definition.problemIds) && validReferences(graph, 'evidence', definition.evidenceIds) ? 'Definition referencia Persona, Problema e Evidência canônicos.' : 'Ligue a definição a Persona, Problema e Evidência do Discovery.', complete: validReferences(graph, 'persona', definition.personaIds) && validReferences(graph, 'problem', definition.problemIds) && validReferences(graph, 'evidence', definition.evidenceIds), action: { target: 'definition', label: 'Conectar contexto' } }),
  ];

  const structureCriteria = [
    criterion({ id: 'structure.frame', area: 'structure', label: 'Service Frame criado', detail: frameBoard ? `Frame “${frameBoard.name}” encontrado.` : 'Crie um Service Frame para estruturar o serviço.', complete: !!frameBoard, action: { target: 'service-frame', boardId: frameBoard?.id, label: frameBoard ? 'Abrir Service Frame' : 'Criar Service Frame' } }),
    criterion({ id: 'structure.stages', area: 'structure', label: 'Fluxo mínimo de etapas', detail: stages.length >= 2 ? `${stages.length} etapas estruturam o fluxo.` : 'Estruture ao menos duas etapas para representar uma transição real do serviço.', complete: stages.length >= 2, action: { target: 'service-frame', boardId: frameBoard?.id, label: 'Revisar etapas' } }),
    criterion({ id: 'structure.customer-actions', area: 'structure', label: 'Ações do cliente mapeadas', detail: stages.length ? `${customerActionCoverage}% das etapas têm ação do cliente.` : 'O frame ainda não possui etapas avaliáveis.', complete: stages.length > 0 && customerActionCoverage >= 80, action: { target: 'service-frame', boardId: frameBoard?.id, label: 'Completar ações do cliente' } }),
    criterion({ id: 'structure.visibility', area: 'structure', label: 'Frontstage e Backstage representados', detail: presentLayers.has('frontstage') && presentLayers.has('backstage') ? 'A experiência visível e a operação invisível estão representadas.' : 'Mapeie pelo menos um elemento de Frontstage e um de Backstage.', complete: presentLayers.has('frontstage') && presentLayers.has('backstage'), action: { target: 'service-frame', boardId: frameBoard?.id, label: 'Completar visibilidade' } }),
    criterion({ id: 'structure.enablement', area: 'structure', label: 'Suporte operacional representado', detail: presentLayers.has('process') && presentLayers.has('enablement') ? 'Processos e sistemas/recursos sustentam o frame.' : 'Mapeie pelo menos um Processo e um Sistema/Recurso.', complete: presentLayers.has('process') && presentLayers.has('enablement'), action: { target: 'service-frame', boardId: frameBoard?.id, label: 'Completar suporte' } }),
    criterion({ id: 'structure.coverage', area: 'structure', label: 'Cobertura estrutural mínima', detail: frameCoverage.total ? `${frameCoverage.percent}% dos blocos etapa × camada estão cobertos.` : 'Ainda não existe cobertura estrutural calculável.', complete: frameCoverage.total > 0 && frameCoverage.percent >= 60, action: { target: 'service-frame', boardId: frameBoard?.id, label: 'Fechar gaps do frame' } }),
  ];

  const sections = {
    context: section('context', 'Contexto', 'Cliente, necessidade, problema e evidência antes da solução.', contextCriteria),
    definition: section('definition', 'Definição', 'Promessa, outcome, escopo, limites e rastreabilidade.', definitionCriteria),
    structure: section('structure', 'Estrutura', 'Etapas e camadas mínimas para enxergar como o serviço funciona.', structureCriteria),
  };
  const all = [...contextCriteria, ...definitionCriteria, ...structureCriteria];
  const complete = all.filter((item) => item.complete).length;
  const total = all.length;
  const score = total ? Math.round((complete / total) * 100) : 0;
  const blockingGaps = all.filter((item) => !item.complete);
  const readyForDesign = blockingGaps.length === 0;
  const state = readyForDesign ? 'ready' : score >= 50 ? 'building' : 'blocked';

  return {
    version: 1,
    score,
    complete,
    total,
    state,
    readyForDesign,
    blockingGaps,
    nextAction: blockingGaps[0] ?? null,
    sections,
    frame: { boardId: frameBoard?.id ?? null, boardName: frameBoard?.name ?? null, stageCount: stages.length, coverage: frameCoverage.percent },
  };
}

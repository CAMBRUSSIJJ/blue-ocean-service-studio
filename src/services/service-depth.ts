import type { ServiceGraph, Stage, WhiteboardView } from '../domain/model';
import { buildEvidenceStudioReport } from './evidence-studio.ts';
import { buildServiceBlueprintReport } from './service-blueprint-studio.ts';

export type ServiceDepthComponentId = 'context' | 'journey' | 'evidence' | 'problem' | 'blueprint' | 'composition';
export type ServiceDepthComponent = {
  id: ServiceDepthComponentId;
  label: string;
  weight: number;
  score: number;
  points: number;
  detail: string;
};
export type ServiceDepthReport = {
  score: number;
  label: 'Superfície' | 'Costa' | 'Corrente' | 'Profundidade' | 'Blue Ocean';
  components: ServiceDepthComponent[];
  nextGap: ServiceDepthComponent | null;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const ratio = (done: number, total: number) => total > 0 ? clamp((done / total) * 100) : 0;
const average = (values: number[]) => values.length ? clamp(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
const entityCount = (graph: ServiceGraph, kind: string) => Object.keys(graph.entities?.[kind] ?? {}).length;
const researchEvidence = (graph: ServiceGraph) => Object.values(graph.entities?.evidence ?? {}).filter(item => item.evidencePurpose !== 'service');
const linkedStageEvidence = (stage: Stage) => Array.isArray(stage.evidenceIds) ? stage.evidenceIds.length : 0;
const meaningfulFreeBoard = (board: WhiteboardView) => {
  const items = Object.values(board.items ?? {}).filter((item) => !(item.kind === 'free' && item.shape === 'frame')).length;
  const edges = Object.keys(board.edges ?? {}).length;
  return { items, edges, score: items === 0 && edges === 0 ? 0 : items >= 3 && edges >= 1 ? 100 : items >= 2 ? 65 : 40 };
};

const journeyScore = (graph: ServiceGraph) => {
  const scores = Object.values(graph.journeys ?? {}).map((journey) => {
    const stages = journey.stageIds.map((id) => graph.stages[id]).filter((stage): stage is Stage => Boolean(stage) && !stage.archived);
    if (!stages.length) return 10;
    const actionCoverage = ratio(stages.filter((stage) => Boolean(stage.customerAction?.trim())).length, stages.length);
    const touchpointCoverage = ratio(stages.filter((stage) => (stage.touchpointIds?.length ?? 0) > 0).length, stages.length);
    const thinkingCoverage = ratio(stages.filter((stage) => Boolean(stage.thoughts?.trim()) || (stage.needIds?.length ?? 0) > 0).length, stages.length);
    const evidenceCoverage = ratio(stages.filter((stage) => linkedStageEvidence(stage) > 0 || (stage.validatedProblemIds?.length ?? 0) > 0).length, stages.length);
    const structure = stages.length >= 2 ? 100 : 45;
    return clamp(structure * .25 + actionCoverage * .30 + touchpointCoverage * .20 + thinkingCoverage * .10 + evidenceCoverage * .15);
  });
  return Math.max(0, ...scores);
};

const evidenceScore = (graph: ServiceGraph) => {
  const evidence = researchEvidence(graph);
  if (!evidence.length) return 0;
  const qualityScores = evidence.map((item) => buildEvidenceStudioReport(graph, item.id)?.qualityScore ?? 0);
  const stageLinks = Object.values(graph.stages ?? {}).reduce((sum, stage) => sum + (stage.evidenceIds ?? []).filter(id => evidence.some(item => item.id === id)).length, 0);
  const hypothesisOrProblemLinks = evidence.filter((item) => {
    const related = Array.isArray(item.relatedIds) ? item.relatedIds.length : 0;
    const hypotheses = Array.isArray(item.hypothesisIds) ? item.hypothesisIds.length : 0;
    const problems = Array.isArray(item.problemIds) ? item.problemIds.length : 0;
    return related + hypotheses + problems > 0;
  }).length;
  const useScore = clamp((stageLinks > 0 ? 50 : 0) + ratio(hypothesisOrProblemLinks, evidence.length) * .5);
  return clamp(30 + average(qualityScores) * .45 + useScore * .25);
};

const problemScore = (graph: ServiceGraph) => {
  const validated = Object.values(graph.entities?.problem ?? {}).filter((item) => item.status === 'validated');
  if (!validated.length) return 0;
  const linkedToStage = Object.values(graph.stages ?? {}).some((stage) => (stage.validatedProblemIds ?? []).some((id) => validated.some((problem) => problem.id === id)));
  const withEvidence = validated.filter((item) => (Array.isArray(item.supportingEvidenceIds) && item.supportingEvidenceIds.length > 0) || (Array.isArray(item.evidenceIds) && item.evidenceIds.length > 0)).length;
  return clamp(55 + (linkedToStage ? 20 : 0) + ratio(withEvidence, validated.length) * .25);
};

const blueprintScore = (graph: ServiceGraph) => {
  const boards = Object.values(graph.views?.whiteboards ?? {}).filter((board) => board.viewKind === 'blueprint');
  if (!boards.length) return 0;
  const scores = boards.map((board) => buildServiceBlueprintReport(graph, board.id)?.overallScore ?? 0);
  return Math.max(20, ...scores);
};

const compositionScore = (graph: ServiceGraph) => {
  const freeBoards = Object.values(graph.views?.whiteboards ?? {}).filter((board) => board.viewKind !== 'blueprint');
  if (!freeBoards.length) return 0;
  return Math.max(...freeBoards.map((board) => meaningfulFreeBoard(board).score));
};

export const buildServiceDepthReport = (graph: ServiceGraph): ServiceDepthReport => {
  const personaCount = entityCount(graph, 'persona');
  const relatedContext = entityCount(graph, 'need') + entityCount(graph, 'job') + entityCount(graph, 'pain');
  const definition = graph.service.project?.definition;
  const definitionContext = (definition?.personaIds?.length ?? 0) + (definition?.problemIds?.length ?? 0) + (definition?.evidenceIds?.length ?? 0);
  const contextScore = clamp((personaCount > 0 ? 50 : 0) + (relatedContext > 0 ? 30 : 0) + (definitionContext > 0 ? 20 : 0));

  const raw: Array<Omit<ServiceDepthComponent, 'points'>> = [
    { id: 'context', label: 'Contexto', weight: 20, score: contextScore, detail: personaCount ? `${personaCount} persona(s) · ${relatedContext} sinal(is) relacionado(s)` : 'Persona e contexto ainda não estruturados' },
    { id: 'journey', label: 'Journey', weight: 25, score: journeyScore(graph), detail: `${Object.keys(graph.journeys ?? {}).length} Journey(s) · ${Object.keys(graph.stages ?? {}).length} etapa(s)` },
    { id: 'evidence', label: 'Evidências', weight: 15, score: evidenceScore(graph), detail: `${researchEvidence(graph).length} evidência(s) de pesquisa com qualidade e uso considerados` },
    { id: 'problem', label: 'Problemas', weight: 15, score: problemScore(graph), detail: `${Object.values(graph.entities?.problem ?? {}).filter((item) => item.status === 'validated').length} problema(s) validado(s)` },
    { id: 'blueprint', label: 'Blueprint', weight: 20, score: blueprintScore(graph), detail: `${Object.values(graph.views?.whiteboards ?? {}).filter((board) => board.viewKind === 'blueprint').length} Blueprint(s) estruturado(s)` },
    { id: 'composition', label: 'Composição', weight: 5, score: compositionScore(graph), detail: `${Object.values(graph.views?.whiteboards ?? {}).filter((board) => board.viewKind !== 'blueprint').length} Whiteboard(s) livre(s)` },
  ];
  const components = raw.map((item) => ({ ...item, points: Number(((item.score / 100) * item.weight).toFixed(1)) }));
  const score = clamp(components.reduce((sum, item) => sum + item.points, 0));
  const label: ServiceDepthReport['label'] = score >= 85 ? 'Blue Ocean' : score >= 65 ? 'Profundidade' : score >= 40 ? 'Corrente' : score >= 20 ? 'Costa' : 'Superfície';
  const nextGap = [...components].filter((item) => item.score < 75).sort((a, b) => (b.weight - b.points) - (a.weight - a.points))[0] ?? null;
  return { score, label, components, nextGap };
};

export const whiteboardWorkState = (board: WhiteboardView): 'empty' | 'started' | 'structured' => {
  const { score } = meaningfulFreeBoard(board);
  return score === 0 ? 'empty' : score >= 100 ? 'structured' : 'started';
};

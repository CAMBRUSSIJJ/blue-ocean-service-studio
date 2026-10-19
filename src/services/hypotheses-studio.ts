import type { GraphEntity, Id, ServiceGraph } from '../domain/model';
import {
  buildProblemEvidenceStudioReport,
  problemContextOptions,
  problemEvidenceOptions,
  updateProblemHypothesis,
  validateProblemHypothesis,
  type EvidenceStance,
  type HypothesisEvidenceLink,
  type ProblemContextKind,
  type ProblemContextConnection,
  type ProblemEvidenceConnection,
} from './problem-evidence-studio.ts';

export type HypothesisConfidence = 'low' | 'medium' | 'high';
export type HypothesisRisk = 'low' | 'medium' | 'high';

export type HypothesisProfileDraft = {
  title: string;
  description: string;
  premise: string;
  expectedBehavior: string;
  validationCriterion: string;
  impactIfWrong: string;
  confidence: HypothesisConfidence;
  riskLevel: HypothesisRisk;
};

export type HypothesisStudioReport = {
  hypothesis: GraphEntity;
  draft: HypothesisProfileDraft;
  contextConnections: ProblemContextConnection[];
  evidenceConnections: ProblemEvidenceConnection[];
  contextCounts: Record<ProblemContextKind, number>;
  supportCount: number;
  contradictionCount: number;
  neutralCount: number;
  highConfidenceContradictionCount: number;
  validationChecks: Array<{ id: string; label: string; complete: boolean; detail: string }>;
  validationScore: number;
  readyToValidate: boolean;
  status: 'hypothesis' | 'testing' | 'validated';
  validatedProblem: GraphEntity | null;
};

const validConfidence = new Set<HypothesisConfidence>(['low', 'medium', 'high']);
const validRisk = new Set<HypothesisRisk>(['low', 'medium', 'high']);
const titleOf = (entity: GraphEntity) => String(entity.title ?? entity.name ?? '');
const descriptionOf = (entity: GraphEntity) => String(entity.description ?? '');

export const hypothesisProfileFromEntity = (entity: GraphEntity): HypothesisProfileDraft => ({
  title: titleOf(entity),
  description: descriptionOf(entity),
  premise: String(entity.premise ?? ''),
  expectedBehavior: String(entity.expectedBehavior ?? ''),
  validationCriterion: String(entity.validationCriterion ?? ''),
  impactIfWrong: String(entity.impactIfWrong ?? entity.impact ?? ''),
  confidence: validConfidence.has(entity.confidence as HypothesisConfidence) ? entity.confidence as HypothesisConfidence : 'medium',
  riskLevel: validRisk.has(entity.riskLevel as HypothesisRisk) ? entity.riskLevel as HypothesisRisk : 'medium',
});

export function buildHypothesisStudioReport(graph: ServiceGraph, hypothesisId: Id): HypothesisStudioReport | null {
  const core = buildProblemEvidenceStudioReport(graph, hypothesisId);
  if (!core) return null;
  const draft = hypothesisProfileFromEntity(core.hypothesis);
  const contextCounts: Record<ProblemContextKind, number> = { persona: 0, need: 0, job: 0, pain: 0 };
  for (const connection of core.contextConnections) contextCounts[connection.kind] += 1;

  const checks = [
    { id: 'statement', label: 'Hipótese clara e refutável', complete: Boolean(draft.title.trim() && draft.description.trim()), detail: 'A afirmação descreve algo que pode ser confrontado com observação.' },
    { id: 'premise', label: 'Premissa explícita', complete: Boolean(draft.premise.trim()), detail: 'Está claro em que crença ou pressuposto a hipótese se apoia.' },
    { id: 'expected', label: 'Comportamento esperado', complete: Boolean(draft.expectedBehavior.trim()), detail: 'Existe uma consequência observável esperada caso a hipótese esteja correta.' },
    { id: 'criterion', label: 'Critério de validação', complete: Boolean(draft.validationCriterion.trim()), detail: 'Existe um critério explícito para aceitar ou rejeitar a hipótese.' },
    { id: 'pain', label: 'Dor conectada', complete: contextCounts.pain > 0, detail: 'A hipótese parte de uma fricção observada, não de uma solução presumida.' },
    { id: 'customer-context', label: 'Contexto de cliente conectado', complete: contextCounts.persona + contextCounts.need + contextCounts.job > 0, detail: 'Persona, Necessidade ou Job delimitam onde a hipótese se aplica.' },
    { id: 'evidence', label: 'Evidência relacionada', complete: core.evidenceConnections.length > 0, detail: 'Existe evidência explicitamente ligada à hipótese.' },
    { id: 'support', label: 'Suporte observável', complete: core.supportCount > 0, detail: 'Ao menos uma evidência está classificada como sustentação.' },
    { id: 'contradiction', label: 'Sem contradição forte aberta', complete: core.highConfidenceContradictionCount === 0, detail: 'Nenhuma evidência contraditória de alta confiança permanece sem resolução.' },
  ];
  const validationScore = Math.round((checks.filter((item) => item.complete).length / checks.length) * 100);

  return {
    hypothesis: core.hypothesis,
    draft,
    contextConnections: core.contextConnections,
    evidenceConnections: core.evidenceConnections,
    contextCounts,
    supportCount: core.supportCount,
    contradictionCount: core.contradictionCount,
    neutralCount: core.neutralCount,
    highConfidenceContradictionCount: core.highConfidenceContradictionCount,
    validationChecks: checks,
    validationScore,
    readyToValidate: checks.every((item) => item.complete),
    status: core.status,
    validatedProblem: core.validatedProblem,
  };
}

export function updateHypothesisProfile(input: {
  graph: ServiceGraph;
  hypothesisId: Id;
  draft: HypothesisProfileDraft;
  contextIds: Id[];
  evidenceLinks: HypothesisEvidenceLink[];
  now?: string;
}): ServiceGraph {
  const now = input.now ?? new Date().toISOString();
  const base = updateProblemHypothesis({
    graph: input.graph,
    hypothesisId: input.hypothesisId,
    draft: { title: input.draft.title, description: input.draft.description, impact: input.draft.impactIfWrong },
    contextIds: input.contextIds,
    evidenceLinks: input.evidenceLinks,
    now,
  });
  const existing = base.entities?.problemHypothesis?.[input.hypothesisId];
  if (!existing) return base;
  return {
    ...base,
    service: { ...base.service, updatedAt: now },
    entities: {
      ...base.entities,
      problemHypothesis: {
        ...(base.entities?.problemHypothesis ?? {}),
        [input.hypothesisId]: {
          ...existing,
          premise: input.draft.premise.trim(),
          expectedBehavior: input.draft.expectedBehavior.trim(),
          validationCriterion: input.draft.validationCriterion.trim(),
          impactIfWrong: input.draft.impactIfWrong.trim(),
          confidence: input.draft.confidence,
          riskLevel: input.draft.riskLevel,
          hypothesisVersion: 2,
          updatedAt: now,
        },
      },
    },
  };
}

export const hypothesisContextOptions = problemContextOptions;
export const hypothesisEvidenceOptions = problemEvidenceOptions;
export const validateHypothesisAsProblem = validateProblemHypothesis;
export type { EvidenceStance, HypothesisEvidenceLink, ProblemContextKind };

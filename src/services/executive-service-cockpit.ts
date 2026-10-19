import type { ServiceGraph } from '../domain/model';
import { buildServiceHealthReport } from './service-health.ts';
import { buildImprovementBacklogReport } from './improvement-backlog.ts';
import { buildImprovementPortfolioReport } from './improvement-portfolio.ts';
import { buildServiceOutcomesReport } from './service-outcomes.ts';
import { buildServiceGovernanceReport } from './service-governance.ts';
import { buildServiceOperationsBridgeReport } from './service-operations-bridge.ts';

export type ExecutiveCockpitSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ExecutiveCockpitStatus = 'healthy' | 'attention' | 'critical';
export type ExecutiveCockpitArea = 'health' | 'priorities' | 'portfolio' | 'outcomes' | 'governance' | 'operations';
export type ExecutiveCockpitAction = {
  id: string;
  area: ExecutiveCockpitArea;
  severity: ExecutiveCockpitSeverity;
  priority: number;
  title: string;
  detail: string;
  targetTab: 'improvement' | 'portfolio' | 'outcomes' | 'governance' | 'operations' | 'overview';
  targetId?: string;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
const severityRank: Record<ExecutiveCockpitSeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const statusFor = (score: number): ExecutiveCockpitStatus => score >= 80 ? 'healthy' : score >= 60 ? 'attention' : 'critical';
const priorityForBand = (band: string) => band === 'critical' ? 98 : band === 'high' ? 86 : band === 'medium' ? 68 : 48;
const severityForBand = (band: string): ExecutiveCockpitSeverity => band === 'critical' ? 'critical' : band === 'high' ? 'high' : band === 'medium' ? 'medium' : 'low';

export function buildExecutiveServiceCockpitReport(graph: ServiceGraph, now = new Date().toISOString()) {
  const health = buildServiceHealthReport(graph);
  const priorities = buildImprovementBacklogReport(graph);
  const portfolio = buildImprovementPortfolioReport(graph, now);
  const outcomes = buildServiceOutcomesReport(graph, now);
  const governance = buildServiceGovernanceReport(graph, now);
  const operations = buildServiceOperationsBridgeReport(graph, now);

  const activeInitiatives = portfolio.initiatives.filter((item) => item.status !== 'implemented');
  const deliveryScore = portfolio.counts.initiatives
    ? clamp((portfolio.averageProgress * .55) + ((1 - (portfolio.counts.overdue / Math.max(1, activeInitiatives.length))) * 100 * .25) + ((1 - (portfolio.counts.blocked / Math.max(1, activeInitiatives.length))) * 100 * .20))
    : 0;

  const riskPenalty =
    priorities.counts.critical * 14 + priorities.counts.high * 7 +
    portfolio.counts.overdue * 9 + portfolio.counts.blocked * 5 +
    governance.counts.overdue * 8 + governance.counts.pendingApproval * 4 + governance.counts.actionRequired * 6 +
    operations.counts.errors * 10 + operations.counts.missingTargets * 6 +
    outcomes.counts.offTarget * 5 + outcomes.counts.implementedWithoutProof * 5;
  const riskControlScore = clamp(100 - Math.min(100, riskPenalty));

  const dimensions = [
    { id: 'health' as const, label: 'Saúde do serviço', score: health.score, weight: 30, detail: health.status.label },
    { id: 'outcomes' as const, label: 'Resultados', score: outcomes.outcomeScore, weight: 20, detail: `${outcomes.counts.onTarget}/${outcomes.counts.metrics} métricas na meta` },
    { id: 'governance' as const, label: 'Governança', score: governance.governanceScore, weight: 15, detail: `${governance.coverage}% com owner` },
    { id: 'operations' as const, label: 'Operação conectada', score: operations.healthScore, weight: 15, detail: `${operations.coveragePercent}% de cobertura` },
    { id: 'portfolio' as const, label: 'Execução da melhoria', score: deliveryScore, weight: 10, detail: `${portfolio.averageProgress}% de progresso médio` },
    { id: 'priorities' as const, label: 'Risco & atenção', score: riskControlScore, weight: 10, detail: `${priorities.counts.critical} críticos · ${priorities.counts.high} altos` },
  ];
  const executiveScore = clamp(dimensions.reduce((sum, item) => sum + item.score * item.weight, 0) / dimensions.reduce((sum, item) => sum + item.weight, 0));

  const actions: ExecutiveCockpitAction[] = [];
  for (const item of priorities.activeProblems.slice(0, 8)) {
    if (!['critical','high','medium'].includes(item.band)) continue;
    actions.push({ id: `problem:${item.id}`, area: 'priorities', severity: severityForBand(item.band), priority: priorityForBand(item.band), title: item.title, detail: `Problema ${item.band === 'critical' ? 'crítico' : item.band === 'high' ? 'de alta prioridade' : 'prioritário'} · score ${item.score}`, targetTab: 'improvement', targetId: item.id });
  }
  for (const item of portfolio.initiatives.filter((row) => row.overdue || row.blocked).slice(0, 8)) {
    actions.push({ id: `initiative:${item.id}`, area: 'portfolio', severity: item.overdue ? 'high' : 'medium', priority: item.overdue ? 88 : 73, title: item.title, detail: item.overdue ? `Iniciativa atrasada${item.targetDate ? ` · prazo ${item.targetDate}` : ''}` : `Bloqueada por ${item.blockedBy.length} dependência(s)`, targetTab: 'portfolio', targetId: item.id });
  }
  for (const item of outcomes.metrics.filter((row) => row.status === 'off_target').slice(0, 8)) {
    actions.push({ id: `metric:${item.id}`, area: 'outcomes', severity: 'high', priority: 84, title: String(item.title || item.name || item.id), detail: `Métrica fora da meta${item.current === undefined ? '' : ` · atual ${item.current}${item.unit ? ` ${item.unit}` : ''}`}`, targetTab: 'outcomes', targetId: item.id });
  }
  for (const item of outcomes.initiativeOutcomes.filter((row) => row.implementedWithoutProof).slice(0, 8)) {
    actions.push({ id: `proof:${item.id}`, area: 'outcomes', severity: 'medium', priority: 76, title: item.title, detail: 'Iniciativa implementada sem prova mensurável de resultado.', targetTab: 'outcomes', targetId: item.id });
  }
  for (const item of governance.records.filter((row) => row.overdue || row.approvalIssue || row.health === 'action_required').slice(0, 8)) {
    const critical = item.overdue && item.health === 'action_required';
    actions.push({ id: `governance:${item.id}`, area: 'governance', severity: critical ? 'high' : 'medium', priority: critical ? 87 : 75, title: item.targetLabel, detail: item.overdue ? 'Revisão de governança vencida.' : item.approvalIssue ? 'Aprovação de governança pendente.' : 'Governança requer ação.', targetTab: 'governance', targetId: item.id });
  }
  for (const item of operations.bindings.filter((row) => row.status === 'error' || !row.targetActive).slice(0, 8)) {
    actions.push({ id: `operations:${item.id}`, area: 'operations', severity: item.status === 'error' ? 'high' : 'medium', priority: item.status === 'error' ? 90 : 74, title: item.targetLabel, detail: item.status === 'error' ? 'Vínculo operacional em erro.' : 'Alvo operacional não está mais disponível.', targetTab: 'operations', targetId: item.id });
  }
  actions.sort((a,b) => b.priority - a.priority || severityRank[b.severity] - severityRank[a.severity] || a.title.localeCompare(b.title, 'pt-BR'));

  const topRisks = actions.filter((item) => item.severity === 'critical' || item.severity === 'high').slice(0, 6);
  const strengths = dimensions.filter((item) => item.score >= 80).sort((a,b) => b.score - a.score).slice(0, 3);
  const weakDimensions = dimensions.filter((item) => item.score < 70).sort((a,b) => a.score - b.score).slice(0, 3);
  const nowDate = now.slice(0, 10);
  const nextReview = governance.records.filter((row) => row.nextReviewAt && row.nextReviewAt >= nowDate).sort((a,b) => String(a.nextReviewAt).localeCompare(String(b.nextReviewAt)))[0];

  const executiveSummary = executiveScore >= 80
    ? 'O serviço está operacionalmente saudável. O foco executivo deve ser manter resultados, governança e melhoria contínua.'
    : executiveScore >= 60
      ? 'O serviço está funcional, mas existem pontos relevantes de atenção que exigem priorização e acompanhamento executivo.'
      : 'O serviço apresenta riscos estruturais ou operacionais importantes. Priorize os itens críticos antes de expandir a operação.';

  return {
    generatedAt: now,
    executiveScore,
    status: statusFor(executiveScore),
    executiveSummary,
    dimensions,
    actions,
    topActions: actions.slice(0, 8),
    topRisks,
    strengths,
    weakDimensions,
    health,
    priorities,
    portfolio,
    outcomes,
    governance,
    operations,
    nextReview: nextReview ? { id: nextReview.id, label: nextReview.targetLabel, at: nextReview.nextReviewAt } : null,
    counts: {
      openActions: actions.length,
      criticalActions: actions.filter((item) => item.severity === 'critical').length,
      highActions: actions.filter((item) => item.severity === 'high').length,
      activeProblems: priorities.counts.active,
      activeInitiatives: activeInitiatives.length,
      overdueInitiatives: portfolio.counts.overdue,
      metrics: outcomes.counts.metrics,
      metricsOnTarget: outcomes.counts.onTarget,
      governanceOverdue: governance.counts.overdue,
      operationsErrors: operations.counts.errors,
    },
  };
}

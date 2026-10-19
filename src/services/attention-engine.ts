import type { BenefitRecord, GraphEntity, ServiceGraph, Task } from '../domain/model';
import { buildServiceHealthReport } from './service-health';

export type AttentionSeverity = 'critical' | 'high' | 'medium' | 'low';
export type AttentionStatus = 'overdue' | 'due_soon' | 'unassigned' | 'at_risk' | 'incomplete' | 'open' | 'health_gap' | 'stale';
export type AttentionCategory = 'execution' | 'governance' | 'experience' | 'evidence' | 'operation' | 'metrics' | 'collaboration' | 'benefits';
export type AttentionActionId = 'action-plan' | 'collaboration' | 'journey' | 'intelligence' | 'benefits' | 'review' | 'research' | 'blueprint' | 'metrics';

export type AttentionItem = {
  id: string;
  ruleId: string;
  severity: AttentionSeverity;
  priority: number;
  category: AttentionCategory;
  status: AttentionStatus;
  statusLabel: string;
  title: string;
  detail: string;
  cause: string;
  impact: string;
  owner?: string;
  dueDate?: string;
  targetCount: number;
  recommendation: string;
  actionId: AttentionActionId;
  actionLabel: string;
};

export type AttentionReport = {
  generatedAt: string;
  items: AttentionItem[];
  top: AttentionItem | null;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    overdue: number;
    unassigned: number;
  };
};

const DAY = 86_400_000;
const text = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const dateAtEndOfDay = (value?: string) => {
  if (!value) return null;
  const ts = new Date(`${value}T23:59:59`).getTime();
  return Number.isNaN(ts) ? null : ts;
};
const daysUntil = (value?: string, now = Date.now()) => {
  const ts = dateAtEndOfDay(value);
  if (ts == null) return null;
  return Math.ceil((ts - now) / DAY);
};
const oldestDue = (tasks: Task[]) => tasks.map((task) => task.dueDate).filter(Boolean).sort()[0];
const ownerSummary = (values: Array<string | undefined>) => {
  const owners = [...new Set(values.filter(text).map((item) => String(item).trim()))];
  if (!owners.length) return undefined;
  if (owners.length === 1) return owners[0];
  return `${owners.length} responsáveis`;
};
const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

function push(items: AttentionItem[], item: AttentionItem) {
  items.push({ ...item, priority: Math.max(1, Math.min(100, Math.round(item.priority))) });
}

export function buildAttentionReport(graph: ServiceGraph, now = Date.now()): AttentionReport {
  const items: AttentionItem[] = [];
  const tasks = Object.values(graph.tasks);
  const openTasks = tasks.filter((task) => task.status !== 'done');
  const overdueTasks = openTasks.filter((task) => {
    const days = daysUntil(task.dueDate, now);
    return days != null && days < 0;
  });
  const ownerlessTasks = openTasks.filter((task) => !text(task.owner));
  const opportunities = Object.values(graph.opportunities);
  const ownerlessOpportunities = opportunities.filter((item) => !text(item.owner));
  const journeys = Object.values(graph.journeys).filter((item) => item.status !== 'archived');
  const ownerlessJourneys = journeys.filter((item) => !text(item.owner));
  const incompleteStages = Object.values(graph.stages).filter((stage) => !stage.archived && (!text(stage.customerAction) || !stage.touchpointIds.length));
  const openComments = (graph.service.collaboration?.comments ?? []).filter((item) => item.status === 'open');
  const benefits = Object.values(graph.entities?.benefit ?? {}) as BenefitRecord[];
  const atRiskBenefits = benefits.filter((item) => item.status === 'at_risk');
  const health = buildServiceHealthReport(graph);

  if (overdueTasks.length) {
    const maxDaysLate = Math.max(...overdueTasks.map((task) => Math.abs(daysUntil(task.dueDate, now) ?? 0)));
    const severity: AttentionSeverity = maxDaysLate >= 14 || overdueTasks.length >= 3 ? 'critical' : 'high';
    push(items, {
      id: 'execution:overdue-tasks', ruleId: 'task.overdue', severity,
      priority: severity === 'critical' ? 100 : 94,
      category: 'execution', status: 'overdue', statusLabel: 'Vencido',
      title: plural(overdueTasks.length, 'ação atrasada', 'ações atrasadas'),
      detail: maxDaysLate > 0 ? `Há compromissos vencidos há até ${maxDaysLate} dias.` : 'Há compromissos vencidos no plano.',
      cause: 'Uma ou mais ações abertas ultrapassaram a data de entrega sem conclusão.',
      impact: 'Atrasos reduzem a previsibilidade da execução e podem bloquear oportunidades dependentes.',
      owner: ownerSummary(overdueTasks.map((task) => task.owner)), dueDate: oldestDue(overdueTasks), targetCount: overdueTasks.length,
      recommendation: 'Repriorize as ações, confirme responsáveis e registre uma nova data quando necessário.',
      actionId: 'action-plan', actionLabel: 'Revisar ações',
    });
  }

  if (atRiskBenefits.length) {
    const due = atRiskBenefits.map((item) => item.nextReviewAt).filter(Boolean).sort()[0];
    push(items, {
      id: 'benefits:at-risk', ruleId: 'benefit.at_risk', severity: 'critical', priority: 98,
      category: 'benefits', status: 'at_risk', statusLabel: 'Em risco',
      title: plural(atRiskBenefits.length, 'benefício em risco', 'benefícios em risco'),
      detail: 'A realização esperada está sinalizada como em risco.',
      cause: 'Há benefícios com status at_risk no Service Graph.',
      impact: 'O valor esperado do serviço pode não se materializar mesmo com a entrega das iniciativas.',
      owner: ownerSummary(atRiskBenefits.map((item) => item.owner)), dueDate: due, targetCount: atRiskBenefits.length,
      recommendation: 'Revise hipótese, métrica, baseline, owner e ações de recuperação do benefício.',
      actionId: 'benefits', actionLabel: 'Revisar benefícios',
    });
  }

  const reviewDates = [graph.service.operatingReview?.nextReviewAt, ...journeys.map((item) => item.nextReviewAt)].filter(Boolean) as string[];
  const nextReview = [...reviewDates].sort()[0];
  const reviewDelta = daysUntil(nextReview, now);
  if (nextReview && reviewDelta != null && reviewDelta < 0) {
    const daysLate = Math.abs(reviewDelta);
    push(items, {
      id: 'governance:review-overdue', ruleId: 'review.overdue', severity: daysLate >= 7 ? 'critical' : 'high', priority: daysLate >= 7 ? 97 : 92,
      category: 'governance', status: 'overdue', statusLabel: 'Revisão vencida',
      title: 'Revisão operacional vencida', detail: `A próxima revisão está atrasada há ${daysLate} ${daysLate === 1 ? 'dia' : 'dias'}.`,
      cause: 'A cadência de governança possui uma data de revisão anterior à data atual.',
      impact: 'Decisões, riscos e compromissos podem permanecer sem atualização de governança.',
      owner: graph.service.operatingReview?.owner, dueDate: nextReview, targetCount: 1,
      recommendation: 'Abra a revisão, atualize sinais e registre decisões e compromissos.',
      actionId: 'review', actionLabel: 'Abrir revisão',
    });
  } else if (nextReview && reviewDelta != null && reviewDelta <= 7) {
    push(items, {
      id: 'governance:review-due', ruleId: 'review.due_soon', severity: 'medium', priority: 72,
      category: 'governance', status: 'due_soon', statusLabel: 'Próxima revisão',
      title: reviewDelta === 0 ? 'Revisão operacional hoje' : `Revisão operacional em ${reviewDelta} dias`,
      detail: 'Prepare sinais, decisões e compromissos para a próxima revisão.',
      cause: 'A data da próxima revisão está dentro da janela de sete dias.',
      impact: 'Chegar à revisão sem contexto reduz a qualidade das decisões e da priorização.',
      owner: graph.service.operatingReview?.owner, dueDate: nextReview, targetCount: 1,
      recommendation: 'Confirme agenda, gaps de saúde, owners e itens que exigem decisão.',
      actionId: 'review', actionLabel: 'Preparar revisão',
    });
  }

  if (ownerlessOpportunities.length) {
    const severity: AttentionSeverity = ownerlessOpportunities.length >= 3 ? 'high' : 'medium';
    push(items, {
      id: 'governance:opportunity-owner', ruleId: 'opportunity.owner_missing', severity, priority: severity === 'high' ? 88 : 76,
      category: 'governance', status: 'unassigned', statusLabel: 'Sem owner',
      title: plural(ownerlessOpportunities.length, 'oportunidade sem responsável', 'oportunidades sem responsável'),
      detail: 'Oportunidades sem owner tendem a ficar sem decisão ou execução.',
      cause: 'O campo owner está vazio em oportunidades do Service Graph.',
      impact: 'Melhorias podem perder prioridade, prazo e acompanhamento até virarem trabalho executável.',
      targetCount: ownerlessOpportunities.length,
      recommendation: 'Defina um owner e confirme impacto, esforço e próximo passo para cada oportunidade.',
      actionId: 'intelligence', actionLabel: 'Definir responsáveis',
    });
  }

  if (ownerlessTasks.length) {
    push(items, {
      id: 'execution:task-owner', ruleId: 'task.owner_missing', severity: ownerlessTasks.length >= 3 ? 'high' : 'medium', priority: ownerlessTasks.length >= 3 ? 86 : 74,
      category: 'execution', status: 'unassigned', statusLabel: 'Sem responsável',
      title: plural(ownerlessTasks.length, 'ação sem responsável', 'ações sem responsável'),
      detail: 'Há ações abertas sem ownership explícito.',
      cause: 'O campo owner está vazio em ações ainda não concluídas.',
      impact: 'A execução fica sem accountability e tende a atrasar ou depender de cobrança manual.',
      targetCount: ownerlessTasks.length,
      recommendation: 'Atribua owner e accountable às ações abertas e revise dependências.',
      actionId: 'action-plan', actionLabel: 'Atribuir ações',
    });
  }

  if (incompleteStages.length) {
    push(items, {
      id: 'experience:stage-gaps', ruleId: 'stage.incomplete', severity: incompleteStages.length >= 3 ? 'high' : 'medium', priority: incompleteStages.length >= 3 ? 84 : 73,
      category: 'experience', status: 'incomplete', statusLabel: 'Incompleto',
      title: plural(incompleteStages.length, 'etapa incompleta', 'etapas incompletas'),
      detail: 'Falta ação do cliente ou touchpoint em parte da Jornada.',
      cause: 'Etapas ativas estão sem customerAction preenchida ou sem touchpoints conectados.',
      impact: 'A leitura da experiência fica incompleta e afeta Blueprint, evidências e diagnóstico.',
      targetCount: incompleteStages.length,
      recommendation: 'Complete ação do cliente e pontos de contato antes de aprofundar oportunidades.',
      actionId: 'journey', actionLabel: 'Completar Jornada',
    });
  }

  if (ownerlessJourneys.length) {
    push(items, {
      id: 'governance:journey-owner', ruleId: 'journey.owner_missing', severity: 'medium', priority: 71,
      category: 'governance', status: 'unassigned', statusLabel: 'Sem owner',
      title: plural(ownerlessJourneys.length, 'Jornada sem owner', 'Jornadas sem owner'),
      detail: 'A governança da experiência não possui responsável explícito.',
      cause: 'Uma ou mais Jornadas ativas estão sem owner.',
      impact: 'Revisões, métricas e decisões sobre a Jornada podem ficar sem responsável.',
      targetCount: ownerlessJourneys.length,
      recommendation: 'Defina o owner de cada Jornada ativa e a cadência de revisão.',
      actionId: 'journey', actionLabel: 'Revisar Jornadas',
    });
  }

  if (openComments.length) {
    push(items, {
      id: 'collaboration:open-comments', ruleId: 'comment.open', severity: openComments.length >= 5 ? 'medium' : 'low', priority: openComments.length >= 5 ? 67 : 54,
      category: 'collaboration', status: 'open', statusLabel: 'Aberto',
      title: plural(openComments.length, 'comentário aberto', 'comentários abertos'),
      detail: 'Feedback ainda aguarda resposta ou resolução.',
      cause: 'Existem comentários de colaboração com status open.',
      impact: 'Decisões e ajustes podem ficar pendentes ou sem alinhamento entre participantes.',
      targetCount: openComments.length,
      recommendation: 'Revise os comentários abertos, responda e resolva os itens concluídos.',
      actionId: 'collaboration', actionLabel: 'Abrir comentários',
    });
  }

  const evidence = health.dimensions.find((item) => item.id === 'evidence');
  if (evidence && evidence.score < 60) {
    push(items, {
      id: 'evidence:health-gap', ruleId: 'health.evidence_low', severity: evidence.score < 40 ? 'high' : 'medium', priority: evidence.score < 40 ? 83 : 69,
      category: 'evidence', status: 'health_gap', statusLabel: 'Cobertura baixa',
      title: `Evidências em ${evidence.score}%`, detail: evidence.summary,
      cause: evidence.signals.find((signal) => signal.kind === 'gap')?.detail ?? 'A cobertura de pesquisa e evidência está abaixo do nível de atenção.',
      impact: 'Decisões podem se apoiar em hipóteses sem evidência suficiente ou contextualizada.',
      targetCount: 1,
      recommendation: 'Conecte evidências às etapas e registre fontes de pesquisa que sustentem decisões.',
      actionId: 'research', actionLabel: 'Reforçar evidências',
    });
  }

  if (health.blueprint.score < 60) {
    push(items, {
      id: 'operation:blueprint-health', ruleId: 'health.blueprint_low', severity: 'high', priority: 81,
      category: 'operation', status: 'health_gap', statusLabel: 'Blueprint crítico',
      title: `Blueprint em ${health.blueprint.score}%`, detail: health.blueprint.gaps[0] ?? 'O Blueprint possui gaps estruturais.',
      cause: 'A cobertura operacional de frontstage, backstage ou suporte está abaixo de 60%.',
      impact: 'A experiência pode estar mapeada sem clareza suficiente de como a organização a entrega.',
      targetCount: 1,
      recommendation: 'Complete as lanes operacionais e conecte processos, sistemas, recursos e responsáveis.',
      actionId: 'blueprint', actionLabel: 'Abrir Blueprint',
    });
  }

  const metrics = health.dimensions.find((item) => item.id === 'metrics');
  if (metrics && metrics.score < 50) {
    push(items, {
      id: 'metrics:health-gap', ruleId: 'health.metrics_low', severity: 'medium', priority: 66,
      category: 'metrics', status: 'health_gap', statusLabel: 'Mensuração baixa',
      title: `Métricas em ${metrics.score}%`, detail: metrics.summary,
      cause: metrics.signals.find((signal) => signal.kind === 'gap')?.detail ?? 'Métricas e vínculos de mensuração estão incompletos.',
      impact: 'Fica difícil comprovar melhoria, valor e realização de benefícios.',
      targetCount: 1,
      recommendation: 'Defina métricas, valores e vínculos com oportunidades, ações e benefícios.',
      actionId: 'metrics', actionLabel: 'Revisar métricas',
    });
  }

  const staleEvidence = (Object.values(graph.entities?.evidence ?? {}) as GraphEntity[]).filter((item) => {
    const value = typeof item.updatedAt === 'string' ? item.updatedAt : typeof item.createdAt === 'string' ? item.createdAt : undefined;
    if (!value) return false;
    const ts = new Date(value).getTime();
    return !Number.isNaN(ts) && now - ts > 90 * DAY;
  });
  if (staleEvidence.length >= 3) {
    push(items, {
      id: 'evidence:stale', ruleId: 'evidence.stale', severity: 'low', priority: 52,
      category: 'evidence', status: 'stale', statusLabel: 'Desatualizado',
      title: plural(staleEvidence.length, 'evidência antiga', 'evidências antigas'),
      detail: 'Há evidências sem atualização há mais de 90 dias.',
      cause: 'O timestamp da evidência indica ausência de atualização recente.',
      impact: 'Insights podem refletir um contexto que já mudou desde a coleta original.',
      targetCount: staleEvidence.length,
      recommendation: 'Confirme se as evidências continuam válidas ou substitua por material mais recente.',
      actionId: 'research', actionLabel: 'Revisar evidências',
    });
  }

  items.sort((a, b) => b.priority - a.priority || b.targetCount - a.targetCount || a.title.localeCompare(b.title));

  return {
    generatedAt: new Date(now).toISOString(),
    items,
    top: items[0] ?? null,
    summary: {
      total: items.length,
      critical: items.filter((item) => item.severity === 'critical').length,
      high: items.filter((item) => item.severity === 'high').length,
      medium: items.filter((item) => item.severity === 'medium').length,
      low: items.filter((item) => item.severity === 'low').length,
      overdue: items.filter((item) => item.status === 'overdue').length,
      unassigned: items.filter((item) => item.status === 'unassigned').length,
    },
  };
}

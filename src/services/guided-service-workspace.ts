export type GuidedWorkspacePhase = 'understand' | 'design' | 'validate' | 'improve' | 'operate';

export type GuidedWorkspaceTarget =
  | 'audience' | 'research' | 'ecology' | 'proposition'
  | 'journey' | 'channels' | 'blueprint' | 'whiteboard'
  | 'prototypes' | 'learning' | 'decisions'
  | 'current-future' | 'improvement' | 'portfolio' | 'outcomes'
  | 'governance' | 'operations' | 'cockpit' | 'readiness';

export type GuidedWorkspaceFacts = {
  researchReady: boolean;
  ecologyReady: boolean;
  propositionReady: boolean;
  journeys: number;
  channels: number;
  channelCoverage: number;
  blueprints: number;
  whiteboards: number;
  whiteboardObjects: number;
  prototypes: number;
  learnings: number;
  decisions: number;
  currentFutureReady: boolean;
  prioritizedProblems: number;
  initiatives: number;
  outcomesReady: boolean;
  governanceCoverage: number;
  governanceOverdue: number;
  governancePendingApproval: number;
  operationsCoverage: number;
  operationsErrors: number;
};

export type GuidedWorkspaceAction = {
  target: GuidedWorkspaceTarget;
  label: string;
};

export type GuidedWorkspaceRecommendation = GuidedWorkspaceAction & {
  phase: GuidedWorkspacePhase;
  title: string;
  reason: string;
  alternatives: GuidedWorkspaceAction[];
};

const phaseForTarget = (target: GuidedWorkspaceTarget): GuidedWorkspacePhase => {
  if (['audience','research','ecology','proposition'].includes(target)) return 'understand';
  if (['journey','channels','blueprint','whiteboard'].includes(target)) return 'design';
  if (['prototypes','learning','decisions'].includes(target)) return 'validate';
  if (['current-future','improvement','portfolio','outcomes'].includes(target)) return 'improve';
  return 'operate';
};

const make = (
  target: GuidedWorkspaceTarget,
  title: string,
  reason: string,
  label: string,
  alternatives: GuidedWorkspaceAction[] = [],
): GuidedWorkspaceRecommendation => ({ target, phase: phaseForTarget(target), title, reason, label, alternatives });

const dedupeAlternatives = (primary: GuidedWorkspaceTarget, values: GuidedWorkspaceAction[]) => {
  const seen = new Set<GuidedWorkspaceTarget>([primary]);
  return values.filter((value) => {
    if (seen.has(value.target)) return false;
    seen.add(value.target);
    return true;
  }).slice(0, 2);
};

export function buildGuidedWorkspaceRecommendation(facts: GuidedWorkspaceFacts): GuidedWorkspaceRecommendation {
  const contextual: GuidedWorkspaceAction[] = [];
  if (facts.channels > 0 && facts.channelCoverage < 100) contextual.push({ target: 'channels', label: 'Classificar canais pendentes' });
  if (facts.whiteboards > 0 && facts.whiteboardObjects === 0) contextual.push({ target: 'whiteboard', label: 'Adicionar ao Whiteboard' });
  if (!facts.researchReady) contextual.push({ target: 'research', label: 'Completar pesquisa' });
  if (!facts.propositionReady) contextual.push({ target: 'proposition', label: 'Definir proposição' });

  // Quando a experiência já existe, fechar a ponte para operação tem prioridade sobre lacunas metodológicas anteriores.
  if (facts.journeys > 0 && facts.channels > 0 && facts.blueprints === 0) {
    const recommendation = make(
      'blueprint',
      'Crie o Blueprint do serviço',
      `Você já tem ${facts.journeys} ${facts.journeys === 1 ? 'Journey' : 'Journeys'} e ${facts.channels} ${facts.channels === 1 ? 'canal' : 'canais'}. O Blueprint liga essa experiência às pessoas, processos e sistemas que a entregam.`,
      'Criar Blueprint',
    );
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }

  if (!facts.researchReady && facts.journeys === 0) {
    const recommendation = make('research', 'Comece pela pesquisa', 'Ainda faltam sinais observáveis para sustentar as decisões do serviço. Registre material, observações e evidências antes de consolidar a solução.', 'Começar pesquisa');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (!facts.ecologyReady && facts.journeys === 0) {
    const recommendation = make('ecology', 'Mapeie o ecossistema do serviço', 'Identifique atores, relações e dependências para entender quem influencia a experiência e a operação.', 'Mapear ecologia');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (!facts.propositionReady && facts.journeys === 0) {
    const recommendation = make('proposition', 'Defina a proposição de valor', 'Transforme o que foi aprendido em uma promessa explícita para o cliente e para o negócio antes de detalhar a experiência.', 'Definir proposição');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.journeys === 0) {
    const recommendation = make('journey', 'Crie a primeira Journey', 'A Journey organiza a experiência em etapas e cria a base para canais, Blueprint e validação.', 'Criar Journey');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.channels === 0 || facts.channelCoverage < 80) {
    const recommendation = make('channels', 'Complete os canais e handoffs', `A experiência já está mapeada, mas a cobertura de canais está em ${facts.channelCoverage}%. Classifique os touchpoints e revise as trocas de canal.`, 'Abrir Canais');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.blueprints === 0) {
    const recommendation = make('blueprint', 'Crie o Blueprint do serviço', 'A experiência já está mapeada. Agora conecte Frontstage, Backstage, processos e sistemas responsáveis pela entrega.', 'Criar Blueprint');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.prototypes === 0) {
    const recommendation = make('prototypes', 'Teste uma hipótese do serviço', 'O desenho já possui experiência e operação suficientes para validar uma hipótese antes de investir mais na solução.', 'Criar experimento');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.learnings === 0) {
    const recommendation = make('learning', 'Converta testes em aprendizado', 'Existem experimentos, mas os resultados ainda não foram consolidados em evidências e aprendizados reutilizáveis.', 'Gerar aprendizado');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.decisions === 0) {
    const recommendation = make('decisions', 'Registre a decisão de mudança', 'Há aprendizado disponível. Transforme-o em uma decisão explícita antes de alterar o desenho do serviço.', 'Criar decisão');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (!facts.currentFutureReady) {
    const recommendation = make('current-future', 'Compare o serviço atual com o futuro', 'Separe o estado atual do estado-alvo para enxergar gaps antes de iniciar a transformação.', 'Criar comparação');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.prioritizedProblems === 0) {
    const recommendation = make('improvement', 'Priorize os problemas do serviço', 'Os gaps já podem ser transformados em prioridades explícitas por impacto, frequência, esforço, risco e urgência.', 'Abrir Prioridades');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.initiatives === 0) {
    const recommendation = make('portfolio', 'Transforme prioridade em iniciativa', 'Há problemas priorizados, mas ainda não existe uma iniciativa responsável por executar a melhoria.', 'Criar iniciativa');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (!facts.outcomesReady) {
    const recommendation = make('outcomes', 'Defina como provar o resultado', 'Existem iniciativas em andamento. Conecte métricas, baseline e meta para verificar se a mudança realmente melhorou o serviço.', 'Configurar resultados');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.governanceCoverage < 80 || facts.governanceOverdue > 0 || facts.governancePendingApproval > 0) {
    const recommendation = make('governance', 'Feche a governança do serviço', 'Defina owners, revisões e aprovações para reduzir componentes sem responsabilidade ou revisão em dia.', 'Configurar governança');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }
  if (facts.operationsCoverage < 80 || facts.operationsErrors > 0) {
    const recommendation = make('operations', 'Conecte o desenho à operação', 'A governança está avançada. Agora conecte touchpoints, fluxos, processos e métricas aos sistemas e rotinas que executam o serviço.', 'Mapear operação');
    return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
  }

  const recommendation = make('cockpit', 'Acompanhe o serviço em operação', 'As capacidades principais estão estruturadas. Use o Cockpit para acompanhar riscos, resultados, governança e execução contínua.', 'Abrir Cockpit');
  return { ...recommendation, alternatives: dedupeAlternatives(recommendation.target, contextual) };
}

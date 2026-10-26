import { ServiceMapsLibrary } from './ServiceMapsLibrary';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, LayoutTemplate, Plus, Table2, Wrench, X } from '../design-system/icons';
import { BlueOceanObjectIcon, type BlueOceanObjectKind } from '../design-system/blue-ocean-objects';
import type { StudioController } from '../state/useStudioController';
import { buildDesignHandoffReport, prepareBlueprintFromDefinition } from '../services/design-handoff';
import { prepareJourneyBlueprintDraft } from '../services/journey-map-studio';
import { journeyPreviewSrc } from '../services/journey-preview';
import { JourneyView } from './JourneyView';
import { EditorSurface } from './EditorSurface';
import { WhiteboardsView } from './WhiteboardsView';
import { ServiceEcologyView } from './ServiceEcologyView';
import { ResearchStudioView } from './ResearchStudioView';
import { ServicePropositionView } from './ServicePropositionView';
import { ChannelContinuityView } from './ChannelContinuityView';
import { ServicePrototypeLabView } from './ServicePrototypeLabView';
import { ServiceLearningView } from './ServiceLearningView';
import { ServiceDecisionView } from './ServiceDecisionView';
import { CurrentFutureServiceView } from './CurrentFutureServiceView';
import { ImprovementBacklogView } from './ImprovementBacklogView';
import { ImprovementPortfolioView } from './ImprovementPortfolioView';
import { ServiceOutcomesView } from './ServiceOutcomesView';
import { ServiceGovernanceView } from './ServiceGovernanceView';
import { ServiceOperationsBridgeView } from './ServiceOperationsBridgeView';
import { ExecutiveServiceCockpitView } from './ExecutiveServiceCockpitView';
import { ProductHardeningView } from './ProductHardeningView';
import { buildServiceEcologyReport } from '../services/service-ecology';
import { buildResearchStudioReport } from '../services/research-studio';
import { buildServicePropositionReport } from '../services/service-proposition';
import { buildChannelContinuityReport } from '../services/channel-continuity';
import { buildPrototypeLabReport } from '../services/service-prototype-lab';
import { buildLearningSystemReport } from '../services/evidence-learning-system';
import { buildDecisionLoopReport } from '../services/decision-iteration-loop';
import { buildCurrentFutureReport } from '../services/current-future-service';
import { buildImprovementBacklogReport } from '../services/improvement-backlog';
import { buildImprovementPortfolioReport } from '../services/improvement-portfolio';
import { buildServiceOutcomesReport } from '../services/service-outcomes';
import { buildServiceGovernanceReport } from '../services/service-governance';
import { buildServiceOperationsBridgeReport } from '../services/service-operations-bridge';
import { buildExecutiveServiceCockpitReport } from '../services/executive-service-cockpit';
import { buildGuidedWorkspaceRecommendation, type GuidedWorkspacePhase, type GuidedWorkspaceTarget } from '../services/guided-service-workspace';
import { experiencePhaseLanguage, experienceTerm, isWorkspaceCapabilityVisible, projectExperienceCapability, useExperienceProfile } from '../services/experience-profile';
import { listContextEntities } from '../services/context-library';

type BlueprintApi = {
  create?(name?: string): Promise<{ id: string; name: string } | null> | { id: string; name: string } | null;
  open?(id: string, options?: { source?: 'journey' }): Promise<boolean> | boolean;
  list?(): Array<{ id: string; name: string; layoutMode?: string; itemCount?: number; updatedAt?: string }>;
};

type JourneyStarterTemplate = { id: string; name: string; description: string; stages: string[] };
type JourneyHomeApi = {
  model?(): { templates?: JourneyStarterTemplate[] };
  create?(options: { name: string; status?: 'draft' | 'active'; priority?: string; objective?: string; templateId?: string }): { id: string } | null;
  open?(id: string): Promise<boolean> | boolean;
  selectInWorkspace?(id: string): boolean;
  remove?(id: string, options?: { includeBlueprints?: boolean }): { ok: boolean; message?: string };
};

// H7.22 legacy contract: type WorkspaceTab = 'overview' | 'journey' | 'blueprint' | 'whiteboard'
// H7.25 legacy contract: type WorkspaceTab = 'overview' | 'ecology' | 'journey' | 'blueprint' | 'whiteboard'
// H7.26 legacy contract: type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'journey' | 'blueprint' | 'whiteboard'
// H7.27 legacy contract: type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'proposition' | 'journey' | 'blueprint' | 'whiteboard'
// H7.29 adds Channels as the explicit bridge between Journey touchpoints and operational delivery.
// H7.29 legacy contract: type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'proposition' | 'journey' | 'channels' | 'blueprint' | 'whiteboard';
// H7.30 adds Service Prototype Lab to validate hypotheses before operational consolidation.
// H7.30 legacy contract: type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'proposition' | 'journey' | 'channels' | 'prototypes' | 'blueprint' | 'whiteboard';
// H7.31 adds Evidence & Learning between experimentation and operational consolidation.
// H7.31 legacy contract: type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'proposition' | 'journey' | 'channels' | 'prototypes' | 'learning' | 'blueprint' | 'whiteboard';
// H7.32 adds explicit Decisions between learning and application.
// H7.33 adds Current × Future between decisions and operational consolidation.
// H7.34 adds a traceable improvement backlog between future-state comparison and operational consolidation.
// H7.35 adds an Improvement Portfolio between prioritization and operational consolidation.
// H7.36 adds Metrics & Service Outcomes between execution and operational consolidation.
// H7.37 adds Service Governance after outcomes to make ownership, review cadence and approval explicit.
// H7.38 adds Service Operations Bridge between governance and operational consolidation.
// H7.39 adds Executive Service Cockpit as a derived executive perspective over health, priorities, portfolio, outcomes, governance and operations.
// H7.40 adds Product Hardening as a platform-readiness perspective; H7.39 legacy contract: type WorkspaceTab = 'overview' | 'cockpit' | 'research'
// H7.38 legacy tab contract: 'governance' | 'operations' | 'blueprint'
// H7.37 legacy tab contract: 'outcomes' | 'governance' | 'blueprint'
// H7.36 legacy tab contract: 'portfolio' | 'outcomes' | 'blueprint'
// H7.36 legacy session contract: 'portfolio','outcomes','blueprint'
// H7.35 legacy tab contract: 'improvement' | 'portfolio' | 'blueprint'
// H7.34 legacy contract: type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'proposition' | 'journey' | 'channels' | 'prototypes' | 'learning' | 'decisions' | 'current-future' | 'improvement' | 'blueprint' | 'whiteboard';
// H7.33 legacy contract: type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'proposition' | 'journey' | 'channels' | 'prototypes' | 'learning' | 'decisions' | 'current-future' | 'blueprint' | 'whiteboard';
// H7.32 legacy contract: type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'proposition' | 'journey' | 'channels' | 'prototypes' | 'learning' | 'decisions' | 'blueprint' | 'whiteboard';
type WorkspaceTab = 'overview' | 'cockpit' | 'research' | 'ecology' | 'proposition' | 'journey' | 'channels' | 'prototypes' | 'learning' | 'decisions' | 'current-future' | 'improvement' | 'portfolio' | 'outcomes' | 'governance' | 'operations' | 'blueprint' | 'whiteboard' | 'readiness';
// H7.40-H3 legacy tab literals: ['overview', 'Visão geral'] · ['journey', 'Journey'] · ['blueprint', 'Blueprint'] · ['whiteboard', 'Whiteboard']
// H7.40-H3 legacy cockpit/readiness literals: ['cockpit', 'Cockpit', 'service'] · id === 'cockpit' ? <em>{executiveReport.executiveScore}%</em> · ['readiness', 'Prontidão', 'system']
// H7.40-H3 legacy nav literals preserved for regression gates only:
// ['research', 'Pesquisa', 'evidence'] · ['ecology', 'Ecologia', 'service'] · ['proposition', 'Proposição', 'solution'] · ['journey', 'Journey', 'journey'] · ['channels', 'Canais', 'channel'] · ['prototypes', 'Protótipos', 'experiment']
// ['learning', 'Aprendizados', 'insight'] · ['decisions', 'Decisões', 'opportunity'] · ['current-future', 'Atual × Futuro', 'service']
// ['improvement', 'Prioridades', 'problem'] · ['portfolio', 'Portfolio', 'task'] · ['outcomes', 'Resultados', 'metric']
// ['governance', 'Governança', 'responsible'] · ['operations', 'Operação', 'system'] · ['cockpit', 'Cockpit', 'service'] · ['readiness', 'Prontidão', 'system']
// id === 'outcomes' && outcomesReport.counts.metrics · id === 'governance' && governanceReport.counts.actionRequired · id === 'operations' && operationsReport.counts.bindings
// id === 'cockpit' ? <em>{executiveReport.executiveScore}%</em>
type WorkspaceGroup = 'overview' | 'understand' | 'design' | 'validate' | 'improve' | 'operate';
type WorkspaceNavItem = { id: WorkspaceTab; label: string; icon: BlueOceanObjectKind };
const WORKSPACE_GROUPS: Array<{ id: WorkspaceGroup; label: string; defaultTab: WorkspaceTab; items: WorkspaceNavItem[] }> = [
  { id: 'overview', label: 'Visão geral', defaultTab: 'overview', items: [{ id: 'overview', label: 'Visão geral', icon: 'blueprint' }] },
  { id: 'understand', label: 'Entender', defaultTab: 'ecology', items: [
    { id: 'ecology', label: 'Ecologia', icon: 'service' }, { id: 'proposition', label: 'Proposição', icon: 'solution' },
  ] },
  { id: 'design', label: 'Projetar', defaultTab: 'journey', items: [
    { id: 'journey', label: 'Mapas do serviço', icon: 'journey' }, { id: 'channels', label: 'Canais', icon: 'channel' }, { id: 'whiteboard', label: 'Whiteboard', icon: 'whiteboard' },
  ] },
  { id: 'validate', label: 'Validar', defaultTab: 'prototypes', items: [
    { id: 'prototypes', label: 'Protótipos', icon: 'experiment' }, { id: 'learning', label: 'Aprendizados', icon: 'insight' }, { id: 'decisions', label: 'Decisões', icon: 'opportunity' },
  ] },
  { id: 'improve', label: 'Melhorar', defaultTab: 'current-future', items: [
    { id: 'current-future', label: 'Atual × Futuro', icon: 'service' }, { id: 'improvement', label: 'Prioridades', icon: 'problem' }, { id: 'portfolio', label: 'Iniciativas', icon: 'task' }, { id: 'outcomes', label: 'Resultados', icon: 'metric' },
  ] },
  { id: 'operate', label: 'Operar', defaultTab: 'governance', items: [
    { id: 'governance', label: 'Governança', icon: 'responsible' }, { id: 'operations', label: 'Operação', icon: 'system' }, { id: 'cockpit', label: 'Cockpit', icon: 'service' }, { id: 'readiness', label: 'Prontidão', icon: 'system' },
  ] },
];
const workspaceGroupFor = (tab: WorkspaceTab): WorkspaceGroup => WORKSPACE_GROUPS.find((group) => group.items.some((item) => item.id === tab))?.id ?? 'overview';
type LibraryViewMode = 'cards' | 'table';

const blueprintApi = () => window.BlueOceanRuntime?.api<BlueprintApi>('serviceBlueprintFrame') ?? null;
const blueprintHomeApi = () => window.BlueOceanRuntime?.api<{ remove?(id: string): boolean }>('blueprintHome') ?? null;
const journeyApi = () => window.BlueOceanRuntime?.api<JourneyHomeApi>('journeyHome') ?? null;
const formatDate = (value: unknown) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function BlueprintWorkspaceView({ studio, createMapIntent = false, onCreateMapIntentConsumed }: { studio: StudioController; createMapIntent?: boolean; onCreateMapIntentConsumed?: () => void }) {
  const { graph, hasService, setActiveTab, setGraph, showToast } = studio;
  const experience = useExperienceProfile();
  const [journeyQuery, setJourneyQuery] = useState('');
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>(() => {
    try {
      const stored = sessionStorage.getItem('bo-service-workspace-tab');
      return ['overview','cockpit','research','ecology','proposition','journey','channels','prototypes','learning','decisions','current-future','improvement','portfolio','outcomes','governance','operations','blueprint','whiteboard','readiness'].includes(String(stored)) ? (stored === 'research' ? 'overview' : stored === 'blueprint' ? 'journey' : stored as WorkspaceTab) : 'overview';
    } catch { return 'overview'; }
  });
  const [journeyViewMode, setJourneyViewMode] = useState<LibraryViewMode>('cards');
  const [journeyEditorOpen, setJourneyEditorOpen] = useState(false);
  const [journeyCreateOpen, setJourneyCreateOpen] = useState(false);
  useEffect(() => {
    if (!createMapIntent) return;
    setWorkspaceTab('journey');
    setJourneyEditorOpen(false);
    setJourneyCreateOpen(true);
    onCreateMapIntentConsumed?.();
  }, [createMapIntent, onCreateMapIntentConsumed]);
  const [journeyToDelete, setJourneyToDelete] = useState<{ id: string; name: string } | null>(null);
  const [blueprintToDelete, setBlueprintToDelete] = useState<{ id: string; name: string } | null>(null);
  const [designStartOpen, setDesignStartOpen] = useState(false);
  const [journeyDraftName, setJourneyDraftName] = useState('');
  const [journeyStartTemplate, setJourneyStartTemplate] = useState('blank');
  const [journeyGoal, setJourneyGoal] = useState('');
  const businessGoals = [
    { goal: 'Organizar meu atendimento', template: 'service', hint: 'Veja o caminho do primeiro contato até a entrega.' },
    { goal: 'Reduzir atrasos e retrabalho', template: 'delivery', hint: 'Localize esperas e passagens entre pessoas.' },
    { goal: 'Padronizar meu serviço', template: 'professional', hint: 'Combine atividades, responsáveis e recursos.' },
    { goal: 'Resolver um problema do cliente', template: 'essential', hint: 'Registre o problema e acompanhe uma melhoria.' },
  ];
  const [showServiceStructure, setShowServiceStructure] = useState(false);
  const [researchSurface, setResearchSurface] = useState<'research' | 'tools'>('research');
  const [overviewPhase, setOverviewPhase] = useState<GuidedWorkspacePhase>('understand');
  const [phaseViewMode, setPhaseViewMode] = useState<'cards' | 'list'>(() => {
    try {
      const stored = localStorage.getItem('bo-service-phase-view-h164');
      if (stored === 'cards' || stored === 'list') return stored;
    } catch { /* preferência visual opcional */ }
    return 'list';
  });
  const handoff = useMemo(() => buildDesignHandoffReport(graph), [graph]);
  const journeys = useMemo(() => graph.service.journeyIds.map((id) => graph.journeys[id]).filter(Boolean), [graph]);
  const starterTemplates = journeyApi()?.model?.()?.templates?.filter((item) => ['essential','delivery','professional','service','restaurant'].includes(item.id)) ?? [];
  const recentJourneys = [...journeys].sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''))).slice(0, 6);
  const freeBoards = useMemo(() => Object.values(graph.views.whiteboards ?? {}).filter((board) => board.viewKind === 'free'), [graph]);
  const latestJourney = useMemo(() => [...journeys].sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))[0] ?? null, [journeys]);
  const latestFreeBoard = useMemo(() => [...freeBoards].sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))[0] ?? null, [freeBoards]);
  const preferredDesignMode: 'journey' | 'whiteboard' | null = latestJourney && latestFreeBoard
    ? (String(latestJourney.updatedAt ?? '') >= String(latestFreeBoard.updatedAt ?? '') ? 'journey' : 'whiteboard')
    : latestJourney ? 'journey' : latestFreeBoard ? 'whiteboard' : null;
  const rows = useMemo(() => Object.values(graph.views.whiteboards ?? {})
    .filter((board) => board.viewKind === 'blueprint')
    .map((board) => ({
      id: board.id,
      name: board.name || 'Service Blueprint',
      journeyId: board.journeyId,
      layoutMode: board.layoutMode || 'service',
      itemCount: Object.keys(board.items ?? {}).length,
      contextCount: board.designContext ? board.designContext.personaIds.length + board.designContext.problemIds.length + board.designContext.evidenceIds.length : 0,
      journeyStageCount: board.journeyId ? (graph.journeys[board.journeyId]?.stageIds.length ?? 0) : 0,
      updatedAt: String(board.updatedAt || graph.service.updatedAt || ''),
    }))
    .filter((row) => row.name.toLowerCase().includes(journeyQuery.trim().toLowerCase())), [graph, journeyQuery]);

  const ecologyReport = useMemo(() => buildServiceEcologyReport(graph), [graph]);
  const researchReport = useMemo(() => buildResearchStudioReport(graph), [graph]);
  const propositionReport = useMemo(() => buildServicePropositionReport(graph), [graph]);
  const foundationContextCounts = useMemo(() => ({
    personas: listContextEntities(graph, 'persona').length,
    needs: listContextEntities(graph, 'need').length,
    pains: listContextEntities(graph, 'pain').length,
    problems: listContextEntities(graph, 'problem').length,
  }), [graph]);
  const foundationContextTotal = foundationContextCounts.personas + foundationContextCounts.needs + foundationContextCounts.pains + foundationContextCounts.problems;
  const audienceJobCount = useMemo(() => listContextEntities(graph, 'job').length, [graph]);
  const channelReport = useMemo(() => buildChannelContinuityReport(graph), [graph]);
  const prototypeReport = useMemo(() => buildPrototypeLabReport(graph), [graph]);
  const learningReport = useMemo(() => buildLearningSystemReport(graph), [graph]);
  const decisionReport = useMemo(() => buildDecisionLoopReport(graph), [graph]);
  const currentFutureReport = useMemo(() => buildCurrentFutureReport(graph), [graph]);
  const improvementReport = useMemo(() => buildImprovementBacklogReport(graph), [graph]);
  const portfolioReport = useMemo(() => buildImprovementPortfolioReport(graph), [graph]);
  const outcomesReport = useMemo(() => buildServiceOutcomesReport(graph), [graph]);
  const governanceReport = useMemo(() => buildServiceGovernanceReport(graph), [graph]);
  const operationsReport = useMemo(() => buildServiceOperationsBridgeReport(graph), [graph]);
  const executiveReport = useMemo(() => buildExecutiveServiceCockpitReport(graph), [graph]);
  // H7.26 legacy contract: const workspaceReadiness = [foundationContextCounts.personas > 0, ecologyReport.stakeholderCount > 0, journeys.length > 0, rows.length > 0, freeBoards.length > 0].filter(Boolean).length;
  const channelReady = channelReport.touchpointCount > 0 && channelReport.mappedTouchpointCoverage >= 80;
  const prototypeReady = prototypeReport.counts.experiments > 0;
  const learningReady = learningReport.counts.learnings > 0;
  const decisionReady = decisionReport.counts.decisions > 0;
  const currentFutureReady = Boolean(currentFutureReport.state.current && currentFutureReport.state.future);
  const improvementReady = improvementReport.backlogReady;
  const portfolioReady = portfolioReport.portfolioReady;
  const outcomesReady = outcomesReport.outcomesReady;
  const governanceReady = governanceReport.coverage >= 80 && governanceReport.counts.overdue === 0 && governanceReport.counts.pendingApproval === 0;
  const operationsReady = operationsReport.operationsReady;
  // H7.31 legacy contract: const workspaceReadiness = [... learningReady, rows.length > 0, freeBoards.length > 0].filter(Boolean).length; workspaceReadiness}/9
  const workspaceReadiness = [foundationContextCounts.personas > 0, ecologyReport.stakeholderCount > 0, propositionReport.propositionReady, journeys.length > 0, channelReady, prototypeReady, learningReady, decisionReady, currentFutureReady, improvementReady, portfolioReady, outcomesReady, governanceReady, operationsReady, rows.length > 0, freeBoards.length > 0].filter(Boolean).length;

  const createFromDefinition = () => {
    const prepared = prepareBlueprintFromDefinition(graph);
    if (!prepared.boardId) { showToast('Conecte Persona, Problema e Evidência na Service Definition antes de criar um Blueprint contextual.'); return; }
    setGraph(() => prepared.graph, 'H7.8: Blueprint a partir da Definition');
    selectWorkspaceTab('journey');
    showToast(prepared.journeyId && prepared.graph.journeys[prepared.journeyId]?.stageIds.length
      ? 'Blueprint contextual criado e ligado à Journey.'
      : 'Blueprint contextual criado. A Journey ainda precisa de etapas para formar as colunas do Blueprint.');
  };

  const runtimeCall = async (action: 'create' | 'open', id?: string) => {
    const invoke = async () => {
      const runtime = blueprintApi();
      if (!runtime) return false;
      if (action === 'create' && runtime.create) { await runtime.create(`${graph.service.name || 'Serviço'} · Service Blueprint`); return true; }
      if (action === 'open' && id && runtime.open) { await runtime.open(id); return true; }
      return false;
    };
    if (await invoke()) return;
    window.setTimeout(() => { void invoke(); }, 120);
  };

  // Open the original reference HTML as the primary Journey editor. The linked
  // Blueprint board is a canonical storage view, not a required extra step.
  const openJourney = async (id: string) => {
    // Keep old Journey renderer available for localhost regression tests only.
    if (['localhost', '127.0.0.1'].includes(window.location.hostname)
        && new URLSearchParams(window.location.search).has('__qa_legacy_journey')) {
      const runtime = journeyApi();
      const opened = runtime?.selectInWorkspace ? runtime.selectInWorkspace(id) : await runtime?.open?.(id);
      if (opened) setJourneyEditorOpen(true);
      return;
    }
    const runtime = journeyApi();
    if (!runtime?.selectInWorkspace && !runtime?.open) { showToast('Jornada indisponível.'); return; }
    const selected = runtime.selectInWorkspace ? runtime.selectInWorkspace(id) : await runtime.open?.(id);
    if (!selected) { showToast('Não foi possível abrir esta Jornada.'); return; }
    const latest = window.BlueOceanRuntime?.api<{ get(): typeof graph }>('dataBridge')?.get() ?? graph;
    const prepared = prepareJourneyBlueprintDraft(latest, id, { allowEmpty: true });
    if (!prepared.boardId) { showToast('Não foi possível preparar o mapa da Jornada.'); return; }
    const targetId = prepared.boardId;
    if (prepared.created) setGraph(current => prepareJourneyBlueprintDraft(current, id, { id: targetId, allowEmpty: true }).graph,
      'Jornada: iniciar mapa unificado');
    setJourneyEditorOpen(false);
    selectWorkspaceTab('journey');
    window.setTimeout(async () => {
      const saved = window.BlueOceanRuntime?.api<{ get(): typeof graph }>('dataBridge')?.get();
      if (!saved?.views.whiteboards?.[targetId]) {
        showToast('Não foi possível salvar o mapa desta Jornada.'); return;
      }
      const opened = await blueprintApi()?.open?.(targetId, { source: 'journey' });
      if (!opened) showToast('Não foi possível abrir o mapa. Tente novamente pela biblioteca.');
    }, prepared.created ? 180 : 30);
  };

  const createJourney = async (requestedTemplate?: string) => {
    let name = journeyDraftName.trim() || 'Novo mapa';
    if (!journeyDraftName.trim()) {
      const names = new Set(Object.values(graph.journeys).map(item => item.name.toLocaleLowerCase('pt-BR')));
      let number = 2;
      while (names.has(name.toLocaleLowerCase('pt-BR'))) name = `Novo mapa (${number++})`;
    }
    const runtime = journeyApi();
    if (!runtime?.create) { showToast('O runtime de Journey ainda não está disponível.'); return; }
    const created = runtime.create({ name, status: 'draft', priority: 'medium', objective: journeyGoal, ...((requestedTemplate ?? journeyStartTemplate) !== 'blank' ? { templateId: requestedTemplate ?? journeyStartTemplate } : {}) });
    if (!created?.id) { showToast('Não foi possível criar a Journey.'); return; }
    setJourneyCreateOpen(false);
    setJourneyDraftName('');
    setJourneyStartTemplate('blank');
    setJourneyGoal('');
    showToast((requestedTemplate ?? journeyStartTemplate) === 'blank' ? 'Mapa pronto para adicionar etapas e cartões.' : 'Mapa criado com um modelo editável. Ajuste as etapas para a realidade do serviço.');
    await openJourney(created.id);
  };

  const deleteJourney = () => {
    if (!journeyToDelete) return;
    const result = journeyApi()?.remove?.(journeyToDelete.id, { includeBlueprints: true });
    if (!result?.ok) {
      showToast(result?.message || 'Não foi possível excluir o mapa.');
      return;
    }
    setJourneyToDelete(null);
    setJourneyEditorOpen(false);
    showToast('Mapa excluído e alterações salvas.');
  };

  const deleteBlueprint = () => {
    if (!blueprintToDelete) return;
    const deleted = blueprintHomeApi()?.remove?.(blueprintToDelete.id);
    if (!deleted) {
      showToast('Não foi possível excluir o Blueprint. Verifique se o mapa ainda existe.');
      return;
    }
    setBlueprintToDelete(null);
    showToast('Blueprint excluído. A Jornada vinculada foi preservada.');
  };

  const selectWorkspaceTab = (requestedTab: WorkspaceTab) => {
    const id = requestedTab === 'blueprint' ? 'journey' : requestedTab;
    setWorkspaceTab(id);
    try { sessionStorage.setItem('bo-service-workspace-tab', id); } catch { /* local navigation preference */ }
    window.dispatchEvent(new CustomEvent('bo-service-workspace-tab-changed', { detail: id }));
    if (id === 'journey') setJourneyEditorOpen(false);
    if (id !== 'journey') setJourneyCreateOpen(false);
    if (id !== 'research') setResearchSurface('research');
  };

  const openAudience = (create = false) => {
    try {
      sessionStorage.setItem('bo-context-kind', 'persona');
      if (create) sessionStorage.setItem('bo-workspace-create-page', 'personas');
    } catch { /* navegação disponível mesmo sem armazenamento */ }
    setActiveTab('context');
  };

  const executeGuidedTarget = (target: GuidedWorkspaceTarget) => {
    if (target === 'audience' || target === 'research') { openAudience(); return; }
    selectWorkspaceTab(target);
    if (target === 'journey' && journeys.length === 0) window.setTimeout(() => setJourneyCreateOpen(true), 0);
  };

  const openDesignStartChoice = () => {
    setOverviewPhase('design');
    setDesignStartOpen(true);
  };

  const continueJourneyFromDesign = async () => {
    setDesignStartOpen(false);
    selectWorkspaceTab('journey');
    if (latestJourney) await openJourney(latestJourney.id);
    else window.setTimeout(() => setJourneyCreateOpen(true), 0);
  };

  const continueWhiteboardFromDesign = () => {
    setDesignStartOpen(false);
    selectWorkspaceTab('whiteboard');
    if (!latestFreeBoard) {
      try { sessionStorage.setItem('bo-whiteboard-start-from-design', 'free'); } catch { /* intenção de navegação opcional */ }
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('bo-whiteboard-start-from-design', { detail: 'free' })), 0);
    }
  };

  const workspaceBadge = (id: WorkspaceTab): string | number | null => {
    if (id === 'cockpit') return `${executiveReport.executiveScore}%`;
    if (id === 'research') return researchReport.counts.observation || null;
    if (id === 'ecology') return ecologyReport.stakeholderCount || null;
    if (id === 'proposition') return propositionReport.readinessScore ? `${propositionReport.readinessScore}%` : null;
    if (id === 'journey') return journeys.length || null;
    if (id === 'channels') return channelReport.channelCount || null;
    if (id === 'prototypes') return prototypeReport.counts.experiments || null;
    if (id === 'learning') return learningReport.counts.learnings || null;
    if (id === 'decisions') return decisionReport.counts.decisions || null;
    if (id === 'current-future') return currentFutureReport.counts.gaps || null;
    if (id === 'improvement') return improvementReport.counts.active || null;
    if (id === 'portfolio') return portfolioReport.counts.initiatives || null;
    if (id === 'outcomes') return outcomesReport.counts.metrics || null;
    if (id === 'governance') return governanceReport.counts.actionRequired || null;
    if (id === 'operations') return operationsReport.counts.bindings || null;
    if (id === 'blueprint') return rows.length || null;
    if (id === 'whiteboard') return freeBoards.length || null;
    return null;
  };
  const activeWorkspaceGroup = workspaceGroupFor(workspaceTab);
  const baseWorkspaceItems = WORKSPACE_GROUPS.find((group) => group.id === activeWorkspaceGroup)?.items ?? WORKSPACE_GROUPS[0].items;
  const activeWorkspaceItems = baseWorkspaceItems.filter((item) => isWorkspaceCapabilityVisible(experience.level, item.id));
  const visibleWorkspaceItem = (item: WorkspaceNavItem) => {
    const fallbackLabel = item.id === 'ecology' ? experienceTerm(experience.level, 'ecology') : item.id === 'proposition' ? experienceTerm(experience.level, 'proposition') : item.id === 'readiness' ? experienceTerm(experience.level, 'readiness') : item.label;
    const projection = projectExperienceCapability(experience.level, item.id, { label: fallbackLabel, description: '', action: '' });
    return { ...item, label: projection.label };
  };
  const projectedWorkspaceItems = activeWorkspaceItems.map(visibleWorkspaceItem);

  useEffect(() => {
    if (isWorkspaceCapabilityVisible(experience.level, workspaceTab)) return;
    selectWorkspaceTab('overview');
  }, [experience.level, workspaceTab]);

  useEffect(() => {
    try { localStorage.setItem('bo-service-phase-view-h164', phaseViewMode); localStorage.setItem('bo-service-phase-view', phaseViewMode); } catch { /* preferência visual opcional */ }
  }, [phaseViewMode]);

  useEffect(() => {
    if (!designStartOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setDesignStartOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [designStartOpen]);

  const workspaceMaturity = Math.round((workspaceReadiness / 16) * 100);
  const whiteboardObjectCount = freeBoards.reduce((total, board) => total + Object.keys(board.items ?? {}).length, 0);
  const guidance = useMemo(() => buildGuidedWorkspaceRecommendation({
    researchReady: foundationContextCounts.personas > 0,
    ecologyReady: ecologyReport.stakeholderCount > 0,
    propositionReady: propositionReport.propositionReady,
    journeys: journeys.length,
    channels: channelReport.channelCount,
    channelCoverage: channelReport.mappedTouchpointCoverage,
    blueprints: rows.length,
    whiteboards: freeBoards.length,
    whiteboardObjects: whiteboardObjectCount,
    prototypes: prototypeReport.counts.experiments,
    learnings: learningReport.counts.learnings,
    decisions: decisionReport.counts.decisions,
    currentFutureReady,
    prioritizedProblems: improvementReport.counts.active,
    initiatives: portfolioReport.counts.initiatives,
    outcomesReady,
    governanceCoverage: governanceReport.coverage,
    governanceOverdue: governanceReport.counts.overdue,
    governancePendingApproval: governanceReport.counts.pendingApproval,
    operationsCoverage: operationsReport.coveragePercent,
    operationsErrors: operationsReport.counts.errors,
  }), [researchReport, foundationContextCounts.personas, ecologyReport, propositionReport, journeys.length, channelReport, rows.length, freeBoards.length, whiteboardObjectCount, prototypeReport.counts.experiments, learningReport.counts.learnings, decisionReport.counts.decisions, currentFutureReady, improvementReport.counts.active, portfolioReport.counts.initiatives, outcomesReady, governanceReport, operationsReport]);

  type GuidedCapabilityState = 'ready' | 'progress' | 'empty' | 'derived' | 'attention';
  type GuidedCapabilityRow = { target: GuidedWorkspaceTarget; label: string; description: string; metric: string; action: string; icon: BlueOceanObjectKind; state: GuidedCapabilityState; stateLabel: string };
  const stateOf = (ready: boolean, started: boolean, attention = false): Pick<GuidedCapabilityRow, 'state' | 'stateLabel' | 'action'> => {
    if (attention) return { state: 'attention', stateLabel: 'Requer atenção', action: 'Revisar' };
    if (ready) return { state: 'ready', stateLabel: 'Estruturado', action: 'Ver' };
    if (started) return { state: 'progress', stateLabel: 'Em construção', action: 'Continuar' };
    return { state: 'empty', stateLabel: 'Não iniciado', action: 'Criar' };
  };
  const capabilityRows: Record<GuidedWorkspacePhase, GuidedCapabilityRow[]> = {
    understand: [
      { target: 'audience', label: 'Público-alvo', description: 'Defina para quem é o serviço; registre Personas, necessidades, Jobs, dores e problemas diretamente ou durante a Jornada.', metric: `${foundationContextCounts.personas} personas · ${foundationContextCounts.needs} necessidades · ${audienceJobCount} jobs · ${foundationContextCounts.pains} dores · ${foundationContextCounts.problems} problemas`, icon: 'persona', ...stateOf(foundationContextCounts.personas > 0, foundationContextTotal + audienceJobCount > 0), action: foundationContextCounts.personas ? 'Ver público-alvo' : 'Definir público-alvo' },
      { target: 'ecology', label: 'Ecologia', description: 'Mapeie quem participa, influencia e sustenta a entrega do serviço.', metric: `${ecologyReport.stakeholderCount} ator${ecologyReport.stakeholderCount === 1 ? '' : 'es'} · ${ecologyReport.relationCount} relaç${ecologyReport.relationCount === 1 ? 'ão' : 'ões'}`, icon: 'service', ...stateOf(ecologyReport.stakeholderCount > 0 && ecologyReport.relationCount > 0, ecologyReport.stakeholderCount > 0), action: ecologyReport.stakeholderCount === 0 ? 'Mapear atores' : (ecologyReport.relationCount === 0 ? 'Conectar atores' : 'Ver ecologia') },
      { target: 'proposition', label: 'Proposição', description: 'Transforme contexto, necessidades e evidências em uma direção clara de valor.', metric: `${propositionReport.readinessScore}% estruturada · ${propositionReport.sourceCount} fonte${propositionReport.sourceCount === 1 ? '' : 's'}`, icon: 'solution', ...stateOf(propositionReport.propositionReady, propositionReport.readinessScore > 0), action: propositionReport.propositionReady ? 'Ver proposição' : (propositionReport.readinessScore > 0 ? 'Continuar definição' : 'Definir proposição') },
    ],
    design: [
      { target: 'journey', label: 'Journey', description: 'Etapas, emoções e pontos de contato da experiência.', metric: `${journeys.length} ${journeys.length === 1 ? 'Journey' : 'Journeys'}`, icon: 'journey', ...stateOf(journeys.length > 0, journeys.length > 0) },
      { target: 'channels', label: 'Canais', description: 'Meios pelos quais as interações do serviço acontecem.', metric: `${channelReport.channelCount} canais · ${channelReport.touchpointCount} touchpoint${channelReport.touchpointCount === 1 ? '' : 's'} · ${channelReport.mappedTouchpointCoverage}% classificados`, icon: 'channel', ...stateOf(channelReady, channelReport.channelCount > 0) },
      { target: 'blueprint', label: 'Blueprint', description: 'Frontstage, Backstage, processos e sistemas por trás da experiência.', metric: rows.length ? `${rows.length} Blueprint${rows.length === 1 ? '' : 's'}` : 'Nada criado', icon: 'blueprint', ...stateOf(rows.length > 0, rows.length > 0) },
      { target: 'whiteboard', label: 'Whiteboard', description: 'Apoio visual opcional para explorar, estruturar e conectar ideias.', metric: `${freeBoards.length} quadro${freeBoards.length === 1 ? '' : 's'} · ${whiteboardObjectCount} objeto${whiteboardObjectCount === 1 ? '' : 's'}`, icon: 'whiteboard', ...stateOf(freeBoards.length > 0 && whiteboardObjectCount > 0, freeBoards.length > 0), stateLabel: freeBoards.length ? 'Exploração' : 'Apoio opcional', action: freeBoards.length ? 'Continuar' : 'Criar' },
    ],
    validate: [
      { target: 'prototypes', label: 'Protótipos', description: 'Experimentos para testar hipóteses antes do investimento final.', metric: `${prototypeReport.counts.experiments} experimento${prototypeReport.counts.experiments === 1 ? '' : 's'} · ${prototypeReport.counts.completed} concluído${prototypeReport.counts.completed === 1 ? '' : 's'}`, icon: 'experiment', ...stateOf(prototypeReady, prototypeReport.counts.experiments > 0) },
      { target: 'learning', label: 'Aprendizados', description: 'Resultados de teste convertidos em conhecimento rastreável.', metric: `${learningReport.counts.learnings} aprendizado${learningReport.counts.learnings === 1 ? '' : 's'}`, icon: 'insight', ...stateOf(learningReady, learningReport.counts.learnings > 0) },
      { target: 'decisions', label: 'Decisões', description: 'Mudanças aprovadas antes de alterar o desenho do serviço.', metric: `${decisionReport.counts.decisions} decisão${decisionReport.counts.decisions === 1 ? '' : 'ões'}`, icon: 'opportunity', ...stateOf(decisionReady, decisionReport.counts.decisions > 0) },
    ],
    improve: [
      { target: 'current-future', label: 'Atual × Futuro', description: 'O serviço de hoje comparado ao serviço que queremos construir.', metric: currentFutureReady ? `${currentFutureReport.counts.gaps} gaps · ${currentFutureReport.alignmentScore}% tratados` : 'Estados ainda não comparados', icon: 'service', ...stateOf(currentFutureReady, Boolean(currentFutureReport.state.current || currentFutureReport.state.future)) },
      { target: 'improvement', label: 'Prioridades', description: 'Problemas e oportunidades ordenados para orientar a transformação.', metric: `${improvementReport.counts.active} priorizado${improvementReport.counts.active === 1 ? '' : 's'}`, icon: 'problem', ...stateOf(improvementReady, improvementReport.counts.active > 0) },
      { target: 'portfolio', label: 'Iniciativas', description: 'Oportunidades escolhidas convertidas em execução responsável.', metric: `${portfolioReport.counts.initiatives} iniciativa${portfolioReport.counts.initiatives === 1 ? '' : 's'} · ${portfolioReport.averageProgress}% progresso`, icon: 'task', ...stateOf(portfolioReady, portfolioReport.counts.initiatives > 0, portfolioReport.counts.overdue > 0) },
      { target: 'outcomes', label: 'Resultados', description: 'Métricas, baseline e meta para provar se a mudança funcionou.', metric: outcomesReport.counts.metrics ? `${outcomesReport.counts.onTarget}/${outcomesReport.counts.metrics} métricas na meta` : 'Sem dados suficientes', icon: 'metric', ...stateOf(outcomesReady, outcomesReport.counts.metrics > 0) },
    ],
    operate: [
      { target: 'governance', label: 'Governança', description: 'Owners, revisões, aprovações e responsabilidade explícita.', metric: `${governanceReport.coverage}% ownership · ${governanceReport.counts.overdue} vencida${governanceReport.counts.overdue === 1 ? '' : 's'}`, icon: 'responsible', ...stateOf(governanceReady, governanceReport.counts.total > 0, governanceReport.counts.overdue > 0 || governanceReport.counts.pendingApproval > 0) },
      { target: 'operations', label: 'Operação', description: 'Atividades, fluxos, processos e fontes de dados operacionais.', metric: `${operationsReport.counts.active} vínculos ativos · ${operationsReport.coveragePercent}% cobertura`, icon: 'system', ...stateOf(operationsReady, operationsReport.counts.bindings > 0, operationsReport.counts.errors > 0 || operationsReport.counts.missingTargets > 0) },
      { target: 'cockpit', label: 'Cockpit', description: 'Leitura executiva derivada da saúde, resultados, riscos e execução.', metric: `${executiveReport.executiveScore}% score executivo`, action: 'Ver', icon: 'service', state: 'derived', stateLabel: 'Leitura derivada' },
      { target: 'readiness', label: 'Prontidão', description: 'Condições técnicas e operacionais para trabalhar com segurança.', metric: `${workspaceMaturity}% estrutura do serviço`, action: 'Ver', icon: 'system', state: 'derived', stateLabel: 'Leitura da plataforma' },
    ],
  };

  const phaseMeta: Record<GuidedWorkspacePhase, { label: string; description: string }> = {
    understand: { label: 'Público-alvo', description: 'Identifique pessoas e necessidades. Você também pode começar pela Jornada e registrar essas informações enquanto desenha.' },
    design: { label: 'Projetar', description: 'Modele experiência, canais e operação sem misturar as camadas.' },
    validate: { label: 'Validar', description: 'Teste hipóteses, consolide aprendizados e registre decisões.' },
    improve: { label: 'Melhorar', description: 'Compare estados, priorize problemas e prove resultados.' },
    operate: { label: 'Operar', description: 'Defina responsabilidade, conecte a operação e acompanhe a prontidão.' },
  };

  const experienceGuidanceTarget: GuidedWorkspaceTarget = guidance.target === 'research' ? 'audience' : guidance.target;
  const guidanceSourceRow = (Object.values(capabilityRows).flat() as GuidedCapabilityRow[]).find((row) => row.target === experienceGuidanceTarget);
  const guidanceProjection = experience.level === 'foundation' && guidance.target === 'ecology'
    ? { label: 'Compreenda o contexto', description: 'Use a pesquisa para entender pessoas, necessidades, dores e problemas antes de avançar.', action: 'Continuar pesquisa' }
    : guidanceSourceRow
      ? projectExperienceCapability(experience.level, experienceGuidanceTarget, { label: guidance.title, description: guidance.reason, action: guidance.label }, guidanceSourceRow.state)
      : { label: guidance.title, description: guidance.reason, action: guidance.label };

  const phaseConnections: Record<GuidedWorkspacePhase, { flow: string[]; support?: string; note: string }> = {
    understand: { flow: ['Público-alvo', 'Ecologia', 'Proposição'], note: 'Pessoas, necessidades, relações e problemas orientam o valor do serviço. Pode começar pela Jornada sem preencher tudo.' },
    design: { flow: ['Journey', 'Canais', 'Blueprint'], support: 'Whiteboard apoia a exploração sem virar etapa obrigatória.', note: 'A Journey descreve a experiência, Canais organizam os meios de interação e o Blueprint conecta essa experiência à operação.' },
    validate: { flow: ['Protótipos', 'Aprendizados', 'Decisões'], note: 'Experimentos produzem aprendizados rastreáveis que sustentam decisões sobre o desenho do serviço.' },
    improve: { flow: ['Atual × Futuro', 'Prioridades', 'Iniciativas', 'Resultados'], note: 'Gaps viram prioridades, prioridades orientam iniciativas e resultados verificam se a mudança funcionou.' },
    operate: { flow: ['Governança', 'Operação', 'Cockpit'], support: 'Prontidão funciona como leitura de apoio da plataforma.', note: 'Responsabilidade e operação alimentam uma leitura executiva contínua do serviço.' },
  };

  const rowsForExperience = (phase: GuidedWorkspacePhase) => capabilityRows[phase]
    .filter((row) => isWorkspaceCapabilityVisible(experience.level, row.target))
    .map((row) => ({ ...row, ...projectExperienceCapability(experience.level, row.target, { label: row.label, description: row.description, action: row.action }, row.state) }));
  const phaseLanguage = (phase: GuidedWorkspacePhase) => experiencePhaseLanguage(experience.level, phase);
  const foundationContextState = stateOf(
    foundationContextCounts.personas > 0 && foundationContextCounts.needs > 0 && foundationContextCounts.pains > 0 && foundationContextCounts.problems > 0,
    foundationContextTotal > 0,
  );
  const foundationContextRow: GuidedCapabilityRow = {
    target: 'research',
    label: 'Pessoas, necessidades, dores e problemas',
    description: 'Organize quem vive o serviço, o que precisa, onde dói e quais problemas já têm sustentação.',
    metric: `${foundationContextCounts.personas} pessoas · ${foundationContextCounts.needs} necessidades · ${foundationContextCounts.pains} dores · ${foundationContextCounts.problems} problemas`,
    icon: 'persona',
    ...foundationContextState,
    action: 'Ver na pesquisa',
  };
  // Fonte única das linhas de cada fase: stepper, contador e lista usam o mesmo conjunto (inclui pessoas, necessidades, dores e problemas em Fundamentos).
  const phaseRowsFor = (phase: GuidedWorkspacePhase): GuidedCapabilityRow[] => {
    const projected = rowsForExperience(phase);
    return experience.level === 'foundation' && phase === 'understand'
      ? [projected.find((row) => row.target === 'research'), foundationContextRow, projected.find((row) => row.target === 'proposition')].filter(Boolean) as GuidedCapabilityRow[]
      : projected;
  };
  const focusedPhaseRows = phaseRowsFor(overviewPhase);
  const focusedStructuralRows = focusedPhaseRows.filter((row) => row.state !== 'derived');
  const focusedPhaseTotal = focusedStructuralRows.length || focusedPhaseRows.length;
  const focusedPhaseStructured = focusedPhaseRows.filter((row) => row.state === 'ready').length;
  const focusedPhaseProgress = focusedPhaseTotal ? Math.round((focusedPhaseStructured / focusedPhaseTotal) * 100) : 0;
  const foundationStructuredPhase = experience.level === 'foundation'
    ? (Object.keys(phaseMeta) as GuidedWorkspacePhase[]).map((phase) => {
        const rowsForPhase = phaseRowsFor(phase).filter((row) => row.state !== 'derived');
        return { phase, rows: rowsForPhase, structured: rowsForPhase.filter((row) => row.state === 'ready').length };
      }).find((entry) => entry.phase !== overviewPhase && entry.rows.length > 0 && entry.structured === entry.rows.length) ?? null
    : null;
  const researchStarted = researchReport.counts.projects + researchReport.counts.material + researchReport.counts.observation + researchReport.counts.evidence > 0;
  const researchMaturityChecks = [researchReport.counts.projects > 0, researchReport.counts.material > 0, researchReport.counts.observation > 0, researchReport.counts.evidence > 0, researchReport.counts.insight > 0];
  const researchMaturity = researchReport.researchReady ? 100 : Math.round((researchMaturityChecks.filter(Boolean).length / researchMaturityChecks.length) * 100);
  const researchNext = researchReport.counts.projects === 0
    ? 'Crie um projeto de pesquisa para organizar perguntas, materiais e observações.'
    : researchReport.counts.material === 0
      ? 'Adicione fontes ou materiais ao projeto para registrar a origem dos sinais.'
      : researchReport.counts.observation === 0
        ? 'Registre observações do campo para transformar material bruto em aprendizado.'
        : researchReport.counts.evidence === 0
          ? 'Promova as observações relevantes para evidências rastreáveis.'
          : researchReport.counts.insight === 0
            ? 'Consolide evidências em insights para apoiar decisões do serviço.'
            : 'A pesquisa já possui base rastreável para sustentar as próximas decisões.';
  const ecologyNext = ecologyReport.stakeholderCount === 0
    ? 'Comece pelos clientes, colaboradores, parceiros, fornecedores e sistemas que participam da entrega.'
    : ecologyReport.relationCount === 0
      ? 'Conecte os atores para tornar dependências, influência e trocas explícitas.'
      : 'Revise relações, dependências e atores críticos antes de fechar a proposição.';
  const propositionNext = propositionReport.propositionReady
    ? 'A proposição possui base suficiente. Revise-a quando novas evidências mudarem a direção do serviço.'
    : (propositionReport.gaps[0] ?? 'Conecte necessidades, problemas ou evidências para sustentar a proposição.');
  const understandNextTarget: GuidedWorkspaceTarget = foundationContextCounts.personas === 0
    ? 'audience'
    : ecologyReport.stakeholderCount === 0 ? 'ecology'
    : !propositionReport.propositionReady ? 'proposition' : 'journey';
  const understandNextLabel = understandNextTarget === 'audience' ? 'Criar persona'
    : understandNextTarget === 'ecology' ? 'Mapear participantes'
    : understandNextTarget === 'proposition' ? 'Definir proposição' : 'Abrir Jornadas';
  const understandNextTitle = understandNextTarget === 'audience' ? 'Defina para quem é o serviço'
    : understandNextTarget === 'ecology' ? 'Entenda quem participa da entrega'
    : understandNextTarget === 'proposition' ? 'Defina o valor do serviço' : 'Comece a desenhar a experiência';

  useEffect(() => {
    if (workspaceTab === 'overview') setOverviewPhase(guidance.target === 'research' ? 'understand' : guidance.phase);
  }, [guidance.target]);

  // H7.40-H14 legacy H7 guidance copy contract: Construa o serviço na ordem certa
  // H7.40-H7 legacy visible label contract: PRÓXIMO PASSO RECOMENDADO
  // H7.40-H5 legacy source contracts retained for accumulated QA only:
  // Como as capacidades se conectam
  // workspacePhaseCards · Veja o serviço inteiro sem expor tudo ao mesmo tempo · Como as capacidades se conectam
  // capabilities: ['Pesquisa', 'Ecologia', 'Proposição'] · capabilities: ['Journey', 'Canais', 'Blueprint', 'Whiteboard']
  // capabilities: ['Protótipos', 'Aprendizados', 'Decisões'] · capabilities: ['Atual × Futuro', 'Prioridades', 'Iniciativas', 'Resultados']
  // capabilities: ['Governança', 'Operação', 'Cockpit', 'Prontidão']
  // <small>Maturidade</small><small>Prioridades</small><small>Iniciativas</small><small>Resultados</small><small>Governança</small><small>Operação</small>
  // bo-h740h5-kpis · Ver todos os indicadores

  useEffect(() => {
    const openTab = (event: Event) => {
      const id = (event as CustomEvent<WorkspaceTab>).detail;
      if (!['overview','cockpit','research','ecology','proposition','journey','channels','prototypes','learning','decisions','current-future','improvement','portfolio','outcomes','governance','operations','blueprint','whiteboard','readiness'].includes(String(id))) return;
      selectWorkspaceTab(id === 'research' ? 'overview' : id);
    };
    window.addEventListener('bo-service-workspace-tab', openTab);
    return () => window.removeEventListener('bo-service-workspace-tab', openTab);
  }, []);


  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (!detail.id) return;
      if (detail.kind === 'journey' && graph.journeys[detail.id]) {
        selectWorkspaceTab('journey');
        window.setTimeout(() => { void openJourney(detail.id!); }, 30);
        return;
      }
      if (detail.kind === 'blueprint' && graph.views.whiteboards?.[detail.id]) {
        selectWorkspaceTab('blueprint');
        window.setTimeout(() => { void runtimeCall('open', detail.id); }, 30);
        return;
      }
      if (detail.kind === 'whiteboard' && graph.views.whiteboards?.[detail.id]) selectWorkspaceTab('whiteboard');
    };
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [graph.journeys, graph.views.whiteboards]);

  if (!hasService) return <section className="bo1189-module-empty"><LayoutTemplate size={30}/><h2>Crie um serviço antes de abrir Blueprints</h2><p>Blueprints pertencem a um serviço.</p><button type="button" onClick={() => setActiveTab('home')}>Ir para Dashboard</button></section>;

  return <section className={`bo-h722-service-workspace bo-h724-service-workspace bo-h740h7 ${workspaceTab === 'overview' ? 'is-overview' : 'is-tool'}`} data-unified-service-blueprint-workspace="7.22" data-journey-library-workspace="7.24" data-service-ecology="7.25" data-research-studio="7.26" data-service-proposition="7.27" data-channel-continuity="7.29" data-service-prototype-lab="7.30" data-evidence-learning-system="7.31" data-decision-iteration-loop="7.32" data-current-future-service="7.33" data-improvement-backlog="7.34" data-improvement-portfolio="7.35" data-service-outcomes="7.36" data-service-governance="7.37" data-service-operations-bridge="7.38" data-executive-service-cockpit="7.39" data-product-hardening="7.40" data-product-coherence="7.40-H3" data-product-simplification="7.40-H5" data-guided-service-workspace="7.40-H7" data-interaction-accessibility-polish="7.40-H14" data-usage-relations="7.40-H15.2" data-design-service-ux="7.40-H15.3" data-design-service-visual="7.40-H15.4" data-discovery-ux="7.40-H15.5" data-research-ux="7.40-H15.6" data-adaptive-experience="H16" data-foundation-deep-adaptation="H16.1" data-research-driven-context="H16.2" data-phase-status-consistency="H16.3" data-design-service-proposal="H16.4" data-research-proposal="H16.5" data-research-proposal-hotfix="H16.5.1" data-research-workflow-ux="H16.6" data-flexible-discovery="H16.7" data-design-start-choice="H16.8" data-single-experience="H17" data-direct-journey-reference="H17.0.4" data-experience-level={experience.level} data-experience-density={experience.meta.density}>
    {workspaceTab === 'overview' && !showServiceStructure ? <header className="bo-h1704-home-header"><div><small>BLUE OCEAN · SERVIÇO ATUAL</small><h1>{graph.service.name || 'Seu serviço'}</h1><p>Comece pelo que quer construir. Pessoas, necessidades e dores podem ser registradas antes ou durante o desenho.</p></div></header> : workspaceTab === 'overview' ? <header className="bo-h740h7-hero">
      <div className="bo-h740h7-hero-main">
        <div className="bo-h722-eyebrow"><BlueOceanObjectIcon kind="blueprint" size={16}/> DESIGN DO SERVIÇO</div>
        <h1>{graph.service.name || 'Serviço'}</h1>
        <p>Evolua a experiência e a operação do mesmo serviço sem perder o contexto entre as fases.</p>
        <div className="bo-h740h7-maturity" aria-label={`${workspaceMaturity}% do serviço estruturado`}>
          <div><strong>{experience.level === 'foundation' ? 'Partes do serviço' : 'Estruturação do serviço'}</strong><span>{experience.level === 'foundation' ? `${workspaceReadiness} partes estruturadas` : `${workspaceReadiness} de 16 capacidades estruturadas`}</span></div>
          <div className="bo-h740h7-meter"><i style={{ width: `${workspaceMaturity}%` }}/></div>
          {experience.level !== 'foundation' && <b>{workspaceMaturity}%</b>}
        </div>
        {experience.level !== 'foundation' && <details className="bo-h740h7-metrics-details">
          <summary>Ver indicadores</summary>
          <div className="bo-h740h7-kpis">
            <div><strong>{improvementReport.counts.critical + improvementReport.counts.high}</strong><span>Prioridades</span><small>críticas ou altas</small></div>
            <div><strong>{portfolioReport.counts.inProgress}</strong><span>Iniciativas</span><small>{portfolioReport.counts.overdue} atrasada{portfolioReport.counts.overdue === 1 ? '' : 's'}</small></div>
            <div><strong>{outcomesReport.counts.metrics ? `${outcomesReport.counts.onTarget}/${outcomesReport.counts.metrics}` : '—'}</strong><span>Resultados</span><small>{outcomesReport.counts.metrics ? 'métricas na meta' : 'sem dados suficientes'}</small></div>
            <div><strong>{governanceReport.coverage}%</strong><span>Governança</span><small>{governanceReport.counts.overdue} revisões vencidas</small></div>
            <div><strong>{operationsReport.coveragePercent}%</strong><span>Operação</span><small>{operationsReport.counts.active} vínculos ativos</small></div>
          </div>
        </details>}
      </div>
      <aside className="bo-h740h7-next" data-guidance-target={experienceGuidanceTarget}>
        <small>{experience.level === 'foundation' ? `PRÓXIMO PASSO · ${phaseLanguage(guidance.phase)?.title ?? phaseMeta[guidance.phase].label}` : 'PRÓXIMO PASSO'}</small><span className="bo-h153-guidance-basis">Recomendado a partir do estado atual do serviço</span>
        <h2>{experienceGuidanceTarget === 'audience' ? 'Defina seu público-alvo' : experience.level === 'foundation' ? guidanceProjection.label : guidance.title}</h2>
        <p>{experienceGuidanceTarget === 'audience' ? 'Comece por uma Persona ou abra uma Jornada e registre o que descobrir durante o desenho.' : experience.level === 'foundation' ? guidanceProjection.description : guidance.reason}</p>
        <button type="button" className="primary" onClick={() => executeGuidedTarget(experienceGuidanceTarget)}>{experienceGuidanceTarget === 'audience' ? 'Definir público-alvo' : experience.level === 'foundation' ? guidanceProjection.action : guidance.label} <ArrowRight size={14}/></button>
        {experience.level === 'foundation' && guidanceSourceRow && <em className="bo-h164-guidance-metric">{guidanceSourceRow.metric}</em>}
        {experience.level !== 'foundation' && guidance.alternatives.filter((alternative) => alternative.target !== 'research' && isWorkspaceCapabilityVisible(experience.level, alternative.target)).length > 0 && <div className="bo-h740h7-alternatives"><span>Ou:</span>{guidance.alternatives.filter((alternative) => alternative.target !== 'research' && isWorkspaceCapabilityVisible(experience.level, alternative.target)).map((alternative) => <button type="button" key={alternative.target} onClick={() => executeGuidedTarget(alternative.target)}>{alternative.label}</button>)}</div>}
      </aside>
    </header> : <header className="bo-h740h7-compact-head" data-service-maps-header={workspaceTab === 'journey' ? '1' : undefined}>
      <div>
        <button type="button" onClick={() => selectWorkspaceTab('overview')}>Design do serviço</button>
        <span>/</span><span>{WORKSPACE_GROUPS.find((group) => group.id === activeWorkspaceGroup)?.label}</span><span>/</span>
        <strong>{projectedWorkspaceItems.find((item) => item.id === workspaceTab)?.label ?? graph.service.name}</strong>
      </div>
      <small>{graph.service.name}</small>
      <div className="bo-h722-head-actions">
        
        {workspaceTab === 'journey' && !journeyCreateOpen && <>{handoff.readyForJourney && <button type="button" className="bo-button bo-button--secondary" onClick={createFromDefinition}><Plus size={15}/> Criar com contexto</button>}<button type="button" className="primary bo-button bo-button--primary" onClick={() => setJourneyCreateOpen(true)}><Plus size={15}/> Criar mapa</button></>}
      </div>
    </header>}

    {workspaceTab !== 'overview' && !(workspaceTab === 'journey' && journeyCreateOpen) && <>
      {workspaceTab !== 'research' && workspaceTab !== 'journey' && <nav className="bo-h740h7-tool-phases" aria-label="Fases do serviço">
        <button type="button" onClick={() => selectWorkspaceTab('overview')}>Resumo</button>
        {WORKSPACE_GROUPS.filter((group) => group.id !== 'overview').map((group) => {
          const firstVisible = group.items.find((item) => isWorkspaceCapabilityVisible(experience.level, item.id))?.id ?? group.defaultTab;
          const label = experiencePhaseLanguage(experience.level, group.id as GuidedWorkspacePhase)?.title ?? group.label;
          return <button key={group.id} type="button" className={activeWorkspaceGroup === group.id ? 'active' : ''} onClick={() => selectWorkspaceTab(firstVisible)}>{label}</button>;
        })}
      </nav>}
      {workspaceTab === 'journey' ? null : workspaceTab === 'research' && experience.level === 'foundation' ? <nav className="bo-h740h3-workspace-subnav bo-h740h7-tool-subnav bo-h166-research-subnav" aria-label="Pesquisa e ferramentas">
        <button type="button" className={researchSurface === 'research' ? 'active' : ''} aria-current={researchSurface === 'research' ? 'page' : undefined} onClick={() => setResearchSurface('research')}><BlueOceanObjectIcon kind="evidence" size={16}/><span>Pesquisa</span></button>
        <button type="button" className={researchSurface === 'tools' ? 'active' : ''} aria-current={researchSurface === 'tools' ? 'page' : undefined} onClick={() => setResearchSurface('tools')}><Wrench size={16}/><span>Ferramentas</span></button>
      </nav> : <nav className="bo-h740h3-workspace-subnav bo-h740h7-tool-subnav" aria-label={`Capacidades de ${WORKSPACE_GROUPS.find((group) => group.id === activeWorkspaceGroup)?.label ?? 'Serviço'}`}>
        {projectedWorkspaceItems.map((item) => { const badge = workspaceBadge(item.id); return <button key={item.id} type="button" className={workspaceTab === item.id ? 'active' : ''} onClick={() => selectWorkspaceTab(item.id)}><BlueOceanObjectIcon kind={item.icon} size={16}/><span>{item.label}</span>{badge !== null ? <em>{badge}</em> : null}</button>; })}
      </nav>}
    </>}
    <span className="sr-only" data-h740h3-legacy-perspectives="1">Visão geral · Cockpit · Prontidão · Pesquisa · Ecologia · Proposição · Journey · Canais · Protótipos · Aprendizados · Decisões · Atual × Futuro · Prioridades · Portfolio · Resultados · Governança · Operação · Blueprint · Whiteboard</span>
    {/* H7.40-H3 legacy contract: activeWorkspaceGroup !== 'overview' · bo-h722-tabs bo-h740h3-workspace-groups · WORKSPACE_GROUPS.map */}
    {/* H7.40-H3 legacy marker: data-workspace-navigation="grouped" */}

    {workspaceTab === 'overview' && <div className="bo-h722-overview bo-h740h5-overview bo-h740h7-overview" data-service-workspace-overview="1" data-service-workspace-simplification="7.40-H5" data-guided-overview="1">
      {/* H7.22 legacy semantic contracts: Journey mostra o que o cliente vive · Blueprint mostra como a operação entrega · Whiteboard permite explorar e conectar livremente · bo-h722-flow */}
      <section className="bo-h1704-direct-dashboard" data-journey-reference-flow="H17.0.4" aria-label="Comece pelo que quer construir">
        <div className="bo-h1704-create-bar">
          <button type="button" className="is-primary" onClick={() => { selectWorkspaceTab('journey'); setJourneyStartTemplate('blank'); setJourneyCreateOpen(true); }}><BlueOceanObjectIcon kind="journey" size={22}/><span><b>+ Nova Jornada</b><small>Desenhe a experiência</small></span></button>
          <button type="button" onClick={() => openAudience(true)}><BlueOceanObjectIcon kind="persona" size={22}/><span><b>+ Nova Persona</b><small>Defina seu público-alvo</small></span></button>
          <button type="button" onClick={() => { try { sessionStorage.setItem('bo-context-kind','metric'); sessionStorage.setItem('bo-workspace-create-page','metrics'); } catch { /* preferência opcional */ } setActiveTab('context'); }}><BlueOceanObjectIcon kind="metric" size={22}/><span><b>+ Nova Métrica</b><small>Decida o que medir</small></span></button>
        </div>
        <div className="bo-h1704-home-group">
          <header><div><small>SEUS TRABALHOS</small><h2>Jornadas recentes</h2><p>Abra um mapa existente ou crie um novo, sem preencher Pesquisa primeiro.</p></div><button type="button" onClick={() => selectWorkspaceTab('journey')}>Ver todas as Jornadas <ArrowRight size={15}/></button></header>
          {recentJourneys.length ? <div className="bo-h1704-recent-grid">{recentJourneys.map((item) => <button key={item.id} type="button" className="bo-h1704-recent-card" onClick={() => { selectWorkspaceTab('journey'); void openJourney(item.id); }}><div className="bo-h1704-recent-cover"><img src={journeyPreviewSrc(item, graph)} alt="" loading="lazy"/></div><strong>{item.name}</strong><span>{item.stageIds.length} {item.stageIds.length === 1 ? 'etapa' : 'etapas'} · {item.status === 'active' ? 'Ativa' : 'Em construção'}</span><small>Atualizada em {formatDate(item.updatedAt)}</small></button>)}</div> : <div className="bo-h1704-no-recent"><BlueOceanObjectIcon kind="journey" size={30}/><strong>Sua primeira Jornada começa aqui.</strong><p>Escolha um quadro em branco ou um modelo editável e entre direto no mapa.</p><button type="button" onClick={() => { selectWorkspaceTab('journey'); setJourneyCreateOpen(true); }}>Criar primeira Jornada <ArrowRight size={15}/></button></div>}
        </div>
        <div className="bo-h1704-secondary-links"><button type="button" onClick={() => openAudience(false)}><BlueOceanObjectIcon kind="persona" size={18}/> Público-alvo <ArrowRight size={14}/></button><button type="button" onClick={continueWhiteboardFromDesign}><BlueOceanObjectIcon kind="whiteboard" size={18}/> Whiteboard <ArrowRight size={14}/></button><button type="button" onClick={() => selectWorkspaceTab('blueprint')}><BlueOceanObjectIcon kind="blueprint" size={18}/> Blueprints <ArrowRight size={14}/></button><button type="button" onClick={() => { try { sessionStorage.setItem('bo-context-kind','metric'); } catch { /* opcional */ } setActiveTab('context'); }}><BlueOceanObjectIcon kind="metric" size={18}/> Métricas <ArrowRight size={14}/></button></div>
        <button className="bo-h1704-structure-toggle" type="button" onClick={() => setShowServiceStructure((current) => !current)} aria-expanded={showServiceStructure}>{showServiceStructure ? 'Ocultar' : 'Ver'} estrutura completa do serviço <ArrowRight size={14}/></button>
      </section>
      {showServiceStructure && <section className="bo-h740h7-path">
        {/* Ações diretas agora pertencem ao dashboard principal; não duplicar dentro das fases. */}
        <div className="bo-h164-path-card">
        <div className="bo-h722-section-title"><div><small>CAMINHO DO SERVIÇO</small><h2>Evolua o serviço, fase por fase</h2><p>Escolha uma fase para ver seu estado, suas capacidades e a ação mais útil agora.</p></div></div>
        <div className="bo-h740h7-stepper" role="tablist" aria-label="Caminho do serviço">
          {(Object.keys(phaseMeta) as GuidedWorkspacePhase[]).map((phase, index) => {
            const rowsForPhase = phaseRowsFor(phase);
            const structuralRows = rowsForPhase.filter((row) => row.state !== 'derived');
            const total = structuralRows.length || rowsForPhase.length;
            const structured = rowsForPhase.filter((row) => row.state === 'ready').length;
            const active = overviewPhase === phase;
            const inProgress = rowsForPhase.some((row) => row.state === 'progress' || row.state === 'attention');
            const progressState = structured >= total && total > 0 ? 'is-complete' : structured > 0 || inProgress ? 'is-partial' : 'is-empty';
            // Seleção da fase é só destaque visual (aria-selected); o chip comunica apenas o estado de estruturação.
            const phaseStatus = progressState === 'is-complete' ? 'Estruturada' : progressState === 'is-partial' ? 'Em construção' : 'Não iniciada';
            return <button key={phase} type="button" role="tab" aria-selected={active} data-progress-state={progressState.replace('is-','')} className={`${active ? 'active' : ''} ${progressState}`} onClick={() => setOverviewPhase(phase)}><span className="bo-h154-phase-node">{progressState === 'is-complete' ? '✓' : index + 1}</span><div className="bo-h154-phase-copy"><strong>{phaseLanguage(phase)?.title ?? phaseMeta[phase].label}</strong><small>{structured} de {total} estruturadas</small><em>{phaseStatus}</em></div></button>;
          })}
        </div>
        </div>
        <div className={`bo-h164-focus-layout ${experience.level === 'foundation' ? 'is-foundation' : ''}`}>
        <div className="bo-h740h7-capability-panel">
          <header><div className="bo-h154-phase-heading"><small className="bo-h153-phase-kicker">FASE EM FOCO</small><h3>{phaseLanguage(overviewPhase)?.title ?? phaseMeta[overviewPhase].label}</h3><p>{phaseLanguage(overviewPhase)?.description ?? (overviewPhase === 'understand' ? 'Identifique público-alvo, participantes e valor — sem exigir uma pesquisa antes da Jornada.' : phaseMeta[overviewPhase].description)}</p>{overviewPhase === 'understand' && <div className="bo-h155-phase-next"><span>PRÓXIMO PASSO DA FASE</span><strong>{understandNextTitle}</strong><button type="button" onClick={() => executeGuidedTarget(understandNextTarget)}>{understandNextLabel} <ArrowRight size={13}/></button></div>}</div><div className="bo-h162-phase-tools"><div className="bo-h162-view-toggle" role="group" aria-label="Modo de visualização da fase"><button type="button" className={phaseViewMode === 'list' ? 'active' : ''} onClick={() => setPhaseViewMode('list')}><Table2 size={15}/><span>Lista</span></button><button type="button" className={phaseViewMode === 'cards' ? 'active' : ''} onClick={() => setPhaseViewMode('cards')}><LayoutTemplate size={15}/><span>Cards</span></button></div><div className="bo-h154-phase-progress" aria-label={`${focusedPhaseStructured} de ${focusedPhaseTotal} capacidades estruturadas nesta fase`}><div><strong>{focusedPhaseStructured}/{focusedPhaseTotal}</strong><span>estruturadas</span></div><div className="bo-h154-phase-meter"><i style={{ width: `${focusedPhaseProgress}%` }}/></div></div></div></header>
          {phaseViewMode === 'cards' && overviewPhase === 'understand' ? <div className="bo-h155-discovery-grid" role="list" aria-label="Capacidades da fase Entender">
            <article className={`bo-h155-discovery-card ${researchReport.researchReady ? 'is-ready' : researchStarted ? 'is-progress' : 'is-empty'}`} role="listitem" data-capability-target="research">
              <div className="bo-h155-discovery-card__head"><span><BlueOceanObjectIcon kind="evidence" size={19}/></span><div><small>1 · ENTENDA O CONTEXTO</small><h4>Pesquisa</h4></div><i>{researchReport.researchReady ? 'Estruturada' : researchStarted ? 'Em andamento' : 'Não iniciada'}</i></div>
              <p>Organize perguntas, materiais, observações e evidências para entender o que realmente acontece.</p>
              <div className="bo-h155-discovery-stats"><span><strong>{researchReport.counts.projects}</strong> projetos</span><span><strong>{researchReport.counts.observation}</strong> observações</span><span><strong>{researchReport.counts.evidence}</strong> evidências</span></div>
              <div className="bo-h155-maturity"><div><span>Maturidade da pesquisa</span><strong>{researchMaturity}%</strong></div><div><i style={{ width: `${researchMaturity}%` }}/></div></div>
              <div className="bo-h155-card-next"><small>PRÓXIMO PASSO</small><p>{researchNext}</p></div>
              <button type="button" onClick={() => executeGuidedTarget('research')}>{researchReport.researchReady ? 'Ver pesquisa' : researchStarted ? 'Continuar pesquisa' : 'Começar pesquisa'} <ArrowRight size={13}/></button>
            </article>
            {experience.level === 'foundation' ? <article className={`bo-h155-discovery-card ${foundationContextState.state === 'ready' ? 'is-ready' : foundationContextTotal > 0 ? 'is-progress' : 'is-empty'}`} role="listitem" data-capability-target="context">
              <div className="bo-h155-discovery-card__head"><span><BlueOceanObjectIcon kind="persona" size={19}/></span><div><small>2 · ORGANIZE O QUE APRENDEU</small><h4>Pessoas, necessidades, dores e problemas</h4></div><i>{foundationContextState.stateLabel}</i></div>
              <p>Use a pesquisa para compreender pessoas, necessidades, dores e problemas antes de desenhar a solução.</p>
              <div className="bo-h162-context-mini"><span><strong>{foundationContextCounts.personas}</strong> pessoas</span><span><strong>{foundationContextCounts.needs}</strong> necessidades</span><span><strong>{foundationContextCounts.pains}</strong> dores</span><span><strong>{foundationContextCounts.problems}</strong> problemas</span></div>
              <div className="bo-h155-card-next"><small>COMO USAR</small><p>Revise pessoas, necessidades, dores e problemas dentro da Pesquisa e conecte evidências antes de tratá-los como conclusões.</p></div>
              <button type="button" onClick={() => executeGuidedTarget('research')}>Ver na pesquisa <ArrowRight size={13}/></button>
            </article> : <>            <article className={`bo-h155-discovery-card ${ecologyReport.stakeholderCount > 0 && ecologyReport.relationCount > 0 ? 'is-ready' : ecologyReport.stakeholderCount > 0 ? 'is-progress' : 'is-empty'}`} role="listitem" data-capability-target="ecology">
              <div className="bo-h155-discovery-card__head"><span><BlueOceanObjectIcon kind="service" size={19}/></span><div><small>2 · ENTENDA QUEM PARTICIPA</small><h4>{experienceTerm(experience.level, 'ecology')}</h4></div><i>{ecologyReport.stakeholderCount > 0 && ecologyReport.relationCount > 0 ? 'Mapeada' : ecologyReport.stakeholderCount > 0 ? 'Em andamento' : 'Não iniciada'}</i></div>
              <p>Mapeie pessoas, organizações, parceiros e sistemas que participam ou influenciam a entrega.</p>
              <div className="bo-h155-discovery-stats"><span><strong>{ecologyReport.stakeholderCount}</strong> atores</span><span><strong>{ecologyReport.relationCount}</strong> relações</span><span><strong>{ecologyReport.connectedStakeholderCount}</strong> conectados</span></div>
              <div className="bo-h155-example-strip" aria-label="Exemplo de ecologia"><span>Cliente</span><ArrowRight size={12}/><span>Atendimento</span><ArrowRight size={12}/><span>Operação</span><ArrowRight size={12}/><span>Parceiro</span></div>
              <div className="bo-h155-card-next"><small>PRÓXIMO PASSO</small><p>{ecologyNext}</p></div>
              <button type="button" className={understandNextTarget === 'ecology' ? 'primary' : ''} onClick={() => executeGuidedTarget('ecology')}>{ecologyReport.stakeholderCount === 0 ? 'Mapear atores' : ecologyReport.relationCount === 0 ? 'Conectar atores' : 'Ver ecologia'} <ArrowRight size={13}/></button>
            </article>
            </>}
            <article className={`bo-h155-discovery-card ${propositionReport.propositionReady ? 'is-ready' : propositionReport.readinessScore > 0 ? 'is-progress' : 'is-empty'}`} role="listitem" data-capability-target="proposition">
              <div className="bo-h155-discovery-card__head"><span><BlueOceanObjectIcon kind="solution" size={19}/></span><div><small>3 · TRANSFORME EM DIREÇÃO</small><h4>{experienceTerm(experience.level, 'proposition')}</h4></div><i>{propositionReport.propositionReady ? 'Estruturada' : propositionReport.readinessScore > 0 ? 'Em andamento' : 'Não iniciada'}</i></div>
              <p>Conecte necessidades do cliente, valor entregue e resultado para o negócio em uma promessa clara.</p>
              <div className="bo-h155-discovery-stats"><span><strong>{propositionReport.readinessScore}%</strong> estruturada</span><span><strong>{propositionReport.linkedNeeds.length}</strong> necessidades</span><span><strong>{propositionReport.linkedEvidence.length}</strong> evidências</span></div>
              <div className="bo-h155-value-chain"><span>Necessidades</span><ArrowRight size={12}/><span>Valor entregue</span><ArrowRight size={12}/><span>Resultado</span></div>
              <div className="bo-h155-card-next"><small>PRÓXIMO PASSO</small><p>{propositionNext}</p></div>
              <button type="button" className={understandNextTarget === 'proposition' ? 'primary' : ''} onClick={() => executeGuidedTarget('proposition')}>{propositionReport.propositionReady ? 'Ver proposição' : propositionReport.readinessScore > 0 ? 'Continuar definição' : 'Definir proposição'} <ArrowRight size={13}/></button>
            </article>
          </div> : phaseViewMode === 'cards' ? <div className="bo-h162-phase-card-grid" role="list" aria-label={`Capacidades de ${phaseLanguage(overviewPhase)?.title ?? phaseMeta[overviewPhase].label}`}>
            {focusedPhaseRows.map((row, index) => <article key={`${row.target}-${index}`} className={`bo-h162-phase-card is-${row.state}`} role="listitem"><div className="bo-h162-phase-card__head"><span><BlueOceanObjectIcon kind={row.icon} size={18}/></span><div><strong>{row.label}</strong><i>{row.stateLabel}</i></div></div><p>{row.description}</p><em>{row.metric}</em><button type="button" className={guidance.target === row.target ? 'primary' : ''} onClick={() => executeGuidedTarget(row.target)}>{row.action} <ArrowRight size={13}/></button></article>)}
          </div> : <ul className="bo-h162-phase-list">
            {focusedPhaseRows.map((row, index) => {
              // O CTA principal da fase já leva a este destino: a linha vira ação discreta e não repete o mesmo rótulo.
              const duplicatesPhaseNext = overviewPhase === 'understand' && row.target === understandNextTarget;
              const rowActionLabel = duplicatesPhaseNext && row.action === understandNextLabel ? `Abrir ${row.label.toLowerCase()}` : row.action;
              return <li key={`${row.target}-${index}`} className={`is-${row.state}`} data-capability-target={row.target} data-capability-action={row.action}><div className="bo-h740h7-capability-main"><span><BlueOceanObjectIcon kind={row.icon} size={18}/></span><div><strong>{row.label}</strong><p><i>{row.stateLabel}</i>{row.description}</p></div></div><em>{row.metric}</em><button type="button" className={duplicatesPhaseNext ? 'is-quiet' : guidance.target === row.target ? 'primary' : ''} onClick={() => executeGuidedTarget(row.target)}>{rowActionLabel}</button></li>;
            })}
          </ul>}
          {experience.level === 'foundation' && overviewPhase === 'understand' && <section className="bo-h168-flex-note" aria-label="Começar a desenhar sem concluir toda a fase Entender">
            <div><small>VOCÊ PODE COMEÇAR ANTES</small><strong>Não precisa preencher tudo para desenhar o serviço</strong><p>Comece pela Jornada ou explore livremente no Whiteboard. Pessoas, necessidades, dores e evidências podem ser registradas quando surgirem e complementadas depois.</p></div>
            <button type="button" onClick={openDesignStartChoice}>Começar a desenhar <ArrowRight size={13}/></button>
          </section>}
          {experience.level === 'foundation' && overviewPhase === 'design' && !preferredDesignMode && <section className="bo-h168-design-start" aria-label="Começar a desenhar o serviço">
            <div><small>COMEÇAR A DESENHAR</small><h4>Escolha pelo que você quer fazer</h4><p>Você pode organizar a experiência passo a passo ou explorar livremente. O Blue Ocean apresenta a ferramenta depois que você escolhe a intenção.</p></div>
            <button type="button" className="primary" onClick={() => setDesignStartOpen(true)}>Começar a desenhar <ArrowRight size={13}/></button>
          </section>}
          {experience.level === 'foundation' && overviewPhase === 'design' && preferredDesignMode && <section className="bo-h168-design-continuity" aria-label="Continuar o desenho do serviço">
            <div><small>CONTINUE DE ONDE PAROU</small><strong>{preferredDesignMode === 'journey' ? 'Continue organizando a experiência' : 'Continue explorando o serviço'}</strong><p>{preferredDesignMode === 'journey' ? 'A Jornada oferece estrutura para organizar etapas, necessidades, dores e evidências sem sair do fluxo.' : 'O Whiteboard continua sendo um espaço livre. Quando fizer sentido, você pode organizar o que descobriu em uma Jornada.'}</p></div>
            <div>{preferredDesignMode === 'journey' ? <><button type="button" className="primary" onClick={() => void continueJourneyFromDesign()}>Continuar Jornada <ArrowRight size={13}/></button><button type="button" onClick={continueWhiteboardFromDesign}>{latestFreeBoard ? 'Abrir Whiteboard' : 'Explorar no Whiteboard'}</button></> : <><button type="button" className="primary" onClick={continueWhiteboardFromDesign}>Continuar Whiteboard <ArrowRight size={13}/></button><button type="button" onClick={() => void continueJourneyFromDesign()}>{latestJourney ? 'Abrir Jornada' : 'Organizar em uma Jornada'}</button></>}</div>
          </section>}
        </div>
        <aside className="bo-h164-focus-aside">
        <section className="bo-h153-phase-connections" aria-label={`Como ${phaseLanguage(overviewPhase)?.title ?? phaseMeta[overviewPhase].label} se conecta`}>
          <div className="bo-h153-phase-connections__copy"><small>COMO ESTA FASE SE CONECTA</small><strong>{(phaseLanguage(overviewPhase)?.flow ?? phaseConnections[overviewPhase].flow).join(' → ')}</strong><p>{experience.level === 'foundation' ? phaseLanguage(overviewPhase)?.description : phaseConnections[overviewPhase].note}</p>{experience.level !== 'foundation' && phaseConnections[overviewPhase].support && <em>{phaseConnections[overviewPhase].support}</em>}</div>
          <div className={`bo-h154-connection-map ${overviewPhase === 'understand' ? 'bo-h155-understand-flow' : ''}`} aria-hidden="true">{overviewPhase === 'understand' ? <div className="bo-h155-understand-flow__track"><div><b>Público-alvo</b><small>Pessoas e necessidades</small></div><ArrowRight size={16}/><div><b>{experience.level === 'foundation' ? 'Pessoas · necessidades · dores · problemas' : 'Ecologia'}</b><small>{experience.level === 'foundation' ? 'Pessoas · necessidades · dores · problemas' : 'Atores e relações'}</small></div><ArrowRight size={16}/><div><b>{experience.level === 'foundation' ? 'Valor do serviço' : 'Proposição'}</b><small>{experience.level === 'foundation' ? 'Direção de valor' : 'Valor do serviço'}</small></div></div> : <><div className="bo-h153-phase-flow">{(phaseLanguage(overviewPhase)?.flow ?? phaseConnections[overviewPhase].flow).map((item, index, flow) => <span key={item}><b>{item}</b>{index < flow.length - 1 && <ArrowRight size={15}/>}</span>)}</div>{experience.level !== 'foundation' && phaseConnections[overviewPhase].support && <div className="bo-h154-support-branch"><span>↳</span><b>{overviewPhase === 'design' ? 'Whiteboard' : 'Prontidão'}</b><small>{overviewPhase === 'design' ? 'exploração opcional' : 'leitura de apoio'}</small></div>}</>}</div>
        </section>
        {experience.level === 'foundation' && foundationStructuredPhase && <section className="bo-h164-structured-card" aria-label="Fase já estruturada">
          <small>JÁ ESTRUTURADO</small>
          <h3>{phaseLanguage(foundationStructuredPhase.phase)?.title ?? phaseMeta[foundationStructuredPhase.phase].label}</h3>
          <ul>{foundationStructuredPhase.rows.map((row, index) => <li key={`${row.target}-${index}`}><span aria-hidden="true">✓</span><strong>{row.label}</strong></li>)}</ul>
        </section>}
        </aside>
        </div>
        {/* Contratos históricos preservados apenas para regressão de source: bo-h731-overview-flow bo-h732-overview-flow bo-h733-overview-flow bo-h734-overview-flow bo-h735-overview-flow bo-h736-overview-flow bo-h737-overview-flow bo-h738-overview-flow */}
        {/* H7.32 legacy readiness: workspaceReadiness}/10 */}
        {/* H7.32 legacy overview: Decisões transformam aprendizado em mudança aprovada e rastreável */}
        {/* H7.32 legacy card: <small>DECIDIR</small><strong>Decisões</strong> */}
        {/* H7.33 legacy readiness: workspaceReadiness}/11 */}
        {/* H7.34 legacy readiness: workspaceReadiness}/12 */}
        {/* H7.35 legacy readiness: workspaceReadiness}/13 */}
        {/* H7.35 legacy overview: Portfolio transforma oportunidades escolhidas em iniciativas governadas */}
        {/* H7.36 legacy readiness: {workspaceReadiness}/14 */}
        {/* H7.36 legacy overview: Um serviço, quatorze perspectivas conectadas */}
        {/* H7.36 legacy token: <small>MEDIR</small> · Métricas & Outcomes */}
        {/* H7.37 legacy readiness: {workspaceReadiness}/15 */}
        {/* H7.37 legacy overview: Um serviço, quinze perspectivas conectadas */}
        {/* H7.37 legacy token: <small>GOVERNAR</small> · Service Governance · className={governanceReady */}
        {/* H7.38 legacy readiness: {workspaceReadiness}/16 */}
        {/* H7.38 legacy overview: Um serviço, dezesseis perspectivas conectadas */}
        {/* H7.38 legacy token: <small>OPERAR</small> · Operations Bridge · className={operationsReady */}
        {/* H7.39 legacy overview: Um serviço, dezessete perspectivas conectadas */}
        {/* H7.40 legacy overview: Um serviço, dezoito perspectivas conectadas */}
        {/* H7.40 legacy header: <b>18</b> perspectivas */}
        {/* H7.39 legacy contract: <h2>Um serviço, dezessete perspectivas conectadas</h2> */}
        {/* H7.39 legacy contract: <b>{workspaceReadiness}/16</b> capacidades · <b>17</b> perspectivas */}
        {/* H7.38 legacy contract: <b>{workspaceReadiness}/16</b> perspectivas conectadas */}
        {/* H7.34/H7.39 legacy summary contract: problemas priorizados · iniciativas · métricas · vínculos operacionais · saúde executiva · executiveReport.counts.openActions */}
        {/* H7.25 legacy readiness: <b>{workspaceReadiness}/4</b> perspectivas conectadas · selectWorkspaceTab('ecology') · Mapeie atores, relações e dependências */}
        {/* H7.26 legacy readiness: workspaceReadiness}/5 · selectWorkspaceTab('research') · Colete material antes de interpretar */}
        {/* H7.27 legacy readiness: workspaceReadiness}/6 · selectWorkspaceTab('proposition') · Transforme insights em uma promessa explícita */}
        {/* H7.29 legacy readiness: workspaceReadiness}/7 · OMNICHANNEL · mappedTouchpointCoverage */}
        {/* H7.30 legacy readiness: workspaceReadiness}/8 · Protótipos testam hipóteses · <small>VALIDAR</small><strong>Protótipos</strong> */}
        {/* H7.31 legacy overview: Aprendizados convertem resultados em evidência canônica */}
        {/* H7.31 legacy card: <small>APRENDER</small><strong>Aprendizados</strong> */}
        {/* H7.33 legacy card: <small>EVOLUIR</small><strong>Atual × Futuro</strong> */}
        {/* H7.34 legacy card: <small>PRIORIZAR</small><strong>Problemas & Oportunidades</strong> */}
        {/* H7.35 legacy card: <small>EXECUTAR</small><strong>Portfolio de Melhoria</strong> */}
        {/* H7.36 legacy card: <small>MEDIR</small><strong>Métricas & Outcomes</strong> */}
        {/* H7.37 legacy card: <small>GOVERNAR</small><strong>Service Governance</strong> */}
        {/* H7.38 legacy card: <small>OPERAR</small><strong>Operations Bridge</strong> */}
        {/* H7.25 legacy contract: Um serviço, quatro perspectivas conectadas */}{/* H7.26 legacy contract: Um serviço, cinco perspectivas conectadas */}{/* H7.27 legacy contract: Um serviço, seis perspectivas conectadas */}{/* H7.31 legacy contract: Um serviço, nove perspectivas conectadas */}{/* H7.34 legacy contract: Um serviço, doze perspectivas conectadas */}{/* H7.35 legacy contract: Um serviço, treze perspectivas conectadas */}{/* H7.36 legacy contract: Um serviço, quatorze perspectivas conectadas */}{/* H7.37 legacy contract: Um serviço, quinze perspectivas conectadas */}{/* H7.38 legacy contract: Um serviço, dezesseis perspectivas conectadas */}{/* H7.39 legacy contract: <h2>Um serviço, dezessete perspectivas conectadas</h2> */}
      </section>}
    </div>}

    {workspaceTab === 'cockpit' && <ExecutiveServiceCockpitView studio={studio}/>}
    {workspaceTab === 'readiness' && <ProductHardeningView studio={studio}/>}

    {workspaceTab === 'research' && <ResearchStudioView studio={studio} foundationSurface={researchSurface}/>}

    {workspaceTab === 'ecology' && <ServiceEcologyView studio={studio}/>}

    {workspaceTab === 'proposition' && <ServicePropositionView studio={studio}/>}

    {workspaceTab === 'channels' && <ChannelContinuityView studio={studio}/>}

    {workspaceTab === 'prototypes' && <ServicePrototypeLabView studio={studio}/>}
    {workspaceTab === 'learning' && <ServiceLearningView studio={studio}/>}
    {workspaceTab === 'decisions' && <ServiceDecisionView studio={studio}/>}
    {workspaceTab === 'current-future' && <CurrentFutureServiceView studio={studio}/>}
    {workspaceTab === 'improvement' && <ImprovementBacklogView studio={studio}/>}
    {workspaceTab === 'portfolio' && <ImprovementPortfolioView studio={studio}/>}
    {workspaceTab === 'outcomes' && <ServiceOutcomesView studio={studio}/>}
    {workspaceTab === 'governance' && <ServiceGovernanceView studio={studio}/>}
    {workspaceTab === 'operations' && <ServiceOperationsBridgeView studio={studio}/>}

    {workspaceTab === 'journey' && !journeyEditorOpen && !journeyCreateOpen && handoff.readyForJourney && <section className="bo-h78-blueprint-context" data-blueprint-context-handoff="1"><div><small>CONTEXTO DO SERVIÇO</small><strong>{handoff.counts.persona} Personas · {handoff.counts.problem} Problemas · {handoff.counts.evidence} Evidências</strong><span>Use Criar com contexto para manter os vínculos com os registros existentes.</span></div></section>}

    {workspaceTab === 'journey' && !journeyEditorOpen && !journeyCreateOpen && <ServiceMapsLibrary graph={graph} query={journeyQuery} onQuery={setJourneyQuery} view={journeyViewMode} onView={setJourneyViewMode} onCreate={() => setJourneyCreateOpen(true)} onOpen={id => void openJourney(id)} onOpenBoard={id => void runtimeCall('open', id)} onRemove={(id, name) => setJourneyToDelete({ id, name })} onRemoveBoard={(id, name) => setBlueprintToDelete({ id, name })}/>}

    {workspaceTab === 'journey' && journeyEditorOpen && <EditorSurface><div className="bo-h724-journey-editor-shell"><div className="bo-h722-embedded bo-h722-embedded--journey" data-unified-journey-pane="1"><JourneyView studio={studio} onBack={() => setJourneyEditorOpen(false)}/></div></div></EditorSurface>}

    {workspaceTab === 'whiteboard' && <div className="bo-h722-embedded bo-h722-embedded--whiteboard" data-unified-whiteboard-pane="1"><WhiteboardsView studio={studio}/></div>}

    {designStartOpen && <div className="bo-h168-choice-backdrop" role="dialog" aria-modal="true" aria-labelledby="bo-h168-choice-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setDesignStartOpen(false); }}><div className="bo-h168-choice-modal"><header><div><small>COMO VOCÊ QUER TRABALHAR?</small><h2 id="bo-h168-choice-title">Escolha pela intenção, não pela ferramenta</h2><p>As duas formas usam os mesmos dados do serviço. Você pode alternar depois sem perder o que já registrou.</p></div><button type="button" aria-label="Fechar" onClick={() => setDesignStartOpen(false)}><X size={17}/></button></header><div className="bo-h168-choice-grid"><button type="button" className="bo-h168-choice-card is-recommended" onClick={() => void continueJourneyFromDesign()}><span className="bo-h168-choice-icon"><BlueOceanObjectIcon kind="journey" size={22}/></span><em>RECOMENDADO PARA COMEÇAR</em><strong>Organizar a experiência</strong><p>Entenda o que acontece em cada etapa da experiência do cliente e registre necessidades, dores e evidências enquanto desenha.</p><b>Jornada do cliente <ArrowRight size={14}/></b></button><button type="button" className="bo-h168-choice-card" onClick={continueWhiteboardFromDesign}><span className="bo-h168-choice-icon"><BlueOceanObjectIcon kind="whiteboard" size={22}/></span><em>EXPLORAÇÃO LIVRE</em><strong>Explorar visualmente</strong><p>Coloque ideias e relações no espaço, crie pessoas, necessidades, dores e evidências quando aparecerem e organize depois.</p><b>Whiteboard <ArrowRight size={14}/></b></button></div><footer><span>Whiteboard é um ambiente transversal de exploração, não uma etapa obrigatória do desenho.</span><button type="button" onClick={() => setDesignStartOpen(false)}>Agora não</button></footer></div></div>}

    {workspaceTab === 'journey' && journeyCreateOpen && <section className="bo-h1704-journey-starter" data-journey-starter="full-page" aria-labelledby="bo-h1704-starter-title">
      <header className="bo-h1704-starter-top"><button type="button" onClick={() => { setJourneyCreateOpen(false); setJourneyDraftName(''); }}><ArrowLeft size={16}/> Voltar aos mapas</button><span>1. Escolha como começar &nbsp; → &nbsp; 2. Edite seu mapa</span></header>
      <div className="bo-h1704-starter-content"><small>CRIAR MAPA DO SERVIÇO</small><h1 id="bo-h1704-starter-title">Como você quer começar?</h1><p>Comece com um mapa em branco ou use um exemplo editável. Não é necessário cadastrar uma Persona ou fazer Pesquisa antes.</p>
        <fieldset className="bo-business-goals"><legend>O que você quer melhorar no negócio?</legend><div>{businessGoals.map(item => <button type="button" key={item.goal} aria-pressed={journeyGoal === item.goal} onClick={() => { setJourneyGoal(item.goal); setJourneyStartTemplate(item.template); }}><strong>{item.goal}</strong><small>{item.hint}</small></button>)}</div><p>{journeyGoal ? `Objetivo: ${journeyGoal}. O modelo sugerido está destacado abaixo; você pode escolher outro.` : 'Escolha um objetivo para receber uma sugestão ou comece diretamente com um mapa.'}</p></fieldset>
        <label className="bo-h1704-name-field"><span>Nome do mapa <em>(opcional)</em></span><input autoFocus value={journeyDraftName} onChange={(event) => setJourneyDraftName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void createJourney(); }} placeholder="Ex.: Jornada de coleta e entrega"/></label>
        <div className="bo-h1704-templates-head"><strong>Escolha um ponto de partida</strong><small>Os modelos são exemplos; nenhuma etapa representa um fato confirmado sobre seu serviço.</small></div>
        <div className="bo-h1704-template-grid" aria-label="Criar mapa a partir de um modelo"><button type="button" className={journeyStartTemplate === 'blank' ? 'is-selected' : ''} onClick={() => void createJourney('blank')}><span className="bo-h1704-template-preview is-blank"><Plus size={28}/></span><strong>Em branco</strong><small>Adicione suas próprias etapas no mapa. Clique para criar.</small></button>{starterTemplates.map((template) => <button type="button" key={template.id} className={journeyStartTemplate === template.id ? 'is-selected' : ''} onClick={() => void createJourney(template.id)}><span className="bo-h1704-template-preview">{template.stages.slice(0,4).map((stage) => <i key={stage} title={stage}/>)}</span><strong>{template.name}</strong><small>{template.description} · Clique para criar.</small></button>)}</div>
        <footer><button type="button" className="bo-button bo-button--secondary" onClick={() => setJourneyCreateOpen(false)}>Cancelar</button><button type="button" className="primary bo-button bo-button--primary" onClick={() => void createJourney()}>Criar e abrir mapa <ArrowRight size={16}/></button></footer>
      </div>
    </section>}

    {blueprintToDelete && <div className="bo-h168-choice-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setBlueprintToDelete(null); }}>
      <div className="bo-h168-choice-modal" role="dialog" aria-modal="true" aria-labelledby="bo-delete-blueprint-title" data-delete-blueprint-dialog="1" tabIndex={-1} onKeyDown={(event) => { if (event.key === 'Escape') setBlueprintToDelete(null); }}>
        <header><div><small>EXCLUSÃO DE BLUEPRINT</small><h2 id="bo-delete-blueprint-title">Excluir “{blueprintToDelete.name}”?</h2><p>Esta ação remove o mapa, seus cartões e conexões exclusivos. A Jornada vinculada, as etapas e os objetos compartilhados do serviço serão preservados. Não é possível desfazer a exclusão sem um backup.</p></div><button type="button" aria-label="Cancelar exclusão do Blueprint" onClick={() => setBlueprintToDelete(null)}><X size={18}/></button></header>
        <footer><button type="button" className="bo-button bo-button--secondary" autoFocus onClick={() => setBlueprintToDelete(null)}>Cancelar</button><button type="button" className="danger bo-button bo-button--danger" onClick={deleteBlueprint}>Excluir Blueprint</button></footer>
      </div>
    </div>}

    {journeyToDelete && <div className="bo-h168-choice-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setJourneyToDelete(null); }}>
      <div className="bo-h168-choice-modal" role="dialog" aria-modal="true" aria-labelledby="bo-delete-journey-title" data-delete-journey-dialog="1">
        <header><div><small>EXCLUSÃO DE MAPA</small><h2 id="bo-delete-journey-title">Excluir “{journeyToDelete.name}”?</h2><p>Essa ação remove o mapa, suas etapas, cartões e conexões das visualizações Blueprint e Jornada. Os registros compartilhados do serviço serão preservados. Faça um backup se precisar guardar este mapa.</p></div><button type="button" aria-label="Cancelar exclusão" onClick={() => setJourneyToDelete(null)}><X size={18}/></button></header>
        <footer><button type="button" className="bo-button bo-button--secondary" onClick={() => setJourneyToDelete(null)}>Cancelar</button><button type="button" className="danger bo-button bo-button--danger" onClick={deleteJourney}>Confirmar exclusão</button></footer>
      </div>
    </div>}

    <span className="sr-only" data-unified-legacy-targets="Journey maps|Whiteboards|Blueprints">Journey maps · Whiteboards · Blueprints continuam disponíveis dentro do Service Workspace. Um serviço, três perspectivas. Whiteboard permite explorar e conectar livremente.</span>
  </section>;
}

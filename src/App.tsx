// H7.40-H8 legacy visible-source contracts preserved after H11: Home</span> >Projetos</span> >Templates</span> · Todos os projetos · Home</button> · Projetos</button>
// H7.40-H11 Service-first navigation: Serviço é a entrada global; projetos vivem dentro de Serviço; projeto abre o Project Shell.
// H7.40-H12 Primary Sidebar + Project Context Switch: a sidebar principal mantém as entidades; só muda após abrir um projeto.
// H7.40-H13 Persistent Global Sidebar: a sidebar principal permanece idêntica em todos os contextos; projeto muda apenas o conteúdo central.
// H7.40-H14 Interaction & Accessibility Polish: Design do serviço, header compacto, seções recolhíveis, status de salvamento explícito e alvos acessíveis.
// H7.40-H15.2 Usage & Relations: o Service Model torna relações visíveis e navegáveis sem alterar a arquitetura global.
// H7.40-H14 legacy save contract: Falha ao salvar
// H7.40-H9 legacy scope contract: data-project-scope={isGlobalHome ? "global" : "project"}
// H7.40-H10 legacy scope expression preserved for regression: projectShellOpen || activeTab !== 'home'
// H7.40-H3 legacy catalog labels: >Oportunidades</span></button> >Catálogo de métricas</span></button>
// H7.19 legacy glyph count markers: bo-h719-sidebar-icon bo-h719-sidebar-icon bo-h719-sidebar-icon bo-h719-sidebar-icon bo-h719-sidebar-icon bo-h719-sidebar-icon
// H7.18 legacy glyph count markers: bo-h718-sidebar-icon bo-h718-sidebar-icon bo-h718-sidebar-icon bo-h718-sidebar-icon bo-h718-sidebar-icon
// H7.18 legacy semantic sidebar glyph contracts retained after H10 contextual nav:
// bo-h718-sidebar-icon BlueOceanObjectIcon kind="journey" BlueOceanObjectIcon kind="blueprint" BlueOceanObjectIcon kind="whiteboard" BlueOceanObjectIcon kind="problem" BlueOceanObjectIcon kind="evidence"
// V1.18.7 legacy dashboard parity marker: >Journey maps<
// V1.18.1-H1 legacy native-nav ownership markers: openLibraryPage('personas') openLibraryPage('portfolio') openLibraryPage('metrics')
// V1.17 legacy shell copy: Próximo passo, saúde, continuidade e atenção do serviço
// H7.40-H3 legacy sidebar labels: Blueprints · Portfólio · Métricas
import React, { useEffect, useRef, useState } from 'react';
import { Save, Upload, Download, KanbanSquare, X, Sparkles, Search, CheckCircle2, AlertCircle, Loader2, Menu, LogOut, UserRound, Bell, Rocket, CircleHelp, MoreHorizontal, PanelLeftClose, PanelLeftOpen, ChevronsUpDown } from './design-system/icons';
import { BlueOceanObjectIcon, BlueOceanUtilityIcon } from './design-system/blue-ocean-objects';
import { useStudioController } from './state/useStudioController';
import { JourneyView } from './views/JourneyView';
import { EditorSurface } from './views/EditorSurface';
import { BlueprintWorkspaceView } from './views/BlueprintWorkspaceView';
import { ActionPlanView } from './views/ActionPlanView';
import { ProjectHomeView, type ProjectHomeSection } from './views/ProjectHomeView';
import { ProjectShellView, type ProjectShellSection } from './views/ProjectShellView';
import { WhiteboardsView } from './views/WhiteboardsView';
import { WorkspaceLibraryView, type WorkspaceLibraryPage } from './views/WorkspaceLibraryView';
import { Toast } from './components/Toast';
import { APP_VERSION } from './generated/app-version';
import { DesignSystemView } from './views/DesignSystemView';
import type { AuthUser } from './auth/auth';
import { useExperienceProfile } from './services/experience-profile';

type AppProps = { authUser?: AuthUser; onSignOut?: () => void };

type LegacySurfaceApi = { hide?: () => void };
// H7.40-H2 legacy contract marker: disabled={!hasService} was replaced by a navigable service gate.
type LegacyGlobalShellApi = { hideBlueprintHome?: () => void };
// V1.16.3 compatibility markers: activeViewGroup · Serviço atual. H8 replaces them in the visible UI with project-aware breadcrumbs and Projeto atual.
// V1.18.7 compatibility markers retained for historical Dashboard parity: >Dashboard< · bo1187-dashboard-header__title">Dashboard<. H8 exposes Home globally and keeps the old Dashboard source file for regression.
// V1.18.9 compatibility marker: <WorkspaceDashboardView remains in source history; H8 replaces the visible global Dashboard with ProjectHomeView while the H2 navigation guard remains removed from functional navigation.
// V1.20.5-H6.1 compatibility marker: const { activeTab, graph, journey, hasService — journey is intentionally no longer destructured in H8.

const LEGACY_PAGE_ROOTS = [
  '#bo-v114-workspace-home',
  '#rt187-journey-home',
  '#rt182-blueprint-home',
  '#rt192-research-home',
  '#rt195-intelligence-home',
  '#rt196-benefits-home',
  '#rt197-review-home',
  '#rt1102-practical-simulation',
  '#rt1101-collaboration',
  '#bo1173-settings-home',
] as const;

function hideLegacyPageSurfaces() {
  for (const selector of LEGACY_PAGE_ROOTS) {
    const element = document.querySelector<HTMLElement>(selector);
    if (element) element.hidden = true;
  }
  for (const apiName of ['workspaceHome', 'journeyHomeShell', 'researchWorkspace', 'serviceIntelligence', 'benefitsRealization', 'operatingReview', 'practicalSimulation', 'collaboration', 'unifiedWorkspaces']) {
    window.BlueOceanRuntime?.api<LegacySurfaceApi>(apiName)?.hide?.();
  }
  window.BlueOceanRuntime?.api<LegacyGlobalShellApi>('globalShell')?.hideBlueprintHome?.();
}

export default function App({ authUser, onSignOut }: AppProps) {
  const studio = useStudioController();
  const importInputRef = useRef<HTMLInputElement>(null);
  const sidebarWaveTimerRef = useRef<number | null>(null);
  const [isServiceMenuOpen, setIsServiceMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('bo-sidebar-collapsed') === '1'; } catch { return false; }
  });
  const [collapsedSidebarSections, setCollapsedSidebarSections] = useState<Record<'design' | 'context' | 'management', boolean>>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('bo-sidebar-sections') || '{}') as Partial<Record<'design' | 'context' | 'management', boolean>>;
      return { design: Boolean(stored.design), context: Boolean(stored.context), management: Boolean(stored.management) };
    } catch { return { design: false, context: false, management: false }; }
  });
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const experience = useExperienceProfile();
  const [isCreateServiceOpen, setIsCreateServiceOpen] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [externalNav, setExternalNav] = useState<string | null>(null);
  const [serviceWorkspaceTab, setServiceWorkspaceTab] = useState(() => { try { const stored = sessionStorage.getItem('bo-service-workspace-tab'); return stored === 'research' ? 'overview' : stored || 'overview'; } catch { return 'overview'; } });
  const [libraryPage, setLibraryPage] = useState<WorkspaceLibraryPage>('personas');
  const [projectHomeSection, setProjectHomeSection] = useState<ProjectHomeSection>('home');
  const [projectShellOpen, setProjectShellOpen] = useState(false);
  const [projectShellSection, setProjectShellSection] = useState<ProjectShellSection>('overview');
  const { activeTab, graph, hasService, projects, activeProjectId, saveStatus, handleSave, handleImport, handleExport, createService, loadDemoService,
    isCreateStageOpen, setIsCreateStageOpen, stageDraft, setStageDraft, createStage,
    showShortcuts, setShowShortcuts, toast } = studio;


  const currentProject = projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? null;
  const projectTitle = currentProject?.title || graph.service.name || 'Projeto';
  const isGlobalScope = !projectShellOpen;
  const isGlobalHome = isGlobalScope && activeTab === 'home' && !externalNav;
  const isProjectHome = activeTab === 'home' && !externalNav && projectShellOpen;
  const isProjectContext = Boolean(currentProject) && projectShellOpen;
  const isPrimaryLibrary = activeTab === 'context' && !externalNav;
  const isPrimaryResearch = activeTab === 'canvas' && !externalNav && serviceWorkspaceTab === 'research';

  const libraryTitles: Record<WorkspaceLibraryPage, string> = {
    hierarchies: 'Hierarquias', personas: 'Personas', needs: 'Necessidades', jobs: 'Jobs', pains: 'Dores', hypotheses: 'Hipóteses', problems: 'Problemas', evidence: 'Evidências', portfolio: 'Oportunidades', metrics: 'Catálogo de métricas', templates: 'Templates', archive: 'Arquivo',
  };

  const externalView = externalNav ? ({
    research: { group: 'Entender', title: 'Pesquisa', description: 'Centralize fontes, evidências e insights ligados ao Service Graph.' },
    intelligence: { group: 'Entender', title: 'Inteligência', description: 'Conecte oportunidades, métricas, responsabilidades e execução.' },
    benefits: { group: 'Melhorar', title: 'Benefícios', description: 'Acompanhe resultados, riscos e realização de valor.' },
    review: { group: 'Operar', title: 'Revisão', description: 'Conduza a cadência de decisões e governança do serviço.' },
    simulation: { group: 'Operar', title: 'Simulação prática', description: 'Teste o serviço em um cenário estruturado sem alterar a fonte de verdade.' },
    collaboration: { group: 'Workspace', title: 'Colaboração', description: 'Comentários, presença, membros e preparação para sincronização cloud.' },
    settings: { group: 'Workspace', title: 'Configurações', description: 'Preferências do workspace, interface e dados locais.' },
  } as Record<string, { group: string; title: string; description: string }>)[externalNav] : null;

  const activeViewTitle = externalView?.title ?? (
    isProjectHome
      ? (projectShellSection === 'library' ? 'Biblioteca' : 'Visão geral do projeto')
      : isGlobalHome
      ? 'Home'
      : activeTab === 'context' && !externalNav
        ? libraryTitles[libraryPage]
      : activeTab === 'whiteboards' && !externalNav
        ? 'Whiteboards'
        : activeTab === 'journey' && !externalNav
          ? 'Jornadas'
          : activeTab === 'canvas' && !externalNav
          ? 'Design do serviço'
          : 'Plano de Ação'
  );

  const showDesignSystem = new URLSearchParams(window.location.search).get('design-system') === '1';
  if (showDesignSystem) return <DesignSystemView />;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      document.body.classList.add('bo1179-workspace-ready', 'bo1205h3-workspace-ia');
      window.dispatchEvent(new CustomEvent('rt-app-ready'));
    });
    return () => {
      cancelAnimationFrame(frame);
      document.body.classList.remove('bo1179-workspace-ready', 'bo1205h3-workspace-ia');
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle('bo1175-mobile-nav-open', isMobileNavOpen);
    return () => document.body.classList.remove('bo1175-mobile-nav-open');
  }, [isMobileNavOpen]);

  useEffect(() => {
    try { localStorage.setItem('bo-sidebar-collapsed', isSidebarCollapsed ? '1' : '0'); } catch { /* local preference only */ }
    document.body.classList.toggle('bo-h724-sidebar-collapsed', isSidebarCollapsed);
    const resize = () => {
      const width = window.innerWidth <= 700 ? 0 : isSidebarCollapsed ? 64 : 216;
      for (const name of ['--bo-sidebar-w', '--rt-sidebar']) document.documentElement.style.setProperty(name, `${width}px`);
    };
    resize(); window.addEventListener('resize', resize);
    const change = (event: Event) => setIsSidebarCollapsed(Boolean((event as CustomEvent<{ collapsed: boolean }>).detail.collapsed));
    window.addEventListener('bo-native-sidebar', change);
    return () => { document.body.classList.remove('bo-h724-sidebar-collapsed'); window.removeEventListener('resize', resize); window.removeEventListener('bo-native-sidebar', change); };
  }, [isSidebarCollapsed]);

  useEffect(() => {
    const dismiss = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      document.querySelectorAll<HTMLDetailsElement>('.bo-simple-project-actions[open]').forEach(menu => {
        if (event instanceof MouseEvent && menu.contains(event.target as Node)) return;
        menu.open = false;
        if (event instanceof KeyboardEvent) menu.querySelector<HTMLElement>('summary')?.focus();
      });
    };
    document.addEventListener('click', dismiss); document.addEventListener('keydown', dismiss);
    return () => { document.removeEventListener('click', dismiss); document.removeEventListener('keydown', dismiss); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem('bo-sidebar-sections', JSON.stringify(collapsedSidebarSections)); } catch { /* local preference only */ }
  }, [collapsedSidebarSections]);

  const toggleSidebarSection = (section: 'design' | 'context' | 'management') => {
    setCollapsedSidebarSections((current) => ({ ...current, [section]: !current[section] }));
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);


  useEffect(() => { setIsMobileNavOpen(false); }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'context') return;
    const kind = sessionStorage.getItem('bo-context-kind');
    const mapped: Record<string, WorkspaceLibraryPage> = {
      persona: 'personas', need: 'needs', job: 'jobs', pain: 'pains', problemHypothesis: 'hypotheses', problem: 'problems', evidence: 'evidence', metric: 'metrics',
    };
    if (kind && mapped[kind]) setLibraryPage(mapped[kind]);
  }, [activeTab]);

  useEffect(() => {
    if (externalNav) return;
    document.body.dataset.boActiveView = activeTab;
    hideLegacyPageSurfaces();
    const frame = requestAnimationFrame(hideLegacyPageSurfaces);
    return () => cancelAnimationFrame(frame);
  }, [activeTab, externalNav]);

  const activeViewDescription = externalView?.description ?? (
    isProjectHome
      ? (projectShellSection === 'library' ? 'Contexto e objetos reutilizáveis do projeto.' : 'Visão geral do projeto, serviço principal e áreas de trabalho.')
      : isGlobalHome
      ? 'Projetos, favoritos, recentes e templates do Blue Ocean.'
      : activeTab === 'context' && !externalNav
        ? `${libraryTitles[libraryPage]} como área própria do workspace, com listagem, busca e criação dedicada.`
      : activeTab === 'whiteboards' && !externalNav
        ? 'Crie quadros livres e reutilize objetos existentes da Context Library sem duplicá-los.'
        : activeTab === 'journey' && !externalNav
          ? 'Construa a jornada por etapas, reorganize o fluxo e detalhe cada momento no Inspector lateral.'
        : activeTab === 'canvas' && !externalNav
          ? 'Desenhe, valide e opere o serviço com o caminho guiado e suas capacidades conectadas.'
          : 'Transforme oportunidades mapeadas em tarefas de execução.'
  );

  const handleSidebarWaveInteraction = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const button = target.closest('button');
    if (!(button instanceof HTMLButtonElement) || button.disabled || !event.currentTarget.contains(button)) return;
    const sidebar = event.currentTarget.closest('aside');
    if (!(sidebar instanceof HTMLElement)) return;

    const sidebarRect = sidebar.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const rawOrigin = buttonRect.top - sidebarRect.top + buttonRect.height / 2;
    const originY = Math.max(42, Math.min(sidebarRect.height - 44, rawOrigin));
    sidebar.style.setProperty('--bo-wave-origin-y', `${originY}px`);

    sidebar.classList.remove('is-wave-reacting');
    button.classList.remove('is-wave-source');
    void sidebar.offsetWidth;
    sidebar.classList.add('is-wave-reacting');
    button.classList.add('is-wave-source');

    if (sidebarWaveTimerRef.current !== null) window.clearTimeout(sidebarWaveTimerRef.current);
    sidebarWaveTimerRef.current = window.setTimeout(() => {
      sidebar.classList.remove('is-wave-reacting');
      button.classList.remove('is-wave-source');
      sidebarWaveTimerRef.current = null;
    }, 780);
  };

  const openGlobalHome = (section: ProjectHomeSection = 'home') => {
    setProjectShellOpen(false);
    setProjectHomeSection(section);
    setExternalNav(null);
    setIsMobileNavOpen(false);
    hideLegacyPageSurfaces();
    window.dispatchEvent(new CustomEvent('rt-navigation', { detail: 'home' }));
  };

  const selectCore = (tab: typeof activeTab) => {
    setProjectShellOpen(true);
    setExternalNav(null);
    setIsMobileNavOpen(false);
    hideLegacyPageSurfaces();
    window.dispatchEvent(new CustomEvent('rt-navigation', { detail: tab }));
  };

  const openLibraryPage = (page: WorkspaceLibraryPage) => {
    setProjectShellOpen(true);
    setLibraryPage(page);
    setExternalNav(null);
    setIsMobileNavOpen(false);
    hideLegacyPageSurfaces();
    window.dispatchEvent(new CustomEvent('rt-navigation', { detail: 'context' }));
  };

  const openPrimaryLibraryPage = (page: WorkspaceLibraryPage) => {
    // H7.40-H13: preserve project context; the sidebar is global and persistent.
    // Outside a project this remains false; inside a project it remains true.

    setLibraryPage(page);
    setExternalNav(null);
    setIsMobileNavOpen(false);
    hideLegacyPageSurfaces();
    window.dispatchEvent(new CustomEvent('rt-navigation', { detail: 'context' }));
  };


  useEffect(() => {
    const openContextPage = (event: Event) => {
      const page = (event as CustomEvent<WorkspaceLibraryPage>).detail;
      if (!page) return;
      if (projectShellOpen) openLibraryPage(page); else openPrimaryLibraryPage(page);
    };
    window.addEventListener('bo-open-context-page', openContextPage);
    return () => window.removeEventListener('bo-open-context-page', openContextPage);
  }, [projectShellOpen]);

  useEffect(() => {
    const requestCreateService = () => {
      setServiceName('');
      setServiceDescription('');
      setIsCreateServiceOpen(true);
    };
    window.addEventListener('bo-create-service', requestCreateService);
    return () => window.removeEventListener('bo-create-service', requestCreateService);
  }, []);

  const submitService = () => {
    if (!createService(serviceName, serviceDescription)) return;
    setIsCreateServiceOpen(false);
    setServiceName('');
    setServiceDescription('');
  };

  const requestServiceCreation = () => window.dispatchEvent(new CustomEvent('bo-create-service'));

  const openServiceWorkspaceTab = (tab: string) => {
    if (tab === 'research') { openPrimaryLibraryPage('personas'); return; }
    setProjectShellOpen(true);
    setServiceWorkspaceTab(tab);
    try { sessionStorage.setItem('bo-service-workspace-tab', tab); } catch { /* local navigation preference */ }
    selectCore('canvas');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: tab })), 0);
  };

  const openCurrentProjectHome = (section: ProjectShellSection = 'overview') => {
    setProjectShellSection(section);
    setProjectShellOpen(true);
    setExternalNav(null);
    setIsMobileNavOpen(false);
    hideLegacyPageSurfaces();
    window.dispatchEvent(new CustomEvent('rt-navigation', { detail: 'home' }));
  };

  const openProjectLibraryHub = () => openCurrentProjectHome('library');

  const openCurrentProjectWorkspace = () => {
    setProjectShellOpen(true);
    setProjectHomeSection('home');
    openServiceWorkspaceTab('overview');
  };

  useEffect(() => {
    const changed = (event: Event) => { const target = String((event as CustomEvent<string>).detail || 'overview'); setServiceWorkspaceTab(target === 'research' ? 'overview' : target); };
    window.addEventListener('bo-service-workspace-tab-changed', changed);
    return () => window.removeEventListener('bo-service-workspace-tab-changed', changed);
  }, []);

  const openExternal = (key: string, apiName: string, arg?: string) => {
    setExternalNav(key);
    setIsServiceMenuOpen(false);
    setIsMobileNavOpen(false);
    const open = () => {
      const api = window.BlueOceanRuntime?.api<{ show(value?: string): void }>(apiName);
      if (api?.show) { api.show(arg); return true; }
      return false;
    };
    if (!open()) window.setTimeout(open, 120);
  };





  const openGuidance = () => {
    const api = window.BlueOceanRuntime?.api<{ help(): void; open(): void }>('guidedBuilder');
    if (api?.help) api.help(); else api?.open?.();
  };

  return (
    <div data-blue-ocean-identity="7.13" data-adaptive-home="7.14" data-ocean-home="7.15" data-object-language="7.16" data-ocean-surface="7.17" data-animated-ocean-branding="7.18" data-journey-cover-system="7.18-H1" data-motion-identity="7.19" data-visual-recovery="7.19-H1" data-dashboard-composition="7.20" data-dashboard-recovery="7.20-H1" data-journey-workspace="7.21" data-unified-service-workspace="7.22" data-journey-editor-ux="7.23" data-journey-library-sidebar="7.24" data-research-studio="7.26" data-project-shell="7.40-H10" data-service-first-navigation="7.40-H11" data-primary-sidebar-project-switch="7.40-H12" data-persistent-global-sidebar="7.40-H13" data-interaction-accessibility-polish="7.40-H14" data-usage-relations="7.40-H15.2" data-design-service-ux="7.40-H15.3" data-design-service-visual="7.40-H15.4" data-discovery-ux="7.40-H15.5" data-research-ux="7.40-H15.6" data-adaptive-experience="H16" data-foundation-deep-adaptation="H16.1" data-research-driven-context="H16.2" data-phase-status-consistency="H16.3" data-design-service-proposal="H16.4" data-research-proposal="H16.5" data-research-proposal-hotfix="H16.5.1" data-research-workflow-ux="H16.6" data-research-flow-polish="H16.7" data-flexible-discovery="H16.7" data-design-start-choice="H16.8" data-single-experience="H17" data-experience-level={experience.level} data-experience-density={experience.meta.density} className="bo1187-app-shell min-h-screen h-screen bg-slate-50 font-sans flex overflow-hidden">
      <a className="bo1175-skip-link" href="#bo-main-content">Pular para o conteúdo</a>
      <button type="button" className="bo1175-mobile-scrim" aria-label="Fechar navegação" tabIndex={isMobileNavOpen ? 0 : -1} onClick={() => setIsMobileNavOpen(false)} />
      <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" aria-label="Selecionar backup completo" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImport(file); event.target.value = ''; }} />
      <aside data-bo-precision-sidebar-native="1" data-project-scope={isGlobalScope ? "global" : "project"} data-sidebar-collapsed={isSidebarCollapsed ? "1" : "0"} className={`bo1175-sidebar rt182-host-sidebar bo1205h3-sidebar bo-h724-sidebar w-20 shrink-0 bg-white border-r border-slate-200 flex flex-col z-30 ${isSidebarCollapsed ? 'is-collapsed' : ''}`}>
        <div className="rt182-host-brand bo-h724-sidebar-brand h-[73px] px-4 md:px-5 border-b border-slate-200 flex items-center gap-3 shrink-0">
          <div className="bg-blue-600 p-2 rounded-lg text-white shrink-0">
            <img src="/blue-ocean-mark.svg" alt="" className="h-[22px] w-[22px]" aria-hidden="true" />
          </div>
          <div className="hidden md:block min-w-0">
            <h1 className="font-bold text-slate-800 tracking-tight leading-tight truncate">
              BLUE OCEAN
            </h1>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
              Service Studio
            </p>
          </div>
        </div>

        <div className="bo1163-service-context relative px-2.5 pt-2.5" data-project-context="7.40-H10" data-persistent-switcher="7.40-H13">
          <button type="button" className="bo1163-service-switcher bo-h740h13-persistent-switcher" onClick={() => setIsServiceMenuOpen((value) => !value)} aria-haspopup="menu" aria-expanded={isServiceMenuOpen} title="Serviço e projetos">
            <span className="bo1163-service-switcher__mark"><span /></span>
            <span className="bo1163-service-switcher__copy"><small>{projectShellOpen ? 'Projeto atual' : 'Serviço'}</small><strong>{currentProject?.serviceName || graph.service.name || 'Serviço'}</strong><em>{projectShellOpen ? projectTitle : 'Abrir projetos'}</em></span>
            <ChevronsUpDown size={14} />
          </button>
          <button type="button" className="bo-h724-sidebar-toggle" onClick={() => setIsSidebarCollapsed(value => !value)} aria-label={isSidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'} aria-expanded={!isSidebarCollapsed} aria-controls="bo-primary-navigation" title={isSidebarCollapsed ? 'Expandir navegação · Ctrl+\\' : 'Recolher navegação · Ctrl+\\'}>{isSidebarCollapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</button>
          {isServiceMenuOpen && <div className="bo1163-service-menu bo-h740h13-project-menu" role="menu">
            <div className="bo1163-service-menu__label">Projetos do serviço</div>
            {projects.slice(0, 6).map((project) => <button type="button" role="menuitem" key={project.id} className={project.id === activeProjectId ? 'active' : ''} onClick={() => { setIsServiceMenuOpen(false); if (project.id !== activeProjectId) studio.openWorkspaceProject(project.id); window.setTimeout(() => openCurrentProjectHome('overview'), 0); }}><span><strong>{project.title}</strong><small>{project.serviceName}</small></span>{project.id === activeProjectId && <CheckCircle2 size={15}/>}</button>)}
            <button type="button" role="menuitem" onClick={() => { setIsServiceMenuOpen(false); openGlobalHome('projects'); }}><span><strong>Todos os projetos</strong><small>Abrir a área Serviço</small></span></button>
            <button type="button" role="menuitem" onClick={() => { setIsServiceMenuOpen(false); openGlobalHome('templates'); }}><span><strong>+ Novo projeto</strong><small>Comece vazio ou use um template.</small></span></button>
          </div>}
          <span className="sr-only bo-h740h11-legacy-switcher"><strong>Serviço</strong><em>Projetos de serviço</em></span>
        </div>
        <nav id="bo-primary-navigation" className="bo-h701-sidebar-nav flex-1 overflow-y-auto" aria-label="Navegação principal" onClickCapture={handleSidebarWaveInteraction}>
          <button type="button" aria-label="Home" title="Home" className={`bo1205h3-nav-root bo-h701-dashboard-link ${isGlobalHome && projectHomeSection === 'home' ? 'is-active' : ''}`} onClick={() => openGlobalHome('home')} aria-current={isGlobalHome && projectHomeSection === 'home' ? 'page' : undefined}>
            <span className="bo-h718-sidebar-icon bo-h719-sidebar-icon" data-icon-kind="dashboard"><BlueOceanUtilityIcon kind="dashboard" size={16}/></span><span className="hidden md:inline">Home</span>
          </button>

          <span className="sr-only bo-h740h11-legacy-global-projects" aria-hidden="true">Projetos · Todos os projetos</span>
          {/* H7.40-H13: a sidebar principal é persistente em Home, Serviço e dentro dos projetos. */}
          <div data-persistent-global-nav="7.40-H13">
            {experience.level === 'foundation' && <div className="bo-h161-foundation-nav" data-foundation-navigation="H16.1" data-research-driven-context-nav="H16.2">
              <section><strong>ENTENDER</strong>
                <button type="button" onClick={() => openPrimaryLibraryPage('personas')}><BlueOceanObjectIcon kind="persona" size={16}/><span>Público-alvo</span></button>
              </section>
              <section><strong>DESENHAR</strong>
                <button type="button" className={activeTab === 'canvas' && serviceWorkspaceTab === 'journey' ? 'is-active' : ''} onClick={() => openServiceWorkspaceTab('journey')}><BlueOceanObjectIcon kind="journey" size={16}/><span>Jornada</span></button>
                <button type="button" className={activeTab === 'canvas' && serviceWorkspaceTab === 'blueprint' ? 'is-active' : ''} onClick={() => openServiceWorkspaceTab('blueprint')}><BlueOceanObjectIcon kind="blueprint" size={16}/><span>Como o serviço funciona</span></button>
                <button type="button" data-blue-ocean-whiteboard-nav="foundation" aria-label="Abrir Whiteboard pelo menu de desenho" className={activeTab === 'canvas' && serviceWorkspaceTab === 'whiteboard' ? 'is-active' : ''} onClick={() => openServiceWorkspaceTab('whiteboard')}><BlueOceanObjectIcon kind="whiteboard" size={16}/><span>Whiteboard</span></button>
              </section>
              <section><strong>TESTAR</strong>
                <button type="button" className={activeTab === 'canvas' && serviceWorkspaceTab === 'prototypes' ? 'is-active' : ''} onClick={() => openServiceWorkspaceTab('prototypes')}><BlueOceanObjectIcon kind="experiment" size={16}/><span>Protótipos</span></button>
              </section>
              <section><strong>MELHORAR</strong>
                <button type="button" className={activeTab === 'canvas' && serviceWorkspaceTab === 'portfolio' ? 'is-active' : ''} onClick={() => openServiceWorkspaceTab('portfolio')}><BlueOceanObjectIcon kind="task" size={16}/><span>Melhorias</span></button>
              </section>
              <section><strong>ACOMPANHAR</strong>
                <button type="button" className={activeTab === 'canvas' && serviceWorkspaceTab === 'outcomes' ? 'is-active' : ''} onClick={() => openServiceWorkspaceTab('outcomes')}><BlueOceanObjectIcon kind="metric" size={16}/><span>Resultados</span></button>
              </section>
            </div>}
            <div className={experience.level === 'foundation' ? 'bo-h161-standard-nav is-hidden' : 'bo-h161-standard-nav'}>
            <div className={`bo-h701-nav-section bo-h740h12-primary-design ${collapsedSidebarSections.design ? 'is-section-collapsed' : ''}`} data-sidebar-section="design">
              <button type="button" className="bo-h701-nav-section__label bo-h740h14-section-toggle hidden md:flex" aria-expanded={!collapsedSidebarSections.design} onClick={() => toggleSidebarSection('design')}><span>Desenho do serviço</span><span aria-hidden="true">{collapsedSidebarSections.design ? '+' : '−'}</span></button>
              <div className="bo-h740h14-section-items" hidden={!isSidebarCollapsed && collapsedSidebarSections.design}>
              <button type="button" data-service-projects-nav="1" data-unified-service-workspace-nav="1" title="Serviço" aria-label="Serviço" aria-current={isGlobalHome && projectHomeSection === 'projects' ? 'page' : undefined} className={`bo1205h3-nav-child ${isGlobalHome && projectHomeSection === 'projects' ? 'is-active' : ''}`} onClick={() => openGlobalHome('projects')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="service" size={16}/></span><span className="hidden md:inline">Serviço</span></button>
              <button type="button" data-blue-ocean-whiteboard-nav="standard" title="Whiteboard" aria-label="Abrir Whiteboard pelo menu principal" aria-current={activeTab === 'canvas' && serviceWorkspaceTab === 'whiteboard' && !externalNav ? 'page' : undefined} className={`bo1205h3-nav-child ${activeTab === 'canvas' && serviceWorkspaceTab === 'whiteboard' && !externalNav ? 'is-active' : ''}`} onClick={() => openServiceWorkspaceTab('whiteboard')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="whiteboard" size={16}/></span><span className="hidden md:inline">Whiteboard</span></button>
              <span className="sr-only" data-unified-service-workspace-legacy="1"><span>Journey maps</span><span>Whiteboards</span><span>Blueprints</span></span>
              <button type="button" data-experience-nav="expanded" title="Hierarquias" aria-label="Hierarquias" aria-current={isPrimaryLibrary && libraryPage === 'hierarchies' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'hierarchies' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('hierarchies')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanUtilityIcon kind="hierarchy" size={16}/></span><span className="hidden md:inline">Hierarquias</span></button>
              </div>
            </div>

            <div className={`bo-h701-nav-section bo-h740h12-primary-context ${collapsedSidebarSections.context ? 'is-section-collapsed' : ''}`} data-sidebar-section="context">
              <button type="button" className="bo-h701-nav-section__label bo-h740h14-section-toggle hidden md:flex" aria-expanded={!collapsedSidebarSections.context} onClick={() => toggleSidebarSection('context')}><span>Público-alvo</span><span aria-hidden="true">{collapsedSidebarSections.context ? '+' : '−'}</span></button>
              <div className="bo-h740h14-section-items" hidden={!isSidebarCollapsed && collapsedSidebarSections.context}>
              <button type="button" title="Personas" aria-label="Personas" aria-current={isPrimaryLibrary && libraryPage === 'personas' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'personas' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('personas')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="persona" size={16}/></span><span className="hidden md:inline">Personas</span></button>
              <button type="button" title="Necessidades" aria-label="Necessidades" aria-current={isPrimaryLibrary && libraryPage === 'needs' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'needs' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('needs')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="need" size={16}/></span><span className="hidden md:inline">Necessidades</span></button>
              <button type="button" data-experience-nav="expanded" title="Jobs" aria-label="Jobs" aria-current={isPrimaryLibrary && libraryPage === 'jobs' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'jobs' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('jobs')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="job" size={16}/></span><span className="hidden md:inline">Jobs</span></button>
              <button type="button" title="Dores" aria-label="Dores" aria-current={isPrimaryLibrary && libraryPage === 'pains' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'pains' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('pains')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="pain" size={16}/></span><span className="hidden md:inline">Dores</span></button>
              <button type="button" data-experience-nav="expanded" title="Hipóteses" aria-label="Hipóteses" aria-current={isPrimaryLibrary && libraryPage === 'hypotheses' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'hypotheses' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('hypotheses')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="problemHypothesis" size={16}/></span><span className="hidden md:inline">Hipóteses</span></button>
              <button type="button" title="Problemas" aria-label="Problemas" aria-current={isPrimaryLibrary && libraryPage === 'problems' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'problems' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('problems')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="problem" size={16}/></span><span className="hidden md:inline">Problemas</span></button>
              <button type="button" title="Evidências" aria-label="Evidências" aria-current={isPrimaryLibrary && libraryPage === 'evidence' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'evidence' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('evidence')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="evidence" size={16}/></span><span className="hidden md:inline">Evidências</span></button>
              </div>
            </div>

            <div className={`bo-h701-nav-section bo-h740h12-primary-management ${collapsedSidebarSections.management ? 'is-section-collapsed' : ''}`} data-sidebar-section="management">
              <button type="button" className="bo-h701-nav-section__label bo-h740h14-section-toggle hidden md:flex" aria-expanded={!collapsedSidebarSections.management} onClick={() => toggleSidebarSection('management')}><span>Gestão</span><span aria-hidden="true">{collapsedSidebarSections.management ? '+' : '−'}</span></button>
              <div className="bo-h740h14-section-items" hidden={!isSidebarCollapsed && collapsedSidebarSections.management}>
              <button type="button" title="Oportunidades" aria-label="Oportunidades" aria-current={isPrimaryLibrary && libraryPage === 'portfolio' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'portfolio' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('portfolio')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanUtilityIcon kind="portfolio" size={16}/></span><span className="hidden md:inline">Oportunidades</span></button>
              <button type="button" data-experience-nav="expanded" title="Catálogo de métricas" aria-label="Catálogo de métricas" aria-current={isPrimaryLibrary && libraryPage === 'metrics' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'metrics' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('metrics')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanObjectIcon kind="metric" size={16}/></span><span className="hidden md:inline">Catálogo de métricas</span></button>
              {/* Pesquisa histórica preservada no grafo, mas retirada da navegação principal. */}
              <button type="button" data-experience-nav="expanded" title="Templates" aria-label="Templates" aria-current={isPrimaryLibrary && libraryPage === 'templates' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'templates' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('templates')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanUtilityIcon kind="template" size={16}/></span><span className="hidden md:inline">Templates</span></button>
              <button type="button" data-experience-nav="expanded" title="Arquivo" aria-label="Arquivo" aria-current={isPrimaryLibrary && libraryPage === 'archive' ? 'page' : undefined} className={`bo1205h3-nav-child ${isPrimaryLibrary && libraryPage === 'archive' ? 'is-active' : ''}`} onClick={() => openPrimaryLibraryPage('archive')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon"><BlueOceanUtilityIcon kind="archive" size={16}/></span><span className="hidden md:inline">Arquivo</span></button>
              </div>
            </div>
            </div>
          </div>
          <span className="sr-only bo-h740h10-legacy-project-nav" data-h740h10-legacy="1">Desenho do serviço Hierarquias Contexto Personas Necessidades Jobs Dores Hipóteses Problemas Evidências Gestão Oportunidades Catálogo de métricas Aplicar template Equipe do projeto Configurações do projeto Journey maps Whiteboards Blueprints</span>
          {/* H7.40-H12 compatibility markers only: {!isProjectContext && <> · {isProjectContext && <> · bo-h740h10-project-nav */}

          <div className="bo1205h3-sidebar-bottom bo-h701-sidebar-bottom">
            <button type="button" data-rt-collab-nav="1" className={externalNav === 'collaboration' ? 'is-active' : ''} onClick={() => openExternal('collaboration', 'collaboration', 'workspace')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon" data-icon-kind="collaboration"><BlueOceanUtilityIcon kind="collaboration" size={16}/></span><span className="hidden md:inline">Colaboração</span></button>
            <button type="button" data-bo1173-settings-nav="1" className={externalNav === 'settings' ? 'is-active' : ''} onClick={() => openExternal('settings', 'unifiedWorkspaces')}><span className="bo-h718-sidebar-icon bo-h719-sidebar-icon" data-icon-kind="settings"><BlueOceanUtilityIcon kind="settings" size={16}/></span><span className="hidden md:inline">Configurações</span></button>
          </div>
        </nav>

        <div className="bo-h701-sidebar-wave" aria-hidden="true">
          <svg viewBox="0 0 320 86" preserveAspectRatio="none" role="presentation">
            <path className="bo-h701-wave-back" d="M-80 48 C-20 18 36 76 96 46 S212 18 272 46 S388 74 448 44 V86 H-80 Z" />
            <path className="bo-h701-wave-front" d="M-96 58 C-28 34 32 78 98 56 S224 32 288 56 S412 78 480 54 V86 H-96 Z" />
          </svg>
        </div>

        <div className="rt182-host-footer p-3 md:p-4 border-t border-slate-200">
          <div className="hidden md:block rounded-lg bg-slate-50 border border-slate-200 px-3 py-3">
            <p className="text-xs font-semibold text-slate-700 truncate">{isGlobalScope ? 'Blue Ocean' : projectTitle}</p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{isGlobalScope ? `${projects.length} projeto${projects.length === 1 ? '' : 's'}` : graph.service.name}</p>
          </div>
          <div className="bo1187-sidebar-footer">
            <button type="button" onClick={() => openExternal('settings', 'unifiedWorkspaces')}>Configurações</button>
            <button type="button" onClick={() => openExternal('collaboration', 'collaboration', 'workspace')}>Equipe</button>
            <small>{`V${APP_VERSION}`}</small>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header data-bo-precision-header-native="1" data-header-mode={activeTab === 'canvas' && !externalNav ? 'compact-tool' : 'standard'} className={`bo1175-header rt182-host-header h-[73px] bg-white border-b border-slate-200 shrink-0 px-5 md:px-7 flex items-center justify-between gap-4 z-20 ${isGlobalScope ? 'bo1187-dashboard-header' : ''} ${activeTab === 'canvas' && !externalNav ? 'bo-h740h14-compact-app-header' : ''}`}>
          {isGlobalScope ? <>
            <div className="flex items-center min-w-0">
              <button type="button" className="bo1175-mobile-menu" onClick={() => setIsMobileNavOpen(true)} aria-label="Abrir navegação" aria-expanded={isMobileNavOpen}><Menu size={20} /></button>
              <h2 className="bo1187-dashboard-header__title">{activeTab === 'context' && !externalNav ? libraryTitles[libraryPage] : isPrimaryResearch ? 'Pesquisa' : projectHomeSection === 'home' ? 'Home' : projectHomeSection === 'projects' ? 'Serviço' : 'Templates'}</h2>
            </div>
            <div className="bo1187-dashboard-header__actions">
              <span data-bo-global-search-native="1" className="sr-only" aria-hidden="true" />
              <span data-bo-global-create-native="1" className="sr-only" aria-hidden="true" />
              {hasService && <button type="button" onClick={openGuidance} title="Assistência guiada" aria-label="Abrir assistência guiada"><CircleHelp size={17} /></button>}
              {hasService && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('bo-dashboard-architecture'))} title="Arquitetura do serviço" aria-label="Abrir arquitetura do serviço"><Rocket size={17} /></button>}
              {hasService && <button type="button" data-alerts={Object.values(graph.tasks).filter((task) => task.status !== 'done').length > 0 ? '1' : '0'} onClick={() => window.dispatchEvent(new CustomEvent('bo-dashboard-attention'))} title="Central de atenção" aria-label="Abrir central de atenção"><Bell size={17} /></button>}
              {authUser && <div className="bo1178-account">
                <button type="button" className="bo1178-account__trigger bo1187-dashboard-header__avatar" onClick={() => setIsAccountMenuOpen((value) => !value)} aria-haspopup="menu" aria-expanded={isAccountMenuOpen} title={authUser.email || authUser.name}>{authUser.name.slice(0, 2).toUpperCase()}</button>
                {isAccountMenuOpen && <div className="bo1178-account__menu" role="menu"><div><strong>{authUser.name}</strong><small>{authUser.email || 'Sessão local'}</small></div><button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); onSignOut?.(); }}><LogOut size={14} /> Sair</button></div>}
              </div>}
            </div>
          </> : <>
            <button type="button" className="bo1175-mobile-menu" onClick={() => setIsMobileNavOpen(true)} aria-label="Abrir navegação" aria-expanded={isMobileNavOpen}><Menu size={20} /></button>
            <div className="bo1163-header-copy min-w-0">
              <nav className="bo1163-breadcrumbs" aria-label="Breadcrumb">
                <button type="button" onClick={() => openGlobalHome('home')}>Home</button>
                <span aria-hidden="true">›</span><button type="button" onClick={() => openGlobalHome('projects')}>Serviço</button>
                <span aria-hidden="true">›</span><button type="button" onClick={() => openCurrentProjectHome('overview')}>{projectTitle}</button>
                <span aria-hidden="true">›</span><strong>{activeViewTitle}</strong>
              </nav>
              <h2 className="truncate">{activeViewTitle}</h2>
              <p className="sr-only">{activeViewDescription}</p>
            </div>

            <div className="relative flex items-center gap-1.5 shrink-0">
              <button type="button" className="bo1188-header-help" onClick={openGuidance} title="Ajuda contextual"><CircleHelp size={15} /><span className="hidden lg:inline">Ajuda</span></button>
              <button type="button" data-bo-global-search-native="1" onClick={() => window.BlueOceanRuntime?.api<{ open(): void }>('globalNavigation')?.open?.()} className="bo115-search-trigger" title="Busca global · Ctrl+K" aria-label="Abrir busca global"><Search size={15} /><span>Buscar</span><kbd>Ctrl K</kbd></button>
              <button type="button" onClick={handleSave} className={`bo1163-save-status bo-h740h14-save-status ${saveStatus}`} role="status" aria-live="polite" title="Salvamento automático e local deste projeto">
                {saveStatus === 'saving' ? <Loader2 size={13} className="animate-spin" /> : saveStatus === 'error' ? <AlertCircle size={13} /> : <CheckCircle2 size={13} />}
                <span>{saveStatus === 'saving' ? 'Salvando…' : saveStatus === 'error' ? 'Não foi possível salvar' : 'Salvo neste dispositivo'}</span>
              </button>
              <details className="bo-simple-project-actions" onClick={event => { if ((event.target as HTMLElement).closest('button')) event.currentTarget.open = false; }}>
                <summary aria-label="Ações do projeto" title="Backup e salvamento"><MoreHorizontal size={18}/></summary>
                <div role="group" aria-label="Backup e salvamento do projeto">
              <button type="button" onClick={() => importInputRef.current?.click()} className="tool-button text-xs" title="Importar backup completo"><Upload size={15} /><span className="hidden sm:inline">Importar</span></button>
              <button type="button" onClick={handleExport} className="tool-button text-xs" title="Exportar backup completo"><Download size={15} /><span className="hidden sm:inline">Exportar</span></button>
              <button type="button" onClick={handleSave} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-sm whitespace-nowrap" title="Salvar agora"><Save size={17} /><span className="hidden sm:inline">Salvar</span></button>
                </div>
              </details>
              {authUser && <div className="bo1178-account">
                <button type="button" className="bo1178-account__trigger" onClick={() => setIsAccountMenuOpen((value) => !value)} aria-haspopup="menu" aria-expanded={isAccountMenuOpen} title={authUser.email || authUser.name}><span>{authUser.name.slice(0, 1).toUpperCase()}</span><UserRound size={14} /></button>
                {isAccountMenuOpen && <div className="bo1178-account__menu" role="menu"><div><strong>{authUser.name}</strong><small>{authUser.email || 'Sessão local'}</small></div><button type="button" role="menuitem" onClick={() => { setIsAccountMenuOpen(false); onSignOut?.(); }}><LogOut size={14} /> Sair</button></div>}
              </div>}
            </div>
          </>}
        </header>

        {isProjectContext && <nav className="bo-h740h13-project-context-nav" data-project-context-nav="7.40-H13" aria-label="Áreas do projeto">
          <button type="button" aria-current={isProjectHome && projectShellSection === 'overview' ? 'page' : undefined} className={isProjectHome && projectShellSection === 'overview' ? 'is-active' : ''} onClick={() => openCurrentProjectHome('overview')}><BlueOceanUtilityIcon kind="dashboard" size={14}/><span>Visão geral</span></button>
          <span className="sr-only" data-h155-nav-simplification="1">O Design do serviço está na navegação principal; Pesquisa histórica é preservada somente nos dados.</span>
          {/* H15.5 simplifica a barra contextual do projeto; contratos históricos preservados apenas para regressão:
              >Design do serviço</span>
              aria-current={activeTab === 'canvas' && !externalNav && serviceWorkspaceTab !== 'research' ? 'page' : undefined}
              onClick={() => openServiceWorkspaceTab('overview')}
          */}
          <button type="button" className={(isProjectHome && projectShellSection === 'library') || (activeTab === 'context' && !externalNav && !['archive','templates'].includes(libraryPage)) ? 'is-active' : ''} onClick={openProjectLibraryHub}><BlueOceanUtilityIcon kind="learn" size={14}/><span>Biblioteca</span></button>
          <button type="button" className={activeTab === 'context' && !externalNav && libraryPage === 'archive' ? 'is-active' : ''} onClick={() => openLibraryPage('archive')}><BlueOceanUtilityIcon kind="archive" size={14}/><span>Arquivos</span></button>
          <button type="button" className={externalNav === 'collaboration' ? 'is-active' : ''} onClick={() => openExternal('collaboration', 'collaboration', 'workspace')}><BlueOceanUtilityIcon kind="collaboration" size={14}/><span>Equipe</span></button>
          <button type="button" className={externalNav === 'settings' ? 'is-active' : ''} onClick={() => openExternal('settings', 'unifiedWorkspaces')}><BlueOceanUtilityIcon kind="settings" size={14}/><span>Configurações</span></button>
        </nav>}

        <main id="bo-main-content" data-bo-precision-workspace-native="1" data-bo-active-view={externalNav ?? activeTab} className={`flex-1 flex flex-col min-w-0 ${activeTab === 'canvas' && !externalNav ? 'overflow-hidden p-0' : activeTab === 'home' && !externalNav ? 'overflow-y-auto p-0' : 'px-4 md:px-6 overflow-y-auto'}`}>
          {isGlobalHome && <ProjectHomeView studio={studio} section={projectHomeSection} setSection={setProjectHomeSection} openProjectHome={() => openCurrentProjectHome('overview')} />}
          {isProjectHome && <ProjectShellView studio={studio} section={projectShellSection} openService={openCurrentProjectWorkspace} openWhiteboards={() => openServiceWorkspaceTab('whiteboard')} openLibraryPage={openLibraryPage} />}
          {!hasService && activeTab !== 'home' && !externalNav && <section className="bo-h740h2-service-gate" data-requested-view={activeTab}><div className="bo-h740h2-service-gate__icon"><BlueOceanObjectIcon kind="service" size={34}/></div><small>COMECE PELO SERVIÇO</small><h2>{activeViewTitle} está pronta para você</h2><p>Você pode navegar por toda a plataforma. Para criar, editar ou conectar objetos nesta área, crie primeiro o serviço que será desenhado.</p><div><button type="button" className="primary" onClick={requestServiceCreation}>Criar meu primeiro serviço</button><button type="button" onClick={() => { loadDemoService(); setExternalNav(null); }}>Explorar serviço de exemplo</button></div></section>}
          {hasService && activeTab === 'context' && !externalNav && <WorkspaceLibraryView studio={studio} page={libraryPage} />}
          {hasService && activeTab === 'whiteboards' && !externalNav && <WhiteboardsView studio={studio} />}
          {hasService && activeTab === 'journey' && !externalNav && <EditorSurface><JourneyView studio={studio} onBack={() => { selectCore('canvas'); window.setTimeout(() => window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'journey' })), 0); }}/></EditorSurface>}
          {hasService && activeTab === 'canvas' && !externalNav && <BlueprintWorkspaceView studio={studio} />}
          {hasService && activeTab === 'action' && !externalNav && <ActionPlanView studio={studio} />}
        </main>
      </div>
      <nav className="bo1175-mobile-nav" aria-label="Navegação rápida">
        <button type="button" onClick={() => openGlobalHome('home')} aria-current={isGlobalHome && projectHomeSection === 'home' ? 'page' : undefined}><BlueOceanUtilityIcon kind="dashboard" size={18}/><span>Home</span></button>
        <button type="button" onClick={() => openGlobalHome('projects')} aria-current={isGlobalHome && projectHomeSection === 'projects' ? 'page' : undefined}><BlueOceanObjectIcon kind="service" size={18}/><span>Serviço</span></button>
        {hasService && <button type="button" onClick={() => openCurrentProjectHome('overview')} aria-current={isProjectHome ? 'page' : undefined}><BlueOceanUtilityIcon kind="portfolio" size={18}/><span>Projeto</span></button>}
        {hasService && <button type="button" aria-label="Abrir Whiteboard pelo atalho móvel" onClick={() => openServiceWorkspaceTab('whiteboard')} aria-current={activeTab === 'canvas' && serviceWorkspaceTab === 'whiteboard' && !externalNav ? 'page' : undefined}><BlueOceanObjectIcon kind="whiteboard" size={18}/><span>Whiteboard</span></button>}
        {hasService && <button type="button" onClick={openCurrentProjectWorkspace} aria-current={activeTab === 'canvas' && !externalNav ? 'page' : undefined}><BlueOceanObjectIcon kind="service" size={18}/><span>Serviço</span></button>}
        {hasService && <button type="button" onClick={() => selectCore('action')} aria-current={activeTab === 'action' && !externalNav ? 'page' : undefined}><KanbanSquare size={18} /><span>Ações</span></button>}
      </nav>

      {isCreateServiceOpen && (
        <div className="bo-h740h2-service-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsCreateServiceOpen(false); }}>
          <section className="bo-h740h2-service-modal" role="dialog" aria-modal="true" aria-labelledby="bo-h740h2-service-title">
            <header><div><small>NOVO SERVIÇO</small><h2 id="bo-h740h2-service-title">O que você quer desenhar?</h2><p>Comece pelo nome do serviço. Personas, problemas, Journey, Blueprint e métricas ficarão conectados a esta mesma base.</p></div><button type="button" onClick={() => setIsCreateServiceOpen(false)} aria-label="Fechar"><X size={18}/></button></header>
            <div className="bo-h740h2-service-modal__body">
              <label><span>Nome do serviço</span><input autoFocus value={serviceName} onChange={(event) => setServiceName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && serviceName.trim()) submitService(); }} placeholder="Ex.: Coleta e entrega de lavanderia" /></label>
              <label><span>Descrição <em>opcional</em></span><textarea value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} placeholder="Qual experiência ou operação este serviço entrega?" /></label>
              <div className="bo-h740h2-service-steps"><span><b>1</b> Serviço</span><span><b>2</b> Contexto</span><span><b>3</b> Journey</span><span><b>4</b> Blueprint</span><span><b>5</b> Testar</span><span><b>6</b> Medir</span></div>
            </div>
            <footer><button type="button" onClick={() => { setIsCreateServiceOpen(false); loadDemoService(); }}>Usar exemplo</button><button type="button" className="primary" disabled={!serviceName.trim()} onClick={submitService}>Criar serviço</button></footer>
          </section>
        </div>
      )}

      {isCreateStageOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/30 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-stage-title">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] font-bold text-blue-600"><Sparkles size={13} /> Criação guiada</div>
                <h3 id="new-stage-title" className="text-lg font-bold text-slate-800 mt-1">Nova etapa da jornada</h3>
                <p className="text-sm text-slate-500 mt-1">Comece só pelo essencial. Os detalhes podem ser completados depois no Inspector.</p>
              </div>
              <button type="button" onClick={() => setIsCreateStageOpen(false)} className="p-2 rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <label className="block"><span className="text-sm font-semibold text-slate-700">Nome da etapa</span><input autoFocus value={stageDraft.title} onChange={(event) => setStageDraft((current) => ({ ...current, title: event.target.value }))} className="mt-1.5 w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex.: Avaliação" /></label>
              <label className="block"><span className="text-sm font-semibold text-slate-700">O que o cliente faz?</span><textarea value={stageDraft.customerAction} onChange={(event) => setStageDraft((current) => ({ ...current, customerAction: event.target.value }))} className="mt-1.5 w-full h-24 border border-slate-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex.: compara planos e tira dúvidas" /></label>
              <label className="block"><span className="text-sm font-semibold text-slate-700">Touchpoints iniciais <span className="font-normal text-slate-400">(opcional)</span></span><input value={stageDraft.touchpoints} onChange={(event) => setStageDraft((current) => ({ ...current, touchpoints: event.target.value }))} className="mt-1.5 w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="WhatsApp, site, loja" /></label>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateStageOpen(false)} className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-100">Cancelar</button>
              <button type="button" onClick={createStage} className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Criar etapa</button>
            </div>
          </div>
        </div>
      )}

      {showShortcuts && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="shortcuts-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowShortcuts(false); }}>
          <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between"><h3 id="shortcuts-title" className="text-lg font-bold text-slate-800">Atalhos da Jornada</h3><button type="button" onClick={() => setShowShortcuts(false)} aria-label="Fechar atalhos" className="p-2 rounded hover:bg-slate-100"><X size={18} /></button></div>
            <p className="text-xs text-slate-500 mt-1">Os atalhos funcionam fora dos campos de texto. Copiar e colar atuam dentro deste editor.</p>
            <div className="mt-5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 text-sm text-slate-700">
              {[
                ['Selecionar todas as etapas', 'Ctrl+A'], ['Selecionar várias', 'Ctrl/clique'], ['Selecionar intervalo', 'Shift/clique'],
                ['Copiar / colar', 'Ctrl+C / Ctrl+V'], ['Duplicar', 'Ctrl+D'], ['Desfazer / refazer', 'Ctrl+Z / Ctrl+Y'],
                ['Excluir seleção', 'Delete'], ['Etapa anterior / próxima', '← / →'], ['Zoom', '+ / −'], ['Sair do foco ou limpar seleção', 'Esc'],
              ].map(([label, shortcut]) => <React.Fragment key={label}><span>{label}</span><kbd className="text-xs font-semibold bg-slate-100 border border-slate-200 rounded px-2 py-1 text-slate-600">{shortcut}</kbd></React.Fragment>)}
            </div>
          </div>
        </div>
      )}

      <Toast message={toast.message} isVisible={toast.show} />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .animate-fade-in-up { animation: bo1176-toast var(--bo1176-motion-normal, 180ms ease) both; }
            .tool-button { display: inline-flex; align-items: center; justify-content: center; gap: 0.35rem; flex-shrink: 0; min-height: 32px; padding: 0.35rem 0.55rem; border: 1px solid var(--bo-color-border); border-radius: 0.5rem; background: var(--bo-color-surface); color: var(--bo-color-text-secondary); font-weight: 600; }
            .tool-button:hover:not(:disabled) { background: var(--bo-color-primary-50); color: var(--bo-color-primary-700); border-color: var(--bo-color-primary-200); }
            .tool-button:disabled { opacity: 0.38; cursor: not-allowed; }
            ::-webkit-scrollbar { height: 8px; width: 8px; }
            ::-webkit-scrollbar-track { background: var(--bo-color-surface-muted); border-radius: 4px; }
            ::-webkit-scrollbar-thumb { background: var(--bo-color-border-strong); border-radius: 4px; }
            ::-webkit-scrollbar-thumb:hover { background: var(--bo-color-text-muted); }
          `,
        }}
      />
    </div>
  );
}

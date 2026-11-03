import { useEffect, useRef, useState } from 'react';
import {
  BookOpen, Briefcase, ChartLine, Check, ChevronDown, ChevronLeft,
  ChevronRight, CircleHelp, FolderOpen, House, Layers3, LayoutTemplate, Lightbulb,
  Map, MessageSquare, Network, Plus, Search, Settings, StickyNote, Target, Users,
} from '../design-system/icons';

/**
 * H7.64 – the one and only sidebar for Blue Ocean.
 * Replaces (does not reskin) the H7.63/legacy sidebar markup.
 * All actions delegate to App.tsx's canonical Service Graph/navigation functions.
 */
export type SidebarNavKeyH764 =
  | 'home' | 'servico' | 'maps' | 'personas' | 'pains' | 'projects' | 'archive'
  | 'whiteboard' | 'needs' | 'jobs' | 'problems' | 'evidence' | 'hierarchies'
  | 'hypotheses' | 'portfolio' | 'metrics' | 'templates' | 'collaboration'
  | 'prototypes' | 'improvements' | 'outcomes' | 'settings';

type SidebarSectionH764 = 'design' | 'context' | 'management';
type Project = { id: string; title: string; serviceName?: string };

type Props = {
  collapsed: boolean;
  projectScope: 'global' | 'project';
  projectTitle: string;
  serviceName: string;
  activeProjectId: string | null;
  projects: Project[];
  activeKey: SidebarNavKeyH764;
  collapsedSections: Record<SidebarSectionH764, boolean>;
  onToggleSection: (section: SidebarSectionH764) => void;
  onToggleCollapse: () => void;
  onNavigate: (key: SidebarNavKeyH764) => void;
  onSwitchProject: (projectId: string) => void;
  onCreateProject: () => void;
};

const sections = [
  { id: 'design', title: 'Desenho do serviço', items: [
    { id: 'servico', label: 'Serviço', icon: LayoutTemplate },
    { id: 'maps', label: 'Mapas do serviço', icon: Map },
  ] },
  { id: 'context', title: 'Público-alvo', items: [
    { id: 'personas', label: 'Personas', icon: Users },
    { id: 'pains', label: 'Dores', icon: Target },
  ] },
  { id: 'management', title: 'Gestão', items: [
    { id: 'projects', label: 'Projetos', icon: Briefcase },
    { id: 'archive', label: 'Arquivo', icon: FolderOpen },
  ] },
] as const;

const extraItems = [
  { id: 'whiteboard', label: 'Whiteboard', icon: StickyNote },
  { id: 'needs', label: 'Necessidades', icon: Layers3 },
  { id: 'jobs', label: 'Jobs', icon: BookOpen },
  { id: 'problems', label: 'Problemas', icon: CircleHelp },
  { id: 'evidence', label: 'Evidências', icon: Search },
  { id: 'hierarchies', label: 'Hierarquias', icon: Network },
  { id: 'hypotheses', label: 'Hipóteses', icon: Lightbulb },
  { id: 'portfolio', label: 'Oportunidades', icon: Target },
  { id: 'metrics', label: 'Catálogo de métricas', icon: ChartLine },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'prototypes', label: 'Protótipos', icon: Layers3 },
  { id: 'improvements', label: 'Melhorias', icon: Plus },
  { id: 'outcomes', label: 'Resultados', icon: ChartLine },
  { id: 'collaboration', label: 'Colaboração', icon: MessageSquare },
] as const;

const extraIds: ReadonlySet<string> = new Set(extraItems.map(item => item.id));

export function NativeAnimatedSidebarH764({
  collapsed, projectScope, projectTitle, serviceName, activeProjectId,
  projects, activeKey, collapsedSections, onToggleSection, onToggleCollapse,
  onNavigate, onSwitchProject, onCreateProject,
}: Props) {
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(() => extraIds.has(activeKey));
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (extraIds.has(activeKey)) setExtraOpen(true);
    setSwitcherOpen(false);
  }, [activeKey, projectScope, activeProjectId]);

  useEffect(() => {
    if (!switcherOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key !== 'Escape') return;
        setSwitcherOpen(false);
        switcherRef.current?.querySelector<HTMLButtonElement>('[data-project-switcher-trigger]')?.focus();
      } else if (!switcherRef.current?.contains(event.target as Node)) setSwitcherOpen(false);
    };
    document.addEventListener('pointerdown', close as EventListener);
    document.addEventListener('keydown', close as EventListener);
    return () => {
      document.removeEventListener('pointerdown', close as EventListener);
      document.removeEventListener('keydown', close as EventListener);
    };
  }, [switcherOpen]);

  const navigate = (id: SidebarNavKeyH764) => {
    setSwitcherOpen(false);
    onNavigate(id);
  };

  const itemButton = (item: { id: SidebarNavKeyH764; label: string; icon: typeof LayoutTemplate }, extra = false) => {
    const Icon = item.icon;
    const active = activeKey === item.id;
    return <button
      key={item.id} type="button" data-sidebar-item={item.id}
      data-service-projects-nav={item.id === 'servico' ? '1' : undefined}
      data-service-journey-nav={item.id === 'maps' ? '1' : undefined}
      data-blue-ocean-whiteboard-nav={item.id === 'whiteboard' ? 'standard' : undefined}
      data-sidebar-projects-nav={item.id === 'projects' ? 'H7.64' : undefined}
      data-bo1173-settings-nav={item.id === 'settings' ? '1' : undefined}
      aria-current={active ? 'page' : undefined}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      className={`bo-h764-item ${active ? 'is-active' : ''} ${extra ? 'is-extra' : ''}`}
      onClick={() => navigate(item.id)}
    >
      <Icon size={19} strokeWidth={1.8} aria-hidden="true"/>
      <span className="bo-h764-item-label">{item.label}</span>
      {active && <span className="bo-h764-selected-marker" aria-hidden="true"/>}
    </button>;
  };

  return <aside
    data-bo-precision-sidebar-native="1"
    data-animated-sidebar="H7.64"
    data-native-sidebar-replacement="true"
    data-project-scope={projectScope}
    data-sidebar-collapsed={collapsed ? '1' : '0'}
    className={`bo1175-sidebar bo-h764-sidebar ${collapsed ? 'is-collapsed' : ''}`}
    aria-label="Navegação do Blue Ocean"
  >
    <div className="bo-h764-sidebar-header" ref={switcherRef}>
      <button className="bo-h764-project-trigger" type="button" data-project-switcher-trigger
        title={collapsed ? 'Selecionar serviço ou projeto' : undefined}
        aria-haspopup="menu" aria-expanded={switcherOpen}
        onClick={() => setSwitcherOpen(value => !value)}
      >
        <span className="bo-h764-brand-symbol" aria-hidden="true">
          <img src="/blue-ocean-mark.svg" alt=""/>
        </span>
        <span className="bo-h764-context-text">
          <strong>{projectScope === 'project' ? projectTitle : 'Novo serviço'}</strong>
          <small>{projectScope === 'project' ? serviceName : projectTitle || 'Abrir projetos'}</small>
        </span>
        {!collapsed && <ChevronDown size={15} className="bo-h764-context-arrow" aria-hidden="true"/>}
      </button>
      <button type="button" className="bo-h764-collapse-button"
        aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        aria-expanded={!collapsed} aria-controls="bo-primary-navigation"
        onClick={() => { setSwitcherOpen(false); onToggleCollapse(); }}
      >{collapsed ? <ChevronRight size={19}/> : <ChevronLeft size={19}/>}</button>

      {switcherOpen && <div className="bo-h764-project-menu" role="menu" aria-label="Projetos do serviço">
        <div className="bo-h764-project-menu-title">PROJETOS DO SERVIÇO</div>
        {projects.slice(0, 12).map(project => <button type="button" role="menuitem" key={project.id}
          onClick={() => { setSwitcherOpen(false); onSwitchProject(project.id); }}>
          <span><strong>{project.title}</strong><small>{project.serviceName || 'Serviço'}</small></span>
          {activeProjectId === project.id && <Check size={15} aria-hidden="true"/>}
        </button>)}
        <button type="button" role="menuitem" onClick={() => navigate('projects')}>
          <span><strong>Todos os projetos</strong><small>Visualizar biblioteca</small></span>
        </button>
        <button type="button" role="menuitem" onClick={() => { setSwitcherOpen(false); onCreateProject(); }}>
          <Plus size={15} aria-hidden="true"/><strong>Novo projeto</strong>
        </button>
      </div>}
    </div>

    <nav className="bo-h764-navigation" id="bo-primary-navigation" aria-label="Navegação principal">
      <button type="button" className="bo-h764-home-link" onClick={() => navigate('home')}
        data-sidebar-item="home" aria-current={activeKey === 'home' ? 'page' : undefined}
        title={collapsed ? 'Home' : undefined} aria-label="Home">
        <House size={19} strokeWidth={1.8} aria-hidden="true"/>
        <span className="bo-h764-item-label">Home</span>
      </button>

      {sections.map(section => {
        const sectionHidden = collapsedSections[section.id] && !collapsed;
        return <section key={section.id} className="bo-h764-section" data-sidebar-section={section.id}>
          <button type="button" className="bo-h764-section-heading"
            aria-label={section.title} aria-expanded={!sectionHidden}
            title={collapsed ? section.title : undefined}
            onClick={() => onToggleSection(section.id)}>
            <span>{section.title}</span>
            {!collapsed && <span aria-hidden="true" className="bo-h764-section-sign">{sectionHidden ? '+' : '−'}</span>}
          </button>
          <div className="bo-h764-section-items" hidden={sectionHidden}>
            {section.items.map(item => itemButton(item))}
          </div>
        </section>;
      })}

      <div className="bo-h764-extra-area">
        <button type="button" className="bo-h764-extra-trigger"
          aria-label="Outras ferramentas" aria-expanded={extraOpen} title={collapsed ? 'Outras ferramentas' : undefined}
          onClick={() => setExtraOpen(value => !value)}>
          <Layers3 size={18} aria-hidden="true"/>
          <span className="bo-h764-item-label">Outras ferramentas</span>
          <ChevronDown size={15} className={`bo-h764-extra-chevron ${extraOpen ? 'is-open' : ''}`} aria-hidden="true"/>
        </button>
        {extraOpen && <div className="bo-h764-extra-items">{extraItems.map(item => itemButton(item,true))}</div>}
      </div>
    </nav>

    <div className="bo-h764-sidebar-footer">
      {itemButton({ id:'settings', label:'Configurações', icon:Settings })}
    </div>
  </aside>;
}

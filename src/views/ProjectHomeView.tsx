// H7.40-H8 legacy Home copy preserved after H11: Seus projetos
import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowLeft, ArrowRight, Clock3, FilePlus2, FolderKanban, LayoutPanelTop, LayoutTemplate, Map as MapIcon, MoreVertical, Pencil, Plus, RotateCcw, Search, Sparkles, Star, Trash2, X } from '../design-system/icons';
import type { StudioController } from '../state/useStudioController';
import type { ProjectLibraryEntry, ProjectTemplate } from '../services/project-library';
import { projectTemplateLabel } from '../services/project-library';
import './project-creation-flow-h743.css';
import './project-creation-flow-h744.css';
import './project-creation-flow-h749.css';
import './workspace-dashboard-h757.css';

export type ProjectHomeSection = 'home' | 'projects' | 'templates';

type Props = {
  studio: StudioController;
  section: ProjectHomeSection;
  setSection: (section: ProjectHomeSection) => void;
  openProjectWorkspace: () => void;
  onCreatingChange?: (creating: boolean) => void;
  onCreatedIntent?: (intent: ProjectIntent) => void;
};

export type ProjectIntent = 'journey' | 'personas' | 'blueprint' | 'whiteboard';
const PROJECT_INTENTS: Array<{ id: ProjectIntent; title: string; detail: string }> = [
  { id: 'journey', title: 'Mapear a jornada', detail: 'Visualize o caminho do cliente do primeiro contato até a entrega.' },
  { id: 'personas', title: 'Criar personas', detail: 'Entenda quem utiliza o serviço e suas expectativas.' },
  { id: 'blueprint', title: 'Desenhar um blueprint', detail: 'Conecte experiência e atividades dos bastidores no mesmo mapa.' },
  { id: 'whiteboard', title: 'Começar com um espaço em branco', detail: 'Organize ideias e explore possibilidades em um Whiteboard livre.' },
];

const PHASE_LABELS: Record<string, string> = {
  discovery: 'Entender', definition: 'Definir', design: 'Projetar', validation: 'Validar', improvement: 'Melhorar',
};

const TEMPLATES: Array<{ id: ProjectTemplate; title: string; detail: string; service: string }> = [
  { id: 'blank', title: 'Novo serviço', detail: 'Comece com uma base limpa e siga o caminho guiado do serviço.', service: 'Novo serviço' },
  { id: 'redesign', title: 'Redesenho de serviço', detail: 'Mapeie o estado atual, encontre gaps e desenhe o estado futuro.', service: 'Serviço a redesenhar' },
  { id: 'blueprint', title: 'Service Blueprint', detail: 'Parta da experiência e conecte frontstage, backstage, processos e sistemas.', service: 'Serviço para Blueprint' },
  { id: 'omnichannel', title: 'Experiência omnichannel', detail: 'Mapeie canais, touchpoints e handoffs antes de redesenhar a operação.', service: 'Experiência omnichannel' },
];

function dateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'agora';
  if (diff < 3_600_000) return `há ${Math.max(1, Math.floor(diff / 60_000))} min`;
  if (diff < 86_400_000) return `há ${Math.max(1, Math.floor(diff / 3_600_000))} h`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

type ProjectCardProps = {
  project: ProjectLibraryEntry;
  active: boolean;
  onOpen: () => void;
  onFavorite: () => void;
  onRename: () => void;
  onArchive: () => void;
  onDelete: () => void;
};

function ProjectCard({ project, active, onOpen, onFavorite, onRename, onArchive, onDelete }: ProjectCardProps) {
  return <article className={`bo-h740h8-project-card ${active ? 'is-active' : ''}`} data-project-id={project.id}>
    <header>
      <span className="bo-h740h8-project-icon"><FolderKanban size={18}/></span>
      <div className="bo-h740h9-project-actions">
        <button type="button" className={project.favorite ? 'is-favorite' : ''} onClick={onFavorite} aria-label={project.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} title={project.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Star size={15} fill={project.favorite ? 'currentColor' : 'none'}/></button>
        <button type="button" onClick={onRename} aria-label="Renomear projeto" title="Renomear projeto"><Pencil size={14}/></button>
        <button type="button" onClick={onArchive} aria-label="Arquivar projeto" title="Arquivar projeto"><Archive size={14}/></button>
        <button type="button" onClick={onDelete} aria-label={`Excluir projeto ${project.title}`} title="Excluir definitivamente"><Trash2 size={14}/></button>
      </div>
    </header>
    <div><small>PROJETO</small><h3>{project.title}</h3><p><b>Serviço:</b> {project.serviceName}</p></div>
    <div className="bo-h740h8-project-meta"><span>{PHASE_LABELS[project.phase] || 'Em construção'}</span><span>{project.journeyCount} Journey{project.journeyCount === 1 ? '' : 's'}</span><span>{project.blueprintCount} Blueprint{project.blueprintCount === 1 ? '' : 's'}</span></div>
    <footer><span><Clock3 size={12}/> {dateLabel(project.lastOpenedAt)}</span><button type="button" className="primary" onClick={onOpen}>{active ? 'Continuar' : 'Abrir'} <ArrowRight size={13}/></button></footer>
  </article>;
}

export function ProjectHomeView({ studio, section, setSection, openProjectWorkspace, onCreatingChange, onCreatedIntent }: Props) {
  const { projects, archivedProjects, activeProjectId, openWorkspaceProject, toggleWorkspaceProjectFavorite, renameWorkspaceProject, archiveWorkspaceProject, restoreWorkspaceProject, deleteWorkspaceProject, createWorkspaceProject } = studio;
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<ProjectTemplate | null>(null);
  const [selectedIntent, setSelectedIntent] = useState<ProjectIntent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectLibraryEntry | null>(null);
  const [renameTarget, setRenameTarget] = useState<ProjectLibraryEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [projectName, setProjectName] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    onCreatingChange?.(Boolean(dialog));
    return () => onCreatingChange?.(false);
  }, [dialog, onCreatingChange]);

  const current = projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? null;
  const favorites = projects.filter((item) => item.favorite).slice(0, 4);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return projects;
    return projects.filter((item) => `${item.title} ${item.serviceName} ${item.description}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [projects, query]);

  const openProject = (project: ProjectLibraryEntry) => {
    if (project.id === activeProjectId) openProjectWorkspace();
    else if (openWorkspaceProject(project.id)) window.setTimeout(openProjectWorkspace, 0);
  };

  const startTemplate = (template: ProjectTemplate) => {
    const preset = TEMPLATES.find((item) => item.id === template);
    setProjectName(''); setServiceName(template === 'blank' ? '' : preset?.service ?? ''); setDescription(''); setSelectedIntent(template === 'blueprint' ? 'blueprint' : template === 'redesign' || template === 'omnichannel' ? 'journey' : null); setDialog(template);
  };

  // Os atalhos da Home reutilizam a criação canônica: nunca criam dados de demonstração.
  const startQuickIntent = (intent: ProjectIntent) => {
    startTemplate('blank');
    setSelectedIntent(intent);
  };

  useEffect(() => {
    const requestNewProject = () => startTemplate('blank');
    const dismissNewProject = () => setDialog(null);
    window.addEventListener('bo-new-project', requestNewProject);
    window.addEventListener('bo-h749-cancel-project-creation', dismissNewProject);
    return () => {
      window.removeEventListener('bo-new-project', requestNewProject);
      window.removeEventListener('bo-h749-cancel-project-creation', dismissNewProject);
    };
  }, []);

  const submit = () => {
    if (!dialog || (dialog === 'blank' && !selectedIntent)) return;
    const existing = new Set([...projects, ...archivedProjects].map((project) => project.title.toLocaleLowerCase('pt-BR')));
    let defaultName = 'Novo projeto';
    let sequence = 2;
    while (existing.has(defaultName.toLocaleLowerCase('pt-BR'))) defaultName = `Novo projeto (${sequence++})`;
    const name = projectName.trim() || defaultName;
    // Intention guides navigation, not the graph schema: the project is always a real, editable snapshot.
    const target = selectedIntent;
    const ok = createWorkspaceProject({ projectName: name, serviceName: serviceName.trim() || name, description, template: dialog });
    if (!ok) return;
    setDialog(null);
    setSelectedIntent(null);
    // The chosen intent is a route to the first working surface, never a different project schema.
    // Legacy callers without a route handler still return to the canonical project overview.
    window.setTimeout(() => {
      if (target && onCreatedIntent) onCreatedIntent(target);
      else openProjectWorkspace();
    }, 0);
  };

  const beginRename = (project: ProjectLibraryEntry) => {
    setRenameTarget(project);
    setRenameValue(project.title);
  };

  const submitRename = () => {
    if (!renameTarget || !renameValue.trim()) return;
    if (renameWorkspaceProject(renameTarget.id, renameValue)) setRenameTarget(null);
  };

  const archiveProject = (project: ProjectLibraryEntry) => {
    if (!window.confirm(`Arquivar o projeto “${project.title}”? O snapshot será preservado e poderá ser restaurado.`)) return;
    archiveWorkspaceProject(project.id);
  };

  const confirmDeletion = () => {
    if (!deleteTarget) return;
    if (deleteWorkspaceProject(deleteTarget.id)) setDeleteTarget(null);
  };

  const card = (project: ProjectLibraryEntry) => <ProjectCard
    key={project.id}
    project={project}
    active={project.id === activeProjectId}
    onOpen={() => openProject(project)}
    onFavorite={() => toggleWorkspaceProjectFavorite(project.id)}
    onRename={() => beginRename(project)}
    onArchive={() => archiveProject(project)}
    onDelete={() => setDeleteTarget(project)}
  />;


  // The creation experience is a dedicated page, not another modal layered over the project list.
  if (dialog) return <section className="bo-h744-create-page bo-h749-create-page" data-project-creation-page="H7.44" aria-labelledby="bo-h744-create-title">
    <header className="bo-h744-create-top">
      <button type="button" className="bo-h744-back" onClick={() => setDialog(null)}><ArrowLeft size={17}/> Voltar aos projetos</button>
      <span>Projetos <b>›</b> Novo projeto</span>
    </header>
    <div className="bo-h744-create-frame">
      <main className="bo-h744-create-primary">
        <span className="bo-h744-create-eyebrow">BLUE OCEAN · CRIAÇÃO</span>
        <h1 id="bo-h744-create-title">Como você deseja começar?</h1>
        <p className="bo-h744-create-subtitle">{dialog === 'blank' ? 'Escolha um ponto de partida. Todas as ferramentas continuarão disponíveis no mesmo projeto.' : `Comece pelo modelo ${projectTemplateLabel(dialog)}. Você poderá adaptar o serviço depois.`}</p>
        <fieldset className="bo-h744-options">
          <legend>O que você quer fazer primeiro?</legend>
          <div className="bo-h744-option-grid">{PROJECT_INTENTS.map((item, index) => <button type="button" key={item.id} className={selectedIntent === item.id ? 'is-selected' : ''} aria-pressed={selectedIntent === item.id} onClick={() => setSelectedIntent(item.id)}>
            <span className="bo-h744-option-graphic">{index === 0 ? <LayoutTemplate size={23}/> : index === 1 ? <FolderKanban size={23}/> : index === 2 ? <LayoutTemplate size={23}/> : <Sparkles size={23}/>}</span>
            <strong>{item.title}</strong><small>{item.detail}</small><em>{selectedIntent === item.id ? 'Selecionado ✓' : 'Selecionar →'}</em>
          </button>)}</div>
        </fieldset>
        <p className="bo-h744-create-explanation">Seu ponto de partida não limita o projeto. Projeto e serviço são conceitos separados: o projeto organiza o trabalho; o serviço conecta Personas, mapas e evidências.</p>
      </main>
      <aside className="bo-h744-create-aside">
        <h2>Defina seu projeto</h2>
        <p>Dê um nome agora ou comece e personalize depois.</p>
        <label><span>Nome do projeto <small>(opcional)</small></span><input aria-label="Nome do projeto" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex.: Melhoria do atendimento"/></label>
        <details className="bo-h744-additional">
          <summary>Mais informações (opcionais)</summary>
          <label><span>Nome do serviço</span><input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Ex.: Atendimento ao cliente"/></label>
          <label><span>Descrição</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva o objetivo do projeto"/></label>
        </details>
        <p className="bo-h749-next-inline" role="status" aria-live="polite">{selectedIntent ? 'O projeto abrirá diretamente na ferramenta escolhida.' : 'Selecione um ponto de partida para continuar.'}</p>
        <button type="button" className="primary bo-h744-create-confirm" disabled={!selectedIntent} onClick={submit}>Criar projeto e começar <ArrowRight size={16}/></button>
        <button type="button" className="bo-h744-cancel" onClick={() => setDialog(null)}>Cancelar</button>
      </aside>
    </div>
  </section>;

  // H7.40-H8 legacy contract: Um projeto organiza o trabalho; o serviço é o que você desenha dentro dele.
  return <section className="bo-h740h8-home bo-h740h9-home" data-project-home="7.40-H8" data-project-architecture-hardening="7.40-H9" data-service-first-navigation="7.40-H11" data-home-section={section}>
    <header className="bo-h740h8-hero">
      <div><small>BLUE OCEAN</small><h1>{section === 'home' ? 'Bem-vindo ao seu Workspace' : section === 'projects' ? 'Projetos do serviço' : 'Comece com uma estrutura pronta'}</h1><p>{section === 'home' ? 'Retome seu trabalho ou inicie um novo projeto de design de serviços.' : section === 'projects' ? 'Escolha um projeto para consultar suas informações, necessidades, mapas e melhorias. Cada projeto preserva seus dados.' : 'Templates globais criam um novo projeto; dentro do projeto, o Guided Service Workspace organiza o serviço.'}</p></div>
      {section !== 'home' && <button type="button" className="primary" onClick={() => startTemplate('blank')}><Plus size={16}/> Novo projeto</button>}
    </header>

    {section === 'home' && <div className="bo-h757-content" data-workspace-dashboard="H7.57">
      <section className="bo-h757-projects" data-home-projects="1" aria-labelledby="bo-h757-projects-title">
        <div className="bo-h757-section-heading">
          <h2 id="bo-h757-projects-title">Seus Projetos</h2>
          <button type="button" onClick={() => setSection('projects')}>Ver todos <ArrowRight size={14}/></button>
        </div>
        {current ? <article className="bo-h757-featured" data-project-id={current.id} aria-label={`Projeto ${current.title}`}>
          <div className="bo-h757-featured-main">
            <span className="bo-h757-project-symbol" aria-hidden="true"><FolderKanban size={29} strokeWidth={1.7}/></span>
            <div className="bo-h757-project-copy">
              <h3>{current.title}</h3>
              <p>{current.serviceName !== current.title ? current.serviceName : PHASE_LABELS[current.phase] || 'Em construção'}</p>
              <div className="bo-h757-featured-meta">
                <span><Clock3 size={14}/> Aberto {dateLabel(current.lastOpenedAt)}</span>
                <span className="bo-h757-meta-dot" aria-hidden="true"/>
                <span>{current.journeyCount} ${current.journeyCount === 1 ? 'Jornada' : 'Jornadas'}</span>
                <span className="bo-h757-meta-dot" aria-hidden="true"/>
                <span>{current.blueprintCount} ${current.blueprintCount === 1 ? 'Blueprint' : 'Blueprints'}</span>
                {current.whiteboardCount > 0 && <><span className="bo-h757-meta-dot" aria-hidden="true"/><span>{current.whiteboardCount} Whiteboards</span></>}
              </div>
            </div>
          </div>
          <div className="bo-h757-featured-actions">
            <details className="bo-h757-menu">
              <summary aria-label={`Ações para ${current.title}`} title="Ações do projeto"><MoreVertical size={20}/></summary>
              <div className="bo-h757-menu-body" role="group" aria-label="Gerenciar projeto">
                <button type="button" onClick={() => toggleWorkspaceProjectFavorite(current.id)}><Star size={15} fill={current.favorite ? 'currentColor' : 'none'}/>{current.favorite ? 'Remover favorito' : 'Favoritar projeto'}</button>
                <button type="button" onClick={() => beginRename(current)}><Pencil size={15}/> Renomear</button>
                <button type="button" onClick={() => archiveProject(current)}><Archive size={15}/> Arquivar</button>
                <button type="button" className="is-danger" onClick={() => setDeleteTarget(current)}><Trash2 size={15}/> Excluir projeto</button>
              </div>
            </details>
            <button type="button" className="bo-h757-continue" onClick={() => openProject(current)}>Continuar <ArrowRight size={17}/></button>
          </div>
        </article> : <div className="bo-h757-empty">
          <FolderKanban size={26} aria-hidden="true"/>
          <strong>Seu primeiro projeto começa aqui</strong>
          <p>Crie um projeto e escolha como deseja começar.</p>
          <button type="button" onClick={() => startTemplate('blank')}>Criar primeiro projeto</button>
        </div>}
      </section>
      {favorites.some((project) => project.id !== current?.id) && <section className="bo-h757-favorites" aria-labelledby="bo-h757-favorites-title">
        <div className="bo-h757-section-heading"><h2 id="bo-h757-favorites-title">Favoritos</h2></div>
        <div className="bo-h757-favorite-list">
          {favorites.filter((project) => project.id !== current?.id).map((project) =>
            <button type="button" key={project.id} onClick={() => openProject(project)}>
              <Star size={15} fill="currentColor" aria-hidden="true"/><span>{project.title}</span><ArrowRight size={14} aria-hidden="true"/>
            </button>)}
        </div>
      </section>}
      <section className="bo-h757-quick-start" aria-labelledby="bo-h757-quick-title">
        <div className="bo-h757-section-heading">
          <h2 id="bo-h757-quick-title">Modelos de Início Rápido</h2>
          <button type="button" onClick={() => setSection('templates')}>Ver mais modelos <ArrowRight size={14}/></button>
        </div>
        <div className="bo-h757-quick-grid">
          <button type="button" className="bo-h757-quick-card is-journey" onClick={() => startQuickIntent('journey')}>
            <span className="bo-h757-quick-symbol" aria-hidden="true"><MapIcon size={31} strokeWidth={1.6}/></span>
            <strong>Mapear Jornada do Cliente</strong>
            <span className="bo-h757-quick-description">Visualize o caminho do cliente, do primeiro contato à entrega, e identifique os pontos de atrito.</span>
            <em>Usar modelo <ArrowRight size={16}/></em>
          </button>
          <button type="button" className="bo-h757-quick-card is-blueprint" onClick={() => startQuickIntent('blueprint')}>
            <span className="bo-h757-quick-symbol" aria-hidden="true"><LayoutPanelTop size={31} strokeWidth={1.6}/></span>
            <strong>Service Blueprint</strong>
            <span className="bo-h757-quick-description">Conecte a experiência do cliente às equipes e aos processos de bastidores.</span>
            <em>Usar modelo <ArrowRight size={16}/></em>
          </button>
          <button type="button" className="bo-h757-quick-card is-blank" onClick={() => startQuickIntent('whiteboard')}>
            <span className="bo-h757-quick-symbol" aria-hidden="true"><FilePlus2 size={31} strokeWidth={1.6}/></span>
            <strong>Tela em Branco</strong>
            <span className="bo-h757-quick-description">Comece por um Whiteboard livre, organize ideias e conecte-as depois ao serviço.</span>
            <em>Começar do zero <ArrowRight size={16}/></em>
          </button>
        </div>
      </section>
    </div>}

    {section === 'projects' && <section className="bo-h740h8-section bo-h740h8-all-projects" data-service-projects="1"><header className="bo-h740h11-service-projects-head"><div><small>SERVIÇO</small><h2>Escolha um projeto</h2><p>Abra um projeto para consultar informações, público, pesquisa, mapas e melhorias. As ferramentas continuam disponíveis no menu lateral.</p></div></header><div className="bo-h740h8-toolbar"><label><Search size={17}/><input type="search" aria-label="Buscar projetos ou serviços" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar projetos ou serviços"/></label><span>{filtered.length} projeto{filtered.length === 1 ? '' : 's'} ativo{filtered.length === 1 ? '' : 's'}</span></div>{filtered.length ? <div className="bo-h740h8-project-grid">{filtered.map(card)}</div> : <div className="bo-h740h8-empty"><Search size={24}/><strong>Nenhum projeto encontrado</strong><p>Tente outro termo ou crie um novo projeto.</p></div>}
      {archivedProjects.length > 0 && <section className="bo-h740h9-archived"><header><div><small>ARQUIVADOS</small><h2>Projetos preservados</h2><p>Arquivar remove da lista ativa, mas mantém metadados e snapshot local.</p></div></header><div>{archivedProjects.map((project) => <article key={project.id}><span><Archive size={16}/></span><div><strong>{project.title}</strong><small>Serviço: {project.serviceName} · atualizado {dateLabel(project.updatedAt)}</small></div><button type="button" onClick={() => restoreWorkspaceProject(project.id)}><RotateCcw size={14}/> Restaurar</button><button type="button" onClick={() => setDeleteTarget(project)} aria-label={`Excluir projeto arquivado ${project.title}`} className="bo-h744-archive-delete"><Trash2 size={14}/> Excluir</button></article>)}</div></section>}
    </section>}

    {section === 'templates' && <section className="bo-h740h8-section"><div className="bo-h740h8-template-grid large">{TEMPLATES.map((item) => <button key={item.id} type="button" onClick={() => startTemplate(item.id)}><span><Sparkles size={19}/></span><strong>{item.title}</strong><small>{item.detail}</small><em>{projectTemplateLabel(item.id)} <ArrowRight size={12}/></em></button>)}</div></section>}


    {deleteTarget && <div className="bo-h740h8-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
      <section className="bo-h740h8-modal bo-h744-delete-modal" role="dialog" aria-modal="true" aria-labelledby="bo-h744-delete-title">
        <header><div><small>EXCLUSÃO DEFINITIVA</small><h2 id="bo-h744-delete-title">Excluir “{deleteTarget.title}”?</h2><p>Isso remove o projeto e sua cópia local de Jornadas, Blueprints, Whiteboards e demais registros neste navegador. Não é possível desfazer.</p></div><button type="button" onClick={() => setDeleteTarget(null)} aria-label="Fechar"><X size={18}/></button></header>
        <footer><button type="button" onClick={() => setDeleteTarget(null)} autoFocus>Cancelar</button><button type="button" className="bo-h744-delete-confirm" onClick={confirmDeletion}><Trash2 size={15}/> Excluir definitivamente</button></footer>
      </section>
    </div>}

    {renameTarget && <div className="bo-h740h8-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRenameTarget(null); }}><section className="bo-h740h8-modal bo-h740h9-rename-modal" role="dialog" aria-modal="true" aria-labelledby="bo-h740h9-rename-title"><header><div><small>PROJETO</small><h2 id="bo-h740h9-rename-title">Renomear projeto</h2><p>O nome do serviço permanece independente e não será alterado.</p></div><button type="button" onClick={() => setRenameTarget(null)} aria-label="Fechar"><X size={18}/></button></header><div className="bo-h740h8-modal-body"><label className="full"><span>Nome do projeto</span><input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && renameValue.trim()) submitRename(); }}/></label></div><footer><button type="button" onClick={() => setRenameTarget(null)}>Cancelar</button><button type="button" className="primary" disabled={!renameValue.trim()} onClick={submitRename}>Salvar nome</button></footer></section></div>}
  </section>;
}

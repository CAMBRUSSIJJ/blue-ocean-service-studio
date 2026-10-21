// H7.40-H8 legacy Home copy preserved after H11: Seus projetos
import { useMemo, useState } from 'react';
import { Archive, ArrowRight, Clock3, FolderKanban, LayoutTemplate, Pencil, Plus, RotateCcw, Search, Sparkles, Star, X } from '../design-system/icons';
import type { StudioController } from '../state/useStudioController';
import type { ProjectLibraryEntry, ProjectTemplate } from '../services/project-library';
import { projectTemplateLabel } from '../services/project-library';

export type ProjectHomeSection = 'home' | 'projects' | 'templates';

type Props = {
  studio: StudioController;
  section: ProjectHomeSection;
  setSection: (section: ProjectHomeSection) => void;
  openProjectWorkspace: () => void;
};

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
};

function ProjectCard({ project, active, onOpen, onFavorite, onRename, onArchive }: ProjectCardProps) {
  return <article className={`bo-h740h8-project-card ${active ? 'is-active' : ''}`} data-project-id={project.id}>
    <header>
      <span className="bo-h740h8-project-icon"><FolderKanban size={18}/></span>
      <div className="bo-h740h9-project-actions">
        <button type="button" className={project.favorite ? 'is-favorite' : ''} onClick={onFavorite} aria-label={project.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} title={project.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Star size={15} fill={project.favorite ? 'currentColor' : 'none'}/></button>
        <button type="button" onClick={onRename} aria-label="Renomear projeto" title="Renomear projeto"><Pencil size={14}/></button>
        <button type="button" onClick={onArchive} aria-label="Arquivar projeto" title="Arquivar projeto"><Archive size={14}/></button>
      </div>
    </header>
    <div><small>PROJETO</small><h3>{project.title}</h3><p><b>Serviço:</b> {project.serviceName}</p></div>
    <div className="bo-h740h8-project-meta"><span>{PHASE_LABELS[project.phase] || 'Em construção'}</span><span>{project.journeyCount} Journey{project.journeyCount === 1 ? '' : 's'}</span><span>{project.blueprintCount} Blueprint{project.blueprintCount === 1 ? '' : 's'}</span></div>
    <footer><span><Clock3 size={12}/> {dateLabel(project.lastOpenedAt)}</span><button type="button" className="primary" onClick={onOpen}>{active ? 'Continuar' : 'Abrir'} <ArrowRight size={13}/></button></footer>
  </article>;
}

export function ProjectHomeView({ studio, section, setSection, openProjectWorkspace }: Props) {
  const { projects, archivedProjects, activeProjectId, openWorkspaceProject, toggleWorkspaceProjectFavorite, renameWorkspaceProject, archiveWorkspaceProject, restoreWorkspaceProject, createWorkspaceProject } = studio;
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<ProjectTemplate | null>(null);
  const [renameTarget, setRenameTarget] = useState<ProjectLibraryEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [projectName, setProjectName] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');

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
    setProjectName(''); setServiceName(preset?.service ?? ''); setDescription(''); setDialog(template);
  };

  const submit = () => {
    if (!dialog || !projectName.trim()) return;
    const ok = createWorkspaceProject({ projectName, serviceName: serviceName.trim() || projectName, description, template: dialog });
    if (!ok) return;
    setDialog(null);
    window.setTimeout(openProjectWorkspace, 0);
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

  const card = (project: ProjectLibraryEntry) => <ProjectCard
    key={project.id}
    project={project}
    active={project.id === activeProjectId}
    onOpen={() => openProject(project)}
    onFavorite={() => toggleWorkspaceProjectFavorite(project.id)}
    onRename={() => beginRename(project)}
    onArchive={() => archiveProject(project)}
  />;

  // H7.40-H8 legacy contract: Um projeto organiza o trabalho; o serviço é o que você desenha dentro dele.
  return <section className="bo-h740h8-home bo-h740h9-home" data-project-home="7.40-H8" data-project-architecture-hardening="7.40-H9" data-service-first-navigation="7.40-H11" data-home-section={section}>
    <header className="bo-h740h8-hero">
      <div><small>BLUE OCEAN</small><h1>{section === 'home' ? 'Seu trabalho começa aqui' : section === 'projects' ? 'Projetos do serviço' : 'Comece com uma estrutura pronta'}</h1><p>{section === 'home' ? 'Abra um projeto ou crie um novo. Você entra diretamente nas Jornadas, sem telas intermediárias.' : section === 'projects' ? 'Escolha um projeto para abrir as Jornadas e continuar a desenhar o serviço. Cada projeto preserva seus dados.' : 'Templates globais criam um novo projeto; dentro do projeto, o Guided Service Workspace organiza o serviço.'}</p></div>
      <button type="button" className="primary" onClick={() => startTemplate('blank')}><Plus size={16}/> Novo projeto</button>
    </header>

    {section === 'home' && <>
      {current && <section className="bo-h740h8-continue"><div><small>CONTINUE DE ONDE PAROU</small><h2>{current.title}</h2><p><strong>Serviço:</strong> {current.serviceName}</p><div><span>{PHASE_LABELS[current.phase] || 'Em construção'}</span><span>{current.journeyCount} Journeys</span><span>{current.blueprintCount} Blueprints</span><span>{current.whiteboardCount} Whiteboards</span></div></div><button type="button" className="primary" onClick={() => openProject(current)}>Continuar projeto <ArrowRight size={14}/></button></section>}

      <section className="bo-h740h8-section bo-h740h11-service-hub" data-service-project-hub="1"><header><div><small>SERVIÇO</small><h2>Projetos do serviço</h2><p>Entre em Serviço para escolher, criar ou retomar um projeto e começar diretamente pelas Jornadas.</p></div><button type="button" onClick={() => setSection('projects')}>Ver projetos <ArrowRight size={13}/></button></header>
        <div className="bo-h740h11-service-summary"><span><FolderKanban size={20}/></span><div><strong>{projects.length} projeto{projects.length === 1 ? '' : 's'} ativo{projects.length === 1 ? '' : 's'}</strong><small>{current ? `Último: ${current.title} · serviço ${current.serviceName}` : 'Nenhum projeto criado ainda'}</small></div><button type="button" className="primary" onClick={() => setSection('projects')}>Abrir Serviço <ArrowRight size={13}/></button></div>
      </section>

      {favorites.length > 0 && <section className="bo-h740h8-section"><header><div><small>FAVORITOS</small><h2>Acesso rápido</h2></div></header><div className="bo-h740h8-project-grid compact">{favorites.map(card)}</div></section>}

      <section className="bo-h740h8-section"><header><div><small>TEMPLATES GLOBAIS</small><h2>Começar com um template</h2><p>Escolha um ponto de partida para criar outro projeto sem alterar o projeto atual.</p></div><button type="button" onClick={() => setSection('templates')}>Ver templates <ArrowRight size={13}/></button></header><div className="bo-h740h8-template-grid">{TEMPLATES.slice(0, 4).map((item) => <button key={item.id} type="button" onClick={() => startTemplate(item.id)}><span><LayoutTemplate size={18}/></span><strong>{item.title}</strong><small>{item.detail}</small><em>Usar template <ArrowRight size={12}/></em></button>)}</div></section>
    </>}

    {section === 'projects' && <section className="bo-h740h8-section bo-h740h8-all-projects" data-service-projects="1"><header className="bo-h740h11-service-projects-head"><div><small>SERVIÇO</small><h2>Escolha um projeto</h2><p>O projeto organiza o trabalho; ao abrir um projeto você entra na Home específica dele.</p></div></header><div className="bo-h740h8-toolbar"><label><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar projetos ou serviços"/></label><span>{filtered.length} projeto{filtered.length === 1 ? '' : 's'} ativo{filtered.length === 1 ? '' : 's'}</span></div>{filtered.length ? <div className="bo-h740h8-project-grid">{filtered.map(card)}</div> : <div className="bo-h740h8-empty"><Search size={24}/><strong>Nenhum projeto encontrado</strong><p>Tente outro termo ou crie um novo projeto.</p></div>}
      {archivedProjects.length > 0 && <section className="bo-h740h9-archived"><header><div><small>ARQUIVADOS</small><h2>Projetos preservados</h2><p>Arquivar remove da lista ativa, mas mantém metadados e snapshot local.</p></div></header><div>{archivedProjects.map((project) => <article key={project.id}><span><Archive size={16}/></span><div><strong>{project.title}</strong><small>Serviço: {project.serviceName} · atualizado {dateLabel(project.updatedAt)}</small></div><button type="button" onClick={() => restoreWorkspaceProject(project.id)}><RotateCcw size={14}/> Restaurar</button></article>)}</div></section>}
    </section>}

    {section === 'templates' && <section className="bo-h740h8-section"><div className="bo-h740h8-template-grid large">{TEMPLATES.map((item) => <button key={item.id} type="button" onClick={() => startTemplate(item.id)}><span><Sparkles size={19}/></span><strong>{item.title}</strong><small>{item.detail}</small><em>{projectTemplateLabel(item.id)} <ArrowRight size={12}/></em></button>)}</div></section>}

    {dialog && <div className="bo-h740h8-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><section className="bo-h740h8-modal" role="dialog" aria-modal="true" aria-labelledby="bo-h740h8-create-title"><header><div><small>NOVO PROJETO · {projectTemplateLabel(dialog).toUpperCase()}</small><h2 id="bo-h740h8-create-title">Crie o espaço de trabalho</h2><p>Projeto e serviço são conceitos separados. O projeto organiza o trabalho; o serviço é o objeto que será desenhado.</p></div><button type="button" onClick={() => setDialog(null)} aria-label="Fechar"><X size={18}/></button></header><div className="bo-h740h8-modal-body"><label><span>Nome do projeto</span><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex.: Redesenho da experiência da lavanderia"/></label><label><span>Serviço principal</span><input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Ex.: Lavanderia com entrega e coleta"/></label><label className="full"><span>Descrição <em>opcional</em></span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Qual objetivo ou transformação este projeto pretende conduzir?"/></label></div><footer><button type="button" onClick={() => setDialog(null)}>Cancelar</button><button type="button" className="primary" disabled={!projectName.trim()} onClick={submit}>Criar projeto</button></footer></section></div>}

    {renameTarget && <div className="bo-h740h8-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRenameTarget(null); }}><section className="bo-h740h8-modal bo-h740h9-rename-modal" role="dialog" aria-modal="true" aria-labelledby="bo-h740h9-rename-title"><header><div><small>PROJETO</small><h2 id="bo-h740h9-rename-title">Renomear projeto</h2><p>O nome do serviço permanece independente e não será alterado.</p></div><button type="button" onClick={() => setRenameTarget(null)} aria-label="Fechar"><X size={18}/></button></header><div className="bo-h740h8-modal-body"><label className="full"><span>Nome do projeto</span><input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && renameValue.trim()) submitRename(); }}/></label></div><footer><button type="button" onClick={() => setRenameTarget(null)}>Cancelar</button><button type="button" className="primary" disabled={!renameValue.trim()} onClick={submitRename}>Salvar nome</button></footer></section></div>}
  </section>;
}

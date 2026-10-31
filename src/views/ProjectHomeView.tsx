// H7.40-H8 legacy Home copy preserved after H11: Seus projetos
import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowLeft, ArrowRight, Clock3, FolderKanban, LayoutTemplate, Pencil, Plus, RotateCcw, Search, Sparkles, Star, Trash2, X } from '../design-system/icons';
import type { StudioController } from '../state/useStudioController';
import type { ProjectLibraryEntry, ProjectTemplate } from '../services/project-library';
import { projectTemplateLabel } from '../services/project-library';
import './project-creation-flow-h743.css';
import './project-creation-flow-h744.css';

export type ProjectHomeSection = 'home' | 'projects' | 'templates';

type Props = {
  studio: StudioController;
  section: ProjectHomeSection;
  setSection: (section: ProjectHomeSection) => void;
  openProjectWorkspace: () => void;
};

type ProjectIntent = 'journey' | 'personas' | 'blueprint' | 'whiteboard';
const PROJECT_INTENTS: Array<{ id: ProjectIntent; title: string; detail: string }> = [
  { id: 'journey', title: 'Mapear a jornada', detail: 'Visualize o caminho do cliente do primeiro contato até a entrega.' },
  { id: 'personas', title: 'Criar personas', detail: 'Entenda quem utiliza o serviço e suas expectativas.' },
  { id: 'blueprint', title: 'Desenhar um blueprint', detail: 'Conecte experiência e atividades dos bastidores no mesmo mapa.' },
  { id: 'whiteboard', title: 'Explorar livremente', detail: 'Abra um canvas para reunir ideias, evidências e descobertas.' },
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

export function ProjectHomeView({ studio, section, setSection, openProjectWorkspace }: Props) {
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
    setProjectName(''); setServiceName(preset?.service ?? ''); setDescription(''); setSelectedIntent(null); setDialog(template);
  };

  useEffect(() => {
    const requestNewProject = () => startTemplate('blank');
    window.addEventListener('bo-new-project', requestNewProject);
    return () => window.removeEventListener('bo-new-project', requestNewProject);
  }, []);

  const submit = () => {
    if (!dialog || (dialog === 'blank' && !selectedIntent)) return;
    const existing = new Set([...projects, ...archivedProjects].map((project) => project.title.toLocaleLowerCase('pt-BR')));
    let defaultName = 'Novo projeto';
    let sequence = 2;
    while (existing.has(defaultName.toLocaleLowerCase('pt-BR'))) defaultName = `Novo projeto (${sequence++})`;
    const name = projectName.trim() || defaultName;
    // Intention guides navigation, not the graph schema: the project is always a real, editable snapshot.
    const target = dialog === 'blank' ? selectedIntent : null;
    const ok = createWorkspaceProject({ projectName: name, serviceName: serviceName.trim() || name, description, template: dialog });
    if (!ok) return;
    setDialog(null);
    setSelectedIntent(null);
    // The prototype's next screen is the project overview; its contextual CTA
    // remembers the selected intention instead of unexpectedly opening an editor.
    if (target) { try { sessionStorage.setItem('bo-h744-new-project-intent', target); } catch { /* optional navigation hint */ } }
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
  if (dialog === 'blank') return <section className="bo-h744-create-page" data-project-creation-page="H7.44" aria-labelledby="bo-h744-create-title">
    <header className="bo-h744-create-top">
      <button type="button" className="bo-h744-back" onClick={() => setDialog(null)}><ArrowLeft size={17}/> Voltar aos projetos</button>
      <span>PROJETO NOVO <b>·</b> ESCOLHA COMO COMEÇAR</span>
    </header>
    <div className="bo-h744-create-frame">
      <main className="bo-h744-create-primary">
        <span className="bo-h744-create-eyebrow">BLUE OCEAN · CRIAÇÃO</span>
        <h1 id="bo-h744-create-title">O que você quer fazer?</h1>
        <p className="bo-h744-create-subtitle">Você não precisa conhecer as ferramentas para começar. Escolha o que pretende construir; o projeto será criado com o mesmo modelo de dados do serviço.</p>
        <fieldset className="bo-h744-options">
          <legend>Escolha por onde começar</legend>
          <div className="bo-h744-option-grid">{PROJECT_INTENTS.map((item, index) => <button type="button" key={item.id} className={selectedIntent === item.id ? 'is-selected' : ''} aria-pressed={selectedIntent === item.id} onClick={() => setSelectedIntent(item.id)}>
            <span className="bo-h744-option-graphic">{index === 0 ? <LayoutTemplate size={23}/> : index === 1 ? <FolderKanban size={23}/> : index === 2 ? <LayoutTemplate size={23}/> : <Sparkles size={23}/>}</span>
            <strong>{item.title}</strong><small>{item.detail}</small><em>{selectedIntent === item.id ? 'Selecionado ✓' : 'Selecionar →'}</em>
          </button>)}</div>
        </fieldset>
        <p className="bo-h744-create-explanation">Você poderá usar todas as ferramentas depois, independentemente da escolha inicial. Projeto e serviço são conceitos separados: o projeto organiza o trabalho e o serviço é o que você desenha.</p>
      </main>
      <aside className="bo-h744-create-aside">
        <span className="bo-h744-side-icon"><FolderKanban size={22}/></span>
        <h2>Seu espaço de trabalho</h2>
        <p>Personalize agora ou dê um nome depois. Nada será criado antes de confirmar.</p>
        <label><span>Nome do projeto <small>(opcional)</small></span><input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex.: Melhoria do atendimento"/></label>
        <details className="bo-h744-additional">
          <summary>Mais informações (opcionais)</summary>
          <label><span>Nome do serviço</span><input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Ex.: Atendimento ao cliente"/></label>
          <label><span>Descrição</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Descreva o objetivo do projeto"/></label>
        </details>
        <div className="bo-h744-start-summary"><small>PRÓXIMO PASSO</small><strong>{selectedIntent ? PROJECT_INTENTS.find((item) => item.id === selectedIntent)?.title : 'Escolha uma intenção à esquerda'}</strong><p>{selectedIntent ? 'Vamos abrir diretamente a ferramenta escolhida.' : 'Selecione uma opção para continuar.'}</p></div>
        <button type="button" className="primary bo-h744-create-confirm" disabled={!selectedIntent} onClick={submit}>Criar projeto e começar <ArrowRight size={16}/></button>
        <button type="button" className="bo-h744-cancel" onClick={() => setDialog(null)}>Cancelar</button>
      </aside>
    </div>
  </section>;

  // H7.40-H8 legacy contract: Um projeto organiza o trabalho; o serviço é o que você desenha dentro dele.
  return <section className="bo-h740h8-home bo-h740h9-home" data-project-home="7.40-H8" data-project-architecture-hardening="7.40-H9" data-service-first-navigation="7.40-H11" data-home-section={section}>
    <header className="bo-h740h8-hero">
      <div><small>BLUE OCEAN</small><h1>{section === 'home' ? 'Seu trabalho começa aqui' : section === 'projects' ? 'Projetos do serviço' : 'Comece com uma estrutura pronta'}</h1><p>{section === 'home' ? 'Abra um projeto ou crie um novo. Cada projeto tem sua visão geral, contexto e ferramentas conectadas.' : section === 'projects' ? 'Escolha um projeto para consultar suas informações, necessidades, mapas e melhorias. Cada projeto preserva seus dados.' : 'Templates globais criam um novo projeto; dentro do projeto, o Guided Service Workspace organiza o serviço.'}</p></div>
      <button type="button" className="primary" onClick={() => startTemplate('blank')}><Plus size={16}/> Novo projeto</button>
    </header>

    {section === 'home' && <>
      {current && <section className="bo-h740h8-continue"><div><small>CONTINUE DE ONDE PAROU</small><h2>{current.title}</h2><p><strong>Serviço:</strong> {current.serviceName}</p><div><span>{PHASE_LABELS[current.phase] || 'Em construção'}</span><span>{current.journeyCount} Journeys</span><span>{current.blueprintCount} Blueprints</span><span>{current.whiteboardCount} Whiteboards</span></div></div><button type="button" className="primary" onClick={() => openProject(current)}>Continuar projeto <ArrowRight size={14}/></button></section>}

      <section className="bo-h740h8-section bo-h740h11-service-hub" data-service-project-hub="1"><header><div><small>SERVIÇO</small><h2>Projetos do serviço</h2><p>Entre em Serviço para escolher, criar ou retomar um projeto e acessar seu espaço de trabalho.</p></div><button type="button" onClick={() => setSection('projects')}>Ver projetos <ArrowRight size={13}/></button></header>
        <div className="bo-h740h11-service-summary"><span><FolderKanban size={20}/></span><div><strong>{projects.length} projeto{projects.length === 1 ? '' : 's'} ativo{projects.length === 1 ? '' : 's'}</strong><small>{current ? `Último: ${current.title} · serviço ${current.serviceName}` : 'Nenhum projeto criado ainda'}</small></div><button type="button" className="primary" onClick={() => setSection('projects')}>Abrir Serviço <ArrowRight size={13}/></button></div>
      </section>

      {favorites.length > 0 && <section className="bo-h740h8-section"><header><div><small>FAVORITOS</small><h2>Acesso rápido</h2></div></header><div className="bo-h740h8-project-grid compact">{favorites.map(card)}</div></section>}

      <section className="bo-h740h8-section"><header><div><small>TEMPLATES GLOBAIS</small><h2>Começar com um template</h2><p>Escolha um ponto de partida para criar outro projeto sem alterar o projeto atual.</p></div><button type="button" onClick={() => setSection('templates')}>Ver templates <ArrowRight size={13}/></button></header><div className="bo-h740h8-template-grid">{TEMPLATES.slice(0, 4).map((item) => <button key={item.id} type="button" onClick={() => startTemplate(item.id)}><span><LayoutTemplate size={18}/></span><strong>{item.title}</strong><small>{item.detail}</small><em>Usar template <ArrowRight size={12}/></em></button>)}</div></section>
    </>}

    {section === 'projects' && <section className="bo-h740h8-section bo-h740h8-all-projects" data-service-projects="1"><header className="bo-h740h11-service-projects-head"><div><small>SERVIÇO</small><h2>Escolha um projeto</h2><p>Abra um projeto para consultar informações, público, pesquisa, mapas e melhorias. As ferramentas continuam disponíveis no menu lateral.</p></div></header><div className="bo-h740h8-toolbar"><label><Search size={17}/><input type="search" aria-label="Buscar projetos ou serviços" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar projetos ou serviços"/></label><span>{filtered.length} projeto{filtered.length === 1 ? '' : 's'} ativo{filtered.length === 1 ? '' : 's'}</span></div>{filtered.length ? <div className="bo-h740h8-project-grid">{filtered.map(card)}</div> : <div className="bo-h740h8-empty"><Search size={24}/><strong>Nenhum projeto encontrado</strong><p>Tente outro termo ou crie um novo projeto.</p></div>}
      {archivedProjects.length > 0 && <section className="bo-h740h9-archived"><header><div><small>ARQUIVADOS</small><h2>Projetos preservados</h2><p>Arquivar remove da lista ativa, mas mantém metadados e snapshot local.</p></div></header><div>{archivedProjects.map((project) => <article key={project.id}><span><Archive size={16}/></span><div><strong>{project.title}</strong><small>Serviço: {project.serviceName} · atualizado {dateLabel(project.updatedAt)}</small></div><button type="button" onClick={() => restoreWorkspaceProject(project.id)}><RotateCcw size={14}/> Restaurar</button><button type="button" onClick={() => setDeleteTarget(project)} aria-label={`Excluir projeto arquivado ${project.title}`} className="bo-h744-archive-delete"><Trash2 size={14}/> Excluir</button></article>)}</div></section>}
    </section>}

    {section === 'templates' && <section className="bo-h740h8-section"><div className="bo-h740h8-template-grid large">{TEMPLATES.map((item) => <button key={item.id} type="button" onClick={() => startTemplate(item.id)}><span><Sparkles size={19}/></span><strong>{item.title}</strong><small>{item.detail}</small><em>{projectTemplateLabel(item.id)} <ArrowRight size={12}/></em></button>)}</div></section>}

    {dialog && <div className="bo-h740h8-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}>
      <section className="bo-h740h8-modal bo-h743-create-modal" role="dialog" aria-modal="true" aria-labelledby="bo-h740h8-create-title" data-project-creation-flow="H7.43">
        <header><div><small>NOVO PROJETO</small><h2 id="bo-h740h8-create-title">{projectTemplateLabel(dialog)}</h2><p>Projeto e serviço são conceitos separados. Comece com uma estrutura editável e ajuste depois.</p></div><button type="button" onClick={() => setDialog(null)} aria-label="Fechar"><X size={18}/></button></header>
        <div className="bo-h740h8-modal-body bo-h743-create-body">
          <label className="full"><span>Nome do projeto <em>(opcional — pode nomear depois)</em></span><input autoFocus value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="Ex.: Redesenho do atendimento"/></label>
          <details className="bo-h743-advanced"><summary>Nome do serviço e descrição (opcionais)</summary><div className="bo-h743-advanced-fields"><label><span>Serviço principal</span><input value={serviceName} onChange={(event) => setServiceName(event.target.value)} placeholder="Ex.: Atendimento ao cliente"/></label><label><span>Descrição</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Objetivo ou transformação deste projeto"/></label></div></details>
        </div>
        <footer><button type="button" onClick={() => setDialog(null)}>Cancelar</button><button type="button" className="primary" onClick={submit}>Criar e abrir <ArrowRight size={14}/></button></footer>
      </section>
    </div>}

    {deleteTarget && <div className="bo-h740h8-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null); }}>
      <section className="bo-h740h8-modal bo-h744-delete-modal" role="dialog" aria-modal="true" aria-labelledby="bo-h744-delete-title">
        <header><div><small>EXCLUSÃO DEFINITIVA</small><h2 id="bo-h744-delete-title">Excluir “{deleteTarget.title}”?</h2><p>Isso remove o projeto e sua cópia local de Jornadas, Blueprints, Whiteboards e demais registros neste navegador. Não é possível desfazer.</p></div><button type="button" onClick={() => setDeleteTarget(null)} aria-label="Fechar"><X size={18}/></button></header>
        <footer><button type="button" onClick={() => setDeleteTarget(null)} autoFocus>Cancelar</button><button type="button" className="bo-h744-delete-confirm" onClick={confirmDeletion}><Trash2 size={15}/> Excluir definitivamente</button></footer>
      </section>
    </div>}

    {renameTarget && <div className="bo-h740h8-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRenameTarget(null); }}><section className="bo-h740h8-modal bo-h740h9-rename-modal" role="dialog" aria-modal="true" aria-labelledby="bo-h740h9-rename-title"><header><div><small>PROJETO</small><h2 id="bo-h740h9-rename-title">Renomear projeto</h2><p>O nome do serviço permanece independente e não será alterado.</p></div><button type="button" onClick={() => setRenameTarget(null)} aria-label="Fechar"><X size={18}/></button></header><div className="bo-h740h8-modal-body"><label className="full"><span>Nome do projeto</span><input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && renameValue.trim()) submitRename(); }}/></label></div><footer><button type="button" onClick={() => setRenameTarget(null)}>Cancelar</button><button type="button" className="primary" disabled={!renameValue.trim()} onClick={submitRename}>Salvar nome</button></footer></section></div>}
  </section>;
}

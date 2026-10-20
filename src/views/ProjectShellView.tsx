import {
  ArrowRight, BookOpen, FolderKanban,
} from '../design-system/icons';
import type { StudioController } from '../state/useStudioController';

export type ProjectShellSection = 'overview' | 'library';

type Props = {
  studio: StudioController;
  section: ProjectShellSection;
  openService: () => void;
  openLibraryPage: (page: 'hierarchies' | 'personas' | 'needs' | 'jobs' | 'pains' | 'hypotheses' | 'problems' | 'evidence' | 'portfolio' | 'metrics' | 'templates' | 'archive') => void;
};

const count = (value: Record<string, unknown> | undefined) => Object.keys(value ?? {}).length;

export function ProjectShellView({ studio, section, openService, openLibraryPage }: Props) {
  const { graph, projects, activeProjectId } = studio;
  const project = projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? null;
  const serviceName = graph.service.name || project?.serviceName || 'Serviço ainda não definido';
  const journeys = count(graph.journeys);
  const blueprints = Object.values(graph.views?.whiteboards ?? {}).filter((item) => item.viewKind === 'blueprint').length;
  const whiteboards = Object.values(graph.views?.whiteboards ?? {}).filter((item) => item.viewKind !== 'blueprint').length;
  const personas = count(graph.entities?.persona);
  const needs = count(graph.entities?.need);
  const jobs = count(graph.entities?.job);
  const pains = count(graph.entities?.pain);
  const hypotheses = count(graph.entities?.problemHypothesis);
  const problems = count(graph.entities?.problem);
  const evidence = count(graph.entities?.evidence);
  const metrics = count(graph.entities?.metric);
  const opportunities = count(graph.opportunities);
  const researchEvidence = evidence;
  const serviceArtifacts = journeys + blueprints + whiteboards;

  if (section === 'library') {
    const groups = [
      {
        title: 'Pessoas & contexto', detail: 'Quem vive a experiência e o que precisa alcançar.', items: [
          ['Personas', personas, 'personas'], ['Necessidades', needs, 'needs'], ['Jobs', jobs, 'jobs'], ['Dores', pains, 'pains'],
        ] as const,
      },
      {
        title: 'Descoberta', detail: 'O que ainda precisa ser provado e o que já possui evidência.', items: [
          ['Hipóteses', hypotheses, 'hypotheses'], ['Problemas', problems, 'problems'], ['Evidências', evidence, 'evidence'], ['Hierarquias', personas, 'hierarchies'],
        ] as const,
      },
      {
        title: 'Gestão', detail: 'Objetos reutilizáveis que ajudam a melhorar e medir o serviço.', items: [
          ['Oportunidades', opportunities, 'portfolio'], ['Métricas', metrics, 'metrics'], ['Templates do projeto', count(graph.entities?.template), 'templates'], ['Arquivo', 0, 'archive'],
        ] as const,
      },
    ];
    return <section className="bo-h740h10-shell bo-h740h10-library" data-project-shell="7.40-H10" data-project-shell-section="library">
      <header className="bo-h740h10-shell__hero"><div><small>BIBLIOTECA DO PROJETO</small><h1>Pessoas, necessidades e registros do serviço</h1><p>As entidades ficam acessíveis sob demanda. Elas apoiam o serviço, mas não precisam ocupar permanentemente a navegação principal.</p></div><button type="button" onClick={openService}>Abrir serviço <ArrowRight size={14}/></button></header>
      <div className="bo-h740h10-library-grid">{groups.map((group) => <article key={group.title}><header><h2>{group.title}</h2><p>{group.detail}</p></header><div>{group.items.map(([label, total, page]) => <button type="button" key={page} onClick={() => openLibraryPage(page)}><span><strong>{label}</strong><small>{total} {total === 1 ? 'item' : 'itens'}</small></span><ArrowRight size={14}/></button>)}</div></article>)}</div>
    </section>;
  }

  return <section className="bo-h740h10-shell" data-project-shell="7.40-H10" data-project-shell-section="overview">
    <header className="bo-h740h10-shell__hero">
      <div><small>PROJETO</small><h1>{project?.title || serviceName}</h1><p>{project?.description || 'Organize o trabalho do projeto e entre no serviço apenas quando quiser desenhar, validar ou operar a experiência.'}</p></div>
      <div className="bo-h740h10-shell__status"><span>Serviço principal</span><strong>{serviceName}</strong><small>{serviceArtifacts} artefato{serviceArtifacts === 1 ? '' : 's'} de serviço</small></div>
    </header>

    <section className="bo-h740h10-primary-card">
      <div className="bo-h740h10-primary-card__icon"><FolderKanban size={22}/></div>
      <div><small>SERVIÇO PRINCIPAL</small><h2>{serviceName}</h2><p>Abra o serviço para criar Jornadas, definir o público-alvo e acompanhar a evolução da experiência.</p><div><span>{journeys} Journey{journeys === 1 ? '' : 's'}</span><span>{blueprints} Blueprint{blueprints === 1 ? '' : 's'}</span><span>{whiteboards} Whiteboard{whiteboards === 1 ? '' : 's'}</span></div></div>
      <button type="button" className="primary" onClick={openService}>Abrir serviço <ArrowRight size={14}/></button>
    </section>

    <section className="bo-h740h10-shell__section" data-project-elements="H17.0.7"><header><div><small>MODELO DO SERVIÇO</small><h2>Elementos do projeto</h2><p>Consulte o que já foi criado ou entre diretamente na área para adicionar novos elementos.</p></div></header>
      <div className="bo-h740h10-area-grid">
        {([
          ['Personas', personas, 'personas', Object.values(graph.entities?.persona ?? {}).slice(0, 2).map((item) => item.title || 'Persona')],
          ['Necessidades', needs, 'needs', Object.values(graph.entities?.need ?? {}).slice(0, 2).map((item) => item.title || 'Necessidade')],
          ['Dores', pains, 'pains', Object.values(graph.entities?.pain ?? {}).slice(0, 2).map((item) => item.title || 'Dor')],
          ['Evidências', evidence, 'evidence', Object.values(graph.entities?.evidence ?? {}).slice(0, 2).map((item) => item.title || 'Evidência')],
          ['Oportunidades', opportunities, 'portfolio', Object.values(graph.opportunities ?? {}).slice(0, 2).map((item) => item.title || 'Oportunidade')],
          ['Métricas', metrics, 'metrics', Object.values(graph.entities?.metric ?? {}).slice(0, 2).map((item) => item.title || 'Métrica')],
        ] as const).map(([label, total, page, examples]) => <button type="button" key={page} onClick={() => openLibraryPage(page)}><span><BookOpen size={18}/></span><strong>{label}</strong><small>{total} {total === 1 ? 'registro' : 'registros'}</small><small>{examples.length ? examples.join(' · ') : 'Nenhum registro criado ainda'}</small><em>Visualizar ou criar <ArrowRight size={12}/></em></button>)}
        <button type="button" onClick={openService}><span><FolderKanban size={18}/></span><strong>Jornadas e Blueprints</strong><small>{journeys} Jornadas · {blueprints} Blueprints</small><em>Visualizar ou criar no serviço <ArrowRight size={12}/></em></button>
      </div>
    </section>
    <section className="bo-h740h10-shell__section"><header><div><small>ATIVIDADE RECENTE</small><h2>Resumo do projeto</h2></div></header><div className="bo-h740h10-summary-grid"><article><strong>{journeys}</strong><span>Journeys</span></article><article><strong>{researchEvidence}</strong><span>Evidências</span></article><article><strong>{problems}</strong><span>Problemas</span></article><article><strong>{metrics}</strong><span>Métricas</span></article></div></section>
  </section>;
}

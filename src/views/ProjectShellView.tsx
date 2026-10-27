import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, FolderKanban,
} from '../design-system/icons';
import { contextEntityTitle, type ContextKind } from '../services/context-library';
import { projectContextRecords, filterProjectContext, projectRelatedRecords, projectHasLinkedEvidence } from '../services/project-context-index';
import './project-context-workspace.css';
import type { StudioController } from '../state/useStudioController';

export type ProjectShellSection = 'overview' | 'library';

type Props = {
  studio: StudioController;
  section: ProjectShellSection;
  openService: () => void;
  onCreateMap: () => void;
  openWhiteboards: () => void;
  openLibraryPage: (page: 'hierarchies' | 'personas' | 'needs' | 'jobs' | 'pains' | 'hypotheses' | 'problems' | 'evidence' | 'portfolio' | 'metrics' | 'templates' | 'archive') => void;
};

const count = (value: Record<string, unknown> | undefined) => Object.keys(value ?? {}).length;

export function ProjectShellView({ studio, section, openService, onCreateMap, openWhiteboards, openLibraryPage }: Props) {
  const { graph, projects, activeProjectId } = studio;
  const project = projects.find((item) => item.id === activeProjectId) ?? projects[0] ?? null;
  const serviceName = graph.service.name || project?.serviceName || 'Serviço ainda não definido';
  const journeys = count(graph.journeys);
  const detachedMaps = Object.values(graph.views?.whiteboards ?? {}).filter(item => item.viewKind === 'blueprint' && (!item.journeyId || !graph.journeys[item.journeyId])).length;
  const serviceMaps = journeys + detachedMaps;
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
  const serviceArtifacts = serviceMaps + whiteboards;
  // The current ServiceGraph is the project scope; never copy entities for a dashboard.
  const projectId = project?.id || graph.service.project?.id || graph.service.id;
  const shellRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    // Project switching must not preserve an old editor scroll offset beneath the sticky header.
    let parent = shellRef.current?.parentElement;
    while (parent) {
      const style = window.getComputedStyle(parent);
      if (/(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight + 12) {
        parent.scrollTop = 0;
        break;
      }
      parent = parent.parentElement;
    }
  }, [projectId, section]);
  type Area = 'overview' | 'audience' | 'research' | 'maps' | 'improvement';
  const allowedAreas: Area[] = ['overview', 'audience', 'research', 'maps', 'improvement'];
  const [area, setArea] = useState<Area>(() => {
    try {
      const saved = sessionStorage.getItem('bo-project-area:' + projectId);
      return allowedAreas.includes(saved as Area) ? saved as Area : 'overview';
    } catch { return 'overview'; }
  });
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | ContextKind>('all');
  const [personaId, setPersonaId] = useState('all');
  const [hasEvidence, setHasEvidence] = useState(false);
  const allEntities = useMemo(() => projectContextRecords(graph), [graph]);
  const persons = allEntities.filter(item => item.contextKind === 'persona');
  const relatedTo = (id: string) => projectRelatedRecords(allEntities, id);
  const hasLinkedEvidence = (id: string) => projectHasLinkedEvidence(allEntities, id);
  const targetKinds: ContextKind[] = area === 'research' ? ['evidence','problemHypothesis','problem'] : ['persona','need','job','pain','problemHypothesis','problem','evidence'];
  const filteredEntities = filterProjectContext(allEntities, {area: area === 'research' ? 'research' : 'audience', query, kind, personaId, hasEvidence});
  const pageFor = (value: ContextKind): Parameters<Props['openLibraryPage']>[0] =>
    ({ persona:'personas',need:'needs',job:'jobs',pain:'pains',problemHypothesis:'hypotheses',problem:'problems',evidence:'evidence' } as const)[value];
  const focusEntity = (item: { id: string; contextKind: ContextKind }) => {
    // Existing detail panels understand this focus contract for Personas and Necessidades.
    if (item.contextKind === 'need' || item.contextKind === 'persona') {
      try { sessionStorage.setItem('bo-service-object-focus', JSON.stringify({kind:item.contextKind,id:item.id})); } catch { /* optional focus */ }
    }
    openLibraryPage(pageFor(item.contextKind));
  };
  const areaLabel: Array<{ id: Area; label: string }> = [
    {id:'overview',label:'Visão geral'}, {id:'audience',label:'Público e contexto'},
    {id:'research',label:'Pesquisa e evidências'}, {id:'maps',label:'Mapas e Whiteboard'},
    {id:'improvement',label:'Análise e melhorias'},
  ];
  const chooseArea = (next: Area) => {
    setArea(next);
    setQuery('');
    setKind('all');
    setPersonaId('all');
    setHasEvidence(false);
    try { sessionStorage.setItem('bo-project-area:' + projectId, next); } catch { /* local preference */ }
  };
  const areaTabs = <nav className="bo-project-context-tabs" role="tablist" aria-label="Áreas deste projeto">
    {areaLabel.map(item => <button type="button" role="tab" key={item.id} id={`bo-pctx-tab-${item.id}`} aria-controls="bo-project-context-panel" aria-selected={area === item.id} className={area === item.id ? 'is-current' : ''} onClick={() => chooseArea(item.id)}>{item.label}</button>)}
  </nav>;

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
    return <section ref={shellRef} className="bo-h740h10-shell bo-h740h10-library" data-project-shell="7.40-H10" data-project-shell-section="library">
      <header className="bo-h740h10-shell__hero"><div><small>BIBLIOTECA DO PROJETO</small><h1>Pessoas, necessidades e registros do serviço</h1><p>As entidades ficam acessíveis sob demanda. Elas apoiam o serviço, mas não precisam ocupar permanentemente a navegação principal.</p></div><button type="button" onClick={openService}>Abrir serviço <ArrowRight size={14}/></button></header>
      <div className="bo-h740h10-library-grid">{groups.map((group) => <article key={group.title}><header><h2>{group.title}</h2><p>{group.detail}</p></header><div>{group.items.map(([label, total, page]) => <button type="button" key={page} onClick={() => openLibraryPage(page)}><span><strong>{label}</strong><small>{total} {total === 1 ? 'item' : 'itens'}</small></span><ArrowRight size={14}/></button>)}</div></article>)}</div>
    </section>;
  }

  return <section ref={shellRef} className="bo-h740h10-shell" data-project-shell="7.40-H10" data-project-shell-section="overview">
    <header className="bo-h740h10-shell__hero bo-h31-project-header">
      <div><small>PROJETO ATUAL</small><h1>{project?.title || serviceName}</h1><p>{project?.description || 'Organize o projeto e acesse suas informações pelas abas abaixo.'}</p></div>
    </header>

    {areaTabs}
    <div id="bo-project-context-panel" role="tabpanel" aria-labelledby={`bo-pctx-tab-${area}`} className="bo-project-context-panel">
    {area === 'overview' ? <>
    <section className="bo-h31-overview" data-project-overview="compact-h31">
      <div className="bo-h31-overview-service">
        <span className="bo-h31-overview-icon"><FolderKanban size={22}/></span>
        <div className="bo-h31-overview-copy">
          <small>SERVIÇO PRINCIPAL</small>
          <h2>{serviceName}</h2>
          <p>{serviceMaps > 0 ? 'Continue o desenho do serviço e alterne entre Jornada e Blueprint.' : 'Comece pelo mapa do serviço. Pessoas, necessidades e evidências permanecem organizadas nas abas do projeto.'}</p>
        </div>
        {serviceMaps > 0
          ? <button type="button" className="primary" onClick={openService}>Abrir mapas <ArrowRight size={15}/></button>
          : <button type="button" className="primary" onClick={onCreateMap}>Criar mapa <ArrowRight size={15}/></button>}
      </div>
      <div className="bo-h31-overview-stats" aria-label="Indicadores do projeto">
        <div><strong>{serviceMaps}</strong><span>Mapas</span></div>
        <div><strong>{personas}</strong><span>Personas</span></div>
        <div><strong>{needs}</strong><span>Necessidades</span></div>
        <div><strong>{evidence}</strong><span>Evidências</span></div>
      </div>
    </section>
    </> : (area === 'audience' || area === 'research') ? <section className="bo-project-context-collection">
      <header className="bo-project-context-section-header"><div><small>{area === 'audience' ? 'PÚBLICO E CONTEXTO' : 'PESQUISA DO PROJETO'}</small><h2>{area === 'audience' ? 'Pessoas, necessidades e relações' : 'Hipóteses, problemas e evidências'}</h2><p>Registros deste projeto, vinculados ao mesmo Service Graph usado nos mapas. Nenhum registro é duplicado.</p></div><button type="button" className="primary" onClick={() => openLibraryPage(area === 'audience' ? 'needs' : 'evidence')}>+ {area === 'audience' ? 'Nova necessidade' : 'Nova evidência'}</button></header>
      <div className="bo-project-context-filters">
        <label><span>Buscar registros</span><input aria-label="Buscar registros do projeto" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nome, descrição ou responsável"/></label>
        <label><span>Categoria</span><select value={kind} onChange={event => setKind(event.target.value as 'all' | ContextKind)}><option value="all">Todas as categorias</option>{targetKinds.map(value => <option value={value} key={value}>{({persona:'Personas',need:'Necessidades',job:'Jobs',pain:'Dores',problemHypothesis:'Hipóteses',problem:'Problemas',evidence:'Evidências'} as Record<ContextKind,string>)[value]}</option>)}</select></label>
        <label><span>Persona relacionada</span><select value={personaId} onChange={event => setPersonaId(event.target.value)}><option value="all">Todas as Personas</option>{persons.map(person => <option value={person.id} key={person.id}>{contextEntityTitle(person)}</option>)}</select></label>
        <label className="bo-project-context-check"><input type="checkbox" checked={hasEvidence} onChange={event => setHasEvidence(event.target.checked)}/> Com evidência</label>
      </div>
      <div className="bo-project-context-result-count"><strong>{filteredEntities.length}</strong> registro{filteredEntities.length === 1 ? '' : 's'} no projeto <button type="button" onClick={() => {setQuery('');setKind('all');setPersonaId('all');setHasEvidence(false)}}>Limpar filtros</button></div>
      {filteredEntities.length ? <div className="bo-project-context-records">{filteredEntities.slice(0,100).map(item => { const related = relatedTo(item.id); return <button type="button" key={item.id} className="bo-project-context-record" onClick={() => focusEntity(item)}><span><small>{({persona:'PERSONA',need:'NECESSIDADE',job:'JOB',pain:'DOR',problemHypothesis:'HIPÓTESE',problem:'PROBLEMA',evidence:'EVIDÊNCIA'} as Record<ContextKind,string>)[item.contextKind]}</small><strong>{contextEntityTitle(item)}</strong><em>{item.description || 'Sem descrição'}</em><small>{related.length} relação(ões) · {hasLinkedEvidence(item.id) || item.contextKind === 'evidence' ? 'Com evidência' : 'Sem evidência vinculada'}</small></span><ArrowRight size={17}/></button>})}</div> : <div className="bo-project-context-empty">Nenhum registro corresponde aos filtros. Altere as condições ou crie um novo item na biblioteca deste projeto.</div>}
      {filteredEntities.length > 100 && <p className="bo-project-context-result-count">Exibindo os 100 primeiros resultados; refine os filtros para localizar outros registros.</p>}
    </section> : area === 'maps' ? <section className="bo-project-context-collection"><header className="bo-project-context-section-header"><div><small>DESENHO DO SERVIÇO</small><h2>Mapas e Whiteboards deste projeto</h2><p>Jornada, Blueprint e Matriz são perspectivas do mesmo mapa. Os Whiteboards continuam vinculados ao serviço.</p></div><button type="button" className="primary" onClick={openService}>Abrir Mapas <ArrowRight size={15}/></button></header><div className="bo-project-context-records">{Object.values(graph.journeys).map(journey => <button type="button" className="bo-project-context-record" key={journey.id} onClick={openService}><span><small>MAPA DO SERVIÇO</small><strong>{journey.name}</strong><em>{journey.stageIds.length} etapa(s) · Jornada / Blueprint / Matriz</em></span><ArrowRight size={17}/></button>)}{Object.values(graph.views?.whiteboards ?? {}).filter(board => board.viewKind === 'free').map(board => <button type="button" className="bo-project-context-record" key={board.id} onClick={openWhiteboards}><span><small>WHITEBOARD</small><strong>{board.name}</strong><em>{Object.keys(board.items ?? {}).length} objeto(s)</em></span><ArrowRight size={17}/></button>)}</div>{!serviceArtifacts && <div className="bo-project-context-empty">Este projeto ainda não tem mapas ou quadros. Comece pelo primeiro mapa do serviço.</div>}</section> : <section className="bo-project-context-collection"><header className="bo-project-context-section-header"><div><small>EVOLUÇÃO DO PROJETO</small><h2>Problemas, oportunidades e resultados</h2><p>Consulte o que já foi registrado e continue o trabalho nas bibliotecas existentes.</p></div><button type="button" className="primary" onClick={() => openLibraryPage('portfolio')}>Abrir oportunidades <ArrowRight size={15}/></button></header><div className="bo-project-context-summary">{[['Problemas',problems,'problems'],['Oportunidades',opportunities,'portfolio'],['Métricas',metrics,'metrics'],['Evidências',evidence,'evidence']].map(([label,total,page]) => <button type="button" key={String(page)} onClick={() => openLibraryPage(page as Parameters<Props['openLibraryPage']>[0])}><strong>{total}</strong><span>{label}</span><ArrowRight size={15}/></button>)}</div></section>}
    </div>
  </section>;
}

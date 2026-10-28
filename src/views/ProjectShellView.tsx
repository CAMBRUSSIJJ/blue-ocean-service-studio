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
  const recentMap = Object.values(graph.journeys).sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')))[0] ?? null;
  const mapStageNames = recentMap?.stageIds.map((id) => graph.stages[id]?.name?.trim()).filter((name): name is string => Boolean(name)).slice(0, 4) ?? [];
  const mapUpdatedAt = recentMap?.updatedAt ? new Date(recentMap.updatedAt) : null;
  const updatedLabel = mapUpdatedAt && !Number.isNaN(mapUpdatedAt.getTime())
    ? `Atualizado em ${mapUpdatedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
    : 'Disponível neste projeto';
  const registeredCount = personas + needs + evidence;
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
      <div><small>VISÃO GERAL DO PROJETO</small><h1>{project?.title || serviceName}</h1><p>{project?.description || `Serviço: ${serviceName}. Organize os registros e continue o desenho quando desejar.`}</p></div>
    </header>

    <details className="bo-h33-project-more" key={projectId} >
      <summary>Outras visões do projeto <span>{area !== 'overview' ? `· ${areaLabel.find(item => item.id === area)?.label ?? ''}` : ''}</span></summary>
      {areaTabs}
    </details>
    <div id="bo-project-context-panel" role="tabpanel" aria-labelledby={`bo-pctx-tab-${area}`} className="bo-project-context-panel">
    {area === 'overview' ? <>
    <section className="bo-h31-overview bo-h33-focus-overview" data-project-overview="compact-h31">
      <div className="bo-h31-overview-service bo-h33-context-strip">
        <span className="bo-h31-overview-icon"><FolderKanban size={22}/></span>
        <div className="bo-h31-overview-copy">
          <small>SERVIÇO PRINCIPAL</small>
          <h2>{serviceName}</h2>
          <p>{project?.description || 'Este serviço reúne seus mapas, pessoas, pesquisa e oportunidades no mesmo projeto.'}</p>
        </div>
        <span className="bo-h33-context-label">Projeto · Serviço · Mapa</span>
      </div>

      <section className="bo-h33-work-focus" aria-label={recentMap ? 'Retomar mapa do serviço' : 'Começar o mapa do serviço'}>
        <div className="bo-h33-map-preview" role="img" aria-label={recentMap ? `Miniatura estrutural do mapa ${recentMap.name} com ${recentMap.stageIds.length} etapas` : 'Nenhum mapa criado neste projeto'}>
          <div className="bo-h33-map-preview__top"><span>MAPA DO SERVIÇO</span><span>{recentMap ? `${recentMap.stageIds.length} ${recentMap.stageIds.length === 1 ? 'etapa' : 'etapas'}` : 'Novo mapa'}</span></div>
          <div className="bo-h33-map-preview__stages">
            {recentMap ? (mapStageNames.length ? mapStageNames : ['Etapas do serviço']).map((name, index) =>
              <div key={index} className="bo-h33-map-preview__stage"><span>{index + 1}</span><strong>{name}</strong></div>
            ) : <div className="bo-h33-map-preview__placeholder">Seu mapa aparecerá aqui</div>}
          </div>
          <div className="bo-h33-map-preview__lines" aria-hidden="true"><i/><i/><i/></div>
        </div>
        <div className="bo-h33-work-focus__content">
          <small>{recentMap ? 'CONTINUE DE ONDE PAROU' : 'PRIMEIRO PASSO'}</small>
          <h2>{recentMap ? recentMap.name : 'Crie seu primeiro mapa'}</h2>
          <p>{recentMap ? 'Edite a experiência na Jornada ou detalhe a operação no Blueprint. As duas visualizações compartilham o mesmo mapa.' : 'Desenhe as etapas e interações do serviço. Você pode começar sem preencher outros formulários.'}</p>
          <span className="bo-h33-updated">{updatedLabel}</span>
          <button type="button" className="primary bo-h33-main-cta" onClick={recentMap ? openService : onCreateMap}>
            {recentMap ? 'Continuar mapa' : 'Criar mapa'} <ArrowRight size={16}/>
          </button>
        </div>
      </section>

      <section className="bo-h33-guided-section" aria-label="Registros e próximos passos">
        <header className="bo-h33-guided-heading"><div><small>CONTEXTO DO SERVIÇO</small><h2>Complete quando fizer sentido</h2><p>{registeredCount ? 'Mantenha pessoas, necessidades e evidências conectadas ao mapa.' : 'Você não precisa seguir uma ordem. Comece pelo registro que ajuda seu trabalho agora.'}</p></div><span>{registeredCount} {registeredCount === 1 ? 'registro' : 'registros'}</span></header>
        <div className="bo-h31-overview-stats bo-h33-overview-stats bo-h33-guided-grid" aria-label="Acessos aos registros do projeto">
          <div className="bo-h33-map-count"><strong>{serviceMaps}</strong><span>{serviceMaps === 1 ? 'Mapa' : 'Mapas'}</span><small>O desenho do seu serviço</small></div>
          <div><button type="button" onClick={() => openLibraryPage('personas')} aria-label={personas ? 'Ver Personas' : 'Cadastrar primeira Persona'}><strong>{personas}</strong><span>Personas <ArrowRight size={14}/></span><small>{personas ? 'Ver e editar perfis' : 'Quem utiliza este serviço?'}</small><em>{personas ? 'Ver Personas' : 'Adicionar Persona'}</em></button></div>
          <div><button type="button" onClick={() => openLibraryPage('needs')} aria-label={needs ? 'Ver Necessidades' : 'Cadastrar primeira Necessidade'}><strong>{needs}</strong><span>Necessidades <ArrowRight size={14}/></span><small>{needs ? 'Revisar necessidades' : 'O que essas pessoas precisam?'}</small><em>{needs ? 'Ver Necessidades' : 'Adicionar Necessidade'}</em></button></div>
          <div><button type="button" onClick={() => openLibraryPage('evidence')} aria-label={evidence ? 'Ver Evidências' : 'Cadastrar primeira Evidência'}><strong>{evidence}</strong><span>Evidências <ArrowRight size={14}/></span><small>{evidence ? 'Consultar fontes existentes' : 'O que sustenta as decisões?'}</small><em>{evidence ? 'Ver Evidências' : 'Adicionar Evidência'}</em></button></div>
        </div>
      </section>

      <div className="bo-h33-local-backup" role="note">
        <div><strong>Seus dados estão salvos apenas neste dispositivo.</strong><span>O navegador não é um backup. Guarde uma cópia antes de limpar dados ou trocar de computador.</span></div>
        <button type="button" onClick={studio.handleExport}>Exportar backup <ArrowRight size={14}/></button>
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

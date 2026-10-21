// H7.40-H3 legacy metrics meta: metrics: { title: 'Métricas'
// H7.40-H3 legacy labels: Portfólio · Métricas
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Archive, BarChart3, BriefcaseBusiness, CheckCircle2, Filter, FolderKanban, Lightbulb,
  MoreVertical, Plus, Search, Settings2, Table2, Target, UserRound, UsersRound, X,
} from '../design-system/icons';
import type { GraphEntity, Opportunity } from '../domain/model';
import { makeId } from '../domain/graph-operations';
import type { StudioController } from '../state/useStudioController';
import { PersonasView } from './PersonasView';
import { NeedsView } from './NeedsView';
import { JobsView } from './JobsView';
import { PainsView } from './PainsView';
import { HypothesesView } from './HypothesesView';
import { ProblemsView } from './ProblemsView';
import { EvidenceView } from './EvidenceView';
import {
  contextEntityTitle,
  contextEntityUsage,
  createContextEntity,
  listContextEntities,
  removeContextEntity,
  updateContextEntity,
  type ContextKind,
} from '../services/context-library';

export type WorkspaceLibraryPage = 'hierarchies' | 'personas' | 'needs' | 'jobs' | 'pains' | 'hypotheses' | 'problems' | 'evidence' | 'portfolio' | 'metrics' | 'templates' | 'archive';

type BasicRow = {
  id: string;
  name: string;
  status?: string;
  source?: string;
  type?: string;
  created?: string;
  updated?: string;
  owner?: string;
  tags?: string;
  usedIn?: string;
  raw?: GraphEntity;
  kind?: ContextKind;
};

type ModalState = {
  mode: 'create' | 'edit';
  page: WorkspaceLibraryPage;
  id?: string;
  title: string;
  description: string;
  owner: string;
};

const pageMeta: Record<WorkspaceLibraryPage, { title: string; singular: string; create: string; description: string }> = {
  hierarchies: { title: 'Hierarquias', singular: 'Hierarquia', create: 'Criar hierarquia', description: 'Veja como pessoas, necessidades, dores e evidências se conectam no serviço.' },
  personas: { title: 'Personas', singular: 'Persona', create: 'Criar persona', description: 'Pessoas e perfis usados nas jornadas, blueprints e decisões do serviço.' },
  needs: { title: 'Necessidades', singular: 'Necessidade', create: 'Criar necessidade', description: 'Necessidades explícitas que o serviço precisa resolver.' },
  jobs: { title: 'Jobs', singular: 'Job', create: 'Criar job', description: 'Progressos que as pessoas tentam realizar em determinado contexto.' },
  pains: { title: 'Dores', singular: 'Dor', create: 'Criar dor', description: 'Fricções observadas antes de serem estruturadas como problemas.' },
  hypotheses: { title: 'Hipóteses', singular: 'Hipótese', create: 'Criar hipótese', description: 'Explicações que ainda precisam ser sustentadas ou refutadas.' },
  problems: { title: 'Problemas', singular: 'Problema', create: 'Criar hipótese', description: 'Problemas já sustentados e prontos para orientar melhoria.' },
  evidence: { title: 'Evidências', singular: 'Evidência', create: 'Criar evidência', description: 'Observações, entrevistas, dados e registros que sustentam decisões.' },
  portfolio: { title: 'Oportunidades', singular: 'Item', create: 'Criar oportunidade', description: 'Catálogo de dores, oportunidades e soluções. A execução priorizada acontece em Serviço → Melhorar → Iniciativas.' },
  metrics: { title: 'Catálogo de métricas', singular: 'Métrica', create: 'Criar métrica', description: 'Defina o que medir. O acompanhamento de baseline, meta e resultado acontece em Serviço → Melhorar → Resultados.' },
  templates: { title: 'Templates', singular: 'Template', create: 'Criar template', description: 'Modelos reutilizáveis para acelerar novos mapas e estruturas.' },
  archive: { title: 'Arquivo', singular: 'Item arquivado', create: 'Arquivar item', description: 'Conteúdo retirado do trabalho ativo, preservado para consulta.' },
};

const pageKind: Partial<Record<WorkspaceLibraryPage, ContextKind>> = {
  personas: 'persona', needs: 'need', jobs: 'job', pains: 'pain', hypotheses: 'problemHypothesis', problems: 'problem', evidence: 'evidence',
};

const formatDate = (value: unknown) => {
  const text = String(value ?? '');
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

function entityRows(studio: StudioController, kind: ContextKind): BasicRow[] {
  return listContextEntities(studio.graph, kind).map((entity) => {
    const usage = contextEntityUsage(studio.graph, kind, entity.id);
    return {
      id: entity.id,
      name: contextEntityTitle(entity),
      status: kind === 'problemHypothesis' ? String(entity.status || 'Hipótese') : String(entity.status || 'Ativo'),
      created: formatDate(entity.createdAt),
      updated: formatDate(entity.updatedAt ?? entity.createdAt),
      owner: String(entity.owner || 'Você'),
      tags: Array.isArray(entity.tags) && entity.tags.length ? entity.tags.map(String).join(', ') : 'Sem tags',
      usedIn: usage.instances ? `${usage.instances} uso(s)` : 'Não usado',
      raw: entity,
      kind,
    };
  });
}

function metricRows(studio: StudioController): BasicRow[] {
  return Object.values(studio.graph.entities?.metric ?? {}).map((entity) => ({
    id: entity.id,
    name: String(entity.title || entity.name || 'Métrica'),
    source: String(entity.source || 'Manual'),
    type: String(entity.metricType || entity.type || 'Número'),
    created: formatDate(entity.createdAt),
    updated: formatDate(entity.updatedAt ?? entity.createdAt),
    usedIn: entity.stageId ? 'Journey / etapa' : 'Serviço',
    tags: Array.isArray(entity.tags) && entity.tags.length ? entity.tags.map(String).join(', ') : 'Sem tags',
    raw: entity,
  }));
}

function templateRows(studio: StudioController): BasicRow[] {
  const records = Object.values(studio.graph.entities?.template ?? {});
  const own = records.map((entity) => ({ id: entity.id, name: String(entity.title || 'Template'), created: formatDate(entity.createdAt), owner: String(entity.owner || 'Você'), raw: entity }));
  return [...own,
    { id: 'template-service-blueprint', name: 'Service Blueprint — Frontstage / Backstage', created: 'Padrão', owner: 'BLUE OCEAN' },
    { id: 'template-journey-discovery', name: 'Journey map — Discovery', created: 'Padrão', owner: 'BLUE OCEAN' },
    { id: 'template-research', name: 'Pesquisa e evidências', created: 'Padrão', owner: 'BLUE OCEAN' },
  ];
}

function archivedRows(studio: StudioController): BasicRow[] {
  const journeys = Object.values(studio.graph.journeys).filter((item) => item.status === 'archived').map((item) => ({ id: item.id, name: item.name, type: 'Journey map', updated: formatDate(item.updatedAt), owner: item.owner || 'Você' }));
  const entities = Object.entries(studio.graph.entities ?? {}).flatMap(([kind, records]) => Object.values(records).filter((item) => item.status === 'archived').map((item) => ({ id: item.id, name: String(item.title || item.name || 'Item'), type: kind, updated: formatDate(item.updatedAt), owner: String(item.owner || 'Você') })));
  return [...journeys, ...entities];
}

function HierarchiesView({ studio }: { studio: StudioController }) {
  const personas = listContextEntities(studio.graph, 'persona');
  const allKinds: ContextKind[] = ['need', 'job', 'pain', 'problemHypothesis', 'problem', 'evidence'];
  return <div className="bo1205h3-hierarchy-grid">
    {personas.length ? personas.map((persona) => {
      const related = allKinds.flatMap((kind) => listContextEntities(studio.graph, kind).filter((item) => {
        const ids = [
          ...(Array.isArray(item.relatedIds) ? item.relatedIds : []),
          ...(Array.isArray(item.personaIds) ? item.personaIds : []),
        ].map(String);
        return ids.includes(persona.id);
      }).map((item) => ({ kind, item })));
      return <article key={persona.id}><div className="bo1205h3-hierarchy-person"><UserRound size={17}/><strong>{contextEntityTitle(persona)}</strong><span>{related.length} conexão(ões)</span></div><div className="bo1205h3-hierarchy-links">{related.length ? related.map(({ kind, item }) => <div key={`${kind}-${item.id}`}><span>{kind === 'need' ? 'Necessidade' : kind === 'job' ? 'Job' : kind === 'pain' ? 'Dor' : kind === 'evidence' ? 'Evidência' : 'Problema'}</span><b>{contextEntityTitle(item)}</b></div>) : <div className="bo-h740h4-hierarchy-empty"><strong>Esta Persona ainda está isolada</strong><p>Conecte uma necessidade, Job, dor ou evidência para enxergar como o contexto se encadeia.</p><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('bo-open-context-page', { detail: 'needs' }))}>Abrir Necessidades →</button></div>}</div></article>;
    }) : <div className="bo1205h3-empty bo-h740h4-empty-state"><UsersRound size={25}/><strong>Comece pela primeira Persona</strong><p>Hierarquias surgem quando Personas são conectadas a necessidades, Jobs, dores, hipóteses, problemas e evidências.</p><button type="button" onClick={() => { sessionStorage.setItem('bo-workspace-create-page', 'personas'); window.dispatchEvent(new CustomEvent('bo-open-context-page', { detail: 'personas' })); }}><Plus size={14}/> Criar Persona</button></div>}
  </div>;
}

function PortfolioView({ studio, onCreate }: { studio: StudioController; onCreate: (type: 'opportunity' | 'pain' | 'solution') => void }) {
  const opportunities = Object.values(studio.graph.opportunities ?? {});
  const pains = listContextEntities(studio.graph, 'pain');
  const solutions = Object.values(studio.graph.entities?.solution ?? {});
  const columns: Array<{ key: 'opportunity' | 'pain' | 'solution'; title: string; icon: ReactNode; items: Array<{ id: string; title: string; status: string; priority: string }> }> = [
    { key: 'opportunity', title: 'Oportunidades', icon: <Lightbulb size={17}/>, items: opportunities.map((item) => ({ id: item.id, title: item.title, status: item.taskIds?.length ? 'Em progresso' : 'Não iniciada', priority: Number(item.impact || 0) >= 4 ? 'Alta' : Number(item.impact || 0) >= 2 ? 'Média' : 'Baixa' })) },
    { key: 'pain', title: 'Dores', icon: <Target size={17}/>, items: pains.map((item) => ({ id: item.id, title: contextEntityTitle(item), status: String(item.status || 'Não iniciada'), priority: String(item.priority || 'Média') })) },
    { key: 'solution', title: 'Soluções', icon: <CheckCircle2 size={17}/>, items: solutions.map((item) => ({ id: item.id, title: String(item.title || 'Solução'), status: String(item.status || 'Não iniciada'), priority: String(item.priority || 'Média') })) },
  ];
  return <div className="bo-h740h4-opportunity-portfolio"><div className="bo-h740h4-opportunity-flow"><span>Oportunidade</span><b>→</b><span>Dor validada</span><b>→</b><span>Solução</span><b>→</b><span>Iniciativa</span></div><div className="bo1205h3-portfolio-grid">{columns.map((column) => <article key={column.key} data-kind={column.key}><header><div>{column.icon}<strong>{column.title}</strong></div><b>{column.items.length}</b></header><p className="bo-h740h4-portfolio-helper">{column.key === 'opportunity' ? 'Onde existe espaço real para melhorar o serviço.' : column.key === 'pain' ? 'Dores observadas que justificam priorização.' : 'Respostas possíveis que podem virar experimento e iniciativa.'}</p><div className="bo-h740h4-portfolio-items">{column.items.slice(0,3).map((item) => <div key={item.id}><strong>{item.title}</strong><span>{item.priority} · {item.status}</span></div>)}{!column.items.length && <div className="is-empty"><strong>Nenhum item ainda</strong><span>Crie o primeiro para começar este estágio.</span></div>}{column.items.length > 3 && <small>+ {column.items.length - 3} outros itens</small>}</div><div className="bo1205h3-portfolio-stats"><div><small>Status</small><p><span>Não iniciada</span><b>{column.items.filter((item) => item.status.toLowerCase().includes('não')).length}</b></p><p><span>Em progresso</span><b>{column.items.filter((item) => item.status.toLowerCase().includes('progres')).length}</b></p></div><div><small>Prioridade</small><p><span>Alta</span><b>{column.items.filter((item) => item.priority.toLowerCase().includes('alt')).length}</b></p><p><span>Média</span><b>{column.items.filter((item) => item.priority.toLowerCase().includes('mé') || item.priority.toLowerCase().includes('med')).length}</b></p></div></div><footer><button type="button" onClick={() => onCreate(column.key)}><Plus size={13}/> Criar {column.key === 'pain' ? 'dor' : column.key === 'solution' ? 'solução' : 'oportunidade'}</button><span>{column.key === 'opportunity' ? 'Priorize antes de executar' : column.key === 'pain' ? 'Conecte à evidência' : 'Teste antes de escalar'}</span></footer></article>)}</div></div>;
}

export function WorkspaceLibraryView({ studio, page }: { studio: StudioController; page: WorkspaceLibraryPage }) {
  const { graph, setGraph, setActiveTab, touchUpdatedAt, showToast } = studio;
  const meta = pageMeta[page];
  const [query, setQuery] = useState('');
  const [showFilter, setShowFilter] = useState(false);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [rowMenu, setRowMenu] = useState<string | null>(null);

  const rows = useMemo(() => {
    if (pageKind[page]) return entityRows(studio, pageKind[page]!);
    if (page === 'metrics') return metricRows(studio);
    if (page === 'templates') return templateRows(studio);
    if (page === 'archive') return archivedRows(studio);
    return [];
  }, [page, graph]);

  const filtered = useMemo(() => rows.filter((row) => `${row.name} ${row.status ?? ''} ${row.owner ?? ''}`.toLowerCase().includes(query.trim().toLowerCase())), [rows, query]);

  const openCreate = () => setModal({ mode: 'create', page, title: '', description: '', owner: '' });

  useEffect(() => {
    const requestedPage = sessionStorage.getItem('bo-workspace-create-page');
    if (requestedPage !== page || page === 'archive' || page === 'hierarchies' || page === 'portfolio') return;
    sessionStorage.removeItem('bo-workspace-create-page');
    setModal({ mode: 'create', page, title: '', description: '', owner: '' });
  }, [page]);
  const applyTemplate = async (row: BasicRow) => {
    if (page !== 'templates') return;
    const runtime = window.BlueOceanRuntime;
    if (row.id === 'template-research') {
      const now = new Date().toISOString();
      const projectId = makeId('research-project');
      setGraph((current) => ({
        ...current,
        research: {
          ...current.research,
          activeProjectId: projectId,
          projects: {
            ...(current.research?.projects ?? {}),
            [projectId]: {
              id: projectId, serviceId: current.service.id, title: 'Pesquisa da experiência',
              goal: 'Registrar evidências e entender necessidades antes de tirar conclusões.',
              status: 'draft', methodIds: [], sourceIds: [], observationIds: [],
              createdAt: now, updatedAt: now,
            },
          },
          updatedAt: now,
        },
      }), 'workspace:apply-research-template');
      setActiveTab('context');
      window.dispatchEvent(new CustomEvent('bo-open-context-page', { detail: 'evidence' }));
      showToast('Projeto de pesquisa criado. Registre evidências reais para preenchê-lo.');
      return;
    }
    if (row.id === 'template-service-blueprint') {
      const api = runtime?.api<{ create?(name?: string): Promise<{ id: string } | null> | { id: string } | null }>('serviceBlueprintFrame');
      if (!api?.create) { showToast('Editor do Blueprint indisponível. Recarregue a página e tente novamente.'); return; }
      try {
        const created = await api.create('Blueprint de serviço · modelo inicial');
        if (!created?.id) throw new Error('O Blueprint não foi criado.');
        setActiveTab('canvas');
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'blueprint' }));
          window.dispatchEvent(new CustomEvent('bo-service-object-focus', { detail: { kind: 'blueprint', id: created.id } }));
        }, 50);
        showToast('Blueprint criado. Adicione etapas, atividades e relações reais.');
      } catch { showToast('Não foi possível aplicar o template de Blueprint.'); }
      return;
    }
    const api = runtime?.api<{ create?(options: { name: string; status: string; templateId?: string; objective?: string }): { id: string } | null }>('journeyHome');
    if (!api?.create) { showToast('Editor de Jornadas indisponível. Recarregue a página e tente novamente.'); return; }
    const created = api.create({
      name: row.id === 'template-journey-discovery' ? 'Jornada de descoberta' : row.name,
      status: 'draft',
      ...(row.id === 'template-journey-discovery' ? { templateId: 'essential' } : { objective: String(row.raw?.description || '') }),
    });
    if (!created?.id) { showToast('Não foi possível aplicar o template de Jornada.'); return; }
    setActiveTab('canvas');
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'journey' }));
      window.dispatchEvent(new CustomEvent('bo-service-object-focus', { detail: { kind: 'journey', id: created.id } }));
    }, 50);
    showToast('Jornada criada a partir do template.');
  };
  const openEdit = (row: BasicRow) => {
    if (page === 'templates' && row.id.startsWith('template-')) { void applyTemplate(row); return; }
    setModal({ mode: 'edit', page, id: row.id, title: row.name, description: String(row.raw?.description || ''), owner: String(row.raw?.owner || '') });
  };

  const createPortfolio = (type: 'opportunity' | 'pain' | 'solution') => {
    if (type === 'pain') { setModal({ mode: 'create', page: 'pains', title: '', description: '', owner: '' }); return; }
    setModal({ mode: 'create', page: type === 'opportunity' ? 'portfolio' : 'portfolio', id: `kind:${type}`, title: '', description: '', owner: '' });
  };

  const saveModal = () => {
    if (!modal || !modal.title.trim()) return;
    const contextKind = pageKind[modal.page];
    if (contextKind) {
      setGraph((current) => modal.mode === 'create'
        ? createContextEntity(current, contextKind, modal.title, modal.description)
        : updateContextEntity(current, contextKind, modal.id || '', { title: modal.title, description: modal.description, owner: modal.owner }), `workspace:${modal.page}`);
      showToast(modal.mode === 'create' ? `${pageMeta[modal.page].singular} criada.` : 'Alterações salvas.');
      setModal(null); return;
    }
    if (modal.page === 'metrics') {
      setGraph((current) => {
        const id = modal.id || makeId('metric'); const now = new Date().toISOString();
        const existing = current.entities?.metric?.[id] || {};
        const entity: GraphEntity = { ...existing, id, type: 'metric', serviceId: current.service.id, title: modal.title.trim(), description: modal.description.trim(), owner: modal.owner.trim(), source: existing.source || 'Manual', metricType: existing.metricType || 'Número', createdAt: existing.createdAt || now, updatedAt: now };
        return touchUpdatedAt({ ...current, entities: { ...current.entities, metric: { ...(current.entities?.metric || {}), [id]: entity } } });
      }, 'workspace:metric'); setModal(null); showToast('Métrica salva.'); return;
    }
    if (modal.page === 'templates') {
      setGraph((current) => { const id = modal.id || makeId('template'); const now = new Date().toISOString(); const entity: GraphEntity = { id, type: 'template', serviceId: current.service.id, title: modal.title.trim(), description: modal.description.trim(), owner: modal.owner.trim() || 'Você', createdAt: now, updatedAt: now }; return touchUpdatedAt({ ...current, entities: { ...current.entities, template: { ...(current.entities?.template || {}), [id]: entity } } }); }, 'workspace:template'); setModal(null); showToast('Template salvo.'); return;
    }
    if (modal.page === 'portfolio') {
      const kind = modal.id?.startsWith('kind:') ? modal.id.slice(5) : 'opportunity';
      if (kind === 'solution') {
        setGraph((current) => { const id = makeId('solution'); const now = new Date().toISOString(); const entity: GraphEntity = { id, type: 'solution', serviceId: current.service.id, title: modal.title.trim(), description: modal.description.trim(), owner: modal.owner.trim(), status: 'Not Started', createdAt: now, updatedAt: now }; return touchUpdatedAt({ ...current, entities: { ...current.entities, solution: { ...(current.entities?.solution || {}), [id]: entity } } }); }, 'workspace:solution');
      } else {
        setGraph((current) => { const id = makeId('opportunity'); const stageId = studio.journey.stageIds[0] || ''; const item: Opportunity = { id, stageId, title: modal.title.trim(), problemIds: [], taskIds: [], owner: modal.owner.trim() }; return touchUpdatedAt({ ...current, opportunities: { ...current.opportunities, [id]: item } }); }, 'workspace:opportunity');
      }
      setModal(null); showToast(kind === 'solution' ? 'Solução criada.' : 'Oportunidade criada.');
    }
  };

  const removeRow = (row: BasicRow) => {
    if (page === 'templates' && row.id.startsWith('template-')) { setRowMenu(null); showToast('Templates oficiais não podem ser removidos.'); return; }
    if (row.kind) setGraph((current) => removeContextEntity(current, row.kind!, row.id), `workspace:remove-${row.kind}`);
    else if (page === 'metrics') setGraph((current) => { const next = { ...(current.entities?.metric || {}) }; delete next[row.id]; return touchUpdatedAt({ ...current, entities: { ...current.entities, metric: next } }); }, 'workspace:remove-metric');
    else if (page === 'templates') setGraph((current) => { const next = { ...(current.entities?.template || {}) }; delete next[row.id]; return touchUpdatedAt({ ...current, entities: { ...current.entities, template: next } }); }, 'workspace:remove-template');
    setRowMenu(null); showToast('Item removido.');
  };

  if (page === 'personas') return <PersonasView studio={studio}/>;
  if (page === 'needs') return <NeedsView studio={studio}/>;
  if (page === 'jobs') return <JobsView studio={studio}/>;
  if (page === 'pains') return <PainsView studio={studio}/>;
  if (page === 'hypotheses') return <HypothesesView studio={studio}/>;
  if (page === 'problems') return <ProblemsView studio={studio}/>;
  if (page === 'evidence') return <EvidenceView studio={studio}/>;

  if (page === 'hierarchies') return <section className="bo1205h3-workspace-page"><div className="bo1205h3-page-head"><div><span>Workspace /</span><h1>{meta.title}</h1><p>{meta.description}</p></div></div><div className="bo-h740h3-hierarchy-guide"><strong>Como ler as relações</strong><span>Persona → Necessidade → Job → Dor → Hipótese → Problema → Evidência</span><p>As relações aparecem aqui quando esses objetos são conectados durante a pesquisa e o desenho do serviço.</p></div><HierarchiesView studio={studio}/></section>;
  if (page === 'portfolio') return <section className="bo1205h3-workspace-page"><div className="bo1205h3-page-head"><div><span>Workspace /</span><h1>{meta.title}</h1><p>{meta.description}</p></div><button type="button" className="bo-h740h3-crosslink" onClick={() => window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'portfolio' }))}>Abrir iniciativas de melhoria →</button></div><PortfolioView studio={studio} onCreate={createPortfolio}/>{modal && <WorkspaceModal modal={modal} setModal={setModal} onSave={saveModal}/>}</section>;

  return <section className="bo1205h3-workspace-page" data-workspace-page={page}>
    <div className="bo1205h3-page-head"><div><span>Workspace /</span><h1>{meta.title}</h1><p>{meta.description}</p></div>{page === 'metrics' && <button type="button" className="bo-h740h3-crosslink" onClick={() => window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'outcomes' }))}>Abrir Resultados →</button>}</div>
    {page === 'metrics' && <div className="bo-h740h4-metrics-bridge"><div><strong>Catálogo de métricas</strong><p>Defina aqui o que medir. Em <b>Resultados</b>, acompanhe baseline, valor atual, meta e se a melhoria realmente produziu outcome.</p></div><button type="button" onClick={() => window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'outcomes' }))}>Acompanhar Resultados →</button></div>}
    <div className="bo1205h3-list-toolbar"><strong>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</strong><div><label className="bo1205h3-icon-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar"/></label><button type="button" className={showFilter ? 'active' : ''} onClick={() => setShowFilter((value) => !value)} title="Filtros"><Filter size={16}/></button><button type="button" className="active" title="Tabela"><Table2 size={16}/><span>Tabela</span></button><button type="button" title="Configurações da tabela"><Settings2 size={16}/></button>{page !== 'archive' && <button type="button" className="primary" onClick={openCreate}><Plus size={16}/>{meta.create}</button>}</div></div>
    {showFilter && <div className="bo1205h3-filterbar"><span>Filtros rápidos</span><button type="button" onClick={() => setQuery('')}>Todos</button><button type="button" onClick={() => setQuery('ativo')}>Ativos</button><button type="button" onClick={() => setQuery('não usado')}>Não usados</button></div>}
    <div className="bo1205h3-table-wrap"><table className="bo1205h3-table"><thead><tr><th></th><th>NOME</th>{page === 'metrics' ? <><th>FONTE</th><th>TIPO</th></> : <><th>ATUALIZADO</th><th>ATUALIZADO POR</th></>}<th>CRIADO</th><th>{page === 'metrics' ? 'USADO EM' : 'CRIADOR'}</th><th>TAGS</th>{page !== 'metrics' && <th>USADO EM</th>}{page === 'templates' && <th>AÇÃO</th>}</tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td className="menu-cell"><button type="button" onClick={() => setRowMenu(rowMenu === row.id ? null : row.id)}><MoreVertical size={15}/></button>{rowMenu === row.id && <div className="bo1205h3-row-menu"><button type="button" onClick={() => openEdit(row)}>Editar</button><button type="button" className="danger" onClick={() => removeRow(row)}>Remover</button></div>}</td><td><div className="bo1205h3-name-cell"><span data-page={page}>{page === 'metrics' ? <BarChart3 size={14}/> : page === 'templates' ? <FolderKanban size={14}/> : page === 'archive' ? <Archive size={14}/> : <Target size={14}/>}</span><button type="button" onClick={() => openEdit(row)}>{row.name}</button></div></td>{page === 'metrics' ? <><td>{row.source}</td><td>{row.type}</td></> : <><td>{row.updated || '—'}</td><td>{row.owner || 'Você'}</td></>}<td>{row.created || '—'}</td><td>{page === 'metrics' ? row.usedIn : row.owner || 'Você'}</td><td>{row.tags || 'Sem tags'}</td>{page !== 'metrics' && <td>{row.usedIn || 'Não usado'}</td>}{page === 'templates' && <td><button type="button" className="bo-h722-open" onClick={() => void applyTemplate(row)}>Usar template</button></td>}</tr>)}</tbody></table>{!filtered.length && <div className="bo1205h3-empty"><BriefcaseBusiness size={24}/><strong>Nenhum resultado</strong><p>{query ? 'A busca não encontrou itens.' : `Crie o primeiro item de ${meta.title.toLowerCase()}.`}</p>{page !== 'archive' && <button type="button" onClick={openCreate}><Plus size={14}/>{meta.create}</button>}</div>}</div>
    {modal && <WorkspaceModal modal={modal} setModal={setModal} onSave={saveModal}/>} 
  </section>;
}

function WorkspaceModal({ modal, setModal, onSave }: { modal: ModalState; setModal: (value: ModalState | null) => void; onSave: () => void }) {
  const meta = pageMeta[modal.page];
  const title = modal.id?.startsWith('kind:solution') ? 'Criar solução' : modal.id?.startsWith('kind:opportunity') ? 'Criar oportunidade' : modal.mode === 'create' ? meta.create : `Editar ${meta.singular.toLowerCase()}`;
  return <div className="bo1205h3-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><form className="bo1205h3-modal" onSubmit={(event) => { event.preventDefault(); onSave(); }}><header><div><small>WORKSPACE</small><h2>{title}</h2></div><button type="button" aria-label="Fechar" onClick={() => setModal(null)}><X size={18}/></button></header><label><span>Nome</span><input autoFocus value={modal.title} onChange={(event) => setModal({ ...modal, title: event.target.value })}/></label><label><span>Descrição</span><textarea rows={5} value={modal.description} onChange={(event) => setModal({ ...modal, description: event.target.value })}/></label><label><span>Responsável <small>opcional</small></span><input value={modal.owner} onChange={(event) => setModal({ ...modal, owner: event.target.value })}/></label><footer><button type="button" onClick={() => setModal(null)}>Cancelar</button><button type="submit" className="primary" disabled={!modal.title.trim()}>Salvar</button></footer></form></div>;
}

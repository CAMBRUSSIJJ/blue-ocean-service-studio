import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Filter, ListTodo, MoreVertical, Plus, Search, Table2, Trash2, X } from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import { createDiscoveryEntity } from '../services/discovery-workspace';
import { contextEntityTitle, contextEntityUsage, listContextEntities, removeContextEntity } from '../services/context-library';
import {
  buildJobStudioReport,
  jobProfileFromEntity,
  jobRelationOptions,
  updateJobProfile,
  type JobImportance,
  type JobProfileDraft,
  type JobRelationKind,
} from '../services/jobs-studio';

type DetailTab = 'overview' | 'people' | 'relations' | 'evidence' | 'usage';
type FilterMode = 'all' | 'unused' | 'evidence' | 'incomplete' | 'high';
const relationLabel: Record<JobRelationKind, string> = { persona: 'Personas', need: 'Necessidades', pain: 'Dores', problemHypothesis: 'Hipóteses', problem: 'Problemas', evidence: 'Evidências' };
const importanceLabel: Record<JobImportance, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
const formatDate = (value: unknown) => { const date = new Date(String(value ?? '')); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); };

function patchJobMeta(graph: ServiceGraph, jobId: string, owner: string, tags: string[]): ServiceGraph {
  const current = graph.entities?.job?.[jobId];
  if (!current) return graph;
  const now = new Date().toISOString();
  return { ...graph, service: { ...graph.service, updatedAt: now }, entities: { ...graph.entities, job: { ...(graph.entities?.job ?? {}), [jobId]: { ...current, owner: owner.trim(), tags, updatedAt: now } } } };
}

export function JobsView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const jobs = useMemo(() => listContextEntities(graph, 'job'), [graph]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [draft, setDraft] = useState<JobProfileDraft | null>(null);
  const [owner, setOwner] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = selectedId ? graph.entities?.job?.[selectedId] : undefined;
  const report = useMemo(() => selectedId ? buildJobStudioReport(graph, selectedId) : null, [graph, selectedId]);
  const previewReport = useMemo(() => {
    if (!selectedId || !draft) return report;
    const preview = updateJobProfile({ graph, jobId: selectedId, draft, connectedIds, now: String(selected?.updatedAt ?? graph.service.updatedAt) });
    return buildJobStudioReport(preview, selectedId);
  }, [graph, selectedId, draft, connectedIds, report, selected?.updatedAt]);
  const relationOptions = useMemo(() => jobRelationOptions(graph), [graph]);

  useEffect(() => {
    if (!selected || !report) { setDraft(null); setOwner(''); setTagsText(''); setConnectedIds([]); return; }
    setDraft(jobProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
  }, [selectedId, selected?.updatedAt]);

  useEffect(() => {
    if (sessionStorage.getItem('bo-workspace-create-page') !== 'jobs') return;
    sessionStorage.removeItem('bo-workspace-create-page'); setCreateOpen(true);
  }, []);


  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'job' || !detail.id) return;
      if (!graph.entities?.job?.[detail.id]) return;
      setSelectedId(detail.id);
      setDetailTab('usage');
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) {
        const detail = JSON.parse(raw) as { kind?: string; id?: string };
        if (detail.kind === 'job' && detail.id && graph.entities?.job?.[detail.id]) {
          setSelectedId(detail.id); setDetailTab('usage'); sessionStorage.removeItem('bo-service-object-focus');
        }
      }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [graph]);

  const rows = useMemo(() => jobs.map((job) => {
    const jobReport = buildJobStudioReport(graph, job.id);
    const usage = contextEntityUsage(graph, 'job', job.id);
    return { job, report: jobReport, usage, title: contextEntityTitle(job), owner: String(job.owner || 'Você'), tags: Array.isArray(job.tags) && job.tags.length ? job.tags.map(String).join(', ') : 'Sem tags' };
  }), [graph, jobs]);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.title} ${row.owner} ${row.tags} ${String(row.job.description ?? '')} ${String(row.job.situation ?? '')} ${String(row.job.desiredProgress ?? '')}`.toLowerCase();
    if (!haystack.includes(query.trim().toLowerCase())) return false;
    if (filter === 'unused') return row.usage.instances === 0 && row.usage.relatedCount === 0;
    if (filter === 'evidence') return (row.report?.connectionCounts.evidence ?? 0) > 0;
    if (filter === 'incomplete') return (row.report?.foundationScore ?? 0) < 100;
    if (filter === 'high') return ['high', 'critical'].includes(String(row.job.importance));
    return true;
  }), [rows, query, filter]);

  const openJob = (id: string) => { setSelectedId(id); setDetailTab('overview'); setMenuId(null); };
  const closeJob = () => { setSelectedId(null); setDraft(null); setDetailTab('overview'); };
  const createJob = () => {
    if (!createTitle.trim()) return;
    const now = new Date().toISOString();
    const entity = createDiscoveryEntity({ graph, kind: 'job', title: createTitle, description: createDescription, now });
    setGraph((current) => ({ ...current, service: { ...current.service, updatedAt: now }, entities: { ...current.entities, job: { ...(current.entities?.job ?? {}), [entity.id]: { ...entity, importance: 'medium' } } } }), 'Jobs 2.0: criar');
    setCreateOpen(false); setCreateTitle(''); setCreateDescription(''); setSelectedId(entity.id); setDetailTab('overview');
    showToast('Job criado. Complete situação, progresso e relações.');
  };
  const saveJob = () => {
    if (!selectedId || !draft?.title.trim()) return;
    const tags = tagsText.split(',').map((item) => item.trim()).filter(Boolean);
    setGraph((current) => patchJobMeta(updateJobProfile({ graph: current, jobId: selectedId, draft, connectedIds }), selectedId, owner, tags), 'Jobs 2.0: salvar');
    showToast('Job salvo.');
  };
  const discardJob = () => {
    if (!selected || !report) return;
    setDraft(jobProfileFromEntity(selected)); setOwner(String(selected.owner ?? '')); setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : ''); setConnectedIds(report.connections.map((item) => item.id)); showToast('Alterações descartadas.');
  };
  const removeJob = (id: string) => { setGraph((current) => removeContextEntity(current, 'job', id), 'Jobs 2.0: remover'); if (selectedId === id) closeJob(); setDeleteId(null); setMenuId(null); showToast('Job removido e relações desvinculadas.'); };
  const toggleRelation = (id: string) => setConnectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  if (selected && draft && report) {
    const evidence = relationOptions.filter((item) => item.kind === 'evidence');
    const evidenceConnections = evidence.filter((item) => connectedIds.includes(item.id));
    const personaOptions = relationOptions.filter((item) => item.kind === 'persona');
    const score = previewReport?.foundationScore ?? report.foundationScore;
    return <section className="bo-h73-job-detail" data-jobs-h73="detail">
      <header className="bo-h71-detail-head bo-h73-detail-head"><button type="button" className="bo-h71-back" onClick={closeJob}><ArrowLeft size={16}/> Jobs</button><div className="bo-h71-detail-title"><span className="bo-h71-avatar bo-h73-avatar"><ListTodo size={19}/></span><div><small>JOB TO BE DONE</small><h1>{draft.title || 'Sem título'}</h1><p>{draft.description || 'Descreva o progresso que a pessoa tenta realizar, não a funcionalidade que ela quer usar.'}</p></div></div><div className="bo-h71-detail-score"><span>COMPLETUDE</span><strong>{score}%</strong><i><b style={{ width: `${score}%` }}/></i></div></header>
      <nav className="bo-h71-detail-tabs" aria-label="Detalhes do Job">{([['overview','Visão geral'],['people','Pessoas'],['relations','Relações'],['evidence','Evidências'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label]) => <button key={id} type="button" className={detailTab === id ? 'is-active' : ''} onClick={() => setDetailTab(id)}>{label}{id === 'people' && <b>{previewReport?.connectionCounts.persona ?? report.connectionCounts.persona}</b>}{id === 'relations' && <b>{connectedIds.length}</b>}{id === 'evidence' && <b>{evidenceConnections.length}</b>}</button>)}</nav>
      <div className="bo-h71-detail-body">
        {detailTab === 'overview' && <div className="bo-h73-overview-grid"><section className="bo-h71-editor-card bo-h73-job-card"><header><div><small>PROGRESSO</small><strong>Que mudança a pessoa tenta realizar?</strong></div><span className={`bo-h72-importance is-${draft.importance}`}>{importanceLabel[draft.importance]}</span></header><div className="bo-h71-form two-col"><label className="wide"><span>Nome do Job</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Ter roupas limpas sem interromper a rotina"/></label><label className="wide"><span>Descrição <small>progresso, não solução</small></span><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="O que a pessoa está tentando conseguir?"/></label><label><span>Situação / gatilho</span><textarea rows={3} value={draft.situation} onChange={(event) => setDraft({ ...draft, situation: event.target.value })} placeholder="Quando esse Job aparece?"/></label><label><span>Progresso desejado</span><textarea rows={3} value={draft.desiredProgress} onChange={(event) => setDraft({ ...draft, desiredProgress: event.target.value })} placeholder="Qual mudança concreta a pessoa quer alcançar?"/></label><label><span>Motivação</span><textarea rows={3} value={draft.motivation} onChange={(event) => setDraft({ ...draft, motivation: event.target.value })} placeholder="Por que esse progresso importa?"/></label><label><span>Barreiras</span><textarea rows={3} value={draft.barriers} onChange={(event) => setDraft({ ...draft, barriers: event.target.value })} placeholder="O que dificulta avançar hoje?"/></label><label><span>Alternativa atual</span><textarea rows={3} value={draft.currentAlternative} onChange={(event) => setDraft({ ...draft, currentAlternative: event.target.value })} placeholder="Como a pessoa resolve isso hoje?"/></label><label><span>Sinal de sucesso</span><textarea rows={3} value={draft.successSignal} onChange={(event) => setDraft({ ...draft, successSignal: event.target.value })} placeholder="Como saber que o Job foi bem realizado?"/></label><label><span>Importância</span><select className="bo-h72-select" value={draft.importance} onChange={(event) => setDraft({ ...draft, importance: event.target.value as JobImportance })}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option><option value="critical">Crítica</option></select></label><label><span>Responsável</span><input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Nome ou papel"/></label><label className="wide"><span>Tags</span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="ex.: recorrência, conveniência, rotina"/></label></div></section><aside className="bo-h73-job-summary"><small>JOB STATEMENT</small><strong>Quando… eu quero… para poder…</strong><p><b>Quando</b> {draft.situation.trim() || 'a situação ainda não foi registrada'}, <b>eu quero</b> {draft.desiredProgress.trim() || draft.title.trim() || 'realizar um progresso'}, <b>para poder</b> {draft.motivation.trim() || 'alcançar um resultado relevante'}.</p><div><span>Base mínima</span><strong>{score}%</strong><i><b style={{ width: `${score}%` }}/></i></div>{(previewReport?.foundationChecks ?? report.foundationChecks).map((item) => <em key={item.id} className={item.complete ? 'is-done' : ''}><b>{item.complete ? <Check size={10}/> : '○'}</b>{item.label}</em>)}</aside></div>}
        {detailTab === 'people' && <div><div className="bo-h71-section-intro"><div><small>PESSOAS</small><h2>Quem tenta realizar este Job?</h2><p>Conecte Personas para manter o Job ancorado em pessoas e situações reais.</p></div><strong>{personaOptions.filter((item) => connectedIds.includes(item.id)).length} conectada(s)</strong></div>{personaOptions.length ? <div className="bo-h72-people-grid">{personaOptions.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma Persona criada</strong><p>Crie Personas primeiro e depois conecte-as ao Job.</p></div>}</div>}
        {detailTab === 'relations' && <div><div className="bo-h71-section-intro"><div><small>SERVICE GRAPH</small><h2>Que contexto explica este Job?</h2><p>Necessidades, dores, hipóteses e problemas ajudam a entender por que esse progresso importa e o que impede sua realização.</p></div><strong>{connectedIds.filter((id) => !personaOptions.some((item) => item.id === id) && !evidence.some((item) => item.id === id)).length} conexões</strong></div><div className="bo-h71-relation-grid">{(['need','pain','problemHypothesis','problem'] as JobRelationKind[]).map((kind) => { const options = relationOptions.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{options.filter((item) => connectedIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}
        {detailTab === 'evidence' && <div><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que comprova este Job?</h2><p>Conecte entrevistas, observações e dados que demonstrem que esse progresso realmente é buscado pelas pessoas.</p></div><strong>{evidenceConnections.length} conectada(s)</strong></div>{evidence.length ? <div className="bo-h71-evidence-list">{evidence.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois conecte-as aqui.</p></div>}</div>}
        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="job" id={selected.id} title="Uso e relações" />}
      </div>
      <footer className="bo-h71-detail-actions"><button type="button" className="danger" onClick={() => setDeleteId(selected.id)}><Trash2 size={14}/> Remover</button><span/><button type="button" onClick={discardJob}>Descartar alterações</button><button type="button" className="primary" disabled={!draft.title.trim()} onClick={saveJob}>Salvar Job</button></footer>
      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER JOB</small><h2>Remover “{contextEntityTitle(graph.entities?.job?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações serão desvinculadas do Service Graph, mas Personas, Necessidades, Dores, Problemas e Evidências serão preservados.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeJob(deleteId)}>Remover Job</button></footer></div></div>}
    </section>;
  }

  return <section className="bo-h73-jobs" data-jobs-h73="library"><div className="bo-h71-page-head bo-ui-list-page-head"><div><span>Workspace /</span><h1>Jobs</h1></div><p>Descreva o progresso que as pessoas procuram realizar.</p></div><div className="bo-h71-toolbar"><strong>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</strong><div><label className="bo-h71-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Jobs"/></label><button type="button" className={showFilters ? 'is-active' : ''} onClick={() => setShowFilters((value) => !value)} aria-label="Filtros"><Filter size={16}/></button><button type="button" className="is-active"><Table2 size={16}/><span>Tabela</span></button><button type="button" className="primary" onClick={() => setCreateOpen(true)}><Plus size={16}/> Criar Job</button></div></div>
    {showFilters && <div className="bo-h71-filters"><span>Filtros</span>{([['all','Todos'],['unused','Não usados'],['evidence','Com evidência'],['incomplete','Base incompleta'],['high','Alta importância']] as Array<[FilterMode,string]>).map(([id,label]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>}
    <div className="bo-h71-table-wrap">{filtered.length > 0 && <table className="bo-h71-table bo-h73-table"><thead><tr><th>JOB</th><th>IMPORTÂNCIA</th><th>ATUALIZADO</th><th>RESPONSÁVEL</th><th>PERSONAS</th><th>NECESSIDADES</th><th>EVIDÊNCIAS</th><th>USADO EM</th><th>AÇÕES</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.job.id}><td><button type="button" className="bo-h73-job-name" onClick={() => openJob(row.job.id)}><span><ListTodo size={14}/></span><strong>{row.title}</strong></button></td><td><span className={`bo-h72-importance is-${String(row.job.importance || 'medium')}`}>{importanceLabel[(row.job.importance as JobImportance) || 'medium'] ?? 'Média'}</span></td><td>{formatDate(row.job.updatedAt ?? row.job.createdAt)}</td><td>{row.owner}</td><td>{row.report?.connectionCounts.persona ?? 0}</td><td>{row.report?.connectionCounts.need ?? 0}</td><td>{row.report?.connectionCounts.evidence ?? 0}</td><td><span className="bo-h71-usage-pill">{row.usage.instances || row.usage.relatedCount ? `${row.usage.instances} visual · ${row.usage.relatedCount} relação` : 'Não usado'}</span></td><td className="menu-cell"><button type="button" aria-label={`Ações de ${row.title}`} aria-expanded={menuId === row.job.id} onClick={() => setMenuId(menuId === row.job.id ? null : row.job.id)}><MoreVertical size={15}/></button>{menuId === row.job.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openJob(row.job.id)}>Abrir</button><button type="button" className="danger" onClick={() => setDeleteId(row.job.id)}>Remover</button></div>}</td></tr>)}</tbody></table>}{!filtered.length && <div className="bo-h71-empty"><ListTodo size={26}/><strong>{query || filter !== 'all' ? 'Nenhum Job encontrado' : 'Nenhum Job criado'}</strong><p>{query || filter !== 'all' ? 'Ajuste a busca ou os filtros.' : 'Registre o progresso que as pessoas tentam realizar em uma situação concreta.'}</p>{!query && filter === 'all' && <button type="button" onClick={() => setCreateOpen(true)}><Plus size={14}/> Criar Job</button>}</div>}</div>
    {createOpen && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><form className="bo-h71-create-modal" onSubmit={(event) => { event.preventDefault(); createJob(); }}><header><div><small>NOVO JOB</small><h2>Registre o progresso que a pessoa tenta realizar</h2><p>Descreva o que ela quer conseguir em uma situação — não a solução ou funcionalidade.</p></div><button type="button" onClick={() => setCreateOpen(false)}><X size={17}/></button></header><label><span>Nome do Job</span><input autoFocus value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="Ex.: Ter roupas limpas sem perder tempo da semana"/></label><label><span>Descrição <small>opcional</small></span><textarea rows={4} value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="Que progresso essa pessoa está tentando realizar?"/></label><footer><button type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={!createTitle.trim()}>Criar e abrir</button></footer></form></div>}
    {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER JOB</small><h2>Remover “{contextEntityTitle(graph.entities?.job?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações existentes serão desvinculadas do Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeJob(deleteId)}>Remover Job</button></footer></div></div>}
  </section>;
}

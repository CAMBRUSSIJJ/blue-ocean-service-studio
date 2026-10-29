// H7.40-H3 legacy CTA: Criar hipótese
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, Filter, MoreVertical, Plus, Search, ShieldCheck, Table2, Trash2, X } from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import { contextEntityTitle, contextEntityUsage, listContextEntities, removeContextEntity } from '../services/context-library';
import { makeId } from '../domain/graph-operations';
import {
  buildProblemStudioReport,
  problemProfileFromEntity,
  problemRelationOptions,
  updateProblemProfile,
  type ProblemPriority,
  type ProblemProfileDraft,
  type ProblemRelationKind,
  type ProblemSeverity,
} from '../services/problems-studio';

type DetailTab = 'overview' | 'context' | 'evidence' | 'definition' | 'usage';
type FilterMode = 'all' | 'ready' | 'incomplete' | 'critical' | 'evidence';

const relationLabel: Record<ProblemRelationKind, string> = {
  persona: 'Personas', need: 'Necessidades', job: 'Jobs', pain: 'Dores', problemHypothesis: 'Hipóteses', evidence: 'Evidências',
};
const severityLabel: Record<ProblemSeverity, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
const priorityLabel: Record<ProblemPriority, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
const formatDate = (value: unknown) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

function patchProblemMeta(graph: ServiceGraph, problemId: string, owner: string, tags: string[]): ServiceGraph {
  const current = graph.entities?.problem?.[problemId];
  if (!current) return graph;
  const now = new Date().toISOString();
  return {
    ...graph,
    service: { ...graph.service, updatedAt: now },
    entities: { ...graph.entities, problem: { ...(graph.entities?.problem ?? {}), [problemId]: { ...current, owner: owner.trim(), tags, updatedAt: now } } },
  };
}

export function ProblemsView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const problems = useMemo(() => listContextEntities(graph, 'problem'), [graph]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [draft, setDraft] = useState<ProblemProfileDraft | null>(null);
  const [owner, setOwner] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createOpen,setCreateOpen] = useState(false);
  const [createTitle,setCreateTitle] = useState('');
  const [createDescription,setCreateDescription] = useState('');
  useEffect(() => {
    if (sessionStorage.getItem('bo-workspace-create-page') !== 'problems') return;
    sessionStorage.removeItem('bo-workspace-create-page');
    setCreateOpen(true);
  }, []);

  const selected = selectedId ? graph.entities?.problem?.[selectedId] : undefined;
  const report = useMemo(() => selectedId ? buildProblemStudioReport(graph, selectedId) : null, [graph, selectedId]);
  const relationOptions = useMemo(() => problemRelationOptions(graph), [graph]);
  const previewReport = useMemo(() => {
    if (!selectedId || !draft) return report;
    const preview = updateProblemProfile({ graph, problemId: selectedId, draft, connectedIds, now: String(selected?.updatedAt ?? graph.service.updatedAt) });
    return buildProblemStudioReport(preview, selectedId);
  }, [graph, selectedId, draft, connectedIds, report, selected?.updatedAt]);

  useEffect(() => {
    if (!selected || !report) { setDraft(null); setOwner(''); setTagsText(''); setConnectedIds([]); return; }
    setDraft(problemProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
  }, [selectedId, selected?.updatedAt]);


  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'validatedProblem' || !detail.id) return;
      if (!graph.entities?.problem?.[detail.id]) return;
      setSelectedId(detail.id);
      setDetailTab('usage');
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) {
        const detail = JSON.parse(raw) as { kind?: string; id?: string };
        if (detail.kind === 'validatedProblem' && detail.id && graph.entities?.problem?.[detail.id]) {
          setSelectedId(detail.id); setDetailTab('usage'); sessionStorage.removeItem('bo-service-object-focus');
        }
      }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [graph]);

  const rows = useMemo(() => problems.map((problem) => {
    const itemReport = buildProblemStudioReport(graph, problem.id);
    return {
      problem,
      report: itemReport,
      usage: contextEntityUsage(graph, 'problem', problem.id),
      title: contextEntityTitle(problem),
      owner: String(problem.owner || 'Você'),
      tags: Array.isArray(problem.tags) && problem.tags.length ? problem.tags.map(String).join(', ') : 'Sem tags',
    };
  }), [graph, problems]);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.title} ${row.owner} ${row.tags} ${String(row.problem.description ?? '')} ${String(row.problem.rootCause ?? '')}`.toLowerCase();
    if (!haystack.includes(query.trim().toLowerCase())) return false;
    if (filter === 'ready') return row.report?.readyForDefinition === true;
    if (filter === 'incomplete') return (row.report?.qualityScore ?? 0) < 100;
    if (filter === 'critical') return String(row.problem.severity ?? 'medium') === 'critical' || String(row.problem.priority ?? 'medium') === 'critical';
    if (filter === 'evidence') return (row.report?.connectionCounts.evidence ?? 0) > 0;
    return true;
  }), [rows, query, filter]);

  const openProblem = (id: string) => { setSelectedId(id); setDetailTab('overview'); setMenuId(null); };
  const createProblem = () => {
    if (!createTitle.trim()) return;
    const now = new Date().toISOString();
    const id = makeId('problem');
    setGraph(current=>({...current,service:{...current.service,updatedAt:now},entities:{...current.entities,problem:{...(current.entities?.problem??{}),[id]:{id,type:'problem',serviceId:current.service.id,title:createTitle.trim(),description:createDescription.trim(),status:'draft',severity:'medium',priority:'medium',createdAt:now,updatedAt:now,relatedIds:[]}}}}),'Problemas: criar rascunho');
    setCreateOpen(false);setCreateTitle('');setCreateDescription('');setSelectedId(id);setDetailTab('overview');
    showToast('Problema criado como rascunho. Conecte evidências antes da validação.');
  };
  const closeProblem = () => { setSelectedId(null); setDraft(null); setDetailTab('overview'); };
  const saveProblem = () => {
    if (!selectedId || !draft?.title.trim()) return;
    const tags = tagsText.split(',').map((item) => item.trim()).filter(Boolean);
    setGraph((current) => patchProblemMeta(updateProblemProfile({ graph: current, problemId: selectedId, draft, connectedIds }), selectedId, owner, tags), 'Problemas 2.0: salvar');
    showToast('Problema salvo.');
  };
  const discardProblem = () => {
    if (!selected || !report) return;
    setDraft(problemProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
    showToast('Alterações descartadas.');
  };
  const removeProblem = (id: string) => {
    setGraph((current) => removeContextEntity(current, 'problem', id), 'Problemas 2.0: remover');
    if (selectedId === id) closeProblem();
    setDeleteId(null); setMenuId(null);
    showToast('Problema removido e relações desvinculadas.');
  };
  const validateDraftProblem = () => {
    if (!selectedId || !draft || !previewReport || !draft.title.trim()) return;
    const required = previewReport.qualityChecks.filter(item => item.id !== 'validated');
    if (!required.every(item => item.complete)) { showToast('Complete os campos e conecte evidências antes de validar.'); return; }
    if (!window.confirm('Confirmar que este problema possui evidências suficientes para ser validado?')) return;
    const tags = tagsText.split(',').map(item => item.trim()).filter(Boolean);
    setGraph(current => {
      const saved = patchProblemMeta(updateProblemProfile({
        graph: current, problemId: selectedId, draft, connectedIds,
      }), selectedId, owner, tags);
      const record = saved.entities?.problem?.[selectedId];
      if (!record) return saved;
      const now = new Date().toISOString();
      return { ...saved, service: { ...saved.service, updatedAt: now },
        entities: { ...saved.entities, problem: { ...saved.entities.problem,
          [selectedId]: { ...record, status: 'validated', validatedAt: now, updatedAt: now },
        } } };
    }, 'Problemas: validação explícita');
    showToast('Problema validado com evidências registradas.');
  };
  const toggleRelation = (id: string) => {
    const isSource = String(selected?.sourceHypothesisId ?? '') === id;
    if (isSource) { showToast('A hipótese de origem faz parte da rastreabilidade e não pode ser desvinculada aqui.'); return; }
    setConnectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  if (selected && draft && report) {
    const preview = previewReport ?? report;
    const contexts = relationOptions.filter((item) => item.kind !== 'evidence' && item.kind !== 'problemHypothesis');
    const evidences = relationOptions.filter((item) => item.kind === 'evidence');
    return <section className="bo-h76-problems" data-problems-h76="detail">
      <div className="bo-h71-detail-head"><button type="button" className="bo-h71-back" onClick={closeProblem}><ArrowLeft size={16}/> Problemas</button><div className="bo-h71-detail-title"><span className="bo-h76-problem-icon"><ShieldCheck size={17}/></span><div><small>{String(selected.status)==='draft'?'PROBLEMA EM INVESTIGAÇÃO':'PROBLEMA VALIDADO'}</small><h1>{draft.title || 'Sem título'}</h1><p>Estruture causa, impacto e rastreabilidade sem perder a origem da validação.</p></div></div><div className="bo-h76-score"><small>QUALIDADE</small><strong>{preview?.qualityScore ?? 0}%</strong><span>{preview?.readyForDefinition ? 'Pronto para Definição' : 'Base incompleta'}</span></div></div>
      <nav className="bo-h71-detail-tabs">{([['overview','Visão geral'],['context','Contexto'],['evidence','Evidências'],['definition','Definição'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label]) => <button key={id} type="button" className={detailTab === id ? 'is-active' : ''} onClick={() => setDetailTab(id)}>{label}</button>)}</nav>
      <div className="bo-h71-detail-body">
        {detailTab === 'overview' && <div className="bo-h76-overview-grid"><section className="bo-h71-editor-card"><header><div><small>ESTRUTURA DO PROBLEMA</small><h2>O que foi validado?</h2></div><span className="bo-h76-validated-pill">{String(selected.status)==='draft'?'Rascunho':<><Check size={12}/> Validado</>}</span></header><div className="bo-h71-fields"><label className="full"><span>Problema</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></label><label className="full"><span>Descrição</span><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Descreva o problema sem antecipar a solução."/></label><label><span>Causa raiz</span><textarea rows={3} value={draft.rootCause} onChange={(event) => setDraft({ ...draft, rootCause: event.target.value })} placeholder="O que está causando este problema?"/></label><label><span>Impacto</span><textarea rows={3} value={draft.impact} onChange={(event) => setDraft({ ...draft, impact: event.target.value })} placeholder="Qual é a consequência para cliente ou operação?"/></label><label><span>População afetada</span><textarea rows={2} value={draft.affectedPopulation} onChange={(event) => setDraft({ ...draft, affectedPopulation: event.target.value })} placeholder="Quem é afetado e em qual contexto?"/></label><label><span>Sinal observável</span><textarea rows={2} value={draft.observableSignal} onChange={(event) => setDraft({ ...draft, observableSignal: event.target.value })} placeholder="Como percebemos que o problema está acontecendo?"/></label><label><span>Severidade</span><select value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value as ProblemSeverity })}>{Object.entries(severityLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Prioridade</span><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as ProblemPriority })}>{Object.entries(priorityLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Responsável</span><input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Você"/></label><label><span>Tags</span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="ex.: retenção, onboarding"/></label></div></section><aside className="bo-h76-side"><section><small>ORIGEM DA VALIDAÇÃO</small>{preview?.sourceHypothesis ? <><strong>{contextEntityTitle(preview.sourceHypothesis)}</strong><p>{String(preview.sourceHypothesis.description ?? 'Hipótese que originou este problema.')}</p><span>Hipótese → Problema validado</span></> : <><strong>Origem não registrada</strong><p>Este problema foi criado diretamente ou importado. Registre e conecte evidências para manter sua rastreabilidade.</p></>}</section><section><small>CRITÉRIOS</small>{preview?.qualityChecks.map((item) => <div key={item.id} className={item.complete ? 'is-complete' : ''}><b>{item.complete ? <Check size={12}/> : '·'}</b><span>{item.label}</span></div>)}</section></aside></div>}
        {detailTab === 'context' && <div><div className="bo-h71-section-intro"><div><small>SERVICE GRAPH</small><h2>Onde este problema acontece?</h2><p>Conecte Personas, Necessidades, Jobs e Dores que delimitam o problema validado.</p></div><strong>{contexts.filter((item) => connectedIds.includes(item.id)).length} conexões</strong></div><div className="bo-h71-relation-grid">{(['persona','need','job','pain'] as ProblemRelationKind[]).map((kind) => { const options = contexts.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{options.filter((item) => connectedIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}
        {detailTab === 'evidence' && <div><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que sustenta este Problema?</h2><p>Mantenha a base observável usada na validação e conecte novas evidências sem apagar o histórico.</p></div><strong>{evidences.filter((item) => connectedIds.includes(item.id)).length} conectada(s)</strong></div>{evidences.length ? <div className="bo-h71-evidence-list">{evidences.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois conecte-as aqui.</p></div>}</div>}
        {detailTab === 'definition' && <div className="bo-h76-definition"><div className="bo-h71-section-intro"><div><small>PRONTO PARA DEFINIR</small><h2>Este problema já pode orientar o desenho do serviço?</h2><p>A definição deve começar quando causa, impacto, contexto e evidência estiverem suficientemente claros.</p></div><strong>{preview?.qualityScore ?? 0}%</strong></div>{String(selected.status)==='draft'&&<section className="bo-problem-draft-review"><strong>Problema em investigação</strong><p>Você pode estruturar o problema diretamente nesta aba. A validação só é liberada depois que todos os critérios metodológicos e as evidências estiverem completos.</p><button type="button" disabled={!preview?.qualityChecks.filter(item=>item.id!=='validated').every(item=>item.complete)} onClick={validateDraftProblem}><Check size={13}/> Validar problema com evidências</button></section>}<div className="bo-h76-quality-list">{preview?.qualityChecks.map((item) => <article key={item.id} className={item.complete ? 'is-complete' : ''}><b>{item.complete ? <Check size={14}/> : <AlertTriangle size={14}/>}</b><div><strong>{item.label}</strong><p>{item.detail}</p></div></article>)}</div><div className={`bo-h76-definition-status ${preview?.readyForDefinition ? 'is-ready' : ''}`}><ShieldCheck size={20}/><div><strong>{preview?.readyForDefinition ? 'Pronto para Service Definition' : 'Ainda não está pronto para Service Definition'}</strong><p>{preview?.readyForDefinition ? 'O problema possui estrutura e rastreabilidade suficientes para orientar escopo, promessa e critérios de sucesso.' : 'Complete os critérios pendentes antes de usar este problema como âncora da definição.'}</p></div></div></div>}
        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="validatedProblem" id={selected.id} title="Uso e relações" />}
      </div>
      <footer className="bo-h71-detail-actions"><button type="button" className="danger" onClick={() => setDeleteId(selected.id)}><Trash2 size={14}/> Remover</button><span/><button type="button" onClick={discardProblem}>Descartar alterações</button><button type="button" className="primary" disabled={!draft.title.trim()} onClick={saveProblem}>Salvar Problema</button></footer>
      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER PROBLEMA</small><h2>Remover “{contextEntityTitle(graph.entities?.problem?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>O Problema validado será removido e a hipótese de origem voltará a ficar sem problema associado.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeProblem(deleteId)}>Remover Problema</button></footer></div></div>}
    </section>;
  }

  return <section className="bo-h76-problems" data-problems-h76="library">
    <div className="bo-h71-page-head"><div><span>Workspace /</span><h1>Problemas</h1><p>Registre problemas em investigação ou acompanhe os já validados.</p></div></div>
    <div className="bo-h71-toolbar"><strong>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</strong><div><label className="bo-h71-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Problemas"/></label><button type="button" className={showFilters ? 'is-active' : ''} onClick={() => setShowFilters((value) => !value)} aria-label="Filtros"><Filter size={16}/></button><button type="button" className="is-active"><Table2 size={16}/><span>Tabela</span></button><button type="button" className="primary" onClick={() => setCreateOpen(true)}><Plus size={16}/> Criar problema</button></div></div>
    {showFilters && <div className="bo-h71-filters"><span>Filtros</span>{([['all','Todos'],['ready','Prontos para definição'],['incomplete','Base incompleta'],['critical','Críticos'],['evidence','Com evidência']] as Array<[FilterMode,string]>).map(([id,label]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>}
    <div className="bo-h71-table-wrap"><table className="bo-h71-table bo-h76-table"><thead><tr><th></th><th>PROBLEMA</th><th>QUALIDADE</th><th>SEVERIDADE</th><th>PRIORIDADE</th><th>ATUALIZADO</th><th>RESPONSÁVEL</th><th>EVIDÊNCIAS</th><th>ORIGEM</th><th>USADO EM</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.problem.id}><td className="menu-cell"><button type="button" onClick={() => setMenuId(menuId === row.problem.id ? null : row.problem.id)}><MoreVertical size={15}/></button>{menuId === row.problem.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openProblem(row.problem.id)}>Abrir</button><button type="button" className="danger" onClick={() => setDeleteId(row.problem.id)}>Remover</button></div>}</td><td><button type="button" className="bo-h76-problem-name" onClick={() => openProblem(row.problem.id)}><span><ShieldCheck size={14}/></span><strong>{row.title}</strong></button></td><td><span className={`bo-h76-quality ${row.report?.readyForDefinition ? 'is-ready' : ''}`}>{row.report?.qualityScore ?? 0}%</span></td><td><span className={`bo-h76-level is-${String(row.problem.severity || 'medium')}`}>{severityLabel[(row.problem.severity as ProblemSeverity) || 'medium'] ?? 'Média'}</span></td><td>{priorityLabel[(row.problem.priority as ProblemPriority) || 'medium'] ?? 'Média'}</td><td>{formatDate(row.problem.updatedAt ?? row.problem.createdAt)}</td><td>{row.owner}</td><td>{row.report?.connectionCounts.evidence ?? 0}</td><td>{row.report?.sourceHypothesis ? 'Hipótese validada' : String(row.problem.status)==='draft' ? 'Rascunho direto' : 'Sem origem registrada'}</td><td><span className="bo-h71-usage-pill">{row.usage.instances || row.usage.relatedCount ? `${row.usage.instances} visual · ${row.usage.relatedCount} relação` : 'Não usado'}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="bo-h71-empty"><ShieldCheck size={26}/><strong>{query || filter !== 'all' ? 'Nenhum Problema encontrado' : 'Nenhum Problema criado'}</strong><p>{query || filter !== 'all' ? 'Ajuste a busca ou os filtros.' : 'Crie um problema em investigação ou valide uma hipótese com evidências.'}</p>{!query && filter === 'all' && <button type="button" onClick={() => setCreateOpen(true)}><Plus size={14}/> Criar problema</button>}</div>}</div>
    {createOpen && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if(event.target===event.currentTarget)setCreateOpen(false); }}>
      <form className="bo-h71-create-modal" onSubmit={event=>{event.preventDefault();createProblem();}} role="dialog" aria-modal="true" aria-label="Criar problema">
        <header><div><small>NOVO PROBLEMA</small><h2>Registrar problema em investigação</h2><p>O problema será criado como rascunho. A validação depende de evidências e critérios completos.</p></div><button type="button" aria-label="Fechar" onClick={()=>setCreateOpen(false)}><X size={16}/></button></header>
        <label><span>Enunciado do problema</span><input autoFocus value={createTitle} onChange={event=>setCreateTitle(event.target.value)} placeholder="Ex.: Clientes desistem ao calcular o frete"/></label>
        <label><span>Descrição <small>opcional</small></span><textarea rows={3} value={createDescription} onChange={event=>setCreateDescription(event.target.value)} placeholder="O que está acontecendo?"/></label>
        <footer><button type="button" onClick={()=>setCreateOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={!createTitle.trim()}>Criar e abrir</button></footer>
      </form></div>}
    {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER PROBLEMA</small><h2>Remover “{contextEntityTitle(graph.entities?.problem?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>A hipótese de origem e as evidências serão preservadas, mas o vínculo com este Problema será removido.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeProblem(deleteId)}>Remover Problema</button></footer></div></div>}
  </section>;
}

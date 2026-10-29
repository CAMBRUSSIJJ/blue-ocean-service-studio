// H7.40-H3 legacy CTA: Criar hipótese
import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityInlineCanvas, type EntityInlineBlock } from '../components/EntityInlineCanvas';
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
  const [detailActionsOpen, setDetailActionsOpen] = useState(false);
  const flushRef = useRef<() => void>(() => {});
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
  }, [selectedId]);


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
  const tags = tagsText.split(',').map(item => item.trim()).filter(Boolean);
  const persisted = selected ? problemProfileFromEntity(selected) : null;
  const savedTags = Array.isArray(selected?.tags) ? selected.tags.map(String) : [];
  const sameIds = (a:string[],b:string[])=>[...a].sort().join('|')===[...b].sort().join('|');
  const dirty = Boolean(draft && persisted && (
    (Object.keys(draft) as Array<keyof ProblemProfileDraft>).some(key=>draft[key].trim()!==persisted[key].trim())
    || owner.trim()!==String(selected?.owner??'').trim()
    || tags.join('|')!==savedTags.join('|')
    || !sameIds(connectedIds,report?.connections.map(item=>item.id)??[])
  ));
  const persistProblem=(id:string,value:ProblemProfileDraft,newOwner:string,newTags:string[],links:string[])=>{
    if(!value.title.trim())return;
    setGraph(current=>patchProblemMeta(updateProblemProfile({
      graph:current,problemId:id,draft:value,connectedIds:links,
    }),id,newOwner,newTags),'Problemas: autosave');
  };
  flushRef.current=()=>{
    if(selectedId&&draft?.title.trim()&&dirty)persistProblem(selectedId,draft,owner,tags,connectedIds);
  };
  useEffect(()=>()=>flushRef.current(),[]);
  useEffect(()=>{
    if(!selectedId||!draft?.title.trim()||!dirty)return;
    const timer=window.setTimeout(()=>persistProblem(selectedId,draft,owner,tags,connectedIds),800);
    return()=>window.clearTimeout(timer);
  },[selectedId,draft,owner,tagsText,connectedIds,dirty]);
  const closeProblem=(commit=true)=>{if(commit)flushRef.current();setSelectedId(null);setDraft(null);setDetailTab('overview');setDetailActionsOpen(false);};
  const removeProblem = (id: string) => {
    setGraph((current) => removeContextEntity(current, 'problem', id), 'Problemas 2.0: remover');
    if (selectedId === id) closeProblem(false);
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
    const contexts = relationOptions.filter(item=>item.kind!=='evidence'&&item.kind!=='problemHypothesis');
    const evidences = relationOptions.filter(item=>item.kind==='evidence');
    const isDraft=String(selected.status)==='draft';
    const needsGuidance = draft.title.trim().length < 24 || !draft.description.trim();
    const blocks:EntityInlineBlock[]=[
      {id:'description',label:'Descrição (o que está acontecendo?)',value:draft.description,essential:true,wide:true,placeholder:'Descreva o problema observado sem antecipar a solução.',onChange:value=>setDraft(current=>current?{...current,description:value}:current)},
      {id:'rootCause',label:'Causa raiz',value:draft.rootCause,essential:true,placeholder:'Quais fatores parecem provocar esse problema? Registre o que ainda precisa ser comprovado.',onChange:value=>setDraft(current=>current?{...current,rootCause:value}:current)},
      {id:'impact',label:'Impacto',value:draft.impact,essential:true,placeholder:'Quais consequências para a pessoa, o serviço ou a operação?',onChange:value=>setDraft(current=>current?{...current,impact:value}:current)},
      {id:'affectedPopulation',label:'População afetada',value:draft.affectedPopulation,placeholder:'Quem é afetado e em quais situações?',onChange:value=>setDraft(current=>current?{...current,affectedPopulation:value}:current)},
      {id:'observableSignal',label:'Sinal observável',value:draft.observableSignal,placeholder:'Qual indicador ou comportamento comprova a ocorrência?',onChange:value=>setDraft(current=>current?{...current,observableSignal:value}:current)},
    ];
    const lineage=relationOptions.filter(item=>item.kind==='problemHypothesis');
    const quality=preview.qualityChecks.map(check=>({
      ...check,
      relationKinds:check.id==='evidence'?['evidence']:check.id==='context'?['persona','need','job','pain']:undefined,
      fieldId:check.id==='population'?'affectedPopulation':check.id==='signal'?'observableSignal':check.id==='cause'?'rootCause':check.id==='impact'?'impact':check.id==='statement'?'description':undefined,
    }));
    return <section className="bo-h76-problems bo-entity-inline-detail bo-problem-inline" data-problems-h76="detail">
      <header className="bo-hyp-inline-header">
        <div className="bo-hyp-inline-top">
          <button type="button" className="bo-hyp-inline-back" onClick={()=>closeProblem()}><ArrowLeft size={15}/> Problemas</button>
          <div className="bo-hyp-inline-top-actions">
            <span className="bo-hyp-inline-save" role="status" aria-live="polite">{!draft.title.trim()?'Preencha o enunciado':dirty?'Salvando…':studio.saveStatus==='error'?'Erro ao salvar':<><Check size={13}/> Salvo</>}</span>
            <span className="bo-hyp-inline-ready">Qualidade: <b>{preview.qualityScore}%</b></span>
            <div className="bo-problem-detail-actions">
              <button type="button" className="bo-problem-menu-trigger" aria-label="Mais ações do problema" aria-expanded={detailActionsOpen} onClick={()=>setDetailActionsOpen(value=>!value)}><MoreVertical size={16}/></button>
              {detailActionsOpen&&<div className="bo-problem-actions-popover">
                <button type="button" onClick={()=>{setDetailActionsOpen(false);closeProblem()}}>Voltar à lista</button>
                <button type="button" className="danger" onClick={()=>{setDetailActionsOpen(false);setDeleteId(selected.id)}}><Trash2 size={14}/> Excluir problema</button>
              </div>}
            </div>
          </div>
        </div>
        <div className="bo-hyp-inline-statement"><span className="bo-hyp-inline-icon bo-problem-statement-icon"><ShieldCheck size={18}/></span>
          <div className="bo-problem-statement-field">
            <small>{isDraft?'PROBLEMA EM INVESTIGAÇÃO':'PROBLEMA VALIDADO'}</small>
            <textarea rows={1} aria-label="Enunciado do problema" value={draft.title} onChange={event=>setDraft(current=>current?{...current,title:event.target.value}:current)} placeholder="O que está falhando, para quem e em qual situação?"/>
          </div>
        </div>
        {needsGuidance&&<p className="bo-hyp-inline-guidance"><AlertTriangle size={15}/> Este enunciado parece superficial. Descreva o que está acontecendo, quem é afetado e onde a falha ocorre, sem presumir a causa.</p>}
        <div className="bo-hyp-inline-properties">
          <label>Severidade: <select value={draft.severity} onChange={event=>setDraft(current=>current?{...current,severity:event.target.value as ProblemSeverity}:current)}>{Object.entries(severityLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label>Prioridade: <select value={draft.priority} onChange={event=>setDraft(current=>current?{...current,priority:event.target.value as ProblemPriority}:current)}>{Object.entries(priorityLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label>Responsável: <input value={owner} onChange={event=>setOwner(event.target.value)} placeholder="Atribuir responsável"/></label>
          <label>Tags: <input value={tagsText} onChange={event=>setTagsText(event.target.value)} placeholder="+ Adicionar tags"/></label>
        </div>
      </header>
      <nav className="bo-h71-detail-tabs bo-hyp-inline-tabs" aria-label="Detalhes do problema">
        {([['overview','Visão geral'],['context','Contexto'],['evidence','Evidências'],['definition','Validação'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label])=><button type="button" key={id} className={detailTab===id?'is-active':''} onClick={()=>setDetailTab(id)}>{label}{id==='evidence'&&<b>{evidences.filter(item=>connectedIds.includes(item.id)).length}</b>}{id==='context'&&<b>{contexts.filter(item=>connectedIds.includes(item.id)).length}</b>}</button>)}
      </nav>
      {detailTab==='overview' ? <EntityInlineCanvas entityId={selected.id} kind="problem"
        blocks={blocks} criteria={quality} criterionTitle="Critérios de qualidade"
        primaryCriterionIds={['validated','statement','cause','impact','population','signal','context','evidence']}
        quickKinds={['pain','evidence','problemHypothesis']}
        relations={relationOptions.map(item=>({id:item.id,kind:item.kind,title:item.title,linked:connectedIds.includes(item.id)}))}
        onToggleRelation={toggleRelation} onViewValidation={()=>setDetailTab('definition')}
        sidebarTop={<section className="bo-problem-origin">
          <header><strong>Origem e rastreabilidade</strong></header>
          {preview.sourceHypothesis ? <><strong>{contextEntityTitle(preview.sourceHypothesis)}</strong><p>Hipótese de origem vinculada à validação.</p></>
            : <><strong>Criado diretamente</strong><p>Relacione hipóteses, dores e evidências sem marcar o problema como validado.</p></>}
          {!preview.sourceHypothesis&&lineage.length>0&&<div className="bo-problem-origin-links"><span>Hipóteses relacionadas:</span>
            {lineage.slice(0,4).map(item=><button type="button" key={item.id} aria-pressed={connectedIds.includes(item.id)} onClick={()=>toggleRelation(item.id)}>
              {connectedIds.includes(item.id)?<Check size={12}/>:<Plus size={12}/>} {item.title}
            </button>)}
          </div>}
          {!preview.sourceHypothesis&&lineage.length===0&&<p>Não há hipóteses cadastradas para relacionar.</p>}
        </section>}
      /> : <div className="bo-h71-detail-body bo-hyp-inline-secondary">
        {detailTab === 'context' && <div><div className="bo-h71-section-intro"><div><small>SERVICE GRAPH</small><h2>Onde este problema acontece?</h2><p>Conecte Personas, Necessidades, Jobs e Dores que delimitam o problema validado.</p></div><strong>{contexts.filter((item) => connectedIds.includes(item.id)).length} conexões</strong></div><div className="bo-h71-relation-grid">{(['persona','need','job','pain'] as ProblemRelationKind[]).map((kind) => { const options = contexts.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{options.filter((item) => connectedIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}
        {detailTab === 'evidence' && <div><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que sustenta este Problema?</h2><p>Mantenha a base observável usada na validação e conecte novas evidências sem apagar o histórico.</p></div><strong>{evidences.filter((item) => connectedIds.includes(item.id)).length} conectada(s)</strong></div>{evidences.length ? <div className="bo-h71-evidence-list">{evidences.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois conecte-as aqui.</p></div>}</div>}
        {detailTab === 'definition' && <div className="bo-h76-definition"><div className="bo-h71-section-intro"><div><small>PRONTO PARA DEFINIR</small><h2>Este problema já pode orientar o desenho do serviço?</h2><p>A definição deve começar quando causa, impacto, contexto e evidência estiverem suficientemente claros.</p></div><strong>{preview?.qualityScore ?? 0}%</strong></div>{String(selected.status)==='draft'&&<section className="bo-problem-draft-review"><strong>Problema em investigação</strong><p>Você pode estruturar o problema diretamente nesta aba. A validação só é liberada depois que todos os critérios metodológicos e as evidências estiverem completos.</p><button type="button" disabled={!preview?.qualityChecks.filter(item=>item.id!=='validated').every(item=>item.complete)} onClick={validateDraftProblem}><Check size={13}/> Validar problema com evidências</button></section>}<div className="bo-h76-quality-list">{preview?.qualityChecks.map((item) => <article key={item.id} className={item.complete ? 'is-complete' : ''}><b>{item.complete ? <Check size={14}/> : <AlertTriangle size={14}/>}</b><div><strong>{item.label}</strong><p>{item.detail}</p></div></article>)}</div><div className={`bo-h76-definition-status ${preview?.readyForDefinition ? 'is-ready' : ''}`}><ShieldCheck size={20}/><div><strong>{preview?.readyForDefinition ? 'Pronto para Service Definition' : 'Ainda não está pronto para Service Definition'}</strong><p>{preview?.readyForDefinition ? 'O problema possui estrutura e rastreabilidade suficientes para orientar escopo, promessa e critérios de sucesso.' : 'Complete os critérios pendentes antes de usar este problema como âncora da definição.'}</p></div></div></div>}
        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="validatedProblem" id={selected.id} title="Uso e relações" />}
      </div>}
      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm" role="alertdialog" aria-modal="true" aria-label="Excluir problema"><header><div><small>REMOVER PROBLEMA</small><h2>Remover “{contextEntityTitle(graph.entities?.problem?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>Este problema e suas conexões serão removidos. Hipóteses e evidências relacionadas serão preservadas.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeProblem(deleteId)}>Remover Problema</button></footer></div></div>}
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

import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityCanvas } from '../components/entity-editor/EntityCanvas';
import { EntityEditorHeader, EntityTags } from '../components/entity-editor/EntityEditor';
import { parseCustomBlocks, type CustomEntityBlock, type EntityCanvasBlock, type EditorFieldKind } from '../components/entity-editor/types';
import { Check, Filter, ListTodo, MoreVertical, Plus, Search, Table2, X } from '../design-system/icons';
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
  const [customBlocks, setCustomBlocks] = useState<CustomEntityBlock[]>([]);
  const flushRef = useRef<()=>void>(()=>{});
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
    if (!selected || !report) { setDraft(null); setOwner(''); setTagsText(''); setConnectedIds([]); setCustomBlocks([]); return; }
    setDraft(jobProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
    setCustomBlocks(parseCustomBlocks(selected.canvasCustomBlocks));
  }, [selectedId]);

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
  const closeJob = (commit=true) => { if(commit)flushRef.current();setSelectedId(null);setDraft(null);setDetailTab('overview'); };
  const createJob = () => {
    if (!createTitle.trim()) return;
    const now = new Date().toISOString();
    const entity = createDiscoveryEntity({ graph, kind: 'job', title: createTitle, description: createDescription, now });
    setGraph((current) => ({ ...current, service: { ...current.service, updatedAt: now }, entities: { ...current.entities, job: { ...(current.entities?.job ?? {}), [entity.id]: { ...entity, importance: 'medium' } } } }), 'Jobs 2.0: criar');
    setCreateOpen(false); setCreateTitle(''); setCreateDescription(''); setSelectedId(entity.id); setDetailTab('overview');
    showToast('Job criado. Complete situação, progresso e relações.');
  };
  const tags=tagsText.split(',').map(t=>t.trim()).filter(Boolean);
  const original=selected?jobProfileFromEntity(selected):null;
  const storedTags=Array.isArray(selected?.tags)?selected.tags.map(String):[];
  const sameIds=(a:string[],b:string[])=>[...a].sort().join('|')===[...b].sort().join('|');
  const dirty=Boolean(draft&&original&&(
    (Object.keys(draft) as Array<keyof JobProfileDraft>).some(key=>draft[key].trim()!==original[key].trim())
    ||owner.trim()!==String(selected?.owner??'').trim()
    ||tags.join('|')!==storedTags.join('|')
    ||!sameIds(connectedIds,report?.connections.map(item=>item.id)??[])
    ||JSON.stringify(customBlocks)!==JSON.stringify(parseCustomBlocks(selected?.canvasCustomBlocks))
  ));
  const persistJob=(id:string,data:JobProfileDraft,nextOwner:string,nextTags:string[],links:string[],custom:CustomEntityBlock[])=>{
    if(!data.title.trim())return;
    setGraph(current=>{
      const next=patchJobMeta(updateJobProfile({graph:current,jobId:id,draft:data,connectedIds:links}),id,nextOwner,nextTags);
      const saved=next.entities?.job?.[id];
      if(!saved)return next;
      return {...next,entities:{...next.entities,job:{...next.entities.job,[id]:{...saved,canvasCustomBlocks:custom}}}};
    },'Jobs: autosave');
  };
  flushRef.current=()=>{if(selectedId&&draft?.title.trim()&&dirty)persistJob(selectedId,draft,owner,tags,connectedIds,customBlocks)};
  useEffect(()=>()=>flushRef.current(),[]);
  useEffect(()=>{
    if(!selectedId||!draft?.title.trim()||!dirty)return;
    const timer=window.setTimeout(()=>persistJob(selectedId,draft,owner,tags,connectedIds,customBlocks),800);
    return()=>window.clearTimeout(timer);
  },[selectedId,draft,owner,tagsText,connectedIds,customBlocks,dirty]);
  const removeJob=(id:string)=>{
    setGraph(current=>removeContextEntity(current,'job',id),'Jobs: remover');
    if(selectedId===id)closeJob(false);
    setDeleteId(null);setMenuId(null);
    showToast('Job removido e relações desvinculadas.');
  };
  const toggleRelation=(id:string)=>setConnectedIds(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const addCustom=(kind:EditorFieldKind)=>{
    if(customBlocks.length>=60){showToast('Limite de 60 campos personalizados por entidade.');return;}
    const names:Record<EditorFieldKind,string>={text:'Texto',checklist:'Checklist',number:'Número',date:'Data',image:'Imagem (URL)',document:'Documento (link)'};
    const id='custom-'+(typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2,7));
    setCustomBlocks(items=>[...items,{id,label:names[kind],kind,value:''}]);
  };
  const changeCustom=(id:string,value:string)=>setCustomBlocks(items=>items.map(item=>item.id===id?{...item,value}:item));
  const removeCustom=(id:string)=>setCustomBlocks(items=>items.filter(item=>item.id!==id));
  const renameCustom=(id:string,label:string)=>setCustomBlocks(items=>items.map(item=>item.id===id?{...item,label}:item));

  if (selected && draft && report) {
    const evidence = relationOptions.filter((item) => item.kind === 'evidence');
    const evidenceConnections = evidence.filter((item) => connectedIds.includes(item.id));
    const personaOptions = relationOptions.filter((item) => item.kind === 'persona');
    const score = previewReport?.foundationScore ?? report.foundationScore;
    const blocks:EntityCanvasBlock[]=[
      {id:'situation',label:'Situação / gatilho',essential:true,value:draft.situation,placeholder:'Quando esse Job aparece na rotina da pessoa?',onChange:value=>setDraft(current=>current?{...current,situation:value}:current)},
      {id:'desiredProgress',label:'Progresso desejado',essential:true,value:draft.desiredProgress,placeholder:'Que mudança concreta a pessoa tenta alcançar?',onChange:value=>setDraft(current=>current?{...current,desiredProgress:value}:current)},
      {id:'motivation',label:'Motivação',essential:true,value:draft.motivation,placeholder:'Para que esse progresso importa?',onChange:value=>setDraft(current=>current?{...current,motivation:value}:current)},
      {id:'description',label:'Descrição',value:draft.description,placeholder:'Descreva o progresso buscado, não a funcionalidade.',onChange:value=>setDraft(current=>current?{...current,description:value}:current)},
      {id:'barriers',label:'Barreiras',value:draft.barriers,placeholder:'O que impede a pessoa de avançar?',onChange:value=>setDraft(current=>current?{...current,barriers:value}:current)},
      {id:'currentAlternative',label:'Alternativa atual',value:draft.currentAlternative,placeholder:'Como esse Job é realizado hoje?',onChange:value=>setDraft(current=>current?{...current,currentAlternative:value}:current)},
      {id:'successSignal',label:'Sinal de sucesso',value:draft.successSignal,placeholder:'Como saber que o Job foi concluído?',onChange:value=>setDraft(current=>current?{...current,successSignal:value}:current)},
      ...customBlocks.map(block=>({id:block.id,label:block.label,value:block.value,custom:true,kind:block.kind,placeholder:'Preencha o campo personalizado',onChange:(value:string)=>changeCustom(block.id,value)})),
    ];
    const checks=(previewReport?.foundationChecks??report.foundationChecks).map(check=>({
      ...check,
      kinds:check.id==='persona'?['persona']:check.id==='context'?['need','pain','problemHypothesis','problem']:check.id==='evidence'?['evidence']:undefined,
      fieldId:check.id==='statement'?'description':check.id==='situation'?'situation':check.id==='progress'?'desiredProgress':check.id==='motivation'?'motivation':undefined,
    }));
    const statement = draft.situation.trim()&&draft.desiredProgress.trim()&&draft.motivation.trim()
      ? `Quando ${draft.situation.trim()}, quero ${draft.desiredProgress.trim()}, para poder ${draft.motivation.trim()}.`
      : 'Enuncie o Job como progresso: “Quando [situação], quero [progresso], para poder [resultado]”.';
    return <section className="bo-h73-job-detail bo-pain-editor bo-job-editor" data-jobs-h73="detail">
      <EntityEditorHeader kind="Jobs" eyebrow="JOB TO BE DONE" title={draft.title} score={score}
        status={!draft.title.trim()?'invalid':studio.saveStatus==='error'?'error':dirty?'saving':'saved'}
        guidance={statement}
        onChangeTitle={value=>setDraft(current=>current?{...current,title:value}:current)}
        onBack={()=>closeJob()} onDelete={()=>setDeleteId(selected.id)}
        properties={<>
          <label>Importância: <select value={draft.importance} onChange={e=>setDraft(current=>current?{...current,importance:e.target.value as JobImportance}:current)}>{Object.entries(importanceLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Responsável: <input aria-label="Responsável" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Atribuir responsável"/></label>
          <EntityTags value={tagsText} onChange={setTagsText}/>
        </>}
      />
      <nav className="bo-h71-detail-tabs bo-pain-detail-tabs" aria-label="Detalhes do Job">
        {([['overview','Visão geral'],['people','Pessoas'],['relations','Relações'],['evidence','Evidências'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label])=><button type="button" key={id} className={detailTab===id?'is-active':''} onClick={()=>setDetailTab(id)}>{label}{id==='people'&&<b>{previewReport?.connectionCounts.persona??report.connectionCounts.persona}</b>}{id==='relations'&&<b>{connectedIds.length}</b>}{id==='evidence'&&<b>{evidenceConnections.length}</b>}</button>)}
      </nav>
      {detailTab==='overview'?
        <EntityCanvas entityKey={'job:'+selected.id} blocks={blocks} checks={checks}
          relations={relationOptions.map(item=>({id:item.id,kind:item.kind,title:item.title,linked:connectedIds.includes(item.id)}))}
          onToggleRelation={toggleRelation} onAddCustom={addCustom} onRemoveCustom={removeCustom} onRenameCustom={renameCustom}
          onRemoveEntity={()=>setDeleteId(selected.id)}/>
        : <div className="bo-h71-detail-body">
        {detailTab === 'people' && <div><div className="bo-h71-section-intro"><div><small>PESSOAS</small><h2>Quem tenta realizar este Job?</h2><p>Conecte Personas para manter o Job ancorado em pessoas e situações reais.</p></div><strong>{personaOptions.filter((item) => connectedIds.includes(item.id)).length} conectada(s)</strong></div>{personaOptions.length ? <div className="bo-h72-people-grid">{personaOptions.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma Persona criada</strong><p>Crie Personas primeiro e depois conecte-as ao Job.</p></div>}</div>}
        {detailTab === 'relations' && <div><div className="bo-h71-section-intro"><div><small>SERVICE GRAPH</small><h2>Que contexto explica este Job?</h2><p>Necessidades, dores, hipóteses e problemas ajudam a entender por que esse progresso importa e o que impede sua realização.</p></div><strong>{connectedIds.filter((id) => !personaOptions.some((item) => item.id === id) && !evidence.some((item) => item.id === id)).length} conexões</strong></div><div className="bo-h71-relation-grid">{(['need','pain','problemHypothesis','problem'] as JobRelationKind[]).map((kind) => { const options = relationOptions.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{options.filter((item) => connectedIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}
        {detailTab === 'evidence' && <div><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que comprova este Job?</h2><p>Conecte entrevistas, observações e dados que demonstrem que esse progresso realmente é buscado pelas pessoas.</p></div><strong>{evidenceConnections.length} conectada(s)</strong></div>{evidence.length ? <div className="bo-h71-evidence-list">{evidence.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois conecte-as aqui.</p></div>}</div>}
        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="job" id={selected.id} title="Uso e relações" />}
      </div>}
      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm" role="alertdialog" aria-modal="true" aria-label="Excluir Job"><header><div><small>REMOVER JOB</small><h2>Remover “{contextEntityTitle(graph.entities?.job?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações serão desvinculadas do Service Graph, mas Personas, Necessidades, Dores, Problemas e Evidências serão preservados.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeJob(deleteId)}>Remover Job</button></footer></div></div>}
    </section>;
  }

  return <section className="bo-h73-jobs" data-jobs-h73="library"><div className="bo-h71-page-head"><div><span>Workspace /</span><h1>Jobs</h1></div></div><div className="bo-h71-toolbar"><strong>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</strong><div><label className="bo-h71-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Jobs"/></label><button type="button" className={showFilters ? 'is-active' : ''} onClick={() => setShowFilters((value) => !value)} aria-label="Filtros"><Filter size={16}/></button><button type="button" className="is-active"><Table2 size={16}/><span>Tabela</span></button><button type="button" className="primary" onClick={() => setCreateOpen(true)}><Plus size={16}/> Criar Job</button></div></div>
    {showFilters && <div className="bo-h71-filters"><span>Filtros</span>{([['all','Todos'],['unused','Não usados'],['evidence','Com evidência'],['incomplete','Base incompleta'],['high','Alta importância']] as Array<[FilterMode,string]>).map(([id,label]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>}
    <div className="bo-h71-table-wrap"><table className="bo-h71-table bo-h73-table"><thead><tr><th></th><th>JOB</th><th>IMPORTÂNCIA</th><th>ATUALIZADO</th><th>RESPONSÁVEL</th><th>PERSONAS</th><th>NECESSIDADES</th><th>EVIDÊNCIAS</th><th>USADO EM</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.job.id}><td className="menu-cell"><button type="button" onClick={() => setMenuId(menuId === row.job.id ? null : row.job.id)}><MoreVertical size={15}/></button>{menuId === row.job.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openJob(row.job.id)}>Abrir</button><button type="button" className="danger" onClick={() => setDeleteId(row.job.id)}>Remover</button></div>}</td><td><button type="button" className="bo-h73-job-name" onClick={() => openJob(row.job.id)}><span><ListTodo size={14}/></span><strong>{row.title}</strong></button></td><td><span className={`bo-h72-importance is-${String(row.job.importance || 'medium')}`}>{importanceLabel[(row.job.importance as JobImportance) || 'medium'] ?? 'Média'}</span></td><td>{formatDate(row.job.updatedAt ?? row.job.createdAt)}</td><td>{row.owner}</td><td>{row.report?.connectionCounts.persona ?? 0}</td><td>{row.report?.connectionCounts.need ?? 0}</td><td>{row.report?.connectionCounts.evidence ?? 0}</td><td><span className="bo-h71-usage-pill">{row.usage.instances || row.usage.relatedCount ? `${row.usage.instances} visual · ${row.usage.relatedCount} relação` : 'Não usado'}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="bo-h71-empty"><ListTodo size={26}/><strong>{query || filter !== 'all' ? 'Nenhum Job encontrado' : 'Nenhum Job criado'}</strong><p>{query || filter !== 'all' ? 'Ajuste a busca ou os filtros.' : 'Registre o progresso que as pessoas tentam realizar em uma situação concreta.'}</p>{!query && filter === 'all' && <button type="button" onClick={() => setCreateOpen(true)}><Plus size={14}/> Criar Job</button>}</div>}</div>
    {createOpen && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><form className="bo-h71-create-modal" onSubmit={(event) => { event.preventDefault(); createJob(); }}><header><div><small>NOVO JOB</small><h2>Registre o progresso que a pessoa tenta realizar</h2><p>Descreva o que ela quer conseguir em uma situação — não a solução ou funcionalidade.</p></div><button type="button" onClick={() => setCreateOpen(false)}><X size={17}/></button></header><label><span>Nome do Job</span><input autoFocus value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="Ex.: Ter roupas limpas sem perder tempo da semana"/></label><label><span>Descrição <small>opcional</small></span><textarea rows={4} value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="Que progresso essa pessoa está tentando realizar?"/></label><footer><button type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={!createTitle.trim()}>Criar e abrir</button></footer></form></div>}
    {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER JOB</small><h2>Remover “{contextEntityTitle(graph.entities?.job?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações existentes serão desvinculadas do Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeJob(deleteId)}>Remover Job</button></footer></div></div>}
  </section>;
}

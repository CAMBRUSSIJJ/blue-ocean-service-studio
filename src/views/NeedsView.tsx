import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityCanvas } from '../components/entity-editor/EntityCanvas';
import { EntityEditorHeader, EntityTags } from '../components/entity-editor/EntityEditor';
import { parseCustomBlocks, type CustomEntityBlock, type EntityCanvasBlock, type EditorFieldKind } from '../components/entity-editor/types';
import { Check, Filter, MoreVertical, Plus, Search, Table2, Target, X } from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import { createDiscoveryEntity } from '../services/discovery-workspace';
import { contextEntityTitle, contextEntityUsage, listContextEntities, removeContextEntity } from '../services/context-library';
import {
  buildNeedStudioReport,
  needProfileFromEntity,
  needRelationOptions,
  updateNeedProfile,
  type NeedImportance,
  type NeedProfileDraft,
  type NeedRelationKind,
} from '../services/needs-studio';

type DetailTab = 'overview' | 'people' | 'relations' | 'evidence' | 'usage';
type FilterMode = 'all' | 'unused' | 'evidence' | 'incomplete' | 'high';
const relationLabel: Record<NeedRelationKind, string> = { persona: 'Personas', job: 'Jobs', pain: 'Dores', problemHypothesis: 'Hipóteses', problem: 'Problemas', evidence: 'Evidências' };
const importanceLabel: Record<NeedImportance, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
const formatDate = (value: unknown) => { const date = new Date(String(value ?? '')); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); };

function patchNeedMeta(graph: ServiceGraph, needId: string, owner: string, tags: string[]): ServiceGraph {
  const current = graph.entities?.need?.[needId];
  if (!current) return graph;
  const now = new Date().toISOString();
  return { ...graph, service: { ...graph.service, updatedAt: now }, entities: { ...graph.entities, need: { ...(graph.entities?.need ?? {}), [needId]: { ...current, owner: owner.trim(), tags, updatedAt: now } } } };
}

export function NeedsView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const needs = useMemo(() => listContextEntities(graph, 'need'), [graph]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [draft, setDraft] = useState<NeedProfileDraft | null>(null);
  const [owner, setOwner] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [customBlocks, setCustomBlocks] = useState<CustomEntityBlock[]>([]);
  const flushRef = useRef<()=>void>(()=>{});
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = selectedId ? graph.entities?.need?.[selectedId] : undefined;
  const report = useMemo(() => selectedId ? buildNeedStudioReport(graph, selectedId) : null, [graph, selectedId]);
  const previewReport = useMemo(() => {
    if (!selectedId || !draft) return report;
    const preview = updateNeedProfile({ graph, needId: selectedId, draft, connectedIds, now: String(selected?.updatedAt ?? graph.service.updatedAt) });
    return buildNeedStudioReport(preview, selectedId);
  }, [graph, selectedId, draft, connectedIds, report, selected?.updatedAt]);
  const relationOptions = useMemo(() => needRelationOptions(graph), [graph]);

  useEffect(() => {
    if (!selected || !report) { setDraft(null); setOwner(''); setTagsText(''); setConnectedIds([]); setCustomBlocks([]); return; }
    setDraft(needProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
    setCustomBlocks(parseCustomBlocks(selected.canvasCustomBlocks));
  }, [selectedId]);

  useEffect(() => {
    if (sessionStorage.getItem('bo-workspace-create-page') !== 'needs') return;
    sessionStorage.removeItem('bo-workspace-create-page'); setCreateOpen(true);
  }, []);


  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'need' || !detail.id) return;
      if (!graph.entities?.need?.[detail.id]) return;
      setSelectedId(detail.id);
      setDetailTab('usage');
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) {
        const detail = JSON.parse(raw) as { kind?: string; id?: string };
        if (detail.kind === 'need' && detail.id && graph.entities?.need?.[detail.id]) {
          setSelectedId(detail.id); setDetailTab('usage'); sessionStorage.removeItem('bo-service-object-focus');
        }
      }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [graph]);

  const rows = useMemo(() => needs.map((need) => {
    const needReport = buildNeedStudioReport(graph, need.id);
    const usage = contextEntityUsage(graph, 'need', need.id);
    return { need, report: needReport, usage, title: contextEntityTitle(need), owner: String(need.owner || 'Você'), tags: Array.isArray(need.tags) && need.tags.length ? need.tags.map(String).join(', ') : 'Sem tags' };
  }), [graph, needs]);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.title} ${row.owner} ${row.tags} ${String(row.need.description ?? '')} ${String(row.need.context ?? '')}`.toLowerCase();
    if (!haystack.includes(query.trim().toLowerCase())) return false;
    if (filter === 'unused') return row.usage.instances === 0 && row.usage.relatedCount === 0;
    if (filter === 'evidence') return (row.report?.connectionCounts.evidence ?? 0) > 0;
    if (filter === 'incomplete') return (row.report?.foundationScore ?? 0) < 100;
    if (filter === 'high') return ['high', 'critical'].includes(String(row.need.importance));
    return true;
  }), [rows, query, filter]);

  const openNeed = (id: string) => { setSelectedId(id); setDetailTab('overview'); setMenuId(null); };
  const closeNeed = (commit=true) => { if(commit)flushRef.current();setSelectedId(null); setDraft(null); setDetailTab('overview'); };
  const createNeed = () => {
    if (!createTitle.trim()) return;
    const now = new Date().toISOString();
    const entity = createDiscoveryEntity({ graph, kind: 'need', title: createTitle, description: createDescription, now });
    setGraph((current) => ({ ...current, service: { ...current.service, updatedAt: now }, entities: { ...current.entities, need: { ...(current.entities?.need ?? {}), [entity.id]: { ...entity, importance: 'medium' } } } }), 'Necessidades 2.0: criar');
    setCreateOpen(false); setCreateTitle(''); setCreateDescription(''); setSelectedId(entity.id); setDetailTab('overview');
    showToast('Necessidade criada. Complete contexto, resultado e relações.');
  };
  const tags = tagsText.split(',').map(value=>value.trim()).filter(Boolean);
  const original = selected ? needProfileFromEntity(selected) : null;
  const oldTags = Array.isArray(selected?.tags) ? selected.tags.map(String) : [];
  const dirty = Boolean(draft && original && (
    (Object.keys(draft) as Array<keyof NeedProfileDraft>).some(key=>draft[key].trim()!==original[key].trim())
    || owner.trim()!==String(selected?.owner??'').trim()
    || tags.join('|')!==oldTags.join('|')
    || [...connectedIds].sort().join('|')!==[...(report?.connections.map(item=>item.id)??[])].sort().join('|')
    || JSON.stringify(customBlocks)!==JSON.stringify(parseCustomBlocks(selected?.canvasCustomBlocks))
  ));
  const persistNeed=(id:string,data:NeedProfileDraft,nextOwner:string,nextTags:string[],links:string[],custom:CustomEntityBlock[])=>{
    if(!data.title.trim())return;
    setGraph(current=>{
      const next=patchNeedMeta(updateNeedProfile({graph:current,needId:id,draft:data,connectedIds:links}),id,nextOwner,nextTags);
      const updated=next.entities?.need?.[id];
      if(!updated)return next;
      return {...next,entities:{...next.entities,need:{...next.entities.need,[id]:{...updated,canvasCustomBlocks:custom}}}};
    },'Necessidades: autosave');
  };
  flushRef.current=()=>{if(selectedId&&draft?.title.trim()&&dirty)persistNeed(selectedId,draft,owner,tags,connectedIds,customBlocks)};
  useEffect(()=>()=>flushRef.current(),[]);
  useEffect(()=>{
    if(!selectedId||!draft?.title.trim()||!dirty)return;
    const timer=window.setTimeout(()=>persistNeed(selectedId,draft,owner,tags,connectedIds,customBlocks),800);
    return ()=>window.clearTimeout(timer);
  },[selectedId,draft,owner,tagsText,connectedIds,customBlocks,dirty]);
  const removeNeed = (id: string) => {
    setGraph((current) => removeContextEntity(current, 'need', id), 'Necessidades: remover');
    if (selectedId === id) closeNeed(false);
    setDeleteId(null);setMenuId(null);
    showToast('Necessidade removida e relações desvinculadas.');
  };
  const toggleRelation = (id: string) => setConnectedIds(current=>current.includes(id)?current.filter(x=>x!==id):[...current,id]);
  const addCustom = (kind:EditorFieldKind)=>{
    if(customBlocks.length>=60){showToast('Limite de 60 campos personalizados por entidade.');return;}
    const label:Record<EditorFieldKind,string>={text:'Texto',checklist:'Checklist',number:'Número',date:'Data',image:'Imagem (URL)',document:'Documento (link)'};
    const id='custom-'+(typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2,7));
    setCustomBlocks(items=>[...items,{id,label:label[kind],kind,value:''}]);
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
      {id:'context',label:'Contexto',essential:true,value:draft.context,placeholder:'Quando, onde e em qual situação essa necessidade aparece?',onChange:value=>setDraft(current=>current?{...current,context:value}:current)},
      {id:'desiredOutcome',label:'Resultado desejado',essential:true,value:draft.desiredOutcome,placeholder:'O que a pessoa precisa alcançar?',onChange:value=>setDraft(current=>current?{...current,desiredOutcome:value}:current)},
      {id:'description',label:'Descrição',value:draft.description,placeholder:'Descreva o que precisa ser resolvido, sem antecipar a solução.',onChange:value=>setDraft(current=>current?{...current,description:value}:current)},
      {id:'currentWorkaround',label:'Alternativa atual',value:draft.currentWorkaround,placeholder:'Como essa necessidade é resolvida hoje?',onChange:value=>setDraft(current=>current?{...current,currentWorkaround:value}:current)},
      {id:'successSignal',label:'Sinal de sucesso',value:draft.successSignal,placeholder:'Como verificar que a necessidade foi atendida?',onChange:value=>setDraft(current=>current?{...current,successSignal:value}:current)},
      ...customBlocks.map(block=>({id:block.id,label:block.label,value:block.value,custom:true,kind:block.kind,placeholder:'Preencha o campo personalizado',onChange:(value:string)=>changeCustom(block.id,value)})),
    ];
    const checks=(previewReport?.foundationChecks??report.foundationChecks).map(check=>({
      ...check,
      kinds:check.id==='persona'?['persona']:check.id==='friction'?['job','pain','problemHypothesis','problem']:check.id==='evidence'?['evidence']:undefined,
      fieldId:check.id==='statement'?'description':check.id==='context'?'context':check.id==='outcome'?'desiredOutcome':undefined,
    }));
    return <section className="bo-h72-need-detail bo-pain-editor bo-need-editor" data-needs-h72="detail">
      <EntityEditorHeader kind="Necessidades" eyebrow="NECESSIDADE DO SERVIÇO" title={draft.title} score={score}
        status={!draft.title.trim()?'invalid':studio.saveStatus==='error'?'error':dirty?'saving':'saved'}
        guidance={draft.title.trim().length<28?'Descreva o resultado que a pessoa precisa alcançar, sem propor antecipadamente uma solução.':undefined}
        onChangeTitle={value=>setDraft(current=>current?{...current,title:value}:current)}
        onBack={()=>closeNeed()} onDelete={()=>setDeleteId(selected.id)}
        properties={<>
          <label>Importância: <select value={draft.importance} onChange={event=>setDraft(current=>current?{...current,importance:event.target.value as NeedImportance}:current)}>{Object.entries(importanceLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Responsável: <input aria-label="Responsável" value={owner} onChange={event=>setOwner(event.target.value)} placeholder="Atribuir responsável"/></label>
          <EntityTags value={tagsText} onChange={setTagsText}/>
        </>}
      />
      <nav className="bo-h71-detail-tabs bo-pain-detail-tabs" aria-label="Detalhes da necessidade">
        {([['overview','Visão geral'],['people','Pessoas'],['relations','Relações'],['evidence','Evidências'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label])=><button type="button" key={id} className={detailTab===id?'is-active':''} onClick={()=>setDetailTab(id)}>{label}{id==='people'&&<b>{previewReport?.connectionCounts.persona??report.connectionCounts.persona}</b>}{id==='relations'&&<b>{connectedIds.length}</b>}{id==='evidence'&&<b>{evidenceConnections.length}</b>}</button>)}
      </nav>
      {detailTab==='overview'?
        <EntityCanvas entityKey={'need:'+selected.id} blocks={blocks} checks={checks}
          relations={relationOptions.map(item=>({id:item.id,kind:item.kind,title:item.title,linked:connectedIds.includes(item.id)}))}
          onToggleRelation={toggleRelation} onAddCustom={addCustom} onRemoveCustom={removeCustom} onRenameCustom={renameCustom}
          onRemoveEntity={()=>setDeleteId(selected.id)} />
        : <div className="bo-h71-detail-body">
        {detailTab === 'people' && <div><div className="bo-h71-section-intro"><div><small>PESSOAS</small><h2>Quem vive esta necessidade?</h2><p>Conecte somente Personas para as quais essa necessidade é realmente relevante. Isso evita necessidades genéricas sem público claro.</p></div><strong>{personaOptions.filter((item) => connectedIds.includes(item.id)).length} conectada(s)</strong></div>{personaOptions.length ? <div className="bo-h72-people-grid">{personaOptions.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma Persona criada</strong><p>Crie Personas primeiro e depois conecte-as a esta necessidade.</p></div>}</div>}
        {detailTab === 'relations' && <div><div className="bo-h71-section-intro"><div><small>SERVICE GRAPH</small><h2>O que explica ou deriva desta necessidade?</h2><p>Jobs, dores e problemas ajudam a transformar uma necessidade ampla em contexto utilizável no desenho do serviço.</p></div><strong>{connectedIds.filter((id) => !personaOptions.some((item) => item.id === id) && !evidence.some((item) => item.id === id)).length} conexões</strong></div><div className="bo-h71-relation-grid">{(['job','pain','problemHypothesis','problem'] as NeedRelationKind[]).map((kind) => { const options = relationOptions.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{options.filter((item) => connectedIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}
        {detailTab === 'evidence' && <div><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que comprova esta necessidade?</h2><p>Conecte observações, entrevistas e dados que sustentem a existência ou a importância desta necessidade.</p></div><strong>{evidenceConnections.length} conectada(s)</strong></div>{evidence.length ? <div className="bo-h71-evidence-list">{evidence.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois conecte-as aqui.</p></div>}</div>}
        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="need" id={selected.id} title="Uso e relações" />}
      </div>}
      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm" role="alertdialog" aria-modal="true" aria-label="Excluir necessidade"><header><div><small>REMOVER NECESSIDADE</small><h2>Remover “{contextEntityTitle(graph.entities?.need?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações serão desvinculadas do Service Graph, mas Personas, Jobs, Dores, Problemas e Evidências serão preservados.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeNeed(deleteId)}>Remover Necessidade</button></footer></div></div>}
    </section>;
    </section>;
  }

  return <section className="bo-h72-needs" data-needs-h72="library"><div className="bo-h71-page-head"><div><span>Workspace /</span><h1>Necessidades</h1></div></div><div className="bo-h71-toolbar"><strong>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</strong><div><label className="bo-h71-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar necessidades"/></label><button type="button" className={showFilters ? 'is-active' : ''} onClick={() => setShowFilters((value) => !value)} aria-label="Filtros"><Filter size={16}/></button><button type="button" className="is-active"><Table2 size={16}/><span>Tabela</span></button><button type="button" className="primary" onClick={() => setCreateOpen(true)}><Plus size={16}/> Criar necessidade</button></div></div>
  {showFilters && <div className="bo-h71-filters"><span>Filtros</span>{([['all','Todas'],['unused','Não usadas'],['evidence','Com evidência'],['incomplete','Base incompleta'],['high','Alta importância']] as Array<[FilterMode,string]>).map(([id,label]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>}
  <div className="bo-h71-table-wrap"><table className="bo-h71-table bo-h72-table"><thead><tr><th></th><th>NECESSIDADE</th><th>IMPORTÂNCIA</th><th>ATUALIZADO</th><th>RESPONSÁVEL</th><th>PERSONAS</th><th>EVIDÊNCIAS</th><th>USADO EM</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.need.id}><td className="menu-cell"><button type="button" onClick={() => setMenuId(menuId === row.need.id ? null : row.need.id)}><MoreVertical size={15}/></button>{menuId === row.need.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openNeed(row.need.id)}>Abrir</button><button type="button" className="danger" onClick={() => setDeleteId(row.need.id)}>Remover</button></div>}</td><td><button type="button" className="bo-h72-need-name" onClick={() => openNeed(row.need.id)}><span><Target size={14}/></span><strong>{row.title}</strong></button></td><td><span className={`bo-h72-importance is-${String(row.need.importance || 'medium')}`}>{importanceLabel[(row.need.importance as NeedImportance) || 'medium'] ?? 'Média'}</span></td><td>{formatDate(row.need.updatedAt ?? row.need.createdAt)}</td><td>{row.owner}</td><td>{row.report?.connectionCounts.persona ?? 0}</td><td>{row.report?.connectionCounts.evidence ?? 0}</td><td><span className="bo-h71-usage-pill">{row.usage.instances || row.usage.relatedCount ? `${row.usage.instances} visual · ${row.usage.relatedCount} relação` : 'Não usada'}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="bo-h71-empty"><Target size={26}/><strong>{query || filter !== 'all' ? 'Nenhuma Necessidade encontrada' : 'Nenhuma Necessidade criada'}</strong><p>{query || filter !== 'all' ? 'Ajuste a busca ou os filtros.' : 'Registre o que precisa ser resolvido antes de desenhar soluções.'}</p>{!query && filter === 'all' && <button type="button" onClick={() => setCreateOpen(true)}><Plus size={14}/> Criar necessidade</button>}</div>}</div>
  {createOpen && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><form className="bo-h71-create-modal" onSubmit={(event) => { event.preventDefault(); createNeed(); }}><header><div><small>NOVA NECESSIDADE</small><h2>Registre o que precisa ser resolvido</h2><p>Não descreva a solução. Foque no resultado que a pessoa precisa alcançar.</p></div><button type="button" onClick={() => setCreateOpen(false)}><X size={17}/></button></header><label><span>Nome da necessidade</span><input autoFocus value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="Ex.: Resolver a lavagem de roupas sem perder tempo"/></label><label><span>Descrição <small>opcional</small></span><textarea rows={4} value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="O que precisa ser resolvido e por quê?"/></label><footer><button type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={!createTitle.trim()}>Criar e abrir</button></footer></form></div>}
  {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER NECESSIDADE</small><h2>Remover “{contextEntityTitle(graph.entities?.need?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações existentes serão desvinculadas do Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeNeed(deleteId)}>Remover Necessidade</button></footer></div></div>}
  </section>;
}

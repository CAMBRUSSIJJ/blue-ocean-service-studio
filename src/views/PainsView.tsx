import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityCanvas } from '../components/entity-editor/EntityCanvas';
import { EntityEditorHeader, EntityTags } from '../components/entity-editor/EntityEditor';
import { parseCustomBlocks, type CustomEntityBlock, type EntityCanvasBlock, type EditorFieldKind } from '../components/entity-editor/types';
import { Check, Filter, HeartCrack, MoreVertical, Plus, Search, Table2, X } from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import { createDiscoveryEntity } from '../services/discovery-workspace';
import { contextEntityTitle, contextEntityUsage, listContextEntities, removeContextEntity } from '../services/context-library';
import {
  buildPainStudioReport,
  painProfileFromEntity,
  painRelationOptions,
  updatePainProfile,
  type PainFrequency,
  type PainProfileDraft,
  type PainRelationKind,
  type PainSeverity,
} from '../services/pains-studio';

type DetailTab = 'overview' | 'people' | 'relations' | 'evidence' | 'usage';
type FilterMode = 'all' | 'unused' | 'evidence' | 'incomplete' | 'severe';

const relationLabel: Record<PainRelationKind, string> = {
  persona: 'Personas', need: 'Necessidades', job: 'Jobs', problemHypothesis: 'Hipóteses', problem: 'Problemas', evidence: 'Evidências',
};
const severityLabel: Record<PainSeverity, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
const frequencyLabel: Record<PainFrequency, string> = { rare: 'Rara', occasional: 'Ocasional', frequent: 'Frequente', constant: 'Constante' };
const formatDate = (value: unknown) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

function patchPainMeta(graph: ServiceGraph, painId: string, owner: string, tags: string[]): ServiceGraph {
  const current = graph.entities?.pain?.[painId];
  if (!current) return graph;
  const now = new Date().toISOString();
  return {
    ...graph,
    service: { ...graph.service, updatedAt: now },
    entities: { ...graph.entities, pain: { ...(graph.entities?.pain ?? {}), [painId]: { ...current, owner: owner.trim(), tags, updatedAt: now } } },
  };
}

export function PainsView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const pains = useMemo(() => listContextEntities(graph, 'pain'), [graph]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [draft, setDraft] = useState<PainProfileDraft | null>(null);
  const [owner, setOwner] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [customBlocks, setCustomBlocks] = useState<CustomEntityBlock[]>([]);
  const flushRef = useRef<() => void>(() => {});
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = selectedId ? graph.entities?.pain?.[selectedId] : undefined;
  const report = useMemo(() => selectedId ? buildPainStudioReport(graph, selectedId) : null, [graph, selectedId]);
  const previewReport = useMemo(() => {
    if (!selectedId || !draft) return report;
    const preview = updatePainProfile({ graph, painId: selectedId, draft, connectedIds, now: String(selected?.updatedAt ?? graph.service.updatedAt) });
    return buildPainStudioReport(preview, selectedId);
  }, [graph, selectedId, draft, connectedIds, report, selected?.updatedAt]);
  const relationOptions = useMemo(() => painRelationOptions(graph), [graph]);

  useEffect(() => {
    if (!selected || !report) {
      setDraft(null); setOwner(''); setTagsText(''); setConnectedIds([]); setCustomBlocks([]); return;
    }
    setDraft(painProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
    setCustomBlocks(parseCustomBlocks(selected.canvasCustomBlocks));
  }, [selectedId]);

  useEffect(() => {
    if (sessionStorage.getItem('bo-workspace-create-page') !== 'pains') return;
    sessionStorage.removeItem('bo-workspace-create-page');
    setCreateOpen(true);
  }, []);


  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'pain' || !detail.id) return;
      if (!graph.entities?.pain?.[detail.id]) return;
      setSelectedId(detail.id);
      setDetailTab('usage');
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) {
        const detail = JSON.parse(raw) as { kind?: string; id?: string };
        if (detail.kind === 'pain' && detail.id && graph.entities?.pain?.[detail.id]) {
          setSelectedId(detail.id); setDetailTab('usage'); sessionStorage.removeItem('bo-service-object-focus');
        }
      }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [graph]);

  const rows = useMemo(() => pains.map((pain) => {
    const painReport = buildPainStudioReport(graph, pain.id);
    const usage = contextEntityUsage(graph, 'pain', pain.id);
    return {
      pain,
      report: painReport,
      usage,
      title: contextEntityTitle(pain),
      owner: String(pain.owner || 'Você'),
      tags: Array.isArray(pain.tags) && pain.tags.length ? pain.tags.map(String).join(', ') : 'Sem tags',
    };
  }), [graph, pains]);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.title} ${row.owner} ${row.tags} ${String(row.pain.description ?? '')} ${String(row.pain.context ?? '')} ${String(row.pain.impact ?? '')}`.toLowerCase();
    if (!haystack.includes(query.trim().toLowerCase())) return false;
    if (filter === 'unused') return row.usage.instances === 0 && row.usage.relatedCount === 0;
    if (filter === 'evidence') return (row.report?.connectionCounts.evidence ?? 0) > 0;
    if (filter === 'incomplete') return (row.report?.foundationScore ?? 0) < 100;
    if (filter === 'severe') return ['high', 'critical'].includes(String(row.pain.severity));
    return true;
  }), [rows, query, filter]);

  const openPain = (id: string) => { setSelectedId(id); setDetailTab('overview'); setMenuId(null); };
  const closePain = (commit = true) => { if(commit)flushRef.current();setSelectedId(null);setDraft(null);setDetailTab('overview'); };
  const createPain = () => {
    if (!createTitle.trim()) return;
    const now = new Date().toISOString();
    const entity = createDiscoveryEntity({ graph, kind: 'pain', title: createTitle, description: createDescription, now });
    setGraph((current) => ({
      ...current,
      service: { ...current.service, updatedAt: now },
      entities: { ...current.entities, pain: { ...(current.entities?.pain ?? {}), [entity.id]: { ...entity, severity: 'medium', frequency: 'occasional' } } },
    }), 'Dores 2.0: criar');
    setCreateOpen(false); setCreateTitle(''); setCreateDescription(''); setSelectedId(entity.id); setDetailTab('overview');
    showToast('Dor criada. Complete contexto, impacto e evidências.');
  };
  const tags = tagsText.split(',').map(item=>item.trim()).filter(Boolean);
  const original = selected ? painProfileFromEntity(selected) : null;
  const storedTags = Array.isArray(selected?.tags) ? selected.tags.map(String) : [];
  const dirty = Boolean(draft && original && (
    (Object.keys(draft) as Array<keyof PainProfileDraft>).some(key=>draft[key].trim()!==original[key].trim())
    || owner.trim()!==String(selected?.owner??'').trim()
    || tags.join('|')!==storedTags.join('|')
    || [...connectedIds].sort().join('|')!==[...(report?.connections.map(x=>x.id)??[])].sort().join('|')
    || JSON.stringify(customBlocks)!==JSON.stringify(parseCustomBlocks(selected?.canvasCustomBlocks))
  ));
  const persistPain = (id:string, data:PainProfileDraft, nextOwner:string, nextTags:string[], links:string[], custom:CustomEntityBlock[])=>{
    if(!data.title.trim())return;
    setGraph(current=>{
      const next=patchPainMeta(updatePainProfile({graph:current,painId:id,draft:data,connectedIds:links}),id,nextOwner,nextTags);
      const updated=next.entities.pain?.[id];
      if(!updated)return next;
      return {...next,entities:{...next.entities,pain:{...next.entities.pain,[id]:{...updated,canvasCustomBlocks:custom}}}};
    },'Dores: autosave');
  };
  flushRef.current=()=>{if(selectedId&&draft?.title.trim()&&dirty)persistPain(selectedId,draft,owner,tags,connectedIds,customBlocks);};
  useEffect(()=>()=>flushRef.current(),[]);
  useEffect(()=>{
    if(!selectedId||!draft?.title.trim()||!dirty)return;
    const timer=window.setTimeout(()=>persistPain(selectedId,draft,owner,tags,connectedIds,customBlocks),750);
    return ()=>window.clearTimeout(timer);
  },[selectedId,draft,owner,tagsText,connectedIds,customBlocks,dirty]);
  const removePain = (id: string) => {
    setGraph((current) => removeContextEntity(current, 'pain', id), 'Dores 2.0: remover');
    if (selectedId === id) closePain(false);
    setDeleteId(null); setMenuId(null);
    showToast('Dor removida e relações desvinculadas.');
  };
  const toggleRelation = (id: string) => setConnectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const addCustom = (kind:EditorFieldKind)=>{
    if(customBlocks.length>=60){showToast('Limite de 60 campos personalizados por entidade.');return;}
    const title:Record<EditorFieldKind,string>={text:'Texto',checklist:'Checklist',number:'Número',date:'Data',image:'Imagem (URL)',document:'Documento (link)'};
    const id='custom-'+(typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2,7));
    setCustomBlocks(items=>[...items,{id,label:title[kind],kind,value:''}]);
  };
  const changeCustom=(id:string,value:string)=>setCustomBlocks(items=>items.map(b=>b.id===id?{...b,value}:b));
  const removeCustom=(id:string)=>setCustomBlocks(items=>items.filter(b=>b.id!==id));
  const renameCustom=(id:string,label:string)=>setCustomBlocks(items=>items.map(b=>b.id===id?{...b,label}:b));

  if (selected && draft && report) {
    const evidence = relationOptions.filter((item) => item.kind === 'evidence');
    const evidenceConnections = evidence.filter((item) => connectedIds.includes(item.id));
    const personaOptions = relationOptions.filter((item) => item.kind === 'persona');
    const score = previewReport?.foundationScore ?? report.foundationScore;
    const checks = previewReport?.foundationChecks ?? report.foundationChecks;
    const looksLikeSymptom = /\b(abandona|desiste|cancela|reclama|sai|não compra|não conclui)\b/i.test(draft.title);
    const blocks: EntityCanvasBlock[] = [
      {id:'description',label:'Descrição (o que acontece?)',essential:true,value:draft.description,placeholder:'Descreva o que foi observado.',onChange:value=>setDraft(current=>current?{...current,description:value}:current)},
      {id:'context',label:'Contexto',essential:true,value:draft.context,placeholder:'Quando e onde essa dor aparece?',onChange:value=>setDraft(current=>current?{...current,context:value}:current)},
      {id:'impact',label:'Impacto',essential:true,value:draft.impact,placeholder:'O que a pessoa perde ou deixa de conseguir?',onChange:value=>setDraft(current=>current?{...current,impact:value}:current)},
      {id:'consequence',label:'Consequência',value:draft.consequence,placeholder:'O que acontece se a dor continuar?',onChange:value=>setDraft(current=>current?{...current,consequence:value}:current)},
      {id:'observableSignal',label:'Sinal observável',value:draft.observableSignal,placeholder:'Quais comportamentos ou dados demonstram a dor?',onChange:value=>setDraft(current=>current?{...current,observableSignal:value}:current)},
      {id:'currentWorkaround',label:'Alternativa atual',value:draft.currentWorkaround,placeholder:'Como isso é contornado hoje?',onChange:value=>setDraft(current=>current?{...current,currentWorkaround:value}:current)},
      ...customBlocks.map(block=>({id:block.id,label:block.label,value:block.value,custom:true,kind:block.kind,placeholder:'Preencha o campo personalizado',onChange:(value:string)=>changeCustom(block.id,value)})),
    ];
    return <section className="bo-h74-pain-detail bo-pain-editor" data-pains-h74="detail">
      <EntityEditorHeader
        kind="Dores" eyebrow="FRICÇÃO OBSERVADA" title={draft.title} score={score}
        status={!draft.title.trim()?'invalid':studio.saveStatus==='error'?'error':dirty?'saving':'saved'}
        guidance={looksLikeSymptom?'Isso parece um sintoma. Procure aprofundar o motivo pelo qual essa etapa gera fricção.':undefined}
        onChangeTitle={value=>setDraft(current=>current?{...current,title:value}:current)}
        onBack={()=>closePain()} onDelete={()=>setDeleteId(selected.id)}
        properties={<>
          <label>Severidade: <select value={draft.severity} onChange={e=>setDraft(current=>current?{...current,severity:e.target.value as PainSeverity}:current)}>{Object.entries(severityLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Frequência: <select value={draft.frequency} onChange={e=>setDraft(current=>current?{...current,frequency:e.target.value as PainFrequency}:current)}>{Object.entries(frequencyLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Responsável: <input aria-label="Responsável" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Atribuir responsável"/></label>
          <EntityTags value={tagsText} onChange={setTagsText}/>
        </>}
      />
      <nav className="bo-h71-detail-tabs bo-pain-detail-tabs" aria-label="Detalhes da Dor">
        {([['overview','Visão geral'],['people','Pessoas'],['relations','Relações'],['evidence','Evidências'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label])=><button key={id} type="button" className={detailTab===id?'is-active':''} onClick={()=>setDetailTab(id)}>{label}</button>)}
      </nav>
      {detailTab==='overview'
        ? <EntityCanvas entityKey={'pain:'+selected.id} blocks={blocks}
          checks={checks.map(check=>({...check,kinds:check.id==='persona'?['persona']:check.id==='evidence'?['evidence']:check.id==='journeyContext'?['need','job']:undefined,
            fieldId:check.id==='context'?'context':check.id==='signal'?'observableSignal':check.id==='impact'?'impact':check.id==='statement'?'description':undefined}))}
          relations={relationOptions.map(item=>({id:item.id,kind:item.kind,title:item.title,linked:connectedIds.includes(item.id)}))}
          onToggleRelation={toggleRelation} onAddCustom={addCustom} onRemoveCustom={removeCustom} onRenameCustom={renameCustom}
          onRemoveEntity={()=>setDeleteId(selected.id)}/>
        : <div className="bo-h71-detail-body">
        {detailTab === 'people' && <div><div className="bo-h71-section-intro"><div><small>PESSOAS</small><h2>Quem sente esta dor?</h2><p>Conecte Personas que realmente experimentam esta fricção.</p></div><strong>{connectedIds.filter((id) => personaOptions.some((item) => item.id === id)).length} conectada(s)</strong></div>{personaOptions.length ? <div className="bo-h71-evidence-list">{personaOptions.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma Persona criada</strong><p>Crie Personas primeiro e depois conecte-as à Dor.</p></div>}</div>}
        {detailTab === 'relations' && <div><div className="bo-h71-section-intro"><div><small>SERVICE GRAPH</small><h2>Que contexto explica esta Dor?</h2><p>Necessidades e Jobs mostram onde a fricção aparece; hipóteses e problemas mostram como ela pode evoluir para investigação ou validação.</p></div><strong>{connectedIds.filter((id) => !personaOptions.some((item) => item.id === id) && !evidence.some((item) => item.id === id)).length} conexões</strong></div><div className="bo-h71-relation-grid">{(['need','job','problemHypothesis','problem'] as PainRelationKind[]).map((kind) => { const options = relationOptions.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{options.filter((item) => connectedIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}
        {detailTab === 'evidence' && <div><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que demonstra esta Dor?</h2><p>Conecte entrevistas, observações, reclamações e dados que sustentem que a fricção existe e importa.</p></div><strong>{evidenceConnections.length} conectada(s)</strong></div>{evidence.length ? <div className="bo-h71-evidence-list">{evidence.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois conecte-as aqui.</p></div>}</div>}
        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="pain" id={selected.id} title="Uso e relações" />}
        </div>}
      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER DOR</small><h2>Remover “{contextEntityTitle(graph.entities?.pain?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações serão desvinculadas do Service Graph, mas Personas, Necessidades, Jobs, Hipóteses, Problemas e Evidências serão preservados.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removePain(deleteId)}>Remover Dor</button></footer></div></div>}
    </section>;
  }

  return <section className="bo-h74-pains" data-pains-h74="library">
    <div className="bo-h71-page-head"><div><span>Workspace /</span><h1>Dores</h1></div></div>
    <div className="bo-h71-toolbar"><strong>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</strong><div><label className="bo-h71-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Dores"/></label><button type="button" className={showFilters ? 'is-active' : ''} onClick={() => setShowFilters((value) => !value)} aria-label="Filtros"><Filter size={16}/></button><button type="button" className="is-active"><Table2 size={16}/><span>Tabela</span></button><button type="button" className="primary" onClick={() => setCreateOpen(true)}><Plus size={16}/> Criar Dor</button></div></div>
    {showFilters && <div className="bo-h71-filters"><span>Filtros</span>{([['all','Todas'],['unused','Não usadas'],['evidence','Com evidência'],['incomplete','Base incompleta'],['severe','Alta severidade']] as Array<[FilterMode,string]>).map(([id,label]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>}
    <div className="bo-h71-table-wrap"><table className="bo-h71-table bo-h74-table"><thead><tr><th></th><th>DOR</th><th>SEVERIDADE</th><th>FREQUÊNCIA</th><th>ATUALIZADO</th><th>RESPONSÁVEL</th><th>PERSONAS</th><th>JOBS</th><th>EVIDÊNCIAS</th><th>USADO EM</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.pain.id}><td className="menu-cell"><button type="button" onClick={() => setMenuId(menuId === row.pain.id ? null : row.pain.id)}><MoreVertical size={15}/></button>{menuId === row.pain.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openPain(row.pain.id)}>Abrir</button><button type="button" className="danger" onClick={() => setDeleteId(row.pain.id)}>Remover</button></div>}</td><td><button type="button" className="bo-h74-pain-name" onClick={() => openPain(row.pain.id)}><span><HeartCrack size={14}/></span><strong>{row.title}</strong></button></td><td><span className={`bo-h74-severity is-${String(row.pain.severity || 'medium')}`}>{severityLabel[(row.pain.severity as PainSeverity) || 'medium'] ?? 'Média'}</span></td><td>{frequencyLabel[(row.pain.frequency as PainFrequency) || 'occasional'] ?? 'Ocasional'}</td><td>{formatDate(row.pain.updatedAt ?? row.pain.createdAt)}</td><td>{row.owner}</td><td>{row.report?.connectionCounts.persona ?? 0}</td><td>{row.report?.connectionCounts.job ?? 0}</td><td>{row.report?.connectionCounts.evidence ?? 0}</td><td><span className="bo-h71-usage-pill">{row.usage.instances || row.usage.relatedCount ? `${row.usage.instances} visual · ${row.usage.relatedCount} relação` : 'Não usada'}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="bo-h71-empty"><HeartCrack size={26}/><strong>{query || filter !== 'all' ? 'Nenhuma Dor encontrada' : 'Nenhuma Dor criada'}</strong><p>{query || filter !== 'all' ? 'Ajuste a busca ou os filtros.' : 'Registre fricções observadas antes de transformá-las em problemas.'}</p>{!query && filter === 'all' && <button type="button" onClick={() => setCreateOpen(true)}><Plus size={14}/> Criar Dor</button>}</div>}</div>
    {createOpen && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><form className="bo-h71-create-modal" onSubmit={(event) => { event.preventDefault(); createPain(); }}><header><div><small>NOVA DOR</small><h2>Registre uma fricção observada</h2><p>Descreva o que dificulta a experiência antes de definir causa, solução ou problema validado.</p></div><button type="button" onClick={() => setCreateOpen(false)}><X size={17}/></button></header><label><span>Nome da Dor</span><input autoFocus value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="Ex.: Não encontrar horário compatível para coleta"/></label><label><span>Descrição <small>opcional</small></span><textarea rows={4} value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="O que está dificultando a experiência?"/></label><footer><button type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={!createTitle.trim()}>Criar e abrir</button></footer></form></div>}
    {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER DOR</small><h2>Remover “{contextEntityTitle(graph.entities?.pain?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações existentes serão desvinculadas do Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removePain(deleteId)}>Remover Dor</button></footer></div></div>}
  </section>;
}

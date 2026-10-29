import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityCanvas } from '../components/entity-editor/EntityCanvas';
import { EntityEditorHeader, EntityTags } from '../components/entity-editor/EntityEditor';
import { parseCustomBlocks, type CustomEntityBlock, type EntityCanvasBlock, type EditorFieldKind } from '../components/entity-editor/types';
import { AlertCircle, Check, CheckCircle2, Filter, Lightbulb, MoreVertical, Plus, Search, Table2, X } from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import { createDiscoveryEntity } from '../services/discovery-workspace';
import { contextEntityTitle, contextEntityUsage, listContextEntities, removeContextEntity } from '../services/context-library';
import {
  buildHypothesisStudioReport,
  hypothesisContextOptions,
  hypothesisEvidenceOptions,
  hypothesisProfileFromEntity,
  updateHypothesisProfile,
  validateHypothesisAsProblem,
  type EvidenceStance,
  type HypothesisConfidence,
  type HypothesisEvidenceLink,
  type HypothesisProfileDraft,
  type HypothesisRisk,
  type ProblemContextKind,
} from '../services/hypotheses-studio';

type DetailTab = 'overview' | 'context' | 'evidence' | 'validation' | 'usage';
type FilterMode = 'all' | 'testing' | 'validated' | 'evidence' | 'incomplete' | 'risk';

const contextLabel: Record<ProblemContextKind, string> = { persona: 'Personas', need: 'Necessidades', job: 'Jobs', pain: 'Dores' };
const confidenceLabel: Record<HypothesisConfidence, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };
const riskLabel: Record<HypothesisRisk, string> = { low: 'Baixo', medium: 'Médio', high: 'Alto' };
const statusLabel = { hypothesis: 'Hipótese', testing: 'Em validação', validated: 'Validada' } as const;
const stanceLabel: Record<EvidenceStance, string> = { supports: 'Sustenta', contradicts: 'Contradiz', neutral: 'Contextual' };

const formatDate = (value: unknown) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

function patchHypothesisMeta(graph: ServiceGraph, hypothesisId: string, owner: string, tags: string[]): ServiceGraph {
  const current = graph.entities?.problemHypothesis?.[hypothesisId];
  if (!current) return graph;
  const now = new Date().toISOString();
  return {
    ...graph,
    service: { ...graph.service, updatedAt: now },
    entities: {
      ...graph.entities,
      problemHypothesis: {
        ...(graph.entities?.problemHypothesis ?? {}),
        [hypothesisId]: { ...current, owner: owner.trim(), tags, updatedAt: now },
      },
    },
  };
}

export function HypothesesView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const hypotheses = useMemo(() => listContextEntities(graph, 'problemHypothesis'), [graph]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [draft, setDraft] = useState<HypothesisProfileDraft | null>(null);
  const [owner, setOwner] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [contextIds, setContextIds] = useState<string[]>([]);
  const [evidenceLinks, setEvidenceLinks] = useState<HypothesisEvidenceLink[]>([]);
  const [customBlocks,setCustomBlocks] = useState<CustomEntityBlock[]>([]);
  const flushRef = useRef<()=>void>(()=>{});
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = selectedId ? graph.entities?.problemHypothesis?.[selectedId] : undefined;
  const report = useMemo(() => selectedId ? buildHypothesisStudioReport(graph, selectedId) : null, [graph, selectedId]);
  const previewReport = useMemo(() => {
    if (!selectedId || !draft) return report;
    const preview = updateHypothesisProfile({ graph, hypothesisId: selectedId, draft, contextIds, evidenceLinks, now: String(selected?.updatedAt ?? graph.service.updatedAt) });
    return buildHypothesisStudioReport(preview, selectedId);
  }, [graph, selectedId, draft, contextIds, evidenceLinks, report, selected?.updatedAt]);
  const contextOptions = useMemo(() => hypothesisContextOptions(graph), [graph]);
  const evidenceOptions = useMemo(() => hypothesisEvidenceOptions(graph), [graph]);

  useEffect(() => {
    if (!selected || !report) {
      setDraft(null); setOwner(''); setTagsText(''); setContextIds([]); setEvidenceLinks([]);setCustomBlocks([]);return;
    }
    setDraft(hypothesisProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setContextIds(report.contextConnections.map((item) => item.id));
    setEvidenceLinks(report.evidenceConnections.map((item) => ({ evidenceId: item.id, stance: item.stance })));
    setCustomBlocks(parseCustomBlocks(selected.canvasCustomBlocks));
  }, [selectedId]);

  useEffect(() => {
    if (sessionStorage.getItem('bo-workspace-create-page') !== 'hypotheses') return;
    sessionStorage.removeItem('bo-workspace-create-page');
    setCreateOpen(true);
  }, []);


  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'hypothesis' || !detail.id) return;
      if (!graph.entities?.problemHypothesis?.[detail.id]) return;
      setSelectedId(detail.id);
      setDetailTab('usage');
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) {
        const detail = JSON.parse(raw) as { kind?: string; id?: string };
        if (detail.kind === 'hypothesis' && detail.id && graph.entities?.problemHypothesis?.[detail.id]) {
          setSelectedId(detail.id); setDetailTab('usage'); sessionStorage.removeItem('bo-service-object-focus');
        }
      }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [graph]);

  const rows = useMemo(() => hypotheses.map((hypothesis) => {
    const hypothesisReport = buildHypothesisStudioReport(graph, hypothesis.id);
    const usage = contextEntityUsage(graph, 'problemHypothesis', hypothesis.id);
    return {
      hypothesis,
      report: hypothesisReport,
      usage,
      title: contextEntityTitle(hypothesis),
      owner: String(hypothesis.owner || 'Você'),
      tags: Array.isArray(hypothesis.tags) && hypothesis.tags.length ? hypothesis.tags.map(String).join(', ') : 'Sem tags',
    };
  }), [graph, hypotheses]);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.title} ${row.owner} ${row.tags} ${String(row.hypothesis.description ?? '')} ${String(row.hypothesis.premise ?? '')}`.toLowerCase();
    if (!haystack.includes(query.trim().toLowerCase())) return false;
    if (filter === 'testing') return row.report?.status === 'testing';
    if (filter === 'validated') return row.report?.status === 'validated';
    if (filter === 'evidence') return (row.report?.evidenceConnections.length ?? 0) > 0;
    if (filter === 'incomplete') return (row.report?.validationScore ?? 0) < 100;
    if (filter === 'risk') return String(row.hypothesis.riskLevel ?? 'medium') === 'high';
    return true;
  }), [rows, query, filter]);

  const openHypothesis = (id: string) => { setSelectedId(id); setDetailTab('overview'); setMenuId(null); };
  const closeHypothesis = (commit=true) => {if(commit)flushRef.current();setSelectedId(null);setDraft(null);setDetailTab('overview'); };
  const createHypothesis = () => {
    if (!createTitle.trim()) return;
    const now = new Date().toISOString();
    const entity = createDiscoveryEntity({ graph, kind: 'problemHypothesis', title: createTitle, description: createDescription, now });
    setGraph((current) => ({
      ...current,
      service: { ...current.service, updatedAt: now },
      entities: {
        ...current.entities,
        problemHypothesis: {
          ...(current.entities?.problemHypothesis ?? {}),
          [entity.id]: { ...entity, confidence: 'medium', riskLevel: 'medium', status: 'hypothesis', hypothesisVersion: 2 },
        },
      },
    }), 'Hipóteses 2.0: criar');
    setCreateOpen(false); setCreateTitle(''); setCreateDescription(''); setSelectedId(entity.id); setDetailTab('overview');
    showToast('Hipótese criada. Conecte contexto e evidências antes de validá-la.');
  };
  const tags=tagsText.split(',').map(x=>x.trim()).filter(Boolean);
  const original=selected?hypothesisProfileFromEntity(selected):null;
  const storedTags=Array.isArray(selected?.tags)?selected.tags.map(String):[];
  const signatures=(links:HypothesisEvidenceLink[])=>links.map(x=>x.evidenceId+':'+x.stance).sort().join('|');
  const sameIds=(a:string[],b:string[])=>[...a].sort().join('|')===[...b].sort().join('|');
  const dirty=Boolean(draft&&original&&(
    (Object.keys(draft) as Array<keyof HypothesisProfileDraft>).some(key=>draft[key].trim()!==original[key].trim())
    ||owner.trim()!==String(selected?.owner??'').trim()
    ||tags.join('|')!==storedTags.join('|')
    ||!sameIds(contextIds,report?.contextConnections.map(x=>x.id)??[])
    ||signatures(evidenceLinks)!==signatures(report?.evidenceConnections.map(x=>({evidenceId:x.id,stance:x.stance}))??[])
    ||JSON.stringify(customBlocks)!==JSON.stringify(parseCustomBlocks(selected?.canvasCustomBlocks))
  ));
  const persistHypothesis=(id:string,data:HypothesisProfileDraft,nextOwner:string,nextTags:string[],contexts:string[],evidences:HypothesisEvidenceLink[],custom:CustomEntityBlock[])=>{
    if(!data.title.trim())return;
    setGraph(current=>{
      const next=patchHypothesisMeta(updateHypothesisProfile({graph:current,hypothesisId:id,draft:data,contextIds:contexts,evidenceLinks:evidences}),id,nextOwner,nextTags);
      const updated=next.entities?.problemHypothesis?.[id];
      if(!updated)return next;
      return {...next,entities:{...next.entities,problemHypothesis:{...next.entities.problemHypothesis,[id]:{...updated,canvasCustomBlocks:custom}}}};
    },'Hipóteses: autosave');
  };
  flushRef.current=()=>{if(selectedId&&draft?.title.trim()&&dirty)persistHypothesis(selectedId,draft,owner,tags,contextIds,evidenceLinks,customBlocks)};
  useEffect(()=>()=>flushRef.current(),[]);
  useEffect(()=>{
    if(!selectedId||!draft?.title.trim()||!dirty)return;
    const timer=window.setTimeout(()=>persistHypothesis(selectedId,draft,owner,tags,contextIds,evidenceLinks,customBlocks),800);
    return()=>window.clearTimeout(timer);
  },[selectedId,draft,owner,tagsText,contextIds,evidenceLinks,customBlocks,dirty]);
  const removeHypothesis = (id: string) => {
    setGraph((current) => removeContextEntity(current, 'problemHypothesis', id), 'Hipóteses 2.0: remover');
    if (selectedId === id) closeHypothesis(false);
    setDeleteId(null); setMenuId(null);
    showToast('Hipótese removida e relações desvinculadas.');
  };
  const toggleContext = (id: string) => setContextIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const toggleEvidence = (id: string) => setEvidenceLinks((current) => current.some((item) => item.evidenceId === id)
    ? current.filter((item) => item.evidenceId !== id)
    : [...current, { evidenceId: id, stance: 'neutral' }]);
  const setStance = (id: string, stance: EvidenceStance) => setEvidenceLinks((current) => current.map((item) => item.evidenceId === id ? { ...item, stance } : item));
  const validateHypothesis = () => {
    if (!selectedId || !draft) return;
    const tags = tagsText.split(',').map((item) => item.trim()).filter(Boolean);
    setGraph((current) => {
      const saved = patchHypothesisMeta(updateHypothesisProfile({ graph: current, hypothesisId: selectedId, draft, contextIds, evidenceLinks }), selectedId, owner, tags);
      const updated=saved.entities?.problemHypothesis?.[selectedId];
      const withCustom=updated?{...saved,entities:{...saved.entities,problemHypothesis:{...saved.entities.problemHypothesis,[selectedId]:{...updated,canvasCustomBlocks:customBlocks}}}}:saved;
      return validateHypothesisAsProblem(withCustom, selectedId);
    }, 'Hipóteses 2.0: validar');
    showToast('Hipótese promovida a Problema validado.');
  };

  const addCustom = (kind:EditorFieldKind)=>{
    if(customBlocks.length>=60){showToast('Limite de 60 campos personalizados por entidade.');return;}
    const labels:Record<EditorFieldKind,string>={text:'Texto',checklist:'Checklist',number:'Número',date:'Data',image:'Imagem (URL)',document:'Documento (link)'};
    const id='custom-'+(typeof crypto!=='undefined'&&'randomUUID' in crypto?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2,7));
    setCustomBlocks(items=>[...items,{id,label:labels[kind],kind,value:''}]);
  };
  const changeCustom=(id:string,value:string)=>setCustomBlocks(items=>items.map(item=>item.id===id?{...item,value}:item));
  const removeCustom=(id:string)=>setCustomBlocks(items=>items.filter(item=>item.id!==id));
  const renameCustom=(id:string,label:string)=>setCustomBlocks(items=>items.map(item=>item.id===id?{...item,label}:item));
  const toggleRelation=(id:string)=>{
    if(hypothesisEvidenceOptions(graph).some(item=>item.id===id))toggleEvidence(id);
    else toggleContext(id);
  };

  if (selected && draft && report) {
    const preview = previewReport ?? report;
    const blocks:EntityCanvasBlock[]=[
      {id:'description',label:'Descrição (por que acreditamos?)',essential:true,value:draft.description,placeholder:'Descreva a hipótese sem apresentá-la como fato confirmado.',onChange:value=>setDraft(current=>current?{...current,description:value}:current)},
      {id:'premise',label:'Premissa',essential:true,value:draft.premise,placeholder:'Que crença precisa ser verdadeira?',onChange:value=>setDraft(current=>current?{...current,premise:value}:current)},
      {id:'expectedBehavior',label:'Comportamento esperado',essential:true,value:draft.expectedBehavior,placeholder:'O que observaríamos se fosse verdadeira?',onChange:value=>setDraft(current=>current?{...current,expectedBehavior:value}:current)},
      {id:'validationCriterion',label:'Critério de validação',value:draft.validationCriterion,placeholder:'O que confirmaria ou refutaria esta hipótese?',onChange:value=>setDraft(current=>current?{...current,validationCriterion:value}:current)},
      {id:'impactIfWrong',label:'Impacto se estiver errada',value:draft.impactIfWrong,placeholder:'Que esforço ou decisão seria afetado?',onChange:value=>setDraft(current=>current?{...current,impactIfWrong:value}:current)},
      ...customBlocks.map(block=>({id:block.id,label:block.label,value:block.value,custom:true,kind:block.kind,placeholder:'Preencha o campo personalizado',onChange:(value:string)=>changeCustom(block.id,value)})),
    ];
    const checks=preview.validationChecks.map(check=>({
      ...check,
      kinds:check.id==='evidence'?['evidence']:check.id==='pain'?['pain']:check.id==='customer-context'?['persona','need','job']:check.id==='support'?['evidence']:undefined,
      fieldId:check.id==='statement'?'description':check.id==='premise'?'premise':check.id==='expected'?'expectedBehavior':check.id==='criterion'?'validationCriterion':undefined,
    }));
    const relations=[
      ...contextOptions.map(item=>({id:item.id,kind:item.kind,title:item.title,linked:contextIds.includes(item.id)})),
      ...evidenceOptions.map(item=>({id:item.id,kind:'evidence',title:item.title,linked:evidenceLinks.some(link=>link.evidenceId===item.id)})),
    ];
    return <section className="bo-h75-hypothesis-detail bo-pain-editor bo-hypothesis-entity-editor" data-hypotheses-h75="detail">
      <EntityEditorHeader kind="Hipóteses" eyebrow={preview.status==='validated'?'HIPÓTESE VALIDADA':preview.status==='testing'?'EM VALIDAÇÃO':'HIPÓTESE DE PROBLEMA'}
        title={draft.title} score={preview.validationScore}
        status={!draft.title.trim()?'invalid':studio.saveStatus==='error'?'error':dirty?'saving':'saved'}
        guidance={draft.title.trim().length<30?'Formule uma hipótese testável: “Acreditamos que [ação] resultará em [resultado] porque [razão]”.':undefined}
        onChangeTitle={value=>setDraft(current=>current?{...current,title:value}:current)}
        onBack={()=>closeHypothesis()} onDelete={()=>setDeleteId(selected.id)}
        properties={<>
          <label>Confiança: <select value={draft.confidence} onChange={e=>setDraft(current=>current?{...current,confidence:e.target.value as HypothesisConfidence}:current)}>{Object.entries(confidenceLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Risco: <select value={draft.riskLevel} onChange={e=>setDraft(current=>current?{...current,riskLevel:e.target.value as HypothesisRisk}:current)}>{Object.entries(riskLabel).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label>Responsável: <input aria-label="Responsável" value={owner} onChange={e=>setOwner(e.target.value)} placeholder="Atribuir responsável"/></label>
          <EntityTags value={tagsText} onChange={setTagsText}/>
        </>}
      />
      <nav className="bo-h71-detail-tabs bo-pain-detail-tabs" aria-label="Detalhes da Hipótese">
        {([['overview','Visão geral'],['context','Contexto'],['evidence','Evidências'],['validation','Validação'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label])=><button key={id} type="button" className={detailTab===id?'is-active':''} onClick={()=>setDetailTab(id)}>{label}{id==='context'&&<b>{contextIds.length}</b>}{id==='evidence'&&<b>{evidenceLinks.length}</b>}{id==='validation'&&<b>{preview.validationScore}%</b>}</button>)}
      </nav>
      {detailTab==='overview'?
        <EntityCanvas entityKey={'hypothesis:'+selected.id} blocks={blocks} checks={checks}
          relations={relations} onToggleRelation={toggleRelation} onAddCustom={addCustom} onRemoveCustom={removeCustom} onRenameCustom={renameCustom}
          onRemoveEntity={()=>setDeleteId(selected.id)}/>
        : <div className="bo-h71-detail-body">
        {detailTab === 'context' && <div><div className="bo-h71-section-intro"><div><small>CONTEXTO</small><h2>Onde esta hipótese acontece?</h2><p>Conecte a hipótese às pessoas, necessidades, Jobs e principalmente à Dor que originou a investigação.</p></div><strong>{contextIds.length} conexão(ões)</strong></div><div className="bo-h71-relation-grid">{(['persona','need','job','pain'] as ProblemContextKind[]).map((kind) => { const options = contextOptions.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{contextLabel[kind]}</strong><span>{options.filter((item) => contextIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={contextIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleContext(item.id)}><b>{contextIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}
        {detailTab === 'evidence' && <div><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que sustenta ou contradiz esta hipótese?</h2><p>Cada evidência deve ter uma posição explícita. Contradição não é erro: ela ajuda a evitar confirmação seletiva.</p></div><strong>{evidenceLinks.length} conectada(s)</strong></div>{evidenceOptions.length ? <div className="bo-h75-evidence-list">{evidenceOptions.map((item) => { const link = evidenceLinks.find((entry) => entry.evidenceId === item.id); return <article key={item.id} className={link ? 'is-linked' : ''}><button type="button" className="bo-h75-evidence-main" onClick={() => toggleEvidence(item.id)}><b>{link ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>{link && <div className="bo-h75-stance">{(['supports','contradicts','neutral'] as EvidenceStance[]).map((stance) => <button key={stance} type="button" className={link.stance === stance ? `is-active is-${stance}` : ''} onClick={() => setStance(item.id, stance)}>{stanceLabel[stance]}</button>)}</div>}</article>; })}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois classifique como sustentação, contradição ou contexto.</p></div>}</div>}
        {detailTab === 'validation' && <div className="bo-h75-validation"><div className="bo-h71-section-intro"><div><small>VALIDAÇÃO</small><h2>A hipótese já pode virar Problema?</h2><p>A promoção só é liberada quando a formulação, contexto e evidências formam uma base coerente.</p></div><strong>{preview.validationScore}%</strong></div><div className="bo-h75-validation-layout"><section><header><strong>Critérios</strong><span>{preview.validationChecks.filter((item) => item.complete).length}/{preview.validationChecks.length}</span></header>{preview.validationChecks.map((item) => <article key={item.id} className={item.complete ? 'is-done' : ''}><b>{item.complete ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}</b><span><strong>{item.label}</strong><small>{item.detail}</small></span></article>)}</section><aside><small>SINAL DAS EVIDÊNCIAS</small><div><span>Sustenta</span><strong>{preview.supportCount}</strong></div><div><span>Contradiz</span><strong>{preview.contradictionCount}</strong></div><div><span>Contextual</span><strong>{preview.neutralCount}</strong></div>{preview.status === 'validated' && preview.validatedProblem ? <div className="bo-h75-validated"><CheckCircle2 size={18}/><span><strong>Problema validado</strong><small>{contextEntityTitle(preview.validatedProblem)}</small></span></div> : <button type="button" className="bo-h75-validate-button" disabled={!preview.readyToValidate} onClick={validateHypothesis}>Validar como Problema</button>}</aside></div></div>}
        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="hypothesis" id={selected.id} title="Uso e relações" />}
      </div>}
      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm" role="alertdialog" aria-modal="true" aria-label="Excluir hipótese"><header><div><small>REMOVER HIPÓTESE</small><h2>Remover “{contextEntityTitle(graph.entities?.problemHypothesis?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>Contextos e evidências serão desvinculados. Problemas já validados permanecem rastreáveis no Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeHypothesis(deleteId)}>Remover Hipótese</button></footer></div></div>}
    </section>;
  }

  return <section className="bo-h75-hypotheses" data-hypotheses-h75="library">
    <div className="bo-h71-page-head"><div><span>Workspace /</span><h1>Hipóteses</h1></div></div>
    <div className="bo-h71-toolbar"><strong>{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</strong><div><label className="bo-h71-search"><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar Hipóteses"/></label><button type="button" className={showFilters ? 'is-active' : ''} onClick={() => setShowFilters((value) => !value)} aria-label="Filtros"><Filter size={16}/></button><button type="button" className="is-active"><Table2 size={16}/><span>Tabela</span></button><button type="button" className="primary" onClick={() => setCreateOpen(true)}><Plus size={16}/> Criar Hipótese</button></div></div>
    {showFilters && <div className="bo-h71-filters"><span>Filtros</span>{([['all','Todas'],['testing','Em validação'],['validated','Validadas'],['evidence','Com evidência'],['incomplete','Base incompleta'],['risk','Alto risco']] as Array<[FilterMode,string]>).map(([id,label]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>}
    <div className="bo-h71-table-wrap"><table className="bo-h71-table bo-h75-table"><thead><tr><th></th><th>HIPÓTESE</th><th>ESTADO</th><th>CONFIANÇA</th><th>ATUALIZADO</th><th>DOR</th><th>EVIDÊNCIAS</th><th>PRONTIDÃO</th><th>USADO EM</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.hypothesis.id}><td className="menu-cell"><button type="button" onClick={() => setMenuId(menuId === row.hypothesis.id ? null : row.hypothesis.id)}><MoreVertical size={15}/></button>{menuId === row.hypothesis.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openHypothesis(row.hypothesis.id)}>Abrir</button><button type="button" className="danger" onClick={() => setDeleteId(row.hypothesis.id)}>Remover</button></div>}</td><td><button type="button" className="bo-h75-name" onClick={() => openHypothesis(row.hypothesis.id)}><span><Lightbulb size={14}/></span><strong>{row.title}</strong></button></td><td><span className={`bo-h75-status is-${row.report?.status ?? 'hypothesis'}`}>{statusLabel[row.report?.status ?? 'hypothesis']}</span></td><td><span className={`bo-h75-confidence is-${String(row.hypothesis.confidence ?? 'medium')}`}>{confidenceLabel[(row.hypothesis.confidence as HypothesisConfidence) || 'medium'] ?? 'Média'}</span></td><td>{formatDate(row.hypothesis.updatedAt ?? row.hypothesis.createdAt)}</td><td>{row.report?.contextCounts.pain ?? 0}</td><td>{row.report?.evidenceConnections.length ?? 0}</td><td><span className="bo-h75-score">{row.report?.validationScore ?? 0}%</span></td><td><span className="bo-h71-usage-pill">{row.usage.instances || row.usage.relatedCount ? `${row.usage.instances} visual · ${row.usage.relatedCount} relação` : 'Não usada'}</span></td></tr>)}</tbody></table>{!filtered.length && <div className="bo-h71-empty"><Lightbulb size={26}/><strong>{query || filter !== 'all' ? 'Nenhuma Hipótese encontrada' : 'Nenhuma Hipótese criada'}</strong><p>{query || filter !== 'all' ? 'Ajuste a busca ou os filtros.' : 'Formule uma explicação provisória para uma Dor e teste-a com evidências.'}</p>{!query && filter === 'all' && <button type="button" onClick={() => setCreateOpen(true)}><Plus size={14}/> Criar Hipótese</button>}</div>}</div>
    {createOpen && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><form className="bo-h71-create-modal" onSubmit={(event) => { event.preventDefault(); createHypothesis(); }}><header><div><small>NOVA HIPÓTESE</small><h2>Formule algo que possa ser refutado</h2><p>Parta de uma Dor observada e registre uma explicação provisória — ainda não um fato ou solução.</p></div><button type="button" onClick={() => setCreateOpen(false)}><X size={17}/></button></header><label><span>Hipótese</span><input autoFocus value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="Ex.: O deslocamento é a principal causa do abandono"/></label><label><span>Descrição <small>opcional</small></span><textarea rows={4} value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="Por que acreditamos nisso e o que esperamos observar?"/></label><footer><button type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={!createTitle.trim()}>Criar e abrir</button></footer></form></div>}
    {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER HIPÓTESE</small><h2>Remover “{contextEntityTitle(graph.entities?.problemHypothesis?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações existentes serão desvinculadas do Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeHypothesis(deleteId)}>Remover Hipótese</button></footer></div></div>}
  </section>;
}

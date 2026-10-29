import { useEffect, useMemo, useRef, useState } from 'react';
import { EntityInlineCanvas, type EntityInlineBlock } from '../components/EntityInlineCanvas';
import { AlertCircle, ArrowLeft, Check, CheckCircle2, Filter, Lightbulb, MoreVertical, Plus, Search, Table2, Trash2, X } from '../design-system/icons';
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
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const flushRef = useRef<() => void>(() => {});

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
      setDraft(null); setOwner(''); setTagsText(''); setContextIds([]); setEvidenceLinks([]); return;
    }
    setDraft(hypothesisProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setContextIds(report.contextConnections.map((item) => item.id));
    setEvidenceLinks(report.evidenceConnections.map((item) => ({ evidenceId: item.id, stance: item.stance })));
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
  const closeHypothesis = (commit = true) => { if (commit) flushRef.current(); setSelectedId(null); setDraft(null); setDetailTab('overview'); };
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
  const tags = tagsText.split(',').map(item => item.trim()).filter(Boolean);
  const original = selected ? hypothesisProfileFromEntity(selected) : null;
  const oldTags = Array.isArray(selected?.tags) ? selected.tags.map(String) : [];
  const sameIds = (a: string[],b: string[]) => [...a].sort().join('|') === [...b].sort().join('|');
  const linkSignature = (links: HypothesisEvidenceLink[]) => links.map(item => item.evidenceId + ':' + item.stance).sort().join('|');
  const dirty = Boolean(draft && original && (
    (Object.keys(draft) as Array<keyof HypothesisProfileDraft>).some(key => draft[key].trim() !== original[key].trim())
    || owner.trim() !== String(selected?.owner ?? '').trim()
    || tags.join('|') !== oldTags.join('|')
    || !sameIds(contextIds, report?.contextConnections.map(item=>item.id) ?? [])
    || linkSignature(evidenceLinks) !== linkSignature(report?.evidenceConnections.map(item=>({evidenceId:item.id, stance:item.stance})) ?? [])
  ));
  const persist = (id: string, value: HypothesisProfileDraft, nextOwner: string, nextTags: string[], linked: string[], links: HypothesisEvidenceLink[]) => {
    if (!value.title.trim()) return;
    setGraph(current => patchHypothesisMeta(updateHypothesisProfile({
      graph: current, hypothesisId: id, draft: value, contextIds: linked, evidenceLinks: links,
    }), id, nextOwner, nextTags), 'Hipóteses: autosave');
  };
  flushRef.current = () => {
    if (selectedId && draft?.title.trim() && dirty) persist(selectedId,draft,owner,tags,contextIds,evidenceLinks);
  };
  useEffect(() => () => flushRef.current(), []);
  useEffect(() => {
    if (!selectedId || !draft?.title.trim() || !dirty) return;
    const timer = window.setTimeout(() => persist(selectedId,draft,owner,tags,contextIds,evidenceLinks), 800);
    return () => window.clearTimeout(timer);
  }, [selectedId,draft,owner,tagsText,contextIds,evidenceLinks,dirty]);
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
      return validateHypothesisAsProblem(saved, selectedId);
    }, 'Hipóteses 2.0: validar');
    showToast('Hipótese promovida a Problema validado.');
  };

  if (selected && draft && report) {
    const preview = previewReport ?? report;
    const blocks: EntityInlineBlock[] = [
      {id:'description',label:'Descrição (por que acreditamos nisso?)',value:draft.description,essential:true,wide:true,placeholder:'Explique a lógica da hipótese sem tratá-la como fato confirmado.',onChange:value=>setDraft(current=>current?{...current,description:value}:current)},
      {id:'premise',label:'Premissa',value:draft.premise,essential:true,placeholder:'Que crença precisa ser verdadeira?',onChange:value=>setDraft(current=>current?{...current,premise:value}:current)},
      {id:'expectedBehavior',label:'Comportamento esperado',value:draft.expectedBehavior,essential:true,placeholder:'O que deveríamos observar se estivesse correta?',onChange:value=>setDraft(current=>current?{...current,expectedBehavior:value}:current)},
      {id:'validationCriterion',label:'Critério de validação',value:draft.validationCriterion,placeholder:'Que resultado aceitaria ou rejeitaria a hipótese?',onChange:value=>setDraft(current=>current?{...current,validationCriterion:value}:current)},
      {id:'impactIfWrong',label:'Impacto se estiver errada',value:draft.impactIfWrong,placeholder:'Qual decisão ou esforço pode ser desperdiçado?',onChange:value=>setDraft(current=>current?{...current,impactIfWrong:value}:current)},
    ];
    const guidance = draft.title.trim().length < 30 || !/\b(que|porque|result|quando|se|causa|devido|aument|reduz)\b/i.test(draft.title);
    return <section className="bo-h75-hypothesis-detail bo-entity-inline-detail bo-hyp-inline" data-hypotheses-h75="detail">
      <header className="bo-hyp-inline-header">
        <div className="bo-hyp-inline-top">
          <button type="button" className="bo-hyp-inline-back" onClick={()=>closeHypothesis()}><ArrowLeft size={15}/> Hipóteses</button>
          <div className="bo-hyp-inline-top-actions">
            <span className="bo-hyp-inline-save" role="status" aria-live="polite">{!draft.title.trim()?'Enunciado obrigatório':dirty?'Salvando…':studio.saveStatus==='error'?'Erro ao salvar':<><Check size={13}/> Salvo</>}</span>
            <span className="bo-hyp-inline-ready">Prontidão: <b>{preview.validationScore}%</b></span>
            <button type="button" className="bo-hyp-inline-delete" onClick={()=>setDeleteId(selected.id)}><Trash2 size={14}/> Excluir</button>
          </div>
        </div>
        <div className="bo-hyp-inline-statement"><span className="bo-hyp-inline-icon"><Lightbulb size={19}/></span>
          <textarea aria-label="Enunciado da hipótese" rows={1} value={draft.title} onChange={event=>setDraft(current=>current?{...current,title:event.target.value}:current)} placeholder="Acreditamos que..."/>
        </div>
        {guidance&&<p className="bo-hyp-inline-guidance"><AlertCircle size={15}/> Esta hipótese parece incompleta. Experimente: “Acreditamos que [ação] resultará em [resultado] porque [razão]”.</p>}
        <div className="bo-hyp-inline-properties">
          <label>Confiança: <select value={draft.confidence} onChange={event=>setDraft(current=>current?{...current,confidence:event.target.value as HypothesisConfidence}:current)}>{Object.entries(confidenceLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label>Risco: <select value={draft.riskLevel} onChange={event=>setDraft(current=>current?{...current,riskLevel:event.target.value as HypothesisRisk}:current)}>{Object.entries(riskLabel).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label>Responsável: <input value={owner} onChange={event=>setOwner(event.target.value)} placeholder="Adicionar responsável"/></label>
          <label>Tags: <input value={tagsText} onChange={event=>setTagsText(event.target.value)} placeholder="+ Adicionar tags"/></label>
        </div>
      </header>
      <nav className="bo-h71-detail-tabs bo-hyp-inline-tabs" aria-label="Detalhes da Hipótese">
        {([['overview','Visão geral'],['context','Contexto'],['evidence','Evidências'],['validation','Validação'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label]) => <button key={id} type="button" className={detailTab===id?'is-active':''} onClick={()=>setDetailTab(id)}>{label}{id==='context'&&<b>{contextIds.length}</b>}{id==='evidence'&&<b>{evidenceLinks.length}</b>}</button>)}
      </nav>
      {detailTab==='overview'
        ? <EntityInlineCanvas entityId={selected.id} kind="hypothesis" blocks={blocks}
            criteria={preview.validationChecks.map(item=>({...item,relationKinds:item.id==='evidence'?['evidence']:item.id==='pain'?['pain']:item.id==='customer-context'?['persona','need','job']:undefined}))}
            relations={[
              ...contextOptions.map(item=>({id:item.id,kind:item.kind,title:item.title,linked:contextIds.includes(item.id)})),
              ...evidenceOptions.map(item=>({id:item.id,kind:'evidence',title:item.title,linked:evidenceLinks.some(link=>link.evidenceId===item.id)})),
            ]}
            onToggleRelation={id=>evidenceOptions.some(item=>item.id===id)?toggleEvidence(id):toggleContext(id)}
            onViewValidation={()=>setDetailTab('validation')}
          />
        : <div className="bo-h71-detail-body bo-hyp-inline-secondary">
        {detailTab === 'context' && <div><div className="bo-h71-section-intro"><div><small>CONTEXTO</small><h2>Onde esta hipótese acontece?</h2><p>Conecte a hipótese às pessoas, necessidades, Jobs e principalmente à Dor que originou a investigação.</p></div><strong>{contextIds.length} conexão(ões)</strong></div><div className="bo-h71-relation-grid">{(['persona','need','job','pain'] as ProblemContextKind[]).map((kind) => { const options = contextOptions.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{contextLabel[kind]}</strong><span>{options.filter((item) => contextIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={contextIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleContext(item.id)}><b>{contextIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}
        {detailTab === 'evidence' && <div><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que sustenta ou contradiz esta hipótese?</h2><p>Cada evidência deve ter uma posição explícita. Contradição não é erro: ela ajuda a evitar confirmação seletiva.</p></div><strong>{evidenceLinks.length} conectada(s)</strong></div>{evidenceOptions.length ? <div className="bo-h75-evidence-list">{evidenceOptions.map((item) => { const link = evidenceLinks.find((entry) => entry.evidenceId === item.id); return <article key={item.id} className={link ? 'is-linked' : ''}><button type="button" className="bo-h75-evidence-main" onClick={() => toggleEvidence(item.id)}><b>{link ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>{link && <div className="bo-h75-stance">{(['supports','contradicts','neutral'] as EvidenceStance[]).map((stance) => <button key={stance} type="button" className={link.stance === stance ? `is-active is-${stance}` : ''} onClick={() => setStance(item.id, stance)}>{stanceLabel[stance]}</button>)}</div>}</article>; })}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois classifique como sustentação, contradição ou contexto.</p></div>}</div>}
        {detailTab === 'validation' && <div className="bo-h75-validation"><div className="bo-h71-section-intro"><div><small>VALIDAÇÃO</small><h2>A hipótese já pode virar Problema?</h2><p>A promoção só é liberada quando a formulação, contexto e evidências formam uma base coerente.</p></div><strong>{preview.validationScore}%</strong></div><div className="bo-h75-validation-layout"><section><header><strong>Critérios</strong><span>{preview.validationChecks.filter((item) => item.complete).length}/{preview.validationChecks.length}</span></header>{preview.validationChecks.map((item) => <article key={item.id} className={item.complete ? 'is-done' : ''}><b>{item.complete ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}</b><span><strong>{item.label}</strong><small>{item.detail}</small></span></article>)}</section><aside><small>SINAL DAS EVIDÊNCIAS</small><div><span>Sustenta</span><strong>{preview.supportCount}</strong></div><div><span>Contradiz</span><strong>{preview.contradictionCount}</strong></div><div><span>Contextual</span><strong>{preview.neutralCount}</strong></div>{preview.status === 'validated' && preview.validatedProblem ? <div className="bo-h75-validated"><CheckCircle2 size={18}/><span><strong>Problema validado</strong><small>{contextEntityTitle(preview.validatedProblem)}</small></span></div> : <button type="button" className="bo-h75-validate-button" disabled={!preview.readyToValidate} onClick={validateHypothesis}>Validar como Problema</button>}</aside></div></div>}
        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="hypothesis" id={selected.id} title="Uso e relações" />}
        </div>}
      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER HIPÓTESE</small><h2>Remover “{contextEntityTitle(graph.entities?.problemHypothesis?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>Contextos e evidências serão desvinculados. Problemas já validados permanecem rastreáveis no Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeHypothesis(deleteId)}>Remover Hipótese</button></footer></div></div>}
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

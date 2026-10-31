import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, Database, FileCheck2, Filter, Link2, MoreVertical, Plus, Search,
  ShieldCheck, Table2, Trash2, X,
} from '../design-system/icons';
import { makeId } from '../domain/graph-operations';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import { contextEntityTitle, contextEntityUsage, listContextEntities, removeContextEntity } from '../services/context-library';
import {
  buildEvidenceStudioReport,
  createEvidenceRecord,
  evidenceProfileFromEntity,
  evidenceRelationOptions,
  updateEvidenceProfile,
  type EvidenceProfileDraft,
  type EvidenceRelationKind,
  type EvidenceSourceType,
} from '../services/evidence-studio';
import type { EvidenceConfidence, EvidenceStance } from '../services/problem-evidence-studio';

type DetailTab = 'overview' | 'source' | 'relations' | 'decisions' | 'usage';
type FilterMode = 'all' | 'high' | 'traceable' | 'hypotheses' | 'contradictions' | 'unlinked';

const relationLabel: Record<EvidenceRelationKind, string> = {
  persona: 'Personas', need: 'Necessidades', job: 'Jobs', pain: 'Dores', problemHypothesis: 'Hipóteses', problem: 'Problemas',
};
const sourceLabel: Record<EvidenceSourceType, string> = {
  interview: 'Entrevista', observation: 'Observação', survey: 'Pesquisa / survey', analytics: 'Dados / analytics',
  document: 'Documento', support: 'Atendimento / suporte', experiment: 'Experimento', other: 'Outra fonte',
};
const confidenceLabel: Record<EvidenceConfidence, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };
const formatDate = (value: unknown) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function EvidenceView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const evidences = useMemo(() => listContextEntities(graph, 'evidence'), [graph]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [draft, setDraft] = useState<EvidenceProfileDraft | null>(null);
  const [owner, setOwner] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [relationStances, setRelationStances] = useState<Record<string, EvidenceStance>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createSourceType, setCreateSourceType] = useState<EvidenceSourceType>('observation');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selected = selectedId ? graph.entities?.evidence?.[selectedId] : undefined;
  const report = useMemo(() => selectedId ? buildEvidenceStudioReport(graph, selectedId) : null, [graph, selectedId]);
  const relationOptions = useMemo(() => evidenceRelationOptions(graph), [graph]);
  const previewReport = useMemo(() => {
    if (!selectedId || !draft) return report;
    const preview = updateEvidenceProfile({
      graph, evidenceId: selectedId, draft, connectedIds, relationStances, owner,
      tags: tagsText.split(',').map((item) => item.trim()).filter(Boolean),
      now: String(selected?.updatedAt ?? graph.service.updatedAt),
    });
    return buildEvidenceStudioReport(preview, selectedId);
  }, [graph, selectedId, draft, connectedIds, relationStances, owner, tagsText, report, selected?.updatedAt]);

  useEffect(() => {
    if (!selected || !report) {
      setDraft(null); setOwner(''); setTagsText(''); setConnectedIds([]); setRelationStances({}); return;
    }
    setDraft(evidenceProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
    setRelationStances(Object.fromEntries(report.connections.filter((item) => item.stance).map((item) => [item.id, item.stance as EvidenceStance])));
  }, [selectedId, selected?.updatedAt]);


  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'evidence' || !detail.id) return;
      if (!graph.entities?.evidence?.[detail.id]) return;
      setSelectedId(detail.id);
      setDetailTab('usage');
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) {
        const detail = JSON.parse(raw) as { kind?: string; id?: string };
        if (detail.kind === 'evidence' && detail.id && graph.entities?.evidence?.[detail.id]) {
          setSelectedId(detail.id); setDetailTab('usage'); sessionStorage.removeItem('bo-service-object-focus');
        }
      }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [graph]);

  const rows = useMemo(() => evidences.map((evidence) => {
    const itemReport = buildEvidenceStudioReport(graph, evidence.id);
    return {
      evidence,
      report: itemReport,
      usage: contextEntityUsage(graph, 'evidence', evidence.id),
      title: contextEntityTitle(evidence),
      owner: String(evidence.owner || 'Você'),
      tags: Array.isArray(evidence.tags) && evidence.tags.length ? evidence.tags.map(String).join(', ') : 'Sem tags',
    };
  }), [graph, evidences]);

  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.title} ${row.owner} ${row.tags} ${String(row.evidence.description ?? '')} ${String(row.evidence.sourceName ?? '')} ${String(row.evidence.method ?? '')}`.toLowerCase();
    if (!haystack.includes(query.trim().toLowerCase())) return false;
    if (filter === 'high') return String(row.evidence.confidence ?? 'medium') === 'high';
    if (filter === 'traceable') return Boolean(String(row.evidence.sourceName ?? '').trim() && String(row.evidence.collectedAt ?? '').trim());
    if (filter === 'hypotheses') return (row.report?.connectionCounts.problemHypothesis ?? 0) > 0;
    if (filter === 'contradictions') return (row.report?.contradictionCount ?? 0) > 0;
    if (filter === 'unlinked') return (row.report?.connections.length ?? 0) === 0;
    return true;
  }), [rows, query, filter]);

  const openEvidence = (id: string) => { setSelectedId(id); setDetailTab('overview'); setMenuId(null); };
  const closeEvidence = () => { setSelectedId(null); setDraft(null); setDetailTab('overview'); };
  const openCreate = () => { setCreateTitle(''); setCreateDescription(''); setCreateSourceType('observation'); setCreateOpen(true); };
  const createEvidence = () => {
    if (!createTitle.trim()) return;
    const newId = makeId('evidence');
    setGraph((current) => createEvidenceRecord({ graph: current, id: newId, title: createTitle, description: createDescription, sourceType: createSourceType }).graph, 'Evidências 2.0: criar');
    setCreateOpen(false);
    openEvidence(newId);
    showToast('Evidência criada. Complete a origem e conecte ao contexto.');
  };
  const saveEvidence = () => {
    if (!selectedId || !draft?.title.trim()) return;
    const tags = tagsText.split(',').map((item) => item.trim()).filter(Boolean);
    setGraph((current) => updateEvidenceProfile({ graph: current, evidenceId: selectedId, draft, connectedIds, relationStances, owner, tags }), 'Evidências 2.0: salvar');
    showToast('Evidência salva.');
  };
  const discardEvidence = () => {
    if (!selected || !report) return;
    setDraft(evidenceProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
    setRelationStances(Object.fromEntries(report.connections.filter((item) => item.stance).map((item) => [item.id, item.stance as EvidenceStance])));
    showToast('Alterações descartadas.');
  };
  const removeEvidence = (id: string) => {
    setGraph((current) => removeContextEntity(current, 'evidence', id), 'Evidências 2.0: remover');
    if (selectedId === id) closeEvidence();
    setDeleteId(null); setMenuId(null);
    showToast('Evidência removida e relações desvinculadas.');
  };
  const toggleRelation = (id: string) => {
    setConnectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const setStance = (id: string, stance: EvidenceStance) => {
    setConnectedIds((current) => current.includes(id) ? current : [...current, id]);
    setRelationStances((current) => ({ ...current, [id]: stance }));
  };

  if (selected && draft && report) {
    const preview = previewReport ?? report;
    const contexts = relationOptions.filter((item) => ['persona', 'need', 'job', 'pain'].includes(item.kind));
    const decisions = relationOptions.filter((item) => item.kind === 'problemHypothesis' || item.kind === 'problem');
    return <section className="bo-h77-evidence" data-evidence-h77="detail">
      <div className="bo-h71-detail-head">
        <button type="button" className="bo-h71-back" onClick={closeEvidence}><ArrowLeft size={16}/> Evidências</button>
        <div className="bo-h71-detail-title"><span className="bo-h77-evidence-icon"><FileCheck2 size={17}/></span><div><small>EVIDÊNCIA</small><h1>{draft.title || 'Sem título'}</h1><p>Registre o que foi observado, preserve a origem e deixe explícito como isso influencia decisões.</p></div></div>
        <div className="bo-h77-score"><small>QUALIDADE</small><strong>{preview?.qualityScore ?? 0}%</strong><span>{preview?.readyForDecision ? 'Pronta para decisão' : 'Rastreabilidade incompleta'}</span></div>
      </div>
      <nav className="bo-h71-detail-tabs">{([['overview','Visão geral'],['source','Fonte'],['relations','Contexto'],['decisions','Hipóteses e Problemas'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label]) => <button key={id} type="button" className={detailTab === id ? 'is-active' : ''} onClick={() => setDetailTab(id)}>{label}{id === 'decisions' && <b>{(preview?.connectionCounts.problemHypothesis ?? 0) + (preview?.connectionCounts.problem ?? 0)}</b>}</button>)}</nav>
      <div className="bo-h71-detail-body">
        {detailTab === 'overview' && <div className="bo-h77-overview-grid">
          <section className="bo-h71-editor-card"><header><div><small>REGISTRO OBSERVÁVEL</small><strong>Fato primeiro, interpretação depois</strong></div><span>{sourceLabel[draft.sourceType]}</span></header><div className="bo-h71-form"><label><span>Título da evidência</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })}/></label><label><span>O que foi observado?</span><textarea rows={7} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Descreva o dado, comportamento, fala ou ocorrência sem transformar a observação em solução."/></label><label><span>Interpretação <small>opcional</small></span><textarea rows={5} value={draft.interpretation} onChange={(event) => setDraft({ ...draft, interpretation: event.target.value })} placeholder="O que isso pode significar? Mantenha separado do fato observado."/></label><label><span>Responsável</span><input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Quem registrou ou valida esta evidência?"/></label><label><span>Tags <small>separadas por vírgula</small></span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="checkout, onboarding, pesquisa"/></label></div></section>
          <aside className="bo-h77-side"><section><small>CONFIANÇA</small><strong>{confidenceLabel[draft.confidence]}</strong><p>A confiança não substitui a origem. Ela registra quão robusta esta evidência parece diante do método e da amostra.</p></section><section><small>QUALIDADE DETERMINÍSTICA</small>{preview?.qualityChecks.map((item) => <div key={item.id} className={item.complete ? 'is-complete' : ''}><b>{item.complete ? <Check size={11}/> : '·'}</b><span>{item.label}</span></div>)}</section></aside>
        </div>}

        {detailTab === 'source' && <div className="bo-h77-source-grid"><section className="bo-h71-editor-card"><header><div><small>PROVENIÊNCIA</small><strong>De onde isso veio?</strong></div><Database size={16}/></header><div className="bo-h77-source-form"><label><span>Tipo de fonte</span><select value={draft.sourceType} onChange={(event) => setDraft({ ...draft, sourceType: event.target.value as EvidenceSourceType })}>{Object.entries(sourceLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>Confiança</span><select value={draft.confidence} onChange={(event) => setDraft({ ...draft, confidence: event.target.value as EvidenceConfidence })}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></select></label><label className="wide"><span>Origem / referência</span><input value={draft.sourceName} onChange={(event) => setDraft({ ...draft, sourceName: event.target.value })} placeholder="Ex.: Entrevista #12, GA4 checkout, ticket SUP-482, relatório NPS Q3"/></label><label><span>Método de coleta</span><input value={draft.method} onChange={(event) => setDraft({ ...draft, method: event.target.value })} placeholder="Entrevista semiestruturada, análise de funil..."/></label><label><span>Data de coleta</span><input type="date" value={draft.collectedAt} onChange={(event) => setDraft({ ...draft, collectedAt: event.target.value })}/></label><label className="wide"><span>Amostra / contexto</span><input value={draft.sample} onChange={(event) => setDraft({ ...draft, sample: event.target.value })} placeholder="Ex.: 8 clientes novos, dados dos últimos 30 dias, loja Centro"/></label></div></section><section className="bo-h77-trace-card"><ShieldCheck size={22}/><div><small>REGRA DE EVIDÊNCIA</small><strong>Rastreável antes de convincente</strong><p>Uma evidência forte precisa permitir que outra pessoa entenda o que foi observado, onde, quando e por qual método.</p></div></section></div>}

        {detailTab === 'relations' && <div><div className="bo-h71-section-intro"><div><small>CONTEXTO DISCOVERY</small><h2>Onde esta evidência se aplica?</h2><p>Conecte a evidência às pessoas, necessidades, Jobs e dores que delimitam o contexto da observação.</p></div><strong>{contexts.filter((item) => connectedIds.includes(item.id)).length} conectada(s)</strong></div><div className="bo-h71-relation-grid">{(['persona','need','job','pain'] as EvidenceRelationKind[]).map((kind) => { const items = contexts.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{items.filter((item) => connectedIds.includes(item.id)).length}/{items.length}</span></header>{items.length ? <div>{items.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item disponível.</p>}</section>; })}</div></div>}

        {detailTab === 'decisions' && <div><div className="bo-h71-section-intro"><div><small>USO DECISÓRIO</small><h2>O que esta evidência sustenta ou contradiz?</h2><p>A relação não é apenas “vinculado”. Em Hipóteses e Problemas, registre a direção do sinal: sustenta, contradiz ou apenas contextualiza.</p></div><strong>{decisions.filter((item) => connectedIds.includes(item.id)).length} conexão(ões)</strong></div><div className="bo-h77-decision-list">{decisions.length ? decisions.map((item) => { const linked = connectedIds.includes(item.id); const stance = relationStances[item.id] ?? 'neutral'; return <article key={`${item.kind}-${item.id}`} className={linked ? `is-linked is-${stance}` : ''}><button type="button" className="bo-h77-decision-main" onClick={() => toggleRelation(item.id)}><b>{linked ? <Check size={12}/> : <Plus size={12}/>}</b><span><small>{relationLabel[item.kind]}</small><strong>{item.title}</strong><em>{item.description || 'Sem descrição'}</em></span></button><div className="bo-h77-stance"><button type="button" className={linked && stance === 'supports' ? 'is-active supports' : ''} onClick={() => setStance(item.id,'supports')}>Sustenta</button><button type="button" className={linked && stance === 'contradicts' ? 'is-active contradicts' : ''} onClick={() => setStance(item.id,'contradicts')}>Contradiz</button><button type="button" className={linked && stance === 'neutral' ? 'is-active neutral' : ''} onClick={() => setStance(item.id,'neutral')}>Contextual</button></div></article>; }) : <div className="bo-h71-empty-inline"><strong>Nenhuma Hipótese ou Problema disponível</strong><p>Crie Hipóteses a partir das Dores; Problemas surgem quando uma Hipótese é validada.</p></div>}</div>{preview && <div className="bo-h77-signal-summary"><article><span>SUSTENTA</span><strong>{preview.supportCount}</strong></article><article><span>CONTRADIZ</span><strong>{preview.contradictionCount}</strong></article><article><span>CONTEXTUAL</span><strong>{preview.contextualCount}</strong></article></div>}</div>}

        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="evidence" id={selected.id} title="Uso e relações" />}
      </div>
      <div className="bo-h71-detail-actions"><button type="button" className="danger" onClick={() => setDeleteId(selected.id)}><Trash2 size={13}/> Remover</button><span/><button type="button" onClick={discardEvidence}>Descartar</button><button type="button" className="primary" disabled={!draft.title.trim()} onClick={saveEvidence}>Salvar evidência</button></div>
      {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER EVIDÊNCIA</small><h2>Remover “{contextEntityTitle(graph.entities?.evidence?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações com Hipóteses, Problemas e demais objetos serão desvinculadas. A evidência deixará de participar dos scores e validações que a utilizam.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeEvidence(deleteId)}>Remover Evidência</button></footer></div></div>}
    </section>;
  }

  return <section className="bo-h77-evidence" data-evidence-h77="library">
    <div className="bo-h71-page-head bo-ui-list-page-head"><div><span>Workspace /</span><h1>Evidências</h1></div><p>Informações observadas que sustentam decisões sobre o serviço.</p></div>
    <div className="bo-h71-toolbar"><strong>{filtered.length} {filtered.length === 1 ? 'evidência' : 'evidências'}</strong><div><label className="bo-h71-search"><Search size={14}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar evidências"/></label><button type="button" className={showFilters ? 'is-active' : ''} onClick={() => setShowFilters((value) => !value)}><Filter size={14}/></button><button type="button" className="is-active"><Table2 size={14}/> Tabela</button><button type="button" className="primary" onClick={openCreate}><Plus size={14}/> Criar evidência</button></div></div>
    {showFilters && <div className="bo-h71-filters"><span>Filtros rápidos</span>{([['all','Todas'],['high','Alta confiança'],['traceable','Origem rastreável'],['hypotheses','Em hipóteses'],['contradictions','Contradições'],['unlinked','Sem relações']] as Array<[FilterMode,string]>).map(([id,label]) => <button key={id} type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)}>{label}</button>)}</div>}
    <div className="bo-h71-table-wrap">{filtered.length > 0 && <table className="bo-h71-table bo-h77-table"><thead><tr><th>EVIDÊNCIA</th><th>TIPO</th><th>CONFIANÇA</th><th>QUALIDADE</th><th>RELAÇÕES</th><th>USO</th><th>ATUALIZADO</th><th>AÇÕES</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.evidence.id}><td><button type="button" className="bo-h77-evidence-name" onClick={() => openEvidence(row.evidence.id)}><span><FileCheck2 size={13}/></span><strong>{row.title}</strong></button></td><td>{sourceLabel[(row.evidence.sourceType as EvidenceSourceType) || 'observation'] ?? 'Outra fonte'}</td><td><span className={`bo-h77-confidence is-${String(row.evidence.confidence ?? 'medium')}`}>{confidenceLabel[(row.evidence.confidence as EvidenceConfidence) || 'medium'] ?? 'Média'}</span></td><td><span className={`bo-h77-quality ${row.report?.readyForDecision ? 'is-ready' : ''}`}>{row.report?.qualityScore ?? 0}%</span></td><td><span className="bo-h77-link-count"><Link2 size={11}/>{row.report?.connections.length ?? 0}</span></td><td><span className="bo-h71-usage-pill">{row.usage.instances ? `${row.usage.instances} instância(s)` : row.report?.connectionCounts.problemHypothesis ? 'Discovery' : 'Não usada'}</span></td><td>{formatDate(row.evidence.updatedAt ?? row.evidence.createdAt)}</td><td className="menu-cell" aria-label="Ações"><button type="button" onClick={() => setMenuId(menuId === row.evidence.id ? null : row.evidence.id)}><MoreVertical size={15}/></button>{menuId === row.evidence.id && <div className="bo-h71-row-menu"><button type="button" onClick={() => openEvidence(row.evidence.id)}>Abrir</button><button type="button" className="danger" onClick={() => setDeleteId(row.evidence.id)}>Remover</button></div>}</td></tr>)}</tbody></table>}{!filtered.length && <div className="bo-h71-empty"><FileCheck2 size={25}/><strong>{query || filter !== 'all' ? 'Nenhuma evidência encontrada' : 'Nenhuma evidência registrada'}</strong><p>{query || filter !== 'all' ? 'Ajuste a busca ou os filtros.' : 'Registre observações, entrevistas ou dados antes de transformá-los em conclusões.'}</p>{!query && filter === 'all' && <button type="button" onClick={openCreate}><Plus size={14}/> Criar evidência</button>}</div>}</div>

    {createOpen && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCreateOpen(false); }}><form className="bo-h71-create-modal" onSubmit={(event) => { event.preventDefault(); createEvidence(); }}><header><div><small>NOVA EVIDÊNCIA</small><h2>Registre o que foi observado</h2><p>Comece pelo fato. Origem, método, confiança e relações podem ser refinados no detalhe.</p></div><button type="button" onClick={() => setCreateOpen(false)}><X size={17}/></button></header><label><span>Título</span><input autoFocus value={createTitle} onChange={(event) => setCreateTitle(event.target.value)} placeholder="Ex.: 6 de 8 entrevistados abandonam após ver o prazo"/></label><label><span>Observação</span><textarea rows={4} value={createDescription} onChange={(event) => setCreateDescription(event.target.value)} placeholder="O que foi visto, ouvido ou medido?"/></label><label><span>Tipo de fonte</span><select className="bo-h77-create-select" value={createSourceType} onChange={(event) => setCreateSourceType(event.target.value as EvidenceSourceType)}>{Object.entries(sourceLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><footer><button type="button" onClick={() => setCreateOpen(false)}>Cancelar</button><button type="submit" className="primary" disabled={!createTitle.trim()}>Criar e abrir</button></footer></form></div>}
    {deleteId && <div className="bo-h71-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteId(null); }}><div className="bo-h71-confirm"><header><div><small>REMOVER EVIDÊNCIA</small><h2>Remover “{contextEntityTitle(graph.entities?.evidence?.[deleteId])}”?</h2></div><button type="button" onClick={() => setDeleteId(null)}><X size={16}/></button></header><p>As relações e participações em Hipóteses/Problemas serão limpas para preservar a consistência do Service Graph.</p><footer><button type="button" onClick={() => setDeleteId(null)}>Cancelar</button><button type="button" className="danger" onClick={() => removeEvidence(deleteId)}>Remover Evidência</button></footer></div></div>}
  </section>;
}

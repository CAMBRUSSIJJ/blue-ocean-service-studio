import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Filter, HeartCrack, MoreVertical, Plus, Search, Table2, Trash2, X } from '../design-system/icons';
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
      setDraft(null); setOwner(''); setTagsText(''); setConnectedIds([]); return;
    }
    setDraft(painProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
  }, [selectedId, selected?.updatedAt]);

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
  const closePain = () => { setSelectedId(null); setDraft(null); setDetailTab('overview'); };
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
  const savePain = () => {
    if (!selectedId || !draft?.title.trim()) return;
    const tags = tagsText.split(',').map((item) => item.trim()).filter(Boolean);
    setGraph((current) => patchPainMeta(updatePainProfile({ graph: current, painId: selectedId, draft, connectedIds }), selectedId, owner, tags), 'Dores 2.0: salvar');
    showToast('Dor salva.');
  };
  const discardPain = () => {
    if (!selected || !report) return;
    setDraft(painProfileFromEntity(selected));
    setOwner(String(selected.owner ?? ''));
    setTagsText(Array.isArray(selected.tags) ? selected.tags.map(String).join(', ') : '');
    setConnectedIds(report.connections.map((item) => item.id));
    showToast('Alterações descartadas.');
  };
  const removePain = (id: string) => {
    setGraph((current) => removeContextEntity(current, 'pain', id), 'Dores 2.0: remover');
    if (selectedId === id) closePain();
    setDeleteId(null); setMenuId(null);
    showToast('Dor removida e relações desvinculadas.');
  };
  const toggleRelation = (id: string) => setConnectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  if (selected && draft && report) {
    const evidence = relationOptions.filter((item) => item.kind === 'evidence');
    const evidenceConnections = evidence.filter((item) => connectedIds.includes(item.id));
    const personaOptions = relationOptions.filter((item) => item.kind === 'persona');
    const score = previewReport?.foundationScore ?? report.foundationScore;
    const checks = previewReport?.foundationChecks ?? report.foundationChecks;
    return <section className="bo-h74-pain-detail" data-pains-h74="detail">
      <header className="bo-h71-detail-head bo-h74-detail-head">
        <button type="button" className="bo-h71-back" onClick={closePain}><ArrowLeft size={16}/> Dores</button>
        <div className="bo-h71-detail-title"><span className="bo-h71-avatar bo-h74-avatar"><HeartCrack size={19}/></span><div><small>FRICÇÃO OBSERVADA</small><h1>{draft.title || 'Sem título'}</h1><p>{draft.description || 'Descreva a fricção observada sem transformá-la prematuramente em solução ou problema validado.'}</p></div></div>
        <div className="bo-h71-detail-score"><span>COMPLETUDE</span><strong>{score}%</strong><i><b style={{ width: `${score}%` }}/></i></div>
      </header>
      <nav className="bo-h71-detail-tabs" aria-label="Detalhes da Dor">
        {([['overview','Visão geral'],['people','Pessoas'],['relations','Relações'],['evidence','Evidências'],['usage','Uso']] as Array<[DetailTab,string]>).map(([id,label]) => <button key={id} type="button" className={detailTab === id ? 'is-active' : ''} onClick={() => setDetailTab(id)}>{label}{id === 'people' && <b>{previewReport?.connectionCounts.persona ?? report.connectionCounts.persona}</b>}{id === 'relations' && <b>{connectedIds.length}</b>}{id === 'evidence' && <b>{evidenceConnections.length}</b>}</button>)}
      </nav>
      <div className="bo-h71-detail-body">
        {detailTab === 'overview' && <div className="bo-h74-overview-grid">
          <section className="bo-h71-editor-card bo-h74-pain-card"><header><div><small>FRICÇÃO</small><strong>O que está tornando a experiência difícil?</strong></div><span className={`bo-h74-severity is-${draft.severity}`}>{severityLabel[draft.severity]}</span></header>
            <div className="bo-h71-form two-col">
              <label className="wide"><span>Nome da Dor</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ex.: Perder tempo esperando disponibilidade para lavar roupas"/></label>
              <label className="wide"><span>Descrição <small>o que acontece, sem prescrever solução</small></span><textarea rows={3} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Descreva a fricção de forma observável."/></label>
              <label><span>Contexto</span><textarea rows={3} value={draft.context} onChange={(event) => setDraft({ ...draft, context: event.target.value })} placeholder="Quando e onde essa dor aparece?"/></label>
              <label><span>Impacto</span><textarea rows={3} value={draft.impact} onChange={(event) => setDraft({ ...draft, impact: event.target.value })} placeholder="O que a pessoa perde, atrasa ou deixa de conseguir?"/></label>
              <label><span>Sinal observável</span><textarea rows={3} value={draft.observableSignal} onChange={(event) => setDraft({ ...draft, observableSignal: event.target.value })} placeholder="Que comportamento ou dado demonstra a dor?"/></label>
              <label><span>Alternativa atual</span><textarea rows={3} value={draft.currentWorkaround} onChange={(event) => setDraft({ ...draft, currentWorkaround: event.target.value })} placeholder="Como a pessoa contorna isso hoje?"/></label>
              <label className="wide"><span>Consequência</span><textarea rows={2} value={draft.consequence} onChange={(event) => setDraft({ ...draft, consequence: event.target.value })} placeholder="O que acontece se essa dor continuar?"/></label>
              <label><span>Severidade</span><select value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value as PainSeverity })}>{Object.entries(severityLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Frequência</span><select value={draft.frequency} onChange={(event) => setDraft({ ...draft, frequency: event.target.value as PainFrequency })}>{Object.entries(frequencyLabel).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Responsável <small>opcional</small></span><input value={owner} onChange={(event) => setOwner(event.target.value)} placeholder="Nome ou papel"/></label>
              <label><span>Tags <small>separadas por vírgula</small></span><input value={tagsText} onChange={(event) => setTagsText(event.target.value)} placeholder="Ex.: operação, tempo, confiança"/></label>
            </div>
          </section>
          <aside className="bo-h74-pain-summary"><small>LEITURA DA DOR</small><strong>Fricção em uma frase</strong><p>{draft.context ? <><b>Quando</b> {draft.context}, </> : null}{draft.description ? <><b>a pessoa enfrenta</b> {draft.description}. </> : null}{draft.impact ? <><b>Isso provoca</b> {draft.impact}.</> : null}{!draft.context && !draft.description && !draft.impact ? 'Preencha contexto, descrição e impacto para formar uma leitura clara da dor.' : null}</p><div><span>Base mínima</span><strong>{score}%</strong><i><b style={{ width: `${score}%` }}/></i></div>{checks.map((item) => <em key={item.id} className={item.complete ? 'is-done' : ''}><b>{item.complete ? <Check size={11}/> : '·'}</b>{item.label}</em>)}</aside>
        </div>}
        {detailTab === 'people' && <div><div className="bo-h71-section-intro"><div><small>PESSOAS</small><h2>Quem sente esta dor?</h2><p>Conecte Personas que realmente experimentam esta fricção.</p></div><strong>{connectedIds.filter((id) => personaOptions.some((item) => item.id === id)).length} conectada(s)</strong></div>{personaOptions.length ? <div className="bo-h71-evidence-list">{personaOptions.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma Persona criada</strong><p>Crie Personas primeiro e depois conecte-as à Dor.</p></div>}</div>}
        {detailTab === 'relations' && <div><div className="bo-h71-section-intro"><div><small>SERVICE GRAPH</small><h2>Que contexto explica esta Dor?</h2><p>Necessidades e Jobs mostram onde a fricção aparece; hipóteses e problemas mostram como ela pode evoluir para investigação ou validação.</p></div><strong>{connectedIds.filter((id) => !personaOptions.some((item) => item.id === id) && !evidence.some((item) => item.id === id)).length} conexões</strong></div><div className="bo-h71-relation-grid">{(['need','job','problemHypothesis','problem'] as PainRelationKind[]).map((kind) => { const options = relationOptions.filter((item) => item.kind === kind); return <section key={kind}><header><strong>{relationLabel[kind]}</strong><span>{options.filter((item) => connectedIds.includes(item.id)).length}/{options.length}</span></header>{options.length ? <div>{options.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={12}/> : <Plus size={12}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span></button>)}</div> : <p>Nenhum item criado ainda.</p>}</section>; })}</div></div>}
        {detailTab === 'evidence' && <div><div className="bo-h71-section-intro"><div><small>EVIDÊNCIAS</small><h2>O que demonstra esta Dor?</h2><p>Conecte entrevistas, observações, reclamações e dados que sustentem que a fricção existe e importa.</p></div><strong>{evidenceConnections.length} conectada(s)</strong></div>{evidence.length ? <div className="bo-h71-evidence-list">{evidence.map((item) => <button key={item.id} type="button" className={connectedIds.includes(item.id) ? 'is-linked' : ''} onClick={() => toggleRelation(item.id)}><b>{connectedIds.includes(item.id) ? <Check size={13}/> : <Plus size={13}/>}</b><span><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}</small></span><em>{item.confidence === 'high' ? 'Alta confiança' : item.confidence === 'low' ? 'Baixa confiança' : 'Média confiança'}</em></button>)}</div> : <div className="bo-h71-empty-inline"><strong>Nenhuma evidência criada</strong><p>Crie evidências na aba Evidências e depois conecte-as aqui.</p></div>}</div>}
        {detailTab === 'usage' && <ServiceUsageRelations graph={graph} kind="pain" id={selected.id} title="Uso e relações" />}
      </div>
      <footer className="bo-h71-detail-actions"><button type="button" className="danger" onClick={() => setDeleteId(selected.id)}><Trash2 size={14}/> Remover</button><span/><button type="button" onClick={discardPain}>Descartar alterações</button><button type="button" className="primary" disabled={!draft.title.trim()} onClick={savePain}>Salvar Dor</button></footer>
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

import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Filter, Plus, RefreshCw, Target } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { Id, ImprovementOpportunityStatus, ImprovementPriorityBand, ImprovementProblemStatus, ImprovementSourceKind } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import {
  buildImprovementBacklogReport, createImprovementOpportunity, IMPROVEMENT_OPPORTUNITY_STATUS_LABELS,
  IMPROVEMENT_PRIORITY_LABELS, IMPROVEMENT_PROBLEM_STATUS_LABELS, IMPROVEMENT_SOURCE_LABELS,
  syncImprovementBacklog, updateImprovementOpportunity, updateImprovementProblem,
} from '../services/improvement-backlog';

const bands: Array<'all' | ImprovementPriorityBand> = ['all','critical','high','medium','low'];
const statuses: Array<'all' | ImprovementProblemStatus> = ['all','new','triaged','accepted','resolved','dismissed'];
const scoreFieldLabel: Record<'impact'|'frequency'|'effort'|'risk'|'urgency', string> = { impact:'Impacto', frequency:'Frequência', effort:'Esforço', risk:'Risco', urgency:'Urgência' };

export function ImprovementBacklogView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const report = useMemo(() => buildImprovementBacklogReport(graph), [graph]);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'all' | ImprovementSourceKind>('all');
  const [band, setBand] = useState<'all' | ImprovementPriorityBand>('all');
  const [status, setStatus] = useState<'all' | ImprovementProblemStatus>('all');
  const [selectedId, setSelectedId] = useState<Id>('');
  const [opportunityTitle, setOpportunityTitle] = useState('');
  const selected = report.problems.find((item) => item.id === selectedId) ?? report.activeProblems[0] ?? report.problems[0] ?? null;
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = report.problems.filter((item) => {
    if (source !== 'all' && !item.sourceRefs.some((ref) => ref.kind === source)) return false;
    if (band !== 'all' && item.band !== band) return false;
    if (status !== 'all' && item.status !== status) return false;
    if (normalizedQuery && !`${item.title} ${item.description} ${item.owner || ''}`.toLowerCase().includes(normalizedQuery)) return false;
    return true;
  });

  const sync = () => {
    const result = syncImprovementBacklog(graph);
    setGraph(() => result.graph, 'H7.34: sincronizar backlog de melhoria');
    showToast(`${result.added} problema${result.added === 1 ? '' : 's'} novo${result.added === 1 ? '' : 's'} · ${result.refreshed} atualizado${result.refreshed === 1 ? '' : 's'} · ${result.importedOpportunities} oportunidade${result.importedOpportunities === 1 ? '' : 's'} importada${result.importedOpportunities === 1 ? '' : 's'}.`);
  };
  const patchProblem = (patch: Parameters<typeof updateImprovementProblem>[2]) => {
    if (!selected) return;
    setGraph((current) => updateImprovementProblem(current, selected.id, patch), 'H7.34: atualizar problema priorizado');
  };
  const createOpportunity = () => {
    if (!selected || !opportunityTitle.trim()) return;
    const result = createImprovementOpportunity(graph, { title: opportunityTitle, problemIds: [selected.id], owner: selected.owner, status: 'candidate' });
    if (!result.opportunityId) { showToast('Informe um título e selecione um problema válido.'); return; }
    setGraph(() => result.graph, 'H7.34: criar oportunidade'); setOpportunityTitle(''); showToast('Oportunidade criada e vinculada ao problema.');
  };

  return <section className="bo-h734" data-improvement-backlog="7.34">
    <header className="bo-h734-hero">
      <div><span className="bo-h734-kicker"><Target size={14}/> H7.34 · PROBLEMS, OPPORTUNITIES & PRIORITIZATION</span><h2>Transforme sinais dispersos em uma fila única de melhoria.</h2><p>Consolide problemas de Pesquisa, Journey, Canais, Blueprint, Protótipos e Atual × Futuro. A prioridade combina impacto, frequência, esforço, risco e urgência com uma fórmula determinística e editável.</p></div>
      <div className="bo-h734-hero-score"><strong>{report.counts.active}</strong><span>problemas ativos</span><em>{report.counts.critical} críticos · {report.counts.high} altos</em></div>
    </header>

    <div className="bo-h734-actions"><button type="button" className="primary" onClick={sync}><RefreshCw size={14}/> Sincronizar fontes</button><span>{report.pendingDiscovery ? <><AlertTriangle size={13}/> {report.pendingDiscovery} sinal{report.pendingDiscovery === 1 ? '' : 'is'} ainda não materializado{report.pendingDiscovery === 1 ? '' : 's'}</> : <><CheckCircle2 size={13}/> Fontes sincronizadas</>}</span></div>

    <div className="bo-h734-kpis">
      <article><small>ATIVOS</small><strong>{report.counts.active}</strong><span>{report.counts.triaged} já triados</span></article>
      <article className={report.counts.critical ? 'is-attention' : ''}><small>CRÍTICOS</small><strong>{report.counts.critical}</strong><span>score ≥ 80</span></article>
      <article><small>OPORTUNIDADES</small><strong>{report.counts.opportunities}</strong><span>{report.counts.selectedOpportunities} selecionadas/planejadas</span></article>
      <article><small>ORIGENS ATIVAS</small><strong>{Object.values(report.sourceCounts).filter(Boolean).length}</strong><span>de {Object.keys(IMPROVEMENT_SOURCE_LABELS).length} fontes possíveis</span></article>
    </div>

    <section className="bo-h734-source-map">
      {(Object.keys(IMPROVEMENT_SOURCE_LABELS) as ImprovementSourceKind[]).map((kind) => <button key={kind} type="button" className={source === kind ? 'active' : ''} onClick={() => setSource(source === kind ? 'all' : kind)}><span>{IMPROVEMENT_SOURCE_LABELS[kind]}</span><strong>{report.sourceCounts[kind]}</strong></button>)}
    </section>

    <section className="bo-h734-workbench">
      <div className="bo-h734-list">
        <div className="bo-h734-toolbar"><label><Filter size={14}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar problemas, descrição ou responsável"/></label><select value={band} onChange={(event) => setBand(event.target.value as typeof band)}>{bands.map((item) => <option key={item} value={item}>{item === 'all' ? 'Todas as prioridades' : IMPROVEMENT_PRIORITY_LABELS[item]}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>{statuses.map((item) => <option key={item} value={item}>{item === 'all' ? 'Todos os status' : IMPROVEMENT_PROBLEM_STATUS_LABELS[item]}</option>)}</select></div>
        <div className="bo-h734-table"><div className="bo-h734-table-head"><span>PROBLEMA</span><span>PRIORIDADE</span><span>ORIGEM</span><span>STATUS</span></div>{filtered.map((item) => <button key={item.id} type="button" className={`${selected?.id === item.id ? 'selected' : ''} ${!item.sourceActive ? 'is-stale' : ''}`} onClick={() => setSelectedId(item.id)}><div><strong>{item.title}</strong><small>{item.description || 'Sem descrição'}{!item.sourceActive ? ' · fonte não está mais ativa' : ''}</small></div><div className={`bo-h734-priority is-${item.band}`}><b>{item.score}</b><span>{IMPROVEMENT_PRIORITY_LABELS[item.band]}</span></div><div className="bo-h734-origins">{item.sourceRefs.slice(0,3).map((ref) => <em key={`${ref.kind}-${ref.sourceId}`}>{IMPROVEMENT_SOURCE_LABELS[ref.kind]}</em>)}{item.sourceRefs.length > 3 && <em>+{item.sourceRefs.length - 3}</em>}</div><div><span className={`bo-h734-status is-${item.status}`}>{IMPROVEMENT_PROBLEM_STATUS_LABELS[item.status]}</span></div></button>)}{!filtered.length && <div className="bo-h734-empty"><BlueOceanObjectIcon kind="problem" size={28}/><strong>Nenhum problema nesta visão</strong><p>Sincronize as fontes ou ajuste filtros e busca.</p></div>}</div>
      </div>

      <aside className="bo-h734-inspector">
        {selected ? <>
          <header><div><small>PRIORIZAÇÃO</small><h3>{selected.title}</h3></div><div className={`bo-h734-priority big is-${selected.band}`}><b>{selected.score}</b><span>{IMPROVEMENT_PRIORITY_LABELS[selected.band]}</span></div></header>
          <label><span>Status</span><select value={selected.status} onChange={(event) => patchProblem({ status: event.target.value as ImprovementProblemStatus })}>{(Object.keys(IMPROVEMENT_PROBLEM_STATUS_LABELS) as ImprovementProblemStatus[]).map((value) => <option key={value} value={value}>{IMPROVEMENT_PROBLEM_STATUS_LABELS[value]}</option>)}</select></label>
          <label><span>Responsável</span><input value={selected.owner || ''} onChange={(event) => patchProblem({ owner: event.target.value })} placeholder="Quem vai conduzir?"/></label>
          <div className="bo-h734-score-grid">{(['impact','frequency','effort','risk','urgency'] as const).map((key) => <label key={key}><span>{scoreFieldLabel[key]} <b>{selected[key]}</b></span><input type="range" min="1" max="5" step="1" value={selected[key]} onChange={(event) => patchProblem({ [key]: Number(event.target.value) } as Parameters<typeof updateImprovementProblem>[2])}/></label>)}</div>
          <div className="bo-h734-formula"><span>FÓRMULA</span><code>30% impacto + 20% frequência + 15% risco + 25% urgência + 10% facilidade</code><small>Facilidade = 6 − esforço. Nenhuma IA altera o score.</small></div>
          <label><span>Nota de triagem</span><textarea value={selected.note || ''} onChange={(event) => patchProblem({ note: event.target.value })} placeholder="Contexto, restrições, decisão de triagem…"/></label>
          <section className="bo-h734-trace"><strong>Rastreabilidade</strong>{selected.sourceRefs.map((ref) => <div key={`${ref.kind}-${ref.sourceId}`}><BlueOceanObjectIcon kind={ref.kind === 'blueprint' ? 'blueprint' : ref.kind === 'prototype' ? 'experiment' : ref.kind === 'channel' ? 'channel' : ref.kind === 'journey' ? 'journey' : 'evidence'} size={15}/><span><b>{IMPROVEMENT_SOURCE_LABELS[ref.kind]}</b>{ref.label}<small>{ref.detail || ref.sourceId}</small></span></div>)}</section>
          <section className="bo-h734-create-opportunity"><div><small>PROBLEMA → OPORTUNIDADE</small><strong>Transformar espaço de melhoria em hipótese de ação</strong></div><label><input value={opportunityTitle} onChange={(event) => setOpportunityTitle(event.target.value)} placeholder="Ex.: Redesenhar o handoff entre WhatsApp e coleta"/><button type="button" className="primary" onClick={createOpportunity} disabled={!opportunityTitle.trim()}><Plus size={14}/> Criar</button></label></section>
        </> : <div className="bo-h734-empty"><BlueOceanObjectIcon kind="problem" size={28}/><strong>Sincronize o backlog</strong><p>Os sinais das ferramentas do serviço aparecerão aqui.</p></div>}
      </aside>
    </section>

    <section className="bo-h734-opportunities">
      <div className="bo-h734-section-title"><div><small>OPORTUNIDADES</small><h3>Do problema priorizado para a melhoria possível</h3></div><span>{report.opportunities.length} registradas</span></div>
      {report.opportunities.length ? <div>{report.opportunities.map((item) => <article key={item.id}><BlueOceanObjectIcon kind="opportunity" size={18}/><div><strong>{item.title}</strong><span>{item.problemIds.length} problema{item.problemIds.length === 1 ? '' : 's'} vinculado{item.problemIds.length === 1 ? '' : 's'}{item.owner ? ` · ${item.owner}` : ''}</span></div><select value={item.status} onChange={(event) => setGraph((current) => updateImprovementOpportunity(current, item.id, { status: event.target.value as ImprovementOpportunityStatus }), 'H7.34: status da oportunidade')}>{(Object.keys(IMPROVEMENT_OPPORTUNITY_STATUS_LABELS) as ImprovementOpportunityStatus[]).map((value) => <option key={value} value={value}>{IMPROVEMENT_OPPORTUNITY_STATUS_LABELS[value]}</option>)}</select><ArrowRight size={14}/></article>)}</div> : <div className="bo-h734-empty compact"><BlueOceanObjectIcon kind="opportunity" size={24}/><strong>Nenhuma oportunidade no backlog</strong><p>Selecione um problema e transforme-o em oportunidade quando houver uma direção de melhoria.</p></div>}
    </section>
  </section>;
}

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, Link2, Plus, Target } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { Id, ImprovementInitiativeRisk, ImprovementInitiativeStatus } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import {
  buildImprovementPortfolioReport, createImprovementInitiative, IMPROVEMENT_INITIATIVE_RISK_LABELS,
  IMPROVEMENT_INITIATIVE_STATUS_LABELS, updateImprovementInitiative,
} from '../services/improvement-portfolio';

const statusOrder: ImprovementInitiativeStatus[] = ['backlog','planned','in_progress','validating','implemented'];
const toggle = (values: Id[], id: Id) => values.includes(id) ? values.filter((value) => value !== id) : [...values, id];

export function ImprovementPortfolioView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const report = useMemo(() => buildImprovementPortfolioReport(graph), [graph]);
  const [selectedId, setSelectedId] = useState<Id>('');
  const selected = report.initiatives.find((item) => item.id === selectedId) ?? report.initiatives[0] ?? null;

  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'initiative' || !detail.id || !report.initiatives.some((item) => item.id === detail.id)) return;
      setSelectedId(detail.id);
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) { const detail = JSON.parse(raw) as { kind?: string; id?: string }; if (detail.kind === 'initiative' && detail.id && report.initiatives.some((item) => item.id === detail.id)) { setSelectedId(detail.id); sessionStorage.removeItem('bo-service-object-focus'); } }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [report.initiatives]);

  const decisions = Object.values(graph.service.decisionSystem?.records ?? {});
  const experiments = Object.values(graph.service.prototypeLab?.experiments ?? {});
  const metrics = Object.values(graph.entities?.metric ?? {});
  const create = (opportunityId: Id) => {
    const result = createImprovementInitiative(graph, { opportunityId });
    if (!result.created) { showToast(result.reason === 'already_exists' ? 'Essa oportunidade já possui uma iniciativa.' : 'Selecione ou planeje a oportunidade antes de criar a iniciativa.'); return; }
    setGraph(() => result.graph, 'H7.35: criar iniciativa de melhoria'); setSelectedId(result.initiativeId || ''); showToast('Iniciativa criada no Portfolio de Melhoria.');
  };
  const patch = (values: Parameters<typeof updateImprovementInitiative>[2]) => {
    if (!selected) return;
    setGraph((current) => updateImprovementInitiative(current, selected.id, values), 'H7.35: atualizar iniciativa');
  };

  return <section className="bo-h735" data-improvement-portfolio="7.35">
    <header className="bo-h735-hero">
      <div><span className="bo-h735-kicker"><Target size={14}/> H7.35 · IMPROVEMENT PORTFOLIO</span><h2>Transforme oportunidades escolhidas em melhoria executável.</h2><p>Planeje iniciativas sem perder o porquê da mudança. Cada iniciativa permanece ligada à oportunidade, aos problemas de origem e, quando necessário, às decisões, experimentos, métricas e dependências que governam a execução.</p></div>
      <div className="bo-h735-hero-score"><strong>{report.averageProgress}%</strong><span>progresso médio</span><em>{report.counts.inProgress} em execução · {report.counts.validating} validando</em></div>
    </header>

    <div className="bo-h735-kpis">
      <article><small>INICIATIVAS</small><strong>{report.counts.initiatives}</strong><span>{report.counts.eligibleOpportunities} oportunidades prontas</span></article>
      <article><small>EM EXECUÇÃO</small><strong>{report.counts.inProgress}</strong><span>{report.counts.planned} planejadas</span></article>
      <article className={report.counts.blocked ? 'is-attention' : ''}><small>BLOQUEADAS</small><strong>{report.counts.blocked}</strong><span>dependências não concluídas</span></article>
      <article className={report.counts.overdue ? 'is-attention' : ''}><small>ATRASADAS</small><strong>{report.counts.overdue}</strong><span>{report.counts.implemented} implementadas</span></article>
    </div>

    {report.eligibleOpportunities.length > 0 && <section className="bo-h735-ready"><div><small>OPORTUNIDADES SELECIONADAS</small><h3>Prontas para entrar no portfolio</h3><p>Uma oportunidade só vira iniciativa por uma ação explícita.</p></div><div>{report.eligibleOpportunities.map((item) => <article key={item.id}><BlueOceanObjectIcon kind="opportunity" size={18}/><span><strong>{item.title}</strong><small>{item.problemIds.length} problema{item.problemIds.length === 1 ? '' : 's'} de origem{item.owner ? ` · ${item.owner}` : ''}</small></span><button type="button" className="primary" onClick={() => create(item.id)}><Plus size={14}/> Criar iniciativa</button></article>)}</div></section>}

    <section className="bo-h735-workbench">
      <div className="bo-h735-board">
        {statusOrder.map((status) => {
          const items = report.initiatives.filter((item) => item.status === status);
          return <section key={status} className={`bo-h735-column is-${status}`}><header><strong>{IMPROVEMENT_INITIATIVE_STATUS_LABELS[status]}</strong><span>{items.length}</span></header><div>{items.map((item) => <button key={item.id} type="button" className={selected?.id === item.id ? 'selected' : ''} onClick={() => setSelectedId(item.id)}><div className="bo-h735-card-top"><BlueOceanObjectIcon kind="task" size={17}/><strong>{item.title}</strong></div><p>{item.expectedOutcome || 'Resultado esperado ainda não definido.'}</p><div className="bo-h735-progress"><i style={{width:`${item.progress}%`}}/><span>{item.progress}%</span></div><footer><span>{item.owner || 'Sem responsável'}</span>{item.blocked && <em><Link2 size={11}/> bloqueada</em>}{item.overdue && <em className="danger"><AlertTriangle size={11}/> atrasada</em>}</footer></button>)}{!items.length && <div className="bo-h735-column-empty">Nenhuma iniciativa</div>}</div></section>;
        })}
      </div>

      <aside className="bo-h735-inspector">
        {selected ? <>
          <header><div><small>INICIATIVA</small><h3>{selected.title}</h3></div><span className={`bo-h735-value is-${selected.valueScore >= 70 ? 'high' : selected.valueScore >= 50 ? 'medium' : 'low'}`}>{selected.valueScore}<small>valor</small></span></header>
          <label><span>Título</span><input value={selected.title} onChange={(event) => patch({ title: event.target.value })}/></label>
          <div className="bo-h735-two"><label><span>Status</span><select value={selected.status} onChange={(event) => patch({ status: event.target.value as ImprovementInitiativeStatus })}>{statusOrder.map((value) => <option key={value} value={value}>{IMPROVEMENT_INITIATIVE_STATUS_LABELS[value]}</option>)}</select></label><label><span>Responsável</span><input value={selected.owner || ''} onChange={(event) => patch({ owner: event.target.value })} placeholder="Responsável pela iniciativa"/></label></div>
          <label><span>Resultado esperado</span><textarea value={selected.expectedOutcome || ''} onChange={(event) => patch({ expectedOutcome: event.target.value })} placeholder="O que precisa mudar para considerarmos esta iniciativa bem-sucedida?"/></label>
          <div className="bo-h735-two"><label><span>Impacto esperado <b>{selected.expectedImpact}</b></span><input type="range" min="1" max="5" value={selected.expectedImpact} onChange={(event) => patch({ expectedImpact: Number(event.target.value) as 1|2|3|4|5 })}/></label><label><span>Esforço <b>{selected.effort}</b></span><input type="range" min="1" max="5" value={selected.effort} onChange={(event) => patch({ effort: Number(event.target.value) as 1|2|3|4|5 })}/></label></div>
          <div className="bo-h735-two"><label><span>Risco de entrega</span><select value={selected.deliveryRisk} onChange={(event) => patch({ deliveryRisk: event.target.value as ImprovementInitiativeRisk })}>{(Object.keys(IMPROVEMENT_INITIATIVE_RISK_LABELS) as ImprovementInitiativeRisk[]).map((value) => <option key={value} value={value}>{IMPROVEMENT_INITIATIVE_RISK_LABELS[value]}</option>)}</select></label><label><span>Prazo</span><span className="bo-h735-date"><Calendar size={13}/><input type="date" value={selected.targetDate || ''} onChange={(event) => patch({ targetDate: event.target.value })}/></span></label></div>
          <label><span>Progresso <b>{selected.progress}%</b></span><input type="range" min="0" max="100" step="5" value={selected.progress} disabled={selected.status === 'implemented'} onChange={(event) => patch({ progress: Number(event.target.value) })}/></label>

          <section className="bo-h735-trace"><strong>Rastreabilidade</strong><div><BlueOceanObjectIcon kind="opportunity" size={15}/><span><b>Oportunidade</b>{selected.sourceOpportunity?.title || selected.opportunityId}</span></div>{selected.sourceProblems.map((problem) => <div key={problem.id}><BlueOceanObjectIcon kind="problem" size={15}/><span><b>Problema</b>{problem.title}</span></div>)}</section>
          <ServiceUsageRelations graph={graph} kind="initiative" id={selected.id} title="Uso e relações da iniciativa" compact/>

          <section className="bo-h735-links"><strong>Dependências</strong>{report.initiatives.filter((item) => item.id !== selected.id).length ? report.initiatives.filter((item) => item.id !== selected.id).map((item) => <label key={item.id}><input type="checkbox" checked={selected.dependencyIds.includes(item.id)} onChange={() => patch({ dependencyIds: toggle(selected.dependencyIds, item.id) })}/><span>{item.title}<small>{IMPROVEMENT_INITIATIVE_STATUS_LABELS[item.status]}</small></span></label>) : <small>Nenhuma outra iniciativa disponível.</small>}</section>
          <section className="bo-h735-links"><strong>Decisões vinculadas</strong>{decisions.length ? decisions.map((item) => <label key={item.id}><input type="checkbox" checked={selected.decisionIds.includes(item.id)} onChange={() => patch({ decisionIds: toggle(selected.decisionIds, item.id) })}/><span>{item.title}<small>{item.status}</small></span></label>) : <small>Nenhuma decisão disponível.</small>}</section>
          <section className="bo-h735-links"><strong>Experimentos vinculados</strong>{experiments.length ? experiments.map((item) => <label key={item.id}><input type="checkbox" checked={selected.experimentIds.includes(item.id)} onChange={() => patch({ experimentIds: toggle(selected.experimentIds, item.id) })}/><span>{item.title}<small>{item.outcome}</small></span></label>) : <small>Nenhum experimento disponível.</small>}</section>
          <section className="bo-h735-links"><strong>Métricas vinculadas</strong>{metrics.length ? metrics.map((item) => <label key={item.id}><input type="checkbox" checked={selected.metricIds.includes(item.id)} onChange={() => patch({ metricIds: toggle(selected.metricIds, item.id) })}/><span>{String(item.title || item.name || 'Métrica')}<small>{item.id}</small></span></label>) : <small>Nenhuma métrica disponível.</small>}</section>
          <label><span>Notas</span><textarea value={selected.note || ''} onChange={(event) => patch({ note: event.target.value })} placeholder="Restrições, riscos, acordos e observações de execução…"/></label>
          {selected.blocked ? <div className="bo-h735-warning"><AlertTriangle size={15}/><span><strong>Iniciativa bloqueada</strong>{selected.blockedBy.length} dependência{selected.blockedBy.length === 1 ? '' : 's'} ainda não implementada{selected.blockedBy.length === 1 ? '' : 's'}.</span></div> : <div className="bo-h735-ok"><CheckCircle2 size={15}/><span><strong>Sem bloqueios de dependência</strong>A iniciativa pode avançar conforme a governança definida.</span></div>}
        </> : <div className="bo-h735-empty"><BlueOceanObjectIcon kind="task" size={28}/><strong>Portfolio ainda vazio</strong><p>Selecione uma oportunidade na H7.34 e transforme-a em iniciativa para começar.</p></div>}
      </aside>
    </section>
  </section>;
}

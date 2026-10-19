import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, GitPullRequest, RefreshCw, RotateCcw, ShieldCheck, Target } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { Id, ServiceGapStatus, ServiceStateEntryKind } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import {
  buildCurrentFutureReport, captureCurrentServiceState, initializeFutureServiceState, projectDecisionIntoFuture,
  SERVICE_GAP_CHANGE_LABELS, SERVICE_GAP_STATUS_LABELS, SERVICE_STATE_KIND_LABELS, setServiceGapMetadata, updateFutureServiceField,
} from '../services/current-future-service';

const allKinds: Array<'all' | ServiceStateEntryKind> = ['all','proposition','journey','channel','blueprint','responsibility'];
const fieldLabel = (field: string) => ({ status:'Status', audience:'Público', problem:'Problema', promise:'Promessa', outcome:'Resultado', experience:'Experiência', differentiator:'Diferencial', businessValue:'Valor para o negócio', name:'Nome', priority:'Prioridade', owner:'Responsável', objective:'Objetivo', stageCount:'Etapas', kind:'Tipo', active:'Ativo', journeyId:'Journey', layoutMode:'Layout', itemCount:'Objetos', laneCount:'Camadas', accountable:'Accountable', consulted:'Consultados', informed:'Informados' } as Record<string,string>)[field] || field;

export function CurrentFutureServiceView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const report = useMemo(() => buildCurrentFutureReport(graph), [graph]);
  const [filter, setFilter] = useState<'all' | ServiceStateEntryKind>('all');
  const [entryId, setEntryId] = useState<Id>('');
  const [field, setField] = useState('');
  const [value, setValue] = useState('');
  const futureEntries = report.futureEntries.filter((entry) => entry.kind !== 'responsibility' || Object.keys(entry.fields).length > 0);
  const selectedEntry = futureEntries.find((entry) => entry.id === entryId) ?? futureEntries[0] ?? null;
  const selectedField = selectedEntry && field in selectedEntry.fields ? field : Object.keys(selectedEntry?.fields ?? {})[0] ?? '';

  useEffect(() => {
    if (!selectedEntry) { setEntryId(''); setField(''); setValue(''); return; }
    if (entryId !== selectedEntry.id) setEntryId(selectedEntry.id);
    if (field !== selectedField) setField(selectedField);
    setValue(selectedEntry.fields[selectedField] ?? '');
  }, [selectedEntry?.id, selectedField]);

  const captureCurrent = () => { setGraph((current) => captureCurrentServiceState(current), 'H7.33: capturar estado atual'); showToast('Estado atual capturado sem alterar o serviço.'); };
  const initFuture = (reset = false) => { setGraph((current) => initializeFutureServiceState(current, { reset }), reset ? 'H7.33: redefinir futuro' : 'H7.33: criar estado futuro'); showToast(reset ? 'Estado futuro recriado a partir do atual.' : 'Estado futuro criado a partir do atual.'); };
  const updateFuture = () => {
    if (!selectedEntry || !selectedField) return;
    const result = updateFutureServiceField(graph, { entryId: selectedEntry.id, field: selectedField, value });
    if (!result.updated) { showToast(result.reason || 'Não foi possível atualizar o futuro.'); return; }
    setGraph(() => result.graph, 'H7.33: editar estado futuro'); showToast('Estado futuro atualizado. O serviço atual permanece intacto.');
  };
  const project = (decisionId: Id) => {
    const result = projectDecisionIntoFuture(graph, decisionId);
    if (!result.projected) { showToast(result.reason || 'Não foi possível projetar a decisão.'); return; }
    setGraph(() => result.graph, 'H7.33: projetar decisão no futuro'); showToast(`${result.count} mudança${result.count === 1 ? '' : 's'} projetada${result.count === 1 ? '' : 's'} no estado futuro.`);
  };
  const gaps = report.gaps.filter((gap) => filter === 'all' || gap.kind === filter);

  return <section className="bo-h733" data-current-future-service="7.33">
    <header className="bo-h733-hero">
      <div><span className="bo-h733-kicker"><Target size={14}/> H7.33 · CURRENT × FUTURE SERVICE</span><h2>Separe o serviço de hoje do serviço que queremos construir.</h2><p>Capture o estado real, desenhe um futuro independente e compare diferenças em Proposição, Journey, Canais, Blueprint e responsabilidades. Planejar o futuro nunca altera silenciosamente o serviço atual.</p></div>
      <div className="bo-h733-score"><strong>{report.alignmentScore}%</strong><span>gaps tratados</span><em>{report.counts.gaps} diferenças · {report.counts.unresolved} abertas</em></div>
    </header>

    <div className="bo-h733-actions">
      <button type="button" onClick={captureCurrent}><RefreshCw size={14}/> {report.state.current ? 'Atualizar snapshot atual' : 'Capturar estado atual'}</button>
      <button type="button" className="primary" onClick={() => initFuture(false)} disabled={Boolean(report.state.future)}><Target size={14}/> Criar estado futuro</button>
      {report.state.future && <button type="button" onClick={() => initFuture(true)}><RotateCcw size={14}/> Recriar futuro a partir do atual</button>}
      <span>Atual: <b>{report.state.current ? new Date(report.state.current.capturedAt).toLocaleString('pt-BR') : 'não capturado'}</b> · Futuro: <b>{report.state.future ? 'ativo' : 'não criado'}</b></span>
    </div>

    <div className="bo-h733-kpis">
      <article><small>COMPONENTES ATUAIS</small><strong>{report.counts.currentEntries}</strong><span>snapshot canônico</span></article>
      <article><small>COMPONENTES FUTUROS</small><strong>{report.counts.futureEntries}</strong><span>modelo-alvo independente</span></article>
      <article><small>GAPS</small><strong>{report.counts.gaps}</strong><span>{report.counts.inProgress} em execução</span></article>
      <article className={report.counts.projectableDecisions ? 'is-attention' : ''}><small>DECISÕES PROJETÁVEIS</small><strong>{report.counts.projectableDecisions}</strong><span>aprovadas/aplicadas ainda fora do futuro</span></article>
    </div>

    {report.projectableDecisions.length > 0 && <section className="bo-h733-decisions">
      <div className="bo-h733-section-title"><div><small>DECISÕES → FUTURO</small><h3>Antecipe o efeito das decisões</h3></div><span>Projetar não aplica a decisão no serviço canônico.</span></div>
      <div>{report.projectableDecisions.map((decision) => <article key={decision.id}><GitPullRequest size={17}/><div><small>{decision.status === 'approved' ? 'APROVADA' : 'APLICADA'}</small><strong>{decision.title}</strong><span>{decision.changes.length} mudança{decision.changes.length === 1 ? '' : 's'}</span></div><button type="button" onClick={() => project(decision.id)}>Projetar no futuro <ArrowRight size={13}/></button></article>)}</div>
    </section>}

    {report.state.future && <section className="bo-h733-planner">
      <div className="bo-h733-section-title"><div><small>EDITOR DO FUTURO</small><h3>Defina o estado-alvo sem tocar no presente</h3></div><span>Use o comparador abaixo para acompanhar os gaps gerados.</span></div>
      {selectedEntry ? <div className="bo-h733-planner-row">
        <label><span>Componente</span><select value={selectedEntry.id} onChange={(event) => { setEntryId(event.target.value); setField(''); }}>{futureEntries.map((entry) => <option key={entry.id} value={entry.id}>{SERVICE_STATE_KIND_LABELS[entry.kind]} · {entry.label}</option>)}</select></label>
        <label><span>Campo</span><select value={selectedField} onChange={(event) => { const next = event.target.value; setField(next); setValue(selectedEntry.fields[next] ?? ''); }}>{Object.keys(selectedEntry.fields).map((key) => <option key={key} value={key}>{fieldLabel(key)}</option>)}</select></label>
        <label className="grow"><span>Valor futuro</span><input value={value} onChange={(event) => setValue(event.target.value)} /></label>
        <button type="button" className="primary" onClick={updateFuture}>Atualizar futuro</button>
      </div> : <div className="bo-h733-empty">Nenhum componente disponível para planejamento.</div>}
    </section>}

    <section className="bo-h733-comparison">
      <div className="bo-h733-section-title"><div><small>CURRENT × FUTURE</small><h3>Mapa de diferenças do serviço</h3></div><span>Cada gap pode ganhar responsável e status de execução.</span></div>
      <nav className="bo-h733-filters">{allKinds.map((kind) => <button key={kind} type="button" className={filter === kind ? 'active' : ''} onClick={() => setFilter(kind)}>{kind === 'all' ? 'Todos' : SERVICE_STATE_KIND_LABELS[kind]}{kind !== 'all' && <em>{report.gaps.filter((gap) => gap.kind === kind).length}</em>}</button>)}</nav>
      {!report.state.current || !report.state.future ? <div className="bo-h733-empty"><Target size={28}/><strong>Crie os dois estados para comparar</strong><p>Capture o atual e depois inicialize o futuro.</p></div> : !gaps.length ? <div className="bo-h733-empty is-good"><CheckCircle2 size={28}/><strong>Nenhuma diferença nesta visão</strong><p>Atual e futuro estão alinhados para os componentes selecionados.</p></div> : <div className="bo-h733-gap-table">
        <div className="bo-h733-gap-head"><span>COMPONENTE</span><span>HOJE</span><span>FUTURO</span><span>GESTÃO DO GAP</span></div>
        {gaps.map((gap) => <article key={gap.key} data-gap-status={gap.metadata.status}>
          <div className="bo-h733-gap-target"><BlueOceanObjectIcon kind={gap.kind === 'journey' ? 'journey' : gap.kind === 'channel' ? 'channel' : gap.kind === 'blueprint' ? 'blueprint' : gap.kind === 'proposition' ? 'solution' : 'service'} size={17}/><div><small>{SERVICE_STATE_KIND_LABELS[gap.kind]} · {SERVICE_GAP_CHANGE_LABELS[gap.changeType]}</small><strong>{gap.targetLabel}</strong><span>{fieldLabel(gap.field)}</span></div></div>
          <div className="bo-h733-value current"><small>ATUAL</small><span>{gap.currentValue || '—'}</span></div>
          <div className="bo-h733-value future"><small>FUTURO</small><span>{gap.futureValue || '—'}</span></div>
          <div className="bo-h733-gap-manage"><select value={gap.metadata.status} onChange={(event) => setGraph((current) => setServiceGapMetadata(current, gap.key, { status: event.target.value as ServiceGapStatus }), 'H7.33: status do gap')}>{(Object.keys(SERVICE_GAP_STATUS_LABELS) as ServiceGapStatus[]).map((status) => <option key={status} value={status}>{SERVICE_GAP_STATUS_LABELS[status]}</option>)}</select><input value={gap.metadata.owner || ''} onChange={(event) => setGraph((current) => setServiceGapMetadata(current, gap.key, { owner: event.target.value }), 'H7.33: owner do gap')} placeholder="Responsável"/></div>
        </article>)}
      </div>}
    </section>

    <footer className="bo-h733-guard"><ShieldCheck size={16}/><div><strong>Dois estados, uma fonte de verdade</strong><span>Atualizar o futuro, tratar gaps ou projetar decisões só modifica o modelo Current × Future. Journey, Proposição, Canais, Blueprint e responsabilidades canônicas permanecem intactos até uma decisão explícita ser aplicada pelo loop H7.32.</span></div></footer>
  </section>;
}

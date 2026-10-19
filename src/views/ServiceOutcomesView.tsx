import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Link2, Plus, Target, Trash2, TrendingUp } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { ServiceMetricDirection, ServiceMetricTargetKind } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import {
  bindServiceMetric, buildServiceOutcomesReport, createServiceMetric, listServiceMetricTargets, recordServiceMetricMeasurement,
  SERVICE_METRIC_DIRECTION_LABELS, SERVICE_METRIC_ROLE_LABELS, SERVICE_METRIC_TARGET_LABELS, unbindServiceMetric, updateServiceMetric,
} from '../services/service-outcomes';

const targetKinds = Object.keys(SERVICE_METRIC_TARGET_LABELS) as ServiceMetricTargetKind[];
const metricStatusLabel = (status: string) => status === 'on_target' ? 'Na meta' : status === 'off_target' ? 'Fora da meta' : 'Sem leitura';
const outcomeStatusLabel = (status: string) => ({ achieved: 'Resultado comprovado', partial: 'Resultado parcial', tracking: 'Em acompanhamento', not_achieved: 'Resultado não atingido', unmeasured: 'Sem prova de resultado' }[status] || status);
const numericOrBlank = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

export function ServiceOutcomesView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const report = useMemo(() => buildServiceOutcomesReport(graph), [graph]);
  const [selectedId, setSelectedId] = useState(() => report.metrics[0]?.id || '');
  const [newTitle, setNewTitle] = useState('');
  const [reading, setReading] = useState('');
  const [readingNote, setReadingNote] = useState('');
  const [targetKind, setTargetKind] = useState<ServiceMetricTargetKind>('journey');
  const targets = useMemo(() => listServiceMetricTargets(graph, targetKind), [graph, targetKind]);
  const [targetId, setTargetId] = useState('');
  const selected = report.metrics.find((item) => item.id === selectedId) ?? report.metrics[0];

  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'metric' || !detail.id || !report.metrics.some((item) => item.id === detail.id)) return;
      setSelectedId(detail.id);
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) { const detail = JSON.parse(raw) as { kind?: string; id?: string }; if (detail.kind === 'metric' && detail.id && report.metrics.some((item) => item.id === detail.id)) { setSelectedId(detail.id); sessionStorage.removeItem('bo-service-object-focus'); } }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [report.metrics]);


  const patch = (values: Parameters<typeof updateServiceMetric>[2]) => {
    if (!selected) return;
    setGraph((current) => updateServiceMetric(current, selected.id, values), 'H7.36: atualizar métrica');
  };
  const createMetric = () => {
    const result = createServiceMetric(graph, { title: newTitle, direction: 'at_least' });
    if (!result.created || !result.metricId) { showToast('Informe um nome para criar a métrica.'); return; }
    setGraph(() => result.graph, 'H7.36: criar métrica');
    setSelectedId(result.metricId); setNewTitle(''); showToast('Métrica criada no Service Outcomes.');
  };
  const addBinding = () => {
    if (!selected) return;
    const resolvedTarget = targetId || targets[0]?.id || '';
    if (!resolvedTarget) { showToast('Não há um alvo disponível para esse tipo de vínculo.'); return; }
    const result = bindServiceMetric(graph, selected.id, targetKind, resolvedTarget);
    if (!result.created) { showToast(result.reason === 'already_exists' ? 'Essa métrica já está vinculada a esse alvo.' : 'Não foi possível criar o vínculo.'); return; }
    setGraph(() => result.graph, 'H7.36: vincular métrica'); showToast('Métrica vinculada ao serviço.');
  };
  const addReading = () => {
    if (!selected) return;
    const value = Number(reading);
    if (!Number.isFinite(value)) { showToast('Informe um valor numérico para a medição.'); return; }
    const result = recordServiceMetricMeasurement(graph, selected.id, value, new Date().toISOString(), readingNote);
    if (!result.created) { showToast('Não foi possível registrar a medição.'); return; }
    setGraph(() => result.graph, 'H7.36: registrar medição'); setReading(''); setReadingNote(''); showToast('Medição registrada.');
  };

  return <section className="bo-h736" data-service-outcomes="7.36">
    <header className="bo-h736-hero">
      <div><span className="bo-h736-kicker"><Activity size={14}/> H7.36 · METRICS & SERVICE OUTCOMES</span><h2>Meça se o serviço realmente melhorou.</h2><p>Conecte métricas a Proposição, Journey, Touchpoints, Handoffs, Blueprints e iniciativas. Registre baseline, meta e leituras reais para separar “entregamos uma mudança” de “produzimos um resultado”.</p></div>
      <div className="bo-h736-score"><strong>{report.outcomeScore}%</strong><span>outcome score</span><em>{report.counts.onTarget} na meta · {report.counts.offTarget} fora</em></div>
    </header>

    <div className="bo-h736-kpis">
      <article><small>MÉTRICAS</small><strong>{report.counts.metrics}</strong><span>{report.counts.measured} com leitura</span></article>
      <article><small>VÍNCULOS</small><strong>{report.counts.bindings}</strong><span>{report.counts.readings} medições históricas</span></article>
      <article className={report.counts.offTarget ? 'is-attention' : ''}><small>FORA DA META</small><strong>{report.counts.offTarget}</strong><span>{report.counts.onTarget} na meta</span></article>
      <article className={report.counts.implementedWithoutProof ? 'is-attention' : ''}><small>SEM PROVA</small><strong>{report.counts.implementedWithoutProof}</strong><span>iniciativas implementadas sem leitura</span></article>
    </div>

    <section className="bo-h736-coverage">
      <div><small>COBERTURA DO SERVIÇO</small><h3>Onde estamos medindo?</h3><p>Uma boa arquitetura de métricas cobre experiência, operação, promessa de valor e resultado da transformação.</p></div>
      <div className="bo-h736-coverage-grid">{report.coverage.map((item) => <article key={item.kind}><header><BlueOceanObjectIcon kind={item.kind === 'touchpoint' ? 'touchpoint' : item.kind === 'journey' ? 'journey' : item.kind === 'blueprint' ? 'blueprint' : item.kind === 'initiative' ? 'task' : item.kind === 'handoff' ? 'channel' : 'solution'} size={17}/><strong>{item.label}</strong><span>{item.covered}/{item.total}</span></header><div><i style={{ width: `${item.percent}%` }}/></div><small>{item.total ? `${item.percent}% coberto` : 'Nenhum alvo disponível'}</small></article>)}</div>
    </section>

    <section className="bo-h736-create"><div><small>NOVA MÉTRICA</small><strong>Adicione apenas o que orienta uma decisão.</strong></div><label><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createMetric(); }} placeholder="Ex.: Tempo médio de coleta"/><button type="button" className="primary" onClick={createMetric}><Plus size={14}/> Criar métrica</button></label></section>

    <section className="bo-h736-workbench">
      <div className="bo-h736-metrics">
        <header><div><small>MÉTRICAS CANÔNICAS</small><h3>Baseline → atual → meta</h3></div><span>{report.metrics.length}</span></header>
        <div>{report.metrics.map((metric) => <button type="button" key={metric.id} className={`${selected?.id === metric.id ? 'selected' : ''} is-${metric.status}`} onClick={() => setSelectedId(metric.id)}><div className="bo-h736-metric-head"><BlueOceanObjectIcon kind="metric" size={19}/><span><strong>{String(metric.title || metric.name || metric.id)}</strong><small>{metric.owner ? String(metric.owner) : 'Sem responsável'}</small></span><em>{metricStatusLabel(metric.status)}</em></div><div className="bo-h736-values"><span><small>BASE</small><b>{metric.baseline ?? '—'}{metric.unit ? ` ${metric.unit}` : ''}</b></span><span><small>ATUAL</small><b>{metric.current ?? '—'}{metric.unit ? ` ${metric.unit}` : ''}</b></span><span><small>META</small><b>{metric.target ?? '—'}{metric.unit ? ` ${metric.unit}` : ''}</b></span></div><footer><span>{metric.bindings.length} vínculo{metric.bindings.length === 1 ? '' : 's'}</span><span>{metric.progress === null ? 'progresso —' : `${metric.progress}% do caminho`}</span><span>{metric.trend === 'improving' ? '↑ melhorando' : metric.trend === 'worsening' ? '↓ piorando' : metric.trend === 'flat' ? '→ estável' : 'sem tendência'}</span></footer></button>)}</div>
        {!report.metrics.length && <div className="bo-h736-empty"><BlueOceanObjectIcon kind="metric" size={30}/><strong>Nenhuma métrica ainda</strong><p>Crie a primeira métrica para começar a provar outcomes do serviço.</p></div>}
      </div>

      <aside className="bo-h736-inspector">
        {selected ? <>
          <header><div><small>MÉTRICA</small><h3>{String(selected.title || selected.name || selected.id)}</h3></div><span className={`bo-h736-status is-${selected.status}`}>{metricStatusLabel(selected.status)}</span></header>
          <label><span>Nome</span><input value={String(selected.title || selected.name || '')} onChange={(event) => patch({ title: event.target.value })}/></label>
          <div className="bo-h736-two"><label><span>Responsável</span><input value={String(selected.owner || '')} onChange={(event) => patch({ owner: event.target.value })} placeholder="Responsável"/></label><label><span>Unidade</span><input value={selected.unit || ''} onChange={(event) => patch({ unit: event.target.value })} placeholder="%, min, pontos…"/></label></div>
          <label><span>Direção</span><select value={selected.direction} onChange={(event) => patch({ direction: event.target.value as ServiceMetricDirection })}>{(Object.keys(SERVICE_METRIC_DIRECTION_LABELS) as ServiceMetricDirection[]).map((value) => <option value={value} key={value}>{SERVICE_METRIC_DIRECTION_LABELS[value]}</option>)}</select></label>
          <div className="bo-h736-three"><label><span>Baseline</span><input type="number" value={numericOrBlank(selected.baseline)} onChange={(event) => patch({ baseline: event.target.value === '' ? '' : Number(event.target.value) })}/></label><label><span>Atual</span><input type="number" value={numericOrBlank(selected.current)} onChange={(event) => patch({ current: event.target.value === '' ? '' : Number(event.target.value) })}/></label><label><span>Meta</span><input type="number" value={numericOrBlank(selected.target)} onChange={(event) => patch({ target: event.target.value === '' ? '' : Number(event.target.value) })}/></label></div>

          <section className="bo-h736-reading"><strong><TrendingUp size={14}/> Registrar medição</strong><div><input type="number" value={reading} onChange={(event) => setReading(event.target.value)} placeholder="Valor observado"/><button type="button" onClick={addReading}>Registrar</button></div><input value={readingNote} onChange={(event) => setReadingNote(event.target.value)} placeholder="Nota opcional da leitura"/><small>{selected.readings.length ? `${selected.readings.length} leitura${selected.readings.length === 1 ? '' : 's'} no histórico` : 'Ainda sem histórico de medição.'}</small></section>

          <ServiceUsageRelations graph={graph} kind="metric" id={selected.id} title="Uso e relações da métrica" compact/>

          <section className="bo-h736-bind"><strong><Link2 size={14}/> Vincular métrica</strong><div className="bo-h736-two"><select value={targetKind} onChange={(event) => { const kind = event.target.value as ServiceMetricTargetKind; setTargetKind(kind); setTargetId(''); }}>{targetKinds.map((kind) => <option key={kind} value={kind}>{SERVICE_METRIC_TARGET_LABELS[kind]}</option>)}</select><select value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">{targets.length ? 'Selecionar alvo…' : 'Nenhum alvo disponível'}</option>{targets.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div><button type="button" className="primary" onClick={addBinding}><Plus size={13}/> Adicionar vínculo</button>
            <div className="bo-h736-binding-list">{selected.bindings.map((binding) => <article key={binding.id}><BlueOceanObjectIcon kind={binding.targetKind === 'touchpoint' ? 'touchpoint' : binding.targetKind === 'journey' ? 'journey' : binding.targetKind === 'blueprint' ? 'blueprint' : binding.targetKind === 'initiative' ? 'task' : binding.targetKind === 'handoff' ? 'channel' : 'solution'} size={15}/><span><b>{binding.targetLabel}</b><small>{SERVICE_METRIC_TARGET_LABELS[binding.targetKind]} · {SERVICE_METRIC_ROLE_LABELS[binding.role]}{binding.implicit ? ' · vínculo do Portfolio' : ''}</small></span>{!binding.implicit && <button type="button" title="Remover vínculo" onClick={() => setGraph((current) => unbindServiceMetric(current, binding.id), 'H7.36: remover vínculo')}><Trash2 size={13}/></button>}</article>)}</div>
          </section>
        </> : <div className="bo-h736-empty"><BlueOceanObjectIcon kind="metric" size={28}/><strong>Selecione uma métrica</strong><p>O Inspector mostra meta, leituras e vínculos do serviço.</p></div>}
      </aside>
    </section>

    <section className="bo-h736-outcomes"><header><div><small>INICIATIVA → RESULTADO REAL</small><h3>Entrega não é outcome.</h3><p>Uma iniciativa implementada só ganha evidência de resultado quando suas métricas têm leitura e meta comparáveis.</p></div><Target size={24}/></header><div>{report.initiativeOutcomes.map((item) => <article key={item.id} className={`is-${item.outcomeStatus}`}><div className="bo-h736-outcome-title"><BlueOceanObjectIcon kind="task" size={18}/><span><strong>{item.title}</strong><small>{item.status === 'implemented' ? 'Implementada' : item.status}</small></span>{item.implementedWithoutProof ? <AlertTriangle size={17}/> : item.outcomeStatus === 'achieved' ? <CheckCircle2 size={17}/> : <Activity size={17}/>}</div><p>{item.expectedOutcome || 'Resultado esperado não definido.'}</p><div className="bo-h736-outcome-metrics"><span><b>{item.linkedMetrics.length}</b> métricas</span><span><b>{item.measuredCount}</b> medidas</span><span><b>{item.achievedCount}</b> na meta</span></div><footer><strong>{outcomeStatusLabel(item.outcomeStatus)}</strong><span>{item.outcomeProgress === null ? 'Progresso de outcome não calculável' : `${item.outcomeProgress}% do caminho médio até a meta`}</span></footer></article>)}</div>{!report.initiativeOutcomes.length && <div className="bo-h736-empty"><BlueOceanObjectIcon kind="task" size={28}/><strong>Nenhuma iniciativa no Portfolio</strong><p>As iniciativas da H7.35 aparecerão aqui para comprovação de resultado.</p></div>}</section>
  </section>;
}

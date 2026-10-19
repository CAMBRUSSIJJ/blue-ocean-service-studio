import { ArrowRight, AlertTriangle, CheckCircle2, Gauge, ShieldCheck, Target, TrendingUp } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { StudioController } from '../state/useStudioController';
import { buildExecutiveServiceCockpitReport, type ExecutiveCockpitAction } from '../services/executive-service-cockpit';

const statusLabel = (status: string) => status === 'healthy' ? 'Saudável' : status === 'attention' ? 'Atenção' : 'Crítico';
const severityLabel = (severity: string) => severity === 'critical' ? 'Crítico' : severity === 'high' ? 'Alto' : severity === 'medium' ? 'Médio' : 'Baixo';
const areaLabel = (area: string) => area === 'priorities' ? 'Prioridades' : area === 'portfolio' ? 'Portfolio' : area === 'outcomes' ? 'Resultados' : area === 'governance' ? 'Governança' : area === 'operations' ? 'Operação' : 'Saúde';
const iconForArea = (area: string): 'problem' | 'task' | 'metric' | 'responsible' | 'system' | 'service' => area === 'priorities' ? 'problem' : area === 'portfolio' ? 'task' : area === 'outcomes' ? 'metric' : area === 'governance' ? 'responsible' : area === 'operations' ? 'system' : 'service';

function navigate(action: Pick<ExecutiveCockpitAction, 'targetTab'>) {
  window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: action.targetTab }));
}

export function ExecutiveServiceCockpitView({ studio }: { studio: StudioController }) {
  const report = buildExecutiveServiceCockpitReport(studio.graph);
  return <section className="bo-h739" data-executive-service-cockpit="7.39">
    <header className={`bo-h739-hero is-${report.status}`}>
      <div><small>H7.39 · EXECUTIVE SERVICE COCKPIT</small><h2>Saúde executiva do serviço</h2><p>{report.executiveSummary}</p><div className="bo-h739-hero-meta"><span>Atualizado agora</span>{report.nextReview && <span>Próxima revisão: <b>{report.nextReview.label}</b> · {report.nextReview.at}</span>}</div></div>
      <div className="bo-h739-score"><Gauge size={26}/><strong>{report.executiveScore}</strong><span>{statusLabel(report.status)}</span></div>
    </header>

    <section className="bo-h739-kpis">
      <article><span><BlueOceanObjectIcon kind="problem" size={19}/></span><div><small>PROBLEMAS ATIVOS</small><strong>{report.counts.activeProblems}</strong><p>{report.priorities.counts.critical} críticos · {report.priorities.counts.high} altos</p></div></article>
      <article><span><BlueOceanObjectIcon kind="task" size={19}/></span><div><small>INICIATIVAS ATIVAS</small><strong>{report.counts.activeInitiatives}</strong><p>{report.counts.overdueInitiatives} atrasadas · {report.portfolio.counts.blocked} bloqueadas</p></div></article>
      <article><span><Target size={19}/></span><div><small>OUTCOMES</small><strong>{report.outcomes.outcomeScore}%</strong><p>{report.counts.metricsOnTarget}/{report.counts.metrics} métricas na meta</p></div></article>
      <article><span><ShieldCheck size={19}/></span><div><small>GOVERNANÇA</small><strong>{report.governance.governanceScore}%</strong><p>{report.counts.governanceOverdue} revisões vencidas</p></div></article>
      <article><span><BlueOceanObjectIcon kind="system" size={19}/></span><div><small>OPERAÇÃO</small><strong>{report.operations.healthScore}%</strong><p>{report.operations.coveragePercent}% cobertura · {report.counts.operationsErrors} erros</p></div></article>
    </section>

    <section className="bo-h739-grid">
      <article className="bo-h739-panel bo-h739-health"><header><div><small>SAÚDE POR DIMENSÃO</small><h3>Onde o serviço está forte — e onde está frágil</h3></div><TrendingUp size={21}/></header><div className="bo-h739-dimensions">{report.dimensions.map((item) => <div key={item.id}><div><strong>{item.label}</strong><span>{item.score}%</span></div><div className="bo-h739-bar"><i style={{ width: `${item.score}%` }}/></div><small>{item.detail}</small></div>)}</div></article>
      <article className="bo-h739-panel bo-h739-risks"><header><div><small>RISCOS EXECUTIVOS</small><h3>O que pode comprometer o serviço agora</h3></div><AlertTriangle size={21}/></header>{report.topRisks.length ? <div>{report.topRisks.map((item) => <button key={item.id} type="button" onClick={() => navigate(item)} className={`is-${item.severity}`}><span><BlueOceanObjectIcon kind={iconForArea(item.area)} size={16}/></span><div><small>{areaLabel(item.area)} · {severityLabel(item.severity)}</small><strong>{item.title}</strong><p>{item.detail}</p></div><ArrowRight size={15}/></button>)}</div> : <div className="bo-h739-empty"><CheckCircle2 size={24}/><strong>Nenhum risco alto detectado</strong><p>Não há riscos críticos ou altos nos sinais consolidados do Cockpit.</p></div>}</article>
    </section>

    <section className="bo-h739-panel bo-h739-actions"><header><div><small>AGENDA EXECUTIVA</small><h3>Próximas ações recomendadas</h3><p>Ordenadas deterministicamente por severidade, impacto operacional e urgência.</p></div><span>{report.counts.openActions} itens</span></header>{report.topActions.length ? <div className="bo-h739-action-list">{report.topActions.map((item, index) => <button type="button" key={item.id} onClick={() => navigate(item)}><em>{index + 1}</em><span className={`severity is-${item.severity}`}>{severityLabel(item.severity)}</span><div><small>{areaLabel(item.area)}</small><strong>{item.title}</strong><p>{item.detail}</p></div><ArrowRight size={15}/></button>)}</div> : <div className="bo-h739-empty"><CheckCircle2 size={24}/><strong>Agenda executiva limpa</strong><p>Nenhuma ação prioritária foi encontrada no estado atual do serviço.</p></div>}</section>

    <section className="bo-h739-grid bo-h739-grid--bottom">
      <article className="bo-h739-panel"><header><div><small>PORTFOLIO</small><h3>Transformação em andamento</h3></div><BlueOceanObjectIcon kind="task" size={20}/></header><div className="bo-h739-stat-row"><span><b>{report.portfolio.averageProgress}%</b> progresso médio</span><span><b>{report.portfolio.counts.inProgress}</b> em execução</span><span><b>{report.portfolio.counts.validating}</b> validando</span><span><b>{report.portfolio.counts.implemented}</b> implementadas</span></div><button type="button" className="bo-h739-link" onClick={() => navigate({targetTab:'portfolio'})}>Abrir Portfolio <ArrowRight size={14}/></button></article>
      <article className="bo-h739-panel"><header><div><small>RESULTADOS</small><h3>A melhoria está funcionando?</h3></div><Target size={20}/></header><div className="bo-h739-stat-row"><span><b>{report.outcomes.counts.onTarget}</b> na meta</span><span><b>{report.outcomes.counts.offTarget}</b> fora da meta</span><span><b>{report.outcomes.counts.implementedWithoutProof}</b> sem prova</span><span><b>{report.outcomes.counts.readings}</b> leituras</span></div><button type="button" className="bo-h739-link" onClick={() => navigate({targetTab:'outcomes'})}>Abrir Resultados <ArrowRight size={14}/></button></article>
    </section>
  </section>;
}

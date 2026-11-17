/**
 * ServiceHealthWidget — C2.2
 * Compact unified health summary for the overview tab.
 * Shows executive score, top risks and key KPIs without navigating to Cockpit.
 */
import { AlertTriangle, CheckCircle2, Gauge, ArrowRight } from '../design-system/icons';
import type { ServiceGraph } from '../domain/model';
import { buildExecutiveServiceCockpitReport } from '../services/executive-service-cockpit';

function navigate(tab: string) {
  window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: tab }));
}

type Props = { graph: ServiceGraph };

export function ServiceHealthWidget({ graph }: Props) {
  const report = buildExecutiveServiceCockpitReport(graph);
  const statusLabel = report.status === 'healthy' ? 'Saudável' : report.status === 'attention' ? 'Atenção' : 'Crítico';
  const topRisks = report.topRisks.slice(0, 2);
  const areaLabel = (area: string) =>
    area === 'priorities' ? 'Prioridades' : area === 'portfolio' ? 'Portfolio' : area === 'outcomes' ? 'Resultados' : area === 'governance' ? 'Governança' : area === 'operations' ? 'Operação' : 'Saúde';

  return (
    <section className="bo-c2-health-widget" data-service-health-widget="c2.2" aria-label="Saúde do serviço">
      <header className="bo-c2-health-widget__header">
        <div className="bo-c2-health-widget__score-row">
          <span className={`bo-c2-health-score is-${report.status}`}>
            <Gauge size={16} />
            <strong>{report.executiveScore}</strong>
            <em>{statusLabel}</em>
          </span>
          <div className="bo-c2-health-widget__kpis">
            <span title="Problemas ativos"><strong>{report.counts.activeProblems}</strong> problemas</span>
            <span title="Iniciativas ativas"><strong>{report.counts.activeInitiatives}</strong> iniciativas</span>
            <span title="Métricas na meta"><strong>{report.counts.metricsOnTarget}/{report.counts.metrics}</strong> métricas</span>
            <span title="Governança"><strong>{report.governance.governanceScore}%</strong> gov.</span>
          </div>
        </div>
        <p className="bo-c2-health-summary">{report.executiveSummary}</p>
      </header>

      {topRisks.length > 0 ? (
        <div className="bo-c2-health-risks">
          <small>RISCOS ATIVOS</small>
          <ul>
            {topRisks.map((risk) => (
              <li key={risk.id} className={`is-${risk.severity}`}>
                <AlertTriangle size={12} />
                <span>
                  <strong>{risk.title}</strong>
                  <em>{areaLabel(risk.area)}</em>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bo-c2-health-clear">
          <CheckCircle2 size={14} />
          <span>Nenhum risco crítico detectado</span>
        </div>
      )}

      <button type="button" className="bo-c2-health-cta" onClick={() => navigate('cockpit')}>
        Cockpit executivo completo <ArrowRight size={13} />
      </button>
    </section>
  );
}

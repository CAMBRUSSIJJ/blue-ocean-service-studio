import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowRight, CheckCircle2, CircleHelp, FlaskConical, RotateCcw, Sparkles, XCircle } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { Id, LearningConfidence, LearningRecommendation } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import {
  buildLearningSystemReport, LEARNING_CONFIDENCE_LABELS, LEARNING_RECOMMENDATION_LABELS,
  LEARNING_VERDICT_LABELS, materializeExperimentLearning, setLearningStatus, updateLearningRecord,
} from '../services/evidence-learning-system';

const verdictIcon = (verdict: string) => verdict === 'validated'
  ? <CheckCircle2 size={16}/>
  : verdict === 'refuted' ? <XCircle size={16}/> : <CircleHelp size={16}/>;

export function ServiceLearningView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const report = useMemo(() => buildLearningSystemReport(graph), [graph]);
  const [selectedId, setSelectedId] = useState<Id | null>(report.activeLearningId ?? null);
  const selected = selectedId ? report.records.find((record) => record.id === selectedId) ?? null : null;

  useEffect(() => {
    if (selectedId && report.records.some((record) => record.id === selectedId)) return;
    setSelectedId(report.activeLearningId ?? null);
  }, [report.activeLearningId, report.records, selectedId]);

  const createLearning = (experimentId: Id) => {
    const result = materializeExperimentLearning(graph, experimentId);
    if (!result.learningId) { showToast(result.reason || 'Não foi possível gerar o aprendizado.'); return; }
    setGraph(() => result.graph, 'H7.31: materializar evidência e aprendizado');
    setSelectedId(result.learningId);
    showToast(result.created ? 'Evidências e aprendizado criados a partir do experimento.' : result.reason || 'Aprendizado aberto.');
  };

  const updateSelected = (patch: Parameters<typeof updateLearningRecord>[2], label: string) => {
    if (!selected) return;
    setGraph((current) => updateLearningRecord(current, selected.id, patch), `H7.31: ${label}`);
  };

  const openWorkspace = (tab: string) => window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: tab }));

  return <section className="bo-h731-learning" data-evidence-learning-system="7.31">
    <header className="bo-h731-head">
      <div><span className="bo-h731-eyebrow"><Sparkles size={14}/> H7.31 · EVIDENCE & LEARNING SYSTEM</span><h2>Experimento vira evidência. Evidência vira aprendizado.</h2><p>Consolide resultados do Prototype Lab em evidências canônicas, registre o que a hipótese ensinou e prepare a próxima decisão sem alterar automaticamente Journey, Proposição, Canais ou Blueprint.</p></div>
      <button type="button" onClick={() => openWorkspace('prototypes')}><FlaskConical size={15}/> Abrir Prototype Lab</button>
    </header>

    <div className="bo-h731-kpis">
      <article><small>EXPERIMENTOS CONCLUÍDOS</small><strong>{report.counts.completedExperiments}</strong><span>{report.counts.pending} aguardando aprendizado</span></article>
      <article className={report.counts.evidence ? 'is-good' : ''}><small>EVIDÊNCIAS GERADAS</small><strong>{report.counts.evidence}</strong><span>Fonte canônica: experimento</span></article>
      <article><small>APRENDIZADOS</small><strong>{report.counts.learnings}</strong><span>{report.counts.reviewed} revisados</span></article>
      <article className={report.learningCoverage === 100 && report.counts.completedExperiments ? 'is-good' : ''}><small>COBERTURA DE APRENDIZADO</small><strong>{report.learningCoverage}%</strong><span>rodadas concluídas processadas</span></article>
    </div>

    {report.pendingExperiments.length > 0 && <section className="bo-h731-pending">
      <div className="bo-h731-section-title"><div><small>EXPERIMENTOS A PROCESSAR</small><h3>Transformar resultado em conhecimento</h3></div><span>Nada é aplicado ao serviço sem decisão explícita.</span></div>
      <div className="bo-h731-pending-grid">{report.pendingExperiments.map((experiment) => <article key={experiment.id}>
        <span><BlueOceanObjectIcon kind="experiment" size={20}/></span><div><small>{experiment.outcome === 'passed' ? 'PASSOU' : experiment.outcome === 'failed' ? 'FALHOU' : 'INCONCLUSIVO'}</small><strong>{experiment.title}</strong><p>{experiment.hypothesis || 'Hipótese não registrada'}</p><em>{experiment.criteria.filter((item) => item.result !== 'pending').length}/{experiment.criteria.length} critérios avaliados · {experiment.participantCount} participantes</em></div><button type="button" onClick={() => createLearning(experiment.id)}>Gerar evidência + aprendizado <ArrowRight size={13}/></button>
      </article>)}</div>
    </section>}

    {!report.pendingExperiments.length && report.counts.completedExperiments > 0 && <div className="bo-h731-all-processed"><CheckCircle2 size={16}/><span>Todas as rodadas concluídas já possuem aprendizado materializado.</span></div>}

    <div className="bo-h731-workspace">
      <aside className="bo-h731-list">
        <header><div><strong>Aprendizados</strong><span>Histórico explícito de validação</span></div><em>{report.records.length}</em></header>
        {report.records.map((record) => <button key={record.id} type="button" className={selected?.id === record.id ? 'active' : ''} onClick={() => setSelectedId(record.id)}>
          <span className="bo-h731-list-icon"><BlueOceanObjectIcon kind="insight" size={16}/></span><div><small>{LEARNING_VERDICT_LABELS[record.verdict]}</small><strong>{record.hypothesisSnapshot || 'Hipótese sem texto'}</strong><p>{record.summary}</p><em>{record.evidenceIds.length} evidência{record.evidenceIds.length === 1 ? '' : 's'} · confiança {LEARNING_CONFIDENCE_LABELS[record.confidence].toLowerCase()}</em></div><i data-verdict={record.verdict}>{verdictIcon(record.verdict)}</i>
        </button>)}
        {!report.records.length && <div className="bo-h731-empty"><BlueOceanObjectIcon kind="insight" size={26}/><strong>Nenhum aprendizado ainda</strong><p>Conclua um experimento e materialize a rodada acima.</p></div>}
      </aside>

      {selected ? <main className="bo-h731-editor">
        <header className="bo-h731-editor-head"><div><small>APRENDIZADO DE EXPERIMENTO</small><h3>{selected.hypothesisSnapshot || 'Hipótese sem texto'}</h3><span data-verdict={selected.verdict}>{verdictIcon(selected.verdict)} {LEARNING_VERDICT_LABELS[selected.verdict]}</span></div><div>
          {selected.status !== 'reviewed' ? <button type="button" className="primary" onClick={() => setGraph((current) => setLearningStatus(current, selected.id, 'reviewed'), 'H7.31: revisar aprendizado')}><CheckCircle2 size={14}/> Marcar como revisado</button> : <button type="button" onClick={() => setGraph((current) => setLearningStatus(current, selected.id, 'draft'), 'H7.31: reabrir aprendizado')}><RotateCcw size={14}/> Reabrir</button>}
          <button type="button" title="Arquivar aprendizado" onClick={() => setGraph((current) => setLearningStatus(current, selected.id, 'archived'), 'H7.31: arquivar aprendizado')}><Archive size={14}/></button>
        </div></header>

        <section className="bo-h731-source"><div className="bo-h731-section-title"><div><small>PROVENIÊNCIA</small><h3>Resultado capturado</h3></div><span>Snapshot da rodada; não depende de futuras edições do experimento.</span></div><div className="bo-h731-source-grid">
          <article><small>RESULTADO</small><strong>{LEARNING_VERDICT_LABELS[selected.verdict]}</strong><span>Origem: {selected.experimentOutcome}</span></article>
          <article><small>CONFIANÇA</small><select value={selected.confidence} onChange={(event) => updateSelected({ confidence: event.target.value as LearningConfidence }, 'alterar confiança')}>{(Object.keys(LEARNING_CONFIDENCE_LABELS) as LearningConfidence[]).map((value) => <option key={value} value={value}>{LEARNING_CONFIDENCE_LABELS[value]}</option>)}</select><span>Determinada inicialmente por critérios, participantes e observações.</span></article>
          <article><small>RECOMENDAÇÃO</small><select value={selected.recommendation} onChange={(event) => updateSelected({ recommendation: event.target.value as LearningRecommendation }, 'alterar recomendação')}>{(Object.keys(LEARNING_RECOMMENDATION_LABELS) as LearningRecommendation[]).map((value) => <option key={value} value={value}>{LEARNING_RECOMMENDATION_LABELS[value]}</option>)}</select><span>É uma decisão sobre o aprendizado, não uma alteração automática.</span></article>
          <article><small>STATUS</small><strong>{selected.status === 'reviewed' ? 'Revisado' : 'Em análise'}</strong><span>{selected.reviewedAt ? `Revisado em ${new Date(selected.reviewedAt).toLocaleDateString('pt-BR')}` : 'Aguardando revisão humana'}</span></article>
        </div></section>

        <section className="bo-h731-writing"><div className="bo-h731-section-title"><div><small>SÍNTESE</small><h3>O que aprendemos?</h3></div><span>Edite a leitura humana antes de revisar.</span></div><label><span>Aprendizado</span><textarea value={selected.summary} onChange={(event) => updateSelected({ summary: event.target.value }, 'editar síntese')}/></label><label><span>Racional / implicação</span><textarea value={selected.rationale ?? ''} onChange={(event) => updateSelected({ rationale: event.target.value }, 'editar racional')} placeholder="Por que esse resultado importa? O que precisa ser considerado na próxima decisão?"/></label></section>

        <section className="bo-h731-evidence"><div className="bo-h731-section-title"><div><small>EVIDÊNCIA CANÔNICA</small><h3>{selected.evidenceIds.length} registros vinculados</h3></div><button type="button" onClick={() => openWorkspace('research')}><BlueOceanObjectIcon kind="evidence" size={14}/> Abrir Pesquisa</button></div><div className="bo-h731-evidence-grid">{selected.evidenceIds.map((evidenceId) => { const evidence = graph.entities?.evidence?.[evidenceId]; return evidence ? <article key={evidenceId}><span><BlueOceanObjectIcon kind="evidence" size={16}/></span><div><small>{String(evidence.sourceType ?? 'experiment').toUpperCase()}</small><strong>{String(evidence.title ?? 'Evidência')}</strong><p>{String(evidence.description ?? '')}</p><em>{String(evidence.sourceName ?? 'Service Prototype Lab')}</em></div></article> : null; })}</div></section>

        <footer className="bo-h731-guard"><CircleHelp size={15}/><div><strong>Próxima etapa: decisão explícita</strong><span>A H7.31 registra conhecimento. Journey, Proposição, Canais e Blueprint continuam intocados; a aplicação de mudanças pertence ao Decision & Iteration Loop da H7.32.</span></div></footer>
      </main> : <main className="bo-h731-empty is-main"><BlueOceanObjectIcon kind="insight" size={32}/><strong>Selecione um aprendizado</strong><p>Ou processe um experimento concluído para criar o primeiro.</p></main>}
    </div>
  </section>;
}

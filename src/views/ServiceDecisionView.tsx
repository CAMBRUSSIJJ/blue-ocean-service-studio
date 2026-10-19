import { useEffect, useMemo, useState } from 'react';
import { Archive, ArrowRight, CheckCircle2, CircleHelp, GitPullRequest, Plus, RefreshCw, RotateCcw, ShieldCheck, Trash2, XCircle } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { Id, ServiceDecisionTargetKind } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import {
  addDecisionChange, applyApprovedDecision, archiveDecision, buildDecisionLoopReport, createDecisionFromLearning,
  DECISION_STATUS_LABELS, DECISION_TARGET_FIELDS, DECISION_TARGET_LABELS, DECISION_VALUE_OPTIONS, decideServiceChange, removeDecisionChange,
  reopenDecision, submitDecision, updateDecisionRecord,
} from '../services/decision-iteration-loop';

const statusIcon = (status: string) => status === 'applied' || status === 'approved'
  ? <CheckCircle2 size={16}/>
  : status === 'rejected' ? <XCircle size={16}/> : status === 'proposed' ? <GitPullRequest size={16}/> : <CircleHelp size={16}/>;

export function ServiceDecisionView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const report = useMemo(() => buildDecisionLoopReport(graph), [graph]);
  const journeys = useMemo(() => graph.service.journeyIds.map((id) => graph.journeys[id]).filter(Boolean), [graph]);
  const blueprints = useMemo(() => Object.values(graph.views.whiteboards ?? {}).filter((board) => board.viewKind === 'blueprint'), [graph]);
  const [selectedId, setSelectedId] = useState<Id | null>(report.activeDecisionId ?? null);
  const [targetKind, setTargetKind] = useState<ServiceDecisionTargetKind>('proposition');
  const [targetId, setTargetId] = useState<Id>('');
  const [field, setField] = useState(DECISION_TARGET_FIELDS.proposition[0].value);
  const [proposedValue, setProposedValue] = useState('');
  const [decidedBy, setDecidedBy] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const selected = selectedId ? report.records.find((record) => record.id === selectedId) ?? null : null;

  useEffect(() => {
    if (selectedId && report.records.some((record) => record.id === selectedId)) return;
    setSelectedId(report.activeDecisionId ?? report.records[0]?.id ?? null);
  }, [report.activeDecisionId, report.records, selectedId]);

  useEffect(() => {
    setField(DECISION_TARGET_FIELDS[targetKind][0].value);
    setProposedValue('');
    if (targetKind === 'journey') setTargetId(journeys[0]?.id ?? '');
    else if (targetKind === 'blueprint') setTargetId(blueprints[0]?.id ?? '');
    else setTargetId('');
  }, [targetKind, journeys, blueprints]);

  const createDecision = (learningId: Id) => {
    const result = createDecisionFromLearning(graph, learningId);
    if (!result.decisionId) { showToast(result.reason || 'Não foi possível abrir a decisão.'); return; }
    setGraph(() => result.graph, 'H7.32: criar decisão a partir do aprendizado');
    setSelectedId(result.decisionId);
    showToast(result.created ? 'Decisão criada a partir do aprendizado revisado.' : result.reason || 'Decisão aberta.');
  };

  const addChange = () => {
    if (!selected) return;
    const result = addDecisionChange(graph, selected.id, { targetKind, targetId: targetKind === 'proposition' ? undefined : targetId, field, proposedValue });
    if (!result.changeId) { showToast(result.reason || 'Não foi possível adicionar a mudança.'); return; }
    setGraph(() => result.graph, 'H7.32: adicionar mudança proposta');
    setProposedValue('');
    showToast('Mudança adicionada ao pacote de decisão.');
  };

  const submit = () => {
    if (!selected) return;
    const result = submitDecision(graph, selected.id);
    if (!result.submitted) { showToast(result.reason || 'Não foi possível enviar para aprovação.'); return; }
    setGraph(() => result.graph, 'H7.32: enviar decisão para aprovação');
    showToast('Decisão enviada para aprovação.');
  };

  const decide = (outcome: 'approved' | 'rejected') => {
    if (!selected) return;
    const result = decideServiceChange(graph, selected.id, outcome, { decidedBy, decisionNote });
    if (!result.decided) { showToast(result.reason || 'Não foi possível registrar a decisão.'); return; }
    setGraph(() => result.graph, `H7.32: decisão ${outcome}`);
    showToast(outcome === 'approved' ? 'Mudança aprovada. Ela ainda não foi aplicada.' : 'Mudança rejeitada e preservada no histórico.');
  };

  const apply = () => {
    if (!selected) return;
    const result = applyApprovedDecision(graph, selected.id);
    setGraph(() => result.graph, 'H7.32: aplicar mudança aprovada');
    if (result.conflict) { showToast(result.reason || 'Aplicação bloqueada por conflito.'); return; }
    if (!result.applied) { showToast(result.reason || 'Não foi possível aplicar a decisão.'); return; }
    showToast('Mudança aprovada aplicada ao serviço com rastreabilidade.');
  };

  return <section className="bo-h732" data-decision-iteration-loop="7.32">
    <header className="bo-h732-hero">
      <div><span className="bo-h732-kicker"><GitPullRequest size={14}/> H7.32 · DECISION & ITERATION LOOP</span><h2>Aprendizado vira decisão. Decisão vira mudança controlada.</h2><p>Proponha alterações, submeta para aprovação e só então aplique no serviço. O Blue Ocean bloqueia sobrescritas quando o alvo mudou depois da proposta.</p></div>
      <div className="bo-h732-score"><strong>{report.counts.applied}</strong><span>mudanças aplicadas</span><em>{report.counts.proposed} aguardando aprovação · {report.counts.conflicts} conflito{report.counts.conflicts === 1 ? '' : 's'}</em></div>
    </header>

    <div className="bo-h732-kpis">
      <article><span><BlueOceanObjectIcon kind="insight" size={18}/></span><strong>{report.counts.eligible}</strong><small>aprendizados prontos</small></article>
      <article><span><GitPullRequest size={18}/></span><strong>{report.counts.decisions}</strong><small>decisões abertas</small></article>
      <article><span><ShieldCheck size={18}/></span><strong>{report.counts.approved}</strong><small>aprovadas não aplicadas</small></article>
      <article><span><CheckCircle2 size={18}/></span><strong>{report.counts.applied}</strong><small>aplicadas</small></article>
    </div>

    {report.eligibleLearnings.length > 0 && <section className="bo-h732-ready">
      <div className="bo-h732-section-title"><div><small>APRENDIZADOS PRONTOS PARA DECISÃO</small><h3>Escolha o que precisa mudar</h3></div><span>Somente aprendizados revisados entram no loop.</span></div>
      <div className="bo-h732-ready-grid">{report.eligibleLearnings.map((learning) => <article key={learning.id}><span><BlueOceanObjectIcon kind="insight" size={19}/></span><div><small>{learning.recommendation.toUpperCase()} · CONFIANÇA {learning.confidence.toUpperCase()}</small><strong>{learning.hypothesisSnapshot || 'Aprendizado de experimento'}</strong><p>{learning.summary}</p></div><button type="button" onClick={() => createDecision(learning.id)}>Abrir decisão <ArrowRight size={13}/></button></article>)}</div>
    </section>}

    <div className="bo-h732-workspace">
      <aside className="bo-h732-list">
        <header><div><strong>Decisões</strong><span>Do aprendizado à aplicação</span></div><em>{report.records.length}</em></header>
        {report.records.map((record) => <button key={record.id} type="button" className={selected?.id === record.id ? 'active' : ''} onClick={() => setSelectedId(record.id)}>
          <span className="bo-h732-list-icon"><GitPullRequest size={15}/></span><div><small>{DECISION_STATUS_LABELS[record.status]}</small><strong>{record.title}</strong><p>{record.rationale || record.learningSummarySnapshot}</p><em>{record.changes.length} mudança{record.changes.length === 1 ? '' : 's'}</em></div><i data-status={record.status}>{statusIcon(record.status)}</i>
        </button>)}
        {!report.records.length && <div className="bo-h732-empty"><GitPullRequest size={28}/><strong>Nenhuma decisão ainda</strong><p>Revise um aprendizado na etapa anterior e abra sua primeira decisão.</p></div>}
      </aside>

      {selected ? <main className="bo-h732-editor">
        <header className="bo-h732-editor-head"><div><small>DECISÃO DE SERVIÇO</small><h3>{selected.title}</h3><span data-status={selected.status}>{statusIcon(selected.status)} {DECISION_STATUS_LABELS[selected.status]}</span></div><div>
          {selected.status === 'draft' && <button type="button" className="primary" onClick={submit}><GitPullRequest size={14}/> Enviar para aprovação</button>}
          {selected.status === 'proposed' && <><button type="button" onClick={() => decide('rejected')}><XCircle size={14}/> Rejeitar</button><button type="button" className="primary" onClick={() => decide('approved')}><CheckCircle2 size={14}/> Aprovar</button></>}
          {selected.status === 'approved' && <button type="button" className="primary" onClick={apply}><ShieldCheck size={14}/> Aplicar mudança aprovada</button>}
          {(selected.status === 'rejected' || (selected.status === 'approved' && selected.applicationResult === 'conflict')) && <button type="button" onClick={() => setGraph((current) => reopenDecision(current, selected.id), 'H7.32: reabrir decisão')}><RotateCcw size={14}/> Reabrir</button>}
          {!['applied','archived'].includes(selected.status) && <button type="button" title="Arquivar decisão" onClick={() => setGraph((current) => archiveDecision(current, selected.id), 'H7.32: arquivar decisão')}><Archive size={14}/></button>}
        </div></header>

        <section className="bo-h732-context"><div className="bo-h732-section-title"><div><small>BASE DA DECISÃO</small><h3>Por que estamos mudando?</h3></div><span>Snapshot do aprendizado que originou esta decisão.</span></div><div className="bo-h732-context-grid">
          <article><small>RECOMENDAÇÃO</small><strong>{selected.recommendationSnapshot}</strong></article>
          <article><small>CONFIANÇA</small><strong>{selected.confidenceSnapshot}</strong></article>
          <article className="wide"><small>APRENDIZADO</small><p>{selected.learningSummarySnapshot}</p></article>
        </div></section>

        {selected.status === 'draft' && <section className="bo-h732-writing"><div className="bo-h732-section-title"><div><small>PROPOSTA</small><h3>Defina a decisão e o racional</h3></div><span>O pacote fica congelado quando enviado para aprovação.</span></div><label><span>Título</span><input value={selected.title} onChange={(event) => setGraph((current) => updateDecisionRecord(current, selected.id, { title: event.target.value }), 'H7.32: editar título da decisão')}/></label><label><span>Racional</span><textarea value={selected.rationale} onChange={(event) => setGraph((current) => updateDecisionRecord(current, selected.id, { rationale: event.target.value }), 'H7.32: editar racional da decisão')}/></label></section>}

        <section className="bo-h732-changes"><div className="bo-h732-section-title"><div><small>PACOTE DE MUDANÇAS</small><h3>{selected.changes.length} mudança{selected.changes.length === 1 ? '' : 's'} proposta{selected.changes.length === 1 ? '' : 's'}</h3></div><span>Cada item registra antes → depois.</span></div>
          {selected.status === 'draft' && <div className="bo-h732-change-builder">
            <label><span>Alvo</span><select value={targetKind} onChange={(event) => setTargetKind(event.target.value as ServiceDecisionTargetKind)}>{(Object.keys(DECISION_TARGET_LABELS) as ServiceDecisionTargetKind[]).map((kind) => <option key={kind} value={kind}>{DECISION_TARGET_LABELS[kind]}</option>)}</select></label>
            {targetKind !== 'proposition' && <label><span>{DECISION_TARGET_LABELS[targetKind]}</span><select value={targetId} onChange={(event) => setTargetId(event.target.value)}>{targetKind === 'journey' ? journeys.map((journey) => <option key={journey.id} value={journey.id}>{journey.name}</option>) : blueprints.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}</select></label>}
            <label><span>Campo</span><select value={field} onChange={(event) => { setField(event.target.value); setProposedValue(''); }}>{DECISION_TARGET_FIELDS[targetKind].map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="grow"><span>Novo valor</span>{DECISION_VALUE_OPTIONS[`${targetKind}:${field}`] ? <select value={proposedValue} onChange={(event) => setProposedValue(event.target.value)}><option value="">Selecione</option>{DECISION_VALUE_OPTIONS[`${targetKind}:${field}`].map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input value={proposedValue} onChange={(event) => setProposedValue(event.target.value)} placeholder="Valor que será aplicado somente após aprovação"/>}</label>
            <button type="button" className="primary" onClick={addChange}><Plus size={14}/> Adicionar</button>
          </div>}
          <div className="bo-h732-change-list">{selected.changes.map((change) => <article key={change.id}><span><BlueOceanObjectIcon kind={change.targetKind === 'journey' ? 'journey' : change.targetKind === 'blueprint' ? 'blueprint' : 'solution'} size={18}/></span><div><small>{DECISION_TARGET_LABELS[change.targetKind]} · {change.targetLabel} · {change.field}</small><p><del>{change.beforeValue || '—'}</del><ArrowRight size={13}/><strong>{change.proposedValue || '—'}</strong></p></div>{selected.status === 'draft' && <button type="button" title="Remover mudança" onClick={() => setGraph((current) => removeDecisionChange(current, selected.id, change.id), 'H7.32: remover mudança')}><Trash2 size={14}/></button>}</article>)}</div>
        </section>

        {selected.status === 'proposed' && <section className="bo-h732-approval"><div className="bo-h732-section-title"><div><small>APROVAÇÃO HUMANA</small><h3>Registrar decisão</h3></div><span>A aprovação não aplica a mudança automaticamente.</span></div><div><label><span>Decidido por</span><input value={decidedBy} onChange={(event) => setDecidedBy(event.target.value)} placeholder="Nome ou papel responsável"/></label><label><span>Nota da decisão</span><textarea value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} placeholder="Motivo da aprovação ou rejeição"/></label></div></section>}

        {selected.applicationResult === 'conflict' && <div className="bo-h732-conflict"><RefreshCw size={17}/><div><strong>Aplicação bloqueada por conflito</strong><span>{selected.applicationNote}</span><small>Reabra a decisão para recapturar os valores atuais antes de propor novamente.</small></div></div>}
        {selected.status === 'applied' && <div className="bo-h732-applied"><CheckCircle2 size={17}/><div><strong>Mudança aplicada com rastreabilidade</strong><span>{selected.applicationNote}</span><small>O aprendizado, a aprovação e o pacote antes → depois permanecem preservados.</small></div></div>}

        <footer className="bo-h732-guard"><ShieldCheck size={16}/><div><strong>Controle de mudança</strong><span>Nenhuma decisão é aplicada ao criar, editar ou aprovar. A alteração só ocorre na ação explícita “Aplicar mudança aprovada” e é bloqueada se o estado atual divergir do snapshot.</span></div></footer>
      </main> : <main className="bo-h732-empty is-main"><GitPullRequest size={32}/><strong>Selecione uma decisão</strong><p>Ou transforme um aprendizado revisado em uma proposta de mudança.</p></main>}
    </div>
  </section>;
}

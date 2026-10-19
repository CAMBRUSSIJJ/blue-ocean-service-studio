import { useEffect, useMemo, useState } from 'react';
import {
  Archive, Beaker, CheckCircle2, CircleHelp, Clock3, FlaskConical, Link2, Play, Plus,
  RefreshCw, RotateCcw, Trash2, Users, XCircle,
} from '../design-system/icons';
import type { Id, PrototypeCriterionResult, PrototypeExperimentOutcome, PrototypeFidelity } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import {
  addPrototypeCriterion, addPrototypeObservation, addPrototypeParticipant, archivePrototypeExperiment,
  buildPrototypeLabReport, completePrototypeExperiment, createPrototypeExperiment, PROTOTYPE_FIDELITY_META,
  PROTOTYPE_OUTCOME_LABELS, refreshPrototypeSnapshot, removePrototypeCriterion, reopenPrototypeExperiment,
  setPrototypeCriterionResult, startPrototypeExperiment, unlinkPrototypeParticipant, updatePrototypeCriterion,
  updatePrototypeExperiment,
} from '../services/service-prototype-lab';

const outcomeIcon = (outcome: PrototypeExperimentOutcome) => outcome === 'passed'
  ? <CheckCircle2 size={16}/>
  : outcome === 'failed' ? <XCircle size={16}/> : <CircleHelp size={16}/>;

const statusLabel: Record<string, string> = {
  draft: 'Rascunho', ready: 'Pronto para testar', running: 'Em execução', completed: 'Concluído', archived: 'Arquivado',
};

export function ServicePrototypeLabView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const report = useMemo(() => buildPrototypeLabReport(graph), [graph]);
  const journeys = useMemo(() => graph.service.journeyIds.map((id) => graph.journeys[id]).filter(Boolean), [graph]);
  const scenarios = useMemo(() => Object.values(graph.service.scenarios ?? {}).filter((scenario) => scenario.kind === 'alternative'), [graph.service.scenarios]);
  const [selectedId, setSelectedId] = useState<Id | null>(report.activeExperimentId ?? null);
  const [creating, setCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftHypothesis, setDraftHypothesis] = useState('');
  const [draftFidelity, setDraftFidelity] = useState<PrototypeFidelity>('conversation');
  const [draftJourneyId, setDraftJourneyId] = useState<Id>(journeys[0]?.id ?? '');
  const [draftScenarioId, setDraftScenarioId] = useState<Id>('');
  const [participantName, setParticipantName] = useState('');
  const [participantRole, setParticipantRole] = useState('');
  const [criterionLabel, setCriterionLabel] = useState('');
  const [criterionTarget, setCriterionTarget] = useState('');
  const [observation, setObservation] = useState('');

  useEffect(() => {
    if (selectedId && report.experiments.some((experiment) => experiment.id === selectedId)) return;
    setSelectedId(report.activeExperimentId ?? report.experiments[0]?.id ?? null);
  }, [report.activeExperimentId, report.experiments, selectedId]);

  useEffect(() => {
    if (!draftJourneyId && journeys[0]?.id) setDraftJourneyId(journeys[0].id);
  }, [draftJourneyId, journeys]);

  const selected = report.experiments.find((experiment) => experiment.id === selectedId) ?? null;
  const participants = selected?.participantIds.map((id) => report.lab.participants[id]).filter(Boolean) ?? [];

  const createExperiment = () => {
    const title = draftTitle.trim();
    if (!title) { showToast('Informe um nome para o experimento.'); return; }
    const journey = draftJourneyId ? graph.journeys[draftJourneyId] : undefined;
    const stageIds = journey?.stageIds ?? [];
    const touchpointIds = stageIds.flatMap((stageId) => graph.stages[stageId]?.touchpointIds ?? []);
    const created = createPrototypeExperiment({
      graph, title, hypothesis: draftHypothesis, fidelity: draftFidelity,
      journeyId: draftJourneyId || undefined, stageIds, touchpointIds,
      scenarioId: draftScenarioId || undefined,
    });
    if (!created.experimentId) { showToast('Não foi possível criar o experimento.'); return; }
    setGraph(() => created.graph, 'H7.30: criar experimento de serviço');
    setSelectedId(created.experimentId);
    setCreating(false);
    setDraftTitle('');
    setDraftHypothesis('');
    setDraftScenarioId('');
    showToast('Experimento criado sem alterar a Journey ou a Proposição.');
  };

  const addParticipant = () => {
    if (!selected) return;
    const result = addPrototypeParticipant(graph, selected.id, { name: participantName, role: participantRole });
    if (!result.participantId) { showToast('Informe o nome do participante.'); return; }
    setGraph(() => result.graph, 'H7.30: adicionar participante');
    setParticipantName(''); setParticipantRole('');
  };

  const addCriterion = () => {
    if (!selected) return;
    const result = addPrototypeCriterion(graph, selected.id, { label: criterionLabel, target: criterionTarget });
    if (!result.criterionId) { showToast('Descreva o critério de sucesso.'); return; }
    setGraph(() => result.graph, 'H7.30: adicionar critério de sucesso');
    setCriterionLabel(''); setCriterionTarget('');
  };

  const startExperiment = () => {
    if (!selected) return;
    const result = startPrototypeExperiment(graph, selected.id);
    if (!result.started) { showToast(result.reason ?? 'O plano de teste ainda não está pronto.'); return; }
    setGraph(() => result.graph, 'H7.30: iniciar experimento');
    showToast('Experimento iniciado. Registre observações durante a execução.');
  };

  const finishExperiment = (outcome?: Exclude<PrototypeExperimentOutcome, 'pending'>) => {
    if (!selected) return;
    const result = completePrototypeExperiment(graph, selected.id, outcome);
    if (!result.outcome) return;
    setGraph(() => result.graph, 'H7.30: concluir experimento');
    showToast(`Experimento concluído: ${PROTOTYPE_OUTCOME_LABELS[result.outcome]}.`);
  };

  const addObservation = () => {
    if (!selected || !observation.trim()) return;
    setGraph((current) => addPrototypeObservation(current, selected.id, observation), 'H7.30: registrar observação');
    setObservation('');
  };

  const changeJourney = (journeyId: Id) => {
    if (!selected) return;
    const journey = graph.journeys[journeyId];
    const stageIds = journey?.stageIds ?? [];
    const touchpointIds = stageIds.flatMap((stageId) => graph.stages[stageId]?.touchpointIds ?? []);
    setGraph((current) => {
      const updated = updatePrototypeExperiment(current, selected.id, { journeyId: journeyId || undefined, stageIds, touchpointIds });
      return refreshPrototypeSnapshot(updated, selected.id);
    }, 'H7.30: conectar Journey ao experimento');
  };

  const changeScenario = (scenarioId: Id) => {
    if (!selected) return;
    setGraph((current) => refreshPrototypeSnapshot(updatePrototypeExperiment(current, selected.id, { scenarioId: scenarioId || undefined }), selected.id), 'H7.30: conectar cenário ao experimento');
  };

  return <section className="bo-h730-lab" data-service-prototype-lab="7.30">
    <header className="bo-h730-head">
      <div>
        <div className="bo-h730-eyebrow"><FlaskConical size={16}/> VALIDAÇÃO DO SERVIÇO</div>
        <h2>Service Prototype Lab</h2>
        <p>Transforme hipóteses em experimentos observáveis antes de consolidar a operação. Teste a experiência sem sobrescrever Journey, Proposição, Touchpoints ou cenários.</p>
      </div>
      <button type="button" className="primary" onClick={() => setCreating((value) => !value)}><Plus size={15}/> Novo experimento</button>
    </header>

    <div className="bo-h730-kpis">
      <article><small>EXPERIMENTOS</small><strong>{report.counts.experiments}</strong><span>{report.counts.running} em execução</span></article>
      <article><small>PRONTOS PARA TESTAR</small><strong>{report.counts.ready}</strong><span>com hipótese, participantes e critérios</span></article>
      <article><small>CONCLUÍDOS</small><strong>{report.counts.completed}</strong><span>{report.counts.passed} passaram · {report.counts.failed} falharam</span></article>
      <article className={report.counts.completed ? 'is-good' : ''}><small>TAXA DE VALIDAÇÃO</small><strong>{report.counts.completed ? `${report.validationRate}%` : '—'}</strong><span>somente testes concluídos</span></article>
    </div>

    {creating && <section className="bo-h730-create">
      <div><small>NOVO TESTE</small><h3>O que precisa ser aprendido antes de construir?</h3><p>O laboratório cria uma cópia de referência do contexto. Os artefatos originais continuam intocados.</p></div>
      <label><span>Nome do experimento</span><input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Ex.: Confirmação da coleta por WhatsApp"/></label>
      <label className="wide"><span>Hipótese</span><textarea value={draftHypothesis} onChange={(event) => setDraftHypothesis(event.target.value)} placeholder="Acreditamos que... porque... Saberemos que funciona quando..."/></label>
      <label><span>Fidelidade</span><select value={draftFidelity} onChange={(event) => setDraftFidelity(event.target.value as PrototypeFidelity)}>{(Object.keys(PROTOTYPE_FIDELITY_META) as PrototypeFidelity[]).map((key) => <option key={key} value={key}>{PROTOTYPE_FIDELITY_META[key].label}</option>)}</select></label>
      <label><span>Journey</span><select value={draftJourneyId} onChange={(event) => setDraftJourneyId(event.target.value)}><option value="">Sem Journey</option>{journeys.map((journey) => <option key={journey.id} value={journey.id}>{journey.name}</option>)}</select></label>
      <label><span>Cenário “E se?”</span><select value={draftScenarioId} onChange={(event) => setDraftScenarioId(event.target.value)}><option value="">Proposição atual</option>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select></label>
      <div className="bo-h730-create-actions"><button type="button" onClick={() => setCreating(false)}>Cancelar</button><button type="button" className="primary" onClick={createExperiment}><Beaker size={15}/> Criar plano de teste</button></div>
    </section>}

    <div className="bo-h730-workspace">
      <aside className="bo-h730-list">
        <header><div><strong>Experimentos</strong><span>Do rascunho à evidência</span></div><em>{report.experiments.length}</em></header>
        {report.experiments.map((experiment) => <button key={experiment.id} type="button" className={selectedId === experiment.id ? 'active' : ''} onClick={() => setSelectedId(experiment.id)} data-status={experiment.status}>
          <span className="bo-h730-list-icon"><FlaskConical size={16}/></span>
          <div><small>{statusLabel[experiment.status]}</small><strong>{experiment.title}</strong><p>{experiment.hypothesis || 'Hipótese ainda não definida'}</p><em>{experiment.readinessScore}% pronto · {experiment.participantCount} participante{experiment.participantCount === 1 ? '' : 's'}</em></div>
          {experiment.status === 'completed' && <i data-outcome={experiment.outcome}>{outcomeIcon(experiment.outcome)}</i>}
        </button>)}
        {!report.experiments.length && <div className="bo-h730-empty"><FlaskConical size={28}/><strong>Nenhum experimento ainda</strong><p>Escolha uma hipótese pequena, monte o teste e aprenda antes de investir na solução final.</p></div>}
      </aside>

      <main className="bo-h730-editor">
        {!selected && <div className="bo-h730-empty is-main"><Beaker size={34}/><strong>Selecione ou crie um experimento</strong><p>O plano de teste conecta intenção, contexto, participantes, critérios e resultado.</p></div>}
        {selected && <>
          <section className="bo-h730-editor-head">
            <div><small>EXPERIMENTO DE SERVIÇO</small><input value={selected.title} onChange={(event) => setGraph((current) => updatePrototypeExperiment(current, selected.id, { title: event.target.value }), 'H7.30: renomear experimento')}/><span data-status={selected.status}>{statusLabel[selected.status]} · {selected.readinessScore}% de prontidão</span></div>
            <div className="bo-h730-editor-actions">
              <button type="button" title="Atualizar snapshot das fontes" onClick={() => setGraph((current) => refreshPrototypeSnapshot(current, selected.id), 'H7.30: atualizar snapshot')}><RefreshCw size={15}/></button>
              {selected.status === 'completed' && <button type="button" onClick={() => setGraph((current) => reopenPrototypeExperiment(current, selected.id), 'H7.30: reabrir experimento')}><RotateCcw size={15}/> Reabrir</button>}
              {selected.status !== 'archived' && <button type="button" onClick={() => setGraph((current) => archivePrototypeExperiment(current, selected.id), 'H7.30: arquivar experimento')}><Archive size={15}/> Arquivar</button>}
            </div>
          </section>

          <section className="bo-h730-source">
            <header><div><Link2 size={16}/><strong>Contexto que será testado</strong></div><span>Snapshot {new Date(selected.sourceSnapshot.capturedAt).toLocaleString('pt-BR')}</span></header>
            <div className="bo-h730-source-grid">
              <label><span>Journey</span><select value={selected.journeyId ?? ''} onChange={(event) => changeJourney(event.target.value)}><option value="">Sem Journey</option>{journeys.map((journey) => <option key={journey.id} value={journey.id}>{journey.name}</option>)}</select></label>
              <label><span>Cenário</span><select value={selected.scenarioId ?? ''} onChange={(event) => changeScenario(event.target.value)}><option value="">Proposição atual</option>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name}</option>)}</select></label>
              <div><span>Proposição capturada</span><strong>{selected.sourceSnapshot.proposition?.promise || 'Sem promessa definida'}</strong><small>{selected.sourceSnapshot.proposition?.outcome || 'Sem resultado definido'}</small></div>
              <div><span>Touchpoints no teste</span><strong>{selected.sourceSnapshot.touchpoints.length}</strong><small>{selected.sourceSnapshot.touchpoints.slice(0, 3).map((point) => point.name).join(' · ') || 'Nenhum touchpoint'}</small></div>
            </div>
          </section>

          <section className="bo-h730-plan">
            <div className="bo-h730-section-title"><div><small>PLANO</small><h3>Hipótese e forma do protótipo</h3></div></div>
            <div className="bo-h730-plan-grid">
              <label className="wide"><span>Hipótese testável</span><textarea value={selected.hypothesis} onChange={(event) => setGraph((current) => updatePrototypeExperiment(current, selected.id, { hypothesis: event.target.value }), 'H7.30: editar hipótese')} placeholder="Acreditamos que..."/></label>
              <label><span>Fidelidade</span><select value={selected.fidelity} onChange={(event) => setGraph((current) => updatePrototypeExperiment(current, selected.id, { fidelity: event.target.value as PrototypeFidelity }), 'H7.30: mudar fidelidade')}>{(Object.keys(PROTOTYPE_FIDELITY_META) as PrototypeFidelity[]).map((key) => <option key={key} value={key}>{PROTOTYPE_FIDELITY_META[key].label}</option>)}</select><small>{PROTOTYPE_FIDELITY_META[selected.fidelity].description}</small></label>
              <label><span>Objetivo do teste</span><textarea value={selected.objective ?? ''} onChange={(event) => setGraph((current) => updatePrototypeExperiment(current, selected.id, { objective: event.target.value }), 'H7.30: editar objetivo')} placeholder="Qual decisão este experimento precisa destravar?"/></label>
              <label className="wide"><span>Instruções / roteiro</span><textarea value={selected.instructions ?? ''} onChange={(event) => setGraph((current) => updatePrototypeExperiment(current, selected.id, { instructions: event.target.value }), 'H7.30: editar roteiro')} placeholder="Passos da simulação, tarefas e limites do teste."/></label>
            </div>
            {selected.gaps.length > 0 && <div className="bo-h730-gaps">{selected.gaps.map((gap) => <span key={gap}><CircleHelp size={13}/>{gap}</span>)}</div>}
          </section>

          <section className="bo-h730-people">
            <div className="bo-h730-section-title"><div><small>PARTICIPANTES</small><h3>Quem vai atravessar o protótipo</h3></div><span><Users size={14}/>{participants.length}</span></div>
            <div className="bo-h730-add-row"><input value={participantName} onChange={(event) => setParticipantName(event.target.value)} placeholder="Nome / identificação"/><input value={participantRole} onChange={(event) => setParticipantRole(event.target.value)} placeholder="Papel ou segmento"/><button type="button" onClick={addParticipant}><Plus size={14}/> Adicionar</button></div>
            <div className="bo-h730-participants">{participants.map((participant) => <article key={participant.id}><span><Users size={14}/></span><div><strong>{participant.name}</strong><small>{participant.role || participant.segment || 'Participante'}</small></div><button type="button" aria-label={`Remover ${participant.name}`} onClick={() => setGraph((current) => unlinkPrototypeParticipant(current, selected.id, participant.id), 'H7.30: remover participante')}><Trash2 size={13}/></button></article>)}{!participants.length && <p>Nenhum participante conectado.</p>}</div>
          </section>

          <section className="bo-h730-criteria">
            <div className="bo-h730-section-title"><div><small>CRITÉRIOS DE SUCESSO</small><h3>Como saberemos se a hipótese sobreviveu?</h3></div><span>{selected.assessedCriteria}/{selected.criteria.length} avaliados</span></div>
            <div className="bo-h730-add-row"><input value={criterionLabel} onChange={(event) => setCriterionLabel(event.target.value)} placeholder="Ex.: Cliente conclui sem pedir ajuda"/><input value={criterionTarget} onChange={(event) => setCriterionTarget(event.target.value)} placeholder="Meta / limiar"/><button type="button" onClick={addCriterion}><Plus size={14}/> Critério</button></div>
            <div className="bo-h730-criteria-list">{selected.criteria.map((criterion) => <article key={criterion.id} data-result={criterion.result}>
              <div className="bo-h730-criterion-status">{criterion.result === 'pass' ? <CheckCircle2 size={17}/> : criterion.result === 'fail' ? <XCircle size={17}/> : <CircleHelp size={17}/>}</div>
              <div className="bo-h730-criterion-copy"><input value={criterion.label} onChange={(event) => setGraph((current) => updatePrototypeCriterion(current, selected.id, criterion.id, { label: event.target.value }), 'H7.30: editar critério')}/><input className="target" value={criterion.target ?? ''} onChange={(event) => setGraph((current) => updatePrototypeCriterion(current, selected.id, criterion.id, { target: event.target.value }), 'H7.30: editar meta')} placeholder="Meta"/><textarea value={criterion.evidenceNote ?? ''} onChange={(event) => setGraph((current) => updatePrototypeCriterion(current, selected.id, criterion.id, { evidenceNote: event.target.value }), 'H7.30: evidência do critério')} placeholder="O que foi observado?"/></div>
              <select value={criterion.result} onChange={(event) => setGraph((current) => setPrototypeCriterionResult(current, selected.id, criterion.id, event.target.value as PrototypeCriterionResult), 'H7.30: avaliar critério')}><option value="pending">Não avaliado</option><option value="pass">Passou</option><option value="fail">Falhou</option></select>
              <button type="button" aria-label="Remover critério" onClick={() => setGraph((current) => removePrototypeCriterion(current, selected.id, criterion.id), 'H7.30: remover critério')}><Trash2 size={13}/></button>
            </article>)}{!selected.criteria.length && <div className="bo-h730-empty-inline">Defina um critério observável antes de iniciar o teste.</div>}</div>
          </section>

          <section className="bo-h730-run" data-running={selected.status === 'running' ? '1' : '0'}>
            <div className="bo-h730-section-title"><div><small>EXECUÇÃO</small><h3>Teste, observe e conclua</h3></div>{selected.startedAt && <span><Clock3 size={13}/>{new Date(selected.startedAt).toLocaleString('pt-BR')}</span>}</div>
            {selected.status !== 'running' && selected.status !== 'completed' && <button type="button" className="bo-h730-start" onClick={startExperiment}><Play size={17}/> Iniciar experimento</button>}
            {selected.status === 'running' && <>
              <div className="bo-h730-observation"><textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Registre comportamento, dúvidas, falas e rupturas observadas."/><button type="button" onClick={addObservation}>Registrar observação</button></div>
              <div className="bo-h730-observations">{selected.observationNotes.map((note, index) => <p key={`${index}:${note}`}><span>{String(index + 1).padStart(2, '0')}</span>{note}</p>)}</div>
              <div className="bo-h730-finish"><span>Conclusão determinística sugerida: <strong>{PROTOTYPE_OUTCOME_LABELS[selected.suggestedOutcome]}</strong></span><div><button type="button" className="pass" onClick={() => finishExperiment('passed')}><CheckCircle2 size={14}/> Passou</button><button type="button" className="fail" onClick={() => finishExperiment('failed')}><XCircle size={14}/> Falhou</button><button type="button" onClick={() => finishExperiment('inconclusive')}><CircleHelp size={14}/> Inconclusivo</button><button type="button" onClick={() => finishExperiment()}>Usar critérios</button></div></div>
            </>}
            {selected.status === 'completed' && <div className="bo-h730-result" data-outcome={selected.outcome}>{outcomeIcon(selected.outcome)}<div><small>RESULTADO REGISTRADO</small><strong>{PROTOTYPE_OUTCOME_LABELS[selected.outcome]}</strong><p>{selected.criteria.length} critérios · {selected.observationNotes.length} observações · fontes preservadas no snapshot</p></div></div>}
          </section>
        </>}
      </main>
    </div>
  </section>;
}

import { useEffect, useMemo, useState } from 'react';
import { Beaker, CheckCircle2, GitCompareArrows, Plus, Save, Sparkles, Trash2, X } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { Id, ServiceProposition } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import {
  buildServicePropositionReport, createWhatIfScenario, promoteWhatIfScenario, propositionSourceOptions,
  PROPOSITION_STATUS_LABELS, removeWhatIfScenario, saveServiceProposition, SCENARIO_STATUS_LABELS,
  scenarioDifferences, updateWhatIfScenarioStatus,
} from '../services/service-proposition';

const splitLines = (value: string) => value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
const titleOf = (item: { title?: unknown; name?: unknown; description?: unknown }) => String(item.title || item.name || item.description || 'Sem título');
type Tab = 'proposition' | 'scenarios';

type PropositionDraft = Pick<ServiceProposition,
  'audience' | 'problem' | 'promise' | 'outcome' | 'experience' | 'differentiator' | 'businessValue' |
  'capabilities' | 'principles' | 'linkedInsightIds' | 'linkedNeedIds' | 'linkedProblemIds' | 'linkedEvidenceIds'>;

const fromCurrent = (current: ServiceProposition): PropositionDraft => ({
  audience: current.audience, problem: current.problem, promise: current.promise, outcome: current.outcome,
  experience: current.experience, differentiator: current.differentiator, businessValue: current.businessValue,
  capabilities: [...current.capabilities], principles: [...current.principles], linkedInsightIds: [...current.linkedInsightIds],
  linkedNeedIds: [...current.linkedNeedIds], linkedProblemIds: [...current.linkedProblemIds], linkedEvidenceIds: [...current.linkedEvidenceIds],
});

export function ServicePropositionView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const report = useMemo(() => buildServicePropositionReport(graph), [graph]);
  const options = useMemo(() => propositionSourceOptions(graph), [graph]);
  const [tab, setTab] = useState<Tab>('proposition');
  const [draft, setDraft] = useState<PropositionDraft>(() => fromCurrent(report.current));
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(report.scenarios[0]?.id ?? null);
  const [scenarioDraft, setScenarioDraft] = useState({
    name: '', description: '', hypothesis: '', promise: report.current.promise, outcome: report.current.outcome,
    experience: report.current.experience, businessValue: report.current.businessValue, capabilities: report.current.capabilities.join('\n'), criteria: '',
  });

  useEffect(() => { setDraft(fromCurrent(report.current)); }, [report.current.updatedAt]);
  useEffect(() => {
    if (selectedScenarioId && report.scenarios.some((item) => item.id === selectedScenarioId)) return;
    setSelectedScenarioId(report.scenarios[0]?.id ?? null);
  }, [report.scenarios, selectedScenarioId]);

  const selectedScenario = report.scenarios.find((item) => item.id === selectedScenarioId) ?? null;
  const differences = selectedScenario ? scenarioDifferences(graph, selectedScenario.id) : [];
  const draftStatement = `Para ${draft.audience || '[pessoa / público]'}, ${draft.promise || '[serviço / proposta]'} permite ${draft.outcome || '[resultado esperado]'}${draft.experience ? ` por meio de ${draft.experience}` : ''}${draft.differentiator ? `, diferentemente de ${draft.differentiator}` : ''}.`;

  const setField = <K extends keyof PropositionDraft>(field: K, value: PropositionDraft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const toggleId = (field: 'linkedInsightIds' | 'linkedNeedIds' | 'linkedProblemIds' | 'linkedEvidenceIds', id: Id) => {
    const current = draft[field];
    setField(field, current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const save = (status = report.current.status) => {
    setGraph((current) => saveServiceProposition({ graph: current, patch: draft, status }), 'H7.27: atualizar proposição');
    showToast(status === 'validated' ? 'Proposição marcada como validada.' : 'Proposição do serviço salva.');
  };

  const createScenario = () => {
    if (!scenarioDraft.name.trim() || !scenarioDraft.hypothesis.trim()) { showToast('Informe o nome e a pergunta “E se?” do cenário.'); return; }
    const result = createWhatIfScenario({
      graph,
      name: scenarioDraft.name,
      description: scenarioDraft.description,
      hypothesis: scenarioDraft.hypothesis,
      patch: {
        promise: scenarioDraft.promise,
        outcome: scenarioDraft.outcome,
        experience: scenarioDraft.experience,
        businessValue: scenarioDraft.businessValue,
        capabilities: splitLines(scenarioDraft.capabilities),
      },
      successCriteria: splitLines(scenarioDraft.criteria),
      insightIds: draft.linkedInsightIds,
      needIds: draft.linkedNeedIds,
      problemIds: draft.linkedProblemIds,
      evidenceIds: draft.linkedEvidenceIds,
    });
    setGraph(() => result.graph, 'H7.27: criar cenário What-if');
    setSelectedScenarioId(result.scenarioId);
    setScenarioOpen(false);
    setTab('scenarios');
    setScenarioDraft({ name: '', description: '', hypothesis: '', promise: draft.promise, outcome: draft.outcome, experience: draft.experience, businessValue: draft.businessValue, capabilities: draft.capabilities.join('\n'), criteria: '' });
    showToast('Cenário criado sem alterar o Blueprint oficial.');
  };

  const changeScenarioStatus = (scenarioId: string, status: 'draft' | 'testing' | 'accepted' | 'rejected') => {
    if (status === 'accepted') {
      setGraph((current) => promoteWhatIfScenario({ graph: current, scenarioId }), 'H7.27: promover cenário');
      showToast('Cenário promovido à proposição atual. O Blueprint permanece inalterado.');
      return;
    }
    setGraph((current) => updateWhatIfScenarioStatus({ graph: current, scenarioId, status }), 'H7.27: status do cenário');
    showToast(status === 'testing' ? 'Cenário marcado como Em teste.' : status === 'rejected' ? 'Cenário descartado.' : 'Cenário voltou para rascunho.');
  };

  return <div className="bo-h727-proposition" data-service-proposition="7.27">
    <section className="bo-h727-hero">
      <div>
        <small>DEFINIR · SERVICE PROPOSITION</small>
        <h2>O que estamos prometendo — e por quê?</h2>
        <p>Transforme Pesquisa, Ecologia e problemas validados em uma proposição explícita antes de detalhar a operação.</p>
      </div>
      <div className="bo-h727-health">
        <span style={{ background: `conic-gradient(#1598c9 ${report.readinessScore}%, #e9f0f5 0)` }}>{report.readinessScore}</span><div><small>PROPOSITION READINESS</small><strong>{report.propositionReady ? 'Pronta para testar' : 'Em construção'}</strong><em>{report.sourceCount} fonte(s) conectada(s)</em></div>
      </div>
    </section>

    <nav className="bo-h727-tabs" aria-label="Proposição e cenários">
      <button type="button" className={tab === 'proposition' ? 'active' : ''} onClick={() => setTab('proposition')}><BlueOceanObjectIcon kind="solution" size={16}/> Proposição</button>
      <button type="button" className={tab === 'scenarios' ? 'active' : ''} onClick={() => setTab('scenarios')}><GitCompareArrows size={16}/> Cenários “E se?” {report.scenarios.length ? <em>{report.scenarios.length}</em> : null}</button>
    </nav>

    {tab === 'proposition' && <div className="bo-h727-proposition-layout">
      <main className="bo-h727-form-card">
        <header><div><small>PROPOSIÇÃO ATUAL</small><h3>Defina o valor do serviço antes da solução</h3></div><span className={`is-${report.current.status}`}>{PROPOSITION_STATUS_LABELS[report.current.status]}</span></header>
        <div className="bo-h727-form-grid">
          <label><span>Para quem é?</span><input value={draft.audience} onChange={(e) => setField('audience', e.target.value)} placeholder="Ex.: famílias que precisam de coleta recorrente"/></label>
          <label><span>Qual problema resolvemos?</span><input value={draft.problem} onChange={(e) => setField('problem', e.target.value)} placeholder="Ex.: incerteza e esforço para coordenar a coleta"/></label>
          <label className="wide"><span>Promessa do serviço</span><textarea value={draft.promise} onChange={(e) => setField('promise', e.target.value)} placeholder="Ex.: um serviço de lavanderia que torna coleta e entrega previsíveis"/></label>
          <label className="wide"><span>Resultado para a pessoa</span><textarea value={draft.outcome} onChange={(e) => setField('outcome', e.target.value)} placeholder="Ex.: resolver a lavanderia sem precisar acompanhar manualmente cada etapa"/></label>
          <label><span>Experiência que queremos produzir</span><textarea value={draft.experience} onChange={(e) => setField('experience', e.target.value)} placeholder="Ex.: confirmação clara, visibilidade e confiança"/></label>
          <label><span>Diferencial</span><textarea value={draft.differentiator} onChange={(e) => setField('differentiator', e.target.value)} placeholder="Ex.: coordenação proativa em vez de atendimento reativo"/></label>
          <label className="wide"><span>Como o negócio captura valor?</span><textarea value={draft.businessValue} onChange={(e) => setField('businessValue', e.target.value)} placeholder="Ex.: mais recorrência, menos contatos operacionais e menor retrabalho"/></label>
          <label><span>Capacidades necessárias</span><textarea value={draft.capabilities.join('\n')} onChange={(e) => setField('capabilities', splitLines(e.target.value))} placeholder={'Roteirização\nNotificações\nVisibilidade operacional'}/></label>
          <label><span>Princípios da experiência</span><textarea value={draft.principles.join('\n')} onChange={(e) => setField('principles', splitLines(e.target.value))} placeholder={'Ser previsível\nNão fazer o cliente repetir informação'}/></label>
        </div>
        <footer className="bo-h727-form-actions"><button type="button" onClick={() => setDraft(fromCurrent(report.current))}>Descartar alterações</button><button type="button" onClick={() => save('ready')}><Save size={15}/> Salvar proposição</button>{report.propositionReady && <button type="button" className="primary" onClick={() => save('validated')}><CheckCircle2 size={15}/> Marcar validada</button>}</footer>
      </main>

      <aside className="bo-h727-side">
        <section className="bo-h727-statement"><small>PROPOSITION STATEMENT</small><BlueOceanObjectIcon kind="solution" size={27}/><blockquote>{draftStatement}</blockquote><p>O statement é uma síntese; a evidência continua nas entidades conectadas.</p></section>
        <section className="bo-h727-gaps"><small>LACUNAS</small>{report.gaps.slice(0,5).map((gap) => <p key={gap}>• {gap}</p>)}{!report.gaps.length && <p className="ok"><CheckCircle2 size={14}/> Estrutura mínima completa.</p>}</section>
      </aside>

      <section className="bo-h727-sources">
        <div className="bo-h727-section-head"><div><small>BASE DA PROPOSIÇÃO</small><h3>Conecte o que sustenta esta decisão</h3><p>Não transforme opinião em estratégia. Selecione as fontes que justificam a proposição.</p></div></div>
        <div className="bo-h727-source-columns">
          {([
            ['Insights', 'linkedInsightIds', options.insights, 'insight'],
            ['Necessidades', 'linkedNeedIds', options.needs, 'need'],
            ['Problemas / hipóteses', 'linkedProblemIds', options.problems, 'problem'],
            ['Evidências', 'linkedEvidenceIds', options.evidence, 'evidence'],
          ] as const).map(([label, field, items, kind]) => <div key={field}><strong>{label}</strong>{items.slice(0,12).map((item) => <label key={item.id}><input type="checkbox" checked={draft[field].includes(item.id)} onChange={() => toggleId(field, item.id)}/><span><BlueOceanObjectIcon kind={kind} size={14}/>{titleOf(item)}</span></label>)}{!items.length && <em>Nenhum item disponível.</em>}</div>)}
        </div>
      </section>
    </div>}

    {tab === 'scenarios' && <div className="bo-h727-scenarios">
      <section className="bo-h727-scenario-head"><div><small>WHAT-IF LAB</small><h3>Teste alternativas sem reescrever o Blueprint</h3><p>Cada cenário parte da proposição atual. Só uma decisão explícita pode promovê-lo; o Blueprint oficial não é alterado automaticamente.</p></div><button type="button" className="primary" onClick={() => setScenarioOpen(true)}><Plus size={15}/> Novo cenário</button></section>
      <div className="bo-h727-scenario-layout">
        <aside className="bo-h727-scenario-list">
          {report.scenarios.map((scenario) => <button key={scenario.id} type="button" className={selectedScenarioId === scenario.id ? 'active' : ''} onClick={() => setSelectedScenarioId(scenario.id)}><span><Beaker size={15}/></span><div><small>{SCENARIO_STATUS_LABELS[scenario.status ?? 'draft']}</small><strong>{scenario.name}</strong><p>{scenario.hypothesis || 'Cenário alternativo'}</p></div></button>)}
          {!report.scenarios.length && <div className="bo-h727-empty"><Beaker size={26}/><strong>Nenhum cenário alternativo</strong><p>Crie uma hipótese “E se?” para explorar outra proposta sem alterar o serviço oficial.</p></div>}
        </aside>

        <main className="bo-h727-compare">
          {selectedScenario ? <>
            <header><div><small>COMPARAÇÃO</small><h3>{selectedScenario.name}</h3><p>{selectedScenario.hypothesis}</p></div><span className={`is-${selectedScenario.status ?? 'draft'}`}>{SCENARIO_STATUS_LABELS[selectedScenario.status ?? 'draft']}</span></header>
            <div className="bo-h727-compare-grid"><article><small>ATUAL</small><strong>{report.statement}</strong></article><article><small>ALTERNATIVA</small><strong>{selectedScenario.propositionPatch ? `Para ${String((selectedScenario.propositionPatch.audience ?? report.current.audience) || '[público]')}, ${String((selectedScenario.propositionPatch.promise ?? report.current.promise) || '[proposta]')} permite ${String((selectedScenario.propositionPatch.outcome ?? report.current.outcome) || '[resultado]')}.` : selectedScenario.description || 'Sem alterações estruturadas.'}</strong></article></div>
            <section className="bo-h727-differences"><strong>O que muda?</strong>{differences.map((diff) => <div key={String(diff.field)}><span>{diff.label}</span><p><del>{diff.current || '—'}</del><ins>{diff.alternative || '—'}</ins></p></div>)}{!differences.length && <p>Nenhuma diferença estruturada em relação à proposição atual.</p>}</section>
            <section className="bo-h727-criteria"><strong>Critérios de sucesso</strong>{selectedScenario.successCriteria?.length ? <ul>{selectedScenario.successCriteria.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Nenhum critério definido.</p>}</section>
            <footer className="bo-h727-scenario-actions"><button type="button" onClick={() => changeScenarioStatus(selectedScenario.id, 'testing')}><Beaker size={14}/> Colocar em teste</button><button type="button" onClick={() => changeScenarioStatus(selectedScenario.id, 'rejected')}>Descartar</button><button type="button" className="primary" onClick={() => changeScenarioStatus(selectedScenario.id, 'accepted')}><CheckCircle2 size={14}/> Promover à proposição atual</button><button type="button" className="danger" onClick={() => { setGraph((current) => removeWhatIfScenario({ graph: current, scenarioId: selectedScenario.id }), 'H7.27: excluir cenário'); showToast('Cenário removido.'); }}><Trash2 size={14}/></button></footer>
            <div className="bo-h727-blueprint-lock"><BlueOceanObjectIcon kind="blueprint" size={17}/><span><strong>Blueprint protegido.</strong> Promover um cenário atualiza a proposição, não as lanes operacionais.</span></div>
          </> : <div className="bo-h727-empty large"><GitCompareArrows size={30}/><strong>Escolha ou crie um cenário</strong><p>Compare a proposta atual com uma alternativa antes de decidir.</p></div>}
        </main>
      </div>
    </div>}

    {scenarioOpen && <div className="bo-h727-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setScenarioOpen(false); }}><div className="bo-h727-modal">
      <header><div><small>WHAT-IF SCENARIO</small><h3>Novo cenário “E se?”</h3><p>Crie uma alternativa isolada. Ela não altera Journey, Blueprint ou Whiteboard.</p></div><button type="button" onClick={() => setScenarioOpen(false)} aria-label="Fechar"><X size={17}/></button></header>
      <div className="bo-h727-form-grid modal">
        <label><span>Nome</span><input autoFocus value={scenarioDraft.name} onChange={(e) => setScenarioDraft({ ...scenarioDraft, name: e.target.value })} placeholder="Ex.: Agendamento autônomo"/></label>
        <label><span>Pergunta “E se?”</span><input value={scenarioDraft.hypothesis} onChange={(e) => setScenarioDraft({ ...scenarioDraft, hypothesis: e.target.value })} placeholder="E se o cliente agendasse sem falar com o atendimento?"/></label>
        <label className="wide"><span>Descrição</span><textarea value={scenarioDraft.description} onChange={(e) => setScenarioDraft({ ...scenarioDraft, description: e.target.value })}/></label>
        <label><span>Promessa alternativa</span><textarea value={scenarioDraft.promise} onChange={(e) => setScenarioDraft({ ...scenarioDraft, promise: e.target.value })}/></label>
        <label><span>Resultado alternativo</span><textarea value={scenarioDraft.outcome} onChange={(e) => setScenarioDraft({ ...scenarioDraft, outcome: e.target.value })}/></label>
        <label><span>Experiência alternativa</span><textarea value={scenarioDraft.experience} onChange={(e) => setScenarioDraft({ ...scenarioDraft, experience: e.target.value })}/></label>
        <label><span>Valor para o negócio</span><textarea value={scenarioDraft.businessValue} onChange={(e) => setScenarioDraft({ ...scenarioDraft, businessValue: e.target.value })}/></label>
        <label><span>Capacidades necessárias</span><textarea value={scenarioDraft.capabilities} onChange={(e) => setScenarioDraft({ ...scenarioDraft, capabilities: e.target.value })}/></label>
        <label><span>Critérios de sucesso</span><textarea value={scenarioDraft.criteria} onChange={(e) => setScenarioDraft({ ...scenarioDraft, criteria: e.target.value })} placeholder={'80% concluem sem ajuda\n< 3 min\n0 retrabalho manual'}/></label>
      </div>
      <footer><button type="button" onClick={() => setScenarioOpen(false)}>Cancelar</button><button type="button" className="primary" onClick={createScenario}><Sparkles size={14}/> Criar cenário</button></footer>
    </div></div>}
  </div>;
}

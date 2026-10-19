import { useMemo, useState, type DragEvent } from 'react';
import { ArrowRight, CheckCircle2, FileText, GripVertical, Lightbulb, Microscope, Plus, Quote, Search, Sparkles, Wrench, X } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { ResearchMethod, ResearchObservationKind } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import {
  buildResearchStudioReport, createResearchInsight, createResearchObservation, createResearchProject, createResearchSource,
  OBSERVATION_KIND_LABELS, promoteObservationToEvidence, promoteResearchInsight, RESEARCH_METHOD_LABELS,
  RESEARCH_PROJECT_STATUS_LABELS, researchTraceRows,
} from '../services/research-studio';
import { experienceTerm, isResearchTabVisible, useExperienceProfile } from '../services/experience-profile';
import { buildEvidenceStudioReport } from '../services/evidence-studio';
import { openServiceObject } from '../services/service-object-navigation';
import { listContextEntities } from '../services/context-library';

type ResearchTab = 'projects' | 'field' | 'evidence' | 'insights' | 'trace';
type FoundationResearchView = 'flow' | 'list' | 'map';
type FoundationResearchSurface = 'research' | 'tools';
type ResearchDragItem = { kind: 'source' | 'observation' | 'evidence'; id: string };
type ResearchDropTarget = 'observations' | 'evidence' | 'insights';
// H15.6 legacy tab contract: ['field', 'Campo e materiais'] · ['trace', 'Rastreabilidade']
type DialogKind = 'project' | 'source' | 'observation' | 'insight' | null;

const methods = Object.keys(RESEARCH_METHOD_LABELS) as ResearchMethod[];
const observationKinds = Object.keys(OBSERVATION_KIND_LABELS) as ResearchObservationKind[];
const idsOf = (value: unknown) => Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && Boolean(id)) : [];
const titleOf = (entity: { title?: unknown; name?: unknown }) => String(entity.title ?? entity.name ?? 'Sem título');
const formatDate = (value: unknown) => {
  const date = new Date(String(value ?? ''));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function ResearchStudioView({ studio, foundationSurface = 'research' }: { studio: StudioController; foundationSurface?: FoundationResearchSurface }) {
  const { graph, setGraph, showToast } = studio;
  const experience = useExperienceProfile();
  const [tab, setTab] = useState<ResearchTab>('projects');
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [foundationView, setFoundationView] = useState<FoundationResearchView>('flow');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState('');
  const [dragItem, setDragItem] = useState<ResearchDragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<ResearchDropTarget | null>(null);
  const [query, setQuery] = useState('');
  const report = useMemo(() => buildResearchStudioReport(graph), [graph]);
  const traces = useMemo(() => researchTraceRows(graph), [graph]);
  const [projectDraft, setProjectDraft] = useState({ title: '', goal: '', owner: '', method: 'interview' as ResearchMethod });
  const [sourceDraft, setSourceDraft] = useState({ title: '', type: 'interview' as ResearchMethod, summary: '', participant: '', owner: '', method: '', sample: '', date: '' });
  const [observationDraft, setObservationDraft] = useState({ text: '', kind: 'said' as ResearchObservationKind, sourceId: '', context: '', participant: '', observedAt: '' });
  const [insightDraft, setInsightDraft] = useState({ title: '', description: '', evidenceIds: [] as string[] });
  const q = query.trim().toLocaleLowerCase('pt-BR');
  const activeProject = report.activeProject;
  const researchTabs: Array<[ResearchTab, string]> = [
    ['projects', 'Projetos'],
    ['field', experience.level === 'foundation' ? 'Coleta' : 'Campo e materiais'],
    ['evidence', 'Evidências'],
    ['insights', experience.level === 'foundation' ? 'Aprendizados' : 'Insights'],
    ['trace', experienceTerm(experience.level, 'traceability')],
  ];
  const visibleResearchTabs = researchTabs.filter(([id]) => isResearchTabVisible(experience.level, id));
  const filteredSources = report.sources.filter((item) => !q || `${item.title} ${item.summary ?? ''} ${item.participant ?? ''}`.toLocaleLowerCase('pt-BR').includes(q));
  const filteredObservations = report.observations.filter((item) => !q || `${item.text} ${item.context ?? ''} ${item.participant ?? ''}`.toLocaleLowerCase('pt-BR').includes(q));
  const filteredEvidence = report.evidence.filter((item) => !q || `${titleOf(item)} ${String(item.description ?? '')}`.toLocaleLowerCase('pt-BR').includes(q));
  const filteredInsights = report.insights.filter((item) => !q || `${titleOf(item)} ${String(item.description ?? '')}`.toLocaleLowerCase('pt-BR').includes(q));
  const contextCounts = useMemo(() => ({
    personas: listContextEntities(graph, 'persona').length,
    needs: listContextEntities(graph, 'need').length,
    pains: listContextEntities(graph, 'pain').length,
    problems: listContextEntities(graph, 'problem').length,
  }), [graph]);
  const openContextPage = (page: 'personas' | 'needs' | 'pains' | 'problems') => {
    window.dispatchEvent(new CustomEvent('bo-open-context-page', { detail: page }));
  };
  const focusedEvidenceId = selectedEvidenceId && report.evidence.some((item) => item.id === selectedEvidenceId)
    ? selectedEvidenceId
    : '';
  const focusedEvidence = focusedEvidenceId ? graph.entities?.evidence?.[focusedEvidenceId] : undefined;
  const focusedEvidenceReport = useMemo(() => focusedEvidenceId ? buildEvidenceStudioReport(graph, focusedEvidenceId) : null, [graph, focusedEvidenceId]);
  const openSourceDialog = (type?: ResearchMethod) => {
    if (type) setSourceDraft((current) => ({ ...current, type }));
    setDialog('source');
  };
  const openFocusedEvidenceContext = (kind: 'persona' | 'need' | 'pain' | 'problem', page: 'personas' | 'needs' | 'pains' | 'problems') => {
    const connection = focusedEvidenceReport?.connections.find((item) => item.kind === kind);
    if (connection) {
      openServiceObject(kind === 'problem' ? 'validatedProblem' : kind, connection.id);
      return;
    }
    openContextPage(page);
  };

  const participantNames = useMemo(() => new Set([
    ...report.sources.map((item) => String(item.participant ?? '').trim()),
    ...report.observations.map((item) => String(item.participant ?? '').trim()),
  ].filter(Boolean)), [report.sources, report.observations]);
  const declaredParticipants = report.projects.reduce((total, project) => total + (Number(project.participantCount) || 0), 0);
  const participantCount = Math.max(participantNames.size, declaredParticipants);
  const evidenceWithOriginCount = report.evidence.filter((evidence) => idsOf(evidence.sourceIds).length > 0 || idsOf(evidence.observationIds).length > 0).length;
  const orphanEvidenceCount = report.evidence.length - evidenceWithOriginCount;
  const maturityChecks = [
    report.counts.projects > 0,
    report.counts.material > 0 || report.counts.observation > 0,
    report.counts.evidence > 0,
    report.counts.insight > 0,
  ];
  const researchMaturityCount = maturityChecks.filter(Boolean).length;
  const researchMaturity = Math.round((researchMaturityCount / maturityChecks.length) * 100);
  const foundationResearchStates = [
    { id: 'question', label: 'Pergunta', state: report.counts.projects ? 'done' : 'empty', detail: report.counts.projects ? 'Definida' : 'Ainda não definida' },
    { id: 'field', label: 'Campo', state: (report.counts.material || report.counts.observation) ? 'done' : 'empty', detail: (report.counts.material || report.counts.observation) ? `${report.counts.material + report.counts.observation} registro(s)` : 'Ainda sem registros' },
    { id: 'evidence', label: 'Evidências', state: evidenceWithOriginCount ? 'done' : orphanEvidenceCount ? 'attention' : 'empty', detail: evidenceWithOriginCount ? `${evidenceWithOriginCount} com origem` : orphanEvidenceCount ? `${orphanEvidenceCount} precisa(m) de origem` : 'Ainda não iniciadas' },
    { id: 'insight', label: 'Aprendizados', state: report.counts.insight ? 'done' : 'empty', detail: report.counts.insight ? `${report.counts.insight} registrado(s)` : 'Ainda não iniciados' },
  ] as const;
  const isEmptyResearch = !report.counts.projects && !report.counts.material && !report.counts.observation && !report.counts.evidence && !report.counts.insight;
  const nextResearchAction = !report.counts.projects
    ? experience.level === 'foundation'
      ? { title: 'Defina o que você quer descobrir', help: 'Comece com uma pergunta clara para orientar o que será observado e coletado.', label: 'Criar pergunta de pesquisa', action: () => setDialog('project') }
      : { title: 'Crie um projeto de pesquisa', help: 'Defina primeiro o que precisa ser aprendido e qual pergunta orientará a coleta.', label: 'Criar primeiro projeto', action: () => setDialog('project') }
    : !report.counts.material && !report.counts.observation
      ? { title: 'Comece o trabalho de campo', help: 'Adicione uma fonte, entrevista ou observação ligada à pergunta ativa.', label: 'Adicionar material', action: () => setDialog('source') }
      : experience.level === 'foundation' && orphanEvidenceCount > 0 && evidenceWithOriginCount === 0
        ? { title: 'Dê origem à evidência antes de avançar', help: 'Uma evidência sem material ou observação de origem continua como ponto de atenção, não como etapa concluída.', label: 'Resolver origem', action: () => { setSelectedEvidenceId(report.evidence.find((evidence) => !idsOf(evidence.sourceIds).length && !idsOf(evidence.observationIds).length)?.id ?? ''); setFoundationView('flow'); } }
        : (experience.level === 'foundation' ? !evidenceWithOriginCount : !report.counts.evidence)
          ? { title: 'Transforme observações em evidências', help: 'Revise o que foi observado e promova registros com contexto suficiente.', label: experience.level === 'foundation' ? 'Revisar observações' : 'Revisar campo', action: () => experience.level === 'foundation' ? setFoundationView('flow') : setTab('field') }
          : !report.counts.insight
            ? { title: 'Sintetize o que as evidências significam', help: 'Conecte evidências e explicite um aprendizado útil para o serviço.', label: experience.level === 'foundation' ? 'Registrar aprendizado' : 'Criar Insight', action: () => setDialog('insight') }
            : experience.level === 'foundation'
              ? { title: 'Revise o que você aprendeu', help: 'Confirme se cada conclusão está apoiada por evidências e conectada a pessoas, necessidades, dores ou problemas.', label: 'Revisar síntese', action: () => setFoundationView('flow') }
              : { title: 'Acompanhe a rastreabilidade', help: 'Verifique como evidências e insights estão sustentando necessidades, hipóteses e decisões.', label: 'Ver rastreabilidade', action: () => setTab('trace') };

  const saveProject = () => {
    if (!projectDraft.title.trim()) { showToast(experience.level === 'foundation' ? 'Informe um nome para a pesquisa.' : 'Informe um nome para o projeto de pesquisa.'); return; }
    const result = createResearchProject({ graph, title: projectDraft.title, goal: projectDraft.goal, owner: projectDraft.owner, methods: [projectDraft.method], status: 'active' });
    setGraph(() => result.graph, 'H7.26: criar projeto de pesquisa');
    setProjectDraft({ title: '', goal: '', owner: '', method: 'interview' });
    setDialog(null); showToast(experience.level === 'foundation' ? 'Pergunta de pesquisa criada.' : 'Projeto de pesquisa criado.');
  };
  const saveSource = () => {
    if (!sourceDraft.title.trim()) { showToast('Informe um título para o material de pesquisa.'); return; }
    const result = createResearchSource({ graph, title: sourceDraft.title, type: sourceDraft.type, projectId: activeProject?.id, summary: sourceDraft.summary, participant: sourceDraft.participant, owner: sourceDraft.owner, method: sourceDraft.method, sample: sourceDraft.sample, date: sourceDraft.date });
    setGraph(() => result.graph, 'H7.26: adicionar material de pesquisa');
    setSourceDraft({ title: '', type: 'interview', summary: '', participant: '', owner: '', method: '', sample: '', date: '' });
    setDialog(null); setTab('field'); showToast('Material de pesquisa adicionado.');
  };
  const saveObservation = () => {
    if (!observationDraft.text.trim()) { showToast('Registre o que foi dito, observado ou medido.'); return; }
    const result = createResearchObservation({ graph, text: observationDraft.text, kind: observationDraft.kind, projectId: activeProject?.id, sourceId: observationDraft.sourceId || undefined, context: observationDraft.context, participant: observationDraft.participant, observedAt: observationDraft.observedAt });
    setGraph(() => result.graph, 'H7.26: registrar observação');
    setObservationDraft({ text: '', kind: 'said', sourceId: '', context: '', participant: '', observedAt: '' });
    setDialog(null); setTab('field'); showToast('Observação registrada sem interpretação.');
  };
  const promoteObservation = (observationId: string) => {
    const result = promoteObservationToEvidence({ graph, observationId });
    if (!result.evidenceId) { showToast('Não foi possível criar a evidência.'); return; }
    setGraph(() => result.graph, 'H7.26: observação → evidência');
    setSelectedEvidenceId(result.evidenceId);
    showToast('Observação promovida para Evidência com a origem preservada.');
  };
  const saveInsight = () => {
    if (!insightDraft.title.trim() || !insightDraft.evidenceIds.length) { showToast(experience.level === 'foundation' ? 'O aprendizado precisa de um título e pelo menos uma evidência.' : 'O Insight precisa de um título e pelo menos uma Evidência.'); return; }
    const result = createResearchInsight({ graph, title: insightDraft.title, description: insightDraft.description, evidenceIds: insightDraft.evidenceIds });
    setGraph(() => result.graph, 'H7.26: evidência → insight');
    setInsightDraft({ title: '', description: '', evidenceIds: [] });
    setDialog(null); setTab('insights'); showToast(experience.level === 'foundation' ? 'Aprendizado criado com origem nas evidências.' : 'Insight criado com rastreabilidade até as evidências.');
  };
  const promoteInsight = (insightId: string, target: 'need' | 'problemHypothesis') => {
    const result = promoteResearchInsight({ graph, insightId, target });
    if (!result.entityId) return;
    setGraph(() => result.graph, `H7.26: insight → ${target}`);
    showToast(target === 'need' ? 'Necessidade criada a partir do Insight.' : 'Hipótese criada. Valide-a com evidências antes de promover para Problema.');
  };

  const canDropResearchItem = (item: ResearchDragItem | null, target: ResearchDropTarget) => Boolean(item && (
    (item.kind === 'source' && target === 'observations') ||
    (item.kind === 'observation' && target === 'evidence') ||
    (item.kind === 'evidence' && target === 'insights')
  ));
  const startResearchDrag = (event: DragEvent<HTMLElement>, item: ResearchDragItem) => {
    setDragItem(item);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', `${item.kind}:${item.id}`);
  };
  const dragOverResearchTarget = (event: DragEvent<HTMLElement>, target: ResearchDropTarget) => {
    if (!canDropResearchItem(dragItem, target)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dropTarget !== target) setDropTarget(target);
  };
  const dropResearchItem = (event: DragEvent<HTMLElement>, target: ResearchDropTarget) => {
    if (!canDropResearchItem(dragItem, target) || !dragItem) return;
    event.preventDefault();
    const item = dragItem;
    setDropTarget(null);
    setDragItem(null);
    if (item.kind === 'source' && target === 'observations') {
      const source = report.sources.find((candidate) => candidate.id === item.id);
      setObservationDraft((current) => ({
        ...current,
        sourceId: item.id,
        participant: current.participant || String(source?.participant ?? ''),
        observedAt: current.observedAt || String(source?.date ?? '').slice(0, 10),
      }));
      setDialog('observation');
      showToast('Material selecionado. Registre agora o que foi observado.');
      return;
    }
    if (item.kind === 'observation' && target === 'evidence') {
      const observation = report.observations.find((candidate) => candidate.id === item.id);
      if (observation?.evidenceId) {
        setSelectedEvidenceId(observation.evidenceId);
        showToast('Esta observação já possui uma evidência vinculada.');
      } else {
        promoteObservation(item.id);
      }
      return;
    }
    if (item.kind === 'evidence' && target === 'insights') {
      setSelectedEvidenceId(item.id);
      setInsightDraft((current) => ({ ...current, evidenceIds: current.evidenceIds.includes(item.id) ? current.evidenceIds : [...current.evidenceIds, item.id] }));
      setDialog('insight');
      showToast('Evidência selecionada para formar um aprendizado.');
    }
  };
  const endResearchDrag = () => { setDragItem(null); setDropTarget(null); };

  return <div className="bo-h726-research" data-research-studio="7.26" data-research-ux="7.40-H15.6" data-adaptive-experience="H16" data-foundation-deep-adaptation="H16.1" data-research-driven-context="H16.2" data-research-proposal="H16.5" data-research-proposal-hotfix="H16.5.1" data-research-workflow-ux="H16.6" data-research-flow-polish="H16.7" data-single-experience="H17" data-experience-level={experience.level} data-experience-density={experience.meta.density}>
    {experience.level === 'foundation' ? <div className="bo-h165-foundation-research" data-research-workflow-ux="H16.6" data-research-surface={foundationSurface}>
      <header className="bo-h165-head bo-h166-head">
        <div><small>{foundationSurface === 'tools' ? 'APOIO À PESQUISA' : 'PESQUISA DO SERVIÇO'}</small><h2>{foundationSurface === 'tools' ? 'Ferramentas' : 'Pesquisa'}</h2><p>{foundationSurface === 'tools' ? 'Escolha um recurso conforme o momento da pesquisa. As ferramentas apoiam o fluxo sem criar uma etapa paralela.' : 'Organize perguntas, campo, evidências e síntese sem perder a origem do que foi aprendido.'}</p></div>
        {foundationSurface === 'research' && <div className="bo-h165-head-actions">
          <div className="bo-h165-view-toggle" role="group" aria-label="Visualização da pesquisa">
            {([['flow','Fluxo'],['list','Lista'],['map','Mapa']] as Array<[FoundationResearchView,string]>).map(([id,label]) => <button key={id} type="button" aria-pressed={foundationView === id} className={foundationView === id ? 'active' : ''} onClick={() => setFoundationView(id)}>{label}</button>)}
          </div>
          <details className="bo-h165-add-menu"><summary>+ Adicionar registro <span>▾</span></summary><div><button type="button" onClick={() => setDialog('project')}>Pergunta de pesquisa</button><button type="button" onClick={() => openSourceDialog()}>Material ou fonte</button><button type="button" onClick={() => setDialog('observation')}>Nota de campo</button><button type="button" onClick={() => setDialog('insight')} disabled={!report.evidence.length}>Aprendizado</button></div></details>
        </div>}
      </header>

      {foundationSurface === 'tools' ? <section className="bo-h166-tools-view" aria-label="Ferramentas de pesquisa">
        <div className="bo-h166-tools-intro"><span><Wrench size={18}/></span><div><small>FERRAMENTAS</small><h3>Escolha a ferramenta pelo que você precisa fazer agora</h3><p>Planeje a pergunta, colete material e sintetize somente quando houver evidência suficiente.</p></div></div>
        <div className="bo-h166-tool-groups">
          <section><header><small>PLANEJAR</small><h4>Defina o que precisa aprender</h4></header><div>
            <button type="button" onClick={() => setDialog('project')}><span><Microscope size={18}/></span><strong>Pergunta de pesquisa</strong><p>Defina a questão que orienta a coleta e evita pesquisar sem foco.</p><em>Começar <ArrowRight size={13}/></em></button>
            <button type="button" onClick={() => openSourceDialog('interview')}><span><FileText size={18}/></span><strong>Roteiro de entrevista</strong><p>Prepare temas e perguntas para uma conversa de pesquisa.</p><em>Preparar <ArrowRight size={13}/></em></button>
          </div></section>
          <section><header><small>COLETAR</small><h4>Registre o que aconteceu</h4></header><div>
            <button type="button" onClick={() => openSourceDialog()}><span><FileText size={18}/></span><strong>Material ou fonte</strong><p>Guarde entrevista, documento, analytics ou outro material bruto.</p><em>Adicionar <ArrowRight size={13}/></em></button>
            <button type="button" onClick={() => setDialog('observation')}><span><Quote size={18}/></span><strong>Nota de campo</strong><p>Registre algo visto, dito ou medido sem interpretar cedo demais.</p><em>Registrar <ArrowRight size={13}/></em></button>
            <button type="button" onClick={() => openSourceDialog('survey')}><span><FileText size={18}/></span><strong>Questionário</strong><p>Adicione uma fonte estruturada para coletar respostas comparáveis.</p><em>Adicionar <ArrowRight size={13}/></em></button>
          </div></section>
          <section><header><small>SINTETIZAR</small><h4>Transforme evidências em aprendizado</h4></header><div>
            <button type="button" onClick={() => setDialog('insight')} disabled={!report.evidence.length}><span><Sparkles size={18}/></span><strong>Agrupar por afinidade</strong><p>Selecione evidências relacionadas e explicite o padrão que elas sustentam.</p><em>{report.evidence.length ? 'Sintetizar' : 'Requer evidências'} <ArrowRight size={13}/></em></button>
          </div></section>
        </div>
      </section> : <>
        <section className="bo-h165-next" aria-label="Próximo passo da pesquisa">
          <div><small>PRÓXIMO PASSO</small><h3>{nextResearchAction.title}</h3><p>{nextResearchAction.help}</p></div>
          <button type="button" onClick={nextResearchAction.action}>{nextResearchAction.label} <ArrowRight size={15}/></button>
          <div className="bo-h167-research-state" aria-label="Estado atual da pesquisa">
            {foundationResearchStates.map((item) => <span key={item.id} className={`is-${item.state}`}><i aria-hidden="true">{item.state === 'done' ? '✓' : item.state === 'attention' ? '!' : '○'}</i><b>{item.label}</b><small>{item.detail}</small></span>)}
          </div>
        </section>

        {foundationView === 'flow' && <div className="bo-h165-workspace bo-h166-workspace">
          <section className="bo-h165-board bo-h166-board" aria-label="Fluxo da pesquisa">
            <article className="bo-h165-column bo-h166-drop-column"><header><div><strong>Materiais</strong><small>Fontes e registros brutos</small></div><b>{report.sources.length}</b></header><div className="bo-h165-stack">
              {report.sources.map((source) => <div key={source.id} draggable onDragStart={(event) => startResearchDrag(event, { kind: 'source', id: source.id })} onDragEnd={endResearchDrag} className={`bo-h165-item bo-h166-card ${dragItem?.kind === 'source' && dragItem.id === source.id ? 'is-dragging' : ''}`}><div className="bo-h166-card-kicker"><span>{RESEARCH_METHOD_LABELS[source.type]}</span><GripVertical size={14} aria-hidden="true"/></div><strong>{source.title}</strong><p>{source.summary || source.participant || 'Material registrado na pesquisa.'}</p><small>{formatDate(source.date || source.updatedAt)} · Arraste para Observações</small></div>)}
              {!report.sources.length && <div className="bo-h165-empty"><strong>Comece por uma fonte.</strong><span>Entrevista, documento, analytics ou outro material bruto.</span><button type="button" onClick={() => openSourceDialog()}>+ Adicionar material</button></div>}
            </div></article>
            <article className={`bo-h165-column bo-h166-drop-column ${dropTarget === 'observations' ? 'is-drop-ready' : ''}`} onDragOver={(event) => dragOverResearchTarget(event, 'observations')} onDrop={(event) => dropResearchItem(event, 'observations')}><header><div><strong>Observações</strong><small>O que você viu ou ouviu</small></div><b>{report.observations.length}</b></header><div className="bo-h165-stack">
              {report.observations.map((observation) => <div key={observation.id} draggable onDragStart={(event) => startResearchDrag(event, { kind: 'observation', id: observation.id })} onDragEnd={endResearchDrag} className={`bo-h165-item bo-h166-card ${dragItem?.kind === 'observation' && dragItem.id === observation.id ? 'is-dragging' : ''}`}><div className="bo-h166-card-kicker"><span>{OBSERVATION_KIND_LABELS[observation.kind]}</span><GripVertical size={14} aria-hidden="true"/></div><strong>{observation.text}</strong>{observation.context && <p>{observation.context}</p>}<footer>{observation.evidenceId ? <em><CheckCircle2 size={12}/> Evidência criada</em> : <button type="button" onClick={() => promoteObservation(observation.id)}>Transformar em evidência</button>}</footer><small>Arraste para Evidências</small></div>)}
              {!report.observations.length && <div className="bo-h165-empty"><strong>Registre algo visto ou ouvido.</strong><span>Ou arraste um Material para cá para começar com a origem preservada.</span><button type="button" onClick={() => setDialog('observation')}>+ Registrar observação</button></div>}
            </div><div className="bo-h166-drop-hint">Solte um material aqui para registrar uma observação</div></article>
            <article className={`bo-h165-column bo-h166-drop-column ${dropTarget === 'evidence' ? 'is-drop-ready' : ''}`} onDragOver={(event) => dragOverResearchTarget(event, 'evidence')} onDrop={(event) => dropResearchItem(event, 'evidence')}><header><div><strong>Evidências</strong><small>Sinais com origem rastreável</small></div><b>{report.evidence.length}</b></header><div className="bo-h165-stack">
              {report.evidence.map((evidence) => { const orphan = !idsOf(evidence.sourceIds).length && !idsOf(evidence.observationIds).length; return <article key={evidence.id} draggable onDragStart={(event) => startResearchDrag(event, { kind: 'evidence', id: evidence.id })} onDragEnd={endResearchDrag} className={`bo-h165-item bo-h165-evidence bo-h166-card ${focusedEvidenceId === evidence.id ? 'selected' : ''} ${dragItem?.kind === 'evidence' && dragItem.id === evidence.id ? 'is-dragging' : ''}`}><button type="button" className="bo-h167-evidence-open" onClick={() => setSelectedEvidenceId(evidence.id)}><div className="bo-h166-card-kicker"><span>EVIDÊNCIA</span><GripVertical size={14} aria-hidden="true"/></div><strong>{titleOf(evidence)}</strong><p>{String(evidence.description ?? '') || 'Evidência capturada na pesquisa.'}</p></button><footer>{orphan ? <button type="button" className="bo-h167-origin-action" onClick={() => setSelectedEvidenceId(evidence.id)}>⚠ Origem ausente · Vincular origem</button> : <em><CheckCircle2 size={12}/> Origem vinculada</em>}</footer><small>Arraste para Aprendizados</small></article>; })}
              {!report.evidence.length && <div className="bo-h165-empty"><strong>Transforme observações em evidência.</strong><span>Arraste uma Observação para cá ou use a ação abaixo.</span><button type="button" onClick={() => setDialog('observation')}>Registrar observação</button></div>}
            </div><div className="bo-h166-drop-hint">Solte uma observação aqui para transformá-la em evidência</div></article>
            <article className={`bo-h165-column bo-h166-drop-column ${dropTarget === 'insights' ? 'is-drop-ready' : ''}`} onDragOver={(event) => dragOverResearchTarget(event, 'insights')} onDrop={(event) => dropResearchItem(event, 'insights')}><header><div><strong>Aprendizados</strong><small>O que isso significa para o serviço</small></div><b>{report.insights.length}</b></header><div className="bo-h165-stack">
              {report.insights.map((insight) => <div key={insight.id} className="bo-h165-item bo-h166-card bo-h166-card--settled"><div className="bo-h166-card-kicker"><span>APRENDIZADO</span><CheckCircle2 size={13} aria-hidden="true"/></div><strong>{titleOf(insight)}</strong><p>{String(insight.description ?? '') || 'Síntese sustentada por evidências.'}</p><small>{idsOf(insight.evidenceIds).length} evidência(s)</small></div>)}
              {!report.insights.length && <div className="bo-h165-empty"><strong>Encontre um padrão nas evidências.</strong><span>Arraste uma Evidência para cá para começar a síntese.</span><button type="button" onClick={() => setDialog('insight')} disabled={!evidenceWithOriginCount}>Agrupar por afinidade</button></div>}
            </div><div className="bo-h166-drop-hint">Solte uma evidência aqui para iniciar um aprendizado</div></article>
          </section>

          {focusedEvidence && <aside className="bo-h165-evidence-panel bo-h167-evidence-drawer" aria-label="Detalhes da evidência selecionada">
            <button type="button" className="bo-h167-drawer-close" aria-label="Fechar detalhes da evidência" onClick={() => setSelectedEvidenceId('')}><X size={16}/></button>
            <small>EVIDÊNCIA SELECIONADA</small><h3>{titleOf(focusedEvidence)}</h3><p>{String(focusedEvidence.description ?? '') || 'Sem descrição adicional.'}</p>
            <div className="bo-h165-panel-block"><span>ORIGEM</span>{idsOf(focusedEvidence.sourceIds).length || idsOf(focusedEvidence.observationIds).length ? <button type="button" onClick={() => openServiceObject('evidence', focusedEvidence.id)}>{idsOf(focusedEvidence.observationIds).length ? `${idsOf(focusedEvidence.observationIds).length} observação(ões) vinculada(s)` : `${idsOf(focusedEvidence.sourceIds).length} material(is) vinculado(s)`} <ArrowRight size={13}/></button> : <><p className="bo-h167-origin-copy">Esta evidência ainda não está ligada ao material ou à observação que a sustenta.</p><button type="button" className="bo-h167-link-origin" onClick={() => openServiceObject('evidence', focusedEvidence.id)}>Vincular origem <ArrowRight size={13}/></button></>}</div>
            <div className="bo-h165-panel-block"><span>{(focusedEvidenceReport?.connectionCounts.persona || focusedEvidenceReport?.connectionCounts.need || focusedEvidenceReport?.connectionCounts.pain || focusedEvidenceReport?.connectionCounts.problem) ? 'SUSTENTA' : 'PODE SUSTENTAR'}</span><div className="bo-h165-support-chips">
              <button type="button" className={focusedEvidenceReport?.connectionCounts.persona ? 'on' : ''} onClick={() => openFocusedEvidenceContext('persona', 'personas')}>{focusedEvidenceReport?.connectionCounts.persona ? `Pessoa · ${focusedEvidenceReport.connectionCounts.persona}` : '+ Pessoa'}</button>
              <button type="button" className={focusedEvidenceReport?.connectionCounts.need ? 'on' : ''} onClick={() => openFocusedEvidenceContext('need', 'needs')}>{focusedEvidenceReport?.connectionCounts.need ? `Necessidade · ${focusedEvidenceReport.connectionCounts.need}` : '+ Necessidade'}</button>
              <button type="button" className={focusedEvidenceReport?.connectionCounts.pain ? 'on' : ''} onClick={() => openFocusedEvidenceContext('pain', 'pains')}>{focusedEvidenceReport?.connectionCounts.pain ? `Dor · ${focusedEvidenceReport.connectionCounts.pain}` : '+ Dor'}</button>
              <button type="button" className={focusedEvidenceReport?.connectionCounts.problem ? 'on' : ''} onClick={() => openFocusedEvidenceContext('problem', 'problems')}>{focusedEvidenceReport?.connectionCounts.problem ? `Problema · ${focusedEvidenceReport.connectionCounts.problem}` : '+ Problema'}</button>
            </div></div>
          </aside>}
          <section className="bo-h167-understanding-strip" aria-label="O que estamos compreendendo com a pesquisa"><header><small>O QUE ESTAMOS COMPREENDENDO</small><strong>Pessoas, necessidades, dores e problemas</strong></header><div>
            <button type="button" onClick={() => openContextPage('personas')}><span>Pessoas</span><b>{contextCounts.personas ? `${contextCounts.personas} identificada(s)` : 'Nenhuma ainda'}</b><em>{contextCounts.personas ? 'Ver' : 'Identificar'}</em></button>
            <button type="button" onClick={() => openContextPage('needs')}><span>Necessidades</span><b>{contextCounts.needs ? `${contextCounts.needs} identificada(s)` : 'Nenhuma ainda'}</b><em>{contextCounts.needs ? 'Ver' : 'Identificar'}</em></button>
            <button type="button" onClick={() => openContextPage('pains')}><span>Dores</span><b>{contextCounts.pains ? `${contextCounts.pains} identificada(s)` : 'Nenhuma ainda'}</b><em>{contextCounts.pains ? 'Ver' : 'Identificar'}</em></button>
            <button type="button" onClick={() => openContextPage('problems')}><span>Problemas</span><b>{contextCounts.problems ? `${contextCounts.problems} formulado(s)` : 'Nenhum ainda'}</b><em>{contextCounts.problems ? 'Ver' : 'Formular'}</em></button>
          </div></section>
        </div>}

        {foundationView === 'list' && <section className="bo-h165-list-view" aria-label="Lista da pesquisa">
          {[
            ['Materiais', report.sources.map((item) => ({ id:item.id, title:item.title, meta:RESEARCH_METHOD_LABELS[item.type], detail:item.summary || item.participant || 'Fonte registrada' }))],
            ['Observações', report.observations.map((item) => ({ id:item.id, title:item.text, meta:OBSERVATION_KIND_LABELS[item.kind], detail:item.context || (item.evidenceId ? 'Evidência criada' : 'Aguardando evidência') }))],
            ['Evidências', report.evidence.map((item) => ({ id:item.id, title:titleOf(item), meta:`${idsOf(item.observationIds).length} observação(ões)`, detail:String(item.description ?? '') || 'Evidência capturada' }))],
            ['Aprendizados', report.insights.map((item) => ({ id:item.id, title:titleOf(item), meta:`${idsOf(item.evidenceIds).length} evidência(s)`, detail:String(item.description ?? '') || 'Síntese da pesquisa' }))],
          ].map(([label, values]) => <div key={String(label)} className="bo-h165-list-section"><header><strong>{String(label)}</strong><b>{(values as Array<{id:string}>).length}</b></header>{(values as Array<{id:string;title:string;meta:string;detail:string}>).map((item) => <button type="button" key={item.id} onClick={() => { if (label === 'Evidências') { setSelectedEvidenceId(item.id); setFoundationView('flow'); } }}><span><strong>{item.title}</strong><small>{item.detail}</small></span><em>{item.meta}</em>{label === 'Evidências' && <ArrowRight size={14}/>}</button>)}{!(values as Array<unknown>).length && <p>Nenhum registro nesta etapa.</p>}</div>)}
        </section>}

        {foundationView === 'map' && <div className="bo-h165-map-view">
          <section><small>MAPA DA PESQUISA</small><h3>Veja como o que foi coletado se transforma em compreensão</h3><p>O mapa mostra a sequência entre material, observação, evidência e aprendizado sem exigir leitura técnica de rastreabilidade.</p><div className="bo-h165-map-track"><span><b>{report.counts.material}</b>Materiais</span><ArrowRight size={16}/><span><b>{report.counts.observation}</b>Observações</span><ArrowRight size={16}/><span><b>{report.counts.evidence}</b>Evidências</span><ArrowRight size={16}/><span><b>{report.counts.insight}</b>Aprendizados</span></div>
            <div className="bo-h165-map-traces">{traces.slice(0,6).map((row) => <article key={row.evidence.id}><span>{row.source?.title || 'Sem material'}</span><ArrowRight size={12}/><span>{row.observation?.text || 'Sem observação'}</span><ArrowRight size={12}/><button type="button" onClick={() => { setSelectedEvidenceId(row.evidence.id); setFoundationView('flow'); }}>{titleOf(row.evidence)}</button><ArrowRight size={12}/><span>{row.insights.map(titleOf).join(', ') || 'Aprendizado pendente'}</span></article>)}</div>
          </section>
          <aside><small>O QUE ESTAMOS COMPREENDENDO</small><div><button type="button" onClick={() => openContextPage('personas')}><b>{contextCounts.personas}</b><span>Pessoas</span><small>Personas</small></button><button type="button" onClick={() => openContextPage('needs')}><b>{contextCounts.needs}</b><span>O que precisam</span><small>Necessidades</small></button><button type="button" onClick={() => openContextPage('pains')}><b>{contextCounts.pains}</b><span>Onde dói</span><small>Dores</small></button><button type="button" onClick={() => openContextPage('problems')}><b>{contextCounts.problems}</b><span>Problemas a resolver</span><small>Problemas</small></button></div></aside>
        </div>}
      </>}
    </div> : <>
    <section className={`bo-h156-hero ${isEmptyResearch ? 'is-empty' : ''}`} aria-labelledby="bo-h156-research-title">
      <div className="bo-h156-hero-copy">
        <small>PESQUISA DO SERVIÇO</small>
        <h2 id="bo-h156-research-title">{experience.level === 'advanced' ? 'Pesquisa, evidência e rastreabilidade em uma só visão' : 'Transforme perguntas em evidências confiáveis'}</h2>
        <p>{experience.level === 'advanced' ? 'Acompanhe projetos, campo, proveniência, evidências, insights e decisões com maior densidade operacional.' : 'Organize o que precisa ser aprendido, preserve o material de campo e mantenha a origem de cada evidência, insight e decisão.'}</p>
        <span className="bo-h16-profile-chip">Modo · {experience.meta.label}</span>
        {activeProject && <div className="bo-h156-active-project"><span>PROJETO ATIVO</span><strong>{activeProject.title}</strong><small>{activeProject.goal || 'Pergunta de pesquisa ainda não definida.'}</small></div>}
      </div>
      <aside className="bo-h156-next" aria-label="Próximo passo da pesquisa">
        <span>PRÓXIMO PASSO</span>
        <strong>{nextResearchAction.title}</strong>
        <p>{nextResearchAction.help}</p>
        <button type="button" className="primary" onClick={nextResearchAction.action}>{nextResearchAction.label} <ArrowRight size={14}/></button>
        <div className="bo-h156-secondary-actions">
          <button type="button" onClick={() => setDialog('source')}><FileText size={14}/> Adicionar material</button>
          <button type="button" onClick={() => setDialog('observation')}><Quote size={14}/> Registrar observação</button>
        </div>
      </aside>
    </section>

    <section className="bo-h156-summary" aria-label="Resumo da pesquisa">
      <article><span>Projetos</span><strong>{report.counts.projects}</strong><small>{report.counts.projects ? 'estruturados' : 'comece pela pergunta'}</small></article>
      <article><span>Participantes</span><strong>{participantCount}</strong><small>{participantCount ? 'identificados' : 'ainda não informados'}</small></article>
      <article><span>Evidências</span><strong>{report.counts.evidence}</strong><small>{report.orphanEvidenceIds.length ? `${report.orphanEvidenceIds.length} pedem origem` : 'com proveniência visível'}</small></article>
      <article><span>Insights</span><strong>{report.counts.insight}</strong><small>{report.unsupportedInsightIds.length ? `${report.unsupportedInsightIds.length} pedem evidência` : 'síntese sustentada'}</small></article>
    </section>

    {experience.level === 'advanced' && <section className="bo-h16-advanced-research" aria-label="Indicadores avançados da pesquisa"><article><span>Materiais</span><strong>{report.counts.material}</strong></article><article><span>Observações</span><strong>{report.counts.observation}</strong></article><article><span>Origem pendente</span><strong>{report.orphanEvidenceIds.length}</strong></article><article><span>Insights sem suporte</span><strong>{report.unsupportedInsightIds.length}</strong></article><article><span>Rastreabilidade</span><strong>{report.traceabilityScore}%</strong></article></section>}

    <section className="bo-h156-progress" aria-label={`Maturidade da pesquisa ${researchMaturity}%`}>
      <div className="bo-h156-progress-head"><div><small>MATURIDADE DA PESQUISA</small><strong>{researchMaturity}%</strong></div><span>Indicador de orientação — não bloqueia o trabalho.</span></div>
      <div className="bo-h156-progress-bar"><i style={{ width: `${researchMaturity}%` }}/></div>
      <div className="bo-h156-progress-checks">
        <span className={maturityChecks[0] ? 'done' : ''}>{maturityChecks[0] ? '✓' : '○'} Pergunta e projeto</span>
        <span className={maturityChecks[1] ? 'done' : ''}>{maturityChecks[1] ? '✓' : '○'} Campo e materiais</span>
        <span className={maturityChecks[2] ? 'done' : ''}>{maturityChecks[2] ? '✓' : '○'} Evidências</span>
        <span className={maturityChecks[3] ? 'done' : ''}>{maturityChecks[3] ? '✓' : '○'} Síntese</span>
      </div>
    </section>

    <section className="bo-h156-flow" aria-label="Caminho da pesquisa">
      <div className="bo-h156-flow-title"><small>CAMINHO DA PESQUISA</small><strong>Do campo à decisão, sem perder a origem</strong></div>
      <div className="bo-h156-flow-track">
        {[
          ['Material', report.counts.material, 'research'],
          ['Observação', report.counts.observation, 'note'],
          ['Evidência', report.counts.evidence, 'evidence'],
          ['Insight', report.counts.insight, 'insight'],
          ['Decisão', report.counts.decision, 'problemHypothesis'],
        ].map(([label, count, icon], index) => <div key={String(label)} className={`bo-h156-flow-step ${Number(count) ? 'is-ready' : ''}`}>
          <span>{icon === 'research' ? <Microscope size={16}/> : <BlueOceanObjectIcon kind={icon as 'note' | 'evidence' | 'insight' | 'problemHypothesis'} size={16}/>}</span>
          <div><strong>{label}</strong><small>{count}</small></div>
          {index < 4 && <ArrowRight size={14}/>} 
        </div>)}
      </div>
    </section>

    <section className="bo-h156-workspace">
      <header className="bo-h156-workspace-head">
        <div><small>TRABALHO DA PESQUISA</small><strong>Escolha a área que você quer desenvolver agora</strong></div>
        {activeProject && <span>Projeto ativo · <b>{activeProject.title}</b></span>}
      </header>
      <nav className="bo-h726-tabs bo-h156-tabs" aria-label="Áreas do Research Studio" role="tablist">
        {visibleResearchTabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </nav>

      {tab !== 'projects' && <div className="bo-h726-toolbar bo-h156-toolbar"><label><Search size={15}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nesta pesquisa"/></label></div>}

      {tab === 'projects' && <section className="bo-h726-pane bo-h156-pane"><div className="bo-h726-pane-head"><div><small>PROJETOS</small><h3>Qual pergunta estamos tentando responder?</h3><p>Um projeto organiza objetivo, método, participantes e materiais antes da síntese.</p></div>{report.projects.length > 0 && <button type="button" className="primary" onClick={() => setDialog('project')}><Plus size={15}/> Novo projeto</button>}</div>
        <div className="bo-h726-project-grid">{report.projects.map((project) => <article key={project.id} className={activeProject?.id === project.id ? 'is-active' : ''}><header><span><Microscope size={16}/>{RESEARCH_PROJECT_STATUS_LABELS[project.status]}</span><time>{formatDate(project.updatedAt)}</time></header><h4>{project.title}</h4><p>{project.goal || 'Objetivo ainda não definido.'}</p><footer><span>{project.sourceIds.length} materiais</span><span>{project.observationIds.length} observações</span><span>{project.methodIds.map((method) => RESEARCH_METHOD_LABELS[method]).join(' · ') || 'Método a definir'}</span></footer></article>)}</div>
        {!report.projects.length && <div className="bo-h156-empty-start"><div className="bo-h156-empty-icon"><Microscope size={26}/></div><small>COMECE PELA PERGUNTA</small><h3>Nenhum projeto de pesquisa ainda</h3><p>Estruture primeiro o que precisa ser aprendido. Isso evita coletar material sem saber qual decisão a pesquisa precisa sustentar.</p><ol><li><b>1</b><span><strong>Defina o que queremos aprender</strong><small>Escreva a pergunta ou objetivo da pesquisa.</small></span></li><li><b>2</b><span><strong>Escolha como investigar</strong><small>Entrevista, observação, survey, documento ou outro método.</small></span></li><li><b>3</b><span><strong>Colete sem interpretar cedo demais</strong><small>Depois organize observações, evidências e insights.</small></span></li></ol><button type="button" className="primary" onClick={() => setDialog('project')}><Plus size={14}/> Criar primeiro projeto</button><div><button type="button" onClick={() => setDialog('source')}>Adicionar material existente</button><button type="button" onClick={() => setDialog('observation')}>Registrar observação</button></div></div>}
      </section>}

      {tab === 'field' && <section className="bo-h726-pane bo-h156-pane"><div className="bo-h726-pane-head"><div><small>CAMPO E MATERIAIS</small><h3>Preserve o que aconteceu antes de interpretar</h3><p>Materiais guardam a origem; observações registram aquilo que foi dito, visto ou medido.</p></div><div><button type="button" onClick={() => setDialog('source')}><FileText size={15}/> Adicionar material</button><button type="button" className="primary" onClick={() => setDialog('observation')}><Quote size={15}/> Registrar observação</button></div></div>
        {!activeProject && <div className="bo-h156-context-note"><Microscope size={16}/><div><strong>Você ainda não tem um projeto ativo.</strong><p>É possível registrar material solto, mas criar um projeto primeiro melhora contexto e rastreabilidade.</p></div><button type="button" onClick={() => setDialog('project')}>Criar projeto</button></div>}
        <div className="bo-h726-split"><div><h4>Materiais <span>{filteredSources.length}</span></h4><div className="bo-h726-stack">{filteredSources.map((source) => <article key={source.id} className="bo-h726-source-card"><header><b>{RESEARCH_METHOD_LABELS[source.type]}</b><time>{formatDate(source.date || source.updatedAt)}</time></header><strong>{source.title}</strong><p>{source.summary || 'Sem resumo.'}</p><footer><span>{source.participant || source.sample || 'Contexto não informado'}</span><span>{source.owner || 'Sem responsável'}</span></footer></article>)}</div></div>
        <div><h4>Observações <span>{filteredObservations.length}</span></h4><div className="bo-h726-stack">{filteredObservations.map((observation) => <article key={observation.id} className={`bo-h726-observation-card is-${observation.kind}`}><header><b>{OBSERVATION_KIND_LABELS[observation.kind]}</b>{observation.evidenceId ? <span className="is-linked"><CheckCircle2 size={13}/> Evidência criada</span> : null}</header><blockquote>{observation.text}</blockquote>{observation.context && <p>{observation.context}</p>}<footer><span>{observation.participant || 'Contexto não informado'}</span>{!observation.evidenceId && <button type="button" onClick={() => promoteObservation(observation.id)}>Transformar em Evidência <ArrowRight size={13}/></button>}</footer></article>)}</div></div></div>
        {!filteredSources.length && !filteredObservations.length && <div className="bo-h726-empty"><Quote size={28}/><strong>Comece pelo que foi realmente visto, dito ou medido</strong><p>Adicione um material ou registre uma observação. A interpretação vem depois.</p><button type="button" onClick={() => setDialog('source')}>Adicionar primeiro material</button></div>}
      </section>}

      {tab === 'evidence' && <section className="bo-h726-pane bo-h156-pane"><div className="bo-h726-pane-head"><div><small>EVIDÊNCIAS</small><h3>O que podemos sustentar?</h3><p>Evidência deve apontar para sua observação e material de origem.</p></div><button type="button" className="primary" onClick={() => setDialog('insight')} disabled={!report.evidence.length}><Sparkles size={15}/> Criar Insight</button></div>
        <div className="bo-h726-card-grid">{filteredEvidence.map((evidence) => <article key={evidence.id} className="bo-h726-evidence-card"><header><BlueOceanObjectIcon kind="evidence" size={17}/><span>{String(evidence.confidence ?? 'medium')}</span></header><h4>{titleOf(evidence)}</h4><p>{String(evidence.description ?? '')}</p><div className="bo-h726-tags"><span>{idsOf(evidence.sourceIds).length} fonte(s)</span><span>{idsOf(evidence.observationIds).length} observação(ões)</span><span>{idsOf(evidence.insightIds).length} insight(s)</span></div></article>)}</div>
        {!filteredEvidence.length && <div className="bo-h726-empty"><BlueOceanObjectIcon kind="evidence" size={28}/><strong>Nenhuma Evidência derivada da pesquisa</strong><p>Promova uma Observação quando ela estiver clara e tiver contexto suficiente.</p><button type="button" onClick={() => setTab('field')}>Abrir Campo & materiais</button></div>}
      </section>}

      {tab === 'insights' && <section className="bo-h726-pane bo-h156-pane"><div className="bo-h726-pane-head"><div><small>INSIGHTS</small><h3>O que as evidências significam para o serviço?</h3><p>Insights são interpretações sustentadas. Eles podem alimentar Necessidades e Hipóteses — não substituem evidência.</p></div><button type="button" className="primary" onClick={() => setDialog('insight')} disabled={!report.evidence.length}><Lightbulb size={15}/> Novo Insight</button></div>
        <div className="bo-h726-card-grid">{filteredInsights.map((insight) => <article key={insight.id} className="bo-h726-insight-card"><header><BlueOceanObjectIcon kind="insight" size={17}/><span>O QUE ISSO SIGNIFICA</span></header><h4>{titleOf(insight)}</h4><p>{String(insight.description ?? '')}</p><div className="bo-h726-tags"><span>{idsOf(insight.evidenceIds).length} evidência(s)</span><span>{idsOf(insight.promotedToIds).length} decisão(ões)</span></div><footer><button type="button" onClick={() => promoteInsight(insight.id, 'need')}>Necessidade</button><button type="button" onClick={() => promoteInsight(insight.id, 'problemHypothesis')}>Hipótese</button><small>Problema somente após validação da Hipótese.</small></footer></article>)}</div>
        {!filteredInsights.length && <div className="bo-h726-empty"><BlueOceanObjectIcon kind="insight" size={28}/><strong>Nenhum Insight ainda</strong><p>Selecione Evidências e explicite o significado delas para o serviço.</p></div>}
      </section>}

      {tab === 'trace' && <section className="bo-h726-pane bo-h156-pane"><div className="bo-h726-pane-head"><div><small>RASTREABILIDADE</small><h3>Da pesquisa à decisão</h3><p>Veja onde uma conclusão nasceu e quais decisões ela influenciou.</p></div><div className="bo-h156-trace-score"><strong>{report.traceabilityScore}%</strong><span>pipeline rastreável</span></div></div>
        <div className="bo-h726-trace">{traces.map((row) => <article key={row.evidence.id}><div><small>MATERIAL</small><strong>{row.source?.title || 'Sem fonte'}</strong></div><ArrowRight size={14}/><div><small>OBSERVAÇÃO</small><strong>{row.observation?.text || 'Sem observação'}</strong></div><ArrowRight size={14}/><div><small>EVIDÊNCIA</small><strong>{titleOf(row.evidence)}</strong></div><ArrowRight size={14}/><div><small>INSIGHT</small><strong>{row.insights.map(titleOf).join(', ') || 'Pendente'}</strong></div><ArrowRight size={14}/><div><small>DECISÃO</small><strong>{row.decisions.map((item) => item ? titleOf(item.entity) : '').filter(Boolean).join(', ') || 'Pendente'}</strong></div></article>)}</div>
        {!traces.length && <div className="bo-h726-empty"><ArrowRight size={28}/><strong>A rastreabilidade aparecerá aqui</strong><p>Material → Observação → Evidência → Insight → Necessidade/Hipótese/Problema.</p></div>}
      </section>}
    </section>

    </>}

    {dialog && <div className="bo-h726-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(null); }}><div className="bo-h726-modal">
      <header><div><small>PESQUISA DO SERVIÇO</small><h3>{dialog === 'project' ? (experience.level === 'foundation' ? 'Nova pergunta de pesquisa' : 'Novo projeto de pesquisa') : dialog === 'source' ? 'Adicionar material' : dialog === 'observation' ? 'Registrar observação' : (experience.level === 'foundation' ? 'Registrar aprendizado' : 'Criar Insight')}</h3></div><button type="button" onClick={() => setDialog(null)} aria-label="Fechar"><X size={17}/></button></header>
      {dialog === 'project' && <div className="bo-h726-form"><label className="full"><span>{experience.level === 'foundation' ? 'Nome da pesquisa' : 'Nome do projeto'}</span><input autoFocus value={projectDraft.title} onChange={(e) => setProjectDraft({ ...projectDraft, title: e.target.value })} placeholder="Ex.: Entender abandono no agendamento"/></label><label className="full"><span>Pergunta / objetivo</span><textarea value={projectDraft.goal} onChange={(e) => setProjectDraft({ ...projectDraft, goal: e.target.value })} placeholder="O que precisamos compreender antes de decidir?"/></label><label><span>Método principal</span><select value={projectDraft.method} onChange={(e) => setProjectDraft({ ...projectDraft, method: e.target.value as ResearchMethod })}>{methods.map((m) => <option key={m} value={m}>{RESEARCH_METHOD_LABELS[m]}</option>)}</select></label><label><span>Responsável</span><input value={projectDraft.owner} onChange={(e) => setProjectDraft({ ...projectDraft, owner: e.target.value })}/></label></div>}
      {dialog === 'source' && <div className="bo-h726-form"><label className="full"><span>Título do material</span><input autoFocus value={sourceDraft.title} onChange={(e) => setSourceDraft({ ...sourceDraft, title: e.target.value })} placeholder="Ex.: Entrevista 04 · cliente recorrente"/></label><label><span>Método</span><select value={sourceDraft.type} onChange={(e) => setSourceDraft({ ...sourceDraft, type: e.target.value as ResearchMethod })}>{methods.map((m) => <option key={m} value={m}>{RESEARCH_METHOD_LABELS[m]}</option>)}</select></label><label><span>Data</span><input type="date" value={sourceDraft.date} onChange={(e) => setSourceDraft({ ...sourceDraft, date: e.target.value })}/></label><label><span>Participante / contexto</span><input value={sourceDraft.participant} onChange={(e) => setSourceDraft({ ...sourceDraft, participant: e.target.value })}/></label><label><span>Amostra</span><input value={sourceDraft.sample} onChange={(e) => setSourceDraft({ ...sourceDraft, sample: e.target.value })} placeholder="Ex.: 6 clientes"/></label><label className="full"><span>Resumo</span><textarea value={sourceDraft.summary} onChange={(e) => setSourceDraft({ ...sourceDraft, summary: e.target.value })} placeholder="O que este material contém?"/></label></div>}
      {dialog === 'observation' && <div className="bo-h726-form"><label className="full"><span>Registro observável</span><textarea autoFocus value={observationDraft.text} onChange={(e) => setObservationDraft({ ...observationDraft, text: e.target.value })} placeholder="Registre sem explicar o porquê. Ex.: Cliente perguntou três vezes se a coleta estava confirmada."/></label><label><span>Nível</span><select value={observationDraft.kind} onChange={(e) => setObservationDraft({ ...observationDraft, kind: e.target.value as ResearchObservationKind })}>{observationKinds.map((kind) => <option key={kind} value={kind}>{OBSERVATION_KIND_LABELS[kind]}</option>)}</select></label><label><span>Material de origem</span><select value={observationDraft.sourceId} onChange={(e) => setObservationDraft({ ...observationDraft, sourceId: e.target.value })}><option value="">Sem material ligado</option>{report.sources.map((source) => <option key={source.id} value={source.id}>{source.title}</option>)}</select></label><label><span>Participante</span><input value={observationDraft.participant} onChange={(e) => setObservationDraft({ ...observationDraft, participant: e.target.value })}/></label><label><span>Data</span><input type="date" value={observationDraft.observedAt} onChange={(e) => setObservationDraft({ ...observationDraft, observedAt: e.target.value })}/></label><label className="full"><span>Contexto</span><input value={observationDraft.context} onChange={(e) => setObservationDraft({ ...observationDraft, context: e.target.value })} placeholder="Onde, quando ou em que situação isso aconteceu?"/></label></div>}
      {dialog === 'insight' && <div className="bo-h726-form"><label className="full"><span>{experience.level === 'foundation' ? 'Aprendizado' : 'Insight'}</span><input autoFocus value={insightDraft.title} onChange={(e) => setInsightDraft({ ...insightDraft, title: e.target.value })} placeholder="Ex.: Confirmação reduz ansiedade antes da coleta"/></label><label className="full"><span>O que isso significa?</span><textarea value={insightDraft.description} onChange={(e) => setInsightDraft({ ...insightDraft, description: e.target.value })} placeholder="Interprete o padrão — não copie a observação."/></label><div className="full bo-h726-evidence-picker"><span>Evidências que sustentam este {experience.level === 'foundation' ? 'aprendizado' : 'Insight'}</span>{report.evidence.map((evidence) => <label key={evidence.id}><input type="checkbox" checked={insightDraft.evidenceIds.includes(evidence.id)} onChange={(e) => setInsightDraft({ ...insightDraft, evidenceIds: e.target.checked ? [...insightDraft.evidenceIds, evidence.id] : insightDraft.evidenceIds.filter((id) => id !== evidence.id) })}/><span><BlueOceanObjectIcon kind="evidence" size={14}/>{titleOf(evidence)}</span></label>)}</div></div>}
      <footer><button type="button" onClick={() => setDialog(null)}>Cancelar</button><button type="button" className="primary" onClick={dialog === 'project' ? saveProject : dialog === 'source' ? saveSource : dialog === 'observation' ? saveObservation : saveInsight}>Salvar</button></footer>
    </div></div>}
  </div>;
}

// H7.40-H4 legacy surface label: JOURNEY MAP 2.0
import { useMemo, useRef, useState } from 'react';
import type { Emotion, JourneyMomentType, TaskStatus } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { buildJourneyMapReport, prepareBlueprintFromJourney, prepareJourneyBlueprintDraft } from '../services/journey-map-studio';
import { runtimeApi } from '../runtime/client';
import {
  Map as MapIcon, Undo2, Redo2, Copy, ClipboardPaste, Layers3, Trash2, Focus, Keyboard, ListFilter,
  ZoomIn, ZoomOut, Plus, GripVertical, PanelRightOpen, ArrowLeft, ArrowRight, X, LayoutTemplate,
  Sparkles, BookOpen, Target, CheckCircle2, Image as ImageIcon, Upload, RotateCcw, Star, Activity, CircleAlert, MoreHorizontal, Maximize2,
} from '../design-system/icons';
import { hasCustomJourneyCover, journeyCoverSrc, prepareJourneyCoverFile } from '../services/journey-cover';
import { buildChannelContinuityReport } from '../services/channel-continuity';
import { createContextEntity } from '../services/context-library';
import { JourneyCanvasFree } from './JourneyCanvasFree';

const JOURNEY_ROWS = [
  { id: 'customerAction', label: 'Ações do cliente' },
  { id: 'thoughts', label: 'Pensamentos' },
  { id: 'emotion', label: 'Emoções' },
  { id: 'needs', label: 'Necessidades' },
  { id: 'touchpoints', label: 'Touchpoints' },
  { id: 'moments', label: 'Momentos da verdade' },
  { id: 'validatedProblems', label: 'Problemas validados' },
  { id: 'evidence', label: 'Evidências' },
  { id: 'problems', label: 'Fricções da etapa' },
  { id: 'opportunities', label: 'Oportunidades' },
] as const;

const momentCopy: Record<JourneyMomentType, { label: string; className: string }> = {
  none: { label: 'Não classificado', className: 'is-none' },
  positive: { label: 'Momento positivo', className: 'is-positive' },
  negative: { label: 'Momento negativo', className: 'is-negative' },
  critical: { label: 'Momento crítico', className: 'is-critical' },
};

const entityTitle = (entity: { title?: unknown; name?: unknown; description?: unknown } | undefined, fallback: string) =>
  String(entity?.title ?? entity?.name ?? entity?.description ?? fallback);
const entityDescription = (entity: { description?: unknown } | undefined) => String(entity?.description ?? '');

export function JourneyView({ studio, onBack }: { studio: StudioController; onBack?: () => void }) {
  const {
    selectedCount, orderedStages, canUndo, canRedo, undo, redo, copySelected, clipboard, insertBundles,
    duplicateSelected, removeSelected, focusedStageId, selectedStageId, focusSelected, setShowShortcuts,
    detailMode, setDetailMode, showRowControls, setShowRowControls, rowVisible, toggleRow,
    stageWidth, setStageWidth, zoom, setZoom, scrollRef, setIsCreateStageOpen, visibleStages, graph,
    selectedStageIds, journey, handleStageDrop, handleStageDragStart, selectStage, setSelectedStageId,
    updateStageCore, moveStage, removeStage, selectedStage, setNewTouchpointName, newTouchpointName,
    addTouchpointToStage, removeTouchpointFromStage, assignTouchpointChannelId, newProblemText, setNewProblemText,
    addProblemToStage, updateProblem, removeProblemFromStage, newOpportunityText, setNewOpportunityText,
    addOpportunityToStage, updateOpportunity, removeOpportunityFromStage, updateTaskStatus, setSelectedStageIds,
    updateStageExperience, setStageContextLink, setGraph, showToast, setActiveTab, stageDraft, setStageDraft, createStage,
  } = studio;

  const [showCanvasMatrix, setShowCanvasMatrix] = useState(false);
  const [showCoverEditor, setShowCoverEditor] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<'overview' | 'journey' | 'evidence' | 'insights'>('journey');
  const [coverError, setCoverError] = useState('');
  const [coverBusy, setCoverBusy] = useState(false);
  const [quickContextKind, setQuickContextKind] = useState<'persona' | 'need' | 'pain' | 'evidence'>('persona');
  const [quickContextTitle, setQuickContextTitle] = useState('');
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const designContext = journey.designContext;
  const definition = graph.service.project?.definition;
  const report = buildJourneyMapReport(graph, journey.id);
  const channelReport = useMemo(() => buildChannelContinuityReport(graph), [graph]);
  const journeyChannels = channelReport.channels;
  const stageReportById = new Map(report?.stages.map((item) => [item.stage.id, item]) ?? []);
  const contextItems = designContext ? [
    ...designContext.personaIds.map((id) => ({ id, kind: 'Persona', title: entityTitle(graph.entities?.persona?.[id], 'Persona') })),
    ...designContext.needIds.map((id) => ({ id, kind: 'Necessidade', title: entityTitle(graph.entities?.need?.[id], 'Necessidade') })),
    ...designContext.painIds.map((id) => ({ id, kind: 'Dor', title: entityTitle(graph.entities?.pain?.[id], 'Dor') })),
    ...designContext.problemIds.map((id) => ({ id, kind: 'Problema', title: entityTitle(graph.entities?.problem?.[id], 'Problema') })),
    ...designContext.evidenceIds.map((id) => ({ id, kind: 'Evidência', title: entityTitle(graph.entities?.evidence?.[id], 'Evidência') })),
  ] : [];
  const journeyStatusLabel = journey.status === 'active' ? 'Ativa' : journey.status === 'archived' ? 'Arquivada' : 'Em construção';
  const journeyUpdatedLabel = journey.updatedAt ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(journey.updatedAt)) : 'agora';
  const stageEvidenceTotal = report?.stages.reduce((sum, item) => sum + item.evidenceIds.length, 0) ?? 0;
  const stageProblemTotal = report?.stages.reduce((sum, item) => sum + item.validatedProblemIds.length + item.frictionCount, 0) ?? 0;
  const stageTouchpointTotal = orderedStages.reduce((sum, item) => sum + item.touchpointIds.length, 0);
  const momentStages = report?.stages.filter((item) => item.momentOfTruth !== 'none') ?? [];
  const gapStages = report?.stages.map((item) => ({ ...item, gaps: item.checks.filter((check) => !check.complete) })).filter((item) => item.gaps.length) ?? [];
  const curveHeight = 70;
  const emotionY = (emotion: Emotion) => emotion === 'positive' ? 15 : emotion === 'neutral' ? 35 : 55;
  const curveWidth = 208 + Math.max(1, visibleStages.length) * (stageWidth + 16) + 24;
  const curvePoints = visibleStages.map((stage, index) => `${208 + 16 + (index * (stageWidth + 16)) + stageWidth / 2},${emotionY(stage.emotion)}`).join(' ');
  const essentialRows = new Set(['customerAction', 'thoughts', 'emotion', 'touchpoints', 'validatedProblems']);
  const mapRowVisible = (row: (typeof JOURNEY_ROWS)[number]['id']) => rowVisible(row) && (detailMode || essentialRows.has(row));
  const visibleMapRowCount = JOURNEY_ROWS.filter((row) => mapRowVisible(row.id)).length;
  const fitJourneyToViewport = () => {
    const viewport = scrollRef.current?.clientWidth ?? 0;
    const content = 208 + Math.max(1, visibleStages.length) * (stageWidth + 16) + 170;
    const nextZoom = viewport && content ? Math.max(70, Math.min(100, Math.floor((viewport / content) * 100))) : 100;
    setZoom(nextZoom);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' }));
  };
  const revealStageOnMap = (stageId: string) => {
    setSelectedStageId(stageId);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-journey-stage-id="${stageId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }));
  };

  const setJourneyCover = (coverImage?: string) => {
    const now = new Date().toISOString();
    setGraph((current) => ({
      ...current,
      journeys: { ...current.journeys, [journey.id]: { ...current.journeys[journey.id], coverImage, coverUpdatedAt: now, updatedAt: now } },
      service: { ...current.service, updatedAt: now },
    }), coverImage ? 'Journey: alterar capa' : 'Journey: restaurar capa padrão');
  };
  const uploadJourneyCover = async (file?: File) => {
    if (!file) return;
    setCoverError('');
    setCoverBusy(true);
    try {
      const dataUrl = await prepareJourneyCoverFile(file);
      setJourneyCover(dataUrl);
      showToast('Capa da Journey atualizada.');
      setShowCoverEditor(false);
    } catch (error) {
      setCoverError(error instanceof Error ? error.message : 'Não foi possível atualizar a capa.');
    } finally {
      setCoverBusy(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const toggleJourneyFavorite = () => {
    const now = new Date().toISOString();
    setGraph((current) => ({
      ...current,
      journeys: { ...current.journeys, [journey.id]: { ...current.journeys[journey.id], favorite: !current.journeys[journey.id].favorite, updatedAt: now } },
      service: { ...current.service, updatedAt: now },
    }), journey.favorite ? 'Journey: remover favorito' : 'Journey: favoritar');
  };

  const prepareBlueprint = () => {
    const prepared = prepareBlueprintFromJourney(graph, journey.id, { name: `${journey.name} · Service Blueprint` });
    if (!prepared.boardId) {
      showToast(prepared.blockers[0] || 'Complete a estrutura mínima da Journey antes de preparar o Blueprint.');
      return;
    }
    setGraph(() => prepared.graph, 'H7.9: Journey → Blueprint');
    showToast('Blueprint preparado a partir da Journey, sem inventar Frontstage ou Backstage.');
    setActiveTab('canvas');
  };

  const captureContextDuringJourney = (kindInput = quickContextKind, titleInput = quickContextTitle) => {
    const title = titleInput.trim();
    if (!title) { showToast('Descreva o que você identificou antes de adicionar.'); return; }
    const kind = kindInput;
    setGraph((current) => {
      const before = new Set(Object.keys(current.entities?.[kind] ?? {}));
      const created = createContextEntity(current, kind, title);
      const entityId = Object.keys(created.entities?.[kind] ?? {}).find((id) => !before.has(id));
      if (!entityId) return current;
      const now = new Date().toISOString();
      const currentJourney = created.journeys[journey.id];
      if (!currentJourney) return created;
      const context = currentJourney.designContext ? { ...currentJourney.designContext } : {
        version: 1 as const,
        source: 'service-definition' as const,
        createdAt: now,
        personaIds: [], needIds: [], jobIds: [], painIds: [], problemIds: [], evidenceIds: [],
      };
      if (kind === 'persona') context.personaIds = [...new Set([...context.personaIds, entityId])];
      if (kind === 'need') context.needIds = [...new Set([...context.needIds, entityId])];
      if (kind === 'pain') context.painIds = [...new Set([...context.painIds, entityId])];
      if (kind === 'evidence') context.evidenceIds = [...new Set([...context.evidenceIds, entityId])];
      const journeys = { ...created.journeys, [journey.id]: { ...currentJourney, designContext: context, updatedAt: now } };
      const stages = selectedStage && created.stages[selectedStage.id] && (kind === 'need' || kind === 'pain' || kind === 'evidence')
        ? { ...created.stages, [selectedStage.id]: { ...created.stages[selectedStage.id], ...(kind === 'need' ? { needIds: [...new Set([...(created.stages[selectedStage.id].needIds ?? []), entityId])] } : kind === 'pain' ? { painIds: [...new Set([...(created.stages[selectedStage.id].painIds ?? []), entityId])] } : { evidenceIds: [...new Set([...(created.stages[selectedStage.id].evidenceIds ?? []), entityId])] }), updatedAt: now } }
        : created.stages;
      return { ...created, journeys, stages, service: { ...created.service, updatedAt: now } };
    }, `Journey: registrar ${kind} durante o desenho`);
    setQuickContextTitle('');
    showToast(kind === 'persona' ? 'Pessoa registrada na Journey.' : kind === 'need' ? 'Necessidade registrada e ligada à etapa atual.' : kind === 'evidence' ? 'Evidência registrada e ligada à etapa atual.' : 'Dor registrada na Journey.');
  };

  if (!showCanvasMatrix) {
    return <JourneyCanvasFree
      studio={studio}
      onBack={onBack}
      onMatrix={() => setShowCanvasMatrix(true)}
      onCaptureContext={(kind, title) => captureContextDuringJourney(kind, title)}
      onBlueprintDraft={async () => {
        // Open the exact uploaded Blueprint build, not the Journey editor. With no
        // stages it starts the original Blueprint wizard linked to this Journey.
        const prepared = prepareJourneyBlueprintDraft(graph, journey.id, { allowEmpty: true });
        if (!prepared.boardId) { showToast('Não foi possível abrir o Blueprint desta Jornada.'); return; }
        if (prepared.created) {
          setGraph(current => prepareJourneyBlueprintDraft(current, journey.id, {
            id: prepared.boardId!, allowEmpty: true,
          }).graph, 'Jornada: criar Blueprint vinculado');
        }
        setActiveTab('canvas');
        window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'blueprint' }));
        // The application must persist the linked board before the runtime can
        // open it. This avoids displaying the old Journey after a failed handoff.
        await new Promise(resolve => window.setTimeout(resolve, prepared.created ? 150 : 30));
        const runtime = runtimeApi<{ open(id: string): Promise<boolean> }>('serviceBlueprintFrame');
        const opened = await runtime?.open(prepared.boardId);
        if (!opened) showToast('O Blueprint não abriu. Acesse Blueprints no menu do projeto.');
      }}
    />;
  }

  return (
    <div className="bo-h79-journey flex-1 min-h-0 flex flex-col -mx-4 md:-mx-6" data-journey-maps-2="1">
      <div className="bo-h79-journey-top shrink-0 border-b border-slate-200 bg-white px-4 md:px-6 py-3 space-y-3">
        <section className="bo-h721-journey-hero bo-h723-journey-bar" data-journey-workspace="3.0" data-journey-editor-ux="4.0" data-journey-cover-system="7.18-H1">
          <div className="bo-h721-hero-cover bo-h723-mini-cover"><img src={journeyCoverSrc(journey)} alt={`Capa da Journey ${journey.name}`} /><span>JOURNEY</span></div>
          <div className="bo-h721-hero-copy bo-h723-bar-copy">
            <div className="bo-h721-hero-eyebrow"><span className={`is-${journey.status ?? 'draft'}`}>{journeyStatusLabel}</span><span>{report?.stageCount ?? 0} etapas</span><span>Atualizada {journeyUpdatedLabel}</span></div>
            <h1>{journey.name}</h1>
            <div className="bo-h723-bar-meta" aria-label="Resumo da Journey"><span><b>Responsável</b>{journey.owner?.trim() || 'Não definido'}</span><span><b>Evidências</b>{stageEvidenceTotal}</span><span><b>Problemas</b>{stageProblemTotal}</span><span><b>Touchpoints</b>{stageTouchpointTotal}</span></div>
          </div>
          <div className="bo-h721-hero-actions bo-h723-bar-actions">
            {onBack && <button type="button" onClick={onBack}>Todas as Jornadas</button>}
            <button type="button" onClick={() => { setCoverError(''); setShowCoverEditor(true); }} title="Alterar capa"><ImageIcon size={15}/><span>Alterar capa</span></button>
            <button type="button" className={journey.favorite ? 'is-favorite' : ''} onClick={toggleJourneyFavorite} title={journey.favorite ? 'Remover dos favoritos' : 'Favoritar'}><Star size={15} fill={journey.favorite ? 'currentColor' : 'none'}/><span>{journey.favorite ? 'Favorita' : 'Favoritar'}</span></button>
          </div>
        </section>

        <nav className="bo-h721-workspace-tabs bo-h723-subtabs" aria-label="Seções da Journey">
          {([['journey', 'Mapa'], ['evidence', 'Evidências'], ['insights', 'Insights']] as const).map(([id, label]) => <button key={id} type="button" className={workspaceView === id ? 'active' : ''} onClick={() => setWorkspaceView(id)}>{label}{id === 'evidence' && stageEvidenceTotal > 0 ? <span>{stageEvidenceTotal}</span> : null}{id === 'insights' && gapStages.length > 0 ? <span>{gapStages.length}</span> : null}</button>)}
          <span className="sr-only">Visão geral</span>
        </nav>

        {workspaceView === 'overview' && designContext && <section className="bo-h78-journey-context" data-journey-design-context="1"><div><small>PESSOAS, NECESSIDADES, DORES, PROBLEMAS E EVIDÊNCIAS</small><strong>{definition?.outcome || 'Outcome ainda não definido'}</strong><span>{definition?.startBoundary && definition?.endBoundary ? `${definition.startBoundary} → ${definition.endBoundary}` : 'Defina os limites do serviço no Dashboard.'}</span></div><div className="bo-h78-journey-context-items">{contextItems.slice(0, 6).map((item) => <span key={`${item.kind}-${item.id}`}><b>{item.kind}</b>{item.title}</span>)}{contextItems.length > 6 && <span><b>+{contextItems.length - 6}</b>outros vínculos</span>}</div><p>Esses registros continuam canônicos. Você pode trazê-los prontos ou capturá-los enquanto constrói a Journey.</p></section>}

        {workspaceView === 'overview' && <section className="bo-h79-journey-health" data-journey-health="1">
          <div className="bo-h79-health-main"><span>JOURNEY HEALTH<span className="sr-only"> · QUALIDADE DA JORNADA</span></span><strong>{report?.overallScore ?? 0}%</strong><i><b style={{ width: `${report?.overallScore ?? 0}%` }} /></i></div>
          <div><small>Etapas</small><strong>{report?.stageCount ?? 0}</strong><span>sequência do cliente</span></div>
          <div><small>Momentos da verdade</small><strong>{report?.momentCount ?? 0}</strong><span>pontos decisivos</span></div>
          <div><small>Evidência</small><strong>{report?.evidenceCoverage ?? 0}%</strong><span>cobertura por etapa</span></div>
          <div><small>Problemas</small><strong>{report?.problemCoverage ?? 0}%</strong><span>cobertura por etapa</span></div>
          <button type="button" onClick={prepareBlueprint} disabled={!report?.readyForBlueprint} title={report?.readyForBlueprint ? 'Preparar Blueprint a partir desta Journey' : report?.blueprintBlockers.join(' ')}><LayoutTemplate size={16}/><span><b>Próximo</b>Preparar Blueprint</span><ArrowRight size={15}/></button>
        </section>}

        <div hidden={workspaceView !== 'journey'} className="bo-h723-toolbar" data-journey-toolbar="compact">
          <div className="bo-h723-toolbar-primary">
            <button type="button" onClick={() => setShowCanvasMatrix(false)} className="bo-h723-add-stage"><MapIcon size={15}/>Voltar ao mapa livre</button>
            <button type="button" onClick={() => setIsCreateStageOpen(true)} className="bo-h723-add-stage"><Plus size={15}/>Etapa</button>
            <div className="bo-h723-mode-switch" aria-label="Modo do editor">
              <button type="button" onClick={() => setDetailMode(false)} aria-pressed={!detailMode} className={!detailMode ? 'active' : ''}>Essencial</button>
              <button type="button" onClick={() => setDetailMode(true)} aria-pressed={detailMode} className={detailMode ? 'active' : ''}>Detalhado</button>
            </div>
            <span className="bo-h723-selection-summary">{selectedCount ? `${selectedCount} ${selectedCount === 1 ? 'selecionada' : 'selecionadas'}` : `${orderedStages.length} etapas`}</span>
          </div>
          <div className="bo-h723-toolbar-actions">
            <button type="button" onClick={undo} disabled={!canUndo} className="tool-button" title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Undo2 size={15}/></button>
            <button type="button" onClick={redo} disabled={!canRedo} className="tool-button" title="Refazer (Ctrl+Y)" aria-label="Refazer"><Redo2 size={15}/></button>
            <span className="bo-h723-toolbar-divider"/>
            <button type="button" onClick={() => setZoom((value) => Math.max(70, value - 10))} disabled={zoom === 70} className="tool-button" aria-label="Diminuir zoom"><ZoomOut size={15}/></button>
            <button type="button" onClick={() => setZoom(100)} className="tool-button bo-h723-zoom-value" title="Restaurar zoom">{zoom}%</button>
            <button type="button" onClick={() => setZoom((value) => Math.min(130, value + 10))} disabled={zoom === 130} className="tool-button" aria-label="Aumentar zoom"><ZoomIn size={15}/></button>
            <button type="button" onClick={fitJourneyToViewport} className="tool-button" title="Ajustar mapa à largura"><Maximize2 size={15}/><span className="bo-h723-toolbar-label">Ajustar</span></button>
            <div className="bo-h723-more-wrap">
              <button type="button" onClick={() => setShowMoreTools((value) => !value)} aria-expanded={showMoreTools} className="tool-button" title="Mais ferramentas"><MoreHorizontal size={17}/></button>
              {showMoreTools && <div className="bo-h723-more-menu">
                <button type="button" onClick={() => { setShowRowControls((value) => !value); setShowMoreTools(false); }}><ListFilter size={15}/>Linhas visíveis <span>{visibleMapRowCount}/{JOURNEY_ROWS.length}</span></button>
                <label><span>Largura das etapas <b>{stageWidth}px</b></span><input type="range" min="280" max="400" step="16" value={stageWidth} onChange={(event) => setStageWidth(Number(event.target.value))}/></label>
                <button type="button" onClick={() => { focusSelected(); setShowMoreTools(false); }} disabled={!selectedStageId && !focusedStageId}><Focus size={15}/>{focusedStageId ? 'Mostrar todas as etapas' : 'Focar etapa'}</button>
                <button type="button" onClick={() => { copySelected(); setShowMoreTools(false); }} disabled={!selectedCount}><Copy size={15}/>Copiar seleção</button>
                <button type="button" onClick={() => { insertBundles(clipboard); setShowMoreTools(false); }} disabled={!clipboard.length}><ClipboardPaste size={15}/>Colar etapas</button>
                <button type="button" onClick={() => { duplicateSelected(); setShowMoreTools(false); }} disabled={!selectedCount}><Layers3 size={15}/>Duplicar seleção</button>
                <button type="button" className="danger" onClick={() => { removeSelected(); setShowMoreTools(false); }} disabled={!selectedCount}><Trash2 size={15}/>Excluir seleção</button>
                <button type="button" onClick={() => { setShowShortcuts(true); setShowMoreTools(false); }}><Keyboard size={15}/>Atalhos</button>
              </div>}
            </div>
          </div>
        </div>
        {workspaceView === 'journey' && showRowControls && <div className="bo-h79-row-picker" aria-label="Linhas visíveis">
          {JOURNEY_ROWS.map((row) => <label key={row.id}><input type="checkbox" checked={rowVisible(row.id)} onChange={() => toggleRow(row.id)} />{row.label}</label>)}
        </div>}
      </div>

      <div className="flex-1 min-h-0 flex">
        {workspaceView === 'overview' && <main className="bo-h721-workspace-panel bo-h721-overview-panel">
          <section className="bo-h721-overview-lead">
            <div><small>PROPÓSITO DA JORNADA</small><h2>{journey.objective?.trim() || definition?.outcome || 'Defina por que esta jornada existe e qual experiência ela precisa explicar.'}</h2><p>{definition?.startBoundary && definition?.endBoundary ? `${definition.startBoundary} → ${definition.endBoundary}` : 'Os limites do serviço ainda não foram definidos.'}</p></div>
            <button type="button" onClick={() => setWorkspaceView('journey')}><MapIcon size={17}/>Abrir mapa da jornada<ArrowRight size={15}/></button>
          </section>
          <section className="bo-h721-overview-cards">
            <article><Activity size={18}/><span>Journey Health</span><strong>{report?.overallScore ?? 0}%</strong><small>{gapStages.length ? `${gapStages.length} etapas ainda têm lacunas` : 'Estrutura consistente'}</small></article>
            <article><BookOpen size={18}/><span>Evidências</span><strong>{stageEvidenceTotal}</strong><small>{report?.evidenceCoverage ?? 0}% das etapas cobertas</small></article>
            <article><Target size={18}/><span>Momentos da verdade</span><strong>{momentStages.length}</strong><small>pontos decisivos classificados</small></article>
            <article><CircleAlert size={18}/><span>Problemas</span><strong>{stageProblemTotal}</strong><small>{report?.problemCoverage ?? 0}% das etapas com sinais</small></article>
          </section>
          <section className="bo-h721-overview-sequence"><header><div><small>SEQUÊNCIA DA EXPERIÊNCIA</small><h3>{orderedStages.length ? 'Da primeira interação ao desfecho' : 'A jornada ainda não possui etapas'}</h3></div><button type="button" onClick={() => setWorkspaceView('journey')}>Editar etapas</button></header><div>{orderedStages.map((stage, index) => <button key={stage.id} type="button" onClick={() => { setSelectedStageId(stage.id); setWorkspaceView('journey'); }}><span>{index + 1}</span><strong>{stage.title || `Etapa ${index + 1}`}</strong><small>{stage.customerAction || 'Ação do cliente ainda não definida'}</small><i className={`is-${stage.emotion}`}>{stage.emotion === 'positive' ? '😊' : stage.emotion === 'negative' ? '😞' : '😐'}</i></button>)}</div></section>
        </main>}

        {workspaceView === 'evidence' && <main className="bo-h721-workspace-panel bo-h721-evidence-panel">
          <header className="bo-h721-panel-heading"><div><small>EVIDÊNCIAS DA JORNADA</small><h2>O que sustenta cada etapa</h2><p>Veja onde existe evidência, onde há problema validado e onde a jornada ainda depende de hipótese.</p></div><span><b>{stageEvidenceTotal}</b> vínculos de evidência</span></header>
          <div className="bo-h721-evidence-grid">{report?.stages.map((item) => <article key={item.stage.id} className={item.evidenceIds.length ? 'has-evidence' : 'missing-evidence'}><header><span>ETAPA {item.position}</span><strong>{item.stage.title}</strong><button type="button" onClick={() => { setSelectedStageId(item.stage.id); setWorkspaceView('journey'); }}>Abrir etapa</button></header><div className="bo-h721-evidence-metrics"><span><b>{item.evidenceIds.length}</b>Evidências</span><span><b>{item.validatedProblemIds.length}</b>Problemas validados</span><span><b>{item.touchpointCount}</b>Touchpoints</span></div><div className="bo-h721-evidence-list">{item.evidenceIds.length ? item.evidenceIds.map((id) => { const evidence = graph.entities?.evidence?.[id]; return <span key={id}><b>{String(evidence?.confidence ?? 'medium')}</b>{entityTitle(evidence, 'Evidência')}</span>; }) : <em>Sem evidência vinculada nesta etapa.</em>}</div></article>)}</div>
        </main>}

        {workspaceView === 'insights' && <main className="bo-h721-workspace-panel bo-h721-insights-panel">
          <header className="bo-h721-panel-heading"><div><small>INSIGHTS DA JORNADA</small><h2>Onde a experiência pede atenção</h2><p>Diagnóstico determinístico baseado no que já está mapeado. Nenhum conteúdo é inventado.</p></div><span><b>{report?.overallScore ?? 0}%</b> Journey Health</span></header>
          <div className="bo-h721-insight-layout">
            <section><h3>Lacunas por etapa</h3>{gapStages.length ? gapStages.map((item) => <button key={item.stage.id} type="button" onClick={() => { setSelectedStageId(item.stage.id); setWorkspaceView('journey'); }}><span><b>Etapa {item.position}</b>{item.stage.title}</span><em>{item.gaps.map((gap) => gap.label).join(' · ')}</em><strong>{item.qualityScore}%</strong></button>) : <div className="bo-h721-clear-state"><CheckCircle2 size={22}/><b>Nenhuma lacuna estrutural</b><span>As etapas cumprem os critérios atuais de Journey Health.</span></div>}</section>
            <aside><h3>Momentos da verdade</h3>{momentStages.length ? momentStages.map((item) => <button key={item.stage.id} type="button" className={momentCopy[item.momentOfTruth].className} onClick={() => { setSelectedStageId(item.stage.id); setWorkspaceView('journey'); }}><Target size={15}/><span><b>{item.stage.title}</b>{momentCopy[item.momentOfTruth].label}</span></button>) : <p>Nenhum momento da verdade foi classificado.</p>}<div className="bo-h721-next-move"><small>PRÓXIMO MOVIMENTO</small><b>{report?.readyForBlueprint ? 'A Journey está pronta para preparar um Blueprint.' : report?.blueprintBlockers[0] || 'Continue estruturando a Journey.'}</b><button type="button" onClick={prepareBlueprint} disabled={!report?.readyForBlueprint}><LayoutTemplate size={15}/>Preparar Blueprint</button></div></aside>
          </div>
        </main>}

        <div ref={scrollRef} hidden={workspaceView !== 'journey'} className="flex-1 min-w-0 overflow-x-auto overflow-y-auto pb-8 pt-4 px-4 md:px-6">
          {orderedStages.length > 0 && <div className="bo-h721-emotion-curve bo-h723-emotion-curve" style={{ width: curveWidth, zoom: zoom / 100 }} data-emotion-curve="1"><div className="bo-h721-emotion-label"><small>EMOÇÃO</small><strong>Curva emocional</strong></div><svg viewBox={`0 0 ${curveWidth} ${curveHeight}`} preserveAspectRatio="none" aria-hidden="true"><line x1="224" y1="35" x2={curveWidth - 24} y2="35" className="baseline"/><polyline points={curvePoints} className="path"/></svg>{visibleStages.map((stage, index) => <button key={stage.id} type="button" onClick={() => revealStageOnMap(stage.id)} className={`bo-h721-emotion-node is-${stage.emotion}`} style={{ left: 224 + (index * (stageWidth + 16)) + stageWidth / 2, top: emotionY(stage.emotion) }} title={`${stage.title}: ${stage.emotion}`}><span>{stage.emotion === 'positive' ? '😊' : stage.emotion === 'negative' ? '😞' : '😐'}</span></button>)}</div>}
          {orderedStages.length === 0 ? (
            <div className="bo-h79-empty max-w-xl mx-auto mt-12 text-center rounded-2xl border border-dashed border-slate-300 bg-white p-10">
              <MapIcon size={34} className="mx-auto text-blue-600 mb-4" />
              <small>JOURNEY MAP</small>
              <h3 className="text-lg font-bold text-slate-800">Comece pela sequência real do cliente</h3>
              <p className="text-sm text-slate-500 mt-2">Crie os momentos que você conhece. Você pode adicionar pessoas, necessidades, dores e evidências enquanto desenha, sem sair do mapa.</p>
              <div className="bo-h1704-inline-stage" data-first-stage-inline="1"><label htmlFor="bo-h1704-first-stage">Qual é o primeiro momento da experiência?</label><div><input id="bo-h1704-first-stage" value={stageDraft.title} onChange={(event) => setStageDraft((current) => ({ ...current, title: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter' && stageDraft.title.trim()) createStage(); }} placeholder="Ex.: Solicitar a coleta"/><button type="button" onClick={createStage} disabled={!stageDraft.title.trim()}><Plus size={15}/> Adicionar etapa</button></div><p>Depois de adicionar, selecione a etapa para registrar ações, pensamentos, necessidades, dores e evidências.</p></div>
            </div>
          ) : <div className="bo-h79-map-grid flex min-w-max gap-4 px-1" style={{ zoom: zoom / 100 }}>
            <div className="bo-h79-row-labels sticky left-0 z-10 w-52 flex-shrink-0 bg-slate-50 flex flex-col gap-3 pt-16 border-r border-slate-200 pr-4">
              {mapRowVisible('customerAction') && <div data-row="customerAction">Ações do cliente<small>O que faz</small></div>}
              {mapRowVisible('thoughts') && <div data-row="thoughts">Pensamentos<small>O que pensa / espera</small></div>}
              {mapRowVisible('emotion') && <div data-row="emotion">Emoções<small>Como se sente</small></div>}
              {mapRowVisible('needs') && <div data-row="needs">Necessidades<small>O que a pessoa precisa nesta etapa</small></div>}
              {mapRowVisible('touchpoints') && <div data-row="touchpoints">Touchpoints<small>Onde interage</small></div>}
              {mapRowVisible('moments') && <div data-row="moments">Momentos da verdade<small>Onde a percepção muda</small></div>}
              {mapRowVisible('validatedProblems') && <div data-row="validatedProblems">Problemas validados<small>Discovery → Journey</small></div>}
              {mapRowVisible('evidence') && <div data-row="evidence">Evidências<small>Por que sabemos</small></div>}
              {mapRowVisible('problems') && <div data-row="problems">Fricções da etapa<small>Observações locais</small></div>}
              {mapRowVisible('opportunities') && <div data-row="opportunities">Oportunidades<small>Entrada para melhoria</small></div>}
            </div>

            {visibleStages.map((stage) => {
              const stageTouchpoints = stage.touchpointIds.map((id) => graph.touchpoints[id]).filter(Boolean);
              const stageProblems = stage.problemIds.map((id) => graph.problems[id]).filter(Boolean);
              const stageOpportunities = stage.opportunityIds.map((id) => graph.opportunities[id]).filter(Boolean);
              const stageNeeds = (stage.needIds ?? []).map((id) => graph.entities?.need?.[id]).filter(Boolean);
              const stageValidatedProblems = (stage.validatedProblemIds ?? []).map((id) => graph.entities?.problem?.[id]).filter(Boolean);
              const stageEvidence = (stage.evidenceIds ?? []).map((id) => graph.entities?.evidence?.[id]).filter(Boolean);
              const stageReport = stageReportById.get(stage.id);
              const isSelected = selectedStageIds.includes(stage.id);
              const index = journey.stageIds.indexOf(stage.id);
              const stageMoment = stage.momentOfTruth ?? 'none';

              return (
                <div key={stage.id} data-journey-stage-id={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleStageDrop(event, stage.id)} style={{ width: stageWidth }} className={`bo-h79-stage flex-shrink-0 flex flex-col gap-3 group rounded-xl transition-colors ${isSelected ? 'is-selected' : ''}`}>
                  <div className="bo-h79-stage-head bo-h723-stage-head">
                    <span className="bo-h723-stage-index">{String(index + 1).padStart(2, '0')}</span>
                    <div className="bo-h79-stage-title bo-h723-stage-title"><input type="text" value={stage.title} onChange={(event) => updateStageCore(stage.id, 'title', event.target.value)} onFocus={() => setSelectedStageId(stage.id)} /><small>{stageReport?.qualityScore ?? 0}% estruturada</small></div>
                    <div className="bo-h723-stage-hover-actions">
                      <button type="button" onClick={(event) => selectStage(stage.id, event)} aria-pressed={isSelected} className="bo-h723-stage-select" title="Selecionar etapa" aria-label={`Selecionar etapa ${stage.title}`}>{isSelected ? '✓' : ''}</button>
                      <button type="button" draggable onDragStart={(event) => handleStageDragStart(event, stage.id)} className="bo-h723-stage-drag" title="Arrastar etapa" aria-label={`Arrastar etapa ${stage.title}`}><GripVertical size={15}/></button>
                      <button type="button" onClick={() => setSelectedStageId(stage.id)} className="bo-h723-stage-open" title="Abrir detalhes" aria-label={`Abrir detalhes de ${stage.title}`}><PanelRightOpen size={15}/></button>
                    </div>
                  </div>
                  <div className="bo-h723-stage-signals">
                    {stageEvidence.length > 0 && <span className="is-evidence">● {stageEvidence.length} Evid.</span>}
                    {stageValidatedProblems.length > 0 && <span className="is-problem">◆ {stageValidatedProblems.length} Problema{stageValidatedProblems.length > 1 ? 's' : ''}</span>}
                    {stageMoment !== 'none' && <span className={`is-moment ${momentCopy[stageMoment].className}`}><Target size={11}/>{momentCopy[stageMoment].label}</span>}
                  </div>

                  {mapRowVisible('customerAction') && <textarea data-row="customerAction" value={stage.customerAction} onChange={(event) => updateStageCore(stage.id, 'customerAction', event.target.value)} placeholder="O que o cliente faz aqui?" />}
                  {mapRowVisible('thoughts') && <button data-row="thoughts" type="button" onClick={() => setSelectedStageId(stage.id)} className="bo-h79-text-cell">{stage.thoughts?.trim() ? <p>“{stage.thoughts}”</p> : <span>+ O que o cliente pensa ou espera?</span>}</button>}
                  {mapRowVisible('emotion') && <div data-row="emotion" className="bo-h79-emotion-cell">
                    {(['negative', 'neutral', 'positive'] as Emotion[]).map((emotion) => {
                      const emoji = emotion === 'negative' ? '😞' : emotion === 'neutral' ? '😐' : '😊';
                      const label = emotion === 'negative' ? 'Frustrado' : emotion === 'neutral' ? 'Neutro' : 'Satisfeito';
                      return <button key={emotion} type="button" onClick={() => updateStageCore(stage.id, 'emotion', emotion)} className={stage.emotion === emotion ? 'active' : ''} title={label} aria-pressed={stage.emotion === emotion}><span>{emoji}</span><small>{label}</small></button>;
                    })}
                  </div>}
                  {mapRowVisible('needs') && <button data-row="needs" type="button" onClick={() => setSelectedStageId(stage.id)} className="bo-h79-chip-cell">{stageNeeds.length ? stageNeeds.slice(0, 3).map((need) => <span key={need!.id}>{entityTitle(need, 'Necessidade')}</span>) : <em>+ Conectar necessidade</em>}{stageNeeds.length > 3 && <b>+{stageNeeds.length - 3}</b>}</button>}
                  {mapRowVisible('touchpoints') && <button data-row="touchpoints" type="button" onClick={() => setSelectedStageId(stage.id)} className="bo-h79-chip-cell">{stageTouchpoints.length ? stageTouchpoints.slice(0, 4).map((touchpoint) => <span key={touchpoint.id}>{touchpoint.name}</span>) : <em>+ Adicionar touchpoint</em>}{stageTouchpoints.length > 4 && <b>+{stageTouchpoints.length - 4}</b>}</button>}
                  {mapRowVisible('moments') && <button data-row="moments" type="button" onClick={() => setSelectedStageId(stage.id)} className={`bo-h79-moment-cell ${momentCopy[stageMoment].className}`}><Target size={17}/><strong>{momentCopy[stageMoment].label}</strong><span>{stage.momentNote?.trim() || 'Classifique apenas quando esta etapa realmente altera a percepção do cliente.'}</span></button>}
                  {mapRowVisible('validatedProblems') && <button data-row="validatedProblems" type="button" onClick={() => setSelectedStageId(stage.id)} className="bo-h79-context-cell is-problem">{stageValidatedProblems.length ? stageValidatedProblems.slice(0, 2).map((problem) => <span key={problem!.id}><b>VALIDADO</b>{entityTitle(problem, 'Problema')}</span>) : <em>+ Vincular problema validado</em>}{stageValidatedProblems.length > 2 && <strong>+{stageValidatedProblems.length - 2}</strong>}</button>}
                  {mapRowVisible('evidence') && <button data-row="evidence" type="button" onClick={() => setSelectedStageId(stage.id)} className="bo-h79-context-cell is-evidence">{stageEvidence.length ? stageEvidence.slice(0, 2).map((evidence) => <span key={evidence!.id}><b>{String(evidence!.confidence ?? 'evidência')}</b>{entityTitle(evidence, 'Evidência')}</span>) : <em>+ Vincular evidência</em>}{stageEvidence.length > 2 && <strong>+{stageEvidence.length - 2}</strong>}</button>}
                  {mapRowVisible('problems') && <button data-row="problems" type="button" onClick={() => setSelectedStageId(stage.id)} className="bo-h79-friction-cell">{stageProblems.length ? stageProblems.slice(0, 2).map((problem) => <p key={problem.id}>• {problem.description}</p>) : <span>+ Registrar fricção local</span>}{stageProblems.length > 2 && <b>+{stageProblems.length - 2}</b>}</button>}
                  {mapRowVisible('opportunities') && <button data-row="opportunities" type="button" onClick={() => setSelectedStageId(stage.id)} className="bo-h79-opportunity-cell">{stageOpportunities.length ? stageOpportunities.slice(0, 2).map((opportunity) => <p key={opportunity.id}>• {opportunity.title}</p>) : <span>+ Adicionar oportunidade</span>}{stageOpportunities.length > 2 && <b>+{stageOpportunities.length - 2}</b>}</button>}

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1"><button type="button" onClick={() => moveStage(stage.id, 'prev')} disabled={index === 0} className="bo-h79-move" title="Mover etapa para a esquerda"><ArrowLeft size={15} /></button><button type="button" onClick={() => moveStage(stage.id, 'next')} disabled={index === orderedStages.length - 1} className="bo-h79-move" title="Mover etapa para a direita"><ArrowRight size={15} /></button></div>
                    <button type="button" onClick={() => removeStage(stage.id)} className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50" title="Remover etapa" aria-label={`Remover etapa ${stage.title}`}><Trash2 size={15} /></button>
                  </div>
                </div>
              );
            })}

            <div className="bo-h1704-add-column flex-shrink-0 flex flex-col gap-2 pt-1" data-stage-add-inline="1"><label htmlFor="bo-h1704-next-stage"><Plus size={17}/> Nova etapa</label><input id="bo-h1704-next-stage" value={stageDraft.title} onChange={(event) => setStageDraft((current) => ({ ...current, title: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter' && stageDraft.title.trim()) createStage(); }} placeholder="Nome da próxima etapa"/><button type="button" className="bo-h79-add-stage" disabled={!stageDraft.title.trim()} onClick={createStage}>Adicionar ao mapa <ArrowRight size={14}/></button><button type="button" className="bo-h1704-details-link" onClick={() => setIsCreateStageOpen(true)}>Adicionar com detalhes</button></div>
          </div>}
          {orderedStages.length > 5 && <div className="bo-h723-minimap" data-journey-minimap="1"><small>MAPA</small><div>{orderedStages.map((stage, index) => <button key={stage.id} type="button" className={selectedStageId === stage.id ? 'active' : ''} onClick={() => revealStageOnMap(stage.id)} title={stage.title}><span>{index + 1}</span></button>)}</div></div>}
        </div>

        {workspaceView === 'journey' && selectedCount > 1 && <aside className="fixed inset-x-4 bottom-4 z-20 xl:static xl:w-[310px] xl:shrink-0 rounded-xl xl:rounded-none border border-blue-200 bg-white p-5 shadow-xl xl:shadow-none"><h3 className="font-bold text-slate-800">{selectedCount} etapas selecionadas</h3><p className="text-sm text-slate-500 mt-1">Copie, duplique ou remova o conjunto. Selecione uma etapa para editar seus detalhes.</p><div className="flex flex-wrap gap-2 mt-4"><button type="button" onClick={copySelected} className="tool-button"><Copy size={15} /> Copiar</button><button type="button" onClick={duplicateSelected} className="tool-button"><Layers3 size={15} /> Duplicar</button><button type="button" onClick={removeSelected} className="tool-button text-rose-700"><Trash2 size={15} /> Excluir</button></div><button type="button" onClick={() => setSelectedStageIds([])} className="mt-4 text-xs text-blue-700 font-semibold">Limpar seleção</button></aside>}

        {workspaceView === 'journey' && selectedStage && (() => {
          const selectedReport = stageReportById.get(selectedStage.id);
          const selectedNeeds = new Set(selectedStage.needIds ?? []);
          const selectedValidatedProblems = new Set(selectedStage.validatedProblemIds ?? []);
          const selectedEvidence = new Set(selectedStage.evidenceIds ?? []);
          return <><button type="button" onClick={() => setSelectedStageId(null)} className="fixed inset-0 z-30 bg-slate-950/20 xl:hidden" aria-label="Fechar inspector" /><aside className="bo-h79-inspector fixed inset-y-0 right-0 z-40 w-[min(94vw,430px)] xl:static xl:z-auto xl:w-[430px] shrink-0 border-l border-slate-200 bg-white flex flex-col overflow-hidden shadow-2xl xl:shadow-none">
            <div className="bo-h79-inspector-head bo-h723-inspector-head"><div><small>ETAPA {String(journey.stageIds.indexOf(selectedStage.id) + 1).padStart(2, '0')}</small><h3>{selectedStage.title}</h3><p>Qualidade da etapa <b>{selectedReport?.qualityScore ?? 0}%</b></p></div><button type="button" onClick={() => setSelectedStageId(null)} aria-label="Fechar inspector"><X size={18} /></button></div>
            <div className="bo-h723-inspector-summary"><span><b>{selectedEvidence.size}</b>Evidências</span><span><b>{selectedValidatedProblems.size}</b>Problemas</span><span><b>{selectedStage.touchpointIds.length}</b>Touchpoints</span><span><b>{selectedStage.opportunityIds.length}</b>Oportunidades</span></div>
            <div className="bo-h79-inspector-scroll">
              <section className="bo-h79-stage-quality"><div><strong>{selectedReport?.qualityScore ?? 0}%</strong><span>qualidade</span></div><ul>{selectedReport?.checks.map((check) => <li key={check.id} className={check.complete ? 'done' : ''}><CheckCircle2 size={13}/>{check.label}</li>)}</ul></section>

              <section><div className="bo-h79-section-title"><BookOpen size={16}/><div><strong>Experiência do cliente</strong><span>Ação, pensamento e emoção são coisas diferentes.</span></div></div><label>Nome da etapa<input value={selectedStage.title} onChange={(event) => updateStageCore(selectedStage.id, 'title', event.target.value)} /></label><label>Ação do cliente<textarea value={selectedStage.customerAction} onChange={(event) => updateStageCore(selectedStage.id, 'customerAction', event.target.value)} placeholder="O que o cliente tenta fazer?" /></label><label>Pensamento / expectativa<textarea value={selectedStage.thoughts ?? ''} onChange={(event) => updateStageExperience(selectedStage.id, { thoughts: event.target.value })} placeholder="O que passa pela cabeça do cliente neste momento?" /></label><div className="bo-h79-emotion-picker"><span>Emoção</span>{(['negative', 'neutral', 'positive'] as Emotion[]).map((emotion) => <button key={emotion} type="button" className={selectedStage.emotion === emotion ? 'active' : ''} onClick={() => updateStageCore(selectedStage.id, 'emotion', emotion)}>{emotion === 'negative' ? '😞 Frustrado' : emotion === 'neutral' ? '😐 Neutro' : '😊 Satisfeito'}</button>)}</div></section>

              <section><div className="bo-h79-section-title"><Target size={16}/><div><strong>Momento da verdade</strong><span>Classifique apenas quando a etapa realmente muda confiança, percepção ou decisão.</span></div></div><div className="bo-h79-moment-picker">{(['none', 'positive', 'negative', 'critical'] as JourneyMomentType[]).map((value) => <button key={value} type="button" className={`${momentCopy[value].className} ${(selectedStage.momentOfTruth ?? 'none') === value ? 'active' : ''}`} onClick={() => updateStageExperience(selectedStage.id, { momentOfTruth: value })}>{momentCopy[value].label}</button>)}</div><label>Por que este momento importa?<textarea value={selectedStage.momentNote ?? ''} onChange={(event) => updateStageExperience(selectedStage.id, { momentNote: event.target.value })} placeholder="Explique o que torna esta etapa decisiva." /></label></section>

              <section className="bo-h167-journey-capture bo-h168-journey-discovery"><div className="bo-h79-section-title"><Plus size={16}/><div><strong>Registrar descoberta</strong><span>Não interrompa o desenho para preencher outra tela. Registre o que apareceu agora e complemente depois.</span></div></div><div className="bo-h167-journey-capture__form"><select value={quickContextKind} onChange={(event) => setQuickContextKind(event.target.value as 'persona' | 'need' | 'pain' | 'evidence')} aria-label="Tipo de descoberta"><option value="persona">Pessoa / Persona</option><option value="need">Necessidade</option><option value="pain">Dor / fricção recorrente</option><option value="evidence">Evidência</option></select><input value={quickContextTitle} onChange={(event) => setQuickContextTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') captureContextDuringJourney(); }} placeholder={quickContextKind === 'persona' ? 'Ex.: Cliente recorrente com pouco tempo' : quickContextKind === 'need' ? 'Ex.: Saber quando a coleta vai chegar' : quickContextKind === 'evidence' ? 'Ex.: 4 clientes perguntaram pela janela de coleta' : 'Ex.: Insegurança sobre o horário'} /><button type="button" onClick={() => captureContextDuringJourney()}>Registrar</button></div><small>{(quickContextKind === 'need' || quickContextKind === 'evidence') && selectedStage ? `${quickContextKind === 'need' ? 'A necessidade' : 'A evidência'} será ligada automaticamente à etapa atual.` : 'O registro ficará disponível para reutilização em Pesquisa, Whiteboard e outras Journeys.'}</small></section>

              <section><div className="bo-h79-section-title"><Sparkles size={16}/><div><strong>Necessidades, problemas e evidências ligados à etapa</strong><span>Distribua aqui apenas o que realmente se aplica a este momento da experiência.</span></div></div>
                <div className="bo-h79-context-link-group"><header><strong>Necessidades</strong><span>{selectedNeeds.size}/{report?.context.needs.length ?? 0}</span></header>{report?.context.needs.length ? report.context.needs.map((need) => <label key={need.id} className="bo-h79-link-option"><input type="checkbox" checked={selectedNeeds.has(need.id)} onChange={(event) => setStageContextLink(selectedStage.id, 'need', need.id, event.target.checked)} /><span><b>{entityTitle(need, 'Necessidade')}</b><small>{entityDescription(need)}</small></span></label>) : <p>Nenhuma Necessidade veio da Service Definition.</p>}</div>
                <div className="bo-h79-context-link-group"><header><strong>Problemas validados</strong><span>{selectedValidatedProblems.size}/{report?.context.problems.length ?? 0}</span></header>{report?.context.problems.length ? report.context.problems.map((problem) => <label key={problem.id} className="bo-h79-link-option"><input type="checkbox" checked={selectedValidatedProblems.has(problem.id)} onChange={(event) => setStageContextLink(selectedStage.id, 'problem', problem.id, event.target.checked)} /><span><b>{entityTitle(problem, 'Problema')}</b><small>{entityDescription(problem)}</small></span></label>) : <p>Nenhum Problema validado disponível no contexto.</p>}</div>
                <div className="bo-h79-context-link-group"><header><strong>Evidências</strong><span>{selectedEvidence.size}/{report?.context.evidence.length ?? 0}</span></header>{report?.context.evidence.length ? report.context.evidence.map((evidence) => <label key={evidence.id} className="bo-h79-link-option"><input type="checkbox" checked={selectedEvidence.has(evidence.id)} onChange={(event) => setStageContextLink(selectedStage.id, 'evidence', evidence.id, event.target.checked)} /><span><b>{entityTitle(evidence, 'Evidência')}</b><small>{String(evidence.confidence ?? 'medium')} · {entityDescription(evidence)}</small></span></label>) : <p>Nenhuma Evidência disponível no contexto.</p>}</div>
              </section>

              <section><div className="bo-h79-section-title"><MapIcon size={16}/><div><strong>Touchpoints</strong><span>Touchpoint é a interação; Canal é por onde ela acontece.</span></div></div><div className="bo-h79-removable-chips">{selectedStage.touchpointIds.map((touchpointId) => { const touchpoint = graph.touchpoints[touchpointId]; return touchpoint ? <span key={touchpointId}>{touchpoint.name}<button type="button" onClick={() => removeTouchpointFromStage(selectedStage.id, touchpointId)} aria-label={`Remover ${touchpoint.name}`}><X size={12}/></button></span> : null; })}{selectedStage.touchpointIds.length === 0 && <em>Nenhum touchpoint.</em>}</div><div className="bo-h79-add-inline"><input value={newTouchpointName} onChange={(event) => setNewTouchpointName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTouchpointToStage(selectedStage.id, newTouchpointName); }} placeholder="Ex.: Confirmação da coleta" /><button type="button" onClick={() => addTouchpointToStage(selectedStage.id, newTouchpointName)}>Adicionar</button></div>{detailMode && selectedStage.touchpointIds.length > 0 && <div className="bo-h79-channel-list bo-h729-journey-channels">{selectedStage.touchpointIds.map((id) => { const point = channelReport.normalizedGraph.touchpoints[id]; return point ? <label key={id}><span>{point.name}<small>CANAL</small></span><select value={point.channelId ?? ''} onChange={(event) => assignTouchpointChannelId(id, event.target.value)}>{journeyChannels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select></label> : null; })}<button type="button" className="bo-h729-manage-channels" onClick={() => window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'channels' }))}>Gerenciar canais e continuidade</button></div>}</section>

              <section><div className="bo-h79-section-title"><Target size={16}/><div><strong>Fricções observadas nesta etapa</strong><span>São observações locais da Journey; não substituem Problemas validados.</span></div></div><div className="bo-h79-stack-list">{selectedStage.problemIds.map((problemId) => { const problem = graph.problems[problemId]; return problem ? <div key={problemId} className="is-friction"><textarea value={problem.description} onChange={(event) => updateProblem(problemId, event.target.value)} rows={2}/><button type="button" onClick={() => removeProblemFromStage(selectedStage.id, problemId)} aria-label="Remover fricção"><Trash2 size={14}/></button></div> : null; })}</div><div className="bo-h79-add-inline"><input value={newProblemText} onChange={(event) => setNewProblemText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addProblemToStage(selectedStage.id, newProblemText); }} placeholder="Nova fricção observada" /><button type="button" onClick={() => addProblemToStage(selectedStage.id, newProblemText)}>Adicionar</button></div></section>

              <section><div className="bo-h79-section-title"><Sparkles size={16}/><div><strong>Oportunidades</strong><span>Transforme aprendizado em hipótese de melhoria e execução.</span></div></div><div className="bo-h79-stack-list">{selectedStage.opportunityIds.map((opportunityId) => { const opportunity = graph.opportunities[opportunityId]; return opportunity ? <div key={opportunityId} className="is-opportunity"><textarea value={opportunity.title} onChange={(event) => updateOpportunity(opportunityId, event.target.value)} rows={2}/><button type="button" onClick={() => removeOpportunityFromStage(selectedStage.id, opportunityId)} aria-label="Remover oportunidade"><Trash2 size={14}/></button></div> : null; })}</div><div className="bo-h79-add-inline"><input value={newOpportunityText} onChange={(event) => setNewOpportunityText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addOpportunityToStage(selectedStage.id, newOpportunityText); }} placeholder="Nova oportunidade" /><button type="button" onClick={() => addOpportunityToStage(selectedStage.id, newOpportunityText)}>Adicionar</button></div>{detailMode && selectedStage.opportunityIds.flatMap((id) => graph.opportunities[id]?.taskIds ?? []).length > 0 && <div className="bo-h79-task-links">{selectedStage.opportunityIds.flatMap((id) => graph.opportunities[id]?.taskIds ?? []).map((taskId) => { const task = graph.tasks[taskId]; return task ? <label key={taskId}><span>{task.title}</span><select value={task.status} onChange={(event) => updateTaskStatus(task.id, event.target.value as TaskStatus)}><option value="todo">A fazer</option><option value="doing">Em andamento</option><option value="done">Concluído</option></select></label> : null; })}</div>}</section>
            </div>
          </aside></>;
        })()}
      </div>
      {showCoverEditor && <div className="bo-h718h1-cover-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !coverBusy) setShowCoverEditor(false); }}>
        <section className="bo-h718h1-cover-dialog" role="dialog" aria-modal="true" aria-labelledby="journey-cover-title">
          <header><div><small>BLUE OCEAN · JOURNEY</small><h2 id="journey-cover-title">Capa da Journey</h2><p>Todas as Journeys usam a capa Blue Ocean por padrão. Você pode enviar uma imagem própria e voltar ao padrão quando quiser.</p></div><button type="button" onClick={() => setShowCoverEditor(false)} disabled={coverBusy} aria-label="Fechar"><X size={18}/></button></header>
          <div className="bo-h718h1-cover-preview-large"><img src={journeyCoverSrc(journey)} alt={`Prévia da capa de ${journey.name}`} /><span><b>JOURNEY</b>{journey.name}</span></div>
          <div className="bo-h718h1-cover-actions">
            <button type="button" className="primary" onClick={() => coverInputRef.current?.click()} disabled={coverBusy}><Upload size={16}/>{coverBusy ? 'Preparando…' : 'Enviar imagem'}</button>
            <button type="button" onClick={() => { setJourneyCover(undefined); setCoverError(''); showToast('Capa padrão Blue Ocean restaurada.'); }} disabled={coverBusy || !hasCustomJourneyCover(journey)}><RotateCcw size={16}/>Usar padrão</button>
            <input ref={coverInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void uploadJourneyCover(event.target.files?.[0])} />
          </div>
          <small className="bo-h718h1-cover-help">PNG, JPG ou WebP · até 6 MB · a imagem é otimizada automaticamente.</small>
          {coverError && <p className="bo-h718h1-cover-error">{coverError}</p>}
        </section>
      </div>}
    </div>
  );
}

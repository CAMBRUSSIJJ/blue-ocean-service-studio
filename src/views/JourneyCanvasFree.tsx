import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, DragEvent } from 'react';
import type { StudioController } from '../state/useStudioController';
import type { Emotion, JourneyLane, JourneyLaneTone, JourneyLaneType } from '../domain/model';
import { JOURNEY_LANE_LABELS, updateJourneyLayout, duplicateJourneyLane, reorderJourneyLane } from '../domain/journey-layout-operations';
import { journeyContextItems } from '../services/journey-map-studio';
import { cardsInCell, addCellCard, editCellCard, removeCellCard, moveJourneyCard, duplicateCellCard, formatCardText, setCellCards } from '../domain/journey-card-operations';
import {
  ArrowLeft, ArrowRight, Check, ChevronDown, GripVertical, LayoutGrid,
  Maximize2, Minimize2, Minus, Plus, RotateCcw,
  Trash2, X, ZoomIn,
} from '../design-system/icons';

type ContextKind = 'persona' | 'need' | 'pain' | 'evidence';
const selectedEmotionLabels: Record<Emotion, string> = {
  negative: 'Frustrado', neutral: 'Neutro', positive: 'Satisfeito',
};

// H17.0.5: minimalist, directly editable Journey map. All mutations go through StudioController.
export function JourneyCanvasFree({ studio, onMatrix, onCaptureContext, onBlueprintDraft, onBack }: {
  studio: StudioController;
  onMatrix: () => void;
  onCaptureContext: (kind: ContextKind, title: string) => void;
  onBlueprintDraft: () => void | Promise<void>;
  onBack?: () => void;
}) {
  const {
    graph, setGraph, journey, orderedStages, visibleStages, selectedStage, saveStatus,
    setSelectedStageId, updateStageCore, updateStageExperience, 
    createStage, handleStageDragStart, handleStageDrop, moveStage, removeStage,
    canUndo, canRedo, undo, redo, newTouchpointName, setNewTouchpointName, addTouchpointToStage,
    removeTouchpointFromStage, showToast, setStageContextLink,
  } = studio;
  const [isExpanded, setIsExpanded] = useState(false);
  const [inlineStageTitle, setInlineStageTitle] = useState('');
  const [showViews, setShowViews] = useState(false);
  const [showLaneMenu, setShowLaneMenu] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [newContextKind, setNewContextKind] = useState<ContextKind>('need');
  const [newContextTitle, setNewContextTitle] = useState('');
  const [showContextForm, setShowContextForm] = useState(false);
  const [showNewStage, setShowNewStage] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [surfaceHeight, setSurfaceHeight] = useState(600);
  useLayoutEffect(() => {
    const resize = () => {
      const top = (surfaceRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY;
      const bottomNavigation = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rt-mobile-nav')) || 0;
      setSurfaceHeight(Math.max(160, window.innerHeight - top - bottomNavigation - 12));
    };
    resize(); window.addEventListener('resize', resize);
    const observer = new ResizeObserver(resize);
    if (surfaceRef.current?.parentElement) observer.observe(surfaceRef.current.parentElement);
    return () => { window.removeEventListener('resize', resize); observer.disconnect(); };
  }, [isExpanded]);
  const [selectedLaneId, setSelectedLaneId] = useState<string | null>(null);
  const [laneMenuId, setLaneMenuId] = useState<string | null>(null);
  const [stageMenuId, setStageMenuId] = useState<string | null>(null);
  const [journeyName, setJourneyName] = useState(journey.name);
  const cancelNameEdit = useRef(false);
  useEffect(() => setJourneyName(journey.name), [journey.name]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { setLaneMenuId(null); setStageMenuId(null); setShowLaneMenu(false); setShowViews(false); } };
    const dismiss = (event: MouseEvent) => { if (!(event.target as HTMLElement).closest('.bo-h1706-stage,.bo-h1706-lane-name,.bo-h1705-menu-wrap,.bo-h1706-add-button')) { setStageMenuId(null); setLaneMenuId(null); setShowLaneMenu(false); setShowViews(false); } };
    document.addEventListener('keydown', close);
    document.addEventListener('click', dismiss);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('click', dismiss); };
  }, []);


  const lanes = journey.mapLayout?.lanes ?? [];
  const contextItems = journeyContextItems(graph, journey.id);
  const selectedLane = lanes.find(lane => lane.id === selectedLaneId);
  const columnWidth = journey.mapLayout?.stageWidth ?? 288;
  const palette: Record<JourneyLaneTone, { label: string; color: string }> = {
    neutral: { label: 'Neutra', color: '#f8fafc' }, blue: { label: 'Azul', color: '#eff6ff' },
    emerald: { label: 'Verde', color: '#ecfdf5' }, amber: { label: 'Amarela', color: '#fffbeb' },
    rose: { label: 'Rosa', color: '#fff1f2' }, violet: { label: 'Violeta', color: '#f5f3ff' },
  };
  const laneTypes: { type: JourneyLaneType; label: string; icon: string }[] = [
    { type: 'text', label: 'Texto', icon: 'T' }, { type: 'image', label: 'Imagem', icon: '▧' },
    { type: 'stage', label: 'Subetapas', icon: '▤' }, { type: 'icons', label: 'Ícones', icon: '☺' },
    { type: 'grid', label: 'Lista de verificação', icon: '☑' }, { type: 'divider', label: 'Divisor', icon: '—' },
    { type: 'emotion', label: 'Emoções', icon: '⌁' }, { type: 'embed', label: 'Link de referência', icon: '↗' },
  ];
  const createId = (kind: string) => `${kind}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;
  const saveLanes = (update: (current: JourneyLane[]) => JourneyLane[], reason: string) => setGraph(current =>
    updateJourneyLayout(current, journey.id, layout => ({ ...layout, lanes: update(layout.lanes) })), reason);
  const editLane = (id: string, update: (current: JourneyLane) => JourneyLane, reason = 'Journey: editar faixa') =>
    saveLanes(current => current.map(lane => lane.id === id ? update(lane) : lane), reason);
  const addLane = (type: JourneyLaneType, binding?: JourneyLane['binding']) => {
    const id = createId('lane');
    const label = binding === 'customerAction' ? 'Ações do cliente' : binding === 'thoughts' ? 'Pensamentos' : binding === 'touchpoints' ? 'Pontos de contato' : binding === 'needs' ? 'Necessidades' : binding === 'pains' ? 'Dores' : JOURNEY_LANE_LABELS[type];
    saveLanes(current => [...current, { id, type, label, binding, cards: {}, height: type === 'divider' ? 64 : 164, tone: 'neutral' }], 'Journey: adicionar faixa');
    setShowLaneMenu(false);
    requestAnimationFrame(() => scrollRef.current?.querySelector(`[data-lane-id="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
  };
  const changeLane = (id: string, patch: Partial<JourneyLane>) => editLane(id, current => ({ ...current, ...patch }));
  const moveLane = (id: string, direction: -1 | 1) => saveLanes(current => reorderJourneyLane(current, id, direction), 'Journey: reordenar faixa');
  const duplicateLane = (id: string) => { saveLanes(current => duplicateJourneyLane(current, id, createId), 'Journey: duplicar faixa'); setLaneMenuId(null); };
  const selectLane = (id: string) => { setEditingCard(null); setSelectedLaneId(id); setSelectedStageId(null); setLaneMenuId(null); };
  const removeLane = (lane: JourneyLane) => {
    setLaneMenuId(null);
    if (!window.confirm(`Excluir a faixa “${lane.label}” e seus cartões? Os elementos vinculados ao serviço serão preservados.`)) return;
    saveLanes(current => current.filter(item => item.id !== lane.id), 'Journey: excluir faixa');
    setSelectedLaneId(null); setLaneMenuId(null);
  };
  const saveJourneyName = () => {
    if (cancelNameEdit.current) { cancelNameEdit.current = false; setJourneyName(journey.name); return; }
    const name = journeyName.trim() || journey.name;
    setJourneyName(name);
    if (name === journey.name) return;
    setGraph(current => { const target = current.journeys[journey.id]; return target ? { ...current, journeys: { ...current.journeys, [journey.id]: { ...target, name, updatedAt: new Date().toISOString() } } } : current; }, 'Journey: renomear Jornada');
  };
  const cardValue = (lane: JourneyLane, stage: (typeof orderedStages)[number]) => {
    if (lane.binding === 'customerAction') return stage.customerAction ?? '';
    if (lane.binding === 'thoughts') return stage.thoughts ?? '';
    if (lane.binding === 'touchpoints') return stage.touchpointIds.map((id) => graph.touchpoints[id]?.name).filter(Boolean).join(' · ');
    if (lane.binding === 'needs') return (stage.needIds ?? []).map((id) => graph.entities?.need?.[id]?.title ?? graph.entities?.need?.[id]?.description).filter(Boolean).join(' · ');
    if (lane.binding === 'pains') return (stage.painIds ?? []).map((id) => graph.entities?.pain?.[id]?.title ?? graph.entities?.pain?.[id]?.description).filter(Boolean).join(' · ');
    if (lane.type === 'emotion') return stage.emotion === 'positive' ? '😊 Satisfeito' : stage.emotion === 'negative' ? '😞 Frustrado' : '😐 Neutro';
    return lane.cards[stage.id] ?? '';
  };
  const updateCard = (lane: JourneyLane, stageId: string, value: string) => {
    if (lane.binding === 'customerAction') { updateStageCore(stageId, 'customerAction', value); return; }
    if (lane.binding === 'thoughts') { updateStageExperience(stageId, { thoughts: value }); return; }
    editLane(lane.id, current => ({ ...current, cards: { ...current.cards, [stageId]: value } }), 'Journey: editar conteúdo');
  };
  const changeFreeCard = (lane: JourneyLane, stageId: string, cardId: string, content: string) =>
    editLane(lane.id, current => editCellCard(current, stageId, cardId, content), 'Journey: editar cartão');
  const addFreeCard = (lane: JourneyLane, stageId: string) => {
    const id = createId('card');
    editLane(lane.id, current => addCellCard(current, stageId, id), 'Journey: adicionar cartão');
    requestAnimationFrame(() => scrollRef.current?.querySelector<HTMLTextAreaElement>(`[data-card-id="${id}"] textarea`)?.focus());
  };
  const deleteFreeCard = (lane: JourneyLane, stageId: string, cardId: string) =>
    editLane(lane.id, current => removeCellCard(current, stageId, cardId), 'Journey: remover cartão');
  const duplicateFreeCard = (lane: JourneyLane, stageId: string, cardId: string) =>
    editLane(lane.id, current => duplicateCellCard(current, stageId, cardId, createId('card')), 'Journey: duplicar cartão');
  const checkFreeCard = (lane: JourneyLane, stageId: string, cardId: string, checked: boolean) =>
    editLane(lane.id, current => setCellCards(current, stageId, cardsInCell(current, stageId).map(card => card.id === cardId ? { ...card, checked } : card)), 'Journey: concluir item');
  const moveCardByKeyboard = (lane: JourneyLane, stageId: string, cardId: string, direction: -1 | 1) => {
    saveLanes(current => {
      const source = current.find(item => item.id === lane.id); if (!source) return current;
      const cards = cardsInCell(source, stageId), at = cards.findIndex(card => card.id === cardId), target = at + direction;
      if (at < 0 || target < 0 || target >= cards.length) return current;
      return moveJourneyCard(current, lane.id, stageId, cardId, lane.id, stageId, direction > 0 ? target + 1 : target);
    }, 'Journey: reordenar cartão');
  };
  const formatFreeCard = (lane: JourneyLane, stageId: string, cardId: string, kind: 'bold' | 'italic' | 'list' | 'link', field: HTMLTextAreaElement | null) => {
    if (!field) return;
    const card = cardsInCell(lane, stageId).find(item => item.id === cardId);
    if (!card) return;
    const selection = formatCardText(card.content, field.selectionStart, field.selectionEnd, kind);
    changeFreeCard(lane, stageId, cardId, selection.content);
    requestAnimationFrame(() => { field.focus(); field.setSelectionRange(selection.start, selection.end); });
  };
  const startCardDrag = (event: DragEvent, laneId: string, stageId: string, cardId: string) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-blue-ocean-card', JSON.stringify({ laneId, stageId, cardId }));
  };
  const dropCard = (event: DragEvent, targetLaneId: string, targetStageId: string, position?: number) => {
    const raw = event.dataTransfer.getData('application/x-blue-ocean-card');
    if (!raw) return;
    event.preventDefault(); event.stopPropagation();
    try {
      const payload: unknown = JSON.parse(raw);
      if (!payload || typeof payload !== 'object') return;
      const card = payload as Record<string, unknown>;
      if (typeof card.laneId !== 'string' || typeof card.stageId !== 'string' || typeof card.cardId !== 'string') return;
      const { laneId, stageId, cardId } = card as { laneId: string; stageId: string; cardId: string };
      saveLanes(current => moveJourneyCard(current, laneId, stageId, cardId, targetLaneId, targetStageId, position), 'Journey: mover cartão');
    } catch { /* Do not accept unrelated or malformed drag content. */ }
  };
  const renderLaneMenu = () => <div className="bo-h1706-lane-menu" role="group" aria-label="Tipos de faixa">
    <b>Faixas de conteúdo</b>{laneTypes.map(item => <button key={item.type} type="button" onClick={() => addLane(item.type)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
    <hr/><b>Informações do serviço</b>{([['customerAction', 'Ações do cliente'], ['thoughts', 'Pensamentos'], ['touchpoints', 'Pontos de contato'], ['needs', 'Necessidades'], ['pains', 'Dores']] as const).map(([binding, label]) => <button key={binding} type="button" onClick={() => addLane('text', binding)}>+ {label}</button>)}
  </div>;
  const activeStages = visibleStages.length ? visibleStages : orderedStages;
  const gridColumns = ['var(--journey-rail, 190px)', ...activeStages.map(() => `${columnWidth}px`), '250px'].join(' ');
  const activeStageIndex = selectedStage ? journey.stageIds.indexOf(selectedStage.id) : -1;
  const dismissMenus = () => setShowViews(false);
  const openNewStage = () => {
    setShowNewStage(true);
    setSelectedStageId(null);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' }));
  };
  const createInlineStage = () => {
    if (!inlineStageTitle.trim()) return;
    createStage(inlineStageTitle);
    setInlineStageTitle('');
    setShowNewStage(false);
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' }));
  };
  const captureContext = () => {
    const title = newContextTitle.trim();
    if (!title) return;
    onCaptureContext(newContextKind, title);
    setNewContextTitle('');
    setShowContextForm(false);
  };
  const closeJourney = () => {
    setIsExpanded(false);
    setSelectedStageId(null);
    window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'overview' }));
  };
  const updateThoughts = (value: string) => {
    if (!selectedStage) return;
    updateStageExperience(selectedStage.id, { thoughts: value });
  };
  const removeStageSafely = (stageId: string) => {
    const target = orderedStages.find((item) => item.id === stageId);
    if (!target) return;
    const filledLanes = lanes.filter((lane) => Boolean(lane.cards[stageId]?.trim())).length;
    const linked = (target.needIds?.length ?? 0) + (target.painIds?.length ?? 0) + target.touchpointIds.length;
    const details = [filledLanes && `${filledLanes} faixas com conteúdo`, linked && `${linked} vínculos com o serviço`].filter(Boolean).join(' e ');
    if (!window.confirm(`Remover a etapa “${target.title}”?${details ? ` Esta etapa contém ${details}.` : ''} Os elementos do serviço não serão excluídos.`)) return;
    // One graph transaction removes the stage and its lane cells atomically.
    removeStage(stageId);
    showToast('Etapa removida da Jornada.');
  };
  const removeSelected = () => { if (selectedStage) removeStageSafely(selectedStage.id); };

  return <div ref={surfaceRef} tabIndex={-1} onKeyDown={event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || (event.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]')) return;
    event.preventDefault(); event.stopPropagation(); if (event.shiftKey) redo(); else undo();
  }} style={{ height: isExpanded ? '100dvh' : surfaceHeight, minHeight: 0 }} className={`bo-h1705-journey ${isExpanded ? 'is-expanded' : ''}`} data-journey-canvas="H17.0.8" data-journey-free-map="1">
    <header className="bo-h1705-topbar">
      <button type="button" className="bo-h1705-back" onClick={onBack ?? closeJourney} title={onBack ? 'Todas as Jornadas' : 'Voltar ao serviço'} aria-label={onBack ? 'Todas as Jornadas' : 'Voltar ao serviço'}><ArrowLeft size={18}/><span>{onBack ? 'Jornadas' : 'Serviço'}</span></button>
      <div className="bo-h1705-heading"><span>JORNADA DO CLIENTE</span><input aria-label="Nome da Jornada" value={journeyName} onChange={event => setJourneyName(event.target.value)} onBlur={saveJourneyName} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { cancelNameEdit.current = true; event.currentTarget.blur(); } }}/></div>
      <span className="bo-h1705-saving" aria-live="polite" title="As alterações ficam neste navegador. Exporte um backup para guardar outra cópia.">{saveStatus === 'saved' ? '● Salvo neste dispositivo' : saveStatus === 'saving' ? '◌ Salvando…' : '⚠ Erro ao salvar'}</span>
      <div className="bo-h1705-top-actions">
        <button type="button" disabled={!orderedStages.length} title="Compartilhar etapas e ações do cliente com um Blueprint em rascunho" onClick={() => { if (window.confirm('Abrir um Blueprint em rascunho com estas etapas? As ações do cliente são compartilhadas; suas faixas e cartões permanecem na Jornada.')) void onBlueprintDraft(); }}>Blueprint</button>
        <button type="button" onClick={() => setIsExpanded((value) => !value)} title={isExpanded ? 'Ver dentro do serviço' : 'Ampliar mapa'} aria-label={isExpanded ? 'Ver dentro do serviço' : 'Ampliar mapa'}>{isExpanded ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}</button>
        <button type="button" className="bo-h1705-primary" onClick={openNewStage}><Plus size={16}/> Nova etapa</button>
      </div>
    </header>
    <nav className="bo-h1705-menubar" aria-label="Ferramentas da Jornada">
      <div className="bo-h1705-menu-wrap">
        <button type="button" className={showViews ? 'is-active' : ''} onClick={() => { setShowViews(!showViews);  }} aria-expanded={showViews}><LayoutGrid size={16}/> Visualizações <ChevronDown size={13}/></button>
        {showViews && <div className="bo-h1705-dropdown bo-h1705-views">
          <button type="button" onClick={dismissMenus}><Check size={15}/> Mapa livre <small>Poucos elementos, edição no quadro</small></button>
          <button type="button" onClick={() => { dismissMenus(); onMatrix(); }}><LayoutGrid size={15}/> Matriz detalhada <small>Visualização completa anterior</small></button>
          <button type="button" onClick={closeJourney}>Voltar ao serviço</button>
          <label className="bo-j2-column-width">Largura das etapas<select aria-label="Largura das etapas" value={columnWidth} onChange={event => { const width = Number(event.target.value); setGraph(current => updateJourneyLayout(current, journey.id, layout => ({ ...layout, stageWidth: width })), 'Journey: ajustar largura das etapas'); }}><option value={240}>Compacta</option><option value={288}>Normal</option><option value={360}>Ampla</option><option value={440}>Extra ampla</option></select></label>
        </div>}
      </div>
      <div className="bo-h1705-menu-wrap"><button type="button" aria-expanded={showLaneMenu} onClick={() => { setShowLaneMenu(!showLaneMenu); setShowViews(false); }}><Plus size={15}/> Adicionar faixa</button>{showLaneMenu && renderLaneMenu()}</div>
      <div className="bo-h1705-menu-spacer"/>
      <span className="bo-h1705-stage-count">{orderedStages.length} {orderedStages.length === 1 ? 'etapa' : 'etapas'}</span>
      <button type="button" onClick={undo} disabled={!canUndo} title="Desfazer" aria-label="Desfazer"><RotateCcw size={16}/></button>
      <button type="button" onClick={redo} disabled={!canRedo} title="Refazer" aria-label="Refazer"><RotateCcw size={16} style={{ transform: 'scaleX(-1)' }}/></button>
    </nav>

    <div className="bo-h1705-body">
      <main className="bo-h1705-scroll" ref={scrollRef} onClick={() => { if (showViews) dismissMenus(); }} aria-label="Mapa horizontal da Jornada">
        <div className="bo-h1706-map" style={{ zoom: zoom / 100, gridTemplateColumns: gridColumns }} data-configurable-lanes="1">
          <div className="bo-h1706-corner"><b>Etapas principais</b><small>Uma coluna para cada momento da experiência</small></div>
          {activeStages.map((stage, index) => <div key={stage.id} className={`bo-h1706-stage${stageMenuId === stage.id ? ' is-menu-open' : ''}`} data-journey-stage-id={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleStageDrop(event, stage.id)}>
            <div className="bo-h1706-stage-tools"><small>Etapa {String(index + 1).padStart(2, '0')}</small><button className="bo-simple-stage-grip" draggable onDragStart={(event) => handleStageDragStart(event, stage.id)} title="Arrastar etapa" aria-label={`Arrastar ${stage.title}`}><GripVertical size={14}/></button><button type="button" aria-label={`Ações da etapa ${stage.title}`} title="Ações da etapa" aria-expanded={stageMenuId === stage.id} onClick={() => { setStageMenuId(stageMenuId === stage.id ? null : stage.id); setLaneMenuId(null); }}>•••</button></div>
            <input aria-label={`Nome da etapa ${index + 1}`} value={stage.title} onChange={(event) => updateStageCore(stage.id, 'title', event.target.value)}/>
            {stageMenuId === stage.id && <div className="bo-simple-stage-actions" role="group" aria-label={`Ações de ${stage.title}`}>
              <button type="button" onClick={() => { setEditingCard(null); setSelectedLaneId(null); setSelectedStageId(stage.id); setStageMenuId(null); }} aria-label={`Detalhes de ${stage.title}`}>Editar detalhes</button>
              <button type="button" disabled={index === 0} onClick={() => { moveStage(stage.id, 'prev'); setStageMenuId(null); }} aria-label={`Mover ${stage.title} para esquerda`}>Mover para esquerda</button>
              <button type="button" disabled={index === activeStages.length - 1} onClick={() => { moveStage(stage.id, 'next'); setStageMenuId(null); }} aria-label={`Mover ${stage.title} para direita`}>Mover para direita</button>
              <button type="button" className="bo-j2-danger" onClick={() => { setStageMenuId(null); removeStageSafely(stage.id); }} aria-label={`Remover ${stage.title}`}>Excluir etapa…</button>
            </div>}
          </div>)}
          <div className="bo-h1706-new-stage">{showNewStage || !orderedStages.length ? <div className="bo-h1705-stage-draft"><label>Nova etapa</label><input autoFocus value={inlineStageTitle} onChange={(event) => setInlineStageTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createInlineStage(); if (event.key === 'Escape') setShowNewStage(false); }} placeholder="Nome da etapa"/><button className="bo-h1705-primary" disabled={!inlineStageTitle.trim()} onClick={createInlineStage}>Criar etapa</button></div> : <button onClick={openNewStage}><Plus size={17}/> Adicionar etapa</button>}</div>
          {lanes.filter((lane) => !lane.hidden).map((lane) => <div key={lane.id} data-lane-id={lane.id} className={`bo-h1706-lane-row${selectedLaneId === lane.id ? ' is-selected' : ''}`} style={{ gridColumn: `1 / span ${activeStages.length + 2}`, gridTemplateColumns: 'subgrid', '--lane-height': `${lane.height ?? (lane.type === 'divider' ? 64 : 164)}px`, '--lane-color': palette[lane.tone ?? 'neutral']?.color ?? palette.neutral.color } as CSSProperties}>
            <div className="bo-h1706-lane-name">
              <input value={lane.label} aria-label="Nome da faixa" onChange={event => changeLane(lane.id, { label: event.target.value })}/>
              <small>{lane.binding ? 'Conteúdo vinculado ao serviço' : JOURNEY_LANE_LABELS[lane.type]}</small>
              <div className="bo-h1706-lane-tools">
                <button type="button" title="Ações da faixa" aria-label={`Ações da faixa ${lane.label}`} aria-expanded={laneMenuId === lane.id} onClick={() => setLaneMenuId(laneMenuId === lane.id ? null : lane.id)}>•••</button>
              </div>
              {laneMenuId === lane.id && <div className="bo-j2-lane-actions" role="group" aria-label={`Ações de ${lane.label}`}>
                <button type="button" onClick={() => selectLane(lane.id)}>Propriedades</button>
                <button type="button" onClick={() => duplicateLane(lane.id)}>Duplicar faixa</button>
                <button type="button" disabled={lanes.indexOf(lane) === 0} onClick={() => { moveLane(lane.id, -1); setLaneMenuId(null); }}>Mover para cima</button>
                <button type="button" disabled={lanes.indexOf(lane) === lanes.length - 1} onClick={() => { moveLane(lane.id, 1); setLaneMenuId(null); }}>Mover para baixo</button>
                <button type="button" onClick={() => { changeLane(lane.id, { hidden: true }); setLaneMenuId(null); }}>Ocultar faixa</button>
                <button type="button" className="bo-j2-danger" onClick={() => removeLane(lane)}>Excluir faixa…</button>
              </div>}
            </div>
            {activeStages.map((stage) => <div key={stage.id} data-stage-id={stage.id} className={`bo-h1706-cell type-${lane.type}`}>
              {lane.type === 'divider' ? <hr/> : lane.type === 'emotion' ? <div className="bo-h1706-emotions">{(['negative', 'neutral', 'positive'] as Emotion[]).map((emotion) => <button key={emotion} aria-pressed={stage.emotion === emotion} title={selectedEmotionLabels[emotion]} aria-label={selectedEmotionLabels[emotion]} onClick={() => updateStageCore(stage.id, 'emotion', emotion)}>{emotion === 'positive' ? '😊' : emotion === 'negative' ? '😞' : '😐'}</button>)}</div> : lane.binding === 'touchpoints' || lane.binding === 'needs' || lane.binding === 'pains' ? <div className="bo-h1706-linked"><span>{cardValue(lane, stage) || 'Sem registros vinculados'}</span><button onClick={() => { setSelectedLaneId(null); setSelectedStageId(stage.id); setShowContextForm(lane.binding !== 'touchpoints'); setNewContextKind(lane.binding === 'pains' ? 'pain' : 'need'); }} title={lane.binding === 'touchpoints' ? 'Editar pontos de contato nos detalhes da etapa' : 'Criar e vincular elemento do serviço'}>{lane.binding === 'touchpoints' ? '+ Editar pontos de contato' : '+ Criar e vincular'}</button></div> : lane.type === 'image' || lane.type === 'embed' ? <div className="bo-h1706-media"><input aria-label={`${lane.label} em ${stage.title}`} placeholder={lane.type === 'image' ? 'URL da imagem' : 'URL do conteúdo'} value={cardValue(lane, stage)} onChange={(event) => updateCard(lane, stage.id, event.target.value)}/>{lane.type === 'image' && /^https?:\/\//.test(cardValue(lane, stage)) && <img loading="lazy" src={cardValue(lane, stage)} alt="Imagem do cartão"/>}{lane.type === 'embed' && /^https?:\/\//.test(cardValue(lane, stage)) && <a href={cardValue(lane, stage)} target="_blank" rel="noreferrer">Abrir conteúdo ↗</a>}</div> : <div className="bo-h1709-card-stack" onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-blue-ocean-card')) { event.preventDefault(); event.stopPropagation(); } }} onDrop={(event) => dropCard(event, lane.id, stage.id)}>{lane.binding ? <div className="bo-h1706-edit-card"><textarea aria-label={`${lane.label} em ${stage.title}`} rows={3} placeholder="Escrever..." value={cardValue(lane, stage)} onChange={(event) => updateCard(lane, stage.id, event.target.value)}/></div> : <>{cardsInCell(lane, stage.id).map((card, cardIndex) => <div className={`bo-h1706-edit-card bo-h1709-card${card.checked ? ' is-checked' : ''}`} data-card-id={card.id} key={card.id} onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-blue-ocean-card')) { event.preventDefault(); event.stopPropagation(); } }} onDrop={(event) => dropCard(event, lane.id, stage.id, cardsInCell(lane, stage.id).findIndex((item) => item.id === card.id))}><button type="button" className="bo-h1709-drag-handle" draggable onDragStart={(event) => startCardDrag(event, lane.id, stage.id, card.id)} aria-label="Arrastar cartão" title="Arrastar cartão">⠿</button>
                {lane.type === 'stage' && <small className="bo-j2-substage">Subetapa {cardIndex + 1}</small>}
                {lane.type === 'grid' && <label className="bo-j2-check"><input type="checkbox" aria-label={`Concluir item ${cardIndex + 1} de ${lane.label} em ${stage.title}`} checked={Boolean(card.checked)} onChange={event => checkFreeCard(lane, stage.id, card.id, event.target.checked)}/><span>{card.checked ? 'Concluído' : 'A fazer'}</span></label>}
                {lane.type === 'icons' && <label className="bo-j2-icon">Ícone<select aria-label={`Ícone do cartão ${cardIndex + 1} em ${stage.title}`} value={card.icon ?? '💬'} onChange={event => editLane(lane.id, current => setCellCards(current, stage.id, cardsInCell(current, stage.id).map(item => item.id === card.id ? { ...item, icon: event.target.value } : item)), 'Journey: escolher ícone')}>{[['💬','Mensagem'],['📞','Telefone'],['💻','Digital'],['📦','Entrega'],['😊','Positivo'],['😐','Neutro'],['😞','Negativo'],['⚠️','Atenção'],['✅','Concluído']].map(([value, label]) => <option key={value} value={value}>{value} {label}</option>)}</select></label>}
                <textarea aria-label={`${lane.label} em ${stage.title}, cartão`} rows={lane.type === 'grid' ? 4 : 2} placeholder="Escrever..." value={card.content} onKeyDown={(event) => { if (event.altKey && event.key === 'ArrowUp') { event.preventDefault(); moveCardByKeyboard(lane, stage.id, card.id, -1); } else if (event.altKey && event.key === 'ArrowDown') { event.preventDefault(); moveCardByKeyboard(lane, stage.id, card.id, 1); } }} onFocus={() => setEditingCard(card.id)} onChange={(event) => changeFreeCard(lane, stage.id, card.id, event.target.value)}/><button type="button" className="bo-h1709-duplicate-card" aria-label="Duplicar cartão" title="Duplicar cartão" onClick={() => duplicateFreeCard(lane, stage.id, card.id)}>⧉</button><button type="button" className="bo-h1709-remove-card" aria-label="Remover cartão" title="Remover cartão" onClick={() => deleteFreeCard(lane, stage.id, card.id)}><Trash2 size={12}/></button>{editingCard === card.id && <div className="bo-h1706-format"><span>Editar cartão</span>{(['bold', 'italic', 'list', 'link'] as const).map((kind) => <button key={kind} type="button" onMouseDown={(event) => event.preventDefault()} title={{bold:'Negrito',italic:'Itálico',list:'Lista',link:'Link'}[kind]} onClick={(event) => formatFreeCard(lane, stage.id, card.id, kind, event.currentTarget.closest('.bo-h1709-card')?.querySelector('textarea') ?? null)}>{({bold:'B',italic:'I',list:'≡ Lista',link:'↗ Link'} as const)[kind]}</button>)}<button type="button" onMouseDown={(event) => event.preventDefault()} aria-label="Mover cartão para cima" onClick={() => moveCardByKeyboard(lane, stage.id, card.id, -1)}>↑</button><button type="button" onMouseDown={(event) => event.preventDefault()} aria-label="Mover cartão para baixo" onClick={() => moveCardByKeyboard(lane, stage.id, card.id, 1)}>↓</button></div>}</div>)}<button type="button" className="bo-h1709-add-card" onClick={() => addFreeCard(lane, stage.id)}><Plus size={13}/><span>Adicionar cartão</span></button></>}</div>}</div>)}
            <div className="bo-h1706-cell bo-h1706-empty"/>
          </div>)}
          <div className="bo-h1706-add-lane" style={{ gridColumn: `1 / span ${activeStages.length + 2}` }}>
            {!lanes.length && <div className="bo-j2-empty"><strong>Seu mapa pode ter as faixas que você precisar</strong><p>Comece com texto livre ou traga informações já vinculadas ao serviço.</p><div><button type="button" onClick={() => addLane('text')}>Adicionar texto</button><button type="button" onClick={() => addLane('text', 'customerAction')}>Ações do cliente</button><button type="button" onClick={() => addLane('emotion')}>Emoções</button></div></div>}
            <button type="button" className="bo-h1706-add-button" onClick={() => { setShowLaneMenu(!showLaneMenu); setShowViews(false); }} aria-expanded={showLaneMenu}><Plus size={16}/> Adicionar faixa</button>
            {lanes.some(lane => lane.hidden) && <div className="bo-h1706-hidden"><small>Faixas ocultas</small>{lanes.filter(lane => lane.hidden).map(lane => <button type="button" key={lane.id} onClick={() => changeLane(lane.id, { hidden: false })}>Mostrar {lane.label}</button>)}</div>}
          </div>
        </div>
        {orderedStages.length > 0 && <p className="bo-h1705-help">Edite o nome na própria etapa. Cada coluna é uma etapa. Adicione informações nas faixas e use ••• para organizar seu mapa.</p>}
      </main>
      {selectedLane && <aside className="bo-h1705-inspector bo-j2-lane-inspector" aria-label={`Propriedades da faixa ${selectedLane.label}`}>
        <header><div><small>FAIXA DE CONTEÚDO</small><strong>{selectedLane.label}</strong></div><button type="button" aria-label="Fechar propriedades da faixa" onClick={() => setSelectedLaneId(null)}><X size={19}/></button></header>
        <div className="bo-h1705-inspector-body">
          <label>Nome da faixa<input aria-label="Nome da faixa selecionada" value={selectedLane.label} onChange={event => changeLane(selectedLane.id, { label: event.target.value })}/></label>
          <label>Tipo de conteúdo<select aria-label="Tipo de conteúdo da faixa" disabled={Boolean(selectedLane.binding)} value={selectedLane.type} onChange={event => changeLane(selectedLane.id, { type: event.target.value as JourneyLaneType })}>{laneTypes.map(item => <option key={item.type} value={item.type}>{item.label}</option>)}</select></label>
          <p className="bo-j2-hint">{selectedLane.binding ? 'Esta faixa usa informações compartilhadas com o serviço. Alterações de conteúdo são refletidas nas outras visualizações.' : 'Mudar o tipo altera a apresentação. O conteúdo existente permanece salvo.'}</p>
          <label>Altura mínima<select aria-label="Altura mínima da faixa" value={selectedLane.height ?? (selectedLane.type === 'divider' ? 64 : 164)} onChange={event => changeLane(selectedLane.id, { height: Number(event.target.value) })}>{[64,116,164,240,320,440].map(height => <option key={height} value={height}>{height} px</option>)}</select></label>
          <fieldset><legend>Cor de identificação</legend><div className="bo-j2-colors">{Object.entries(palette).map(([tone, value]) => <button key={tone} type="button" aria-label={`Cor ${value.label}`} aria-pressed={(selectedLane.tone ?? 'neutral') === tone} style={{ background: value.color }} onClick={() => changeLane(selectedLane.id, { tone: tone as JourneyLaneTone })}><span>{value.label}</span></button>)}</div></fieldset>
          <button type="button" onClick={() => duplicateLane(selectedLane.id)}>Duplicar faixa</button>
          <button type="button" onClick={() => { changeLane(selectedLane.id, { hidden: true }); setSelectedLaneId(null); }}>Ocultar faixa</button>
          <button type="button" className="bo-j2-danger" onClick={() => removeLane(selectedLane)}>Excluir faixa…</button>
        </div>
      </aside>}
      {selectedStage && <aside className="bo-h1705-inspector" aria-label={`Editar etapa ${selectedStage.title}`}>
        <header><div><small>DETALHES DA ETAPA {activeStageIndex + 1}</small><strong>{selectedStage.title}</strong></div><button type="button" aria-label="Fechar detalhes" onClick={() => setSelectedStageId(null)}><X size={19}/></button></header>
        <div className="bo-h1705-inspector-body">
          <label>Nome da etapa<input value={selectedStage.title} onChange={(event) => updateStageCore(selectedStage.id, 'title', event.target.value)}/></label>
          <label>O que o cliente faz?<textarea rows={3} value={selectedStage.customerAction} onChange={(event) => updateStageCore(selectedStage.id, 'customerAction', event.target.value)} placeholder="Ex.: Envia uma mensagem pelo WhatsApp"/></label>
          <label>O que o cliente pensa ou espera?<textarea rows={2} value={selectedStage.thoughts ?? ''} onChange={(event) => updateThoughts(event.target.value)} placeholder="Opcional"/></label>
          <fieldset><legend>Como o cliente se sente?</legend><div className="bo-h1705-emotion-list">{(['negative','neutral','positive'] as Emotion[]).map((emotion) => <button type="button" key={emotion} aria-pressed={selectedStage.emotion === emotion} className={selectedStage.emotion === emotion ? 'active' : ''} onClick={() => updateStageCore(selectedStage.id, 'emotion', emotion)}>{emotion === 'positive' ? '😊' : emotion === 'negative' ? '😞' : '😐'}<small>{selectedEmotionLabels[emotion]}</small></button>)}</div></fieldset>
          <details className="bo-h1705-inspector-section bo-j2-context-links"><summary>Relacionar informações existentes</summary>
            {([['need', 'Necessidades', contextItems.needs, selectedStage.needIds ?? []], ['problem', 'Problemas validados', contextItems.problems, selectedStage.validatedProblemIds ?? []], ['evidence', 'Evidências', contextItems.evidence, selectedStage.evidenceIds ?? []]] as const).map(([kind, title, items, selectedIds]) => <fieldset key={kind}><legend>{title}</legend>{items.length ? items.map(item => <label key={item.id}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={event => setStageContextLink(selectedStage.id, kind, item.id, event.target.checked)}/><span>{String(item.title || item.name || 'Sem título')}</span></label>) : <p>Não há registros deste tipo vinculados à Jornada.</p>}</fieldset>)}
          </details>
          <div className="bo-h1705-inspector-section"><b>Pontos de contato</b><div className="bo-h1705-chips">{selectedStage.touchpointIds.map((id) => graph.touchpoints[id] ? <span key={id}>{graph.touchpoints[id].name}<button type="button" aria-label={`Remover ${graph.touchpoints[id].name}`} onClick={() => removeTouchpointFromStage(selectedStage.id, id)}><X size={12}/></button></span> : null)}</div><div className="bo-h1705-add-touchpoint"><input aria-label="Novo ponto de contato" value={newTouchpointName} onChange={(event) => setNewTouchpointName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTouchpointToStage(selectedStage.id, newTouchpointName); }} placeholder="Ex.: WhatsApp, site, loja"/><button type="button" aria-label="Adicionar ponto de contato" onClick={() => addTouchpointToStage(selectedStage.id, newTouchpointName)} disabled={!newTouchpointName.trim()}><Plus size={17}/></button></div></div>
          <div className="bo-h1705-inspector-section"><b>Descobertas e necessidades</b><p>Registre informações conforme surgirem, sem abrir um formulário de pesquisa.</p>{!showContextForm ? <button type="button" className="bo-h1705-link" onClick={() => setShowContextForm(true)}><Plus size={15}/> Registrar descoberta</button> : <div className="bo-h1705-context-form"><select aria-label="Tipo de descoberta" value={newContextKind} onChange={(event) => setNewContextKind(event.target.value as ContextKind)}><option value="need">Necessidade</option><option value="pain">Dor</option><option value="persona">Pessoa</option><option value="evidence">Evidência</option></select><textarea rows={2} value={newContextTitle} onChange={(event) => setNewContextTitle(event.target.value)} placeholder="O que você descobriu?"/><div><button type="button" className="bo-h1705-primary" onClick={captureContext} disabled={!newContextTitle.trim()}>Registrar</button><button type="button" onClick={() => setShowContextForm(false)}>Cancelar</button></div></div>}</div>
        </div>
        <footer className="bo-h1705-inspector-footer"><button type="button" title="Mover etapa para esquerda" disabled={activeStageIndex <= 0} onClick={() => moveStage(selectedStage.id, 'prev')}><ArrowLeft size={16}/></button><button type="button" title="Mover etapa para direita" disabled={activeStageIndex >= orderedStages.length - 1} onClick={() => moveStage(selectedStage.id, 'next')}><ArrowRight size={16}/></button><button type="button" className="bo-h1705-delete" title="Excluir etapa" onClick={removeSelected}><Trash2 size={16}/></button><span className="bo-h1705-drag-hint"><GripVertical size={14}/> Edite ou reorganize</span></footer>
      </aside>}
    </div>
    <footer className="bo-h1705-bottom-bar">
      <div className="bo-h1705-zoom"><button type="button" title="Diminuir zoom" aria-label="Diminuir zoom" disabled={zoom <= 60} onClick={() => setZoom((value) => Math.max(60, value - 10))}><Minus size={18}/></button><span>{zoom}%</span><button type="button" title="Aumentar zoom" aria-label="Aumentar zoom" disabled={zoom >= 150} onClick={() => setZoom((value) => Math.min(150, value + 10))}><ZoomIn size={17}/></button><button type="button" title="Restaurar zoom" onClick={() => { setZoom(100); scrollRef.current?.scrollTo({ left: 0, behavior: 'smooth' }); }}>100%</button></div>
      <small>Mesmo modelo do serviço · Sem pesquisa obrigatória</small>
    </footer>
  </div>;
}

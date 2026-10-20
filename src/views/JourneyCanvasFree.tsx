import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { StudioController } from '../state/useStudioController';
import type { Emotion, JourneyLane, JourneyLaneType } from '../domain/model';
import { cardsInCell, addCellCard, editCellCard, removeCellCard, moveJourneyCard, duplicateCellCard, formatCardText } from '../domain/journey-card-operations';
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
export function JourneyCanvasFree({ studio, onMatrix, onCaptureContext }: {
  studio: StudioController;
  onMatrix: () => void;
  onCaptureContext: (kind: ContextKind, title: string) => void;
}) {
  const {
   
    setSelectedStageId, updateStageCore, updateStageExperience, 
    createStage, handleStageDragStart, handleStageDrop, moveStage, removeStage,
    history, undo, redo, newTouchpointName, setNewTouchpointName, addTouchpointToStage,
    removeTouchpointFromStage, showToast,
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

  const lanes = journey.mapLayout?.lanes ?? [];
  const laneTypes: { type: JourneyLaneType; label: string; icon: string }[] = [
    { type: 'text', label: 'Texto', icon: 'T' }, { type: 'image', label: 'Imagem', icon: '▧' },
    { type: 'stage', label: 'Etapa', icon: '▤' }, { type: 'icons', label: 'Ícones', icon: '☺' },
    { type: 'grid', label: 'Grade', icon: '▦' }, { type: 'divider', label: 'Divisor', icon: '—' },
    { type: 'emotion', label: 'Gráfico de emoções', icon: '⌁' }, { type: 'embed', label: 'Embed', icon: '<>' },
  ];
  const saveLanes = (next: JourneyLane[], reason: string) => setGraph((current) => {
    const target = current.journeys[journey.id];
    if (!target) return current;
    const now = new Date().toISOString();
    return { ...current, journeys: { ...current.journeys, [journey.id]: { ...target, mapLayout: { version: 1 as const, lanes: next }, updatedAt: now } }, service: { ...current.service, updatedAt: now } };
  }, reason);
  const addLane = (type: JourneyLaneType, binding?: JourneyLane['binding']) => {
    const id = `lane-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`;
    const label = binding === 'customerAction' ? 'Ações do cliente' : binding === 'thoughts' ? 'Pensamentos' : binding === 'touchpoints' ? 'Pontos de contato' : binding === 'needs' ? 'Necessidades' : binding === 'pains' ? 'Dores' : laneTypes.find((item) => item.type === type)?.label ?? 'Faixa';
    saveLanes([...lanes, { id, type, label, binding, cards: {} }], 'Journey: adicionar faixa');
    setShowLaneMenu(false);
  };
  const changeLane = (laneId: string, patch: Partial<JourneyLane>) => saveLanes(lanes.map((lane) => lane.id === laneId ? { ...lane, ...patch } : lane), 'Journey: editar faixa');
  const moveLane = (laneId: string, direction: -1 | 1) => {
    const index = lanes.findIndex((lane) => lane.id === laneId); const target = index + direction;
    if (index < 0 || target < 0 || target >= lanes.length) return;
    const next = [...lanes]; [next[index], next[target]] = [next[target], next[index]];
    saveLanes(next, 'Journey: reordenar faixa');
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
    changeLane(lane.id, { cards: { ...lane.cards, [stageId]: value } });
  };
  const changeFreeCard = (lane: JourneyLane, stageId: string, cardId: string, content: string) =>
    changeLane(lane.id, editCellCard(lane, stageId, cardId, content));
  const addFreeCard = (lane: JourneyLane, stageId: string) =>
    changeLane(lane.id, addCellCard(lane, stageId, `card-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`));
  const deleteFreeCard = (lane: JourneyLane, stageId: string, cardId: string) =>
    changeLane(lane.id, removeCellCard(lane, stageId, cardId));
  const duplicateFreeCard = (lane: JourneyLane, stageId: string, cardId: string) =>
    changeLane(lane.id, duplicateCellCard(lane, stageId, cardId, `card-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`));
  const moveCardByKeyboard = (lane: JourneyLane, stageId: string, cardId: string, direction: -1 | 1) => {
    const at = cardsInCell(lane, stageId).findIndex(card => card.id === cardId);
    const target = at + direction;
    if (at < 0 || target < 0 || target >= cardsInCell(lane, stageId).length) return;
    const next = moveJourneyCard(lanes, lane.id, stageId, cardId, lane.id, stageId, direction > 0 ? target + 1 : target);
    if (next !== lanes) saveLanes(next, 'Journey: reordenar cartão');
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
      const next = moveJourneyCard(lanes, card.laneId, card.stageId, card.cardId, targetLaneId, targetStageId, position);
      if (next !== lanes) saveLanes(next, 'Journey: mover cartão');
    } catch { /* Do not accept unrelated or malformed drag content. */ }
  };
  const activeStages = visibleStages.length ? visibleStages : orderedStages;
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

  return <div className={`bo-h1705-journey ${isExpanded ? 'is-expanded' : ''}`} data-journey-canvas="H17.0.8" data-journey-free-map="1">
    <header className="bo-h1705-topbar">
      <button type="button" className="bo-h1705-back" onClick={closeJourney} title="Voltar ao serviço"><ArrowLeft size={18}/><span>Serviço</span></button>
      <div className="bo-h1705-heading"><span>JORNADA DO CLIENTE</span><strong title={journey.name}>{journey.name}</strong></div>
      <span className="bo-h1705-saving" aria-live="polite">{saveStatus === 'saved' ? '● Salvo' : saveStatus === 'saving' ? '◌ Salvando…' : '⚠ Erro ao salvar'}</span>
      <div className="bo-h1705-top-actions">
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
        </div>}
      </div>
      <button type="button" onClick={() => { setShowLaneMenu(true); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }}><Plus size={15}/> Adicionar faixa</button>
      <div className="bo-h1705-menu-spacer"/>
      <span className="bo-h1705-stage-count">{orderedStages.length} {orderedStages.length === 1 ? 'etapa' : 'etapas'}</span>
      <button type="button" onClick={undo} disabled={!history.past.length} title="Desfazer" aria-label="Desfazer"><RotateCcw size={16}/></button>
      <button type="button" onClick={redo} disabled={!history.future.length} title="Refazer" aria-label="Refazer"><RotateCcw size={16} style={{ transform: 'scaleX(-1)' }}/></button>
    </nav>

    <div className="bo-h1705-body">
      <main className="bo-h1705-scroll" ref={scrollRef} onClick={() => { if (showViews) dismissMenus(); }} aria-label="Mapa horizontal da Jornada">
        <div className="bo-h1706-map" style={{ zoom: zoom / 100, gridTemplateColumns: `190px repeat(${activeStages.length}, minmax(258px, 1fr)) 230px` }} data-configurable-lanes="1">
          <div className="bo-h1706-corner"><b>Etapas</b><small>Organize a experiência →</small></div>
          {activeStages.map((stage, index) => <div key={stage.id} className="bo-h1706-stage" data-journey-stage-id={stage.id} onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleStageDrop(event, stage.id)}>
            <div className="bo-h1706-stage-tools"><small>{String(index + 1).padStart(2, '0')}</small><button draggable onDragStart={(event) => handleStageDragStart(event, stage.id)} title="Arrastar etapa"><GripVertical size={14}/></button><button type="button" onClick={() => moveStage(stage.id, 'prev')} disabled={index === 0} title="Mover etapa para esquerda" aria-label={`Mover ${stage.title} para esquerda`}>←</button><button type="button" onClick={() => moveStage(stage.id, 'next')} disabled={index === activeStages.length - 1} title="Mover etapa para direita" aria-label={`Mover ${stage.title} para direita`}>→</button><button type="button" onClick={() => setSelectedStageId(stage.id)} title="Detalhes da etapa" aria-label={`Detalhes de ${stage.title}`}>•••</button><button type="button" onClick={() => removeStageSafely(stage.id)} title="Remover etapa" aria-label={`Remover ${stage.title}`}><Trash2 size={13}/></button></div>
            <input aria-label={`Nome da etapa ${index + 1}`} value={stage.title} onChange={(event) => updateStageCore(stage.id, 'title', event.target.value)}/>
          </div>)}
          <div className="bo-h1706-new-stage">{showNewStage || !orderedStages.length ? <div className="bo-h1705-stage-draft"><label>Nova etapa</label><input autoFocus value={inlineStageTitle} onChange={(event) => setInlineStageTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createInlineStage(); if (event.key === 'Escape') setShowNewStage(false); }} placeholder="Nome da etapa"/><button className="bo-h1705-primary" disabled={!inlineStageTitle.trim()} onClick={createInlineStage}>Criar etapa</button></div> : <button onClick={openNewStage}><Plus size={17}/> Adicionar etapa</button>}</div>
          {lanes.filter((lane) => !lane.hidden).map((lane) => <div key={lane.id} className="bo-h1706-lane-row" style={{ gridColumn: `1 / span ${activeStages.length + 2}`, gridTemplateColumns: 'subgrid' }}>
            <div className="bo-h1706-lane-name"><input value={lane.label} aria-label="Nome da faixa" onChange={(event) => changeLane(lane.id, { label: event.target.value })}/><small>{lane.type}</small><div className="bo-h1706-lane-tools"><button title="Mover para cima" onClick={() => moveLane(lane.id, -1)}>↑</button><button title="Mover para baixo" onClick={() => moveLane(lane.id, 1)}>↓</button><button title="Ocultar faixa" onClick={() => changeLane(lane.id, { hidden: true })}>◉</button><button title="Remover faixa" onClick={() => { if (window.confirm(`Remover a faixa “${lane.label}” e seus cartões?`)) saveLanes(lanes.filter((item) => item.id !== lane.id), 'Journey: remover faixa'); }}><Trash2 size={13}/></button></div></div>
            {activeStages.map((stage) => <div key={stage.id} className={`bo-h1706-cell type-${lane.type}`}>
              {lane.type === 'divider' ? <hr/> : lane.type === 'emotion' ? <div className="bo-h1706-emotions">{(['negative', 'neutral', 'positive'] as Emotion[]).map((emotion) => <button key={emotion} aria-pressed={stage.emotion === emotion} title={selectedEmotionLabels[emotion]} onClick={() => updateStageCore(stage.id, 'emotion', emotion)}>{emotion === 'positive' ? '😊' : emotion === 'negative' ? '😞' : '😐'}</button>)}</div> : lane.binding === 'touchpoints' || lane.binding === 'needs' || lane.binding === 'pains' ? <div className="bo-h1706-linked"><span>{cardValue(lane, stage) || 'Sem registros vinculados'}</span><button onClick={() => { setSelectedStageId(stage.id); setShowContextForm(lane.binding !== 'touchpoints'); setNewContextKind(lane.binding === 'pains' ? 'pain' : 'need'); }} title={lane.binding === 'touchpoints' ? 'Editar pontos de contato nos detalhes da etapa' : 'Criar e vincular elemento do serviço'}>{lane.binding === 'touchpoints' ? '+ Editar pontos de contato' : '+ Criar e vincular'}</button></div> : lane.type === 'image' || lane.type === 'embed' ? <div className="bo-h1706-media"><input aria-label={`${lane.label} em ${stage.title}`} placeholder={lane.type === 'image' ? 'URL da imagem' : 'URL do conteúdo'} value={cardValue(lane, stage)} onChange={(event) => updateCard(lane, stage.id, event.target.value)}/>{lane.type === 'image' && /^https?:\/\//.test(cardValue(lane, stage)) && <img loading="lazy" src={cardValue(lane, stage)} alt="Imagem do cartão"/>}{lane.type === 'embed' && /^https?:\/\//.test(cardValue(lane, stage)) && <a href={cardValue(lane, stage)} target="_blank" rel="noreferrer">Abrir conteúdo ↗</a>}</div> : <div className="bo-h1709-card-stack" onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-blue-ocean-card')) { event.preventDefault(); event.stopPropagation(); } }} onDrop={(event) => dropCard(event, lane.id, stage.id)}>{lane.binding ? <div className="bo-h1706-edit-card"><textarea aria-label={`${lane.label} em ${stage.title}`} rows={3} placeholder="Escrever..." value={cardValue(lane, stage)} onChange={(event) => updateCard(lane, stage.id, event.target.value)}/></div> : <>{cardsInCell(lane, stage.id).map((card) => <div className="bo-h1706-edit-card bo-h1709-card" key={card.id} onDragOver={(event) => { if (event.dataTransfer.types.includes('application/x-blue-ocean-card')) { event.preventDefault(); event.stopPropagation(); } }} onDrop={(event) => dropCard(event, lane.id, stage.id, cardsInCell(lane, stage.id).findIndex((item) => item.id === card.id))}><button type="button" className="bo-h1709-drag-handle" draggable onDragStart={(event) => startCardDrag(event, lane.id, stage.id, card.id)} aria-label="Arrastar cartão" title="Arrastar cartão">⠿</button><textarea aria-label={`${lane.label} em ${stage.title}, cartão`} rows={lane.type === 'grid' ? 4 : 2} placeholder="Escrever..." value={card.content} onKeyDown={(event) => { if (event.altKey && event.key === 'ArrowUp') { event.preventDefault(); moveCardByKeyboard(lane, stage.id, card.id, -1); } else if (event.altKey && event.key === 'ArrowDown') { event.preventDefault(); moveCardByKeyboard(lane, stage.id, card.id, 1); } }} onFocus={() => setEditingCard(card.id)} onBlur={() => setEditingCard(null)} onChange={(event) => changeFreeCard(lane, stage.id, card.id, event.target.value)}/><button type="button" className="bo-h1709-duplicate-card" aria-label="Duplicar cartão" title="Duplicar cartão" onClick={() => duplicateFreeCard(lane, stage.id, card.id)}>⧉</button><button type="button" className="bo-h1709-remove-card" aria-label="Remover cartão" title="Remover cartão" onClick={() => deleteFreeCard(lane, stage.id, card.id)}><Trash2 size={12}/></button>{editingCard === card.id && <div className="bo-h1706-format"><span>Editar cartão</span>{(['bold', 'italic', 'list', 'link'] as const).map((kind) => <button key={kind} type="button" onMouseDown={(event) => event.preventDefault()} title={{bold:'Negrito',italic:'Itálico',list:'Lista',link:'Link'}[kind]} onClick={(event) => formatFreeCard(lane, stage.id, card.id, kind, event.currentTarget.closest('.bo-h1709-card')?.querySelector('textarea') ?? null)}>{({bold:'B',italic:'I',list:'≡ Lista',link:'↗ Link'} as const)[kind]}</button>)}<button type="button" onMouseDown={(event) => event.preventDefault()} aria-label="Mover cartão para cima" onClick={() => moveCardByKeyboard(lane, stage.id, card.id, -1)}>↑</button><button type="button" onMouseDown={(event) => event.preventDefault()} aria-label="Mover cartão para baixo" onClick={() => moveCardByKeyboard(lane, stage.id, card.id, 1)}>↓</button></div>}</div>)}<button type="button" className="bo-h1709-add-card" onClick={() => addFreeCard(lane, stage.id)}><Plus size={13}/> Adicionar cartão</button></>}</div>}</div>)}
            <div className="bo-h1706-cell bo-h1706-empty"/>
          </div>)}
          <div className="bo-h1706-add-lane" style={{ gridColumn: `1 / span ${activeStages.length + 2}` }}><div className="bo-h1706-add-wrap"><button type="button" className="bo-h1706-add-button" onClick={() => setShowLaneMenu((value) => !value)} aria-expanded={showLaneMenu}><Plus size={16}/> Adicionar faixa <ChevronDown size={13}/></button>{showLaneMenu && <div className="bo-h1706-lane-menu"><b>Adicionar faixa</b>{laneTypes.map((item) => <button key={item.type} onClick={() => addLane(item.type)}><span>{item.icon}</span>{item.label}</button>)}<hr/><b>Informações do serviço</b>{([['customerAction', 'Ações'], ['thoughts', 'Pensamentos'], ['touchpoints', 'Pontos de contato'], ['needs', 'Necessidades'], ['pains', 'Dores']] as const).map(([binding, label]) => <button key={binding} onClick={() => addLane('text', binding)}>+ {label}</button>)}</div>}</div>{lanes.some((lane) => lane.hidden) && <div className="bo-h1706-hidden"><small>Faixas ocultas</small>{lanes.filter((lane) => lane.hidden).map((lane) => <button key={lane.id} onClick={() => changeLane(lane.id, { hidden: false })}>Mostrar {lane.label}</button>)}</div>}</div>
        </div>
        {orderedStages.length > 0 && <p className="bo-h1705-help">Edite o nome na própria etapa. Use as setas para reorganizar, e “Adicionar faixa” para construir seu mapa.</p>}
      </main>
      {selectedStage && <aside className="bo-h1705-inspector" aria-label={`Editar etapa ${selectedStage.title}`}>
        <header><div><small>DETALHES DA ETAPA {activeStageIndex + 1}</small><strong>{selectedStage.title}</strong></div><button type="button" aria-label="Fechar detalhes" onClick={() => setSelectedStageId(null)}><X size={19}/></button></header>
        <div className="bo-h1705-inspector-body">
          <label>Nome da etapa<input value={selectedStage.title} onChange={(event) => updateStageCore(selectedStage.id, 'title', event.target.value)}/></label>
          <label>O que o cliente faz?<textarea rows={3} value={selectedStage.customerAction} onChange={(event) => updateStageCore(selectedStage.id, 'customerAction', event.target.value)} placeholder="Ex.: Envia uma mensagem pelo WhatsApp"/></label>
          <label>O que o cliente pensa ou espera?<textarea rows={2} value={selectedStage.thoughts ?? ''} onChange={(event) => updateThoughts(event.target.value)} placeholder="Opcional"/></label>
          <fieldset><legend>Como o cliente se sente?</legend><div className="bo-h1705-emotion-list">{(['negative','neutral','positive'] as Emotion[]).map((emotion) => <button type="button" key={emotion} aria-pressed={selectedStage.emotion === emotion} className={selectedStage.emotion === emotion ? 'active' : ''} onClick={() => updateStageCore(selectedStage.id, 'emotion', emotion)}>{emotion === 'positive' ? '😊' : emotion === 'negative' ? '😞' : '😐'}<small>{selectedEmotionLabels[emotion]}</small></button>)}</div></fieldset>
          <div className="bo-h1705-inspector-section"><b>Pontos de contato</b><div className="bo-h1705-chips">{selectedStage.touchpointIds.map((id) => graph.touchpoints[id] ? <span key={id}>{graph.touchpoints[id].name}<button type="button" aria-label={`Remover ${graph.touchpoints[id].name}`} onClick={() => removeTouchpointFromStage(selectedStage.id, id)}><X size={12}/></button></span> : null)}</div><div className="bo-h1705-add-touchpoint"><input aria-label="Novo ponto de contato" value={newTouchpointName} onChange={(event) => setNewTouchpointName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addTouchpointToStage(selectedStage.id, newTouchpointName); }} placeholder="Ex.: WhatsApp, site, loja"/><button type="button" onClick={() => addTouchpointToStage(selectedStage.id, newTouchpointName)} disabled={!newTouchpointName.trim()}><Plus size={17}/></button></div></div>
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

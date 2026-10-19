import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlignHorizontalSpaceAround, AlignLeft, AlignStartVertical, Box, ChevronDown, Copy, CopyPlus,
  Frame, GitBranch, Grid3X3, Group, Hand, Layers3, LayoutTemplate, Link2, Magnet, Map as MapIcon,
  Maximize2, MousePointer2, Plus, Redo2, Route, Shapes, StickyNote, Trash2, Type, Undo2,
  Ungroup, Workflow, X, ZoomIn, ZoomOut,
} from '../design-system/icons';
import {
  BLUE_OCEAN_OBJECT_META, BLUE_OCEAN_RELATION_META, BlueOceanObjectIcon, relationKindFromLabel,
  type BlueOceanObjectKind, type BlueOceanRelationKind,
} from '../design-system/blue-ocean-objects';
import type { StudioController } from '../state/useStudioController';
import type {
  BlueprintSemanticZoom, Id, SmartObjectKind, WhiteboardEdge, WhiteboardItem, WhiteboardLayoutMode, WhiteboardSemantic,
  WhiteboardTone, WhiteboardView,
} from '../domain/model';
import { makeId } from '../domain/graph-operations';
import {
  BLUEPRINT_LANE_PRESETS, BLUEPRINT_SEMANTIC_ZOOM_META, SERVICE_BLUEPRINT_LINES,
  addBlueprintLaneItem, addCustomBlueprintLane, applyBlueprintLanePreset, blueprintItemLabel, buildServiceBlueprintReport,
  removeBlueprintItem, removeCustomBlueprintLane, setBlueprintSemanticZoom, syncBlueprintFromJourney,
  updateBlueprintItemText, updateBlueprintLaneConfig, type BlueprintLaneKey,
} from '../services/service-blueprint-studio';

type DragSession =
  | { type: 'items'; startX: number; startY: number; origins: Record<Id, { x: number; y: number }> }
  | { type: 'resize'; itemId: Id; startX: number; startY: number; width: number; height: number }
  | { type: 'pan'; startX: number; startY: number; panX: number; panY: number }
  | null;

type TemplateKind = 'blueprint' | 'journey' | 'flow' | 'discovery';

const BOARD_WIDTH = 4200;
const BOARD_HEIGHT = 2600;
const GRID_SIZE = 24;
const AUTO_LANES = ['Evidências', 'Ações do cliente', 'Frontstage', 'Backstage', 'Processos', 'Sistemas / suporte'];

const toneClasses: Record<WhiteboardTone, { card: string; border: string; dot: string; text: string }> = {
  slate: { card: 'bg-white', border: 'border-slate-300', dot: 'bg-slate-500', text: 'text-slate-800' },
  blue: { card: 'bg-blue-50', border: 'border-blue-300', dot: 'bg-blue-500', text: 'text-blue-950' },
  emerald: { card: 'bg-emerald-50', border: 'border-emerald-300', dot: 'bg-emerald-500', text: 'text-emerald-950' },
  amber: { card: 'bg-amber-50', border: 'border-amber-300', dot: 'bg-amber-500', text: 'text-amber-950' },
  violet: { card: 'bg-violet-50', border: 'border-violet-300', dot: 'bg-violet-500', text: 'text-violet-950' },
  rose: { card: 'bg-rose-50', border: 'border-rose-300', dot: 'bg-rose-500', text: 'text-rose-950' },
  yellow: { card: 'bg-yellow-100', border: 'border-yellow-300', dot: 'bg-yellow-500', text: 'text-yellow-950' },
};

const semanticLabels: Record<WhiteboardSemantic, string> = {
  note: 'Post-it', evidence: 'Evidência', frontstage: 'Frontstage', backstage: 'Backstage', process: 'Processo', system: 'Sistema', frame: 'Frame',
  role: 'Papel', dependency: 'Dependência', policy: 'Política',
};

const smartLabels: Record<SmartObjectKind, string> = {
  stage: 'Etapa', touchpoint: 'Touchpoint', problem: 'Problema', opportunity: 'Oportunidade', task: 'Tarefa',
  benefit: 'Benefício', persona: 'Persona', need: 'Necessidade', job: 'Job', pain: 'Dor', problemHypothesis: 'Hipótese', expectation: 'Expectativa', channel: 'Canal',
  emotion: 'Emoção', evidence: 'Evidência', insight: 'Insight', metric: 'Métrica', customerAction: 'Ação do cliente',
  frontstage: 'Frontstage', backstage: 'Backstage', process: 'Processo', system: 'Sistema', person: 'Pessoa',
  solution: 'Solução', experiment: 'Experimento', resource: 'Recurso', responsible: 'Responsável', role: 'Papel', dependency: 'Dependência', policy: 'Política',
};


function blueOceanKindForItem(item: WhiteboardItem): BlueOceanObjectKind {
  if (item.kind === 'smart') return item.objectKind as BlueOceanObjectKind;
  if (item.semantic === 'evidence') return 'evidence';
  if (item.semantic === 'frontstage') return 'frontstage';
  if (item.semantic === 'backstage') return 'backstage';
  if (item.semantic === 'process') return 'process';
  if (item.semantic === 'system') return 'system';
  if (item.semantic === 'role') return 'role';
  if (item.semantic === 'dependency') return 'dependency';
  if (item.semantic === 'policy') return 'policy';
  if (item.shape === 'frame') return 'service';
  return 'note';
}

const relationPresetOrder: BlueOceanRelationKind[] = ['supports', 'contradicts', 'contextualizes', 'depends'];

const layoutLabels: Record<WhiteboardLayoutMode, string> = {
  free: 'Livre', service: 'Service Frame', blueprint: 'Blueprint', flow: 'Fluxo', journey: 'Journey',
};

function itemTone(item: WhiteboardItem): WhiteboardTone {
  if (item.tone) return item.tone;
  if (item.kind === 'smart') {
    return item.objectKind === 'stage' ? 'blue' : item.objectKind === 'touchpoint' ? 'violet' : item.objectKind === 'problem' ? 'rose' : item.objectKind === 'opportunity' ? 'emerald' : 'slate';
  }
  if (item.semantic === 'frontstage') return 'emerald';
  if (item.semantic === 'backstage') return 'amber';
  if (item.semantic === 'system') return 'violet';
  if (item.semantic === 'evidence') return 'slate';
  return item.shape === 'note' ? 'yellow' : 'slate';
}

function smartContent(studio: StudioController, item: Extract<WhiteboardItem, { kind: 'smart' }>) {
  if (item.objectKind === 'stage') {
    const object = studio.graph.stages[item.objectId];
    return object ? { title: object.title, subtitle: object.customerAction || 'Sem ação do cliente' } : { title: 'Objeto removido', subtitle: 'Referência indisponível' };
  }
  if (item.objectKind === 'touchpoint') {
    const object = studio.graph.touchpoints[item.objectId];
    return object ? { title: object.name, subtitle: object.channel || 'Canal não definido' } : { title: 'Objeto removido', subtitle: 'Referência indisponível' };
  }
  if (item.objectKind === 'problem') {
    const object = studio.graph.problems[item.objectId];
    return object ? { title: object.description, subtitle: 'Fricção / problema' } : { title: 'Objeto removido', subtitle: 'Referência indisponível' };
  }
  if (item.objectKind === 'opportunity') {
    const object = studio.graph.opportunities[item.objectId];
    return object ? { title: object.title, subtitle: 'Oportunidade' } : { title: 'Objeto removido', subtitle: 'Referência indisponível' };
  }
  if (item.objectKind === 'task') {
    const object = studio.graph.tasks[item.objectId];
    return object ? { title: object.title, subtitle: `Tarefa · ${object.status}` } : { title: 'Objeto removido', subtitle: 'Referência indisponível' };
  }
  const entity = studio.graph.entities?.[item.objectKind]?.[item.objectId];
  if (entity) {
    const label = smartLabels[item.objectKind];
    return {
      title: String(entity.title || entity.name || label),
      subtitle: String(entity.description || label),
    };
  }
  return { title: 'Objeto removido', subtitle: 'Referência indisponível' };
}

function StructuredBlueprint({ studio, boardId }: { studio: StudioController; boardId: Id }) {
  const { graph, setGraph, showToast } = studio;
  const [showLayers, setShowLayers] = useState(false);
  const [newLaneName, setNewLaneName] = useState('');
  const [newLaneTone, setNewLaneTone] = useState<WhiteboardTone>('slate');
  const [newLaneRequired, setNewLaneRequired] = useState(false);
  const report = buildServiceBlueprintReport(graph, boardId);
  if (!report) return <div className="bo-h710-empty"><LayoutTemplate size={28}/><strong>Blueprint indisponível</strong><span>Conecte este quadro a uma Journey para trabalhar etapa a etapa.</span></div>;

  const zoom = report.settings.semanticZoom;
  const zoomMeta = BLUEPRINT_SEMANTIC_ZOOM_META[zoom];
  const visibleLaneKeys = new Set(report.visibleLanes.map((lane) => lane.key));
  const visibleGaps = report.stages.flatMap((stage) => stage.gaps).filter((gap) => visibleLaneKeys.has(gap.lane));

  const syncJourney = () => {
    const synced = syncBlueprintFromJourney(graph, boardId);
    if (!synced.added) { showToast('Ações do cliente e Evidências da Journey já estão sincronizadas.'); return; }
    setGraph(() => synced.graph, 'H7.10: sincronizar Journey no Blueprint');
    showToast(`${synced.added} referência${synced.added === 1 ? '' : 's'} da Journey sincronizada${synced.added === 1 ? '' : 's'} no Blueprint.`);
  };
  const addCellItem = (stageId: Id, lane: BlueprintLaneKey) => {
    const created = addBlueprintLaneItem({ graph, boardId, stageId, lane });
    if (!created.itemId) { showToast('Não foi possível adicionar conteúdo nesta célula.'); return; }
    setGraph(() => created.graph, `H7.28: adicionar ${lane}`);
  };
  const editItem = (itemId: Id, text: string) => setGraph((current) => updateBlueprintItemText({ graph: current, boardId, itemId, text }), 'H7.28: editar Blueprint');
  const removeItem = (itemId: Id) => setGraph((current) => removeBlueprintItem({ graph: current, boardId, itemId }), 'H7.28: remover item');
  const definition = graph.service.project?.definition;
  const lineAfter = (lane: BlueprintLaneKey) => SERVICE_BLUEPRINT_LINES.find((line) => line.after === lane);

  const changeZoom = (next: BlueprintSemanticZoom) => {
    setGraph((current) => setBlueprintSemanticZoom(current, boardId, next), `H7.28: zoom semântico ${next}`);
  };
  const toggleLaneZoom = (laneKey: string, target: BlueprintSemanticZoom) => {
    const lane = report.lanes.find((item) => item.key === laneKey); if (!lane) return;
    const visibleIn = lane.visibleIn.includes(target) ? lane.visibleIn.filter((item) => item !== target) : [...lane.visibleIn, target];
    if (!visibleIn.length) { showToast('Cada camada precisa permanecer visível em pelo menos um nível de zoom.'); return; }
    setGraph((current) => updateBlueprintLaneConfig(current, boardId, laneKey, { visibleIn }), `H7.28: visibilidade ${laneKey}`);
  };
  const toggleRequired = (laneKey: string) => {
    const lane = report.lanes.find((item) => item.key === laneKey); if (!lane) return;
    setGraph((current) => updateBlueprintLaneConfig(current, boardId, laneKey, { required: !lane.required }), `H7.28: obrigatoriedade ${laneKey}`);
  };
  const createCustomLane = () => {
    const result = addCustomBlueprintLane({ graph, boardId, label: newLaneName, tone: newLaneTone, required: newLaneRequired, visibleIn: ['journey', 'operational'] });
    if (!result.laneKey) { showToast('Digite um nome para a nova camada.'); return; }
    setGraph(() => result.graph, 'H7.28: criar camada personalizada');
    setNewLaneName(''); setNewLaneRequired(false);
    showToast('Camada adicionada ao Blueprint.');
  };
  const deleteLane = (laneKey: string) => {
    const result = removeCustomBlueprintLane({ graph, boardId, laneKey });
    if (!result.removed) { showToast(result.reason || 'Não foi possível remover a camada.'); return; }
    setGraph(() => result.graph, 'H7.28: remover camada personalizada');
    showToast('Camada removida.');
  };
  const applyPreset = (preset: 'standard' | 'healthcare' | 'hospitality' | 'saas') => {
    const result = applyBlueprintLanePreset({ graph, boardId, preset });
    setGraph(() => result.graph, `H7.28: preset ${preset}`);
    showToast(result.added ? `${result.added} camada${result.added === 1 ? '' : 's'} adicionada${result.added === 1 ? '' : 's'} pelo modelo.` : 'Modelo aplicado; nenhuma camada nova precisava ser criada.');
  };

  return <div className="bo-h710-blueprint bo-h728-blueprint" data-service-blueprint-2="1" data-blueprint-semantic-zoom={zoom}>
    <section className="bo-h710-head">
      <div className="bo-h710-title"><small>SERVICE BLUEPRINT · H7.28</small><h2>{report.board.name}</h2><p>Journey conectada: <b>{report.journeyName}</b>. O zoom agora muda o nível de leitura do serviço — não apenas o tamanho do canvas.</p></div>
      <button type="button" className="bo-h710-sync" onClick={syncJourney}><Layers3 size={15}/> Sincronizar Journey</button>
    </section>

    <section className="bo-h728-semantic-toolbar" data-semantic-zoom-toolbar="1">
      <div className="bo-h728-zoom-copy"><small>ZOOM SEMÂNTICO</small><strong>{zoomMeta.label}</strong><span>{zoomMeta.description}</span></div>
      <div className="bo-h728-zoom-switch" role="group" aria-label="Nível semântico do Blueprint">
        {(Object.keys(BLUEPRINT_SEMANTIC_ZOOM_META) as BlueprintSemanticZoom[]).map((item) => <button key={item} type="button" className={zoom === item ? 'active' : ''} onClick={() => changeZoom(item)}>{BLUEPRINT_SEMANTIC_ZOOM_META[item].short}</button>)}
      </div>
      <button type="button" className={`bo-h728-layers-trigger ${showLayers ? 'active' : ''}`} onClick={() => setShowLayers((value) => !value)}><Layers3 size={14}/> Camadas <b>{report.lanes.length}</b><ChevronDown size={13}/></button>
    </section>

    {showLayers && <section className="bo-h728-layer-manager" data-custom-blueprint-layers="1">
      <header><div><small>ARQUITETURA DE CAMADAS</small><strong>Adapte o Blueprint ao tipo de serviço</strong><span>As seis camadas centrais continuam canônicas. Você pode acrescentar camadas específicas e decidir em qual nível de zoom elas aparecem.</span></div></header>
      <div className="bo-h728-presets"><span>Modelos:</span>{(Object.keys(BLUEPRINT_LANE_PRESETS) as Array<'standard' | 'healthcare' | 'hospitality' | 'saas'>).map((preset) => <button type="button" key={preset} className={report.settings.preset === preset ? 'active' : ''} onClick={() => applyPreset(preset)}><strong>{BLUEPRINT_LANE_PRESETS[preset].label}</strong><small>{BLUEPRINT_LANE_PRESETS[preset].description}</small></button>)}</div>
      <div className="bo-h728-lane-create"><label><span>Nova camada</span><input value={newLaneName} onChange={(event) => setNewLaneName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createCustomLane(); }} placeholder="Ex.: Parceiros, Regulação, Dados"/></label><label><span>Cor</span><select value={newLaneTone} onChange={(event) => setNewLaneTone(event.target.value as WhiteboardTone)}><option value="slate">Slate</option><option value="blue">Ocean Blue</option><option value="emerald">Emerald</option><option value="amber">Amber</option><option value="violet">Violet</option><option value="rose">Rose</option><option value="yellow">Yellow</option></select></label><button type="button" className={newLaneRequired ? 'active' : ''} onClick={() => setNewLaneRequired((value) => !value)}>Obrigatória {newLaneRequired ? '✓' : ''}</button><button type="button" className="primary" onClick={createCustomLane}><Plus size={13}/> Adicionar camada</button></div>
      <div className="bo-h728-lane-list">
        {report.lanes.map((lane) => <article key={lane.key} data-tone={lane.tone} data-custom={lane.custom ? '1' : '0'}><i/><div className="bo-h728-lane-meta"><strong>{lane.label}</strong><span>{lane.description}</span><small>{lane.custom ? 'CAMADA DO SERVIÇO' : 'CAMADA CANÔNICA'} · {lane.required ? 'OBRIGATÓRIA' : 'OPCIONAL'}</small></div><div className="bo-h728-lane-zoom"><small>VISÍVEL EM</small>{(['strategic','journey','operational'] as BlueprintSemanticZoom[]).map((item) => <button type="button" key={item} className={lane.visibleIn.includes(item) ? 'active' : ''} onClick={() => toggleLaneZoom(lane.key, item)}>{BLUEPRINT_SEMANTIC_ZOOM_META[item].short}</button>)}</div>{lane.editable && <button type="button" className={`bo-h728-required ${lane.required ? 'active' : ''}`} onClick={() => toggleRequired(lane.key)}>{lane.required ? 'Obrigatória' : 'Opcional'}</button>}{lane.custom && <button type="button" className="bo-h728-delete" title="Remover camada" onClick={() => deleteLane(lane.key)}><Trash2 size={13}/></button>}</article>)}
      </div>
    </section>}

    <section className="bo-h710-context" data-blueprint-design-context="1">
      <div><small>RESULTADO DO SERVIÇO</small><strong>{definition?.outcome || 'Outcome ainda não definido'}</strong><span>{definition?.startBoundary && definition?.endBoundary ? `${definition.startBoundary} → ${definition.endBoundary}` : 'Defina as fronteiras na Service Definition.'}</span></div>
      <div className="bo-h710-context-counts"><span><b>{report.contextCounts.persona}</b>Persona</span><span><b>{report.contextCounts.problem}</b>Problemas</span><span><b>{report.contextCounts.evidence}</b>Evidências</span></div>
    </section>

    <section className="bo-h710-health" data-blueprint-health="1">
      <div className="bo-h710-health-main"><span>QUALIDADE DO BLUEPRINT</span><strong>{report.overallScore}%</strong><i><b style={{ width: `${report.overallScore}%` }}/></i></div>
      <div><small>Etapas</small><strong>{report.stageCount}</strong><span>vindas da Journey</span></div>
      <div><small>Cobertura operacional</small><strong>{report.operationalCoverage}%</strong><span>camadas obrigatórias de entrega</span></div>
      <div><small>Cobertura de evidência</small><strong>{report.evidenceCoverage}%</strong><span>etapas sustentadas</span></div>
      <div className={report.criticalGapCount ? 'is-gap' : 'is-ok'}><small>Gaps</small><strong>{report.gapCount}</strong><span>{report.criticalGapCount} críticos · visão completa</span></div>
      <div className={report.readyForValidation ? 'is-ready' : ''}><small>Status</small><strong>{report.readyForValidation ? 'Pronto' : 'Em construção'}</strong><span>{report.readyForValidation ? 'pronto para validar' : 'feche os gaps antes de validar'}</span></div>
    </section>

    {visibleGaps.length > 0 && <section className="bo-h710-gap-summary" data-blueprint-gaps="1"><div><strong>Gaps visíveis neste nível</strong><span>O diagnóstico completo considera todas as camadas obrigatórias; aqui mostramos apenas as lacunas do zoom {zoomMeta.label.toLowerCase()}.</span></div><div>{visibleGaps.slice(0, 6).map((gap) => <span key={gap.id} className={`is-${gap.severity}`}><b>{gap.stageTitle}</b>{gap.label}</span>)}</div></section>}

    <div className="bo-h710-matrix-wrap bo-h728-matrix-wrap">
      <div className={`bo-h710-matrix bo-h728-matrix is-${zoom}`} style={{ ['--bo-h710-stage-count' as string]: Math.max(1, report.stageCount) }}>
        <div className="bo-h710-corner"><small>{zoomMeta.label.toUpperCase()}</small><strong>{zoom === 'strategic' ? 'Visão do serviço' : zoom === 'journey' ? 'Experiência conectada' : 'Blueprint operacional'}</strong><span>{report.visibleLanes.length} de {report.lanes.length} camadas visíveis</span></div>
        {report.stages.map((stage) => <header key={stage.stage.id} className="bo-h710-stage-head"><small>ETAPA {String(stage.position).padStart(2, '0')}</small><strong>{stage.stage.title}</strong><span>{stage.qualityScore}% completa</span></header>)}

        {report.visibleLanes.map((lane) => {
          const separator = lineAfter(lane.key);
          return <React.Fragment key={lane.key}>
            <aside className={`bo-h710-lane bo-h710-lane--${lane.role} ${lane.custom ? 'bo-h728-lane--custom' : ''}`} data-tone={lane.tone}><i/><div><strong>{lane.label}</strong><span>{lane.description}</span>{lane.custom && <small>CAMADA DO SERVIÇO</small>}</div></aside>
            {report.stages.map((stageReport) => {
              const stage = stageReport.stage;
              const gap = stageReport.gaps.find((item) => item.lane === lane.key);
              const rawItems = stageReport.laneItems[lane.key] ?? [];
              const visibleItems = lane.role === 'evidence' ? rawItems.filter((item) => item.kind === 'free') : rawItems;
              return <div key={`${stage.id}:${lane.key}`} className={`bo-h710-cell ${gap ? 'is-gap' : 'is-complete'} bo-h710-cell--${lane.role} ${lane.custom ? 'bo-h728-cell--custom' : ''}`} data-tone={lane.tone} data-blueprint-cell={`${stage.id}:${lane.key}`}>
                {lane.role === 'customer' ? <div className="bo-h710-customer-action"><small>VEM DA JOURNEY</small><strong>{stage.customerAction || 'Ação do cliente não definida'}</strong>{stage.momentOfTruth && stage.momentOfTruth !== 'none' && <span>Momento da verdade · {stage.momentOfTruth}</span>}</div> : <>
                  {lane.role === 'evidence' && stageReport.evidence.map((evidence) => <div key={evidence.id} className="bo-h710-canonical"><small>EVIDÊNCIA CANÔNICA</small><strong>{String(evidence.title ?? evidence.name ?? 'Evidência')}</strong><span>{String(evidence.description ?? '')}</span></div>)}
                  {visibleItems.map((item) => item.kind === 'free' ? <div key={item.id} className="bo-h710-edit-card"><textarea value={item.text} onChange={(event) => editItem(item.id, event.target.value)} aria-label={`${lane.label} · ${stage.title}`}/><button type="button" onClick={() => removeItem(item.id)} aria-label="Remover item"><X size={12}/></button></div> : <div key={item.id} className="bo-h710-canonical"><small>OBJETO DO SERVICE GRAPH</small><strong>{blueprintItemLabel(graph, item)}</strong></div>)}
                  {gap && <div className="bo-h710-gap"><b>{gap.severity === 'critical' ? 'GAP CRÍTICO' : 'GAP'}</b><span>{gap.message}</span></div>}
                  {lane.editable && <button type="button" className="bo-h710-add" onClick={() => addCellItem(stage.id, lane.key)}><Plus size={13}/> Adicionar</button>}
                </>}
              </div>;
            })}
            {separator && <><div className="bo-h710-line-label"><span>{separator.label}</span><small>{separator.description}</small></div><div className="bo-h710-line" style={{ gridColumn: `2 / span ${Math.max(1, report.stageCount)}` }} /></>}
          </React.Fragment>;
        })}
      </div>
    </div>
    <span className="sr-only" data-h710-compat="1">SERVICE BLUEPRINT 2.0 · Gaps operacionais detectados · Ações do cliente vêm da Journey · Front / Back / Processo / Sistema · Linha de Visibilidade</span>
  </div>;
}

function makeLaneFrames(width = 3200): WhiteboardItem[] {
  const lanes: Array<[string, WhiteboardTone]> = [['Evidências', 'slate'], ['Ações do cliente', 'blue'], ['Frontstage', 'emerald'], ['Backstage', 'amber'], ['Processos', 'blue'], ['Sistemas / suporte', 'violet']];
  return lanes.map(([text, tone], index) => ({
    id: makeId('auto-lane'), kind: 'free', shape: 'frame', semantic: 'frame', tone, text,
    x: 100, y: 90 + index * 300, width, height: 250,
  }));
}

function makeFree(text: string, semantic: WhiteboardSemantic, tone: WhiteboardTone, x: number, y: number, width = 250, height = 132): WhiteboardItem {
  return { id: makeId('template-item'), kind: 'free', shape: 'note', semantic, tone, text, x, y, width, height };
}

function isAutoLane(item: WhiteboardItem) {
  return item.kind === 'free' && item.shape === 'frame' && AUTO_LANES.includes(item.text);
}

export function BlueprintView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, touchUpdatedAt, showToast, undo, redo } = studio;
  const firstBoardId = Object.values(graph.views.whiteboards).find((item) => item.viewKind === 'blueprint')?.id ?? '';
  const [activeBoardId, setActiveBoardId] = useState<Id>(firstBoardId);
  const [viewMode, setViewMode] = useState<'whiteboard' | 'structured'>('whiteboard');
  const [tool, setTool] = useState<'select' | 'hand'>('select');
  const [showLibrary, setShowLibrary] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Id[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<Id | null>(null);
  const [connectSourceId, setConnectSourceId] = useState<Id | null>(null);
  const [zoom, setZoom] = useState(0.84);
  const [pan, setPan] = useState({ x: 60, y: 56 });
  const [previewItems, setPreviewItems] = useState<Record<Id, Partial<WhiteboardItem>>>({});
  const [clipboard, setClipboard] = useState<WhiteboardItem[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragSession>(null);

  const boardIds = Object.values(graph.views.whiteboards).filter((item) => item.viewKind === 'blueprint').map((item) => item.id);
  const board = graph.views.whiteboards[activeBoardId];
  const items = board?.items ?? {};
  const edges = board?.edges ?? {};
  const gridVisible = board?.gridVisible ?? true;
  const snapToGrid = board?.snapToGrid ?? true;
  const layoutMode = board?.layoutMode ?? 'free';
  const selectedItems = selectedIds.map((id) => items[id]).filter((item): item is WhiteboardItem => Boolean(item));
  const selectedItem = selectedItems.length === 1 ? selectedItems[0] : null;
  const selectedEdge = selectedEdgeId ? edges[selectedEdgeId] : null;

  useEffect(() => {
    if (!boardIds.length) {
      if (activeBoardId) setActiveBoardId('');
      return;
    }
    if (!graph.views.whiteboards[activeBoardId] || graph.views.whiteboards[activeBoardId]?.viewKind !== 'blueprint') setActiveBoardId(boardIds[0]);
  }, [activeBoardId, boardIds, graph.views.whiteboards]);

  const commitBoard = (updater: (current: WhiteboardView) => WhiteboardView, tag = 'whiteboard:edit') => {
    setGraph((current) => {
      const currentBoard = current.views.whiteboards[activeBoardId];
      if (!currentBoard) return current;
      return touchUpdatedAt({ ...current, views: { whiteboards: { ...current.views.whiteboards, [activeBoardId]: updater(currentBoard) } } });
    }, tag);
  };

  const snap = (value: number) => snapToGrid ? Math.round(value / GRID_SIZE) * GRID_SIZE : value;

  const boardPointAtViewportCenter = () => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 480, y: 320 };
    return { x: Math.max(40, snap((viewport.clientWidth / 2 - pan.x) / zoom - 120)), y: Math.max(40, snap((viewport.clientHeight / 2 - pan.y) / zoom - 70)) };
  };

  const clearSelection = () => { setSelectedIds([]); setSelectedEdgeId(null); setConnectSourceId(null); };

  const addFreeItem = (shape: 'note' | 'text' | 'shape' | 'frame', semantic: WhiteboardSemantic, text: string, tone: WhiteboardTone, point?: { x: number; y: number }, size?: { width: number; height: number }) => {
    const pos = point ?? boardPointAtViewportCenter();
    const id = makeId('board-item');
    const defaultSize = shape === 'frame' ? { width: 720, height: 260 } : shape === 'text' ? { width: 300, height: 72 } : { width: 250, height: 140 };
    const item: WhiteboardItem = { id, kind: 'free', shape, semantic, tone, text, x: pos.x, y: pos.y, ...(size ?? defaultSize) };
    commitBoard((current) => ({ ...current, items: { ...current.items, [id]: item }, layoutMode: current.layoutMode ?? 'free' }), 'whiteboard:add');
    setSelectedIds([id]); setSelectedEdgeId(null); setTool('select');
    return id;
  };

  const addSmartItem = (objectKind: SmartObjectKind, objectId: Id, point?: { x: number; y: number }) => {
    const pos = point ?? boardPointAtViewportCenter();
    const id = makeId('smart-item');
    const item: WhiteboardItem = { id, kind: 'smart', objectKind, objectId, x: pos.x, y: pos.y, width: 260, height: 132 };
    commitBoard((current) => ({ ...current, items: { ...current.items, [id]: item } }), 'whiteboard:add-smart');
    setSelectedIds([id]); setSelectedEdgeId(null); setTool('select');
  };

  const updateItem = (itemId: Id, patch: Partial<WhiteboardItem>) => {
    commitBoard((current) => {
      const currentItem = current.items[itemId];
      if (!currentItem) return current;
      return { ...current, items: { ...current.items, [itemId]: { ...currentItem, ...patch } as WhiteboardItem } };
    }, 'whiteboard:update-item');
  };

  const removeSelection = () => {
    if (selectedEdgeId) {
      commitBoard((current) => { const next = { ...current.edges }; delete next[selectedEdgeId]; return { ...current, edges: next }; }, 'whiteboard:remove-edge');
      setSelectedEdgeId(null); return;
    }
    if (!selectedIds.length) return;
    const ids = new Set(selectedIds);
    commitBoard((current) => ({
      ...current,
      items: Object.fromEntries(Object.entries(current.items).filter(([id]) => !ids.has(id))),
      edges: Object.fromEntries(Object.entries(current.edges).filter(([, edge]) => !ids.has(edge.fromId) && !ids.has(edge.toId))),
    }), 'whiteboard:remove-items');
    clearSelection();
  };

  const duplicateItems = (source: WhiteboardItem[] = selectedItems) => {
    if (!source.length) return;
    const idMap = new Map<Id, Id>();
    source.forEach((item) => idMap.set(item.id, makeId('board-item')));
    const groupMap = new Map<Id, Id>();
    const created: WhiteboardItem[] = source.map((item) => {
      let groupId = item.groupId;
      if (groupId) { if (!groupMap.has(groupId)) groupMap.set(groupId, makeId('group')); groupId = groupMap.get(groupId); }
      return { ...item, id: idMap.get(item.id)!, groupId, x: item.x + 36, y: item.y + 36 } as WhiteboardItem;
    });
    const sourceIds = new Set(source.map((item) => item.id));
    const createdEdges = Object.values(edges).filter((edge) => sourceIds.has(edge.fromId) && sourceIds.has(edge.toId)).map((edge) => ({ ...edge, id: makeId('edge'), fromId: idMap.get(edge.fromId)!, toId: idMap.get(edge.toId)! }));
    commitBoard((current) => ({ ...current, items: { ...current.items, ...Object.fromEntries(created.map((item) => [item.id, item])) }, edges: { ...current.edges, ...Object.fromEntries(createdEdges.map((edge) => [edge.id, edge])) } }), 'whiteboard:duplicate');
    setSelectedIds(created.map((item) => item.id));
  };

  const addEdge = (fromId: Id, toId: Id) => {
    if (fromId === toId) return;
    const existing = Object.values(edges).find((edge) => edge.fromId === fromId && edge.toId === toId);
    if (existing) { setSelectedEdgeId(existing.id); setSelectedIds([]); setConnectSourceId(null); return; }
    const id = makeId('edge');
    const edge: WhiteboardEdge = { id, fromId, toId, label: '', style: 'solid', arrow: 'end' };
    commitBoard((current) => ({ ...current, edges: { ...current.edges, [id]: edge } }), 'whiteboard:add-edge');
    setSelectedEdgeId(id); setSelectedIds([]); setConnectSourceId(null);
  };

  const selectItem = (id: Id, event: React.MouseEvent | React.PointerEvent) => {
    event.stopPropagation();
    if (connectSourceId && connectSourceId !== id) { addEdge(connectSourceId, id); return; }
    setSelectedEdgeId(null);
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      setSelectedIds((current) => current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]);
    } else if (!selectedIds.includes(id)) setSelectedIds([id]);
  };

  const beginMove = (event: React.PointerEvent, id: Id) => {
    if (tool === 'hand' || event.button === 1) return;
    selectItem(id, event);
    const clicked = items[id];
    const groupedIds = clicked?.groupId ? Object.values(items).filter((item) => item.groupId === clicked.groupId).map((item) => item.id) : [];
    const movingIds = clicked?.groupId && groupedIds.length > 1 ? groupedIds : selectedIds.includes(id) ? selectedIds : [id];
    if (clicked?.groupId && groupedIds.length > 1 && !event.ctrlKey && !event.metaKey && !event.shiftKey) setSelectedIds(groupedIds);
    dragRef.current = { type: 'items', startX: event.clientX, startY: event.clientY, origins: Object.fromEntries(movingIds.map((itemId) => [itemId, { x: items[itemId].x, y: items[itemId].y }])) };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const beginResize = (event: React.PointerEvent, item: WhiteboardItem) => {
    event.stopPropagation();
    dragRef.current = { type: 'resize', itemId: item.id, startX: event.clientX, startY: event.clientY, width: item.width, height: item.height };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const beginPan = (event: React.PointerEvent) => {
    if (tool !== 'hand' && event.button !== 1 && event.button !== 2) return;
    event.preventDefault();
    dragRef.current = { type: 'pan', startX: event.clientX, startY: event.clientY, panX: pan.x, panY: pan.y };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.type === 'pan') { setPan({ x: drag.panX + event.clientX - drag.startX, y: drag.panY + event.clientY - drag.startY }); return; }
    if (drag.type === 'items') {
      const dx = (event.clientX - drag.startX) / zoom; const dy = (event.clientY - drag.startY) / zoom;
      setPreviewItems(Object.fromEntries(Object.entries(drag.origins).map(([id, origin]) => [id, { x: Math.max(0, snap(origin.x + dx)), y: Math.max(0, snap(origin.y + dy)) }])));
      return;
    }
    const dw = (event.clientX - drag.startX) / zoom; const dh = (event.clientY - drag.startY) / zoom;
    setPreviewItems({ [drag.itemId]: { width: Math.max(120, snap(drag.width + dw)), height: Math.max(64, snap(drag.height + dh)) } });
  };

  const finishPointer = () => {
    const drag = dragRef.current;
    if (!drag) return;
    if ((drag.type === 'items' || drag.type === 'resize') && Object.keys(previewItems).length) {
      commitBoard((current) => ({ ...current, items: Object.fromEntries(Object.entries(current.items).map(([id, item]) => [id, previewItems[id] ? { ...item, ...previewItems[id] } : item])) as Record<Id, WhiteboardItem> }), drag.type === 'items' ? 'whiteboard:move' : 'whiteboard:resize');
    }
    dragRef.current = null; setPreviewItems({});
  };

  const groupSelection = () => {
    if (selectedItems.length < 2) { showToast('Selecione pelo menos dois objetos para agrupar.'); return; }
    const groupId = makeId('group');
    commitBoard((current) => ({ ...current, items: Object.fromEntries(Object.entries(current.items).map(([id, item]) => [id, selectedIds.includes(id) ? { ...item, groupId } : item])) as Record<Id, WhiteboardItem> }), 'whiteboard:group');
    showToast(`${selectedItems.length} objetos agrupados.`);
  };

  const ungroupSelection = () => {
    const groupIds = new Set(selectedItems.map((item) => item.groupId).filter((id): id is Id => Boolean(id)));
    if (!groupIds.size) { showToast('A seleção não pertence a um grupo.'); return; }
    commitBoard((current) => ({ ...current, items: Object.fromEntries(Object.entries(current.items).map(([id, item]) => [id, item.groupId && groupIds.has(item.groupId) ? { ...item, groupId: undefined } : item])) as Record<Id, WhiteboardItem> }), 'whiteboard:ungroup');
    showToast('Grupo desfeito.');
  };

  const withJourneyObjects = (current: WhiteboardView) => {
    const existing = new Set(Object.values(current.items).filter((item): item is Extract<WhiteboardItem, { kind: 'smart' }> => item.kind === 'smart').map((item) => `${item.objectKind}:${item.objectId}`));
    const additions: WhiteboardItem[] = [];
    let column = 0;
    for (const stageId of studio.journey.stageIds) {
      const stage = graph.stages[stageId]; if (!stage) continue;
      const x = 220 + column * 300;
      if (!existing.has(`stage:${stageId}`)) additions.push({ id: makeId('smart-stage'), kind: 'smart', objectKind: 'stage', objectId: stageId, x, y: 220, width: 260, height: 132, tone: 'blue' });
      let touchY = 430;
      for (const touchpointId of stage.touchpointIds) {
        if (!existing.has(`touchpoint:${touchpointId}`)) additions.push({ id: makeId('smart-touchpoint'), kind: 'smart', objectKind: 'touchpoint', objectId: touchpointId, x, y: touchY, width: 260, height: 112, tone: 'violet' });
        touchY += 126;
      }
      let problemY = 760;
      for (const problemId of stage.problemIds) {
        if (!existing.has(`problem:${problemId}`)) additions.push({ id: makeId('smart-problem'), kind: 'smart', objectKind: 'problem', objectId: problemId, x, y: problemY, width: 260, height: 112, tone: 'rose' });
        problemY += 126;
      }
      let opportunityY = 1090;
      for (const opportunityId of stage.opportunityIds) {
        if (!existing.has(`opportunity:${opportunityId}`)) additions.push({ id: makeId('smart-opportunity'), kind: 'smart', objectKind: 'opportunity', objectId: opportunityId, x, y: opportunityY, width: 260, height: 120, tone: 'emerald' });
        opportunityY += 134;
      }
      column += 1;
    }
    return { ...current, items: { ...current.items, ...Object.fromEntries(additions.map((item) => [item.id, item])) } };
  };

  const addJourneyObjects = () => {
    if (!board) return;
    const before = Object.keys(board.items).length;
    let added = 0;
    commitBoard((current) => { const next = withJourneyObjects(current); added = Object.keys(next.items).length - Object.keys(current.items).length; return next; }, 'whiteboard:journey-import');
    if (added === 0 && before > 0) showToast('Os objetos da Jornada já estão no quadro.');
    else showToast(`${added} ${added === 1 ? 'objeto da Jornada adicionado' : 'objetos da Jornada adicionados'} ao Whiteboard.`);
  };

  const addBlueprintFrames = () => {
    if (!board) return;
    const already = Object.values(board.items).some(isAutoLane);
    if (already) { showToast('As faixas de Blueprint já estão neste quadro.'); return; }
    const additions = makeLaneFrames();
    commitBoard((current) => ({ ...current, items: { ...current.items, ...Object.fromEntries(additions.map((item) => [item.id, item])) }, layoutMode: 'blueprint' }), 'whiteboard:blueprint-frames');
    setSelectedIds(additions.map((item) => item.id));
  };

  const removeAutoLanes = (current: WhiteboardView) => {
    const removed = new Set(Object.values(current.items).filter(isAutoLane).map((item) => item.id));
    if (!removed.size) return current;
    return { ...current, items: Object.fromEntries(Object.entries(current.items).filter(([id]) => !removed.has(id))), edges: Object.fromEntries(Object.entries(current.edges).filter(([, edge]) => !removed.has(edge.fromId) && !removed.has(edge.toId))) };
  };

  const applyLayout = (mode: WhiteboardLayoutMode) => {
    if (mode === 'free') { commitBoard((current) => ({ ...current, layoutMode: 'free' }), 'whiteboard:layout-free'); showToast('Layout livre ativado.'); return; }
    commitBoard((current) => {
      let next = mode === 'journey' ? withJourneyObjects(removeAutoLanes(current)) : mode === 'blueprint' ? current : removeAutoLanes(current);
      const nonFrames = Object.values(next.items).filter((item) => !(item.kind === 'free' && item.shape === 'frame'));
      const patch: Record<Id, Partial<WhiteboardItem>> = {};
      if (mode === 'flow') {
        const ordered = [...nonFrames].sort((a, b) => a.y - b.y || a.x - b.x);
        ordered.forEach((item, index) => { const row = Math.floor(index / 7); const col = index % 7; patch[item.id] = { x: 180 + col * 390, y: 420 + row * 220 }; });
      } else if (mode === 'journey') {
        const stageOrder = new Map(studio.journey.stageIds.map((id, index) => [id, index]));
        const stageColumn = (item: WhiteboardItem) => {
          if (item.kind === 'smart' && item.objectKind === 'stage') return stageOrder.get(item.objectId) ?? 0;
          if (item.kind !== 'smart') return 0;
          if (item.objectKind === 'touchpoint') {
            const owner = studio.orderedStages.find((stage) => stage.touchpointIds.includes(item.objectId)); return owner ? stageOrder.get(owner.id) ?? 0 : 0;
          }
          if (item.objectKind === 'problem') { const object = graph.problems[item.objectId]; return object ? stageOrder.get(object.stageId) ?? 0 : 0; }
          if (item.objectKind === 'opportunity') { const object = graph.opportunities[item.objectId]; return object ? stageOrder.get(object.stageId) ?? 0 : 0; }
          if (item.objectKind === 'task') { const task = graph.tasks[item.objectId]; const opportunity = task ? graph.opportunities[task.opportunityId] : undefined; return opportunity ? stageOrder.get(opportunity.stageId) ?? 0 : 0; }
          return 0;
        };
        const rowCounts = new Map<string, number>();
        nonFrames.forEach((item) => {
          const col = stageColumn(item); let row = 0;
          if (item.kind === 'smart') row = item.objectKind === 'stage' ? 0 : item.objectKind === 'touchpoint' ? 1 : item.objectKind === 'problem' ? 2 : item.objectKind === 'opportunity' ? 3 : 4;
          else row = 4;
          const key = `${col}:${row}`; const offset = rowCounts.get(key) ?? 0; rowCounts.set(key, offset + 1);
          patch[item.id] = { x: 200 + col * 330, y: 180 + row * 300 + offset * 126, width: Math.min(item.width, 280) };
        });
      } else {
        next = removeAutoLanes(next);
        const frames = makeLaneFrames(Math.max(3000, 500 + Math.max(1, studio.journey.stageIds.length) * 330));
        next = { ...next, items: { ...next.items, ...Object.fromEntries(frames.map((item) => [item.id, item])) } };
        const rowBuckets = new Map<number, number>();
        nonFrames.forEach((item) => {
          let row = 1;
          if (item.kind === 'smart') row = item.objectKind === 'evidence' ? 0 : item.objectKind === 'stage' || item.objectKind === 'customerAction' ? 1 : item.objectKind === 'frontstage' ? 2 : item.objectKind === 'backstage' ? 3 : item.objectKind === 'process' ? 4 : item.objectKind === 'system' || item.objectKind === 'resource' || item.objectKind === 'person' || item.objectKind === 'role' ? 5 : 4;
          else row = item.semantic === 'evidence' ? 0 : item.semantic === 'frontstage' ? 2 : item.semantic === 'backstage' ? 3 : item.semantic === 'system' ? 5 : item.semantic === 'process' ? 4 : 1;
          const index = rowBuckets.get(row) ?? 0; rowBuckets.set(row, index + 1);
          patch[item.id] = { x: 230 + index * 300, y: 145 + row * 300, width: Math.min(item.width, 260), height: Math.min(item.height, 150) };
        });
      }
      return { ...next, layoutMode: mode, items: Object.fromEntries(Object.entries(next.items).map(([id, item]) => [id, patch[id] ? { ...item, ...patch[id] } : item])) as Record<Id, WhiteboardItem> };
    }, `whiteboard:layout-${mode}`);
    clearSelection();
    showToast(`Layout ${layoutLabels[mode]} aplicado.`);
    window.setTimeout(() => fitToContent(), 0);
  };

  const alignSelection = (mode: 'left' | 'top' | 'distribute') => {
    if (selectedItems.length < 2) return;
    const patch: Record<Id, Partial<WhiteboardItem>> = {};
    if (mode === 'left') { const x = Math.min(...selectedItems.map((item) => item.x)); selectedItems.forEach((item) => { patch[item.id] = { x }; }); }
    else if (mode === 'top') { const y = Math.min(...selectedItems.map((item) => item.y)); selectedItems.forEach((item) => { patch[item.id] = { y }; }); }
    else {
      const sorted = [...selectedItems].sort((a, b) => a.x - b.x); const left = sorted[0].x; const right = sorted[sorted.length - 1].x; const step = sorted.length > 1 ? (right - left) / (sorted.length - 1) : 0;
      sorted.forEach((item, index) => { patch[item.id] = { x: left + step * index }; });
    }
    commitBoard((current) => ({ ...current, items: Object.fromEntries(Object.entries(current.items).map(([id, item]) => [id, patch[id] ? { ...item, ...patch[id] } : item])) as Record<Id, WhiteboardItem> }), 'whiteboard:align');
  };

  const updateEdge = (patch: Partial<WhiteboardEdge>) => {
    if (!selectedEdgeId) return;
    commitBoard((current) => { const edge = current.edges[selectedEdgeId]; if (!edge) return current; return { ...current, edges: { ...current.edges, [selectedEdgeId]: { ...edge, ...patch } } }; }, 'whiteboard:update-edge');
  };

  const createBoard = (name = 'Novo quadro', seed?: { items: Record<Id, WhiteboardItem>; edges: Record<Id, WhiteboardEdge>; layoutMode?: WhiteboardLayoutMode }) => {
    const id = makeId('whiteboard');
    const created: WhiteboardView = { id, serviceId: graph.service.id, name, items: seed?.items ?? {}, edges: seed?.edges ?? {}, layoutMode: seed?.layoutMode ?? 'free', gridVisible: true, snapToGrid: true };
    setGraph((current) => touchUpdatedAt({ ...current, views: { whiteboards: { ...current.views.whiteboards, [id]: created } } }), 'whiteboard:create-board');
    setActiveBoardId(id); setShowBoardMenu(false); setShowTemplates(false); clearSelection();
    showToast(`Quadro “${name}” criado.`);
  };

  const duplicateBoard = () => {
    if (!board) return;
    const id = makeId('whiteboard');
    const copy: WhiteboardView = { ...board, id, name: `${board.name} — cópia`, items: structuredClone(board.items), edges: structuredClone(board.edges) };
    setGraph((current) => touchUpdatedAt({ ...current, views: { whiteboards: { ...current.views.whiteboards, [id]: copy } } }), 'whiteboard:duplicate-board');
    setActiveBoardId(id); setShowBoardMenu(false); clearSelection(); showToast('Quadro duplicado.');
  };

  const deleteBoard = () => {
    if (!board) return;
    if (boardIds.length <= 1) { showToast('Mantenha pelo menos um quadro no serviço.'); return; }
    const fallback = boardIds.find((id) => id !== activeBoardId)!;
    setGraph((current) => { const next = { ...current.views.whiteboards }; delete next[activeBoardId]; return touchUpdatedAt({ ...current, views: { whiteboards: next } }); }, 'whiteboard:delete-board');
    setActiveBoardId(fallback); setShowBoardMenu(false); clearSelection(); showToast('Quadro excluído.');
  };

  const createTemplate = (kind: TemplateKind) => {
    if (kind === 'blueprint') {
      const laneItems = makeLaneFrames();
      const notes = [
        makeFree('Evidência principal', 'evidence', 'slate', 260, 145), makeFree('Ação do cliente', 'note', 'blue', 260, 445),
        makeFree('Ação visível', 'frontstage', 'emerald', 260, 745), makeFree('Ação de bastidor', 'backstage', 'amber', 260, 1045),
        makeFree('Processo operacional', 'process', 'blue', 260, 1345), makeFree('Sistema / recurso', 'system', 'violet', 260, 1645),
      ];
      const all = [...laneItems, ...notes]; createBoard('Blueprint — novo serviço', { items: Object.fromEntries(all.map((item) => [item.id, item])), edges: {}, layoutMode: 'blueprint' }); return;
    }
    if (kind === 'journey') {
      const temp: WhiteboardView = { id: 'temp', serviceId: graph.service.id, name: 'temp', items: {}, edges: {}, layoutMode: 'journey' };
      const filled = withJourneyObjects(temp); createBoard('Journey visual', { items: filled.items, edges: filled.edges, layoutMode: 'journey' }); return;
    }
    if (kind === 'flow') {
      const labels = ['Início', 'Contato', 'Atendimento', 'Execução', 'Entrega', 'Pós-serviço'];
      const flowItems = labels.map((label, index) => makeFree(label, 'process', index === 0 ? 'blue' : index === labels.length - 1 ? 'emerald' : 'slate', 180 + index * 390, 520, 260, 128));
      const flowEdges: WhiteboardEdge[] = flowItems.slice(0, -1).map((item, index) => ({ id: makeId('edge'), fromId: item.id, toId: flowItems[index + 1].id, label: '', style: 'solid', arrow: 'end' }));
      createBoard('Fluxo do serviço', { items: Object.fromEntries(flowItems.map((item) => [item.id, item])), edges: Object.fromEntries(flowEdges.map((edge) => [edge.id, edge])), layoutMode: 'flow' }); return;
    }
    const frames: WhiteboardItem[] = [
      { id: makeId('frame'), kind: 'free', shape: 'frame', semantic: 'frame', tone: 'rose', text: 'Problemas', x: 140, y: 180, width: 850, height: 620 },
      { id: makeId('frame'), kind: 'free', shape: 'frame', semantic: 'frame', tone: 'yellow', text: 'Insights', x: 1060, y: 180, width: 850, height: 620 },
      { id: makeId('frame'), kind: 'free', shape: 'frame', semantic: 'frame', tone: 'emerald', text: 'Oportunidades', x: 1980, y: 180, width: 850, height: 620 },
    ];
    const notes = [makeFree('Qual é a principal fricção?', 'note', 'rose', 220, 260), makeFree('O que aprendemos?', 'note', 'yellow', 1140, 260), makeFree('O que podemos melhorar?', 'note', 'emerald', 2060, 260)];
    const all = [...frames, ...notes]; createBoard('Descoberta e oportunidades', { items: Object.fromEntries(all.map((item) => [item.id, item])), edges: {}, layoutMode: 'free' });
  };

  const fitToContent = () => {
    const viewport = viewportRef.current; if (!viewport) return;
    const visibleItems = Object.values(items); if (!visibleItems.length) { setZoom(0.84); setPan({ x: 60, y: 56 }); return; }
    const minX = Math.min(...visibleItems.map((item) => item.x)); const minY = Math.min(...visibleItems.map((item) => item.y));
    const maxX = Math.max(...visibleItems.map((item) => item.x + item.width)); const maxY = Math.max(...visibleItems.map((item) => item.y + item.height));
    const width = Math.max(300, maxX - minX); const height = Math.max(220, maxY - minY); const padding = 90;
    const nextZoom = Math.max(0.28, Math.min(1.15, Math.min((viewport.clientWidth - padding * 2) / width, (viewport.clientHeight - padding * 2) / height)));
    setZoom(nextZoom); setPan({ x: (viewport.clientWidth - width * nextZoom) / 2 - minX * nextZoom, y: (viewport.clientHeight - height * nextZoom) / 2 - minY * nextZoom });
  };

  useEffect(() => {
    if (viewMode !== 'whiteboard') return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const command = event.ctrlKey || event.metaKey; const key = event.key.toLowerCase();
      if (command && key === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); return; }
      if (command && key === 'y') { event.preventDefault(); redo(); return; }
      if (command && key === 'a') { event.preventDefault(); setSelectedIds(Object.keys(items)); setSelectedEdgeId(null); return; }
      if (command && key === 'c' && selectedItems.length) { event.preventDefault(); setClipboard(selectedItems.map((item) => ({ ...item }))); showToast(`${selectedItems.length} ${selectedItems.length === 1 ? 'objeto copiado' : 'objetos copiados'}.`); return; }
      if (command && key === 'v' && clipboard.length) { event.preventDefault(); duplicateItems(clipboard); return; }
      if (command && key === 'd' && selectedItems.length) { event.preventDefault(); duplicateItems(); return; }
      if (command && key === 'g' && selectedItems.length > 1) { event.preventDefault(); groupSelection(); return; }
      if (command && event.shiftKey && key === 'g') { event.preventDefault(); ungroupSelection(); return; }
      if (key === 'delete' || key === 'backspace') { if (selectedIds.length || selectedEdgeId) { event.preventDefault(); removeSelection(); } return; }
      if (key === 'escape') { clearSelection(); setShowLibrary(false); setShowTemplates(false); setShowBoardMenu(false); setTool('select'); return; }
      if (key === 'v') setTool('select'); if (key === 'h') setTool('hand'); if (key === 'f') fitToContent();
    };
    window.addEventListener('keydown', onKeyDown); return () => window.removeEventListener('keydown', onKeyDown);
  });

  const renderItem = (item: WhiteboardItem) => {
    const preview = previewItems[item.id]; const effective = { ...item, ...preview } as WhiteboardItem; const selected = selectedIds.includes(item.id);
    const tone = itemTone(effective); const palette = toneClasses[tone]; const isFrame = effective.kind === 'free' && effective.shape === 'frame'; const isText = effective.kind === 'free' && effective.shape === 'text';
    const content = effective.kind === 'smart' ? smartContent(studio, effective) : { title: effective.text || semanticLabels[effective.semantic ?? 'note'], subtitle: effective.semantic ? semanticLabels[effective.semantic] : 'Objeto livre' };
    const objectKind = blueOceanKindForItem(effective);
    const objectMeta = BLUE_OCEAN_OBJECT_META[objectKind];
    const zIndex = isFrame ? 1 : selected ? 20 : 10;
    return (
      <div key={item.id} onPointerDown={(event) => beginMove(event, item.id)} onClick={(event) => selectItem(item.id, event)}
        className={`absolute select-none bo-h716-object-card ${isFrame ? 'rounded-2xl border-2 border-dashed bg-white/25' : `rounded-xl border shadow-sm ${palette.card} ${palette.border}`} ${selected ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${connectSourceId === item.id ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
        data-bo-object={objectKind}
        data-bo-object-family={objectMeta.family}
        data-bo-object-shape={objectMeta.shape}
        style={{ left: effective.x, top: effective.y, width: effective.width, height: effective.height, zIndex, cursor: tool === 'hand' ? 'grab' : 'move', '--bo-h716-accent': objectMeta.accent, '--bo-h716-surface': objectMeta.surface, '--bo-h716-ink': objectMeta.ink } as React.CSSProperties}>
        {isFrame ? <div className={`absolute -top-3 left-4 px-2 py-0.5 rounded-md bg-white border ${palette.border} text-xs font-bold ${palette.text}`}>{content.title || 'Frame'}</div> : (
          <div className="h-full p-3 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 min-w-0 bo-h716-object-head"><span className="bo-h716-object-icon"><BlueOceanObjectIcon kind={objectKind} size={17}/></span><span className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-500 truncate bo-h716-object-label">{effective.kind === 'smart' ? smartLabels[effective.objectKind] : semanticLabels[effective.semantic ?? 'note']}</span>{effective.groupId && <span className="ml-auto text-[11px] font-bold uppercase text-violet-600 bg-violet-100 rounded px-1.5 py-0.5">Grupo</span>}{effective.kind === 'smart' && !effective.groupId && <span className="ml-auto text-[11px] font-bold uppercase bo-h716-graph-chip">Graph</span>}</div>
            <div className={`mt-2 font-semibold leading-snug ${isText ? 'text-lg' : 'text-sm'} ${palette.text} overflow-hidden`}>{content.title || 'Sem título'}</div>
            {content.subtitle && !isText && <div className="mt-1 text-xs leading-snug text-slate-500 line-clamp-3 overflow-hidden">{content.subtitle}</div>}
          </div>
        )}
        {selected && selectedItems.length === 1 && <button type="button" aria-label="Redimensionar" onPointerDown={(event) => beginResize(event, effective)} className="absolute -right-2 -bottom-2 w-4 h-4 rounded-sm bg-blue-600 border-2 border-white shadow cursor-nwse-resize z-30" />}
      </div>
    );
  };

  const itemForEdge = (id: Id) => { const item = items[id]; return item ? { ...item, ...previewItems[id] } as WhiteboardItem : null; };

  const minimap = useMemo(() => {
    const width = 190; const height = 120; const scale = Math.min(width / BOARD_WIDTH, height / BOARD_HEIGHT);
    return { width, height, scale };
  }, []);

  if (!board) return <div className="flex-1 flex items-center justify-center bg-slate-50 p-8"><div className="max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-sm"><LayoutTemplate size={30} className="mx-auto text-blue-600" /><h3 className="mt-3 text-base font-bold text-slate-800">Nenhum Blueprint criado</h3><p className="mt-2 text-sm text-slate-500">Abra a biblioteca de Blueprints e escolha Em branco, A partir da Jornada ou Template. Nada é criado automaticamente.</p></div></div>;

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="h-14 shrink-0 px-3 border-b border-slate-200 bg-white flex items-center justify-between gap-3 z-40">
        <div className="flex items-center gap-2 min-w-0">
          <div className="inline-flex p-1 bg-slate-100 rounded-lg"><button type="button" onClick={() => setViewMode('whiteboard')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${viewMode === 'whiteboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Whiteboard</button><button type="button" onClick={() => setViewMode('structured')} className={`px-3 py-1.5 rounded-md text-xs font-semibold ${viewMode === 'structured' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Blueprint estruturado</button></div>
          {viewMode === 'whiteboard' && <div className="relative">
            <button type="button" onClick={() => setShowBoardMenu((value) => !value)} className="h-9 max-w-[230px] flex items-center gap-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"><MapIcon size={14} className="text-blue-600" /><span className="truncate">{board.name}</span><ChevronDown size={14} className="text-slate-400" /></button>
            {showBoardMenu && <div className="absolute top-11 left-0 w-72 rounded-xl border border-slate-200 bg-white shadow-xl p-2 z-50">
              <div className="px-2 py-1 text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400">Quadros deste serviço</div>
              <div className="max-h-52 overflow-y-auto">{boardIds.map((id) => <button key={id} type="button" onClick={() => { setActiveBoardId(id); setShowBoardMenu(false); clearSelection(); }} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${id === activeBoardId ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'}`}>{graph.views.whiteboards[id].name}</button>)}</div>
              <div className="mt-2 pt-2 border-t border-slate-100 grid grid-cols-3 gap-1"><button onClick={() => createBoard()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 flex justify-center" title="Novo quadro"><Plus size={16} /></button><button onClick={duplicateBoard} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 flex justify-center" title="Duplicar quadro"><CopyPlus size={16} /></button><button onClick={deleteBoard} className="p-2 rounded-lg hover:bg-rose-50 text-rose-500 flex justify-center" title="Excluir quadro"><Trash2 size={16} /></button></div>
            </div>}
          </div>}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={undo} className="tool-button" title="Desfazer (Ctrl+Z)"><Undo2 size={15} /></button><button type="button" onClick={redo} className="tool-button" title="Refazer (Ctrl+Y)"><Redo2 size={15} /></button>
          {viewMode === 'whiteboard' && <><button type="button" onClick={fitToContent} className="tool-button" title="Ajustar ao conteúdo (F)"><Maximize2 size={15} /></button><button type="button" onClick={() => setZoom((value) => Math.max(0.28, value - 0.1))} className="tool-button" title="Diminuir zoom"><ZoomOut size={15} /></button><span className="w-12 text-center text-xs font-semibold text-slate-500">{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.8, value + 0.1))} className="tool-button" title="Aumentar zoom"><ZoomIn size={15} /></button></>}
        </div>
      </div>

      {viewMode === 'structured' ? <StructuredBlueprint studio={studio} boardId={activeBoardId} /> : (
        <div className="flex-1 min-h-0 flex overflow-hidden">
          <aside className="w-[62px] shrink-0 border-r border-slate-200 bg-white py-3 flex flex-col items-center gap-2 z-30">
            <button type="button" onClick={() => setTool('select')} className={`w-10 h-10 rounded-lg flex items-center justify-center ${tool === 'select' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-100'}`} title="Selecionar (V)"><MousePointer2 size={18} /></button>
            <button type="button" onClick={() => setTool('hand')} className={`w-10 h-10 rounded-lg flex items-center justify-center ${tool === 'hand' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-100'}`} title="Mover quadro (H)"><Hand size={18} /></button>
            <div className="w-7 border-t border-slate-200 my-1" />
            <button type="button" onClick={() => addFreeItem('note', 'note', 'Novo post-it', 'yellow')} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-yellow-50 hover:text-yellow-700" title="Post-it"><StickyNote size={18} /></button>
            <button type="button" onClick={() => addFreeItem('text', 'note', 'Texto', 'slate')} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100" title="Texto"><Type size={18} /></button>
            <button type="button" onClick={() => addFreeItem('shape', 'process', 'Novo bloco', 'slate')} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100" title="Forma"><Shapes size={18} /></button>
            <button type="button" onClick={() => addFreeItem('frame', 'frame', 'Novo frame', 'slate')} className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100" title="Frame"><Frame size={18} /></button>
            <button type="button" onClick={() => setShowLibrary((value) => !value)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${showLibrary ? 'bg-violet-50 text-violet-700 border border-violet-200' : 'text-slate-500 hover:bg-slate-100'}`} title="Objetos do serviço"><Box size={18} /></button>
            <button type="button" onClick={() => setShowTemplates((value) => !value)} className={`w-10 h-10 rounded-lg flex items-center justify-center ${showTemplates ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'text-slate-500 hover:bg-slate-100'}`} title="Templates"><LayoutTemplate size={18} /></button>
            <button type="button" onClick={() => { if (selectedIds.length === 1) { setConnectSourceId(selectedIds[0]); setSelectedEdgeId(null); showToast('Agora clique no objeto de destino.'); } else showToast('Selecione um objeto para iniciar a conexão.'); }} className={`w-10 h-10 rounded-lg flex items-center justify-center ${connectSourceId ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-slate-500 hover:bg-slate-100'}`} title="Conectar objetos"><Link2 size={18} /></button>
          </aside>

          {showLibrary && <aside className="w-72 shrink-0 border-r border-slate-200 bg-white z-20 overflow-y-auto">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between"><div><h3 className="font-bold text-slate-800 text-sm">Biblioteca</h3><p className="text-xs text-slate-500 mt-0.5">Objetos livres e do Service Graph</p></div><button type="button" onClick={() => setShowLibrary(false)} className="p-1.5 rounded hover:bg-slate-100 text-slate-400"><X size={16} /></button></div>
            <div className="p-3"><div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 px-1 mb-2">Blueprint</div><div className="grid grid-cols-2 gap-2 mb-5">{([['Evidência', 'evidence', 'slate'], ['Frontstage', 'frontstage', 'emerald'], ['Backstage', 'backstage', 'amber'], ['Processo', 'process', 'blue'], ['Sistema', 'system', 'violet'], ['Post-it', 'note', 'yellow']] as Array<[string, WhiteboardSemantic, WhiteboardTone]>).map(([label, semantic, tone]) => <button key={semantic} type="button" onClick={() => addFreeItem('note', semantic, label, tone)} className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition"><span className="bo-h716-library-icon"><BlueOceanObjectIcon kind={semantic === 'evidence' ? 'evidence' : semantic === 'frontstage' ? 'frontstage' : semantic === 'backstage' ? 'backstage' : semantic === 'process' ? 'process' : semantic === 'system' ? 'system' : 'note'} size={16}/></span><span className="text-xs font-semibold text-slate-700">{label}</span></button>)}</div>
              <div className="flex items-center justify-between mb-2"><div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 px-1">Service Graph</div><button type="button" onClick={addJourneyObjects} className="text-[11px] font-bold text-blue-600 hover:text-blue-800">Adicionar Jornada</button></div>
              <div className="space-y-1.5">{studio.orderedStages.map((stage) => <button key={stage.id} type="button" onClick={() => addSmartItem('stage', stage.id)} className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200"><div className="bo-h716-library-object-row"><BlueOceanObjectIcon kind="stage" size={15}/><span className="text-[11px] font-bold uppercase">Etapa</span></div><div className="text-xs font-semibold text-slate-700 truncate">{stage.title}</div></button>)}{Object.values(graph.touchpoints).map((point) => <button key={point.id} type="button" onClick={() => addSmartItem('touchpoint', point.id)} className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-violet-50 hover:border-violet-200"><div className="bo-h716-library-object-row"><BlueOceanObjectIcon kind="touchpoint" size={15}/><span className="text-[11px] font-bold uppercase">Touchpoint</span></div><div className="text-xs font-semibold text-slate-700 truncate">{point.name}</div></button>)}{Object.values(graph.problems).map((problem) => <button key={problem.id} type="button" onClick={() => addSmartItem('problem', problem.id)} className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-rose-50 hover:border-rose-200"><div className="bo-h716-library-object-row"><BlueOceanObjectIcon kind="problem" size={15}/><span className="text-[11px] font-bold uppercase">Problema</span></div><div className="text-xs font-semibold text-slate-700 line-clamp-2">{problem.description}</div></button>)}{Object.values(graph.opportunities).map((opportunity) => <button key={opportunity.id} type="button" onClick={() => addSmartItem('opportunity', opportunity.id)} className="w-full text-left px-3 py-2 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200"><div className="bo-h716-library-object-row"><BlueOceanObjectIcon kind="opportunity" size={15}/><span className="text-[11px] font-bold uppercase">Oportunidade</span></div><div className="text-xs font-semibold text-slate-700 line-clamp-2">{opportunity.title}</div></button>)}</div>
            </div>
          </aside>}

          <div ref={viewportRef} className={`relative flex-1 min-w-0 overflow-hidden bg-slate-50 ${tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            style={gridVisible ? { backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: `${GRID_SIZE * zoom}px ${GRID_SIZE * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` } : undefined}
            onPointerDown={(event) => { beginPan(event); if (tool === 'select' && event.target === event.currentTarget) clearSelection(); }} onPointerMove={handlePointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} onContextMenu={(event) => { if (tool === 'hand') event.preventDefault(); }}>

            <div className="absolute top-3 left-3 z-30 flex items-center gap-1 bg-white/95 backdrop-blur border border-slate-200 shadow-sm rounded-xl p-1">
              {(Object.keys(layoutLabels) as WhiteboardLayoutMode[]).map((mode) => <button key={mode} type="button" onClick={() => applyLayout(mode)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 ${layoutMode === mode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{mode === 'free' ? <MousePointer2 size={13} /> : mode === 'blueprint' ? <Layers3 size={13} /> : mode === 'flow' ? <GitBranch size={13} /> : <Route size={13} />}{layoutLabels[mode]}</button>)}
            </div>

            {showTemplates && <div className="absolute top-14 left-3 z-40 w-[430px] bg-white border border-slate-200 shadow-xl rounded-2xl p-4"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-800 text-sm">Templates de quadro</h3><p className="text-xs text-slate-500 mt-0.5">Cada template cria um novo quadro sem alterar o atual.</p></div><button onClick={() => setShowTemplates(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button></div><div className="grid grid-cols-2 gap-2 mt-4">{([['blueprint', 'Service Blueprint', 'Faixas clássicas + cards iniciais'], ['journey', 'Journey visual', 'Etapas e objetos reais da Jornada'], ['flow', 'Fluxo de serviço', 'Sequência operacional conectada'], ['discovery', 'Descoberta', 'Problemas → insights → oportunidades']] as Array<[TemplateKind, string, string]>).map(([kind, title, description]) => <button key={kind} onClick={() => createTemplate(kind)} className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50"><div className="text-xs font-bold text-slate-800">{title}</div><div className="text-[11px] text-slate-500 mt-1 leading-snug">{description}</div></button>)}</div></div>}

            <div data-canvas-background="true" className="absolute origin-top-left" style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }} onPointerDown={(event) => { if (event.target === event.currentTarget && tool === 'select') clearSelection(); }}>
              <svg className="absolute inset-0 z-[5] overflow-visible" width={BOARD_WIDTH} height={BOARD_HEIGHT} style={{ pointerEvents: 'none' }}><defs><marker id="arrow-end" markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto"><path d="M0,0 L0,7 L8,3.5 z" fill="#64748b" /></marker><marker id="arrow-start" markerWidth="9" markerHeight="9" refX="1" refY="3.5" orient="auto-start-reverse"><path d="M0,0 L0,7 L8,3.5 z" fill="#64748b" /></marker></defs>{Object.values(edges).map((edge) => { const from = itemForEdge(edge.fromId); const to = itemForEdge(edge.toId); if (!from || !to) return null; const x1 = from.x + from.width / 2; const y1 = from.y + from.height / 2; const x2 = to.x + to.width / 2; const y2 = to.y + to.height / 2; const bend = Math.max(70, Math.abs(x2 - x1) * 0.45); const path = `M ${x1} ${y1} C ${x1 + (x2 >= x1 ? bend : -bend)} ${y1}, ${x2 - (x2 >= x1 ? bend : -bend)} ${y2}, ${x2} ${y2}`; const selected = selectedEdgeId === edge.id; const relationKind = relationKindFromLabel(edge.label); const relationMeta = BLUE_OCEAN_RELATION_META[relationKind]; return <g key={edge.id} data-bo-relation={relationKind} style={{ pointerEvents: 'stroke' }} onPointerDown={(event) => { event.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedIds([]); setConnectSourceId(null); }}><path d={path} fill="none" stroke="transparent" strokeWidth="16" /><path d={path} fill="none" stroke={selected ? '#2563eb' : relationMeta.stroke} strokeWidth={selected ? 3 : 2.2} strokeLinecap="round" strokeDasharray={edge.style === 'dashed' ? (relationMeta.dash ?? '8 7') : relationMeta.dash} markerEnd={edge.arrow === 'end' || edge.arrow === 'both' ? 'url(#arrow-end)' : undefined} markerStart={edge.arrow === 'both' ? 'url(#arrow-start)' : undefined} />{edge.label && <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 8} textAnchor="middle" fontSize="12" fontWeight="600" fill="#475569" stroke="white" strokeWidth="4" paintOrder="stroke">{edge.label}</text>}</g>; })}</svg>
              {Object.values(items).filter((item) => item.kind === 'free' && item.shape === 'frame').map(renderItem)}{Object.values(items).filter((item) => !(item.kind === 'free' && item.shape === 'frame')).map(renderItem)}
            </div>

            {!Object.keys(items).length && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="pointer-events-auto w-[460px] bg-white border border-slate-200 shadow-xl rounded-2xl p-6 text-center"><div className="w-12 h-12 mx-auto rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Workflow size={24} /></div><h3 className="mt-4 text-lg font-bold text-slate-800">Comece pelo formato que faz sentido</h3><p className="mt-2 text-sm text-slate-500">O mesmo serviço pode ter vários quadros. Comece livremente, use um template ou traga os objetos reais da Jornada.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setShowTemplates(true)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700">Escolher template</button><button type="button" onClick={addJourneyObjects} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50">Trazer Jornada</button><button type="button" onClick={() => addFreeItem('note', 'note', 'Primeira ideia', 'yellow')} className="px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50">Em branco</button></div></div></div>}

            {connectSourceId && <div className="absolute top-3 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-full shadow-lg px-4 py-2 text-xs font-semibold flex items-center gap-2"><Link2 size={14} /> Clique no objeto de destino <button onClick={() => setConnectSourceId(null)} className="ml-1 text-slate-300 hover:text-white"><X size={14} /></button></div>}

            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-xl p-1"><button type="button" onClick={() => commitBoard((current) => ({ ...current, gridVisible: !gridVisible }), 'whiteboard:grid')} className={`p-2 rounded-lg ${gridVisible ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Mostrar grade"><Grid3X3 size={15} /></button><button type="button" onClick={() => commitBoard((current) => ({ ...current, snapToGrid: !snapToGrid }), 'whiteboard:snap')} className={`p-2 rounded-lg ${snapToGrid ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Snap na grade"><Magnet size={15} /></button><button type="button" onClick={() => setShowMinimap((value) => !value)} className={`p-2 rounded-lg ${showMinimap ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`} title="Minimapa"><MapIcon size={15} /></button></div>

            {showMinimap && <div className="absolute right-3 bottom-3 z-30 bg-white/95 border border-slate-200 shadow-lg rounded-xl p-2" style={{ width: minimap.width + 16 }}><div className="flex items-center justify-between mb-1 px-1"><span className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400">Minimapa</span><span className="text-[11px] text-slate-400">{Object.keys(items).length} objetos</span></div><div className="relative bg-slate-100 rounded-lg overflow-hidden" style={{ width: minimap.width, height: minimap.height }} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); const boardX = (event.clientX - rect.left) / minimap.scale; const boardY = (event.clientY - rect.top) / minimap.scale; const viewport = viewportRef.current; if (!viewport) return; setPan({ x: viewport.clientWidth / 2 - boardX * zoom, y: viewport.clientHeight / 2 - boardY * zoom }); }}>{Object.values(items).map((item) => <span key={item.id} className={`absolute rounded-sm ${toneClasses[itemTone(item)].dot} opacity-75`} style={{ left: item.x * minimap.scale, top: item.y * minimap.scale, width: Math.max(2, item.width * minimap.scale), height: Math.max(2, item.height * minimap.scale) }} />)}<span className="absolute border border-blue-600 bg-blue-500/10 pointer-events-none" style={{ left: Math.max(0, -pan.x / zoom * minimap.scale), top: Math.max(0, -pan.y / zoom * minimap.scale), width: Math.min(minimap.width, (viewportRef.current?.clientWidth ?? 0) / zoom * minimap.scale), height: Math.min(minimap.height, (viewportRef.current?.clientHeight ?? 0) / zoom * minimap.scale) }} /></div></div>}
          </div>

          <aside className="w-72 shrink-0 border-l border-slate-200 bg-white overflow-y-auto z-30">
            <div className="p-4 border-b border-slate-100"><h3 className="text-sm font-bold text-slate-800">{selectedEdge ? 'Conexão' : selectedItems.length ? `${selectedItems.length} objeto${selectedItems.length > 1 ? 's' : ''}` : 'Configurações do quadro'}</h3><p className="text-xs text-slate-500 mt-0.5">{selectedEdge ? 'Estilo e direção da relação.' : selectedItems.length ? 'Edite a seleção sem sair do canvas.' : 'Visualização, organização e conteúdo.'}</p></div>
            {selectedEdge ? <div className="p-4 space-y-4"><label className="block"><span className="text-xs font-semibold text-slate-600">Legenda</span><input value={selectedEdge.label} onChange={(event) => updateEdge({ label: event.target.value })} className="mt-1.5 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" placeholder="Ex.: depende de" /></label><div className="bo-h716-relation-presets"><span>Relação rápida</span><div>{relationPresetOrder.map((kind) => { const meta = BLUE_OCEAN_RELATION_META[kind]; return <button key={kind} type="button" data-relation={kind} onClick={() => updateEdge({ label: meta.label, style: kind === 'supports' ? 'solid' : 'dashed' })}>{meta.label}</button>; })}</div></div><label className="block"><span className="text-xs font-semibold text-slate-600">Linha</span><select value={selectedEdge.style} onChange={(event) => updateEdge({ style: event.target.value as WhiteboardEdge['style'] })} className="mt-1.5 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"><option value="solid">Contínua</option><option value="dashed">Tracejada</option></select></label><label className="block"><span className="text-xs font-semibold text-slate-600">Seta</span><select value={selectedEdge.arrow} onChange={(event) => updateEdge({ arrow: event.target.value as WhiteboardEdge['arrow'] })} className="mt-1.5 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"><option value="end">Destino</option><option value="both">Duas pontas</option><option value="none">Sem seta</option></select></label><button type="button" onClick={removeSelection} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50"><Trash2 size={14} /> Excluir conexão</button></div> : selectedItem ? <div className="p-4 space-y-4"><div className="rounded-lg bg-slate-50 border border-slate-200 p-3"><div className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400">Tipo</div><div className="bo-h716-inspector-type"><BlueOceanObjectIcon kind={blueOceanKindForItem(selectedItem)} size={18}/><span>{selectedItem.kind === 'smart' ? smartLabels[selectedItem.objectKind] : semanticLabels[selectedItem.semantic ?? 'note']}</span></div>{selectedItem.kind === 'smart' && <div className="text-[11px] text-blue-600 font-bold mt-1">Vinculado ao Service Graph</div>}{selectedItem.groupId && <div className="text-[11px] text-violet-600 font-bold mt-1">Pertence a um grupo</div>}</div>{selectedItem.kind === 'free' && <label className="block"><span className="text-xs font-semibold text-slate-600">Conteúdo</span><textarea value={selectedItem.text} onChange={(event) => updateItem(selectedItem.id, { text: event.target.value })} className="mt-1.5 w-full h-24 border border-slate-300 rounded-lg px-3 py-2 text-sm resize-none" /></label>}{selectedItem.kind === 'smart' && <div className="text-xs text-slate-500 leading-relaxed">{smartContent(studio, selectedItem).title}<button type="button" onClick={() => studio.setActiveTab('journey')} className="mt-2 w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50">Abrir na Jornada</button></div>}<div><span className="text-xs font-semibold text-slate-600">Cor</span><div className="mt-2 flex flex-wrap gap-2">{(Object.keys(toneClasses) as WhiteboardTone[]).map((tone) => <button key={tone} type="button" onClick={() => updateItem(selectedItem.id, { tone })} className={`w-7 h-7 rounded-full border-2 ${toneClasses[tone].dot} ${itemTone(selectedItem) === tone ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'}`} aria-label={`Cor ${tone}`} />)}</div></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => duplicateItems()} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"><Copy size={14} /> Duplicar</button><button type="button" onClick={removeSelection} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold hover:bg-rose-50"><Trash2 size={14} /> Excluir</button></div>{selectedItem.groupId && <button type="button" onClick={ungroupSelection} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-violet-200 text-violet-700 text-xs font-semibold hover:bg-violet-50"><Ungroup size={14} /> Desagrupar</button>}</div> : selectedItems.length > 1 ? <div className="p-4 space-y-4"><div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">Seleção múltipla ativa. Mova, alinhe, distribua ou transforme os objetos em um grupo.</div><div className="grid grid-cols-3 gap-2"><button type="button" onClick={() => alignSelection('left')} className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex justify-center" title="Alinhar à esquerda"><AlignLeft size={16} /></button><button type="button" onClick={() => alignSelection('top')} className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex justify-center" title="Alinhar ao topo"><AlignStartVertical size={16} /></button><button type="button" onClick={() => alignSelection('distribute')} className="p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex justify-center" title="Distribuir horizontalmente"><AlignHorizontalSpaceAround size={16} /></button></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={groupSelection} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-violet-200 text-violet-700 text-xs font-semibold hover:bg-violet-50"><Group size={14} /> Agrupar</button><button type="button" onClick={ungroupSelection} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"><Ungroup size={14} /> Desagrupar</button></div><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => duplicateItems()} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"><Copy size={14} /> Duplicar</button><button type="button" onClick={removeSelection} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 text-rose-600 text-xs font-semibold"><Trash2 size={14} /> Excluir</button></div></div> : <div className="p-4 space-y-5"><label className="block"><span className="text-xs font-semibold text-slate-600">Nome do quadro</span><input value={board.name} onChange={(event) => commitBoard((current) => ({ ...current, name: event.target.value }), 'whiteboard:rename')} className="mt-1.5 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" /></label><div className="rounded-xl border border-slate-200 p-3"><div className="text-[11px] uppercase tracking-[0.12em] font-bold text-slate-400">Layout atual</div><div className="text-sm font-bold text-slate-700 mt-1">{layoutLabels[layoutMode]}</div><div className="text-[11px] text-slate-500 mt-1">Troque o layout no controle flutuante do canvas. Os objetos continuam sendo os mesmos.</div></div><div className="space-y-2"><div className="flex items-center justify-between"><div><div className="text-xs font-semibold text-slate-700">Grade visual</div><div className="text-[11px] text-slate-400">Pontos de referência no canvas</div></div><button type="button" onClick={() => commitBoard((current) => ({ ...current, gridVisible: !gridVisible }), 'whiteboard:grid')} className={`w-10 h-6 rounded-full p-0.5 transition ${gridVisible ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${gridVisible ? 'translate-x-4' : ''}`} /></button></div><div className="flex items-center justify-between"><div><div className="text-xs font-semibold text-slate-700">Snap na grade</div><div className="text-[11px] text-slate-400">Alinha objetos automaticamente</div></div><button type="button" onClick={() => commitBoard((current) => ({ ...current, snapToGrid: !snapToGrid }), 'whiteboard:snap')} className={`w-10 h-6 rounded-full p-0.5 transition ${snapToGrid ? 'bg-blue-600' : 'bg-slate-300'}`}><span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${snapToGrid ? 'translate-x-4' : ''}`} /></button></div></div><div className="space-y-2"><button type="button" onClick={addJourneyObjects} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"><Layers3 size={15} /> Trazer objetos da Jornada</button><button type="button" onClick={addBlueprintFrames} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"><Frame size={15} /> Criar faixas de Blueprint</button><button type="button" onClick={() => setShowTemplates(true)} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"><LayoutTemplate size={15} /> Novo quadro por template</button></div><div className="rounded-xl bg-slate-50 border border-slate-200 p-3"><div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Atalhos</div><div className="mt-2 space-y-1.5 text-[11px] text-slate-500"><div className="flex justify-between"><span>Selecionar / mão</span><b>V / H</b></div><div className="flex justify-between"><span>Ajustar conteúdo</span><b>F</b></div><div className="flex justify-between"><span>Agrupar</span><b>Ctrl+G</b></div><div className="flex justify-between"><span>Copiar / colar</span><b>Ctrl+C / V</b></div><div className="flex justify-between"><span>Duplicar</span><b>Ctrl+D</b></div><div className="flex justify-between"><span>Desfazer / refazer</span><b>Ctrl+Z / Y</b></div></div></div></div>}
          </aside>
        </div>
      )}
    </div>
  );
}

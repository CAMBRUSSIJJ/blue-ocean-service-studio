import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import type { Id, ActiveTab, ServiceGraph, Stage, Touchpoint, Problem, Opportunity, Task, StageDraft, BlueprintDraft, StageBundle, Emotion, TaskStatus, JourneyRow, Journey } from '../domain/model';
import { makeId, normalizeName, parseList, nowIso, snapshotStage, pasteStageBundles, deleteStageFromGraph, createServiceGraph, createDemoGraph, createBlankWorkspaceGraph, isWorkspaceEmpty } from '../domain/graph-operations';
import { BrowserLocalGraphRepository } from '../repositories/local-graph-repository';
import { commitHistory, initialHistory, redoHistory, undoHistory } from './history';
import { describeImportError } from '../domain/migrations';
import { dataBridge, runtimeApi } from '../runtime/client';
import { setJourneyStageContextLink, updateJourneyStageExperience } from '../services/journey-map-studio';
import type { JourneyContextKind } from '../services/journey-map-studio';
import { assignTouchpointChannel, assignTouchpointChannelByName } from '../services/channel-continuity';
import { activeProjectId as resolveActiveProjectId, deleteProject, listArchivedProjects, listProjects, loadProjectSnapshot, markProjectOpened, renameProject, saveProjectSnapshot, setProjectArchived, toggleProjectFavorite } from '../services/project-library';
import type { ProjectTemplate } from '../services/project-library';

const repository = new BrowserLocalGraphRepository();
type CollaborationPermissionApi = { can?(action: string): boolean; currentRole?(): string };


export function useStudioController() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [toast, setToast] = useState({ show: false, message: '' });
  const [loaded] = useState(() => repository.load());
  const [history, setHistory] = useState(() => initialHistory(loaded.graph));
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');
  const [projectLibraryRevision, setProjectLibraryRevision] = useState(0);
  const graph = history.present;
  const graphRef = useRef(graph);
  const autosaveReadyRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveWatchdogRef = useRef<number | null>(null);
  const setGraph = (updater: (current: ServiceGraph) => ServiceGraph, tag?: string) => {
    const permission = runtimeApi<CollaborationPermissionApi>('collaboration');
    if (permission?.can && !permission.can('edit')) { showToast(`Modo ${permission.currentRole?.() || 'somente leitura'}: este papel não pode alterar o serviço.`); return; }
    const bridge = dataBridge();
    if (bridge) { try { const next = bridge.transact(updater, tag || 'Editar projeto'); setHistory(initialHistory(next)); } catch (error) { showToast(String(error)); } }
    else setHistory((current) => commitHistory(current, updater, tag));
  };
  const undo = () => { const bridge = dataBridge(); return bridge ? bridge.undo() : setHistory(undoHistory); };
  const redo = () => { const bridge = dataBridge(); return bridge ? bridge.redo() : setHistory(redoHistory); };
  const [selectedStageIds, setSelectedStageIds] = useState<Id[]>([]);
  const selectedStageId = selectedStageIds.length === 1 ? selectedStageIds[0] : null;
  const setSelectedStageId = (id: Id | null) => setSelectedStageIds(id ? [id] : []);
  const [selectionAnchorId, setSelectionAnchorId] = useState<Id | null>(null);
  const [clipboard, setClipboard] = useState<StageBundle[]>([]);
  const [focusedStageId, setFocusedStageId] = useState<Id | null>(null);
  const [zoom, setZoom] = useState(100);
  const [stageWidth, setStageWidth] = useState(328);
  const [collapsedRows, setCollapsedRows] = useState<JourneyRow[]>([]);
  const [showRowControls, setShowRowControls] = useState(false);
  const [detailMode, setDetailMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isCreateStageOpen, setIsCreateStageOpen] = useState(false);
  const [stageDraft, setStageDraft] = useState<StageDraft>({
    title: '',
    customerAction: '',
    touchpoints: '',
  });
  const [newTouchpointName, setNewTouchpointName] = useState('');
  const [newProblemText, setNewProblemText] = useState('');
  const [newOpportunityText, setNewOpportunityText] = useState('');
  const journeyId = dataBridge()?.currentJourneyId() || graph.service.journeyIds[0] || '';
  const journey: Journey = graph.journeys[journeyId] ?? { id: '', serviceId: graph.service.id, name: '', stageIds: [] };
  const hasService = !isWorkspaceEmpty(graph);
  const projects = useMemo(() => listProjects(graph), [graph.service.id, graph.service.updatedAt, projectLibraryRevision]);
  const archivedProjects = useMemo(() => listArchivedProjects(), [projectLibraryRevision]);
  const activeProjectId = resolveActiveProjectId(graph);

  const orderedStages = useMemo(
    () => journey.stageIds.map((stageId) => graph.stages[stageId]).filter(Boolean),
    [journey.stageIds, graph.stages],
  );

  const selectedStage = selectedStageId ? graph.stages[selectedStageId] : undefined;
  const selectedCount = selectedStageIds.filter((id) => Boolean(graph.stages[id])).length;
  const visibleStages = focusedStageId ? orderedStages.filter((stage) => stage.id === focusedStageId) : orderedStages;

  const selectStage = (stageId: Id, event?: React.MouseEvent) => {
    if (event?.shiftKey && selectionAnchorId) {
      const start = journey.stageIds.indexOf(selectionAnchorId);
      const end = journey.stageIds.indexOf(stageId);
      if (start >= 0 && end >= 0) {
        setSelectedStageIds(journey.stageIds.slice(Math.min(start, end), Math.max(start, end) + 1));
        return;
      }
    }
    if (event?.metaKey || event?.ctrlKey) {
      setSelectedStageIds((ids) => ids.includes(stageId) ? ids.filter((id) => id !== stageId) : [...ids, stageId]);
    } else {
      setSelectedStageIds([stageId]);
    }
    setSelectionAnchorId(stageId);
  };

  const copySelected = () => {
    const ids = journey.stageIds.filter((id) => selectedStageIds.includes(id));
    if (!ids.length) return;
    setClipboard(ids.map((id) => snapshotStage(graph, graph.stages[id])));
    showToast(`${ids.length} ${ids.length === 1 ? 'etapa copiada' : 'etapas copiadas'} dentro do editor.`);
  };

  const insertBundles = (bundles: StageBundle[]) => {
    if (!bundles.length) return;
    const afterId = journey.stageIds.filter((id) => selectedStageIds.includes(id)).at(-1);
    const result = pasteStageBundles(graph, bundles, afterId, journeyId);
    setGraph(() => result.graph);
    setSelectedStageIds(result.newIds);
    setSelectionAnchorId(result.newIds.at(-1) ?? null);
    setFocusedStageId(null);
    showToast(`${result.newIds.length} ${result.newIds.length === 1 ? 'etapa criada' : 'etapas criadas'}.`);
  };

  const duplicateSelected = () => {
    const ids = journey.stageIds.filter((id) => selectedStageIds.includes(id));
    insertBundles(ids.map((id) => snapshotStage(graph, graph.stages[id])));
  };

  const removeSelected = () => {
    const ids = journey.stageIds.filter((id) => selectedStageIds.includes(id));
    if (!ids.length) return;
    setGraph((current) => ids.reduce((next, id) => deleteStageFromGraph(next, id), current));
    setSelectedStageIds([]);
    setFocusedStageId(null);
    showToast(`${ids.length} ${ids.length === 1 ? 'etapa removida' : 'etapas removidas'}. Use Desfazer para recuperar.`);
  };

  const toggleRow = (row: JourneyRow) => setCollapsedRows((current) =>
    current.includes(row) ? current.filter((item) => item !== row) : [...current, row],
  );
  const rowVisible = (row: JourneyRow) => !collapsedRows.includes(row);

  const focusSelected = () => {
    if (focusedStageId) { setFocusedStageId(null); return; }
    if (selectedStageId) { setFocusedStageId(selectedStageId); scrollRef.current?.scrollTo?.({ left: 0, behavior: 'smooth' }); }
  };

  const journeyActionSummary = useMemo(
    () =>
      orderedStages
        .filter((stage) => stage.customerAction.trim())
        .map((stage) => `${stage.title}: ${stage.customerAction}`)
        .join('\n'),
    [orderedStages],
  );

  const showToast = (message: string) => {
    setToast({ show: true, message });
    window.setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const persistGraph = (candidate = graphRef.current, quiet = true) => {
    try {
      const bridge = dataBridge();
      if (bridge) { if (!bridge.save()) throw new Error('Falha ao salvar'); } else repository.save(candidate);
      saveProjectSnapshot(candidate);
      setProjectLibraryRevision((value) => value + 1);
      setSaveStatus('saved');
      if (autosaveWatchdogRef.current !== null) { window.clearTimeout(autosaveWatchdogRef.current); autosaveWatchdogRef.current = null; }
      if (!quiet) showToast('Projeto salvo neste navegador.');
      return true;
    } catch {
      setSaveStatus('error');
      if (!quiet) showToast('Não foi possível salvar o projeto.');
      return false;
    }
  };

  useEffect(() => {
    graphRef.current = graph;
    // Runtime transactions have already saved before publishing rt-graph-changed.
    // Save only the library snapshot here; saving the bridge again emits another
    // graph event and starts an endless autosave cycle.
    if (dataBridge()) {
      try { saveProjectSnapshot(graph); setSaveStatus('saved'); }
      catch { setSaveStatus('error'); }
      return;
    }
    if (!autosaveReadyRef.current) { autosaveReadyRef.current = true; return; }
    setSaveStatus('saving');
    if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = window.setTimeout(() => { persistGraph(graphRef.current, true); autosaveTimerRef.current = null; }, 900);
    if (autosaveWatchdogRef.current === null) autosaveWatchdogRef.current = window.setTimeout(() => {
      autosaveWatchdogRef.current = null;
      if (autosaveTimerRef.current !== null) { window.clearTimeout(autosaveTimerRef.current); autosaveTimerRef.current = null; }
      persistGraph(graphRef.current, true);
    }, 5000);
    return () => { if (autosaveTimerRef.current !== null) window.clearTimeout(autosaveTimerRef.current); };
  }, [graph]);

  useEffect(() => {
    const flush = () => { if (autosaveTimerRef.current !== null) { window.clearTimeout(autosaveTimerRef.current); autosaveTimerRef.current = null; } persistGraph(graphRef.current, true); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => { window.removeEventListener('pagehide', flush); window.removeEventListener('beforeunload', flush); document.removeEventListener('visibilitychange', onVisibility); if (autosaveWatchdogRef.current !== null) window.clearTimeout(autosaveWatchdogRef.current); };
  }, []);

  useEffect(() => {
    const navigate = (event: Event) => setActiveTab((event as CustomEvent<ActiveTab>).detail);
    const changed = (event: Event) => { setHistory(initialHistory((event as CustomEvent<ServiceGraph>).detail)); setSaveStatus('saved'); };
    const notice = (event: Event) => showToast((event as CustomEvent<string>).detail);
    const failed = (event: Event) => { setSaveStatus('error'); showToast((event as CustomEvent<string>).detail); };
    const focusGlobalObject = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string; stageId?: string }>).detail || {};
      if (detail.kind === 'task') { setActiveTab('action'); return; }
      if (detail.stageId) {
        setActiveTab('journey'); setSelectedStageIds([detail.stageId]); setSelectionAnchorId(detail.stageId); setFocusedStageId(null);
      }
    };
    window.addEventListener('rt-navigation', navigate); window.addEventListener('rt-graph-changed', changed); window.addEventListener('rt-data-error', failed); window.addEventListener('rt-data-notice', notice); window.addEventListener('bo-global-object-focus', focusGlobalObject);
    const bridge = dataBridge(); if (bridge) setHistory(initialHistory(bridge.get()));
    return () => { window.removeEventListener('rt-navigation', navigate); window.removeEventListener('rt-graph-changed', changed); window.removeEventListener('rt-data-error', failed); window.removeEventListener('rt-data-notice', notice); window.removeEventListener('bo-global-object-focus', focusGlobalObject); };
  }, []);

  useEffect(() => {
    if (loaded.warning) showToast(loaded.warning);
  }, []);

  const touchUpdatedAt = (next: ServiceGraph): ServiceGraph => ({
    ...next,
    service: {
      ...next.service,
      updatedAt: nowIso(),
    },
  });

  const replaceProjectGraph = (nextGraph: ServiceGraph, label = 'Abrir projeto') => {
    const bridge = dataBridge();
    try {
      saveProjectSnapshot(graphRef.current);
      const applied = bridge ? bridge.transact(() => nextGraph, label) : nextGraph;
      if (!bridge) repository.save(applied);
      setHistory(initialHistory(applied));
      graphRef.current = applied;
      saveProjectSnapshot(applied);
      setProjectLibraryRevision((value) => value + 1);
      setSelectedStageIds([]); setFocusedStageId(null); setSelectionAnchorId(null);
      setActiveTab('canvas');
      setSaveStatus('saved');
      return true;
    } catch (error) {
      showToast(`Não foi possível abrir o projeto: ${String(error)}`);
      return false;
    }
  };

  const openWorkspaceProject = (projectId: Id) => {
    const snapshot = loadProjectSnapshot(projectId);
    if (!snapshot) { showToast('O projeto não possui um snapshot local disponível.'); return false; }
    markProjectOpened(projectId);
    const opened = replaceProjectGraph(snapshot, 'Trocar projeto');
    if (opened) showToast('Projeto aberto.');
    return opened;
  };

  const createWorkspaceProject = (input: { projectName: string; serviceName: string; description?: string; template?: ProjectTemplate }) => {
    const projectName = input.projectName.trim();
    if (!projectName) { showToast('Informe um nome para o projeto.'); return false; }
    const template = input.template ?? 'blank';
    const serviceName = input.serviceName.trim() || projectName;
    const nextGraph = template === 'demo' ? createDemoGraph() : createServiceGraph(serviceName, input.description ?? '');
    // Starter templates must generate editable structures, not just label an empty project.
    // No factual customer actions, channels or research evidence are invented here.
    if (template === 'redesign' || template === 'blueprint' || template === 'omnichannel') {
      const now = nowIso();
      const addJourney = (title: string, steps: string[]) => {
        const id = makeId('journey');
        const stageIds = steps.map((step) => {
          const stageId = makeId('stage');
          nextGraph.stages[stageId] = {
            id: stageId, journeyId: id, title: step, customerAction: '',
            emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [],
            needIds: [], evidenceIds: [], validatedProblemIds: [],
          };
          return stageId;
        });
        nextGraph.journeys[id] = {
          id, serviceId: nextGraph.service.id, name: title,
          stageIds, status: 'draft', createdAt: now, updatedAt: now,
        };
        nextGraph.service.journeyIds.push(id);
        return id;
      };
      if (template === 'redesign') {
        addJourney('Jornada atual · mapear', ['Antes do serviço', 'Durante o serviço', 'Após o serviço']);
        addJourney('Jornada futura · projetar', ['Antes do serviço', 'Durante o serviço', 'Após o serviço']);
      } else if (template === 'omnichannel') {
        addJourney('Jornada omnichannel', ['Descoberta', 'Primeiro contato', 'Troca de canal', 'Continuidade', 'Conclusão']);
      } else {
        const journeyId = addJourney('Jornada base do Blueprint', ['Antes do serviço', 'Durante o serviço', 'Após o serviço']);
        const boardId = makeId('blueprint');
        nextGraph.views.whiteboards[boardId] = {
          id: boardId, serviceId: nextGraph.service.id, name: 'Blueprint inicial',
          viewKind: 'blueprint', journeyId, items: {}, edges: {},
        };
      }
      nextGraph.service.updatedAt = now;
    }
    const projectId = nextGraph.service.project?.id || `project-${nextGraph.service.id}`;
    saveProjectSnapshot(nextGraph, { id: projectId, title: projectName, serviceName, description: input.description ?? '', template, favorite: false, archived: false, lastOpenedAt: nowIso() });
    markProjectOpened(projectId);
    const opened = replaceProjectGraph(nextGraph, 'Criar projeto');
    if (opened) showToast('Projeto criado. Agora estruture o serviço dentro dele.');
    return opened;
  };

  const toggleWorkspaceProjectFavorite = (projectId: Id) => {
    const favorite = toggleProjectFavorite(projectId);
    setProjectLibraryRevision((value) => value + 1);
    showToast(favorite ? 'Projeto adicionado aos favoritos.' : 'Projeto removido dos favoritos.');
    return favorite;
  };

  const renameWorkspaceProject = (projectId: Id, title: string) => {
    const renamed = renameProject(projectId, title);
    if (!renamed) { showToast('Não foi possível renomear o projeto.'); return false; }
    setProjectLibraryRevision((value) => value + 1);
    showToast('Projeto renomeado.');
    return true;
  };

  const archiveWorkspaceProject = (projectId: Id) => {
    const target = projects.find((item) => item.id === projectId);
    if (!target) { showToast('Projeto não encontrado.'); return false; }
    const fallback = projects.find((item) => item.id !== projectId) ?? null;
    if (projectId === activeProjectId && !fallback) {
      showToast('Crie ou abra outro projeto antes de arquivar o projeto atual.');
      return false;
    }
    if (projectId === activeProjectId) persistGraph(graphRef.current, true);
    const archived = setProjectArchived(projectId, true);
    if (!archived) { showToast('Não foi possível arquivar o projeto.'); return false; }
    setProjectLibraryRevision((value) => value + 1);
    if (projectId === activeProjectId && fallback) openWorkspaceProject(fallback.id);
    showToast('Projeto arquivado.');
    return true;
  };

  const deleteWorkspaceProject = (projectId: Id) => {
    const target = [...projects, ...archivedProjects].find((item) => item.id === projectId);
    if (!target) { showToast('Projeto não encontrado.'); return false; }
    if (projectId === activeProjectId) {
      // Switch the canonical graph before removing the snapshot. This prevents
      // replaceProjectGraph's flush and the autosave bridge from resurrecting it.
      const fallback = projects.find((item) => item.id !== projectId);
      const nextGraph = fallback ? loadProjectSnapshot(fallback.id) : createBlankWorkspaceGraph();
      if (!nextGraph || !replaceProjectGraph(nextGraph, 'Excluir projeto: mudar contexto')) {
        showToast('Não foi possível fechar o projeto antes da exclusão.');
        return false;
      }
      // Keep the user on the project library after deletion, even when a fallback exists.
      setActiveTab('home');
    }
    try {
      if (!deleteProject(projectId)) { showToast('Não foi possível excluir o projeto.'); return false; }
      setProjectLibraryRevision((value) => value + 1);
      window.dispatchEvent(new Event('bo-project-deleted'));
      showToast('Projeto excluído deste navegador.');
      return true;
    } catch {
      showToast('Falha ao excluir o projeto do armazenamento local.');
      return false;
    }
  };

  const restoreWorkspaceProject = (projectId: Id) => {
    const restored = setProjectArchived(projectId, false);
    if (!restored) { showToast('Não foi possível restaurar o projeto.'); return false; }
    setProjectLibraryRevision((value) => value + 1);
    showToast('Projeto restaurado.');
    return true;
  };

  const createService = (name: string, description = '') => {
    const trimmed = name.trim();
    if (!trimmed) { showToast('Informe um nome para o serviço.'); return false; }
    setGraph(() => createServiceGraph(trimmed, description), 'Criar serviço');
    setSelectedStageIds([]); setFocusedStageId(null); setActiveTab('home');
    showToast('Serviço criado. Agora comece entendendo cliente, necessidade e problema.');
    return true;
  };

  const loadDemoService = () => {
    setGraph(() => createDemoGraph(), 'Carregar serviço de exemplo');
    setSelectedStageIds([]); setFocusedStageId(null); setActiveTab('home');
    showToast('Serviço de exemplo carregado.');
    return true;
  };

  const handleSave = () => { persistGraph(graphRef.current, false); };

  const handleExport = () => {
    const bridge = dataBridge(); if (bridge) { bridge.export(); showToast('Backup completo exportado.'); return; }
    try {
      const blob = new Blob([repository.exportJson(graph)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = 'Blue-Ocean-Service-Studio-projeto.json';
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast('Projeto exportado em JSON.');
    } catch { showToast('Não foi possível exportar o projeto.'); }
  };

  const handleImport = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { showToast('O arquivo JSON excede 10 MB.'); return; }
    try {
      const raw = await file.text();
      const bridge = dataBridge(); if (bridge) { const data = JSON.parse(raw); if (!data?.service && data?.format !== 'realtalent.service-studio.backup') throw new Error('Selecione um backup completo ou Service Graph.'); await bridge.import(data); showToast('Importação processada.'); return; }
      const imported = repository.importJson(raw);
      setHistory(initialHistory(imported));
      setSelectedStageIds([]);
      setFocusedStageId(null);
      setActiveTab('journey');
      try { repository.save(imported); setSaveStatus('saved'); showToast('Projeto importado e salvo.'); }
      catch { setSaveStatus('error'); showToast('Projeto importado, mas não foi possível salvá-lo neste navegador.'); }
    } catch (error) { showToast(describeImportError(error)); }
  };

  const updateStageCore = (
    stageId: Id,
    field: 'title' | 'customerAction' | 'emotion',
    value: string,
  ) => {
    setGraph((current) => {
      const stage = current.stages[stageId];
      if (!stage) return current;

      const nextStage: Stage = {
        ...stage,
        [field]: field === 'emotion' ? (value as Emotion) : value,
        ...(field === 'emotion' ? { emotionScore: value === 'negative' ? -1 as const : value === 'positive' ? 1 as const : 0 as const } : {}),
      };

      return touchUpdatedAt({
        ...current,
        stages: {
          ...current.stages,
          [stageId]: nextStage,
        },
      });
    }, field === 'emotion' ? undefined : `stage-${stageId}-${field}`);
  };


  const updateStageExperience = (stageId: Id, patch: Parameters<typeof updateJourneyStageExperience>[0]['patch']) => {
    setGraph((current) => updateJourneyStageExperience({ graph: current, stageId, patch }), `H7.9: experiência da etapa ${stageId}`);
  };

  const setStageContextLink = (stageId: Id, kind: JourneyContextKind, entityId: Id, enabled: boolean) => {
    setGraph((current) => setJourneyStageContextLink({ graph: current, stageId, kind, entityId, enabled }), `H7.9: contexto da etapa ${stageId}`);
  };

  const createStage = (inlineTitle?: unknown) => {
    if (!journey.id) { showToast('Crie uma Jornada antes de adicionar etapas.'); return; }
    const title = (typeof inlineTitle === 'string' ? inlineTitle.trim() : '') || stageDraft.title.trim() || 'Nova Etapa';
    const stageId = makeId('stage');
    const touchpointNames = parseList(stageDraft.touchpoints);

    setGraph((current) => {
      const nextTouchpoints: Record<Id, Touchpoint> = { ...current.touchpoints };
      const existingByName = new Map(
        Object.values(nextTouchpoints).map((touchpoint) => [normalizeName(touchpoint.name), touchpoint]),
      );

      const touchpointIds = touchpointNames.map((name) => {
        const existing = existingByName.get(normalizeName(name));
        if (existing) return existing.id;

        const id = makeId('touchpoint');
        const created: Touchpoint = {
          id,
          serviceId: current.service.id,
          name,
          channel: 'Não classificado',
        };
        nextTouchpoints[id] = created;
        existingByName.set(normalizeName(name), created);
        return id;
      });

      const newStage: Stage = {
        id: stageId,
        journeyId: journey.id,
        title,
        customerAction: stageDraft.customerAction.trim(),
        emotion: 'neutral',
        thoughts: '',
        needIds: [],
        touchpointIds,
        validatedProblemIds: [],
        evidenceIds: [],
        momentOfTruth: 'none',
        momentNote: '',
        problemIds: [],
        opportunityIds: [],
      };

      return touchUpdatedAt({
        ...current,
        journeys: {
          ...current.journeys,
          [journey.id]: {
            ...current.journeys[journey.id],
            stageIds: [...current.journeys[journey.id].stageIds, stageId],
          },
        },
        stages: {
          ...current.stages,
          [stageId]: newStage,
        },
        touchpoints: nextTouchpoints,
      });
    });

    setSelectedStageId(null);
    setStageDraft({ title: '', customerAction: '', touchpoints: '' });
    setIsCreateStageOpen(false);
    showToast('Nova etapa criada.');
  };

  const moveStage = (stageId: Id, direction: 'prev' | 'next') => {
    setGraph((current) => {
      const currentJourney = current.journeys[journey.id];
      const currentIndex = currentJourney.stageIds.indexOf(stageId);
      if (currentIndex < 0) return current;
      const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= currentJourney.stageIds.length) return current;

      const nextIds = [...currentJourney.stageIds];
      [nextIds[currentIndex], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[currentIndex]];

      return touchUpdatedAt({
        ...current,
        journeys: {
          ...current.journeys,
          [journey.id]: {
            ...currentJourney,
            stageIds: nextIds,
          },
        },
      });
    });
  };

  const handleStageDragStart = (event: DragEvent<HTMLElement>, stageId: Id) => {
    event.dataTransfer.setData('journeyStageId', stageId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleStageDrop = (event: DragEvent<HTMLElement>, targetStageId: Id) => {
    event.preventDefault();
    const draggedStageId = event.dataTransfer.getData('journeyStageId');
    if (!draggedStageId || draggedStageId === targetStageId) return;

    setGraph((current) => {
      const currentJourney = current.journeys[journey.id];
      const sourceIndex = currentJourney.stageIds.indexOf(draggedStageId);
      const targetIndex = currentJourney.stageIds.indexOf(targetStageId);
      if (sourceIndex < 0 || targetIndex < 0) return current;

      const nextIds = [...currentJourney.stageIds];
      const [moved] = nextIds.splice(sourceIndex, 1);
      nextIds.splice(targetIndex, 0, moved);

      return touchUpdatedAt({
        ...current,
        journeys: {
          ...current.journeys,
          [journey.id]: {
            ...currentJourney,
            stageIds: nextIds,
          },
        },
      });
    });
  };

  const removeStage = (stageId: Id) => {
    setSelectedStageIds((ids) => ids.filter((id) => id !== stageId));
    if (focusedStageId === stageId) setFocusedStageId(null);
    setGraph((current) => deleteStageFromGraph(current, stageId));
  };

  const addTouchpointToStage = (stageId: Id, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    setGraph((current) => {
      const stage = current.stages[stageId];
      if (!stage) return current;

      const existing = Object.values(current.touchpoints).find(
        (touchpoint) => normalizeName(touchpoint.name) === normalizeName(trimmed),
      );
      const touchpointId = existing?.id ?? makeId('touchpoint');
      const touchpoint =
        existing ??
        ({
          id: touchpointId,
          serviceId: current.service.id,
          name: trimmed,
          channel: 'Não classificado',
        } satisfies Touchpoint);

      if (stage.touchpointIds.includes(touchpointId)) return current;

      return touchUpdatedAt({
        ...current,
        touchpoints: {
          ...current.touchpoints,
          [touchpointId]: touchpoint,
        },
        stages: {
          ...current.stages,
          [stageId]: {
            ...stage,
            touchpointIds: [...stage.touchpointIds, touchpointId],
          },
        },
      });
    });

    setNewTouchpointName('');
  };

  const removeTouchpointFromStage = (stageId: Id, touchpointId: Id) => {
    setGraph((current) => {
      const stage = current.stages[stageId];
      if (!stage) return current;

      const nextStages = {
        ...current.stages,
        [stageId]: {
          ...stage,
          touchpointIds: stage.touchpointIds.filter((id) => id !== touchpointId),
        },
      };
      const isStillUsed = Object.values(nextStages).some((item) =>
        item.touchpointIds.includes(touchpointId),
      );
      const nextTouchpoints = { ...current.touchpoints };
      if (!isStillUsed) delete nextTouchpoints[touchpointId];

      return touchUpdatedAt({
        ...current,
        stages: nextStages,
        touchpoints: nextTouchpoints,
      });
    });
  };

  const updateTouchpointChannel = (touchpointId: Id, channel: string) => {
    setGraph((current) => touchUpdatedAt(assignTouchpointChannelByName(current, touchpointId, channel)), `touchpoint-${touchpointId}-channel`);
  };

  const assignTouchpointChannelId = (touchpointId: Id, channelId: Id) => {
    setGraph((current) => touchUpdatedAt(assignTouchpointChannel(current, touchpointId, channelId)), `H7.29: touchpoint ${touchpointId} → channel ${channelId}`);
  };

  const addProblemToStage = (stageId: Id, description: string) => {
    const trimmed = description.trim();
    if (!trimmed) return;
    const problemId = makeId('problem');

    setGraph((current) => {
      const stage = current.stages[stageId];
      if (!stage) return current;
      const newProblem: Problem = { id: problemId, stageId, description: trimmed };

      return touchUpdatedAt({
        ...current,
        stages: {
          ...current.stages,
          [stageId]: { ...stage, problemIds: [...stage.problemIds, problemId] },
        },
        problems: { ...current.problems, [problemId]: newProblem },
      });
    });
    setNewProblemText('');
  };

  const updateProblem = (problemId: Id, description: string) => {
    setGraph((current) => {
      const problem = current.problems[problemId];
      if (!problem) return current;
      return touchUpdatedAt({
        ...current,
        problems: {
          ...current.problems,
          [problemId]: { ...problem, description },
        },
      });
    });
  };

  const removeProblemFromStage = (stageId: Id, problemId: Id) => {
    setGraph((current) => {
      const stage = current.stages[stageId];
      if (!stage) return current;
      const nextProblems = { ...current.problems };
      delete nextProblems[problemId];

      const nextOpportunities = Object.fromEntries(
        Object.entries(current.opportunities).map(([id, opportunity]) => [
          id,
          { ...opportunity, problemIds: opportunity.problemIds.filter((pid) => pid !== problemId) },
        ]),
      ) as Record<Id, Opportunity>;

      return touchUpdatedAt({
        ...current,
        stages: {
          ...current.stages,
          [stageId]: { ...stage, problemIds: stage.problemIds.filter((id) => id !== problemId) },
        },
        problems: nextProblems,
        opportunities: nextOpportunities,
      });
    });
  };

  const addOpportunityToStage = (stageId: Id, title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const opportunityId = makeId('opportunity');
    const taskId = makeId('task');

    setGraph((current) => {
      const stage = current.stages[stageId];
      if (!stage) return current;
      const opportunity: Opportunity = {
        id: opportunityId,
        stageId,
        title: trimmed,
        problemIds: [...stage.problemIds],
        taskIds: [taskId],
      };
      const task: Task = { id: taskId, opportunityId, title: trimmed, status: 'todo' };

      return touchUpdatedAt({
        ...current,
        stages: {
          ...current.stages,
          [stageId]: { ...stage, opportunityIds: [...stage.opportunityIds, opportunityId] },
        },
        opportunities: { ...current.opportunities, [opportunityId]: opportunity },
        tasks: { ...current.tasks, [taskId]: task },
      });
    });
    setNewOpportunityText('');
  };

  const updateOpportunity = (opportunityId: Id, title: string) => {
    setGraph((current) => {
      const opportunity = current.opportunities[opportunityId];
      if (!opportunity) return current;
      const nextTasks = { ...current.tasks };
      opportunity.taskIds.forEach((taskId) => {
        const task = nextTasks[taskId];
        if (task) nextTasks[taskId] = { ...task, title };
      });
      return touchUpdatedAt({
        ...current,
        opportunities: {
          ...current.opportunities,
          [opportunityId]: { ...opportunity, title },
        },
        tasks: nextTasks,
      });
    });
  };

  const removeOpportunityFromStage = (stageId: Id, opportunityId: Id) => {
    setGraph((current) => {
      const stage = current.stages[stageId];
      const opportunity = current.opportunities[opportunityId];
      if (!stage || !opportunity) return current;
      const taskIds = new Set(opportunity.taskIds);
      const nextOpportunities = { ...current.opportunities };
      delete nextOpportunities[opportunityId];

      return touchUpdatedAt({
        ...current,
        stages: {
          ...current.stages,
          [stageId]: {
            ...stage,
            opportunityIds: stage.opportunityIds.filter((id) => id !== opportunityId),
          },
        },
        opportunities: nextOpportunities,
        tasks: Object.fromEntries(
          Object.entries(current.tasks).filter(([id]) => !taskIds.has(id)),
        ) as Record<Id, Task>,
      });
    });
  };

  const updateBlueprint = (field: keyof BlueprintDraft, value: string) => {
    setGraph((current) =>
      touchUpdatedAt({
        ...current,
        blueprintDraft: {
          ...current.blueprintDraft,
          [field]: value,
        },
      }),
    );
  };

  const handleDragStart = (event: DragEvent<HTMLElement>, taskId: Id) => {
    event.dataTransfer.setData('taskId', taskId);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: DragEvent<HTMLElement>, newStatus: TaskStatus) => {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('taskId');
    if (!taskId) return;
    updateTaskStatus(taskId, newStatus);
  };

  const updateTaskStatus = (taskId: Id, status: TaskStatus) => {
    setGraph((current) => {
      const task = current.tasks[taskId];
      if (!task) return current;

      return touchUpdatedAt({
        ...current,
        tasks: {
          ...current.tasks,
          [taskId]: {
            ...task,
            status,
          },
        },
      });
    });
  };

  const moveTask = (taskId: Id, currentStatus: TaskStatus, direction: 'prev' | 'next') => {
    const statuses: TaskStatus[] = ['todo', 'doing', 'done'];
    const currentIndex = statuses.indexOf(currentStatus);
    const offset = direction === 'next' ? 1 : -1;
    const nextStatus = statuses[currentIndex + offset];
    if (nextStatus) updateTaskStatus(taskId, nextStatus);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (activeTab !== 'journey' || document.getElementById('rt187-journey-home')?.hidden === false || document.querySelector('.rt144.rt186')) return;
      if (event.key === 'Escape') {
        if (showShortcuts) setShowShortcuts(false);
        else if (isCreateStageOpen) setIsCreateStageOpen(false);
        else if (focusedStageId) setFocusedStageId(null);
        else setSelectedStageIds([]);
        return;
      }
      if (isCreateStageOpen || showShortcuts) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (command && ['z', 'y', 'c', 'v', 'd', 'a'].includes(key)) {
        event.preventDefault();
        if (key === 'z') { if (event.shiftKey) redo(); else undo(); }
        if (key === 'y') redo();
        if (key === 'c') copySelected();
        if (key === 'v') insertBundles(clipboard);
        if (key === 'd') duplicateSelected();
        if (key === 'a') setSelectedStageIds([...journey.stageIds]);
        return;
      }
      if (!command && (key === 'delete' || key === 'backspace') && selectedCount) {
        event.preventDefault(); removeSelected(); return;
      }
      if (!command && (key === '+' || key === '=' || key === '-')) {
        event.preventDefault(); setZoom((value) => Math.max(70, Math.min(130, value + (key === '-' ? -10 : 10)))); return;
      }
      if (!command && (key === 'arrowleft' || key === 'arrowright') && selectedStageId) {
        event.preventDefault();
        const index = journey.stageIds.indexOf(selectedStageId);
        const next = journey.stageIds[index + (key === 'arrowleft' ? -1 : 1)];
        if (next) setSelectedStageId(next);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });
  const bridgeHistory = dataBridge()?.historyState?.();
  const canUndo = bridgeHistory?.canUndo ?? history.past.length > 0;
  const canRedo = bridgeHistory?.canRedo ?? history.future.length > 0;
  return {
    activeTab, setActiveTab, toast, setToast, loaded, history, setHistory, canUndo, canRedo,
    saveStatus, setSaveStatus, graph, setGraph, hasService, projects, archivedProjects, activeProjectId, createWorkspaceProject, openWorkspaceProject, toggleWorkspaceProjectFavorite, renameWorkspaceProject, archiveWorkspaceProject, restoreWorkspaceProject, deleteWorkspaceProject, createService, loadDemoService, undo, redo, selectedStageIds,
    setSelectedStageIds, selectedStageId, setSelectedStageId, selectionAnchorId, setSelectionAnchorId, clipboard, setClipboard,
    focusedStageId, setFocusedStageId, zoom, setZoom, stageWidth, setStageWidth, collapsedRows,
    setCollapsedRows, showRowControls, setShowRowControls, detailMode, setDetailMode, showShortcuts, setShowShortcuts,
    scrollRef, isCreateStageOpen, setIsCreateStageOpen, stageDraft, setStageDraft, newTouchpointName, setNewTouchpointName,
    newProblemText, setNewProblemText, newOpportunityText, setNewOpportunityText, journeyId, journey, orderedStages,
    selectedStage, selectedCount, visibleStages, selectStage, copySelected, insertBundles, duplicateSelected,
    removeSelected, toggleRow, rowVisible, focusSelected, journeyActionSummary, showToast, touchUpdatedAt,
    handleSave, handleExport, handleImport, updateStageCore, createStage, moveStage, handleStageDragStart,
    handleStageDrop, removeStage, addTouchpointToStage, removeTouchpointFromStage, updateTouchpointChannel, assignTouchpointChannelId, addProblemToStage, updateProblem,
    removeProblemFromStage, addOpportunityToStage, updateOpportunity, removeOpportunityFromStage, updateBlueprint, handleDragStart, handleDragOver,
    handleDrop, updateTaskStatus, moveTask, updateStageExperience, setStageContextLink,
  };
 }

export type StudioController = ReturnType<typeof useStudioController>;

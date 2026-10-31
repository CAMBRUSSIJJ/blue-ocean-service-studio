// H7.40-H4 legacy surface label: WHITEBOARD 2.0
// H7.40-H3 legacy title: Whiteboard 2.0
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Filter, GitBranch, LayoutTemplate, Plus, RefreshCw, Search, AlertTriangle, X } from '../design-system/icons';
import type { StudioController } from '../state/useStudioController';
import { buildDesignHandoffReport, prepareWhiteboardFromDefinition } from '../services/design-handoff';
import { buildWhiteboardStudioReport, syncWhiteboardBlueprint, syncWhiteboardDesignContext, syncWhiteboardJourney } from '../services/whiteboard-studio';
import type { ServiceGraph, WhiteboardView } from '../domain/model';
import { BlockSuiteWorkspace } from './BlockSuiteWorkspace';

function BoardPreview({ board, graph }: { board: WhiteboardView; graph: ServiceGraph }) {
  const items = Object.values(board.items ?? {}).slice(0, 60);
  if (!items.length) return <span className="bo-editor-preview-empty bo-wb-preview-empty"><LayoutTemplate size={28} strokeWidth={1.4}/><span>Canvas visual</span></span>;
  const left = Math.min(...items.map(item => item.x)) - 40;
  const top = Math.min(...items.map(item => item.y)) - 40;
  const width = Math.max(320, Math.max(...items.map(item => item.x + item.width)) - left + 40);
  const height = Math.max(180, Math.max(...items.map(item => item.y + item.height)) - top + 40);
  const colors: Record<string, string> = { yellow: '#fff3b5', blue: '#dbeafe', emerald: '#dcfce7', amber: '#ffedd5', violet: '#ede9fe', rose: '#ffe4e6', slate: '#f1f5f9' };
  return <svg viewBox={`${left} ${top} ${width} ${height}`} aria-hidden="true">
    {Object.values(board.edges ?? {}).slice(0, 80).map(edge => {
      const from = board.items[edge.fromId], to = board.items[edge.toId];
      return from && to ? <line key={edge.id} x1={from.x + from.width / 2} y1={from.y + from.height / 2} x2={to.x + to.width / 2} y2={to.y + to.height / 2} stroke="#94a3b8" strokeWidth={3} /> : null;
    })}
    {items.map(item => {
      const entity = item.kind === 'smart' ? graph.entities?.[item.objectKind]?.[item.objectId] : undefined;
      const label = item.kind === 'free' ? item.text : String(entity?.title ?? entity?.name ?? 'Objeto vinculado');
      const frame = item.kind === 'free' && item.shape === 'frame';
      return <g key={item.id}><rect x={item.x} y={item.y} width={item.width} height={item.height} rx={8} fill={frame ? '#f8fafc' : colors[item.tone ?? 'slate']} stroke="#cbd5e1" strokeWidth={2} /><text x={item.x + 12} y={item.y + 25} fontSize={14} fill="#334155">{label.slice(0, 38)}</text></g>;
    })}
  </svg>;
}

function api<T>(name: string): T | null { return window.BlueOceanRuntime?.api<T>(name) ?? null; }

type WhiteboardCoreApi = {
  list?(): Array<{ id: string; name: string; itemCount: number; edgeCount: number; updatedAt?: string }>;
  createBlank(name?: string): Promise<{ id: string; name: string } | null> | { id: string; name: string } | null;
  createBlankSilent?(name?: string): Promise<{ id: string; name: string } | null> | { id: string; name: string } | null;
  openBoard?(id: string): Promise<boolean> | boolean;
  renameBoard?(id: string, name: string): boolean;
  duplicateBoard?(id: string): string | null;
  deleteBoard?(id: string): Promise<boolean> | boolean;
};

type BoardFilter = 'all' | 'context' | 'journey' | 'attention';

const statusLabel = (status: string) => ({ blank: 'Em branco', contextual: 'Contextual', composing: 'Em composição', connected: 'Conectado' }[status] ?? status);

export function WhiteboardsView({ studio }: { studio: StudioController }) {
  const { graph, hasService, setActiveTab, setGraph, showToast } = studio;
  const [showCreate, setShowCreate] = useState(false);
  const [visualBoard, setVisualBoard] = useState<{ id: string; name: string } | null>(null);
  const [guidedFreeStart, setGuidedFreeStart] = useState(false);
  const [name, setName] = useState('');
  const [menuBoardId, setMenuBoardId] = useState<string | null>(null);
  const [renameBoard, setRenameBoard] = useState<{ id: string; name: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BoardFilter>('all');
  const handoff = useMemo(() => buildDesignHandoffReport(graph), [graph]);
  const blueprintCount = useMemo(() => Object.values(graph.views.whiteboards ?? {}).filter((board) => board.viewKind === 'blueprint').length, [graph]);
  const boards = useMemo(() => Object.values(graph.views.whiteboards ?? {})
    .filter((board) => board.viewKind === 'free')
    .map((board) => {
      const report = buildWhiteboardStudioReport(graph, board.id);
      return {
        id: board.id,
        name: board.name || 'Whiteboard',
        itemCount: Object.keys(board.items ?? {}).length,
        edgeCount: Object.keys(board.edges ?? {}).length,
        contextCount: board.designContext ? board.designContext.personaIds.length + board.designContext.needIds.length + board.designContext.jobIds.length + board.designContext.painIds.length + board.designContext.problemIds.length + board.designContext.evidenceIds.length : 0,
        journeyId: board.journeyId,
        report,
      };
    }), [graph]);
  const filteredBoards = useMemo(() => {
    const text = query.trim().toLocaleLowerCase('pt-BR');
    return boards.filter((board) => {
      if (text && !board.name.toLocaleLowerCase('pt-BR').includes(text)) return false;
      if (filter === 'context' && !board.contextCount) return false;
      if (filter === 'journey' && !board.journeyId) return false;
      if (filter === 'attention' && !((board.report?.danglingSmartObjects ?? 0) > 0 || (board.report?.contextCoverage ?? 100) < 100)) return false;
      return true;
    });
  }, [boards, filter, query]);


  useEffect(() => {
    const startFromDesign = () => {
      setGuidedFreeStart(true);
      setName('');
      setShowCreate(true);
      try { sessionStorage.removeItem('bo-whiteboard-start-from-design'); } catch { /* intenção transitória opcional */ }
    };
    window.addEventListener('bo-whiteboard-start-from-design', startFromDesign);
    try {
      if (sessionStorage.getItem('bo-whiteboard-start-from-design') === 'free') window.setTimeout(startFromDesign, 0);
    } catch { /* intenção transitória opcional */ }
    return () => window.removeEventListener('bo-whiteboard-start-from-design', startFromDesign);
  }, []);

  const createFromDefinition = () => {
    const prepared = prepareWhiteboardFromDefinition(graph);
    if (!prepared.boardId) { showToast('Feche a Service Definition e conecte Persona, Problema e Evidência antes de criar um quadro contextual.'); return; }
    setGraph(() => prepared.graph, 'H7.11: Whiteboard 2.0 a partir da Definition');
    const board = prepared.graph.views.whiteboards[prepared.boardId];
    if (board) setVisualBoard({ id: board.id, name: board.name });
    showToast('Whiteboard contextual criado. Os objetos existentes podem ser copiados para o canvas visual.');
  };

  const create = async () => {
    const title = name.trim() || 'Novo Whiteboard';
    const runtime = api<WhiteboardCoreApi>('whiteboardCore');
    if (!runtime?.createBlank) return;
    setShowCreate(false); setGuidedFreeStart(false); setName('');
    const board = await (runtime.createBlankSilent ? runtime.createBlankSilent(title) : runtime.createBlank(title));
    if (board?.id) setVisualBoard({ id: board.id, name: board.name || title });
    else showToast('O quadro foi criado, mas não foi possível abrir o editor visual.');
  };

  const syncContext = (id: string) => {
    const result = syncWhiteboardDesignContext(graph, id);
    if (!result.added && !result.framesAdded && !result.edgesAdded) { showToast('O contexto deste quadro já está sincronizado.'); return; }
    setGraph(() => result.graph, 'H7.11: sincronizar Contexto no Whiteboard');
    showToast(`Contexto sincronizado: ${result.added} Smart Object(s), ${result.framesAdded} frame(s) e ${result.edgesAdded} conexão(ões).`);
    setMenuBoardId(null);
  };
  const syncJourney = (id: string, boardJourneyId?: string) => {
    const journeyId = boardJourneyId || graph.service.journeyIds.find((value) => Boolean(graph.journeys[value]));
    if (!journeyId) { showToast('Ainda não existe Journey para trazer ao Whiteboard.'); return; }
    const result = syncWhiteboardJourney(graph, id, journeyId);
    if (!result.added && !result.framesAdded && !result.edgesAdded) { showToast('A Journey deste quadro já está sincronizada.'); return; }
    setGraph(() => result.graph, 'H7.11: sincronizar Journey no Whiteboard');
    showToast(`Journey sincronizada: ${result.added} objeto(s) canônico(s) adicionados.`);
    setMenuBoardId(null);
  };
  const syncBlueprint = (id: string) => {
    if (!blueprintCount) { showToast('Ainda não existe Service Blueprint para trazer ao Whiteboard.'); return; }
    const result = syncWhiteboardBlueprint(graph, id);
    if (!result.sourceBoardId) { showToast('Nenhum Blueprint compatível foi encontrado.'); return; }
    if (!result.added && !result.framesAdded && !result.edgesAdded && !result.entitiesCreated) { showToast('O Blueprint deste quadro já está sincronizado.'); return; }
    setGraph(() => result.graph, 'H7.11: sincronizar Blueprint no Whiteboard');
    showToast(`Blueprint sincronizado: ${result.added} Smart Object(s) e ${result.entitiesCreated} objeto(s) operacional(is) canonizado(s).`);
    setMenuBoardId(null);
  };

  const rename = () => {
    if (!renameBoard) return;
    const clean = renameValue.trim();
    if (!clean) return;
    api<WhiteboardCoreApi>('whiteboardCore')?.renameBoard?.(renameBoard.id, clean);
    setRenameBoard(null); setRenameValue(''); setMenuBoardId(null);
  };
  const duplicate = (id: string) => { api<WhiteboardCoreApi>('whiteboardCore')?.duplicateBoard?.(id); setMenuBoardId(null); };
  const remove = async (id: string) => { await api<WhiteboardCoreApi>('whiteboardCore')?.deleteBoard?.(id); setMenuBoardId(null); };
  const openLegacy = async (id: string) => { const runtime = api<WhiteboardCoreApi>('whiteboardCore'); if (runtime?.openBoard) await runtime.openBoard(id); };
  const open = (id: string) => { const board = graph.views.whiteboards[id]; if (board) setVisualBoard({ id: board.id, name: board.name }); };
  const openJourneys = (journeyId?: string) => {
    setActiveTab('canvas');
    window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'journey' }));
    if (journeyId && graph.journeys[journeyId]) {
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('bo-service-object-focus', {
        detail: { kind: 'journey', id: journeyId },
      })), 40);
    }
  };
  const openBlueprints = () => {
    try { sessionStorage.setItem('bo-service-workspace-tab', 'blueprint'); } catch { /* local navigation preference */ }
    setActiveTab('canvas');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'blueprint' })), 0);
  };

  if (!hasService) return <section className="bo1189-module-empty"><LayoutTemplate size={30}/><h2>Crie um serviço antes de abrir quadros</h2><p>Whiteboards pertencem a um serviço. Volte à Visão geral e crie o primeiro serviço.</p><button type="button" onClick={() => setActiveTab('home')}>Ir para a Visão geral</button></section>;

  return <section className="bo1189-whiteboards bo-h711-whiteboards bo-wb-home" data-whiteboard-library="1" data-whiteboard-2="1" data-whiteboard-default="blocksuite">
    <header className="bo-wb-home-header">
      <div className="bo-wb-home-intro"><h1>Whiteboard</h1><p>Explore ideias, reúna evidências e transforme descobertas em elementos do serviço.</p></div>
    </header>
    <div className="bo-wb-storage-warning" role="note"><AlertTriangle size={18}/><span>O canvas visual é salvo somente neste navegador. <strong>Exporte um backup regularmente</strong> para evitar perder seu trabalho ao limpar os dados do dispositivo.</span></div>
    <div className="bo-wb-next-step" role="region" aria-label="Próximo passo">
      <div><span>PRÓXIMO PASSO</span><p>Abra o canvas para explorar ideias. Quando tiver elementos, conecte-os às Jornadas ou ao Blueprint.</p></div>
      <div className="bo-wb-next-actions"><button type="button" onClick={() => openJourneys()}>Jornadas <ArrowRight size={14}/></button><button type="button" onClick={openBlueprints}>Blueprint <ArrowRight size={14}/></button></div>
    </div>
    {handoff.readyForWhiteboard && <div className="bo-h78-library-hint" data-whiteboard-context-handoff="1"><strong>Pessoas, problemas e evidências já disponíveis</strong><span>{handoff.counts.persona} Persona · {handoff.counts.problem} Problema · {handoff.counts.evidence} Evidência · {handoff.supporting.length} relações de suporte.</span><button type="button" onClick={createFromDefinition}>Criar com registros existentes</button></div>}

    <div className="bo-h711-commandbar bo-wb-toolbar">
      <div aria-label="Filtros do Whiteboard"><Filter size={15}/>{([
        ['all', 'Todos'], ['context', 'Com contexto'], ['journey', 'Com Jornada'], ['attention', 'Precisa atenção'],
      ] as Array<[BoardFilter, string]>).map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>
      <label aria-label="Buscar Whiteboard"><Search size={16}/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar whiteboard..." /></label>
    </div>

    {(filteredBoards.length > 0 || (filter === 'all' && !query.trim())) ? <div className="bo1189-board-grid bo-wb-gallery">{filteredBoards.map((board) => <article key={board.id} className="bo1193-board-card bo-h711-board-card" data-whiteboard-studio-status={board.report?.status ?? 'blank'}>
      <button type="button" className="bo1193-card-menu-trigger" aria-label={`Ações de ${board.name}`} aria-expanded={menuBoardId === board.id} title="Mais opções" onClick={() => setMenuBoardId(menuBoardId === board.id ? null : board.id)}>⋯</button>
      {menuBoardId === board.id && <div className="bo1193-card-menu bo-h711-card-menu">
        {board.contextCount > 0 && <button type="button" onClick={() => syncContext(board.id)}><RefreshCw size={13}/> Sincronizar contexto</button>}
        <button type="button" onClick={() => syncJourney(board.id, board.journeyId)}><GitBranch size={13}/> Trazer Journey</button>
        {blueprintCount > 0 && <button type="button" onClick={() => syncBlueprint(board.id)}><LayoutTemplate size={13}/> Trazer Blueprint</button>}
        <button type="button" onClick={() => { setRenameBoard({ id: board.id, name: board.name }); setRenameValue(board.name); setMenuBoardId(null); }}>Renomear</button>
        <button type="button" title="Duplica os objetos clássicos; o documento visual local não é copiado." onClick={() => duplicate(board.id)}>Duplicar</button>
        <button type="button" onClick={() => { setMenuBoardId(null); void openLegacy(board.id); }}>Abrir quadro clássico</button>
        <button type="button" className="danger" onClick={() => void remove(board.id)}>Excluir</button>
      </div>}
      <button type="button" className="bo1189-board-preview bo-editor-board-preview" aria-label={`Abrir ${board.name}`} onClick={() => open(board.id)}><BoardPreview board={graph.views.whiteboards[board.id]} graph={graph}/></button>
      <div className="bo1193-board-copy"><strong>{board.name}</strong><small>{board.itemCount ? `${board.itemCount} objetos · ${board.edgeCount} conexões` : 'Canvas em branco'}</small><span className={board.contextCount ? 'bo-wb-status-tag is-connected' : 'bo-wb-status-tag'}>{board.contextCount ? 'Com contexto' : 'Sem contexto'}</span></div>
      {board.report && board.report.danglingSmartObjects > 0 && <p className="bo-wb-review-note"><AlertTriangle size={13}/> {board.report.danglingSmartObjects} referência(s) para revisar</p>}
      <button type="button" className="bo-wb-open-canvas" onClick={() => open(board.id)}>Abrir canvas <ArrowRight size={15}/></button>
      {board.journeyId && graph.journeys[board.journeyId] && <button type="button" className="bo-h1711-link" data-whiteboard-to-journey={board.id} onClick={() => openJourneys(board.journeyId)}>Ver Jornada vinculada <ArrowRight size={13}/></button>}
    </article>)}
      {filter === 'all' && !query.trim() && <button type="button" className="bo-wb-add-tile" onClick={() => setShowCreate(true)}><span className="bo-wb-add-tile-visual"><Plus size={34}/><strong>Novo whiteboard</strong></span><span className="bo-wb-add-tile-caption"><strong>Canvas em branco</strong><small>Comece a explorar ideias livres</small><em>Criar canvas <ArrowRight size={14}/></em></span></button>}
    </div> : <div className="bo1189-board-empty bo-wb-empty" data-whiteboard-empty="1">
      <span className="bo-wb-empty-art" aria-hidden="true"><span/><span/><span/></span>
      <div className="bo-wb-empty-copy"><span className="bo-wb-kicker">{boards.length ? 'NENHUM RESULTADO' : 'SEU ESPAÇO PARA CRIAR'}</span><strong>{boards.length ? 'Nenhum quadro encontrado' : 'Comece com uma ideia'}</strong><p>{boards.length ? 'Experimente outro termo ou limpe os filtros para ver seus quadros.' : 'Crie um quadro livre para organizar anotações, insights e conexões no canvas. Depois, relacione as descobertas ao serviço.'}</p></div>
      {boards.length ? <div className="bo1190-empty-actions"><button type="button" className="secondary" onClick={() => { setQuery(''); setFilter('all'); }}>Limpar filtros</button></div>
        : <div className="bo1190-empty-actions"><button type="button" className="primary" onClick={() => setShowCreate(true)}><Plus size={16}/> Novo whiteboard</button>
          {handoff.readyForWhiteboard && <button type="button" className="secondary" onClick={createFromDefinition}>Usar registros existentes <ArrowRight size={14}/></button>}
        </div>}
    </div>}

    {renameBoard && <div className="bo1189-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setRenameBoard(null); }}><form className="bo1189-modal bo1193-rename-modal" onSubmit={(e) => { e.preventDefault(); rename(); }}><header><div><span>WHITEBOARD</span><h2>Renomear quadro</h2><p>O novo nome será usado na biblioteca e no cabeçalho do Whiteboard.</p></div><button type="button" aria-label="Fechar" onClick={() => setRenameBoard(null)}><X size={18}/></button></header><label>Nome do quadro<input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} /></label><footer><button type="button" onClick={() => setRenameBoard(null)}>Cancelar</button><button type="submit">Salvar nome</button></footer></form></div>}
    {showCreate && <div className="bo1189-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); setGuidedFreeStart(false); } }}><form className="bo1189-modal bo-h167-whiteboard-start" onSubmit={(e) => { e.preventDefault(); void create(); }}><header><div><span>NOVO WHITEBOARD</span><h2>Comece com um quadro</h2><p>Escolha um nome. Você pode criar notas, conectar ideias e acrescentar objetos do serviço depois.</p></div><button type="button" aria-label="Fechar" onClick={() => { setShowCreate(false); setGuidedFreeStart(false); }}><X size={18}/></button></header>{!guidedFreeStart && handoff.readyForWhiteboard && <div className="bo-wb-context-choice"><div><strong>Já tem pesquisa no serviço?</strong><small>Você também pode abrir um quadro com informações existentes.</small></div><button type="button" onClick={() => { setShowCreate(false); setGuidedFreeStart(false); createFromDefinition(); }}>Criar com registros existentes <ArrowRight size={13}/></button></div>}<label>Nome do quadro<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ideias para melhorar o atendimento" maxLength={120} /></label><footer><button type="button" onClick={() => { setShowCreate(false); setGuidedFreeStart(false); }}>Cancelar</button><button type="submit">{guidedFreeStart ? 'Criar e começar' : 'Começar livre'}</button></footer></form></div>}
    {visualBoard && <BlockSuiteWorkspace boardId={visualBoard.id} boardName={visualBoard.name} serviceId={graph.service.id} graph={graph}
      onChangeGraph={(next, label) => setGraph(() => next, label)} onClose={() => setVisualBoard(null)}
      />}
  </section>;
}

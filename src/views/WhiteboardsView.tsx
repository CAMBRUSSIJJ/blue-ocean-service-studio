// H7.40-H4 legacy surface label: WHITEBOARD 2.0
// H7.40-H3 legacy title: Whiteboard 2.0
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Filter, GitBranch, LayoutTemplate, Plus, RefreshCw, Search, X } from '../design-system/icons';
import type { StudioController } from '../state/useStudioController';
import { buildDesignHandoffReport, prepareWhiteboardFromDefinition } from '../services/design-handoff';
import { buildWhiteboardStudioReport, syncWhiteboardBlueprint, syncWhiteboardDesignContext, syncWhiteboardJourney } from '../services/whiteboard-studio';
import type { ServiceGraph, WhiteboardView } from '../domain/model';
import { BlockSuiteWorkspace } from './BlockSuiteWorkspace';

type VisualPreviewNote = { x: number; y: number; width: number; height: number; text: string };
function readVisualPreview(serviceId: string, boardId: string): VisualPreviewNote[] {
  try {
    const key = 'bo-whiteboard-thumbnail-v1:' + encodeURIComponent(serviceId) + ':' + encodeURIComponent(boardId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 ||
      !('notes' in data) || !Array.isArray(data.notes)) return [];
    return data.notes.slice(0, 32).filter((note): note is VisualPreviewNote => Boolean(
      note && typeof note === 'object' && typeof note.text === 'string' &&
      ['x', 'y', 'width', 'height'].every(key => Number.isFinite(note[key]))
    )).map(note => ({ ...note, text: note.text.slice(0, 140) }));
  } catch { return []; }
}

function BoardPreview({ board, graph }: { board: WhiteboardView; graph: ServiceGraph }) {
  // The BlockSuite thumbnail is derived from the real visual notes saved on this
  // device; legacy cards remain a fallback, never fabricated placeholders.
  const liveNotes = readVisualPreview(graph.service.id, board.id);
  const legacy = Object.values(board.items ?? {}).slice(0, 60);
  if (!liveNotes.length && !legacy.length) return <span className="bo-wb-preview-empty"><LayoutTemplate size={25} strokeWidth={1.4}/><span>Canvas em branco</span></span>;
  const items = liveNotes.length
    ? liveNotes.map((note, index) => ({ id: 'visual-' + index, ...note, tone: 'blue' }))
    : legacy.map(item => ({
      id: item.id, x: item.x, y: item.y, width: item.width, height: item.height,
      tone: item.tone ?? 'slate',
      text: item.kind === 'free' ? item.text : String(graph.entities?.[item.objectKind]?.[item.objectId]?.title ?? 'Objeto vinculado'),
    }));
  const left = Math.min(...items.map(item => item.x)) - 40;
  const top = Math.min(...items.map(item => item.y)) - 40;
  const width = Math.max(320, Math.max(...items.map(item => item.x + item.width)) - left + 40);
  const height = Math.max(180, Math.max(...items.map(item => item.y + item.height)) - top + 40);
  const colors: Record<string,string> = { yellow: '#fff3b5', blue: '#dbeafe', emerald: '#dcfce7', amber: '#ffedd5', violet: '#ede9fe', rose: '#ffe4e6', slate: '#f1f5f9' };
  return <svg viewBox={left + ' ' + top + ' ' + width + ' ' + height} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
    {!liveNotes.length && Object.values(board.edges ?? {}).slice(0, 80).map(edge => {
      const from = board.items[edge.fromId], to = board.items[edge.toId];
      return from && to ? <line key={edge.id} x1={from.x + from.width / 2} y1={from.y + from.height / 2} x2={to.x + to.width / 2} y2={to.y + to.height / 2} stroke="#94a3b8" strokeWidth={3}/> : null;
    })}
    {items.map(item => <g key={item.id}>
      <rect x={item.x} y={item.y} width={item.width} height={item.height} rx={8} fill={colors[item.tone] || colors.slate} stroke="#cbd5e1" strokeWidth={2}/>
      <text x={item.x + 12} y={item.y + 27} fontSize={15} fill="#334155">{item.text.slice(0, 42)}</text>
    </g>)}
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
        updatedAt: board.updatedAt,
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


  return <section className="bo1189-whiteboards bo-h711-whiteboards bo-wb-home bo-wb-library-v2" data-whiteboard-library="1" data-whiteboard-2="1" data-whiteboard-default="blocksuite">
    <header className="bo-wb-home-header">
      <div className="bo-wb-home-intro"><h1>Whiteboard</h1>
        <p>Explore ideias, reúna evidências e transforme descobertas em elementos do serviço.</p>
      </div>
      {boards.length > 0 && <button type="button" className="primary bo-wb-main-create" onClick={() => setShowCreate(true)}><Plus size={17}/> Novo whiteboard</button>}
    </header>

    <aside className="bo-wb-storage-warning" role="note" aria-label="Armazenamento dos whiteboards">
      <AlertTriangle size={18} aria-hidden="true"/>
      <p><strong>Salvo somente neste navegador.</strong> Exporte uma cópia para não perder o trabalho se os dados locais forem apagados.
        {boards.length > 0 && <> <button type="button" onClick={() => { const first = boards[0]; if (first) { open(first.id); showToast('No editor visual, clique em Exportar para guardar uma cópia do canvas.'); } }}>Abrir canvas para exportar</button></>}
      </p>
    </aside>

    <section className="bo-wb-next-step" aria-label="Próximo passo">
      <div className="bo-wb-next-copy"><span className="bo-wb-next-kicker">PRÓXIMO PASSO</span>
        <p>{boards.length > 0
          ? 'Abra o canvas para explorar. Quando tiver elementos, vincule-os a Jornadas ou ao Blueprint.'
          : 'Crie um canvas para organizar ideias. Depois, conecte suas descobertas às Jornadas ou ao Blueprint.'}</p>
      </div>
      <div className="bo-wb-next-actions">
        <button type="button" onClick={() => openJourneys()}><GitBranch size={15}/> Jornadas</button>
        <button type="button" title="Ir para Blueprints" onClick={openBlueprints}><LayoutTemplate size={15}/> Blueprint</button>
        {handoff.readyForWhiteboard && <button type="button" data-whiteboard-context-handoff="1" className="bo-wb-context-action" onClick={createFromDefinition}>Criar com registros existentes</button>}
      </div>
    </section>

    <nav className="bo-wb-context-tabs" aria-label="Áreas do desenho do serviço">
      <button type="button" onClick={() => openJourneys()}>Mapas do serviço <span>{graph.service.journeyIds.length + blueprintCount}</span></button>
      <button type="button" onClick={() => { setActiveTab('canvas'); window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'channels' })); }}>Canais</button>
      <button type="button" aria-current="page" className="active">Whiteboard <span>{boards.length}</span></button>
    </nav>

    {boards.length > 0 && <div className="bo-h711-commandbar bo-wb-toolbar">
      <p className="bo-wb-library-count" data-whiteboard-health-summary="1">{filteredBoards.length} {filteredBoards.length === 1 ? 'quadro' : 'quadros'}</p>
      <div className="bo-wb-filter-buttons" role="group" aria-label="Filtros do Whiteboard"><Filter size={15} aria-hidden="true"/>{([
        ['all', 'Todos'], ['context', 'Com contexto'], ['journey', 'Com Jornada'], ['attention', 'Precisa atenção'],
      ] as Array<[BoardFilter, string]>).map(([key, label]) => <button type="button" key={key} aria-pressed={filter === key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>
      <label className="bo-wb-search" aria-label="Buscar Whiteboard"><Search size={16}/><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar whiteboard..." /></label>
    </div>}

    {boards.length === 0 && <div className="bo-wb-empty-inline" data-whiteboard-empty="1"><strong>Seu espaço para criar</strong><span>Crie um quadro livre para organizar ideias, sem etapas nem Blueprint obrigatório. Acrescente contexto quando precisar.</span></div>}
    {boards.length > 0 && filteredBoards.length === 0 && <div className="bo-wb-no-results" role="status"><strong>Nenhum quadro encontrado</strong><span>Ajuste a busca ou os filtros para encontrar seus whiteboards.</span><button type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Limpar filtros</button></div>}

    <div className="bo1189-board-grid bo-wb-gallery">
      {filteredBoards.map((board) => <article key={board.id} aria-label={'WHITEBOARD · ' + board.name} className="bo1193-board-card bo-h711-board-card bo-wb-board-card" data-whiteboard-studio-status={board.report?.status ?? 'blank'}>
        <button type="button" className="bo1189-board-preview bo-editor-board-preview bo-wb-card-preview" aria-label={'Abrir ' + board.name} onClick={() => open(board.id)}><BoardPreview board={graph.views.whiteboards[board.id]} graph={graph}/></button>
        <div className="bo1193-board-copy">
          <strong title={board.name}>{board.name}</strong>
          <small>{board.updatedAt && Number.isFinite(Date.parse(String(board.updatedAt))) ? 'Editado ' + new Date(board.updatedAt).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : 'Canvas visual'}</small>
          <span title={statusLabel(board.report?.status ?? 'blank')} className={board.contextCount ? 'bo-wb-status-tag is-linked' : 'bo-wb-status-tag is-unlinked'}>{board.contextCount ? 'Com contexto' : 'Sem contexto'}</span>
          {board.report && board.report.danglingSmartObjects > 0 && <span className="bo-wb-status-tag is-attention" title={'Qualidade: ' + board.report.qualityScore + '%'}><AlertTriangle size={12}/> Revisar referências</span>}
          <div className="bo-wb-card-actions">
            <button type="button" className="bo-wb-open-canvas" onClick={() => open(board.id)}>Abrir canvas <ArrowRight size={14}/></button>
            <button type="button" className="bo1193-card-menu-trigger" aria-label={'Ações de ' + board.name} aria-expanded={menuBoardId === board.id} title="Mais opções" onClick={() => setMenuBoardId(menuBoardId === board.id ? null : board.id)}>⋯</button>
          </div>
        </div>
        {menuBoardId === board.id && <div className="bo1193-card-menu bo-h711-card-menu bo-wb-card-menu">
          {board.contextCount > 0 && <button type="button" onClick={() => syncContext(board.id)}><RefreshCw size={13}/> Sincronizar contexto</button>}
          <button type="button" onClick={() => syncJourney(board.id, board.journeyId)}><GitBranch size={13}/> Trazer Journey</button>
          {blueprintCount > 0 && <button type="button" onClick={() => syncBlueprint(board.id)}><LayoutTemplate size={13}/> Trazer Blueprint</button>}
          <button type="button" onClick={() => { setRenameBoard({ id: board.id, name: board.name }); setRenameValue(board.name); setMenuBoardId(null); }}>Renomear</button>
          <button type="button" title="Duplica os objetos clássicos; o documento visual local não é copiado." onClick={() => duplicate(board.id)}>Duplicar</button>
          <button type="button" onClick={() => { setMenuBoardId(null); void openLegacy(board.id); }}>Abrir quadro clássico</button>
          {board.journeyId && graph.journeys[board.journeyId] && <button type="button" onClick={() => openJourneys(board.journeyId)}>Abrir Jornada vinculada <ArrowRight size={13}/></button>}
          <button type="button" className="danger" onClick={() => void remove(board.id)}>Excluir</button>
        </div>}
      </article>)}
      <article className="bo-wb-create-card" data-whiteboard-create-card="1">
        <div className="bo-wb-create-card-art" aria-hidden="true"><Plus size={30}/><strong>Novo whiteboard</strong></div>
        <div className="bo-wb-create-card-body"><strong>Canvas em branco</strong><p>Comece a explorar ideias livres.</p><span>Livre</span>
          <button type="button" aria-label={boards.length ? 'Criar canvas' : 'Novo whiteboard'} onClick={() => setShowCreate(true)}>Criar canvas</button>
        </div>
      </article>
    </div>
    {renameBoard && <div className="bo1189-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setRenameBoard(null); }}><form className="bo1189-modal bo1193-rename-modal" onSubmit={(e) => { e.preventDefault(); rename(); }}><header><div><span>WHITEBOARD</span><h2>Renomear quadro</h2><p>O novo nome será usado na biblioteca e no cabeçalho do Whiteboard.</p></div><button type="button" aria-label="Fechar" onClick={() => setRenameBoard(null)}><X size={18}/></button></header><label>Nome do quadro<input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} /></label><footer><button type="button" onClick={() => setRenameBoard(null)}>Cancelar</button><button type="submit">Salvar nome</button></footer></form></div>}
    {showCreate && <div className="bo1189-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); setGuidedFreeStart(false); } }}><form className="bo1189-modal bo-h167-whiteboard-start" onSubmit={(e) => { e.preventDefault(); void create(); }}><header><div><span>NOVO WHITEBOARD</span><h2>Comece com um quadro</h2><p>Escolha um nome. Você pode criar notas, conectar ideias e acrescentar objetos do serviço depois.</p></div><button type="button" aria-label="Fechar" onClick={() => { setShowCreate(false); setGuidedFreeStart(false); }}><X size={18}/></button></header>{!guidedFreeStart && handoff.readyForWhiteboard && <div className="bo-wb-context-choice"><div><strong>Já tem pesquisa no serviço?</strong><small>Você também pode abrir um quadro com informações existentes.</small></div><button type="button" onClick={() => { setShowCreate(false); setGuidedFreeStart(false); createFromDefinition(); }}>Criar com registros existentes <ArrowRight size={13}/></button></div>}<label>Nome do quadro<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Ideias para melhorar o atendimento" maxLength={120} /></label><footer><button type="button" onClick={() => { setShowCreate(false); setGuidedFreeStart(false); }}>Cancelar</button><button type="submit">{guidedFreeStart ? 'Criar e começar' : 'Começar livre'}</button></footer></form></div>}
    {visualBoard && <BlockSuiteWorkspace boardId={visualBoard.id} boardName={visualBoard.name} serviceId={graph.service.id} graph={graph}
      onChangeGraph={(next, label) => setGraph(() => next, label)} onClose={() => setVisualBoard(null)}
      />}
  </section>;
}

// H7.40-H4 legacy surface label: WHITEBOARD 2.0
// H7.40-H3 legacy title: Whiteboard 2.0
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Filter, GitBranch, LayoutTemplate, Plus, RefreshCw, Search, ShieldCheck, X } from '../design-system/icons';
import type { StudioController } from '../state/useStudioController';
import { buildDesignHandoffReport, prepareWhiteboardFromDefinition } from '../services/design-handoff';
import { buildWhiteboardStudioReport, syncWhiteboardBlueprint, syncWhiteboardDesignContext, syncWhiteboardJourney } from '../services/whiteboard-studio';
import type { ServiceGraph, WhiteboardView } from '../domain/model';

function BoardPreview({ board, graph }: { board: WhiteboardView; graph: ServiceGraph }) {
  const items = Object.values(board.items ?? {}).slice(0, 60);
  if (!items.length) return <span className="bo-editor-preview-empty">Quadro em branco</span>;
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
  const summary = useMemo(() => ({
    total: boards.length,
    smart: boards.reduce((sum, board) => sum + (board.report?.smartItems ?? 0), 0),
    connections: boards.reduce((sum, board) => sum + board.edgeCount, 0),
    contextual: boards.filter((board) => board.contextCount > 0).length,
  }), [boards]);

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
    showToast('Whiteboard 2.0 criado com Contexto canônico e frames de composição.');
  };

  const create = async () => {
    const title = name.trim() || 'Novo Whiteboard';
    const runtime = api<WhiteboardCoreApi>('whiteboardCore');
    if (!runtime?.createBlank) return;
    setShowCreate(false); setGuidedFreeStart(false); setName('');
    await runtime.createBlank(title);
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
  const open = async (id: string) => { const runtime = api<WhiteboardCoreApi>('whiteboardCore'); if (runtime?.openBoard) await runtime.openBoard(id); };
  const openBlueprints = () => {
    try { sessionStorage.setItem('bo-service-workspace-tab', 'blueprint'); } catch { /* local navigation preference */ }
    setActiveTab('canvas');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: 'blueprint' })), 0);
  };

  if (!hasService) return <section className="bo1189-module-empty"><LayoutTemplate size={30}/><h2>Crie um serviço antes de abrir quadros</h2><p>Whiteboards pertencem a um serviço. Volte à Visão geral e crie o primeiro serviço.</p><button type="button" onClick={() => setActiveTab('home')}>Ir para a Visão geral</button></section>;

  return <section className="bo1189-whiteboards bo-h711-whiteboards" data-whiteboard-library="1" data-whiteboard-2="1">
    <header><div><span>WORKSPACE</span><h1>Whiteboard</h1><p>Use o Whiteboard para pensar livremente. Você pode trazer Personas, Necessidades, Dores, Problemas e Evidências já registrados ou criá-los no próprio quadro enquanto desenha.</p></div><div className="bo1190-whiteboard-actions"><button type="button" onClick={openBlueprints}><LayoutTemplate size={16}/> Ir para Blueprints</button>{handoff.readyForWhiteboard && <button type="button" onClick={createFromDefinition}><Plus size={16}/> Com contexto</button>}<button type="button" className="primary" onClick={() => setShowCreate(true)}><Plus size={16}/> Novo whiteboard</button></div></header>

    {boards.length > 0 && <div className="bo-h711-summary" data-whiteboard-health-summary="1">
      <div><span>QUADROS</span><strong>{summary.total}</strong><small>Whiteboards livres</small></div>
      <div><span>OBJETOS VINCULADOS</span><strong>{summary.smart}</strong><small>Usados em outros contextos</small></div>
      <div><span>CONEXÕES</span><strong>{summary.connections}</strong><small>Relações visíveis</small></div>
      <div><span>COM CONTEXTO</span><strong>{summary.contextual}</strong><small>Ligados à Definition</small></div>
    </div>}

    {handoff.readyForWhiteboard && <div className="bo-h78-library-hint" data-whiteboard-context-handoff="1"><strong>Pessoas, problemas e evidências já disponíveis</strong><span>{handoff.counts.persona} Persona · {handoff.counts.problem} Problema · {handoff.counts.evidence} Evidência · {handoff.supporting.length} relações de suporte.</span><button type="button" onClick={createFromDefinition}>Criar com registros existentes</button></div>}

    <div className="bo-h711-commandbar">
      <label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar whiteboard..."/></label>
      <div aria-label="Filtros do Whiteboard"><Filter size={15}/>{([
        ['all', 'Todos'], ['context', 'Com contexto'], ['journey', 'Com Jornada'], ['attention', 'Precisa atenção'],
      ] as Array<[BoardFilter, string]>).map(([key, label]) => <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}</div>
    </div>

    {filteredBoards.length ? <div className="bo1189-board-grid">{filteredBoards.map((board) => <article key={board.id} className="bo1193-board-card bo-h711-board-card" data-whiteboard-studio-status={board.report?.status ?? 'blank'}>
      <button type="button" className="bo1193-card-menu-trigger" aria-label={`Ações de ${board.name}`} onClick={() => setMenuBoardId(menuBoardId === board.id ? null : board.id)}>•••</button>
      {menuBoardId === board.id && <div className="bo1193-card-menu bo-h711-card-menu">
        {board.contextCount > 0 && <button type="button" onClick={() => syncContext(board.id)}><RefreshCw size={13}/> Sincronizar contexto</button>}
        <button type="button" onClick={() => syncJourney(board.id, board.journeyId)}><GitBranch size={13}/> Trazer Journey</button>
        {blueprintCount > 0 && <button type="button" onClick={() => syncBlueprint(board.id)}><LayoutTemplate size={13}/> Trazer Blueprint</button>}
        <button type="button" onClick={() => { setRenameBoard({ id: board.id, name: board.name }); setRenameValue(board.name); setMenuBoardId(null); }}>Renomear</button>
        <button type="button" onClick={() => duplicate(board.id)}>Duplicar</button>
        <button type="button" className="danger" onClick={() => void remove(board.id)}>Excluir</button>
      </div>}
      <button type="button" className="bo1189-board-preview bo-editor-board-preview" aria-label={`Abrir ${board.name}`} onClick={() => void open(board.id)}><BoardPreview board={graph.views.whiteboards[board.id]} graph={graph}/></button>
      <div className="bo1193-board-copy"><span>WHITEBOARD · {statusLabel(board.report?.status ?? 'blank')}</span><strong>{board.name}</strong><small>{board.itemCount} objetos · {board.edgeCount} conexões{board.contextCount ? ` · ${board.contextCount} vínculos de contexto` : ''}</small></div>
      {board.report && board.report.danglingSmartObjects > 0 && <div className="bo-h711-health"><span><ShieldCheck size={13}/> Referências para revisar</span><strong>{board.report.danglingSmartObjects}</strong><div><i style={{ width: `${board.report.qualityScore}%` }}/></div><small>{board.report.contextTotal ? `${board.report.contextCoverage}% do contexto representado` : 'Quadro livre sem contexto obrigatório'}{board.report.danglingSmartObjects ? ` · ${board.report.danglingSmartObjects} referência(s) ausente(s)` : ''}</small></div>}
      <button type="button" onClick={() => void open(board.id)}>Abrir <ArrowRight size={14}/></button>
    </article>)}</div> : <div className="bo1189-board-empty"><LayoutTemplate size={28}/><strong>{boards.length ? 'Nenhum Whiteboard corresponde aos filtros' : 'Nenhum Whiteboard ainda'}</strong><p>{boards.length ? 'Ajuste a busca ou os filtros para voltar a exibir seus quadros.' : 'Crie um quadro livre ou comece diretamente do Contexto validado do serviço.'}</p><div className="bo1190-empty-actions"><button type="button" onClick={openBlueprints}><LayoutTemplate size={15}/> Abrir Blueprints</button><button type="button" className="secondary" onClick={() => setShowCreate(true)}><Plus size={15}/> Criar whiteboard</button></div></div>}

    {renameBoard && <div className="bo1189-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setRenameBoard(null); }}><form className="bo1189-modal bo1193-rename-modal" onSubmit={(e) => { e.preventDefault(); rename(); }}><header><div><span>WHITEBOARD</span><h2>Renomear quadro</h2><p>O novo nome será usado na biblioteca e no cabeçalho do Whiteboard.</p></div><button type="button" aria-label="Fechar" onClick={() => setRenameBoard(null)}><X size={18}/></button></header><label>Nome do quadro<input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} /></label><footer><button type="button" onClick={() => setRenameBoard(null)}>Cancelar</button><button type="submit">Salvar nome</button></footer></form></div>}
    {showCreate && <div className="bo1189-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) { setShowCreate(false); setGuidedFreeStart(false); } }}><form className="bo1189-modal bo-h167-whiteboard-start" onSubmit={(e) => { e.preventDefault(); void create(); }}><header><div><span>NOVO WHITEBOARD</span><h2>{guidedFreeStart ? 'Começar livre no Whiteboard' : 'Como você quer começar?'}</h2><p>{guidedFreeStart ? 'Dê um nome ao quadro e comece visualmente. Pessoas, necessidades, dores e evidências podem ser registradas no próprio raciocínio e organizadas depois.' : 'Não existe ordem obrigatória. Traga o que já sabe ou comece livre e registre pessoas, necessidades, dores e problemas conforme eles aparecerem.'}</p></div><button type="button" aria-label="Fechar" onClick={() => { setShowCreate(false); setGuidedFreeStart(false); }}><X size={18}/></button></header>{!guidedFreeStart && <div className="bo-h167-whiteboard-start__choices"><article><strong>Começar livre</strong><p>Abra um quadro vazio. Dentro do Whiteboard você pode criar Persona, Necessidade, Dor, Evidência e outros objetos canônicos sem sair do raciocínio visual.</p></article>{handoff.readyForWhiteboard && <article><strong>Usar o que já foi pesquisado</strong><p>Leve Personas, Necessidades/Dores relacionadas, Problemas e Evidências já estruturados para o quadro.</p><button type="button" onClick={() => { setShowCreate(false); setGuidedFreeStart(false); createFromDefinition(); }}>Criar com registros existentes <ArrowRight size={13}/></button></article>}</div>}<label>Nome do quadro<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Exploração da coleta e entrega" /></label><footer><button type="button" onClick={() => { setShowCreate(false); setGuidedFreeStart(false); }}>Cancelar</button><button type="submit">{guidedFreeStart ? 'Criar e começar' : 'Começar livre'}</button></footer></form></div>}
  </section>;
}

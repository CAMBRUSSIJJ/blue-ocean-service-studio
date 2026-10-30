import { useEffect, useMemo, useRef, useState } from 'react';
import type { ServiceGraph } from '../domain/model';
import {
  createCanvasEntity, legacyItemsForCanvas, linkEntityToWhiteboard,
  type WhiteboardCanvasKind,
} from '../services/whiteboard-blocksuite-bridge';
import { contextEntityTitle } from '../services/context-library';
import './blocksuite-workspace.css';

type Props = {
  boardId: string;
  boardName: string;
  serviceId: string;
  graph: ServiceGraph;
  onChangeGraph: (next: ServiceGraph, tag: string) => void;
  onClose: () => void;
  onOpenLegacy: () => void;
};

type CanvasMode = 'canvas' | 'page';
type EditorMessage = { source: 'blue-ocean-blocksuite'; version: 2; boardId: string; serviceId: string; type: string; text?: string; count?: number };

const OBJECT_TYPES: Array<{ kind: WhiteboardCanvasKind; label: string }> = [
  { kind: 'persona', label: 'Persona' },
  { kind: 'need', label: 'Necessidade' },
  { kind: 'pain', label: 'Dor' },
  { kind: 'job', label: 'Job' },
  { kind: 'problemHypothesis', label: 'Hipótese de problema' },
  { kind: 'evidence', label: 'Evidência' },
];

/** Blue Ocean owns navigation, service graph, context and UX.
 * BlockSuite remains a replaceable drawing engine in an isolated, same-origin frame.
 * No automatic migration, Yjs write-back, or unverified collaboration promises.
 */
export function BlockSuiteWorkspace({ boardId, boardName, serviceId, graph, onChangeGraph, onClose, onOpenLegacy }: Props) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [availability, setAvailability] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [editorReady, setEditorReady] = useState(false);
  const [mode, setMode] = useState<CanvasMode>('canvas');
  const [panelOpen, setPanelOpen] = useState(false);
  const [kind, setKind] = useState<WhiteboardCanvasKind>('need');
  const [title, setTitle] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('O desenho é salvo neste navegador.');
  const board = graph.views.whiteboards[boardId];
  const legacyItems = useMemo(() => legacyItemsForCanvas(graph, boardId), [graph, boardId]);
  const linked = useMemo(() => Object.values(board?.items ?? {}).filter(item => item.kind === 'smart'), [board]);
  const available = useMemo(() => OBJECT_TYPES.flatMap(type =>
    Object.values(graph.entities?.[type.kind] ?? {})
      .filter(entity => !entity.serviceId || entity.serviceId === serviceId)
      .filter(entity => contextEntityTitle(entity).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
      .map(entity => ({ ...type, id: entity.id, title: contextEntityTitle(entity) })),
  ).slice(0, 80), [graph, search, serviceId]);

  const post = (type: string, extra: Record<string, unknown> = {}) => {
    if (!editorReady) return false;
    frameRef.current?.contentWindow?.postMessage({ source: 'blue-ocean', version: 2, serviceId, boardId, type, ...extra }, window.location.origin);
    return true;
  };

  useEffect(() => {
    const controller = new AbortController();
    setEditorReady(false); setAvailability('checking');
    const check = async () => {
      try {
        const response = await fetch('/blocksuite/blue-ocean-blocksuite.json', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Editor indisponível');
        const manifest: unknown = await response.json();
        if (!manifest || typeof manifest !== 'object' || !('integration' in manifest) || manifest.integration !== 'blue-ocean-blocksuite') throw new Error('Manifesto inválido');
        if (!controller.signal.aborted) setAvailability('ready');
      } catch {
        if (!controller.signal.aborted) setAvailability('missing');
      }
    };
    void check();
    const onMessage = (event: MessageEvent<EditorMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;
      const message = event.data;
      if (!message || message.source !== 'blue-ocean-blocksuite' || message.version !== 2 || message.boardId !== boardId || message.serviceId !== serviceId) return;
      if (message.type === 'READY') { setEditorReady(true); setNotice('Salvo neste navegador · mantenha um backup do quadro.'); }
      if (message.type === 'SAVED') setNotice('Alterações salvas neste navegador.');
      if (message.type === 'ERROR') setNotice(message.text ?? 'Não foi possível executar esta ação.');
      if (message.type === 'SELECTION') setSelectedText((message.text ?? '').slice(0, 240));
      if (message.type === 'IMPORT_DONE') setNotice(message.count ? `${message.count} elemento(s) copiado(s) sem alterar o quadro anterior.` : 'Os elementos já estavam no canvas.');
    };
    window.addEventListener('message', onMessage);
    return () => { controller.abort(); window.removeEventListener('message', onMessage); };
  }, [boardId, serviceId]);

  const insertReference = (kind: WhiteboardCanvasKind, id: string, label: string) => {
    const result = linkEntityToWhiteboard(graph, boardId, kind, id);
    if (result.linked) onChangeGraph(result.graph, 'Whiteboard: vincular objeto ao canvas visual');
    if (post('INSERT_REFERENCES', { items: [{ id: `smart:${kind}:${id}`, text: `${OBJECT_TYPES.find(x => x.kind === kind)?.label}: ${label}`, kind: 'reference' }] })) {
      setNotice('Objeto vinculado ao serviço e enviado ao canvas.');
    } else setNotice('O editor ainda está abrindo. Tente novamente.');
  };

  const addEntity = () => {
    const value = (title.trim() || selectedText.trim()).slice(0, 240);
    if (!value) { setNotice('Escreva o conteúdo do objeto ou selecione um texto no canvas.'); return; }
    if (!editorReady) { setNotice('O editor ainda está abrindo.'); return; }
    const result = createCanvasEntity(graph, boardId, kind, value);
    if (!result.entityId) { setNotice('Não foi possível criar o objeto.'); return; }
    onChangeGraph(result.graph, 'Whiteboard: criar objeto canônico a partir do canvas');
    post('INSERT_REFERENCES', { items: [{ id: `smart:${kind}:${result.entityId}`, text: `${OBJECT_TYPES.find(x => x.kind === kind)?.label}: ${value}`, kind: 'reference' }] });
    setTitle(''); setSelectedText('');
    setNotice('Objeto criado no Service Graph e vinculado ao Whiteboard.');
  };

  const importLegacy = () => {
    if (!legacyItems.length) return;
    if (!post('IMPORT_LEGACY', { items: legacyItems })) { setNotice('O editor ainda está abrindo.'); return; }
    setNotice('Importando cópias dos cartões anteriores…');
  };

  const params = new URLSearchParams({ boardId, serviceId, title: boardName });
  return <div className="bo-bs-overlay" role="dialog" aria-modal="true" aria-labelledby="bo-bs-window-title" data-blocksuite-integration="v2" data-whiteboard-primary-editor="blocksuite">
    <header className="bo-bs-topbar">
      <div className="bo-bs-topbar__title">
        <button type="button" className="bo-bs-back" onClick={onClose} ref={closeRef} aria-label="Voltar aos Whiteboards">←</button>
        <div><span>BLUE OCEAN / WHITEBOARD</span><strong id="bo-bs-window-title" title={boardName}>{boardName}</strong></div>
      </div>
      <nav className="bo-bs-modes" aria-label="Visualização do editor">
        <button type="button" className={mode === 'canvas' ? 'active' : ''} aria-pressed={mode === 'canvas'} onClick={() => { setMode('canvas'); post('MODE', { mode: 'canvas' }); }}>Canvas</button>
        <button type="button" className={mode === 'page' ? 'active' : ''} aria-pressed={mode === 'page'} onClick={() => { setMode('page'); post('MODE', { mode: 'page' }); }}>Documento</button>
      </nav>
      <div className="bo-bs-top-actions">
        <span className="bo-bs-save-indicator" role="status">{notice}</span>
        <button type="button" className={panelOpen ? 'active' : ''} aria-expanded={panelOpen} aria-controls="bo-bs-service-panel" onClick={() => setPanelOpen(!panelOpen)}>Objetos do serviço</button>
        <button type="button" onClick={() => post('EXPORT')} disabled={!editorReady}>Exportar</button>
        <button type="button" onClick={onOpenLegacy}>Quadro clássico</button>
      </div>
    </header>
    <div className="bo-bs-body">
      {availability === 'checking' && <div className="bo-bs-placeholder" role="status">Carregando canvas visual…</div>}
      {availability === 'missing' && <div className="bo-bs-placeholder" role="status"><h2>O canvas visual não está disponível</h2><p>Você pode continuar editando o quadro clássico sem perder os dados. Verifique a compilação do adaptador BlockSuite.</p><button type="button" onClick={onOpenLegacy}>Abrir quadro clássico</button></div>}
      {availability === 'ready' && <iframe ref={frameRef} title={`Canvas visual de ${boardName}`} className="bo-bs-frame"
        src={`/blocksuite/index.html?${params.toString()}`} sandbox="allow-scripts allow-same-origin allow-downloads" />}
      {panelOpen && <aside className="bo-bs-panel" id="bo-bs-service-panel" aria-label="Objetos do serviço">
        <div className="bo-bs-panel-intro"><div><span>CONTEXTO DO SERVIÇO</span><h2>Objetos conectados</h2></div><button type="button" aria-label="Fechar painel" onClick={() => setPanelOpen(false)}>×</button></div>
        <p>Crie ou vincule objetos reutilizáveis nas Personas, Necessidades, Dores, Jobs e Evidências do serviço.</p>
        <div className="bo-bs-panel-section"><h3>Transformar em objeto</h3><label>Tipo
          <select value={kind} onChange={event => setKind(event.target.value as WhiteboardCanvasKind)}>
            {OBJECT_TYPES.map(item => <option key={item.kind} value={item.kind}>{item.label}</option>)}
          </select>
        </label>
          <label>Título
            <input value={title} onChange={event => setTitle(event.target.value)} placeholder={selectedText || 'Descreva o objeto…'} maxLength={240} />
          </label>
          {selectedText && <small>Texto selecionado: “{selectedText}”</small>}
          <button type="button" className="primary" onClick={addEntity} disabled={!editorReady}>Criar e vincular</button>
        </div>
        {legacyItems.length > 0 && <div className="bo-bs-panel-section"><h3>Conteúdo anterior</h3>
          <p>{legacyItems.length} cartão(ões) do quadro clássico disponíveis para copiar. A cópia não apaga nem modifica os originais.</p>
          <button type="button" onClick={importLegacy} disabled={!editorReady}>Copiar cartões para o canvas</button>
        </div>}
        <div className="bo-bs-panel-section"><h3>Objetos já vinculados <span>{linked.length}</span></h3>
          <label>Buscar no serviço<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Filtrar objetos…" /></label>
          <div className="bo-bs-entity-list">{available.map(item =>
            <button type="button" key={item.kind + ':' + item.id} onClick={() => insertReference(item.kind, item.id, item.title)} disabled={!editorReady}>
              <span>{item.label}</span><strong>{item.title}</strong><small>Adicionar ao canvas →</small>
            </button>)}</div>
          {!available.length && <p>Nenhum objeto encontrado.</p>}
        </div>
        <div className="bo-bs-panel-foot">O canvas usa armazenamento local. O Service Graph mantém os objetos canônicos e seus vínculos.</div>
      </aside>}
    </div>
  </div>;
}

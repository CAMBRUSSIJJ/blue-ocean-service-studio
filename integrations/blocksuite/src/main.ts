import { AffineSchemas } from '@blocksuite/blocks';
import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { effects as presetsEffects } from '@blocksuite/presets/effects';
import { EdgelessEditor, PageEditor } from '@blocksuite/presets';
import { DocCollection, Job, Schema, Text } from '@blocksuite/store';
import { IndexeddbPersistence } from 'y-indexeddb';
import './style.css';

/**
 * Blue Ocean ↔ BlockSuite boundary (v1):
 * - BoardId and serviceId are opaque IDs provided by the existing application.
 * - Editing remains inside a separate Yjs document and NEVER mutates ServiceGraph.
 * - This is an opt-in local pilot; remote collaboration and canonical-object
 *   conversion require a later, explicitly versioned adapter.
 */
const params = new URLSearchParams(window.location.search);
const boardId = params.get('boardId')?.trim() ?? '';
const serviceId = params.get('serviceId')?.trim() ?? '';
const boardName = params.get('title')?.trim().slice(0, 120) || 'Whiteboard';
const app = document.getElementById('app');

if (!app) throw new Error('Editor: elemento raiz ausente.');

function text(node: HTMLElement, message: string) {
  node.textContent = message;
}

async function main() {
  if (!boardId || !serviceId || boardId.length > 180 || serviceId.length > 180) {
    throw new Error('Abra este editor pela biblioteca de Whiteboards do Blue Ocean.');
  }

  const storageKey = `blue-ocean-blocksuite-v1:${encodeURIComponent(serviceId)}:${encodeURIComponent(boardId)}`;
  blocksEffects();
  presetsEffects();
  const schema = new Schema().register(AffineSchemas);
  const collection = new DocCollection({ schema });
  collection.meta.initialize();
  const doc = collection.createDoc({ id: 'visual-board' });

  // Load CRDT changes BEFORE creating the default blocks. This prevents
  // an existing visual document from being reinitialized on every opening.
  const persistence = new IndexeddbPersistence(storageKey, doc.spaceDoc);
  await new Promise<void>((resolve, reject) => {
    if (persistence.synced) { resolve(); return; }
    const timeout = window.setTimeout(() => reject(new Error('O armazenamento local não respondeu.')), 12000);
    persistence.once('synced', () => { window.clearTimeout(timeout); resolve(); });
  });

  doc.load(() => {
    if (!doc.getBlockByFlavour('affine:page').length) {
      const root = doc.addBlock('affine:page', { title: new Text(boardName) });
      doc.addBlock('affine:surface', {}, root);
      const note = doc.addBlock('affine:note', {}, root);
      doc.addBlock('affine:paragraph', { text: new Text('') }, note);
    }
  });

  app!.replaceChildren();

  const root = document.createElement('section');
  root.className = 'bo-bs-shell';

  // The Blue Ocean React shell owns the toolbar, object context, and navigation.
  // This frame only hosts the licensed BlockSuite editing engine.
  const canvas = document.createElement('div');
  canvas.className = 'bo-bs-canvas';
  canvas.setAttribute('aria-label', 'Canvas visual do Blue Ocean');
  root.append(canvas);
  app!.append(root);

  const notify = (type: string, extra: Record<string, unknown> = {}) => {
    if (window.parent !== window) window.parent.postMessage({
      source: 'blue-ocean-blocksuite', version: 2, boardId, serviceId, type, ...extra,
    }, window.location.origin);
  };

  // BlockSuite 0.19.x needs custom-element registration before construction.
  // The effects are initialized before the document is loaded.
  if (!customElements.get('edgeless-editor')) customElements.define('edgeless-editor', EdgelessEditor);
  if (!customElements.get('page-editor')) customElements.define('page-editor', PageEditor);
  const edgeless = document.createElement('edgeless-editor') as EdgelessEditor;
  const page = document.createElement('page-editor') as PageEditor;
  edgeless.doc = doc;
  page.doc = doc;
  edgeless.style.cssText = 'display:block;width:100%;height:100%';
  page.style.cssText = 'display:block;width:100%;height:100%';

  const setMode = (mode: 'canvas' | 'page') => {
    canvas.replaceChildren(mode === 'canvas' ? edgeless : page);
  };
  setMode('canvas');

  const imported = doc.spaceDoc.getMap<boolean>('blue-ocean-visual-references-v2');
  const rootPage = doc.getBlockByFlavour('affine:page')[0];
  let placed = 0;
  const addVisualNote = (item: { id: string; text: string; x?: number; y?: number; width?: number; height?: number }) => {
    if (!rootPage || !item.id || imported.get(item.id) || !item.text.trim()) return false;
    const x = Number.isFinite(item.x) ? Math.max(-100000, Math.min(100000, Number(item.x))) : 90 + placed % 4 * 320;
    const y = Number.isFinite(item.y) ? Math.max(-100000, Math.min(100000, Number(item.y))) : 100 + Math.floor(placed / 4) * 220;
    const width = Number.isFinite(item.width) ? Math.max(160, Math.min(1800, Number(item.width))) : 280;
    const height = Number.isFinite(item.height) ? Math.max(100, Math.min(1200, Number(item.height))) : 160;
    const xywh = `[${x},${y},${width},${height}]` as `[${number},${number},${number},${number}]`;
    const noteId = doc.addBlock('affine:note', { xywh }, rootPage.id);
    doc.addBlock('affine:paragraph', { text: new Text(item.text.slice(0, 5000)) }, noteId);
    imported.set(item.id, true);
    placed += 1;
    return true;
  };

  // H7.62: drive the *native* BlockSuite 0.19.5 gfx tools.
  // No parallel canvas: notes, frames, shapes, connectors and groups all remain
  // in the existing Yjs document persisted under the original storageKey.
  type NativeElement = { id: string; xywh?: string; type?: string; flavour?: string };
  type NativeRootService = {
    gfx: {
      tool: { setTool(name: string, options?: Record<string, unknown>): void; currentToolName$: { value: string } };
      selection: { selectedElements: NativeElement[] };
    };
    viewport: { center: [number, number] };
    frame: { createFrameOnSelected(): unknown };
    updateElement(id: string, props: Record<string, unknown>): void;
    createGroupFromSelected(): unknown;
    setZoomByAction(action: 'in' | 'out' | 'fit' | 'reset'): void;
  };
  const nativeRoot = () => edgeless.std.getService('affine:page') as unknown as NativeRootService;
  const toolNames: Record<string, string> = {
    select: 'default', hand: 'pan', note: 'affine:note', text: 'text',
    rect: 'shape', ellipse: 'shape', diamond: 'shape',
    connector: 'connector', brush: 'brush', eraser: 'eraser', frame: 'frame',
  };
  const activateTool = (tool: string) => {
    const name = toolNames[tool];
    if (!name) throw new Error('Ferramenta desconhecida.');
    const options: Record<string, unknown> = tool === 'note'
      ? { childFlavour: 'affine:paragraph', childType: 'text', tip: 'Clique para adicionar uma nota' }
      : name === 'shape' ? { shapeName: tool === 'ellipse' ? 'ellipse' : tool === 'diamond' ? 'diamond' : 'rect' }
      : name === 'connector' ? { mode: 1 /* ConnectorMode.Orthogonal, BlockSuite 0.19.5 */ }
      : name === 'pan' ? { panning: false } : {};
    nativeRoot().gfx.tool.setTool(name, options);
    notify('TOOL_CHANGED', { tool });
  };
  const selectedBounds = () => nativeRoot().gfx.selection.selectedElements
    .filter(element => element.type !== 'connector' && element.type !== 'group' && typeof element.xywh === 'string')
    .map(element => {
      let coords: unknown;
      try { coords = JSON.parse(element.xywh || ''); } catch { coords = null; }
      if (!Array.isArray(coords) || coords.length !== 4 || !coords.every(value => typeof value === 'number' && Number.isFinite(value))) return null;
      const [x, y, w, h] = coords as number[];
      if (w <= 0 || h <= 0) return null;
      return { element, x, y, w, h };
    }).filter((item): item is { element: NativeElement; x: number; y: number; w: number; h: number } => Boolean(item));
  const organize = (action: string): string => {
    const service = nativeRoot();
    const items = selectedBounds();
    if (items.length < (action === 'frame-selection' ? 1 : 2)) throw new Error(action === 'frame-selection'
      ? 'Selecione um ou mais objetos antes de criar um Frame.'
      : 'Selecione pelo menos dois objetos com Shift antes de organizar.');
    if (action === 'group') {
      doc.captureSync();
      const grouped = service.createGroupFromSelected();
      if (!grouped) throw new Error('Estes objetos não podem ser agrupados. Selecione cartões ou formas do mesmo nível.');
      return 'Grupo criado sem alterar o conteúdo.';
    }
    if (action === 'frame-selection') {
      const framed = service.frame.createFrameOnSelected();
      if (!framed) throw new Error('Não foi possível criar um Frame com esta seleção.');
      return 'Frame criado ao redor da seleção.';
    }
    if (action === 'distribute' && items.length < 3) throw new Error('Selecione ao menos três objetos para distribuir.');
    // Do not touch frames/notes outside the user selection or overwrite their content.
    doc.captureSync();
    const positions = new Map<string, [number, number]>();
    if (action === 'align-left') {
      const x = Math.min(...items.map(item => item.x));
      items.forEach(item => positions.set(item.element.id, [x, item.y]));
    } else if (action === 'distribute') {
      const sorted = [...items].sort((a, b) => a.x - b.x);
      const first = sorted[0].x, last = sorted[sorted.length - 1].x;
      sorted.forEach((item, i) => positions.set(item.element.id, [first + (last - first) * i / (sorted.length - 1), item.y]));
    } else if (action === 'organize-grid') {
      const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
      const columns = Math.ceil(Math.sqrt(sorted.length));
      const startX = Math.min(...sorted.map(item => item.x));
      const startY = Math.min(...sorted.map(item => item.y));
      let rowY = startY;
      for (let index = 0; index < sorted.length; index += columns) {
        const row = sorted.slice(index, index + columns);
        let x = startX;
        for (const item of row) { positions.set(item.element.id, [x, rowY]); x += item.w + 36; }
        rowY += Math.max(...row.map(item => item.h)) + 36;
      }
    } else throw new Error('Ação de organização desconhecida.');
    for (const item of items) {
      const p = positions.get(item.element.id);
      if (p) service.updateElement(item.element.id, { xywh: JSON.stringify([p[0], p[1], item.w, item.h]) });
    }
    return items.length + ' objetos organizados. Ctrl+Z desfaz a operação.';
  };
  const addStarterTemplate = (action: 'template-brainstorm' | 'template-affinity') => {
    // Layout seeds are native note blocks (not fabricated Service Graph records).
    // Existing visual content is never cleared or replaced.
    if (doc.getBlockByFlavour('affine:note').length > 900) throw new Error('Quadro muito grande. Organize o conteúdo existente antes de inserir um modelo.');
    const center = nativeRoot().viewport.center;
    const cx = Array.isArray(center) && Number.isFinite(center[0]) ? center[0] : 600;
    const cy = Array.isArray(center) && Number.isFinite(center[1]) ? center[1] : 400;
    const titles = action === 'template-brainstorm'
      ? ['Pergunta central — o que queremos resolver?', 'Ideia 1', 'Ideia 2', 'Ideia 3', 'Ideia 4', 'Próximos passos']
      : ['Tema A — agrupar descobertas', 'Tema B — agrupar descobertas', 'Tema C — agrupar descobertas', 'Pontos em comum', 'Questões abertas', 'Oportunidades'];
    const x = cx - 450, y = cy - 275;
    const templateId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
    doc.captureSync();
    let created = 0;
    titles.forEach((label, i) => {
      if (addVisualNote({ id: 'h762:' + templateId + ':' + i, text: label, x: x + i % 3 * 320, y: y + Math.floor(i / 3) * 220, width: 280, height: 160 })) created++;
    });
    return created + ' notas inseridas. Edite-as diretamente no canvas.';
  };
  const runAction = (action: string) => {
    if (['align-left', 'distribute', 'organize-grid', 'group', 'frame-selection'].includes(action)) return organize(action);
    if (action === 'template-brainstorm' || action === 'template-affinity') return addStarterTemplate(action);
    if (action === 'zoom-in' || action === 'zoom-out' || action === 'zoom-fit') {
      nativeRoot().setZoomByAction(action === 'zoom-in' ? 'in' : action === 'zoom-out' ? 'out' : 'fit');
      return 'Visualização ajustada.';
    }
    const history = doc as unknown as { undo?: () => void; redo?: () => void };
    if (action === 'undo' && history.undo) { history.undo(); return 'Última ação desfeita.'; }
    if (action === 'redo' && history.redo) { history.redo(); return 'Ação refeita.'; }
    throw new Error('Esta ação não está disponível no editor atual.');
  };
  // Native tools may revert to selection after placing a shape/connection.
  canvas.addEventListener('pointerup', () => {
    window.setTimeout(() => {
      const current = nativeRoot().gfx.tool.currentToolName$?.value;
      if (current === 'default') notify('TOOL_CHANGED', { tool: 'select' });
    }, 0);
  }, true);

  const exportCopy = async () => {
    try {
      const snapshot = await new Job({ collection }).docToSnapshot(doc);
      const blob = new Blob([JSON.stringify({
        format: 'blue-ocean-blocksuite-snapshot-v1', serviceId, boardId,
        exportedAt: new Date().toISOString(), snapshot,
      })], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `blue-ocean-visual-${boardId.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      notify('SAVED');
    } catch (error) {
      notify('ERROR', { text: 'Não foi possível exportar o quadro visual.' });
      console.error('BlockSuite export:', error);
    }
  };

  type BridgeItem = { id: string; text: string; x?: number; y?: number; width?: number; height?: number };
  const safeItems = (value: unknown): BridgeItem[] => Array.isArray(value)
    ? value.slice(0, 250).filter((item): item is BridgeItem =>
      item !== null && typeof item === 'object' &&
      typeof (item as BridgeItem).id === 'string' && typeof (item as BridgeItem).text === 'string' &&
      (item as BridgeItem).id.length <= 250).map(item => ({
      ...item, id: item.id.slice(0, 250), text: item.text.slice(0, 5000),
    })) : [];

  const onBridgeMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    const message = event.data;
    if (!message || message.source !== 'blue-ocean' || message.version !== 2 ||
        message.boardId !== boardId || message.serviceId !== serviceId) return;
    if (message.type === 'TOOL' && typeof message.tool === 'string') {
      try { activateTool(message.tool); }
      catch (error) { notify('ERROR', { text: error instanceof Error ? error.message : 'Falha ao ativar ferramenta.' }); }
    } else if (message.type === 'ACTION' && typeof message.action === 'string') {
      try { notify('COMMAND_RESULT', { text: runAction(message.action) }); }
      catch (error) { notify('ERROR', { text: error instanceof Error ? error.message : 'Ação não disponível.' }); }
    } else if (message.type === 'MODE' && (message.mode === 'canvas' || message.mode === 'page')) {
      setMode(message.mode);
    } else if (message.type === 'EXPORT') {
      void exportCopy();
    } else if (message.type === 'INSERT_REFERENCES' || message.type === 'IMPORT_LEGACY') {
      let count = 0;
      for (const item of safeItems(message.items)) {
        try { if (addVisualNote(item)) count += 1; }
        catch (error) { console.error('Falha ao inserir nota visual', error); }
      }
      notify('IMPORT_DONE', { count });
    }
  };
  window.addEventListener('message', onBridgeMessage);

  // A small, content-derived note preview is cached separately from the Yjs
  // source of truth. It never writes back into the visual document.
  const cacheNotePreview = () => {
    try {
      const notes = doc.getBlockByFlavour('affine:note').slice(0, 32).map((note, index) => {
        const model = note as unknown as { xywh?: unknown; children?: unknown[] };
        const getText = (block: unknown, depth = 0): string => {
          if (!block || typeof block !== 'object' || depth > 3) return '';
          const value = block as { text?: { toString?: () => string }; children?: unknown[] };
          const own = typeof value.text?.toString === 'function' ? value.text.toString() : '';
          const nested = Array.isArray(value.children)
            ? value.children.slice(0, 30).map(child => getText(child, depth + 1)).filter(Boolean).join(' ')
            : '';
          return (own + ' ' + nested).trim().slice(0, 140);
        };
        const coordinates = typeof model.xywh === 'string'
          ? model.xywh.replace(/[\[\]]/g, '').split(',').map(Number)
          : [];
        const [rawX, rawY, rawW, rawH] = coordinates;
        return {
          x: Number.isFinite(rawX) ? Math.max(-100000, Math.min(100000, rawX)) : 80 + index % 4 * 280,
          y: Number.isFinite(rawY) ? Math.max(-100000, Math.min(100000, rawY)) : 80 + Math.floor(index / 4) * 180,
          width: Number.isFinite(rawW) ? Math.max(100, Math.min(1800, rawW)) : 240,
          height: Number.isFinite(rawH) ? Math.max(70, Math.min(1200, rawH)) : 150,
          text: getText(model),
        };
      }).filter(note => note.text.length > 0);
      const cacheKey = `bo-whiteboard-thumbnail-v1:${encodeURIComponent(serviceId)}:${encodeURIComponent(boardId)}`;
      localStorage.setItem(cacheKey, JSON.stringify({ version: 1, notes, updatedAt: Date.now() }));
    } catch { /* Preview is optional. Yjs remains the only visual-document source. */ }
  };

  // Provide selected text for a deliberate conversion to a canonical Blue Ocean object.
  let lastSelected = '';
  const notifySelection = () => {
    const selected = (window.getSelection()?.toString() ?? '').trim().slice(0, 240);
    if (selected !== lastSelected) { lastSelected = selected; notify('SELECTION', { text: selected }); }
  };
  canvas.addEventListener('mouseup', notifySelection, true);
  canvas.addEventListener('keyup', notifySelection, true);
  let saveTimer: number | undefined;
  const onUpdate = () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => { cacheNotePreview(); notify('SAVED'); }, 700);
  };
  doc.spaceDoc.on('update', onUpdate);
  cacheNotePreview();
  notify('READY');

  window.addEventListener('pagehide', () => { window.clearTimeout(saveTimer); window.removeEventListener('message', onBridgeMessage); doc.spaceDoc.off('update', onUpdate); void persistence.destroy(); }, { once: true });
}

main().catch(error => {
  const reason = (error instanceof Error ? error.message : 'Falha inesperada.').slice(0, 400);
  // A child frame might fail before its READY handshake. Report the failure to
  // the React shell instead of leaving the user stuck at a loading spinner.
  if (window.parent !== window) window.parent.postMessage({
    source: 'blue-ocean-blocksuite', version: 2, boardId, serviceId, type: 'INIT_ERROR', text: reason,
  }, window.location.origin);
  if (!app) return;
  const fallback = document.createElement('div');
  fallback.className = 'bo-bs-error';
  const heading = document.createElement('h2');
  heading.textContent = 'Não foi possível abrir o editor';
  const message = document.createElement('p');
  message.textContent = error instanceof Error ? error.message : 'Falha inesperada.';
  fallback.append(heading, message);
  app.replaceChildren(fallback);
  console.error('Blue Ocean BlockSuite:', error);
});

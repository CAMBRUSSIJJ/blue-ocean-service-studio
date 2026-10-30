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
    if (message.type === 'MODE' && (message.mode === 'canvas' || message.mode === 'page')) {
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
    saveTimer = window.setTimeout(() => notify('SAVED'), 700);
  };
  doc.spaceDoc.on('update', onUpdate);
  notify('READY');

  window.addEventListener('pagehide', () => { window.clearTimeout(saveTimer); window.removeEventListener('message', onBridgeMessage); doc.spaceDoc.off('update', onUpdate); void persistence.destroy(); }, { once: true });
}

main().catch(error => {
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

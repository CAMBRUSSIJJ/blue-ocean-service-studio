import { AffineSchemas } from '@blocksuite/blocks';
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

  const bar = document.createElement('header');
  bar.className = 'bo-bs-header';

  const context = document.createElement('div');
  context.className = 'bo-bs-context';
  const overline = document.createElement('span');
  text(overline, 'BLUE OCEAN · EDITOR VISUAL');
  const heading = document.createElement('h1');
  text(heading, boardName);
  context.append(overline, heading);

  const actions = document.createElement('div');
  actions.className = 'bo-bs-actions';

  const modeSwitch = document.createElement('div');
  modeSwitch.className = 'bo-bs-mode';
  const edgelessButton = document.createElement('button');
  edgelessButton.type = 'button';
  text(edgelessButton, 'Canvas');
  const pageButton = document.createElement('button');
  pageButton.type = 'button';
  text(pageButton, 'Documento');
  modeSwitch.append(edgelessButton, pageButton);

  const backup = document.createElement('button');
  backup.type = 'button';
  backup.className = 'bo-bs-backup';
  text(backup, 'Exportar cópia');

  const status = document.createElement('span');
  status.className = 'bo-bs-status';
  status.setAttribute('role', 'status');
  text(status, 'Armazenamento local');

  actions.append(modeSwitch, backup, status);
  bar.append(context, actions);

  const canvas = document.createElement('div');
  canvas.className = 'bo-bs-canvas';
  canvas.setAttribute('aria-label', 'Editor visual do Blue Ocean');
  const notice = document.createElement('aside');
  notice.className = 'bo-bs-notice';
  text(notice, 'Versão experimental · as alterações ficam neste navegador e ainda não são sincronizadas com o Service Graph ou outros computadores.');
  root.append(bar, canvas, notice);
  app!.append(root);

  const edgeless = new EdgelessEditor();
  const page = new PageEditor();
  edgeless.doc = doc;
  page.doc = doc;
  edgeless.style.cssText = 'display:block;width:100%;height:100%';
  page.style.cssText = 'display:block;width:100%;height:100%';

  const setMode = (mode: 'canvas' | 'page') => {
    canvas.replaceChildren(mode === 'canvas' ? edgeless : page);
    edgelessButton.setAttribute('aria-pressed', String(mode === 'canvas'));
    pageButton.setAttribute('aria-pressed', String(mode === 'page'));
  };
  edgelessButton.addEventListener('click', () => setMode('canvas'));
  pageButton.addEventListener('click', () => setMode('page'));
  setMode('canvas');

  backup.addEventListener('click', async () => {
    backup.disabled = true;
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
      text(status, 'Cópia exportada');
    } catch (error) {
      text(status, 'Falha ao exportar');
      console.error('BlockSuite export:', error);
    } finally {
      backup.disabled = false;
    }
  });

  window.addEventListener('pagehide', () => { void persistence.destroy(); }, { once: true });
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

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const fakeIDB = require('fake-indexeddb');

function applyStorage(w, storage = {}) {
  for (const [key, value] of Object.entries(storage || {})) w.localStorage.setItem(key, value);
}
function storageSnapshot(w) {
  const out = {};
  for (let i = 0; i < w.localStorage.length; i++) {
    const key = w.localStorage.key(i);
    out[key] = w.localStorage.getItem(key);
  }
  return out;
}
function makeEnv(opts = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:4173/', pretendToBeVisual: true, runScripts: 'outside-only'
  });
  const w = dom.window;
  w.indexedDB = opts.indexedDB || fakeIDB.indexedDB;
  w.IDBKeyRange = fakeIDB.IDBKeyRange;
  w.matchMedia = q => ({ matches: opts.mobile ? /max-width:599px/.test(q) : false, media: q, addEventListener() {}, removeEventListener() {} });
  const VIEW = { left: 0, top: 48, right: 1440, bottom: 900, width: 1440, height: 852, x: 0, y: 48 };
  const ZERO = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 };
  w.Element.prototype.getBoundingClientRect = function () { return this.classList && this.classList.contains('rt144-view') ? VIEW : ZERO; };
  w.Element.prototype.setPointerCapture = function () {};
  w.Element.prototype.releasePointerCapture = function () {};
  w.Element.prototype.scrollIntoView = function () {};
  w.__hit = null;
  w.document.elementFromPoint = () => w.__hit;
  w.URL.createObjectURL = () => 'blob:sim';
  w.URL.revokeObjectURL = () => {};
  w.HTMLCanvasElement.prototype.getContext = () => null;
  w.__downloads = [];
  w.HTMLAnchorElement.prototype.click = function () { w.__downloads.push({ name: this.download, href: this.href }); };
  w.__reloads = 0;
  try { Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async () => {} }, configurable: true }); } catch {}
  w.__errors = [];
  w.addEventListener('error', e => w.__errors.push(String(e.message)));
  applyStorage(w, opts.storage);
  const bundle = path.join(__dirname, 'bundle.js');
  if (!fs.existsSync(bundle)) throw new Error('bundle.js ausente — execute build-sim.py');
  w.eval(fs.readFileSync(bundle, 'utf8'));
  return { dom, w };
}
function seedService(w, name = 'Café Aurora', description = 'Pedido e retirada em cafeteria de bairro') {
  const g = w.__simDomain?.createServiceGraph
    ? w.__simDomain.createServiceGraph(name, description)
    : (() => {
        const now = new Date().toISOString();
        return { schemaVersion: 3, entities: {}, research: { sources: {}, collections: {}, createdAt: now, updatedAt: now }, integrity: { schemaVersion: 3, migratedAt: now }, views: { whiteboards: {} },
          service: { id: 'service-' + Math.random().toString(36).slice(2, 8), name, description, journeyIds: [], createdAt: now, updatedAt: now },
          journeys: {}, stages: {}, touchpoints: {}, problems: {}, opportunities: {}, tasks: {}, blueprintDraft: { evidencias: '', frontstage: '', backstage: '', suporte: '' } };
      })();
  w.localStorage.setItem('realtalent-service-studio-v3-service-graph', JSON.stringify(g));
  return g;
}
module.exports = { makeEnv, seedService, storageSnapshot, applyStorage };

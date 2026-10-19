const { makeEnv, seedService, storageSnapshot } = require('./boot.cjs');
const fs = require('fs');
const path = require('path');
const results = [];
let phase = '';
const outputDir = path.resolve(process.env.SIM_OUTPUT_DIR || path.join(__dirname, 'results'));
fs.mkdirSync(outputDir, { recursive: true });

function record(id, title, status, detail = '', kind = null) {
  const inferred = kind || (status === 'PASS' || status === 'FAIL' ? 'assertion' : 'diagnostic');
  const row = { phase, id, title, kind: inferred, status, detail };
  results.push(row);
  console.log(`[${status}] ${id} ${title}${detail ? ' — ' + detail : ''}`);
  return row;
}
const rec = (id, title, status, detail = '') => record(id, title, status, detail);
const assert = (id, title, condition, detail = '') => record(id, title, condition ? 'PASS' : 'FAIL', detail, 'assertion');
const diagnostic = (id, title, detail = '', status = 'INFO') => record(id, title, status, detail, 'diagnostic');
const knownIssue = (id, title, present, detail = '') => record(id, title, present ? 'KNOWN' : 'RESOLVED', detail, 'known_issue');
const benchmark = (id, title, detail = '') => record(id, title, 'BENCH', detail, 'benchmark');

const flush = (w) => new Promise(r => w.requestAnimationFrame(() => w.requestAnimationFrame(() => r())));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function mk(w, type, o = {}) {
  const Ev = type.startsWith('key') ? w.KeyboardEvent : w.MouseEvent;
  const init = Object.assign({ bubbles: true, cancelable: true, view: w }, o);
  delete init.target;
  const e = new Ev(type, init);
  if (type.startsWith('pointer')) Object.defineProperty(e, 'pointerId', { value: o.pointerId || 1 });
  return e;
}
const ptr = (w, type, target, x = 0, y = 0, o = {}) => target.dispatchEvent(mk(w, type, Object.assign({ clientX: x, clientY: y }, o)));
function keyTarget(w, explicit) {
  if (explicit) return explicit;
  const active = w.document.activeElement;
  return active && active !== w.document.documentElement ? active : w.document.body;
}
function key(w, k, o = {}) {
  const target = keyTarget(w, o.target);
  const opts = Object.assign({ key: k, code: o.code || (k.length === 1 ? 'Key' + k.toUpperCase() : k) }, o);
  delete opts.target;
  const ev = mk(w, 'keydown', opts);
  target.dispatchEvent(ev);
  return ev;
}
function keyup(w, k, o = {}) {
  const target = keyTarget(w, o.target);
  const opts = Object.assign({ key: k, code: o.code || k }, o);
  delete opts.target;
  const ev = mk(w, 'keyup', opts);
  target.dispatchEvent(ev);
  return ev;
}
const $ = (w, s, r) => (r || w.document).querySelector(s);
const $$ = (w, s, r) => [...(r || w.document).querySelectorAll(s)];
const itemEl = (w, id) => $(w, `.rt144-item[data-id="${id}"]`);
async function dragItem(w, id, dx, dy, steps = 4) {
  const el = itemEl(w, id); if (!el) return false;
  ptr(w, 'pointerdown', el, 400, 300, { button: 0 });
  await flush(w);
  for (let i = 1; i <= steps; i++) ptr(w, 'pointermove', w.document, 400 + dx * i / steps, 300 + dy * i / steps);
  await flush(w);
  ptr(w, 'pointerup', w.document, 400 + dx, 300 + dy);
  await flush(w);
  return true;
}
async function fresh(opts = {}) {
  const { w } = makeEnv(opts);
  seedService(w, opts.serviceName || 'Café Aurora', opts.serviceDescription || 'Pedido e retirada em cafeteria de bairro');
  const wc = w.BlueOceanRuntime.api('whiteboardCore');
  await wc.createBlank(opts.boardName || 'Discovery — Café Aurora');
  await flush(w);
  return w;
}
function setPhase(p) { phase = p; console.log('\n=== ' + p + ' ==='); }
function save(name) {
  const file = path.join(outputDir, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(results, null, 2));
  return file;
}
function fill(root, name, value, w) {
  const el = root.querySelector(`[name="${name}"]`);
  if (!el) throw new Error(`campo [name=${name}] não encontrado`);
  el.value = value;
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
  el.dispatchEvent(new w.Event('change', { bubbles: true }));
  return el;
}
async function submitForm(w, values = {}, selector = '.rt144-modal form') {
  const form = $(w, selector);
  if (!form) throw new Error(`formulário não encontrado: ${selector}`);
  for (const [name, value] of Object.entries(values)) fill(form, name, value, w);
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await flush(w);
  return form;
}
function buttonByText(w, text, root = w.document) {
  return [...root.querySelectorAll('button')].find(b => b.textContent.replace(/\s+/g, ' ').trim().includes(text));
}
module.exports = {
  rec, assert, diagnostic, knownIssue, benchmark, record,
  flush, sleep, ptr, key, keyup, $, $$, itemEl, dragItem, fresh, setPhase, save, results,
  makeEnv, seedService, storageSnapshot, mk, submitForm, fill, buttonByText, outputDir
};

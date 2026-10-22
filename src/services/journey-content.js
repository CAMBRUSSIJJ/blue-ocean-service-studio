/** Shared document validation for the matrix and its canonical host. No DOM dependencies. */
export const MATRIX_CONTENT_TYPES = ['text', 'card', 'emoji', 'image', 'link'];
export const MATRIX_IMAGE_LIMIT = 500 * 1024;
export const MATRIX_IMAGE_BUDGET = 2 * 1024 * 1024;
const clipped = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
export function matrixSafeUrl(value, image = false) {
  const valueString = typeof value === 'string' ? value.trim() : '';
  if (image && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(valueString)) {
    if (valueString.length > Math.ceil(MATRIX_IMAGE_LIMIT * 4 / 3) + 100) return '';
    return valueString;
  }
  if (valueString.length > 2048) return '';
  try {
    const url = new URL(valueString);
    if (!['https:', ...(image ? [] : ['http:'])].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}
export function normalizeMatrixBlock(note) {
  const type = MATRIX_CONTENT_TYPES.includes(note?.type) ? note.type : 'card';
  const normalized = { id: clipped(note?.id ?? note?.i, 160), type, text: clipped(note?.text ?? note?.t, 1000) };
  if (!normalized.id) throw Error('O elemento precisa de uma identificação.');
  const icon = clipped(note?.icon, 24);
  if (icon) normalized.icon = icon;
  if (type === 'link' || type === 'image') {
    normalized.url = matrixSafeUrl(note?.url, type === 'image');
    if (!normalized.url) throw Error(type === 'image' ? 'Use uma imagem HTTPS ou um arquivo JPG, PNG ou WebP de até 500 KB.' : 'Informe um link completo HTTP ou HTTPS.');
    if (!normalized.text) throw Error(type === 'image' ? 'Descreva a imagem para quem não consegue vê-la.' : 'Dê um título ao link.');
  }
  if (note?.credit) normalized.credit = clipped(note.credit, 240);
  return normalized;
}
export function normalizeMatrixRow(input = {}) {
  return { n: clipped(input.n, 100), h: clipped(input.h, 240), icon: clipped(input.icon, 24),
    defaultType: MATRIX_CONTENT_TYPES.includes(input.defaultType) ? input.defaultType : 'card' };
}
export function validateMatrixDocument(doc) {
  let imageBytes = 0;
  if (Object.keys(doc.c || {}).length > 9000) throw Error('O mapa atingiu o limite de células.');
  for (const notes of Object.values(doc.c || {})) {
    if (!Array.isArray(notes) || notes.length > 100) throw Error('Cada célula pode ter até 100 elementos.');
    for (const note of notes) {
      const block = normalizeMatrixBlock(note);
      if (block.type === 'image' && block.url.startsWith('data:')) imageBytes += block.url.length * .75;
    }
  }
  if (imageBytes > MATRIX_IMAGE_BUDGET) throw Error('As imagens deste mapa atingiram 2 MB. Use imagens menores ou links HTTPS.');
}
export function matrixContentFromDocument(doc, stageIds, sync = {}) {
  const rows = {}, cells = {};
  for (const [id, value] of Object.entries(doc.rowSettings || {})) {
    if (/^[a-z][a-z0-9]{0,24}$/.test(id)) rows[id] = normalizeMatrixRow(value);
  }
  stageIds.forEach((id, index) => {
    cells[id] = {};
    for (const [key, notes] of Object.entries(doc.c || {})) {
      const [row, column] = key.split('|');
      if (Number(column) !== index || !/^[a-z][a-z0-9]{0,24}$/.test(row)) continue;
      cells[id][row] = notes.map(note => normalizeMatrixBlock({ ...note, id: note.hostItemId || sync.notes?.[note.i] || note.i }));
    }
  });
  return { version: 1, rows, cells };
}
/** Canonical text wins after an edit elsewhere; supplemental rows belong to this document. */
export function restoreMatrixContent(ref, stored, stageIds) {
  ref.rowSettings = stored?.rows || {};
  stageIds.forEach((id, index) => {
    for (const [row, blocks] of Object.entries(stored?.cells?.[id] || {})) {
      const key = row + '|' + index;
      if (['sd', 'em', 'im'].includes(row)) {
        ref.c[key] = blocks.map(block => ({ ...block, i: block.id, t: block.text }));
        continue;
      }
      const existing = ref.c[key] || [];
      ref.c[key] = existing.map(note => {
        const block = blocks.find(b => b.id === (note.hostItemId || note.i));
        return block ? { ...note, type: block.type, icon: block.icon, url: block.url, credit: block.credit } : note;
      });
      // Empty drafts have no canonical graph object yet.
      for (const block of blocks) if (!block.text && !existing.some(n => (n.hostItemId || n.i) === block.id)) ref.c[key].push({ ...block, i: block.id, t: '' });
    }
  });
  return ref;
}

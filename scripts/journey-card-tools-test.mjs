import assert from 'node:assert/strict';
import { normalizeMatrixCardMetadata, normalizeMatrixCardFilters, matrixCardMatches, applyMatrixCardAction, matrixContentFromDocument, restoreMatrixContent, duplicateMatrixBlock } from '../src/services/journey-content.js';
import { manageJourneySavedView, normalizeSavedMatrixView } from '../src/services/journey-views.js';
let count = 0;
const check = (name, run) => { run(); count++; console.log('PASS ' + name); };
const fixture = () => ({ 'xnotes|0': [{ i: 'one', type: 'text', t: 'Ação na contratação', personaIds: ['ana'], tags: ['Pesquisa'], tone: 'blue' }, { i: 'two', type: 'metric', t: '', referenceId: 'metric-source' }], 'xnotes|1': [{ i: 'three', type: 'text', t: 'Conteúdo de outra Persona', personaIds: ['bia'] }] });
check('Legacy cards remain visible and unclassified instead of receiving an invented Persona', () => {
  const note = { i: 'old', t: 'Registro existente' };
  assert.deepEqual(normalizeMatrixCardMetadata(note), { personaIds: [], tags: [], tone: 'neutral' });
  assert.equal(matrixCardMatches(note), true); assert.equal(note.personaIds, undefined);
});
check('Classification normalizes tags without changing the spelling of the first occurrence', () => {
  assert.deepEqual(normalizeMatrixCardMetadata({ tags: ['  Revisão  final ', 'revisão final', '', 'Dado'], personaIds: ['ana', 'ana'] }), { tags: ['Revisão final', 'Dado'], personaIds: ['ana'], tone: 'neutral' });
});
check('Bulk classification retains identities, unknown fields and references in mixed card types', () => {
  const cells = fixture(); cells['xnotes|0'][1].custom = { keep: true }; const before = structuredClone(cells);
  const next = applyMatrixCardAction(cells, ['one', 'two'], 'tags-add', { tags: ['Prioridade'] });
  assert.deepEqual(cells, before); assert.deepEqual(next['xnotes|0'][0].tags, ['Pesquisa', 'Prioridade']);
  assert.equal(next['xnotes|0'][1].referenceId, 'metric-source'); assert.deepEqual(next['xnotes|0'][1].custom, { keep: true });
  assert.equal(next['xnotes|1'][0], cells['xnotes|1'][0]);
});
check('Adding or removing a Persona preserves all other assignments', () => {
  const cells = fixture(), next = applyMatrixCardAction(cells, ['one', 'two'], 'persona-add', { personaIds: ['bia'] }, ['ana', 'bia']);
  assert.deepEqual(next['xnotes|0'][0].personaIds, ['ana', 'bia']);
  const removed = applyMatrixCardAction(next, ['one'], 'persona-remove', { personaIds: ['ana'] });
  assert.deepEqual(removed['xnotes|0'][0].personaIds, ['bia']); assert.deepEqual(removed['xnotes|0'][1].personaIds, ['bia']);
});
check('A stale selection, unavailable Persona or exceeded limit rejects the entire operation', () => {
  const cells = fixture(), before = structuredClone(cells);
  assert.throws(() => applyMatrixCardAction(cells, ['one', 'missing'], 'tone', { tone: 'rose' }));
  assert.throws(() => applyMatrixCardAction(cells, ['one', 'two'], 'persona-add', { personaIds: ['foreign'] }, ['ana', 'bia']));
  assert.throws(() => applyMatrixCardAction(cells, ['one'], 'tags-add', { tags: Array.from({ length: 21 }, (_, i) => 'Tag ' + i) }));
  assert.deepEqual(cells, before);
});
check('Search ignores accents and combines with exact type, tag and Persona filters', () => {
  const note = fixture()['xnotes|0'][0];
  assert.equal(matrixCardMatches(note, { query: 'acao contratacao', type: 'text', tag: 'pesquisa', personaId: 'ana' }), true);
  for (const filter of [{ type: 'metric' }, { tag: 'Outra' }, { query: 'inexistente' }, { personaId: 'bia' }]) assert.equal(matrixCardMatches(note, filter), false);
  assert.equal(matrixCardMatches({ type: 'metric', t: '' }, { query: 'tempo atendimento' }, 'Tempo de atendimento'), true);
});
check('Shared cards are optional in a Persona view and never acquire a Persona as a side effect', () => {
  const note = fixture()['xnotes|0'][1];
  assert.equal(matrixCardMatches(note, { personaId: 'ana' }), true);
  assert.equal(matrixCardMatches(note, { personaId: 'ana', includeUnassigned: false }), false);
  assert.equal(note.personaIds, undefined);
});
check('Removing a tag is case insensitive and preserves other tags and styling', () => {
  const next = applyMatrixCardAction(fixture(), ['one'], 'tags-remove', { tags: ['PESQUISA'] });
  assert.deepEqual(next['xnotes|0'][0].tags, []); assert.equal(next['xnotes|0'][0].tone, 'blue');
});
check('Deleting selected visual cards does not change other cells or the referenced source', () => {
  const cells = fixture(), before = structuredClone(cells), next = applyMatrixCardAction(cells, ['two'], 'remove');
  assert.deepEqual(next['xnotes|0'].map(n => n.i), ['one']); assert.equal(next['xnotes|1'][0], cells['xnotes|1'][0]); assert.deepEqual(cells, before);
});
check('Backup and host reconstruction preserve metadata while keeping canonical text current', () => {
  const doc = { c: { 'ev|0': [{ i: 'local', hostItemId: 'canonical', t: 'Antes', type: 'card', personaIds: ['ana'], tags: ['Fonte'], tone: 'violet' }] } };
  const stored = JSON.parse(JSON.stringify(matrixContentFromDocument(doc, ['stage'])));
  const result = restoreMatrixContent({ c: { 'ev|0': [{ i: 'fresh', hostItemId: 'canonical', t: 'Atualizado na biblioteca' }] } }, stored, ['stage']);
  const note = result.c['ev|0'][0]; assert.equal(note.t, 'Atualizado na biblioteca'); assert.deepEqual(note.personaIds, ['ana']); assert.deepEqual(note.tags, ['Fonte']); assert.equal(note.tone, 'violet');
});
check('Duplicating a card makes metadata independent while retaining its canonical reference', () => {
  const note = { ...fixture()['xnotes|0'][0], referenceId: 'source' }, copy = duplicateMatrixBlock(note, 'copy');
  copy.personaIds.push('bia'); copy.tags.push('Cópia'); assert.deepEqual(note.personaIds, ['ana']); assert.deepEqual(note.tags, ['Pesquisa']); assert.equal(copy.referenceId, 'source');
});
check('Saved views restore card filters without copying or rewriting any card', () => {
  const graph = { service: { id: 'service' }, journeys: { journey: { matrixContent: { rows: {}, cells: {} } } }, entities: { persona: {} } };
  const filters = { query: 'espera', type: 'text', personaId: 'ana', tag: 'Fonte', includeUnassigned: false };
  manageJourneySavedView(graph, 'journey', 'create', { name: 'Revisão', view: { cardFilters: filters } });
  const snapshot = JSON.stringify(graph.journeys.journey.matrixContent), record = graph.journeys.journey.savedMatrixViews[0];
  manageJourneySavedView(graph, 'journey', 'apply', { id: record.id });
  assert.deepEqual(graph.journeys.journey.matrixView.cardFilters, filters); assert.equal(JSON.stringify(graph.journeys.journey.matrixContent), snapshot);
  assert.equal(normalizeMatrixCardFilters({ type: 'unknown', includeUnassigned: false }).type, '');
});
check('Saved matrix perspectives survive custom presets and legacy operational views', () => {
  assert.equal(normalizeSavedMatrixView({ preset: 'operational' }).perspective, 'blueprint');
  assert.equal(normalizeSavedMatrixView().perspective, 'journey');
  const graph = { service: { id: 'service' }, journeys: { journey: { matrixContent: { rows: {}, cells: {} } } }, entities: { persona: {} } };
  manageJourneySavedView(graph, 'journey', 'create', { name: 'Operação personalizada', view: { preset: 'custom', perspective: 'blueprint' } });
  const restored = JSON.parse(JSON.stringify(graph)), id = restored.journeys.journey.savedMatrixViews[0].id;
  manageJourneySavedView(restored, 'journey', 'apply', { id });
  assert.equal(restored.journeys.journey.matrixView.perspective, 'blueprint');
});
console.log(`Journey card tools: ${count}/${count} PASS`);

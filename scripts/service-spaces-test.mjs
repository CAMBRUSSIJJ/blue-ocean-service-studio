import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Bundle the actual TypeScript domain, including schema/migration/history, without a browser or a second implementation.
const result = await build({ stdin: { contents: `
  export * from './src/services/service-spaces.ts';
  export * from './src/domain/graph-operations.ts';
  export * from './src/domain/schema.ts';
  export * from './src/domain/migrations.ts';
  export * from './src/state/history.ts';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const api = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
let count = 0;
const check = (name, run) => { run(); count++; console.log('PASS ' + name); };
const graph = api.createServiceGraph('Serviço espacial QA');
const time = graph.service.createdAt, sid = graph.service.id;
graph.service.journeyIds = ['map-a', 'map-b'];
graph.journeys['map-a'] = { id: 'map-a', serviceId: sid, name: 'Atendimento', stageIds: ['stage-a'], createdAt: time, updatedAt: time,
  matrixContent: { version: 1, rows: {}, cells: { 'stage-a': { ac: [{ id: 'arrival', type: 'card', text: 'Chegar ao local' }], fl: [{ id: 'welcome', type: 'card', text: 'Acolher cliente', activity: { category: 'activity', owner: 'Ana', team: 'Atendimento', resourceRefs: [], resourceNotes: '', rule: '', durationMinutes: 5, waitMinutes: null, targetMinutes: null }, futureMetadata: { preserved: true } }], custom: [{ id: 'note', type: 'card', text: 'Nota de pesquisa' }] } }, connections: [{ id: 'sequence-a', a: 'arrival', b: 'welcome', type: 'sequence', label: 'Receber' }] }, customMetadata: { keep: 'yes' } };
graph.journeys['map-b'] = { ...structuredClone(graph.journeys['map-a']), id: 'map-b', name: 'Outro mapa', stageIds: [] };
graph.stages['stage-a'] = { id: 'stage-a', journeyId: 'map-a', title: 'Chegada', customerAction: '', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [], createdAt: time, updatedAt: time };
const before = structuredClone(graph), initial = api.projectServiceSpaces(graph, 'map-a');
check('Opening spaces creates neither sample rooms nor canonical changes', () => { assert.deepEqual(graph, before); assert.equal(initial.environments.length, 0); assert.equal(graph.service.spatialDesign, undefined); });
check('Native cards without extra metadata retain canonical IDs and their operational rows', () => { assert.deepEqual(initial.nodes.map(node => node.id), ['arrival', 'welcome']); assert.equal(initial.nodes[0].type, 'touchpoint'); assert.equal(initial.nodes[1].duration, 5); assert.equal(initial.edges[0].id, 'sequence-a'); });
const draft = structuredClone(initial);
draft.environments.push({ id: 'room-a', name: 'Recepção', icon: '▦', color: '#1F927F', description: 'Atendimento', team: 'Atendimento' });
draft.nodes[1].environmentId = 'room-a';
draft.floorplan.objects.push({ id: 'desk-a', roomId: 'room-a', kind: 'desk', nodeId: 'welcome', x: 1, y: 1, rotation: 0 });
draft.floorplan.roomPositions = { 'room-a': { x: 0, y: 0 } };
draft.floorplan.wallHeights = { 'room-a': 2.9 };
const version = api.spaceVersion(initial);
const save = (input = draft, source = graph, base = version) => api.applyServiceSpaces(source, sid, 'map-a', base, input, time);
const next = save();
check('Spatial edits preserve source IDs, times, unknown metadata and immutable input', () => { assert.deepEqual(graph, before); assert.deepEqual(next.journeys, graph.journeys); assert.deepEqual(next.stages, graph.stages); assert.deepEqual(next.entities, graph.entities); assert.equal(next.service.spatialDesign.workspaces['map-a'].assignments.welcome, 'room-a'); assert.equal(next.service.spatialDesign.workspaces['map-a'].revision, 1); });
check('A different map and the service-wide plant remain independent', () => { assert.equal(api.projectServiceSpaces(next, 'map-b').environments.length, 0); assert.equal(api.projectServiceSpaces(next, api.SERVICE_SPACE).nodes.length, 0); });
check('Backup migration and schema parsing round-trip rooms, furniture and links', () => { const restored = api.migrateProject(JSON.parse(JSON.stringify(next))); assert.deepEqual(restored.service.spatialDesign, next.service.spatialDesign); assert.deepEqual(api.projectServiceSpaces(restored, 'map-a'), api.projectServiceSpaces(next, 'map-a')); });
check('Undo and redo restore the complete spatial transaction', () => { const history = api.commitHistory(api.initialHistory(graph), () => next, 'spaces'); const undone = api.undoHistory(history); assert.deepEqual(undone.present, graph); assert.deepEqual(api.redoHistory(undone).present, next); });
check('Source-map changes reject an outdated spatial draft', () => { const changed = structuredClone(graph); changed.journeys['map-a'].matrixContent.cells['stage-a'].fl[0].text = 'Acolhimento revisado'; assert.throws(() => save(draft, changed), /mudaram/); });
check('Concurrent spatial changes reject an outdated revision', () => assert.throws(() => save(draft, next), /mudaram/));
check('A cross-service or cross-map message cannot replace the current layout', () => { assert.throws(() => api.applyServiceSpaces(graph, 'other-service', 'map-a', version, draft), /serviço aberto mudou/); assert.throws(() => api.projectServiceSpaces(graph, 'missing'), /Mapa indisponível/); const forged = structuredClone(draft); forged.id = 'map-b'; assert.throws(() => save(forged), /outro mapa/); });
check('A backup with spatial state from another service is rejected explicitly', () => { const invalid = structuredClone(next); invalid.service.spatialDesign.serviceId = 'other-service'; assert.throws(() => api.validateGraph(invalid)); assert.throws(() => api.projectServiceSpaces(invalid, 'map-a'), /outro serviço/); });
check('Rooms cannot silently edit, create or delete native activities or connections', () => { for (const change of [doc => doc.nodes[0].title = 'Changed', doc => doc.nodes.pop(), doc => doc.edges.length = 0, doc => doc.nodes[1].duration = 9]) { const forged = structuredClone(draft); change(forged); assert.throws(() => save(forged)); } });
check('Invalid geometry and dangling furniture references fail atomically', () => { for (const change of [doc => doc.floorplan.objects[0].x = 11, doc => doc.floorplan.objects[0].nodeId = 'missing', doc => doc.floorplan.objects.push({ ...doc.floorplan.objects[0], id: 'overlap' }), doc => doc.environments.push({ ...doc.environments[0] }), doc => doc.floorplan.wallHeights['room-a'] = Infinity]) { const forged = structuredClone(draft); change(forged); assert.throws(() => save(forged)); } assert.deepEqual(graph, before); });
check('Removing a native activity clears its projection and furniture link without changing the saved source', () => { const removed = structuredClone(next); removed.journeys['map-a'].matrixContent.cells['stage-a'].fl = []; const projected = api.projectServiceSpaces(removed, 'map-a'); assert.equal(projected.nodes.length, 1); assert.equal(projected.floorplan.objects[0].nodeId, ''); assert.equal(removed.service.spatialDesign.workspaces['map-a'].floorplan.objects[0].nodeId, 'welcome'); });
check('Oversized maps fail explicitly without silently truncating activities', () => { const large = structuredClone(graph); large.journeys['map-a'].matrixContent.cells['stage-a'].fl = Array.from({ length: 601 }, (_, n) => ({ id: 'activity-' + n, type: 'card', text: 'Activity' })); assert.throws(() => api.projectServiceSpaces(large, 'map-a'), /600/); });
console.log(`Service spaces: ${count}/${count} PASS`);

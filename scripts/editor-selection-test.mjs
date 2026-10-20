import assert from 'node:assert/strict';
import { blueprintSelection, createBlueprintFromSelection } from '../src/runtime/blueprint-from-selection.js';

const graph = { service: { id: 'svc', journeyIds: [] }, journeys: {}, stages: {}, entities: {},
  views: { whiteboards: { wb: { id: 'wb', serviceId: 'svc', viewKind: 'free',
    items: { a: { id: 'a', kind: 'free', shape: 'note', text: 'Cliente solicita ajuda', x: 20, y: 30 },
      b: { id: 'b', kind: 'free', shape: 'note', text: 'Equipe responde', x: 400, y: 30 },
      frame: { id: 'frame', kind: 'free', shape: 'frame', text: 'Exploração' } },
    edges: { e: { id: 'e', fromId: 'a', toId: 'b', label: 'continua', style: 'solid', arrow: 'end' } } } } } };
const before = structuredClone(graph);
const input = { sourceBoardId: 'wb', name: 'Suporte', stageNames: ['Solicitação', 'Resposta'], linked: true,
  items: [{ itemId: 'a', layer: 'customer', stageIndex: 0 }, { itemId: 'b', layer: 'frontstage', stageIndex: 1 }] };
let n = 0;
const id = kind => `${kind}-${++n}`;
const result = createBlueprintFromSelection(graph, input, id);
assert.deepEqual(graph, before, 'The preview/apply operation must not mutate its input');
const origin = result.graph.views.whiteboards.wb, target = result.graph.views.whiteboards[result.boardId];
assert.deepEqual([origin.items.a.x, origin.items.a.y], [20, 30], 'Source geometry survives');
assert.equal(origin.items.a.kind, 'smart');
assert.equal(Object.values(target.items).find(item => item.sourceItemId === 'a').objectId, origin.items.a.objectId, 'Views share one canonical entity');
assert.equal(Object.keys(result.graph.entities.customerAction).length, 1);
assert.equal(Object.keys(target.edges).length, 1);
const edge = Object.values(target.edges)[0];
assert.ok(target.items[edge.fromId] && target.items[edge.toId], 'Connections reference target instances');
assert.equal(edge.label, 'continua');
assert.equal(result.graph.stages[result.graph.journeys[target.journeyId].stageIds[0]].customerAction, 'Cliente solicita ajuda');
assert.equal(blueprintSelection(graph, 'wb', ['frame'])[0].excluded, true);
const detached = createBlueprintFromSelection(result.graph, { ...input, linked: false }, id);
assert.ok(Object.values(detached.graph.views.whiteboards[detached.boardId].items).every(item => item.kind === 'free' && !item.objectId));
assert.deepEqual(detached.graph.views.whiteboards.wb, origin, 'Detached copies preserve source objects');
assert.throws(() => createBlueprintFromSelection(graph, { ...input, items: [{ itemId: 'a', layer: 'invalid', stageIndex: 0 }] }, id), /camada válida/);
assert.throws(() => createBlueprintFromSelection(graph, { ...input, items: [{ itemId: 'a', layer: 'frontstage', stageIndex: 9 }] }, id), /etapa válida/);
assert.throws(() => createBlueprintFromSelection(graph, { ...input, journeyId: 'missing' }, id), /Jornada escolhida/);
assert.throws(() => createBlueprintFromSelection(graph, { ...input, items: [] }, id), /pelo menos um objeto/);
assert.throws(() => createBlueprintFromSelection(graph, { ...input, items: [{ itemId: 'frame', layer: 'frontstage' }] }, id), /Frames/);
assert.deepEqual(graph, before, 'Invalid plans leave every source byte intact');
const existingJourney = result.graph.journeys[target.journeyId];
const existing = createBlueprintFromSelection(result.graph, { ...input, journeyId: existingJourney.id,
  items: [{ itemId: 'a', layer: 'customer', stageId: existingJourney.stageIds[0] }] }, id);
assert.equal(existing.graph.views.whiteboards[existing.boardId].journeyId, existingJourney.id);
assert.equal(Object.keys(existing.graph.journeys).length, 1, 'An existing Journey is reused without duplication');
assert.equal(Object.keys(existing.graph.entities.customerAction).length, 1, 'An existing linked entity is reused');
assert.deepEqual(existing.graph.views.whiteboards.wb, origin, 'Organizing an existing smart instance leaves its source unchanged');
const locked = structuredClone(graph); locked.views.whiteboards.wb.items.a.locked = true;
assert.throws(() => createBlueprintFromSelection(locked, input, id), /Desbloqueie/);
assert.ok(createBlueprintFromSelection(locked, { ...input, linked: false }, id).boardId, 'A locked source can be copied independently');
console.log('PASS: Blueprint selection — linked/detached objects, geometry, stages, connections and atomic validation');

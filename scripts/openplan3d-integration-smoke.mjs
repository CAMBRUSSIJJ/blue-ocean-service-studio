import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { applyCadChange, cadEntry, cadScopeId, cadVersion, validateCadProject } from '../src/services/openplan3d-projects.ts';
import { cadRoomKey, cadRoomLink, saveCadRoomLink, removeCadRoomLink } from '../src/services/cad-room-links.ts';

const serviceId = 'service-1', mapId = 'service-space', scopeId = cadScopeId(serviceId, mapId);
const date = '2026-11-07T12:00:00.000Z';
const graph = () => ({
  service: { id: serviceId, name: 'Clínica', updatedAt: date, journeyIds: [] },
  journeys: { journey1: { id: 'journey1', serviceId, name: 'Atendimento', stageIds: [] } },
});
const project = () => ({
  id: scopeId, name: 'Recepção', activeFloorId: 'floor-1',
  floors: [{ id: 'floor-1', walls: [{ id: 'wall-1', start: {x:0,y:0}, end:{x:600,y:0}, thickness:15 }], doors: [], windows: [], furniture: [] }],
});

test('CAD is scoped to the current service and map', () => {
  assert.equal(scopeId.startsWith('bo-cad:'), true);
  const before = graph();
  const after = applyCadChange(before, serviceId, mapId, 'null', project(), date);
  assert.equal(cadEntry(after, mapId).project.floors[0].walls.length, 1);
  assert.equal(cadEntry(after, mapId).revision, 1);
  assert.equal(before.service.cadPlans, undefined);
  assert.equal(cadVersion(after, mapId), JSON.stringify(project()));
});
test('optimistic concurrency prevents overwriting changes', () => {
  const after = applyCadChange(graph(), serviceId, mapId, 'null', project(), date);
  assert.throws(() => applyCadChange(after, serviceId, mapId, 'null', project(), date), /mudou em outra sessão/);
  const next = structuredClone(project());
  next.name = 'Recepção ampliada';
  const updated = applyCadChange(after, serviceId, mapId, cadVersion(after, mapId), next, date);
  assert.equal(cadEntry(updated, mapId).revision, 2);
});
test('does not allow projects or maps to cross scopes', () => {
  assert.throws(() => applyCadChange(graph(), 'other-service', mapId, 'null', project(), date), /mudou/);
  assert.throws(() => applyCadChange(graph(), serviceId, 'unknown-map', 'null', project(), date), /não pertence/);
  assert.throws(() => validateCadProject({ ...project(), id: 'another' }, scopeId), /não pertence/);
});
test('rejects malformed floors and oversized plan', () => {
  assert.throws(() => validateCadProject({ ...project(), activeFloorId: 'missing' }, scopeId), /Pavimento ativo/);
  assert.throws(() => validateCadProject({ ...project(), floors: [] }, scopeId), /pavimentos/);
  assert.throws(() => validateCadProject({ ...project(), name: 'x'.repeat(3_000_050) }, scopeId), /grande/);
});

test('dev starts the CAD asset preparation before Vite', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts.dev, /^npm run openplan:prepare && /);
  assert.match(pkg.scripts.build, /^npm run openplan:prepare && /);
});
test('missing CAD is checked before mounting an iframe, without SPA recursion', () => {
  const src = readFileSync(new URL('../src/views/OpenPlan3DWorkspace.tsx', import.meta.url), 'utf8');
  assert.ok(src.includes('blue-ocean-source-commit.txt'));
  assert.ok(src.includes("cache: 'no-store'"));
  assert.ok(src.includes('openplan3d/editor/index.html'));
  assert.ok(src.includes("assetStatus === 'ready' && <iframe"));
  assert.ok(src.includes("doc?.getElementById('root')"));
  assert.ok(src.includes("assetStatus === 'missing'"));
});

test('OpenPlan3D bootstraps original Svelte config before installing adapter-static', () => {
  const script = readFileSync(new URL('./prepare-openplan3d.mjs', import.meta.url), 'utf8');
  const initialInstall = script.indexOf("runNode24('npm ci --include=dev");
  const adapterInstall = script.indexOf("runNode24('npm install --prefix .blue-ocean-static-adapter");
  const configSwitch = script.indexOf("write('svelte.config.js',");
  const build = script.indexOf("runNode24('npm run build')");
  assert.ok(initialInstall !== -1 && adapterInstall > initialInstall);
  assert.ok(configSwitch > adapterInstall && build > configSwitch);
  assert.match(script, /--legacy-peer-deps/);
  assert.match(script, /--ignore-scripts/);
  assert.match(script, /npm install --prefix \.blue-ocean-static-adapter/);
  assert.match(script, /cpSync\(ADAPTER_SRC, ADAPTER_DST/);
  assert.match(script, /rmSync\(ADAPTER_DST/);
});


test('Blue Ocean skin affects appearance only and is scoped to embedded CAD', () => {
  const script = readFileSync(new URL('./prepare-openplan3d.mjs', import.meta.url), 'utf8');
  const skin = readFileSync(new URL('../src/integrations/openplan3d-blue-ocean.css', import.meta.url), 'utf8');
  const cssWithoutComments = skin.replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(script, /bo-openplan-embed-v5-room-journey/);
  assert.match(script, /data-blue-ocean-cad/);
  assert.match(script, /openplan3d-blue-ocean\.css/);
  assert.match(script, /write\('src\/app\.css'/);
  assert.match(skin, /html\[data-blue-ocean-cad="1"\]/);
  // The sole display:none is scoped to the embedded CAD rail on desktop.
  assert.equal((cssWithoutComments.match(/display\s*:\s*none/g) || []).length, 1);
  assert.match(cssWithoutComments, /@media\s*\(min-width:\s*768px\)/);
  assert.match(cssWithoutComments, /html\[data-blue-ocean-cad="1"\]\.bo-cad-tools-collapsed/);
  assert.doesNotMatch(cssWithoutComments, /pointer-events\s*:\s*none|position\s*:\s*(?:fixed|absolute)/);
  assert.doesNotMatch(script, /querySelectorAll\([^)]*button/);
});

test('tool panel toggle is presentation-only and uses isolated message channel', () => {
  const host = readFileSync(new URL('../src/views/OpenPlan3DWorkspace.tsx', import.meta.url), 'utf8');
  const builder = readFileSync(new URL('./prepare-openplan3d.mjs', import.meta.url), 'utf8');
  const view = readFileSync(new URL('../src/views/ServiceSpaces3DView.tsx', import.meta.url), 'utf8');
  assert.match(host, /'ui',/);
  assert.match(host, /toolsCollapsed: !toolsVisible/);
  assert.match(host, /aria-pressed=\{!toolsVisible\}/);
  assert.match(builder, /data.type === 'ui'/);
  assert.match(builder, /classList.toggle\('bo-cad-tools-collapsed'/);
  assert.match(view, /editorMode === 'cad' \? ' is-cad' : ''/);
});

const linkedGraph = (map = mapId) => {
  const source = graph();
  source.service.journeyIds = ['journey1'];
  source.journeys.journey1.stageIds = ['stage1'];
  source.stages = { stage1: { id: 'stage1', journeyId: 'journey1', title: 'Chegada', customerAction: 'Receber cliente' } };
  const drawing = project();
  drawing.id = cadScopeId(serviceId, map);
  drawing.floors[0].walls.push({ id: 'wall-2', start: { x: 600, y: 0 }, end: { x: 600, y: 600 }, thickness: 15 });
  return applyCadChange(source, serviceId, map, 'null', drawing, date);
};
const linkInput = () => ({
  roomKey: cadRoomKey('floor-1', ['wall-1', 'wall-2']),
  floorId: 'floor-1', roomName: 'Recepção', stageId: 'stage1',
  activity: 'Atendimento inicial', owner: 'Recepcionista', resources: 'Balcão, computador',
  expectedMinutes: 5, capacity: 8, challenge: 'Filas na entrada',
});

test('CAD room can be linked to real journey without mutating geometric plan', () => {
  const before = linkedGraph();
  const originalVersion = cadVersion(before, mapId);
  const after = saveCadRoomLink(before, serviceId, mapId, linkInput(), date);
  const link = cadRoomLink(after, mapId, linkInput().roomKey);
  assert.equal(link.stageId, 'stage1');
  assert.equal(link.expectedMinutes, 5);
  assert.equal(link.capacity, 8);
  assert.equal(link.owner, 'Recepcionista');
  assert.equal(cadVersion(after, mapId), originalVersion);
  assert.equal(before.service.cadRoomLinks, undefined);
  assert.equal(after.service.cadRoomLinks.serviceId, serviceId);
  const removed = removeCadRoomLink(after, serviceId, mapId, linkInput().roomKey);
  assert.equal(cadRoomLink(removed, mapId, linkInput().roomKey), null);
  assert.equal(cadVersion(removed, mapId), originalVersion);
  assert.equal(cadRoomLink(after, mapId, linkInput().roomKey)?.stageId, 'stage1');
});
test('CAD room association keeps stable boundary key after room rename and wall reordering', () => {
  assert.equal(cadRoomKey('floor-1', ['wall-2', 'wall-1']), cadRoomKey('floor-1', ['wall-1', 'wall-2']));
});
test('CAD room relation validates stage, service, floor and real walls', () => {
  const before = linkedGraph();
  assert.throws(() => saveCadRoomLink(before, 'another-service', mapId, linkInput()), /serviço mudou/);
  assert.throws(() => saveCadRoomLink(before, serviceId, 'missing-map', linkInput()), /jornada/);
  assert.throws(() => saveCadRoomLink(before, serviceId, mapId, {...linkInput(), stageId: 'missing'}), /etapa válida/);
  assert.throws(() => saveCadRoomLink(before, serviceId, mapId, {...linkInput(), roomKey: cadRoomKey('floor-1', ['wall-1','missing'])}), /sala mudou/);
  assert.throws(() => saveCadRoomLink(before, serviceId, mapId, {...linkInput(), capacity: -1}), /Capacidade/);
  const onOtherMap = linkedGraph('journey1');
  assert.equal(saveCadRoomLink(onOtherMap, serviceId, 'journey1', linkInput()).service.cadRoomLinks.maps.journey1[linkInput().roomKey].stageId, 'stage1');
});
test('Room inspector is outside CAD renderer and native selection channel is read-only', () => {
  const host = readFileSync(new URL('../src/views/OpenPlan3DWorkspace.tsx', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/views/CadRoomServicePanel.tsx', import.meta.url), 'utf8');
  const bridge = readFileSync(new URL('../src/integrations/blue-ocean-room-bridge.source', import.meta.url), 'utf8');
  const preparer = readFileSync(new URL('./prepare-openplan3d.mjs', import.meta.url), 'utf8');
  assert.match(host, /room-context/);
  assert.match(host, /bo-openplan-workspace__context/);
  assert.match(panel, /saveCadRoomLink/);
  assert.match(panel, /removeCadRoomLink/);
  assert.match(bridge, /selectedRoomId/);
  assert.match(bridge, /resolveRooms/);
  assert.doesNotMatch(bridge, /updateWall|updateRoom|updateFurniture|addWall|addFurniture/);
  assert.match(preparer, /installBlueOceanRoomBridge/);
  assert.match(preparer, /bo-openplan-embed-v5-room-journey/);
});

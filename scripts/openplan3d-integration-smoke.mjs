import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { applyCadChange, cadEntry, cadScopeId, cadVersion, validateCadProject } from '../src/services/openplan3d-projects.ts';

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
  const adapterInstall = script.indexOf("runNode24('npm install --no-save");
  const configSwitch = script.indexOf("write('svelte.config.js',");
  const build = script.indexOf("runNode24('npm run build')");
  assert.ok(initialInstall !== -1 && adapterInstall > initialInstall);
  assert.ok(configSwitch > adapterInstall && build > configSwitch);
  assert.match(script, /--legacy-peer-deps/);
  assert.match(script, /--ignore-scripts/);
});

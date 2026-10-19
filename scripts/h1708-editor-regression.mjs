import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const view = readFileSync('src/views/JourneyCanvasFree.tsx', 'utf8');
const css = readFileSync('src/runtime/journey-free-canvas-h1705.css', 'utf8');
const model = readFileSync('src/domain/model.ts', 'utf8');
const checks = [
  ['nova etapa sem nome pré-preenchido', /useState\(''\)/.test(view) && !view.includes("useState('Descoberta')")],
  ['criação utiliza o controlador', view.includes('createStage(inlineStageTitle)')],
  ['reordenar etapa', view.includes("moveStage(stage.id, 'prev')") && view.includes("moveStage(stage.id, 'next')")],
  ['remoção avisa sobre vínculos', view.includes('const removeStageSafely') && view.includes('target.touchpointIds.length')],
  ['edição direta', view.includes("updateStageCore(stage.id, 'title'")],
  ['persistência das faixas', view.includes('mapLayout: { version: 1 as const, lanes: next }')],
  ['faixas preservam cartões por etapa', model.includes('cards: Record<string, string>')],
  ['faixas podem ocultar', view.includes('hidden: true') && view.includes('hidden: false')],
  ['superfície do canvas independente', css.includes('.bo-h1706-map{min-height:100%;width:max-content;min-width:100%')],
  ['marcador da versão', view.includes('data-journey-canvas="H17.0.8"')],
];
for (const [name, passed] of checks) {
  assert.ok(passed, `FALHOU: ${name}`);
  process.stdout.write(`OK ${name}\n`);
}
process.stdout.write(`H17.0.8: ${checks.length} verificações estáticas aprovadas.\n`);

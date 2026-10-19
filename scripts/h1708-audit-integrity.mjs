import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (name) => readFileSync(name, 'utf8');
const graph = read('src/domain/graph-operations.ts');
const editor = read('src/views/JourneyCanvasFree.tsx');
const controller = read('src/state/useStudioController.ts');
const checks = [
  ['exclusão de etapa delegada ao domínio', /const removeStage = \(stageId: Id\) => \{[\s\S]*?deleteStageFromGraph\(current, stageId\)/.test(controller)],
  ['exclusão limpa células no mesmo grafo', /export const deleteStageFromGraph[\s\S]*?mapLayout: journey\.mapLayout[\s\S]*?delete cards\[stageId\]/.test(graph)],
  ['exclusão não salva faixas em transação separada', !/if \(filledLanes\) saveLanes/.test(editor)],
  ['aviso prévio de conteúdos vinculados', editor.includes('const filledLanes') && editor.includes('window.confirm(`Remover a etapa')],
  ['faixas ocultas continuam na estrutura', editor.includes('lanes.filter((lane) => !lane.hidden)') && editor.includes('lanes.filter((lane) => lane.hidden)')],
  ['pontos de contato abrem edição específica', editor.includes("setShowContextForm(lane.binding !== 'touchpoints')")],
  ['persistência mantém modelo de layout v1', editor.includes('mapLayout: { version: 1 as const, lanes: next }')],
];
for (const [description, passed] of checks) {
  assert.ok(passed, `FALHOU: ${description}`);
  console.log(`OK ${description}`);
}
console.log(`${checks.length} verificações estruturais da auditoria aprovadas.`);

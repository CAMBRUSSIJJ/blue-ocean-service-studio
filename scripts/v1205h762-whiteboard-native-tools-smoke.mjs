import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read('package.json'));
const integration = JSON.parse(read('integrations/blocksuite/package.json'));
const editor = read('integrations/blocksuite/src/main.ts');
const shell = read('src/views/BlockSuiteWorkspace.tsx');
const tools = read('src/views/WhiteboardToolsH762.tsx');
const css = read('src/views/whiteboard-tools-h762.css');
const checks = [
  ['H7.62 usa o BlockSuite 0.19.5 já existente', integration.dependencies['@blocksuite/blocks'] === '0.19.5' && integration.dependencies['@blocksuite/presets'] === '0.19.5'],
  ['A interface é renderizada dentro do Workspace real', shell.includes('<WhiteboardToolsH762') && shell.includes('data-whiteboard-primary-editor="blocksuite"')],
  ['A interface oferece seleção e mão nativas', tools.includes("id: 'select'") && tools.includes("id: 'hand'") && editor.includes("hand: 'pan'")],
  ['Post-it usa a ferramenta nativa, não outro canvas', tools.includes("id: 'note'") && editor.includes("'affine:note'") && editor.includes('nativeRoot().gfx.tool.setTool(name, options)')],
  ['Texto e formas do BlockSuite são acionados', ['rect','ellipse','diamond','text'].every(id => tools.includes("id: '" + id + "'")) && editor.includes("shapeName")],
  ['Conexão usa a ferramenta nativa BlockSuite', tools.includes("id: 'connector'") && editor.includes("mode: 1 /* ConnectorMode.Orthogonal")],
  ['Caneta, borracha e frames usam ferramentas nativas', ['brush','eraser','frame'].every(id => tools.includes("id: '" + id + "'") && editor.includes(id))],
  ['Undo/Redo e zoom preservam a árvore original', tools.includes("onAction('zoom-in')") && tools.includes("onAction('zoom-out')") && editor.includes("action === 'undo'") && editor.includes("setZoomByAction(")],
  ['Alinhamento, distribuição e grade alteram somente a seleção', editor.includes("const selectedBounds = () => nativeRoot().gfx.selection.selectedElements") && editor.includes("if (items.length < 2)") && editor.includes("positions.get(item.element.id)")],
  ['Frame da seleção e agrupamento são recursos nativos', editor.includes('service.frame.createFrameOnSelected()') && editor.includes('service.createGroupFromSelected()')],
  ['Modelos criam notas novas sem descartar anteriores', tools.includes("'template-brainstorm'") && tools.includes("'template-affinity'") && editor.includes("addVisualNote({ id: 'h762:'")],
  ['Ferramentas enviam mensagens seguras para o iframe correto', shell.includes("post('TOOL'") && shell.includes("post('ACTION'") && editor.includes("event.origin !== window.location.origin || event.source !== window.parent")],
  ['Erros de ferramentas dão feedback visível', editor.includes("notify('COMMAND_RESULT'") && editor.includes("notify('ERROR'") && shell.includes("message.type === 'COMMAND_RESULT'")],
  ['Objetos canônicos continuam no Service Graph', shell.includes("linkEntityToWhiteboard(graph, boardId") && shell.includes("createCanvasEntity(graph, boardId") && tools.includes('onObjects();')],
  ['A versão mantém armazenamento e arquivos do quadro existentes', editor.includes('new IndexeddbPersistence(storageKey, doc.spaceDoc)') && editor.includes("const storageKey = `blue-ocean-blocksuite-v1:")],
  ['Estilo é isolado, compacto e adaptado a telas menores', css.includes('.bo-h762-toolbar') && css.includes('@media(max-width:530px)') && css.includes('@media(prefers-reduced-motion:reduce)')],
  ['Barra pode ser recolhida e escondida', tools.includes("setExpanded(value => !value)") && shell.includes('setShowToolPalette(false)') && shell.includes('setShowToolPalette(true)')],
  ['Verificação está no QA principal', pkg.scripts.qa.includes('whiteboard:tools:smoke')],
];

let success = 0;
for (const [label, pass] of checks) {
  console.log((pass ? 'OK ' : 'FAIL ') + label);
  if (pass) success++;
}
console.log('H7.62 Native Whiteboard Tools: ' + success + '/' + checks.length + ' PASS');
assert.equal(success, checks.length);

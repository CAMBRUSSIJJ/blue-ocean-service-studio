import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const library = read('src/views/WhiteboardsView.tsx');
const css = read('src/runtime/whiteboard-library-h742.css');
const shell = read('src/views/BlockSuiteWorkspace.tsx');
const frame = read('integrations/blocksuite/src/main.ts');
const assets = read('scripts/ensure-blocksuite-dev.mjs');
const manifest = JSON.parse(read('integrations/blocksuite/public/blue-ocean-blocksuite.json'));
const pkg = JSON.parse(read('package.json'));

const syntax = spawnSync(process.execPath, ['--check', 'scripts/ensure-blocksuite-dev.mjs'], { encoding: 'utf8' });
const checks = [
  ['O alerta amarelo foi removido do JSX', !library.includes('bo-wb-storage-warning') && !library.includes('Salvo somente neste navegador.')],
  ['O CSS do antigo aviso foi removido', !css.includes('.bo-wb-storage-warning')],
  ['O comando local prepara o editor antes do Vite', pkg.scripts.dev.includes('prepare-assets.mjs && node scripts/ensure-blocksuite-dev.mjs && vite')],
  ['O script de inicialização tem sintaxe JS válida', syntax.status === 0],
  ['O instalador verifica entradas reais do editor', assets.includes('blue-ocean-blocksuite.json') && assets.includes('index.html') && assets.includes('assets.some(asset => asset.endsWith')],
  ['A verificação rejeita builds desatualizados', assets.includes('statSync(file).mtimeMs > builtAt')],
  ['A preparação usa as dependências da integração', assets.includes("'integrations/blocksuite', 'install'") && assets.includes("'integrations/blocksuite', 'run', 'build'")],
  ['O manifesto do iframe pertence à integração correta', manifest.integration === 'blue-ocean-blocksuite'],
  ['A biblioteca abre quadros reais pelo BlockSuite', library.includes('setVisualBoard({ id: board.id, name: board.name })') && library.includes('<BlockSuiteWorkspace boardId={visualBoard.id}')],
  ['Criar um quadro não falha silenciosamente', library.includes('O Whiteboard ainda não inicializou.') && library.includes('Falha ao criar Whiteboard:')],
  ['O visual preserva confirmação de exportar', shell.includes("onClick={() => post('EXPORT')}")],
  ['O shell valida o manifesto e a página real', shell.includes("fetch('/blocksuite/blue-ocean-blocksuite.json'") && shell.includes("fetch('/blocksuite/index.html'") && shell.includes('id="app"')],
  ['A tela de erro tem botão para tentar novamente', shell.includes('onClick={retryAssets}>Tentar novamente') && shell.includes('onClick={retryEditor}>Tentar novamente')],
  ['O editor transmite falhas sem READY', frame.includes("type: 'INIT_ERROR'") && shell.includes("message.type === 'INIT_ERROR'")],
  ['O contrato mantém o armazenamento e as ligações do serviço', frame.includes('IndexeddbPersistence') && shell.includes('linkEntityToWhiteboard')],
  ['O CSS contempla ações de recuperação', read('src/views/blocksuite-workspace.css').includes('.bo-bs-recovery-actions')],
];

let passed = 0;
for (const [label, ok] of checks) {
  console.log((ok ? 'OK' : 'FAIL') + ' ' + label);
  if (ok) passed += 1;
}
if (syntax.status !== 0) console.error(syntax.stderr);
console.log('H7.61 Whiteboard Open Reliability: ' + passed + '/' + checks.length + ' PASS');
assert.equal(passed, checks.length);

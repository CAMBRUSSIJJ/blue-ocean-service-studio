/**
 * Prepara o BlockSuite somente quando necessário, antes do servidor Vite local.
 *
 * O build completo gera public/blocksuite/, mas "npm run dev" não o gerava:
 * a biblioteca de Whiteboards abria e o iframe ficava sem o editor real.
 *
 * Este script não toca nos documentos Yjs/IndexedDB nem no Service Graph.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const integration = join(root, 'integrations', 'blocksuite');
const target = join(root, 'public', 'blocksuite');
const index = join(target, 'index.html');
const manifest = join(target, 'blue-ocean-blocksuite.json');

const inputs = [
  join(integration, 'index.html'),
  join(integration, 'package.json'),
  join(integration, 'vite.config.ts'),
  join(integration, 'src', 'main.ts'),
  join(integration, 'src', 'style.css'),
];

function editorBuilt() {
  if (!existsSync(index) || !existsSync(manifest)) return false;
  try {
    const descriptor = JSON.parse(readFileSync(manifest, 'utf8'));
    if (descriptor?.integration !== 'blue-ocean-blocksuite') return false;
    const html = readFileSync(index, 'utf8');
    // Require the generated JS and CSS, not just an old Vite HTML shell.
    const assets = [...html.matchAll(/(?:src|href)=["']\\/blocksuite\\/([^"'?#]+)(?:[?#][^"']*)?["']/g)]
      .map(match => match[1]);
    if (!assets.some(asset => asset.endsWith('.js')) || !assets.every(asset => existsSync(join(target, asset)))) return false;
    const builtAt = statSync(index).mtimeMs;
    if (inputs.some(file => !existsSync(file) || statSync(file).mtimeMs > builtAt)) return false;
    return true;
  } catch { return false; }
}

function npmCommand(args, label) {
  console.log(`[Whiteboard] ${label}`);
  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    console.error(`[Whiteboard] ${label} falhou. Confirme o acesso à internet e execute npm run blocksuite:build.`);
    if (result.error) console.error(result.error.message);
    process.exit(result.status || 1);
  }
}

if (editorBuilt()) {
  console.log('[Whiteboard] Editor visual pronto para abrir no navegador.');
} else {
  console.log('[Whiteboard] Preparando o editor visual do Whiteboard para a execução local.');
  npmCommand(['--prefix', 'integrations/blocksuite', 'install', '--no-audit', '--no-fund', '--package-lock=false'], 'Instalando dependências do editor');
  npmCommand(['--prefix', 'integrations/blocksuite', 'run', 'build'], 'Compilando canvas BlockSuite');
  if (!editorBuilt()) {
    console.error('[Whiteboard] O build terminou, mas os arquivos do canvas não foram encontrados em public/blocksuite/.');
    process.exit(1);
  }
  console.log('[Whiteboard] Editor instalado. Todos os quadros existentes permanecem preservados.');
}

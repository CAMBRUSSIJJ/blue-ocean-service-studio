import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Pinned upstream source. The editor is compiled as a static SPA and served
// under the Blue Ocean origin; no upstream account, iframe CDN or remote editor.
const REPOSITORY = 'https://github.com/laanlabs/openPlan3D.git';
const COMMIT = '98f9cb467e4045c6abc5d9880ada1f03dff50c68';
const WORK = join(process.cwd(), '.openplan3d-build');
const TARGET = join(process.cwd(), 'public', 'openplan3d');
const MARKER = join(TARGET, 'blue-ocean-source-commit.txt');
// Include local adapters so an edited toolbar cannot reuse an older build.
const adapterHash = createHash('sha256');
for (const source of ['scripts/prepare-openplan3d.mjs', 'src/integrations/openplan3d-blue-ocean.css', 'src/integrations/blue-ocean-cad-controls.css', 'src/integrations/blue-ocean-cad-controls.source', 'src/integrations/blue-ocean-room-bridge.source']) {
  adapterHash.update(readFileSync(join(process.cwd(), source)));
}
const TRANSFORM = 'bo-openplan-embed-v6-cad-controls-' + adapterHash.digest('hex').slice(0, 16);
const TRANSFORM_MARKER = join(TARGET, 'blue-ocean-transform-version.txt');
const isCurrent = existsSync(MARKER) && readFileSync(MARKER, 'utf8').trim() === COMMIT
  && existsSync(TRANSFORM_MARKER) && readFileSync(TRANSFORM_MARKER, 'utf8').trim() === TRANSFORM
  && existsSync(join(TARGET, 'editor', 'index.html'));
if (isCurrent) {
  console.log('OpenPlan3D estático: build verificado em cache (' + COMMIT.slice(0, 8) + ').');
  process.exit(0);
}
const run = (command, args, options = {}) => execFileSync(command, args, { stdio: 'inherit', ...options });
const write = (path, text) => writeFileSync(join(WORK, path), text, 'utf8');
const read = path => readFileSync(join(WORK, path), 'utf8');
if (!existsSync(join(WORK, '.git'))) {
  mkdirSync(WORK, { recursive: true });
  run('git', ['init', '-q', WORK]);
  run('git', ['-C', WORK, 'remote', 'add', 'origin', REPOSITORY]);
}
run('git', ['-C', WORK, 'fetch', '--depth', '1', 'origin', COMMIT]);
run('git', ['-C', WORK, 'checkout', '-f', 'FETCH_HEAD']);

// The original SvelteKit project uses adapter-node and runtime API routes.
// Blue Ocean only needs its client-side plan editor (no cloud handoff APIs).
write('src/routes/+layout.ts', 'export const ssr = false;\nexport const prerender = false;\nexport const trailingSlash = "always";\n');
// The static editor is served as /editor/index.html to bypass Vite SPA fallback.
// Rewrite only the browser-visible pathname before SvelteKit initializes,
// otherwise its client router sees an unknown /editor/index.html route.
const embeddedStartup = '<script>if(new URLSearchParams(location.search).has("boSession")||window.name.startsWith("boSession:")){document.documentElement.setAttribute("data-blue-ocean-cad","1");}if(location.pathname==="/openplan3d/editor/index.html"){history.replaceState(history.state,"", "/openplan3d/editor/"+location.search+location.hash);}</script>';
write('src/app.html', read('src/app.html')
  .replace('href="/favicon.svg"', 'href="/openplan3d/favicon.svg"')
  .replace('</head>', embeddedStartup + '</head>'));
// Visual-only adapter: preserve the upstream CSS and all editor components.
// Every selector is scoped to the embedded Blue Ocean iframe, and does not
// affect the standalone OpenPlan3D application or service graph operations.
const brandFile = join(process.cwd(), 'src', 'integrations', 'openplan3d-blue-ocean.css');
const brandCss = readFileSync(brandFile, 'utf8');
if (!brandCss.includes('html[data-blue-ocean-cad="1"]')) throw new Error('Skin de marca precisa permanecer restrita ao editor incorporado.');
write('src/app.css', read('src/app.css') + '\n/* Blue Ocean embedded CAD skin */\n' + brandCss + '\n'
  + readFileSync(join(process.cwd(), 'src/integrations/blue-ocean-cad-controls.css'), 'utf8'));
write('src/lib/BlueOceanCadControls.svelte', readFileSync(join(process.cwd(), 'src/integrations/blue-ocean-cad-controls.source'), 'utf8'));

// Analytics and Firebase handoff belong to the upstream hosted product, not
// this embedded editor. Disable the auto-import rather than relying on a
// deployment environment variable in the static client bundle.
const layoutPath = 'src/routes/+layout.svelte';
const layout = read(layoutPath);
const analyticsLine = "  onMount(() => { if (window.location.pathname !== '/render-lab' && env.PUBLIC_ENABLE_ANALYTICS !== 'false') void import('$lib/firebase'); });";
if (!layout.includes(analyticsLine)) throw new Error('Integração de privacidade OpenPlan3D precisa ser revisada: hook de analytics mudou.');
write(layoutPath, layout.replace(analyticsLine, "  onMount(() => { /* Blue Ocean embedded mode: no analytics or Firebase initialization. */ });"));

write('src/lib/blueOceanBridge.ts', "import { get } from 'svelte/store';\nimport { currentProject, createDefaultProject, loadProject } from '$lib/stores/project';\nimport { readProject } from '$lib/utils/projectValidation';\n\nconst CHANNEL = 'blue-ocean-openplan3d/v1';\n\n/** Runs only inside a same-origin Blue Ocean frame with a session token. */\nexport function installBlueOceanBridge(): () => void {\n  const session = new URLSearchParams(window.location.search).get('boSession') || (window.name.startsWith('boSession:') ? window.name.slice(10) : null);\n  if (!session || window.parent === window) return () => {};\n  let scopeId = '';\n  let baseVersion = 'null';\n  let ready = false, waiting = false, sequence = 0;\n  let lastSynced = '', pending = '';\n  let timer: ReturnType<typeof setTimeout> | undefined;\n  const send = (type: string, details: Record<string, unknown> = {}) =>\n    window.parent.postMessage({ channel: CHANNEL, session, type, ...details }, window.location.origin);\n  const transmit = () => {\n    timer = undefined;\n    if (!ready || !scopeId || waiting) return;\n    const value = get(currentProject);\n    if (!value) return;\n    if (value.id !== scopeId) {\n      loadProject({ ...value, id: scopeId });\n      return;\n    }\n    const json = JSON.stringify(value);\n    if (json === lastSynced) return;\n    pending = json;\n    waiting = true;\n    send('change', { sequence: ++sequence, baseVersion, project: JSON.parse(json) });\n  };\n  const changed = currentProject.subscribe(value => {\n    if (!ready || !value) return;\n    if (timer) clearTimeout(timer);\n    timer = setTimeout(transmit, 850);\n  });\n  const onMessage = (event: MessageEvent) => {\n    const data = event.data;\n    if (event.source !== window.parent || event.origin !== window.location.origin ||\n        !data || data.channel !== CHANNEL || data.session !== session) return;\n    if (data.type === 'ui') {\n      // Visual state only: preserve the mounted tools, selected object and CAD data.\n      document.documentElement.classList.toggle('bo-cad-tools-collapsed', data.toolsCollapsed === true);\n      return;\n    }\n    if (data.type === 'hydrate') {\n      try {\n        if (typeof data.scopeId !== 'string' || data.scopeId.length > 500) throw new Error('Identificação inválida.');\n        if (typeof data.baseVersion !== 'string') throw new Error('Versão do projeto inválida.');\n        const value = data.project\n          ? readProject(data.project)\n          : createDefaultProject(typeof data.name === 'string' ? data.name.slice(0, 120) : 'Planta física');\n        scopeId = data.scopeId;\n        baseVersion = data.baseVersion;\n        waiting = false;\n        const project = { ...value, id: scopeId };\n        loadProject(project);\n        lastSynced = JSON.stringify(project);\n        ready = true;\n        send('hydrated');\n      } catch (error) {\n        send('error', { message: error instanceof Error ? error.message : 'Falha ao abrir a planta.' });\n      }\n      return;\n    }\n    if (data.type === 'ack' && waiting && data.sequence === sequence) {\n      waiting = false;\n      if (data.accepted && typeof data.baseVersion === 'string') {\n        baseVersion = data.baseVersion;\n        lastSynced = pending;\n        if (timer) clearTimeout(timer);\n        timer = setTimeout(transmit, 500);\n      } else {\n        ready = false;\n        send('error', { message: typeof data.message === 'string' ? data.message : 'Conflito ao salvar a planta.' });\n      }\n    }\n  };\n  window.addEventListener('message', onMessage);\n  send('ready');\n  return () => {\n    changed();\n    if (timer) clearTimeout(timer);\n    window.removeEventListener('message', onMessage);\n  };\n}\n");
// Room-to-journey integration reads room selection only. Its source is
// isolated from the upstream code and copied into the temporary build.
write('src/lib/blueOceanRoomBridge.ts', readFileSync(
  join(process.cwd(), 'src', 'integrations', 'blue-ocean-room-bridge.source'), 'utf8',
));
const editorPath = 'src/routes/editor/+page.svelte';
let editor = read(editorPath);
const imported = "  import { onMount } from 'svelte';";
if (!editor.includes(imported)) throw new Error('API do editor OpenPlan3D mudou: import onMount ausente.');
editor = editor.replace(imported, imported + "\n  import { installBlueOceanBridge } from '$lib/blueOceanBridge';\n  import { installBlueOceanRoomBridge } from '$lib/blueOceanRoomBridge';\n  import BlueOceanCadControls from '$lib/BlueOceanCadControls.svelte';");
const canvasAnchor = "      <div class=\"flex-1 min-w-0 relative\">\n        {#if mode === '2d'}";
if (!editor.includes(canvasAnchor)) throw new Error('API do editor mudou: área da planta ausente.');
editor = editor.replace(canvasAnchor, '      <div class="flex-1 min-w-0 relative">\n        <BlueOceanCadControls libraryOpen={buildPanelOpen} active={mode === \'2d\'} onLibrary={() => buildPanelOpen = !buildPanelOpen} />\n        {#if mode === \'2d\'}');
editor = editor.replace('<div class="h-full max-md:fixed', '<div data-bo-library class="h-full max-md:fixed');
editor = editor.replace('<BuildPanel />', '{#if typeof document !== \'undefined\' && document.documentElement.dataset.blueOceanCad === \'1\'}<div data-bo-library-heading><strong>Biblioteca</strong><button type="button" aria-label="Fechar biblioteca de ferramentas" onclick={() => buildPanelOpen = false}>Fechar</button></div>{/if}\n          <BuildPanel />');
editor = editor.replace('class="md:hidden fixed bottom-4 left-4 w-12', 'data-bo-mobile-tools class="md:hidden fixed bottom-4 left-4 w-12');
const anchor = '  function onEditorKeydown(e: KeyboardEvent) {';
if (!editor.includes(anchor)) throw new Error('API do editor OpenPlan3D mudou: ponto de montagem ausente.');
editor = editor.replace(anchor, `
  onMount(() => {
    let stopBridge = () => {};
    let stopRoomBridge = () => {};
    const timer = window.setInterval(() => {
      if (!ready) return;
      window.clearInterval(timer);
      stopBridge = installBlueOceanBridge();
      stopRoomBridge = installBlueOceanRoomBridge();
    }, 80);
    return () => { window.clearInterval(timer); stopBridge(); stopRoomBridge(); };
  });

` + anchor);
write(editorPath, editor);
// Tag native controls rather than recreating floor/view/zoom state in React.
const toolbarPath = 'src/lib/components/toolbar/TopBar.svelte';
let toolbar = read(toolbarPath);
const floorAnchor = '<div class="flex items-center gap-1 max-xl:hidden">\n    <select aria-label={$t(\'floorControls.current\')}';
if (!toolbar.includes(floorAnchor)) throw new Error('API do editor mudou: seletor de pavimento ausente.');
toolbar = toolbar.replace(floorAnchor, floorAnchor.replace('<div ', '<div data-bo-floor-controls '));
toolbar = toolbar.replace('<div class="flex bg-white/15 rounded-full p-0.5">', '<div data-bo-view-modes class="flex bg-white/15 rounded-full p-0.5">');
const embeddedMode = "typeof document !== 'undefined' && document.documentElement.dataset.blueOceanCad === '1'";
toolbar = toolbar.replace('>2D</button>', '>{#if ' + embeddedMode + '}<span class="bo-cad-view-prefix">Planta </span>{/if}2D</button>')
  .replace('>3D</button>', '>{#if ' + embeddedMode + '}<span class="bo-cad-view-prefix">Visão </span>{/if}3D</button>');
toolbar = toolbar.replace("onclick={() => setMode('2d')}", "aria-label={" + embeddedMode + " ? 'Planta 2D' : '2D'} aria-pressed={mode === '2d'} onclick={() => setMode('2d')}")
  .replace("onclick={() => setMode('3d')}", "aria-label={" + embeddedMode + " ? 'Visão 3D' : '3D'} aria-pressed={mode === '3d'} onclick={() => setMode('3d')}");
write(toolbarPath, toolbar);
const canvasPath = 'src/lib/components/editor/FloorPlanCanvas.svelte';
const canvas = read(canvasPath);
const zoomAnchor = '<div style:bottom={`${zoomControlsBottom}px`} class="absolute left-3';
if (!canvas.includes(zoomAnchor)) throw new Error('API do editor mudou: controles de zoom ausentes.');
write(canvasPath, canvas.replace(zoomAnchor, zoomAnchor.replace('<div ', '<div data-bo-zoom ')));
// Bootstrap in stages. Keep upstream's adapter-node config intact during
// npm ci and npm install: SvelteKit's prepare lifecycle imports svelte.config.js.
// Otherwise the first npm ci resolves a static adapter that is not installed yet.
// The upstream lock stays unchanged; --legacy-peer-deps works around npm
// resolving an optional vite peer as `vite@undefined` on some Linux machines.
const runner = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const runNode24 = command => run(runner, ['--yes', '--package=node@24', '-c', command], {
  cwd: WORK,
  env: { ...process.env, NODE_ENV: 'production', NPM_CONFIG_INCLUDE: 'dev', PUBLIC_ENABLE_ANALYTICS: 'false' },
});
console.log('[OpenPlan3D 1/3] Instalando dependências originais com a configuração upstream...');
runNode24('npm ci --include=dev --no-audit --no-fund');
console.log('[OpenPlan3D 2/3] Instalando adaptador estático fora da árvore npm do OpenPlan3D...');
// npm install in WORK re-resolves all upstream dependencies, including Vite.
// With some registry mirrors this fails with ETARGET vite@^7.3.7 even though
// the lockfile's npm ci above succeeds. Install adapter in its OWN empty
// prefix, without peers, then copy just its package into the pinned project.
// adapter-static@3 has no runtime dependencies and peers on SvelteKit 2.
const ADAPTER_DIR = join(WORK, '.blue-ocean-static-adapter');
mkdirSync(ADAPTER_DIR, { recursive: true });
writeFileSync(join(ADAPTER_DIR, 'package.json'), JSON.stringify({
  name: 'blue-ocean-static-adapter-bootstrap', private: true, version: '1.0.0',
}, null, 2) + '\n');
runNode24('npm install --prefix .blue-ocean-static-adapter --no-save --package-lock=false --legacy-peer-deps --ignore-scripts --no-audit --no-fund @sveltejs/adapter-static@3.0.9');
const ADAPTER_SRC = join(ADAPTER_DIR, 'node_modules', '@sveltejs', 'adapter-static');
const ADAPTER_DST = join(WORK, 'node_modules', '@sveltejs', 'adapter-static');
if (!existsSync(join(ADAPTER_SRC, 'package.json'))) {
  throw new Error('O npm não instalou adapter-static no diretório isolado; confira a configuração do registry.');
}
mkdirSync(join(WORK, 'node_modules', '@sveltejs'), { recursive: true });
rmSync(ADAPTER_DST, { recursive: true, force: true });
cpSync(ADAPTER_SRC, ADAPTER_DST, { recursive: true });
if (!existsSync(join(ADAPTER_DST, 'package.json'))) throw new Error('Não foi possível incorporar o adaptador estático isolado.');
// Only after both installs succeed may the Svelte config use adapter-static.
write('svelte.config.js', `import adapter from '@sveltejs/adapter-static';
export default { kit: { adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html' }), paths: { base: '/openplan3d' }, prerender: { entries: [] } } };
`);
console.log('[OpenPlan3D 3/3] Compilando o motor CAD...');
runNode24('npm run build');
const output = join(WORK, 'build');
if (!existsSync(join(output, 'index.html'))) throw new Error('OpenPlan3D não produziu o HTML estático esperado.');
rmSync(TARGET, { force: true, recursive: true });
cpSync(output, TARGET, { recursive: true });
mkdirSync(join(TARGET, 'editor'), { recursive: true });
// Static hosting serves the same SPA shell from the editor URL.
cpSync(join(output, 'index.html'), join(TARGET, 'editor', 'index.html'));
cpSync(join(WORK, 'LICENSE'), join(TARGET, 'LICENSE'));
cpSync(join(WORK, 'MODEL_SOURCES.md'), join(TARGET, 'MODEL_SOURCES.md'));
writeFileSync(MARKER, COMMIT + '\n');
writeFileSync(TRANSFORM_MARKER, TRANSFORM + '\n');
console.log('OpenPlan3D incorporado ao Blue Ocean em /openplan3d/editor/ · fonte ' + COMMIT);

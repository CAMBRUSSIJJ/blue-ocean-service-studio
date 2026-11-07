import { cpSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// Pinned upstream source. The editor is compiled as a static SPA and served
// under the Blue Ocean origin; no upstream account, iframe CDN or remote editor.
const REPOSITORY = 'https://github.com/laanlabs/openPlan3D.git';
const COMMIT = '98f9cb467e4045c6abc5d9880ada1f03dff50c68';
const WORK = join(process.cwd(), '.openplan3d-build');
const TARGET = join(process.cwd(), 'public', 'openplan3d');
const MARKER = join(TARGET, 'blue-ocean-source-commit.txt');
const TRANSFORM = 'bo-openplan-embed-v2';
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
const embeddedStartup = '<script>if(location.pathname==="/openplan3d/editor/index.html"){history.replaceState(history.state,"", "/openplan3d/editor/"+location.search+location.hash);}</script>';
write('src/app.html', read('src/app.html')
  .replace('href="/favicon.svg"', 'href="/openplan3d/favicon.svg"')
  .replace('</head>', embeddedStartup + '</head>'));
// Analytics and Firebase handoff belong to the upstream hosted product, not
// this embedded editor. Disable the auto-import rather than relying on a
// deployment environment variable in the static client bundle.
const layoutPath = 'src/routes/+layout.svelte';
const layout = read(layoutPath);
const analyticsLine = "  onMount(() => { if (window.location.pathname !== '/render-lab' && env.PUBLIC_ENABLE_ANALYTICS !== 'false') void import('$lib/firebase'); });";
if (!layout.includes(analyticsLine)) throw new Error('Integração de privacidade OpenPlan3D precisa ser revisada: hook de analytics mudou.');
write(layoutPath, layout.replace(analyticsLine, "  onMount(() => { /* Blue Ocean embedded mode: no analytics or Firebase initialization. */ });"));

write('src/lib/blueOceanBridge.ts', "import { get } from 'svelte/store';\nimport { currentProject, createDefaultProject, loadProject } from '$lib/stores/project';\nimport { readProject } from '$lib/utils/projectValidation';\n\nconst CHANNEL = 'blue-ocean-openplan3d/v1';\n\n/** Runs only inside a same-origin Blue Ocean frame with a session token. */\nexport function installBlueOceanBridge(): () => void {\n  const session = new URLSearchParams(window.location.search).get('boSession') || (window.name.startsWith('boSession:') ? window.name.slice(10) : null);\n  if (!session || window.parent === window) return () => {};\n  let scopeId = '';\n  let baseVersion = 'null';\n  let ready = false, waiting = false, sequence = 0;\n  let lastSynced = '', pending = '';\n  let timer: ReturnType<typeof setTimeout> | undefined;\n  const send = (type: string, details: Record<string, unknown> = {}) =>\n    window.parent.postMessage({ channel: CHANNEL, session, type, ...details }, window.location.origin);\n  const transmit = () => {\n    timer = undefined;\n    if (!ready || !scopeId || waiting) return;\n    const value = get(currentProject);\n    if (!value) return;\n    if (value.id !== scopeId) {\n      loadProject({ ...value, id: scopeId });\n      return;\n    }\n    const json = JSON.stringify(value);\n    if (json === lastSynced) return;\n    pending = json;\n    waiting = true;\n    send('change', { sequence: ++sequence, baseVersion, project: JSON.parse(json) });\n  };\n  const changed = currentProject.subscribe(value => {\n    if (!ready || !value) return;\n    if (timer) clearTimeout(timer);\n    timer = setTimeout(transmit, 850);\n  });\n  const onMessage = (event: MessageEvent) => {\n    const data = event.data;\n    if (event.source !== window.parent || event.origin !== window.location.origin ||\n        !data || data.channel !== CHANNEL || data.session !== session) return;\n    if (data.type === 'hydrate') {\n      try {\n        if (typeof data.scopeId !== 'string' || data.scopeId.length > 500) throw new Error('Identificação inválida.');\n        if (typeof data.baseVersion !== 'string') throw new Error('Versão do projeto inválida.');\n        const value = data.project\n          ? readProject(data.project)\n          : createDefaultProject(typeof data.name === 'string' ? data.name.slice(0, 120) : 'Planta física');\n        scopeId = data.scopeId;\n        baseVersion = data.baseVersion;\n        waiting = false;\n        const project = { ...value, id: scopeId };\n        loadProject(project);\n        lastSynced = JSON.stringify(project);\n        ready = true;\n        send('hydrated');\n      } catch (error) {\n        send('error', { message: error instanceof Error ? error.message : 'Falha ao abrir a planta.' });\n      }\n      return;\n    }\n    if (data.type === 'ack' && waiting && data.sequence === sequence) {\n      waiting = false;\n      if (data.accepted && typeof data.baseVersion === 'string') {\n        baseVersion = data.baseVersion;\n        lastSynced = pending;\n        if (timer) clearTimeout(timer);\n        timer = setTimeout(transmit, 500);\n      } else {\n        ready = false;\n        send('error', { message: typeof data.message === 'string' ? data.message : 'Conflito ao salvar a planta.' });\n      }\n    }\n  };\n  window.addEventListener('message', onMessage);\n  send('ready');\n  return () => {\n    changed();\n    if (timer) clearTimeout(timer);\n    window.removeEventListener('message', onMessage);\n  };\n}\n");
const editorPath = 'src/routes/editor/+page.svelte';
let editor = read(editorPath);
const imported = "  import { onMount } from 'svelte';";
if (!editor.includes(imported)) throw new Error('API do editor OpenPlan3D mudou: import onMount ausente.');
editor = editor.replace(imported, imported + "\n  import { installBlueOceanBridge } from '$lib/blueOceanBridge';");
const anchor = '  function onEditorKeydown(e: KeyboardEvent) {';
if (!editor.includes(anchor)) throw new Error('API do editor OpenPlan3D mudou: ponto de montagem ausente.');
editor = editor.replace(anchor, `
  onMount(() => {
    let stopBridge = () => {};
    const timer = window.setInterval(() => {
      if (!ready) return;
      window.clearInterval(timer);
      stopBridge = installBlueOceanBridge();
    }, 80);
    return () => { window.clearInterval(timer); stopBridge(); };
  });

` + anchor);
write(editorPath, editor);
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
console.log('[OpenPlan3D 2/3] Instalando adaptador estático de forma isolada...');
runNode24('npm install --no-save --package-lock=false --legacy-peer-deps --ignore-scripts --no-audit --no-fund @sveltejs/adapter-static@3.0.9');
if (!existsSync(join(WORK, 'node_modules', '@sveltejs', 'adapter-static', 'package.json'))) {
  throw new Error('Adaptador estático do OpenPlan3D não foi instalado; veja o erro npm acima.');
}
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

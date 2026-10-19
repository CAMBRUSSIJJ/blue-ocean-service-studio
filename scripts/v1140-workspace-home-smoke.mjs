import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const tests = [];
const test = (name, ok) => tests.push([name, Boolean(ok)]);
const pkg = JSON.parse(read('package.json'));
const model = read('src/domain/model.ts');
const controller = read('src/state/useStudioController.ts');
const app = read('src/App.tsx');
const home = read('src/views/WorkspaceHome.tsx');
const runtimeHome = read('src/runtime/workspace-home.js');
const runtimeCss = read('src/runtime/workspace-home.css');
const whiteboard = read('src/runtime/whiteboard-core.js');
const journeyHome = read('src/runtime/journey-home.js');
const index = read('index.html');
const prepare = read('scripts/prepare-assets.mjs');

test('baseline Workspace Home preservada em versão >= 1.14.0', /^1\.(?:1[4-9]|[2-9]\d)\./.test(pkg.version));
test('rota home tipada', /ActiveTab = 'home' \| (?:'context' \| )?(?:'whiteboards' \| )?'journey'/.test(model));
test('workspace é entrada padrão', /useState<ActiveTab>\('home'\)/.test(controller));
test('Home React consome Service Graph real', /graph\.service\.id/.test(home) && /Object\.values\(graph\.journeys\)/.test(home) && /buildServiceHealthReport\(graph\)/.test(home) && /buildAttentionReport\(graph\)/.test(home));
test('Home React possui continuidade e histórico de trabalho', /buildContinueReport\(workspaceTargets, workspacePreferences, 50\)/.test(home) && /recordRecentContext/.test(home) && /Ver todos os recentes/.test(home));
test('App expõe Workspace IA com criação por módulo', /data-sidebar-section="design"/.test(app) && /data-sidebar-section="context"/.test(app) && /data-sidebar-section="management"/.test(app) && /WorkspaceLibraryView/.test(app) && !/bo114-global-create/.test(app));
test('8 tipos de criação disponíveis', ['journey','blueprint','whiteboard','research','problem','opportunity','action','metric'].every(k => runtimeHome.includes(`kind==='${k}'`)));
test('runtime Workspace Home registrado', /runtime\.register\('workspaceHome'/.test(runtimeHome));
test('Whiteboard livre possui API de criação', /createBlankWhiteboard/.test(whiteboard) && /createBlank:createBlankWhiteboard/.test(whiteboard));
test('Journey Home não atropela Workspace Home', /runtime\.has\('workspaceHome'\)/.test(journeyHome));
test('assets V1.14 entram no pipeline', /v1140-workspace-home\.js/.test(prepare) && /v1140-workspace-home\.css/.test(prepare) && /v1140-workspace-home\.js/.test(index));
test('CSS usa Design Tokens V2', /var\(--bo-color-primary-900\)/.test(runtimeCss) && /var\(--bo-color-border\)/.test(runtimeCss));
test('sem diálogos nativos no runtime', !/\bprompt\s*\(|\bconfirm\s*\(/.test(runtimeHome));
test('sem polling DOM por MutationObserver', !/MutationObserver/.test(runtimeHome));

let failed = 0;
for (const [name, ok] of tests) { console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}`); if (!ok) failed++; }
console.log(`\nV1.14.0 Workspace Home: ${tests.length - failed}/${tests.length}`);
if (failed) process.exit(1);

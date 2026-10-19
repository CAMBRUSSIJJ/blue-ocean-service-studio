import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(p, 'utf8');
const app = read('src/App.tsx');
const dashboard = read('src/views/WorkspaceDashboardView.tsx');
const homeRuntime = read('src/runtime/workspace-home.js');
const shell = read('src/runtime/blue-ocean-shell.js');
const css = read('src/runtime/workspace-library-h3.css');
const pkg = JSON.parse(read('package.json'));
let ok = 0, fail = 0;
const check = (name, pass) => { if (pass) { ok++; console.log('OK   ' + name); } else { fail++; console.error('FAIL ' + name); } };

check('hotfix preserva versão funcional 1.20.5', pkg.version === '1.20.5');
check('Dashboard React declara ownership nativo', dashboard.includes('data-bo-workspace-home-native="1"'));
check('main declara view ativa', app.includes('data-bo-active-view={externalNav ?? activeTab}'));
check('main possui âncora canônica única', app.includes('id="bo-main-content"'));
check('App possui coordenador de superfícies legadas', app.includes('function hideLegacyPageSurfaces()'));
for (const root of ['#bo-v114-workspace-home','#rt187-journey-home','#rt182-blueprint-home','#rt192-research-home','#rt195-intelligence-home','#rt196-benefits-home','#rt197-review-home','#rt1102-practical-simulation','#rt1101-collaboration','#bo1173-settings-home']) {
  check(`coordenador conhece ${root}`, app.includes(`'${root}'`));
}
check('core navigation sincroniza rt-navigation', app.includes("window.dispatchEvent(new CustomEvent('rt-navigation', { detail: tab }))"));
check('library navigation sincroniza rt-navigation', app.includes("window.dispatchEvent(new CustomEvent('rt-navigation', { detail: 'context' }))"));
check('troca de core view esconde superfícies legadas', app.includes('if (externalNav) return;') && app.includes('hideLegacyPageSurfaces();'));
check('workspace runtime detecta shell React nativo', homeRuntime.includes("function nativeShell(){return !!q('aside[data-bo-precision-sidebar-native=\"1\"]')}"));
check('workspace runtime remove artefatos injetados', homeRuntime.includes('function cleanupNativeArtifacts()') && homeRuntime.includes("q('[data-bo-workspace-home-nav]')?.remove()") && homeRuntime.includes("q('[data-bo-global-create]')?.remove()"));
check('runtime não injeta Workspace em sidebar nativa', homeRuntime.includes("aside.dataset.boPrecisionSidebarNative==='1'"));
check('runtime não injeta Criar em shell nativo', homeRuntime.includes("function ensureGlobalCreate(){if(nativeShell()"));
check('runtime show usa Home React quando shell é nativo', homeRuntime.includes("if(nativeShell()){cleanupNativeArtifacts();requestAnimationFrame"));
check('rt-app-ready não reabre Home runtime no shell nativo', homeRuntime.includes("window.addEventListener('rt-app-ready',()=>{if(nativeShell()){cleanupNativeArtifacts();return}"));
check('blue-ocean shell não reagrupa sidebar React', shell.includes("if(aside.dataset.boPrecisionSidebarNative==='1')return;"));
check('CSS bloqueia Home legada sob shell H3/H6', css.includes('body.bo1205h3-workspace-ia #bo-v114-workspace-home{display:none!important}'));
check('CSS bloqueia Workspace injetado', css.includes('aside[data-bo-precision-sidebar-native="1"] [data-bo-workspace-home-nav]{display:none!important}'));
check('CSS bloqueia Criar global legado', css.includes('header[data-bo-precision-header-native="1"] .bo114-global-create{display:none!important}'));

console.log(`\nV1.20.5-H6 Routing & Layer Recovery: ${ok} OK / ${fail} FAIL`);
if (fail) process.exit(1);

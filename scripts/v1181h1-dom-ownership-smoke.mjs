import fs from 'node:fs';
const read = p => fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const shell=read('src/runtime/shell-consistency.js');
const precision=read('src/runtime/precision-studio-shell.js');
const home=read('src/runtime/workspace-home.js');
const runtimes=['research-workspace','service-intelligence','benefits-realization','operating-review','practical-simulation','collaboration','unified-workspaces'].map(n=>read(`src/runtime/${n}.js`));
const checks=[
 ['React sidebar declares native ownership',/data-bo-precision-sidebar-native="1"/.test(app)],
 ['React header declares native ownership',/data-bo-precision-header-native="1"/.test(app)],
 ['Workspace IA owns Personas nav',/openLibraryPage\('personas'\)/.test(app)],
 ['Workspace IA owns Portfolio nav',/openLibraryPage\('portfolio'\)/.test(app)],
 ['Workspace IA owns Metrics nav',/openLibraryPage\('metrics'\)/.test(app)],
 ['Pesquisa sai da sidebar nativa na H17.0.3', !/data-rt192-research-nav="1"/.test(app) && app.includes('Pesquisa histórica preservada')],
 ['Native Collaboration nav exists',/data-rt-collab-nav="1"/.test(app)],
 ['Native Settings nav exists',/data-bo1173-settings-nav="1"/.test(app)],
 ['Shell consistency skips native header mutation',/boPrecisionHeaderNative==='1'.*return/.test(shell)],
 ['Shell consistency skips native sidebar structure',/boPrecisionSidebarNative==='1'\)return/.test(shell)],
 ['Precision shell does not append toggle to native sidebar',/boPrecisionSidebarNative==='1'\)return/.test(precision)],
 ['Workspace runtime does not rewrite native header',/boPrecisionHeaderNative==='1'\)return/.test(home)],
 ['Workspace runtime does not rewrite native nav state',/aside\[data-bo-precision-sidebar-native/.test(home)],
 ['Legacy module runtimes all guard native sidebar',runtimes.every(t=>/boPrecisionSidebarNative/.test(t))],
];
let bad=0; for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)bad++}
console.log(`\nDOM Ownership: ${checks.length-bad}/${checks.length}`);if(bad)process.exit(1);

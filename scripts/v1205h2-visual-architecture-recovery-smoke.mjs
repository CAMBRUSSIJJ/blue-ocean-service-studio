import { readFileSync } from 'node:fs';
let okCount=0;
function ok(cond,label){if(!cond){console.error('FAIL',label);process.exitCode=1}else{console.log('OK  ',label);okCount++}}
const read=(p)=>readFileSync(p,'utf8');
const shell=read('src/runtime/blue-ocean-shell.js');
const publicShell=read('public/v1120-shell.js');
const app=read('src/App.tsx');
const home=read('src/views/WorkspaceHome.tsx');
const homeCss=read('src/runtime/service-project-home.css');
const h3Css=read('src/runtime/workspace-library-h3.css');
const dashCss=read('src/runtime/dashboard-parity.css');

ok(shell.includes("headingBefore(context,'context','CONTEXTO')"),'shell ancora CONTEXTO no botão Contexto');
ok(shell.includes("headingBefore(whiteboards,'design','DESENHO')"),'shell ancora DESENHO antes de Whiteboards');
ok(shell.includes("headingBefore(metrics,'validation','VALIDAÇÃO')"),'shell ancora VALIDAÇÃO antes de Métricas');
ok(shell.includes("headingBefore(action,'improvement','MELHORIA')"),'shell ancora MELHORIA antes do Plano de Ação');
ok(shell.includes("headingBefore(review,'workspace','WORKSPACE')"),'shell ancora WORKSPACE antes da Revisão');
ok(!shell.includes("headingBefore(research,'insights','ENTENDER')"),'shell não recria grupo ENTENDER legado');
ok(!shell.includes("headingBefore(journey,'design','DESIGN')"),'shell não joga Whiteboards para fora do grupo de desenho');
ok(!shell.includes("headingBefore(action,'improve','MELHORAR')"),'shell não recria MELHORAR legado');
ok(!shell.includes("headingBefore(review,'operate','OPERAR')"),'shell não recria OPERAR legado');
ok(publicShell.includes("headingBefore(whiteboards,'design','DESENHO')"),'asset público espelha navegação nova');

ok(app.includes('data-bo-global-search-native="1" className="sr-only"'),'Home bloqueia injeção legada de busca');
ok(app.includes('data-bo-global-create-native="1" className="sr-only"'),'Home bloqueia injeção legada de Criar');
ok(dashCss.includes('header collision guard'),'CSS possui proteção contra colisão no header');
ok(dashCss.includes('.bo1187-dashboard-header__actions .bo114-global-create'),'Criar legado é neutralizado na Home');
ok(dashCss.includes('.bo1187-dashboard-header__actions .bo115-search-trigger'),'Busca legada é neutralizada na Home');

ok(home.includes('<small>SERVICE HOME</small>'),'hero usa rótulo limpo SERVICE HOME');
ok(!home.includes("SERVICE HOME · {serviceProject.status"),'hero remove EM CONSTRUÇÃO dinâmico');
ok(!home.includes('className="bo1195-project-status"'),'hero remove score duplicado de fase');
ok(!home.includes('className="bo1195-project-summary bo1197-project-summary"'),'Home remove resumo lateral duplicado');
ok(home.includes('data-overall-score={serviceProjectReport.overallScore}'),'overallScore continua disponível sem poluir UI');
ok(home.includes('data-blocking-gaps={serviceReadinessReport.blockingGaps.length}'),'blocking gaps continuam expostos semanticamente');

ok(homeCss.includes('V1.20.5-H2 — Visual Architecture Recovery'),'CSS do H2 registrado');
ok(homeCss.includes('.bo1197-project-phases>button{min-height:64px'),'fases foram compactadas');
ok(homeCss.includes('.bo1195-project-summary,.bo1197-project-summary{display:none!important}'),'resumo lateral fica oculto mesmo em CSS legado');
ok(homeCss.includes('.bo1204-readiness-head p{display:none}'),'Readiness remove explicação redundante da superfície principal');
ok(h3Css.includes('.bo1205h3-workspace-page'),'Contexto antigo foi sucedido por páginas próprias');
ok(h3Css.includes('.bo1205h3-table'),'objetos de contexto usam tabela enxuta');
ok(h3Css.includes('.bo1205h3-sidebar'),'sidebar H3 preserva recuperação visual e nova IA');


const pyServer=read('scripts/serve-linux.py');
const nodeServer=read('scripts/serve-linux.mjs');
ok(pyServer.includes("Cache-Control', 'no-store, max-age=0'"),'servidor Python impede cache de assets legados');
ok(nodeServer.includes("Cache-Control', 'no-store, max-age=0'"),'servidor Node impede cache de assets legados');

if(!process.exitCode) console.log(`V1.20.5-H2 Visual Architecture Recovery: ${okCount} OK / 0 FAIL`);

import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const css=read('src/runtime/ocean-surface-h717.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const app=read('src/App.tsx');
const dashboard=read('src/views/WorkspaceDashboardView.tsx');
const auth=read('src/auth/AuthExperience.tsx');
const preflight=read('preflight-linux.sh');
const pkg=JSON.parse(read('package.json'));
const dark=read('public/blue-ocean-surface-dark-h717.svg');
const light=read('public/blue-ocean-surface-light-h717.svg');
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};

check(css.includes('H7.17 — Ocean Surface & Background System'),'CSS declara H7.17');
check(css.includes('--bo-h717-deep')&&css.includes('--bo-h717-aqua'),'tokens oceânicos H7.17 presentes');
check(css.includes('.bo-h717 .bo-auth-shell{'),'login recebe superfície oceânica própria');
check(css.includes("url('/blue-ocean-surface-dark-h717.svg')"),'login usa composição vetorial contínua');
check(css.includes('.bo-h717 .bo-auth-wave{display:none!important}'),'raster antigo fragmentado é neutralizado');
check(css.includes('.bo-h717 .bo-auth-story__veil'),'story veil preserva contraste do texto');
check(css.includes('.bo-h717 .bo-auth-card'),'card de login preserva superfície legível');
check(css.includes('.bo-h717 .bo-auth-panel__footer'),'footer do login é compatível com fundo escuro');

check(css.includes('body.bo-h717.rt182-host #root main{'),'workspace possui fundo oceânico sem alterar viewport dos editores');
check(css.includes("url('/blue-ocean-surface-light-h717.svg')"),'workspace usa onda vetorial leve contínua');
check(css.includes('.bo1215-dashboard[data-ocean-home="7.15"]'),'H7.17 respeita a Home H7.15');
check(css.includes('background:transparent!important'),'dashboard não cria placa branca sobre a superfície');
check(css.includes('.bo1215-recents::after{display:none!important}'),'anel isolado de Recentes foi removido');
check(css.includes('.bo1215-panel-wave{display:none!important}'),'meia-onda isolada do painel foi removida');
check(css.includes('backdrop-filter:blur(9px)'),'Recentes vira shelf translúcida integrada');
check(css.includes('.bo1215-recent-card:hover'),'cards recentes preservam feedback visual');
check(css.includes('.bo1215-learn-grid>button'),'Aprender integra a nova superfície');
check(css.includes('.bo-h701-wave-front'),'sidebar compartilha a paleta da superfície');

check(dark.includes('<svg')&&dark.includes('linearGradient')&&dark.includes('<path'),'asset dark possui ondas vetoriais');
check(light.includes('<svg')&&light.includes('linearGradient')&&light.includes('<path'),'asset light possui ondas vetoriais');
check(style.includes("@import './runtime/ocean-surface-h717.css';"),'CSS H7.17 importado');
check(style.indexOf('blue-ocean-object-language-h716.css') < style.indexOf('ocean-surface-h717.css'),'H7.17 sucede H7.16 na cascata');
check(main.includes("'bo-h717'"),'body recebe marker H7.17');
check(app.includes('data-ocean-surface="7.17"'),'shell declara Ocean Surface 7.17');
check(dashboard.includes('data-ocean-surface="7.17"'),'Dashboard declara Ocean Surface 7.17');
check(auth.includes('<WaveBackdrop />'),'componente antigo permanece sem quebra de API e é neutralizado por CSS');
check(preflight.includes('ocean-surface-h717.css'),'preflight conhece CSS H7.17');
check(preflight.includes('v1205h717-ocean-surface-smoke.mjs'),'preflight conhece smoke H7.17');
check(Boolean(pkg.scripts['v1205h717:ocean-surface-smoke']),'script H7.17 registrado');
check(pkg.scripts.qa?.includes('v1205h717:ocean-surface-smoke'),'QA acumulado inclui H7.17');

console.log(`\nH7.17 Ocean Surface & Background System: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

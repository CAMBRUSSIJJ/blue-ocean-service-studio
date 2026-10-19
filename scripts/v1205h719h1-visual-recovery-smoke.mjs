import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const css=read('src/runtime/visual-recovery-h719h1.css');
const prior=read('src/runtime/motion-identity-h719.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const app=read('src/App.tsx');
const preflight=read('preflight-linux.sh');
const pkg=JSON.parse(read('package.json'));
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};

check(css.includes('H7.19-H1 — Visual Recovery & Motion Stabilization'),'CSS declara H7.19-H1');
check(css.includes('.bo-h719h1 .bo-h719-auth-motion__current'),'corrente recebe correção dedicada');
check(css.includes('.bo-h719h1 .bo-h719-auth-motion__foam'),'espuma recebe correção dedicada');
check(!css.includes("url('/blue-ocean-surface-dark-h717.svg')"),'hotfix não duplica o SVG oceânico no compositor');
check(css.includes('radial-gradient(78% 62%'),'corrente vira glow feathered sem borda retangular');
check(css.includes('mix-blend-mode:normal!important'),'blend screen é neutralizado');
check(css.includes('@keyframes bo-h719h1-base-tide'),'onda ilustrada única continua animada');
check(css.includes('.bo1215-dashboard[data-ocean-home="7.15"]::after'),'overlay animado do dashboard é estabilizado');
check(css.includes('background:\n    radial-gradient(58% 58%'),'dashboard usa glow em vez de duplicar a onda');

check(css.includes('width:20px!important;height:20px!important'),'ícones da sidebar deixam de ser bolhas de 28px');
check(css.includes('background:transparent!important'),'estado base do glyph é transparente');
check(css.includes('color:#5a7185!important'),'sidebar possui resting color unificado');
check(css.includes('button:hover .bo-h719-sidebar-icon'),'hover mantém cor semântica sem bolha');
check(css.includes('button.is-active .bo-h719-sidebar-icon'),'ativo recebe tratamento compacto');
check(css.includes('Use ::before for active position'),'indicador ativo usa pseudo-elemento separado do ripple');
check(css.includes('button.is-wave-source::after'),'click ripple é explicitamente restaurado');
check(css.includes('button.is-active:not(.is-wave-source)::after'),'pseudo-elemento conflitante é desativado fora do ripple');
check(css.includes('.bo-h701-nav-section__label::before'),'separador de seção é simplificado');
check(css.includes('width:3px!important;height:10px!important'),'marcador de seção vira filete vertical');

check(style.includes("@import './runtime/visual-recovery-h719h1.css';"),'CSS hotfix importado');
check(style.indexOf('motion-identity-h719.css') < style.indexOf('visual-recovery-h719h1.css'),'hotfix sucede H7.19 na cascata');
check(main.includes("'bo-h719h1'"),'body recebe marker H7.19-H1');
check(app.includes('data-visual-recovery="7.19-H1"'),'shell declara recuperação visual');
check(prior.includes("url('/blue-ocean-surface-dark-h717.svg')"),'causa original da duplicação continua rastreável no baseline H7.19');
check(Boolean(pkg.scripts['v1205h719h1:visual-recovery-smoke']),'script H7.19-H1 registrado');
check(pkg.scripts.qa?.includes('v1205h719h1:visual-recovery-smoke'),'QA acumulado inclui H7.19-H1');
check(preflight.includes('visual-recovery-h719h1.css'),'preflight conhece CSS H7.19-H1');
check(preflight.includes('v1205h719h1-visual-recovery-smoke.mjs'),'preflight conhece smoke H7.19-H1');

console.log(`\nH7.19-H1 Visual Recovery & Motion Stabilization: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

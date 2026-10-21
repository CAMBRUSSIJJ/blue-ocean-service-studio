import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const css=read('src/runtime/research-workflow-ux-h166.css');
const style=read('src/style.css');
const pkg=JSON.parse(read('package.json'));
const changelog=read('CHANGELOG.md');
const launcher=read('start-linux.sh');
const preflight=read('preflight-linux.sh');
let ok=0,fail=0;
const check=(name,cond)=>{if(cond){ok++;console.log(`PASS ${name}`)}else{fail++;console.error(`FAIL ${name}`)}};

check('CSS H16.6 permanece importado',style.includes("@import './runtime/research-workflow-ux-h166.css';"));
check('transition de card inclui background corretamente',css.includes('transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,opacity .16s ease,background .16s ease;cursor:grab'));
check('sequência CSS inválida removida',!css.includes('opacity .16s ease;background .16s ease'));
check('regra do card fecha corretamente',/\.bo-h166-card\{[^}]*transition:[^;}]*background \.16s ease;cursor:grab\}/.test(css));
check('hover do card preservado',css.includes('.bo-h166-card:hover'));
check('dragging preservado',css.includes('.bo-h166-card.is-dragging'));
check('reduced motion preservado',css.includes('@media(prefers-reduced-motion:reduce)'));
check('metadata preserva H16.6.1 no histórico',String(pkg.description||'').includes('V1.20.5-H16.6.1 CSS Build Hotfix'));
check('script H16.6.1 registrado',pkg.scripts['v1205h1661:css-build-hotfix-smoke']==='node scripts/v1205h1661-css-build-hotfix-smoke.mjs');
check('QA preserva H16.6.1',String(pkg.scripts?.qa||'').includes('npm run v1205h1661:css-build-hotfix-smoke'));
check('launcher aponta H16.6.1 ou posterior',/RELEASE="H16\.(?:6\.1|7|8|9)/.test(launcher)||launcher.includes('RELEASE="H17'));
check('preflight executa smoke H16.6.1',preflight.includes('v1205h1661-css-build-hotfix-smoke.mjs'));
check('changelog registra H16.6.1',changelog.includes('# V1.20.5-H16.6.1 — CSS Build Hotfix'));
check('release notes H16.6.1 existem',fs.existsSync('docs/archive/releases/RELEASE_NOTES_V1.20.5-H16.6.1.md'));

console.log(`\nH16.6.1 CSS Build Hotfix: ${ok}/${ok+fail} PASS`);
process.exit(fail?1:0);

import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const css=read('src/runtime/motion-identity-h719.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const auth=read('src/auth/AuthExperience.tsx');
const app=read('src/App.tsx');
const objects=read('src/design-system/blue-ocean-objects.tsx');
const preflight=read('preflight-linux.sh');
const pkg=JSON.parse(read('package.json'));
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};

check(css.includes('H7.19 — Motion Identity & Sidebar Icon System'),'CSS declara H7.19');
// Motion System v1.21: as camadas depth/current/foam eram ocultadas pelo layout de entrada e foram removidas;
// a coreografia de entrada do login agora vive em src/design-system/motion.css.
const motion=read('src/design-system/motion.css');
check(!auth.includes('bo-h719-auth-motion'),'login não renderiza camadas de oceano ocultas (código morto removido)');
check(!css.includes('infinite'),'H7.19 não mantém loops de movimento');
check(motion.includes('@keyframes bo-motion-enter-side')&&motion.includes('.bo-auth-card{animation:bo-motion-enter-side'),'card entra sem alterar layout');
check(motion.includes('@keyframes bo-motion-mark-glint'),'marca possui brilho de entrada controlado');
check(motion.includes('@keyframes bo-motion-cta-current'),'CTA possui corrente no hover');
check(css.includes('@media(prefers-reduced-motion:reduce)')&&motion.includes('@media(prefers-reduced-motion:reduce)'),'motion respeita reduced-motion');
check(css.includes('.bo-h719-sidebar-icon'),'sidebar possui assinatura H7.19');
check(css.includes('border-radius:50% 50% 45% 55%'),'container abandona quadrado genérico por forma orgânica');
check(css.includes('.bo-h719-sidebar-icon::after'),'ícones recebem current line');
check(css.includes('button:hover .bo-h719-sidebar-icon'),'hover específico existe');
check(css.includes('button.is-active .bo-h719-sidebar-icon'),'estado ativo específico existe');
check(css.includes('Current indicator on the left'),'indicador ativo migra para corrente lateral');
check(css.includes('[data-sidebar-section="design"]'),'grupo Desenho recebe identidade própria');
check(css.includes('[data-sidebar-section="context"]'),'grupo Contexto recebe identidade própria');
check(css.includes('[data-sidebar-section="management"]'),'grupo Gestão recebe identidade própria');
check((app.match(/bo-h719-sidebar-icon/g)||[]).length>=18,'sidebar aplica H7.19 em pelo menos 18 entradas');
check(app.includes('data-motion-identity="7.19"'),'shell declara H7.19');

check(objects.includes('M2.8 15.8C6.2 15.8'),'Journey ganha rota oceânica refinada');
check(objects.includes('M3.5 6.5c4-1.8'),'Blueprint ganha camadas em corrente');
check(objects.includes('M9 7.2c3.1 0'),'Whiteboard ganha conexão orgânica');
check(objects.includes('M4.2 10.2c.4-4.7'),'Persona ganha halo refinado');
check(objects.includes('M3.5 8h6.8'),'Problema ganha ruptura visual');
check(objects.includes('M3 20c2.2-1.4'),'Evidência ganha assinatura de corrente');
check(objects.includes("case 'settings'")&&objects.includes('M4 7c3-1.4'),'Configurações usa ondas em vez de sliders genéricos');
check(objects.includes("case 'dashboard'")&&objects.includes('M3.5 16.5V9.2'),'Dashboard usa glyph oceânico refinado');

check(style.includes("@import './runtime/motion-identity-h719.css';"),'CSS H7.19 importado');
check(style.indexOf('journey-cover-h718h1.css') < style.indexOf('motion-identity-h719.css'),'H7.19 sucede H7.18-H1 na cascata');
check(main.includes("'bo-h719'"),'body recebe marker H7.19');
check(preflight.includes('motion-identity-h719.css')&&preflight.includes('v1205h719-motion-identity-sidebar-smoke.mjs'),'preflight conhece H7.19');
check(Boolean(pkg.scripts['v1205h719:motion-identity-smoke']),'script H7.19 registrado');
check(pkg.scripts.qa?.includes('v1205h719:motion-identity-smoke'),'QA acumulado inclui H7.19');

console.log(`\nH7.19 Motion Identity & Sidebar Icon System: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

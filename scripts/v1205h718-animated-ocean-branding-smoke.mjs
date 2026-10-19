import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const css=read('src/runtime/animated-ocean-branding-h718.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const app=read('src/App.tsx');
const dashboard=read('src/views/WorkspaceDashboardView.tsx');
const objects=read('src/design-system/blue-ocean-objects.tsx');
const preflight=read('preflight-linux.sh');
const pkg=JSON.parse(read('package.json'));
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};

check(css.includes('H7.18 — Animated Ocean Branding & Navigation Icons'),'CSS declara H7.18');
check(css.includes('@keyframes bo-h718-auth-wave-drift'),'login possui deriva animada das mesmas ondas');
check(css.includes('@keyframes bo-h718-workspace-current'),'workspace possui corrente animada');
check(css.includes('@keyframes bo-h718-sidebar-current-front'),'onda da sidebar possui movimento próprio');
check(css.includes("url('/blue-ocean-surface-light-h717.svg')"),'animação reutiliza asset H7.17 sem redesenhar a onda');
check(css.includes('@media(prefers-reduced-motion:reduce)'),'movimento respeita preferência de acessibilidade');
check(css.includes('.bo-h718-sidebar-icon'),'sidebar usa container de glyph proprietário');
check(css.includes('[data-icon-kind="journey"]')&&css.includes('[data-icon-kind="problem"]')&&css.includes('[data-icon-kind="evidence"]'),'sidebar diferencia objetos semanticamente');
check(css.includes('.bo-h718-recents-heading'),'Recentes possui heading branded');
check(css.includes('.bo-h718-service-context'),'serviço vira contexto compacto em Recentes');
check(css.includes('.bo-h718-artifact-mark'),'thumbnails recebem assinatura de objeto');
check(css.includes('.bo-h718-current-line'),'thumbnails recebem linha de corrente');

check(objects.includes('export type BlueOceanUtilityKind'),'design system possui glyphs utilitários Blue Ocean');
check(objects.includes('export function BlueOceanUtilityIcon'),'utility glyphs são componente canônico');
check(objects.includes("case 'dashboard'")&&objects.includes("case 'research'")&&objects.includes("case 'settings'"),'glyphs da navegação deixam de ser genéricos');
check(objects.includes("case 'recent'")&&objects.includes("case 'favorite'")&&objects.includes("case 'learn'"),'glyphs de Home seguem a mesma gramática');
check(objects.includes('bo-h718-artifact-preview'),'Artifact Preview declara evolução H7.18');

check((app.match(/bo-h718-sidebar-icon/g)||[]).length>=18,'sidebar principal usa pelo menos 18 glyphs Blue Ocean');
check(app.includes('BlueOceanObjectIcon kind="journey"'),'Journey da sidebar usa glyph proprietário');
check(app.includes('BlueOceanObjectIcon kind="blueprint"'),'Blueprint da sidebar usa glyph proprietário');
check(app.includes('BlueOceanObjectIcon kind="whiteboard"'),'Whiteboard da sidebar usa glyph proprietário');
check(app.includes('BlueOceanObjectIcon kind="problem"'),'Problema da sidebar usa glyph proprietário');
check(app.includes('BlueOceanObjectIcon kind="evidence"'),'Evidência da sidebar usa glyph proprietário');
check(app.includes('BlueOceanUtilityIcon kind="settings"'),'Configurações usa glyph Blue Ocean');
check(app.includes('data-animated-ocean-branding="7.18"'),'shell declara H7.18');

check(dashboard.includes('data-animated-ocean-branding="7.18"'),'Dashboard declara H7.18');
check(dashboard.includes('id="bo1207-recents-title"><BlueOceanUtilityIcon kind="recent" size={18}/> Recentes</h2>'),'título foi simplificado para Recentes');
check(!dashboard.includes('Recentes de {graph.service.name'),'nome longo antigo foi removido');
check(dashboard.includes('bo-h718-service-context'),'nome do serviço aparece como contexto compacto');
check(dashboard.includes('bo-h718-recent-kind'),'cards Journey/Blueprint/Whiteboard exibem glyph de tipo');
check(dashboard.includes('BlueOceanUtilityIcon kind="create"'),'ações de criação usam glyph Blue Ocean');
check(dashboard.includes('BlueOceanUtilityIcon kind="learn"'),'Aprender usa glyph Blue Ocean');

check(style.includes("@import './runtime/animated-ocean-branding-h718.css';"),'CSS H7.18 importado');
check(style.indexOf('ocean-surface-h717.css') < style.indexOf('animated-ocean-branding-h718.css'),'H7.18 sucede H7.17 na cascata');
check(main.includes("'bo-h718'"),'body recebe marker H7.18');
check(preflight.includes('animated-ocean-branding-h718.css')&&preflight.includes('v1205h718-animated-ocean-branding-smoke.mjs'),'preflight conhece H7.18');
check(Boolean(pkg.scripts['v1205h718:animated-ocean-branding-smoke']),'script H7.18 registrado');
check(pkg.scripts.qa?.includes('v1205h718:animated-ocean-branding-smoke'),'QA acumulado inclui H7.18');

console.log(`\nH7.18 Animated Ocean Branding & Navigation Icons: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

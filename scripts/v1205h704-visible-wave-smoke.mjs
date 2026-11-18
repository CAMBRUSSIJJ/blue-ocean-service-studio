import fs from 'node:fs';
const app = fs.readFileSync('src/App.tsx','utf8');
// Motion System v1.21: a reação de onda migrou de sidebar-h701.css para motion.css.
const css = fs.readFileSync('src/runtime/sidebar-h701.css','utf8') + fs.readFileSync('src/design-system/motion.css','utf8');
const checks = [
  ['sidebar click handler permanece ligado', app.includes('onClickCapture={handleSidebarWaveInteraction}')],
  ['origem vertical calculada pelo botão', app.includes("--bo-wave-origin-y")],
  ['pulso lateral está acima da navegação', /\.bo1205h3-sidebar::after\{[^}]*z-index:4/.test(css)],
  ['ripple próprio do botão existe', css.includes('button.is-wave-source::after')],
  ['ripple do botão expande', css.includes('@keyframes bo-motion-nav-button-ripple') && css.includes('scale(12)')],
  ['onda inferior faz surge visível', css.includes('@keyframes bo-motion-nav-surge') && css.includes('-14px')],
  ['feedback reduced-motion não desaparece', css.includes('@keyframes bo-motion-nav-reduced-pulse')],
  ['verde legado não foi reintroduzido', !/#1d9e75|rgba\(29,158,117/i.test(css)],
];
let fail=0;
for (const [name,ok] of checks){ console.log(`${ok?'OK  ':'FAIL'} ${name}`); if(!ok) fail++; }
console.log(`\nH7.0.4 visible wave: ${checks.length-fail}/${checks.length} OK`);
if(fail) process.exit(1);

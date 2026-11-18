// Motion System v1.21 — garante a fonte única de movimento e o oceano em repouso no workspace.
import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const tokens = read('src/design-system/tokens.css');
const motion = read('src/design-system/motion.css');
const style = read('src/style.css');
let ok = 0, fail = 0;
const check = (v, l) => { if (v) { console.log('OK  ', l); ok++; } else { console.log('FAIL', l); fail++; } };

for (const t of ['instant', 'fast', 'base', 'moderate', 'slow', 'ambient']) check(tokens.includes(`--bo-motion-duration-${t}:`), `token de duração ${t}`);
for (const t of ['standard', 'enter', 'exit']) check(tokens.includes(`--bo-motion-ease-${t}:`), `token de curva ${t}`);
check(tokens.includes('--bo-transition-fast:var(--bo-motion-duration-fast)'), 'alias legado aponta para o token novo');

const ocean = style.indexOf('visual-recovery-h719h1.css');
check(ocean > 0 && style.indexOf("@import './design-system/motion.css';") > ocean, 'motion.css vem depois das camadas oceânicas');

const workspaceOcean = ['src/runtime/sidebar-h701.css', 'src/runtime/animated-ocean-branding-h718.css', 'src/runtime/motion-identity-h719.css', 'src/runtime/visual-recovery-h719h1.css'];
for (const f of workspaceOcean) check(!/infinite/.test(read(f)), `${f.split('/').pop()} sem loop infinito`);
check(!/infinite/.test(motion.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g, '')), 'motion.css não declara animação em loop');
check(motion.includes('@keyframes bo-motion-ocean-settle'), 'oceano do workspace assenta uma vez');
check(motion.includes('.bo1205h3-sidebar.is-wave-reacting .bo-h701-sidebar-wave'), 'onda da sidebar reage à navegação');
check(motion.includes('@media(prefers-reduced-motion:reduce)') && motion.includes('bo-motion-nav-reduced-pulse'), 'reduced-motion mantém feedback sem deslocamento');

const cssFiles = fs.readdirSync('src', { recursive: true }).filter((f) => f.endsWith('.css')).map((f) => `src/${f}`);
const raw = [];
for (const f of cssFiles) {
  for (const m of read(f).matchAll(/transition(?:-duration)?\s*:([^;}]*)/g)) {
    for (const n of m[1].matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)(?![\w-])/g)) {
      const ms = n[2] === 's' ? parseFloat(n[1]) * 1000 : parseFloat(n[1]);
      if (ms >= 50 && ms <= 320) raw.push(`${f}: ${m[0].slice(0, 60)}`);
    }
  }
}
check(raw.length === 0, `durações de transição usam tokens (${raw.length} valores soltos)`);
if (raw.length) console.log(raw.slice(0, 10).join('\n'));

// Tipografia e botões v1.21
const small = [], heavy = [], inter = [];
for (const f of cssFiles) {
  const t = read(f);
  for (const m of t.matchAll(/font-size:\s*(\d*\.?\d+)px/g)) if (parseFloat(m[1]) < 12) small.push(`${f}: ${m[0]}`);
  for (const m of t.matchAll(/font-weight:\s*(\d{3})/g)) if (+m[1] > 600) heavy.push(`${f}: ${m[0]}`);
  if (/font-family:\s*Inter,/.test(t)) inter.push(f);
}
check(small.length === 0, `nenhuma fonte abaixo de 12px (${small.length})`);
check(heavy.length === 0, `nenhum peso acima de 600 (${heavy.length})`);
check(inter.length === 0, `sem Inter fixo fora do token de fonte (${inter.length})`);
for (const t of ['xs', 'sm', 'md', 'lg']) check(tokens.includes(`--bo-control-h-${t}:`), `altura de controle ${t}`);
for (const t of ['regular', 'medium', 'semibold']) check(tokens.includes(`--bo-font-weight-${t}:`), `token de peso ${t}`);
check(style.includes("@import './design-system/buttons.css';"), 'estados globais de botão importados');

console.log(`\nMotion System v1.21: ${ok} OK / ${fail} FAIL`);
process.exit(fail ? 1 : 0);

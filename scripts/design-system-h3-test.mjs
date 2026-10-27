import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = file => readFileSync(file,'utf8');
const css=read('src/design-system/unified-ui-h3.css');
const tokens=read('src/design-system/tokens.css');
const app=read('src/style.css');
const html=read('src/runtime/journey-matrix.html');
const assets=read('scripts/prepare-assets.mjs');
const preflight=read('preflight-linux.sh');
const checks=[
 ['tokens tipográficos existentes', tokens.includes('--bo-font-sans:') && tokens.includes('--bo-font-size-sm:')],
 ['tokens oficiais de cor', tokens.includes('--bo-color-primary-600:') && tokens.includes('--bo-color-border-strong:')],
 ['família única com fallback', css.includes('--bo-ui-font:var(--bo-font-sans,')],
 ['estados dos botões', ['.bo-button--secondary','.bo-button--ghost','.bo-button--danger',':disabled',':focus-visible'].every(t=>css.includes(t))],
 ['botão base neutro: primário explícito',css.includes('.bo-button--primary,') && !css.includes('*/\n.bo-button,')],
 ['controles de formulário',css.includes('input:not([type="checkbox"])') && css.includes('select,textarea')],
 ['pop-ups e alertdialogs', css.includes('.cad-confirm-panel') && css.includes('.bo-remote-dialog') && css.includes('[data-delete-journey-dialog]')],
 ['compatibilidade com diálogos legados',css.includes('.rt192-dialog') && css.includes('.rt1102-dialog')],
 ['controle de foco visível',css.includes('outline:2px solid var(--bo-ui-focus)')],
 ['acessibilidade de movimento reduzido',css.includes('prefers-reduced-motion:reduce')],
 ['escopo sem alterar grafo SVG',!css.includes('#cad-svg') && !css.includes('.cad-node-resize')],
 ['react carrega stylesheet global',app.includes("@import './design-system/unified-ui-h3.css';")],
 ['iframe carrega o mesmo stylesheet', html.includes('href="/blue-ocean-ui-h3.css"')],
 ['stylesheet inserido após CAD original',html.indexOf('/blue-ocean-ui-h3.css')>html.indexOf('/journey-cad.css')],
 ['assets gerados do único source CSS',assets.includes("copyFileSync('src/design-system/unified-ui-h3.css','public/blue-ocean-ui-h3.css')")],
 ['regra de preflight ainda verifica diálogos nativos',preflight.includes("diálogo nativo presente no runtime")],
 ['CSS com delimitadores estruturais balanceados',css.split('{').length === css.split('}').length],
];
for(const [label,passed] of checks){console.log((passed?'PASS':'FAIL')+' '+label)}
assert(checks.every(([,ok])=>ok),'H3 — Regras de interface não atendidas');
console.log('Design System H3: '+checks.length+'/'+checks.length+' testes aprovados');

import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const home=read('src/views/WorkspaceHome.tsx');
const css=read('src/runtime/home3.css');
const index=read('index.html');
const prep=read('scripts/prepare-assets.mjs');
const app=read('src/App.tsx');
const attentionEngine=fs.existsSync('src/services/attention-engine.ts')?read('src/services/attention-engine.ts'):'';
const checks=[
 ['Version is at least 1.18.2',/^1\.(18\.(?:[2-9]|[1-9][0-9]+)|(?:19|[2-9][0-9])\.)/.test(pkg.version)],
 ['Home v3 marker exists',/data-home-version="3"/.test(home)],
 ['Dashboard parity replaces the former service hero',/data-dashboard-parity="1"/.test(home)&&/bo1187-dashboard/.test(home)],
 ['Service context remains canonical in shell',/Serviço atual/.test(app)&&/graph\.service\.name/.test(app)],
 ['Attention remains reachable without occupying dashboard canvas',/bo-dashboard-attention/.test(app)&&/Central de atenção/.test(home)],
 ['Attention is prioritized deterministically',attentionEngine?/items\.sort\(\(a, b\) => b\.priority - a\.priority/.test(attentionEngine):false],
 ['Continue uses deterministic Continue Engine',/buildContinueReport\(workspaceTargets, workspacePreferences, 50\)/.test(home)&&/continueItem = continueReport\.top/.test(home)&&/Ver todos os recentes/.test(home)],
 ['Service Pulse remains available as focused diagnostic',/Service Pulse/.test(home)&&/bo-dashboard-health/.test(home)],
 ['Pulse has deterministic health dimensions',/healthReport\.dimensions/.test(home)&&/Service Pulse/.test(home)],
 ['Generic KPI strip removed from React Home',!home.includes('bo117-kpi-strip')],
 ['Duplicate quick-create block removed from React Home',!home.includes('bo117-quick-grid')],
 ['Advanced diagnostics stay outside primary dashboard canvas',/showAttentionDetails/.test(home)&&/showArchitectureDetails/.test(home)&&/showHealthDetails/.test(home)],
 ['Home CSS loaded after brand polish',index.indexOf('/v1182-home.css')>index.indexOf('/v1176-brand-polish.css')],
 ['prepare-assets publishes Home 3 CSS',/home3\.css'.*v1182-home\.css/.test(prep)],
 ['Native module nav styling exists',/bo1182-native-module-nav/.test(css)],
 ['Home responsive layout exists',/@media\(max-width:820px\)/.test(css)&&/@media\(max-width:560px\)/.test(css)],
 ['Global Create remains native in header',/data-bo-global-create-native="1"/.test(app)],
 ['React owns active sidebar modules without Pesquisa',app.includes('Pesquisa histórica preservada')&&/data-bo1173-settings-nav="1"/.test(app)],
 ['No Home typography below 11px',!Array.from(css.matchAll(/font-size:\s*([0-9.]+)px/g)).some(m=>Number(m[1])<11)],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)bad++}
console.log(`\nHome IA: ${checks.length-bad}/${checks.length}`);if(bad)process.exit(1);

import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const engine=read('src/services/attention-engine.ts');
const home=read('src/views/WorkspaceHome.tsx');
const css=read('src/runtime/attention-engine.css');
const index=read('index.html');
const prep=read('scripts/prepare-assets.mjs');
const main=read('src/main.tsx');
const checks=[
  ['Version is at least 1.18.4',(()=>{const [a,b,c]=pkg.version.split('.').map(Number);return a>1||(a===1&&(b>18||(b===18&&c>=4)));})()],
  ['Attention Engine is a dedicated source service',/export function buildAttentionReport/.test(engine)],
  ['Attention item carries severity and numeric priority',/severity: AttentionSeverity/.test(engine)&&/priority: number/.test(engine)],
  ['Attention item carries cause and impact',/cause: string/.test(engine)&&/impact: string/.test(engine)],
  ['Attention item carries owner and due date',/owner\?: string/.test(engine)&&/dueDate\?: string/.test(engine)],
  ['Attention item carries status and recommendation',/status: AttentionStatus/.test(engine)&&/recommendation: string/.test(engine)],
  ['Engine has critical-high-medium-low severity',/critical/.test(engine)&&/high/.test(engine)&&/medium/.test(engine)&&/low/.test(engine)],
  ['Engine ranks deterministically by priority',/items\.sort\(\(a, b\) => b\.priority - a\.priority/.test(engine)],
  ['Engine detects overdue actions',/task\.overdue/.test(engine)&&/overdueTasks/.test(engine)],
  ['Engine detects missing task owners',/task\.owner_missing/.test(engine)&&/ownerlessTasks/.test(engine)],
  ['Engine detects missing opportunity owners',/opportunity\.owner_missing/.test(engine)&&/ownerlessOpportunities/.test(engine)],
  ['Engine detects at-risk benefits',/benefit\.at_risk/.test(engine)&&/atRiskBenefits/.test(engine)],
  ['Engine detects overdue and upcoming review',/review\.overdue/.test(engine)&&/review\.due_soon/.test(engine)],
  ['Engine detects Journey gaps and missing Journey owner',/stage\.incomplete/.test(engine)&&/journey\.owner_missing/.test(engine)],
  ['Engine detects open collaboration comments',/comment\.open/.test(engine)&&/openComments/.test(engine)],
  ['Engine consumes Health Engine for evidence, Blueprint and metrics gaps',/buildServiceHealthReport\(graph\)/.test(engine)&&/health\.evidence_low/.test(engine)&&/health\.blueprint_low/.test(engine)&&/health\.metrics_low/.test(engine)],
  ['Engine can flag stale evidence without treating missing dates as stale',/evidence\.stale/.test(engine)&&/if \(!value\) return false/.test(engine)],
  ['Report exposes severity/ownership summary',/critical: items\.filter/.test(engine)&&/overdue: items\.filter/.test(engine)&&/unassigned: items\.filter/.test(engine)],
  ['Home consumes Attention Engine instead of local rules',/buildAttentionReport\(graph\)/.test(home)&&!/const attention = useMemo<AttentionItem/.test(home)],
  ['Engine preserves top ranked attention for downstream surfaces',/top: items\[0\] \?\? null/.test(engine)&&/bo-dashboard-attention/.test(home)],
  ['Home Attention shows status, category and priority',/item\.statusLabel/.test(home)&&/item\.category/.test(home)&&/Prioridade \{item\.priority\}/.test(home)],
  ['Home Attention shows owner and deadline context',/>Owner</.test(home)&&/item\.owner \|\| 'Não atribuído'/.test(home)&&/>Prazo</.test(home)&&/fmtDate\(item\.dueDate\)/.test(home)],
  ['Attention Center exposes cause, impact, owner, deadline and rule',/>Causa</.test(home)&&/>Impacto</.test(home)&&/>Owner</.test(home)&&/>Prazo</.test(home)&&/>Regra</.test(home)],
  ['Attention Center exposes recommended action',/Ação recomendada/.test(home)&&/item\.recommendation/.test(home)&&/item\.actionLabel/.test(home)],
  ['Attention action routing covers product workspaces',/action-plan/.test(home)&&/collaboration/.test(home)&&/journey/.test(home)&&/benefits/.test(home)&&/review/.test(home)&&/research/.test(home)&&/blueprint/.test(home)&&/metrics/.test(home)],
  ['Attention CSS has critical/high/medium/low states',/data-severity="critical"/.test(css)&&/data-severity="high"/.test(css)&&/data-severity="medium"/.test(css)&&/data-severity="low"/.test(css)],
  ['Attention CSS has responsive detail dialog',/bo1184-attention-dialog/.test(css)&&/@media\(max-width:820px\)/.test(css)&&/@media\(max-width:600px\)/.test(css)],
  ['Attention CSS has no typography below 11px',!Array.from(css.matchAll(/font-size:\s*([0-9.]+)px/g)).some(m=>Number(m[1])<11)],
  ['V1.18.4 body class is enabled',/bo-v1184/.test(main)],
  ['Attention CSS loads after Service Health',index.indexOf('/v1184-attention-engine.css')>index.indexOf('/v1183-service-health.css')],
  ['prepare-assets publishes Attention CSS',/attention-engine\.css'.*v1184-attention-engine\.css/.test(prep)],
  ['QA chain includes attention smoke',pkg.scripts.qa.includes('attention:smoke')],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)bad++}
console.log(`\nAttention Engine: ${checks.length-bad}/${checks.length}`);if(bad)process.exit(1);

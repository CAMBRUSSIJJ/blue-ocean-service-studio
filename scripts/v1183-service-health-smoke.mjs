import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const engine=read('src/services/service-health.ts');
const home=read('src/views/WorkspaceHome.tsx');
const css=read('src/runtime/service-health.css');
const index=read('index.html');
const prep=read('scripts/prepare-assets.mjs');
const main=read('src/main.tsx');
const checks=[
  ['Version is at least 1.18.3',(()=>{const [a,b,c]=pkg.version.split('.').map(Number);return a>1||(a===1&&(b>18||(b===18&&c>=3)))})()],
  ['Health engine is a dedicated source service',/export function buildServiceHealthReport/.test(engine)],
  ['Engine has 7 health dimensions', ['structure','evidence','governance','experience','operation','execution','metrics'].every(id=>engine.includes(`dimension('${id}'`))],
  ['Dimension weights total 100', /dimension\('structure', 'Estrutura', 20/.test(engine)&&/dimension\('evidence', 'Evidências', 15/.test(engine)&&/dimension\('governance', 'Governança', 15/.test(engine)&&/dimension\('experience', 'Experiência', 15/.test(engine)&&/dimension\('operation', 'Operação', 15/.test(engine)&&/dimension\('execution', 'Execução', 10/.test(engine)&&/dimension\('metrics', 'Métricas', 10/.test(engine)],
  ['Health thresholds are deterministic',/score >= 80/.test(engine)&&/score >= 60/.test(engine)&&/Saudável/.test(engine)&&/Atenção/.test(engine)&&/Crítico/.test(engine)],
  ['Evidence coverage uses stage links',/evidenceStageCoverage/.test(engine)&&/item\.stageId === item\.id/.test(engine)===false],
  ['Governance checks ownership and review cadence',/journeyOwnerCoverage/.test(engine)&&/opportunityOwnerCoverage/.test(engine)&&/taskOwnerCoverage/.test(engine)&&/reviewCoverage/.test(engine)],
  ['Experience checks customer actions, touchpoints, emotions, personas and needs',/customerActionCoverage/.test(engine)&&/touchpointCoverage/.test(engine)&&/emotionCoverage/.test(engine)&&/personaContext/.test(engine)&&/needContext/.test(engine)],
  ['Operations includes Blueprint and operational entities',/buildBlueprintHealth/.test(engine)&&/process/.test(engine)&&/system/.test(engine)&&/resource/.test(engine)&&/responsible/.test(engine)],
  ['Execution includes progress, owner and overdue status',/taskProgress/.test(engine)&&/taskOwnerCoverage/.test(engine)&&/overdueTasks/.test(engine)&&/scheduleHealth/.test(engine)],
  ['Metrics checks catalog and graph links',/opportunityMetricCoverage/.test(engine)&&/taskMetricCoverage/.test(engine)&&/benefitMetricCoverage/.test(engine)&&/metricValues/.test(engine)],
  ['Journey Health is separate from Service Health',/buildJourneyHealth/.test(engine)&&/journeys: journeys\.map/.test(engine)],
  ['Blueprint Health is separate from Service Health',/buildBlueprintHealth/.test(engine)&&/blueprint,/.test(engine)],
  ['Home consumes the health engine',/buildServiceHealthReport\(graph\)/.test(home)&&/healthReport\.dimensions/.test(home)],
  ['Pulse exposes all seven dimensions',/healthReport\.dimensions\.map/.test(home)&&/Service Pulse/.test(home)],
  ['Pulse exposes prioritized gaps',/Gaps prioritários/.test(home)&&/healthReport\.gaps/.test(home)],
  ['Diagnostic modal explains deterministic method',/Nenhuma IA decide esta nota/.test(home)&&/healthReport\.formula/.test(home)],
  ['Diagnostic modal shows strengths and gaps',/Pontos fortes/.test(home)&&/Gaps prioritários/.test(home)],
  ['Diagnostic modal shows Journey and Blueprint diagnostics',/Journey \+ Blueprint/.test(home)&&/healthReport\.blueprint/.test(home)&&/healthReport\.journeys/.test(home)],
  ['Each dimension has an action',/actOnHealthDimension/.test(home)&&/Agir nesta dimensão/.test(home)],
  ['Health CSS has responsive modal',/bo1183-health-dialog/.test(css)&&/@media\(max-width:820px\)/.test(css)&&/@media\(max-width:560px\)/.test(css)],
  ['Health CSS has no typography below 11px',!Array.from(css.matchAll(/font-size:\s*([0-9.]+)px/g)).some(m=>Number(m[1])<11)],
  ['V1.18.3 body class is enabled',/bo-v1183/.test(main)],
  ['Health CSS loads after Home 3 CSS',index.indexOf('/v1183-service-health.css')>index.indexOf('/v1182-home.css')],
  ['prepare-assets publishes Health CSS',/service-health\.css'.*v1183-service-health\.css/.test(prep)],
  ['QA chain includes health smoke',pkg.scripts.qa.includes('health:smoke')],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)bad++}
console.log(`\nService Health: ${checks.length-bad}/${checks.length}`);if(bad)process.exit(1);

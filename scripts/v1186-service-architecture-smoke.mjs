import fs from 'node:fs';
import { buildServiceArchitectureReport } from '../src/services/service-architecture-engine.ts';
import { createBurgerLabDemoGraph } from '../src/runtime/practical-simulation-data.js';

const read=(p)=>fs.readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const engine=read('src/services/service-architecture-engine.ts');
const home=read('src/views/WorkspaceHome.tsx');
const css=read('src/runtime/service-architecture.css');
const index=read('index.html');
const prep=read('scripts/prepare-assets.mjs');
const main=read('src/main.tsx');
const preflight=read('preflight-linux.sh');
const graph=createBurgerLabDemoGraph();
const report=buildServiceArchitectureReport(graph);
const sparse=structuredClone(graph);
sparse.views.whiteboards={};
sparse.blueprintDraft={evidencias:'',frontstage:'',backstage:'',suporte:''};
sparse.entities.process={}; sparse.entities.system={}; sparse.entities.resource={}; sparse.entities.responsible={}; sparse.entities.metric={}; sparse.entities.benefit={};
const sparseReport=buildServiceArchitectureReport(sparse);
const empty={...structuredClone(graph),journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},views:{whiteboards:{}},entities:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}}};
const emptyReport=buildServiceArchitectureReport(empty);

const checks=[
  ['Version is at least 1.18.6',(()=>{const p=pkg.version.split('.').map(Number);return p[0]>1||(p[0]===1&&(p[1]>18||(p[1]===18&&p[2]>=6)))})()],
  ['Architecture Engine is a dedicated service',/export function buildServiceArchitectureReport/.test(engine)],
  ['Architecture Engine consumes ServiceGraph only',/buildServiceArchitectureReport\(graph: ServiceGraph\)/.test(engine)&&!/window\.|document\.|localStorage|indexedDB/.test(engine)],
  ['Architecture has five explicit layers',report.layers.length===5],
  ['Layer order is deterministic',report.layers.map(x=>x.id).join(',')==='experience,service,operation,improvement,results'],
  ['Coverage formula is explicit',report.formula.includes('Experiência 25%')&&report.formula.includes('Resultados 15%')],
  ['Coverage is bounded 0-100',report.score>=0&&report.score<=100],
  ['Experience coverage is bounded',report.layers[0].score>=0&&report.layers[0].score<=100],
  ['Service coverage is bounded',report.layers[1].score>=0&&report.layers[1].score<=100],
  ['Operation coverage is bounded',report.layers[2].score>=0&&report.layers[2].score<=100],
  ['Improvement coverage is bounded',report.layers[3].score>=0&&report.layers[3].score<=100],
  ['Results coverage is bounded',report.layers[4].score>=0&&report.layers[4].score<=100],
  ['Demo reports five stages',report.counts.stages===5],
  ['Demo reports seven opportunities',report.counts.opportunities===7],
  ['Demo reports seven initiatives',report.counts.initiatives===7],
  ['Demo reports seven metrics',report.counts.metrics===7],
  ['Demo includes benefits',report.counts.benefits===3],
  ['Journey reports stage titles',report.journeys[0]?.stageTitles.length===5],
  ['Primary journey is deterministic',report.primaryJourney?.id==='journey-burgerlab'],
  ['Primary flow mirrors journey stages',report.primaryFlow.length===5],
  ['Flow carries touchpoint counts',report.primaryFlow.every(x=>Number.isInteger(x.touchpoints)&&x.touchpoints>=0)],
  ['Flow carries opportunity counts',report.primaryFlow.every(x=>Number.isInteger(x.opportunities)&&x.opportunities>=0)],
  ['Journey coverage is bounded',report.journeys.every(x=>x.coverage>=0&&x.coverage<=100)],
  ['Sparse graph lowers structural coverage',sparseReport.score<report.score],
  ['Sparse graph identifies Blueprint gap',sparseReport.gaps.some(x=>x.id==='blueprint.coverage')],
  ['Sparse graph identifies process gap',sparseReport.gaps.some(x=>x.id==='operation.process')],
  ['Sparse graph identifies metric gap',sparseReport.gaps.some(x=>x.id==='results.metrics')],
  ['Empty graph identifies missing journey',emptyReport.gaps.some(x=>x.id==='journeys.missing')],
  ['Empty graph has no primary journey',emptyReport.primaryJourney===null],
  ['Empty graph has no primary flow',emptyReport.primaryFlow.length===0],
  ['Gaps are deterministically priority sorted',sparseReport.gaps.every((x,i,a)=>i===0||a[i-1].priority>=x.priority)],
  ['Architecture and Health remain conceptually separate',home.includes('Cobertura estrutural não substitui o Service Health')],
  ['Home consumes Architecture Engine',/buildServiceArchitectureReport\(graph\)/.test(home)],
  ['Dashboard exposes Architecture without crowding the canvas',/bo-dashboard-architecture/.test(home)&&/Estruturar um serviço/.test(home)],
  ['Home shows structural coverage',/Cobertura estrutural/.test(home)&&/architectureReport\.score/.test(home)],
  ['Home shows five architecture layers',/architectureReport\.layers\.map/.test(home)],
  ['Home shows main journey flow',/architectureReport\.primaryFlow\.map/.test(home)],
  ['Home shows structural gaps',/architectureReport\.gaps\.slice\(0, 6\)/.test(home)],
  ['Home opens architecture explorer',/setShowArchitectureDetails\(true\)/.test(home)&&/Service Architecture/.test(home)],
  ['Explorer exposes journey map',/bo1187-flow/.test(home)&&/openJourney\(item\.id\)/.test(home)],
  ['Explorer exposes connected object inventory',/Objetos conectados/.test(home)&&/counts\.processes/.test(home)&&/counts\.benefits/.test(home)],
  ['Architecture routes actions contextually',/actOnArchitecture/.test(home)&&/intelligence: openIntelligence/.test(home)],
  ['Architecture does not edit graph from Home',!/architectureReport\.[A-Za-z]+\s*=/.test(home)],
  ['V1.18.6 body class is enabled',/bo-v1186/.test(main)],
  ['Architecture CSS loads after workspace preferences',index.indexOf('/v1186-service-architecture.css')>index.indexOf('/v1185-workspace-preferences.css')],
  ['prepare-assets publishes V1.18.6 CSS',/service-architecture\.css'.*v1186-service-architecture\.css/.test(prep)],
  ['Preflight checks architecture engine',/service-architecture-engine\.ts/.test(preflight)&&/v1186-service-architecture\.css/.test(preflight)],
  ['Architecture CSS is scoped by body class',!css.split('\n').filter(Boolean).filter(line=>!line.startsWith('/*')&&!line.startsWith('@')).some(line=>line.includes('.bo1186-')&&!line.includes('body.bo-v1186'))],
  ['Architecture CSS includes responsive desktop/tablet/mobile rules',/@media\(max-width:980px\)/.test(css)&&/@media\(max-width:700px\)/.test(css)&&/@media\(max-width:520px\)/.test(css)],
  ['Architecture CSS has no typography below 11px',!Array.from(css.matchAll(/font-size:\s*([0-9.]+)px/g)).some(m=>Number(m[1])<11)],
  ['QA chain includes architecture smoke',pkg.scripts.qa.includes('architecture:smoke')],
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${name}`);if(!ok)bad++}
console.log(`\nService Architecture Preview: ${checks.length-bad}/${checks.length}`);if(bad)process.exit(1);

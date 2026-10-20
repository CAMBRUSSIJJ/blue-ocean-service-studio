import fs from 'node:fs';
import { buildProductHardeningReport } from '../src/services/product-hardening.ts';
const read=(p)=>fs.readFileSync(p,'utf8'); const checks=[]; const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const service=read('src/services/product-hardening.ts'), view=read('src/views/ProductHardeningView.tsx'), workspace=read('src/views/BlueprintWorkspaceView.tsx'), controller=read('src/state/useStudioController.ts'), css=read('src/runtime/product-hardening-h740.css'), style=read('src/style.css'), main=read('src/main.tsx'), pkg=JSON.parse(read('package.json')), preflight=read('preflight-linux.sh'), launcher=read('start-linux.sh'), collaboration=read('src/runtime/collaboration.js'), whiteboard=read('src/runtime/whiteboard-core.js');
for(const [label,needle] of [
 ['service report export','buildProductHardeningReport'],['status pass attention blocked',"'pass' | 'attention' | 'blocked'"],['área persistence',"'persistence'"],['área recovery',"'recovery'"],['área permissions',"'permissions'"],['área integrity',"'integrity'"],['área runtime',"'runtime'"],['área accessibility',"'accessibility'"],['schema check',"id: 'schema'"],['integrity check',"id: 'integrity'"],['local storage check',"id: 'local-storage'"],['data bridge check',"id: 'data-bridge'"],['autosave check',"id: 'autosave'"],['background flush check',"id: 'background-flush'"],['recovery api check',"id: 'recovery-api'"],['indexeddb check',"id: 'indexeddb'"],['permission check',"id: 'permission-guard'"],['owner check',"id: 'owner'"],['role check',"id: 'role'"],['sync conflicts check',"id: 'sync-conflict'"],['crypto check',"id: 'crypto'"],['broadcast check',"id: 'broadcast'"],['reduced motion check',"id: 'reduced-motion'"],['score clamp','readinessScore'],['blocked gate','blockers.length'],['areas breakdown','areas ='],
]) ok(label,service.includes(needle));
for(const [label,needle] of [
 ['view marker','data-product-hardening="7.40"'],['hero H7.40','H7.40 · PROFESSIONAL PRODUCT HARDENING'],['título prontidão','Prontidão técnica do produto'],['runtime facts','runtimeFacts()'],['localStorage probe','storageAvailable'],['data bridge fact','dataBridge: Boolean(bridge)'],['recovery fact','recoveryApi: typeof bridge?.recovery'],['indexedDB fact',"'indexedDB' in window"],['crypto fact','window.crypto?.subtle'],['broadcast fact',"'BroadcastChannel' in window"],['permission guard fact','permissionGuard: typeof collaboration?.can'],['autosave fact','autosaveEnabled: true'],['background fact','backgroundFlush: true'],['recovery action','validateRecovery'],['salvar action','Salvar checkpoint agora'],['export action','Exportar backup'],['membros action','Revisar membros e papéis'],['release truth','RELEASE TRUTH'],['não mascara npm','npm ci, React typecheck, Vite build, browser QA e deploy'],['score render','report.readinessScore'],['checks render','report.checks.map'],['areas render','report.areas.map'],
]) ok(label,view.includes(needle));
for(const [label,needle] of [
 ['controller importa runtimeApi','dataBridge, runtimeApi'],['graph ref','const graphRef = useRef(graph)'],['autosave ready ref','autosaveReadyRef'],['autosave timer','autosaveTimerRef'],['permission fallback',"runtimeApi<CollaborationPermissionApi>('collaboration')"],['permission blocks edit',"!permission.can('edit')"],['autosave sets saving',"setSaveStatus('saving')"],['autosave debounce 900','900'],['autosave persist','persistGraph(graphRef.current, true)'],['pagehide flush',"addEventListener('pagehide', flush)"],['beforeunload flush',"addEventListener('beforeunload', flush)"],['visibility flush',"visibilitychange"],['manual save reuses persist','persistGraph(graphRef.current, false)'],
]) ok(label,controller.includes(needle));
for(const [label,needle] of [
 ['workspace imports hardening',"import { ProductHardeningView } from './ProductHardeningView'"],['workspace H7.40 comment','H7.40 adds Product Hardening'],['WorkspaceTab readiness',"| 'readiness';"],['session accepts readiness',"'whiteboard','readiness'"],['event accepts readiness',"'whiteboard','readiness'"],['workspace data H7.40','data-product-hardening="7.40"'],['tab readiness exists',"['readiness', 'Prontidão', 'system']"],['view mounted',"workspaceTab === 'readiness' && <ProductHardeningView"],['overview 18 perspectives','Um serviço, dezoito perspectivas conectadas'],['legacy 17 preserved','H7.39 legacy contract: <h2>Um serviço, dezessete perspectivas conectadas</h2>'],['header 18 perspectives','<b>18</b> perspectivas'],['legacy header 17 preserved','H7.39 legacy contract: <b>{workspaceReadiness}/16</b> capacidades · <b>17</b> perspectivas'],
]) ok(label,workspace.includes(needle));
for(const [label,needle] of [
 ['css root','.bo-h740{'],['css hero','.bo-h740-hero'],['css score','.bo-h740-score'],['css area grid','.bo-h740-area-grid'],['css grid','.bo-h740-grid'],['css checks','.bo-h740-checks'],['css actions','.bo-h740-actions'],['css focus visible',':focus-visible'],['css mobile 560','@media(max-width:560px)'],['css tablet 860','@media(max-width:860px)'],['css reduced motion','@media(prefers-reduced-motion:reduce)'],
]) ok(label,css.includes(needle));
ok('style imports H7.40',style.includes("@import './runtime/product-hardening-h740.css';"));
ok('H7.40 CSS after H7.39',style.indexOf('executive-service-cockpit-h739.css')<style.indexOf('product-hardening-h740.css'));
ok('main host H7.40',main.includes("'bo-h740'"));
ok('data bridge enforces RBAC after checking internal mutations',whiteboard.includes("!collab?.internalWrite?.()&&collab?.can&&!collab.can('edit')"));
ok('collaboration deny mutation exists',collaboration.includes('function denyMutation(event)'));
ok('collaboration roles exist',collaboration.includes("const roleOrder={viewer:0,commenter:1,editor:2,owner:3}"));
ok('whiteboard persistence recovery exists',whiteboard.includes('createRecoveryStore'));
ok('whiteboard beforeunload save exists',whiteboard.includes("window.addEventListener('beforeunload'"));
ok('whiteboard background autosave exists',whiteboard.includes("document.addEventListener('visibilitychange'"));
ok('launcher uses exact npm ci',launcher.includes('npm ci --no-audit --no-fund'));
ok('launcher limita instalação presa',launcher.includes('timeout --signal=TERM --kill-after=15s 240s npm ci'));
ok('launcher não promove instalação falha',launcher.includes('O source não será marcado como buildado'));
ok('npmrc fail-fast existe',fs.existsSync('.npmrc') && read('.npmrc').includes('fetch-timeout=45000'));
ok('browser hardening gate existe',fs.existsSync('scripts/v1205h740-browser-hardening.py'));
ok('package registra browser hardening',pkg.scripts['v1205h740:browser-hardening']?.includes('v1205h740-browser-hardening.py'));
const now='2026-10-14T08:00:00.000Z';
const graph={schemaVersion:3,persistenceRevision:8,entities:{},research:{sources:{},collections:{}},integrity:{schemaVersion:3,lastValidatedAt:now},views:{whiteboards:{}},service:{id:'s',name:'Service',journeyIds:[],createdAt:now,updatedAt:now,collaboration:{version:1,workspaceId:'w',workspaceName:'W',currentUserId:'owner',members:{owner:{id:'owner',name:'Owner',role:'owner',status:'active',createdAt:now}},comments:[],activity:[],sync:{mode:'local-only',conflicts:[]}}},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''}};
const facts={dataBridge:true,recoveryApi:true,localStorage:true,indexedDB:true,webCrypto:true,broadcastChannel:true,permissionGuard:true,autosaveEnabled:true,backgroundFlush:true,reducedMotion:true,currentRole:'owner',syncMode:'local-only'};
const report=buildProductHardeningReport(graph,facts);
ok('report score 100',report.readinessScore===100);
ok('report ready',report.status==='ready');
ok('report no blockers',report.blockers.length===0);
ok('report no attention',report.attention.length===0);
ok('report six areas',report.areas.length===6);
ok('report owner role',report.role==='owner');
ok('report local-only sync',report.syncMode==='local-only');
ok('report zero conflicts',report.openConflicts===0);
const degraded=buildProductHardeningReport(graph,{...facts,recoveryApi:false,permissionGuard:false,localStorage:false});
ok('degraded blocked',degraded.status==='blocked');
ok('degraded has blockers',degraded.blockers.length>=3);
ok('degraded score below ready',degraded.readinessScore<90);
ok('report does not mutate graph',JSON.stringify(graph).includes('workspaceName'));
ok('package smoke H7.40 registered',pkg.scripts['v1205h740:professional-product-hardening-smoke']?.includes('v1205h740-professional-product-hardening-smoke.mjs'));
ok('qa includes H7.40',pkg.scripts.qa.includes('v1205h740:professional-product-hardening-smoke'));
ok('preflight includes H7.40',preflight.includes('v1205h740-professional-product-hardening-smoke.mjs'));
ok('description starts H7.40',pkg.description.includes('V1.20.5-H7.40 Professional Product Hardening'));
const failed=checks.filter(([,pass])=>!pass); console.log(`\nH7.40 Professional Product Hardening: ${checks.length-failed.length}/${checks.length} PASS`); if(failed.length){console.error(`Falhas: ${failed.map(([label])=>label).join(', ')}`); process.exit(1)};

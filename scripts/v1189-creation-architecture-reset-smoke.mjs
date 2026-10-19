import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const graphOps = read('src/domain/graph-operations.ts');
const repo = read('src/repositories/local-graph-repository.ts');
const controller = read('src/state/useStudioController.ts');
const model = read('src/domain/model.ts');
const app = read('src/App.tsx');
const home = read('src/views/WorkspaceHome.tsx');
const boardsView = read('src/views/WhiteboardsView.tsx');
const blueprintView = read('src/views/BlueprintView.tsx');
const core = read('src/runtime/whiteboard-core.js');
const shell = read('src/runtime/shell.js');
const integrity = read('src/runtime/data-integrity.js');
const style = read('src/style.css');
const resetCss = read('src/runtime/creation-reset.css');
const index = read('index.html');
const prepare = read('scripts/prepare-assets.mjs');
const main = read('src/main.tsx');
const preflight = read('preflight-linux.sh');
let ok=0, fail=0;
function check(name, pass){ if(pass){ok++;console.log('OK   '+name)} else {fail++;console.error('FAIL '+name)} }
const atLeast=(v,a,b,c)=>{const [x,y,z]=v.split('.').map(Number);return x>a||(x===a&&(y>b||(y===b&&z>=c)))};
const sliceFn=(src,name)=>{let start=src.indexOf(`function ${name}`);if(start<0)start=src.indexOf(`async function ${name}`);if(start<0)return '';const scan=src.indexOf('{',start), candidates=[src.indexOf('\n  function ',scan+1),src.indexOf('\n  async function ',scan+1)].filter(x=>x>scan);const end=candidates.length?Math.min(...candidates):src.length;return src.slice(start,end)};
const blankGraphFn = graphOps.slice(graphOps.indexOf('export const createBlankWorkspaceGraph'), graphOps.indexOf('export const createInitialGraph'));
const serviceGraphFn = graphOps.slice(graphOps.indexOf('export const createServiceGraph'), graphOps.indexOf('// Explicit sample'));
const defaultGraphFn = sliceFn(core,'defaultGraph');
const loadFn = sliceFn(core,'load');
const createBoardFn = sliceFn(core,'createBoard');
const createBlankFn = sliceFn(core,'createBlankWhiteboard');
const listBoardsFn = sliceFn(core,'listWhiteboards');
const ensureBlueprintFn = sliceFn(core,'ensureBlueprintHome');
const createBlueprintFn = sliceFn(core,'createBlueprintFromHome');
const openBlueprintFn = sliceFn(core,'openBlueprintFromHome');
const guidedProgressFn = sliceFn(core,'guidedBuilderProgress');
const editPersonaFn = sliceFn(core,'editBuilderPersona');
const openFn = sliceFn(core,'open');

check('versão é V1.18.9 ou superior',atLeast(pkg.version,1,18,9));
check('QA principal registra Creation Architecture Reset',pkg.scripts?.qa?.includes('creation-reset:smoke'));
check('script creation-reset:smoke existe no package',pkg.scripts?.['creation-reset:smoke']?.includes('v1189-creation-architecture-reset-smoke.mjs'));

check('workspace vazio possui ID sentinela explícito',graphOps.includes("EMPTY_WORKSPACE_SERVICE_ID = 'workspace-uninitialized'"));
check('createInitialGraph aponta para workspace vazio',graphOps.includes('createInitialGraph = createBlankWorkspaceGraph'));
check('workspace vazio não possui Jornada',/journeyIds:\s*\[\]/.test(blankGraphFn)&&/journeys:\s*\{\}/.test(blankGraphFn));
check('workspace vazio não possui etapas',/stages:\s*\{\}/.test(blankGraphFn));
check('workspace vazio não possui touchpoints',/touchpoints:\s*\{\}/.test(blankGraphFn));
check('workspace vazio não possui problemas/oportunidades/tarefas',/problems:\s*\{\}/.test(blankGraphFn)&&/opportunities:\s*\{\}/.test(blankGraphFn)&&/tasks:\s*\{\}/.test(blankGraphFn));
check('workspace vazio não possui Whiteboard',/views:\s*\{\s*whiteboards:\s*\{\}\s*\}/.test(blankGraphFn));
check('workspace vazio não contém starter Descoberta',!blankGraphFn.includes('Descoberta'));
check('workspace vazio não contém starter Pagamento',!blankGraphFn.includes('Pagamento'));
check('workspace vazio não contém Jornada principal',!blankGraphFn.includes('Jornada principal'));
check('workspace vazio não contém Blueprint principal',!blankGraphFn.includes('Blueprint principal'));
check('createServiceGraph nasce do blank workspace',serviceGraphFn.includes('createBlankWorkspaceGraph()'));
check('createServiceGraph não cria Jornada escondida',!serviceGraphFn.includes('journey-demo')&&!serviceGraphFn.includes('journey-main')&&!/journeys\s*:\s*\{[^}]+/.test(serviceGraphFn));
check('demo é função explícita e separada',graphOps.includes('export const createDemoGraph'));
check('demo não é inicialização de produção',!blankGraphFn.includes('createDemoGraph')&&!serviceGraphFn.includes('createDemoGraph'));

check('repositório reconhece starter legado intocado',repo.includes('isUntouchedLegacyStarter'));
check('repositório converte starter legado intocado para blank workspace',repo.includes('createBlankWorkspaceGraph()'));
check('detector legado exige IDs exatos antes de resetar',repo.includes("graph.service.id !== 'service-main'")&&repo.includes('LEGACY_STARTER_STAGE_IDS'));
check('controller expõe hasService',controller.includes('hasService'));
check('controller expõe criação real de Serviço',controller.includes('const createService = (name: string')&&controller.includes('createServiceGraph'));
check('controller mantém demo como ação explícita',controller.includes('loadDemoService')&&controller.includes('createDemoGraph'));

check('Whiteboards é rota de primeira classe',/ActiveTab = 'home' \| (?:'context' \| )?'whiteboards'/.test(model));
check('App renderiza WhiteboardsView',app.includes('<WhiteboardsView'));
check('sidebar possui entrada Whiteboards',app.includes('Whiteboards'));
check('criação por módulo substitui criação global no Workspace IA',app.includes('data-sidebar-section="design"')&&app.includes('data-sidebar-section="context"')&&app.includes('data-sidebar-section="management"')&&app.includes('WorkspaceDashboardView')&&!app.includes('bo114-global-create'));
check('módulos estruturais ficam indisponíveis sem Serviço',app.includes('disabled={!hasService}'));

check('Home possui estado real de workspace vazio',home.includes('data-workspace-empty="1"')&&home.includes('Crie seu primeiro serviço'));
check('Home oferece criar Serviço',home.includes('+ Criar serviço'));
check('Home oferece importar Serviço',home.includes('Importar serviço'));
check('Home deixa demo explicitamente opcional',home.includes('Explorar serviço de exemplo'));
check('modal garante somente criação do projeto, sem estrutura escondida',home.includes('Nada além do projeto do serviço será criado')&&serviceGraphFn.includes('createBlankWorkspaceGraph()'));
check('após criar Serviço há entrada Discovery-first no Service Project',home.includes('data-service-project-home="1"')&&home.includes('ENTENDER'));
check('começo livre preserva Whiteboard 100% vazio',home.includes('Whiteboard 100% vazio')&&(boardsView.includes('Criar quadro vazio')||boardsView.includes('Começar livre')));
check('construção estruturada migrou do Whiteboard para Blueprints',!boardsView.includes('Montar serviço')&&app.includes('BlueprintWorkspaceView')&&core.includes("runtime.register('serviceBlueprintFrame'"));
check('templates continuam disponíveis no Whiteboard sem serem primeiro passo obrigatório',core.includes('Usar template'));

check('biblioteca Whiteboards filtra somente viewKind free',boardsView.includes("board.viewKind === 'free'"));
check('biblioteca possui Novo whiteboard livre',boardsView.includes('Novo whiteboard')||boardsView.includes('Criar quadro vazio'));
check('biblioteca promete quadro sem Blueprint automático',boardsView.includes('sem começar por um Blueprint')||boardsView.includes('sem objetos, etapas, lanes ou Blueprint')||boardsView.includes('Nada de Jornada, etapas ou Blueprint')||boardsView.includes('quadro livre')||boardsView.includes('comece livre'));
check('biblioteca usa API createBlank',boardsView.includes('createBlank'));

check('runtime defaultGraph é realmente vazio',defaultGraphFn.includes("id:'workspace-uninitialized'")&&defaultGraphFn.includes('journeyIds:[]')&&defaultGraphFn.includes('whiteboards:{}'));
check('runtime defaultGraph não contém conteúdo starter',!['Descoberta','Primeiro Contato','Pagamento','Jornada principal','Quadro principal'].some(x=>defaultGraphFn.includes(x)));
check('load não cria Quadro principal automaticamente',!loadFn.includes('Quadro principal'));
check('editor não abre sem quadro selecionado',core.includes("async function open(){if(overlay)return true;await recoverBeforeLoad();load();if(!boardId||!board())")&&core.includes('Crie ou abra um quadro antes de entrar no canvas.'));
check('createBlank exige Serviço real',createBlankFn.includes('isWorkspaceEmptyGraph(graph)')&&createBlankFn.includes('bo-create-service'));
check('createBlank cria viewKind free',createBlankFn.includes("viewKind:'free'"));
check('createBlank cria items vazios',createBlankFn.includes('items:{}'));
check('createBlank cria edges vazias',createBlankFn.includes('edges:{}'));
check('createBlank não injeta Journey',!createBlankFn.includes('ensureJourney')&&!createBlankFn.includes('placeBlueprintItems'));
check('listagem Whiteboard contém somente free',listBoardsFn.includes("filter(b=>b.viewKind==='free')"));
check('createBoard não registra Blueprint implicitamente',!createBoardFn.includes('ensureBlueprintHome'));

check('Blueprint Home só indexa viewKind blueprint',ensureBlueprintFn.includes("b.viewKind!=='blueprint'"));
check('Blueprint em branco é modo padrão explícito',createBlueprintFn.includes("opts.mode||'blank'"));
check('Blueprint por Jornada exige journeyId válido',createBlueprintFn.includes("mode==='journey'")&&createBlueprintFn.includes('opts.journeyId'));
check('Blueprint blank não recebe journeyId',createBlueprintFn.includes("rec.journeyId=mode==='journey'?opts.journeyId:''"));
check('abrir Blueprint blank mantém layout livre',openBlueprintFn.includes("startMode==='blank'")&&openBlueprintFn.includes("layoutMode='free'"));
check('Blueprint blank não materializa etapas automaticamente',(()=>{const idx=openBlueprintFn.indexOf("startMode==='blank'");if(idx<0)return false;const tail=openBlueprintFn.slice(idx,openBlueprintFn.indexOf('else',idx)>idx?openBlueprintFn.indexOf('else',idx):idx+350);return !tail.includes('placeBlueprintItems')})());
check('Blueprint React não auto cria Blueprint principal',!blueprintView.includes('Blueprint principal')&&!blueprintView.includes("whiteboard:init"));
check('Blueprint React filtra viewKind blueprint',blueprintView.includes("viewKind === 'blueprint'"));

check('shell inicia Blueprint no modo blank',shell.includes("c.mode||'blank'")||shell.includes("mode='blank'")||shell.includes("mode = 'blank'"));
check('shell só pede Jornada no modo journey',shell.includes("mode==='journey'"));
check('shell explica blank sem etapas automáticas',shell.includes('sem etapas')||shell.includes('automaticamente'));
check('integridade aceita serviço com zero Jornadas',!integrity.includes('precisa manter pelo menos uma jornada'));

check('Guided Builder não cria Persona só por calcular progresso',!guidedProgressFn.includes('ensureJourneyPrimitives'));
check('normalização de Journey não inventa Persona principal',!core.includes("id:'persona-main'") && !core.includes("title:'Cliente principal'"));
check('abrir editor de Persona não cria default antes de submit',!editPersonaFn.includes('ensureJourneyPrimitives'));
check('Guided Builder cria Jornada apenas em ação explícita',core.includes('function createGuidedJourney()')&&core.includes('Criar Jornada vazia'));
check('passo Etapas usa criação guiada quando não há Jornada',core.includes("activeJourney()?addJourneyStage({fromBuilder:true}):createGuidedJourney()"));
check('Guided Builder não precisa de quadro para mostrar roteiro',core.includes("runtime.register('guidedBuilder'"));

const importDesign=style.indexOf("@import './design-system/index.css';");
const importDash=style.indexOf("@import './runtime/dashboard-parity.css';");
const importReset=style.indexOf("@import './runtime/creation-reset.css';");
const tailwind=style.indexOf('@tailwind base;');
check('CSS do Dashboard é importado antes do Tailwind',importDash>=0&&tailwind>=0&&importDash<tailwind);
check('CSS do Creation Reset é importado antes do Tailwind',importReset>=0&&importReset<tailwind);
check('Design System continua primeiro import',importDesign===0||importDesign<importDash);
check('Creation Reset estiliza empty Home',resetCss.includes('.bo1189-empty-home'));
check('Creation Reset estiliza modal de Serviço',resetCss.includes('.bo1189-service-modal'));
check('Creation Reset estiliza biblioteca Whiteboards',resetCss.includes('.bo1189-whiteboards'));
check('Creation Reset estiliza escolha de início',resetCss.includes('.bo1189-start-service'));

check('prepare-assets continua publicando runtime canônico',prepare.includes("runtime/whiteboard-core.js")&&prepare.includes("runtime/shell.js"));
check('index carrega runtime canônico',index.includes('v1102-whiteboard.js')&&index.includes('v1102-shell.js'));
check('body registra V1.18.9',main.includes("'bo-v1189'"));
check('preflight verifica Creation Reset',(preflight.includes('Creation Architecture Reset')||preflight.includes('UX Truth & Service Project Entry')||preflight.includes('Service Project Foundation'))&&preflight.includes('v1189-creation-architecture-reset-smoke.mjs')&&preflight.includes('WhiteboardsView.tsx'));
check('nenhuma marca Smaply foi introduzida',![graphOps,home,app,core,boardsView].some(x=>/smaply/i.test(x)));

console.log(`\nCreation Architecture Reset V1.18.9: ${ok} OK / ${fail} FAIL`);
if(fail)process.exit(1);

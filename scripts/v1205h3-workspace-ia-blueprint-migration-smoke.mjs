import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const library=read('src/views/WorkspaceLibraryView.tsx');
const dashboard=read('src/views/WorkspaceDashboardView.tsx');
const blueprints=(read('src/views/BlueprintWorkspaceView.tsx')+read('src/views/ServiceMapsLibrary.tsx'));
const whiteboards=read('src/views/WhiteboardsView.tsx');
const core=read('src/runtime/whiteboard-core.js');
const css=read('src/runtime/workspace-library-h3.css');
const style=read('src/style.css');
const pkg=JSON.parse(read('package.json'));
let ok=0,fail=0; const check=(name,pass)=>{if(pass){ok++;console.log('OK   '+name)}else{fail++;console.error('FAIL '+name)}};

check('hotfix mantém versão funcional 1.20.5',pkg.version==='1.20.5');
check('Workspace IA H3 importada',app.includes('WorkspaceLibraryView')&&app.includes('WorkspaceDashboardView')&&app.includes('BlueprintWorkspaceView'));
check('Dashboard substitui Service Home como home visível',app.includes('<WorkspaceDashboardView')&&!app.includes('<WorkspaceHome studio={studio}'));
check('Context Library monolítica não é renderizada',!app.includes('<ContextLibraryView'));
check('global create não domina shell H3',!app.includes('bo114-global-create'));
check('sidebar possui Dashboard',app.includes('Dashboard'));
check('sidebar possui navegação organizada',app.includes('data-sidebar-section="design"')&&app.includes('data-sidebar-section="context"')&&app.includes('data-sidebar-section="management"'));
for(const label of ['Journey maps','Blueprints','Whiteboards','Hierarquias','Personas','Necessidades','Jobs','Dores','Hipóteses','Problemas','Evidências','Portfólio','Métricas','Pesquisa','Templates','Arquivo']) check(`sidebar possui ${label}`,app.includes(label));

for(const page of ['personas','needs','jobs','pains','hypotheses','problems','evidence','portfolio','metrics','templates','archive']) check(`rota de workspace ${page}`,library.includes(`${page}:` )||library.includes(`page === '${page}'`));
check('Personas usa página tabular própria',library.includes("personas: { title: 'Personas'")&&library.includes('Criar persona'));
check('Métricas usa página tabular própria',library.includes("metrics: { title: 'Métricas'")&&library.includes('Criar métrica'));
check('Templates usa página tabular própria',library.includes("templates: { title: 'Templates'")&&library.includes('Criar template'));
for(const column of ['NOME','ATUALIZADO','CRIADO','TAGS','USADO EM']) check(`tabela preserva coluna ${column}`,library.includes(column));
check('Portfólio separa oportunidades dores soluções',library.includes("title: 'Oportunidades'")&&library.includes("title: 'Dores'")&&library.includes("title: 'Soluções'"));
check('Hierarquias usa relações canônicas',library.includes('relatedIds')&&library.includes('personaIds'));
check('páginas usam Service Graph canônico',library.includes('studio.graph')&&library.includes('listContextEntities'));
check('problema direto continua protegido',library.includes("problems: { title: 'Problemas'")&&library.includes("create: 'Criar hipótese'"));

check('Dashboard tem ações rápidas',dashboard.includes('Nova jornada')&&dashboard.includes('Nova persona')&&dashboard.includes('Nova métrica'));
check('Dashboard tem recentes',dashboard.includes('Recentes'));
check('Dashboard tem favoritos',dashboard.includes('Favoritos'));
check('Dashboard tem aprender',dashboard.includes('Aprender'));

check('Whiteboard volta a ser livre',(whiteboards.includes('raciocinar livremente')||whiteboards.includes('Começar livre')||whiteboards.includes('quadro livre'))&&(whiteboards.includes('Novo whiteboard')||whiteboards.includes('NOVO WHITEBOARD')));
check('Whiteboard aponta estrutura para Blueprints',whiteboards.includes('Ir para Blueprints')&&whiteboards.includes("setActiveTab('canvas')"));
check('Whiteboard não oferece Novo Service Frame',!whiteboards.includes('Novo Service Frame')&&!whiteboards.includes('Criar Service Frame'));
check('runtime bloqueia criação legada de frame no Whiteboard',core.includes("function createServiceFrameWhiteboard(){toast('O Service Frame agora pertence a Blueprints.');return null}"));
check('runtime cria Blueprint estruturado',core.includes('function createServiceBlueprint')&&core.includes("viewKind:'blueprint'")&&core.includes("layoutMode:'service'"));
check('runtime registra Service Blueprint API',core.includes("runtime.register('serviceBlueprintFrame'"));
check('Blueprint library usa API estruturada',blueprints.includes("api<BlueprintApi>('serviceBlueprintFrame')"));
check('Blueprint library cria Service Blueprint',blueprints.includes('Criar mapa'));
check('Blueprint library lista viewKind blueprint',blueprints.includes("board.viewKind === 'blueprint'"));
check('Blueprint mostra Service Frame como estrutura',blueprints.includes('journey.stageIds.length') && blueprints.includes('data-service-map-library'));

check('CSS H3 importado',style.includes("./runtime/workspace-library-h3.css"));
for(const marker of ['.bo1205h3-sidebar','.bo1205h3-dashboard','.bo1205h3-workspace-page','.bo1205h3-table','.bo1205h3-portfolio-grid']) check(`CSS possui ${marker}`,css.includes(marker));
check('H3 oculta create global legado',css.includes('.bo114-global-create{display:none!important}'));
check('novas superfícies não copiam marca de referência',![app,library,dashboard,blueprints,whiteboards,css].some(x=>/smaply/i.test(x)));

console.log(`\nV1.20.5-H3 Workspace IA & Blueprint Migration: ${ok} OK / ${fail} FAIL`);
if(fail)process.exit(1);

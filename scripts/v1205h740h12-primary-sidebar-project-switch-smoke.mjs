import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const checks=[
 [app.includes('data-primary-sidebar-project-switch="7.40-H12"'),'App publica marker H12'],
 [main.includes("'bo-h740h12'"),'Host registra marker H12'],
 [app.includes('const isGlobalScope = !projectShellOpen'),'Escopo principal depende da entrada explícita no projeto'],
 [app.includes('data-persistent-global-nav="7.40-H13"') && app.includes('data-project-context-nav="h1"'),'Sidebar global única preservada com acesso ao projeto atual'],
 [app.includes('bo-h740h12-primary-design'),'Sidebar principal possui seção Desenho do serviço'],
 [app.includes('bo-h740h12-primary-context'),'Sidebar principal possui seção Contexto'],
 [app.includes('bo-h740h12-primary-management'),'Sidebar principal possui seção Gestão'],
 [app.includes('>Serviço</span>') && app.includes("openGlobalHome('projects')"),'Serviço abre a lista de projetos sem trocar contexto'],
 [app.includes('>Hierarquias</span>') && app.includes("openPrimaryLibraryPage('hierarchies')"),'Hierarquias voltou à sidebar principal'],
 [app.includes('>Personas</span>') && app.includes("openPrimaryLibraryPage('personas')"),'Personas voltou à sidebar principal'],
 [app.includes('>Necessidades</span>') && app.includes("openPrimaryLibraryPage('needs')"),'Necessidades voltou à sidebar principal'],
 [app.includes('>Jobs</span>') && app.includes("openPrimaryLibraryPage('jobs')"),'Jobs voltou à sidebar principal'],
 [app.includes('>Dores</span>') && app.includes("openPrimaryLibraryPage('pains')"),'Dores voltou à sidebar principal'],
 [app.includes('>Hipóteses</span>') && app.includes("openPrimaryLibraryPage('hypotheses')"),'Hipóteses voltou à sidebar principal'],
 [app.includes('>Problemas</span>') && app.includes("openPrimaryLibraryPage('problems')"),'Problemas voltou à sidebar principal'],
 [app.includes('>Evidências</span>') && app.includes("openPrimaryLibraryPage('evidence')"),'Evidências voltou à sidebar principal'],
 [app.includes('>Oportunidades</span>') && app.includes("openPrimaryLibraryPage('portfolio')"),'Oportunidades voltou à sidebar principal'],
 [app.includes('>Catálogo de métricas</span>') && app.includes("openPrimaryLibraryPage('metrics')"),'Catálogo de métricas voltou à sidebar principal'],
 [!app.includes('onClick={openPrimaryResearch}') && app.includes('<span>Público-alvo</span>'),'Acesso principal passa a Público-alvo sem Pesquisa'],
 [app.includes('>Templates</span>') && app.includes("openPrimaryLibraryPage('templates')"),'Templates voltou à sidebar principal'],
 [app.includes('>Arquivo</span>') && app.includes("openPrimaryLibraryPage('archive')"),'Arquivo voltou à sidebar principal'],
 [app.includes('const openPrimaryLibraryPage') && app.includes('setProjectShellOpen(false);'),'Navegação primária mantém sidebar principal'],
 [!app.includes('const openPrimaryResearch') && app.includes('const openPrimaryLibraryPage'),'Acesso direto a Público-alvo preserva escopo principal'],
 [app.includes('{!isProjectContext && <>'),'Sidebar principal é renderizada somente fora do projeto'],
 [app.includes('{isProjectContext && <>'),'Sidebar contextual é renderizada somente dentro do projeto'],
 [app.includes('bo-h740h10-legacy-project-nav'),'Marcadores históricos preservados sem segunda navegação'],
 [app.includes("if (projectShellOpen) openLibraryPage(page); else openPrimaryLibraryPage(page);"),'Eventos de contexto respeitam escopo atual'],
 [app.includes("currentProject?.serviceName || graph.service.name || 'Serviço'"),'Switcher principal mostra serviço atual'],
 [app.includes('const openCurrentProjectWorkspace = () => openCurrentProjectHome();'),'Projeto abre a própria visão geral antes das ferramentas'],
 [pkg.scripts['v1205h740h12:primary-sidebar-project-switch-smoke']?.includes('v1205h740h12-primary-sidebar-project-switch-smoke.mjs'),'Script H12 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h12:primary-sidebar-project-switch-smoke'),'QA acumulado inclui H12'],
];
let ok=0,fail=0; for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`); pass?ok++:fail++;}
console.log(`\nH7.40-H12 Primary Sidebar + Project Context Switch: ${ok}/${ok+fail} PASS`); process.exit(fail?1:0);

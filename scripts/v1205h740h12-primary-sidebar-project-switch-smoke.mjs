import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const sidebar=read('src/components/NativeAnimatedSidebarH764.tsx');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const checks=[
 [app.includes('data-primary-sidebar-project-switch="7.40-H12"'),'App publica marker H12'],
 [main.includes("'bo-h740h12'"),'Host registra marker H12'],
 [app.includes('const isGlobalScope = !projectShellOpen'),'Escopo principal depende da entrada explícita no projeto'],
 [app.includes('<NativeAnimatedSidebarH764') && sidebar.includes('data-native-sidebar-replacement="true"'),'Sidebar global única preservada com acesso ao projeto atual'],
 [sidebar.includes("id: 'design', title: 'Desenho do serviço'"),'Sidebar principal possui seção Desenho do serviço'],
 [sidebar.includes("id: 'context', title: 'Público-alvo'"),'Sidebar principal possui seção Contexto'],
 [sidebar.includes("id: 'management', title: 'Gestão'"),'Sidebar principal possui seção Gestão'],
 [sidebar.includes("label: 'Serviço'") && app.includes("openGlobalHome('projects')"),'Serviço abre a lista de projetos sem trocar contexto'],
 [sidebar.includes("label: 'Hierarquias'") && app.includes("hierarchies:'hierarchies'"),'Hierarquias voltou à sidebar principal'],
 [sidebar.includes("label: 'Personas'") && app.includes("personas:'personas'"),'Personas voltou à sidebar principal'],
 [sidebar.includes("label: 'Necessidades'") && app.includes("needs:'needs'"),'Necessidades voltou à sidebar principal'],
 [sidebar.includes("label: 'Jobs'") && app.includes("jobs:'jobs'"),'Jobs voltou à sidebar principal'],
 [sidebar.includes("label: 'Dores'") && app.includes("pains:'pains'"),'Dores voltou à sidebar principal'],
 [sidebar.includes("label: 'Hipóteses'") && app.includes("hypotheses:'hypotheses'"),'Hipóteses voltou à sidebar principal'],
 [sidebar.includes("label: 'Problemas'") && app.includes("problems:'problems'"),'Problemas voltou à sidebar principal'],
 [sidebar.includes("label: 'Evidências'") && app.includes("evidence:'evidence'"),'Evidências voltou à sidebar principal'],
 [sidebar.includes("label: 'Oportunidades'") && app.includes("portfolio:'portfolio'"),'Oportunidades voltou à sidebar principal'],
 [sidebar.includes("label: 'Catálogo de métricas'") && app.includes("metrics:'metrics'"),'Catálogo de métricas voltou à sidebar principal'],
 [!app.includes('onClick={openPrimaryResearch}') && sidebar.includes("title: 'Público-alvo'"),'Acesso principal passa a Público-alvo sem Pesquisa'],
 [sidebar.includes("label: 'Templates'") && app.includes("templates:'templates'"),'Templates voltou à sidebar principal'],
 [sidebar.includes("label: 'Arquivo'") && app.includes("archive:'archive'"),'Arquivo voltou à sidebar principal'],
 [app.includes('const openPrimaryLibraryPage') && app.includes('setProjectShellOpen(false);'),'Navegação primária mantém sidebar principal'],
 [!app.includes('const openPrimaryResearch') && app.includes('const openPrimaryLibraryPage'),'Acesso direto a Público-alvo preserva escopo principal'],
 [sidebar.includes('data-project-scope={projectScope}'),'Sidebar principal é renderizada somente fora do projeto'],
 [app.includes('projectScope={isGlobalScope ?'),'Sidebar contextual é renderizada somente dentro do projeto'],
 [app.includes('onNavigate={navigateSidebar}'),'Marcadores históricos preservados sem segunda navegação'],
 [app.includes("if (projectShellOpen) openLibraryPage(page); else openPrimaryLibraryPage(page);"),'Eventos de contexto respeitam escopo atual'],
 [app.includes("currentProject?.serviceName || graph.service.name || 'Serviço'"),'Switcher principal mostra serviço atual'],
 [app.includes('const openCurrentProjectWorkspace = () => openCurrentProjectHome();'),'Projeto abre a própria visão geral antes das ferramentas'],
 [pkg.scripts['v1205h740h12:primary-sidebar-project-switch-smoke']?.includes('v1205h740h12-primary-sidebar-project-switch-smoke.mjs'),'Script H12 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h12:primary-sidebar-project-switch-smoke'),'QA acumulado inclui H12'],
];
let ok=0,fail=0; for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`); pass?ok++:fail++;}
console.log(`\nH7.40-H12 Primary Sidebar + Project Context Switch: ${ok}/${ok+fail} PASS`); process.exit(fail?1:0);

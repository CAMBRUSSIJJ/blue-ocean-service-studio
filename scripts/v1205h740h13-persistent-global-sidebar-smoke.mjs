import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const sidebar=read('src/components/NativeAnimatedSidebarH764.tsx');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const css=read('src/runtime/persistent-global-sidebar-h740h13.css');
const checks=[
 [app.includes('data-persistent-global-sidebar="7.40-H13"'),'App publica marker H13'],
 [main.includes("'bo-h740h13'"),'Host registra marker H13'],
 [style.includes("persistent-global-sidebar-h740h13.css"),'CSS H13 importado'],
 [app.includes('<NativeAnimatedSidebarH764'),'Sidebar global persistente publicada'],
 [!app.includes('{!isProjectContext && <>\n            <div className="bo-h701-nav-section bo-h740h12-primary-design"'),'Sidebar principal não depende mais do contexto do projeto'],
 [sidebar.includes("id: 'design', title: 'Desenho do serviço'"),'Seção Desenho do serviço permanece sempre disponível'],
 [sidebar.includes("id: 'context', title: 'Público-alvo'"),'Seção Contexto permanece sempre disponível'],
 [sidebar.includes("id: 'management', title: 'Gestão'"),'Seção Gestão permanece sempre disponível'],
 [sidebar.includes("label: 'Personas'") && sidebar.includes("label: 'Problemas'") && sidebar.includes("label: 'Evidências'"),'Entidades principais permanecem na sidebar'],
 [sidebar.includes("label: 'Oportunidades'") && sidebar.includes("label: 'Catálogo de métricas'"),'Gestão permanece na sidebar'],
 [sidebar.includes("id: 'servico'") && app.includes('<NativeAnimatedSidebarH764'),'Projeto possui acesso contextual sem segunda sidebar global'],
 [sidebar.includes('id="bo-primary-navigation"') && sidebar.includes("id: 'servico'"),'Sidebar permanece fonte da navegação global; abas locais são contextuais'],
 [!app.includes('aria-label="Áreas do projeto"') && sidebar.includes("label: 'Arquivo'"),'Visão geral e biblioteca duplicadas saem do topo; Arquivo fica no menu'],
 [app.includes("openExternal('collaboration', 'collaboration', 'workspace')") && app.includes("openExternal('settings', 'unifiedWorkspaces')"),'Equipe e Configurações continuam acessíveis'],
 [app.includes('const openPrimaryLibraryPage') && app.includes('preserve project context'),'Navegação primária preserva o projeto aberto'],
 [!app.includes('const openPrimaryResearch') && app.includes('const openPrimaryLibraryPage'),'Público-alvo preserva o projeto aberto'],
 [sidebar.includes('data-project-switcher-trigger'),'Switcher do serviço é persistente'],
 [sidebar.includes('PROJETOS DO SERVIÇO'),'Switcher continua permitindo trocar projeto'],
 [css.includes('overflow-x:auto'),'Styles legados continuam preservados para migração'],
 [sidebar.includes('is-active') && sidebar.includes('bo-h764-navigation'),'Estado ativo vive na sidebar global'],
 [pkg.scripts['v1205h740h13:persistent-global-sidebar-smoke']?.includes('v1205h740h13-persistent-global-sidebar-smoke.mjs'),'Script H13 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h13:persistent-global-sidebar-smoke'),'QA acumulado inclui H13'],
 [pkg.description?.includes('H7.40-H13 Persistent Global Sidebar'),'Metadata identifica H13'],
 [app.includes('projectScope={isGlobalScope ?'),'Contratos históricos H12 preservados'],
 [app.includes('onNavigate={navigateSidebar}'),'Contrato histórico H10 preservado'],
];
let ok=0,fail=0; for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`); pass?ok++:fail++;}
console.log(`\nH7.40-H13 Persistent Global Sidebar: ${ok}/${ok+fail} PASS`); process.exit(fail?1:0);

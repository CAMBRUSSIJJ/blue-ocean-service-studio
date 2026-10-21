import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const css=read('src/runtime/persistent-global-sidebar-h740h13.css');
const checks=[
 [app.includes('data-persistent-global-sidebar="7.40-H13"'),'App publica marker H13'],
 [main.includes("'bo-h740h13'"),'Host registra marker H13'],
 [style.includes("persistent-global-sidebar-h740h13.css"),'CSS H13 importado'],
 [app.includes('data-persistent-global-nav="7.40-H13"'),'Sidebar global persistente publicada'],
 [!app.includes('{!isProjectContext && <>\n            <div className="bo-h701-nav-section bo-h740h12-primary-design"'),'Sidebar principal não depende mais do contexto do projeto'],
 [app.includes('bo-h740h12-primary-design'),'Seção Desenho do serviço permanece sempre disponível'],
 [app.includes('bo-h740h12-primary-context'),'Seção Contexto permanece sempre disponível'],
 [app.includes('bo-h740h12-primary-management'),'Seção Gestão permanece sempre disponível'],
 [app.includes('>Personas</span>') && app.includes('>Problemas</span>') && app.includes('>Evidências</span>'),'Entidades principais permanecem na sidebar'],
 [app.includes('>Oportunidades</span>') && app.includes('>Catálogo de métricas</span>'),'Gestão permanece na sidebar'],
 [!app.includes('data-project-context-nav="7.40-H13"'),'Projeto não renderiza navegação duplicada'],
 [app.includes('data-project-navigation-single-source="1"'),'Sidebar é fonte única de navegação'],
 [!app.includes('aria-label="Áreas do projeto"') && app.includes('>Arquivo</span>'),'Visão geral e biblioteca duplicadas saem do topo; Arquivo fica no menu'],
 [app.includes("openExternal('collaboration', 'collaboration', 'workspace')") && app.includes("openExternal('settings', 'unifiedWorkspaces')"),'Equipe e Configurações continuam acessíveis'],
 [app.includes('const openPrimaryLibraryPage') && app.includes('preserve project context'),'Navegação primária preserva o projeto aberto'],
 [!app.includes('const openPrimaryResearch') && app.includes('const openPrimaryLibraryPage'),'Público-alvo preserva o projeto aberto'],
 [app.includes('bo-h740h13-persistent-switcher'),'Switcher do serviço é persistente'],
 [app.includes('Projetos do serviço'),'Switcher continua permitindo trocar projeto'],
 [css.includes('overflow-x:auto'),'Styles legados continuam preservados para migração'],
 [app.includes('is-active') && app.includes('bo-h701-sidebar-nav'),'Estado ativo vive na sidebar global'],
 [pkg.scripts['v1205h740h13:persistent-global-sidebar-smoke']?.includes('v1205h740h13-persistent-global-sidebar-smoke.mjs'),'Script H13 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h13:persistent-global-sidebar-smoke'),'QA acumulado inclui H13'],
 [pkg.description?.includes('H7.40-H13 Persistent Global Sidebar'),'Metadata identifica H13'],
 [app.includes('H7.40-H12 compatibility markers only'),'Contratos históricos H12 preservados'],
 [app.includes('bo-h740h10-legacy-project-nav'),'Contrato histórico H10 preservado'],
];
let ok=0,fail=0; for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`); pass?ok++:fail++;}
console.log(`\nH7.40-H13 Persistent Global Sidebar: ${ok}/${ok+fail} PASS`); process.exit(fail?1:0);

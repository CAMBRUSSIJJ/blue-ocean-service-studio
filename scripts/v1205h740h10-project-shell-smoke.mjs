import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const globalHome=read('src/views/ProjectHomeView.tsx');
const shell=read('src/views/ProjectShellView.tsx');
const css=read('src/runtime/project-shell-h740h10.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));

const checks=[
 [app.includes("import { ProjectShellView, type ProjectShellSection }"),'App importa Project Shell'],
 [app.includes("const [projectShellOpen") && app.includes("const [projectShellSection"),'Shell mantém escopo e seção de projeto'],
 [app.includes("const openCurrentProjectHome") && app.includes("detail: 'home'"),'Projeto possui Home própria'],
 [app.includes("openProjectHome={() => openCurrentProjectHome('overview')}") ,'Global Project Home abre Home do projeto'],
 [globalHome.includes('openProjectHome: () => void') && !globalHome.includes('openProjectWorkspace: () => void'),'Card de projeto não abre Service Workspace diretamente'],
 [globalHome.includes("window.setTimeout(openProjectHome, 0)") ,'Projeto criado entra na Home do projeto'],
 [app.includes('bo-h740h10-project-nav'),'Sidebar possui navegação contextual compacta'],
 [app.includes('>Visão geral</span>') && app.includes('>Serviço</span>') && shell.includes('>Público-alvo</strong>') && app.includes('>Biblioteca</span>') && app.includes('>Arquivos</span>') && app.includes('>Equipe</span>') && app.includes('>Configurações</span>'),'Navegação do projeto mantém áreas canônicas, com Público-alvo'],
 [app.includes('bo-h740h10-legacy-project-nav'),'Navegação antiga fica apenas como marcador legado'],
 [css.includes('.bo-h740h10-legacy-project-nav{display:none!important}'),'Marcadores antigos não aparecem visualmente'],
 [shell.includes('SERVIÇO PRINCIPAL') && shell.includes('Abrir serviço'),'Project Home trata Serviço como módulo explícito'],
 [shell.includes('Elementos do projeto') && shell.includes('Ferramentas e configurações') && shell.includes('Público-alvo') && shell.includes('Biblioteca') && shell.includes('Arquivos') && shell.includes('Equipe') && shell.includes('Configurações'),'Project Home expõe elementos e ferramentas do projeto'],
 [shell.includes('BIBLIOTECA DO PROJETO') && shell.includes('Pessoas & contexto') && shell.includes('Descoberta') && shell.includes('Gestão'),'Biblioteca consolida entidades por grupos'],
 [shell.includes("openLibraryHub") ,'Project Home abre hub da Biblioteca'],
 [app.includes("openProjectLibraryHub") && app.includes("openCurrentProjectHome('library')"),'Shell roteia Biblioteca sem expor entidades na sidebar'],
 [app.includes("openCurrentProjectHome('overview')}>{projectTitle}") ,'Breadcrumb do projeto volta para Project Home'],
 [app.includes('data-project-scope={isGlobalScope ? "global" : "project"}'),'Escopo Global × Projeto é explícito'],
 [app.includes('const isGlobalScope =') && app.includes("projectShellOpen || activeTab !== 'home'"),'Configurações globais não acionam contexto de projeto por engano'],
 [app.includes('isGlobalHome && <ProjectHomeView') && app.includes('isProjectHome && <ProjectShellView'),'Global Home e Project Home são superfícies distintas'],
 [app.includes("<span>Projeto</span>") && app.includes("<span>Serviço</span>"),'Mobile separa Projeto × Serviço'],
 [shell.includes('data-project-shell="7.40-H10"'),'Project Shell publica marker H10'],
 [app.includes('data-project-shell="7.40-H10"'),'App publica marker H10'],
 [css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Project Home usa grid responsivo de áreas'],
 [css.includes('@media(max-width:720px)') && css.includes('grid-template-columns:1fr'),'Project Shell adapta ao mobile'],
 [style.includes("project-shell-h740h10.css") && style.indexOf('project-shell-h740h10.css')<style.indexOf('@tailwind base'),'CSS H10 está no bloco inicial de imports'],
 [main.includes("'bo-h740h10'"),'Host registra H10'],
 [pkg.scripts['v1205h740h10:project-shell-smoke']?.includes('v1205h740h10-project-shell-smoke.mjs'),'Script H10 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h10:project-shell-smoke'),'QA acumulado inclui H10'],
];
let ok=0,fail=0;for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`);pass?ok++:fail++;}
console.log(`\nH7.40-H10 Project Shell & Contextual Navigation: ${ok}/${ok+fail} PASS`);process.exit(fail?1:0);

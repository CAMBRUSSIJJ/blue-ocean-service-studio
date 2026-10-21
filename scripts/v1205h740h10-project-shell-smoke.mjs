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
 [app.includes("import type { ProjectShellSection }"),'Legacy Project Shell type retained for safe migration'],
 [app.includes('const [projectShellOpen') && app.includes('const [projectShellSection'),'Project selection context remains preserved'],
 [app.includes("const openCurrentProjectHome") && app.includes("openServiceWorkspaceTab('journey')"),'Old project-home routes into real Journey workspace'],
 [app.includes("openProjectWorkspace={openCurrentProjectWorkspace}"),'Global Project Home opens work directly'],
 [globalHome.includes('openProjectWorkspace: () => void') && !globalHome.includes('openProjectHome: () => void'),'Project cards do not open a redundant home'],
 [globalHome.includes('window.setTimeout(openProjectWorkspace, 0)'),'New project enters real workspace'],
 [app.includes('bo-h740h12-primary-design'),'Sidebar retains design navigation'],
 [app.includes("openPrimaryLibraryPage('personas')") && app.includes("openPrimaryLibraryPage('archive')"),'Personas and archive accessible in sidebar'],
 [app.includes('bo-h740h10-legacy-project-nav'),'Historical navigation marker retained without displaying it'],
 [css.includes('.bo-h740h10-legacy-project-nav{display:none!important}'),'Historical navigation remains visually hidden'],
 [shell.includes('SERVIÇO PRINCIPAL') && shell.includes('Abrir serviço'),'Legacy Project Shell source preserved for recovery'],
 [shell.includes('Elementos do projeto') && !shell.includes('Ferramentas e configurações'),'Legacy shell contents preserved only in source'],
 [shell.includes('BIBLIOTECA DO PROJETO'),'Old library data and components remain recoverable'],
 [!app.includes('data-project-context-nav="7.40-H13"') && app.includes('data-project-navigation-single-source="1"'),'Duplicate project tab bar removed from rendered JSX'],
 [app.includes("onClick={() => openCurrentProjectHome('overview')}>{projectTitle}") && app.includes("if (section === 'library') { openLibraryPage('personas');"),'Legacy breadcrumbs route into actual work or Personas'],
 [app.includes('data-project-scope={isGlobalScope ? "global" : "project"}'),'Explicit project scope preserved'],
 [app.includes('const isGlobalScope = !projectShellOpen'),'Global and project scope stay separate'],
 [app.includes('isGlobalHome && <ProjectHomeView') && !app.includes('isProjectHome && <ProjectShellView'),'Only global project picker and working editor render'],
 [app.includes('<span>Jornadas</span>') && app.includes('<span>Serviço</span>'),'Mobile goes to Jornadas and keeps project picker'],
 [shell.includes('data-project-shell="7.40-H10"'),'Legacy shell remains available without losing archived code'],
 [app.includes('data-project-shell="7.40-H10"'),'Application marker retained for historical QA'],
 [css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Legacy grid styles preserved for migration'],
 [css.includes('@media(max-width:720px)') && css.includes('grid-template-columns:1fr'),'Responsive styles preserved'],
 [style.includes("project-shell-h740h10.css") && style.indexOf('project-shell-h740h10.css')<style.indexOf('@tailwind base'),'Legacy CSS included before Tailwind'],
 [main.includes("'bo-h740h10'"),'Host registers historical H10'],
 [pkg.scripts['v1205h740h10:project-shell-smoke']?.includes('v1205h740h10-project-shell-smoke.mjs'),'QA script registered'],
 [pkg.scripts.qa?.includes('v1205h740h10:project-shell-smoke'),'QA includes H10 compatibility checks'],
];
let ok=0,fail=0;for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`);pass?ok++:fail++;}
console.log(`\nH7.40-H10 Project Direct Navigation Migration: ${ok}/${ok+fail} PASS`);process.exit(fail?1:0);

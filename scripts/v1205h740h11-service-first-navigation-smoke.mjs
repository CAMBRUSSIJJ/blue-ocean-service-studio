import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const home=read('src/views/ProjectHomeView.tsx');
const shell=read('src/views/ProjectShellView.tsx');
const css=read('src/runtime/service-first-navigation-h740h11.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const checks=[
 [app.includes('data-service-first-navigation="7.40-H11"'),'App publica marker H11'],
 [home.includes('data-service-first-navigation="7.40-H11"'),'Project Home publica marker H11'],
 [app.includes('data-service-projects-nav="1"') && app.includes('>Serviço</span>'),'Sidebar global usa Serviço como entrada principal'],
 [app.includes('bo-h740h11-legacy-global-projects'),'Contrato legado Projetos preservado sem dominar UI'],
 [app.includes('<strong>Serviço</strong><em>Projetos de serviço</em>'),'Switcher global comunica Serviço → Projetos'],
 [home.includes('Projetos do serviço') && home.includes('Escolha um projeto'),'Área Serviço mostra projetos explicitamente'],
 [home.includes('data-home-projects="1"') && home.includes("setSection('projects')"),'Home apresenta projeto recente e encaminha à biblioteca completa'],
 [home.includes('data-service-projects="1"'),'Lista de projetos pertence semanticamente a Serviço'],
 [home.includes('Abra um projeto para consultar informações, público, pesquisa, mapas e melhorias.'),'Fluxo Serviço → Projeto → Contexto e Mapas está explícito'],
 [app.includes('>Serviço</button>') || app.includes("openGlobalHome('projects')}>Serviço</button>"),'Breadcrumb global usa Serviço'],
 [app.includes("projectHomeSection === 'projects' ? 'Serviço'"),'Header global chama a área de Serviço'],
 [app.includes('<span>Serviço</span></button>') && app.includes("openGlobalHome('projects')"),'Mobile global usa Serviço'],
 [shell.includes('Abrir serviço') && shell.includes('SERVIÇO PRINCIPAL'),'Projeto mantém Serviço como módulo interno após seleção'],
 [app.includes('data-project-context-nav="h1"') && app.includes('bo-h740h10-legacy-project-nav'),'Acesso ao projeto está na sidebar, preservando marcador legado'],
 [css.includes('.bo-h740h11-service-summary'),'H11 possui tratamento visual próprio'],
 [style.includes("service-first-navigation-h740h11.css") && style.indexOf('service-first-navigation-h740h11.css')<style.indexOf('@tailwind base'),'CSS H11 está no bloco inicial'],
 [main.includes("'bo-h740h11'"),'Host registra H11'],
 [pkg.scripts['v1205h740h11:service-first-navigation-smoke']?.includes('v1205h740h11-service-first-navigation-smoke.mjs'),'Script H11 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h11:service-first-navigation-smoke'),'QA acumulado inclui H11'],
 [pkg.description.includes('V1.20.5-H7.40-H11 Service-first Project Navigation'),'Metadata declara H11 como release atual'],
];
let ok=0,fail=0;for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`);pass?ok++:fail++;}
console.log(`\nH7.40-H11 Service-first Project Navigation: ${ok}/${ok+fail} PASS`);process.exit(fail?1:0);

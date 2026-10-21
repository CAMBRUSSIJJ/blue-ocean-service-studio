import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const bp=read('src/views/BlueprintWorkspaceView.tsx');
const css=read('src/runtime/interaction-accessibility-polish-h740h14.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');
const checks=[
 [app.includes('data-interaction-accessibility-polish="7.40-H14"'),'App publica marker H14'],
 [bp.includes('data-interaction-accessibility-polish="7.40-H14"'),'Guided Workspace publica marker H14'],
 [main.includes("'bo-h740h14'"),'Host registra marker H14'],
 [style.includes("interaction-accessibility-polish-h740h14.css"),'CSS H14 importado'],
 [app.includes("bo-sidebar-sections"),'Estado recolhível da sidebar é persistido'],
 [app.includes("toggleSidebarSection"),'Sidebar possui toggle de seções'],
 [app.includes("aria-expanded={!collapsedSidebarSections.design}"),'Desenho do serviço expõe estado acessível'],
 [app.includes("aria-expanded={!collapsedSidebarSections.context}"),'Contexto expõe estado acessível'],
 [app.includes("aria-expanded={!collapsedSidebarSections.management}"),'Gestão expõe estado acessível'],
 [app.includes("bo-h740h14-section-items"),'Itens das seções usam disclosure explícito'],
 [app.includes('>Serviço</span>') && app.includes('>Jornadas</span>'),'Projeto distingue seleção de serviço da lista de Jornadas'],
 [app.includes("? 'Design do serviço'"),'Título ativo usa Design do serviço'],
 [bp.includes('>Design do serviço</button>'),'Header compacto usa Design do serviço'],
 [app.includes('data-header-mode={activeTab === \'canvas\' && !externalNav ? \'compact-tool\' : \'standard\'}'),'Header do app possui modo compacto'],
 [css.includes('.bo-h740h14-compact-app-header'),'CSS compacta header em ferramentas'],
 [app.includes("'Salvando…'"),'Status usa Salvando com feedback explícito'],
 [app.includes("'Salvo neste dispositivo'"),'Status salvo explica persistência local'],
 [app.includes("'Não foi possível salvar'"),'Status de erro é explícito'],
 [app.includes('aria-live="polite"'),'Salvamento anuncia mudanças sem interromper'],
 [app.includes('aria-current={isPrimaryLibrary && libraryPage === \'personas\' ? \'page\' : undefined}'),'Personas publica aria-current'],
 [app.includes("libraryPage === 'personas' ? 'page' : undefined") && !app.includes('title="Pesquisa"'),'Público-alvo publica aria-current e Pesquisa não ocupa a sidebar'],
 [app.includes("serviceWorkspaceTab === 'journey' ? 'page' : undefined") || app.includes("serviceWorkspaceTab === 'whiteboard' && !externalNav ? 'page' : undefined"),'Jornadas e Whiteboard publicam estado ativo na navegação'],
 [css.includes('min-height:40px!important'),'Targets desktop foram ampliados'],
 [css.includes('@media(pointer:coarse)'),'Touch targets recebem regra coarse pointer'],
 [css.includes('.bo-h740h14-section-items[hidden]{display:block!important}'),'Sidebar recolhida no desktop não bloqueia navegação mobile'],
 [css.includes('min-height:44px!important'),'Touch targets chegam a 44px'],
 [css.includes(':focus-visible'),'Foco visível reforçado'],
 [css.includes('.bo-h740h7-capability-main p{font-size:11.5px'),'Descrições das capabilities ganharam legibilidade'],
 [bp.includes('Evolua o serviço, fase por fase'),'Copy evita linearidade rígida'],
 [pkg.scripts['v1205h740h14:interaction-accessibility-polish-smoke']?.includes('v1205h740h14-interaction-accessibility-polish-smoke.mjs'),'Script H14 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h14:interaction-accessibility-polish-smoke'),'QA acumulado inclui H14'],
 [pkg.description?.includes('H7.40-H14 Interaction & Accessibility Polish'),'Metadata identifica H14'],
 [preflight.includes('H7.40-H14 Interaction & Accessibility Polish'),'Preflight inclui H14'],
 [app.includes('data-persistent-global-sidebar="7.40-H13"'),'Sidebar persistente H13 foi preservada'],
 [bp.includes('data-guided-service-workspace="7.40-H7"'),'Guided Workspace H7 foi preservado'],
];
let ok=0,fail=0; for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`); pass?ok++:fail++;}
console.log(`\nH7.40-H14 Interaction & Accessibility Polish: ${ok}/${ok+fail} PASS`); process.exit(fail?1:0);

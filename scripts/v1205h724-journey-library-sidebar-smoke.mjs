import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const exists=(p)=>fs.existsSync(p);
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};
const view=(read('src/views/BlueprintWorkspaceView.tsx')+read('src/views/ServiceMapsLibrary.tsx'));
const app=read('src/App.tsx');
const sidebar=read('src/components/NativeAnimatedSidebarH764.tsx');
const sidebarCss=read('src/components/native-animated-sidebar-h764.css');
const css=read('src/runtime/journey-library-sidebar-h724.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const preflight=read('preflight-linux.sh');
const pkg=JSON.parse(read('package.json'));

check(exists('src/runtime/journey-library-sidebar-h724.css'),'CSS H7.24 existe');
check(css.includes('H7.24 — Journey Library parity + collapsible sidebar'),'CSS declara H7.24');
check(style.includes("@import './runtime/journey-library-sidebar-h724.css';"),'CSS H7.24 importado');
check(style.indexOf('journey-editor-h723.css') < style.indexOf('journey-library-sidebar-h724.css'),'H7.24 sucede H7.23 na cascata');
check(main.includes("'bo-h724j'"),'body recebe marker H7.24 Journey/Sidebar');
check(app.includes('data-journey-library-sidebar="7.24"'),'shell declara H7.24');
check(view.includes('data-journey-library-workspace="7.24"'),'Service Workspace declara H7.24');

check(view.includes('data-journey-library="1"'),'Mapa possui uma biblioteca unificada');
check(view.includes('DESENHO DO SERVIÇO') && view.includes('<h2>Mapas do serviço</h2>'),'Journey library possui cabeçalho equivalente ao Blueprint');
check(view.includes('Buscar mapas'),'Journey library possui busca');
check(view.includes("onView('cards')") && view.includes("onView('table')"),'Journey alterna Cards/Tabela');
check(view.includes('bo-h724-journey-grid'),'Journey possui grid de cards');
check(view.includes('journeyPreviewSrc(journey, graph)') && read('src/services/journey-preview.ts').includes('if (hasCustomJourneyCover(journey)) return journeyCoverSrc(journey)'),'cards mostram mapa salvo e preservam capas personalizadas');
check(view.includes('Crie seu primeiro mapa'),'Journey possui estado vazio');
check(view.includes('Criar mapa'),'Journey pode ser criada no próprio tab');
check(view.includes('journeyApi') && view.includes("api<JourneyHomeApi>('journeyHome')"),'criação/abertura usa runtime canônico journeyHome');
check(view.includes('setJourneyEditorOpen(true)'),'Journey só abre editor após seleção/criação');
check(view.includes('onBack={() => setJourneyEditorOpen(false)}') && read('src/views/JourneyCanvasFree.tsx').includes('Todas as Jornadas'),'editor possui retorno para biblioteca no cabeçalho do mapa');
check(view.includes("if (id === 'journey') setJourneyEditorOpen(false)"),'clicar no tab Journey retorna à biblioteca');
check(view.includes("workspaceTab === 'journey' && !journeyEditorOpen") && view.includes("workspaceTab === 'journey' && journeyEditorOpen"),'library e editor têm estados separados');

check(app.includes('bo-sidebar-collapsed') && app.includes('setIsSidebarCollapsed'), 'sidebar recolhível persiste preferência');
check(sidebar.includes('bo-h764-collapse-button') && sidebar.includes('<ChevronLeft size={19}/>') && sidebar.includes('<ChevronRight size={19}/>'), 'sidebar possui affordance visual de recolher/expandir');
check(sidebar.includes("data-sidebar-collapsed={collapsed ? '1' : '0'}"),'sidebar expõe estado recolhido');
check(sidebar.includes('onToggleCollapse();'), 'controle de recolhimento existe e usa a ação real');
check(sidebarCss.includes('flex-basis:76px') && sidebarCss.includes('width:76px'), 'sidebar recolhida usa largura compacta');
check(sidebarCss.includes('flex:0 0 260px') && sidebarCss.includes('width:260px'), 'sidebar expandida mantém largura de trabalho');
check(sidebarCss.includes('.bo-h764-sidebar.is-collapsed .bo-h764-context-text'), 'seletor de serviço se adapta ao estado recolhido');
check(sidebarCss.includes('.bo-h764-sidebar.is-collapsed .bo-h764-section-heading'), 'labels de seção são ocultados no modo recolhido');
check(sidebarCss.includes('.bo-h764-sidebar.is-collapsed .bo-h764-sidebar-footer'), 'footer se adapta ao modo recolhido');
check(sidebarCss.includes('@media(max-width:767px)') && sidebarCss.includes('body.bo1175-mobile-nav-open'), 'collapse desktop não conflita com navegação móvel');

check(view.includes("workspaceTab === 'journey' && !journeyCreateOpen && <>{handoff.readyForJourney"),'ações de Blueprint estão na biblioteca compartilhada e fora do fluxo de criação da Jornada');
check(view.includes('bo-h722-library-toolbar') && view.includes('Criar mapa') && view.includes('data-service-map-library') && !view.includes('> Criar Jornada</button>'),'Jornada tem uma ação principal contextual, sem duplicar no header');
check(sidebar.includes("data-service-journey-nav={item.id === 'maps'") && view.includes("requestedTab === 'blueprint' ? 'journey' : requestedTab") && view.includes('data-service-map-library="1"') && view.includes('prepareJourneyBlueprintDraft'),'Jornada e Blueprint compartilham a navegação preservando o vínculo canônico');
check(view.includes('<JourneyView studio={studio} onBack={() => setJourneyEditorOpen(false)}/>'),'editor Journey canônico permanece incorporado');
check(view.includes('<WhiteboardsView studio={studio}/>'),'Whiteboard permanece incorporado');
check(view.includes('data-unified-legacy-targets'),'contratos legados continuam documentados');

check(Boolean(pkg.scripts['v1205h724:journey-library-sidebar-smoke']),'script H7.24 registrado');
check(pkg.scripts.qa?.includes('v1205h724:journey-library-sidebar-smoke'),'QA acumulado inclui H7.24');
check(String(pkg.description).includes('H7.24 Journey Library & Collapsible Sidebar'),'package descreve H7.24');
check(preflight.includes('journey-library-sidebar-h724.css') && preflight.includes('v1205h724-journey-library-sidebar-smoke.mjs'),'preflight conhece H7.24');

console.log(`\nH7.24 Journey Library & Collapsible Sidebar: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

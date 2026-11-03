import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(file, 'utf8');
const app = read('src/App.tsx');
const css = read('src/runtime/animated-saas-sidebar-h763.css');
const style = read('src/style.css');
const sourceChecks = [
  ['A sidebar enviada foi integrada à sidebar nativa, não montada como segundo shell',
    app.includes('data-animated-sidebar="H7.63"') && app.includes('data-bo-precision-sidebar-native="1"')
    && !app.includes('import AnimatedSidebar') && !app.includes('<AnimatedSidebar')],
  ['A identidade Blue Ocean permanece com logo e switcher reais',
    app.includes('BLUE OCEAN') && app.includes('Service Studio') && app.includes('currentProject?.serviceName || graph.service.name')],
  ['Nome fictício da referência não foi copiado',
    !app.includes('Lavanderia') && !app.includes('Nenhum dado encontrado')],
  ['Menu recolhível usa o estado e a preferência persistentes',
    app.includes("localStorage.getItem('bo-sidebar-collapsed')") && app.includes("localStorage.setItem('bo-sidebar-collapsed'") &&
    app.includes('setIsSidebarCollapsed(value => !value)')],
  ['Controle de recolhimento fica no header com acessibilidade',
    app.includes('bo-h763-collapse-toggle') && app.includes('aria-controls="bo-primary-navigation"') &&
    app.includes('<ChevronRight size={18}/>') && app.includes('<ChevronLeft size={18}/>')],
  ['Menu principal permanece a única navegação canônica',
    app.includes('id="bo-primary-navigation"') && app.includes('data-persistent-global-nav="7.40-H13"')],
  ['Serviço e Mapas preservam fluxos reais',
    app.includes('data-service-projects-nav="1"') && app.includes("onClick={() => openGlobalHome('projects')}") &&
    app.includes('data-service-journey-nav="1"') && app.includes("onClick={() => openServiceWorkspaceTab('journey')}")],
  ['Whiteboard existente continua navegável',
    app.includes('data-blue-ocean-whiteboard-nav="standard"') &&
    app.includes("onClick={() => openServiceWorkspaceTab('whiteboard')}")],
  ['Personas, Necessidades, Dores e Jobs continuam na biblioteca real',
    ["'personas'","'needs'","'pains'","'jobs'"].every(page=>app.includes("openPrimaryLibraryPage("+page+")"))],
  ['Projetos tem entrada real na seção Gestão',
    app.includes('data-sidebar-projects-nav="H7.63"') && app.includes('data-sidebar-section="management"') &&
    app.includes('<FolderKanban size={17}/>')],
  ['Arquivo e Configurações continuam funcionais',
    app.includes("openPrimaryLibraryPage('archive')") && app.includes("openExternal('settings', 'unifiedWorkspaces')")],
  ['Nav ativo usa aria-current verdadeiro',
    app.includes("aria-current={isPrimaryLibrary && libraryPage === 'personas' ? 'page' : undefined}") &&
    app.includes("aria-current={isGlobalHome && projectHomeSection === 'projects' ? 'page' : undefined}")],
  ['Os três grupos e seus estados continuam disponíveis',
    ["data-sidebar-section=\"design\"","data-sidebar-section=\"context\"","data-sidebar-section=\"management\""].every(v=>app.includes(v)) &&
    app.includes("localStorage.setItem('bo-sidebar-sections'")],
  ['Larguras correspondem às do CSS estrutural anterior',
    app.includes('isSidebarCollapsed ? 72 : 256') && css.includes('width:256px!important') && css.includes('width:72px!important')],
  ['Estilo é isolado na sidebar canônica',
    css.includes('aside[data-animated-sidebar="H7.63"]') && style.includes("@import './runtime/animated-saas-sidebar-h763.css';")],
  ['Ícones, fundo, item ativo e indicador seguem a referência',
    css.includes('background:#f8fafc') && css.includes('background:var(--bo-h763-active-bg)') &&
    css.includes('width:4px!important;height:20px!important')],
  ['Menu tem rodapé limpo, sem duplicar Configurações',
    css.includes('.bo1187-sidebar-footer button') && css.includes('display:none!important')],
  ['Motion reduzido e responsividade foram tratados',
    css.includes('@media(prefers-reduced-motion:reduce)') && css.includes('@media(max-width:767px)')],
];
let success=0;
for(const [label,pass] of sourceChecks){console.log((pass?'OK ':'FAIL ')+label);if(pass)success++;}
console.log('H7.63 Animated SaaS Sidebar: '+success+'/'+sourceChecks.length+' PASS');
assert.equal(success,sourceChecks.length);

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => readFileSync(file, 'utf8');
const app = read('src/App.tsx');
const sidebar = read('src/components/NativeAnimatedSidebarH764.tsx');
const styles = read('src/components/sidebar-collapse-h765.css');
const rootStyle = read('src/style.css');
const h764 = read('src/components/native-animated-sidebar-h764.css');
const persona = read('src/views/PersonasView.tsx');
const checks = [
  ['A sidebar usa a estrutura nova e não reaproveita a classe legada bo1175-sidebar',
    sidebar.includes('bo-h764-sidebar bo-h765-sidebar') && !sidebar.includes('bo1175-sidebar')],
  ['O estado de recolhimento controla a classe e a marcação do DOM',
    sidebar.includes("collapsed ? 'is-collapsed' : ''") && sidebar.includes("data-sidebar-collapsed={collapsed ? '1' : '0'}")],
  ['A sidebar tem controles para expandir e recolher',
    sidebar.includes('onToggleCollapse();') && sidebar.includes('Expandir sidebar') && sidebar.includes('Recolher sidebar')],
  ['Root e painel principal têm contrato do novo layout',
    app.includes('data-layout-corrigido="H7.65"') && app.includes('bo-h765-main-column flex-1 min-w-0')],
  ['O JS reserva 256px aberto e 72px fechado',
    app.includes("isSidebarCollapsed ? 72 : 256")],
  ['A folha H7.65 entra depois da folha H7.64',
    rootStyle.indexOf("native-animated-sidebar-h764.css") >= 0 && rootStyle.indexOf("sidebar-collapse-h765.css") > rootStyle.indexOf("native-animated-sidebar-h764.css")],
  ['A folha é carregada no projeto',
    rootStyle.includes("@import './components/sidebar-collapse-h765.css';")],
  ['Aberto: sidebar não encolhe por flexbox',
    styles.includes('flex:0 0 256px!important') && styles.includes('flex-shrink:0!important') && styles.includes('min-width:256px!important')],
  ['Fechado: largura estrita 72px mesmo após regrinhas antigas',
    styles.includes('flex:0 0 72px!important') && styles.includes('min-width:72px!important') && styles.includes('max-width:72px!important')],
  ['Fechado: título de seção e rótulos desaparecem com !important',
    styles.includes('.bo-h764-section-heading > span,') && styles.includes('.bo-h764-item-label,') && styles.includes('display:none!important')],
  ['Fechado: a marca do serviço permanece visível e botão expandir funciona',
    styles.includes('.bo-h764-brand-symbol') && styles.includes('.bo-h764-collapse-button') && styles.includes('display:grid!important')],
  ['Fechado: links ficam centralizados com ícones apenas',
    styles.includes('justify-content:center!important') && styles.includes('width:19px!important')],
  ['Fechado: menu não quebra textos em múltiplas linhas',
    styles.includes('overflow:hidden!important') && styles.includes('white-space:nowrap!important')],
  ['Expandido: labels voltam sem quebras',
    styles.includes('data-sidebar-collapsed="0"') && styles.includes('display:block!important')],
  ['Celular: gaveta abre em 256px com labels',
    styles.includes('@media(max-width:767px)') && styles.includes('position:fixed!important') && styles.includes('.bo-h764-item-label{')],
  ['Não foi criado um segundo aside',
    (sidebar.match(/<aside\b/g) || []).length === 1 && app.includes('<NativeAnimatedSidebarH764')],
  ['Mantidas as rotas canônicas de projetos, Whiteboard e Personas',
    app.includes("openGlobalHome('projects')") && app.includes("openServiceWorkspaceTab('whiteboard')") && app.includes("personas:'personas'")],
  ['A biblioteca de Personas não foi substituída pelo mock do anexo',
    !persona.includes('bo-h765-personas') && persona.includes('listContextEntities(graph,') && !persona.includes('Maria da Silva')],
  ['Não há dependência do sidebar CSS legado H7.63',
    !rootStyle.includes("animated-saas-sidebar-h763.css") && !sidebar.includes('bo1205h3-sidebar')],
  ['A regra anterior H7.64 permanece apenas como base (sem trocar a navegação)',
    h764.includes('.bo-h764-sidebar.is-collapsed') && styles.includes('data-sidebar-collapsed="1"')],
];
let passed=0;
for(const [label,valid] of checks){console.log((valid?'OK ':'FAIL ')+label);if(valid)passed++;}
console.log('H7.65 Sidebar Collapse: '+passed+'/'+checks.length+' PASS');
assert.equal(passed,checks.length);

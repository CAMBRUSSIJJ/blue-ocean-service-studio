import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const app = read('src/App.tsx');
const replacement = read('src/components/NativeAnimatedSidebarH764.tsx');
const css = read('src/components/native-animated-sidebar-h764.css');
const style = read('src/style.css');
const pkg = JSON.parse(read('package.json'));
const checks = [
 ['O App monta somente o componente novo', app.includes('<NativeAnimatedSidebarH764') && !app.includes('<aside data-bo-precision-sidebar-native')],
 ['A marcação antiga da sidebar foi eliminada', !app.includes('bo-h701-sidebar-nav') && !app.includes('bo1205h3-sidebar') && !app.includes('rt182-host-sidebar')],
 ['O estilo H7.63 foi excluído, não sobreposto', !existsSync('src/runtime/animated-saas-sidebar-h763.css') && !style.includes('animated-saas-sidebar-h763.css')],
 ['A folha H7.64 é a única nova camada de sidebar', style.includes("@import './components/native-animated-sidebar-h764.css'") && !replacement.includes("import './native-animated-sidebar-h764.css'")],
 ['O novo componente contém um único aside real', (replacement.match(/<aside\b/g) || []).length === 1 && replacement.includes('data-native-sidebar-replacement="true"')],
 ['As três seções seguem a referência enviada', ["'design', title: 'Desenho do serviço'", "'context', title: 'Público-alvo'", "'management', title: 'Gestão'"].every(x=>replacement.includes(x))],
 ['Links principais correspondem à referência', ['servico','maps','personas','pains','projects','archive'].every(x=>replacement.includes("id: '"+x+"'"))],
 ['Ferramentas adicionais ficam atrás de uma expansão', replacement.includes('extraOpen') && replacement.includes('Outras ferramentas') && replacement.includes('setExtraOpen(value => !value)')],
 ['As rotas são canônicas e não páginas fictícias', app.includes('const navigateSidebar = (key: SidebarNavKeyH764)') && app.includes("openServiceWorkspaceTab('whiteboard')") && app.includes("openPrimaryLibraryPage(")],
 ['A biblioteca de projetos e switcher utilizam projetos reais', replacement.includes('projects.slice(0, 12).map') && app.includes('studio.openWorkspaceProject(id)')],
 ['Configurações permanece no rodapé', replacement.includes('bo-h764-sidebar-footer') && replacement.includes("id:'settings'") && app.includes("openExternal('settings', 'unifiedWorkspaces')")],
 ['O novo componente usa o estado persistido de recolhimento', app.includes("localStorage.getItem('bo-sidebar-collapsed')") && app.includes("localStorage.setItem('bo-sidebar-collapsed'") && replacement.includes("data-sidebar-collapsed={collapsed ? '1' : '0'}")],
 ['Seções podem ser recolhidas sem perder os ícones', replacement.includes('onToggleSection(section.id)') && replacement.includes('hidden={sectionHidden}') && css.includes('.bo-h764-section-items[hidden]')],
 ['A seleção é calculada pelas rotas reais', replacement.includes('aria-current={active ?') && app.includes('const sidebarActiveKey: SidebarNavKeyH764')],
 ['A visualização mudou de fato (não apenas CSS)', !replacement.includes('bo-h701-sidebar-wave') && !replacement.includes('bo1163-service-context') && !replacement.includes('bo-h701-nav-section')],
 ['Imagem de serviço fictício não foi introduzida', !replacement.includes('Lavanderia') && !replacement.includes('Nenhum dado encontrado')],
 ['Larguras do layout e JS concordam', app.includes('isSidebarCollapsed ? 76 : 260') && css.includes('flex:0 0 260px') && css.includes('flex-basis:76px')],
 ['Responsividade e redução de animações', css.includes('@media(max-width:767px)') && css.includes('body.bo1175-mobile-nav-open') && css.includes('@media(prefers-reduced-motion:reduce)')],
 ['CSS não depende de classes antigas', !css.includes('bo-h701-sidebar-nav') && !css.includes('bo1205h3-sidebar') && css.includes('.bo-h764-sidebar')],
 ['O teste de substituição faz parte do QA', pkg.scripts.qa.includes('sidebar:replacement:smoke')],
];
let passed=0;
for (const [name,valid] of checks){console.log((valid?'OK ':'FAIL ')+name);if(valid)passed++;}
console.log('H7.64 Sidebar Full Replacement: '+passed+'/'+checks.length+' PASS');
assert.equal(passed,checks.length);

import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const dashboard = read('src/views/WorkspaceDashboardView.tsx');
const css = read('src/runtime/brand-experience-h712.css');
const style = read('src/style.css');
const app = read('src/App.tsx');
const pkg = JSON.parse(read('package.json'));
let ok = 0; let fail = 0;
function check(condition, label) { if (condition) { console.log('OK  ', label); ok += 1; } else { console.log('FAIL', label); fail += 1; } }

check(dashboard.includes('data-brand-experience="7.12"'), 'Dashboard declara Brand Experience H7.12');
check(dashboard.includes('data-bo-dashboard-version="7.0"'), 'contrato estrutural H7.0 preservado');
check(dashboard.includes('Nova jornada') && dashboard.includes('Nova persona') && dashboard.includes('Nova métrica'), 'ações rápidas originais preservadas');
check(dashboard.includes('MAPA') && dashboard.includes('CONTEXTO') && dashboard.includes('RESULTADO'), 'ações rápidas ganharam linguagem de produto');
check(dashboard.includes('Mapear a experiência') && dashboard.includes('Entender para quem desenhamos') && dashboard.includes('Medir o que realmente mudou'), 'ações rápidas explicam propósito');
check(dashboard.includes('Recentes de') && dashboard.includes('Favoritos de') && dashboard.includes('Aprender'), 'hierarquia principal da Home preservada');
check(dashboard.includes('bo1207-recent-meta') && dashboard.includes('bo1207-recent-detail'), 'Recentes expõem metadados do artefato');
check(dashboard.includes("data-artifact-type={item.type}"), 'cards recentes carregam tipo semântico');
check(dashboard.includes('CONTINUE DE ONDE PAROU') && dashboard.includes('data-h712-continuity="1"'), 'continuidade do trabalho adicionada');
check(dashboard.includes('SINAIS DO SERVIÇO') && dashboard.includes('validatedProblemCount'), 'Home mostra sinais reais do Service Graph');
check(dashboard.includes('SERVICE BLUEPRINT') && dashboard.includes('WHITEBOARD'), 'próximo passo reconhece ferramentas de desenho');
check(dashboard.includes("new CustomEvent('bo-open-context-page'"), 'próximo passo usa coordenador canônico da Context Library');
check(dashboard.includes('blueprintBoards.length === 0') && dashboard.includes('freeBoards.length === 0'), 'recomendação deriva do estado real do workspace');
check(css.includes('--bo-h712-blue:#2563eb') && css.includes('--bo-h712-violet:#7657d6') && css.includes('--bo-h712-teal:#087f73'), 'paleta semântica H7.12 definida');
check(css.includes('.bo1207-action-card[data-kind="journey"]') && css.includes('.bo1207-action-card[data-kind="persona"]') && css.includes('.bo1207-action-card[data-kind="metric"]'), 'ações rápidas têm identidade semântica');
check(css.includes('.bo1207-recent-preview[data-type="Journey"]') && css.includes('.bo1207-recent-preview[data-type="Blueprint"]') && css.includes('.bo1207-recent-preview[data-type="Whiteboard"]'), 'thumbnails diferenciam Journey, Blueprint e Whiteboard');
check(css.includes('.bo1207-continuity-card') && css.includes('.bo1207-service-signals'), 'camada de continuidade possui layout próprio');
check(css.includes('[data-sidebar-section="design"]') && css.includes('[data-sidebar-section="context"]') && css.includes('[data-sidebar-section="management"]'), 'sidebar recebe assinatura por domínio sem mudar IA');
check(css.includes('.bo1187-dashboard-header'), 'header do Dashboard recebe acabamento de marca');
check(css.includes('@media(prefers-reduced-motion:reduce)'), 'Brand Experience respeita reduced motion');
check(style.includes("@import './runtime/brand-experience-h712.css';"), 'CSS H7.12 importado no entrypoint');
check(style.indexOf('brand-experience-h712.css') < style.indexOf('@tailwind base'), 'import H7.12 permanece no bloco inicial');
check(app.includes('data-sidebar-section="design"') && app.includes('data-sidebar-section="context"') && app.includes('data-sidebar-section="management"'), 'sidebar existente continua estruturalmente intacta');
check(pkg.scripts['v1205h712:brand-experience-smoke'], 'script H7.12 registrado');
check(pkg.scripts.qa?.includes('v1205h712:brand-experience-smoke'), 'QA acumulado inclui H7.12');

console.log(`\nH7.12 Brand Experience & Workspace Home 2.0: ${ok} OK / ${fail} FAIL`);
process.exit(fail ? 1 : 0);

import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const exists=(p)=>fs.existsSync(p);
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};
const view=read('src/views/JourneyView.tsx');
const css=read('src/runtime/journey-editor-h723.css');
const controller=read('src/state/useStudioController.ts');
const style=read('src/style.css');
const main=read('src/main.tsx');
const app=read('src/App.tsx');
const preflight=read('preflight-linux.sh');
const pkg=JSON.parse(read('package.json'));

check(css.includes('H7.23 — Journey Editor UX 4.0'),'CSS declara H7.23 Journey Editor UX 4.0');
check(exists('src/runtime/journey-editor-h723.css'),'arquivo CSS H7.23 existe');
check(style.includes("@import './runtime/journey-editor-h723.css';"),'CSS H7.23 importado');
check(style.indexOf('unified-service-blueprint-h722.css') < style.indexOf('journey-editor-h723.css'),'H7.23 sucede H7.22 na cascata');
check(main.includes("'bo-h723'"),'body recebe marker H7.23');
check(app.includes('data-journey-editor-ux="7.23"'),'shell declara H7.23');
check(view.includes('data-journey-editor-ux="4.0"'),'Journey declara Editor UX 4.0');

check(view.includes("['journey', 'Mapa']") && view.includes("['evidence', 'Evidências']") && view.includes("['insights', 'Insights']"),'subnavegação reduzida a Mapa/Evidências/Insights');
check(view.includes('bo-h723-journey-bar'),'cabeçalho compacto existe');
check(view.includes('bo-h723-mini-cover'),'capa compacta preservada no editor');
check(css.includes('.bo-h723-journey-bar{min-height:72px'),'cabeçalho tem altura compacta');
check(css.includes('.bo-h723-subtabs'),'subtabs possuem linguagem própria');

check(view.includes('data-journey-toolbar="compact"'),'toolbar compacta declarada');
check(view.includes('bo-h723-add-stage'),'ação +Etapa é primária');
check(view.includes('Essencial') && view.includes('Detalhado'),'modos Essencial/Detalhado preservados');
check(view.includes('fitJourneyToViewport'),'ação Ajustar à tela existe');
check(view.includes('showMoreTools'),'menu Mais ferramentas existe');
check(view.includes('Linhas visíveis') && view.includes('Largura das etapas'),'ferramentas avançadas migraram para menu');
check(view.includes('Copiar seleção') && view.includes('Duplicar seleção') && view.includes('Excluir seleção'),'ações de seleção ficam contextuais no menu');

check(view.includes("const essentialRows = new Set(['customerAction', 'thoughts', 'emotion', 'touchpoints', 'validatedProblems'])"),'modo Essencial limita lanes principais');
check(view.includes('mapRowVisible'),'visibilidade do mapa respeita modo Essencial/Detalhado');
check(view.includes('visibleMapRowCount'),'menu informa contagem real de lanes');
check(controller.includes('useState(328)'),'largura padrão das etapas é 328px');

check(view.includes('curveHeight = 70'),'curva emocional compacta usa 70px');
check(view.includes('bo-h723-emotion-curve'),'curva emocional H7.23 aplicada');
check(css.includes('.bo-h723-emotion-curve{height:70px'),'CSS compacta curva emocional');
check(view.includes('revealStageOnMap(stage.id)'),'curva emocional navega até etapa real');

check(view.includes('bo-h723-stage-index'),'etapas possuem numeração visual');
check(view.includes('% estruturada'),'etapa mostra maturidade legível');
check(view.includes('bo-h723-stage-hover-actions'),'controles de etapa são contextuais');
check(css.includes('.bo-h723-stage-hover-actions{') && css.includes('opacity:.18'),'ações de etapa deixam de dominar cabeçalho');
check(view.includes('bo-h723-stage-signals'),'cabeçalho da etapa expõe sinais');
check(view.includes('Evid.') && view.includes('Problema'),'evidências e problemas aparecem no mapa');
check(css.includes('border-color:transparent!important'),'células reduzem caixas permanentes');

check(css.includes('.bo-h79-row-labels{z-index:14!important'),'H7.23 reforça lane rail mantendo sticky no markup');
check(view.includes('bo-h79-row-labels sticky left-0'),'lanes continuam fixas à esquerda');
check(view.includes('data-journey-minimap="1"'),'minimapa da Journey existe');
check(view.includes('orderedStages.length > 5'),'minimapa aparece em jornadas longas');
check(css.includes('.bo-h723-minimap{position:sticky'),'minimapa permanece acessível durante edição');

check(view.includes('bo-h723-inspector-summary'),'Inspector ganhou resumo executivo');
check(view.includes('selectedEvidence.size') && view.includes('selectedValidatedProblems.size'),'Inspector usa vínculos canônicos da etapa');
check(view.includes('selectedStage.touchpointIds.length') && view.includes('selectedStage.opportunityIds.length'),'Inspector resume touchpoints e oportunidades reais');
check(css.includes('.bo-h79-inspector{width:390px'),'Inspector ocupa menos canvas');

check(view.includes('data-journey-cover-system="7.18-H1"'),'Journey Cover preservado');
check(view.includes('prepareBlueprintFromJourney'),'Journey → Blueprint preservado');
check(view.includes('buildJourneyMapReport'),'Journey Health/relatório canônico preservado');
check(Boolean(pkg.scripts['v1205h723:journey-editor-ux-smoke']),'script H7.23 registrado');
check(pkg.scripts.qa?.includes('v1205h723:journey-editor-ux-smoke'),'QA acumulado inclui H7.23');
check(preflight.includes('journey-editor-h723.css') && preflight.includes('v1205h723-journey-editor-ux-smoke.mjs'),'preflight conhece H7.23');

console.log(`\nH7.23 Journey Editor UX 4.0: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

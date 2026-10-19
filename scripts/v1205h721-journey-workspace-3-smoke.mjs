import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const exists=(p)=>fs.existsSync(p);
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};
const view=read('src/views/JourneyView.tsx');
const css=read('src/runtime/journey-workspace-h721.css');
const home=read('src/runtime/journey-home.js');
const studio=read('src/services/journey-map-studio.ts');
const model=read('src/domain/model.ts');
const style=read('src/style.css');
const main=read('src/main.tsx');
const app=read('src/App.tsx');
const preflight=read('preflight-linux.sh');
const pkg=JSON.parse(read('package.json'));

check(css.includes('H7.21 — Journey Workspace 3.0'),'CSS declara H7.21 Journey Workspace 3.0');
check(view.includes('data-journey-workspace="3.0"'),'editor declara workspace 3.0');
check(app.includes('data-journey-workspace="7.21"'),'shell declara H7.21');
check(main.includes("'bo-h721'"),'body recebe marker H7.21');
check(style.includes("@import './runtime/journey-workspace-h721.css';"),'CSS H7.21 importado');
check(style.indexOf('dashboard-recovery-h720h1.css') < style.indexOf('journey-workspace-h721.css'),'H7.21 sucede H7.20-H1 na cascata');
check(exists('src/runtime/journey-workspace-h721.css'),'arquivo CSS H7.21 existe');

check(view.includes("useState<'overview' | 'journey' | 'evidence' | 'insights'>('journey')"),'estado das quatro visões existe');
check(view.includes('Visão geral') && view.includes('Evidências') && view.includes('Insights'),'tabs principais existem');
check(view.includes('bo-h721-journey-hero'),'hero proprietário da Journey existe');
check(view.includes('journeyCoverSrc(journey)'),'hero usa capa canônica da Journey');
check(view.includes('Alterar capa'),'ação de alteração de capa preservada');
check(view.includes('data-journey-cover-system="7.18-H1"'),'contrato Journey Cover preservado');
check(view.includes('toggleJourneyFavorite'),'favorito pode ser alterado no workspace');
check(view.includes('Responsável') && view.includes('Touchpoints'),'hero expõe owner e sinais da Journey');
check(view.includes('journeyStatusLabel') && view.includes('journeyUpdatedLabel'),'status e atualização são derivados de dados reais');

check(view.includes('bo-h721-overview-panel'),'Visão geral possui superfície própria');
check(view.includes('JOURNEY HEALTH') && view.includes('QUALIDADE DA JORNADA'),'Journey Health novo preserva contrato H7.9');
check(view.includes('SEQUÊNCIA DA EXPERIÊNCIA'),'overview apresenta sequência das etapas');
check(view.includes('setSelectedStageId(stage.id)'),'etapa da visão geral abre etapa real');

check(view.includes('data-emotion-curve="1"'),'curva emocional possui marker');
check(view.includes('curvePoints'),'curva emocional deriva dos estágios');
check(view.includes("stage.emotion === 'positive'") && view.includes("stage.emotion === 'negative'"),'curva usa emoção canônica da etapa');
check(css.includes('.bo-h721-emotion-curve'),'curva emocional possui linguagem visual H7.21');
check(css.includes('.bo-h721-emotion-node.is-positive') && css.includes('.bo-h721-emotion-node.is-negative'),'estados emocionais possuem estilos distintos');

check(view.includes('bo-h721-evidence-panel'),'aba Evidências possui superfície própria');
check(view.includes('item.evidenceIds.map'),'aba Evidências usa vínculos canônicos');
check(view.includes('graph.entities?.evidence?.[id]'),'evidência é resolvida no graph, sem cópia inventada');
check(view.includes('item.validatedProblemIds.length'),'problemas validados são derivados da etapa');
check(view.includes('item.touchpointCount'),'touchpoints são derivados do relatório');

check(view.includes('bo-h721-insights-panel'),'aba Insights possui superfície própria');
check(view.includes('Diagnóstico determinístico'),'interface declara diagnóstico determinístico');
check(view.includes('item.gaps.map'),'insights usam gaps calculados');
check(view.includes('momentStages'),'momentos da verdade derivam do relatório');
check(view.includes('report?.readyForBlueprint'),'prontidão de Blueprint continua determinística');
check(view.includes('report?.blueprintBlockers[0]'),'próximo movimento usa blocker real');

check(home.includes('BLUE OCEAN · JOURNEY WORKSPACE'),'biblioteca recebe identidade Journey Workspace');
check(home.includes('bo-h721-library-card'),'cards da biblioteca usam componente H7.21');
check(home.includes('bo-h721-library-cover'),'cards usam capa visual da Journey');
check(home.includes("const defaultJourneyCover='/journey-cover-blue-ocean-h718h1.svg'"),'biblioteca mantém fallback oficial de capa');
check(home.includes('bo-h721-create-cover'),'criação mostra preview de capa');
check(home.includes('A Journey nasce com esta capa'),'novo artefato comunica capa padrão');
check(css.includes('.bo-h721-library-cover>img'),'capa da biblioteca usa imagem real');

check(model.includes('coverImage?: string'),'modelo de Journey preserva coverImage');
check(studio.includes('buildJourneyMapReport'),'engine Journey Maps 2.0 permanece presente');
check(preflight.includes('journey-workspace-h721.css') && preflight.includes('v1205h721-journey-workspace-3-smoke.mjs'),'preflight conhece H7.21');
check(Boolean(pkg.scripts['v1205h721:journey-workspace-3-smoke']),'script H7.21 registrado');
check(pkg.scripts.qa?.includes('v1205h721:journey-workspace-3-smoke'),'QA acumulado inclui H7.21');

console.log(`\nH7.21 Journey Workspace 3.0: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

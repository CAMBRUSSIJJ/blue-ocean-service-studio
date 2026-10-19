import fs from 'node:fs';

let okCount = 0;
let failCount = 0;
const check = (label, condition) => {
  if (condition) { console.log(`OK   ${label}`); okCount += 1; }
  else { console.log(`FAIL ${label}`); failCount += 1; }
};
const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);

const componentPath = 'src/components/ServiceUsageRelations.tsx';
const navPath = 'src/services/service-object-navigation.ts';
const indexPath = 'src/services/service-model-index.ts';
const cssPath = 'src/runtime/usage-relations-h740h152.css';
const component = read(componentPath);
const nav = read(navPath);
const index = read(indexPath);
const css = read(cssPath);
const app = read('src/App.tsx');
const style = read('src/style.css');
const blueprint = read('src/views/BlueprintWorkspaceView.tsx');
const pkg = JSON.parse(read('package.json'));
const preflight = read('preflight-linux.sh');
const changelog = read('CHANGELOG.md');

check('componente compartilhado existe', exists(componentPath));
check('navegação universal existe', exists(navPath));
check('Service Model Index H15 permanece', exists(indexPath));
check('CSS H15.2 existe', exists(cssPath));
check('componente usa serviceModelIndex', component.includes('serviceModelIndex(graph)'));
check('componente usa relationsFor', component.includes('relationsFor(index, kind, id)'));
check('componente usa usageFor', component.includes('usageFor(index, kind, id)'));
check('componente resolve objeto canônico', component.includes('resolveObject(index, kind, id)'));
check('componente expõe ServiceObjectReference', component.includes('export function ServiceObjectReference'));
check('componente marca H15.2', component.includes('data-usage-relations-h152="1"'));
check('painel separa Utilizado em', component.includes('Utilizado em'));
check('painel separa Relacionado a', component.includes('Relacionado a'));
check('painel agrupa Pessoas', component.includes("people: 'Pessoas'"));
check('painel agrupa Descoberta', component.includes("discovery: 'Descoberta'"));
check('painel agrupa Design', component.includes("design: 'Design'"));
check('painel agrupa Melhoria', component.includes("improvement: 'Melhoria'"));
check('painel agrupa Gestão', component.includes("measurement: 'Gestão'"));
check('painel possui empty state de uso', component.includes('Ainda não há usos detectados'));
check('painel possui empty state de relações', component.includes('Ainda não há relações semânticas'));
check('referências respeitam navegabilidade', component.includes('canOpenServiceObject'));
check('referências chamam openServiceObject', component.includes('openServiceObject(node.kind, node.id)'));

check('navegação mapeia Persona', nav.includes("persona: 'personas'"));
check('navegação mapeia Necessidade', nav.includes("need: 'needs'"));
check('navegação mapeia Dor', nav.includes("pain: 'pains'"));
check('navegação mapeia Problema validado', nav.includes("validatedProblem: 'problems'"));
check('navegação mapeia Evidência', nav.includes("evidence: 'evidence'"));
check('navegação mapeia Ator para Ecologia', nav.includes("actor: 'ecology'"));
check('navegação mapeia Touchpoint para Canais', nav.includes("touchpoint: 'channels'"));
check('navegação mapeia Iniciativa para Portfolio', nav.includes("initiative: 'portfolio'"));
check('navegação mapeia Métrica para Outcomes', nav.includes("metric: 'outcomes'"));
check('navegação persiste foco em sessionStorage', nav.includes("bo-service-object-focus"));
check('navegação reutiliza bo-open-context-page', nav.includes("bo-open-context-page"));
check('navegação reutiliza bo-service-workspace-tab', nav.includes("bo-service-workspace-tab"));
check('navegação não cria nova rota global', !nav.includes('history.pushState') && !nav.includes('location.href'));

const contextViews = [
  ['Persona', 'src/views/PersonasView.tsx', 'kind="persona"'],
  ['Necessidade', 'src/views/NeedsView.tsx', 'kind="need"'],
  ['Job', 'src/views/JobsView.tsx', 'kind="job"'],
  ['Dor', 'src/views/PainsView.tsx', 'kind="pain"'],
  ['Hipótese', 'src/views/HypothesesView.tsx', 'kind="hypothesis"'],
  ['Problema', 'src/views/ProblemsView.tsx', 'kind="validatedProblem"'],
  ['Evidência', 'src/views/EvidenceView.tsx', 'kind="evidence"'],
];
for (const [label, file, kindNeedle] of contextViews) {
  const text = read(file);
  check(`${label} integra painel compartilhado`, text.includes('ServiceUsageRelations') && text.includes(kindNeedle));
  check(`${label} aceita foco universal`, text.includes('bo-service-object-focus'));
}

const ecology = read('src/views/ServiceEcologyView.tsx');
check('Ecologia integra Ator', ecology.includes('ServiceUsageRelations') && ecology.includes('kind="actor"'));
check('Ecologia aceita foco em Ator', ecology.includes("detail.kind !== 'actor'"));
const channel = read('src/views/ChannelContinuityView.tsx');
check('Canais integra Touchpoint', channel.includes('ServiceUsageRelations') && channel.includes('kind="touchpoint"'));
check('Touchpoint possui seleção acessível', channel.includes('bo-h152-touchpoint-open'));
const portfolio = read('src/views/ImprovementPortfolioView.tsx');
check('Portfolio integra Iniciativa', portfolio.includes('ServiceUsageRelations') && portfolio.includes('kind="initiative"'));
check('Portfolio aceita foco em Iniciativa', portfolio.includes("detail.kind !== 'initiative'"));
const outcomes = read('src/views/ServiceOutcomesView.tsx');
check('Outcomes integra Métrica', outcomes.includes('ServiceUsageRelations') && outcomes.includes('kind="metric"'));
check('Outcomes aceita foco em Métrica', outcomes.includes("detail.kind !== 'metric'"));
check('Blueprint Workspace aceita foco universal', blueprint.includes('bo-service-object-focus'));
check('Blueprint Workspace reconhece Journey', blueprint.includes("detail.kind === 'journey'"));
check('Blueprint Workspace reconhece Blueprint', blueprint.includes("detail.kind === 'blueprint'"));

check('App publica marker H15.2', app.includes('data-usage-relations="7.40-H15.2"'));
check('Blueprint publica marker H15.2', blueprint.includes('data-usage-relations="7.40-H15.2"'));
check('CSS fornece foco visível', css.includes(':focus-visible'));
check('CSS fornece target mínimo 44px', css.includes('min-height:44px') || css.includes('min-height: 44px'));
check('CSS fornece target touch 48px', css.includes('@media(pointer:coarse)') && css.includes('min-height:48px'));
check('CSS possui responsividade', css.includes('@media(max-width:900px)'));
check('style importa H15.2', style.includes("@import './runtime/usage-relations-h740h152.css'"));
check('CSS H15.2 vem depois de H14', style.indexOf('usage-relations-h740h152.css') > style.indexOf('interaction-accessibility-polish-h740h14.css'));

check('Service Model Index continua read-only', !index.includes('localStorage.setItem') && !index.includes('sessionStorage.setItem'));
check('H15.2 não cria entidade duplicada ServicePersona', !component.includes('ServicePersona') && !nav.includes('ServicePersona'));
check('H15.2 não cria seção global Elementos do serviço', !app.includes('>Elementos do serviço<'));
check('metadata preserva H15.2 no histórico', String(pkg.description || '').includes('V1.20.5-H7.40-H15.2 Usage & Relations'));
check('package registra smoke H15.2', Boolean(pkg.scripts?.['v1205h740h152:usage-relations-smoke']));
check('QA acumulado inclui H15.2', String(pkg.scripts?.qa || '').includes('v1205h740h152:usage-relations-smoke'));
check('preflight inclui H15.2', preflight.includes('v1205h740h152-usage-relations-smoke.mjs'));
check('changelog registra H15.2', changelog.includes('# V1.20.5-H7.40-H15.2 — Usage & Relations'));

console.log(`\nH7.40-H15.2 Usage & Relations: ${okCount}/${okCount + failCount} PASS`);
if (failCount) process.exit(1);

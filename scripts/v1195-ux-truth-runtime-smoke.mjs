import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const pkg = JSON.parse(read('package.json'));
const home = read('src/views/WorkspaceHome.tsx');
const boards = read('src/views/WhiteboardsView.tsx');
const core = read('src/runtime/whiteboard-core.js');
const runtimeHome = read('src/runtime/workspace-home.js');
const controller = read('src/state/useStudioController.ts');
const app = read('src/App.tsx');
const style = read('src/style.css');
const css = read('src/runtime/service-project-home.css');

let ok = 0, fail = 0;
const t = (name, cond) => {
  if (cond) { ok++; console.log(`OK   ${name}`); }
  else { fail++; console.error(`FAIL ${name}`); }
};

const [maj,min,patch] = pkg.version.split('.').map(Number);
t('versão V1.19.5 ou superior', maj > 1 || (maj === 1 && (min > 19 || (min === 19 && patch >= 5))));
t('Service Project Home existe', home.includes('data-service-project-home="1"'));
t('fase ENTENDER existe', home.includes('01') && home.includes('ENTENDER'));
t('fase DEFINIR existe', home.includes('DEFINIR'));
t('fase DESENHAR existe', home.includes('DESENHAR'));
t('fase VALIDAR existe', home.includes('VALIDAR'));
t('fase MELHORAR existe', home.includes('MELHORAR'));
t('Discovery mede Persona', home.includes('personas.length'));
t('Discovery mede necessidade', home.includes('needs.length'));
t('Discovery mede problema/hipótese', home.includes('discoveryProblemCount'));
t('Discovery mede evidência', home.includes('evidenceCount'));
t('Discovery readiness exige Persona + Problema', home.includes('serviceProjectReport.discoveryReady') && read('src/services/service-project.ts').includes('personas > 0 && hypothesisProblems + stagedProblems > 0'));
t('criação de hipótese pré-Journey existe', home.includes("type: discoveryCreate") && home.includes("problemHypothesis"));
t('runtime createProblem suporta problemHypothesis sem etapa', runtimeHome.includes("uid('problemHypothesis')") && runtimeHome.includes("status:'hypothesis'"));
t('Whiteboards não carrega montagem estruturada; Service Frame pertence a Blueprints', !boards.includes('discoveryReady') && boards.includes('Ir para Blueprints'));
t('Whiteboards continua permitindo quadro livre', boards.includes('Novo whiteboard') || boards.includes('Criar quadro vazio'));
t('Whiteboards orienta desenho estruturado para Blueprints', boards.includes('Ir para Blueprints') && boards.includes("setActiveTab('canvas')"));
t('modal gigante Preparar o serviço foi removido', !core.includes("modalShell('Preparar o serviço'"));
t('API legada showServiceRecipe redireciona para contexto', core.includes('function showServiceRecipe(){') && core.includes('openServiceContextHome()'));
t('ação Contexto do serviço existe', core.includes('Contexto do serviço'));
t('builder estruturado exige Discovery quando serviço está vazio', core.includes('Antes de montar o serviço, registre ao menos 1 Persona e 1 Problema/Hipótese'));
t('empty Whiteboard permits a first idea without mandatory context', core.includes('Qual é a primeira ideia?') && core.includes("btn('Adicionar post-it'"));
t('copy técnica antiga de exclusão foi removida', !core.includes('representação(ões) visuais'));
t('copy de exclusão explica remoção do quadro', core.includes('será removido permanentemente'));
t('create service orienta Discovery primeiro', controller.includes('cliente, necessidade e problema'));
t('global create menu traz Persona', app.includes('Persona'));
t('criação de Problema migrou para página própria do Workspace', app.includes('WorkspaceLibraryView') && app.includes("libraryPage") && app.includes("'problems'"));
t('global runtime create menu traz Problema / hipótese', runtimeHome.includes('Problema / hipótese'));
t('CSS Service Project está importado', style.includes("service-project-home.css"));
t('CSS Service Project contém surface principal', css.includes('.bo1195-service-project'));
t('CSS inclui Discovery grid', css.includes('.bo1195-discovery-grid'));
t('CSS inclui readiness gate', css.includes('.bo1195-discovery-gate'));
t('UX Truth surface marker existe', home.includes('data-ux-truth-surface="service-home"'));
t('UI antiga Service Recipe não permanece no Workspace Home', !home.includes('SERVICE RECIPE'));
t('Whiteboard não abre modal Recipe antigo', !core.includes('INGREDIENTES RECOMENDADOS'));

console.log(`\nV1.19.5 UX Truth smoke: ${ok} OK / ${fail} FAIL`);
if (fail) process.exit(1);

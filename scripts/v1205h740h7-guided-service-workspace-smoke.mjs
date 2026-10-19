import fs from 'node:fs';
import { buildGuidedWorkspaceRecommendation } from '../src/services/guided-service-workspace.ts';
const read=(p)=>fs.readFileSync(p,'utf8');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const engine=read('src/services/guided-service-workspace.ts');
const css=read('src/runtime/guided-service-workspace-h740h7.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const base={
 researchReady:false,ecologyReady:false,propositionReady:false,journeys:0,channels:0,channelCoverage:0,blueprints:0,whiteboards:0,whiteboardObjects:0,
 prototypes:0,learnings:0,decisions:0,currentFutureReady:false,prioritizedProblems:0,initiatives:0,outcomesReady:false,
 governanceCoverage:0,governanceOverdue:0,governancePendingApproval:0,operationsCoverage:0,operationsErrors:0,
};
const blueprintCase=buildGuidedWorkspaceRecommendation({...base,researchReady:false,journeys:2,channels:4,channelCoverage:67,whiteboards:1,whiteboardObjects:0});
const researchCase=buildGuidedWorkspaceRecommendation({...base});
const prototypeCase=buildGuidedWorkspaceRecommendation({...base,researchReady:true,ecologyReady:true,propositionReady:true,journeys:1,channels:3,channelCoverage:100,blueprints:1,whiteboards:1,whiteboardObjects:4});
const outcomeCase=buildGuidedWorkspaceRecommendation({...base,researchReady:true,ecologyReady:true,propositionReady:true,journeys:1,channels:3,channelCoverage:100,blueprints:1,whiteboards:1,whiteboardObjects:4,prototypes:1,learnings:1,decisions:1,currentFutureReady:true,prioritizedProblems:2,initiatives:1});
const checks=[
 [engine.includes('buildGuidedWorkspaceRecommendation'),'Guidance Engine exportado'],
 [engine.includes('When')===false && engine.includes('Math.random')===false,'Guidance não usa aleatoriedade'],
 [blueprintCase.target==='blueprint','Journeys + canais sem Blueprint recomenda Blueprint'],
 [blueprintCase.phase==='design','Blueprint cai na fase Projetar'],
 [blueprintCase.alternatives.some((item)=>item.target==='channels'),'Canal incompleto vira alternativa contextual'],
 [blueprintCase.alternatives.some((item)=>item.target==='whiteboard'),'Whiteboard vazio vira alternativa contextual'],
 [researchCase.target==='research','Serviço vazio começa por Pesquisa'],
 [prototypeCase.target==='prototypes','Serviço desenhado avança para Protótipos'],
 [outcomeCase.target==='outcomes','Iniciativa sem outcomes avança para Resultados'],
 [workspace.includes('data-guided-service-workspace="7.40-H7"'),'Workspace marca H7.40-H7'],
 [workspace.includes('PRÓXIMO PASSO RECOMENDADO'),'Hero mostra próximo passo'],
 [workspace.includes('Estruturação do serviço'),'Maturidade renomeada para Estruturação'],
 [workspace.includes('de 16 capacidades estruturadas'),'UI explica 16 capacidades'],
 [workspace.includes('bo-h740h7-meter'),'Estruturação usa barra de progresso'],
 [workspace.includes('bo-h740h7-metrics-details'),'KPIs ficam recolhíveis'],
 [!workspace.includes('Continue de onde parou'),'Visão geral sem retomar redundante'],
 [workspace.includes('bo-h740h7-stepper'),'Caminho usa stepper'],
 [workspace.includes('Construa o serviço na ordem certa'),'Copy do caminho é orientada à ação'],
 [workspace.includes('bo-h740h7-capability-panel'),'Capacidades usam rows/painel'],
 [workspace.includes("stateLabel: 'Estruturado'") || workspace.includes("stateLabel: 'Leitura derivada'"),'Estados semânticos definidos'],
 [workspace.includes("state: 'derived'"),'Cockpit/Prontidão não contam como capacidade estrutural'],
 [workspace.includes('bo-h740h7-compact-head'),'Ferramentas usam header compacto'],
 [workspace.includes('bo-h740h7-tool-phases'),'Ferramentas mantêm navegação por fase compacta'],
 [workspace.includes('executeGuidedTarget'),'CTAs de guidance navegam para alvo real'],
 [workspace.includes("target === 'journey' && journeys.length === 0"),'CTA da Journey abre criação quando necessário'],
 [css.includes('grid-template-columns:minmax(0,1.08fr) minmax(340px,.92fr)'),'Hero desktop tem duas colunas'],
 [css.includes('.bo-h740h7-stepper{display:grid;grid-template-columns:repeat(5'),'Stepper tem cinco fases'],
 [css.includes('grid-template-columns:minmax(0,1fr) minmax(145px,190px) auto'),'Capability row reserva métrica e CTA'],
 [css.includes('.bo-h740h7-compact-head'),'CSS de header compacto presente'],
 [css.includes('@media(max-width:820px)') && css.includes('@media(max-width:560px)'),'Guided Workspace é responsivo'],
 [style.includes("guided-service-workspace-h740h7.css"),'CSS H7 importado antes do Tailwind'],
 [style.indexOf('guided-service-workspace-h740h7.css') < style.indexOf('@tailwind base'),'Import H7 respeita ordem CSS'],
 [main.includes("'bo-h740h7'"),'Host H7 registrado'],
 [pkg.scripts['v1205h740h7:guided-service-workspace-smoke']?.includes('v1205h740h7-guided-service-workspace-smoke.mjs'),'Script H7 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h7:guided-service-workspace-smoke'),'QA acumulado inclui H7'],
 [workspace.includes('workspacePhaseCards') && workspace.includes('capabilities: [\'Pesquisa\', \'Ecologia\', \'Proposição\']'),'Contratos H5 preservados apenas para regressão'],
];
let ok=0,fail=0;for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`);pass?ok++:fail++;}
console.log(`\nH7.40-H7 Guided Service Workspace: ${ok}/${ok+fail} PASS`);process.exit(fail?1:0);

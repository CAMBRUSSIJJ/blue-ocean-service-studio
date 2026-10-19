import fs from 'node:fs';
import {
  buildResearchStudioReport, createResearchInsight, createResearchObservation, createResearchProject,
  createResearchSource, promoteObservationToEvidence, promoteResearchInsight, researchTraceRows,
} from '../src/services/research-studio.ts';

const checks=[]; const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const read=(p)=>fs.readFileSync(p,'utf8');
const model=read('src/domain/model.ts');
const schema=read('src/domain/schema.ts');
const service=read('src/services/research-studio.ts');
const view=read('src/views/ResearchStudioView.tsx');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const app=read('src/App.tsx');
const css=read('src/runtime/research-studio-h726.css');
const style=read('src/style.css');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');

ok('modelo define métodos de pesquisa', model.includes("export type ResearchMethod = 'interview'") && model.includes("'service_safari'") && model.includes("'shadowing'"));
ok('modelo define projeto de pesquisa', model.includes('export type ResearchProject = {'));
ok('modelo define observação de pesquisa', model.includes('export type ResearchObservation = {'));
ok('repositório mantém projects e observations', model.includes('projects?: Record<Id, ResearchProject>') && model.includes('observations?: Record<Id, ResearchObservation>'));
ok('schema aceita projetos e observações', schema.includes('researchProject=') && schema.includes('researchObservation='));
ok('schema preserva compatibilidade por default', schema.includes('projects:z.record') && schema.includes('observations:z.record'));

ok('serviço Research Studio existe', fs.existsSync('src/services/research-studio.ts'));
ok('serviço normaliza repositório legado', service.includes('normalizeResearchRepository'));
ok('serviço cria projeto', service.includes('createResearchProject'));
ok('serviço cria material', service.includes('createResearchSource'));
ok('serviço registra observação', service.includes('createResearchObservation'));
ok('observação promove para evidência', service.includes('promoteObservationToEvidence'));
ok('evidência preserva sourceIds e observationIds', service.includes('sourceIds:') && service.includes('observationIds: [observation.id]'));
ok('serviço cria insight sustentado', service.includes('createResearchInsight'));
ok('insight promove para necessidade ou hipótese', service.includes("target: 'need' | 'problemHypothesis'"));
ok('problema não é criado diretamente por insight', !service.includes("target: 'need' | 'problemHypothesis' | 'problem'"));
ok('rastreabilidade é derivada do grafo', service.includes('researchTraceRows'));
ok('report detecta observação não promovida', service.includes('unpromotedObservationIds'));
ok('report detecta insight sem evidência', service.includes('unsupportedInsightIds'));
ok('report mede proveniência incompleta', service.includes('orphanEvidenceIds'));

ok('ResearchStudioView dedicada existe', fs.existsSync('src/views/ResearchStudioView.tsx'));
ok('view expõe marker H7.26', view.includes('data-research-studio="7.26"'));
ok('view mostra pipeline do campo à decisão', ['Material','Observação','Evidência','Insight','Decisão'].every((x)=>view.includes(x)));
ok('view separa o que disseram e observaram', view.includes('O que disseram') || view.includes('OBSERVATION_KIND_LABELS'));
ok('view possui projetos de pesquisa', view.includes('Novo projeto') && view.includes('Qual pergunta estamos tentando responder?'));
ok('view permite criar material', view.includes('Adicionar material'));
ok('view permite registrar observação', view.includes('Registrar observação'));
ok('view promove observação para evidência', view.includes('Transformar em Evidência'));
ok('view exige evidência para insight', view.includes('O Insight precisa de um título e pelo menos uma Evidência'));
ok('view permite necessidade e hipótese', view.includes("promoteInsight(insight.id, 'need')") && view.includes("promoteInsight(insight.id, 'problemHypothesis')"));
ok('view avisa que problema exige hipótese validada', view.includes('Problema somente após validação da Hipótese'));
ok('view mostra rastreabilidade ponta a ponta', view.includes('Material → Observação → Evidência → Insight → Necessidade/Hipótese/Problema'));

ok('Service Workspace incorpora Pesquisa', workspace.includes("type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'journey' | 'blueprint' | 'whiteboard'"));
ok('Pesquisa aparece antes da Ecologia', workspace.indexOf("['research', 'Pesquisa', 'evidence']") < workspace.indexOf("['ecology', 'Ecologia', 'service']"));
ok('Research Studio renderiza no workspace', workspace.includes("workspaceTab === 'research' && <ResearchStudioView"));
ok('readiness passa a cinco perspectivas', workspace.includes('workspaceReadiness}/5'));
ok('overview explica cinco perspectivas', workspace.includes('Um serviço, cinco perspectivas conectadas'));
ok('overview começa pela Pesquisa', workspace.includes("selectWorkspaceTab('research')") && workspace.includes('Colete material antes de interpretar'));
ok('header mostra materiais e observações', workspace.includes('researchReport.counts.material') && workspace.includes('researchReport.counts.observation'));
ok('workspace expõe marker H7.26', workspace.includes('data-research-studio="7.26"'));

ok('Research Studio legado preservado sem navegação principal', !app.includes("openServiceWorkspaceTab('research')") && app.includes('Pesquisa histórica preservada')); 
ok('sidebar Pesquisa deixa de abrir overlay legado', !app.includes("onClick={() => openExternal('research', 'researchWorkspace')}"));
ok('App preserva tab do Service Workspace', app.includes('bo-service-workspace-tab-changed') && app.includes('bo-service-workspace-tab'));
ok('App expõe marker H7.26', app.includes('data-research-studio="7.26"'));

ok('CSS H7.26 existe', fs.existsSync('src/runtime/research-studio-h726.css'));
ok('CSS H7.26 importado após H7.25', style.indexOf('service-ecology-h725.css') < style.indexOf('research-studio-h726.css'));
ok('CSS possui pipeline visual', css.includes('.bo-h726-pipeline'));
ok('CSS possui cards de observação por nível', css.includes('.bo-h726-observation-card.is-said') && css.includes('.bo-h726-observation-card.is-observed'));
ok('CSS possui rastreabilidade', css.includes('.bo-h726-trace'));
ok('CSS possui adaptação responsiva', css.includes('@media(max-width:820px)'));

ok('script H7.26 registrado', Boolean(pkg.scripts['v1205h726:research-studio-smoke']));
ok('QA acumulado inclui H7.26', pkg.scripts.qa?.includes('v1205h726:research-studio-smoke'));
ok('package descreve H7.26', String(pkg.description).includes('H7.26 Research Studio + Insight Pipeline'));
ok('preflight conhece H7.26', preflight.includes('research-studio-h726.css') && preflight.includes('v1205h726-research-studio-smoke.mjs'));

let graph={schemaVersion:3,entities:{},research:{sources:{},projects:{},observations:{},collections:{},createdAt:'2026-10-13T20:00:00.000Z',updatedAt:'2026-10-13T20:00:00.000Z'},views:{whiteboards:{}},service:{id:'svc',name:'Pesquisa Teste',description:'',journeyIds:[],createdAt:'2026-10-13T20:00:00.000Z',updatedAt:'2026-10-13T20:00:00.000Z'},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''}};
let result=createResearchProject({graph,title:'Entender abandono',goal:'Descobrir por que clientes abandonam',methods:['interview'],id:'rp1',now:'2026-10-13T20:00:00.000Z'}); graph=result.graph;
result=createResearchSource({graph,title:'Entrevista 01',type:'interview',projectId:'rp1',participant:'Cliente A',id:'rs1',now:'2026-10-13T20:01:00.000Z'}); graph=result.graph;
let obs=createResearchObservation({graph,text:'Cliente perguntou três vezes se a coleta estava confirmada.',kind:'observed',projectId:'rp1',sourceId:'rs1',id:'ro1',now:'2026-10-13T20:02:00.000Z'}); graph=obs.graph;
let ev=promoteObservationToEvidence({graph,observationId:'ro1',title:'Incerteza na confirmação',now:'2026-10-13T20:03:00.000Z'}); graph=ev.graph;
let ins=createResearchInsight({graph,title:'Confirmação reduz ansiedade',description:'A falta de confirmação mantém o cliente inseguro.',evidenceIds:[ev.evidenceId],id:'ri1',now:'2026-10-13T20:04:00.000Z'}); graph=ins.graph;
let promoted=promoteResearchInsight({graph,insightId:'ri1',target:'problemHypothesis',title:'Ausência de confirmação causa insegurança',now:'2026-10-13T20:05:00.000Z'}); graph=promoted.graph;
const report=buildResearchStudioReport(graph); const trace=researchTraceRows(graph);
ok('domínio cria projeto e mantém método', report.projects.length===1 && report.projects[0].methodIds.includes('interview'));
ok('material fica ligado ao projeto', report.projects[0].sourceIds.includes('rs1'));
ok('observação fica ligada ao projeto', report.projects[0].observationIds.includes('ro1'));
ok('promoção preserva fonte e observação', graph.entities.evidence[ev.evidenceId].sourceIds.includes('rs1') && graph.entities.evidence[ev.evidenceId].observationIds.includes('ro1'));
ok('insight preserva evidências', graph.entities.insight.ri1.evidenceIds.includes(ev.evidenceId));
ok('hipótese preserva insight e evidência', graph.entities.problemHypothesis[promoted.entityId].sourceInsightId==='ri1' && graph.entities.problemHypothesis[promoted.entityId].evidenceIds.includes(ev.evidenceId));
ok('rastreabilidade chega à decisão', trace.length===1 && trace[0].source?.id==='rs1' && trace[0].observation?.id==='ro1' && trace[0].insights[0]?.id==='ri1' && trace[0].decisions.some((item)=>item?.kind==='problemHypothesis'));
ok('report fica researchReady com pipeline mínimo', report.researchReady===true && report.traceabilityScore>=80);
ok('observação promovida sai da fila', report.unpromotedObservationIds.length===0);
ok('insight sustentado sai da fila', report.unsupportedInsightIds.length===0);

const failed=checks.filter(([,v])=>!v);
console.log(`\nV1.20.5-H7.26 Research Studio + Insight Pipeline: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

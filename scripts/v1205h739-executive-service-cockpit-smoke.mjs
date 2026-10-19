import fs from 'node:fs';
import { buildExecutiveServiceCockpitReport } from '../src/services/executive-service-cockpit.ts';

const checks=[]; const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const read=(p)=>fs.readFileSync(p,'utf8');
const service=read('src/services/executive-service-cockpit.ts');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const view=read('src/views/ExecutiveServiceCockpitView.tsx');
const css=read('src/runtime/executive-service-cockpit-h739.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');
const changelog=read('CHANGELOG.md');

for(const [label,needle] of [
 ['serviço importa health','buildServiceHealthReport'],['serviço importa backlog','buildImprovementBacklogReport'],['serviço importa portfolio','buildImprovementPortfolioReport'],['serviço importa outcomes','buildServiceOutcomesReport'],['serviço importa governance','buildServiceGovernanceReport'],['serviço importa operations','buildServiceOperationsBridgeReport'],
 ['define seis áreas',"'health' | 'priorities' | 'portfolio' | 'outcomes' | 'governance' | 'operations'"],['define status executivo',"'healthy' | 'attention' | 'critical'"],['define severidades',"'critical' | 'high' | 'medium' | 'low'"],['expõe report','buildExecutiveServiceCockpitReport'],
 ['peso saúde 30',"label: 'Saúde do serviço', score: health.score, weight: 30"],['peso outcomes 20',"label: 'Resultados', score: outcomes.outcomeScore, weight: 20"],['peso governance 15',"label: 'Governança', score: governance.governanceScore, weight: 15"],['peso operations 15',"label: 'Operação conectada', score: operations.healthScore, weight: 15"],['peso portfolio 10',"label: 'Execução da melhoria', score: deliveryScore, weight: 10"],['peso riscos 10',"label: 'Risco & atenção', score: riskControlScore, weight: 10"],
 ['problema vira ação','problem:${item.id}'],['iniciativa vira ação','initiative:${item.id}'],['métrica vira ação','metric:${item.id}'],['sem prova vira ação','proof:${item.id}'],['governança vira ação','governance:${item.id}'],['operação vira ação','operations:${item.id}'],['ações ordenadas por prioridade','actions.sort'],['top risks existe','topRisks'],['strengths existe','strengths'],['weak dimensions existe','weakDimensions'],['next review existe','nextReview'],['summary executivo existe','executiveSummary'],
]) ok(label,service.includes(needle));

for(const [label,needle] of [
 ['workspace importa view',"import { ExecutiveServiceCockpitView } from './ExecutiveServiceCockpitView'"],['workspace importa report','buildExecutiveServiceCockpitReport'],['workspace H7.39 comment','H7.39 adds Executive Service Cockpit'],['WorkspaceTab cockpit',"'overview' | 'cockpit' | 'research'"],['session aceita cockpit',"['overview','cockpit','research'"],['event aceita cockpit',"if (!['overview','cockpit','research'"],['workspace data H7.39','data-executive-service-cockpit="7.39"'],['tab Cockpit existe',"['cockpit', 'Cockpit', 'service']"],['tab mostra score',"id === 'cockpit' ? <em>{executiveReport.executiveScore}%</em>"],['view montada',"workspaceTab === 'cockpit' && <ExecutiveServiceCockpitView"],['overview 17 perspectivas','Um serviço, dezessete perspectivas conectadas'],['legacy 16 preservado','H7.38 legacy contract: Um serviço, dezesseis perspectivas conectadas'],['legacy readiness 16 preservado','H7.38 legacy contract: <b>{workspaceReadiness}/16</b> perspectivas conectadas'],['header mostra saúde executiva','executiveReport.executiveScore'],['header mostra ações','executiveReport.counts.openActions'],
]) ok(label,workspace.includes(needle));

for(const [label,needle] of [
 ['view marker','data-executive-service-cockpit="7.39"'],['hero H7.39','H7.39 · EXECUTIVE SERVICE COCKPIT'],['título saúde executiva','Saúde executiva do serviço'],['KPI problemas','PROBLEMAS ATIVOS'],['KPI iniciativas','INICIATIVAS ATIVAS'],['KPI outcomes','OUTCOMES'],['KPI governance','GOVERNANÇA'],['KPI operação','OPERAÇÃO'],['painel saúde','SAÚDE POR DIMENSÃO'],['painel riscos','RISCOS EXECUTIVOS'],['agenda executiva','AGENDA EXECUTIVA'],['portfolio bottom','Transformação em andamento'],['outcomes bottom','A melhoria está funcionando?'],['navegação evento','bo-service-workspace-tab'],['score executivo usa report','report.executiveScore'],['top risks usa report','report.topRisks'],['top actions usa report','report.topActions'],['sem risco possui empty','Nenhum risco alto detectado'],['agenda limpa possui empty','Agenda executiva limpa'],
]) ok(label,view.includes(needle));

for(const [label,needle] of [
 ['CSS H7.39 existe','.bo-h739{'],['CSS hero','.bo-h739-hero'],['CSS score','.bo-h739-score'],['CSS KPIs','.bo-h739-kpis'],['CSS grid','.bo-h739-grid'],['CSS panels','.bo-h739-panel'],['CSS dimensions','.bo-h739-dimensions'],['CSS bars','.bo-h739-bar'],['CSS risks','.bo-h739-risks'],['CSS actions','.bo-h739-action-list'],['CSS stat row','.bo-h739-stat-row'],['CSS responsive 1100','@media(max-width:1100px)'],['CSS responsive 760','@media(max-width:760px)'],['CSS responsive 520','@media(max-width:520px)'],
]) ok(label,css.includes(needle));
ok('style importa CSS H7.39',style.includes("@import './runtime/executive-service-cockpit-h739.css';"));
ok('CSS H7.39 depois de H7.38',style.indexOf('service-operations-bridge-h738.css')<style.indexOf('executive-service-cockpit-h739.css'));
ok('main recebe host H7.39',main.includes("'bo-h739'"));

const now='2026-10-14T05:00:00.000Z';
const graph={
 schemaVersion:3,persistenceRevision:1,
 entities:{metric:{m1:{id:'m1',type:'metric',serviceId:'s1',title:'NPS',owner:'CX',unit:'pts',direction:'at_least',baseline:40,target:70,value:50},m2:{id:'m2',type:'metric',serviceId:'s1',title:'Tempo de coleta',owner:'Ops',unit:'min',direction:'at_most',baseline:180,target:120,value:160}},persona:{},need:{},benefit:{},evidence:{}},
 service:{id:'s1',name:'Lavanderia Azul',description:'Coleta e entrega',journeyIds:['j1'],createdAt:now,updatedAt:now,
  improvementBacklog:{version:1,problems:{p1:{id:'p1',serviceId:'s1',sourceKey:'manual:p1',sourceRefs:[{kind:'journey',sourceId:'st1',label:'Agendamento'}],sourceActive:true,title:'Cliente repete informações',description:'Handoff perde contexto',impact:5,frequency:5,effort:1,risk:5,urgency:5,status:'accepted',owner:'CX',evidenceIds:[],createdAt:now,updatedAt:now,lastSeenAt:now}},opportunities:{o1:{id:'o1',serviceId:'s1',title:'Continuidade omnichannel',problemIds:['p1'],status:'selected',owner:'CX',createdAt:now,updatedAt:now}},updatedAt:now},
  improvementPortfolio:{version:1,initiatives:{i1:{id:'i1',serviceId:'s1',opportunityId:'o1',title:'Contexto entre canais',problemIds:['p1'],status:'in_progress',owner:'Ops',expectedOutcome:'Reduzir repetição',effort:2,expectedImpact:5,deliveryRisk:'medium',progress:45,targetDate:'2026-10-10',dependencyIds:[],decisionIds:[],experimentIds:[],metricIds:['m1'],createdAt:now,updatedAt:now},i2:{id:'i2',serviceId:'s1',opportunityId:'o1',title:'Confirmação automática',problemIds:['p1'],status:'implemented',owner:'Ops',expectedOutcome:'Reduzir tempo',effort:2,expectedImpact:4,deliveryRisk:'low',progress:100,dependencyIds:[],decisionIds:[],experimentIds:[],metricIds:[],createdAt:now,updatedAt:now,implementedAt:now}},updatedAt:now},
  outcomes:{version:1,bindings:{b1:{id:'b1',serviceId:'s1',metricId:'m1',targetKind:'initiative',targetId:'i1',role:'result',createdAt:now},b2:{id:'b2',serviceId:'s1',metricId:'m2',targetKind:'journey',targetId:'j1',role:'outcome',createdAt:now}},measurements:{r1:{id:'r1',serviceId:'s1',metricId:'m1',value:50,measuredAt:now,createdAt:now},r2:{id:'r2',serviceId:'s1',metricId:'m2',value:160,measuredAt:now,createdAt:now}},updatedAt:now},
  governance:{version:1,records:{'governance:journey:j1':{id:'governance:journey:j1',serviceId:'s1',targetKind:'journey',targetId:'j1',targetLabel:'Coleta',active:true,owner:'CX',accountable:'Diretoria',reviewers:['CX'],cadence:'monthly',nextReviewAt:'2026-10-01',approvalRequired:true,approvalStatus:'pending',createdAt:now,updatedAt:now}},reviews:{},updatedAt:now},
  operationsBridge:{version:1,bindings:{op1:{id:'op1',serviceId:'s1',targetKind:'journey',targetId:'j1',targetLabel:'Coleta',targetActive:true,operationKind:'workflow',provider:'manual',direction:'design_to_ops',syncMode:'manual',status:'error',owner:'Ops',lastRunStatus:'failed',createdAt:now,updatedAt:now}},runs:{},updatedAt:now}
 },
 journeys:{j1:{id:'j1',serviceId:'s1',name:'Coleta',stageIds:['st1'],owner:'CX',status:'active'}},
 stages:{st1:{id:'st1',journeyId:'j1',title:'Agendamento',customerAction:'Agenda coleta',emotion:'neutral',touchpointIds:['t1'],problemIds:[],opportunityIds:[]}},
 touchpoints:{t1:{id:'t1',serviceId:'s1',name:'WhatsApp de confirmação',channel:'WhatsApp',channelId:'c1'}},channels:{c1:{id:'c1',serviceId:'s1',name:'WhatsApp',kind:'messaging',owner:'CX',active:true,createdAt:now,updatedAt:now}},channelHandoffs:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'x',backstage:'x',suporte:'x'},research:{sources:{},projects:{},observations:{},collections:{}},integrity:{schemaVersion:3},views:{whiteboards:{bp1:{id:'bp1',serviceId:'s1',name:'Blueprint Coleta',viewKind:'blueprint',items:{},edges:{},layoutMode:'blueprint'}}}
};

const before=JSON.stringify(graph);
const report=buildExecutiveServiceCockpitReport(graph,now);
ok('report score bounded',report.executiveScore>=0&&report.executiveScore<=100);
ok('report status válido',['healthy','attention','critical'].includes(report.status));
ok('report possui 6 dimensões',report.dimensions.length===6);
ok('pesos totalizam 100',report.dimensions.reduce((s,x)=>s+x.weight,0)===100);
for(const id of ['health','outcomes','governance','operations','portfolio','priorities']) ok(`dimensão ${id} existe`,report.dimensions.some(x=>x.id===id));
ok('problema crítico contabilizado',report.priorities.counts.critical===1);
ok('iniciativa atrasada contabilizada',report.portfolio.counts.overdue===1);
ok('métricas fora da meta existem',report.outcomes.counts.offTarget>=1);
ok('implementada sem prova detectada',report.outcomes.counts.implementedWithoutProof===1);
ok('governança vencida detectada',report.governance.counts.overdue>=1);
ok('aprovação pendente detectada',report.governance.counts.pendingApproval>=1);
ok('operação em erro detectada',report.operations.counts.errors===1);
ok('agenda possui ações',report.actions.length>0);
ok('top actions limitado a 8',report.topActions.length<=8);
ok('top risks limitado a 6',report.topRisks.length<=6);
ok('ação problema existe',report.actions.some(x=>x.id==='problem:p1'));
ok('ação iniciativa existe',report.actions.some(x=>x.id==='initiative:i1'));
ok('ação métrica existe',report.actions.some(x=>x.id==='metric:m1'||x.id==='metric:m2'));
ok('ação sem prova existe',report.actions.some(x=>x.id==='proof:i2'));
ok('ação governança existe',report.actions.some(x=>x.id.includes('governance:')));
ok('ação operação existe',report.actions.some(x=>x.id==='operations:op1'));
ok('ação problema navega Prioridades',report.actions.find(x=>x.id==='problem:p1')?.targetTab==='improvement');
ok('ação iniciativa navega Portfolio',report.actions.find(x=>x.id==='initiative:i1')?.targetTab==='portfolio');
ok('ação métrica navega Resultados',report.actions.find(x=>x.id==='metric:m1')?.targetTab==='outcomes'||report.actions.find(x=>x.id==='metric:m2')?.targetTab==='outcomes');
ok('ação operação navega Operação',report.actions.find(x=>x.id==='operations:op1')?.targetTab==='operations');
ok('risco control score bounded',report.dimensions.find(x=>x.id==='priorities').score>=0&&report.dimensions.find(x=>x.id==='priorities').score<=100);
ok('delivery score bounded',report.dimensions.find(x=>x.id==='portfolio').score>=0&&report.dimensions.find(x=>x.id==='portfolio').score<=100);
ok('summary não vazio',report.executiveSummary.length>20);
ok('counts active problems',report.counts.activeProblems===1);
ok('counts active initiatives',report.counts.activeInitiatives===1);
ok('counts overdue initiative',report.counts.overdueInitiatives===1);
ok('counts metrics',report.counts.metrics===2);
ok('counts operations errors',report.counts.operationsErrors===1);
ok('cockpit é read-only',JSON.stringify(graph)===before);
for(let i=1;i<report.actions.length;i++) ok(`ações ordenadas ${i}`,report.actions[i-1].priority>=report.actions[i].priority);

const healthy=structuredClone(graph);
healthy.service.improvementBacklog.problems.p1.status='resolved';
healthy.service.improvementPortfolio.initiatives.i1.status='implemented'; healthy.service.improvementPortfolio.initiatives.i1.progress=100; healthy.service.improvementPortfolio.initiatives.i1.targetDate='2026-10-20'; healthy.service.improvementPortfolio.initiatives.i1.implementedAt=now;
healthy.entities.metric.m1.value=75; healthy.entities.metric.m2.value=110; healthy.service.outcomes.measurements.r1.value=75; healthy.service.outcomes.measurements.r2.value=110;
healthy.service.governance.records['governance:journey:j1'].nextReviewAt='2026-11-01'; healthy.service.governance.records['governance:journey:j1'].approvalStatus='approved'; healthy.service.governance.records['governance:journey:j1'].lastReviewedAt=now;
healthy.service.governance.reviews.rv1={id:'rv1',governanceId:'governance:journey:j1',reviewedAt:now,reviewer:'CX',outcome:'healthy',nextReviewAt:'2026-11-01',createdAt:now};
healthy.service.operationsBridge.bindings.op1.status='active'; healthy.service.operationsBridge.bindings.op1.lastRunStatus='success';
const healthyReport=buildExecutiveServiceCockpitReport(healthy,now);
ok('healthy report melhora score',healthyReport.executiveScore>report.executiveScore);
ok('healthy reduz critical problems',healthyReport.priorities.counts.critical===0);
ok('healthy reduz overdue',healthyReport.portfolio.counts.overdue===0);
ok('healthy métricas na meta',healthyReport.outcomes.counts.onTarget===2);
ok('healthy governance sem vencida',healthyReport.governance.counts.overdue===0);
ok('healthy governance reduz pendência',healthyReport.governance.counts.pendingApproval<report.governance.counts.pendingApproval);
ok('healthy operations sem erro',healthyReport.operations.counts.errors===0);
ok('healthy risk control melhora',healthyReport.dimensions.find(x=>x.id==='priorities').score>report.dimensions.find(x=>x.id==='priorities').score);

ok('package possui smoke H7.39',pkg.scripts['v1205h739:executive-service-cockpit-smoke']?.includes('v1205h739-executive-service-cockpit-smoke.mjs'));
ok('qa inclui H7.39',pkg.scripts.qa.includes('v1205h739:executive-service-cockpit-smoke'));
ok('preflight inclui H7.39',preflight.includes('v1205h739-executive-service-cockpit-smoke.mjs'));
ok('descrição começa H7.39',pkg.description.includes('V1.20.5-H7.39 Executive Service Cockpit'));
ok('changelog registra H7.39',changelog.includes('## V1.20.5-H7.39'));

const failed=checks.filter(([,pass])=>!pass); console.log(`\nH7.39 Executive Service Cockpit: ${checks.length-failed.length}/${checks.length} PASS`); if(failed.length){console.error(`Falhas: ${failed.map(([label])=>label).join(', ')}`); process.exit(1);}

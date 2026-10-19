import fs from 'node:fs';
import { serviceModelIndex, resolveObject, relationsFor, usageFor, coverageFor } from '../src/services/service-model-index.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const now='2026-10-15T15:20:00.000Z';
const serviceId='service-blue-ocean';
const graph={
  schemaVersion:3, persistenceRevision:1, integrity:{schemaVersion:3},
  service:{id:serviceId,name:'Projeto Blue Ocean',description:'Modelar, operar e evoluir serviços de forma conectada.',journeyIds:[],createdAt:now,updatedAt:now,project:{version:1,id:'project-blue-ocean',serviceId,status:'active',currentPhase:'design',definition:{promise:'',outcome:'',scope:'',startBoundary:'',endBoundary:'',principles:[],successCriteria:[],outOfScope:[],assumptions:[],personaIds:[],problemIds:[],evidenceIds:[]},createdAt:now,updatedAt:now}},
  entities:{}, research:{sources:{},projects:{},observations:{},collections:{},createdAt:now,updatedAt:now}, views:{whiteboards:{}},
  journeys:{}, stages:{}, touchpoints:{}, channels:{}, channelHandoffs:{}, problems:{}, opportunities:{}, tasks:{},
  blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},
};
graph.entities={
  persona:{p1:{id:'p1',type:'persona',serviceId:graph.service.id,title:'Cliente novo',needIds:['n1'],evidenceIds:['e1'],updatedAt:now}},
  need:{n1:{id:'n1',type:'need',serviceId:graph.service.id,title:'Entender o status',personaIds:['p1'],painIds:['pain1'],updatedAt:now}},
  pain:{pain1:{id:'pain1',type:'pain',serviceId:graph.service.id,title:'Pouca visibilidade',needIds:['n1'],evidenceIds:['e1'],updatedAt:now}},
  problemHypothesis:{h1:{id:'h1',type:'problemHypothesis',serviceId:graph.service.id,title:'Status fragmentado',evidenceIds:['e1'],validatedProblemId:'vp1',updatedAt:now}},
  problem:{vp1:{id:'vp1',type:'problem',serviceId:graph.service.id,title:'Cliente não acompanha a solicitação',sourceHypothesisId:'h1',evidenceIds:['e1'],status:'validated',updatedAt:now}},
  evidence:{e1:{id:'e1',type:'evidence',serviceId:graph.service.id,title:'Entrevistas de acompanhamento',relatedIds:['pain1'],updatedAt:now}},
  metric:{m1:{id:'m1',type:'metric',serviceId:graph.service.id,title:'Contatos sobre status',direction:'at_most',target:10,updatedAt:now}},
};
graph.journeys={j1:{id:'j1',serviceId:graph.service.id,name:'Acompanhar solicitação',stageIds:['s1'],owner:'CX',designContext:{version:1,source:'service-definition',createdAt:now,personaIds:['p1'],needIds:['n1'],jobIds:[],painIds:['pain1'],problemIds:['vp1'],evidenceIds:['e1']}}};
graph.service.journeyIds=['j1'];
graph.stages={s1:{id:'s1',journeyId:'j1',title:'Consultar andamento',customerAction:'Consulta o status',emotion:'negative',needIds:['n1'],touchpointIds:['tp1'],validatedProblemIds:['vp1'],evidenceIds:['e1'],problemIds:['sp1'],opportunityIds:['so1']}};
graph.channels={c1:{id:'c1',serviceId:graph.service.id,name:'WhatsApp',kind:'messaging',createdAt:now,updatedAt:now}};
graph.touchpoints={tp1:{id:'tp1',serviceId:graph.service.id,name:'Mensagem de status',channel:'WhatsApp',channelId:'c1'}};
graph.problems={sp1:{id:'sp1',stageId:'s1',description:'Status divergente entre canais'}};
graph.opportunities={so1:{id:'so1',stageId:'s1',title:'Unificar status',problemIds:['sp1'],taskIds:['t1'],metricIds:['m1']}};
graph.tasks={t1:{id:'t1',opportunityId:'so1',title:'Criar fonte única de status',status:'doing',stageId:'s1',journeyId:'j1',metricIds:['m1']}};
graph.views.whiteboards={
  bp1:{id:'bp1',serviceId:graph.service.id,name:'Blueprint acompanhamento',journeyId:'j1',viewKind:'blueprint',layoutMode:'blueprint',items:{i1:{id:'i1',kind:'smart',objectKind:'persona',objectId:'p1',x:0,y:0,width:200,height:100},i2:{id:'i2',kind:'smart',objectKind:'touchpoint',objectId:'tp1',x:220,y:0,width:200,height:100},i3:{id:'i3',kind:'smart',objectKind:'problem',objectId:'vp1',x:440,y:0,width:200,height:100}},edges:{}},
};
graph.service.project.definition.personaIds=['p1'];
graph.service.project.definition.problemIds=['vp1'];
graph.service.project.definition.evidenceIds=['e1'];
graph.service.ecology={version:1,stakeholders:{a1:{id:'a1',serviceId:graph.service.id,name:'Cliente',kind:'customer',influence:4,interest:5,evidenceIds:['e1'],personaId:'p1',createdAt:now,updatedAt:now},a2:{id:'a2',serviceId:graph.service.id,name:'Operações',kind:'organization',influence:5,interest:4,evidenceIds:[],createdAt:now,updatedAt:now}},relations:{ar1:{id:'ar1',fromId:'a1',toId:'a2',kind:'exchanges_information',strength:'strong',createdAt:now}},updatedAt:now};
graph.service.improvementBacklog={version:1,problems:{ip1:{id:'ip1',serviceId:graph.service.id,sourceKey:'validated:vp1',sourceRefs:[{kind:'validated_problem',sourceId:'vp1',label:'Cliente não acompanha a solicitação'}],sourceActive:true,title:'Baixa visibilidade do status',description:'O problema afeta múltiplos pontos de contato',impact:5,frequency:4,effort:2,risk:3,urgency:5,status:'accepted',evidenceIds:['e1'],createdAt:now,updatedAt:now,lastSeenAt:now}},opportunities:{io1:{id:'io1',serviceId:graph.service.id,title:'Transparência omnichannel',problemIds:['ip1'],status:'selected',createdAt:now,updatedAt:now}},updatedAt:now};
graph.service.improvementPortfolio={version:1,initiatives:{init1:{id:'init1',serviceId:graph.service.id,opportunityId:'io1',title:'Status em tempo real',problemIds:['ip1'],status:'in_progress',expectedOutcome:'Reduzir contatos sobre status',effort:3,expectedImpact:5,deliveryRisk:'medium',progress:45,dependencyIds:[],decisionIds:[],experimentIds:[],metricIds:['m1'],createdAt:now,updatedAt:now}},updatedAt:now};
graph.service.outcomes={version:1,bindings:{mb1:{id:'mb1',serviceId:graph.service.id,metricId:'m1',targetKind:'initiative',targetId:'init1',role:'result',createdAt:now},mb2:{id:'mb2',serviceId:graph.service.id,metricId:'m1',targetKind:'touchpoint',targetId:'tp1',role:'experience',createdAt:now}},measurements:{mm1:{id:'mm1',serviceId:graph.service.id,metricId:'m1',value:18,measuredAt:now,createdAt:now}},updatedAt:now};
graph.service.governance={version:1,records:{g1:{id:'g1',serviceId:graph.service.id,targetKind:'initiative',targetId:'init1',targetLabel:'Status em tempo real',active:true,reviewers:[],cadence:'monthly',approvalRequired:false,approvalStatus:'not_required',createdAt:now,updatedAt:now}},reviews:{},updatedAt:now};
graph.service.operationsBridge={version:1,bindings:{ob1:{id:'ob1',serviceId:graph.service.id,targetKind:'touchpoint',targetId:'tp1',targetLabel:'Mensagem de status',targetActive:true,operationKind:'communication',provider:'manual',direction:'bidirectional',syncMode:'manual',status:'active',createdAt:now,updatedAt:now}},runs:{},updatedAt:now};

const before=JSON.stringify(graph);
const index=serviceModelIndex(graph);
const personaUsage=usageFor(index,'persona','p1');
const touchpointUsage=usageFor(index,'touchpoint','tp1');
const metricUsage=usageFor(index,'metric','m1');
const coverage=coverageFor(index);

ok('índice preserva serviceId',index.serviceId===graph.service.id);
ok('resolve Service',resolveObject(index,'service',graph.service.id)?.label==='Projeto Blue Ocean');
ok('resolve Persona',resolveObject(index,'persona','p1')?.label==='Cliente novo');
ok('resolve Problema validado',resolveObject(index,'validatedProblem','vp1')?.label.includes('Cliente não acompanha'));
ok('resolve ator da Ecologia',resolveObject(index,'actor','a1')?.label==='Cliente');
ok('resolve Blueprint como view canônica',resolveObject(index,'blueprint','bp1')?.label==='Blueprint acompanhamento');
ok('resolve Iniciativa existente',resolveObject(index,'initiative','init1')?.label==='Status em tempo real');
ok('Journey contém etapa',relationsFor(index,'journey','j1').some(r=>r.type==='containsStage'&&r.toKey==='stage:s1'));
ok('Etapa referencia necessidade',relationsFor(index,'stage','s1').some(r=>r.type==='need'&&r.toKey==='need:n1'));
ok('Etapa referencia touchpoint',relationsFor(index,'stage','s1').some(r=>r.type==='touchpoint'&&r.toKey==='touchpoint:tp1'));
ok('Etapa distingue problema validado',relationsFor(index,'stage','s1').some(r=>r.toKey==='validatedProblem:vp1'));
ok('Etapa distingue problema observado',relationsFor(index,'stage','s1').some(r=>r.toKey==='stageProblem:sp1'));
ok('Touchpoint referencia canal',relationsFor(index,'touchpoint','tp1').some(r=>r.toKey==='channel:c1'));
ok('Ecologia vira relação ator→ator',relationsFor(index,'actor','a1').some(r=>r.type==='actor:exchanges_information'&&r.toKey==='actor:a2'));
ok('Persona enxerga uso em Blueprint',personaUsage.whiteboards===1&&personaUsage.instances===1);
ok('Persona enxerga relações além do contexto',personaUsage.relatedCount>=4);
ok('Touchpoint enxerga operação e Blueprint',touchpointUsage.relatedCount>=4&&touchpointUsage.whiteboards===1);
ok('Iniciativa liga oportunidade de melhoria',relationsFor(index,'initiative','init1').some(r=>r.toKey==='improvementOpportunity:io1'));
ok('Iniciativa liga métrica',relationsFor(index,'initiative','init1').some(r=>r.toKey==='metric:m1'));
ok('Métrica enxerga Initiative + Touchpoint + Task/Oportunidade',metricUsage.relatedCount>=4);
ok('Medição referencia métrica',relationsFor(index,'measurement','mm1').some(r=>r.toKey==='metric:m1'));
ok('Governança referencia Initiative',relationsFor(index,'governance','g1').some(r=>r.toKey==='initiative:init1'));
ok('Operations Bridge referencia Touchpoint',relationsFor(index,'operationBinding','ob1').some(r=>r.toKey==='touchpoint:tp1'));
ok('Service Definition referencia Persona',relationsFor(index,'service',graph.service.id).some(r=>r.type==='definition'&&r.toKey==='persona:p1'));
ok('coverage possui nós e relações',coverage.totalNodes>15&&coverage.totalRelations>20);
ok('coverage mede domínios',coverage.countsByDomain.discovery>=5&&coverage.countsByDomain.design>=5&&coverage.countsByDomain.improvement>=3);
ok('coverage crítica inclui touchpoint',coverage.critical.touchpoint.total===1&&coverage.critical.touchpoint.linked===1);
ok('índice é read-only',JSON.stringify(graph)===before);

const source=fs.readFileSync('src/services/service-model-index.ts','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const preflight=fs.readFileSync('preflight-linux.sh','utf8');
ok('API expõe serviceModelIndex',source.includes('export function serviceModelIndex'));
ok('API expõe resolveObject',source.includes('export function resolveObject'));
ok('API expõe relationsFor',source.includes('export function relationsFor'));
ok('API expõe usageFor',source.includes('export function usageFor'));
ok('API expõe coverageFor',source.includes('export function coverageFor'));
ok('package registra smoke H15',Boolean(pkg.scripts['v1205h740h15:service-model-index-smoke']));
ok('QA acumulado inclui H15',pkg.scripts.qa.includes('v1205h740h15:service-model-index-smoke'));
ok('preflight inclui H15',preflight.includes('v1205h740h15-service-model-index-smoke.mjs'));

const passed=checks.filter(([,pass])=>pass).length;
const failed=checks.length-passed;
console.log(`\nH7.40-H15 Service Model Index: ${passed}/${checks.length} PASS`);
process.exit(failed?1:0);

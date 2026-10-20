import fs from 'node:fs';
import { buildServiceDepthReport, whiteboardWorkState } from '../src/services/service-depth.ts';

let ok=0, fail=0;
const check=(value,label)=>{ if(value){ console.log('OK  ',label); ok+=1; } else { console.log('FAIL',label); fail+=1; } };
const read=(path)=>fs.readFileSync(path,'utf8');

const emptyGraph = {
  schemaVersion:3,
  entities:{ persona:{}, need:{}, job:{}, pain:{}, evidence:{}, problem:{} },
  service:{ id:'svc', name:'Teste', description:'', journeyIds:[], createdAt:'2026-01-01', updatedAt:'2026-01-01', project:{ version:1,id:'project',serviceId:'svc',status:'active',currentPhase:'discovery',definition:{promise:'',outcome:'',scope:'',startBoundary:'',endBoundary:'',principles:[],successCriteria:[],outOfScope:[],assumptions:[],personaIds:[],problemIds:[],evidenceIds:[]},createdAt:'2026-01-01',updatedAt:'2026-01-01'} },
  journeys:{}, stages:{}, touchpoints:{}, problems:{}, opportunities:{}, tasks:{},
  views:{ whiteboards:{} }, research:{ sources:{} }, blueprintDraft:{ evidencias:'',frontstage:'',backstage:'',suporte:'' },
};
const emptyReport=buildServiceDepthReport(emptyGraph);
check(emptyReport.score===0,'workspace vazio tem profundidade 0');
check(emptyReport.label==='Superfície','workspace vazio fica na Superfície');
check(emptyReport.components.length===6,'profundidade possui seis componentes ponderados');

const rich = structuredClone(emptyGraph);
rich.entities.persona.p1={id:'p1',type:'persona',title:'Cliente'};
rich.entities.need.n1={id:'n1',type:'need',title:'Rapidez'};
rich.entities.evidence.e1={id:'e1',type:'evidence',title:'Entrevista',description:'Cliente relata atraso',sourceType:'interview',sourceName:'Entrevista 01',method:'Entrevista semiestruturada',collectedAt:'2026-01-02',sample:'1 cliente',confidence:'high',personaIds:['p1'],problemIds:['pr1'],relatedIds:['p1','pr1']};
rich.entities.problem.pr1={id:'pr1',type:'problem',title:'Atraso',status:'validated',supportingEvidenceIds:['e1']};
rich.service.project.definition.personaIds=['p1']; rich.service.project.definition.problemIds=['pr1']; rich.service.project.definition.evidenceIds=['e1'];
rich.journeys.j1={id:'j1',serviceId:'svc',name:'Jornada',stageIds:['s1','s2'],createdAt:'2026-01-01',updatedAt:'2026-01-02'};
rich.service.journeyIds=['j1'];
rich.stages.s1={id:'s1',journeyId:'j1',title:'Descoberta',customerAction:'Busca serviço',thoughts:'Será rápido?',emotion:'neutral',needIds:['n1'],touchpointIds:['t1'],validatedProblemIds:['pr1'],evidenceIds:['e1'],problemIds:[],opportunityIds:[]};
rich.stages.s2={id:'s2',journeyId:'j1',title:'Entrega',customerAction:'Recebe roupas',thoughts:'Chegou no prazo?',emotion:'positive',needIds:['n1'],touchpointIds:['t2'],validatedProblemIds:['pr1'],evidenceIds:['e1'],problemIds:[],opportunityIds:[]};
rich.touchpoints.t1={id:'t1',serviceId:'svc',name:'Site',channel:'digital'}; rich.touchpoints.t2={id:'t2',serviceId:'svc',name:'Entrega',channel:'fisico'};
const blueprintItems={};
for (const [idx,stageId] of ['s1','s2'].entries()) {
  const artifactId=`artifact-${stageId}`;
  rich.entities.evidence[artifactId]={id:artifactId,title:'Comprovante do serviço',stageId,evidencePurpose:'service',evidenceMedium:'digital'};
  blueprintItems[artifactId]={id:artifactId,kind:'smart',objectKind:'evidence',objectId:artifactId,serviceStageId:stageId,serviceLayer:'evidence',x:0,y:0,width:100,height:60};
  for (const [lane,semantic] of [['frontstage','frontstage'],['backstage','backstage'],['process','process'],['system','system']]) {
    const id=`${stageId}-${lane}`; blueprintItems[id]={id,kind:'free',shape:'note',semantic,text:`${lane} ${idx}`,x:0,y:0,width:100,height:60,blueprintStageId:stageId,blueprintLane:lane};
  }
}
rich.views.whiteboards.bp1={id:'bp1',serviceId:'svc',name:'Blueprint',journeyId:'j1',viewKind:'blueprint',layoutMode:'blueprint',items:blueprintItems,edges:{},designContext:{version:1,source:'service-definition',createdAt:'2026-01-01',personaIds:['p1'],needIds:['n1'],jobIds:[],painIds:[],problemIds:['pr1'],evidenceIds:['e1']}};
rich.views.whiteboards.w1={id:'w1',serviceId:'svc',name:'Exploração',viewKind:'free',items:{a:{id:'a',kind:'free',shape:'note',text:'A',x:0,y:0,width:100,height:60},b:{id:'b',kind:'free',shape:'note',text:'B',x:100,y:0,width:100,height:60},c:{id:'c',kind:'free',shape:'note',text:'C',x:200,y:0,width:100,height:60}},edges:{e:{id:'e',fromId:'a',toId:'b',label:'',style:'solid',arrow:'end'}}};
const richReport=buildServiceDepthReport(rich);
check(richReport.components.find(item=>item.id==='evidence').score===100,'artefatos do serviço não alteram a qualidade das evidências de pesquisa');
check(richReport.score===100,'serviço maduro alcança profundidade 100');
check(richReport.label==='Blue Ocean','100% recebe estado Blue Ocean');
check(richReport.components.every((item)=>item.score===100),'todos os componentes maduros chegam a 100');
check(richReport.nextGap===null,'sem lacunas quando todos os componentes estão maduros');
check(whiteboardWorkState(rich.views.whiteboards.w1)==='structured','Whiteboard com conteúdo/conexão é estruturado');
check(whiteboardWorkState({...rich.views.whiteboards.w1,items:{},edges:{}})==='empty','Whiteboard vazio não conta como trabalho em andamento');

const dashboard=read('src/views/WorkspaceDashboardView.tsx');
const depth=read('src/services/service-depth.ts');
const css=read('src/runtime/service-depth-adaptive-home-h714.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const app=read('src/App.tsx');
const pkg=JSON.parse(read('package.json'));
check(dashboard.includes('data-adaptive-home="7.14"'),'Dashboard declara H7.14');
check(dashboard.includes('data-h714-service-depth="1"'),'medidor de profundidade H7.14 presente');
check(dashboard.includes('bo1214-whiteboard-branch'),'Whiteboard é ramificação paralela');
check(dashboard.includes("workState: type === 'Blueprint'")&&dashboard.includes('whiteboardWorkState(item)'),'Recentes classificam trabalho real');
check(dashboard.includes('Começar ${primaryRecent.type}')&&dashboard.includes('Continuar ${primaryRecent.type}'),'Continue diferencia começar de continuar');
check(dashboard.includes('validatedProblemCount === 0'),'próximo passo considera Problema validado');
check(dashboard.includes('RECOMENDADO PARA VOCÊ'),'Aprender possui recomendação contextual');
check(dashboard.includes('Maior oportunidade de profundidade'),'Sinais interpretam lacuna de maturidade');
check(depth.includes("weight: 20")&&depth.includes("weight: 25")&&depth.includes("weight: 15")&&depth.includes("weight: 5"),'profundidade usa pesos explícitos');
check(depth.includes("id: 'context'")&&depth.includes("id: 'journey'")&&depth.includes("id: 'evidence'")&&depth.includes("id: 'problem'")&&depth.includes("id: 'blueprint'")&&depth.includes("id: 'composition'"),'seis dimensões de profundidade implementadas');
check(css.includes('.bo1214-main-current')&&css.includes('.bo1214-whiteboard-branch'),'CSS representa corrente não linear');
check(css.includes('.bo1214-recents')&&css.includes('grid-template-columns:repeat(auto-fit'),'Recentes adaptam largura ao conteúdo');
check(css.includes('.bo1214-favorites.is-empty'),'Favoritos vazio fica compacto');
check(css.includes('.bo1214-learning-recommended'),'Aprender contextual possui tratamento próprio');
check(css.includes('.bo1207-service-signals')&&css.includes('#153d62'),'Sinais reduzem intensidade Deep Ocean');
check(style.includes("@import './runtime/service-depth-adaptive-home-h714.css';"),'CSS H7.14 importado');
check(style.indexOf('blue-ocean-identity-h713.css') < style.indexOf('service-depth-adaptive-home-h714.css'),'H7.14 sucede H7.13 na cascata');
check(main.includes("'bo-h714'"),'body recebe marker H7.14');
check(app.includes('data-adaptive-home="7.14"'),'shell declara Adaptive Home 7.14');
check(Boolean(pkg.scripts['v1205h714:adaptive-home-smoke']),'script H7.14 registrado');
check(pkg.scripts.qa?.includes('v1205h714:adaptive-home-smoke'),'QA acumulado inclui H7.14');
console.log(`\nH7.14 Service Depth & Adaptive Home: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

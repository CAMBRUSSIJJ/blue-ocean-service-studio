import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildServiceReadinessReport } from '../src/services/service-readiness.ts';

let passed=0; const ok=(condition,message)=>{assert.ok(condition,message);passed+=1;};
const read=p=>fs.readFileSync(p,'utf8');
const now='2026-10-07T22:30:00.000Z';
const item=(id,stageId,layer)=>({id,kind:'free',shape:'note',semantic:'note',text:id,x:0,y:0,width:160,height:80,serviceStageId:stageId,serviceLayer:layer});
const completeGraph={
  schemaVersion:3,persistenceRevision:1,
  entities:{
    persona:{p1:{id:'p1',type:'persona',title:'Cliente'}},
    need:{n1:{id:'n1',type:'need',title:'Previsibilidade'}},
    evidence:{e1:{id:'e1',type:'evidence',title:'Entrevista',confidence:'high'},artifact1:{id:'artifact1',type:'evidence',title:'Comprovante de coleta',evidencePurpose:'service',evidenceMedium:'digital'},artifact2:{id:'artifact2',type:'evidence',title:'Comprovante de entrega',evidencePurpose:'service',evidenceMedium:'documentary'}},
    problem:{pr1:{id:'pr1',type:'problem',title:'Atraso imprevisível',status:'validated',evidenceIds:['e1']}},
  },
  service:{id:'svc',name:'Lavanderia',description:'',journeyIds:['j1'],createdAt:now,updatedAt:now,project:{version:1,id:'project-svc',serviceId:'svc',status:'active',currentPhase:'design',createdAt:now,updatedAt:now,definition:{promise:'Coleta previsível',outcome:'Roupa entregue no prazo',scope:'Coleta, lavagem e entrega',startBoundary:'Pedido confirmado',endBoundary:'Entrega concluída',principles:['Clareza'],successCriteria:['95% no prazo'],outOfScope:[],assumptions:[],personaIds:['p1'],problemIds:['pr1'],evidenceIds:['e1']}}},
  journeys:{j1:{id:'j1',serviceId:'svc',name:'Fluxo',stageIds:['s1','s2']}},
  stages:{s1:{id:'s1',journeyId:'j1',title:'Coleta',customerAction:'Entrega as roupas',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[]},s2:{id:'s2',journeyId:'j1',title:'Entrega',customerAction:'Recebe as roupas',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[]}},
  views:{whiteboards:{wb:{id:'wb',serviceId:'svc',name:'Service Frame principal',journeyId:'j1',viewKind:'free',layoutMode:'service',items:{
    f1:item('f1','s1','frontstage'),b1:item('b1','s1','backstage'),p1:item('p1i','s1','process'),e1:item('e1i','s1','enablement'),
    f2:item('f2','s2','frontstage'),b2:item('b2','s2','backstage'),p2:item('p2i','s2','process'),e2:item('e2i','s2','enablement'),
  },edges:{}}}},
  touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
};
for(const [stageId,id] of [['s1','artifact1'],['s2','artifact2']])completeGraph.views.whiteboards.wb.items[id]={...item(id,stageId,'evidence'),kind:'smart',objectKind:'evidence',objectId:id};

const ready=buildServiceReadinessReport(completeGraph);
ok(ready.version===1,'report version 1');
ok(ready.total===17,'17 deterministic readiness criteria');
ok(ready.complete===17,'complete fixture completes all criteria');
ok(ready.score===100,'complete fixture scores 100');
ok(ready.readyForDesign===true,'complete fixture is ready for design');
ok(ready.state==='ready','complete fixture state ready');
ok(ready.blockingGaps.length===0,'ready report has no blocking gaps');
ok(ready.nextAction===null,'ready report has no next action');
ok(ready.sections.context.total===5 && ready.sections.context.score===100,'context section has five criteria');
ok(ready.sections.definition.total===6 && ready.sections.definition.score===100,'definition section has six criteria');
ok(ready.sections.structure.total===6 && ready.sections.structure.score===100,'structure section has six criteria');
ok(ready.frame.boardId==='wb','readiness identifies canonical service frame');
ok(ready.frame.stageCount===2,'readiness sees frame stages');
ok(ready.frame.coverage===100,'readiness reuses deterministic service-frame coverage');

const noPersona=structuredClone(completeGraph); delete noPersona.entities.persona.p1;
const blockedContext=buildServiceReadinessReport(noPersona);
ok(blockedContext.readyForDesign===false,'missing canonical persona blocks readiness');
ok(blockedContext.nextAction?.id==='context.persona','first gap points to persona');
ok(blockedContext.nextAction?.action.target==='context','context gap routes to Context Library');
ok(blockedContext.sections.context.score<100,'context section falls independently');

const noOutcome=structuredClone(completeGraph); noOutcome.service.project.definition.outcome='';
const blockedDefinition=buildServiceReadinessReport(noOutcome);
ok(blockedDefinition.nextAction?.id==='definition.promise-outcome','definition gap is explicit when context is complete');
ok(blockedDefinition.nextAction?.action.target==='definition','definition gap routes to Definition Studio');
ok(blockedDefinition.sections.context.score===100 && blockedDefinition.sections.definition.score<100,'readiness keeps domains separate');

const weakFrame=structuredClone(completeGraph); weakFrame.views.whiteboards.wb.items={f1:item('f1','s1','frontstage')}; weakFrame.stages.s2.customerAction='';
const blockedStructure=buildServiceReadinessReport(weakFrame);
ok(blockedStructure.sections.context.score===100 && blockedStructure.sections.definition.score===100,'structure gaps do not contaminate context or definition');
ok(blockedStructure.sections.structure.score<100,'structure section exposes frame gaps');
ok(blockedStructure.blockingGaps.some(x=>x.id==='structure.customer-actions'),'customer action coverage is a real gate');
ok(blockedStructure.blockingGaps.some(x=>x.id==='structure.visibility'),'frontstage/backstage continuity is a real gate');
ok(blockedStructure.blockingGaps.some(x=>x.id==='structure.enablement'),'process/system support is a real gate');
ok(blockedStructure.blockingGaps.some(x=>x.id==='structure.coverage'),'service-frame coverage threshold is a real gate');

const noFrame=structuredClone(completeGraph); noFrame.views.whiteboards={};
const blockedFrame=buildServiceReadinessReport(noFrame);
ok(blockedFrame.frame.boardId===null,'no frame is represented safely');
ok(blockedFrame.blockingGaps.some(x=>x.id==='structure.frame'),'missing Service Frame blocks readiness');
ok(blockedFrame.blockingGaps.find(x=>x.id==='structure.frame')?.action.target==='service-frame','missing frame routes to Whiteboards');

const src=read('src/services/service-readiness.ts');
for(const marker of ['ServiceReadinessReport','readyForDesign','context.problem-evidence','definition.traceability','structure.visibility','structure.coverage','score >= 50','frameCoverage.percent >= 60']) ok(src.includes(marker),`service readiness source marker ${marker}`);
const home=read('src/views/WorkspaceHome.tsx');
for(const marker of ['data-service-readiness="1"','SERVICE READINESS · V1','Readiness mede preparo para desenhar. Não é Health e não é Coverage','Ready to Design','resolveReadinessGap','serviceReadinessReport.blockingGaps','Feche os critérios de Service Readiness antes da composição assistida']) ok(home.includes(marker),`WorkspaceHome readiness marker ${marker}`);
const css=read('src/runtime/service-project-home.css');
for(const marker of ['V1.20.4 — Service Readiness','.bo1204-readiness{','.bo1204-readiness-sections','.bo1204-readiness-next','.bo1204-readiness-mini']) ok(css.includes(marker),`readiness css marker ${marker}`);
const model=read('src/domain/model.ts');
ok(!/readiness\??\s*:/.test(model.split('export type ServiceProjectState')[1]?.split('};')[0]||''),'readiness score is derived, not persisted in ServiceProjectState');
const roadmap=read('docs/archive/roadmaps/ROADMAP_SERVICE_PROJECT_V1.19.5_A_V1.21.2.md');
ok(roadmap.includes('| V1.20.4 | Service Readiness |'),'roadmap keeps V1.20.4 as Service Readiness');
const pkg=JSON.parse(read('package.json'));
ok(pkg.version==='1.20.4'||/^1\.20\.[5-9]$/.test(pkg.version)||/^1\.(2[1-9]|[3-9][0-9])\./.test(pkg.version),'package version is 1.20.4 or superior');
const versionFile=read('VERSION').trim(); ok(versionFile==='1.20.4'||/^1\.20\.[5-9]$/.test(versionFile)||/^1\.(2[1-9]|[3-9][0-9])\./.test(versionFile),'VERSION is 1.20.4 or superior');

console.log(`V1.20.4 Service Readiness: ${passed} OK / 0 FAIL`);

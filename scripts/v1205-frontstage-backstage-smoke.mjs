import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  OPERATIONAL_CONTEXT,
  buildFrontstageBackstageReport,
  evidenceMedium,
  operationalLinkField,
  operationalLinks,
  serviceVisibilityForLayer,
  setEvidenceMedium,
  setOperationalLink,
} from '../src/services/frontstage-backstage.ts';

let passed=0; const ok=(condition,message)=>{assert.ok(condition,message);passed+=1;};
const read=p=>fs.readFileSync(p,'utf8');
const now='2026-10-08T01:30:00.000Z';
const smart=(id,kind,objectId,stageId,layer)=>({id,kind:'smart',objectKind:kind,objectId,x:0,y:0,width:220,height:100,serviceStageId:stageId,serviceLayer:layer});
const graph={
  schemaVersion:3,persistenceRevision:1,
  entities:{
    frontstage:{f1:{id:'f1',type:'frontstage',title:'Motorista recebe as roupas',stageId:'s1',roleIds:['role-driver'],channelIds:['ch-door']},f2:{id:'f2',type:'frontstage',title:'Motorista entrega as roupas',stageId:'s2',roleIds:['role-driver'],channelIds:['ch-door']}},
    backstage:{b1:{id:'b1',type:'backstage',title:'Triagem operacional',stageId:'s1',roleIds:['role-ops'],dependencyIds:['dep-order'],policyIds:['pol-label']},b2:{id:'b2',type:'backstage',title:'Separação para entrega',stageId:'s2',roleIds:['role-ops'],dependencyIds:['dep-order'],policyIds:['pol-label']}},
    process:{p1:{id:'p1',type:'process',title:'Roteirização',stageId:'s1',roleIds:['role-ops'],dependencyIds:['dep-order'],policyIds:['pol-label']},p2:{id:'p2',type:'process',title:'Conferência',stageId:'s2',roleIds:['role-ops'],dependencyIds:['dep-order'],policyIds:['pol-label']}},
    system:{sys1:{id:'sys1',type:'system',title:'App logístico',stageId:'s1',dependencyIds:['dep-order']},sys2:{id:'sys2',type:'system',title:'CRM',stageId:'s2',dependencyIds:['dep-order']}},
    role:{'role-driver':{id:'role-driver',type:'role',title:'Motorista'},'role-ops':{id:'role-ops',type:'role',title:'Operação'}},
    channel:{'ch-door':{id:'ch-door',type:'channel',title:'Contato presencial'}},
    dependency:{'dep-order':{id:'dep-order',type:'dependency',title:'Pedido confirmado'}},
    policy:{'pol-label':{id:'pol-label',type:'policy',title:'Etiqueta obrigatória'}},
    evidence:{'ev-receipt':{id:'ev-receipt',type:'evidence',title:'Comprovante digital',stageId:'s1',evidencePurpose:'service',evidenceMedium:'digital'},'ev-tag':{id:'ev-tag',type:'evidence',title:'Etiqueta física',stageId:'s2',evidencePurpose:'service',evidenceMedium:'physical'}},
  },
  service:{id:'svc',name:'Lavanderia',description:'',journeyIds:['j1'],createdAt:now,updatedAt:now},
  journeys:{j1:{id:'j1',serviceId:'svc',name:'Fluxo',stageIds:['s1','s2']}},
  stages:{s1:{id:'s1',journeyId:'j1',title:'Coleta',customerAction:'Entrega as roupas',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[]},s2:{id:'s2',journeyId:'j1',title:'Entrega',customerAction:'Recebe as roupas',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[]}},
  views:{whiteboards:{wb:{id:'wb',serviceId:'svc',name:'Service Frame',journeyId:'j1',layoutMode:'service',items:{
    f1:smart('if1','frontstage','f1','s1','frontstage'),b1:smart('ib1','backstage','b1','s1','backstage'),p1:smart('ip1','process','p1','s1','process'),sys1:smart('is1','system','sys1','s1','enablement'),
    f2:smart('if2','frontstage','f2','s2','frontstage'),b2:smart('ib2','backstage','b2','s2','backstage'),p2:smart('ip2','process','p2','s2','process'),sys2:smart('is2','system','sys2','s2','enablement'),
  },edges:{}}}},
  touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
};

ok(OPERATIONAL_CONTEXT.length===5,'five operational context dimensions');
ok(OPERATIONAL_CONTEXT.map(x=>x.kind).join(',')==='role,channel,dependency,policy,evidence','operational dimensions keep intended order');
ok(operationalLinkField('role')==='roleIds','role maps to roleIds');
ok(operationalLinkField('channel')==='channelIds','channel maps to channelIds');
ok(operationalLinkField('dependency')==='dependencyIds','dependency maps to dependencyIds');
ok(operationalLinkField('policy')==='policyIds','policy maps to policyIds');
ok(operationalLinkField('evidence')==='evidenceIds','evidence maps to evidenceIds');
ok(serviceVisibilityForLayer('customer')==='customer-visible','customer layer is customer-visible');
ok(serviceVisibilityForLayer('frontstage')==='customer-visible','frontstage is customer-visible');
ok(serviceVisibilityForLayer('backstage')==='internal','backstage is internal');
ok(serviceVisibilityForLayer('process')==='internal','process is internal');
ok(serviceVisibilityForLayer('enablement')==='internal','enablement is internal');

const rec={id:'x',type:'frontstage',roleIds:['r1','r1'],channelIds:['c1']};
const links=operationalLinks(rec);
ok(links.roleIds.length===1 && links.roleIds[0]==='r1','operationalLinks deduplicates role ids');
ok(links.channelIds[0]==='c1','operationalLinks reads channel ids');
ok(links.dependencyIds.length===0 && links.policyIds.length===0 && links.evidenceIds.length===0,'missing relation arrays normalize to empty');
setOperationalLink(rec,'role','r2',true); ok(rec.roleIds.includes('r2'),'setOperationalLink adds link');
setOperationalLink(rec,'role','r1',false); ok(!rec.roleIds.includes('r1'),'setOperationalLink removes link');
setOperationalLink(rec,'role','r2',true); ok(rec.roleIds.filter(x=>x==='r2').length===1,'setOperationalLink is idempotent');
const ev={id:'ev',type:'evidence'}; ok(evidenceMedium(ev)==='operational','evidence defaults to operational medium');
setEvidenceMedium(ev,'physical'); ok(evidenceMedium(ev)==='physical','physical evidence medium persists');
setEvidenceMedium(ev,'digital'); ok(evidenceMedium(ev)==='digital','digital evidence medium persists');

const full=buildFrontstageBackstageReport(graph,'wb');
ok(full.version===1,'report version 1');
ok(full.stages.length===2,'report evaluates both service stages');
ok(full.total===14,'seven advanced criteria per stage');
ok(full.complete===14,'complete fixture satisfies all advanced criteria');
ok(full.percent===100,'complete fixture scores 100');
ok(full.gaps.length===0,'complete fixture has no gaps');
ok(full.stages[0].frontstage===1 && full.stages[0].backstage===1,'report counts frontstage/backstage items');
ok(full.stages[0].roles>=2,'report sees operational roles');
ok(full.stages[0].channels===1,'report sees frontstage channel');
ok(full.stages[0].dependencies>=1,'report sees internal dependencies');
ok(full.stages[0].policies>=1,'report sees policies');
ok(full.stages[0].visibleEvidence===1,'report sees physical/digital customer evidence');

const noChannel=structuredClone(graph); noChannel.entities.frontstage.f1.channelIds=[];
const channelReport=buildFrontstageBackstageReport(noChannel,'wb');
ok(channelReport.stages[0].gaps.some(x=>x.id==='s1.channel'),'missing frontstage channel becomes explicit gap');
ok(channelReport.stages[0].percent<100,'missing channel reduces stage score');
const noRole=structuredClone(graph); noRole.entities.frontstage.f1.roleIds=[]; noRole.entities.backstage.b1.roleIds=[]; noRole.entities.process.p1.roleIds=[];
const roleReport=buildFrontstageBackstageReport(noRole,'wb');
ok(roleReport.stages[0].gaps.some(x=>x.id==='s1.role'),'missing responsible role becomes explicit gap');
const noDependency=structuredClone(graph); noDependency.entities.backstage.b1.dependencyIds=[]; noDependency.entities.process.p1.dependencyIds=[]; noDependency.entities.system.sys1.dependencyIds=[];
const depReport=buildFrontstageBackstageReport(noDependency,'wb');
ok(depReport.stages[0].gaps.some(x=>x.id==='s1.dependency'),'missing internal dependency becomes explicit gap');
const noPolicy=structuredClone(graph); noPolicy.entities.backstage.b1.policyIds=[]; noPolicy.entities.process.p1.policyIds=[];
const policyReport=buildFrontstageBackstageReport(noPolicy,'wb');
ok(policyReport.stages[0].gaps.some(x=>x.id==='s1.policy'),'missing operational policy becomes explicit gap');
const noEvidence=structuredClone(graph); delete noEvidence.entities.evidence['ev-receipt'];
const evidenceReport=buildFrontstageBackstageReport(noEvidence,'wb');
ok(evidenceReport.stages[0].gaps.some(x=>x.id==='s1.evidence'),'missing visible evidence becomes explicit gap');
const noBackstage=structuredClone(graph); delete noBackstage.views.whiteboards.wb.items.b1;
const backReport=buildFrontstageBackstageReport(noBackstage,'wb');
ok(backReport.stages[0].gaps.some(x=>x.id==='s1.backstage'),'missing backstage becomes explicit gap');
const noFrontstage=structuredClone(graph); delete noFrontstage.views.whiteboards.wb.items.f1;
const frontReport=buildFrontstageBackstageReport(noFrontstage,'wb');
ok(frontReport.stages[0].gaps.some(x=>x.id==='s1.frontstage'),'missing frontstage becomes explicit gap');
const missingBoard=buildFrontstageBackstageReport(graph,'missing');
ok(missingBoard.percent===0 && missingBoard.stages.length===0,'missing board is safe');

const serviceSrc=read('src/services/frontstage-backstage.ts');
for(const marker of ['OperationalEntityKind','ServiceVisibility','EvidenceMedium','OPERATIONAL_CONTEXT','roleIds','channelIds','dependencyIds','policyIds','evidenceIds','buildFrontstageBackstageReport','Evidência visível ausente']) ok(serviceSrc.includes(marker),`domain source marker ${marker}`);
const model=read('src/domain/model.ts');
for(const marker of ["'role'","'dependency'","'policy'"]) ok(model.includes(marker),`model supports ${marker}`);
const runtime=read('src/runtime/whiteboard-core.js');
for(const marker of ['SERVICE_OPERATION_DEFS','showServiceOperations','showOperationalLinks','Contexto operacional','Meio da evidência','Detalhes da etapa',"col.querySelector('.bo1205-stage-operation').onclick",'serviceVisibilityForLayer','roleIds','dependencyIds','policyIds']) ok(runtime.includes(marker),`whiteboard runtime marker ${marker}`);
const css=read('src/runtime/whiteboard-core.css');
for(const marker of ['V1.20.5 — Frontstage / Backstage Advanced System','.bo1205-stage-operation','.bo1205-operation-summary','.bo1205-link-list','.bo1205-inspector-operation']) ok(css.includes(marker),`whiteboard css marker ${marker}`);
const integrity=read('src/runtime/data-integrity.js');
for(const marker of ["'role'","'dependency'","'policy'"]) ok(integrity.includes(marker),`integrity recognizes ${marker}`);
const pkg=JSON.parse(read('package.json'));
ok(pkg.version==='1.20.5','package version is 1.20.5');
ok(read('VERSION').trim()==='1.20.5','VERSION is 1.20.5');

console.log(`V1.20.5 Frontstage / Backstage Advanced System: ${passed} OK / 0 FAIL`);

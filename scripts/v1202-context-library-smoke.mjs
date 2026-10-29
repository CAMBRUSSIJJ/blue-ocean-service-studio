import fs from 'node:fs';
import assert from 'node:assert/strict';
import {
  CONTEXT_KIND_DEFINITIONS, allContextEntities, contextEntityById, contextEntityUsage,
  contextLibraryStats, createContextEntity, listContextEntities, removeContextEntity,
  setContextRelation, updateContextEntity,
} from '../src/services/context-library.ts';
import { createServiceProjectState } from '../src/services/service-project.ts';

let passed=0; const ok=(condition,message)=>{assert.ok(condition,message);passed+=1;};
const now='2026-10-07T21:30:00.000Z';
let graph={schemaVersion:3,persistenceRevision:1,entities:{},views:{whiteboards:{}},service:{id:'svc-context',name:'Lavanderia',description:'',journeyIds:[],createdAt:now,updatedAt:now,project:createServiceProjectState('svc-context',now)},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}}};

ok(CONTEXT_KIND_DEFINITIONS.length===7,'seven canonical context tabs');
ok(CONTEXT_KIND_DEFINITIONS.map(x=>x.kind).join('|')==='persona|need|job|pain|problemHypothesis|problem|evidence','context tab order');

for (const [kind,title] of [['persona','João'],['need','Previsibilidade'],['job','Receber roupa sem esperar'],['pain','Janela de entrega incerta'],['problemHypothesis','Falta de previsão causa abandono'],['evidence','7 de 10 reclamam do horário']]) {
  graph=createContextEntity(graph,kind,title,`Descrição de ${title}`);
  ok(listContextEntities(graph,kind).length===1,`${kind} created`);
  ok(listContextEntities(graph,kind)[0].serviceId==='svc-context',`${kind} ownership`);
}
const ids=Object.fromEntries(['persona','need','job','pain','problemHypothesis','evidence'].map(kind=>[kind,listContextEntities(graph,kind)[0].id]));
const beforeProblems=listContextEntities(graph,'problemHypothesis').length;
graph=createContextEntity(graph,'problem','Novo problema','iniciar investigação direta');
ok(listContextEntities(graph,'problem').length===1,'problem draft can be created directly');
ok(listContextEntities(graph,'problem')[0].status==='draft','direct problem has not been validated');
ok(listContextEntities(graph,'problemHypothesis').length===beforeProblems,'direct problem does not create hypothesis');

const firstHypothesis=ids.problemHypothesis;
graph=setContextRelation(graph,'persona',ids.persona,ids.need,true);
graph=setContextRelation(graph,'need',ids.need,ids.job,true);
graph=setContextRelation(graph,'job',ids.job,ids.pain,true);
graph=setContextRelation(graph,'pain',ids.pain,firstHypothesis,true);
graph=setContextRelation(graph,'problemHypothesis',firstHypothesis,ids.evidence,true);
ok(graph.entities.persona[ids.persona].relatedIds.includes(ids.need),'persona relation stored');
ok(graph.entities.need[ids.need].relatedIds.includes(ids.persona),'relation bidirectional');
ok(graph.entities.evidence[ids.evidence].relatedIds.includes(firstHypothesis),'evidence relation bidirectional');
ok(graph.entities.problemHypothesis[firstHypothesis].evidenceIds.includes(ids.evidence),'evidence index maintained');

graph=updateContextEntity(graph,'evidence',ids.evidence,{title:'Entrevistas apontam atraso',confidence:'high',sourceType:'interview'});
ok(graph.entities.evidence[ids.evidence].title==='Entrevistas apontam atraso','generic title update');
ok(graph.entities.evidence[ids.evidence].confidence==='high','evidence confidence update');
ok(graph.entities.evidence[ids.evidence].sourceType==='interview','evidence source type update');

const stats=contextLibraryStats(graph);
ok(stats.total>=7,'library total includes context objects');
ok(stats.counts.persona===1,'persona stats');
ok(stats.counts.problem===1,'direct problem draft appears in stats');
ok(allContextEntities(graph).some(x=>x.contextKind==='pain'),'all context stream includes pain');
ok(contextEntityById(graph,ids.job)?.kind==='job','lookup resolves kind');
ok(contextEntityUsage(graph,'persona',ids.persona).relatedCount>=1,'usage reports relationships');

graph.views.whiteboards['wb-1']={id:'wb-1',name:'Quadro',viewKind:'free',items:{'it-1':{id:'it-1',kind:'smart',objectKind:'persona',objectId:ids.persona,x:0,y:0,w:200,h:100}},edges:{}};
const usage=contextEntityUsage(graph,'persona',ids.persona);
ok(usage.instances===1,'whiteboard instance counted');
ok(usage.whiteboards===1,'whiteboard usage counted');

graph.service.project.definition.personaIds=[ids.persona];
graph=removeContextEntity(graph,'persona',ids.persona);
ok(!graph.entities.persona[ids.persona],'persona removed');
ok(!graph.entities.need[ids.need].relatedIds.includes(ids.persona),'reverse relation cleaned');
ok(!graph.service.project.definition.personaIds.includes(ids.persona),'definition reference cleaned');
ok(!graph.views.whiteboards['wb-1'].items['it-1'],'visual instance removed with canonical deletion to avoid orphan');

const view=fs.readFileSync('src/views/WorkspaceLibraryView.tsx','utf8');
for (const marker of ['data-workspace-page','Personas','Necessidades','Jobs','Dores','Hipóteses','Problemas','Evidências','Portfólio','Métricas','Templates','Arquivo']) ok(view.includes(marker),`workspace page marker ${marker}`);
for (const marker of ['NOME','ATUALIZADO','CRIADO','TAGS','USADO EM','Criar persona','Criar métrica','Criar template']) ok(view.includes(marker),`table pattern marker ${marker}`);
const service=fs.readFileSync('src/services/context-library.ts','utf8');
for (const marker of ['createContextEntity','setContextRelation','removeContextEntity','contextEntityUsage',"if (kind === 'problem')",'Personas','Necessidades','Jobs','Dores','Hipóteses','Problemas','Evidências']) ok(service.includes(marker),`service marker ${marker}`);
const app=fs.readFileSync('src/App.tsx','utf8');
for (const marker of ["activeTab === 'context'",'<WorkspaceLibraryView','Dashboard','Workspace','Journey maps','Blueprints','Whiteboards','Hierarquias','Personas','Portfólio','Métricas','Pesquisa','Templates','Arquivo']) ok(app.includes(marker),`app marker ${marker}`);
ok(!app.includes('<ContextLibraryView'),'Context Library monolítica não é renderizada');
const whiteboards=fs.readFileSync('src/views/WhiteboardsView.tsx','utf8');
ok(whiteboards.includes("setActiveTab('canvas')"),'whiteboard structured work opens Blueprints');
ok(whiteboards.includes('Ir para Blueprints'),'whiteboard copy points to Blueprints');
const core=fs.readFileSync('src/runtime/whiteboard-core.js','utf8');
for (const marker of ["Contexto:['persona','need','job','pain','problemHypothesis','problem','evidence']",'showValidatedProblemPicker','showContextConversion','Transformar em objeto…','Problema validado não é criado diretamente',"detail:'context'",'problemHypothesis']) ok(core.includes(marker),`whiteboard marker ${marker}`);
const css=fs.readFileSync('src/runtime/workspace-library-h3.css','utf8');
for (const marker of ['.bo1205h3-workspace-page','.bo1205h3-table','.bo1205h3-portfolio','.bo1205h3-sidebar','.bo1205h3-dashboard']) ok(css.includes(marker),`H3 css marker ${marker}`);
const model=fs.readFileSync('src/domain/model.ts','utf8');
ok(model.includes("'home' | 'context' | 'whiteboards'"),'ActiveTab preserves context route host');
const style=fs.readFileSync('src/style.css','utf8');
ok(style.includes("./runtime/workspace-library-h3.css"),'Workspace IA css imported');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const versionAtLeast=(v,a,b,c)=>{const [x=0,y=0,z=0]=String(v).split('.').map(Number);return x>a||(x===a&&(y>b||(y===b&&z>=c)))};
ok(versionAtLeast(pkg.version,1,20,2),'package version 1.20.2 or newer');
console.log(`V1.20.2 Service Context Library: ${passed} OK / 0 FAIL`);

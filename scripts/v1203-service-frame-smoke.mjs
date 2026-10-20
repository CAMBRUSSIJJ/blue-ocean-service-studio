import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  SERVICE_FRAME_LAYERS,
  buildServiceFrameCoverage,
  defaultServiceFrameLayer,
  isServiceFrameLayer,
  placeItemInServiceFrame,
  serviceFrameLayerForItem,
  serviceFrameStageForItem,
} from '../src/services/service-frame.ts';

let passed=0; const ok=(condition,message)=>{assert.ok(condition,message);passed+=1;};
const read=p=>fs.readFileSync(p,'utf8');
const versionAtLeast=(v,a,b,c)=>{const [x=0,y=0,z=0]=String(v).split('.').map(Number);return x>a||(x===a&&(y>b||(y===b&&z>=c)))};
const pkg=JSON.parse(read('package.json'));
ok(versionAtLeast(pkg.version,1,20,3),'package version 1.20.3 or newer');
ok(versionAtLeast(read('VERSION').trim(),1,20,3),'VERSION 1.20.3 or newer');

ok(SERVICE_FRAME_LAYERS.length===5,'five structural service layers');
ok(SERVICE_FRAME_LAYERS.map(x=>x.key).join('|')==='customer|frontstage|backstage|process|enablement','canonical layer order');
ok(SERVICE_FRAME_LAYERS[0].label==='Cliente','customer layer label');
ok(SERVICE_FRAME_LAYERS[1].label==='Frontstage','frontstage layer label');
ok(SERVICE_FRAME_LAYERS[2].label==='Backstage','backstage layer label');
ok(SERVICE_FRAME_LAYERS[3].label==='Processos de suporte','process layer label');
ok(SERVICE_FRAME_LAYERS[4].label==='Sistemas e recursos','enablement layer label');
ok(SERVICE_FRAME_LAYERS.filter(x=>x.visibleToCustomer).map(x=>x.key).join('|')==='customer|frontstage','only customer and frontstage are visible');
ok(isServiceFrameLayer('backstage'),'layer guard accepts backstage');
ok(!isServiceFrameLayer('problem'),'layer guard rejects business object as structural layer');
ok(defaultServiceFrameLayer('touchpoint')==='frontstage','touchpoint defaults frontstage');
ok(defaultServiceFrameLayer('backstage')==='backstage','backstage defaults backstage');
ok(defaultServiceFrameLayer('process')==='process','process defaults process');
ok(defaultServiceFrameLayer('resource')==='enablement','resource defaults enablement');
ok(defaultServiceFrameLayer('need')==='customer','need defaults customer');
ok(defaultServiceFrameLayer('problem')==='customer','problem is context, not a structural service lane');

const now='2026-10-07T21:30:00.000Z';
const graph={
  schemaVersion:3,persistenceRevision:1,
  entities:{
    frontstage:{'front-1':{id:'front-1',type:'frontstage',serviceId:'svc',stageId:'stage-1',title:'Atendente confirma coleta'}},
    backstage:{'back-1':{id:'back-1',type:'backstage',serviceId:'svc',stageId:'stage-1',title:'Separar rota'}},
    process:{'proc-1':{id:'proc-1',type:'process',serviceId:'svc',stageId:'stage-1',title:'Planejar rota'}},
    system:{'sys-1':{id:'sys-1',type:'system',serviceId:'svc',stageId:'stage-1',title:'Roteirizador'}},
  },
  views:{whiteboards:{'wb-1':{id:'wb-1',serviceId:'svc',name:'Service Frame',journeyId:'journey-1',viewKind:'free',layoutMode:'service',items:{
    'f':{id:'f',kind:'smart',objectKind:'frontstage',objectId:'front-1',x:0,y:0,width:200,height:100},
    'b':{id:'b',kind:'smart',objectKind:'backstage',objectId:'back-1',x:0,y:0,width:200,height:100},
    'p':{id:'p',kind:'smart',objectKind:'process',objectId:'proc-1',x:0,y:0,width:200,height:100},
    's':{id:'s',kind:'smart',objectKind:'system',objectId:'sys-1',x:0,y:0,width:200,height:100},
  },edges:{}}}},
  service:{id:'svc',name:'Lavanderia',description:'',journeyIds:['journey-1'],createdAt:now,updatedAt:now},
  journeys:{'journey-1':{id:'journey-1',serviceId:'svc',name:'Fluxo principal',stageIds:['stage-1','stage-2']}},
  stages:{
    'stage-1':{id:'stage-1',journeyId:'journey-1',title:'Coleta',customerAction:'Entrega as roupas',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[]},
    'stage-2':{id:'stage-2',journeyId:'journey-1',title:'Lavagem',customerAction:'',emotion:'neutral',touchpointIds:[],problemIds:[],opportunityIds:[]},
  },touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}}
};

ok(serviceFrameLayerForItem(graph.views.whiteboards['wb-1'].items.f)==='frontstage','smart frontstage resolves layer');
ok(serviceFrameStageForItem(graph.views.whiteboards['wb-1'].items.f,graph)==='stage-1','smart entity resolves stage from graph');
const moved=placeItemInServiceFrame(graph.views.whiteboards['wb-1'].items.f,'stage-2','backstage');
ok(moved.serviceStageId==='stage-2','semantic placement stores stage');
ok(moved.serviceLayer==='backstage','semantic placement stores layer');
ok(graph.views.whiteboards['wb-1'].items.f.serviceStageId===undefined,'placement is immutable');
const coverage=buildServiceFrameCoverage(graph,'wb-1');
ok(coverage.stages.length===2,'coverage evaluates every journey stage');
ok(coverage.stages[0].complete===5,'customer action plus four operational layers completes stage');
ok(coverage.stages[0].percent===100,'complete stage is 100 percent');
ok(coverage.stages[0].missing.length===0,'complete stage has no missing layers');
ok(coverage.stages[1].complete===0,'empty stage has zero layers');
ok(coverage.stages[1].missing.length===5,'empty stage exposes five gaps');
ok(coverage.complete===5 && coverage.total===10 && coverage.percent===50,'overall coverage is deterministic cells completed over total cells');
ok(buildServiceFrameCoverage(graph,'missing').total===0,'missing board returns empty coverage safely');

const model=read('src/domain/model.ts');
for(const marker of ["export type ServiceFrameLayerKey = 'customer' | 'frontstage' | 'backstage' | 'process' | 'enablement'","serviceStageId?: Id","serviceLayer?: ServiceFrameLayerKey","'free' | 'service' | 'blueprint' | 'flow' | 'journey'"]) ok(model.includes(marker),`model marker ${marker}`);
const core=read('src/runtime/whiteboard-core.js');
for(const marker of [
  'SERVICE_FRAME_LAYERS','function serviceFrameMetrics()','function serviceCompositionLayout(','function renderServiceCompositionStructure(canvas)',
  'LINHA DE INTERAÇÃO','LINHA DE VISIBILIDADE','cliente ↕ frontstage','acima visível · abaixo invisível',
  "serviceStageId",'serviceLayer','applyStructuredDrop(ids)','function serviceFrameCoverageReport()','function createServiceFrameWhiteboard',
  "createServiceFrame:createServiceFrameWhiteboard", "['free','service','journey','blueprint','flow']", "['Service Frame','service'", 'Vista operacional', 'Matriz detalhada',
  "runtime.register('serviceComposition'", "frameMode:'structured',showLines:true"
]) ok(core.includes(marker),`runtime marker ${marker}`);
ok(!core.includes('SERVICE_COMPOSITION_LANES'),'legacy 12-lane composition constant removed');
ok(!core.includes("['problem','Problemas'"),'problem is no longer a structural service-frame lane');
ok(!core.includes("['metric','Métricas'"),'metric is no longer a structural service-frame lane');
const views=read('src/runtime/view-config.js');
ok(views.includes("service:{label:'Service Frame'"),'service view named Service Frame');
ok(views.includes('Etapas × Cliente × Frontstage × Backstage × Processos × Sistemas e recursos.'),'service view explains matrix');
const ui=read('src/views/WhiteboardsView.tsx');
const blueprintWorkspace=read('src/views/BlueprintWorkspaceView.tsx');
ok(!ui.includes('Novo Service Frame')&&!ui.includes('Criar Service Frame'),'Whiteboard no longer owns Service Frame');
for(const marker of ['serviceBlueprintFrame','Criar Service Blueprint',"runtimeCall('open'","runtimeCall('create'"]) ok(blueprintWorkspace.includes(marker),`blueprint workspace marker ${marker}`);
ok(core.includes('function createServiceBlueprint')&&core.includes("viewKind:'blueprint'")&&core.includes("layoutMode:'service'"),'runtime creates Service Frame as Blueprint');
ok(core.includes("runtime.register('serviceBlueprintFrame'"),'Service Blueprint runtime API registered');
const css=read('src/runtime/whiteboard-core.css');
for(const marker of ['V1.20.3 — Structured Service Frame','.bo1203-service-frame','.bo1203-service-line{','.bo1203-service-line.visibility','.bo1203-service-cell','.bo1203-stage-column']) ok(css.includes(marker),`css marker ${marker}`);
const blueprint=read('src/views/BlueprintView.tsx');
ok(blueprint.includes("service: 'Service Frame'"),'legacy React whiteboard understands service mode');
ok(blueprint.includes('Linha de Visibilidade'),'formal Blueprint keeps visibility line');

console.log(`V1.20.3 Structured Service Frame: ${passed} OK / 0 FAIL`);

import fs from 'node:fs';
import { prepareWhiteboardFromDefinition } from '../src/services/design-handoff.ts';
import { addBlueprintLaneItem, syncBlueprintFromJourney } from '../src/services/service-blueprint-studio.ts';
import {
  buildWhiteboardStudioReport,
  syncWhiteboardBlueprint,
  syncWhiteboardDesignContext,
  syncWhiteboardJourney,
  whiteboardOriginForKind,
} from '../src/services/whiteboard-studio.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const root='.';
const service=fs.readFileSync(`${root}/src/services/whiteboard-studio.ts`,'utf8');
const handoff=fs.readFileSync(`${root}/src/services/design-handoff.ts`,'utf8');
const view=fs.readFileSync(`${root}/src/views/WhiteboardsView.tsx`,'utf8');
const core=fs.readFileSync(`${root}/src/runtime/whiteboard-core.js`,'utf8');
const css=fs.readFileSync(`${root}/src/runtime/whiteboard-h711.css`,'utf8');
const style=fs.readFileSync(`${root}/src/style.css`,'utf8');
const model=fs.readFileSync(`${root}/src/domain/model.ts`,'utf8');
const pkg=JSON.parse(fs.readFileSync(`${root}/package.json`,'utf8'));

ok('H7.11 possui Whiteboard Studio dedicado', service.includes('buildWhiteboardStudioReport') && service.includes('syncWhiteboardDesignContext'));
ok('Studio integra Journey e Blueprint', service.includes('syncWhiteboardJourney') && service.includes('syncWhiteboardBlueprint'));
ok('Whiteboard 2.0 preserva Smart Objects canônicos', model.includes("kind: 'smart'") && service.includes('resolveSmartRecord'));
ok('Handoff H7.8 agora usa sincronização H7.11', handoff.includes('syncWhiteboardDesignContext') && handoff.includes('WhiteboardView'));
ok('Biblioteca marca Whiteboard 2.0', view.includes('data-whiteboard-2="1"') && view.includes('Whiteboard 2.0'));
ok('Biblioteca possui health determinístico', view.includes('data-whiteboard-health-summary="1"') && view.includes('qualityScore'));
ok('Biblioteca possui busca e filtros', view.includes('Buscar whiteboard') && view.includes('Precisa atenção'));
ok('Biblioteca permite sincronizar Contexto Journey e Blueprint', view.includes('Sincronizar contexto') && view.includes('Trazer Journey') && view.includes('Trazer Blueprint'));
ok('Runtime expõe navegação para origem canônica', core.includes('function openSmartObjectOrigin') && core.includes("btn('Abrir origem'"));
ok('Toolbar rápida expõe Origem', core.includes("const origin=btn('Origem'"));
ok('Runtime identifica Whiteboard Studio 2.0', core.includes("WHITEBOARD_STUDIO_VERSION = '2.0'") && core.includes('studioVersion:WHITEBOARD_STUDIO_VERSION'));
ok('CSS H7.11 está importado antes do Tailwind', style.indexOf("@import './runtime/whiteboard-h711.css';")>=0 && style.indexOf("@import './runtime/whiteboard-h711.css';")<style.indexOf('@tailwind base'));
ok('CSS cobre summary commandbar health e responsividade', ['.bo-h711-summary','.bo-h711-commandbar','.bo-h711-health','@media(max-width:980px)'].every((token)=>css.includes(token)));
ok('H7.11 está encadeada no QA', Boolean(pkg.scripts['v1205h711:whiteboard-2-smoke']) && String(pkg.scripts.qa).includes('v1205h711:whiteboard-2-smoke'));

const now='2026-10-09T22:00:00.000Z';
const context={version:1,source:'service-definition',createdAt:now,personaIds:['persona1'],needIds:['need1'],jobIds:['job1'],painIds:['pain1'],problemIds:['problem1'],evidenceIds:['evidence1']};
const graph={
  schemaVersion:3,
  service:{id:'svc',name:'Serviço Teste',description:'',journeyIds:['j1'],createdAt:now,updatedAt:now,project:{version:1,id:'p',serviceId:'svc',status:'active',currentPhase:'design',createdAt:now,updatedAt:now,definition:{promise:'Clareza',outcome:'Concluir com confiança',scope:'Entrada ao fim',startBoundary:'Entrada',endBoundary:'Conclusão',principles:['Clareza'],successCriteria:['Conclusão sem ajuda'],outOfScope:['Pós-venda'],assumptions:['Cliente tem acesso digital'],personaIds:['persona1'],problemIds:['problem1'],evidenceIds:['evidence1']}}},
  entities:{
    persona:{persona1:{id:'persona1',type:'persona',serviceId:'svc',title:'Cliente principal',needIds:['need1'],jobIds:['job1'],painIds:['pain1']}},
    need:{need1:{id:'need1',type:'need',serviceId:'svc',title:'Entender próximos passos',evidenceIds:['evidence1']}},
    job:{job1:{id:'job1',type:'job',serviceId:'svc',title:'Concluir contratação'}},
    pain:{pain1:{id:'pain1',type:'pain',serviceId:'svc',title:'Insegurança',problemIds:['problem1']}},
    problem:{problem1:{id:'problem1',type:'problem',serviceId:'svc',title:'Falta de clareza',status:'validated',evidenceIds:['evidence1']}},
    evidence:{evidence1:{id:'evidence1',type:'evidence',serviceId:'svc',title:'Entrevistas',description:'6 de 8 relataram dúvida'}},
  },
  journeys:{j1:{id:'j1',serviceId:'svc',name:'Jornada principal',stageIds:['s1','s2'],designContext:context}},
  stages:{
    s1:{id:'s1',journeyId:'j1',title:'Descoberta',customerAction:'Busca entender a oferta',thoughts:'Serve para mim?',emotion:'neutral',needIds:['need1'],touchpointIds:['tp1'],validatedProblemIds:['problem1'],evidenceIds:['evidence1'],momentOfTruth:'critical',momentNote:'Decide se continua',problemIds:[],opportunityIds:[]},
    s2:{id:'s2',journeyId:'j1',title:'Confirmação',customerAction:'Confirma a solicitação',thoughts:'Terminou?',emotion:'negative',needIds:[],touchpointIds:['tp2'],validatedProblemIds:[],evidenceIds:[],momentOfTruth:'negative',momentNote:'Precisa de confirmação',problemIds:[],opportunityIds:[]},
  },
  touchpoints:{tp1:{id:'tp1',serviceId:'svc',name:'Site',channel:'Digital'},tp2:{id:'tp2',serviceId:'svc',name:'E-mail',channel:'Digital'}},
  problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
  views:{whiteboards:{bp1:{id:'bp1',serviceId:'svc',journeyId:'j1',name:'Blueprint principal',viewKind:'blueprint',items:{},edges:{},layoutMode:'blueprint',gridVisible:true,snapToGrid:true,designContext:context,updatedAt:now}}},
};

const prepared=prepareWhiteboardFromDefinition(graph,{id:'wb1',now,name:'Composição do serviço'});
ok('Criação contextual gera Whiteboard livre', prepared.boardId==='wb1' && prepared.graph.views.whiteboards.wb1?.viewKind==='free');
const wb=prepared.graph.views.whiteboards.wb1;
ok('Criação contextual gera quatro frames sem inventar operação', Object.values(wb.items).filter((item)=>item.kind==='free'&&item.shape==='frame').length===4 && !Object.values(wb.items).some((item)=>item.kind==='smart'&&['frontstage','backstage','process','system'].includes(item.objectKind)));
ok('Contexto cria seis Smart Objects canônicos', Object.values(wb.items).filter((item)=>item.kind==='smart').length===6);
ok('Relações explícitas do contexto viram conexões', Object.keys(wb.edges).length>=3);
const contextReport=buildWhiteboardStudioReport(prepared.graph,'wb1');
ok('Health lê 100% do Design Context', contextReport?.contextCoverage===100 && contextReport.contextCovered===6);
ok('Health não encontra Smart Object órfão', contextReport?.danglingSmartObjects===0);
ok('Health reconhece frames de composição', contextReport?.frames===4);
ok('Quadro contextual está pronto para composição', contextReport?.readyForComposition===true);
const contextAgain=syncWhiteboardDesignContext(prepared.graph,'wb1',now);
ok('Sincronização de Contexto é idempotente', contextAgain.added===0 && contextAgain.framesAdded===0 && contextAgain.edgesAdded===0);

const journeySync=syncWhiteboardJourney(prepared.graph,'wb1','j1',now);
ok('Journey adiciona frames por etapa', journeySync.framesAdded===2);
ok('Journey adiciona referências de etapa e touchpoint', Object.values(journeySync.graph.views.whiteboards.wb1.items).some((item)=>item.kind==='smart'&&item.objectKind==='stage'&&item.objectId==='s1') && Object.values(journeySync.graph.views.whiteboards.wb1.items).some((item)=>item.kind==='smart'&&item.objectKind==='touchpoint'&&item.objectId==='tp2'));
ok('Journey reaproveita Problema e Evidência já presentes', Object.values(journeySync.graph.views.whiteboards.wb1.items).filter((item)=>item.kind==='smart'&&item.objectKind==='problem'&&item.objectId==='problem1').length===1 && Object.values(journeySync.graph.views.whiteboards.wb1.items).filter((item)=>item.kind==='smart'&&item.objectKind==='evidence'&&item.objectId==='evidence1').length===1);
const journeyAgain=syncWhiteboardJourney(journeySync.graph,'wb1','j1',now);
ok('Sincronização de Journey é idempotente', journeyAgain.added===0 && journeyAgain.framesAdded===0 && journeyAgain.edgesAdded===0);
const journeyReport=buildWhiteboardStudioReport(journeySync.graph,'wb1');
ok('Health mede cobertura da Journey', journeyReport?.journeyStageTotal===2 && journeyReport?.journeyStageCovered===2 && journeyReport?.journeyCoverage===100);

let withBlueprint=syncBlueprintFromJourney(journeySync.graph,'bp1',now).graph;
const add=(stageId,lane,text,itemId)=>{const result=addBlueprintLaneItem({graph:withBlueprint,boardId:'bp1',stageId,lane,text,itemId,now}); withBlueprint=result.graph;};
add('s1','frontstage','Consultor explica próximos passos','front-s1');
add('s1','backstage','Equipe valida dados','back-s1');
add('s1','process','Fluxo de validação','process-s1');
add('s1','system','CRM registra solicitação','system-s1');
const blueprintSync=syncWhiteboardBlueprint(withBlueprint,'wb1','bp1',now);
ok('Blueprint é encontrado e sincronizado', blueprintSync.sourceBoardId==='bp1' && blueprintSync.added>=4);
ok('Itens operacionais autorados viram entidades canônicas', blueprintSync.entitiesCreated===4 && ['frontstage','backstage','process','system'].every((kind)=>Object.values(blueprintSync.graph.entities[kind]||{}).some((entity)=>entity.sourceBlueprintBoardId==='bp1')));
ok('Whiteboard recebe operação como Smart Object', ['frontstage','backstage','process','system'].every((kind)=>Object.values(blueprintSync.graph.views.whiteboards.wb1.items).some((item)=>item.kind==='smart'&&item.objectKind===kind)));
ok('Blueprint cria frame visual sem copiar textareas globais', blueprintSync.framesAdded===2 && Object.values(blueprintSync.graph.views.whiteboards.wb1.items).filter((item)=>item.kind==='free'&&String(item.text).startsWith('BLUEPRINT ·')).length===2);
const bpAgain=syncWhiteboardBlueprint(blueprintSync.graph,'wb1','bp1',now);
ok('Sincronização de Blueprint é idempotente', bpAgain.added===0 && bpAgain.entitiesCreated===0 && bpAgain.framesAdded===0);
const connected=buildWhiteboardStudioReport(blueprintSync.graph,'wb1');
ok('Health reconhece objetos operacionais', (connected?.operationalSmartObjects??0)>=4);
ok('Quadro conectado possui relações visíveis', (connected?.connections??0)>0 && connected?.status==='connected');

ok('Origem de Persona volta para Contexto', whiteboardOriginForKind('persona').type==='context' && whiteboardOriginForKind('persona').page==='personas');
ok('Origem de Stage volta para Journey', whiteboardOriginForKind('stage',{id:'s1',journeyId:'j1'}).type==='journey');
ok('Objeto promovido do Blueprint volta ao Blueprint', whiteboardOriginForKind('frontstage',{sourceBlueprintBoardId:'bp1'}).type==='blueprint' && whiteboardOriginForKind('frontstage',{sourceBlueprintBoardId:'bp1'}).boardId==='bp1');
ok('Tarefa volta para Plano de Ação', whiteboardOriginForKind('task').type==='action');

const broken=structuredClone(blueprintSync.graph);
const brokenItem=Object.values(broken.views.whiteboards.wb1.items).find((item)=>item.kind==='smart'&&item.objectKind==='persona');
if(brokenItem&&brokenItem.kind==='smart') brokenItem.objectId='persona-ausente';
const brokenReport=buildWhiteboardStudioReport(broken,'wb1');
ok('Health detecta referência canônica quebrada', (brokenReport?.danglingSmartObjects??0)===1 && brokenReport?.readyForComposition===false);

const failed=checks.filter(([,value])=>!value);
console.log(`\nV1.20.5-H7.11 Whiteboard 2.0: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

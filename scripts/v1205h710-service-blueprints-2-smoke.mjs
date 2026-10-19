import fs from 'node:fs';
import {
  SERVICE_BLUEPRINT_LANES,
  SERVICE_BLUEPRINT_LINES,
  addBlueprintLaneItem,
  blueprintCellItems,
  blueprintLaneForItem,
  buildServiceBlueprintReport,
  removeBlueprintItem,
  syncBlueprintFromJourney,
  updateBlueprintItemText,
} from '../src/services/service-blueprint-studio.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const root='.';
const model=fs.readFileSync(`${root}/src/domain/model.ts`,'utf8');
const view=fs.readFileSync(`${root}/src/views/BlueprintView.tsx`,'utf8');
const service=fs.readFileSync(`${root}/src/services/service-blueprint-studio.ts`,'utf8');
const runtimeConfig=fs.readFileSync(`${root}/src/runtime/view-config.js`,'utf8');
const runtimeCore=fs.readFileSync(`${root}/src/runtime/whiteboard-core.js`,'utf8');
const css=fs.readFileSync(`${root}/src/runtime/service-blueprint-h710.css`,'utf8');
const style=fs.readFileSync(`${root}/src/style.css`,'utf8');
const pkg=JSON.parse(fs.readFileSync(`${root}/package.json`,'utf8'));

ok('H7.10 possui serviço de Blueprint dedicado', service.includes('buildServiceBlueprintReport') && service.includes('syncBlueprintFromJourney') && service.includes('addBlueprintLaneItem'));
ok('Blueprint possui seis camadas operacionais', SERVICE_BLUEPRINT_LANES.length===6 && ['evidence','customer','frontstage','backstage','process','system'].every((key)=>SERVICE_BLUEPRINT_LANES.some((lane)=>lane.key===key)));
ok('Blueprint possui três linhas conceituais', SERVICE_BLUEPRINT_LINES.length===3 && SERVICE_BLUEPRINT_LINES.map((line)=>line.label).join('|').includes('Linha de interação') && SERVICE_BLUEPRINT_LINES.map((line)=>line.label).join('|').toLowerCase().includes('linha de visibilidade'));
ok('View marca Service Blueprint 2.0', view.includes('data-service-blueprint-2="1"') && view.includes('SERVICE BLUEPRINT 2.0'));
ok('View expõe health determinístico', view.includes('data-blueprint-health="1"') && view.includes('QUALIDADE DO BLUEPRINT'));
ok('View expõe gaps operacionais', view.includes('data-blueprint-gaps="1"') && view.includes('Gaps operacionais detectados'));
ok('Ações do cliente ficam vinculadas à Journey', view.includes('VEM DA JOURNEY') && view.includes('Ações do cliente vêm da Journey'));
ok('View separa Processos de Sistemas', view.includes('Cobertura operacional') && view.includes('Front / Back / Processo / Sistema'));
ok('CSS H7.10 importado antes do Tailwind', style.indexOf("@import './runtime/service-blueprint-h710.css';")>=0 && style.indexOf("@import './runtime/service-blueprint-h710.css';")<style.indexOf('@tailwind base'));
ok('CSS cobre matriz, health, gaps e linhas', ['.bo-h710-matrix','.bo-h710-health','.bo-h710-gap-summary','.bo-h710-line'].every((selector)=>css.includes(selector)));
ok('Whiteboard reconhece seis lanes automáticas', view.includes("'Sistemas / suporte'") && view.includes("'Processos'"));
ok('Runtime legado mantém Blueprint estruturado com seis lanes', runtimeConfig.includes("key:'system'") && runtimeConfig.includes("key:'process'") && runtimeCore.includes('Linha de interação interna'));
ok('Modelo preserva placement por etapa e lane', model.includes('blueprintStageId?: Id') && model.includes('blueprintLane?: string'));
ok('H7.10 está encadeada no QA', String(pkg.scripts.qa).includes('v1205h710:service-blueprints-2-smoke') && Boolean(pkg.scripts['v1205h710:service-blueprints-2-smoke']));

const now='2026-10-09T21:00:00.000Z';
const graph={
  schemaVersion:3,
  service:{id:'svc',name:'Serviço Teste',description:'',journeyIds:['j1'],createdAt:now,updatedAt:now,project:{version:1,id:'p',serviceId:'svc',status:'active',currentPhase:'design',createdAt:now,updatedAt:now,definition:{promise:'Clareza',outcome:'Concluir com confiança',scope:'Entrada ao fim',startBoundary:'Entrada',endBoundary:'Conclusão',principles:[],successCriteria:[],outOfScope:[],assumptions:[],personaIds:['persona1'],problemIds:['problem1'],evidenceIds:['evidence1']}}},
  entities:{persona:{persona1:{id:'persona1',type:'persona',serviceId:'svc',title:'Cliente'}},problem:{problem1:{id:'problem1',type:'problem',serviceId:'svc',title:'Insegurança'}},evidence:{evidence1:{id:'evidence1',type:'evidence',serviceId:'svc',title:'Entrevistas',description:'6 de 8 relataram dúvida'}}},
  journeys:{j1:{id:'j1',serviceId:'svc',name:'Jornada principal',stageIds:['s1','s2'],designContext:{version:1,source:'service-definition',createdAt:now,personaIds:['persona1'],needIds:[],jobIds:[],painIds:[],problemIds:['problem1'],evidenceIds:['evidence1']}}},
  stages:{
    s1:{id:'s1',journeyId:'j1',title:'Descoberta',customerAction:'Busca entender a oferta',thoughts:'Serve para mim?',emotion:'neutral',needIds:[],touchpointIds:['tp1'],validatedProblemIds:['problem1'],evidenceIds:['evidence1'],momentOfTruth:'critical',momentNote:'Decide se continua',problemIds:[],opportunityIds:[]},
    s2:{id:'s2',journeyId:'j1',title:'Confirmação',customerAction:'Confirma a solicitação',thoughts:'Terminou?',emotion:'negative',needIds:[],touchpointIds:['tp2'],validatedProblemIds:[],evidenceIds:[],momentOfTruth:'negative',momentNote:'Precisa de confirmação',problemIds:[],opportunityIds:[]},
  },
  touchpoints:{tp1:{id:'tp1',serviceId:'svc',name:'Site',channel:'Digital'},tp2:{id:'tp2',serviceId:'svc',name:'E-mail',channel:'Digital'}},
  problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
  views:{whiteboards:{bp1:{id:'bp1',serviceId:'svc',journeyId:'j1',name:'Blueprint principal',viewKind:'blueprint',items:{},edges:{},layoutMode:'blueprint',gridVisible:true,snapToGrid:true,designContext:{version:1,source:'service-definition',createdAt:now,personaIds:['persona1'],needIds:[],jobIds:[],painIds:[],problemIds:['problem1'],evidenceIds:['evidence1']},updatedAt:now}}},
};

const initial=buildServiceBlueprintReport(graph,'bp1');
ok('Report encontra Journey e duas etapas', initial?.journeyId==='j1' && initial?.stageCount===2 && initial?.stages.length===2);
ok('Ação do cliente conta sem criar item duplicado', initial?.stages[0].laneCounts.customer===1 && Object.keys(graph.views.whiteboards.bp1.items).length===0);
ok('Evidência canônica da Journey conta na primeira etapa', initial?.stages[0].laneCounts.evidence===1 && initial?.stages[0].evidence[0]?.id==='evidence1');
ok('Etapa sem evidência vira gap real', initial?.stages[1].gaps.some((gap)=>gap.lane==='evidence'));
ok('Blueprint vazio mostra gaps críticos de operação', (initial?.criticalGapCount??0)>=4 && initial?.readyForValidation===false);
ok('Cobertura operacional começa em zero', initial?.operationalCoverage===0);
ok('Cobertura de evidência começa em 50%', initial?.evidenceCoverage===50);

const synced=syncBlueprintFromJourney(graph,'bp1',now);
ok('Sincronização adiciona referências canônicas da Journey', synced.stageItems===2 && synced.evidenceItems===1 && synced.added===3);
ok('Sincronização não cria Frontstage/Backstage', Object.values(synced.graph.views.whiteboards.bp1.items).every((item)=>!['frontstage','backstage','process','system'].includes(String(item.blueprintLane))));
ok('Smart Stage fica na lane customer', Object.values(synced.graph.views.whiteboards.bp1.items).filter((item)=>item.kind==='smart'&&item.objectKind==='stage').every((item)=>blueprintLaneForItem(item)==='customer'));
ok('Smart Evidence fica na lane evidence', Object.values(synced.graph.views.whiteboards.bp1.items).some((item)=>item.kind==='smart'&&item.objectKind==='evidence'&&blueprintLaneForItem(item)==='evidence'));
const syncAgain=syncBlueprintFromJourney(synced.graph,'bp1',now);
ok('Sincronização é idempotente', syncAgain.added===0 && Object.keys(syncAgain.graph.views.whiteboards.bp1.items).length===3);

let current=synced.graph;
const add=(stageId,lane,text,id)=>{const result=addBlueprintLaneItem({graph:current,boardId:'bp1',stageId,lane,text,itemId:id,now}); current=result.graph; return result;};
for(const stageId of ['s1','s2']){
  add(stageId,'frontstage',`Front ${stageId}`,`front-${stageId}`);
  add(stageId,'backstage',`Back ${stageId}`,`back-${stageId}`);
  add(stageId,'process',`Process ${stageId}`,`process-${stageId}`);
  add(stageId,'system',`System ${stageId}`,`system-${stageId}`);
}
add('s2','evidence','Registro operacional','evidence-s2');
ok('Conteúdo operacional é criado na etapa correta', blueprintCellItems(current,current.views.whiteboards.bp1,'s1','frontstage').some((item)=>item.id==='front-s1'));
ok('Processos e Sistemas ocupam lanes diferentes', blueprintCellItems(current,current.views.whiteboards.bp1,'s1','process').length===1 && blueprintCellItems(current,current.views.whiteboards.bp1,'s1','system').length===1);
ok('Evidência local pode complementar evidência canônica', blueprintCellItems(current,current.views.whiteboards.bp1,'s2','evidence').some((item)=>item.id==='evidence-s2'));
const complete=buildServiceBlueprintReport(current,'bp1');
ok('Blueprint completo chega a 100%', complete?.overallScore===100 && complete?.operationalCoverage===100 && complete?.evidenceCoverage===100);
ok('Blueprint completo não possui gaps', complete?.gapCount===0 && complete?.criticalGapCount===0);
ok('Blueprint completo fica pronto para validação', complete?.readyForValidation===true);

current=updateBlueprintItemText({graph:current,boardId:'bp1',itemId:'front-s1',text:'Atendente explica próximos passos',now});
ok('Edição atualiza conteúdo sem trocar placement', current.views.whiteboards.bp1.items['front-s1'].kind==='free' && current.views.whiteboards.bp1.items['front-s1'].text==='Atendente explica próximos passos' && current.views.whiteboards.bp1.items['front-s1'].blueprintStageId==='s1');
current=removeBlueprintItem({graph:current,boardId:'bp1',itemId:'system-s2',now});
const afterRemove=buildServiceBlueprintReport(current,'bp1');
ok('Remoção reabre gap operacional', afterRemove?.stages[1].gaps.some((gap)=>gap.lane==='system') && afterRemove?.readyForValidation===false);
ok('Gap de sistema é warning e não inventa recurso', afterRemove?.stages[1].gaps.find((gap)=>gap.lane==='system')?.severity==='warning');

const rejected=addBlueprintLaneItem({graph,boardId:'bp1',stageId:'outside',lane:'frontstage',text:'Inválido',now});
ok('Item fora da Journey é rejeitado', rejected.itemId===null && rejected.graph===graph);

const failed=checks.filter(([,value])=>!value);
console.log(`\nV1.20.5-H7.10 Service Blueprints 2.0: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

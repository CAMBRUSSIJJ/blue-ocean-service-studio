import fs from 'node:fs';
import {
  buildJourneyMapReport,
  journeyContextItems,
  prepareBlueprintFromJourney,
  setJourneyStageContextLink,
  updateJourneyStageExperience,
} from '../src/services/journey-map-studio.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const root='.';
const model=fs.readFileSync(`${root}/src/domain/model.ts`,'utf8');
const controller=fs.readFileSync(`${root}/src/state/useStudioController.ts`,'utf8');
const graphOps=fs.readFileSync(`${root}/src/domain/graph-operations.ts`,'utf8');
const view=fs.readFileSync(`${root}/src/views/JourneyView.tsx`,'utf8');
const service=fs.readFileSync(`${root}/src/services/journey-map-studio.ts`,'utf8');
const css=fs.readFileSync(`${root}/src/runtime/journey-maps-h79.css`,'utf8');
const style=fs.readFileSync(`${root}/src/style.css`,'utf8');
const pkg=JSON.parse(fs.readFileSync(`${root}/package.json`,'utf8'));

ok('H7.9 possui serviço Journey Map dedicado', service.includes('buildJourneyMapReport') && service.includes('setJourneyStageContextLink') && service.includes('prepareBlueprintFromJourney'));
ok('Stage suporta pensamentos', model.includes('thoughts?: string'));
ok('Stage suporta necessidades canônicas', model.includes('needIds?: Id[]'));
ok('Stage suporta problemas validados separados', model.includes('validatedProblemIds?: Id[]'));
ok('Stage suporta evidências canônicas', model.includes('evidenceIds?: Id[]'));
ok('Stage suporta Momentos da Verdade', model.includes('JourneyMomentType') && model.includes('momentOfTruth?: JourneyMomentType'));
ok('JourneyRow possui dez dimensões', ['customerAction','thoughts','emotion','needs','touchpoints','moments','validatedProblems','evidence','problems','opportunities'].every((x)=>model.includes(`'${x}'`)));
ok('Journey View marca a superfície H7.9', view.includes('data-journey-maps-2="1"') && view.includes('JOURNEY MAP 2.0'));
ok('Journey expõe qualidade geral', view.includes('data-journey-health="1"') && view.includes('QUALIDADE DA JORNADA'));
ok('Journey diferencia Problemas validados de fricções', view.includes('Problemas validados') && view.includes('Fricções da etapa'));
ok('Journey expõe Pensamentos e Necessidades', view.includes('Pensamentos') && view.includes('Necessidades'));
ok('Journey expõe Evidências e Momentos da verdade', view.includes('Evidências') && view.includes('Momentos da verdade'));
ok('Journey possui transição explícita para Blueprint', view.includes('Preparar Blueprint') && view.includes("prepareBlueprintFromJourney(graph, journey.id"));
ok('Inspector distribui contexto sem copiar entidades', view.includes("setStageContextLink(selectedStage.id, 'need'") && view.includes("setStageContextLink(selectedStage.id, 'problem'") && view.includes("setStageContextLink(selectedStage.id, 'evidence'"));
ok('Controller inicializa campos H7.9 em novas etapas', ['thoughts: \'\'','needIds: []','validatedProblemIds: []','evidenceIds: []',"momentOfTruth: 'none'"].every((x)=>controller.includes(x)));
ok('Duplicação preserva arrays contextuais por cópia', graphOps.includes('needIds: [...(stage.needIds ?? [])]') && graphOps.includes('validatedProblemIds: [...(stage.validatedProblemIds ?? [])]') && graphOps.includes('evidenceIds: [...(stage.evidenceIds ?? [])]'));
ok('CSS H7.9 importado antes do Tailwind', style.indexOf("@import './runtime/journey-maps-h79.css';") >= 0 && style.indexOf("@import './runtime/journey-maps-h79.css';") < style.indexOf('@tailwind base'));
ok('CSS cobre mapa, health e inspector', ['.bo-h79-journey-health','.bo-h79-row-labels','.bo-h79-stage','.bo-h79-inspector','.bo-h79-moment-cell'].every((x)=>css.includes(x)));
ok('H7.9 está encadeada no QA', String(pkg.scripts.qa).includes('v1205h79:journey-maps-2-smoke') && Boolean(pkg.scripts['v1205h79:journey-maps-2-smoke']));

const now='2026-10-09T20:00:00.000Z';
const graph={
  schemaVersion:3,
  service:{id:'svc',name:'Serviço Teste',description:'',journeyIds:['j1'],createdAt:now,updatedAt:now,project:{version:1,id:'p',serviceId:'svc',status:'active',currentPhase:'design',createdAt:now,updatedAt:now,definition:{promise:'Clareza',outcome:'Concluir com confiança',scope:'Início ao fim',startBoundary:'Entrada',endBoundary:'Conclusão',principles:['Clareza'],successCriteria:['Conclusão'],outOfScope:['Pós'],assumptions:['Digital'],personaIds:['persona1'],problemIds:['problem1'],evidenceIds:['evidence1']}}},
  entities:{
    persona:{persona1:{id:'persona1',type:'persona',serviceId:'svc',title:'Cliente'}},
    need:{need1:{id:'need1',type:'need',serviceId:'svc',title:'Entender o próximo passo',description:'Precisa de previsibilidade'}},
    problem:{problem1:{id:'problem1',type:'problem',serviceId:'svc',title:'Insegurança na confirmação',description:'Cliente não sabe se terminou'}},
    evidence:{evidence1:{id:'evidence1',type:'evidence',serviceId:'svc',title:'Entrevistas',description:'6 de 8 relataram dúvida',confidence:'high'}},
  },
  journeys:{j1:{id:'j1',serviceId:'svc',name:'Jornada principal',stageIds:['s1','s2'],status:'draft',designContext:{version:1,source:'service-definition',createdAt:now,personaIds:['persona1'],needIds:['need1'],jobIds:[],painIds:[],problemIds:['problem1'],evidenceIds:['evidence1']}}},
  stages:{
    s1:{id:'s1',journeyId:'j1',title:'Descoberta',customerAction:'Busca entender a oferta',thoughts:'Será que serve para mim?',emotion:'neutral',needIds:['need1'],touchpointIds:['tp1'],validatedProblemIds:['problem1'],evidenceIds:['evidence1'],momentOfTruth:'critical',momentNote:'Decide se continua',problemIds:['local1'],opportunityIds:[]},
    s2:{id:'s2',journeyId:'j1',title:'Confirmação',customerAction:'Confirma a solicitação',thoughts:'Terminou mesmo?',emotion:'negative',needIds:[],touchpointIds:[],validatedProblemIds:[],evidenceIds:[],momentOfTruth:'none',momentNote:'',problemIds:[],opportunityIds:[]},
  },
  touchpoints:{tp1:{id:'tp1',serviceId:'svc',name:'Site',channel:'Digital'}},
  problems:{local1:{id:'local1',stageId:'s1',description:'Botão pouco claro'}},opportunities:{},tasks:{},views:{whiteboards:{}},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
};

const context=journeyContextItems(graph,'j1');
ok('Contexto da Journey vem somente dos IDs canônicos', context.needs.length===1 && context.problems.length===1 && context.evidence.length===1);
const report=buildJourneyMapReport(graph,'j1');
ok('Report reconhece duas etapas', report?.stageCount===2 && report?.stages.length===2);
ok('Report mede Momentos da Verdade', report?.momentCount===1);
ok('Report mede cobertura de Evidência por etapa', report?.evidenceCoverage===50);
ok('Report mede cobertura de Necessidades por etapa', report?.needCoverage===50);
ok('Report mede cobertura de problemas sem confundir fricção local', report?.problemCoverage===50);
ok('Etapa completa tem qualidade superior à incompleta', (report?.stages[0].qualityScore??0)>(report?.stages[1].qualityScore??0));
ok('Journey com duas etapas e touchpoint pode seguir ao Blueprint', report?.readyForBlueprint===true && report?.blueprintBlockers.length===0);

const experience=updateJourneyStageExperience({graph,stageId:'s2',patch:{thoughts:'Preciso de confirmação',momentOfTruth:'negative',momentNote:'A falta de confirmação derruba confiança'},now:'2026-10-09T20:01:00.000Z'});
ok('Atualização de pensamento preserva Stage canônico', experience.stages.s2.thoughts==='Preciso de confirmação');
ok('Atualização de Momento da Verdade é persistida', experience.stages.s2.momentOfTruth==='negative' && experience.stages.s2.momentNote.includes('confirmação'));
ok('Atualização da etapa toca Journey', experience.journeys.j1.updatedAt==='2026-10-09T20:01:00.000Z');

const linkedNeed=setJourneyStageContextLink({graph,stageId:'s2',kind:'need',entityId:'need1',enabled:true,now});
ok('Necessidade contextual pode ser distribuída para etapa', linkedNeed.stages.s2.needIds?.includes('need1'));
const linkedProblem=setJourneyStageContextLink({graph:linkedNeed,stageId:'s2',kind:'problem',entityId:'problem1',enabled:true,now});
ok('Problema validado usa campo separado de fricção', linkedProblem.stages.s2.validatedProblemIds?.includes('problem1') && linkedProblem.stages.s2.problemIds.length===0);
const linkedEvidence=setJourneyStageContextLink({graph:linkedProblem,stageId:'s2',kind:'evidence',entityId:'evidence1',enabled:true,now});
ok('Evidência contextual pode ser ligada sem duplicação', linkedEvidence.stages.s2.evidenceIds?.[0]==='evidence1' && Object.keys(linkedEvidence.entities.evidence).length===1);
const rejected=setJourneyStageContextLink({graph,stageId:'s2',kind:'evidence',entityId:'outside',enabled:true,now});
ok('Link fora do DesignContext é rejeitado', rejected===graph);

const blueprint=prepareBlueprintFromJourney(graph,'j1',{id:'bp-j1',now});
ok('Journey preparada cria Blueprint', blueprint.created===true && blueprint.boardId==='bp-j1');
ok('Blueprint aponta para a Journey de origem', blueprint.graph.views.whiteboards['bp-j1'].journeyId==='j1');
ok('Blueprint herda DesignContext sem copiar entidades', blueprint.graph.views.whiteboards['bp-j1'].designContext?.problemIds[0]==='problem1' && Object.keys(blueprint.graph.entities.problem).length===1);
ok('Blueprint nasce sem conteúdo de Frontstage/Backstage inventado', Object.keys(blueprint.graph.views.whiteboards['bp-j1'].items).length===0);

const tooShort={...graph,journeys:{...graph.journeys,j1:{...graph.journeys.j1,stageIds:['s1']}}};
const blockedShort=prepareBlueprintFromJourney(tooShort,'j1',{id:'bp-short',now});
ok('Blueprint bloqueia Journey com uma única etapa', blockedShort.boardId===null && blockedShort.blockers.some((x)=>x.includes('duas etapas')));
const noAction={...graph,stages:{...graph.stages,s2:{...graph.stages.s2,customerAction:''}}};
const blockedAction=prepareBlueprintFromJourney(noAction,'j1',{id:'bp-action',now});
ok('Blueprint bloqueia etapa sem ação do cliente', blockedAction.boardId===null && blockedAction.blockers.some((x)=>x.includes('ação do cliente')));
const noTouch={...graph,stages:{...graph.stages,s1:{...graph.stages.s1,touchpointIds:[]},s2:{...graph.stages.s2,touchpointIds:[]}}};
const blockedTouch=prepareBlueprintFromJourney(noTouch,'j1',{id:'bp-touch',now});
ok('Blueprint bloqueia Journey sem nenhum touchpoint', blockedTouch.boardId===null && blockedTouch.blockers.some((x)=>x.includes('touchpoint')));

const failed=checks.filter(([,value])=>!value);
console.log(`\nV1.20.5-H7.9 Journey Maps 2.0: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

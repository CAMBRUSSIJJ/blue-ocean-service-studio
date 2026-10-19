import fs from 'node:fs';
import {
  buildDesignHandoffReport,
  prepareBlueprintFromDefinition,
  prepareJourneyFromDefinition,
  prepareWhiteboardFromDefinition,
} from '../src/services/design-handoff.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const home=fs.readFileSync('src/views/WorkspaceHome.tsx','utf8');
const journeyView=fs.readFileSync('src/views/JourneyView.tsx','utf8');
const blueprintView=fs.readFileSync('src/views/BlueprintWorkspaceView.tsx','utf8');
const whiteboardsView=fs.readFileSync('src/views/WhiteboardsView.tsx','utf8');
const service=fs.readFileSync('src/services/design-handoff.ts','utf8');
const model=fs.readFileSync('src/domain/model.ts','utf8');
const core=fs.readFileSync('src/runtime/whiteboard-core.js','utf8');
const css=fs.readFileSync('src/runtime/design-handoff-h78.css','utf8');
const style=fs.readFileSync('src/style.css','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

ok('Design Handoff possui serviço dedicado', service.includes('buildDesignHandoffReport') && service.includes('prepareJourneyFromDefinition') && service.includes('prepareWhiteboardFromDefinition') && service.includes('prepareBlueprintFromDefinition'));
ok('Modelo possui DesignContextRef canônico', model.includes('export type DesignContextRef') && model.includes("source: 'service-definition'") && model.includes('designContext?: DesignContextRef'));
ok('Dashboard possui superfície H7.8', home.includes('data-design-handoff="1"') && home.includes('Context-to-Service') === false && home.includes('Preparar Journey'));
ok('Dashboard expõe três destinos', ['Preparar Journey','Preparar Blueprint','Preparar Whiteboard'].every((x)=>home.includes(x)));
ok('Dashboard afirma ausência de cópias', home.includes('Nenhum texto é duplicado') && home.includes('Sem cópias dos objetos'));
ok('Journey mostra contexto da Definition', journeyView.includes('data-journey-design-context="1"') && (journeyView.includes('CONTEXTO DA SERVICE DEFINITION') || journeyView.includes('PESSOAS, NECESSIDADES, DORES, PROBLEMAS E EVIDÊNCIAS')));
ok('Blueprint library mostra handoff', blueprintView.includes('data-blueprint-context-handoff="1"') && blueprintView.includes('Criar com contexto'));
ok('Whiteboard library mostra handoff', whiteboardsView.includes('data-whiteboard-context-handoff="1"') && (whiteboardsView.includes('Criar quadro contextual') || whiteboardsView.includes('Criar com registros existentes') || whiteboardsView.includes('Usar o que já foi pesquisado')));
ok('Assistente importa Service Definition', core.includes('assistantImportDefinitionContext') && core.includes('assistantBeginFromDefinition'));
ok('Assistente expõe startFromDefinition', core.includes('startFromDefinition:assistantBeginFromDefinition') && core.includes("version:'1.3'"));
ok('Workspace usa startFromDefinition quando possível', home.includes('assistant?.startFromDefinition') && home.includes('designHandoffReport.readyForJourney'));
ok('CSS H7.8 está antes do Tailwind', style.indexOf("@import './runtime/design-handoff-h78.css';") >= 0 && style.indexOf("@import './runtime/design-handoff-h78.css';") < style.indexOf('@tailwind base'));
ok('CSS cobre handoff, Journey e bibliotecas', ['.bo-h78-handoff','.bo-h78-tool-launcher','.bo-h78-journey-context','.bo-h78-blueprint-context','.bo-h78-library-hint'].every((x)=>css.includes(x)));
ok('Script H7.8 está encadeado no QA', String(pkg.scripts.qa).includes('v1205h78:design-handoff-smoke') && Boolean(pkg.scripts['v1205h78:design-handoff-smoke']));

const now='2026-10-09T19:00:00.000Z';
const graph={
  schemaVersion:3,
  service:{
    id:'svc',name:'Serviço Teste',description:'Serviço de teste',journeyIds:[],createdAt:now,updatedAt:now,
    project:{version:1,id:'project-svc',serviceId:'svc',status:'active',currentPhase:'definition',createdAt:now,updatedAt:now,definition:{
      promise:'Entregar previsibilidade',outcome:'Cliente conclui sem insegurança',scope:'Da solicitação à confirmação',startBoundary:'Solicitação',endBoundary:'Confirmação',principles:['Clareza'],successCriteria:['Conclusão sem ajuda'],outOfScope:['Pós-venda'],assumptions:['Cliente tem acesso digital'],personaIds:['p1'],problemIds:['pr1'],evidenceIds:['e1'],
    }},
  },
  entities:{
    persona:{p1:{id:'p1',type:'persona',serviceId:'svc',title:'Cliente novo',description:'Primeira experiência',relatedIds:['n1','j1','pa1','pr1','e1'],needIds:['n1'],jobIds:['j1'],painIds:['pa1'],problemIds:['pr1'],evidenceIds:['e1']}},
    need:{n1:{id:'n1',type:'need',serviceId:'svc',title:'Entender o próximo passo',description:'Precisa de clareza',relatedIds:['p1']}},
    job:{j1:{id:'j1',type:'job',serviceId:'svc',title:'Concluir a solicitação',description:'Quer finalizar',relatedIds:['p1']}},
    pain:{pa1:{id:'pa1',type:'pain',serviceId:'svc',title:'Insegurança no prazo',description:'Não sabe quando termina',relatedIds:['p1','pr1']}},
    problem:{pr1:{id:'pr1',type:'problem',serviceId:'svc',title:'Falta de previsibilidade',description:'Cliente abandona por incerteza',status:'validated',relatedIds:['p1','pa1','e1'],evidenceIds:['e1'],supportingEvidenceIds:['e1']}},
    evidence:{e1:{id:'e1',type:'evidence',serviceId:'svc',title:'Entrevistas de abandono',description:'6 de 8 citaram falta de prazo',confidence:'high',relatedIds:['p1','pr1'],personaIds:['p1'],problemIds:['pr1']}},
  },
  views:{whiteboards:{}},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
};

const report=buildDesignHandoffReport(graph);
ok('Handoff reconhece Definition pronta', report.definitionReady === true && report.readyForJourney === true && report.readyForWhiteboard === true);
ok('Handoff preserva três entradas principais', report.primary.length === 3 && report.counts.persona === 1 && report.counts.problem === 1 && report.counts.evidence === 1);
ok('Handoff recupera contexto secundário', report.supporting.length === 3 && report.counts.need === 1 && report.counts.job === 1 && report.counts.pain === 1);
ok('Handoff usa IDs canônicos', report.context.personaIds[0] === 'p1' && report.context.problemIds[0] === 'pr1' && report.context.evidenceIds[0] === 'e1');
ok('Handoff inicial não finge Blueprint pronto', report.readyForBlueprint === false && report.journeyStageCount === 0);

const journeyPrepared=prepareJourneyFromDefinition(graph,{id:'journey-context',now});
ok('Preparar Journey cria shell', journeyPrepared.created === true && journeyPrepared.journeyId === 'journey-context');
ok('Journey nasce sem etapas inventadas', journeyPrepared.graph.journeys['journey-context'].stageIds.length === 0);
ok('Journey recebe contexto canônico', journeyPrepared.graph.journeys['journey-context'].designContext?.problemIds[0] === 'pr1' && journeyPrepared.graph.journeys['journey-context'].designContext?.evidenceIds[0] === 'e1');
ok('Journey preparada vira jornada ativa por ordem', journeyPrepared.graph.service.journeyIds[0] === 'journey-context');
ok('Preparação move projeto para Design', journeyPrepared.graph.service.project?.currentPhase === 'design');

const whiteboardPrepared=prepareWhiteboardFromDefinition(graph,{id:'board-context',now});
const board=whiteboardPrepared.graph.views.whiteboards['board-context'];
const smart=Object.values(board.items).filter((item)=>item.kind==='smart');
ok('Preparar Whiteboard cria quadro livre contextual', whiteboardPrepared.created === true && board.viewKind === 'free' && board.layoutMode === 'free');
ok('Whiteboard usa Smart Objects, não cópias', smart.some((item)=>item.kind==='smart'&&item.objectKind==='persona'&&item.objectId==='p1') && smart.some((item)=>item.kind==='smart'&&item.objectKind==='problem'&&item.objectId==='pr1') && smart.some((item)=>item.kind==='smart'&&item.objectKind==='evidence'&&item.objectId==='e1'));
ok('Whiteboard inclui suporte relacionado', ['need','job','pain'].every((kind)=>smart.some((item)=>item.kind==='smart'&&item.objectKind===kind)));
ok('Whiteboard não duplica entidades no graph', Object.keys(whiteboardPrepared.graph.entities.persona).length===1 && Object.keys(whiteboardPrepared.graph.entities.problem).length===1 && Object.keys(whiteboardPrepared.graph.entities.evidence).length===1);
ok('Whiteboard carrega DesignContextRef', board.designContext?.needIds[0] === 'n1' && board.designContext?.painIds[0] === 'pa1');

const blueprintPrepared=prepareBlueprintFromDefinition(graph,{id:'bp-context',now});
const bp=blueprintPrepared.graph.views.whiteboards['bp-context'];
ok('Preparar Blueprint cria board de Blueprint', blueprintPrepared.created === true && bp.viewKind === 'blueprint' && bp.layoutMode === 'blueprint');
ok('Blueprint fica ligado a uma Journey', Boolean(bp.journeyId) && Boolean(blueprintPrepared.graph.journeys[bp.journeyId]));
ok('Blueprint não inventa conteúdo de lane', Object.keys(bp.items).length === 0 && Object.keys(blueprintPrepared.graph.stages).length === 0);
ok('Blueprint preserva pacote de contexto', bp.designContext?.personaIds[0] === 'p1' && bp.designContext?.problemIds[0] === 'pr1' && bp.designContext?.evidenceIds[0] === 'e1');

const blocked={...graph,service:{...graph.service,project:{...graph.service.project,definition:{...graph.service.project.definition,evidenceIds:[]}}}};
const blockedReport=buildDesignHandoffReport(blocked);
ok('Handoff bloqueia falta de Evidência na Definition', blockedReport.readyForJourney === false && blockedReport.counts.evidence === 0);
ok('Journey não é criada quando handoff está bloqueado', prepareJourneyFromDefinition(blocked,{id:'blocked'}).journeyId === null);
ok('Whiteboard não é criado quando handoff está bloqueado', prepareWhiteboardFromDefinition(blocked,{id:'blocked-board'}).boardId === null);
ok('Blueprint não é criado quando handoff está bloqueado', prepareBlueprintFromDefinition(blocked,{id:'blocked-bp'}).boardId === null);

const failed=checks.filter(([,v])=>!v);
console.log(`\nV1.20.5-H7.8 Context-to-Service Handoff: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

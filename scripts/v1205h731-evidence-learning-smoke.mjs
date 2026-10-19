import fs from 'node:fs';
import {
  buildLearningSystemReport, deriveLearningConfidence, deriveLearningRecommendation, deriveLearningVerdict,
  LEARNING_CONFIDENCE_LABELS, LEARNING_RECOMMENDATION_LABELS, LEARNING_VERDICT_LABELS,
  materializeExperimentLearning, normalizeLearningSystem, setLearningStatus, updateLearningRecord,
} from '../src/services/evidence-learning-system.ts';

const checks=[]; const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const read=(p)=>fs.readFileSync(p,'utf8');
const model=read('src/domain/model.ts');
const schema=read('src/domain/schema.ts');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const view=read('src/views/ServiceLearningView.tsx');
const service=read('src/services/evidence-learning-system.ts');
const css=read('src/runtime/evidence-learning-h731.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');

ok('modelo define LearningHypothesisVerdict', model.includes("export type LearningHypothesisVerdict = 'validated' | 'refuted' | 'inconclusive'"));
ok('modelo define LearningConfidence', model.includes("export type LearningConfidence = 'low' | 'medium' | 'high'"));
ok('modelo define LearningRecommendation', model.includes("export type LearningRecommendation = 'keep' | 'iterate' | 'discard' | 'retest'"));
ok('modelo define LearningStatus', model.includes("export type LearningStatus = 'draft' | 'reviewed' | 'archived'"));
ok('modelo define ServiceLearningRecord', model.includes('export type ServiceLearningRecord = {'));
ok('modelo define ServiceLearningState', model.includes('export type ServiceLearningState = {'));
ok('Service expõe learningSystem opcional', model.includes('learningSystem?: ServiceLearningState'));
ok('learning referencia experimento', model.includes('experimentId: Id;'));
ok('learning captura completedAt da rodada', model.includes('experimentCompletedAt: string;'));
ok('learning captura hipótese', model.includes('hypothesisSnapshot: string;'));
ok('learning guarda outcome original', model.includes('experimentOutcome: PrototypeExperimentOutcome;'));
ok('learning guarda verdict', model.includes('verdict: LearningHypothesisVerdict;'));
ok('learning guarda confiança', model.includes('confidence: LearningConfidence;'));
ok('learning guarda recomendação', model.includes('recommendation: LearningRecommendation;'));
ok('learning guarda evidenceIds', model.includes('evidenceIds: Id[];'));

ok('schema define serviceLearningRecord', schema.includes('const serviceLearningRecord=z.object'));
ok('schema define serviceLearningState', schema.includes('const serviceLearningState=z.object'));
ok('schema valida verdict', schema.includes("verdict:z.enum(['validated','refuted','inconclusive'])"));
ok('schema valida confiança', schema.includes("confidence:z.enum(['low','medium','high'])"));
ok('schema valida recomendação', schema.includes("recommendation:z.enum(['keep','iterate','discard','retest'])"));
ok('schema valida status', schema.includes("status:z.enum(['draft','reviewed','archived'])"));
ok('schema inclui learningSystem em service', schema.includes('learningSystem:serviceLearningState.optional()'));

ok('domínio normaliza learning system', service.includes('normalizeLearningSystem'));
ok('domínio deriva verdict', service.includes('deriveLearningVerdict'));
ok('domínio deriva confiança', service.includes('deriveLearningConfidence'));
ok('domínio deriva recomendação', service.includes('deriveLearningRecommendation'));
ok('domínio cria evidência canônica', service.includes('createEvidenceRecord'));
ok('evidência usa sourceType experiment', service.includes("sourceType: 'experiment'"));
ok('evidência guarda experimentId', service.includes('experimentId: experiment.id'));
ok('evidência registra proveniência H7.31', service.includes("provenance: 'H7.31 Evidence & Learning System'"));
ok('domínio materializa aprendizado', service.includes('materializeExperimentLearning'));
ok('materialização exige experimento concluído', service.includes("prototype.status !== 'completed'"));
ok('materialização é idempotente por rodada', service.includes('experimentCompletedAt === completedAt'));
ok('domínio atualiza aprendizado', service.includes('updateLearningRecord'));
ok('domínio revisa/arquiva aprendizado', service.includes('setLearningStatus'));
ok('domínio constrói report', service.includes('buildLearningSystemReport'));
ok('três labels de verdict', Object.keys(LEARNING_VERDICT_LABELS).length===3);
ok('quatro labels de recomendação', Object.keys(LEARNING_RECOMMENDATION_LABELS).length===4);
ok('três labels de confiança', Object.keys(LEARNING_CONFIDENCE_LABELS).length===3);

ok('Workspace possui tab learning', workspace.includes("'prototypes' | 'learning' | 'blueprint'"));
ok('Workspace inclui Aprendizados na navegação', workspace.includes("['learning', 'Aprendizados', 'insight']"));
ok('Workspace monta ServiceLearningView', workspace.includes("workspaceTab === 'learning' && <ServiceLearningView"));
ok('Workspace calcula learningReport', workspace.includes('buildLearningSystemReport(graph)'));
ok('Workspace readiness inclui learningReady', workspace.includes('learningReady'));
ok('Workspace expõe 9 perspectivas', workspace.includes('workspaceReadiness}/9'));
ok('Overview explica evidência canônica', workspace.includes('Aprendizados convertem resultados em evidência canônica'));
ok('Overview possui card APRENDER', workspace.includes('<small>APRENDER</small><strong>Aprendizados</strong>'));
ok('Overview possui classe H7.31', workspace.includes('bo-h731-overview-flow'));

ok('view H7.31 possui marker', view.includes('data-evidence-learning-system="7.31"'));
ok('view explica experimento vira evidência', view.includes('Experimento vira evidência. Evidência vira aprendizado.'));
ok('view mostra experimentos a processar', view.includes('EXPERIMENTOS A PROCESSAR'));
ok('view possui ação gerar evidência + aprendizado', view.includes('Gerar evidência + aprendizado'));
ok('view mostra proveniência', view.includes('PROVENIÊNCIA'));
ok('view mostra síntese', view.includes('O que aprendemos?'));
ok('view mostra evidência canônica', view.includes('EVIDÊNCIA CANÔNICA'));
ok('view permite confiança humana', view.includes('LEARNING_CONFIDENCE_LABELS'));
ok('view permite recomendação humana', view.includes('LEARNING_RECOMMENDATION_LABELS'));
ok('view permite marcar revisado', view.includes('Marcar como revisado'));
ok('view permite reabrir aprendizado', view.includes('Reabrir'));
ok('view permite arquivar aprendizado', view.includes('arquivar aprendizado'));
ok('view explicita próxima etapa H7.32', view.includes('Decision & Iteration Loop da H7.32'));
ok('view explicita proteção das fontes', view.includes('Journey, Proposição, Canais e Blueprint continuam intocados'));

ok('CSS H7.31 existe', fs.existsSync('src/runtime/evidence-learning-h731.css'));
ok('CSS H7.31 importado depois H7.30', style.indexOf('service-prototype-lab-h730.css') < style.indexOf('evidence-learning-h731.css'));
ok('CSS possui layout de learning', css.includes('.bo-h731-workspace'));
ok('CSS possui pending experiments', css.includes('.bo-h731-pending-grid'));
ok('CSS possui lista de aprendizados', css.includes('.bo-h731-list'));
ok('CSS possui editor', css.includes('.bo-h731-editor'));
ok('CSS possui evidências', css.includes('.bo-h731-evidence-grid'));
ok('CSS possui guardrail', css.includes('.bo-h731-guard'));
ok('CSS é responsivo', css.includes('@media(max-width:680px)'));
ok('body recebe marker H7.31', main.includes("'bo-h731'"));
ok('package descreve H7.31', String(pkg.description).includes('H7.31 Evidence & Learning System'));
ok('script H7.31 registrado', Boolean(pkg.scripts['v1205h731:evidence-learning-smoke']));
ok('QA acumulado inclui H7.31', pkg.scripts.qa?.includes('v1205h731:evidence-learning-smoke'));
ok('preflight conhece service H7.31', preflight.includes('evidence-learning-system.ts'));
ok('preflight conhece view H7.31', preflight.includes('ServiceLearningView.tsx'));
ok('preflight conhece CSS H7.31', preflight.includes('evidence-learning-h731.css'));
ok('preflight executa smoke H7.31', preflight.includes('v1205h731-evidence-learning-smoke.mjs'));

const graph={
  schemaVersion:3,
  service:{
    id:'svc',name:'Lavanderia',description:'',journeyIds:['j1'],createdAt:'2026-10-13T22:00:00.000Z',updatedAt:'2026-10-13T22:10:00.000Z',
    proposition:{version:1,current:{version:1,status:'ready',audience:'Famílias',problem:'Pouco tempo',promise:'Coleta simples',outcome:'Roupas prontas no prazo',experience:'Sem repetir informações',differentiator:'Acompanhamento contínuo',businessValue:'Recorrência',capabilities:['Logística'],principles:['Clareza'],linkedInsightIds:[],linkedNeedIds:[],linkedProblemIds:[],linkedEvidenceIds:[],createdAt:'2026-10-13T22:00:00.000Z',updatedAt:'2026-10-13T22:00:00.000Z'},updatedAt:'2026-10-13T22:00:00.000Z'},
    scenarios:{alt1:{id:'alt1',name:'Coleta autônoma',kind:'alternative',createdAt:'2026-10-13T22:00:00.000Z',status:'testing',hypothesis:'Cliente escolhe janela sem falar com atendente.'}},
    prototypeLab:{version:1,activeExperimentId:'exp1',updatedAt:'2026-10-13T22:10:00.000Z',participants:{p1:{id:'p1',name:'Cliente A',createdAt:'2026-10-13T22:00:00.000Z'},p2:{id:'p2',name:'Cliente B',createdAt:'2026-10-13T22:00:00.000Z'},p3:{id:'p3',name:'Cliente C',createdAt:'2026-10-13T22:00:00.000Z'}},experiments:{
      exp1:{id:'exp1',serviceId:'svc',title:'Teste de status da coleta',hypothesis:'Se o status estiver visível, o cliente não perguntará onde está o pedido.',fidelity:'roleplay',status:'completed',outcome:'passed',journeyId:'j1',stageIds:['s1'],touchpointIds:['tp1'],participantIds:['p1','p2','p3'],criteria:[{id:'c1',label:'Entende o status',result:'pass',evidenceNote:'3 de 3 clientes explicaram corretamente.'},{id:'c2',label:'Não pede ajuda',result:'pass',evidenceNote:'Nenhum cliente pediu ajuda.'}],observationNotes:['Todos procuraram primeiro a previsão de coleta.'],sourceSnapshot:{capturedAt:'2026-10-13T22:01:00.000Z',journeyId:'j1',journeyName:'Jornada principal',stageIds:['s1'],touchpoints:[{id:'tp1',name:'Confirmação no WhatsApp',channelId:'ch1',channel:'WhatsApp'}],scenarioId:'alt1',scenarioName:'Coleta autônoma',proposition:{status:'ready',audience:'Famílias',promise:'Coleta simples',outcome:'Roupas prontas no prazo',experience:'Sem repetir informações'}},createdAt:'2026-10-13T22:02:00.000Z',updatedAt:'2026-10-13T22:10:00.000Z',startedAt:'2026-10-13T22:05:00.000Z',completedAt:'2026-10-13T22:10:00.000Z'},
      exp2:{id:'exp2',serviceId:'svc',title:'Teste de janela autônoma',hypothesis:'Cliente consegue agendar sozinho.',fidelity:'clickable',status:'completed',outcome:'failed',journeyId:'j1',stageIds:['s1'],touchpointIds:['tp1'],participantIds:['p1'],criteria:[{id:'c3',label:'Agenda sem ajuda',result:'fail',evidenceNote:'Cliente travou na escolha do horário.'}],observationNotes:[],sourceSnapshot:{capturedAt:'2026-10-13T22:01:00.000Z',journeyId:'j1',journeyName:'Jornada principal',stageIds:['s1'],touchpoints:[{id:'tp1',name:'Confirmação no WhatsApp'}]},createdAt:'2026-10-13T22:02:00.000Z',updatedAt:'2026-10-13T22:11:00.000Z',startedAt:'2026-10-13T22:05:00.000Z',completedAt:'2026-10-13T22:11:00.000Z'},
      exp3:{id:'exp3',serviceId:'svc',title:'Teste preliminar',hypothesis:'Mensagem reduz ansiedade.',fidelity:'conversation',status:'completed',outcome:'inconclusive',journeyId:'j1',stageIds:['s1'],touchpointIds:['tp1'],participantIds:['p1'],criteria:[{id:'c4',label:'Relata menos ansiedade',result:'pending'}],observationNotes:[],sourceSnapshot:{capturedAt:'2026-10-13T22:01:00.000Z',journeyId:'j1',journeyName:'Jornada principal',stageIds:['s1'],touchpoints:[{id:'tp1',name:'Confirmação no WhatsApp'}]},createdAt:'2026-10-13T22:02:00.000Z',updatedAt:'2026-10-13T22:12:00.000Z',startedAt:'2026-10-13T22:05:00.000Z',completedAt:'2026-10-13T22:12:00.000Z'}
    }}
  },
  journeys:{j1:{id:'j1',serviceId:'svc',name:'Jornada principal',stageIds:['s1']}},
  stages:{s1:{id:'s1',journeyId:'j1',title:'Agendamento',customerAction:'Agenda coleta',emotion:'neutral',touchpointIds:['tp1'],problemIds:[],opportunityIds:[]}},
  touchpoints:{tp1:{id:'tp1',serviceId:'svc',name:'Confirmação no WhatsApp',channel:'WhatsApp',channelId:'ch1'}},
  channels:{ch1:{id:'ch1',serviceId:'svc',name:'WhatsApp',kind:'messaging',createdAt:'2026-10-13T22:00:00.000Z',updatedAt:'2026-10-13T22:00:00.000Z'}},channelHandoffs:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},
  entities:{},research:{sources:{},projects:{},observations:{},collections:{}},views:{whiteboards:{bp1:{id:'bp1',serviceId:'svc',name:'Blueprint',journeyId:'j1',viewKind:'blueprint',items:{x:{id:'x',kind:'free',shape:'note',text:'Não alterar',x:10,y:10,width:120,height:80}},edges:{}}}},
};
const journeysBefore=JSON.stringify(graph.journeys); const stagesBefore=JSON.stringify(graph.stages); const touchpointsBefore=JSON.stringify(graph.touchpoints); const propositionBefore=JSON.stringify(graph.service.proposition); const scenariosBefore=JSON.stringify(graph.service.scenarios); const boardsBefore=JSON.stringify(graph.views.whiteboards);

const e1=graph.service.prototypeLab.experiments.exp1; const e2=graph.service.prototypeLab.experiments.exp2; const e3=graph.service.prototypeLab.experiments.exp3;
ok('passed deriva validated', deriveLearningVerdict(e1)==='validated');
ok('failed deriva refuted', deriveLearningVerdict(e2)==='refuted');
ok('inconclusive permanece inconclusive', deriveLearningVerdict(e3)==='inconclusive');
ok('experimento forte deriva confiança alta', deriveLearningConfidence(e1)==='high');
ok('experimento fraco deriva confiança média', deriveLearningConfidence(e2)==='medium');
ok('experimento não avaliado deriva confiança baixa', deriveLearningConfidence(e3)==='low');
ok('validated recomenda manter', deriveLearningRecommendation('validated')==='keep');
ok('refuted recomenda iterar', deriveLearningRecommendation('refuted')==='iterate');
ok('inconclusive recomenda testar novamente', deriveLearningRecommendation('inconclusive')==='retest');

let report=buildLearningSystemReport(graph);
ok('report inicia com três experimentos pendentes', report.counts.pending===3);
ok('report inicia sem aprendizados', report.counts.learnings===0);
ok('report inicia sem evidências', report.counts.evidence===0);
ok('cobertura inicia em zero', report.learningCoverage===0);

const learned=materializeExperimentLearning(graph,'exp1','2026-10-13T22:20:00.000Z');
ok('materialização cria aprendizado', learned.created===true && Boolean(learned.learningId));
ok('materialização cria três evidências', learned.learningId ? learned.graph.service.learningSystem.records[learned.learningId].evidenceIds.length===3 : false);
ok('evidências entram em entities.evidence', Object.keys(learned.graph.entities.evidence ?? {}).length===3);
ok('evidências têm sourceType experiment', Object.values(learned.graph.entities.evidence ?? {}).every((e)=>e.sourceType==='experiment'));
ok('evidências preservam experimentId', Object.values(learned.graph.entities.evidence ?? {}).every((e)=>e.experimentId==='exp1'));
ok('evidências preservam proveniência H7.31', Object.values(learned.graph.entities.evidence ?? {}).every((e)=>e.provenance==='H7.31 Evidence & Learning System'));
const learningId=learned.learningId; if(!learningId) throw new Error('learningId ausente'); let g=learned.graph;
const l=g.service.learningSystem.records[learningId];
ok('learning captura hipótese', l.hypothesisSnapshot===e1.hypothesis);
ok('learning captura outcome passed', l.experimentOutcome==='passed');
ok('learning deriva verdict validated', l.verdict==='validated');
ok('learning deriva confiança high', l.confidence==='high');
ok('learning deriva recomendação keep', l.recommendation==='keep');
ok('learning nasce draft', l.status==='draft');
ok('learning guarda completedAt da rodada', l.experimentCompletedAt===e1.completedAt);
ok('learning gera síntese determinística', l.summary.includes('hipótese foi suportada'));

const duplicate=materializeExperimentLearning(g,'exp1','2026-10-13T22:21:00.000Z');
ok('mesma rodada não duplica aprendizado', duplicate.created===false && duplicate.learningId===learningId);
ok('mesma rodada não duplica evidências', Object.keys(duplicate.graph.entities.evidence ?? {}).length===3); g=duplicate.graph;

g=updateLearningRecord(g,learningId,{summary:'Clientes compreenderam o status sem apoio.',rationale:'A visibilidade do status reduz contato operacional.',recommendation:'keep',confidence:'high'},'2026-10-13T22:22:00.000Z');
ok('edição humana atualiza síntese', g.service.learningSystem.records[learningId].summary==='Clientes compreenderam o status sem apoio.');
ok('edição humana atualiza racional', g.service.learningSystem.records[learningId].rationale==='A visibilidade do status reduz contato operacional.');
g=setLearningStatus(g,learningId,'reviewed','2026-10-13T22:23:00.000Z');
ok('aprendizado pode ser revisado', g.service.learningSystem.records[learningId].status==='reviewed');
ok('revisão registra reviewedAt', g.service.learningSystem.records[learningId].reviewedAt==='2026-10-13T22:23:00.000Z');
report=buildLearningSystemReport(g);
ok('report conta um aprendizado', report.counts.learnings===1);
ok('report conta um revisado', report.counts.reviewed===1);
ok('report conta três evidências', report.counts.evidence===3);
ok('report conta um validated', report.counts.validated===1);
ok('report deixa dois experimentos pendentes', report.counts.pending===2);
ok('cobertura passa para 33%', report.learningCoverage===33);

const learned2=materializeExperimentLearning(g,'exp2','2026-10-13T22:24:00.000Z'); g=learned2.graph;
ok('segunda rodada gera aprendizado', learned2.created===true);
ok('falha gera uma evidência', learned2.learningId ? g.service.learningSystem.records[learned2.learningId].evidenceIds.length===1 : false);
ok('falha gera verdict refuted', learned2.learningId ? g.service.learningSystem.records[learned2.learningId].verdict==='refuted' : false);
ok('falha gera recomendação iterate', learned2.learningId ? g.service.learningSystem.records[learned2.learningId].recommendation==='iterate' : false);

const learned3=materializeExperimentLearning(g,'exp3','2026-10-13T22:25:00.000Z'); g=learned3.graph;
ok('inconclusivo também pode virar aprendizado', learned3.created===true);
ok('inconclusivo sem critério avaliado pode ter zero evidências', learned3.learningId ? g.service.learningSystem.records[learned3.learningId].evidenceIds.length===0 : false);
ok('inconclusivo mantém verdict inconclusive', learned3.learningId ? g.service.learningSystem.records[learned3.learningId].verdict==='inconclusive' : false);
ok('inconclusivo recomenda retest', learned3.learningId ? g.service.learningSystem.records[learned3.learningId].recommendation==='retest' : false);
report=buildLearningSystemReport(g);
ok('todos concluídos ficam processados', report.counts.pending===0);
ok('cobertura chega a 100%', report.learningCoverage===100);
ok('report possui três aprendizados', report.counts.learnings===3);
ok('report separa validated/refuted/inconclusive', report.counts.validated===1 && report.counts.refuted===1 && report.counts.inconclusive===1);

if(learned2.learningId){ g=setLearningStatus(g,learned2.learningId,'archived','2026-10-13T22:26:00.000Z'); }
report=buildLearningSystemReport(g);
ok('arquivado sai da lista ativa', report.counts.learnings===2 && report.archivedRecords.length===1);
ok('arquivar não reabre rodada como pendente', report.counts.pending===0);
ok('normalize mantém estado válido', normalizeLearningSystem(g).version===1);
ok('H7.31 preserva Journey', JSON.stringify(g.journeys)===journeysBefore);
ok('H7.31 preserva etapas', JSON.stringify(g.stages)===stagesBefore);
ok('H7.31 preserva touchpoints', JSON.stringify(g.touchpoints)===touchpointsBefore);
ok('H7.31 preserva proposição', JSON.stringify(g.service.proposition)===propositionBefore);
ok('H7.31 preserva cenários', JSON.stringify(g.service.scenarios)===scenariosBefore);
ok('H7.31 preserva Blueprint', JSON.stringify(g.views.whiteboards)===boardsBefore);

const blocked={...graph,service:{...graph.service,prototypeLab:{...graph.service.prototypeLab,experiments:{...graph.service.prototypeLab.experiments,exp1:{...e1,status:'running',outcome:'pending'}}}}};
const blockedResult=materializeExperimentLearning(blocked,'exp1','2026-10-13T22:30:00.000Z');
ok('experimento não concluído é bloqueado', blockedResult.created===false && blockedResult.learningId===null && Boolean(blockedResult.reason));
const missingResult=materializeExperimentLearning(graph,'missing','2026-10-13T22:30:00.000Z');
ok('experimento inexistente é bloqueado', missingResult.created===false && missingResult.learningId===null);

const failedChecks=checks.filter(([,value])=>!value);
console.log(`\nV1.20.5-H7.31 Evidence & Learning System: ${checks.length-failedChecks.length}/${checks.length} OK`);
if(failedChecks.length) process.exit(1);

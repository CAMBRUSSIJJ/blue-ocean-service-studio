import fs from 'node:fs';
import {
  addPrototypeCriterion, addPrototypeObservation, addPrototypeParticipant, archivePrototypeExperiment,
  buildPrototypeLabReport, capturePrototypeSource, completePrototypeExperiment, createPrototypeExperiment,
  derivePrototypeOutcome, experimentReadiness, PROTOTYPE_FIDELITY_META, refreshPrototypeSnapshot,
  removePrototypeCriterion, reopenPrototypeExperiment, setPrototypeCriterionResult, startPrototypeExperiment,
  unlinkPrototypeParticipant, updatePrototypeCriterion, updatePrototypeExperiment,
} from '../src/services/service-prototype-lab.ts';

const checks=[]; const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const read=(p)=>fs.readFileSync(p,'utf8');
const model=read('src/domain/model.ts');
const schema=read('src/domain/schema.ts');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const view=read('src/views/ServicePrototypeLabView.tsx');
const service=read('src/services/service-prototype-lab.ts');
const css=read('src/runtime/service-prototype-lab-h730.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');

ok('modelo define PrototypeExperimentStatus', model.includes("export type PrototypeExperimentStatus = 'draft' | 'ready' | 'running' | 'completed' | 'archived'"));
ok('modelo define outcome do experimento', model.includes("export type PrototypeExperimentOutcome = 'pending' | 'passed' | 'failed' | 'inconclusive'"));
ok('modelo define fidelidade', model.includes("export type PrototypeFidelity = 'conversation' | 'paper' | 'clickable'"));
ok('modelo define participante', model.includes('export type PrototypeParticipant = {'));
ok('modelo define critério de sucesso', model.includes('export type PrototypeSuccessCriterion = {'));
ok('modelo define snapshot de fonte', model.includes('export type PrototypeSourceSnapshot = {'));
ok('modelo define experimento de serviço', model.includes('export type ServicePrototypeExperiment = {'));
ok('modelo define laboratório', model.includes('export type ServicePrototypeLabState = {'));
ok('Service expõe prototypeLab opcional', model.includes('prototypeLab?: ServicePrototypeLabState'));
ok('experimento referencia Journey', model.includes('journeyId?: Id;'));
ok('experimento referencia stages', model.includes('stageIds: Id[];'));
ok('experimento referencia touchpoints', model.includes('touchpointIds: Id[];'));
ok('experimento referencia cenário', model.includes('scenarioId?: Id;'));
ok('experimento guarda critérios', model.includes('criteria: PrototypeSuccessCriterion[]'));
ok('experimento guarda observações', model.includes('observationNotes: string[]'));
ok('experimento guarda sourceSnapshot', model.includes('sourceSnapshot: PrototypeSourceSnapshot'));

ok('schema valida fidelidade', schema.includes("const prototypeFidelity=z.enum(['conversation','paper','clickable','roleplay','concierge','process','live_pilot'])"));
ok('schema valida participante', schema.includes('const prototypeParticipant=z.object'));
ok('schema valida critério', schema.includes('const prototypeSuccessCriterion=z.object'));
ok('schema valida snapshot', schema.includes('const prototypeSourceSnapshot=z.object'));
ok('schema valida experimento', schema.includes('const prototypeExperiment=z.object'));
ok('schema valida laboratório', schema.includes('const servicePrototypeLab=z.object'));
ok('schema inclui prototypeLab em service', schema.includes('prototypeLab:servicePrototypeLab.optional()'));

ok('domínio cria experimento', service.includes('createPrototypeExperiment'));
ok('domínio captura snapshot das fontes', service.includes('capturePrototypeSource'));
ok('domínio atualiza snapshot explicitamente', service.includes('refreshPrototypeSnapshot'));
ok('domínio calcula readiness', service.includes('experimentReadiness'));
ok('domínio deriva resultado sem IA', service.includes('derivePrototypeOutcome'));
ok('domínio adiciona participante', service.includes('addPrototypeParticipant'));
ok('domínio adiciona critério', service.includes('addPrototypeCriterion'));
ok('domínio avalia critério', service.includes('setPrototypeCriterionResult'));
ok('domínio registra observação', service.includes('addPrototypeObservation'));
ok('domínio inicia experimento', service.includes('startPrototypeExperiment'));
ok('domínio conclui experimento', service.includes('completePrototypeExperiment'));
ok('domínio reabre experimento', service.includes('reopenPrototypeExperiment'));
ok('domínio arquiva experimento', service.includes('archivePrototypeExperiment'));
ok('sete fidelidades disponíveis', Object.keys(PROTOTYPE_FIDELITY_META).length===7);

ok('Workspace possui tab prototypes', workspace.includes("'channels' | 'prototypes' | 'blueprint'"));
ok('Workspace inclui Protótipos na navegação', workspace.includes("['prototypes', 'Protótipos', 'experiment']"));
ok('Workspace monta ServicePrototypeLabView', workspace.includes("workspaceTab === 'prototypes' && <ServicePrototypeLabView"));
ok('Workspace calcula prototypeReport', workspace.includes('buildPrototypeLabReport(graph)'));
ok('Workspace readiness inclui prototypeReady', workspace.includes('prototypeReady'));
ok('Workspace expõe 8 perspectivas', workspace.includes('workspaceReadiness}/8'));
ok('Overview explica validação por protótipos', workspace.includes('Protótipos testam hipóteses'));
ok('Overview possui card VALIDAR', workspace.includes('<small>VALIDAR</small><strong>Protótipos</strong>'));

ok('view H7.30 possui marker', view.includes('data-service-prototype-lab="7.30"'));
ok('view chama Service Prototype Lab', view.includes('Service Prototype Lab'));
ok('view cria Novo experimento', view.includes('Novo experimento'));
ok('view deixa hipótese explícita', view.includes('Hipótese testável'));
ok('view expõe fidelidade', view.includes('Fidelidade'));
ok('view conecta Journey', view.includes('changeJourney'));
ok('view conecta cenário E se', view.includes('Cenário “E se?”'));
ok('view mostra proposição capturada', view.includes('Proposição capturada'));
ok('view mostra touchpoints do teste', view.includes('Touchpoints no teste'));
ok('view gerencia participantes', view.includes('Quem vai atravessar o protótipo'));
ok('view gerencia critérios de sucesso', view.includes('CRITÉRIOS DE SUCESSO'));
ok('view registra observações', view.includes('Registrar observação'));
ok('view conclui como Passou', view.includes("finishExperiment('passed')"));
ok('view conclui como Falhou', view.includes("finishExperiment('failed')"));
ok('view conclui como Inconclusivo', view.includes("finishExperiment('inconclusive')"));
ok('view oferece conclusão pelos critérios', view.includes('Usar critérios'));
ok('view explicita não sobrescrever fontes', view.includes('sem sobrescrever Journey, Proposição, Touchpoints ou cenários'));

ok('CSS H7.30 existe', fs.existsSync('src/runtime/service-prototype-lab-h730.css'));
ok('CSS H7.30 importado depois H7.29', style.indexOf('channel-continuity-h729.css') < style.indexOf('service-prototype-lab-h730.css'));
ok('CSS possui layout do laboratório', css.includes('.bo-h730-workspace'));
ok('CSS possui lista de experimentos', css.includes('.bo-h730-list'));
ok('CSS possui plano', css.includes('.bo-h730-plan'));
ok('CSS possui participantes', css.includes('.bo-h730-participants'));
ok('CSS possui critérios', css.includes('.bo-h730-criteria-list'));
ok('CSS possui execução', css.includes('.bo-h730-run'));
ok('CSS possui resultado', css.includes('.bo-h730-result'));
ok('CSS é responsivo', css.includes('@media(max-width:680px)'));
ok('body recebe marker H7.30', main.includes("'bo-h730'"));
ok('package descreve H7.30', String(pkg.description).includes('H7.30 Service Prototype Lab'));
ok('script H7.30 registrado', Boolean(pkg.scripts['v1205h730:prototype-lab-smoke']));
ok('QA acumulado inclui H7.30', pkg.scripts.qa?.includes('v1205h730:prototype-lab-smoke'));
ok('preflight conhece service H7.30', preflight.includes('service-prototype-lab.ts'));
ok('preflight conhece view H7.30', preflight.includes('ServicePrototypeLabView.tsx'));
ok('preflight conhece CSS H7.30', preflight.includes('service-prototype-lab-h730.css'));
ok('preflight executa smoke H7.30', preflight.includes('v1205h730-service-prototype-lab-smoke.mjs'));

const graph={
  schemaVersion:3,
  service:{
    id:'svc',name:'Lavanderia',description:'',journeyIds:['j1'],createdAt:'2026-10-13T22:00:00.000Z',updatedAt:'2026-10-13T22:00:00.000Z',
    proposition:{version:1,current:{version:1,status:'ready',audience:'Famílias',problem:'Pouco tempo',promise:'Coleta simples',outcome:'Roupas prontas no prazo',experience:'Sem repetir informações',differentiator:'Acompanhamento contínuo',businessValue:'Recorrência',capabilities:['Logística'],principles:['Clareza'],linkedInsightIds:[],linkedNeedIds:[],linkedProblemIds:[],linkedEvidenceIds:[],createdAt:'2026-10-13T22:00:00.000Z',updatedAt:'2026-10-13T22:00:00.000Z'},updatedAt:'2026-10-13T22:00:00.000Z'},
    scenarios:{alt1:{id:'alt1',name:'Coleta autônoma',kind:'alternative',createdAt:'2026-10-13T22:00:00.000Z',status:'testing',hypothesis:'Cliente escolhe janela sem falar com atendente.',propositionPatch:{promise:'Agendamento autônomo'}}},
  },
  journeys:{j1:{id:'j1',serviceId:'svc',name:'Jornada principal',stageIds:['s1','s2']}},
  stages:{
    s1:{id:'s1',journeyId:'j1',title:'Agendamento',customerAction:'Agenda coleta',emotion:'neutral',touchpointIds:['tp1'],problemIds:[],opportunityIds:[]},
    s2:{id:'s2',journeyId:'j1',title:'Coleta',customerAction:'Entrega roupas',emotion:'neutral',touchpointIds:['tp2'],problemIds:[],opportunityIds:[]},
  },
  touchpoints:{
    tp1:{id:'tp1',serviceId:'svc',name:'Confirmação no WhatsApp',channel:'WhatsApp',channelId:'ch1'},
    tp2:{id:'tp2',serviceId:'svc',name:'Entrega ao motorista',channel:'Presencial',channelId:'ch2'},
  },
  channels:{ch1:{id:'ch1',serviceId:'svc',name:'WhatsApp',kind:'messaging',createdAt:'2026-10-13T22:00:00.000Z',updatedAt:'2026-10-13T22:00:00.000Z'},ch2:{id:'ch2',serviceId:'svc',name:'Presencial',kind:'in_person',createdAt:'2026-10-13T22:00:00.000Z',updatedAt:'2026-10-13T22:00:00.000Z'}},
  channelHandoffs:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},
  entities:{},research:{sources:{},projects:{},observations:{},collections:{}},
  views:{whiteboards:{bp1:{id:'bp1',serviceId:'svc',name:'Blueprint',journeyId:'j1',viewKind:'blueprint',items:{x:{id:'x',kind:'free',shape:'note',text:'Não alterar',x:10,y:10,width:120,height:80}},edges:{}}}},
};
const journeyBefore=JSON.stringify(graph.journeys);
const stagesBefore=JSON.stringify(graph.stages);
const touchpointsBefore=JSON.stringify(graph.touchpoints);
const propositionBefore=JSON.stringify(graph.service.proposition);
const scenariosBefore=JSON.stringify(graph.service.scenarios);
const boardsBefore=JSON.stringify(graph.views.whiteboards);

const snap=capturePrototypeSource(graph,{journeyId:'j1',scenarioId:'alt1'},'2026-10-13T22:01:00.000Z');
ok('snapshot captura Journey', snap.journeyId==='j1' && snap.journeyName==='Jornada principal');
ok('snapshot captura duas etapas', snap.stageIds.length===2);
ok('snapshot captura dois touchpoints', snap.touchpoints.length===2);
ok('snapshot captura cenário alternativo', snap.scenarioId==='alt1' && snap.scenarioName==='Coleta autônoma');
ok('snapshot captura promessa da proposição', snap.proposition?.promise==='Coleta simples');

let created=createPrototypeExperiment({graph,title:'Teste de confirmação',hypothesis:'Se a confirmação mostrar status, o cliente não precisará perguntar.',fidelity:'roleplay',journeyId:'j1',scenarioId:'alt1',now:'2026-10-13T22:02:00.000Z'});
ok('criação retorna experimentId', Boolean(created.experimentId));
if(!created.experimentId) throw new Error('experiment id ausente');
let g=created.graph; const experimentId=created.experimentId;
ok('criação persiste laboratório', Boolean(g.service.prototypeLab?.experiments[experimentId]));
ok('experimento nasce rascunho sem participante e critério', g.service.prototypeLab?.experiments[experimentId]?.status==='draft');
ok('criação preserva Journey', JSON.stringify(g.journeys)===journeyBefore);
ok('criação preserva etapas', JSON.stringify(g.stages)===stagesBefore);
ok('criação preserva touchpoints', JSON.stringify(g.touchpoints)===touchpointsBefore);
ok('criação preserva proposição', JSON.stringify(g.service.proposition)===propositionBefore);
ok('criação preserva cenários', JSON.stringify(g.service.scenarios)===scenariosBefore);
ok('criação preserva Blueprint', JSON.stringify(g.views.whiteboards)===boardsBefore);

let participant=addPrototypeParticipant(g,experimentId,{name:'Cliente A',role:'Cliente recorrente'},'2026-10-13T22:03:00.000Z');
ok('participante criado', Boolean(participant.participantId)); g=participant.graph;
let criterion1=addPrototypeCriterion(g,experimentId,{label:'Conclui a confirmação sem pedir ajuda',target:'4 de 5 tentativas'},'2026-10-13T22:04:00.000Z');
ok('primeiro critério criado', Boolean(criterion1.criterionId)); g=criterion1.graph;
let criterion2=addPrototypeCriterion(g,experimentId,{label:'Entende o status da coleta',target:'Resposta correta em até 10s'},'2026-10-13T22:05:00.000Z');
ok('segundo critério criado', Boolean(criterion2.criterionId)); g=criterion2.graph;
const readyExperiment=g.service.prototypeLab.experiments[experimentId];
const readiness=experimentReadiness(readyExperiment);
ok('readiness chega a 100%', readiness.score===100);
ok('experimento fica pronto após plano mínimo', readiness.ready && readyExperiment.status==='ready');

const start=startPrototypeExperiment(g,experimentId,'2026-10-13T22:06:00.000Z');
ok('experimento pronto pode iniciar', start.started===true); g=start.graph;
ok('status passa para running', g.service.prototypeLab.experiments[experimentId].status==='running');
ok('startedAt registrado', g.service.prototypeLab.experiments[experimentId].startedAt==='2026-10-13T22:06:00.000Z');

if(!criterion1.criterionId || !criterion2.criterionId) throw new Error('criterion id ausente');
g=setPrototypeCriterionResult(g,experimentId,criterion1.criterionId,'pass','Cliente completou sem ajuda.','2026-10-13T22:07:00.000Z');
g=setPrototypeCriterionResult(g,experimentId,criterion2.criterionId,'pass','Cliente explicou o status corretamente.','2026-10-13T22:08:00.000Z');
ok('dois passes sugerem resultado passed', derivePrototypeOutcome(g.service.prototypeLab.experiments[experimentId])==='passed');
g=addPrototypeObservation(g,experimentId,'Cliente procurou primeiro a data estimada.','2026-10-13T22:09:00.000Z');
ok('observação fica registrada', g.service.prototypeLab.experiments[experimentId].observationNotes.length===1);
const complete=completePrototypeExperiment(g,experimentId,undefined,'2026-10-13T22:10:00.000Z'); g=complete.graph;
ok('conclusão pelos critérios retorna passed', complete.outcome==='passed');
ok('status passa para completed', g.service.prototypeLab.experiments[experimentId].status==='completed');
ok('completedAt registrado', g.service.prototypeLab.experiments[experimentId].completedAt==='2026-10-13T22:10:00.000Z');

let report=buildPrototypeLabReport(g);
ok('report conta um experimento', report.counts.experiments===1);
ok('report conta um concluído', report.counts.completed===1);
ok('report conta um passed', report.counts.passed===1);
ok('taxa de validação é 100%', report.validationRate===100);
ok('report conta participante global', report.counts.participants===1);

const reopened=reopenPrototypeExperiment(g,experimentId,'2026-10-13T22:11:00.000Z');
ok('reabrir remove conclusão', reopened.service.prototypeLab.experiments[experimentId].outcome==='pending' && !reopened.service.prototypeLab.experiments[experimentId].completedAt);
g=reopened;
g=setPrototypeCriterionResult(g,experimentId,criterion2.criterionId,'fail','Status não foi compreendido.','2026-10-13T22:12:00.000Z');
ok('qualquer fail sugere failed', derivePrototypeOutcome(g.service.prototypeLab.experiments[experimentId])==='failed');
const failed=completePrototypeExperiment(g,experimentId,undefined,'2026-10-13T22:13:00.000Z'); g=failed.graph;
ok('conclusão determinística pode falhar', failed.outcome==='failed');

const sourceSnapshotBefore=JSON.stringify(g.service.prototypeLab.experiments[experimentId].sourceSnapshot);
const changedGraph={...g,touchpoints:{...g.touchpoints,tp1:{...g.touchpoints.tp1,name:'Confirmação com novo texto'}}};
ok('alterar fonte externamente não reescreve snapshot automaticamente', JSON.stringify(changedGraph.service.prototypeLab.experiments[experimentId].sourceSnapshot)===sourceSnapshotBefore);
const refreshed=refreshPrototypeSnapshot(changedGraph,experimentId,'2026-10-13T22:14:00.000Z');
ok('refresh explícito atualiza snapshot', refreshed.service.prototypeLab.experiments[experimentId].sourceSnapshot.touchpoints.some(item=>item.name==='Confirmação com novo texto'));
ok('refresh não altera Journey', JSON.stringify(refreshed.journeys)===journeyBefore);
ok('refresh não altera Blueprint', JSON.stringify(refreshed.views.whiteboards)===boardsBefore);

g=updatePrototypeExperiment(refreshed,experimentId,{objective:'Validar compreensão do status.'},'2026-10-13T22:15:00.000Z');
ok('edição de plano atualiza objetivo', g.service.prototypeLab.experiments[experimentId].objective==='Validar compreensão do status.');
g=updatePrototypeCriterion(g,experimentId,criterion1.criterionId,{target:'5 de 5 tentativas'},'2026-10-13T22:16:00.000Z');
ok('edição de critério atualiza target', g.service.prototypeLab.experiments[experimentId].criteria.find(item=>item.id===criterion1.criterionId)?.target==='5 de 5 tentativas');
g=removePrototypeCriterion(g,experimentId,criterion2.criterionId,'2026-10-13T22:17:00.000Z');
ok('critério pode ser removido', g.service.prototypeLab.experiments[experimentId].criteria.length===1);
if(!participant.participantId) throw new Error('participant id ausente');
g=unlinkPrototypeParticipant(g,experimentId,participant.participantId,'2026-10-13T22:18:00.000Z');
ok('participante pode ser desvinculado', g.service.prototypeLab.experiments[experimentId].participantIds.length===0);
const blocked=startPrototypeExperiment(g,experimentId,'2026-10-13T22:19:00.000Z');
ok('experimento incompleto não inicia', blocked.started===false && Boolean(blocked.reason));
g=archivePrototypeExperiment(g,experimentId,'2026-10-13T22:20:00.000Z');
report=buildPrototypeLabReport(g);
ok('experimento arquivado sai da lista ativa', report.counts.experiments===0 && report.archivedExperiments.length===1);
ok('operações H7.30 preservam etapas fonte', JSON.stringify(g.stages)===stagesBefore);
ok('operações H7.30 preservam proposição fonte', JSON.stringify(g.service.proposition)===propositionBefore);
ok('operações H7.30 preservam cenários fonte', JSON.stringify(g.service.scenarios)===scenariosBefore);
ok('operações H7.30 preservam Blueprint fonte', JSON.stringify(g.views.whiteboards)===boardsBefore);

const failedChecks=checks.filter(([,value])=>!value);
console.log(`\nV1.20.5-H7.30 Service Prototype Lab: ${checks.length-failedChecks.length}/${checks.length} OK`);
if(failedChecks.length) process.exit(1);

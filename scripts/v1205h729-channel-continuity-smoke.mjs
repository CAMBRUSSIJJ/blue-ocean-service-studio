import fs from 'node:fs';
import {
  CHANNEL_KIND_META, CONTINUITY_DIMENSIONS, assignTouchpointChannel, buildChannelContinuityReport,
  createServiceChannel, inferChannelKind, materializeLegacyChannels, removeServiceChannel,
  setChannelHandoffNote, setChannelHandoffRating, updateServiceChannel,
} from '../src/services/channel-continuity.ts';

const checks=[]; const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const read=(p)=>fs.readFileSync(p,'utf8');
const model=read('src/domain/model.ts');
const schema=read('src/domain/schema.ts');
const controller=read('src/state/useStudioController.ts');
const journeyView=read('src/views/JourneyView.tsx');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const channelView=read('src/views/ChannelContinuityView.tsx');
const service=read('src/services/channel-continuity.ts');
const css=read('src/runtime/channel-continuity-h729.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');

ok('modelo define ServiceChannelKind', model.includes("export type ServiceChannelKind = 'digital' | 'messaging' | 'phone'"));
ok('modelo define ServiceChannel', model.includes('export type ServiceChannel = {'));
ok('canal guarda serviceId', model.includes('serviceId: Id;'));
ok('canal guarda tipo', model.includes('kind: ServiceChannelKind'));
ok('canal pode guardar owner', model.includes('owner?: string'));
ok('modelo define rating de continuidade', model.includes("export type ChannelContinuityRating = 'unknown' | 'pass' | 'fail'"));
ok('modelo define cinco dimensões', model.includes("export type ChannelContinuityDimension = 'context' | 'identity' | 'ownership' | 'expectation' | 'status'"));
ok('modelo define assessment de handoff', model.includes('export type ChannelHandoffAssessment = {'));
ok('touchpoint mantém label legado', model.includes('channel: string;'));
ok('touchpoint referencia canal canônico', model.includes('channelId?: Id'));
ok('ServiceGraph expõe canais', model.includes('channels?: Record<Id, ServiceChannel>'));
ok('ServiceGraph expõe handoffs', model.includes('channelHandoffs?: Record<Id, ChannelHandoffAssessment>'));

ok('schema valida tipos de canal', schema.includes("const channelKind=z.enum(['digital','messaging','phone','email','in_person','physical','partner','system','other'])"));
ok('schema valida entidade canal', schema.includes('const channel=z.object'));
ok('schema valida ratings do handoff', schema.includes('const handoffRatings=z.object'));
ok('schema aceita channelId no touchpoint', schema.includes('channelId:id.optional()'));
ok('schema migra channels ausente para {}', schema.includes('channels:z.record(id,channel).default({})'));
ok('schema migra handoffs ausente para {}', schema.includes('channelHandoffs:z.record(id,channelHandoff).default({})'));

ok('domínio expõe materialização legada', service.includes('materializeLegacyChannels'));
ok('domínio cria canal canônico', service.includes('createServiceChannel'));
ok('domínio atualiza canal', service.includes('updateServiceChannel'));
ok('domínio protege remoção de canal em uso', service.includes('Realoque os touchpoints antes de excluir'));
ok('domínio associa touchpoint a channelId', service.includes('assignTouchpointChannel'));
ok('domínio mantém label legado sincronizado', service.includes('channel: channel.name'));
ok('domínio avalia handoff', service.includes('setChannelHandoffRating'));
ok('domínio guarda nota de handoff', service.includes('setChannelHandoffNote'));
ok('domínio deriva trocas entre etapas consecutivas', service.includes('journey.stages.length - 1'));
ok('domínio ignora permanência no mesmo canal', service.includes('if (fromChannelId === toChannelId) continue'));
ok('domínio mede cobertura de touchpoints', service.includes('mappedTouchpointCoverage'));
ok('domínio mede cobertura de avaliação', service.includes('assessmentCoverage'));
ok('domínio mede score de continuidade', service.includes('continuityScore'));
ok('domínio gera issues para touchpoint sem canal', service.includes('Touchpoint sem canal classificado'));
ok('domínio gera issues para troca não avaliada', service.includes('Troca de canal ainda não avaliada'));
ok('domínio gera issues para quebra de continuidade', service.includes('Quebra de continuidade'));
ok('há cinco dimensões de continuidade', CONTINUITY_DIMENSIONS.length===5);
ok('dimensão contexto existe', CONTINUITY_DIMENSIONS.some(item=>item.key==='context'));
ok('dimensão identidade existe', CONTINUITY_DIMENSIONS.some(item=>item.key==='identity'));
ok('dimensão ownership existe', CONTINUITY_DIMENSIONS.some(item=>item.key==='ownership'));
ok('dimensão expectativa existe', CONTINUITY_DIMENSIONS.some(item=>item.key==='expectation'));
ok('dimensão status existe', CONTINUITY_DIMENSIONS.some(item=>item.key==='status'));
ok('metadata cobre nove tipos de canal', Object.keys(CHANNEL_KIND_META).length===9);
ok('inferência reconhece WhatsApp', inferChannelKind('WhatsApp')==='messaging');
ok('inferência reconhece telefone', inferChannelKind('Telefone')==='phone');
ok('inferência reconhece portal', inferChannelKind('Portal do cliente')==='digital');
ok('inferência reconhece presencial', inferChannelKind('Loja presencial')==='in_person');

ok('controller importa novo domínio', controller.includes("from '../services/channel-continuity'"));
ok('controller expõe assignTouchpointChannelId', controller.includes('assignTouchpointChannelId'));
ok('controller preserva updateTouchpointChannel legado', controller.includes('const updateTouchpointChannel'));
ok('update legado agora cria/resolve canal canônico', controller.includes('assignTouchpointChannelByName'));
ok('Journey usa report de canais', journeyView.includes('buildChannelContinuityReport'));
ok('Journey troca input livre por select canônico', journeyView.includes('<select value={point.channelId'));
ok('Journey separa conceito touchpoint/canal', journeyView.includes('Touchpoint é a interação; Canal é por onde ela acontece.'));
ok('Journey abre gestão de canais', journeyView.includes("detail: 'channels'"));

ok('Workspace possui tab channels', workspace.includes("'channels' | 'blueprint'"));
ok('Workspace inclui Canais na navegação', workspace.includes("['channels', 'Canais', 'channel']"));
ok('Workspace monta ChannelContinuityView', workspace.includes("workspaceTab === 'channels' && <ChannelContinuityView"));
ok('Workspace calcula channelReport', workspace.includes('buildChannelContinuityReport(graph)'));
ok('Workspace readiness inclui channelReady', workspace.includes('channelReady'));
ok('Workspace expõe 7 perspectivas', workspace.includes('workspaceReadiness}/7'));
ok('Overview explica omnichannel', workspace.includes('OMNICHANNEL'));
ok('Overview mostra cobertura dos touchpoints', workspace.includes('mappedTouchpointCoverage'));

ok('view H7.29 possui marker', channelView.includes('data-channel-continuity="7.29"'));
ok('view possui Mapa omnichannel', channelView.includes('Mapa omnichannel'));
ok('view possui Canais & touchpoints', channelView.includes('Canais & touchpoints'));
ok('view possui Handoffs', channelView.includes('Handoffs'));
ok('view diferencia canal de touchpoint', channelView.includes('WhatsApp é um canal'));
ok('view possui matriz Journey x canal', channelView.includes('bo-h729-matrix'));
ok('view permite criar canal', channelView.includes('Adicionar canal'));
ok('view permite classificar touchpoint', channelView.includes('setPointChannel'));
ok('view permite remover canal', channelView.includes('deleteChannel'));
ok('view mostra score de continuidade', channelView.includes('continuityScore'));
ok('view renderiza cinco dimensões', channelView.includes('CONTINUITY_DIMENSIONS.map'));
ok('view permite rating unknown/pass/fail', channelView.includes('ratingLabel.unknown'));
ok('view guarda nota do handoff', channelView.includes('Nota do handoff'));
ok('view mostra issues', channelView.includes('Pontos de atenção'));

ok('CSS H7.29 existe', fs.existsSync('src/runtime/channel-continuity-h729.css'));
ok('CSS H7.29 importado depois H7.28', style.indexOf('blueprint-semantic-h728.css') < style.indexOf('channel-continuity-h729.css'));
ok('CSS possui KPIs', css.includes('.bo-h729-kpis'));
ok('CSS possui matrix', css.includes('.bo-h729-matrix'));
ok('CSS possui channel grid', css.includes('.bo-h729-channel-grid'));
ok('CSS possui handoff cards', css.includes('.bo-h729-handoff-card'));
ok('CSS possui dimension grid', css.includes('.bo-h729-dimensions'));
ok('CSS é responsivo', css.includes('@media(max-width:680px)'));
ok('body recebe marker H7.29', main.includes("'bo-h729'"));
ok('package descreve H7.29', String(pkg.description).includes('H7.29 Channels + Touchpoints + Continuity'));
ok('script H7.29 registrado', Boolean(pkg.scripts['v1205h729:channel-continuity-smoke']));
ok('QA acumulado inclui H7.29', pkg.scripts.qa?.includes('v1205h729:channel-continuity-smoke'));
ok('preflight conhece service H7.29', preflight.includes('channel-continuity.ts'));
ok('preflight conhece view H7.29', preflight.includes('ChannelContinuityView.tsx'));
ok('preflight conhece CSS H7.29', preflight.includes('channel-continuity-h729.css'));
ok('preflight executa smoke H7.29', preflight.includes('v1205h729-channel-continuity-smoke.mjs'));

const graph={
  schemaVersion:3,
  service:{id:'svc',name:'Lavanderia',description:'',journeyIds:['j1'],createdAt:'2026-10-13T22:00:00.000Z',updatedAt:'2026-10-13T22:00:00.000Z'},
  journeys:{j1:{id:'j1',serviceId:'svc',name:'Jornada principal',stageIds:['s1','s2','s3']}},
  stages:{
    s1:{id:'s1',journeyId:'j1',title:'Descoberta',customerAction:'Pesquisa o serviço',emotion:'neutral',touchpointIds:['tp1'],problemIds:[],opportunityIds:[]},
    s2:{id:'s2',journeyId:'j1',title:'Agendamento',customerAction:'Agenda a coleta',emotion:'neutral',touchpointIds:['tp2'],problemIds:[],opportunityIds:[]},
    s3:{id:'s3',journeyId:'j1',title:'Entrega',customerAction:'Recebe as roupas',emotion:'positive',touchpointIds:['tp3','tp4'],problemIds:[],opportunityIds:[]},
  },
  touchpoints:{
    tp1:{id:'tp1',serviceId:'svc',name:'Página de preços',channel:'Digital'},
    tp2:{id:'tp2',serviceId:'svc',name:'Confirmação do agendamento',channel:'WhatsApp'},
    tp3:{id:'tp3',serviceId:'svc',name:'Entrega no balcão',channel:'Presencial'},
    tp4:{id:'tp4',serviceId:'svc',name:'Recibo da entrega',channel:'Não classificado'},
  },
  problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},
  entities:{},research:{sources:{},projects:{},observations:{},collections:{}},
  views:{whiteboards:{bp1:{id:'bp1',serviceId:'svc',name:'Blueprint',journeyId:'j1',viewKind:'blueprint',items:{x:{id:'x',kind:'free',shape:'note',text:'Não alterar',x:10,y:10,width:120,height:80,blueprintStageId:'s1',blueprintLane:'frontstage'}},edges:{}}}},
};
const blueprintBefore=JSON.stringify(graph.views.whiteboards);
const migrated=materializeLegacyChannels(graph,'2026-10-13T22:01:00.000Z');
ok('materialização cria quatro canais legados', migrated.createdChannelIds.length===4);
ok('materialização conecta quatro touchpoints', migrated.linkedTouchpointIds.length===4);
ok('materialização preserva label legado', migrated.graph.touchpoints.tp2.channel==='WhatsApp');
ok('materialização adiciona channelId', Boolean(migrated.graph.touchpoints.tp2.channelId));
ok('materialização não altera Blueprint', JSON.stringify(migrated.graph.views.whiteboards)===blueprintBefore);
let report=buildChannelContinuityReport(migrated.graph);
ok('report exclui Não classificado da contagem útil', report.channelCount===3);
ok('report conta quatro touchpoints', report.touchpointCount===4);
ok('report marca três touchpoints classificados', report.mappedTouchpointCount===3);
ok('cobertura inicial é 75%', report.mappedTouchpointCoverage===75);
ok('report deriva duas trocas entre canais classificados', report.transitions.length===2);
ok('report conta duas ocorrências de troca', report.switchCount===2);
ok('report identifica touchpoint sem classificação', report.unclassifiedTouchpointIds.includes('tp4'));
ok('report gera issue de classificação', report.issues.some(issue=>issue.touchpointId==='tp4'));
ok('report gera handoff Digital → WhatsApp', report.transitions.some(item=>item.fromName==='Digital' && item.toName==='WhatsApp'));
ok('report gera handoff WhatsApp → Presencial', report.transitions.some(item=>item.fromName==='WhatsApp' && item.toName==='Presencial'));
ok('handoffs nascem não avaliados', report.transitions.every(item=>item.score===null));

const first=report.transitions.find(item=>item.fromName==='Digital' && item.toName==='WhatsApp');
if(!first) throw new Error('handoff de teste ausente');
let g=migrated.graph;
g=setChannelHandoffRating(g,first.fromChannelId,first.toChannelId,'context','pass','2026-10-13T22:02:00.000Z');
g=setChannelHandoffRating(g,first.fromChannelId,first.toChannelId,'identity','pass','2026-10-13T22:03:00.000Z');
g=setChannelHandoffRating(g,first.fromChannelId,first.toChannelId,'ownership','pass','2026-10-13T22:04:00.000Z');
g=setChannelHandoffRating(g,first.fromChannelId,first.toChannelId,'expectation','pass','2026-10-13T22:05:00.000Z');
g=setChannelHandoffRating(g,first.fromChannelId,first.toChannelId,'status','fail','2026-10-13T22:06:00.000Z');
g=setChannelHandoffNote(g,first.fromChannelId,first.toChannelId,'Status some na troca de canal.','2026-10-13T22:07:00.000Z');
report=buildChannelContinuityReport(g);
const assessed=report.transitions.find(item=>item.key===first.key);
ok('handoff avaliado tem cinco dimensões', assessed?.assessedDimensions===5);
ok('quatro passes e uma falha resultam 80', assessed?.score===80);
ok('score geral usa handoff avaliado', report.continuityScore===80);
ok('cobertura de avaliação é 50% com um de dois handoffs completo', report.assessmentCoverage===50);
ok('issue identifica quebra de Status', report.issues.some(issue=>issue.id.includes(':status')));
ok('nota de handoff persiste', assessed?.assessment?.note==='Status some na troca de canal.');
ok('avaliação não altera Blueprint', JSON.stringify(g.views.whiteboards)===blueprintBefore);

let created=createServiceChannel({graph:g,name:'E-mail',kind:'email',now:'2026-10-13T22:08:00.000Z'});
ok('criação de canal retorna id', Boolean(created.channelId));
ok('criação registra canal E-mail', Object.values(created.graph.channels??{}).some(item=>item.name==='E-mail'&&item.kind==='email'));
const duplicate=createServiceChannel({graph:created.graph,name:' e-MAIL ',kind:'other',now:'2026-10-13T22:09:00.000Z'});
ok('criação duplicada é idempotente por nome normalizado', duplicate.created===false && duplicate.channelId===created.channelId);
if(!created.channelId) throw new Error('email id ausente');
g=assignTouchpointChannel(created.graph,'tp4',created.channelId,'2026-10-13T22:10:00.000Z');
ok('assign grava channelId no touchpoint', g.touchpoints.tp4.channelId===created.channelId);
ok('assign sincroniza label legado', g.touchpoints.tp4.channel==='E-mail');
report=buildChannelContinuityReport(g);
ok('cobertura sobe para 100%', report.mappedTouchpointCoverage===100);
ok('touchpoint deixa lista unclassified', !report.unclassifiedTouchpointIds.includes('tp4'));
ok('novo canal pode criar novo handoff derivado', report.transitions.some(item=>item.toName==='E-mail'));
g=updateServiceChannel(g,created.channelId,{name:'E-mail transacional',description:'Confirmações e comprovantes.'},'2026-10-13T22:11:00.000Z');
ok('renomear canal atualiza entidade', g.channels?.[created.channelId]?.name==='E-mail transacional');
ok('renomear canal atualiza label legado do touchpoint', g.touchpoints.tp4.channel==='E-mail transacional');
const blocked=removeServiceChannel(g,created.channelId,'2026-10-13T22:12:00.000Z');
ok('remoção de canal usado é bloqueada', blocked.removed===false && blocked.reason?.includes('Realoque'));
const unused=createServiceChannel({graph:g,name:'Parceiro externo',kind:'partner',now:'2026-10-13T22:13:00.000Z'});
if(!unused.channelId) throw new Error('unused id ausente');
const removed=removeServiceChannel(unused.graph,unused.channelId,'2026-10-13T22:14:00.000Z');
ok('canal sem uso pode ser removido', removed.removed===true && !removed.graph.channels?.[unused.channelId]);
ok('operações H7.29 preservam Journey', JSON.stringify(removed.graph.journeys)===JSON.stringify(graph.journeys));
ok('operações H7.29 preservam etapas', JSON.stringify(removed.graph.stages)===JSON.stringify(graph.stages));
ok('operações H7.29 preservam Blueprint', JSON.stringify(removed.graph.views.whiteboards)===blueprintBefore);

const failed=checks.filter(([,value])=>!value);
console.log(`\nV1.20.5-H7.29 Channels + Touchpoints + Continuity: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

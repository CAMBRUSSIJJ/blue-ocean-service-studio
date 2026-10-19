import fs from 'node:fs';
import {
  buildImprovementBacklogReport, createImprovementOpportunity, discoverImprovementProblems, emptyImprovementBacklogState,
  improvementPriorityBand, improvementPriorityScore, IMPROVEMENT_OPPORTUNITY_STATUS_LABELS, IMPROVEMENT_PRIORITY_LABELS,
  IMPROVEMENT_PROBLEM_STATUS_LABELS, IMPROVEMENT_SOURCE_LABELS, normalizeImprovementBacklogState, syncImprovementBacklog,
  updateImprovementOpportunity, updateImprovementProblem,
} from '../src/services/improvement-backlog.ts';

const checks=[]; const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const read=(p)=>fs.readFileSync(p,'utf8');
const model=read('src/domain/model.ts'), schema=read('src/domain/schema.ts'), service=read('src/services/improvement-backlog.ts');
const workspace=read('src/views/BlueprintWorkspaceView.tsx'), view=read('src/views/ImprovementBacklogView.tsx'), css=read('src/runtime/improvement-backlog-h734.css');
const style=read('src/style.css'), main=read('src/main.tsx'), pkg=JSON.parse(read('package.json')), preflight=read('preflight-linux.sh');

for(const [label,needle] of [
 ['modelo define sete origens',"export type ImprovementSourceKind = 'research' | 'validated_problem' | 'journey' | 'channel' | 'prototype' | 'current_future' | 'blueprint'"],
 ['modelo define cinco status de problema',"export type ImprovementProblemStatus = 'new' | 'triaged' | 'accepted' | 'resolved' | 'dismissed'"],
 ['modelo define quatro status de oportunidade',"export type ImprovementOpportunityStatus = 'candidate' | 'selected' | 'planned' | 'discarded'"],
 ['modelo define bandas de prioridade',"export type ImprovementPriorityBand = 'low' | 'medium' | 'high' | 'critical'"],
 ['modelo define source ref','export type ImprovementSourceRef = {'],['source ref possui kind','kind: ImprovementSourceKind;'],['source ref possui sourceId','sourceId: string;'],
 ['modelo define improvement problem','export type ServiceImprovementProblem = {'],['problem possui sourceKey','sourceKey: string;'],['problem suporta múltiplas fontes','sourceRefs: ImprovementSourceRef[];'],['problem possui sourceActive','sourceActive: boolean;'],
 ['problem possui impacto','impact: 1 | 2 | 3 | 4 | 5;'],['problem possui frequência','frequency: 1 | 2 | 3 | 4 | 5;'],['problem possui esforço','effort: 1 | 2 | 3 | 4 | 5;'],['problem possui risco','risk: 1 | 2 | 3 | 4 | 5;'],['problem possui urgência','urgency: 1 | 2 | 3 | 4 | 5;'],
 ['problem possui owner','owner?: string;'],['problem possui evidenceIds','evidenceIds: Id[];'],['modelo define improvement opportunity','export type ServiceImprovementOpportunity = {'],['opportunity liga problemIds','problemIds: Id[];'],
 ['modelo define backlog state','export type ServiceImprovementBacklogState = {'],['backlog possui problems','problems: Record<Id, ServiceImprovementProblem>;'],['backlog possui opportunities','opportunities: Record<Id, ServiceImprovementOpportunity>;'],
 ['Service expõe improvementBacklog','improvementBacklog?: ServiceImprovementBacklogState;'],
]) ok(label,model.includes(needle));

for(const [label,needle] of [
 ['schema define source ref','const improvementSourceRef=z.object'],['schema valida sete origens',"kind:z.enum(['research','validated_problem','journey','channel','prototype','current_future','blueprint'])"],
 ['schema define problem','const improvementProblem=z.object'],['schema limita impacto 1..5','impact:z.number().int().min(1).max(5)'],['schema limita frequency 1..5','frequency:z.number().int().min(1).max(5)'],['schema limita effort 1..5','effort:z.number().int().min(1).max(5)'],['schema limita risk 1..5','risk:z.number().int().min(1).max(5)'],['schema limita urgency 1..5','urgency:z.number().int().min(1).max(5)'],
 ['schema valida status problema',"status:z.enum(['new','triaged','accepted','resolved','dismissed'])"],['schema define opportunity','const improvementOpportunity=z.object'],['schema valida status opportunity',"status:z.enum(['candidate','selected','planned','discarded'])"],
 ['schema define backlog','const serviceImprovementBacklog=z.object'],['schema inclui improvementBacklog','improvementBacklog:serviceImprovementBacklog.optional()'],
]) ok(label,schema.includes(needle));

ok('labels expõem 7 origens',Object.keys(IMPROVEMENT_SOURCE_LABELS).length===7);
ok('labels expõem 5 status problema',Object.keys(IMPROVEMENT_PROBLEM_STATUS_LABELS).length===5);
ok('labels expõem 4 status oportunidade',Object.keys(IMPROVEMENT_OPPORTUNITY_STATUS_LABELS).length===4);
ok('labels expõem 4 bandas',Object.keys(IMPROVEMENT_PRIORITY_LABELS).length===4);
for(const name of ['emptyImprovementBacklogState','normalizeImprovementBacklogState','improvementPriorityScore','improvementPriorityBand','discoverImprovementProblems','syncImprovementBacklog','updateImprovementProblem','createImprovementOpportunity','updateImprovementOpportunity','buildImprovementBacklogReport']) ok(`domínio oferece ${name}`,service.includes(`function ${name}`));
ok('score é determinístico por fórmula',service.includes('problem.impact * 0.30')&&service.includes('problem.frequency * 0.20')&&service.includes('problem.risk * 0.15')&&service.includes('problem.urgency * 0.25')&&service.includes('(6 - problem.effort) * 0.10'));
ok('score não usa IA',!service.toLowerCase().includes('openai')&&!service.toLowerCase().includes('gemini'));
ok('descoberta inclui problemas validados',service.includes('validated-problem:'));
ok('descoberta inclui hipóteses pesquisa',service.includes('research-hypothesis:'));
ok('descoberta inclui Journey',service.includes('journey-problem:'));
ok('descoberta inclui handoffs',service.includes('channel-handoff:'));
ok('descoberta inclui touchpoint sem canal',service.includes('channel-unmapped:'));
ok('descoberta inclui protótipos',service.includes('prototype:'));
ok('descoberta inclui Current × Future',service.includes('current-future:'));
ok('descoberta inclui Blueprint órfão',service.includes('blueprint-orphan:'));
ok('Blueprint pode virar proveniência de problema canônico',service.includes('blueprintRefsForProblem'));
ok('sync preserva registro e refresca refs',service.includes('sourceRefs: mergeRefs(candidate.sourceRefs)'));
ok('sync desativa fonte desaparecida sem apagar',service.includes('sourceActive: false'));
ok('sync importa oportunidades legadas',service.includes('legacyOpportunities'));
ok('oportunidade nova exige problema válido',service.includes("if (!input.title.trim() || !validProblems.length)"));

for(const [label,needle] of [
 ['Workspace importa ImprovementBacklogView',"import { ImprovementBacklogView } from './ImprovementBacklogView'"],['Workspace importa report H7.34','buildImprovementBacklogReport'],['Workspace possui tab improvement',"'current-future' | 'improvement' | 'blueprint'"],['Workspace inclui Prioridades',"['improvement', 'Prioridades', 'problem']"],['Workspace monta ImprovementBacklogView',"workspaceTab === 'improvement' && <ImprovementBacklogView"],['Workspace readiness inclui improvementReady','improvementReady'],['Workspace expõe 12 perspectivas','workspaceReadiness}/12'],['Workspace preserva contrato H7.33','H7.33 legacy contract'],['Workspace raiz marca H7.34','data-improvement-backlog="7.34"'],['Overview possui card PRIORIZAR','<small>PRIORIZAR</small><strong>Problemas & Oportunidades</strong>'],['Overview possui classe H7.34','bo-h734-overview-flow'],['summary mostra problemas priorizados','problemas priorizados'],
]) ok(label,workspace.includes(needle));

for(const [label,needle] of [
 ['view marca H7.34','data-improvement-backlog="7.34"'],['view explica fila única','fila única de melhoria'],['view sincroniza fontes','Sincronizar fontes'],['view mostra problemas ativos','problemas ativos'],['view mostra críticos','CRÍTICOS'],['view mostra oportunidades','OPORTUNIDADES'],['view mostra origens ativas','ORIGENS ATIVAS'],['view filtra origem','IMPROVEMENT_SOURCE_LABELS'],['view filtra prioridade','IMPROVEMENT_PRIORITY_LABELS'],['view filtra status','IMPROVEMENT_PROBLEM_STATUS_LABELS'],['view mostra Impacto','Impacto'],['view mostra Frequência','Frequência'],['view mostra Esforço','Esforço'],['view mostra Risco','Risco'],['view mostra Urgência','Urgência'],['view mostra fórmula','30% impacto + 20% frequência + 15% risco + 25% urgência + 10% facilidade'],['view afirma score sem IA','Nenhuma IA altera o score'],['view mostra rastreabilidade','Rastreabilidade'],['view permite criar oportunidade','PROBLEMA → OPORTUNIDADE'],['view atualiza oportunidade','updateImprovementOpportunity'],
]) ok(label,view.includes(needle));
ok('CSS H7.34 possui hero',css.includes('.bo-h734-hero')); ok('CSS possui workbench',css.includes('.bo-h734-workbench')); ok('CSS possui prioridade crítica',css.includes('.bo-h734-priority.is-critical')); ok('CSS possui responsividade',css.includes('@media(max-width:700px)'));
ok('style importa H7.34',style.includes("@import './runtime/improvement-backlog-h734.css';")); ok('main ativa host H7.34',main.includes("'bo-h734'"));
ok('package possui smoke H7.34',Boolean(pkg.scripts['v1205h734:improvement-backlog-smoke'])); ok('qa inclui smoke H7.34',pkg.scripts.qa.includes('v1205h734:improvement-backlog-smoke')); ok('preflight inclui H7.34',preflight.includes('v1205h734-improvement-backlog-smoke.mjs'));

const now='2026-10-14T00:00:00.000Z';
const base={schemaVersion:3,persistenceRevision:1,service:{id:'service-1',name:'Lavanderia Azul',description:'',journeyIds:['journey-1'],createdAt:now,updatedAt:now,
 prototypeLab:{version:1,participants:{},experiments:{'exp-1':{id:'exp-1',serviceId:'service-1',title:'Coleta expressa',hypothesis:'Clientes valorizam coleta em 2h',fidelity:'concierge',status:'completed',outcome:'failed',stageIds:[],touchpointIds:[],participantIds:[],criteria:[{id:'c1',label:'Aceitação',result:'fail'}],observationNotes:[],sourceSnapshot:{capturedAt:now,stageIds:[],touchpoints:[]},createdAt:now,updatedAt:now,completedAt:now}},updatedAt:now},
 currentFuture:{version:1,current:{id:'current',perspective:'current',serviceId:'service-1',label:'Atual',capturedAt:now,sourceServiceUpdatedAt:now,entries:{'journey:journey-1':{id:'journey:journey-1',kind:'journey',sourceId:'journey-1',label:'Coleta',fields:{owner:'Operação'},sourceUpdatedAt:now}}},future:{id:'future',perspective:'future',serviceId:'service-1',label:'Futuro',capturedAt:now,sourceServiceUpdatedAt:now,entries:{'journey:journey-1':{id:'journey:journey-1',kind:'journey',sourceId:'journey-1',label:'Coleta',fields:{owner:'Time de Coleta'},sourceUpdatedAt:now}}},gapMetadata:{},projectedDecisionIds:[],updatedAt:now}},
 journeys:{'journey-1':{id:'journey-1',serviceId:'service-1',name:'Coleta',stageIds:['stage-1'],owner:'Operação',status:'active'}},stages:{'stage-1':{id:'stage-1',journeyId:'journey-1',title:'Agendamento',customerAction:'Agenda',emotion:'neutral',touchpointIds:['tp-1'],problemIds:['jp-1'],opportunityIds:[]}},
 touchpoints:{'tp-1':{id:'tp-1',serviceId:'service-1',name:'Confirmação',channel:'WhatsApp'}},channels:{'ch-1':{id:'ch-1',serviceId:'service-1',name:'Site',kind:'digital',createdAt:now,updatedAt:now},'ch-2':{id:'ch-2',serviceId:'service-1',name:'WhatsApp',kind:'messaging',createdAt:now,updatedAt:now}},
 channelHandoffs:{'handoff-1':{id:'handoff-1',serviceId:'service-1',fromChannelId:'ch-1',toChannelId:'ch-2',ratings:{context:'fail',identity:'pass',ownership:'fail',expectation:'pass',status:'pass'},createdAt:now,updatedAt:now}},
 problems:{'jp-1':{id:'jp-1',stageId:'stage-1',description:'Cliente repete endereço'}},opportunities:{'opp-1':{id:'opp-1',stageId:'stage-1',title:'Salvar endereço do cliente',problemIds:['jp-1'],taskIds:[],owner:'Produto'}},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{},projects:{},observations:{}},
 entities:{problem:{'vp-1':{id:'vp-1',type:'problem',serviceId:'service-1',title:'Prazo imprevisível',description:'Cliente não sabe quando a coleta acontece',severity:'high',priority:'critical',evidenceIds:['ev-1'],status:'validated'}},problemHypothesis:{'hyp-1':{id:'hyp-1',type:'problemHypothesis',serviceId:'service-1',title:'Confirmação confusa',description:'Mensagem pode gerar dúvida',status:'testing',evidenceIds:['ev-2']}},evidence:{'ev-1':{id:'ev-1',type:'evidence'},'ev-2':{id:'ev-2',type:'evidence'}}},
 views:{whiteboards:{'bp-1':{id:'bp-1',serviceId:'service-1',name:'Blueprint Coleta',journeyId:'journey-1',viewKind:'blueprint',layoutMode:'blueprint',items:{},edges:{},designContext:{version:1,source:'service-definition',createdAt:now,personaIds:[],needIds:[],jobIds:[],painIds:[],problemIds:['vp-1'],evidenceIds:[]},updatedAt:now},'bp-orphan':{id:'bp-orphan',serviceId:'service-1',name:'Blueprint Futuro',viewKind:'blueprint',layoutMode:'blueprint',items:{},edges:{},updatedAt:now}}}};

ok('estado vazio inicia sem problemas',Object.keys(emptyImprovementBacklogState(now).problems).length===0);
ok('estado vazio inicia sem oportunidades',Object.keys(emptyImprovementBacklogState(now).opportunities).length===0);
ok('score máximo é 100',improvementPriorityScore({impact:5,frequency:5,effort:1,risk:5,urgency:5})===100);
ok('score baseline 3/3/3/3/3 é 60',improvementPriorityScore({impact:3,frequency:3,effort:3,risk:3,urgency:3})===60);
ok('score mínimo testado é 20',improvementPriorityScore({impact:1,frequency:1,effort:5,risk:1,urgency:1})===20);
ok('band 80 é crítica',improvementPriorityBand(80)==='critical'); ok('band 79 é alta',improvementPriorityBand(79)==='high'); ok('band 65 é alta',improvementPriorityBand(65)==='high'); ok('band 64 é média',improvementPriorityBand(64)==='medium'); ok('band 45 é média',improvementPriorityBand(45)==='medium'); ok('band 44 é baixa',improvementPriorityBand(44)==='low');
const discovered=discoverImprovementProblems(base);
ok('descobre 8 sinais distintos',discovered.length===8);
for(const [prefix,label] of [['validated-problem:','problema validado'],['research-hypothesis:','pesquisa'],['journey-problem:','Journey'],['channel-handoff:','handoff'],['channel-unmapped:','touchpoint sem canal'],['prototype:','protótipo'],['current-future:','Current × Future'],['blueprint-orphan:','Blueprint órfão']]) ok(`descobre ${label}`,discovered.some((item)=>item.sourceKey.startsWith(prefix)));
const validated=discovered.find((item)=>item.sourceKey==='validated-problem:vp-1'); ok('problema validado carrega evidência',validated?.evidenceIds.includes('ev-1')); ok('problema validado também carrega proveniência Blueprint',validated?.sourceRefs.some((ref)=>ref.kind==='blueprint'&&ref.sourceId==='bp-1')); ok('severidade high vira impacto 4',validated?.impact===4); ok('prioridade critical vira urgência 5',validated?.urgency===5);
const handoff=discovered.find((item)=>item.sourceKey==='channel-handoff:handoff-1'); ok('handoff descreve canais',handoff?.title.includes('Site')&&handoff?.title.includes('WhatsApp')); ok('handoff com 2 falhas eleva risco para 4',handoff?.risk===4);
const prototype=discovered.find((item)=>item.sourceKey==='prototype:exp-1'); ok('protótipo falho vira risco 4',prototype?.risk===4); ok('critério falho eleva urgência 4',prototype?.urgency===4);
const cf=discovered.find((item)=>item.sourceKey.startsWith('current-future:')); ok('gap preserva atual',cf?.description.includes('Operação')); ok('gap preserva futuro',cf?.description.includes('Time de Coleta'));

const canonicalBefore=JSON.stringify({journeys:base.journeys,stages:base.stages,touchpoints:base.touchpoints,channels:base.channels,handoffs:base.channelHandoffs,problems:base.problems,opportunities:base.opportunities,views:base.views,entities:base.entities});
let synced=syncImprovementBacklog(structuredClone(base),now); let graph=synced.graph; let state=normalizeImprovementBacklogState(graph,now);
ok('primeiro sync adiciona 8 problemas',synced.added===8); ok('primeiro sync não refresca existentes',synced.refreshed===0); ok('primeiro sync importa oportunidade legada',synced.importedOpportunities===1); ok('estado persiste 8 problemas',Object.keys(state.problems).length===8); ok('estado persiste 1 oportunidade',Object.keys(state.opportunities).length===1);
ok('sync não muta objetos canônicos',JSON.stringify({journeys:graph.journeys,stages:graph.stages,touchpoints:graph.touchpoints,channels:graph.channels,handoffs:graph.channelHandoffs,problems:graph.problems,opportunities:graph.opportunities,views:graph.views,entities:graph.entities})===canonicalBefore);
const second=syncImprovementBacklog(graph,'2026-10-14T00:01:00.000Z'); graph=second.graph; ok('sync é idempotente para adição',second.added===0); ok('segundo sync refresca 8',second.refreshed===8); ok('sync não duplica oportunidade legada',second.importedOpportunities===0); ok('continua com 8 problemas',Object.keys(normalizeImprovementBacklogState(graph).problems).length===8);
let report=buildImprovementBacklogReport(graph); ok('report backlogReady true',report.backlogReady); ok('report conta 8 ativos',report.counts.active===8); ok('report conta 1 oportunidade',report.counts.opportunities===1); ok('report ordena por score desc',report.problems.every((item,index,array)=>index===0||array[index-1].score>=item.score)); ok('sourceCounts Journey > 0',report.sourceCounts.journey>0); ok('sourceCounts Blueprint > 0',report.sourceCounts.blueprint>0); ok('sourceCounts canais > 0',report.sourceCounts.channel>0);
const top=report.problems.find((item)=>item.sourceKey==='validated-problem:vp-1'); ok('validated problem é encontrado no report',Boolean(top));
if(top){ graph=updateImprovementProblem(graph,top.id,{impact:99,frequency:5,effort:1,risk:5,urgency:5,status:'accepted',owner:'Camila',note:'Prioridade máxima'},'2026-10-14T00:02:00.000Z'); }
report=buildImprovementBacklogReport(graph); const updated=report.problems.find((item)=>item.id===top?.id); ok('update limita impacto a 5',updated?.impact===5); ok('update persiste frequência',updated?.frequency===5); ok('update persiste esforço',updated?.effort===1); ok('update persiste status',updated?.status==='accepted'); ok('update persiste owner',updated?.owner==='Camila'); ok('update persiste nota',updated?.note==='Prioridade máxima'); ok('priorização recalcula score 100',updated?.score===100); ok('priorização recalcula banda critical',updated?.band==='critical');
const invalidOpp=createImprovementOpportunity(graph,{title:'',problemIds:[]},'2026-10-14T00:03:00.000Z'); ok('opportunity inválida não é criada',invalidOpp.opportunityId===null&&invalidOpp.graph===graph);
const created=createImprovementOpportunity(graph,{id:'manual-opp',title:'Redesenhar promessa de coleta',problemIds:[top.id,'missing'],owner:'Camila',note:'Testar antes',status:'selected'},'2026-10-14T00:03:00.000Z'); ok('opportunity válida é criada',created.opportunityId==='manual-opp'); graph=created.graph; state=normalizeImprovementBacklogState(graph); ok('opportunity filtra problemId inexistente',state.opportunities['manual-opp'].problemIds.length===1); ok('opportunity persiste owner',state.opportunities['manual-opp'].owner==='Camila'); ok('opportunity persiste status selected',state.opportunities['manual-opp'].status==='selected');
graph=updateImprovementOpportunity(graph,'manual-opp',{status:'planned',title:'Nova promessa de coleta'},'2026-10-14T00:04:00.000Z'); state=normalizeImprovementBacklogState(graph); ok('update opportunity muda status',state.opportunities['manual-opp'].status==='planned'); ok('update opportunity muda título',state.opportunities['manual-opp'].title==='Nova promessa de coleta');
const withoutTouchpoint=structuredClone(graph); delete withoutTouchpoint.touchpoints['tp-1']; const third=syncImprovementBacklog(withoutTouchpoint,'2026-10-14T00:05:00.000Z'); state=normalizeImprovementBacklogState(third.graph); const unmapped=Object.values(state.problems).find((item)=>item.sourceKey==='channel-unmapped:tp-1'); ok('fonte removida não apaga histórico',Boolean(unmapped)); ok('fonte removida fica inativa',unmapped?.sourceActive===false); ok('sync reporta deactivation',third.deactivated===1); report=buildImprovementBacklogReport(third.graph); ok('problema inativo sai de active count',report.counts.active===7); ok('histórico total permanece 8',report.counts.problems===8);

const failed=checks.filter(([,value])=>!value); console.log(`\nH7.34 Problems, Opportunities & Prioritization: ${checks.length-failed.length}/${checks.length} PASS`); if(failed.length){console.error(failed.map(([label])=>label).join('\n'));process.exit(1)};

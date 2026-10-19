import fs from 'node:fs';
import {
  buildServicePropositionReport, createWhatIfScenario, promoteWhatIfScenario, propositionStatement,
  saveServiceProposition, scenarioDifferences, updateWhatIfScenarioStatus,
} from '../src/services/service-proposition.ts';

const checks=[]; const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const read=(p)=>fs.readFileSync(p,'utf8');
const model=read('src/domain/model.ts');
const schema=read('src/domain/schema.ts');
const service=read('src/services/service-proposition.ts');
const view=read('src/views/ServicePropositionView.tsx');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const css=read('src/runtime/service-proposition-h727.css');
const style=read('src/style.css');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');

ok('modelo define ServiceProposition', model.includes('export type ServiceProposition = {'));
ok('modelo define ServicePropositionState', model.includes('export type ServicePropositionState = {'));
ok('serviço guarda proposition opcional', model.includes('proposition?: ServicePropositionState'));
ok('proposição liga insights', model.includes('linkedInsightIds: Id[]'));
ok('proposição liga necessidades', model.includes('linkedNeedIds: Id[]'));
ok('proposição liga problemas', model.includes('linkedProblemIds: Id[]'));
ok('proposição liga evidências', model.includes('linkedEvidenceIds: Id[]'));
ok('cenário suporta status', model.includes("export type ServiceScenarioStatus = 'draft' | 'testing' | 'accepted' | 'rejected'"));
ok('cenário suporta hipótese What-if', model.includes('hypothesis?: string'));
ok('cenário suporta patch da proposição', model.includes('propositionPatch?: Partial<ServiceProposition>'));
ok('cenário suporta critérios de sucesso', model.includes('successCriteria?: string[]'));
ok('schema valida ServiceProposition', schema.includes('const serviceProposition=z.object'));
ok('schema mantém proposition opcional e retrocompatível', schema.includes('proposition:servicePropositionState.optional()'));

ok('serviço H7.27 existe', fs.existsSync('src/services/service-proposition.ts'));
ok('normalização de proposição existe', service.includes('normalizeServicePropositionState'));
ok('proposição herda definition quando disponível', service.includes("definition?.promise") && service.includes("definition?.outcome"));
ok('statement determinístico existe', service.includes('propositionStatement'));
ok('readiness determinístico existe', service.includes('readinessScore'));
ok('report aponta gaps', service.includes('gaps.push'));
ok('report exige fonte conectada', service.includes('sourceCount > 0'));
ok('salvar proposição não toca Blueprint', !service.includes('views.whiteboards') && !service.includes('blueprintDraft'));
ok('criação de What-if existe', service.includes('createWhatIfScenario'));
ok('cenário usa baseline current', service.includes("baselineScenarioId: 'current'"));
ok('cenário é alternative', service.includes("kind: 'alternative'"));
ok('cenário nasce draft', service.includes("status: 'draft'"));
ok('promoção de cenário existe', service.includes('promoteWhatIfScenario'));
ok('promoção atualiza proposição', service.includes('proposition: { version: 1, current, updatedAt: now }'));
ok('promoção marca cenário aceito', service.includes("status: 'accepted'"));
ok('promoção não altera Blueprint', !service.includes('viewKind') && !service.includes('frontstage'));
ok('comparação de cenários existe', service.includes('scenarioDifferences'));
ok('remoção de cenário existe', service.includes('removeWhatIfScenario'));

ok('view dedicada existe', fs.existsSync('src/views/ServicePropositionView.tsx'));
ok('view expõe marker H7.27', view.includes('data-service-proposition="7.27"'));
ok('view possui aba Proposição', view.includes('Proposição'));
ok('view possui Cenários E se', view.includes('Cenários “E se?”'));
ok('view mostra Proposition Readiness', view.includes('PROPOSITION READINESS'));
ok('view possui statement', view.includes('PROPOSITION STATEMENT'));
ok('view conecta base da proposição', view.includes('BASE DA PROPOSIÇÃO'));
ok('view conecta Insights', view.includes("['Insights', 'linkedInsightIds'"));
ok('view conecta Necessidades', view.includes("['Necessidades', 'linkedNeedIds'"));
ok('view conecta Problemas', view.includes("['Problemas / hipóteses', 'linkedProblemIds'"));
ok('view conecta Evidências', view.includes("['Evidências', 'linkedEvidenceIds'"));
ok('view cria cenário What-if', view.includes('Novo cenário “E se?”'));
ok('view exige pergunta E se', view.includes('Pergunta “E se?”'));
ok('view compara atual e alternativa', view.includes('ATUAL') && view.includes('ALTERNATIVA'));
ok('view expõe diferenças', view.includes('O que muda?'));
ok('view expõe critérios de sucesso', view.includes('Critérios de sucesso'));
ok('view permite colocar cenário em teste', view.includes('Colocar em teste'));
ok('view promove apenas à proposição atual', view.includes('Promover à proposição atual'));
ok('view avisa Blueprint protegido', view.includes('Blueprint protegido'));
ok('view afirma que Blueprint permanece inalterado', view.includes('O Blueprint permanece inalterado'));

ok('Workspace incorpora Proposição', workspace.includes("type WorkspaceTab = 'overview' | 'research' | 'ecology' | 'proposition' | 'journey' | 'blueprint' | 'whiteboard'"));
ok('Proposição aparece entre Ecologia e Journey', workspace.indexOf("['ecology', 'Ecologia', 'service']") < workspace.indexOf("['proposition', 'Proposição', 'solution']") && workspace.indexOf("['proposition', 'Proposição', 'solution']") < workspace.indexOf("['journey', 'Journey', 'journey']"));
ok('Workspace renderiza ServicePropositionView', workspace.includes("workspaceTab === 'proposition' && <ServicePropositionView"));
ok('readiness passa a seis perspectivas', workspace.includes('workspaceReadiness}/6'));
ok('overview explica seis perspectivas', workspace.includes('Um serviço, seis perspectivas conectadas'));
ok('overview inclui Proposição no fluxo', workspace.includes("selectWorkspaceTab('proposition')") && workspace.includes('Transforme insights em uma promessa explícita'));
ok('header mostra readiness da proposição', workspace.includes('propositionReport.readinessScore'));
ok('workspace expõe marker H7.27', workspace.includes('data-service-proposition="7.27"'));

ok('CSS H7.27 existe', fs.existsSync('src/runtime/service-proposition-h727.css'));
ok('CSS H7.27 importado após H7.26', style.indexOf('research-studio-h726.css') < style.indexOf('service-proposition-h727.css'));
ok('CSS possui layout de proposição', css.includes('.bo-h727-proposition-layout'));
ok('CSS possui comparação', css.includes('.bo-h727-compare-grid'));
ok('CSS possui lock do Blueprint', css.includes('.bo-h727-blueprint-lock'));
ok('CSS possui responsividade', css.includes('@media(max-width:720px)'));

ok('script H7.27 registrado', Boolean(pkg.scripts['v1205h727:service-proposition-smoke']));
ok('QA acumulado inclui H7.27', pkg.scripts.qa?.includes('v1205h727:service-proposition-smoke'));
ok('package descreve H7.27', String(pkg.description).includes('H7.27 Service Proposition + What-if Scenarios'));
ok('preflight conhece H7.27', preflight.includes('service-proposition-h727.css') && preflight.includes('v1205h727-service-proposition-smoke.mjs'));

let graph={schemaVersion:3,entities:{insight:{i1:{id:'i1',type:'insight',serviceId:'svc',title:'Previsibilidade reduz ansiedade'}},need:{n1:{id:'n1',type:'need',serviceId:'svc',title:'Saber quando a coleta acontecerá'}},problemHypothesis:{p1:{id:'p1',type:'problemHypothesis',serviceId:'svc',title:'Falta de confirmação gera insegurança'}},evidence:{e1:{id:'e1',type:'evidence',serviceId:'svc',title:'7/10 clientes pediram confirmação'}}},research:{sources:{},projects:{},observations:{},collections:{}},views:{whiteboards:{bp1:{id:'bp1',serviceId:'svc',name:'Blueprint',viewKind:'blueprint',items:{},edges:{}}}},service:{id:'svc',name:'Lavanderia',description:'',journeyIds:[],createdAt:'2026-10-13T21:00:00.000Z',updatedAt:'2026-10-13T21:00:00.000Z'},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''}};
const blueprintBefore=JSON.stringify(graph.views.whiteboards);
graph=saveServiceProposition({graph,patch:{audience:'famílias com rotina corrida',problem:'incerteza na coleta',promise:'um serviço previsível de coleta e entrega',outcome:'resolver a lavanderia sem acompanhar manualmente',experience:'confirmação e visibilidade proativas',differentiator:'coordenação proativa',businessValue:'mais recorrência e menos atendimento',capabilities:['roteirização','notificações'],principles:['ser previsível'],linkedInsightIds:['i1'],linkedNeedIds:['n1'],linkedProblemIds:['p1'],linkedEvidenceIds:['e1']},status:'ready',now:'2026-10-13T21:01:00.000Z'});
let report=buildServicePropositionReport(graph);
ok('domínio salva proposição estruturada', report.current.promise.includes('previsível') && report.current.capabilities.length===2);
ok('domínio preserva fontes', report.sourceCount===4 && report.linkedInsights[0]?.id==='i1' && report.linkedEvidence[0]?.id==='e1');
ok('domínio calcula readiness alto', report.propositionReady===true && report.readinessScore>=80);
ok('statement nasce da proposição', propositionStatement(report.current).includes('famílias com rotina corrida') && propositionStatement(report.current).includes('resolver a lavanderia'));
ok('salvar proposição preserva Blueprint', JSON.stringify(graph.views.whiteboards)===blueprintBefore);

const created=createWhatIfScenario({graph,name:'Agendamento autônomo',description:'Cliente escolhe a janela sozinho',hypothesis:'E se o cliente agendasse sem atendimento?',patch:{promise:'agendamento autônomo e previsível',outcome:'agendar em menos de três minutos',experience:'autosserviço com confirmação instantânea',businessValue:'menos atendimento manual',capabilities:['agenda online','roteirização automática']},successCriteria:['80% concluem sem ajuda','tempo abaixo de 3 minutos'],insightIds:['i1'],needIds:['n1'],problemIds:['p1'],evidenceIds:['e1'],id:'s1',now:'2026-10-13T21:02:00.000Z'});
graph=created.graph;
report=buildServicePropositionReport(graph);
ok('domínio cria cenário sem duplicar entidades', report.scenarios.length===1 && Object.keys(graph.entities.insight).length===1 && Object.keys(graph.entities.evidence).length===1);
ok('cenário mantém hipótese', graph.service.scenarios.s1.hypothesis==='E se o cliente agendasse sem atendimento?');
ok('cenário mantém critérios de sucesso', graph.service.scenarios.s1.successCriteria.length===2);
ok('diferenças mostram patch sem mudar atual', scenarioDifferences(graph,'s1').some((item)=>item.field==='promise') && report.current.promise==='um serviço previsível de coleta e entrega');
ok('criar cenário preserva Blueprint', JSON.stringify(graph.views.whiteboards)===blueprintBefore);
graph=updateWhatIfScenarioStatus({graph,scenarioId:'s1',status:'testing',now:'2026-10-13T21:03:00.000Z'});
ok('cenário entra em teste', graph.service.scenarios.s1.status==='testing');
graph=promoteWhatIfScenario({graph,scenarioId:'s1',now:'2026-10-13T21:04:00.000Z'});
report=buildServicePropositionReport(graph);
ok('promoção atualiza proposição atual', report.current.promise==='agendamento autônomo e previsível');
ok('promoção marca cenário aceito', graph.service.scenarios.s1.status==='accepted' && Boolean(graph.service.scenarios.s1.promotedAt));
ok('promoção preserva rastreabilidade', report.current.linkedInsightIds.includes('i1') && report.current.linkedEvidenceIds.includes('e1'));
ok('promoção não altera Blueprint', JSON.stringify(graph.views.whiteboards)===blueprintBefore);
ok('promoção ativa cenário sem apagar outros estados', graph.service.scenarioState?.activeScenarioId==='s1' && graph.service.scenarioState?.mode==='single');

const failed=checks.filter(([,v])=>!v);
console.log(`\nV1.20.5-H7.27 Service Proposition + What-if Scenarios: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

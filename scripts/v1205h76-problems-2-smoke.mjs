import fs from 'node:fs';
import { buildProblemStudioReport, problemProfileFromEntity, updateProblemProfile } from '../src/services/problems-studio.ts';
import { removeContextEntity } from '../src/services/context-library.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const view=fs.readFileSync('src/views/ProblemsView.tsx','utf8');
const service=fs.readFileSync('src/services/problems-studio.ts','utf8');
const library=fs.readFileSync('src/views/WorkspaceLibraryView.tsx','utf8');
const app=fs.readFileSync('src/App.tsx','utf8');
const context=fs.readFileSync('src/services/context-library.ts','utf8');
const css=fs.readFileSync('src/runtime/problems-h76.css','utf8');
const style=fs.readFileSync('src/style.css','utf8');

ok('ProblemsView dedicada existe', view.includes('data-problems-h76="library"') && view.includes('data-problems-h76="detail"'));
ok('WorkspaceLibrary delega problemas', library.includes("if (page === 'problems') return <ProblemsView studio={studio}/>"));
ok('Problemas permite criação direta como rascunho', view.includes('Criar problema') && view.includes("status:'draft'"));
ok('CTA de problema abre cadastro próprio', view.includes('setCreateOpen(true)') && !view.includes("detail: 'hypotheses'"));
ok('App possui coordenador de página contextual', app.includes("window.addEventListener('bo-open-context-page'") && app.includes('openLibraryPage(page)'));
ok('Biblioteca tem filtros próprios', ['Prontos para definição','Base incompleta','Críticos','Com evidência'].every((x)=>view.includes(x)));
ok('Detalhe possui cinco abas próprias', ['Visão geral','Contexto','Evidências','Validação','Uso'].every((x)=>view.includes(x)));
ok('Problema possui campos de estrutura', ['rootCause','impact','affectedPopulation','observableSignal','severity','priority'].every((x)=>view.includes(x) && service.includes(x)));
ok('Qualidade é determinística', service.includes('qualityChecks') && service.includes('qualityScore') && service.includes('readyForDefinition'));
ok('Qualidade exige problema validado', service.includes("String(problem.status ?? '') === 'validated'"));
ok('Qualidade exige contexto e evidência', service.includes('connectionCounts.persona + connectionCounts.need + connectionCounts.job + connectionCounts.pain > 0') && service.includes('connectionCounts.evidence > 0'));
ok('Hipótese de origem é preservada', service.includes('sourceHypothesisId') && view.includes('A hipótese de origem faz parte da rastreabilidade'));
ok('Service Graph mantém problemIds', service.includes('problemIds: shouldLink') && context.includes("'problemIds'"));
ok('Remoção limpa vínculos problemIds', context.includes("'hypothesisIds', 'problemIds', 'evidenceIds'"));
ok('CSS H7.6 está antes do Tailwind', style.indexOf("@import './runtime/problems-h76.css';") >= 0 && style.indexOf("@import './runtime/problems-h76.css';") < style.indexOf('@tailwind base'));
ok('CSS tem layout de problema validado', css.includes('.bo-h76-overview-grid') && css.includes('.bo-h76-definition-status.is-ready'));
ok('CSS não usa verde estrutural legado', !css.toLowerCase().includes('#1d9e75'));

const now='2026-10-09T18:00:00.000Z';
const graph={
  schemaVersion:3,
  service:{id:'svc',name:'Teste',updatedAt:now,project:{definition:{problemIds:['pr1'],personaIds:[],evidenceIds:[]}}},
  entities:{
    problem:{pr1:{id:'pr1',type:'problem',serviceId:'svc',title:'Abandono por deslocamento',description:'Usuários abandonam por distância',impact:'Perda de adesão',status:'validated',sourceHypothesisId:'h1',evidenceIds:['e1'],relatedIds:['h1','p1','d1','e1'],createdAt:now,updatedAt:now}},
    problemHypothesis:{h1:{id:'h1',type:'problemHypothesis',serviceId:'svc',title:'Deslocamento causa abandono',status:'validated',validatedProblemId:'pr1',relatedIds:['pr1'],problemIds:['pr1'],createdAt:now,updatedAt:now}},
    persona:{p1:{id:'p1',type:'persona',serviceId:'svc',title:'Profissional',relatedIds:['pr1'],problemIds:['pr1'],createdAt:now,updatedAt:now}},
    need:{},job:{},
    pain:{d1:{id:'d1',type:'pain',serviceId:'svc',title:'Perder tempo',relatedIds:['pr1'],problemIds:['pr1'],createdAt:now,updatedAt:now}},
    evidence:{e1:{id:'e1',type:'evidence',serviceId:'svc',title:'Entrevistas',confidence:'high',relatedIds:['pr1'],problemIds:['pr1'],createdAt:now,updatedAt:now}},
  },
  views:{whiteboards:{}},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
};
const baseDraft=problemProfileFromEntity(graph.entities.problem.pr1);
const initial=buildProblemStudioReport(graph,'pr1');
ok('Domínio reconhece hipótese de origem', initial?.sourceHypothesis?.id === 'h1' && initial?.connectionCounts.problemHypothesis === 1);
ok('Domínio reconhece evidência existente', initial?.connectionCounts.evidence === 1 && initial?.evidenceConfidence.high === 1);
const draft={...baseDraft,rootCause:'Tempo de deslocamento incompatível com a rotina',affectedPopulation:'Profissionais que moram longe',observableSignal:'Abandono cresce após simulação de rota',severity:'high',priority:'critical'};
const updated=updateProblemProfile({graph,problemId:'pr1',draft,connectedIds:['h1','p1','d1','e1'],now:'2026-10-09T18:10:00.000Z'});
const report=buildProblemStudioReport(updated,'pr1');
ok('Domínio persiste estrutura avançada', updated.entities.problem.pr1.rootCause === 'Tempo de deslocamento incompatível com a rotina' && updated.entities.problem.pr1.priority === 'critical');
ok('Relação Problema↔Persona é bidirecional', updated.entities.problem.pr1.relatedIds.includes('p1') && updated.entities.persona.p1.relatedIds.includes('pr1') && updated.entities.persona.p1.problemIds.includes('pr1'));
ok('Relação Problema↔Dor é bidirecional', updated.entities.pain.d1.relatedIds.includes('pr1') && updated.entities.pain.d1.problemIds.includes('pr1'));
ok('Relação Problema↔Evidência é bidirecional', updated.entities.problem.pr1.evidenceIds.includes('e1') && updated.entities.evidence.e1.relatedIds.includes('pr1') && updated.entities.evidence.e1.problemIds.includes('pr1'));
ok('Hipótese de origem não pode sumir no update', updated.entities.problem.pr1.relatedIds.includes('h1') && updated.entities.problemHypothesis.h1.validatedProblemId === 'pr1');
ok('Qualidade chega a 100% com base completa', report?.qualityScore === 100 && report?.readyForDefinition === true);
const removed=removeContextEntity(updated,'problem','pr1');
ok('Remoção limpa rastreabilidade da hipótese', !removed.entities.problem.pr1 && removed.entities.problemHypothesis.h1.validatedProblemId === undefined && !removed.entities.problemHypothesis.h1.problemIds.includes('pr1'));
ok('Remoção limpa Service Definition', !removed.service.project.definition.problemIds.includes('pr1'));

const failed=checks.filter(([,v])=>!v);
console.log(`\nV1.20.5-H7.6 Problemas 2.0: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

import fs from 'node:fs';
import { buildHypothesisStudioReport, hypothesisProfileFromEntity, updateHypothesisProfile, validateHypothesisAsProblem } from '../src/services/hypotheses-studio.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const view=fs.readFileSync('src/views/HypothesesView.tsx','utf8');
const service=fs.readFileSync('src/services/hypotheses-studio.ts','utf8');
const library=fs.readFileSync('src/views/WorkspaceLibraryView.tsx','utf8');
const core=fs.readFileSync('src/services/problem-evidence-studio.ts','utf8');
const css=fs.readFileSync('src/runtime/hypotheses-h75.css','utf8');
const style=fs.readFileSync('src/style.css','utf8');

ok('HypothesesView dedicada existe', view.includes('data-hypotheses-h75="library"') && view.includes('data-hypotheses-h75="detail"'));
ok('WorkspaceLibrary delega hipóteses', library.includes("if (page === 'hypotheses') return <HypothesesView studio={studio}/>"));
ok('Biblioteca tem busca filtros e criação', view.includes('Buscar Hipóteses') && view.includes('Em validação') && view.includes('Criar Hipótese'));
ok('Detalhe tem cinco abas próprias', ['Visão geral','Contexto','Evidências','Validação','Uso'].every((x)=>view.includes(x)));
ok('Hipótese possui campos de teste próprios', ['premise','expectedBehavior','validationCriterion','impactIfWrong','confidence','riskLevel'].every((x)=>view.includes(x) && service.includes(x)));
ok('Evidência possui stance explícito', ['supports','contradicts','neutral'].every((x)=>view.includes(x) && core.includes(x)));
ok('UI nomeia sustenta contradiz contextual', ['Sustenta','Contradiz','Contextual'].every((x)=>view.includes(x)));
ok('Completude é determinística', service.includes('validationChecks') && service.includes('validationScore') && service.includes('readyToValidate'));
ok('Completude exige dor e contexto do cliente', service.includes('contextCounts.pain > 0') && service.includes('contextCounts.persona + contextCounts.need + contextCounts.job > 0'));
ok('Completude exige evidência e suporte', service.includes('core.evidenceConnections.length > 0') && service.includes('core.supportCount > 0'));
ok('Contradição forte bloqueia prontidão', service.includes('core.highConfidenceContradictionCount === 0'));
ok('Validação promove hipótese a problema', view.includes('Validar como Problema') && service.includes('validateProblemHypothesis'));
ok('Update reaproveita Problem Evidence Engine', service.includes('updateProblemHypothesis') && service.includes('buildProblemEvidenceStudioReport'));
ok('Criação usa timestamp explícito', view.includes("kind: 'problemHypothesis', title: createTitle, description: createDescription, now"));
ok('CSS H7.5 está antes do Tailwind', style.indexOf("@import './runtime/hypotheses-h75.css';") >= 0 && style.indexOf("@import './runtime/hypotheses-h75.css';") < style.indexOf('@tailwind base'));
ok('CSS diferencia estados da hipótese', css.includes('.bo-h75-status.is-testing') && css.includes('.bo-h75-status.is-validated'));
ok('CSS diferencia stance de evidência', css.includes('.is-supports') && css.includes('.is-contradicts') && css.includes('.is-neutral'));
ok('CSS não usa verde estrutural legado', !css.toLowerCase().includes('#1d9e75'));

const now='2026-10-09T16:00:00.000Z';
const graph={
  schemaVersion:3,
  service:{id:'svc',name:'Teste',updatedAt:now},
  entities:{
    problemHypothesis:{h1:{id:'h1',type:'problemHypothesis',serviceId:'svc',title:'Deslocamento causa abandono',description:'A distância reduz adesão',relatedIds:[],createdAt:now,updatedAt:now}},
    persona:{p1:{id:'p1',type:'persona',serviceId:'svc',title:'Profissional',relatedIds:[],createdAt:now,updatedAt:now}},
    need:{},job:{},
    pain:{d1:{id:'d1',type:'pain',serviceId:'svc',title:'Perder tempo no deslocamento',relatedIds:[],createdAt:now,updatedAt:now}},
    evidence:{e1:{id:'e1',type:'evidence',serviceId:'svc',title:'Entrevistas',confidence:'high',relatedIds:[],createdAt:now,updatedAt:now}},
    problem:{},
  },
  views:{whiteboards:{}},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
};
const draft={...hypothesisProfileFromEntity(graph.entities.problemHypothesis.h1),premise:'Pessoas valorizam conveniência',expectedBehavior:'Abandono cresce com a distância',validationCriterion:'70% citam deslocamento',impactIfWrong:'Priorizamos logística errada',confidence:'medium',riskLevel:'high'};
const updated=updateHypothesisProfile({graph,hypothesisId:'h1',draft,contextIds:['p1','d1'],evidenceLinks:[{evidenceId:'e1',stance:'supports'}],now:'2026-10-09T16:10:00.000Z'});
const report=buildHypothesisStudioReport(updated,'h1');
ok('Domínio persiste campos avançados', updated.entities.problemHypothesis.h1.premise === 'Pessoas valorizam conveniência' && updated.entities.problemHypothesis.h1.riskLevel === 'high');
ok('Relação hipótese↔Dor é bidirecional', updated.entities.problemHypothesis.h1.relatedIds.includes('d1') && updated.entities.pain.d1.relatedIds.includes('h1') && updated.entities.pain.d1.hypothesisIds.includes('h1'));
ok('Relação hipótese↔Persona é bidirecional', updated.entities.persona.p1.relatedIds.includes('h1') && updated.entities.persona.p1.hypothesisIds.includes('h1'));
ok('Evidência fica bidirecional e com stance', updated.entities.evidence.e1.relatedIds.includes('h1') && updated.entities.evidence.e1.hypothesisIds.includes('h1') && updated.entities.problemHypothesis.h1.evidenceLinks[0].stance === 'supports');
ok('Prontidão chega a 100% com base completa', report?.validationScore === 100 && report?.readyToValidate === true);
const validated=validateHypothesisAsProblem(updated,'h1','2026-10-09T16:20:00.000Z');
const validatedReport=buildHypothesisStudioReport(validated,'h1');
ok('Validação cria problema rastreável', validatedReport?.status === 'validated' && Boolean(validatedReport?.validatedProblem?.sourceHypothesisId === 'h1'));

const failed=checks.filter(([,v])=>!v);
console.log(`\nV1.20.5-H7.5 Hipóteses 2.0: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

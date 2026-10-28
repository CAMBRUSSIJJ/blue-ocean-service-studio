import fs from 'node:fs';
import { buildJobStudioReport, jobProfileFromEntity, updateJobProfile } from '../src/services/jobs-studio.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const view=fs.readFileSync('src/views/JobsView.tsx','utf8');
const service=fs.readFileSync('src/services/jobs-studio.ts','utf8');
const library=fs.readFileSync('src/views/WorkspaceLibraryView.tsx','utf8');
const css=fs.readFileSync('src/runtime/jobs-h73.css','utf8');
const style=fs.readFileSync('src/style.css','utf8');
const needs=fs.readFileSync('src/views/NeedsView.tsx','utf8');

ok('JobsView dedicada existe', view.includes('data-jobs-h73="library"') && view.includes('data-jobs-h73="detail"'));
ok('WorkspaceLibrary delega jobs para JobsView', library.includes("if (page === 'jobs') return <JobsView studio={studio}/>"));
ok('Biblioteca tem busca filtros e criação', view.includes('Buscar Jobs') && view.includes('Base incompleta') && view.includes('Criar Job'));
ok('Detalhe tem cinco abas', ['Visão geral','Pessoas','Relações','Evidências','Uso'].every((x)=>view.includes(x)));
ok('Job possui campos JTBD próprios', ['situation','desiredProgress','motivation','barriers','currentAlternative','successSignal'].every((x)=>view.includes(x) && service.includes(x)));
ok('Job Statement é apresentado no editor', view.includes('Quando… eu quero… para poder…'));
ok('Completude é determinística', service.includes('foundationChecks') && service.includes('readyForDesign'));
ok('Completude exige persona e evidência', service.includes('connectionCounts.persona > 0') && service.includes('connectionCounts.evidence > 0'));
ok('Completude exige contexto relacionado', service.includes('connectionCounts.need + connectionCounts.pain + connectionCounts.problemHypothesis + connectionCounts.problem > 0'));
ok('Relações incluem necessidade dor hipótese problema', ['need','pain','problemHypothesis','problem'].every((x)=>service.includes(`'${x}'`)));
ok('Update mantém jobIds e relatedIds', service.includes('jobIds') && service.includes('relatedIds'));
ok('Criação usa timestamp explícito sem entity.updatedAt', view.includes("kind: 'job', title, description, now") && view.includes('const createJob = (title = createTitle, description = createDescription)') && !view.includes('String(entity.updatedAt)'));
ok('Needs também usa timestamp explícito', needs.includes("kind: 'need', title, description, now") && needs.includes('const createNeed = (title = createTitle, description = createDescription)') && !needs.includes('String(entity.updatedAt)'));
ok('CSS H7.3 está antes do Tailwind', style.indexOf("@import './runtime/jobs-h73.css';") >= 0 && style.indexOf("@import './runtime/jobs-h73.css';") < style.indexOf('@tailwind base'));
ok('CSS cria Job Summary lateral', css.includes('.bo-h73-job-summary') && css.includes('position:sticky'));
ok('CSS não usa verde estrutural legado', !css.toLowerCase().includes('#1d9e75'));

const now='2026-10-08T22:00:00.000Z';
const graph={
  schemaVersion:3,
  service:{id:'svc',name:'Teste',updatedAt:now},
  entities:{
    job:{j1:{id:'j1',type:'job',serviceId:'svc',title:'Resolver rotina',description:'Progresso',relatedIds:[],createdAt:now,updatedAt:now}},
    persona:{p1:{id:'p1',type:'persona',serviceId:'svc',title:'Pessoa',relatedIds:[],createdAt:now,updatedAt:now}},
    need:{n1:{id:'n1',type:'need',serviceId:'svc',title:'Conveniência',relatedIds:[],createdAt:now,updatedAt:now}},
    pain:{},problemHypothesis:{},problem:{},evidence:{e1:{id:'e1',type:'evidence',serviceId:'svc',title:'Entrevista',confidence:'high',relatedIds:[],createdAt:now,updatedAt:now}},
  },
  views:{whiteboards:{}},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
};
const draft={...jobProfileFromEntity(graph.entities.job.j1),situation:'Quando a semana aperta',desiredProgress:'Ter roupas prontas',motivation:'Ganhar tempo',barriers:'Pouco tempo',currentAlternative:'Lavar de madrugada',successSignal:'Tudo pronto no prazo',importance:'high'};
const updated=updateJobProfile({graph,jobId:'j1',draft,connectedIds:['p1','n1','e1'],now:'2026-10-08T22:10:00.000Z'});
const report=buildJobStudioReport(updated,'j1');
ok('Domínio persiste campos do Job', updated.entities.job.j1.desiredProgress === 'Ter roupas prontas' && updated.entities.job.j1.motivation === 'Ganhar tempo');
ok('Relação Job↔Persona é bidirecional', updated.entities.job.j1.relatedIds.includes('p1') && updated.entities.persona.p1.relatedIds.includes('j1') && updated.entities.persona.p1.jobIds.includes('j1'));
ok('Relação Job↔Necessidade é bidirecional', updated.entities.need.n1.relatedIds.includes('j1') && updated.entities.need.n1.jobIds.includes('j1'));
ok('Evidência entra no relatório com confiança', report?.connectionCounts.evidence === 1 && report?.evidenceConfidence.high === 1);
ok('Completude reage aos dados preenchidos', (report?.foundationScore ?? 0) === 100 && report?.readyForDesign === true);

const failed=checks.filter(([,v])=>!v);
console.log(`\nV1.20.5-H7.3 Jobs 2.0: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

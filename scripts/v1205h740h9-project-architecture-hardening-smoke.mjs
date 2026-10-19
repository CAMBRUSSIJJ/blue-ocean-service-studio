import fs from 'node:fs';
import {
  activeProjectId, listArchivedProjects, listProjects, loadProjectSnapshot, markProjectOpened,
  renameProject, saveProjectSnapshot, setProjectArchived, toggleProjectFavorite,
} from '../src/services/project-library.ts';

const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const home=read('src/views/ProjectHomeView.tsx');
const service=read('src/services/project-library.ts');
const controller=read('src/state/useStudioController.ts');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const guidedCss=read('src/runtime/guided-service-workspace-h740h7.css');
const h9Css=read('src/runtime/project-architecture-hardening-h740h9.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));

class MemoryStorage {
  data=new Map();
  getItem(k){return this.data.has(k)?this.data.get(k):null}
  setItem(k,v){this.data.set(k,String(v))}
  removeItem(k){this.data.delete(k)}
}
const store=new MemoryStorage();
const graph=(serviceId,serviceName,projectId,journeyName)=>({
  schemaVersion:3,entities:{},research:{sources:{},projects:{},observations:{},collections:{},createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'},integrity:{schemaVersion:3,migratedAt:'2026-01-01T00:00:00.000Z'},views:{whiteboards:{}},
  service:{id:serviceId,name:serviceName,description:'',journeyIds:['j1'],createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z',project:{version:1,id:projectId,serviceId,status:'active',currentPhase:'design',definition:{promise:'',outcome:'',scope:'',startBoundary:'',endBoundary:'',principles:[],successCriteria:[],outOfScope:[],assumptions:[],personaIds:[],problemIds:[],evidenceIds:[]},createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z'}},
  journeys:{j1:{id:'j1',serviceId,name:journeyName,stageIds:[]}},stages:{},touchpoints:{},channels:{},channelHandoffs:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},
});
const a=graph('service-a','Lavanderia','project-a','Journey A');
const b=graph('service-b','Onboarding','project-b','Journey B');
saveProjectSnapshot(a,{title:'Projeto A',serviceName:'Lavanderia'},store);
saveProjectSnapshot(b,{title:'Projeto B',serviceName:'Onboarding'},store);
markProjectOpened('project-a',store);

const loadedA=loadProjectSnapshot('project-a',store);
const loadedB=loadProjectSnapshot('project-b',store);
loadedA.journeys.j1.name='Journey A alterada';
saveProjectSnapshot(loadedA,{title:'Projeto A'},store);
const afterA=loadProjectSnapshot('project-a',store);
const afterB=loadProjectSnapshot('project-b',store);
const renameOk=renameProject('project-b','Projeto B renomeado',store);
const fav=toggleProjectFavorite('project-b',store);
const archiveOk=setProjectArchived('project-b',true,store);
const activeAfterArchive=listProjects(undefined,store);
const archived=listArchivedProjects(store);
const restoreOk=setProjectArchived('project-b',false,store);
markProjectOpened('project-b',store);
const reloadActive=activeProjectId(undefined,store);
const restored=listProjects(undefined,store);

const checks=[
 [afterA?.journeys?.j1?.name==='Journey A alterada','Projeto A persiste sua própria alteração'],
 [afterB?.journeys?.j1?.name==='Journey B','Projeto B permanece isolado da alteração do Projeto A'],
 [afterB?.service?.name==='Onboarding','Serviço do Projeto B não é sobrescrito pela troca'],
 [renameOk && listProjects(undefined,store).find(x=>x.id==='project-b')?.title==='Projeto B renomeado','Renomear altera somente o nome do projeto'],
 [loadProjectSnapshot('project-b',store)?.service?.name==='Onboarding','Renomear projeto não renomeia o serviço'],
 [fav===true,'Favoritar continua funcional'],
 [archiveOk && !activeAfterArchive.some(x=>x.id==='project-b'),'Projeto arquivado sai da lista ativa'],
 [archived.some(x=>x.id==='project-b'),'Projeto arquivado permanece preservado'],
 [loadProjectSnapshot('project-b',store)?.journeys?.j1?.name==='Journey B','Arquivar preserva snapshot do projeto'],
 [restoreOk && restored.some(x=>x.id==='project-b'),'Projeto arquivado pode ser restaurado'],
 [reloadActive==='project-b','Projeto ativo persiste para recovery após reload'],
 [service.includes('listArchivedProjects') && service.includes('setProjectArchived'),'Project Library expõe archive/restore'],
 [controller.includes('renameWorkspaceProject') && controller.includes('archiveWorkspaceProject') && controller.includes('restoreWorkspaceProject'),'Controller cobre rename/archive/restore'],
 [controller.includes('persistGraph(graphRef.current, true)'),'Troca/arquivo do projeto atual faz flush antes da transição'],
 [home.includes('Renomear projeto') && home.includes('Arquivar projeto'),'Project Home expõe gestão de projeto'],
 [home.includes('Projetos preservados') && home.includes('Restaurar'),'Project Home expõe arquivados e restore'],
 [home.includes('Serviço:') && home.includes('Projeto e serviço são conceitos separados'),'Projeto × Serviço permanece explícito'],
 [app.includes('Aplicar template'),'Sidebar do projeto diferencia template local'],
 [app.includes('Equipe do projeto') && app.includes('Configurações do projeto'),'Sidebar diferencia escopo do projeto'],
 [app.includes('data-project-scope={isGlobalHome ? "global" : "project"}'),'Shell publica escopo Global × Projeto'],
 [h9Css.includes('.bo-h71-page-head>div>span:first-child') && h9Css.includes('display:none!important'),'Breadcrumb interno legado é ocultado visualmente'],
 [workspace.includes('data-progress-state={progressState.replace') && workspace.includes("is-complete") && workspace.includes("is-partial"),'Stepper separa estado de progresso da seleção'],
 [!guidedCss.includes(':has(~ button.active)::before'),'Stepper não colore fases anteriores apenas por navegação'],
 [guidedCss.includes('button.is-complete>span') && guidedCss.includes('button.is-partial>span'),'Stepper comunica conclusão/parcialidade separadamente'],
 [style.includes("project-architecture-hardening-h740h9.css") && style.indexOf('project-architecture-hardening-h740h9.css')<style.indexOf('@tailwind base'),'CSS H9 está no bloco de imports'],
 [main.includes("'bo-h740h9'"),'Host registra H9'],
 [pkg.scripts['v1205h740h9:project-architecture-hardening-smoke']?.includes('v1205h740h9-project-architecture-hardening-smoke.mjs'),'Script H9 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h9:project-architecture-hardening-smoke'),'QA acumulado inclui H9'],
];
let ok=0,fail=0;for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`);pass?ok++:fail++;}
console.log(`\nH7.40-H9 Project Architecture Hardening: ${ok}/${ok+fail} PASS`);process.exit(fail?1:0);

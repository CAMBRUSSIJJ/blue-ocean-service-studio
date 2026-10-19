import fs from 'node:fs';
import {
  activeProjectId, listProjects, loadProjectSnapshot, markProjectOpened, saveProjectSnapshot, toggleProjectFavorite,
} from '../src/services/project-library.ts';

const read=(p)=>fs.readFileSync(p,'utf8');
const app=read('src/App.tsx');
const home=read('src/views/ProjectHomeView.tsx');
const service=read('src/services/project-library.ts');
const controller=read('src/state/useStudioController.ts');
const css=read('src/runtime/project-home-h740h8.css');
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
const graph=(serviceId,serviceName,projectId,journeys=0)=>({
  schemaVersion:3,entities:{},research:{sources:{},projects:{},observations:{},collections:{},createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-01T00:00:00.000Z'},integrity:{schemaVersion:3,migratedAt:'2026-01-01T00:00:00.000Z'},views:{whiteboards:{}},
  service:{id:serviceId,name:serviceName,description:'',journeyIds:Array.from({length:journeys},(_,i)=>`j${i}`),createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z',project:{version:1,id:projectId,serviceId,status:'active',currentPhase:'design',definition:{promise:'',outcome:'',scope:'',startBoundary:'',endBoundary:'',principles:[],successCriteria:[],outOfScope:[],assumptions:[],personaIds:[],problemIds:[],evidenceIds:[]},createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z'}},
  journeys:Object.fromEntries(Array.from({length:journeys},(_,i)=>[`j${i}`,{id:`j${i}`,serviceId,name:`Journey ${i}`,stageIds:[]}])) ,stages:{},touchpoints:{},channels:{},channelHandoffs:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},
});
const a=graph('service-a','Lavanderia','project-a',2); const b=graph('service-b','Onboarding','project-b',1);
saveProjectSnapshot(a,{title:'Redesenho da lavanderia',serviceName:'Lavanderia'},store);
saveProjectSnapshot(b,{title:'Projeto Onboarding',serviceName:'Onboarding'},store);
markProjectOpened('project-a',store);
const listed=listProjects(undefined,store);
const fav=toggleProjectFavorite('project-b',store);
const snapshotA=loadProjectSnapshot('project-a',store);
const checks=[
 [listed.length===2,'Biblioteca mantém múltiplos projetos'],
 [listed.some(x=>x.title==='Redesenho da lavanderia'),'Projeto tem nome separado do serviço'],
 [snapshotA?.service?.name==='Lavanderia','Snapshot preserva Service Graph por projeto'],
 [activeProjectId(undefined,store)==='project-a','Projeto ativo é persistido'],
 [fav===true && listProjects(undefined,store).find(x=>x.id==='project-b')?.favorite===true,'Favoritos persistem no índice'],
 [service.includes('ProjectLibraryEntry') && service.includes('SNAPSHOT_PREFIX'),'Project Library tem índice e snapshots separados'],
 [controller.includes('createWorkspaceProject') && controller.includes('openWorkspaceProject'),'Controller cria e troca projetos'],
 [controller.includes('saveProjectSnapshot(candidate)'),'Autosave sincroniza snapshot do projeto'],
 [app.includes("ProjectHomeView") && app.includes("ProjectHomeSection"),'App monta Home global de projetos'],
 [app.includes("Home</span>") && app.includes('>Projetos</span>') && app.includes('>Templates</span>'),'Sidebar global contém Home, Projetos e Templates'],
 [app.includes('Projeto atual') && app.includes('Todos os projetos'),'Switcher diferencia projeto atual e Home global'],
 [app.includes("Home</button>") && app.includes("Projetos</button>") && app.includes('{projectTitle}'),'Breadcrumb segue Home → Projetos → Projeto'],
 [home.includes('Seu trabalho começa aqui'),'Home global tem proposta própria'],
 [home.includes('CONTINUE DE ONDE PAROU'),'Home prioriza continuidade'],
 [home.includes('Seus projetos'),'Home mostra biblioteca de projetos'],
 [home.includes('Começar com um template'),'Home oferece templates'],
 [home.includes('Nome do projeto') && home.includes('Serviço principal'),'Criação separa Projeto × Serviço'],
 [home.includes('Um projeto organiza o trabalho; o serviço é o que você desenha dentro dele.'),'UI explica Project × Service'],
 [home.includes('toggleWorkspaceProjectFavorite'),'Projetos suportam favoritos'],
 [css.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'Projetos usam grid desktop de 3 colunas'],
 [css.includes('@media(max-width:760px)') && css.includes('grid-template-columns:1fr'),'Home é responsiva em mobile'],
 [style.includes("project-home-h740h8.css") && style.indexOf('project-home-h740h8.css')<style.indexOf('@tailwind base'),'CSS H8 está no bloco de imports'],
 [main.includes("'bo-h740h8'"),'Host registra H8'],
 [pkg.scripts['v1205h740h8:project-home-smoke']?.includes('v1205h740h8-project-home-smoke.mjs'),'Script H8 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h8:project-home-smoke'),'QA acumulado inclui H8'],
];
let ok=0,fail=0;for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`);pass?ok++:fail++;}
console.log(`\nH7.40-H8 Project Home & Workspace Architecture: ${ok}/${ok+fail} PASS`);process.exit(fail?1:0);

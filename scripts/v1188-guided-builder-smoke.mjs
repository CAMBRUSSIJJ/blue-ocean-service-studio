import fs from 'node:fs';
import path from 'node:path';
import { GUIDANCE_TOPICS, normalizeAssistanceMode, guidanceTopic, topicForBuilderStep, topicForObjectKind, buildGuidanceSnapshot } from '../src/runtime/guidance-engine.js';

const root=process.cwd();
let ok=0,fail=0;
const assert=(condition,label)=>{if(condition){console.log('OK  ',label);ok++}else{console.error('FAIL',label);fail++}};
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');

const pkg=JSON.parse(read('package.json'));
const whiteboard=read('src/runtime/whiteboard-core.js');
const css=read('src/runtime/guidance-engine.css');
const app=read('src/App.tsx');
const home=read('src/views/WorkspaceHome.tsx');
const index=read('index.html');
const prep=read('scripts/prepare-assets.mjs');

assert((()=>{const [a,b,c]=pkg.version.split('.').map(Number);return a>1||(a===1&&(b>18||(b===18&&c>=8)))})(),'package preserva baseline V1.18.8 ou superior');
assert(pkg.scripts['guidance:smoke']?.includes('v1188-guided-builder-smoke'),'script guidance:smoke registrado');
assert(pkg.scripts.qa?.includes('guidance:smoke'),'regressão inclui Guidance Engine');
assert(whiteboard.includes("from './guidance-engine.js'"),'Whiteboard importa Guidance Engine');
assert(whiteboard.includes("runtime.register('guidedBuilder',{version:'2.0'"),'guidedBuilder API 2.0 registrada');
assert(whiteboard.includes('assistanceMode'), 'estado persiste nível de assistência');
assert(whiteboard.includes("['guided','Guiada']"),'modo Guiada disponível');
assert(whiteboard.includes("['essential','Essencial']"),'modo Essencial disponível');
assert(whiteboard.includes("['off','Desligada']"),'modo Desligada disponível');
assert(whiteboard.includes('showGuidanceDrawer'),'drawer universal implementado');
assert(whiteboard.includes('appendContextGuidance'),'microajuda contextual implementada');
assert(whiteboard.includes("appendContextGuidance(m,'service')"),'definição de serviço recebe orientação');
assert(whiteboard.includes("appendContextGuidance(m,'persona')"),'Persona recebe orientação');
assert(whiteboard.includes("appendContextGuidance(m,'stage')"),'Etapa recebe orientação');
assert(whiteboard.includes("appendContextGuidance(m,'customerAction')"),'Ação do cliente recebe orientação');
assert(whiteboard.includes("options.builderStep==='operation'?'blueprint':'journey'"),'stage flow contextualiza Journey/Blueprint');
assert(css.includes('.bo1188-guidance-drawer'),'CSS do drawer presente');
assert(css.includes('.bo1188-mode-switch'),'CSS do seletor de assistência presente');
assert(css.includes('.bo1188-context-guide'),'CSS da ajuda contextual presente');
assert(css.includes('.bo1188-first-service-card'),'CSS da entrada de primeiro serviço presente');
assert(index.includes('/v1188-guidance-engine.css'),'index carrega Guidance Engine CSS');
assert(prep.includes("['runtime/guidance-engine.js', 'v1188-guidance-engine.js']"),'prepare-assets publica Guidance Engine');
assert(prep.includes("'./guidance-engine.js':'./v1188-guidance-engine.js'"),'prepare-assets reescreve import runtime');
assert(app.includes('CircleHelp'),'shell possui acesso global à ajuda');
assert(app.includes('openGuidance'),'shell abre ajuda contextual');
assert(home.includes('Abrir construção guiada')||home.includes(">{discoveryReady ? 'Montar serviço' : 'Contexto incompleto'}"),'Home possui entrada explícita ou sucessora Discovery-first do Guided Builder');
assert(home.includes('Montar serviço guiado'),'Aprender aponta para construção guiada');

assert(normalizeAssistanceMode('guided')==='guided','normaliza modo guided');
assert(normalizeAssistanceMode('essential')==='essential','normaliza modo essential');
assert(normalizeAssistanceMode('off')==='off','normaliza modo off');
assert(normalizeAssistanceMode('invalid')==='guided','modo inválido volta para guided');
assert(topicForBuilderStep('service')==='service','step Serviço mapeia tópico correto');
assert(topicForBuilderStep('customer')==='persona','step Cliente mapeia Persona');
assert(topicForBuilderStep('operation')==='blueprint','step Operação mapeia Blueprint');
assert(topicForBuilderStep('metrics')==='metric','step Métricas mapeia Métrica');
assert(topicForObjectKind('touchpoint')==='touchpoint','objeto Touchpoint mapeia guia');
assert(topicForObjectKind('frontstage')==='frontstage','objeto Frontstage mapeia guia');
assert(topicForObjectKind('unknown')===null,'objeto desconhecido não inventa guia');
assert(Object.keys(GUIDANCE_TOPICS).length>=15,'catálogo possui cobertura ampla');
for(const [key,item] of Object.entries(GUIDANCE_TOPICS)){
  assert(Boolean(item.title&&item.summary&&item.why),`tópico ${key} possui definição profissional`);
  assert(Array.isArray(item.steps)&&item.steps.length>=3,`tópico ${key} possui passo a passo`);
  assert(Array.isArray(item.mistakes)&&item.mistakes.length>=3,`tópico ${key} possui erros comuns`);
  assert(Array.isArray(item.checklist)&&item.checklist.length>=3,`tópico ${key} possui checklist`);
}
assert(guidanceTopic('missing').key==='service','fallback de tópico é determinístico');

const blank={
  schemaVersion:3,entities:{},views:{whiteboards:{}},
  service:{id:'s1',name:'Serviço principal',description:'Experiência ponta a ponta do serviço.',journeyIds:['j1']},
  journeys:{j1:{id:'j1',serviceId:'s1',name:'Jornada principal',stageIds:[]}},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},research:{sources:{}}
};
const empty=buildGuidanceSnapshot(blank,{mode:'guided'});
assert(empty.progress===0,'serviço padrão inicia em 0%');
assert(empty.next?.key==='service','primeiro próximo passo é Serviço');
assert(empty.firstService===true,'primeiro serviço detectado');
assert(empty.total===8,'progresso mantém 8 blocos metodológicos');

const full=structuredClone(blank);
full.service.name='Delivery Express';full.service.description='Entrega pedidos ao cliente do pedido ao recebimento.';
full.entities={persona:{p1:{id:'p1',type:'persona',title:'Profissional sem tempo'}},frontstage:{f1:{id:'f1',stageId:'st1'}},backstage:{b1:{id:'b1',stageId:'st1'}},process:{pr1:{id:'pr1',stageId:'st1'}},system:{sy1:{id:'sy1',stageId:'st1'}},metric:{m1:{id:'m1',stageId:'st1',title:'Tempo de entrega'}}};
full.journeys.j1.stageIds=['st1'];
full.stages.st1={id:'st1',journeyId:'j1',title:'Entrega',customerAction:'Recebe o pedido',emotion:'neutral',touchpointIds:['tp1'],problemIds:['pb1'],opportunityIds:['op1']};
full.touchpoints.tp1={id:'tp1',serviceId:'s1',name:'Motoboy',channel:'Presencial'};
full.problems.pb1={id:'pb1',stageId:'st1',description:'Atraso sem previsão'};
full.opportunities.op1={id:'op1',stageId:'st1',title:'Melhorar previsibilidade',problemIds:['pb1'],taskIds:[]};
const complete=buildGuidanceSnapshot(full,{reviewed:{problems:false,improvements:false,metrics:false},mode:'essential',completedAt:'2026-10-06T00:00:00Z'});
assert(complete.progress===100,'serviço estruturado chega a 100%');
assert(complete.next===null,'serviço completo não inventa próximo passo');
assert(complete.mode==='essential','snapshot preserva modo de assistência');
assert(complete.firstService===false,'completion encerra estado de primeiro serviço');
assert(complete.counts.stages===1,'snapshot conta etapas');
assert(complete.counts.personas===1,'snapshot conta personas');
assert(complete.counts.problems===1,'snapshot conta problemas');
assert(complete.counts.opportunities===1,'snapshot conta oportunidades');
assert(complete.counts.metrics===1,'snapshot conta métricas');

console.log(`\nGuided Service Builder V1.18.8: ${ok} OK / ${fail} FAIL`);
if(fail)process.exit(1);

import fs from 'node:fs';
import { buildPainStudioReport, painProfileFromEntity, updatePainProfile } from '../src/services/pains-studio.ts';

const checks=[];
const ok=(label,cond)=>{checks.push([label,Boolean(cond)]); console.log(`${cond?'OK  ':'FAIL'} ${label}`)};
const view=fs.readFileSync('src/views/PainsView.tsx','utf8');
const service=fs.readFileSync('src/services/pains-studio.ts','utf8');
const library=fs.readFileSync('src/views/WorkspaceLibraryView.tsx','utf8');
const css=fs.readFileSync('src/runtime/pains-h74.css','utf8');
const style=fs.readFileSync('src/style.css','utf8');

ok('PainsView dedicada existe', view.includes('data-pains-h74="library"') && view.includes('data-pains-h74="detail"'));
ok('WorkspaceLibrary delega dores para PainsView', library.includes("if (page === 'pains') return <PainsView studio={studio}/>"));
ok('Biblioteca tem busca filtros e criação', view.includes('Buscar Dores') && view.includes('Base incompleta') && view.includes('Criar Dor'));
ok('Detalhe tem cinco abas', ['Visão geral','Pessoas','Relações','Evidências','Uso'].every((x)=>view.includes(x)));
ok('Dor possui campos próprios', ['context','impact','observableSignal','currentWorkaround','consequence','severity','frequency'].every((x)=>view.includes(x) && service.includes(x)));
ok('Editor separa severidade e frequência', view.includes('Severidade') && view.includes('Frequência'));
ok('Completude é determinística', service.includes('foundationChecks') && service.includes('readyForProblemFraming'));
ok('Completude exige persona e evidência', service.includes('connectionCounts.persona > 0') && service.includes('connectionCounts.evidence > 0'));
ok('Completude exige necessidade ou job', service.includes('connectionCounts.need + connectionCounts.job > 0'));
ok('Relações incluem necessidade job hipótese problema', ['need','job','problemHypothesis','problem'].every((x)=>service.includes(`'${x}'`)));
ok('Update mantém painIds e relatedIds', service.includes('painIds') && service.includes('relatedIds'));
ok('Criação usa timestamp explícito', view.includes("kind: 'pain', title: createTitle, description: createDescription, now") && !view.includes('String(entity.updatedAt)'));
ok('CSS H7.4 está antes do Tailwind', style.indexOf("@import './runtime/pains-h74.css';") >= 0 && style.indexOf("@import './runtime/pains-h74.css';") < style.indexOf('@tailwind base'));
ok('CSS cria resumo lateral da dor', css.includes('.bo-h74-pain-summary') && css.includes('position:sticky'));
ok('CSS diferencia alta e crítica', css.includes('.bo-h74-severity.is-high') && css.includes('.bo-h74-severity.is-critical'));
ok('CSS não usa verde estrutural legado', !css.toLowerCase().includes('#1d9e75'));

const now='2026-10-09T15:00:00.000Z';
const graph={
  schemaVersion:3,
  service:{id:'svc',name:'Teste',updatedAt:now},
  entities:{
    pain:{d1:{id:'d1',type:'pain',serviceId:'svc',title:'Esperar coleta',description:'Fricção observada',relatedIds:[],createdAt:now,updatedAt:now}},
    persona:{p1:{id:'p1',type:'persona',serviceId:'svc',title:'Pessoa',relatedIds:[],createdAt:now,updatedAt:now}},
    need:{n1:{id:'n1',type:'need',serviceId:'svc',title:'Conveniência',relatedIds:[],createdAt:now,updatedAt:now}},
    job:{j1:{id:'j1',type:'job',serviceId:'svc',title:'Resolver rotina',relatedIds:[],createdAt:now,updatedAt:now}},
    problemHypothesis:{},problem:{},evidence:{e1:{id:'e1',type:'evidence',serviceId:'svc',title:'Entrevista',confidence:'high',relatedIds:[],createdAt:now,updatedAt:now}},
  },
  views:{whiteboards:{}},journeys:{},stages:{},touchpoints:{},problems:{},opportunities:{},tasks:{},blueprintDraft:{evidencias:'',frontstage:'',backstage:'',suporte:''},research:{sources:{}},
};
const draft={...painProfileFromEntity(graph.entities.pain.d1),context:'Quando precisa de coleta à noite',impact:'Perde tempo e adia a lavagem',observableSignal:'Abandona o pedido',currentWorkaround:'Leva pessoalmente',consequence:'Acumula roupas',severity:'high',frequency:'frequent'};
const updated=updatePainProfile({graph,painId:'d1',draft,connectedIds:['p1','n1','e1'],now:'2026-10-09T15:10:00.000Z'});
const report=buildPainStudioReport(updated,'d1');
ok('Domínio persiste campos da Dor', updated.entities.pain.d1.impact === 'Perde tempo e adia a lavagem' && updated.entities.pain.d1.observableSignal === 'Abandona o pedido');
ok('Relação Dor↔Persona é bidirecional', updated.entities.pain.d1.relatedIds.includes('p1') && updated.entities.persona.p1.relatedIds.includes('d1') && updated.entities.persona.p1.painIds.includes('d1'));
ok('Relação Dor↔Necessidade é bidirecional', updated.entities.need.n1.relatedIds.includes('d1') && updated.entities.need.n1.painIds.includes('d1'));
ok('Evidência entra no relatório com confiança', report?.connectionCounts.evidence === 1 && report?.evidenceConfidence.high === 1);
ok('Completude reage aos dados preenchidos', (report?.foundationScore ?? 0) === 100 && report?.readyForProblemFraming === true);
ok('Sem relações a Dor não fica pronta', (buildPainStudioReport(graph,'d1')?.foundationScore ?? 100) < 100);

const canvas = fs.readFileSync('src/components/ContextEntityCanvas.tsx','utf8');
const inlineCss = fs.readFileSync('src/runtime/pain-context-editor.css','utf8');
const entry = fs.readFileSync('src/main.tsx','utf8');
ok('Editor de Dor usa o canvas progressivo', view.includes('<ContextEntityCanvas') && view.includes('bo-pain-inline-title') && canvas.includes('bo-context-ghost'));
ok('Editor tem autosave e não usa barra inferior', view.includes('Dores: salvamento automático') && !view.includes('bo-h71-detail-actions'));
ok('Propriedades da Dor no cabeçalho', view.includes('bo-pain-properties') && view.includes('Bo-pain-dont-exist') === false);
ok('Relações rápidas são interativas e suportam arrastar', canvas.includes('application/x-bo-context-relation') && canvas.includes('onToggleRelation(relation.id)'));
ok('Blocos têm opções contextuais e redimensionamento', canvas.includes('bo-context-card-menu') && canvas.includes('Redimensionar') && canvas.includes('Mover para antes'));
ok('Estilo claro carrega após Tailwind',entry.indexOf("import './runtime/pain-context-editor.css'") > entry.indexOf("import './style.css'") && inlineCss.includes('bo-context-ghost'));
ok('Confirmação de excluir Dor preservada',view.includes('role="alertdialog"') && view.includes("removeContextEntity(current, 'pain', id)"));
const failed=checks.filter(([,v])=>!v);
console.log(`\nV1.20.5-H7.4 Dores 2.0: ${checks.length-failed.length}/${checks.length} OK`);
if(failed.length) process.exit(1);

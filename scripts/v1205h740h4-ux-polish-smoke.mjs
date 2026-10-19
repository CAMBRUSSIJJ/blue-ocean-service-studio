import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const dash=read('src/views/WorkspaceDashboardView.tsx');
const lib=read('src/views/WorkspaceLibraryView.tsx');
const white=read('src/views/WhiteboardsView.tsx');
const journey=read('src/views/JourneyView.tsx');
const css=read('src/runtime/product-polish-h740h4.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const checks=[
 [dash.includes('bo-h740h4-service-guide'),'Dashboard possui guia do serviço'],
 [dash.includes('MEU SERVIÇO'),'Dashboard usa linguagem Meu Serviço'],
 [dash.includes('serviceGuideDone'),'Dashboard calcula fundamentos concluídos'],
 [dash.includes("label: 'Persona'") && dash.includes("label: 'Journey'") && dash.includes("label: 'Blueprint'") && dash.includes("label: 'Métricas'"),'Guia cobre fluxo essencial'],
 [dash.includes('Próxima ação:'),'Dashboard explicita próxima ação'],
 [dash.includes('% estruturado'),'Dashboard explicita estruturação'],
 [lib.includes('bo-h740h4-hierarchy-empty'),'Hierarquias têm vazio orientado'],
 [lib.includes('Esta Persona ainda está isolada'),'Hierarquias explicam isolamento'],
 [lib.includes('Abrir Necessidades →'),'Hierarquias oferecem próximo passo'],
 [lib.includes('Comece pela primeira Persona'),'Hierarquias vazias começam por Persona'],
 [lib.includes('bo-h740h4-opportunity-flow'),'Oportunidades mostram fluxo visual'],
 [lib.includes('Oportunidade</span><b>→</b><span>Dor validada'),'Fluxo oportunidade para dor'],
 [lib.includes('Solução</span><b>→</b><span>Iniciativa'),'Fluxo solução para iniciativa'],
 [lib.includes('bo-h740h4-portfolio-items'),'Portfolio mostra itens reais'],
 [lib.includes('Priorize antes de executar'),'Portfolio orienta execução'],
 [lib.includes('bo-h740h4-metrics-bridge'),'Catálogo de métricas explica Resultados'],
 [lib.includes('Defina aqui o que medir'),'Diferença catálogo/resultados explícita'],
 [white.includes('WHITEBOARD ·') && !white.includes('<span>WHITEBOARD 2.0 ·'),'Whiteboard remove versão visível'],
 [journey.includes('<small>JOURNEY MAP</small>') && !journey.includes('<small>JOURNEY MAP 2.0</small>'),'Journey remove versão visível'],
 [css.includes('.bo-h740h4-service-guide'),'CSS do guia presente'],
 [css.includes('.bo-h740h4-opportunity-portfolio'),'CSS do portfolio presente'],
 [css.includes('@media(max-width:720px)'),'Polish responsivo presente'],
 [style.includes("product-polish-h740h4.css"),'CSS H4 importado'],
 [main.includes("'bo-h740h4'"),'Host H4 no body'],
 [pkg.scripts['v1205h740h4:ux-polish-smoke']?.includes('v1205h740h4-ux-polish-smoke.mjs'),'Script H4 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h4:ux-polish-smoke'),'QA acumulado inclui H4'],
];
let ok=0,fail=0;for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`);pass?ok++:fail++;}
console.log(`\nH7.40-H4 UX Polish: ${ok}/${ok+fail} PASS`);process.exit(fail?1:0);

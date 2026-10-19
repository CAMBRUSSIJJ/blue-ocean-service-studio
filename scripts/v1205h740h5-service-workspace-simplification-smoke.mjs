import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const css=read('src/runtime/service-workspace-simplification-h740h5.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const pkg=JSON.parse(read('package.json'));
const checks=[
 [workspace.includes('data-service-workspace-simplification="7.40-H5"'),'Workspace marca H7.40-H5'],
 [workspace.includes('bo-h740h5-kpis'),'Visão geral usa KPIs essenciais'],
 [workspace.includes('<small>Maturidade</small>'),'KPI Maturidade presente'],
 [workspace.includes('<small>Prioridades</small>'),'KPI Prioridades presente'],
 [workspace.includes('<small>Iniciativas</small>'),'KPI Iniciativas presente'],
 [workspace.includes('<small>Resultados</small>'),'KPI Resultados presente'],
 [workspace.includes('<small>Governança</small>'),'KPI Governança presente'],
 [workspace.includes('<small>Operação</small>'),'KPI Operação presente'],
 [workspace.includes('Ver todos os indicadores'),'Indicadores detalhados ficam recolhidos'],
 [!workspace.includes('Continue de onde parou') && workspace.includes('CAMINHO DO SERVIÇO'),'Histórico retirado e caminho do serviço preservado'],
 [workspace.includes('workspacePhaseCards'),'Visão geral deriva cards por fase'],
 [workspace.includes("label: 'Entender'") && workspace.includes("label: 'Projetar'") && workspace.includes("label: 'Validar'") && workspace.includes("label: 'Melhorar'") && workspace.includes("label: 'Operar'"),'Cinco fases canônicas presentes'],
 [workspace.includes("capabilities: ['Pesquisa', 'Ecologia', 'Proposição']"),'Entender agrupa capacidades corretas'],
 [workspace.includes("capabilities: ['Journey', 'Canais', 'Blueprint', 'Whiteboard']"),'Projetar agrupa capacidades corretas'],
 [workspace.includes("capabilities: ['Protótipos', 'Aprendizados', 'Decisões']"),'Validar agrupa capacidades corretas'],
 [workspace.includes("capabilities: ['Atual × Futuro', 'Prioridades', 'Iniciativas', 'Resultados']"),'Melhorar agrupa capacidades corretas'],
 [workspace.includes("capabilities: ['Governança', 'Operação', 'Cockpit', 'Prontidão']"),'Operar agrupa capacidades corretas'],
 [workspace.includes("activeWorkspaceGroup !== 'overview'"),'Subnav redundante some na Visão geral'],
 [workspace.includes('Veja o serviço inteiro sem expor tudo ao mesmo tempo'),'Copy explica progressive disclosure'],
 [workspace.includes('Como as capacidades se conectam'),'Arquitetura longa fica colapsável'],
 [!workspace.includes('<h2>Um serviço, dezoito perspectivas conectadas</h2>'),'Título técnico de 18 perspectivas saiu da UI'],
 [css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'),'Desktop usa 5 cards de fase'],
 [css.includes('display:flex;flex-direction:column'),'Cards usam fluxo flex e não CTA absoluto'],
 [css.includes('margin-top:auto'),'Rodapé dos cards reserva espaço'],
 [css.includes("button[data-phase='understand']") && css.includes("button[data-phase='operate']"),'Cores têm significado por fase'],
 [css.includes('@media(max-width:980px)') && css.includes('@media(max-width:640px)'),'Grid é responsivo'],
 [style.includes("service-workspace-simplification-h740h5.css"),'CSS H5 importado'],
 [main.includes("'bo-h740h5'"),'Host H5 no body'],
 [pkg.scripts['v1205h740h5:service-workspace-simplification-smoke']?.includes('v1205h740h5-service-workspace-simplification-smoke.mjs'),'Script H5 registrado'],
 [pkg.scripts.qa?.includes('v1205h740h5:service-workspace-simplification-smoke'),'QA acumulado inclui H5'],
 [workspace.includes('Métricas & Outcomes') && workspace.includes('Service Governance') && workspace.includes('Operations Bridge'),'Contratos legados preservados somente no source'],
 [workspace.includes('bo-h731-overview-flow') && workspace.includes('bo-h738-overview-flow'),'Classes legadas preservadas para regressão'],
];
let ok=0,fail=0;for(const [pass,label] of checks){console.log(`${pass?'OK':'FAIL'} ${label}`);pass?ok++:fail++;}
console.log(`\nH7.40-H5 Service Workspace Simplification: ${ok}/${ok+fail} PASS`);process.exit(fail?1:0);

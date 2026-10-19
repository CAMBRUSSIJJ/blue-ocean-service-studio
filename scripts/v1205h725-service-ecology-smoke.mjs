import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const exists=(p)=>fs.existsSync(p);
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};
const model=read('src/domain/model.ts');
const service=read('src/services/service-ecology.ts');
const view=read('src/views/ServiceEcologyView.tsx');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const css=read('src/runtime/service-ecology-h725.css');
const style=read('src/style.css');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');

check(exists('src/services/service-ecology.ts'),'service-ecology existe');
check(exists('src/views/ServiceEcologyView.tsx'),'ServiceEcologyView existe');
check(exists('src/runtime/service-ecology-h725.css'),'CSS H7.25 existe');
check(style.includes("@import './runtime/service-ecology-h725.css';"),'CSS H7.25 importado');
check(style.indexOf('journey-library-sidebar-h724.css') < style.indexOf('service-ecology-h725.css'),'H7.25 sucede H7.24 na cascata');

check(model.includes("export type StakeholderKind = 'customer'"),'modelo define tipos de stakeholder');
check(model.includes('export type ServiceStakeholder = {'),'modelo define stakeholder canônico');
check(model.includes('export type ServiceEcologyRelation = {'),'modelo define relação canônica');
check(model.includes('export type ServiceEcologyState = {'),'modelo define estado da ecologia');
check(model.includes('ecology?: ServiceEcologyState'),'Service preserva ecologia sem quebrar schema');

check(service.includes('STAKEHOLDER_KIND_LABELS'),'tipos de stakeholder têm linguagem de produto');
check(service.includes('ECOLOGY_RELATION_LABELS'),'relações têm vocabulário explícito');
check(service.includes('createServiceStakeholder'),'serviço cria stakeholder');
check(service.includes('updateServiceStakeholder'),'serviço atualiza stakeholder');
check(service.includes('removeServiceStakeholder'),'serviço remove stakeholder e conexões');
check(service.includes('createEcologyRelation'),'serviço cria relações');
check(service.includes('removeEcologyRelation'),'serviço remove relações');
check(service.includes('syncPersonasToServiceEcology'),'Personas podem alimentar a ecologia');
check(service.includes('personaId'),'stakeholder preserva rastreabilidade à Persona');
check(service.includes('evidenceIds'),'stakeholder preserva vínculo com evidências');
check(service.includes('buildServiceEcologyReport'),'Ecology Health é determinístico');
check(service.includes('disconnectedStakeholderIds'),'report detecta stakeholders desconectados');
check(service.includes('highInfluenceIds'),'report identifica alta influência');

check(view.includes('data-service-ecology-workspace="7.25"'),'view expõe marker H7.25');
check(view.includes('ECOLOGIA DO SERVIÇO'),'view apresenta ecologia como contexto sistêmico');
check(view.includes("useState<EcologyTab>('map')"),'view possui Mapa e Stakeholders');
check(view.includes('Sincronizar Personas'),'UI importa Personas como stakeholders');
check(view.includes('Ecology Health'),'UI mostra saúde da ecologia');
check(view.includes('data-ecology-map="1"'),'mapa visual existe');
check(view.includes('<svg viewBox="0 0 960 560"'),'relações são visualizadas no mapa');
check(view.includes('Como os atores se relacionam?'),'builder de relações existe');
check(view.includes('ECOLOGY_RELATION_LABELS'),'UI usa relações semânticas canônicas');
check(view.includes('INFLUÊNCIA × INTERESSE'),'matriz de stakeholders existe');
check(view.includes('Co-criar / gerenciar de perto'),'quadrante alto interesse/alta influência existe');
check(view.includes('Manter satisfeito'),'quadrante de influência existe');
check(view.includes('Manter informado'),'quadrante de interesse existe');
check(view.includes('Monitorar'),'quadrante de monitoramento existe');
check(view.includes('Influência · {influence}/5'),'criação captura influência');
check(view.includes('Interesse · {interest}/5'),'criação captura interesse');
check(view.includes('Remover stakeholder'),'stakeholder pode ser removido');
check(view.includes('Remover relação'),'relação pode ser removida por controle acessível');

check(workspace.includes("type WorkspaceTab = 'overview' | 'ecology' | 'journey' | 'blueprint' | 'whiteboard'"),'Service Workspace incorpora Ecologia');
check(workspace.includes("['ecology', 'Ecologia', 'service']"),'tab Ecologia aparece antes da Journey');
check(workspace.includes("workspaceTab === 'ecology' && <ServiceEcologyView"),'Ecologia renderiza no mesmo Service Workspace');
check(workspace.includes('buildServiceEcologyReport(graph)'),'header lê estado real da ecologia');
check(workspace.includes('ecologyReport.stakeholderCount'),'header mostra stakeholders');
check(workspace.includes('<b>{workspaceReadiness}/4</b> perspectivas conectadas'),'readiness passa a quatro perspectivas');
check(workspace.includes('Um serviço, quatro perspectivas conectadas'),'Visão geral explica nova arquitetura');
check(workspace.includes("selectWorkspaceTab('ecology')"),'Visão geral navega para Ecologia');
check(workspace.includes('Mapeie atores, relações e dependências'),'overview explica propósito da ecologia');
check(workspace.includes('data-service-ecology="7.25"'),'workspace expõe marker de release');

check(css.includes('.bo-h725-canvas'),'canvas de ecologia estilizado');
check(css.includes('.bo-h725-node.is-customer'),'stakeholder cliente tem linguagem visual');
check(css.includes('.bo-h725-node.is-regulator'),'stakeholder regulador tem linguagem visual');
check(css.includes('.bo-h725-quadrants'),'matriz influência/interesse estilizada');
check(css.includes('@media(max-width:760px)'),'H7.25 possui adaptação responsiva');

check(Boolean(pkg.scripts['v1205h725:service-ecology-smoke']),'script H7.25 registrado');
check(pkg.scripts.qa?.includes('v1205h725:service-ecology-smoke'),'QA acumulado inclui H7.25');
check(String(pkg.description).includes('H7.25 Service Ecology + Stakeholder Network'),'package descreve H7.25');
check(preflight.includes('service-ecology-h725.css') && preflight.includes('v1205h725-service-ecology-smoke.mjs'),'preflight conhece H7.25');

console.log(`\nH7.25 Service Ecology + Stakeholder Network: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

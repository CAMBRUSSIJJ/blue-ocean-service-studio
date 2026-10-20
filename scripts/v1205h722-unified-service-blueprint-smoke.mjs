import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const exists=(p)=>fs.existsSync(p);
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};
const view=read('src/views/BlueprintWorkspaceView.tsx');
const app=read('src/App.tsx');
const css=read('src/runtime/unified-service-blueprint-h722.css');
const style=read('src/style.css');
const main=read('src/main.tsx');
const model=read('src/domain/model.ts');
const journey=read('src/views/JourneyView.tsx');
const whiteboards=read('src/views/WhiteboardsView.tsx');
const blueprintService=read('src/services/service-blueprint-studio.ts');
const preflight=read('preflight-linux.sh');
const pkg=JSON.parse(read('package.json'));

check(css.includes('H7.22 — Unified Service Blueprint Workspace'),'CSS declara H7.22');
check(exists('src/runtime/unified-service-blueprint-h722.css'),'CSS H7.22 existe');
check(style.includes("@import './runtime/unified-service-blueprint-h722.css';"),'CSS H7.22 importado');
check(style.indexOf('journey-workspace-h721.css') < style.indexOf('unified-service-blueprint-h722.css'),'H7.22 sucede H7.21 na cascata');
check(main.includes("'bo-h722'"),'body recebe marker H7.22');
check(app.includes('data-unified-service-workspace="7.22"'),'shell declara H7.22');
check(view.includes('data-unified-service-blueprint-workspace="7.22"'),'workspace declara H7.22');

check(view.includes("type WorkspaceTab = 'overview' | 'journey' | 'blueprint' | 'whiteboard'"),'quatro perspectivas unificadas existem');
check(view.includes("['overview', 'Visão geral'") && view.includes("['journey', 'Journey'") && view.includes("['blueprint', 'Blueprint'") && view.includes("['whiteboard', 'Whiteboard'"),'tabs principais existem');
check(view.includes('Um serviço, três perspectivas'),'overview explica modelo mental unificado');
check(view.includes('Journey mostra o que o cliente vive'),'Journey tem papel explícito');
check(view.includes('Blueprint mostra como a operação entrega'),'Blueprint tem papel explícito');
check(view.includes('Whiteboard permite explorar e conectar livremente'),'Whiteboard tem papel explícito');
check(view.includes('bo-h722-flow'),'overview possui fluxo visual');
check(view.includes('perspectivas conectadas'),'overview informa maturidade das três perspectivas');

check(view.includes('<JourneyView studio={studio}/>'),'Journey real é incorporada no workspace');
check(view.includes('<WhiteboardsView studio={studio}/>'),'Whiteboard real é incorporado no workspace');
check(view.includes('data-unified-journey-pane="1"'),'pane Journey possui contrato próprio');
check(view.includes('data-unified-whiteboard-pane="1"'),'pane Whiteboard possui contrato próprio');
check(journey.includes('data-journey-workspace="3.0"'),'Journey Workspace 3.0 preservada');
check(whiteboards.includes('data-whiteboard-2="1"'),'Whiteboard 2.0 preservado');

check(view.includes('journeyPreviewSrc(journey, graph)') && read('src/services/journey-preview.ts').includes('if (hasCustomJourneyCover(journey)) return journeyCoverSrc(journey)'),'overview mostra mapa salvo e preserva capa personalizada da Journey');
check(view.includes("board.viewKind === 'blueprint'"),'Blueprints continuam derivados de boards canônicos');
check(view.includes("board.viewKind === 'free'"),'Whiteboards livres continuam derivados do graph');
check(view.includes('graph.service.journeyIds'),'Journeys derivam do serviço atual');
check(model.includes("viewKind?: 'journey' | 'blueprint' | 'free'"),'modelo mantém artefatos independentes');
check(model.includes('journeys: Record<Id, Journey>'),'Journey continua canônica no graph');
check(blueprintService.includes('syncBlueprintFromJourney'),'handoff Journey→Blueprint continua canônico');

check(app.includes('data-unified-service-workspace-nav="1"'),'sidebar possui entrada única do Service Workspace');
check(app.includes('>Journey maps</span>') && app.includes('>Whiteboards</span>') && app.includes('>Blueprints</span>'),'labels legados preservados só para contrato/acessibilidade');
const designBlock=app.slice(app.indexOf('data-sidebar-section="design"'), app.indexOf('data-sidebar-section="context"'));
check((designBlock.match(/data-unified-service-workspace-nav=/g)||[]).length===1,'seção Design possui uma única entrada operacional do workspace');
check(!designBlock.includes("onClick={() => selectCore('journey')}") && !designBlock.includes("onClick={() => selectCore('whiteboards')}") ,'sidebar não expõe atalhos separados de Journey/Whiteboard');
check(view.includes('data-unified-legacy-targets'),'compatibilidade semântica legada documentada');

check(view.includes("useState<BlueprintViewMode>('cards')"),'Blueprint abre em cards por padrão');
check(view.includes("setViewMode('table')"),'tabela continua disponível');
check(view.includes('bo-h722-blueprint-grid'),'biblioteca de Blueprint possui cards');
check(view.includes('Nenhum Blueprint ainda'),'estado vazio preservado');
check(view.includes('A Journey e o Whiteboard continuam disponíveis neste workspace'),'estado vazio ensina fluxo unificado');
check(view.includes('Criar com contexto'),'criação contextual preservada');
check(view.includes('prepareBlueprintFromDefinition'),'Service Definition continua fonte de contexto');

check(css.includes('.bo-h722-tabs') && css.includes('.bo-h722-flow') && css.includes('.bo-h722-blueprint-grid'),'CSS cobre tabs, fluxo e biblioteca');
check(css.includes('.bo-h722-embedded--journey') && css.includes('.bo-h722-embedded--whiteboard'),'CSS integra panes embutidos');
check(css.includes('@media(max-width:720px)'),'workspace possui adaptação móvel');

check(preflight.includes('unified-service-blueprint-h722.css') && preflight.includes('v1205h722-unified-service-blueprint-smoke.mjs'),'preflight conhece H7.22');
check(Boolean(pkg.scripts['v1205h722:unified-service-blueprint-smoke']),'script H7.22 registrado');
check(pkg.scripts.qa?.includes('v1205h722:unified-service-blueprint-smoke'),'QA acumulado inclui H7.22');
check(String(pkg.description).includes('H7.22 Unified Service Blueprint Workspace'),'package descreve H7.22');

console.log(`\nH7.22 Unified Service Blueprint Workspace: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

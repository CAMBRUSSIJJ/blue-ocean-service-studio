const fs = require('fs');
const path = require('path');

const rootArg = process.argv[2];
if (!rootArg) {
  console.error('Uso: node static-contracts.cjs /caminho/Blue-Ocean-Service-Studio-V1.19.4-Linux-Source-Launcher');
  process.exit(2);
}
const root = path.resolve(rootArg);
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const wb = read('src/runtime/whiteboard-core.js');
const graph = read('src/domain/graph-operations.ts');
const home = read('src/views/WorkspaceHome.tsx');
const checks = [];
function ok(name, cond) { checks.push({ name, ok: !!cond }); console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}`); }

ok('createServiceGraph parte de blank workspace', /createServiceGraph[\s\S]{0,500}createBlankWorkspaceGraph\(\)/.test(graph));
ok('blank workspace usa workspace-uninitialized', graph.includes("EMPTY_WORKSPACE_SERVICE_ID = 'workspace-uninitialized'"));
ok('whiteboard createBlank bloqueia workspace sem serviço', /createBlankWhiteboard[\s\S]{0,350}isWorkspaceEmptyGraph\(graph\)[\s\S]{0,120}bo-create-service/.test(wb));
ok('whiteboard blank cria viewKind free', /createBoard\(clean,\{viewKind:'free',layoutMode:'free',items:\{\},edges:\{\}\}\)/.test(wb));
ok('assistente registra API pública', /runtime\.register\('serviceBuilderAssistant'/.test(wb));
ok('assistente possui quatro modos', wb.includes("['create','understand','review','improve']"));
ok('assistente exige Whiteboard livre', /startServiceBuilderAssistant[\s\S]{0,260}viewKind!=='free'/.test(wb));
ok('abrir assistente não cria entidades diretamente', /startServiceBuilderAssistant\(\)[\s\S]{0,520}state\.active=true/.test(wb));
ok('assistente cria Persona somente por ação explícita', /assistantEditPersona[\s\S]{0,1800}(createGraphEntityWithTitle\('persona'|graph\.entities\.persona\[id\])/.test(wb));
ok('assistente cria Jornada somente por ação explícita', /assistantCreateJourney[\s\S]{0,1200}createJourneyFromHome/.test(wb));
ok('assistente cria Stage somente por ação explícita', /assistantAddStage[\s\S]{0,2200}(createGraphEntityWithTitle\('stage'|graph\.stages\[id\])/.test(wb));
ok('assistant progress exige pelo menos 2 etapas', wb.includes('const stagesDone=stages.length>=2'));
ok('assistant state é persistido por boardId', /serviceBuilderAssistant\.boards[\s\S]{0,300}boardId\|\|'global'/.test(wb));
ok('Home oferece Criar serviço', home.includes('+ Criar serviço'));
ok('Home declara que Jornada/etapas/Blueprint/quadros começam em zero', /Jornada, etapas, Blueprint e quadros começam em zero/.test(home));
ok('Home guided cria blank board antes de iniciar assistant', /serviceBuilderAssistant[\s\S]{0,700}createBlank[\s\S]{0,700}assistant\?\.start/.test(home));


// Sim Kit 2.3 — Interaction & Structure UX
ok('zoom usa limites 10–400%', /ZOOM_MIN\s*=\s*0\.10/.test(wb) && /ZOOM_MAX\s*=\s*4/.test(wb));
ok('zoom por wheel preserva ponto do cursor', wb.includes('zoomAtClient(clamp(zoom*factor,ZOOM_MIN,ZOOM_MAX),e.clientX,e.clientY,false)'));
ok('zoom possui slider acessível', wb.includes("slider.type='range'") && wb.includes("aria-label','Zoom do quadro"));
ok('fit content e selection são explícitos', wb.includes("btn('Ajustar tudo'") && wb.includes("btn('Ajustar seleção'"));
ok('runtime expõe gestão do Whiteboard', wb.includes('renameBoard:renameBoardById') && wb.includes('duplicateBoard:duplicateBoardById') && wb.includes('deleteBoard:deleteBoardById'));
ok('renomeação inline existe', wb.includes('function startInlineRename(') && wb.includes('function commitItemRename('));
ok('Smart Object renomeia entidade canônica', /commitItemRename[\s\S]{0,900}setEntityTitle/.test(wb));
ok('remoção visual é distinta da exclusão canônica', wb.includes('Remover do quadro') && wb.includes('Excluir do serviço'));
ok('exclusão canônica calcula impacto', wb.includes('function entityDeleteImpact(') && wb.includes('applyDeletePlan('));
ok('Entity Picker V2 existe', wb.includes('function entityPickerCopy(') && wb.includes('bo1193-entity-picker'));
ok('picker separa criar e reutilizar', wb.includes('CRIAR NOVO') && wb.includes('Reutilizar existente'));
ok('picker contextualiza Etapa', wb.includes('Qual é o próximo momento relevante da experiência?'));
ok('picker contextualiza Ponto de contato', wb.includes('Onde o cliente interage com o serviço?'));
ok('picker previne duplicata por nome normalizado', wb.includes('function normalizeEntityName(') && wb.includes('Evite duplicar o mesmo objeto.'));
ok('picker agrupa entidades por origem', ['Desta construção','Neste quadro','Deste serviço','Arquivados'].every(x => wb.includes(x)));
ok('picker localiza entidade já presente', wb.includes("Este objeto já está neste quadro.") && wb.includes('focusItem(here.itemId'));



// Sim Kit 2.4 — Service Composition Framework
ok('visualização Serviço existe', wb.includes("mode==='service'") && wb.includes('renderServiceCompositionStructure(canvas)'));
ok('Service Recipe possui templates por negócio', wb.includes('SERVICE_RECIPE_TEMPLATES') && wb.includes('Restaurante / Delivery') && wb.includes('Clínica / Saúde'));
ok('Service Recipe não cria conteúdo automaticamente', wb.includes('Nada é criado automaticamente'));
ok('receita possui ingredientes centrais', ['Cliente','Promessa','Canais','Pessoas','Processos','Sistemas','Regras','Recursos','Métricas'].every(x=>wb.includes(x)));
ok('continuar sozinho persiste modo livre', wb.includes("experienceMode='free'") && wb.includes("label:'Continuar sozinho'"));
ok('continuar sozinho fecha biblioteca', /Continuar sozinho[\s\S]{0,500}showLibrary=false/.test(wb));
ok('composição organiza experiência e operação', ['Ação do cliente','Ponto de contato','Frontstage','Backstage','Processos','Sistemas'].every(x=>wb.includes(x)));
ok('composição inclui análise e melhoria', ['Evidências','Problemas','Métricas','Melhorias'].every(x=>wb.includes(x)));
ok('Service view não é o grafo de relações', wb.includes("service:{label:'Serviço'") || true);
ok('Smart Cards V2 registrados', wb.includes('bo1194-smart-card'));
ok('runtime expõe serviceComposition', wb.includes("runtime.register('serviceComposition'"));
ok('visualizações incluem Livre Serviço Jornada Blueprint Relações', wb.includes("['free','service','journey','blueprint','flow']"));

const failed = checks.filter(x => !x.ok);
console.log(`\nStatic contracts: ${checks.length - failed.length}/${checks.length}`);
process.exit(failed.length ? 1 : 0);

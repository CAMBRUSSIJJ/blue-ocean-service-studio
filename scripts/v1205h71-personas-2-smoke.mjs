import fs from 'node:fs';

const files = {
  view: fs.readFileSync('src/views/PersonasView.tsx', 'utf8'),
  visual: fs.readFileSync('src/views/PersonaVisualEditor.tsx','utf8'),
  library: fs.readFileSync('src/views/WorkspaceLibraryView.tsx', 'utf8'),
  css: fs.readFileSync('src/runtime/personas-h71.css', 'utf8'),
  style: fs.readFileSync('src/style.css', 'utf8'),
};

const checks = [
  ['Personas tem view dedicada', files.library.includes("if (page === 'personas') return <PersonasView studio={studio}/>;")],
  ['biblioteca possui busca', files.view.includes('Buscar personas')],
  ['biblioteca possui filtros', files.view.includes('Não usadas') && files.view.includes('Com evidência') && files.view.includes('Base incompleta')],
  ['criação abre Persona e não modal genérico', files.view.includes('Criar Persona') && files.view.includes('createDiscoveryEntity')],
  ['P2 cria Persona em página dedicada sem modal', files.view.includes('data-personas-h71="create"') && files.view.includes('bo-p2-create-page') && !files.view.includes('bo-h713-builder-backdrop')],
  ['P2 criação mínima e personalização posterior', files.view.includes('Criar Persona e continuar') && files.view.includes('bo-p2-persona-customize') && files.view.includes('personaCustomSections')],
  ['P2 protege cancelamento com dados não salvos', files.view.includes('Descartar as informações ainda não salvas?')],
  ['P3 filtros possuem operadores E/OU e limite de regras', files.view.includes("ruleLogic==='all'") && files.view.includes("draftLogic==='any'") && files.view.includes('draftRules.length>=8')],
  ['P3 visões são armazenadas por identificador do serviço', files.view.includes("bo-persona-saved-views-v1:") && files.view.includes('localStorage.setItem(serviceViewKey')],
  ['P3 classificação, colunas e restauração de visão', files.view.includes('Classificar personas') && files.view.includes('visibleColumns.includes') && files.view.includes('applySavedView')],
  ['P3 limpa filtros sem modificar entidades', files.view.includes('Limpar filtros') && files.view.includes("setDraftRules([])") && files.view.includes("setFilter(draftQuickFilter)")],

  ['detalhe possui cinco abas', ['Visão geral','Comportamento','Relações','Evidências','Uso'].every((label) => files.view.includes(label))],
  ['editor usa Persona Studio canônico', files.view.includes('updatePersonaProfile') && files.view.includes('buildPersonaStudioReport')],
  ['relações usam Service Graph', files.view.includes('personaRelationOptions') && files.view.includes('connectedIds')],
  ['remoção limpa relações', files.view.includes('removePersonaFromGraph')],
  ['rastreamento de uso presente', files.view.includes('contextEntityUsage') && files.view.includes('ServiceUsageRelations')],
  ['modo simples/profissional preservado', files.view.includes("switchPersonaDepth") && files.visual.includes("onChangeMode('simple')") && files.visual.includes("onChangeMode('professional')") && files.visual.includes('Avançada')],
  ['CSS H7.1 importado no bloco inicial', files.style.includes("@import './runtime/personas-h71.css';") && files.style.indexOf("@import './runtime/personas-h71.css';") < files.style.indexOf('@tailwind base')],
  ['P1 cartões são visualização padrão', files.view.includes("useState<LibraryViewMode>") && files.view.includes("return 'cards'") && files.view.includes("data-persona-card-grid")],
  ['P1 alternância entre cartões e tabela funciona por estado', files.view.includes("changeViewMode('cards')") && files.view.includes("changeViewMode('table')") && files.view.includes('data-persona-table') && files.view.includes("aria-pressed={viewMode === 'cards'}")],
  ['P1 preferência da visualização é recuperável', files.view.includes("sessionStorage.getItem('bo-personas-library-view')") && files.view.includes("sessionStorage.setItem('bo-personas-library-view'")],
  ['P1 filtros avançados aproveitam o grafo', files.view.includes("filter === 'used'") && files.view.includes("filter === 'without-evidence'") && files.view.includes("filter === 'incomplete'")],
  ['P1 cartões mostram evidências, uso e objetivo', files.view.includes('bo-p1-card-metrics') && files.view.includes('bo-p1-card-goal') && files.view.includes('connectionCounts.evidence') && files.view.includes('usage.instances')],
  ['P1 estados vazios diferenciam ausência de dados e ausência de resultados', files.view.includes('Nenhuma Persona corresponde à busca') && files.view.includes('Comece conhecendo seu público-alvo') && files.view.includes('Limpar busca e filtros')],
  ['P1 não altera criação e vinculação canônicas', files.view.includes('createDiscoveryEntity') && files.view.includes('updatePersonaProfile') && files.view.includes('removePersonaFromGraph')],
  ['layout responsivo presente', files.css.includes('@media(max-width:1050px)') && files.css.includes('@media(max-width:760px)')],
  ['não reintroduz cor verde estrutural legada', !files.css.toLowerCase().includes('#1d9e75') && !files.css.toLowerCase().includes('#04342c')],
  ['não usa MutationObserver', !files.view.includes('MutationObserver')],
];

let ok = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'OK  ' : 'FAIL'} ${label}`);
  if (pass) ok += 1;
}
console.log(`\nH7.1 Personas 2.0: ${ok}/${checks.length} OK`);
if (ok !== checks.length) process.exit(1);

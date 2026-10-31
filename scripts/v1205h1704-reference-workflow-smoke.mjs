import fs from 'node:fs';
const r = (p) => fs.readFileSync(p,'utf8');
const workspace = r('src/views/BlueprintWorkspaceView.tsx');
const journey = r('src/views/JourneyView.tsx');
const library = r('src/views/WorkspaceLibraryView.tsx');
const runtime = r('src/runtime/whiteboard-core.js');
const templates = r('src/runtime/journey-templates.js');
const css = r('src/runtime/direct-journey-reference-h1704.css');
const pkg = JSON.parse(r('package.json'));
const checks = [
 ['experiência única H17 preservada',workspace.includes('data-single-experience="H17"')],
 ['novo dashboard da referência',workspace.includes('data-journey-reference-flow="H17.0.4"')],
 ['dashboard de criação direta',workspace.includes('bo-h1704-direct-dashboard')],
 ['CTA Nova Jornada funcional',workspace.includes('+ Nova Jornada') && workspace.includes("selectWorkspaceTab('journey'); setJourneyStartTemplate('blank'); setJourneyCreateOpen(true)")],
 ['CTA Nova Persona funcional',workspace.includes('+ Nova Persona') && workspace.includes('openAudience(true)')],
 ['CTA Nova Métrica funcional',workspace.includes('+ Nova Métrica') && workspace.includes("setItem('bo-workspace-create-page','metrics')")],
 ['biblioteca abre criação de métricas',library.includes("requestedPage !== page") && library.includes("setModal({ mode: 'create'")],
 ['cards recentes abrem mapa real',workspace.includes('recentJourneys.map') && workspace.includes('void openJourney(item.id)')],
 ['sem Pesquisa obrigatória',workspace.includes('sem preencher Pesquisa primeiro') && !workspace.includes('const understandNextTarget: GuidedWorkspaceTarget = research')],
 ['etapas antigas escondidas no primeiro acesso',workspace.includes('useState(false)') && workspace.includes('{showServiceStructure && <section className="bo-h740h7-path">')],
 ['usuário pode ver estrutura completa',workspace.includes('estrutura completa do serviço') && workspace.includes('aria-expanded={showServiceStructure}')],
 ['cabeçalho direto no primeiro acesso',workspace.includes("workspaceTab === 'overview' && !showServiceStructure ? <header")],
 ['etapas do serviço não competem no editor Journey',!workspace.includes('<nav className="bo-h740h7-tool-phases"')],
 ['novo criador ocupa área de trabalho',workspace.includes('data-journey-starter="full-page"')],
 ['antigo modal de criação foi retirado',!workspace.includes('journeyCreateOpen && <div className="bo-h724-modal-backdrop"')],
 ['nome opcional com padrão seguro',workspace.includes("journeyDraftName.trim() || 'Novo mapa'")],
 ['opção mapa em branco',workspace.includes("journeyStartTemplate === 'blank'")],
 ['opções de modelos reais',workspace.includes('starterTemplates.map')],
 ['modelos usam dados existentes',workspace.includes('journeyApi()?.model?.()?.templates')],
 ['modelo escolhido ou solicitado chega ao runtime',workspace.includes('{ templateId: requestedTemplate ?? journeyStartTemplate }')&&workspace.includes("(requestedTemplate ?? journeyStartTemplate) !== 'blank'")],
 ['runtime aceita templateId',runtime.includes('opts.templateId') && runtime.includes('t.stages.entries()')],
 ['modelos têm etapas reais editáveis',templates.includes("id:'essential'") && templates.includes('stages:')],
 ['modelo é identificado como exemplo editável',workspace.includes('exemplos não representam fatos confirmados')],
 ['mapa abre logo após criação',workspace.includes('await openJourney(created.id)') && workspace.includes('prepareJourneyBlueprintDraft(latest, id, { allowEmpty: true })')],
 ['abertura integrada sem overlay',workspace.includes('runtime.selectInWorkspace(id)') && runtime.includes('function selectJourneyInWorkspace(id)') && runtime.includes('selectInWorkspace:selectJourneyInWorkspace')],
 ['primeira etapa nasce dentro do mapa',journey.includes('data-first-stage-inline="1"')],
 ['campo alimenta stageDraft canônico',journey.includes('setStageDraft((current) => ({ ...current, title: event.target.value }))')],
 ['botão realmente chama criação da etapa',journey.includes('onClick={createStage} disabled={!stageDraft.title.trim()}')],
 ['novas etapas inline no fim do mapa',journey.includes('data-stage-add-inline="1"') && journey.includes('Adicionar ao mapa')],
 ['edição da etapa permanece no editor',journey.includes('updateStageCore(selectedStage.id')],
 ['captura descoberta sem sair do mapa',journey.includes('captureContextDuringJourney')],
 ['mapa permite Persona/Necessidade/Dor/Evidência',journey.includes('option value="persona"') && journey.includes('option value="need"') && journey.includes('option value="pain"') && journey.includes('option value="evidence"')],
 ['CSS responsivo e redução de movimento',css.includes('max-width:620px') && css.includes('prefers-reduced-motion')],
 ['CSS importado',r('src/style.css').includes("@import './runtime/direct-journey-reference-h1704.css';")],
 ['smoke ligado ao QA',pkg.scripts.qa.includes('v1205h1704:reference-workflow-smoke')],
 ['launcher atualizado',(r('start-linux.sh').includes('RELEASE="H17.0.5"') || r('start-linux.sh').includes('RELEASE="H17.0.4"'))],
 ['pesquisa histórica não destruída',fs.existsSync('src/views/ResearchStudioView.tsx')],
];
let passed=0;for(const [name,ok] of checks){if(ok)passed++;else console.error('FAIL',name)}
console.log(`H17.0.4 Reference Workflow: ${passed}/${checks.length} PASS`);
if(passed!==checks.length)process.exit(1);

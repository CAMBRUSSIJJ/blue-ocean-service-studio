import fs from 'node:fs';
const read = (path) => fs.readFileSync(path, 'utf8');
const free = read('src/views/JourneyCanvasFree.tsx');
const parent = read('src/views/JourneyView.tsx');
const workspace = read('src/views/BlueprintWorkspaceView.tsx');
const studio = read('src/state/useStudioController.ts');
const css = read('src/runtime/journey-free-canvas-h1705.css');
const style = read('src/style.css');
const pkg = JSON.parse(read('package.json'));
const launcher = read('start-linux.sh');
const preflight = read('preflight-linux.sh');
const changelog = read('CHANGELOG.md');
const checks = [
 ['base H17.0.4 preservada', workspace.includes('data-journey-reference-flow="H17.0.4"')],
 ['editor novo selecionado como padrão', parent.includes('const [showCanvasMatrix, setShowCanvasMatrix] = useState(false)')],
 ['componente funcional integrado', parent.includes('return <JourneyCanvasFree')],
 ['modo antigo ainda acessível', parent.includes('setShowCanvasMatrix(true)') && parent.includes('setShowCanvasMatrix(false)')],
 ['mapa abre em tela expandida', free.includes('useState(true)') && css.includes('.bo-h1705-journey.is-expanded{position:fixed')],
 ['voltar ao serviço dispara rota', free.includes("detail: 'overview'") && workspace.includes("window.addEventListener('bo-service-workspace-tab'")],
 ['mapa livre possui identificação própria', free.includes('data-journey-free-map="1"')],
 ['painel horizontal com faixa de etapas', free.includes('bo-h1705-board') && css.includes('.bo-h1705-lane-label')],
 ['colunas vinculadas a etapas canônicas', free.includes('activeStages.map((stage, index)') && free.includes('data-journey-stage-id={stage.id}')],
 ['colunas não são decorativas', free.includes('onDrop={(event) => handleStageDrop(event, stage.id)}')],
 ['drag de etapa real', free.includes('handleStageDragStart(event, stage.id)')],
 ['etapa edita título real', free.includes("updateStageCore(selectedStage.id, 'title'")],
 ['ação do cliente editável', free.includes("updateStageCore(selectedStage.id, 'customerAction'")],
 ['pensamentos via modelo existente', free.includes('updateStageExperience(selectedStage.id, { thoughts: value })')],
 ['emoções reais', free.includes("updateStageCore(selectedStage.id, 'emotion', emotion)")],
 ['touchpoint real', free.includes('addTouchpointToStage(selectedStage.id, newTouchpointName)')],
 ['remoção de touchpoint real', free.includes('removeTouchpointFromStage(selectedStage.id, id)')],
 ['criação de primeira etapa e seguintes', free.includes('createStage()') && free.includes("!orderedStages.length")],
 ['draft usa estado canônico', free.includes('setStageDraft((current) => ({ ...current, title: event.target.value }))')],
 ['opções de edição sob demanda', free.includes('setShowFilters') && free.includes('viewThoughts') && free.includes('viewEmotions') && free.includes('viewTouchpoints')],
 ['linhas opcionais permanecem sem excluir dados', !free.includes('delete current.stages') && !free.includes('deleteStageFromGraph')],
 ['escolha mapa/matriz', free.includes('Mapa livre') && free.includes('Matriz detalhada') && free.includes('onMatrix()')],
 ['inspector contextual', free.includes('bo-h1705-inspector') && free.includes('selectedStage &&')],
 ['captura Pessoa, Necessidade, Dor, Evidência', ["value=\"persona\"", "value=\"need\"", "value=\"pain\"", "value=\"evidence\""].every(x => free.includes(x))],
 ['descobertas passam pelo método canônico', free.includes('onCaptureContext(newContextKind, title)') && parent.includes('createContextEntity(current, kind, title)')],
 ['salvamento não afirma sucesso em caso de erro', free.includes("saveStatus === 'saved'") && free.includes("saveStatus === 'saving'") && free.includes('Erro ao salvar')],
 ['zoom e mini ferramentas', free.includes('setZoom') && free.includes('bo-h1705-bottom-bar')],
 ['volta a versão anterior sem substituir dados', free.includes('onMatrix') && parent.includes('bo-h79-map-grid')],
 ['layout responsivo', css.includes('@media(max-width:880px)') && css.includes('@media(max-width:530px)')],
 ['sintaxe CSS balanceada em declarações', (css.match(/\{/g)||[]).length === (css.match(/\}/g)||[]).length],
 ['CSS carregado pelo bundle', style.includes("@import './runtime/journey-free-canvas-h1705.css';")],
 ['versão de release específica', launcher.includes('RELEASE="H17.0.5"')],
 ['metadata do release', pkg.description.includes('H17.0.5 Journey Free Canvas')],
 ['QA chama a nova regressão', pkg.scripts.qa.includes('v1205h1705:free-canvas-smoke')],
 ['preflight chama regressão', preflight.includes('node scripts/v1205h1705-free-canvas-smoke.mjs')],
 ['changelog e notas de entrega', changelog.includes('H17.0.5') && fs.existsSync('RELEASE_NOTES_V1.20.5-H17.0.5.md')],
];
let passed=0;
for (const [label,ok] of checks) { if(ok) passed++; else console.error('FAIL',label); }
console.log(`H17.0.5 Journey Free Canvas: ${passed}/${checks.length} PASS`);
if(passed!==checks.length) process.exit(1);

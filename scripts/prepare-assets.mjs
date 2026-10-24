import { transpileModule, ModuleKind, ScriptTarget } from 'typescript';
import { copyFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync, writeFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json','utf8'));
const appVersion = String(pkg.version);

mkdirSync('public', { recursive: true });
mkdirSync('src/generated', { recursive: true });
writeFileSync('public/v1102-blueprint-methodology.js', transpileModule(readFileSync('src/services/blueprint-methodology.ts', 'utf8'), { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText);
copyFileSync('src/services/blueprint-guided-reading.js', 'public/v1102-blueprint-guided-reading.js');
copyFileSync('src/runtime/blueprint-reference-view.js', 'public/v1102-blueprint-reference-view.js');
copyFileSync('src/runtime/journey-matrix.html', 'public/blueprint-reference-original.html');
copyFileSync('src/runtime/journey-matrix.css', 'public/journey-matrix.css');
copyFileSync('src/runtime/journey-growth-ui.js', 'public/v1102-journey-growth-ui.js');
copyFileSync('src/runtime/journey-content-ui.js', 'public/v1102-journey-content-ui.js');
copyFileSync('src/runtime/journey-card-tools-ui.js', 'public/v1102-journey-card-tools-ui.js');
copyFileSync('src/runtime/journey-views-ui.js', 'public/v1102-journey-views-ui.js');
writeFileSync('public/v1102-journey-views.js', readFileSync('src/services/journey-views.js', 'utf8').replace('./journey-content.js', './v1102-journey-content.js'));
copyFileSync('src/runtime/journey-context-ui.js', 'public/v1102-journey-context-ui.js');
copyFileSync('src/services/journey-context.js', 'public/v1102-journey-context.js');
copyFileSync('src/runtime/journey-picker-ui.js', 'public/v1102-journey-picker-ui.js');
copyFileSync('src/runtime/journey-elements-ui.js', 'public/v1102-journey-elements-ui.js');
writeFileSync('public/v1102-journey-elements.js', readFileSync('src/services/journey-elements.js', 'utf8').replace('./journey-content.js', './v1102-journey-content.js'));
copyFileSync('src/services/journey-content.js', 'public/v1102-journey-content.js');
const contentShared = readFileSync('src/services/journey-content.js', 'utf8').replace(/^export /gm, '');
writeFileSync('public/v1102-journey-content-shared.js', '(()=>{'+contentShared+';window.BlueOceanJourneyContent={insertMatrixBlock,duplicateMatrixBlock,MATRIX_REFERENCE_TYPES,MATRIX_CONTENT_TYPES,MATRIX_IMAGE_LIMIT,MATRIX_IMAGE_BUDGET,MATRIX_CARD_TONES,normalizeMatrixCardMetadata,normalizeMatrixCardFilters,matrixCardMatches,applyMatrixCardAction,matrixSafeUrl,matrixEmbedUrl,normalizeMatrixScale,normalizeMatrixBlock,normalizeMatrixRow,validateMatrixDocument};})();');
for (const name of ['journey-growth', 'improvement-backlog', 'improvement-portfolio', 'service-outcomes', 'current-future-service']) {
  let generated = transpileModule(readFileSync(`src/services/${name}.ts`, 'utf8'), { compilerOptions: { module: ModuleKind.ESNext, target: ScriptTarget.ES2022 } }).outputText;
  for (const dependency of ['improvement-backlog', 'improvement-portfolio', 'service-outcomes', 'current-future-service']) generated = generated.replaceAll(`./${dependency}.ts`, `./v1102-${dependency}.js`);
  writeFileSync(`public/v1102-${name}.js`, generated);
}
writeFileSync('src/generated/app-version.ts', `// Gerado por scripts/prepare-assets.mjs. Não edite manualmente.\nexport const APP_VERSION = ${JSON.stringify(appVersion)} as const;\nexport const APP_VERSION_LABEL = ${JSON.stringify('V'+appVersion)} as const;\n`);
writeFileSync('public/app-version.json', JSON.stringify({product:'BLUE OCEAN Service Studio',version:appVersion}, null, 2)+'\n');
writeFileSync('VERSION', appVersion+'\n');
for (const name of readdirSync('public')) {
  if (/^v\d+-(whiteboard|shell|journey-home|ui|runtime-registry|persistence-kernel|data-integrity|view-config|journey-templates|research-workspace|service-layers|presentation-workshop|service-intelligence|benefits-realization|operating-review|collaboration|practical-simulation|practical-simulation-data|stability|design-system|workspace-home|global-navigation|precision-studio|shell-consistency|library|wizard|unified-workspaces|whiteboard-final|responsive-a11y|brand-polish|home3|service-health|attention-engine|workspace-preferences|guidance-engine)\.(js|css)$/.test(name) || ['blue-ocean-mark.svg','blue-ocean-empty-state.svg','favicon.svg','bo-ocean-wave-1181.webp'].includes(name)) unlinkSync('public/' + name);
}
for (const [source, target] of [
  ['runtime/runtime-registry.js', 'v1102-runtime-registry.js'],
  ['runtime/persistence-kernel.js', 'v1102-persistence-kernel.js'],
  ['runtime/data-integrity.js', 'v1102-data-integrity.js'],
  ['runtime/view-config.js', 'v1102-view-config.js'],
  ['runtime/journey-templates.js', 'v1102-journey-templates.js'],
  ['runtime/blueprint-from-selection.js', 'v1102-blueprint-from-selection.js'],
  ['runtime/research-workspace.js', 'v1102-research-workspace.js'],
  ['runtime/research-workspace.css', 'v1102-research-workspace.css'],
  ['runtime/service-layers.js', 'v1102-service-layers.js'],
  ['runtime/service-layers.css', 'v1102-service-layers.css'],
  ['runtime/presentation-workshop.js', 'v1102-presentation-workshop.js'],
  ['runtime/presentation-workshop.css', 'v1102-presentation-workshop.css'],
  ['runtime/service-intelligence.js', 'v1102-service-intelligence.js'],
  ['runtime/service-intelligence.css', 'v1102-service-intelligence.css'],
  ['runtime/benefits-realization.js', 'v1102-benefits-realization.js'],
  ['runtime/benefits-realization.css', 'v1102-benefits-realization.css'],
  ['runtime/operating-review.js', 'v1102-operating-review.js'],
  ['runtime/operating-review.css', 'v1102-operating-review.css'],
  ['runtime/collaboration.js', 'v1102-collaboration.js'],
  ['runtime/collaboration.css', 'v1102-collaboration.css'],
  ['runtime/practical-simulation-data.js', 'v1102-practical-simulation-data.js'],
  ['runtime/practical-simulation.js', 'v1102-practical-simulation.js'],
  ['runtime/practical-simulation.css', 'v1102-practical-simulation.css'],
  ['runtime/guidance-engine.js', 'v1188-guidance-engine.js'],
  ['runtime/guidance-engine.css', 'v1188-guidance-engine.css'],
  ['runtime/whiteboard-core.js', 'v1102-whiteboard.js'],
  ['runtime/whiteboard-core.css', 'v1102-whiteboard.css'],
  ['runtime/shell.js', 'v1102-shell.js'],
  ['runtime/shell.css', 'v1102-shell.css'],
  ['runtime/journey-home.js', 'v1102-journey-home.js'],
  ['runtime/editor-ui.css', 'v1102-ui.css'],

  ['runtime/blue-ocean-shell.js', 'v1120-shell.js'],
  ['runtime/blue-ocean-shell.css', 'v1120-shell.css'],
  ['runtime/stability.js', 'v1120-stability.js'],
  ['runtime/stability.css', 'v1120-stability.css'],
  ['runtime/workspace-home.js', 'v1140-workspace-home.js'],
  ['runtime/workspace-home.css', 'v1140-workspace-home.css'],
  ['runtime/global-navigation.js', 'v1150-global-navigation.js'],
  ['runtime/global-navigation.css', 'v1150-global-navigation.css'],
  ['runtime/precision-studio-shell.js', 'v1153-precision-studio.js'],
  ['runtime/precision-studio-shell.css', 'v1153-precision-studio.css'],
  ['runtime/shell-consistency.js', 'v1163-shell-consistency.js'],
  ['runtime/shell-consistency.css', 'v1163-shell-consistency.css'],
  ['runtime/library.css', 'v1171-library.css'],
  ['runtime/wizard2.css', 'v1172-wizard.css'],
  ['runtime/unified-workspaces.js', 'v1173-unified-workspaces.js'],
  ['runtime/unified-workspaces.css', 'v1173-unified-workspaces.css'],
  ['runtime/whiteboard-finalization.css', 'v1174-whiteboard-final.css'],
  ['runtime/responsive-accessibility.js', 'v1175-responsive-a11y.js'],
  ['runtime/responsive-accessibility.css', 'v1175-responsive-a11y.css'],
  ['runtime/brand-polish.js', 'v1176-brand-polish.js'],
  ['runtime/brand-polish.css', 'v1176-brand-polish.css'],
  ['runtime/home3.css', 'v1182-home.css'],
  ['runtime/service-health.css', 'v1183-service-health.css'],
  ['runtime/attention-engine.css', 'v1184-attention-engine.css'],
  ['runtime/workspace-preferences.css', 'v1185-workspace-preferences.css'],
  ['runtime/service-architecture.css', 'v1186-service-architecture.css'],
]) {
  const from='src/' + source, to='public/' + target;
  if (source.endsWith('.js')) {
    let text=readFileSync(from,'utf8');
    const rewrites={
      './runtime-registry.js':'./v1102-runtime-registry.js',
      './data-integrity.js':'./v1102-data-integrity.js',
      './persistence-kernel.js':'./v1102-persistence-kernel.js',
      './view-config.js':'./v1102-view-config.js',
      './journey-templates.js':'./v1102-journey-templates.js',
      './blueprint-from-selection.js':'./v1102-blueprint-from-selection.js',
      './blueprint-methodology.js':'./v1102-blueprint-methodology.js',
      '../services/blueprint-guided-reading.js':'./v1102-blueprint-guided-reading.js',
      './guidance-engine.js':'./v1188-guidance-engine.js',
      './blueprint-reference-view.js':'./v1102-blueprint-reference-view.js',
      '../services/journey-growth.js':'./v1102-journey-growth.js',
      '../services/journey-content.js':'./v1102-journey-content.js',
      '../services/journey-elements.js':'./v1102-journey-elements.js',
      '../services/journey-context.js':'./v1102-journey-context.js',
      '../services/journey-views.js':'./v1102-journey-views.js',
      './practical-simulation-data.js':'./v1102-practical-simulation-data.js',
    };
    for (const [a,b] of Object.entries(rewrites)) text=text.split(a).join(b);
    text=text.replaceAll('__APP_VERSION__', appVersion);
    writeFileSync(to,text);
  } else copyFileSync(from,to);
}

for (const [source, target] of [
  ['src/brand/blue-ocean-mark.svg', 'public/blue-ocean-mark.svg'],
  ['src/brand/blue-ocean-empty-state.svg', 'public/blue-ocean-empty-state.svg'],
  ['src/brand/favicon.svg', 'public/favicon.svg'],
  ['src/brand/bo-ocean-wave-1181.webp', 'public/bo-ocean-wave-1181.webp'],
]) copyFileSync(source, target);


// V1.13.0 — permanent semantic Design System asset loaded after legacy runtime CSS.
const designSystemCss = [
  'src/design-system/tokens.css',
  'src/design-system/components.css',
  'src/design-system/legacy-compat.css',
].map(file => readFileSync(file, 'utf8')).join('\n\n');
writeFileSync('public/v1130-design-system.css', designSystemCss);

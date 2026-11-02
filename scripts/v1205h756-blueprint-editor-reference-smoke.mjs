import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(path,'utf8');
const ui=read('src/runtime/journey-cad-ui.js');
const style=read('src/runtime/journey-cad.css');
const runtime=read('src/runtime/journey-matrix.html');
const assets=read('scripts/prepare-assets.mjs');

// The uploaded HTML is adapted on top of the real CAD engine; never swap in
// a disconnected HTML mock that cannot persist cards or relationships.
assert(ui.includes("view==='blueprint'?' bo-h756-blueprint'"), 'only Blueprint gets the reference shell');
assert(ui.includes('data-blueprint-editor-layout="H7.56"'), 'layout is identifiable in real runtime');
assert(ui.includes('bo-h756-crumb'), 'breadcrumb matches reference editor');
assert(ui.includes('bo-h756-save-badge') && ui.includes('data-save-status'), 'real save indicator remains wired');
assert(runtime.includes("el.dataset.savePhase=ok==='pending'"), 'save badge updates from host acknowledgements');
assert(ui.includes('bo-h756-palette-action') && ui.includes("cadButton('cad-library','+ Novo componente'"), 'palette creates real components');
assert(ui.includes('bo-h756-properties-head') && ui.includes("cadButton('cad-close','Fechar detalhes'"), 'properties close through CAD action');
assert(ui.includes('cadSvg()') && ui.includes('cadInspector()') && ui.includes('cadLibrary()'), 'canvas, props and library reuse canonical engine');
assert(ui.includes("cadButton('step','+ Etapa'") && ui.includes("data-cad-view"), 'real stage and view actions remain available');
assert(ui.includes("cadButton('undo','↶'") && ui.includes("cadButton('redo','↷'"), 'undo and redo remain available');
assert(style.includes('.bo-h756-blueprint .cad-library:hover') && style.includes('.bo-h756-blueprint .cad-library:focus-within'), 'palette expands on hover and keyboard focus');
assert(style.includes('.bo-h756-blueprint .cad-workspace.has-inspector') && style.includes('position:absolute'), 'inspector overlays canvas');
assert(style.includes('.bo-h756-blueprint #cad-svg .cad-lane-bg'), 'blueprint lanes match supplied visual system');
assert(style.includes('@media(max-width:760px)') && style.includes('prefers-reduced-motion'), 'responsive and motion alternatives');
assert(assets.includes("copyFileSync('src/runtime/journey-cad-ui.js'") && assets.includes("copyFileSync('src/runtime/journey-cad.css'"), 'runtime build packages both updated assets');
console.log('PASS H7.56 reference editor: canonical canvas with source-inspired header, palette, stages, inspector and save.');

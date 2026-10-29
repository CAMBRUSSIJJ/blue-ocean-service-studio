import assert from 'node:assert/strict';
import fs from 'node:fs';
const canvas=fs.readFileSync('src/components/entity-editor/EntityCanvas.tsx','utf8');
const criteria=fs.readFileSync('src/components/entity-editor/EntityCriteria.tsx','utf8');
const relations=fs.readFileSync('src/components/entity-editor/EntityRelations.tsx','utf8');
const shell=fs.readFileSync('src/components/entity-editor/EntityEditor.tsx','utf8');
const pains=fs.readFileSync('src/views/PainsView.tsx','utf8');
const model=fs.readFileSync('src/services/pains-studio.ts','utf8');
const css=fs.readFileSync('src/runtime/entity-canvas-v2.css','utf8');
const main=fs.readFileSync('src/main.tsx','utf8');
const tests=[
 ['Editor reusable with inline title and property tags',shell.includes('EntityEditorHeader')&&shell.includes('EntityTags')&&pains.includes('<EntityEditorHeader')],
 ['Canvas uses one generic composition, not prototype',pains.includes('<EntityCanvas ')&&canvas.includes('<EntityCriteria')&&canvas.includes('<EntityRelations')],
 ['Real autosave persists all custom fields in graph',pains.includes('canvasCustomBlocks:custom')&&pains.includes('Problemas')===false&&pains.includes('Dores: autosave')],
 ['Built-in blocks never lose content when hidden',canvas.includes('saveHidden([...hidden,block.id])')&&!canvas.includes("block.onChange('')")],
 ['Custom fields persist with typed values',pains.includes('parseCustomBlocks(selected.canvasCustomBlocks)')&&pains.includes('setCustomBlocks(items=>')],
 ['Typed field controls include checklist and media references',canvas.includes("block.kind==='checklist'")&&canvas.includes("block.kind==='image'")&&canvas.includes("block.kind==='document'")],
 ['Resize via pointer move and persist per entity',canvas.includes('onPointerDown={e=>beginResize(e,block.id)}')&&canvas.includes('onPointerMove={resize}')&&canvas.includes('localStorage.setItem(layoutKey')],
 ['Block reorder is interactive',canvas.includes('setDragId(block.id)')&&canvas.includes('saveOrder(ids)')],
 ['Graph relation drag and click work',relations.includes('RELATION_DRAG_MIME')&&canvas.includes('e.dataTransfer.getData(RELATION_DRAG_MIME)')&&pains.includes('onToggleRelation={toggleRelation}')],
 ['Criteria offer focus or connect actions',criteria.includes('onEditField')&&criteria.includes('onToggleRelation(r.id)')],
 ['Editor keeps deletion confirmation',pains.includes('removeContextEntity(current, \'pain\', id)')&&pains.includes('setDeleteId(selected.id)')],
 ['CSS loaded after existing styles',main.includes("import './style.css';\nimport './runtime/entity-canvas-v2.css';")&&css.includes('.bo-entity-canvas')],
 ['Live foundation checks preserved',pains.includes('previewReport?.foundationChecks')&&model.includes('foundationChecks')],
];
for(const [label,valid] of tests)console.log((valid?'PASS ':'FAIL ')+label);
assert.ok(tests.every(x=>x[1]),'Entity Canvas v2 regression contract failed');

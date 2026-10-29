import assert from 'node:assert/strict';import fs from 'node:fs';
const cad=fs.readFileSync('src/runtime/journey-cad-ui.js','utf8');
const css=fs.readFileSync('src/runtime/journey-cad.css','utf8');
const shared=fs.readFileSync('src/services/blueprint-canvas.js','utf8');
const checks=[
['Cell click creates inline draft instead of opening component chooser',cad.includes("if(action==='cad-cell-add')")&&cad.includes("cadStartQuick(cadInlineKind(data.row),Number(data.si),data.row,point,true)")],
['Inline title is inside provisional canvas node',cad.includes('<foreignObject')&&cad.includes('data-cad-inline-title')&&cad.includes("node.note.draft&&cadState.creating?.inline")],
['A draft is not persisted until Enter',cad.includes('function cadSubmitInline(openDetails=false)')&&cad.includes("cadSend('canvas-create',{input})")&&cad.includes("if(!title){cadNotice")],
['Escape cancels without creating an item',cad.includes("if(event.key==='Escape'){event.preventDefault();cadAction('cad-cancel',{})")],
['Keyboard starts in title',cad.includes('cadFocusInline()')&&cad.includes("input?.focus()")],
['Suggestions appear after at least three characters',cad.includes('needle.length<3')&&cad.includes('function cadRefreshInlineSuggestions')],
['The suggestion is opt-in with ignore/create new',cad.includes("action==='cad-inline-reuse'")&&cad.includes("action==='cad-inline-ignore'")],
['Single click opens properties panel for detail',cad.includes("cadSelect(data.id,point,false)")&&cad.includes("cadSelect(node.dataset.id,{x:event.clientX,y:event.clientY},false)")],
['Dragging a component creates its own type inline',cad.includes("cadStartQuick(kind,target.stage.index,target.row.id,{x:event.clientX+12,y:event.clientY+12},!cadMobile())")],
['Customer action lane maps to customer action (not pain)',cad.includes("ac:'customer-action'")&&cad.includes("im:'pain'")],
['Enter keeps the map and Shift+Enter opens the inspector',cad.includes("cadSubmitInline(event.shiftKey)")&&cad.includes("const wasInline=!!cadState.creating?.inline,openInlineDetails=")&&cad.includes("cadState.inspector=(!wasInline||openInlineDetails)")],
['Expand icon saves and opens details',cad.includes('data-act="cad-inline-expand"')&&cad.includes("if(action==='cad-inline-expand'){cadSubmitInline(true)")],
['Inspector opens only after save and focuses description',cad.includes("if(openInlineDetails){const entry=blueprintNote(data.noteId)")&&cad.includes("if(openInlineDetails)app.querySelector('#cad-component-form [name=\"description\"]')?.focus()")],
['Title is written directly on card without white textbox',css.includes('background:transparent!important')&&css.includes('border:0!important')&&css.includes('.cad-inline-hint{position:absolute')],
['External keyboard hint is complete',cad.includes('Enter guarda · Shift+Enter detalha · Esc cancela')],
['Inline draft has contextual placeholder',cad.includes('cadInlinePlaceholder(cadState.creating.kind)')&&cad.includes("'customer-action':'Escreva a ação…'")],
['Shallow status is visible and discreet',cad.includes('cad-depth-indicator')&&cad.includes('Só título')&&css.includes('.cad-depth-indicator')],
['Responsive fallback retains existing mobile form',cad.includes('if(!cadMobile()&&S.steps[Number(data.si)])')],
['Existing source validation remains canonical',cad.includes('cadModel.prepareCanvasInput(S,input)')&&shared.includes('canvasAcceptsNewRow')],
['Canvas CSS survives generated asset pipeline',fs.readFileSync('scripts/prepare-assets.mjs','utf8').includes("copyFileSync('src/runtime/journey-cad.css'")],
];for(const [name,ok] of checks)console.log((ok?'PASS ':'FAIL ')+name);assert.ok(checks.every(c=>c[1]),'Blueprint inline canvas contract failure');

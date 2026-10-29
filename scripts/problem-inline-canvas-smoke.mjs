import fs from 'node:fs';
import assert from 'node:assert/strict';
const view=fs.readFileSync('src/views/ProblemsView.tsx','utf8');
const canvas=fs.readFileSync('src/components/EntityInlineCanvas.tsx','utf8');
const service=fs.readFileSync('src/services/problems-studio.ts','utf8');
const css=fs.readFileSync('src/runtime/problems-inline.css','utf8');
const main=fs.readFileSync('src/main.tsx','utf8');
const details=view.slice(view.indexOf('if (selected && draft && report)'),view.indexOf('return <section className="bo-h76-problems" data-problems-h76="library"'));
const tests=[
 ['Editor de Problemas sem campo de título duplicado',details.includes('aria-label="Enunciado do problema"')&&!details.includes('<span>Problema</span><input')],
 ['Metadados acima do canvas',details.includes('bo-hyp-inline-properties')&&details.includes('Severidade:')&&details.includes('Prioridade:')&&details.includes('Responsável:')&&details.includes('Tags:')],
 ['Campos essenciais declarados', ['description','rootCause','impact'].every(id=>details.includes(`id:'${id}'`)&&details.includes(`essential:true`))],
 ['População e sinal apenas progressivos',details.includes("id:'affectedPopulation'")&&details.includes("id:'observableSignal'")&&canvas.includes('bo-inline-ghosts')],
 ['Ações do menu não criam barra de salvamento inferior',!details.includes('bo-h71-detail-actions')&&details.includes('bo-problem-actions-popover')],
 ['Autosave real persiste ao sair',view.includes('Problemas: autosave')&&view.includes('flushRef.current=() =>')&&view.includes('window.setTimeout(()=>persistProblem(')],
 ['Qualidade deriva da engine',details.includes('preview.qualityChecks.map')&&service.includes('qualityChecks')],
 ['Critérios oferecem edição e conexão',details.includes("fieldId:check.id===")&&details.includes("relationKinds:check.id===")&&canvas.includes("activateField(")&&canvas.includes('setConnect(')],
 ['Origem é rastreável, não falsamente validada',details.includes("preview.sourceHypothesis")&&details.includes('Criado diretamente')&&details.includes('Hipóteses relacionadas')],
 ['Service Graph fornece relações rápidas',details.includes('problemRelationOptions')===false&&details.includes('relationOptions.map(item=>')&&canvas.includes('application/x-bo-relation')],
 ['Validação explícita com evidências preservada',details.includes('validateDraftProblem')&&details.includes('qualityChecks')&&view.includes("status: 'validated'")],
 ['Exclusão confirmada e grafo preservado',details.includes('role="alertdialog"')&&view.includes("removeContextEntity(current, 'problem', id)")],
 ['Tema claro compartilhado e isolado',main.includes("import './runtime/entity-inline-canvas.css';\nimport './runtime/problems-inline.css';")&&css.includes('bo-problem-origin')],
];
for(const [name,pass] of tests){console.log((pass?'PASS ':'FAIL ')+name)}
assert.ok(tests.every(test=>test[1]),'Problem Inline Editor: contract failed');
console.log('Problem Inline Editor: '+tests.length+' PASS');

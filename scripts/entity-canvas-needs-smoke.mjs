import assert from 'node:assert/strict';
import fs from 'node:fs';
const view=fs.readFileSync('src/views/NeedsView.tsx','utf8');
const canvas=fs.readFileSync('src/components/entity-editor/EntityCanvas.tsx','utf8');
const header=fs.readFileSync('src/components/entity-editor/EntityEditor.tsx','utf8');
const style=fs.readFileSync('src/runtime/entity-canvas-v2.css','utf8');
const checks=[
 ['Necessidades utiliza o mesmo editor de Dores',view.includes('<EntityEditorHeader')&&view.includes('<EntityCanvas')&&view.includes('bo-need-editor')],
 ['Título de necessidade é o campo inline',view.includes('onChangeTitle={value=>setDraft')&&!view.includes('Nome da necessidade</span><input value={draft.title}')],
 ['Propriedades sob título',view.includes('Importância: <select')&&view.includes('<EntityTags value={tagsText}')],
 ['Contexto e resultado são os campos principais',view.includes("id:'context'")&&view.includes("id:'desiredOutcome'")&&view.includes('essential:true')],
 ['Descrição e campos adicionais são progressivos',view.includes("id:'description'")&&view.includes("id:'successSignal'")&&canvas.includes('bo-pain-canvas-ghosts')],
 ['Autosave persiste dados reais',view.includes('Necessidades: autosave')&&view.includes("canvasCustomBlocks:custom")&&view.includes('flushRef.current=()=>')],
 ['Criar campos personalizados',view.includes('onAddCustom={addCustom}')&&view.includes('onRenameCustom={renameCustom}')],
 ['Relacionamento com Serviço preservado',view.includes('updateNeedProfile')&&view.includes('needRelationOptions(graph)')&&view.includes('onToggleRelation={toggleRelation}')],
 ['Critérios permitem corrigir campo e vínculo',view.includes("fieldId:check.id==='statement'?'description'")&&view.includes("kinds:check.id==='persona'")],
 ['Não existe barra inferior de salvamento',!view.includes('bo-h71-detail-actions')],
 ['Excluir não apaga outras entidades',view.includes("removeContextEntity(current, 'need', id)")&&view.includes('role="alertdialog"')],
 ['Layout em duas colunas reflete arquivo enviado',style.includes('grid-template-columns:repeat(2,minmax(0,1fr))')],
 ['Cabeçalho único compartilhado',header.includes('EntityEditorHeader')&&header.includes('EntityTags')],
];
for(const [name,ok] of checks)console.log((ok?'PASS ':'FAIL ')+name);
assert.ok(checks.every(x=>x[1]),'Needs inline Entity Canvas regression failed');

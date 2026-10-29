import fs from 'node:fs';import assert from 'node:assert/strict';
const view=fs.readFileSync('src/views/ProblemsView.tsx','utf8');
const core=fs.readFileSync('src/services/context-library.ts','utf8');
const studio=fs.readFileSync('src/services/problems-studio.ts','utf8');
const canvas=fs.readFileSync('src/components/entity-editor/EntityCanvas.tsx','utf8');
const checks=[
 ['Direct problem creation available',view.includes("const createProblem = () =>")&&view.includes("status:'draft'")&&view.includes('Criar problema')],
 ['Context-library direct creation is a draft',core.includes("if (kind === 'problem')")&&core.includes("status: 'draft'")],
 ['Profile updates do not validate drafts',studio.includes("existing.status === 'draft' ? 'draft'")],
 ['Explicit validation gated on all quality checks',view.includes("filter(item => item.id !== 'validated')")&&view.includes('required.every(item => item.complete)')],
 ['Explicit validation requires confirmation',view.includes("window.confirm('Confirmar que este problema")&&view.includes("status: 'validated'")],
 ['Problems uses shared component',view.includes('<EntityEditorHeader')&&view.includes('<EntityCanvas')&&view.includes("entityKey={'problem:'+selected.id}")],
 ['Problem structure is progressive',["description","rootCause","impact"].every(id=>view.includes("id:'"+id+"'"))&&["affectedPopulation","observableSignal"].every(id=>view.includes("id:'"+id+"'"))&&canvas.includes('bo-pain-canvas-ghosts')],
 ['Metadata in header',view.includes('Severidade: <select')&&view.includes('Prioridade: <select')&&view.includes('<EntityTags value={tagsText}')],
 ['Problem origin shown and source protected',view.includes('Origem e rastreabilidade')&&view.includes("sourceHypothesisId")&&view.includes('não pode ser desvinculada')],
 ['Criteria from studio with active connections',view.includes('preview.qualityChecks.map')&&view.includes('onToggleRelation={toggleRelation}')&&view.includes("kinds:check.id===")],
 ['Evidence and other tabs preserved',view.includes("detailTab === 'evidence'")&&view.includes("detailTab === 'context'")&&view.includes("detailTab === 'definition'")&&view.includes("detailTab === 'usage'")],
 ['Autosave includes custom blocks and direct graph writes',view.includes('canvasCustomBlocks:custom')&&view.includes('Problemas: autosave')&&view.includes('customBlocks,dirty')],
 ['Delete does not resurrect removed entity',view.includes('closeProblem(false)')&&view.includes("removeContextEntity(current, 'problem', id)")],
 ['No fixed footer save',!view.includes('className="bo-h71-detail-actions"')],
];checks.forEach(([name,ok])=>console.log((ok?'PASS ':'FAIL ')+name));assert.ok(checks.every(x=>x[1]),'Problem Entity Canvas smoke failed');

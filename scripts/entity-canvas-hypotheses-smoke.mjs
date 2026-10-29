import fs from 'node:fs'; import assert from 'node:assert/strict';
const view=fs.readFileSync('src/views/HypothesesView.tsx','utf8');
const model=fs.readFileSync('src/services/hypotheses-studio.ts','utf8');
const canvas=fs.readFileSync('src/components/entity-editor/EntityCanvas.tsx','utf8');
const checks=[
 ['Uses shared Entity Canvas',view.includes('<EntityEditorHeader')&&view.includes('<EntityCanvas')&&view.includes("entityKey={'hypothesis:'+selected.id}")],
 ['Single inline title',view.includes('onChangeTitle={value=>setDraft')&&!view.includes('<span>Hipótese</span><input value={draft.title}')],
 ['Three main blocks',["description","premise","expectedBehavior"].every(id=>view.includes("id:'"+id+"'"))&&(view.match(/essential:true/g)||[]).length===3],
 ['Validation and impact are progressive',view.includes("id:'validationCriterion'")&&view.includes("id:'impactIfWrong'")&&canvas.includes('bo-pain-canvas-ghosts')],
 ['Risk confidence owner tags in header',view.includes('Confiança: <select')&&view.includes('Risco: <select')&&view.includes('<EntityTags value={tagsText}')],
 ['Evidence stances retained',view.includes("stance: 'neutral'")&&view.includes("['supports','contradicts','neutral']")&&view.includes('setStance(item.id, stance)')],
 ['Validation remains evidence-gated',view.includes('disabled={!preview.readyToValidate}')&&view.includes('validateHypothesisAsProblem(')&&model.includes('highConfidenceContradictionCount')],
 ['Nine criteria are model-backed',model.includes("id: 'statement'")&&model.includes("id: 'contradiction'")&&view.includes('preview.validationChecks.map')],
 ['Distinct graph relation handlers',view.includes('toggleEvidence(id)')&&view.includes('toggleContext(id)')],
 ['Autosave and custom fields persist',view.includes('Hipóteses: autosave')&&view.includes('canvasCustomBlocks:custom')&&view.includes('contextIds,evidenceLinks,customBlocks,dirty')],
 ['Delete does not save resurrected item',view.includes('closeHypothesis(false)')&&view.includes("removeContextEntity(current, 'problemHypothesis', id)")],
 ['All secondary tabs preserved',["'context'","'evidence'","'validation'","'usage'"].every(id=>view.includes("detailTab === "+id))],
 ['No bottom save bar',!view.includes('className="bo-h71-detail-actions"')],
];for(const [name,ok] of checks)console.log((ok?'PASS ':'FAIL ')+name);assert.ok(checks.every(([_,ok])=>ok));

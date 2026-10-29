import fs from 'node:fs';
import assert from 'node:assert/strict';
const jobs=fs.readFileSync('src/views/JobsView.tsx','utf8');
const service=fs.readFileSync('src/services/jobs-studio.ts','utf8');
const canvas=fs.readFileSync('src/components/entity-editor/EntityCanvas.tsx','utf8');
const checks=[
 ['Jobs uses universal entity header and canvas',jobs.includes('<EntityEditorHeader')&&jobs.includes('<EntityCanvas')&&jobs.includes("entityKey={'job:'+selected.id}")],
 ['Job statement is editable only once',jobs.includes('onChangeTitle={value=>setDraft')&&!jobs.includes('Nome do Job</span><input value={draft.title}')],
 ['Situation, progress and motivation are initial blocks',['situation','desiredProgress','motivation'].every(id=>jobs.includes("id:'"+id+"'"))&&(jobs.match(/essential:true/g)||[]).length===3],
 ['Description, barriers, alternative, success signal are progressive',['description','barriers','currentAlternative','successSignal'].every(id=>jobs.includes("id:'"+id+"'"))&&canvas.includes('bo-pain-canvas-ghosts')],
 ['Statement structure preserved',jobs.includes('Quando ${draft.situation.trim()}, quero ${draft.desiredProgress.trim()}, para poder ${draft.motivation.trim()}')],
 ['Importance, owner and tags are inline',jobs.includes('Importância: <select')&&jobs.includes('<EntityTags value={tagsText}')],
 ['Autosave includes custom fields and relationships',jobs.includes("Jobs: autosave")&&jobs.includes('canvasCustomBlocks:custom')&&jobs.includes('connectedIds,customBlocks,dirty')],
 ['Relation choices are live Service Graph connections',jobs.includes('jobRelationOptions(graph)')&&jobs.includes('onToggleRelation={toggleRelation}')],
 ['Criteria are based on engine, not static checkboxes',jobs.includes('previewReport?.foundationChecks')&&service.includes("id: 'motivation'")],
 ['Job can be deleted without deleting referenced entities',jobs.includes("removeContextEntity(current,'job',id)")&&jobs.includes('role="alertdialog"')],
 ['Secondary tabs preserved',jobs.includes('detailTab === \'people\'')&&jobs.includes('detailTab === \'relations\'')&&jobs.includes('detailTab === \'evidence\'')&&jobs.includes("kind=\"job\"")],
 ['No fixed action footer in Jobs',!jobs.includes('className="bo-h71-detail-actions"')],
];
for(const [name,pass] of checks)console.log((pass?'PASS ':'FAIL ')+name);
assert.ok(checks.every(x=>x[1]),'Jobs shared canvas contract failed');

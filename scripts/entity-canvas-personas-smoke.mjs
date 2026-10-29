import assert from 'node:assert/strict';import fs from 'node:fs';
const view=fs.readFileSync('src/views/PersonasView.tsx','utf8');
const visual=fs.readFileSync('src/views/PersonaVisualEditor.tsx','utf8');
const studio=fs.readFileSync('src/services/persona-studio.ts','utf8');
const cases=[
 ['Shared header rather than duplicate identity title',view.includes('<EntityEditorHeader')&&view.includes('titleInHeader')&&visual.includes('titleInHeader=false')],
 ['Specialist visual editor preserved',view.includes('<PersonaVisualEditor')&&visual.includes('normalizePersonaVisualCards')&&visual.includes('updateCards')],
 ['Depth and layouts preserved',view.includes('changeDetailMode')&&view.includes('Personalizar interface')&&studio.includes('switchPersonaDepth')],
 ['Autosave preserves full draft',view.includes('Personas: autosave')&&view.includes('updatePersonaProfile({graph:current,personaId:id,draft:data,connectedIds:links})')],
 ['Tags and owner are top properties',view.includes('<EntityTags value={tagsText}')&&view.includes('Responsável: <input')],
 ['Quality derived from domain',view.includes('<EntityCriteria')&&view.includes('completenessChecks.map')&&studio.includes('foundationChecks')],
 ['Graph relations use common component',view.includes('<EntityRelations')&&view.includes('onToggleRelation={toggleRelation}')],
 ['No duplicate fixed save footer',!view.includes('bo-h724-detail-actions')],
 ['Deleting is confirmed and draft not resaved',view.includes('closePersona(false)')&&view.includes('removePersonaFromGraph')],
 ['Custom visual layout remains',view.includes("bo-h713-layout-")&&view.includes('PersonaVisualEditor')],
];
cases.forEach(([name,ok])=>console.log((ok?'PASS ':'FAIL ')+name));assert.ok(cases.every(c=>c[1]),'Persona universal editor contract failed');

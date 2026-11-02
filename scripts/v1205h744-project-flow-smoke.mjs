import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deleteProject } from '../src/services/project-library.ts';

const read = (file) => readFileSync(new URL(file, import.meta.url), 'utf8');
const makeStorage = () => {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => { items.set(key, value); },
    removeItem: (key) => { items.delete(key); },
  };
};
const store = makeStorage();
const INDEX = 'blue-ocean-project-library-v1';
const ACTIVE = 'blue-ocean-project-library-active-v1';
const snapshot = (id) => 'blue-ocean-project-snapshot-v1:' + id;
const projects = [
  { id: 'current', title: 'Ativo', archived: false },
  { id: 'archived', title: 'Arquivado', archived: true },
  { id: 'other', title: 'Outro', archived: false },
];
store.setItem(INDEX, JSON.stringify({ version: 1, projects }));
for (const project of projects) store.setItem(snapshot(project.id), JSON.stringify({ title: project.title }));
store.setItem(ACTIVE, 'current');
assert.equal(deleteProject('missing', store), false, 'unknown id should not mutate');
assert.equal(deleteProject('archived', store), true, 'archived projects are deletable');
assert.equal(store.getItem(snapshot('archived')), null, 'archived snapshot removed');
assert.equal(deleteProject('current', store), true, 'active indexed project is deletable after context switch');
assert.equal(store.getItem(snapshot('current')), null, 'active snapshot removed');
assert.equal(store.getItem(ACTIVE), null, 'active id removed when deleted');
assert.deepEqual(JSON.parse(store.getItem(INDEX)).projects.map((item) => item.id), ['other'], 'other projects remain');
assert.notEqual(store.getItem(snapshot('other')), null, 'unrelated snapshot remains');
assert.equal(deleteProject('other', store), true, 'last project may be deleted');
assert.deepEqual(JSON.parse(store.getItem(INDEX)).projects, [], 'last project removes index entry');

const controller = read('../src/state/useStudioController.ts');
const home = read('../src/views/ProjectHomeView.tsx');
const app = read('../src/App.tsx');
const css = read('../src/views/project-creation-flow-h744.css');
assert(controller.includes("createBlankWorkspaceGraph()"), 'last project switches to an empty workspace');
const deletion = controller.slice(controller.indexOf('const deleteWorkspaceProject ='), controller.indexOf('const restoreWorkspaceProject ='));
assert(deletion.indexOf('replaceProjectGraph(') < deletion.indexOf('deleteProject(projectId)'), 'switch away before deleting project snapshot');
assert(home.includes('data-project-creation-page="H7.44"'), 'creation uses dedicated full-page surface');
assert(home.includes('if (dialog) return'), 'all project templates share the full-page flow');
assert(home.includes('onDelete={() => setDeleteTarget(project)}'), 'active projects expose deletion');
assert(home.includes('Excluir projeto arquivado'), 'archived projects expose deletion');
assert(home.includes('Excluir definitivamente'), 'deletion requires a dedicated confirmation');
assert(app.includes("new Event('bo-new-project')"), 'service creation uses the unified entrypoint');
assert(css.includes('@media(max-width:630px)'), 'creation is responsive');
const mapWorkspace = read('../src/views/BlueprintWorkspaceView.tsx');
const persona = read('../src/views/PersonasView.tsx');
const boards = read('../src/views/WhiteboardsView.tsx');
const layout = read('../src/views/project-creation-flow-h749.css');
assert(home.includes('Como você deseja começar?'), 'H7.49 starts with intention, not tool jargon');
assert(home.includes('Começar com um espaço em branco'), 'blank exploration is named by its outcome');
assert(!home.includes('bo-h744-start-summary'), 'creation does not repeat the chosen intention in a second card');
assert(home.includes('onCreatedIntent(target)'), 'new project routes directly to chosen working surface');
assert(app.includes('openCreatedProjectIntent') && app.includes("openLibraryPage('personas')"), 'Persona intention opens its library directly');
assert(app.includes("sessionStorage.setItem('bo-workspace-create-page', 'personas')"), 'Persona intention opens the actual Persona creator');
assert(app.includes("sessionStorage.setItem('bo-whiteboard-start-from-design', 'free')") && boards.includes("bo-whiteboard-start-from-design"), 'free canvas opens Whiteboard creation');
assert(app.includes("sessionStorage.setItem('bo-h749-direct-map-intent', intent)") && mapWorkspace.includes("bo-h749-direct-map-intent"), 'Journey and Blueprint map creation consume the selected intention');
assert(mapWorkspace.includes("const existingId = graph.service.journeyIds.find") && mapWorkspace.includes("createJourney('blank'"), 'existing template maps are reused without duplicating canonical Journeys');
assert(home.includes('onCreatingChange?.(Boolean(dialog))') && app.includes('bo-h749-creation-focus'), 'creation focuses the navigation without permanently changing preferences');
assert(layout.includes('grid-template-columns:minmax(0,1fr) minmax(282px,320px)') && layout.includes('@media(max-width:600px)'), 'creation spacing is wide and responsive');
assert(persona.includes("sessionStorage.getItem('bo-workspace-create-page')"), 'Persona create intent is consumed by the dedicated page');
console.log('H7.44 project creation and deletion: PASS');

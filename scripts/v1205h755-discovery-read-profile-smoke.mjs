import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');
const reader = read('src/components/DiscoveryReadProfile.tsx');
const css = read('src/runtime/discovery-read-profile-h755.css');
const styles = read('src/style.css');
assert(styles.includes("discovery-read-profile-h755.css"), 'read-first styles are globally available');
assert(reader.includes('bo-h751-reader-section') && reader.includes('bo-h751-add-detail'), 'reader uses Persona component language');
assert(reader.includes('data-discovery-read-profile="1"'), 'reader has deterministic QA selector');
assert(css.includes('grid-template-columns:minmax(0,2.55fr) minmax(288px,1fr)'), 'proportional main and utility columns');
assert(css.includes('@media(max-width:1150px)') && css.includes('@media(max-width:680px)'), 'tablet and mobile respond');
for (const name of ['Needs','Jobs','Pains','Hypotheses','Problems','Evidence']) {
  const file = read('src/views/'+name+'View.tsx');
  assert(file.includes('DiscoveryReadProfile'), name+' uses the Persona-inspired read profile');
  assert(file.includes('profileEditing ?') && file.includes('bo-h755-read-screen'), name+' opens read-only and preserves editable mode');
  assert(file.includes('Concluir edição') && file.includes('Editar perfil'), name+' exposes a working edit action');
  assert(file.includes('onEdit={() => setProfileEditing(true)}'), name+' read section has Editar/Add actions');
  assert(file.includes('bo-h754-overview-grid'), name+' still has a contextual right rail');
}
assert(css.includes('.bo-h755-read-screen .bo-h754-rail>.bo-h754-criteria'), 'unnecessary completeness checklist is hidden during consultation');
console.log('PASS H7.55: Necessidades and other Discovery profiles now match Persona read-first layout.');

import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = path => fs.readFileSync(path, 'utf8');
const component = read('src/components/DiscoveryDetailRail.tsx');
const css = read('src/runtime/discovery-detail-unified-h754.css');
const styles = read('src/style.css');

assert.match(styles, /discovery-detail-unified-h754\.css/, 'global layout styles are imported');
assert.match(component, /ORGANIZAÇÃO/);
assert.match(component, /Critérios mínimos/);
assert.match(component, /bo-h71-check-list/);
assert.match(component, /Leitura complementar/);

const cases = [
  {path:'src/views/JobsView.tsx', fields:['Importância','Responsável','Tags'], checks:'foundationChecks'},
  {path:'src/views/PainsView.tsx', fields:['Severidade','Frequência','Responsável','Tags'], checks:'checks'},
  {path:'src/views/HypothesesView.tsx', fields:['Confiança atual','Risco de estar errada','Responsável','Tags'], checks:'validationChecks'},
  {path:'src/views/ProblemsView.tsx', fields:['Severidade','Prioridade','Responsável','Tags'], checks:'qualityChecks'},
  {path:'src/views/EvidenceView.tsx', fields:['Responsável','Tags'], checks:'qualityChecks'},
];

for (const {path,fields,checks} of cases) {
  const content = read(path);
  const start = content.indexOf("{detailTab === 'overview' &&");
  const end = content.indexOf("{detailTab === '", start+25);
  assert(start !== -1 && end > start, path + ': overview present');
  const overview = content.slice(start,end);
  assert.match(overview, /bo-h754-overview-grid/, path+': standard two-column composition');
  assert.match(overview, /<DiscoveryDetailRail/, path+': shared organization rail');
  assert(overview.includes(checks), path+': original criteria preserved');
  const main = overview.slice(0,overview.indexOf('<DiscoveryDetailRail'));
  const side = overview.slice(overview.indexOf('<DiscoveryDetailRail'));
  for (const field of fields) {
    assert(side.includes('>'+field), path + ': field '+field+' is in right rail');
    assert(!main.includes('>'+field+'</span>') && !main.includes('>'+field+' <small'), path + ': field '+field+' not duplicated in main form');
  }
  assert(overview.includes('summary={'), path+': original interpretation/source panel preserved');
}
assert(css.includes('grid-template-columns:minmax(0,2.55fr) minmax(300px,1fr)'), 'desktop content/sidebar proportions');
assert(css.includes('@media(max-width:1150px)'), 'tablet stacks panels');
assert(css.includes('@media(max-width:700px)'), 'mobile stacks fields');
console.log('PASS H7.54 — Discovery views match Necessidades layout and preserve canonical controls.');

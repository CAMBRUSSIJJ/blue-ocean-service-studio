import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(path,'utf8');
const project = read('src/views/ProjectShellView.tsx');
const home = read('src/views/ProjectHomeView.tsx');
const styles = read('src/runtime/project-ux-h31.css');
const app = read('src/style.css');
const server = read('scripts/serve-linux.py');
const journeyBrowser = read('scripts/journey-editor-browser.py');
const cases = [
  ['tabs still navigate project context',project.includes('role="tablist"')&&project.includes("id:'audience'")&&project.includes("id:'maps'")],
  ['project overview is compact and informational',project.includes('data-project-overview="compact-h31"')&&project.includes('bo-h31-overview-stats')],
  ['redundant navigation cards removed',!project.includes('bo-h740h10-area-grid')&& !project.includes('data-project-elements="H17.0.7"')],
  ['outdated maps button removed',!project.includes('Ver mapas existentes')],
  ['new projects can create a map',project.includes('onClick={recentMap ? openService : onCreateMap}') && project.includes("{recentMap ? 'Continuar mapa' : 'Criar mapa'}")],
  ['existing project maps have one open action',project.includes('bo-h33-main-cta') && project.includes('onClick={recentMap ? openService : onCreateMap}') && !project.includes('onClick={openService}>Abrir mapas')],
  ['service counts remain derived from canonical graph',project.includes('const serviceMaps = journeys + detachedMaps')],
  ['project scroll reset under sticky header',project.includes('parent.scrollTop = 0')],
  ['project search has a label and semantic type',home.includes('type="search" aria-label="Buscar projetos ou serviços"')],
  ['project toolbar fills centered content',styles.includes('.bo-h740h8-toolbar label') && styles.includes('max-width:none')],
  ['project CSS imported last',app.includes("@import './runtime/project-ux-h31.css';")],
  ['map editor allowed only in same origin',server.includes("X-Frame-Options', 'SAMEORIGIN'")&&server.includes("frame-ancestors 'self'")],
  ['cross-origin embedding not explicitly permitted',!server.includes("frame-ancestors *")&&!server.includes("X-Frame-Options', 'ALLOWALL'")],
  ['journey reopen test uses project map tab',journeyBrowser.includes("name='Mapas e Whiteboard'") && !journeyBrowser.includes("name='Ver mapas existentes'")],
];
for(const [name,ok] of cases){console.log((ok?'PASS':'FAIL')+' '+name)}
assert(cases.every(([,ok])=>ok),'H3.1 regression failed');
console.log('H3.1 — '+cases.length+'/'+cases.length+' contracts passed');

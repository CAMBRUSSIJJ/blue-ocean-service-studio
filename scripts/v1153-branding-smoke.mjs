import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const checks=[];
const check=(name,ok,detail='')=>{checks.push([name,Boolean(ok)]);console.log(`${ok?'OK  ':'FAIL'} ${name}${detail?` — ${detail}`:''}`)};
const read=p=>readFileSync(p,'utf8');
const pkg=JSON.parse(read('package.json'));
const tokens=read('src/design-system/tokens.css').toLowerCase();
const shell=read('src/runtime/blue-ocean-shell.js');
const research=read('src/runtime/research-workspace.js');
const legacyShell=read('src/runtime/shell.js');
const whiteboard=read('src/runtime/whiteboard-core.js');
const index=read('index.html');
const prep=read('scripts/prepare-assets.mjs');

const cssFiles=readdirSync('src/runtime').filter(n=>n.endsWith('.css'));
const css=cssFiles.map(n=>read(join('src/runtime',n))).join('\n').toLowerCase();
const banned=['#04342c','#1d9e75','#0b4c40','#e7f5ef','#f1efe8','#f7f7f4','#f7f5ef'];
const found=banned.filter(c=>css.includes(c));

check('baseline Branding preservada em versão >= 1.15.3',(()=>{const [a,b,c]=pkg.version.split('.').map(Number);return a>1||(a===1&&(b>15||(b===15&&c>=3)))})());
check('tokens canônicos do branding',tokens.includes('--bo-color-primary-600:#1e63f0')&&tokens.includes('--bo-color-canvas:#f7f8fa')&&tokens.includes('--bo-color-sidebar:#f3f5f8')&&tokens.includes('--bo-color-text:#172033'));
check('geometria canônica 216/48/320',tokens.includes('--bo-sidebar-w:216px')&&tokens.includes('--bo-header-h:48px')&&tokens.includes('--bo-inspector-w:320px'));
check('paleta verde estrutural antiga removida do CSS fonte',found.length===0,found.join(', '));
check('Pesquisa não injeta mais ENTENDER duplicado',!research.includes("group.textContent='ENTENDER'"));
check('shell legado não injeta MODELAR/EXECUTAR',!legacyShell.includes("a.textContent='MODELAR'")&&!legacyShell.includes("a.textContent='EXECUTAR'"));
check('shell canônico remove headings legados',shell.includes('removeLegacyHeadings')&&shell.includes("qa('.rt182-nav-group-label,.rt192-understand-label'"));
check('estado ativo único na sidebar',shell.includes('setSingleActive')&&shell.includes("removeAttribute('aria-current')"));
check('alias BlueOceanRuntime disponível',read('src/runtime/runtime-registry.js').includes('window.BlueOceanRuntime'));
check('branding antigo removido de nomes de exportação',!whiteboard.includes('`RealTalent-')&&!whiteboard.includes("arquivo JSON do RealTalent")&&!whiteboard.includes("'<em>RealTalent</em>'"));
check('formatos/storage legados preservados para compatibilidade',whiteboard.includes("format:'realtalent.service-studio.backup'")&&whiteboard.includes("const GRAPH_KEY = 'realtalent-service-studio-v3-service-graph'"));
check('asset V1.15.3 no pipeline',prep.includes('v1153-precision-studio.js')&&prep.includes('v1153-precision-studio.css'));
check('asset V1.15.3 no bootstrap',index.includes('v1153-precision-studio.css')&&index.includes('v1153-precision-studio.js'));
check('título BLUE OCEAN usa versão canônica',whiteboard.includes('document.title=`BLUE OCEAN Service Studio · V${APP_VERSION}`'));

const failed=checks.filter(([,ok])=>!ok).length;
console.log(`\nV1.15.3 Branding Consolidation: ${checks.length-failed}/${checks.length}`);
if(failed) process.exit(1);

import { readFileSync } from 'node:fs';
const main = readFileSync('src/main.tsx','utf8');
const app = readFileSync('src/App.tsx','utf8');
const auth = readFileSync('src/auth/AuthExperience.tsx','utf8');
const css = readFileSync('src/auth/auth.css','utf8');
const stability = readFileSync('src/runtime/stability.js','utf8');
const persistence = readFileSync('src/runtime/persistence-kernel.js','utf8');
const pkg = JSON.parse(readFileSync('package.json','utf8'));
const checks = [
  ['baseline 1.17.9 preservada', (()=>{const [a,b,c]=pkg.version.split('.').map(Number);return a>1||(a===1&&(b>17||(b===17&&c>=9)));})()],
  ['entry monta sem aguardar persistência', !main.includes('await dataBridge') && main.includes('<AuthExperience />')],
  ['entry ready remove boot legado', main.includes("getElementById('bo1120-boot')?.remove()") && main.includes('rt-entry-ready')],
  ['stability não usa top-level await', !/await\s+window\.BlueOceanRuntimeReady/.test(stability)],
  ['stability escuta entry ready', stability.includes("addEventListener('rt-entry-ready'")],
  ['stability tem watchdog fail-open', stability.includes('1800') && stability.includes('firstElementChild')],
  ['workspace dispara app ready após mount', app.includes("dispatchEvent(new CustomEvent('rt-app-ready'))")],
  ['stored session passa pelo loading seguro', auth.includes('initialSession') && auth.includes('setLoadingUser')],
  ['preparo real do Service Graph no login', auth.includes('prepareWorkspaceRuntime') && auth.includes('bridge.prepare')],
  ['preparo tem timeout', auth.includes('4200') && auth.includes('Promise.race')],
  ['loading tem fallback degradado', auth.includes('proteção durável demorou mais que o esperado')],
  ['IndexedDB tem timeout', persistence.includes('timeoutMs = 1800') && persistence.includes('Abertura do IndexedDB')],
  ['IndexedDB bloqueado não trava boot', persistence.includes('req.onblocked')],
  ['onda animada na entrada', auth.includes('WaveBackdrop') && (css.includes('bo1179-wave-one') || css.includes('bo1180-ocean-one') || css.includes('bo1181-ocean-scroll'))],
  ['onda também no loading', auth.includes('mode="loading"') && (css.includes('.bo-auth-loading .bo-auth-wave') || css.includes('.bo-auth-wave--loading'))],
  ['reduced motion preservado', css.includes('@media(prefers-reduced-motion:reduce)') && css.includes('animation:none!important')],
  ['primeiro acesso orienta cadastro', auth.includes('Primeiro acesso?') && auth.includes('Criar perfil local')],
  ['login local continua real', auth.includes('signInLocal') && auth.includes('createLocalAccount')],
  ['guest continua disponível', auth.includes('enterLocalWorkspace') && auth.includes('Abrir workspace local sem conta')],
  ['QA encadeia gate 1.17.9', pkg.scripts.qa.includes('auth:runtime:smoke')],
];
let failed=0;
for (const [label,ok] of checks){console.log(`${ok?'OK  ':'FAIL'} ${label}`);if(!ok)failed++;}
console.log(`\nV1.17.9 Auth Runtime Recovery & Wave Entry — ${checks.length-failed}/${checks.length}`);
if(failed)process.exit(1);

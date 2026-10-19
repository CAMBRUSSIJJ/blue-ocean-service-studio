import { readFileSync } from 'node:fs';
const auth = readFileSync('src/auth/AuthExperience.tsx','utf8');
const service = readFileSync('src/auth/auth.ts','utf8');
const css = readFileSync('src/auth/auth.css','utf8');
const app = readFileSync('src/App.tsx','utf8');
const main = readFileSync('src/main.tsx','utf8');
const pkg = JSON.parse(readFileSync('package.json','utf8'));
const checks = [
  ['versão >= 1.17.8', Number(pkg.version.split('.')[0]) > 1 || (Number(pkg.version.split('.')[0]) === 1 && Number(pkg.version.split('.')[1]) > 17) || (pkg.version.startsWith('1.17.') && Number(pkg.version.split('.')[2].split('-')[0]) >= 8)],
  ['login profissional', auth.includes('Bem-vindo de volta') && auth.includes('Entrar na BLUE OCEAN')],
  ['cadastro em duas etapas', auth.includes("screen === 'signup'") && auth.includes("screen === 'workspace'")],
  ['recuperação local', auth.includes("screen === 'recover'") && service.includes('resetLocalPassword')],
  ['PBKDF2', service.includes('PBKDF2') && service.includes('120_000')],
  ['salt aleatório', service.includes('crypto.getRandomValues')],
  ['sessão local/session', service.includes('localStorage') && service.includes('sessionStorage')],
  ['Google preparado sem OAuth falso', auth.includes("oauthUnavailable('Google')")],
  ['Microsoft preparado sem OAuth falso', auth.includes("oauthUnavailable('Microsoft')")],
  ['workspace local sem conta', auth.includes('Abrir workspace local sem conta')],
  ['loading de workspace', auth.includes('Preparando seu workspace') && auth.includes('Service Graph')],
  ['sign out no shell', app.includes('onSignOut') && app.includes('bo1178-account')],
  ['branding BLUE OCEAN', auth.includes('BLUE OCEAN') && css.includes('--bo-auth-navy:#0b1f3b')],
  ['responsivo', css.includes('@media(max-width:900px)') && css.includes('@media(max-width:600px)')],
  ['reduced motion', css.includes('prefers-reduced-motion')],
  ['sem alert nativo', !auth.includes('alert(') && !auth.includes('confirm(') && !auth.includes('prompt(')],
  ['AuthExperience é entry point', main.includes('<AuthExperience />')],
  ['modo local explicitado', auth.includes('Modo local seguro')],
];
let failed=0; for (const [label, ok] of checks){ console.log(`${ok?'OK  ':'FAIL'} ${label}`); if(!ok) failed++; }
console.log(`\nV1.17.8 Professional Entry & Authentication Experience — ${checks.length-failed}/${checks.length}`);
if(failed) process.exit(1);

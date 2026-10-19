import { readFileSync, existsSync, statSync } from 'node:fs';

const checks=[];
const ok=(name,pass,detail='')=>checks.push({name,pass,detail});
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const tsx=readFileSync('src/auth/AuthExperience.tsx','utf8');
const css=readFileSync('src/auth/auth.css','utf8');
const prep=readFileSync('scripts/prepare-assets.mjs','utf8');
const index=readFileSync('index.html','utf8');
const main=readFileSync('src/main.tsx','utf8');
const asset='src/brand/bo-ocean-wave-1181.webp';

ok('versão >= 1.18.1', /^1\.18\.[1-9]\d*$/.test(pkg.version) || /^1\.(?:19|[2-9]\d)\./.test(pkg.version), pkg.version);
ok('onda usa raster WebP pré-renderizado', tsx.includes('/bo-ocean-wave-1181.webp'));
ok('duas tiles idênticas criam loop sem costura', (tsx.match(/bo-ocean-wave-1181\.webp/g)||[]).length===2);
ok('não existe SVG inline animado no WaveBackdrop', !tsx.includes('<svg viewBox="0 0 1920 1080"'));
ok('não existem grupos SVG animados', !css.includes('.bo-auth-wave__band'));
ok('uma única track é animada', css.includes('.bo-auth-wave__track') && css.includes('animation:bo1181-ocean-scroll'));
ok('movimento é linear contínuo', css.includes('26s linear infinite'));
ok('não usa alternate/reversão', !css.includes('infinite alternate'));
ok('não usa keyframes antigos 1180', !css.includes('@keyframes bo1180-ocean'));
ok('não usa filtros/blur na onda', !/feGaussianBlur|filter\s*:|backdrop-filter\s*:/.test(css.slice(css.indexOf('.bo-auth-wave{'), css.indexOf('.bo-auth-story{'))));
ok('track usa translate3d', css.includes('translate3d(-50%,-50%,0)'));
ok('apenas transform varia por frame', /@keyframes bo1181-ocean-scroll\{[\s\S]*transform:[\s\S]*transform:[\s\S]*\}/.test(css));
ok('asset fonte existe', existsSync(asset));
ok('asset é leve (< 150 KB)', existsSync(asset) && statSync(asset).size < 150*1024, existsSync(asset)?`${statSync(asset).size} bytes`:'ausente');
ok('prepare-assets publica WebP', prep.includes("['src/brand/bo-ocean-wave-1181.webp', 'public/bo-ocean-wave-1181.webp']"));
ok('index faz preload da textura', index.includes('rel="preload" href="/bo-ocean-wave-1181.webp"'));
ok('reduced-motion congela track', css.includes('@media(prefers-reduced-motion:reduce)') && css.includes('.bo-auth-wave__track{animation:none!important'));
ok('body registra bo-v1181', main.includes('bo-v1181'));
ok('QA inclui gate de performance', pkg.scripts.qa.includes('ocean:performance:smoke'));
ok('nenhum canvas/requestAnimationFrame introduzido', !tsx.includes('requestAnimationFrame') && !tsx.includes('<canvas'));

for (const c of checks) console.log(`${c.pass?'OK  ':'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);
const passed=checks.filter(c=>c.pass).length;
console.log(`\nOcean Performance V1.18.1: ${passed}/${checks.length}`);
if (passed!==checks.length) process.exit(1);

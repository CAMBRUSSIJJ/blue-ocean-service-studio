import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const failures = [];
const check = (condition, message) => {
  if (condition) console.log(`OK   ${message}`);
  else { console.error(`FAIL ${message}`); failures.push(message); }
};

check(existsSync('dist/index.html'), 'dist/index.html existe');
if (existsSync('dist/index.html')) {
  const html = readFileSync('dist/index.html', 'utf8');
  const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map(m => m[1])
    .filter(ref => !/^(?:https?:|data:|#)/.test(ref));
  for (const ref of refs) {
    const clean = ref.replace(/^\.\//, '').replace(/^\//, '').split(/[?#]/)[0];
    if (!clean) continue;
    check(existsSync(join('dist', clean)), `asset referenciado existe: ${clean}`);
  }
  for (const required of [
    'v1120-stability.js', 'v1130-design-system.css',
    'v1140-workspace-home.js', 'v1150-global-navigation.js',
    'v1153-precision-studio.js', 'v1153-precision-studio.css'
  ]) check(html.includes(required), `bootstrap contém ${required}`);
}

const walk = dir => readdirSync(dir).flatMap(name => {
  const full = join(dir, name);
  return statSync(full).isDirectory() ? walk(full) : [full];
});
if (existsSync('dist')) {
  const files = walk('dist');
  check(files.length > 10, `dist possui conteúdo (${files.length} arquivos)`);
  check(!files.some(f => /\.(tsx?|map)$/i.test(f)), 'dist não expõe TS/TSX/source maps');
  check(files.some(f => /assets\/.*\.js$/i.test(f)), 'bundle JavaScript React gerado em dist/assets');
}


const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (existsSync('dist/build-manifest.json')) {
  const manifest = JSON.parse(readFileSync('dist/build-manifest.json', 'utf8'));
  check(manifest.version === pkg.version, `build-manifest usa versão ${pkg.version}`);
  check(manifest.sourceAuthority === 'src/', 'build-manifest declara src/ como source authority');
  check(Boolean(manifest.sourceSha256) && Boolean(manifest.lockSha256) && Boolean(manifest.buildId), 'build-manifest contém fingerprints reproduzíveis');
} else {
  check(false, 'dist/build-manifest.json existe');
}

if (failures.length) {
  console.error(`\nDist verify: ${failures.length} falha(s)`);
  process.exit(1);
}
console.log('\nDist verify: OK');

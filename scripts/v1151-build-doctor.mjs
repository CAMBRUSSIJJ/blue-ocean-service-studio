import { existsSync, readFileSync } from 'node:fs';
import { resolve4 } from 'node:dns/promises';
import { execFileSync } from 'node:child_process';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const required = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.devDependencies ?? {}),
];
const rows = [];
const push = (status, label, detail='') => rows.push({status,label,detail});

const major = Number(process.versions.node.split('.')[0]);
push(major >= 20 && major < 23 ? 'OK' : 'FAIL', 'Node', process.version);
let npmVersion = 'indisponível';
try { npmVersion = execFileSync('npm', ['--version'], {encoding:'utf8'}).trim(); } catch {}
push(npmVersion !== 'indisponível' ? 'OK' : 'FAIL', 'npm', npmVersion);
push(existsSync('package-lock.json') ? 'OK' : 'FAIL', 'package-lock.json');

const missing = required.filter(name => !existsSync(`node_modules/${name}/package.json`));
const bins = ['tsc', 'vite'];
const missingBins = bins.filter(name => !existsSync(`node_modules/.bin/${name}`));
const depsComplete = missing.length === 0 && missingBins.length === 0;
push(depsComplete ? 'OK' : 'WARN', 'node_modules', depsComplete ? 'completo' : `incompleto: ${[...missing, ...missingBins.map(x=>'.bin/'+x)].join(', ')}`);

let registryReachable = false;
try { await resolve4('registry.npmjs.org'); registryReachable = true; } catch {}
push(registryReachable ? 'OK' : 'WARN', 'DNS npm registry', registryReachable ? 'registry.npmjs.org resolvido' : 'sem resolução DNS neste ambiente');

for (const row of rows) console.log(`${row.status.padEnd(4)} ${row.label}${row.detail ? ` — ${row.detail}` : ''}`);

const hardFailures = rows.filter(r => r.status === 'FAIL');
if (hardFailures.length) process.exit(1);
if (!depsComplete && !registryReachable) {
  console.log('\nDIAGNÓSTICO: o source está disponível, mas este ambiente não consegue instalar dependências porque node_modules está incompleto e o registry npm não resolve por DNS.');
  console.log('AÇÃO: em um ambiente com internet, execute `npm ci` e depois `npm run release:verify`.');
} else if (!depsComplete) {
  console.log('\nAÇÃO: execute `npm ci` para restaurar as dependências exatas do package-lock.');
} else {
  console.log('\nBuild doctor: ambiente pronto para typecheck/build.');
}

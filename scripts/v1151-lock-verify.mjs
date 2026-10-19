import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const failures = [];
const check = (condition, message) => {
  if (condition) console.log(`OK   ${message}`);
  else { console.error(`FAIL ${message}`); failures.push(message); }
};

check(lock.lockfileVersion === 3, 'package-lock usa lockfileVersion 3');
check(lock.name === pkg.name, 'nome do lock alinhado ao package.json');
check(lock.version === pkg.version, 'versão raiz do lock alinhada ao package.json');
check(lock.packages?.['']?.version === pkg.version, 'packages[""] alinhado à versão da aplicação');

for (const group of ['dependencies', 'devDependencies']) {
  for (const [name, range] of Object.entries(pkg[group] ?? {})) {
    const entry = lock.packages?.[`node_modules/${name}`];
    check(Boolean(entry?.version), `${group}: ${name} (${range}) está travado no lock`);
  }
}

if (failures.length) {
  console.error(`\nLock verify: ${failures.length} falha(s)`);
  process.exit(1);
}
console.log('\nLock verify: OK');

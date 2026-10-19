import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const css = read('src/runtime/sidebar-h701.css');
const preflight = read('preflight-linux.sh');
const pkg = JSON.parse(read('package.json'));
let ok = 0, fail = 0;
function check(c,l){ if(c){console.log('OK  ',l);ok++;} else {console.log('FAIL',l);fail++;} }
check(!css.includes('rgba(29,158,117') && !css.toLowerCase().includes('#1d9e75'), 'onda não usa verde estrutural legado #1D9E75');
check(css.includes('rgba(14,165,233,.075)'), 'onda frontal usa ciano Blue Ocean');
check(preflight.includes("LEGACY_FILES="), 'preflight resume ocorrências por arquivo');
check(preflight.includes("grep -I -E -o"), 'preflight extrai somente tokens de cor');
check(!preflight.includes('head -20 /tmp/bo_legacy_palette'), 'dump gigante de CSS minificado removido');
check(pkg.scripts['v1205h702:preflight-branding-hotfix-smoke'], 'script H7.0.2 registrado');
console.log(`\nH7.0.2 Preflight Branding Hotfix: ${ok} OK / ${fail} FAIL`);
process.exit(fail ? 1 : 0);

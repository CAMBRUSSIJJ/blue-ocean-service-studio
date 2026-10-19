import fs from 'node:fs';

let ok = 0;
let fail = 0;
function check(condition, label) {
  if (condition) { console.log(`OK   ${label}`); ok += 1; }
  else { console.log(`FAIL ${label}`); fail += 1; }
}

const css = fs.readFileSync('src/style.css', 'utf8');
const lines = css.split(/\r?\n/);
const importLine = lines.findIndex((line) => line.includes("@import './runtime/workspace-library-h3.css';"));
const firstTailwind = lines.findIndex((line) => line.trim().startsWith('@tailwind '));
const firstRule = lines.findIndex((line) => /^\s*(html|body|\.|#)[^{]*\{/.test(line));
const importLines = lines.map((line, index) => ({ line: line.trim(), index })).filter(({ line }) => line.startsWith('@import '));
const lastImport = importLines.length ? Math.max(...importLines.map(({ index }) => index)) : -1;

check(importLine >= 0, 'workspace-library-h3.css é importado');
check(importLine >= 0 && (firstTailwind < 0 || importLine < firstTailwind) && importLines.every(({ index }) => firstTailwind < 0 || index < firstTailwind), 'workspace-library-h3.css está no bloco inicial de imports');
check(firstTailwind < 0 || importLine < firstTailwind, '@import precede diretivas @tailwind');
check(firstRule < 0 || importLine < firstRule, '@import precede regras CSS');
check(!lines.slice(firstTailwind >= 0 ? firstTailwind : 0).some((line) => line.trim().startsWith('@import ')), 'não há @import tardio após @tailwind/regras');
check(css.indexOf("@import './runtime/workspace-library-h3.css';") < css.indexOf('html, body, #root'), 'workspace library carrega antes das regras globais');

console.log(`\nV1.20.5-H5 CSS Import Order: ${ok} OK / ${fail} FAIL`);
if (fail) process.exit(1);

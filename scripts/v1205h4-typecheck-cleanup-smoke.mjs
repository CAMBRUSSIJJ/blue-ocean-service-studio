import fs from 'node:fs';

let ok = 0;
let fail = 0;
function check(condition, label) {
  if (condition) { console.log(`OK   ${label}`); ok += 1; }
  else { console.log(`FAIL ${label}`); fail += 1; }
}

const app = fs.readFileSync('src/App.tsx', 'utf8');
const whiteboards = fs.readFileSync('src/views/WhiteboardsView.tsx', 'utf8');
const library = fs.readFileSync('src/views/WorkspaceLibraryView.tsx', 'utf8');

check(!/Sparkles,\s*Plus,\s*ChevronDown/.test(app), 'App não importa Plus sem uso entre Sparkles e ChevronDown');
check(!/\bPlus\b/.test(app.split('\n')[1] ?? ''), 'App não importa Plus no design-system/icons');
check(/import \{[^\n]*ArrowRight[^\n]*\} from '\.\.\/design-system\/icons';/.test(whiteboards), 'Whiteboards importa ArrowRight');
check(/<ArrowRight size=\{14\}\s*\/>/.test(whiteboards), 'Whiteboards usa ArrowRight no CTA Abrir');
check(!/\bcontextEntityDescription\b/.test(library), 'WorkspaceLibrary não importa nem usa contextEntityDescription');
check(/contextEntityTitle/.test(library), 'WorkspaceLibrary preserva contextEntityTitle');
check(/contextEntityUsage/.test(library), 'WorkspaceLibrary preserva contextEntityUsage');

console.log(`\nV1.20.5-H4 Typecheck Cleanup: ${ok} OK / ${fail} FAIL`);
if (fail) process.exit(1);

import { readFileSync } from 'node:fs';

const needs = readFileSync(new URL('../src/views/NeedsView.tsx', import.meta.url), 'utf8');
const personas = readFileSync(new URL('../src/views/PersonasView.tsx', import.meta.url), 'utf8');
const library = readFileSync(new URL('../src/views/WorkspaceLibraryView.tsx', import.meta.url), 'utf8');

let okCount = 0;
let failCount = 0;
function check(condition, label) {
  if (condition) { console.log(`OK   ${label}`); okCount += 1; }
  else { console.error(`FAIL ${label}`); failCount += 1; }
}

check(!/const\s+blankDraft\s*:\s*NeedProfileDraft/.test(needs), 'NeedsView remove blankDraft não usado');
check(!/\bLink2\b/.test(personas), 'PersonasView remove Link2 não usado');
check(!/import\s+type\s*\{[^}]*\bGraphEntity\b[^}]*\}\s+from\s+["']\.\.\/domain\/model["']/.test(personas), 'PersonasView remove GraphEntity não usado');
check(!/const\s+blankDraft\s*:\s*PersonaProfileDraft/.test(personas), 'PersonasView remove blankDraft não usado');
check(library.includes("if (page === 'personas') return <PersonasView studio={studio}/>"), 'delegação dedicada de Personas preservada');
check(!/page\s*===\s*['"]personas['"]\s*\?\s*<UserRound/.test(library), 'tabela genérica não compara page impossível com personas');
check(library.includes("if (page === 'needs') return <NeedsView studio={studio}/>"), 'delegação dedicada de Necessidades preservada');

console.log(`\nV1.20.5-H7.2.1 Typecheck Cleanup: ${okCount} OK / ${failCount} FAIL`);
if (failCount) process.exit(1);

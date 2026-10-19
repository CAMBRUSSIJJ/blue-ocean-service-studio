import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const blueprint = read('src/views/BlueprintView.tsx');
const context = read('src/views/WorkspaceLibraryView.tsx');
const home = read('src/views/WorkspaceHome.tsx');

const checks = [];
const ok = (label, condition) => {
  if (!condition) throw new Error(`FAIL ${label}`);
  checks.push(label);
  console.log(`OK   ${label}`);
};

ok('semanticLabels cobre role', /role:\s*'Papel'/.test(blueprint));
ok('semanticLabels cobre dependency', /dependency:\s*'Dependência'/.test(blueprint));
ok('semanticLabels cobre policy', /policy:\s*'Política'/.test(blueprint));
ok('Workspace Library substitui Context Library antiga', context.includes('WorkspaceLibraryView'));
ok('Workspace Library não acessa report.score legado', !context.includes('hypothesisReport.score'));
ok('Workspace Library não acessa report.checks legado', !context.includes('hypothesisReport.checks'));
ok('Workspace Library usa serviços canônicos de contexto', context.includes('listContextEntities') && context.includes('createContextEntity'));
ok('Persona draft tem fallback tipado', home.includes('const activePersonaDraft: PersonaProfileDraft = personaDraft ?? personaStudioReport?.draft ??'));
ok('Persona report usa escalares seguros', home.includes('const personaFoundationScore = personaStudioReport?.foundationScore ?? 0'));
ok('Problem draft tem fallback tipado', home.includes("const activeProblemDraft: ProblemHypothesisDraft = problemDraft ?? { title: '', description: '', impact: '' }"));
ok('Problem report usa escalares seguros', home.includes('const problemValidationChecks = problemEvidencePreview?.validationChecks ?? []'));
ok('Problema validado usa snapshot próprio', home.includes('const activeValidatedProblem = problemEvidencePreview?.validatedProblem ?? null'));
ok('Problema validado expõe escalares nulos-seguros', home.includes('const hasValidatedProblem = activeValidatedProblem !== null') && home.includes('const validatedProblemTitle = String(activeValidatedProblem?.title'));
ok('Evidence draft tem fallback tipado', home.includes('const activeEvidenceDraft: EvidenceDraft = evidenceDraft ??'));
ok('sem as any no hotfix', !/(activePersonaDraft|activeProblemDraft|activeEvidenceDraft|activeValidatedProblem)\s+as\s+any/.test(home));

console.log(`\nV1.20.5-H1 Full Typecheck Hotfix: ${checks.length} OK / 0 FAIL`);

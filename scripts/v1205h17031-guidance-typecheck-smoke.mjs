import fs from 'node:fs';
const read=(f)=>fs.readFileSync(f,'utf8');
const view=read('src/views/BlueprintWorkspaceView.tsx');
const launcher=read('start-linux.sh');
const pkg=JSON.parse(read('package.json'));
const preflight=read('preflight-linux.sh');
const changelog=read('CHANGELOG.md');
const notes=read('docs/archive/releases/RELEASE_NOTES_V1.20.5-H17.0.3.1.md');
const checks=[
 ['sem comparação impossível de research',!view.includes("understandNextTarget === 'research'")],
 ['target deriva de público-alvo',view.includes("const understandNextTarget: GuidedWorkspaceTarget = foundationContextCounts.personas === 0")],
 ['target conserva Ecologia',view.includes("understandNextTarget === 'ecology'")],
 ['target conserva Proposição',view.includes("understandNextTarget === 'proposition'")],
 ['Pesquisa não é primeiro passo',!view.includes("const understandNextTarget: GuidedWorkspaceTarget = research")],
 ['Nova Jornada presente',view.includes('Nova Jornada')],
 ['Nova Persona presente',view.includes('Nova Persona')],
 ['Métricas presente',view.includes('<strong>Métricas</strong>') || view.includes('+ Nova Métrica')],
 ['CTA da fase funciona',view.includes('executeGuidedTarget(understandNextTarget)')],
 ['launcher H17.0.3.1',launcher.includes('RELEASE="H17.0.3.1"') || (launcher.includes('RELEASE="H17.0.5"') || launcher.includes('RELEASE="H17.0.4"'))],
 ['QA verifica regressão',pkg.scripts.qa.includes('v1205h17031:guidance-typecheck-smoke')],
 ['preflight verifica regressão',preflight.includes('node scripts/v1205h17031-guidance-typecheck-smoke.mjs')],
 ['changelog da correção',changelog.includes('H17.0.3.1 — Guided Target Typecheck Hotfix')],
 ['notas da correção',notes.includes('TS2367')],
];
let pass=0;
for(const [label,ok] of checks){console.log((ok?'PASS ':'FAIL ')+label);if(ok)pass++;}
console.log(`H17.0.3.1 Guided Target Typecheck Hotfix: ${pass}/${checks.length} PASS`);
if(pass!==checks.length)process.exit(1);

import fs from 'node:fs';
const view=fs.readFileSync('src/views/HypothesesView.tsx','utf8');
const editor=fs.readFileSync('src/components/EntityInlineCanvas.tsx','utf8');
const style=fs.readFileSync('src/runtime/entity-inline-canvas.css','utf8');
const main=fs.readFileSync('src/main.tsx','utf8');
const problems=fs.readFileSync('src/views/ProblemsView.tsx','utf8');
const service=fs.readFileSync('src/services/problems-studio.ts','utf8');
const canonical=fs.readFileSync('src/services/context-library.ts','utf8');
const tests=[
 ['Título de hipótese inline sem duplicação',view.includes('aria-label="Enunciado da hipótese"')&&!view.slice(view.indexOf('return <section className="bo-h75-hypothesis-detail"'),view.indexOf('return <section className="bo-h75-hypotheses"')).includes('<span>Hipótese</span><input')],
 ['Autosave e sem rodapé manual',view.includes('Hipóteses: autosave')&&!view.includes('bo-h71-detail-actions')],
 ['Metadados junto do título',view.includes('bo-hyp-inline-properties')],
 ['Cards essenciais', ['description','premise','expectedBehavior'].every(key=>view.includes(`essential:true`)&&view.includes(`id:'${key}'`))],
 ['Cards opcionais',view.includes("id:'validationCriterion'")&&view.includes("id:'impactIfWrong'")&&editor.includes('bo-inline-ghosts')],
 ['Verificação de prontidão completa preservada',view.includes('preview.validationChecks.map')&&view.includes("onViewValidation={()=>setDetailTab('validation')}")],
 ['Relações rápidas no Service Graph',editor.includes('application/x-bo-relation')&&view.includes('hypothesisEvidenceOptions(graph)')],
 ['CSS importado após estilos legados',main.includes("import './style.css';\nimport './runtime/entity-inline-canvas.css';")&&style.includes('.bo-inline-cards')],
 ['Problemas têm criação direta',problems.includes("type:'problem'")&&problems.includes("status:'draft'")&&problems.includes('Criar problema')],
 ['Problemas não redirecionam para Hipóteses',!problems.includes('requestHypothesisCreation')&&!problems.includes("detail: 'hypotheses'")],
 ['Intento de criação externo respeita aba Problemas',problems.includes("sessionStorage.getItem('bo-workspace-create-page') !== 'problems'")],
 ['Rascunho não vira validado automaticamente ao editar',service.includes("existing.status === 'draft' ? 'draft'")],
 ['Validação direta exige evidências e confirmação explícita',problems.includes('validateDraftProblem')&&problems.includes('qualityChecks.filter(item => item.id !== \'validated\')')&&problems.includes('window.confirm(')],
 ['API canônica cria Problemas sem redirecionar',canonical.includes("if (kind === 'problem')")&&canonical.includes("status: 'draft'")&&!canonical.includes("kind === 'problem' ? 'problemHypothesis'")],
];
for(const [name,pass] of tests)console.log((pass?'OK   ':'FAIL ')+name);
if(tests.some(test=>!test[1]))process.exit(1);

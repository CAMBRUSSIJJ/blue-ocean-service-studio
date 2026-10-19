import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const workspace=read('src/views/BlueprintWorkspaceView.tsx');
const css=read('src/runtime/discovery-ux-h740h155.css');
let ok=0,fail=0;
const check=(name,cond)=>{if(cond){ok++;console.log(`PASS ${name}`)}else{fail++;console.error(`FAIL ${name}`)}};

check('Fonte única de linhas por fase (phaseRowsFor)',workspace.includes('const phaseRowsFor = (phase: GuidedWorkspacePhase)'));
check('Painel da fase usa phaseRowsFor',workspace.includes('const focusedPhaseRows = phaseRowsFor(overviewPhase)'));
check('Stepper usa as mesmas linhas do painel',workspace.includes('const rowsForPhase = phaseRowsFor(phase)'));
check('Fundamentos inclui Elementos do contexto no conjunto da fase',/phaseRowsFor[\s\S]{0,420}foundationContextRow/.test(workspace));
check('Progresso parcial (progress/attention) é considerado',workspace.includes("row.state === 'progress' || row.state === 'attention'"));
check('Stepper não usa "Selecionada" como estado',!workspace.includes("'Selecionada'"));
check('Seleção continua acessível via aria-selected',workspace.includes('aria-selected={active}'));
check('Estado final é "Estruturada", não "Concluída"',workspace.includes("'is-complete' ? 'Estruturada'")&&!workspace.includes("'Concluída'"));
check('Estado parcial usa o mesmo vocabulário das linhas',workspace.includes("'is-partial' ? 'Em construção'"));
check('Título do próximo passo acompanha público-alvo na H17.0.3',workspace.includes("understandNextTarget === 'audience' ? 'Defina para quem é o serviço'")); 
check('Linhas que repetem o destino do CTA viram ação discreta',workspace.includes('duplicatesPhaseNext')&&workspace.includes("'is-quiet'"));
check('Rótulo da linha não repete o rótulo do CTA principal',workspace.includes('row.action === understandNextLabel ?'));
check('data-capability-action preserva o rótulo original',workspace.includes('data-capability-action={row.action}'));
check('CSS: CTA principal preenchido',css.includes('.bo-h155-phase-next>button{border-color:#2256c7'));
check('CSS: hover do CTA principal mantém contraste',css.includes('.bo-h155-phase-next>button:hover{background:#1c49a8'));
check('CSS: ação discreta definida',css.includes('button.is-quiet{background:transparent'));

console.log(`\nH16.3 Phase Status Consistency: ${ok}/${ok+fail} PASS`);
process.exit(fail?1:0);

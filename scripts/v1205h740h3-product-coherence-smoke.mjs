import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8'); let ok=0,fail=0; const check=(v,l)=>{console.log(`${v?'OK  ':'FAIL'} ${l}`);v?ok++:fail++};
const workspace=read('src/views/BlueprintWorkspaceView.tsx'); const app=read('src/App.tsx'); const lib=read('src/views/WorkspaceLibraryView.tsx'); const cock=read('src/views/ExecutiveServiceCockpitView.tsx'); const controller=read('src/state/useStudioController.ts'); const css=read('src/runtime/product-coherence-h740h3.css'); const style=read('src/style.css'); const main=read('src/main.tsx'); const problems=read('src/views/ProblemsView.tsx'); const whiteboard=read('src/views/WhiteboardsView.tsx'); const pkg=JSON.parse(read('package.json'));
for(const [v,l] of [
 [workspace.includes("type WorkspaceGroup = 'overview' | 'understand' | 'design' | 'validate' | 'improve' | 'operate'"),'grupos progressivos tipados'],
 [workspace.includes("label: 'Entender'")&&workspace.includes("label: 'Projetar'")&&workspace.includes("label: 'Validar'")&&workspace.includes("label: 'Melhorar'")&&workspace.includes("label: 'Operar'"),'cinco etapas do trabalho existem'],
 [workspace.includes('data-workspace-navigation="grouped"'),'workspace usa navegação agrupada'],
 [workspace.includes('bo-h740h3-workspace-subnav'),'subnav contextual existe'],
 [workspace.includes('activeWorkspaceItems'),'subnav deriva do grupo ativo'],
 [workspace.includes('workspaceBadge'),'badges preservados sem mega tabbar'],
 [workspace.includes('data-h740h3-legacy-perspectives'),'18 perspectivas preservadas semanticamente'],
 [workspace.includes('data-product-coherence="7.40-H3"'),'marker H3 no workspace'],
 [app.includes('>Serviço</span></button>'),'sidebar chama workspace de Serviço'],
 [app.includes('>Oportunidades</span></button>'),'sidebar distingue catálogo de oportunidades'],
 [app.includes('>Catálogo de métricas</span></button>'),'sidebar distingue catálogo de métricas'],
 [lib.includes('Abrir iniciativas de melhoria →'),'catálogo de oportunidades liga ao portfolio H7'],
 [lib.includes('Abrir Resultados →'),'catálogo de métricas liga a Resultados'],
 [lib.includes('Persona → Necessidade → Job → Dor → Hipótese → Problema → Evidência'),'Hierarquias ensina modelo relacional'],
 [cock.includes("{ detail: action.targetTab }")&&!cock.includes("detail: { id: action.targetTab }"),'Cockpit envia tab no contrato correto'],
 [controller.includes('autosaveWatchdogRef'),'autosave possui watchdog'],
 [controller.includes('5000'),'watchdog limita estado Salvando'],
 [problems.includes('Criar problema') && problems.includes("status:'draft'"),'Problemas usa CTA direto sem validação fictícia'],
 [whiteboard.includes('<h1>Whiteboard</h1>')&&!whiteboard.includes('<h1>Whiteboard 2.0</h1>'),'versão interna removida do Whiteboard'],
 [css.includes('grid-template-columns:repeat(6,minmax(0,1fr))'),'desktop sem mega linha horizontal'],
 [css.includes('overflow-x:hidden!important'),'workspace impede overflow global'],
 [css.includes('@media(max-width:1150px)')&&css.includes('@media(max-width:720px)'),'navegação agrupada responsiva'],
 [style.includes("product-coherence-h740h3.css"),'CSS H3 importado'],
 [main.includes("'bo-h740h3'"),'host H3 no main'],
 [pkg.scripts['v1205h740h3:product-coherence-smoke']?.includes('v1205h740h3-product-coherence-smoke.mjs'),'script H3 registrado'],
 [pkg.scripts.qa.includes('v1205h740h3:product-coherence-smoke'),'QA acumulado inclui H3'],
]) check(v,l);
console.log(`\nH7.40-H3 Product Coherence & Navigation: ${ok}/${ok+fail} PASS`); process.exit(fail?1:0);

import fs from 'node:fs';import assert from 'node:assert/strict';
const view=fs.readFileSync('src/views/WhiteboardsView.tsx','utf8');
const css=fs.readFileSync('src/runtime/whiteboard-h711.css','utf8');
const checks=[
['Estado vazio possui CTA direto',view.includes('data-whiteboard-empty-focus="1"')&&view.includes('onClick={()=>void createAndOpen()}')],
['Runtime cria e abre imediatamente',view.includes("runtime.createBlank('Novo Whiteboard')")],
['Busca e filtros apenas com quadros',view.includes('boards.length>0 && <div className="bo-h711-commandbar">')],
['Pista e atalhos excessivos removidos',!view.includes('bo-h1711-flow-hint')],
['Ações de biblioteca só quando há quadros',view.includes('boards.length>0&&<div className="bo1190-whiteboard-actions"')],
['Estado sem resultados mantém limpar filtros',view.includes('Limpar filtros')],
['Quadros existentes continuam com preview e ações',view.includes('<BoardPreview board=')&&view.includes('syncWhiteboardBlueprint')],
['Falha de runtime não fecha formulário',view.includes("O editor de Whiteboard não está disponível")],
['Tema vazio responsivo',css.includes('.bo-wb-empty-focus')&&css.includes('@media(max-width:650px)')],
];for(const [name,ok] of checks)console.log((ok?'PASS ':'FAIL ')+name);assert.ok(checks.every(x=>x[1]));
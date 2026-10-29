import fs from 'node:fs';
import assert from 'node:assert/strict';
const view=fs.readFileSync('src/views/WhiteboardsView.tsx','utf8');
const css=fs.readFileSync('src/runtime/whiteboard-empty-focus.css','utf8');
const main=fs.readFileSync('src/main.tsx','utf8');
const core=fs.readFileSync('src/runtime/whiteboard-core.js','utf8');
const tests=[
 ['Estado vazio identificável no DOM',view.includes('data-whiteboard-empty-state="1"')&&view.includes("data-whiteboard-empty={boards.length === 0 ? '1' : '0'}")],
 ['Tela vazia usa imagem local e chamada central',view.includes('whiteboard-empty-state.svg')&&view.includes('Nenhum Whiteboard ainda')&&view.includes('bo-whiteboard-zero-create')],
 ['Um clique direto cria sem modal',view.includes('onClick={() => void create(true)}')&&view.includes("runtime.createBlank(direct ? 'Novo Whiteboard'")],
 ['Criação abre editor real e confirma falha',view.includes("document.body.classList.contains('bo-whiteboard-open')")&&view.includes('runtime.openBoard?.(created.id)')&&view.includes('Falha ao iniciar o Whiteboard')],
 ['Runtime original persiste e abre canvas',core.includes("async function createBlankWhiteboard(")&&core.includes("await open();if(overlay)")&&core.includes("save(false,{label:'Criar Whiteboard'})")],
 ['Busca e filtros ocultos antes da criação',view.includes('boards.length > 0 && <div className="bo-h711-commandbar"')],
 ['Sem resumo e handoff no estado vazio',view.includes('boards.length > 0 && <div className="bo-h711-summary"')&&view.includes('boards.length > 0 && handoff.readyForWhiteboard')],
 ['Sem callouts duplicados no estado vazio',view.includes('boards.length > 0 && <div className="bo-h1711-flow-hint"')],
 ['Navegação secundária por caminhos existentes',view.includes('bo-whiteboard-zero-links')&&view.includes('onClick={openBlueprints}')&&view.includes('onClick={() => openJourneys()}')],
 ['Biblioteca existente ainda oferece renomear, duplicar e excluir', ['rename(board.id)','duplicate(board.id)','remove(board.id)'].every(x=>view.includes(x))],
 ['Estado de filtro sem resultados não se passa por estado vazio',view.includes('Limpar filtros')&&view.includes("setFilter('all')")],
 ['CSS isolado, responsivo e carregado depois',main.includes("import './style.css';\nimport './runtime/whiteboard-empty-focus.css';")&&css.includes('.bo-whiteboard-zero-page')&&css.includes('@media(max-width:720px)')],
];
for(const [name,ok] of tests)console.log((ok?'PASS ':'FAIL ')+name);
assert.ok(tests.every(x=>x[1]),'Whiteboard focused empty-state contract failed');
console.log(`Whiteboard Empty Focus: ${tests.length}/${tests.length} PASS`);

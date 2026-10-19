const L = require('./lib.cjs');
(async () => {
  const { rec, flush, ptr, key, $, $$, itemEl, dragItem, fresh, setPhase, save, makeEnv, seedService } = L;
  setPhase('F1 · Partida a frio e criação do quadro');
  // 1.1 sem serviço
  { const { w } = makeEnv(); let fired = false; w.addEventListener('bo-create-service', () => fired = true);
    const wc = w.BlueOceanRuntime.api('whiteboardCore'); const r = await wc.createBlank('x');
    rec('1.1', 'Criar quadro sem serviço é bloqueado e pede criação de serviço', (r === null && fired) ? 'PASS' : 'FAIL', `retorno=${r}, evento bo-create-service=${fired}`); }
  const w = await fresh(); const wb = w.__wb; const wc = w.BlueOceanRuntime.api('whiteboardCore');
  rec('1.2', 'Quadro em branco: 0 objetos, 0 conexões, viewKind=free', (Object.keys(wb.board().items).length === 0 && Object.keys(wb.board().edges).length === 0 && wb.board().viewKind === 'free') ? 'PASS' : 'FAIL');
  rec('1.3', 'Estado vazio exibido com chamada para ação', $(w, '.rt144-empty') ? 'PASS' : 'FAIL', [...$$(w, '.rt144-empty button')].map(b => b.textContent).join(' | '));
  const bh = w.BlueOceanRuntime.api('blueprintHome'); const m = bh?.model?.();
  const inBp = JSON.stringify(m || {}).includes(wb.boardId);
  rec('1.4', 'Whiteboard livre não vaza para a biblioteca de Blueprints', inBp ? 'FAIL' : 'PASS');
  rec('1.5', 'Camadas de CSS empilhadas na raiz do overlay', 'WARN', `${wb.overlay.className.split(/\s+/).length} classes de versão na raiz (rt144…rt190, bo1174-board)`);
  rec('1.6', 'Nós DOM no estado vazio', 'INFO', `${wb.overlay.querySelectorAll('*').length} elementos para um quadro sem nenhum objeto`);
  const top = $$(w, '.rt144-top button').map(b => (b.getAttribute('aria-label') || b.title || b.textContent).trim()).filter(Boolean);
  rec('1.7', 'Ações do cabeçalho do quadro', 'INFO', top.join(' | '));
  const tools = $$(w, '.rt144-tools .rt144-tool').map(b => b.getAttribute('aria-label') + (b.getAttribute('aria-keyshortcuts') ? `(${b.getAttribute('aria-keyshortcuts')})` : ''));
  rec('1.8', 'Barra de ferramentas', 'INFO', tools.join(' | '));
  // abrir biblioteca
  $$(w, '.rt144-tool').find(b => b.getAttribute('aria-label') === 'Adicionar').click(); await flush(w);
  const libCats = $$(w, '.rt144-library button, .rt144-library .rt144-section').map(x => x.textContent.trim().replace(/\s+/g, ' ')).filter(Boolean);
  rec('1.9', 'Biblioteca "Adicionar": itens disponíveis', 'INFO', `${libCats.length} entradas: ` + libCats.slice(0, 45).join(' · '));
  save('r1'); process.exit(0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });

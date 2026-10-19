const L = require('./lib.cjs');
(async () => {
  const { rec, assert, diagnostic, knownIssue, flush, ptr, key, keyup, $, $$, itemEl, dragItem, fresh, setPhase, save } = L;
  const w = await fresh(); const wb = w.__wb;
  setPhase('F2 · Brainstorm (usuário real: teclado, duplo clique, arrastar)');
  // 2.1 pressionar S seis vezes
  for (let i = 0; i < 6; i++) { key(w, 's'); await flush(w); }
  let items = Object.values(wb.board().items);
  const pos = new Set(items.map(i => `${i.x},${i.y}`));
  rec('2.1', 'Atalho S ×6 cria 6 post-its', items.length === 6 ? 'PASS' : 'FAIL', `${items.length} criados`);
  knownIssue('2.2', 'Post-its criados em sequência podem nascer sobrepostos', pos.size !== 6, `${pos.size} posição(ões) distinta(s) para 6 post-its${pos.size === 1 ? ` (${[...pos][0]})` : ''}`);
  // 2.3 edição de texto com o inspector
  const first = items[0]; wb.selected = [first.id]; wb.renderAll(); await flush(w);
  const el = itemEl(w, first.id); el.dispatchEvent(L.mk(w, 'dblclick', { clientX: 400, clientY: 300 })); await flush(w); await L.sleep(20);
  let ta = $(w, '.rt144-inspector textarea');
  rec('2.3', 'Duplo clique no post-it abre o Inspector com campo de texto', ta ? 'PASS' : 'FAIL', ta ? 'textarea "Conteúdo" encontrado' : 'não encontrado');
  if (ta) {
    const text = 'Cliente não sabe quando o pedido fica pronto'; let lostFocus = 0, detached = 0; const r0 = wb.perf.renderSamples;
    for (let i = 1; i <= 10; i++) {
      ta.focus(); ta.value = text.slice(0, i); ta.dispatchEvent(new w.Event('input', { bubbles: true })); await flush(w);
      if (!w.document.contains(ta)) detached++;
      if (w.document.activeElement === ta) {} else lostFocus++;
      ta = $(w, '.rt144-inspector textarea') || ta;
    }
    const renders = wb.perf.renderSamples - r0;
    rec('2.4', 'Digitar no Inspector preserva foco/cursor (10 teclas)', detached === 0 && lostFocus === 0 ? 'PASS' : 'FAIL',
      `textarea destruído em ${detached}/10 teclas; foco perdido em ${lostFocus}/10; ${renders} re-renders completos do overlay para 10 teclas; texto persistido="${wb.board().items[first.id].text}"`);
  }
  // 2.5 mover
  const before = { x: wb.board().items[first.id].x, y: wb.board().items[first.id].y };
  const h0 = wb.editHistory.length;
  await dragItem(w, first.id, 240, 120);
  const after = wb.board().items[first.id];
  rec('2.5', 'Arrastar post-it move o objeto e respeita a grade', (after.x !== before.x) ? 'PASS' : 'FAIL', `(${before.x},${before.y}) → (${after.x},${after.y}); múltiplos de 24: ${after.x % 24 === 0 && after.y % 24 === 0}`);
  rec('2.6', 'Arrasto vira 1 entrada de histórico (coalescida)', (wb.editHistory.length - h0) <= 2 ? 'PASS' : 'WARN', `${wb.editHistory.length - h0} entrada(s) novas`);
  // 2.7 espalhar os demais e criar texto/frame/forma/card
  const others = Object.values(wb.board().items).filter(i => i.id !== first.id);
  const texts = ['Fila no balcão no horário de pico', 'Pedido errado no delivery', 'App não mostra status', 'Atendente improvisa sem script', 'Cliente elogia o café mas não volta'];
  others.forEach((it, i) => { it.text = texts[i] || it.text; it.x = 120 + (i % 3) * 300; it.y = 360 + Math.floor(i / 3) * 190; });
  wb.save(); await flush(w);
  key(w, 't'); await flush(w);
  wb.addContainer('frame', 'Antes da compra', 'slate', { x: 96, y: 330 }, { width: 960, height: 460 }); await flush(w);
  const kinds = [...new Set(Object.values(wb.board().items).map(i => i.shape))];
  rec('2.7', 'Tipos de objeto livres criados (nota, texto, frame)', 'INFO', kinds.join(', '));
  // 2.8 Smart objects pelo Service Graph
  const tp = wb.createGraphEntityWithTitle('touchpoint', 'WhatsApp do pedido', ''); const pr = wb.createGraphEntityWithTitle('problem', 'Cliente não sabe o status do pedido', '');
  const op = wb.createGraphEntityWithTitle('opportunity', 'Aviso automático "pedido pronto"', '');
  const sIds = [tp, pr, op].map((id, i) => { const k = ['touchpoint', 'problem', 'opportunity'][i]; const sid = wb.addSmart(k, id, { x: 1180, y: 360 + i * 170 }); return sid; });
  await flush(w);
  const smart = Object.values(wb.board().items).filter(i => i.kind === 'smart');
  rec('2.8', 'Smart Objects (touchpoint/problema/oportunidade) entram no quadro vinculados ao Service Graph', smart.length === 3 ? 'PASS' : 'FAIL', `${smart.length} instâncias; entidades no grafo: touchpoints=${Object.keys(wb.graph.touchpoints || {}).length}, problems=${Object.keys(wb.graph.problems || {}).length}, opportunities=${Object.keys(wb.graph.opportunities || {}).length}`);
  const orphanStage = Object.keys(wb.graph.stages || {}).length === 0 && Object.keys(wb.graph.journeys || {}).length === 0;
  rec('2.9', 'Smart Objects criados num quadro livre não criam Jornada/Etapa escondidas (contrato V1.18.9)', orphanStage ? 'PASS' : 'FAIL', `journeys=${Object.keys(wb.graph.journeys || {}).length}, stages=${Object.keys(wb.graph.stages || {}).length}`);
  // 2.10 Backspace deleta
  const victim = Object.values(wb.board().items).find(i => i.shape === 'text'); wb.selected = [victim.id]; wb.renderAll(); await flush(w);
  key(w, 'Backspace', { code: 'Backspace' }); await flush(w);
  rec('2.10', 'Backspace apaga a seleção sem confirmação (recuperável por Ctrl+Z)', !wb.board().items[victim.id] ? 'WARN' : 'FAIL', 'excluído imediatamente; sem diálogo');
  key(w, 'z', { ctrlKey: true }); await flush(w);
  rec('2.11', 'Ctrl+Z restaura o objeto excluído', wb.board().items[victim.id] ? 'PASS' : 'FAIL');
  // 2.12 Atalhos de uma letra com foco em botão
  const btn = $$(w, '.rt144-tool').find(b => b.getAttribute('aria-label') === 'Frame'); btn.focus();
  const n0 = Object.keys(wb.board().items).length; key(w, 's'); await flush(w);
  knownIssue('2.12', 'Atalho de uma letra dispara com foco em botão (sem modificador)', Object.keys(wb.board().items).length > n0, 'S não deve criar post-it quando um controle da UI está focado');
  // 2.13 foco após clique em botão (a11y)
  const btn2 = $$(w, '.rt144-tool').find(b => b.getAttribute('aria-label') === 'Camadas'); btn2.focus(); btn2.click(); await flush(w);
  knownIssue('2.13', 'Foco do teclado pode se perder após acionar a toolbar', !(w.document.activeElement && w.document.activeElement !== w.document.body), `document.activeElement = <${w.document.activeElement?.tagName}> — overlay é recriado em várias ações`);
  const tabbables = $$(w, 'button, input, select, textarea, [tabindex]').length; const itemFocusable = $$(w, '.rt144-item[tabindex]').length;
  knownIssue('2.14', 'Objetos do canvas ainda não possuem operação completa por teclado', itemFocusable === 0, `${itemFocusable} de ${$$(w, '.rt144-item').length} itens com tabindex; role em itens: ${$$(w, '.rt144-item[role]').length}`);
  knownIssue('2.15', 'Toast sem região aria-live para leitores de tela', !$(w, '.rt144-toast[aria-live],[aria-live]'), 'nenhum aria-live no overlay');
  w.__persist = null; save('r2'); process.exit(0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });

const L = require('./lib.cjs');
(async () => {
  const { rec, flush, ptr, key, $, $$, itemEl, dragItem, fresh, setPhase, save } = L;
  const w = await fresh(); const wb = w.__wb;
  setPhase('F3 · Estrutura: frames, lasso, grupo, alinhar, conectar, copiar, histórico');
  const mkNote = (t, x, y) => { const it = wb.addFree('note', 'note', t, 'yellow', { x, y }); return it.id; };
  const a = mkNote('Cliente chega e vê a fila', 120, 400), b = mkNote('Faz o pedido no balcão', 480, 400), c = mkNote('Espera sem saber o prazo', 840, 400), d = mkNote('Retira e paga', 1200, 400);
  const fr = wb.addContainer('frame', 'Salão', 'slate', { x: 96, y: 330 }, { width: 760, height: 360 }); await flush(w);
  const frId = Object.values(wb.board().items).find(i => i.shape === 'frame').id;
  // 3.1 arrastar nota para dentro do frame
  const out = mkNote('Fora do frame', 1000, 800); await flush(w);
  await dragItem(w, out, -300, -420); await flush(w);
  const parent = wb.meta.frameParents[wb.boardId]?.[out];
  rec('3.1', 'Soltar um objeto dentro de um Frame o torna filho do Frame', parent === frId ? 'PASS' : 'WARN', `parent=${parent || 'nenhum'} pos=(${wb.board().items[out].x},${wb.board().items[out].y})`);
  // 3.2 lasso
  const canvas = $(w, '.rt144-canvas'); ptr(w, 'pointerdown', canvas, 60, 330); await flush(w);
  ptr(w, 'pointermove', w.document, 900, 600); await flush(w); ptr(w, 'pointerup', w.document, 900, 600); await flush(w);
  rec('3.2', 'Laço (lasso) seleciona objetos na área', wb.selected.length > 0 ? 'PASS' : 'FAIL', `${wb.selected.length} selecionado(s)`);
  // 3.3 agrupar / alinhar / distribuir
  wb.selected = [a, b, c]; wb.renderAll(); await flush(w);
  key(w, 'g', { ctrlKey: true }); await flush(w);
  const g1 = wb.meta.groups[wb.boardId]; rec('3.3', 'Ctrl+G agrupa a seleção', Object.keys(g1 || {}).length >= 3 ? 'PASS' : 'FAIL', `${Object.keys(g1 || {}).length} membros no grupo`);
  key(w, 'g', { ctrlKey: true, shiftKey: true }); await flush(w);
  wb.selected = [a, b, c, d]; wb.renderAll(); wb.board().items[b].y = 430; wb.board().items[c].y = 380; wb.save(); wb.align('top'); await flush(w);
  const ys = [a, b, c, d].map(i => wb.board().items[i].y); rec('3.4', 'Alinhar ao topo', new Set(ys).size === 1 ? 'PASS' : 'FAIL', `y=${ys.join(',')}`);
  wb.distribute('x'); await flush(w);
  const xs = [a, b, c, d].map(i => wb.board().items[i].x).sort((p, q) => p - q); const gaps = xs.slice(1).map((v, i) => v - xs[i]);
  rec('3.5', 'Distribuir horizontalmente', 'INFO', `x=${xs.join(',')} intervalos=${gaps.join(',')}`);
  // 3.6 conectar arrastando handle
  const elA = itemEl(w, a), elB = itemEl(w, b); const handle = $(w, '.conn-handle.right', elA);
  rec('3.6a', 'Handles de conexão existem nos 4 lados do objeto', $$(w, '.conn-handle', elA).length === 4 ? 'PASS' : 'FAIL', `${$$(w, '.conn-handle', elA).length} handles`);
  const e0 = Object.keys(wb.board().edges).length;
  ptr(w, 'pointerdown', handle, 500, 420); await flush(w); ptr(w, 'pointermove', w.document, 600, 430); await flush(w);
  w.__hit = itemEl(w, b); ptr(w, 'pointerup', w.document, 600, 430); await flush(w);
  rec('3.6', 'Arrastar do handle até outro card cria conexão', Object.keys(wb.board().edges).length === e0 + 1 ? 'PASS' : 'FAIL');
  // 3.7 conectar a objeto dentro de Frame cruzando camadas + conexão duplicada
  wb.addEdge(a, b); await flush(w);
  rec('3.7', 'Conexão duplicada A→B é impedida (reaproveita a existente)', Object.keys(wb.board().edges).length === e0 + 1 ? 'PASS' : 'FAIL');
  wb.addEdge(b, c); wb.addEdge(c, d); await flush(w);
  const geo = Object.values(wb.board().edges).map(ed => { try { return wb.edgeGeometry(ed); } catch (e) { return null; } });
  rec('3.8', 'Conexões renderizam (SVG) para todas as arestas', $$(w, '.edgehit').length >= 3 ? 'PASS' : 'WARN', `${$$(w, '.edgehit').length} áreas clicáveis de aresta`);
  // 3.9 conexão por Conectar (C) e clique
  key(w, 'c'); await flush(w); const isConnect = wb.tool === 'connect';
  rec('3.9', 'Atalho C ativa a ferramenta Conexão', isConnect ? 'PASS' : 'FAIL'); key(w, 'Escape'); await flush(w);
  // 3.10 copiar / colar / duplicar
  wb.selected = [a, b]; wb.renderAll(); await flush(w);
  const n0 = Object.keys(wb.board().items).length; key(w, 'c', { ctrlKey: true }); await flush(w); key(w, 'v', { ctrlKey: true }); await flush(w);
  const n1 = Object.keys(wb.board().items).length; const pasted = wb.selected.map(id => wb.board().items[id]);
  rec('3.10', 'Ctrl+C / Ctrl+V duplica 2 objetos', n1 === n0 + 2 ? 'PASS' : 'FAIL', `${n0}→${n1}; colados em (${pasted.map(p => p.x + ',' + p.y).join(' | ')}) — original a=(${wb.board().items[a].x},${wb.board().items[a].y})`);
  const overlap = pasted.some(p => Object.values(wb.board().items).some(o => o.id !== p.id && o.x === p.x && o.y === p.y));
  rec('3.11', 'Objetos colados não ficam exatamente sobre outro objeto', overlap ? 'WARN' : 'PASS');
  // 3.12 travar, ocultar, z-order
  wb.lockSelection(true); const locked = wb.selected.map(id => !!wb.board().items[id].locked).every(Boolean); key(w, 'Delete'); await flush(w);
  rec('3.12', 'Objeto bloqueado resiste a Delete', locked && wb.selected.every(id => wb.board().items[id]) ? 'PASS' : 'FAIL');
  // 3.13 histórico: sequência longa de edições e tamanho
  const hBefore = wb.editHistory.length;
  for (let i = 0; i < 40; i++) { wb.board().items[a].x += 24; wb.save(false, { label: 'Mover objetos' }); }
  for (let i = 0; i < 30; i++) { wb.addFree('note', 'note', 'n' + i, 'yellow', { x: 100 + i * 20, y: 900 }); }
  const bytes = wb.editHistory.reduce((s, h) => s + h.key.length, 0);
  rec('3.13', 'Histórico de desfazer: limite e peso', 'INFO', `${wb.editHistory.length} snapshots (limite 80); cada snapshot clona grafo+meta inteiros; ${(bytes / 1024).toFixed(0)} KB só nas chaves de comparação; ${Object.keys(wb.board().items).length} objetos`);
  // 3.14 Undo em cadeia
  const itemsNow = Object.keys(wb.board().items).length; for (let i = 0; i < 12; i++) { key(w, 'z', { ctrlKey: true }); await flush(w); }
  const itemsAfter = Object.keys(wb.board().items).length; for (let i = 0; i < 12; i++) { key(w, 'y', { ctrlKey: true }); await flush(w); }
  rec('3.14', 'Desfazer ×12 e refazer ×12 retornam ao mesmo estado', Object.keys(wb.board().items).length === itemsNow ? 'PASS' : 'FAIL', `${itemsNow} → ${itemsAfter} → ${Object.keys(wb.board().items).length}`);
  // 3.15 histórico ao trocar de quadro: undo atravessa quadros?
  rec('3.15', 'Escopo do histórico', 'INFO', 'snapshot guarda o grafo do serviço inteiro (todos os quadros, jornadas, entidades) — desfazer num quadro reverte também alterações feitas em outros módulos no intervalo');
  // 3.16 Export/Import round-trip
  const frag = wb.boardFragment('board'); const before = { items: Object.keys(frag.payload.items || {}).length, edges: Object.keys(frag.payload.edges || {}).length };
  const boardsBefore = Object.keys(wb.graph.views.whiteboards).length; wb.importFragment(JSON.parse(JSON.stringify(frag)), true); await flush(w);
  const after = { items: Object.keys(wb.board().items).length, edges: Object.keys(wb.board().edges).length };
  rec('3.16', 'Exportar fragmento JSON e importar como novo quadro preserva objetos e conexões', (after.items === before.items && after.edges === before.edges) ? 'PASS' : 'WARN', `exportado ${before.items} obj/${before.edges} conex.; importado ${after.items}/${after.edges}; quadros ${boardsBefore}→${Object.keys(wb.graph.views.whiteboards).length}`);
  const svg = wb.buildExportSvg('board', false); rec('3.17', 'Exportação SVG gerada', svg?.svg?.length > 500 ? 'PASS' : 'FAIL', `${(svg?.svg?.length / 1024).toFixed(1)} KB`);
  save('r3'); process.exit(0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });

const L = require('./lib.cjs');
(async () => {
  const { rec, assert, diagnostic, knownIssue, flush, ptr, key, $, $$, itemEl, dragItem, fresh, setPhase, save, makeEnv, seedService } = L;
  const w = await fresh(); const wb = w.__wb;
  setPhase('F4 · Navegação, limites do canvas e persistência');
  for (let i = 0; i < 12; i++) wb.addFree('note', 'note', 'Nota ' + (i + 1), 'yellow', { x: 120 + (i % 4) * 320, y: 200 + Math.floor(i / 4) * 200 });
  await flush(w);
  // 4.1 zoom por wheel com ctrl: custo de render
  const view = $(w, '.rt144-view'); const r0 = wb.perf.renderSamples; const z0 = wb.zoom;
  for (let i = 0; i < 20; i++) view.dispatchEvent(new w.WheelEvent('wheel', { bubbles: true, cancelable: true, ctrlKey: true, deltaY: -60, clientX: 700, clientY: 400 }));
  await flush(w);
  rec('4.1', 'Zoom (Ctrl+roda) ×20 eventos', 'INFO', `zoom ${z0.toFixed(2)} → ${wb.zoom.toFixed(2)}; ${wb.perf.renderSamples - r0} re-renders completos do overlay; limites 0.10–4.0`);
  // 4.2 pan por wheel
  const r1 = wb.perf.renderSamples; const view2 = $(w, '.rt144-view');
  for (let i = 0; i < 30; i++) view2.dispatchEvent(new w.WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: 20, deltaY: 20 }));
  await flush(w);
  rec('4.2', 'Pan (roda) ×30 eventos', 'INFO', `${wb.perf.renderSamples - r1} re-renders completos do overlay (rAF agrupa eventos do mesmo frame) — pan/zoom reconstroem o DOM em vez de só mover um transform`);
  // 4.3 limites do canvas
  const it = Object.values(wb.board().items)[0]; wb.selected = [it.id]; wb.renderAll(); await flush(w);
  await dragItem(w, it.id, -2500, -2500, 4);
  const p = wb.board().items[it.id]; knownIssue('4.3', 'Canvas não expande para esquerda/cima', p.x === 0 && p.y === 0, `posição final (${p.x},${p.y}) — coordenadas negativas são cortadas em 0`);
  wb.board().items[it.id].x = 7000; wb.board().items[it.id].y = 4200; wb.save(); await flush(w);
  const cv = $(w, '.rt144-canvas'); const cw = parseFloat(cv?.style.width || '0'), ch = parseFloat(cv?.style.height || '0'); const coversFar = cw >= wb.board().items[it.id].x + wb.board().items[it.id].width && ch >= wb.board().items[it.id].y + wb.board().items[it.id].height; knownIssue('4.4', 'Canvas físico não acompanha objetos distantes', !coversFar, `div do canvas: ${cv?.style.width} × ${cv?.style.height}; cobre objeto distante=${coversFar}`);
  // 4.5 fit com objeto distante
  key(w, '0', { ctrlKey: true }); await flush(w); rec('4.5', 'Ctrl+0 (ajustar tudo) com objeto distante', 'INFO', `zoom resultante ${wb.zoom.toFixed(2)}`);
  // 4.6 outline/busca
  key(w, '/'); await flush(w); const ol = $(w, '.rt148-outline'); rec('4.6', 'Atalho "/" abre a busca/outline', ol ? 'PASS' : 'FAIL');
  // 4.7 persistência: tamanho em disco
  const raw = w.localStorage.getItem('realtalent-service-studio-v3-service-graph'); const compact = JSON.stringify(JSON.parse(raw));
  rec('4.7', 'Formato salvo em localStorage', 'WARN', `${(raw.length / 1024).toFixed(1)} KB indentado vs ${(compact.length / 1024).toFixed(1)} KB compacto (${Math.round((1 - compact.length / raw.length) * 100)}% de desperdício); chaves de armazenamento ainda usam o prefixo antigo "realtalent-service-studio-…"`);
  // 4.8 IndexedDB espelho
  await L.sleep(700); const pers = wb.persistence; rec('4.8', 'Espelho durável (IndexedDB) após autosave', pers.durableState === 'protected' ? 'PASS' : 'WARN', `durableState=${pers.durableState}, erro=${pers.error || 'nenhum'}`);
  // 4.9 salvar com imagem grande até estourar quota
  let okCount = 0, firstFail = null; const big = 'data:image/png;base64,' + 'A'.repeat(900 * 1024);
  for (let i = 0; i < 8; i++) { const im = wb.addFree('image', 'image', 'img' + i, 'slate', { x: 100 + i * 40, y: 1200 }); im.asset = { name: 'foto' + i + '.png', mime: 'image/png', size: 900 * 1024, dataUrl: big }; im.visualKind = 'image'; const ok = wb.save(false, { label: 'img' }); if (ok) okCount++; else if (!firstFail) firstFail = i; }
  await L.sleep(200);
  rec('4.9', 'Imagens como data URL dentro do JSON do grafo (8 × ~0,9 MB)', 'WARN', `${okCount}/8 saves OK; falha em #${firstFail ?? '—'}; saveState=${wb.saveState}; aviso="${wb.persistence.error || ''}"; imagens vivem no grafo e são clonadas em cada snapshot de undo e em cada save`);
  // 4.10 conflito entre abas
  const w2 = await fresh(); const wb2 = w2.__wb; wb2.addFree('note', 'note', 'antes', 'yellow', { x: 200, y: 200 }); await flush(w2);
  const cur = JSON.parse(w2.localStorage.getItem('realtalent-service-studio-v3-service-graph')); cur.persistenceRevision += 5; w2.localStorage.setItem('realtalent-service-studio-v3-service-graph', JSON.stringify(cur));
  let errEvt = null; w2.addEventListener('rt-data-error', e => errEvt = e.detail);
  const okSave = wb2.save(false, { label: 'edição pós-conflito' }); wb2.addFree('note', 'note', 'depois do conflito', 'yellow', { x: 500, y: 200 }); await flush(w2);
  const stored = JSON.parse(w2.localStorage.getItem('realtalent-service-studio-v3-service-graph'));
  const inStore = Object.values(Object.values(stored.views.whiteboards)[0].items).some(i => i.text === 'depois do conflito');
  const conflict = w2.BlueOceanRuntime.api('whiteboardCore')?.conflictDraft?.();
  const inDraft = !!conflict && Object.values(conflict.graph?.views?.whiteboards || {}).some(b => Object.values(b.items || {}).some(i => i.text === 'depois do conflito'));
  knownIssue('4.10', 'Conflito entre abas pode deixar edição somente em memória', !inStore && !inDraft, `save retornou ${okSave}; saveState=${wb2.saveState}; rascunho protegido=${inDraft}; mensagem="${errEvt || ''}"`);
  // 4.11 sair do quadro
  const back = $$(w, '.rt190-back')[0]; knownIssue('4.11', 'Botão Voltar do quadro livre depende do caminho de close(true)/reload', back?.title === 'Voltar ao Service Studio', `título="${back?.title || ''}"; monitorar até a navegação deixar de depender de reload completo`);
  save('r4'); process.exit(0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });

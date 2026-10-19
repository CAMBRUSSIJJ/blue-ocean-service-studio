const L = require('./lib.cjs');
(async () => {
  const { rec, assert, diagnostic, knownIssue, flush, ptr, key, $, $$, itemEl, fresh, setPhase, save, makeEnv, seedService, mk } = L;
  const w = await fresh(); const wb = w.__wb;
  setPhase('F6 · Templates, comandos, layout, atalhos, celular e segurança');
  // 6.1 templates
  const templateBtn = [...$$(w, '.rt144-empty button')].find(b => b.textContent.toLowerCase().includes('template'));
  assert('6.1a', 'Empty state oferece acesso à biblioteca de templates', !!templateBtn);
  if (templateBtn) templateBtn.click(); await flush(w);
  const cats = $$(w, '.rt151-template-cats button').map(b => b.textContent.replace(/\s+/g, ' ').trim());
  const cards = $$(w, '.rt151-template-list article').map(a => (a.querySelector('b,strong,h3,h4')?.textContent || a.textContent).trim().slice(0, 40));
  rec('6.1', 'Biblioteca de templates', 'INFO', `categorias: ${cats.join(' | ')}; ${cards.length} modelos: ${cards.join(' · ')}`);
  $$(w, '.rt144-modal').forEach(m => m.remove());
  // 6.2 paleta de comandos
  key(w, 'k', { ctrlKey: true }); await flush(w); const cmds = $$(w, '.rt150-command-row').map(b => b.textContent.replace(/\s+/g, ' ').trim());
  rec('6.2', 'Paleta de comandos (Ctrl+K)', cmds.length ? 'PASS' : 'FAIL', `${cmds.length} comandos visíveis (máx. 18 listados): ${cmds.slice(0, 18).join(' · ')}`); key(w, 'Escape'); await flush(w);
  // 6.3 smart layout sobre 30 notas empilhadas
  const ids = []; for (let i = 0; i < 30; i++) ids.push(wb.addFree('note', 'note', 'Ideia ' + (i + 1), 'yellow', { x: 600, y: 336 }).id);
  const overlapCount = () => { const it = Object.values(wb.board().items); let n = 0; for (let i = 0; i < it.length; i++) for (let j = i + 1; j < it.length; j++) { const a = it[i], b = it[j]; if (!(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)) n++; } return n; };
  const o0 = overlapCount(); wb.selected = ids; wb.renderAll(); await flush(w);
  let applied = 'n/d'; try { wb.applySmartLayout('grid', 'selection', 'normal'); applied = 'grid'; } catch (e) { try { wb.applySmartLayout('tree', 'selection', 'normal'); applied = 'tree'; } catch (e2) { applied = 'erro: ' + e2.message; } }
  await flush(w); const o1 = overlapCount();
  rec('6.3', 'Smart Layout resolve a pilha de 30 notas sobrepostas', o1 < o0 ? 'PASS' : 'FAIL', `sobreposições ${o0} → ${o1} (layout "${applied}") — o recurso existe, mas o usuário só o descobre depois de ver a bagunça`);
  // 6.4 Space com foco em botão
  const b = $$(w, '.rt144-tool')[0]; b.focus(); const ev = key(w, ' ', { code: 'Space', target: b });
  knownIssue('6.4', 'Barra de espaço é engolida pelo pan quando um botão está focado', ev.defaultPrevented, `defaultPrevented=${ev.defaultPrevented}; event.target=<${ev.target?.tagName || 'n/d'}>`);
  key(w, ' ', { code: 'Space', target: b });
  // 6.5 segurança: conteúdo hostil importado
  const xss = '<img src=x onerror="window.__xss=(window.__xss||0)+1">'; wb.addFree('note', 'note', xss, 'yellow', { x: 100, y: 100 });
  const c1 = wb.addFree('card', 'card', xss, 'blue', { x: 400, y: 100 }); c1.description = xss; c1.status = xss; c1.badge = xss; c1.tags = [xss];
  const ln = wb.addFree('link', 'link', 'x', 'violet', { x: 700, y: 100 }); ln.link = { url: 'javascript:window.__xss=9', title: xss, domain: xss }; ln.visualKind = 'link';
  const ic = wb.addFree('icon', 'icon', xss, 'slate', { x: 1000, y: 100 }); ic.icon = xss; ic.iconLabel = xss;
  const im = wb.addFree('image', 'image', 'x', 'slate', { x: 100, y: 400 }); im.visualKind = 'image'; im.caption = xss; im.asset = { name: xss, mime: 'image/png', size: 1, dataUrl: 'data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+' };
  const fr = wb.addContainer('frame', xss, 'slate', { x: 400, y: 400 }, { width: 400, height: 240 });
  wb.save(); await flush(w); wb.renderAll(); await flush(w);
  const injected = $$(w, '.rt144-canvas img[onerror], .rt144-canvas script, .rt144-canvas [onerror]').length;
  rec('6.5', 'Conteúdo HTML hostil em texto/título/legenda/tag/ícone/frame é escapado ao renderizar', (injected === 0 && !w.__xss) ? 'PASS' : 'FAIL', `elementos injetados=${injected}; window.__xss=${w.__xss || 0}`);
  const img = im && $(w, `.rt144-item[data-id="${im.id}"] img`); rec('6.6', 'Data URL SVG em imagem é rejeitada (só png/jpeg/webp/gif base64)', !img || !/svg/.test(img.src) ? 'PASS' : 'FAIL');
  const svg = wb.buildExportSvg('board', false).svg; const sdoc = new w.DOMParser().parseFromString(svg, 'image/svg+xml'); const active = [...sdoc.querySelectorAll('*')].filter(e => e.tagName.toLowerCase() === 'script' || [...e.attributes].some(a => /^on/i.test(a.name))).length; rec('6.7', 'Exportação SVG não carrega payload ativo (texto hostil sai escapado)', (!sdoc.querySelector('parsererror') && active === 0) ? 'PASS' : 'FAIL', `${(svg.length / 1024).toFixed(1)} KB; elementos/atributos ativos=${active}`);
  // 6.8 fragmento importado com tone/URL estranhos
  const evil = { format: 'realtalent.service-studio.board-fragment', items: { z1: { id: 'z1', kind: 'free', shape: 'note', visualKind: 'note', tone: '"><img src=x onerror=window.__xss2=1>', text: 'ok', x: 10, y: 10, width: 200, height: 100 } }, edges: {}, parents: {}, groups: {} };
  try { wb.importFragment(JSON.parse(JSON.stringify(wb.boardFragment('board'))).items ? Object.assign(wb.boardFragment('board'), { items: Object.assign({}, wb.boardFragment('board').items, evil.items) }) : evil, true); } catch (e) {}
  await flush(w); rec('6.8', 'Fragmento importado com campo "tone" malicioso', w.__xss2 ? 'FAIL' : 'PASS', `window.__xss2=${w.__xss2 || 0}`);
  // 6.9 celular
  const m = await (async () => { const { w: wm } = makeEnv({ mobile: true }); seedService(wm); await wm.BlueOceanRuntime.api('whiteboardCore').createBlank('Mobile'); await flush(wm); return wm; })();
  const mt = $$(m, '.rt144-tool').map(b => b.getAttribute('aria-label')); const n0 = Object.keys(m.__wb.board().items).length; key(m, 's'); await flush(m); const n1 = Object.keys(m.__wb.board().items).length;
  rec('6.9', 'Largura < 600px: quadro vira somente leitura', 'WARN', `ferramentas: ${mt.join(', ')}; atalho S ${n1 > n0 ? 'criou' : 'não criou'} objeto — celular só consulta; tablets ≥600px recebem edição completa mas sem pinça (2 dedos), sem pointercancel e com alvos de 17px`);
  // 6.10 conexões: alvo por clique e roteamento
  const a = wb.addFree('note', 'note', 'A', 'yellow', { x: 100, y: 900 }).id, c = wb.addFree('note', 'note', 'C', 'yellow', { x: 700, y: 900 }).id; wb.addEdge(a, c); await flush(w);
  const ed = Object.values(wb.board().edges).find(e => e.fromId === a); rec('6.10', 'Conexão criada com roteamento padrão', 'INFO', `rota=${ed.route}, seta=${ed.arrow}, label="${ed.label}" (sem rótulo por padrão; conexões não são tipadas — não carregam semântica de relação do Service Graph)`);
  const entEdgeHasType = Object.keys(ed).includes('relationType') || Object.keys(ed).includes('kind'); knownIssue('6.11', 'Conexões ainda não possuem tipo semântico de relação', !entEdgeHasType, `campos: ${Object.keys(ed).join(', ')}`);
  save('r6'); process.exit(0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });

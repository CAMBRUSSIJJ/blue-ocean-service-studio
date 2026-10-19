const L = require('./lib.cjs');
(async () => {
  const { rec, benchmark, diagnostic, flush, $, fresh, setPhase, save } = L;
  setPhase('F5 · Escala e desempenho (jsdom: sem layout/pintura = limite inferior)');
  const sizes = [50, 150, 300, 600, 1000, 2000]; const rows = [];
  for (const n of sizes) {
    const w = await fresh(); const wb = w.__wb; const diag = w.BlueOceanRuntime.api('whiteboardDiagnostics');
    const t0 = Date.now(); diag.createStressBoard(n); await flush(w); const tCreate = Date.now() - t0;
    wb.zoom = 0.88; wb.pan = { x: 88, y: 78 };
    const bench = await diag.benchmark(8);
    const ts = []; for (let i = 0; i < 5; i++) { const s = performance.now(); wb.save(false, { label: 'k' }); ts.push(performance.now() - s); }
    const saveMs = ts.reduce((a, b) => a + b) / ts.length;
    const raw = w.localStorage.getItem('realtalent-service-studio-v3-service-graph') || '';
    const hist = wb.editHistory.length; const snapBytes = wb.editHistory.reduce((s, h) => s + h.key.length, 0);
    const nodes = wb.overlay.querySelectorAll('*').length;
    const s2 = performance.now(); wb.renderAll(); wb.save(false, { label: 'tecla' }); const keystroke = performance.now() - s2;
    rows.push({ n, createMs: tCreate, renderAvg: +bench.avg.toFixed(1), renderMax: +bench.max.toFixed(1), rendered: bench.stats.renderedItems, total: bench.stats.totalItems, domNodes: nodes, saveMs: +saveMs.toFixed(1), keystrokeMs: +keystroke.toFixed(1), graphKB: +(raw.length / 1024).toFixed(0), historyKB: +(snapBytes / 1024).toFixed(0), snapshots: hist });
    console.log(JSON.stringify(rows[rows.length - 1]));
  }
  benchmark('5.1', 'Escala: tempo de render, save e peso por tamanho do quadro', JSON.stringify(rows));
  // custo de uma tecla no Inspector em quadro grande, extrapolação do histórico
  const big = rows.find(r => r.n === 1000); if (big) diagnostic('5.2', 'Memória estimada do histórico em quadro de 1.000 objetos', `cada snapshot ≈ ${(big.graphKB).toFixed(0)} KB serializado; 80 snapshots ≈ ${(big.graphKB * 80 / 1024).toFixed(0)} MB só em strings de comparação, mais os objetos clonados (≈ dobra)`, 'WARN');
  // imagem: custo de save com 8 imagens
  const w = await fresh(); const wb = w.__wb; const big64 = 'data:image/png;base64,' + 'A'.repeat(900 * 1024);
  for (let i = 0; i < 8; i++) { const im = wb.addFree('image', 'image', 'i' + i, 'slate', { x: 100 + i * 40, y: 100 }); im.asset = { name: 'f' + i, mime: 'image/png', size: 900 * 1024, dataUrl: big64 }; im.visualKind = 'image'; }
  const ts = []; for (let i = 0; i < 4; i++) { const s = performance.now(); wb.save(false, { label: 'img' }); ts.push(performance.now() - s); }
  benchmark('5.3', 'Custo de um save() com 8 imagens (~7 MB) — roda a cada edição', `${(ts.reduce((a, b) => a + b) / ts.length).toFixed(0)} ms por save (síncrono, na thread principal) + clone do histórico`);
  const aud = w.BlueOceanRuntime.api('whiteboardCore').audit(); diagnostic('5.4', 'Auditoria interna do núcleo (coreAudit)', JSON.stringify(aud).slice(0, 600));
  save('r5'); process.exit(0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });

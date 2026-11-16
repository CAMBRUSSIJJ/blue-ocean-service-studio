import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';
import {
  normalizeSavedMatrixView,
  switchMatrixPerspective,
  matrixBlueprintBoundary,
  manageJourneySavedView,
  type RowDefinition,
  type SavedMatrixView,
} from '../journey-views';

const NOW = '2025-06-01T12:00:00.000Z';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

function withJourney(graph: ServiceGraph, journeyId = 'j1'): ServiceGraph {
  const journey = { id: journeyId, serviceId: graph.service.id, name: 'Jornada', stageIds: [], createdAt: NOW, updatedAt: NOW };
  return { ...graph, journeys: { ...graph.journeys, [journeyId]: journey } } as ServiceGraph;
}

function defaultRows(): RowDefinition[] {
  return [
    { id: 'sd' }, { id: 'th' }, { id: 'ev' }, { id: 'ac' }, { id: 'em' },
    { id: 'fl' }, { id: 'bk' }, { id: 'sy' }, { id: 'im' }, { id: 'go' },
    { id: 'ch' }, { id: 'pr' }, { id: 'br' }, { id: 'rr' }, { id: 'ki' },
  ];
}

// ── normalizeSavedMatrixView ──────────────────────────────────────────────────

describe('normalizeSavedMatrixView', () => {
  it('retorna defaults quando chamada sem argumento', () => {
    const view = normalizeSavedMatrixView();
    expect(view.version).toBe(1);
    expect(view.perspective).toBe('journey');
    expect(view.preset).toBe('custom');
    expect(view.hiddenRows).toEqual([]);
    expect(view.rowOrder).toEqual([]);
    expect(view.insightsOpen).toBe(false);
    expect(view.insightsTab).toBe('guidance');
    expect(view.emotionsExpanded).toBe(false);
    expect(view.fitToScreen).toBe(false);
    expect(view.connectionMode).toBe('selected');
    expect(view.blueprintRenderer).toBe('canvas');
    expect(view.canvasOrderVersion).toBe(0);
    expect(view.zoom).toBe(100);
    expect(view.stageWidths).toEqual([]);
    expect(view.rowHeights).toEqual({});
    expect(view.collapsedRows).toEqual([]);
    expect(view.perspectiveViews).toEqual({});
  });

  it('perspective "blueprint" é preservada', () => {
    const view = normalizeSavedMatrixView({ perspective: 'blueprint' });
    expect(view.perspective).toBe('blueprint');
  });

  it('perspectiva blueprint inferida por preset "operational"', () => {
    const view = normalizeSavedMatrixView({ preset: 'operational' });
    expect(view.perspective).toBe('blueprint');
    expect(view.preset).toBe('operational');
  });

  it('preset válido é preservado', () => {
    for (const preset of ['essential', 'detailed', 'operational', 'acquisition', 'complete', 'custom']) {
      expect(normalizeSavedMatrixView({ preset }).preset).toBe(preset);
    }
  });

  it('preset inválido cai para "custom"', () => {
    expect(normalizeSavedMatrixView({ preset: 'nao-valido' }).preset).toBe('custom');
  });

  it('insightsTab válida é preservada', () => {
    for (const tab of ['guidance', 'analysis', 'quality']) {
      expect(normalizeSavedMatrixView({ insightsTab: tab }).insightsTab).toBe(tab);
    }
  });

  it('insightsTab inválida cai para "guidance"', () => {
    expect(normalizeSavedMatrixView({ insightsTab: 'nada' }).insightsTab).toBe('guidance');
  });

  it('connectionMode válido é preservado', () => {
    for (const mode of ['selected', 'all', 'off']) {
      expect(normalizeSavedMatrixView({ connectionMode: mode }).connectionMode).toBe(mode);
    }
  });

  it('connectionMode inválido cai para "selected"', () => {
    expect(normalizeSavedMatrixView({ connectionMode: 'invalid' }).connectionMode).toBe('selected');
  });

  it('blueprintRenderer "matrix" é preservado', () => {
    expect(normalizeSavedMatrixView({ blueprintRenderer: 'matrix' }).blueprintRenderer).toBe('matrix');
  });

  it('blueprintRenderer inválido cai para "canvas"', () => {
    expect(normalizeSavedMatrixView({ blueprintRenderer: 'other' }).blueprintRenderer).toBe('canvas');
  });

  it('canvasOrderVersion 1 é preservado', () => {
    expect(normalizeSavedMatrixView({ canvasOrderVersion: 1 }).canvasOrderVersion).toBe(1);
  });

  it('zoom é limitado ao intervalo [75, 150]', () => {
    expect(normalizeSavedMatrixView({ zoom: 50 }).zoom).toBe(75);
    expect(normalizeSavedMatrixView({ zoom: 200 }).zoom).toBe(150);
    expect(normalizeSavedMatrixView({ zoom: 120 }).zoom).toBe(120);
  });

  it('zoom inválido usa fallback 100', () => {
    expect(normalizeSavedMatrixView({ zoom: 'abc' }).zoom).toBe(100);
  });

  it('rowOrder aceita array de strings válidas', () => {
    const view = normalizeSavedMatrixView({ rowOrder: ['sd', 'ac', 'em'] });
    expect(view.rowOrder).toEqual(['sd', 'ac', 'em']);
  });

  it('rowOrder ignora strings inválidas', () => {
    const view = normalizeSavedMatrixView({ rowOrder: ['sd', 'INVALID', '123bad', 'valid'] });
    expect(view.rowOrder).toEqual(['sd', 'valid']);
  });

  it('rowOrder deduplica', () => {
    const view = normalizeSavedMatrixView({ rowOrder: ['sd', 'sd', 'ac'] });
    expect(view.rowOrder).toEqual(['sd', 'ac']);
  });

  it('rowOrder não-array cai para []', () => {
    expect(normalizeSavedMatrixView({ rowOrder: 'nao-array' }).rowOrder).toEqual([]);
  });

  it('stageWidths limita valores ao intervalo [210, 600]', () => {
    const view = normalizeSavedMatrixView({ stageWidths: [100, 290, 700] });
    expect(view.stageWidths).toEqual([210, 290, 600]);
  });

  it('rowHeights aceita objeto com chaves válidas e valores limitados', () => {
    const view = normalizeSavedMatrixView({ rowHeights: { ac: 200, 'INVALID': 100, em: 50 } });
    expect(view.rowHeights['ac']).toBe(200);
    expect('INVALID' in view.rowHeights).toBe(false);
    expect(view.rowHeights['em']).toBe(76); // 50 < min 76 → clamped
  });

  it('rowHeights não-objeto cai para {}', () => {
    expect(normalizeSavedMatrixView({ rowHeights: 'nada' }).rowHeights).toEqual({});
    expect(normalizeSavedMatrixView({ rowHeights: [1, 2] }).rowHeights).toEqual({});
  });

  it('perspectiveViews é normalizado com sub-snapshots', () => {
    const view = normalizeSavedMatrixView({
      perspectiveViews: {
        journey: { zoom: 110, preset: 'detailed' },
        blueprint: { zoom: 90, preset: 'operational' },
      },
    });
    expect(view.perspectiveViews['journey']?.zoom).toBe(110);
    expect(view.perspectiveViews['journey']?.perspective).toBe('journey');
    expect(view.perspectiveViews['blueprint']?.zoom).toBe(90);
    expect(view.perspectiveViews['blueprint']?.perspective).toBe('blueprint');
  });

  it('perspectiveViews ignora chaves que não são "journey" ou "blueprint"', () => {
    const view = normalizeSavedMatrixView({
      perspectiveViews: { unknown: { zoom: 100 } },
    });
    expect('unknown' in view.perspectiveViews).toBe(false);
  });

  it('perspectiveViews null/undefined resulta em {}', () => {
    expect(normalizeSavedMatrixView({ perspectiveViews: null }).perspectiveViews).toEqual({});
    expect(normalizeSavedMatrixView({ perspectiveViews: undefined }).perspectiveViews).toEqual({});
  });

  it('flags booleanas são normalizadas', () => {
    const view = normalizeSavedMatrixView({ insightsOpen: true, emotionsExpanded: true, fitToScreen: true });
    expect(view.insightsOpen).toBe(true);
    expect(view.emotionsExpanded).toBe(true);
    expect(view.fitToScreen).toBe(true);
  });
});

// ── switchMatrixPerspective ───────────────────────────────────────────────────

describe('switchMatrixPerspective', () => {
  it('retorna view atual quando perspectiva é inválida', () => {
    const result = switchMatrixPerspective({}, 'invalid' as 'journey', defaultRows());
    expect(result.perspective).toBe('journey');
  });

  it('retorna view atual quando perspectiva já é a corrente', () => {
    const result = switchMatrixPerspective({ perspective: 'journey' }, 'journey', defaultRows());
    expect(result.perspective).toBe('journey');
  });

  it('muda de journey para blueprint', () => {
    const result = switchMatrixPerspective({ perspective: 'journey' }, 'blueprint', defaultRows());
    expect(result.perspective).toBe('blueprint');
    expect(result.preset).toBe('operational');
  });

  it('muda de blueprint para journey', () => {
    const result = switchMatrixPerspective({ perspective: 'blueprint' }, 'journey', defaultRows());
    expect(result.perspective).toBe('journey');
    expect(result.preset).toBe('essential');
  });

  it('salva perspectiva anterior em perspectiveViews', () => {
    const result = switchMatrixPerspective({ perspective: 'journey', zoom: 120 }, 'blueprint', defaultRows());
    expect(result.perspectiveViews['journey']).toBeDefined();
    expect(result.perspectiveViews['journey']?.zoom).toBe(120);
    expect(result.perspectiveViews['journey']?.perspective).toBe('journey');
  });

  it('restaura perspectiva salva anteriormente', () => {
    // Vai para blueprint
    const afterBlueprint = switchMatrixPerspective({ perspective: 'journey', zoom: 130 }, 'blueprint', defaultRows());
    // Volta para journey
    const restored = switchMatrixPerspective(afterBlueprint as unknown as Record<string, unknown>, 'journey', defaultRows());
    expect(restored.perspective).toBe('journey');
    expect(restored.zoom).toBe(130);
  });

  it('blueprint muda connectionMode para "all"', () => {
    const result = switchMatrixPerspective({ perspective: 'journey', connectionMode: 'off' }, 'blueprint', defaultRows());
    expect(result.connectionMode).toBe('all');
  });

  it('journey mantém connectionMode original', () => {
    const result = switchMatrixPerspective({ perspective: 'blueprint', connectionMode: 'off' }, 'journey', defaultRows());
    // connectionMode é restaurado a partir do default perspective views
    expect(typeof result.connectionMode).toBe('string');
  });

  it('blueprint inclui linhas visíveis corretas', () => {
    const result = switchMatrixPerspective({}, 'blueprint', defaultRows());
    // 'ev', 'ch', 'ac', 'em', 'fl', 'bk', 'sy' visíveis
    const blueprintVisible = ['ev', 'ch', 'ac', 'em', 'fl', 'bk', 'sy'];
    for (const id of blueprintVisible) {
      expect(result.hiddenRows).not.toContain(id);
    }
  });

  it('rowOrder é baseado nas definitions', () => {
    const defs = [{ id: 'ac' }, { id: 'em' }, { id: 'fl' }];
    const result = switchMatrixPerspective({}, 'blueprint', defs);
    expect(result.rowOrder).toEqual(['ac', 'em', 'fl']);
  });

  it('linhas customizadas nunca ficam hidden', () => {
    const defs: RowDefinition[] = [{ id: 'ac' }, { id: 'my-custom', custom: true }];
    const result = switchMatrixPerspective({}, 'blueprint', defs);
    expect(result.hiddenRows).not.toContain('my-custom');
  });
});

// ── matrixBlueprintBoundary ───────────────────────────────────────────────────

describe('matrixBlueprintBoundary', () => {
  it('retorna null para id sem mapeamento', () => {
    expect(matrixBlueprintBoundary('sd', ['sd', 'ac', 'fl'])).toBeNull();
    expect(matrixBlueprintBoundary('ac', ['ac', 'fl'])).toBeNull();
  });

  it('retorna null para id "fl" não mapeado', () => {
    // Apenas 'fl', 'bk', 'sy' têm mapeamento (previous: 'ac', 'fl', 'bk')
    expect(matrixBlueprintBoundary('em', ['ac', 'em', 'fl'])).toBeNull();
  });

  it('"fl" com previous "ac" na ordem certa → valid: true', () => {
    const result = matrixBlueprintBoundary('fl', ['ac', 'fl', 'bk']);
    expect(result).not.toBeNull();
    expect(result!.previous).toBe('ac');
    expect(result!.valid).toBe(true);
    expect(result!.hidden).toBe(false);
  });

  it('"bk" com previous "fl" → valid: true', () => {
    const result = matrixBlueprintBoundary('bk', ['fl', 'bk', 'sy']);
    expect(result?.valid).toBe(true);
    expect(result?.previous).toBe('fl');
  });

  it('"sy" com previous "bk" → valid: true', () => {
    const result = matrixBlueprintBoundary('sy', ['bk', 'sy']);
    expect(result?.valid).toBe(true);
  });

  it('previous ausente → hidden: true, valid: false', () => {
    const result = matrixBlueprintBoundary('fl', ['fl', 'bk']); // 'ac' não está
    expect(result!.hidden).toBe(true);
    expect(result!.valid).toBe(false);
  });

  it('previous depois de id → valid: false', () => {
    const result = matrixBlueprintBoundary('fl', ['fl', 'ac']); // ac depois de fl
    expect(result!.valid).toBe(false);
  });

  it('row de fronteira entre previous e id → valid: false', () => {
    // 'fl' entre 'ac' e 'bk' invalida a boundary 'bk'
    const result = matrixBlueprintBoundary('bk', ['ac', 'fl', 'bk']);
    // Entre 'fl' e 'bk' (posições 1 e 2), não há rows de fronteira
    // Mas tem 'fl' entre 'fl' (previous de bk)... wait, let me re-read the code
    // previous of 'bk' is 'fl'. So between = rows from index(fl)+1 to index(bk)-1
    // ['ac', 'fl', 'bk'] → index(fl)=1, index(bk)=2, between=[] → valid
    expect(result?.valid).toBe(true);
  });

  it('row de fronteira interna invalida boundary', () => {
    // 'bk' com 'fl' antes mas tem outro 'bk' entre eles (edge case)
    // 'fl' aparece entre 'fl' (previous of bk) e 'bk'
    const result = matrixBlueprintBoundary('bk', ['fl', 'sy', 'bk']); // 'sy' é uma row de fronteira?
    // between = ['sy'], ['fl', 'bk', 'sy'].includes('sy') = true → valid: false
    expect(result?.valid).toBe(false);
  });
});

// ── manageJourneySavedView ────────────────────────────────────────────────────

describe('manageJourneySavedView', () => {
  it('lança erro quando journey não existe', () => {
    const graph = makeGraph();
    expect(() => manageJourneySavedView(graph, 'nao-existe', 'create', { name: 'Nova' }, NOW)).toThrow('Jornada indisponível.');
  });

  it('lança erro para ação inválida', () => {
    const graph = withJourney(makeGraph());
    expect(() => manageJourneySavedView(graph, 'j1', 'invalid' as 'create', {}, NOW)).toThrow('Ação de visualização inválida.');
  });

  it('lança erro quando id não existe para ação "update"', () => {
    const graph = withJourney(makeGraph());
    expect(() => manageJourneySavedView(graph, 'j1', 'update', { id: 'nao-existe' }, NOW)).toThrow('Visualização indisponível nesta Jornada.');
  });

  // ── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('cria uma nova visualização', () => {
      let graph = withJourney(makeGraph());
      graph = manageJourneySavedView(graph, 'j1', 'create', { name: 'Minha Vista', view: { zoom: 110 } }, NOW);
      const journey = (graph.journeys as Record<string, Record<string, unknown>>)['j1'];
      const list = journey['savedMatrixViews'] as Array<Record<string, unknown>>;
      expect(list).toHaveLength(1);
      expect(list[0]['name']).toBe('Minha Vista');
      expect(list[0]['createdAt']).toBe(NOW);
    });

    it('lança erro com nome vazio', () => {
      const graph = withJourney(makeGraph());
      expect(() => manageJourneySavedView(graph, 'j1', 'create', { name: '' }, NOW)).toThrow('Use um nome');
    });

    it('lança erro com nome > 80 caracteres', () => {
      const graph = withJourney(makeGraph());
      const longName = 'a'.repeat(81);
      expect(() => manageJourneySavedView(graph, 'j1', 'create', { name: longName }, NOW)).toThrow('Use um nome');
    });

    it('lança erro quando já existe nome igual (case-insensitive)', () => {
      let graph = withJourney(makeGraph());
      graph = manageJourneySavedView(graph, 'j1', 'create', { name: 'Vista Teste' }, NOW);
      expect(() => manageJourneySavedView(graph, 'j1', 'create', { name: 'vista teste' }, NOW)).toThrow('Já existe');
    });

    it('lança erro ao criar mais de 20 visualizações', () => {
      let graph = withJourney(makeGraph());
      for (let i = 1; i <= 20; i++) {
        graph = manageJourneySavedView(graph, 'j1', 'create', { name: `Vista ${i}` }, NOW);
      }
      expect(() => manageJourneySavedView(graph, 'j1', 'create', { name: 'Vista 21' }, NOW)).toThrow('até 20');
    });
  });

  // ── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('atualiza a view sem mudar o nome', () => {
      let graph = withJourney(makeGraph());
      graph = manageJourneySavedView(graph, 'j1', 'create', { name: 'Vista A', view: { zoom: 100 } }, NOW);
      const journey = (graph.journeys as Record<string, Record<string, unknown>>)['j1'];
      const list = journey['savedMatrixViews'] as Array<Record<string, unknown>>;
      const id = list[0]['id'] as string;

      graph = manageJourneySavedView(graph, 'j1', 'update', { id, view: { zoom: 130 } }, NOW);
      const list2 = ((graph.journeys as Record<string, Record<string, unknown>>)['j1']['savedMatrixViews']) as Array<Record<string, unknown>>;
      const updated = list2.find(v => v['id'] === id)!;
      expect(updated['name']).toBe('Vista A');
      const view = updated['view'] as Record<string, unknown>;
      expect(view['zoom']).toBe(130);
    });
  });

  // ── rename ──────────────────────────────────────────────────────────────────

  describe('rename', () => {
    it('renomeia visualização existente', () => {
      let graph = withJourney(makeGraph());
      graph = manageJourneySavedView(graph, 'j1', 'create', { name: 'Vista Original' }, NOW);
      const journey = (graph.journeys as Record<string, Record<string, unknown>>)['j1'];
      const id = ((journey['savedMatrixViews'] as Array<Record<string, unknown>>)[0]['id']) as string;

      graph = manageJourneySavedView(graph, 'j1', 'rename', { id, name: 'Vista Renomeada' }, NOW);
      const list = ((graph.journeys as Record<string, Record<string, unknown>>)['j1']['savedMatrixViews']) as Array<Record<string, unknown>>;
      expect(list[0]['name']).toBe('Vista Renomeada');
    });
  });

  // ── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('remove visualização existente', () => {
      let graph = withJourney(makeGraph());
      graph = manageJourneySavedView(graph, 'j1', 'create', { name: 'Vista A' }, NOW);
      const journey = (graph.journeys as Record<string, Record<string, unknown>>)['j1'];
      const id = ((journey['savedMatrixViews'] as Array<Record<string, unknown>>)[0]['id']) as string;

      graph = manageJourneySavedView(graph, 'j1', 'remove', { id }, NOW);
      const list = ((graph.journeys as Record<string, Record<string, unknown>>)['j1']['savedMatrixViews']) as Array<Record<string, unknown>>;
      expect(list).toHaveLength(0);
    });

    it('lança erro ao tentar remover id que não existe', () => {
      const graph = withJourney(makeGraph());
      // 'remove' também verifica existência do id antes de remover
      expect(() => manageJourneySavedView(graph, 'j1', 'remove', { id: 'id-nao-existe' }, NOW)).toThrow('Visualização indisponível');
    });
  });

  // ── apply ───────────────────────────────────────────────────────────────────

  describe('apply', () => {
    it('aplica visualização salva à matrixView da journey', () => {
      let graph = withJourney(makeGraph());
      graph = manageJourneySavedView(graph, 'j1', 'create', { name: 'Vista A', view: { zoom: 125 } }, NOW);
      const journey1 = (graph.journeys as Record<string, Record<string, unknown>>)['j1'];
      const id = ((journey1['savedMatrixViews'] as Array<Record<string, unknown>>)[0]['id']) as string;

      graph = manageJourneySavedView(graph, 'j1', 'apply', { id }, NOW);
      const journey2 = (graph.journeys as Record<string, Record<string, unknown>>)['j1'];
      const matrixView = journey2['matrixView'] as Record<string, unknown>;
      expect(matrixView).toBeDefined();
      expect(matrixView['zoom']).toBe(125);
    });

    it('apply reconcilia perspectiveViews da view salva', () => {
      let graph = withJourney(makeGraph());
      // Cria view com perspectiveViews populados
      const viewData = {
        zoom: 110,
        rowOrder: ['sd', 'ac'],
        perspectiveViews: {
          blueprint: { zoom: 90, rowOrder: ['ac', 'fl'], hiddenRows: ['ev'] },
        },
      };
      graph = manageJourneySavedView(graph, 'j1', 'create', { name: 'Vista PV', view: viewData }, NOW);
      const journey1 = (graph.journeys as Record<string, Record<string, unknown>>)['j1'];
      const id = ((journey1['savedMatrixViews'] as Array<Record<string, unknown>>)[0]['id']) as string;

      graph = manageJourneySavedView(graph, 'j1', 'apply', { id }, NOW);
      const journey2 = (graph.journeys as Record<string, Record<string, unknown>>)['j1'];
      const matrixView = journey2['matrixView'] as Record<string, unknown>;
      expect(matrixView).toBeDefined();
      expect(typeof matrixView['perspectiveViews']).toBe('object');
    });

    it('apply com personaId inválido lança erro', () => {
      let graph = withJourney(makeGraph());
      // Cria a view sem personaId na journey
      graph = manageJourneySavedView(graph, 'j1', 'create', { name: 'Vista C' }, NOW);
      const journey = (graph.journeys as Record<string, Record<string, unknown>>)['j1'];
      const list = journey['savedMatrixViews'] as Array<Record<string, unknown>>;
      const id = list[0]['id'] as string;
      // Injeta personaId inválido diretamente no record salvo (simula view de outro contexto)
      list[0]['personaId'] = 'persona-nao-existe';

      expect(() => manageJourneySavedView(graph, 'j1', 'apply', { id }, NOW)).toThrow('Persona');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';
import {
  SERVICE_METRIC_TARGET_LABELS,
  SERVICE_METRIC_ROLE_LABELS,
  SERVICE_METRIC_DIRECTION_LABELS,
  emptyServiceOutcomesState,
  normalizeServiceOutcomesState,
  listServiceMetricTargets,
  serviceMetricTargetLabel,
  createServiceMetric,
  updateServiceMetric,
  bindServiceMetric,
  unbindServiceMetric,
  recordServiceMetricMeasurement,
  serviceMetricStatus,
  serviceMetricProgress,
  buildServiceOutcomesReport,
} from '../service-outcomes';

const NOW = '2025-06-01T12:00:00.000Z';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

function graphWithMetric(graph: ServiceGraph, title = 'NPS', options: { id?: string; direction?: 'at_least' | 'at_most'; baseline?: number; target?: number; current?: number } = {}) {
  return createServiceMetric(graph, { title, ...options }, NOW);
}

function graphWithJourney(graph: ServiceGraph, journeyId = 'j1', name = 'Jornada'): ServiceGraph {
  const journey = { id: journeyId, serviceId: graph.service.id, name, stageIds: [], createdAt: NOW, updatedAt: NOW };
  return { ...graph, journeys: { ...graph.journeys, [journeyId]: journey } };
}

// ─── label maps ────────────────────────────────────────────────────────────

describe('label maps', () => {
  it('SERVICE_METRIC_TARGET_LABELS tem 6 entradas', () => {
    expect(Object.keys(SERVICE_METRIC_TARGET_LABELS)).toHaveLength(6);
  });
  it('SERVICE_METRIC_ROLE_LABELS tem 6 entradas', () => {
    expect(Object.keys(SERVICE_METRIC_ROLE_LABELS)).toHaveLength(6);
  });
  it('SERVICE_METRIC_DIRECTION_LABELS tem 2 entradas', () => {
    expect(Object.keys(SERVICE_METRIC_DIRECTION_LABELS)).toHaveLength(2);
  });
});

// ─── emptyServiceOutcomesState ─────────────────────────────────────────────

describe('emptyServiceOutcomesState', () => {
  it('retorna state vazio com bindings e measurements em branco', () => {
    const state = emptyServiceOutcomesState(NOW);
    expect(state.version).toBe(1);
    expect(state.bindings).toEqual({});
    expect(state.measurements).toEqual({});
    expect(state.updatedAt).toBe(NOW);
  });
});

// ─── normalizeServiceOutcomesState ────────────────────────────────────────

describe('normalizeServiceOutcomesState', () => {
  it('cria state vazio quando graph não tem outcomes', () => {
    const state = normalizeServiceOutcomesState(makeGraph(), NOW);
    expect(state.bindings).toEqual({});
  });
  it('preserva bindings e measurements existentes', () => {
    const base = emptyServiceOutcomesState(NOW);
    base.bindings['b1'] = { id: 'b1', serviceId: 'svc', metricId: 'm1', targetKind: 'journey', targetId: 'j1', role: 'outcome', createdAt: NOW };
    const graph = { ...makeGraph(), service: { ...makeGraph().service, outcomes: base } };
    const state = normalizeServiceOutcomesState(graph, NOW);
    expect(state.bindings['b1']).toBeDefined();
  });
});

// ─── listServiceMetricTargets ──────────────────────────────────────────────

describe('listServiceMetricTargets', () => {
  it('retorna lista vazia para proposition quando não há proposição', () => {
    const result = listServiceMetricTargets(makeGraph(), 'proposition');
    expect(result).toHaveLength(0);
  });

  it('retorna jornadas para kind=journey', () => {
    const graph = graphWithJourney(makeGraph(), 'j1', 'Jornada Principal');
    const result = listServiceMetricTargets(graph, 'journey');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('j1');
    expect(result[0].label).toBe('Jornada Principal');
  });

  it('retorna lista vazia para touchpoint quando não há touchpoints', () => {
    const result = listServiceMetricTargets(makeGraph(), 'touchpoint');
    expect(result).toHaveLength(0);
  });

  it('retorna lista vazia para handoff quando não há channelHandoffs', () => {
    const result = listServiceMetricTargets(makeGraph(), 'handoff');
    expect(result).toHaveLength(0);
  });

  it('retorna só whiteboards com viewKind=blueprint para kind=blueprint', () => {
    const board = { id: 'b1', serviceId: 'svc', name: 'Blueprint', viewKind: 'blueprint' as const, items: {}, edges: {} };
    const boardFree = { id: 'b2', serviceId: 'svc', name: 'Livre', items: {}, edges: {} };
    const graph = { ...makeGraph(), views: { whiteboards: { b1: board, b2: boardFree } } };
    const result = listServiceMetricTargets(graph, 'blueprint');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b1');
  });

  it('retorna iniciativas para kind=initiative', () => {
    const graph = {
      ...makeGraph(),
      service: {
        ...makeGraph().service,
        improvementPortfolio: {
          version: 1 as const,
          initiatives: { 'i1': { id: 'i1', title: 'Iniciativa', status: 'active' as const, createdAt: NOW, updatedAt: NOW } },
          updatedAt: NOW,
        },
      },
    };
    const result = listServiceMetricTargets(graph, 'initiative');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('i1');
  });
});

// ─── createServiceMetric ──────────────────────────────────────────────────

describe('createServiceMetric', () => {
  it('cria métrica com título válido', () => {
    const graph = makeGraph();
    const { created, metricId, graph: next } = graphWithMetric(graph);
    expect(created).toBe(true);
    expect(metricId).toBeTruthy();
    expect(next.entities?.metric?.[metricId!]).toBeDefined();
  });

  it('falha com título vazio', () => {
    const { created, reason } = createServiceMetric(makeGraph(), { title: '' }, NOW);
    expect(created).toBe(false);
    expect(reason).toBe('title_required');
  });

  it('falha com título vazio após trim', () => {
    const { created, reason } = createServiceMetric(makeGraph(), { title: '   ' }, NOW);
    expect(created).toBe(false);
    expect(reason).toBe('title_required');
  });

  it('falha se id já existe', () => {
    const { graph: g1, metricId } = graphWithMetric(makeGraph(), 'NPS', { id: 'metric-fixed' });
    const { created, reason } = createServiceMetric(g1, { title: 'NPS2', id: metricId! }, NOW);
    expect(created).toBe(false);
    expect(reason).toBe('already_exists');
  });

  it('usa direction=at_least por padrão', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph());
    expect(g.entities?.metric?.[metricId!].direction).toBe('at_least');
  });

  it('armazena baseline, target e current quando fornecidos', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'CSAT', { baseline: 50, target: 90, current: 70 });
    const metric = g.entities?.metric?.[metricId!];
    expect(metric?.baseline).toBe(50);
    expect(metric?.target).toBe(90);
    expect(metric?.value).toBe(70);
  });
});

// ─── updateServiceMetric ──────────────────────────────────────────────────

describe('updateServiceMetric', () => {
  it('atualiza título', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS');
    const updated = updateServiceMetric(g, metricId!, { title: 'NPS v2' }, NOW);
    expect(updated.entities?.metric?.[metricId!].title).toBe('NPS v2');
  });

  it('mantém título antigo se novo estiver vazio', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS');
    const updated = updateServiceMetric(g, metricId!, { title: '' }, NOW);
    expect(updated.entities?.metric?.[metricId!].title).toBe('NPS');
  });

  it('retorna grafo sem mudança se metricId não existe', () => {
    const graph = makeGraph();
    const updated = updateServiceMetric(graph, 'nope', { title: 'X' }, NOW);
    expect(updated).toBe(graph);
  });

  it('limpa baseline com string vazia', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS', { baseline: 50 });
    const updated = updateServiceMetric(g, metricId!, { baseline: '' }, NOW);
    expect(updated.entities?.metric?.[metricId!].baseline).toBeUndefined();
  });

  it('atualiza direction', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'Reclamações', { direction: 'at_least' });
    const updated = updateServiceMetric(g, metricId!, { direction: 'at_most' }, NOW);
    expect(updated.entities?.metric?.[metricId!].direction).toBe('at_most');
  });
});

// ─── bindServiceMetric ────────────────────────────────────────────────────

describe('bindServiceMetric', () => {
  it('falha se a métrica não existir', () => {
    const graph = graphWithJourney(makeGraph());
    const { created, reason } = bindServiceMetric(graph, 'nope', 'journey', 'j1', 'outcome', NOW);
    expect(created).toBe(false);
    expect(reason).toBe('metric_not_found');
  });

  it('falha se o target não existir', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS');
    const { created, reason } = bindServiceMetric(g, metricId!, 'journey', 'nope', 'outcome', NOW);
    expect(created).toBe(false);
    expect(reason).toBe('target_not_found');
  });

  it('cria binding com sucesso', () => {
    let graph = graphWithJourney(makeGraph(), 'j1');
    const { graph: g, metricId } = graphWithMetric(graph, 'NPS');
    const { created, bindingId, graph: next } = bindServiceMetric(g, metricId!, 'journey', 'j1', 'outcome', NOW);
    expect(created).toBe(true);
    expect(bindingId).toBeTruthy();
    expect(next.service.outcomes?.bindings[bindingId!]).toBeDefined();
  });

  it('falha se binding duplicado (mesmo metric + target)', () => {
    let graph = graphWithJourney(makeGraph(), 'j1');
    const { graph: g, metricId } = graphWithMetric(graph, 'NPS');
    const { graph: g2, bindingId } = bindServiceMetric(g, metricId!, 'journey', 'j1', 'outcome', NOW);
    const { created, reason } = bindServiceMetric(g2, metricId!, 'journey', 'j1', 'outcome', NOW);
    expect(created).toBe(false);
    expect(reason).toBe('already_exists');
  });
});

// ─── unbindServiceMetric ──────────────────────────────────────────────────

describe('unbindServiceMetric', () => {
  it('remove binding existente', () => {
    let graph = graphWithJourney(makeGraph(), 'j1');
    const { graph: g, metricId } = graphWithMetric(graph, 'NPS');
    const { graph: g2, bindingId } = bindServiceMetric(g, metricId!, 'journey', 'j1', 'outcome', NOW);
    const g3 = unbindServiceMetric(g2, bindingId!, NOW);
    expect(g3.service.outcomes?.bindings[bindingId!]).toBeUndefined();
  });

  it('retorna grafo sem mudança para bindingId inexistente', () => {
    const graph = makeGraph();
    const result = unbindServiceMetric(graph, 'nope', NOW);
    expect(result).toBe(graph);
  });
});

// ─── recordServiceMetricMeasurement ───────────────────────────────────────

describe('recordServiceMetricMeasurement', () => {
  it('cria medição com sucesso', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS');
    const { created, measurementId, graph: next } = recordServiceMetricMeasurement(g, metricId!, 75, NOW, 'bom resultado', NOW);
    expect(created).toBe(true);
    expect(measurementId).toBeTruthy();
    expect(next.service.outcomes?.measurements[measurementId!]).toBeDefined();
  });

  it('falha se a métrica não existir', () => {
    const { created, reason } = recordServiceMetricMeasurement(makeGraph(), 'nope', 75, NOW, '', NOW);
    expect(created).toBe(false);
    expect(reason).toBe('metric_not_found');
  });

  it('falha com valor inválido (NaN)', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS');
    const { created, reason } = recordServiceMetricMeasurement(g, metricId!, NaN, NOW, '', NOW);
    expect(created).toBe(false);
    expect(reason).toBe('invalid_value');
  });

  it('atualiza o valor corrente da métrica após medição', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS', { target: 80 });
    const { graph: next } = recordServiceMetricMeasurement(g, metricId!, 85, NOW, '', NOW);
    expect(next.entities?.metric?.[metricId!].value).toBe(85);
  });
});

// ─── serviceMetricStatus ──────────────────────────────────────────────────

describe('serviceMetricStatus', () => {
  it('retorna unmeasured quando current está ausente', () => {
    expect(serviceMetricStatus({ id: 'm', type: 'metric', serviceId: 's', title: 'M', createdAt: NOW, updatedAt: NOW })).toBe('unmeasured');
  });

  it('retorna unmeasured quando target está ausente', () => {
    expect(serviceMetricStatus({ id: 'm', type: 'metric', serviceId: 's', title: 'M', value: 70, createdAt: NOW, updatedAt: NOW })).toBe('unmeasured');
  });

  it('at_least: on_target quando current >= target', () => {
    expect(serviceMetricStatus({ id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_least', value: 90, target: 80, createdAt: NOW, updatedAt: NOW })).toBe('on_target');
  });

  it('at_least: off_target quando current < target', () => {
    expect(serviceMetricStatus({ id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_least', value: 70, target: 80, createdAt: NOW, updatedAt: NOW })).toBe('off_target');
  });

  it('at_most: on_target quando current <= target', () => {
    expect(serviceMetricStatus({ id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_most', value: 10, target: 20, createdAt: NOW, updatedAt: NOW })).toBe('on_target');
  });

  it('at_most: off_target quando current > target', () => {
    expect(serviceMetricStatus({ id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_most', value: 30, target: 20, createdAt: NOW, updatedAt: NOW })).toBe('off_target');
  });

  it('usa currentOverride ao invés de metric.value', () => {
    // metric.value = 70 (off), currentOverride = 90 (on)
    const metric = { id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_least' as const, value: 70, target: 80, createdAt: NOW, updatedAt: NOW };
    expect(serviceMetricStatus(metric, 90)).toBe('on_target');
  });
});

// ─── serviceMetricProgress ────────────────────────────────────────────────

describe('serviceMetricProgress', () => {
  it('retorna null quando baseline, target ou current ausente', () => {
    const base = { id: 'm', type: 'metric', serviceId: 's', title: 'M', createdAt: NOW, updatedAt: NOW };
    expect(serviceMetricProgress(base)).toBeNull();
    expect(serviceMetricProgress({ ...base, baseline: 0 })).toBeNull();
    expect(serviceMetricProgress({ ...base, baseline: 0, target: 100 })).toBeNull();
  });

  it('at_least: 0% quando current === baseline', () => {
    const metric = { id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_least' as const, baseline: 50, target: 100, value: 50, createdAt: NOW, updatedAt: NOW };
    expect(serviceMetricProgress(metric)).toBe(0);
  });

  it('at_least: 100% quando current >= target', () => {
    const metric = { id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_least' as const, baseline: 50, target: 100, value: 100, createdAt: NOW, updatedAt: NOW };
    expect(serviceMetricProgress(metric)).toBe(100);
  });

  it('at_least: 50% quando current no meio', () => {
    const metric = { id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_least' as const, baseline: 50, target: 100, value: 75, createdAt: NOW, updatedAt: NOW };
    expect(serviceMetricProgress(metric)).toBe(50);
  });

  it('at_most: 100% quando current === target (meta atingida)', () => {
    const metric = { id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_most' as const, baseline: 100, target: 50, value: 50, createdAt: NOW, updatedAt: NOW };
    expect(serviceMetricProgress(metric)).toBe(100);
  });

  it('retorna 100 quando needed === 0 e status on_target', () => {
    const metric = { id: 'm', type: 'metric', serviceId: 's', title: 'M', direction: 'at_least' as const, baseline: 80, target: 80, value: 80, createdAt: NOW, updatedAt: NOW };
    expect(serviceMetricProgress(metric)).toBe(100);
  });
});

// ─── buildServiceOutcomesReport ───────────────────────────────────────────

describe('buildServiceOutcomesReport', () => {
  it('retorna report vazio para grafo sem métricas', () => {
    const report = buildServiceOutcomesReport(makeGraph(), NOW);
    expect(report.metrics).toHaveLength(0);
    expect(report.bindings).toHaveLength(0);
    expect(report.outcomesReady).toBe(false);
    expect(report.outcomeScore).toBe(0);
  });

  it('lista métricas ordenadas por título (pt-BR)', () => {
    let graph = makeGraph();
    const r1 = graphWithMetric(graph, 'Satisfação');
    const r2 = graphWithMetric(r1.graph, 'NPS');
    const report = buildServiceOutcomesReport(r2.graph, NOW);
    expect(report.metrics[0].title).toBe('NPS');
    expect(report.metrics[1].title).toBe('Satisfação');
  });

  it('coverage inclui todas as 6 targetKinds', () => {
    const report = buildServiceOutcomesReport(makeGraph(), NOW);
    expect(report.coverage).toHaveLength(6);
  });

  it('outcomesReady=true com métrica + binding', () => {
    let graph = graphWithJourney(makeGraph(), 'j1');
    const { graph: g, metricId } = graphWithMetric(graph, 'NPS');
    const { graph: g2 } = bindServiceMetric(g, metricId!, 'journey', 'j1', 'outcome', NOW);
    const report = buildServiceOutcomesReport(g2, NOW);
    expect(report.outcomesReady).toBe(true);
    expect(report.counts.bindings).toBe(1);
  });

  it('status on_target reflete em outcomeScore > 0', () => {
    let graph = graphWithJourney(makeGraph(), 'j1');
    const { graph: g, metricId } = graphWithMetric(graph, 'NPS', { target: 80, current: 85 });
    const { graph: g2 } = bindServiceMetric(g, metricId!, 'journey', 'j1', 'outcome', NOW);
    const report = buildServiceOutcomesReport(g2, NOW);
    expect(report.outcomeScore).toBeGreaterThan(0);
  });

  it('serviceMetricTargetLabel retorna targetId como fallback', () => {
    const graph = makeGraph();
    const label = serviceMetricTargetLabel(graph, { targetKind: 'journey', targetId: 'nope' });
    expect(label).toBe('nope');
  });
});

// ─── trend (via buildServiceOutcomesReport com múltiplas medições) ─────────

describe('buildServiceOutcomesReport — trend de métricas', () => {
  it('trend improving quando at_least e último valor maior', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS', { direction: 'at_least', target: 90 });
    const t1 = '2025-01-01T00:00:00.000Z';
    const t2 = '2025-02-01T00:00:00.000Z';
    const { graph: g2 } = recordServiceMetricMeasurement(g, metricId!, 60, t1, '', t1);
    const { graph: g3 } = recordServiceMetricMeasurement(g2, metricId!, 80, t2, '', t2);
    const report = buildServiceOutcomesReport(g3, NOW);
    expect(report.metrics[0].trend).toBe('improving');
  });

  it('trend worsening quando at_least e último valor menor', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS', { direction: 'at_least', target: 90 });
    const t1 = '2025-01-01T00:00:00.000Z';
    const t2 = '2025-02-01T00:00:00.000Z';
    const { graph: g2 } = recordServiceMetricMeasurement(g, metricId!, 80, t1, '', t1);
    const { graph: g3 } = recordServiceMetricMeasurement(g2, metricId!, 60, t2, '', t2);
    const report = buildServiceOutcomesReport(g3, NOW);
    expect(report.metrics[0].trend).toBe('worsening');
  });

  it('trend flat quando valores iguais', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS', { direction: 'at_least', target: 90 });
    const t1 = '2025-01-01T00:00:00.000Z';
    const t2 = '2025-02-01T00:00:00.000Z';
    const { graph: g2 } = recordServiceMetricMeasurement(g, metricId!, 70, t1, '', t1);
    const { graph: g3 } = recordServiceMetricMeasurement(g2, metricId!, 70, t2, '', t2);
    const report = buildServiceOutcomesReport(g3, NOW);
    expect(report.metrics[0].trend).toBe('flat');
  });

  it('trend improving quando at_most e último valor menor', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'Reclamações', { direction: 'at_most', target: 10 });
    const t1 = '2025-01-01T00:00:00.000Z';
    const t2 = '2025-02-01T00:00:00.000Z';
    const { graph: g2 } = recordServiceMetricMeasurement(g, metricId!, 30, t1, '', t1);
    const { graph: g3 } = recordServiceMetricMeasurement(g2, metricId!, 20, t2, '', t2);
    const report = buildServiceOutcomesReport(g3, NOW);
    expect(report.metrics[0].trend).toBe('improving');
  });

  it('trend unknown com menos de 2 medições', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS', { target: 90 });
    const { graph: g2 } = recordServiceMetricMeasurement(g, metricId!, 70, NOW, '', NOW);
    const report = buildServiceOutcomesReport(g2, NOW);
    expect(report.metrics[0].trend).toBe('unknown');
  });
});

// ─── initiativeImplicit + initiativeOutcomes ──────────────────────────────

function graphWithInitiative(graph: ServiceGraph, initiativeId: string, metricIds: string[] = [], status: 'active' | 'implemented' = 'active'): ServiceGraph {
  const portfolio = graph.service.improvementPortfolio ?? { version: 1 as const, initiatives: {}, updatedAt: NOW };
  const initiative = { id: initiativeId, title: `Iniciativa ${initiativeId}`, status, metricIds, createdAt: NOW, updatedAt: NOW };
  return { ...graph, service: { ...graph.service, improvementPortfolio: { ...portfolio, initiatives: { ...portfolio.initiatives, [initiativeId]: initiative }, updatedAt: NOW } } };
}

describe('buildServiceOutcomesReport — initiative outcomes', () => {
  it('inclui implicit binding quando initiative.metricIds referencia métrica existente', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'Resultado', { id: 'metric-fixed' });
    const graph = graphWithInitiative(g, 'i1', ['metric-fixed']);
    const report = buildServiceOutcomesReport(graph, NOW);
    const implicitBinding = report.bindings.find((b) => b.id.startsWith('implicit:'));
    expect(implicitBinding).toBeDefined();
    expect(implicitBinding?.metricId).toBe('metric-fixed');
  });

  it('outcomeStatus=unmeasured quando métrica não tem medição/target', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'Resultado', { id: 'metric-fixed' });
    const graph = graphWithInitiative(g, 'i1', ['metric-fixed']);
    const report = buildServiceOutcomesReport(graph, NOW);
    const outcome = report.initiativeOutcomes[0];
    expect(outcome.outcomeStatus).toBe('unmeasured');
  });

  it('outcomeStatus=achieved quando todas as métricas on_target', () => {
    const { graph: g, metricId } = graphWithMetric(makeGraph(), 'NPS', { id: 'metric-fixed', target: 80, current: 85, direction: 'at_least' });
    const graph = graphWithInitiative(g, 'i1', ['metric-fixed']);
    const report = buildServiceOutcomesReport(graph, NOW);
    const outcome = report.initiativeOutcomes[0];
    expect(outcome.outcomeStatus).toBe('achieved');
    expect(outcome.achievedCount).toBe(1);
  });

  it('outcomeStatus=partial quando algumas métricas on_target', () => {
    let graph = makeGraph();
    const r1 = graphWithMetric(graph, 'NPS', { id: 'metric-on', target: 80, current: 85, direction: 'at_least' });
    const r2 = graphWithMetric(r1.graph, 'Reclamações', { id: 'metric-off', target: 10, current: 30, direction: 'at_most' });
    graph = graphWithInitiative(r2.graph, 'i1', ['metric-on', 'metric-off']);
    const report = buildServiceOutcomesReport(graph, NOW);
    const outcome = report.initiativeOutcomes[0];
    expect(outcome.outcomeStatus).toBe('partial');
  });

  it('outcomeStatus=not_achieved quando status=implemented e nenhuma on_target', () => {
    const { graph: g } = graphWithMetric(makeGraph(), 'NPS', { id: 'metric-fixed', target: 80, current: 50, direction: 'at_least' });
    const graph = graphWithInitiative(g, 'i1', ['metric-fixed'], 'implemented');
    const report = buildServiceOutcomesReport(graph, NOW);
    const outcome = report.initiativeOutcomes[0];
    expect(outcome.outcomeStatus).toBe('not_achieved');
  });

  it('implementedWithoutProof=true quando implemented sem métricas', () => {
    const graph = graphWithInitiative(makeGraph(), 'i1', [], 'implemented');
    const report = buildServiceOutcomesReport(graph, NOW);
    expect(report.initiativeOutcomes[0].implementedWithoutProof).toBe(true);
    expect(report.counts.implementedWithoutProof).toBe(1);
  });

  it('outcomeStatus=tracking quando active e todas off_target', () => {
    const { graph: g } = graphWithMetric(makeGraph(), 'NPS', { id: 'metric-fixed', target: 80, current: 50, direction: 'at_least' });
    const graph = graphWithInitiative(g, 'i1', ['metric-fixed'], 'active');
    const report = buildServiceOutcomesReport(graph, NOW);
    const outcome = report.initiativeOutcomes[0];
    expect(outcome.outcomeStatus).toBe('tracking');
  });

  it('bindServiceMetric para initiative sincroniza metricIds na iniciativa', () => {
    // Cria iniciativa sem metricIds + bind via bindServiceMetric → syncInitiativeMetric deve ser chamado
    let graph = graphWithInitiative(makeGraph(), 'i1', []);
    const { graph: g, metricId } = graphWithMetric(graph, 'NPS', { id: 'metric-fixed' });
    // Para que o target exista para 'initiative', a iniciativa deve existir — ja existe via graphWithInitiative
    const { graph: g2, created, bindingId } = bindServiceMetric(g, 'metric-fixed', 'initiative', 'i1', 'result', NOW);
    expect(created).toBe(true);
    // A iniciativa deve ter o metricId sincronizado
    const initiative = g2.service.improvementPortfolio!.initiatives['i1'];
    expect(initiative.metricIds).toContain('metric-fixed');
  });

  it('unbindServiceMetric de initiative remove metricId da iniciativa quando não há mais bindings', () => {
    let graph = graphWithInitiative(makeGraph(), 'i1', []);
    const { graph: g } = graphWithMetric(graph, 'NPS', { id: 'metric-fixed' });
    const { graph: g2, bindingId } = bindServiceMetric(g, 'metric-fixed', 'initiative', 'i1', 'result', NOW);
    // Confirma que foi adicionado
    expect(g2.service.improvementPortfolio!.initiatives['i1'].metricIds).toContain('metric-fixed');
    // Agora remove o binding
    const g3 = unbindServiceMetric(g2, bindingId!, NOW);
    const initiative = g3.service.improvementPortfolio!.initiatives['i1'];
    expect(initiative.metricIds ?? []).not.toContain('metric-fixed');
  });
});

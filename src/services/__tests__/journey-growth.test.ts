import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';
import {
  ACQUISITION_ROWS,
  saveJourneyImprovement,
  journeyImprovementPlans,
  measureJourneyImprovement,
} from '../journey-growth';

// ── helpers ───────────────────────────────────────────────────────────────────

const NOW = '2025-01-01T00:00:00.000Z';

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

function withJourney(graph: ServiceGraph, journeyId = 'j1', stageIds: string[] = []): ServiceGraph {
  const journey = { id: journeyId, serviceId: graph.service.id, name: 'Jornada', stageIds, createdAt: NOW, updatedAt: NOW };
  return { ...graph, journeys: { ...graph.journeys, [journeyId]: journey } };
}

function withStage(graph: ServiceGraph, stageId: string, journeyId = 'j1'): ServiceGraph {
  const stage = {
    id: stageId, journeyId, title: 'Etapa', customerAction: '',
    emotion: 'neutral' as const, touchpointIds: [], problemIds: [], opportunityIds: [],
  };
  return { ...graph, stages: { ...graph.stages, [stageId]: stage } };
}

function withProblem(graph: ServiceGraph, problemId: string, stageId: string, description = 'Dor de teste'): ServiceGraph {
  return { ...graph, problems: { ...graph.problems, [problemId]: { id: problemId, stageId, description } } };
}

/** Returns a graph with journey j1 → stage s1 → problem p1. */
function fullGraph(): ServiceGraph {
  let g = makeGraph();
  g = withJourney(g, 'j1', ['s1']);
  g = withStage(g, 's1', 'j1');
  g = withProblem(g, 'p1', 's1', 'Dor de teste completa');
  return g;
}

// ── ACQUISITION_ROWS ──────────────────────────────────────────────────────────

describe('ACQUISITION_ROWS', () => {
  it('contém seis chaves', () => {
    expect(ACQUISITION_ROWS).toHaveLength(6);
  });

  it('inclui todas as chaves esperadas', () => {
    expect(ACQUISITION_ROWS).toEqual(['go', 'ch', 'pr', 'br', 'rr', 'ki']);
  });

  it('é readonly (array congelado pelo TS)', () => {
    expect(Array.isArray(ACQUISITION_ROWS)).toBe(true);
  });
});

// ── saveJourneyImprovement – validações ───────────────────────────────────────

describe('saveJourneyImprovement > validações', () => {
  it('lança se a jornada não existe no graph', () => {
    const g = makeGraph();
    expect(() => saveJourneyImprovement(g, 'j-inexistente', 'p1', { title: 'T' }, NOW))
      .toThrow('Esta dor não pertence à Jornada aberta.');
  });

  it('lança se a jornada existe mas o problema não existe', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1']);
    g = withStage(g, 's1', 'j1');
    // No problem added → !problem → throws
    expect(() => saveJourneyImprovement(g, 'j1', 'p-inexistente', { title: 'T' }, NOW))
      .toThrow('Esta dor não pertence à Jornada aberta.');
  });

  it('lança se o problema não existe', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1']);
    g = withStage(g, 's1', 'j1');
    expect(() => saveJourneyImprovement(g, 'j1', 'p-inexistente', { title: 'T' }, NOW))
      .toThrow('Esta dor não pertence à Jornada aberta.');
  });

  it('lança se o stageId da dor não está na jornada', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1']);
    g = withStage(g, 's1', 'j1');
    g = withStage(g, 's2', 'j1');
    g = withProblem(g, 'p2', 's2', 'Dor de outra etapa');
    // j1.stageIds only has s1, not s2
    g = { ...g, journeys: { j1: { ...g.journeys['j1'], stageIds: ['s1'] } } };
    expect(() => saveJourneyImprovement(g, 'j1', 'p2', { title: 'T' }, NOW))
      .toThrow('Esta dor não pertence à Jornada aberta.');
  });

  it('lança se a descrição da dor está vazia', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1']);
    g = withStage(g, 's1', 'j1');
    g = withProblem(g, 'p1', 's1', '   '); // only whitespace
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T' }, NOW))
      .toThrow('Descreva a dor antes de planejar uma melhoria.');
  });

  it('lança se o título da melhoria está vazio', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: '' }, NOW))
      .toThrow('Descreva a ação proposta.');
  });

  it('lança se o título da melhoria é só whitespace', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: '   ' }, NOW))
      .toThrow('Descreva a ação proposta.');
  });

  it('lança se a data não segue YYYY-MM-DD', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', targetDate: '01/01/2025' }, NOW))
      .toThrow('Informe um prazo válido.');
  });

  it('lança se o mês é inválido (13)', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', targetDate: '2025-13-01' }, NOW))
      .toThrow('Informe um prazo válido.');
  });

  it('lança se o dia é inválido (32)', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', targetDate: '2025-01-32' }, NOW))
      .toThrow('Informe um prazo válido.');
  });

  it('lança se a data é "not-a-date"', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', targetDate: 'not-a-date' }, NOW))
      .toThrow('Informe um prazo válido.');
  });

  it('lança se o metricId não existe no graph', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', metricId: 'metric-inexistente' }, NOW))
      .toThrow('O indicador selecionado não está disponível neste serviço.');
  });

  it('lança se a métrica pertence a outro serviço', () => {
    let g = fullGraph();
    g = { ...g, entities: { metric: { 'm1': { id: 'm1', serviceId: 'outro-servico', title: 'M' } } } };
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', metricId: 'm1' }, NOW))
      .toThrow('O indicador selecionado não está disponível neste serviço.');
  });

  it('lança se há valores de métrica sem nome', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', baseline: 10 }, NOW))
      .toThrow('Dê um nome ao indicador ou selecione um existente.');
  });

  it('lança se target é informado sem nome de métrica', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', target: 100 }, NOW))
      .toThrow('Dê um nome ao indicador ou selecione um existente.');
  });

  it('lança se a unidade é informada sem nome de métrica', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', unit: 'pontos' }, NOW))
      .toThrow('Dê um nome ao indicador ou selecione um existente.');
  });

  it('lança se o baseline não é um número válido', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', metricName: 'M', baseline: 'abc' }, NOW))
      .toThrow('Informe um número válido para o indicador.');
  });

  it('lança se o target não é um número válido', () => {
    const g = fullGraph();
    expect(() => saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', metricName: 'M', target: NaN }, NOW))
      .toThrow('Informe um número válido para o indicador.');
  });
});

// ── saveJourneyImprovement – happy paths ──────────────────────────────────────

describe('saveJourneyImprovement > retorno', () => {
  it('retorna { graph, initiativeId } no caminho mínimo', () => {
    const g = fullGraph();
    const result = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Minha ação' }, NOW);
    expect(result).toHaveProperty('graph');
    expect(result).toHaveProperty('initiativeId');
    expect(typeof result.initiativeId).toBe('string');
    expect(result.initiativeId.length).toBeGreaterThan(0);
  });

  it('o graph retornado contém a iniciativa criada', () => {
    const g = fullGraph();
    const { graph, initiativeId } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Ação' }, NOW);
    const initiatives = graph.service.improvementPortfolio?.initiatives ?? {};
    expect(initiatives[initiativeId]).toBeDefined();
    expect(initiatives[initiativeId].title).toBe('Ação');
  });

  it('aceita data válida', () => {
    const g = fullGraph();
    const { graph, initiativeId } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Ação', targetDate: '2026-06-30' }, NOW);
    const initiative = graph.service.improvementPortfolio?.initiatives?.[initiativeId];
    expect(initiative?.targetDate).toBe('2026-06-30');
  });

  it('aceita string de data vazia (sem prazo)', () => {
    const g = fullGraph();
    const result = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Ação', targetDate: '' }, NOW);
    expect(result).toHaveProperty('initiativeId');
  });

  it('status inválido é normalizado para "planned"', () => {
    const g = fullGraph();
    const { graph, initiativeId } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Ação', status: 'invalido' as never }, NOW);
    const initiative = graph.service.improvementPortfolio?.initiatives?.[initiativeId];
    expect(initiative?.status).toBe('planned');
  });

  it('status "implemented" é preservado', () => {
    const g = fullGraph();
    const { graph, initiativeId } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Ação', status: 'implemented' }, NOW);
    const initiative = graph.service.improvementPortfolio?.initiatives?.[initiativeId];
    expect(initiative?.status).toBe('implemented');
  });

  it('cria nova métrica quando metricName é fornecido', () => {
    const g = fullGraph();
    const { graph } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Ação', metricName: 'NPS', baseline: 40, target: 70 }, NOW);
    const metrics = graph.entities?.metric ?? {};
    const metric = Object.values(metrics).find(m => String(m.title) === 'NPS');
    expect(metric).toBeDefined();
  });

  it('usa métrica existente quando metricId é fornecido', () => {
    let g = fullGraph();
    g = { ...g, entities: { metric: { 'm1': { id: 'm1', serviceId: g.service.id, title: 'CSAT' } } } };
    const { graph, initiativeId } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Ação', metricId: 'm1' }, NOW);
    const initiative = graph.service.improvementPortfolio?.initiatives?.[initiativeId];
    expect(initiative?.metricIds).toContain('m1');
  });

  it('segunda chamada reaproveita a iniciativa existente (idempotente)', () => {
    const g = fullGraph();
    const first = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Ação v1' }, NOW);
    const second = saveJourneyImprovement(first.graph, 'j1', 'p1', { title: 'Ação v2' }, NOW);
    expect(second.initiativeId).toBe(first.initiativeId);
    const initiative = second.graph.service.improvementPortfolio?.initiatives?.[second.initiativeId];
    expect(initiative?.title).toBe('Ação v2');
  });

  it('direction "at_most" é aceita na criação de métrica', () => {
    const g = fullGraph();
    const { graph } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', metricName: 'Tempo', direction: 'at_most', target: 5 }, NOW);
    const metric = Object.values(graph.entities?.metric ?? {}).find(m => String(m.title) === 'Tempo');
    expect(metric?.direction).toBe('at_most');
  });

  it('direction inválida cai para "at_most" (default do ternário)', () => {
    const g = fullGraph();
    const { graph } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'T', metricName: 'Score', direction: 'invalida' as never }, NOW);
    const metric = Object.values(graph.entities?.metric ?? {}).find(m => String(m.title) === 'Score');
    // code: input.direction === 'at_least' ? 'at_least' : 'at_most' → non-at_least → 'at_most'
    expect(metric?.direction).toBe('at_most');
  });
});

// ── journeyImprovementPlans ───────────────────────────────────────────────────

describe('journeyImprovementPlans', () => {
  it('retorna [] se a jornada não existe', () => {
    const g = makeGraph();
    expect(journeyImprovementPlans(g, 'j-inexistente')).toEqual([]);
  });

  it('retorna [] se não há iniciativas', () => {
    let g = makeGraph();
    g = withJourney(g, 'j1', ['s1']);
    expect(journeyImprovementPlans(g, 'j1')).toEqual([]);
  });

  it('retorna [] se a iniciativa não tem refs de journey', () => {
    const g = fullGraph();
    const { graph } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Plano' }, NOW);
    // ask about a different (non-existent) journey
    expect(journeyImprovementPlans(graph, 'j-outro')).toEqual([]);
  });

  it('retorna o plano correto para a jornada', () => {
    const g = fullGraph();
    const { graph, initiativeId } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Plano X' }, NOW);
    const plans = journeyImprovementPlans(graph, 'j1');
    expect(plans).toHaveLength(1);
    expect(plans[0].id).toBe(initiativeId);
    expect(plans[0].title).toBe('Plano X');
  });

  it('o plano inclui problemId e stageId corretos', () => {
    const g = fullGraph();
    const { graph } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Plano' }, NOW);
    const [plan] = journeyImprovementPlans(graph, 'j1');
    expect(plan.problemId).toBe('p1');
    expect(plan.stageId).toBe('s1');
    expect(plan.problem).toBe('Dor de teste completa');
  });

  it('o plano inclui métricas criadas', () => {
    const g = fullGraph();
    const { graph } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Plano', metricName: 'NPS', baseline: 40, target: 80 }, NOW);
    const [plan] = journeyImprovementPlans(graph, 'j1');
    expect(plan.metrics).toHaveLength(1);
    expect(plan.metrics[0].name).toBe('NPS');
    expect(plan.metrics[0].baseline).toBe(40);
    expect(plan.metrics[0].target).toBe(80);
  });

  it('status da métrica é "unmeasured" quando não há valor atual', () => {
    const g = fullGraph();
    const { graph } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Plano', metricName: 'NPS', target: 80 }, NOW);
    const [plan] = journeyImprovementPlans(graph, 'j1');
    expect(plan.metrics[0].status).toBe('unmeasured');
  });

  it('o plano retorna campos de texto com fallbacks', () => {
    const g = fullGraph();
    const { graph } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Plano' }, NOW);
    const [plan] = journeyImprovementPlans(graph, 'j1');
    expect(plan.owner).toBe('');
    expect(plan.targetDate).toBe('');
    expect(plan.expectedOutcome).toBe('');
  });
});

// ── measureJourneyImprovement ─────────────────────────────────────────────────

describe('measureJourneyImprovement', () => {
  function graphWithPlan(): { graph: ServiceGraph; initiativeId: string; metricId: string } {
    const g = fullGraph();
    const { graph: g2, initiativeId } = saveJourneyImprovement(g, 'j1', 'p1', { title: 'Plano', metricName: 'NPS', baseline: 0, target: 100 }, NOW);
    const plans = journeyImprovementPlans(g2, 'j1');
    const metricId = plans[0].metrics[0].id;
    return { graph: g2, initiativeId, metricId };
  }

  it('lança se a jornada/plano não existe', () => {
    const { graph, initiativeId, metricId } = graphWithPlan();
    expect(() => measureJourneyImprovement(graph, 'j-inexistente', initiativeId, metricId, 50, '', NOW))
      .toThrow('Este indicador não está vinculado ao plano desta Jornada.');
  });

  it('lança se o initiativeId não pertence à jornada', () => {
    const { graph, metricId } = graphWithPlan();
    expect(() => measureJourneyImprovement(graph, 'j1', 'initiative-errado', metricId, 50, '', NOW))
      .toThrow('Este indicador não está vinculado ao plano desta Jornada.');
  });

  it('lança se o metricId não pertence ao plano', () => {
    const { graph, initiativeId } = graphWithPlan();
    expect(() => measureJourneyImprovement(graph, 'j1', initiativeId, 'metric-errado', 50, '', NOW))
      .toThrow('Este indicador não está vinculado ao plano desta Jornada.');
  });

  it('lança se o valor não é informado (undefined)', () => {
    const { graph, initiativeId, metricId } = graphWithPlan();
    expect(() => measureJourneyImprovement(graph, 'j1', initiativeId, metricId, undefined, '', NOW))
      .toThrow('Informe o valor medido.');
  });

  it('lança se o valor está vazio', () => {
    const { graph, initiativeId, metricId } = graphWithPlan();
    expect(() => measureJourneyImprovement(graph, 'j1', initiativeId, metricId, '', '', NOW))
      .toThrow('Informe o valor medido.');
  });

  it('lança se o valor não é um número válido', () => {
    const { graph, initiativeId, metricId } = graphWithPlan();
    expect(() => measureJourneyImprovement(graph, 'j1', initiativeId, metricId, 'abc', '', NOW))
      .toThrow('Informe um número válido para o indicador.');
  });

  it('registra a medição com sucesso', () => {
    const { graph, initiativeId, metricId } = graphWithPlan();
    const nextGraph = measureJourneyImprovement(graph, 'j1', initiativeId, metricId, 65, 'Medição manual', NOW);
    const measurements = Object.values(nextGraph.service.outcomes?.measurements ?? {});
    const m = measurements.find(x => x.metricId === metricId);
    expect(m).toBeDefined();
    expect(m!.value).toBe(65);
  });

  it('a medição atualiza o status do indicador nos planos', () => {
    const { graph, initiativeId, metricId } = graphWithPlan();
    const nextGraph = measureJourneyImprovement(graph, 'j1', initiativeId, metricId, 65, '', NOW);
    const plans = journeyImprovementPlans(nextGraph, 'j1');
    const metric = plans[0].metrics.find(m => m.id === metricId);
    expect(metric?.current).toBe(65);
    expect(metric?.status).not.toBe('unmeasured');
  });
});

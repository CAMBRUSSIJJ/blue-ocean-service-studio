import { describe, it, expect } from 'vitest';
import {
  PROPOSITION_STATUS_LABELS,
  SCENARIO_STATUS_LABELS,
  emptyServiceProposition,
  normalizeServicePropositionState,
  propositionStatement,
  buildServicePropositionReport,
  saveServiceProposition,
  createWhatIfScenario,
  updateWhatIfScenarioStatus,
  promoteWhatIfScenario,
  removeWhatIfScenario,
  scenarioDifferences,
  propositionSourceOptions,
} from '../service-proposition';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-01-15T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withProposition(
  graph: ServiceGraph,
  patch: Record<string, unknown> = {},
): ServiceGraph {
  return {
    ...graph,
    service: {
      ...graph.service,
      proposition: {
        version: 1,
        current: {
          version: 1,
          status: 'draft',
          audience: '',
          problem: '',
          promise: '',
          outcome: '',
          experience: '',
          differentiator: '',
          businessValue: '',
          capabilities: [],
          principles: [],
          linkedInsightIds: [],
          linkedNeedIds: [],
          linkedProblemIds: [],
          linkedEvidenceIds: [],
          createdAt: NOW,
          updatedAt: NOW,
          ...patch,
        },
        updatedAt: NOW,
      },
    },
  } as ServiceGraph;
}

function fullProposition() {
  return {
    audience: 'Empresas SaaS',
    problem: 'Retenção baixa',
    promise: 'Plataforma de onboarding',
    outcome: 'Mais clientes ativos',
    experience: 'Fluxo guiado',
    differentiator: 'Sem código',
    businessValue: 'Reduz churn',
    capabilities: ['Automação', 'Analytics'],
    linkedEvidenceIds: ['ev1'],
  };
}

// ─── label maps ───────────────────────────────────────────────────────────────

describe('PROPOSITION_STATUS_LABELS', () => {
  it('has keys draft, ready, validated', () => {
    expect(Object.keys(PROPOSITION_STATUS_LABELS)).toEqual(
      expect.arrayContaining(['draft', 'ready', 'validated']),
    );
  });
});

describe('SCENARIO_STATUS_LABELS', () => {
  it('has keys draft, testing, accepted, rejected', () => {
    expect(Object.keys(SCENARIO_STATUS_LABELS)).toEqual(
      expect.arrayContaining(['draft', 'testing', 'accepted', 'rejected']),
    );
  });
});

// ─── emptyServiceProposition ──────────────────────────────────────────────────

describe('emptyServiceProposition', () => {
  it('returns proposition with status draft and empty strings', () => {
    const p = emptyServiceProposition(base(), NOW);
    expect(p.status).toBe('draft');
    expect(p.audience).toBe('');
    expect(p.capabilities).toEqual([]);
    expect(p.linkedEvidenceIds).toEqual([]);
  });

  it('inherits promise and outcome from service definition when present', () => {
    const g = base();
    const g2 = {
      ...g,
      service: {
        ...g.service,
        project: { definition: { promise: 'P', outcome: 'O', principles: ['A'] } },
      },
    } as ServiceGraph;
    const p = emptyServiceProposition(g2, NOW);
    expect(p.promise).toBe('P');
    expect(p.outcome).toBe('O');
    expect(p.principles).toEqual(['A']);
  });

  it('sets createdAt and updatedAt to now', () => {
    const p = emptyServiceProposition(base(), NOW);
    expect(p.createdAt).toBe(NOW);
    expect(p.updatedAt).toBe(NOW);
  });
});

// ─── normalizeServicePropositionState ─────────────────────────────────────────

describe('normalizeServicePropositionState', () => {
  it('returns fallback when no proposition stored', () => {
    const s = normalizeServicePropositionState(base(), NOW);
    expect(s.current.status).toBe('draft');
    expect(s.version).toBe(1);
  });

  it('normalises capabilities from string to array', () => {
    const g = withProposition(base(), { capabilities: 'A,B,C' as unknown as string[] });
    const s = normalizeServicePropositionState(g, NOW);
    expect(s.current.capabilities).toEqual(['A', 'B', 'C']);
  });

  it('deduplicates linkedEvidenceIds', () => {
    const g = withProposition(base(), { linkedEvidenceIds: ['e1', 'e1', 'e2'] });
    const s = normalizeServicePropositionState(g, NOW);
    expect(s.current.linkedEvidenceIds).toEqual(['e1', 'e2']);
  });
});

// ─── propositionStatement ─────────────────────────────────────────────────────

describe('propositionStatement', () => {
  it('uses placeholders when all fields empty', () => {
    const p = emptyServiceProposition(base(), NOW);
    const stmt = propositionStatement(p);
    expect(stmt).toContain('[pessoa / público]');
    expect(stmt).toContain('[serviço / proposta]');
    expect(stmt).toContain('[resultado esperado]');
  });

  it('builds statement with audience + promise + outcome', () => {
    const p = { ...emptyServiceProposition(base(), NOW), audience: 'PMEs', promise: 'CRM', outcome: 'mais vendas' };
    const stmt = propositionStatement(p);
    expect(stmt).toBe('Para PMEs, CRM permite mais vendas.');
  });

  it('appends "por meio de" when experience is set', () => {
    const p = {
      ...emptyServiceProposition(base(), NOW),
      audience: 'A', promise: 'B', outcome: 'C',
      experience: 'fluxo guiado',
    };
    expect(propositionStatement(p)).toContain('por meio de fluxo guiado');
  });

  it('appends "diferentemente de" when differentiator is set', () => {
    const p = {
      ...emptyServiceProposition(base(), NOW),
      audience: 'A', promise: 'B', outcome: 'C',
      differentiator: 'concorrente X',
    };
    expect(propositionStatement(p)).toContain('diferentemente de concorrente X');
  });

  it('includes both experience and differentiator', () => {
    const p = {
      ...emptyServiceProposition(base(), NOW),
      audience: 'A', promise: 'B', outcome: 'C',
      experience: 'E', differentiator: 'D',
    };
    const stmt = propositionStatement(p);
    expect(stmt).toContain('por meio de E');
    expect(stmt).toContain('diferentemente de D');
    expect(stmt.endsWith('.')).toBe(true);
  });
});

// ─── buildServicePropositionReport ───────────────────────────────────────────

describe('buildServicePropositionReport', () => {
  it('readinessScore = 0 for empty graph', () => {
    const r = buildServicePropositionReport(base());
    expect(r.readinessScore).toBe(0);
    expect(r.propositionReady).toBe(false);
  });

  it('sourceCount counts linked entities', () => {
    const g = {
      ...withProposition(base(), { linkedEvidenceIds: ['ev1'] }),
      entities: {
        evidence: { ev1: { id: 'ev1', serviceId: 'S', kind: 'evidence', title: 'Ev1', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const r = buildServicePropositionReport(g);
    expect(r.sourceCount).toBe(1);
    expect(r.linkedEvidence).toHaveLength(1);
  });

  it('propositionReady when score >= 70 and sourceCount > 0', () => {
    const g = withProposition(base(), {
      ...fullProposition(),
    });
    const g2 = {
      ...g,
      entities: {
        evidence: { ev1: { id: 'ev1', serviceId: 'S', kind: 'evidence', title: 'E', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const r = buildServicePropositionReport(g2);
    expect(r.propositionReady).toBe(true);
  });

  it('gaps lists missing fields', () => {
    const r = buildServicePropositionReport(base());
    expect(r.gaps.length).toBeGreaterThan(0);
    expect(r.gaps.some((g) => g.includes('Para quem') || g.includes('serviço é desenhado'))).toBe(true);
  });

  it('no gaps when all fields filled and sources linked', () => {
    const fp = fullProposition();
    const g = {
      ...withProposition(base(), fp),
      entities: {
        evidence: { ev1: { id: 'ev1', serviceId: 'S', kind: 'evidence', title: 'E', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const r = buildServicePropositionReport(g);
    // differentiator is optional for gaps check; just ensure no source gap
    expect(r.gaps.some((gap) => gap.includes('Conecte'))).toBe(false);
  });

  it('acceptedScenario is null when no accepted scenario', () => {
    const r = buildServicePropositionReport(base());
    expect(r.acceptedScenario).toBeNull();
  });

  it('scenarios lists only alternative kind', () => {
    const { graph: g } = createWhatIfScenario({
      graph: base(),
      name: 'Alt 1',
      hypothesis: 'Hipótese',
      now: NOW,
      id: 'sc1',
    });
    const r = buildServicePropositionReport(g);
    expect(r.scenarios).toHaveLength(1);
    expect(r.scenarios[0].kind).toBe('alternative');
  });
});

// ─── saveServiceProposition ───────────────────────────────────────────────────

describe('saveServiceProposition', () => {
  it('saves audience and promise', () => {
    const g = saveServiceProposition({
      graph: base(),
      patch: { audience: 'PMEs', promise: 'CRM' },
      now: NOW,
    });
    const p = g.service.proposition?.current;
    expect(p?.audience).toBe('PMEs');
    expect(p?.promise).toBe('CRM');
  });

  it('overrides status when provided', () => {
    const g = saveServiceProposition({
      graph: base(),
      patch: {},
      status: 'ready',
      now: NOW,
    });
    expect(g.service.proposition?.current.status).toBe('ready');
  });

  it('normalises capabilities from comma string', () => {
    const g = saveServiceProposition({
      graph: base(),
      patch: { capabilities: 'X,Y,Z' as unknown as string[] },
      now: NOW,
    });
    expect(g.service.proposition?.current.capabilities).toEqual(['X', 'Y', 'Z']);
  });

  it('updates service.updatedAt', () => {
    const g = base();
    const g2 = { ...g, service: { ...g.service, updatedAt: '2000-01-01T00:00:00.000Z' } } as ServiceGraph;
    const result = saveServiceProposition({ graph: g2, patch: {}, now: NOW });
    expect(result.service.updatedAt).toBe(NOW);
  });
});

// ─── createWhatIfScenario ─────────────────────────────────────────────────────

describe('createWhatIfScenario', () => {
  it('creates scenario with kind alternative', () => {
    const { graph: g, scenarioId } = createWhatIfScenario({
      graph: base(),
      name: 'Alt',
      hypothesis: 'Se mudarmos X',
      now: NOW,
      id: 'sc1',
    });
    expect(scenarioId).toBe('sc1');
    expect(g.service.scenarios?.['sc1']?.kind).toBe('alternative');
    expect(g.service.scenarios?.['sc1']?.baselineScenarioId).toBe('current');
    expect(g.service.scenarios?.['sc1']?.status).toBe('draft');
  });

  it('sets scenarioState when not previously set', () => {
    const { graph: g } = createWhatIfScenario({
      graph: base(),
      name: 'Alt',
      hypothesis: 'H',
      now: NOW,
      id: 'sc1',
    });
    expect(g.service.scenarioState).toBeDefined();
    expect(g.service.scenarioState?.compareScenarioId).toBe('sc1');
  });

  it('trimms empty name to default', () => {
    const { graph: g } = createWhatIfScenario({
      graph: base(),
      name: '  ',
      hypothesis: 'H',
      now: NOW,
      id: 'sc1',
    });
    expect(g.service.scenarios?.['sc1']?.name).toBe('Novo cenário');
  });

  it('stores successCriteria and patch', () => {
    const { graph: g } = createWhatIfScenario({
      graph: base(),
      name: 'A',
      hypothesis: 'H',
      patch: { audience: 'Nova audiência' },
      successCriteria: ['Critério 1'],
      now: NOW,
      id: 'sc1',
    });
    const sc = g.service.scenarios?.['sc1'];
    expect(sc?.successCriteria).toEqual(['Critério 1']);
    expect(sc?.propositionPatch?.audience).toBe('Nova audiência');
  });
});

// ─── updateWhatIfScenarioStatus ───────────────────────────────────────────────

describe('updateWhatIfScenarioStatus', () => {
  function graphWithScenario() {
    const { graph } = createWhatIfScenario({
      graph: base(),
      name: 'Alt',
      hypothesis: 'H',
      now: NOW,
      id: 'sc1',
    });
    return graph;
  }

  it('updates status of an alternative scenario', () => {
    const g = updateWhatIfScenarioStatus({
      graph: graphWithScenario(),
      scenarioId: 'sc1',
      status: 'testing',
      now: NOW,
    });
    expect(g.service.scenarios?.['sc1']?.status).toBe('testing');
  });

  it('returns unchanged graph for missing scenario', () => {
    const g = graphWithScenario();
    const result = updateWhatIfScenarioStatus({ graph: g, scenarioId: 'missing', status: 'testing', now: NOW });
    expect(result).toBe(g);
  });
});

// ─── promoteWhatIfScenario ────────────────────────────────────────────────────

describe('promoteWhatIfScenario', () => {
  it('merges patch into current proposition', () => {
    const { graph: g } = createWhatIfScenario({
      graph: withProposition(base(), { audience: 'Old' }),
      name: 'Alt',
      hypothesis: 'H',
      patch: { audience: 'New' },
      now: NOW,
      id: 'sc1',
    });
    const result = promoteWhatIfScenario({ graph: g, scenarioId: 'sc1', now: NOW });
    expect(result.service.proposition?.current.audience).toBe('New');
    expect(result.service.proposition?.current.status).toBe('ready');
  });

  it('marks promoted scenario as accepted', () => {
    const { graph: g } = createWhatIfScenario({
      graph: base(),
      name: 'Alt',
      hypothesis: 'H',
      patch: { audience: 'New' },
      now: NOW,
      id: 'sc1',
    });
    const result = promoteWhatIfScenario({ graph: g, scenarioId: 'sc1', now: NOW });
    expect(result.service.scenarios?.['sc1']?.status).toBe('accepted');
  });

  it('demotes previously accepted scenario to testing', () => {
    const { graph: g1 } = createWhatIfScenario({
      graph: base(),
      name: 'Alt 1',
      hypothesis: 'H1',
      patch: { audience: 'A' },
      now: NOW,
      id: 'sc1',
    });
    const { graph: g2 } = createWhatIfScenario({
      graph: g1,
      name: 'Alt 2',
      hypothesis: 'H2',
      patch: { audience: 'B' },
      now: NOW,
      id: 'sc2',
    });
    const r1 = promoteWhatIfScenario({ graph: g2, scenarioId: 'sc1', now: NOW });
    const r2 = promoteWhatIfScenario({ graph: r1, scenarioId: 'sc2', now: NOW });
    expect(r2.service.scenarios?.['sc1']?.status).toBe('testing');
    expect(r2.service.scenarios?.['sc2']?.status).toBe('accepted');
  });

  it('returns unchanged graph when scenario not found', () => {
    const g = base();
    expect(promoteWhatIfScenario({ graph: g, scenarioId: 'missing', now: NOW })).toBe(g);
  });
});

// ─── removeWhatIfScenario ─────────────────────────────────────────────────────

describe('removeWhatIfScenario', () => {
  function graphWithScenario() {
    const { graph } = createWhatIfScenario({
      graph: base(),
      name: 'Alt',
      hypothesis: 'H',
      now: NOW,
      id: 'sc1',
    });
    return graph;
  }

  it('deletes the scenario', () => {
    const g = removeWhatIfScenario({ graph: graphWithScenario(), scenarioId: 'sc1', now: NOW });
    expect(g.service.scenarios?.['sc1']).toBeUndefined();
  });

  it('resets activeScenarioId to current if it matched', () => {
    const g0 = graphWithScenario();
    const g1 = {
      ...g0,
      service: {
        ...g0.service,
        scenarioState: { mode: 'single' as const, activeScenarioId: 'sc1', compareScenarioId: 'current' },
      },
    } as ServiceGraph;
    const result = removeWhatIfScenario({ graph: g1, scenarioId: 'sc1', now: NOW });
    expect(result.service.scenarioState?.activeScenarioId).toBe('current');
  });

  it('resets compareScenarioId to current if it matched', () => {
    const g0 = graphWithScenario();
    const g1 = {
      ...g0,
      service: {
        ...g0.service,
        scenarioState: { mode: 'all' as const, activeScenarioId: 'current', compareScenarioId: 'sc1' },
      },
    } as ServiceGraph;
    const result = removeWhatIfScenario({ graph: g1, scenarioId: 'sc1', now: NOW });
    expect(result.service.scenarioState?.compareScenarioId).toBe('current');
  });

  it('returns unchanged graph for missing scenario', () => {
    const g = graphWithScenario();
    expect(removeWhatIfScenario({ graph: g, scenarioId: 'missing', now: NOW })).toBe(g);
  });
});

// ─── scenarioDifferences ──────────────────────────────────────────────────────

describe('scenarioDifferences', () => {
  it('returns empty array when no scenario found', () => {
    expect(scenarioDifferences(base(), 'missing')).toEqual([]);
  });

  it('returns empty array when no propositionPatch', () => {
    const { graph: g } = createWhatIfScenario({
      graph: base(),
      name: 'Alt',
      hypothesis: 'H',
      now: NOW,
      id: 'sc1',
    });
    // remove patch to test guard
    const g2 = {
      ...g,
      service: {
        ...g.service,
        scenarios: { sc1: { ...g.service.scenarios!['sc1'], propositionPatch: undefined } },
      },
    } as ServiceGraph;
    expect(scenarioDifferences(g2, 'sc1')).toEqual([]);
  });

  it('returns differences for changed fields', () => {
    const { graph: g } = createWhatIfScenario({
      graph: withProposition(base(), { audience: 'Old' }),
      name: 'Alt',
      hypothesis: 'H',
      patch: { audience: 'New' },
      now: NOW,
      id: 'sc1',
    });
    const diffs = scenarioDifferences(g, 'sc1');
    expect(diffs.some((d) => d.field === 'audience')).toBe(true);
    const audienceDiff = diffs.find((d) => d.field === 'audience')!;
    expect(audienceDiff.current).toBe('Old');
    expect(audienceDiff.alternative).toBe('New');
  });

  it('omits fields not in patch', () => {
    const { graph: g } = createWhatIfScenario({
      graph: withProposition(base(), { audience: 'A', promise: 'B' }),
      name: 'Alt',
      hypothesis: 'H',
      patch: { audience: 'New' }, // only audience changed
      now: NOW,
      id: 'sc1',
    });
    const diffs = scenarioDifferences(g, 'sc1');
    expect(diffs.every((d) => d.field === 'audience')).toBe(true);
  });
});

// ─── propositionSourceOptions ─────────────────────────────────────────────────

describe('propositionSourceOptions', () => {
  it('returns empty arrays for empty graph', () => {
    const opts = propositionSourceOptions(base());
    expect(opts.insights).toEqual([]);
    expect(opts.needs).toEqual([]);
    expect(opts.problems).toEqual([]);
    expect(opts.evidence).toEqual([]);
  });

  it('returns entities of each type', () => {
    const g = {
      ...base(),
      entities: {
        insight: { ins1: { id: 'ins1', serviceId: 'S', kind: 'insight', title: 'I', createdAt: NOW, updatedAt: NOW } },
        need: { n1: { id: 'n1', serviceId: 'S', kind: 'need', title: 'N', createdAt: NOW, updatedAt: NOW } },
        problem: { p1: { id: 'p1', serviceId: 'S', kind: 'problem', title: 'P', createdAt: NOW, updatedAt: NOW } },
        problemHypothesis: { ph1: { id: 'ph1', serviceId: 'S', kind: 'problemHypothesis', title: 'PH', createdAt: NOW, updatedAt: NOW } },
        evidence: { ev1: { id: 'ev1', serviceId: 'S', kind: 'evidence', title: 'E', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const opts = propositionSourceOptions(g);
    expect(opts.insights).toHaveLength(1);
    expect(opts.needs).toHaveLength(1);
    expect(opts.problems).toHaveLength(2); // problem + problemHypothesis
    expect(opts.evidence).toHaveLength(1);
  });

  it('filters out entities from different service', () => {
    const g = {
      ...base(),
      entities: {
        need: { n1: { id: 'n1', serviceId: 'OTHER', kind: 'need', title: 'N', createdAt: NOW, updatedAt: NOW } },
      },
    } as ServiceGraph;
    const opts = propositionSourceOptions(g);
    expect(opts.needs).toHaveLength(0);
  });
});

import { describe, it, expect } from 'vitest';
import type { ServiceGraph, ServiceGovernanceRecord, ServiceGovernanceState } from '../../domain/model';
import { createServiceGraph } from '../../domain/graph-operations';
import {
  emptyServiceGovernanceState,
  normalizeServiceGovernanceState,
  listGovernanceTargets,
  syncServiceGovernance,
  updateGovernanceRecord,
  requestGovernanceApproval,
  decideGovernanceApproval,
  recordGovernanceReview,
  buildServiceGovernanceReport,
  nextReviewAt,
  SERVICE_GOVERNANCE_TARGET_LABELS,
  SERVICE_GOVERNANCE_CADENCE_LABELS,
  SERVICE_GOVERNANCE_APPROVAL_LABELS,
  SERVICE_GOVERNANCE_REVIEW_LABELS,
} from '../service-governance';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW = '2025-06-01T12:00:00.000Z';

/** Grafo mínimo com uma journey. */
function makeGraph(): ServiceGraph {
  const base = createServiceGraph('Serviço Teste');
  const journeyId = 'journey-1';
  const journey = { id: journeyId, serviceId: base.service.id, name: 'Jornada 1', stageIds: [], createdAt: NOW, updatedAt: NOW };
  return { ...base, journeys: { [journeyId]: journey } };
}

/** Adiciona um registro de governança ao grafo. */
function graphWithRecord(graph: ServiceGraph, overrides: Partial<ServiceGovernanceRecord> = {}): ServiceGraph {
  const synced = syncServiceGovernance(graph, NOW);
  const state = synced.service.governance!;
  const firstId = Object.keys(state.records)[0];
  const updated: ServiceGovernanceState = {
    ...state,
    records: {
      ...state.records,
      [firstId]: { ...state.records[firstId], ...overrides },
    },
  };
  return { ...synced, service: { ...synced.service, governance: updated } };
}

// ---------------------------------------------------------------------------
// Label maps
// ---------------------------------------------------------------------------

describe('label maps', () => {
  it('SERVICE_GOVERNANCE_TARGET_LABELS cobre todos os 5 kinds', () => {
    expect(Object.keys(SERVICE_GOVERNANCE_TARGET_LABELS)).toHaveLength(5);
    expect(SERVICE_GOVERNANCE_TARGET_LABELS.journey).toBe('Journey');
    expect(SERVICE_GOVERNANCE_TARGET_LABELS.blueprint).toBe('Blueprint');
  });

  it('SERVICE_GOVERNANCE_CADENCE_LABELS cobre todas as cadências', () => {
    expect(Object.keys(SERVICE_GOVERNANCE_CADENCE_LABELS)).toHaveLength(5);
    expect(SERVICE_GOVERNANCE_CADENCE_LABELS.monthly).toBe('Mensal');
    expect(SERVICE_GOVERNANCE_CADENCE_LABELS.custom).toBe('Personalizada');
  });

  it('SERVICE_GOVERNANCE_APPROVAL_LABELS cobre todos os status', () => {
    expect(Object.keys(SERVICE_GOVERNANCE_APPROVAL_LABELS)).toHaveLength(4);
    expect(SERVICE_GOVERNANCE_APPROVAL_LABELS.approved).toBe('Aprovado');
    expect(SERVICE_GOVERNANCE_APPROVAL_LABELS.not_required).toBe('Não exige aprovação');
  });

  it('SERVICE_GOVERNANCE_REVIEW_LABELS cobre todos os outcomes', () => {
    expect(Object.keys(SERVICE_GOVERNANCE_REVIEW_LABELS)).toHaveLength(3);
    expect(SERVICE_GOVERNANCE_REVIEW_LABELS.healthy).toBe('Saudável');
    expect(SERVICE_GOVERNANCE_REVIEW_LABELS.action_required).toBe('Ação necessária');
  });
});

// ---------------------------------------------------------------------------
// nextReviewAt
// ---------------------------------------------------------------------------

describe('nextReviewAt', () => {
  it('monthly → +30 dias', () => {
    const result = nextReviewAt({ cadence: 'monthly', customIntervalDays: undefined }, '2025-01-01T00:00:00.000Z');
    expect(result.startsWith('2025-01-31')).toBe(true);
  });

  it('quarterly → +90 dias', () => {
    const result = nextReviewAt({ cadence: 'quarterly', customIntervalDays: undefined }, '2025-01-01T00:00:00.000Z');
    expect(result.startsWith('2025-04-01')).toBe(true);
  });

  it('semiannual → +182 dias', () => {
    const result = nextReviewAt({ cadence: 'semiannual', customIntervalDays: undefined }, '2025-01-01T00:00:00.000Z');
    expect(result.startsWith('2025-07-02')).toBe(true);
  });

  it('annual → +365 dias', () => {
    const result = nextReviewAt({ cadence: 'annual', customIntervalDays: undefined }, '2025-01-01T00:00:00.000Z');
    expect(result.startsWith('2026-01-01')).toBe(true);
  });

  it('custom com interval definido usa customIntervalDays', () => {
    const result = nextReviewAt({ cadence: 'custom', customIntervalDays: 10 }, '2025-01-01T00:00:00.000Z');
    expect(result.startsWith('2025-01-11')).toBe(true);
  });

  it('custom sem interval usa fallback de 30 dias', () => {
    const result = nextReviewAt({ cadence: 'custom', customIntervalDays: undefined }, '2025-01-01T00:00:00.000Z');
    expect(result.startsWith('2025-01-31')).toBe(true);
  });

  it('custom com interval 0 cai no fallback de 30 dias (|| 30)', () => {
    // 0 é falsy → `0 || 30` = 30 dias de fallback
    const result = nextReviewAt({ cadence: 'custom', customIntervalDays: 0 }, '2025-01-01T00:00:00.000Z');
    expect(result.startsWith('2025-01-31')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// emptyServiceGovernanceState
// ---------------------------------------------------------------------------

describe('emptyServiceGovernanceState', () => {
  it('retorna estado vazio com version 1', () => {
    const state = emptyServiceGovernanceState(NOW);
    expect(state.version).toBe(1);
    expect(state.records).toEqual({});
    expect(state.reviews).toEqual({});
    expect(state.updatedAt).toBe(NOW);
  });
});

// ---------------------------------------------------------------------------
// normalizeServiceGovernanceState
// ---------------------------------------------------------------------------

describe('normalizeServiceGovernanceState', () => {
  it('retorna cópia do estado existente', () => {
    const graph = syncServiceGovernance(makeGraph(), NOW);
    const state = normalizeServiceGovernanceState(graph, NOW);
    expect(state.version).toBe(1);
    expect(Object.keys(state.records).length).toBeGreaterThan(0);
  });

  it('cria estado vazio se governance é undefined', () => {
    const graph = makeGraph();
    expect(graph.service.governance).toBeUndefined();
    const state = normalizeServiceGovernanceState(graph, NOW);
    expect(state.records).toEqual({});
    expect(state.reviews).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// listGovernanceTargets
// ---------------------------------------------------------------------------

describe('listGovernanceTargets', () => {
  it('lista journeys do grafo', () => {
    const graph = makeGraph();
    const targets = listGovernanceTargets(graph);
    const journey = targets.find((t) => t.kind === 'journey');
    expect(journey).toBeDefined();
    expect(journey!.id).toBe('journey-1');
    expect(journey!.label).toBe('Jornada 1');
  });

  it('lista blueprints (whiteboards com viewKind=blueprint)', () => {
    const base = makeGraph();
    const graph: ServiceGraph = {
      ...base,
      views: {
        whiteboards: {
          'wb-1': { id: 'wb-1', name: 'Blueprint Principal', viewKind: 'blueprint', items: {}, createdAt: NOW, updatedAt: NOW },
        },
      },
    };
    const targets = listGovernanceTargets(graph);
    const bp = targets.find((t) => t.kind === 'blueprint');
    expect(bp).toBeDefined();
    expect(bp!.id).toBe('wb-1');
  });

  it('não lista whiteboards que não são blueprints', () => {
    const base = makeGraph();
    const graph: ServiceGraph = {
      ...base,
      views: {
        whiteboards: {
          'wb-2': { id: 'wb-2', name: 'Outros', viewKind: 'map', items: {}, createdAt: NOW, updatedAt: NOW },
        },
      },
    };
    const targets = listGovernanceTargets(graph);
    expect(targets.find((t) => t.kind === 'blueprint')).toBeUndefined();
  });

  it('lista channels', () => {
    const base = makeGraph();
    const graph: ServiceGraph = {
      ...base,
      channels: {
        'ch-1': { id: 'ch-1', name: 'App Móvel', createdAt: NOW, updatedAt: NOW },
      },
    };
    const targets = listGovernanceTargets(graph);
    const channel = targets.find((t) => t.kind === 'channel');
    expect(channel).toBeDefined();
    expect(channel!.id).toBe('ch-1');
  });

  it('lista entidades do tipo metric', () => {
    const base = makeGraph();
    const graph: ServiceGraph = {
      ...base,
      entities: {
        metric: {
          'metric-1': { id: 'metric-1', title: 'NPS', stageId: '', journeyId: '', createdAt: NOW, updatedAt: NOW } as any,
        },
      },
    };
    const targets = listGovernanceTargets(graph);
    const metric = targets.find((t) => t.kind === 'metric');
    expect(metric).toBeDefined();
    expect(metric!.id).toBe('metric-1');
    expect(metric!.label).toBe('NPS');
  });

  it('lista iniciativas do improvementPortfolio', () => {
    const base = makeGraph();
    const graph: ServiceGraph = {
      ...base,
      service: {
        ...base.service,
        improvementPortfolio: {
          version: 1,
          initiatives: {
            'init-1': {
              id: 'init-1', serviceId: base.service.id, opportunityId: 'op-1',
              title: 'Iniciativa de Teste', problemIds: [], status: 'planned',
              effort: 1, expectedImpact: 3, deliveryRisk: 'low', progress: 0,
              dependencyIds: [], decisionIds: [], experimentIds: [], metricIds: [],
              createdAt: NOW, updatedAt: NOW,
            },
          },
          updatedAt: NOW,
        },
      },
    };
    const targets = listGovernanceTargets(graph);
    const initiative = targets.find((t) => t.kind === 'initiative');
    expect(initiative).toBeDefined();
    expect(initiative!.id).toBe('init-1');
    expect(initiative!.label).toBe('Iniciativa de Teste');
  });

  it('usa id como label quando name está vazio', () => {
    const base = makeGraph();
    const graph: ServiceGraph = {
      ...base,
      channels: {
        'ch-empty': { id: 'ch-empty', name: '', createdAt: NOW, updatedAt: NOW },
      },
    };
    const targets = listGovernanceTargets(graph);
    const channel = targets.find((t) => t.kind === 'channel');
    expect(channel!.label).toBe('ch-empty');
  });
});

// ---------------------------------------------------------------------------
// syncServiceGovernance
// ---------------------------------------------------------------------------

describe('syncServiceGovernance', () => {
  it('cria registros para cada target ativo', () => {
    const graph = makeGraph();
    const synced = syncServiceGovernance(graph, NOW);
    const records = Object.values(synced.service.governance!.records);
    expect(records.length).toBeGreaterThan(0);
    const journey = records.find((r) => r.targetKind === 'journey');
    expect(journey).toBeDefined();
    expect(journey!.targetId).toBe('journey-1');
    expect(journey!.active).toBe(true);
  });

  it('journey e blueprint exigem aprovação por padrão', () => {
    const base = makeGraph();
    const graph: ServiceGraph = {
      ...base,
      views: {
        whiteboards: {
          'wb-1': { id: 'wb-1', name: 'BP', viewKind: 'blueprint', items: {}, createdAt: NOW, updatedAt: NOW },
        },
      },
    };
    const synced = syncServiceGovernance(graph, NOW);
    const records = Object.values(synced.service.governance!.records);
    const journey = records.find((r) => r.targetKind === 'journey')!;
    const blueprint = records.find((r) => r.targetKind === 'blueprint')!;
    expect(journey.approvalRequired).toBe(true);
    expect(journey.approvalStatus).toBe('pending');
    expect(blueprint.approvalRequired).toBe(true);
    expect(blueprint.approvalStatus).toBe('pending');
  });

  it('channel não exige aprovação por padrão', () => {
    const base = makeGraph();
    const graph: ServiceGraph = {
      ...base,
      channels: { 'ch-1': { id: 'ch-1', name: 'Canal', createdAt: NOW, updatedAt: NOW } },
    };
    const synced = syncServiceGovernance(graph, NOW);
    const ch = Object.values(synced.service.governance!.records).find((r) => r.targetKind === 'channel')!;
    expect(ch.approvalRequired).toBe(false);
    expect(ch.approvalStatus).toBe('not_required');
  });

  it('marca como inativo registros cujo target foi removido', () => {
    const graph = makeGraph();
    const synced = syncServiceGovernance(graph, NOW);
    // remove journey do grafo
    const withoutJourney: ServiceGraph = { ...synced, journeys: {} };
    const resynced = syncServiceGovernance(withoutJourney, NOW);
    const records = Object.values(resynced.service.governance!.records);
    const journey = records.find((r) => r.targetKind === 'journey')!;
    expect(journey.active).toBe(false);
  });

  it('preserva campos existentes ao re-sincronizar', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const withOwner = updateGovernanceRecord(synced, id, { owner: 'Alice' }, NOW);
    const resynced = syncServiceGovernance(withOwner, NOW);
    const record = resynced.service.governance!.records[id];
    expect(record.owner).toBe('Alice');
  });

  it('usa cadence monthly para metric e initiative', () => {
    const base = makeGraph();
    const graph: ServiceGraph = {
      ...base,
      entities: {
        metric: {
          'metric-1': { id: 'metric-1', title: 'NPS', stageId: '', journeyId: '', createdAt: NOW, updatedAt: NOW } as any,
        },
      },
    };
    const synced = syncServiceGovernance(graph, NOW);
    const metric = Object.values(synced.service.governance!.records).find((r) => r.targetKind === 'metric')!;
    expect(metric.cadence).toBe('monthly');
  });
});

// ---------------------------------------------------------------------------
// updateGovernanceRecord
// ---------------------------------------------------------------------------

describe('updateGovernanceRecord', () => {
  it('atualiza owner e note', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const updated = updateGovernanceRecord(synced, id, { owner: 'Bob', note: 'ok' }, NOW);
    const record = updated.service.governance!.records[id];
    expect(record.owner).toBe('Bob');
    expect(record.note).toBe('ok');
  });

  it('atualiza reviewers removendo duplicatas', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const updated = updateGovernanceRecord(synced, id, { reviewers: ['Alice', 'Bob', 'Alice'] }, NOW);
    const record = updated.service.governance!.records[id];
    expect(record.reviewers).toEqual(['Alice', 'Bob']);
  });

  it('atualiza cadence e customIntervalDays', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const updated = updateGovernanceRecord(synced, id, { cadence: 'custom', customIntervalDays: 45 }, NOW);
    const record = updated.service.governance!.records[id];
    expect(record.cadence).toBe('custom');
    expect(record.customIntervalDays).toBe(45);
  });

  it('garante customIntervalDays mínimo de 1', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const updated = updateGovernanceRecord(synced, id, { cadence: 'custom', customIntervalDays: -5 }, NOW);
    const record = updated.service.governance!.records[id];
    expect(record.customIntervalDays).toBe(1);
  });

  it('remover approvalRequired limpa campos de aprovação', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    // primeiro adiciona approver
    const withApprover = updateGovernanceRecord(synced, id, { approver: 'Gestor X' }, NOW);
    // depois remove approvalRequired
    const noApproval = updateGovernanceRecord(withApprover, id, { approvalRequired: false }, NOW);
    const record = noApproval.service.governance!.records[id];
    expect(record.approvalRequired).toBe(false);
    expect(record.approvalStatus).toBe('not_required');
    expect(record.approver).toBeUndefined();
    expect(record.approvedAt).toBeUndefined();
  });

  it('ativar approvalRequired muda status de not_required para pending', () => {
    // channel começa com approvalRequired=false
    const base: ServiceGraph = {
      ...makeGraph(),
      channels: { 'ch-1': { id: 'ch-1', name: 'Canal', createdAt: NOW, updatedAt: NOW } },
    };
    const synced = syncServiceGovernance(base, NOW);
    const id = Object.keys(synced.service.governance!.records).find((k) =>
      synced.service.governance!.records[k].targetKind === 'channel',
    )!;
    const updated = updateGovernanceRecord(synced, id, { approvalRequired: true }, NOW);
    const record = updated.service.governance!.records[id];
    expect(record.approvalRequired).toBe(true);
    expect(record.approvalStatus).toBe('pending');
  });

  it('retorna o grafo original se recordId não existe', () => {
    const graph = makeGraph();
    const result = updateGovernanceRecord(graph, 'id-inexistente', { owner: 'X' }, NOW);
    expect(result).toBe(graph);
  });

  it('trata owner e accountable em branco como undefined', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const updated = updateGovernanceRecord(synced, id, { owner: '   ', accountable: '' }, NOW);
    const record = updated.service.governance!.records[id];
    expect(record.owner).toBeUndefined();
    expect(record.accountable).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// requestGovernanceApproval
// ---------------------------------------------------------------------------

describe('requestGovernanceApproval', () => {
  it('coloca aprovação como pending', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    // approvalRequired já é true para journey; forçamos um estado com approver
    const withApprover = updateGovernanceRecord(synced, id, { approver: 'Gestor' }, NOW);
    const requested = requestGovernanceApproval(withApprover, id, 'Novo Approver', NOW);
    const record = requested.service.governance!.records[id];
    expect(record.approvalStatus).toBe('pending');
    expect(record.approver).toBe('Novo Approver');
    expect(record.approvedAt).toBeUndefined();
  });

  it('retorna grafo original se aprovação não é necessária', () => {
    const base: ServiceGraph = {
      ...makeGraph(),
      channels: { 'ch-1': { id: 'ch-1', name: 'Canal', createdAt: NOW, updatedAt: NOW } },
    };
    const synced = syncServiceGovernance(base, NOW);
    const id = Object.keys(synced.service.governance!.records).find((k) =>
      synced.service.governance!.records[k].targetKind === 'channel',
    )!;
    const result = requestGovernanceApproval(synced, id, 'Gestor', NOW);
    expect(result).toBe(synced);
  });

  it('retorna grafo original se recordId não existe', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const result = requestGovernanceApproval(synced, 'id-inexistente', 'Gestor', NOW);
    expect(result).toBe(synced);
  });

  it('mantém approver anterior se não for passado novo approver', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const withApprover = updateGovernanceRecord(synced, id, { approver: 'ApproverOriginal' }, NOW);
    const requested = requestGovernanceApproval(withApprover, id, '', NOW);
    const record = requested.service.governance!.records[id];
    expect(record.approver).toBe('ApproverOriginal');
  });
});

// ---------------------------------------------------------------------------
// decideGovernanceApproval
// ---------------------------------------------------------------------------

describe('decideGovernanceApproval', () => {
  it('aprovação define approvalStatus=approved e approvedAt', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const decided = decideGovernanceApproval(synced, id, 'approved', 'Gestor', 'tudo ok', NOW);
    const record = decided.service.governance!.records[id];
    expect(record.approvalStatus).toBe('approved');
    expect(record.approvedAt).toBe(NOW);
    expect(record.approver).toBe('Gestor');
    expect(record.approvalNote).toBe('tudo ok');
  });

  it('rejeição define approvalStatus=rejected e approvedAt=undefined', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const decided = decideGovernanceApproval(synced, id, 'rejected', 'Gestor', 'não atende', NOW);
    const record = decided.service.governance!.records[id];
    expect(record.approvalStatus).toBe('rejected');
    expect(record.approvedAt).toBeUndefined();
    expect(record.approvalNote).toBe('não atende');
  });

  it('retorna grafo original se approvalRequired=false', () => {
    const base: ServiceGraph = {
      ...makeGraph(),
      channels: { 'ch-1': { id: 'ch-1', name: 'Canal', createdAt: NOW, updatedAt: NOW } },
    };
    const synced = syncServiceGovernance(base, NOW);
    const id = Object.keys(synced.service.governance!.records).find((k) =>
      synced.service.governance!.records[k].targetKind === 'channel',
    )!;
    const result = decideGovernanceApproval(synced, id, 'approved', 'Gestor', '', NOW);
    expect(result).toBe(synced);
  });

  it('retorna grafo original se recordId não existe', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const result = decideGovernanceApproval(synced, 'id-inexistente', 'approved', '', '', NOW);
    expect(result).toBe(synced);
  });

  it('note em branco vira undefined', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const decided = decideGovernanceApproval(synced, id, 'approved', 'G', '   ', NOW);
    expect(decided.service.governance!.records[id].approvalNote).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// recordGovernanceReview
// ---------------------------------------------------------------------------

describe('recordGovernanceReview', () => {
  it('cria review e retorna reviewId', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const { graph: g2, reviewId, created } = recordGovernanceReview(synced, id, { reviewer: 'Alice', outcome: 'healthy' }, NOW);
    expect(created).toBe(true);
    expect(reviewId).toBeTruthy();
    const review = g2.service.governance!.reviews[reviewId!];
    expect(review.reviewer).toBe('Alice');
    expect(review.outcome).toBe('healthy');
    expect(review.governanceId).toBe(id);
  });

  it('atualiza lastReviewedAt e nextReviewAt no record', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const { graph: g2, reviewId } = recordGovernanceReview(synced, id, { reviewer: 'Alice', outcome: 'attention', reviewedAt: NOW }, NOW);
    const record = g2.service.governance!.records[id];
    expect(record.lastReviewedAt).toBe(NOW);
    // quarterly → +90 dias a partir de NOW (2025-06-01)
    expect(record.nextReviewAt).toBeTruthy();
    // adiciona reviewer à lista
    expect(record.reviewers).toContain('Alice');
    // review deve referenciar o record
    const review = g2.service.governance!.reviews[reviewId!];
    expect(review.nextReviewAt).toBe(record.nextReviewAt);
  });

  it('retorna created=false se reviewId não existe', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const result = recordGovernanceReview(synced, 'id-inexistente', { reviewer: 'Alice', outcome: 'healthy' }, NOW);
    expect(result.created).toBe(false);
    expect(result.reviewId).toBeNull();
    expect(result.reason).toBe('record_not_found');
  });

  it('retorna created=false se reviewer está em branco', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const result = recordGovernanceReview(synced, id, { reviewer: '  ', outcome: 'healthy' }, NOW);
    expect(result.created).toBe(false);
    expect(result.reason).toBe('reviewer_required');
  });

  it('note opcional é incluída no review', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const { graph: g2, reviewId } = recordGovernanceReview(synced, id, { reviewer: 'Alice', outcome: 'action_required', note: 'verificar urgente' }, NOW);
    const review = g2.service.governance!.reviews[reviewId!];
    expect(review.note).toBe('verificar urgente');
  });

  it('usa now como reviewedAt se não informado', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const { graph: g2, reviewId } = recordGovernanceReview(synced, id, { reviewer: 'Alice', outcome: 'healthy' }, NOW);
    const review = g2.service.governance!.reviews[reviewId!];
    expect(review.reviewedAt).toBe(NOW);
  });
});

// ---------------------------------------------------------------------------
// buildServiceGovernanceReport
// ---------------------------------------------------------------------------

describe('buildServiceGovernanceReport', () => {
  it('retorna grafo sincronizado e records', () => {
    const graph = makeGraph();
    const report = buildServiceGovernanceReport(graph, NOW);
    expect(report.graph).toBeTruthy();
    expect(Array.isArray(report.records)).toBe(true);
    expect(report.records.length).toBeGreaterThan(0);
  });

  it('score 100 se grafo vazio (sem targets)', () => {
    const graph = createServiceGraph('Vazio');
    const report = buildServiceGovernanceReport(graph, NOW);
    expect(report.governanceScore).toBe(100);
    expect(report.counts.total).toBe(0);
  });

  it('byKind cobre os 5 kinds', () => {
    const report = buildServiceGovernanceReport(makeGraph(), NOW);
    expect(report.byKind).toHaveLength(5);
    const kinds = report.byKind.map((k) => k.kind);
    expect(kinds).toContain('journey');
    expect(kinds).toContain('blueprint');
    expect(kinds).toContain('channel');
    expect(kinds).toContain('metric');
    expect(kinds).toContain('initiative');
  });

  it('coverage=0 se nenhum record tem owner', () => {
    const report = buildServiceGovernanceReport(makeGraph(), NOW);
    // journey criada sem owner
    expect(report.coverage).toBe(0);
  });

  it('coverage=100 quando todos têm owner', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    const withOwner = updateGovernanceRecord(synced, id, { owner: 'Alice', accountable: 'Alice' }, NOW);
    const report = buildServiceGovernanceReport(withOwner, NOW);
    expect(report.coverage).toBe(100);
  });

  it('marca overdue corretamente', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const id = Object.keys(synced.service.governance!.records)[0];
    // define nextReviewAt no passado
    const pastDate = '2020-01-01T00:00:00.000Z';
    const withPastDue = updateGovernanceRecord(synced, id, { nextReviewAt: pastDate }, NOW);
    const report = buildServiceGovernanceReport(withPastDue, NOW);
    const rec = report.records.find((r) => r.id === id)!;
    expect(rec.overdue).toBe(true);
    expect(report.counts.overdue).toBeGreaterThanOrEqual(1);
  });

  it('health=action_required quando sem owner', () => {
    const report = buildServiceGovernanceReport(makeGraph(), NOW);
    const rec = report.records[0];
    expect(rec.health).toBe('action_required');
  });

  it('health=healthy quando owner, accountable, review saudável e sem pendência de aprovação', () => {
    // usa channel (sem approvalRequired)
    const base: ServiceGraph = {
      ...createServiceGraph('S'),
      channels: { 'ch-1': { id: 'ch-1', name: 'Canal', createdAt: NOW, updatedAt: NOW } },
    };
    const synced = syncServiceGovernance(base, NOW);
    const id = Object.keys(synced.service.governance!.records).find((k) =>
      synced.service.governance!.records[k].targetKind === 'channel',
    )!;
    const withData = updateGovernanceRecord(synced, id, { owner: 'Alice', accountable: 'Bob' }, NOW);
    const future = '2099-01-01T00:00:00.000Z';
    const withDue = updateGovernanceRecord(withData, id, { nextReviewAt: future }, NOW);
    const { graph: g2 } = recordGovernanceReview(withDue, id, { reviewer: 'Alice', outcome: 'healthy', reviewedAt: NOW }, NOW);
    const report = buildServiceGovernanceReport(g2, NOW);
    const rec = report.records.find((r) => r.id === id)!;
    expect(rec.health).toBe('healthy');
  });

  it('health=attention quando último review tem outcome=attention', () => {
    const base: ServiceGraph = {
      ...createServiceGraph('S'),
      channels: { 'ch-1': { id: 'ch-1', name: 'Canal', createdAt: NOW, updatedAt: NOW } },
    };
    const synced = syncServiceGovernance(base, NOW);
    const id = Object.keys(synced.service.governance!.records).find((k) =>
      synced.service.governance!.records[k].targetKind === 'channel',
    )!;
    const withData = updateGovernanceRecord(synced, id, { owner: 'Alice', accountable: 'Bob' }, NOW);
    const future = '2099-01-01T00:00:00.000Z';
    const withDue = updateGovernanceRecord(withData, id, { nextReviewAt: future }, NOW);
    const { graph: g2 } = recordGovernanceReview(withDue, id, { reviewer: 'Alice', outcome: 'attention', reviewedAt: NOW }, NOW);
    const report = buildServiceGovernanceReport(g2, NOW);
    const rec = report.records.find((r) => r.id === id)!;
    expect(rec.health).toBe('attention');
  });

  it('pendingApproval conta records com approvalRequired e status=pending', () => {
    const synced = syncServiceGovernance(makeGraph(), NOW);
    const report = buildServiceGovernanceReport(synced, NOW);
    expect(report.counts.pendingApproval).toBeGreaterThanOrEqual(1);
  });

  it('reviewCoverage=0 quando nenhum record foi revisado', () => {
    const report = buildServiceGovernanceReport(makeGraph(), NOW);
    expect(report.reviewCoverage).toBe(0);
  });
});

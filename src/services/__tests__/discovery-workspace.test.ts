import { describe, it, expect } from 'vitest';
import {
  buildDiscoveryWorkspaceReport,
  createDiscoveryEntity,
} from '../discovery-workspace.ts';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import type { DiscoveryKind } from '../discovery-workspace.ts';
import type { ServiceGraph, GraphEntity } from '../../domain/model';

const NOW = '2025-01-01T00:00:00.000Z';
const NOW2 = '2025-06-01T00:00:00.000Z';

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

function withEntity(graph: ServiceGraph, kind: DiscoveryKind, overrides: Partial<GraphEntity> = {}): ServiceGraph {
  const id = overrides.id ?? `${kind}-1`;
  const entity: GraphEntity = {
    id,
    type: kind,
    serviceId: graph.service.id,
    title: `Título ${kind}`,
    status: 'active',
    relatedIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: {
        ...(graph.entities?.[kind] ?? {}),
        [id]: entity,
      },
    },
  } as ServiceGraph;
}

// ─── buildDiscoveryWorkspaceReport ──────────────────────────────────────────

describe('buildDiscoveryWorkspaceReport', () => {
  describe('grafo vazio', () => {
    it('totalObjects=0', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).totalObjects).toBe(0);
    });

    it('completedChecks=0', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).completedChecks).toBe(0);
    });

    it('totalChecks=6 (um por kind)', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).totalChecks).toBe(6);
    });

    it('score=0', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).score).toBe(0);
    });

    it('status="empty"', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).status).toBe('empty');
    });

    it('minimumContextReady=false', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).minimumContextReady).toBe(false);
    });

    it('nextMissing="persona" (primeiro kind)', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).nextMissing).toBe('persona');
    });

    it('recent é array vazio', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).recent).toEqual([]);
    });

    it('relationshipCount=0', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).relationshipCount).toBe(0);
    });

    it('collections contém as 6 kinds', () => {
      const { collections } = buildDiscoveryWorkspaceReport(makeGraph());
      expect(Object.keys(collections)).toHaveLength(6);
      expect(collections.persona).toBeDefined();
      expect(collections.evidence).toBeDefined();
    });
  });

  describe('collections — metadados', () => {
    it('persona tem label "Personas"', () => {
      const { collections } = buildDiscoveryWorkspaceReport(makeGraph());
      expect(collections.persona.label).toBe('Personas');
    });

    it('need tem question correto', () => {
      const { collections } = buildDiscoveryWorkspaceReport(makeGraph());
      expect(collections.need.question).toBe('O que precisa ser resolvido?');
    });

    it('evidence tem singular "Evidência"', () => {
      const { collections } = buildDiscoveryWorkspaceReport(makeGraph());
      expect(collections.evidence.singular).toBe('Evidência');
    });
  });

  describe('contagens', () => {
    it('totalObjects acumula todas as entidades', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      g = withEntity(g, 'need');
      g = withEntity(g, 'pain');
      expect(buildDiscoveryWorkspaceReport(g).totalObjects).toBe(3);
    });

    it('completedChecks conta kinds com pelo menos 1 item', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      g = withEntity(g, 'evidence');
      expect(buildDiscoveryWorkspaceReport(g).completedChecks).toBe(2);
    });

    it('score = round(completedChecks/6 * 100)', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      g = withEntity(g, 'need');
      g = withEntity(g, 'pain');
      // 3/6 = 50%
      expect(buildDiscoveryWorkspaceReport(g).score).toBe(50);
    });

    it('score=100 quando todas as 6 kinds têm items', () => {
      let g = makeGraph();
      (['persona', 'need', 'job', 'pain', 'problemHypothesis', 'evidence'] as DiscoveryKind[]).forEach(k => {
        g = withEntity(g, k);
      });
      expect(buildDiscoveryWorkspaceReport(g).score).toBe(100);
    });
  });

  describe('status', () => {
    it('status="empty" quando completedChecks=0', () => {
      expect(buildDiscoveryWorkspaceReport(makeGraph()).status).toBe('empty');
    });

    it('status="started" quando tem items mas minimumContextReady=false', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      expect(buildDiscoveryWorkspaceReport(g).status).toBe('started');
    });

    it('status="ready" quando minimumContextReady=true', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      g = withEntity(g, 'need');
      g = withEntity(g, 'pain');
      g = withEntity(g, 'evidence');
      expect(buildDiscoveryWorkspaceReport(g).status).toBe('ready');
    });
  });

  describe('minimumContextReady', () => {
    it('false sem persona', () => {
      let g = makeGraph();
      g = withEntity(g, 'need');
      g = withEntity(g, 'pain');
      g = withEntity(g, 'evidence');
      expect(buildDiscoveryWorkspaceReport(g).minimumContextReady).toBe(false);
    });

    it('false sem need nem job', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      g = withEntity(g, 'pain');
      g = withEntity(g, 'evidence');
      expect(buildDiscoveryWorkspaceReport(g).minimumContextReady).toBe(false);
    });

    it('true quando tem persona + job (sem need) + pain + evidence', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      g = withEntity(g, 'job');
      g = withEntity(g, 'pain');
      g = withEntity(g, 'evidence');
      expect(buildDiscoveryWorkspaceReport(g).minimumContextReady).toBe(true);
    });

    it('true quando tem persona + need + problemHypothesis (sem pain) + evidence', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      g = withEntity(g, 'need');
      g = withEntity(g, 'problemHypothesis');
      g = withEntity(g, 'evidence');
      expect(buildDiscoveryWorkspaceReport(g).minimumContextReady).toBe(true);
    });

    it('false sem evidence', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      g = withEntity(g, 'need');
      g = withEntity(g, 'pain');
      expect(buildDiscoveryWorkspaceReport(g).minimumContextReady).toBe(false);
    });
  });

  describe('nextMissing', () => {
    it('aponta para o primeiro kind vazio', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona');
      // need está vazio → nextMissing='need'
      expect(buildDiscoveryWorkspaceReport(g).nextMissing).toBe('need');
    });

    it('null quando todos os kinds têm items', () => {
      let g = makeGraph();
      (['persona', 'need', 'job', 'pain', 'problemHypothesis', 'evidence'] as DiscoveryKind[]).forEach(k => {
        g = withEntity(g, k);
      });
      expect(buildDiscoveryWorkspaceReport(g).nextMissing).toBeNull();
    });
  });

  describe('recent', () => {
    it('inclui discoveryKind em cada item', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona', { id: 'p1', updatedAt: NOW });
      const { recent } = buildDiscoveryWorkspaceReport(g);
      expect(recent[0].discoveryKind).toBe('persona');
    });

    it('ordena por updatedAt decrescente', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona', { id: 'old', updatedAt: NOW });
      g = withEntity(g, 'need', { id: 'new', updatedAt: NOW2 });
      const { recent } = buildDiscoveryWorkspaceReport(g);
      expect(recent[0].id).toBe('new');
      expect(recent[1].id).toBe('old');
    });

    it('limita a 12 items', () => {
      let g = makeGraph();
      (['persona', 'need', 'job', 'pain', 'problemHypothesis', 'evidence'] as DiscoveryKind[]).forEach(k => {
        g = withEntity(g, k, { id: `${k}-a` });
        g = withEntity(g, k, { id: `${k}-b` });
        g = withEntity(g, k, { id: `${k}-c` });
      });
      expect(buildDiscoveryWorkspaceReport(g).recent).toHaveLength(12);
    });
  });

  describe('relationshipCount', () => {
    it('conta pares únicos entre entidades de discovery', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona', { id: 'p1' });
      g = withEntity(g, 'need', { id: 'n1', relatedIds: ['p1'] });
      // pair: p1<->n1 = 1
      expect(buildDiscoveryWorkspaceReport(g).relationshipCount).toBe(1);
    });

    it('não conta self-relations', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona', { id: 'p1', relatedIds: ['p1'] });
      expect(buildDiscoveryWorkspaceReport(g).relationshipCount).toBe(0);
    });

    it('não conta relações com ids fora do conjunto de discovery', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona', { id: 'p1', relatedIds: ['external-id'] });
      expect(buildDiscoveryWorkspaceReport(g).relationshipCount).toBe(0);
    });

    it('conta par apenas uma vez mesmo com relação bidirecional', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona', { id: 'p1', relatedIds: ['n1'] });
      g = withEntity(g, 'need', { id: 'n1', relatedIds: ['p1'] });
      expect(buildDiscoveryWorkspaceReport(g).relationshipCount).toBe(1);
    });

    it('usa personaIds, needIds, painIds etc como fontes de relação', () => {
      let g = makeGraph();
      g = withEntity(g, 'persona', { id: 'p1' });
      g = withEntity(g, 'pain', { id: 'pain1', personaIds: ['p1'] } as any);
      expect(buildDiscoveryWorkspaceReport(g).relationshipCount).toBe(1);
    });
  });
});

// ─── createDiscoveryEntity ───────────────────────────────────────────────────

describe('createDiscoveryEntity', () => {
  const baseInput = { graph: makeGraph(), kind: 'persona' as DiscoveryKind, title: 'Minha Persona', now: NOW };

  it('retorna type igual ao kind', () => {
    expect(createDiscoveryEntity(baseInput).type).toBe('persona');
  });

  it('retorna serviceId do graph', () => {
    const g = makeGraph();
    const entity = createDiscoveryEntity({ graph: g, kind: 'persona', title: 'T', now: NOW });
    expect(entity.serviceId).toBe(g.service.id);
  });

  it('trimma o título', () => {
    const entity = createDiscoveryEntity({ ...baseInput, title: '  Título com espaço  ' });
    expect(entity.title).toBe('Título com espaço');
  });

  it('trimma a description', () => {
    const entity = createDiscoveryEntity({ ...baseInput, description: '  Desc  ' });
    expect(entity.description).toBe('Desc');
  });

  it('description vazia como padrão quando ausente', () => {
    expect(createDiscoveryEntity(baseInput).description).toBe('');
  });

  it('status="active" para persona', () => {
    expect(createDiscoveryEntity(baseInput).status).toBe('active');
  });

  it('status="active" para need', () => {
    const entity = createDiscoveryEntity({ ...baseInput, kind: 'need' });
    expect(entity.status).toBe('active');
  });

  it('status="hypothesis" para problemHypothesis', () => {
    const entity = createDiscoveryEntity({ ...baseInput, kind: 'problemHypothesis' });
    expect(entity.status).toBe('hypothesis');
  });

  it('status="captured" para evidence', () => {
    const entity = createDiscoveryEntity({ ...baseInput, kind: 'evidence' });
    expect(entity.status).toBe('captured');
  });

  it('evidence recebe confidence padrão "medium"', () => {
    const entity = createDiscoveryEntity({ ...baseInput, kind: 'evidence' });
    expect((entity as any).confidence).toBe('medium');
  });

  it('evidence usa confidence do input quando fornecido', () => {
    const entity = createDiscoveryEntity({ ...baseInput, kind: 'evidence', confidence: 'high' });
    expect((entity as any).confidence).toBe('high');
  });

  it('evidence recebe sourceType padrão "observation"', () => {
    const entity = createDiscoveryEntity({ ...baseInput, kind: 'evidence' });
    expect((entity as any).sourceType).toBe('observation');
  });

  it('evidence usa sourceType do input quando fornecido', () => {
    const entity = createDiscoveryEntity({ ...baseInput, kind: 'evidence', sourceType: 'interview' });
    expect((entity as any).sourceType).toBe('interview');
  });

  it('persona não recebe confidence nem sourceType', () => {
    const entity = createDiscoveryEntity(baseInput);
    expect((entity as any).confidence).toBeUndefined();
    expect((entity as any).sourceType).toBeUndefined();
  });

  it('usa id do input quando fornecido', () => {
    const entity = createDiscoveryEntity({ ...baseInput, id: 'meu-id-fixo' });
    expect(entity.id).toBe('meu-id-fixo');
  });

  it('gera id com prefixo do kind quando não fornecido', () => {
    const entity = createDiscoveryEntity({ graph: makeGraph(), kind: 'need', title: 'T', now: NOW });
    expect(entity.id).toMatch(/^need-/);
  });

  it('usa now do input para createdAt e updatedAt', () => {
    const entity = createDiscoveryEntity({ ...baseInput, now: NOW2 });
    expect(entity.createdAt).toBe(NOW2);
    expect(entity.updatedAt).toBe(NOW2);
  });

  it('deduplica relatedIds', () => {
    const entity = createDiscoveryEntity({ ...baseInput, relatedIds: ['a', 'b', 'a'] });
    expect(entity.relatedIds).toEqual(['a', 'b']);
  });

  it('relatedIds vazio como padrão', () => {
    expect(createDiscoveryEntity(baseInput).relatedIds).toEqual([]);
  });
});

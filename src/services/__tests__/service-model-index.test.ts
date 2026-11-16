import { describe, it, expect } from 'vitest';
import {
  serviceModelIndex,
  serviceModelKindFromContextKind,
  resolveObject,
  relationsFor,
  usageFor,
  coverageFor,
  serviceModelUsage,
} from '../service-model-index';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-11-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', name: 'My Service', updatedAt: NOW } };
}

function withJourney(graph: ServiceGraph, id: string, stageIds: string[] = []): ServiceGraph {
  return {
    ...graph,
    service: { ...graph.service, journeyIds: [...(graph.service.journeyIds ?? []), id] },
    journeys: {
      ...graph.journeys,
      [id]: { id, serviceId: 'S', name: `Journey ${id}`, status: 'active', stageIds, createdAt: NOW, updatedAt: NOW } as ServiceGraph['journeys'][string],
    },
  };
}

function withStage(graph: ServiceGraph, id: string, journeyId: string, touchpointIds: string[] = []): ServiceGraph {
  return {
    ...graph,
    stages: {
      ...graph.stages,
      [id]: {
        id, journeyId, serviceId: 'S', title: `Stage ${id}`, customerAction: '', touchpointIds,
        opportunityIds: [], problemIds: [], createdAt: NOW, updatedAt: NOW,
      } as ServiceGraph['stages'][string],
    },
  };
}

function withTouchpoint(graph: ServiceGraph, id: string, channelId?: string): ServiceGraph {
  return {
    ...graph,
    touchpoints: {
      ...graph.touchpoints,
      [id]: { id, serviceId: 'S', name: `TP ${id}`, channel: '', channelId, createdAt: NOW, updatedAt: NOW } as ServiceGraph['touchpoints'][string],
    },
  };
}

function withEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: { ...(graph.entities?.[kind] ?? {}), [id]: { id, serviceId: 'S', kind, createdAt: NOW, updatedAt: NOW, ...extra } },
    },
  } as ServiceGraph;
}

function withChannel(graph: ServiceGraph, id: string, name: string): ServiceGraph {
  return {
    ...graph,
    channels: {
      ...(graph.channels ?? {}),
      [id]: { id, serviceId: 'S', name, kind: 'digital', active: true, createdAt: NOW, updatedAt: NOW },
    },
  } as ServiceGraph;
}

// ─── serviceModelKindFromContextKind ─────────────────────────────────────────

describe('serviceModelKindFromContextKind', () => {
  it('maps known entity kinds to ServiceModelKind', () => {
    expect(serviceModelKindFromContextKind('persona')).toBe('persona');
    expect(serviceModelKindFromContextKind('evidence')).toBe('evidence');
    expect(serviceModelKindFromContextKind('metric')).toBe('metric');
    expect(serviceModelKindFromContextKind('pain')).toBe('pain');
  });
  it('maps problem to validatedProblem', () => {
    expect(serviceModelKindFromContextKind('problem')).toBe('validatedProblem');
  });
  it('falls back to entity:<kind> for unknown kinds', () => {
    expect(serviceModelKindFromContextKind('customThing')).toBe('entity:customThing');
  });
});

// ─── serviceModelIndex — basic structure ─────────────────────────────────────

describe('serviceModelIndex — basic structure', () => {
  it('always includes the service node', () => {
    const index = serviceModelIndex(base());
    expect(index.nodes['service:S']).toBeDefined();
    expect(index.nodes['service:S'].label).toBe('My Service');
    expect(index.nodes['service:S'].domain).toBe('service');
  });

  it('version is 1', () => {
    expect(serviceModelIndex(base()).version).toBe(1);
  });

  it('serviceId matches graph service id', () => {
    expect(serviceModelIndex(base()).serviceId).toBe('S');
  });

  it('empty graph has no relations', () => {
    const index = serviceModelIndex(base());
    expect(index.relations).toHaveLength(0);
  });
});

// ─── serviceModelIndex — journeys and stages ──────────────────────────────────

describe('serviceModelIndex — journeys and stages', () => {
  it('registers journey node with correct kind and domain', () => {
    const g = withJourney(base(), 'j1');
    const index = serviceModelIndex(g);
    const node = index.nodes['journey:j1'];
    expect(node).toBeDefined();
    expect(node.kind).toBe('journey');
    expect(node.domain).toBe('design');
  });

  it('registers stage node linked to its journey', () => {
    const g = withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1');
    const index = serviceModelIndex(g);
    expect(index.nodes['stage:s1']).toBeDefined();
    // Journey has outgoing relation containsStage to stage
    const rel = index.outgoing['journey:j1']?.find(r => r.type === 'containsStage');
    expect(rel?.toKey).toBe('stage:s1');
  });

  it('stage has belongsToJourney relation back to journey', () => {
    const g = withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1');
    const index = serviceModelIndex(g);
    const rel = index.outgoing['stage:s1']?.find(r => r.type === 'belongsToJourney');
    expect(rel?.toKey).toBe('journey:j1');
  });

  it('touchpoints linked to stage via touchpoint relation', () => {
    const g = withTouchpoint(withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1', ['tp1']), 'tp1');
    const index = serviceModelIndex(g);
    const rel = index.outgoing['stage:s1']?.find(r => r.type === 'touchpoint');
    expect(rel?.toKey).toBe('touchpoint:tp1');
  });

  it('touchpoint with channelId has channel relation', () => {
    const g = withTouchpoint(withChannel(withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1', ['tp1']), 'ch1', 'Web'), 'tp1', 'ch1');
    const index = serviceModelIndex(g);
    const rel = index.outgoing['touchpoint:tp1']?.find(r => r.type === 'channel');
    expect(rel?.toKey).toBe('channel:ch1');
  });
});

// ─── serviceModelIndex — entities ─────────────────────────────────────────────

describe('serviceModelIndex — entities', () => {
  it('registers persona entity', () => {
    const g = withEntity(base(), 'persona', 'per1', { title: 'Primary Persona' });
    const index = serviceModelIndex(g);
    const node = index.nodes['persona:per1'];
    expect(node).toBeDefined();
    expect(node.label).toBe('Primary Persona');
    expect(node.domain).toBe('people');
  });

  it('registers evidence entity with discovery domain', () => {
    const g = withEntity(base(), 'evidence', 'ev1', { title: 'Key Finding' });
    const index = serviceModelIndex(g);
    expect(index.nodes['evidence:ev1']?.domain).toBe('discovery');
  });

  it('maps process entity to operation domain via entity: prefix', () => {
    const g = withEntity(base(), 'process', 'proc1', { title: 'Support Process' });
    const index = serviceModelIndex(g);
    const node = index.nodes['entity:process:proc1'];
    expect(node).toBeDefined();
    expect(node.domain).toBe('operation');
  });

  it('maps benefit entity to improvement domain', () => {
    const g = withEntity(base(), 'benefit', 'ben1', { title: 'Benefit 1' });
    const index = serviceModelIndex(g);
    expect(index.nodes['entity:benefit:ben1']?.domain).toBe('improvement');
  });

  it('maps unknown entity kind to other domain', () => {
    const g = withEntity(base(), 'customKind', 'c1', { title: 'Custom' });
    const index = serviceModelIndex(g);
    expect(index.nodes['entity:customKind:c1']?.domain).toBe('other');
  });
});

// ─── serviceModelIndex — keysById ─────────────────────────────────────────────

describe('serviceModelIndex — keysById', () => {
  it('maps id to key array', () => {
    const g = withJourney(base(), 'j1');
    const index = serviceModelIndex(g);
    expect(index.keysById['j1']).toContain('journey:j1');
  });

  it('same id registered under multiple kinds', () => {
    // Service ID 'S' may appear in both service and entity:proposition
    const g = {
      ...base(),
      service: {
        ...base().service,
        proposition: { current: { id: 'S', title: 'Proposition', linkedInsightIds: [], linkedNeedIds: [], linkedProblemIds: [], linkedEvidenceIds: [] } },
      },
    } as ServiceGraph;
    const index = serviceModelIndex(g);
    expect(index.keysById['S']?.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── resolveObject ────────────────────────────────────────────────────────────

describe('resolveObject', () => {
  it('returns node for existing kind/id', () => {
    const g = withJourney(base(), 'j1');
    const index = serviceModelIndex(g);
    const node = resolveObject(index, 'journey', 'j1');
    expect(node?.id).toBe('j1');
  });

  it('returns null for missing node', () => {
    const index = serviceModelIndex(base());
    expect(resolveObject(index, 'journey', 'ghost')).toBeNull();
  });
});

// ─── relationsFor ─────────────────────────────────────────────────────────────

describe('relationsFor', () => {
  it('returns combined incoming and outgoing relations, deduplicated', () => {
    const g = withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1');
    const index = serviceModelIndex(g);
    const rels = relationsFor(index, 'journey', 'j1');
    expect(rels.length).toBeGreaterThan(0);
    // Should include the containsStage relation
    expect(rels.some(r => r.type === 'containsStage')).toBe(true);
  });

  it('returns empty array for unrelated node', () => {
    const index = serviceModelIndex(base());
    // Service node should have no relations (nothing to connect to in empty graph)
    const rels = relationsFor(index, 'service', 'S');
    expect(rels).toEqual([]);
  });
});

// ─── usageFor ─────────────────────────────────────────────────────────────────

describe('usageFor', () => {
  it('outgoingCount matches relations from the node', () => {
    const g = withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1');
    const index = serviceModelIndex(g);
    const usage = usageFor(index, 'journey', 'j1');
    expect(usage.outgoingCount).toBeGreaterThan(0);
  });

  it('incomingCount matches relations to the node', () => {
    const g = withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1');
    const index = serviceModelIndex(g);
    const usage = usageFor(index, 'stage', 's1');
    expect(usage.incomingCount).toBeGreaterThan(0); // journey → stage
  });

  it('byKind counts related node kinds', () => {
    const g = withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1');
    const index = serviceModelIndex(g);
    const usage = usageFor(index, 'journey', 'j1');
    expect(usage.byKind['stage']).toBeGreaterThanOrEqual(1);
  });

  it('instances counts whiteboard visualize relations', () => {
    // No whiteboard in base graph
    const index = serviceModelIndex(base());
    const usage = usageFor(index, 'service', 'S');
    expect(usage.instances).toBe(0);
  });

  it('serviceModelUsage convenience wrapper returns same result', () => {
    const g = withJourney(base(), 'j1', ['s1']);
    const direct = usageFor(serviceModelIndex(g), 'journey', 'j1');
    const convenience = serviceModelUsage(g, 'journey', 'j1');
    expect(convenience.relationCount).toBe(direct.relationCount);
  });
});

// ─── coverageFor ──────────────────────────────────────────────────────────────

describe('coverageFor', () => {
  it('empty graph has only service node — totalNodes excludes service itself', () => {
    const index = serviceModelIndex(base());
    const cov = coverageFor(index);
    expect(cov.totalNodes).toBe(0);
    expect(cov.totalRelations).toBe(0);
  });

  it('connected nodes are counted as linked', () => {
    const g = withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1');
    const index = serviceModelIndex(g);
    const cov = coverageFor(index);
    expect(cov.linkedNodes).toBeGreaterThan(0);
    expect(cov.linkagePercent).toBeGreaterThan(0);
  });

  it('orphanNodes = totalNodes - linkedNodes', () => {
    const g = withEntity(base(), 'customKind', 'c1', { title: 'Orphan' });
    const index = serviceModelIndex(g);
    const cov = coverageFor(index);
    expect(cov.orphanNodes).toBe(cov.totalNodes - cov.linkedNodes);
  });

  it('countsByDomain includes design domain when journey present', () => {
    const g = withJourney(base(), 'j1');
    const index = serviceModelIndex(g);
    const cov = coverageFor(index);
    expect(cov.countsByDomain.design).toBeGreaterThan(0);
  });

  it('critical keys include persona, journey, metric etc.', () => {
    const index = serviceModelIndex(base());
    const cov = coverageFor(index);
    expect(cov.critical['persona']).toBeDefined();
    expect(cov.critical['journey']).toBeDefined();
    expect(cov.critical['metric']).toBeDefined();
  });

  it('critical coverage is 100% when all critical nodes have relations', () => {
    const g = withStage(withJourney(base(), 'j1', ['s1']), 's1', 'j1');
    const index = serviceModelIndex(g);
    const cov = coverageFor(index);
    // journey j1 is linked (has stage relation)
    expect(cov.critical['journey'].coverage).toBe(100);
  });
});

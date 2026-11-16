import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';
import {
  STAKEHOLDER_KIND_LABELS,
  ECOLOGY_RELATION_LABELS,
  emptyServiceEcology,
  getServiceEcology,
  createServiceStakeholder,
  updateServiceStakeholder,
  removeServiceStakeholder,
  createEcologyRelation,
  removeEcologyRelation,
  syncPersonasToServiceEcology,
  buildServiceEcologyReport,
} from '../service-ecology';

const NOW = '2025-06-01T12:00:00.000Z';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

function addStakeholder(graph: ServiceGraph, name: string, kind: 'customer' | 'employee' | 'partner' = 'customer') {
  return createServiceStakeholder({ graph, name, kind });
}

function stakeholderIds(graph: ServiceGraph): string[] {
  return Object.keys(getServiceEcology(graph).stakeholders);
}

function relationIds(graph: ServiceGraph): string[] {
  return Object.keys(getServiceEcology(graph).relations);
}

// ─── label maps ────────────────────────────────────────────────────────────

describe('label maps', () => {
  it('STAKEHOLDER_KIND_LABELS tem 10 entradas', () => {
    expect(Object.keys(STAKEHOLDER_KIND_LABELS)).toHaveLength(10);
  });
  it('ECOLOGY_RELATION_LABELS tem 9 entradas', () => {
    expect(Object.keys(ECOLOGY_RELATION_LABELS)).toHaveLength(9);
  });
});

// ─── emptyServiceEcology ──────────────────────────────────────────────────

describe('emptyServiceEcology', () => {
  it('retorna state vazio', () => {
    const state = emptyServiceEcology('svc-1', NOW);
    expect(state.version).toBe(1);
    expect(state.stakeholders).toEqual({});
    expect(state.relations).toEqual({});
    expect(state.updatedAt).toBe(NOW);
  });
});

// ─── getServiceEcology ────────────────────────────────────────────────────

describe('getServiceEcology', () => {
  it('retorna ecology existente', () => {
    const ecology = emptyServiceEcology('svc', NOW);
    const graph = { ...makeGraph(), service: { ...makeGraph().service, ecology } };
    expect(getServiceEcology(graph)).toBe(ecology);
  });

  it('cria ecology vazia quando não existe', () => {
    const ecology = getServiceEcology(makeGraph());
    expect(ecology.stakeholders).toEqual({});
    expect(ecology.relations).toEqual({});
  });
});

// ─── createServiceStakeholder ────────────────────────────────────────────

describe('createServiceStakeholder', () => {
  it('cria stakeholder com nome válido', () => {
    const graph = addStakeholder(makeGraph(), 'Cliente A');
    const ids = stakeholderIds(graph);
    expect(ids).toHaveLength(1);
    const s = getServiceEcology(graph).stakeholders[ids[0]];
    expect(s.name).toBe('Cliente A');
    expect(s.kind).toBe('customer');
  });

  it('retorna grafo sem mudança para nome vazio', () => {
    const graph = makeGraph();
    const result = createServiceStakeholder({ graph, name: '', kind: 'customer' });
    expect(result).toBe(graph);
  });

  it('retorna grafo sem mudança para nome somente espaços', () => {
    const graph = makeGraph();
    const result = createServiceStakeholder({ graph, name: '   ', kind: 'customer' });
    expect(result).toBe(graph);
  });

  it('usa defaults: influence=3, interest=3', () => {
    const graph = addStakeholder(makeGraph(), 'Fornecedor', 'partner');
    const ids = stakeholderIds(graph);
    const s = getServiceEcology(graph).stakeholders[ids[0]];
    expect(s.influence).toBe(3);
    expect(s.interest).toBe(3);
  });

  it('aceita influence e interest customizados', () => {
    const graph = createServiceStakeholder({ graph: makeGraph(), name: 'Gestor', kind: 'manager', influence: 5, interest: 4 });
    const ids = stakeholderIds(graph);
    const s = getServiceEcology(graph).stakeholders[ids[0]];
    expect(s.influence).toBe(5);
    expect(s.interest).toBe(4);
  });

  it('armazena campos opcionais', () => {
    const graph = createServiceStakeholder({
      graph: makeGraph(),
      name: 'Usuário',
      kind: 'customer',
      role: 'Comprador',
      summary: 'Resumo',
      goals: 'Metas',
      needs: 'Necessidades',
    });
    const s = getServiceEcology(graph).stakeholders[stakeholderIds(graph)[0]];
    expect(s.role).toBe('Comprador');
    expect(s.summary).toBe('Resumo');
    expect(s.goals).toBe('Metas');
    expect(s.needs).toBe('Necessidades');
  });

  it('múltiplos stakeholders podem ser criados', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    graph = addStakeholder(graph, 'C');
    expect(stakeholderIds(graph)).toHaveLength(3);
  });
});

// ─── updateServiceStakeholder ────────────────────────────────────────────

describe('updateServiceStakeholder', () => {
  it('atualiza o nome do stakeholder', () => {
    let graph = addStakeholder(makeGraph(), 'Antigo');
    const id = stakeholderIds(graph)[0];
    graph = updateServiceStakeholder({ graph, stakeholderId: id, patch: { name: 'Novo' } });
    expect(getServiceEcology(graph).stakeholders[id].name).toBe('Novo');
  });

  it('retorna grafo sem mudança para id inexistente', () => {
    const graph = addStakeholder(makeGraph(), 'A');
    const result = updateServiceStakeholder({ graph, stakeholderId: 'nope', patch: { name: 'X' } });
    expect(result).toBe(graph);
  });

  it('atualiza influence', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    const id = stakeholderIds(graph)[0];
    graph = updateServiceStakeholder({ graph, stakeholderId: id, patch: { influence: 5 } });
    expect(getServiceEcology(graph).stakeholders[id].influence).toBe(5);
  });

  it('faz trim nos campos de texto', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    const id = stakeholderIds(graph)[0];
    graph = updateServiceStakeholder({ graph, stakeholderId: id, patch: { role: '  Líder  ' } });
    expect(getServiceEcology(graph).stakeholders[id].role).toBe('Líder');
  });

  it('deduplica evidenceIds no patch', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    const id = stakeholderIds(graph)[0];
    graph = updateServiceStakeholder({ graph, stakeholderId: id, patch: { evidenceIds: ['e1', 'e1', 'e2'] } });
    expect(getServiceEcology(graph).stakeholders[id].evidenceIds).toEqual(['e1', 'e2']);
  });
});

// ─── removeServiceStakeholder ────────────────────────────────────────────

describe('removeServiceStakeholder', () => {
  it('remove stakeholder existente', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    const id = stakeholderIds(graph)[0];
    graph = removeServiceStakeholder(graph, id);
    expect(stakeholderIds(graph)).toHaveLength(0);
  });

  it('retorna grafo sem mudança para id inexistente', () => {
    const graph = addStakeholder(makeGraph(), 'A');
    const result = removeServiceStakeholder(graph, 'nope');
    expect(result).toBe(graph);
  });

  it('remove relações do stakeholder removido', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    const [idA, idB] = stakeholderIds(graph);
    graph = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'uses' });
    expect(relationIds(graph)).toHaveLength(1);
    graph = removeServiceStakeholder(graph, idA);
    expect(relationIds(graph)).toHaveLength(0); // relação removida junto
  });

  it('mantém relações que não envolvem o stakeholder removido', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    graph = addStakeholder(graph, 'C');
    const [idA, idB, idC] = stakeholderIds(graph);
    graph = createEcologyRelation({ graph, fromId: idB, toId: idC, kind: 'delivers' });
    graph = removeServiceStakeholder(graph, idA);
    expect(relationIds(graph)).toHaveLength(1); // relação B→C preservada
  });
});

// ─── createEcologyRelation ───────────────────────────────────────────────

describe('createEcologyRelation', () => {
  it('cria relação entre dois stakeholders', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    const [idA, idB] = stakeholderIds(graph);
    graph = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'uses' });
    expect(relationIds(graph)).toHaveLength(1);
  });

  it('retorna grafo sem mudança quando fromId === toId', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    const id = stakeholderIds(graph)[0];
    const result = createEcologyRelation({ graph, fromId: id, toId: id, kind: 'uses' });
    expect(result).toBe(graph);
  });

  it('retorna grafo sem mudança quando stakeholder não existe', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    const id = stakeholderIds(graph)[0];
    const result = createEcologyRelation({ graph, fromId: id, toId: 'nope', kind: 'uses' });
    expect(result).toBe(graph);
  });

  it('impede relação duplicada (mesmo from+to+kind)', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    const [idA, idB] = stakeholderIds(graph);
    graph = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'uses' });
    const result = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'uses' });
    expect(result).toBe(graph); // sem mudança
  });

  it('permite relação diferente entre mesmo par (kind diferente)', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    const [idA, idB] = stakeholderIds(graph);
    graph = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'uses' });
    graph = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'pays' });
    expect(relationIds(graph)).toHaveLength(2);
  });

  it('usa strength=medium por padrão', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    const [idA, idB] = stakeholderIds(graph);
    graph = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'delivers' });
    const rel = getServiceEcology(graph).relations[relationIds(graph)[0]];
    expect(rel.strength).toBe('medium');
  });
});

// ─── removeEcologyRelation ───────────────────────────────────────────────

describe('removeEcologyRelation', () => {
  it('remove relação existente', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    const [idA, idB] = stakeholderIds(graph);
    graph = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'uses' });
    const relId = relationIds(graph)[0];
    graph = removeEcologyRelation(graph, relId);
    expect(relationIds(graph)).toHaveLength(0);
  });

  it('retorna grafo sem mudança para id inexistente', () => {
    const graph = addStakeholder(makeGraph(), 'A');
    const result = removeEcologyRelation(graph, 'nope');
    expect(result).toBe(graph);
  });
});

// ─── syncPersonasToServiceEcology ────────────────────────────────────────

describe('syncPersonasToServiceEcology', () => {
  it('retorna created=0 quando não há personas', () => {
    const { created } = syncPersonasToServiceEcology(makeGraph());
    expect(created).toBe(0);
  });

  it('cria stakeholder para cada persona com nome', () => {
    const persona1 = { id: 'p1', type: 'persona', serviceId: 'svc', title: 'Persona A', createdAt: NOW, updatedAt: NOW };
    const persona2 = { id: 'p2', type: 'persona', serviceId: 'svc', title: 'Persona B', createdAt: NOW, updatedAt: NOW };
    const graph = { ...makeGraph(), entities: { persona: { p1: persona1, p2: persona2 } } };
    const { created, graph: next } = syncPersonasToServiceEcology(graph);
    expect(created).toBe(2);
    const stakeholders = Object.values(getServiceEcology(next).stakeholders);
    expect(stakeholders.map((s) => s.personaId).sort()).toEqual(['p1', 'p2'].sort());
  });

  it('ignora personas sem nome', () => {
    const persona = { id: 'p1', type: 'persona', serviceId: 'svc', title: '', createdAt: NOW, updatedAt: NOW };
    const graph = { ...makeGraph(), entities: { persona: { p1: persona } } };
    const { created } = syncPersonasToServiceEcology(graph);
    expect(created).toBe(0);
  });

  it('não duplica persona já vinculada', () => {
    const persona = { id: 'p1', type: 'persona', serviceId: 'svc', title: 'Persona A', createdAt: NOW, updatedAt: NOW };
    let graph = { ...makeGraph(), entities: { persona: { p1: persona } } };
    const r1 = syncPersonasToServiceEcology(graph);
    const r2 = syncPersonasToServiceEcology(r1.graph);
    expect(r1.created).toBe(1);
    expect(r2.created).toBe(0);
  });

  it('vincula persona ao stakeholder via personaId', () => {
    const persona = { id: 'p1', type: 'persona', serviceId: 'svc', title: 'Cliente X', createdAt: NOW, updatedAt: NOW };
    const graph = { ...makeGraph(), entities: { persona: { p1: persona } } };
    const { graph: next } = syncPersonasToServiceEcology(graph);
    const stakeholders = Object.values(getServiceEcology(next).stakeholders);
    expect(stakeholders[0].personaId).toBe('p1');
    expect(stakeholders[0].kind).toBe('customer');
  });
});

// ─── buildServiceEcologyReport ───────────────────────────────────────────

describe('buildServiceEcologyReport', () => {
  it('retorna report zerado para grafo sem ecology', () => {
    const report = buildServiceEcologyReport(makeGraph());
    expect(report.stakeholderCount).toBe(0);
    expect(report.relationCount).toBe(0);
    expect(report.score).toBe(0);
  });

  it('contabiliza stakeholders e relações', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    const [idA, idB] = stakeholderIds(graph);
    graph = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'uses' });
    const report = buildServiceEcologyReport(graph);
    expect(report.stakeholderCount).toBe(2);
    expect(report.relationCount).toBe(1);
  });

  it('identifica stakeholders desconectados', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    // sem relações → ambos desconectados
    const report = buildServiceEcologyReport(graph);
    expect(report.disconnectedStakeholderIds).toHaveLength(2);
    expect(report.connectedStakeholderCount).toBe(0);
  });

  it('identifica stakeholders de alta influência (>= 4)', () => {
    const graph = createServiceStakeholder({ graph: makeGraph(), name: 'CEO', kind: 'manager', influence: 5, interest: 5 });
    const report = buildServiceEcologyReport(graph);
    expect(report.highInfluenceIds).toHaveLength(1);
  });

  it('contabiliza evidenceLinkedCount', () => {
    const graph = createServiceStakeholder({ graph: makeGraph(), name: 'Cliente', kind: 'customer', evidenceIds: ['e1', 'e2'] });
    const report = buildServiceEcologyReport(graph);
    expect(report.evidenceLinkedCount).toBe(1);
  });

  it('score > 0 quando há stakeholders e relações', () => {
    let graph = addStakeholder(makeGraph(), 'A');
    graph = addStakeholder(graph, 'B');
    const [idA, idB] = stakeholderIds(graph);
    graph = createEcologyRelation({ graph, fromId: idA, toId: idB, kind: 'uses' });
    expect(buildServiceEcologyReport(graph).score).toBeGreaterThan(0);
  });

  it('score está entre 0 e 100', () => {
    let graph = makeGraph();
    for (let i = 0; i < 10; i++) graph = addStakeholder(graph, `Stakeholder ${i}`);
    const ids = stakeholderIds(graph);
    for (let i = 0; i < ids.length - 1; i++) {
      graph = createEcologyRelation({ graph, fromId: ids[i], toId: ids[i + 1], kind: 'uses' });
    }
    const { score } = buildServiceEcologyReport(graph);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('contabiliza representedKinds únicos', () => {
    let graph = createServiceStakeholder({ graph: makeGraph(), name: 'Cliente', kind: 'customer' });
    graph = createServiceStakeholder({ graph, name: 'Funcionário', kind: 'employee' });
    graph = createServiceStakeholder({ graph, name: 'Parceiro', kind: 'partner' });
    const report = buildServiceEcologyReport(graph);
    expect(report.representedKinds).toBe(3);
  });
});

import { describe, it, expect } from 'vitest';
import { makeId, createBlankWorkspaceGraph, createServiceGraph, deleteStageFromGraph } from '../graph-operations';
import { validateGraphIntegrity, repairGraphReferences } from '../integrity';
import { CURRENT_SCHEMA_VERSION, migrateProject } from '../migrations';

// ─── makeId ──────────────────────────────────────────────────────────────────

describe('makeId', () => {
  it('gera id com prefixo correto', () => {
    const id = makeId('stage');
    expect(id).toMatch(/^stage-/);
  });

  it('gera ids únicos em 1000 iterações', () => {
    const ids = new Set(Array.from({ length: 1000 }, () => makeId('t')));
    expect(ids.size).toBe(1000);
  });

  it('nunca gera string vazia', () => {
    for (let i = 0; i < 50; i++) {
      expect(makeId('x').length).toBeGreaterThan(2);
    }
  });
});

// ─── validateGraphIntegrity ───────────────────────────────────────────────────

describe('validateGraphIntegrity', () => {
  it('grafo blank válido retorna ok=true', () => {
    const graph = createBlankWorkspaceGraph();
    const report = validateGraphIntegrity(graph);
    expect(report.ok).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('grafo novo de serviço retorna ok=true', () => {
    const graph = createServiceGraph('Teste', 'Descrição');
    const report = validateGraphIntegrity(graph);
    expect(report.ok).toBe(true);
  });

  it('detecta stageId inconsistente na jornada', () => {
    const graph = createServiceGraph('Serviço X');
    // Inserir stageId fantasma em uma jornada
    const journeyId = Object.keys(graph.journeys)[0];
    if (journeyId) {
      graph.journeys[journeyId].stageIds = ['id-fantasma-123'];
      const report = validateGraphIntegrity(graph);
      expect(report.ok).toBe(false);
      expect(report.errors.some(e => e.code === 'journey-stage')).toBe(true);
    }
  });

  it('reporta a versão correta de schema', () => {
    const graph = createBlankWorkspaceGraph();
    const report = validateGraphIntegrity(graph);
    expect(report.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('detecta schema version inválido', () => {
    const graph = createBlankWorkspaceGraph();
    // @ts-expect-error forçando versão inválida para teste
    graph.schemaVersion = 1;
    const report = validateGraphIntegrity(graph);
    expect(report.errors.some(e => e.code === 'schema-version')).toBe(true);
  });
});

// ─── repairGraphReferences ────────────────────────────────────────────────────

describe('repairGraphReferences', () => {
  it('remove stageIds fantasmas da jornada', () => {
    const graph = createServiceGraph('Serviço Y');
    const journeyId = Object.keys(graph.journeys)[0];
    if (journeyId) {
      graph.journeys[journeyId].stageIds.push('id-fantasma-456');
      const repaired = repairGraphReferences(graph);
      expect(repaired.journeys[journeyId].stageIds).not.toContain('id-fantasma-456');
    }
  });

  it('não remove stageIds válidos', () => {
    const graph = createServiceGraph('Serviço Z');
    const journeyId = Object.keys(graph.journeys)[0];
    const stageCount = journeyId ? graph.journeys[journeyId].stageIds.length : 0;
    const repaired = repairGraphReferences(graph);
    if (journeyId) {
      expect(repaired.journeys[journeyId].stageIds.length).toBe(stageCount);
    }
  });

  it('grafo reparado passa na validação de integridade', () => {
    const graph = createServiceGraph('Serviço W');
    const journeyId = Object.keys(graph.journeys)[0];
    if (journeyId) {
      graph.journeys[journeyId].stageIds.push('fantasma-789');
    }
    const repaired = repairGraphReferences(graph);
    const report = validateGraphIntegrity(repaired);
    expect(report.ok).toBe(true);
  });

  it('reparo é idempotente', () => {
    const graph = createServiceGraph('Serviço V');
    const once = repairGraphReferences(graph);
    const twice = repairGraphReferences(once);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });
});

// ─── deleteStageFromGraph ─────────────────────────────────────────────────────

describe('deleteStageFromGraph', () => {
  it('deletar stage inexistente retorna grafo inalterado', () => {
    const graph = createServiceGraph('Serviço D');
    const before = JSON.stringify(graph);
    const after = deleteStageFromGraph(graph, 'id-nao-existe');
    expect(JSON.stringify(after)).toBe(before);
  });

  it('após deletar uma etapa, grafo passa na validação de integridade', () => {
    const graph = createServiceGraph('Serviço E');
    const journeyId = Object.keys(graph.journeys)[0];
    const stageId = journeyId ? graph.journeys[journeyId].stageIds[0] : undefined;
    if (stageId) {
      const updated = deleteStageFromGraph(graph, stageId);
      const report = validateGraphIntegrity(updated);
      expect(report.ok).toBe(true);
      expect(updated.stages[stageId]).toBeUndefined();
    }
  });
});

// ─── migrateProject ───────────────────────────────────────────────────────────

describe('migrateProject', () => {
  it('migra grafo v3 existente sem alteração', () => {
    const original = createServiceGraph('Migração Test');
    const migrated = migrateProject(original);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.service.name).toBe('Migração Test');
  });

  it('lança erro para payload nulo', () => {
    expect(() => migrateProject(null)).toThrow();
  });

  it('lança erro para payload array', () => {
    expect(() => migrateProject([])).toThrow();
  });

  it('lança erro para versão incompatível', () => {
    const invalid = { schemaVersion: 99, service: {} };
    expect(() => migrateProject(invalid)).toThrow(/incompatível/);
  });
});

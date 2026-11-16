import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations';
import type { CollaborationState, ServiceGraph } from '../../domain/model';
import { buildProductHardeningReport } from '../product-hardening';
import type { ProductHardeningFacts } from '../product-hardening';

const NOW = '2025-06-01T12:00:00.000Z';

// ─── helpers ───────────────────────────────────────────────────────────────

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

/** Todos os facts em true — situação ideal */
const ALL_PASS: ProductHardeningFacts = {
  dataBridge: true,
  recoveryApi: true,
  localStorage: true,
  indexedDB: true,
  webCrypto: true,
  broadcastChannel: true,
  permissionGuard: true,
  autosaveEnabled: true,
  backgroundFlush: true,
  reducedMotion: true,
  syncMode: 'connected',
};

function withCollaboration(graph: ServiceGraph, collab: Partial<CollaborationState>): ServiceGraph {
  const base: CollaborationState = {
    version: 1,
    workspaceId: 'ws-1',
    workspaceName: 'Workspace',
    currentUserId: 'user-1',
    members: {},
    comments: [],
    activity: [],
    sync: { mode: 'local-only' },
    ...collab,
  };
  return { ...graph, service: { ...graph.service, collaboration: base } };
}

function withOwner(graph: ServiceGraph, userId = 'owner-1'): ServiceGraph {
  return withCollaboration(graph, {
    currentUserId: userId,
    members: {
      [userId]: { id: userId, name: 'Owner', role: 'owner', status: 'active', createdAt: NOW },
    },
  });
}

// ─── resultado geral ────────────────────────────────────────────────────────

describe('buildProductHardeningReport — estrutura do resultado', () => {
  it('retorna todas as propriedades esperadas', () => {
    const report = buildProductHardeningReport(makeGraph());
    expect(report).toHaveProperty('readinessScore');
    expect(report).toHaveProperty('status');
    expect(report).toHaveProperty('checks');
    expect(report).toHaveProperty('blockers');
    expect(report).toHaveProperty('attention');
    expect(report).toHaveProperty('areas');
    expect(report).toHaveProperty('role');
    expect(report).toHaveProperty('syncMode');
    expect(report).toHaveProperty('openConflicts');
  });

  it('retorna exatamente 15 checks', () => {
    const { checks } = buildProductHardeningReport(makeGraph());
    expect(checks).toHaveLength(15);
  });

  it('retorna exatamente 6 areas', () => {
    const { areas } = buildProductHardeningReport(makeGraph());
    expect(areas).toHaveLength(6);
    const areaNames = areas.map((a) => a.area);
    expect(areaNames).toContain('persistence');
    expect(areaNames).toContain('recovery');
    expect(areaNames).toContain('permissions');
    expect(areaNames).toContain('integrity');
    expect(areaNames).toContain('runtime');
    expect(areaNames).toContain('accessibility');
  });

  it('readinessScore está entre 0 e 100', () => {
    const { readinessScore } = buildProductHardeningReport(makeGraph());
    expect(readinessScore).toBeGreaterThanOrEqual(0);
    expect(readinessScore).toBeLessThanOrEqual(100);
  });
});

// ─── cenário ideal: todos os facts true ─────────────────────────────────────

describe('buildProductHardeningReport — cenário ideal (all pass)', () => {
  it('com graph v3 + integrity + owner + todos facts → score alto', () => {
    const graph = withOwner(makeGraph());
    const { readinessScore, blockers } = buildProductHardeningReport(graph, ALL_PASS);
    expect(blockers).toHaveLength(0);
    expect(readinessScore).toBeGreaterThanOrEqual(90);
  });

  it('status é ready quando score >= 90 e sem blockers', () => {
    const graph = withOwner(makeGraph());
    const { status } = buildProductHardeningReport(graph, ALL_PASS);
    expect(status).toBe('ready');
  });

  it('zero checks com status blocked no cenário ideal', () => {
    const graph = withOwner(makeGraph());
    const { checks } = buildProductHardeningReport(graph, ALL_PASS);
    const blocked = checks.filter((c) => c.status === 'blocked');
    expect(blocked).toHaveLength(0);
  });
});

// ─── checks individuais ──────────────────────────────────────────────────────

describe('check: schema', () => {
  it('pass quando schemaVersion >= 3', () => {
    const graph = { ...makeGraph(), schemaVersion: 3 };
    const { checks } = buildProductHardeningReport(graph);
    const check = checks.find((c) => c.id === 'schema')!;
    expect(check.status).toBe('pass');
  });

  it('blocked quando schemaVersion < 3', () => {
    const graph = { ...makeGraph(), schemaVersion: 2 };
    const { checks } = buildProductHardeningReport(graph);
    const check = checks.find((c) => c.id === 'schema')!;
    expect(check.status).toBe('blocked');
  });
});

describe('check: integrity', () => {
  it('pass quando integrity.schemaVersion === 3', () => {
    const graph = { ...makeGraph(), integrity: { schemaVersion: 3, migratedAt: NOW } };
    const { checks } = buildProductHardeningReport(graph);
    const check = checks.find((c) => c.id === 'integrity')!;
    expect(check.status).toBe('pass');
  });

  it('attention quando integrity.schemaVersion !== 3', () => {
    const graph = { ...makeGraph(), integrity: undefined as never };
    const { checks } = buildProductHardeningReport(graph);
    const check = checks.find((c) => c.id === 'integrity')!;
    expect(check.status).toBe('attention');
  });
});

describe('check: local-storage', () => {
  it('pass quando facts.localStorage === true', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { localStorage: true });
    expect(checks.find((c) => c.id === 'local-storage')!.status).toBe('pass');
  });

  it('blocked quando facts.localStorage === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { localStorage: false });
    expect(checks.find((c) => c.id === 'local-storage')!.status).toBe('blocked');
  });
});

describe('check: autosave', () => {
  it('pass quando facts.autosaveEnabled === true', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { autosaveEnabled: true });
    expect(checks.find((c) => c.id === 'autosave')!.status).toBe('pass');
  });

  it('blocked quando facts.autosaveEnabled === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { autosaveEnabled: false });
    expect(checks.find((c) => c.id === 'autosave')!.status).toBe('blocked');
  });
});

describe('check: recovery-api', () => {
  it('pass quando facts.recoveryApi === true', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { recoveryApi: true });
    expect(checks.find((c) => c.id === 'recovery-api')!.status).toBe('pass');
  });

  it('blocked quando facts.recoveryApi === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { recoveryApi: false });
    expect(checks.find((c) => c.id === 'recovery-api')!.status).toBe('blocked');
  });
});

describe('check: permission-guard', () => {
  it('pass quando facts.permissionGuard === true', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { permissionGuard: true });
    expect(checks.find((c) => c.id === 'permission-guard')!.status).toBe('pass');
  });

  it('blocked quando facts.permissionGuard === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { permissionGuard: false });
    expect(checks.find((c) => c.id === 'permission-guard')!.status).toBe('blocked');
  });
});

describe('check: owner', () => {
  it('pass quando existe pelo menos um member owner ativo', () => {
    const graph = withOwner(makeGraph());
    const { checks } = buildProductHardeningReport(graph);
    expect(checks.find((c) => c.id === 'owner')!.status).toBe('pass');
  });

  it('blocked quando collaboration existe mas não há owner ativo', () => {
    const graph = withCollaboration(makeGraph(), {
      members: {
        'u1': { id: 'u1', name: 'Editor', role: 'editor', status: 'active', createdAt: NOW },
      },
    });
    const { checks } = buildProductHardeningReport(graph);
    expect(checks.find((c) => c.id === 'owner')!.status).toBe('blocked');
  });

  it('attention quando não há collaboration definida', () => {
    // graph sem collaboration → no-collab → attention
    const graph = makeGraph();
    const { checks } = buildProductHardeningReport(graph);
    expect(checks.find((c) => c.id === 'owner')!.status).toBe('attention');
  });

  it('ignora member owner com status disabled', () => {
    const graph = withCollaboration(makeGraph(), {
      members: {
        'u1': { id: 'u1', name: 'Owner', role: 'owner', status: 'disabled', createdAt: NOW },
      },
    });
    const { checks } = buildProductHardeningReport(graph);
    expect(checks.find((c) => c.id === 'owner')!.status).toBe('blocked');
  });
});

describe('check: role', () => {
  it('pass quando facts.currentRole é um dos papéis válidos', () => {
    for (const role of ['owner', 'editor', 'commenter', 'viewer'] as const) {
      const { checks } = buildProductHardeningReport(makeGraph(), { currentRole: role });
      expect(checks.find((c) => c.id === 'role')!.status).toBe('pass');
    }
  });

  it('blocked quando facts.currentRole é desconhecido', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { currentRole: 'superadmin' });
    expect(checks.find((c) => c.id === 'role')!.status).toBe('blocked');
  });

  it('usa o role do membro corrente quando facts.currentRole não é fornecido', () => {
    const graph = withCollaboration(makeGraph(), {
      currentUserId: 'u1',
      members: { 'u1': { id: 'u1', name: 'Ed', role: 'editor', status: 'active', createdAt: NOW } },
    });
    const { role } = buildProductHardeningReport(graph);
    expect(role).toBe('editor');
  });
});

describe('check: sync-conflict', () => {
  it('pass quando não há conflitos abertos', () => {
    const graph = withCollaboration(makeGraph(), {
      sync: { mode: 'connected', conflicts: [] },
    });
    const { checks, openConflicts } = buildProductHardeningReport(graph);
    expect(checks.find((c) => c.id === 'sync-conflict')!.status).toBe('pass');
    expect(openConflicts).toBe(0);
  });

  it('attention quando há conflitos com status open', () => {
    const graph = withCollaboration(makeGraph(), {
      sync: {
        mode: 'connected',
        conflicts: [
          { id: 'c1', entityType: 'stage', entityId: 's1', detectedAt: NOW, status: 'open' },
          { id: 'c2', entityType: 'stage', entityId: 's2', detectedAt: NOW, status: 'resolved' },
        ],
      },
    });
    const { checks, openConflicts } = buildProductHardeningReport(graph);
    expect(checks.find((c) => c.id === 'sync-conflict')!.status).toBe('attention');
    expect(openConflicts).toBe(1); // apenas o 'open'
  });
});

describe('check: attention checks', () => {
  it('data-bridge → attention quando facts.dataBridge === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { dataBridge: false });
    expect(checks.find((c) => c.id === 'data-bridge')!.status).toBe('attention');
  });

  it('background-flush → attention quando facts.backgroundFlush === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { backgroundFlush: false });
    expect(checks.find((c) => c.id === 'background-flush')!.status).toBe('attention');
  });

  it('indexeddb → attention quando facts.indexedDB === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { indexedDB: false });
    expect(checks.find((c) => c.id === 'indexeddb')!.status).toBe('attention');
  });

  it('crypto → blocked quando facts.webCrypto === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { webCrypto: false });
    expect(checks.find((c) => c.id === 'crypto')!.status).toBe('blocked');
  });

  it('broadcast → attention quando facts.broadcastChannel === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { broadcastChannel: false });
    expect(checks.find((c) => c.id === 'broadcast')!.status).toBe('attention');
  });

  it('reduced-motion → attention quando facts.reducedMotion === false', () => {
    const { checks } = buildProductHardeningReport(makeGraph(), { reducedMotion: false });
    expect(checks.find((c) => c.id === 'reduced-motion')!.status).toBe('attention');
  });
});

// ─── status agregado e readinessScore ─────────────────────────────────────

describe('buildProductHardeningReport — status e score', () => {
  it('status é blocked quando há qualquer check blocked', () => {
    // localStorage false → blocked check → status blocked
    const { status } = buildProductHardeningReport(makeGraph(), { localStorage: false });
    expect(status).toBe('blocked');
  });

  it('status é attention quando sem blockers mas score < 90', () => {
    // Apenas autosaveEnabled=true e recoveryApi=true; outros falsos → score < 90, sem blockers após eliminarmos os blocked
    // Usando apenas checks attention + pass para ficar < 90
    const graph = withOwner(makeGraph());
    const facts: ProductHardeningFacts = {
      localStorage: true,
      autosaveEnabled: true,
      recoveryApi: true,
      permissionGuard: true,
      // sem webCrypto → blocked! vamos incluir
      webCrypto: true,
      // sem dataBridge, indexedDB, backgroundFlush, broadcastChannel, reducedMotion → attention
    };
    const { status, blockers } = buildProductHardeningReport(graph, facts);
    expect(blockers).toHaveLength(0);
    expect(status).toBe('attention');
  });

  it('score 100 é impossível com role desconhecido (blocked)', () => {
    const { readinessScore } = buildProductHardeningReport(makeGraph(), { ...ALL_PASS, currentRole: 'unknown' });
    expect(readinessScore).toBeLessThan(100);
  });

  it('syncMode usa facts.syncMode quando fornecido', () => {
    const { syncMode } = buildProductHardeningReport(makeGraph(), { syncMode: 'adapter-ready' });
    expect(syncMode).toBe('adapter-ready');
  });

  it('syncMode usa collaboration.sync.mode quando facts.syncMode não fornecido', () => {
    const graph = withCollaboration(makeGraph(), { sync: { mode: 'connected' } });
    const { syncMode } = buildProductHardeningReport(graph);
    expect(syncMode).toBe('connected');
  });

  it('syncMode padrão é local-only quando nenhum dos dois está definido', () => {
    const { syncMode } = buildProductHardeningReport(makeGraph());
    expect(syncMode).toBe('local-only');
  });
});

// ─── áreas ──────────────────────────────────────────────────────────────────

describe('buildProductHardeningReport — áreas', () => {
  it('cada área tem score entre 0 e 100', () => {
    const { areas } = buildProductHardeningReport(makeGraph());
    for (const area of areas) {
      expect(area.score).toBeGreaterThanOrEqual(0);
      expect(area.score).toBeLessThanOrEqual(100);
    }
  });

  it('área persistence tem 4 checks (local-storage, data-bridge, autosave, background-flush)', () => {
    const { areas } = buildProductHardeningReport(makeGraph());
    const persistence = areas.find((a) => a.area === 'persistence')!;
    expect(persistence.checks).toBe(4);
  });

  it('área accessibility tem 1 check (reduced-motion)', () => {
    const { areas } = buildProductHardeningReport(makeGraph());
    const accessibility = areas.find((a) => a.area === 'accessibility')!;
    expect(accessibility.checks).toBe(1);
  });

  it('área permissions com todos pass → score alto', () => {
    const graph = withOwner(makeGraph());
    const facts: ProductHardeningFacts = {
      permissionGuard: true,
      currentRole: 'owner',
    };
    const { areas } = buildProductHardeningReport(graph, facts);
    const permissions = areas.find((a) => a.area === 'permissions')!;
    expect(permissions.score).toBeGreaterThanOrEqual(90);
  });
});

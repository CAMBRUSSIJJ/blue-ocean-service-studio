import { describe, it, expect } from 'vitest';
import type { WorkspacePreferences } from '../workspace-preferences';
import {
  workspaceReferenceKey,
  buildContinueReport,
  resolvePreferenceReferences,
  type ContinueTarget,
} from '../continue-engine';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW     = '2025-06-01T12:00:00.000Z';
const PAST    = '2025-01-01T00:00:00.000Z';
const EARLIER = '2025-05-01T00:00:00.000Z';

function makeTarget(id: string, overrides: Partial<ContinueTarget> = {}): ContinueTarget {
  return {
    targetType: 'service',
    targetId: id,
    title: `Target ${id}`,
    subtitle: '',
    updatedAt: NOW,
    ...overrides,
  };
}

function makePrefs(overrides: Partial<WorkspacePreferences> = {}): WorkspacePreferences {
  return {
    recentContexts: [],
    pinnedContexts: [],
    ...overrides,
  } as WorkspacePreferences;
}

// ---------------------------------------------------------------------------
// workspaceReferenceKey
// ---------------------------------------------------------------------------

describe('workspaceReferenceKey', () => {
  it('formata chave como "type:id"', () => {
    expect(workspaceReferenceKey('service', 'abc-123')).toBe('service:abc-123');
  });

  it('funciona com qualquer tipo de WorkspaceTargetType', () => {
    expect(workspaceReferenceKey('workspace', 'w1')).toBe('workspace:w1');
  });
});

// ---------------------------------------------------------------------------
// buildContinueReport — sem contextos rastreados
// ---------------------------------------------------------------------------

describe('buildContinueReport — sem contextos rastreados', () => {
  it('retorna lista vazia se não há targets nem recentContexts', () => {
    const report = buildContinueReport([], makePrefs(), 5);
    expect(report.items).toHaveLength(0);
    expect(report.top).toBeNull();
    expect(report.historyCount).toBe(0);
    expect(report.orphanedReferences).toBe(0);
  });

  it('infere atividade a partir de updatedAt', () => {
    const target = makeTarget('s1', { updatedAt: NOW });
    const report = buildContinueReport([target], makePrefs(), 5);
    expect(report.items).toHaveLength(1);
    expect(report.items[0].source).toBe('inferred');
    expect(report.items[0].activity).toBe('edited');
    expect(report.top).not.toBeNull();
  });

  it('prefere lastOpenedAt sobre updatedAt quando mais recente', () => {
    const target = makeTarget('s1', { updatedAt: PAST, lastOpenedAt: NOW });
    const report = buildContinueReport([target], makePrefs(), 5);
    expect(report.items[0].activity).toBe('opened');
    expect(report.items[0].activityAt).toBe(NOW);
  });

  it('usa updatedAt como edited quando lastOpenedAt é mais antigo', () => {
    const target = makeTarget('s1', { updatedAt: NOW, lastOpenedAt: PAST });
    const report = buildContinueReport([target], makePrefs(), 5);
    expect(report.items[0].activity).toBe('edited');
    expect(report.items[0].activityAt).toBe(NOW);
  });

  it('ignora target sem nenhuma data de atividade', () => {
    const target: ContinueTarget = {
      targetType: 'service',
      targetId: 'no-date',
      title: 'Sem datas',
      subtitle: '',
    };
    const report = buildContinueReport([target], makePrefs(), 5);
    expect(report.items).toHaveLength(0);
  });

  it('ignora targets com datas inválidas', () => {
    const target = makeTarget('x', { updatedAt: 'nao-e-uma-data' });
    const report = buildContinueReport([target], makePrefs(), 5);
    expect(report.items).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// buildContinueReport — com contextos rastreados
// ---------------------------------------------------------------------------

describe('buildContinueReport — com contextos rastreados', () => {
  it('usa source=tracked para recentContexts válidos', () => {
    const target = makeTarget('s1');
    const prefs = makePrefs({
      recentContexts: [{ targetType: 'service', targetId: 's1', activity: 'edited', occurredAt: NOW }],
    });
    const report = buildContinueReport([target], prefs, 5);
    expect(report.items[0].source).toBe('tracked');
    expect(report.items[0].activity).toBe('edited');
  });

  it('incrementa orphanedReferences para targets ausentes', () => {
    const prefs = makePrefs({
      recentContexts: [{ targetType: 'service', targetId: 'nao-existe', activity: 'opened', occurredAt: NOW }],
    });
    const report = buildContinueReport([], prefs, 5);
    expect(report.orphanedReferences).toBe(1);
    expect(report.items).toHaveLength(0);
  });

  it('ignora recentContext com occurredAt inválida (target fica sem item)', () => {
    // O target entra no trackedMap (key existe), mas occurredAt é inválida,
    // então o item é descartado. O loop de inferência pula targets que estão
    // em trackedMap — resultado: 0 itens.
    const target = makeTarget('s1');
    const prefs = makePrefs({
      recentContexts: [{ targetType: 'service', targetId: 's1', activity: 'edited', occurredAt: 'invalida' }],
    });
    const report = buildContinueReport([target], prefs, 5);
    expect(report.items).toHaveLength(0);
  });

  it('não duplica target que já é rastreado', () => {
    const target = makeTarget('s1', { updatedAt: NOW });
    const prefs = makePrefs({
      recentContexts: [{ targetType: 'service', targetId: 's1', activity: 'created', occurredAt: NOW }],
    });
    const report = buildContinueReport([target], prefs, 5);
    expect(report.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// buildContinueReport — ordenação
// ---------------------------------------------------------------------------

describe('buildContinueReport — ordenação', () => {
  it('ordena por activityAt mais recente primeiro', () => {
    const t1 = makeTarget('s1', { updatedAt: PAST });
    const t2 = makeTarget('s2', { updatedAt: NOW });
    const report = buildContinueReport([t1, t2], makePrefs(), 5);
    expect(report.items[0].targetId).toBe('s2');
    expect(report.items[1].targetId).toBe('s1');
  });

  it('desempate por peso de atividade quando mesmo timestamp', () => {
    const t1 = makeTarget('s1', { updatedAt: undefined, lastOpenedAt: NOW }); // opened=2
    const t2: ContinueTarget = { targetType: 'service', targetId: 's2', title: 'S2', subtitle: '', lastEditedAt: NOW }; // edited=5
    const report = buildContinueReport([t1, t2], makePrefs(), 5);
    expect(report.items[0].targetId).toBe('s2');
  });

  it('desempate por title quando mesmo timestamp e mesma atividade', () => {
    const t1 = makeTarget('s1', { title: 'Zebra', updatedAt: NOW });
    const t2 = makeTarget('s2', { title: 'Alpha', updatedAt: NOW });
    const report = buildContinueReport([t1, t2], makePrefs(), 5);
    expect(report.items[0].title).toBe('Alpha');
  });
});

// ---------------------------------------------------------------------------
// buildContinueReport — limite
// ---------------------------------------------------------------------------

describe('buildContinueReport — limite', () => {
  it('respeita o limite padrão de 5', () => {
    const targets = Array.from({ length: 10 }, (_, i) => makeTarget(`s${i}`, { updatedAt: NOW }));
    const report = buildContinueReport(targets, makePrefs());
    expect(report.items.length).toBeLessThanOrEqual(5);
  });

  it('historyCount reflete total antes do limite', () => {
    const targets = Array.from({ length: 8 }, (_, i) => makeTarget(`s${i}`, { updatedAt: NOW }));
    const report = buildContinueReport(targets, makePrefs(), 3);
    expect(report.historyCount).toBe(8);
    expect(report.items).toHaveLength(3);
  });

  it('top é o primeiro item da lista limitada', () => {
    const t1 = makeTarget('top', { updatedAt: NOW });
    const t2 = makeTarget('old', { updatedAt: PAST });
    const report = buildContinueReport([t1, t2], makePrefs(), 1);
    expect(report.top!.targetId).toBe('top');
    expect(report.items).toHaveLength(1);
  });

  it('garante pelo menos 1 item quando limit=0', () => {
    const target = makeTarget('s1', { updatedAt: NOW });
    const report = buildContinueReport([target], makePrefs(), 0);
    expect(report.items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// resolvePreferenceReferences
// ---------------------------------------------------------------------------

describe('resolvePreferenceReferences', () => {
  it('retorna targets na ordem das references', () => {
    const t1 = makeTarget('s1');
    const t2 = makeTarget('s2');
    const refs = [
      { targetType: 'service' as const, targetId: 's2' },
      { targetType: 'service' as const, targetId: 's1' },
    ];
    const resolved = resolvePreferenceReferences(refs, [t1, t2]);
    expect(resolved[0].targetId).toBe('s2');
    expect(resolved[1].targetId).toBe('s1');
  });

  it('omite references sem target correspondente', () => {
    const t1 = makeTarget('s1');
    const refs = [
      { targetType: 'service' as const, targetId: 'nao-existe' },
      { targetType: 'service' as const, targetId: 's1' },
    ];
    const resolved = resolvePreferenceReferences(refs, [t1]);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].targetId).toBe('s1');
  });

  it('retorna lista vazia se referencias vazias', () => {
    const result = resolvePreferenceReferences([], [makeTarget('s1')]);
    expect(result).toHaveLength(0);
  });

  it('retorna lista vazia se targets vazio', () => {
    const result = resolvePreferenceReferences([{ targetType: 'service', targetId: 's1' }], []);
    expect(result).toHaveLength(0);
  });
});

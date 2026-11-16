import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ServiceModelKind } from '../service-model-index';
import {
  canOpenServiceObject,
  readServiceObjectFocus,
  consumeServiceObjectFocus,
  openServiceObject,
} from '../service-object-navigation';

// happy-dom fornece sessionStorage — limpar antes de cada teste
beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

// ── canOpenServiceObject ──────────────────────────────────────────────────────

describe('canOpenServiceObject', () => {
  // kinds mapeados em CONTEXT_PAGE_BY_KIND
  const contextPageKinds: ServiceModelKind[] = [
    'persona', 'need', 'job', 'pain', 'hypothesis', 'validatedProblem', 'evidence',
  ];

  // kinds mapeados em WORKSPACE_TAB_BY_KIND
  const workspaceTabKinds: ServiceModelKind[] = [
    'actor', 'journey', 'stage', 'touchpoint', 'channel',
    'stageProblem', 'stageOpportunity', 'whiteboard', 'blueprint',
    'improvementProblem', 'improvementOpportunity', 'initiative',
    'metric', 'measurement', 'researchProject', 'researchSource',
    'researchObservation', 'experiment', 'learning', 'decision',
    'governance', 'operationBinding',
  ];

  it.each(contextPageKinds)('retorna true para kind "%s" (context page)', (kind) => {
    expect(canOpenServiceObject(kind)).toBe(true);
  });

  it.each(workspaceTabKinds)('retorna true para kind "%s" (workspace tab)', (kind) => {
    expect(canOpenServiceObject(kind)).toBe(true);
  });

  it('retorna true para "task" (caso especial)', () => {
    expect(canOpenServiceObject('task')).toBe(true);
  });

  it('retorna false para "service" (não mapeado)', () => {
    expect(canOpenServiceObject('service')).toBe(false);
  });

  it('retorna false para kind de entidade não mapeada', () => {
    expect(canOpenServiceObject('entity:unknown' as ServiceModelKind)).toBe(false);
  });
});

// ── readServiceObjectFocus ────────────────────────────────────────────────────

describe('readServiceObjectFocus', () => {
  it('retorna null quando sessionStorage está vazio', () => {
    expect(readServiceObjectFocus()).toBeNull();
  });

  it('retorna null quando kind ou id estão ausentes no JSON', () => {
    sessionStorage.setItem('bo-service-object-focus', JSON.stringify({ requestedAt: 123 }));
    expect(readServiceObjectFocus()).toBeNull();
  });

  it('retorna null para JSON inválido', () => {
    sessionStorage.setItem('bo-service-object-focus', 'not-json{{{');
    expect(readServiceObjectFocus()).toBeNull();
  });

  it('retorna o focus armazenado quando kind e id existem', () => {
    const stored = { kind: 'journey' as ServiceModelKind, id: 'j1', requestedAt: 1000 };
    sessionStorage.setItem('bo-service-object-focus', JSON.stringify(stored));
    const result = readServiceObjectFocus();
    expect(result).toEqual({ kind: 'journey', id: 'j1', requestedAt: 1000 });
  });

  it('retorna o focus quando kind esperado corresponde', () => {
    const stored = { kind: 'journey' as ServiceModelKind, id: 'j1', requestedAt: 1000 };
    sessionStorage.setItem('bo-service-object-focus', JSON.stringify(stored));
    expect(readServiceObjectFocus('journey')).toEqual({ kind: 'journey', id: 'j1', requestedAt: 1000 });
  });

  it('retorna null quando kind esperado não corresponde', () => {
    const stored = { kind: 'journey' as ServiceModelKind, id: 'j1', requestedAt: 1000 };
    sessionStorage.setItem('bo-service-object-focus', JSON.stringify(stored));
    expect(readServiceObjectFocus('stage')).toBeNull();
  });

  it('trata requestedAt ausente como 0', () => {
    sessionStorage.setItem('bo-service-object-focus', JSON.stringify({ kind: 'metric', id: 'm1' }));
    const result = readServiceObjectFocus();
    expect(result?.requestedAt).toBe(0);
  });

  it('converte id para string', () => {
    sessionStorage.setItem('bo-service-object-focus', JSON.stringify({ kind: 'metric', id: 42, requestedAt: 0 }));
    const result = readServiceObjectFocus();
    expect(typeof result?.id).toBe('string');
    expect(result?.id).toBe('42');
  });
});

// ── consumeServiceObjectFocus ─────────────────────────────────────────────────

describe('consumeServiceObjectFocus', () => {
  it('retorna null quando não há focus armazenado', () => {
    expect(consumeServiceObjectFocus('journey')).toBeNull();
  });

  it('retorna null quando o kind não corresponde', () => {
    sessionStorage.setItem('bo-service-object-focus', JSON.stringify({ kind: 'stage', id: 's1', requestedAt: 0 }));
    expect(consumeServiceObjectFocus('journey')).toBeNull();
  });

  it('retorna o focus e remove do sessionStorage', () => {
    const stored = { kind: 'journey' as ServiceModelKind, id: 'j1', requestedAt: 500 };
    sessionStorage.setItem('bo-service-object-focus', JSON.stringify(stored));

    const result = consumeServiceObjectFocus('journey');
    expect(result).toEqual({ kind: 'journey', id: 'j1', requestedAt: 500 });
    // deve ter sido removido
    expect(sessionStorage.getItem('bo-service-object-focus')).toBeNull();
  });

  it('após consumir, segunda chamada retorna null', () => {
    sessionStorage.setItem('bo-service-object-focus', JSON.stringify({ kind: 'metric', id: 'm2', requestedAt: 1 }));
    consumeServiceObjectFocus('metric');
    expect(consumeServiceObjectFocus('metric')).toBeNull();
  });
});

// ── openServiceObject ─────────────────────────────────────────────────────────

describe('openServiceObject', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('retorna false quando id está vazio', () => {
    expect(openServiceObject('journey', '')).toBe(false);
  });

  it('retorna false para kind não mapeado ("service")', () => {
    const dispatched: string[] = [];
    vi.spyOn(window, 'dispatchEvent').mockImplementation((e: Event) => {
      dispatched.push((e as CustomEvent).type);
      return true;
    });
    expect(openServiceObject('service', 'svc1')).toBe(false);
    expect(dispatched).toHaveLength(0);
  });

  it('context-page kind: dispara bo-open-context-page e armazena focus', () => {
    const events: Array<{ type: string; detail: unknown }> = [];
    vi.spyOn(window, 'dispatchEvent').mockImplementation((e: Event) => {
      events.push({ type: e.type, detail: (e as CustomEvent).detail });
      return true;
    });

    const result = openServiceObject('persona', 'p1');
    expect(result).toBe(true);

    // evento imediato
    expect(events[0].type).toBe('bo-open-context-page');
    expect(events[0].detail).toBe('personas');

    // focus deve estar no sessionStorage
    const stored = JSON.parse(sessionStorage.getItem('bo-service-object-focus')!);
    expect(stored.kind).toBe('persona');
    expect(stored.id).toBe('p1');

    // avança o timer de 30ms para o segundo evento
    vi.runAllTimers();
    expect(events[1].type).toBe('bo-service-object-focus');
    expect((events[1].detail as { kind: string }).kind).toBe('persona');
  });

  it('workspace-tab kind: dispara rt-navigation e bo-service-workspace-tab', () => {
    const events: Array<{ type: string; detail: unknown }> = [];
    vi.spyOn(window, 'dispatchEvent').mockImplementation((e: Event) => {
      events.push({ type: e.type, detail: (e as CustomEvent).detail });
      return true;
    });

    const result = openServiceObject('journey', 'j1');
    expect(result).toBe(true);
    expect(events[0].type).toBe('rt-navigation');
    expect(events[0].detail).toBe('canvas');

    // avança timers aninhados
    vi.runAllTimers();
    const types = events.map(e => e.type);
    expect(types).toContain('bo-service-workspace-tab');
    expect(types).toContain('bo-service-object-focus');

    const tabEvent = events.find(e => e.type === 'bo-service-workspace-tab');
    expect(tabEvent?.detail).toBe('journey');
  });

  it('"task" kind: dispara rt-navigation e bo-global-object-focus', () => {
    const events: Array<{ type: string; detail: unknown }> = [];
    vi.spyOn(window, 'dispatchEvent').mockImplementation((e: Event) => {
      events.push({ type: e.type, detail: (e as CustomEvent).detail });
      return true;
    });

    const result = openServiceObject('task', 't1');
    expect(result).toBe(true);
    expect(events[0].type).toBe('rt-navigation');
    expect(events[0].detail).toBe('action');

    vi.runAllTimers();
    const globalFocus = events.find(e => e.type === 'bo-global-object-focus');
    expect(globalFocus?.detail).toEqual({ kind: 'task', id: 't1' });
  });

  it('armazena focus no sessionStorage para qualquer kind mapeado', () => {
    vi.spyOn(window, 'dispatchEvent').mockImplementation(() => true);
    openServiceObject('metric', 'm99');
    const stored = JSON.parse(sessionStorage.getItem('bo-service-object-focus')!);
    expect(stored.kind).toBe('metric');
    expect(stored.id).toBe('m99');
    expect(typeof stored.requestedAt).toBe('number');
  });

  it('context-page kinds: validatedProblem mapeia para "problems"', () => {
    const events: Array<{ type: string; detail: unknown }> = [];
    vi.spyOn(window, 'dispatchEvent').mockImplementation((e: Event) => {
      events.push({ type: e.type, detail: (e as CustomEvent).detail });
      return true;
    });

    openServiceObject('validatedProblem', 'vp1');
    expect(events[0].detail).toBe('problems');
  });

  it('workspace-tab kinds: initiative mapeia para "portfolio"', () => {
    const events: Array<{ type: string; detail: unknown }> = [];
    vi.spyOn(window, 'dispatchEvent').mockImplementation((e: Event) => {
      events.push({ type: e.type, detail: (e as CustomEvent).detail });
      return true;
    });

    openServiceObject('initiative', 'i1');
    vi.runAllTimers();
    const tabEvent = events.find(e => e.type === 'bo-service-workspace-tab');
    expect(tabEvent?.detail).toBe('portfolio');
  });
});

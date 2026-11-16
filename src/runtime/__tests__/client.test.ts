import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runtimeRegistry, runtimeApi, dataBridge } from '../client.ts';
import type { DataBridgeApi } from '../client.ts';

// Reseta os globals entre testes para garantir isolamento
beforeEach(() => {
  (window as Window & { RealTalentRuntime?: unknown }).RealTalentRuntime = undefined;
  (window as Window & { BlueOceanRuntime?: unknown }).BlueOceanRuntime = undefined;
});

// ---------------------------------------------------------------------------
// runtimeRegistry()
// ---------------------------------------------------------------------------

describe('runtimeRegistry', () => {
  it('cria window.RealTalentRuntime na primeira chamada', () => {
    expect(window.RealTalentRuntime).toBeUndefined();
    runtimeRegistry();
    expect(window.RealTalentRuntime).toBeDefined();
  });

  it('cria window.BlueOceanRuntime apontando para o mesmo registro', () => {
    runtimeRegistry();
    expect(window.BlueOceanRuntime).toBe(window.RealTalentRuntime);
  });

  it('retorna a mesma instância em chamadas subsequentes', () => {
    const r1 = runtimeRegistry();
    const r2 = runtimeRegistry();
    expect(r1).toBe(r2);
  });

  it('não sobrescreve RealTalentRuntime já existente', () => {
    // Simula runtime legado já registrado por script externo
    const preexisting = runtimeRegistry();
    (window as Window & { RealTalentRuntime?: unknown }).RealTalentRuntime = preexisting;
    const second = runtimeRegistry();
    expect(second).toBe(preexisting);
  });
});

// ---------------------------------------------------------------------------
// register / api / has / version / list
// ---------------------------------------------------------------------------

describe('RuntimeRegistry — register e api', () => {
  it('register() armazena e api() recupera o mesmo objeto', () => {
    const reg = runtimeRegistry();
    const myApi = { greet: () => 'olá' };
    reg.register('greet', myApi);
    expect(reg.api('greet')).toBe(myApi);
  });

  it('api() retorna null para nome desconhecido', () => {
    expect(runtimeRegistry().api('naoExiste')).toBeNull();
  });

  it('register() com version armazena a versão', () => {
    const reg = runtimeRegistry();
    reg.register('modulo', {}, '2.1.0');
    expect(reg.version('modulo')).toBe('2.1.0');
  });

  it('register() sem version → version() retorna null', () => {
    const reg = runtimeRegistry();
    reg.register('semVersao', {});
    expect(reg.version('semVersao')).toBeNull();
  });

  it('version() retorna null para nome desconhecido', () => {
    expect(runtimeRegistry().version('fantasma')).toBeNull();
  });
});

describe('RuntimeRegistry — has()', () => {
  it('retorna false antes do registro', () => {
    expect(runtimeRegistry().has('inexistente')).toBe(false);
  });

  it('retorna true após registro', () => {
    const reg = runtimeRegistry();
    reg.register('presente', {});
    expect(reg.has('presente')).toBe(true);
  });
});

describe('RuntimeRegistry — list()', () => {
  it('retorna array vazio quando nenhum módulo está registrado', () => {
    expect(runtimeRegistry().list()).toEqual([]);
  });

  it('lista todos os nomes registrados', () => {
    const reg = runtimeRegistry();
    reg.register('a', {});
    reg.register('b', {});
    reg.register('c', {});
    const names = reg.list();
    expect(names).toContain('a');
    expect(names).toContain('b');
    expect(names).toContain('c');
    expect(names).toHaveLength(3);
  });

  it('não inclui duplicatas se o mesmo nome for registrado duas vezes', () => {
    const reg = runtimeRegistry();
    reg.register('dup', { v: 1 });
    reg.register('dup', { v: 2 }); // sobrescreve
    expect(reg.list()).toHaveLength(1);
    expect((reg.api('dup') as { v: number }).v).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// CustomEvent rt-runtime-registered
// ---------------------------------------------------------------------------

describe('RuntimeRegistry — disparo de evento CustomEvent', () => {
  it('dispara rt-runtime-registered ao registrar um módulo', () => {
    const reg = runtimeRegistry();
    const handler = vi.fn();
    window.addEventListener('rt-runtime-registered', handler);

    reg.register('testeEvento', {}, '1.0.0');

    expect(handler).toHaveBeenCalledOnce();
    const event = handler.mock.calls[0][0] as CustomEvent;
    expect(event.detail).toEqual({ name: 'testeEvento', version: '1.0.0' });

    window.removeEventListener('rt-runtime-registered', handler);
  });

  it('detail.version é undefined quando registrado sem versão', () => {
    const reg = runtimeRegistry();
    const handler = vi.fn();
    window.addEventListener('rt-runtime-registered', handler);

    reg.register('semVersaoEvento', {});

    const event = handler.mock.calls[0][0] as CustomEvent;
    // version não foi passado; o detail.version fica undefined
    expect(event.detail.version).toBeUndefined();

    window.removeEventListener('rt-runtime-registered', handler);
  });
});

// ---------------------------------------------------------------------------
// runtimeApi<T>()
// ---------------------------------------------------------------------------

describe('runtimeApi', () => {
  it('retorna null quando o módulo não está registrado', () => {
    expect(runtimeApi('qualquer')).toBeNull();
  });

  it('retorna o objeto tipado após registro via runtimeRegistry', () => {
    const myService = { ping: () => 'pong' };
    runtimeRegistry().register('ping', myService);
    const result = runtimeApi<{ ping(): string }>('ping');
    expect(result?.ping()).toBe('pong');
  });
});

// ---------------------------------------------------------------------------
// dataBridge()
// ---------------------------------------------------------------------------

describe('dataBridge', () => {
  it('retorna null quando dataBridge não está registrado', () => {
    expect(dataBridge()).toBeNull();
  });

  it('retorna a DataBridgeApi registrada', () => {
    const bridge: DataBridgeApi = {
      get: () => { throw new Error('mock'); },
      currentJourneyId: () => null,
      save: () => true,
      transact: (fn) => fn({} as never),
      undo: () => {},
      redo: () => {},
      export: () => {},
      import: () => Promise.resolve({} as never),
      recovery: () => Promise.resolve(null),
    };
    runtimeRegistry().register('dataBridge', bridge);
    expect(dataBridge()).toBe(bridge);
  });
});

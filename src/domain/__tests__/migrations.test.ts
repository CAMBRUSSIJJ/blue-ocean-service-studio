import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { CURRENT_SCHEMA_VERSION, migrateProject, describeImportError } from '../migrations';
import { createServiceGraph } from '../graph-operations';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Constrói um payload legado válido (sem schemaVersion, entities, research, integrity, views). */
function makeLegacyPayload() {
  const { schemaVersion: _sv, entities: _e, research: _r, integrity: _i, views: _v, ...legacy } =
    createServiceGraph('Serviço Legado');
  return legacy;
}

/** Constrói um payload v2 válido (schemaVersion: 2 + views herdado do v3). */
function makeV2Payload() {
  const graph = createServiceGraph('Serviço V2');
  return { ...graph, schemaVersion: 2 as const };
}

// ---------------------------------------------------------------------------
// migrateProject — caminhos de versão ainda não cobertos
// ---------------------------------------------------------------------------

describe('migrateProject — caminho legado (sem schemaVersion)', () => {
  it('aceita payload legado e retorna grafo v3', () => {
    const result = migrateProject(makeLegacyPayload());
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('preserva o nome do serviço após migração legada', () => {
    const result = migrateProject(makeLegacyPayload());
    expect(result.service.name).toBe('Serviço Legado');
  });

  it('garante campos obrigatórios no resultado (entities, views)', () => {
    const result = migrateProject(makeLegacyPayload());
    expect(result.entities).toBeDefined();
    expect(result.views).toBeDefined();
    expect(result.views.whiteboards).toBeDefined();
  });

  it('repara referências — journeyIds do serviço são consistentes', () => {
    const payload = makeLegacyPayload();
    const result = migrateProject(payload);
    // Após repairGraphReferences, todo journeyId deve apontar para uma jornada real
    for (const jid of result.service.journeyIds) {
      expect(result.journeys[jid]).toBeDefined();
    }
  });
});

describe('migrateProject — caminho v2 (schemaVersion: 2)', () => {
  it('aceita payload v2 e retorna grafo v3', () => {
    const result = migrateProject(makeV2Payload());
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('preserva o nome do serviço após migração v2', () => {
    const result = migrateProject(makeV2Payload());
    expect(result.service.name).toBe('Serviço V2');
  });

  it('adiciona campo integrity ao migrar de v2', () => {
    const result = migrateProject(makeV2Payload());
    expect(result.integrity).toBeDefined();
    expect(result.integrity?.schemaVersion).toBe(3);
  });

  it('preserva entities originais do payload v2', () => {
    const payload = makeV2Payload();
    // payload herdou entities:{} de createServiceGraph; devem ser preservados
    const result = migrateProject(payload);
    expect(result.entities).toBeDefined();
  });
});

describe('migrateProject — erros de entrada (complemento aos testes existentes)', () => {
  it('lança para string primitiva', () => {
    expect(() => migrateProject('texto')).toThrow('Arquivo não contém um projeto válido.');
  });

  it('lança para número primitivo', () => {
    expect(() => migrateProject(42)).toThrow();
  });

  it('lança para payload sem campos obrigatórios do schema', () => {
    // schemaVersion: 3 mas sem service → ZodError
    expect(() => migrateProject({ schemaVersion: 3 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// describeImportError
// ---------------------------------------------------------------------------

describe('describeImportError', () => {
  it('formata ZodError com caminho e mensagem localizada', () => {
    let zodError: z.ZodError | null = null;
    try { z.object({ name: z.string() }).parse({ name: 123 }); }
    catch (e) { zodError = e as z.ZodError; }

    expect(zodError).not.toBeNull();
    const msg = describeImportError(zodError!);
    expect(msg).toMatch(/Dados inválidos/);
    // Deve incluir o caminho do campo problemático
    expect(msg).toMatch(/name/);
  });

  it('formata ZodError sem caminho com fallback para "projeto"', () => {
    let zodError: z.ZodError | null = null;
    try { z.string().parse(99); }
    catch (e) { zodError = e as z.ZodError; }

    expect(zodError).not.toBeNull();
    const msg = describeImportError(zodError!);
    expect(msg).toMatch(/Dados inválidos em projeto/);
  });

  it('retorna message de Error padrão', () => {
    const err = new Error('falha ao ler arquivo');
    expect(describeImportError(err)).toBe('falha ao ler arquivo');
  });

  it('retorna fallback para tipo desconhecido (string)', () => {
    expect(describeImportError('ops')).toBe('Não foi possível ler o projeto.');
  });

  it('retorna fallback para tipo desconhecido (número)', () => {
    expect(describeImportError(404)).toBe('Não foi possível ler o projeto.');
  });

  it('retorna fallback para null', () => {
    expect(describeImportError(null)).toBe('Não foi possível ler o projeto.');
  });
});

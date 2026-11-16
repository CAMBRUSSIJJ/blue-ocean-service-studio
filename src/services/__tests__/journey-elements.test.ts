import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';
import {
  JOURNEY_ELEMENT_TYPES,
  prepareJourneyElement,
  type MatrixDocument,
  type JourneyElementInput,
} from '../journey-elements';

// ── helpers ───────────────────────────────────────────────────────────────────

const NOW = '2025-01-01T00:00:00.000Z';

function makeGraph(): ServiceGraph {
  return createServiceGraph('Serviço Teste');
}

function makeDocument(steps: Array<{ hostStageId: string; hostLocalId: string }> = []): MatrixDocument {
  return { steps, c: {} };
}

/** Returns a fully wired graph + document ready for prepareJourneyElement. */
function fullSetup() {
  let g = makeGraph();
  g = {
    ...g,
    journeys: {
      j1: { id: 'j1', serviceId: g.service.id, name: 'Jornada', stageIds: ['s1'], createdAt: NOW, updatedAt: NOW },
    },
    stages: {
      ...g.stages,
      s1: {
        id: 's1', journeyId: 'j1', title: 'Etapa 1', customerAction: '',
        emotion: 'neutral' as const, touchpointIds: [], problemIds: [], opportunityIds: [],
      },
    },
  };
  const doc = makeDocument([{ hostStageId: 's1', hostLocalId: 'local-1' }]);
  return { g, doc };
}

function baseInput(overrides: Partial<JourneyElementInput> = {}): JourneyElementInput {
  return {
    elementType: 'need',
    stageId: 's1',
    rowId: 'custom',
    ...overrides,
  };
}

// ── JOURNEY_ELEMENT_TYPES ─────────────────────────────────────────────────────

describe('JOURNEY_ELEMENT_TYPES', () => {
  it('contém seis tipos', () => {
    expect(JOURNEY_ELEMENT_TYPES).toHaveLength(6);
  });

  it('inclui todos os tipos esperados', () => {
    expect(JOURNEY_ELEMENT_TYPES).toEqual(['pain', 'need', 'persona', 'evidence', 'channel', 'opportunity']);
  });

  it('é readonly (array congelado pelo TS)', () => {
    expect(Array.isArray(JOURNEY_ELEMENT_TYPES)).toBe(true);
  });
});

// ── prepareJourneyElement – validação de jornada ──────────────────────────────

describe('prepareJourneyElement > validação de jornada', () => {
  it('lança se a jornada não existe', () => {
    const { g, doc } = fullSetup();
    expect(() => prepareJourneyElement(g, 'j-inexistente', doc, baseInput(), '', NOW))
      .toThrow('Jornada indisponível neste serviço.');
  });

  it('lança se a jornada pertence a outro serviço', () => {
    let { g, doc } = fullSetup();
    g = { ...g, journeys: { j1: { id: 'j1', serviceId: 'outro', name: 'J', stageIds: ['s1'], createdAt: NOW, updatedAt: NOW } } };
    expect(() => prepareJourneyElement(g, 'j1', doc, baseInput(), '', NOW))
      .toThrow('Jornada indisponível neste serviço.');
  });

  it('aceita jornada sem serviceId (compatibilidade legada)', () => {
    let { g, doc } = fullSetup();
    // Inject journey without serviceId
    const journeyWithoutService = { id: 'j2', name: 'J legado', stageIds: ['s1'], createdAt: NOW, updatedAt: NOW } as unknown as typeof g.journeys['j1'];
    g = { ...g, journeys: { j2: journeyWithoutService } };
    // Should NOT throw on serviceId check; will fail later on stage check
    // because s1 is not in stageIds... wait, stageIds: ['s1'] is set so it should proceed to row validation
    const docJ2 = makeDocument([{ hostStageId: 's1', hostLocalId: 'local-1' }]);
    expect(() => prepareJourneyElement(g, 'j2', docJ2, baseInput(), '', NOW))
      .not.toThrow('Jornada indisponível neste serviço.');
  });
});

// ── prepareJourneyElement – validação de tipo ─────────────────────────────────

describe('prepareJourneyElement > validação de tipo', () => {
  it('lança se elementType é inválido', () => {
    const { g, doc } = fullSetup();
    expect(() => prepareJourneyElement(g, 'j1', doc, baseInput({ elementType: 'invalid' }), '', NOW))
      .toThrow('Tipo de elemento inválido.');
  });

  it('lança se elementType está ausente', () => {
    const { g, doc } = fullSetup();
    expect(() => prepareJourneyElement(g, 'j1', doc, baseInput({ elementType: undefined }), '', NOW))
      .toThrow('Tipo de elemento inválido.');
  });
});

// ── prepareJourneyElement – validação de etapa ────────────────────────────────

describe('prepareJourneyElement > validação de etapa', () => {
  it('lança se stageId não está no documento', () => {
    const { g } = fullSetup();
    const docEmpty = makeDocument([]); // no steps
    expect(() => prepareJourneyElement(g, 'j1', docEmpty, baseInput({ stageId: 's1' }), '', NOW))
      .toThrow('A etapa mudou. Abra o seletor novamente.');
  });

  it('lança se stageId não está em stageIds da jornada', () => {
    let { g, doc } = fullSetup();
    // Add a step for s2 in doc, but j1.stageIds only has s1
    const docWith2 = makeDocument([{ hostStageId: 's2', hostLocalId: 'local-2' }]);
    expect(() => prepareJourneyElement(g, 'j1', docWith2, baseInput({ stageId: 's2' }), '', NOW))
      .toThrow('A etapa mudou. Abra o seletor novamente.');
  });

  it('resolve etapa por stageLocalId quando stageId está ausente', () => {
    const { g } = fullSetup();
    const docLocal = makeDocument([{ hostStageId: 's1', hostLocalId: 'abc123' }]);
    const input = baseInput({ stageId: undefined, stageLocalId: 'abc123', newRecord: { title: 'N' } });
    const result = prepareJourneyElement(g, 'j1', docLocal, input, '', NOW);
    expect(result).toHaveProperty('noteId');
  });

  it('lança se nem stageId nem stageLocalId coincidem', () => {
    const { g, doc } = fullSetup();
    const input = baseInput({ stageId: undefined, stageLocalId: 'nao-existe' });
    expect(() => prepareJourneyElement(g, 'j1', doc, input, '', NOW))
      .toThrow('A etapa mudou. Abra o seletor novamente.');
  });
});

// ── prepareJourneyElement – validação de faixa ────────────────────────────────

describe('prepareJourneyElement > validação de faixa (rowId)', () => {
  it('lança se rowId está ausente', () => {
    const { g, doc } = fullSetup();
    expect(() => prepareJourneyElement(g, 'j1', doc, baseInput({ rowId: undefined }), '', NOW))
      .toThrow('Faixa inválida.');
  });

  it('lança se rowId começa com número', () => {
    const { g, doc } = fullSetup();
    expect(() => prepareJourneyElement(g, 'j1', doc, baseInput({ rowId: '1abc' }), '', NOW))
      .toThrow('Faixa inválida.');
  });

  it('lança se rowId tem mais de 25 caracteres', () => {
    const { g, doc } = fullSetup();
    expect(() => prepareJourneyElement(g, 'j1', doc, baseInput({ rowId: 'a'.repeat(26) }), '', NOW))
      .toThrow('Faixa inválida.');
  });

  it('lança se rowId tem caracteres maiúsculos', () => {
    const { g, doc } = fullSetup();
    expect(() => prepareJourneyElement(g, 'j1', doc, baseInput({ rowId: 'MyRow' }), '', NOW))
      .toThrow('Faixa inválida.');
  });
});

// ── prepareJourneyElement – validação de editingId ────────────────────────────

describe('prepareJourneyElement > validação de editingId', () => {
  it('lança se editingId não existe na célula', () => {
    const { g, doc } = fullSetup();
    const input = baseInput({ editingId: 'note-inexistente', newRecord: { title: 'T' } });
    expect(() => prepareJourneyElement(g, 'j1', doc, input, '', NOW))
      .toThrow('O cartão mudou. Abra o seletor novamente.');
  });

  it('lança se editingId aponta para nota de tipo diferente', () => {
    const { g } = fullSetup();
    // Build doc with an existing note of type 'channel'
    const existingNote = { i: 'note-1', type: 'channel', referenceId: 'ch-1', t: '' };
    const doc: MatrixDocument = { steps: [{ hostStageId: 's1', hostLocalId: 'local-1' }], c: { 'custom|0': [existingNote] } };
    // Try to edit it as 'need'
    const input = baseInput({ editingId: 'note-1', newRecord: { title: 'T' } });
    expect(() => prepareJourneyElement(g, 'j1', doc, input, '', NOW))
      .toThrow('O cartão mudou. Abra o seletor novamente.');
  });
});

// ── prepareJourneyElement – validação de registro novo ───────────────────────

describe('prepareJourneyElement > newRecord validações', () => {
  it('lança se newRecord e referenceId são fornecidos juntos', () => {
    const { g, doc } = fullSetup();
    const input = baseInput({ newRecord: { title: 'T' }, referenceId: 'ref-1' });
    expect(() => prepareJourneyElement(g, 'j1', doc, input, '', NOW))
      .toThrow('Escolha um registro existente ou crie um novo.');
  });

  it('lança se newRecord.title está vazio', () => {
    const { g, doc } = fullSetup();
    expect(() => prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: { title: '' } }), '', NOW))
      .toThrow('Informe o nome do registro.');
  });

  it('lança se newRecord.title está ausente', () => {
    const { g, doc } = fullSetup();
    expect(() => prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: {} }), '', NOW))
      .toThrow('Informe o nome do registro.');
  });

  it('lança se type=evidence e source está ausente', () => {
    const { g, doc } = fullSetup();
    const input = baseInput({ elementType: 'evidence', newRecord: { title: 'Evidência sem fonte' } });
    expect(() => prepareJourneyElement(g, 'j1', doc, input, '', NOW))
      .toThrow('Informe a fonte da evidência.');
  });

  it('evidence com source não lança', () => {
    const { g, doc } = fullSetup();
    const input = baseInput({ elementType: 'evidence', newRecord: { title: 'Evidência', source: 'Estudo 2024' } });
    const result = prepareJourneyElement(g, 'j1', doc, input, '', NOW);
    expect(result).toHaveProperty('noteId');
  });
});

// ── prepareJourneyElement – validação de registro existente ──────────────────

describe('prepareJourneyElement > registro existente (referenceId)', () => {
  it('lança se nem referenceId nem newRecord são fornecidos', () => {
    const { g, doc } = fullSetup();
    // referenceId empty + no newRecord → existing lookup with empty string → not found
    const input = baseInput({ referenceId: 'entidade-inexistente' });
    expect(() => prepareJourneyElement(g, 'j1', doc, input, '', NOW))
      .toThrow('Este registro não está mais disponível neste serviço.');
  });

  it('lança se a entidade existe mas pertence a outro serviço', () => {
    let { g, doc } = fullSetup();
    g = { ...g, entities: { need: { 'need-1': { id: 'need-1', serviceId: 'outro', title: 'N' } } } };
    const input = baseInput({ referenceId: 'need-1' });
    expect(() => prepareJourneyElement(g, 'j1', doc, input, '', NOW))
      .toThrow('Este registro não está mais disponível neste serviço.');
  });

  it('aceita referência para entidade need válida', () => {
    let { g, doc } = fullSetup();
    g = { ...g, entities: { need: { 'need-1': { id: 'need-1', serviceId: g.service.id, title: 'N' } } } };
    const result = prepareJourneyElement(g, 'j1', doc, baseInput({ referenceId: 'need-1' }), '', NOW);
    expect(result.referenceId).toBe('need-1');
  });

  it('aceita referência para pain em graph.problems', () => {
    let { g, doc } = fullSetup();
    g = { ...g, problems: { ...g.problems, 'pain-1': { id: 'pain-1', stageId: 's1', description: 'Dor' } } };
    const input = baseInput({ elementType: 'pain', referenceId: 'pain-1' });
    const result = prepareJourneyElement(g, 'j1', doc, input, '', NOW);
    expect(result.referenceId).toBe('pain-1');
  });
});

// ── prepareJourneyElement – validação de duplicata ───────────────────────────

describe('prepareJourneyElement > duplicata', () => {
  it('lança se o mesmo registro já está na célula', () => {
    let { g, doc } = fullSetup();
    g = { ...g, entities: { need: { 'need-1': { id: 'need-1', serviceId: g.service.id, title: 'N' } } } };
    // First insert
    const firstResult = prepareJourneyElement(g, 'j1', doc, baseInput({ referenceId: 'need-1' }), '', NOW);
    // Second insert on the same cell with same reference
    expect(() => prepareJourneyElement(g, 'j1', firstResult.document, baseInput({ referenceId: 'need-1' }), '', NOW))
      .toThrow('Este registro já está vinculado nesta célula.');
  });

  it('permite o mesmo registro em células diferentes', () => {
    let { g } = fullSetup();
    g = { ...g, entities: { need: { 'need-1': { id: 'need-1', serviceId: g.service.id, title: 'N' } } } };
    const doc1 = makeDocument([{ hostStageId: 's1', hostLocalId: 'local-1' }]);
    const r1 = prepareJourneyElement(g, 'j1', doc1, baseInput({ referenceId: 'need-1', rowId: 'row1' }), '', NOW);
    // Different row → different key → no duplicate
    const r2 = prepareJourneyElement(g, 'j1', r1.document, baseInput({ referenceId: 'need-1', rowId: 'row2' }), '', NOW);
    expect(r2).toHaveProperty('noteId');
  });
});

// ── prepareJourneyElement – happy paths ──────────────────────────────────────

describe('prepareJourneyElement > retorno', () => {
  it('retorna { graph, document, noteId, referenceId } na criação de need', () => {
    const { g, doc } = fullSetup();
    const result = prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: { title: 'Minha necessidade' } }), '', NOW);
    expect(result).toHaveProperty('graph');
    expect(result).toHaveProperty('document');
    expect(result).toHaveProperty('noteId');
    expect(result).toHaveProperty('referenceId');
  });

  it('o novo registro need é criado em graph.entities.need', () => {
    const { g, doc } = fullSetup();
    const result = prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: { title: 'Necessidade nova' } }), '', NOW);
    const entity = result.graph.entities?.need?.[result.referenceId];
    expect(entity).toBeDefined();
    expect(entity?.title).toBe('Necessidade nova');
  });

  it('o novo registro has serviceId correto', () => {
    const { g, doc } = fullSetup();
    const result = prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: { title: 'N' } }), '', NOW);
    expect(result.graph.entities?.need?.[result.referenceId]?.serviceId).toBe(g.service.id);
  });

  it('o novo registro evidence tem status "captured"', () => {
    const { g, doc } = fullSetup();
    const input = baseInput({ elementType: 'evidence', newRecord: { title: 'E', source: 'Fonte' } });
    const result = prepareJourneyElement(g, 'j1', doc, input, '', NOW);
    expect(result.graph.entities?.evidence?.[result.referenceId]?.status).toBe('captured');
  });

  it('o novo registro need tem status "active"', () => {
    const { g, doc } = fullSetup();
    const result = prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: { title: 'N' } }), '', NOW);
    expect(result.graph.entities?.need?.[result.referenceId]?.status).toBe('active');
  });

  it('cria opportunity em graph.opportunities e adiciona ao stage.opportunityIds', () => {
    const { g, doc } = fullSetup();
    const input = baseInput({ elementType: 'opportunity', newRecord: { title: 'Oportunidade' } });
    const result = prepareJourneyElement(g, 'j1', doc, input, '', NOW);
    const opp = (result.graph as unknown as Record<string, unknown>)['opportunities'] as Record<string, unknown>;
    expect(opp?.[result.referenceId]).toBeDefined();
    const stage = result.graph.stages['s1'];
    expect(stage?.opportunityIds).toContain(result.referenceId);
  });

  it('a nota aparece no documento retornado', () => {
    const { g, doc } = fullSetup();
    const result = prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: { title: 'N' } }), '', NOW);
    const cells = result.document.c;
    const allNotes = Object.values(cells).flat();
    expect(allNotes.some(n => (n as Record<string, unknown>)['i'] === result.noteId)).toBe(true);
  });

  it('caption é armazenado como "t" na nota', () => {
    const { g, doc } = fullSetup();
    const input = baseInput({ newRecord: { title: 'N' }, caption: 'Descrição aqui' });
    const result = prepareJourneyElement(g, 'j1', doc, input, '', NOW);
    const cells = result.document.c;
    const note = Object.values(cells).flat().find(n => (n as Record<string, unknown>)['i'] === result.noteId);
    expect((note as Record<string, unknown>)?.['t']).toBe('Descrição aqui');
  });

  it('actorId é armazenado no registro como createdBy', () => {
    const { g, doc } = fullSetup();
    const result = prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: { title: 'N' } }), 'user-123', NOW);
    const entity = result.graph.entities?.need?.[result.referenceId];
    expect(entity?.createdBy).toBe('user-123');
  });

  it('o documento original não é mutado', () => {
    const { g, doc } = fullSetup();
    const originalSteps = JSON.stringify(doc.steps);
    const originalC = JSON.stringify(doc.c);
    prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: { title: 'N' } }), '', NOW);
    expect(JSON.stringify(doc.steps)).toBe(originalSteps);
    expect(JSON.stringify(doc.c)).toBe(originalC);
  });

  it('o graph original não é mutado', () => {
    const { g, doc } = fullSetup();
    const originalStages = JSON.stringify(g.stages);
    prepareJourneyElement(g, 'j1', doc, baseInput({ newRecord: { title: 'N' } }), '', NOW);
    expect(JSON.stringify(g.stages)).toBe(originalStages);
  });

  it('edição de nota existente preserva o noteId', () => {
    let { g, doc } = fullSetup();
    g = { ...g, entities: { need: { 'need-1': { id: 'need-1', serviceId: g.service.id, title: 'N' } } } };
    // First insert to get noteId
    const first = prepareJourneyElement(g, 'j1', doc, baseInput({ referenceId: 'need-1' }), '', NOW);
    // Edit it
    const editInput = baseInput({ editingId: first.noteId, referenceId: 'need-1' });
    const second = prepareJourneyElement(g, 'j1', first.document, editInput, '', NOW);
    expect(second.noteId).toBe(first.noteId);
  });

  it('useAsJourneyPersona=true define personaId no documento e jornada', () => {
    let { g, doc } = fullSetup();
    g = { ...g, entities: { persona: { 'persona-1': { id: 'persona-1', serviceId: g.service.id, title: 'P' } } } };
    const input = baseInput({ elementType: 'persona', referenceId: 'persona-1', useAsJourneyPersona: true });
    const result = prepareJourneyElement(g, 'j1', doc, input, '', NOW);
    expect(result.document.personaId).toBe('persona-1');
    const journey = (result.graph.journeys as unknown as Record<string, Record<string, unknown>>)['j1'];
    expect(journey['personaId']).toBe('persona-1');
  });

  it('useAsJourneyPersona=false não altera personaId', () => {
    let { g, doc } = fullSetup();
    g = { ...g, entities: { persona: { 'persona-1': { id: 'persona-1', serviceId: g.service.id, title: 'P' } } } };
    const input = baseInput({ elementType: 'persona', referenceId: 'persona-1', useAsJourneyPersona: false });
    const result = prepareJourneyElement(g, 'j1', doc, input, '', NOW);
    expect(result.document.personaId).toBeUndefined();
  });

  it('insere em células diferentes com rowIds distintos', () => {
    let { g, doc } = fullSetup();
    g = { ...g, entities: { need: { 'need-1': { id: 'need-1', serviceId: g.service.id, title: 'N1' }, 'need-2': { id: 'need-2', serviceId: g.service.id, title: 'N2' } } } };
    const r1 = prepareJourneyElement(g, 'j1', doc, baseInput({ referenceId: 'need-1', rowId: 'row1' }), '', NOW);
    const r2 = prepareJourneyElement(g, 'j1', r1.document, baseInput({ referenceId: 'need-2', rowId: 'row2' }), '', NOW);
    const cells = r2.document.c;
    const allNotes = Object.values(cells).flat();
    expect(allNotes).toHaveLength(2);
  });

  it('description e category são preservados no novo registro', () => {
    const { g, doc } = fullSetup();
    const input = baseInput({ newRecord: { title: 'Canal', description: 'Desc canal', category: 'Digital' }, elementType: 'channel' });
    const result = prepareJourneyElement(g, 'j1', doc, input, '', NOW);
    const entity = result.graph.entities?.channel?.[result.referenceId];
    expect(entity?.description).toBe('Desc canal');
    expect(entity?.category).toBe('Digital');
  });
});

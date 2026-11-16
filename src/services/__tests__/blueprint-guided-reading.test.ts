import { describe, it, expect } from 'vitest';
import {
  BLUEPRINT_EMOTION_LABELS,
  blueprintEmotionValue,
  buildBlueprintGuidedReading,
} from '../blueprint-guided-reading.ts';
import type {
  BlueprintStage,
  BlueprintLane,
  BlueprintRow,
  BlueprintIssue,
  BlueprintQualityDimension,
} from '../blueprint-guided-reading.ts';

// ─── BLUEPRINT_EMOTION_LABELS ───────────────────────────────────────────────

describe('BLUEPRINT_EMOTION_LABELS', () => {
  it('contém exatamente 5 rótulos', () => {
    expect(BLUEPRINT_EMOTION_LABELS).toHaveLength(5);
  });

  it('começa com "Muito insatisfeito"', () => {
    expect(BLUEPRINT_EMOTION_LABELS[0]).toBe('Muito insatisfeito');
  });

  it('termina com "Muito satisfeito"', () => {
    expect(BLUEPRINT_EMOTION_LABELS[4]).toBe('Muito satisfeito');
  });

  it('contém "Neutro" no índice 2', () => {
    expect(BLUEPRINT_EMOTION_LABELS[2]).toBe('Neutro');
  });
});

// ─── blueprintEmotionValue ───────────────────────────────────────────────────

describe('blueprintEmotionValue', () => {
  it('retorna 0 para null', () => {
    expect(blueprintEmotionValue(null)).toBe(0);
  });

  it('retorna 0 para undefined', () => {
    expect(blueprintEmotionValue(undefined)).toBe(0);
  });

  it('retorna 0 para objeto vazio', () => {
    expect(blueprintEmotionValue({})).toBe(0);
  });

  it('retorna emotionScore inteiro -2 quando válido', () => {
    expect(blueprintEmotionValue({ emotionScore: -2 })).toBe(-2);
  });

  it('retorna emotionScore inteiro -1 quando válido', () => {
    expect(blueprintEmotionValue({ emotionScore: -1 })).toBe(-1);
  });

  it('retorna emotionScore inteiro 0 quando válido', () => {
    expect(blueprintEmotionValue({ emotionScore: 0 })).toBe(0);
  });

  it('retorna emotionScore inteiro 1 quando válido', () => {
    expect(blueprintEmotionValue({ emotionScore: 1 })).toBe(1);
  });

  it('retorna emotionScore inteiro 2 quando válido', () => {
    expect(blueprintEmotionValue({ emotionScore: 2 })).toBe(2);
  });

  it('ignora emotionScore fora do intervalo -2..2 (cai no emotion)', () => {
    expect(blueprintEmotionValue({ emotionScore: 5 as any, emotion: 'positive' })).toBe(1);
  });

  it('ignora emotionScore não-inteiro (cai no emotion)', () => {
    expect(blueprintEmotionValue({ emotionScore: 1.5 as any, emotion: 'negative' })).toBe(-1);
  });

  it('retorna -1 para emotion=negative sem emotionScore', () => {
    expect(blueprintEmotionValue({ emotion: 'negative' })).toBe(-1);
  });

  it('retorna 1 para emotion=positive sem emotionScore', () => {
    expect(blueprintEmotionValue({ emotion: 'positive' })).toBe(1);
  });

  it('retorna 0 para emotion=neutral sem emotionScore', () => {
    expect(blueprintEmotionValue({ emotion: 'neutral' })).toBe(0);
  });

  it('retorna 0 para emotion desconhecido', () => {
    expect(blueprintEmotionValue({ emotion: 'unknown' as any })).toBe(0);
  });

  it('emotionScore tem prioridade sobre emotion', () => {
    expect(blueprintEmotionValue({ emotionScore: -2, emotion: 'positive' })).toBe(-2);
  });
});

// ─── buildBlueprintGuidedReading ────────────────────────────────────────────

describe('buildBlueprintGuidedReading', () => {
  describe('chamada sem argumentos (defaults)', () => {
    it('retorna steps=0', () => {
      expect(buildBlueprintGuidedReading().steps).toBe(0);
    });

    it('retorna checklist vazio', () => {
      expect(buildBlueprintGuidedReading().checklist).toEqual([]);
    });

    it('retorna next=null', () => {
      expect(buildBlueprintGuidedReading().next).toBeNull();
    });

    it('retorna priorities vazio', () => {
      expect(buildBlueprintGuidedReading().priorities).toEqual([]);
    });

    it('retorna coverage=0', () => {
      expect(buildBlueprintGuidedReading().coverage).toBe(0);
    });

    it('retorna quality vazio', () => {
      expect(buildBlueprintGuidedReading().quality).toEqual([]);
    });

    it('retorna qualityConfigured=0', () => {
      expect(buildBlueprintGuidedReading().qualityConfigured).toBe(0);
    });

    it('retorna emotion vazio', () => {
      expect(buildBlueprintGuidedReading().emotion).toEqual([]);
    });
  });

  describe('steps', () => {
    it('steps = quantidade de stages passados', () => {
      const stages: BlueprintStage[] = [
        { id: 's1', title: 'Etapa 1' },
        { id: 's2', title: 'Etapa 2' },
      ];
      expect(buildBlueprintGuidedReading({ stages }).steps).toBe(2);
    });
  });

  describe('checklist', () => {
    it('gera checklist com uma entry por lane', () => {
      const lanes: BlueprintLane[] = [{ key: 'customer', label: 'Cliente' }];
      const result = buildBlueprintGuidedReading({ lanes });
      expect(result.checklist).toHaveLength(1);
    });

    it('checklist entry tem key, label, covered e total', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'E1' }, { id: 's2', title: 'E2' }];
      const lanes: BlueprintLane[] = [{ key: 'customer', label: 'Cliente' }];
      const rows: BlueprintRow[] = [
        { missing: [], complete: 1 },
        { missing: [{ key: 'customer' }], complete: 0 },
      ];
      const result = buildBlueprintGuidedReading({ stages, lanes, rows });
      expect(result.checklist[0]).toMatchObject({ key: 'customer', label: 'Cliente', total: 2 });
    });

    it('covered = rows sem missing para aquela lane', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'E1' }, { id: 's2', title: 'E2' }];
      const lanes: BlueprintLane[] = [{ key: 'frontstage', label: 'Linha de frente' }];
      const rows: BlueprintRow[] = [
        { missing: [], complete: 1 },              // frontstage presente
        { missing: [{ key: 'frontstage' }], complete: 0 }, // frontstage ausente
      ];
      const result = buildBlueprintGuidedReading({ stages, lanes, rows });
      expect(result.checklist[0].covered).toBe(1);
    });

    it('ordena lanes pela ordem canônica do blueprint', () => {
      const lanes: BlueprintLane[] = [
        { key: 'enablement', label: 'Habilitação' },
        { key: 'customer', label: 'Cliente' },
        { key: 'frontstage', label: 'Frente' },
      ];
      const result = buildBlueprintGuidedReading({ lanes });
      expect(result.checklist.map(c => c.key)).toEqual(['customer', 'frontstage', 'enablement']);
    });
  });

  describe('next', () => {
    it('next é null quando todas as lanes estão cobertas', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'E1' }];
      const lanes: BlueprintLane[] = [{ key: 'customer', label: 'Cliente' }];
      const rows: BlueprintRow[] = [{ missing: [], complete: 1 }];
      const result = buildBlueprintGuidedReading({ stages, lanes, rows });
      expect(result.next).toBeNull();
    });

    it('next aponta para a primeira lane incompleta', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'E1' }, { id: 's2', title: 'E2' }];
      const lanes: BlueprintLane[] = [
        { key: 'customer', label: 'Cliente' },
        { key: 'frontstage', label: 'Frente' },
      ];
      const rows: BlueprintRow[] = [
        { missing: [], complete: 2 },              // customer OK
        { missing: [{ key: 'frontstage' }], complete: 1 }, // frontstage incompleto
      ];
      const result = buildBlueprintGuidedReading({ stages, lanes, rows });
      expect(result.next?.key).toBe('frontstage');
    });
  });

  describe('priorities', () => {
    it('inclui issues sem stageId', () => {
      const issues: BlueprintIssue[] = [{ stageId: undefined, severity: 'low' }];
      const result = buildBlueprintGuidedReading({ issues });
      expect(result.priorities).toHaveLength(1);
    });

    it('inclui issues com stageId válido', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'Etapa 1' }];
      const issues: BlueprintIssue[] = [{ stageId: 's1', severity: 'low' }];
      const result = buildBlueprintGuidedReading({ stages, issues });
      expect(result.priorities).toHaveLength(1);
    });

    it('exclui issues com stageId inválido (não está em stages)', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'Etapa 1' }];
      const issues: BlueprintIssue[] = [{ stageId: 'inexistente', severity: 'low' }];
      const result = buildBlueprintGuidedReading({ stages, issues });
      expect(result.priorities).toHaveLength(0);
    });

    it('issues críticas ficam antes das não-críticas', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'E1' }];
      const issues: BlueprintIssue[] = [
        { stageId: 's1', severity: 'low' },
        { stageId: 's1', severity: 'critical' },
      ];
      const result = buildBlueprintGuidedReading({ stages, issues });
      expect(result.priorities[0].severity).toBe('critical');
    });

    it('limita priorities a no máximo 5 items', () => {
      const stages: BlueprintStage[] = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, title: `E${i}` }));
      const issues: BlueprintIssue[] = Array.from({ length: 10 }, (_, i) => ({ stageId: `s${i}`, severity: 'low' }));
      const result = buildBlueprintGuidedReading({ stages, issues });
      expect(result.priorities).toHaveLength(5);
    });

    it('priority inclui stageTitle da etapa correspondente', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'Minha Etapa' }];
      const issues: BlueprintIssue[] = [{ stageId: 's1', severity: 'low' }];
      const result = buildBlueprintGuidedReading({ stages, issues });
      expect(result.priorities[0].stageTitle).toBe('Minha Etapa');
    });

    it('priority sem stageId tem stageTitle vazio', () => {
      const issues: BlueprintIssue[] = [{ severity: 'low' }];
      const result = buildBlueprintGuidedReading({ issues });
      expect(result.priorities[0].stageTitle).toBe('');
    });
  });

  describe('coverage', () => {
    it('coverage=0 quando rows ou lanes estão vazios', () => {
      expect(buildBlueprintGuidedReading({ rows: [], lanes: [{ key: 'customer', label: 'C' }] }).coverage).toBe(0);
      expect(buildBlueprintGuidedReading({ rows: [{ missing: [], complete: 1 }], lanes: [] }).coverage).toBe(0);
    });

    it('coverage calculado corretamente', () => {
      const lanes: BlueprintLane[] = [{ key: 'customer', label: 'C' }, { key: 'frontstage', label: 'F' }];
      // 2 rows × 2 lanes = 4 slots; complete sum = 2 → 50%
      const rows: BlueprintRow[] = [
        { missing: [], complete: 1 },
        { missing: [], complete: 1 },
      ];
      expect(buildBlueprintGuidedReading({ lanes, rows }).coverage).toBe(50);
    });

    it('coverage 100% quando complete=rows.length por lane', () => {
      const lanes: BlueprintLane[] = [{ key: 'customer', label: 'C' }];
      const rows: BlueprintRow[] = [{ missing: [], complete: 1 }, { missing: [], complete: 1 }];
      expect(buildBlueprintGuidedReading({ lanes, rows }).coverage).toBe(100);
    });

    it('coverage é arredondado para inteiro', () => {
      const lanes: BlueprintLane[] = [{ key: 'customer', label: 'C' }, { key: 'frontstage', label: 'F' }, { key: 'backstage', label: 'B' }];
      const rows: BlueprintRow[] = [{ missing: [], complete: 1 }]; // 1/(1×3) = 33.33%
      expect(Number.isInteger(buildBlueprintGuidedReading({ lanes, rows }).coverage)).toBe(true);
    });
  });

  describe('quality', () => {
    it('gera um item de quality por qualityDimension', () => {
      const qualityDimensions: BlueprintQualityDimension[] = [
        { key: 'q1', label: 'Dimensão 1' },
        { key: 'q2', label: 'Dimensão 2' },
      ];
      const result = buildBlueprintGuidedReading({ qualityDimensions });
      expect(result.quality).toHaveLength(2);
    });

    it('configured=true quando qualityCriteria tem criterion não-vazio para a dimensão', () => {
      const qualityDimensions: BlueprintQualityDimension[] = [{ key: 'q1', label: 'D1' }];
      const qualityCriteria = { q1: { criterion: 'algum critério' } };
      const result = buildBlueprintGuidedReading({ qualityDimensions, qualityCriteria });
      expect(result.quality[0].configured).toBe(true);
    });

    it('configured=false quando qualityCriteria não tem entry para a dimensão', () => {
      const qualityDimensions: BlueprintQualityDimension[] = [{ key: 'q1', label: 'D1' }];
      const result = buildBlueprintGuidedReading({ qualityDimensions, qualityCriteria: {} });
      expect(result.quality[0].configured).toBe(false);
    });

    it('configured=false quando criterion é undefined', () => {
      const qualityDimensions: BlueprintQualityDimension[] = [{ key: 'q1', label: 'D1' }];
      const qualityCriteria = { q1: { criterion: undefined } };
      const result = buildBlueprintGuidedReading({ qualityDimensions, qualityCriteria });
      expect(result.quality[0].configured).toBe(false);
    });

    it('configured=false quando criterion é string vazia', () => {
      const qualityDimensions: BlueprintQualityDimension[] = [{ key: 'q1', label: 'D1' }];
      const qualityCriteria = { q1: { criterion: '' } };
      const result = buildBlueprintGuidedReading({ qualityDimensions, qualityCriteria });
      expect(result.quality[0].configured).toBe(false);
    });
  });

  describe('qualityConfigured', () => {
    it('conta apenas dimensões configuradas', () => {
      const qualityDimensions: BlueprintQualityDimension[] = [
        { key: 'q1', label: 'D1' },
        { key: 'q2', label: 'D2' },
        { key: 'q3', label: 'D3' },
      ];
      const qualityCriteria = {
        q1: { criterion: 'ok' },
        q2: { criterion: '' },
      };
      const result = buildBlueprintGuidedReading({ qualityDimensions, qualityCriteria });
      expect(result.qualityConfigured).toBe(1);
    });
  });

  describe('emotion', () => {
    it('gera um item de emotion por stage', () => {
      const stages: BlueprintStage[] = [
        { id: 's1', title: 'E1' },
        { id: 's2', title: 'E2' },
      ];
      const result = buildBlueprintGuidedReading({ stages });
      expect(result.emotion).toHaveLength(2);
    });

    it('emotion item tem stageId, stageTitle e value', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'Etapa 1', emotion: 'positive' }];
      const result = buildBlueprintGuidedReading({ stages });
      expect(result.emotion[0]).toMatchObject({ stageId: 's1', stageTitle: 'Etapa 1', value: 1 });
    });

    it('value usa blueprintEmotionValue internamente', () => {
      const stages: BlueprintStage[] = [{ id: 's1', title: 'E1', emotionScore: -2 }];
      const result = buildBlueprintGuidedReading({ stages });
      expect(result.emotion[0].value).toBe(-2);
    });
  });
});

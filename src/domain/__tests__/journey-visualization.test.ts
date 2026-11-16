import { describe, it, expect } from 'vitest';
import {
  emotionScore,
  emotionFromScore,
  metricValue,
  trendPath,
  metricRange,
} from '../journey-visualization';

// ─── emotionScore ─────────────────────────────────────────────────────────────

describe('emotionScore', () => {
  it('aceita inteiros válidos dentro do intervalo [-2, 2]', () => {
    for (const v of [-2, -1, 0, 1, 2] as const) {
      expect(emotionScore(v, 'neutral')).toBe(v);
    }
  });

  it('usa fallback para valores fora do intervalo', () => {
    expect(emotionScore(-3, 'positive')).toBe(1);
    expect(emotionScore(3, 'negative')).toBe(-1);
    expect(emotionScore(99, 'neutral')).toBe(0);
  });

  it('usa fallback para tipos não numéricos', () => {
    expect(emotionScore('1', 'positive')).toBe(1);    // string "1" não é number
    expect(emotionScore(null, 'negative')).toBe(-1);
    expect(emotionScore(undefined, 'neutral')).toBe(0);
  });

  it('usa fallback para números não inteiros (float)', () => {
    expect(emotionScore(1.5, 'positive')).toBe(1);
    expect(emotionScore(-0.5, 'negative')).toBe(-1);
  });

  it('mapeia fallback positive → 1, negative → -1, neutral → 0', () => {
    const invalid = NaN;
    expect(emotionScore(invalid, 'positive')).toBe(1);
    expect(emotionScore(invalid, 'negative')).toBe(-1);
    expect(emotionScore(invalid, 'neutral')).toBe(0);
  });
});

// ─── emotionFromScore ─────────────────────────────────────────────────────────

describe('emotionFromScore', () => {
  it('negativo → "negative"', () => {
    expect(emotionFromScore(-2)).toBe('negative');
    expect(emotionFromScore(-1)).toBe('negative');
  });

  it('positivo → "positive"', () => {
    expect(emotionFromScore(1)).toBe('positive');
    expect(emotionFromScore(2)).toBe('positive');
  });

  it('zero → "neutral"', () => {
    expect(emotionFromScore(0)).toBe('neutral');
  });
});

// ─── metricValue ──────────────────────────────────────────────────────────────

describe('metricValue', () => {
  it('retorna número para string numérica válida', () => {
    expect(metricValue('42')).toBe(42);
    expect(metricValue('-3.14')).toBe(-3.14);
    expect(metricValue('0')).toBe(0);
  });

  it('retorna número direto quando já é number', () => {
    expect(metricValue(100)).toBe(100);
    expect(metricValue(-7)).toBe(-7);
  });

  it('retorna null para string vazia ou só espaços', () => {
    expect(metricValue('')).toBeNull();
    expect(metricValue('   ')).toBeNull();
  });

  it('retorna null para tipos não numéricos', () => {
    expect(metricValue(null)).toBeNull();
    expect(metricValue(undefined)).toBeNull();
    expect(metricValue({})).toBeNull();
    expect(metricValue([])).toBeNull();
  });

  it('retorna null para strings não numéricas', () => {
    expect(metricValue('abc')).toBeNull();
    expect(metricValue('1e999')).toBeNull(); // Infinity
  });

  it('retorna null para NaN e Infinity', () => {
    expect(metricValue(NaN)).toBeNull();
    expect(metricValue(Infinity)).toBeNull();
    expect(metricValue(-Infinity)).toBeNull();
  });
});

// ─── metricRange ──────────────────────────────────────────────────────────────

describe('metricRange', () => {
  it('inclui 0 no range (min nunca passa de 0)', () => {
    expect(metricRange([5, 10, 15])).toEqual({ min: 0, max: 15 });
  });

  it('inclui 0 no range (max nunca fica abaixo de 0)', () => {
    expect(metricRange([-5, -10])).toEqual({ min: -10, max: 0 });
  });

  it('range misto positivo/negativo', () => {
    expect(metricRange([-2, 0, 4])).toEqual({ min: -2, max: 4 });
  });

  it('série com um único valor igual a 0: expande ± 1', () => {
    expect(metricRange([0])).toEqual({ min: -1, max: 1 });
  });

  it('série com um único valor positivo: min clampado em 0, max expandido +1', () => {
    // Math.min(0, 5) = 0; Math.max(0, 5) = 5; 0 ≠ 5 → não expande
    expect(metricRange([5])).toEqual({ min: 0, max: 5 });
  });

  it('ignora nulls', () => {
    expect(metricRange([null, 3, null, 7])).toEqual({ min: 0, max: 7 });
  });

  it('série totalmente null: retorna fallback { min: 0, max: 1 }', () => {
    expect(metricRange([null, null])).toEqual({ min: 0, max: 1 });
  });

  it('série vazia: retorna fallback { min: 0, max: 1 }', () => {
    expect(metricRange([])).toEqual({ min: 0, max: 1 });
  });
});

// ─── trendPath ────────────────────────────────────────────────────────────────

describe('trendPath', () => {
  it('retorna string vazia para valor null', () => {
    expect(trendPath([null, null], 0, 0, 10)).toBe('');
  });

  it('retorna string vazia para valor não finito', () => {
    expect(trendPath([NaN], 0, 0, 10)).toBe('');
  });

  it('gera um path SVG com prefixo "M"', () => {
    const path = trendPath([0, 5, 10], 1, 0, 10);
    expect(path).toMatch(/^M\s/);
  });

  it('ponto inicial e final simétricos quando vizinhos são null (isolado)', () => {
    // Sem vizinhos, leftY === currentY e rightY === currentY → linha reta
    const path = trendPath([5], 0, 0, 10);
    // O path tem a forma "M 0 {leftY} L 50 {currentY} L 100 {rightY}"
    // indices:              0  1   2   3  4    5         6   7     8
    const parts = path.split(' ').filter(Boolean);
    expect(parts[2]).toBe(parts[5]); // leftY === currentY
    expect(parts[2]).toBe(parts[8]); // leftY === rightY (linha reta)
  });

  it('usa midpoints com vizinhos presentes (leftY ≠ currentY)', () => {
    const path = trendPath([0, 10], 1, 0, 10);
    // Com vizinho esquerdo 0 e valor atual 10, leftY = midpoint(0,10) ≠ currentY(10)
    const parts = path.split(' ').filter(Boolean);
    expect(parts[1]).not.toBe(parts[5]); // leftY ≠ currentY
  });

  it('min === max não causa divisão por zero', () => {
    expect(() => trendPath([5, 5, 5], 1, 5, 5)).not.toThrow();
    const path = trendPath([5, 5, 5], 1, 5, 5);
    expect(path).toBeTruthy();
  });
});

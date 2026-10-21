/** Visual series are derived from the canonical Journey graph, never stored as a second map. */
import type { Emotion } from './model';

export type EmotionScore = -2 | -1 | 0 | 1 | 2;

export function emotionScore(value: unknown, fallback: Emotion): EmotionScore {
  if (typeof value === 'number' && Number.isInteger(value) && value >= -2 && value <= 2) {
    return value as EmotionScore;
  }
  return fallback === 'negative' ? -1 : fallback === 'positive' ? 1 : 0;
}

export function emotionFromScore(value: EmotionScore): Emotion {
  return value < 0 ? 'negative' : value > 0 ? 'positive' : 'neutral';
}

/** Empty values must not be plotted as zero. */
export function metricValue(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const yPosition = (value: number, min: number, max: number) =>
  Math.round((18 + (max - value) / (max - min || 1) * 64) * 100) / 100;

/** A cell renders one piece of a continuous curve. Boundary midpoints line up across cells. */
export function trendPath(values: Array<number | null>, index: number, min: number, max: number): string {
  const current = values[index];
  if (current === null || current === undefined || !Number.isFinite(current)) return '';
  const left = values[index - 1] ?? null;
  const right = values[index + 1] ?? null;
  const currentY = yPosition(current, min, max);
  const leftY = left === null ? currentY : yPosition((left + current) / 2, min, max);
  const rightY = right === null ? currentY : yPosition((current + right) / 2, min, max);
  return `M 0 ${leftY} L 50 ${currentY} L 100 ${rightY}`;
}

export function metricRange(values: Array<number | null>): { min: number; max: number } {
  const finite = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!finite.length) return { min: 0, max: 1 };
  const min = Math.min(0, ...finite), max = Math.max(0, ...finite);
  return min === max ? { min: min - 1, max: max + 1 } : { min, max };
}

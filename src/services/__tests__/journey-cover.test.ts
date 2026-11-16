import { describe, it, expect } from 'vitest';
import {
  JOURNEY_DEFAULT_COVER_SRC,
  JOURNEY_COVER_MAX_INPUT_BYTES,
  JOURNEY_COVER_MAX_WIDTH,
  JOURNEY_COVER_MAX_HEIGHT,
  journeyCoverSrc,
  hasCustomJourneyCover,
} from '../journey-cover';

describe('constants', () => {
  it('default cover src is a valid path', () => {
    expect(JOURNEY_DEFAULT_COVER_SRC).toMatch(/^\/.*\.svg$/);
  });

  it('max input bytes is 6 MB', () => {
    expect(JOURNEY_COVER_MAX_INPUT_BYTES).toBe(6 * 1024 * 1024);
  });

  it('max dimensions defined', () => {
    expect(JOURNEY_COVER_MAX_WIDTH).toBe(1600);
    expect(JOURNEY_COVER_MAX_HEIGHT).toBe(900);
  });
});

describe('journeyCoverSrc', () => {
  it('returns default src for undefined journey', () => {
    expect(journeyCoverSrc(undefined)).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('returns default src for null journey', () => {
    expect(journeyCoverSrc(null)).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('returns default src when coverImage is empty string', () => {
    expect(journeyCoverSrc({ coverImage: '' })).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('returns valid PNG data URL as-is', () => {
    const dataUrl = 'data:image/png;base64,abc123';
    expect(journeyCoverSrc({ coverImage: dataUrl })).toBe(dataUrl);
  });

  it('returns valid JPEG data URL as-is', () => {
    const dataUrl = 'data:image/jpeg;base64,abc123';
    expect(journeyCoverSrc({ coverImage: dataUrl })).toBe(dataUrl);
  });

  it('returns valid WebP data URL as-is', () => {
    const dataUrl = 'data:image/webp;base64,abc123';
    expect(journeyCoverSrc({ coverImage: dataUrl })).toBe(dataUrl);
  });

  it('returns default src for invalid/unknown data URL', () => {
    expect(journeyCoverSrc({ coverImage: 'data:image/gif;base64,abc' })).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('returns default src for plain https URL', () => {
    expect(journeyCoverSrc({ coverImage: 'https://example.com/image.png' })).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });
});

describe('hasCustomJourneyCover', () => {
  it('returns false for no cover', () => {
    expect(hasCustomJourneyCover(undefined)).toBe(false);
  });

  it('returns false for empty coverImage', () => {
    expect(hasCustomJourneyCover({ coverImage: '' })).toBe(false);
  });

  it('returns true for valid base64 image', () => {
    expect(hasCustomJourneyCover({ coverImage: 'data:image/png;base64,abc' })).toBe(true);
  });
});

import { describe, it, expect } from 'vitest';
import {
  JOURNEY_DEFAULT_COVER_SRC,
  JOURNEY_COVER_MAX_INPUT_BYTES,
  JOURNEY_COVER_MAX_WIDTH,
  JOURNEY_COVER_MAX_HEIGHT,
  journeyCoverSrc,
  hasCustomJourneyCover,
} from '../journey-cover';

// ── constantes ────────────────────────────────────────────────────────────────

describe('constantes de journey-cover', () => {
  it('JOURNEY_DEFAULT_COVER_SRC é uma string não vazia', () => {
    expect(typeof JOURNEY_DEFAULT_COVER_SRC).toBe('string');
    expect(JOURNEY_DEFAULT_COVER_SRC.length).toBeGreaterThan(0);
  });

  it('JOURNEY_COVER_MAX_INPUT_BYTES é 6 MB', () => {
    expect(JOURNEY_COVER_MAX_INPUT_BYTES).toBe(6 * 1024 * 1024);
  });

  it('JOURNEY_COVER_MAX_WIDTH é 1600', () => {
    expect(JOURNEY_COVER_MAX_WIDTH).toBe(1600);
  });

  it('JOURNEY_COVER_MAX_HEIGHT é 900', () => {
    expect(JOURNEY_COVER_MAX_HEIGHT).toBe(900);
  });
});

// ── journeyCoverSrc ───────────────────────────────────────────────────────────

describe('journeyCoverSrc', () => {
  it('retorna default quando journey é undefined', () => {
    expect(journeyCoverSrc(undefined)).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('retorna default quando journey é null', () => {
    expect(journeyCoverSrc(null)).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('retorna default quando coverImage é undefined', () => {
    expect(journeyCoverSrc({ coverImage: undefined })).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('retorna default quando coverImage é null', () => {
    expect(journeyCoverSrc({ coverImage: null as unknown as string })).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('retorna default quando coverImage é string vazia', () => {
    expect(journeyCoverSrc({ coverImage: '' })).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('retorna default quando coverImage é string arbitrária', () => {
    expect(journeyCoverSrc({ coverImage: 'https://example.com/img.png' })).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('retorna default quando coverImage não tem prefixo data URI válido', () => {
    expect(journeyCoverSrc({ coverImage: 'data:image/gif;base64,abc' })).toBe(JOURNEY_DEFAULT_COVER_SRC);
  });

  it('retorna o valor quando coverImage é PNG base64 válido', () => {
    const src = 'data:image/png;base64,iVBORw0KGgo=';
    expect(journeyCoverSrc({ coverImage: src })).toBe(src);
  });

  it('retorna o valor quando coverImage é JPEG base64 válido', () => {
    const src = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    expect(journeyCoverSrc({ coverImage: src })).toBe(src);
  });

  it('retorna o valor quando coverImage é WebP base64 válido', () => {
    const src = 'data:image/webp;base64,UklGRgAAAABXRUJQ';
    expect(journeyCoverSrc({ coverImage: src })).toBe(src);
  });

  it('testa case-insensitive no prefixo (PNG maiúsculo)', () => {
    const src = 'data:image/PNG;base64,iVBORw0KGgo=';
    expect(journeyCoverSrc({ coverImage: src })).toBe(src);
  });

  it('ignora espaços ao redor do valor de coverImage', () => {
    const src = 'data:image/webp;base64,UklGRgAAAABXRUJQ';
    expect(journeyCoverSrc({ coverImage: `  ${src}  ` })).toBe(src);
  });
});

// ── hasCustomJourneyCover ─────────────────────────────────────────────────────

describe('hasCustomJourneyCover', () => {
  it('retorna false para journey undefined', () => {
    expect(hasCustomJourneyCover(undefined)).toBe(false);
  });

  it('retorna false para journey null', () => {
    expect(hasCustomJourneyCover(null)).toBe(false);
  });

  it('retorna false para coverImage vazio', () => {
    expect(hasCustomJourneyCover({ coverImage: '' })).toBe(false);
  });

  it('retorna false para coverImage não-base64', () => {
    expect(hasCustomJourneyCover({ coverImage: '/custom-cover.svg' })).toBe(false);
  });

  it('retorna true para coverImage PNG base64 válido', () => {
    expect(hasCustomJourneyCover({ coverImage: 'data:image/png;base64,abc' })).toBe(true);
  });

  it('retorna true para coverImage JPEG base64 válido', () => {
    expect(hasCustomJourneyCover({ coverImage: 'data:image/jpeg;base64,abc' })).toBe(true);
  });

  it('retorna true para coverImage WebP base64 válido', () => {
    expect(hasCustomJourneyCover({ coverImage: 'data:image/webp;base64,abc' })).toBe(true);
  });

  it('retorna false para gif (tipo não suportado)', () => {
    expect(hasCustomJourneyCover({ coverImage: 'data:image/gif;base64,abc' })).toBe(false);
  });
});

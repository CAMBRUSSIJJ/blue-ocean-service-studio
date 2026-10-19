import type { Journey } from '../domain/model';

export const JOURNEY_DEFAULT_COVER_SRC = '/journey-cover-blue-ocean-h718h1.svg';
export const JOURNEY_COVER_MAX_INPUT_BYTES = 6 * 1024 * 1024;
export const JOURNEY_COVER_MAX_WIDTH = 1600;
export const JOURNEY_COVER_MAX_HEIGHT = 900;

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

export function journeyCoverSrc(journey?: Pick<Journey, 'coverImage'> | null): string {
  const value = String(journey?.coverImage ?? '').trim();
  return /^data:image\/(?:png|jpeg|webp);base64,/i.test(value) ? value : JOURNEY_DEFAULT_COVER_SRC;
}

export function hasCustomJourneyCover(journey?: Pick<Journey, 'coverImage'> | null): boolean {
  return journeyCoverSrc(journey) !== JOURNEY_DEFAULT_COVER_SRC;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('A imagem não pôde ser aberta.'));
    image.src = src;
  });
}

export async function prepareJourneyCoverFile(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Use PNG, JPG ou WebP.');
  if (file.size > JOURNEY_COVER_MAX_INPUT_BYTES) throw new Error('A imagem deve ter no máximo 6 MB.');

  const original = await fileToDataUrl(file);
  const image = await loadImage(original);
  const ratio = Math.min(1, JOURNEY_COVER_MAX_WIDTH / image.naturalWidth, JOURNEY_COVER_MAX_HEIGHT / image.naturalHeight);
  const width = Math.max(1, Math.round(image.naturalWidth * ratio));
  const height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu preparar a capa.');
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/webp', 0.86);
}

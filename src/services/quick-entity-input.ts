export type QuickEntityKind = 'persona' | 'need' | 'job';
export type QuickEntityInput = { title: string; context: string };

/**
 * Deliberately deterministic, not AI generation. A comma in a Persona input
 * separates the display name from user-provided context. Other entities keep
 * the full sentence as a meaningful title. No facts are inferred.
 */
export function parseQuickEntityInput(value: string, kind: QuickEntityKind): QuickEntityInput {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return { title: '', context: '' };
  if (kind === 'persona') {
    const index = text.indexOf(',');
    if (index > 0 && index < 140) {
      return { title: text.slice(0, index).trim(), context: text.slice(index + 1).trim().slice(0, 2000) };
    }
  }
  return { title: text.slice(0, 140), context: text.length > 140 ? text.slice(140, 2140).trim() : '' };
}

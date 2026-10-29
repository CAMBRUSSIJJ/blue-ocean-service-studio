export type EditorFieldKind = 'text' | 'number' | 'date' | 'checklist' | 'image' | 'document';
export type EntityCanvasBlock = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  essential?: boolean;
  custom?: boolean;
  kind?: EditorFieldKind;
  onChange: (value: string) => void;
};
export type EntityCriterion = { id: string; label: string; complete: boolean; kinds?: string[]; fieldId?: string };
export type EntityRelation = { id: string; kind: string; title: string; linked: boolean };
export type CustomEntityBlock = { id: string; label: string; kind: EditorFieldKind; value: string };
export const parseCustomBlocks = (data: unknown): CustomEntityBlock[] =>
  Array.isArray(data) ? data.filter((part): part is CustomEntityBlock =>
    typeof part === 'object' && part !== null && typeof part.id === 'string' &&
    typeof part.label === 'string' && typeof part.value === 'string' &&
    ['text','number','date','checklist','image','document'].includes(String(part.kind))
  ).slice(0, 60) : [];

/** Shared document validation for the matrix and its canonical host. No DOM dependencies. */
import type { ServiceGraph, JourneyMatrixBlock, JourneyMatrixActivity, JourneyMatrixConnection } from '../domain/model';

export const MATRIX_REFERENCE_TYPES = ['plan', 'metric', 'channel', 'persona', 'pain', 'need', 'evidence', 'opportunity'] as const;
export const MATRIX_CONTENT_TYPES = ['text', 'card', 'emoji', 'image', 'link', 'scale', 'embed', ...MATRIX_REFERENCE_TYPES] as const;
export const MATRIX_IMAGE_LIMIT = 500 * 1024;
export const MATRIX_IMAGE_BUDGET = 2 * 1024 * 1024;

export type MatrixReferenceType = typeof MATRIX_REFERENCE_TYPES[number];
export type MatrixContentType = typeof MATRIX_CONTENT_TYPES[number];
export type MatrixCardTone = 'neutral' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';

const clipped = (v: unknown, n: number): string =>
  typeof v === 'string' ? v.trim().slice(0, n) : '';

export function insertMatrixBlock(notes: JourneyMatrixBlock[], note: JourneyMatrixBlock, beforeId: string | null = null): JourneyMatrixBlock[] {
  if (!Array.isArray(notes) || notes.length >= 100) throw Error('Cada célula pode ter até 100 elementos.');
  if (notes.some(value => value.id === (note as unknown as Record<string, unknown>)['i'] || value.id === note.id)) throw Error('O elemento já está nesta célula.');
  const index = beforeId === null ? notes.length : notes.findIndex(value => (value as unknown as Record<string, unknown>)['i'] === beforeId);
  if (index < 0) throw Error('O ponto de inclusão mudou. Abra a inclusão novamente.');
  return [...notes.slice(0, index), note, ...notes.slice(index)];
}

export function duplicateMatrixBlock(note: JourneyMatrixBlock, id: string): JourneyMatrixBlock {
  const copy = structuredClone(note) as unknown as Record<string, unknown>;
  copy['i'] = id;
  for (const field of ['id', 'hostItemId', 'hostAction']) delete copy[field];
  return copy as unknown as JourneyMatrixBlock;
}

export const MATRIX_CARD_TONES: MatrixCardTone[] = ['neutral', 'blue', 'emerald', 'amber', 'rose', 'violet'];

/** Empty inline text/card drafts stay editable without inflating the content count. */
export function matrixCardHasContent(note: Record<string, unknown>): boolean {
  return Boolean(String((note['t'] ?? note['text'] ?? '') as string).trim() || !['text','card'].includes((note['type'] as string) || 'card'));
}

const metadataList = (value: unknown, limit: number, length: number, insensitive = false): string[] => {
  const result: string[] = [], seen = new Set<string>();
  for (const raw of Array.isArray(value) ? value : []) {
    const item = clipped(raw, length).replace(/\s+/g, ' '), key = insensitive ? item.toLocaleLowerCase() : item;
    if (!item || seen.has(key)) continue;
    seen.add(key); result.push(item);
  }
  if (result.length > limit) throw Error(`Use até ${limit} ${insensitive ? 'tags' : 'Personas'} por cartão.`);
  return result;
};

export const MATRIX_CONNECTION_TYPES: Record<string, string> = {sequence:'Sequência',dependency:'Dependência',uses:'Usa recurso',handoff:'Passagem entre equipes'};

export interface MatrixActivityInput {
  category?: string;
  owner?: unknown;
  team?: unknown;
  resourceRefs?: unknown;
  resourceNotes?: unknown;
  rule?: unknown;
  durationMinutes?: unknown;
  waitMinutes?: unknown;
  targetMinutes?: unknown;
  [key: string]: unknown;
}

export function normalizeMatrixActivity(input: MatrixActivityInput = {}): JourneyMatrixActivity {
  const number = (key: string): number | null => {
    if (input[key] === '' || input[key] == null) return null;
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < 0 || value > 525600) throw Error('Use tempos entre zero e 525600 minutos.');
    return value;
  };
  return {
    category: ['activity','support-process','resource'].includes(input.category ?? '') ? (input.category as JourneyMatrixActivity['category']) : 'activity',
    owner: clipped(input.owner, 160), team: clipped(input.team, 160),
    resourceRefs: metadataList(input.resourceRefs, 30, 180), resourceNotes: clipped(input.resourceNotes, 400),
    rule: clipped(input.rule, 1000), durationMinutes: number('durationMinutes'), waitMinutes: number('waitMinutes'), targetMinutes: number('targetMinutes'),
  };
}

export function matrixActivityFromRecord(record: Record<string, unknown>, fallbackCategory = 'activity'): JourneyMatrixActivity | null {
  const detail = (record['operationalDetails'] as Record<string, unknown>) || {};
  if (!record['owner'] && !record['team'] && !record['resourceRefs'] && !detail['matrixCategory'] && !detail['resourceNotes'] && !detail['rule'] && detail['durationMinutes'] == null && detail['waitMinutes'] == null && detail['targetMinutes'] == null) return null;
  return normalizeMatrixActivity({
    category: (detail['matrixCategory'] as string) || fallbackCategory, owner: record['owner'], team: record['team'],
    resourceRefs: record['resourceRefs'], resourceNotes: detail['resourceNotes'], rule: detail['rule'],
    durationMinutes: detail['durationMinutes'], waitMinutes: detail['waitMinutes'], targetMinutes: detail['targetMinutes'],
  });
}

export function writeMatrixActivity(record: Record<string, unknown>, input: MatrixActivityInput): void {
  const activity = normalizeMatrixActivity(input);
  record['owner'] = activity.owner; record['team'] = activity.team; record['resourceRefs'] = activity.resourceRefs;
  record['operationalDetails'] = {
    ...(record['operationalDetails'] as Record<string, unknown>),
    matrixCategory: activity.category, resourceNotes: activity.resourceNotes, rule: activity.rule,
    durationMinutes: activity.durationMinutes == null ? undefined : activity.durationMinutes,
    waitMinutes: activity.waitMinutes == null ? undefined : activity.waitMinutes,
    targetMinutes: activity.targetMinutes == null ? undefined : activity.targetMinutes,
  };
}

export function normalizeMatrixConnection(input: Record<string, unknown>): JourneyMatrixConnection {
  const a = clipped(input['a'], 160), b = clipped(input['b'], 160);
  const type = Object.hasOwn(MATRIX_CONNECTION_TYPES, input['type'] as string) ? (input['type'] as string) : 'sequence';
  if (!a || !b || a === b) throw Error('Escolha duas atividades diferentes para conectar.');
  const result: Record<string, unknown> = {
    ...input, a, b,
    id: clipped(input['id'], 160) || ('link-'+a+'-'+b).slice(0, 160),
    type, label: clipped(input['label'], 160),
  };
  if (type === 'handoff') {
    const old = (input['handoff'] as Record<string, unknown>) || {};
    const fromTeam = clipped(old['fromTeam'], 160), toTeam = clipped(old['toTeam'], 160), deliverable = clipped(old['deliverable'], 400);
    const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').toLocaleLowerCase();
    if (!fromTeam || !toTeam || !deliverable || fold(fromTeam) === fold(toTeam)) throw Error('Informe equipes de origem e destino diferentes e o que será transferido.');
    const deadline = old['deadlineMinutes'] === '' || old['deadlineMinutes'] == null ? null : Number(old['deadlineMinutes']);
    if (deadline !== null && (!Number.isFinite(deadline) || deadline < 0 || deadline > 525600)) throw Error('Informe um prazo válido em minutos.');
    result['handoff'] = { fromTeam, toTeam, deliverable, deadlineMinutes: deadline, acceptance: clipped(old['acceptance'], 1000) };
  } else delete result['handoff'];
  return result as unknown as JourneyMatrixConnection;
}

export function validateMatrixConnections(cells: Record<string, unknown[]>, connections: unknown[] = []): JourneyMatrixConnection[] {
  if (!Array.isArray(connections) || connections.length > 2000) throw Error('Use até 2000 conexões no mapa.');
  const notes = new Map<string, Record<string, unknown>>(
    Object.entries(cells).flatMap(([key, values]) =>
      values.map(note => [(note as Record<string, unknown>)['i'] as string ?? (note as Record<string, unknown>)['id'] as string, { ...(note as Record<string, unknown>), row: key.split('|')[0] }])
    )
  );
  const ids = new Set<string>(), edges: JourneyMatrixConnection[] = [];
  for (const value of connections) {
    const link = normalizeMatrixConnection(value as Record<string, unknown>);
    if (!notes.has(link.a) || !notes.has(link.b)) throw Error('Uma atividade desta conexão não está mais disponível.');
    if (ids.has(link.id)) throw Error('A conexão já existe.'); ids.add(link.id);
    const target = notes.get(link.b)!;
    if (link.type === 'uses' && (target['activity'] as Record<string, unknown>)?.['category'] !== 'resource' && !(target['row'] === 'sy' && !target['activity']) && !['channel','metric'].includes(target['type'] as string)) throw Error('Uma conexão de uso precisa apontar para um recurso. Classifique o destino nos detalhes da atividade.');
    edges.push(link);
  }
  const successors = new Map<string, string[]>();
  for (const link of edges.filter(link => link.type === 'dependency')) successors.set(link.a, [...(successors.get(link.a) || []), link.b]);
  const done = new Set<string>(), active = new Set<string>();
  const visit = (id: string): void => {
    if (active.has(id)) throw Error('As dependências não podem formar um ciclo.');
    if (done.has(id)) return;
    active.add(id);
    for (const next of successors.get(id) || []) visit(next);
    active.delete(id); done.add(id);
  };
  for (const id of successors.keys()) visit(id);
  return edges;
}

export function matrixStageGeometry(widths: unknown[]): { stages: Array<{left: number; width: number; center: number}>; total: number } {
  let total = 0;
  const stages = widths.map(value => {
    const width = Number(value);
    if (!Number.isFinite(width) || width <= 0) throw Error('Largura de etapa inválida.');
    const stage = { left: total, width, center: total + width / 2 };
    total += width;
    return stage;
  });
  return { stages, total };
}

export interface MatrixCardMetadata {
  personaIds: string[];
  tags: string[];
  tone: MatrixCardTone;
}

export interface MatrixCardFilters {
  query: string;
  type: string;
  personaId: string;
  tag: string;
  includeUnassigned: boolean;
}

export function normalizeMatrixCardMetadata(input: Record<string, unknown> = {}): MatrixCardMetadata {
  return {
    personaIds: metadataList(input['personaIds'], 20, 160),
    tags: metadataList(input['tags'], 20, 40, true),
    tone: MATRIX_CARD_TONES.includes(input['tone'] as MatrixCardTone) ? (input['tone'] as MatrixCardTone) : 'neutral',
  };
}

export function normalizeMatrixCardFilters(input: Record<string, unknown> = {}): MatrixCardFilters {
  return {
    query: clipped(input?.['query'], 160),
    type: MATRIX_CONTENT_TYPES.includes(input?.['type'] as MatrixContentType) ? (input['type'] as string) : '',
    personaId: clipped(input?.['personaId'], 160),
    tag: clipped(input?.['tag'], 40),
    includeUnassigned: input?.['includeUnassigned'] !== false,
  };
}

export function matrixCardMatches(note: Record<string, unknown>, input: Record<string, unknown> = {}, extraText = ''): boolean {
  const filter = normalizeMatrixCardFilters(input), metadata = normalizeMatrixCardMetadata(note);
  if (filter.type && ((note['type'] as string) || 'card') !== filter.type) return false;
  if (filter.personaId && !metadata.personaIds.includes(filter.personaId) && !(filter.includeUnassigned && !metadata.personaIds.length)) return false;
  if (filter.tag && !metadata.tags.some(tag => tag.toLocaleLowerCase() === filter.tag.toLocaleLowerCase())) return false;
  const fold = (value: unknown) => String(value).normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
  const searchable = fold([note['t'] ?? note['text'] ?? '', note['icon'] || '', (note['activity'] as Record<string, unknown>)?.['owner'] || '', (note['activity'] as Record<string, unknown>)?.['team'] || '', (note['activity'] as Record<string, unknown>)?.['resourceNotes'] || '', ...metadata.tags, extraText].join(' '));
  return !filter.query || fold(filter.query).split(/\s+/).every((word: string) => (searchable as string).includes(word));
}

/** Atomic edits use stable card IDs, never positions in a filtered rendering. */
export function applyMatrixCardAction(cells: Record<string, Record<string, unknown>[]>, selectedIds: string[], action: string, input: Record<string, unknown> = {}, availablePersonaIds?: string[]): Record<string, Record<string, unknown>[]> {
  const selected = new Set(selectedIds), found = new Set<string>(), next: Record<string, Record<string, unknown>[]> = {};
  if (!selected.size) throw Error('Selecione pelo menos um cartão.');
  if (!['metadata', 'tags-add', 'tags-remove', 'persona-add', 'persona-remove', 'tone', 'remove'].includes(action)) throw Error('Alteração de cartão inválida.');
  for (const [key, notes] of Object.entries(cells)) {
    next[key] = notes.flatMap(note => {
      const noteId = (note['i'] ?? note['id']) as string;
      if (!selected.has(noteId)) return [note];
      found.add(noteId);
      if (action === 'remove') return [];
      const previous = normalizeMatrixCardMetadata(note);
      let patch: Record<string, unknown> = {};
      if (action === 'metadata') patch = input;
      if (action === 'tags-add') patch['tags'] = [...previous.tags, ...((input['tags'] as string[]) || [])];
      if (action === 'tags-remove') patch['tags'] = previous.tags.filter(tag => !((input['tags'] as string[]) || []).some(value => value.trim().toLocaleLowerCase() === tag.toLocaleLowerCase()));
      if (action === 'persona-add') patch['personaIds'] = [...previous.personaIds, ...((input['personaIds'] as string[]) || [])];
      if (action === 'persona-remove') patch['personaIds'] = previous.personaIds.filter(id => !((input['personaIds'] as string[]) || []).includes(id));
      if (action === 'tone') patch['tone'] = input['tone'];
      const metadata = normalizeMatrixCardMetadata({ ...previous, ...patch });
      if (availablePersonaIds && metadata.personaIds.some(id => !previous.personaIds.includes(id) && !availablePersonaIds.includes(id))) throw Error('Uma Persona selecionada não está disponível neste serviço.');
      return [{ ...note, ...metadata }];
    });
  }
  if (found.size !== selected.size) throw Error('A seleção mudou. Selecione os cartões novamente.');
  validateMatrixDocument({ c: next });
  return next;
}

/** Read-only summaries of existing service records for the insertion catalog. */
export function matrixServiceReferences(graph: ServiceGraph, { journeyId = '', actorId = '' } = {}): Record<string, Array<Record<string, unknown>>> {
  const result: Record<string, Array<Record<string, unknown>>> = {};
  const belongs = (record: Record<string, unknown>) => record && (!record['serviceId'] || record['serviceId'] === graph.service.id);
  const usage = new Map<string, Set<string>>();
  const addStage = (type: string, id: string | undefined, stageId: string) => {
    if (!id || !graph.stages?.[stageId]) return;
    const key = type + ':' + id;
    if (!usage.has(key)) usage.set(key, new Set());
    usage.get(key)!.add(stageId);
  };
  for (const journey of Object.values(graph.journeys || {}).filter(j => belongs(j as unknown as Record<string, unknown>))) {
    for (const [stageId, rows] of Object.entries(((journey as unknown as Record<string, unknown>)['matrixContent'] as Record<string, unknown> | undefined)?.['cells'] as Record<string, unknown[]> ?? {})) {
      if (!(journey.stageIds || []).includes(stageId)) continue;
      for (const notes of Object.values(rows)) for (const note of Array.isArray(notes) ? notes : []) addStage((note as Record<string, unknown>)['type'] as string, (note as Record<string, unknown>)['referenceId'] as string, stageId);
    }
  }
  for (const stage of Object.values(graph.stages || {})) {
    for (const type of ['persona', 'channel', 'pain', 'need', 'evidence', 'opportunity']) {
      for (const id of Array.isArray((stage as unknown as Record<string, unknown>)[type + 'Ids']) ? (stage as unknown as Record<string, string[]>)[type + 'Ids'] : []) addStage(type, id, stage.id);
    }
  }
  const related = (record: Record<string, unknown>, type: string) =>
    Object.values((graph.entities as unknown as Record<string, Record<string, Record<string, unknown>>>)?.[type] || {}).filter(belongs).filter(other =>
      [(record['relatedIds'] as string[]), (record[type + 'Ids'] as string[])].some(ids => Array.isArray(ids) && ids.includes(other['id'] as string)) ||
      [(other['relatedIds'] as string[]), (other['painIds'] as string[])].some(ids => Array.isArray(ids) && ids.includes(record['id'] as string))
    ).map(other => ({ id: other['id'] as string, title: clipped(other['title'] || other['name'] || other['description'], 1000) || 'Sem nome', source: clipped(other['source'], 1000) }));

  const personas = Object.values((graph.entities as unknown as Record<string, Record<string, Record<string, unknown>>>)?.['persona'] || {}).filter(belongs);
  const personaIdsFor = (record: Record<string, unknown>, type: string): string[] => {
    const ids = new Set<string>(type === 'persona' ? [record['id'] as string] : []);
    const linked = Array.isArray(record['personaIds']) ? record['personaIds'] as string[] : [];
    for (const id of linked) if (personas.some(persona => persona['id'] === id)) ids.add(id);
    for (const persona of personas) {
      if (Array.isArray(record['relatedIds']) && (record['relatedIds'] as string[]).includes(persona['id'] as string) ||
          Array.isArray(persona['relatedIds']) && (persona['relatedIds'] as string[]).includes(record['id'] as string) ||
          type === 'evidence' && Array.isArray(persona['personaEvidenceClaims']) &&
          (persona['personaEvidenceClaims'] as Array<Record<string, unknown>>).some(claim => Array.isArray(claim['evidenceIds']) && (claim['evidenceIds'] as string[]).includes(record['id'] as string))) ids.add(persona['id'] as string);
    }
    return [...ids];
  };

  for (const type of ['channel', 'persona', 'pain', 'need', 'evidence', 'opportunity']) {
    const entities = graph.entities as unknown as Record<string, Record<string, Record<string, unknown>>>;
    const records: Record<string, Record<string, unknown>> = {
      ...(entities?.[type] || {}),
      ...(type === 'pain' ? (graph.problems as unknown as Record<string, Record<string, unknown>>) : type === 'opportunity' ? (graph.opportunities as unknown as Record<string, Record<string, unknown>>) : {}),
    };
    result[type] = Object.values(records).filter(belongs).map(record => {
      addStage(type, record['id'] as string, record['stageId'] as string);
      const stages = [...(usage.get(type + ':' + record['id']) || [])].map(id => ({
        id, title: clipped((graph.stages[id] as unknown as Record<string, unknown>)?.['title'], 240),
        journeyId: (graph.stages[id] as unknown as Record<string, unknown>)?.['journeyId'] as string ||
          Object.values(graph.journeys || {}).find(j => j.stageIds?.includes(id))?.id || '',
      }));
      return {
        id: record['id'], title: clipped(record['title'] || record['name'] || record['description'], 1000) || 'Sem nome',
        description: clipped(record['description'] || record['context'], 1000),
        category: clipped(record['category'], 160), source: clipped(record['source'], 1000),
        stageName: clipped((graph.stages?.[record['stageId'] as string] as unknown as Record<string, unknown>)?.['title'], 240),
        stages, inJourney: stages.some(stage => stage.journeyId === journeyId) || type === 'persona' && graph.journeys?.[journeyId]?.personaId === record['id'],
        createdByMe: !!actorId && record['createdBy'] === actorId,
        status: clipped(record['status'], 80), personaIds: personaIdsFor(record, type),
        tags: (Array.isArray(record['tags']) ? record['tags'] : []).map(tag => clipped(tag, 40)).filter(Boolean).slice(0, 20),
        needs: related(record, 'need'), evidence: related(record, 'evidence'),
      };
    });
  }
  return result;
}

export function matrixSafeUrl(value: unknown, image = false): string {
  const valueString = typeof value === 'string' ? value.trim() : '';
  if (image && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(valueString)) {
    if (valueString.length > Math.ceil(MATRIX_IMAGE_LIMIT * 4 / 3) + 100) return '';
    return valueString;
  }
  if (valueString.length > 2048) return '';
  try {
    const url = new URL(valueString);
    if (!(['https:', ...(image ? [] : ['http:'])]).includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}

/** Only provider URLs are embedded; arbitrary HTML remains plain text. */
export function matrixEmbedUrl(value: unknown): string {
  const safe = matrixSafeUrl(value, true);
  if (!safe || safe.startsWith('data:')) return '';
  const url = new URL(safe), host = url.hostname.toLowerCase().replace(/^www\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.slice(1);
  if (['youtube.com', 'youtube-nocookie.com'].includes(host)) id = url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : url.searchParams.get('v') || '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return 'https://www.youtube-nocookie.com/embed/' + id;
  if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
    id = url.pathname.replace(/^\/video\//, '').replace(/^\//, '');
    if (/^\d+$/.test(id)) return 'https://player.vimeo.com/video/' + id;
  }
  if (host === 'figma.com' && /^\/(file|design|proto)\//.test(url.pathname)) return 'https://www.figma.com/embed?embed_host=share&url=' + encodeURIComponent(safe);
  return '';
}

export interface MatrixScale {
  min: number; max: number; step: number;
  minLabel: string; maxLabel: string; value?: number;
}

export function normalizeMatrixScale(input: Record<string, unknown> = {}): MatrixScale {
  const number = (v: unknown, fallback: number | undefined) => v === '' || v === null || v === undefined ? fallback : Number(v);
  const min = number(input['min'], 0) as number, max = number(input['max'], 10) as number, step = number(input['step'], 1) as number;
  if (![min, max, step].every(Number.isFinite) || min >= max || max - min > 1000000 || step <= 0 || step > max - min) throw Error('Revise o início, o fim e o intervalo da escala.');
  const scale: MatrixScale = { min, max, step, minLabel: clipped(input['minLabel'], 80), maxLabel: clipped(input['maxLabel'], 80) };
  const value = number(input['value'], undefined);
  if (value !== undefined) {
    if (!Number.isFinite(value) || value < min || value > max || Math.abs((value - min) / step - Math.round((value - min) / step)) > 1e-7) throw Error('O valor precisa respeitar os limites e o intervalo da escala.');
    scale.value = value as number;
  }
  return scale;
}

export function normalizeMatrixBlock(note: Record<string, unknown>): JourneyMatrixBlock {
  const type = MATRIX_CONTENT_TYPES.includes(note?.['type'] as MatrixContentType) ? (note['type'] as MatrixContentType) : 'card';
  const normalized: Record<string, unknown> = {
    id: clipped(note?.['id'] ?? note?.['i'], 160), type,
    text: clipped(note?.['text'] ?? note?.['t'], 1000),
  };
  if (!normalized['id']) throw Error('O elemento precisa de uma identificação.');
  const icon = clipped(note?.['icon'], 24);
  if (icon) normalized['icon'] = icon;
  if (type === 'link' || type === 'image') {
    normalized['url'] = matrixSafeUrl(note?.['url'], type === 'image');
    if (!normalized['url']) throw Error(type === 'image' ? 'Use uma imagem HTTPS ou um arquivo JPG, PNG ou WebP de até 500 KB.' : 'Informe um link completo HTTP ou HTTPS.');
    if (!normalized['text']) throw Error(type === 'image' ? 'Descreva a imagem para quem não consegue vê-la.' : 'Dê um título ao link.');
  }
  if (type === 'scale') normalized['scale'] = normalizeMatrixScale(note['scale'] as Record<string, unknown>);
  if (type === 'embed') {
    normalized['url'] = matrixSafeUrl(note['url'], true);
    if (!matrixEmbedUrl(normalized['url'])) throw Error('Use um endereço de YouTube, Vimeo ou Figma.');
    if (!normalized['text']) throw Error('Dê um título ao conteúdo incorporado.');
  }
  if (MATRIX_REFERENCE_TYPES.includes(type as MatrixReferenceType)) {
    normalized['referenceId'] = clipped(note['referenceId'], 160);
    if (!normalized['referenceId']) throw Error('Selecione um registro do serviço.');
  }
  if (note?.['credit']) normalized['credit'] = clipped(note['credit'], 240);
  const metadata = normalizeMatrixCardMetadata(note);
  if (Array.isArray(note['personaIds'])) normalized['personaIds'] = metadata.personaIds;
  if (Array.isArray(note['tags'])) normalized['tags'] = metadata.tags;
  if (note['tone']) normalized['tone'] = metadata.tone;
  if (note['activity']) normalized['activity'] = normalizeMatrixActivity(note['activity'] as MatrixActivityInput);
  if (note['canvas'] && typeof note['canvas'] === 'object') {
    const canvas = note['canvas'] as Record<string, unknown>;
    const kind = clipped(canvas['kind'], 30);
    if (!['activity','customer-action','touchpoint','artifact','decision','system','resource','metric','channel','emotion','thought','persona','need','pain','opportunity','text'].includes(kind)) throw Error('Tipo de componente do canvas inválido.');
    const secureExternal = (raw: unknown): string => {
      const str = clipped(raw, 2000);
      if (!str) return '';
      try { const url = new URL(str); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
    };
    const dimension = (raw: unknown, min: number, max: number): number | null => {
      if (raw === '' || raw == null) return null;
      const value = Number(raw);
      return Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : null;
    };
    normalized['canvas'] = {
      version: 1, kind, description: clipped(canvas['description'], 1000),
      channelId: clipped(canvas['channelId'], 160), metricId: clipped(canvas['metricId'], 160),
      imageUrl: secureExternal(canvas['imageUrl']), linkUrl: secureExternal(canvas['linkUrl']),
      tone: ['default','blue','teal','amber','violet','neutral'].includes(canvas['tone'] as string) ? canvas['tone'] : 'default',
      iconKey: ['activity','customer-action','touchpoint','artifact','decision','system','resource','metric','channel','emotion','thought','persona','need','pain','opportunity','text'].includes(canvas['iconKey'] as string) ? canvas['iconKey'] : kind,
      evidenceType: ['image','document','link','physical'].includes(canvas['evidenceType'] as string) ? canvas['evidenceType'] : 'physical',
      width: dimension(canvas['width'], 150, 600), height: dimension(canvas['height'], 80, 480),
    };
  }
  return normalized as unknown as JourneyMatrixBlock;
}

export interface MatrixRowSettings {
  n: string; h: string; icon: string;
  defaultType: MatrixContentType;
  tone: MatrixCardTone;
}

export function normalizeMatrixRow(input: Record<string, unknown> = {}): MatrixRowSettings {
  return {
    n: clipped(input['n'], 100), h: clipped(input['h'], 240), icon: clipped(input['icon'], 24),
    defaultType: MATRIX_CONTENT_TYPES.includes(input['defaultType'] as MatrixContentType) ? (input['defaultType'] as MatrixContentType) : 'card',
    tone: MATRIX_CARD_TONES.includes(input['tone'] as MatrixCardTone) ? (input['tone'] as MatrixCardTone) : 'neutral',
  };
}

export function validateMatrixDocument(doc: { c?: Record<string, unknown[]>; links?: unknown[] }): void {
  let imageBytes = 0;
  if (Object.keys(doc.c || {}).length > 9000) throw Error('O mapa atingiu o limite de células.');
  for (const [key, notes] of Object.entries(doc.c || {})) {
    if (!Array.isArray(notes) || notes.length > 100) throw Error('Cada célula pode ter até 100 elementos.');
    for (const note of notes) {
      const block = normalizeMatrixBlock(note as Record<string, unknown>), row = key.split('|')[0];
      if (block.activity && ['fl','bk'].includes(row) && block.activity.category !== 'activity') throw Error('Recursos e processos de suporte pertencem à faixa Sistemas e apoio.');
      if (block.activity && row === 'sy' && block.activity.category === 'activity') throw Error('Coloque as atividades de execução em Linha de frente ou Bastidores.');
      if (block.type === 'image' && (block as unknown as Record<string, unknown>)['url'] && ((block as unknown as Record<string, unknown>)['url'] as string).startsWith('data:')) imageBytes += ((block as unknown as Record<string, unknown>)['url'] as string).length * .75;
    }
  }
  if (doc.links) validateMatrixConnections(doc.c || {}, doc.links);
  if (imageBytes > MATRIX_IMAGE_BUDGET) throw Error('As imagens deste mapa atingiram 2 MB. Use imagens menores ou links HTTPS.');
}

export function matrixContentFromDocument(doc: Record<string, unknown>, stageIds: string[], sync: Record<string, unknown> = {}): { version: 1; rows: Record<string, MatrixRowSettings>; cells: Record<string, Record<string, JourneyMatrixBlock[]>>; connections: JourneyMatrixConnection[] } {
  const rows: Record<string, MatrixRowSettings> = {}, cells: Record<string, Record<string, JourneyMatrixBlock[]>> = {};
  for (const [id, value] of Object.entries((doc['rowSettings'] as Record<string, Record<string, unknown>>) || {})) {
    if (/^[a-z][a-z0-9]{0,24}$/.test(id)) rows[id] = normalizeMatrixRow(value);
  }
  const docCells = (doc['c'] as Record<string, unknown[]>) || {};
  const syncNotes = (sync['notes'] as Record<string, string>) || {};
  stageIds.forEach((id, index) => {
    cells[id] = {};
    for (const [key, notes] of Object.entries(docCells)) {
      const [row, column] = key.split('|');
      if (Number(column) !== index || !/^[a-z][a-z0-9]{0,24}$/.test(row)) continue;
      cells[id][row] = (notes as Record<string, unknown>[]).map(note => normalizeMatrixBlock({
        ...note,
        id: (note['hostItemId'] as string) || syncNotes[note['i'] as string] || (note['i'] as string),
      }));
    }
  });
  const identities = new Map<string, string>(
    Object.values(docCells).flatMap(notes =>
      (notes as Record<string, unknown>[]).map(note => [
        note['i'] as string,
        (note['hostItemId'] as string) || syncNotes[note['i'] as string] || (note['i'] as string),
      ])
    )
  );
  const connections = validateMatrixConnections(docCells, (doc['links'] as unknown[]) || []).map(link => ({
    ...link, a: identities.get(link.a) ?? link.a, b: identities.get(link.b) ?? link.b,
  }));
  return { version: 1, rows, cells, connections };
}

/** Canonical text wins after an edit elsewhere; supplemental rows belong to this document. */
export function restoreMatrixContent(ref: Record<string, unknown>, stored: Record<string, unknown> | null | undefined, stageIds: string[]): Record<string, unknown> {
  ref['rowSettings'] = stored?.['rows'] || {};
  stageIds.forEach((id, index) => {
    const storedCells = stored?.['cells'] as Record<string, Record<string, Record<string, unknown>[]>> | undefined;
    for (const [row, blocks] of Object.entries(storedCells?.[id] || {})) {
      const key = row + '|' + index;
      const refC = ref['c'] as Record<string, Record<string, unknown>[]>;
      if (['sd', 'em', 'im', 'th', 'ch'].includes(row)) {
        refC[key] = blocks.map(block => ({ ...block, i: block['id'], t: block['text'] }));
        continue;
      }
      const existing = refC[key] || [];
      const included = new Set<string>();
      refC[key] = blocks.flatMap(block => {
        const note = existing.find(n => ((n['hostItemId'] as string) || (n['i'] as string)) === block['id']);
        if (note) {
          included.add(note['i'] as string);
          const { id: _id, text: _text, ...metadata } = block;
          return [{ ...note, ...metadata }];
        }
        if (block['canvas'] || MATRIX_REFERENCE_TYPES.includes(block['type'] as MatrixReferenceType)) return [{ ...block, i: block['id'], t: block['text'] }];
        return [];
      });
      refC[key].push(...existing.filter(note => !included.has(note['i'] as string)));
      for (const block of blocks) if (!block['text'] && !MATRIX_REFERENCE_TYPES.includes(block['type'] as MatrixReferenceType) && !existing.some(n => ((n['hostItemId'] as string) || (n['i'] as string)) === block['id'])) refC[key].push({ ...block, i: block['id'], t: '' });
    }
  });
  if (Array.isArray(stored?.['connections'])) {
    const refC = ref['c'] as Record<string, Record<string, unknown>[]>;
    const identities = new Map<string, string>(
      Object.values(refC).flatMap(notes => notes.map(note => [(note['hostItemId'] as string) || (note['i'] as string), note['i'] as string]))
    );
    (ref['links'] as unknown[]) = (stored['connections'] as Record<string, unknown>[])
      .filter(link => identities.has(link['a'] as string) && identities.has(link['b'] as string))
      .map(link => ({ ...link, a: identities.get(link['a'] as string), b: identities.get(link['b'] as string) }));
  }
  return ref;
}

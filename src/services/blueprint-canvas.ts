import { normalizeMatrixActivity, validateMatrixDocument, normalizeMatrixConnection } from './journey-content.ts';

/** A projection of the existing matrix document. This module never owns another service graph. */
export const CANVAS_COMPONENTS = {
  'customer-action': { title: 'Ação do cliente', icon: '↗', row: 'ac', rows: ['ac', 'fl', 'bk', 'sy'], group: 'experience', hint: 'O que a pessoa faz' },
  channel: { title: 'Canal', icon: '◎', row: 'ch', rows: ['*'], group: 'experience', hint: 'WhatsApp, loja, telefone…' },
  emotion: { title: 'Emoção', icon: '☺', row: 'em', rows: ['em'], group: 'experience', hint: 'Como o cliente se sente' },
  thought: { title: 'Pensamento', icon: '◌', row: 'th', rows: ['*'], group: 'experience', hint: 'O que a pessoa pensa' },
  activity: { title: 'Atividade', icon: '▣', row: 'fl', rows: ['ac', 'fl', 'bk', 'sy'], group: 'operation', hint: 'Atendimento e execução' },
  touchpoint: { title: 'Ponto de contato', icon: '◉', row: 'ac', rows: ['ac'], hint: 'Interação com o cliente' },
  artifact: { title: 'Evidência física/digital', icon: '▤', row: 'ev', rows: ['ev'], hint: 'O que o cliente vê ou recebe' },
  decision: { title: 'Decisão operacional', icon: '◇', row: 'bk', rows: ['fl', 'bk'], hint: 'Regra ou condição da operação' },
  system: { title: 'Sistema', icon: '▦', row: 'sy', rows: ['sy'], hint: 'Aplicação e plataforma' },
  resource: { title: 'Recurso', icon: '⬡', row: 'sy', rows: ['sy'], hint: 'Pessoas, meios e infraestrutura' },
  metric: { title: 'Indicador', icon: '◷', row: 'sy', rows: ['ev', 'ac', 'fl', 'bk', 'sy'], hint: 'Medição vinculada ao serviço' },
  persona: { title: 'Persona', icon: '♙', row: 'sd', rows: ['*'], group: 'experience', hint: 'Quem vive a experiência' },
  need: { title: 'Necessidade', icon: '◈', row: 'sd', rows: ['*'], group: 'experience', hint: 'O que o cliente precisa' },
  pain: { title: 'Dor', icon: '!', row: 'im', rows: ['*'], group: 'experience', hint: 'Problema percebido pelo cliente' },
  opportunity: { title: 'Ideia de melhoria', icon: '✧', row: 'im', rows: ['*'], group: 'experience', hint: 'Uma oportunidade para melhorar' },
  text: { title: 'Cartão livre', icon: 'T', row: 'sd', rows: ['*'], group: 'content', hint: 'Uma anotação simples' },
} as const;

export type CanvasComponentKind = keyof typeof CANVAS_COMPONENTS;

export function canvasAcceptsRow(kind: string, row: string): boolean {
  const component = CANVAS_COMPONENTS[kind as CanvasComponentKind];
  return !!component && (component.rows.includes('*' as never) || component.rows.includes(row as never));
}

/** New placements keep customer behavior separate from operational activity. Legacy cards remain readable/movable. */
export function canvasAcceptsNewRow(kind: string, row: string): boolean {
  if (kind === 'customer-action') return row === 'ac';
  if (kind === 'activity') return ['fl', 'bk', 'sy'].includes(row);
  return canvasAcceptsRow(kind, row);
}

export function canvasPlacementHint(kind: string, row: string): string {
  if (kind === 'customer-action' && row !== 'ac') return 'Ação do cliente pertence à faixa Ações do cliente. Para trabalho da equipe, utilize Atividade.';
  if (kind === 'activity' && row === 'ac') return 'Atividade representa a operação. Para uma ação realizada pelo cliente, utilize Ação do cliente.';
  return 'Este componente não pertence a esta faixa. Escolha uma faixa compatível.';
}

const text = (value: unknown, limit: number): string =>
  typeof value === 'string' ? value.trim().slice(0, limit) : '';

export function canvasSafeUrl(value: unknown): string {
  const raw = text(value, 2000);
  if (!raw) return '';
  try { const url = new URL(raw); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}

export function canvasDimension(value: unknown, min: number, max: number): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : null;
}

export const CANVAS_GRID = { label: 218, stage: 392, header: 96, gap: 16, cardWidth: 328, cardHeight: 112, padding: 18 } as const;
export const CANVAS_STAGE_MIN = 210;
export const CANVAS_STAGE_MAX = 600;

type AnyRecord = Record<string, unknown>;

export function canvasCardWidth(note: AnyRecord = {}, stageWidth: number = CANVAS_GRID.stage): number {
  return Math.min(stageWidth - 28, canvasDimension((note['canvas'] as AnyRecord | undefined)?.['width'], 150, 600) ?? CANVAS_GRID.cardWidth);
}

export function canvasCardHeight(note: AnyRecord = {}, row = ''): number {
  const custom = canvasDimension((note['canvas'] as AnyRecord | undefined)?.['height'], 80, 480);
  if (custom !== null) return custom;
  const kind = canvasKind(note, row);
  if (kind === 'artifact' && canvasSafeUrl((note['canvas'] as AnyRecord | undefined)?.['imageUrl'] || note['url'])) return 164;
  if (kind === 'channel') return 88;
  if (kind === 'text') return 98;
  return CANVAS_GRID.cardHeight;
}

export function canvasRowHeight(doc: AnyRecord, definition: AnyRecord, indices: number[], minimum = 0): number {
  if (definition['id'] === 'em') return Math.max(132, Number(minimum) || 0);
  const g = CANVAS_GRID;
  const cells = doc['c'] as Record<string, AnyRecord[]>;
  const total = indices.map(index => {
    const notes = cells[definition['id'] + '|' + index] || [];
    return notes.length
      ? g.padding * 2 + notes.reduce((sum, note) => sum + canvasCardHeight(note, definition['id'] as string), 0) + Math.max(0, notes.length - 1) * g.gap
      : 0;
  });
  return Math.max(90, ...total, Math.min(540, Math.max(0, Number(minimum) || 0)));
}

export type CanvasTone = 'default' | 'blue' | 'teal' | 'amber' | 'violet' | 'neutral';
export type EvidenceType = 'image' | 'document' | 'link' | 'physical';

export interface CanvasMetadata {
  version: 1;
  kind: CanvasComponentKind;
  description: string;
  channelId: string;
  metricId: string;
  imageUrl: string;
  linkUrl: string;
  iconKey: CanvasComponentKind;
  tone: CanvasTone;
  evidenceType: EvidenceType;
  width: number | null;
  height: number | null;
}

export function normalizeCanvasMetadata(input: AnyRecord = {}): CanvasMetadata {
  if (!Object.hasOwn(CANVAS_COMPONENTS, input['kind'] as string)) throw Error('Tipo de componente indisponível.');
  return {
    version: 1,
    kind: input['kind'] as CanvasComponentKind,
    description: text(input['description'], 1000),
    channelId: text(input['channelId'], 160),
    metricId: text(input['metricId'], 160),
    imageUrl: canvasSafeUrl(input['imageUrl']),
    linkUrl: canvasSafeUrl(input['linkUrl']),
    iconKey: Object.hasOwn(CANVAS_COMPONENTS, input['iconKey'] as string) ? input['iconKey'] as CanvasComponentKind : input['kind'] as CanvasComponentKind,
    tone: (['default', 'blue', 'teal', 'amber', 'violet', 'neutral'] as CanvasTone[]).includes(input['tone'] as CanvasTone) ? input['tone'] as CanvasTone : 'default',
    evidenceType: (['image', 'document', 'link', 'physical'] as EvidenceType[]).includes(input['evidenceType'] as EvidenceType) ? input['evidenceType'] as EvidenceType : 'physical',
    width: canvasDimension(input['width'], 150, 600),
    height: canvasDimension(input['height'], 80, 480),
  };
}

export function canvasKind(note: AnyRecord, row: string): string {
  if (Object.hasOwn(CANVAS_COMPONENTS, (note['canvas'] as AnyRecord | undefined)?.['kind'] as string)) return (note['canvas'] as AnyRecord)['kind'] as string;
  if (note['type'] === 'metric') return 'metric';
  if (note['hostKind'] === 'touchpoint') return 'touchpoint';
  if (note['hostKind'] === 'resource') return 'resource';
  if (row === 'ev' && !['pain', 'evidence', 'need', 'persona'].includes(note['type'] as string)) return 'artifact';
  if (row === 'sy' && (note['activity'] as AnyRecord | undefined)?.['category'] !== 'support-process') return 'system';
  return 'activity';
}

export function canvasStageIndex(doc: AnyRecord, input: { stageId?: string; stageLocalId?: string }): number {
  const steps = doc['steps'] as Array<{ hostStageId: string; hostLocalId: string }>;
  const index = steps.findIndex(step =>
    input.stageId ? step.hostStageId === input.stageId : input.stageLocalId && step.hostLocalId === input.stageLocalId
  );
  if (index < 0) throw Error('A etapa mudou. Selecione uma etapa disponível.');
  return index;
}

export function prepareCanvasInput(doc: AnyRecord, input: AnyRecord): AnyRecord {
  const kind = input['kind'] as string, component = CANVAS_COMPONENTS[kind as CanvasComponentKind];
  if (!component) throw Error('Escolha um componente disponível.');
  const index = canvasStageIndex(doc, input as { stageId?: string; stageLocalId?: string });
  const row = (input['row'] as string) || component.row;
  if (!canvasAcceptsNewRow(kind, row)) throw Error(canvasPlacementHint(kind, row));
  const title = text(input['title'], 240); if (!title) throw Error('Informe o nome do componente.');
  const cells = doc['c'] as Record<string, AnyRecord[]>;
  if ((cells[row + '|' + index] || []).length >= 100) throw Error('Esta etapa e faixa já possuem 100 elementos.');
  const activity = normalizeMatrixActivity({ ...input, category: row === 'sy' ? (['activity', 'customer-action'].includes(kind) ? 'support-process' : 'resource') : 'activity' });
  return { kind, row, index, title, activity, canvas: normalizeCanvasMetadata({ ...input, kind }) };
}

export function moveCanvasCard(doc: AnyRecord, id: string, input: AnyRecord): AnyRecord {
  const next = structuredClone(doc) as AnyRecord;
  const cells = next['c'] as Record<string, AnyRecord[]>;
  const source = Object.entries(cells).find(([, notes]) => notes.some(note => note['i'] === id));
  if (!source) throw Error('Este componente não está mais no mapa.');
  const [sourceKey, sourceNotes] = source;
  const note = sourceNotes.find(note => note['i'] === id)!;
  const index = canvasStageIndex(next, input as { stageId?: string; stageLocalId?: string });
  const row = text(input['row'], 25);
  if (!/^[a-z][a-z0-9]{0,24}$/.test(row)) throw Error('Faixa inválida.');
  let kind = canvasKind(note, sourceKey.split('|')[0]);
  if (note['canvas'] && !canvasAcceptsRow(kind, row)) throw Error('Esta faixa não aceita o componente selecionado.');
  if (['activity', 'customer-action'].includes(kind)) {
    kind = row === 'ac' ? 'customer-action' : 'activity';
    if (note['canvas']) (note['canvas'] as AnyRecord)['kind'] = kind;
    if (row === 'ac') note['reclassifyActivity'] = row !== sourceKey.split('|')[0];
  }
  if (kind === 'emotion' && index !== Number(sourceKey.split('|')[1])) {
    const steps = next['steps'] as AnyRecord[];
    const previous = steps[Number(sourceKey.split('|')[1])], target = steps[index];
    if ((cells['em|' + index] || []).some(value => (value['canvas'] as AnyRecord | undefined)?.['kind'] === 'emotion')) throw Error('Esta etapa já possui um cartão de emoção.');
    if (target['emotionRecorded']) throw Error('Esta etapa já possui uma emoção registrada. Edite-a antes de mover.');
    for (const field of ['e', 'note', 'emotionRecorded', 'emotionStatus', 'emotionSource']) target[field] = previous[field];
    Object.assign(previous, { e: 0, note: '', emotionRecorded: false, emotionStatus: 'hypothesis', emotionSource: '' });
  }
  if (note['activity'] && ['fl', 'bk', 'sy'].includes(row)) {
    const category = row === 'sy' ? (kind === 'activity' ? 'support-process' : 'resource') : 'activity';
    if (['resource', 'system'].includes(kind) && row !== 'sy') throw Error('Coloque recursos e sistemas em Sistemas e apoio.');
    note['activity'] = normalizeMatrixActivity({ ...(note['activity'] as AnyRecord), category });
    note['reclassifyActivity'] = row !== sourceKey.split('|')[0];
  }
  cells[sourceKey] = sourceNotes.filter(value => value['i'] !== id);
  const target = row + '|' + index, list = cells[target] || [];
  if (list.length >= 100) throw Error('Esta célula já possui 100 elementos.');
  const position = input['beforeId'] ? list.findIndex(value => value['i'] === input['beforeId']) : -1;
  if (input['beforeId'] && position < 0) throw Error('O ponto de inclusão mudou. Tente novamente.');
  cells[target] = position < 0 ? [...list, note] : [...list.slice(0, position), note, ...list.slice(position)];
  validateMatrixDocument(next as unknown as Parameters<typeof validateMatrixDocument>[0]);
  return next;
}

export function insertCanvasStage(doc: AnyRecord, input: AnyRecord): AnyRecord {
  const next = structuredClone(doc) as AnyRecord;
  const title = text(input['title'], 240); if (!title) throw Error('Dê um nome à etapa.');
  const steps = next['steps'] as AnyRecord[];
  if (steps.length >= 90) throw Error('Este mapa já possui 90 etapas.');
  const at = input['afterStageId'] || input['afterStageLocalId']
    ? canvasStageIndex(next, { stageId: input['afterStageId'] as string, stageLocalId: input['afterStageLocalId'] as string }) + 1
    : steps.length;
  if (!input['localId']) throw Error('A etapa precisa de uma identificação.');
  steps.splice(at, 0, { n: title, e: 0, d: '', emotionRecorded: false, hostLocalId: input['localId'] });
  const cells = next['c'] as Record<string, AnyRecord[]>;
  next['c'] = Object.fromEntries(
    Object.entries(cells).map(([key, notes]) => {
      const [row, column] = key.split('|'), index = Number(column);
      return [row + '|' + (index >= at ? index + 1 : index), notes];
    })
  );
  const iss = (next['iss'] as AnyRecord[] | undefined) || [];
  next['iss'] = iss.map(issue => ({ ...issue, s: (issue['s'] as number) >= at ? (issue['s'] as number) + 1 : issue['s'] }));
  return next;
}

export function canvasStageWidth(value: unknown, fallback = CANVAS_GRID.stage): number {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? Math.max(CANVAS_STAGE_MIN, Math.min(CANVAS_STAGE_MAX, Math.round(Number(value))))
    : fallback;
}

export function canvasEmotionScore(step: AnyRecord = {}): number {
  const score = Number(step['e']);
  return Math.max(-2, Math.min(2, Number.isFinite(score) ? Math.round(score) : 0));
}

export interface CanvasPoint { x: number; y: number }

export function canvasEmotionPoint(stage: { x: number; width: number; step: AnyRecord }, row: { y: number }): CanvasPoint {
  return { x: stage.x + stage.width / 2, y: row.y + 24 + (2 - canvasEmotionScore(stage.step)) * 16 };
}

export interface RowDef {
  id: string;
  n: string;
  y?: number;
  height?: number;
  [key: string]: unknown;
}

export function canvasBoundary(row: RowDef, index: number, rows: RowDef[]): string | { fl: string; bk: string; sy: string }[keyof { fl: string; bk: string; sy: string }] | '' {
  const previous = ({ fl: 'ac', bk: 'fl', sy: 'bk' } as Record<string, string>)[row.id];
  const before = rows.findIndex(value => value.id === previous);
  if (!previous || before < 0 || before >= index || rows.slice(before + 1, index).some(value => ['fl', 'bk', 'sy'].includes(value.id))) return '';
  return ({ fl: 'Linha de interação', bk: 'Linha de visibilidade · início dos bastidores', sy: 'Linha de interação interna · apoio' } as Record<string, string>)[row.id];
}

export interface CanvasLayoutNode {
  id: string;
  note: AnyRecord;
  row: string;
  stageIndex: number;
  position: number;
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasStage {
  index: number;
  step: AnyRecord;
  x: number;
  width: number;
}

export interface CanvasLayout {
  stages: CanvasStage[];
  rows: Array<RowDef & { y: number; height: number }>;
  nodes: CanvasLayoutNode[];
  width: number;
  height: number;
}

export function buildCanvasLayout(
  doc: AnyRecord,
  definitions: RowDef[],
  stageIndices: number[] | null = null,
  stageWidths: number[] | null = null,
  rowHeights: Record<string, number> | null = null
): CanvasLayout {
  const g = CANVAS_GRID;
  const cells = doc['c'] as Record<string, AnyRecord[]>;
  const steps = doc['steps'] as AnyRecord[];
  const indices = stageIndices || steps.map((_, index) => index);
  const nodes: CanvasLayoutNode[] = [], rows: Array<RowDef & { y: number; height: number }> = [];
  let cursor = g.label;
  const stages: CanvasStage[] = indices.map(index => {
    const width = canvasStageWidth(stageWidths?.[index]);
    const stage: CanvasStage = { index, step: steps[index], x: cursor, width };
    cursor += width;
    return stage;
  });
  let y = g.header;
  for (const definition of definitions) {
    const height = canvasRowHeight(doc, definition as AnyRecord, indices, rowHeights?.[definition.id]);
    rows.push({ ...definition, y, height });
    if (definition.id === 'em') {
      for (const stage of stages) {
        (cells['em|' + stage.index] || []).forEach(note => {
          if (note['virtualLabel']) return;
          const point = canvasEmotionPoint(stage, { y });
          nodes.push({ id: note['i'] as string, note, row: 'em', stageIndex: stage.index, position: 0, key: 'em|' + stage.index, x: point.x - 1, y: point.y - 1, width: 2, height: 2 });
        });
      }
    }
    if (definition.id !== 'em') {
      for (const stage of stages) {
        let offset = 0;
        for (const [position, note] of (cells[definition.id + '|' + stage.index] || []).entries()) {
          const width = canvasCardWidth(note, stage.width as number), cardHeight = canvasCardHeight(note, definition.id);
          nodes.push({ id: note['i'] as string, note, row: definition.id, stageIndex: stage.index, position, key: definition.id + '|' + stage.index, x: stage.x + (stage.width - width) / 2, y: y + g.padding + offset, width, height: cardHeight });
          offset += cardHeight + g.gap;
        }
      }
    }
    y += height + 28;
  }
  return { stages, rows, nodes, width: cursor + 20, height: y + 20 };
}

export function canvasTitleLines(title: string, limit = 32, maxLines = 2): string[] {
  const words = String(title).trim().split(/\s+/), lines = [''];
  for (const word of words) {
    const index = lines.length - 1;
    if (lines[index] && (lines[index] + ' ' + word).length > limit) lines.push(word);
    else lines[index] += (lines[index] ? ' ' : '') + word;
  }
  const result = lines.slice(0, maxLines).map(line => line.length > limit ? line.slice(0, limit - 1) + '…' : line);
  if (lines.length > maxLines) result[maxLines - 1] = result[maxLines - 1].slice(0, limit - 1) + '…';
  return result;
}

export function canvasConnectionOffsets(links: AnyRecord[]): Map<string, number> {
  const groups = new Map<string, AnyRecord[]>(), result = new Map<string, number>();
  for (const link of links) {
    const key = JSON.stringify([link['a'], link['b']].sort());
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(link);
  }
  for (const group of groups.values()) {
    const spacing = Math.min(18, 72 / Math.max(1, group.length - 1));
    group.forEach((link, index) => result.set(link['id'] as string, (index - (group.length - 1) / 2) * spacing));
  }
  return result;
}

export function canvasEdgeGeometry(a: CanvasLayoutNode, b: CanvasLayoutNode, offset = 0): { d: string; x: number; y: number } {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (a.row === b.row && a.stageIndex !== b.stageIndex) {
    const x = dx >= 0 ? a.x + a.width : a.x, tx = dx >= 0 ? b.x : b.x + b.width;
    return { d: `M ${x} ${a.y + a.height / 2 + offset} L ${tx} ${b.y + b.height / 2 + offset}`, x: (x + tx) / 2, y: (a.y + b.y + a.height) / 2 + offset };
  }
  if (a.stageIndex === b.stageIndex) {
    const x = a.x + a.width / 2 + offset, sy = dy >= 0 ? a.y + a.height : a.y, ty = dy >= 0 ? b.y : b.y + b.height;
    return { d: `M ${x} ${sy} L ${b.x + b.width / 2 + offset} ${ty}`, x: (x + b.x + b.width / 2 + offset) / 2, y: (sy + ty) / 2 };
  }
  const sx = dx >= 0 ? a.x + a.width : a.x, tx = dx >= 0 ? b.x : b.x + b.width;
  const sy = a.y + a.height / 2 + offset, ty = b.y + b.height / 2 + offset;
  const track = (dy >= 0 ? b.y - 12 : a.y - 12) + offset;
  return { d: `M ${sx} ${sy} H ${sx + (dx >= 0 ? 10 : -10)} V ${track} H ${tx + (dx >= 0 ? -10 : 10)} V ${ty} H ${tx}`, x: (sx + tx) / 2, y: track };
}

const xml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]!));

const connectionColors: Record<string, string> = { sequence: '#2563eb', dependency: '#a65f00', uses: '#7355ab', handoff: '#087f75' };
const connectionLabels: Record<string, string> = { sequence: 'Sequência', dependency: 'Dependência', uses: 'Usa recurso', handoff: 'Passagem entre equipes' };

export function exportCanvasSvg(
  doc: AnyRecord,
  definitions: RowDef[],
  titleFor: (note: AnyRecord) => string = note => (note['t'] as string) || (note['type'] as string) || 'Componente',
  stageWidths: number[] | null = null,
  rowHeights: Record<string, number> | null = null
): string {
  const layout = buildCanvasLayout(doc, definitions, null, stageWidths, rowHeights);
  const byId = new Map(layout.nodes.map(node => [node.id, node]));
  const offsets = canvasConnectionOffsets((doc['links'] as AnyRecord[] | undefined) || []);
  const docTitle = doc['title'] as string;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height + 60}" viewBox="0 -60 ${layout.width} ${layout.height + 60}" role="img" aria-label="${xml(docTitle)}"><title>${xml(docTitle)}</title><rect x="0" y="-60" width="100%" height="${layout.height + 60}" fill="#ffffff"/><text x="20" y="-24" font-size="24" font-family="sans-serif" fill="#142944">${xml(docTitle)}</text><defs>`;
  for (const [type, color] of Object.entries(connectionColors)) out += `<marker id="arrow-${type}" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker>`;
  out += '</defs><g font-family="sans-serif">';
  for (const stage of layout.stages) out += `<rect x="${stage.x}" y="0" width="${stage.width - 4}" height="78" rx="8" fill="#eaf1ff"/><text x="${stage.x + 18}" y="44" font-size="19" font-weight="600" fill="#142944">${xml((stage.step['n'] as string))}</text>`;
  for (const [index, row] of layout.rows.entries()) {
    const boundary = canvasBoundary(row, index, layout.rows);
    out += `<rect x="0" y="${row.y}" width="${layout.width}" height="${row.height}" fill="#f5f8fc" stroke="#cfdaea"/><text x="14" y="${row.y + 30}" font-size="12" fill="#142944">${xml(row.n.slice(0, 22))}</text>`;
    if (row.n.length > 22) out += `<text x="14" y="${row.y + 48}" font-size="12" fill="#142944">${xml(row.n.slice(22, 44))}</text>`;
    if (row.id === 'em' && layout.stages.length) {
      const pts = layout.stages.map(stage => ({
        ...canvasEmotionPoint(stage, row),
        recorded: stage.step['emotionRecorded'] === true || (stage.step['emotionRecorded'] === undefined && (Number(stage.step['e']) !== 0 || !!(stage.step['note'] as string | undefined)?.trim())),
      }));
      out += `<line x1="${layout.stages[0].x}" y1="${row.y + 56}" x2="${layout.width - 20}" y2="${row.y + 56}" stroke="#c8d8ed" stroke-dasharray="4 5"/>`;
      for (let i = 1; i < pts.length; i++) if (pts[i - 1].recorded && pts[i].recorded) out += `<line x1="${pts[i - 1].x}" y1="${pts[i - 1].y}" x2="${pts[i].x}" y2="${pts[i].y}" stroke="#dc821c" stroke-width="3"/>`;
      pts.forEach((p, i) => { out += `<circle cx="${p.x}" cy="${p.y}" r="7" fill="${p.recorded ? '#dc821c' : '#fff'}" stroke="#dc821c" stroke-width="2"/><text x="${p.x}" y="${row.y + 116}" text-anchor="middle" font-size="12" fill="#784619">${xml(p.recorded ? ['Frustrada', 'Ansiosa', 'Neutra', 'Animada', 'Satisfeita'][canvasEmotionScore(layout.stages[i].step) + 2] : 'Sem registro')}</text>`; });
    }
    if (boundary) out += `<path d="M0 ${row.y - 14} H${layout.width}" stroke="#7c8fa6" stroke-dasharray="3 6"/><text x="${layout.width / 2}" y="${row.y - 18}" text-anchor="middle" font-size="11" fill="#526885">${xml(boundary)}</text>`;
  }
  for (const raw of (doc['links'] as AnyRecord[] | undefined) || []) {
    const link = normalizeMatrixConnection(raw), a = byId.get(link.a as unknown as string), b = byId.get(link.b as unknown as string);
    if (!a || !b) continue;
    const edge = canvasEdgeGeometry(a, b, offsets.get(link.id as unknown as string) || 0);
    const color = connectionColors[link.type as unknown as string];
    const label = (connectionLabels[link.type as unknown as string]) + ((link.label as string) ? ' · ' + (link.label as string) : '');
    const ho = link.handoff as AnyRecord | undefined;
    const transfer = ho ? ` · ${ho['fromTeam']} → ${ho['toTeam']} · ${ho['deliverable']} · Prazo: ${ho['deadlineMinutes'] ?? 'não informado'} min · Aceite: ${ho['acceptance']}` : '';
    out += `<g><title>${xml(titleFor(a.note))} → ${xml(titleFor(b.note))} · ${xml(label + transfer)}</title><path d="${edge.d}" stroke="${color}" stroke-width="2" fill="none" marker-end="url(#arrow-${link.type})"/><text x="${edge.x}" y="${edge.y - 5}" text-anchor="middle" font-size="10" fill="${color}">${xml(label.slice(0, 60))}</text></g>`;
  }
  for (const node of layout.nodes) {
    if (node.row === 'em') continue;
    const activity = (node.note['activity'] as AnyRecord | undefined) || {};
    const kind = canvasKind(node.note, node.row), title = titleFor(node.note);
    const details = [
      activity['owner'] ? 'Responsável: ' + activity['owner'] : '',
      activity['team'] ? 'Equipe: ' + activity['team'] : '',
      activity['durationMinutes'] != null ? 'Execução: ' + activity['durationMinutes'] + ' min' : '',
      activity['waitMinutes'] != null ? 'Espera: ' + activity['waitMinutes'] + ' min' : '',
      activity['rule'] ? 'Regra: ' + activity['rule'] : '',
      (node.note['canvas'] as AnyRecord | undefined)?.['description'] || '',
    ].filter(Boolean).join(' · ');
    const media = kind === 'artifact' ? canvasSafeUrl((node.note['canvas'] as AnyRecord | undefined)?.['imageUrl'] || node.note['url']) : '';
    const tones: Record<string, string> = { blue: '#f4f8ff', teal: '#f0fdf9', amber: '#fff9ee', violet: '#f9f5ff', neutral: '#f8fafc' };
    const fill = tones[(node.note['canvas'] as AnyRecord | undefined)?.['tone'] as string] || '#fff';
    const x = node.x + 12, y = node.y;
    out += `<g><title>${xml(title)}${details ? ' · ' + xml(details) : ''}</title><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="10" fill="${fill}" stroke="#9fb4cc"/><text x="${x}" y="${y + 23}" font-size="12" fill="#526885">${xml(CANVAS_COMPONENTS[kind as CanvasComponentKind]?.title || node.note['type'] as string)}</text>`;
    if (media) {
      out += `<rect x="${x}" y="${y + 33}" width="${node.width - 24}" height="${node.height - 69}" rx="5" fill="#e8eef6"/><image x="${x}" y="${y + 33}" width="${node.width - 24}" height="${node.height - 69}" href="${xml(media)}" preserveAspectRatio="xMidYMid slice"/><text x="${x}" y="${y + node.height - 12}" font-size="15" font-weight="600" fill="#142944">${xml(title.slice(0, 36))}</text>`;
    } else {
      out += canvasTitleLines(title, kind === 'channel' ? 25 : 34).map((line, index) => `<text x="${x}" y="${y + 50 + index * 21}" font-size="17" font-weight="600" fill="#142944">${xml(line)}</text>`).join('');
      if (kind !== 'channel') out += `<text x="${x}" y="${y + node.height - 14}" font-size="11" fill="#526885">${xml((activity['owner'] as string) || (activity['team'] as string) || '')}</text>`;
    }
    out += '</g>';
  }
  return out + '</g></svg>';
}

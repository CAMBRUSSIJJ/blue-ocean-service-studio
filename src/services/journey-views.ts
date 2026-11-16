import { normalizeMatrixCardFilters } from './journey-content.ts';
import type { ServiceGraph } from '../domain/model';

const baseRows = ['sd', 'th', 'ev', 'ac', 'em', 'fl', 'bk', 'sy', 'im', 'go', 'ch', 'pr', 'br', 'rr', 'ki'];
const rows = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set((value as unknown[]).filter((id): id is string => typeof id === 'string' && /^[a-z][a-z0-9]{0,24}$/.test(id)))].slice(0, 150)
    : [];
const bounded = (value: unknown, min: number, max: number, fallback: number): number =>
  Number.isFinite(Number(value)) ? Math.round(Math.max(min, Math.min(max, Number(value)))) : fallback;
const stageWidths = (value: unknown): number[] =>
  Array.isArray(value) ? (value as unknown[]).slice(0, 100).map(v => bounded(v, 210, 600, 290)) : [];
const rowHeights = (value: unknown): Record<string, number> =>
  Object.fromEntries(
    Object.entries(value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {})
      .filter(([id]) => /^[a-z][a-z0-9]{0,24}$/.test(id)).slice(0, 150)
      .map(([id, height]) => [id, bounded(height, 76, 540, 110)])
  );
const name = (value: unknown): string => {
  const result = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!result || result.length > 80) throw Error('Use um nome de 1 a 80 caracteres.');
  return result;
};

type Perspective = 'journey' | 'blueprint';
type Preset = 'essential' | 'detailed' | 'operational' | 'acquisition' | 'complete' | 'custom';
type InsightsTab = 'guidance' | 'analysis' | 'quality';
type ConnectionMode = 'selected' | 'all' | 'off';
type BlueprintRenderer = 'canvas' | 'matrix';

export interface MatrixViewSnapshot {
  version: 1;
  perspective: Perspective;
  preset: Preset;
  hiddenRows: string[];
  rowOrder: string[];
  insightsOpen: boolean;
  insightsTab: InsightsTab;
  emotionsExpanded: boolean;
  fitToScreen: boolean;
  connectionMode: ConnectionMode;
  blueprintRenderer: BlueprintRenderer;
  canvasOrderVersion: 0 | 1;
  zoom: number;
  stageWidths: number[];
  rowHeights: Record<string, number>;
  collapsedRows: string[];
  cardFilters: ReturnType<typeof normalizeMatrixCardFilters>;
}

export interface SavedMatrixView extends MatrixViewSnapshot {
  perspectiveViews: Partial<Record<Perspective, MatrixViewSnapshot & { perspective: Perspective }>>;
}

function normalizeMatrixViewSnapshot(input: Record<string, unknown> = {}): MatrixViewSnapshot {
  return {
    version: 1,
    perspective: input['perspective'] === 'blueprint' || (!input['perspective'] && input['preset'] === 'operational') ? 'blueprint' : 'journey',
    preset: (['essential', 'detailed', 'operational', 'acquisition', 'complete', 'custom'] as Preset[]).includes(input['preset'] as Preset) ? input['preset'] as Preset : 'custom',
    hiddenRows: rows(input['hiddenRows']),
    rowOrder: rows(input['rowOrder']),
    insightsOpen: input['insightsOpen'] === true,
    insightsTab: (['guidance', 'analysis', 'quality'] as InsightsTab[]).includes(input['insightsTab'] as InsightsTab) ? input['insightsTab'] as InsightsTab : 'guidance',
    emotionsExpanded: input['emotionsExpanded'] === true,
    fitToScreen: input['fitToScreen'] === true,
    connectionMode: (['selected', 'all', 'off'] as ConnectionMode[]).includes(input['connectionMode'] as ConnectionMode) ? input['connectionMode'] as ConnectionMode : 'selected',
    blueprintRenderer: input['blueprintRenderer'] === 'matrix' ? 'matrix' : 'canvas',
    canvasOrderVersion: input['canvasOrderVersion'] === 1 ? 1 : 0,
    zoom: bounded(input['zoom'], 75, 150, 100),
    stageWidths: stageWidths(input['stageWidths']),
    rowHeights: rowHeights(input['rowHeights']),
    collapsedRows: rows(input['collapsedRows']),
    cardFilters: normalizeMatrixCardFilters(input['cardFilters'] as Record<string, unknown> | undefined),
  };
}

/** Each perspective remembers configuration only, with a bounded, non-recursive shape. */
export function normalizeSavedMatrixView(input: Record<string, unknown> = {}): SavedMatrixView {
  const view = normalizeMatrixViewSnapshot(input) as SavedMatrixView;
  const pv = input['perspectiveViews'];
  view.perspectiveViews = Object.fromEntries(
    (['journey', 'blueprint'] as Perspective[])
      .filter(key => pv && typeof pv === 'object' && (pv as Record<string, unknown>)[key] && typeof (pv as Record<string, unknown>)[key] === 'object')
      .map(key => [key, { ...normalizeMatrixViewSnapshot((pv as Record<string, unknown>)[key] as Record<string, unknown>), perspective: key }])
  );
  return view;
}

export interface RowDefinition {
  id: string;
  custom?: boolean;
  [key: string]: unknown;
}

export function switchMatrixPerspective(input: Record<string, unknown>, perspective: Perspective, definitions: RowDefinition[]): SavedMatrixView {
  const current = normalizeSavedMatrixView(input);
  if (!(['journey', 'blueprint'] as Perspective[]).includes(perspective) || perspective === current.perspective) return current;
  const memory = { ...current.perspectiveViews, [current.perspective]: normalizeMatrixViewSnapshot(current as unknown as Record<string, unknown>) };
  const visible = perspective === 'blueprint' ? ['ev', 'ch', 'ac', 'em', 'fl', 'bk', 'sy'] : ['sd', 'ch', 'ac', 'th', 'em', 'im'];
  const defaults: Record<string, unknown> = {
    ...current, perspective,
    preset: perspective === 'blueprint' ? 'operational' : 'essential',
    rowOrder: definitions.map(row => row.id),
    hiddenRows: definitions.filter(row => !visible.includes(row.id) && !row.custom).map(row => row.id),
    collapsedRows: [], cardFilters: {}, canvasOrderVersion: 0,
    connectionMode: perspective === 'blueprint' ? 'all' : current.connectionMode,
  };
  const next = normalizeMatrixViewSnapshot((memory[perspective] ?? defaults) as Record<string, unknown>);
  return { ...next, perspective, perspectiveViews: memory } as SavedMatrixView;
}

export interface BlueprintBoundary {
  previous: string;
  valid: boolean;
  hidden: boolean;
}

/** A divider is meaningful only when its two semantic layers are in the right order. */
export function matrixBlueprintBoundary(id: string, visibleRows: string[]): BlueprintBoundary | null {
  const previous = ({ fl: 'ac', bk: 'fl', sy: 'bk' } as Record<string, string>)[id];
  if (!previous) return null;
  const at = visibleRows.indexOf(id), before = visibleRows.indexOf(previous);
  const between = visibleRows.slice(before + 1, at);
  return {
    previous, valid: before >= 0 && before < at && !between.some(row => ['fl', 'bk', 'sy'].includes(row)),
    hidden: before < 0,
  };
}

type SavedViewAction = 'create' | 'update' | 'rename' | 'remove' | 'apply';

export interface SavedViewInput {
  id?: string;
  name?: unknown;
  view?: Record<string, unknown>;
}

/** Configuration only: never copies or rewrites the map's cards, stages or observations. */
export function manageJourneySavedView(
  graph: ServiceGraph,
  journeyId: string,
  action: SavedViewAction,
  input: SavedViewInput = {},
  now = new Date().toISOString()
): ServiceGraph {
  type AnyRecord = Record<string, unknown>;
  const journey = (graph.journeys as unknown as Record<string, AnyRecord>)[journeyId];
  if (!journey) throw Error('Jornada indisponível.');
  const list = Array.isArray(journey['savedMatrixViews']) ? journey['savedMatrixViews'] as AnyRecord[] : [];
  const previous = list.find(record => record['id'] === input.id) ?? null;
  if (!['create', 'update', 'rename', 'remove', 'apply'].includes(action)) throw Error('Ação de visualização inválida.');
  if (action !== 'create' && !previous) throw Error('Visualização indisponível nesta Jornada.');
  if (action === 'remove') { journey['savedMatrixViews'] = list.filter(record => record['id'] !== input.id); return graph; }
  const personaId = action === 'apply' ? (previous!['personaId'] as string || '') : action === 'rename' ? (previous!['personaId'] as string || '') : (journey['personaId'] as string || '');
  const entities = (graph as unknown as AnyRecord)['entities'] as Record<string, Record<string, AnyRecord>> | undefined;
  const persona = entities?.['persona']?.[personaId];
  if (action !== 'rename' && personaId && (!persona || (persona['serviceId'] && persona['serviceId'] !== graph.service.id))) throw Error('A Persona desta visualização está indisponível. Selecione outra Persona e atualize a visualização.');
  if (action === 'apply') {
    const views = (graph as unknown as AnyRecord)['views'] as { whiteboards?: Record<string, AnyRecord> } | undefined;
    const legacyRows = Object.values(views?.whiteboards || {})
      .filter(board => board['journeyId'] === journeyId)
      .flatMap(board => ((board['blueprintHosted'] as { lanes?: Array<{ id: string }> } | undefined)?.lanes || []).map(row => row.id));
    const content = journey['matrixContent'] as { rows?: Record<string, unknown> } | undefined;
    const allowed = new Set([...baseRows, ...Object.keys(content?.rows || {}), ...rows(legacyRows)]);
    const reconcile = (snapshot: SavedMatrixView): SavedMatrixView => {
      const captured = snapshot.rowOrder.filter(id => allowed.has(id));
      const added = [...allowed].filter(id => !captured.includes(id));
      return {
        ...snapshot,
        rowOrder: [...captured, ...added],
        hiddenRows: [...new Set([...snapshot.hiddenRows.filter(id => allowed.has(id)), ...added])],
      };
    };
    const snapshot = normalizeSavedMatrixView(previous!['view'] as Record<string, unknown>);
    journey['matrixView'] = {
      ...reconcile(snapshot),
      perspectiveViews: Object.fromEntries(
        Object.entries(snapshot.perspectiveViews).map(([key, value]) => [key, reconcile(value as SavedMatrixView)])
      ),
    };
    journey['personaId'] = personaId;
    return graph;
  }
  const title = action === 'update' ? (previous!['name'] as string) : name(input.name);
  if (list.some(record => record['id'] !== previous?.['id'] && (record['name'] as string).toLocaleLowerCase() === title.toLocaleLowerCase())) throw Error('Já existe uma visualização com esse nome.');
  if (action === 'create' && list.length >= 20) throw Error('Esta Jornada pode ter até 20 visualizações salvas.');
  const record: AnyRecord = action === 'rename'
    ? { ...previous!, name: title, updatedAt: now }
    : { id: previous?.['id'] || 'view-' + crypto.randomUUID(), name: title, personaId, view: normalizeSavedMatrixView(input.view || {}), createdAt: previous?.['createdAt'] || now, updatedAt: now };
  journey['savedMatrixViews'] = previous
    ? list.map(value => value['id'] === record['id'] ? record : value)
    : [...list, record];
  return graph;
}

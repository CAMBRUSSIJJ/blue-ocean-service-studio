import type {
  BlueprintLaneConfig, BlueprintSemanticZoom, BlueprintSettings, GraphEntity, Id, ServiceGraph, Stage,
  WhiteboardItem, WhiteboardSemantic, WhiteboardTone, WhiteboardView,
} from '../domain/model';
import { touchServiceProject } from './service-project.ts';

export type CoreBlueprintLaneKey = 'evidence' | 'customer' | 'frontstage' | 'backstage' | 'process' | 'system';
export type BlueprintLaneKey = string;
export type BlueprintGapSeverity = 'critical' | 'warning';
export type BlueprintLaneDefinition = BlueprintLaneConfig;

const ALL_ZOOMS: BlueprintSemanticZoom[] = ['strategic', 'journey', 'operational'];

export const SERVICE_BLUEPRINT_LANES: BlueprintLaneDefinition[] = [
  { id: 'evidence', key: 'evidence', role: 'evidence', label: 'Evidências', description: 'Provas, sinais e artefatos que sustentam a leitura da etapa.', tone: 'slate', editable: true, required: true, order: 10, visibleIn: ['journey', 'operational'] },
  { id: 'customer', key: 'customer', role: 'customer', label: 'Ações do cliente', description: 'O que a pessoa faz na Journey. Esta linha vem da Jornada.', tone: 'blue', editable: false, required: true, order: 20, visibleIn: ALL_ZOOMS },
  { id: 'frontstage', key: 'frontstage', role: 'frontstage', label: 'Frontstage', description: 'Ações visíveis da organização diante do cliente.', tone: 'emerald', editable: true, required: true, order: 30, visibleIn: ALL_ZOOMS },
  { id: 'backstage', key: 'backstage', role: 'backstage', label: 'Backstage', description: 'Ações internas invisíveis ao cliente que sustentam a entrega.', tone: 'amber', editable: true, required: true, order: 40, visibleIn: ALL_ZOOMS },
  { id: 'process', key: 'process', role: 'process', label: 'Processos', description: 'Fluxos, regras, handoffs e rotinas necessários para a entrega.', tone: 'blue', editable: true, required: true, order: 50, visibleIn: ['operational'] },
  { id: 'system', key: 'system', role: 'system', label: 'Sistemas / suporte', description: 'Tecnologia, dados, pessoas, parceiros e recursos habilitadores.', tone: 'violet', editable: true, required: true, order: 60, visibleIn: ['operational'] },
];

export const SERVICE_BLUEPRINT_LINES = [
  { after: 'customer' as BlueprintLaneKey, label: 'Linha de interação', description: 'Separa o comportamento do cliente das ações visíveis da organização.' },
  { after: 'frontstage' as BlueprintLaneKey, label: 'Linha de Visibilidade', description: 'Separa o que o cliente vê do que acontece nos bastidores.' },
  { after: 'backstage' as BlueprintLaneKey, label: 'Linha de interação interna', description: 'Separa execução de bastidor dos processos e habilitadores internos.' },
];

export const BLUEPRINT_SEMANTIC_ZOOM_META: Record<BlueprintSemanticZoom, { label: string; short: string; description: string }> = {
  strategic: { label: 'Estratégico', short: 'Estratégico', description: 'Cliente, frontstage e backstage para decisões de alto nível.' },
  journey: { label: 'Journey', short: 'Journey', description: 'Experiência e evidências conectadas à entrega visível e invisível.' },
  operational: { label: 'Operacional', short: 'Operacional', description: 'Todas as camadas, processos, sistemas e detalhes de execução.' },
};

export const BLUEPRINT_LANE_PRESETS: Record<Exclude<BlueprintSettings['preset'], 'custom'>, { label: string; description: string; custom: Array<Omit<BlueprintLaneConfig, 'id' | 'order'>> }> = {
  standard: { label: 'Padrão', description: 'Estrutura clássica: cliente, frontstage, backstage, processos e sistemas.', custom: [] },
  healthcare: {
    label: 'Saúde', description: 'Acrescenta família, equipe clínica e regulação.', custom: [
      { key: 'family', role: 'custom', label: 'Família / acompanhante', description: 'Pessoas que acompanham, decidem ou influenciam a experiência.', tone: 'rose', editable: true, required: false, visibleIn: ['strategic', 'journey', 'operational'], custom: true },
      { key: 'clinical-team', role: 'custom', label: 'Equipe clínica', description: 'Ações e decisões clínicas que sustentam a experiência.', tone: 'emerald', editable: true, required: false, visibleIn: ['journey', 'operational'], custom: true },
      { key: 'regulation', role: 'custom', label: 'Regulação / compliance', description: 'Regras, protocolos e restrições regulatórias.', tone: 'violet', editable: true, required: false, visibleIn: ['operational'], custom: true },
    ],
  },
  hospitality: {
    label: 'Hospitalidade', description: 'Acrescenta digital, housekeeping e parceiros.', custom: [
      { key: 'digital', role: 'custom', label: 'Digital', description: 'Interações digitais e autosserviço ao longo da experiência.', tone: 'blue', editable: true, required: false, visibleIn: ['strategic', 'journey', 'operational'], custom: true },
      { key: 'housekeeping', role: 'custom', label: 'Housekeeping / operação local', description: 'Rotinas locais que preparam e mantêm a entrega.', tone: 'amber', editable: true, required: false, visibleIn: ['operational'], custom: true },
      { key: 'partners', role: 'custom', label: 'Parceiros', description: 'Terceiros que participam da entrega do serviço.', tone: 'slate', editable: true, required: false, visibleIn: ['journey', 'operational'], custom: true },
    ],
  },
  saas: {
    label: 'SaaS', description: 'Acrescenta interface, Customer Success, automação e dados.', custom: [
      { key: 'interface', role: 'custom', label: 'Interface / produto', description: 'Comportamentos do produto digital percebidos pelo usuário.', tone: 'blue', editable: true, required: false, visibleIn: ['strategic', 'journey', 'operational'], custom: true },
      { key: 'customer-success', role: 'custom', label: 'Customer Success', description: 'Ações humanas de adoção, acompanhamento e retenção.', tone: 'emerald', editable: true, required: false, visibleIn: ['journey', 'operational'], custom: true },
      { key: 'automation', role: 'custom', label: 'Automação', description: 'Jobs, regras e automações que executam o serviço.', tone: 'amber', editable: true, required: false, visibleIn: ['operational'], custom: true },
      { key: 'data', role: 'custom', label: 'Dados / infraestrutura', description: 'Dados, integrações e infraestrutura que sustentam a operação.', tone: 'violet', editable: true, required: false, visibleIn: ['operational'], custom: true },
    ],
  },
};

export type BlueprintGap = {
  id: string;
  stageId: Id;
  stageTitle: string;
  lane: BlueprintLaneKey;
  label: string;
  severity: BlueprintGapSeverity;
  message: string;
};

export type BlueprintStageReport = {
  stage: Stage;
  position: number;
  laneCounts: Record<BlueprintLaneKey, number>;
  laneItems: Record<BlueprintLaneKey, WhiteboardItem[]>;
  evidence: GraphEntity[];
  checks: Array<{ lane: BlueprintLaneKey; label: string; complete: boolean }>;
  qualityScore: number;
  gaps: BlueprintGap[];
};

export type ServiceBlueprintReport = {
  boardId: Id;
  board: WhiteboardView;
  journeyId: Id | null;
  journeyName: string;
  stages: BlueprintStageReport[];
  stageCount: number;
  overallScore: number;
  operationalCoverage: number;
  evidenceCoverage: number;
  gapCount: number;
  criticalGapCount: number;
  readyForValidation: boolean;
  contextCounts: { persona: number; problem: number; evidence: number };
  lines: typeof SERVICE_BLUEPRINT_LINES;
  settings: BlueprintSettings;
  lanes: BlueprintLaneDefinition[];
  visibleLanes: BlueprintLaneDefinition[];
};

const uniq = <T>(items: T[]) => [...new Set(items)];
const safeIds = (value: unknown): Id[] => Array.isArray(value) ? uniq(value.filter((id): id is Id => typeof id === 'string' && Boolean(id))) : [];
const cloneLane = (lane: BlueprintLaneDefinition): BlueprintLaneDefinition => ({ ...lane, visibleIn: [...lane.visibleIn] });
const sortLanes = (lanes: BlueprintLaneDefinition[]) => [...lanes].sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));

export function createDefaultBlueprintSettings(now = new Date().toISOString()): BlueprintSettings {
  return { version: 1, semanticZoom: 'operational', preset: 'standard', lanes: SERVICE_BLUEPRINT_LANES.map(cloneLane), updatedAt: now };
}

export function getBlueprintSettings(board: WhiteboardView, now = board.updatedAt ?? new Date().toISOString()): BlueprintSettings {
  const incoming = board.blueprintSettings;
  if (!incoming) return createDefaultBlueprintSettings(now);
  const byKey = new Map(incoming.lanes.map((lane) => [lane.key, lane]));
  const core = SERVICE_BLUEPRINT_LANES.map((base) => ({ ...cloneLane(base), ...(byKey.get(base.key) ?? {}), id: base.id, key: base.key, role: base.role, custom: false, visibleIn: [...(byKey.get(base.key)?.visibleIn ?? base.visibleIn)] }));
  const custom = incoming.lanes.filter((lane) => !SERVICE_BLUEPRINT_LANES.some((base) => base.key === lane.key)).map((lane) => ({ ...lane, role: 'custom' as const, custom: true, visibleIn: [...lane.visibleIn] }));
  return { ...incoming, version: 1, semanticZoom: incoming.semanticZoom ?? 'operational', preset: incoming.preset ?? 'custom', lanes: sortLanes([...core, ...custom]) };
}

export function getBlueprintLanes(board: WhiteboardView): BlueprintLaneDefinition[] {
  return getBlueprintSettings(board).lanes;
}

export function getVisibleBlueprintLanes(board: WhiteboardView): BlueprintLaneDefinition[] {
  const settings = getBlueprintSettings(board);
  return settings.lanes.filter((lane) => lane.visibleIn.includes(settings.semanticZoom));
}

function updateBoardSettings(graph: ServiceGraph, boardId: Id, updater: (settings: BlueprintSettings) => BlueprintSettings, now = new Date().toISOString()): ServiceGraph {
  const board = graph.views.whiteboards?.[boardId];
  if (!board || board.viewKind !== 'blueprint') return graph;
  const settings = updater(getBlueprintSettings(board, now));
  const nextBoard: WhiteboardView = { ...board, blueprintSettings: { ...settings, updatedAt: now }, updatedAt: now };
  return { ...graph, service: { ...graph.service, updatedAt: now }, views: { ...graph.views, whiteboards: { ...graph.views.whiteboards, [boardId]: nextBoard } } };
}

export function setBlueprintSemanticZoom(graph: ServiceGraph, boardId: Id, semanticZoom: BlueprintSemanticZoom, now = new Date().toISOString()): ServiceGraph {
  return updateBoardSettings(graph, boardId, (settings) => ({ ...settings, semanticZoom }), now);
}

export function updateBlueprintLaneConfig(graph: ServiceGraph, boardId: Id, laneKey: string, patch: Partial<Pick<BlueprintLaneConfig, 'label' | 'description' | 'tone' | 'required' | 'visibleIn' | 'order'>>, now = new Date().toISOString()): ServiceGraph {
  return updateBoardSettings(graph, boardId, (settings) => ({ ...settings, preset: settings.preset === 'standard' && !SERVICE_BLUEPRINT_LANES.some((lane) => lane.key === laneKey) ? 'custom' : settings.preset, lanes: settings.lanes.map((lane) => lane.key === laneKey ? { ...lane, ...patch, visibleIn: patch.visibleIn ? uniq(patch.visibleIn) : lane.visibleIn } : lane) }), now);
}

function slug(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'camada';
}

export function addCustomBlueprintLane(input: { graph: ServiceGraph; boardId: Id; label: string; description?: string; tone?: WhiteboardTone; required?: boolean; visibleIn?: BlueprintSemanticZoom[]; key?: string; now?: string }): { graph: ServiceGraph; laneKey: string | null } {
  const board = input.graph.views.whiteboards?.[input.boardId];
  if (!board || board.viewKind !== 'blueprint' || !input.label.trim()) return { graph: input.graph, laneKey: null };
  const settings = getBlueprintSettings(board);
  const base = slug(input.key || input.label);
  let key = base; let suffix = 2;
  while (settings.lanes.some((lane) => lane.key === key)) { key = `${base}-${suffix}`; suffix += 1; }
  const order = Math.max(0, ...settings.lanes.map((lane) => lane.order)) + 10;
  const lane: BlueprintLaneConfig = {
    id: `custom-${key}`, key, role: 'custom', label: input.label.trim(), description: input.description?.trim() || 'Camada personalizada deste serviço.',
    tone: input.tone ?? 'slate', editable: true, required: Boolean(input.required), order,
    visibleIn: input.visibleIn?.length ? uniq(input.visibleIn) : ['journey', 'operational'], custom: true,
  };
  const graph = updateBoardSettings(input.graph, input.boardId, (current) => ({ ...current, preset: 'custom', lanes: [...current.lanes, lane] }), input.now);
  return { graph, laneKey: key };
}

export function removeCustomBlueprintLane(input: { graph: ServiceGraph; boardId: Id; laneKey: string; now?: string }): { graph: ServiceGraph; removed: boolean; reason?: string } {
  const board = input.graph.views.whiteboards?.[input.boardId];
  if (!board || board.viewKind !== 'blueprint') return { graph: input.graph, removed: false, reason: 'Blueprint indisponível.' };
  const lane = getBlueprintSettings(board).lanes.find((item) => item.key === input.laneKey);
  if (!lane?.custom) return { graph: input.graph, removed: false, reason: 'Camadas centrais do Blueprint não podem ser removidas.' };
  const hasItems = Object.values(board.items ?? {}).some((item) => item.blueprintLane === lane.key);
  if (hasItems) return { graph: input.graph, removed: false, reason: 'Remova ou mova os itens desta camada antes de excluí-la.' };
  return { graph: updateBoardSettings(input.graph, input.boardId, (settings) => ({ ...settings, preset: 'custom', lanes: settings.lanes.filter((item) => item.key !== lane.key) }), input.now), removed: true };
}

export function applyBlueprintLanePreset(input: { graph: ServiceGraph; boardId: Id; preset: Exclude<BlueprintSettings['preset'], 'custom'>; now?: string }): { graph: ServiceGraph; added: number } {
  const board = input.graph.views.whiteboards?.[input.boardId];
  if (!board || board.viewKind !== 'blueprint') return { graph: input.graph, added: 0 };
  const preset = BLUEPRINT_LANE_PRESETS[input.preset];
  const settings = getBlueprintSettings(board);
  const existing = new Set(settings.lanes.map((lane) => lane.key));
  let added = 0; let nextOrder = Math.max(0, ...settings.lanes.map((lane) => lane.order));
  const additions: BlueprintLaneConfig[] = [];
  preset.custom.forEach((candidate) => {
    if (existing.has(candidate.key)) return;
    nextOrder += 10; added += 1;
    additions.push({ ...candidate, id: `preset-${input.preset}-${candidate.key}`, order: nextOrder });
  });
  const graph = updateBoardSettings(input.graph, input.boardId, (current) => ({ ...current, preset: input.preset, lanes: [...current.lanes, ...additions] }), input.now);
  return { graph, added };
}

const laneForSemantic = (semantic: WhiteboardSemantic | undefined): BlueprintLaneKey | null => {
  if (semantic === 'evidence') return 'evidence';
  if (semantic === 'frontstage') return 'frontstage';
  if (semantic === 'backstage') return 'backstage';
  if (semantic === 'process') return 'process';
  if (semantic === 'system') return 'system';
  return null;
};

export function blueprintLaneForItem(item: WhiteboardItem): BlueprintLaneKey | null {
  const explicit = String(item.blueprintLane ?? '').trim();
  if (explicit) return explicit;
  if (item.kind === 'smart') {
    if (item.objectKind === 'stage' || item.objectKind === 'customerAction') return 'customer';
    if (item.objectKind === 'evidence') return 'evidence';
    if (item.objectKind === 'frontstage') return 'frontstage';
    if (item.objectKind === 'backstage') return 'backstage';
    if (item.objectKind === 'process') return 'process';
    if (item.objectKind === 'system' || item.objectKind === 'resource' || item.objectKind === 'person' || item.objectKind === 'role' || item.objectKind === 'policy' || item.objectKind === 'dependency') return 'system';
  }
  return item.kind === 'free' ? laneForSemantic(item.semantic) : null;
}

export function blueprintStageIdForItem(graph: ServiceGraph, board: WhiteboardView, item: WhiteboardItem): Id | null {
  if (item.blueprintStageId && graph.stages[item.blueprintStageId]) return item.blueprintStageId;
  if (item.kind === 'smart' && item.objectKind === 'stage' && graph.stages[item.objectId]) return item.objectId;
  if (item.kind === 'smart' && item.objectKind === 'evidence') {
    const journey = board.journeyId ? graph.journeys[board.journeyId] : undefined;
    const owner = journey?.stageIds.map((id) => graph.stages[id]).find((stage) => safeIds(stage?.evidenceIds).includes(item.objectId));
    if (owner) return owner.id;
  }
  return null;
}

export function blueprintCellItems(graph: ServiceGraph, board: WhiteboardView, stageId: Id, lane: BlueprintLaneKey): WhiteboardItem[] {
  return Object.values(board.items ?? {}).filter((item) => {
    if (item.kind === 'free' && item.shape === 'frame') return false;
    return blueprintStageIdForItem(graph, board, item) === stageId && blueprintLaneForItem(item) === lane;
  });
}

const entityTitle = (entity: GraphEntity | undefined, fallback: string) => String(entity?.title ?? entity?.name ?? entity?.description ?? fallback);

const gapMessage = (lane: BlueprintLaneDefinition): string => {
  if (lane.role === 'customer') return 'A etapa não possui ação do cliente definida na Journey.';
  if (lane.role === 'frontstage') return 'Nenhuma ação visível foi definida para esta etapa.';
  if (lane.role === 'backstage') return 'Nenhuma ação de bastidor sustenta esta etapa.';
  if (lane.role === 'process') return 'Nenhum processo ou handoff foi mapeado para esta etapa.';
  if (lane.role === 'system') return 'Nenhum sistema, pessoa ou recurso habilitador foi mapeado.';
  if (lane.role === 'evidence') return 'A etapa ainda não possui evidência conectada.';
  return `A camada obrigatória “${lane.label}” ainda não possui conteúdo nesta etapa.`;
};

export function buildServiceBlueprintReport(graph: ServiceGraph, boardId: Id): ServiceBlueprintReport | null {
  const board = graph.views.whiteboards?.[boardId];
  if (!board || board.viewKind !== 'blueprint') return null;
  const settings = getBlueprintSettings(board);
  const lanes = settings.lanes;
  const visibleLanes = lanes.filter((lane) => lane.visibleIn.includes(settings.semanticZoom));
  const journey = board.journeyId ? graph.journeys[board.journeyId] : undefined;
  const stages = (journey?.stageIds ?? []).map((id) => graph.stages[id]).filter((stage): stage is Stage => Boolean(stage));
  const stageReports = stages.map((stage, index): BlueprintStageReport => {
    const laneItems = Object.fromEntries(lanes.map((lane) => [lane.key, blueprintCellItems(graph, board, stage.id, lane.key)])) as Record<BlueprintLaneKey, WhiteboardItem[]>;
    const evidence = safeIds(stage.evidenceIds).map((id) => graph.entities?.evidence?.[id]).filter((entity): entity is GraphEntity => Boolean(entity));
    const laneCounts = Object.fromEntries(lanes.map((lane) => {
      const items = laneItems[lane.key] ?? [];
      if (lane.role === 'evidence') return [lane.key, uniq([...evidence.map((item) => item.id), ...items.map((item) => item.kind === 'smart' ? item.objectId : item.id)]).length];
      if (lane.role === 'customer') return [lane.key, stage.customerAction.trim() ? 1 : 0];
      return [lane.key, items.length];
    })) as Record<BlueprintLaneKey, number>;
    const requiredLanes = lanes.filter((lane) => lane.required);
    const checks = requiredLanes.map((lane) => ({ lane: lane.key, label: lane.label, complete: laneCounts[lane.key] > 0 }));
    const gaps: BlueprintGap[] = checks.filter((check) => !check.complete).map((check) => {
      const lane = lanes.find((item) => item.key === check.lane)!;
      const critical = lane.role === 'customer' || lane.role === 'frontstage' || lane.role === 'backstage';
      return { id: `${stage.id}:${lane.key}`, stageId: stage.id, stageTitle: stage.title, lane: lane.key, label: lane.label, severity: critical ? 'critical' : 'warning', message: gapMessage(lane) };
    });
    return { stage, position: index + 1, laneCounts, laneItems, evidence, checks, qualityScore: checks.length ? Math.round((checks.filter((check) => check.complete).length / checks.length) * 100) : 100, gaps };
  });
  const totalChecks = stageReports.reduce((sum, stage) => sum + stage.checks.length, 0);
  const completedChecks = stageReports.reduce((sum, stage) => sum + stage.checks.filter((check) => check.complete).length, 0);
  const operationalLaneKeys = lanes.filter((lane) => lane.required && !['evidence', 'customer'].includes(lane.role)).map((lane) => lane.key);
  const operationChecks = stageReports.flatMap((stage) => stage.checks.filter((check) => operationalLaneKeys.includes(check.lane)));
  const gaps = stageReports.flatMap((stage) => stage.gaps);
  const context = board.designContext;
  return {
    boardId, board, journeyId: journey?.id ?? null, journeyName: journey?.name ?? 'Journey não conectada', stages: stageReports, stageCount: stageReports.length,
    overallScore: totalChecks ? Math.round((completedChecks / totalChecks) * 100) : 0,
    operationalCoverage: operationChecks.length ? Math.round((operationChecks.filter((check) => check.complete).length / operationChecks.length) * 100) : 0,
    evidenceCoverage: stageReports.length ? Math.round((stageReports.filter((stage) => (stage.laneCounts.evidence ?? 0) > 0).length / stageReports.length) * 100) : 0,
    gapCount: gaps.length, criticalGapCount: gaps.filter((gap) => gap.severity === 'critical').length,
    readyForValidation: stageReports.length >= 2 && gaps.length === 0,
    contextCounts: { persona: safeIds(context?.personaIds).length, problem: safeIds(context?.problemIds).length, evidence: safeIds(context?.evidenceIds).length },
    lines: SERVICE_BLUEPRINT_LINES, settings, lanes, visibleLanes,
  };
}

const makeId = (prefix: string): Id => typeof crypto !== 'undefined' && 'randomUUID' in crypto
  ? `${prefix}-${crypto.randomUUID()}`
  : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const laneSemantic = (lane: BlueprintLaneDefinition): WhiteboardSemantic => {
  if (lane.role === 'evidence') return 'evidence';
  if (lane.role === 'frontstage') return 'frontstage';
  if (lane.role === 'backstage') return 'backstage';
  if (lane.role === 'system') return 'system';
  return 'process';
};

export function addBlueprintLaneItem(input: { graph: ServiceGraph; boardId: Id; stageId: Id; lane: BlueprintLaneKey; text?: string; now?: string; itemId?: Id }): { graph: ServiceGraph; itemId: Id | null } {
  const board = input.graph.views.whiteboards?.[input.boardId];
  const stage = input.graph.stages[input.stageId];
  if (!board || board.viewKind !== 'blueprint' || !stage || board.journeyId !== stage.journeyId) return { graph: input.graph, itemId: null };
  const settings = getBlueprintSettings(board);
  const lane = settings.lanes.find((item) => item.key === input.lane);
  if (!lane || !lane.editable || lane.role === 'customer') return { graph: input.graph, itemId: null };
  const itemId = input.itemId ?? makeId(`blueprint-${input.lane}`);
  const stageIndex = input.graph.journeys[stage.journeyId]?.stageIds.indexOf(stage.id) ?? 0;
  const laneIndex = settings.lanes.findIndex((item) => item.key === input.lane);
  const item: WhiteboardItem = {
    id: itemId, kind: 'free', shape: 'note', semantic: laneSemantic(lane), tone: lane.tone,
    text: input.text?.trim() || `Novo ${lane.label.toLowerCase()}`,
    x: 360 + Math.max(0, stageIndex) * 360, y: 220 + Math.max(0, laneIndex) * 280, width: 260, height: 120,
    blueprintStageId: stage.id, blueprintLane: lane.key,
  };
  const now = input.now ?? new Date().toISOString();
  const nextBoard: WhiteboardView = { ...board, blueprintSettings: settings, layoutMode: 'blueprint', items: { ...board.items, [itemId]: item }, updatedAt: now };
  const next: ServiceGraph = { ...input.graph, service: { ...input.graph.service, updatedAt: now }, views: { ...input.graph.views, whiteboards: { ...input.graph.views.whiteboards, [board.id]: nextBoard } } };
  return { graph: touchServiceProject(next, { currentPhase: 'design' }), itemId };
}

export function updateBlueprintItemText(input: { graph: ServiceGraph; boardId: Id; itemId: Id; text: string; now?: string }): ServiceGraph {
  const board = input.graph.views.whiteboards?.[input.boardId]; const item = board?.items?.[input.itemId];
  if (!board || !item || item.kind !== 'free') return input.graph;
  const now = input.now ?? new Date().toISOString();
  return { ...input.graph, service: { ...input.graph.service, updatedAt: now }, views: { ...input.graph.views, whiteboards: { ...input.graph.views.whiteboards, [board.id]: { ...board, updatedAt: now, items: { ...board.items, [item.id]: { ...item, text: input.text } } } } } };
}

export function removeBlueprintItem(input: { graph: ServiceGraph; boardId: Id; itemId: Id; now?: string }): ServiceGraph {
  const board = input.graph.views.whiteboards?.[input.boardId];
  if (!board?.items?.[input.itemId]) return input.graph;
  const now = input.now ?? new Date().toISOString(); const items = { ...board.items }; delete items[input.itemId];
  const edges = Object.fromEntries(Object.entries(board.edges ?? {}).filter(([, edge]) => edge.fromId !== input.itemId && edge.toId !== input.itemId));
  return { ...input.graph, service: { ...input.graph.service, updatedAt: now }, views: { ...input.graph.views, whiteboards: { ...input.graph.views.whiteboards, [board.id]: { ...board, updatedAt: now, items, edges } } } };
}

export function syncBlueprintFromJourney(graph: ServiceGraph, boardId: Id, now = new Date().toISOString()) {
  const board = graph.views.whiteboards?.[boardId]; const journey = board?.journeyId ? graph.journeys[board.journeyId] : undefined;
  if (!board || board.viewKind !== 'blueprint' || !journey) return { graph, added: 0, stageItems: 0, evidenceItems: 0 };
  const items = { ...board.items }; let stageItems = 0; let evidenceItems = 0;
  journey.stageIds.forEach((stageId, stageIndex) => {
    const stage = graph.stages[stageId]; if (!stage) return;
    const stageExists = Object.values(items).some((item) => item.kind === 'smart' && item.objectKind === 'stage' && item.objectId === stage.id && blueprintStageIdForItem(graph, { ...board, items }, item) === stage.id);
    if (!stageExists) { const id = makeId('blueprint-customer'); items[id] = { id, kind: 'smart', objectKind: 'stage', objectId: stage.id, tone: 'blue', x: 360 + stageIndex * 360, y: 500, width: 260, height: 120, blueprintStageId: stage.id, blueprintLane: 'customer' }; stageItems += 1; }
    safeIds(stage.evidenceIds).forEach((evidenceId, evidenceIndex) => {
      if (!graph.entities?.evidence?.[evidenceId]) return;
      const exists = Object.values(items).some((item) => item.kind === 'smart' && item.objectKind === 'evidence' && item.objectId === evidenceId && blueprintStageIdForItem(graph, { ...board, items }, item) === stage.id);
      if (exists) return;
      const id = makeId('blueprint-evidence'); items[id] = { id, kind: 'smart', objectKind: 'evidence', objectId: evidenceId, tone: 'slate', x: 360 + stageIndex * 360, y: 220 + evidenceIndex * 132, width: 260, height: 112, blueprintStageId: stage.id, blueprintLane: 'evidence' }; evidenceItems += 1;
    });
  });
  if (!stageItems && !evidenceItems) return { graph, added: 0, stageItems: 0, evidenceItems: 0 };
  const nextBoard: WhiteboardView = { ...board, blueprintSettings: getBlueprintSettings(board), layoutMode: 'blueprint', items, updatedAt: now };
  const next: ServiceGraph = { ...graph, service: { ...graph.service, updatedAt: now }, views: { ...graph.views, whiteboards: { ...graph.views.whiteboards, [board.id]: nextBoard } } };
  return { graph: touchServiceProject(next, { currentPhase: 'design' }), added: stageItems + evidenceItems, stageItems, evidenceItems };
}

export function blueprintItemLabel(graph: ServiceGraph, item: WhiteboardItem): string {
  if (item.kind === 'free') return item.text;
  if (item.objectKind === 'stage') { const stage = graph.stages[item.objectId]; return stage?.customerAction || stage?.title || 'Ação do cliente'; }
  const entity = graph.entities?.[item.objectKind]?.[item.objectId]; return entityTitle(entity, item.objectKind);
}

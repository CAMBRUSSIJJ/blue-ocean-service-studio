import type {
  ChannelContinuityDimension,
  ChannelContinuityRating,
  ChannelHandoffAssessment,
  Id,
  ServiceChannel,
  ServiceChannelKind,
  ServiceGraph,
} from '../domain/model';

export const CHANNEL_KIND_META: Record<ServiceChannelKind, { label: string; description: string }> = {
  digital: { label: 'Digital', description: 'Web, app, portal ou autosserviço digital.' },
  messaging: { label: 'Mensageria', description: 'WhatsApp, chat, SMS e mensagens assíncronas.' },
  phone: { label: 'Telefone', description: 'Voz, call center e atendimento telefônico.' },
  email: { label: 'E-mail', description: 'Comunicação por e-mail e notificações relacionadas.' },
  in_person: { label: 'Presencial', description: 'Interação face a face com pessoas do serviço.' },
  physical: { label: 'Físico', description: 'Ambiente, objeto, documento ou ponto físico.' },
  partner: { label: 'Parceiro', description: 'Canal operado por parceiro ou terceiro.' },
  system: { label: 'Sistema', description: 'Canal sistêmico ou integração não humana.' },
  other: { label: 'Outro', description: 'Canal que não se encaixa nas categorias anteriores.' },
};

export const CONTINUITY_DIMENSIONS: Array<{ key: ChannelContinuityDimension; label: string; short: string; description: string }> = [
  { key: 'context', label: 'Contexto preservado', short: 'Contexto', description: 'O cliente não precisa repetir informações ou refazer etapas.' },
  { key: 'identity', label: 'Identidade preservada', short: 'Identidade', description: 'O serviço reconhece quem é o cliente após a troca de canal.' },
  { key: 'ownership', label: 'Responsabilidade clara', short: 'Responsável', description: 'Está claro quem continua responsável pela resolução.' },
  { key: 'expectation', label: 'Expectativa consistente', short: 'Expectativa', description: 'Prazo, preço, promessa e instruções permanecem coerentes.' },
  { key: 'status', label: 'Status visível', short: 'Status', description: 'O andamento continua visível após a mudança de canal.' },
];

const EMPTY_RATINGS: Record<ChannelContinuityDimension, ChannelContinuityRating> = {
  context: 'unknown', identity: 'unknown', ownership: 'unknown', expectation: 'unknown', status: 'unknown',
};

const text = (value: unknown) => String(value ?? '').trim();
const normalizeName = (value: string) => value.trim().toLocaleLowerCase('pt-BR');
const uniq = <T,>(items: T[]) => [...new Set(items)];
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const channelSlug = (value: string) => normalizeName(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'channel';
const hash = (value: string) => {
  let current = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    current ^= value.charCodeAt(index);
    current = Math.imul(current, 16777619);
  }
  return (current >>> 0).toString(36).slice(0, 7);
};
const deterministicChannelId = (serviceId: Id, name: string) => `channel-${channelSlug(name)}-${hash(`${serviceId}:${normalizeName(name)}`)}`;
const handoffId = (serviceId: Id, fromChannelId: Id, toChannelId: Id) => `handoff-${hash(`${serviceId}:${fromChannelId}->${toChannelId}`)}`;
const isUnclassifiedName = (value: string) => !value.trim() || /n[aã]o classificado|sem canal|unknown|unclassified/i.test(value);

export function inferChannelKind(name: string): ServiceChannelKind {
  const value = normalizeName(name);
  if (/whats|mensag|chat|sms/.test(value)) return 'messaging';
  if (/telefone|phone|call|voz/.test(value)) return 'phone';
  if (/email|e-mail|mail/.test(value)) return 'email';
  if (/site|web|app|portal|digital|online/.test(value)) return 'digital';
  if (/loja|presencial|ag[eê]ncia|balc[aã]o|pessoa/.test(value)) return 'in_person';
  if (/papel|documento|f[ií]sico|totem/.test(value)) return 'physical';
  if (/parceiro|terceiro|marketplace/.test(value)) return 'partner';
  if (/sistema|api|integra[cç][aã]o|backoffice|opera[cç][aã]o/.test(value)) return 'system';
  return 'other';
}

function createChannel(serviceId: Id, name: string, now: string): ServiceChannel {
  return {
    id: deterministicChannelId(serviceId, name), serviceId, name: name.trim() || 'Não classificado',
    kind: inferChannelKind(name), description: '', active: true, createdAt: now, updatedAt: now,
  };
}

export function materializeLegacyChannels(graph: ServiceGraph, now = new Date().toISOString()): { graph: ServiceGraph; createdChannelIds: Id[]; linkedTouchpointIds: Id[] } {
  const channels = { ...(graph.channels ?? {}) };
  const touchpoints = { ...graph.touchpoints };
  const createdChannelIds: Id[] = [];
  const linkedTouchpointIds: Id[] = [];
  const byName = new Map(Object.values(channels).map((channel) => [normalizeName(channel.name), channel]));
  let changed = false;

  for (const point of Object.values(touchpoints)) {
    const existingById = point.channelId ? channels[point.channelId] : undefined;
    if (existingById) {
      if (point.channel !== existingById.name) {
        touchpoints[point.id] = { ...point, channel: existingById.name };
        changed = true;
      }
      continue;
    }
    const legacyName = text(point.channel) || 'Não classificado';
    let channel = byName.get(normalizeName(legacyName));
    if (!channel) {
      channel = createChannel(graph.service.id, legacyName, now);
      let id = channel.id;
      let suffix = 2;
      while (channels[id] && normalizeName(channels[id].name) !== normalizeName(channel.name)) {
        id = `${channel.id}-${suffix}`;
        suffix += 1;
      }
      channel = { ...channel, id };
      channels[id] = channel;
      byName.set(normalizeName(channel.name), channel);
      createdChannelIds.push(id);
    }
    touchpoints[point.id] = { ...point, channelId: channel.id, channel: channel.name };
    linkedTouchpointIds.push(point.id);
    changed = true;
  }

  if (!changed && graph.channels) return { graph, createdChannelIds, linkedTouchpointIds };
  return {
    graph: { ...graph, channels, touchpoints, channelHandoffs: { ...(graph.channelHandoffs ?? {}) }, service: { ...graph.service, updatedAt: now } },
    createdChannelIds, linkedTouchpointIds,
  };
}

export function createServiceChannel(input: { graph: ServiceGraph; name: string; kind?: ServiceChannelKind; description?: string; now?: string }): { graph: ServiceGraph; channelId: Id | null; created: boolean } {
  const name = input.name.trim();
  if (!name) return { graph: input.graph, channelId: null, created: false };
  const now = input.now ?? new Date().toISOString();
  const migrated = materializeLegacyChannels(input.graph, now).graph;
  const existing = Object.values(migrated.channels ?? {}).find((item) => normalizeName(item.name) === normalizeName(name));
  if (existing) return { graph: migrated, channelId: existing.id, created: false };
  const base = createChannel(migrated.service.id, name, now);
  const channel: ServiceChannel = { ...base, kind: input.kind ?? base.kind, description: input.description?.trim() ?? '' };
  return {
    graph: { ...migrated, channels: { ...(migrated.channels ?? {}), [channel.id]: channel }, service: { ...migrated.service, updatedAt: now } },
    channelId: channel.id, created: true,
  };
}

export function updateServiceChannel(graph: ServiceGraph, channelId: Id, patch: Partial<Pick<ServiceChannel, 'name' | 'kind' | 'description' | 'owner' | 'active'>>, now = new Date().toISOString()): ServiceGraph {
  const migrated = materializeLegacyChannels(graph, now).graph;
  const current = migrated.channels?.[channelId];
  if (!current) return migrated;
  const name = patch.name !== undefined ? patch.name.trim() || current.name : current.name;
  const nextChannel: ServiceChannel = { ...current, ...patch, name, updatedAt: now };
  const touchpoints = Object.fromEntries(Object.entries(migrated.touchpoints).map(([id, point]) => [id, point.channelId === channelId ? { ...point, channel: name } : point]));
  return { ...migrated, channels: { ...(migrated.channels ?? {}), [channelId]: nextChannel }, touchpoints, service: { ...migrated.service, updatedAt: now } };
}

export function removeServiceChannel(graph: ServiceGraph, channelId: Id, now = new Date().toISOString()): { graph: ServiceGraph; removed: boolean; reason?: string } {
  const migrated = materializeLegacyChannels(graph, now).graph;
  if (!migrated.channels?.[channelId]) return { graph: migrated, removed: false, reason: 'Canal não encontrado.' };
  const usedBy = Object.values(migrated.touchpoints).filter((point) => point.channelId === channelId);
  if (usedBy.length) return { graph: migrated, removed: false, reason: `Canal usado por ${usedBy.length} touchpoint${usedBy.length === 1 ? '' : 's'}. Realoque os touchpoints antes de excluir.` };
  const usedHandoff = Object.values(migrated.channelHandoffs ?? {}).some((item) => item.fromChannelId === channelId || item.toChannelId === channelId);
  if (usedHandoff) return { graph: migrated, removed: false, reason: 'Canal possui avaliação de handoff. Remova ou reavalie as transições antes de excluir.' };
  const channels = { ...(migrated.channels ?? {}) };
  delete channels[channelId];
  return { graph: { ...migrated, channels, service: { ...migrated.service, updatedAt: now } }, removed: true };
}

export function assignTouchpointChannel(graph: ServiceGraph, touchpointId: Id, channelId: Id, now = new Date().toISOString()): ServiceGraph {
  const migrated = materializeLegacyChannels(graph, now).graph;
  const point = migrated.touchpoints[touchpointId];
  const channel = migrated.channels?.[channelId];
  if (!point || !channel) return migrated;
  return {
    ...migrated,
    touchpoints: { ...migrated.touchpoints, [touchpointId]: { ...point, channelId, channel: channel.name } },
    service: { ...migrated.service, updatedAt: now },
  };
}

export function assignTouchpointChannelByName(graph: ServiceGraph, touchpointId: Id, channelName: string, now = new Date().toISOString()): ServiceGraph {
  const created = createServiceChannel({ graph, name: channelName || 'Não classificado', now });
  return created.channelId ? assignTouchpointChannel(created.graph, touchpointId, created.channelId, now) : created.graph;
}

export function setChannelHandoffRating(graph: ServiceGraph, fromChannelId: Id, toChannelId: Id, dimension: ChannelContinuityDimension, rating: ChannelContinuityRating, now = new Date().toISOString()): ServiceGraph {
  const migrated = materializeLegacyChannels(graph, now).graph;
  if (!migrated.channels?.[fromChannelId] || !migrated.channels?.[toChannelId] || fromChannelId === toChannelId) return migrated;
  const id = handoffId(migrated.service.id, fromChannelId, toChannelId);
  const current = migrated.channelHandoffs?.[id];
  const handoff: ChannelHandoffAssessment = current ?? {
    id, serviceId: migrated.service.id, fromChannelId, toChannelId, ratings: { ...EMPTY_RATINGS }, note: '', createdAt: now, updatedAt: now,
  };
  const next: ChannelHandoffAssessment = { ...handoff, ratings: { ...EMPTY_RATINGS, ...handoff.ratings, [dimension]: rating }, updatedAt: now };
  return { ...migrated, channelHandoffs: { ...(migrated.channelHandoffs ?? {}), [id]: next }, service: { ...migrated.service, updatedAt: now } };
}

export function setChannelHandoffNote(graph: ServiceGraph, fromChannelId: Id, toChannelId: Id, note: string, now = new Date().toISOString()): ServiceGraph {
  const migrated = materializeLegacyChannels(graph, now).graph;
  if (!migrated.channels?.[fromChannelId] || !migrated.channels?.[toChannelId] || fromChannelId === toChannelId) return migrated;
  const id = handoffId(migrated.service.id, fromChannelId, toChannelId);
  const current = migrated.channelHandoffs?.[id];
  const next: ChannelHandoffAssessment = current
    ? { ...current, note, updatedAt: now }
    : { id, serviceId: migrated.service.id, fromChannelId, toChannelId, ratings: { ...EMPTY_RATINGS }, note, createdAt: now, updatedAt: now };
  return { ...migrated, channelHandoffs: { ...(migrated.channelHandoffs ?? {}), [id]: next }, service: { ...migrated.service, updatedAt: now } };
}

function scoreAssessment(assessment?: ChannelHandoffAssessment) {
  const ratings = { ...EMPTY_RATINGS, ...(assessment?.ratings ?? {}) };
  const values = CONTINUITY_DIMENSIONS.map((item) => ratings[item.key]);
  const assessed = values.filter((value) => value !== 'unknown');
  const passed = assessed.filter((value) => value === 'pass').length;
  return { ratings, assessed: assessed.length, passed, score: assessed.length ? clamp((passed / assessed.length) * 100) : null };
}

type ChannelStage = {
  stageId: Id;
  title: string;
  touchpointIds: Id[];
  channelIds: Id[];
};

type ChannelJourney = {
  journeyId: Id;
  name: string;
  stages: ChannelStage[];
};

export type ChannelTransitionReport = {
  key: string;
  fromChannelId: Id;
  toChannelId: Id;
  fromName: string;
  toName: string;
  occurrences: number;
  journeyIds: Id[];
  stagePairs: Array<{ journeyId: Id; fromStageId: Id; fromStageTitle: string; toStageId: Id; toStageTitle: string }>;
  assessment?: ChannelHandoffAssessment;
  ratings: Record<ChannelContinuityDimension, ChannelContinuityRating>;
  assessedDimensions: number;
  score: number | null;
};

export type ChannelContinuityIssue = {
  id: string;
  severity: 'high' | 'medium' | 'low';
  label: string;
  detail: string;
  transitionKey?: string;
  touchpointId?: Id;
};

export type ChannelContinuityReport = {
  normalizedGraph: ServiceGraph;
  channels: ServiceChannel[];
  journeys: ChannelJourney[];
  transitions: ChannelTransitionReport[];
  channelCount: number;
  touchpointCount: number;
  mappedTouchpointCount: number;
  mappedTouchpointCoverage: number;
  switchCount: number;
  assessedTransitionCount: number;
  assessmentCoverage: number;
  continuityScore: number | null;
  issues: ChannelContinuityIssue[];
  unclassifiedTouchpointIds: Id[];
};

export function buildChannelContinuityReport(graph: ServiceGraph): ChannelContinuityReport {
  const normalizedGraph = materializeLegacyChannels(graph).graph;
  const channels = Object.values(normalizedGraph.channels ?? {}).filter((channel) => channel.active !== false).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  const unclassifiedTouchpointIds = Object.values(normalizedGraph.touchpoints).filter((point) => {
    const channel = point.channelId ? normalizedGraph.channels?.[point.channelId] : undefined;
    return !channel || isUnclassifiedName(channel.name);
  }).map((point) => point.id);
  const mappedTouchpointCount = Math.max(0, Object.keys(normalizedGraph.touchpoints).length - unclassifiedTouchpointIds.length);
  const touchpointCount = Object.keys(normalizedGraph.touchpoints).length;
  const mappedTouchpointCoverage = touchpointCount ? clamp((mappedTouchpointCount / touchpointCount) * 100) : 0;

  const journeys: ChannelJourney[] = normalizedGraph.service.journeyIds.map((journeyId) => normalizedGraph.journeys[journeyId]).filter(Boolean).map((journey) => ({
    journeyId: journey.id,
    name: journey.name,
    stages: journey.stageIds.map((stageId) => normalizedGraph.stages[stageId]).filter(Boolean).map((stage) => ({
      stageId: stage.id,
      title: stage.title,
      touchpointIds: [...stage.touchpointIds],
      channelIds: uniq(
        stage.touchpointIds
          .map((id) => normalizedGraph.touchpoints[id]?.channelId)
          .filter((id): id is Id => {
            if (!id) return false;
            const channel = normalizedGraph.channels?.[id];
            return Boolean(channel && !isUnclassifiedName(channel.name));
          }),
      ),
    })),
  }));

  const transitionMap = new Map<string, Omit<ChannelTransitionReport, 'assessment' | 'ratings' | 'assessedDimensions' | 'score'>>();
  for (const journey of journeys) {
    for (let index = 0; index < journey.stages.length - 1; index += 1) {
      const fromStage = journey.stages[index];
      const toStage = journey.stages[index + 1];
      for (const fromChannelId of fromStage.channelIds) {
        for (const toChannelId of toStage.channelIds) {
          if (fromChannelId === toChannelId) continue;
          const key = `${fromChannelId}->${toChannelId}`;
          const fromName = normalizedGraph.channels?.[fromChannelId]?.name ?? 'Canal';
          const toName = normalizedGraph.channels?.[toChannelId]?.name ?? 'Canal';
          const current = transitionMap.get(key) ?? { key, fromChannelId, toChannelId, fromName, toName, occurrences: 0, journeyIds: [], stagePairs: [] };
          current.occurrences += 1;
          current.journeyIds = uniq([...current.journeyIds, journey.journeyId]);
          current.stagePairs.push({ journeyId: journey.journeyId, fromStageId: fromStage.stageId, fromStageTitle: fromStage.title, toStageId: toStage.stageId, toStageTitle: toStage.title });
          transitionMap.set(key, current);
        }
      }
    }
  }

  const transitions = [...transitionMap.values()].map((base) => {
    const assessment = Object.values(normalizedGraph.channelHandoffs ?? {}).find((item) => item.fromChannelId === base.fromChannelId && item.toChannelId === base.toChannelId);
    const scored = scoreAssessment(assessment);
    return { ...base, assessment, ratings: scored.ratings, assessedDimensions: scored.assessed, score: scored.score };
  }).sort((a, b) => b.occurrences - a.occurrences || a.fromName.localeCompare(b.fromName, 'pt-BR'));

  const totalPossibleDimensions = transitions.length * CONTINUITY_DIMENSIONS.length;
  const assessedDimensionTotal = transitions.reduce((sum, item) => sum + item.assessedDimensions, 0);
  const assessmentCoverage = totalPossibleDimensions ? clamp((assessedDimensionTotal / totalPossibleDimensions) * 100) : 0;
  const assessedTransitions = transitions.filter((item) => item.score !== null);
  const weightedScoreDenominator = assessedTransitions.reduce((sum, item) => sum + item.occurrences, 0);
  const continuityScore = weightedScoreDenominator
    ? clamp(assessedTransitions.reduce((sum, item) => sum + (item.score ?? 0) * item.occurrences, 0) / weightedScoreDenominator)
    : null;

  const issues: ChannelContinuityIssue[] = [];
  for (const touchpointId of unclassifiedTouchpointIds) {
    const point = normalizedGraph.touchpoints[touchpointId];
    issues.push({ id: `unmapped:${touchpointId}`, severity: 'high', label: 'Touchpoint sem canal classificado', detail: point?.name ?? touchpointId, touchpointId });
  }
  for (const transition of transitions) {
    if (!transition.assessedDimensions) {
      issues.push({ id: `unassessed:${transition.key}`, severity: 'medium', label: 'Troca de canal ainda não avaliada', detail: `${transition.fromName} → ${transition.toName} aparece ${transition.occurrences}x na Journey.`, transitionKey: transition.key });
      continue;
    }
    for (const dimension of CONTINUITY_DIMENSIONS) {
      if (transition.ratings[dimension.key] !== 'fail') continue;
      issues.push({ id: `break:${transition.key}:${dimension.key}`, severity: 'high', label: `Quebra de continuidade · ${dimension.short}`, detail: `${transition.fromName} → ${transition.toName}: ${dimension.description}`, transitionKey: transition.key });
    }
  }

  return {
    normalizedGraph, channels, journeys, transitions, channelCount: channels.filter((channel) => !isUnclassifiedName(channel.name)).length,
    touchpointCount, mappedTouchpointCount, mappedTouchpointCoverage,
    switchCount: transitions.reduce((sum, item) => sum + item.occurrences, 0),
    assessedTransitionCount: assessedTransitions.length,
    assessmentCoverage, continuityScore,
    issues: issues.sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.severity] - ({ high: 0, medium: 1, low: 2 }[b.severity]))),
    unclassifiedTouchpointIds,
  };
}

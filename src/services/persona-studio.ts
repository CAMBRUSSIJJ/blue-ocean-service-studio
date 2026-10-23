import type { GraphEntity, Id, ServiceGraph } from '../domain/model';
import type { DiscoveryKind } from './discovery-workspace';

export type PersonaDepth = 'simple' | 'professional';
export type PersonaLayout = 'profile-left' | 'balanced' | 'story-first';
export type PersonaSectionId = 'identity' | 'bio' | 'goal' | 'needs' | 'situation' | 'quote' | 'channels' | 'behaviors' | 'expectations' | 'constraints' | 'triggers' | 'alternatives' | 'evidence' | 'relations';

export const SIMPLE_PERSONA_SECTIONS: PersonaSectionId[] = ['identity', 'goal', 'needs', 'situation', 'quote', 'channels', 'evidence'];
export const ADVANCED_PERSONA_SECTIONS: PersonaSectionId[] = ['identity', 'bio', 'goal', 'needs', 'situation', 'quote', 'channels', 'behaviors', 'expectations', 'constraints', 'triggers', 'alternatives', 'evidence', 'relations'];

// Changing depth does not discard data or reset individually selected blocks.
// On the first upgrade from an essential profile, expose the advanced toolkit.
export const switchPersonaDepth = (draft: PersonaProfileDraft, mode: PersonaDepth): PersonaProfileDraft => {
  if (draft.mode === mode) return draft;
  const selected = [...new Set<PersonaSectionId>(['identity', ...draft.sections])];
  const hasAdvanced = Boolean(draft.advancedConfigured) || selected.some(section => !SIMPLE_PERSONA_SECTIONS.includes(section));
  return {
    ...draft,
    mode,
    advancedConfigured: draft.advancedConfigured || mode === 'professional',
    sections: mode === 'professional' && !hasAdvanced
      ? [...new Set<PersonaSectionId>([...selected, ...ADVANCED_PERSONA_SECTIONS])]
      : selected,
  };
};
export const visiblePersonaSections = (draft: PersonaProfileDraft): PersonaSectionId[] =>
  draft.mode === 'professional' ? draft.sections : draft.sections.filter(id => SIMPLE_PERSONA_SECTIONS.includes(id));

export type PersonaRelationKind = Exclude<DiscoveryKind, 'persona'>;

export type PersonaProfileDraft = {
  title: string;
  description: string;
  mode: PersonaDepth;
  layout: PersonaLayout;
  sections: PersonaSectionId[];
  advancedConfigured?: boolean;
  context: string;
  primaryGoal: string;
  situation: string;
  quote: string;
  behaviors: string[];
  expectations: string[];
  constraints: string[];
  triggers: string[];
  alternatives: string[];
  channels: string[];
};

export type PersonaConnection = {
  id: Id;
  kind: PersonaRelationKind;
  title: string;
  description: string;
  direction: 'outbound' | 'inbound' | 'both';
  confidence?: 'low' | 'medium' | 'high';
};

export type PersonaStudioReport = {
  persona: GraphEntity;
  draft: PersonaProfileDraft;
  connections: PersonaConnection[];
  connectionCounts: Record<PersonaRelationKind, number>;
  foundationChecks: Array<{ id: string; label: string; complete: boolean }>;
  professionalChecks: Array<{ id: string; label: string; complete: boolean }>;
  foundationScore: number;
  professionalScore: number;
  evidenceConfidence: { low: number; medium: number; high: number };
  readyForDefinition: boolean;
};

const RELATION_KINDS: PersonaRelationKind[] = ['need', 'job', 'pain', 'problemHypothesis', 'evidence'];

const stringList = (value: unknown): string[] => Array.isArray(value)
  ? [...new Set(value.map((item) => String(item).trim()).filter(Boolean))]
  : typeof value === 'string'
    ? [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))]
    : [];

const relatedIds = (entity: GraphEntity | undefined): Id[] => Array.isArray(entity?.relatedIds)
  ? entity.relatedIds.filter((id): id is Id => typeof id === 'string' && Boolean(id))
  : [];

const entityTitle = (entity: GraphEntity) => String(entity.title ?? entity.name ?? 'Sem título');
const entityDescription = (entity: GraphEntity) => String(entity.description ?? '');

export const personaProfileFromEntity = (entity: GraphEntity): PersonaProfileDraft => ({
  title: entityTitle(entity) === 'Sem título' ? '' : entityTitle(entity),
  description: entityDescription(entity),
  mode: entity.personaMode === 'professional' ? 'professional' : 'simple',
  advancedConfigured: entity.personaAdvancedConfigured === true || entity.personaMode === 'professional' || (Array.isArray(entity.personaSections) && entity.personaSections.some((s) => !SIMPLE_PERSONA_SECTIONS.includes(s as PersonaSectionId))),
  layout: entity.personaLayout === 'balanced' || entity.personaLayout === 'story-first' ? entity.personaLayout : 'profile-left',
  sections: Array.isArray(entity.personaSections)
    ? entity.personaSections.filter((value): value is PersonaSectionId => ['identity','bio','goal','needs','situation','quote','channels','behaviors','expectations','constraints','triggers','alternatives','evidence','relations'].includes(String(value)))
    : (entity.personaMode === 'professional' ? [...ADVANCED_PERSONA_SECTIONS] : [...SIMPLE_PERSONA_SECTIONS]),
  context: String(entity.context ?? ''),
  primaryGoal: String(entity.primaryGoal ?? ''),
  situation: String(entity.situation ?? ''),
  quote: String(entity.quote ?? ''),
  behaviors: stringList(entity.behaviors),
  expectations: stringList(entity.expectations),
  constraints: stringList(entity.constraints),
  triggers: stringList(entity.triggers),
  alternatives: stringList(entity.alternatives),
  channels: stringList(entity.channels),
});

const relationUniverse = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({ kind, entity })),
);

export function buildPersonaStudioReport(graph: ServiceGraph, personaId: Id): PersonaStudioReport | null {
  const persona = graph.entities?.persona?.[personaId];
  if (!persona) return null;
  const outbound = new Set(relatedIds(persona));
  const connections: PersonaConnection[] = [];
  const counts = Object.fromEntries(RELATION_KINDS.map((kind) => [kind, 0])) as Record<PersonaRelationKind, number>;
  const evidenceConfidence = { low: 0, medium: 0, high: 0 };

  for (const { kind, entity } of relationUniverse(graph)) {
    const isOutbound = outbound.has(entity.id);
    const isInbound = relatedIds(entity).includes(personaId)
      || (Array.isArray(entity.personaIds) && entity.personaIds.includes(personaId));
    if (!isOutbound && !isInbound) continue;
    const direction: PersonaConnection['direction'] = isOutbound && isInbound ? 'both' : isOutbound ? 'outbound' : 'inbound';
    const confidence = kind === 'evidence' && ['low', 'medium', 'high'].includes(String(entity.confidence))
      ? entity.confidence as 'low' | 'medium' | 'high'
      : undefined;
    connections.push({ id: entity.id, kind, title: entityTitle(entity), description: entityDescription(entity), direction, confidence });
    counts[kind] += 1;
    if (confidence) evidenceConfidence[confidence] += 1;
  }

  const draft = personaProfileFromEntity(persona);
  const activeSections = visiblePersonaSections(draft);
  const foundationChecks = [
    { id: 'identity', label: 'Identidade clara', complete: Boolean(draft.title.trim()) },
    ...(activeSections.includes('bio') ? [{ id: 'context', label: 'Bio / contexto registrado', complete: Boolean(draft.context.trim() || draft.description.trim()) }] : []),
    ...(activeSections.includes('goal') ? [{ id: 'goal', label: 'Objetivo principal', complete: Boolean(draft.primaryGoal.trim()) }] : []),
    ...(activeSections.includes('situation') ? [{ id: 'situation', label: 'Situação de uso', complete: Boolean(draft.situation.trim()) }] : []),
    ...(activeSections.includes('quote') ? [{ id: 'quote', label: 'Citação representativa', complete: Boolean(draft.quote.trim()) }] : []),
    ...(activeSections.includes('channels') ? [{ id: 'channels', label: 'Canais / ambientes', complete: draft.channels.length > 0 }] : []),
    ...(activeSections.includes('needs') ? [{ id: 'need-job', label: 'Necessidade ou Job conectado', complete: counts.need + counts.job > 0 }] : []),
    ...(activeSections.includes('relations') ? [{ id: 'pain-hypothesis', label: 'Dor ou hipótese conectada', complete: counts.pain + counts.problemHypothesis > 0 }] : []),
    ...(activeSections.includes('evidence') ? [{ id: 'evidence', label: 'Evidência conectada', complete: counts.evidence > 0 }] : []),
  ];
  const professionalChecks = [
    ...(activeSections.includes('behaviors') ? [{ id: 'behaviors', label: 'Comportamentos', complete: draft.behaviors.length > 0 }] : []),
    ...(activeSections.includes('expectations') ? [{ id: 'expectations', label: 'Expectativas', complete: draft.expectations.length > 0 }] : []),
    ...(activeSections.includes('constraints') ? [{ id: 'constraints', label: 'Restrições', complete: draft.constraints.length > 0 }] : []),
    ...(activeSections.includes('triggers') ? [{ id: 'triggers', label: 'Gatilhos', complete: draft.triggers.length > 0 }] : []),
    ...(activeSections.includes('alternatives') ? [{ id: 'alternatives', label: 'Alternativas atuais', complete: draft.alternatives.length > 0 }] : []),
  ];
  const score = (checks: Array<{ complete: boolean }>) => Math.round((checks.filter((item) => item.complete).length / checks.length) * 100);
  const foundationScore = score(foundationChecks);
  const professionalScore = score([...foundationChecks, ...professionalChecks]);
  return {
    persona,
    draft,
    connections: connections.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title, 'pt-BR')),
    connectionCounts: counts,
    foundationChecks,
    professionalChecks,
    foundationScore,
    professionalScore,
    evidenceConfidence,
    readyForDefinition: foundationChecks.every((item) => item.complete),
  };
}

export function updatePersonaProfile(input: {
  graph: ServiceGraph;
  personaId: Id;
  draft: PersonaProfileDraft;
  connectedIds: Id[];
  now?: string;
}): ServiceGraph {
  const existing = input.graph.entities?.persona?.[input.personaId];
  if (!existing) return input.graph;
  const now = input.now ?? new Date().toISOString();
  const managedEntities = relationUniverse(input.graph);
  const managedIds = new Set(managedEntities.map(({ entity }) => entity.id));
  const selected = new Set(input.connectedIds.filter((id) => managedIds.has(id)));
  const preservedExternal = relatedIds(existing).filter((id) => !managedIds.has(id));
  const entities: ServiceGraph['entities'] = { ...(input.graph.entities ?? {}) };
  const personaCollection = { ...(entities.persona ?? {}) };

  personaCollection[input.personaId] = {
    ...existing,
    type: 'persona',
    serviceId: input.graph.service.id,
    title: input.draft.title.trim(),
    description: input.draft.description.trim(),
    personaMode: input.draft.mode,
    personaAdvancedConfigured: Boolean(input.draft.advancedConfigured || input.draft.mode === 'professional'),
    personaLayout: input.draft.layout ?? 'profile-left',
    personaSections: [...new Set(Array.isArray(input.draft.sections) ? input.draft.sections : (input.draft.mode === 'professional' ? ADVANCED_PERSONA_SECTIONS : SIMPLE_PERSONA_SECTIONS))],
    context: input.draft.context.trim(),
    primaryGoal: input.draft.primaryGoal.trim(),
    situation: input.draft.situation.trim(),
    quote: input.draft.quote.trim(),
    behaviors: stringList(input.draft.behaviors),
    expectations: stringList(input.draft.expectations),
    constraints: stringList(input.draft.constraints),
    triggers: stringList(input.draft.triggers),
    alternatives: stringList(input.draft.alternatives),
    channels: stringList(input.draft.channels),
    relatedIds: [...new Set([...preservedExternal, ...selected])],
    profileVersion: 1,
    updatedAt: now,
  };
  entities.persona = personaCollection;

  for (const { kind, entity } of managedEntities) {
    const collection = { ...(entities[kind] ?? {}) };
    const relationSet = new Set(relatedIds(entity));
    if (selected.has(entity.id)) relationSet.add(input.personaId);
    else relationSet.delete(input.personaId);
    collection[entity.id] = {
      ...entity,
      relatedIds: [...relationSet],
      ...(selected.has(entity.id) ? { personaIds: [...new Set([...(Array.isArray(entity.personaIds) ? entity.personaIds : []), input.personaId])] } : {
        personaIds: Array.isArray(entity.personaIds) ? entity.personaIds.filter((id) => id !== input.personaId) : [],
      }),
      updatedAt: selected.has(entity.id) || relatedIds(entity).includes(input.personaId) ? now : entity.updatedAt,
    };
    entities[kind] = collection;
  }

  return {
    ...input.graph,
    entities,
    service: { ...input.graph.service, updatedAt: now },
  };
}

export function removePersonaFromGraph(graph: ServiceGraph, personaId: Id, now = new Date().toISOString()): ServiceGraph {
  if (!graph.entities?.persona?.[personaId]) return graph;
  const entities: ServiceGraph['entities'] = { ...(graph.entities ?? {}) };
  const personas = { ...(entities.persona ?? {}) };
  delete personas[personaId];
  entities.persona = personas;

  for (const [kind, source] of Object.entries(entities)) {
    if (kind === 'persona') continue;
    const collection: Record<Id, GraphEntity> = {};
    for (const [id, entity] of Object.entries(source ?? {})) {
      collection[id] = {
        ...entity,
        relatedIds: relatedIds(entity).filter((relatedId) => relatedId !== personaId),
        ...(Array.isArray(entity.personaIds) ? { personaIds: entity.personaIds.filter((relatedId) => relatedId !== personaId) } : {}),
      };
    }
    entities[kind] = collection;
  }

  return { ...graph, entities, service: { ...graph.service, updatedAt: now } };
}

export const personaRelationOptions = (graph: ServiceGraph) => RELATION_KINDS.flatMap((kind) =>
  Object.values(graph.entities?.[kind] ?? {}).map((entity) => ({
    id: entity.id,
    kind,
    title: entityTitle(entity),
    description: entityDescription(entity),
    confidence: kind === 'evidence' ? String(entity.confidence ?? 'medium') : undefined,
  })),
);

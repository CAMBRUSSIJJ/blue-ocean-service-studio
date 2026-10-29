import type { GraphEntity, ServiceGraph } from '../domain/model';
import { createDiscoveryEntity } from './discovery-workspace.ts';

export type ContextKind = 'persona' | 'need' | 'job' | 'pain' | 'problemHypothesis' | 'problem' | 'evidence';

export type ContextKindDefinition = {
  kind: ContextKind;
  label: string;
  singular: string;
  eyebrow: string;
  question: string;
  createLabel: string;
};

export const CONTEXT_KIND_DEFINITIONS: ContextKindDefinition[] = [
  { kind: 'persona', label: 'Personas', singular: 'Persona', eyebrow: 'PESSOAS', question: 'Para quem estamos desenhando?', createLabel: 'Nova Persona' },
  { kind: 'need', label: 'Necessidades', singular: 'Necessidade', eyebrow: 'NECESSIDADES', question: 'O que precisa ser resolvido?', createLabel: 'Nova necessidade' },
  { kind: 'job', label: 'Jobs', singular: 'Job', eyebrow: 'PROGRESSO', question: 'Que progresso essa pessoa tenta fazer?', createLabel: 'Novo Job' },
  { kind: 'pain', label: 'Dores', singular: 'Dor', eyebrow: 'FRICÇÕES', question: 'Onde a experiência quebra hoje?', createLabel: 'Nova dor' },
  { kind: 'problemHypothesis', label: 'Hipóteses', singular: 'Hipótese', eyebrow: 'HIPÓTESES', question: 'O que ainda precisa ser provado?', createLabel: 'Nova hipótese' },
  { kind: 'problem', label: 'Problemas', singular: 'Problema', eyebrow: 'VALIDADOS', question: 'Quais problemas já têm sustentação?', createLabel: 'Nova hipótese de problema' },
  { kind: 'evidence', label: 'Evidências', singular: 'Evidência', eyebrow: 'EVIDÊNCIAS', question: 'O que sustenta ou contradiz nossas decisões?', createLabel: 'Nova evidência' },
];

const contextKinds = new Set<ContextKind>(CONTEXT_KIND_DEFINITIONS.map((item) => item.kind));
const nowIso = () => new Date().toISOString();
const clone = <T>(value: T): T => structuredClone(value);

function collection(graph: ServiceGraph, kind: ContextKind): Record<string, GraphEntity> {
  return graph.entities?.[kind] ?? {};
}

export function contextDefinition(kind: ContextKind) {
  return CONTEXT_KIND_DEFINITIONS.find((item) => item.kind === kind) ?? CONTEXT_KIND_DEFINITIONS[0];
}

export function listContextEntities(graph: ServiceGraph, kind: ContextKind): GraphEntity[] {
  return Object.values(collection(graph, kind))
    .filter((entity) => !entity.serviceId || entity.serviceId === graph.service.id)
    .sort((a, b) => String(b.updatedAt ?? b.createdAt ?? '').localeCompare(String(a.updatedAt ?? a.createdAt ?? '')) || String(a.title ?? a.name ?? '').localeCompare(String(b.title ?? b.name ?? ''), 'pt-BR'));
}

export function allContextEntities(graph: ServiceGraph): Array<GraphEntity & { contextKind: ContextKind }> {
  return CONTEXT_KIND_DEFINITIONS.flatMap(({ kind }) => listContextEntities(graph, kind).map((entity) => ({ ...entity, contextKind: kind })));
}

export function contextEntityTitle(entity?: GraphEntity | null) {
  return String(entity?.title ?? entity?.name ?? 'Sem título').trim() || 'Sem título';
}

export function contextEntityDescription(entity?: GraphEntity | null) {
  return String(entity?.description ?? entity?.context ?? '').trim();
}

export function contextRelatedIds(entity?: GraphEntity | null): string[] {
  const ids = [
    ...(Array.isArray(entity?.relatedIds) ? entity.relatedIds : []),
    ...(Array.isArray(entity?.personaIds) ? entity.personaIds : []),
    ...(Array.isArray(entity?.evidenceIds) ? entity.evidenceIds : []),
    ...(Array.isArray(entity?.contextIds) ? entity.contextIds : []),
  ].map(String).filter(Boolean);
  return [...new Set(ids)];
}

export function contextEntityById(graph: ServiceGraph, id: string): { kind: ContextKind; entity: GraphEntity } | null {
  for (const { kind } of CONTEXT_KIND_DEFINITIONS) {
    const entity = graph.entities?.[kind]?.[id];
    if (entity) return { kind, entity };
  }
  return null;
}

export function contextEntityUsage(graph: ServiceGraph, kind: ContextKind, id: string) {
  let whiteboards = 0;
  let instances = 0;
  for (const board of Object.values(graph.views?.whiteboards ?? {})) {
    const count = Object.values(board.items ?? {}).filter((item) => item.kind === 'smart' && item.objectKind === kind && item.objectId === id).length;
    if (count) whiteboards += 1;
    instances += count;
  }
  const related = allContextEntities(graph).filter((item) => item.id !== id && contextRelatedIds(item).includes(id));
  return { whiteboards, instances, relatedCount: related.length };
}

export function createContextEntity(graph: ServiceGraph, kind: ContextKind, title: string, description = ''): ServiceGraph {
  const next = clone(graph);
  next.entities ||= {};
  if (kind === 'problem') {
    // A problem can be recorded directly, but never falsely marked as validated.
    const timestamp = nowIso();
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `problem-${crypto.randomUUID()}`
      : `problem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    next.entities.problem ||= {};
    next.entities.problem[id] = {
      id, type: 'problem', serviceId: next.service.id,
      title: title.trim(), description: description.trim(),
      status: 'draft', severity: 'medium', priority: 'medium',
      relatedIds: [], createdAt: timestamp, updatedAt: timestamp,
    };
    next.service.updatedAt = timestamp;
    return next;
  }
  const entity = createDiscoveryEntity({ graph: next, kind, title, description });
  next.entities[kind] ||= {};
  next.entities[kind][entity.id] = entity;
  next.service.updatedAt = String(entity.updatedAt ?? nowIso());
  return next;
}

export function updateContextEntity(
  graph: ServiceGraph,
  kind: ContextKind,
  id: string,
  patch: { title?: string; description?: string; owner?: string; confidence?: string; sourceType?: string; status?: string },
): ServiceGraph {
  const current = graph.entities?.[kind]?.[id];
  if (!current) return graph;
  const next = clone(graph);
  const record = next.entities[kind][id];
  const timestamp = nowIso();
  if (patch.title !== undefined) record.title = patch.title.trim();
  if (patch.description !== undefined) record.description = patch.description.trim();
  if (patch.owner !== undefined) record.owner = patch.owner.trim();
  if (patch.confidence !== undefined && kind === 'evidence') record.confidence = patch.confidence;
  if (patch.sourceType !== undefined && kind === 'evidence') record.sourceType = patch.sourceType;
  if (patch.status !== undefined && kind === 'problemHypothesis') record.status = patch.status;
  record.updatedAt = timestamp;
  next.service.updatedAt = timestamp;
  return next;
}

function replaceRelation(list: unknown, id: string, enabled: boolean) {
  const values = Array.isArray(list) ? list.map(String) : [];
  const next = enabled ? [...new Set([...values, id])] : values.filter((value) => value !== id);
  return next;
}

export function setContextRelation(graph: ServiceGraph, sourceKind: ContextKind, sourceId: string, targetId: string, enabled: boolean): ServiceGraph {
  const source = graph.entities?.[sourceKind]?.[sourceId];
  const targetMatch = contextEntityById(graph, targetId);
  if (!source || !targetMatch || sourceId === targetId) return graph;
  const next = clone(graph);
  const a = next.entities[sourceKind][sourceId];
  const b = next.entities[targetMatch.kind][targetId];
  const timestamp = nowIso();
  a.relatedIds = replaceRelation(a.relatedIds, targetId, enabled);
  b.relatedIds = replaceRelation(b.relatedIds, sourceId, enabled);
  if (sourceKind === 'persona') b.personaIds = replaceRelation(b.personaIds, sourceId, enabled);
  if (targetMatch.kind === 'persona') a.personaIds = replaceRelation(a.personaIds, targetId, enabled);
  if (sourceKind === 'evidence') b.evidenceIds = replaceRelation(b.evidenceIds, sourceId, enabled);
  if (targetMatch.kind === 'evidence') a.evidenceIds = replaceRelation(a.evidenceIds, targetId, enabled);
  a.updatedAt = timestamp;
  b.updatedAt = timestamp;
  next.service.updatedAt = timestamp;
  return next;
}

export function removeContextEntity(graph: ServiceGraph, kind: ContextKind, id: string): ServiceGraph {
  if (!graph.entities?.[kind]?.[id]) return graph;
  const next = clone(graph);
  delete next.entities[kind][id];
  for (const { kind: otherKind } of CONTEXT_KIND_DEFINITIONS) {
    for (const entity of Object.values(next.entities?.[otherKind] ?? {})) {
      for (const field of ['relatedIds', 'personaIds', 'needIds', 'jobIds', 'painIds', 'hypothesisIds', 'problemIds', 'evidenceIds', 'contextIds', 'supportingEvidenceIds', 'contradictingEvidenceIds']) {
        if (Array.isArray(entity[field])) entity[field] = entity[field].map(String).filter((value) => value !== id);
      }
      if (kind === 'evidence' && Array.isArray(entity.evidenceLinks)) {
        entity.evidenceLinks = entity.evidenceLinks.filter((value) => {
          if (!value || typeof value !== 'object') return true;
          return String((value as Record<string, unknown>).evidenceId ?? '') !== id;
        });
      }
      if (entity.sourceHypothesisId === id) entity.sourceHypothesisId = undefined;
      if (entity.validatedProblemId === id) entity.validatedProblemId = undefined;
    }
  }
  for (const board of Object.values(next.views?.whiteboards ?? {})) {
    const removedItemIds = Object.values(board.items ?? {})
      .filter((item) => item.kind === 'smart' && item.objectKind === kind && item.objectId === id)
      .map((item) => item.id);
    for (const itemId of removedItemIds) delete board.items[itemId];
    if (removedItemIds.length) {
      const removed = new Set(removedItemIds);
      for (const [edgeId, edge] of Object.entries(board.edges ?? {})) {
        if (removed.has(edge.fromId) || removed.has(edge.toId)) delete board.edges[edgeId];
      }
    }
  }
  const definition = next.service.project?.definition;
  if (definition) {
    definition.personaIds = definition.personaIds.filter((value) => value !== id);
    definition.problemIds = definition.problemIds.filter((value) => value !== id);
    definition.evidenceIds = definition.evidenceIds.filter((value) => value !== id);
  }
  const timestamp = nowIso();
  next.service.updatedAt = timestamp;
  return next;
}

export function contextLibraryStats(graph: ServiceGraph) {
  const counts = Object.fromEntries(CONTEXT_KIND_DEFINITIONS.map(({ kind }) => [kind, listContextEntities(graph, kind).length])) as Record<ContextKind, number>;
  return {
    counts,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
    validatedProblems: counts.problem,
    hypotheses: counts.problemHypothesis,
  };
}

export function isContextKind(value: string): value is ContextKind {
  return contextKinds.has(value as ContextKind);
}

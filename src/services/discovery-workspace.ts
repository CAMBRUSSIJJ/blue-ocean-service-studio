import type { GraphEntity, Id, ServiceGraph } from '../domain/model';

export type DiscoveryKind = 'persona' | 'need' | 'job' | 'pain' | 'problemHypothesis' | 'evidence';
export type DiscoveryStatus = 'empty' | 'started' | 'ready';

export type DiscoveryCollection = {
  kind: DiscoveryKind;
  label: string;
  singular: string;
  question: string;
  items: GraphEntity[];
  count: number;
};

export type DiscoveryWorkspaceReport = {
  collections: Record<DiscoveryKind, DiscoveryCollection>;
  totalObjects: number;
  relationshipCount: number;
  completedChecks: number;
  totalChecks: number;
  score: number;
  status: DiscoveryStatus;
  minimumContextReady: boolean;
  nextMissing: DiscoveryKind | null;
  recent: Array<GraphEntity & { discoveryKind: DiscoveryKind }>;
};

const KINDS: DiscoveryKind[] = ['persona', 'need', 'job', 'pain', 'problemHypothesis', 'evidence'];
const META: Record<DiscoveryKind, Pick<DiscoveryCollection, 'label' | 'singular' | 'question'>> = {
  persona: { label: 'Personas', singular: 'Persona', question: 'Quem vive esta experiência?' },
  need: { label: 'Necessidades', singular: 'Necessidade', question: 'O que precisa ser resolvido?' },
  job: { label: 'Jobs', singular: 'Job', question: 'O que a pessoa tenta realizar?' },
  pain: { label: 'Dores', singular: 'Dor', question: 'O que torna isso difícil hoje?' },
  problemHypothesis: { label: 'Hipóteses', singular: 'Hipótese', question: 'O que acreditamos que causa a fricção?' },
  evidence: { label: 'Evidências', singular: 'Evidência', question: 'O que sustenta ou refuta a hipótese?' },
};

const values = (graph: ServiceGraph, kind: DiscoveryKind): GraphEntity[] => Object.values(graph.entities?.[kind] ?? {});
const updatedAt = (item: GraphEntity) => String(item.updatedAt ?? item.createdAt ?? '');
const relationIds = (item: GraphEntity): Id[] => {
  const candidates = [item.relatedIds, item.personaIds, item.needIds, item.jobIds, item.painIds, item.hypothesisIds, item.evidenceIds];
  const ids = new Set<Id>();
  for (const value of candidates) if (Array.isArray(value)) for (const id of value) if (typeof id === 'string' && id) ids.add(id);
  return [...ids];
};

export function buildDiscoveryWorkspaceReport(graph: ServiceGraph): DiscoveryWorkspaceReport {
  const collections = Object.fromEntries(KINDS.map((kind) => {
    const items = values(graph, kind);
    return [kind, { kind, ...META[kind], items, count: items.length }];
  })) as Record<DiscoveryKind, DiscoveryCollection>;

  const checks = KINDS.map((kind) => collections[kind].count > 0);
  const completedChecks = checks.filter(Boolean).length;
  const totalChecks = checks.length;
  const score = Math.round((completedChecks / totalChecks) * 100);
  const minimumContextReady = collections.persona.count > 0
    && (collections.need.count > 0 || collections.job.count > 0)
    && (collections.pain.count > 0 || collections.problemHypothesis.count > 0)
    && collections.evidence.count > 0;
  const nextMissing = KINDS.find((kind) => collections[kind].count === 0) ?? null;
  const recent = KINDS.flatMap((kind) => collections[kind].items.map((item) => ({ ...item, discoveryKind: kind })))
    .sort((a, b) => Date.parse(updatedAt(b)) - Date.parse(updatedAt(a)))
    .slice(0, 12);
  const discoveryItems = KINDS.flatMap((kind) => collections[kind].items);
  const discoveryIds = new Set(discoveryItems.map((item) => item.id));
  const relationshipPairs = new Set<string>();
  for (const item of discoveryItems) for (const relatedId of relationIds(item)) {
    if (!discoveryIds.has(relatedId) || relatedId === item.id) continue;
    relationshipPairs.add([item.id, relatedId].sort().join('::'));
  }
  const relationshipCount = relationshipPairs.size;
  const status: DiscoveryStatus = completedChecks === 0 ? 'empty' : minimumContextReady ? 'ready' : 'started';
  return { collections, totalObjects: KINDS.reduce((sum, kind) => sum + collections[kind].count, 0), relationshipCount, completedChecks, totalChecks, score, status, minimumContextReady, nextMissing, recent };
}

export function createDiscoveryEntity(input: {
  graph: ServiceGraph;
  kind: DiscoveryKind;
  title: string;
  description?: string;
  relatedIds?: Id[];
  confidence?: 'low' | 'medium' | 'high';
  sourceType?: string;
  now?: string;
  id?: Id;
}): GraphEntity {
  const now = input.now ?? new Date().toISOString();
  const id = input.id ?? `${input.kind}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
  return {
    id,
    type: input.kind,
    serviceId: input.graph.service.id,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    status: input.kind === 'problemHypothesis' ? 'hypothesis' : input.kind === 'evidence' ? 'captured' : 'active',
    relatedIds: [...new Set(input.relatedIds ?? [])],
    ...(input.kind === 'evidence' ? { confidence: input.confidence ?? 'medium', sourceType: input.sourceType ?? 'observation' } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

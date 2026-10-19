import type {
  GraphEntity,
  Id,
  ServiceEcologyRelation,
  ServiceEcologyRelationKind,
  ServiceEcologyState,
  ServiceGraph,
  ServiceStakeholder,
  StakeholderInfluence,
  StakeholderKind,
} from '../domain/model';
import { makeId } from '../domain/graph-operations';

export const STAKEHOLDER_KIND_LABELS: Record<StakeholderKind, string> = {
  customer: 'Cliente / usuário',
  employee: 'Funcionário',
  manager: 'Gestão',
  partner: 'Parceiro',
  supplier: 'Fornecedor',
  regulator: 'Regulador',
  community: 'Comunidade',
  organization: 'Organização',
  system: 'Sistema / ator não humano',
  other: 'Outro',
};

export const ECOLOGY_RELATION_LABELS: Record<ServiceEcologyRelationKind, string> = {
  uses: 'usa',
  delivers: 'entrega para',
  depends_on: 'depende de',
  pays: 'paga',
  influences: 'influencia',
  regulates: 'regula',
  supports: 'suporta',
  exchanges_information: 'troca informação',
  creates_value: 'gera valor para',
};

export type EcologyReport = {
  stakeholderCount: number;
  relationCount: number;
  representedKinds: number;
  connectedStakeholderCount: number;
  disconnectedStakeholderIds: Id[];
  highInfluenceIds: Id[];
  evidenceLinkedCount: number;
  score: number;
};

const nowIso = () => new Date().toISOString();
const clone = <T>(value: T): T => structuredClone(value);

export function emptyServiceEcology(serviceId: Id, now = nowIso()): ServiceEcologyState {
  void serviceId;
  return { version: 1, stakeholders: {}, relations: {}, updatedAt: now };
}

export function getServiceEcology(graph: ServiceGraph): ServiceEcologyState {
  return graph.service.ecology ?? emptyServiceEcology(graph.service.id, graph.service.updatedAt || nowIso());
}

function commitEcology(graph: ServiceGraph, ecology: ServiceEcologyState): ServiceGraph {
  const next = clone(graph);
  const timestamp = nowIso();
  next.service.ecology = { ...ecology, updatedAt: timestamp };
  next.service.updatedAt = timestamp;
  return next;
}

export function createServiceStakeholder(input: {
  graph: ServiceGraph;
  name: string;
  kind: StakeholderKind;
  role?: string;
  summary?: string;
  goals?: string;
  needs?: string;
  influence?: StakeholderInfluence;
  interest?: StakeholderInfluence;
  evidenceIds?: Id[];
  personaId?: Id;
}): ServiceGraph {
  const name = input.name.trim();
  if (!name) return input.graph;
  const ecology = clone(getServiceEcology(input.graph));
  const now = nowIso();
  const id = makeId('stakeholder');
  ecology.stakeholders[id] = {
    id,
    serviceId: input.graph.service.id,
    name,
    kind: input.kind,
    role: input.role?.trim() || undefined,
    summary: input.summary?.trim() || undefined,
    goals: input.goals?.trim() || undefined,
    needs: input.needs?.trim() || undefined,
    influence: input.influence ?? 3,
    interest: input.interest ?? 3,
    evidenceIds: [...new Set(input.evidenceIds ?? [])],
    personaId: input.personaId,
    createdAt: now,
    updatedAt: now,
  };
  return commitEcology(input.graph, ecology);
}

export function updateServiceStakeholder(input: {
  graph: ServiceGraph;
  stakeholderId: Id;
  patch: Partial<Pick<ServiceStakeholder, 'name' | 'kind' | 'role' | 'summary' | 'goals' | 'needs' | 'influence' | 'interest' | 'evidenceIds'>>;
}): ServiceGraph {
  const ecology = clone(getServiceEcology(input.graph));
  const current = ecology.stakeholders[input.stakeholderId];
  if (!current) return input.graph;
  const patch = { ...input.patch };
  if (typeof patch.name === 'string') patch.name = patch.name.trim();
  if (typeof patch.role === 'string') patch.role = patch.role.trim();
  if (typeof patch.summary === 'string') patch.summary = patch.summary.trim();
  if (typeof patch.goals === 'string') patch.goals = patch.goals.trim();
  if (typeof patch.needs === 'string') patch.needs = patch.needs.trim();
  if (Array.isArray(patch.evidenceIds)) patch.evidenceIds = [...new Set(patch.evidenceIds)];
  ecology.stakeholders[input.stakeholderId] = { ...current, ...patch, updatedAt: nowIso() };
  return commitEcology(input.graph, ecology);
}

export function removeServiceStakeholder(graph: ServiceGraph, stakeholderId: Id): ServiceGraph {
  const ecology = clone(getServiceEcology(graph));
  if (!ecology.stakeholders[stakeholderId]) return graph;
  delete ecology.stakeholders[stakeholderId];
  for (const [relationId, relation] of Object.entries(ecology.relations)) {
    if (relation.fromId === stakeholderId || relation.toId === stakeholderId) delete ecology.relations[relationId];
  }
  return commitEcology(graph, ecology);
}

export function createEcologyRelation(input: {
  graph: ServiceGraph;
  fromId: Id;
  toId: Id;
  kind: ServiceEcologyRelationKind;
  note?: string;
  strength?: ServiceEcologyRelation['strength'];
}): ServiceGraph {
  if (input.fromId === input.toId) return input.graph;
  const ecology = clone(getServiceEcology(input.graph));
  if (!ecology.stakeholders[input.fromId] || !ecology.stakeholders[input.toId]) return input.graph;
  const duplicate = Object.values(ecology.relations).some((item) => item.fromId === input.fromId && item.toId === input.toId && item.kind === input.kind);
  if (duplicate) return input.graph;
  const id = makeId('ecology-relation');
  ecology.relations[id] = { id, fromId: input.fromId, toId: input.toId, kind: input.kind, note: input.note?.trim() || undefined, strength: input.strength ?? 'medium', createdAt: nowIso() };
  return commitEcology(input.graph, ecology);
}

export function removeEcologyRelation(graph: ServiceGraph, relationId: Id): ServiceGraph {
  const ecology = clone(getServiceEcology(graph));
  if (!ecology.relations[relationId]) return graph;
  delete ecology.relations[relationId];
  return commitEcology(graph, ecology);
}

const entityTitle = (entity: GraphEntity) => String(entity.title ?? entity.name ?? '').trim();
const stringList = (value: unknown) => Array.isArray(value) ? value.map(String).filter(Boolean) : [];

export function syncPersonasToServiceEcology(graph: ServiceGraph): { graph: ServiceGraph; created: number } {
  const ecology = clone(getServiceEcology(graph));
  const byPersona = new Set(Object.values(ecology.stakeholders).map((item) => item.personaId).filter(Boolean));
  let created = 0;
  const now = nowIso();
  for (const persona of Object.values(graph.entities?.persona ?? {})) {
    if (byPersona.has(persona.id)) continue;
    const name = entityTitle(persona);
    if (!name) continue;
    const id = makeId('stakeholder');
    const evidenceIds = [...new Set([
      ...stringList(persona.evidenceIds),
      ...stringList(persona.relatedIds).filter((ref) => Boolean(graph.entities?.evidence?.[ref])),
    ])];
    ecology.stakeholders[id] = {
      id,
      serviceId: graph.service.id,
      name,
      kind: 'customer',
      role: 'Pessoa atendida pelo serviço',
      summary: String(persona.description ?? persona.context ?? '').trim() || undefined,
      goals: String(persona.primaryGoal ?? '').trim() || undefined,
      needs: String(persona.situation ?? '').trim() || undefined,
      influence: 3,
      interest: 5,
      evidenceIds,
      personaId: persona.id,
      createdAt: now,
      updatedAt: now,
    };
    created += 1;
  }
  return { graph: created ? commitEcology(graph, ecology) : graph, created };
}

export function buildServiceEcologyReport(graph: ServiceGraph): EcologyReport {
  const ecology = getServiceEcology(graph);
  const stakeholders = Object.values(ecology.stakeholders);
  const relations = Object.values(ecology.relations);
  const connectedIds = new Set<Id>();
  for (const relation of relations) { connectedIds.add(relation.fromId); connectedIds.add(relation.toId); }
  const kinds = new Set(stakeholders.map((item) => item.kind));
  const disconnectedStakeholderIds = stakeholders.filter((item) => !connectedIds.has(item.id)).map((item) => item.id);
  const highInfluenceIds = stakeholders.filter((item) => item.influence >= 4).map((item) => item.id);
  const evidenceLinkedCount = stakeholders.filter((item) => item.evidenceIds.length > 0).length;
  const peopleCoverage = stakeholders.length ? Math.min(35, stakeholders.length * 7) : 0;
  const relationCoverage = Math.min(30, relations.length * 6);
  const diversityCoverage = Math.min(20, kinds.size * 4);
  const evidenceCoverage = stakeholders.length ? Math.round((evidenceLinkedCount / stakeholders.length) * 15) : 0;
  return {
    stakeholderCount: stakeholders.length,
    relationCount: relations.length,
    representedKinds: kinds.size,
    connectedStakeholderCount: connectedIds.size,
    disconnectedStakeholderIds,
    highInfluenceIds,
    evidenceLinkedCount,
    score: Math.min(100, peopleCoverage + relationCoverage + diversityCoverage + evidenceCoverage),
  };
}

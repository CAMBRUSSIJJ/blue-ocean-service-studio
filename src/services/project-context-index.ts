import type { GraphEntity, ServiceGraph } from '../domain/model.ts';

/** Project snapshots remain the storage boundary. These selectors never mutate or copy records. */
export type ProjectContextKind = 'persona' | 'need' | 'job' | 'pain' | 'problemHypothesis' | 'problem' | 'evidence';
export type ProjectContextRecord = GraphEntity & { contextKind: ProjectContextKind };
export type ProjectContextArea = 'audience' | 'research';
export type ProjectContextFilters = {
  area: ProjectContextArea;
  query?: string;
  kind?: ProjectContextKind | 'all';
  personaId?: string;
  hasEvidence?: boolean;
};
const KINDS: ProjectContextKind[] = ['persona', 'need', 'job', 'pain', 'problemHypothesis', 'problem', 'evidence'];
const RESEARCH: ProjectContextKind[] = ['problemHypothesis', 'problem', 'evidence'];

export function projectContextRecords(graph: ServiceGraph): ProjectContextRecord[] {
  return KINDS.flatMap(contextKind => Object.values(graph.entities?.[contextKind] ?? {})
    .filter(item => !item.serviceId || item.serviceId === graph.service.id)
    .map(item => ({ ...item, contextKind })));
}

export function projectRelatedIds(entity?: GraphEntity | null): string[] {
  if (!entity) return [];
  const values = ['relatedIds', 'personaIds', 'evidenceIds', 'contextIds']
    .flatMap(key => {
      const source = (entity as unknown as Record<string, unknown>)[key];
      return Array.isArray(source) ? source.map(String) : [];
    }).filter(Boolean);
  return [...new Set(values)];
}

export function projectRelatedRecords(records: ProjectContextRecord[], id: string): ProjectContextRecord[] {
  const selected = records.find(record => record.id === id);
  const outbound = new Set(projectRelatedIds(selected));
  return records.filter(item => item.id !== id && (outbound.has(item.id) || projectRelatedIds(item).includes(id)));
}

export function projectHasLinkedEvidence(records: ProjectContextRecord[], id: string): boolean {
  return projectRelatedRecords(records, id).some(item => item.contextKind === 'evidence');
}

export function filterProjectContext(records: ProjectContextRecord[], options: ProjectContextFilters): ProjectContextRecord[] {
  const allowed = options.area === 'research' ? RESEARCH : KINDS;
  const search = (options.query ?? '').trim().toLocaleLowerCase('pt-BR');
  return records.filter(item => {
    if (!allowed.includes(item.contextKind)) return false;
    if (options.kind && options.kind !== 'all' && item.contextKind !== options.kind) return false;
    if (options.personaId && options.personaId !== 'all' && item.id !== options.personaId &&
      !projectRelatedRecords(records, item.id).some(other => other.contextKind === 'persona' && other.id === options.personaId)) return false;
    if (options.hasEvidence && item.contextKind !== 'evidence' && !projectHasLinkedEvidence(records, item.id)) return false;
    const content = [item.title, item.name, item.description, item.owner].map(value => String(value ?? '')).join(' ').toLocaleLowerCase('pt-BR');
    return !search || content.includes(search);
  });
}

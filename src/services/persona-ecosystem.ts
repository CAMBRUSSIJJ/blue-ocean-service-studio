import type { GraphEntity, ServiceGraph } from '../domain/model';
import { createDiscoveryEntity } from './discovery-workspace.ts';
import { normalizePersonaEvidenceClaims, updatePersonaProfile, type PersonaProfileDraft, type PersonaRelationKind } from './persona-studio.ts';
import { relationsFor, serviceModelIndex } from './service-model-index.ts';

export type PersonaEcosystemChange =
  | { type: 'create'; kind: 'pain' | 'need' | 'evidence'; title: string; url?: string; id?: string }
  | { type: 'link' | 'unlink'; id: string };

/** Source links are data. No external document is fetched or executed. */
export function personaSourceUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2000) return '';
  try {
    const url = new URL(value.trim());
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

export function changePersonaEcosystem(graph: ServiceGraph, personaId: string, draft: PersonaProfileDraft, connectedIds: string[], change: PersonaEcosystemChange, now = new Date().toISOString()): ServiceGraph {
  const persona = graph.entities.persona?.[personaId];
  if (!persona || persona.serviceId && persona.serviceId !== graph.service.id) throw new Error('Esta Persona não está disponível no serviço.');
  if (!draft.title.trim()) throw new Error('Informe o nome da Persona antes de conectar registros.');
  let next = graph, ids = [...connectedIds], profile = draft;
  if (change.type === 'create') {
    const url = change.kind === 'evidence' ? personaSourceUrl(change.url) : '';
    if (change.kind === 'evidence' && !url) throw new Error('Informe um link completo começando com https:// ou http://.');
    const title = change.title.trim() || (url ? new URL(url).hostname : '');
    if (!title || title.length > 240) throw new Error('Use um título de 1 a 240 caracteres.');
    const reused = url ? Object.values(graph.entities.evidence || {}).find(record =>
      (!record.serviceId || record.serviceId === graph.service.id) && personaSourceUrl(record.sourceName || record.sourceUrl) === url) : undefined;
    const record: GraphEntity = reused || {
      ...createDiscoveryEntity({ graph, kind: change.kind, title, relatedIds: [personaId], now, id: change.id,
        ...(url ? { sourceType: 'document', confidence: 'low' } : {}) }),
      ...(url ? { sourceName: url } : {}),
    };
    if (!reused) next = { ...graph, entities: { ...graph.entities, [change.kind]: { ...graph.entities[change.kind], [record.id]: record } } };
    ids.push(record.id);
  } else {
    const kinds: PersonaRelationKind[] = ['pain', 'need', 'job', 'problemHypothesis', 'evidence'];
    const record = kinds.map(kind => graph.entities[kind]?.[change.id]).find(Boolean);
    if (!record || record.serviceId && record.serviceId !== graph.service.id) throw new Error('Este registro não está disponível no serviço.');
    ids = change.type === 'link' ? [...ids, change.id] : ids.filter(id => id !== change.id);
    if (change.type === 'unlink') profile = { ...draft, evidenceClaims: normalizePersonaEvidenceClaims(draft.evidenceClaims)
      .map(claim => ({ ...claim, evidenceIds: claim.evidenceIds.filter(id => id !== change.id) })).filter(claim => claim.evidenceIds.length) };
  }
  return updatePersonaProfile({ graph: next, personaId, draft: profile, connectedIds: [...new Set(ids)], now });
}

/** Distinct maps, including references through cards/stages, from the shared index. */
export function personaEcosystemMaps(graph: ServiceGraph, personaId: string) {
  const index = serviceModelIndex(graph), key = `persona:${personaId}`;
  const maps = new Map<string, { id: string; kind: 'journey' | 'blueprint' | 'whiteboard'; title: string }>();
  for (const journey of Object.values(graph.journeys)) {
    if (journey.serviceId && journey.serviceId !== graph.service.id) continue;
    const inCards = Object.values(journey.matrixContent?.cells || {}).some(rows => Object.values(rows).some(blocks =>
      blocks.some(block => block.type === 'persona' && block.referenceId === personaId || block.personaIds?.includes(personaId))));
    if (journey.personaId === personaId || inCards) maps.set(`journey:${journey.id}`, { id: journey.id, kind: 'journey', title: journey.name });
  }
  for (const relation of relationsFor(index, 'persona', personaId)) {
    const node = index.nodes[relation.fromKey === key ? relation.toKey : relation.fromKey];
    if (!node || !['journey', 'blueprint', 'whiteboard', 'stage'].includes(node.kind)) continue;
    const board = node.kind !== 'journey' ? graph.views.whiteboards[node.id] : undefined;
    const journey = graph.journeys[board?.journeyId || (node.kind === 'stage' ? graph.stages[node.id]?.journeyId : node.kind === 'journey' ? node.id : '') || ''];
    if (journey?.serviceId && journey.serviceId !== graph.service.id) continue;
    if (journey) maps.set(`journey:${journey.id}`, { id: journey.id, kind: 'journey', title: journey.name || node.label });
    else if (node.kind !== 'stage') maps.set(node.key, { id: node.id, kind: node.kind as 'blueprint' | 'whiteboard', title: node.label });
  }
  return [...maps.values()];
}

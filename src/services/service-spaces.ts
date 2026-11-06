import type { JourneyMatrixBlock, ServiceGraph } from '../domain/model';
import { spatialWorkspaceSchema } from '../domain/spatial-design-schema.ts';
import { validateDocument } from '../integrations/blue-ocean3d/app/core.mjs';
import { reconcileFloorplan, furnitureDimensions, occupied } from '../integrations/blue-ocean3d/app/floorplan.mjs';
import { objectCrossesStructure } from '../integrations/blue-ocean3d/app/floorplan-navigation.mjs';

export const SERVICE_SPACE = 'service-space';
export type SpaceNode = {
  id: string; type: string; lane: string; stage: number; x: number; y: number; title: string;
  owner: string; team: string; duration: number; description: string; environmentId?: string;
  [key: string]: unknown;
};
export type SpaceDocument = {
  schema: 1; id: string; name: string; description: string; createdAt: string; updatedAt: string;
  stages: { id: string; name: string }[]; nodes: SpaceNode[];
  edges: { id: string; from: string; to: string; type: string; label: string }[];
  environments: import('../domain/spatial-design-schema').SpatialWorkspace['environments'];
  floorplan: import('../domain/spatial-design-schema').SpatialWorkspace['floorplan']; roomTemplates: never[];
};
const copy = <T,>(value: T): T => structuredClone(value);
const nodeType = (block: JourneyMatrixBlock, row: string): string => {
  const kind = block.canvas?.kind;
  if (kind === 'customer-action' || kind === 'touchpoint' || kind === 'channel' || block.type === 'channel') return 'touchpoint';
  if (kind === 'artifact' || block.type === 'evidence') return 'evidence';
  if (kind && ['decision', 'system', 'resource', 'metric'].includes(kind)) return kind;
  if (block.type === 'metric') return 'metric';
  if (block.activity?.category === 'resource') return 'resource';
  return ({ ac: 'touchpoint', ev: 'evidence', ch: 'touchpoint', sy: 'system', ki: 'metric' } as Record<string, string>)[row] ?? 'activity';
};
const lanes: Record<string, string> = { activity: 'front', decision: 'back', resource: 'support', system: 'support', metric: 'support', evidence: 'evidence', touchpoint: 'customer' };
export function projectServiceSpaces(graph: ServiceGraph, mapId: string): SpaceDocument {
  if (graph.service.spatialDesign && graph.service.spatialDesign.serviceId !== graph.service.id) throw new Error('Os ambientes deste backup pertencem a outro serviço. Revise o arquivo antes de continuar.');
  const journey = graph.journeys[mapId];
  if (mapId !== SERVICE_SPACE && (!journey || journey.serviceId !== graph.service.id)) throw new Error('Mapa indisponível neste serviço.');
  const saved = graph.service.spatialDesign?.serviceId === graph.service.id ? graph.service.spatialDesign.workspaces[mapId] : undefined;
  const stages = journey?.stageIds.map(id => ({ id, name: graph.stages[id]?.title || 'Etapa' })) ?? [];
  if (stages.length > 24) throw new Error('Este mapa tem mais de 24 etapas. Divida-o em mapas menores para organizar as salas.');
  const nodes: SpaceNode[] = [];
  const seen = new Set<string>();
  journey?.stageIds.forEach((stageId, stage) => {
    for (const [row, blocks] of Object.entries(journey.matrixContent?.cells[stageId] ?? {})) {
      for (const block of blocks) {
        if (seen.has(block.id)) throw new Error('O mapa possui IDs de atividades duplicados. Revise o mapa antes de abrir as salas.');
        seen.add(block.id);
        // Only operational map objects are projected. Personas, notes and evidence stay in their native maps.
        if (!block.activity && !['ac', 'ev', 'fl', 'bk', 'sy', 'ch', 'ki'].includes(row) && !['activity', 'customer-action', 'touchpoint', 'artifact', 'decision', 'system', 'resource', 'metric', 'channel'].includes(block.canvas?.kind ?? '')) continue;
        const type = nodeType(block, row), lane = row === 'bk' && type === 'activity' ? 'back' : lanes[type];
        nodes.push({ id: block.id, type, lane, stage, x: 255 + stage * 380, y: 195 + ['evidence', 'customer', 'front', 'back', 'support'].indexOf(lane) * 300,
          title: block.text || 'Atividade sem título', description: block.canvas?.description || '',
          owner: block.activity?.owner || '', team: block.activity?.team || '', duration: block.activity?.durationMinutes ?? 0,
          cost: 0, capacity: 0, channel: '', resourceNotes: block.activity?.resourceNotes || '', rules: block.activity?.rule || '', metric: '', status: 'draft', tags: [],
          ...(saved?.assignments[block.id] ? { environmentId: saved.assignments[block.id] } : {}),
        });
      }
    }
  });
  if (nodes.length > 600) throw new Error('Este mapa tem mais de 600 componentes operacionais. Divida-o em mapas menores.');
  const ids = new Map(nodes.map(node => [node.id, node]));
  const edges: SpaceDocument['edges'] = [];
  const signatures = new Set<string>();
  for (const connection of journey?.matrixContent?.connections ?? []) {
    const from = ids.get(connection.a), to = ids.get(connection.b);
    if (!from || !to || from.id === to.id) continue;
    // Resource and handoff restrictions differ between the two editors; retain a dependency for spatial routing.
    let type: string = connection.type === 'uses' ? 'resource' : connection.type;
    if (type === 'resource' && !['resource', 'system'].includes(to.type)) type = 'sequence';
    if (type === 'handoff' && (!from.team || !to.team || from.team === to.team || !connection.label.trim())) type = 'sequence';
    if (type === 'dependency') type = 'sequence';
    const signature = JSON.stringify([from.id, to.id, type]);
    if (signatures.has(signature)) continue;
    signatures.add(signature); edges.push({ id: connection.id, from: from.id, to: to.id, type, label: connection.label });
  }
  if (edges.length > 1500) throw new Error('Este mapa tem mais de 1500 conexões operacionais. Divida-o em mapas menores.');
  const document: SpaceDocument = { schema: 1, id: mapId, name: journey?.name || graph.service.name, description: graph.service.description,
    createdAt: graph.service.createdAt, updatedAt: saved?.updatedAt || graph.service.createdAt,
    stages: stages.length ? stages : [{ id: SERVICE_SPACE, name: 'Serviço' }], nodes, edges,
    environments: copy(saved?.environments ?? []), floorplan: copy(saved?.floorplan ?? { version: 1, objects: [] }), roomTemplates: [],
  };
  reconcileFloorplan(document); // Drops furniture links to activities removed from the native map.
  validateDocument(document);
  return document;
}

// Exact serialized snapshots also detect source-map edits before React has rendered them.
export const spaceVersion = (document: SpaceDocument): string => JSON.stringify(document);
export function applyServiceSpaces(graph: ServiceGraph, serviceId: string, mapId: string, baseVersion: string, input: unknown, timestamp = new Date().toISOString()): ServiceGraph {
  if (graph.service.id !== serviceId) throw new Error('O serviço aberto mudou. Reabra as salas.');
  const current = projectServiceSpaces(graph, mapId);
  if (spaceVersion(current) !== baseVersion) throw new Error('O mapa ou as salas mudaram. A versão atual foi recarregada; refaça esta alteração.');
  if (!input || typeof input !== 'object' || JSON.stringify(input).length > 6_000_000) throw new Error('Dados espaciais inválidos ou muito grandes.');
  const document = input as SpaceDocument;
  validateDocument(document);
  if (document.id !== mapId) throw new Error('As salas pertencem a outro mapa.');
  const business = (doc: SpaceDocument) => JSON.stringify({ stages: doc.stages, edges: doc.edges, nodes: doc.nodes.map(({ environmentId: _room, ...node }) => node) });
  if (business(document) !== business(current)) throw new Error('Edite as atividades e conexões no mapa do serviço.');
  const assignments = Object.fromEntries(document.nodes.filter(node => node.environmentId).map(node => [node.id, node.environmentId!])) as Record<string, string>;
  const previous = graph.service.spatialDesign;
  const workspace = spatialWorkspaceSchema.parse({ ...(previous?.workspaces[mapId] ?? {}), version: 1,
    revision: (previous?.workspaces[mapId]?.revision ?? 0) + 1, updatedAt: timestamp,
    environments: document.environments, assignments, floorplan: document.floorplan,
  });
  for (const [index, object] of workspace.floorplan.objects.entries()) {
    const [width, height] = furnitureDimensions(object);
    if (object.x + width > 12 || object.y + height > 8) throw new Error('Um móvel ultrapassa os limites da sala.');
    if (object.nodeId && assignments[object.nodeId] !== object.roomId) throw new Error('O móvel deve referenciar uma atividade da mesma sala.');
    if (workspace.floorplan.objects.slice(index + 1).some(other => object.roomId === other.roomId && occupied(object, other))) throw new Error('Dois móveis ocupam o mesmo espaço.');
    if (objectCrossesStructure(document, object)) throw new Error('Um móvel atravessa uma parede ou porta.');
  }
  const next = copy(graph);
  next.service.spatialDesign = { ...previous, version: 1, serviceId, workspaces: { ...previous?.workspaces, [mapId]: workspace } };
  next.service.updatedAt = workspace.updatedAt;
  return next;
}

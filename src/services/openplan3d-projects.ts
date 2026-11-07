import type { ServiceGraph } from '../domain/model';

export const OPENPLAN_CHANNEL = 'blue-ocean-openplan3d/v1';
export type OpenPlanProject = {
  id: string;
  name: string;
  activeFloorId: string;
  floors: Array<{ id: string; walls: unknown[]; [key: string]: unknown }>;
  [key: string]: unknown;
};
export type StoredOpenPlanProject = { version: 1; revision: number; updatedAt: string; project: OpenPlanProject };

const sizeOf = (value: unknown) => JSON.stringify(value).length;
const clone = <T,>(value: T): T => structuredClone(value);
export const cadScopeId = (serviceId: string, mapId: string) => 'bo-cad:' + encodeURIComponent(serviceId) + ':' + encodeURIComponent(mapId);

export function cadEntry(graph: ServiceGraph, mapId: string): StoredOpenPlanProject | null {
  const state = graph.service.cadPlans;
  if (!state || state.serviceId !== graph.service.id) return null;
  return (state.plans[mapId] as StoredOpenPlanProject | undefined) ?? null;
}

export const cadVersion = (graph: ServiceGraph, mapId: string) => JSON.stringify(cadEntry(graph, mapId)?.project ?? null);

export function validateCadProject(value: unknown, expectedId: string): OpenPlanProject {
  if (!value || typeof value !== 'object' || Array.isArray(value) || sizeOf(value) > 3_000_000) throw new Error('Planta CAD inválida ou muito grande (limite 3 MB).');
  const plan = value as Record<string, unknown>;
  if (plan.id !== expectedId || typeof plan.name !== 'string' || plan.name.length > 200) throw new Error('A planta não pertence ao projeto atual.');
  if (!Array.isArray(plan.floors) || !plan.floors.length || plan.floors.length > 12) throw new Error('Quantidade de pavimentos inválida.');
  if (typeof plan.activeFloorId !== 'string' || !plan.floors.some((floor: {id?: unknown}) => floor?.id === plan.activeFloorId)) throw new Error('Pavimento ativo inválido.');
  const allIds = new Set<string>();
  for (const floor of plan.floors) {
    if (!floor || typeof floor !== 'object' || Array.isArray(floor) || typeof floor.id !== 'string' || !floor.id || allIds.has(floor.id)) throw new Error('Pavimento CAD inválido ou duplicado.');
    allIds.add(floor.id);
    if (!Array.isArray(floor.walls) || floor.walls.length > 10000) throw new Error('Número de paredes inválido.');
    for (const key of ['doors', 'windows', 'furniture', 'stairs', 'columns'] as const) {
      if (key in floor && (!Array.isArray(floor[key]) || floor[key].length > 10000)) throw new Error('Elementos CAD inválidos.');
    }
  }
  return clone(value as OpenPlanProject);
}

export function applyCadChange(graph: ServiceGraph, serviceId: string, mapId: string, baseVersion: string, project: unknown, date = new Date().toISOString()): ServiceGraph {
  if (graph.service.id !== serviceId) throw new Error('O projeto do serviço mudou. Reabra o editor CAD.');
  if (mapId !== 'service-space' && graph.journeys[mapId]?.serviceId !== serviceId) throw new Error('O mapa selecionado não pertence ao serviço.');
  if (cadVersion(graph, mapId) !== baseVersion) throw new Error('A planta mudou em outra sessão. Recarregue antes de continuar.');
  const validated = validateCadProject(project, cadScopeId(serviceId, mapId));
  const previous = graph.service.cadPlans;
  const current = cadEntry(graph, mapId);
  const changed = clone(graph);
  changed.service.cadPlans = {
    version: 1,
    serviceId,
    plans: { ...previous?.plans, [mapId]: { version: 1, revision: (current?.revision ?? 0) + 1, updatedAt: date, project: validated } },
  };
  changed.service.updatedAt = date;
  return changed;
}

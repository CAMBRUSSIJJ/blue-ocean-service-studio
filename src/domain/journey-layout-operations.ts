import type { JourneyLane, JourneyLaneType, JourneyMapLayout, ServiceGraph } from './model';

export const JOURNEY_LANE_LABELS: Record<JourneyLaneType, string> = {
  text: 'Texto', image: 'Imagem', stage: 'Subetapas', icons: 'Ícones',
  grid: 'Lista de verificação', divider: 'Divisor', emotion: 'Emoções', metric: 'Métricas', embed: 'Link de referência',
};

/** Apply against the latest graph, preserving settings and unrelated journeys. */
export function updateJourneyLayout(
  graph: ServiceGraph, journeyId: string,
  update: (layout: JourneyMapLayout) => JourneyMapLayout,
  now = new Date().toISOString(),
): ServiceGraph {
  const journey = graph.journeys[journeyId];
  if (!journey) return graph;
  const previous = journey.mapLayout ?? { version: 1 as const, lanes: [] };
  const next = update(previous);
  if (next === previous) return graph;
  return { ...graph, journeys: { ...graph.journeys, [journeyId]: { ...journey, mapLayout: next, updatedAt: now } },
    service: { ...graph.service, updatedAt: now } };
}

export function reorderJourneyLane(lanes: JourneyLane[], laneId: string, direction: -1 | 1): JourneyLane[] {
  const index = lanes.findIndex(lane => lane.id === laneId), target = index + direction;
  if (index < 0 || target < 0 || target >= lanes.length) return lanes;
  const next = [...lanes];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Duplicate visual content with fresh identities; canonical bindings stay shared. */
export function duplicateJourneyLane(lanes: JourneyLane[], laneId: string, id: (kind: string) => string): JourneyLane[] {
  const index = lanes.findIndex(lane => lane.id === laneId);
  if (index < 0) return lanes;
  const source = lanes[index], duplicate = structuredClone(source), names = new Set(lanes.map(lane => lane.label));
  let label = `${source.label} · cópia`, number = 2;
  while (names.has(label)) label = `${source.label} · cópia ${number++}`;
  duplicate.id = id('lane'); duplicate.label = label; duplicate.hidden = false;
  if (duplicate.cardItems) for (const cards of Object.values(duplicate.cardItems)) for (const card of cards) card.id = id('card');
  return [...lanes.slice(0, index + 1), duplicate, ...lanes.slice(index + 1)];
}

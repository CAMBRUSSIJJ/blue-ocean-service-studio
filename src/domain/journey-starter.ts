import type { JourneyLane, ServiceGraph, Stage } from './model';

/** Add an editable starting structure in one transaction, preserving existing work. */
export function applyJourneyStarter(graph: ServiceGraph, journeyId: string, id: (kind: string) => string, now = new Date().toISOString()): ServiceGraph {
  const journey = graph.journeys[journeyId];
  if (!journey) return graph;
  const stages = { ...graph.stages }, stageIds = [...journey.stageIds];
  if (!stageIds.length) for (const title of ['Antes', 'Durante', 'Depois']) {
    const stageId = id('stage');
    stages[stageId] = { id: stageId, journeyId, title, customerAction: '', emotion: 'neutral', thoughts: '', needIds: [], touchpointIds: [], validatedProblemIds: [], evidenceIds: [], problemIds: [], opportunityIds: [] } satisfies Stage;
    stageIds.push(stageId);
  }
  const lanes = [...(journey.mapLayout?.lanes ?? [])];
  const essentials: Array<Pick<JourneyLane, 'type' | 'binding' | 'label' | 'tone'>> = [
    { type: 'text', binding: 'customerAction', label: 'Ações do cliente', tone: 'blue' },
    { type: 'text', binding: 'thoughts', label: 'Pensamentos', tone: 'amber' },
    { type: 'emotion', label: 'Emoções', tone: 'rose' },
  ];
  for (const entry of essentials) {
    const index = lanes.findIndex(lane => entry.binding ? lane.binding === entry.binding : lane.type === 'emotion');
    if (index < 0) lanes.push({ ...entry, id: id('lane'), cards: {}, height: entry.type === 'emotion' ? 132 : 164 });
    else if (lanes[index].hidden) lanes[index] = { ...lanes[index], hidden: false };
  }
  return { ...graph, stages, journeys: { ...graph.journeys, [journeyId]: { ...journey, stageIds, updatedAt: now, mapLayout: { ...journey.mapLayout, version: 1, lanes, introDismissed: true } } }, service: { ...graph.service, updatedAt: now } };
}

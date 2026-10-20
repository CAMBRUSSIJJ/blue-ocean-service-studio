import assert from 'node:assert/strict';
import { duplicateJourneyLane, reorderJourneyLane, updateJourneyLayout } from '../src/domain/journey-layout-operations.ts';
import { cardsInCell, setCellCards, duplicateCellCard } from '../src/domain/journey-card-operations.ts';
import { prepareJourneyBlueprintDraft } from '../src/services/journey-map-studio.ts';
import { journeyPreviewSrc } from '../src/services/journey-preview.ts';

const lane = { id: 'lane-a', type: 'grid', label: 'Checklist', height: 240, tone: 'blue', hidden: true,
  cards: { stage: 'Primeiro item' }, cardItems: { stage: [{ id: 'card-a', content: 'Primeiro item', checked: true, icon: '✅' }] } };
const lanes = [lane, { id: 'lane-b', type: 'text', label: 'Anotações', cards: {} }];
const before = structuredClone(lanes);
let serial = 0;
const duplicated = duplicateJourneyLane(lanes, 'lane-a', kind => `${kind}-${++serial}`);
assert.deepEqual(lanes, before, 'Duplicating must never mutate source content');
assert.equal(duplicated.length, 3);
assert.equal(duplicated[1].hidden, false);
assert.equal(duplicated[1].height, 240);
assert.equal(duplicated[1].tone, 'blue');
assert.equal(duplicated[1].label, 'Checklist · cópia');
assert.notEqual(duplicated[1].id, lane.id);
assert.notEqual(duplicated[1].cardItems.stage[0].id, 'card-a');
assert.deepEqual({ ...duplicated[1].cardItems.stage[0], id: 'card-a' }, lane.cardItems.stage[0]);
duplicated[1].cardItems.stage[0].content = 'Cópia editada';
assert.equal(lane.cardItems.stage[0].content, 'Primeiro item', 'A copied card is independent');
const again = duplicateJourneyLane(duplicated, 'lane-a', kind => `${kind}-${++serial}`);
assert.equal(again[1].label, 'Checklist · cópia 2');
assert.equal(duplicateJourneyLane(lanes, 'missing', () => 'unused'), lanes);
assert.equal(reorderJourneyLane(lanes, 'lane-a', -1), lanes);
assert.deepEqual(reorderJourneyLane(lanes, 'lane-a', 1).map(item => item.id), ['lane-b', 'lane-a']);
assert.deepEqual(lanes, before);

const graph = { service: { id: 'service' }, journeys: {
  journey: { id: 'journey', mapLayout: { version: 1, stageWidth: 360, lanes } },
  other: { id: 'other', name: 'Outra jornada' },
} };
const changed = updateJourneyLayout(graph, 'journey', layout => ({ ...layout, lanes: layout.lanes.map(item => item.id === lane.id ? { ...item, label: 'Revisão' } : item) }));
assert.equal(changed.journeys.journey.mapLayout.stageWidth, 360, 'Editing lanes preserves layout settings');
assert.equal(changed.journeys.other, graph.journeys.other, 'Other journeys remain untouched');
assert.equal(graph.journeys.journey.mapLayout.lanes[0].label, 'Checklist');
const latest = updateJourneyLayout(changed, 'journey', layout => ({ ...layout, stageWidth: 440 }));
assert.equal(latest.journeys.journey.mapLayout.lanes[0].label, 'Revisão', 'A later update retains preceding edits');
assert.equal(updateJourneyLayout(graph, 'missing', () => { throw Error('must not run'); }), graph);
assert.equal(updateJourneyLayout(graph, 'journey', layout => layout), graph);
assert.equal(duplicateCellCard(lane, 'stage', 'card-a', 'card-copy').cardItems.stage[1].checked, true);
assert.equal(setCellCards(lane, 'stage', cardsInCell(lane, 'stage')).cardItems.stage[0].icon, '✅');
console.log('PASS: Journey layout — copy isolation, fresh card IDs, ordering, latest-state updates and settings retention');

const service = { service: { id: 'service' }, stages: { stage: { id: 'stage', customerAction: 'Pedir ajuda' } },
  journeys: { journey: { id: 'journey', name: 'Suporte', stageIds: ['stage'], mapLayout: { version: 1, lanes },
    designContext: { personaIds: ['persona'], problemIds: [], evidenceIds: [], needIds: [] } }, empty: { id: 'empty', stageIds: [] } },
  views: { whiteboards: {} }, entities: { persona: { persona: { id: 'persona', name: 'Cliente' } } } };
const snapshot = structuredClone(service);
assert.equal(prepareJourneyBlueprintDraft(service, 'missing').graph, service);
assert.equal(prepareJourneyBlueprintDraft(service, 'empty').boardId, null);
const draft = prepareJourneyBlueprintDraft(service, 'journey', { id: 'blueprint', now: '2026-10-20T12:00:00Z' });
assert.equal(draft.created, true);
assert.equal(draft.graph.views.whiteboards.blueprint.journeyId, 'journey');
assert.deepEqual(draft.graph.views.whiteboards.blueprint.items, {});
assert.equal(draft.graph.journeys.journey, service.journeys.journey, 'The draft shares stages without rewriting the source Journey');
assert.equal(draft.graph.entities, service.entities, 'Opening a draft never fabricates service or research records');
assert.deepEqual(service, snapshot);
const reopened = prepareJourneyBlueprintDraft(draft.graph, 'journey', { id: 'another-board' });
assert.equal(reopened.created, false);
assert.equal(reopened.boardId, 'blueprint', 'Reopening the draft reuses the existing Blueprint');
const occupied = { ...service, views: { whiteboards: { taken: { id: 'taken', viewKind: 'whiteboard' } } } };
assert.equal(prepareJourneyBlueprintDraft(occupied, 'journey', { id: 'taken' }).graph, occupied, 'A supplied ID cannot overwrite another board');
console.log('PASS: Journey → Blueprint draft — shared identity, reuse, no fabricated data, empty Journey and ID collision');
const previewGraph = { stages: { stage: { id: 'stage', title: 'Pedido <script>', emotion: 'neutral' } } };
const previewJourney = { stageIds: ['stage'], mapLayout: { lanes: [{ ...lane, label: 'Cliente & equipe', hidden: false }] } };
const svg = decodeURIComponent(journeyPreviewSrc(previewJourney, previewGraph).split(',')[1]);
assert.ok(svg.includes('Pedido &lt;script&gt;'));
assert.ok(svg.includes('Cliente &amp; equipe'));
assert.ok(!svg.includes('<script>'));
assert.notEqual(journeyPreviewSrc(previewJourney, previewGraph), journeyPreviewSrc({ stageIds: [] }, previewGraph));
assert.equal(journeyPreviewSrc({ ...previewJourney, coverImage: 'data:image/png;base64,YQ==' }, previewGraph), 'data:image/png;base64,YQ==');
console.log('PASS: Journey previews — actual stages, empty map, custom cover and escaped labels');

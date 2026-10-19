/** H17.0.9: pure, backwards-compatible operations for free-form Journey cards.
 * Legacy lane.cards remains readable; no eager migration or entity deletion.
 */
import type { JourneyLane, JourneyCard } from './model';

export function cardsInCell(lane: JourneyLane, stageId: string): JourneyCard[] {
  if (lane.cardItems && Object.prototype.hasOwnProperty.call(lane.cardItems, stageId)) {
    return lane.cardItems[stageId] ?? [];
  }
  const legacy = lane.cards?.[stageId];
  return legacy ? [{ id: `legacy:${lane.id}:${stageId}`, content: legacy }] : [];
}

export function setCellCards(lane: JourneyLane, stageId: string, next: JourneyCard[]): JourneyLane {
  return {
    ...lane,
    cardItems: { ...lane.cardItems, [stageId]: next.map((card) => ({ ...card })) },
    // Prevent old text-only clients from showing a stale value after a change.
    cards: { ...lane.cards, [stageId]: next.map((card) => card.content).join('\n') },
  };
}

export function addCellCard(lane: JourneyLane, stageId: string, id: string): JourneyLane {
  return setCellCards(lane, stageId, [...cardsInCell(lane, stageId), { id, content: '' }]);
}

export function editCellCard(lane: JourneyLane, stageId: string, cardId: string, content: string): JourneyLane {
  return setCellCards(lane, stageId, cardsInCell(lane, stageId).map((card) => card.id === cardId ? { ...card, content } : card));
}

export function removeCellCard(lane: JourneyLane, stageId: string, cardId: string): JourneyLane {
  return setCellCards(lane, stageId, cardsInCell(lane, stageId).filter((card) => card.id !== cardId));
}


/** Move a free card between cells, or to another position within one cell.
 * Rejects invalid sources and ID collisions; never mutates its input lanes.
 */
export function moveJourneyCard(
  lanes: JourneyLane[], sourceLaneId: string, sourceStageId: string,
  cardId: string, targetLaneId: string, targetStageId: string, targetIndex?: number,
): JourneyLane[] {
  const source = lanes.find(lane => lane.id === sourceLaneId);
  const destination = lanes.find(lane => lane.id === targetLaneId);
  if (!source || !destination || source.binding || destination.binding ||
      ['divider', 'emotion', 'image', 'embed'].includes(source.type) ||
      ['divider', 'emotion', 'image', 'embed'].includes(destination.type)) return lanes;
  const before = cardsInCell(source, sourceStageId);
  const index = before.findIndex(card => card.id === cardId);
  if (index === -1) return lanes;
  const selected = before[index];
  const sameCell = sourceLaneId === targetLaneId && sourceStageId === targetStageId;
  const nextSource = before.filter(card => card.id !== cardId);
  const targetCards = sameCell ? nextSource : cardsInCell(destination, targetStageId);
  if (!sameCell && targetCards.some(card => card.id === cardId)) return lanes;
  const position = targetIndex === undefined ? targetCards.length :
    Math.max(0, Math.min(targetCards.length, Math.trunc(targetIndex)));
  const nextTarget = [...targetCards];
  nextTarget.splice(position, 0, selected);
  return lanes.map(lane => {
    if (lane.id === sourceLaneId && lane.id === targetLaneId) {
      return sameCell ? setCellCards(lane, sourceStageId, nextTarget) :
        setCellCards(setCellCards(lane, sourceStageId, nextSource), targetStageId, nextTarget);
    }
    if (lane.id === sourceLaneId) return setCellCards(lane, sourceStageId, nextSource);
    if (lane.id === targetLaneId) return setCellCards(lane, targetStageId, nextTarget);
    return lane;
  });
}

/** Duplicate a card with a fresh stable ID directly after its source. */
export function duplicateCellCard(lane: JourneyLane, stageId: string, cardId: string, newId: string): JourneyLane {
  const cards = cardsInCell(lane, stageId);
  if (cards.some(card => card.id === newId)) return lane;
  const at = cards.findIndex(card => card.id === cardId);
  if (at < 0) return lane;
  const next = [...cards];
  next.splice(at + 1, 0, { ...cards[at], id: newId });
  return setCellCards(lane, stageId, next);
}

/** Markdown formatting, preserving selection and plain-text backwards compatibility. */
export function formatCardText(content: string, start: number, end: number, kind: 'bold' | 'italic' | 'list' | 'link') {
  const a = Math.max(0, Math.min(content.length, start));
  const b = Math.max(a, Math.min(content.length, end));
  const selected = content.slice(a, b);
  let replacement: string;
  switch (kind) {
    case 'bold': replacement = `**${selected || 'texto'}**`; break;
    case 'italic': replacement = `*${selected || 'texto'}*`; break;
    case 'list': replacement = selected.split('\n').map(line => `- ${line}`).join('\n') || '- Item'; break;
    case 'link': replacement = `[${selected || 'link'}](https://)`; break;
  }
  return { content: content.slice(0, a) + replacement + content.slice(b), start: a, end: a + replacement.length };
}

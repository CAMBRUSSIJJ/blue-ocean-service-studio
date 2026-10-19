import type { ServiceGraph } from '../domain/model';
import { pruneDanglingBoardReferences } from '../services/whiteboard-contract';

export type GraphHistory = { past: ServiceGraph[]; present: ServiceGraph; future: ServiceGraph[]; lastTag?: string; lastEditAt?: number };
export const initialHistory = (graph: ServiceGraph): GraphHistory => ({ past: [], present: graph, future: [] });

export function commitHistory(current: GraphHistory, updater: (graph: ServiceGraph) => ServiceGraph, tag?: string): GraphHistory {
  const next = pruneDanglingBoardReferences(updater(current.present));
  if (next === current.present) return current;
  const editedAt = Date.now();
  const grouped = Boolean(tag && current.lastTag === tag && editedAt - (current.lastEditAt ?? 0) < 850);
  return { past: grouped ? current.past : [...current.past, current.present].slice(-80), present: next, future: [], lastTag: tag, lastEditAt: editedAt };
}

export const undoHistory = (current: GraphHistory): GraphHistory => current.past.length ? {
  past: current.past.slice(0, -1), present: current.past[current.past.length - 1], future: [current.present, ...current.future].slice(0, 80),
} : current;

export const redoHistory = (current: GraphHistory): GraphHistory => current.future.length ? {
  past: [...current.past, current.present].slice(-80), present: current.future[0], future: current.future.slice(1),
} : current;

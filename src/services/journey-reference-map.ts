import type { Journey, ServiceGraph, Stage } from '../domain/model';

export type ReferenceNote = { i: string; t: string; hostEntityId?: string };
export type ReferenceIssue = {
  s: number; t: 'd' | 'i'; x: string; v: number; d: number;
  hostEntityId?: string; hostLocalId?: string;
};
export type JourneyReferenceDocument = {
  id: string; title: string; persona: string; guide: number; start: number;
  steps: Array<{ n: string; e: number; d: string; hostStageId?: string; hostLocalId?: string }>;
  c: Record<string, ReferenceNote[]>; iss: ReferenceIssue[];
  lanes: Array<{ id: string; n: string }>; links: Array<{ a: string; b: string }>;
};
export type JourneyReferenceStorage = {
  version: 1; persona: string;
  cells: Record<string, ReferenceNote[]>;
  issues: Array<Omit<ReferenceIssue, 's'> & { stageId: string }>;
  lanes: JourneyReferenceDocument['lanes']; links: JourneyReferenceDocument['links'];
  hiddenIssueIds?: string[];
};
type ExtendedJourney = Journey & { referenceCanvas?: JourneyReferenceStorage };
const id = (kind: string) => kind + '-' + crypto.randomUUID();
const text = (value: unknown, max = 1000) => String(value ?? '').trim().slice(0, max);
const limit = (v: unknown, low: number, high: number) => Math.max(low, Math.min(high, Number(v) || 0));
const clone = <T>(v: T): T => structuredClone(v);

export function hydrateJourneyReference(graph: ServiceGraph, journeyId: string): JourneyReferenceDocument {
  const journey = graph.journeys[journeyId] as ExtendedJourney | undefined;
  if (!journey) throw new Error('Jornada não localizada');
  const stages = journey.stageIds.map(sid => graph.stages[sid]).filter((s): s is Stage => Boolean(s) && !s.archived);
  const ref = journey.referenceCanvas;
  const c: JourneyReferenceDocument['c'] = {};
  stages.forEach((stage, index) => {
    for (const [key, notes] of Object.entries(ref?.cells || {})) {
      const split = key.lastIndexOf('|');
      if (split < 1 || key.slice(split + 1) !== stage.id || !Array.isArray(notes)) continue;
      c[key.slice(0, split) + '|' + index] = clone(notes);
    }
    if (stage.customerAction) {
      c['ac|' + index] = [{ i: 'customer-' + stage.id, t: stage.customerAction }];
    }
    if (stage.evidenceIds?.length) {
      const existing = c['ev|' + index] || [];
      const seen = new Set(existing.map(note => note.hostEntityId).filter(Boolean));
      for (const eid of stage.evidenceIds) {
        const e = graph.entities.evidence?.[eid];
        if (!e || seen.has(eid)) continue;
        existing.push({ i: 'evidence-' + eid, t: text(e.title || e.description || e.name), hostEntityId: eid });
      }
      if (existing.length) c['ev|' + index] = existing;
    }
  });
  const hidden = new Set(ref?.hiddenIssueIds || []);
  const iss: ReferenceIssue[] = [];
  for (const [idx, stage] of stages.entries()) {
    for (const [kind, ids] of [['d', stage.problemIds], ['i', stage.opportunityIds]] as const) {
      for (const entityId of ids) {
        if (hidden.has(entityId)) continue;
        const entity = kind === 'd' ? graph.problems[entityId] : graph.opportunities[entityId];
        if (!entity) continue;
        const fromRef = ref?.issues.find(issue => issue.hostEntityId === entityId);
        iss.push({
          s: idx, t: kind, x: kind === 'd' ? text(graph.problems[entityId]?.description) : text(graph.opportunities[entityId]?.title),
          v: fromRef?.v ?? 2, d: fromRef?.d ?? 1,
          hostEntityId: entityId, hostLocalId: fromRef?.hostLocalId || entityId,
        });
      }
    }
    for (const issue of ref?.issues || []) {
      if (issue.stageId !== stage.id || issue.hostEntityId && iss.some(x => x.hostEntityId === issue.hostEntityId)) continue;
      iss.push({ ...clone(issue), s: idx });
    }
  }
  return {
    id: 'host', title: journey.name || 'Jornada', persona: ref?.persona || '', guide: 0, start: stages.length ? 0 : 1,
    steps: stages.map(stage => ({
      n: stage.title, e: typeof stage.emotionScore === 'number' ? stage.emotionScore : stage.emotion === 'negative' ? -1 : stage.emotion === 'positive' ? 1 : 0,
      d: stage.thoughts || '', hostStageId: stage.id, hostLocalId: stage.id,
    })),
    c, iss, lanes: clone(ref?.lanes || []), links: clone(ref?.links || []),
  };
}

export function applyJourneyReferencePatch(graph: ServiceGraph, journeyId: string, doc: JourneyReferenceDocument): ServiceGraph {
  const current = graph.journeys[journeyId] as ExtendedJourney | undefined;
  if (!current || !doc || !Array.isArray(doc.steps) || doc.steps.length > 90 || !doc.c || typeof doc.c !== 'object') return graph;
  if (Object.values(doc.c).some(notes => !Array.isArray(notes) || notes.length > 120)) return graph;
  const next = clone(graph), journey = next.journeys[journeyId] as ExtendedJourney, now = new Date().toISOString();
  const idToStage = new Map<string, string>(), previousStageIds = new Set(journey.stageIds), stageIds: string[] = [];
  for (const step of doc.steps) {
    const local = text(step.hostLocalId || step.hostStageId, 100) || id('local');
    const sid = step.hostStageId && next.stages[step.hostStageId]?.journeyId === journeyId ? step.hostStageId
      : journey.stageIds.find(old => (next.stages[old] as Stage & { journeyReferenceLocalId?: string })?.journeyReferenceLocalId === local) || id('stage');
    const st: Stage = next.stages[sid] || {
      id: sid, journeyId, title: '', customerAction: '', emotion: 'neutral' as const,
      touchpointIds: [], problemIds: [], opportunityIds: [], createdAt: now,
    };
    st.title = text(step.n, 240) || 'Etapa sem nome';
    st.thoughts = text(step.d, 1500);
    st.emotionScore = limit(step.e, -2, 2) as Stage['emotionScore'];
    st.emotion = st.emotionScore < 0 ? 'negative' : st.emotionScore > 0 ? 'positive' : 'neutral';
    (st as Stage & { journeyReferenceLocalId?: string }).journeyReferenceLocalId = local;
    st.archived = false; st.updatedAt = now;next.stages[sid] = st;
    idToStage.set(local, sid); stageIds.push(sid);
  }
  for (const sid of previousStageIds) if (!stageIds.includes(sid) && next.stages[sid]) {
    // Protect other modules' data: removing a step from this map archives rather than destroys it.
    next.stages[sid].archived = true;next.stages[sid].updatedAt = now;
  }
  journey.stageIds = stageIds;
  const oldRef = journey.referenceCanvas, cells: JourneyReferenceStorage['cells'] = {};
  for (const [key, notes] of Object.entries(doc.c)) {
    const match = /^([a-z][a-z0-9]*)\|(\d+)$/.exec(key);
    if (!match || !Array.isArray(notes)) continue;
    const idx = Number(match[2]), sid = stageIds[idx], lane = match[1];
    if (!sid) continue;
    const cleaned = notes.slice(0, 120).map(note => ({
      i: text(note.i, 100) || id('note'), t: text(note.t, 1500),
      ...(note.hostEntityId ? { hostEntityId: note.hostEntityId } : {}),
    })).filter(note => note.t);
    cells[lane + '|' + sid] = cleaned;
    if (lane === 'ac') next.stages[sid].customerAction = cleaned.map(note => note.t).join(' · ').slice(0, 1500);
    if (lane === 'ev') {
      const existing = next.stages[sid].evidenceIds || [];
      for (const note of cleaned) {
        const previous = oldRef?.cells?.[lane + '|' + sid]?.find(item => item.i === note.i);
        note.hostEntityId ||= previous?.hostEntityId;
        if (note.hostEntityId && next.entities.evidence?.[note.hostEntityId]) {
          next.entities.evidence[note.hostEntityId].title = note.t; if (!existing.includes(note.hostEntityId)) existing.push(note.hostEntityId);
        } else {
          const eid = id('evidence');next.entities.evidence ||= {};
          next.entities.evidence[eid] = { id: eid, title: note.t, stageId: sid, serviceId: next.service.id, evidencePurpose: 'service' };
          existing.push(eid);note.hostEntityId = eid;
        }
      }
      next.stages[sid].evidenceIds = existing;
    }
  }
  // Emptying a customer's action in the reference should clear the canonical action, not leave stale text.
  for (let i = 0; i < stageIds.length; i++) if (!('ac|' + stageIds[i] in cells)) next.stages[stageIds[i]].customerAction = '';
  const issues: JourneyReferenceStorage['issues'] = [], knownIssueIds = new Set<string>();
  for (const issue of (doc.iss || []).slice(0, 450)) {
    const stageId = stageIds[Number(issue.s)], title = text(issue.x, 1500);
    if (!stageId || !title || !['d', 'i'].includes(issue.t)) continue;
    let entityId = issue.hostEntityId || oldRef?.issues.find(previous => previous.hostLocalId === issue.hostLocalId && previous.t === issue.t)?.hostEntityId;
    if (issue.t === 'd') {
      if (!entityId || !next.problems[entityId]) {
        entityId = id('problem');next.problems[entityId] = {id: entityId, stageId, description: title};
      } else {next.problems[entityId].description = title;next.problems[entityId].stageId = stageId;}
      next.stages[stageId].problemIds ||= [];
      if (!next.stages[stageId].problemIds.includes(entityId)) next.stages[stageId].problemIds.push(entityId);
    } else {
      if (!entityId || !next.opportunities[entityId]) {
        entityId = id('opportunity');next.opportunities[entityId] = {id: entityId, stageId, title, problemIds: [], taskIds: []};
      } else {next.opportunities[entityId].title = title;next.opportunities[entityId].stageId = stageId;}
      next.stages[stageId].opportunityIds ||= [];
      if (!next.stages[stageId].opportunityIds.includes(entityId)) next.stages[stageId].opportunityIds.push(entityId);
    }
    knownIssueIds.add(entityId);
    issues.push({ t: issue.t, x: title, stageId, hostEntityId: entityId,
      hostLocalId: issue.hostLocalId || entityId, v: limit(issue.v, 0, 3), d: limit(issue.d, 0, 4) });
  }
  const removedCanonical = stageIds.flatMap(sid => [
    ...(next.stages[sid].problemIds || []), ...(next.stages[sid].opportunityIds || []),
  ]).filter(eid => !knownIssueIds.has(eid));
  const hiddenIssueIds = [...new Set([
    ...removedCanonical,
    ...(oldRef?.hiddenIssueIds || []),
    ...(oldRef?.issues || []).map(issue => issue.hostEntityId).filter((eid): eid is string => Boolean(eid) && !knownIssueIds.has(eid)),
  ])].filter(eid => !knownIssueIds.has(eid));
  journey.name = text(doc.title, 240) || journey.name;
  journey.referenceCanvas = {
    version: 1, persona: text(doc.persona, 400), cells, issues,
    lanes: (doc.lanes || []).filter(lane => /^x[a-z0-9]{1,12}$/.test(lane.id)).slice(0, 32)
      .map(lane => ({ id: lane.id, n: text(lane.n, 120) })),
    links: (doc.links || []).slice(0, 500).map(link => ({a: text(link.a, 100), b: text(link.b, 100)})),
    hiddenIssueIds,
  };
  journey.updatedAt = now;next.service.updatedAt = now;
  return next;
}

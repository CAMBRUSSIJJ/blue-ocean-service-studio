import type { WorkspaceActivityKind, WorkspacePreferences, WorkspaceReference, WorkspaceTargetType } from './workspace-preferences';

export type ContinueTarget = WorkspaceReference & {
  title: string;
  subtitle: string;
  updatedAt?: string | null;
  lastOpenedAt?: string | null;
  lastEditedAt?: string | null;
  progress?: number;
};

export type ContinueItem = ContinueTarget & {
  activity: WorkspaceActivityKind;
  activityAt: string;
  source: 'tracked' | 'inferred';
};

export type ContinueReport = {
  items: ContinueItem[];
  top: ContinueItem | null;
  historyCount: number;
  orphanedReferences: number;
};

const ACTIVITY_WEIGHT: Record<WorkspaceActivityKind, number> = {
  edited: 5,
  created: 4,
  commented: 3,
  opened: 2,
  navigated: 1,
};

export const workspaceReferenceKey = (type: WorkspaceTargetType, id: string) => `${type}:${id}`;

function validDate(value?: string | null) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : { value, time };
}

function inferredActivity(target: ContinueTarget): Pick<ContinueItem, 'activity' | 'activityAt' | 'source'> | null {
  const edited = validDate(target.lastEditedAt ?? target.updatedAt);
  const opened = validDate(target.lastOpenedAt);
  if (!edited && !opened) return null;
  if (opened && (!edited || opened.time >= edited.time)) return { activity: 'opened', activityAt: opened.value, source: 'inferred' };
  return { activity: 'edited', activityAt: edited!.value, source: 'inferred' };
}

export function buildContinueReport(targets: ContinueTarget[], preferences: WorkspacePreferences, limit = 5): ContinueReport {
  const targetMap = new Map(targets.map((target) => [workspaceReferenceKey(target.targetType, target.targetId), target]));
  const trackedMap = new Map(preferences.recentContexts.map((recent) => [workspaceReferenceKey(recent.targetType, recent.targetId), recent]));
  const items: ContinueItem[] = [];
  let orphanedReferences = 0;

  for (const [key, recent] of trackedMap) {
    const target = targetMap.get(key);
    if (!target) { orphanedReferences += 1; continue; }
    const occurred = validDate(recent.occurredAt);
    if (!occurred) continue;
    items.push({ ...target, activity: recent.activity, activityAt: occurred.value, source: 'tracked' });
  }

  for (const [key, target] of targetMap) {
    if (trackedMap.has(key)) continue;
    const inferred = inferredActivity(target);
    if (inferred) items.push({ ...target, ...inferred });
  }

  items.sort((a, b) => {
    const byTime = Date.parse(b.activityAt) - Date.parse(a.activityAt);
    if (byTime !== 0) return byTime;
    const byActivity = ACTIVITY_WEIGHT[b.activity] - ACTIVITY_WEIGHT[a.activity];
    if (byActivity !== 0) return byActivity;
    return a.title.localeCompare(b.title, 'pt-BR');
  });

  const limited = items.slice(0, Math.max(1, limit));
  return { items: limited, top: limited[0] ?? null, historyCount: items.length, orphanedReferences };
}

export function resolvePreferenceReferences<T extends ContinueTarget>(references: WorkspaceReference[], targets: T[]): T[] {
  const map = new Map(targets.map((target) => [workspaceReferenceKey(target.targetType, target.targetId), target]));
  return references.map((reference) => map.get(workspaceReferenceKey(reference.targetType, reference.targetId))).filter((target): target is T => Boolean(target));
}

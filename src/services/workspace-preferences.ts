export type WorkspaceTargetType = 'journey' | 'blueprint' | 'whiteboard' | 'research' | 'opportunity' | 'initiative' | 'metric';
export type WorkspaceActivityKind = 'opened' | 'edited' | 'created' | 'commented' | 'navigated';

export type WorkspacePreferenceScope = {
  userId: string;
  workspaceId: string;
};

export type WorkspaceReference = {
  targetId: string;
  targetType: WorkspaceTargetType;
  title?: string;
  subtitle?: string;
  destination?: string;
  context?: {
    serviceId?: string;
    journeyId?: string;
    stageId?: string;
  };
};

export type WorkspaceRecentContext = WorkspaceReference & {
  activity: WorkspaceActivityKind;
  occurredAt: string;
};

export type WorkspacePin = WorkspaceReference & {
  order: number;
  pinnedAt: string;
};

export type WorkspacePreferences = {
  version: 1;
  id: string;
  userId: string;
  workspaceId: string;
  favorites: WorkspaceReference[];
  pins: WorkspacePin[];
  recentContexts: WorkspaceRecentContext[];
  updatedAt: string;
};

export type WorkspaceContextEventDetail = WorkspaceReference & {
  workspaceId: string;
  activity: WorkspaceActivityKind;
  occurredAt?: string;
};

export type WorkspacePreferenceEventDetail = WorkspaceReference & {
  workspaceId: string;
  preference: 'favorite' | 'pin';
  enabled: boolean;
};

const DB_NAME = 'blue-ocean-workspace-preferences';
const STORE_NAME = 'preferences';
const CACHE_PREFIX = 'blueocean-workspace-preferences-v1:';
const MAX_RECENT_CONTEXTS = 50;
const IDB_OPEN_TIMEOUT_MS = 1800;
const mutationQueue = new Map<string, Promise<void>>();

const nowIso = () => new Date().toISOString();
const refKey = (ref: Pick<WorkspaceReference, 'targetType' | 'targetId'>) => `${ref.targetType}:${ref.targetId}`;
const cleanText = (value?: string) => value?.trim() || undefined;

export function workspacePreferenceId(scope: WorkspacePreferenceScope) {
  return `${scope.userId}::${scope.workspaceId}`;
}

export function createEmptyWorkspacePreferences(scope: WorkspacePreferenceScope): WorkspacePreferences {
  return {
    version: 1,
    id: workspacePreferenceId(scope),
    userId: scope.userId,
    workspaceId: scope.workspaceId,
    favorites: [],
    pins: [],
    recentContexts: [],
    updatedAt: nowIso(),
  };
}

function normalizeReference(ref: WorkspaceReference): WorkspaceReference {
  return {
    targetId: String(ref.targetId),
    targetType: ref.targetType,
    title: cleanText(ref.title),
    subtitle: cleanText(ref.subtitle),
    destination: cleanText(ref.destination),
    context: ref.context ? {
      serviceId: cleanText(ref.context.serviceId),
      journeyId: cleanText(ref.context.journeyId),
      stageId: cleanText(ref.context.stageId),
    } : undefined,
  };
}

export function normalizeWorkspacePreferences(value: Partial<WorkspacePreferences> | null | undefined, scope: WorkspacePreferenceScope): WorkspacePreferences {
  const base = createEmptyWorkspacePreferences(scope);
  if (!value) return base;
  const favoriteMap = new Map<string, WorkspaceReference>();
  for (const ref of Array.isArray(value.favorites) ? value.favorites : []) favoriteMap.set(refKey(ref), normalizeReference(ref));
  const pinMap = new Map<string, WorkspacePin>();
  for (const pin of Array.isArray(value.pins) ? value.pins : []) {
    const normalized = normalizeReference(pin);
    pinMap.set(refKey(pin), {
      ...normalized,
      order: Number.isFinite(pin.order) ? Math.max(0, Math.floor(pin.order)) : pinMap.size,
      pinnedAt: typeof pin.pinnedAt === 'string' ? pin.pinnedAt : nowIso(),
    });
  }
  const recentMap = new Map<string, WorkspaceRecentContext>();
  for (const recent of Array.isArray(value.recentContexts) ? value.recentContexts : []) {
    const normalized = normalizeReference(recent);
    const occurredAt = typeof recent.occurredAt === 'string' ? recent.occurredAt : nowIso();
    const candidate: WorkspaceRecentContext = { ...normalized, activity: recent.activity ?? 'opened', occurredAt };
    const key = refKey(candidate);
    const current = recentMap.get(key);
    if (!current || candidate.occurredAt > current.occurredAt) recentMap.set(key, candidate);
  }
  return {
    ...base,
    favorites: [...favoriteMap.values()],
    pins: [...pinMap.values()].sort((a, b) => a.order - b.order || a.pinnedAt.localeCompare(b.pinnedAt)).map((pin, order) => ({ ...pin, order })),
    recentContexts: [...recentMap.values()].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).slice(0, MAX_RECENT_CONTEXTS),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : base.updatedAt,
  };
}

export function setFavorite(preferences: WorkspacePreferences, reference: WorkspaceReference, enabled: boolean): WorkspacePreferences {
  const key = refKey(reference);
  const next = preferences.favorites.filter((item) => refKey(item) !== key);
  if (enabled) next.unshift(normalizeReference(reference));
  return { ...preferences, favorites: next, updatedAt: nowIso() };
}

export function setPinned(preferences: WorkspacePreferences, reference: WorkspaceReference, enabled: boolean): WorkspacePreferences {
  const key = refKey(reference);
  const current = preferences.pins.filter((item) => refKey(item) !== key);
  if (!enabled) return { ...preferences, pins: current.map((pin, order) => ({ ...pin, order })), updatedAt: nowIso() };
  const normalized = normalizeReference(reference);
  const next: WorkspacePin[] = [
    ...current,
    { ...normalized, order: current.length, pinnedAt: nowIso() },
  ].map((pin, order) => ({ ...pin, order }));
  return { ...preferences, pins: next, updatedAt: nowIso() };
}

export function movePin(preferences: WorkspacePreferences, targetId: string, targetType: WorkspaceTargetType, direction: -1 | 1): WorkspacePreferences {
  const pins = [...preferences.pins].sort((a, b) => a.order - b.order);
  const index = pins.findIndex((item) => item.targetId === targetId && item.targetType === targetType);
  const swapIndex = index + direction;
  if (index < 0 || swapIndex < 0 || swapIndex >= pins.length) return preferences;
  [pins[index], pins[swapIndex]] = [pins[swapIndex], pins[index]];
  return { ...preferences, pins: pins.map((pin, order) => ({ ...pin, order })), updatedAt: nowIso() };
}

export function recordRecentContext(preferences: WorkspacePreferences, reference: WorkspaceReference, activity: WorkspaceActivityKind, occurredAt = nowIso()): WorkspacePreferences {
  const normalized = normalizeReference(reference);
  const key = refKey(normalized);
  const next: WorkspaceRecentContext = { ...normalized, activity, occurredAt };
  const recentContexts = [next, ...preferences.recentContexts.filter((item) => refKey(item) !== key)]
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, MAX_RECENT_CONTEXTS);
  return { ...preferences, recentContexts, updatedAt: nowIso() };
}

export function pruneWorkspacePreferences(preferences: WorkspacePreferences, existingKeys: ReadonlySet<string>): WorkspacePreferences {
  const favorites = preferences.favorites.filter((item) => existingKeys.has(refKey(item)));
  const pins = preferences.pins.filter((item) => existingKeys.has(refKey(item))).map((pin, order) => ({ ...pin, order }));
  const recentContexts = preferences.recentContexts.filter((item) => existingKeys.has(refKey(item))).slice(0, MAX_RECENT_CONTEXTS);
  if (favorites.length === preferences.favorites.length && pins.length === preferences.pins.length && recentContexts.length === preferences.recentContexts.length) return preferences;
  return { ...preferences, favorites, pins, recentContexts, updatedAt: nowIso() };
}

function cacheKey(scope: WorkspacePreferenceScope) {
  return `${CACHE_PREFIX}${workspacePreferenceId(scope)}`;
}

function readCache(scope: WorkspacePreferenceScope): WorkspacePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(scope));
    return raw ? normalizeWorkspacePreferences(JSON.parse(raw) as Partial<WorkspacePreferences>, scope) : null;
  } catch {
    return null;
  }
}

function writeCache(preferences: WorkspacePreferences) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(cacheKey(preferences), JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponível'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, 1);
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Timeout ao abrir preferências do workspace'));
    }, IDB_OPEN_TIMEOUT_MS);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      window.clearTimeout(timer);
      if (settled) { request.result.close(); return; }
      settled = true;
      resolve(request.result);
    };
    request.onerror = () => {
      window.clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(request.error ?? new Error('Falha ao abrir preferências do workspace'));
    };
    request.onblocked = () => {
      window.clearTimeout(timer);
      if (settled) return;
      settled = true;
      reject(new Error('IndexedDB bloqueado para preferências do workspace'));
    };
  });
}

async function readDatabase(id: string): Promise<WorkspacePreferences | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as WorkspacePreferences | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Falha ao ler preferências do workspace'));
    tx.oncomplete = () => database.close();
    tx.onabort = () => database.close();
  });
}

async function writeDatabase(preferences: WorkspacePreferences): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(preferences);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Falha ao salvar preferências do workspace'));
    tx.onabort = () => reject(tx.error ?? new Error('Gravação de preferências abortada'));
  });
  database.close();
}

export function readCachedWorkspacePreferences(scope: WorkspacePreferenceScope) {
  return readCache(scope) ?? createEmptyWorkspacePreferences(scope);
}

function newestPreferences(a: WorkspacePreferences | null, b: WorkspacePreferences | null) {
  if (!a) return b;
  if (!b) return a;
  const aTime = Date.parse(a.updatedAt);
  const bTime = Date.parse(b.updatedAt);
  if (Number.isNaN(aTime)) return b;
  if (Number.isNaN(bTime)) return a;
  return bTime > aTime ? b : a;
}

export async function loadWorkspacePreferences(scope: WorkspacePreferenceScope): Promise<WorkspacePreferences> {
  const cached = readCache(scope);
  try {
    const durableRaw = await readDatabase(workspacePreferenceId(scope));
    const durable = durableRaw ? normalizeWorkspacePreferences(durableRaw, scope) : null;
    const resolved = normalizeWorkspacePreferences(newestPreferences(durable, cached), scope);
    writeCache(resolved);
    return resolved;
  } catch {
    return normalizeWorkspacePreferences(cached, scope);
  }
}

export async function saveWorkspacePreferences(preferences: WorkspacePreferences): Promise<void> {
  const normalized = normalizeWorkspacePreferences(preferences, preferences);
  writeCache(normalized);
  try {
    await writeDatabase(normalized);
  } catch {
    // localStorage is the synchronous fallback; durability is best effort when IndexedDB is unavailable.
  }
}

function enqueueWorkspaceMutation(scope: WorkspacePreferenceScope, mutate: (preferences: WorkspacePreferences) => WorkspacePreferences) {
  const id = workspacePreferenceId(scope);
  const previous = mutationQueue.get(id) ?? Promise.resolve();
  const pending = previous.catch(() => undefined).then(async () => {
    const preferences = await loadWorkspacePreferences(scope);
    await saveWorkspacePreferences(mutate(preferences));
  });
  mutationQueue.set(id, pending);
  void pending.finally(() => { if (mutationQueue.get(id) === pending) mutationQueue.delete(id); });
}

export function installWorkspaceActivityTracking(resolveUserId: () => string) {
  if (typeof window === 'undefined') return () => undefined;
  const onContext = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceContextEventDetail>).detail;
    if (!detail?.workspaceId || !detail.targetId || !detail.targetType) return;
    const scope = { userId: resolveUserId(), workspaceId: detail.workspaceId };
    enqueueWorkspaceMutation(scope, (preferences) => recordRecentContext(preferences, detail, detail.activity, detail.occurredAt));
  };
  const onPreference = (event: Event) => {
    const detail = (event as CustomEvent<WorkspacePreferenceEventDetail>).detail;
    if (!detail?.workspaceId || !detail.targetId || !detail.targetType) return;
    const scope = { userId: resolveUserId(), workspaceId: detail.workspaceId };
    enqueueWorkspaceMutation(scope, (preferences) => detail.preference === 'favorite'
      ? setFavorite(preferences, detail, detail.enabled)
      : setPinned(preferences, detail, detail.enabled));
  };
  window.addEventListener('bo-workspace-context', onContext);
  window.addEventListener('bo-workspace-preference', onPreference);
  return () => {
    window.removeEventListener('bo-workspace-context', onContext);
    window.removeEventListener('bo-workspace-preference', onPreference);
  };
}

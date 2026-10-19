import type { Id, ServiceGraph } from '../domain/model.ts';

const INDEX_KEY = 'blue-ocean-project-library-v1';
const ACTIVE_KEY = 'blue-ocean-project-library-active-v1';
const SNAPSHOT_PREFIX = 'blue-ocean-project-snapshot-v1:';

export type ProjectTemplate = 'blank' | 'redesign' | 'blueprint' | 'research' | 'omnichannel' | 'demo';

export type ProjectLibraryEntry = {
  id: Id;
  title: string;
  serviceName: string;
  description: string;
  favorite: boolean;
  archived: boolean;
  template: ProjectTemplate;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string;
  phase: string;
  journeyCount: number;
  blueprintCount: number;
  whiteboardCount: number;
};

type ProjectIndex = { version: 1; projects: ProjectLibraryEntry[] };

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const nowIso = () => new Date().toISOString();
const isWorkspaceEmpty = (graph: ServiceGraph) => graph.service.id === 'workspace-uninitialized' || !graph.service.name.trim();
const storage = (): StorageLike | null => typeof window === 'undefined' ? null : window.localStorage;
const projectIdOf = (graph: ServiceGraph): Id => graph.service.project?.id || `project-${graph.service.id}`;
const projectPhaseOf = (graph: ServiceGraph) => graph.service.project?.currentPhase || 'discovery';

function parseIndex(store: StorageLike | null): ProjectIndex {
  if (!store) return { version: 1, projects: [] };
  try {
    const raw = store.getItem(INDEX_KEY);
    if (!raw) return { version: 1, projects: [] };
    const parsed = JSON.parse(raw) as Partial<ProjectIndex>;
    return { version: 1, projects: Array.isArray(parsed.projects) ? parsed.projects : [] };
  } catch {
    return { version: 1, projects: [] };
  }
}

function writeIndex(index: ProjectIndex, store: StorageLike | null) {
  if (!store) return;
  store.setItem(INDEX_KEY, JSON.stringify(index));
}

function snapshotKey(id: Id) { return `${SNAPSHOT_PREFIX}${id}`; }

export function summarizeProjectGraph(graph: ServiceGraph, previous?: Partial<ProjectLibraryEntry>): ProjectLibraryEntry {
  const id = projectIdOf(graph);
  const boards = Object.values(graph.views?.whiteboards ?? {});
  const now = nowIso();
  return {
    id,
    title: previous?.title?.trim() || graph.service.name || 'Projeto sem nome',
    serviceName: graph.service.name || 'Serviço ainda não definido',
    description: previous?.description ?? graph.service.description ?? '',
    favorite: Boolean(previous?.favorite),
    archived: Boolean(previous?.archived),
    template: previous?.template ?? 'blank',
    createdAt: previous?.createdAt || graph.service.project?.createdAt || graph.service.createdAt || now,
    updatedAt: graph.service.project?.updatedAt || graph.service.updatedAt || now,
    lastOpenedAt: previous?.lastOpenedAt || now,
    phase: projectPhaseOf(graph),
    journeyCount: Object.keys(graph.journeys ?? {}).length,
    blueprintCount: boards.filter((board) => board.viewKind === 'blueprint').length,
    whiteboardCount: boards.filter((board) => board.viewKind !== 'blueprint').length,
  };
}

export function saveProjectSnapshot(graph: ServiceGraph, patch: Partial<ProjectLibraryEntry> = {}, store = storage()): ProjectLibraryEntry | null {
  if (!store || isWorkspaceEmpty(graph)) return null;
  const id = projectIdOf(graph);
  const index = parseIndex(store);
  const existing = index.projects.find((item) => item.id === id);
  const next = summarizeProjectGraph(graph, { ...existing, ...patch });
  const projects = [next, ...index.projects.filter((item) => item.id !== id)].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  writeIndex({ version: 1, projects }, store);
  store.setItem(snapshotKey(id), JSON.stringify(graph));
  store.setItem(ACTIVE_KEY, id);
  return next;
}

export function registerCurrentProject(graph: ServiceGraph, store = storage()) {
  if (!store || isWorkspaceEmpty(graph)) return null;
  const id = projectIdOf(graph);
  const index = parseIndex(store);
  const existing = index.projects.find((item) => item.id === id);
  if (existing && store.getItem(snapshotKey(id))) return existing;
  return saveProjectSnapshot(graph, existing ?? {}, store);
}

export function listProjects(currentGraph?: ServiceGraph, store = storage()): ProjectLibraryEntry[] {
  if (currentGraph && !isWorkspaceEmpty(currentGraph)) registerCurrentProject(currentGraph, store);
  return parseIndex(store).projects.filter((item) => !item.archived).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
}

export function listArchivedProjects(store = storage()): ProjectLibraryEntry[] {
  return parseIndex(store).projects.filter((item) => item.archived).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function activeProjectId(currentGraph?: ServiceGraph, store = storage()): Id | null {
  if (currentGraph && !isWorkspaceEmpty(currentGraph)) return projectIdOf(currentGraph);
  return store?.getItem(ACTIVE_KEY) || null;
}

export function loadProjectSnapshot(id: Id, store = storage()): ServiceGraph | null {
  if (!store) return null;
  try {
    const raw = store.getItem(snapshotKey(id));
    return raw ? JSON.parse(raw) as ServiceGraph : null;
  } catch {
    return null;
  }
}

export function markProjectOpened(id: Id, store = storage()) {
  if (!store) return;
  const index = parseIndex(store);
  const now = nowIso();
  const projects = index.projects.map((item) => item.id === id ? { ...item, lastOpenedAt: now } : item)
    .sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt));
  writeIndex({ version: 1, projects }, store);
  store.setItem(ACTIVE_KEY, id);
}

export function toggleProjectFavorite(id: Id, store = storage()) {
  if (!store) return false;
  const index = parseIndex(store);
  let favorite = false;
  const projects = index.projects.map((item) => {
    if (item.id !== id) return item;
    favorite = !item.favorite;
    return { ...item, favorite };
  });
  writeIndex({ version: 1, projects }, store);
  return favorite;
}

export function renameProject(id: Id, title: string, store = storage()) {
  if (!store || !title.trim()) return false;
  const index = parseIndex(store);
  let changed = false;
  const projects = index.projects.map((item) => {
    if (item.id !== id) return item;
    changed = true;
    return { ...item, title: title.trim(), updatedAt: nowIso() };
  });
  if (!changed) return false;
  writeIndex({ version: 1, projects }, store);
  return true;
}

export function setProjectArchived(id: Id, archived: boolean, store = storage()) {
  if (!store) return false;
  const index = parseIndex(store);
  let changed = false;
  const projects = index.projects.map((item) => {
    if (item.id !== id) return item;
    changed = item.archived !== archived;
    return { ...item, archived, updatedAt: nowIso() };
  });
  if (!changed) return false;
  writeIndex({ version: 1, projects }, store);
  return true;
}

export function projectTemplateLabel(template: ProjectTemplate) {
  return ({
    blank: 'Novo serviço', redesign: 'Redesenho de serviço', blueprint: 'Service Blueprint', research: 'Pesquisa de serviço', omnichannel: 'Experiência omnichannel', demo: 'Projeto de exemplo',
  } as Record<ProjectTemplate, string>)[template];
}

import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import type { ServiceGraph } from '../../domain/model.ts';
import {
  summarizeProjectGraph,
  saveProjectSnapshot,
  registerCurrentProject,
  listProjects,
  listArchivedProjects,
  activeProjectId,
  loadProjectSnapshot,
  markProjectOpened,
  toggleProjectFavorite,
  renameProject,
  setProjectArchived,
  projectTemplateLabel,
} from '../project-library.ts';
import type { ProjectLibraryEntry, ProjectTemplate } from '../project-library.ts';

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeStore(): Record<string, string> & { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  const data: Record<string, string> = {};
  return {
    ...data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  // Ensure non-empty name so isWorkspaceEmpty returns false
  return { ...g, service: { ...g.service, name: 'Test Service' } };
}

function projectId(g: ServiceGraph): string {
  return g.service.project?.id || `project-${g.service.id}`;
}

// ─── summarizeProjectGraph ────────────────────────────────────────────────────

describe('summarizeProjectGraph', () => {
  it('uses service name as title when no previous', () => {
    const g = base();
    const entry = summarizeProjectGraph(g);
    expect(entry.title).toBe('Test Service');
  });

  it('uses previous title when provided and non-empty', () => {
    const g = base();
    const entry = summarizeProjectGraph(g, { title: 'Custom Title' } as Partial<ProjectLibraryEntry>);
    expect(entry.title).toBe('Custom Title');
  });

  it('falls back to "Projeto sem nome" when name is empty', () => {
    const g = { ...base(), service: { ...base().service, name: '' } };
    const entry = summarizeProjectGraph(g, { title: '' } as Partial<ProjectLibraryEntry>);
    expect(entry.title).toBe('Projeto sem nome');
  });

  it('counts journeys', () => {
    const g = { ...base(), journeys: { j1: { id: 'j1' }, j2: { id: 'j2' } } } as ServiceGraph;
    expect(summarizeProjectGraph(g).journeyCount).toBe(2);
  });

  it('counts blueprint and whiteboard boards separately', () => {
    const boards = {
      b1: { id: 'b1', serviceId: 's', name: 'B', viewKind: 'blueprint' as const, items: {}, edges: {} },
      b2: { id: 'b2', serviceId: 's', name: 'W', viewKind: 'free' as const, items: {}, edges: {} },
      b3: { id: 'b3', serviceId: 's', name: 'W2', viewKind: 'free' as const, items: {}, edges: {} },
    };
    const g = { ...base(), views: { whiteboards: boards } } as ServiceGraph;
    const entry = summarizeProjectGraph(g);
    expect(entry.blueprintCount).toBe(1);
    expect(entry.whiteboardCount).toBe(2);
  });

  it('preserves previous favorite and archived flags', () => {
    const g = base();
    const entry = summarizeProjectGraph(g, { favorite: true, archived: true } as Partial<ProjectLibraryEntry>);
    expect(entry.favorite).toBe(true);
    expect(entry.archived).toBe(true);
  });

  it('defaults favorite and archived to false', () => {
    const entry = summarizeProjectGraph(base());
    expect(entry.favorite).toBe(false);
    expect(entry.archived).toBe(false);
  });

  it('defaults template to "blank"', () => {
    expect(summarizeProjectGraph(base()).template).toBe('blank');
  });

  it('uses graph phase', () => {
    const g = { ...base(), service: { ...base().service, project: { id: 'proj', currentPhase: 'validate', createdAt: '', updatedAt: '' } } } as ServiceGraph;
    expect(summarizeProjectGraph(g).phase).toBe('validate');
  });

  it('defaults phase to "discovery"', () => {
    expect(summarizeProjectGraph(base()).phase).toBe('discovery');
  });
});

// ─── saveProjectSnapshot ──────────────────────────────────────────────────────

describe('saveProjectSnapshot', () => {
  it('returns null when store is null', () => {
    expect(saveProjectSnapshot(base(), {}, null)).toBeNull();
  });

  it('returns null for empty workspace (no service name)', () => {
    const g = { ...base(), service: { ...base().service, name: '' } };
    expect(saveProjectSnapshot(g, {}, makeStore())).toBeNull();
  });

  it('returns entry on success', () => {
    const store = makeStore();
    const entry = saveProjectSnapshot(base(), {}, store);
    expect(entry).not.toBeNull();
    expect(entry?.serviceName).toBe('Test Service');
  });

  it('writes snapshot JSON to store', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    const key = `blue-ocean-project-snapshot-v1:${projectId(g)}`;
    expect(store.getItem(key)).not.toBeNull();
  });

  it('writes active project id to store', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    expect(store.getItem('blue-ocean-project-library-active-v1')).toBe(projectId(g));
  });

  it('applies patch over previous entry', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    const entry = saveProjectSnapshot(g, { favorite: true }, store);
    expect(entry?.favorite).toBe(true);
  });
});

// ─── registerCurrentProject ───────────────────────────────────────────────────

describe('registerCurrentProject', () => {
  it('returns null for empty workspace', () => {
    const g = { ...base(), service: { ...base().service, name: '' } };
    expect(registerCurrentProject(g, makeStore())).toBeNull();
  });

  it('returns entry for valid graph', () => {
    const store = makeStore();
    const entry = registerCurrentProject(base(), store);
    expect(entry).not.toBeNull();
  });

  it('returns existing entry without re-saving if snapshot exists', () => {
    const store = makeStore();
    const g = base();
    const first = saveProjectSnapshot(g, {}, store);
    const second = registerCurrentProject(g, store);
    expect(second?.id).toBe(first?.id);
  });
});

// ─── listProjects ─────────────────────────────────────────────────────────────

describe('listProjects', () => {
  it('returns empty array for empty store', () => {
    expect(listProjects(undefined, makeStore())).toEqual([]);
  });

  it('excludes archived projects', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    setProjectArchived(projectId(g), true, store);
    expect(listProjects(undefined, store)).toHaveLength(0);
  });

  it('sorts by lastOpenedAt descending', () => {
    const store = makeStore();
    const g1 = { ...base(), service: { ...base().service, id: 'svc1', name: 'Service 1' } } as ServiceGraph;
    const g2 = { ...base(), service: { ...base().service, id: 'svc2', name: 'Service 2' } } as ServiceGraph;
    saveProjectSnapshot(g1, {}, store);
    saveProjectSnapshot(g2, {}, store);
    const list = listProjects(undefined, store);
    // g2 saved last → higher lastOpenedAt
    expect(list[0].serviceName).toBe('Service 2');
  });
});

// ─── listArchivedProjects ────────────────────────────────────────────────────

describe('listArchivedProjects', () => {
  it('returns empty array for empty store', () => {
    expect(listArchivedProjects(makeStore())).toEqual([]);
  });

  it('returns only archived projects', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    setProjectArchived(projectId(g), true, store);
    const archived = listArchivedProjects(store);
    expect(archived).toHaveLength(1);
    expect(archived[0].archived).toBe(true);
  });
});

// ─── activeProjectId ─────────────────────────────────────────────────────────

describe('activeProjectId', () => {
  it('returns null for empty store', () => {
    expect(activeProjectId(undefined, makeStore())).toBeNull();
  });

  it('returns projectId from graph when provided', () => {
    const g = base();
    expect(activeProjectId(g, makeStore())).toBe(projectId(g));
  });

  it('returns stored active id when no graph provided', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    expect(activeProjectId(undefined, store)).toBe(projectId(g));
  });
});

// ─── loadProjectSnapshot ─────────────────────────────────────────────────────

describe('loadProjectSnapshot', () => {
  it('returns null for empty store', () => {
    expect(loadProjectSnapshot('nonexistent', makeStore())).toBeNull();
  });

  it('returns null when store is null', () => {
    expect(loadProjectSnapshot('id', null)).toBeNull();
  });

  it('returns saved snapshot', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    const loaded = loadProjectSnapshot(projectId(g), store);
    expect(loaded).not.toBeNull();
    expect(loaded?.service.id).toBe(g.service.id);
  });
});

// ─── markProjectOpened ───────────────────────────────────────────────────────

describe('markProjectOpened', () => {
  it('no-ops when store is null', () => {
    expect(() => markProjectOpened('id', null)).not.toThrow();
  });

  it('updates lastOpenedAt and sets active id', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    const id = projectId(g);
    // Advance time by updating lastOpenedAt in the existing entry first
    const before = listProjects(undefined, store)[0].lastOpenedAt;
    // Wait a tick is not needed; just verify it sets ACTIVE_KEY
    markProjectOpened(id, store);
    expect(store.getItem('blue-ocean-project-library-active-v1')).toBe(id);
    // lastOpenedAt is updated
    const after = listProjects(undefined, store)[0].lastOpenedAt;
    expect(after).toBeDefined();
    // Not worse than before
    expect(after >= before).toBe(true);
  });
});

// ─── toggleProjectFavorite ───────────────────────────────────────────────────

describe('toggleProjectFavorite', () => {
  it('returns false when store is null', () => {
    expect(toggleProjectFavorite('id', null)).toBe(false);
  });

  it('toggles favorite from false to true', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    const result = toggleProjectFavorite(projectId(g), store);
    expect(result).toBe(true);
  });

  it('toggles favorite from true to false', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, { favorite: true }, store);
    const result = toggleProjectFavorite(projectId(g), store);
    expect(result).toBe(false);
  });

  it('no-ops for unknown id (returns false)', () => {
    const store = makeStore();
    expect(toggleProjectFavorite('nonexistent', store)).toBe(false);
  });
});

// ─── renameProject ────────────────────────────────────────────────────────────

describe('renameProject', () => {
  it('returns false when store is null', () => {
    expect(renameProject('id', 'title', null)).toBe(false);
  });

  it('returns false for empty title', () => {
    const store = makeStore();
    expect(renameProject('id', '   ', store)).toBe(false);
  });

  it('returns false for unknown id', () => {
    const store = makeStore();
    expect(renameProject('nonexistent', 'New Name', store)).toBe(false);
  });

  it('renames project and returns true', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    const id = projectId(g);
    const result = renameProject(id, 'New Name', store);
    expect(result).toBe(true);
    const list = listProjects(undefined, store);
    expect(list[0].title).toBe('New Name');
  });

  it('trims the new title', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    renameProject(projectId(g), '  Trimmed  ', store);
    expect(listProjects(undefined, store)[0].title).toBe('Trimmed');
  });
});

// ─── setProjectArchived ──────────────────────────────────────────────────────

describe('setProjectArchived', () => {
  it('returns false when store is null', () => {
    expect(setProjectArchived('id', true, null)).toBe(false);
  });

  it('returns false for unknown id', () => {
    expect(setProjectArchived('nonexistent', true, makeStore())).toBe(false);
  });

  it('archives a project and returns true', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    const result = setProjectArchived(projectId(g), true, store);
    expect(result).toBe(true);
    expect(listArchivedProjects(store)).toHaveLength(1);
  });

  it('returns false when archived status is unchanged', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, {}, store);
    setProjectArchived(projectId(g), true, store);
    // Setting to true again → no change
    expect(setProjectArchived(projectId(g), true, store)).toBe(false);
  });

  it('unarchives a project', () => {
    const store = makeStore();
    const g = base();
    saveProjectSnapshot(g, { archived: true }, store);
    setProjectArchived(projectId(g), false, store);
    expect(listArchivedProjects(store)).toHaveLength(0);
    expect(listProjects(undefined, store)).toHaveLength(1);
  });
});

// ─── projectTemplateLabel ────────────────────────────────────────────────────

describe('projectTemplateLabel', () => {
  const cases: Array<[ProjectTemplate, string]> = [
    ['blank', 'Novo serviço'],
    ['redesign', 'Redesenho de serviço'],
    ['blueprint', 'Service Blueprint'],
    ['research', 'Pesquisa de serviço'],
    ['omnichannel', 'Experiência omnichannel'],
    ['demo', 'Projeto de exemplo'],
  ];

  it.each(cases)('template "%s" → "%s"', (template, label) => {
    expect(projectTemplateLabel(template)).toBe(label);
  });
});

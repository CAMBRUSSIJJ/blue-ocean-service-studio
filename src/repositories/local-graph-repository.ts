import type { ServiceGraph } from '../domain/model';
import { createBlankWorkspaceGraph, createInitialGraph } from '../domain/graph-operations';
import { migrateProject } from '../domain/migrations';
import { validateGraph } from '../domain/schema';
import { dataBridge } from '../runtime/client';

const CURRENT_KEY = 'realtalent-service-studio-v3-service-graph';
const LEGACY_V2_KEY = 'realtalent-service-studio-v2-service-graph';
const LEGACY_KEY = 'realtalent-service-studio-v1-service-graph';

const LEGACY_STARTER_STAGE_IDS = ['stage-discovery', 'stage-contact', 'stage-payment'];
const isUntouchedLegacyStarter = (graph: ServiceGraph) => {
  if (graph.service.id !== 'service-main' || graph.service.name !== 'Serviço principal') return false;
  if (Object.keys(graph.journeys).join(',') !== 'journey-main') return false;
  const stages = Object.keys(graph.stages).sort();
  if (stages.length !== LEGACY_STARTER_STAGE_IDS.length || LEGACY_STARTER_STAGE_IDS.some((id) => !stages.includes(id))) return false;
  if (Object.keys(graph.entities ?? {}).some((kind) => Object.keys(graph.entities[kind] ?? {}).length > 0)) return false;
  if (Object.keys(graph.research?.sources ?? {}).length > 0) return false;
  const boards = Object.values(graph.views?.whiteboards ?? {});
  if (boards.length > 1) return false;
  if (boards.some((board) => Object.keys(board.items ?? {}).length > 0 || Object.keys(board.edges ?? {}).length > 0)) return false;
  return true;
};

export interface GraphRepository {
  load(): { graph: ServiceGraph; warning?: string; migrated: boolean };
  save(graph: ServiceGraph): void;
  importJson(json: string): ServiceGraph;
  exportJson(graph: ServiceGraph): string;
}

export class BrowserLocalGraphRepository implements GraphRepository {
  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof window === 'undefined' ? null : window.localStorage) {}

  load() {
    if (typeof window !== 'undefined') { const bridge = dataBridge(); if (bridge) return { graph: bridge.get(), migrated: false }; }
    if (!this.storage) return { graph: createInitialGraph(), migrated: false };
    let warning: string | undefined;
    for (const [key, migrated] of [[CURRENT_KEY, false], [LEGACY_V2_KEY, true], [LEGACY_KEY, true]] as const) {
      try {
        const saved = this.storage.getItem(key);
        if (saved) {
          const imported = this.importJson(saved);
          if (isUntouchedLegacyStarter(imported)) {
            return { graph: createBlankWorkspaceGraph(), migrated: true, warning: 'A base demonstrativa antiga foi removida. Crie seu primeiro serviço para começar.' };
          }
          return { graph: imported, migrated, warning };
        }
      } catch {
        warning = 'Um projeto salvo não pôde ser lido. Seus dados originais foram preservados no navegador.';
      }
    }
    return { graph: createInitialGraph(), migrated: false, warning };
  }

  save(graph: ServiceGraph) {
    if (!this.storage) throw new Error('Armazenamento indisponível.');
    this.storage.setItem(CURRENT_KEY, this.exportJson(graph));
  }

  importJson(json: string) { return migrateProject(JSON.parse(json)); }
  exportJson(graph: ServiceGraph) { return JSON.stringify(validateGraph(graph), null, 2); }
}

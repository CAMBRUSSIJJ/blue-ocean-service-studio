import type { ServiceGraph } from '../domain/model';

export interface DataBridgeApi {
  get(): ServiceGraph;
  currentJourneyId(): string | null;
  save(): boolean;
  transact(updater: (graph: ServiceGraph) => ServiceGraph, label?: string): ServiceGraph;
  undo(): void;
  redo(): void;
  export(): void;
  import(data: unknown): Promise<ServiceGraph>;
  recovery(): Promise<unknown>;
  prepare?(): Promise<unknown>;
}

export interface RuntimeRegistry {
  register(name: string, api: unknown, version?: string | null): unknown;
  api<T = unknown>(name: string): T | null;
  has(name: string): boolean;
  version(name: string): string | null;
  list(): string[];
}

function createClientRegistry(): RuntimeRegistry {
  const apis = new Map<string, unknown>();
  const versions = new Map<string, string>();
  return {
    register(name, api, version) {
      apis.set(name, api);
      if (version) versions.set(name, version);
      window.dispatchEvent(new CustomEvent('rt-runtime-registered', { detail: { name, version } }));
      return api;
    },
    api<T = unknown>(name: string) { return (apis.get(name) as T | undefined) ?? null; },
    has(name) { return apis.has(name); },
    version(name) { return versions.get(name) ?? null; },
    list() { return [...apis.keys()]; },
  };
}

export function runtimeRegistry(): RuntimeRegistry {
  if (!window.RealTalentRuntime) window.RealTalentRuntime = createClientRegistry();
  if (!window.BlueOceanRuntime) window.BlueOceanRuntime = window.RealTalentRuntime;
  return window.BlueOceanRuntime;
}

export function runtimeApi<T = unknown>(name: string): T | null {
  return runtimeRegistry().api<T>(name);
}

export function dataBridge(): DataBridgeApi | null {
  return runtimeApi<DataBridgeApi>('dataBridge');
}

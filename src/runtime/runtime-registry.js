function createRuntimeRegistry() {
  const apis = new Map();
  const versions = new Map();
  const listeners = new EventTarget();
  return {
    register(name, api, version = api?.version ?? null) {
      if (!name) throw new Error('Runtime API name is required');
      apis.set(name, api);
      if (version) versions.set(name, String(version));
      listeners.dispatchEvent(new CustomEvent('registered', { detail: { name, api, version } }));
      window.dispatchEvent(new CustomEvent('rt-runtime-registered', { detail: { name, version } }));
      return api;
    },
    api(name) { return apis.get(name) ?? null; },
    has(name) { return apis.has(name); },
    version(name) { return versions.get(name) ?? null; },
    list() { return [...apis.keys()]; },
    onRegistered(handler) {
      const fn = (event) => handler(event.detail);
      listeners.addEventListener('registered', fn);
      return () => listeners.removeEventListener('registered', fn);
    },
    emit(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail })); },
  };
}

if (!window.RealTalentRuntime) window.RealTalentRuntime = createRuntimeRegistry();
if (!window.BlueOceanRuntime) window.BlueOceanRuntime = window.RealTalentRuntime;
export const runtime = window.BlueOceanRuntime;
export default runtime;

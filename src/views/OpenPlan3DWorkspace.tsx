import { useEffect, useRef, useState } from 'react';
import type { StudioController } from '../state/useStudioController';
import { dataBridge } from '../runtime/client';
import { applyCadChange, cadEntry, cadScopeId, cadVersion, OPENPLAN_CHANNEL } from '../services/openplan3d-projects';

/**
 * OpenPlan3D is a separately built, same-origin SvelteKit microfrontend.
 * The React shell owns project selection and persistence. The iframe only
 * edits a validated floor plan, never writes directly into the service graph.
 */
export function OpenPlan3DWorkspace({ studio, mapId }: { studio: StudioController; mapId: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef(studio);
  latest.current = studio;
  const ready = useRef(false);
  const lastSentVersion = useRef<string | null>(null);
  const [session] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState('Iniciando o editor de ambientes…');
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const frameOrigin = window.location.origin;
  const serviceId = studio.graph.service.id;
  const scopeId = cadScopeId(serviceId, mapId);

  const send = useRef<() => void>(() => {});
  send.current = () => {
    const graph = dataBridge()?.get() ?? latest.current.graph;
    if (graph.service.id !== serviceId) return;
    const version = cadVersion(graph, mapId);
    const entry = cadEntry(graph, mapId);
    lastSentVersion.current = version;
    frame.current?.contentWindow?.postMessage({
      channel: OPENPLAN_CHANNEL,
      session,
      type: 'hydrate',
      project: entry?.project ?? null,
      baseVersion: version,
      scopeId,
      name: (graph.journeys[mapId]?.name || graph.service.name || 'Ambientes') + ' — Planta física',
    }, frameOrigin);
  };

  useEffect(() => {
    ready.current = false;
    let disposed = false;
    const receive = (event: MessageEvent) => {
      const payload = event.data;
      if (event.source !== frame.current?.contentWindow || event.origin !== frameOrigin ||
          !payload || typeof payload !== 'object' || payload.channel !== OPENPLAN_CHANNEL || payload.session !== session) return;
      if (payload.type === 'ready') {
        ready.current = true;
        setIsReady(true);
        setError('');
        send.current();
        return;
      }
      if (payload.type === 'hydrated') { setMessage('Planta do serviço pronta para edição.'); return; }
      if (payload.type === 'error') { setError(typeof payload.message === 'string' ? payload.message.slice(0, 300) : 'O editor encontrou um erro.'); return; }
      if (payload.type !== 'change') return;
      if (!Number.isSafeInteger(payload.sequence) || payload.sequence < 1 || typeof payload.baseVersion !== 'string') return;
      try {
        const graph = dataBridge()?.get() ?? latest.current.graph;
        const changed = applyCadChange(graph, serviceId, mapId, payload.baseVersion, payload.project);
        latest.current.setGraph(current => applyCadChange(current, serviceId, mapId, payload.baseVersion, payload.project), 'Salas e 3D: editar planta CAD');
        const nextVersion = cadVersion(changed, mapId);
        lastSentVersion.current = nextVersion;
        frame.current?.contentWindow?.postMessage({ channel: OPENPLAN_CHANNEL, session, type: 'ack', sequence: payload.sequence, accepted: true, baseVersion: nextVersion }, frameOrigin);
        setError('');
        setMessage('Alteração registrada no projeto Blue Ocean.');
      } catch (cause) {
        const reason = cause instanceof Error ? cause.message : 'Não foi possível salvar esta alteração.';
        setError(reason);
        frame.current?.contentWindow?.postMessage({ channel: OPENPLAN_CHANNEL, session, type: 'ack', sequence: payload.sequence, accepted: false, message: reason }, frameOrigin);
        send.current();
      }
    };
    window.addEventListener('message', receive);
    const timeout = window.setTimeout(() => {
      if (!disposed && !ready.current) setError('O motor OpenPlan3D não iniciou. Execute npm run openplan:prepare para instalar o motor antes de abrir o Blue Ocean.');
    }, 20000);
    return () => { disposed = true; window.removeEventListener('message', receive); window.clearTimeout(timeout); };
  }, [frameOrigin, mapId, scopeId, serviceId, session]);

  useEffect(() => {
    if (!ready.current) return;
    const version = cadVersion(studio.graph, mapId);
    if (version !== lastSentVersion.current) send.current();
  }, [studio.graph, mapId]);

  return <div className="bo-openplan-workspace" data-openplan3d-editor="1">
    <div className="bo-openplan-workspace__status" role="status">
      <span className={isReady ? 'is-ready' : ''} aria-hidden="true" />
      <strong>Editor CAD</strong>
      <span>{message}</span>
      <span className="bo-openplan-workspace__save">Projeto: {({ saved: 'salvo', saving: 'salvando', error: 'falha ao salvar' })[studio.saveStatus]}</span>
    </div>
    {error && <div className="bo-service-spaces__error" role="alert">{error}</div>}
    <iframe
      key={scopeId}
      ref={frame}
      className="bo-service-spaces__frame bo-openplan-workspace__frame"
      title="OpenPlan3D — Editor de plantas físicas integrado ao Blue Ocean"
      src={`${import.meta.env.BASE_URL}openplan3d/editor/?boSession=${encodeURIComponent(session)}`}
      allow="fullscreen"
    />
    <p className="bo-openplan-workspace__hint">As alterações da planta são registradas no projeto. As atividades, jornadas e a simulação antiga permanecem preservadas na área Simulação.</p>
  </div>;
}

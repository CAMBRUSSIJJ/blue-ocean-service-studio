import { useEffect, useRef, useState } from 'react';
import type { StudioController } from '../state/useStudioController';
import { dataBridge } from '../runtime/client';
import { applyCadChange, cadEntry, cadScopeId, cadVersion, OPENPLAN_CHANNEL } from '../services/openplan3d-projects';
import { CadRoomServicePanel, type CadNativeRoom } from './CadRoomServicePanel';

/**
 * OpenPlan3D is a separately built, same-origin SvelteKit microfrontend.
 * The React shell owns project selection and persistence. The iframe only
 * edits a validated floor plan, never writes directly into the service graph.
 */
export function OpenPlan3DWorkspace({ studio, mapId, onOpenMap }: { studio: StudioController; mapId: string; onOpenMap?: (id: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef(studio);
  latest.current = studio;
  const ready = useRef(false);
  const lastSentVersion = useRef<string | null>(null);
  const [session] = useState(() => crypto.randomUUID());
  const [message, setMessage] = useState('Iniciando o editor de ambientes…');
  const [error, setError] = useState('');
  const [isReady, setIsReady] = useState(false);
  // Presentation only: toggling the tool rail never unmounts it or edits CAD data.
  const [toolsVisible, setToolsVisible] = useState(true);
  const [roomContext, setRoomContext] = useState<{ rooms: CadNativeRoom[]; selectedRoomKey: string | null }>({ rooms: [], selectedRoomKey: null });
  const [showServiceContext, setShowServiceContext] = useState(true);
  const [assetStatus, setAssetStatus] = useState<'checking' | 'ready' | 'missing'>('checking');
  const [assetRevision, setAssetRevision] = useState(0);
  const assetRoot = new URL(import.meta.env.BASE_URL, window.location.origin + '/');
  const frameUrl = new URL('openplan3d/editor/index.html?boSession=' + encodeURIComponent(session), assetRoot).toString();

  // Vite's SPA fallback can return Blue Ocean's own index.html when the CAD
  // build is absent. Verify the exact upstream build marker BEFORE iframe mount.
  useEffect(() => {
    let active = true;
    setAssetStatus('checking');
    setError('');
    const markerUrl = new URL('openplan3d/blue-ocean-source-commit.txt', assetRoot);
    void fetch(markerUrl, { cache: 'no-store' })
      .then(async response => response.ok && (await response.text()).trim() === '98f9cb467e4045c6abc5d9880ada1f03dff50c68')
      .then(valid => { if (active) setAssetStatus(valid ? 'ready' : 'missing'); })
      .catch(() => { if (active) setAssetStatus('missing'); });
    return () => { active = false; };
  }, [assetRevision]);

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
    if (assetStatus !== 'ready') return;
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
      if (payload.type === 'room-context') {
        if (Array.isArray(payload.rooms) && payload.rooms.length <= 120 &&
          payload.rooms.every((item: unknown) => item && typeof item === 'object' &&
            typeof (item as CadNativeRoom).key === 'string' && (item as CadNativeRoom).key.length <= 25000 &&
            typeof (item as CadNativeRoom).floorId === 'string' && (item as CadNativeRoom).floorId.length <= 180 &&
            typeof (item as CadNativeRoom).roomId === 'string' &&
            typeof (item as CadNativeRoom).name === 'string' && (item as CadNativeRoom).name.length <= 120 &&
            typeof (item as CadNativeRoom).area === 'number' && Number.isFinite((item as CadNativeRoom).area))) {
          const selectedRoomKey = typeof payload.selectedRoomKey === 'string' &&
            payload.rooms.some((item: CadNativeRoom) => item.key === payload.selectedRoomKey)
              ? payload.selectedRoomKey : null;
          setRoomContext({ rooms: payload.rooms as CadNativeRoom[], selectedRoomKey });
        }
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
  }, [assetStatus, frameOrigin, mapId, scopeId, serviceId, session]);

  useEffect(() => {
    if (!isReady || assetStatus !== 'ready') return;
    frame.current?.contentWindow?.postMessage({
      channel: OPENPLAN_CHANNEL,
      session,
      type: 'ui',
      toolsCollapsed: !toolsVisible,
    }, frameOrigin);
  }, [assetStatus, frameOrigin, isReady, session, toolsVisible]);

  useEffect(() => {
    if (!ready.current) return;
    const version = cadVersion(studio.graph, mapId);
    if (version !== lastSentVersion.current) send.current();
  }, [studio.graph, mapId]);

  return <div className="bo-openplan-workspace" data-openplan3d-editor="1">
    <div className="bo-openplan-workspace__status" role="status">
      <span className={isReady ? 'is-ready' : ''} aria-hidden="true" />
      <strong>BLUE OCEAN · CAD</strong>
      <span>{message}</span>
      <span className="bo-openplan-workspace__save">Projeto: {({ saved: 'salvo', saving: 'salvando', error: 'falha ao salvar' })[studio.saveStatus]}</span>
      <button
        type="button"
        className="bo-openplan-workspace__tools-toggle"
        aria-pressed={showServiceContext}
        aria-controls="bo-cad-service-context"
        title="Mostrar ou recolher os vínculos da sala com o serviço"
        onClick={() => setShowServiceContext(value => !value)}
      >{showServiceContext ? 'Recolher contexto' : 'Contexto do serviço'}</button>
      <button
        type="button"
        className="bo-openplan-workspace__tools-toggle"
        aria-label={toolsVisible ? 'Recolher painel de ferramentas do CAD' : 'Mostrar painel de ferramentas do CAD'}
        aria-pressed={!toolsVisible}
        title="Recolher ou mostrar ferramentas sem alterar a planta"
        disabled={!isReady || assetStatus !== 'ready'}
        onClick={() => setToolsVisible(value => !value)}
      >{toolsVisible ? 'Recolher ferramentas' : 'Mostrar ferramentas'}</button>
    </div>
    {error && <div className="bo-service-spaces__error" role="alert">{error}</div>}
    {assetStatus === 'checking' && <div className="bo-openplan-workspace__unavailable" role="status">
      <strong>Verificando o motor OpenPlan3D…</strong><p>Aguardando confirmação dos arquivos do editor CAD.</p>
    </div>}
    {assetStatus === 'missing' && <div className="bo-openplan-workspace__unavailable" role="alert">
      <strong>Editor CAD ainda não instalado neste ambiente</strong>
      <p>O servidor do Blue Ocean estava exibindo a própria página dentro do editor. Essa visualização foi bloqueada para evitar a interface duplicada.</p>
      <p>No terminal do Blue Ocean, encerre a aplicação com Ctrl+C, execute <code>npm run openplan:prepare</code> e depois <code>npm run dev</code>. Na versão corrigida, o comando de desenvolvimento já prepara automaticamente o CAD.</p>
      <button type="button" className="bo-button bo-button--secondary" onClick={() => setAssetRevision(value => value + 1)}>Verificar novamente</button>
    </div>}
    <div className={`bo-openplan-workspace__body${showServiceContext ? ' is-context-open' : ''}`}>
    {assetStatus === 'ready' && <iframe
      key={scopeId}
      name={`boSession:${session}`}
      ref={frame}
      className="bo-service-spaces__frame bo-openplan-workspace__frame"
      title="OpenPlan3D — Editor de plantas físicas integrado ao Blue Ocean"
      src={frameUrl}
      onLoad={() => {
        try {
          const doc = frame.current?.contentDocument;
          // Explicit guard even if the marker existed but the asset route was
          // unexpectedly rewritten to the Blue Ocean application.
          if (doc?.getElementById('root') || doc?.title.includes('Blue Ocean Service Studio')) {
            setAssetStatus('missing');
            setError('A rota do CAD carregou o Blue Ocean no lugar do OpenPlan3D. Corrija a instalação do motor.');
          }
        } catch { /* Cross-origin failures are covered by the handshake timeout. */ }
      }}
      allow="fullscreen"
    />}
    {assetStatus === 'ready' && <div className="bo-openplan-workspace__context" id="bo-cad-service-context" hidden={!showServiceContext}><CadRoomServicePanel
      studio={studio} mapId={mapId}
      rooms={roomContext.rooms}
      selectedRoomKey={roomContext.selectedRoomKey}
      onOpenMap={onOpenMap}
    /></div>}
    </div>
    <p className="bo-openplan-workspace__hint">As alterações da planta são registradas no projeto. As atividades, jornadas e a simulação antiga permanecem preservadas na área Simulação.</p>
  </div>;
}

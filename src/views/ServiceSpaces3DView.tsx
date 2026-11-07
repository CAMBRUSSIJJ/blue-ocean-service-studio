import { useEffect, useRef, useState } from 'react';
import { OpenPlan3DWorkspace } from './OpenPlan3DWorkspace';
import type { StudioController } from '../state/useStudioController';
import { dataBridge, runtimeApi } from '../runtime/client';
import { applyServiceSpaces, projectServiceSpaces, SERVICE_SPACE, spaceVersion } from '../services/service-spaces';
import './service-spaces.css';

const CHANNEL = 'blue-ocean-service-spaces/v1';
export function ServiceSpaces3DView({ studio, onOpenMap }: { studio: StudioController; onOpenMap: (id: string) => void }) {
  const { graph } = studio;
  const surface = useRef<HTMLElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [editorMode, setEditorMode] = useState<'cad' | 'simulation'>('cad');
  useEffect(() => {
    const update = () => setExpanded(document.fullscreenElement === surface.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);
  const toggleExpanded = async () => {
    try { if (document.fullscreenElement === surface.current) await document.exitFullscreen(); else await surface.current?.requestFullscreen(); }
    catch { studio.showToast('Não foi possível ampliar neste navegador. Use o modo de tela cheia do navegador.'); }
  };
  const journeys = graph.service.journeyIds.map(id => graph.journeys[id]).filter(Boolean);
  const [mapId, setMapId] = useState(() => journeys.some(journey => journey.id === studio.journeyId) ? studio.journeyId! : journeys[0]?.id ?? SERVICE_SPACE);
  const activeMap = mapId === SERVICE_SPACE || journeys.some(journey => journey.id === mapId) ? mapId : journeys[0]?.id ?? SERVICE_SPACE;
  return <section ref={surface} className="bo-service-spaces" data-service-spaces="1" aria-labelledby="bo-spaces-title">
    <header className="bo-service-spaces__head">
      <div><span className="bo-service-spaces__eyebrow">BLUE OCEAN · AMBIENTES FÍSICOS</span><h2 id="bo-spaces-title">Salas e 3D</h2><p>Desenhe a planta arquitetônica no CAD ou simule o funcionamento do serviço.</p></div>
      <label>Mapa do serviço<select aria-label="Mapa para organizar as salas" value={activeMap} onChange={event => setMapId(event.target.value)}>
        <option value={SERVICE_SPACE}>Planta do serviço</option>{journeys.map(journey => <option key={journey.id} value={journey.id}>{journey.name}</option>)}
      </select></label>
      <button type="button" className="bo-button bo-button--secondary" onClick={() => void toggleExpanded()}>{expanded ? 'Sair da tela cheia' : 'Ampliar editor'}</button>
    </header>
    <nav className="bo-service-spaces__modes" aria-label="Ferramenta de ambientes">
      <button type="button" className={editorMode === 'cad' ? 'is-active' : ''} aria-current={editorMode === 'cad' ? 'page' : undefined} onClick={() => setEditorMode('cad')}>Editor CAD · OpenPlan3D</button>
      <button type="button" className={editorMode === 'simulation' ? 'is-active' : ''} aria-current={editorMode === 'simulation' ? 'page' : undefined} onClick={() => setEditorMode('simulation')}>Simulação do serviço</button>
    </nav>
    {editorMode === 'cad'
      ? <OpenPlan3DWorkspace key={`${graph.service.id}:${activeMap}:cad`} studio={studio} mapId={activeMap} />
      : <SpacesEditor key={`${graph.service.id}:${activeMap}:simulation`} studio={studio} mapId={activeMap} onOpenMap={onOpenMap}/>}

  </section>;
}

function SpacesEditor({ studio, mapId, onOpenMap }: { studio: StudioController; mapId: string; onOpenMap: (id: string) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [session] = useState(() => crypto.randomUUID());
  const [status, setStatus] = useState('Carregando os ambientes do serviço…');
  const [error, setError] = useState('');
  const ready = useRef(false), sentVersion = useRef('');
  const current = useRef({ studio, onOpenMap }); current.current = { studio, onOpenMap };
  const history = (direction: 'undo' | 'redo') => {
    const permission = runtimeApi<{ can?: (action: string) => boolean }>('collaboration');
    if (permission?.can && !permission.can('edit')) { setError('Este projeto está em modo de leitura.'); return; }
    current.current.studio[direction]();
  };
  let projectionError = '';
  let version = '';
  try { version = spaceVersion(projectServiceSpaces(studio.graph, mapId)); } catch (cause) { projectionError = String((cause as Error).message); }
  const sendSnapshot = useRef<(type?: string, detail?: Record<string, unknown>) => void>(() => {});
  sendSnapshot.current = (type = 'snapshot', detail = {}) => {
    const graph = dataBridge()?.get() ?? current.current.studio.graph;
    try {
      const collaboration = runtimeApi<{ can?: (action: string) => boolean }>('collaboration');
      const controls = { canEdit: Boolean(dataBridge()) && (collaboration?.can ? collaboration.can('edit') : true), ...(dataBridge()?.historyState?.() ?? { canUndo: current.current.studio.canUndo, canRedo: current.current.studio.canRedo }) };
      if (type === 'controls') { frame.current?.contentWindow?.postMessage({ channel: CHANNEL, session, type, ...controls }, window.location.origin); return; }
      const document = projectServiceSpaces(graph, mapId);
      const nextVersion = spaceVersion(document); sentVersion.current = nextVersion;
      const style = getComputedStyle(window.document.documentElement);
      const tokens: Record<string, string> = { bg: 'canvas', surface: 'surface', surface2: 'surface-subtle', border: 'border', 'border-strong': 'border-strong', text: 'text', text2: 'text-secondary', text3: 'text-muted', blue: 'primary-600', 'blue-light': 'primary-100', 'blue-mid': 'primary-200', green: 'success-700', red: 'danger-700', amber: 'warning-700' };
      const theme = Object.fromEntries(Object.entries(tokens).map(([target, source]) => ['--' + target, style.getPropertyValue('--bo-color-' + source).trim()]).filter(([, value]) => value));
      frame.current?.contentWindow?.postMessage({ channel: CHANNEL, session, type, document, version: nextVersion,
        ...controls, theme, ...detail }, window.location.origin);
    } catch (cause) { setError((cause as Error).message); }
  };
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const message = event.data;
      if (event.source !== frame.current?.contentWindow || event.origin !== window.location.origin || !message || message.channel !== CHANNEL || message.session !== session) return;
      if (message.type === 'ready') { ready.current = true; sendSnapshot.current(); return; }
      if (message.type === 'settled') { setStatus('Ambientes sincronizados com o projeto.'); return; }
      if (message.type === 'focus-editor') { frame.current?.scrollIntoView({ block: 'start' }); return; }
      if (message.type === 'edit-map') { if (mapId !== SERVICE_SPACE) current.current.onOpenMap(mapId); return; }
      if (message.type === 'undo' || message.type === 'redo') { history(message.type); return; }
      if (message.type !== 'change' || !Number.isSafeInteger(message.sequence) || typeof message.baseVersion !== 'string') return;
      const controller = current.current.studio;
      let accepted = false, failure = '';
      try {
        const collaboration = runtimeApi<{ can?: (action: string) => boolean }>('collaboration');
        if (collaboration?.can && !collaboration.can('edit')) throw new Error('Este projeto está em modo de leitura.');
        // Validate against the latest canonical graph before entering the transaction.
        const bridge = dataBridge();
        if (!bridge) throw new Error('Aguarde o carregamento do projeto antes de editar as salas.');
        const latest = bridge.get();
        const timestamp = new Date().toISOString();
        const next = applyServiceSpaces(latest, controller.graph.service.id, mapId, message.baseVersion, message.document, timestamp);
        controller.setGraph(graph => applyServiceSpaces(graph, controller.graph.service.id, mapId, message.baseVersion, message.document, timestamp), 'Salas e 3D: editar ambientes');
        const saved = bridge.get();
        accepted = spaceVersion(projectServiceSpaces(saved, mapId)) === spaceVersion(projectServiceSpaces(next, mapId));
        if (!accepted) throw new Error('Não foi possível registrar esta alteração no projeto.');
        setStatus('Alteração registrada no projeto.'); setError('');
      } catch (cause) { failure = (cause as Error).message; setError(failure); }
      sendSnapshot.current('ack', { accepted, sequence: message.sequence, error: failure });
    };
    window.addEventListener('message', receive);
    const timer = window.setTimeout(() => { if (!ready.current) setError('O editor não carregou. Recarregue a página para tentar novamente.'); }, 20000);
    return () => { window.removeEventListener('message', receive); window.clearTimeout(timer); };
  }, [mapId, session]);
  useEffect(() => { if (ready.current && version !== sentVersion.current) sendSnapshot.current(); }, [version]);
  useEffect(() => {
    const controls = () => { if (ready.current) sendSnapshot.current('controls'); };
    window.addEventListener('rt-graph-changed', controls);
    window.addEventListener('rt-runtime-registered', controls);
    return () => { window.removeEventListener('rt-graph-changed', controls); window.removeEventListener('rt-runtime-registered', controls); };
  }, []);
  if (projectionError) return <div className="bo-service-spaces__error" role="alert">{projectionError}</div>;
  return <>
    <div className="bo-service-spaces__actions">
      <p>{mapId === SERVICE_SPACE ? 'Planeje as salas do serviço. Selecione um mapa acima para vincular suas atividades.' : 'As atividades vêm deste mapa. Edite nomes, tempos e conexões no mapa do serviço.'}</p>
      <div>{mapId !== SERVICE_SPACE && <button className="bo-button bo-button--secondary" onClick={() => onOpenMap(mapId)}>Editar mapa</button>}
        <button className="bo-button bo-button--secondary" disabled={!studio.canUndo} onClick={() => history('undo')}>Desfazer</button>
        <button className="bo-button bo-button--secondary" disabled={!studio.canRedo} onClick={() => history('redo')}>Refazer</button>
        <button className="bo-button bo-button--secondary" onClick={studio.handleExport}>Backup do projeto</button>
      </div>
    </div>
    <p className="bo-service-spaces__status" role="status">{status} <span>Salvamento: {({ saved: 'salvo', saving: 'salvando', error: 'falha ao salvar' })[studio.saveStatus]}</span></p>
    {error && <p className="bo-service-spaces__error" role="alert">{error}</p>}
    <iframe ref={frame} className="bo-service-spaces__frame" title="Editor de salas, planta e ambientes 3D" src={`${import.meta.env.BASE_URL}blue-ocean3d/app/index.html?session=${encodeURIComponent(session)}`} />
  </>;
}

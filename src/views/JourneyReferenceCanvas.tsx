import { useEffect, useRef } from 'react';
import type { StudioController } from '../state/useStudioController';
import type { JourneyReferenceDocument } from '../services/journey-reference-map';
import { applyJourneyReferencePatch, hydrateJourneyReference } from '../services/journey-reference-map';

type HostMessage = {
  boBlueprintHost?: number;
  type?: 'ready' | 'patch' | 'back' | 'blueprint' | 'tools';
  state?: JourneyReferenceDocument;
};

/** Main Journey surface: the original uploaded map, with Service Graph persistence. */
export function JourneyReferenceCanvas({ studio, onBack, onBlueprintDraft }: {
  studio: StudioController;
  onBack?: () => void;
  onBlueprintDraft: () => void | Promise<void>;
}) {
  const { graph, setGraph, journey, showToast, handleExport } = studio;
  const frame = useRef<HTMLIFrameElement>(null);
  const initialGraph = useRef(graph);
  const id = journey.id;
  const onBackRef = useRef(onBack);
  const onBlueprintRef = useRef(onBlueprintDraft);
  const setGraphRef = useRef(setGraph);
  onBackRef.current = onBack;
  onBlueprintRef.current = onBlueprintDraft;
  setGraphRef.current = setGraph;
  // Do not rehydrate while typing, or it would reset focus/undo after every save.
  useEffect(() => {
    initialGraph.current = graph;
    const handler = (event: MessageEvent<HostMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow ||
        event.data?.boBlueprintHost !== 1) return;
      const type = event.data.type;
      if (type === 'ready') {
        frame.current?.contentWindow?.postMessage({
          boBlueprintHost: 1, type: 'hydrate',
          state: hydrateJourneyReference(initialGraph.current, id),
        }, location.origin);
      } else if (type === 'patch' && event.data.state) {
        setGraphRef.current(current => applyJourneyReferencePatch(current, id, event.data.state!), 'Jornada: editar mapa original');
      } else if (type === 'back') {
        onBackRef.current?.();
      } else if (type === 'blueprint') {
        void onBlueprintRef.current();
      } else if (type === 'tools') {
        handleExport();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
    // The frame belongs to the active Journey. Other React graph updates must not reload it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  return (
    <div className="bo-journey-exact" data-journey-reference-original="1"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', minHeight: 360, background: '#f5f7fb' }}>
      <iframe key={id} ref={frame} title="Jornada Blue Ocean — mapa original"
        src="/blueprint-reference-original.html?service-graph=1&journey=1"
        style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#f5f7fb' }} />
    </div>
  );
}

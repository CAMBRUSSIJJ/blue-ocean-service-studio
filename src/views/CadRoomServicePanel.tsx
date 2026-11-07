import { useEffect, useMemo, useState } from 'react';
import type { StudioController } from '../state/useStudioController';
import { dataBridge } from '../runtime/client';
import { cadRoomLink, removeCadRoomLink, saveCadRoomLink } from '../services/cad-room-links';

export type CadNativeRoom = {
  key: string;
  floorId: string;
  roomId: string;
  name: string;
  area: number;
};

type Draft = {
  stageId: string; activity: string; owner: string; resources: string;
  expectedMinutes: string; capacity: string; challenge: string;
};
const blank = (): Draft => ({
  stageId: '', activity: '', owner: '', resources: '',
  expectedMinutes: '', capacity: '', challenge: '',
});

export function CadRoomServicePanel({
  studio, mapId, rooms, selectedRoomKey, onOpenMap,
}: {
  studio: StudioController;
  mapId: string;
  rooms: CadNativeRoom[];
  selectedRoomKey: string | null;
  onOpenMap?: (id: string) => void;
}) {
  const [roomKey, setRoomKey] = useState('');
  const [draft, setDraft] = useState<Draft>(blank);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);
  const graph = studio.graph;
  const roomIds = rooms.map(room => room.key).join('\u001f');

  useEffect(() => {
    if (selectedRoomKey && rooms.some(room => room.key === selectedRoomKey)) {
      setRoomKey(selectedRoomKey);
    } else if (!rooms.some(room => room.key === roomKey)) {
      setRoomKey(rooms[0]?.key ?? '');
    }
  }, [selectedRoomKey, roomIds]);

  const room = rooms.find(item => item.key === roomKey);
  const stored = room ? cadRoomLink(graph, mapId, room.key) : null;
  const savedAt = stored?.updatedAt ?? '';
  useEffect(() => {
    setError('');
    setDraft(stored ? {
      stageId: stored.stageId, activity: stored.activity, owner: stored.owner,
      resources: stored.resources,
      expectedMinutes: stored.expectedMinutes === null ? '' : String(stored.expectedMinutes),
      capacity: stored.capacity === null ? '' : String(stored.capacity),
      challenge: stored.challenge,
    } : blank());
  }, [mapId, roomKey, savedAt]);

  const stageOptions = useMemo(() => graph.service.journeyIds
    .map(id => graph.journeys[id])
    .filter(journey => journey && (mapId === 'service-space' || journey.id === mapId))
    .map(journey => ({
      journey,
      stages: journey.stageIds.map(id => graph.stages[id])
        .filter(stage => stage && stage.journeyId === journey.id),
    }))
    .filter(item => item.stages.length > 0), [graph, mapId]);

  const selectedStage = draft.stageId ? graph.stages[draft.stageId] : null;
  const update = (field: keyof Draft, value: string) =>
    setDraft(current => ({ ...current, [field]: value }));
  const selectStage = (stageId: string) => {
    const stage = graph.stages[stageId];
    setDraft(current => ({
      ...current,
      stageId,
      activity: current.activity || stage?.customerAction || stage?.title || '',
    }));
  };

  const save = () => {
    if (!room || !draft.stageId) {
      setError('Selecione um ambiente e uma etapa da jornada antes de salvar.');
      return;
    }
    const expectedMinutes = draft.expectedMinutes.trim() === '' ? null : Number(draft.expectedMinutes);
    const capacity = draft.capacity.trim() === '' ? null : Number(draft.capacity);
    try {
      const serviceId = graph.service.id;
      const input = {
        roomKey: room.key, floorId: room.floorId, roomName: room.name,
        stageId: draft.stageId, activity: draft.activity, owner: draft.owner,
        resources: draft.resources, expectedMinutes, capacity, challenge: draft.challenge,
      };
      // Validate against canonical state before starting the transaction.
      const currentGraph = dataBridge()?.get() ?? graph;
      saveCadRoomLink(currentGraph, serviceId, mapId, input);
      studio.setGraph(current => saveCadRoomLink(current, serviceId, mapId, input),
        'Ambientes físicos: vincular sala à jornada');
      setError('');
      studio.showToast('Ambiente vinculado à jornada do serviço.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o vínculo.');
    }
  };

  const unlink = () => {
    if (!room || !stored) return;
    try {
      const serviceId = graph.service.id;
      studio.setGraph(current => removeCadRoomLink(current, serviceId, mapId, room.key),
        'Ambientes físicos: desvincular sala da jornada');
      setError('');
      studio.showToast('Vínculo removido. A planta CAD foi preservada.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível remover o vínculo.');
    }
  };

  return <aside className="bo-cad-relations" aria-label="Vínculos do ambiente físico com a jornada">
    <header className="bo-cad-relations__head">
      <div><span className="bo-cad-relations__eyebrow">BLUE OCEAN · CONTEXTO</span>
        <h3>Ambiente e jornada</h3></div>
      <button type="button" className="bo-cad-relations__toggle"
        aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
        {expanded ? 'Recolher' : 'Expandir'}
      </button>
    </header>
    {expanded && <div className="bo-cad-relations__content">
      <p className="bo-cad-relations__intro">Associe uma sala desenhada a uma etapa real do serviço, sem alterar a planta.</p>
      {!rooms.length ? <div className="bo-cad-relations__empty">
        Desenhe e feche as paredes de uma sala no editor. Os ambientes reconhecidos aparecerão aqui.
      </div> : <>
        <label className="bo-cad-relations__field">
          <span>Ambiente físico</span>
          <select value={room?.key ?? ''} onChange={event => setRoomKey(event.target.value)}
            aria-label="Selecionar sala da planta CAD">
            {rooms.map(item => <option key={item.key} value={item.key}>
              {item.name} {Number.isFinite(item.area) ? '· ' + item.area.toFixed(1) + ' m²' : ''}
            </option>)}
          </select>
        </label>
        {room && <>
          <p className="bo-cad-relations__meta">Pavimento da planta · {stored ? 'Vinculado' : 'Sem vínculo'}</p>
          <label className="bo-cad-relations__field">
            <span>Etapa da jornada <em>*</em></span>
            <select value={draft.stageId} onChange={event => selectStage(event.target.value)}
              aria-label="Etapa da jornada para vincular ambiente">
              <option value="">Selecione a etapa…</option>
              {stageOptions.map(({ journey, stages }) => <optgroup label={journey.name} key={journey.id}>
                {stages.map(stage => <option key={stage.id} value={stage.id}>{stage.title}</option>)}
              </optgroup>)}
            </select>
          </label>
          {selectedStage && <p className="bo-cad-relations__stage-detail">
            {selectedStage.customerAction || 'Etapa da jornada'} 
          </p>}
          {!stageOptions.length && <p className="bo-cad-relations__notice">
            Crie uma jornada com etapas para relacionar este ambiente.
          </p>}
          <label className="bo-cad-relations__field">
            <span>Atividade neste ambiente</span>
            <input value={draft.activity} maxLength={240}
              onChange={event => update('activity', event.target.value)}
              placeholder="Ex.: atendimento inicial" />
          </label>
          <label className="bo-cad-relations__field">
            <span>Responsável</span>
            <input value={draft.owner} maxLength={120}
              onChange={event => update('owner', event.target.value)}
              placeholder="Ex.: recepcionista" />
          </label>
          <label className="bo-cad-relations__field">
            <span>Recursos</span>
            <textarea value={draft.resources} maxLength={500} rows={2}
              onChange={event => update('resources', event.target.value)}
              placeholder="Ex.: computador, balcão e sinalização" />
          </label>
          <div className="bo-cad-relations__fields-row">
            <label className="bo-cad-relations__field">
              <span>Tempo (min)</span>
              <input type="number" min={0} max={10080} step="1"
                value={draft.expectedMinutes}
                onChange={event => update('expectedMinutes', event.target.value)} />
            </label>
            <label className="bo-cad-relations__field">
              <span>Capacidade</span>
              <input type="number" min={1} max={100000} step="1"
                value={draft.capacity}
                onChange={event => update('capacity', event.target.value)} />
            </label>
          </div>
          <label className="bo-cad-relations__field">
            <span>Problema ou necessidade</span>
            <textarea value={draft.challenge} maxLength={1000} rows={2}
              onChange={event => update('challenge', event.target.value)}
              placeholder="Ex.: formação de filas na chegada" />
          </label>
          {error && <p className="bo-cad-relations__error" role="alert">{error}</p>}
          <div className="bo-cad-relations__actions">
            <button type="button" className="bo-cad-relations__primary"
              disabled={!draft.stageId || !stageOptions.length}
              onClick={save}>Salvar vínculo</button>
            {stored && <button type="button" className="bo-cad-relations__secondary"
              onClick={unlink}>Desvincular</button>}
          </div>
          {stored && <p className="bo-cad-relations__saved" role="status">Vínculo registrado no serviço.</p>}
          {stored && selectedStage && onOpenMap && <button className="bo-cad-relations__open"
            type="button" onClick={() => onOpenMap(selectedStage.journeyId)}>
            Abrir jornada relacionada ↗
          </button>}
        </>}
      </>}
    </div>}
  </aside>;
}

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, CircleHelp, Link2, Plus, RefreshCw, Trash2,
} from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { ChannelContinuityRating, Id, ServiceChannelKind } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import { ServiceUsageRelations } from '../components/ServiceUsageRelations';
import {
  assignTouchpointChannel, buildChannelContinuityReport, CHANNEL_KIND_META, CONTINUITY_DIMENSIONS,
  createServiceChannel, materializeLegacyChannels, removeServiceChannel, setChannelHandoffNote,
  setChannelHandoffRating, updateServiceChannel,
} from '../services/channel-continuity';

type ChannelPane = 'map' | 'touchpoints' | 'handoffs';

const isUnclassified = (name: string) => /n[aã]o classificado|sem canal|unknown|unclassified/i.test(name);
const scoreLabel = (score: number | null) => score === null ? 'Não avaliado' : score >= 85 ? 'Contínuo' : score >= 65 ? 'Atenção' : 'Quebra relevante';
const ratingLabel: Record<ChannelContinuityRating, string> = { unknown: 'Não avaliado', pass: 'Preservado', fail: 'Quebra' };

export function ChannelContinuityView({ studio }: { studio: StudioController }) {
  const { graph, setGraph, showToast } = studio;
  const [pane, setPane] = useState<ChannelPane>('map');
  const [channelName, setChannelName] = useState('');
  const [channelKind, setChannelKind] = useState<ServiceChannelKind>('digital');
  const [selectedTouchpointId, setSelectedTouchpointId] = useState<Id | null>(null);
  const report = useMemo(() => buildChannelContinuityReport(graph), [graph]);
  const canonicalGraph = report.normalizedGraph;
  const hasPendingMaterialization = Object.values(graph.touchpoints).some((point) => !point.channelId || !graph.channels?.[point.channelId]);

  const selectedTouchpoint = selectedTouchpointId ? canonicalGraph.touchpoints[selectedTouchpointId] : null;

  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{ kind?: string; id?: string }>).detail || {};
      if (detail.kind !== 'touchpoint' || !detail.id || !canonicalGraph.touchpoints[detail.id]) return;
      setPane('touchpoints'); setSelectedTouchpointId(detail.id);
    };
    try {
      const raw = sessionStorage.getItem('bo-service-object-focus');
      if (raw) { const detail = JSON.parse(raw) as { kind?: string; id?: string }; if (detail.kind === 'touchpoint' && detail.id && canonicalGraph.touchpoints[detail.id]) { setPane('touchpoints'); setSelectedTouchpointId(detail.id); sessionStorage.removeItem('bo-service-object-focus'); } }
    } catch { /* optional navigation focus */ }
    window.addEventListener('bo-service-object-focus', focus);
    return () => window.removeEventListener('bo-service-object-focus', focus);
  }, [canonicalGraph.touchpoints]);


  const stageNamesByTouchpoint = useMemo(() => {
    const result = new Map<Id, string[]>();
    for (const stage of Object.values(canonicalGraph.stages)) {
      for (const touchpointId of stage.touchpointIds) result.set(touchpointId, [...(result.get(touchpointId) ?? []), stage.title]);
    }
    return result;
  }, [canonicalGraph.stages]);

  const persistLegacyChannels = () => {
    const result = materializeLegacyChannels(graph);
    setGraph(() => result.graph, 'H7.29: materializar canais legados');
    showToast(result.linkedTouchpointIds.length || result.createdChannelIds.length
      ? `${result.linkedTouchpointIds.length} touchpoints conectados a ${result.createdChannelIds.length} novos canais.`
      : 'Canais já estavam sincronizados.');
  };

  const addChannel = () => {
    const name = channelName.trim();
    if (!name) { showToast('Informe o nome do canal.'); return; }
    const result = createServiceChannel({ graph, name, kind: channelKind });
    if (!result.channelId) { showToast('Não foi possível criar o canal.'); return; }
    setGraph(() => result.graph, 'H7.29: criar canal');
    setChannelName('');
    showToast(result.created ? 'Canal criado.' : 'Este canal já existia.');
  };

  const deleteChannel = (channelId: Id) => {
    const result = removeServiceChannel(graph, channelId);
    if (!result.removed) { showToast(result.reason ?? 'Não foi possível remover o canal.'); return; }
    setGraph(() => result.graph, 'H7.29: remover canal');
    showToast('Canal removido.');
  };

  const setPointChannel = (touchpointId: Id, channelId: Id) => {
    if (!channelId) return;
    setGraph((current) => assignTouchpointChannel(current, touchpointId, channelId), 'H7.29: classificar touchpoint');
  };

  const setRating = (fromId: Id, toId: Id, dimension: Parameters<typeof setChannelHandoffRating>[3], value: ChannelContinuityRating) => {
    setGraph((current) => setChannelHandoffRating(current, fromId, toId, dimension, value), 'H7.29: avaliar handoff');
  };

  return <section className="bo-h729-channels" data-channel-continuity="7.29">
    <header className="bo-h729-head">
      <div>
        <div className="bo-h729-eyebrow"><BlueOceanObjectIcon kind="channel" size={16}/> EXPERIÊNCIA OMNICHANNEL</div>
        <h2>Canais & Continuidade</h2>
        <p>Separe o meio de entrega do ponto de contato e descubra onde a experiência quebra quando o cliente muda de canal.</p>
      </div>
      {hasPendingMaterialization && <button type="button" onClick={persistLegacyChannels}><RefreshCw size={15}/> Sincronizar canais existentes</button>}
    </header>

    <div className="bo-h729-kpis">
      <article><small>CANAIS</small><strong>{report.channelCount}</strong><span>{report.touchpointCount} touchpoints no serviço</span></article>
      <article className={report.mappedTouchpointCoverage >= 90 ? 'is-good' : 'is-warn'}><small>TOUCHPOINTS CLASSIFICADOS</small><strong>{report.mappedTouchpointCoverage}%</strong><span>{report.mappedTouchpointCount}/{report.touchpointCount || 0} com canal explícito</span></article>
      <article><small>TROCAS DE CANAL</small><strong>{report.switchCount}</strong><span>{report.transitions.length} handoffs distintos</span></article>
      <article className={report.continuityScore === null ? '' : report.continuityScore >= 85 ? 'is-good' : 'is-warn'}><small>CONTINUIDADE</small><strong>{report.continuityScore ?? '—'}</strong><span>{scoreLabel(report.continuityScore)} · {report.assessmentCoverage}% avaliado</span></article>
    </div>

    <nav className="bo-h729-tabs" aria-label="Canais e continuidade">
      <button type="button" className={pane === 'map' ? 'active' : ''} onClick={() => setPane('map')}>Mapa omnichannel</button>
      <button type="button" className={pane === 'touchpoints' ? 'active' : ''} onClick={() => setPane('touchpoints')}>Canais & touchpoints</button>
      <button type="button" className={pane === 'handoffs' ? 'active' : ''} onClick={() => setPane('handoffs')}>Handoffs <em>{report.transitions.length}</em></button>
    </nav>

    {pane === 'map' && <div className="bo-h729-map-pane">
      <div className="bo-h729-pane-title"><div><small>CHANNEL VIEW</small><h3>Como cada Journey atravessa os canais</h3><p>Cada linha é um canal; cada coluna é uma etapa. O conteúdo da célula é o touchpoint real, não o nome do canal.</p></div></div>
      {!report.journeys.length && <div className="bo-h729-empty"><BlueOceanObjectIcon kind="journey" size={30}/><strong>Nenhuma Journey estruturada</strong><p>Crie uma Journey e conecte touchpoints para formar o mapa omnichannel.</p></div>}
      {report.journeys.map((journey) => <section key={journey.journeyId} className="bo-h729-journey-map">
        <header><div><BlueOceanObjectIcon kind="journey" size={17}/><strong>{journey.name}</strong></div><span>{journey.stages.length} etapas</span></header>
        {journey.stages.length ? <div className="bo-h729-matrix" style={{ '--bo-h729-stage-count': Math.max(1, journey.stages.length) } as CSSProperties}>
          <div className="bo-h729-corner">CANAL \ ETAPA</div>
          {journey.stages.map((stage, index) => <div key={stage.stageId} className="bo-h729-stage-head"><small>{String(index + 1).padStart(2, '0')}</small><strong>{stage.title}</strong></div>)}
          {report.channels.filter((channel) => !isUnclassified(channel.name)).map((channel) => <div key={channel.id} className="bo-h729-matrix-row" style={{ display: 'contents' }}>
            <div className="bo-h729-channel-head"><BlueOceanObjectIcon kind="channel" size={15}/><div><strong>{channel.name}</strong><span>{CHANNEL_KIND_META[channel.kind].label}</span></div></div>
            {journey.stages.map((stage) => {
              const points = stage.touchpointIds.map((id) => canonicalGraph.touchpoints[id]).filter((point) => point?.channelId === channel.id);
              return <div key={`${channel.id}:${stage.stageId}`} className={`bo-h729-map-cell ${points.length ? 'is-used' : ''}`}>{points.map((point) => <span key={point.id}><BlueOceanObjectIcon kind="touchpoint" size={12}/>{point.name}</span>)}{!points.length && <i>—</i>}</div>;
            })}
          </div>)}
        </div> : <div className="bo-h729-empty-inline">Journey sem etapas.</div>}
      </section>)}
      {report.issues.length > 0 && <section className="bo-h729-issues"><header><div><AlertTriangle size={17}/><strong>Pontos de atenção</strong></div><span>{report.issues.length}</span></header>{report.issues.slice(0, 8).map((issue) => <article key={issue.id} data-severity={issue.severity}><i/><div><strong>{issue.label}</strong><span>{issue.detail}</span></div></article>)}</section>}
    </div>}

    {pane === 'touchpoints' && <div className="bo-h729-touchpoint-pane">
      <section className="bo-h729-create-channel">
        <div><small>CANAL CANÔNICO</small><h3>Novo canal</h3><p>Ex.: WhatsApp é um canal. “Mensagem de confirmação da coleta” é um touchpoint.</p></div>
        <label><span>Nome</span><input value={channelName} onChange={(event) => setChannelName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addChannel(); }} placeholder="Ex.: WhatsApp"/></label>
        <label><span>Tipo</span><select value={channelKind} onChange={(event) => setChannelKind(event.target.value as ServiceChannelKind)}>{(Object.keys(CHANNEL_KIND_META) as ServiceChannelKind[]).map((kind) => <option key={kind} value={kind}>{CHANNEL_KIND_META[kind].label}</option>)}</select></label>
        <button type="button" className="primary" onClick={addChannel}><Plus size={15}/> Adicionar canal</button>
      </section>

      <div className="bo-h729-channel-grid">
        {report.channels.map((channel) => {
          const count = Object.values(canonicalGraph.touchpoints).filter((point) => point.channelId === channel.id).length;
          return <article key={channel.id} className={isUnclassified(channel.name) ? 'is-unclassified' : ''}>
            <header><BlueOceanObjectIcon kind="channel" size={20}/><div><input value={channel.name} onChange={(event) => setGraph((current) => updateServiceChannel(current, channel.id, { name: event.target.value }), 'H7.29: renomear canal')}/><span>{count} touchpoint{count === 1 ? '' : 's'}</span></div><button type="button" onClick={() => deleteChannel(channel.id)} aria-label={`Excluir ${channel.name}`}><Trash2 size={14}/></button></header>
            <label>Tipo<select value={channel.kind} onChange={(event) => setGraph((current) => updateServiceChannel(current, channel.id, { kind: event.target.value as ServiceChannelKind }), 'H7.29: tipo de canal')}>{(Object.keys(CHANNEL_KIND_META) as ServiceChannelKind[]).map((kind) => <option key={kind} value={kind}>{CHANNEL_KIND_META[kind].label}</option>)}</select></label>
            <label>Descrição<textarea value={channel.description ?? ''} onChange={(event) => setGraph((current) => updateServiceChannel(current, channel.id, { description: event.target.value }), 'H7.29: descrição de canal')} placeholder={CHANNEL_KIND_META[channel.kind].description}/></label>
          </article>;
        })}
      </div>

      <section className="bo-h729-touchpoint-table">
        <header><div><BlueOceanObjectIcon kind="touchpoint" size={18}/><div><strong>Touchpoints do serviço</strong><span>Classifique cada interação em um canal canônico.</span></div></div><span>{report.touchpointCount}</span></header>
        <div className="bo-h729-touchpoint-rows">
          {Object.values(canonicalGraph.touchpoints).map((point) => <div key={point.id} className={report.unclassifiedTouchpointIds.includes(point.id) ? 'is-unclassified' : ''}>
            <button type="button" className={`bo-h152-touchpoint-open ${selectedTouchpointId === point.id ? 'is-selected' : ''}`} onClick={() => setSelectedTouchpointId(point.id)}><strong>{point.name}</strong><span>{(stageNamesByTouchpoint.get(point.id) ?? ['Sem etapa']).join(' · ')}</span></button>
            <ArrowRight size={14}/>
            <select value={point.channelId ?? ''} onChange={(event) => setPointChannel(point.id, event.target.value)}>{report.channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select>
          </div>)}
          {!report.touchpointCount && <div className="bo-h729-empty-inline">Nenhum touchpoint cadastrado.</div>}
        </div>
        {selectedTouchpoint && <div className="bo-h152-touchpoint-relations"><ServiceUsageRelations graph={graph} kind="touchpoint" id={selectedTouchpoint.id} title={`Uso e relações · ${selectedTouchpoint.name}`} compact/></div>}
      </section>
    </div>}

    {pane === 'handoffs' && <div className="bo-h729-handoff-pane">
      <div className="bo-h729-pane-title"><div><small>CHANNEL CONTINUITY</small><h3>Avalie as trocas de canal que realmente acontecem</h3><p>O score usa cinco dimensões: contexto, identidade, responsabilidade, expectativa e visibilidade de status.</p></div><span><b>{report.assessmentCoverage}%</b> cobertura da avaliação</span></div>
      {!report.transitions.length && <div className="bo-h729-empty"><Link2 size={28}/><strong>Nenhuma troca de canal detectada</strong><p>Quando etapas consecutivas usam canais diferentes, o handoff aparece aqui automaticamente.</p></div>}
      <div className="bo-h729-handoff-list">
        {report.transitions.map((transition) => <article key={transition.key} className="bo-h729-handoff-card">
          <header><div className="bo-h729-route"><span><BlueOceanObjectIcon kind="channel" size={16}/>{transition.fromName}</span><ArrowRight size={16}/><span><BlueOceanObjectIcon kind="channel" size={16}/>{transition.toName}</span></div><div className="bo-h729-handoff-score"><strong>{transition.score ?? '—'}</strong><span>{scoreLabel(transition.score)}</span></div></header>
          <div className="bo-h729-occurrences"><span>{transition.occurrences} ocorrência{transition.occurrences === 1 ? '' : 's'}</span>{transition.stagePairs.slice(0, 3).map((pair, index) => <em key={`${pair.fromStageId}:${pair.toStageId}:${index}`}>{pair.fromStageTitle} → {pair.toStageTitle}</em>)}</div>
          <div className="bo-h729-dimensions">{CONTINUITY_DIMENSIONS.map((dimension) => <label key={dimension.key} data-rating={transition.ratings[dimension.key]}><span>{transition.ratings[dimension.key] === 'pass' ? <CheckCircle2 size={14}/> : transition.ratings[dimension.key] === 'fail' ? <AlertTriangle size={14}/> : <CircleHelp size={14}/>}<b>{dimension.short}</b><small>{dimension.description}</small></span><select value={transition.ratings[dimension.key]} onChange={(event) => setRating(transition.fromChannelId, transition.toChannelId, dimension.key, event.target.value as ChannelContinuityRating)}><option value="unknown">{ratingLabel.unknown}</option><option value="pass">{ratingLabel.pass}</option><option value="fail">{ratingLabel.fail}</option></select></label>)}</div>
          <label className="bo-h729-note"><span>Nota do handoff</span><textarea value={transition.assessment?.note ?? ''} onChange={(event) => setGraph((current) => setChannelHandoffNote(current, transition.fromChannelId, transition.toChannelId, event.target.value), 'H7.29: nota de handoff')} placeholder="Descreva o que se perde, quem assume e qual melhoria seria necessária."/></label>
        </article>)}
      </div>
    </div>}
  </section>;
}

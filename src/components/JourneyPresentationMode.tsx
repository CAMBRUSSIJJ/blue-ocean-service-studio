/**
 * JourneyPresentationMode — C2.3
 * Fullscreen slide view of a journey's stages.
 * One stage per slide, keyboard ←→ navigation, no editing UI.
 * Shows: stage name, touchpoints, emotion, problems, notes.
 */
import { useEffect, useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';
import type { ServiceGraph, Stage, Emotion } from '../domain/model';

const EMOTION_LABEL: Record<Emotion, string> = {
  positive: '😊 Positiva',
  neutral: '😐 Neutra',
  negative: '😟 Negativa',
};
const EMOTION_CLASS: Record<Emotion, string> = {
  positive: 'is-positive',
  neutral: 'is-neutral',
  negative: 'is-negative',
};

type Props = {
  graph: ServiceGraph;
  journeyId: string;
  onClose: () => void;
};

export function JourneyPresentationMode({ graph, journeyId, onClose }: Props) {
  const journey = graph.journeys[journeyId];
  const stages: Stage[] = journey
    ? journey.stageIds.map((id) => graph.stages[id]).filter(Boolean)
    : [];
  const [index, setIndex] = useState(0);
  const total = stages.length;

  const goNext = useCallback(() => setIndex((i) => Math.min(i + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); goNext(); }
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); goPrev(); }
      else if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, onClose]);

  if (!journey || total === 0) {
    return (
      <div className="bo-c2-present-backdrop" role="dialog" aria-modal="true" aria-label="Modo apresentação">
        <button type="button" className="bo-c2-present-close" onClick={onClose} aria-label="Fechar apresentação"><X size={18}/></button>
        <div className="bo-c2-present-empty">
          <BlueOceanObjectIcon kind="journey" size={32}/>
          <strong>Jornada sem etapas</strong>
          <p>Adicione etapas para apresentar.</p>
        </div>
      </div>
    );
  }

  const stage = stages[index]!;
  const touchpoints = stage.touchpointIds?.map((id) => graph.touchpoints?.[id]).filter(Boolean) ?? [];
  const problems = [
    ...stage.validatedProblemIds?.map((id) => graph.entities?.problem?.[id]).filter(Boolean) ?? [],
    ...stage.problemIds?.map((id) => graph.problems?.[id]).filter(Boolean) ?? [],
  ];
  const opportunities = stage.opportunityIds?.map((id) => graph.opportunities?.[id]).filter(Boolean) ?? [];

  return (
    <div
      className="bo-c2-present-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Apresentação: ${journey.name}`}
      data-journey-presentation="c2.3"
    >
      {/* Top bar */}
      <header className="bo-c2-present-topbar">
        <span className="bo-c2-present-title">
          <BlueOceanObjectIcon kind="journey" size={16}/>
          {journey.name}
        </span>
        <span className="bo-c2-present-counter">{index + 1} / {total}</span>
        <button type="button" className="bo-c2-present-close" onClick={onClose} aria-label="Fechar apresentação">
          <X size={18}/>
        </button>
      </header>

      {/* Slide */}
      <main className="bo-c2-present-slide">
        <div className="bo-c2-present-slide-inner">
          <div className="bo-c2-present-stage-meta">
            <span className="bo-c2-present-step">ETAPA {index + 1}</span>
            {stage.emotion && stage.emotion !== 'neutral' && (
              <span className={`bo-c2-present-emotion ${EMOTION_CLASS[stage.emotion]}`}>
                {EMOTION_LABEL[stage.emotion]}
              </span>
            )}
          </div>

          <h1 className="bo-c2-present-stage-name">{stage.title || `Etapa ${index + 1}`}</h1>

          {stage.customerAction && (
            <p className="bo-c2-present-action">{stage.customerAction}</p>
          )}

          {touchpoints.length > 0 && (
            <div className="bo-c2-present-section">
              <small>TOUCHPOINTS</small>
              <ul className="bo-c2-present-tags">
                {touchpoints.map((tp) => (
                  <li key={tp!.id}><BlueOceanObjectIcon kind="channel" size={12}/> {tp!.name}</li>
                ))}
              </ul>
            </div>
          )}

          {problems.length > 0 && (
            <div className="bo-c2-present-section is-problems">
              <small>PROBLEMAS NESTA ETAPA</small>
              <ul className="bo-c2-present-problems">
                {problems.slice(0, 4).map((p) => (
                  <li key={(p as { id: string }).id}>{(p as { title?: string; description?: string; text?: string }).title ?? (p as { description?: string }).description ?? (p as { text?: string }).text ?? '—'}</li>
                ))}
              </ul>
            </div>
          )}

          {opportunities.length > 0 && (
            <div className="bo-c2-present-section is-opportunities">
              <small>OPORTUNIDADES</small>
              <ul className="bo-c2-present-tags">
                {opportunities.slice(0, 3).map((o) => (
                  <li key={(o as { id: string }).id}>{(o as { title?: string; text?: string }).title ?? (o as { text?: string }).text ?? '—'}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Nav */}
      <nav className="bo-c2-present-nav" aria-label="Navegação entre etapas">
        <button
          type="button"
          className="bo-c2-present-nav-btn"
          onClick={goPrev}
          disabled={index === 0}
          aria-label="Etapa anterior"
        >
          <ChevronLeft size={22}/>
        </button>

        <div className="bo-c2-present-dots" aria-hidden="true">
          {stages.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`bo-c2-present-dot ${i === index ? 'is-active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Ir para etapa ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          className="bo-c2-present-nav-btn"
          onClick={goNext}
          disabled={index === total - 1}
          aria-label="Próxima etapa"
        >
          <ChevronRight size={22}/>
        </button>
      </nav>

      <div className="bo-c2-present-hint" aria-hidden="true">Use ← → para navegar · ESC para sair</div>
    </div>
  );
}

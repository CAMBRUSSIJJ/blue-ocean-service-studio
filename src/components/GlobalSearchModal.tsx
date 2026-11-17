// GlobalSearchModal — Ciclo 1 · Busca global (Ctrl+K)
// Searches across journeys, stages, personas, needs, pains, problems and evidence
// in the active service graph. Zero new library dependencies.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ServiceGraph } from '../domain/model';
import { Search, X, Map as MapIcon, User, AlertCircle, Lightbulb, BookOpen, Layers, ArrowRight } from '../design-system/icons';

// ── Types ───────────────────────────────────────────────────────────────────

export type ResultKind = 'journey' | 'stage' | 'persona' | 'need' | 'pain' | 'problem' | 'evidence';

interface SearchResult {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle?: string;
  journeyName?: string;
}

interface GlobalSearchModalProps {
  graph: ServiceGraph | null;
  open: boolean;
  onClose: () => void;
  /** Navigate to a found item by kind and id */
  onNavigate?: (kind: ResultKind, id: string) => void;
}

// ── Icon helper ──────────────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: ResultKind }) {
  const size = 14;
  switch (kind) {
    case 'journey': return <MapIcon size={size} />;
    case 'stage':   return <Layers size={size} />;
    case 'persona': return <User size={size} />;
    case 'need':    return <Lightbulb size={size} />;
    case 'pain':
    case 'problem': return <AlertCircle size={size} />;
    case 'evidence': return <BookOpen size={size} />;
  }
}

const KIND_LABEL: Record<ResultKind, string> = {
  journey: 'Journey',
  stage: 'Etapa',
  persona: 'Persona',
  need: 'Necessidade',
  pain: 'Dor',
  problem: 'Problema',
  evidence: 'Evidência',
};

// ── Build results from graph ─────────────────────────────────────────────────

function buildResults(graph: ServiceGraph): SearchResult[] {
  const results: SearchResult[] = [];

  // Journeys
  for (const journey of Object.values(graph.journeys ?? {})) {
    results.push({ id: journey.id, kind: 'journey', title: journey.name || 'Journey sem nome' });
  }

  // Stages
  for (const stage of Object.values(graph.stages ?? {})) {
    const journey = stage.journeyId ? graph.journeys?.[stage.journeyId] : undefined;
    results.push({
      id: stage.id, kind: 'stage',
      title: stage.title || 'Etapa sem nome',
      subtitle: stage.customerAction || undefined,
      journeyName: journey?.name,
    });
  }

  // Entities
  const entityMap: Array<{ entityKind: string; kind: ResultKind }> = [
    { entityKind: 'persona', kind: 'persona' },
    { entityKind: 'need', kind: 'need' },
    { entityKind: 'pain', kind: 'pain' },
    { entityKind: 'problem', kind: 'problem' },
    { entityKind: 'evidence', kind: 'evidence' },
  ];
  for (const { entityKind, kind } of entityMap) {
    for (const entity of Object.values(graph.entities?.[entityKind] ?? {})) {
      const title = (entity.title || entity.name || '').trim();
      if (!title) continue;
      results.push({ id: entity.id, kind, title, subtitle: entity.description?.trim() || undefined });
    }
  }

  return results;
}

// ── Search logic ─────────────────────────────────────────────────────────────

function search(results: SearchResult[], query: string): SearchResult[] {
  const q = query.trim().toLocaleLowerCase('pt-BR');
  if (!q) return results.slice(0, 12);
  return results.filter(
    (item) =>
      item.title.toLocaleLowerCase('pt-BR').includes(q) ||
      (item.subtitle ?? '').toLocaleLowerCase('pt-BR').includes(q) ||
      (item.journeyName ?? '').toLocaleLowerCase('pt-BR').includes(q) ||
      KIND_LABEL[item.kind].toLocaleLowerCase('pt-BR').includes(q),
  ).slice(0, 20);
}

// ── Inline styles ─────────────────────────────────────────────────────────────

const CSS = `
.bo-gsearch-backdrop {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(10, 20, 40, 0.48);
  display: flex; align-items: flex-start; justify-content: center;
  padding-top: 10vh;
  animation: bo-gsearch-fade .12s ease;
}
@keyframes bo-gsearch-fade { from { opacity: 0 } to { opacity: 1 } }

.bo-gsearch-box {
  background: #fff; border-radius: 16px;
  box-shadow: 0 24px 60px rgba(10, 20, 60, 0.26), 0 4px 12px rgba(10, 20, 60, 0.12);
  width: 100%; max-width: 580px; overflow: hidden;
  animation: bo-gsearch-up .15s ease;
}
@keyframes bo-gsearch-up { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

.bo-gsearch-input-row {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; border-bottom: 1px solid #eef0f3;
}
.bo-gsearch-input-row svg { color: #667085; flex-shrink: 0 }
.bo-gsearch-input-row input {
  flex: 1; border: 0; outline: none; font-size: 15px; color: #172033;
  background: transparent; min-width: 0;
}
.bo-gsearch-input-row input::placeholder { color: #94a3b8 }
.bo-gsearch-close {
  border: 0; background: 0; cursor: pointer; color: #94a3b8; padding: 4px; border-radius: 6px;
  display: grid; place-items: center;
}
.bo-gsearch-close:hover { background: #f1f3f5; color: #475569 }

.bo-gsearch-results {
  max-height: 52vh; overflow-y: auto; padding: 8px;
}
.bo-gsearch-results:empty + .bo-gsearch-empty { display: flex }
.bo-gsearch-empty {
  display: none; align-items: center; justify-content: center;
  flex-direction: column; gap: 6px;
  padding: 36px 24px; color: #94a3b8; font-size: 13px;
}
.bo-gsearch-empty strong { color: #64748b; font-size: 14px }

.bo-gsearch-item {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; border-radius: 10px; cursor: pointer;
  border: 0; background: 0; width: 100%; text-align: left;
  color: #172033;
}
.bo-gsearch-item:hover, .bo-gsearch-item.is-active {
  background: #f0f6ff;
}
.bo-gsearch-item__icon {
  width: 30px; height: 30px; border-radius: 8px;
  background: #eef3fb; color: #2563eb;
  display: grid; place-items: center; flex-shrink: 0;
}
.bo-gsearch-item__body { flex: 1; min-width: 0 }
.bo-gsearch-item__title {
  font-size: 13px; font-weight: 600; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; color: #172033;
}
.bo-gsearch-item__sub {
  font-size: 11px; color: #64748b; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; margin-top: 1px;
}
.bo-gsearch-item__badge {
  font-size: 10px; font-weight: 700; letter-spacing: .04em;
  color: #3b82f6; background: #eff6ff; padding: 2px 7px;
  border-radius: 20px; flex-shrink: 0;
}
.bo-gsearch-item__arrow { color: #cbd5e1; flex-shrink: 0 }

.bo-gsearch-footer {
  padding: 8px 16px; border-top: 1px solid #eef0f3;
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11px; color: #94a3b8;
}
.bo-gsearch-footer kbd {
  background: #f1f5f9; border: 1px solid #dde1e7;
  border-radius: 4px; padding: 1px 5px; font-family: inherit;
  font-size: 10px; color: #64748b;
}
`;

// ── Component ─────────────────────────────────────────────────────────────────

export function GlobalSearchModal({ graph, open, onClose, onNavigate }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allResults = useMemo(() => graph ? buildResults(graph) : [], [graph]);
  const results = useMemo(() => search(allResults, query), [allResults, query]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) { setQuery(''); setActiveIndex(0); requestAnimationFrame(() => inputRef.current?.focus()); }
  }, [open]);

  // Keep activeIndex in range
  useEffect(() => { setActiveIndex(0); }, [results]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, results.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && results[activeIndex]) { e.preventDefault(); handleSelect(results[activeIndex]); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, activeIndex]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>('.bo-gsearch-item.is-active');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleSelect = (result: SearchResult) => {
    onNavigate?.(result.kind, result.id);
    onClose();
  };

  if (!open) return null;

  const hasResults = results.length > 0;

  return (
    <>
      <style>{CSS}</style>
      <div
        className="bo-gsearch-backdrop"
        role="presentation"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bo-gsearch-box" role="dialog" aria-modal="true" aria-label="Busca global">
          <div className="bo-gsearch-input-row">
            <Search size={18} />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar journeys, etapas, personas, evidências…"
              aria-label="Campo de busca"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" className="bo-gsearch-close" onClick={onClose} aria-label="Fechar busca"><X size={16} /></button>
          </div>

          <div className="bo-gsearch-results" ref={listRef} role="listbox">
            {results.map((item, idx) => (
              <button
                key={`${item.kind}-${item.id}`}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                className={`bo-gsearch-item${idx === activeIndex ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => handleSelect(item)}
              >
                <span className="bo-gsearch-item__icon"><KindIcon kind={item.kind} /></span>
                <span className="bo-gsearch-item__body">
                  <span className="bo-gsearch-item__title">{item.title}</span>
                  {(item.subtitle || item.journeyName) && (
                    <span className="bo-gsearch-item__sub">
                      {item.journeyName ? `${item.journeyName}${item.subtitle ? ' · ' + item.subtitle : ''}` : item.subtitle}
                    </span>
                  )}
                </span>
                <span className="bo-gsearch-item__badge">{KIND_LABEL[item.kind]}</span>
                <ArrowRight size={13} className="bo-gsearch-item__arrow" />
              </button>
            ))}
          </div>

          {!hasResults && (
            <div className="bo-gsearch-empty">
              <Search size={24} />
              <strong>Nenhum resultado encontrado</strong>
              <span>Tente outro termo ou verifique o serviço ativo.</span>
            </div>
          )}

          <div className="bo-gsearch-footer">
            <span><kbd>↑↓</kbd> Navegar · <kbd>Enter</kbd> Abrir · <kbd>Esc</kbd> Fechar</span>
            <span>{results.length} resultado{results.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </>
  );
}

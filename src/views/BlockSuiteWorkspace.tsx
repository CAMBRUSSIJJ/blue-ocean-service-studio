import { useEffect, useRef, useState } from 'react';
import './blocksuite-workspace.css';

type Props = {
  boardId: string;
  boardName: string;
  serviceId: string;
  onClose: () => void;
};

/**
 * Opt-in BlockSuite editor. It is a separate Yjs canvas; neither a migration
 * nor a write-back to ServiceGraph occurs on open, edit, or close.
 */
export function BlockSuiteWorkspace({ boardId, boardName, serviceId, onClose }: Props) {
  const [availability, setAvailability] = useState<'checking' | 'ready' | 'missing'>('checking');
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const controller = new AbortController();
    closeRef.current?.focus();
    const check = async () => {
      try {
        const response = await fetch('/blocksuite/blue-ocean-blocksuite.json', {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Integração não compilada');
        const manifest: unknown = await response.json();
        if (!manifest || typeof manifest !== 'object' ||
            !('integration' in manifest) || manifest.integration !== 'blue-ocean-blocksuite') {
          throw new Error('Manifesto inválido');
        }
        if (!controller.signal.aborted) setAvailability('ready');
      } catch {
        if (!controller.signal.aborted) setAvailability('missing');
      }
    };
    void check();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    };
    window.addEventListener('keydown', onEscape);
    return () => {
      controller.abort();
      window.removeEventListener('keydown', onEscape);
      previousFocus?.focus?.();
    };
  }, [onClose]);

  const params = new URLSearchParams({ boardId, serviceId, title: boardName });
  return (
    <div className="bo-bs-overlay" role="dialog" aria-modal="true" aria-labelledby="bo-bs-window-title" data-blocksuite-integration="v1">
      <div className="bo-bs-topbar">
        <div className="bo-bs-topbar__title">
          <span>BLUE OCEAN · WHITEBOARD</span>
          <strong id="bo-bs-window-title">{boardName}</strong>
        </div>
        <span className="bo-bs-topbar__badge">Editor visual experimental</span>
        <button type="button" className="bo-bs-topbar__close" onClick={onClose} ref={closeRef} aria-label="Voltar para os Whiteboards">
          ← Voltar ao projeto
        </button>
      </div>
      {availability === 'checking' && <div className="bo-bs-placeholder" role="status">Preparando editor visual…</div>}
      {availability === 'missing' && (
        <div className="bo-bs-placeholder" role="status">
          <h2>O editor visual ainda não está instalado neste ambiente</h2>
          <p>O Blue Ocean continua funcionando normalmente. Para ativar o BlockSuite nesta versão, compile o adaptador com os comandos do guia <code>docs/blocksuite-integracao.md</code>.</p>
          <button type="button" onClick={onClose}>Continuar no Whiteboard existente</button>
        </div>
      )}
      {availability === 'ready' && (
        <iframe
          title={`Editor visual BlockSuite de ${boardName}`}
          className="bo-bs-frame"
          src={`/blocksuite/index.html?${params.toString()}`}
          sandbox="allow-scripts allow-same-origin allow-downloads"
        />
      )}
    </div>
  );
}

import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** A document editor owns the viewport, including keyboard focus and scrolling. */
export function EditorSurface({ children }: { children: ReactNode }) {
  const [host] = useState(() => {
    const element = document.createElement('div');
    element.className = 'bo-document-editor';
    element.setAttribute('data-document-editor', 'journey');
    return element;
  });
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const previousInert = root?.inert ?? false;
    const previousOverflow = document.body.style.overflow;
    document.body.appendChild(host);
    document.body.classList.add('bo-journey-editor-open');
    document.body.style.overflow = 'hidden';
    if (root) root.inert = true;
    if (!host.contains(document.activeElement)) frame.current?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !frame.current) return;
      const controls = [...frame.current.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href],summary,[tabindex="0"]')]
        .filter(element => element.getClientRects().length && !element.closest('[inert],[hidden]'));
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); frame.current.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === frame.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !host.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', containFocus, true);
    return () => {
      document.removeEventListener('keydown', containFocus, true);
      host.remove();
      document.body.classList.remove('bo-journey-editor-open');
      // A Blueprint may take over while this Journey closes.
      if (!document.querySelector('.bo1174-board')) {
        document.body.style.overflow = previousOverflow;
        if (root) root.inert = previousInert;
        requestAnimationFrame(() => {
          if (root?.inert || document.querySelector('[data-document-editor],.bo1174-board')) return;
          const previousIsControl = previousFocus?.matches('button,input,textarea,select,a[href],summary,[tabindex]') && previousFocus.isConnected && previousFocus.getClientRects().length;
          const destination = previousIsControl ? previousFocus : root?.querySelector<HTMLElement>('[data-journey-library="1"] input') ?? [...(root?.querySelectorAll<HTMLButtonElement>('[data-unified-service-blueprint-workspace] button') ?? [])].find(button => button.getClientRects().length && !button.disabled);
          destination?.focus({ preventScroll: true });
        });
      }
    };
  }, [host]);
  return createPortal(<div ref={frame} className="bo-document-editor-frame" role="region" aria-label="Editor da Jornada" tabIndex={-1} onKeyDown={event => {
    if ((event.ctrlKey || event.metaKey) && ['k', '\\'].includes(event.key.toLowerCase())) event.stopPropagation();
  }}>{children}</div>, host);
}

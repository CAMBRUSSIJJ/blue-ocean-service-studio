import React, { useEffect, type StyleHTMLAttributes, type MouseEventHandler, type ReactNode } from 'react';

/**
 * BlobButton — botão com efeito de bolhas que sobem e se fundem no hover.
 *
 * No hover, 4 blobs sobem de baixo em cascata e preenchem o botão com a cor primária
 * do Blue Ocean, trocando a cor do texto de azul para branco.
 *
 * - Funciona como link (href) ou botão (onClick).
 * - Variantes: "primary" (azul #1e63f0) e "ghost" (slate neutro).
 * - Tamanhos: sm | md | lg — alinhados com os controles do design system (--bo-control-h-*).
 * - Cores via variáveis CSS (--bo-*): segue o tema claro/escuro do projeto.
 * - Sem dependências além do React.
 */

export type BlobButtonProps = {
  children: ReactNode;
  /** Com href, renderiza um <a>. */
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  /** Abre o link em nova aba (só com href). */
  external?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

// React 19 sobe <style href precedence> para o <head> uma única vez.
const HOISTS = Number(React.version.split('.')[0]) >= 19;

function BlobButtonStyles() {
  if (HOISTS) {
    const hoist = {
      href: 'bo-blob-button',
      precedence: 'default',
    } as StyleHTMLAttributes<HTMLStyleElement>;
    return <style {...hoist}>{CSS}</style>;
  }
  return <style hidden dangerouslySetInnerHTML={{ __html: CSS }} />;
}

// O filtro SVG goo precisa estar no DOM — adicionado uma vez por página via useEffect.
let _gooMounted = false;

function useGooFilter() {
  useEffect(() => {
    if (_gooMounted) return
    _gooMounted = true
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    Object.assign(svg.style, { position: "absolute", width: "0", height: "0", overflow: "hidden" })
    svg.setAttribute("aria-hidden", "true")
    svg.setAttribute("focusable", "false")
    svg.innerHTML = `<defs>
      <filter id="bo-goo">
        <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur"/>
        <feColorMatrix in="blur" mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo"/>
        <feBlend in="SourceGraphic" in2="goo"/>
      </filter>
    </defs>`
    document.body.appendChild(svg)
    return () => {
      _gooMounted = false
      svg.remove()
    }
  }, [])
}

const NUM_BLOBS = 4

export function BlobButton({
  children,
  href,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
  className,
  external = false,
  type = "button",
}: BlobButtonProps) {
  useGooFilter()

  const cls = [
    "bo-blob-btn",
    `bo-blob-btn--${variant}`,
    `bo-blob-btn--${size}`,
    disabled && "bo-blob-btn--disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  const inner = (
    <>
      <BlobButtonStyles />
      <span className="bo-blob-btn__inner" aria-hidden="true">
        <span className="bo-blob-btn__blobs">
          {Array.from({ length: NUM_BLOBS }, (_, i) => (
            <span key={i} className="bo-blob-btn__blob" />
          ))}
        </span>
      </span>
      <span className="bo-blob-btn__label">{children}</span>
    </>
  )

  if (href != null && !disabled) {
    return (
      <a
        href={href}
        className={cls}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {inner}
      </a>
    )
  }

  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {inner}
    </button>
  )
}

export default BlobButton

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
/* Blue Ocean BlobButton — usa tokens --bo-* do design system */

/* variantes de cor */
.bo-blob-btn--primary {
  --_bb-blob:    var(--bo-color-primary-600);   /* #1e63f0 */
  --_bb-border:  var(--bo-color-primary-600);
  --_bb-text:    var(--bo-color-primary-600);
  --_bb-text-on: #fff;
}
.bo-blob-btn--ghost {
  --_bb-blob:    var(--bo-color-text-muted);    /* slate neutro */
  --_bb-border:  var(--bo-color-border-strong);
  --_bb-text:    var(--bo-color-text-secondary);
  --_bb-text-on: var(--bo-color-text);
}

/* base */
.bo-blob-btn {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: transparent;
  color: var(--_bb-text);
  font-family: var(--bo-font-sans);
  font-size: var(--bo-font-size-sm);
  font-weight: var(--bo-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-decoration: none;
  border: none;
  outline: none;
  cursor: pointer;
  border-radius: var(--bo-radius-pill);
  transition: color 0.45s;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-appearance: none;
  appearance: none;
  white-space: nowrap;
}

/* borda via ::before */
.bo-blob-btn::before {
  content: "";
  position: absolute;
  inset: 0;
  border: 1.5px solid var(--_bb-border);
  border-radius: var(--bo-radius-pill);
  pointer-events: none;
  z-index: 1;
  transition: border-color 0.45s;
}

/* sombra de profundidade deslocada */
.bo-blob-btn::after {
  content: "";
  position: absolute;
  left: 3px;
  top: 3px;
  width: 100%;
  height: 100%;
  border-radius: var(--bo-radius-pill);
  transition: all 0.3s 0.2s;
  pointer-events: none;
  z-index: -2;
}
.bo-blob-btn:not(.bo-blob-btn--disabled):hover::after {
  left: 0;
  top: 0;
  transition: all 0.3s;
}

/* tamanhos — alinhados com --bo-control-h-* */
.bo-blob-btn--sm { min-height: var(--bo-control-h-sm); padding: 0 16px; font-size: var(--bo-font-size-xs); }
.bo-blob-btn--md { min-height: var(--bo-control-h-md); padding: 0 24px; }
.bo-blob-btn--lg { min-height: var(--bo-control-h-lg); padding: 0 36px; font-size: var(--bo-font-size-md); }

/* label fica na frente dos blobs */
.bo-blob-btn__label {
  position: relative;
  z-index: 2;
  pointer-events: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* container dos blobs */
.bo-blob-btn__inner {
  position: absolute;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  border-radius: var(--bo-radius-pill);
}
.bo-blob-btn__blobs {
  position: relative;
  display: block;
  height: 100%;
  filter: url('#bo-goo');
}

/* os 4 blobs */
.bo-blob-btn__blob {
  position: absolute;
  top: 2px;
  width: 25%;
  height: 100%;
  background: var(--_bb-blob);
  border-radius: 100%;
  transform: translate3d(0, 150%, 0) scale(1.7);
  transition: transform 0.45s;
}
.bo-blob-btn__blob:nth-child(1) { left:  0%; transition-delay: 0s;    }
.bo-blob-btn__blob:nth-child(2) { left: 25%; transition-delay: .08s;  }
.bo-blob-btn__blob:nth-child(3) { left: 50%; transition-delay: .16s;  }
.bo-blob-btn__blob:nth-child(4) { left: 75%; transition-delay: .24s;  }

/* hover */
.bo-blob-btn:not(.bo-blob-btn--disabled):hover .bo-blob-btn__blob {
  transform: translateZ(0) scale(1.7);
}
.bo-blob-btn:not(.bo-blob-btn--disabled):hover {
  color: var(--_bb-text-on);
}
.bo-blob-btn:not(.bo-blob-btn--disabled):hover::before {
  border-color: var(--_bb-blob);
}

/* foco acessível */
.bo-blob-btn:focus-visible {
  outline: none;
  box-shadow: var(--bo-focus-ring);
}

/* desabilitado */
.bo-blob-btn--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* dark mode — primary mantém #1e63f0, ajuste de texto e blob-ghost */
body.dark .bo-blob-btn--primary {
  --_bb-text: var(--bo-ocean-tide);  /* #4b8df8 — mais legível no dark */
}
body.dark .bo-blob-btn--ghost {
  --_bb-text: var(--bo-color-text-secondary);
  --_bb-border: var(--bo-color-border);
  --_bb-text-on: var(--bo-color-text);
}

/* respeita prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .bo-blob-btn__blob,
  .bo-blob-btn::after,
  .bo-blob-btn { transition-duration: 0.01ms !important; }
}
`

import React, { useState, useRef, useEffect, type ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SidebarItem = {
  id: string;
  icon: ReactNode;
  label: string;
  badge?: number;
};

export type CollapsibleSidebarProps = {
  items: SidebarItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  logo?: ReactNode;
  logoName?: string;
  className?: string;
  defaultCollapsed?: boolean;
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const COLLAPSED_W = 68;
const EXPANDED_W = 228;
const ITEM_H = 44;
const ITEM_GAP = 4;

function SidebarStyles() {
  const css = `
.cs-root {
  --cs-bg: #171717;
  --cs-active-bg: #2a2a2a;
  --cs-hover-bg: #202020;
  --cs-text: #e8e8e8;
  --cs-muted: #707070;
  --cs-separator: rgba(255,255,255,.08);
  --cs-badge-bg: #ef4444;
  --cs-badge-text: #fff;
  --cs-radius: 20px;
  --cs-item-radius: 12px;
  --cs-shadow: 0 24px 56px rgba(0,0,0,.44), 0 4px 16px rgba(0,0,0,.28);
  --cs-expanded-w: ${EXPANDED_W}px;
  --cs-collapsed-w: ${COLLAPSED_W}px;
  font-family: var(--bo-font-sans, system-ui, sans-serif);
}

.cs-root {
  position: relative;
  width: var(--cs-expanded-w);
  background: var(--cs-bg);
  border-radius: var(--cs-radius);
  box-shadow: var(--cs-shadow);
  overflow: hidden;
  transition: width 0.36s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  padding: 14px 10px 12px;
  gap: 0;
  user-select: none;
}

.cs-root.is-collapsed {
  width: var(--cs-collapsed-w);
}

/* ── Logo ── */
.cs-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 2px 6px 14px;
  min-width: 0;
  flex-shrink: 0;
}

.cs-logo-mark {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, #f97316 0%, #facc15 100%);
}

.cs-logo-name {
  font-size: 15px;
  font-weight: 650;
  color: var(--cs-text);
  white-space: nowrap;
  overflow: hidden;
  opacity: 1;
  max-width: 140px;
  transition: opacity 0.2s ease, max-width 0.3s ease;
}

.cs-root.is-collapsed .cs-logo-name {
  opacity: 0;
  max-width: 0;
}

/* ── Nav list ── */
.cs-nav {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: ${ITEM_GAP}px;
  min-height: 0;
}

/* ── Active indicator (slides via CSS custom property) ── */
.cs-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: ${ITEM_H}px;
  background: var(--cs-active-bg);
  border-radius: var(--cs-item-radius);
  pointer-events: none;
  /* spring-like cubic-bezier that overshoots slightly */
  transition: top 0.38s cubic-bezier(0.34, 1.42, 0.64, 1);
  top: var(--cs-indicator-top, 0px);
}

/* ── Nav item ── */
.cs-item {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  height: ${ITEM_H}px;
  border-radius: var(--cs-item-radius);
  padding: 0 12px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--cs-muted);
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-align: left;
  width: 100%;
  transition: color 0.18s ease, background-color 0.18s ease;
  white-space: nowrap;
  overflow: hidden;
}

.cs-item:not(.is-active):hover {
  background: var(--cs-hover-bg);
  color: #c0c0c0;
}

.cs-item.is-active {
  color: var(--cs-text);
  font-weight: 600;
}

.cs-item-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  opacity: 0.7;
  transition: opacity 0.18s ease;
}

.cs-item.is-active .cs-item-icon {
  opacity: 1;
}

.cs-item-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.18s ease;
}

.cs-root.is-collapsed .cs-item-label {
  opacity: 0;
  pointer-events: none;
}

/* ── Badge ── */
.cs-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--cs-badge-bg);
  color: var(--cs-badge-text);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  flex-shrink: 0;
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.cs-root.is-collapsed .cs-badge {
  opacity: 0;
  transform: scale(0.6);
  pointer-events: none;
}

/* ── Separator ── */
.cs-separator {
  height: 1px;
  background: var(--cs-separator);
  margin: 10px 2px 6px;
  flex-shrink: 0;
}

/* ── Collapse button ── */
.cs-collapse-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  height: ${ITEM_H}px;
  border-radius: var(--cs-item-radius);
  padding: 0 12px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--cs-muted);
  font-size: 13.5px;
  font-weight: 500;
  text-align: left;
  width: 100%;
  transition: background-color 0.18s ease, color 0.18s ease;
  white-space: nowrap;
  overflow: hidden;
  flex-shrink: 0;
}

.cs-collapse-btn:hover {
  background: var(--cs-hover-bg);
  color: #c0c0c0;
}

.cs-collapse-btn-label {
  opacity: 1;
  transition: opacity 0.18s ease;
}

.cs-root.is-collapsed .cs-collapse-btn-label {
  opacity: 0;
  pointer-events: none;
}

.cs-collapse-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  opacity: 0.6;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.18s ease;
}

.cs-root.is-collapsed .cs-collapse-icon {
  transform: scaleX(-1);
}
  `.trim();

  return (
    <style
      href="cs-collapsible-sidebar"
      precedence="component"
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}

// ─── Icons (inline SVG, no dependency) ───────────────────────────────────────

function CollapseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M9 3v18" />
      <path d="M15 9l-3 3 3 3" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CollapsibleSidebar({
  items,
  activeId: externalActiveId,
  onSelect,
  logo,
  logoName = 'Blue Ocean',
  className = '',
  defaultCollapsed = false,
}: CollapsibleSidebarProps) {
  const [internalActive, setInternalActive] = useState(items[0]?.id ?? '');
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const navRef = useRef<HTMLDivElement>(null);

  const activeId = externalActiveId ?? internalActive;
  const activeIndex = items.findIndex((it) => it.id === activeId);

  const indicatorTop = activeIndex >= 0
    ? activeIndex * (ITEM_H + ITEM_GAP)
    : 0;

  function handleSelect(id: string) {
    setInternalActive(id);
    onSelect?.(id);
  }

  // keep indicator updated
  useEffect(() => {
    if (navRef.current) {
      navRef.current.style.setProperty('--cs-indicator-top', `${indicatorTop}px`);
    }
  }, [indicatorTop]);

  return (
    <>
      <SidebarStyles />
      <div
        className={`cs-root${collapsed ? ' is-collapsed' : ''}${className ? ` ${className}` : ''}`}
        style={{ '--cs-indicator-top': `${indicatorTop}px` } as React.CSSProperties}
      >
        {/* Logo */}
        <div className="cs-logo">
          {logo ?? <div className="cs-logo-mark" />}
          <span className="cs-logo-name">{logoName}</span>
        </div>

        {/* Nav items + sliding indicator */}
        <div ref={navRef} className="cs-nav">
          {/* Animated indicator */}
          <div className="cs-indicator" aria-hidden />

          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`cs-item${item.id === activeId ? ' is-active' : ''}`}
              onClick={() => handleSelect(item.id)}
              aria-current={item.id === activeId ? 'page' : undefined}
            >
              <span className="cs-item-icon">{item.icon}</span>
              <span className="cs-item-label">{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span className="cs-badge">{item.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Separator + Collapse */}
        <div className="cs-separator" />
        <button
          type="button"
          className="cs-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <span className="cs-collapse-icon">
            <CollapseIcon />
          </span>
          <span className="cs-collapse-btn-label">
            {collapsed ? 'Expandir' : 'Recolher'}
          </span>
        </button>
      </div>
    </>
  );
}

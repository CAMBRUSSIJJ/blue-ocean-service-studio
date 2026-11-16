/**
 * BLUE OCEAN Service Studio — Plausible Analytics
 *
 * Wrapper leve sobre o Plausible (sem cookies, LGPD-friendly).
 * O script é carregado em modo manual (`script.manual.js`) para que o app
 * controle quando cada pageview é disparado — necessário porque o roteamento
 * do Blue Ocean é baseado em estado, não em URL.
 *
 * Ativação: defina VITE_PLAUSIBLE_DOMAIN no ambiente de produção.
 * Em desenvolvimento, chamadas são logadas no console e não enviadas.
 */

/** Mapeamento do estado de navegação para um path virtual legível. */
export interface NavState {
  activeTab: string;
  serviceWorkspaceTab?: string;
  externalNav?: string | null;
  libraryPage?: string;
  projectShellOpen?: boolean;
  projectShellSection?: string;
}

/** Deriva um path virtual a partir do estado de navegação do app. */
export function deriveVirtualPath(nav: NavState): string {
  const { activeTab, serviceWorkspaceTab, externalNav, libraryPage, projectShellOpen, projectShellSection } = nav;

  if (externalNav) return `/${externalNav}`;

  if (activeTab === 'home') {
    if (projectShellOpen) {
      if (projectShellSection === 'library') return '/project/library';
      return '/project';
    }
    return '/';
  }

  if (activeTab === 'context') {
    return libraryPage ? `/library/${libraryPage}` : '/library';
  }

  if (activeTab === 'whiteboards') return '/whiteboards';
  if (activeTab === 'journey')     return '/journey';
  if (activeTab === 'action')      return '/action-plan';

  if (activeTab === 'canvas') {
    const tab = serviceWorkspaceTab ?? 'overview';
    const PATH: Record<string, string> = {
      overview:   '/design',
      journey:    '/design/maps',
      blueprint:  '/design/maps',
      whiteboard: '/design/whiteboard',
      channels:   '/design/channels',
      portfolio:  '/design/improvements',
      outcomes:   '/design/outcomes',
      prototypes: '/design/prototypes',
      research:   '/design/research',
    };
    return PATH[tab] ?? `/design/${tab}`;
  }

  return `/${activeTab}`;
}

/** Declara o tipo de `window.plausible` injetado pelo script do Plausible. */
declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: {
        callback?: () => void;
        props?: Record<string, string | number | boolean>;
        revenue?: { currency: string; amount: number };
        u?: string;
      }
    ) => void;
  }
}

const isDev = import.meta.env.DEV;

/**
 * Registra um pageview virtual. Em produção chama `window.plausible`;
 * em desenvolvimento apenas loga no console.
 */
export function trackPageview(virtualPath: string): void {
  const origin = window.location.origin;
  const url = `${origin}${virtualPath}`;

  if (isDev) {
    console.debug('[plausible] pageview', virtualPath);
    return;
  }

  window.plausible?.('pageview', { u: url });
}

/**
 * Registra um evento customizado (ex: `trackEvent('Export SVG')`).
 * Em desenvolvimento apenas loga no console.
 */
export function trackEvent(
  name: string,
  props?: Record<string, string | number | boolean>
): void {
  if (isDev) {
    console.debug('[plausible] event', name, props);
    return;
  }

  window.plausible?.(name, props ? { props } : undefined);
}

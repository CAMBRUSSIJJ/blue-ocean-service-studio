import type { Id } from '../domain/model';
import type { ServiceModelKind } from './service-model-index';

export type ServiceObjectFocus = { kind: ServiceModelKind; id: Id; requestedAt: number };

const CONTEXT_PAGE_BY_KIND: Partial<Record<ServiceModelKind, string>> = {
  persona: 'personas',
  need: 'needs',
  job: 'jobs',
  pain: 'pains',
  hypothesis: 'hypotheses',
  validatedProblem: 'problems',
  evidence: 'evidence',
};

const WORKSPACE_TAB_BY_KIND: Partial<Record<ServiceModelKind, string>> = {
  actor: 'ecology',
  journey: 'journey',
  stage: 'journey',
  touchpoint: 'channels',
  channel: 'channels',
  stageProblem: 'journey',
  stageOpportunity: 'improvement',
  whiteboard: 'whiteboard',
  blueprint: 'blueprint',
  improvementProblem: 'improvement',
  improvementOpportunity: 'improvement',
  initiative: 'portfolio',
  metric: 'outcomes',
  measurement: 'outcomes',
  researchProject: 'research',
  researchSource: 'research',
  researchObservation: 'research',
  experiment: 'prototypes',
  learning: 'learning',
  decision: 'decisions',
  governance: 'governance',
  operationBinding: 'operations',
};

const FOCUS_STORAGE_KEY = 'bo-service-object-focus';

function storeFocus(focus: ServiceObjectFocus) {
  try { sessionStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(focus)); } catch { /* navigation still works without storage */ }
}

export function readServiceObjectFocus(kind?: ServiceModelKind): ServiceObjectFocus | null {
  try {
    const raw = sessionStorage.getItem(FOCUS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ServiceObjectFocus>;
    if (!parsed.kind || !parsed.id) return null;
    if (kind && parsed.kind !== kind) return null;
    return { kind: parsed.kind, id: String(parsed.id), requestedAt: Number(parsed.requestedAt || 0) };
  } catch { return null; }
}

export function consumeServiceObjectFocus(kind: ServiceModelKind): ServiceObjectFocus | null {
  const focus = readServiceObjectFocus(kind);
  if (!focus) return null;
  try { sessionStorage.removeItem(FOCUS_STORAGE_KEY); } catch { /* noop */ }
  return focus;
}


export function canOpenServiceObject(kind: ServiceModelKind): boolean {
  return Boolean(CONTEXT_PAGE_BY_KIND[kind] || WORKSPACE_TAB_BY_KIND[kind] || kind === 'task');
}

export function openServiceObject(kind: ServiceModelKind, id: Id): boolean {
  if (!id) return false;
  const focus: ServiceObjectFocus = { kind, id, requestedAt: Date.now() };
  storeFocus(focus);

  const contextPage = CONTEXT_PAGE_BY_KIND[kind];
  if (contextPage) {
    window.dispatchEvent(new CustomEvent('bo-open-context-page', { detail: contextPage }));
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bo-service-object-focus', { detail: focus })), 30);
    return true;
  }

  const workspaceTab = WORKSPACE_TAB_BY_KIND[kind];
  if (workspaceTab) {
    window.dispatchEvent(new CustomEvent('rt-navigation', { detail: 'canvas' }));
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('bo-service-workspace-tab', { detail: workspaceTab }));
      window.setTimeout(() => window.dispatchEvent(new CustomEvent('bo-service-object-focus', { detail: focus })), 30);
    }, 0);
    return true;
  }

  if (kind === 'task') {
    window.dispatchEvent(new CustomEvent('rt-navigation', { detail: 'action' }));
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('bo-global-object-focus', { detail: { kind: 'task', id } })), 30);
    return true;
  }

  return false;
}

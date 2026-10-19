import type { CSSProperties, ReactNode, SVGProps } from 'react';

export type BlueOceanObjectKind =
  | 'service' | 'journey' | 'blueprint' | 'whiteboard'
  | 'persona' | 'need' | 'job' | 'pain' | 'problemHypothesis' | 'problem' | 'evidence'
  | 'metric' | 'stage' | 'touchpoint' | 'customerAction' | 'frontstage' | 'backstage'
  | 'process' | 'system' | 'opportunity' | 'task' | 'benefit' | 'insight' | 'expectation'
  | 'channel' | 'emotion' | 'solution' | 'experiment' | 'resource' | 'person'
  | 'responsible' | 'role' | 'dependency' | 'policy' | 'note';

export type BlueOceanObjectMeta = {
  label: string;
  accent: string;
  surface: string;
  ink: string;
  family: 'artifact' | 'context' | 'experience' | 'operation' | 'outcome' | 'governance';
  shape: 'flow' | 'layer' | 'node' | 'signal' | 'block' | 'halo';
};

export const BLUE_OCEAN_OBJECT_META: Record<BlueOceanObjectKind, BlueOceanObjectMeta> = {
  service: { label: 'Serviço', accent: '#174a88', surface: '#eef5ff', ink: '#123b61', family: 'artifact', shape: 'flow' },
  journey: { label: 'Journey', accent: '#2563eb', surface: '#eef5ff', ink: '#174ea6', family: 'artifact', shape: 'flow' },
  blueprint: { label: 'Blueprint', accent: '#0f8f83', surface: '#eaf8f6', ink: '#0b655e', family: 'artifact', shape: 'layer' },
  whiteboard: { label: 'Whiteboard', accent: '#7657d6', surface: '#f3f0ff', ink: '#5941ab', family: 'artifact', shape: 'node' },
  persona: { label: 'Persona', accent: '#7657d6', surface: '#f3f0ff', ink: '#5941ab', family: 'context', shape: 'halo' },
  need: { label: 'Necessidade', accent: '#2d8ed8', surface: '#edf7ff', ink: '#1e669c', family: 'context', shape: 'signal' },
  job: { label: 'Job', accent: '#4f63c7', surface: '#eff1ff', ink: '#394a9b', family: 'context', shape: 'block' },
  pain: { label: 'Dor', accent: '#e36a72', surface: '#fff0f1', ink: '#a83e47', family: 'context', shape: 'flow' },
  problemHypothesis: { label: 'Hipótese', accent: '#d69a26', surface: '#fff7e8', ink: '#936915', family: 'context', shape: 'flow' },
  problem: { label: 'Problema', accent: '#d94b5b', surface: '#fff0f2', ink: '#a42d3c', family: 'context', shape: 'block' },
  evidence: { label: 'Evidência', accent: '#1598c9', surface: '#ecf9ff', ink: '#0d6c91', family: 'context', shape: 'signal' },
  metric: { label: 'Métrica', accent: '#14946d', surface: '#eaf9f3', ink: '#0d6c50', family: 'outcome', shape: 'signal' },
  stage: { label: 'Etapa', accent: '#2563eb', surface: '#eef5ff', ink: '#174ea6', family: 'experience', shape: 'flow' },
  touchpoint: { label: 'Touchpoint', accent: '#168bb5', surface: '#eefaff', ink: '#0e6788', family: 'experience', shape: 'signal' },
  customerAction: { label: 'Ação do cliente', accent: '#2563eb', surface: '#eef5ff', ink: '#174ea6', family: 'experience', shape: 'flow' },
  frontstage: { label: 'Frontstage', accent: '#0f8f83', surface: '#eaf8f6', ink: '#0b655e', family: 'operation', shape: 'layer' },
  backstage: { label: 'Backstage', accent: '#c18416', surface: '#fff7e8', ink: '#86600f', family: 'operation', shape: 'layer' },
  process: { label: 'Processo', accent: '#4f63c7', surface: '#eff1ff', ink: '#394a9b', family: 'operation', shape: 'flow' },
  system: { label: 'Sistema', accent: '#657386', surface: '#f2f5f8', ink: '#465466', family: 'operation', shape: 'block' },
  opportunity: { label: 'Oportunidade', accent: '#15946d', surface: '#eaf9f3', ink: '#0d6c50', family: 'outcome', shape: 'flow' },
  task: { label: 'Tarefa', accent: '#5c6f82', surface: '#f3f5f7', ink: '#435365', family: 'operation', shape: 'block' },
  benefit: { label: 'Benefício', accent: '#15946d', surface: '#eaf9f3', ink: '#0d6c50', family: 'outcome', shape: 'signal' },
  insight: { label: 'Insight', accent: '#8a5ac8', surface: '#f6efff', ink: '#633d95', family: 'context', shape: 'signal' },
  expectation: { label: 'Expectativa', accent: '#4379d3', surface: '#eff5ff', ink: '#2f5a9f', family: 'experience', shape: 'flow' },
  channel: { label: 'Canal', accent: '#168bb5', surface: '#eefaff', ink: '#0e6788', family: 'experience', shape: 'signal' },
  emotion: { label: 'Emoção', accent: '#c45d8e', surface: '#fff0f7', ink: '#8e3d67', family: 'experience', shape: 'flow' },
  solution: { label: 'Solução', accent: '#0f8f83', surface: '#eaf8f6', ink: '#0b655e', family: 'outcome', shape: 'block' },
  experiment: { label: 'Experimento', accent: '#8b62c9', surface: '#f5f0ff', ink: '#644499', family: 'outcome', shape: 'signal' },
  resource: { label: 'Recurso', accent: '#657386', surface: '#f2f5f8', ink: '#465466', family: 'operation', shape: 'block' },
  person: { label: 'Pessoa', accent: '#7657d6', surface: '#f3f0ff', ink: '#5941ab', family: 'operation', shape: 'halo' },
  responsible: { label: 'Responsável', accent: '#7657d6', surface: '#f3f0ff', ink: '#5941ab', family: 'governance', shape: 'halo' },
  role: { label: 'Papel', accent: '#5d6fc1', surface: '#f1f3ff', ink: '#43529a', family: 'governance', shape: 'halo' },
  dependency: { label: 'Dependência', accent: '#7a8798', surface: '#f3f5f7', ink: '#536173', family: 'governance', shape: 'flow' },
  policy: { label: 'Política', accent: '#6d7786', surface: '#f4f5f7', ink: '#4d5663', family: 'governance', shape: 'block' },
  note: { label: 'Nota', accent: '#d0a128', surface: '#fff9dc', ink: '#80620e', family: 'context', shape: 'block' },
};

const pathProps = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

type IconProps = { kind: BlueOceanObjectKind; size?: number; className?: string; title?: string; style?: CSSProperties };

function IconSvg({ size = 24, className, title, style, children }: Omit<IconProps, 'kind'> & { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} style={style} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} {...({ focusable: 'false' } as SVGProps<SVGSVGElement>)}>{title ? <title>{title}</title> : null}{children}</svg>;
}

export function BlueOceanObjectIcon({ kind, size = 24, className, title, style }: IconProps) {
  const p = pathProps;
  const wrap = (children: ReactNode) => <IconSvg size={size} className={className} title={title} style={style}>{children}</IconSvg>;
  switch (kind) {
    case 'service': return wrap(<><path {...p} d="M3 8c3-3 5-3 8 0s5 3 10 0"/><path {...p} d="M3 13c3-3 5-3 8 0s5 3 10 0"/><path {...p} d="M6 18h12"/></>);
    case 'journey':
    case 'stage': return wrap(<><path {...p} d="M2.8 15.8C6.2 15.8 6.9 7.3 11.5 7.3c4.3 0 4.8 7.7 9.7 5.5"/><circle cx="3.3" cy="15.7" r="1.55" {...p}/><circle cx="11.5" cy="7.3" r="1.55" {...p}/><circle cx="20.5" cy="12.9" r="1.55" {...p}/><path {...p} d="M5.7 19.1c2.8-1.8 5.3-1.8 8 0s4.9 1.8 7.2.1" opacity=".42"/></>);
    case 'blueprint': return wrap(<><path {...p} d="M3.5 6.5c4-1.8 6.6-1.8 10.2 0s5.4 1.8 6.8.8M3.5 12c4-1.8 6.6-1.8 10.2 0s5.4 1.8 6.8.8M3.5 17.5c4-1.8 6.6-1.8 10.2 0s5.4 1.8 6.8.8"/><path {...p} d="M7 4.5v4M15 10v4M10 15.5v4" opacity=".55"/></>);
    case 'whiteboard': return wrap(<><rect x="3" y="4" width="6" height="6" rx="2" {...p}/><path {...p} d="M9 7.2c3.1 0 3.3 4.1 6.2 4.1"/><circle cx="18.5" cy="11.4" r="2.2" {...p}/><path {...p} d="M16.7 13c-2.4 1-3.2 4.1-6.2 4.1H8"/><path {...p} d="M3 17.2c1.7-1.6 3-1.6 4.7 0"/></>);
    case 'persona':
    case 'person':
    case 'responsible':
    case 'role': return wrap(<><circle cx="12" cy="9" r="2.7" {...p}/><path {...p} d="M6.2 19.6c.8-3.7 2.8-5.5 5.8-5.5s5 1.8 5.8 5.5"/><path {...p} d="M4.2 10.2c.4-4.7 3.4-7.5 7.8-7.5s7.4 2.8 7.8 7.5" opacity=".45"/><path {...p} d="M6 21c3-1.4 4.9-1.4 7.5 0 2.2 1.1 4 .9 5.5 0" opacity=".38"/></>);
    case 'need': return wrap(<><circle cx="12" cy="12" r="2.2" {...p}/><path {...p} d="M4 12h3M17 12h3M12 4v3M12 17v3"/><path {...p} d="M6.5 7.5l2 2M15.5 14.5l2 2M17.5 7.5l-2 2M8.5 14.5l-2 2" opacity=".65"/></>);
    case 'job': return wrap(<><path {...p} d="M3 12h10"/><path {...p} d="m10 8 4 4-4 4"/><rect x="15" y="7" width="6" height="10" rx="1.3" {...p}/></>);
    case 'pain': return wrap(<><path {...p} d="M3 12c3-4 5-4 8 0"/><path {...p} d="M13 12c3 4 5 4 8 0"/><path {...p} d="m11.5 8 1 3-2 2.5 1.5 2.5"/></>);
    case 'problemHypothesis': return wrap(<><path {...p} d="M4 5c4 0 5 4 8 7s4 6 8 7"/><path {...p} d="M20 5c-4 0-5 4-8 7" opacity=".7"/><circle cx="12" cy="12" r="1.5" {...p}/></>);
    case 'problem': return wrap(<><path {...p} d="M3.5 8h6.8l2 2h8.2v7h-8.2l-2-2H3.5z"/><path {...p} d="m11.2 8.5 1.6 2.5-1.9 2.2 1.4 2.4"/><path {...p} d="M5.5 19c2.4-1.5 4.2-1.5 6.4 0s4.3 1.5 6.6 0" opacity=".4"/></>);
    case 'evidence': return wrap(<><path {...p} d="M5 18V8l4-3h10v13z"/><path {...p} d="M5 8h4V5"/><path {...p} d="m9 13 2 2 4-5"/><path {...p} d="M3 20c2.2-1.4 3.8-1.4 5.9 0s3.9 1.4 6 0 3.7-1.4 6 0" opacity=".4"/></>);
    case 'metric': return wrap(<><path {...p} d="M4 18V6"/><path {...p} d="M4 18h16"/><path {...p} d="M6 15c2-1 3-6 6-5s3 4 6-2"/><path {...p} d="M6 20c2-1 3.4-1 5.2 0s3.4 1 5.3 0" opacity=".42"/></>);
    case 'touchpoint':
    case 'channel': return wrap(<><circle cx="12" cy="12" r="2" {...p}/><path {...p} d="M7.8 8.2a5.9 5.9 0 0 0 0 7.6M16.2 8.2a5.9 5.9 0 0 1 0 7.6"/><path {...p} d="M5.1 5.4a9.3 9.3 0 0 0 0 13.2M18.9 5.4a9.3 9.3 0 0 1 0 13.2" opacity=".6"/></>);
    case 'customerAction': return wrap(<><path {...p} d="M4 15c3-4 5-4 8 0s5 4 8 0"/><path {...p} d="M17 8h3v3"/><path {...p} d="m20 8-5 5"/></>);
    case 'frontstage': return wrap(<><path {...p} d="M3 11h18"/><path {...p} d="M5 8c2-2 3-2 5 0s3 2 5 0 3-2 4 0"/><path {...p} d="M7 15h10"/></>);
    case 'backstage': return wrap(<><path {...p} d="M3 9h18"/><path {...p} d="M5 15h4l2-3 2 5 2-2h4"/></>);
    case 'process': return wrap(<><circle cx="5" cy="12" r="1.7" {...p}/><circle cx="12" cy="12" r="1.7" {...p}/><circle cx="19" cy="12" r="1.7" {...p}/><path {...p} d="M6.7 12h3.6M13.7 12h3.6"/></>);
    case 'system':
    case 'resource': return wrap(<><rect x="4" y="5" width="16" height="5" rx="1.3" {...p}/><rect x="4" y="14" width="16" height="5" rx="1.3" {...p}/><path {...p} d="M7 7.5h.01M7 16.5h.01M10 7.5h6M10 16.5h6"/></>);
    case 'opportunity': return wrap(<><path {...p} d="M4 16c3-1 4-6 7-5s4 3 9-4"/><path {...p} d="M16 7h4v4"/><path {...p} d="M5 20h14" opacity=".55"/></>);
    case 'task': return wrap(<><rect x="4" y="4" width="16" height="16" rx="2" {...p}/><path {...p} d="m8 12 2.5 2.5L16 9"/></>);
    case 'benefit': return wrap(<><path {...p} d="M5 18c2-5 4-8 7-8s4 2 7-5"/><path {...p} d="M5 18h14"/><circle cx="18" cy="5" r="1.5" {...p}/></>);
    case 'insight': return wrap(<><circle cx="12" cy="12" r="2.3" {...p}/><path {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></>);
    case 'expectation': return wrap(<><path {...p} d="M4 15c3-5 5-5 8 0s5 5 8 0"/><path {...p} d="M7 7h10"/><path {...p} d="m14 4 3 3-3 3"/></>);
    case 'emotion': return wrap(<><path {...p} d="M3 13c2-5 4-5 6 0s4 5 6 0 4-5 6 0"/><path {...p} d="M5 18h14" opacity=".55"/></>);
    case 'solution': return wrap(<><rect x="5" y="6" width="14" height="12" rx="2" {...p}/><path {...p} d="M8 12h8M12 8v8"/></>);
    case 'experiment': return wrap(<><path {...p} d="M9 4v5l-4 8a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 17l-4-8V4"/><path {...p} d="M8 14h8"/></>);
    case 'dependency': return wrap(<><circle cx="7" cy="12" r="2.2" {...p}/><circle cx="17" cy="12" r="2.2" {...p}/><path {...p} d="M9.2 12h5.6"/><path {...p} d="m12.8 9.8 2.2 2.2-2.2 2.2"/></>);
    case 'policy': return wrap(<><path {...p} d="M6 4h9l3 3v13H6z"/><path {...p} d="M15 4v4h3M9 12h6M9 16h5"/></>);
    case 'note': return wrap(<><path {...p} d="M5 4h14v11l-5 5H5z"/><path {...p} d="M14 20v-5h5"/></>);
    default: return wrap(<><circle cx="12" cy="12" r="7" {...p}/><path {...p} d="M8 12h8"/></>);
  }
}


export type BlueOceanUtilityKind =
  | 'dashboard' | 'hierarchy' | 'portfolio' | 'research' | 'template' | 'archive'
  | 'collaboration' | 'settings' | 'recent' | 'favorite' | 'learn' | 'filter'
  | 'export' | 'create' | 'arrow';

type UtilityIconProps = { kind: BlueOceanUtilityKind; size?: number; className?: string; title?: string; style?: CSSProperties };

export function BlueOceanUtilityIcon({ kind, size = 24, className, title, style }: UtilityIconProps) {
  const p = pathProps;
  const wrap = (children: ReactNode) => <IconSvg size={size} className={className} title={title} style={style}>{children}</IconSvg>;
  switch (kind) {
    case 'dashboard': return wrap(<><path {...p} d="M3.5 16.5V9.2c2.6 0 3.5-3.2 6.2-3.2s3.8 4 6.5 4 3.2-2.1 4.3-2.1v8.6"/><path {...p} d="M3.5 19.5c3-1.6 5.1-1.6 7.8 0s5.3 1.6 9.2 0"/><circle cx="8.1" cy="12.7" r="1.2" {...p}/><circle cx="16" cy="13.6" r="1.2" {...p}/></>);
    case 'hierarchy': return wrap(<><circle cx="12" cy="5" r="1.8" {...p}/><circle cx="5.5" cy="17.5" r="1.8" {...p}/><circle cx="18.5" cy="17.5" r="1.8" {...p}/><path {...p} d="M12 6.8v3.8M5.5 15.7c0-3.2 2-5.1 6.5-5.1s6.5 1.9 6.5 5.1"/><path {...p} d="M7 21c2-1.2 3.6-1.2 5.5 0s3.7 1.2 5.5 0" opacity=".4"/></>);
    case 'portfolio': return wrap(<><path {...p} d="M5 8h11l3 3v7H5z"/><path {...p} d="M7 5h9v3"/><path {...p} d="M8 13c2-1.8 3.3-1.8 5.2 0s3.1 1.8 4.8 0"/></>);
    case 'research': return wrap(<><circle cx="10" cy="10" r="5" {...p}/><path {...p} d="m13.8 13.8 5.2 5.2"/><path {...p} d="M6.3 10c1.4-2 2.4-2 3.9 0s2.4 2 3.7 0"/><path {...p} d="M4 19c2-1.2 3.5-1.2 5.4 0s3.7 1.2 5.6 0" opacity=".38"/></>);
    case 'template': return wrap(<><rect x="5" y="4" width="13" height="15" rx="2" {...p}/><path {...p} d="M8 8h7M8 12c1.8-1.6 3-1.6 4.8 0S15 13.5 16 12M8 16h5"/></>);
    case 'archive': return wrap(<><path {...p} d="M5 8h14v11H5z"/><path {...p} d="M4 5h16v3H4z"/><path {...p} d="M9 13c1.4-1.4 2.2-1.4 3.6 0s2.3 1.4 3.4 0"/></>);
    case 'collaboration': return wrap(<><circle cx="8" cy="9" r="2.5" {...p}/><circle cx="16.5" cy="10" r="2" {...p}/><path {...p} d="M3.5 19c.6-3.4 2.1-5 4.5-5s3.8 1.6 4.4 5M13 18c.4-2.7 1.6-4 3.5-4 1.8 0 3 1.3 3.5 4"/></>);
    case 'settings': return wrap(<><path {...p} d="M4 7c3-1.4 5-1.4 8 0s5 1.4 8 0M4 12c3-1.4 5-1.4 8 0s5 1.4 8 0M4 17c3-1.4 5-1.4 8 0s5 1.4 8 0"/><circle cx="9" cy="6.8" r="1.45" {...p}/><circle cx="15" cy="12" r="1.45" {...p}/><circle cx="11" cy="17.2" r="1.45" {...p}/></>);
    case 'recent': return wrap(<><path {...p} d="M5 9a8 8 0 1 1-1 7"/><path {...p} d="M5 4v5H2"/><path {...p} d="M8 13c1.6-1.5 2.7-1.5 4.3 0s2.8 1.5 4.7 0"/></>);
    case 'favorite': return wrap(<><path {...p} d="M12 4 14.1 9l5.4.5-4.1 3.6 1.2 5.3L12 15.6l-4.6 2.8 1.2-5.3-4.1-3.6L9.9 9z"/><path {...p} d="M8.3 12c1.4-1.2 2.3-1.2 3.7 0s2.4 1.2 3.8 0" opacity=".6"/></>);
    case 'learn': return wrap(<><path {...p} d="M4 6.5c3-1.5 5.2-1.2 8 1.3v10c-2.8-2.2-5-2.6-8-1.2z"/><path {...p} d="M20 6.5c-3-1.5-5.2-1.2-8 1.3v10c2.8-2.2 5-2.6 8-1.2z"/><path {...p} d="M7 11c1.5-1 2.5-1 4 0" opacity=".65"/></>);
    case 'filter': return wrap(<><path {...p} d="M4 6h16l-6.5 7v5l-3 2v-7z"/><path {...p} d="M7 8c1.8-1.2 3-1.2 4.8 0s3.2 1.2 5.2 0" opacity=".58"/></>);
    case 'export': return wrap(<><path {...p} d="M5 12v7h14v-7"/><path {...p} d="M12 4v10M8.5 7.5 12 4l3.5 3.5"/><path {...p} d="M7 16c1.5-1.2 2.7-1.2 4.2 0s2.7 1.2 4.8 0" opacity=".58"/></>);
    case 'create': return wrap(<><path {...p} d="M12 5v14M5 12h14"/><path {...p} d="M4 18c2-2 3.4-2 5.4 0s3.4 2 5.4 0 3.2-2 5.2 0" opacity=".58"/></>);
    case 'arrow': return wrap(<><path {...p} d="M4 12h14"/><path {...p} d="m14 8 4 4-4 4"/><path {...p} d="M5 16c1.7-1.2 2.7-1.2 4.2 0s2.8 1.2 4.5 0" opacity=".45"/></>);
    default: return wrap(<path {...p} d="M4 12h16"/>);
  }
}

export function BlueOceanArtifactPreview({ kind, compact = false }: { kind: 'journey' | 'blueprint' | 'whiteboard'; compact?: boolean }) {
  const objectKind: BlueOceanObjectKind = kind;
  return <span className={`bo-h716-artifact-preview bo-h718-artifact-preview is-${kind}${compact ? ' is-compact' : ''}`} aria-hidden="true">
    {kind === 'journey' && <><i/><i/><i/><b/><b/><b/></>}
    {kind === 'blueprint' && <><i/><i/><i/><i/><b/><b/></>}
    {kind === 'whiteboard' && <><i/><i/><i/><b/><b/></>}
    <span className="bo-h718-artifact-mark"><BlueOceanObjectIcon kind={objectKind} size={compact ? 12 : 15}/></span>
    <span className="bo-h718-current-line" />
  </span>;
}

export type BlueOceanRelationKind = 'supports' | 'contradicts' | 'contextualizes' | 'depends' | 'default';
export function relationKindFromLabel(label: string): BlueOceanRelationKind {
  const normalized = label.trim().toLocaleLowerCase('pt-BR');
  if (/sustenta|suporta|supports?/.test(normalized)) return 'supports';
  if (/contradiz|contraria|contradicts?/.test(normalized)) return 'contradicts';
  if (/contextualiza|contextual|contextualizes?/.test(normalized)) return 'contextualizes';
  if (/depende|depend[êe]ncia|depends?/.test(normalized)) return 'depends';
  return 'default';
}

export const BLUE_OCEAN_RELATION_META: Record<BlueOceanRelationKind, { label: string; stroke: string; dash?: string }> = {
  supports: { label: 'Sustenta', stroke: '#1598c9' },
  contradicts: { label: 'Contradiz', stroke: '#d94b5b', dash: '7 6' },
  contextualizes: { label: 'Contextualiza', stroke: '#7657d6', dash: '2 5' },
  depends: { label: 'Depende de', stroke: '#657386', dash: '1 6' },
  default: { label: 'Relação', stroke: '#64748b' },
};

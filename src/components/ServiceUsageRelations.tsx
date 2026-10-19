import { useMemo } from 'react';
import { ArrowRight, Link2, MapPin, Network } from '../design-system/icons';
import { BlueOceanObjectIcon, type BlueOceanObjectKind } from '../design-system/blue-ocean-objects';
import type { Id, ServiceGraph } from '../domain/model';
import {
  relationsFor,
  resolveObject,
  serviceModelIndex,
  usageFor,
  type ServiceModelDomain,
  type ServiceModelKind,
  type ServiceModelNode,
  type ServiceModelRelation,
} from '../services/service-model-index';
import { canOpenServiceObject, openServiceObject } from '../services/service-object-navigation';

const DOMAIN_ORDER: ServiceModelDomain[] = ['people', 'discovery', 'design', 'research', 'improvement', 'measurement', 'operation', 'governance', 'learning', 'definition', 'other', 'service'];
const DOMAIN_LABEL: Record<ServiceModelDomain, string> = {
  service: 'Serviço', definition: 'Definição', people: 'Pessoas', discovery: 'Descoberta', design: 'Design', improvement: 'Melhoria',
  measurement: 'Gestão', operation: 'Operação', governance: 'Governança', research: 'Pesquisa', learning: 'Aprendizado', other: 'Outros',
};

const KIND_LABEL: Partial<Record<ServiceModelKind, string>> = {
  service: 'Serviço', persona: 'Persona', need: 'Necessidade', job: 'Job', pain: 'Dor', hypothesis: 'Hipótese', validatedProblem: 'Problema', evidence: 'Evidência',
  actor: 'Ator', journey: 'Journey', stage: 'Etapa', touchpoint: 'Touchpoint', channel: 'Canal', stageProblem: 'Problema observado', stageOpportunity: 'Oportunidade', task: 'Ação',
  whiteboard: 'Whiteboard', blueprint: 'Blueprint', improvementProblem: 'Problema priorizado', improvementOpportunity: 'Oportunidade de melhoria', initiative: 'Iniciativa',
  metric: 'Métrica', measurement: 'Medição', researchProject: 'Pesquisa', researchSource: 'Fonte', researchObservation: 'Observação', experiment: 'Experimento', learning: 'Aprendizado',
  decision: 'Decisão', governance: 'Governança', operationBinding: 'Operação',
};

const USAGE_SOURCES = ['journey.', 'stage.', 'whiteboard.', 'blueprint.', 'outcomes.', 'governance.', 'operationsBridge.', 'prototype.', 'research.'];
const USAGE_TYPES = new Set(['visualizes', 'designContext', 'containsStage', 'belongsToJourney', 'belongsToStage', 'observedAt', 'stage', 'journey', 'measurement', 'governs', 'operates']);

function isUsageRelation(relation: ServiceModelRelation) {
  return USAGE_TYPES.has(relation.type) || USAGE_SOURCES.some((prefix) => relation.source.startsWith(prefix));
}

function iconKind(kind: ServiceModelKind): BlueOceanObjectKind {
  if (kind.startsWith('entity:')) {
    const raw = kind.slice('entity:'.length) as BlueOceanObjectKind;
    const supported: BlueOceanObjectKind[] = ['customerAction','frontstage','backstage','process','system','resource','responsible','role','dependency','policy','insight','expectation','benefit','solution'];
    return supported.includes(raw) ? raw : 'note';
  }
  return ({
    service: 'service', persona: 'persona', need: 'need', job: 'job', pain: 'pain', hypothesis: 'problemHypothesis', validatedProblem: 'problem', evidence: 'evidence', actor: 'person',
    journey: 'journey', stage: 'stage', touchpoint: 'touchpoint', channel: 'channel', stageProblem: 'problem', stageOpportunity: 'opportunity', task: 'task', whiteboard: 'whiteboard', blueprint: 'blueprint',
    improvementProblem: 'problem', improvementOpportunity: 'opportunity', initiative: 'task', metric: 'metric', measurement: 'metric', researchProject: 'evidence', researchSource: 'evidence', researchObservation: 'insight',
    experiment: 'experiment', learning: 'insight', decision: 'opportunity', governance: 'responsible', operationBinding: 'system',
  } as Partial<Record<ServiceModelKind, BlueOceanObjectKind>>)[kind] ?? 'note';
}

function kindLabel(kind: ServiceModelKind) {
  if (kind.startsWith('entity:')) return kind.slice('entity:'.length).replace(/([A-Z])/g, ' $1').trim();
  return KIND_LABEL[kind] ?? kind;
}

type RelationItem = { node: ServiceModelNode; relation: ServiceModelRelation; navigable: boolean };

type Props = {
  graph: ServiceGraph;
  kind: ServiceModelKind;
  id: Id;
  title?: string;
  description?: string;
  compact?: boolean;
};

function grouped(items: RelationItem[]) {
  const output = new Map<ServiceModelDomain, RelationItem[]>();
  for (const item of items) output.set(item.node.domain, [...(output.get(item.node.domain) ?? []), item]);
  return DOMAIN_ORDER.map((domain) => ({ domain, label: DOMAIN_LABEL[domain], items: output.get(domain) ?? [] })).filter((group) => group.items.length);
}

function RelationGroups({ groups, empty }: { groups: ReturnType<typeof grouped>; empty: string }) {
  if (!groups.length) return <div className="bo-h152-empty"><Network size={20}/><strong>{empty}</strong><p>As conexões aparecerão aqui conforme este objeto for usado em outras partes do serviço.</p></div>;
  return <div className="bo-h152-groups">{groups.map((group) => <section key={group.domain} className="bo-h152-group"><header><strong>{group.label}</strong><span>{group.items.length}</span></header><div>{group.items.map(({ node, relation, navigable }) => <button type="button" key={`${relation.id}:${node.key}`} className="bo-h152-reference" disabled={!navigable} onClick={() => openServiceObject(node.kind, node.id)} aria-label={`${navigable ? 'Abrir' : 'Ver'} ${kindLabel(node.kind)} ${node.label}`}><span className="bo-h152-reference__icon"><BlueOceanObjectIcon kind={iconKind(node.kind)} size={16}/></span><span className="bo-h152-reference__copy"><small>{kindLabel(node.kind)}</small><strong>{node.label}</strong><em>{relation.label}</em></span>{navigable && <ArrowRight size={14}/>}</button>)}</div></section>)}</div>;
}

export function ServiceUsageRelations({ graph, kind, id, title = 'Uso e relações', description = 'Veja onde este objeto aparece e com o que ele está conectado no serviço.', compact = false }: Props) {
  const index = useMemo(() => serviceModelIndex(graph), [graph]);
  const node = useMemo(() => resolveObject(index, kind, id), [index, kind, id]);
  const usage = useMemo(() => usageFor(index, kind, id), [index, kind, id]);
  const relations = useMemo(() => relationsFor(index, kind, id), [index, kind, id]);
  const key = `${kind}:${id}`;

  const items = useMemo(() => relations.flatMap((relation) => {
    const otherKey = relation.fromKey === key ? relation.toKey : relation.fromKey;
    const related = index.nodes[otherKey];
    if (!related) return [];
    const navigable = related.kind !== 'service' && canOpenServiceObject(related.kind);
    return [{ node: related, relation, navigable } satisfies RelationItem];
  }), [index, key, relations]);

  const uniqueByNode = (source: RelationItem[]) => {
    const seen = new Set<string>();
    return source.filter((item) => {
      if (seen.has(item.node.key)) return false;
      seen.add(item.node.key);
      return true;
    });
  };
  const usageItems = uniqueByNode(items.filter((item) => isUsageRelation(item.relation)));
  const relationItems = uniqueByNode(items.filter((item) => !isUsageRelation(item.relation)));
  const usageGroups = grouped(usageItems);
  const relationGroups = grouped(relationItems);

  return <section className={`bo-h152-usage-relations ${compact ? 'is-compact' : ''}`} data-usage-relations-h152="1" data-object-kind={kind} data-object-id={id}>
    <header className="bo-h152-head"><div><small>H15.2 · SERVICE MODEL</small><h3>{title}</h3><p>{description}</p></div><span className="bo-h152-linkage"><Link2 size={15}/><strong>{usage.relatedCount}</strong><small>objetos conectados</small></span></header>
    <div className="bo-h152-stats"><article><MapPin size={15}/><span><strong>{usageItems.length}</strong><small>usos</small></span></article><article><Network size={15}/><span><strong>{relationItems.length}</strong><small>relações</small></span></article><article><BlueOceanObjectIcon kind="whiteboard" size={15}/><span><strong>{usage.instances}</strong><small>instâncias visuais</small></span></article><article><BlueOceanObjectIcon kind="service" size={15}/><span><strong>{usage.relationCount}</strong><small>vínculos do modelo</small></span></article></div>
    {node ? <div className="bo-h152-sections"><section><div className="bo-h152-section-title"><MapPin size={15}/><div><strong>Utilizado em</strong><small>Onde este objeto participa do desenho, operação ou gestão.</small></div></div><RelationGroups groups={usageGroups} empty="Ainda não há usos detectados"/></section><section><div className="bo-h152-section-title"><Network size={15}/><div><strong>Relacionado a</strong><small>Conexões com pessoas, necessidades, dores, problemas e outros objetos relacionados ao serviço.</small></div></div><RelationGroups groups={relationGroups} empty="Ainda não há relações semânticas"/></section></div> : <div className="bo-h152-empty"><Network size={20}/><strong>Objeto não encontrado no Service Model</strong><p>O conteúdo continua preservado, mas ainda não existe uma projeção canônica para este tipo.</p></div>}
  </section>;
}

export function ServiceObjectReference({ graph, kind, id }: Pick<Props, 'graph' | 'kind' | 'id'>) {
  const index = useMemo(() => serviceModelIndex(graph), [graph]);
  const node = resolveObject(index, kind, id);
  if (!node) return null;
  const navigable = canOpenServiceObject(node.kind);
  return <button type="button" className="bo-h152-reference is-inline" disabled={!navigable} onClick={() => openServiceObject(node.kind, node.id)}><span className="bo-h152-reference__icon"><BlueOceanObjectIcon kind={iconKind(node.kind)} size={15}/></span><span className="bo-h152-reference__copy"><small>{kindLabel(node.kind)}</small><strong>{node.label}</strong></span>{navigable && <ArrowRight size={13}/>}</button>;
}

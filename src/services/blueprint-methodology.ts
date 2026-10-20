import type { BlueprintActivityDetails, BlueprintQualityDimension, BlueprintServiceStrategy, GraphEntity, ServiceFrameLayerKey, ServiceGraph, WhiteboardItem } from '../domain/model';

// This module is also compiled for the runtime. Keep runtime imports type-only.
export const BLUEPRINT_FRAME_LAYERS: Array<{ key: ServiceFrameLayerKey; label: string; question: string; defaultKind: string; visibleToCustomer: boolean; tone: string }> = [
  { key: 'evidence', label: 'Evidências do serviço', question: 'O que o cliente percebe: tela, mensagem, documento ou ambiente?', defaultKind: 'evidence', visibleToCustomer: true, tone: 'slate' },
  { key: 'customer', label: 'Cliente', question: 'O que a pessoa faz, precisa ou tenta alcançar?', defaultKind: 'customerAction', visibleToCustomer: true, tone: 'blue' },
  { key: 'frontstage', label: 'Frontstage', question: 'Com quem ou com o que o cliente interage?', defaultKind: 'frontstage', visibleToCustomer: true, tone: 'emerald' },
  { key: 'backstage', label: 'Backstage', question: 'O que precisa acontecer sem o cliente ver?', defaultKind: 'backstage', visibleToCustomer: false, tone: 'amber' },
  { key: 'process', label: 'Processos de suporte', question: 'Que processo, regra ou rotina sustenta este momento?', defaultKind: 'process', visibleToCustomer: false, tone: 'blue' },
  { key: 'enablement', label: 'Sistemas e recursos', question: 'Que tecnologia, recurso ou infraestrutura permite a operação?', defaultKind: 'system', visibleToCustomer: false, tone: 'violet' },
];
export const BLUEPRINT_BOUNDARIES = [
  { after: 'customer', kind: 'interaction', label: 'LINHA DE INTERAÇÃO', detail: 'cliente ↕ frontstage' },
  { after: 'frontstage', kind: 'visibility', label: 'LINHA DE VISIBILIDADE', detail: 'acima visível · abaixo invisível' },
  { after: 'backstage', kind: 'internal', label: 'LINHA DE INTERAÇÃO INTERNA', detail: 'bastidores ↕ processos de suporte' },
];
export const BLUEPRINT_MARKETING_DIMENSIONS = [
  { key: 'product', label: 'Serviço e proposta de valor', hint: 'O que é oferecido, para quem e com qual resultado.' },
  { key: 'price', label: 'Preço e condições', hint: 'Preço, formas de pagamento, custos ao cliente e condições comerciais.' },
  { key: 'place', label: 'Canais e acesso', hint: 'Onde, quando e por quais canais o serviço está disponível.' },
  { key: 'promotion', label: 'Comunicação da promessa', hint: 'O que é comunicado ao cliente e em quais momentos.' },
  { key: 'people', label: 'Pessoas', hint: 'Papéis, competências, autonomia e padrões de atendimento.' },
  { key: 'process', label: 'Processos', hint: 'Como a entrega acontece e quais padrões precisam ser mantidos.' },
  { key: 'physicalEvidence', label: 'Evidências físicas e digitais', hint: 'Ambientes, interfaces, documentos e sinais que tornam o serviço perceptível.' },
] as const;
export const BLUEPRINT_QUALITY_DIMENSIONS: Array<{ key: BlueprintQualityDimension; label: string; hint: string }> = [
  { key: 'reliability', label: 'Confiabilidade', hint: 'A entrega acontece como foi combinada?' },
  { key: 'responsiveness', label: 'Responsividade', hint: 'O cliente recebe ajuda e retorno no tempo adequado?' },
  { key: 'assurance', label: 'Segurança e confiança', hint: 'A interação transmite competência e confiança?' },
  { key: 'empathy', label: 'Empatia', hint: 'As necessidades e o contexto da pessoa são considerados?' },
  { key: 'tangibles', label: 'Tangibilidade', hint: 'Ambientes, materiais e interfaces sustentam a percepção de qualidade?' },
];
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const ids = (value: unknown): string[] => Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && !!id) : [];
export function isCustomerServiceEvidence(record?: GraphEntity): boolean {
  return !!record && record.evidencePurpose === 'service' && ['physical', 'digital', 'documentary', 'human'].includes(String(record.evidenceMedium ?? record.medium));
}
export function blueprintServicePromise(graph: ServiceGraph, strategy?: BlueprintServiceStrategy): string {
  if (strategy?.promiseSource === 'custom') return text(strategy.servicePromise);
  return text(graph.service.proposition?.current?.promise) || text(graph.service.project?.definition?.promise);
}
export function validateActivityNumbers(value: BlueprintActivityDetails): string[] {
  return (['durationMinutes', 'waitMinutes', 'targetMinutes', 'capacityPerHour', 'demandPerHour'] as const)
    .filter(key => value[key] !== undefined && (!Number.isFinite(value[key]) || Number(value[key]) < 0 || (key === 'targetMinutes' && value[key] === 0)));
}
export type BlueprintDeliveryIssue = { code: string; severity: 'critical' | 'warning'; message: string; stageId?: string; itemId?: string; kind?: string; objectId?: string };
export type BlueprintDeliveryReport = {
  status: 'incomplete' | 'attention' | 'ready_for_review';
  issues: BlueprintDeliveryIssue[];
  promise: string;
  coverage: { complete: number; total: number };
  activities: number;
  marketing: { complete: number; total: number; missing: string[] };
};
export function buildBlueprintDeliveryReport(graph: ServiceGraph, boardId: string, onlyStageId?: string): BlueprintDeliveryReport {
  const board = graph.views.whiteboards[boardId], issues: BlueprintDeliveryIssue[] = [];
  const strategy = board?.serviceStrategy;
  const promise = blueprintServicePromise(graph, strategy);
  const marketing = { complete: BLUEPRINT_MARKETING_DIMENSIONS.filter(d => text(strategy?.[d.key])).length, total: 7, missing: BLUEPRINT_MARKETING_DIMENSIONS.filter(d => !text(strategy?.[d.key])).map(d => d.label) };
  const report: BlueprintDeliveryReport = { status: 'incomplete', issues, promise, coverage: { complete: 0, total: 0 }, activities: 0, marketing };
  const push = (code: string, severity: BlueprintDeliveryIssue['severity'], message: string, stageId?: string, item?: WhiteboardItem) => issues.push({ code, severity, message, stageId, itemId: item?.id, ...(item?.kind === 'smart' ? { kind: item.objectKind, objectId: item.objectId } : {}) });
  if (!board) { push('board-missing', 'critical', 'O Blueprint não foi encontrado.'); return report; }
  const journey = graph.journeys[board.journeyId ?? graph.service.journeyIds[0]];
  const stages = (journey?.stageIds ?? []).map(id => graph.stages[id]).filter(stage => stage && (!onlyStageId || stage.id === onlyStageId));
  if (!stages.length) push('stages-missing', 'critical', 'Adicione uma etapa para revisar a entrega.');
  if (!promise) push('promise-missing', 'warning', 'Defina a promessa do serviço para relacioná-la à operação.');
  const items = Object.values(board.items);
  const recordFor = (item: WhiteboardItem) => item.kind === 'smart' ? graph.entities[item.objectKind]?.[item.objectId] : undefined;
  const stageFor = (item: WhiteboardItem) => item.serviceStageId ?? item.blueprintStageId ?? recordFor(item)?.stageId;
  const layerFor = (item: WhiteboardItem): ServiceFrameLayerKey => {
    // Legacy evidence objects keep their identity and contents, but use the evidence row.
    if (item.kind === 'smart' && item.objectKind === 'evidence' && (!item.serviceLayer || item.serviceLayer === 'customer')) return 'evidence';
    if (item.serviceLayer && BLUEPRINT_FRAME_LAYERS.some(layer => layer.key === item.serviceLayer)) return item.serviceLayer;
    const kind = item.kind === 'smart' ? item.objectKind : item.semantic;
    return ({ frontstage: 'frontstage', touchpoint: 'frontstage', channel: 'frontstage', role: 'frontstage', backstage: 'backstage', process: 'process', task: 'process', system: 'enablement', resource: 'enablement', evidence: 'evidence' } as Record<string, ServiceFrameLayerKey>)[String(kind)] ?? 'customer';
  };
  const meaningful = (item: WhiteboardItem) => {
    const rec = recordFor(item);
    if (item.kind === 'smart' && !rec) return false;
    return !!text(rec?.title ?? rec?.name ?? rec?.description ?? (item.kind === 'free' ? item.text : ''));
  };
  const activities = [...new Map(items.filter(item => item.kind === 'smart' && ['frontstage', 'backstage', 'process'].includes(item.objectKind)).map(item => [item.kind === 'smart' ? `${item.objectKind}:${item.objectId}` : item.id, item])).values()];
  const activityByKey = new Map(activities.map(item => [item.kind === 'smart' ? `${item.objectKind}:${item.objectId}` : '', item]));
  for (const item of items) {
    if (item.kind === 'smart' && item.objectKind === 'stage') continue;
    const record = recordFor(item), stageId = stageFor(item);
    if (!stageId && item.kind === 'smart' && ['frontstage', 'backstage', 'process'].includes(item.objectKind)) push('activity-stage-missing', 'critical', 'Relacione esta atividade a uma etapa da Jornada.', undefined, item);
    if (stageId && !journey?.stageIds.includes(stageId)) push('stage-invalid', 'critical', 'Um cartão está ligado a uma etapa fora desta Jornada.', stageId, item);
    if (record?.serviceId && record.serviceId !== graph.service.id) push('entity-other-service', 'critical', 'Um cartão está ligado a um registro de outro serviço.', stageId, item);
  }
  for (const dimension of BLUEPRINT_QUALITY_DIMENSIONS) {
    const criterion = strategy?.qualityCriteria?.[dimension.key];
    if (criterion?.metricId && !graph.entities.metric?.[criterion.metricId]) push('quality-metric-missing', 'warning', `${dimension.label}: a métrica associada não existe.`);
    if (criterion?.metricId && !text(criterion.criterion)) push('quality-criterion-missing', 'warning', `${dimension.label}: descreva o critério associado à métrica.`);
  }
  for (const stage of stages) {
    const stageItems = items.filter(item => stageFor(item) === stage.id);
    const present = new Set<ServiceFrameLayerKey>();
    if (text(stage.customerAction)) present.add('customer');
    for (const item of stageItems) {
      const rec = recordFor(item);
      if (item.kind === 'smart' && !rec) { push('entity-missing', 'critical', 'Um cartão aponta para um registro que não existe.', stage.id, item); continue; }
      if (!meaningful(item)) continue;
      if (layerFor(item) !== 'evidence' || isCustomerServiceEvidence(rec)) present.add(layerFor(item));
      if (layerFor(item) === 'evidence' && rec?.evidencePurpose !== 'research' && !isCustomerServiceEvidence(rec)) push('evidence-purpose', 'warning', 'Classifique esta evidência: artefato percebido pelo cliente ou evidência de pesquisa.', stage.id, item);
    }
    report.coverage.complete += present.size; report.coverage.total += BLUEPRINT_FRAME_LAYERS.length;
    for (const layer of BLUEPRINT_FRAME_LAYERS) if (!present.has(layer.key)) push(`layer-${layer.key}`, 'warning', `Etapa “${stage.title}”: descreva ${layer.label.toLowerCase()}.`, stage.id);
    if (!text(stage.customerAction)) push('customer-action', 'critical', `Etapa “${stage.title}”: descreva o que o cliente faz.`, stage.id);
    for (const item of stageItems.filter(item => activities.includes(item))) {
      const rec = recordFor(item); if (!rec) continue;
      report.activities++;
      const details = rec.operationalDetails ?? {}, title = text(rec.title ?? rec.name) || 'Atividade';
      if (!meaningful(item)) push('activity-empty', 'critical', 'Descreva a atividade antes de revisar a entrega.', stage.id, item);
      for (const [field, kind, label] of [['roleIds', 'role', 'responsável'], ['channelIds', 'channel', 'canal']] as const) {
        const links = ids(rec[field]);
        const required = kind === 'role' || (item.kind === 'smart' && item.objectKind === 'frontstage');
        if (required && !links.some(id => graph.entities[kind]?.[id] && (!graph.entities[kind][id].serviceId || graph.entities[kind][id].serviceId === graph.service.id))) push(`missing-${kind}`, 'warning', `${title}: relacione um ${label} válido.`, stage.id, item);
        if (links.some(id => !graph.entities[kind]?.[id] || (graph.entities[kind][id].serviceId && graph.entities[kind][id].serviceId !== graph.service.id))) push(`broken-${kind}`, 'critical', `${title}: existe um vínculo de ${label} inválido.`, stage.id, item);
      }
      for (const [field, kind] of [['dependencyIds', 'dependency'], ['policyIds', 'policy'], ['evidenceIds', 'evidence']] as const) {
        if (ids(rec[field]).some(id => !graph.entities[kind]?.[id] || (graph.entities[kind][id].serviceId && graph.entities[kind][id].serviceId !== graph.service.id))) push(`broken-${kind}`, 'critical', `${title}: revise o vínculo de ${kind === 'dependency' ? 'dependência' : kind === 'policy' ? 'política' : 'evidência'}.`, stage.id, item);
      }
      if (validateActivityNumbers(details).length) push('invalid-numbers', 'critical', `${title}: revise os tempos e a capacidade.`, stage.id, item);
      if (details.durationMinutes === undefined || details.waitMinutes === undefined || details.targetMinutes === undefined) push('timing-missing', 'warning', `${title}: informe execução, espera e prazo combinado.`, stage.id, item);
      if (details.durationMinutes !== undefined && details.waitMinutes !== undefined && details.targetMinutes !== undefined && details.durationMinutes + details.waitMinutes > details.targetMinutes) push('sla-infeasible', 'critical', `${title}: execução e espera ultrapassam o prazo combinado.`, stage.id, item);
      if (details.demandPerHour !== undefined && details.capacityPerHour === undefined) push('capacity-unknown', 'warning', `${title}: informe a capacidade para comparar com a demanda.`, stage.id, item);
      if (details.capacityPerHour !== undefined && details.demandPerHour !== undefined && details.demandPerHour > details.capacityPerHour) push('capacity-insufficient', 'critical', `${title}: a demanda prevista supera a capacidade de atendimento.`, stage.id, item);
      if (!text(details.failureMode) || !text(details.recoveryAction)) push('recovery-missing', 'warning', `${title}: descreva uma possível falha e como recuperar a entrega.`, stage.id, item);
      if (promise && (!details.promiseLinked || !text(details.promiseContribution))) push('promise-link', 'warning', `${title}: explicite sua contribuição para a promessa do serviço.`, stage.id, item);
      if (item.kind === 'smart' && item.objectKind === 'frontstage' && !text(details.customerMessage)) push('communication-missing', 'warning', `${title}: registre o que é comunicado ao cliente.`, stage.id, item);
      if (details.predecessors !== undefined && !Array.isArray(details.predecessors)) push('predecessors-invalid', 'critical', `${title}: revise o formato das atividades relacionadas.`, stage.id, item);
      for (const ref of Array.isArray(details.predecessors) ? details.predecessors : []) {
        if (!ref || typeof ref !== 'object') { push('predecessor-missing', 'critical', `${title}: existe uma atividade relacionada inválida.`, stage.id, item); continue; }
        const previous = activityByKey.get(`${ref.kind}:${ref.id}`);
        if (!previous || !recordFor(previous)) push('predecessor-missing', 'critical', `${title}: uma atividade da qual depende não existe neste Blueprint.`, stage.id, item);
      }
    }
  }
  // Detect cycles by canonical identity, including dependencies in another stage.
  const visiting = new Set<string>(), visited = new Set<string>(), cycles = new Set<string>();
  const visit = (key: string) => {
    if (visiting.has(key)) { cycles.add(key); return; }
    if (visited.has(key)) return;
    visiting.add(key);
    const item = activityByKey.get(key);
    const predecessors = item && recordFor(item)?.operationalDetails?.predecessors;
    for (const ref of Array.isArray(predecessors) ? predecessors : []) if (ref && typeof ref === 'object') visit(`${ref.kind}:${ref.id}`);
    visiting.delete(key); visited.add(key);
  };
  for (const key of activityByKey.keys()) visit(key);
  for (const key of cycles) { const item = activityByKey.get(key); if (item && stages.some(stage => stage.id === stageFor(item))) push('dependency-cycle', 'critical', 'Há uma dependência circular entre atividades. Revise a sequência ou descreva a exceção.', stageFor(item), item); }
  if (stages.length && !report.activities) push('activities-missing', 'critical', 'Mapeie atividades da entrega com registros vinculados ao serviço.');
  report.status = issues.some(issue => issue.severity === 'critical') ? 'incomplete' : issues.length ? 'attention' : 'ready_for_review';
  return report;
}

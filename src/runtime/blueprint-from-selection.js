const LAYERS = new Set(['customer', 'frontstage', 'backstage', 'process', 'enablement']);
const KIND_FOR_LAYER = { customer: 'customerAction', frontstage: 'frontstage', backstage: 'backstage', process: 'process', enablement: 'system' };

export function blueprintSelection(graph, boardId, ids) {
  const board = graph.views?.whiteboards?.[boardId];
  if (!board) throw new Error('O quadro de origem não está disponível.');
  return [...new Set(ids)].map(id => {
    const item = board.items[id];
    if (!item) throw new Error('A seleção mudou. Selecione os objetos novamente.');
    const entity = item.kind === 'smart'
      ? graph.entities?.[item.objectKind]?.[item.objectId] ?? ({stage:graph.stages,touchpoint:graph.touchpoints,problem:graph.problems,opportunity:graph.opportunities,task:graph.tasks}[item.objectKind])?.[item.objectId]
      : null;
    const excluded = item.shape === 'frame' || Boolean(item.containerType) || item.objectKind === 'stage';
    const inferred = item.serviceLayer ?? ({ frontstage: 'frontstage', backstage: 'backstage', process: 'process', system: 'enablement', resource: 'enablement', customerAction: 'customer' }[item.objectKind ?? item.semantic]);
    return { id, title: String(entity?.title ?? entity?.name ?? entity?.description ?? item.text ?? 'Objeto'),
      layer: LAYERS.has(inferred) ? inferred : 'frontstage', stageId: item.serviceStageId ?? entity?.stageId ?? '',
      excluded, reason: excluded ? 'Frames e etapas permanecem no quadro de origem.' : '',
      locked: Boolean(item.locked), linked: item.kind === 'smart' };
  });
}

/** Build a new view atomically. Existing objects and layouts are preserved. */
export function createBlueprintFromSelection(graph, input, makeId, now = new Date().toISOString()) {
  const source = graph.views?.whiteboards?.[input.sourceBoardId];
  if (!source || source.viewKind !== 'free') throw new Error('Abra um Whiteboard para organizar a seleção.');
  if (!input.name?.trim()) throw new Error('Dê um nome ao Blueprint.');
  const rows = input.items.filter(row => row.layer !== 'skip');
  if (!rows.length) throw new Error('Escolha pelo menos um objeto para o Blueprint.');
  if (new Set(rows.map(row => row.itemId)).size !== rows.length) throw new Error('Cada objeto pode aparecer uma vez nesta seleção.');
  const selection = blueprintSelection(graph, source.id, rows.map(row => row.itemId));
  if (selection.some(row => row.excluded)) throw new Error('Frames e etapas devem permanecer no quadro de origem.');
  if (input.linked && selection.some(row => row.locked && !row.linked)) throw new Error('Desbloqueie os objetos antes de vinculá-los.');
  for (const row of rows) if (!LAYERS.has(row.layer)) throw new Error('Escolha uma camada válida para cada objeto.');

  const next = structuredClone(graph);
  const origin = next.views.whiteboards[source.id];
  let journey = input.journeyId ? next.journeys[input.journeyId] : null;
  if (input.journeyId && !journey) throw new Error('A Jornada escolhida não está mais disponível.');
  if (!journey) {
    const names = (input.stageNames ?? []).map(name => name.trim()).filter(Boolean);
    if (!names.length) throw new Error('Adicione pelo menos uma etapa.');
    const id = makeId('journey');
    journey = { id, serviceId: next.service.id, name: input.newJourneyName?.trim() || input.name.trim(),
      stageIds: [], status: 'draft', priority: 'medium', createdAt: now, updatedAt: now };
    next.journeys[id] = journey;
    next.service.journeyIds.push(id);
    for (const title of names) {
      const stageId = makeId('stage');
      next.stages[stageId] = { id: stageId, journeyId: id, title, customerAction: '', emotion: 'neutral',
        touchpointIds: [], problemIds: [], opportunityIds: [], needIds: [], painIds: [], createdAt: now, updatedAt: now };
      journey.stageIds.push(stageId);
    }
  }
  const stages = journey.stageIds.map(id => next.stages[id]).filter(Boolean);
  if (!stages.length) throw new Error('A Jornada precisa ter pelo menos uma etapa.');
  const boardId = makeId('blueprint');
  const target = { id: boardId, serviceId: next.service.id, name: input.name.trim(), viewKind: 'blueprint',
    layoutMode: 'service', journeyId: journey.id, sourceBoardId: source.id, items: {}, edges: {}, createdAt: now, updatedAt: now };
  const mapping = new Map();
  const counts = new Map();
  for (const row of rows) {
    const stage = input.journeyId ? stages.find(stage => stage.id === row.stageId) : stages[Number(row.stageIndex)];
    if (!stage) throw new Error('Escolha uma etapa válida para cada objeto.');
    const item = origin.items[row.itemId];
    const description = selection.find(value => value.id === row.itemId).title;
    let copy;
    if (input.linked) {
      if (item.kind !== 'smart') {
        const kind = KIND_FOR_LAYER[row.layer], objectId = makeId(kind);
        next.entities ??= {};
        next.entities[kind] ??= {};
        next.entities[kind][objectId] = { id: objectId, type: kind, serviceId: next.service.id,
          title: description, stageId: stage.id, createdAt: now, updatedAt: now };
        Object.assign(item, { kind: 'smart', objectKind: kind, objectId,
          entityRef: { type: kind, id: objectId }, entityStatus: 'linked', instanceId: item.id });
      }
      copy = structuredClone(item);
    } else {
      // A detached copy never retains a canonical entity reference.
      copy = { kind: 'free', shape: 'note', visualKind: 'note', semantic: 'note', text: description,
        tone: item.tone ?? 'yellow', width: 288, height: 104 };
    }
    const id = makeId('item');
    const cell = `${stage.id}:${row.layer}`, offset = counts.get(cell) ?? 0;
    counts.set(cell, offset + 1);
    Object.assign(copy, { id, instanceId: id, sourceItemId: item.id, serviceStageId: stage.id,
      serviceLayer: row.layer, serviceVisibility: ['customer', 'frontstage'].includes(row.layer) ? 'customer-visible' : 'internal',
      x: 546 + stages.indexOf(stage) * 340, y: 366 + [...LAYERS].indexOf(row.layer) * 220 + offset * 118,
      width: 288, height: 104, locked: false });
    target.items[id] = copy;
    mapping.set(item.id, id);
    if (row.layer === 'customer' && !stage.customerAction) stage.customerAction = description;
  }
  // Preserve only visual connections whose two endpoints were included.
  for (const edge of Object.values(source.edges ?? {})) {
    if (!mapping.has(edge.fromId) || !mapping.has(edge.toId)) continue;
    const id = makeId('edge');
    target.edges[id] = { ...structuredClone(edge), id, fromId: mapping.get(edge.fromId), toId: mapping.get(edge.toId), waypoint: null };
  }
  next.views.whiteboards[boardId] = target;
  next.service.updatedAt = now;
  return { graph: next, boardId, count: rows.length };
}

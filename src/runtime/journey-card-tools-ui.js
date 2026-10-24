/* Card classification, filtered views and atomic bulk edits. */
const cardToolsSelection = new Set();
let cardToolsSelecting = false, cardToolsDialogIds = [], cardToolsFiltersOpen = false;
const cardToolsToneNames = { neutral: 'Sem destaque', blue: 'Azul', emerald: 'Verde', amber: 'Amarelo', rose: 'Rosa', violet: 'Violeta' };
function cardToolsPersonas() { return S.serviceElements?.persona || []; }
function cardToolsPersonaName(id) { return cardToolsPersonas().find(persona => persona.id === id)?.title || 'Persona indisponível'; }
function cardToolsFilters() { return window.BlueOceanJourneyContent.normalizeMatrixCardFilters(V.cardFilters); }
function cardToolsLinkedPersonas(note) {
  const source = pickerReferenceTypes.includes(note.type) ? pickerReference(note) : null;
  return [...new Set([...(note.personaIds || []),...(source?.personaIds || []),
    ...(note.type === 'persona' && note.referenceId ? [note.referenceId] : [])])];
}
function cardToolsMatches(note) {
  const source = pickerReferenceTypes.includes(note.type) ? pickerReference(note) : null;
  const personaIds = cardToolsLinkedPersonas(note);
  const names = personaIds.map(cardToolsPersonaName).join(' ');
  return window.BlueOceanJourneyContent.matrixCardMatches({...note, personaIds}, cardToolsFilters(), [source?.title || source?.name || '', names].join(' '));
}
function cardToolsVisibleCards() {
  const visibleRows = new Set(orderedRows().filter(row => !V.hiddenRows.includes(row.id) && !V.collapsedRows.includes(row.id)).map(row => row.id));
  return Object.entries(S.c).flatMap(([key, notes]) => visibleRows.has(key.split('|')[0]) && S.steps[Number(key.split('|')[1])]
    ? notes.flatMap((note, index) => cardToolsMatches(note) ? [{ note, key, index }] : []) : []);
}
function cardToolsSummary() {
  const hasContent = window.BlueOceanJourneyContent.matrixCardHasContent;
  const definitions = new Set(rowDefs().map(row=>row.id));
  const cards = Object.entries(S.c).flatMap(([key,notes]) => definitions.has(key.split('|')[0]) && S.steps[Number(key.split('|')[1])]
    ? notes.map(note=>({note,row:key.split('|')[0]})) : []);
  const complete = cards.filter(({note})=>hasContent(note));
  const total = complete.filter(({row})=>!V.hiddenRows.includes(row)&&!V.collapsedRows.includes(row)).length;
  const visible = cardToolsVisibleCards().filter(({note})=>hasContent(note)).length;
  const hidden = complete.filter(({row})=>V.hiddenRows.includes(row)).length;
  const collapsed = complete.filter(({row})=>!V.hiddenRows.includes(row)&&V.collapsedRows.includes(row)).length;
  const drafts = cards.filter(({note,row})=>!hasContent(note)&&!V.hiddenRows.includes(row)&&!V.collapsedRows.includes(row)).length;
  const filter = cardToolsFilters(), active = filter.query || filter.type || filter.personaId || filter.tag;
  let label = active ? visible+' de '+total+' cartões · filtros ativos' : total ? total+' cartão'+(total===1?'':'s')+' nas faixas abertas' : 'Nenhum cartão nas faixas abertas';
  if(hidden)label+=' · '+hidden+' em faixas ocultas';
  if(collapsed)label+=' · '+collapsed+' em faixas recolhidas';
  if(drafts)label+=' · '+drafts+' rascunho'+(drafts===1?'':'s')+' sem texto';
  return label;
}
function cardToolsUpdateSummary() {
  const status=app.querySelector('[data-card-count]');if(status)status.textContent=cardToolsSummary();
}
function cardToolsPruneSelection() {
  const visible = new Set(cardToolsVisibleCards().map(({ note }) => note.i));
  for (const id of cardToolsSelection) if (!visible.has(id)) cardToolsSelection.delete(id);
}
function cardToolsHeader() {
  cardToolsPruneSelection();
  const filters = cardToolsFilters(), personas = cardToolsPersonas();
  const tags = [...new Set(Object.values(S.c).flatMap(notes => notes.flatMap(note => note.tags || [])))].sort((a, b) => a.localeCompare(b));
  if (filters.tag && !tags.includes(filters.tag)) tags.push(filters.tag);
  const active = filters.query || filters.type || filters.personaId || filters.tag;
  return '<section class="card-tools" aria-label="Filtros dos cartões"><div class="card-tools-status"><button class="tb" data-act="cards-toggle-filters" aria-expanded="' + cardToolsFiltersOpen + '" aria-controls="card-filter-form">☷ Filtros' + (active ? ' · ativos' : '') + '</button><span role="status" data-card-count>' + cardToolsSummary() + '</span><button class="tb" data-act="cards-select-mode" aria-pressed="' + cardToolsSelecting + '">' + (cardToolsSelecting ? 'Concluir seleção' : 'Selecionar cartões') + '</button></div><form id="card-filter-form" ' + (cardToolsFiltersOpen ? '' : 'hidden') + '>' +
    '<label>Buscar cartões<input type="search" name="query" maxlength="160" value="' + esc(filters.query) + '" placeholder="Texto, registro ou tag"></label>' +
    '<label>Persona dos cartões<select name="personaId" aria-label="Persona dos cartões"><option value="">Todas as Personas</option>' + personas.map(persona => '<option value="' + esc(persona.id) + '" ' + (filters.personaId === persona.id ? 'selected' : '') + '>' + esc(persona.title) + '</option>').join('') + (filters.personaId && !personas.some(p => p.id === filters.personaId) ? '<option selected value="' + esc(filters.personaId) + '">Persona indisponível</option>' : '') + '</select></label>' +
    '<label>Tipo de cartão<select name="type" aria-label="Tipo de cartão"><option value="">Todos os tipos</option>' + Object.entries(contentTypes).map(([type, [, name]]) => '<option value="' + type + '" ' + (filters.type === type ? 'selected' : '') + '>' + esc(name) + '</option>').join('') + '</select></label>' +
    '<label>Tag<select name="tag" aria-label="Tag"><option value="">Todas as tags</option>' + tags.map(tag => '<option ' + (filters.tag === tag ? 'selected' : '') + '>' + esc(tag) + '</option>').join('') + '</select></label>' +
    '<label class="card-common"><input type="checkbox" name="includeUnassigned" ' + (filters.includeUnassigned ? 'checked' : '') + '>Incluir sem Persona</label>' +
    '<button type="submit" class="tb p">Aplicar filtros</button>' + (active ? '<button type="button" class="tb" data-act="cards-reset-filters">Limpar filtros</button>' : '') + '</form>' +
    (active && cardToolsFiltersOpen ? '<p class="hint">Os filtros afetam os cartões. Etapas, contexto e emoções permanecem visíveis.</p>' : '') + '</section>';
}
function cardToolsCheckbox(note) {
  return cardToolsSelecting ? '<label class="card-selection"><input type="checkbox" data-card-select="' + esc(note.i) + '" ' + (cardToolsSelection.has(note.i) ? 'checked' : '') + ' aria-label="Selecionar cartão ' + esc((note.t || contentTypes[note.type || 'card']?.[1] || '').slice(0, 80)) + '"><span>Selecionar</span></label>' : '';
}
function cardToolsBadges(note) {
  const metadata = window.BlueOceanJourneyContent.normalizeMatrixCardMetadata({...note,personaIds:cardToolsLinkedPersonas(note)});
  if (!metadata.tags.length && !metadata.personaIds.length) return '';
  return '<div class="card-badges" aria-label="Classificação do cartão">' + metadata.personaIds.map(id => '<span class="card-persona-badge">' + esc(cardToolsPersonaName(id)) + '</span>').join('') + metadata.tags.map(tag => '<span class="card-tag-badge">#' + esc(tag) + '</span>').join('') + '</div>';
}
function cardToolsBulkBar() {
  if (!cardToolsSelecting) return '';
  const count = cardToolsSelection.size;
  return '<aside class="card-bulk-bar" aria-label="Ações em lote"><span role="status">' + count + ' cartão' + (count === 1 ? '' : 's') + ' selecionado' + (count === 1 ? '' : 's') + '</span><button class="tb" data-act="cards-select-visible">Selecionar visíveis</button><button class="tb" data-act="cards-clear-selection" ' + (!count ? 'disabled' : '') + '>Limpar seleção</button><button class="tb p" data-act="cards-bulk-classify" ' + (!count ? 'disabled' : '') + '>Classificar seleção</button><button class="tb" data-act="cards-bulk-remove" ' + (!count ? 'disabled' : '') + '>Excluir seleção</button></aside>';
}
function cardToolsDialogs() { return '<dialog class="growth-dialog card-classification-dialog" id="card-classification-dialog" aria-labelledby="card-classification-title"></dialog>'; }
function cardToolsToneOptions(value) { return Object.entries(cardToolsToneNames).map(([tone, label]) => '<option value="' + tone + '" ' + (value === tone ? 'selected' : '') + '>' + label + '</option>').join(''); }
function cardToolsOpen(ids, mode) {
  const notes = Object.values(S.c).flat(), selected = notes.filter(note => ids.includes(note.i));
  if (!selected.length || selected.length !== ids.length) { contentError(Error('A seleção mudou. Selecione os cartões novamente.')); return; }
  cardToolsDialogIds = [...ids];
  const single = mode === 'single', removing = mode === 'remove', metadata = window.BlueOceanJourneyContent.normalizeMatrixCardMetadata(selected[0]);
  const personas = [...cardToolsPersonas()];
  if (single) for (const id of metadata.personaIds) if (!personas.some(p => p.id === id)) personas.push({ id, title: 'Persona indisponível' });
  const title = removing ? 'Excluir cartões selecionados' : single ? 'Classificar cartão' : 'Classificar cartões selecionados';
  let fields = '';
  if (removing) fields = '<p>Excluir ' + ids.length + ' cartão' + (ids.length === 1 ? '' : 's') + '? Esta alteração pode ser desfeita.</p>';
  else {
    if (!single) fields += '<label>Alteração<select name="operation" aria-label="Alteração"><option value="tags-add">Adicionar tags</option><option value="tags-remove">Remover tags</option><option value="persona-add">Adicionar Personas</option><option value="persona-remove">Remover Personas</option><option value="tone">Alterar destaque</option></select></label>';
    fields += '<fieldset data-card-field="personas"><legend>Personas do cartão</legend>' + (personas.length ? personas.map(persona => '<label class="card-persona-option"><input type="checkbox" name="personaIds" value="' + esc(persona.id) + '" ' + (single && metadata.personaIds.includes(persona.id) ? 'checked' : '') + '>' + esc(persona.title) + '</label>').join('') : '<p>Crie uma Persona na biblioteca do serviço para associá-la ao cartão.</p>') + '</fieldset>' +
      '<label data-card-field="tags">Tags, separadas por vírgulas<input name="tags" maxlength="820" value="' + esc(single ? metadata.tags.join(', ') : '') + '" placeholder="Ex.: onboarding, revisão"></label>' +
      '<label data-card-field="tone">Destaque do cartão<select name="tone" aria-label="Destaque do cartão">' + cardToolsToneOptions(single ? metadata.tone : 'neutral') + '</select></label>' +
      '<p class="hint">Sem Persona, o cartão pode aparecer em todos os recortes. A classificação pertence a este cartão.</p>';
  }
  const dialog = app.querySelector('#card-classification-dialog');
  dialog.innerHTML = '<form id="card-classification-form" data-mode="' + mode + '"><div class="panel-head"><h2 id="card-classification-title">' + title + '</h2><button class="x" type="button" data-act="cards-close-dialog" aria-label="Fechar classificação">×</button></div>' + fields + '<p class="form-error" role="alert"></p><footer><button type="button" class="tb" data-act="cards-close-dialog">Cancelar</button><button type="submit" class="tb p">' + (removing ? 'Confirmar exclusão' : 'Salvar classificação') + '</button></footer></form>';
  cardToolsToggleFields(dialog.querySelector('form')); dialog.showModal(); dialog.querySelector('select,input,button')?.focus();
}
function cardToolsToggleFields(form) {
  if (!form?.elements.operation) return;
  const kind = form.elements.operation.value.split('-')[0];
  for (const field of form.querySelectorAll('[data-card-field]')) {
    field.hidden = field.dataset.cardField !== (kind === 'persona' ? 'personas' : kind);
    for (const control of field.querySelectorAll('input,select')) control.disabled = field.hidden;
  }
}
function cardToolsClose() {
  const id = cardToolsDialogIds[0]; app.querySelector('#card-classification-dialog')?.close();
  const block = [...app.querySelectorAll('[data-nid]')].find(node => node.dataset.nid === id);
  (block || app.querySelector('[data-act="cards-select-mode"]'))?.focus();
}
function cardToolsSubmit(form) {
  const values = new FormData(form), mode = form.dataset.mode;
  const action = mode === 'remove' ? 'remove' : mode === 'single' ? 'metadata' : String(values.get('operation'));
  const metadata = { personaIds: values.getAll('personaIds').map(String), tags: String(values.get('tags') || '').split(','), tone: String(values.get('tone') || 'neutral') };
  try {
    if ((action.startsWith('tags-') && !metadata.tags.some(tag => tag.trim())) || (action.startsWith('persona-') && !metadata.personaIds.length)) throw Error('Escolha pelo menos uma tag ou Persona para esta alteração.');
    const next = window.BlueOceanJourneyContent.applyMatrixCardAction(S.c, cardToolsDialogIds, action, metadata, cardToolsPersonas().map(p => p.id));
    S.c = next; save(); cardToolsClose(); rerender(); focusNew('[data-act="cards-select-mode"]');
  } catch (error) { form.querySelector('.form-error').textContent = error.message; }
}
function cardToolsAction(action, data) {
  if (action === 'cards-toggle-filters') { cardToolsFiltersOpen = !cardToolsFiltersOpen; rerender(); focusNew(cardToolsFiltersOpen ? '#card-filter-form [name="query"]' : '[data-act="cards-toggle-filters"]'); return true; }
  if (action === 'cards-reset-filters') { changeView({ cardFilters: window.BlueOceanJourneyContent.normalizeMatrixCardFilters() }, '[name="query"]'); return true; }
  if (action === 'cards-select-mode') { cardToolsSelecting = !cardToolsSelecting; if (!cardToolsSelecting) cardToolsSelection.clear(); rerender(); focusNew('[data-act="cards-select-mode"]'); return true; }
  if (action === 'cards-select-visible') { cardToolsVisibleCards().forEach(({ note }) => cardToolsSelection.add(note.i)); rerender(); focusNew('[data-act="cards-bulk-classify"]'); return true; }
  if (action === 'cards-clear-selection') { cardToolsSelection.clear(); rerender(); focusNew('[data-act="cards-select-visible"]'); return true; }
  if (action === 'cards-classify') { const note = S.c[data.k]?.[Number(data.j)]; if (note) cardToolsOpen([note.i], 'single'); return true; }
  if (action === 'cards-bulk-classify' || action === 'cards-bulk-remove') { cardToolsOpen([...cardToolsSelection], action === 'cards-bulk-remove' ? 'remove' : 'bulk'); return true; }
  if (action === 'cards-close-dialog') { cardToolsClose(); return true; }
  return false;
}
function cardToolsBind() {
  app.addEventListener('change', event => {
    if (event.target.hasAttribute('data-card-select')) {
      const id = event.target.dataset.cardSelect;
      if (event.target.checked) cardToolsSelection.add(id); else cardToolsSelection.delete(id);
      rerender(); [...app.querySelectorAll('[data-card-select]')].find(node => node.dataset.cardSelect === id)?.focus();
    }
    if (event.target.name === 'operation' && event.target.form?.id === 'card-classification-form') cardToolsToggleFields(event.target.form);
  });
  app.addEventListener('submit', event => {
    const form = event.target;
    if (form.id === 'card-filter-form') {
      event.preventDefault(); const data = new FormData(form);
      changeView({ cardFilters: window.BlueOceanJourneyContent.normalizeMatrixCardFilters({ query: data.get('query'), type: data.get('type'), personaId: data.get('personaId'), tag: data.get('tag'), includeUnassigned: data.has('includeUnassigned') }) }, '[name="query"]');
    }
    if (form.id === 'card-classification-form') { event.preventDefault(); if (form.reportValidity()) cardToolsSubmit(form); }
  });
  app.addEventListener('cancel', event => { if (event.target.id === 'card-classification-dialog') { event.preventDefault(); cardToolsClose(); } }, true);
}

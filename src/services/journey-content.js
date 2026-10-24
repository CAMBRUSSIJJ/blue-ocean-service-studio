/** Shared document validation for the matrix and its canonical host. No DOM dependencies. */
export const MATRIX_REFERENCE_TYPES = ['plan', 'metric', 'channel', 'persona', 'pain', 'need', 'evidence', 'opportunity'];
export const MATRIX_CONTENT_TYPES = ['text', 'card', 'emoji', 'image', 'link', 'scale', 'embed', ...MATRIX_REFERENCE_TYPES];
export const MATRIX_IMAGE_LIMIT = 500 * 1024;
export const MATRIX_IMAGE_BUDGET = 2 * 1024 * 1024;
const clipped = (v, n) => typeof v === 'string' ? v.trim().slice(0, n) : '';
export function insertMatrixBlock(notes, note, beforeId = null) {
  if (!Array.isArray(notes) || notes.length >= 100) throw Error('Cada célula pode ter até 100 elementos.');
  if (notes.some(value => value.i === note.i)) throw Error('O elemento já está nesta célula.');
  const index = beforeId === null ? notes.length : notes.findIndex(value => value.i === beforeId);
  if (index < 0) throw Error('O ponto de inclusão mudou. Abra a inclusão novamente.');
  return [...notes.slice(0, index), note, ...notes.slice(index)];
}
export function duplicateMatrixBlock(note, id) {
  const copy = structuredClone(note);
  copy.i = id;
  for (const field of ['id', 'hostItemId', 'hostAction']) delete copy[field];
  return copy;
}
export const MATRIX_CARD_TONES = ['neutral', 'blue', 'emerald', 'amber', 'rose', 'violet'];
/** Empty inline text/card drafts stay editable without inflating the content count. */
export function matrixCardHasContent(note) {
  return Boolean(String(note.t ?? note.text ?? '').trim() || !['text','card'].includes(note.type || 'card'));
}
const metadataList = (value, limit, length, insensitive = false) => {
  const result = [], seen = new Set();
  for (const raw of Array.isArray(value) ? value : []) {
    const item = clipped(raw, length).replace(/\s+/g, ' '), key = insensitive ? item.toLocaleLowerCase() : item;
    if (!item || seen.has(key)) continue;
    seen.add(key); result.push(item);
  }
  if (result.length > limit) throw Error(`Use até ${limit} ${insensitive ? 'tags' : 'Personas'} por cartão.`);
  return result;
};
export const MATRIX_CONNECTION_TYPES = {sequence:'Sequência',dependency:'Dependência',uses:'Usa recurso',handoff:'Passagem entre equipes'};
export function normalizeMatrixActivity(input = {}) {
  const number = (key) => {
    if(input[key] === '' || input[key] == null)return null;
    const value=Number(input[key]);
    if(!Number.isFinite(value)||value<0||value>525600)throw Error('Use tempos entre zero e 525600 minutos.');
    return value;
  };
  return {category:['activity','support-process','resource'].includes(input.category)?input.category:'activity',
    owner:clipped(input.owner,160),team:clipped(input.team,160),
    resourceRefs:metadataList(input.resourceRefs,30,180),resourceNotes:clipped(input.resourceNotes,400),
    rule:clipped(input.rule,1000),durationMinutes:number('durationMinutes'),waitMinutes:number('waitMinutes'),targetMinutes:number('targetMinutes')};
}
export function matrixActivityFromRecord(record, fallbackCategory = 'activity') {
  const detail=record.operationalDetails||{};
  if(!record.owner&&!record.team&&!record.resourceRefs&&!detail.matrixCategory&&!detail.resourceNotes&&!detail.rule&&detail.durationMinutes==null&&detail.waitMinutes==null&&detail.targetMinutes==null)return null;
  return normalizeMatrixActivity({category:detail.matrixCategory||fallbackCategory,owner:record.owner,team:record.team,resourceRefs:record.resourceRefs,
    resourceNotes:detail.resourceNotes,rule:detail.rule,durationMinutes:detail.durationMinutes,waitMinutes:detail.waitMinutes,targetMinutes:detail.targetMinutes});
}
export function writeMatrixActivity(record, input) {
  const activity=normalizeMatrixActivity(input);
  record.owner=activity.owner;record.team=activity.team;record.resourceRefs=activity.resourceRefs;
  record.operationalDetails={...record.operationalDetails,matrixCategory:activity.category,resourceNotes:activity.resourceNotes,rule:activity.rule,
    durationMinutes:activity.durationMinutes==null?undefined:activity.durationMinutes,waitMinutes:activity.waitMinutes==null?undefined:activity.waitMinutes,targetMinutes:activity.targetMinutes==null?undefined:activity.targetMinutes};
}
export function normalizeMatrixConnection(input) {
  const a=clipped(input.a,160),b=clipped(input.b,160),type=Object.hasOwn(MATRIX_CONNECTION_TYPES,input.type)?input.type:'sequence';
  if(!a||!b||a===b)throw Error('Escolha duas atividades diferentes para conectar.');
  const result={...input,a,b,id:clipped(input.id,160)||('link-'+a+'-'+b).slice(0,160),type,label:clipped(input.label,160)};
  if(type==='handoff'){
    const old=input.handoff||{},fromTeam=clipped(old.fromTeam,160),toTeam=clipped(old.toTeam,160),deliverable=clipped(old.deliverable,400);
    const fold=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toLocaleLowerCase();
    if(!fromTeam||!toTeam||!deliverable||fold(fromTeam)===fold(toTeam))throw Error('Informe equipes de origem e destino diferentes e o que será transferido.');
    const deadline=old.deadlineMinutes===''||old.deadlineMinutes==null?null:Number(old.deadlineMinutes);
    if(deadline!==null&&(!Number.isFinite(deadline)||deadline<0||deadline>525600))throw Error('Informe um prazo válido em minutos.');
    result.handoff={fromTeam,toTeam,deliverable,deadlineMinutes:deadline,acceptance:clipped(old.acceptance,1000)};
  }else delete result.handoff;
  return result;
}
export function validateMatrixConnections(cells, connections = []) {
  if(!Array.isArray(connections)||connections.length>2000)throw Error('Use até 2000 conexões no mapa.');
  const notes=new Map(Object.entries(cells).flatMap(([key,values])=>values.map(note=>[note.i??note.id,{...note,row:key.split('|')[0]}])));
  const ids=new Set(),edges=[];
  for(const value of connections){
    const link=normalizeMatrixConnection(value);
    if(!notes.has(link.a)||!notes.has(link.b))throw Error('Uma atividade desta conexão não está mais disponível.');
    if(ids.has(link.id))throw Error('A conexão já existe.');ids.add(link.id);
    const target=notes.get(link.b);
    if(link.type==='uses'&&target.activity?.category!=='resource'&&!(target.row==='sy'&&!target.activity)&&!['channel','metric'].includes(target.type))throw Error('Uma conexão de uso precisa apontar para um recurso. Classifique o destino nos detalhes da atividade.');
    edges.push(link);
  }
  const successors=new Map();for(const link of edges.filter(link=>link.type==='dependency'))successors.set(link.a,[...(successors.get(link.a)||[]),link.b]);
  const done=new Set(),active=new Set();
  const visit=id=>{if(active.has(id))throw Error('As dependências não podem formar um ciclo.');if(done.has(id))return;active.add(id);for(const next of successors.get(id)||[])visit(next);active.delete(id);done.add(id)};
  for(const id of successors.keys())visit(id);
  return edges;
}
export function matrixStageGeometry(widths) {
  let total=0;
  const stages=widths.map(value=>{const width=Number(value);if(!Number.isFinite(width)||width<=0)throw Error('Largura de etapa inválida.');const stage={left:total,width,center:total+width/2};total+=width;return stage});
  return {stages,total};
}

export function normalizeMatrixCardMetadata(input = {}) {
  return { personaIds: metadataList(input.personaIds, 20, 160), tags: metadataList(input.tags, 20, 40, true),
    tone: MATRIX_CARD_TONES.includes(input.tone) ? input.tone : 'neutral' };
}
export function normalizeMatrixCardFilters(input = {}) {
  return { query: clipped(input?.query, 160), type: MATRIX_CONTENT_TYPES.includes(input?.type) ? input.type : '',
    personaId: clipped(input?.personaId, 160), tag: clipped(input?.tag, 40), includeUnassigned: input?.includeUnassigned !== false };
}
export function matrixCardMatches(note, input = {}, extraText = '') {
  const filter = normalizeMatrixCardFilters(input), metadata = normalizeMatrixCardMetadata(note);
  if (filter.type && (note.type || 'card') !== filter.type) return false;
  if (filter.personaId && !metadata.personaIds.includes(filter.personaId) && !(filter.includeUnassigned && !metadata.personaIds.length)) return false;
  if (filter.tag && !metadata.tags.some(tag => tag.toLocaleLowerCase() === filter.tag.toLocaleLowerCase())) return false;
  const fold = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const searchable = fold([note.t ?? note.text ?? '', note.icon || '', note.activity?.owner || '', note.activity?.team || '', note.activity?.resourceNotes || '', ...metadata.tags, extraText].join(' '));
  return !filter.query || fold(filter.query).split(/\s+/).every(word => searchable.includes(word));
}
/** Atomic edits use stable card IDs, never positions in a filtered rendering. */
export function applyMatrixCardAction(cells, selectedIds, action, input = {}, availablePersonaIds) {
  const selected = new Set(selectedIds), found = new Set(), next = {};
  if (!selected.size) throw Error('Selecione pelo menos um cartão.');
  if (!['metadata', 'tags-add', 'tags-remove', 'persona-add', 'persona-remove', 'tone', 'remove'].includes(action)) throw Error('Alteração de cartão inválida.');
  for (const [key, notes] of Object.entries(cells)) {
    next[key] = notes.flatMap(note => {
      if (!selected.has(note.i ?? note.id)) return [note];
      found.add(note.i ?? note.id);
      if (action === 'remove') return [];
      const previous = normalizeMatrixCardMetadata(note);
      let patch = {};
      if (action === 'metadata') patch = input;
      if (action === 'tags-add') patch.tags = [...previous.tags, ...(input.tags || [])];
      if (action === 'tags-remove') patch.tags = previous.tags.filter(tag => !(input.tags || []).some(value => value.trim().toLocaleLowerCase() === tag.toLocaleLowerCase()));
      if (action === 'persona-add') patch.personaIds = [...previous.personaIds, ...(input.personaIds || [])];
      if (action === 'persona-remove') patch.personaIds = previous.personaIds.filter(id => !(input.personaIds || []).includes(id));
      if (action === 'tone') patch.tone = input.tone;
      const metadata = normalizeMatrixCardMetadata({ ...previous, ...patch });
      if (availablePersonaIds && metadata.personaIds.some(id => !previous.personaIds.includes(id) && !availablePersonaIds.includes(id))) throw Error('Uma Persona selecionada não está disponível neste serviço.');
      return [{ ...note, ...metadata }];
    });
  }
  if (found.size !== selected.size) throw Error('A seleção mudou. Selecione os cartões novamente.');
  validateMatrixDocument({ c: next });
  return next;
}
/** Read-only summaries of existing service records for the insertion catalog. */
export function matrixServiceReferences(graph, { journeyId = '', actorId = '' } = {}) {
  const result = {};
  const belongs = record => record && (!record.serviceId || record.serviceId === graph.service.id);
  const usage = new Map();
  const addStage = (type, id, stageId) => {
    if (!id || !graph.stages?.[stageId]) return;
    const key = type + ':' + id;
    if (!usage.has(key)) usage.set(key, new Set());
    usage.get(key).add(stageId);
  };
  for (const journey of Object.values(graph.journeys || {}).filter(belongs)) {
    for (const [stageId, rows] of Object.entries(journey.matrixContent?.cells || {})) {
      if (!(journey.stageIds || []).includes(stageId)) continue;
      for (const notes of Object.values(rows)) for (const note of Array.isArray(notes) ? notes : []) addStage(note.type, note.referenceId, stageId);
    }
  }
  for (const stage of Object.values(graph.stages || {})) {
    for (const type of ['persona', 'channel', 'pain', 'need', 'evidence', 'opportunity']) {
      for (const id of Array.isArray(stage[type + 'Ids']) ? stage[type + 'Ids'] : []) addStage(type, id, stage.id);
    }
  }
  const related = (record, type) => Object.values(graph.entities?.[type] || {}).filter(belongs).filter(other =>
    [record.relatedIds, record[type + 'Ids']].some(ids => Array.isArray(ids) && ids.includes(other.id)) ||
    [other.relatedIds, other.painIds].some(ids => Array.isArray(ids) && ids.includes(record.id))
  ).map(other => ({ id: other.id, title: clipped(other.title || other.name || other.description, 1000) || 'Sem nome', source: clipped(other.source, 1000) }));
  for (const type of ['channel', 'persona', 'pain', 'need', 'evidence', 'opportunity']) {
    const records = { ...(graph.entities?.[type] || {}), ...(type === 'pain' ? graph.problems : type === 'opportunity' ? graph.opportunities : {}) };
    result[type] = Object.values(records).filter(belongs).map(record => {
      addStage(type, record.id, record.stageId);
      const stages = [...(usage.get(type + ':' + record.id) || [])].map(id => ({ id, title: clipped(graph.stages[id].title, 240), journeyId: graph.stages[id].journeyId || Object.values(graph.journeys || {}).find(j => j.stageIds?.includes(id))?.id || '' }));
      return {
        id: record.id,
        title: clipped(record.title || record.name || record.description, 1000) || 'Sem nome',
        description: clipped(record.description || record.context, 1000),
        category: clipped(record.category, 160),
        source: clipped(record.source, 1000),
        stageName: clipped(graph.stages?.[record.stageId]?.title, 240),
        stages, inJourney: stages.some(stage => stage.journeyId === journeyId) || type === 'persona' && graph.journeys?.[journeyId]?.personaId === record.id,
        createdByMe: !!actorId && record.createdBy === actorId,
        status: clipped(record.status, 80), tags: (Array.isArray(record.tags) ? record.tags : []).map(tag => clipped(tag, 40)).filter(Boolean).slice(0, 20),
        needs: related(record, 'need'), evidence: related(record, 'evidence')
      };
    });
  }
  return result;
}
export function matrixSafeUrl(value, image = false) {
  const valueString = typeof value === 'string' ? value.trim() : '';
  if (image && /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(valueString)) {
    if (valueString.length > Math.ceil(MATRIX_IMAGE_LIMIT * 4 / 3) + 100) return '';
    return valueString;
  }
  if (valueString.length > 2048) return '';
  try {
    const url = new URL(valueString);
    if (!['https:', ...(image ? [] : ['http:'])].includes(url.protocol) || url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}
/** Only provider URLs are embedded; arbitrary HTML remains plain text. */
export function matrixEmbedUrl(value) {
  const safe = matrixSafeUrl(value, true);
  if (!safe || safe.startsWith('data:')) return '';
  const url = new URL(safe), host = url.hostname.toLowerCase().replace(/^www\./, '');
  let id = '';
  if (host === 'youtu.be') id = url.pathname.slice(1);
  if (['youtube.com', 'youtube-nocookie.com'].includes(host)) id = url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : url.searchParams.get('v') || '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(id)) return 'https://www.youtube-nocookie.com/embed/' + id;
  if (['vimeo.com', 'player.vimeo.com'].includes(host)) {
    id = url.pathname.replace(/^\/video\//, '').replace(/^\//, '');
    if (/^\d+$/.test(id)) return 'https://player.vimeo.com/video/' + id;
  }
  if (host === 'figma.com' && /^\/(file|design|proto)\//.test(url.pathname)) return 'https://www.figma.com/embed?embed_host=share&url=' + encodeURIComponent(safe);
  return '';
}
export function normalizeMatrixScale(input = {}) {
  const number = (v, fallback) => v === '' || v === null || v === undefined ? fallback : Number(v);
  const min = number(input.min, 0), max = number(input.max, 10), step = number(input.step, 1);
  if (![min, max, step].every(Number.isFinite) || min >= max || max - min > 1000000 || step <= 0 || step > max - min) throw Error('Revise o início, o fim e o intervalo da escala.');
  const scale = { min, max, step, minLabel: clipped(input.minLabel, 80), maxLabel: clipped(input.maxLabel, 80) };
  const value = number(input.value, undefined);
  if (value !== undefined) {
    if (!Number.isFinite(value) || value < min || value > max || Math.abs((value-min)/step - Math.round((value-min)/step)) > 1e-7) throw Error('O valor precisa respeitar os limites e o intervalo da escala.');
    scale.value = value;
  }
  return scale;
}
export function normalizeMatrixBlock(note) {
  const type = MATRIX_CONTENT_TYPES.includes(note?.type) ? note.type : 'card';
  const normalized = { id: clipped(note?.id ?? note?.i, 160), type, text: clipped(note?.text ?? note?.t, 1000) };
  if (!normalized.id) throw Error('O elemento precisa de uma identificação.');
  const icon = clipped(note?.icon, 24);
  if (icon) normalized.icon = icon;
  if (type === 'link' || type === 'image') {
    normalized.url = matrixSafeUrl(note?.url, type === 'image');
    if (!normalized.url) throw Error(type === 'image' ? 'Use uma imagem HTTPS ou um arquivo JPG, PNG ou WebP de até 500 KB.' : 'Informe um link completo HTTP ou HTTPS.');
    if (!normalized.text) throw Error(type === 'image' ? 'Descreva a imagem para quem não consegue vê-la.' : 'Dê um título ao link.');
  }
  if (type === 'scale') normalized.scale = normalizeMatrixScale(note.scale);
  if (type === 'embed') {
    normalized.url = matrixSafeUrl(note.url, true);
    if (!matrixEmbedUrl(normalized.url)) throw Error('Use um endereço de YouTube, Vimeo ou Figma.');
    if (!normalized.text) throw Error('Dê um título ao conteúdo incorporado.');
  }
  if (MATRIX_REFERENCE_TYPES.includes(type)) {
    normalized.referenceId = clipped(note.referenceId, 160);
    if (!normalized.referenceId) throw Error('Selecione um registro do serviço.');
  }
  if (note?.credit) normalized.credit = clipped(note.credit, 240);
  const metadata = normalizeMatrixCardMetadata(note);
  if (Array.isArray(note.personaIds)) normalized.personaIds = metadata.personaIds;
  if (Array.isArray(note.tags)) normalized.tags = metadata.tags;
  if (note.tone) normalized.tone = metadata.tone;
  if (note.activity) normalized.activity = normalizeMatrixActivity(note.activity);
  if (note.canvas && typeof note.canvas==='object') {
    const kind=clipped(note.canvas.kind,30);
    if(!['activity','touchpoint','artifact','decision','system','resource','metric'].includes(kind))throw Error('Tipo de componente do canvas inválido.');
    normalized.canvas={version:1,kind,description:clipped(note.canvas.description,1000),channelId:clipped(note.canvas.channelId,160),metricId:clipped(note.canvas.metricId,160)};
  }
  return normalized;
}
export function normalizeMatrixRow(input = {}) {
  return { n: clipped(input.n, 100), h: clipped(input.h, 240), icon: clipped(input.icon, 24),
    defaultType: MATRIX_CONTENT_TYPES.includes(input.defaultType) ? input.defaultType : 'card',
    tone: MATRIX_CARD_TONES.includes(input.tone) ? input.tone : 'neutral' };
}
export function validateMatrixDocument(doc) {
  let imageBytes = 0;
  if (Object.keys(doc.c || {}).length > 9000) throw Error('O mapa atingiu o limite de células.');
  for (const [key, notes] of Object.entries(doc.c || {})) {
    if (!Array.isArray(notes) || notes.length > 100) throw Error('Cada célula pode ter até 100 elementos.');
    for (const note of notes) {
      const block = normalizeMatrixBlock(note),row=key.split('|')[0];
      if(block.activity&&['fl','bk'].includes(row)&&block.activity.category!=='activity')throw Error('Recursos e processos de suporte pertencem à faixa Sistemas e apoio.');
      if(block.activity&&row==='sy'&&block.activity.category==='activity')throw Error('Coloque as atividades de execução em Linha de frente ou Bastidores.');
      if (block.type === 'image' && block.url.startsWith('data:')) imageBytes += block.url.length * .75;
    }
  }
  if(doc.links)validateMatrixConnections(doc.c,doc.links);
  if (imageBytes > MATRIX_IMAGE_BUDGET) throw Error('As imagens deste mapa atingiram 2 MB. Use imagens menores ou links HTTPS.');
}
export function matrixContentFromDocument(doc, stageIds, sync = {}) {
  const rows = {}, cells = {};
  for (const [id, value] of Object.entries(doc.rowSettings || {})) {
    if (/^[a-z][a-z0-9]{0,24}$/.test(id)) rows[id] = normalizeMatrixRow(value);
  }
  stageIds.forEach((id, index) => {
    cells[id] = {};
    for (const [key, notes] of Object.entries(doc.c || {})) {
      const [row, column] = key.split('|');
      if (Number(column) !== index || !/^[a-z][a-z0-9]{0,24}$/.test(row)) continue;
      cells[id][row] = notes.map(note => normalizeMatrixBlock({ ...note, id: note.hostItemId || sync.notes?.[note.i] || note.i }));
    }
  });
  const identities=new Map(Object.values(doc.c||{}).flatMap(notes=>notes.map(note=>[note.i,note.hostItemId||sync.notes?.[note.i]||note.i])));
  const connections=validateMatrixConnections(doc.c,doc.links||[]).map(link=>({...link,a:identities.get(link.a),b:identities.get(link.b)}));
  return { version: 1, rows, cells, connections };
}
/** Canonical text wins after an edit elsewhere; supplemental rows belong to this document. */
export function restoreMatrixContent(ref, stored, stageIds) {
  ref.rowSettings = stored?.rows || {};
  stageIds.forEach((id, index) => {
    for (const [row, blocks] of Object.entries(stored?.cells?.[id] || {})) {
      const key = row + '|' + index;
      if (['sd', 'em', 'im'].includes(row)) {
        ref.c[key] = blocks.map(block => ({ ...block, i: block.id, t: block.text }));
        continue;
      }
      const existing = ref.c[key] || [];
      const included = new Set();
      ref.c[key] = blocks.flatMap(block => {
        const note = existing.find(n => (n.hostItemId || n.i) === block.id);
        if (note) {
          included.add(note.i);
          const { id: _id, text: _text, ...metadata } = block;
          return [{ ...note, ...metadata }];
        }
        if (MATRIX_REFERENCE_TYPES.includes(block.type)) return [{ ...block, i: block.id, t: block.text }];
        return [];
      });
      ref.c[key].push(...existing.filter(note => !included.has(note.i)));
      // Empty drafts have no canonical graph object yet.
      for (const block of blocks) if (!block.text && !MATRIX_REFERENCE_TYPES.includes(block.type) && !existing.some(n => (n.hostItemId || n.i) === block.id)) ref.c[key].push({ ...block, i: block.id, t: '' });
    }
  });
  if(Array.isArray(stored?.connections)){
    const identities=new Map(Object.values(ref.c).flatMap(notes=>notes.map(note=>[note.hostItemId||note.i,note.i])));
    ref.links=stored.connections.filter(link=>identities.has(link.a)&&identities.has(link.b)).map(link=>({...link,a:identities.get(link.a),b:identities.get(link.b)}));
  }
  return ref;
}

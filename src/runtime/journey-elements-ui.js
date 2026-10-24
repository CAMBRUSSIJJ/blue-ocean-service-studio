/* One service-record selector shared by Journey and Blueprint reference cards. */
const elementTypes=['pain','need','persona','evidence','channel','opportunity'];
const elementPlurals={pain:'dores',need:'necessidades',persona:'Personas',evidence:'evidências',channel:'canais',opportunity:'oportunidades'};
let elementState=null,elementPending='';
function elementsDialog(){return app.querySelector('#element-selector')}
function elementsSources(){return pickerSources(elementState.type)}
function elementsOpen(type,note=null){
  const stage=S.steps[Number(contentCellKey.split('|')[1])];
  if(!stage)return;
  elementPending='';
  elementState={type,stageId:stage.hostStageId,stageLocalId:stage.hostLocalId,rowId:contentCellKey.split('|')[0],editingId:note?.i||'',beforeId:contentBeforeId,
    selected:note?.referenceId||'',query:'',scope:'all',category:'',stage:'',evidenceOnly:false,creating:false,caption:note?.t||''};
  const dialog=elementsDialog(),plural=elementPlurals[type],sources=elementsSources();
  dialog.innerHTML='<div class="panel-head"><div><h2 id="element-selector-title">'+(note?'Editar vínculo de ':'Adicionar ')+esc(contentTypes[type][1].toLowerCase())+'</h2><p class="hint">Vincular à etapa <b>'+esc(stage.n)+'</b></p></div><button type="button" class="x" data-act="elements-close" aria-label="Fechar seletor de elementos">×</button></div>'+
    '<div class="element-columns"><section class="element-library" aria-label="Biblioteca de '+plural+'"><label for="element-search">Pesquisar '+plural+'</label><input id="element-search" type="search" maxlength="160" placeholder="Pesquisar nome, descrição ou fonte" autocomplete="off">'+
    '<button type="button" class="tb element-create" data-act="elements-create" '+(!HOSTED?'disabled':'')+'>+ Criar '+(type==='channel'?'novo canal':type==='persona'?'nova Persona':'nova '+contentTypes[type][1].toLowerCase())+'</button>'+
    '<div class="element-scopes" role="group" aria-label="Origem dos elementos">'+[['all','Todos os registros'],['journey','Desta Jornada'],['mine','Criados por mim']].map(([id,label])=>'<button type="button" class="tb" data-act="elements-scope" data-scope="'+id+'" aria-pressed="'+(id==='all')+'">'+label+'</button>').join('')+'</div>'+
    '<details class="element-filters"><summary>Filtros personalizados</summary><label>Categoria<select id="element-category" aria-label="Categoria"><option value="">Todas as categorias</option>'+[...new Set(sources.map(r=>r.category).filter(Boolean))].sort().map(value=>'<option>'+esc(value)+'</option>').join('')+'</select></label><label>Etapa em que aparece<select id="element-stage" aria-label="Etapa em que aparece"><option value="">Todas as etapas</option>'+[...new Map(sources.flatMap(r=>r.stages||[]).map(stage=>[stage.id,stage])).values()].map(stage=>'<option value="'+esc(stage.id)+'">'+esc(stage.title)+'</option>').join('')+'</select></label><label class="element-check"><input type="checkbox" id="element-evidence"> Com evidências vinculadas</label><button type="button" class="tb" data-act="elements-reset">Limpar filtros</button></details>'+
    '<p id="element-count" class="hint" role="status" aria-live="polite"></p><div class="element-results" role="group" aria-label="Registros encontrados"></div></section>'+
    '<section class="element-detail" aria-label="Detalhes do registro"></section></div><p class="form-error" role="alert"></p>'+
    '<footer><label class="element-caption">Legenda no mapa<input id="element-caption" maxlength="1000" value="'+esc(elementState.caption)+'" placeholder="Usar o nome do registro"></label>'+(type==='persona'?'<label class="element-check"><input type="checkbox" id="element-journey-persona"> Usar também como Persona da jornada</label><p class="hint">O cartão marca onde esta pessoa aparece. Esta escolha define de quem são a experiência e as emoções da Jornada.</p>':'')+'<div class="element-footer-actions"><button type="button" class="tb" data-act="elements-close">Cancelar</button><button type="button" class="tb p" data-act="elements-link" '+(!HOSTED?'disabled':'')+'>Vincular à etapa</button></div></footer>';
  elementsRefresh();dialog.showModal();dialog.querySelector('#element-search').focus();
}
function elementsFiltered(){
  const state=elementState,words=pickerFold(state.query.trim()).split(/\s+/).filter(Boolean);
  return elementsSources().filter(record=>(state.scope!=='journey'||record.inJourney)&&(state.scope!=='mine'||record.createdByMe)&&
    (!state.category||record.category===state.category)&&(!state.stage||record.stages?.some(stage=>stage.id===state.stage))&&
    (!state.evidenceOnly||record.evidence?.length)&&words.every(word=>pickerFold([record.title,record.description,record.source,record.category,...(record.tags||[])].join(' ')).includes(word)));
}
function elementsRelated(title,records){return '<h4>'+title+'</h4>'+(records?.length?'<ul>'+records.map(record=>'<li>'+esc(record.title)+(record.source?'<small>'+esc(record.source)+'</small>':'')+'</li>').join('')+'</ul>':'<p class="hint">Nenhum vínculo registrado.</p>')}
function elementsDetail(){
  const dialog=elementsDialog(),pane=dialog.querySelector('.element-detail'),state=elementState;
  if(state.creating){
    pane.innerHTML='<form id="element-create-form"><h3>Criar '+esc(contentTypes[state.type][1].toLowerCase())+'</h3><p class="hint">O novo registro ficará disponível na biblioteca do serviço.</p><label>Nome do registro<input name="title" maxlength="240" required></label><label>Descrição<textarea name="description" maxlength="1000" rows="4"></textarea></label><label>Categoria<input name="category" maxlength="160"></label>'+(state.type==='evidence'?'<label>Fonte da evidência<input name="source" maxlength="1000" required placeholder="Ex.: entrevista, observação ou documento"></label>':'')+'<div class="element-create-actions"><button type="button" class="tb" data-act="elements-back">Voltar aos registros</button><button type="submit" class="tb p" '+(!HOSTED?'disabled':'')+'>Criar e vincular à etapa</button></div></form>';
    return;
  }
  const record=elementsSources().find(value=>value.id===state.selected);
  pane.innerHTML=record?'<h3>'+esc(record.title)+'</h3><p class="element-description">'+esc(record.description||'Sem descrição.')+'</p>'+(record.category?'<p><b>Categoria:</b> '+esc(record.category)+'</p>':'')+(record.source?'<h4>Fonte</h4><p>'+esc(record.source)+'</p>':'')+
    elementsRelated('Necessidades relacionadas',record.needs)+elementsRelated('Evidências existentes',record.evidence)+'<h4>Etapas em que aparece</h4>'+(record.stages?.length?'<ul>'+record.stages.map(stage=>'<li>'+esc(stage.title)+'</li>').join('')+'</ul>':'<p class="hint">Ainda não aparece em uma etapa.</p>')+'<p class="hint">O cartão acompanha este registro do serviço. A legenda pertence apenas ao mapa.</p>':
    '<div class="element-placeholder"><span aria-hidden="true">'+contentTypes[state.type][0]+'</span><h3>Selecione um registro</h3><p>Veja os detalhes antes de vincular ou crie um novo registro sem sair do mapa.</p>'+(!HOSTED?'<p>Abra este mapa no projeto para acessar os registros do serviço.</p>':'')+'</div>';
}
function elementsRefresh(){
  const dialog=elementsDialog();if(!elementState||!dialog?.querySelector('.element-results'))return;
  const state=elementState,records=elementsFiltered();
  if(state.selected&&!records.some(record=>record.id===state.selected))state.selected='';
  dialog.querySelector('.element-results').innerHTML=records.length?records.map(record=>'<button type="button" class="element-record" data-act="elements-select" data-source="'+esc(record.id)+'" aria-pressed="'+(record.id===state.selected)+'"><b>'+esc(record.title)+'</b><small>'+esc(record.description||record.category||'Sem descrição')+'</small>'+(record.inJourney?'<span>Nesta Jornada</span>':'')+'</button>').join(''):'<p class="element-empty">'+(elementsSources().length?'Nenhum registro corresponde à busca e aos filtros.':'Nenhum registro de '+contentTypes[state.type][1].toLowerCase()+' disponível. Crie o primeiro aqui.')+'</p>';
  dialog.querySelector('#element-count').textContent=records.length+' registro(s) encontrado(s)';
  dialog.querySelectorAll('[data-act="elements-scope"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scope===state.scope)));
  const link=dialog.querySelector('[data-act="elements-link"]');link.hidden=state.creating;link.disabled=!HOSTED||!state.selected||!!elementPending;
  // Do not replace a creation draft when the host refreshes canonical summaries.
  if(!state.creating||!dialog.querySelector('#element-create-form'))elementsDetail();
}
function elementsClose(){if(elementPending)return;elementsDialog()?.close();elementState=null;contentBeforeId=null;focusNew('[data-act="add"][data-k="'+contentCellKey+'"]')}
function elementsSend(newRecord=null){
  if(elementPending||!HOSTED)return;
  const dialog=elementsDialog(),state=elementState;
  if(!newRecord&&!state.selected)return;
  state.caption=dialog.querySelector('#element-caption').value;
  const useAsJourneyPersona=dialog.querySelector('#element-journey-persona')?.checked===true;
  elementPending=uid();dialog.querySelector('.form-error').textContent='';dialog.setAttribute('aria-busy','true');
  dialog.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=true);
  window.parent.postMessage({boBlueprintHost:1,type:'element-link',requestId:elementPending,input:{elementType:state.type,stageId:state.stageId,stageLocalId:state.stageLocalId,useAsJourneyPersona,rowId:state.rowId,
    editingId:state.editingId,beforeId:state.beforeId,caption:state.caption,referenceId:newRecord?'':state.selected,newRecord}},location.origin);
}
function elementsResult(data){
  if(!elementPending||data.requestId!==elementPending)return;
  elementPending='';const dialog=elementsDialog();dialog.removeAttribute('aria-busy');
  if(!dialog.open||!elementState)return;
  if(!data.ok){dialog.querySelectorAll('button,input,textarea,select').forEach(el=>el.disabled=false);dialog.querySelector('.form-error').textContent=data.error||'Não foi possível salvar. Tente novamente.';elementsRefresh();return}
  dialog.close();elementState=null;contentBeforeId=null;
  S=data.state;H=S.history||H;V=viewState(S.view);last=JSON.stringify(S);growthLastPatch=growthPatchKey();announceSave(true);rerender();
  focusNew('[data-nid="'+data.noteId+'"]');
}
function elementsAction(action,data){
  if(!action.startsWith('elements-'))return false;
  if(elementPending)return true;
  const dialog=elementsDialog();dialog.querySelector('.form-error').textContent='';
  if(action==='elements-close'){elementsClose();return true}
  if(action==='elements-link'){elementsSend();return true}
  if(action==='elements-select'){elementState.creating=false;elementState.selected=data.source;elementsRefresh();[...dialog.querySelectorAll('.element-record')].find(button=>button.dataset.source===data.source)?.focus();return true}
  if(action==='elements-scope'){elementState.scope=data.scope;elementsRefresh();return true}
  if(action==='elements-create'){elementState.creating=true;elementsRefresh();dialog.querySelector('[name="title"]').value=elementState.query;dialog.querySelector('[name="title"]').focus();return true}
  if(action==='elements-back'){elementState.creating=false;elementsRefresh();dialog.querySelector('#element-search').focus();return true}
  if(action==='elements-reset'){Object.assign(elementState,{query:'',scope:'all',category:'',stage:'',evidenceOnly:false});dialog.querySelector('#element-search').value='';dialog.querySelector('#element-category').value='';dialog.querySelector('#element-stage').value='';dialog.querySelector('#element-evidence').checked=false;elementsRefresh()}
  return true;
}
function elementsBind(){
  app.addEventListener('input',event=>{if(event.target.id==='element-search'){elementState.query=event.target.value;elementsRefresh()}});
  app.addEventListener('change',event=>{const field={ 'element-category':'category','element-stage':'stage','element-evidence':'evidenceOnly' }[event.target.id];if(field){elementState[field]=field==='evidenceOnly'?event.target.checked:event.target.value;elementsRefresh()}});
  app.addEventListener('submit',event=>{if(event.target.id!=='element-create-form')return;event.preventDefault();if(!event.target.reportValidity())return;const data=new FormData(event.target);elementsSend(Object.fromEntries(data))});
  app.addEventListener('cancel',event=>{if(event.target.id==='element-selector'){event.preventDefault();elementsClose()}},true);
  app.addEventListener('keydown',event=>{
    if(!event.target.closest('#element-selector')||elementPending||!['ArrowDown','ArrowUp'].includes(event.key)||!event.target.matches('#element-search,.element-record'))return;
    const options=[...elementsDialog().querySelectorAll('.element-record')];if(!options.length)return;
    event.preventDefault();event.stopPropagation();const index=options.indexOf(document.activeElement),next=event.key==='ArrowDown'?(index+1)%options.length:(index-1+options.length)%options.length;
    options[next].focus();
  });
}

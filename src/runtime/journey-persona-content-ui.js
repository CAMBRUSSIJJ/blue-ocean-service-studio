/* Persona visibility never removes notes from S.c or changes their source indices. */
let personaContentKey='',personaContentId='';
const personaFilterNames={all:'Todos os cartões',selected:'Persona e cartões comuns',exclusive:'Somente cartões da Persona'};
function personaContentVisible(note){return window.BlueOceanJourneyContent.matrixBlockVisible(note,V.personaFilter,S.personaId)}
function personaContentIds(note){return window.BlueOceanJourneyContent.normalizeMatrixPersonaIds(note.personaIds)}
function personaContentLabel(id){return (S.serviceElements?.persona||[]).find(record=>record.id===id)?.title||'Persona indisponível ('+id+')'}
function personaContentBadge(note){const ids=personaContentIds(note);return ids.length?'<small class="card-personas">Personas: '+esc(ids.map(personaContentLabel).join(', '))+'</small>':''}
function personaDraftMetadata(){return V.personaFilter!=='all'&&S.personaId?{personaIds:[S.personaId]}:{}}
function personaCanCreate(){if(V.personaFilter==='all'||contextPersona())return true;contentError(Error('Selecione uma Persona disponível ou mostre todos os cartões antes de adicionar.'));return false}
function personaNeighbor(notes,index,direction){for(let n=index+direction;n>=0&&n<notes.length;n+=direction)if(personaContentVisible(notes[n])&&structureHasSpan(notes[n])===structureHasSpan(notes[index]))return n;return -1}
function personaContentHeader(){
  const notes=orderedRows().filter(row=>!V.hiddenRows.includes(row.id)).flatMap(row=>S.steps.flatMap((_,i)=>S.c[row.id+'|'+i]||[])),count=notes.filter(personaContentVisible).length,available=!!contextPersona();
  return '<div class="persona-content-filter"><label>Cartões exibidos<select data-persona-filter aria-label="Cartões exibidos">'+Object.entries(personaFilterNames).map(([mode,label])=>'<option value="'+mode+'" '+(V.personaFilter===mode?'selected':'')+' '+(mode!=='all'&&!available?'disabled':'')+'>'+label+'</option>').join('')+'</select></label><p id="persona-content-status" role="status">'+count+' de '+notes.length+' cartões nas faixas visíveis.'+(V.personaFilter!=='all'?'<small>Recorte de '+esc(contextPersonaName())+'. '+(available?'Novos cartões serão vinculados a esta Persona.':'Selecione uma Persona disponível para adicionar cartões.')+'</small>':'<small>Vincule Personas pelo menu de cada cartão. Sem vínculos, ele é comum.</small>')+'</p>'+(V.personaFilter!=='all'?'<button class="tb" data-act="persona-show-all">Mostrar todos os cartões</button>':'')+'</div>';
}
function personaContentDialogs(){return '<dialog class="growth-dialog card-persona-dialog" id="card-persona-dialog" aria-labelledby="card-persona-title"></dialog>'}
function personaContentOpen(key,index){
  const note=S.c[key]?.[index];if(!note)return;personaContentKey=key;personaContentId=note.i;
  const ids=personaContentIds(note),records=S.serviceElements?.persona||[],missing=ids.filter(id=>!records.some(record=>record.id===id)),dialog=app.querySelector('#card-persona-dialog');
  dialog.innerHTML='<form id="card-persona-form"><div class="panel-head"><h2 id="card-persona-title">Personas do cartão</h2><button class="x" type="button" data-act="persona-close" aria-label="Fechar vínculos de Persona">×</button></div><p>Escolha quem vive este conteúdo. O vínculo controla sua exibição e preserva o registro do serviço.</p><label class="persona-check"><input type="checkbox" name="common" '+(!ids.length?'checked':'')+'>Comum a todas as Personas</label><fieldset><legend>Personas vinculadas</legend>'+(records.length||missing.length?'':'<p>Nenhuma Persona cadastrada no serviço. Cadastre uma na biblioteca para vinculá-la.</p>')+records.map(record=>'<label class="persona-check"><input type="checkbox" name="persona" value="'+esc(record.id)+'" '+(ids.includes(record.id)?'checked':'')+'>'+esc(record.title)+'</label>').join('')+missing.map(id=>'<label class="persona-check unavailable"><input type="checkbox" name="persona" value="'+esc(id)+'" checked>'+esc(personaContentLabel(id))+'<small>Desmarque para remover este vínculo.</small></label>').join('')+'</fieldset><p class="hint">Nenhuma Persona selecionada significa conteúdo comum. O tipo Persona do cartão é uma referência independente destes vínculos.</p><p class="form-error" role="alert"></p><footer><button class="tb" type="button" data-act="persona-close">Cancelar</button><button class="tb p" type="submit">Salvar vínculos</button></footer></form>';
  dialog.showModal();dialog.querySelector('input').focus();
}
function personaContentClose(){app.querySelector('#card-persona-dialog')?.close();focusNew('[data-nid="'+personaContentId+'"] summary')}
function personaContentSubmit(form){
  try{
    const notes=S.c[personaContentKey]||[],index=notes.findIndex(note=>note.i===personaContentId);if(index<0)throw Error('O cartão mudou. Reabra os vínculos.');
    const next=window.BlueOceanJourneyContent.assignMatrixBlockPersonas(notes[index],new FormData(form).getAll('persona'),(S.serviceElements?.persona||[]).map(record=>record.id));
    const updated=notes.map((note,i)=>i===index?next:note),c={...S.c,[personaContentKey]:updated};window.BlueOceanJourneyContent.validateMatrixDocument({c});S.c=c;save();const visible=personaContentVisible(next);app.querySelector('#card-persona-dialog').close();rerender();focusNew(visible?'[data-nid="'+personaContentId+'"] summary':'[data-act="add"][data-k="'+personaContentKey+'"]');
    if(!visible)app.querySelector('#persona-content-status').textContent='Vínculos salvos. O cartão ficou fora deste recorte.';
  }catch(error){form.querySelector('.form-error').textContent=error.message}
}
function personaContentAction(action,data){
  if(action==='content-personas'){personaContentOpen(data.k,Number(data.j));return true}
  if(action==='persona-close'){personaContentClose();return true}
  if(action==='persona-show-all'){changeView({personaFilter:'all'},'[data-persona-filter]');return true}
  return false;
}
function personaContentBind(){
  app.addEventListener('change',event=>{
    const el=event.target;if(el.matches('[data-persona-filter]')){changeView({personaFilter:el.value},'[data-persona-filter]');return}
    const form=el.closest('#card-persona-form');if(!form||!['persona','common'].includes(el.name))return;
    if(el.name==='common'&&el.checked)form.querySelectorAll('[name="persona"]').forEach(input=>input.checked=false);
    form.elements.common.checked=!form.querySelector('[name="persona"]:checked');
  });
  app.addEventListener('submit',event=>{if(event.target.id==='card-persona-form'){event.preventDefault();personaContentSubmit(event.target)}});
  app.addEventListener('cancel',event=>{if(event.target.id==='card-persona-dialog'){event.preventDefault();personaContentClose()}},true);
}

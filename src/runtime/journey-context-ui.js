/* Journey context and the explicit pain → evidence → improvement path. */
let contextPending=false,contextSourceId='';
function contextPersona(){return (S.serviceElements?.persona||[]).find(record=>record.id===S.personaId)}
function contextPersonaName(){return contextPersona()?.title||(S.personaId?'Persona indisponível':'Sem Persona vinculada')}
function contextHeader(){
  const personas=S.serviceElements?.persona||[],selected=contextPersona();
  return '<div class="journey-context"><label>Persona da jornada<select data-context-persona aria-label="Persona da jornada" '+(!HOSTED?'disabled':'')+'><option value="" '+(!S.personaId?'selected':'')+'>Sem Persona vinculada</option>'+(!selected&&S.personaId?'<option value="'+esc(S.personaId)+'" selected disabled>Persona indisponível</option>':'')+personas.map(record=>'<option value="'+esc(record.id)+'" '+(record.id===S.personaId?'selected':'')+'>'+esc(record.title)+'</option>').join('')+'</select></label><p>'+(selected?esc(selected.description||'Experiência desta Persona'):S.personaId?'Selecione uma Persona disponível para registrar emoções.':'Opcional: escolha de quem é a experiência. Você pode criar uma Persona em + Adicionar cartão.')+'<small>Emoções: '+(S.personaId?esc(contextPersonaName()):'registros sem Persona vinculada')+'. O cartão de Persona marca sua presença em uma etapa; esta seleção define o contexto do mapa.</small></p><span id="context-status" role="status"></span></div>';
}
function contextDialogs(){return '<dialog class="growth-dialog pain-context-dialog" id="pain-context-dialog" aria-labelledby="pain-context-title"></dialog>'}
function contextPain(key){return (S.painContexts||[]).find(record=>record.id===key||record.localId===key)}
function contextPainReport(issue){
  const source=contextPain(growthIssueKey(issue));
  return source?.evidence?.length?'<ul>'+source.evidence.map(record=>'<li>'+esc(record.title)+(record.source?' · '+esc(record.source):'')+'</li>').join('')+'</ul>':'<small>Sem evidência vinculada a esta dor.</small>';
}
function contextStageChannels(index){
  const channels=Object.entries(S.c).flatMap(([key,notes])=>Number(key.split('|')[1])===index?notes.filter(note=>note.type==='channel').map(note=>pickerReference(note)?.title).filter(Boolean):[]);
  channels.push(...(S.c['ch|'+index]||[]).filter(note=>!pickerReferenceTypes.includes(note.type)).map(note=>note.t).filter(Boolean));
  return [...new Set(channels)];
}
function contextOpenPain(key,index=0){
  const source=contextPain(key);if(!source)return;
  contextSourceId=source.id;const dialog=app.querySelector('#pain-context-dialog'),research=source.kind==='research',canEdit=research||source.inJourney,evidence=S.serviceElements?.evidence||[],stage=S.steps[index]?.hostStageId||S.steps[0]?.hostStageId;
  const missing=source.evidenceIds.filter(id=>!evidence.some(record=>record.id===id));
  dialog.innerHTML='<form id="pain-context-form"><div class="panel-head"><h2 id="pain-context-title">Analisar dor</h2><button class="x" type="button" data-act="context-close" aria-label="Fechar análise da dor">×</button></div><p class="source-pain">'+esc(source.title)+'</p><p class="hint">'+(research?'Dor registrada na pesquisa. Ao planejar, ela será vinculada à etapa escolhida.':'Etapa: '+esc(source.stage||'Não informada'))+'</p>'+(research?'<label>Etapa para trabalhar esta dor<select name="stage" required>'+S.steps.map(step=>'<option value="'+esc(step.hostStageId)+'" '+(step.hostStageId===stage?'selected':'')+'>'+esc(step.n)+'</option>').join('')+'</select></label>':'')+'<fieldset class="pain-evidence" '+(!canEdit?'disabled':'')+'><legend>Evidências vinculadas à dor</legend>'+(evidence.length?evidence.map(record=>'<label><input type="checkbox" name="evidence" value="'+esc(record.id)+'" '+(source.evidenceIds.includes(record.id)?'checked':'')+'><span><b>'+esc(record.title)+'</b>'+(record.description?'<small>'+esc(record.description)+'</small>':'')+'</span></label>').join(''):'<p>Nenhuma evidência disponível. Registre as fontes na biblioteca do serviço para vinculá-las aqui.</p>')+'</fieldset>'+(missing.length?'<p class="hint">'+missing.length+' vínculo(s) com evidência indisponível. Eles serão removidos se você salvar esta seleção.</p>':'')+'<p class="hint">Vincular uma evidência registra a fonte; a confirmação da dor continua sendo uma decisão da equipe.</p>'+(!canEdit?'<p>Esta dor pertence a outra Jornada. Abra a Jornada de origem para alterar seus vínculos.</p>':'')+'<p class="form-error" role="alert"></p><footer><button class="tb" type="button" data-act="context-close">Cancelar</button><button class="tb" type="submit" value="save" '+(!canEdit?'disabled':'')+'>Salvar evidências</button><button class="tb p" type="submit" value="plan" '+(!canEdit||!S.steps.length?'disabled':'')+'>'+(research?'Usar nesta etapa e planejar':'Planejar melhoria')+'</button></footer></form>';
  const channels=contextStageChannels(source.inJourney?S.steps.findIndex(step=>step.hostStageId===source.stageId):index);
  if(channels.length){const paragraph=document.createElement('p');paragraph.className='hint';paragraph.textContent='Canais nesta etapa: '+channels.join(' · ');dialog.querySelector('.source-pain').after(paragraph)}
  dialog.showModal();dialog.querySelector('select,input,button').focus();
}
function contextClose(){app.querySelector('#pain-context-dialog')?.close();focusNew('[data-act="context-pain"]')}
function contextSubmit(form,planNext){
  if(contextPending||!form.reportValidity())return;
  contextPending=true;form.querySelectorAll('[type="submit"]').forEach(button=>button.disabled=true);
  const data=new FormData(form);window.parent.postMessage({boBlueprintHost:1,type:'pain-evidence',sourceId:contextSourceId,evidenceIds:data.getAll('evidence'),stageId:data.get('stage'),planNext},location.origin);
}
function contextResult(data){
  contextPending=false;
  if(!data.ok){const form=app.querySelector('#pain-context-form');if(form){form.querySelector('.form-error').textContent=data.error||'Não foi possível salvar.';form.querySelectorAll('[type="submit"]').forEach(button=>button.disabled=false)}const status=app.querySelector('#context-status');if(status)status.textContent=data.error||'Não foi possível salvar.';const select=app.querySelector('[data-context-persona]');if(select){select.disabled=false;select.value=S.personaId||''}return}
  S=data.state;H=S.history||H;V=viewState(S.view);last=JSON.stringify(S);growthLastPatch=growthPatchKey();growthEmotionDrafts.clear();emotionEdit=null;announceSave(true);rerender();
  if(data.planNext){const index=S.iss.findIndex(issue=>issue.hostEntityId===data.problemId);if(index>=0){pickerShowTool('im');growthOpenPlan(index)}}else focusNew('[data-context-persona]');
}
function contextAction(action,data,button){
  if(action==='context-pain'){const key=button?.closest('[data-cell]')?.dataset.cell,index=Number(key?.split('|')[1]||data.si||0);contextOpenPain(data.source,index);return true}
  if(action==='context-close'){contextClose();return true}
  return false;
}
function contextBind(){
  app.addEventListener('change',event=>{if(!event.target.matches('[data-context-persona]')||contextPending)return;contextPending=true;event.target.disabled=true;window.parent.postMessage({boBlueprintHost:1,type:'persona-select',personaId:event.target.value},location.origin)});
  app.addEventListener('submit',event=>{if(event.target.id==='pain-context-form'){event.preventDefault();contextSubmit(event.target,event.submitter?.value==='plan')}});
  app.addEventListener('cancel',event=>{if(event.target.id==='pain-context-dialog'){event.preventDefault();contextClose()}},true);
}

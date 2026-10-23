/* Saved configurations and an explicit presentation of the current visible rows. */
let viewsPending=false,viewsRenameId='',growthPresentationMode='executive';
function viewsDialogs(){return '<dialog class="growth-dialog saved-views-dialog" id="journey-views-dialog" aria-labelledby="journey-views-title"></dialog>'}
function viewsOpen(){
  const dialog=app.querySelector('#journey-views-dialog'),records=S.savedViews||[],renaming=records.find(record=>record.id===viewsRenameId);
  dialog.innerHTML='<div class="panel-head"><h2 id="journey-views-title">Visualizações salvas</h2><button class="x" data-act="views-close" aria-label="Fechar visualizações">×</button></div><p>Guarde faixas, ordem e Persona para retomar o mesmo recorte. Os cartões continuam no mapa original.</p>'+(!HOSTED?'<p>Abra a Jornada no projeto para salvar visualizações.</p>':'')+(renaming?'<form id="views-rename-form" data-id="'+esc(renaming.id)+'"><label>Novo nome<input name="name" required maxlength="80" value="'+esc(renaming.name)+'"></label><button class="tb" type="button" data-act="views-back">Cancelar renomeação</button><button class="tb p" type="submit">Renomear visualização</button></form>':'<form id="views-save-form"><label>Nome da visualização<input name="name" required maxlength="80" placeholder="Ex.: Revisão com a equipe" '+(!HOSTED?'disabled':'')+'></label><button class="tb p" type="submit" '+(!HOSTED?'disabled':'')+'>Salvar visualização atual</button></form><div class="saved-views-list">'+(records.length?records.map(record=>{
    const persona=(S.serviceElements?.persona||[]).find(value=>value.id===record.personaId),count=(record.view.rowOrder||[]).filter(id=>!record.view.hiddenRows.includes(id)).length;
    return '<section class="saved-view"><h3>'+esc(record.name)+'</h3><small>'+count+' faixas · '+esc(record.personaId?persona?.title||'Persona indisponível':'Sem Persona vinculada')+' · '+esc(personaFilterNames[record.view.personaFilter||'all'])+'</small><div class="saved-view-actions"><button class="tb p" data-act="views-apply" data-id="'+esc(record.id)+'" aria-label="Aplicar visualização '+esc(record.name)+'">Aplicar</button><button class="tb" data-act="views-update" data-id="'+esc(record.id)+'" aria-label="Atualizar visualização '+esc(record.name)+'" title="Substituir pela configuração atual">Atualizar</button><button class="tb" data-act="views-rename" data-id="'+esc(record.id)+'" aria-label="Renomear visualização '+esc(record.name)+'">Renomear</button><button class="tb" data-act="views-remove" data-id="'+esc(record.id)+'" aria-label="Excluir visualização '+esc(record.name)+'">Excluir</button></div></section>';
  }).join(''):'<p class="hint">Nenhuma visualização salva nesta Jornada.</p>')+'</div>')+'<p class="form-error" role="alert"></p><p class="hint">A Persona define as emoções; o filtro de cartões também é salvo. Contexto da etapa e dores da faixa nativa são comuns.</p><footer><button class="tb" data-act="views-close">Voltar ao mapa</button><button class="tb p" data-act="views-present">Apresentar visualização atual</button></footer>';
  if(!dialog.open)dialog.showModal();dialog.querySelector('input:not(:disabled),button')?.focus();
}
function viewsClose(){viewsRenameId='';app.querySelector('#journey-views-dialog')?.close();focusNew('[data-act="views-open"]')}
function viewsRequest(action,input={}){
  if(viewsPending||!HOSTED)return;viewsPending=true;
  const dialog=app.querySelector('#journey-views-dialog');dialog.querySelector('.form-error').textContent='';dialog.querySelectorAll('button').forEach(button=>button.disabled=true);
  const snapshot={...V,rowOrder:orderedRows().map(row=>row.id)};
  window.parent.postMessage({boBlueprintHost:1,type:'saved-view',action,input:{...input,...(['create','update'].includes(action)?{view:snapshot}:{})}},location.origin);
}
function viewsResult(data){
  viewsPending=false;
  if(!data.ok){const dialog=app.querySelector('#journey-views-dialog');if(dialog){dialog.querySelector('.form-error').textContent=data.error||'Não foi possível salvar.';dialog.querySelectorAll('button').forEach(button=>button.disabled=false)}return}
  S=data.state;H=S.history||H;V=viewState(S.view);last=JSON.stringify(S);growthLastPatch=growthPatchKey();growthEmotionDrafts.clear();emotionEdit=null;announceSave(true);viewsRenameId='';rerender();
  if(data.action==='apply')focusNew('[data-act="views-open"]');else viewsOpen();
}
function viewsAction(action,data){
  if(action==='views-open'){viewsRenameId='';viewsOpen();return true}
  if(action==='views-close'){viewsClose();return true}
  if(action==='views-back'){viewsRenameId='';viewsOpen();return true}
  if(action==='views-rename'){viewsRenameId=data.id;viewsOpen();return true}
  if(['views-apply','views-update','views-remove'].includes(action)){viewsRequest(action.slice(6),{id:data.id});return true}
  if(action==='views-present'){viewsClose();growthPresentationMode='view';growthShowPresentation();return true}
  return false;
}
function viewsBind(){
  app.addEventListener('submit',event=>{const form=event.target;if(!['views-save-form','views-rename-form'].includes(form.id))return;event.preventDefault();if(!form.reportValidity())return;viewsRequest(form.id==='views-save-form'?'create':'rename',{id:form.dataset.id,name:form.elements.name.value})});
  app.addEventListener('cancel',event=>{if(event.target.id==='journey-views-dialog'){event.preventDefault();viewsClose()}},true);
}
function viewsSummaryBody(){
  const rows=orderedRows().filter(row=>!V.hiddenRows.includes(row.id));
  let html='<article class="executive-report"><header><small>BLUE OCEAN · VISUALIZAÇÃO ATUAL</small><h1>'+esc(S.title||'Jornada')+'</h1><p>Persona: '+esc(contextPersonaName())+'</p><p>'+esc(rows.map(row=>row.n).join(' · '))+'</p><p>Cartões: '+esc(personaFilterNames[V.personaFilter||'all'])+'</p></header><p>Recorte das faixas visíveis. Contexto da etapa e dores nativas são comuns; emoções seguem a Persona selecionada.</p>';
  html+=structureReportOverview();
  html+=S.steps.map((step,index)=>'<section class="report-stage"><h2>'+(index+1)+'. '+esc(step.n)+'</h2>'+rows.map(row=>{
    const notes=contentReportNotes(S.c[row.id+'|'+index]||[],true)+structureReportContinuations(index,row.id,true);let content=notes;
    if(row.id==='sd')content='<p>'+esc(step.d||'Não informado')+'</p>'+notes;
    if(row.id==='em')content='<p>'+esc(growthEmotionKnown(step)?EM[step.e+2]+' · '+(step.emotionStatus==='validated'?'Validado pela equipe':'Hipótese'):'Não informada')+'</p>'+(step.emotionSource?'<p>Fonte: '+esc(step.emotionSource)+'</p>':'')+(step.note?'<p>'+esc(step.note)+'</p>':'')+notes;
    if(row.id==='im')content=S.iss.filter(issue=>issue.s===index).map(issue=>'<p><b>'+(issue.t==='d'?'Dor':'Ideia')+':</b> '+esc(issue.x)+'</p>'+contextPainReport(issue)).join('')+notes;
    return '<div class="report-row" data-report-row="'+esc(row.id)+'"><h3>'+esc(row.n)+'</h3>'+(content||'<p>Sem conteúdo registrado.</p>')+'</div>';
  }).join('')+'</section>').join('');
  return html+'</article>';
}

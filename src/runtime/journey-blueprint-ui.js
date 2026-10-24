/* Connected Blueprint: canonical activity summaries and typed document connections. */
let blueprintSelected='',blueprintEditing='',blueprintGeometryWidths=[],blueprintObserved=null;
const blueprintConnectionNames=window.BlueOceanJourneyContent.MATRIX_CONNECTION_TYPES;
const blueprintCategoryNames={activity:'Atividade', 'support-process':'Processo de suporte',resource:'Recurso'};
function blueprintNotes(){return Object.entries(S.c).flatMap(([key,notes])=>S.steps[Number(key.split('|')[1])]?notes.map(note=>({key,note})):[])}
function blueprintNote(id){return blueprintNotes().find(value=>value.note.i===id)}
function blueprintCaption(entry){const [row,index]=entry.key.split('|');return (entry.note.t||(pickerReferenceTypes.includes(entry.note.type)?pickerReference(entry.note)?.title:'')||contentTypes[entry.note.type||'card']?.[1]||'Cartão')+' · '+(rowDefs().find(value=>value.id===row)?.n||row)+' · '+S.steps[index].n}
function blueprintActivity(note,row){return window.BlueOceanJourneyContent.normalizeMatrixActivity(note.activity||{category:row==='sy'?'resource':'activity'})}
function blueprintResourceName(ref){return (S.operationalResources||[]).find(value=>value.ref===ref)?.title||'Recurso indisponível'}
function blueprintBadges(note,row,report=false){
 if(!['ac','fl','bk','sy'].includes(row)&&!note.activity)return '';
 const activity=blueprintActivity(note,row),role=row==='fl'?'Frontstage':row==='bk'?'Backstage':row==='sy'?blueprintCategoryNames[activity.category]:'';
 return '<div class="blueprint-card-meta">'+(V.perspective==='blueprint'&&role&&row==='sy'?'<span class="blueprint-role" data-role="'+row+'">'+role+'</span>':'')+
 (activity.owner?'<span>Responsável: '+esc(activity.owner)+'</span>':'')+(activity.team?'<span>Equipe: '+esc(activity.team)+'</span>':'')+
 (report&&activity.rule?'<small>Regra: '+esc(activity.rule)+'</small>':'')+(report&&activity.durationMinutes!==null?'<small>Execução: '+activity.durationMinutes+' min</small>':'')+(report&&activity.targetMinutes!==null?'<small>Prazo: '+activity.targetMinutes+' min</small>':'')+
 (activity.resourceRefs.length||activity.resourceNotes?'<small>Recursos: '+esc([...activity.resourceRefs.map(blueprintResourceName),activity.resourceNotes].filter(Boolean).join(' · '))+'</small>':'')+'</div>';
}
function blueprintDialogs(){return '<dialog class="growth-dialog blueprint-dialog" id="blueprint-activity-dialog" aria-labelledby="blueprint-activity-title"></dialog><dialog class="growth-dialog blueprint-dialog" id="blueprint-links-dialog" aria-labelledby="blueprint-links-title"></dialog>'}
function blueprintActivityOpen(key,index){
 const note=S.c[key]?.[index];if(!note)return;blueprintEditing=note.i;
 const row=key.split('|')[0],activity=blueprintActivity(note,row),dialog=app.querySelector('#blueprint-activity-dialog');
 const resources=S.operationalResources||[],refs=[...new Set([...resources.map(value=>value.ref),...activity.resourceRefs])];
 dialog.innerHTML='<form id="blueprint-activity-form"><div class="panel-head"><h2 id="blueprint-activity-title">Detalhes da atividade</h2><button type="button" class="x" data-act="bp-close-activity" aria-label="Fechar detalhes da atividade">×</button></div><p class="row-method">'+esc(row==='fl'?'Frontstage · percebido pelo cliente':row==='bk'?'Backstage · fora da percepção do cliente':rowDefs().find(value=>value.id===row)?.n||'Atividade')+'</p>'+
 '<label>Nome da atividade<input name="title" required maxlength="1000" value="'+esc(note.t)+'"></label><div class="form-grid"><label>Responsável<input name="owner" maxlength="160" value="'+esc(activity.owner)+'" placeholder="Pessoa ou papel responsável"></label><label>Equipe<input name="team" maxlength="160" value="'+esc(activity.team)+'" placeholder="Equipe que executa"></label></div>'+
 '<label>Natureza do cartão<select name="category" aria-label="Natureza do cartão">'+Object.entries(blueprintCategoryNames).map(([id,name])=>'<option value="'+id+'" '+(activity.category===id?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+
 (['fl','bk','sy'].includes(row)?'<label>Faixa da atividade<select name="row" aria-label="Faixa da atividade">'+rowDefs().filter(value=>['fl','bk','sy'].includes(value.id)).map(value=>'<option value="'+value.id+'" '+(value.id===row?'selected':'')+'>'+esc(value.n)+'</option>').join('')+'</select></label>':'<input type="hidden" name="row" value="'+esc(row)+'">')+
 '<p class="hint">Ações de execução, inclusive automatizadas, pertencem à Linha de frente ou aos Bastidores. Apoio reúne recursos e processos que viabilizam a entrega. Reclassificar preserva o histórico e os registros de origem.</p>'+
 '<fieldset class="blueprint-resources"><legend>Recursos vinculados do serviço</legend>'+(refs.length?refs.map(ref=>'<label><input type="checkbox" name="resourceRefs" value="'+esc(ref)+'" '+(activity.resourceRefs.includes(ref)?'checked':'')+'>'+esc(blueprintResourceName(ref))+'</label>').join(''):'<p class="hint">Nenhum sistema ou recurso cadastrado no serviço.</p>')+'</fieldset>'+
 '<label>Outros recursos e ferramentas<input name="resourceNotes" maxlength="400" value="'+esc(activity.resourceNotes)+'" placeholder="Descrição opcional; não cria um registro no serviço"></label><label>Regra ou condição<textarea name="rule" maxlength="1000">'+esc(activity.rule)+'</textarea></label><div class="form-grid"><label>Execução (min)<input type="number" name="durationMinutes" min="0" max="525600" step="any" value="'+(activity.durationMinutes??'')+'"></label><label>Prazo combinado (min)<input type="number" name="targetMinutes" min="0" max="525600" step="any" value="'+(activity.targetMinutes??'')+'"></label></div><p class="form-error" role="alert"></p><footer><button type="button" class="tb" data-act="bp-close-activity">Cancelar</button><button type="submit" class="tb p">Salvar atividade</button></footer></form>';
 dialog.showModal();dialog.querySelector('[name=title]').focus();
}
function blueprintActivitySubmit(form){
 if(!form.reportValidity())return;const entry=blueprintNote(blueprintEditing);if(!entry)return;
 try{
 const data=new FormData(form),activity=window.BlueOceanJourneyContent.normalizeMatrixActivity({...Object.fromEntries(data),resourceRefs:data.getAll('resourceRefs')});
 const row=String(data.get('row'));
 if(row==='sy'&&activity.category==='activity')throw Error('Para uma atividade de execução, escolha Linha de frente ou Bastidores. Em Sistemas e apoio, use Recurso ou Processo de suporte.');
 if(['fl','bk'].includes(row)&&activity.category!=='activity')throw Error('Coloque recursos e processos de suporte na faixa Sistemas e apoio.');
 const note={...entry.note,t:String(data.get('title')).trim(),activity,reclassifyActivity:row!==entry.key.split('|')[0]||activity.category!==blueprintActivity(entry.note,entry.key.split('|')[0]).category},index=S.c[entry.key].findIndex(value=>value.i===note.i),next={...S.c,[entry.key]:S.c[entry.key].filter(value=>value.i!==note.i)},target=row+'|'+entry.key.split('|')[1];
 if(target===entry.key){next[entry.key]=[...S.c[entry.key]];next[entry.key][index]=note}else next[target]=[...(next[target]||[]),note];
 window.BlueOceanJourneyContent.validateMatrixDocument({c:next,links:S.links});
 S.c=next;save();dialogCloseBlueprint('blueprint-activity-dialog');rerender();focusNew('[data-nid="'+CSS.escape(note.i)+'"]');
 }catch(error){form.querySelector('.form-error').textContent=error.message}
}
function blueprintConnectionBar(){return '<section class="blueprint-connections" aria-label="Conexões do mapa"><button class="tb" data-act="bp-links">Conexões <span data-blueprint-link-count>'+((S.links||[]).length)+'</span></button><label>Exibir conexões<select aria-label="Exibir conexões" data-blueprint-connection-mode>'+[['selected','Da atividade selecionada'],['all','Todas'],['off','Ocultar']].map(([id,name])=>'<option value="'+id+'" '+((V.connectionMode||'selected')===id?'selected':'')+'>'+name+'</option>').join('')+'</select></label><span class="blueprint-connection-status" role="status">'+(V.connectionMode==='all'?'Todas as conexões com cartões visíveis.':V.connectionMode==='off'?'Conexões ocultas; os vínculos permanecem salvos.':blueprintSelected?'Conexões da atividade selecionada.':'Selecione um cartão para acompanhar suas conexões.')+'</span><span class="blueprint-legend">Frontstage · percebido pelo cliente <span>Backstage · operação interna</span></span></section>'}
function blueprintLinksOpen(id='',source=''){
 const dialog=app.querySelector('#blueprint-links-dialog'),notes=blueprintNotes(),link=(S.links||[]).find(value=>value.id===id),first=source||link?.a||notes[0]?.note.i||'';
 const options=selected=>notes.map(entry=>'<option value="'+esc(entry.note.i)+'" '+(entry.note.i===selected?'selected':'')+'>'+esc(blueprintCaption(entry))+'</option>').join('');
 const type=link?.type||'sequence',from=blueprintNote(first),to=blueprintNote(link?.b),handoff=link?.handoff||{};
 dialog.innerHTML='<div class="panel-head"><h2 id="blueprint-links-title">Conexões do Blueprint</h2><button class="x" data-act="bp-close-links" aria-label="Fechar conexões">×</button></div><p class="hint">Sequência: A acontece antes de B. Dependência: B precisa de A. Uso: A utiliza o recurso B. Passagem: trabalho transferido entre equipes diferentes.</p><form id="blueprint-link-form" data-id="'+esc(link?.id||'')+'"><label>Origem<select name="a" aria-label="Origem" required>'+options(first)+'</select></label><label>Destino<select name="b" aria-label="Destino" required><option value="">Escolha um destino</option>'+options(link?.b||'')+'</select></label><label>Relação<select name="type" aria-label="Relação">'+Object.entries(blueprintConnectionNames).map(([value,label])=>'<option value="'+value+'" '+(type===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Descrição da conexão<input name="label" maxlength="160" value="'+esc(link?.label||'')+'"></label><fieldset data-blueprint-handoff><legend>Passagem entre equipes</legend><label>Equipe de origem<input name="fromTeam" maxlength="160" value="'+esc(handoff.fromTeam||from?.note.activity?.team||from?.note.activity?.owner||'')+'"></label><label>Equipe de destino<input name="toTeam" maxlength="160" value="'+esc(handoff.toTeam||to?.note.activity?.team||to?.note.activity?.owner||'')+'"></label><label>O que será transferido<input name="deliverable" maxlength="400" value="'+esc(handoff.deliverable||'')+'"></label><label>Prazo da transferência (min)<input name="deadlineMinutes" type="number" min="0" max="525600" step="any" value="'+(handoff.deadlineMinutes??'')+'"></label><label>Condição de aceite<textarea name="acceptance" maxlength="1000">'+esc(handoff.acceptance||'')+'</textarea></label></fieldset><p class="form-error" role="alert"></p><footer><button type="button" class="tb" data-act="bp-close-links">Cancelar</button><button class="tb p" type="submit" '+(notes.length<2?'disabled':'')+'>'+(link?'Salvar conexão':'Criar conexão')+'</button></footer></form><section class="blueprint-link-list" aria-label="Conexões existentes">'+(S.links?.length?S.links.map((value,index)=>'<article><b>'+esc(blueprintConnectionNames[value.type]||'Sequência')+'</b><p>'+esc(blueprintNote(value.a)?blueprintCaption(blueprintNote(value.a)):'Origem indisponível')+' → '+esc(blueprintNote(value.b)?blueprintCaption(blueprintNote(value.b)):'Destino indisponível')+'</p>'+(value.handoff?'<small>'+esc(value.handoff.fromTeam)+' → '+esc(value.handoff.toTeam)+' · '+esc(value.handoff.deliverable)+(value.handoff.deadlineMinutes!==null?' · '+value.handoff.deadlineMinutes+' min':'')+'</small>':'')+'<button class="tb" data-act="bp-edit-link" data-n="'+index+'">Editar conexão '+(index+1)+'</button><button class="tb" data-act="bp-remove-link" data-n="'+index+'">Excluir conexão '+(index+1)+'</button></article>').join(''):'<p>Nenhuma conexão registrada.</p>')+'</section>';
 dialog.showModal();blueprintLinkFields(dialog.querySelector('form'));dialog.querySelector('[name=a]')?.focus();
}
function blueprintLinkFields(form){const field=form.querySelector('[data-blueprint-handoff]'),handoff=form.elements.type.value==='handoff';field.hidden=!handoff;field.disabled=!handoff;for(const name of ['fromTeam','toTeam','deliverable'])form.elements[name].required=handoff}
function blueprintLinkSubmit(form){
 if(!form.reportValidity())return;const data=new FormData(form);
 try{const link=window.BlueOceanJourneyContent.normalizeMatrixConnection({...Object.fromEntries(data),id:form.dataset.id||uid(),handoff:Object.fromEntries(data)}),links=[...(S.links||[])],index=links.findIndex(value=>value.id===link.id);
 if(index>=0)links[index]={...links[index],...link};else links.push(link);
 window.BlueOceanJourneyContent.validateMatrixConnections(S.c,links);S.links=links;blueprintSelected=link.a;save();dialogCloseBlueprint('blueprint-links-dialog');rerender();focusNew('[data-act="bp-links"]');
 }catch(error){form.querySelector('.form-error').textContent=error.message}
}
function dialogCloseBlueprint(id){app.querySelector('#'+id)?.close();focusNew('[data-act="bp-links"]')}
function blueprintAction(action,data){
 if(action==='bp-native-activity'){const note=S.c[data.k]?.[Number(data.j)];if(note&&HOSTED)window.parent.postMessage({boBlueprintHost:1,type:'activity-details',itemId:note.hostItemId||note.i},location.origin);return true}
 if(action==='content-operational'&&data.k?.startsWith('ev|')&&HOSTED){const note=S.c[data.k]?.[Number(data.j)];if(note)window.parent.postMessage({boBlueprintHost:1,type:'activity-details',itemId:note.hostItemId||note.i},location.origin);return true}
 if(action==='content-operational'){blueprintActivityOpen(data.k,Number(data.j));return true}
 if(action==='bp-links'){blueprintLinksOpen();return true}
 if(action==='bp-connect'){blueprintLinksOpen('',data.nid);return true}
 if(action==='bp-close-activity'||action==='bp-close-links'){dialogCloseBlueprint(action==='bp-close-links'?'blueprint-links-dialog':'blueprint-activity-dialog');return true}
 if(action==='bp-edit-link'||action==='ul'){const link=S.links[Number(data.n)];if(link)blueprintLinksOpen(link.id);return true}
 if(action==='bp-remove-link'){S.links.splice(Number(data.n),1);save();rerender();blueprintLinksOpen();return true}
 if(action==='pk'){if(!pick)pick=data.nid;else if(pick===data.nid)pick=null;else{const from=pick;pick=null;blueprintLinksOpen('',from);app.querySelector('#blueprint-link-form [name=b]').value=data.nid;return true}drawLinks();return true}
 if(action==='bp-distribute'){V.stageWidths=[];saveView();rerender();return true}
 return false;
}
function blueprintVisibleLinks(){const mode=V.connectionMode||'selected';if(mode==='off')return [];return (S.links||[]).map((link,index)=>({link,index})).filter(({link})=>mode==='all'||link.a===blueprintSelected||link.b===blueprintSelected)}
function blueprintGeometry(){return window.BlueOceanJourneyContent.matrixStageGeometry(blueprintGeometryWidths.length===S.steps.length?blueprintGeometryWidths:S.steps.map((_,i)=>stageWidth(i)))}
const blueprintResizeObserver=new ResizeObserver(()=>requestAnimationFrame(drawLinks));
function blueprintSyncGeometry(){
 const matrix=app.querySelector('.matrix');if(!matrix)return;
 if(blueprintObserved!==matrix){blueprintResizeObserver.disconnect();blueprintResizeObserver.observe(matrix);blueprintObserved=matrix}
 const zoom=(V.zoom||100)/100,widths=[...matrix.querySelectorAll('[data-row=st]>.sh')].map(el=>el.getBoundingClientRect().width/zoom);
 const changed=widths.length!==blueprintGeometryWidths.length||widths.some((value,i)=>Math.abs(value-blueprintGeometryWidths[i])>.05);blueprintGeometryWidths=widths;
 matrix.querySelectorAll('[data-stage-resize]').forEach((el,i)=>el.setAttribute('aria-valuenow',Math.round(widths[i])));
 const cells=matrix.querySelector('.emotion-cells');if(cells)cells.style.gridTemplateColumns=widths.map(width=>width+'px').join(' ');
 const curve=matrix.querySelector('#curve');if(changed&&curve)curve.innerHTML=growthCurve();
}
function blueprintReport(filtered=false){
 const notes=blueprintNotes().filter(entry=>!filtered||!V.hiddenRows.includes(entry.key.split('|')[0])&&cardToolsMatches(entry.note)),byId=new Map(notes.map(entry=>[entry.note.i,entry]));
 const links=(S.links||[]).filter(link=>byId.has(link.a)&&byId.has(link.b));
 return '<section class="report-connections"><h2>Conexões do serviço</h2>'+(links.map(link=>'<p><b>'+esc(blueprintConnectionNames[link.type]||'Sequência')+':</b> '+esc(blueprintCaption(byId.get(link.a)))+' → '+esc(blueprintCaption(byId.get(link.b)))+(link.label?' · '+esc(link.label):'')+(link.handoff?' · '+esc(link.handoff.fromTeam)+' → '+esc(link.handoff.toTeam)+' · '+esc(link.handoff.deliverable)+(link.handoff.deadlineMinutes!==null?' · Prazo: '+link.handoff.deadlineMinutes+' min':'')+(link.handoff.acceptance?' · Aceite: '+esc(link.handoff.acceptance):''):'')+'</p>').join('')||'<p>Nenhuma conexão neste recorte.</p>')+'</section>';
}
function blueprintBind(){
 app.addEventListener('focusin',event=>{const block=event.target.closest?.('.content-block');if(block&&blueprintSelected!==block.dataset.nid){blueprintSelected=block.dataset.nid;const status=app.querySelector('.blueprint-connection-status');if(status&&(V.connectionMode||'selected')==='selected')status.textContent='Conexões de “'+(blueprintNote(blueprintSelected)?.note.t||'cartão selecionado')+'”.';drawLinks()}});
 app.addEventListener('click',event=>{const block=event.target.closest?.('.content-block');if(block){blueprintSelected=block.dataset.nid;drawLinks()}});
 app.addEventListener('change',event=>{
  if(event.target.matches('[data-blueprint-connection-mode]'))changeView({connectionMode:event.target.value},'[data-blueprint-connection-mode]');
  if(event.target.form?.id==='blueprint-link-form'){
   if(event.target.name==='type')blueprintLinkFields(event.target.form);
   if(['a','b'].includes(event.target.name)){const form=event.target.form,which=event.target.name==='a'?'fromTeam':'toTeam',note=blueprintNote(event.target.value)?.note;form.elements[which].value=note?.activity?.team||note?.activity?.owner||''}
  }
 });
 app.addEventListener('submit',event=>{if(event.target.id==='blueprint-activity-form'){event.preventDefault();blueprintActivitySubmit(event.target)}if(event.target.id==='blueprint-link-form'){event.preventDefault();blueprintLinkSubmit(event.target)}});
 app.addEventListener('cancel',event=>{if(['blueprint-activity-dialog','blueprint-links-dialog'].includes(event.target.id)){event.preventDefault();dialogCloseBlueprint(event.target.id)}},true);
}

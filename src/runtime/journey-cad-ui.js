/* Operational canvas is a projection of the shared Journey document, never a second store. */
const cadModel=window.BlueOceanBlueprintCanvas;
const cadState={scene:'',selected:'',creating:null,link:null,drafts:new Map(),camera:null,layout:null,pending:'',error:'',library:false,inspector:false,detail:'auto',drag:null,ignoreClick:false,quick:null,choosing:null,menu:null,connectFrom:'',connectType:'sequence',pointer:null,query:'',libraryHidden:false,libraryKind:'',pendingDocument:null,canvasPerspective:'',libraryFilter:'all',activeCell:null,sidebarTab:'components',libraryCompact:false,groupOpen:{},favorites:[],resize:null,resizePreview:null,emotionDrag:null,selectedRow:'',laneResize:null,lanePreviewHeights:null,cardResize:null,cardResizePreview:null,laneDragId:'',confirmation:null};
try{const p=JSON.parse(localStorage.getItem('bo-cad-library-prefs-v2')||'{}');cadState.libraryCompact=!!p.compact;cadState.favorites=Array.isArray(p.favorites)?p.favorites.filter(k=>k in cadModel.CANVAS_COMPONENTS):[];cadState.groupOpen=p.groups||{};cadState.sidebarTab=p.sidebarTab==='lanes'?'lanes':'components'}catch{}
function cadSaveLibraryPreferences(){try{localStorage.setItem('bo-cad-library-prefs-v2',JSON.stringify({compact:cadState.libraryCompact,favorites:cadState.favorites,groups:cadState.groupOpen,sidebarTab:cadState.sidebarTab}))}catch{}}
function cadStageWidths(){return cadState.resizePreview||V.stageWidths||[]}
function cadRowHeights(){return cadState.lanePreviewHeights||V.rowHeights||{}}
function cadChangeRowHeight(id,height){
 if(cadLocked()||!rowDefs().some(row=>row.id===id))return;
 V.rowHeights={...V.rowHeights};
 if(height===null)delete V.rowHeights[id];
 else V.rowHeights[id]=Math.max(90,Math.min(540,Math.round(Number(height)||90)));
 cadState.lanePreviewHeights=null;saveView();rerender();
}
function cadLaneInspector(){
 const row=rowDefs().find(value=>value.id===cadState.selectedRow);if(!row)return '';
 const defined=V.rowHeights?.[row.id],auto=defined===undefined;
 const count=S.steps.reduce((sum,_,index)=>sum+(S.c[row.id+'|'+index]||[]).length,0);
 return '<section class="cad-lane-inspector"><div class="cad-inspector-kicker">FAIXA DO MAPA</div><h2>'+esc(row.n)+'</h2><p>'+esc(row.h||'Organize as informações desta faixa no serviço.')+'</p><p class="cad-lane-count">'+count+' elemento(s) · '+(auto?'Altura automática':'Altura mínima: '+defined+' px')+'</p><div class="cad-lane-height-controls"><h3>Altura da faixa</h3><p>A faixa cresce automaticamente conforme os cartões.</p><label>Altura mínima (px)<input type="number" min="90" max="540" step="10" data-cad-height value="'+(defined??Math.round(cadState.layout?.rows.find(x=>x.id===row.id)?.height||90))+'" '+(cadLocked()?'disabled':'')+'></label>'+cadButton('cad-lane-height-apply','Aplicar altura','data-id="'+esc(row.id)+'" '+(cadLocked()?'disabled':''))+cadButton('cad-lane-auto','Ajustar ao conteúdo','data-id="'+esc(row.id)+'" '+(cadLocked()?'disabled':''))+'</div><h3>Organização</h3>'+cadButton('cad-lane-advanced','Nome, cor e outras opções','data-id="'+esc(row.id)+'" '+(cadLocked()?'disabled':''))+cadButton('cad-lane-toggle',V.hiddenRows.includes(row.id)?'Mostrar faixa':'Ocultar faixa','data-id="'+esc(row.id)+'" '+(cadLocked()?'disabled':''))+'</section>';
}
function cadStageResizeTo(index,width){if(cadLocked()||!S.steps[index])return;V.stageWidths=[...cadStageWidths()];V.stageWidths[index]=cadModel.canvasStageWidth(width);cadState.resizePreview=null;V.fitToScreen=false;saveView();rerender()}
function cadRecordedEmotion(s){return s.emotionRecorded===true||s.emotionRecorded===undefined&&(Number(s.e)!==0||!!s.note?.trim())}
function cadEditEmotion(index,point={}){if(cadLocked()||!S.steps[index])return;const s=S.steps[index];cadState.creating=null;cadState.selected='';cadState.choosing=null;cadState.menu=null;cadState.inspector=false;cadState.quick={kind:'emotion',mode:'emotion',stageKey:cadStageKey(s),row:'em',emotionScore:cadModel.canvasEmotionScore(s),emotionNote:s.note||'',emotionUnknown:!cadRecordedEmotion(s),...cadQuickPosition(point)};cadState.activeCell={row:'em',index};cadReveal('em');rerender();cadFocusQuick()}

const cadColors={sd:'#64748b',ev:'#64748b',ch:'#0284c7',ac:'#2563eb',th:'#7c3aed',em:'#d97706',im:'#e11d48',fl:'#0f766e',bk:'#b45309',sy:'#7c3aed'};
const cadLinkColors={sequence:'#2563eb',dependency:'#b45309',uses:'#7c3aed',handoff:'#0f766e'};
function cadEnabled(){return !!V&&V.blueprintRenderer!=='matrix'}
function cadMobile(){return matchMedia('(max-width:760px)').matches}
function cadRows(){return orderedRows().filter(row=>!V.hiddenRows.includes(row.id)).map(row=>({...row,n:row.id==='ch'?'Canais':row.n}))}
function cadCellNotes(row,index){
 const notes=(S.c[row+'|'+index]||[]).map(note=>({...note})),step=S.steps[index];if(!step)return notes;
 const summary=(id,title,label)=>notes.push({i:'@'+id+':'+index,t:title,type:'text',virtualLabel:label});
 if(row==='sd'&&step.d?.trim())summary('context',step.d,'Contexto da etapa');
 if(row==='em'){const marker=notes.find(note=>note.canvas?.kind==='emotion');if(marker)marker.t=(growthEmotionKnown(step)?EM[step.e+2]:'Emoção não registrada')+(step.note?' · '+step.note:'');else if(growthEmotionKnown(step))summary('emotion',EM[step.e+2]+(step.note?' · '+step.note:''),'Emoção');}
 if(row==='im')S.iss.filter(issue=>issue.s===index&&issue.x.trim()&&!Object.values(S.c).flat().some(note=>note.referenceId===issue.hostEntityId)).forEach((issue,i)=>summary('issue'+i,issue.x,issue.t==='d'?'Dor · editar na matriz':'Ideia · editar na matriz'));
 return notes;
}
function cadProjection(includeDraft=true){
  if(cadState.pendingDocument)return structuredClone(cadState.pendingDocument);
  const doc={...S,c:{...S.c}};
  for(const row of cadRows())S.steps.forEach((_,index)=>{doc.c[row.id+'|'+index]=cadCellNotes(row.id,index)});
  if(includeDraft&&cadState.creating&&cadState.quick){
    const draft=cadState.creating,index=S.steps.findIndex(step=>cadStageKey(step)===draft.stageKey);
    if(index>=0)(doc.c[draft.row+'|'+index]||=[]).push({i:'@draft',t:draft.title||'Novo cartão…',type:'card',canvas:{kind:draft.kind},draft:true});
  }
  if(includeDraft&&cadState.cardResizePreview){
    const preview=cadState.cardResizePreview;
    for(const [key,notes] of Object.entries(doc.c)){
      if(!notes.some(note=>note.i===preview.id))continue;
      doc.c[key]=notes.map(note=>note.i===preview.id?{...note,canvas:{...note.canvas,width:preview.width,height:preview.height}}:note);
      break;
    }
  }
  return doc;
}
function cadTitle(note){return note.t||pickerReference(note)?.title||pickerReference(note)?.name||contentTypes[note.type]?.[1]||'Componente'}
function cadButton(action,label,attrs=''){return '<button type="button" data-act="'+action+'" '+attrs+'>'+label+'</button>'}
function cadLocked(){return !!S.readOnly||!!cadState.pending}
function cadStageKey(step){return step.hostStageId||step.hostLocalId}
function cadStageOptions(index){return S.steps.map((step,i)=>'<option value="'+esc(cadStageKey(step))+'" '+(i===index?'selected':'')+'>'+esc(step.n)+'</option>').join('')}
function cadCatalog(kind){if(kind==='metric')return S.availableMetrics||[];if(kind==='system'||kind==='resource')return (S.operationalResources||[]).filter(item=>item.kind===kind);return S.serviceElements?.[kind]||[]}
function cadOptions(items,value,empty='Nenhum'){return '<option value="">'+empty+'</option>'+items.map(item=>'<option value="'+esc(item.id)+'" '+(item.id===value?'selected':'')+'>'+esc(item.title||item.name||item.id)+'</option>').join('')}
function cadFormData(form){const data=new FormData(form);return {...Object.fromEntries(data),resourceRefs:data.getAll('resourceRefs')}}
function cadCurrentDraft(){if(cadState.creating)return cadState.creating;if(cadState.link)return cadState.link;return cadState.drafts.get(cadState.selected)}
function cadField(name,label,value='',type='text',extra=''){return '<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value??'')+'" '+extra+'></label>'}
function cadInspector(){
 if(cadState.selectedRow)return cadLaneInspector();
 const entry=blueprintNote(cadState.selected),isNew=!!cadState.creating;
 if(cadState.link)return cadLinkForm();
 if(!isNew&&!entry)return '<div class="cad-empty"><span aria-hidden="true">⬡</span><h2>Inspecione seu serviço</h2><p>Selecione um componente ou uma conexão para editar o combinado da operação.</p>'+cadButton('cad-library','+ Adicionar componente',cadLocked()?'disabled':'')+'</div>';
 // A selected card may survive a host update even when its transient editing draft
 // was cleared. Reconstruct the draft from the canonical record before rendering.
 const draft=cadCurrentDraft()||(entry?cadDraftFor(entry):null);
 if(!draft)return '<div class="cad-empty" role="status"><h2>Selecione um componente</h2><p>O cartão não está disponível para edição.</p></div>';
 const row=entry?.key.split('|')[0]||draft.row,kind=draft.kind,component=cadModel.CANVAS_COMPONENTS[kind];
 if(!component)return '<div class="cad-empty" role="status"><h2>Componente indisponível</h2><p>Selecione outro cartão ou atualize o mapa.</p></div>';
 /* Preserve native metadata for legacy cards while exposing generic properties. */
 const allowed=component.rows.includes('*')?rowDefs().map(value=>value.id):component.rows.includes(row)?component.rows:[...component.rows,row];
 const legacyPlacement=!cadModel.canvasAcceptsNewRow(kind,row);
 const resourceRefs=[...new Set([...(S.operationalResources||[]).map(item=>item.ref),...(draft.resourceRefs||[])])];
 return '<form id="cad-component-form"><h2>'+(isNew?'Adicionar '+component.title:'Propriedades')+'</h2><p class="cad-kind">'+component.title+'</p>'+(legacyPlacement?'<p class="cad-placement-warning" role="status">Cartão legado: essa faixa não corresponde ao tipo do componente. Os dados foram preservados.</p>':'')+'<section class="cad-inspector-group"><h3>Conteúdo</h3>'+cadField('title','Nome do componente',draft.title,'text','required maxlength="240"')+
 '<label>Descrição<textarea name="description" maxlength="1000">'+esc(draft.description||'')+'</textarea></label></section>'+
 (kind==='artifact'?'<fieldset class="cad-evidence-fields"><legend>Evidência física ou digital</legend><label>Apresentação<select name="evidenceType">'+[['physical','Evidência física'],['image','Imagem'],['document','Documento'],['link','Link']].map(([id,label])=>'<option value="'+id+'" '+((draft.evidenceType||'physical')===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+cadField('imageUrl','Endereço HTTPS da imagem',draft.imageUrl||entry?.note.url||'','url','maxlength="2000" placeholder="https://..."')+(cadModel.canvasSafeUrl(draft.imageUrl)?'<figure class="cad-evidence-preview"><img src="'+esc(cadModel.canvasSafeUrl(draft.imageUrl))+'" alt="Prévia da evidência" loading="lazy"><figcaption>Prévia da imagem vinculada</figcaption></figure>':'')+cadField('linkUrl','Link para abrir documento ou evidência',draft.linkUrl||'','url','maxlength="2000" placeholder="https://..."')+'<p class="cad-field-hint">Use links públicos HTTPS. Não envie URLs de arquivos privados.</p></fieldset>':kind==='channel'?cadField('linkUrl','Link do canal (opcional)',draft.linkUrl||'','url','maxlength="2000" placeholder="https://..."'):'')+
 '<details class="cad-inspector-advanced" open><summary>Aparência do cartão</summary><div class="cad-inspector-group"><label class="cad-icon-field">Ícone do cartão<select name="iconKey">'+Object.entries(cadModel.CANVAS_COMPONENTS).map(([id,item])=>'<option value="'+id+'" '+((draft.iconKey||kind)===id?'selected':'')+'>'+esc(item.title)+'</option>').join('')+'</select></label>'+
 '<label class="cad-tone-field">Cor de destaque<select name="tone">'+[['default','Padrão'],['blue','Azul'],['teal','Turquesa'],['amber','Âmbar'],['violet','Violeta'],['neutral','Neutro']].map(([id,label])=>'<option value="'+id+'" '+((draft.tone||'default')===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
 '</div></details><section class="cad-inspector-group"><h3>Localização no serviço</h3><label>Etapa<select name="stageKey" required>'+cadStageOptions(S.steps.findIndex(step=>cadStageKey(step)===draft.stageKey))+'</select></label><label>Faixa<select name="row">'+allowed.map(id=>'<option value="'+id+'" '+(id===draft.row?'selected':'')+'>'+esc(rowDefs().find(item=>item.id===id)?.n||id)+'</option>').join('')+'</select></label>'+
 '</section><section class="cad-inspector-group"><h3>Vínculos e operação</h3>'+ 
 (isNew&&['system','resource','metric','channel','persona','need','pain','opportunity'].includes(kind)?'<label>Usar registro do serviço<select name="referenceId">'+cadOptions(cadCatalog(kind),draft.referenceId,'Criar novo registro')+'</select></label><p>Ao reutilizar, o nome e os dados do registro existente são mantidos.</p>':'')+
 '<div class="cad-field-grid">'+cadField('owner','Responsável',draft.owner,'text','maxlength="160"')+cadField('team','Equipe',draft.team,'text','maxlength="160"')+'</div><label>Canal<select name="channelId">'+cadOptions(cadCatalog('channel'),draft.channelId)+'</select></label><div class="cad-field-grid">'+[['durationMinutes','Execução (min)'],['waitMinutes','Espera (min)'],['targetMinutes','Prazo (min)']].map(([name,label])=>cadField(name,label,draft[name],'number','min="0" max="525600" step="any"')).join('')+'</div><fieldset><legend>Recursos vinculados</legend>'+(resourceRefs.length?resourceRefs.map(ref=>'<label class="cad-check"><input type="checkbox" name="resourceRefs" value="'+esc(ref)+'" '+(draft.resourceRefs?.includes(ref)?'checked':'')+'>'+esc(blueprintResourceName(ref))+'</label>').join(''):'<p>Cadastre um sistema ou recurso na biblioteca.</p>')+'</fieldset>'+cadField('resourceNotes','Outros recursos',draft.resourceNotes,'text','maxlength="400"')+'<label>Regra ou condição<textarea name="rule" maxlength="1000">'+esc(draft.rule||'')+'</textarea></label><label>Indicador vinculado<select name="metricId">'+cadOptions(cadCatalog('metric'),draft.metricId)+'</select></label></section><p class="form-error" role="alert">'+esc(cadState.error)+'</p><footer>'+cadButton('cad-cancel','Cancelar')+'<button type="submit" '+(cadLocked()?'disabled':'')+'>'+(isNew?'Adicionar ao Blueprint':'Salvar componente')+'</button></footer>'+(!isNew?cadButton('cad-delete','Remover do mapa',cadLocked()?'disabled':''):'')+'</form>';
}
function cadLinkForm(){
 const draft=cadState.link,options=value=>'<option value="">Escolha um componente</option>'+blueprintNotes().map(entry=>'<option value="'+esc(entry.note.i)+'" '+(value===entry.note.i?'selected':'')+'>'+esc(blueprintCaption(entry))+'</option>').join('');
 return '<form id="cad-link-form"><h2>'+(draft.id?'Editar conexão':'Criar conexão')+'</h2><p>Escolha origem e destino aqui ou selecione dois componentes no canvas.</p><label>Origem<select name="a" required>'+options(draft.a)+'</select></label><label>Destino<select name="b" required>'+options(draft.b)+'</select></label><label>Relação<select name="type">'+Object.entries(blueprintConnectionNames).map(([id,name])=>'<option value="'+id+'" '+(id===draft.type?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+cadField('label','Descrição da conexão',draft.label,'text','maxlength="160"')+'<fieldset data-cad-handoff><legend>Passagem entre equipes</legend>'+cadField('fromTeam','Equipe de origem',draft.fromTeam,'text','maxlength="160"')+cadField('toTeam','Equipe de destino',draft.toTeam,'text','maxlength="160"')+cadField('deliverable','O que será transferido',draft.deliverable,'text','maxlength="400"')+cadField('deadlineMinutes','Prazo da transferência (min)',draft.deadlineMinutes,'number','min="0" max="525600" step="any"')+'<label>Condição de aceite<textarea name="acceptance" maxlength="1000">'+esc(draft.acceptance||'')+'</textarea></label></fieldset><p class="form-error" role="alert">'+esc(cadState.error)+'</p><footer>'+cadButton('cad-cancel','Cancelar')+'<button type="submit" '+(cadLocked()?'disabled':'')+'>Salvar conexão</button></footer>'+(draft.id?cadButton('cad-delete-link','Remover conexão',cadLocked()?'disabled':''):'')+'</form>';
}
/* In-app confirmation replaces browser-native prompts, without changing the canonical map. */
function cadAskConfirmation({title,message,acceptLabel='Confirmar',onAccept}){
 if(cadLocked())return;
 cadState.confirmation={title,message,acceptLabel,onAccept};
 cadState.menu=null;
 rerender();
 requestAnimationFrame(()=>app.querySelector('[data-act="cad-confirm-cancel"]')?.focus());
}
function cadConfirmationView(){
 const ask=cadState.confirmation;
 if(!ask)return '';
 return '<div class="cad-confirm-backdrop"><section class="cad-confirm-panel" role="alertdialog" aria-modal="true" aria-labelledby="cad-confirm-title" aria-describedby="cad-confirm-description"><h2 id="cad-confirm-title">'+esc(ask.title)+'</h2><p id="cad-confirm-description">'+esc(ask.message)+'</p><div class="cad-confirm-actions">'+cadButton('cad-confirm-cancel','Cancelar')+cadButton('cad-confirm-accept',esc(ask.acceptLabel))+'</div></section></div>';
}
function cadLinkFields(){const form=app.querySelector('#cad-link-form');if(!form)return;const handoff=form.elements.type.value==='handoff',field=form.querySelector('[data-cad-handoff]');field.hidden=!handoff;field.disabled=!handoff;for(const name of ['fromTeam','toTeam','deliverable'])form.elements[name].required=handoff}
function cadCardDetails(note){const a=note.activity||{};return [a.owner||a.team||'Responsável a definir',a.durationMinutes!=null?a.durationMinutes+' min de execução':'',a.waitMinutes!=null?a.waitMinutes+' min de espera':''].filter(Boolean).join(' · ')}
const cadBoundary=(row,index,rows)=>cadModel.canvasBoundary(row,index,rows);
function cadSubmit(form){
 if(cadLocked()||!form.reportValidity())return;try{
  const data=cadFormData(form),next=structuredClone(S);
  if(form.id==='cad-link-form'){
   const link=window.BlueOceanJourneyContent.normalizeMatrixConnection({...data,id:cadState.link.id||uid(),handoff:data});
   if((next.links||[]).some(item=>item.id!==link.id&&item.a===link.a&&item.b===link.b&&item.type===link.type))throw Error('Esta conexão já existe. Edite o vínculo salvo.');
   next.links=[...(next.links||[]).filter(item=>item.id!==link.id),link];window.BlueOceanJourneyContent.validateMatrixDocument(next);cadSend('canvas-change',{state:next});return;
  }
  const draft=cadCurrentDraft(),step=S.steps.find(item=>cadStageKey(item)===data.stageKey);if(!step)throw Error('Selecione uma etapa disponível.');
  const input={...draft,...data,stageId:step.hostStageId,stageLocalId:step.hostLocalId};
  if(cadState.creating){cadModel.prepareCanvasInput(S,input);cadSend('canvas-create',{input});return}
  const entry=blueprintNote(cadState.selected);if(!entry)throw Error('Componente indisponível.');const note=next.c[entry.key].find(item=>item.i===entry.note.i),kind=cadModel.canvasKind(note,entry.key.split('|')[0]);
  note.t=data.title.trim();if(!note.t)throw Error('Informe o nome do componente.');note.canvas=cadModel.normalizeCanvasMetadata({...input,kind});note.activity=window.BlueOceanJourneyContent.normalizeMatrixActivity({...input,category:note.activity?.category});
  const moved=cadModel.moveCanvasCard(next,note.i,{...input,row:data.row});
  const commit=()=>cadSend('canvas-change',{state:moved},note.i);
  if((kind==='customer-action'&&data.row!=='ac'||kind==='activity'&&data.row==='ac')&&data.row!==entry.key.split('|')[0]){
    cadAskConfirmation({title:'Converter componente?',message:'Mover entre Ações do cliente e Operação altera o significado deste cartão. A alteração será registrada no mapa.',acceptLabel:'Converter e mover',onAccept:commit});
    return;
  }
  commit();
 }catch(error){cadState.error=error.message;form.querySelector('.form-error').textContent=error.message}
}

/* One consistent 24px outline language for the whole editor; glyph/emoji fonts are not used. */
const cadIconPaths={
 'customer-action':'<path d="M4 12h15m-5-5 5 5-5 5"/><path d="M4 5v14"/>',
 touchpoint:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/>',
 thought:'<path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M8 11h8m-8 4h5"/>',
 persona:'<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.4-4 3-6 7.5-6s7.1 2 7.5 6"/>',
 need:'<path d="M12 20 4.4 12.6a4.7 4.7 0 0 1 6.7-6.6L12 7l.9-1a4.7 4.7 0 0 1 6.7 6.6z"/>',
 channel:'<rect x="3.5" y="5" width="17" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
 emotion:'<circle cx="12" cy="12" r="9"/><path d="M8 14c1 2 2.3 3 4 3s3-1 4-3"/><path d="M8 9h.01M16 9h.01"/>',
 activity:'<rect x="4" y="3.5" width="16" height="17" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/>',
 decision:'<path d="m12 2 10 10-10 10L2 12z"/><path d="M12 8v5m0 3h.01"/>',
 system:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
 resource:'<rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="15" width="7" height="6" rx="1"/><rect x="14" y="15" width="7" height="6" rx="1"/>',
 pain:'<path d="m12 3 10 18H2z"/><path d="M12 9v5m0 3h.01"/>',
 opportunity:'<path d="M9 18h6m-5 3h4"/><path d="M9 15c-1.6-1-2.5-2.7-2.5-4.5a5.5 5.5 0 0 1 11 0c0 1.8-.9 3.5-2.5 4.5l-.7 2h-4.6z"/>',
 metric:'<path d="M4 20V11h4v9m4 0V5h4v15m4 0v-7h-4"/>',
 artifact:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7m-7 4h7"/>',
 text:'<path d="M5 4h14v16H5z"/><path d="M8 9h8m-8 4h8m-8 4h5"/>'
};
function cadIcon(kind){
 return '<svg class="cad-professional-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+(cadIconPaths[kind]||cadIconPaths.text)+'</svg>';
}
function cadSidebarTabs(){
 return '<div class="cad-library-tabs" role="tablist" aria-label="Biblioteca e estrutura do mapa">'+[['components','Componentes'],['lanes','Faixas']].map(([id,title])=>'<button type="button" role="tab" data-act="cad-sidebar-tab" data-tab="'+id+'" title="'+title+'" aria-label="'+title+'" aria-selected="'+(cadState.sidebarTab===id)+'" tabindex="'+(cadState.sidebarTab===id?0:-1)+'">'+'<span class="cad-tab-icon" aria-hidden="true">'+(id==='lanes'?'<svg class="cad-professional-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2" fill="white"/><circle cx="16" cy="12" r="2" fill="white"/></svg>':cadIcon('text'))+'</span>'+title+'</button>').join('')+'</div>';
}
function cadLanePanel(){
 const rows=orderedRows(),visible=rows.filter(row=>!V.hiddenRows.includes(row.id)).length;
 return '<div class="cad-lanes-panel" role="tabpanel" aria-label="Organização das faixas"><div class="cad-lanes-intro"><strong>Estrutura do mapa</strong><p>Mostre, oculte e reordene as faixas. Os dados permanecem guardados.</p><small>'+visible+' de '+rows.length+' faixas visíveis</small></div>'+
  '<div class="cad-lanes-list" aria-label="Reordenar faixas do mapa">'+rows.map((row,i)=>{
   const hidden=V.hiddenRows.includes(row.id),custom=!!(S.lanes||[]).find(value=>value.id===row.id);
   return '<div class="cad-lane-item'+(hidden?' is-hidden':'')+'" data-row="'+esc(row.id)+'"><span class="cad-lane-grip" draggable="'+!cadLocked()+'" role="img" aria-label="Arraste para reorganizar '+esc(row.n)+'" title="Arrastar para reordenar a faixa">⠿</span><button type="button" class="cad-lane-visibility" data-act="cad-lane-toggle" data-id="'+esc(row.id)+'" aria-label="'+(hidden?'Mostrar ':'Ocultar ')+esc(row.n)+'" aria-pressed="'+(!hidden)+'" '+(cadLocked()?'disabled':'')+'><span aria-hidden="true">'+(hidden?'○':'●')+'</span></button>'+
    (custom?'<input type="text" data-cad-lane-name="'+esc(row.id)+'" value="'+esc(row.n)+'" aria-label="Nome da faixa" maxlength="90" '+(cadLocked()?'disabled':'')+'>':'<span class="cad-lane-title" title="'+esc(row.n)+'">'+esc(row.n)+'</span>')+
    '<div class="cad-lane-reorder"><button type="button" data-act="cad-lane-order" data-id="'+esc(row.id)+'" data-direction="-1" aria-label="Subir '+esc(row.n)+'" '+(i===0||cadLocked()?'disabled':'')+'>↑</button><button type="button" data-act="cad-lane-order" data-id="'+esc(row.id)+'" data-direction="1" aria-label="Descer '+esc(row.n)+'" '+(i===rows.length-1||cadLocked()?'disabled':'')+'>↓</button></div></div>';
  }).join('')+'</div><div class="cad-lanes-actions">'+cadButton('alane','+ Nova faixa',cadLocked()?'disabled':'')+cadButton('customize','Personalizar faixas')+cadButton('cad-lanes-show-all','Mostrar todas',cadLocked()?'disabled':'')+cadButton('cad-lanes-hide-empty','Ocultar vazias',cadLocked()?'disabled':'')+'</div></div>';
}

function cadLibrary(){
 const q=cadState.query.trim().toLocaleLowerCase('pt-BR'),active=cadState.activeCell,filter=cadState.libraryFilter;
 const groups={experience:['Experiência do cliente',['customer-action','touchpoint','thought','persona','need']],channels:['Canais',['channel']],emotions:['Emoções',['emotion']],operation:['Operação do serviço',['activity','decision','system','resource']],analysis:['Análise e oportunidades',['pain','opportunity','metric']],content:['Conteúdo e evidências',['artifact','text']]};
 const tile=kind=>{const item=cadModel.CANVAS_COMPONENTS[kind],fav=cadState.favorites.includes(kind);return '<div class="cad-component-item"><button type="button" class="cad-component-main" data-act="cad-add" data-kind="'+kind+'" draggable="'+!cadLocked()+'" title="'+esc(item.title+' · '+item.hint)+'" aria-label="Adicionar '+esc(item.title)+'" '+(cadLocked()?'disabled':'')+'><span aria-hidden="true">'+cadIcon(kind)+'</span><b>'+esc(item.title)+'</b><small>'+esc(kind==='emotion'?'Editar a curva emocional':item.hint)+'</small></button><button type="button" class="cad-favorite'+(fav?' is-favorite':'')+'" data-act="cad-favorite" data-kind="'+kind+'" title="'+(fav?'Remover dos favoritos':'Favoritar')+'" aria-label="'+(fav?'Desfavoritar ':'Favoritar ')+esc(item.title)+'" aria-pressed="'+fav+'">'+(fav?'★':'☆')+'</button></div>'};
 let visible=0;const sections=Object.entries(groups).map(([key,[title,kinds]])=>{const items=kinds.filter(kind=>{const item=cadModel.CANVAS_COMPONENTS[kind];return item&&(!q||(item.title+' '+item.hint+' '+title).toLocaleLowerCase('pt-BR').includes(q))&&(filter!=='favorites'||cadState.favorites.includes(kind))&&(filter!=='compatible'||active&&cadModel.canvasAcceptsNewRow(kind,active.row))});visible+=items.length;if(!items.length)return '';const open=cadState.libraryCompact||!!q||cadState.groupOpen[key]!==false;return '<section class="cad-library-group"><button type="button" class="cad-group-toggle" data-act="cad-group" data-group="'+key+'" aria-expanded="'+open+'" title="'+esc(title)+'"><span>'+(open?'▾':'▸')+'</span>'+esc(title)+' <small>'+items.length+'</small></button><div class="cad-components" '+(!open?'hidden':'')+'>'+items.map(tile).join('')+'</div></section>'}).join('');
 return '<div class="cad-library-head"><h2>'+ (cadState.sidebarTab==='lanes'?'Faixas':'Componentes') +'</h2>'+cadButton('cad-toggle-library-mode',cadState.libraryCompact?'»':'«','title="'+(cadState.libraryCompact?'Expandir':'Compactar')+' biblioteca" aria-label="'+(cadState.libraryCompact?'Expandir':'Compactar')+' biblioteca"')+'</div>'+cadSidebarTabs()+(cadState.sidebarTab==='lanes'?cadLanePanel():'<label class="cad-search"><span>Buscar componente</span><input type="search" data-cad-search value="'+esc(cadState.query)+'" placeholder="Nome ou função"></label><div class="cad-library-filters" role="group" aria-label="Filtrar biblioteca">'+[['all','Todos'],['compatible','Compatíveis'],['favorites','★ Favoritos']].map(([id,title])=>cadButton('cad-lib-filter',title,'data-filter="'+id+'" aria-pressed="'+(filter===id)+'"')).join('')+'</div>'+(active?'<p class="cad-library-context">Célula: <b>'+esc(rowDefs().find(r=>r.id===active.row)?.n||active.row)+'</b> · '+esc(S.steps[active.index]?.n||'')+'</p>':'')+'<div class="cad-components-list">'+(visible?sections:'<p class="cad-library-empty">Nenhum resultado. Tente Todos.</p>')+'</div><p class="cad-library-help">Arraste para o mapa ou escolha uma célula e clique no componente.</p>');
}

function cadDraftFor(entry){const [row,index]=entry.key.split('|');return {...blueprintActivity(entry.note,row),kind:cadModel.canvasKind(entry.note,row),channelId:entry.note.canonicalChannelId||'',metricId:entry.note.canonicalMetricId||'',...entry.note.canvas,title:cadTitle(entry.note),description:entry.note.canvas?.description||entry.note.canonicalDescription||'',row,stageKey:cadStageKey(S.steps[index]),editingId:entry.note.i}}
function cadStash(){if(cadState.creating&&cadState.creating.title.trim())cadState.drafts.set('new:'+cadState.creating.kind+':'+cadState.creating.stageKey+':'+cadState.creating.row,{...cadState.creating})}
function cadQuickPosition(point={}){return {x:Math.max(12,Math.min(point.x??innerWidth/2-160,innerWidth-344)),y:Math.max(12,Math.min(point.y??170,innerHeight-350))}}
function cadReveal(row){if(V.hiddenRows.includes(row)){V.hiddenRows=V.hiddenRows.filter(id=>id!==row);V.preset='custom';saveView()}}
function cadStartQuick(kind,index=businessStageIndex(),row='',point={},inline=false){
 if(cadLocked())return;if(!S.steps.length){cadStartStage();return}
 if(kind==='emotion'){cadEditEmotion(index,point);return}const component=cadModel.CANVAS_COMPONENTS[kind];if(!component)return;
 index=Number.isInteger(index)&&S.steps[index]?index:0;row=row||component.row;
 if(!cadModel.canvasAcceptsNewRow(kind,row)){cadNotice(cadModel.canvasPlacementHint(kind,row));return}
 if(kind==='emotion'){
  const existing=(S.c['em|'+index]||[]).find(note=>note.canvas?.kind==='emotion');if(existing){cadSelect(existing.i);return}
 }
 cadStash();cadState.inlineOpenDetails=false;const stage=S.steps[index],stageKey=cadStageKey(stage),key='new:'+kind+':'+stageKey+':'+row;
 cadState.selected='';cadState.link=null;cadState.inspector=false;cadState.library=false;cadState.choosing=null;cadState.menu=null;cadState.error='';
 cadState.creating={kind,row,stageKey,title:'',description:'',resourceRefs:[],...cadState.drafts.get(key),mode:'card',inline,emotionScore:stage.e??0,emotionNote:stage.note||'',...cadQuickPosition(point)};
 cadState.quick=cadState.creating;cadReveal(row);rerender();if(inline)cadFocusInline();else cadFocusQuick();requestAnimationFrame(()=>{cadEnsureVisible('@draft');if(inline)cadFocusInline()});
}
function cadStartStage(index=S.steps.length-1,point={}){
 if(cadLocked())return;cadStash();cadState.creating=null;cadState.choosing=null;cadState.menu=null;cadState.inspector=false;cadState.quick={mode:'stage',title:'',after:cadStageKey(S.steps[index]||{}),...cadQuickPosition(point)};rerender();cadFocusQuick();
}
function cadFocusQuick(){requestAnimationFrame(()=>{const field=app.querySelector('#cad-quick-form input:not([type=hidden]),#cad-quick-form select,#cad-quick-form textarea');field?.focus();if(field?.value&&typeof field.select==='function')field.select()})}
/* Capture on canvas: do not enter the Service Graph until the user confirms. */
function cadInlineKind(row){
 return ({ac:'customer-action',fl:'activity',bk:'activity',sy:'system',ev:'artifact',ch:'channel',th:'thought',im:'pain',sd:'text'})[row]||'text';
}
function cadInlinePlaceholder(kind){
 const placeholders={'customer-action':'Escreva a ação…',pain:'Escreva a dor…',need:'Escreva a necessidade…',activity:'Escreva a atividade…',touchpoint:'Escreva o ponto de contato…',channel:'Escreva o canal…',thought:'Escreva o pensamento…',artifact:'Escreva a evidência…',system:'Escreva o sistema…',text:'Escreva aqui…'};
 return placeholders[kind]||'Escreva o cartão…';
}
function cadFocusInline(){
 requestAnimationFrame(()=>{const input=app.querySelector('[data-cad-inline-title]');input?.focus();if(input?.value)input.select()});
}
function cadReuseMatches(kind,query){
 const fold=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const needle=fold(query.trim());
 if(needle.length<3)return [];
 return cadCatalog(kind).filter(item=>fold(item.title||item.name).includes(needle)).slice(0,5);
}
function cadRefreshInlineSuggestions(input){
 const draft=cadState.creating,menu=app.querySelector('[data-cad-inline-suggestions]');
 if(!draft?.inline||!menu)return;
 const matches=cadReuseMatches(draft.kind,input.value);
 menu.hidden=!matches.length;input.setAttribute('aria-expanded',String(!!matches.length));
 menu.innerHTML=matches.map(item=>'<button type="button" role="option" data-act="cad-inline-reuse" data-id="'+esc(item.id)+'"><small>Reaproveitar</small> '+esc(item.title||item.name)+'</button>').join('')+
  (matches.length?'<button type="button" data-act="cad-inline-ignore" class="cad-inline-ignore">Ignorar e criar novo</button>':'');
}
function cadSubmitInline(openDetails=false){
 const draft=cadState.creating;if(!draft?.inline||cadLocked())return;
 const title=String(draft.title||'').trim();
 if(!title){cadNotice('Escreva o título antes de criar.');cadFocusInline();return}
 const step=S.steps.find(item=>cadStageKey(item)===draft.stageKey);
 if(!step){cadNotice('Esta etapa não está disponível.');return}
 try{
  const input={...draft,title,stageId:step.hostStageId,stageLocalId:step.hostLocalId};
  cadModel.prepareCanvasInput(S,input);
  cadState.inlineOpenDetails=!!openDetails;
  cadSend('canvas-create',{input});
 }catch(error){cadState.inlineOpenDetails=false;cadNotice(error.message);cadFocusInline()}
}
function cadQuickForm(){
 const draft=cadState.quick;if(!draft||draft.inline)return '';
 const stageMode=['stage','stage-edit'].includes(draft.mode),isEmotion=draft.kind==='emotion',step=S.steps.find(value=>cadStageKey(value)===draft.stageKey);
 const heading=stageMode?(draft.mode==='stage'?'Nova etapa':'Editar etapa'):(isEmotion?'Emoção na jornada':draft.editingId?'Editar cartão':cadModel.CANVAS_COMPONENTS[draft.kind]?.title||'Cartão');
 return '<section class="cad-quick" role="dialog" aria-labelledby="cad-quick-title" style="left:'+draft.x+'px;top:'+draft.y+'px;--cad-popup-y:'+draft.y+'px"><form id="cad-quick-form"><header><h2 id="cad-quick-title">'+esc(heading)+'</h2>'+cadButton('cad-cancel','×','aria-label="Fechar edição rápida"')+'</header>'+(!stageMode?'<p>'+esc(step?.n||'')+' · '+esc(rowDefs().find(row=>row.id===draft.row)?.n||draft.row)+'</p><p class="cad-quick-guidance">Edição rápida. Para mais propriedades, selecione o cartão.</p>':'')+(isEmotion?'<label>Como o cliente se sente?<select name="emotionScore">'+EM.map((label,index)=>'<option value="'+(index-2)+'" '+(Number(draft.emotionScore)===index-2?'selected':'')+'>'+['😞','🙁','😐','🙂','😊'][index]+' '+label+'</option>').join('')+'</select></label><label>Observação opcional<textarea name="emotionNote" maxlength="1000" placeholder="O que aconteceu nesta etapa?">'+esc(draft.emotionNote||'')+'</textarea></label><input type="hidden" name="title" value="Emoção do cliente"><label class="cad-emotion-reset"><input type="checkbox" name="emotionUnknown" '+(draft.emotionUnknown?'checked':'')+'>Não informado (remover ponto)</label>':cadField('title',stageMode?'Nome da etapa':'Nome do cartão',draft.title,'text','required maxlength="240" autocomplete="off" placeholder="'+(stageMode?'Ex.: Agendamento':'Escreva aqui…')+'"'))+(!stageMode&&!isEmotion?'<label class="cad-quick-description">Texto opcional<textarea name="description" maxlength="1000" rows="2" placeholder="Acrescente uma observação, se quiser">'+esc(draft.description||'')+'</textarea></label>':'')+(!stageMode&&['system','resource','metric','channel','persona','need','pain','opportunity'].includes(draft.kind)&&cadCatalog(draft.kind).length?'<details class="cad-quick-reuse"><summary>Usar um registro existente</summary><label>Registro do serviço<select name="referenceId">'+cadOptions(cadCatalog(draft.kind),draft.referenceId,'Criar novo')+'</select></label></details>':'')+'<p class="form-error" role="alert">'+esc(cadState.error)+'</p><footer><small>'+(draft.editingId?'Enter salva · Esc cancela':'Rascunho · Enter confirma')+'</small><button type="submit" '+(cadLocked()?'disabled':'')+'>'+(isEmotion?'Salvar emoção':stageMode?'Adicionar etapa':draft.editingId?'Salvar':'Criar cartão')+'</button></footer></form></section>';
}
function cadChooser(){
 const context=cadState.choosing;if(!context)return '';
 return '<section class="cad-chooser" role="dialog" aria-label="Adicionar componente" style="left:'+context.x+'px;top:'+context.y+'px"><header><h2>Adicionar componente</h2>'+cadButton('cad-close-chooser','×','aria-label="Fechar componentes"')+'</header><div>'+Object.entries(cadModel.CANVAS_COMPONENTS).filter(([kind])=>!context.row||cadModel.canvasAcceptsNewRow(kind,context.row)).map(([kind,item])=>cadButton('cad-add',cadIcon(kind)+' '+item.title,'data-kind="'+kind+'" data-si="'+context.index+'" data-row="'+esc(context.row||'')+'" '+(cadLocked()?'disabled':''))).join('')+'</div></section>';
}
function cadContextMenu(){
 const menu=cadState.menu;if(!menu)return '';
 let actions='';
 if(menu.edgeId)actions=cadButton('cad-edge','Editar conexão','data-id="'+esc(menu.edgeId)+'"')+cadButton('cad-remove-edge','Excluir conexão','data-id="'+esc(menu.edgeId)+'"');
 else if(menu.id)actions=cadButton('cad-select','Editar cartão','data-id="'+esc(menu.id)+'"')+cadButton('cad-duplicate','Duplicar cartão','data-id="'+esc(menu.id)+'"')+cadButton('cad-connect','Conectar a outro cartão','data-id="'+esc(menu.id)+'"')+cadButton('cad-details','Detalhes opcionais','data-id="'+esc(menu.id)+'"')+cadButton('cad-delete','Remover do mapa','data-id="'+esc(menu.id)+'"');
 else actions=cadButton('cad-stage-edit','Renomear etapa','data-si="'+menu.index+'"')+cadButton('cad-stage-after','Adicionar etapa ao lado','data-si="'+menu.index+'"')+cadButton('ds','Duplicar etapa','data-si="'+menu.index+'"')+cadButton('del','Remover etapa','data-si="'+menu.index+'"');
 return '<div class="cad-context-menu" role="group" aria-label="Ações do mapa" style="left:'+menu.x+'px;top:'+menu.y+'px">'+actions+cadButton('cad-close-menu','Fechar')+'</div>';
}
function cadEmotionSvg(row,layout){
 const points=layout.stages.map(stage=>({...cadModel.canvasEmotionPoint(stage,row),stage,known:cadRecordedEmotion(stage.step)}));
 let svg='<g class="cad-emotion-plot" aria-label="Curva emocional interativa">',start=layout.stages[0]?.x??210,end=layout.width-20;
 for(let score=-2;score<=2;score++){const y=row.y+24+(2-score)*16;svg+='<line class="cad-emotion-grid'+(score===0?' is-neutral':'')+'" x1="'+start+'" x2="'+end+'" y1="'+y+'" y2="'+y+'"/>'}
 svg+='<path class="cad-emotion-line" d="'+points.map((p,i)=>(p.known&&points[i-1]?.known?' L ':' M ')+p.x+' '+p.y).join('')+'"/>';
 points.forEach(p=>{const score=cadModel.canvasEmotionScore(p.stage.step),label=p.known?EM[score+2]:'Sem registro';
 svg+='<g class="cad-emotion-control'+(p.known?' is-recorded':'')+'" role="button" tabindex="0" data-act="cad-emotion" data-si="'+p.stage.index+'" aria-label="'+esc(p.stage.step.n+': '+label+'. Arraste ou use as setas')+'" title="'+esc('Emoção: '+label)+'"><circle class="cad-emotion-hit" cx="'+p.x+'" cy="'+p.y+'" r="17"/><circle class="cad-emotion-dot" cx="'+p.x+'" cy="'+p.y+'" r="7"/><text class="cad-emotion-caption" x="'+p.x+'" y="'+(row.y+116)+'" text-anchor="middle">'+esc(label)+'</text></g>';
 });
 return svg+'</g>';
}
function cadSvg(){
 const layout=cadState.layout,cam=cadState.camera||{x:16,y:16,zoom:1},small=cadState.detail==='overview'||cadState.detail==='auto'&&cam.zoom<.8;
 const font=Math.max(18,15/cam.zoom),labelFont=Math.max(15,13/cam.zoom),badgeFont=Math.max(12,11/cam.zoom),nodes=new Map(layout.nodes.map(node=>[node.id,node])),offsets=cadModel.canvasConnectionOffsets(S.links||[]);
 let html='<defs>'+Object.entries(cadLinkColors).map(([type,color])=>'<marker id="cad-arrow-'+type+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="'+color+'"/></marker>').join('')+'</defs><g id="cad-world" transform="translate('+cam.x+' '+cam.y+') scale('+cam.zoom+')"><text x="14" y="36" class="cad-map-label" style="font-size:'+labelFont+'px">MAPA DO</text><text x="14" y="'+(36+labelFont+4)+'" class="cad-map-label" style="font-size:'+labelFont+'px">SERVIÇO</text>';
 let insertControls='';
 if(!layout.stages.length)return html+'</g>';
 for(const stage of layout.stages){
  html+='<g role="button" tabindex="0" data-act="cad-stage-edit" data-si="'+stage.index+'" class="cad-stage" aria-label="Editar etapa '+esc(stage.step.n)+'"><rect x="'+stage.x+'" y="8" width="'+(stage.width-9)+'" height="64" rx="9" class="cad-stage-bg"/><text x="'+(stage.x+16)+'" y="29" class="cad-subtitle" style="font-size:'+badgeFont+'px">ETAPA '+(stage.index+1)+'</text><text x="'+(stage.x+16)+'" y="54" class="cad-stage-name" style="font-size:'+font+'px">'+esc(stage.step.n.slice(0,29))+'</text><title>'+esc(stage.step.n)+'</title></g>';
  if(!cadLocked())insertControls+='<g class="cad-stage-insert" role="button" tabindex="0" data-act="cad-stage-after" data-si="'+stage.index+'" aria-label="Adicionar etapa depois de '+esc(stage.step.n)+'"><circle cx="'+(stage.x+stage.width-4)+'" cy="40" r="'+Math.max(13,12/cam.zoom)+'"/><path d="M '+(stage.x+stage.width-9)+' 40 h10 M '+(stage.x+stage.width-4)+' 35 v10"/><title>Adicionar etapa ao lado</title></g>';
  if(!cadLocked())insertControls+='<g class="cad-stage-resize" role="separator" tabindex="0" data-act="cad-stage-resize" data-si="'+stage.index+'" aria-orientation="vertical" aria-label="Ajustar largura da etapa '+esc(stage.step.n)+'" aria-valuemin="210" aria-valuemax="600" aria-valuenow="'+stage.width+'" title="Arraste para ajustar a etapa"><rect x="'+(stage.x+stage.width-29)+'" y="4" width="24" height="24" rx="4"/><path d="M '+(stage.x+stage.width-17)+' 13 v13 M '+(stage.x+stage.width-13)+' 13 v13"/></g>';
 }
 html+=insertControls;
 layout.rows.forEach((row,index)=>{
  const boundary=cadModel.canvasBoundary(row,index,layout.rows),color=cadColors[row.id]||'#64748b';
  html+='<rect x="0" y="'+row.y+'" width="'+layout.width+'" height="'+row.height+'" rx="7" class="cad-lane-bg"/><path d="M2 '+(row.y+8)+' V'+(row.y+row.height-8)+'" stroke="'+color+'" stroke-width="3"/>';
  cadModel.canvasTitleLines(row.n,Math.max(7,Math.floor(192/(labelFont*.56))),Math.min(3,Math.max(1,Math.floor((row.height-18)/(labelFont+4))))).forEach((line,i)=>{html+='<text x="15" y="'+(row.y+28+i*(labelFont+4))+'" class="cad-lane-name" style="font-size:'+labelFont+'px">'+esc(line)+'</text>'});
   html+='<g class="cad-lane-select'+(cadState.selectedRow===row.id?' is-selected':'')+'" role="button" tabindex="0" data-act="cad-lane-select" data-id="'+esc(row.id)+'" aria-label="Propriedades da faixa '+esc(row.n)+'" title="Editar faixa"><rect x="0" y="'+row.y+'" width="'+(layout.stages[0]?.x||218)+'" height="'+row.height+'" fill="transparent"/></g>';
  if(boundary)html+='<path d="M0 '+(row.y-14)+' H'+layout.width+'" class="cad-boundary"/><text x="'+(layout.width/2)+'" y="'+(row.y-18)+'" text-anchor="middle" class="cad-boundary-name">'+esc(boundary)+'</text>';
  for(const stage of layout.stages){
   const notes=layout.nodes.filter(node=>node.row===row.id&&node.stageIndex===stage.index);
   const empty=!notes.some(node=>!node.note.draft);
   const drafting=notes.some(node=>node.note.draft);
   const addWidth=empty?Math.min(stage.width-32,Math.max(140,110/cam.zoom)):Math.min(stage.width-32,132);
   const addHeight=empty?Math.max(34,28/cam.zoom):28;
   const lastCardBottom=notes.reduce((bottom,node)=>Math.max(bottom,node.y+node.height),row.y+18);
   const addY=empty?row.y+row.height/2-addHeight/2:Math.min(lastCardBottom+10,row.y+row.height-addHeight-10);
   html+='<rect x="'+stage.x+'" y="'+row.y+'" width="'+stage.width+'" height="'+row.height+'" class="cad-cell" data-row="'+row.id+'" data-si="'+stage.index+'"/>';
   // An occupied cell must remain editable. A compact footer follows existing cards,
   // instead of placing the large empty-state action on top of their content.
   if(!cadLocked()&&!drafting&&row.id!=='em'){
    const label=empty?'+ Adicionar cartão':'+ Novo cartão';
    html+='<g role="button" tabindex="0" class="cad-cell-add'+(empty?'':' is-occupied')+'" data-act="cad-cell-add" data-row="'+row.id+'" data-si="'+stage.index+'" aria-label="'+(empty?'Adicionar cartão':'Adicionar outro cartão')+' em '+esc(stage.step.n)+' — '+esc(row.n)+'"><rect x="'+(stage.x+stage.width/2-addWidth/2)+'" y="'+addY+'" width="'+addWidth+'" height="'+addHeight+'" rx="6"/><text x="'+(stage.x+stage.width/2)+'" y="'+(addY+addHeight/2+5)+'" text-anchor="middle" style="font-size:'+Math.max(12,Math.min(15,12/cam.zoom))+'px">'+label+'</text></g>';
   }
  }
  if(row.id==='em'&&layout.stages.length)html+=cadEmotionSvg(row,layout);
  if(!cadLocked())html+='<g class="cad-lane-resize" role="separator" tabindex="0" data-act="cad-lane-resize" data-id="'+esc(row.id)+'" aria-label="Redimensionar faixa '+esc(row.n)+'. Arraste a borda inferior." aria-orientation="horizontal" aria-valuemin="90" aria-valuemax="540" aria-valuenow="'+Math.round(row.height)+'" title="Arraste a borda inferior para ajustar a altura"><rect x="0" y="'+(row.y+row.height-8)+'" width="'+layout.width+'" height="14"/><path d="M4 '+(row.y+row.height)+' H'+(layout.width-20)+'"/></g>';
 });
 for(const link of S.links||[]){const a=nodes.get(link.a),b=nodes.get(link.b);if(!a||!b||V.connectionMode==='off'||V.connectionMode==='selected'&&![link.a,link.b].includes(cadState.selected))continue;
  const geometry=cadModel.canvasEdgeGeometry(a,b,offsets.get(link.id)||0),name=blueprintConnectionNames[link.type]+(link.label?' · '+link.label:'');
  html+='<g role="button" tabindex="0" data-act="cad-edge" data-id="'+esc(link.id)+'" aria-label="Editar '+esc(name)+'" class="cad-edge"><title>'+esc(name+(link.handoff?' · '+link.handoff.fromTeam+' → '+link.handoff.toTeam+' · '+link.handoff.deliverable+' · Aceite: '+link.handoff.acceptance:''))+'</title><path d="'+geometry.d+'" stroke="'+cadLinkColors[link.type]+'" stroke-width="2" fill="none" marker-end="url(#cad-arrow-'+link.type+')"/><path d="'+geometry.d+'" stroke="transparent" stroke-width="16" fill="none"/><text x="'+geometry.x+'" y="'+(geometry.y-6)+'" text-anchor="middle" fill="'+cadLinkColors[link.type]+'" class="cad-edge-label">'+esc(name.slice(0,36))+'</text></g>';
 }
 for(const node of layout.nodes){if(node.row==='em')continue;const kind=cadModel.canvasKind(node.note,node.row),title=cadTitle(node.note),selected=node.id===cadState.selected,color=cadColors[node.row]||'#64748b';
  const badge=node.note.virtualLabel||(node.row==='ac'&&kind==='activity'?'Ação do cliente':(!node.note.canvas&&pickerReferenceTypes.includes(node.note.type)?contentTypes[node.note.type]?.[1]:cadModel.CANVAS_COMPONENTS[kind]?.title))||'Cartão';
  const action=node.note.draft?'cad-quick-focus':node.note.virtualLabel?'cad-virtual':'cad-select';
  const tone=['blue','teal','amber','violet','neutral'].includes(node.note.canvas?.tone)?node.note.canvas.tone:'default',iconKey=node.note.canvas?.iconKey||kind;
  const mediaUrl=kind==='artifact'?cadModel.canvasSafeUrl(node.note.canvas?.imageUrl||node.note.url):'';
  const linkUrl=cadModel.canvasSafeUrl(node.note.canvas?.linkUrl),photo=kind==='artifact'&&!!mediaUrl;
  html+='<g class="cad-node-wrap'+(selected?' is-selected':'')+(cadState.connectFrom&&node.id!==cadState.connectFrom?' is-connect-target':'')+'" transform="translate('+node.x+' '+node.y+')" data-group-id="'+esc(node.id)+'" data-tone="'+tone+'"><g class="cad-node'+(node.note.draft?' is-draft':'')+'" data-act="'+action+'" data-id="'+esc(node.id)+'" data-row="'+node.row+'" data-si="'+node.stageIndex+'" role="button" tabindex="0" aria-label="'+esc(title)+'"><title>'+esc(title+(node.note.canvas?.description?' · '+node.note.canvas.description:''))+'</title><rect width="'+node.width+'" height="'+node.height+'" rx="9" class="cad-node-bg"/><path d="M2 10V'+(node.height-10)+'" stroke="'+color+'" stroke-width="3"/>'+cadIcon(iconKey).replace('<svg class="cad-professional-icon"','<svg x="12" y="7" width="17" height="17" class="cad-professional-icon"')+'<text x="34" y="22" class="cad-subtitle" style="font-size:'+badgeFont+'px">'+esc(badge)+'</text>';
  if(photo){
    const clipId='cad-photo-'+String(node.id).replace(/[^A-Za-z0-9_-]/g,'').slice(0,40);
    html+='<defs><clipPath id="'+clipId+'"><rect x="12" y="33" width="'+(node.width-24)+'" height="'+(node.height-69)+'" rx="5"/></clipPath></defs><rect x="12" y="33" width="'+(node.width-24)+'" height="'+(node.height-69)+'" rx="5" fill="#e8eef6"/><image x="12" y="33" width="'+(node.width-24)+'" height="'+(node.height-69)+'" clip-path="url(#'+clipId+')" preserveAspectRatio="xMidYMid slice" href="'+esc(mediaUrl)+'"/>';
    html+='<text x="13" y="'+(node.height-12)+'" class="cad-node-title cad-media-title" style="font-size:'+Math.max(13,font-2)+'px">'+esc(title.slice(0,38))+'</text>';
  }else{
    if(kind==='channel')html+='<circle cx="24" cy="56" r="12" fill="#eaf4fd" stroke="#4090bf" stroke-width="1.6"/><circle cx="24" cy="56" r="5" fill="none" stroke="#4090bf" stroke-width="1.6"/>';
    const x=kind==='channel'?47:13,ybase=kind==='channel'?60:22+font+8;
    if(!(node.note.draft&&cadState.creating?.inline))cadModel.canvasTitleLines(title,Math.max(7,Math.floor((node.width-x-12)/(font*.58))),cam.zoom<.4?1:2).forEach((line,index)=>{html+='<text x="'+x+'" y="'+(cam.zoom<.4?node.height/2+font/3:ybase+index*(font+4))+'" class="cad-node-title" style="font-size:'+font+'px">'+esc(line)+'</text>'});
    if(!small&&kind!=='channel'&&title.length<Math.floor((node.width-26)/(font*.58))&&node.note.activity?.owner)html+='<text x="13" y="'+(node.height-14)+'" class="cad-node-meta">'+esc(node.note.activity.owner)+'</text>';
  }
  if(linkUrl&&!node.note.draft)html+='<g data-act="cad-open-link" data-id="'+esc(node.id)+'" role="button" tabindex="0" aria-label="Abrir link vinculado a '+esc(title)+'"><rect x="'+(node.width-64)+'" y="4" width="26" height="26" rx="4" fill="#edf5ff" stroke="#bcd3ef"/><path d="M '+(node.width-53)+' 21 l9 -9 M '+(node.width-49)+' 12 h5 v5" fill="none" stroke="#3267a0" stroke-width="1.5"/></g>';
  html+='</g>';
  if(node.note.draft&&cadState.creating?.inline){
    const hintTop=Math.max(38,node.height-36+9),suggestTop=hintTop+33;
     html+='<foreignObject x="12" y="36" width="'+(node.width-24)+'" height="'+Math.max(185,node.height+160)+'" class="cad-inline-object"><div xmlns="http://www.w3.org/1999/xhtml" class="cad-inline-edit" style="--cad-inline-hint-top:'+hintTop+'px;--cad-inline-suggest-top:'+suggestTop+'px"><label for="cad-inline-title" class="sr-only">Nome do cartão</label><input id="cad-inline-title" data-cad-inline-title type="text" maxlength="240" value="'+esc(cadState.creating.title||'')+'" placeholder="'+esc(cadInlinePlaceholder(cadState.creating.kind))+'" autocomplete="off" aria-expanded="false" aria-controls="cad-inline-suggestions" aria-keyshortcuts="Enter Shift+Enter Escape"/><small class="cad-inline-hint">Enter guarda · Shift+Enter detalha · Esc cancela</small><div id="cad-inline-suggestions" class="cad-inline-suggestions" role="listbox" data-cad-inline-suggestions hidden></div></div></foreignObject>';
     html+='<g class="cad-inline-expand" data-act="cad-inline-expand" role="button" tabindex="0" aria-label="Guardar e abrir propriedades" title="Guardar e abrir propriedades (Shift+Enter)"><rect x="'+(node.width-35)+'" y="4" width="29" height="27" rx="6" class="cad-inline-expand-bg"/><path d="M '+(node.width-27)+' 17 V 12 H '+(node.width-22)+' M '+(node.width-13)+' 17 V 12 H '+(node.width-18)+' M '+(node.width-27)+' 20 V 24 H '+(node.width-22)+' M '+(node.width-13)+' 20 V 24 H '+(node.width-18)+'" class="cad-inline-expand-glyph"/></g>';
   }
   if(!node.note.virtualLabel&&!node.note.draft){
    const shallow=!String(node.note.canvas?.description||'').trim()&&!String(node.note.activity?.owner||'').trim()&&!String(node.note.activity?.team||'').trim()&&!String(node.note.referenceId||'').trim()&&!String(node.note.canvas?.linkUrl||'').trim();
    if(shallow)html+='<text class="cad-depth-indicator" x="'+(node.width-12)+'" y="'+(node.height-11)+'" text-anchor="end">Só título</text>';
   }
   if(!cadLocked()&&!node.note.virtualLabel&&!node.note.draft)html+='<g class="cad-node-resize" data-act="cad-node-resize" data-id="'+esc(node.id)+'" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Redimensionar '+esc(title)+'. Arraste o canto inferior direito ou use as setas. Home restaura o tamanho." aria-valuemin="80" aria-valuemax="480" aria-valuenow="'+node.height+'" title="Arraste para ajustar largura e altura"><rect class="cad-node-resize-hit" x="'+(node.width-26)+'" y="'+(node.height-26)+'" width="26" height="26" rx="3"/><path d="M '+(node.width-16)+' '+(node.height-6)+' L '+(node.width-6)+' '+(node.height-16)+' M '+(node.width-10)+' '+(node.height-6)+' L '+(node.width-6)+' '+(node.height-10)+'"/></g>';
  if(!cadLocked()&&!node.note.virtualLabel&&!node.note.draft)html+='<g class="cad-port" role="button" tabindex="0" data-act="cad-connect" data-id="'+esc(node.id)+'" aria-label="Conectar '+esc(title)+'"><circle cx="'+node.width+'" cy="'+(node.height/2)+'" r="'+Math.max(11,11/cam.zoom)+'"/><path d="M '+(node.width-4)+' '+(node.height/2)+' h8 M '+node.width+' '+(node.height/2-4)+' v8"/></g><g class="cad-node-menu" role="button" tabindex="0" data-act="cad-menu" data-id="'+esc(node.id)+'" aria-label="Ações de '+esc(title)+'"><rect x="'+(node.width-35)+'" y="6" width="28" height="25" rx="5"/><text x="'+(node.width-21)+'" y="23" text-anchor="middle">···</text></g>';
  html+='</g>';
 }
 if(cadState.connectFrom&&cadState.pointer){const source=nodes.get(cadState.connectFrom);if(source)html+='<path class="cad-connect-preview" d="M '+(source.x+source.width)+' '+(source.y+source.height/2)+' L '+cadState.pointer.x+' '+cadState.pointer.y+'"/>'}
 return html+'</g>';
}
function cadMobileMap(){
 const index=businessStageIndex(),step=S.steps[index];if(!step)return '<div class="cad-mobile-empty"><h2>Comece com uma etapa</h2>'+cadButton('step','+ Adicionar etapa')+'</div>';businessStage=step.hostLocalId||step.hostStageId;
 return '<nav class="cad-stage-nav" aria-label="Navegar entre etapas">'+cadButton('cad-prev','‹','aria-label="Etapa anterior" '+(!index?'disabled':''))+'<label>Etapa '+(index+1)+' de '+S.steps.length+'<select data-cad-stage aria-label="Etapa em foco">'+S.steps.map((value,i)=>'<option value="'+i+'" '+(i===index?'selected':'')+'>'+esc(value.n)+'</option>').join('')+'</select></label>'+cadButton('cad-next','›','aria-label="Próxima etapa" '+(index===S.steps.length-1?'disabled':''))+'</nav><div class="cad-mobile-stage"><h2>'+esc(step.n)+'</h2>'+cadButton('cad-stage-after','+','data-si="'+index+'" aria-label="Adicionar etapa ao lado"')+'</div>'+cadRows().map((row,i,rows)=>'<section class="cad-mobile-lane" data-row="'+row.id+'">'+(cadModel.canvasBoundary(row,i,rows)?'<p class="cad-mobile-boundary">'+cadModel.canvasBoundary(row,i,rows)+'</p>':'')+'<h3>'+esc(row.n)+'</h3>'+(row.id==='em'?[]:cadCellNotes(row.id,index)).map(note=>'<article class="cad-mobile-card">'+cadButton(note.virtualLabel?'cad-virtual':'cad-select','<small>'+esc(note.virtualLabel||cadModel.CANVAS_COMPONENTS[cadModel.canvasKind(note,row.id)].title)+'</small><b>'+esc(cadTitle(note))+'</b>','data-id="'+esc(note.i)+'" data-row="'+row.id+'" data-si="'+index+'"')+(!note.virtualLabel?cadButton('cad-menu','···','data-id="'+esc(note.i)+'" aria-label="Ações do cartão"'):'')+'</article>').join('')+(row.id==='em'?cadButton('cad-emotion',cadRecordedEmotion(step)?EM[cadModel.canvasEmotionScore(step)+2]:'Registrar emoção','data-si="'+index+'" '+(cadLocked()?'disabled':'')):cadButton('cad-cell-add','+ Adicionar cartão','data-row="'+row.id+'" data-si="'+index+'" '+(cadLocked()?'disabled':'')))+'</section>').join('');
}
function cadRender(){
 if(!V.canvasOrderVersion){const preferred=['sd','ev','ch','ac','th','em','fl','bk','sy','im'];V.rowOrder=[...preferred,...V.rowOrder.filter(id=>!preferred.includes(id))];V.canvasOrderVersion=1;saveView()}
 const scene=S.journeyId||S.id;if(cadState.scene!==scene||cadState.canvasPerspective!==V.perspective){Object.assign(cadState,{scene,canvasPerspective:V.perspective,selected:'',selectedRow:'',creating:null,quick:null,link:null,camera:null,drafts:new Map(),inspector:false,error:'',menu:null,connectFrom:'',choosing:null,activeCell:null,libraryFilter:'all',resize:null,resizePreview:null,emotionDrag:null,laneResize:null,lanePreviewHeights:null,cardResize:null,cardResizePreview:null,lastCardClick:null})}
 document.body.classList.add('cad-mode');cadState.layout=cadModel.buildCanvasLayout(cadProjection(),cadRows(),null,cadStageWidths(),cadRowHeights());
 if(cadState.selected&&!blueprintNote(cadState.selected)){cadState.selected='';cadState.inspector=false}
 const mobile=cadMobile(),showInspector=cadState.inspector&&(!!cadState.selected||!!cadState.selectedRow),view=V.perspective==='journey'?'journey':'blueprint';
 const status=cadState.error||(cadState.pending?'Concluindo alteração…':S.readOnly?'Somente leitura':cadState.connectFrom?'Escolha o cartão de destino · Esc cancela':cadState.quick?'Rascunho — confirme para adicionar ao mapa':'Arraste um componente ou use + em uma célula');
 app.innerHTML='<div class="cad-shell"><header class="cad-header">'+cadButton('back','← Mapas','aria-label="Voltar para mapas do serviço"')+'<input data-f="title" aria-label="Nome do mapa" value="'+esc(S.title||'')+'"><span role="status" data-save-status>'+(cadState.pending?'Salvando…':saveLabel)+'</span><label class="cad-view-label">Visualização<select data-cad-view aria-label="Visualização do mapa"><option value="blueprint" '+(view==='blueprint'?'selected':'')+'>Blueprint</option><option value="journey" '+(view==='journey'?'selected':'')+'>Jornada</option><option value="matrix">Matriz</option></select></label></header><div class="cad-toolbar">'+cadButton('cad-library','+ Componente',cadLocked()?'disabled':'')+cadButton('step','+ Etapa','aria-label="Adicionar etapa" '+(cadLocked()?'disabled':''))+(cadState.selected&&!cadState.menu?cadButton('cad-details','Propriedades','data-id="'+esc(cadState.selected)+'" aria-label="Detalhes opcionais"'):'')+cadButton('undo','↶','aria-label="Desfazer" '+(!(HOSTED?H.canUndo:U.length)||cadLocked()?'disabled':''))+cadButton('redo','↷','aria-label="Refazer" '+(!(HOSTED?H.canRedo:R.length)||cadLocked()?'disabled':''))+cadButton('business-review','Revisar operação')+'<details class="cad-options"><summary>Mais</summary><div class="cad-options-panel">'+cadButton('cad-export','Exportar SVG')+cadButton('business-storage','Dados e backup')+cadButton('cad-fit','Ajustar mapa')+'<div class="cad-width-actions"><b>Largura das etapas</b>'+cadButton('cad-stage-narrow','− Reduzir todas')+cadButton('cad-stage-wide','+ Ampliar todas')+cadButton('cad-stage-equal','Uniformizar larguras')+cadButton('cad-stage-reset','Restaurar padrão')+'</div><label>Conexões<select data-cad-links aria-label="Exibir conexões">'+[['all','Todas'],['selected','Da seleção'],['off','Ocultar']].map(([id,name])=>'<option value="'+id+'" '+(id===V.connectionMode?'selected':'')+'>'+name+'</option>').join('')+'</select></label><label>Detalhes<select data-cad-detail aria-label="Nível de detalhe">'+[['auto','Automático'],['overview','Visão geral'],['detail','Completo']].map(([id,name])=>'<option value="'+id+'" '+(id===cadState.detail?'selected':'')+'>'+name+'</option>').join('')+'</select></label></div></details>'+(cadState.libraryHidden?cadButton('cad-toggle-library','Mostrar componentes'):'')+'<label class="cad-persona-label">Persona<select data-cad-persona aria-label="Persona do mapa">'+cadOptions(cadCatalog('persona'),S.personaId,'Sem Persona vinculada')+'</select></label></div>'+(cadState.connectFrom?'<div class="cad-connecting" role="region" aria-label="Criar conexão"><span>Escolha o cartão de destino</span><label>Relação<select data-cad-connect-type aria-label="Tipo da nova conexão">'+Object.entries(blueprintConnectionNames).map(([id,label])=>'<option value="'+id+'" '+(id===(cadState.connectType||'sequence')?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+cadButton('cad-cancel','Cancelar conexão')+'</div>':'')+'<div class="cad-workspace'+(showInspector?' has-inspector':'')+(cadState.libraryHidden?' is-library-hidden':'')+(cadState.libraryCompact?' is-library-compact':'')+'"><aside class="cad-library" aria-label="Biblioteca de componentes">'+(!mobile?cadLibrary():'')+'</aside><main class="cad-main" aria-label="Mapa do serviço">'+(mobile?'<div class="cad-mobile-map">'+cadMobileMap()+'</div>':'<div class="cad-viewport" tabindex="0" aria-label="Canvas: arraste o fundo para mover; Ctrl e roda para ampliar"><svg id="cad-svg" aria-label="Etapas e componentes do serviço">'+cadSvg()+'</svg><div class="cad-sticky-stages" hidden aria-hidden="true"></div>'+(!S.steps.length?'<div class="cad-start"><h2>Como seu serviço acontece?</h2><p>Crie uma etapa e adicione o primeiro cartão.</p>'+cadButton('step','+ Adicionar etapa',cadLocked()?'disabled':'')+'</div>':'')+'<div class="cad-camera">'+cadButton('cad-minus','−','aria-label="Diminuir canvas"')+cadButton('cad-fit','Ajustar')+cadButton('cad-home','Início','title="Retornar ao começo em 100%" aria-label="Ir à primeira etapa em escala 100%"')+'<output data-cad-zoom></output>'+cadButton('cad-plus','+','aria-label="Ampliar canvas"')+'</div></div>')+'</main>'+(showInspector&&!mobile?'<aside class="cad-inspector" aria-label="Detalhes opcionais">'+cadButton('cad-close','Fechar detalhes')+cadInspector()+'</aside>':'')+'</div><footer class="cad-footer"><span>'+Object.values(S.c).flat().length+' cartões · '+(S.links||[]).length+' conexões · '+S.steps.length+' etapas</span><span role="status" data-cad-status>'+esc(status)+'</span><span class="cad-legend"><i style="background:'+cadColors.fl+'"></i> Frente <i style="background:'+cadColors.bk+'"></i> Bastidores <i style="background:'+cadColors.sy+'"></i> Apoio</span></footer></div>'+cadQuickForm()+cadChooser()+cadContextMenu()+cadConfirmationView()+
 (mobile?'<dialog id="cad-library-sheet" class="cad-sheet" aria-label="Biblioteca de componentes">'+cadButton('cad-close-library','Fechar componentes')+cadLibrary()+'</dialog><dialog id="cad-inspector-sheet" class="cad-sheet" aria-label="Detalhes opcionais">'+cadButton('cad-close','Fechar detalhes')+(showInspector?cadInspector():'')+'</dialog>':'')+'<dialog id="cad-link-sheet" class="cad-sheet" aria-label="Editar conexão">'+cadButton('cad-close-link','Fechar conexão')+(cadState.link?cadLinkForm():'')+'</dialog>'+customizer()+growthDialogs()+contentDialogs()+contextDialogs()+viewsDialogs()+cardToolsDialogs()+blueprintDialogs()+businessDialogs();
 if(mobile&&cadState.library)app.querySelector('#cad-library-sheet').showModal();else if(mobile&&showInspector)app.querySelector('#cad-inspector-sheet').showModal();
 if(cadState.link)app.querySelector('#cad-link-sheet').showModal();
 if(cadLocked()){app.querySelector('.cad-header>input').readOnly=true;app.querySelector('[data-cad-persona]').disabled=true;app.querySelectorAll('#cad-component-form input,#cad-component-form select,#cad-component-form textarea,#cad-link-form input,#cad-link-form select,#cad-link-form textarea,#cad-quick-form input,#cad-quick-form select,#cad-quick-form textarea').forEach(field=>field.disabled=true)}
 cadLinkFields();requestAnimationFrame(()=>{if(!cadState.camera)cadInitialCamera();else cadPaint()});
}
function cadUpdateStickyStages(){
 const strip=app.querySelector('.cad-sticky-stages'),viewport=app.querySelector('.cad-viewport'),cam=cadState.camera;
 if(!strip||!viewport||!cam)return;
 const visible=cam.y< -40&&!!cadState.layout?.stages?.length;
 strip.hidden=!visible;
 if(!visible){strip.innerHTML='';return}
 const vw=viewport.clientWidth;
 strip.innerHTML=cadState.layout.stages.map(stage=>{
  const left=Math.round(stage.x*cam.zoom+cam.x),width=Math.round(stage.width*cam.zoom);
  if(left+width<0||left>vw)return '';
  return '<span class="cad-sticky-stage" style="left:'+left+'px;width:'+Math.max(0,width)+'px"><small>ETAPA '+(stage.index+1)+'</small><b>'+esc(stage.step.n)+'</b></span>';
 }).join('');
}
function cadPaint(){const svg=app.querySelector('#cad-svg');if(svg)svg.innerHTML=cadSvg();const out=app.querySelector('[data-cad-zoom]');if(out)out.value=Math.round((cadState.camera?.zoom||1)*100)+'%';cadUpdateStickyStages()}
function cadInitialCamera(){
 const viewport=app.querySelector('.cad-viewport');
 if(!viewport)return;
 /* Start at the first stage at 100%, rather than shrinking the full board into the viewport. */
 cadState.camera={x:16,y:16,zoom:1};
 cadPaint();
}
function cadFit(){const viewport=app.querySelector('.cad-viewport');if(!viewport)return;const layout=cadState.layout,zoom=Math.max(.2,Math.min(1,(viewport.clientWidth-40)/layout.width,(viewport.clientHeight-45)/layout.height));cadState.camera={x:Math.max(16,(viewport.clientWidth-layout.width*zoom)/2),y:16,zoom};cadPaint()}
function cadEnsureVisible(id){const viewport=app.querySelector('.cad-viewport'),node=cadState.layout?.nodes.find(value=>value.id===id);if(!viewport||!node||!cadState.camera)return;const cam=cadState.camera,left=node.x*cam.zoom+cam.x,top=node.y*cam.zoom+cam.y;if(left<20)cam.x+=20-left;else if(left+node.width*cam.zoom>viewport.clientWidth-20)cam.x-=left+node.width*cam.zoom-viewport.clientWidth+20;if(top<20)cam.y+=20-top;else if(top+node.height*cam.zoom>viewport.clientHeight-80)cam.y-=top+node.height*cam.zoom-viewport.clientHeight+80;cadPaint()}
function cadZoom(factor,x,y){const viewport=app.querySelector('.cad-viewport');if(!viewport)return;const cam=cadState.camera||{x:16,y:16,zoom:1},next=Math.max(.2,Math.min(2.4,cam.zoom*factor));x??=viewport.clientWidth/2;y??=viewport.clientHeight/2;cadState.camera={x:x-(x-cam.x)*next/cam.zoom,y:y-(y-cam.y)*next/cam.zoom,zoom:next};cadPaint()}
function cadNotice(message){cadState.error=message;const status=app.querySelector('[data-cad-status]');if(status)status.textContent=message}
function cadOpenInspector(){cadState.inspector=true;cadState.quick=null;cadState.menu=null;cadState.library=false;rerender()}
function cadSelect(id,point={},inline=false){
 if(cadState.ignoreClick){cadState.ignoreClick=false;return}
 const entry=blueprintNote(id);if(!entry)return;
 if(cadState.connectFrom){if(id===cadState.connectFrom){cadState.connectFrom='';cadPaint();return}cadConnectTo(id);return}
 cadStash();cadState.creating=null;cadState.selected=id;cadState.selectedRow='';cadState.menu=null;cadState.choosing=null;cadState.error='';
 const [row,index]=entry.key.split('|');
 const draft=cadState.drafts.get(id)||cadDraftFor(entry);
 Object.assign(draft,{mode:'card',editingId:id,...cadQuickPosition(point)});
 if(draft.kind==='emotion'){draft.emotionScore=S.steps[index].e;draft.emotionNote=S.steps[index].note||''}
 cadState.drafts.set(id,draft);
 if(inline===true){cadState.inspector=false;cadState.quick=draft;rerender();cadFocusQuick();}
 else if(inline==='select'){cadState.quick=null;cadState.inspector=false;rerender();requestAnimationFrame(()=>app.querySelector('.cad-node[data-id="'+CSS.escape(id)+'"]')?.focus())}
 else {cadState.quick=null;cadState.inspector=true;rerender();requestAnimationFrame(()=>app.querySelector('#cad-component-form [name="title"]')?.focus());}
}
function cadOpenLink(id='',source=''){const link=(S.links||[]).find(value=>value.id===id);if(!link){cadState.connectFrom=source||cadState.selected;cadState.quick=null;cadState.menu=null;rerender();return}cadState.link={...link,...link.handoff};cadState.quick=null;cadState.menu=null;cadState.inspector=false;cadState.error='';rerender()}
function cadConnectTo(target){
 if(cadLocked())return;try{const source=cadState.connectFrom,next=structuredClone(S),type=cadState.connectType||'sequence';if((next.links||[]).some(link=>link.a===source&&link.b===target&&link.type===type))throw Error('Esta conexão já existe entre esses cartões.');
  if(type==='handoff'){cadState.link={a:source,b:target,type,fromTeam:blueprintNote(source)?.note.activity?.team||'',toTeam:blueprintNote(target)?.note.activity?.team||'',deliverable:'',acceptance:'',deadlineMinutes:''};cadState.connectFrom='';rerender();return}
  const link=window.BlueOceanJourneyContent.normalizeMatrixConnection({id:uid(),a:source,b:target,type});next.links=[...(next.links||[]),link];window.BlueOceanJourneyContent.validateMatrixDocument(next);cadState.connectFrom='';cadState.pointer=null;cadSend('canvas-change',{state:next},target);
 }catch(error){cadNotice(error.message)}
}
function cadSend(type,payload,noteId=''){
 if(cadLocked())return;
 // Reject invalid raw canvas requests before entering the pending/render path.
 // Invalid placements must not change the Service Graph or crash the inspector.
 if(type==='canvas-create'&&payload?.input&&!cadModel.canvasAcceptsNewRow(payload.input.kind,payload.input.row)){
  cadState.error='Componente não compatível com esta faixa.';
  cadState.pending='';cadState.pendingDocument=null;
  rerender();return;
 }cadState.pendingDocument=type==='canvas-change'?structuredClone(payload.state):null;cadState.pending=uid();cadState.error='';announceSave('pending');
 if(HOSTED){window.parent.postMessage({boBlueprintHost:1,type,requestId:cadState.pending,...payload,noteId},location.origin);rerender();return}
 try{let next=payload.state;if(type==='canvas-create'){const data=cadModel.prepareCanvasInput(S,payload.input);next=structuredClone(S);noteId=uid();(next.c[data.row+'|'+data.index]||=[]).push({i:noteId,type:'card',t:data.title,canvas:data.canvas,activity:data.activity});if(data.kind==='emotion')Object.assign(next.steps[data.index],{e:Number(payload.input.emotionScore||0),emotionRecorded:true,note:payload.input.emotionNote||'',emotionStatus:'hypothesis'})}window.BlueOceanJourneyContent.validateMatrixDocument(next);Object.assign(S,next);save();cadResult({requestId:cadState.pending,ok:true,state:S,noteId})}catch(error){cadResult({requestId:cadState.pending,ok:false,error:error.message})}
}
function cadResult(data){
 if(data.requestId!==cadState.pending)return;cadState.pending='';cadState.pendingDocument=null;if(!data.ok){cadState.error=data.error||'Não foi possível salvar.';cadState.inlineOpenDetails=false;announceSave(false);rerender();if(cadState.creating?.inline)cadFocusInline();else cadFocusQuick();return}
 S=structuredClone(data.state);S.id=HOSTED?'host':S.id;DB={cur:S.id,js:[S]};last=JSON.stringify(S);growthLastPatch=growthPatchKey();if(data.history)H=data.history;
 const wasInline=!!cadState.creating?.inline,openInlineDetails=wasInline&&!!cadState.inlineOpenDetails&&!!data.noteId;
 cadState.inlineOpenDetails=false;
 if(cadState.creating)cadState.drafts.delete('new:'+cadState.creating.kind+':'+cadState.creating.stageKey+':'+cadState.creating.row);cadState.drafts.delete(cadState.selected);
 cadState.creating=null;cadState.quick=null;cadState.link=null;cadState.menu=null;cadState.lastCardClick=null;cadState.selected=data.noteId||'';cadState.inspector=(!wasInline||openInlineDetails)&&!!cadState.selected&&!cadMobile();cadState.selectedRow='';cadState.error='';if(openInlineDetails){const entry=blueprintNote(data.noteId);if(entry)cadState.drafts.set(data.noteId,cadDraftFor(entry))}announceSave(true);rerender();
 requestAnimationFrame(()=>{if(openInlineDetails)app.querySelector('#cad-component-form [name="description"]')?.focus();else app.querySelector('.cad-node[data-id="'+CSS.escape(data.noteId||'')+'"]')?.focus()});
}
function cadQuickSubmit(form){
 if(cadLocked()||!form.reportValidity())return;try{
  const values=Object.fromEntries(new FormData(form)),draft=cadState.quick;Object.assign(draft,values);const next=structuredClone(S);
  if(draft.mode==='emotion'){
   const index=next.steps.findIndex(stage=>cadStageKey(stage)===draft.stageKey);if(index<0)throw Error('Etapa indisponível');
   const unknown=values.emotionUnknown==='on',score=Math.max(-2,Math.min(2,Number(draft.emotionScore)||0));
   Object.assign(next.steps[index],{e:unknown?0:score,note:unknown?'':String(draft.emotionNote||''),emotionRecorded:!unknown,emotionStatus:'hypothesis',emotionSource:''});
   cadSend('canvas-change',{state:next});return;
  }
  if(draft.mode==='stage'){
   const after=S.steps.find(step=>cadStageKey(step)===draft.after),state=cadModel.insertCanvasStage(S,{title:draft.title,localId:uid(),afterStageId:after?.hostStageId,afterStageLocalId:after?.hostLocalId});cadState.camera=null;cadSend('canvas-change',{state});return;
  }
  if(draft.mode==='context'){const step=next.steps.find(step=>cadStageKey(step)===draft.stageKey);if(!step)throw Error('Etapa indisponível.');step.d=draft.title.trim();cadSend('canvas-change',{state:next});return}
  if(draft.mode==='stage-edit'){const step=next.steps.find(step=>cadStageKey(step)===draft.stageKey);if(!step)throw Error('Etapa indisponível.');step.n=draft.title.trim();cadSend('canvas-change',{state:next});return}
  const index=S.steps.findIndex(step=>cadStageKey(step)===draft.stageKey),step=S.steps[index];if(!step)throw Error('A etapa mudou. Escolha um destino disponível.');
  const input={...draft,title:draft.kind==='emotion'?'Emoção do cliente':draft.title,stageId:step.hostStageId,stageLocalId:step.hostLocalId};
  if(!draft.editingId){cadModel.prepareCanvasInput(S,input);cadSend('canvas-create',{input});return}
  const entry=blueprintNote(draft.editingId);if(!entry)throw Error('Cartão indisponível.');const note=next.c[entry.key].find(value=>value.i===draft.editingId);
  note.t=input.title.trim();if(!note.t)throw Error('Dê um nome ao cartão.');note.canvas=cadModel.normalizeCanvasMetadata({...note.canvas,...input});
  if(draft.kind==='emotion')Object.assign(next.steps[index],{e:Number(draft.emotionScore),note:String(draft.emotionNote||''),emotionRecorded:true});
  cadSend('canvas-change',{state:next},note.i);
 }catch(error){cadState.error=error.message;form.querySelector('.form-error').textContent=error.message}
}
function cadAction(action,data,button){
 if(action==='cad-confirm-cancel'){cadState.confirmation=null;rerender();return true}
 if(action==='cad-confirm-accept'){const callback=cadState.confirmation?.onAccept;cadState.confirmation=null;if(typeof callback==='function')callback();else rerender();return true}
 if(cadState.confirmation)return true;
 if(action==='step'&&cadEnabled()){cadStartStage(S.steps.length-1,button?{x:button.getBoundingClientRect().left,y:button.getBoundingClientRect().bottom+8}:{});return true}
 if(!action.startsWith('cad-'))return false;
 const rect=button?.getBoundingClientRect(),point=rect?{x:rect.left,y:rect.bottom+8}:{};
 if(action==='cad-open'||action==='cad-matrix'){cadStash();V.blueprintRenderer=action==='cad-open'?'canvas':'matrix';saveView();rerender();return true}
 if(action==='cad-select'){cadState.lastCardClick={id:data.id,time:Date.now()};cadSelect(data.id,point,false);return true}
 if(action==='cad-inline'){cadSelect(data.id,point,true);return true}
 if(action==='cad-quick-focus'){if(cadState.creating?.inline)cadFocusInline();else cadFocusQuick();return true}
 if(action==='cad-inline-expand'){cadSubmitInline(true);return true}
 if(action==='cad-edge'){cadOpenLink(data.id);return true}
 if(action==='cad-connect'||action==='cad-link'){
  if(cadLocked())return true;cadState.connectFrom=data.id||cadState.selected;cadState.connectType='sequence';cadState.menu=null;cadState.quick=null;cadState.inspector=false;cadState.error='';rerender();return true;
 }
 if(action==='cad-menu'){cadState.menu={id:data.id,...cadQuickPosition(point)};rerender();return true}
 if(action==='cad-close-menu'){cadState.menu=null;rerender();return true}
 if(action==='cad-close-chooser'){cadState.choosing=null;rerender();return true}
 if(action==='cad-close-link'){cadState.link=null;rerender();return true}
 if(action==='cad-close-library'){cadState.library=false;app.querySelector('#cad-library-sheet')?.close();return true}
 if(action==='cad-inline-reuse'){
   const draft=cadState.creating,source=draft&&cadCatalog(draft.kind).find(item=>item.id===data.id);
   if(draft?.inline&&source){draft.referenceId=source.id;draft.title=String(source.title||source.name);cadSubmitInline()}
   return true;
  }
  if(action==='cad-inline-ignore'){app.querySelector('[data-cad-inline-suggestions]')?.setAttribute('hidden','');cadFocusInline();return true}
  if(action==='cad-library'||action==='cad-cell-add'){
  if(cadLocked())return true;
  if(action==='cad-cell-add'){
     cadState.activeCell={row:data.row,index:Number(data.si)};cadState.libraryFilter='compatible';
     if(!cadMobile()&&S.steps[Number(data.si)]){cadStartQuick(cadInlineKind(data.row),Number(data.si),data.row,point,true);return true}
   }
  if(!S.steps.length){cadStartStage();return true}
  if(action==='cad-library'&&cadMobile()){cadState.sidebarTab='components';cadState.library=true;rerender();return true}
  cadState.choosing={index:data.si!==undefined?Number(data.si):businessStageIndex(),row:data.row||'',...cadQuickPosition(point)};cadState.menu=null;rerender();return true;
 }
 if(action==='cad-sidebar-tab'){
  if(!['components','lanes'].includes(data.tab))return true;
  cadState.sidebarTab=data.tab;
  if(data.tab==='lanes')cadState.libraryCompact=false;
  cadSaveLibraryPreferences();rerender();
  requestAnimationFrame(()=>app.querySelector('[data-act="cad-sidebar-tab"][data-tab="'+data.tab+'"]')?.focus());
  return true;
 }
 if(action==='cad-lane-toggle'){
  if(cadLocked()||!orderedRows().some(row=>row.id===data.id))return true;
  V.hiddenRows=V.hiddenRows.includes(data.id)?V.hiddenRows.filter(id=>id!==data.id):[...new Set([...V.hiddenRows,data.id])];
  V.preset='custom';saveView();rerender();return true;
 }
 if(action==='cad-lane-order'){
  if(cadLocked())return true;
  moveLane(data.id,Number(data.direction),false);return true;
 }
 if(action==='cad-lanes-hide-empty'){
  if(cadLocked())return true;
  const empty=rowDefs().filter(row=>row.id!=='em'||!S.steps.some(cadRecordedEmotion)).filter(row=>S.steps.every((_,i)=>(S.c[row.id+'|'+i]||[]).length===0)).map(row=>row.id);
  V.hiddenRows=[...new Set([...(V.hiddenRows||[]),...empty])];V.preset='custom';saveView();rerender();return true;
 }
 if(action==='cad-lanes-show-all'){
  if(cadLocked())return true;
  V.hiddenRows=[];V.preset='custom';saveView();rerender();return true;
 }
 if(action==='cad-lane-select'){
  if(!rowDefs().some(row=>row.id===data.id))return true;
  cadState.selected='';cadState.quick=null;cadState.selectedRow=data.id;cadState.inspector=true;cadState.menu=null;rerender();return true;
 }
 if(action==='cad-lane-advanced'){if(!cadLocked())contentOpenRow(data.id);return true}
 if(action==='cad-lane-height-apply'){
  const field=app.querySelector('[data-cad-height]');if(field&&!field.checkValidity()){field.reportValidity();return true}
  cadChangeRowHeight(data.id,field?.value);return true;
 }
 if(action==='cad-lane-auto'){cadChangeRowHeight(data.id,null);return true}
 if(action==='cad-open-link'){
  const entry=blueprintNote(data.id||cadState.selected),url=cadModel.canvasSafeUrl(entry?.note.canvas?.linkUrl||entry?.note.canvas?.imageUrl||entry?.note.url);
  if(url)window.open(url,'_blank','noopener,noreferrer');return true;
 }
 if(action==='cad-toggle-library-mode'){cadState.libraryCompact=!cadState.libraryCompact;cadSaveLibraryPreferences();rerender();return true}
 if(action==='cad-group'){cadState.groupOpen[data.group]=cadState.groupOpen[data.group]===false;cadSaveLibraryPreferences();rerender();return true}
 if(action==='cad-favorite'){const kind=data.kind;cadState.favorites=cadState.favorites.includes(kind)?cadState.favorites.filter(x=>x!==kind):[...cadState.favorites,kind];cadSaveLibraryPreferences();rerender();return true}
 if(action==='cad-lib-filter'){cadState.libraryFilter=data.filter;rerender();return true}
 if(['cad-stage-narrow','cad-stage-wide','cad-stage-equal','cad-stage-reset'].includes(action)){
  if(cadLocked())return true;const widths=cadStageWidths(),average=Math.round(S.steps.reduce((sum,_,i)=>sum+cadModel.canvasStageWidth(widths[i]),0)/Math.max(1,S.steps.length));
  V.stageWidths=S.steps.map((_,i)=>action==='cad-stage-reset'?392:action==='cad-stage-equal'?average:cadModel.canvasStageWidth(cadModel.canvasStageWidth(widths[i])+(action==='cad-stage-wide'?48:-48)));
  V.fitToScreen=false;saveView();rerender();return true;
 }
 if(action==='cad-stage-resize'||action==='cad-lane-resize'||action==='cad-node-resize')return true;
 if(action==='cad-emotion'){if(cadState.ignoreClick){cadState.ignoreClick=false;return true}cadEditEmotion(Number(data.si),point);return true}
 if(action==='cad-toggle-library'){cadState.libraryHidden=!cadState.libraryHidden;rerender();return true}
 if(action==='cad-close'){cadState.inspector=false;cadState.selectedRow='';rerender();return true}
 if(action==='cad-details'){
  cadState.selectedRow='';const entry=blueprintNote(data.id||cadState.selected);if(!entry)return true;cadState.selected=entry.note.i;cadState.creating=null;cadState.drafts.set(entry.note.i,cadDraftFor(entry));cadOpenInspector();return true;
 }
 if(action==='cad-cancel'){
  cadState.inlineOpenDetails=false;
  if(cadState.creating)cadState.drafts.delete('new:'+cadState.creating.kind+':'+cadState.creating.stageKey+':'+cadState.creating.row);
  cadState.drafts.delete(cadState.selected);Object.assign(cadState,{creating:null,quick:null,link:null,menu:null,selected:'',selectedRow:'',inspector:false,error:'',connectFrom:'',pointer:null,lastCardClick:null});rerender();return true;
 }
 if(action==='cad-add'){
  const kind=data.kind||'text',active=cadState.activeCell,index=data.si!==undefined?Number(data.si):cadState.choosing?.index??active?.index??businessStageIndex();
  const row=data.row||cadState.choosing?.row||(active&&cadModel.canvasAcceptsNewRow(kind,active.row)?active.row:'');
  if(kind==='emotion'){cadEditEmotion(index,point);return true}
  cadStartQuick(kind,index,row,point);return true;
 }
 if(action==='cad-stage-after'){cadStartStage(Number(data.si),point);return true}
 if(action==='cad-stage-edit'){const step=S.steps[Number(data.si)];if(step&&!cadLocked()){cadStash();cadState.creating=null;cadState.quick={mode:'stage-edit',title:step.n,stageKey:cadStageKey(step),...cadQuickPosition(point)};cadState.menu=null;rerender();cadFocusQuick()}return true}
 if(action==='cad-virtual'){
  const row=data.row,index=Number(data.si),step=S.steps[index];if(row==='em'){cadStartQuick('emotion',index,'em',point);return true}
  if(row==='sd'){cadState.creating=null;cadState.selected='';cadState.quick={mode:'context',kind:'text',title:step.d,description:'',row:'sd',stageKey:cadStageKey(step),...cadQuickPosition(point)};rerender();cadFocusQuick();return true}
  V.blueprintRenderer='matrix';saveView();rerender();return true;
 }
 if(action==='cad-prev'||action==='cad-next'){const index=Math.max(0,Math.min(S.steps.length-1,businessStageIndex()+(action==='cad-prev'?-1:1))),step=S.steps[index];businessStage=step.hostLocalId||step.hostStageId;rerender();return true}
 if(action==='cad-home'){cadInitialCamera();return true}if(action==='cad-fit'){cadFit();return true}if(action==='cad-minus'||action==='cad-plus'){cadZoom(action==='cad-plus'?1.2:1/1.2);return true}
 if(action==='cad-more-content'){cadReveal('sd');rerender();contentOpenPicker('sd|'+businessStageIndex(),null,app.querySelector('[data-act="cad-more-content"]'));return true}
 if(action==='cad-export'){const blob=new Blob([cadModel.exportCanvasSvg(cadProjection(false),cadRows(),cadTitle,cadStageWidths(),cadRowHeights())],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=(S.title||'Mapa do serviço').replace(/[^\p{L}\p{N} -]/gu,'')+'.svg';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true}
 if(action==='cad-duplicate'){
  if(cadLocked())return true;
  const entry=blueprintNote(data.id||cadState.selected);if(!entry)return true;
  const next=structuredClone(S),key=entry.key,original=next.c[key]?.find(note=>note.i===entry.note.i);
  if(!original||next.c[key].length>=100)return true;
  const copy=structuredClone(original);copy.i=uid();delete copy.hostItemId;delete copy.hostAction;delete copy.hostLocalId;delete copy.hostEntityId;
  next.c[key].splice(next.c[key].indexOf(original)+1,0,copy);
  try{window.BlueOceanJourneyContent.validateMatrixDocument(next);cadSend('canvas-change',{state:next},copy.i)}catch(error){cadNotice(error.message)}
  return true;
 }
 if(action==='cad-delete'||action==='cad-delete-link'||action==='cad-remove-edge'){
  if(cadLocked())return true;const next=structuredClone(S),id=data.id||cadState.selected;
  if(action==='cad-delete'){
    for(const key in next.c)next.c[key]=next.c[key].filter(note=>note.i!==id);
    next.links=(next.links||[]).filter(link=>link.a!==id&&link.b!==id);
    cadAskConfirmation({title:'Excluir cartão do mapa?',message:'O cartão e suas conexões serão removidos. Você pode utilizar Desfazer após a exclusão.',acceptLabel:'Excluir cartão',onAccept:()=>cadSend('canvas-change',{state:next})});
    return true;
   }
   next.links=(next.links||[]).filter(link=>link.id!==(data.id||cadState.link?.id));
   cadSend('canvas-change',{state:next});return true;
 }
 return true;
}
function cadWorld(event){const rect=app.querySelector('.cad-viewport').getBoundingClientRect(),cam=cadState.camera;return {x:(event.clientX-rect.left-cam.x)/cam.zoom,y:(event.clientY-rect.top-cam.y)/cam.zoom}}
function cadDropTarget(point){return {row:cadState.layout.rows.find(row=>point.y>=row.y&&point.y<=row.y+row.height),stage:cadState.layout.stages.find(stage=>point.x>=stage.x&&point.x<=stage.x+stage.width)}}
function cadHighlight(target,kind,existing=false){const valid=!!target.row&&!!target.stage&&(!kind||(existing?cadModel.canvasAcceptsRow(kind,target.row.id):cadModel.canvasAcceptsNewRow(kind,target.row.id)));app.querySelectorAll('.cad-cell').forEach(cell=>{const hit=cell.dataset.row===target.row?.id&&Number(cell.dataset.si)===target.stage?.index;cell.classList.toggle('is-target',hit&&valid);cell.classList.toggle('is-invalid',hit&&!valid)});return valid}
function cadBind(){
 app.addEventListener('submit',event=>{if(event.target.id==='cad-quick-form'){event.preventDefault();cadQuickSubmit(event.target)}else if(['cad-component-form','cad-link-form'].includes(event.target.id)){event.preventDefault();cadSubmit(event.target)}});
 app.addEventListener('input',event=>{
  const field=event.target,form=field.form;
  if(field.matches('[data-cad-search]')){cadState.query=field.value;const temp=document.createElement('div');temp.innerHTML=cadLibrary();app.querySelector('.cad-components-list').innerHTML=temp.querySelector('.cad-components-list').innerHTML;return}
  if(field.matches('[data-cad-inline-title]')){
     const draft=cadState.creating;if(!draft?.inline)return;
     draft.title=field.value.slice(0,240);draft.referenceId='';cadRefreshInlineSuggestions(field);return;
   }
   if(form?.id==='cad-quick-form'){Object.assign(cadState.quick,Object.fromEntries(new FormData(form)));if(cadState.creating)cadPaint();return}
  if(['cad-component-form','cad-link-form'].includes(form?.id)){const draft=cadCurrentDraft();if(draft)Object.assign(draft,cadFormData(form))}
 });
 app.addEventListener('change',event=>{
  const field=event.target;
  if(field.form?.id==='cad-quick-form'&&field.name==='emotionScore'){
    const checkbox=field.form.elements.emotionUnknown;if(checkbox)checkbox.checked=false;if(cadState.quick)cadState.quick.emotionUnknown=false;
   }
   if(field.matches('[data-cad-lane-name]')){
    if(cadLocked())return;
    const id=field.dataset.cadLaneName,lane=(S.lanes||[]).find(item=>item.id===id);
    if(!lane)return;const label=field.value.trim().slice(0,90)||'Nova faixa';
    if(lane.n!==label){lane.n=label;if(S.rowSettings?.[id])S.rowSettings[id].n=label;save();}
    rerender();return;
   }
   if(field.matches('[data-cad-connect-type]'))cadState.connectType=field.value;
  if(field.form?.id==='cad-quick-form'&&field.name==='referenceId'){const record=cadCatalog(cadState.quick.kind).find(value=>value.id===field.value);cadState.quick.referenceId=field.value;if(record){cadState.quick.title=record.title||record.name;field.form.elements.title.value=cadState.quick.title;cadPaint()}}
  if(field.matches('[data-cad-view]')){cadStash();cadState.quick=null;cadState.inspector=false;cadState.camera=null;if(field.value==='matrix')V.blueprintRenderer='matrix';else{V=window.BlueOceanJourneyViews.switchMatrixPerspective(V,field.value,rowDefs());V.blueprintRenderer='canvas'}saveView();rerender()}
  if(field.matches('[data-cad-persona]')){cadStash();cadState.quick=null;cadState.creating=null;cadState.inspector=false;announceSave('pending');field.disabled=true;if(HOSTED)window.parent.postMessage({boBlueprintHost:1,type:'persona-select',personaId:field.value},location.origin)}
  if(field.matches('[data-cad-stage]')){const step=S.steps[Number(field.value)];businessStage=step.hostLocalId||step.hostStageId;rerender()}
  if(field.matches('[data-cad-detail]')){cadState.detail=field.value;cadPaint()}
  if(field.matches('[data-cad-links]')){V.connectionMode=field.value;saveView();cadPaint()}
  if(field.form?.id==='cad-link-form')cadLinkFields();
 });
 app.addEventListener('dblclick',event=>{
  const node=event.target.closest?.('.cad-node');
  if(!cadEnabled()||!node||!blueprintNote(node.dataset.id)||cadLocked())return;
  event.preventDefault();cadSelect(node.dataset.id,{x:event.clientX,y:event.clientY},false);
 });
 app.addEventListener('contextmenu',event=>{
  if(!cadEnabled()||cadLocked())return;const node=event.target.closest?.('.cad-node'),edge=event.target.closest?.('.cad-edge'),stage=event.target.closest?.('.cad-stage');if(!node&&!edge&&!stage)return;if(node&&!blueprintNote(node.dataset.id))return;
  event.preventDefault();cadState.menu={id:node?.dataset.id,edgeId:edge?.dataset.id,index:stage?Number(stage.dataset.si):undefined,...cadQuickPosition({x:event.clientX,y:event.clientY})};rerender();requestAnimationFrame(()=>app.querySelector('.cad-context-menu button')?.focus());
 });
 app.addEventListener('cancel',event=>{if(event.target.id==='cad-library-sheet')cadState.library=false;if(event.target.id==='cad-inspector-sheet')cadState.inspector=false;if(event.target.id==='cad-link-sheet')cadState.link=null},true);
 app.addEventListener('keydown',event=>{
   if(event.target.matches?.('[data-cad-inline-title]')){
     if(event.key==='Enter'){event.preventDefault();cadSubmitInline(event.shiftKey);return}
     if(event.key==='Escape'){event.preventDefault();cadAction('cad-cancel',{});return}
     if(event.key==='ArrowDown'){const first=app.querySelector('[data-cad-inline-suggestions]:not([hidden]) [data-act="cad-inline-reuse"]');if(first){event.preventDefault();first.focus()}return}
   }
  if(cadState.confirmation){
    if(event.key==='Escape'){event.preventDefault();cadAction('cad-confirm-cancel',{});return}
    if(event.key==='Tab'){
      const actions=[...app.querySelectorAll('.cad-confirm-panel button')];
      if(actions.length){event.preventDefault();const i=actions.indexOf(document.activeElement),step=event.shiftKey?-1:1;actions[(i+step+actions.length)%actions.length].focus()}
      return;
    }
  }
  if(event.target.matches?.('.cad-library-tabs [role="tab"]')&&['ArrowLeft','ArrowRight'].includes(event.key)){
    event.preventDefault();cadAction('cad-sidebar-tab',{tab:event.target.dataset.tab==='components'?'lanes':'components'});return;
   }
   const cardHandle=event.target.closest?.('.cad-node-resize');
   if(cardHandle&&['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home'].includes(event.key)&&!cadLocked()){
     event.preventDefault();
     const id=cardHandle.dataset.id,entry=blueprintNote(id),node=cadState.layout.nodes.find(value=>value.id===id);
     if(!entry||!node)return;
     const next=structuredClone(S),note=next.c[entry.key].find(value=>value.i===id);
     if(!note)return;
     const stage=cadState.layout.stages.find(value=>value.index===node.stageIndex);
     const width=event.key==='Home'?null:cadModel.canvasDimension((note.canvas?.width||node.width)+(event.key==='ArrowRight'?16:event.key==='ArrowLeft'?-16:0),150,Math.min(600,stage?.width-28||600));
     const height=event.key==='Home'?null:cadModel.canvasDimension((note.canvas?.height||node.height)+(event.key==='ArrowDown'?16:event.key==='ArrowUp'?-16:0),80,480);
     note.canvas={...note.canvas,kind:cadModel.canvasKind(note,node.row),width,height};
     cadSend('canvas-change',{state:next},id);return;
   }
   const laneHandle=event.target.closest?.('.cad-lane-resize');
   if(laneHandle&&['ArrowUp','ArrowDown','Home'].includes(event.key)&&!cadLocked()){
    event.preventDefault();const id=laneHandle.dataset.id,actual=cadState.layout.rows.find(row=>row.id===id)?.height||90;
    cadChangeRowHeight(id,event.key==='Home'?null:actual+(event.key==='ArrowDown'?16:-16));return;
   }
   const grip=event.target.closest?.('.cad-stage-resize');
   if(grip&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
    event.preventDefault();const i=Number(grip.dataset.si),current=cadModel.canvasStageWidth(cadStageWidths()[i]);
    cadStageResizeTo(i,event.key==='Home'?392:event.key==='End'?600:current+(event.key==='ArrowRight'?24:-24));return;
   }
   const emotion=event.target.closest?.('.cad-emotion-control');
   if(emotion&&['ArrowUp','ArrowDown','Home','End'].includes(event.key)&&!cadLocked()){
    event.preventDefault();const i=Number(emotion.dataset.si),next=structuredClone(S),stage=next.steps[i];
    stage.e=event.key==='Home'?0:event.key==='End'?2:Math.max(-2,Math.min(2,cadModel.canvasEmotionScore(stage)+(event.key==='ArrowUp'?1:-1)));
    stage.emotionRecorded=true;stage.emotionStatus='hypothesis';stage.emotionSource='';cadSend('canvas-change',{state:next});return;
   }
   const button=event.target.closest?.('#cad-svg [role="button"]');if(button&&['Enter',' '].includes(event.key)){
      event.preventDefault();
      // Keyboard activation edits a card inline; pointer selection opens details.
      // Enter and Space must not rely on SVG click dispatch, which selects the inspector.
      if(button.matches('.cad-inline-expand')){cadSubmitInline(true)}else if(button.matches('.cad-node[data-act="cad-select"]')&&!cadLocked()){
        cadSelect(button.dataset.id,{},true);
      }else button.dispatchEvent(new MouseEvent('click',{bubbles:true}));
      return;
    }
  if(event.key==='Escape'&&cadEnabled()&&!event.target.closest('dialog')){event.preventDefault();cadState.drag=null;if(cadState.choosing){cadState.choosing=null;rerender()}else if(cadState.menu){cadState.menu=null;rerender()}else if(cadState.quick||cadState.connectFrom)cadAction('cad-cancel',{});return}
  if(event.target.matches('.cad-viewport')&&['+','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();if(event.key==='0')cadFit();else if(event.key==='+'||event.key==='-')cadZoom(event.key==='+'?1.2:1/1.2);else{const cam=cadState.camera;cam.x+=event.key==='ArrowLeft'?40:event.key==='ArrowRight'?-40:0;cam.y+=event.key==='ArrowUp'?40:event.key==='ArrowDown'?-40:0;cadPaint()}}
 });
 app.addEventListener('wheel',event=>{
  if(!event.target.closest?.('.cad-viewport'))return;event.preventDefault();const viewport=app.querySelector('.cad-viewport'),rect=viewport.getBoundingClientRect();
  if(event.ctrlKey||event.metaKey)cadZoom(event.deltaY<0?1.1:1/1.1,event.clientX-rect.left,event.clientY-rect.top);else{cadState.camera.x-=event.shiftKey?event.deltaY:event.deltaX;cadState.camera.y-=event.shiftKey?0:event.deltaY;cadPaint()}
 },{passive:false});
 app.addEventListener('pointerdown',event=>{
  const cardHandle=event.target.closest?.('.cad-node-resize');
   if(event.button===0&&cardHandle&&!cadLocked()){
     const id=cardHandle.dataset.id,node=cadState.layout.nodes.find(value=>value.id===id);
     if(node&&!node.note.virtualLabel&&!node.note.draft){
       cadState.cardResize={pointer:event.pointerId,id,startX:event.clientX,startY:event.clientY,width:node.width,height:node.height,zoom:cadState.camera.zoom,stageIndex:node.stageIndex};
       app.querySelector('.cad-viewport')?.setPointerCapture(event.pointerId);
       event.preventDefault();return;
     }
   }
   const laneHandle=event.target.closest?.('.cad-lane-resize');
   if(event.button===0&&laneHandle&&!cadLocked()){
    const id=laneHandle.dataset.id,viewport=app.querySelector('.cad-viewport'),row=cadState.layout.rows.find(r=>r.id===id);
    cadState.laneResize={pointer:event.pointerId,id,startY:event.clientY,height:row?.height||90,zoom:cadState.camera.zoom};
    viewport?.setPointerCapture(event.pointerId);event.preventDefault();return;
   }
   const grip=event.target.closest?.('.cad-stage-resize'),emotion=event.target.closest?.('.cad-emotion-control');
   if(event.button===0&&grip&&!cadLocked()){
    const i=Number(grip.dataset.si),viewport=app.querySelector('.cad-viewport');
    cadState.resize={pointer:event.pointerId,index:i,startX:event.clientX,width:cadModel.canvasStageWidth(cadStageWidths()[i]),zoom:cadState.camera.zoom};
    viewport?.setPointerCapture(event.pointerId);event.preventDefault();return;
   }
   if(event.button===0&&emotion&&!cadLocked()){
    const i=Number(emotion.dataset.si),stage=S.steps[i],viewport=app.querySelector('.cad-viewport');
    cadState.emotionDrag={pointer:event.pointerId,index:i,startY:event.clientY,moved:false,previous:{e:stage.e,emotionRecorded:stage.emotionRecorded,emotionStatus:stage.emotionStatus,emotionSource:stage.emotionSource}};
    viewport?.setPointerCapture(event.pointerId);return;
   }
   const viewport=event.target.closest?.('.cad-viewport');if(!viewport||event.target.closest('.cad-node-resize,.cad-lane-select,.cad-lane-resize,.cad-camera,.cad-port,.cad-node-menu,.cad-cell-add,.cad-stage-insert,.cad-stage')||event.button!==0&&event.button!==1)return;
  const node=event.target.closest('.cad-node');if(node&&(cadLocked()||cadState.connectFrom||!blueprintNote(node.dataset.id)))return;
  cadState.drag={pointer:event.pointerId,startX:event.clientX,startY:event.clientY,cam:{...cadState.camera},node:node?.dataset.id,moved:false};if(!event.target.closest('[data-act]'))viewport.setPointerCapture(event.pointerId);
 });
 app.addEventListener('pointermove',event=>{
  if(cadState.connectFrom&&event.target.closest?.('.cad-viewport')){cadState.pointer=cadWorld(event);const source=cadState.layout.nodes.find(node=>node.id===cadState.connectFrom);let preview=app.querySelector('.cad-connect-preview');if(source){if(!preview){preview=document.createElementNS('http://www.w3.org/2000/svg','path');preview.setAttribute('class','cad-connect-preview');app.querySelector('#cad-world')?.appendChild(preview)}preview.setAttribute('d','M '+(source.x+source.width)+' '+(source.y+source.height/2)+' L '+cadState.pointer.x+' '+cadState.pointer.y)}}
  const cardResize=cadState.cardResize;
   if(cardResize&&cardResize.pointer===event.pointerId){
     const stage=cadState.layout.stages.find(value=>value.index===cardResize.stageIndex);
     const width=cadModel.canvasDimension(cardResize.width+(event.clientX-cardResize.startX)/cardResize.zoom,150,Math.min(600,stage?.width-28||600));
     const height=cadModel.canvasDimension(cardResize.height+(event.clientY-cardResize.startY)/cardResize.zoom,80,480);
     cadState.cardResizePreview={id:cardResize.id,width,height};
     cadState.layout=cadModel.buildCanvasLayout(cadProjection(),cadRows(),null,cadStageWidths(),cadRowHeights());
     cadPaint();return;
   }
   const laneResize=cadState.laneResize;
   if(laneResize&&laneResize.pointer===event.pointerId){
    const min=cadModel.canvasRowHeight(cadProjection(false),cadRows().find(r=>r.id===laneResize.id),S.steps.map((_,i)=>i));
    const height=Math.max(min,Math.min(540,Math.round(laneResize.height+(event.clientY-laneResize.startY)/laneResize.zoom)));
    cadState.lanePreviewHeights={...cadRowHeights(),[laneResize.id]:height};
    cadState.layout=cadModel.buildCanvasLayout(cadProjection(),cadRows(),null,cadStageWidths(),cadRowHeights());
    cadPaint();return;
   }
   const resize=cadState.resize;if(resize&&resize.pointer===event.pointerId){
    const widths=[...cadStageWidths()];widths[resize.index]=cadModel.canvasStageWidth(resize.width+(event.clientX-resize.startX)/resize.zoom);
    cadState.resizePreview=widths;cadState.layout=cadModel.buildCanvasLayout(cadProjection(),cadRows(),null,widths,cadRowHeights());cadPaint();return;
   }
   const emotionDrag=cadState.emotionDrag;if(emotionDrag&&emotionDrag.pointer===event.pointerId){
    const row=cadState.layout.rows.find(value=>value.id==='em');if(!row)return;
    const score=Math.max(-2,Math.min(2,Math.round((row.y+56-cadWorld(event).y)/16)));
    if(Math.abs(event.clientY-emotionDrag.startY)>4)emotionDrag.moved=true;
    if(emotionDrag.moved){S.steps[emotionDrag.index].e=score;S.steps[emotionDrag.index].emotionRecorded=true;cadPaint()}
    return;
   }
   const drag=cadState.drag;if(!drag||drag.pointer!==event.pointerId)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.hypot(dx,dy)<6&&!drag.moved)return;drag.moved=true;app.querySelector('.cad-viewport').setPointerCapture(event.pointerId);
  if(!drag.node){cadState.camera={...drag.cam,x:drag.cam.x+dx,y:drag.cam.y+dy};cadPaint();return}
  const node=cadState.layout.nodes.find(node=>node.id===drag.node),element=app.querySelector('[data-group-id="'+CSS.escape(drag.node)+'"]');element?.setAttribute('transform','translate('+(node.x+dx/drag.cam.zoom)+' '+(node.y+dy/drag.cam.zoom)+')');element?.classList.add('is-dragging');cadHighlight(cadDropTarget(cadWorld(event)),cadModel.canvasKind(node.note,node.row),true);
 });
 const end=(event,cancel=false)=>{
   const cardResize=cadState.cardResize;
   if(cardResize&&cardResize.pointer===event.pointerId){
     const preview=cadState.cardResizePreview;
     cadState.cardResize=null;cadState.cardResizePreview=null;
     if(cancel||!preview||preview.width===cardResize.width&&preview.height===cardResize.height){
       cadState.layout=cadModel.buildCanvasLayout(cadProjection(),cadRows(),null,cadStageWidths(),cadRowHeights());cadPaint();return;
     }
     const entry=blueprintNote(cardResize.id);
     if(!entry){cadPaint();return}
     const next=structuredClone(S),note=next.c[entry.key]?.find(value=>value.i===cardResize.id);
     if(!note){cadPaint();return}
     note.canvas={...note.canvas,kind:cadModel.canvasKind(note,entry.key.split('|')[0]),width:preview.width,height:preview.height};
     cadState.ignoreClick=true;setTimeout(()=>cadState.ignoreClick=false,180);
     cadSend('canvas-change',{state:next},cardResize.id);return;
   }
   const laneResize=cadState.laneResize;
   if(laneResize&&laneResize.pointer===event.pointerId){
    cadState.laneResize=null;const height=cadState.lanePreviewHeights?.[laneResize.id]??laneResize.height;cadState.lanePreviewHeights=null;
    if(cancel){cadState.layout=cadModel.buildCanvasLayout(cadProjection(),cadRows(),null,cadStageWidths(),cadRowHeights());cadPaint()}
    else cadChangeRowHeight(laneResize.id,height);
    return;
   }
   const resize=cadState.resize;if(resize&&resize.pointer===event.pointerId){
    cadState.resize=null;const width=cadState.resizePreview?.[resize.index]??resize.width;cadState.resizePreview=null;
    if(cancel){cadState.layout=cadModel.buildCanvasLayout(cadProjection(),cadRows(),null,cadStageWidths(),cadRowHeights());cadPaint()}
    else cadStageResizeTo(resize.index,width);return;
   }
   const emotionDrag=cadState.emotionDrag;if(emotionDrag&&emotionDrag.pointer===event.pointerId){
    cadState.emotionDrag=null;const stage=S.steps[emotionDrag.index];
    if(cancel||!emotionDrag.moved){Object.assign(stage,emotionDrag.previous);cadPaint();return}
    const next=structuredClone(S);Object.assign(next.steps[emotionDrag.index],{emotionRecorded:true,emotionStatus:'hypothesis',emotionSource:''});
    Object.assign(stage,emotionDrag.previous);cadState.ignoreClick=true;setTimeout(()=>cadState.ignoreClick=false,200);
    cadSend('canvas-change',{state:next});return;
   }
  const drag=cadState.drag;if(!drag||drag.pointer!==event.pointerId)return;cadState.drag=null;if(!drag.moved)return;cadState.ignoreClick=true;setTimeout(()=>cadState.ignoreClick=false,150);
  if(cancel||!drag.node){cadPaint();return}try{
    const point=cadWorld(event),target=cadDropTarget(point);
    if(!target.row||!target.stage){cadPaint();cadNotice('Solte dentro de uma etapa e de uma faixa.');return}
    const source=blueprintNote(drag.node),kind=source&&cadModel.canvasKind(source.note,source.key.split('|')[0]);
    const converted=(kind==='customer-action'&&target.row.id!=='ac'||kind==='activity'&&target.row.id==='ac')&&source?.key.split('|')[0]!==target.row.id;
    const step=target.stage.step,before=cadState.layout.nodes.find(node=>!node.note.virtualLabel&&!node.note.draft&&node.id!==drag.node&&node.row===target.row.id&&node.stageIndex===target.stage.index&&point.y<node.y+node.height/2);
    const next=cadModel.moveCanvasCard(S,drag.node,{stageId:step.hostStageId,stageLocalId:step.hostLocalId,row:target.row.id,beforeId:before?.id});
    const commit=()=>cadSend('canvas-change',{state:next},drag.node);
    if(converted){
      cadAskConfirmation({title:'Converter componente?',message:'Mover este cartão altera a classificação entre Ações do cliente e Atividade operacional. Confirmar a conversão?',acceptLabel:'Converter e mover',onAccept:commit});
      return;
    }
    commit();
   }catch(error){cadState.error=error.message;rerender()}
 };
 app.addEventListener('pointerup',event=>end(event));app.addEventListener('pointercancel',event=>end(event,true));
 app.addEventListener('dragstart',event=>{const grip=event.target.closest?.('.cad-lane-grip');if(grip&&!cadLocked()){const row=grip.closest('.cad-lane-item')?.dataset.row;if(row){cadState.laneDragId=row;event.dataTransfer.setData('application/x-blue-ocean-lane',row);event.dataTransfer.effectAllowed='move';return}}
 const item=event.target.closest?.('[data-act="cad-add"]');if(!item||cadLocked())return;cadState.libraryKind=item.dataset.kind;event.dataTransfer.setData('application/x-blue-ocean-component',item.dataset.kind);event.dataTransfer.effectAllowed='copy';getSelection()?.removeAllRanges()});
 app.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('application/x-blue-ocean-lane')){const row=event.target.closest?.('.cad-lane-item');if(row){event.preventDefault();event.dataTransfer.dropEffect='move';app.querySelectorAll('.cad-lane-item').forEach(el=>el.classList.toggle('is-drag-over',el===row));}return}if(!event.target.closest?.('.cad-viewport')||!event.dataTransfer.types.includes('application/x-blue-ocean-component'))return;event.preventDefault();const target=cadDropTarget(cadWorld(event));event.dataTransfer.dropEffect=cadHighlight(target,cadState.libraryKind)?'copy':'none'});
 app.addEventListener('drop',event=>{const laneId=event.dataTransfer.getData('application/x-blue-ocean-lane');if(laneId){event.preventDefault();const targetId=event.target.closest?.('.cad-lane-item')?.dataset.row;cadState.laneDragId='';if(targetId&&targetId!==laneId&&!cadLocked()){const order=orderedRows().map(row=>row.id),from=order.indexOf(laneId),to=order.indexOf(targetId);if(from>=0&&to>=0){order.splice(from,1);order.splice(to,0,laneId);V.rowOrder=order;V.preset='custom';saveView();rerender()}}return}const kind=event.dataTransfer.getData('application/x-blue-ocean-component');if(!kind||!event.target.closest?.('.cad-viewport'))return;event.preventDefault();const target=cadDropTarget(cadWorld(event));if(!target.row||!target.stage){cadNotice('Solte em uma célula do mapa.');return}if(!cadModel.canvasAcceptsNewRow(kind,target.row.id)){cadNotice(cadModel.canvasPlacementHint(kind,target.row.id));return}cadStartQuick(kind,target.stage.index,target.row.id,{x:event.clientX+12,y:event.clientY+12},!cadMobile())});
 app.addEventListener('dragend',()=>{cadState.laneDragId='';app.querySelectorAll('.cad-lane-item').forEach(item=>item.classList.remove('is-drag-over'));cadState.libraryKind='';app.querySelectorAll('.cad-cell').forEach(cell=>cell.classList.remove('is-target','is-invalid'));getSelection()?.removeAllRanges()});
 let wasMobile=cadMobile();window.addEventListener('resize',()=>{if(!cadEnabled())return;if(wasMobile!==cadMobile()){wasMobile=cadMobile();rerender()}else if(!cadState.quick&&!cadState.inspector)cadPaint()});
}

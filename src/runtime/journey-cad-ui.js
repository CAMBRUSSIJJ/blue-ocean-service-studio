/* Operational canvas is a projection of the shared Journey document, never a second store. */
const cadModel=window.BlueOceanBlueprintCanvas;
const cadState={scene:'',selected:'',creating:null,link:null,drafts:new Map(),camera:null,layout:null,pending:'',error:'',library:false,inspector:false,detail:'auto',drag:null,ignoreClick:false};
const cadColors={ev:'#90a6bf',ac:'#60b9ee',fl:'#5bd4bf',bk:'#f3bd68',sy:'#bc9aed'};
const cadLinkColors={sequence:'#87b6ff',dependency:'#f3bd68',uses:'#bc9aed',handoff:'#5bd4bf'};
function cadEnabled(){return V?.perspective==='blueprint'&&V.blueprintRenderer!=='matrix'}
function cadMobile(){return matchMedia('(max-width:760px)').matches}
function cadRows(){return orderedRows().filter(row=>!V.hiddenRows.includes(row.id))}
function cadCellNotes(row,index){
 const notes=[...(S.c[row+'|'+index]||[])],step=S.steps[index];if(!step)return notes;
 const summary=(id,title,label)=>notes.push({i:'@'+id+':'+index,t:title,type:'text',virtualLabel:label});
 if(row==='sd'&&step.d?.trim())summary('context',step.d,'Contexto da etapa');
 if(row==='em'&&growthEmotionKnown(step))summary('emotion',(EM[step.e+2]||'Emoção registrada')+(step.emotionSource?' · '+step.emotionSource:''),'Emoção · editar na matriz');
 if(row==='im')S.iss.filter(issue=>issue.s===index&&issue.x.trim()).forEach((issue,i)=>summary('issue'+i,issue.x,issue.t==='d'?'Dor · editar na matriz':'Ideia · editar na matriz'));
 return notes;
}
function cadProjection(){const doc={...S,c:{...S.c}};for(const row of cadRows())S.steps.forEach((_,index)=>{doc.c[row.id+'|'+index]=cadCellNotes(row.id,index)});return doc}
function cadTitle(note){return note.t||pickerReference(note)?.title||pickerReference(note)?.name||contentTypes[note.type]?.[1]||'Componente'}
function cadButton(action,label,attrs=''){return '<button type="button" data-act="'+action+'" '+attrs+'>'+label+'</button>'}
function cadLocked(){return !!S.readOnly||!!cadState.pending}
function cadStageKey(step){return step.hostStageId||step.hostLocalId}
function cadStageOptions(index){return S.steps.map((step,i)=>'<option value="'+esc(cadStageKey(step))+'" '+(i===index?'selected':'')+'>'+esc(step.n)+'</option>').join('')}
function cadCatalog(kind){if(kind==='metric')return S.availableMetrics||[];if(kind==='system'||kind==='resource')return (S.operationalResources||[]).filter(item=>item.kind===kind);return S.serviceElements?.[kind]||[]}
function cadOptions(items,value,empty='Nenhum'){return '<option value="">'+empty+'</option>'+items.map(item=>'<option value="'+esc(item.id)+'" '+(item.id===value?'selected':'')+'>'+esc(item.title||item.name||item.id)+'</option>').join('')}
function cadLibrary(){return '<h2>Componentes</h2><p>Adicione um componente ou arraste para uma etapa.</p><div class="cad-components">'+Object.entries(cadModel.CANVAS_COMPONENTS).map(([kind,item])=>cadButton('cad-add','<span aria-hidden="true">'+item.icon+'</span><b>'+item.title+'</b><small>'+item.hint+'</small>','data-kind="'+kind+'" draggable="'+!cadLocked()+'" '+(cadLocked()?'disabled':''))).join('')+'</div><hr>'+cadButton('cad-link','↔ Criar conexão',cadLocked()?'disabled':'')+'<p>Sequência · Dependência · Recurso · Passagem entre equipes</p><h3>Conexões salvas</h3><div class="cad-link-list">'+(S.links||[]).map((link,index)=>cadButton('cad-edge',esc(blueprintConnectionNames[link.type])+' '+(index+1),'data-id="'+esc(link.id)+'"')).join('')+'</div>'}
function cadFormData(form){const data=new FormData(form);return {...Object.fromEntries(data),resourceRefs:data.getAll('resourceRefs')}}
function cadCurrentDraft(){if(cadState.creating)return cadState.creating;if(cadState.link)return cadState.link;return cadState.drafts.get(cadState.selected)}
function cadField(name,label,value='',type='text',extra=''){return '<label>'+label+'<input name="'+name+'" type="'+type+'" value="'+esc(value??'')+'" '+extra+'></label>'}
function cadInspector(){
 const entry=blueprintNote(cadState.selected),isNew=!!cadState.creating;
 if(cadState.link)return cadLinkForm();
 if(!isNew&&!entry)return '<div class="cad-empty"><span aria-hidden="true">⬡</span><h2>Inspecione seu serviço</h2><p>Selecione um componente ou uma conexão para editar o combinado da operação.</p>'+cadButton('cad-library','+ Adicionar componente',cadLocked()?'disabled':'')+'</div>';
 const draft=cadCurrentDraft(),row=entry?.key.split('|')[0]||draft.row,kind=draft.kind,component=cadModel.CANVAS_COMPONENTS[kind];
 if(!isNew&&(!['card','text','metric'].includes(entry.note.type)||entry.note.type==='metric'&&!entry.note.canvas))return '<h2>'+esc(cadTitle(entry.note))+'</h2><p>Este conteúdo está vinculado à Jornada. Edite-o na matriz para manter seus campos específicos.</p>'+cadButton('cad-matrix','Abrir matriz')+cadButton('cad-close','Fechar propriedades');
 const allowed=component.rows.includes(row)?component.rows:[...component.rows,row];
 const resourceRefs=[...new Set([...(S.operationalResources||[]).map(item=>item.ref),...(draft.resourceRefs||[])])];
 return '<form id="cad-component-form"><h2>'+(isNew?'Adicionar '+component.title:'Propriedades')+'</h2><p class="cad-kind">'+component.title+'</p>'+cadField('title','Nome do componente',draft.title,'text','required maxlength="240"')+
 '<label>Descrição<textarea name="description" maxlength="1000">'+esc(draft.description||'')+'</textarea></label><label>Etapa<select name="stageKey" required>'+cadStageOptions(S.steps.findIndex(step=>cadStageKey(step)===draft.stageKey))+'</select></label><label>Faixa<select name="row">'+allowed.map(id=>'<option value="'+id+'" '+(id===draft.row?'selected':'')+'>'+esc(rowDefs().find(item=>item.id===id)?.n||id)+'</option>').join('')+'</select></label>'+
 (isNew&&['system','resource','metric'].includes(kind)?'<label>Usar registro do serviço<select name="referenceId">'+cadOptions(cadCatalog(kind),draft.referenceId,'Criar novo registro')+'</select></label><p>Ao reutilizar, o nome e os dados do registro existente são mantidos.</p>':'')+
 '<div class="cad-field-grid">'+cadField('owner','Responsável',draft.owner,'text','maxlength="160"')+cadField('team','Equipe',draft.team,'text','maxlength="160"')+'</div><label>Canal<select name="channelId">'+cadOptions(cadCatalog('channel'),draft.channelId)+'</select></label><div class="cad-field-grid">'+[['durationMinutes','Execução (min)'],['waitMinutes','Espera (min)'],['targetMinutes','Prazo (min)']].map(([name,label])=>cadField(name,label,draft[name],'number','min="0" max="525600" step="any"')).join('')+'</div><fieldset><legend>Recursos vinculados</legend>'+(resourceRefs.length?resourceRefs.map(ref=>'<label class="cad-check"><input type="checkbox" name="resourceRefs" value="'+esc(ref)+'" '+(draft.resourceRefs?.includes(ref)?'checked':'')+'>'+esc(blueprintResourceName(ref))+'</label>').join(''):'<p>Cadastre um sistema ou recurso na biblioteca.</p>')+'</fieldset>'+cadField('resourceNotes','Outros recursos',draft.resourceNotes,'text','maxlength="400"')+'<label>Regra ou condição<textarea name="rule" maxlength="1000">'+esc(draft.rule||'')+'</textarea></label><label>Indicador vinculado<select name="metricId">'+cadOptions(cadCatalog('metric'),draft.metricId)+'</select></label><p class="form-error" role="alert">'+esc(cadState.error)+'</p><footer>'+cadButton('cad-cancel','Cancelar')+'<button type="submit" '+(cadLocked()?'disabled':'')+'>'+(isNew?'Adicionar ao Blueprint':'Salvar componente')+'</button></footer>'+(!isNew?cadButton('cad-delete','Remover do mapa',cadLocked()?'disabled':''):'')+'</form>';
}
function cadLinkForm(){
 const draft=cadState.link,options=value=>'<option value="">Escolha um componente</option>'+blueprintNotes().map(entry=>'<option value="'+esc(entry.note.i)+'" '+(value===entry.note.i?'selected':'')+'>'+esc(blueprintCaption(entry))+'</option>').join('');
 return '<form id="cad-link-form"><h2>'+(draft.id?'Editar conexão':'Criar conexão')+'</h2><p>Escolha origem e destino aqui ou selecione dois componentes no canvas.</p><label>Origem<select name="a" required>'+options(draft.a)+'</select></label><label>Destino<select name="b" required>'+options(draft.b)+'</select></label><label>Relação<select name="type">'+Object.entries(blueprintConnectionNames).map(([id,name])=>'<option value="'+id+'" '+(id===draft.type?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+cadField('label','Descrição da conexão',draft.label,'text','maxlength="160"')+'<fieldset data-cad-handoff><legend>Passagem entre equipes</legend>'+cadField('fromTeam','Equipe de origem',draft.fromTeam,'text','maxlength="160"')+cadField('toTeam','Equipe de destino',draft.toTeam,'text','maxlength="160"')+cadField('deliverable','O que será transferido',draft.deliverable,'text','maxlength="400"')+cadField('deadlineMinutes','Prazo da transferência (min)',draft.deadlineMinutes,'number','min="0" max="525600" step="any"')+'<label>Condição de aceite<textarea name="acceptance" maxlength="1000">'+esc(draft.acceptance||'')+'</textarea></label></fieldset><p class="form-error" role="alert">'+esc(cadState.error)+'</p><footer>'+cadButton('cad-cancel','Cancelar')+'<button type="submit" '+(cadLocked()?'disabled':'')+'>Salvar conexão</button></footer>'+(draft.id?cadButton('cad-delete-link','Remover conexão',cadLocked()?'disabled':''):'')+'</form>';
}
function cadLinkFields(){const form=app.querySelector('#cad-link-form');if(!form)return;const handoff=form.elements.type.value==='handoff',field=form.querySelector('[data-cad-handoff]');field.hidden=!handoff;field.disabled=!handoff;for(const name of ['fromTeam','toTeam','deliverable'])form.elements[name].required=handoff}
function cadCardDetails(note){const a=note.activity||{};return [a.owner||a.team||'Responsável a definir',a.durationMinutes!=null?a.durationMinutes+' min de execução':'',a.waitMinutes!=null?a.waitMinutes+' min de espera':''].filter(Boolean).join(' · ')}
const cadBoundary=(row,index,rows)=>cadModel.canvasBoundary(row,index,rows);
function cadSvg(){
 const layout=cadState.layout,cam=cadState.camera||{x:12,y:12,zoom:1},small=cadState.detail==='overview'||cadState.detail==='auto'&&cam.zoom<0.7;
 let html='<defs>'+Object.entries(cadLinkColors).map(([type,color])=>'<marker id="cad-arrow-'+type+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="'+color+'"/></marker>').join('')+'</defs><g id="cad-world" transform="translate('+cam.x+' '+cam.y+') scale('+cam.zoom+')"><text x="18" y="36" class="cad-map-label">MAPA DO SERVIÇO</text>';
 for(const stage of layout.stages)html+='<g role="button" tabindex="0" data-act="cad-stage-edit" data-si="'+stage.index+'" aria-label="Editar etapa '+esc(stage.step.n)+'"><rect x="'+stage.x+'" y="10" width="'+(stage.width-5)+'" height="70" rx="8" class="cad-stage-bg"/><text x="'+(stage.x+16)+'" y="34" class="cad-subtitle">ETAPA '+(stage.index+1)+'</text><text x="'+(stage.x+16)+'" y="60" class="cad-stage-name">'+esc(stage.step.n.slice(0,35))+'</text><title>'+esc(stage.step.n)+'</title></g>';
 layout.rows.forEach((row,index)=>{
  const boundary=cadBoundary(row,index,layout.rows),color=cadColors[row.id]||'#87b6ff';
  html+='<rect x="0" y="'+row.y+'" width="'+layout.width+'" height="'+row.height+'" class="cad-lane-bg"/><path d="M 0 '+row.y+' V '+(row.y+row.height)+'" stroke="'+color+'" stroke-width="4"/><text x="16" y="'+(row.y+29)+'" class="cad-lane-name">'+esc(row.n.slice(0,23))+'</text><title>'+esc(row.n+' · '+(row.h||''))+'</title>';
  if(boundary)html+='<path d="M0 '+(row.y-14)+' H'+layout.width+'" class="cad-boundary"/><text x="'+(layout.width/2)+'" y="'+(row.y-18)+'" text-anchor="middle" class="cad-boundary-name">'+esc(boundary)+'</text>';
  for(const stage of layout.stages)html+='<rect x="'+stage.x+'" y="'+row.y+'" width="'+stage.width+'" height="'+row.height+'" fill="transparent" stroke="#293f56" class="cad-cell" data-row="'+row.id+'" data-si="'+stage.index+'"/>';
 });
 const byId=new Map(layout.nodes.map(node=>[node.id,node])),offsets=cadModel.canvasConnectionOffsets(S.links||[]);
 for(const link of S.links||[]){const a=byId.get(link.a),b=byId.get(link.b);if(!a||!b||V.connectionMode==='off'||V.connectionMode==='selected'&&![link.a,link.b].includes(cadState.selected))continue;const e=cadModel.canvasEdgeGeometry(a,b,offsets.get(link.id)||0),color=cadLinkColors[link.type],name=blueprintConnectionNames[link.type]+(link.label?' · '+link.label:'');
  html+='<g role="button" tabindex="0" data-act="cad-edge" data-id="'+esc(link.id)+'" aria-label="Editar '+esc(name)+'" class="cad-edge"><title>'+esc(name+(link.handoff?' · '+link.handoff.fromTeam+' → '+link.handoff.toTeam+' · '+link.handoff.deliverable+' · Aceite: '+link.handoff.acceptance:''))+'</title><path d="'+e.d+'" stroke="'+color+'" stroke-width="2" fill="none" marker-end="url(#cad-arrow-'+link.type+')"/><path d="'+e.d+'" stroke="transparent" stroke-width="16" fill="none"/><text x="'+e.x+'" y="'+(e.y-6)+'" text-anchor="middle" fill="'+color+'" class="cad-edge-label">'+esc(name.slice(0,36))+'</text></g>';
 }
 for(const node of layout.nodes){const kind=cadModel.canvasKind(node.note,node.row),color=cadColors[node.row]||'#87b6ff',title=cadTitle(node.note),selected=node.id===cadState.selected,font=small?Math.min(24,Math.max(16,12/cam.zoom)):15,limit=small?22:34;
  html+='<g class="cad-node'+(selected?' is-selected':'')+'" transform="translate('+node.x+' '+node.y+')" data-act="'+(node.note.virtualLabel?'cad-matrix':'cad-select')+'" data-id="'+esc(node.id)+'" role="button" tabindex="0" aria-label="'+esc(title)+'"><title>'+esc(title+' · '+cadCardDetails(node.note))+'</title><rect width="'+node.width+'" height="'+node.height+'" rx="9" class="cad-node-bg"/><path d="M2 10V102" stroke="'+color+'" stroke-width="4"/><text x="14" y="22" class="cad-subtitle">'+esc(node.note.virtualLabel||cadModel.CANVAS_COMPONENTS[kind]?.title||kind)+'</text>'+cadModel.canvasTitleLines(title,limit).map((line,index)=>'<text x="14" y="'+(50+index*(small?29:20))+'" class="cad-node-title" style="font-size:'+font+'px">'+esc(line)+'</text>').join('')+(!small?'<text x="14" y="96" class="cad-node-meta">'+esc(cadCardDetails(node.note).slice(0,45))+'</text>':'')+'</g>';
 }
 return html+'</g>';
}
function cadMobileMap(){
 const index=businessStageIndex(),step=S.steps[index];if(!step)return '<p>Adicione a primeira etapa para começar.</p>';businessStage=step.hostLocalId||step.hostStageId;
 return '<nav class="cad-stage-nav" aria-label="Navegar entre etapas">'+cadButton('cad-prev','‹','aria-label="Etapa anterior" '+(!index?'disabled':''))+'<label>Etapa '+(index+1)+' de '+S.steps.length+'<select data-cad-stage aria-label="Etapa em foco">'+S.steps.map((value,i)=>'<option value="'+i+'" '+(i===index?'selected':'')+'>'+esc(value.n)+'</option>').join('')+'</select></label>'+cadButton('cad-next','›','aria-label="Próxima etapa" '+(index===S.steps.length-1?'disabled':''))+'</nav><h2>'+esc(step.n)+'</h2>'+cadButton('cad-stage-edit','Editar etapa','data-si="'+index+'"')+cadRows().map((row,i,rows)=>'<section class="cad-mobile-lane" data-row="'+row.id+'">'+(cadBoundary(row,i,rows)?'<p class="cad-mobile-boundary">'+cadBoundary(row,i,rows)+'</p>':'')+'<h3>'+esc(row.n)+'</h3><p>'+esc(row.h||'')+'</p>'+cadCellNotes(row.id,index).map(note=>cadButton(note.virtualLabel?'cad-matrix':'cad-select','<small>'+esc(note.virtualLabel||cadModel.CANVAS_COMPONENTS[cadModel.canvasKind(note,row.id)].title)+'</small><b>'+esc(cadTitle(note))+'</b><span>'+esc(cadCardDetails(note))+'</span>','data-id="'+esc(note.i)+'" class="cad-mobile-card"')).join('')+cadButton('cad-library','+ Adicionar componente',cadLocked()?'disabled':'')+'</section>').join('');
}
function cadRender(){
 const scene=S.journeyId||S.id;if(cadState.scene!==scene){Object.assign(cadState,{scene,selected:'',creating:null,link:null,camera:null,drafts:new Map(),inspector:false,error:''})}
 document.body.classList.add('cad-mode');cadState.layout=cadModel.buildCanvasLayout(cadProjection(),cadRows());
 if(cadState.selected&&!blueprintNote(cadState.selected)){cadState.selected='';cadState.inspector=false}
 const mobile=cadMobile(),inspector=cadInspector(),library=cadLibrary();
 app.innerHTML='<div class="cad-shell"><header class="cad-header">'+cadButton('back','← Voltar','aria-label="Voltar para Jornadas e Blueprints"')+'<input data-f="title" aria-label="Nome da jornada" value="'+esc(S.title||'')+'"><span class="map-perspective-label">Blueprint</span><span role="status" data-save-status>'+saveLabel+'</span><nav aria-label="Perspectiva do mapa">'+cadButton('map-perspective','Jornada','data-preset="essential" aria-pressed="false"')+cadButton('map-perspective','Blueprint','data-preset="operational" aria-pressed="true"')+cadButton('cad-matrix','Matriz')+'</nav></header><div class="cad-toolbar">'+cadButton('cad-library','+ Componente',cadLocked()?'disabled':'')+cadButton('step','+ Etapa','aria-label="Adicionar etapa" '+(cadLocked()?'disabled':''))+cadButton('undo','↶','aria-label="Desfazer" '+(!(HOSTED?H.canUndo:U.length)||cadLocked()?'disabled':''))+cadButton('redo','↷','aria-label="Refazer" '+(!(HOSTED?H.canRedo:R.length)||cadLocked()?'disabled':''))+cadButton('business-review','Revisar operação')+cadButton('customize','Faixas','aria-label="Personalizar visualização"')+cadButton('cad-export','Exportar SVG')+cadButton('business-storage','Dados e backup')+'<label>Conexões<select data-cad-links aria-label="Exibir conexões">'+[['all','Todas'],['selected','Da seleção'],['off','Ocultar']].map(([id,name])=>'<option value="'+id+'" '+(id===V.connectionMode?'selected':'')+'>'+name+'</option>').join('')+'</select></label>'+(!mobile?'<label>Detalhes<select data-cad-detail aria-label="Nível de detalhe">'+[['auto','Automático'],['overview','Visão geral'],['detail','Completo']].map(([id,name])=>'<option value="'+id+'" '+(id===cadState.detail?'selected':'')+'>'+name+'</option>').join('')+'</select></label>':'')+'</div><div class="cad-workspace"><aside class="cad-library" aria-label="Biblioteca de componentes">'+library+'</aside><main class="cad-main" aria-label="Canvas operacional do Blueprint">'+(mobile?'<div class="cad-mobile-map">'+cadMobileMap()+'</div>':'<div class="cad-viewport" tabindex="0" aria-label="Canvas: arraste o fundo para mover e use a roda para ampliar"><svg id="cad-svg" aria-label="Etapas e componentes do serviço">'+cadSvg()+'</svg>'+(!S.steps.length?'<div class="cad-start"><h2>Construa a operação do seu serviço</h2><p>Comece com uma etapa; depois adicione os componentes de atendimento e bastidores.</p>'+cadButton('step','Adicionar etapa',cadLocked()?'disabled':'')+'</div>':'')+'<div class="cad-camera">'+cadButton('cad-minus','−','aria-label="Diminuir canvas"')+cadButton('cad-fit','Ajustar')+'<output data-cad-zoom></output>'+cadButton('cad-plus','+','aria-label="Ampliar canvas"')+'</div></div>')+'</main><aside class="cad-inspector" aria-label="Propriedades do componente">'+inspector+'</aside></div><footer class="cad-footer"><span>'+cadState.layout.nodes.length+' componentes · '+(S.links||[]).length+' conexões · '+S.steps.length+' etapas</span><span role="status" data-cad-status>'+esc(cadState.error||(cadState.pending?'Salvando…':S.readOnly?'Somente leitura':'Selecione para inspecionar · Arraste para mover'))+'</span><span>● Linha de frente　● Bastidores　● Apoio</span></footer></div>'+
 (mobile?'<dialog id="cad-library-sheet" class="cad-sheet" aria-label="Biblioteca de componentes">'+cadButton('cad-close-library','Fechar biblioteca')+library+'</dialog><dialog id="cad-inspector-sheet" class="cad-sheet" aria-label="Propriedades do componente">'+cadButton('cad-close','Fechar propriedades')+inspector+'</dialog>':'')+customizer()+growthDialogs()+contentDialogs()+contextDialogs()+viewsDialogs()+cardToolsDialogs()+blueprintDialogs()+businessDialogs();
 // Only one active form/library at a time; desktop copies are absent on small screens.
 if(mobile){app.querySelector('.cad-library').replaceChildren();app.querySelector('.cad-inspector').replaceChildren();if(cadState.library)app.querySelector('#cad-library-sheet').showModal();else if(cadState.inspector)app.querySelector('#cad-inspector-sheet').showModal()}
 if(cadLocked()){app.querySelector('.cad-header>input').readOnly=true;app.querySelectorAll('#cad-component-form input,#cad-component-form select,#cad-component-form textarea,#cad-link-form input,#cad-link-form select,#cad-link-form textarea').forEach(field=>field.disabled=true)}
 cadLinkFields();requestAnimationFrame(()=>{if(!cadState.camera)cadFit();else cadPaint()});
}
function cadPaint(){const svg=app.querySelector('#cad-svg');if(svg)svg.innerHTML=cadSvg();const out=app.querySelector('[data-cad-zoom]');if(out)out.value=Math.round((cadState.camera?.zoom||1)*100)+'%'}
function cadFit(){const viewport=app.querySelector('.cad-viewport');if(!viewport)return;const l=cadState.layout,zoom=Math.max(.18,Math.min(1,(viewport.clientWidth-32)/l.width,(viewport.clientHeight-50)/l.height));cadState.camera={x:16,y:16,zoom};cadPaint()}
function cadZoom(factor,x,y){const viewport=app.querySelector('.cad-viewport');if(!viewport)return;const cam=cadState.camera||{x:16,y:16,zoom:1},next=Math.max(.18,Math.min(2.4,cam.zoom*factor));x??=viewport.clientWidth/2;y??=viewport.clientHeight/2;cadState.camera={x:x-(x-cam.x)*next/cam.zoom,y:y-(y-cam.y)*next/cam.zoom,zoom:next};cadPaint()}
function cadOpenInspector(){cadState.inspector=true;cadState.library=false;rerender();requestAnimationFrame(()=>app.querySelector('#cad-component-form input,#cad-link-form select')?.focus())}
function cadSelect(id){
 if(cadState.ignoreClick){cadState.ignoreClick=false;return}const entry=blueprintNote(id);if(!entry)return;
 if(cadState.link){const field=cadState.link.a?'b':'a';cadState.link[field]=id;const form=app.querySelector('#cad-link-form');if(form){form.elements[field].value=id;const team=field==='a'?'fromTeam':'toTeam';if(!form.elements[team].value){cadState.link[team]=entry.note.activity?.team||'';form.elements[team].value=cadState.link[team]}}cadState.selected=id;cadPaint();return}
 cadState.creating=null;cadState.selected=id;cadState.error='';const [row,index]=entry.key.split('|');
 if(!cadState.drafts.has(id))cadState.drafts.set(id,{...blueprintActivity(entry.note,row),kind:cadModel.canvasKind(entry.note,row),channelId:entry.note.canonicalChannelId||'',metricId:entry.note.canonicalMetricId||'',...entry.note.canvas,title:cadTitle(entry.note),description:entry.note.canvas?.description||entry.note.canonicalDescription||'',row,stageKey:cadStageKey(S.steps[index])});
 cadOpenInspector();
}
function cadOpenLink(id='',source=''){
 const link=(S.links||[]).find(value=>value.id===id);cadState.creating=null;cadState.link={...link,...link?.handoff,type:link?.type||'sequence',a:link?.a||source||'',b:link?.b||''};cadState.error='';cadOpenInspector();
}
function cadSend(type,payload,noteId=''){
 if(cadLocked())return;cadState.pending=uid();cadState.error='';announceSave('pending');
 if(HOSTED){window.parent.postMessage({boBlueprintHost:1,type,requestId:cadState.pending,...payload,noteId},location.origin);rerender();return}
 try{let next=payload.state;if(type==='canvas-create'){const data=cadModel.prepareCanvasInput(S,payload.input);next=structuredClone(S);noteId=uid();(next.c[data.row+'|'+data.index]||=[]).push({i:noteId,type:'card',t:data.title,canvas:data.canvas,activity:data.activity})}window.BlueOceanJourneyContent.validateMatrixDocument(next);Object.assign(S,next);save();cadResult({requestId:cadState.pending,ok:true,state:S,noteId})}catch(error){cadResult({requestId:cadState.pending,ok:false,error:error.message})}
}
function cadResult(data){
 if(data.requestId!==cadState.pending)return;cadState.pending='';
 if(!data.ok){cadState.error=data.error||'Não foi possível salvar.';announceSave(false);rerender();return}
 S=structuredClone(data.state);S.id=HOSTED?'host':S.id;DB={cur:S.id,js:[S]};last=JSON.stringify(S);growthLastPatch=growthPatchKey();if(data.history)H=data.history;cadState.drafts.delete(cadState.selected);cadState.creating=null;cadState.link=null;cadState.selected='';cadState.inspector=false;announceSave(true);rerender();
 if(data.noteId)requestAnimationFrame(()=>app.querySelector('[data-act="cad-select"][data-id="'+CSS.escape(data.noteId)+'"]')?.focus());
}
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
  const moved=cadModel.moveCanvasCard(next,note.i,{...input,row:data.row});cadSend('canvas-change',{state:moved},note.i);
 }catch(error){cadState.error=error.message;form.querySelector('.form-error').textContent=error.message}
}
function cadAction(action,data){
 if(!action.startsWith('cad-'))return false;
 if(action==='cad-open'||action==='cad-matrix'){V.blueprintRenderer=action==='cad-open'?'canvas':'matrix';saveView();rerender();return true}
 if(action==='cad-select'){cadSelect(data.id);return true}
 if(action==='cad-edge'){cadOpenLink(data.id);return true}
 if(action==='cad-link'){cadOpenLink('',cadState.selected);return true}
 if(action==='cad-close-library'){cadState.library=false;app.querySelector('#cad-library-sheet')?.close();return true}
 if(action==='cad-library'){cadState.library=true;if(cadMobile())rerender();else app.querySelector('.cad-library button')?.focus();return true}
 if(action==='cad-close'){cadState.inspector=false;app.querySelector('#cad-inspector-sheet')?.close();return true}
 if(action==='cad-cancel'){cadState.drafts.delete(cadState.selected);cadState.creating=null;cadState.link=null;cadState.selected='';cadState.inspector=false;cadState.error='';rerender();return true}
 if(action==='cad-add'){
  if(cadLocked()||!S.steps.length){if(!S.steps.length)growthOpenStage();return true}
  const kind=data.kind||'activity',component=cadModel.CANVAS_COMPONENTS[kind];if(!component)return true;
  cadState.selected='';cadState.link=null;cadState.error='';cadState.creating={kind,row:component.row,stageKey:cadStageKey(S.steps[Number(data.si)||businessStageIndex()]),title:'',resourceRefs:[]};cadOpenInspector();return true;
 }
 if(action==='cad-stage-edit'){
  if(cadLocked())return true;const index=Number(data.si),step=S.steps[index];if(!step)return true;
  const dialog=app.querySelector('#cad-inspector-sheet');if(dialog?.open)dialog.close();
  // Existing stage operations retain their canonical IDs and history.
  const target=app.querySelector('.cad-inspector');const panel=cadMobile()?app.querySelector('#cad-inspector-sheet'):target;
  panel.innerHTML=cadButton('cad-close','Fechar propriedades')+'<h2>Editar etapa</h2><label>Nome da etapa<input data-cad-stage-name data-si="'+index+'" value="'+esc(step.n)+'"></label><div class="cad-stage-actions">'+cadButton('mv','Mover antes','data-si="'+index+'" data-d="-1" '+(!index?'disabled':''))+cadButton('mv','Mover depois','data-si="'+index+'" data-d="1" '+(index===S.steps.length-1?'disabled':''))+cadButton('ds','Duplicar etapa','data-si="'+index+'"')+cadButton('del','Remover etapa','data-si="'+index+'"')+'</div>';if(cadMobile())panel.showModal();panel.querySelector('input').focus();return true;
 }
 if(action==='cad-prev'||action==='cad-next'){const index=Math.max(0,Math.min(S.steps.length-1,businessStageIndex()+(action==='cad-prev'?-1:1))),step=S.steps[index];businessStage=step.hostLocalId||step.hostStageId;rerender();return true}
 if(action==='cad-fit'){cadFit();return true}if(action==='cad-minus'||action==='cad-plus'){cadZoom(action==='cad-plus'?1.2:1/1.2);return true}
 if(action==='cad-export'){const blob=new Blob([cadModel.exportCanvasSvg(cadProjection(),cadRows(),cadTitle)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=(S.title||'Blueprint').replace(/[^\p{L}\p{N} -]/gu,'')+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true}
 if(action==='cad-delete'||action==='cad-delete-link'){
  if(cadLocked()||!confirm(action==='cad-delete'?'Remover este componente do mapa e suas conexões? O registro do serviço será mantido.':'Remover esta conexão?'))return true;
  const next=structuredClone(S);if(action==='cad-delete'){for(const key in next.c)next.c[key]=next.c[key].filter(note=>note.i!==cadState.selected);next.links=(next.links||[]).filter(link=>link.a!==cadState.selected&&link.b!==cadState.selected)}else next.links=(next.links||[]).filter(link=>link.id!==cadState.link.id);cadSend('canvas-change',{state:next});return true;
 }
 return true;
}
function cadWorld(event){const rect=app.querySelector('.cad-viewport').getBoundingClientRect(),cam=cadState.camera;return {x:(event.clientX-rect.left-cam.x)/cam.zoom,y:(event.clientY-rect.top-cam.y)/cam.zoom}}
function cadDropTarget(point){return {row:cadState.layout.rows.find(row=>point.y>=row.y&&point.y<=row.y+row.height),stage:cadState.layout.stages.find(stage=>point.x>=stage.x&&point.x<=stage.x+stage.width)}}
function cadBind(){
 app.addEventListener('submit',event=>{if(['cad-component-form','cad-link-form'].includes(event.target.id)){event.preventDefault();cadSubmit(event.target)}});
 app.addEventListener('input',event=>{const form=event.target.form;if(['cad-component-form','cad-link-form'].includes(form?.id)){const draft=cadCurrentDraft();if(draft)Object.assign(draft,cadFormData(form))}});
 app.addEventListener('change',event=>{
  const el=event.target;if(el.matches('[data-cad-stage]')){const step=S.steps[Number(el.value)];businessStage=step.hostLocalId||step.hostStageId;rerender()}
  if(el.matches('[data-cad-detail]')){cadState.detail=el.value;cadPaint()}
  if(el.matches('[data-cad-links]')){V.connectionMode=el.value;saveView();cadPaint()}
  if(el.form?.id==='cad-link-form')cadLinkFields();
  if(el.matches('[data-cad-stage-name]')&&cadEnabled()){const step=S.steps[Number(el.dataset.si)];if(step&&el.value.trim()){step.n=el.value.trim().slice(0,240);save()}}
 });
 app.addEventListener('cancel',event=>{if(event.target.id==='cad-library-sheet')cadState.library=false;if(event.target.id==='cad-inspector-sheet')cadState.inspector=false},true);
 app.addEventListener('keydown',event=>{
  const target=event.target.closest?.('#cad-svg [role="button"]');if(target&&['Enter',' '].includes(event.key)){event.preventDefault();target.dispatchEvent(new MouseEvent('click',{bubbles:true}));return}
  if(event.key==='Escape'&&cadEnabled()&&!event.target.closest('dialog')){cadState.drag=null;if(cadState.link)cadAction('cad-cancel',{});return}
  if(event.target.matches('.cad-viewport')&&['+','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();if(event.key==='0')cadFit();else if(event.key==='+'||event.key==='-')cadZoom(event.key==='+'?1.2:1/1.2);else{const cam=cadState.camera;cam.x+=event.key==='ArrowLeft'?40:event.key==='ArrowRight'?-40:0;cam.y+=event.key==='ArrowUp'?40:event.key==='ArrowDown'?-40:0;cadPaint()}}
 });
 app.addEventListener('wheel',event=>{if(!event.target.closest?.('.cad-viewport'))return;event.preventDefault();const r=app.querySelector('.cad-viewport').getBoundingClientRect();cadZoom(event.deltaY<0?1.1:1/1.1,event.clientX-r.left,event.clientY-r.top)},{passive:false});
 app.addEventListener('pointerdown',event=>{
  const viewport=event.target.closest?.('.cad-viewport');if(!viewport||event.target.closest('.cad-camera')||event.button!==0&&event.button!==1)return;
  const node=event.target.closest('.cad-node');if(node&&(cadLocked()||cadState.link||!blueprintNote(node.dataset.id)))return;
  cadState.drag={pointer:event.pointerId,startX:event.clientX,startY:event.clientY,cam:{...cadState.camera},node:node?.dataset.id,moved:false};if(!event.target.closest('[data-act]'))viewport.setPointerCapture(event.pointerId);
 });
 app.addEventListener('pointermove',event=>{
  const drag=cadState.drag;if(!drag||drag.pointer!==event.pointerId)return;const dx=event.clientX-drag.startX,dy=event.clientY-drag.startY;if(Math.hypot(dx,dy)<5&&!drag.moved)return;drag.moved=true;app.querySelector('.cad-viewport').setPointerCapture(event.pointerId);
  if(!drag.node){cadState.camera={...drag.cam,x:drag.cam.x+dx,y:drag.cam.y+dy};cadPaint();return}
  const node=cadState.layout.nodes.find(node=>node.id===drag.node),el=app.querySelector('.cad-node[data-id="'+CSS.escape(drag.node)+'"]');el?.setAttribute('transform','translate('+(node.x+dx/drag.cam.zoom)+' '+(node.y+dy/drag.cam.zoom)+')');
  const target=cadDropTarget(cadWorld(event));app.querySelectorAll('.cad-cell').forEach(cell=>cell.classList.toggle('is-target',cell.dataset.row===target.row?.id&&Number(cell.dataset.si)===target.stage?.index));
 });
 const end=(event,cancel=false)=>{
  const drag=cadState.drag;if(!drag||drag.pointer!==event.pointerId)return;cadState.drag=null;if(!drag.moved)return;cadState.ignoreClick=true;setTimeout(()=>cadState.ignoreClick=false,100);
  if(cancel||!drag.node){cadPaint();return}try{const point=cadWorld(event),target=cadDropTarget(point);if(!target.row||!target.stage){cadPaint();return}const step=target.stage.step,before=cadState.layout.nodes.find(node=>!node.note.virtualLabel&&node.id!==drag.node&&node.row===target.row.id&&node.stageIndex===target.stage.index&&point.y<node.y+node.height/2);const next=cadModel.moveCanvasCard(S,drag.node,{stageId:step.hostStageId,stageLocalId:step.hostLocalId,row:target.row.id,beforeId:before?.id});cadSend('canvas-change',{state:next},drag.node)}catch(error){cadState.error=error.message;rerender()}
 };
 app.addEventListener('pointerup',event=>end(event));app.addEventListener('pointercancel',event=>end(event,true));
 app.addEventListener('dragstart',event=>{const kind=event.target.closest?.('[data-act="cad-add"]')?.dataset.kind;if(kind&&!cadLocked())event.dataTransfer.setData('application/x-blue-ocean-component',kind)});
 app.addEventListener('dragover',event=>{if(event.target.closest?.('.cad-viewport')&&event.dataTransfer.types.includes('application/x-blue-ocean-component'))event.preventDefault()});
 app.addEventListener('drop',event=>{const kind=event.dataTransfer.getData('application/x-blue-ocean-component');if(!kind||!event.target.closest?.('.cad-viewport'))return;event.preventDefault();const target=cadDropTarget(cadWorld(event));cadAction('cad-add',{kind,si:String(target.stage?.index||0)});if(target.row&&cadModel.CANVAS_COMPONENTS[kind].rows.includes(target.row.id)){cadState.creating.row=target.row.id;rerender()}});
 let wasMobile=cadMobile();window.addEventListener('resize',()=>{if(!cadEnabled())return;if(wasMobile!==cadMobile()){wasMobile=cadMobile();rerender()}else if(!cadState.inspector)cadFit()});
}

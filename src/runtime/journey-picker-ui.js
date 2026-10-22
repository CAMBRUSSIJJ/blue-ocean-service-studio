/* A shared, searchable catalog for cells and lanes. No new records until a type is chosen. */
Object.assign(contentTypes, {
  scale:['↔','Escala','Valor em uma escala configurável'],
  embed:['▣','Embed','Vídeo ou protótipo incorporado'],
  plan:['✓','Planejamento','Plano de melhoria do serviço'],
  metric:['▥','Métrica','Indicador real do serviço'],
  channel:['📱','Canal','Canal de contato já criado no serviço'],
  persona:['👤','Persona','Pessoa que vive a experiência'],
  pain:['⚡','Dor','Dificuldade ou problema registrado no serviço'],
  need:['◎','Necessidade','O que o cliente precisa resolver'],
  evidence:['📎','Evidência','Fonte ou registro da pesquisa'],
  opportunity:['💡','Oportunidade','Ideia de melhoria existente']
});
const pickerReferenceTypes=window.BlueOceanJourneyContent.MATRIX_REFERENCE_TYPES;
let pickerToolCache;
function pickerTools(){return pickerToolCache ||= {
  'tool-em':{row:'em',name:'Gráfico de emoções',icon:'⌁',hint:'Sentimentos ao longo das etapas'},
  'tool-im':{row:'im',name:'Dores e ideias',icon:'⚡',hint:'Registrar dores e planejar melhorias'},
  ...Object.fromEntries(BASE_ROWS.filter(row=>!['em','im'].includes(row.id)).map(row=>['tool-'+row.id,{row:row.id,name:row.n,icon:'▤',hint:row.h}]))
}}
const pickerGroups=[{label:'Básicos',types:['text','image','emoji','scale','card','link']},{label:'Elementos do serviço',types:['channel','persona','pain','need','evidence','opportunity']},{label:'Avançados',types:['embed','plan','metric']}];
const pickerNames={emoji:'Ícones e emojis'};
const pickerRowDefaults={text:{n:'Texto',h:'Registre uma descrição ou observação',icon:'',defaultType:'text'},image:{n:'Imagens',h:'Registros visuais da experiência',icon:'',defaultType:'image'},emoji:{n:'Ícones',h:'Símbolos e seus significados',icon:'',defaultType:'emoji'},scale:{n:'Escala',h:'Avaliação definida pela equipe',icon:'',defaultType:'scale'},card:{n:'Cartões',h:'Anotações da experiência',icon:'',defaultType:'card'},link:{n:'Referências',h:'Links para consultar',icon:'',defaultType:'link'},embed:{n:'Conteúdos incorporados',h:'Vídeos e protótipos',icon:'',defaultType:'embed'},plan:{n:'Planejamento',h:'Ações vinculadas às dores do serviço',icon:'',defaultType:'plan'},metric:{n:'Métricas',h:'Indicadores vinculados ao serviço',icon:'',defaultType:'metric'}};
for(const [type,name] of Object.entries({channel:'Canais',persona:'Personas',pain:'Dores',need:'Necessidades',evidence:'Evidências',opportunity:'Oportunidades'}))pickerRowDefaults[type]={n:name,h:contentTypes[type][2],icon:contentTypes[type][0],defaultType:type};
let pickerContext={mode:'cell',anchor:null,templates:false};
function pickerLaneMode(){return pickerContext.mode!=='cell'}
function pickerVisibleGroups(){return pickerContext.mode==='row'?[{label:'Experiência',types:['tool-sd','tool-ac','tool-em','tool-im','persona','channel','need','evidence','opportunity']},{label:'Operação',types:['tool-ev','tool-fl','tool-bk','tool-sy']},{label:'Negócio',types:['tool-go','tool-ch','tool-pr','tool-br','tool-rr','tool-ki']}]:pickerGroups}
const pickerFold=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function pickerPosition(panel,anchor){const rect=anchor?.getBoundingClientRect()||{left:12,bottom:80};panel.style.width=Math.min(276,innerWidth-24)+'px';panel.style.left=Math.max(12,Math.min(rect.left,innerWidth-panel.offsetWidth-12))+'px';panel.style.top=Math.max(12,Math.min(rect.bottom+5,innerHeight-panel.offsetHeight-12))+'px'}
function pickerOption(type,label,extra='',quick=false){
  const tool=pickerTools()[type],lane=pickerLaneMode(),title=label||tool?.name||pickerNames[type]||contentTypes[type]?.[1]||'Etapa',icon=tool?.icon||(type==='stage'?'⇥':contentTypes[type]?.[0]),row=rowDefs().find(r=>r.id===contentCellKey.split('|')[0]);
  const name=quick?'Adicionar padrão: '+contentTypes[type][1]:tool?'Mostrar '+tool.name:type==='stage'?'Adicionar etapa pelo menu':lane?'Criar faixa de '+(contentTypes[type]?.[1]||title):'Adicionar '+(contentTypes[type]?.[1]||title);
  return '<button type="button" class="content-choice picker-option" '+(quick?'data-quick="1" ':'')+'data-act="picker-type" data-type="'+type+'" data-search="'+esc(pickerFold(title+' '+(tool?.hint||contentTypes[type]?.[2]||'')+' '+extra))+'" aria-label="'+esc(name)+'"><span class="picker-type-icon type-'+type+'" aria-hidden="true">'+icon+'</span><span>'+esc(title)+'</span>'+(!quick&&!lane&&type===row?.defaultType?'<small class="picker-default">Padrão</small>':'')+'</button>';
}
function pickerOpen(mode,key='',anchor=null){
  contentCellKey=key;pickerContext={mode,anchor:anchor||app.querySelector('[data-act="add"][data-k="'+key+'"]'),templates:false};
  const panel=app.querySelector('#content-picker');panel.classList.add('type-catalog');
  const row=rowDefs().find(value=>value.id===key.split('|')[0]),defaultType=row?.defaultType||'card',quick=mode==='cell'?'<div class="picker-quick">'+pickerOption(defaultType,'Padrão: '+contentTypes[defaultType][1],'',true)+'</div>':'';
  panel.innerHTML='<div class="picker-title"><h2 id="content-picker-title">'+(mode==='row'?'Adicionar faixa':mode==='row-custom'?'Faixa personalizada':'Adicionar conteúdo')+'</h2><button type="button" class="x" data-act="content-close-picker" aria-label="'+(mode!=='cell'?'Cancelar':'Fechar tipos de conteúdo')+'">×</button></div><label class="sr-only" for="picker-search">Buscar tipo de conteúdo</label><input id="picker-search" type="search" placeholder="Buscar tipo de conteúdo" autocomplete="off"><div class="picker-list">'+quick+pickerVisibleGroups().map(group=>'<section class="picker-group"><h3>'+group.label+'</h3>'+(typeof group.types==='function'?group.types():group.types).map(type=>pickerOption(type)).join('')+'</section>').join('')+'<p class="picker-empty" role="status" hidden>Nenhum tipo encontrado.</p></div>'+(mode==='row'?'<button type="button" class="picker-models" data-act="picker-custom">Faixa personalizada →</button><button type="button" class="picker-models" data-act="picker-models">Modelos de faixa →</button>':mode==='row-custom'?'<button type="button" class="picker-models" data-act="picker-back">← Faixas da jornada</button>':'');
  panel.showPopover();pickerContext.anchor?.setAttribute('aria-expanded','true');pickerPosition(panel,pickerContext.anchor);panel.querySelector('input').focus();
}
function pickerFilter(input){const panel=input.closest('#content-picker'),query=pickerFold(input.value.trim());let count=0;
  panel.querySelectorAll('.picker-option').forEach(button=>{button.hidden=button.dataset.quick?!!query:!button.dataset.search.includes(query);if(!button.hidden)count++});
  panel.querySelectorAll('.picker-group').forEach(group=>group.hidden=![...group.querySelectorAll('.picker-option')].some(b=>!b.hidden));panel.querySelector('.picker-empty').hidden=count>0;pickerPosition(panel,pickerContext.anchor);
}
function pickerModels(){const panel=app.querySelector('#content-picker');pickerContext.templates=true;panel.innerHTML='<div class="picker-title"><h2 id="content-picker-title">Modelos de faixa</h2><button class="x" data-act="content-close-picker" aria-label="Cancelar">×</button></div><button class="picker-models" data-act="picker-back">← Tipos de faixa</button><div class="picker-list">'+Object.entries(contentTemplates).map(([id,template])=>'<button class="content-choice picker-option" data-act="picker-template" data-template="'+id+'"><span class="picker-type-icon" aria-hidden="true">'+esc(template.icon||'T')+'</span><span>'+esc(template.n||'Em branco')+'</span></button>').join('')+'</div>';pickerPosition(panel,pickerContext.anchor);panel.querySelector('[data-act="picker-back"]').focus()}
function pickerCreateRow(settings){
  contentClosePicker();const id='x'+uid(),row=window.BlueOceanJourneyContent.normalizeMatrixRow(settings);S.rowSettings ||= {};S.rowSettings[id]=row;(S.lanes ||= []).push({id,...row});V.rowOrder.push(id);V.hiddenRows=V.hiddenRows.filter(x=>x!==id);save();saveView();rerender();
  const name=app.querySelector('[data-ed="ln"][data-id="'+id+'"]');name?.focus();name?.scrollIntoView({block:'nearest',inline:'nearest'});if(name){const selection=getSelection(),range=document.createRange();range.selectNodeContents(name);selection.removeAllRanges();selection.addRange(range)}
}
function pickerShowTool(row){
  const index=Math.max(0,Math.min(Number(contentCellKey.split('|')[1])||0,S.steps.length-1));
  contentClosePicker();V.hiddenRows=V.hiddenRows.filter(id=>id!==row);V.preset='custom';
  if(row==='em'){V.emotionsExpanded=false;emotionEdit=S.steps.length?index:null}
  saveView();rerender();
  if(!S.steps.length){growthOpenStage();return}
  const target=app.querySelector(row==='em'?'[data-emotion-editor="'+index+'"] select':row==='im'?'[data-act="addi"][data-si="'+index+'"]':'[data-act="add"][data-k="'+row+'|'+index+'"]')||app.querySelector('[data-row="'+row+'"] button');
  target?.focus();target?.scrollIntoView({block:'center',inline:'nearest'});
}
function pickerChoose(type){
  if(pickerTools()[type]){pickerShowTool(pickerTools()[type].row);return}
  if(type==='stage'){contentClosePicker();growthOpenStage();return}
  if(pickerLaneMode()){pickerCreateRow(pickerRowDefaults[type]);return}
  contentChoose(type);
}
function pickerSources(type){return type==='plan'?S.plans||[]:type==='metric'?S.availableMetrics||[]:S.serviceElements?.[type]||[]}
function pickerReference(note){return pickerSources(note.type).find(record=>record.id===note.referenceId)}
function pickerRefreshReferences(){
  const notes=Object.values(S.c).flat();
  app.querySelectorAll('.content-block>.service-reference,.content-block>.reference-missing').forEach(element=>{
    const note=notes.find(value=>value.i===element.parentElement.dataset.nid);
    if(note&&pickerReferenceTypes.includes(note.type))element.outerHTML=pickerReferenceMarkup(note);
  });
}
function pickerReferenceMarkup(note,report=false){const source=pickerReference(note);if(!source)return '<p class="reference-missing">Registro indisponível. Selecione outro em Editar elemento.</p>';
  if(note.type==='metric')return '<div class="metric-reference"><strong>'+esc(source.name)+'</strong><b>'+esc(source.current===undefined?'Sem medição':String(source.current)+(source.unit?' '+source.unit:''))+'</b><small>Meta: '+esc(source.target===undefined?'não informada':String(source.target)+(source.unit?' '+source.unit:''))+'</small></div>';
  if(note.type!=='plan'){
    const details=(source.description&&source.description!==source.title?'<p>'+esc(source.description)+'</p>':'')+(source.category?'<p>'+esc(source.category)+'</p>':'')+(source.stageName?'<small>Etapa de origem: '+esc(source.stageName)+'</small>':'')+(source.source?'<small>Fonte: '+esc(source.source)+'</small>':'');
    return '<div class="service-reference"><small>'+esc(contentTypes[note.type][1])+'</small><b>'+esc(source.title)+'</b>'+(details?(report?details:'<details class="reference-details"><summary>Ver detalhes</summary>'+details+'</details>'):'')+(note.type==='pain'&&!report?'<button class="tb" data-act="context-pain" data-source="'+esc(note.referenceId)+'">Analisar dor</button>':'')+'</div>';
  }
  const index=(S.iss||[]).findIndex(issue=>growthIssueKey(issue)===source.problemId);
  return '<div class="plan-reference"><strong>'+esc(source.title)+'</strong><small>'+esc(growthStatusLabels[source.status]||source.status)+'</small><p>'+esc(source.owner||'Responsável não informado')+(source.targetDate?' · '+esc(source.targetDate):'')+'</p>'+(source.expectedOutcome?'<p>'+esc(source.expectedOutcome)+'</p>':'')+(!report&&index>=0?'<button class="tb" data-act="picker-track" data-ii="'+index+'">Acompanhar plano</button>':'')+'</div>';
}
function pickerAdvancedMedia(note,key,index){const type=note.type;if(type==='scale'){
  let scale;try{scale=window.BlueOceanJourneyContent.normalizeMatrixScale(note.scale)}catch{return '<p>Escala indisponível. Revise em Editar elemento.</p>'}const value=scale.value;
  return '<div class="scale-content"><div class="scale-value" data-scale-output>'+esc(value===undefined?'Não preenchida':String(value))+'</div><input type="range" min="'+scale.min+'" max="'+scale.max+'" step="'+scale.step+'" value="'+(value===undefined?scale.min:value)+'" data-scale-key="'+esc(key)+'" data-scale-index="'+index+'" aria-label="'+esc(note.t||'Valor da escala')+'"><div class="scale-ends"><span>'+esc(scale.minLabel||String(scale.min))+'</span><span>'+esc(scale.maxLabel||String(scale.max))+'</span></div><small>Registro da equipe · sem medição automática</small><button class="scale-clear" data-act="picker-clear-scale" data-k="'+esc(key)+'" data-j="'+index+'" '+(value===undefined?'hidden':'')+'>Limpar valor</button></div>';
  }
  if(type==='embed'){const url=window.BlueOceanJourneyContent.matrixEmbedUrl(note.url);return url?'<div class="embed-preview"><button data-act="picker-load-embed" data-k="'+esc(key)+'" data-j="'+index+'">▶ Carregar conteúdo</button><small>'+esc(new URL(url).hostname)+'</small></div><a class="content-link" href="'+esc(window.BlueOceanJourneyContent.matrixSafeUrl(note.url,true))+'" target="_blank" rel="noopener noreferrer">Abrir original ↗</a>':'<p>Endereço de incorporação indisponível.</p>'}
  if(pickerReferenceTypes.includes(type))return pickerReferenceMarkup(note);
  return '';
}
function pickerAdvancedReport(note){if(note.type==='scale'){const v=note.scale||{min:0,max:10};return '<p><b>'+esc(v.value===undefined?'Não preenchida':String(v.value))+'</b> · Escala '+esc(String(v.min))+' a '+esc(String(v.max))+'</p><small>Registro da equipe · não representa uma medição de indicador.</small>'}
  if(note.type==='embed'){const url=window.BlueOceanJourneyContent.matrixSafeUrl(note.url,true);return url?'<p><a href="'+esc(url)+'" rel="noopener noreferrer">Abrir conteúdo incorporado ↗</a></p>':''}
  if(pickerReferenceTypes.includes(note.type))return pickerReferenceMarkup(note,true);return '';
}
function pickerOpenAdvanced(type,note=null){
  contentEditingId=note?.i||null;const dialog=app.querySelector('#content-editor'),reference=pickerReferenceTypes.includes(type),sources=pickerSources(type);
  let fields='';
  if(type==='embed')fields='<label>Título do conteúdo<input name="text" maxlength="1000" required value="'+esc(note?.t||'')+'"></label><label>Endereço para incorporar<input name="url" type="url" required value="'+esc(note?.url||'')+'" placeholder="https://"></label><p class="hint">YouTube, Vimeo ou Figma. O conteúdo só carrega quando você clicar na prévia.</p>';
  if(type==='scale'){let scale={min:0,max:10,step:1};try{scale=window.BlueOceanJourneyContent.normalizeMatrixScale(note?.scale)}catch{}fields='<label>O que esta escala avalia?<input name="text" maxlength="1000" required value="'+esc(note?.t||'')+'" placeholder="Ex.: esforço percebido pela equipe"></label><label>Valor registrado<input name="scaleValue" type="number" step="any" value="'+(scale.value===undefined?'':scale.value)+'" placeholder="Não preenchido"></label><details><summary>Configurar escala</summary><div class="form-grid"><label>Início<input name="scaleMin" type="number" step="any" required value="'+scale.min+'"></label><label>Fim<input name="scaleMax" type="number" step="any" required value="'+scale.max+'"></label><label>Intervalo<input name="scaleStep" type="number" step="any" required value="'+scale.step+'"></label></div><label>Rótulo inicial<input name="minLabel" maxlength="80" value="'+esc(scale.minLabel||'')+'"></label><label>Rótulo final<input name="maxLabel" maxlength="80" value="'+esc(scale.maxLabel||'')+'"></label></details><p class="hint">Esta escala registra uma avaliação da equipe. Para acompanhar um resultado medido, vincule uma Métrica.</p>'}
  if(reference){fields='<label>Registro do serviço<select name="referenceId" aria-label="Registro do serviço" required '+(!sources.length?'disabled':'')+'><option value="">Selecione</option>'+sources.map(source=>'<option value="'+esc(source.id)+'" '+(note?.referenceId===source.id?'selected':'')+'>'+esc(source.title||source.name)+'</option>').join('')+'</select></label><label>Legenda no mapa<input name="text" maxlength="1000" value="'+esc(note?.t||'')+'" placeholder="Usar o nome do registro"></label><p class="hint">'+(sources.length?'Este cartão acompanha o registro existente no serviço. A legenda é apenas desta representação.':type==='plan'||type==='metric'?'Crie um plano ou indicador a partir de uma dor e volte aqui para vinculá-lo.':'Nenhum registro de '+contentTypes[type][1].toLowerCase()+' disponível. Crie-o na biblioteca do serviço e volte para vinculá-lo.')+'</p>'+(['plan','metric'].includes(type)&&HOSTED?'<button type="button" class="tb" data-act="picker-go-plans">Ir para dores e planos</button>':'')+(['pain','opportunity'].includes(type)?'<button type="button" class="tb" data-act="picker-go-issues">Registrar em dores e ideias</button>':'')+(!HOSTED?'<p>Os vínculos com o serviço ficam disponíveis ao abrir o mapa no projeto.</p>':'')}
  dialog.innerHTML='<form id="picker-advanced-form" data-type="'+type+'"><div class="panel-head"><h2 id="content-editor-title">'+(note?'Editar elemento':'Adicionar '+contentTypes[type][1].toLowerCase())+'</h2><button type="button" class="x" data-act="content-close-editor" aria-label="Fechar elemento">×</button></div>'+fields+'<p class="form-error" role="alert"></p><footer><button type="button" class="tb" data-act="content-close-editor">Cancelar</button><button type="submit" class="tb p" '+(reference&&!sources.length?'disabled':'')+'>Salvar elemento</button></footer></form>';dialog.showModal();dialog.querySelector('input,select,button').focus();
}
function pickerSubmitAdvanced(form){if(!form.reportValidity())return;const data=new FormData(form),type=form.dataset.type,notes=S.c[contentCellKey]||[],old=notes.find(n=>n.i===contentEditingId);let text=String(data.get('text')||'').trim();const note={...old,i:old?.i||uid(),type,t:text};
  if(type==='scale')note.scale={min:data.get('scaleMin'),max:data.get('scaleMax'),step:data.get('scaleStep'),value:data.get('scaleValue'),minLabel:data.get('minLabel'),maxLabel:data.get('maxLabel')};
  if(type==='embed')note.url=String(data.get('url')||'');
  if(pickerReferenceTypes.includes(type)){note.referenceId=String(data.get('referenceId')||'');const source=pickerReference(note);if(!source){form.querySelector('.form-error').textContent='Selecione um registro disponível.';return}note.t=text}
  try{if(!note.t&&!pickerReferenceTypes.includes(type))throw Error('Dê um nome ao elemento.');const normalized=window.BlueOceanJourneyContent.normalizeMatrixBlock(note);Object.assign(note,{scale:normalized.scale,url:normalized.url,referenceId:normalized.referenceId});const c={...S.c,[contentCellKey]:old?notes.map(n=>n.i===old.i?note:n):contentInsertNote(notes,note)};window.BlueOceanJourneyContent.validateMatrixDocument({c});S.c=c;contentBeforeId=null;save();dialogCloseAdvanced(note.i)}catch(error){form.querySelector('.form-error').textContent=error.message}
}
function dialogCloseAdvanced(id){app.querySelector('#content-editor').close();rerender();focusNew('[data-nid="'+id+'"] [data-ed="c"]')}
function pickerAction(action,data,button){
  if(action==='alane'){pickerOpen('row','',button);return true}
  if(action==='picker-type'){pickerChoose(data.type);return true}
  if(action==='picker-custom'){pickerOpen('row-custom','',pickerContext.anchor);return true}
  if(action==='picker-models'){pickerModels();return true}
  if(action==='picker-back'){pickerOpen('row','',pickerContext.anchor);return true}
  if(action==='picker-template'){const template=contentTemplates[data.template];pickerCreateRow({...template,n:template.n||'Anotações'});return true}
  if(action==='picker-clear-scale'){delete S.c[data.k][Number(data.j)].scale.value;save();rerender();focusNew('[data-scale-key="'+data.k+'"][data-scale-index="'+data.j+'"]');return true}
  if(action==='picker-load-embed'){
    const note=S.c[data.k]?.[Number(data.j)],url=note&&window.BlueOceanJourneyContent.matrixEmbedUrl(note.url);if(!url)return true;const preview=button.closest('.embed-preview'),frame=document.createElement('iframe');frame.title=note.t;frame.src=url;frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation');frame.setAttribute('allowfullscreen','');preview.replaceChildren(frame);return true;
  }
  if(action==='picker-go-issues'){app.querySelector('#content-editor').close();pickerShowTool('im');return true}
  if(action==='picker-track'){growthOpenTracking(Number(data.ii));return true}
  if(action==='picker-go-plans'){app.querySelector('#content-editor').close();contentClosePicker();choosePreset('detailed');rerender();const target=app.querySelector('[data-act="plan"]')||app.querySelector('[data-act="addi"][data-t="d"]');target?.focus();target?.scrollIntoView({block:'center',inline:'nearest'});return true}
  return false;
}
function pickerBind(){
  app.addEventListener('input',event=>{const el=event.target;if(el.id==='picker-search')pickerFilter(el);if(el.dataset.scaleKey){const output=el.closest('.scale-content').querySelector('[data-scale-output]');output.textContent=el.value}});
  app.addEventListener('change',event=>{const el=event.target;if(el.dataset.scaleKey){const note=S.c[el.dataset.scaleKey]?.[Number(el.dataset.scaleIndex)];if(!note)return;note.scale.value=Number(el.value);save();el.closest('.scale-content').querySelector('.scale-clear').hidden=false}});
  app.addEventListener('submit',event=>{if(event.target.id==='picker-advanced-form'){event.preventDefault();pickerSubmitAdvanced(event.target)}});
  app.addEventListener('keydown',event=>{const panel=event.target.closest('#content-picker');if(!panel||!panel.matches(':popover-open')||!['ArrowDown','ArrowUp','Home','End','Enter'].includes(event.key))return;const options=[...panel.querySelectorAll('.picker-option')].filter(b=>!b.hidden);if(!options.length)return;const index=options.indexOf(document.activeElement);if(event.key==='Enter'){if(event.target.id==='picker-search'){event.preventDefault();options[0].click()}return}event.preventDefault();event.stopPropagation();let next=event.key==='Home'?0:event.key==='End'?options.length-1:event.key==='ArrowDown'?(index+1)%options.length:index<0?options.length-1:(index-1+options.length)%options.length;options[next].focus()});
}

/**
 * Blueprint reference experience — visual contract from the supplied HTML.
 * Pure DOM view: the caller supplies canonical Service Graph data/actions.
 * This module never persists a second blueprint or sample data.
 */
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const q = (root,selector) => root.querySelector(selector);
const qa = (root,selector) => Array.from(root.querySelectorAll(selector));
const EMOTIONS = ['Frustrada','Ansiosa','Neutra','Animada','Satisfeita'];
const QUALITY = [
  ['tangibles','Tangíveis'],['reliability','Confiabilidade'],['responsiveness','Presteza'],
  ['assurance','Segurança'],['empathy','Empatia'],
];
export const VISUAL_BLUEPRINT_LANES=[
  {key:'evidence',name:'Evidência física',hint:'O que o cliente vê ou toca',placeholder:'O que a pessoa vê ou toca?'},
  {key:'customer',name:'Ações do cliente',hint:'O que a pessoa faz',placeholder:'O que o cliente faz aqui?'},
  {key:'frontstage',name:'Linha de frente',hint:'Ações visíveis da equipe',placeholder:'O que a equipe faz à vista?',separator:'Linha de interação'},
  {key:'backstage',name:'Bastidores',hint:'Ações que o cliente não vê',placeholder:'O que acontece por trás?',separator:'Linha de visibilidade',internal:true},
  {key:'process',name:'Processos',hint:'Fluxos, regras e handoffs da operação',placeholder:'Que processo sustenta esta entrega?',internal:true},
  {key:'enablement',name:'Sistemas e apoio',hint:'Ferramentas, recursos e integrações',placeholder:'Que ferramenta apoia?',separator:'Linha de interação interna',internal:true},
];
const attrs = (id) => 'data-id="'+esc(id)+'"';
const button=(action,label,attrsExtra='')=>'<button type="button" data-action="'+action+'" '+attrsExtra+'>'+label+'</button>';
function curveHtml(stages){
  if (!stages.length) return '<div class="bo-ref-empty">Adicione etapas para visualizar as emoções.</div>';
  const width=stages.length*200,points=stages.map((stage,i)=>({x:i*200+100,y:18+(2-(stage.emotionScore??0))*16}));
  let path='M'+points[0].x+' '+points[0].y;
  for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],m=(a.x+b.x)/2;path+=' C'+m+' '+a.y+' '+m+' '+b.y+' '+b.x+' '+b.y;}
  return '<div class="bo-ref-curve" style="width:'+width+'px"><svg viewBox="0 0 '+width+' 112" preserveAspectRatio="none" role="img" aria-label="Curva de emoções ao longo das etapas"><line x1="0" x2="'+width+'" y1="50" y2="50" stroke="var(--br-ln)" stroke-dasharray="4 4"/><path d="'+path+'" fill="none" stroke="var(--br-ac)" stroke-width="2.5"/></svg>'+
    points.map((p,i)=>'<span class="bo-ref-dot" style="left:'+p.x+'px;top:'+p.y+'px"></span><span class="bo-ref-curve-name" style="left:'+p.x+'px;top:'+(p.y+11)+'px">'+esc(EMOTIONS[(stages[i].emotionScore??0)+2])+'</span>').join('')+'</div>';
}
function noteHtml(note,stageId,laneKey,links){
  const linking=links.active;
  return '<div class="bo-ref-note" draggable="true" '+attrs(note.id)+' data-stage="'+esc(stageId)+'" data-lane="'+esc(laneKey)+'">'+
   '<span class="bo-ref-drag" aria-hidden="true" title="Arrastar para outra etapa desta faixa">⠿</span>'+
   '<div class="bo-ref-note-text" role="textbox" aria-label="Nota" contenteditable="'+String(!links.readOnly)+'" spellcheck="true" data-edit="note" '+attrs(note.id)+'>'+esc(note.text)+'</div>'+
   (linking?button('link','●','class="bo-ref-note-link" aria-label="Ligar esta nota" '+attrs(note.id)):'')+
   (!links.readOnly?'<div class="bo-ref-note-actions">'+button('duplicate-note','⧉','aria-label="Duplicar nota" '+attrs(note.id))+
      button('remove-note','×','aria-label="Remover nota do mapa" '+attrs(note.id))+'</div>':'')+
   (note.kind==='smart'&&['frontstage','backstage','process','system','evidence'].includes(note.objectKind)?
     button('details','Detalhes','class="bo-ref-note-detail" '+attrs(note.id)):'')+
   '</div>';
}
function laneCells(stages,model,lane,links){
  return stages.map(stage=>{
    const notes=(model.cards[stage.id]?.[lane.key]||[]);
    const auto=lane.key==='customer'&&stage.customerAction && !notes.some(note=>note.text.trim()===stage.customerAction.trim());
    return '<div class="bo-ref-cell" data-cell-stage="'+esc(stage.id)+'" data-cell-lane="'+lane.key+'">'+
      (auto?'<div class="bo-ref-note bo-ref-auto"><div class="bo-ref-note-text" role="textbox" aria-label="Ação do cliente" contenteditable="'+String(!links.readOnly)+'" data-edit="customer" data-stage="'+esc(stage.id)+'">'+esc(stage.customerAction)+'</div></div>':'')+
      notes.map(note=>noteHtml(note,stage.id,lane.key,links)).join('')+
      (links.readOnly?'':button('add-note',notes.length?'+':'+ '+lane.placeholder,'class="bo-ref-add" data-stage="'+esc(stage.id)+'" data-lane="'+lane.key+'"'))+
    '</div>';
  }).join('');
}
function stageHeader(model,readOnly){
  return '<div class="bo-ref-row bo-ref-stage-row"><div class="bo-ref-label">Etapas<small>Um momento da experiência</small></div>'+
    model.stages.map((stage,index)=>'<div class="bo-ref-stage" data-stage="'+esc(stage.id)+'"><div class="bo-ref-stage-title"><span class="bo-ref-stage-number">'+(index+1)+'</span><span class="bo-ref-stage-name" role="textbox" aria-label="Nome da etapa" data-edit="stage-title" data-stage="'+esc(stage.id)+'" contenteditable="'+String(!readOnly)+'">'+esc(stage.title)+'</span></div>'+
      (readOnly?'':'<div class="bo-ref-stage-actions">'+button('move-left','‹','aria-label="Mover etapa para a esquerda" data-stage="'+esc(stage.id)+'" '+(!index?'disabled':''))+button('move-right','›','aria-label="Mover etapa para a direita" data-stage="'+esc(stage.id)+'" '+(index===model.stages.length-1?'disabled':''))+button('duplicate-stage','⧉','aria-label="Duplicar etapa" data-stage="'+esc(stage.id)+'"')+button('archive-stage','×','aria-label="Arquivar etapa" data-stage="'+esc(stage.id)+'" '+(model.stages.length<=1?'disabled':''))+'</div>')+'</div>').join('')+'<div class="bo-ref-stage-end"></div></div>';
}
function summaryRow(model,readOnly){
 return '<div class="bo-ref-row"><div class="bo-ref-label">O que acontece<small>Resumo da etapa</small></div>'+model.stages.map(stage=>'<div class="bo-ref-cell"><div class="bo-ref-note bo-ref-summary" role="textbox" aria-label="O que acontece em '+esc(stage.title)+'" data-edit="summary" data-stage="'+esc(stage.id)+'" contenteditable="'+String(!readOnly)+'">'+esc(stage.summary||'')+'</div></div>').join('')+'<div></div></div>';
}
function emotionRow(model,readOnly){
 return '<div class="bo-ref-row bo-ref-emotion-row"><div class="bo-ref-label">Emoções<small>Como a pessoa se sente</small></div><div class="bo-ref-emotion-content" style="grid-column:2 / span '+model.stages.length+'">'+curveHtml(model.stages)+'<div class="bo-ref-emotion-sliders" style="grid-template-columns:repeat('+model.stages.length+',200px)">'+model.stages.map(s=>'<label><input type="range" min="-2" max="2" step="1" data-change="emotion" data-stage="'+esc(s.id)+'" value="'+(s.emotionScore??0)+'" aria-label="Emoção em '+esc(s.title)+'" '+(readOnly?'disabled':'')+'></label>').join('')+'</div></div><div></div></div>';
}
function issueHtml(issue,readOnly){
 const isPain=issue.type==='pain';
 return '<div class="bo-ref-issue '+(isPain?'pain':'idea')+'" '+attrs(issue.id)+'>'+
  '<strong>'+(isPain?'Dor':'Ideia')+'</strong>'+
  '<div role="textbox" aria-label="Texto de '+(isPain?'dor':'ideia')+'" contenteditable="'+String(!readOnly)+'" data-edit="issue" '+attrs(issue.id)+'>'+esc(issue.text)+'</div>'+
  '<div class="bo-ref-issue-meta">'+(isPain?button('severity','Gravidade '+issue.severity+'/3','class="bo-ref-issue-severity" '+attrs(issue.id)+(readOnly?' disabled':'')):'')+
  '<select aria-label="Dimensão de qualidade" data-change="quality" '+attrs(issue.id)+' '+(readOnly?'disabled':'')+'>'+QUALITY.map(([key,label])=>'<option value="'+key+'" '+(key===issue.dimension?'selected':'')+'>'+label+'</option>').join('')+'</select>'+
  (readOnly?'':button('remove-issue','×','class="bo-ref-remove-issue" aria-label="Remover item da etapa" '+attrs(issue.id)))+
  '</div></div>';
}
function issuesRow(model,readOnly){
 return '<div class="bo-ref-separator">Melhorias</div><div class="bo-ref-row"><div class="bo-ref-label">Dores e ideias<small>Marque a dimensão de qualidade</small></div>'+
 model.stages.map(stage=>'<div class="bo-ref-cell">'+(model.issues[stage.id]||[]).map(issue=>issueHtml(issue,readOnly)).join('')+
 (readOnly?'':'<div class="bo-ref-issue-buttons">'+button('add-issue','+ Dor','data-stage="'+esc(stage.id)+'" data-type="pain"')+button('add-issue','+ Ideia','data-stage="'+esc(stage.id)+'" data-type="idea"')+'</div>')+'</div>').join('')+'<div></div></div>';
}
function diagnosticsHtml(model){
 const total=model.stages.length;
 const checklist=[
 ['O que acontece',model.stages.filter(s=>!!s.summary).length],
 ['Ações do cliente',model.stages.filter(s=>!!s.customerAction).length],
 ['Emoções',model.stages.filter(s=>s.emotionDefined).length],
 ...VISUAL_BLUEPRINT_LANES.filter(l=>l.key!=='customer').map(l=>[l.name,model.stages.filter(s=>(model.cards[s.id]?.[l.key]||[]).length>0).length]),
 ['Dores e ideias',model.stages.filter(s=>(model.issues[s.id]||[]).length>0).length],
 ];
 const todo=checklist.findIndex(([,n])=>n<total);
 const scores=model.stages.map((stage,i)=>{
   const its=model.issues[stage.id]||[],pains=its.filter(x=>x.type==='pain'),ideas=its.filter(x=>x.type==='idea'),
     emotional=stage.emotionDefined?(2-(stage.emotionScore??0))*1.5:0,
     score=Math.max(0,emotional+pains.reduce((sum,x)=>sum+x.severity,0)*2-ideas.length*1.5);
   return {stage,i,score,pains:pains.length,ideas:ideas.length};
 }).sort((a,b)=>b.score-a.score);
 const max=Math.max(1,...scores.map(x=>x.score));
 const coverage=QUALITY.map(([id,label])=>({id,label,pains:Object.values(model.issues).flat().filter(i=>i.dimension===id&&i.type==='pain').length,ideas:Object.values(model.issues).flat().filter(i=>i.dimension===id&&i.type==='idea').length}));
 const cmax=Math.max(1,...coverage.map(c=>c.pains+c.ideas));
 return '<aside class="bo-ref-diagnostics" aria-label="Diagnóstico do Blueprint"><h2>Passo a passo</h2>'+
 checklist.map(([label,n],i)=>'<div class="bo-ref-check '+(i===todo?'current':'')+'"><span>'+(n>=total&&total>0?'✓':i+1)+'</span><b>'+esc(label)+'</b><em>'+n+' de '+total+'</em></div>').join('')+
 (todo<0?'<div class="bo-ref-insight">As faixas estão preenchidas. Revise a entrega antes de validar o serviço.</div>':'<div class="bo-ref-insight">Próximo: <b>'+esc(checklist[todo][0])+'</b>.</div>')+
 '<h2>Prioridade de melhoria</h2>'+scores.map(o=>'<div class="bo-ref-rank"><div><b>'+(o.i+1)+'. '+esc(o.stage.title)+'</b><span>'+esc(EMOTIONS[(o.stage.emotionScore??0)+2])+' · '+o.pains+' dor(es)</span></div><div class="bo-ref-meter"><i style="width:'+Math.round(o.score/max*100)+'%"></i></div></div>').join('')+
 '<h2>Leitura automática</h2>'+(scores[0]&&scores[0].score>0?'<div class="bo-ref-insight">Comece por <b>'+esc(scores[0].stage.title)+'</b>: combina o estado emocional registrado, a gravidade das dores e as ideias mapeadas.</div>':'<div class="bo-ref-insight">Registre emoções e dores para identificar prioridades por etapa.</div>')+
 (scores.some(s=>s.pains&&!s.ideas)?'<div class="bo-ref-insight">Há dores sem ideias de melhoria associadas.</div>':'')+
 '<h2>Cobertura da qualidade (SERVQUAL)</h2>'+coverage.map(c=>'<div class="bo-ref-rank"><div><b>'+c.label+'</b><span>'+c.pains+' dor · '+c.ideas+' ideia</span></div><div class="bo-ref-meter"><i style="width:'+Math.round((c.pains+c.ideas)/cmax*100)+'%"></i></div></div>').join('')+
 '<p class="bo-ref-hint">Contagem por dimensão e heurística para ordenar melhorias. Não representa uma medição SERVQUAL com clientes.</p>'+
 button('delivery','Revisar entrega','class="bo-ref-panel-button"')+
 '</aside>';
}
function setupHtml(model){
 const defaults=['Descobrir','Escolher','Pedir e pagar','Aguardar','Retirar','Avaliar'];
 const initial=model.setup||{};
 return '<div class="bo-ref-header bo-ref-onboard"><div class="bo-ref-breadcrumb">Blue Ocean · Blueprint de serviço</div><h1>Vamos montar um blueprint</h1></div>'+
 '<div class="bo-ref-start"><section><h2>1 · Quem e o quê</h2><label>O que o cliente quer fazer?<input id="br-setup-title" value="'+esc(initial.title||model.name||'')+'" placeholder="Ex.: Pedir um café para retirar"></label><label>Quem é o cliente e em que contexto?<input id="br-setup-persona" value="'+esc(initial.persona||model.persona||'')+'" placeholder="Ex.: Marina, trabalha em home office e tem pouco tempo"></label></section>'+
 '<section><h2>2 · Etapas da jornada</h2><p>Um momento por etapa, na ordem em que o cliente vive. Desmarque as que não se aplicam.</p><div class="bo-ref-setup-chips">'+(initial.steps||defaults.map(name=>({name,on:true}))).map((s,i)=>button('setup-chip',(s.on?'✓ ':'')+esc(s.name),'class="bo-ref-chip" aria-pressed="'+String(s.on)+'" data-index="'+i+'"')).join('')+'</div><div class="bo-ref-setup-add"><input id="br-setup-next" placeholder="Nova etapa, ex.: Receber cupom">'+button('setup-add','Adicionar')+'</div></section>'+
 '<div class="bo-ref-start-actions">'+button('setup-create','Criar blueprint','class="primary"')+button('advanced','Editor avançado')+button('back','Meus Blueprints')+'</div><p>Escolha ao menos duas etapas para começar. O guia lateral acompanhará o preenchimento do seu Blueprint.</p></div>';
}
export function mountBlueprintReference(root,model,actions){
 const readOnly=!!model.readOnly,ui=model.ui||{},link={active:!!ui.linking,readOnly};
 if(!model.stages.length){
   root.innerHTML=setupHtml(model);
 }else{
 const N=model.stages.length, width=200+N*200+56;
 let content=stageHeader(model,readOnly)+summaryRow(model,readOnly);
 for(const lane of VISUAL_BLUEPRINT_LANES){
   if(lane.separator && !(ui.customerOnly && lane.internal)) content+='<div class="bo-ref-separator">'+esc(lane.separator)+'</div>';
   if(ui.customerOnly&&lane.internal) continue;
   if(lane.key==='frontstage'){} // keeps semantic separator in the exact visual hierarchy
   content+='<div class="bo-ref-row"><div class="bo-ref-label">'+esc(lane.name)+'<small>'+esc(lane.hint)+'</small></div>'+
        (lane.key==='customer'?laneCells(model.stages,model,lane,link):laneCells(model.stages,model,lane,link))+'<div></div></div>';
   if(lane.key==='customer')content+=emotionRow(model,readOnly);
 }
 for(const lane of model.customLanes||[]){
   content+='<div class="bo-ref-row"><div class="bo-ref-label"><span class="bo-ref-custom-label" contenteditable="'+String(!readOnly)+'" data-edit="custom-label" data-lane="'+esc(lane.id)+'">'+esc(lane.name)+'</span><small>Faixa personalizada</small></div>'+
     laneCells(model.stages,model,{key:lane.id,placeholder:'Adicionar'},link)+'<div></div></div>';
 }
 if(!readOnly)content+='<div class="bo-ref-row"><div class="bo-ref-custom-add">'+button('add-lane','+ Adicionar faixa')+'</div></div>';
 content+=issuesRow(model,readOnly);
 const header='<div class="bo-ref-header"><div class="bo-ref-breadcrumb">Blue Ocean · Blueprint de serviço</div><div class="bo-ref-header-tools"><input class="bo-ref-title" data-edit="title" aria-label="Nome do Blueprint" value="'+esc(model.name)+'"><span class="bo-ref-saved">Salvo no projeto</span>'+
 button('customer-only','Visão do cliente','aria-pressed="'+String(!!ui.customerOnly)+'"')+
 (readOnly?'':button('link-mode','↗ Ligar notas','aria-pressed="'+String(!!ui.linking)+'"'))+
 (readOnly?'':button('undo','↶ Desfazer')+button('redo','↷ Refazer'))+
 button('advanced','Editor avançado')+
 button('back','Meus Blueprints')+
 (readOnly?'':button('stage-add','+ Nova etapa','class="primary"'))+
 '</div></div><input class="bo-ref-persona" data-edit="persona" aria-label="Persona e cenário" value="'+esc(model.persona||'')+'" placeholder="Persona e cenário: quem é o cliente e o que ele quer?">'+
 (ui.linking?'<p class="bo-ref-link-guide">Selecione a primeira nota e depois a de destino para criar ou remover uma conexão.</p>':'');
 root.innerHTML=header+'<div class="bo-ref-workspace"><div class="bo-ref-board" tabindex="0" aria-label="Matriz do Blueprint"><div class="bo-ref-grid" style="width:'+width+'px;--br-columns:200px repeat('+N+',200px) 56px">'+content+'<svg class="bo-ref-links" role="group" aria-label="Ligações entre notas"></svg></div></div>'+diagnosticsHtml(model)+'</div>';
 }
 const safeRun=(fn,...args)=>{if(typeof actions[fn]==='function')actions[fn](...args);};
 root.addEventListener('click',event=>{
   const button=event.target.closest('[data-action]');if(!button||button.disabled)return;
   const act=button.dataset.action,{id,stage,lane,type,index}=button.dataset;
   if(act==='undo'||act==='redo'||act==='advanced'||act==='back'||act==='stage-add'||act==='customer-only'||act==='link-mode'||act==='delivery'||act==='add-lane'){safeRun(act);return;}
   if(act==='setup-chip'||act==='setup-add'||act==='setup-create'){safeRun(act,{index:index===undefined?undefined:Number(index),title:q(root,'#br-setup-title')?.value||'',persona:q(root,'#br-setup-persona')?.value||'',newStage:q(root,'#br-setup-next')?.value||''});return;}
   if(act==='move-left'||act==='move-right')safeRun('move-stage',stage,act==='move-left'?-1:1);
   else if(act==='duplicate-stage')safeRun('duplicate-stage',stage);
   else if(act==='archive-stage')safeRun('archive-stage',stage);
   else if(act==='add-note')safeRun('add-note',stage,lane);
   else if(act==='duplicate-note')safeRun('duplicate-note',id);
   else if(act==='remove-note')safeRun('remove-note',id);
   else if(act==='details')safeRun('details',id);
   else if(act==='link')safeRun('link',id);
   else if(act==='add-issue')safeRun('add-issue',stage,type);
   else if(act==='severity'||act==='remove-issue')safeRun(act,id);
 });
 root.addEventListener('change',event=>{
   const el=event.target;
   if(el.dataset.change==='emotion')safeRun('emotion',el.dataset.stage,Number(el.value));
   else if(el.dataset.change==='quality')safeRun('quality',el.dataset.id,el.value);
 });
 root.addEventListener('blur',event=>{
   const el=event.target,edit=el.dataset.edit;if(!edit)return;
   safeRun('edit',edit,el.dataset.id||el.dataset.stage||el.dataset.lane,el.isContentEditable?el.innerText:el.value);
 },true);
 let drag=null;
 root.addEventListener('dragstart',event=>{
   const note=event.target.closest('.bo-ref-note[draggable="true"]');
   if(!note)return;drag={id:note.dataset.id,stage:note.dataset.stage,lane:note.dataset.lane};
   event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',drag.id);
 });
 root.addEventListener('dragover',event=>{const cell=event.target.closest('[data-cell-stage]');if(drag&&cell?.dataset.cellLane===drag.lane){event.preventDefault();cell.classList.add('drag-target')}});
 root.addEventListener('dragleave',event=>{const cell=event.target.closest('[data-cell-stage]');if(cell)cell.classList.remove('drag-target')});
 root.addEventListener('drop',event=>{const cell=event.target.closest('[data-cell-stage]');if(!drag||!cell||cell.dataset.cellLane!==drag.lane)return;event.preventDefault();qa(root,'.drag-target').forEach(x=>x.classList.remove('drag-target'));safeRun('move-note',drag.id,cell.dataset.cellStage,cell.dataset.cellLane);drag=null});
 root.addEventListener('dragend',()=>{drag=null;qa(root,'.drag-target').forEach(x=>x.classList.remove('drag-target'))});
 const drawLinks=()=>{
   const svg=q(root,'.bo-ref-links');if(!svg)return;
   const frame=svg.getBoundingClientRect(),pos=id=>{const el=qa(root,'.bo-ref-note[data-id]').find(el=>el.dataset.id===id);if(!el)return null;const r=el.getBoundingClientRect();return {x:r.left+r.width/2-frame.left,y:r.top+r.height/2-frame.top}};
   const paths=[];
   for(const edge of model.edges||[]){
     const a=pos(edge.fromId),b=pos(edge.toId);if(!a||!b)continue;
     const curve=Math.max(30,Math.abs(b.x-a.x)*.43);
     paths.push('<path d="M'+a.x+' '+a.y+' C'+(a.x+curve)+' '+a.y+' '+(b.x-curve)+' '+b.y+' '+b.x+' '+b.y+'" fill="none" stroke="var(--br-ac)" stroke-width="1.7" marker-end="url(#br-arrow)"/>');
   }
   svg.innerHTML='<defs><marker id="br-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--br-ac)"/></marker></defs>'+paths.join('');
 };
 requestAnimationFrame(drawLinks);
 const board=q(root,'.bo-ref-board');if(board){
   board.scrollLeft=ui.scrollLeft||0;board.scrollTop=ui.scrollTop||0;
   board.addEventListener('scroll',()=>safeRun('scroll',board.scrollLeft,board.scrollTop),{passive:true});
 }
}

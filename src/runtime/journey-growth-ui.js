/* UI helpers for the hosted matrix. Data edits still go through the canonical host. */
let growthStageOpen=false,growthStageTitle='',growthPresent=false,growthPlanIssue=null;
let growthLastPatch='';
function growthPatchKey(){return JSON.stringify({title:S.title,persona:S.persona,objective:S.objective,steps:S.steps,c:S.c,iss:S.iss,lanes:S.lanes,rowSettings:S.rowSettings,links:S.links})}
const growthEmotionDrafts=new Map();
const growthCount=(n,singular,plural=singular+'s')=>n+' '+(n===1?singular:plural);
const growthStatusLabels={backlog:'A organizar',planned:'Planejada',in_progress:'Em execução',validating:'Em validação',implemented:'Implementada'};
const growthEmotionKnown=s=>s.emotionRecorded===true||s.emotionRecorded===undefined&&(s.e!==0||!!s.note?.trim());
const growthEmotionKey=i=>S.steps[i].hostStageId||S.steps[i].hostLocalId||String(i);
function growthDraft(i){const key=growthEmotionKey(i);if(!growthEmotionDrafts.has(key)){const s=S.steps[i];growthEmotionDrafts.set(key,{score:s.e,mode:growthEmotionKnown(s)?s.emotionStatus||'hypothesis':'not_informed',note:s.note||'',source:s.emotionSource||''})}return growthEmotionDrafts.get(key)}
function growthEmotionCurvePath(points){
  let path='';
  points.forEach((p,i)=>{if(!p.known)return;const before=points[i-1];if(!before?.known)path+=' M'+p.x+' '+p.y;else{const middle=(before.x+p.x)/2;path+=' C'+middle+' '+before.y+' '+middle+' '+p.y+' '+p.x+' '+p.y}});
  return path;
}
const growthEmotionState=s=>!growthEmotionKnown(s)?'unknown':s.emotionStatus==='validated'&&s.emotionSource?.trim()?'validated':'hypothesis';
const growthEmotionStateName=state=>({unknown:'Não informado',hypothesis:'Hipótese',validated:'Validado'})[state];
const growthEmotionScore=s=>Math.max(-2,Math.min(2,Math.round(Number(s.e)||0)));
function growthEmotionLabel(s){return growthEmotionKnown(s)?EM[growthEmotionScore(s)+2]:'Sem registro'}
function growthEmotionPointTitle(s){return growthEmotionLabel(s)+' · '+growthEmotionStateName(growthEmotionState(s))+(growthEmotionKnown(s)?' · '+(growthEmotionScore(s)>0?'+':'')+growthEmotionScore(s):'')}
function growthEmotionAccessibleState(s){return growthEmotionKnown(s)?EM[growthEmotionScore(s)+2]+' · '+growthEmotionStateName(growthEmotionState(s)):'Não informado'}
function growthEmotionScale(W){
 const lines=[2,1,0,-1,-2].map(score=>{
  const y=16+(2-score)*14,level=score>0?'+'+score:String(score);
  return '<line data-emotion-level="'+score+'" x1="0" y1="'+y+'" x2="'+W+'" y2="'+y+'" class="emotion-grid-line'+(score===0?' is-neutral':'')+'" vector-effect="non-scaling-stroke"/>';
 }).join('');
 return '<svg class="emotion-plot" viewBox="0 0 '+W+' 112" preserveAspectRatio="none" role="img" aria-label="Curva de emoções com escala de menos dois a mais dois; pontos vazios representam hipóteses ou ausência de registro. Lacunas não são tratadas como neutras.">'+
 lines;
}
function growthEmotionLegend(){
 const counts={unknown:0,hypothesis:0,validated:0};
 S.steps.forEach(stage=>counts[growthEmotionState(stage)]++);
 return '<div class="emotion-legend" role="group" aria-label="Legenda dos registros de emoção">'+
 '<span class="emotion-legend-item"><i class="emotion-legend-dot unknown" aria-hidden="true"></i>Não informado <b>'+counts.unknown+'</b></span>'+
 '<span class="emotion-legend-item"><i class="emotion-legend-dot hypothesis" aria-hidden="true"></i>Hipótese <b>'+counts.hypothesis+'</b></span>'+
 '<span class="emotion-legend-item"><i class="emotion-legend-dot validated" aria-hidden="true"></i>Validado <b>'+counts.validated+'</b></span>'+
 '<small class="emotion-legend-help">Arraste um ponto para mudar a intensidade; alterações validadas voltam a ser hipóteses.</small></div>';
}
function growthCurve(){
 const N=S.steps.length,W=Math.max(100,N*100),points=S.steps.map((stage,i)=>({x:i*100+50,y:16+(2-growthEmotionScore(stage))*14,known:growthEmotionKnown(stage),s:stage}));
 const path=growthEmotionCurvePath(points);
 const ticks=[2,1,0,-1,-2].map(score=>'<span class="emotion-axis-tick" data-emotion-tick="'+score+'" style="top:'+(16+(2-score)*14)+'px" title="'+({2:'Muito positiva',1:'Positiva',0:'Neutra','-1':'Negativa','-2':'Muito negativa'}[score])+'">'+(score>0?'+'+score:score)+'</span>').join('');
 const curve=growthEmotionScale(W)+'<path data-emotion-curve-line="1" d="'+path+'" fill="none" stroke="var(--ac)" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>'+
 '<div class="emotion-axis" aria-hidden="true">'+ticks+'</div>'+
 points.map((p,i)=>{
  const state=growthEmotionState(p.s),top=p.known?p.y:44,title=growthEmotionPointTitle(p.s);
  return '<button type="button" class="dt '+state+'" data-act="emotion-edit" data-emotion-state="'+state+'" data-si="'+i+'" aria-keyshortcuts="ArrowUp ArrowDown Home End" style="left:'+p.x/W*100+'%;top:'+top+'px" title="'+esc(title)+'" aria-label="Editar emoção em '+esc(p.s.n)+': '+esc(growthEmotionAccessibleState(p.s))+'" aria-expanded="'+(emotionEdit===i||V.emotionsExpanded)+'"></button>'+
   '<span class="dl" data-emotion-curve-label="'+i+'" title="'+esc(title)+'" style="left:'+p.x/W*100+'%;top:'+(top+16)+'px">'+esc(growthEmotionLabel(p.s))+'</span>';
 }).join('');
 return curve;
}

let growthEmotionDrag=null;
let growthEmotionSuppressUntil=0;
function growthEmotionRefreshPoint(i){
  const box=app.querySelector('#curve'),stage=S.steps[i];
  if(!box||!stage)return;
  const points=S.steps.map((s,j)=>({x:j*100+50,y:16+(2-growthEmotionScore(s))*14,known:growthEmotionKnown(s)}));
  box.querySelector('[data-emotion-curve-line]')?.setAttribute('d',growthEmotionCurvePath(points));
  const dot=box.querySelector('.dt[data-si="'+i+'"]'),label=box.querySelector('[data-emotion-curve-label="'+i+'"]');
  const state=growthEmotionState(stage),top=growthEmotionKnown(stage)?16+(2-growthEmotionScore(stage))*14:44,title=growthEmotionPointTitle(stage);
  if(dot){dot.style.top=top+'px';dot.classList.toggle('unknown',state==='unknown');dot.classList.toggle('validated',state==='validated');dot.classList.toggle('hypothesis',state==='hypothesis');dot.dataset.emotionState=state;dot.title=title;dot.setAttribute('aria-label','Editar emoção em '+stage.n+': '+growthEmotionAccessibleState(stage))}
  if(label){label.style.top=(top+16)+'px';label.textContent=growthEmotionLabel(stage);label.title=title}
  const legend=app.querySelector('.emotion-legend');if(legend)legend.outerHTML=growthEmotionLegend();
}
function growthEmotionPointerDown(event){
  const dot=event.target.closest?.('#curve .dt[data-act="emotion-edit"]');
  if(!dot||!event.isPrimary||event.button!==0)return;
  const i=Number(dot.dataset.si),stage=S.steps[i],box=app.querySelector('#curve');
  if(!stage||!box)return;
  growthEmotionDrag={pointerId:event.pointerId,i,startY:event.clientY,rect:box.getBoundingClientRect(),moved:false,original:{e:stage.e,emotionRecorded:stage.emotionRecorded,emotionStatus:stage.emotionStatus,emotionSource:stage.emotionSource},known:growthEmotionKnown(stage)};
  dot.setPointerCapture?.(event.pointerId);
}
function growthEmotionPointerMove(event){
  const drag=growthEmotionDrag;
  if(!drag||drag.pointerId!==event.pointerId)return;
  if(!drag.moved&&Math.abs(event.clientY-drag.startY)<5)return;
  drag.moved=true;
  event.preventDefault();
  const fraction=(event.clientY-drag.rect.top)/Math.max(1,drag.rect.height);
  const score=Math.max(-2,Math.min(2,Math.round(2-(fraction*112-16)/14)));
  const stage=S.steps[drag.i];
  if(!stage)return;
  stage.e=score;
  if(score!==drag.original.e||!drag.known){stage.emotionRecorded=true;stage.emotionStatus='hypothesis';stage.emotionSource=''}
  growthEmotionRefreshPoint(drag.i);
}
function growthEmotionPointerEnd(event,cancel=false){
  const drag=growthEmotionDrag;
  if(!drag||drag.pointerId!==event.pointerId)return;
  growthEmotionDrag=null;
  const stage=S.steps[drag.i];
  if(!stage)return;
  const changed=!cancel&&drag.moved&&(stage.e!==drag.original.e||!drag.known);
  if(!changed)Object.assign(stage,drag.original);
  if(drag.moved){growthEmotionSuppressUntil=Date.now()+450;event.preventDefault()}
  if(changed){growthEmotionDrafts.delete(growthEmotionKey(drag.i));save()}
  if(drag.moved)live();
}
function growthEmotionIgnoreClick(event){
  if(Date.now()>growthEmotionSuppressUntil||!event.target.closest?.('#curve .dt[data-act="emotion-edit"]'))return false;
  growthEmotionSuppressUntil=0;event.preventDefault();event.stopPropagation();return true;
}
function growthEmotionFields(i){const s=S.steps[i],d=growthDraft(i);return '<div class="emotion-editor" data-emotion-editor="'+i+'" style="grid-column:'+(i+1)+'" role="group" aria-label="Emoção em '+esc(s.n)+'"><label>Registro<select data-emotion-field="mode" aria-label="Tipo de registro em '+esc(s.n)+'">'+[['not_informed','Não informado'],['hypothesis','Hipótese da equipe'],['validated','Validado com evidência']].map(([value,label])=>'<option value="'+value+'" '+(d.mode===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label><label>Emoção / intensidade<output data-draft-label="'+i+'">'+EM[d.score+2]+'</output><input type="range" min="-2" max="2" step="1" value="'+d.score+'" data-act="emo" data-emotion-field="score" data-si="'+i+'" aria-label="Intensidade em '+esc(s.n)+'"></label><label>Observação<textarea maxlength="1000" data-emotion-field="note" aria-label="Observação emocional em '+esc(s.n)+'">'+esc(d.note)+'</textarea></label><label>Fonte da evidência<input maxlength="1000" data-emotion-field="source" aria-label="Fonte da evidência em '+esc(s.n)+'" placeholder="Ex.: entrevista ou pesquisa" value="'+esc(d.source)+'"></label><small>Para validar, informe a fonte. A confirmação é feita pela equipe.</small><div class="emotion-actions"><button class="tb" data-act="emotion-cancel" data-si="'+i+'">Cancelar</button><button class="tb" data-act="emotion-done" data-si="'+i+'">Concluir</button></div></div>'}
function growthEmotionInput(el){const box=el.closest('[data-emotion-editor]');if(!box)return false;const i=Number(box.dataset.emotionEditor),draft=growthDraft(i),field=el.dataset.emotionField;
  if(field){draft[field]=field==='score'?Number(el.value):el.value;if(field==='score'&&draft.mode==='not_informed'){draft.mode='hypothesis';box.querySelector('select').value='hypothesis'}box.querySelector('output').textContent=EM[draft.score+2];box.querySelector('[data-emotion-field="source"]').setCustomValidity('')}
  return true;
}
function growthCommitEmotion(i){const d=growthDraft(i),source=app.querySelector('[data-emotion-editor="'+i+'"] [data-emotion-field="source"]');
  if(d.mode==='validated'&&!d.source.trim()){source.setCustomValidity('Informe a fonte da evidência.');source.reportValidity();return}
  Object.assign(S.steps[i],{e:d.score,note:d.note,emotionRecorded:d.mode!=='not_informed',emotionStatus:d.mode==='validated'?'validated':'hypothesis',emotionSource:d.source});
  growthEmotionDrafts.delete(growthEmotionKey(i));save();emotionEdit=null;changeView({emotionsExpanded:false},'[data-act="emotion-edit"][data-si="'+i+'"]');
}
function growthStageColumn(){return '<div class="stage-next"><button class="tb" data-act="step" aria-label="Adicionar etapa à direita">+ Etapa</button></div>'}
function growthOpenStage(){growthStageOpen=true;growthStageTitle='';const panel=app.querySelector('#growth-stage-popover');panel.innerHTML='<form id="growth-stage-form"><div class="panel-head"><label for="growth-stage-name">Nome da nova etapa</label><button class="x" type="button" data-act="cancel-stage" aria-label="Fechar nova etapa">×</button></div><input id="growth-stage-name" name="stage" maxlength="240" required placeholder="Ex.: Buscar uma solução" autocomplete="off"><small>Enter adiciona e permite continuar. Escape cancela.</small><div class="stage-actions"><button class="tb" type="button" data-act="cancel-stage">Cancelar</button><button class="tb p" type="submit">Adicionar etapa ao mapa</button></div></form>';panel.showPopover();const anchor=app.querySelector('.stage-next>button')||app.querySelector('[data-act="step"]'),rect=anchor.getBoundingClientRect(),width=Math.min(340,innerWidth-24);panel.style.width=width+'px';panel.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';panel.style.top=Math.max(12,Math.min(rect.bottom+6,innerHeight-panel.offsetHeight-12))+'px';panel.querySelector('input').focus()}
function growthCreateStage(keepOpen=false){const field=app.querySelector('#growth-stage-name'),name=field?.value.trim();if(!name){field?.reportValidity();return}S.steps.push({n:name,e:0,d:'',emotionRecorded:false,hostLocalId:uid()});growthStageTitle='';growthStageOpen=keepOpen;save();rerender();if(keepOpen)growthOpenStage();else{const target=[...app.querySelectorAll('.sh [data-ed="sn"]')].at(-1);target?.focus();target?.scrollIntoView({block:'nearest',inline:'nearest'})}}
function growthCell(l,i){return contentCell(l,i)}
function growthIssueKey(issue){return issue.hostEntityId||issue.hostLocalId||''}
function growthPlanFor(issue){const key=growthIssueKey(issue);return (S.plans||[]).find(p=>p.problemId===key||p.sourceLocalId===key)}
function growthIssueActions(issue,index){if(!HOSTED||issue.t!=='d'||!issue.x.trim())return '';const plan=growthPlanFor(issue);return '<div class="issue-next"><button data-act="context-pain" data-source="'+esc(growthIssueKey(issue))+'" data-si="'+issue.s+'">Ver evidências</button><button data-act="plan" data-ii="'+index+'">'+(plan?'Editar plano':'Planejar melhoria')+'</button>'+(plan?'<span>'+esc(growthStatusLabels[plan.status])+'</span><button data-act="track-plan" data-ii="'+index+'">Acompanhar</button>':'')+'</div>'}
function growthDialogs(){return '<dialog class="growth-dialog" id="growth-plan-dialog" aria-labelledby="growth-plan-title"></dialog><dialog class="growth-dialog" id="growth-track-dialog" aria-labelledby="growth-track-title"></dialog>'}
function growthOpenPlan(index){const issue=S.iss[index];if(!issue||!issue.x.trim())return;growthPlanIssue=index;const plan=growthPlanFor(issue),dialog=app.querySelector('#growth-plan-dialog');
  dialog.innerHTML='<form id="growth-plan-form"><div class="panel-head"><h2 id="growth-plan-title">'+(plan?'Editar plano':'Planejar melhoria')+'</h2><button type="button" class="x" data-act="close-plan" aria-label="Fechar plano">×</button></div><p class="source-pain">Dor: '+esc(issue.x)+'</p>'+contextPainReport(issue)+'<label>Ação proposta<input name="title" maxlength="240" required value="'+esc(plan?.title||'')+'" placeholder="O que será feito para reduzir esta dor?"></label><div class="form-grid"><label>Responsável<input name="owner" maxlength="240" value="'+esc(plan?.owner||'')+'" placeholder="Pessoa ou equipe"></label><label>Prazo<input type="date" name="targetDate" value="'+esc(plan?.targetDate||'')+'"></label></div><label>Resultado esperado<textarea name="expectedOutcome" maxlength="1000" placeholder="Qual mudança esperamos observar?">'+esc(plan?.expectedOutcome||'')+'</textarea></label><label>Status<select name="status" aria-label="Status">'+Object.entries(growthStatusLabels).map(([value,label])=>'<option value="'+value+'" '+((plan?.status||'planned')===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label><details class="metric-config"><summary>Indicador de acompanhamento · opcional</summary><label>Vincular indicador<select name="metricId" aria-label="Vincular indicador"><option value="">Criar um indicador</option>'+((S.availableMetrics)||[]).map(m=>'<option value="'+esc(m.id)+'" '+(plan?.metrics?.[0]?.id===m.id?'selected':'')+'>'+esc(m.name)+'</option>').join('')+'</select></label><p class="hint" data-existing-metric>Os dados de um indicador existente são preservados. Registre novos valores em Acompanhar.</p><fieldset data-new-metric><legend>Novo indicador</legend><label>Nome do indicador<input name="metricName" maxlength="240" placeholder="Ex.: tempo de espera"></label><div class="form-grid"><label>Unidade<input name="unit" maxlength="80" placeholder="Ex.: minutos"></label><label>Direção<select name="direction" aria-label="Direção"><option value="at_most">Quanto menor, melhor</option><option value="at_least">Quanto maior, melhor</option></select></label><label>Valor inicial<input type="number" step="any" name="baseline" placeholder="Não informado"></label><label>Meta<input type="number" step="any" name="target" placeholder="Não informada"></label></div></fieldset></details><p class="form-error" role="alert"></p><footer><button class="tb" type="button" data-act="close-plan">Cancelar</button><button class="tb p" type="submit">Salvar plano</button></footer></form>';
  growthMetricToggle(dialog.querySelector('[name="metricId"]'));dialog.showModal();dialog.querySelector('[name="title"]').focus();
}
function growthMetricToggle(select){const dialog=select.closest('dialog'),existing=!!select.value;dialog.querySelector('[data-new-metric]').disabled=existing;dialog.querySelector('[data-new-metric]').hidden=existing;dialog.querySelector('[data-existing-metric]').hidden=!existing}
function growthSubmitPlan(form){if(!form.reportValidity())return;const input=Object.fromEntries(new FormData(form)),issue=S.iss[growthPlanIssue];form.querySelector('[type="submit"]').disabled=true;announceSave('pending');window.parent.postMessage({boBlueprintHost:1,type:'plan-save',problemId:growthIssueKey(issue),input},location.origin)}
function growthMetricText(metric){const value=metric.current===undefined?'Sem medição':String(metric.current)+(metric.unit?' '+metric.unit:'');return value+' · Meta: '+(metric.target===undefined?'não informada':String(metric.target)+(metric.unit?' '+metric.unit:''))}
function growthOpenTracking(index){const issue=S.iss[index],plan=growthPlanFor(issue);if(!plan)return;growthPlanIssue=index;const dialog=app.querySelector('#growth-track-dialog');
 dialog.innerHTML='<div class="panel-head"><h2 id="growth-track-title">Acompanhar melhoria</h2><button class="x" data-act="close-track" aria-label="Fechar acompanhamento">×</button></div><h3>'+esc(plan.title)+'</h3><p>'+esc(growthStatusLabels[plan.status])+' · '+esc(plan.owner||'Responsável não informado')+'</p><p>'+esc(plan.expectedOutcome||'Resultado esperado não informado')+'</p>'+(!plan.metrics.length?'<p>Este plano ainda não tem indicador. Use Editar plano para vincular um.</p>':'')+plan.metrics.map(metric=>'<section class="tracking-metric"><h3>'+esc(metric.name)+'</h3><p>'+esc(growthMetricText(metric))+'</p><small>'+({unmeasured:'Resultado ainda não medido',on_target:'Meta atingida segundo as medições registradas',off_target:'Meta ainda não atingida'}[metric.status])+'</small><form class="growth-measure-form" data-plan-id="'+esc(plan.id)+'" data-metric-id="'+esc(metric.id)+'"><label>Novo valor medido<input type="number" step="any" name="value" required placeholder="Informe uma medição real"></label><label>Observação da medição<input name="note" maxlength="1000" placeholder="Fonte ou contexto da medição"></label><p class="form-error" role="alert"></p><button class="tb p" type="submit">Registrar medição</button></form><details><summary>Histórico de medições ('+metric.readings.length+')</summary><ul>'+metric.readings.map(m=>'<li>'+esc(String(m.value)+(metric.unit?' '+metric.unit:''))+' · '+esc(new Date(m.measuredAt).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}))+(m.note?' · '+esc(m.note):'')+'</li>').join('')+'</ul></details></section>').join('');dialog.showModal();dialog.querySelector('button').focus();
}
function growthSubmitMeasurement(form){if(!form.reportValidity())return;const data=new FormData(form);form.querySelector('[type="submit"]').disabled=true;announceSave('pending');window.parent.postMessage({boBlueprintHost:1,type:'plan-measure',planId:form.dataset.planId,metricId:form.dataset.metricId,value:data.get('value'),note:data.get('note')},location.origin)}
function growthPlanResult(data){const old=S.iss[growthPlanIssue],key=old&&growthIssueKey(old);if(!data.ok){const form=app.querySelector('dialog[open] form'),error=form?.querySelector('.form-error');if(error)error.textContent=data.error||'Não foi possível salvar.';if(form)form.querySelector('[type="submit"]').disabled=false;announceSave(false);return}
  S=data.state;H=S.history||H;last=JSON.stringify(S);growthLastPatch=growthPatchKey();growthEmotionDrafts.clear();announceSave(true);rerender();const index=S.iss.findIndex(issue=>growthIssueKey(issue)===key||issue.hostLocalId===key);if(index>=0)focusNew('[data-act="plan"][data-ii="'+index+'"]');
}
function growthCloseDialog(id){app.querySelector('#'+id)?.close();focusNew('[data-act="plan"][data-ii="'+growthPlanIssue+'"]')}
function growthSummaryBody(){
  if(growthPresentationMode==='view')return viewsSummaryBody();
  const pains=S.iss.filter(i=>i.t==='d'&&i.x.trim()),plans=S.plans||[],known=S.steps.filter(growthEmotionKnown),validated=known.filter(s=>s.emotionStatus==='validated'&&s.emotionSource?.trim());
  const section=(title,body)=>'<section><h2>'+title+'</h2>'+body+'</section>';
  let body='<article class="executive-report"><header><small>BLUE OCEAN · RESUMO EXECUTIVO</small><h1>'+esc(S.title||'Jornada')+'</h1><p>'+esc(S.serviceName||'Serviço')+'</p></header>';
  body+=section('Contexto','<dl><dt>Persona da jornada</dt><dd>'+esc(contextPersonaName())+'</dd><dt>Cenário</dt><dd>'+esc(S.persona||'Não informado')+'</dd><dt>Objetivo da Jornada</dt><dd>'+esc(S.objective||'Não informado')+'</dd></dl>');
  body+=section('Leitura do mapa','<p>'+growthCount(S.steps.length,'etapa')+' · '+growthCount(pains.length,'dor registrada','dores registradas')+' · '+growthCount(plans.length,'plano de melhoria','planos de melhoria')+'.</p><p>Emoções: '+growthCount(validated.length,'registro validado','registros validados')+' com fonte informada, '+growthCount(known.length-validated.length,'hipótese')+' e '+growthCount(S.steps.length-known.length,'etapa sem registro','etapas sem registro')+'.</p><p>Os registros representam as informações fornecidas pela equipe. Uma hipótese ou uma ação concluída não comprova resultado.</p>');
  body+=section('Experiência por etapa',S.steps.map((stage,index)=>'<div class="report-stage"><h3>'+(index+1)+'. '+esc(stage.n)+'</h3><p><b>Contexto:</b> '+esc(stage.d||'Não informado')+'</p><div><b>Ações do cliente:</b> '+((S.c['ac|'+index]||[]).length?contentReportNotes(S.c['ac|'+index]):'<p>Não informadas</p>')+'</div><p><b>Emoção:</b> '+(growthEmotionKnown(stage)?esc(EM[stage.e+2]+' · '+(stage.emotionStatus==='validated'&&stage.emotionSource?.trim()?'Validado pela equipe':'Hipótese')):'Não informada')+'</p>'+(stage.emotionSource?'<p><b>Fonte:</b> '+esc(stage.emotionSource)+'</p>':'')+(stage.note?'<p>'+esc(stage.note)+'</p>':'')+rowDefs().filter(r=>['go','ch','pr','br','rr','ki'].includes(r.id)).map(r=>{const notes=(S.c[r.id+'|'+index]||[]).filter(n=>n.t||pickerReferenceTypes.includes(n.type));return notes.length?'<div><b>'+esc(r.n)+':</b> '+contentReportNotes(notes)+'</div>':''}).join('')+contentReportRows(index)+'</div>').join(''));
  body+=section('Dores e evidências',pains.length?'<ol>'+pains.map(p=>'<li><b>'+esc(S.steps[p.s]?.n||'Etapa')+':</b> '+esc(p.x)+contextPainReport(p)+'</li>').join('')+'</ol><p>As dores registradas precisam ser investigadas; a classificação de gravidade é informada pela equipe.</p>':'<p>Nenhuma dor registrada.</p>');
  body+=section('Plano de melhoria e indicadores',plans.length?plans.map(plan=>'<div class="report-stage"><h3>'+esc(plan.title)+'</h3><p>Dor de origem: '+esc(plan.problem)+'</p><dl><dt>Responsável</dt><dd>'+esc(plan.owner||'Não informado')+'</dd><dt>Prazo</dt><dd>'+esc(plan.targetDate||'Não informado')+'</dd><dt>Status</dt><dd>'+esc(growthStatusLabels[plan.status])+'</dd><dt>Resultado esperado</dt><dd>'+esc(plan.expectedOutcome||'Não informado')+'</dd></dl>'+(!plan.metrics.length?'<p>Sem indicador vinculado.</p>':plan.metrics.map(m=>'<p><b>'+esc(m.name)+':</b> '+esc(growthMetricText(m))+' · Inicial: '+esc(m.baseline===undefined?'não informado':String(m.baseline))+'</p>').join(''))+'</div>').join(''):'<p>Nenhum plano criado. Planeje uma melhoria a partir de uma dor registrada.</p>');
  body+=section('Próxima decisão',!S.steps.length?'<p>Defina o primeiro momento da experiência.</p>':!pains.length?'<p>Converse com clientes e equipe para investigar dificuldades nesta experiência.</p>':!plans.length?'<p>Escolha uma dor para discutir uma ação, um responsável e um resultado esperado.</p>':'<p>Revise as ações com a equipe e registre medições para verificar seus efeitos.</p>');
  return body+'</article>';
}
function growthShowPresentation(){growthPresent=true;document.body.classList.add('is-presenting');app.innerHTML='<nav class="report-toolbar" aria-label="Apresentação"><button class="tb" data-act="close-presentation" aria-label="Voltar ao mapa">← Voltar ao mapa</button><button class="tb" data-act="download-summary">Baixar resumo HTML</button><button class="tb p" data-act="print-summary">Imprimir / PDF</button></nav>'+growthSummaryBody();window.scrollTo(0,0);app.querySelector('button').focus()}
function growthAction(action,data){
  if(action==='cancel-stage'){growthStageOpen=false;growthStageTitle='';rerender();focusNew('[data-act="step"]');return true}
  if(action==='emotion-cancel'){growthEmotionDrafts.delete(growthEmotionKey(Number(data.si)));emotionEdit=null;V.emotionsExpanded=false;rerender();focusNew('[data-act="emotion-edit"][data-si="'+data.si+'"]');return true}
  if(action==='fit'){changeView({fitToScreen:!V.fitToScreen},'[data-act="fit"]');return true}
  if(action==='present'){growthPresentationMode='executive';growthShowPresentation();return true}
  if(action==='close-presentation'){growthPresentationMode='executive';growthPresent=false;document.body.classList.remove('is-presenting');rerender();focusNew('[data-act="present"]');return true}
  if(action==='print-summary'){window.print();return true}
  if(action==='download-summary'){growthDownloadSummary();return true}
  if(action==='backup'){window.parent.postMessage({boBlueprintHost:1,type:'backup'},location.origin);return true}
  if(action==='plan'){growthOpenPlan(Number(data.ii));return true}
  if(action==='track-plan'){growthOpenTracking(Number(data.ii));return true}
  if(action==='close-plan'){growthCloseDialog('growth-plan-dialog');return true}
  if(action==='close-track'){growthCloseDialog('growth-track-dialog');return true}
  return false;
}
function growthDownloadSummary(){const css='body{font:15px/1.6 system-ui,sans-serif;color:#142137;max-width:960px;margin:32px auto;padding:24px}section{margin:28px 0;border-top:1px solid #dce3ec;padding-top:16px}h1{font-size:32px}h2{font-size:20px}h3{font-size:17px}dt{font-weight:600}dd{margin:0 0 10px}small{color:#51607a}.report-stage{break-inside:avoid;margin:20px 0}@media print{body{margin:0;max-width:none}}';const data='<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Resumo da Jornada</title><style>'+css+'</style><body>'+growthSummaryBody()+'</body></html>';const url=URL.createObjectURL(new Blob([data],{type:'text/html;charset=utf-8'})),anchor=document.createElement('a');anchor.href=url;anchor.download='blue-ocean-resumo-jornada.html';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}

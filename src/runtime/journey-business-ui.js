/* Business guidance uses the existing map, plans and recovery tools. */
let businessStage='',businessReviewFilter='all';
function businessKey(){return 'bo-business-view:'+String(S.journeyId||S.title||'map')}
function businessPrefs(){try{return JSON.parse(sessionStorage.getItem(businessKey())||'{}')}catch{return {}}}
function businessSet(patch){try{sessionStorage.setItem(businessKey(),JSON.stringify({...businessPrefs(),...patch}))}catch{}}
function businessFocusMode(){return businessPrefs().focus===true&&S.steps.length>0}
function businessStageIndex(){const i=S.steps.findIndex(step=>(step.hostLocalId||step.hostStageId)===businessStage);return i<0?0:i}
function businessGuided(){const value=businessPrefs().guided;return typeof value==='boolean'?value:!!S.objective}
function businessAfterRender(){document.body.classList.toggle('business-guided',businessGuided())}
function businessHeader(){return '<section class="business-header" aria-label="Orientação e revisão do negócio"><div><b>'+esc(S.objective||'Melhore uma parte do seu serviço')+'</b><small>1. Descreva o atendimento → 2. Registre um problema → 3. Planeje e acompanhe uma melhoria</small></div><div class="business-actions"><button class="tb" data-act="business-guided" aria-pressed="'+businessGuided()+'">'+(businessGuided()?'Mostrar todos os comandos':'Começar com orientação')+'</button><button class="tb" data-act="business-focus" aria-pressed="'+businessFocusMode()+'" '+(!S.steps.length?'disabled':'')+'>'+(businessFocusMode()?'Ver mapa completo':'Uma etapa por vez')+'</button><button class="tb" data-act="business-review">Revisar e melhorar</button><button class="tb" data-act="business-storage">Dados e backup</button></div></section>'}
function businessFocus(rows){
 const i=businessStageIndex(),step=S.steps[i];businessStage=step.hostLocalId||step.hostStageId;
 let html='<main class="business-focus" aria-label="Uma etapa por vez"><nav class="business-stage-nav" aria-label="Navegar entre etapas"><button class="tb" data-act="business-stage" data-d="-1" '+(!i?'disabled':'')+' aria-label="Etapa anterior">‹</button><label>Etapa '+(i+1)+' de '+S.steps.length+'<select data-business-stage aria-label="Etapa em foco">'+S.steps.map((value,index)=>'<option value="'+index+'" '+(index===i?'selected':'')+'>'+esc(value.n)+'</option>').join('')+'</select></label><button class="tb" data-act="business-stage" data-d="1" '+(i===S.steps.length-1?'disabled':'')+' aria-label="Próxima etapa">›</button></nav><h2 contenteditable="true" role="textbox" aria-label="Nome da etapa" data-ed="sn" data-si="'+i+'">'+esc(step.n)+'</h2><div class="business-stage-actions"><button class="tb" data-act="mv" data-si="'+i+'" data-d="-1" '+(!i?'disabled':'')+'>Mover antes</button><button class="tb" data-act="mv" data-si="'+i+'" data-d="1" '+(i===S.steps.length-1?'disabled':'')+'>Mover depois</button><button class="tb" data-act="ds" data-si="'+i+'">Duplicar etapa</button><button class="tb" data-act="del" data-si="'+i+'">Remover etapa</button></div>';
 for(const row of rows){html+='<section class="business-focus-lane" data-row="'+esc(row.id)+'"><h3>'+esc(row.n)+'</h3><p class="hint">'+esc(row.h||'')+'</p>';
  if(row.id==='sd')html+='<div contenteditable="true" role="textbox" aria-label="Contexto em '+esc(step.n)+'" data-ed="sd" data-si="'+i+'">'+esc(step.d||'')+'</div>';
  if(row.id==='em')html+=growthEmotionFields(i);
  if(row.id==='im')html+=S.iss.map((issue,index)=>issue.s===i?item(issue,index):'').join('')+'<div class="bt"><button data-act="addi" data-si="'+i+'" data-t="d">+ Dor</button><button data-act="addi" data-si="'+i+'" data-t="i">+ Ideia</button></div>';
  html+=contentCell(row.id,i)+'</section>';
 }
 return html+'<button class="tb" data-act="customize">Mostrar outras faixas</button>';
}
function businessDialogs(){return '<dialog class="growth-dialog business-dialog" id="business-review" aria-labelledby="business-review-title"></dialog><dialog class="growth-dialog business-dialog" id="business-storage" aria-labelledby="business-storage-title"></dialog>'}
function businessReviewItems(){
 const result=[];
 for(const entry of blueprintNotes()){
  const row=entry.key.split('|')[0],activity=blueprintActivity(entry.note,row);
  if(!['fl','bk','sy'].includes(row)||!window.BlueOceanJourneyContent.matrixCardHasContent(entry.note))continue;
  const caption=blueprintCaption(entry);
  if(activity.category!=='resource'&&!activity.owner.trim())result.push({kind:'owner',title:caption,detail:'Defina quem responde por esta atividade.',action:'activity',id:entry.note.i});
  if(activity.waitMinutes>0)result.push({kind:'wait',title:caption,detail:'Espera registrada: '+activity.waitMinutes+' min. Confirme a causa com a equipe.',action:'activity',id:entry.note.i});
  if(activity.durationMinutes!==null&&activity.targetMinutes!==null&&activity.durationMinutes+(activity.waitMinutes||0)>activity.targetMinutes)result.push({kind:'wait',title:caption,detail:'Execução e espera registradas ultrapassam o prazo combinado. Os valores são os informados no mapa.',action:'activity',id:entry.note.i});
 }
 for(const link of S.links||[]){if(!['dependency','handoff'].includes(link.type))continue;
  const from=blueprintNote(link.a),to=blueprintNote(link.b),handoff=link.handoff||{};
  result.push({kind:link.type==='handoff'?'handoff':'dependency',title:(from?blueprintCaption(from):'Origem indisponível')+' → '+(to?blueprintCaption(to):'Destino indisponível'),detail:link.type==='handoff'?(!handoff.acceptance||handoff.deadlineMinutes==null?'Complete o prazo e a condição de aceite da transferência.':'Confira se a entrega, o prazo e o aceite continuam combinados.'):'Confira se a atividade de destino pode começar e quem libera esta dependência.',action:'link',id:link.id});
 }
 const placedPains=new Map(blueprintNotes().filter(entry=>entry.note.type==='pain').map(entry=>[entry.note.referenceId,Number(entry.key.split('|')[1])]));
 for(const [id,index] of placedPains){const source=contextPain(id);if(source?.kind==='research'&&!S.iss.some(issue=>contextPain(growthIssueKey(issue))?.sourcePainId===id))result.push({kind:'improvement',title:source.title,detail:'Próximo passo: revisar as evidências e escolher uma ação para este problema.',action:'pain',id,index})}
 S.iss.forEach((issue,index)=>{if(issue.t!=='d'||!issue.x.trim())return;const plan=growthPlanFor(issue);
  result.push({kind:'improvement',title:issue.x,detail:!plan?'Próximo passo: escolher uma ação de melhoria.':!plan.owner?'Próximo passo: definir responsável pela melhoria.':!plan.metrics?.length?'Próximo passo: escolher um indicador para observar o resultado.':plan.metrics.some(metric=>!metric.readings?.length)?'Próximo passo: registrar uma medição real.':'Próximo passo: revisar as medições com a equipe e decidir se a ação deve continuar ou mudar.',action:plan?.metrics?.length?'tracking':'plan',index,plan});
 });
 return result;
}
function businessOpenReview(){
 const dialog=app.querySelector('#business-review'),items=businessReviewItems(),visible=items.filter(item=>businessReviewFilter==='all'||item.kind===businessReviewFilter),labels={all:'Tudo',owner:'Sem responsável',wait:'Esperas e prazos',dependency:'Dependências',handoff:'Transferências',improvement:'Melhorias'};
 dialog.innerHTML='<div class="panel-head"><h2 id="business-review-title">Revisar e melhorar</h2><button class="x" data-act="business-close-review" aria-label="Fechar revisão">×</button></div><p>Escolha uma pendência, combine uma ação e acompanhe o resultado. A revisão usa os dados registrados neste mapa.</p><label>Revisar<select data-business-review-filter aria-label="Tipo de revisão">'+Object.entries(labels).map(([value,label])=>'<option value="'+value+'" '+(value===businessReviewFilter?'selected':'')+'>'+label+' ('+(value==='all'?items.length:items.filter(item=>item.kind===value).length)+')</option>').join('')+'</select></label><p role="status">'+visible.length+' ponto(s) para revisar</p><div class="business-review-list">'+(visible.length?visible.map(entry=>'<article><small>'+labels[entry.kind]+'</small><h3>'+esc(entry.title)+'</h3><p>'+esc(entry.detail)+'</p>'+(entry.plan?'<dl><dt>Ação</dt><dd>'+esc(entry.plan.title)+'</dd><dt>Responsável</dt><dd>'+esc(entry.plan.owner||'Não definido')+'</dd><dt>Indicador</dt><dd>'+esc(entry.plan.metrics.map(metric=>metric.name+' · '+growthMetricText(metric)).join('; ')||'Não definido')+'</dd></dl>':'')+'<button class="tb" data-act="business-resolve" data-index="'+items.indexOf(entry)+'">'+({activity:'Revisar atividade',link:'Revisar conexão',plan:'Planejar melhoria',tracking:'Acompanhar resultado',pain:'Analisar problema'}[entry.action])+'</button>'+(entry.plan?'<button class="tb" data-act="business-edit-plan" data-index="'+entry.index+'">Editar plano</button>':'')+'</article>').join(''):'<p>Nenhum ponto encontrado neste recorte. Revise os registros com a equipe; campos ausentes não comprovam que a operação está resolvida.</p>')+'</div><footer><button class="tb" data-act="business-pain">Registrar problema</button><button class="tb" data-act="business-close-review">Concluir revisão</button></footer>';
 if(!dialog.open)dialog.showModal();
}
function businessOpenStorage(){
 const dialog=app.querySelector('#business-storage');dialog.innerHTML='<div class="panel-head"><h2 id="business-storage-title">Seus dados e suas cópias</h2><button class="x" data-act="business-close-storage" aria-label="Fechar dados e backup">×</button></div><p><b>As edições atuais deste projeto estão salvas neste navegador e neste dispositivo.</b> Ao limpar os dados do navegador, você pode perder esta cópia.</p><ol><li>Baixe um backup completo em JSON para guardar uma cópia fora do navegador.</li><li>No outro dispositivo, abra a plataforma e use Restaurar ou transferir backup.</li><li>Selecione o arquivo, confira a prévia e confirme a substituição do projeto.</li></ol><p>A restauração cria um checkpoint do projeto atual. Os checkpoints também ficam neste navegador; guarde um arquivo para ter uma cópia externa.</p><div class="business-actions"><button class="tb p" data-act="backup">Baixar backup do projeto</button><button class="tb" data-act="business-import">Restaurar ou transferir backup</button><button class="tb" data-act="business-recovery">Abrir recuperação</button></div><p class="hint">Acesso em outro dispositivo depende da transferência do backup ou de um workspace remoto conectado. Publique suas edições no workspace remoto para disponibilizá-las à equipe.</p><button class="tb" data-act="business-remote">Abrir workspace remoto</button>';
 dialog.showModal();
}
function businessAction(action,data){
 if(!action.startsWith('business-'))return false;
 if(action==='business-guided'){businessSet({guided:!businessGuided()});rerender();focusNew('[data-act="business-guided"]')}
 if(action==='business-focus'){businessSet({focus:!businessFocusMode()});rerender();focusNew('[data-act="business-focus"]')}
 if(action==='business-stage'){const i=Math.max(0,Math.min(S.steps.length-1,businessStageIndex()+Number(data.d)));businessStage=S.steps[i].hostLocalId||S.steps[i].hostStageId;rerender();focusNew('[data-business-stage]')}
 if(action==='business-review')businessOpenReview();
 if(action==='business-close-review')app.querySelector('#business-review').close();
 if(action==='business-storage')businessOpenStorage();
 if(action==='business-close-storage')app.querySelector('#business-storage').close();
 if(action==='business-remote'){app.querySelector('#business-storage').close();if(HOSTED)window.parent.postMessage({boBlueprintHost:1,type:'storage-remote'},location.origin)}
 if(action==='business-import'||action==='business-recovery'){app.querySelector('#business-storage').close();if(HOSTED)window.parent.postMessage({boBlueprintHost:1,type:action==='business-import'?'storage-import':'storage-recovery'},location.origin)}
 if(action==='business-pain'){app.querySelector('#business-review').close();pickerShowTool('im');focusNew('[data-act="addi"][data-t="d"]')}
 if(action==='business-edit-plan'){app.querySelector('#business-review').close();growthOpenPlan(Number(data.index))}
 if(action==='business-resolve'){const entry=businessReviewItems()[Number(data.index)];if(!entry)return true;app.querySelector('#business-review').close();
  if(entry.action==='activity'){const value=blueprintNote(entry.id);if(value)blueprintActivityOpen(value.key,S.c[value.key].findIndex(note=>note.i===entry.id))}
  if(entry.action==='link')blueprintLinksOpen(entry.id);
  if(entry.action==='pain')contextOpenPain(entry.id,entry.index);
  if(entry.action==='plan')growthOpenPlan(entry.index);
  if(entry.action==='tracking')growthOpenTracking(entry.index);
 }
 return true;
}
document.addEventListener('change',event=>{
 if(event.target.matches('[data-business-stage]')){const stage=S.steps[Number(event.target.value)];if(stage){businessStage=stage.hostLocalId||stage.hostStageId;rerender();focusNew('[data-business-stage]')}}
 if(event.target.matches('[data-business-review-filter]')){businessReviewFilter=event.target.value;businessOpenReview();focusNew('[data-business-review-filter]')}
});

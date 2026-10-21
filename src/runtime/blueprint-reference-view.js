/**
 * Reference Blueprint reading. This is a second *view* of the canonical Blueprint,
 * not a second Service Graph. Every edit is delegated to the host's history/persistence layer.
 */
const labels = {evidence:['Evidência física','O que o cliente vê ou toca'],customer:['Ações do cliente','O que a pessoa faz'],frontstage:['Linha de frente','Ações visíveis da equipe'],backstage:['Bastidores','Ações que o cliente não vê'],process:['Processos','Fluxos e rotinas de apoio'],enablement:['Sistemas e apoio','Ferramentas e recursos']};
const emotions = ['Frustrada','Ansiosa','Neutra','Animada','Satisfeita'];
const h = input=>String(input??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function renderBlueprintReference(host,api){
  const {stages,boardName,personaName,items,issues,readOnly}=api;
  const local=api.state,cols=stages.length;
  const row=(title,desc,cells,id)=>'<div class="bo-ref-row" data-row="'+id+'"><div class="bo-ref-label">'+title+'<small>'+desc+'</small></div>'+cells.join('')+'</div>';
  const stageHeader=row('Etapas','Um momento da experiência',stages.map((s,i)=>'<div class="bo-ref-step"><i>'+(i+1)+'</i><strong>'+h(s.title)+'</strong></div>'),'stages');
  const stageSummary=row('O que acontece','Resumo da etapa',stages.map(s=>'<div class="bo-ref-cell"><div class="bo-ref-note bo-ref-summary" data-action="summary" data-id="'+h(s.id)+'" tabindex="0">'+h(s.thoughts||s.customerAction||'Escreva o que acontece nesta etapa…')+'</div></div>'),'summary');
  const cell=(stage,lane)=>{
    const found=(items[stage.id]?.[lane]||[]);
    const nodes=found.map(item=>'<div class="bo-ref-card"><span tabindex="0" data-action="edit" data-item="'+h(item.id)+'">'+h(item.text)+'</span>'+(!readOnly?'<button data-action="remove" data-item="'+h(item.id)+'" title="Remover nota" aria-label="Remover nota">×</button>':'')+'</div>').join('');
    const customer=lane==='customer'&&stage.customerAction&&!found.length?'<div class="bo-ref-card" data-action="customer" data-id="'+h(stage.id)+'" tabindex="0">'+h(stage.customerAction)+'</div>':'';
    return '<div class="bo-ref-cell">'+nodes+customer+(!readOnly?'<button class="bo-ref-add" data-action="add" data-lane="'+lane+'" data-id="'+h(stage.id)+'">+ '+(found.length?'Adicionar':lane==='customer'?'O que ela faz aqui?':lane==='evidence'?'O que ela vê ou toca?':lane==='frontstage'?'O que a equipe faz à vista?':lane==='backstage'?'O que acontece por trás?':lane==='process'?'Que processo apoia?':'Que ferramenta apoia?')+'</button>':'')+'</div>';
  };
  const laneRow=lane=>row(h(labels[lane][0]),h(labels[lane][1]),stages.map(s=>cell(s,lane)),lane);
  const divider=label=>'<div class="bo-ref-divider"><b>'+h(label)+'</b><span></span></div>';
  const score=stage=>Number.isInteger(stage.emotionScore)?Math.max(-2,Math.min(2,stage.emotionScore)):stage.emotion==='positive'?1:stage.emotion==='negative'?-1:0;
  const points=stages.map((s,i)=>[(i+.5)*100,55-score(s)*19]);
  const curve='<div class="bo-ref-curve"><svg viewBox="0 0 '+Math.max(100,cols*100)+' 112" preserveAspectRatio="none" aria-label="Curva de emoções"><line x1="0" x2="'+(cols*100)+'" y1="55" y2="55" stroke="var(--bo-ref-line)" stroke-dasharray="4 4"/><path d="'+points.map((p,i)=>(i?'L':'M')+p[0]+' '+p[1]).join(' ')+'" fill="none" stroke="var(--bo-ref-accent)" stroke-width="2.5" vector-effect="non-scaling-stroke"/>'+points.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="4.5" fill="var(--bo-ref-accent)"/>').join('')+'</svg></div>';
  const emotion=row('Emoções','Como ela se sente',[ '<div class="bo-ref-emotions" style="grid-column:2 / span '+cols+'">'+curve+'<div class="bo-ref-emotion-fields" style="grid-template-columns:repeat('+cols+',1fr)">'+stages.map(s=>'<label><span>'+h(emotions[score(s)+2])+'</span><input type="range" min="-2" max="2" step="1" value="'+score(s)+'" data-action="emotion" data-id="'+h(s.id)+'" aria-label="Emoção em '+h(s.title)+'" '+(readOnly?'disabled':'')+'></label>').join('')+'</div></div>' ],'emotions');
  const issuesByStage=s=>issues.filter(issue=>issue.stageId===s.id).slice(0,8);
  const improvement=row('Dores e ideias','Revise problemas e oportunidades',stages.map(s=>'<div class="bo-ref-cell">'+issuesByStage(s).map(issue=>'<div class="bo-ref-issue"><b>'+h(issue.severity==='high'||issue.severity==='critical'?'Dor / atenção':'Revisão')+'</b><span>'+h(issue.title||issue.message||issue.detail||'Pendência')+'</span></div>').join('')+(!readOnly?'<div class="bo-ref-pair"><button data-action="problem" data-id="'+h(s.id)+'">+ Dor</button><button data-action="opportunity" data-id="'+h(s.id)+'">+ Ideia</button></div>':'')+'</div>'),'improvements');
  const checklist=['customer','evidence','frontstage','backstage','process','enablement'].map((lane,i)=>{const count=stages.filter(s=>(items[s.id]?.[lane]||[]).length||(lane==='customer'&&s.customerAction)).length;return {lane,label:labels[lane][0],count,total:cols,i};});
  const next=checklist.find(x=>x.count<x.total);
  const priority=stages.map((s,i)=>({stage:s,index:i,issues:issuesByStage(s),missing:checklist.filter(x=>!(items[s.id]?.[x.lane]||[]).length&&!(x.lane==='customer'&&s.customerAction)).length})).sort((a,b)=>(b.issues.length*2+b.missing)-(a.issues.length*2+a.missing));
  host.innerHTML='<section class="bo-ref"><header class="bo-ref-head"><div class="bo-ref-crumb">BLUE OCEAN · BLUEPRINT DE SERVIÇO</div><div class="bo-ref-head-inner"><div><h1>'+h(boardName)+'</h1><p>'+h(personaName||'Persona e cenário · vincule a Jornada ao contexto do serviço')+'</p></div><div class="bo-ref-actions"><span class="bo-ref-saved">Conectado ao Service Graph</span><button data-action="client" aria-pressed="'+!!local.client+'">Visão do cliente</button><button data-action="undo" '+(readOnly?'disabled':'')+'>↶ Desfazer</button><button data-action="redo" '+(readOnly?'disabled':'')+'>↷ Refazer</button><button data-action="professional" class="bo-ref-primary">Modo profissional ↗</button><button data-action="stage" '+(readOnly?'disabled':'')+'>+ Nova etapa</button></div></div></header><main class="bo-ref-layout"><div class="bo-ref-board"><div class="bo-ref-matrix" style="--bo-ref-cols:'+cols+'">'+stageHeader+stageSummary+laneRow('evidence')+laneRow('customer')+divider('Linha de interação')+emotion+laneRow('frontstage')+(!local.client?divider('Linha de visibilidade')+laneRow('backstage')+laneRow('process')+divider('Linha de interação interna')+laneRow('enablement'):'')+improvement+'</div></div><aside class="bo-ref-panel"><h2>Passo a passo</h2>'+checklist.map(x=>'<div class="bo-ref-check"><i>'+(x.count===x.total&&x.total?'✓':x.i+1)+'</i><span>'+h(x.label)+'</span><small>'+x.count+' de '+x.total+'</small></div>').join('')+'<div class="bo-ref-insight">'+(next?'Próximo: “'+h(next.label)+'” — complete as etapas que faltam.':'Revise e valide a entrega com a equipe e os clientes.')+'</div><h2>Prioridade de melhoria</h2>'+priority.map((x,i)=>'<div class="bo-ref-priority"><div><b>'+(i+1)+'. '+h(x.stage.title)+'</b><small>'+x.issues.length+' pendência(s) · '+x.missing+' camada(s) vazia(s)</small></div><div class="bo-ref-bar"><i style="width:'+Math.min(100,(x.issues.length*2+x.missing)*9)+'%"></i></div></div>').join('')+'<h2>Leitura automática</h2><div class="bo-ref-insight">'+(priority[0]?'Comece por '+h(priority[0].stage.title)+'. Verifique as pendências reais e as camadas não preenchidas.':'Adicione etapas à Jornada para começar.')+'</div><h2>Qualidade percebida</h2><p>Confiabilidade · Responsividade · Segurança · Empatia · Tangibilidade</p><p>Essas dimensões orientam a revisão. Não representam dados coletados de satisfação ou SERVQUAL calculado.</p><button data-action="quality">Abrir revisão de entrega</button></aside></main></section>';
  host.onclick=e=>{
    const btn=e.target.closest('[data-action]');if(!btn)return;
    const a=btn.dataset.action,id=btn.dataset.id;
    if(a==='client'){local.client=!local.client;api.refresh();return}
    if(a==='professional'){api.professional();return}
    if(a==='undo'){api.undo();return} if(a==='redo'){api.redo();return}
    if(a==='stage'){api.stage();return}
    if(a==='quality'){api.review();return}
    if(a==='summary'){api.summary(id);return}
    if(a==='customer'){api.customer(id);return}
    if(a==='add'){api.add(id,btn.dataset.lane);return}
    if(a==='edit'){api.edit(btn.dataset.item);return}
    if(a==='remove'){api.remove(btn.dataset.item);return}
    if(a==='problem'){api.createIssue(id,'problem');return}
    if(a==='opportunity'){api.createIssue(id,'opportunity');return}
  };
  host.onchange=e=>{const target=e.target;if(target?.dataset.action==='emotion')api.emotion(target.dataset.id,Number(target.value))};
  host.onkeydown=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.action==='summary'){e.preventDefault();api.summary(e.target.dataset.id)}};
}

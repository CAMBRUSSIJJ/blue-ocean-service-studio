import { normalizeMatrixActivity, validateMatrixDocument, normalizeMatrixConnection } from './journey-content.js';

/** A projection of the existing matrix document. This module never owns another service graph. */
export const CANVAS_COMPONENTS = {
  'customer-action': { title:'Ação do cliente', icon:'↗', row:'ac', rows:['ac','fl','bk','sy'], group:'experience', hint:'O que a pessoa faz' },
  channel: { title:'Canal', icon:'◎', row:'ch', rows:['*'], group:'experience', hint:'WhatsApp, loja, telefone…' },
  emotion: { title:'Emoção', icon:'☺', row:'em', rows:['em'], group:'experience', hint:'Como o cliente se sente' },
  thought: { title:'Pensamento', icon:'◌', row:'th', rows:['*'], group:'experience', hint:'O que a pessoa pensa' },
  activity: { title:'Atividade', icon:'▣', row:'fl', rows:['ac','fl','bk','sy'], group:'operation', hint:'Atendimento e execução' },
  touchpoint: { title:'Ponto de contato', icon:'◉', row:'ac', rows:['ac'], hint:'Interação com o cliente' },
  artifact: { title:'Evidência física/digital', icon:'▤', row:'ev', rows:['ev'], hint:'O que o cliente vê ou recebe' },
  decision: { title:'Decisão operacional', icon:'◇', row:'bk', rows:['fl','bk'], hint:'Regra ou condição da operação' },
  system: { title:'Sistema', icon:'▦', row:'sy', rows:['sy'], hint:'Aplicação e plataforma' },
  resource: { title:'Recurso', icon:'⬡', row:'sy', rows:['sy'], hint:'Pessoas, meios e infraestrutura' },
  metric: { title:'Indicador', icon:'◷', row:'sy', rows:['ev','ac','fl','bk','sy'], hint:'Medição vinculada ao serviço' },
  persona: { title:'Persona', icon:'♙', row:'sd', rows:['*'], group:'experience', hint:'Quem vive a experiência' },
  need: { title:'Necessidade', icon:'◈', row:'sd', rows:['*'], group:'experience', hint:'O que o cliente precisa' },
  pain: { title:'Dor', icon:'!', row:'im', rows:['*'], group:'experience', hint:'Problema percebido pelo cliente' },
  opportunity: { title:'Ideia de melhoria', icon:'✧', row:'im', rows:['*'], group:'experience', hint:'Uma oportunidade para melhorar' },
  text: { title:'Cartão livre', icon:'T', row:'sd', rows:['*'], group:'content', hint:'Uma anotação simples' },
};
export function canvasAcceptsRow(kind,row){const component=CANVAS_COMPONENTS[kind];return !!component&&(component.rows.includes('*')||component.rows.includes(row))}
const text = (value,limit) => typeof value==='string'?value.trim().slice(0,limit):'';
export function normalizeCanvasMetadata(input={}) {
  if (!Object.hasOwn(CANVAS_COMPONENTS,input.kind)) throw Error('Tipo de componente indisponível.');
  return {version:1,kind:input.kind,description:text(input.description,1000),channelId:text(input.channelId,160),metricId:text(input.metricId,160)};
}
export function canvasKind(note,row) {
  if (Object.hasOwn(CANVAS_COMPONENTS,note.canvas?.kind)) return note.canvas.kind;
  if (note.type==='metric') return 'metric';
  if (note.hostKind==='touchpoint') return 'touchpoint';
  if (note.hostKind==='resource') return 'resource';
  if (row==='ev' && !['pain','evidence','need','persona'].includes(note.type)) return 'artifact';
  if (row==='sy' && note.activity?.category!=='support-process') return 'system';
  return 'activity';
}
export function canvasStageIndex(doc,input) {
  const index=doc.steps.findIndex(step=>input.stageId?step.hostStageId===input.stageId:input.stageLocalId&&step.hostLocalId===input.stageLocalId);
  if(index<0)throw Error('A etapa mudou. Selecione uma etapa disponível.');
  return index;
}
export function prepareCanvasInput(doc,input) {
  const kind=input?.kind,component=CANVAS_COMPONENTS[kind];
  if(!component)throw Error('Escolha um componente disponível.');
  const index=canvasStageIndex(doc,input),row=input.row||component.row;
  if(!canvasAcceptsRow(kind,row))throw Error('Escolha uma faixa compatível: '+component.rows.map(id=>({ev:'Evidências',ac:'Ações do cliente',fl:'Linha de frente',bk:'Bastidores',sy:'Sistemas e apoio',em:'Emoções'}[id]||id)).join(' ou ')+'.');
  const title=text(input.title,240);if(!title)throw Error('Informe o nome do componente.');
  if((doc.c[row+'|'+index]||[]).length>=100)throw Error('Esta etapa e faixa já possuem 100 elementos.');
  const activity=normalizeMatrixActivity({...input,category:row==='sy'?(['activity','customer-action'].includes(kind)?'support-process':'resource'):'activity'});
  return {kind,row,index,title,activity,canvas:normalizeCanvasMetadata({...input,kind})};
}
export function moveCanvasCard(doc,id,input) {
  const next=structuredClone(doc),source=Object.entries(next.c).find(([,notes])=>notes.some(note=>note.i===id));
  if(!source)throw Error('Este componente não está mais no mapa.');
  const [sourceKey,sourceNotes]=source,note=sourceNotes.find(note=>note.i===id),index=canvasStageIndex(next,input),row=text(input.row,25);
  if(!/^[a-z][a-z0-9]{0,24}$/.test(row))throw Error('Faixa inválida.');
  let kind=canvasKind(note,sourceKey.split('|')[0]);
  if(note.canvas&&!canvasAcceptsRow(kind,row))throw Error('Esta faixa não aceita o componente selecionado.');
  if(['activity','customer-action'].includes(kind)){kind=row==='ac'?'customer-action':'activity';if(note.canvas)note.canvas.kind=kind;if(row==='ac')note.reclassifyActivity=row!==sourceKey.split('|')[0]}
  if(kind==='emotion'&&index!==Number(sourceKey.split('|')[1])){
    const previous=next.steps[Number(sourceKey.split('|')[1])],target=next.steps[index];
    if((next.c['em|'+index]||[]).some(value=>value.canvas?.kind==='emotion'))throw Error('Esta etapa já possui um cartão de emoção.');
    if(target.emotionRecorded)throw Error('Esta etapa já possui uma emoção registrada. Edite-a antes de mover.');
    for(const field of ['e','note','emotionRecorded','emotionStatus','emotionSource'])target[field]=previous[field];
    Object.assign(previous,{e:0,note:'',emotionRecorded:false,emotionStatus:'hypothesis',emotionSource:''});
  }
  if(note.activity&&['fl','bk','sy'].includes(row)) {
    const category=row==='sy'?(kind==='activity'?'support-process':'resource'):'activity';
    if(['resource','system'].includes(kind)&&row!=='sy')throw Error('Coloque recursos e sistemas em Sistemas e apoio.');
    note.activity=normalizeMatrixActivity({...note.activity,category});
    note.reclassifyActivity=row!==sourceKey.split('|')[0];
  }
  next.c[sourceKey]=sourceNotes.filter(value=>value.i!==id);
  const target=row+'|'+index,list=next.c[target]||[];
  if(list.length>=100)throw Error('Esta célula já possui 100 elementos.');
  const position=input.beforeId?list.findIndex(value=>value.i===input.beforeId):-1;
  if(input.beforeId&&position<0)throw Error('O ponto de inclusão mudou. Tente novamente.');
  next.c[target]=position<0?[...list,note]:[...list.slice(0,position),note,...list.slice(position)];
  validateMatrixDocument(next);return next;
}

export function insertCanvasStage(doc,input){
  const next=structuredClone(doc),title=text(input.title,240);if(!title)throw Error('Dê um nome à etapa.');
  if(next.steps.length>=90)throw Error('Este mapa já possui 90 etapas.');
  const at=input.afterStageId||input.afterStageLocalId?canvasStageIndex(next,{stageId:input.afterStageId,stageLocalId:input.afterStageLocalId})+1:next.steps.length;
  if(!input.localId)throw Error('A etapa precisa de uma identificação.');
  next.steps.splice(at,0,{n:title,e:0,d:'',emotionRecorded:false,hostLocalId:input.localId});
  next.c=Object.fromEntries(Object.entries(next.c).map(([key,notes])=>{const [row,column]=key.split('|'),index=Number(column);return [row+'|'+(index>=at?index+1:index),notes]}));
  next.iss=(next.iss||[]).map(issue=>({...issue,s:issue.s>=at?issue.s+1:issue.s}));
  return next;
}
export const CANVAS_GRID={label:218,stage:392,header:96,gap:16,cardWidth:328,cardHeight:112,padding:18};
export const CANVAS_STAGE_MIN=210;
export const CANVAS_STAGE_MAX=600;
export function canvasStageWidth(value,fallback=CANVAS_GRID.stage) {
  return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Math.max(CANVAS_STAGE_MIN,Math.min(CANVAS_STAGE_MAX,Math.round(Number(value)))):fallback;
}
export function canvasEmotionScore(step={}) {
  const score=Number(step.e);
  return Math.max(-2,Math.min(2,Number.isFinite(score)?Math.round(score):0));
}
export function canvasEmotionPoint(stage,row) {
  return {x:stage.x+stage.width/2,y:row.y+24+(2-canvasEmotionScore(stage.step))*16};
}
export function canvasBoundary(row,index,rows) {
  const previous={fl:'ac',bk:'fl',sy:'bk'}[row.id],before=rows.findIndex(value=>value.id===previous);
  if(!previous||before<0||before>=index||rows.slice(before+1,index).some(value=>['fl','bk','sy'].includes(value.id)))return '';
  return {fl:'Linha de interação',bk:'Linha de visibilidade · início dos bastidores',sy:'Linha de interação interna · apoio'}[row.id];
}
export function buildCanvasLayout(doc,definitions,stageIndices=null,stageWidths=null) {
  const g=CANVAS_GRID,indices=stageIndices||doc.steps.map((_,index)=>index),nodes=[],rows=[];
  let cursor=g.label;
  const stages=indices.map(index=>{const width=canvasStageWidth(stageWidths?.[index]);const stage={index,step:doc.steps[index],x:cursor,width};cursor+=width;return stage;});
  let y=g.header;
  for(const definition of definitions) {
    const counts=indices.map(index=>definition.id==='em'?0:(doc.c[definition.id+'|'+index]||[]).length);
    const count=Math.max(1,...counts),height=g.padding*2+count*g.cardHeight+(count-1)*g.gap;
    rows.push({...definition,y,height});
    if(definition.id==='em')for(const stage of stages)(doc.c['em|'+stage.index]||[]).forEach(note=>{if(note.virtualLabel)return;const point=canvasEmotionPoint(stage,{y});nodes.push({id:note.i,note,row:'em',stageIndex:stage.index,position:0,key:'em|'+stage.index,x:point.x-1,y:point.y-1,width:2,height:2});});
    if(definition.id!=='em')for(const stage of stages)(doc.c[definition.id+'|'+stage.index]||[]).forEach((note,position)=>{const width=Math.min(g.cardWidth,stage.width-28);nodes.push({id:note.i,note,row:definition.id,stageIndex:stage.index,position,key:definition.id+'|'+stage.index,x:stage.x+(stage.width-width)/2,y:y+g.padding+position*(g.cardHeight+g.gap),width,height:g.cardHeight});});
    y+=height+28;
  }
  return {stages,rows,nodes,width:cursor+20,height:y+20};
}
export function canvasTitleLines(title,limit=32,maxLines=2) {
  const words=String(title).trim().split(/\s+/),lines=[''];
  for(const word of words){const index=lines.length-1;if(lines[index]&&(lines[index]+' '+word).length>limit)lines.push(word);else lines[index]+=(lines[index]?' ':'')+word}
  const result=lines.slice(0,maxLines).map(line=>line.length>limit?line.slice(0,limit-1)+'…':line);
  if(lines.length>maxLines)result[maxLines-1]=result[maxLines-1].slice(0,limit-1)+'…';return result;
}
export function canvasConnectionOffsets(links) {
  const groups=new Map(),result=new Map();
  for(const link of links){const key=JSON.stringify([link.a,link.b].sort());if(!groups.has(key))groups.set(key,[]);groups.get(key).push(link)}
  for(const group of groups.values()){const spacing=Math.min(18,72/Math.max(1,group.length-1));group.forEach((link,index)=>result.set(link.id,(index-(group.length-1)/2)*spacing))}
  return result;
}
export function canvasEdgeGeometry(a,b,offset=0) {
  const dx=b.x-a.x,dy=b.y-a.y;
  if(a.row===b.row&&a.stageIndex!==b.stageIndex){const x=dx>=0?a.x+a.width:a.x,tx=dx>=0?b.x:b.x+b.width;return {d:`M ${x} ${a.y+a.height/2+offset} L ${tx} ${b.y+b.height/2+offset}`,x:(x+tx)/2,y:(a.y+b.y+a.height)/2+offset};}
  if(a.stageIndex===b.stageIndex){const x=a.x+a.width/2+offset,sy=dy>=0?a.y+a.height:a.y,ty=dy>=0?b.y:b.y+b.height;return {d:`M ${x} ${sy} L ${b.x+b.width/2+offset} ${ty}`,x:(x+b.x+b.width/2+offset)/2,y:(sy+ty)/2};}
  const sx=dx>=0?a.x+a.width:a.x,tx=dx>=0?b.x:b.x+b.width,sy=a.y+a.height/2+offset,ty=b.y+b.height/2+offset,track=(dy>=0?b.y-12:a.y-12)+offset;
  return {d:`M ${sx} ${sy} H ${sx+(dx>=0?10:-10)} V ${track} H ${tx+(dx>=0?-10:10)} V ${ty} H ${tx}`,x:(sx+tx)/2,y:track};
}
const xml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const colors={sequence:'#2563eb',dependency:'#a65f00',uses:'#7355ab',handoff:'#087f75'};
export function exportCanvasSvg(doc,definitions,titleFor=note=>note.t||note.type||'Componente',stageWidths=null) {
  const layout=buildCanvasLayout(doc,definitions,null,stageWidths),byId=new Map(layout.nodes.map(node=>[node.id,node])),offsets=canvasConnectionOffsets(doc.links||[]);
  let out=`<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height+60}" viewBox="0 -60 ${layout.width} ${layout.height+60}" role="img" aria-label="${xml(doc.title)}"><title>${xml(doc.title)}</title><rect x="0" y="-60" width="100%" height="${layout.height+60}" fill="#ffffff"/><text x="20" y="-24" font-size="24" font-family="sans-serif" fill="#142944">${xml(doc.title)}</text><defs>`;
  for(const [type,color]of Object.entries(colors))out+=`<marker id="arrow-${type}" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker>`;
  out+='</defs><g font-family="sans-serif">';
  for(const stage of layout.stages)out+=`<rect x="${stage.x}" y="0" width="${stage.width-4}" height="78" rx="8" fill="#eaf1ff"/><text x="${stage.x+18}" y="44" font-size="19" font-weight="600" fill="#142944">${xml(stage.step.n)}</text>`;
  for(const [index,row]of layout.rows.entries()){
    const boundary=canvasBoundary(row,index,layout.rows);
    out+=`<rect x="0" y="${row.y}" width="${layout.width}" height="${row.height}" fill="#f5f8fc" stroke="#cfdaea"/><text x="14" y="${row.y+30}" font-size="12" fill="#142944">${xml(row.n.slice(0,22))}</text>`;
    if(row.n.length>22)out+=`<text x="14" y="${row.y+48}" font-size="12" fill="#142944">${xml(row.n.slice(22,44))}</text>`;
    if(row.id==='em'&&layout.stages.length){
      const pts=layout.stages.map(stage=>({...canvasEmotionPoint(stage,row),recorded:stage.step.emotionRecorded===true||stage.step.emotionRecorded===undefined&&(Number(stage.step.e)!==0||!!stage.step.note?.trim())}));
      out+=`<line x1="${layout.stages[0].x}" y1="${row.y+56}" x2="${layout.width-20}" y2="${row.y+56}" stroke="#c8d8ed" stroke-dasharray="4 5"/>`;
      for(let i=1;i<pts.length;i++)if(pts[i-1].recorded&&pts[i].recorded)out+=`<line x1="${pts[i-1].x}" y1="${pts[i-1].y}" x2="${pts[i].x}" y2="${pts[i].y}" stroke="#dc821c" stroke-width="3"/>`;
      pts.forEach((p,i)=>{out+=`<circle cx="${p.x}" cy="${p.y}" r="7" fill="${p.recorded?'#dc821c':'#fff'}" stroke="#dc821c" stroke-width="2"/><text x="${p.x}" y="${row.y+116}" text-anchor="middle" font-size="12" fill="#784619">${xml(p.recorded?['Frustrada','Ansiosa','Neutra','Animada','Satisfeita'][canvasEmotionScore(layout.stages[i].step)+2]:'Sem registro')}</text>`;});
    }
    if(boundary)out+=`<path d="M0 ${row.y-14} H${layout.width}" stroke="#7c8fa6" stroke-dasharray="3 6"/><text x="${layout.width/2}" y="${row.y-18}" text-anchor="middle" font-size="11" fill="#526885">${xml(boundary)}</text>`;
  }
  for(const raw of doc.links||[]){const link=normalizeMatrixConnection(raw),a=byId.get(link.a),b=byId.get(link.b);if(!a||!b)continue;const edge=canvasEdgeGeometry(a,b,offsets.get(link.id)||0),color=colors[link.type],label=({sequence:'Sequência',dependency:'Dependência',uses:'Usa recurso',handoff:'Passagem entre equipes'}[link.type])+(link.label?' · '+link.label:'');
    const transfer=link.handoff?' · '+link.handoff.fromTeam+' → '+link.handoff.toTeam+' · '+link.handoff.deliverable+' · Prazo: '+(link.handoff.deadlineMinutes??'não informado')+' min · Aceite: '+link.handoff.acceptance:'';
    out+=`<g><title>${xml(titleFor(a.note))} → ${xml(titleFor(b.note))} · ${xml(label+transfer)}</title><path d="${edge.d}" stroke="${color}" stroke-width="2" fill="none" marker-end="url(#arrow-${link.type})"/><text x="${edge.x}" y="${edge.y-5}" text-anchor="middle" font-size="10" fill="${color}">${xml(label.slice(0,60))}</text></g>`;
  }
  for(const node of layout.nodes){if(node.row==='em')continue;const activity=node.note.activity||{},title=titleFor(node.note),details=[activity.owner?'Responsável: '+activity.owner:'',activity.team?'Equipe: '+activity.team:'',activity.durationMinutes!=null?'Execução: '+activity.durationMinutes+' min':'',activity.waitMinutes!=null?'Espera: '+activity.waitMinutes+' min':'',activity.rule?'Regra: '+activity.rule:'',node.note.canvas?.description||''].filter(Boolean).join(' · ');
    out+=`<g><title>${xml(title)}${details?' · '+xml(details):''}</title><rect x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" rx="10" fill="#fff" stroke="#536c8d"/><text x="${node.x+12}" y="${node.y+23}" font-size="12" fill="#526885">${xml(CANVAS_COMPONENTS[canvasKind(node.note,node.row)]?.title||node.note.type)}</text>`+canvasTitleLines(title,34).map((line,index)=>`<text x="${node.x+12}" y="${node.y+50+index*21}" font-size="17" font-weight="600" fill="#142944">${xml(line)}</text>`).join('')+`<text x="${node.x+12}" y="${node.y+92}" font-size="11" fill="#526885">${xml(activity.owner||activity.team||'')}</text></g>`;
  }
  return out+'</g></svg>';
}

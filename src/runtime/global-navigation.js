(()=>{'use strict';
const VERSION='__APP_VERSION__';
const runtime=window.BlueOceanRuntime||window.RealTalentRuntime;
if(!runtime)return;
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const text=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const labelMap={service:'Serviço',journey:'Jornada',stage:'Etapa',touchpoint:'Touchpoint',problem:'Problema',opportunity:'Oportunidade',task:'Ação',blueprint:'Blueprint',research:'Pesquisa',evidence:'Evidência',insight:'Insight',metric:'Métrica',benefit:'Benefício',persona:'Persona',need:'Necessidade',expectation:'Expectativa',channel:'Canal',solution:'Solução',experiment:'Experimento',process:'Processo',system:'Sistema',resource:'Recurso',responsible:'Responsável',role:'Papel',dependency:'Dependência',policy:'Política',frontstage:'Frontstage',backstage:'Backstage',customerAction:'Ação do cliente',emotion:'Emoção',document:'Documento',review:'Revisão'};
const iconMap={service:'S',journey:'J',stage:'E',touchpoint:'T',problem:'P',opportunity:'O',task:'A',blueprint:'B',research:'R',evidence:'EV',insight:'I',metric:'M',benefit:'BN',persona:'PE',need:'N',channel:'C',solution:'SO',experiment:'EX',process:'PR',system:'SI',resource:'RE',responsible:'RP',role:'PA',dependency:'DE',policy:'PO'};
let openState=false, activeIndex=0, results=[], lastQuery='';
function graph(){try{return runtime.api('dataBridge')?.get?.()||null}catch{return null}}
function journeyName(g,id){return g?.journeys?.[id]?.name||''}
function stageName(g,id){return g?.stages?.[id]?.title||''}
function parentFor(g,rec,kind){
  let stageId=rec?.stageId||''; let journeyId=rec?.journeyId||'';
  if(kind==='stage'){stageId=rec.id;journeyId=rec.journeyId||''}
  if(!stageId&&kind==='touchpoint')stageId=Object.values(g?.stages||{}).find(s=>(s.touchpointIds||[]).includes(rec.id))?.id||'';
  if(!stageId&&kind==='problem')stageId=rec.stageId||'';
  if(!stageId&&kind==='opportunity')stageId=rec.stageId||'';
  if(!stageId&&kind==='task')stageId=rec.stageId||g?.opportunities?.[rec.opportunityId]?.stageId||'';
  if(stageId&&!journeyId)journeyId=g?.stages?.[stageId]?.journeyId||'';
  return{stageId,journeyId};
}
function item(kind,id,label,context='',extra={}){const title=text(label)||`Sem título`;return{kind,id,title,context:text(context),search:norm([labelMap[kind]||kind,title,context,extra.owner,extra.description,extra.tags].filter(Boolean).join(' ')),...extra}}
function buildIndex(){
  const g=graph(); if(!g)return[]; const out=[];
  out.push(item('service',g.service.id,g.service.name,g.service.description||'Workspace principal'));
  Object.values(g.journeys||{}).forEach(j=>out.push(item('journey',j.id,j.name,[j.owner,j.objective,j.status].filter(Boolean).join(' · '),{journeyId:j.id,updatedAt:j.updatedAt||j.lastOpenedAt||j.createdAt||''}))); 
  Object.values(g.stages||{}).forEach(s=>out.push(item('stage',s.id,s.title,`${journeyName(g,s.journeyId)}${s.customerAction?' · '+s.customerAction:''}`,{stageId:s.id,journeyId:s.journeyId,updatedAt:s.updatedAt||''})));
  Object.values(g.touchpoints||{}).forEach(r=>{const p=parentFor(g,r,'touchpoint');out.push(item('touchpoint',r.id,r.name,[journeyName(g,p.journeyId),stageName(g,p.stageId),r.channel].filter(Boolean).join(' · '),{...p}))});
  Object.values(g.problems||{}).forEach(r=>{const p=parentFor(g,r,'problem');out.push(item('problem',r.id,r.description,[journeyName(g,p.journeyId),stageName(g,p.stageId)].filter(Boolean).join(' · '),{...p}))});
  Object.values(g.opportunities||{}).forEach(r=>{const p=parentFor(g,r,'opportunity');out.push(item('opportunity',r.id,r.title,[journeyName(g,p.journeyId),stageName(g,p.stageId),r.owner].filter(Boolean).join(' · '),{...p,owner:r.owner}))});
  Object.values(g.tasks||{}).forEach(r=>{const p=parentFor(g,r,'task');out.push(item('task',r.id,r.title,[journeyName(g,p.journeyId),stageName(g,p.stageId),r.owner,r.status].filter(Boolean).join(' · '),{...p,owner:r.owner,updatedAt:r.updatedAt||''}))});
  Object.entries(g.entities||{}).forEach(([kind,col])=>Object.values(col||{}).forEach(r=>{if(!r?.id)return;const p=parentFor(g,r,kind);const label=r.title||r.name||r.description||`${labelMap[kind]||kind} ${r.id}`;out.push(item(kind,r.id,label,[journeyName(g,p.journeyId),stageName(g,p.stageId),r.owner,r.status].filter(Boolean).join(' · '),{...p,owner:r.owner,description:r.description,updatedAt:r.updatedAt||r.createdAt||''}))}));
  Object.values(g.research?.sources||{}).forEach(r=>out.push(item('research',r.id,r.title,[r.type,r.owner,r.summary].filter(Boolean).join(' · '),{owner:r.owner,description:r.summary,tags:(r.tags||[]).join(' '),updatedAt:r.updatedAt||r.createdAt||''})));
  try{(runtime.api('blueprintHome')?.list?.()||[]).forEach(r=>out.push(item('blueprint',r.boardId||r.id,r.name,[r.serviceName,r.journeyName,r.owner].filter(Boolean).join(' · '),{journeyId:r.journeyId||'',updatedAt:r.updatedAt||''}))) }catch{}
  const seen=new Set();return out.filter(r=>{const key=`${r.kind}:${r.id}`;if(seen.has(key))return false;seen.add(key);return true});
}
function score(rec,query){const n=norm(query);if(!n)return 0;const tokens=n.split(' ').filter(Boolean);if(!tokens.every(t=>rec.search.includes(t)))return-1;const title=norm(rec.title),ctx=norm(rec.context),type=norm(labelMap[rec.kind]||rec.kind);let s=20;if(title===n)s+=140;else if(title.startsWith(n))s+=100;else if(title.includes(n))s+=70;if(type===n)s+=45;else if(type.includes(n))s+=20;if(ctx.includes(n))s+=15;tokens.forEach(t=>{if(title.startsWith(t))s+=12;else if(title.includes(t))s+=7;if(type.startsWith(t))s+=5});return s}
function commands(){return[
  {kind:'command',id:'workspace',title:'Ir para Workspace',context:'Home · visão geral do serviço',command:'workspace'},
  {kind:'command',id:'journeys',title:'Ir para Jornadas',context:'Mapas de experiência',command:'journeys'},
  {kind:'command',id:'blueprints',title:'Ir para Blueprints',context:'Operação e backstage',command:'blueprints'},
  {kind:'command',id:'research',title:'Ir para Pesquisa',context:'Fontes, evidências e insights',command:'research'},
  {kind:'command',id:'actions',title:'Ir para Plano de Ação',context:'Execução e responsáveis',command:'actions'},
  {kind:'command',id:'intelligence',title:'Ir para Inteligência',context:'Oportunidades, iniciativas e métricas',command:'intelligence'},
  {kind:'command',id:'benefits',title:'Ir para Benefícios',context:'Realização de valor',command:'benefits'},
  {kind:'command',id:'review',title:'Ir para Revisão',context:'Operating Review',command:'review'},
]}
function recentObjects(index){return [...index].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))).filter(x=>x.kind!=='service').slice(0,7)}
function search(query){const index=buildIndex(),n=norm(query);if(!n)return[...commands(),...recentObjects(index)].slice(0,14);return index.map(r=>({...r,_score:score(r,n)})).filter(r=>r._score>=0).sort((a,b)=>b._score-a._score||a.title.localeCompare(b.title,'pt-BR')).slice(0,24)}
function overlay(){let root=q('#bo115-global-nav');if(root)return root;root=document.createElement('div');root.id='bo115-global-nav';root.className='bo115-global-nav';root.hidden=true;root.innerHTML=`<div class="bo115-backdrop" data-close></div><section class="bo115-dialog" role="dialog" aria-modal="true" aria-labelledby="bo115-title"><header><div class="bo115-search-icon" aria-hidden="true">⌕</div><input id="bo115-title" type="search" autocomplete="off" spellcheck="false" placeholder="Buscar em serviços, jornadas, etapas, objetos…" aria-label="Busca global"><kbd>Esc</kbd></header><div class="bo115-filterbar"><span>Busca global</span><span class="bo115-hint">↑↓ navegar · Enter abrir · <b>Ctrl K</b></span></div><div class="bo115-results" role="listbox" aria-label="Resultados"></div><footer><span>BLUE OCEAN · Service Graph</span><span data-count></span></footer></section>`;document.body.appendChild(root);q('[data-close]',root).onclick=close;q('input',root).addEventListener('input',e=>render(e.target.value));q('input',root).addEventListener('keydown',keyHandler);q('.bo115-results',root).addEventListener('mousemove',e=>{const row=e.target.closest?.('[data-result-index]');if(row){activeIndex=Number(row.dataset.resultIndex);paintActive()}});q('.bo115-results',root).addEventListener('click',e=>{const row=e.target.closest?.('[data-result-index]');if(row)activate(Number(row.dataset.resultIndex))});return root}
function resultIcon(r){return r.kind==='command'?'→':iconMap[r.kind]||String(labelMap[r.kind]||r.kind).slice(0,2).toUpperCase()}
function groupName(r){if(r.kind==='command')return'Navegação';if(['journey','stage','touchpoint'].includes(r.kind))return'Experiência';if(['problem','opportunity','solution','experiment'].includes(r.kind))return'Melhoria';if(['task','metric','benefit'].includes(r.kind))return'Execução';if(['research','evidence','insight'].includes(r.kind))return'Pesquisa';if(r.kind==='blueprint')return'Blueprint';return'Service Graph'}
function render(query=''){lastQuery=query;results=search(query);activeIndex=Math.min(activeIndex,Math.max(0,results.length-1));const root=overlay(),box=q('.bo115-results',root);if(!results.length){box.innerHTML=`<div class="bo115-empty"><strong>Nenhum resultado</strong><span>Tente pelo nome, tipo, responsável, etapa ou jornada.</span></div>`}else{let last='';box.innerHTML=results.map((r,i)=>{const g=groupName(r),head=g!==last?(last=g,`<div class="bo115-group">${esc(g)}</div>`):'';return`${head}<button type="button" class="bo115-result ${i===activeIndex?'active':''}" data-result-index="${i}" role="option" aria-selected="${i===activeIndex}"><span class="bo115-result-icon">${esc(resultIcon(r))}</span><span class="bo115-result-copy"><strong>${esc(r.title)}</strong><small>${esc(r.context||labelMap[r.kind]||'')}</small></span><span class="bo115-result-type">${esc(r.kind==='command'?'Abrir':labelMap[r.kind]||r.kind)}</span></button>`}).join('')};q('[data-count]',root).textContent=lastQuery?`${results.length} resultado(s)`:'Navegação e recentes';paintActive()}
function paintActive(){qa('.bo115-result',overlay()).forEach((el,i)=>{const on=i===activeIndex;el.classList.toggle('active',on);el.setAttribute('aria-selected',on?'true':'false');if(on)el.scrollIntoView({block:'nearest'})})}
function keyHandler(e){if(e.key==='ArrowDown'){e.preventDefault();activeIndex=Math.min(results.length-1,activeIndex+1);paintActive()}else if(e.key==='ArrowUp'){e.preventDefault();activeIndex=Math.max(0,activeIndex-1);paintActive()}else if(e.key==='Enter'){e.preventDefault();activate(activeIndex)}else if(e.key==='Escape'){e.preventDefault();close()}}
function notice(msg){window.dispatchEvent(new CustomEvent('rt-data-notice',{detail:msg}))}
function focusDetail(rec){window.dispatchEvent(new CustomEvent('bo-global-object-focus',{detail:{kind:rec.kind,id:rec.id,stageId:rec.stageId||'',journeyId:rec.journeyId||''}}))}
async function openCommand(cmd){if(cmd==='workspace')return runtime.api('workspaceHome')?.show?.();if(cmd==='journeys')return runtime.api('journeyHomeShell')?.show?.()||window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'journey'}));if(cmd==='blueprints')return runtime.api('globalShell')?.showBlueprintHome?.()||window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'canvas'}));if(cmd==='research')return runtime.api('researchWorkspace')?.show?.();if(cmd==='actions')return window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'action'}));if(cmd==='intelligence')return runtime.api('serviceIntelligence')?.show?.();if(cmd==='benefits')return runtime.api('benefitsRealization')?.show?.();if(cmd==='review')return runtime.api('operatingReview')?.show?.()}
async function openResult(rec){
  if(rec.kind==='command')return openCommand(rec.command);
  if(rec.kind==='service')return runtime.api('workspaceHome')?.show?.();
  if(rec.kind==='journey'){const ok=await runtime.api('journeyHome')?.open?.(rec.id);if(!ok)runtime.api('journeyHomeShell')?.show?.();focusDetail(rec);return}
  if(rec.kind==='blueprint'){const ok=await runtime.api('blueprintHome')?.open?.(rec.id);if(!ok)runtime.api('globalShell')?.showBlueprintHome?.();return}
  if(rec.kind==='research'){runtime.api('researchWorkspace')?.show?.();setTimeout(()=>{runtime.api('researchWorkspace')?.openSource?.(rec.id);focusDetail(rec)},50);return}
  if(rec.kind==='task'){window.dispatchEvent(new CustomEvent('rt-navigation',{detail:'action'}));setTimeout(()=>focusDetail(rec),50);return}
  if(rec.kind==='metric'){runtime.api('serviceIntelligence')?.show?.();setTimeout(()=>runtime.api('serviceIntelligence')?.openMetric?.(rec.id),50);return}
  if(rec.kind==='benefit'){runtime.api('benefitsRealization')?.show?.();setTimeout(()=>runtime.api('benefitsRealization')?.openBenefit?.(rec.id),50);return}
  if(rec.kind==='opportunity'&&runtime.api('serviceIntelligence')?.openOpportunity){runtime.api('serviceIntelligence')?.show?.();setTimeout(()=>runtime.api('serviceIntelligence')?.openOpportunity?.(rec.id),50);return}
  if(rec.journeyId){await runtime.api('journeyHome')?.open?.(rec.journeyId);setTimeout(()=>focusDetail(rec),60);return}
  if(['evidence','insight'].includes(rec.kind)){runtime.api('researchWorkspace')?.show?.();setTimeout(()=>runtime.api('researchWorkspace')?.openEntity?.(rec.kind,rec.id),50);return}
  runtime.api('workspaceHome')?.show?.();focusDetail(rec);notice(`Objeto ${labelMap[rec.kind]||rec.kind} localizado no Service Graph.`)
}
function remember(query){const v=text(query);if(!v)return;try{const key='blue-ocean.global-search.recent';const arr=JSON.parse(localStorage.getItem(key)||'[]').filter(x=>x!==v);localStorage.setItem(key,JSON.stringify([v,...arr].slice(0,8)))}catch{}}
async function activate(i){const rec=results[i];if(!rec)return;remember(lastQuery);close();try{await openResult(rec)}catch(error){console.error('[BLUE OCEAN] Global Navigation',error);notice('Não foi possível abrir este resultado.') }}
function open(initial=''){const root=overlay();root.hidden=false;openState=true;activeIndex=0;const input=q('input',root);input.value=initial;render(initial);requestAnimationFrame(()=>{input.focus();input.select()});document.body.classList.add('bo115-search-open');return true}
function close(){const root=q('#bo115-global-nav');if(root)root.hidden=true;openState=false;document.body.classList.remove('bo115-search-open')}
function toggle(){openState?close():open()}
function ensureTrigger(){if(q('[data-bo-global-search-native], [data-bo-global-search]'))return;const header=q('#root header');const actions=header?.lastElementChild;if(!actions)return;const b=document.createElement('button');b.type='button';b.className='bo115-search-trigger';b.dataset.boGlobalSearch='1';b.setAttribute('aria-label','Abrir busca global');b.title='Busca global · Ctrl+K';b.innerHTML='<span aria-hidden="true">⌕</span><span>Buscar</span><kbd>Ctrl K</kbd>';b.onclick=()=>open();actions.insertBefore(b,actions.firstChild)}
function onKey(e){if(document.getElementById('root')?.inert)return;const target=e.target,typing=target&&(/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)||target.isContentEditable);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();toggle();return}if(e.key==='/'&&!typing&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();open();return}if(e.key==='Escape'&&openState)close()}
function boot(){document.body.classList.add('bo-v1150');overlay();ensureTrigger();runtime.register('globalNavigation',{version:VERSION,open,close,toggle,search:q=>search(q),index:()=>buildIndex(),openResult},VERSION);document.addEventListener('keydown',onKey,true);window.addEventListener('rt-app-ready',ensureTrigger);window.addEventListener('rt-runtime-registered',ensureTrigger);window.addEventListener('rt-navigation',()=>{if(openState)close();setTimeout(ensureTrigger,30)});window.addEventListener('rt-graph-changed',()=>{if(openState)render(q('#bo115-global-nav input')?.value||'')});setTimeout(ensureTrigger,350)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

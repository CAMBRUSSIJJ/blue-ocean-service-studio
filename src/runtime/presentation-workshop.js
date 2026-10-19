import { runtime } from './runtime-registry.js';

const VERSION='__APP_VERSION__';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const uid=(p='id')=>`${p}-${crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)}`;
const now=()=>new Date().toISOString();
let root=null,presenting=null,timerHandle=null,keyHandler=null;

function bridge(){return runtime.api('dataBridge')}
function canvas(){return runtime.api('presentationBridge')}
function graph(){return bridge()?.get?.()||null}
function mutate(fn,label='Editar apresentação'){return bridge()?.transact?.(g=>{ensure(g);fn(g);return g},label)}
function ensure(g){
  g.service ||= {};
  g.service.presentationStudio ||= {slideSource:'frames',frameOrderByBoard:{},notes:{},workshop:{timerMinutes:10,sessions:[],activeSessionId:null}};
  const ps=g.service.presentationStudio;
  ps.frameOrderByBoard ||= {};ps.notes ||= {};ps.workshop ||= {timerMinutes:10,sessions:[],activeSessionId:null};ps.workshop.sessions ||= [];
  return ps;
}
function state(){const g=graph();if(!g)return null;return ensure(g)}
function shell(){
  if(root&&root.isConnected)return root;
  root=document.createElement('div');root.id='rt194-presentation-workshop';root.className='rt194-overlay';root.hidden=true;document.body.appendChild(root);return root;
}
function close(){const r=shell();r.hidden=true;r.innerHTML=''}
function frames(){return canvas()?.frames?.()||[]}
function stageSlides(){
  const g=graph();if(!g)return[];const jid=canvas()?.context?.()?.journeyId||canvas()?.context?.()?.activeJourneyId||bridge()?.currentJourneyId?.();const j=g.journeys?.[jid];if(!j)return[];
  return (j.stageIds||[]).map((id,index)=>{const st=g.stages?.[id]||{};return{type:'stage',id,title:st.title||`Etapa ${index+1}`,index,customerAction:st.customerAction||'',emotion:st.emotion||'',touchpoints:(st.touchpointIds||[]).map(x=>g.touchpoints?.[x]?.name).filter(Boolean),problems:(st.problemIds||[]).map(x=>g.problems?.[x]?.description).filter(Boolean),opportunities:(st.opportunityIds||[]).map(x=>g.opportunities?.[x]?.title).filter(Boolean)}})
}
function orderedFrameSlides(){
  const fs=frames(),ps=state();if(!ps)return fs;const bid=canvas()?.context?.()?.boardId||'board';const saved=ps.frameOrderByBoard?.[bid]||[];const rank=new Map(saved.map((id,i)=>[id,i]));return [...fs].sort((a,b)=>(rank.has(a.id)?rank.get(a.id):9999+a.order)-(rank.has(b.id)?rank.get(b.id):9999+b.order)).map((x,i)=>({...x,type:'frame',index:i}));
}
function slides(source=state()?.slideSource||'frames'){const f=orderedFrameSlides();return source==='frames'&&f.length?f:stageSlides()}
function slideNote(id){return state()?.notes?.[id]||''}
function saveNote(id,value){mutate(g=>{ensure(g).notes[id]=value},'Salvar nota da apresentação')}
function moveFrame(id,dir){const ctx=canvas()?.context?.();if(!ctx)return;mutate(g=>{const ps=ensure(g),list=orderedFrameSlides().map(x=>x.id),i=list.indexOf(id),j=Math.max(0,Math.min(list.length-1,i+dir));if(i<0||i===j)return;[list[i],list[j]]=[list[j],list[i]];ps.frameOrderByBoard[ctx.boardId]=list},'Reordenar slides');render('presentation')}
function setSource(source){mutate(g=>{ensure(g).slideSource=source},'Alterar fonte dos slides');render('presentation')}
function show(tab='presentation'){runtime.api('operatingReview')?.hide?.();const r=shell();r.hidden=false;render(tab)}
function render(tab='presentation'){
  const r=shell(),g=graph();if(!g){r.innerHTML='<div class="rt194-panel">Carregando…</div>';setTimeout(()=>render(tab),50);return}ensure(g);const ps=state(),active=activeSession(),ss=slides(tab==='workshop'&&active?active.source:ps.slideSource);
  r.innerHTML=`<div class="rt194-panel" role="dialog" aria-modal="true" aria-label="Apresentação e Workshop"><header><div><span>FACILITAR · ${esc(g.service.name||'Serviço')}</span><h2>Apresentação & Workshop</h2><p>Transforme Frames e etapas em narrativa, conduza sessões e registre decisões.</p></div><button data-close aria-label="Fechar">×</button></header><nav><button data-tab="presentation" class="${tab==='presentation'?'active':''}">Apresentação</button><button data-tab="workshop" class="${tab==='workshop'?'active':''}">Workshop</button><button data-tab="results" class="${tab==='results'?'active':''}">Resultados</button></nav><main>${tab==='presentation'?presentationHtml(ps,ss):tab==='workshop'?workshopHtml(ps,ss,active):resultsHtml(ps)}</main></div>`;
  r.onclick=e=>{if(e.target===r)close()};r.querySelector('[data-close]').onclick=close;r.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>render(b.dataset.tab));bind(r,tab,ss)
}
function presentationHtml(ps,ss){
  const frameCount=frames().length,source=ps.slideSource==='frames'&&frameCount?'frames':'stages';
  return `<section class="rt194-section"><div class="rt194-section-head"><div><h3>Narrativa do serviço</h3><p>Frames funcionam como slides. Sem Frames, use as etapas da Jornada como roteiro automático.</p></div><button class="rt194-primary" data-present ${ss.length?'':'disabled'}>▶ Apresentar</button></div><div class="rt194-source"><button data-source="frames" class="${source==='frames'?'active':''}" ${frameCount?'':'disabled'}>▣ Frames <small>${frameCount}</small></button><button data-source="stages" class="${source==='stages'?'active':''}">≡ Etapas <small>${stageSlides().length}</small></button></div>${!ss.length?'<div class="rt194-empty"><b>Nada para apresentar ainda</b><p>Crie Frames no Whiteboard ou etapas na Jornada.</p></div>':`<div class="rt194-slide-list">${ss.map((s,i)=>slideRow(s,i,source)).join('')}</div>`}</section>`
}
function slideRow(s,i,source){return `<article class="rt194-slide-row"><div class="rt194-slide-no">${String(i+1).padStart(2,'0')}</div><div class="rt194-slide-copy"><span>${source==='frames'?'FRAME':'ETAPA'}</span><h4>${esc(s.title||s.name||'Sem título')}</h4>${source==='stages'?`<p>${esc(s.customerAction||'Sem ação do cliente definida')}</p>`:`<p>${esc(s.subtitle||'Parte do serviço')}</p>`}<label>Nota do apresentador<textarea data-note="${esc(s.id)}" rows="2" placeholder="Contexto, mensagem-chave, decisão esperada…">${esc(slideNote(s.id))}</textarea></label></div><div class="rt194-slide-actions">${source==='frames'?`<button data-up="${s.id}" title="Mover para cima">↑</button><button data-down="${s.id}" title="Mover para baixo">↓</button>`:''}<button data-preview="${s.id}">Ver</button></div></article>`}
function workshopHtml(ps,ss,active){
  if(!active){
    const preferred=frames().length?'frames':'stages';
    const alternate=frames().length?'<option value="stages">Etapas da Jornada</option>':'';
    return `<section class="rt194-section">
      <div class="rt194-section-head"><div><h3>Workshop guiado</h3><p>Use o roteiro da apresentação como agenda. Timer, foco e votação ficam associados à sessão.</p></div></div>
      <form class="rt194-workshop-start">
        <label>Nome da sessão<input name="name" value="Workshop · ${new Date().toLocaleDateString('pt-BR')}" required></label>
        <label>Duração por atividade<select name="minutes"><option>5</option><option selected>10</option><option>15</option><option>25</option></select></label>
        <label>Agenda<select name="source"><option value="${preferred}">${preferred==='frames'?'Frames do quadro':'Etapas da Jornada'}</option>${alternate}</select></label>
        <div class="rt194-info"><b>Facilitação local</b><span>Votos nesta versão são registrados localmente no projeto. Colaboração multiusuário em tempo real não está ativa.</span></div>
        <button class="rt194-primary">Iniciar workshop</button>
      </form>
    </section>`;
  }
  const top=topVotes(active);
  const agenda=ss.map((s,i)=>`<button data-work-slide="${i}" class="${Number(active.currentIndex||0)===i?'active':''}"><i>${i+1}</i><span><b>${esc(s.title||s.name)}</b><small>${slideNote(s.id)?'Tem nota do apresentador':'Sem nota'}</small></span></button>`).join('');
  const ranked=top.length?`<div class="rt194-top-votes">${top.slice(0,5).map((x,i)=>`<span><i>${i+1}</i><b>${esc(x.label)}</b><em>${x.votes}</em></span>`).join('')}</div>`:'';
  return `<section class="rt194-section">
    <div class="rt194-session-head"><div><span>SESSÃO ATIVA</span><h3>${esc(active.name)}</h3><p>${ss.length} atividade(s) · ${Object.values(active.votes||{}).reduce((a,b)=>a+b,0)} voto(s)</p></div><div class="rt194-session-actions"><button data-open-dock>Conduzir no canvas</button><button class="danger" data-end-session>Encerrar</button></div></div>
    <div class="rt194-workshop-grid">
      <div class="rt194-agenda"><h4>Agenda</h4>${agenda}</div>
      <div class="rt194-facilitate">
        <div class="rt194-timer"><small>TIMER DA ATIVIDADE</small><strong data-timer>--:--</strong><div><button data-timer-start>Iniciar</button><button data-timer-pause>Pausar</button><button data-timer-reset>Reiniciar</button></div></div>
        <div class="rt194-vote"><small>VOTAÇÃO</small><h4>Selecione um objeto no canvas e vote</h4><p data-selection>${esc(canvas()?.selection?.()?.label||'Nenhum objeto selecionado')}</p><button class="rt194-primary" data-vote>+ 1 voto no selecionado</button>${ranked}</div>
        <label class="rt194-notes">Notas da sessão<textarea data-session-notes rows="6" placeholder="Decisões, dúvidas, próximos passos…">${esc(active.notes||'')}</textarea></label>
      </div>
    </div>
  </section>`;
}
function resultsHtml(ps){const sessions=[...(ps.workshop?.sessions||[])].reverse();return `<section class="rt194-section"><div class="rt194-section-head"><div><h3>Histórico de workshops</h3><p>Registro das sessões, decisões e itens mais votados.</p></div></div>${sessions.length?`<div class="rt194-results">${sessions.map(s=>`<article><div><span>${s.endedAt?'ENCERRADO':'EM ANDAMENTO'}</span><h4>${esc(s.name)}</h4><p>${new Date(s.startedAt).toLocaleString('pt-BR')} · ${Object.values(s.votes||{}).reduce((a,b)=>a+b,0)} voto(s)</p></div><button data-result="${s.id}">Ver resumo</button></article>`).join('')}</div>`:'<div class="rt194-empty"><b>Nenhum workshop registrado</b><p>Inicie uma sessão para criar histórico.</p></div>'}</section>`}
function bind(r,tab,ss){
  r.querySelectorAll('[data-source]').forEach(b=>b.onclick=()=>setSource(b.dataset.source));r.querySelector('[data-present]')?.addEventListener('click',()=>startPresentation(state()?.slideSource));
  r.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>moveFrame(b.dataset.up,-1));r.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>moveFrame(b.dataset.down,1));
  r.querySelectorAll('[data-preview]').forEach(b=>b.onclick=()=>{const i=ss.findIndex(s=>s.id===b.dataset.preview);startPresentation(state()?.slideSource,Math.max(0,i))});
  r.querySelectorAll('[data-note]').forEach(t=>t.onchange=()=>saveNote(t.dataset.note,t.value));
  const start=r.querySelector('.rt194-workshop-start');if(start)start.onsubmit=e=>{e.preventDefault();const fd=new FormData(start);startSession(String(fd.get('name')||'Workshop'),Number(fd.get('minutes')||10),String(fd.get('source')||'stages'))};
  r.querySelector('[data-open-dock]')?.addEventListener('click',runWorkshopDock);r.querySelector('[data-end-session]')?.addEventListener('click',endSession);r.querySelectorAll('[data-work-slide]').forEach(b=>b.onclick=()=>setWorkshopSlide(Number(b.dataset.workSlide)));
  r.querySelector('[data-timer-start]')?.addEventListener('click',startTimer);r.querySelector('[data-timer-pause]')?.addEventListener('click',pauseTimer);r.querySelector('[data-timer-reset]')?.addEventListener('click',resetTimer);r.querySelector('[data-vote]')?.addEventListener('click',voteSelected);r.querySelector('[data-session-notes]')?.addEventListener('change',e=>updateSession(s=>{s.notes=e.target.value},'Salvar notas do workshop'));
  r.querySelectorAll('[data-result]').forEach(b=>b.onclick=()=>showResult(b.dataset.result));if(tab==='workshop')tickTimer();
}
function startPresentation(source='frames',index=0){source=(source==='frames'&&frames().length)?'frames':'stages';const ss=slides(source);if(!ss.length)return;close();presenting={source,index,slides:ss};document.body.classList.add('rt194-presenting');renderPresentationChrome();focusPresentationSlide();keyHandler=e=>{if(e.key==='Escape'){endPresentation();return}if(['ArrowRight','PageDown',' '].includes(e.key)){e.preventDefault();nextPresentation(1)}if(['ArrowLeft','PageUp'].includes(e.key)){e.preventDefault();nextPresentation(-1)}};document.addEventListener('keydown',keyHandler,true)}
function renderPresentationChrome(){document.getElementById('rt194-presenter')?.remove();const p=presenting;if(!p)return;const s=p.slides[p.index],el=document.createElement('div');el.id='rt194-presenter';el.className='rt194-presenter '+(p.source==='stages'?'stage':'frame');if(p.source==='stages')el.innerHTML=`<div class="rt194-stage-slide"><small>ETAPA ${p.index+1} DE ${p.slides.length}</small><h1>${esc(s.title)}</h1><div class="rt194-stage-action"><span>AÇÃO DO CLIENTE</span><p>${esc(s.customerAction||'Não definida')}</p></div><div class="rt194-stage-columns"><div><span>Touchpoints</span>${s.touchpoints.length?s.touchpoints.map(x=>`<b>${esc(x)}</b>`).join(''):'<em>Nenhum</em>'}</div><div><span>Problemas</span>${s.problems.length?s.problems.map(x=>`<b>${esc(x)}</b>`).join(''):'<em>Nenhum</em>'}</div><div><span>Oportunidades</span>${s.opportunities.length?s.opportunities.map(x=>`<b>${esc(x)}</b>`).join(''):'<em>Nenhuma</em>'}</div></div>${slideNote(s.id)?`<aside><b>Nota do apresentador</b><p>${esc(slideNote(s.id))}</p></aside>`:''}</div>`;
  const chrome=document.createElement('div');chrome.className='rt194-presenter-chrome';chrome.innerHTML=`<button data-prev aria-label="Anterior">←</button><span><b>${esc(s.title||s.name)}</b><small>${p.index+1} / ${p.slides.length}</small></span><button data-next aria-label="Próximo">→</button><button data-exit>Encerrar</button>`;el.appendChild(chrome);document.body.appendChild(el);el.querySelector('[data-prev]').onclick=()=>nextPresentation(-1);el.querySelector('[data-next]').onclick=()=>nextPresentation(1);el.querySelector('[data-exit]').onclick=endPresentation}
function focusPresentationSlide(){const p=presenting;if(!p)return;const s=p.slides[p.index];if(p.source==='frames')canvas()?.focusFrame?.(s.id);renderPresentationChrome()}
function nextPresentation(d){if(!presenting)return;presenting.index=Math.max(0,Math.min(presenting.slides.length-1,presenting.index+d));focusPresentationSlide()}
function endPresentation(){presenting=null;document.body.classList.remove('rt194-presenting');document.getElementById('rt194-presenter')?.remove();if(keyHandler)document.removeEventListener('keydown',keyHandler,true);keyHandler=null}
function runWorkshopDock(){
  close();document.getElementById('rt194-workshop-dock')?.remove();const a=activeSession();if(!a)return;const ss=slides(a.source),idx=Math.max(0,Math.min(ss.length-1,Number(a.currentIndex||0))),target=ss[idx];
  if(target?.type==='frame')canvas()?.focusFrame?.(target.id);
  const dock=document.createElement('aside');dock.id='rt194-workshop-dock';dock.className='rt194-workshop-dock';dock.innerHTML=`<header><div><span>WORKSHOP</span><b>${esc(a.name)}</b></div><button data-minimize aria-label="Fechar painel">×</button></header><div class="rt194-dock-activity"><small>ATIVIDADE ${idx+1} / ${ss.length}</small><strong>${esc(target?.title||target?.name||'Sem atividade')}</strong></div><div class="rt194-dock-nav"><button data-prev>←</button><button data-next>→</button></div><div class="rt194-dock-timer"><strong data-dock-timer>--:--</strong><div><button data-start>▶</button><button data-pause>Ⅱ</button><button data-reset>↺</button></div></div><div class="rt194-dock-vote"><small>OBJETO SELECIONADO</small><b data-dock-selection>${esc(canvas()?.selection?.()?.label||'Nenhum')}</b><button class="rt194-primary" data-dock-vote>+ 1 voto</button></div><footer><button data-open-workspace>Abrir workspace</button><button class="danger" data-dock-end>Encerrar</button></footer>`;
  document.body.appendChild(dock);
  const changeIndex=delta=>{const cur=activeSession();if(!cur)return;const ni=Math.max(0,Math.min(ss.length-1,Number(cur.currentIndex||0)+delta));mutate(g=>{const s=ensure(g).workshop.sessions.find(x=>x.id===cur.id);if(s)s.currentIndex=ni},'Avançar atividade');runWorkshopDock()};
  const dockUpdate=(fn,label)=>{const cur=activeSession();if(!cur)return;mutate(g=>{const s=ensure(g).workshop.sessions.find(x=>x.id===cur.id);if(s)fn(s)},label);runWorkshopDock()};
  dock.querySelector('[data-minimize]').onclick=()=>dock.remove();dock.querySelector('[data-prev]').onclick=()=>changeIndex(-1);dock.querySelector('[data-next]').onclick=()=>changeIndex(1);
  dock.querySelector('[data-start]').onclick=()=>dockUpdate(s=>{const sec=Math.max(1,Number(s.timerRemainingSec||s.timerMinutes*60));s.timerRunning=true;s.timerEndsAt=new Date(Date.now()+sec*1000).toISOString()},'Iniciar timer');
  dock.querySelector('[data-pause]').onclick=()=>dockUpdate(s=>{const rem=s.timerEndsAt?Math.max(0,Math.ceil((new Date(s.timerEndsAt).getTime()-Date.now())/1000)):Number(s.timerRemainingSec||0);s.timerRunning=false;s.timerRemainingSec=rem;s.timerEndsAt=null},'Pausar timer');
  dock.querySelector('[data-reset]').onclick=()=>dockUpdate(s=>{s.timerRunning=false;s.timerEndsAt=null;s.timerRemainingSec=s.timerMinutes*60},'Reiniciar timer');
  dock.querySelector('[data-dock-vote]').onclick=()=>{const sel=canvas()?.selection?.();if(!sel?.id)return;dockUpdate(s=>{s.votes[sel.id]=(s.votes[sel.id]||0)+1;s.voteLabels[sel.id]=sel.label||'Objeto'},'Registrar voto')};
  dock.querySelector('[data-open-workspace]').onclick=()=>{dock.remove();show('workshop')};dock.querySelector('[data-dock-end]').onclick=()=>{dock.remove();endSession()};
  tickDock();
}
function tickDock(){clearTimeout(timerHandle);const dock=document.getElementById('rt194-workshop-dock'),a=activeSession();if(!dock||!a)return;let sec=a.timerRunning&&a.timerEndsAt?Math.max(0,Math.ceil((new Date(a.timerEndsAt).getTime()-Date.now())/1000)):Number(a.timerRemainingSec||a.timerMinutes*60);const t=dock.querySelector('[data-dock-timer]');if(t){t.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;t.classList.toggle('ended',sec===0)}const sel=dock.querySelector('[data-dock-selection]');if(sel)sel.textContent=canvas()?.selection?.()?.label||'Nenhum';if(sec===0&&a.timerRunning){mutate(g=>{const s=ensure(g).workshop.sessions.find(x=>x.id===a.id);if(s){s.timerRunning=false;s.timerRemainingSec=0;s.timerEndsAt=null}},'Finalizar timer')}timerHandle=setTimeout(tickDock,500)}
function activeSession(){const ps=state(),id=ps?.workshop?.activeSessionId;return ps?.workshop?.sessions?.find(s=>s.id===id&&!s.endedAt)||null}
function startSession(name,minutes,source){const id=uid('workshop');mutate(g=>{const ps=ensure(g);ps.workshop.timerMinutes=minutes;ps.workshop.activeSessionId=id;ps.workshop.sessions.push({id,name:name.trim()||'Workshop',source,startedAt:now(),endedAt:null,currentIndex:0,timerMinutes:minutes,timerEndsAt:null,timerRemainingSec:minutes*60,timerRunning:false,votes:{},voteLabels:{},notes:''})},'Iniciar workshop');render('workshop')}
function updateSession(fn,label){const a=activeSession();if(!a)return;mutate(g=>{const s=ensure(g).workshop.sessions.find(x=>x.id===a.id);if(s)fn(s)},label);render('workshop')}
function setWorkshopSlide(i){const a=activeSession();if(!a)return;updateSession(s=>{s.currentIndex=i},'Avançar atividade');const ss=slides(a.source),target=ss[i];if(target?.type==='frame')canvas()?.focusFrame?.(target.id)}
function startTimer(){const a=activeSession();if(!a)return;const sec=Math.max(1,Number(a.timerRemainingSec||a.timerMinutes*60));updateSession(s=>{s.timerRunning=true;s.timerEndsAt=new Date(Date.now()+sec*1000).toISOString()},'Iniciar timer')}
function pauseTimer(){const a=activeSession();if(!a)return;const rem=a.timerEndsAt?Math.max(0,Math.ceil((new Date(a.timerEndsAt).getTime()-Date.now())/1000)):Number(a.timerRemainingSec||0);updateSession(s=>{s.timerRunning=false;s.timerRemainingSec=rem;s.timerEndsAt=null},'Pausar timer')}
function resetTimer(){const a=activeSession();if(!a)return;updateSession(s=>{s.timerRunning=false;s.timerEndsAt=null;s.timerRemainingSec=s.timerMinutes*60},'Reiniciar timer')}
function tickTimer(){clearTimeout(timerHandle);const el=shell().querySelector('[data-timer]'),a=activeSession();if(!el||!a)return;let sec=a.timerRunning&&a.timerEndsAt?Math.max(0,Math.ceil((new Date(a.timerEndsAt).getTime()-Date.now())/1000)):Number(a.timerRemainingSec||a.timerMinutes*60);el.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;el.classList.toggle('ended',sec===0);if(sec===0&&a.timerRunning){mutate(g=>{const s=ensure(g).workshop.sessions.find(x=>x.id===a.id);if(s){s.timerRunning=false;s.timerRemainingSec=0;s.timerEndsAt=null}},'Finalizar timer')}else timerHandle=setTimeout(tickTimer,500)}
function voteSelected(){const a=activeSession(),sel=canvas()?.selection?.();if(!a||!sel?.id)return;updateSession(s=>{s.votes[sel.id]=(s.votes[sel.id]||0)+1;s.voteLabels[sel.id]=sel.label||'Objeto'},'Registrar voto')}
function topVotes(s){return Object.entries(s?.votes||{}).map(([id,votes])=>({id,votes,label:s.voteLabels?.[id]||id})).sort((a,b)=>b.votes-a.votes)}
function endSession(){const a=activeSession();if(!a)return;mutate(g=>{const ps=ensure(g),s=ps.workshop.sessions.find(x=>x.id===a.id);if(s){s.endedAt=now();s.timerRunning=false;s.timerEndsAt=null}s&& (s.summary={topVotes:topVotes(s).slice(0,10)});ps.workshop.activeSessionId=null},'Encerrar workshop');render('results')}
function showResult(id){const s=state()?.workshop?.sessions?.find(x=>x.id===id);if(!s)return;const wrap=document.createElement('div');wrap.className='rt194-mini-modal';wrap.innerHTML=`<div><header><span>RESUMO DO WORKSHOP</span><h3>${esc(s.name)}</h3><button data-close>×</button></header><p>${new Date(s.startedAt).toLocaleString('pt-BR')}${s.endedAt?` → ${new Date(s.endedAt).toLocaleString('pt-BR')}`:''}</p><h4>Mais votados</h4><div class="rt194-summary-votes">${topVotes(s).length?topVotes(s).map((x,i)=>`<span><i>${i+1}</i><b>${esc(x.label)}</b><em>${x.votes}</em></span>`).join(''):'<p>Sem votos registrados.</p>'}</div><h4>Notas</h4><p class="notes">${esc(s.notes||'Nenhuma nota registrada.')}</p></div>`;document.body.appendChild(wrap);wrap.querySelector('[data-close]').onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove()}}
function model(){const g=graph();if(!g)return null;ensure(g);return{presentation:state(),frames:frames(),stages:stageSlides(),activeSession:activeSession()}}
function bootstrap(){runtime.register('presentationWorkshop',{version:VERSION,show,close,startPresentation,model,endPresentation},VERSION)}
window.addEventListener('rt-app-ready',()=>setTimeout(bootstrap,0));if(document.readyState!=='loading')setTimeout(bootstrap,0);else document.addEventListener('DOMContentLoaded',()=>setTimeout(bootstrap,0));

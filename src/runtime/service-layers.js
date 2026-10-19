import { runtime } from './runtime-registry.js';

const VERSION='__APP_VERSION__';
const LAYERS={
  experience:{label:'Experiência',icon:'◎',description:'Cliente, etapas, necessidades, touchpoints, canais e emoções.',kinds:['stage','persona','customerAction','need','expectation','touchpoint','channel','emotion']},
  research:{label:'Pesquisa',icon:'⌕',description:'Evidências e insights que sustentam decisões.',kinds:['evidence','insight']},
  friction:{label:'Problemas',icon:'!',description:'Fricções e problemas encontrados na experiência.',kinds:['problem']},
  improvement:{label:'Melhoria',icon:'◇',description:'Oportunidades, soluções e experimentos.',kinds:['opportunity','solution','experiment']},
  operation:{label:'Operação',icon:'▦',description:'Frontstage, backstage, processos, sistemas, recursos e tarefas.',kinds:['frontstage','backstage','process','system','resource','responsible','task']},
  measurement:{label:'Medição',icon:'∿',description:'Métricas e sinais usados para acompanhar o serviço.',kinds:['metric']},
};
const PRESETS={
  all:{label:'Tudo',layers:Object.keys(LAYERS)},
  experience:{label:'Experiência',layers:['experience','friction','improvement']},
  operations:{label:'Operação',layers:['experience','operation','measurement']},
  research:{label:'Pesquisa',layers:['research','friction','improvement']},
  improvement:{label:'Melhoria',layers:['friction','improvement','measurement']},
};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const now=()=>new Date().toISOString();
const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
function bridge(){return runtime.api('dataBridge')}
function graph(){return bridge()?.get?.()||null}
function ensure(g){
  g.service ||= {};
  g.service.layerSettings ||= {visibleLayers:Object.keys(LAYERS),preset:'all'};
  if(!Array.isArray(g.service.layerSettings.visibleLayers))g.service.layerSettings.visibleLayers=Object.keys(LAYERS);
  g.service.scenarios ||= {
    current:{id:'current',name:'Atual',description:'Como o serviço funciona hoje.',kind:'current',createdAt:g.service.createdAt||now()},
    future:{id:'future',name:'Futuro',description:'Como o serviço deve funcionar no estado desejado.',kind:'future',createdAt:now()},
  };
  g.service.scenarioState ||= {mode:'all',activeScenarioId:'current',compareScenarioId:'future'};
  return g;
}
function mutate(fn,label){const b=bridge();if(!b?.transact)return false;b.transact(g=>{ensure(g);fn(g);g.service.updatedAt=now();return g},label);runtime.emit('rt-service-layers-changed',{});refresh();return true}
function layerForKind(kind){return Object.entries(LAYERS).find(([,d])=>d.kinds.includes(kind))?.[0]||null}
function scenarioIds(rec){
  if(!rec)return [];
  if(Array.isArray(rec.scenarioIds)&&rec.scenarioIds.length)return rec.scenarioIds;
  const st=rec.experienceState;
  if(st==='future')return ['future'];if(st==='both')return ['current','future'];
  return ['current'];
}
function itemVisible({kind,record}){
  const g=graph();if(!g)return true;ensure(g);
  const layer=layerForKind(kind);if(layer&&!g.service.layerSettings.visibleLayers.includes(layer))return false;
  if(kind==='stage')return true;
  const state=g.service.scenarioState||{},mode=state.mode||'all';if(mode==='all'||!record)return true;
  const ids=scenarioIds(record),a=state.activeScenarioId||'current';
  if(mode==='single')return ids.includes(a);
  if(mode==='compare'){const b=state.compareScenarioId||'future';return ids.includes(a)||ids.includes(b)}
  return true;
}
function allRecords(g){
  const out=[];for(const [kind,col] of Object.entries({stage:g.stages||{},touchpoint:g.touchpoints||{},problem:g.problems||{},opportunity:g.opportunities||{},task:g.tasks||{},...(g.entities||{})}))for(const rec of Object.values(col||{}))out.push({kind,rec});return out;
}
function counts(g,scenarioId){const c={};Object.keys(LAYERS).forEach(k=>c[k]=0);for(const {kind,rec} of allRecords(g)){const l=layerForKind(kind);if(l&&scenarioIds(rec).includes(scenarioId))c[l]++}return c}
function shell(){let r=document.getElementById('rt193-service-layers');if(!r){r=document.createElement('div');r.id='rt193-service-layers';r.className='rt193-overlay';r.hidden=true;document.body.appendChild(r)}return r}
function close(){const r=shell();r.hidden=true;r.innerHTML=''}
function show(tab='layers'){runtime.api('operatingReview')?.hide?.();const r=shell();r.hidden=false;render(tab)}
function render(tab='layers'){
  const r=shell(),g=graph();if(!g){r.innerHTML='<div class="rt193-panel">Carregando…</div>';setTimeout(()=>render(tab),60);return}ensure(g);const ls=g.service.layerSettings,ss=g.service.scenarioState,sc=Object.values(g.service.scenarios||{});
  r.innerHTML=`<div class="rt193-panel" role="dialog" aria-modal="true" aria-label="Camadas e cenários"><header><div><span>ESTRUTURA DO SERVIÇO</span><h2>Camadas & Cenários</h2><p>Controle o que você vê e compare alternativas sem duplicar o Service Graph.</p></div><button data-close aria-label="Fechar">×</button></header><nav><button data-tab="layers" class="${tab==='layers'?'active':''}">Camadas</button><button data-tab="scenarios" class="${tab==='scenarios'?'active':''}">Cenários</button><button data-tab="compare" class="${tab==='compare'?'active':''}">Comparar</button></nav><main>${tab==='layers'?layersHtml(ls):tab==='scenarios'?scenariosHtml(sc,ss):compareHtml(g,sc,ss)}</main></div>`;
  r.onclick=e=>{if(e.target===r)close()};r.querySelector('[data-close]').onclick=close;r.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>render(b.dataset.tab));bind(r,tab,g)
}
function layersHtml(ls){return `<section class="rt193-section"><div class="rt193-section-head"><div><h3>Leitura do serviço</h3><p>Camadas alteram apenas a visibilidade, nunca os dados.</p></div><span>${ls.visibleLayers.length}/${Object.keys(LAYERS).length} visíveis</span></div><div class="rt193-presets">${Object.entries(PRESETS).map(([k,p])=>`<button data-preset="${k}" class="${ls.preset===k?'active':''}">${p.label}</button>`).join('')}</div><div class="rt193-layer-list">${Object.entries(LAYERS).map(([k,d])=>`<label><input type="checkbox" data-layer="${k}" ${ls.visibleLayers.includes(k)?'checked':''}><i>${d.icon}</i><span><b>${d.label}</b><small>${d.description}</small></span></label>`).join('')}</div></section>`}
function scenariosHtml(sc,ss){return `<section class="rt193-section"><div class="rt193-section-head"><div><h3>Cenários do serviço</h3><p>Um objeto pode pertencer a mais de um cenário sem ser duplicado.</p></div><button class="rt193-primary" data-new-scenario>+ Cenário</button></div><div class="rt193-mode"><label><input type="radio" name="mode" value="all" ${ss.mode==='all'?'checked':''}> Todos</label><label><input type="radio" name="mode" value="single" ${ss.mode==='single'?'checked':''}> Um cenário</label><label><input type="radio" name="mode" value="compare" ${ss.mode==='compare'?'checked':''}> Comparar dois</label></div><div class="rt193-scenario-list">${sc.map(s=>`<article><div><span>${s.kind==='current'?'ATUAL':s.kind==='future'?'FUTURO':'CENÁRIO'}</span><h4>${esc(s.name)}</h4><p>${esc(s.description||'Sem descrição')}</p></div><div class="rt193-scenario-actions"><button data-active="${s.id}" class="${ss.activeScenarioId===s.id?'active':''}">Ativo</button><button data-compare="${s.id}" class="${ss.compareScenarioId===s.id?'active':''}">Comparar</button>${!['current','future'].includes(s.id)?`<button data-delete="${s.id}" class="danger">Excluir</button>`:''}</div></article>`).join('')}</div></section>`}
function compareHtml(g,sc,ss){const a=g.service.scenarios[ss.activeScenarioId]||sc[0],b=g.service.scenarios[ss.compareScenarioId]||sc[1]||a,ca=counts(g,a.id),cb=counts(g,b.id);return `<section class="rt193-section"><div class="rt193-section-head"><div><h3>Comparação estrutural</h3><p>Compare cobertura por camada entre dois cenários.</p></div></div><div class="rt193-compare-selects"><select data-select-a>${sc.map(s=>`<option value="${s.id}" ${s.id===a.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select><span>×</span><select data-select-b>${sc.map(s=>`<option value="${s.id}" ${s.id===b.id?'selected':''}>${esc(s.name)}</option>`).join('')}</select></div><div class="rt193-compare-grid"><div class="head">Camada</div><div class="head">${esc(a.name)}</div><div class="head">${esc(b.name)}</div><div class="head">Δ</div>${Object.entries(LAYERS).map(([k,d])=>{const dlt=cb[k]-ca[k];return `<div><b>${d.icon} ${d.label}</b></div><div>${ca[k]}</div><div>${cb[k]}</div><div class="${dlt>0?'plus':dlt<0?'minus':''}">${dlt>0?'+':''}${dlt}</div>`}).join('')}</div><div class="rt193-compare-foot"><button class="rt193-primary" data-apply-compare>Visualizar comparação no canvas</button><small>O canvas exibirá objetos pertencentes a qualquer um dos dois cenários.</small></div></section>`}
function bind(root,tab,g){
  root.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>mutate(gr=>{const p=PRESETS[b.dataset.preset];gr.service.layerSettings.visibleLayers=[...p.layers];gr.service.layerSettings.preset=b.dataset.preset},'Aplicar preset de camadas'));
  root.querySelectorAll('[data-layer]').forEach(i=>i.onchange=()=>mutate(gr=>{const set=new Set(gr.service.layerSettings.visibleLayers);i.checked?set.add(i.dataset.layer):set.delete(i.dataset.layer);gr.service.layerSettings.visibleLayers=[...set];gr.service.layerSettings.preset='custom'},'Alterar camadas visíveis'));
  root.querySelectorAll('input[name=mode]').forEach(i=>i.onchange=()=>mutate(gr=>{gr.service.scenarioState.mode=i.value},'Alterar modo de cenário'));
  root.querySelectorAll('[data-active]').forEach(b=>b.onclick=()=>mutate(gr=>{gr.service.scenarioState.activeScenarioId=b.dataset.active;gr.service.scenarioState.mode='single'},'Abrir cenário'));
  root.querySelectorAll('[data-compare]').forEach(b=>b.onclick=()=>mutate(gr=>{gr.service.scenarioState.compareScenarioId=b.dataset.compare;gr.service.scenarioState.mode='compare'},'Selecionar cenário para comparação'));
  root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>mutate(gr=>{delete gr.service.scenarios[b.dataset.delete];if(gr.service.scenarioState.activeScenarioId===b.dataset.delete)gr.service.scenarioState.activeScenarioId='current';if(gr.service.scenarioState.compareScenarioId===b.dataset.delete)gr.service.scenarioState.compareScenarioId='future'},'Excluir cenário'));
  root.querySelector('[data-new-scenario]')?.addEventListener('click',scenarioDialog);
  const sa=root.querySelector('[data-select-a]'),sb=root.querySelector('[data-select-b]');if(sa)sa.onchange=()=>mutate(gr=>{gr.service.scenarioState.activeScenarioId=sa.value},'Selecionar cenário A');if(sb)sb.onchange=()=>mutate(gr=>{gr.service.scenarioState.compareScenarioId=sb.value},'Selecionar cenário B');
  root.querySelector('[data-apply-compare]')?.addEventListener('click',()=>mutate(gr=>{gr.service.scenarioState.mode='compare'},'Comparar cenários'));
}
function scenarioDialog(){const wrap=document.createElement('div');wrap.className='rt193-mini-modal';wrap.innerHTML='<form><h3>Novo cenário</h3><p>Crie uma alternativa sem duplicar entidades.</p><label>Nome<input name="name" required placeholder="Ex.: Piloto A"></label><label>Descrição<textarea name="description" rows="3" placeholder="O que este cenário representa?"></textarea></label><label><input type="checkbox" name="baseline" checked> Usar o cenário Atual como baseline</label><footer><button type="button" data-cancel>Cancelar</button><button class="rt193-primary">Criar cenário</button></footer></form>';document.body.appendChild(wrap);wrap.querySelector('[data-cancel]').onclick=()=>wrap.remove();wrap.querySelector('form').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);mutate(g=>{const id=uid('scenario');g.service.scenarios[id]={id,name:String(fd.get('name')||'Novo cenário').trim(),description:String(fd.get('description')||'').trim(),kind:'alternative',createdAt:now()};if(fd.get('baseline'))for(const {rec} of allRecords(g)){const ids=new Set(scenarioIds(rec));if(ids.has('current')){ids.add(id);rec.scenarioIds=[...ids]}}g.service.scenarioState.activeScenarioId=id;g.service.scenarioState.mode='single'},'Criar cenário');wrap.remove();show('scenarios')}}
function appendScenarioControl(parent,kind,recordId){const g=graph();if(!g)return;ensure(g);const rec=(kind==='stage'?g.stages?.[recordId]:kind==='touchpoint'?g.touchpoints?.[recordId]:kind==='problem'?g.problems?.[recordId]:kind==='opportunity'?g.opportunities?.[recordId]:kind==='task'?g.tasks?.[recordId]:g.entities?.[kind]?.[recordId]);if(!rec)return;const box=document.createElement('div');box.className='rt193-inspector-scenarios';box.innerHTML='<small>Cenários</small><div></div>';const body=box.querySelector('div'),ids=new Set(scenarioIds(rec));Object.values(g.service.scenarios).forEach(s=>{const lab=document.createElement('label');lab.innerHTML=`<input type="checkbox" ${ids.has(s.id)?'checked':''}><span>${esc(s.name)}</span>`;lab.querySelector('input').onchange=e=>mutate(gr=>{const rr=(kind==='stage'?gr.stages?.[recordId]:kind==='touchpoint'?gr.touchpoints?.[recordId]:kind==='problem'?gr.problems?.[recordId]:kind==='opportunity'?gr.opportunities?.[recordId]:kind==='task'?gr.tasks?.[recordId]:gr.entities?.[kind]?.[recordId]);if(!rr)return;const set=new Set(scenarioIds(rr));e.target.checked?set.add(s.id):set.delete(s.id);rr.scenarioIds=[...set];rr.updatedAt=now()},'Relacionar objeto ao cenário');body.appendChild(lab)});parent.appendChild(box)}
function model(){const g=graph();if(!g)return null;ensure(g);return{layers:LAYERS,settings:g.service.layerSettings,scenarios:g.service.scenarios,state:g.service.scenarioState}}
function refresh(){const r=document.getElementById('rt193-service-layers');if(r&&!r.hidden)render(r.querySelector('nav .active')?.dataset.tab||'layers')}
function bootstrap(){runtime.register('serviceLayers',{version:VERSION,show,close,model,layerForKind,itemVisible,scenarioIds,appendScenarioControl},VERSION)}
window.addEventListener('rt-app-ready',()=>setTimeout(bootstrap,0));window.addEventListener('rt-graph-changed',refresh);if(document.readyState!=='loading')setTimeout(bootstrap,0);else document.addEventListener('DOMContentLoaded',()=>setTimeout(bootstrap,0));

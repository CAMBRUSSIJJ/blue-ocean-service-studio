(()=>{'use strict';
const VERSION='__APP_VERSION__';
const q=(s,r=document)=>r.querySelector(s);const qa=(s,r=document)=>[...r.querySelectorAll(s)];
let queued=false,lastSection='Workspace',lastTitle='Workspace';
const PAGE_ROOTS=[
  ['#bo114-workspace-home','Workspace','Workspace'],
  ['#rt187-journey-home','Design','Jornadas'],
  ['#rt182-blueprint-home','Design','Blueprints'],
  ['#rt192-research-home','Entender','Pesquisa'],
  ['#rt195-intelligence-home','Entender','Inteligência'],
  ['#rt196-benefits-home','Melhorar','Benefícios'],
  ['#rt197-review-home','Operar','Revisão'],
  ['#rt1102-practical-simulation','Operar','Simulação'],
  ['#rt1101-collaboration','Workspace','Colaboração'],
  ['#bo1173-settings-home','Workspace','Configurações'],
];
function visible(el){return !!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'}
function graphModel(){try{return (window.BlueOceanRuntime||window.RealTalentRuntime)?.api?.('blueprintHome')?.model?.()||null}catch{return null}}
function currentContext(){for(const [sel,section,title] of PAGE_ROOTS){const el=q(sel);if(visible(el))return{section,title}}const current=q('aside nav button[aria-current="page"]');const title=(current?.getAttribute('title')||current?.textContent||'').replace(/\s+/g,' ').trim();if(/jornada/i.test(title))return{section:'Design',title:'Jornadas'};if(/blueprint/i.test(title))return{section:'Design',title:'Blueprints'};if(/plano/i.test(title))return{section:'Melhorar',title:'Plano de Ação'};return{section:lastSection,title:title||lastTitle}}
function serviceName(){const model=graphModel();if(model?.service?.name)return model.service.name;return q('.bo1163-service-switcher__copy strong')?.textContent?.trim()||q('.rt182-host-footer p')?.textContent?.trim()||'Serviço atual'}
function ensureCanonicalHeader(){const header=q('header.rt182-host-header');if(!header)return;header.dataset.bo1163='1';if(header.dataset.boPrecisionHeaderNative==='1'){const ctx=currentContext();lastSection=ctx.section;lastTitle=ctx.title;return;}const copy=q('.bo1163-header-copy',header)||header.firstElementChild;if(!copy)return;const ctx=currentContext();lastSection=ctx.section;lastTitle=ctx.title;let crumbs=q('.bo1163-breadcrumbs',copy);if(!crumbs){crumbs=document.createElement('nav');crumbs.className='bo1163-breadcrumbs';crumbs.setAttribute('aria-label','Breadcrumb');copy.prepend(crumbs)}crumbs.innerHTML='';const home=document.createElement('button');home.type='button';home.textContent='Workspace';home.onclick=()=>{q('[data-bo-workspace-home-nav]')?.click()};crumbs.appendChild(home);if(ctx.title!=='Workspace'){crumbs.append(Object.assign(document.createElement('span'),{textContent:'›'}));crumbs.append(Object.assign(document.createElement('span'),{textContent:ctx.section}));crumbs.append(Object.assign(document.createElement('span'),{textContent:'›'}));crumbs.append(Object.assign(document.createElement('strong'),{textContent:ctx.title}))}else crumbs.append(Object.assign(document.createElement('strong'),{textContent:'Workspace'}));const h=q('h2',copy);if(h&&ctx.title)h.textContent=ctx.title}
function ensureServiceContext(){const aside=q('aside.rt182-host-sidebar, #root aside');if(!aside||aside.dataset.boPrecisionSidebarNative==='1')return;let box=q('.bo1163-service-context',aside);if(box)return;const brand=q('.rt182-host-brand',aside);const nav=q('nav',aside);if(!brand||!nav)return;box=document.createElement('div');box.className='bo1163-service-context bo1163-service-context--runtime';const name=serviceName();box.innerHTML=`<button type="button" class="bo1163-service-switcher" aria-label="Serviço atual"><span class="bo1163-service-switcher__mark"><span></span></span><span class="bo1163-service-switcher__copy"><small>Serviço atual</small><strong>${name.replace(/[&<>"']/g,'')}</strong></span></button>`;aside.insertBefore(box,nav)}
function normalizeSaveStatus(){qa('.rt1410-save').forEach(el=>{el.classList.add('bo1163-board-save');el.title='Salvamento local e proteção do projeto'});qa('.rt1410-local,.rt1410-local-badge,[data-local-badge]').forEach(el=>el.classList.add('bo1163-hide-local-badge'))}
function normalizePageHeaders(){
 const selectors=['.rt182-home-header','.rt187-home-header','.rt192-header','.rt195-header','.rt196-header','.rt197-header','.rt1102-demo-header'];
 qa(selectors.join(',')).forEach(header=>{header.classList.add('bo1163-page-header');const eyebrow=header.querySelector('[class*="eyebrow"], :scope>div>span:first-child');if(eyebrow&&/^(MODELAR|EXECUTAR|GERENCIAR|ENTENDER|BLUEPRINT|JORNADA)/i.test((eyebrow.textContent||'').trim()))eyebrow.classList.add('bo1163-legacy-eyebrow')});
}
function normalizeActiveNav(){const aside=q('aside.rt182-host-sidebar, #root aside');if(!aside||aside.dataset.boPrecisionSidebarNative==='1')return;const buttons=qa('nav button',aside);let current=buttons.find(b=>b.getAttribute('aria-current')==='page');if(!current){const ctx=currentContext();current=buttons.find(b=>(b.getAttribute('title')||b.textContent||'').toLowerCase().includes(ctx.title.toLowerCase().replace('plano de ação','plano')))}buttons.forEach(b=>{const active=b===current;b.classList.toggle('is-active',active);if(active)b.setAttribute('aria-current','page');else if(b.getAttribute('aria-current')==='page')b.removeAttribute('aria-current')})}
function apply(){document.body.classList.add('bo-v1163');ensureCanonicalHeader();ensureServiceContext();normalizeSaveStatus();normalizePageHeaders();normalizeActiveNav()}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
function boot(){apply();['rt-app-ready','rt-runtime-registered','rt-navigation','rt-graph-changed','bo:inspector-open','bo:inspector-close','bo1173-workspace-open'].forEach(n=>window.addEventListener(n,schedule));document.addEventListener('click',e=>{if(e.target?.closest?.('aside nav button,[data-open-blueprint],[data-open-journey],[data-tab]'))setTimeout(schedule,0)},true);setTimeout(apply,150);setTimeout(apply,700);setTimeout(apply,1600)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
const api={version:VERSION,refresh:apply,context:()=>currentContext(),serviceName};window.BlueOceanShellConsistency=api;(window.BlueOceanRuntime||window.RealTalentRuntime)?.register?.('shellConsistency',api,VERSION);
})();

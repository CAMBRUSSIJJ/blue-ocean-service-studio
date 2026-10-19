(()=>{'use strict';
const VERSION='__APP_VERSION__';
const STORAGE_KEY='blue-ocean:precision-studio:sidebar-collapsed';
const actions=new Map();
let queued=false;
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
const safeText=(v,fallback='')=>v==null?fallback:String(v);

function readCollapsed(){try{return localStorage.getItem(STORAGE_KEY)==='1'}catch{return false}}
function writeCollapsed(value){try{localStorage.setItem(STORAGE_KEY,value?'1':'0')}catch{}}
function updateMetrics(collapsed){
  const mobile=matchMedia('(max-width:720px)').matches;
  const medium=matchMedia('(max-width:1120px)').matches;
  const width=mobile?0:(medium||collapsed?60:216);
  const header=mobile?46:48;
  document.documentElement.style.setProperty('--bo-sidebar-w',`${width}px`);
  document.documentElement.style.setProperty('--rt-sidebar',`${width}px`);
  document.documentElement.style.setProperty('--bo-header-h',`${header}px`);
  document.documentElement.style.setProperty('--rt-header',`${header}px`);
}
function setCollapsed(value){
  const collapsed=Boolean(value);
  writeCollapsed(collapsed);
  document.body.classList.toggle('bo1152-sidebar-collapsed',collapsed);
  updateMetrics(collapsed);
  const button=q('.bo1152-sidebar-toggle');
  if(button){button.textContent=collapsed?'›':'‹';button.setAttribute('aria-label',collapsed?'Expandir navegação':'Recolher navegação');button.title=collapsed?'Expandir navegação (Ctrl+\\)':'Recolher navegação (Ctrl+\\)'}
  window.dispatchEvent(new CustomEvent('bo:precision-sidebar',{detail:{collapsed}}));
}
function ensureToggle(aside){
  if(aside?.dataset?.boPrecisionSidebarNative==='1')return;
  const brand=q('.rt182-host-brand',aside);if(!brand||q('.bo1152-sidebar-toggle',brand))return;
  const button=document.createElement('button');button.type='button';button.className='bo1152-sidebar-toggle';button.addEventListener('click',()=>setCollapsed(!document.body.classList.contains('bo1152-sidebar-collapsed')));
  brand.appendChild(button);
}
function ensureInspector(){
  let root=q('.bo1152-inspector');if(root)return root;
  root=document.createElement('aside');root.className='bo1152-inspector';root.hidden=true;root.setAttribute('aria-label','Inspector contextual');root.innerHTML='<header class="bo1152-inspector__head"><div class="bo1152-inspector__head-copy"><span class="bo1152-inspector__eyebrow">Inspector</span><h3 class="bo1152-inspector__title">Seleção</h3></div><button type="button" class="bo1152-inspector__close" aria-label="Fechar Inspector">×</button></header><div class="bo1152-inspector__body"><div class="bo1152-inspector__empty">Selecione um objeto para ver propriedades, relações, evidências e métricas.</div></div><footer class="bo1152-inspector__actions" hidden></footer>';
  q('.bo1152-inspector__close',root)?.addEventListener('click',closeInspector);
  document.body.appendChild(root);return root;
}
function renderFields(sectionEl,fields){
  const dl=document.createElement('dl');
  for(const field of fields||[]){const row=document.createElement('div');row.className='bo1152-inspector__field';const dt=document.createElement('dt');dt.textContent=safeText(field.label,'Campo');const dd=document.createElement('dd');dd.textContent=safeText(field.value,'—');row.append(dt,dd);dl.appendChild(row)}
  sectionEl.appendChild(dl);
}
function openInspector(config={}){
  const root=ensureInspector();
  q('.bo1152-inspector__eyebrow',root).textContent=safeText(config.type,'Inspector');
  q('.bo1152-inspector__title',root).textContent=safeText(config.title,'Seleção');
  const body=q('.bo1152-inspector__body',root);body.innerHTML='';
  const sections=Array.isArray(config.sections)?config.sections:[];
  if(!sections.length){const empty=document.createElement('div');empty.className='bo1152-inspector__empty';empty.textContent=safeText(config.empty,'Nenhuma propriedade disponível para esta seleção.');body.appendChild(empty)}
  for(const section of sections){const el=document.createElement('section');el.className='bo1152-inspector__section';const h=document.createElement('h4');h.textContent=safeText(section.title,'Detalhes');el.appendChild(h);renderFields(el,section.fields);body.appendChild(el)}
  const footer=q('.bo1152-inspector__actions',root);footer.innerHTML='';
  const configActions=Array.isArray(config.actions)?config.actions:[];footer.hidden=!configActions.length;
  configActions.forEach((action,index)=>{const id=`inspector:${Date.now()}:${index}`;if(typeof action.onClick==='function')actions.set(id,action.onClick);const b=document.createElement('button');b.type='button';b.textContent=safeText(action.label,'Ação');if(action.primary)b.classList.add('primary');b.addEventListener('click',()=>actions.get(id)?.());footer.appendChild(b)});
  root.hidden=false;document.body.classList.add('bo1152-inspector-open');
  window.dispatchEvent(new CustomEvent('bo:inspector-open',{detail:{title:config.title,type:config.type}}));
}
function closeInspector(){const root=q('.bo1152-inspector');if(root)root.hidden=true;document.body.classList.remove('bo1152-inspector-open');window.dispatchEvent(new CustomEvent('bo:inspector-close'))}
function ensureToolbar(){let root=q('.bo1152-floating-toolbar');if(root)return root;root=document.createElement('div');root.className='bo1152-floating-toolbar';root.hidden=true;root.setAttribute('role','toolbar');root.setAttribute('aria-label','Ferramentas contextuais');document.body.appendChild(root);return root}
function showToolbar(items=[]){const root=ensureToolbar();root.innerHTML='';items.forEach((item,index)=>{if(item==='separator'||item?.separator){const sep=document.createElement('span');sep.className='sep';root.appendChild(sep);return}const id=`toolbar:${Date.now()}:${index}`;if(typeof item.onClick==='function')actions.set(id,item.onClick);const b=document.createElement('button');b.type='button';b.textContent=safeText(item.label||item.icon,'Ação');b.title=safeText(item.title||item.label,'Ação');if(item.active)b.classList.add('active');b.addEventListener('click',()=>actions.get(id)?.());root.appendChild(b)});root.hidden=!items.length}
function hideToolbar(){const root=q('.bo1152-floating-toolbar');if(root)root.hidden=true}
function annotateShell(){
  const aside=q('aside.rt182-host-sidebar, #root aside');const header=q('header.rt182-host-header');const main=q('#root main');
  if(aside){aside.dataset.boPrecisionSidebar='1';ensureToggle(aside)}
  if(header)header.dataset.boPrecisionHeader='1';if(main)main.dataset.boPrecisionWorkspace='1';
}
function apply(){
  document.body.classList.add('bo-v1120','bo-v1130','bo-v1140','bo-v1150','bo-v1153','bo-v1152');
  annotateShell();ensureInspector();ensureToolbar();setCollapsed(readCollapsed());
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
function boot(){
  apply();
  ['rt-app-ready','rt-runtime-registered','rt-navigation','rt-graph-changed'].forEach(name=>window.addEventListener(name,schedule));
  window.addEventListener('resize',()=>updateMetrics(document.body.classList.contains('bo1152-sidebar-collapsed')),{passive:true});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='\\'){event.preventDefault();setCollapsed(!document.body.classList.contains('bo1152-sidebar-collapsed'))}},true);
  setTimeout(apply,100);setTimeout(apply,500);setTimeout(apply,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
const api={version:VERSION,refresh:apply,setSidebarCollapsed:setCollapsed,toggleSidebar:()=>setCollapsed(!document.body.classList.contains('bo1152-sidebar-collapsed')),openInspector,closeInspector,showToolbar,hideToolbar};
window.BlueOceanPrecisionStudio=api;
(window.BlueOceanRuntime||window.RealTalentRuntime)?.register?.('precisionStudio',api,VERSION);
})();

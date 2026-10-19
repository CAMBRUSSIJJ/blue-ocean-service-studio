(()=>{'use strict';
const VERSION='__APP_VERSION__';
const BRAND={name:'BLUE OCEAN',product:'SERVICE STUDIO',title:'Blue Ocean Service Studio'};
let queued=false;
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>[...r.querySelectorAll(s)];
function labelOf(b){return (b.getAttribute('title')||qa('span',b).map(s=>s.textContent||'').join(' ')||b.textContent||'').replace(/\s+/g,' ').trim()}
function buttonBy(re,aside){return qa('nav button',aside).find(b=>re.test(labelOf(b)))}
function headingBefore(button,key,text){
  if(!button?.parentElement)return;
  const stack=button.parentElement;
  let el=stack.querySelector(`.bo-nav-heading[data-bo-heading="${key}"]`);
  if(!el){el=document.createElement('div');el.className='bo-nav-heading';el.dataset.boHeading=key;el.textContent=text;stack.insertBefore(el,button)}
  else if(el.nextElementSibling!==button)stack.insertBefore(el,button);
}
function brand(aside){
  const box=q('.rt182-host-brand',aside);if(!box)return;
  const h=q('h1',box),p=q('p',box);if(h&&h.textContent!==BRAND.name)h.textContent=BRAND.name;if(p&&p.textContent!==BRAND.product)p.textContent=BRAND.product;
  const icon=box.firstElementChild;if(icon&&!icon.classList.contains('bo-brand-mark')){icon.classList.add('bo-brand-mark');icon.innerHTML='<img src="/blue-ocean-mark.svg" alt="" aria-hidden="true">'}
  box.setAttribute('aria-label',`${BRAND.name} ${BRAND.product}`);
}
function hideVersion(aside){qa('span',aside).forEach(s=>{if(/^V\d+(?:\.\d+){1,3}$/i.test((s.textContent||'').trim()))s.classList.add('bo-version-hidden')})}
function normalizeInjectedNav(aside){
  const collab=q('[data-rt-collab-nav], [data-rt-collab-nav="1"], [data-rt-collab-nav]',aside)||q('[data-rt-collab-nav]',aside);
  const local=qa('nav button small',aside);local.forEach(s=>{if(/^local$/i.test((s.textContent||'').trim()))s.textContent='Workspace'});
  const demo=q('[data-rt1102-demo-nav]',aside);if(demo)demo.title='Demonstração';
}
function removeLegacyHeadings(aside){
  qa('.rt182-nav-group-label,.rt192-understand-label',aside).forEach(el=>el.remove());
  const seen=new Set();
  qa('.bo-nav-heading',aside).forEach(el=>{const key=el.dataset.boHeading||el.textContent?.trim();if(seen.has(key))el.remove();else seen.add(key)});
}
function setSingleActive(aside,preferred){
  const buttons=qa('nav button',aside);
  let target=preferred||buttons.find(b=>b.getAttribute('aria-current')==='page')||null;
  if(!target){
    const visible=[
      ['[data-bo-workspace-home-nav]','#bo114-workspace-home'],
      ['[data-rt192-research-nav]','#rt192-research-home'],
      ['[data-rt182-blueprint-nav]','#rt182-blueprint-home'],
      ['[data-rt197-review-nav]','#rt197-review-home'],
      ['[data-rt196-benefits-nav]','#rt196-benefits-home'],
      ['[data-rt195-intelligence-nav]','#rt195-intelligence-home'],
    ];
    for(const [buttonSelector,rootSelector] of visible){const root=q(rootSelector);if(root&&!root.hidden){target=q(buttonSelector,aside);if(target)break}}
  }
  buttons.forEach(b=>{
    const active=b===target;
    b.classList.toggle('is-active',active);
    b.classList.toggle('active',active);
    b.classList.toggle('rt182-home-active',active);
    if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
}
function groups(aside){
  if(aside.dataset.boPrecisionSidebarNative==='1')return;
  const context=buttonBy(/^Contexto$/i,aside);
  const whiteboards=buttonBy(/^Whiteboards$/i,aside);
  const metrics=buttonBy(/^Métricas$/i,aside);
  const action=buttonBy(/^Plano de Ação$/i,aside);
  const review=buttonBy(/^(Revisão|Revisão Operacional)$/i,aside);
  headingBefore(context,'context','CONTEXTO');
  headingBefore(whiteboards,'design','DESENHO');
  headingBefore(metrics,'validation','VALIDAÇÃO');
  headingBefore(action,'improvement','MELHORIA');
  headingBefore(review,'workspace','WORKSPACE');
}
function apply(){
  const aside=q('aside.rt182-host-sidebar, #root aside');if(!aside)return;
  document.body.classList.remove('bo-v1112');document.body.classList.add('bo-v1120','bo-v1130','bo-v1140','bo-v1150');
  if(document.title!==BRAND.title)document.title=BRAND.title;
  const meta=q('meta[name="theme-color"]');if(meta&&meta.content!=='#0B1F3B')meta.content='#0B1F3B';
  brand(aside);hideVersion(aside);normalizeInjectedNav(aside);removeLegacyHeadings(aside);groups(aside);setSingleActive(aside);
}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;apply()})}
function boot(){
  apply();
  window.addEventListener('rt-app-ready',schedule);
  window.addEventListener('rt-runtime-registered',schedule);
  window.addEventListener('rt-navigation',schedule);
  window.addEventListener('rt-graph-changed',schedule);
  document.addEventListener('click',event=>{const navButton=event.target?.closest?.('aside nav button');if(navButton){queueMicrotask(()=>{apply();const aside=q('aside.rt182-host-sidebar, #root aside');if(aside)setSingleActive(aside,navButton)})}},true);
  setTimeout(apply,120);setTimeout(apply,600);setTimeout(apply,1400);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.BlueOceanShell={version:VERSION,refresh:apply};
})();

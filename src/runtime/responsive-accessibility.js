(()=>{'use strict';
const VERSION='__APP_VERSION__';
const qs=(s,r=document)=>r.querySelector(s),qsa=(s,r=document)=>[...r.querySelectorAll(s)];
let scheduled=false;
function viewport(){const w=window.innerWidth;return w<600?'mobile':w<768?'small-tablet':w<1024?'tablet':w<1280?'compact':'desktop'}
function annotate(){
  document.body.classList.add('bo-v1175');
  ['mobile','small-tablet','tablet','compact','desktop'].forEach(k=>document.body.classList.toggle('bo1175-'+k,viewport()===k));
  const main=qs('main[data-bo-precision-workspace-native="1"]');if(main){main.id ||= 'bo-main-content';main.setAttribute('tabindex','-1')}
  const sidebar=qs('aside.rt182-host-sidebar');if(sidebar){sidebar.classList.add('bo1175-sidebar');sidebar.setAttribute('aria-label','Navegação do workspace')}
  const header=qs('header.rt182-host-header');if(header)header.classList.add('bo1175-header');
  qsa('[role="dialog"]').forEach(dialog=>{if(!dialog.hasAttribute('aria-modal'))dialog.setAttribute('aria-modal','true')});
  qsa('button.rt144-x,button[data-close]').forEach(button=>{if(!button.getAttribute('aria-label'))button.setAttribute('aria-label','Fechar')});
  const board=qs('.bo1174-board');if(board){const mobile=window.matchMedia('(max-width:599px)').matches;board.classList.toggle('bo1175-mobile-read',mobile);board.setAttribute('aria-label',mobile?'Quadro em modo leitura. Use zoom, navegação, propriedades e comentários.':'Editor visual do serviço');
    qsa('[data-bo1175-mobile-disabled="1"]',board).forEach(el=>{el.disabled=false;el.removeAttribute('data-bo1175-mobile-disabled')});
    if(mobile){qsa('.rt144-inspector input,.rt144-inspector textarea,.rt144-inspector select,.rt144-inspector button:not(.rt144-x):not(.rt1810-inspector-tabs button)',board).forEach(el=>{el.disabled=true;el.setAttribute('data-bo1175-mobile-disabled','1')})}
  }
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;annotate()})}
function boot(){annotate();window.addEventListener('resize',schedule,{passive:true});['rt-app-ready','rt-runtime-registered','rt-navigation','rt-graph-changed'].forEach(n=>window.addEventListener(n,schedule));document.addEventListener('click',()=>setTimeout(schedule,0),true);setTimeout(annotate,250);setTimeout(annotate,900)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
const api={version:VERSION,refresh:annotate,viewport};window.BlueOceanAccessibility=api;(window.BlueOceanRuntime||window.RealTalentRuntime)?.register?.('responsiveAccessibility',api,VERSION);
})();

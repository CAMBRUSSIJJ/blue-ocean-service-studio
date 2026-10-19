const VERSION='__APP_VERSION__';
const q=(selector,root=document)=>root.querySelector(selector);
const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];

function stateMark(root){
  if(!root||q('.bo1176-state-mark',root))return;
  const mark=document.createElement('div');mark.className='bo1176-state-mark';mark.setAttribute('aria-hidden','true');root.prepend(mark);
}
function polishBoot(){
  const boot=q('#bo1120-boot > div');
  if(boot){stateMark(boot);boot.setAttribute('role','status');boot.setAttribute('aria-live','polite');const strong=q('strong',boot);const small=q('small',boot);if(strong&&strong.textContent!=='Preparando seu workspace')strong.textContent='Preparando seu workspace';if(small&&small.textContent!=='Validando dados locais, preferências e integridade antes de abrir.')small.textContent='Validando dados locais, preferências e integridade antes de abrir.';if(!q('.bo1176-boot-lines',boot)){const lines=document.createElement('div');lines.className='bo1176-boot-lines';lines.setAttribute('aria-hidden','true');lines.innerHTML='<i></i><i></i><i></i>';boot.appendChild(lines)}}
  const fatal=q('#bo1120-fatal > section');if(fatal)stateMark(fatal);
}
function polishEmptyStates(){
  qa('.bo117-empty,.rt182-empty,.rt182-empty-inline,.rt188-column-empty,.bo115-empty,.bo-empty-state,.rt194-empty').forEach(el=>el.setAttribute('data-bo1176-empty','1'));
}
function polishTitles(){
  document.title='BLUE OCEAN · Service Studio';
  let meta=q('meta[name="description"]');if(!meta){meta=document.createElement('meta');meta.setAttribute('name','description');document.head.appendChild(meta)}meta.setAttribute('content','BLUE OCEAN Service Studio — Service Design, jornadas, blueprints e melhoria contínua em um único Service Graph.');
}
function polishRuntimeState(){
  document.body.classList.toggle('bo1176-offline',!navigator.onLine);
  const banner=q('#bo1120-offline');if(banner){banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');banner.textContent!=='Você está offline. O trabalho local continua disponível; recursos externos podem ficar temporariamente indisponíveis.'&&(banner.textContent='Você está offline. O trabalho local continua disponível; recursos externos podem ficar temporariamente indisponíveis.')}
}
function run(){document.body.classList.add('bo-v1176');polishTitles();polishBoot();polishEmptyStates();polishRuntimeState()}
const refresh=()=>requestAnimationFrame(()=>{polishBoot();polishEmptyStates();polishRuntimeState()});
run();
['rt-navigation','rt-graph-changed','rt-runtime-registered','bo1173-workspace-open','bo:inspector-open','bo:inspector-close'].forEach(eventName=>window.addEventListener(eventName,refresh));
window.addEventListener('online',polishRuntimeState);window.addEventListener('offline',polishRuntimeState);
window.addEventListener('rt-app-ready',()=>{document.body.classList.add('bo1176-ready');refresh()});
window.BlueOceanPolish={version:VERSION,refresh:run};

import { runtime } from './runtime-registry.js';

const VERSION='1.17.9';
const state={phase:'entry',prepared:false,recovered:false,error:null};
let preparePromise=null;

function root(){return document.getElementById('root')}
function bootNode(){let el=document.getElementById('bo1120-boot');if(el)return el;el=document.createElement('div');el.id='bo1120-boot';el.className='bo1120-boot';el.innerHTML='<div><span>BLUE OCEAN</span><strong>Iniciando experiência…</strong><small>Preparando a entrada segura.</small></div>';document.body.appendChild(el);return el}
function removeBoot(){document.getElementById('bo1120-boot')?.remove()}
function fatal(message){state.phase='error';state.error=message;removeBoot();let el=document.getElementById('bo1120-fatal');if(!el){el=document.createElement('div');el.id='bo1120-fatal';el.className='bo1120-runtime-fatal';el.innerHTML='<section><span>BLUE OCEAN · MODO SEGURO</span><h1>Não foi possível iniciar a interface.</h1><p></p><button type="button">Recarregar interface</button></section>';document.body.appendChild(el);el.querySelector('button').onclick=()=>location.reload()}el.querySelector('p').textContent=String(message||'Erro inesperado durante a inicialização.')}
function offline(on){document.body.classList.toggle('bo1120-offline',on);let el=document.getElementById('bo1120-offline');if(on&&!el){el=document.createElement('div');el.id='bo1120-offline';el.className='bo1120-offline-banner';el.textContent='Sem conexão. O trabalho local continua disponível; sincronizações externas podem ficar indisponíveis.';document.body.appendChild(el)}else if(!on)el?.remove()}

bootNode();offline(!navigator.onLine);window.addEventListener('online',()=>offline(false));window.addEventListener('offline',()=>offline(true));
window.addEventListener('rt-entry-ready',()=>{state.phase='entry-ready';removeBoot()},{once:true});
window.addEventListener('rt-app-ready',()=>{state.phase='ready';removeBoot()});
window.addEventListener('rt-ui-fatal-error',event=>fatal(event.detail?.message||'Falha de interface'));
window.addEventListener('error',event=>{state.error=event.error?.message||event.message||'Erro de runtime';if(!root()?.firstElementChild)setTimeout(()=>{if(!root()?.firstElementChild)fatal(state.error)},0)});
window.addEventListener('unhandledrejection',event=>{state.error=event.reason?.message||String(event.reason||'Promise rejeitada');if(!root()?.firstElementChild)setTimeout(()=>{if(!root()?.firstElementChild)fatal(state.error)},0)});

async function prepare(){
  if(preparePromise)return preparePromise;
  preparePromise=(async()=>{
    state.phase='preparing';
    const bridge=runtime.api('dataBridge');
    if(!bridge?.prepare){state.prepared=false;state.phase='degraded';return state}
    try{
      const result=await bridge.prepare();
      state.prepared=true;state.recovered=!!result?.recovered;state.phase='prepared';state.error=null;
      if(result?.recovered)window.dispatchEvent(new CustomEvent('rt-data-notice',{detail:result.reason||'Uma cópia íntegra do projeto foi recuperada antes de abrir a interface.'}));
    }catch(error){
      state.prepared=false;state.phase='degraded';state.error=error?.message||String(error);
      window.dispatchEvent(new CustomEvent('rt-data-error',{detail:'A recuperação inicial encontrou um problema. O workspace continuará usando o cache local disponível.'}));
    }
    return state;
  })().finally(()=>{preparePromise=null});
  return preparePromise;
}

// V1.17.9: never block the login route with a top-level await.
window.BlueOceanRuntimeReady=Promise.resolve(state);
window.BlueOceanStability={version:VERSION,state,prepare};

// Watchdog: once React has painted anything, the legacy boot layer must never cover it indefinitely.
setTimeout(()=>{if(root()?.firstElementChild)removeBoot()},1800);

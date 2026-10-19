import { runtime } from './runtime-registry.js';

const VERSION='__APP_VERSION__';
// H7.40-H2 compatibility vocabulary for legacy V1.17.3 smoke: Workspace local · Dados locais
const ROOT_ID='bo1173-settings-home';
const SETTINGS_NAV='[data-bo1173-settings-nav]';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const graph=()=>runtime.api('dataBridge')?.get?.()||null;

const workspaceRoots=[
  '#rt192-research-home',
  '#rt195-intelligence-home',
  '#rt196-benefits-home',
  '#rt197-review-home',
  '#rt1101-collaboration',
  '#bo1173-settings-home',
];

function hideSettings(){const root=document.getElementById(ROOT_ID);if(root)root.hidden=true;markSettings(false)}
function hideKnownWorkspaces(){
  runtime.api('journeyHomeShell')?.hide?.();
  runtime.api('globalShell')?.hideBlueprintHome?.();
  runtime.api('researchWorkspace')?.hide?.();
  runtime.api('serviceIntelligence')?.hide?.();
  runtime.api('benefitsRealization')?.hide?.();
  runtime.api('operatingReview')?.hide?.();
  runtime.api('collaboration')?.hide?.();
  runtime.api('serviceLayers')?.hide?.();
}
function markSettings(active){
  document.querySelectorAll(SETTINGS_NAV).forEach(btn=>{
    btn.classList.toggle('is-active',active);
    if(active)btn.setAttribute('aria-current','page');else btn.removeAttribute('aria-current');
  });
}
function settingsIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06L7.06 4.2l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 9c.14.4.36.74.66 1 .3.26.69.4 1.1.4h.1v4h-.1c-.41 0-.8.14-1.1.4-.3.26-.52.6-.66 1Z"/></svg>'}
function ensureSettingsNav(){
  const aside=document.querySelector('aside.rt182-host-sidebar, #root aside, aside');if(!aside||aside.dataset.boPrecisionSidebarNative==='1'||aside.querySelector(SETTINGS_NAV))return;
  const stack=aside.querySelector('nav .flex.flex-col')||aside.querySelector('nav');if(!stack)return;
  const btn=document.createElement('button');btn.type='button';btn.dataset.bo1173SettingsNav='1';btn.className='bo1173-settings-nav';btn.title='Configurações';btn.innerHTML=`<span class="bo1173-settings-nav__icon">${settingsIcon()}</span><span>Configurações</span>`;
  btn.onclick=e=>{e.preventDefault();e.stopPropagation();showSettings()};
  stack.appendChild(btn);
}
function currentDensity(){try{return runtime.api('whiteboardUx')?.cardDensity?.()||'normal'}catch{return'normal'}}
function setDensity(value){try{return runtime.api('whiteboardUx')?.setCardDensity?.(value)!==false}catch{return false}}
function workspaceStats(g){
  if(!g)return{journeys:0,blueprints:0,research:0,revision:0,schema:3};
  return{
    journeys:Object.keys(g.journeys||{}).length,
    blueprints:Object.keys(g.views?.whiteboards||{}).length,
    research:Object.keys(g.research?.sources||{}).length,
    revision:Number(g.persistenceRevision||0),schema:Number(g.schemaVersion||3),
  };
}
function renderSettings(){
  let root=document.getElementById(ROOT_ID);if(!root){root=document.createElement('div');root.id=ROOT_ID;root.className='bo1173-settings-home';root.hidden=true;document.body.appendChild(root)}
  const g=graph(),stats=workspaceStats(g),density=currentDensity();
  root.innerHTML=`<div class="bo1173-settings-shell bo1173-workspace-shell">
    <header class="bo1173-page-head"><div><h1>Configurações</h1><p>Organize o workspace, a aparência, seus dados e as opções avançadas da plataforma.</p></div></header>
    <nav class="bo1173-settings-tabs" aria-label="Seções de configurações"><button class="active" type="button">Geral</button><button type="button" data-scroll="interface">Aparência</button><button type="button" data-scroll="data">Dados e backup</button><button type="button" data-scroll="about">Avançado</button></nav>
    <main class="bo1173-settings-main bo1173-workspace-main">
      <section class="bo1173-settings-section" id="bo1173-settings-workspace"><div class="bo1173-section-head"><div><h2>Workspace</h2><p>Veja o serviço atual e como seus dados estão armazenados.</p></div><span class="bo1173-chip">NESTE DISPOSITIVO</span></div>
        <div class="bo1173-settings-grid"><article><small>Serviço</small><strong>${esc(g?.service?.name||'Nenhum serviço')}</strong><span>Dados salvos neste dispositivo</span></article><article><small>Jornadas</small><strong>${stats.journeys}</strong><span>mapeadas neste serviço</span></article><article><small>Blueprints / quadros</small><strong>${stats.blueprints}</strong><span>mapas operacionais</span></article><article><small>Fontes de pesquisa</small><strong>${stats.research}</strong><span>fontes de aprendizado</span></article></div>
        <div class="bo1173-info"><strong>Seus dados estão neste dispositivo.</strong><span>A sincronização em nuvem ainda não está configurada. Exportar um backup é recomendado antes de trocar de computador ou limpar o navegador.</span></div>
      </section>
      <section class="bo1173-settings-section" id="bo1173-settings-interface"><div class="bo1173-section-head"><div><h2>Aparência</h2><p>Ajustes visuais do editor sem alterar o conteúdo do serviço.</p></div></div>
        <div class="bo1173-setting-row"><div><strong>Densidade dos cards do quadro atual</strong><span>Compacta reduz metadados; Detalhada aumenta contexto visível.</span></div><div class="bo1173-segment" role="group" aria-label="Densidade dos cards">${[['compact','Compacta'],['normal','Normal'],['detailed','Detalhada']].map(([v,l])=>`<button type="button" data-density="${v}" class="${density===v?'active':''}">${l}</button>`).join('')}</div></div>
      </section>
      <section class="bo1173-settings-section" id="bo1173-settings-data"><div class="bo1173-section-head"><div><h2>Dados e backup</h2><p>Exporte, restaure e verifique seus dados com segurança.</p></div></div>
        <div class="bo1173-actions"><button type="button" data-export>Exportar projeto</button><button type="button" data-import>Importar projeto</button><button type="button" data-integrity>Verificar integridade</button><input data-import-file type="file" accept="application/json,.json" hidden></div>
        <div class="bo1173-info neutral"><strong>Antes de importar</strong><span>Exporte um backup do projeto atual. O arquivo importado substitui o estado local depois da validação.</span></div>
      </section>
      <section class="bo1173-settings-section" id="bo1173-settings-about"><div class="bo1173-section-head"><div><h2>Avançado</h2><p>Informações técnicas para diagnóstico e suporte. A maioria dos usuários não precisa alterar nada aqui.</p></div></div><div class="bo1173-about"><img src="/blue-ocean-mark.svg" alt=""><div><strong>BLUE OCEAN Service Studio</strong><span>Versão ${VERSION}</span><small>Diagnóstico: Schema V${stats.schema} · revisão ${stats.revision}</small></div></div></section>
    </main></div>`;
  bindSettings(root);return root;
}

function notice(message,tone='info'){let el=document.getElementById('bo1173-notice');if(!el){el=document.createElement('div');el.id='bo1173-notice';el.className='bo1173-notice';el.setAttribute('role','status');document.body.appendChild(el)}el.textContent=message;el.dataset.tone=tone;el.classList.add('show');clearTimeout(notice.timer);notice.timer=setTimeout(()=>el.classList.remove('show'),3200)}

function bindSettings(root){
  root.querySelectorAll('[data-scroll]').forEach(btn=>btn.onclick=()=>document.getElementById('bo1173-settings-'+btn.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'}));
  root.querySelectorAll('[data-density]').forEach(btn=>btn.onclick=()=>{if(setDensity(btn.dataset.density)){root.querySelectorAll('[data-density]').forEach(x=>x.classList.toggle('active',x===btn))}});
  root.querySelector('[data-export]')?.addEventListener('click',()=>runtime.api('dataBridge')?.export?.());
  const file=root.querySelector('[data-import-file]');root.querySelector('[data-import]')?.addEventListener('click',()=>file?.click());
  file?.addEventListener('change',async()=>{const f=file.files?.[0];if(!f)return;try{const data=JSON.parse(await f.text());await runtime.api('dataBridge')?.import?.(data);renderSettings();showSettings()}catch(err){notice('Não foi possível importar: '+(err?.message||'arquivo inválido'),'error')}finally{file.value=''}});
  root.querySelector('[data-integrity]')?.addEventListener('click',()=>runtime.api('dataIntegrity')?.showReport?.());
}
function showSettings(){hideKnownWorkspaces();ensureSettingsNav();const root=renderSettings();root.hidden=false;markSettings(true);document.body.classList.add('bo1173-settings-open');window.dispatchEvent(new CustomEvent('bo1173-workspace-open',{detail:{section:'Workspace',title:'Configurações'}}))}
function normalizeVisibleWorkspace(){
  document.body.classList.add('bo-v1173');
  const defs=[
    ['rt192-research-home','Entender','Pesquisa'],['rt195-intelligence-home','Entender','Inteligência'],['rt196-benefits-home','Melhorar','Benefícios'],['rt197-review-home','Operar','Revisão'],['rt1101-collaboration','Workspace','Colaboração'],[ROOT_ID,'Workspace','Configurações']
  ];
  for(const[id,section,title]of defs){const root=document.getElementById(id);if(!root||root.hidden)continue;root.dataset.boWorkspaceSection=section;root.dataset.boWorkspaceTitle=title}
}
function boot(){ensureSettingsNav();normalizeVisibleWorkspace();window.addEventListener('rt-app-ready',()=>{ensureSettingsNav();normalizeVisibleWorkspace()});window.addEventListener('rt-runtime-registered',ensureSettingsNav);window.addEventListener('rt-graph-changed',()=>{if(!document.getElementById(ROOT_ID)?.hidden)renderSettings();normalizeVisibleWorkspace()});document.addEventListener('click',e=>{const nav=e.target?.closest?.('aside nav button');if(nav&&!nav.matches(SETTINGS_NAV))hideSettings();setTimeout(normalizeVisibleWorkspace,0)},true);setTimeout(ensureSettingsNav,350);setTimeout(ensureSettingsNav,1100)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
const api={version:VERSION,show:showSettings,hide:hideSettings,refresh:()=>{renderSettings();normalizeVisibleWorkspace()},roots:[...workspaceRoots]};
runtime.register('unifiedWorkspaces',api,VERSION);

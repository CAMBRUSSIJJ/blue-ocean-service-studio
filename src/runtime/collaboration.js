import { runtime } from './runtime-registry.js';

const VERSION='__APP_VERSION__';
const PRESENCE_TTL=30000;
const HEARTBEAT_MS=8000;
const JOURNAL_KEY='realtalent.collaboration.sync-journal.v1101';
const SESSION_KEY='realtalent.collaboration.session.v1101';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const uid=p=>`${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const now=()=>new Date().toISOString();
const clone=v=>JSON.parse(JSON.stringify(v));
const roleLabel={owner:'Owner',editor:'Editor',commenter:'Comentador',viewer:'Visualizador'};
const roleOrder={viewer:0,commenter:1,editor:2,owner:3};
const adapters=new Map();
const presence=new Map();
let channel=null,heartbeatTimer=null,pruneTimer=null,internalMutation=false,activeTab='workspace';

function bridge(){return runtime.api('dataBridge')}
function graph(){return bridge()?.get?.()||null}
function defaultState(g){
  const created=now(),ownerId='member-local-owner';
  return {version:1,workspaceId:`workspace-${g?.service?.id||'local'}`,workspaceName:`${g?.service?.name||'BLUE OCEAN'} Workspace`,currentUserId:ownerId,members:{[ownerId]:{id:ownerId,name:'Usuário local',role:'owner',status:'active',createdAt:created,updatedAt:created}},comments:[],activity:[{id:uid('activity'),actorId:ownerId,action:'workspace.created',targetType:'workspace',targetId:`workspace-${g?.service?.id||'local'}`,summary:'Workspace local preparado para colaboração.',createdAt:created}],sync:{mode:'local-only',adapterId:null,remoteWorkspaceId:null,lastSyncedAt:null,baseRevision:Number(g?.persistenceRevision||0),conflicts:[]}};
}
function state(g=graph()){return g?.service?.collaboration||null}
function ensureState(){
  const g=graph(); if(!g)return null;
  if(g.service?.collaboration)return g.service.collaboration;
  internalMutation=true;
  try{bridge().transact(next=>{next.service.collaboration=defaultState(next);return next},'Preparar colaboração')}finally{internalMutation=false}
  return state();
}
function currentMember(s=ensureState()){return s?.members?.[s.currentUserId]||Object.values(s?.members||{})[0]||null}
function currentRole(){return currentMember()?.role||'viewer'}
function can(action){
  const r=currentRole(),level=roleOrder[r]??0;
  if(action==='view')return true;
  if(action==='comment')return level>=roleOrder.commenter;
  if(action==='edit')return level>=roleOrder.editor;
  if(action==='manageMembers'||action==='manageSync')return r==='owner';
  return false;
}
function mutate(updater,label='Atualizar colaboração'){
  internalMutation=true;
  try{return bridge().transact(g=>{g.service.collaboration ||= defaultState(g);updater(g.service.collaboration,g);return g},label)}finally{internalMutation=false}
}
function activity(s,action,summary,targetType='',targetId=''){
  s.activity ||= [];
  s.activity.unshift({id:uid('activity'),actorId:s.currentUserId,action,targetType,targetId,summary,createdAt:now()});
  s.activity=s.activity.slice(0,300);
}
function addMember({name,email='',role='viewer'}){
  if(!can('manageMembers'))throw Error('Somente o Owner pode gerenciar membros.');
  name=String(name||'').trim();if(!name)throw Error('Informe o nome.');
  role=['owner','editor','commenter','viewer'].includes(role)?role:'viewer';
  const id=uid('member');
  mutate(s=>{s.members[id]={id,name,email:String(email||'').trim(),role,status:'invited',createdAt:now(),updatedAt:now()};activity(s,'member.invited',`${name} foi adicionado como ${roleLabel[role]}.`,'member',id)},'Adicionar membro');
  broadcast('members-changed'); return id;
}
function updateMember(id,patch={}){
  if(!can('manageMembers'))throw Error('Somente o Owner pode gerenciar membros.');
  mutate(s=>{const m=s.members[id];if(!m)throw Error('Membro não encontrado.');const nextRole=patch.role&&roleLabel[patch.role]?patch.role:m.role;if(m.role==='owner'&&nextRole!=='owner'){const owners=Object.values(s.members).filter(x=>x.status!=='disabled'&&x.role==='owner');if(owners.length<=1)throw Error('Mantenha pelo menos um Owner.')}Object.assign(m,patch,{role:nextRole,updatedAt:now()});activity(s,'member.updated',`${m.name} atualizado para ${roleLabel[m.role]}.`,'member',id)},'Atualizar membro');
  applyPermissionMode();broadcast('members-changed');
}
function setCurrentUser(id){
  const s=ensureState();if(!s?.members?.[id])throw Error('Membro não encontrado.');
  mutate(x=>{x.currentUserId=id;activity(x,'session.switched',`Sessão local alterada para ${x.members[id].name}.`,'member',id)},'Alterar usuário local');
  applyPermissionMode();startPresence();broadcast('current-user-changed');
}
function commentTarget(){
  const sel=runtime.api('presentationBridge')?.selection?.();
  if(sel)return{targetType:'item',targetId:sel.id,label:sel.label||'Objeto selecionado'};
  const ctx=runtime.api('presentationBridge')?.context?.();
  if(ctx?.boardId)return{targetType:'board',targetId:ctx.boardId,label:ctx.boardName||'Quadro atual'};
  const g=graph();return{targetType:'service',targetId:g?.service?.id||'service',label:g?.service?.name||'Serviço'};
}
function addComment(body,target=commentTarget()){
  if(!can('comment'))throw Error('Seu papel não permite comentar.');
  body=String(body||'').trim();if(!body)throw Error('Escreva um comentário.');
  const id=uid('comment');
  mutate(s=>{s.comments ||= [];s.comments.unshift({id,targetType:target.targetType,targetId:target.targetId,targetLabel:target.label||'',authorId:s.currentUserId,body,status:'open',createdAt:now(),updatedAt:now(),resolvedAt:null});activity(s,'comment.created',`Comentário em ${target.label||target.targetType}.`,target.targetType,target.targetId)},'Adicionar comentário');
  broadcast('comments-changed');return id;
}
function resolveComment(id,resolved=true){
  if(!can('comment'))throw Error('Seu papel não permite alterar comentários.');
  mutate(s=>{const c=(s.comments||[]).find(x=>x.id===id);if(!c)return;c.status=resolved?'resolved':'open';c.updatedAt=now();c.resolvedAt=resolved?now():null;activity(s,resolved?'comment.resolved':'comment.reopened',`${resolved?'Resolvido':'Reaberto'}: ${c.body.slice(0,70)}`,c.targetType,c.targetId)},resolved?'Resolver comentário':'Reabrir comentário');
  broadcast('comments-changed');
}
function readJournal(){try{return JSON.parse(localStorage.getItem(JOURNAL_KEY)||'[]')||[]}catch{return[]}}
function writeJournal(arr){localStorage.setItem(JOURNAL_KEY,JSON.stringify(arr.slice(-200)))}
function queueChange(detail={}){
  if(internalMutation)return;
  const g=graph();if(!g)return;
  const arr=readJournal();arr.push({id:uid('op'),revision:Number(g.persistenceRevision||0),at:now(),type:detail?.type||'graph.changed'});writeJournal(arr);
  broadcast('sync-journal');
}
function clearJournal(){writeJournal([])}
function syncStatus(){const s=ensureState();return{mode:s?.sync?.mode||'local-only',adapterId:s?.sync?.adapterId||null,remoteWorkspaceId:s?.sync?.remoteWorkspaceId||null,lastSyncedAt:s?.sync?.lastSyncedAt||null,pending:readJournal().length,conflicts:(s?.sync?.conflicts||[]).filter(x=>x.status!=='resolved').length,online:navigator.onLine}}
function registerAdapter(id,adapter){if(!id||!adapter||typeof adapter.push!=='function'||typeof adapter.pull!=='function')throw Error('Adapter inválido: implemente push() e pull().');adapters.set(id,adapter);broadcast('adapter-registered');return true}
function configureSync(adapterId,remoteWorkspaceId=''){
  if(!can('manageSync'))throw Error('Somente o Owner pode configurar sincronização.');
  if(adapterId&& !adapters.has(adapterId))throw Error('Adapter ainda não está registrado neste runtime.');
  mutate(s=>{s.sync.adapterId=adapterId||null;s.sync.remoteWorkspaceId=String(remoteWorkspaceId||'').trim()||null;s.sync.mode=adapterId?'adapter-ready':'local-only';activity(s,'sync.configured',adapterId?`Adapter ${adapterId} preparado.`:'Sincronização remota desativada.','workspace',s.workspaceId)},'Configurar sync');
}
async function syncNow(){
  if(!can('manageSync'))throw Error('Somente o Owner pode sincronizar.');
  const s=ensureState(),adapter=adapters.get(s.sync.adapterId);if(!adapter)throw Error('Nenhum adapter remoto conectado.');
  const g=graph(),journal=readJournal(),baseRevision=Number(s.sync.baseRevision||0);
  const remote=await adapter.pull({workspaceId:s.sync.remoteWorkspaceId||s.workspaceId,baseRevision});
  if(remote?.graph&&Number(remote.revision||0)>Number(g.persistenceRevision||0)&&journal.length){
    mutate(x=>{x.sync.conflicts ||= [];x.sync.conflicts.push({id:uid('conflict'),entityType:'graph',entityId:g.service.id,detectedAt:now(),status:'open',localRevision:Number(g.persistenceRevision||0),remoteRevision:Number(remote.revision||0)});activity(x,'sync.conflict','Conflito detectado entre alterações locais e versão remota.','workspace',x.workspaceId)},'Registrar conflito');
    throw Error('Conflito detectado. Revise o Centro de Sync antes de continuar.');
  }
  if(remote?.graph&&Number(remote.revision||0)>Number(g.persistenceRevision||0))await bridge().import({graph:remote.graph,meta:remote.meta||{}});
  const latest=graph();await adapter.push({workspaceId:s.sync.remoteWorkspaceId||s.workspaceId,graph:latest,revision:Number(latest.persistenceRevision||0),operations:journal});
  clearJournal();mutate(x=>{x.sync.mode='connected';x.sync.lastSyncedAt=now();x.sync.baseRevision=Number(graph()?.persistenceRevision||0);activity(x,'sync.completed','Sincronização remota concluída.','workspace',x.workspaceId)},'Concluir sync');
  return syncStatus();
}
function exportEnvelope(){
  const g=graph(),s=ensureState(),payload={format:'realtalent-sync-envelope',version:1,workspaceId:s.workspaceId,remoteWorkspaceId:s.sync.remoteWorkspaceId||null,revision:Number(g?.persistenceRevision||0),exportedAt:now(),operations:readJournal(),graph:g};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=`blue-ocean-sync-${s.workspaceId}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1200);
}
function resolveConflict(id){if(!can('manageSync'))throw Error('Somente o Owner pode resolver conflitos.');mutate(s=>{const c=(s.sync.conflicts||[]).find(x=>x.id===id);if(c){c.status='resolved';c.resolvedAt=now();activity(s,'sync.conflict.resolved','Conflito marcado como resolvido.','workspace',s.workspaceId)}},'Resolver conflito')}

function sessionId(){let id=sessionStorage.getItem(SESSION_KEY);if(!id){id=uid('session');sessionStorage.setItem(SESSION_KEY,id)}return id}
function presencePayload(){const s=ensureState(),m=currentMember(s),ctx=runtime.api('presentationBridge')?.context?.()||{};return{type:'presence',sessionId:sessionId(),workspaceId:s.workspaceId,userId:m?.id||'',name:m?.name||'Usuário',role:m?.role||'viewer',boardId:ctx.boardId||null,boardName:ctx.boardName||null,at:Date.now()}}
function broadcast(type,payload={}){try{channel?.postMessage({type,...payload,workspaceId:ensureState()?.workspaceId,from:sessionId(),at:Date.now()})}catch{}}
function startPresence(){
  stopPresence(false);const s=ensureState();if(!s)return;
  if('BroadcastChannel'in window){channel=new BroadcastChannel(`realtalent-collab-${s.workspaceId}`);channel.onmessage=e=>{const msg=e.data||{};if(msg.type==='presence'&&msg.sessionId!==sessionId()){presence.set(msg.sessionId,msg);renderIfOpen()}else if(msg.type==='leave'){presence.delete(msg.sessionId);renderIfOpen()}else if(msg.from!==sessionId())renderIfOpen()}}
  const beat=()=>{const p=presencePayload();presence.set(p.sessionId,p);try{channel?.postMessage(p)}catch{};renderPresenceBadge()};beat();heartbeatTimer=setInterval(beat,HEARTBEAT_MS);pruneTimer=setInterval(()=>{const cutoff=Date.now()-PRESENCE_TTL;for(const [id,p]of presence)if(p.at<cutoff)presence.delete(id);renderPresenceBadge();renderIfOpen()},9000)
}
function stopPresence(send=true){if(send)broadcast('leave',{sessionId:sessionId()});clearInterval(heartbeatTimer);clearInterval(pruneTimer);heartbeatTimer=pruneTimer=null;channel?.close?.();channel=null}
function onlinePresence(){const cutoff=Date.now()-PRESENCE_TTL;return[...presence.values()].filter(p=>p.at>=cutoff)}
function renderPresenceBadge(){let el=document.getElementById('rt1101-presence');if(!el){el=document.createElement('button');el.id='rt1101-presence';el.className='rt1101-presence';el.title='Colaboração e presença';el.onclick=()=>show('workspace');document.body.appendChild(el)}const all=onlinePresence(),others=Math.max(0,all.length-1);el.innerHTML=`<span class="rt1101-presence-dot"></span><b>${all.length}</b><em>${others?`${others} outro${others>1?'s':''}`:'local'}</em>`}
function injectNavigation(){
  const aside=document.querySelector('aside.rt182-host-sidebar, aside');if(aside?.dataset?.boPrecisionSidebarNative==='1')return;
  const stack=document.querySelector('aside nav .flex.flex-col')||document.querySelector('aside nav');if(!stack||stack.querySelector('[data-rt-collab-nav]'))return;
  const b=document.createElement('button');b.type='button';b.dataset.rtCollabNav='1';b.className='rt1101-nav-button';b.title='Colaboração';b.innerHTML='<span class="rt1101-nav-icon">◉</span><span>Colaboração</span><small>local</small>';b.onclick=e=>{e.preventDefault();e.stopPropagation();show('workspace')};stack.appendChild(b)
}
function applyPermissionMode(){const role=currentRole();document.body.dataset.rtCollaborationRole=role;document.body.classList.toggle('rt1101-readonly',!can('edit'));document.body.classList.toggle('rt1101-comment-only',role==='commenter');renderPresenceBadge()}
function denyMutation(event){
  if(can('edit'))return;
  if(event.type==='keydown'){
    const k=event.key.toLowerCase(),blocked=['delete','backspace'].includes(k)||(event.ctrlKey||event.metaKey)&&['x','v','d','z','y'].includes(k);
    if(blocked){event.preventDefault();event.stopImmediatePropagation();notice('Modo somente leitura: este papel não pode editar o canvas.')}return;
  }
  const t=event.target?.closest?.('.rt144-tools button,.rt144-library button,.rt144-selectionbar button,.rt144-context button,.rt144-inspector input,.rt144-inspector textarea,.rt144-inspector select,.rt144-inspector button');if(!t)return;
  const label=(t.getAttribute('aria-label')||t.title||t.textContent||'').trim();if(/Selecionar|Buscar|Camadas|Propriedades|Explorar relações|Comentários/i.test(label))return;
  event.preventDefault();event.stopImmediatePropagation();notice('Modo somente leitura: altere o papel para Editor/Owner para modificar o serviço.')
}
let noticeTimer=null;function notice(msg){let n=document.getElementById('rt1101-notice');if(!n){n=document.createElement('div');n.id='rt1101-notice';n.className='rt1101-notice';document.body.appendChild(n)}n.textContent=msg;n.classList.add('show');clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.classList.remove('show'),2600)}

function show(tab='workspace'){activeTab=tab;ensureState();let root=document.getElementById('rt1101-collaboration');if(!root){root=document.createElement('div');root.id='rt1101-collaboration';root.className='rt1101-collaboration';document.body.appendChild(root)}root.hidden=false;renderWorkspace(root)}
function hide(){const r=document.getElementById('rt1101-collaboration');if(r)r.hidden=true}
function renderIfOpen(){const r=document.getElementById('rt1101-collaboration');if(r&&!r.hidden)renderWorkspace(r)}
function tabButton(key,label,count=''){return`<button data-tab="${key}" class="${activeTab===key?'active':''}"><span>${label}</span>${count!==''?`<em>${count}</em>`:''}</button>`}
function renderWorkspace(root){
  const s=ensureState(),g=graph(),m=currentMember(s),comments=s.comments||[],openComments=comments.filter(x=>x.status==='open').length,conflicts=(s.sync.conflicts||[]).filter(x=>x.status!=='resolved').length;
  root.innerHTML=`<div class="rt1101-shell bo1173-workspace-shell" role="main" aria-label="Colaboração"><header><div><small>WORKSPACE · COLABORAÇÃO LOCAL-FIRST</small><h2>${esc(s.workspaceName)}</h2><p>Colaboração local-first, comentários e contrato de sincronização para cloud.</p></div><div class="rt1101-status"><span class="${navigator.onLine?'on':'off'}">${navigator.onLine?'Online':'Offline'}</span><button data-close aria-label="Fechar">×</button></div></header><nav>${tabButton('workspace','Workspace')}${tabButton('members','Membros',Object.keys(s.members||{}).length)}${tabButton('comments','Comentários',openComments)}${tabButton('activity','Atividade',Math.min((s.activity||[]).length,99))}${tabButton('sync','Sync',conflicts||readJournal().length)}</nav><main></main></div>`;
  root.querySelector('[data-close]').onclick=hide;root.onclick=e=>{if(e.target===root)hide()};root.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.tab;renderWorkspace(root)});const main=root.querySelector('main');
  if(activeTab==='workspace')renderWorkspaceOverview(main,s,g,m);
  else if(activeTab==='members')renderMembers(main,s);
  else if(activeTab==='comments')renderComments(main,s);
  else if(activeTab==='activity')renderActivity(main,s);
  else renderSync(main,s);
}
function card(title,value,sub=''){return`<article class="rt1101-stat"><small>${esc(title)}</small><b>${esc(value)}</b>${sub?`<span>${esc(sub)}</span>`:''}</article>`}
function renderWorkspaceOverview(main,s,g,m){
  const p=onlinePresence(),open=(s.comments||[]).filter(x=>x.status==='open').length,st=syncStatus();
  main.innerHTML=`<section class="rt1101-hero"><div><span>WORKSPACE</span><h3>${esc(s.workspaceName)}</h3><p>${esc(g?.service?.name||'Serviço')} · Schema V${esc(g?.schemaVersion||3)} · revisão ${esc(g?.persistenceRevision||0)}</p></div><div class="rt1101-role"><small>Você está como</small><b>${roleLabel[m?.role]||'Visualizador'}</b></div></section><div class="rt1101-stats">${card('Membros',Object.keys(s.members||{}).length,'inclui convidados locais')}${card('Presença',p.length,'abas/sessões locais ativas')}${card('Comentários abertos',open,'contextuais ao Service Graph')}${card('Sync',st.mode==='local-only'?'Local only':st.mode,`${st.pending} mudanças pendentes`)}</div><section class="rt1101-panel"><div><h3>Fundação de colaboração</h3><p>Esta versão prepara identidade, papéis, comentários, presença local e adapters de nuvem. Nenhum dado é enviado para um servidor remoto sem um adapter explícito.</p></div><ul><li><b>Local-first:</b> o Service Graph continua sendo a fonte da verdade.</li><li><b>RBAC:</b> Owner, Editor, Comentador e Visualizador.</li><li><b>Comentários:</b> vinculados a objetos, quadros ou ao serviço.</li><li><b>Presença:</b> sincronizada entre abas do mesmo navegador via BroadcastChannel.</li><li><b>Cloud-ready:</b> contrato de push/pull e centro de conflitos, sem backend embutido.</li></ul></section><section class="rt1101-panel"><h3>Usuário local</h3><label>Testar sessão como<select data-current-user>${Object.values(s.members||{}).map(x=>`<option value="${esc(x.id)}" ${x.id===s.currentUserId?'selected':''}>${esc(x.name)} · ${roleLabel[x.role]}</option>`).join('')}</select></label><p class="rt1101-help">Trocar o usuário aqui serve para validar permissões localmente; não autentica identidades externas.</p></section>`;
  main.querySelector('[data-current-user]').onchange=e=>{try{setCurrentUser(e.target.value);renderWorkspace(main.closest('.rt1101-collaboration'))}catch(err){notice(err.message)}};
}
function renderMembers(main,s){
  const owner=can('manageMembers');main.innerHTML=`<div class="rt1101-section-head"><div><h3>Membros e papéis</h3><p>Convites nesta versão ficam no projeto como preparação; nenhum e-mail é enviado.</p></div>${owner?'<button class="primary" data-add>+ Adicionar membro</button>':''}</div><div class="rt1101-member-list"></div>`;const list=main.querySelector('.rt1101-member-list');
  Object.values(s.members||{}).forEach(m=>{const row=document.createElement('article');row.className='rt1101-member';row.innerHTML=`<div class="rt1101-avatar">${esc((m.name||'?').slice(0,2).toUpperCase())}</div><div><b>${esc(m.name)}</b><span>${esc(m.email||'Sem e-mail')} · ${m.status==='invited'?'Convite local':m.status==='disabled'?'Desativado':'Ativo'}</span></div><select ${owner?'':'disabled'} data-role>${Object.keys(roleLabel).map(r=>`<option value="${r}" ${r===m.role?'selected':''}>${roleLabel[r]}</option>`).join('')}</select>`;row.querySelector('[data-role]').onchange=e=>{try{updateMember(m.id,{role:e.target.value});renderWorkspace(main.closest('.rt1101-collaboration'))}catch(err){notice(err.message);e.target.value=m.role}};list.appendChild(row)});
  main.querySelector('[data-add]')?.addEventListener('click',()=>memberDialog())
}
function memberDialog(){const root=document.createElement('div');root.className='rt1101-submodal';root.innerHTML=`<form><h3>Adicionar membro</h3><label>Nome<input name="name" required></label><label>E-mail opcional<input name="email" type="email"></label><label>Papel<select name="role"><option value="editor">Editor</option><option value="commenter">Comentador</option><option value="viewer">Visualizador</option><option value="owner">Owner</option></select></label><p>O registro será criado como <b>convite local</b>. Conectar um provider de identidade/cloud ficará a cargo de um adapter futuro.</p><footer><button type="button" data-cancel>Cancelar</button><button class="primary">Adicionar</button></footer></form>`;document.body.appendChild(root);root.querySelector('[data-cancel]').onclick=()=>root.remove();root.onclick=e=>{if(e.target===root)root.remove()};root.querySelector('form').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{addMember({name:fd.get('name'),email:fd.get('email'),role:fd.get('role')});root.remove();renderIfOpen()}catch(err){notice(err.message)}};root.querySelector('input').focus()}
function renderComments(main,s){
  const target=commentTarget(),may=can('comment'),members=s.members||{};main.innerHTML=`<div class="rt1101-section-head"><div><h3>Comentários contextuais</h3><p>Alvo atual: <b>${esc(target.label)}</b></p></div><div class="rt1101-filter"><button class="active" data-filter="all">Todos</button><button data-filter="open">Abertos</button><button data-filter="resolved">Resolvidos</button></div></div>${may?'<form class="rt1101-comment-form"><textarea name="body" placeholder="Escreva uma observação, pergunta ou decisão contextual…" required></textarea><button class="primary">Comentar</button></form>':'<div class="rt1101-callout">Seu papel atual é somente leitura e não permite comentar.</div>'}<div class="rt1101-comments"></div>`;
  let filter='all';const draw=()=>{const list=main.querySelector('.rt1101-comments');list.innerHTML='';(s.comments||[]).filter(c=>filter==='all'||c.status===filter).forEach(c=>{const a=members[c.authorId]||{name:'Membro'};const el=document.createElement('article');el.className='rt1101-comment '+c.status;el.innerHTML=`<header><div><b>${esc(a.name)}</b><span>${esc(c.targetLabel||c.targetType)} · ${new Date(c.createdAt).toLocaleString('pt-BR')}</span></div><em>${c.status==='open'?'Aberto':'Resolvido'}</em></header><p>${esc(c.body)}</p>${may?`<footer><button data-toggle>${c.status==='open'?'Resolver':'Reabrir'}</button></footer>`:''}`;el.querySelector('[data-toggle]')?.addEventListener('click',()=>{resolveComment(c.id,c.status==='open');renderIfOpen()});list.appendChild(el)});if(!list.children.length)list.innerHTML='<div class="rt1101-empty">Nenhum comentário nesta visualização.</div>'};
  main.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;main.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));draw()});main.querySelector('.rt1101-comment-form')?.addEventListener('submit',e=>{e.preventDefault();const ta=e.currentTarget.querySelector('textarea');try{addComment(ta.value,target);ta.value='';renderIfOpen()}catch(err){notice(err.message)}});draw()
}
function renderActivity(main,s){const members=s.members||{};main.innerHTML='<div class="rt1101-section-head"><div><h3>Atividade</h3><p>Eventos de colaboração e governança local do workspace.</p></div></div><div class="rt1101-activity"></div>';const list=main.querySelector('.rt1101-activity');(s.activity||[]).forEach(a=>{const el=document.createElement('article');el.innerHTML=`<span class="rt1101-activity-dot"></span><div><b>${esc(a.summary)}</b><small>${esc(members[a.actorId]?.name||'Sistema')} · ${new Date(a.createdAt).toLocaleString('pt-BR')}</small></div>`;list.appendChild(el)});if(!list.children.length)list.innerHTML='<div class="rt1101-empty">Nenhuma atividade registrada.</div>'}
function renderSync(main,s){const st=syncStatus(),conflicts=s.sync.conflicts||[],owner=can('manageSync');main.innerHTML=`<div class="rt1101-section-head"><div><h3>Cloud & Sync Foundation</h3><p>Contrato de sincronização pronto, sem provider remoto embutido.</p></div><span class="rt1101-sync-badge ${st.mode}">${st.mode==='local-only'?'Local only':esc(st.mode)}</span></div><div class="rt1101-stats">${card('Mudanças pendentes',st.pending,'journal local')}${card('Conflitos abertos',st.conflicts,'centro de sync')}${card('Último sync',st.lastSyncedAt?new Date(st.lastSyncedAt).toLocaleString('pt-BR'):'Nunca','remoto')}${card('Rede',st.online?'Online':'Offline','navigator.onLine')}</div><section class="rt1101-panel"><h3>Adapter remoto</h3><p>Nenhum serviço externo é configurado por padrão. Um adapter deve implementar <code>pull()</code> e <code>push()</code> e ser registrado via <code>BlueOceanRuntime.api('collaboration').registerAdapter()</code>.</p><div class="rt1101-sync-form"><label>Adapter<input value="${esc(s.sync.adapterId||'')}" placeholder="ex.: supabase-v1" ${owner?'':'disabled'}></label><label>Workspace remoto<input value="${esc(s.sync.remoteWorkspaceId||'')}" placeholder="ID remoto" ${owner?'':'disabled'}></label></div><div class="rt1101-actions"><button data-envelope>Exportar envelope</button>${owner?'<button data-local>Usar apenas local</button><button class="primary" data-sync>Sincronizar agora</button>':''}</div></section><section class="rt1101-panel"><h3>Conflitos</h3><div class="rt1101-conflicts"></div></section>`;
  main.querySelector('[data-envelope]').onclick=exportEnvelope;main.querySelector('[data-local]')?.addEventListener('click',()=>{configureSync('', '');renderIfOpen()});main.querySelector('[data-sync]')?.addEventListener('click',async()=>{try{await syncNow();notice('Sincronização concluída.');renderIfOpen()}catch(err){notice(err.message);renderIfOpen()}});const list=main.querySelector('.rt1101-conflicts');conflicts.filter(c=>c.status!=='resolved').forEach(c=>{const el=document.createElement('article');el.className='rt1101-conflict';el.innerHTML=`<div><b>Conflito de revisão</b><span>Local ${esc(c.localRevision??'—')} × remoto ${esc(c.remoteRevision??'—')} · ${new Date(c.detectedAt).toLocaleString('pt-BR')}</span></div>${owner?'<button>Marcar resolvido</button>':''}`;el.querySelector('button')?.addEventListener('click',()=>{resolveConflict(c.id);renderIfOpen()});list.appendChild(el)});if(!list.children.length)list.innerHTML='<div class="rt1101-empty">Nenhum conflito aberto.</div>'
}

ensureState();
const api={version:VERSION,show,hide,state:()=>clone(ensureState()),currentMember:()=>clone(currentMember()),currentRole,can,internalWrite:()=>internalMutation,addMember,updateMember,setCurrentUser,addComment,resolveComment,commentTarget,presence:()=>clone(onlinePresence()),syncStatus,registerAdapter,configureSync,syncNow,exportEnvelope,resolveConflict};
runtime.register('collaboration',api,VERSION);applyPermissionMode();startPresence();injectNavigation();window.addEventListener('rt-app-ready',injectNavigation);window.addEventListener('rt-graph-changed',e=>{queueChange(e.detail);renderIfOpen()});window.addEventListener('online',renderIfOpen);window.addEventListener('offline',renderIfOpen);window.addEventListener('beforeunload',()=>stopPresence(true));document.addEventListener('click',denyMutation,true);document.addEventListener('keydown',denyMutation,true);setTimeout(()=>{injectNavigation();renderPresenceBadge()},900);

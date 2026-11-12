/** Same-origin Studio protocol. This distribution has no independent project storage. */
const CHANNEL='blue-ocean-service-spaces/v1';
const session=new URLSearchParams(location.search).get('session');
let callbacks,version='',sequence=0,pending=null,queued=null,loaded=false;
const send=(type,detail={})=>parent.postMessage({channel:CHANNEL,session,type,...detail},location.origin);
export const host={
 canEdit:false,
 editMap(){send('edit-map')},
 focus(){send('focus-editor')},
 history(direction){if(!host.canEdit){callbacks?.notice('Este projeto está em modo de leitura.',true);return}send(direction)},
 publish(document){
  if(!loaded)throw Error('Aguarde o carregamento do serviço.');
  if(!host.canEdit)throw Error('Este projeto está em modo de leitura.');
  const draft=structuredClone(document);
  if(pending){queued=draft;return}
  pending=++sequence;send('change',{sequence:pending,baseVersion:version,document:draft});
 },
 connect(next){
  callbacks=next;
  window.addEventListener('message',event=>{
   const message=event.data;
   if(event.source!==parent||event.origin!==location.origin||!message||message.channel!==CHANNEL||message.session!==session)return;
   if(!['snapshot','ack','controls'].includes(message.type))return;
   if(message.type==='ack'&&message.sequence!==pending)return;
   host.canEdit=message.canEdit===true;
   for(const direction of ['undo','redo'])for(const button of document.querySelectorAll('#'+direction+',#floor-'+direction))button.disabled=!host.canEdit||message[direction==='undo'?'canUndo':'canRedo']!==true;
   document.documentElement.classList.toggle('studio-readonly',!host.canEdit);
   if(message.type==='controls')return;
   version=message.version;loaded=true;
   for(const [token,value] of Object.entries(message.theme||{})){
    if(/^--(?:bg|surface2?|border(?:-strong)?|text[23]?|blue(?:-light|-mid)?|green(?:-light)?|red(?:-light)?|amber(?:-light)?)$/.test(token)&&typeof value==='string'&&CSS.supports('color',value))document.documentElement.style.setProperty(token,value);
   }
   if(message.type==='ack'&&message.accepted&&queued){const draft=queued;queued=null;pending=null;host.publish(draft);return}
   pending=null;queued=null;
   callbacks.load(message.document);
   if(message.error)callbacks.notice(message.error,true);
   send('settled');
  });
  if(parent===window||!session){callbacks.notice('Abra Salas e 3D pelo menu do Blue Ocean Service Studio.',true);return}
  send('ready');
 },
};

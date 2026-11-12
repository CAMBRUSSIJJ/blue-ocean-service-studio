import { createDocument, validateDocument, touch } from './core.mjs';
import { ensureRoomModel } from './environments.mjs';
import { reconcileFloorplan } from './floorplan.mjs';
import { initRoomBuilder } from './environments-ui.mjs';
import { host } from './studio-host.mjs';

let document=createDocument('Carregando serviço');
document.stages=[{id:'service-space',name:'Serviço'}];
ensureRoomModel(document);
const notice=(message,warning=false)=>{
 const target=window.document.querySelector('#floor-editor-notice');
 target.textContent=message;target.classList.toggle('toast-warning',warning);
};
function mutate(change){
 if(!host.canEdit)throw Error('Este projeto está em modo de leitura.');
 const before=structuredClone(document);
 try{change(document);ensureRoomModel(document);reconcileFloorplan(document);validateDocument(document);touch(document);host.publish(document);rooms.refresh();}
 catch(error){document=before;rooms.refresh();throw error}
}
const rooms=initRoomBuilder({getDocument:()=>document,mutate,onEdit:()=>host.editMap(),onBack:()=>{}});
rooms.show();
for(const direction of ['undo','redo']){
 for(const selector of ['#'+direction,'#floor-'+direction])window.document.querySelector(selector)?.addEventListener('click',()=>host.history(direction));
}
host.connect({
 load(next){validateDocument(next);document=structuredClone(next);ensureRoomModel(document);rooms.refresh();},notice,
});
window.document.addEventListener('focusin',event=>{
 if(event.target.closest?.('dialog[open]'))host.focus();
});
window.addEventListener('keydown',event=>{
 if(!(event.ctrlKey||event.metaKey)||event.altKey)return;
 const typing=event.target.closest?.('input,textarea,select,[contenteditable="true"]');
 if(event.key.toLowerCase()==='z'&&!typing){event.preventDefault();host.history(event.shiftKey?'redo':'undo');}
 if(event.key.toLowerCase()==='y'&&!typing){event.preventDefault();host.history('redo');}
});

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Check, GripVertical, MoreHorizontal, Plus, Trash2, X } from '../design-system/icons';

export type PainCanvasBlock = {
 id: string; label: string; value: string; placeholder: string; essential?: boolean;
 onChange: (value: string) => void;
};
export type PainCanvasCheck = { id: string; label: string; complete: boolean; kinds?: string[] };
export type PainCanvasRelation = { id: string; kind: string; title: string; linked: boolean };
type Props = {
 entityId: string; blocks: PainCanvasBlock[]; checks: PainCanvasCheck[]; relations: PainCanvasRelation[];
 onToggleRelation: (id: string) => void; onRemove: () => void;
};
export function PainCanvas({ entityId, blocks, checks, relations, onToggleRelation, onRemove }: Props) {
 const orderKey = 'bo-pain-canvas-order:' + entityId;
 const [order, setOrder] = useState<string[]>([]);
 const [expanded, setExpanded] = useState<string[]>([]);
 const [dragging, setDragging] = useState<string | null>(null);
 const [connectionKind, setConnectionKind] = useState<string | null>(null);
 const [term, setTerm] = useState('');
 const [menu, setMenu] = useState<string | null>(null);
 const focusRef = useRef<HTMLTextAreaElement | null>(null);
 useEffect(() => {
  try { const input = JSON.parse(localStorage.getItem(orderKey) ?? '[]'); setOrder(Array.isArray(input) ? input.filter((s): s is string => typeof s === 'string') : []); }
  catch { setOrder([]); }
  setExpanded([]);setConnectionKind(null);setMenu(null);setTerm('');
 }, [orderKey]);
 const sorted = useMemo(() => [...blocks].sort((a,b) => {
  const i=order.indexOf(a.id), j=order.indexOf(b.id);
  return (i>=0?i:order.length+blocks.indexOf(a))-(j>=0?j:order.length+blocks.indexOf(b));
 }), [blocks,order]);
 const visible = sorted.filter(b => b.essential || expanded.includes(b.id) || b.value.trim());
 const hidden = sorted.filter(b => !visible.includes(b));
 const changeOrder=(ids:string[])=>{setOrder(ids);try {localStorage.setItem(orderKey,JSON.stringify(ids));} catch {/* optional preference */}};
 const move=(id:string,dir:number)=>{
  const ids=sorted.map(b=>b.id), i=ids.indexOf(id), j=i+dir;
  if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];changeOrder(ids);
 };
 const drop=(e:DragEvent<HTMLElement>,onto:string)=>{
  e.preventDefault();
  if(!dragging||dragging===onto){setDragging(null);return;}
  const ids=sorted.map(b=>b.id).filter(id=>id!==dragging);
  ids.splice(ids.indexOf(onto),0,dragging);changeOrder(ids);setDragging(null);
 };
 const removeBlock=(block:PainCanvasBlock)=>{
  if(block.value.trim()&&!window.confirm('Apagar o conteúdo do bloco '+block.label+'?'))return;
  block.onChange('');setExpanded(ids=>ids.filter(id=>id!==block.id));setMenu(null);
 };
 const activeCheck=checks.find(check=>check.id===connectionKind);
 const candidates=relations.filter(r=>activeCheck?.kinds?.includes(r.kind)&&r.title.toLocaleLowerCase('pt-BR').includes(term.toLocaleLowerCase('pt-BR')));
 const quick=relations.filter(r=>['persona','evidence'].includes(r.kind)).slice(0,8);
 return <div className="bo-pain-canvas" data-pain-canvas="1">
  <div className="bo-pain-canvas-main">
   <div className="bo-pain-canvas-grid">
    {visible.map(block=><article className="bo-pain-canvas-card" key={block.id} onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,block.id)}>
     <header><strong>{block.label}</strong><div className="bo-pain-canvas-controls">
      <button type="button" draggable onDragStart={e=>{e.dataTransfer.effectAllowed='move';setDragging(block.id);}} onDragEnd={()=>setDragging(null)} aria-label={'Arrastar '+block.label} title="Arrastar"><GripVertical size={15}/></button>
      <button type="button" onClick={()=>move(block.id,-1)} aria-label={'Mover '+block.label+' à esquerda'} title="Mover para antes">←</button>
      <button type="button" onClick={()=>move(block.id,1)} aria-label={'Mover '+block.label+' à direita'} title="Mover para depois">→</button>
      <button type="button" aria-label={'Opções de '+block.label} aria-expanded={menu===block.id} onClick={()=>setMenu(menu===block.id?null:block.id)}><MoreHorizontal size={16}/></button>
     </div></header>
     {menu===block.id&&<div className="bo-pain-canvas-menu">
      <button type="button" onClick={()=>{move(block.id,-1);setMenu(null)}}>Mover para antes</button>
      <button type="button" onClick={()=>{move(block.id,1);setMenu(null)}}>Mover para depois</button>
      {!block.essential&&<button type="button" onClick={()=>removeBlock(block)}>Remover bloco</button>}
     </div>}
     <textarea ref={block.id==='description'?focusRef:undefined} aria-label={block.label} rows={5} value={block.value} onChange={e=>block.onChange(e.target.value)} placeholder={block.placeholder}/>
    </article>)}
   </div>
   <div className="bo-pain-canvas-ghosts" aria-label="Blocos opcionais">
    {hidden.map(block=><button type="button" key={block.id} className="bo-pain-canvas-ghost" onClick={()=>setExpanded(ids=>[...ids,block.id])}><Plus size={16}/><span>{block.label}</span></button>)}
   </div>
  </div>
  <aside className="bo-pain-canvas-aside">
   <section className="bo-pain-canvas-criteria"><header><strong>Critérios mínimos</strong><span>{checks.filter(c=>c.complete).length}/{checks.length}</span></header>
    <div className="bo-pain-canvas-checks">{checks.map(c=><div key={c.id} className="bo-pain-canvas-check"><span aria-hidden="true" className={c.complete?'done':''}>{c.complete&&<Check size={12}/>}</span><strong>{c.label}</strong>{c.kinds&&<button type="button" onClick={()=>{setConnectionKind(connectionKind===c.id?null:c.id);setTerm('')}}>{c.complete?'Editar':'Conectar'}</button>}</div>)}</div>
    {activeCheck?.kinds&&<div className="bo-pain-canvas-connection">
     <div><strong>Relacionar {activeCheck.label.toLowerCase()}</strong><button type="button" aria-label="Fechar" onClick={()=>setConnectionKind(null)}><X size={14}/></button></div>
     <input aria-label="Buscar conexões" placeholder="Buscar entidade" value={term} onChange={e=>setTerm(e.target.value)}/>
     <div className="bo-pain-canvas-candidates">{candidates.length?candidates.map(r=><button type="button" key={r.id} aria-pressed={r.linked} onClick={()=>onToggleRelation(r.id)}><span>{r.title}</span>{r.linked?<Check size={14}/>:<Plus size={14}/>}</button>):<p>Nenhuma entidade encontrada.</p>}</div>
    </div>}
   </section>
   <section className="bo-pain-canvas-quick"><header><strong>Relações rápidas</strong><small>Arraste ou clique para conectar</small></header>
    {quick.length?quick.map(r=><button type="button" key={r.id} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',r.id)} aria-pressed={r.linked} onClick={()=>onToggleRelation(r.id)}>
      <small>{r.kind==='persona'?'Persona':'Evidência'}</small><strong>{r.title}</strong><span>{r.linked?'Conectado':'Conectar'}</span>
    </button>):<p>Crie Personas e Evidências para estabelecer conexões rápidas.</p>}
   </section>
   <button type="button" className="bo-pain-canvas-delete" onClick={onRemove}><Trash2 size={14}/> Excluir esta dor</button>
  </aside>
 </div>;
}

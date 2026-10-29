import { useEffect, useMemo, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import { Check, ChevronDown, GripVertical, MoreHorizontal, Plus, X } from '../design-system/icons';

/** Generic, graph-agnostic editor: callers own persistence, semantics and relationships. */
export type EntityInlineBlock = {
  id: string; label: string; value: string; placeholder: string;
  essential?: boolean; wide?: boolean; onChange: (value: string) => void;
};
export type EntityInlineCriterion = {
  id: string; label: string; complete: boolean; relationKinds?: string[]; fieldId?: string;
};
export type EntityInlineRelation = {
  id: string; kind: string; title: string; linked: boolean;
};
type Props = {
  entityId: string; kind: string;
  blocks: EntityInlineBlock[]; criteria: EntityInlineCriterion[];
  relations: EntityInlineRelation[]; onToggleRelation: (id: string) => void;
  onViewValidation?: () => void;
  criterionTitle?: string;
  primaryCriterionIds?: string[];
  quickKinds?: string[];
  sidebarTop?: ReactNode;
};

const kindName: Record<string,string> = {
  pain:'Dor', evidence:'Evidência', persona:'Persona', need:'Necessidade', job:'Job', problemHypothesis:'Hipótese'
};
export function EntityInlineCanvas({entityId,kind,blocks,criteria,relations,onToggleRelation,onViewValidation,criterionTitle='Critérios de testabilidade',primaryCriterionIds=['premise','expected','criterion','evidence','pain'],quickKinds=['pain','evidence'],sidebarTop}:Props) {
  const storageKey = `bo-inline-order:${kind}:${entityId}`;
  const [order,setOrder] = useState<string[]>([]);
  const [expanded,setExpanded] = useState<string[]>([]);
  const [dragging,setDragging] = useState<string|null>(null);
  const [menu,setMenu] = useState<string|null>(null);
  const [connect,setConnect] = useState<string|null>(null);
  const [search,setSearch] = useState('');
  const [showAll,setShowAll] = useState(false);
  useEffect(()=>{
    try { const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');setOrder(Array.isArray(saved)?saved.filter((x):x is string=>typeof x==='string'):[]); }
    catch {setOrder([]);}
    setExpanded([]);setMenu(null);setConnect(null);setSearch('');setShowAll(false);
  },[storageKey]);
  const ordered=useMemo(()=>[...blocks].sort((a,b)=>{
    const ia=order.indexOf(a.id),ib=order.indexOf(b.id);
    return (ia>=0?ia:order.length+blocks.indexOf(a))-(ib>=0?ib:order.length+blocks.indexOf(b));
  }),[blocks,order]);
  const visible=ordered.filter(b=>b.essential||b.value.trim()||expanded.includes(b.id));
  const hidden=ordered.filter(b=>!visible.includes(b));
  const saveOrder=(ids:string[])=>{setOrder(ids);try{localStorage.setItem(storageKey,JSON.stringify(ids));}catch {/* optional layout preference */}};
  const move=(id:string,delta:number)=>{
    const ids=ordered.map(b=>b.id),i=ids.indexOf(id),j=i+delta;
    if(j<0||j>=ids.length)return;
    [ids[i],ids[j]]=[ids[j],ids[i]];saveOrder(ids);setMenu(null);
  };
  const drop=(event:DragEvent<HTMLElement>,target:string)=>{
    event.preventDefault();
    if(dragging){
      if(dragging===target){setDragging(null);return;}
      const ids=ordered.map(b=>b.id).filter(id=>id!==dragging);
      ids.splice(ids.indexOf(target),0,dragging);saveOrder(ids);setDragging(null);return;
    }
    const relationId=event.dataTransfer.getData('application/x-bo-relation');
    const relation=relations.find(item=>item.id===relationId);
    if(relation&&!relation.linked)onToggleRelation(relation.id);
  };
  const removeBlock=(block:EntityInlineBlock)=>{
    if(block.value.trim()&&!window.confirm(`Apagar o conteúdo de “${block.label}”?`))return;
    block.onChange('');setExpanded(items=>items.filter(id=>id!==block.id));setMenu(null);
  };
  const current=criteria.find(c=>c.id===connect);
  const choices=relations.filter(r=>current?.relationKinds?.includes(r.kind)&&r.title.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
  const quick=relations.filter(r=>quickKinds.includes(r.kind)).slice(0,10);
  const primary=criteria.filter(c=>primaryCriterionIds.includes(c.id));
  const other=criteria.filter(c=>!primary.includes(c));
  const activateField=(id:string)=>{
    setExpanded(ids=>ids.includes(id)?ids:[...ids,id]);
    setConnect(null);
    window.requestAnimationFrame(()=>document.getElementById(`bo-inline-${kind}-${entityId}-${id}`)?.focus());
  };
  return <div className="bo-inline-canvas" data-inline-entity={kind}>
    <main className="bo-inline-main">
      <div className="bo-inline-cards">
        {visible.map(block=><section key={block.id} className={`bo-inline-card ${block.wide?'is-wide':''}`}
          onDragOver={event=>event.preventDefault()} onDrop={event=>drop(event,block.id)}>
          <header><strong>{block.label}</strong><div className="bo-inline-controls">
            <button type="button" draggable aria-label={`Arrastar ${block.label}`} title="Arrastar bloco" onDragStart={event=>{event.dataTransfer.effectAllowed='move';setDragging(block.id);}} onDragEnd={()=>setDragging(null)}><GripVertical size={14}/></button>
            <button type="button" aria-label={`Opções de ${block.label}`} aria-expanded={menu===block.id} onClick={()=>setMenu(menu===block.id?null:block.id)}><MoreHorizontal size={17}/></button>
          </div></header>
          {menu===block.id&&<div className="bo-inline-menu">
            <button type="button" onClick={()=>move(block.id,-1)}>Mover para antes</button>
            <button type="button" onClick={()=>move(block.id,1)}>Mover para depois</button>
            {!block.essential&&<button type="button" onClick={()=>removeBlock(block)}>Remover bloco</button>}
          </div>}
          <textarea id={`bo-inline-${kind}-${entityId}-${block.id}`} aria-label={block.label} rows={4} value={block.value} onChange={event=>block.onChange(event.target.value)} placeholder={block.placeholder}/>
        </section>)}
      </div>
      {hidden.length>0&&<div className="bo-inline-ghosts">
        {hidden.map(block=><button type="button" key={block.id} className="bo-inline-ghost" onClick={()=>setExpanded(ids=>[...ids,block.id])}><Plus size={17}/> {block.label}</button>)}
      </div>}
    </main>
    <aside className="bo-inline-side">
      {sidebarTop}
      <section className="bo-inline-criteria">
        <header><strong>{criterionTitle}</strong><span>{criteria.filter(c=>c.complete).length}/{criteria.length}</span></header>
        <div className="bo-inline-checks">{[...primary,...(showAll?other:[])].map(c=><div key={c.id} className="bo-inline-check">
          <span className={c.complete?'complete':''} aria-hidden="true">{c.complete&&<Check size={11}/>}</span>
          <strong>{c.label}</strong>
          {c.relationKinds&&<button type="button" className="bo-inline-connect" onClick={()=>{setConnect(connect===c.id?null:c.id);setSearch('')}}>{c.complete?'Editar':'Conectar'}</button>}
          {!c.relationKinds&&c.fieldId&&!c.complete&&<button type="button" className="bo-inline-connect" onClick={()=>activateField(c.fieldId!)}>Adicionar</button>}
        </div>)}</div>
        {other.length>0&&<button type="button" className="bo-inline-more" aria-expanded={showAll} onClick={()=>setShowAll(!showAll)}>{showAll?'Ocultar critérios complementares':`Ver ${other.length} critérios complementares`} <ChevronDown size={13}/></button>}
        {current?.relationKinds&&<div className="bo-inline-picker">
          <div><strong>Conectar {current.label.toLowerCase()}</strong><button type="button" aria-label="Fechar conexões" onClick={()=>setConnect(null)}><X size={14}/></button></div>
          <input type="search" aria-label="Buscar entidades" placeholder="Buscar no serviço" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="bo-inline-options">{choices.length?choices.map(r=><button type="button" key={r.id} aria-pressed={r.linked} onClick={()=>onToggleRelation(r.id)}><span>{r.title}</span>{r.linked?<Check size={13}/>:<Plus size={13}/>}</button>):<p>Nenhuma entidade disponível. Crie-a na aba correspondente.</p>}</div>
        </div>}
        {onViewValidation&&<button type="button" className="bo-inline-validation" onClick={onViewValidation}>Abrir validação completa →</button>}
      </section>
      <section className="bo-inline-quick">
        <header><strong>Relações rápidas</strong><small>Arraste para um bloco ou clique para conectar</small></header>
        {quick.length?quick.map(r=><button type="button" key={r.id} draggable
          onDragStart={event=>{event.dataTransfer.setData('application/x-bo-relation',r.id);event.dataTransfer.effectAllowed='copy';}}
          onClick={()=>onToggleRelation(r.id)} aria-pressed={r.linked}>
          <span>{kindName[r.kind]??r.kind}</span><strong>{r.title}</strong><small>{r.linked?'Conectada ✓':'Conectar +'}</small>
        </button>):<p>Cadastre entidades relacionadas para estabelecer conexões rápidas.</p>}
      </section>
    </aside>
  </div>;
}

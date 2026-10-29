import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, PointerEvent } from 'react';
import { ChevronDown, GripVertical, Maximize2, MoreHorizontal, Plus, Trash2 } from '../../design-system/icons';
import { EntityCriteria } from './EntityCriteria';
import { EntityRelations, RELATION_DRAG_MIME } from './EntityRelations';
import type { EditorFieldKind, EntityCanvasBlock, EntityCriterion, EntityRelation } from './types';

type Box = { span: 1 | 2; height: number };
type Props = {
  entityKey: string;
  blocks: EntityCanvasBlock[];
  checks: EntityCriterion[];
  relations: EntityRelation[];
  onToggleRelation: (id: string) => void;
  onAddCustom?: (kind: EditorFieldKind) => void;
  onRemoveCustom?: (id: string) => void;
  onRenameCustom?: (id: string, label: string) => void;
  onRemoveEntity: () => void;
};
const fieldTypes: Array<{kind:EditorFieldKind;label:string}> = [
  {kind:'text',label:'Texto'}, {kind:'checklist',label:'Checklist'},
  {kind:'number',label:'Número'}, {kind:'date',label:'Data'},
  {kind:'image',label:'Imagem (URL)'}, {kind:'document',label:'Documento (link)'},
];
const readArray=(key:string):string[]=>{try{const parsed=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(parsed)?parsed.filter((id):id is string=>typeof id==='string'):[]}catch{return []}};
const readBoxes=(key:string):Record<string,Box>=>{try{
  const parsed=JSON.parse(localStorage.getItem(key)||'{}');
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
  const entries=Object.entries(parsed).filter((entry):entry is [string,Box]=>{
    const v=entry[1] as Box;return !!v&&[1,2].includes(v.span)&&Number.isFinite(v.height)&&v.height>=145&&v.height<=900;
  });return Object.fromEntries(entries);
}catch{return {}}};
function BlockControl({block}:{block:EntityCanvasBlock}) {
  if(block.kind==='number')return <input type="number" value={block.value} aria-label={block.label} onChange={e=>block.onChange(e.target.value)} placeholder={block.placeholder}/>;
  if(block.kind==='date')return <input type="date" value={block.value} aria-label={block.label} onChange={e=>block.onChange(e.target.value)}/>;
  if(block.kind==='image'||block.kind==='document'){
    const safe=/^https?:\/\//i.test(block.value.trim());
    return <div className="bo-canvas-asset">
      <input type="url" value={block.value} aria-label={block.label} onChange={e=>block.onChange(e.target.value)} placeholder={block.kind==='image'?'https://.../imagem.png':'https://.../arquivo.pdf'}/>
      {safe&&block.kind==='image'&&<img src={block.value} loading="lazy" alt={block.label}/>}
      {safe&&block.kind==='document'&&<a href={block.value} target="_blank" rel="noopener noreferrer">Abrir documento ↗</a>}
    </div>;
  }
  if(block.kind==='checklist'){
    const entries=block.value.split('\n').filter(Boolean);
    const toggle=(index:number)=>block.onChange(entries.map((line,i)=>i===index
      ? line.startsWith('[x] ')?'[ ] '+line.slice(4):'[x] '+line.replace(/^\[[ x]\] /,'')
      : line).join('\n'));
    return <div className="bo-canvas-checklist">
      {entries.map((line,i)=><label key={i}><input type="checkbox" checked={line.startsWith('[x] ')} onChange={()=>toggle(i)}/><span>{line.replace(/^\[[ x]\] /,'')}</span></label>)}
      <input aria-label={'Adicionar item em '+block.label} placeholder="Adicionar item e pressionar Enter"
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();const val=e.currentTarget.value.trim();if(val){block.onChange([...entries,'[ ] '+val].join('\n'));e.currentTarget.value='';}}}}/>
    </div>;
  }
  return <textarea aria-label={block.label} rows={4} value={block.value} onChange={e=>block.onChange(e.target.value)} placeholder={block.placeholder}/>;
}
export function EntityCanvas({entityKey,blocks,checks,relations,onToggleRelation,onAddCustom,onRemoveCustom,onRenameCustom,onRemoveEntity}:Props) {
  const orderKey='bo-entity-canvas:order:'+entityKey;
  const hiddenKey='bo-entity-canvas:hidden:'+entityKey;
  const layoutKey='bo-entity-canvas:layout:'+entityKey;
  const [order,setOrder]=useState<string[]>([]);
  const [expanded,setExpanded]=useState<string[]>([]);
  const [hidden,setHidden]=useState<string[]>([]);
  const [layout,setLayout]=useState<Record<string,Box>>({});
  const [dragId,setDragId]=useState<string|null>(null);
  const [menu,setMenu]=useState<string|null>(null);
  const [addMenu,setAddMenu]=useState(false);
  const resizeRef=useRef<{id:string;startX:number;startY:number;span:1|2;height:number}|null>(null);
  useEffect(()=>{setOrder(readArray(orderKey));setHidden(readArray(hiddenKey));setLayout(readBoxes(layoutKey));setExpanded([]);setMenu(null);setAddMenu(false)},[orderKey,hiddenKey,layoutKey]);
  const saveOrder=(next:string[])=>{setOrder(next);try{localStorage.setItem(orderKey,JSON.stringify(next))}catch{/* user may disable local storage */}};
  const saveHidden=(next:string[])=>{setHidden(next);try{localStorage.setItem(hiddenKey,JSON.stringify(next))}catch{/* optional */}};
  const saveLayout=(next:Record<string,Box>)=>{setLayout(next);try{localStorage.setItem(layoutKey,JSON.stringify(next))}catch{/* optional */}};
  const sorted=useMemo(()=>[...blocks].sort((a,b)=>{
    const i=order.indexOf(a.id),j=order.indexOf(b.id);
    return (i>=0?i:order.length+blocks.indexOf(a))-(j>=0?j:order.length+blocks.indexOf(b));
  }),[blocks,order]);
  const visible=sorted.filter(b=>!hidden.includes(b.id)&&(b.essential||b.custom||expanded.includes(b.id)||!!b.value.trim()));
  const optional=sorted.filter(b=>!visible.includes(b));
  const activate=(id:string)=>{
    saveHidden(hidden.filter(x=>x!==id));setExpanded(value=>value.includes(id)?value:[...value,id]);
    requestAnimationFrame(()=>document.getElementById('bo-canvas-field-'+id)?.focus());
  };
  const move=(id:string,direction:-1|1)=>{
    const ids=sorted.map(b=>b.id),i=ids.indexOf(id),j=i+direction;
    if(i<0||j<0||j>=ids.length)return;
    [ids[i],ids[j]]=[ids[j],ids[i]];saveOrder(ids);setMenu(null);
  };
  const hide=(block:EntityCanvasBlock)=>{
    if(block.essential)return;
    if(block.custom){
      if(window.confirm('Excluir este campo personalizado e seu conteúdo?'))onRemoveCustom?.(block.id);
    }else saveHidden([...hidden,block.id]);
    setMenu(null);
  };
  const drop=(e:DragEvent<HTMLElement>,target:string)=>{
    e.preventDefault();
    if(dragId){
      if(dragId!==target){const ids=sorted.map(b=>b.id).filter(id=>id!==dragId);ids.splice(ids.indexOf(target),0,dragId);saveOrder(ids);}
      setDragId(null);return;
    }
    const relationId=e.dataTransfer.getData(RELATION_DRAG_MIME);
    const relation=relations.find(r=>r.id===relationId);
    if(relation&&!relation.linked)onToggleRelation(relation.id);
  };
  const beginResize=(e:PointerEvent<HTMLButtonElement>,id:string)=>{
    e.preventDefault();e.stopPropagation();
    const current=layout[id]||{span:1,height:185};
    resizeRef.current={id,startX:e.clientX,startY:e.clientY,span:current.span,height:current.height};
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const resize=(e:PointerEvent<HTMLButtonElement>)=>{
    const r=resizeRef.current;if(!r)return;
    const newHeight=Math.max(170,Math.min(800,Math.round(r.height+e.clientY-r.startY)));
    const delta=e.clientX-r.startX;
    const span:1|2=delta>95?2:delta< -95?1:r.span;
    saveLayout({...layout,[r.id]:{span,height:newHeight}});
  };
  const endResize=()=>{resizeRef.current=null};
  return <div className="bo-pain-canvas bo-entity-canvas" data-entity-canvas="1">
    <main className="bo-pain-canvas-main">
      <div className="bo-pain-canvas-grid">
        {visible.map(block=><article key={block.id} className={'bo-pain-canvas-card'+(layout[block.id]?.span===2?' is-wide':'')}
          style={layout[block.id]?.height?{minHeight:layout[block.id].height}:undefined}
          onDragOver={e=>e.preventDefault()} onDrop={e=>drop(e,block.id)}>
          <header><strong>{block.label}</strong><div className="bo-pain-canvas-controls">
            <button type="button" draggable title="Arrastar bloco" aria-label={'Arrastar '+block.label} onDragStart={e=>{e.dataTransfer.effectAllowed='move';setDragId(block.id)}} onDragEnd={()=>setDragId(null)}><GripVertical size={16}/></button>
            <button type="button" aria-label={'Opções de '+block.label} title="Opções" aria-expanded={menu===block.id} onClick={()=>setMenu(menu===block.id?null:block.id)}><MoreHorizontal size={17}/></button>
          </div></header>
          {menu===block.id&&<div className="bo-pain-canvas-menu">
            <button type="button" onClick={()=>move(block.id,-1)}>Mover antes</button>
            <button type="button" onClick={()=>move(block.id,1)}>Mover depois</button>
            {block.custom&&onRenameCustom&&<button type="button" onClick={()=>{const next=window.prompt('Nome do campo',block.label)?.trim();if(next)onRenameCustom(block.id,next);setMenu(null)}}>Renomear campo</button>}
            {!block.essential&&<button type="button" onClick={()=>hide(block)}>{block.custom?'Excluir campo':'Ocultar bloco (preserva conteúdo)'}</button>}
          </div>}
          <BlockControl block={block}/>
          <button className="bo-canvas-resize" type="button" aria-label={'Redimensionar '+block.label}
            title="Arraste para redimensionar" onPointerDown={e=>beginResize(e,block.id)}
            onPointerMove={resize} onPointerUp={endResize} onPointerCancel={endResize}><Maximize2 size={14}/></button>
        </article>)}
      </div>
      {optional.length>0&&<div className="bo-pain-canvas-ghosts" aria-label="Blocos opcionais">
        {optional.map(b=><button type="button" className="bo-pain-canvas-ghost" key={b.id} onClick={()=>activate(b.id)}>
          <Plus size={18}/><span>{b.label}</span>{b.value.trim()&&<small>Conteúdo preservado</small>}
        </button>)}
      </div>}
      {onAddCustom&&<div className="bo-canvas-add">
        <button type="button" aria-expanded={addMenu} onClick={()=>setAddMenu(v=>!v)}><Plus size={14}/> Adicionar campo <ChevronDown size={14}/></button>
        {addMenu&&<div className="bo-canvas-add-menu">{fieldTypes.map(t=><button type="button" key={t.kind} onClick={()=>{onAddCustom(t.kind);setAddMenu(false)}}>{t.label}</button>)}</div>}
      </div>}
    </main>
    <aside className="bo-pain-canvas-aside">
      <EntityCriteria checks={checks} relations={relations} onToggleRelation={onToggleRelation} onEditField={activate}/>
      <EntityRelations relations={relations} onToggleRelation={onToggleRelation}/>
      <button className="bo-pain-canvas-delete" type="button" onClick={onRemoveEntity}><Trash2 size={14}/> Excluir esta entidade</button>
    </aside>
  </div>;
}

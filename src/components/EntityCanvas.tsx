import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

/**
 * Lightweight, reusable interaction primitives for Personas, Jobs and Needs.
 * They do not own data or create new entities. The parent commits changes to
 * its canonical graph.
 */
export type EntityCanvasWidth = 'half' | 'full';

export function EntityCanvasResizeHandle({
  title, width, onChange,
}: {title:string; width:EntityCanvasWidth;onChange:(value:EntityCanvasWidth)=>void}) {
  const start = useRef<{x:number;width:EntityCanvasWidth}|null>(null);
  const [resizing,setResizing] = useState(false);
  const commit = (event: PointerEvent<HTMLButtonElement>) => {
    if(!start.current)return;
    const dx=event.clientX-start.current.x;
    if(Math.abs(dx)>28)onChange(dx>0?'full':'half');
    start.current=null;setResizing(false);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard=(event:KeyboardEvent<HTMLButtonElement>)=>{
    if(event.key==='ArrowRight'){event.preventDefault();onChange('full')}
    if(event.key==='ArrowLeft'){event.preventDefault();onChange('half')}
  };
  return <button type="button" className={`bo-ec-resize ${resizing?'is-resizing':''}`}
    aria-label={`Redimensionar bloco ${title}; seta esquerda reduz, seta direita expande`}
    title="Arraste a borda para redimensionar · ←/→ pelo teclado"
    aria-valuetext={width==='full'?'Largura inteira':'Meia largura'}
    onPointerDown={event=>{if(event.button!==0)return;start.current={x:event.clientX,width};event.currentTarget.setPointerCapture(event.pointerId);setResizing(true);}}
    onPointerUp={commit}
    onPointerCancel={event=>{start.current=null;setResizing(false);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}}
    onKeyDown={keyboard}><span aria-hidden="true">⋮⋮</span></button>;
}

export type EntityConnectionOption={
  id:string;
  kind:string;
  title:string;
  description?:string;
};
const labelByKind:Record<string,string>={need:'Necessidade',job:'Job',pain:'Dor',problemHypothesis:'Hipótese',evidence:'Evidência'};
const focusKinds=['job','need','pain','problemHypothesis','evidence'];

export function EntityCanvasRelations({
  entityTitle, options, connectedIds, onToggle, onViewAll,
}:{
  entityTitle:string;
  options:EntityConnectionOption[];
  connectedIds:string[];
  onToggle:(id:string)=>void;
  onViewAll:()=>void;
}){
  const [bankOpen,setBankOpen]=useState(false);
  const [query,setQuery]=useState('');
  const [dragActive,setDragActive]=useState(false);
  const ids=new Set(connectedIds);
  const selected=options.filter(x=>ids.has(x.id));
  const shown=selected.slice(0,8);
  const bank=options.filter(x=>focusKinds.includes(x.kind)&&!ids.has(x.id)&&
     `${x.title} ${x.kind} ${x.description??''}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'))).slice(0,36);
  const positions=shown.map((node,index)=>({
    ...node,
    x:index%2===0?88:372,
    y:40+Math.floor(index/2)*44,
  }));
  const height=Math.max(180,Math.ceil(shown.length/2)*44+72);
  const receive=(id:string)=>{if(options.some(x=>x.id===id)&&!ids.has(id))onToggle(id)};
  return <section className="bo-ec-relations" aria-label="Ecologia de relações" data-entity-canvas-relations="1">
    <header className="bo-ec-relations-head"><div><small>SERVICE GRAPH</small><h3>Relações do perfil</h3><p>{selected.length} ${selected.length===1?'registro vinculado':'registros vinculados'} · sem duplicação de dados</p></div>
      <button type="button" aria-expanded={bankOpen} aria-controls="bo-ec-bank" onClick={()=>setBankOpen(x=>!x)}>{bankOpen?'Ocultar banco':'Banco de conexões'} <span aria-hidden="true">↗</span></button></header>
    <div className={`bo-ec-relations-layout ${bankOpen?'has-bank':''}`}>
      <div className={`bo-ec-graph ${dragActive?'is-drop-target':''}`} style={{minHeight:height}} role="group" aria-label="Grafo de relações da Persona"
        onDragOver={event=>{if(event.dataTransfer.types.includes('application/x-blueocean-entity')){event.preventDefault();event.dataTransfer.dropEffect='link';setDragActive(true)}}}
        onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragActive(false)}}
        onDrop={event=>{event.preventDefault();receive(event.dataTransfer.getData('application/x-blueocean-entity'));setDragActive(false)}}>
        <svg viewBox={`0 0 460 ${height}`} className="bo-ec-edges" preserveAspectRatio="none" aria-hidden="true">
          {positions.map(p=><line key={p.id} x1="230" y1={height/2} x2={p.x} y2={p.y} stroke={p.kind==='need'?'#258e77':'#5992dd'} strokeWidth="1.7" opacity=".78" />)}
        </svg>
        <div className="bo-ec-central" style={{top:'50%'}}><small>PERSONA</small><strong>{entityTitle||'Sem nome'}</strong></div>
        {positions.map(pos=><button key={pos.id} type="button"
          className={`bo-ec-node bo-ec-node--${pos.kind}`}
          title="Clique para desvincular; o registro original será preservado"
          onClick={()=>onToggle(pos.id)}
          style={{left:`${pos.x/460*100}%`,top:`${pos.y/height*100}%`}}
          aria-label={`Desvincular ${labelByKind[pos.kind]??pos.kind}: ${pos.title}`}>
          <small>{labelByKind[pos.kind]??pos.kind}</small><span>{pos.title}</span></button>)}
        {!selected.length&&<div className="bo-ec-graph-empty"><span aria-hidden="true">↗</span><p>Adicione Jobs e Necessidades para visualizar suas conexões.</p></div>}
        {selected.length>shown.length&&<span className="bo-ec-more-links">+{selected.length-shown.length} conexões</span>}
      </div>
      {bankOpen&&<aside className="bo-ec-bank" id="bo-ec-bank" aria-label="Banco de conexões">
        <label>Buscar registros<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Job, necessidade, evidência…"/></label>
        <p>Arraste um registro para o grafo ou clique em Vincular.</p>
        <div className="bo-ec-bank-items">{bank.map(item=><div key={item.id} draggable
          onDragStart={event=>{event.dataTransfer.setData('application/x-blueocean-entity',item.id);event.dataTransfer.effectAllowed='link'}}
          className="bo-ec-bank-item"><div><small>{labelByKind[item.kind]??item.kind}</small><strong>{item.title}</strong></div>
          <button type="button" onClick={()=>onToggle(item.id)} aria-label={`Vincular ${item.title}`}>+ Vincular</button></div>)}
          {!bank.length&&<p>Nenhum registro disponível. Cadastre Jobs ou Necessidades na biblioteca.</p>}</div>
        <button type="button" className="bo-ec-all-links" onClick={onViewAll}>Ver todas as relações →</button>
      </aside>}
    </div>
  </section>;
}

import { Check, Plus } from '../../design-system/icons';
import type { DragEvent } from 'react';
import type { EntityRelation } from './types';

const labels:Record<string,string>={persona:'Persona',evidence:'Evidência',job:'Job',need:'Necessidade',pain:'Dor',problem:'Problema',problemHypothesis:'Hipótese'};
export const RELATION_DRAG_MIME='application/x-blue-ocean-entity-relation';
type Props={relations:EntityRelation[];onToggleRelation:(id:string)=>void;includedKinds?:string[]};
export function EntityRelations({relations,onToggleRelation,includedKinds=['persona','evidence']}:Props) {
  const visible=relations.filter(r=>includedKinds.includes(r.kind)).slice(0,12);
  const onDrag=(event:DragEvent<HTMLButtonElement>,id:string)=>{
    event.dataTransfer.setData(RELATION_DRAG_MIME,id);
    event.dataTransfer.effectAllowed='copy';
  };
  return <section className="bo-pain-canvas-quick" aria-label="Banco de relações rápidas">
    <header><strong>Relações rápidas</strong><small>Clique ou arraste para um bloco do canvas</small></header>
    {visible.length?visible.map(r=><button key={r.id} type="button" draggable onDragStart={e=>onDrag(e,r.id)} aria-pressed={r.linked} onClick={()=>onToggleRelation(r.id)}>
      <small>{labels[r.kind]||r.kind}</small><strong>{r.title}</strong><span>{r.linked?<><Check size={12}/> Conectado</>:<><Plus size={12}/> Conectar</>}</span>
    </button>):<p>Crie Personas e Evidências para estabelecer conexões rápidas.</p>}
  </section>;
}

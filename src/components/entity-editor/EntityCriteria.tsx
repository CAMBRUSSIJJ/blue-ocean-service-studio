import { useState } from 'react';
import { Check, Plus, X } from '../../design-system/icons';
import type { EntityCriterion, EntityRelation } from './types';

type Props = {
  checks: EntityCriterion[];
  relations: EntityRelation[];
  onToggleRelation: (id: string) => void;
  onEditField?: (id: string) => void;
};
export function EntityCriteria({checks, relations, onToggleRelation, onEditField}: Props) {
  const [picker,setPicker] = useState<string|null>(null);
  const [query,setQuery] = useState('');
  const active = checks.find(c=>c.id===picker);
  const options = relations.filter(r=>active?.kinds?.includes(r.kind)
    && r.title.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  return <section className="bo-pain-canvas-criteria" aria-label="Critérios mínimos">
    <header><strong>Critérios mínimos</strong><span>{checks.filter(c=>c.complete).length}/{checks.length}</span></header>
    <div className="bo-pain-canvas-checks">{checks.map(c=><div key={c.id} className="bo-pain-canvas-check">
      <span className={c.complete?'done':''} aria-hidden="true">{c.complete&&<Check size={12}/>}</span>
      <strong>{c.label}</strong>
      {c.kinds&&<button type="button" onClick={()=>{setPicker(picker===c.id?null:c.id);setQuery('')}}>{c.complete?'Editar':'Conectar'}</button>}
      {!c.kinds&&!c.complete&&c.fieldId&&onEditField&&<button type="button" onClick={()=>onEditField(c.fieldId!)}>Adicionar</button>}
    </div>)}</div>
    {active?.kinds&&<div className="bo-pain-canvas-connection">
      <div><strong>Conectar {active.label.toLowerCase()}</strong><button type="button" aria-label="Fechar relações" onClick={()=>setPicker(null)}><X size={14}/></button></div>
      <input type="search" aria-label="Buscar entidades para relacionar" value={query} placeholder="Buscar entidade" onChange={e=>setQuery(e.target.value)}/>
      <div className="bo-pain-canvas-candidates">{options.length?options.map(r=><button type="button" key={r.id} aria-pressed={r.linked} onClick={()=>onToggleRelation(r.id)}><span>{r.title}</span>{r.linked?<Check size={14}/>:<Plus size={14}/>}</button>):<p>Nenhuma entidade encontrada. Cadastre-a na aba correspondente.</p>}</div>
    </div>}
  </section>;
}

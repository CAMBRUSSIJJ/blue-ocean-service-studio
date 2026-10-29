import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowLeft, Check, Trash2 } from '../../design-system/icons';

type Props={
  kind:string; eyebrow:string; title:string; score:number;
  status:'saved'|'saving'|'error'|'invalid'; guidance?:string;
  onChangeTitle:(title:string)=>void; onBack:()=>void; onDelete:()=>void;
  properties:ReactNode;
};
export function EntityEditorHeader({kind,eyebrow,title,score,status,guidance,onChangeTitle,onBack,onDelete,properties}:Props){
 return <header className="bo-pain-editor-header bo-entity-editor-header">
   <button type="button" className="bo-pain-back" onClick={onBack}><ArrowLeft size={15}/> {kind}</button>
   <div className="bo-pain-title-row">
     <div className="bo-pain-title-wrap"><small>{eyebrow}</small>
       <textarea rows={1} aria-label={'Enunciado de '+kind} value={title} onChange={event=>onChangeTitle(event.target.value)} placeholder="Descreva o que está acontecendo"/>
     </div>
     <div className="bo-pain-header-actions">
       <span role="status" aria-live="polite" className={'bo-pain-save-status is-'+status}>
         {status==='error'?'Erro ao salvar':status==='invalid'?'Preencha o título':status==='saving'?'Salvando…':<><Check size={13}/> Salvo</>}
       </span>
       <div className="bo-pain-score" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label={'Completude de '+kind}>
         <strong>Força do perfil</strong><b>{score}%</b>
       </div>
       <button type="button" title={'Excluir '+kind} className="bo-pain-delete-top" onClick={onDelete}><Trash2 size={14}/> Excluir</button>
     </div>
   </div>
   {guidance&&<p className="bo-pain-hint" role="note">{guidance}</p>}
   <div className="bo-pain-properties">{properties}</div>
 </header>;
}
export function EntityTags({value,onChange}:{value:string;onChange:(value:string)=>void}){
 const [entry,setEntry]=useState('');
 const tags=value.split(',').map(x=>x.trim()).filter(Boolean);
 const add=()=>{
   const clean=entry.trim().replace(/,/g,'');
   if(clean&&!tags.some(x=>x.toLocaleLowerCase('pt-BR')===clean.toLocaleLowerCase('pt-BR')))onChange([...tags,clean].join(', '));
   setEntry('');
 };
 return <div className="bo-entity-tag-input" aria-label="Tags">
   <span>Tags:</span><div className="bo-entity-tag-list">
     {tags.map(tag=><span className="bo-entity-tag" key={tag}>{tag}<button type="button" aria-label={'Remover tag '+tag} onClick={()=>onChange(tags.filter(x=>x!==tag).join(', '))}>×</button></span>)}
     <input aria-label="Adicionar tag" value={entry} placeholder="+ Adicionar" onChange={e=>setEntry(e.target.value)}
       onKeyDown={e=>{if(e.key==='Enter'||e.key===','){e.preventDefault();add()}}} onBlur={add}/>
   </div>
 </div>;
}

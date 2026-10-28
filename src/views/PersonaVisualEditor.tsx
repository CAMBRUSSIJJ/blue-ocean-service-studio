import { useState } from 'react';
import {
  normalizePersonaVisualCards, personaVisualTemplate, switchPersonaDepth,
  type PersonaProfileDraft, type PersonaVisualCard,
  type PersonaVisualCardId, type PersonaVisualWidth,
} from '../services/persona-studio';

type Props = {
  draft: PersonaProfileDraft;
  onChange: (next: PersonaProfileDraft) => void;
  counts: { need: number; pain: number; evidence: number; related: number };
  legacyDefaultCards?: boolean;
  onNavigate: (tab: 'relations' | 'evidence') => void;
};
const OPTIONS: Array<{ id: PersonaVisualCardId; title: string; caption: string; advanced?: boolean }> = [
  {id:'identity',title:'Identidade',caption:'Nome e resumo'},
  {id:'portrait',title:'Imagem',caption:'Foto ilustrativa (URL HTTPS)'},
  {id:'bio',title:'Contexto',caption:'Cenário em que vive a experiência',advanced:true},
  {id:'goal',title:'Objetivo principal',caption:'Resultado esperado'},
  {id:'needs',title:'Necessidades',caption:'Relações com a pesquisa'},
  {id:'situation',title:'Situação',caption:'Momento de uso'},
  {id:'quote',title:'Citação',caption:'Frase representativa'},
  {id:'channels',title:'Canais',caption:'Pontos de interação'},
  {id:'behaviors',title:'Comportamentos',caption:'Hábitos observados',advanced:true},
  {id:'expectations',title:'Expectativas',caption:'Critérios de escolha',advanced:true},
  {id:'constraints',title:'Barreiras',caption:'Restrições e impedimentos',advanced:true},
  {id:'triggers',title:'Motivações',caption:'Gatilhos que iniciam a busca',advanced:true},
  {id:'alternatives',title:'Alternativas',caption:'Soluções atuais',advanced:true},
  {id:'evidence',title:'Evidências',caption:'Fontes conectadas'},
  {id:'relations',title:'Relações',caption:'Pessoas, dores e necessidades',advanced:true},
  {id:'scale',title:'Escala de preferência',caption:'Tendência observada (hipótese)',advanced:true},
];
const listFields = ['channels','behaviors','expectations','constraints','triggers','alternatives'] as const;
type ListField = typeof listFields[number];
function ListTextEditor({label,value,placeholder,onChange}: {label:string;value:string[];placeholder:string;onChange:(items:string[])=>void}) {
  // Keep trailing newlines while typing; normalized domain arrays alone cannot represent them.
  const [raw,setRaw]=useState(value.join('\n'));
  return <label className="bo-p5-field"><span>Um item por linha</span>
    <textarea aria-label={label} rows={3} value={raw} placeholder={placeholder}
      onChange={e=>{setRaw(e.target.value);onChange(e.target.value.split(/\n|,/).map(v=>v.trim()).filter(Boolean))}}/>
  </label>;
}

export function PersonaVisualEditor({draft,onChange,counts,onNavigate,legacyDefaultCards=false}: Props) {
  const [showLibrary,setShowLibrary]=useState(false);
  const [dragging,setDragging]=useState<PersonaVisualCardId|null>(null);
  const [revealed,setRevealed]=useState<PersonaVisualCardId[]>([]);
  const cards=normalizePersonaVisualCards(draft.visualCards,draft.mode);
  const update=(changes:Partial<PersonaProfileDraft>)=>onChange({...draft,...changes});
  const updateCards=(next:PersonaVisualCard[])=>update({visualCards:normalizePersonaVisualCards(next,draft.mode)});
  const move=(id:PersonaVisualCardId,to:PersonaVisualCardId)=>{
    if(id===to)return;
    const from=cards.findIndex(c=>c.id===id),target=cards.findIndex(c=>c.id===to);
    if(from<0||target<0)return;
    const next=[...cards], [card]=next.splice(from,1);
    next.splice(target,0,card);updateCards(next);
  };
  const step=(id:PersonaVisualCardId,diff:number)=>{
    const index=cards.findIndex(c=>c.id===id),target=index+diff;
    if(index<0||target<0||target>=cards.length)return;
    move(id,cards[target].id);
  };
  const add=(id:PersonaVisualCardId)=>{
    setRevealed(current=>current.includes(id)?current:[...current,id]);
    const nextCards=cards.some(card=>card.id===id)?cards:[...cards,{id,width:(id==='quote'?'full':'half') as PersonaVisualWidth}];
    const advanced=Boolean(OPTIONS.find(opt=>opt.id===id)?.advanced);
    const next=advanced&&draft.mode==='simple'?switchPersonaDepth(draft,'professional'):draft;
    const section=id!=='portrait'&&id!=='scale'?id:null;
    onChange({...next,sections:section&&!next.sections.includes(section)?[...next.sections,section]:next.sections,
      visualCards:normalizePersonaVisualCards(nextCards,next.mode)});
    setShowLibrary(false);
    window.setTimeout(()=>document.querySelector('[data-persona-visual-card="'+id+'"]')?.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
  };
  const setWidth=(id:PersonaVisualCardId,width:PersonaVisualWidth)=>updateCards(cards.map(c=>c.id===id?{...c,width}:c));
  const listField=(id:ListField,placeholder:string)=><ListTextEditor label={OPTIONS.find(o=>o.id===id)?.title??id}
    value={draft[id]} placeholder={placeholder} onChange={items=>update({[id]:items} as Partial<PersonaProfileDraft>)}/>;
  const textField=(key:'context'|'primaryGoal'|'situation'|'quote',label:string,placeholder:string)=><label className="bo-p5-field"><span>{label}</span>
    <textarea aria-label={label} rows={3} value={draft[key]} placeholder={placeholder} onChange={e=>update({[key]:e.target.value})}/></label>;
  const body=(id:PersonaVisualCardId)=>{
    if(id==='identity')return <div className="bo-p5-identity-body">
      <label className="bo-p5-field"><span>Resumo da Persona</span><textarea aria-label="Resumo da Persona" rows={3} value={draft.description} onChange={e=>update({description:e.target.value})} placeholder="Quem é essa pessoa neste serviço?"/></label>
    </div>;
    if(id==='portrait')return <div className="bo-p5-portrait">
      {draft.imageUrl&&<img src={draft.imageUrl} alt="Imagem ilustrativa da Persona" loading="lazy" referrerPolicy="no-referrer"/>}
      <label className="bo-p5-field"><span>Endereço da imagem (HTTPS)</span><input type="url" aria-label="URL da imagem" value={draft.imageUrl??''} placeholder="https://exemplo.com/foto.jpg" onChange={e=>update({imageUrl:e.target.value})}/></label>
      <small>Imagem externa opcional. Evite dados pessoais sem autorização.</small>
    </div>;
    if(id==='bio')return textField('context','Contexto','Onde e como essa pessoa vive a experiência?');
    if(id==='goal')return textField('primaryGoal','Objetivo','Que resultado procura alcançar?');
    if(id==='situation')return textField('situation','Situação de uso','Quando essa necessidade aparece?');
    if(id==='quote')return textField('quote','Frase representativa','“O que essa pessoa diria?”');
    if(id==='channels')return listField('channels','WhatsApp\nPresencial');
    if(id==='behaviors')return listField('behaviors','Compara alternativas antes de decidir');
    if(id==='expectations')return listField('expectations','Previsibilidade e confiança');
    if(id==='constraints')return listField('constraints','Falta de tempo\nPouca informação');
    if(id==='triggers')return listField('triggers','Precisa resolver o problema rapidamente');
    if(id==='alternatives')return listField('alternatives','Fazer por conta própria');
    if(id==='needs'||id==='relations')return <div className="bo-p5-related">
      <strong>{counts.need} necessidades · {counts.pain} dores</strong>
      <p>Conecte registros existentes da pesquisa. A Persona e os mapas usam os mesmos dados.</p>
      <button type="button" onClick={()=>onNavigate('relations')}>Abrir relações →</button>
    </div>;
    if(id==='evidence')return <div className="bo-p5-related">
      <strong>{counts.evidence} evidência(s) vinculada(s)</strong>
      <p>As hipóteses desta Persona só devem ser validadas com fontes de pesquisa.</p>
      <button type="button" onClick={()=>onNavigate('evidence')}>Abrir evidências →</button>
    </div>;
    if(id==='scale')return <div className="bo-p5-scale">
      <div className="bo-p5-scale-labels"><input aria-label="Polo esquerdo" maxLength={50} value={draft.scale?.left??'Autonomia'} onChange={e=>update({scale:{left:e.target.value,right:draft.scale?.right??'Orientação',value:draft.scale?.value??50}})}/>
        <input aria-label="Polo direito" maxLength={50} value={draft.scale?.right??'Orientação'} onChange={e=>update({scale:{left:draft.scale?.left??'Autonomia',right:e.target.value,value:draft.scale?.value??50}})}/></div>
      <input aria-label="Posição da escala de preferência" type="range" min={0} max={100} value={draft.scale?.value??50} onChange={e=>update({scale:{left:draft.scale?.left??'Autonomia',right:draft.scale?.right??'Orientação',value:Number(e.target.value)}})}/>
      <small>Hipótese visual, não diagnóstico. Registre evidências antes de utilizá-la em decisões.</small>
    </div>;
    return null;
  };
  const optional = new Set<PersonaVisualCardId>(['portrait','bio','needs','quote','channels','behaviors','expectations','constraints','triggers','alternatives','evidence','relations','scale']);
  const hasContent = (id:PersonaVisualCardId) => {
    if(id==='portrait')return Boolean(draft.imageUrl);
    if(id==='quote')return Boolean(draft.quote.trim());
    if(id==='bio')return Boolean(draft.context.trim());
    if(id==='channels'||id==='behaviors'||id==='expectations'||id==='constraints'||id==='triggers'||id==='alternatives')return draft[id].length>0;
    if(id==='needs')return counts.need>0;
    if(id==='evidence')return counts.evidence>0;
    if(id==='relations')return counts.related>0;
    return false;
  };
  const visibleCards=cards.filter(c=>!legacyDefaultCards||!optional.has(c.id)||hasContent(c.id)||revealed.includes(c.id));
  const available=OPTIONS.filter(x=>!visibleCards.some(c=>c.id===x.id));
  return <div className="bo-p5-editor" data-persona-visual-editor="1">
    <header className="bo-p5-toolbar">
      <div><span>PERFIL EDITÁVEL</span><h2>Edite diretamente no perfil</h2><p>O essencial já está à vista. Acrescente outros blocos à medida que precisar.</p></div>
      <div className="bo-p5-toolbar-actions">
        <div className="bo-p5-template-actions" role="group" aria-label="Modelos de composição">
          <button type="button" onClick={()=>updateCards(personaVisualTemplate('essential'))}>Modelo essencial</button>
          <button type="button" onClick={()=>updateCards(personaVisualTemplate('research'))}>Modelo pesquisa</button>
        </div>
        <button type="button" className="bo-p5-add-button" aria-expanded={showLibrary} aria-controls="bo-p5-library" onClick={()=>setShowLibrary(v=>!v)}>+ Adicionar bloco</button>
      </div>
    </header>
    <section className="bo-p6-live-profile" aria-label="Pré-visualização ao vivo da Persona">
      <div className="bo-p6-live-person"><span className="bo-p6-person-avatar">{draft.imageUrl ? <img src={draft.imageUrl} alt="Retrato ilustrativo" loading="lazy"/> : (draft.title.trim().slice(0,1).toUpperCase()||'P')}</span>
        <div><small>PERSONA EM CONSTRUÇÃO</small><h3>{draft.title.trim()||'Persona sem nome'}</h3><p>{draft.description.trim()||'O resumo aparecerá aqui enquanto você escreve.'}</p></div>
      </div>
      <div className="bo-p6-live-details">
        <div><small>OBJETIVO</small><p className={draft.primaryGoal.trim()?'':'is-ghost'}>{draft.primaryGoal.trim()||'Qual resultado esta pessoa procura?'}</p></div>
        <div><small>SITUAÇÃO</small><p className={draft.situation.trim()?'':'is-ghost'}>{draft.situation.trim()||'Quando essa experiência acontece?'}</p></div>
      </div>
      {draft.channels.length>0 && <div className="bo-p6-live-channels">{draft.channels.slice(0,5).map(channel=><span key={channel}>{channel}</span>)}</div>}
    </section>
    {showLibrary&&<section className="bo-p5-library" id="bo-p5-library" aria-label="Biblioteca de blocos">
      <div><strong>Adicionar à composição</strong><button type="button" onClick={()=>setShowLibrary(false)} aria-label="Fechar biblioteca de blocos">×</button></div>
      <p>Os blocos aproveitam o perfil existente. Ocultá-los não apaga suas informações.</p>
      {available.length?<div className="bo-p5-library-grid">{available.map(opt=><button key={opt.id} type="button" onClick={()=>add(opt.id)}><strong>+ {opt.title}</strong><small>{opt.caption}</small></button>)}</div>:<p>Todos os blocos disponíveis já estão na composição.</p>}
    </section>}
    <div className={`bo-p5-grid bo-p5-layout-${draft.layout}`} aria-label="Cartões da Persona">
      {visibleCards.map((card,index)=>{
        const meta=OPTIONS.find(x=>x.id===card.id);
        if(!meta)return null;
        return <section key={card.id} className={`bo-p5-card bo-p5-card--${card.width} ${dragging===card.id?'is-dragging':''}`}
          data-persona-visual-card={card.id} data-width={card.width}
          onDragOver={e=>{if(dragging&&dragging!==card.id)e.preventDefault()}}
          onDrop={e=>{e.preventDefault();if(dragging)move(dragging,card.id);setDragging(null)}}>
          <header className="bo-p5-card-head">
            <span className="bo-p5-drag-handle" draggable tabIndex={0} aria-label={`Arrastar bloco ${meta.title}`} title="Arraste para reorganizar"
              onDragStart={e=>{setDragging(card.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',card.id)}} onDragEnd={()=>setDragging(null)}>⠿</span>
            <div><small>{meta.caption}</small><h3>{card.id==='identity'?'Resumo':meta.title}</h3></div>
            <details className="bo-p6-card-menu"><summary aria-label={`Opções do bloco ${meta.title}`} title="Opções do bloco">⋯</summary><div>
               <button type="button" disabled={index===0} onClick={e=>{step(card.id,-1);e.currentTarget.closest('details')!.open=false}}>Mover para cima</button>
               <button type="button" disabled={index===visibleCards.length-1} onClick={e=>{step(card.id,1);e.currentTarget.closest('details')!.open=false}}>Mover para baixo</button>
               <button type="button" onClick={e=>{setWidth(card.id,card.width==='full'?'half':'full');e.currentTarget.closest('details')!.open=false}}>Alterar largura</button>
               {card.id!=='identity' && <button type="button" onClick={e=>{updateCards(cards.filter(c=>c.id!==card.id));setRevealed(old=>old.filter(id=>id!==card.id));e.currentTarget.closest('details')!.open=false}}>Ocultar bloco</button>}
             </div></details>
          </header>
          <div className="bo-p5-card-content">{body(card.id)}</div>
        </section>;
      })}
    </div>
    <p className="bo-p5-hint">Arraste pela alça ⠿ ou use ⋯ para mover, ajustar largura ou ocultar. As alterações são salvas automaticamente neste dispositivo.</p>
  </div>;
}

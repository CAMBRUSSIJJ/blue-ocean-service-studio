import { useState } from 'react';
import {
  normalizePersonaVisualCards, personaVisualTemplate,
  type PersonaDepth, type PersonaProfileDraft, type PersonaVisualCard,
  type PersonaVisualCardId, type PersonaVisualWidth,
} from '../services/persona-studio';

type Props = {
  draft: PersonaProfileDraft;
  onChange: (next: PersonaProfileDraft) => void;
  onChangeMode: (mode: PersonaDepth) => void;
  counts: { need: number; pain: number; evidence: number; related: number };
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

export function PersonaVisualEditor({draft,onChange,onChangeMode,counts,onNavigate}: Props) {
  const [showLibrary,setShowLibrary]=useState(false);
  const [dragging,setDragging]=useState<PersonaVisualCardId|null>(null);
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
    if(cards.some(card=>card.id===id))return;
    const section = id !== 'portrait' && id !== 'scale' ? id : null;
    onChange({...draft,sections:section&&!draft.sections.includes(section)?[...draft.sections,section]:draft.sections,
      visualCards:normalizePersonaVisualCards([...cards,{id,width:id==='quote'?'full':'half'}],draft.mode)});
    setShowLibrary(false);
  };
  const setWidth=(id:PersonaVisualCardId,width:PersonaVisualWidth)=>updateCards(cards.map(c=>c.id===id?{...c,width}:c));
  const listField=(id:ListField,placeholder:string)=><ListTextEditor label={OPTIONS.find(o=>o.id===id)?.title??id}
    value={draft[id]} placeholder={placeholder} onChange={items=>update({[id]:items} as Partial<PersonaProfileDraft>)}/>;
  const textField=(key:'context'|'primaryGoal'|'situation'|'quote',label:string,placeholder:string)=><label className="bo-p5-field"><span>{label}</span>
    <textarea aria-label={label} rows={3} value={draft[key]} placeholder={placeholder} onChange={e=>update({[key]:e.target.value})}/></label>;
  const body=(id:PersonaVisualCardId)=>{
    if(id==='identity')return <div className="bo-p5-identity-body">
      <div className="bo-p5-mode-switch bo-h724-depth-switch" role="group" aria-label="Profundidade da Persona">
        <button type="button" aria-pressed={draft.mode==='simple'} onClick={()=>onChangeMode('simple')}>Simples</button>
        <button type="button" aria-pressed={draft.mode==='professional'} onClick={()=>onChangeMode('professional')}>Avançada</button>
      </div>
      <label className="bo-p5-field"><span>Nome da Persona</span><input aria-label="Nome da Persona" value={draft.title} onChange={e=>update({title:e.target.value})} placeholder="Ex.: Cliente com pouco tempo"/></label>
      <label className="bo-p5-field"><span>Resumo</span><textarea aria-label="Resumo da Persona" rows={2} value={draft.description} onChange={e=>update({description:e.target.value})} placeholder="Quem é a pessoa neste serviço?"/></label>
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
  const available=OPTIONS.filter(x=>!cards.some(c=>c.id===x.id)&&(!x.advanced||draft.mode==='professional'));
  return <div className="bo-p5-editor" data-persona-visual-editor="1">
    <header className="bo-p5-toolbar">
      <div><span>PERSONA VISUAL</span><h2>Composição do perfil</h2><p>Organize as informações como cartões. A edição acontece diretamente no quadro.</p></div>
      <div className="bo-p5-toolbar-actions">
        <div className="bo-p5-template-actions" role="group" aria-label="Modelos de composição">
          <button type="button" onClick={()=>updateCards(personaVisualTemplate('essential'))}>Modelo essencial</button>
          <button type="button" onClick={()=>updateCards(personaVisualTemplate('research'))}>Modelo pesquisa</button>
        </div>
        <button type="button" className="bo-p5-add-button" aria-expanded={showLibrary} aria-controls="bo-p5-library" onClick={()=>setShowLibrary(v=>!v)}>+ Adicionar bloco</button>
      </div>
    </header>
    {showLibrary&&<section className="bo-p5-library" id="bo-p5-library" aria-label="Biblioteca de blocos">
      <div><strong>Adicionar à composição</strong><button type="button" onClick={()=>setShowLibrary(false)} aria-label="Fechar biblioteca de blocos">×</button></div>
      <p>Os blocos aproveitam o perfil existente. Ocultá-los não apaga suas informações.</p>
      {available.length?<div className="bo-p5-library-grid">{available.map(opt=><button key={opt.id} type="button" onClick={()=>add(opt.id)}><strong>+ {opt.title}</strong><small>{opt.caption}</small></button>)}</div>:<p>Todos os blocos disponíveis já estão na composição.</p>}
    </section>}
    <div className={`bo-p5-grid bo-p5-layout-${draft.layout}`} aria-label="Cartões da Persona">
      {cards.filter(c=>c.id==='identity'||draft.mode==='professional'||!OPTIONS.find(o=>o.id===c.id)?.advanced).map((card,index)=>{
        const meta=OPTIONS.find(x=>x.id===card.id);
        if(!meta)return null;
        return <section key={card.id} className={`bo-p5-card bo-p5-card--${card.width} ${dragging===card.id?'is-dragging':''}`}
          data-persona-visual-card={card.id} data-width={card.width}
          onDragOver={e=>{if(dragging&&dragging!==card.id)e.preventDefault()}}
          onDrop={e=>{e.preventDefault();if(dragging)move(dragging,card.id);setDragging(null)}}>
          <header className="bo-p5-card-head">
            <span className="bo-p5-drag-handle" draggable tabIndex={0} aria-label={`Arrastar bloco ${meta.title}`} title="Arraste para reorganizar"
              onDragStart={e=>{setDragging(card.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',card.id)}} onDragEnd={()=>setDragging(null)}>⠿</span>
            <div><small>{meta.caption}</small><h3>{meta.title}</h3></div>
            <div className="bo-p5-card-actions" role="group" aria-label={`Ações do bloco ${meta.title}`}>
              <button type="button" title="Mover para cima" aria-label={`Mover ${meta.title} para cima`} onClick={()=>step(card.id,-1)} disabled={index===0}>↑</button>
              <button type="button" title="Mover para baixo" aria-label={`Mover ${meta.title} para baixo`} onClick={()=>step(card.id,1)} disabled={index===cards.length-1}>↓</button>
              <button type="button" title="Alternar largura" aria-label={`Alternar largura de ${meta.title}`} onClick={()=>setWidth(card.id,card.width==='full'?'half':'full')}>{card.width==='full'?'½':'↔'}</button>
              {card.id!=='identity'&&<button type="button" title="Ocultar sem excluir os dados" aria-label={`Ocultar bloco ${meta.title}`} onClick={()=>updateCards(cards.filter(c=>c.id!==card.id))}>×</button>}
            </div>
          </header>
          <div className="bo-p5-card-content">{body(card.id)}</div>
        </section>;
      })}
    </div>
    <p className="bo-p5-hint">Arraste pela alça ⠿ ou use as setas ↑ ↓. Alterações na composição são salvas junto com a Persona pelo botão “Salvar alterações”.</p>
  </div>;
}

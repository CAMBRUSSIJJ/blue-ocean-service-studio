import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus } from '../design-system/icons';
import type { PersonaProfileDraft } from '../services/persona-studio';

type StepId = 'identity' | 'goal' | 'situation' | 'channels';
type Props = {
  draft: PersonaProfileDraft;
  onChange: (next: PersonaProfileDraft) => void;
  onAddBlock: () => void;
  onAdvanced: () => void;
  onNavigate: (tab: 'relations' | 'evidence' | 'usage') => void;
};

const STEPS: Array<{ id: StepId; label: string; title: string; hint: string }> = [
  { id: 'identity', label: 'Identidade', title: 'Quem é esta pessoa?', hint: 'Nome e resumo são suficientes para começar. Descreva o que já sabe sem inventar informações.' },
  { id: 'goal', label: 'Objetivo', title: 'Objetivo principal', hint: 'Descreva o resultado que esta pessoa espera alcançar com o serviço, não o processo.' },
  { id: 'situation', label: 'Situação', title: 'Situação de uso', hint: 'Em que momento, contexto ou ambiente ela recorre ao serviço?' },
  { id: 'channels', label: 'Canais', title: 'Canais de contato', hint: 'Onde ela encontra ou utiliza o serviço? Um canal por linha.' },
];

export function PersonaProgressiveEditor({ draft, onChange, onAddBlock, onAdvanced, onNavigate }: Props) {
  const [step, setStep] = useState(0);
  const [channelsInput, setChannelsInput] = useState(draft.channels.join('\n'));
  const current = STEPS[step];
  const filled: Record<StepId, boolean> = {
    identity: Boolean(draft.title.trim()),
    goal: Boolean(draft.primaryGoal.trim()),
    situation: Boolean(draft.situation.trim()),
    channels: draft.channels.length > 0,
  };
  const update = (field: keyof PersonaProfileDraft, value: string) => onChange({ ...draft, [field]: value });
  const changeChannels = (text: string) => {
    setChannelsInput(text);
    onChange({ ...draft, channels: [...new Set(text.split(/[\n,]/).map(item => item.trim()).filter(Boolean))] });
  };
  return <section className="bo-h746-guided" data-persona-progressive-editor="1" aria-label="Edição progressiva da Persona">
    <header className="bo-h746-guided-head">
      <div><small>PERFIL DA PERSONA</small><h2>Construa aos poucos</h2><p>Escolha uma etapa. Não é necessário preencher tudo para relacionar ou utilizar esta Persona.</p></div>
      <button type="button" className="bo-h746-text-button" onClick={onAdvanced}>Editar blocos <ArrowRight size={14}/></button>
    </header>
    <nav className="bo-h746-steps" aria-label="Etapas do perfil">
      {STEPS.map((item, index) => <button key={item.id} type="button" aria-current={index === step ? 'step' : undefined}
        className={index === step ? 'is-current' : filled[item.id] ? 'is-complete' : ''} onClick={() => setStep(index)}>
        <span className="bo-h746-step-num">{filled[item.id] ? <Check size={12}/> : index + 1}</span><span>{item.label}</span>
      </button>)}
    </nav>
    <div className="bo-h746-block" data-persona-step={current.id}>
      <div className="bo-h746-block-top"><small>{String(step + 1).padStart(2, '0')} / 04 · {current.label.toUpperCase()}</small><h3>{current.title}</h3><p>{current.hint}</p></div>
      {current.id === 'identity' && <div className="bo-h746-inputs">
        <label><span>Nome da Persona</span><input aria-label="Nome da Persona" value={draft.title} maxLength={140}
          onChange={(event) => update('title', event.target.value)} placeholder="Ex.: Maria — cliente recorrente"/></label>
        <label><span>Quem é esta pessoa? <em>(opcional)</em></span><textarea aria-label="Resumo da Persona" rows={4} value={draft.description}
          onChange={(event) => update('description', event.target.value)} placeholder="Descreva brevemente o perfil e o contexto do serviço."/></label>
      </div>}
      {current.id === 'goal' && <label className="bo-h746-inputs"><span>Resultado esperado</span><textarea aria-label="Objetivo principal" rows={5}
        value={draft.primaryGoal} onChange={(event) => update('primaryGoal', event.target.value)}
        placeholder="Que resultado essa pessoa quer alcançar usando o serviço?"/></label>}
      {current.id === 'situation' && <label className="bo-h746-inputs"><span>Momento de uso</span><textarea aria-label="Situação de uso" rows={5}
        value={draft.situation} onChange={(event) => update('situation', event.target.value)}
        placeholder="Quando e onde essa necessidade aparece?"/></label>}
      {current.id === 'channels' && <label className="bo-h746-inputs"><span>Pontos de interação</span><textarea aria-label="Canais de contato" rows={5}
        value={channelsInput} onChange={(event) => changeChannels(event.target.value)}
        placeholder={'WhatsApp\nPresencial\nSite'}/></label>}
    </div>
    <div className="bo-h746-block-actions">
      <button type="button" className="bo-h746-add" onClick={onAddBlock}><Plus size={15}/> Adicionar bloco</button>
      <div>
        {step > 0 && <button type="button" onClick={() => setStep(value => value - 1)}><ArrowLeft size={14}/> Anterior</button>}
        {step < STEPS.length - 1
          ? <button type="button" className="primary" onClick={() => setStep(value => value + 1)}>Próximo <ArrowRight size={14}/></button>
          : <button type="button" className="primary" onClick={() => onNavigate('relations')}>Continuar para relações <ArrowRight size={14}/></button>}
      </div>
    </div>

  </section>;
}

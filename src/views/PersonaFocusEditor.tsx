import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from '../design-system/icons';
import type { PersonaProfileDraft } from '../services/persona-studio';

type Props = {
  draft: PersonaProfileDraft;
  onChange: (draft: PersonaProfileDraft) => void;
  onExit: () => void;
  onSaveAndExit: () => void;
};

const stages = [
  { label: 'Identidade', title: 'Quem é esta pessoa?', help: 'Comece pelo que já conhece. As informações podem ser aprofundadas depois.' },
  { label: 'Objetivo', title: 'Objetivo principal', help: 'Qual resultado essa pessoa espera alcançar com o serviço?' },
  { label: 'Situação', title: 'Situação de uso', help: 'Em que momento e contexto ela recorre ao serviço?' },
  { label: 'Canais', title: 'Canais de contato', help: 'Por onde ela encontra, procura ou utiliza o serviço?' },
] as const;

export function PersonaFocusEditor({ draft, onChange, onExit, onSaveAndExit }: Props) {
  const [step, setStep] = useState(0);
  const [channelText, setChannelText] = useState(() => draft.channels.join('\n'));
  const cardRef = useRef<HTMLElement>(null);
  const firstFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const current = stages[step];
  const changeText = (field: 'title' | 'description' | 'primaryGoal' | 'situation' | 'context', value: string) =>
    onChange({ ...draft, [field]: value });

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    firstFieldRef.current?.focus();
    return () => { document.body.style.overflow = originalOverflow; previous?.focus(); };
  }, []);

  useEffect(() => { firstFieldRef.current?.focus(); }, [step]);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); onExit(); return; }
    if (event.key !== 'Tab') return;
    const items = Array.from(cardRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex="0"]'
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    if (!items.length) return;
    if (event.shiftKey && document.activeElement === items[0]) {
      event.preventDefault(); items[items.length - 1].focus();
    } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
      event.preventDefault(); items[0].focus();
    }
  };

  const updateChannels = (value: string) => {
    setChannelText(value);
    onChange({ ...draft, channels: [...new Set(value.split(/[\n,]/).map(item => item.trim()).filter(Boolean))] });
  };

  return createPortal(
    <div className="bo-h750-focus-backdrop" data-persona-focus="1">
      <section ref={cardRef} className="bo-h750-focus-card" role="dialog" aria-modal="true" aria-labelledby="bo-h750-focus-title" aria-describedby="bo-h750-focus-description" onKeyDown={handleKeyDown}>
        <header className="bo-h750-focus-header">
          <div className="bo-h750-focus-titlebar">
            <button type="button" aria-label="Voltar à edição completa" title="Voltar à edição completa" onClick={onExit}><ArrowLeft size={20}/></button>
            <h1 id="bo-h750-focus-title">{draft.title.trim() || 'Nova Persona'}</h1>
            <button type="button" aria-label="Salvar e sair do modo foco" title="Salvar e sair" onClick={onSaveAndExit} disabled={!draft.title.trim()}><X size={19}/></button>
          </div>
          <div className="bo-h750-focus-progress" aria-label={`Passo ${step + 1} de 4: ${current.label}`}>
            <span>Passo {step + 1} de 4: {current.label}</span>
            <div className="bo-h750-focus-progress-track" aria-hidden="true">{stages.map((stage, index) =>
              <i key={stage.label} className={index <= step ? 'is-active' : ''}/>)}</div>
          </div>
        </header>
        <div className="bo-h750-focus-body">
          <div className="bo-h750-focus-intro">
            <h2>{current.title}</h2>
            <p id="bo-h750-focus-description">{current.help}</p>
          </div>
          {step === 0 && <div className="bo-h750-focus-fields">
            <label htmlFor="bo-h750-name">Nome da Persona</label>
            <input ref={(element) => { firstFieldRef.current = element; }} id="bo-h750-name" type="text" maxLength={140} value={draft.title}
              onChange={event => changeText('title', event.target.value)} placeholder="Ex.: Maria — cliente recorrente"/>
            <label htmlFor="bo-h750-description">Quem é esta pessoa? <em>(opcional)</em></label>
            <textarea id="bo-h750-description" rows={4} value={draft.description}
              onChange={event => changeText('description', event.target.value)} placeholder="Descreva brevemente o perfil e o contexto do serviço."/>
          </div>}
          {step === 1 && <div className="bo-h750-focus-fields">
            <label htmlFor="bo-h750-goal">Resultado esperado</label>
            <textarea ref={(element) => { firstFieldRef.current = element; }} id="bo-h750-goal" rows={6} value={draft.primaryGoal}
              onChange={event => changeText('primaryGoal', event.target.value)} placeholder="Que resultado essa pessoa quer alcançar usando o serviço?"/>
          </div>}
          {step === 2 && <div className="bo-h750-focus-fields">
            <label htmlFor="bo-h750-situation">Momento de uso</label>
            <textarea ref={(element) => { firstFieldRef.current = element; }} id="bo-h750-situation" rows={4} value={draft.situation}
              onChange={event => changeText('situation', event.target.value)} placeholder="Ex.: Procura atendimento quando surge uma necessidade inesperada."/>
            <label htmlFor="bo-h750-context">Contexto e ambiente</label>
            <textarea id="bo-h750-context" rows={4} value={draft.context}
              onChange={event => changeText('context', event.target.value)} placeholder="Ex.: Está no trabalho, com pouco tempo e acesso pelo celular."/>
          </div>}
          {step === 3 && <div className="bo-h750-focus-fields">
            <label htmlFor="bo-h750-channels">Canais de contato <em>(um por linha)</em></label>
            <textarea ref={(element) => { firstFieldRef.current = element; }} id="bo-h750-channels" rows={7} value={channelText}
              onChange={event => updateChannels(event.target.value)} placeholder={'WhatsApp\nAtendimento presencial\nSite'}/>
            <p className="bo-h750-focus-note">Estes canais são registrados no perfil. Os vínculos com elementos do serviço são feitos na aba Relações.</p>
          </div>}
        </div>
        <footer className="bo-h750-focus-footer">
          <button type="button" onClick={() => step === 0 ? onExit() : setStep(value => value - 1)}>
            {step === 0 ? 'Voltar ao perfil' : 'Anterior'}
          </button>
          {step < stages.length - 1
            ? <button type="button" className="primary" onClick={() => setStep(value => value + 1)}>Próximo <ArrowRight size={15}/></button>
            : <button type="button" className="primary" onClick={onSaveAndExit} disabled={!draft.title.trim()}>Salvar e concluir <ArrowRight size={15}/></button>}
        </footer>
      </section>
    </div>,
    document.body
  );
}

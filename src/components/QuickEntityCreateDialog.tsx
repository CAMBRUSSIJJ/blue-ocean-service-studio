import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from '../design-system/icons';
import { parseQuickEntityInput, type QuickEntityKind } from '../services/quick-entity-input';
import './quick-entity-create.css';

type Props = {
  kind: QuickEntityKind;
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onCreate: (title: string, context: string) => void;
};

const copy: Record<QuickEntityKind, { title: string; label: string; placeholder: string; help: string }> = {
  persona: {
    title: 'Criar Persona',
    label: 'Quem é esta pessoa?',
    placeholder: 'Ex.: Marcos, gerente de loja que precisa reduzir o tempo de atendimento',
    help: 'Digite só o nome, ou separe o contexto por vírgula. Você poderá editar diretamente no perfil.',
  },
  need: {
    title: 'Criar Necessidade',
    label: 'O que a pessoa precisa?',
    placeholder: 'Ex.: Resolver uma solicitação sem repetir informações',
    help: 'Registre uma necessidade, não uma solução. Detalhes e vínculos podem ser adicionados depois.',
  },
  job: {
    title: 'Criar Job',
    label: 'Que progresso a pessoa busca?',
    placeholder: 'Ex.: Fazer a compra sem interromper a rotina',
    help: 'Escreva o progresso esperado. Contexto e evidências poderão ser vinculados no editor.',
  },
};

export function QuickEntityCreateDialog({ kind, value, onChange, onClose, onCreate }: Props) {
  const [attempted, setAttempted] = useState(false);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    fieldRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const info = copy[kind];
  const parsed = parseQuickEntityInput(value, kind);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAttempted(true);
    if (!parsed.title) { fieldRef.current?.focus(); return; }
    onCreate(parsed.title, parsed.context);
  };
  return <div className="bo-qe-overlay" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className="bo-qe-dialog" role="dialog" aria-modal="true" aria-labelledby="bo-qe-title" onSubmit={submit}>
      <header><div><small>CRIAÇÃO RÁPIDA</small><h2 id="bo-qe-title">{info.title}</h2></div>
        <button type="button" aria-label="Fechar criação" onClick={onClose}><X size={18}/></button></header>
      <label htmlFor="bo-qe-field">{info.label}</label>
      <textarea ref={fieldRef} id="bo-qe-field" aria-invalid={attempted && !parsed.title} aria-describedby="bo-qe-help bo-qe-error"
        value={value} onChange={e => { onChange(e.target.value); if (attempted) setAttempted(false); }}
        rows={2} maxLength={2200} placeholder={info.placeholder}/>
      <p id="bo-qe-help">{info.help}</p>
      {attempted && !parsed.title && <p id="bo-qe-error" className="bo-qe-error" role="alert">Informe um nome ou uma frase antes de criar.</p>}
      {kind === 'persona' && parsed.context && <div className="bo-qe-parsed"><span>Nome</span><strong>{parsed.title}</strong><span>Contexto informado</span><p>{parsed.context}</p></div>}
      <footer><button type="button" onClick={onClose}>Cancelar</button><button type="submit" className="primary">Criar e editar</button></footer>
    </form>
  </div>;
}

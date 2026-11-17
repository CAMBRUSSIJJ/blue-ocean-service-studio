import React, { useState, useRef, useEffect } from 'react';
import { X, ArrowRight, Map, LayoutDashboard, Sparkles } from '../design-system/icons';
import { BlueOceanObjectIcon } from '../design-system/blue-ocean-objects';

export type OnboardingAction = 'journey' | 'personas' | 'home';

interface OnboardingFlowProps {
  onCreateService: (name: string, description?: string) => boolean;
  onLoadDemo: () => boolean;
  onNavigate: (action: OnboardingAction) => void;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

const FEATURES = [
  { icon: <Map size={16} />, label: 'Jornadas do cliente', desc: 'Mapeie cada passo da experiência do serviço.' },
  { icon: <BlueOceanObjectIcon kind="persona" size={16} />, label: 'Personas e contexto', desc: 'Conecte quem usa ao que você está desenhando.' },
  { icon: <BlueOceanObjectIcon kind="journey" size={16} />, label: 'Blueprint de serviço', desc: 'Frontstage, backstage e processos em uma visão.' },
];

const FIRST_ACTIONS: { action: OnboardingAction; icon: React.ReactNode; title: string; description: string }[] = [
  {
    action: 'journey',
    icon: <BlueOceanObjectIcon kind="journey" size={22} />,
    title: 'Criar a jornada',
    description: 'Comece pelo fluxo da experiência do cliente etapa a etapa.',
  },
  {
    action: 'personas',
    icon: <BlueOceanObjectIcon kind="persona" size={22} />,
    title: 'Definir o público',
    description: 'Adicione personas, necessidades e dores antes de mapear.',
  },
  {
    action: 'home',
    icon: <LayoutDashboard size={22} />,
    title: 'Explorar o workspace',
    description: 'Veja tudo o que está disponível no painel principal.',
  },
];

export function OnboardingFlow({ onCreateService, onLoadDemo, onNavigate, onClose }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 2) {
      const timer = window.setTimeout(() => nameInputRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
  }, [step]);

  const handleCreateService = () => {
    if (!serviceName.trim()) {
      nameInputRef.current?.focus();
      return;
    }
    const ok = onCreateService(serviceName.trim(), serviceDescription.trim());
    if (ok) setStep(3);
  };

  const handleUseDemo = () => {
    onLoadDemo();
    setIsDemo(true);
    setStep(3);
  };

  const handleFirstAction = (action: OnboardingAction) => {
    onNavigate(action);
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div
      className="bo-onboarding-backdrop"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleSkip(); }}
    >
      <section
        className="bo-onboarding-card"
        role="dialog"
        aria-modal="true"
        aria-label={step === 1 ? 'Bem-vindo ao Blue Ocean Service Studio' : step === 2 ? 'Criar primeiro serviço' : 'Próximo passo'}
      >
        {/* Header */}
        <div className="bo-onboarding-header">
          <div className="bo-onboarding-brand">
            <div className="bo-onboarding-brand__mark">
              <img src="/blue-ocean-mark.svg" alt="" aria-hidden="true" />
            </div>
            <div>
              <span className="bo-onboarding-brand__label">BLUE OCEAN</span>
              <span className="bo-onboarding-brand__sub">Service Studio</span>
            </div>
          </div>
          <div className="bo-onboarding-steps" aria-label={`Passo ${step} de 3`}>
            {([1, 2, 3] as Step[]).map((s) => (
              <span
                key={s}
                className={`bo-onboarding-steps__dot ${s === step ? 'is-active' : s < step ? 'is-done' : ''}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <button
            type="button"
            className="bo-onboarding-close"
            onClick={handleSkip}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="bo-onboarding-body">
          {step === 1 && (
            <div className="bo-onboarding-step bo-onboarding-step--welcome">
              <div className="bo-onboarding-step__eyebrow">
                <Sparkles size={14} /> Bem-vindo(a)
              </div>
              <h2 className="bo-onboarding-step__title">
                Desenhe, valide e melhore seu serviço
              </h2>
              <p className="bo-onboarding-step__subtitle">
                O Blue Ocean Service Studio conecta tudo que você precisa para entender
                seu cliente e construir serviços melhores — em um só lugar.
              </p>
              <div className="bo-onboarding-features">
                {FEATURES.map((f) => (
                  <div key={f.label} className="bo-onboarding-feature">
                    <span className="bo-onboarding-feature__icon">{f.icon}</span>
                    <div>
                      <strong>{f.label}</strong>
                      <small>{f.desc}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="bo-onboarding-step bo-onboarding-step--create">
              <div className="bo-onboarding-step__eyebrow">
                <BlueOceanObjectIcon kind="service" size={14} /> Criar serviço
              </div>
              <h2 className="bo-onboarding-step__title">
                Qual serviço você quer desenhar?
              </h2>
              <p className="bo-onboarding-step__subtitle">
                Personas, jornadas, blueprints e métricas ficarão conectados a esta base.
              </p>
              <div className="bo-onboarding-form">
                <label className="bo-onboarding-label">
                  <span>Nome do serviço</span>
                  <input
                    ref={nameInputRef}
                    type="text"
                    className="bo-onboarding-input"
                    placeholder="Ex.: Coleta e entrega de lavanderia"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && serviceName.trim()) handleCreateService(); }}
                    maxLength={120}
                  />
                </label>
                <label className="bo-onboarding-label">
                  <span>Descrição <em className="bo-onboarding-label__opt">opcional</em></span>
                  <textarea
                    className="bo-onboarding-textarea"
                    placeholder="Qual experiência ou operação este serviço entrega?"
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                </label>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bo-onboarding-step bo-onboarding-step--done">
              <div className="bo-onboarding-step__eyebrow is-success">
                <span>✓</span> {isDemo ? 'Exemplo carregado!' : 'Serviço criado!'}
              </div>
              <h2 className="bo-onboarding-step__title">
                {isDemo
                  ? 'Explore um serviço completo de exemplo'
                  : `"${serviceName}" está pronto para começar`}
              </h2>
              <p className="bo-onboarding-step__subtitle">
                Por onde você quer começar?
              </p>
              <div className="bo-onboarding-actions">
                {FIRST_ACTIONS.map(({ action, icon, title, description }) => (
                  <button
                    type="button"
                    key={action}
                    className="bo-onboarding-action-card"
                    onClick={() => handleFirstAction(action)}
                  >
                    <span className="bo-onboarding-action-card__icon">{icon}</span>
                    <span className="bo-onboarding-action-card__copy">
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>
                    <ArrowRight size={16} className="bo-onboarding-action-card__arrow" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bo-onboarding-footer">
          {step === 1 && (
            <>
              <button type="button" className="bo-onboarding-btn-secondary" onClick={handleUseDemo}>
                Explorar com exemplo
              </button>
              <button type="button" className="bo-onboarding-btn-primary" onClick={() => setStep(2)}>
                Criar meu serviço <ArrowRight size={15} />
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button type="button" className="bo-onboarding-btn-ghost" onClick={() => setStep(1)}>
                Voltar
              </button>
              <button
                type="button"
                className="bo-onboarding-btn-primary"
                disabled={!serviceName.trim()}
                onClick={handleCreateService}
              >
                Criar serviço <ArrowRight size={15} />
              </button>
            </>
          )}
          {step === 3 && (
            <button type="button" className="bo-onboarding-btn-ghost" onClick={handleSkip}>
              Ir para o workspace
            </button>
          )}
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: ONBOARDING_STYLES }} />
    </div>
  );
}

const ONBOARDING_STYLES = `
/* ── Onboarding Flow ─────────────────────────────────────────────────── */
.bo-onboarding-backdrop {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1rem;
  animation: bo-onboarding-fade-in 220ms ease both;
}
@keyframes bo-onboarding-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

.bo-onboarding-card {
  width: 100%; max-width: 520px;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 24px 64px -12px rgba(15,23,42,.28), 0 2px 8px rgba(15,23,42,.08);
  overflow: hidden;
  animation: bo-onboarding-slide-up 260ms cubic-bezier(.22,1,.36,1) both;
}
@keyframes bo-onboarding-slide-up {
  from { opacity: 0; transform: translateY(16px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

/* Header */
.bo-onboarding-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%);
}
.bo-onboarding-brand {
  display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0;
}
.bo-onboarding-brand__mark {
  background: rgba(255,255,255,.18); border-radius: 8px; padding: 7px; flex-shrink: 0;
  display: flex; align-items: center;
}
.bo-onboarding-brand__mark img { height: 20px; width: 20px; }
.bo-onboarding-brand__label {
  display: block; font-size: 12px; font-weight: 800; color: #fff;
  letter-spacing: .08em; line-height: 1.2;
}
.bo-onboarding-brand__sub {
  display: block; font-size: 10px; font-weight: 600; color: rgba(255,255,255,.65);
  letter-spacing: .1em; text-transform: uppercase;
}
.bo-onboarding-steps {
  display: flex; gap: 6px; align-items: center; flex-shrink: 0;
}
.bo-onboarding-steps__dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(255,255,255,.25);
  transition: background 200ms, transform 200ms;
}
.bo-onboarding-steps__dot.is-active { background: #fff; transform: scale(1.3); }
.bo-onboarding-steps__dot.is-done  { background: rgba(255,255,255,.65); }

.bo-onboarding-close {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px;
  color: rgba(255,255,255,.65); background: transparent; border: none; cursor: pointer;
  transition: background 150ms, color 150ms;
}
.bo-onboarding-close:hover { background: rgba(255,255,255,.12); color: #fff; }

/* Body */
.bo-onboarding-body {
  padding: 28px 24px 20px;
}
.bo-onboarding-step__eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .1em; color: #3b82f6; margin-bottom: 10px;
}
.bo-onboarding-step__eyebrow.is-success { color: #16a34a; }
.bo-onboarding-step__title {
  font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.25; margin-bottom: 8px;
}
.bo-onboarding-step__subtitle {
  font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 20px;
}

/* Features list */
.bo-onboarding-features {
  display: flex; flex-direction: column; gap: 10px;
}
.bo-onboarding-feature {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 14px; border-radius: 10px;
  background: #f8fafc; border: 1px solid #f1f5f9;
}
.bo-onboarding-feature__icon {
  display: flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  background: #eff6ff; color: #3b82f6;
}
.bo-onboarding-feature strong {
  display: block; font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.3;
}
.bo-onboarding-feature small {
  display: block; font-size: 12px; color: #64748b; line-height: 1.4; margin-top: 2px;
}

/* Form */
.bo-onboarding-form { display: flex; flex-direction: column; gap: 14px; }
.bo-onboarding-label { display: flex; flex-direction: column; gap: 5px; }
.bo-onboarding-label > span {
  font-size: 13px; font-weight: 600; color: #374151;
}
.bo-onboarding-label__opt { font-weight: 400; color: #9ca3af; font-style: normal; margin-left: 4px; }
.bo-onboarding-input {
  width: 100%; padding: 10px 13px; border: 1.5px solid #d1d5db; border-radius: 9px;
  font-size: 14px; color: #111827; background: #fff;
  outline: none; transition: border-color 150ms, box-shadow 150ms;
}
.bo-onboarding-input:focus {
  border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12);
}
.bo-onboarding-textarea {
  width: 100%; padding: 10px 13px; border: 1.5px solid #d1d5db; border-radius: 9px;
  font-size: 14px; color: #111827; background: #fff; resize: vertical;
  outline: none; transition: border-color 150ms, box-shadow 150ms;
  font-family: inherit;
}
.bo-onboarding-textarea:focus {
  border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,.12);
}

/* Action cards (step 3) */
.bo-onboarding-actions { display: flex; flex-direction: column; gap: 8px; }
.bo-onboarding-action-card {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px; border-radius: 12px;
  border: 1.5px solid #e2e8f0; background: #fff;
  text-align: left; cursor: pointer;
  transition: border-color 150ms, background 150ms, box-shadow 150ms;
}
.bo-onboarding-action-card:hover {
  border-color: #3b82f6; background: #eff6ff;
  box-shadow: 0 2px 8px rgba(59,130,246,.12);
}
.bo-onboarding-action-card__icon {
  display: flex; align-items: center; justify-content: center;
  width: 42px; height: 42px; border-radius: 10px;
  background: #f1f5f9; flex-shrink: 0; color: #3b82f6;
}
.bo-onboarding-action-card:hover .bo-onboarding-action-card__icon {
  background: #dbeafe;
}
.bo-onboarding-action-card__copy { flex: 1; min-width: 0; }
.bo-onboarding-action-card__copy strong {
  display: block; font-size: 14px; font-weight: 700; color: #1e293b;
}
.bo-onboarding-action-card__copy small {
  display: block; font-size: 12px; color: #64748b; margin-top: 2px; line-height: 1.4;
}
.bo-onboarding-action-card__arrow {
  flex-shrink: 0; color: #cbd5e1; transition: color 150ms, transform 150ms;
}
.bo-onboarding-action-card:hover .bo-onboarding-action-card__arrow {
  color: #3b82f6; transform: translateX(2px);
}

/* Footer */
.bo-onboarding-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 14px 20px; border-top: 1px solid #f1f5f9;
  background: #f8fafc;
}
.bo-onboarding-btn-primary {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 18px; border-radius: 9px;
  background: #2563eb; color: #fff;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: background 150ms, box-shadow 150ms;
  border: none;
}
.bo-onboarding-btn-primary:hover:not(:disabled) {
  background: #1d4ed8; box-shadow: 0 4px 14px rgba(37,99,235,.35);
}
.bo-onboarding-btn-primary:disabled { opacity: .45; cursor: not-allowed; }
.bo-onboarding-btn-secondary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border-radius: 9px;
  background: #fff; color: #374151;
  font-size: 14px; font-weight: 600; cursor: pointer;
  border: 1.5px solid #d1d5db;
  transition: border-color 150ms, background 150ms;
}
.bo-onboarding-btn-secondary:hover { border-color: #94a3b8; background: #f8fafc; }
.bo-onboarding-btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 14px; border-radius: 9px;
  background: transparent; color: #64748b;
  font-size: 14px; font-weight: 500; cursor: pointer;
  border: none; transition: color 150ms, background 150ms;
}
.bo-onboarding-btn-ghost:hover { color: #374151; background: #f1f5f9; }

@media (max-width: 540px) {
  .bo-onboarding-card { border-radius: 16px; }
  .bo-onboarding-body { padding: 20px 16px 16px; }
  .bo-onboarding-step__title { font-size: 17px; }
}
`;

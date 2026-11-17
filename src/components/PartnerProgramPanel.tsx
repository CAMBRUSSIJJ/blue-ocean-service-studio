import { useState } from 'react';
import { X, CheckCircle2, Users, Zap, Globe, Award } from '../design-system/icons';

interface PartnerProgramPanelProps {
  onClose: () => void;
}

const STORAGE_KEY = 'bo-c3-partner-interest';

interface RegistrationData {
  name: string;
  email: string;
  company: string;
  useCase: string;
  registeredAt: string;
}

function loadRegistration(): RegistrationData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RegistrationData) : null;
  } catch {
    return null;
  }
}

function saveRegistration(data: RegistrationData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage indisponível */
  }
}

const BENEFITS = [
  {
    icon: Zap,
    title: 'Acesso antecipado',
    description: 'Receba novos recursos e módulos antes do lançamento oficial, com suporte dedicado para adoção.',
  },
  {
    icon: Users,
    title: 'Rede de consultores',
    description: 'Conecte-se com outros especialistas em design de serviço que utilizam Blue Ocean no dia a dia.',
  },
  {
    icon: Globe,
    title: 'Visibilidade no marketplace',
    description: 'Seja listado como parceiro certificado e amplie sua presença junto a potenciais clientes.',
  },
  {
    icon: Award,
    title: 'Certificação oficial',
    description: 'Comprove sua expertise com o selo Blue Ocean Partner e destaque-se no mercado de consultoria.',
  },
];

const USE_CASE_OPTIONS = [
  'Consultoria em design de serviço',
  'Aceleradoras e incubadoras',
  'Agências de inovação',
  'Treinamento e capacitação',
  'Pesquisa acadêmica',
  'Outro',
];

export function PartnerProgramPanel({ onClose }: PartnerProgramPanelProps) {
  const existing = loadRegistration();
  const [registered, setRegistered] = useState<RegistrationData | null>(existing);
  const [form, setForm] = useState({ name: '', email: '', company: '', useCase: '' });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = 'Obrigatório';
    if (!form.email.trim()) e.email = 'Obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'E-mail inválido';
    if (!form.company.trim()) e.company = 'Obrigatório';
    if (!form.useCase) e.useCase = 'Selecione uma opção';
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    // Simulate async (no backend for MVP)
    setTimeout(() => {
      const data: RegistrationData = { ...form, registeredAt: new Date().toISOString() };
      saveRegistration(data);
      setRegistered(data);
      setSubmitting(false);
    }, 600);
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  return (
    <div className="bo-c3-partner-overlay" role="dialog" aria-modal="true" aria-label="Programa de parceiros Blue Ocean">
      <div className="bo-c3-partner-panel">
        <div className="bo-c3-partner-header">
          <div>
            <span className="bo-c3-partner-kicker">PROGRAMA DE PARCEIROS</span>
            <h2 className="bo-c3-partner-title">Blue Ocean Partner Network</h2>
          </div>
          <button type="button" className="bo-c3-partner-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="bo-c3-partner-body">
          {/* Benefits grid */}
          <section className="bo-c3-partner-benefits">
            <p className="bo-c3-partner-desc">
              Junte-se à rede de consultores e especialistas que usam Blue Ocean para transformar a experiência de serviço dos seus clientes. Os parceiros recebem acesso a recursos exclusivos, certificação oficial e visibilidade junto ao ecossistema.
            </p>
            <div className="bo-c3-partner-benefit-grid">
              {BENEFITS.map((b) => (
                <div key={b.title} className="bo-c3-partner-benefit-card">
                  <span className="bo-c3-partner-benefit-icon"><b.icon size={20} /></span>
                  <strong>{b.title}</strong>
                  <p>{b.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Interest form or success state */}
          <section className="bo-c3-partner-form-section">
            {registered ? (
              <div className="bo-c3-partner-success">
                <CheckCircle2 size={40} className="bo-c3-partner-success-icon" />
                <h3>Interesse registrado!</h3>
                <p>Obrigado, <strong>{registered.name}</strong>. Seu interesse foi salvo localmente. Quando o programa de parceiros for lançado oficialmente, entraremos em contato via <strong>{registered.email}</strong>.</p>
                <button type="button" className="bo-c3-partner-btn-secondary" onClick={onClose}>Fechar</button>
              </div>
            ) : (
              <>
                <h3 className="bo-c3-partner-form-title">Registre seu interesse</h3>
                <p className="bo-c3-partner-form-desc">Preencha o formulário abaixo. Você será notificado assim que o programa estiver disponível.</p>
                <form className="bo-c3-partner-form" onSubmit={handleSubmit} noValidate>
                  <div className="bo-c3-partner-field">
                    <label htmlFor="partner-name">Nome completo <span aria-hidden="true">*</span></label>
                    <input
                      id="partner-name"
                      type="text"
                      value={form.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="Seu nome"
                      aria-invalid={!!errors.name}
                    />
                    {errors.name && <span className="bo-c3-partner-field-error">{errors.name}</span>}
                  </div>
                  <div className="bo-c3-partner-field">
                    <label htmlFor="partner-email">E-mail profissional <span aria-hidden="true">*</span></label>
                    <input
                      id="partner-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="voce@empresa.com"
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && <span className="bo-c3-partner-field-error">{errors.email}</span>}
                  </div>
                  <div className="bo-c3-partner-field">
                    <label htmlFor="partner-company">Empresa / organização <span aria-hidden="true">*</span></label>
                    <input
                      id="partner-company"
                      type="text"
                      value={form.company}
                      onChange={(e) => handleChange('company', e.target.value)}
                      placeholder="Nome da empresa"
                      aria-invalid={!!errors.company}
                    />
                    {errors.company && <span className="bo-c3-partner-field-error">{errors.company}</span>}
                  </div>
                  <div className="bo-c3-partner-field">
                    <label htmlFor="partner-use-case">Caso de uso principal <span aria-hidden="true">*</span></label>
                    <select
                      id="partner-use-case"
                      value={form.useCase}
                      onChange={(e) => handleChange('useCase', e.target.value)}
                      aria-invalid={!!errors.useCase}
                    >
                      <option value="">Selecione...</option>
                      {USE_CASE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {errors.useCase && <span className="bo-c3-partner-field-error">{errors.useCase}</span>}
                  </div>
                  <div className="bo-c3-partner-actions">
                    <button type="button" className="bo-c3-partner-btn-secondary" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="bo-c3-partner-btn-primary" disabled={submitting}>
                      {submitting ? 'Registrando...' : 'Registrar interesse'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

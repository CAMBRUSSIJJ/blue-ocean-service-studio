import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, GraduationCap, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound, UsersRound } from '../design-system/icons';
import App from '../App';
import { APP_VERSION } from '../generated/app-version';
import { dataBridge } from '../runtime/client';
import { createLocalAccount, enterLocalWorkspace, getStoredUser, hasLocalAccounts, resetLocalPassword, signInLocal, signOutLocal, type AuthUser, type LocalAuthAccount } from './auth';
import './auth.css';

type Screen = 'login' | 'signup' | 'workspace' | 'recover';
type SignupDraft = { name: string; email: string; password: string; usage: LocalAuthAccount['usage']; workspaceName: string };

const emptyDraft: SignupDraft = { name: '', email: '', password: '', usage: 'company', workspaceName: '' };
const passwordIsStrongEnough = (password: string) => password.length >= 8;
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

function WaveBackdrop({ mode = 'entry' }: { mode?: 'entry' | 'loading' }) {
  return (
    <div className={`bo-auth-wave bo-auth-wave--${mode}`} aria-hidden="true">
      <div className="bo-auth-wave__track">
        <img className="bo-auth-wave__tile" src="/bo-ocean-wave-1181.webp" alt="" decoding="async" draggable={false} />
        <img className="bo-auth-wave__tile" src="/bo-ocean-wave-1181.webp" alt="" decoding="async" draggable={false} />
      </div>
    </div>
  );
}


async function prepareWorkspaceRuntime(): Promise<{ warning?: string }> {
  const bridge = dataBridge();
  if (!bridge?.prepare) return {};
  let timeoutId = 0;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = window.setTimeout(() => reject(new Error('A preparação local excedeu o tempo seguro.')), 4200);
    });
    await Promise.race([Promise.resolve(bridge.prepare()), timeout]);
    return {};
  } catch (error) {
    console.warn('[BLUE OCEAN] Workspace aberto com recuperação local degradada.', error);
    return { warning: 'A proteção durável demorou mais que o esperado. O workspace será aberto com o cache local e continuará tentando se recuperar em segundo plano.' };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function LoadingWorkspace({ user, onDone }: { user: AuthUser; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    let active = true;
    const run = async () => {
      setStep(1);
      await wait(160);
      if (!active) return;
      setStep(2);
      const result = await prepareWorkspaceRuntime();
      if (!active) return;
      if (result.warning) setWarning(result.warning);
      setStep(3);
      await wait(180);
      if (!active) return;
      setStep(4);
      await wait(220);
      if (active) onDone();
    };
    void run();
    return () => { active = false; };
  }, [onDone]);

  const labels = ['Preferências locais', 'Service Graph', 'Jornadas e Blueprints', 'Abrindo workspace'];
  return (
    <div className="bo-auth-loading" role="status" aria-live="polite">
      <WaveBackdrop mode="loading" />
      <div className="bo-auth-loading__panel">
        <div className="bo-auth-loading__mark"><img src="/blue-ocean-mark.svg" alt="" /></div>
        <div className="bo-auth-loading__brand">BLUE OCEAN <span>Service Studio</span></div>
        <h1>Preparando seu workspace</h1>
        <p>{user.workspaceName}</p>
        <div className="bo-auth-loading__steps">
          {labels.map((label, index) => <div key={label} className={index < step ? 'done' : index === step ? 'active' : ''}><span>{index < step ? <Check size={14} /> : <i />}</span>{label}</div>)}
        </div>
        {warning && <div className="bo-auth-loading__warning">{warning}</div>}
      </div>
    </div>
  );
}

export function AuthExperience() {
  const [initialSession] = useState<AuthUser | null>(() => getStoredUser());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [loadingUser, setLoadingUser] = useState<AuthUser | null>(initialSession);
  const [screen, setScreen] = useState<Screen>('login');
  const [signup, setSignup] = useState<SignupDraft>(emptyDraft);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoverPassword, setRecoverPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [accountsAvailable, setAccountsAvailable] = useState(() => hasLocalAccounts());
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    document.body.classList.toggle('bo1179-auth-visible', !showWorkspace);
    return () => document.body.classList.remove('bo1179-auth-visible');
  }, [showWorkspace]);

  const beginWorkspace = (nextUser: AuthUser) => {
    setMessage(null);
    setLoadingUser(nextUser);
  };

  const finishLoading = () => {
    if (!loadingUser) return;
    setUser(loadingUser);
    setLoadingUser(null);
    setShowWorkspace(true);
  };

  const handleSignOut = () => {
    signOutLocal();
    setUser(null);
    setLoadingUser(null);
    setShowWorkspace(false);
    setScreen('login');
    setPassword('');
    setMessage({ kind: 'info', text: 'Sessão encerrada neste dispositivo.' });
  };

  if (loadingUser) return <LoadingWorkspace user={loadingUser} onDone={finishLoading} />;
  if (user && showWorkspace) return <App authUser={user} onSignOut={handleSignOut} />;

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      beginWorkspace(await signInLocal(email, password, remember));
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível entrar.' });
    } finally {
      setPending(false);
    }
  };

  const continueSignup = (event: FormEvent) => {
    event.preventDefault();
    if (!signup.name.trim()) { setMessage({ kind: 'error', text: 'Informe seu nome.' }); return; }
    if (!/^\S+@\S+\.\S+$/.test(signup.email)) { setMessage({ kind: 'error', text: 'Informe um e-mail válido.' }); return; }
    if (!passwordIsStrongEnough(signup.password)) { setMessage({ kind: 'error', text: 'A senha precisa ter pelo menos 8 caracteres.' }); return; }
    setMessage(null);
    setScreen('workspace');
  };

  const submitSignup = async (event: FormEvent) => {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const nextUser = await createLocalAccount(signup);
      setAccountsAvailable(true);
      beginWorkspace(nextUser);
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível criar a conta.' });
    } finally {
      setPending(false);
    }
  };

  const submitRecovery = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordIsStrongEnough(recoverPassword)) { setMessage({ kind: 'error', text: 'A nova senha precisa ter pelo menos 8 caracteres.' }); return; }
    setPending(true);
    setMessage(null);
    try {
      await resetLocalPassword(email, recoverPassword);
      setRecoverPassword('');
      setPassword('');
      setScreen('login');
      setMessage({ kind: 'info', text: 'Senha local redefinida. Você já pode entrar.' });
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível redefinir a senha.' });
    } finally {
      setPending(false);
    }
  };

  const oauthUnavailable = (provider: string) => setMessage({ kind: 'info', text: `${provider} está preparado visualmente. A autenticação real será habilitada quando o backend cloud for conectado.` });

  return (
    <main className="bo-auth-shell">
      <WaveBackdrop />
      <div className="bo-h719-auth-motion" data-motion-identity="7.19" aria-hidden="true">
        <span className="bo-h719-auth-motion__depth" />
        <span className="bo-h719-auth-motion__current" />
        <span className="bo-h719-auth-motion__foam" />
      </div>
      <section className="bo-auth-story" aria-label="BLUE OCEAN Service Studio">
        <div className="bo-auth-story__veil" aria-hidden="true" />
        <div className="bo-auth-brand"><div><img src="/blue-ocean-mark.svg" alt="" /></div><span><strong>BLUE OCEAN</strong><small>Service Studio</small></span></div>
        <div className="bo-auth-story__copy">
          <span className="bo-auth-eyebrow"><Sparkles size={14} /> Service design, conectado</span>
          <h1>Transforme serviços complexos em experiências claras.</h1>
          <p>Uma base única para mapear jornadas, estruturar operações, reunir evidências e transformar oportunidades em ação.</p>
          <div className="bo-auth-capabilities"><span>Journey</span><i /><span>Blueprint</span><i /><span>Research</span><i /><span>Improvement</span></div>
        </div>
        <div className="bo-auth-story__signal" aria-hidden="true"><span>Service Graph</span><i /><span>Uma fonte de verdade</span></div>
        <footer>Local-first por padrão · seus dados permanecem neste dispositivo</footer>
      </section>

      <section className="bo-auth-panel">
        <div className="bo-auth-card">
          {screen === 'login' && <>
            <div className="bo-auth-heading"><span>V{APP_VERSION}</span><h2>Bem-vindo de volta</h2><p>Entre para continuar no seu workspace.</p></div>
            {!accountsAvailable && <div className="bo-auth-first-use"><strong>Primeiro acesso?</strong><span>Crie seu workspace abaixo. Depois, este mesmo e-mail e senha passam a funcionar no login local.</span></div>}
            <form onSubmit={submitLogin} className="bo-auth-form">
              <label>E-mail<div className="bo-auth-input"><Mail size={17} /><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="voce@empresa.com" required /></div></label>
              <label>Senha<div className="bo-auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
              <div className="bo-auth-form__row"><label className="bo-auth-check"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /> <span>Manter conectado</span></label><button type="button" className="bo-auth-link" onClick={() => { setScreen('recover'); setMessage(null); }}>Esqueci minha senha</button></div>
              {message && <div className={`bo-auth-message ${message.kind}`}>{message.text}</div>}
              <button className="bo-auth-primary" type="submit" disabled={pending}>{pending ? 'Entrando…' : <>Entrar na BLUE OCEAN <ArrowRight size={17} /></>}</button>
            </form>
            <div className="bo-auth-divider"><span>ou continue com</span></div>
            <div className="bo-auth-oauth"><button type="button" onClick={() => oauthUnavailable('Google')}><b>G</b> Google</button><button type="button" onClick={() => oauthUnavailable('Microsoft')}><b className="ms">⊞</b> Microsoft</button></div>
            <p className="bo-auth-switch">Não possui conta? <button type="button" onClick={() => { setSignup(emptyDraft); setScreen('signup'); setMessage(null); }}>Criar workspace</button></p>
          </>}

          {screen === 'signup' && <>
            <button className="bo-auth-back" type="button" onClick={() => { setScreen('login'); setMessage(null); }}><ArrowLeft size={15} /> Voltar</button>
            <div className="bo-auth-heading"><span>CRIAR CONTA</span><h2>Comece com o essencial</h2><p>Seu primeiro workspace fica pronto em menos de um minuto.</p></div>
            <form onSubmit={continueSignup} className="bo-auth-form">
              <label>Nome<div className="bo-auth-input"><UserRound size={17} /><input autoComplete="name" value={signup.name} onChange={(event) => setSignup((draft) => ({ ...draft, name: event.target.value }))} placeholder="Seu nome" required /></div></label>
              <label>E-mail<div className="bo-auth-input"><Mail size={17} /><input type="email" autoComplete="email" value={signup.email} onChange={(event) => setSignup((draft) => ({ ...draft, email: event.target.value }))} placeholder="voce@empresa.com" required /></div></label>
              <label>Senha<div className="bo-auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={signup.password} onChange={(event) => setSignup((draft) => ({ ...draft, password: event.target.value }))} placeholder="Mínimo de 8 caracteres" required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
              {message && <div className={`bo-auth-message ${message.kind}`}>{message.text}</div>}
              <button className="bo-auth-primary" type="submit">Continuar <ArrowRight size={17} /></button>
            </form>
          </>}

          {screen === 'workspace' && <>
            <button className="bo-auth-back" type="button" onClick={() => { setScreen('signup'); setMessage(null); }}><ArrowLeft size={15} /> Voltar</button>
            <div className="bo-auth-heading"><span>SEU WORKSPACE</span><h2>Como você vai usar a BLUE OCEAN?</h2><p>Isso prepara a entrada sem limitar o que você poderá fazer depois.</p></div>
            <form onSubmit={submitSignup} className="bo-auth-form">
              <div className="bo-auth-usage">
                {([['personal', UserRound, 'Meu próprio trabalho'], ['company', Building2, 'Minha empresa'], ['agency', UsersRound, 'Consultoria / agência'], ['education', GraduationCap, 'Ensino / pesquisa']] as const).map(([value, Icon, label]) => <button key={value} type="button" className={signup.usage === value ? 'active' : ''} onClick={() => setSignup((draft) => ({ ...draft, usage: value }))}><Icon size={18} /><span>{label}</span>{signup.usage === value && <Check size={15} />}</button>)}
              </div>
              <label>Nome do workspace<div className="bo-auth-input"><Building2 size={17} /><input value={signup.workspaceName} onChange={(event) => setSignup((draft) => ({ ...draft, workspaceName: event.target.value }))} placeholder="Ex.: Acme Service Design" required /></div></label>
              {message && <div className={`bo-auth-message ${message.kind}`}>{message.text}</div>}
              <button className="bo-auth-primary" type="submit" disabled={pending}>{pending ? 'Criando workspace…' : <>Criar e entrar <ArrowRight size={17} /></>}</button>
            </form>
          </>}

          {screen === 'recover' && <>
            <button className="bo-auth-back" type="button" onClick={() => { setScreen('login'); setMessage(null); }}><ArrowLeft size={15} /> Voltar</button>
            <div className="bo-auth-heading"><span>RECUPERAÇÃO LOCAL</span><h2>Redefinir senha</h2><p>Como esta versão é local-first, a recuperação acontece somente neste dispositivo.</p></div>
            <form onSubmit={submitRecovery} className="bo-auth-form">
              <label>E-mail<div className="bo-auth-input"><Mail size={17} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div></label>
              <label>Nova senha<div className="bo-auth-input"><LockKeyhole size={17} /><input type="password" value={recoverPassword} onChange={(event) => setRecoverPassword(event.target.value)} placeholder="Mínimo de 8 caracteres" required /></div></label>
              {message && <div className={`bo-auth-message ${message.kind}`}>{message.text}</div>}
              <button className="bo-auth-primary" type="submit" disabled={pending}>{pending ? 'Redefinindo…' : 'Redefinir senha local'}</button>
            </form>
          </>}

          <div className="bo-auth-local"><ShieldCheck size={16} /><span><strong>Modo local seguro</strong> Esta versão ainda não envia credenciais para servidores externos.</span></div>
          <button className="bo-auth-demo" type="button" onClick={() => beginWorkspace(enterLocalWorkspace())}>Abrir workspace local sem conta <ArrowRight size={14} /></button>
        </div>
        <div className="bo-auth-panel__footer">BLUE OCEAN Service Studio · V{APP_VERSION}</div>
      </section>
    </main>
  );
}

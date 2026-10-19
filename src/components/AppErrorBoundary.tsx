import React from 'react';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[BLUE OCEAN] Falha de renderização capturada', error, info);
    window.dispatchEvent(new CustomEvent('rt-ui-fatal-error', { detail: { message: error.message } }));
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="bo1120-fatal-state" role="alert">
        <section>
          <div className="bo1176-state-mark" aria-hidden="true" />
          <p className="bo1120-fatal-eyebrow">BLUE OCEAN · MODO SEGURO</p>
          <h1>A interface encontrou um erro.</h1>
          <p>Seus dados locais foram preservados. Você pode recarregar a interface ou tentar continuar em modo seguro.</p>
          <div className="bo1176-error-actions">
            <button type="button" className="primary" onClick={() => window.location.reload()}>Recarregar interface</button>
            <button type="button" className="secondary" onClick={() => this.setState({ error: null })}>Tentar continuar</button>
          </div>
        </section>
      </main>
    );
  }
}

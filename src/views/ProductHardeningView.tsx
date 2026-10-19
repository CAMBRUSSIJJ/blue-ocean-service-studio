import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Database, Download, HardDrive, LockKeyhole, RefreshCw, Save, ShieldCheck } from '../design-system/icons';
import type { StudioController } from '../state/useStudioController';
import { buildProductHardeningReport, type ProductHardeningFacts, type ProductHardeningStatus } from '../services/product-hardening';
import { dataBridge, runtimeApi } from '../runtime/client';

type CollaborationApi = { can?(action: string): boolean; currentRole?(): string; syncStatus?(): { mode?: string }; show?(tab?: string): void };
const statusLabel: Record<ProductHardeningStatus, string> = { pass: 'OK', attention: 'Atenção', blocked: 'Bloqueado' };
const areaLabel = { persistence: 'Persistência', recovery: 'Recovery', permissions: 'Permissões', integrity: 'Integridade', runtime: 'Runtime', accessibility: 'Acessibilidade' } as const;

function storageAvailable(name: 'localStorage' | 'sessionStorage') {
  try { const storage = window[name]; const key = '__bo_h740_probe__'; storage.setItem(key, '1'); storage.removeItem(key); return true; } catch { return false; }
}
function runtimeFacts(): ProductHardeningFacts {
  const bridge = dataBridge(); const collaboration = runtimeApi<CollaborationApi>('collaboration');
  return {
    dataBridge: Boolean(bridge), recoveryApi: typeof bridge?.recovery === 'function', localStorage: storageAvailable('localStorage'), indexedDB: 'indexedDB' in window,
    webCrypto: Boolean(window.crypto?.subtle), broadcastChannel: 'BroadcastChannel' in window, permissionGuard: typeof collaboration?.can === 'function',
    autosaveEnabled: true, backgroundFlush: true, reducedMotion: typeof window.matchMedia === 'function', currentRole: collaboration?.currentRole?.(), syncMode: collaboration?.syncStatus?.().mode,
  };
}

export function ProductHardeningView({ studio }: { studio: StudioController }) {
  const [runtimeRevision, setRuntimeRevision] = useState(0); const [recoveryResult, setRecoveryResult] = useState<'idle'|'checking'|'pass'|'error'>('idle');
  const facts = useMemo(() => runtimeFacts(), [runtimeRevision]);
  const report = useMemo(() => buildProductHardeningReport(studio.graph, facts), [studio.graph, facts]);
  const validateRecovery = async () => {
    setRecoveryResult('checking');
    try { const bridge = dataBridge(); if (!bridge?.recovery) throw new Error('Recovery API indisponível'); await bridge.recovery(); setRecoveryResult('pass'); studio.showToast('Recovery validado neste navegador.'); }
    catch { setRecoveryResult('error'); studio.showToast('Recovery não pôde ser validado neste navegador.'); }
    finally { setRuntimeRevision((value) => value + 1); }
  };
  const collaboration = runtimeApi<CollaborationApi>('collaboration');
  return <section className="bo-h740" data-product-hardening="7.40">
    <header className="bo-h740-hero"><div><small>H7.40 · PROFESSIONAL PRODUCT HARDENING</small><h2>Prontidão técnica do produto</h2><p>Persistência, recovery, permissões, integridade e runtime medidos sem transformar UNKNOWN em PASS.</p></div><div className={`bo-h740-score is-${report.status}`}><strong>{report.readinessScore}</strong><span>/100</span><small>{report.status === 'ready' ? 'Pronto' : report.status === 'attention' ? 'Atenção' : 'Bloqueado'}</small></div></header>
    <section className="bo-h740-area-grid">{report.areas.map((item) => <article key={item.area}><span>{item.area === 'permissions' ? <LockKeyhole size={18}/> : item.area === 'recovery' ? <HardDrive size={18}/> : item.area === 'persistence' ? <Save size={18}/> : <ShieldCheck size={18}/>}</span><div><small>{areaLabel[item.area]}</small><strong>{item.score}%</strong><p>{item.checks} controles avaliados</p></div></article>)}</section>
    <section className="bo-h740-grid">
      <article className="bo-h740-panel"><header><div><small>CONTROLES</small><h3>Hardening ativo</h3></div><ShieldCheck size={20}/></header><div className="bo-h740-checks">{report.checks.map((item) => <div key={item.id} className={`is-${item.status}`}><span>{item.status === 'pass' ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}</span><div><strong>{item.label}</strong><p>{item.detail}</p></div><em>{statusLabel[item.status]}</em></div>)}</div></article>
      <aside className="bo-h740-side">
        <article className="bo-h740-panel"><header><div><small>PROTEÇÃO DE DADOS</small><h3>Ações de segurança</h3></div><Database size={20}/></header><div className="bo-h740-actions"><button type="button" onClick={studio.handleSave}><Save size={16}/> Salvar checkpoint agora</button><button type="button" onClick={studio.handleExport}><Download size={16}/> Exportar backup</button><button type="button" onClick={() => void validateRecovery()} disabled={recoveryResult === 'checking'}><RefreshCw size={16} className={recoveryResult === 'checking' ? 'animate-spin' : ''}/> {recoveryResult === 'pass' ? 'Recovery validado' : recoveryResult === 'error' ? 'Tentar recovery novamente' : 'Validar recovery'}</button><button type="button" onClick={() => collaboration?.show?.('members')}><LockKeyhole size={16}/> Revisar membros e papéis</button></div></article>
        <article className="bo-h740-panel bo-h740-truth"><header><div><small>RELEASE TRUTH</small><h3>O que esta tela não mascara</h3></div><AlertTriangle size={20}/></header><p>Esta leitura cobre o runtime do navegador. <b>npm ci, React typecheck, Vite build, browser QA e deploy</b> continuam gates externos de release e só são marcados como PASS quando realmente executados.</p><dl><div><dt>Papel atual</dt><dd>{report.role}</dd></div><div><dt>Sync</dt><dd>{report.syncMode}</dd></div><div><dt>Conflitos</dt><dd>{report.openConflicts}</dd></div><div><dt>Recovery</dt><dd>{recoveryResult === 'idle' ? 'não testado nesta sessão' : recoveryResult}</dd></div></dl></article>
      </aside>
    </section>
  </section>;
}

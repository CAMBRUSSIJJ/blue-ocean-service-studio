import type { CollaborationRole, ServiceGraph } from '../domain/model';

export type ProductHardeningStatus = 'pass' | 'attention' | 'blocked';
export type ProductHardeningArea = 'persistence' | 'recovery' | 'permissions' | 'integrity' | 'runtime' | 'accessibility';
export type ProductHardeningFacts = {
  dataBridge?: boolean;
  recoveryApi?: boolean;
  localStorage?: boolean;
  indexedDB?: boolean;
  webCrypto?: boolean;
  broadcastChannel?: boolean;
  permissionGuard?: boolean;
  autosaveEnabled?: boolean;
  backgroundFlush?: boolean;
  reducedMotion?: boolean;
  currentRole?: CollaborationRole | string;
  syncMode?: string;
};
export type ProductHardeningCheck = {
  id: string;
  area: ProductHardeningArea;
  label: string;
  detail: string;
  status: ProductHardeningStatus;
  weight: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
const validRoles = new Set<CollaborationRole>(['owner', 'editor', 'commenter', 'viewer']);
const statusScore: Record<ProductHardeningStatus, number> = { pass: 1, attention: .55, blocked: 0 };

export function buildProductHardeningReport(graph: ServiceGraph, facts: ProductHardeningFacts = {}) {
  const collaboration = graph.service.collaboration;
  const members = Object.values(collaboration?.members ?? {});
  const current = collaboration?.currentUserId ? collaboration.members?.[collaboration.currentUserId] : undefined;
  const role = String(facts.currentRole || current?.role || 'viewer');
  const hasOwner = members.some((member) => member.status !== 'disabled' && member.role === 'owner');
  const openConflicts = (collaboration?.sync?.conflicts ?? []).filter((item) => item.status === 'open').length;
  const checks: ProductHardeningCheck[] = [
    { id: 'schema', area: 'integrity', label: 'Schema canônico', detail: graph.schemaVersion >= 3 ? `Service Graph schema v${graph.schemaVersion}` : 'Schema anterior ao v3.', status: graph.schemaVersion >= 3 ? 'pass' : 'blocked', weight: 8 },
    { id: 'integrity', area: 'integrity', label: 'Integridade do Service Graph', detail: graph.integrity?.schemaVersion === 3 ? 'Estado de integridade compatível com o schema atual.' : 'Integridade ainda não foi consolidada para o schema atual.', status: graph.integrity?.schemaVersion === 3 ? 'pass' : 'attention', weight: 8 },
    { id: 'local-storage', area: 'persistence', label: 'Persistência local', detail: facts.localStorage ? 'localStorage disponível para o projeto.' : 'localStorage indisponível ou bloqueado.', status: facts.localStorage ? 'pass' : 'blocked', weight: 10 },
    { id: 'data-bridge', area: 'persistence', label: 'Data Bridge canônico', detail: facts.dataBridge ? 'Escritas passam pelo Data Bridge com repair/validation.' : 'Data Bridge não foi detectado neste runtime.', status: facts.dataBridge ? 'pass' : 'attention', weight: 8 },
    { id: 'autosave', area: 'persistence', label: 'Autosave do projeto', detail: facts.autosaveEnabled ? 'Alterações do React são persistidas com debounce e status de salvamento.' : 'Autosave do projeto não confirmado.', status: facts.autosaveEnabled ? 'pass' : 'blocked', weight: 10 },
    { id: 'background-flush', area: 'persistence', label: 'Flush em background', detail: facts.backgroundFlush ? 'Projeto é persistido ao ocultar/encerrar a página.' : 'Flush de segundo plano não confirmado.', status: facts.backgroundFlush ? 'pass' : 'attention', weight: 5 },
    { id: 'recovery-api', area: 'recovery', label: 'Recovery API', detail: facts.recoveryApi ? 'Data Bridge expõe diagnóstico/recovery durável.' : 'Recovery API não foi detectada.', status: facts.recoveryApi ? 'pass' : 'blocked', weight: 10 },
    { id: 'indexeddb', area: 'recovery', label: 'Checkpoint durável', detail: facts.indexedDB ? 'IndexedDB disponível para checkpoints e recuperação.' : 'IndexedDB indisponível; recovery fica degradado.', status: facts.indexedDB ? 'pass' : 'attention', weight: 6 },
    { id: 'permission-guard', area: 'permissions', label: 'RBAC aplicado na escrita', detail: facts.permissionGuard ? 'Data Bridge e UI reconhecem permissões Owner/Editor/Commenter/Viewer.' : 'Guard de permissão não foi detectado.', status: facts.permissionGuard ? 'pass' : 'blocked', weight: 10 },
    { id: 'owner', area: 'permissions', label: 'Owner preservado', detail: hasOwner ? 'Existe pelo menos um Owner ativo no workspace.' : 'Workspace sem Owner ativo.', status: hasOwner ? 'pass' : collaboration ? 'blocked' : 'attention', weight: 5 },
    { id: 'role', area: 'permissions', label: 'Papel da sessão', detail: validRoles.has(role as CollaborationRole) ? `Sessão reconhecida como ${role}.` : `Papel desconhecido: ${role}.`, status: validRoles.has(role as CollaborationRole) ? 'pass' : 'blocked', weight: 4 },
    { id: 'sync-conflict', area: 'permissions', label: 'Conflitos de sincronização', detail: openConflicts ? `${openConflicts} conflito(s) de sync aberto(s).` : 'Nenhum conflito de sync aberto.', status: openConflicts ? 'attention' : 'pass', weight: 3 },
    { id: 'crypto', area: 'runtime', label: 'Web Crypto', detail: facts.webCrypto ? 'Web Crypto disponível para autenticação local segura.' : 'Web Crypto indisponível.', status: facts.webCrypto ? 'pass' : 'blocked', weight: 5 },
    { id: 'broadcast', area: 'runtime', label: 'Coordenação entre abas', detail: facts.broadcastChannel ? 'BroadcastChannel disponível para presença local.' : 'BroadcastChannel indisponível; colaboração entre abas fica degradada.', status: facts.broadcastChannel ? 'pass' : 'attention', weight: 3 },
    { id: 'reduced-motion', area: 'accessibility', label: 'Motion acessível', detail: facts.reducedMotion ? 'Runtime suporta preferência de redução de movimento.' : 'Suporte a prefers-reduced-motion não confirmado.', status: facts.reducedMotion ? 'pass' : 'attention', weight: 5 },
  ];
  const weight = checks.reduce((sum, item) => sum + item.weight, 0) || 1;
  const readinessScore = clamp(checks.reduce((sum, item) => sum + statusScore[item.status] * item.weight, 0) / weight * 100);
  const blockers = checks.filter((item) => item.status === 'blocked');
  const attention = checks.filter((item) => item.status === 'attention');
  const status = blockers.length ? 'blocked' : readinessScore >= 90 ? 'ready' : 'attention';
  const areas = (['persistence', 'recovery', 'permissions', 'integrity', 'runtime', 'accessibility'] as ProductHardeningArea[]).map((area) => {
    const rows = checks.filter((item) => item.area === area); const areaWeight = rows.reduce((sum, item) => sum + item.weight, 0) || 1;
    return { area, score: clamp(rows.reduce((sum, item) => sum + statusScore[item.status] * item.weight, 0) / areaWeight * 100), checks: rows.length };
  });
  return { readinessScore, status, checks, blockers, attention, areas, role, syncMode: facts.syncMode || collaboration?.sync?.mode || 'local-only', openConflicts };
}

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { dataBridge, runtimeApi } from '../runtime/client';
import type { ServiceGraph } from '../domain/model';

export type RemoteRole = 'owner' | 'editor' | 'commenter' | 'viewer';
export type RemoteBinding = { workspaceId: string; serviceId: string; userId: string; revision: number; role: RemoteRole };
type Snapshot = { graph: ServiceGraph; meta?: Record<string, unknown>; format?: string };
type RemoteBridge = ReturnType<typeof dataBridge> & { snapshot?(): Snapshot };
const bindingKey = 'bo.remote.binding.v1';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
export const remoteConfigured = !!url && !!key;
let client: SupabaseClient | null = null;
let session: Session | null = null;
let binding: RemoteBinding | null = readBinding();
function readBinding(): RemoteBinding | null {
  try {
    const value = JSON.parse(localStorage.getItem(bindingKey) || 'null');
    return value && typeof value.workspaceId === 'string' && typeof value.serviceId === 'string' && typeof value.userId === 'string' && Number.isSafeInteger(value.revision) ? value : null;
  } catch { return null; }
}
export function remoteClient() {
  if (!remoteConfigured) throw Error('O acesso remoto ainda aguarda a configuração do workspace.');
  client ||= createClient(url!, key!, { auth: { storageKey: 'bo.remote.auth.v1', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
  return client;
}
export function remoteSetSession(value: Session | null) {
  if (session?.user.id !== value?.user.id) validatedWorkspace = '';
  session = value; changed();
}
export function remoteBinding() { return binding; }
function changed() { window.dispatchEvent(new CustomEvent('bo-remote-changed')); }
function bridge() { return dataBridge() as RemoteBridge; }
function snapshot() {
  const value = bridge()?.snapshot?.();
  if (!value) throw Error('Abra um projeto local antes de publicar uma cópia.');
  return value;
}
function remember(value: RemoteBinding | null) {
  if (value) localStorage.setItem(bindingKey, JSON.stringify(value)); else localStorage.removeItem(bindingKey);
  binding = value; changed();
}
function signedIn() {
  if (!session?.user) throw Error('Entre na sua conta remota para continuar.');
  return session.user;
}
function fail(error: { message: string; code?: string } | null) {
  if (!error) return;
  if (error.code === '40001' || error.code === 'PT409') throw Error('Outra pessoa publicou alterações. Baixe uma cópia das suas edições e carregue a versão remota antes de continuar. Nenhuma alteração remota foi sobrescrita.');
  throw Error(error.message);
}
export function remoteAuthority() {
  if (!binding) return null;
  const g = bridge()?.get();
  if (binding.serviceId !== g?.service.id) return null;
  // Never grant cached privileges before the server has revalidated membership this session.
  return { id: session?.user.id || 'remote-signed-out', name: session?.user.email || 'Conta remota desconectada', role: session?.user.id === binding.userId && validatedWorkspace === binding.workspaceId ? binding.role : 'viewer', status: 'active' };
}
let validatedWorkspace = '';
export async function remoteList() {
  signedIn();
  const result = await remoteClient().from('bo_workspaces').select('id,name,owner_id,created_at').order('created_at', { ascending: false });
  fail(result.error); return result.data || [];
}
export async function remoteRole(workspaceId: string): Promise<RemoteRole> {
  const user = signedIn(), db = remoteClient();
  const workspace = await db.from('bo_workspaces').select('owner_id').eq('id', workspaceId).single();
  if (workspace.error?.code === 'PGRST116') throw Error('Sua conta não tem mais acesso a este workspace.');
  fail(workspace.error);
  if (!workspace.data) throw Error('Workspace indisponível para esta conta.');
  if (workspace.data.owner_id === user.id) return 'owner';
  const member = await db.from('bo_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).single(); fail(member.error);
  if (!member.data) throw Error('Sua conta não tem acesso a este workspace.');
  return member.data.role as RemoteRole;
}
export async function remoteRevalidate() {
  validatedWorkspace = '';
  if (!binding || !session || binding.userId !== session.user.id) { changed(); return; }
  try { const role = await remoteRole(binding.workspaceId); validatedWorkspace = binding.workspaceId; remember({ ...binding, role }); }
  catch { changed(); }
}
export async function remotePublishCopy(name: string) {
  const user = signedIn(), payload = snapshot();
  const result = await remoteClient().rpc('bo_create_workspace', { p_name: name, p_payload: payload }); fail(result.error);
  validatedWorkspace = result.data;
  remember({ workspaceId: result.data, serviceId: payload.graph.service.id, userId: user.id, revision: 1, role: 'owner' });
}
export async function remoteLoad(workspaceId: string) {
  const user = signedIn(), role = await remoteRole(workspaceId);
  const result = await remoteClient().from('bo_documents').select('revision,payload').eq('workspace_id', workspaceId).single(); fail(result.error);
  if (!result.data) throw Error('A versão remota não está disponível.');
  // Existing import validates the complete graph, asks before replacing, and checkpoints the local copy.
  const oldBinding = binding; binding = null;
  try { await bridge()?.import(result.data.payload); }
  catch (error) { binding = oldBinding; throw error; }
  validatedWorkspace = workspaceId;
  remember({ workspaceId, serviceId: result.data.payload.graph.service.id, userId: user.id, revision: Number(result.data.revision), role });
}
export async function remoteSave() {
  signedIn();
  if (!binding || remoteAuthority()?.role === 'viewer' || remoteAuthority()?.role === 'commenter') throw Error('Sua permissão não permite publicar alterações neste workspace.');
  const current = binding, payload = snapshot();
  if (payload.graph.service.id !== current.serviceId) throw Error('Abra o projeto vinculado antes de publicar alterações.');
  const result = await remoteClient().rpc('bo_commit_workspace', { p_workspace: current.workspaceId, p_expected: current.revision, p_payload: payload }); fail(result.error);
  remember({ ...current, revision: Number(result.data) });
}
export function remoteDetach() { validatedWorkspace = ''; remember(null); }
export async function remoteInvite(role: Exclude<RemoteRole, 'owner'>) {
  signedIn(); if (!binding) throw Error('Abra o workspace primeiro.');
  const result = await remoteClient().rpc('bo_invite_workspace', { p_workspace: binding.workspaceId, p_role: role }); fail(result.error); return String(result.data);
}
export async function remoteAccept(token: string) {
  signedIn(); const result = await remoteClient().rpc('bo_accept_invite', { p_token: token.trim() }); fail(result.error); return String(result.data);
}
export async function remoteMembers() {
  signedIn(); if (!binding) return [];
  const result = await remoteClient().from('bo_members').select('user_id,role').eq('workspace_id', binding.workspaceId); fail(result.error); return result.data || [];
}
export async function remoteRemoveMember(userId: string) {
  signedIn(); if (!binding) return;
  const result = await remoteClient().rpc('bo_remove_member', { p_workspace: binding.workspaceId, p_user: userId }); fail(result.error);
}
export async function remoteComments() {
  signedIn(); if (!binding) return [];
  const result = await remoteClient().from('bo_comments').select('id,body,author_id,created_at').eq('workspace_id', binding.workspaceId).order('created_at', { ascending: false }).limit(50); fail(result.error); return result.data || [];
}
export async function remoteComment(body: string) {
  signedIn(); if (!binding) return;
  const result = await remoteClient().from('bo_comments').insert({ workspace_id: binding.workspaceId, body: body.trim() }); fail(result.error);
}
export async function remoteVersions() {
  signedIn(); if (!binding) return [];
  const result = await remoteClient().from('bo_versions').select('revision,created_at,updated_by').eq('workspace_id', binding.workspaceId).order('revision', { ascending: false }); fail(result.error); return result.data || [];
}
export async function remoteDownloadVersion(revision: number) {
  signedIn(); if (!binding) return;
  const result = await remoteClient().from('bo_versions').select('payload').eq('workspace_id', binding.workspaceId).eq('revision', revision).single(); fail(result.error);
  if (!result.data) throw Error('Esta versão não está mais disponível.');
  const href = URL.createObjectURL(new Blob([JSON.stringify(result.data.payload)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = href; link.download = `Blue-Ocean-remoto-versao-${revision}.json`; link.click(); URL.revokeObjectURL(href);
}
export function remoteLocalBackup() { runtimeApi<{ export(): void }>('dataBridge')?.export(); }

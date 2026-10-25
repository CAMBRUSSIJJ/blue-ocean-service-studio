-- Dedicated Blue Ocean project. Authorization always uses auth.uid(), never client roles.
create schema if not exists private;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create table public.bo_workspaces(id uuid primary key default gen_random_uuid(),owner_id uuid not null references auth.users(id),name text not null check(length(btrim(name)) between 1 and 160),created_at timestamptz not null default now());
create table public.bo_members(workspace_id uuid not null references public.bo_workspaces(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,role text not null check(role in ('editor','commenter','viewer')),primary key(workspace_id,user_id));
create table public.bo_documents(workspace_id uuid primary key references public.bo_workspaces(id) on delete cascade,revision bigint not null check(revision>=1),payload jsonb not null,updated_by uuid not null references auth.users(id),updated_at timestamptz not null default now());
create table public.bo_versions(workspace_id uuid not null references public.bo_workspaces(id) on delete cascade,revision bigint not null,payload jsonb not null,updated_by uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(workspace_id,revision));
create table public.bo_invites(token_hash text primary key,workspace_id uuid not null references public.bo_workspaces(id) on delete cascade,role text not null check(role in ('editor','commenter','viewer')),expires_at timestamptz not null default now()+interval '7 days',redeemed_by uuid references auth.users(id),redeemed_at timestamptz);
create table public.bo_comments(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.bo_workspaces(id) on delete cascade,author_id uuid not null default auth.uid() references auth.users(id),body text not null check(length(btrim(body)) between 1 and 4000),created_at timestamptz not null default now());
create index bo_workspaces_owner_idx on public.bo_workspaces(owner_id);
create index bo_members_user_idx on public.bo_members(user_id,workspace_id);
create index bo_documents_author_idx on public.bo_documents(updated_by);
create index bo_versions_author_idx on public.bo_versions(updated_by);
create index bo_invites_workspace_idx on public.bo_invites(workspace_id);
create index bo_invites_redeemed_idx on public.bo_invites(redeemed_by);
create index bo_comments_workspace_idx on public.bo_comments(workspace_id,created_at);
create index bo_comments_author_idx on public.bo_comments(author_id);

-- Private helper avoids recursive membership policies. No actor parameter can be forged.
create function private.bo_role(p_workspace uuid) returns text language sql stable security definer set search_path='' as $$
 select case when w.owner_id=(select auth.uid()) then 'owner' else (select m.role from public.bo_members m where m.workspace_id=w.id and m.user_id=(select auth.uid())) end
 from public.bo_workspaces w where w.id=p_workspace and (select auth.uid()) is not null;
$$;
revoke all on function private.bo_role(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.bo_role(uuid) to authenticated;
alter table public.bo_workspaces enable row level security;
alter table public.bo_members enable row level security;
alter table public.bo_documents enable row level security;
alter table public.bo_versions enable row level security;
alter table public.bo_invites enable row level security;
alter table public.bo_comments enable row level security;
create policy member_read on public.bo_workspaces for select to authenticated using(private.bo_role(id) is not null);
create policy member_read on public.bo_members for select to authenticated using(private.bo_role(workspace_id) is not null);
create policy member_read on public.bo_documents for select to authenticated using(private.bo_role(workspace_id) is not null);
create policy member_read on public.bo_versions for select to authenticated using(private.bo_role(workspace_id) is not null);
create policy owner_read on public.bo_invites for select to authenticated using(private.bo_role(workspace_id)='owner');
create policy member_read on public.bo_comments for select to authenticated using(private.bo_role(workspace_id) is not null);
create policy member_comment on public.bo_comments for insert to authenticated with check(author_id=(select auth.uid()) and private.bo_role(workspace_id) in ('owner','editor','commenter'));
revoke all on public.bo_workspaces,public.bo_members,public.bo_documents,public.bo_versions,public.bo_invites,public.bo_comments from anon,authenticated;
grant select on public.bo_workspaces,public.bo_members,public.bo_documents,public.bo_versions,public.bo_invites,public.bo_comments to authenticated;
grant insert on public.bo_comments to authenticated;

create function private.bo_validate_payload(p_payload jsonb) returns void language plpgsql set search_path='' as $$
begin
 if p_payload is null or jsonb_typeof(p_payload)<>'object' or jsonb_typeof(p_payload->'graph') is distinct from 'object'
 or jsonb_typeof(p_payload->'graph'->'service') is distinct from 'object' or coalesce(length(p_payload->'graph'->'service'->>'id'),0)=0
 or jsonb_typeof(p_payload->'graph'->'journeys') is distinct from 'object' or jsonb_typeof(p_payload->'graph'->'views') is distinct from 'object'
 or octet_length(p_payload::text)>26214400 then raise exception 'Invalid project payload (maximum 25 MiB)' using errcode='22023'; end if;
end $$;
revoke all on function private.bo_validate_payload(jsonb) from public;
create function private.bo_create(p_name text,p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise insufficient_privilege; end if;
 perform private.bo_validate_payload(p_payload);
 insert into public.bo_workspaces(owner_id,name) values(v_actor,btrim(p_name)) returning id into v_id;
 insert into public.bo_documents(workspace_id,revision,payload,updated_by) values(v_id,1,p_payload,v_actor);
 insert into public.bo_versions(workspace_id,revision,payload,updated_by) values(v_id,1,p_payload,v_actor);
 return v_id;
end $$;
create function private.bo_commit(p_workspace uuid,p_expected bigint,p_payload jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare v_revision bigint; v_actor uuid:=auth.uid();
begin
 if v_actor is null or coalesce(private.bo_role(p_workspace),'') not in ('owner','editor') then raise insufficient_privilege; end if;
 perform private.bo_validate_payload(p_payload);
 -- Revocation and commits serialize on this row; a stale client can never overwrite a newer revision.
 perform 1 from public.bo_workspaces where id=p_workspace for update;
 if coalesce(private.bo_role(p_workspace),'') not in ('owner','editor') then raise insufficient_privilege; end if;
 update public.bo_documents set revision=revision+1,payload=p_payload,updated_by=v_actor,updated_at=now()
 where workspace_id=p_workspace and revision=p_expected and payload->'graph'->'service'->>'id'=p_payload->'graph'->'service'->>'id' returning revision into v_revision;
 if v_revision is null then raise exception 'Workspace changed: load the latest version before publishing' using errcode='40001'; end if;
 insert into public.bo_versions(workspace_id,revision,payload,updated_by) values(p_workspace,v_revision,p_payload,v_actor);
 delete from public.bo_versions where workspace_id=p_workspace and revision<=v_revision-10;
 return v_revision;
end $$;
create function private.bo_invite(p_workspace uuid,p_role text) returns text language plpgsql security definer set search_path='' as $$
declare v_token text;
begin
 if auth.uid() is null or private.bo_role(p_workspace) is distinct from 'owner' then raise insufficient_privilege; end if;
 if p_role not in ('editor','commenter','viewer') then raise exception 'Invalid role' using errcode='22023'; end if;
 v_token:=encode(extensions.gen_random_bytes(24),'hex');
 insert into public.bo_invites(token_hash,workspace_id,role) values(encode(extensions.digest(v_token,'sha256'),'hex'),p_workspace,p_role);
 return v_token;
end $$;
create function private.bo_accept(p_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_invite public.bo_invites; v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise insufficient_privilege; end if;
 select * into v_invite from public.bo_invites where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found or v_invite.expires_at<=now() or v_invite.redeemed_by is not null then raise exception 'Invalid, expired or already used invitation' using errcode='22023'; end if;
 insert into public.bo_members(workspace_id,user_id,role) values(v_invite.workspace_id,v_actor,v_invite.role) on conflict do nothing;
 update public.bo_invites set redeemed_by=v_actor,redeemed_at=now() where token_hash=v_invite.token_hash;
 return v_invite.workspace_id;
end $$;
create function private.bo_remove_member(p_workspace uuid,p_user uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.bo_workspaces where id=p_workspace for update;
 if auth.uid() is null or private.bo_role(p_workspace) is distinct from 'owner' then raise insufficient_privilege; end if;
 delete from public.bo_members where workspace_id=p_workspace and user_id=p_user;
end $$;
revoke all on function private.bo_create(text,jsonb),private.bo_commit(uuid,bigint,jsonb),private.bo_invite(uuid,text),private.bo_accept(text),private.bo_remove_member(uuid,uuid) from public;
grant execute on function private.bo_create(text,jsonb),private.bo_commit(uuid,bigint,jsonb),private.bo_invite(uuid,text),private.bo_accept(text),private.bo_remove_member(uuid,uuid) to authenticated;

-- Exposed RPC wrappers are invokers. Definer code remains in the unexposed private schema.
create function public.bo_create_workspace(p_name text,p_payload jsonb) returns uuid language sql security invoker set search_path='' as $$ select private.bo_create(p_name,p_payload); $$;
create function public.bo_commit_workspace(p_workspace uuid,p_expected bigint,p_payload jsonb) returns bigint language sql security invoker set search_path='' as $$ select private.bo_commit(p_workspace,p_expected,p_payload); $$;
create function public.bo_invite_workspace(p_workspace uuid,p_role text) returns text language sql security invoker set search_path='' as $$ select private.bo_invite(p_workspace,p_role); $$;
create function public.bo_accept_invite(p_token text) returns uuid language sql security invoker set search_path='' as $$ select private.bo_accept(p_token); $$;
create function public.bo_remove_member(p_workspace uuid,p_user uuid) returns void language sql security invoker set search_path='' as $$ select private.bo_remove_member(p_workspace,p_user); $$;
revoke all on function public.bo_create_workspace(text,jsonb),public.bo_commit_workspace(uuid,bigint,jsonb),public.bo_invite_workspace(uuid,text),public.bo_accept_invite(text),public.bo_remove_member(uuid,uuid) from public;
grant execute on function public.bo_create_workspace(text,jsonb),public.bo_commit_workspace(uuid,bigint,jsonb),public.bo_invite_workspace(uuid,text),public.bo_accept_invite(text),public.bo_remove_member(uuid,uuid) to authenticated;

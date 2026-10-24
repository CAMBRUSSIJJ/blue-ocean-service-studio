#!/usr/bin/env python3
"""Real PostgreSQL RLS/CAS tests. Auth JWT subjects are fixtures, not an Auth-service E2E test."""
import concurrent.futures
import json
import subprocess
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/remote-security'
OUT.mkdir(parents=True, exist_ok=True)
container = 'bo-remote-qa-' + uuid.uuid4().hex[:10]
def command(args, **kwargs):
    return subprocess.run(args, text=True, capture_output=True, timeout=60, **kwargs)
def sql(source, checked=True):
    result = command(['docker','exec','-i',container,'psql','-U','postgres','-At','-v','ON_ERROR_STOP=1'], input=source)
    if checked and result.returncode:
        raise RuntimeError(result.stderr)
    return result

checks=[]
try:
    started=command(['docker','run','-d','--rm','--network','none','--name',container,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'])
    if started.returncode: raise RuntimeError(started.stderr)
    for attempt in range(50):
        if command(['docker','exec',container,'pg_isready','-h','127.0.0.1','-U','postgres']).returncode == 0: break
        time.sleep(.2)
    else: raise RuntimeError('Disposable PostgreSQL did not become ready')
    sql("""create role authenticated nologin; create role anon nologin; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
insert into auth.users select ('00000000-0000-4000-a000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,5) i;
""")
    for migration in sorted((ROOT/'supabase/migrations').glob('*.sql')): sql(migration.read_text())
    result=sql((ROOT/'scripts/remote-workspace-security.sql').read_text())
    checks.extend(line.split('PASS ',1)[1] for line in result.stderr.splitlines() if 'PASS ' in line)
    workspace=sql('select id from public.bo_workspaces;').stdout.strip()
    revision=int(sql('select revision from public.bo_documents;').stdout.strip())
    sql(f"insert into bo_members values('{workspace}','00000000-0000-4000-a000-000000000002','editor');")
    def race(actor):
        return sql(f"""set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-a000-00000000000{actor}';
select bo_commit_workspace('{workspace}',{revision},'{{"graph":{{"service":{{"id":"qa-service","winner":{actor}}},"journeys":{{}},"views":{{}}}}}}');""",False)
    with concurrent.futures.ThreadPoolExecutor(2) as pool: races=list(pool.map(race,[1,2]))
    assert sorted(result.returncode==0 for result in races)==[False,True], 'Exactly one concurrent client must succeed'
    assert 'Workspace changed' in next(result.stderr for result in races if result.returncode), 'Losing writer must receive a conflict'
    checks.append('Two concurrent authenticated clients cannot overwrite each other')
    assert int(sql('select revision from bo_documents').stdout.strip())==revision+1
    checks.append('Concurrent saves advance the server revision exactly once')
    sql(f"""set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-a000-000000000001';
do $$ declare v bigint; begin for i in 1..12 loop select revision into v from bo_documents; perform bo_commit_workspace('{workspace}',v,'{{"graph":{{"service":{{"id":"qa-service"}},"journeys":{{}},"views":{{}}}}}}'); end loop; end $$;""")
    assert int(sql('select count(*) from bo_versions').stdout.strip())==10
    checks.append('Server retains the last ten complete versions')
    for check in checks: print('PASS '+check,flush=True)
finally:
    command(['docker','stop',container])
    (OUT/'results.json').write_text(json.dumps({'checks':checks,'auth':'JWT subject fixtures; actual PostgreSQL authorization and concurrent clients'},indent=2))
print(f'Remote security: {len(checks)}/{len(checks)} PASS')

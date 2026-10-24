#!/usr/bin/env python3
"""Browser -> real local Supabase Auth -> PostgREST -> PostgreSQL -> other browser."""
import functools,json,os,shutil,subprocess,threading,urllib.request,urllib.error,uuid
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/remote-browser';OUT.mkdir(parents=True,exist_ok=True)
fixture=json.loads((ROOT/'work/cloud-fixtures.json').read_text());checks=[];errors=[];contexts=[]
assert fixture.get('disposable') is True and all(fixture[key].startswith('http://127.0.0.1:') for key in ['auth_url','rest_url']), 'Only disposable loopback services are accepted'
qa_ids=','.join("'"+str(uuid.UUID(user['id']))+"'::uuid" for user in fixture['users'])
subprocess.run(['docker','exec','-i','bo-cloud-qa-db','psql','-U','postgres','-v','ON_ERROR_STOP=1'],input='delete from public.bo_workspaces where owner_id in ('+qa_ids+');',text=True,stdout=subprocess.DEVNULL,check=True)

class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
 def copyfile(self,source,output):
  try:super().copyfile(source,output)
  except (BrokenPipeError,ConnectionResetError):pass
 def do_OPTIONS(self):
  self.send_response(204);self.send_header('Access-Control-Allow-Origin','*');self.send_header('Access-Control-Allow-Headers','*');self.send_header('Access-Control-Allow-Methods','GET,POST,PATCH,DELETE,OPTIONS');self.end_headers()
 def proxy(self):
  prefix='/auth/v1' if self.path.startswith('/auth/v1') else '/rest/v1';base=fixture['auth_url' if prefix=='/auth/v1' else 'rest_url'];path=self.path[len(prefix):] or '/'
  body=self.rfile.read(int(self.headers.get('Content-Length','0'))) if self.headers.get('Content-Length') else None
  headers={key:value for key,value in self.headers.items() if key.lower() not in ('host','connection','content-length')}
  request=urllib.request.Request(base+path,data=body,headers=headers,method=self.command)
  try:response=urllib.request.urlopen(request,timeout=15)
  except urllib.error.HTTPError as failure:response=failure
  self.send_response(response.status)
  for key,value in response.headers.items():
   if key.lower() not in ('content-length','transfer-encoding','connection','access-control-allow-origin'):self.send_header(key,value)
  self.send_header('Access-Control-Allow-Origin','*');self.end_headers();self.wfile.write(response.read())
 def do_GET(self):
  if self.path.startswith(('/auth/v1','/rest/v1')):self.proxy()
  else:super().do_GET()
 def do_POST(self):self.proxy()
 def do_PATCH(self):self.proxy()
 def do_DELETE(self):self.proxy()
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT/'work/dist-remote-qa')));URL=f'http://127.0.0.1:{server.server_port}'
threading.Thread(target=server.serve_forever,daemon=True).start()
env={**os.environ,'VITE_SUPABASE_URL':URL,'VITE_SUPABASE_PUBLISHABLE_KEY':fixture['anon_key']}
with (OUT/'build.log').open('w') as log:subprocess.run(['node','node_modules/vite/bin/vite.js','build','--outDir','work/dist-remote-qa'],cwd=ROOT,env=env,stdout=log,stderr=log,check=True)
def check(name,value=True):
 assert value,name
 checks.append(name);print('PASS '+name,flush=True)
def graph(page):return page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def edit(page,value):page.evaluate("value=>window.BlueOceanRuntime.api('dataBridge').transact(g=>{g.service.description=value;return g},'Teste de edição local')",value)
def open_cloud(page):
 page.locator('[data-rt-collab-nav="1"]').first.click();page.locator('#rt1101-collaboration [data-tab=sync]').click();page.get_by_role('button',name='Abrir workspace remoto',exact=True).click();expect(page.locator('.bo-remote-dialog')).to_be_visible()
def account(browser,index):
 context=browser.new_context(viewport={'width':1280,'height':1000},accept_downloads=True);contexts.append(context);page=context.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda error:errors.append(str(error)))
 page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda notice:notice.locator('i').click())
 page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta',exact=True).click();page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('Local QA '+str(index));page.get_by_label('Serviço principal',exact=True).fill('Serviço QA '+str(index));page.get_by_role('button',name='Criar projeto',exact=True).click();open_cloud(page)
 user=fixture['users'][index];dialog=page.locator('.bo-remote-dialog');dialog.get_by_label('E-mail da conta remota',exact=True).fill(user['email']);dialog.get_by_label('Senha da conta remota',exact=True).fill(user['password']);dialog.get_by_role('button',name='Entrar na conta remota',exact=True).click();expect(dialog).to_contain_text('Conectado como');return page,dialog
workspace_name='Workspace QA entre dispositivos'
def invite(dialog,role):
 field=dialog.locator('input[readonly]');previous=field.input_value() if field.count() else '';dialog.get_by_label('Permissão do convite',exact=True).select_option(role);dialog.get_by_role('button',name='Gerar código de convite',exact=True).click();expect(field).not_to_have_value(previous);return field.input_value()
def accept(page,dialog,token):
 dialog.get_by_label('Código de convite',exact=True).fill(token);dialog.get_by_role('button',name='Aceitar convite',exact=True).click();expect(dialog).to_contain_text('Convite aceito');dialog.get_by_role('button',name='Abrir workspace '+workspace_name,exact=True).click();confirm=page.get_by_role('dialog',name='Substituir projeto',exact=True);expect(confirm).to_be_visible();confirm.get_by_role('button',name='Substituir',exact=True).click();expect(dialog).to_be_visible();expect(dialog).to_contain_text('Versão remota carregada.')
def reload_remote(page,dialog):
 dialog.get_by_role('button',name='Carregar versão remota',exact=True).click();confirm=page.get_by_role('dialog',name='Substituir projeto',exact=True);expect(confirm).to_be_visible();confirm.get_by_role('button',name='Substituir',exact=True).click();expect(dialog).to_be_visible();expect(dialog).to_contain_text('Versão remota carregada.')
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  owner,od=account(browser,0);check('Real Auth signs in through the application and issues a session')
  od.get_by_text('Publicar uma cópia do projeto local',exact=True).click();od.get_by_label('Nome do workspace',exact=True).fill(workspace_name);od.get_by_label('Quero enviar este projeto para minha conta remota',exact=True).check();od.get_by_role('button',name='Publicar cópia',exact=True).click();expect(od).to_contain_text('Cópia publicada');expect(od).to_contain_text('Projeto vinculado · versão 1');service_id=graph(owner)['service']['id'];check('Explicit publication persists a private project through PostgREST')
  token=invite(od,'editor');editor,ed=account(browser,1);expect(ed).to_contain_text('Nenhum workspace disponível');check('A second account cannot discover another private workspace')
  accept(editor,ed,token);check('Editor accepts an authenticated invitation and imports the same project',graph(editor)['service']['id']==service_id)
  edit(owner,'Publicado pelo responsável');od.get_by_role('button',name='Salvar no workspace remoto',exact=True).click();expect(od).to_contain_text('Projeto vinculado · versão 2');check('Owner saves create a new authoritative revision')
  edit(editor,'Rascunho simultâneo do editor');ed.get_by_role('button',name='Salvar no workspace remoto',exact=True).click();expect(ed.locator('[role=alert]')).to_contain_text('Outra pessoa publicou alterações',timeout=20000);check('A stale editor sees a conflict without overwriting the owner',graph(editor)['service']['description']=='Rascunho simultâneo do editor')
  with editor.expect_download() as download:ed.get_by_role('button',name='Baixar cópia local',exact=True).click()
  payload=json.loads(Path(download.value.path()).read_text());check('Conflict recovery downloads the complete local draft',payload['graph']['service']['description']=='Rascunho simultâneo do editor')
  reload_remote(editor,ed);check('Explicit reload replaces the draft after checkpointing',graph(editor)['service']['description']=='Publicado pelo responsável')
  edit(editor,'Ajustado pelo editor');ed.get_by_role('button',name='Salvar no workspace remoto',exact=True).click();expect(ed).to_contain_text('Projeto vinculado · versão 3');reload_remote(owner,od);check('Editor publication reaches the owner on a separate browser',graph(owner)['service']['description']=='Ajustado pelo editor')
  with owner.expect_download() as download:od.get_by_role('button',name='Baixar backup da versão 1',exact=True).click()
  initial=json.loads(Path(download.value.path()).read_text());check('Version history downloads preserve the original project',initial['graph']['service'].get('description','')!='Ajustado pelo editor')
  token=invite(od,'viewer');viewer,vd=account(browser,2);accept(viewer,vd,token);expect(vd.get_by_role('button',name='Salvar no workspace remoto',exact=True)).to_be_disabled();check('Viewer has read-only controls and access to the shared project')
  blocked=viewer.evaluate("()=>{try{window.BlueOceanRuntime.api('dataBridge').transact(g=>g);return false}catch{return true}}")
  check('Viewer cannot mutate the canonical project through the runtime',blocked)
  status=viewer.evaluate("""async()=>{const session=JSON.parse(localStorage.getItem('bo.remote.auth.v1')),binding=JSON.parse(localStorage.getItem('bo.remote.binding.v1'));const response=await fetch('/rest/v1/rpc/bo_commit_workspace',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({p_workspace:binding.workspaceId,p_expected:binding.revision,p_payload:{graph:{service:{id:binding.serviceId},journeys:{},views:{}}}})});return response.status}""")
  check('PostgreSQL rejects a direct viewer RPC even when the UI is bypassed',status==403)
  token=invite(od,'commenter');commenter,cd=account(browser,3);accept(commenter,cd,token);cd.get_by_label('Novo comentário',exact=True).fill('Comentário compartilhado de QA');cd.get_by_role('button',name='Publicar comentário',exact=True).click();expect(cd).to_contain_text('Comentário publicado.');od.get_by_role('button',name='Atualizar lista',exact=True).click();expect(od).to_contain_text('Comentário compartilhado de QA');check('Commenters publish shared comments without gaining project editing')
  outsider,xd=account(browser,4);expect(xd).to_contain_text('Nenhum workspace disponível');check('Uninvited accounts remain isolated after sharing with other members')
  member=od.locator('li').filter(has_text=fixture['users'][2]['id']);member.get_by_role('button',name='Remover acesso',exact=True).click();expect(od).to_contain_text('Acesso removido.');vd.get_by_role('button',name='Carregar versão remota',exact=True).click();expect(vd.locator('[role=alert]')).to_contain_text('Sua conta não tem mais acesso');check('Removing an accepted member immediately blocks subsequent remote reads')
  owner.set_viewport_size({'width':390,'height':844});owner.screenshot(path=str(OUT/'remote-mobile.png'));check('Remote account dialog fits a mobile viewport',od.evaluate('e=>e.getBoundingClientRect().right<=innerWidth&&e.getBoundingClientRect().left>=0'))
  axe=ROOT/'node_modules/axe-core/axe.min.js'
  if axe.exists():
   owner.add_script_tag(content=axe.read_text());violations=owner.evaluate("async()=>{const result=await axe.run(document.querySelector('.bo-remote-dialog'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return result.violations.map(value=>({id:value.id,targets:value.nodes.map(node=>node.target)}))}");(OUT/'remote-mobile-axe.json').write_text(json.dumps(violations));check('Remote mobile account dialog has no WCAG AA violations',not violations)
  od.get_by_role('button',name='Sair da conta remota',exact=True).click();expect(od.get_by_role('button',name='Entrar na conta remota',exact=True)).to_be_visible();check('Sign-out drops remote editing authority',owner.evaluate("()=>window.BlueOceanRuntime.api('remoteWorkspace').authority().role")== 'viewer')
  check('No uncaught browser errors',not errors)
  for context in contexts:context.close()
  browser.close()
finally:
 server.shutdown();server.server_close();(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'backend':'Disposable real GoTrue, PostgREST and PostgreSQL; no persistent Auth fixtures'},ensure_ascii=False,indent=2))
print(f'Remote browser: {len(checks)}/{len(checks)} PASS',flush=True)

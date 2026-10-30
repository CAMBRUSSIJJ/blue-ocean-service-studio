#!/usr/bin/env python3
"""Contextual inspector acceptance against the real host and browser storage."""
import functools, json, os, shutil, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'work/blueprint-inspector'; OUT.mkdir(parents=True,exist_ok=True)
checks=[]; errors=[]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
 def copyfile(self,source,output):
  try:super().copyfile(source,output)
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
def check(name,value=True):
 assert value,name
 checks.append(name); print('PASS '+name,flush=True)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1600,'height':1000})
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
  page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
  page.get_by_role('button',name='Abrir workspace local sem conta').click()
  page.get_by_role('button',name='Novo projeto',exact=True).click()
  page.get_by_label('Nome do projeto',exact=True).fill('Sidebar QA')
  page.get_by_label('Serviço principal',exact=True).fill('Atendimento')
  page.get_by_role('button',name='Criar projeto',exact=True).click()
  page.get_by_role('button',name='Criar mapa',exact=True).click()
  page.get_by_role('button',name='Em branco',exact=False).first.click()
  f=page.frame_locator('.bo-blueprint-reference-frame')
  expect(f.locator('.cad-shell')).to_be_visible()
  frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
  def saved():frame.wait_for_function('()=>!cadState.pending&&!cadAutosave.pending&&cadAutosave.dirty.size===0')
  for title in ['Etapa 1','Etapa 2']:
   f.get_by_role('button',name='Adicionar etapa',exact=True).first.click()
   f.locator('#cad-quick-form [name=title]').fill(title)
   f.locator('#cad-quick-form [name=title]').press('Enter')
   expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
  ids={}
  for kind,title in [('channel','WhatsApp'),('pain','Espera sem retorno'),('activity','Confirmar pedido'),('artifact','Comprovante'),('resource','Recurso legado')]:
   f.locator(f'[data-act="cad-add"][data-kind="{kind}"]').click()
   f.locator('#cad-quick-form [name=title]').fill(title)
   f.locator('#cad-quick-form [name=title]').press('Enter')
   expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
   ids[kind]=frame.evaluate('(title)=>Object.values(S.c).flat().find(n=>n.t===title).i',title)
  def select(kind):
   f.get_by_role('button',name='Ajustar',exact=True).click()
   f.locator(f'.cad-node[data-id="{ids[kind]}"]').click()
   expect(f.locator('#cad-component-form')).to_be_visible()
   return f.locator('#cad-component-form')
  def note(kind):return frame.evaluate('(id)=>blueprintNote(id).note',ids[kind])
  def graph():return page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")

  form=select('channel')
  expect(form.get_by_label('Link do canal (opcional)',exact=True)).to_be_visible()
  expect(form.locator('footer')).to_have_count(0)
  expect(form.get_by_role('button',name='Salvar componente',exact=True)).to_have_count(0)
  for key in ['appearance','location']:
   expect(form.locator(f'[data-cad-section={key}]')).not_to_have_attribute('open','')
  expect(form.locator('[data-cad-location]')).to_contain_text('Etapa 1 → Canais')
  check('Canal exposes its link; optional metadata starts collapsed with a location preview')
  field=form.locator('[name=description]'); field.fill('Mensagem de confirmação')
  page.wait_for_timeout(350)
  check('Typing does not write on every keystroke',note('channel')['canvas']['description']=='')
  expect(form.locator('[data-cad-autosave]')).to_have_text('Salvo')
  expect(field).to_be_focused()
  check('Debounce saves through the host without replacing the focused field',note('channel')['canvas']['description']=='Mensagem de confirmação')
  expect(form.locator('[data-cad-autosave]')).to_be_empty(timeout=4000)
  expect(field).to_be_focused()
  check('Saved feedback fades without interrupting editing')
  field.fill('Contato principal'); field.press('Tab'); saved()
  check('Blur saves immediately',note('channel')['canvas']['description']=='Contato principal')
  form.locator('[name=linkUrl]').fill('https://example.org/canal');form.locator('h2').click();saved()
  form=select('pain')
  for name in ['linkUrl','imageUrl','owner','team','channelId','durationMinutes']:
   expect(form.locator(f'[name={name}]')).to_have_count(0)
  check('Dor has only its content and optional metadata, without channel or operational fields')
  form.locator('[name=title]').fill('Dor revisada')
  # Switch before the debounce; the blur must save the previous card by its own ID.
  form=select('channel'); saved()
  expect(form.locator('[name=title]')).to_have_value('WhatsApp')
  check('Switching cards flushes the previous edit without changing the new selection',note('pain')['t']=='Dor revisada')
  form=select('artifact')
  expect(form.locator('[name=evidenceType]')).to_be_visible()
  expect(form.locator('[name=imageUrl]')).to_be_visible()
  expect(form.get_by_label('Link do canal (opcional)',exact=True)).to_have_count(0)
  check('Evidence exposes its own supported media properties')

  form=select('channel')
  frame.evaluate("""()=>{
   window.__holdCanvas=e=>{if(e.data?.type==='canvas-result'){e.stopImmediatePropagation();window.__heldCanvas=e.data}};
   addEventListener('message',window.__holdCanvas,true);
  }""")
  field=form.locator('[name=description]');field.fill('Primeira versão')
  frame.wait_for_function('()=>!!window.__heldCanvas')
  expect(field).to_be_enabled();field.fill('Versão mais recente')
  frame.evaluate("""()=>{removeEventListener('message',window.__holdCanvas,true);dispatchEvent(new MessageEvent('message',{data:window.__heldCanvas,source:parent,origin:location.origin}));delete window.__heldCanvas}""")
  expect(field).to_have_value('Versão mais recente');expect(field).to_be_focused()
  saved()
  check('Text typed during an in-flight save is kept and saved in the next debounced request',note('channel')['canvas']['description']=='Versão mais recente')

  before=graph()
  frame.evaluate("""()=>{
   const original=parent.postMessage;
   parent.postMessage=function(data,...args){
    if(data?.type==='canvas-change'){
     parent.postMessage=original;
     setTimeout(()=>dispatchEvent(new MessageEvent('message',{data:{boBlueprintHost:1,type:'canvas-result',requestId:data.requestId,ok:false,error:'Falha de gravação simulada'},source:parent,origin:location.origin})),0);
    }else return original.call(parent,data,...args);
   };
  }""")
  field.fill('Texto preservado na falha');form.locator('h2').click()
  expect(form.locator('.form-error')).to_have_text('Falha de gravação simulada')
  expect(field).to_have_value('Texto preservado na falha')
  check('A failed save retains the draft and shows inline feedback without changing storage',graph()==before)
  field.fill('Texto recuperado');field.press('Tab');saved()
  expect(form.locator('.form-error')).to_be_empty()
  check('Editing retries a failed save successfully',note('channel')['canvas']['description']=='Texto recuperado')
  form.locator('[name=title]').fill('   ');form.locator('h2').click()
  expect(form.locator('.form-error')).to_contain_text('Informe o nome')
  check('Invalid empty titles do not overwrite the canonical name',note('channel')['t']=='WhatsApp')
  form.locator('[name=title]').fill('WhatsApp');form.locator('h2').click();saved()
  form.locator('[name=linkUrl]').fill('javascript:alert(1)');form.locator('h2').click()
  expect(form.locator('.form-error')).to_contain_text('HTTP ou HTTPS')
  check('Unsafe URLs remain unsaved',note('channel')['canvas']['linkUrl']=='https://example.org/canal')
  form.locator('[name=linkUrl]').fill('https://example.org/canal');form.locator('h2').click();saved()

  location=form.locator('[data-cad-section=location]');location.locator('summary').click()
  form.locator('[name=stageKey]').select_option(index=1);saved()
  location.locator('summary').click()
  expect(form.locator('[data-cad-location]')).to_contain_text('Etapa 2 → Canais')
  check('Location autosaves and its summary remains visible after collapsing')
  page.screenshot(path=str(OUT/'channel-desktop.png'))
  # Hidden metadata must survive changes to a type that does not expose those fields.
  legacy_ref=frame.evaluate('()=>S.operationalResources[0].ref')
  frame.evaluate("""({id,ref})=>{const next=structuredClone(S),entry=blueprintNote(id),note=next.c[entry.key].find(n=>n.i===id);note.activity={...note.activity,owner:'Legado',resourceRefs:[ref]};cadSend('canvas-change',{state:next},id)}""",{'id':ids['pain'],'ref':legacy_ref})
  expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
  form=select('pain');form.locator('[name=description]').fill('Descrição contextual');form.locator('h2').click();saved()
  check('Unexposed legacy attributes are preserved during content edits',note('pain')['activity']['owner']=='Legado' and note('pain')['activity']['resourceRefs']==[legacy_ref])
  page.screenshot(path=str(OUT/'pain-desktop.png'))
  page.reload(wait_until='networkidle')
  page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click()
  page.locator('[data-journey-library]').get_by_role('button',name='Abrir mapa',exact=True).first.click()
  f=page.frame_locator('.bo-blueprint-reference-frame');frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
  form=select('channel')
  expect(form.locator('[name=description]')).to_have_value('Texto recuperado')
  expect(form.locator('[data-cad-location]')).to_contain_text('Etapa 2 → Canais')
  check('Content and location survive a browser reload')
  page.set_viewport_size({'width':390,'height':844})
  expect(f.locator('.cad-mobile-map')).to_be_visible()
  frame=page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
  f.get_by_role('button',name='Próxima etapa',exact=True).click()
  f.locator(f'.cad-mobile-card [data-act="cad-select"][data-id="{ids["channel"]}"]').click()
  expect(f.locator('#cad-inspector-sheet')).to_be_visible()
  form=f.locator('#cad-component-form');field=form.locator('[name=description]');field.fill('Editado no celular')
  expect(form.locator('[data-cad-autosave]')).to_have_text('Salvo')
  expect(field).to_be_focused();expect(f.locator('#cad-inspector-sheet')).to_be_visible()
  check('Mobile autosaves while keeping the sheet and focused field open',note('channel')['canvas']['description']=='Editado no celular')
  page.screenshot(path=str(OUT/'channel-mobile.png'))
  frame.add_script_tag(content=(ROOT/'node_modules/axe-core/axe.min.js').read_text())
  violations=frame.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
  (OUT/'axe.json').write_text(json.dumps(violations,indent=2))
  check('Mobile inspector has no detected WCAG A/AA violations',not violations)
  check('No JavaScript errors',not errors)
  browser.close()
finally:
 server.shutdown();(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
print(f'Contextual inspector: {len(checks)} PASS',flush=True)

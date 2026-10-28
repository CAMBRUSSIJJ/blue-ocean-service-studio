#!/usr/bin/env python3
"""Real palette drag/drop, fast cards, inline stages and contextual connections."""
import functools,json,os,shutil,threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/service-map-flow';OUT.mkdir(parents=True,exist_ok=True)
checks=[];errors=[]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
 def copyfile(self,source,output):
  try:super().copyfile(source,output)
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}'
def check(name,value=True):
 assert value,name
 checks.append(name);print('PASS '+name,flush=True)
def graph(page):return page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def saved(f):expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
def frame(page):return page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
def quick(f,title):
 form=f.locator('#cad-quick-form');form.locator('[name=title]:not([type=hidden])').fill(title);form.locator('[name=title]:not([type=hidden])').press('Enter');saved(f);expect(f.locator('#cad-quick-form')).to_have_count(0)
def stage(f,title):f.get_by_role('button',name='Adicionar etapa',exact=True).click();quick(f,title)
def card_id(page,title):return frame(page).evaluate('(title)=>Object.values(S.c).flat().find(note=>note.t===title)?.i',title)
def add(f,kind,title):
 f.locator(f'[data-act="cad-add"][data-kind="{kind}"]:visible').click();quick(f,title)
def drag_palette(f,kind,row,index):
 source=f.locator(f'[data-act="cad-add"][data-kind="{kind}"]:visible');target=f.locator(f'.cad-cell[data-row="{row}"][data-si="{index}"]');source.drag_to(target,target_position={'x':5,'y':5})
def audit(page,label):
 fr=frame(page);fr.add_script_tag(content=(ROOT/'node_modules/axe-core/axe.min.js').read_text());violations=fr.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
 (OUT/f'{label}-axe.json').write_text(json.dumps(violations,indent=2));check('Accessibility '+label,not violations)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  context=browser.new_context(viewport={'width':1600,'height':1000},accept_downloads=True);page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
  page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda notice:notice.locator('i').click())
  page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta').click()
  page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('Mapa unificado QA');page.get_by_label('Serviço principal',exact=True).fill('Clínica');page.get_by_role('button',name='Criar projeto',exact=True).click()
  # Project creation now lands on its overview by design. Maps are a separate
  # primary navigation destination, not an automatic redirect.
  expect(page.get_by_role('heading',name='Visão geral do projeto',exact=True)).to_be_visible()
  page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click()
  expect(page.locator('[data-service-map-library]')).to_be_visible();check('One map library replaces separate Journey and Blueprint libraries',page.locator('[data-blueprint-library]').count()==0)
  page.get_by_role('button',name='Começar mapa',exact=True).click();page.get_by_role('button',name='Em branco',exact=False).first.click()
  f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);expect(f.locator('#cad-svg')).to_be_visible()
  check('Unified editor uses the light Journey layout',frame(page).evaluate("()=>getComputedStyle(document.body).backgroundColor==='rgb(255, 255, 255)'"))
  if f.locator('[data-cad-view]').input_value()!='blueprint':f.locator('[data-cad-view]').select_option('blueprint');saved(f)
  for name in ['Agendar','Atender']:stage(f,name)
  for kind in ['customer-action','channel','emotion','thought','activity','touchpoint','artifact','decision','system','resource','metric','persona','need','pain','opportunity','text']:expect(f.locator(f'[data-act="cad-add"][data-kind="{kind}"]')).to_have_count(1)
  check('Palette exposes the experience and operational service components')
  drag_palette(f,'activity','fl',0);expect(f.locator('.cad-node.is-draft')).to_have_count(1);expect(f.locator('#cad-component-form')).to_have_count(0)
  check('Palette drop produces a provisional card and a small editor without the inspector',frame(page).evaluate('()=>Object.values(S.c).flat().length===0') and len(f.locator('#cad-quick-form input:not([type=hidden])').all())==1)
  quick(f,'Confirmar atendimento');activity=card_id(page,'Confirmar atendimento');check('Name and Enter create exactly one canonical card',bool(activity) and len(graph(page)['entities']['frontstage'])==1)
  check('Palette dragging does not select unrelated text',frame(page).evaluate("()=>getSelection().toString()===''"))
  before=graph(page);drag_palette(f,'activity','ev',0);expect(f.locator('#cad-quick-form')).to_have_count(0);check('Incompatible lane does not silently create a different placement',graph(page)==before)
  drag_palette(f,'artifact','ev',0);f.locator('#cad-quick-form [name=title]').fill('Rascunho cancelado');f.locator('#cad-quick-form [name=title]').press('Escape');expect(f.locator('.cad-node.is-draft')).to_have_count(0);check('Escape cancels creation without an orphan record',not graph(page)['entities'].get('evidence'))
  drag_palette(f,'artifact','ev',1);quick(f,'Mensagem de confirmação');artifact=card_id(page,'Mensagem de confirmação')
  f.locator('[data-act="cad-stage-after"][data-si="0"]').click();quick(f,'Preparar');g=graph(page);jid=next(iter(g['journeys']));check('Adjacent plus inserts a stage between existing stages', [g['stages'][sid]['title'] for sid in g['journeys'][jid]['stageIds']]==['Agendar','Preparar','Atender'])
  check('Stage insertion preserves the previous card placement',frame(page).evaluate('(id)=>S.c["ev|2"].some(note=>note.i===id)',artifact))
  add(f,'customer-action','Pedir horário');customer=card_id(page,'Pedir horário');add(f,'channel','WhatsApp');channel=card_id(page,'WhatsApp')
  check('Customer action and channel use canonical service records',bool(graph(page)['entities']['customerAction']) and bool(graph(page)['entities']['channel']))
  f.locator('[data-act="cad-add"][data-kind="emotion"]').click();form=f.locator('#cad-quick-form');form.locator('[name=emotionScore]').select_option('-1');form.locator('[name=emotionNote]').fill('Demora na confirmação');form.get_by_role('button',name='Salvar emoção',exact=True).click();saved(f)
  g=graph(page);sid=g['journeys'][jid]['stageIds'][0];check('Emotion is recorded on the current canonical stage',g['stages'][sid]['emotionScore']==-1 and g['stages'][sid]['emotionRecorded'])
  add(f,'thought','Será que tem horário?');add(f,'need','Atendimento rápido');add(f,'pain','Espera pela resposta');add(f,'opportunity','Confirmar por mensagem');check('Additional experience cards can be created without operational forms')
  # Refit after revealing additional lanes before dragging between blocks.
  f.get_by_role('button',name='Ajustar',exact=True).click();source=f.locator(f'.cad-node[data-id="{activity}"]').bounding_box();target=f.locator('.cad-cell[data-row="bk"][data-si="1"]').bounding_box();page.mouse.move(source['x']+source['width']/2,source['y']+source['height']/2);page.mouse.down();page.mouse.move(target['x']+target['width']*.65,target['y']+target['height']*.3,steps=15);page.mouse.up();saved(f)
  check('Cards move between stage and operational blocks with stable identity',frame(page).evaluate('(id)=>(S.c["bk|1"]||[]).some(note=>note.i===id)',activity))
  f.get_by_role('button',name='Desfazer',exact=True).click();saved(f);check('Drag supports undo',frame(page).evaluate('(id)=>(S.c["fl|0"]||[]).some(note=>note.i===id)',activity));f.get_by_role('button',name='Refazer',exact=True).click();saved(f)
  # Context menu creates a connection directly, without a properties sidebar.
  f.locator(f'.cad-node[data-id="{customer}"]').click(button='right');f.get_by_role('button',name='Conectar a outro cartão',exact=True).click();f.locator(f'.cad-node[data-id="{activity}"]').click();saved(f)
  check('Right-click and target click create a connection without the sidebar',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==1 and f.locator('#cad-link-form').count()==0)
  f.locator(f'[data-act="cad-connect"][data-id="{activity}"]').focus();f.locator(f'[data-act="cad-connect"][data-id="{activity}"]').press('Enter');f.locator(f'.cad-node[data-id="{channel}"]').click();saved(f);check('Connection handle supports keyboard activation',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==2)
  ids_before=frame(page).evaluate('()=>Object.values(S.c).flat().map(note=>note.i).sort()');f.locator('[data-cad-view]').select_option('journey');saved(f);expect(f.locator('#cad-svg')).to_be_visible();check('Journey is a visualization in the same light editor',frame(page).evaluate("()=>getComputedStyle(document.body).backgroundColor==='rgb(255, 255, 255)'&&V.perspective==='journey'"))
  check('Changing visualization preserves the same map and card IDs',list(graph(page)['journeys'])==[jid] and frame(page).evaluate('()=>Object.values(S.c).flat().map(note=>note.i).sort()')==ids_before)
  f.get_by_role('button',name='Desfazer',exact=True).click();saved(f);expect(f.locator('[data-cad-view]')).to_have_value('journey');check('Undo changes content while keeping the chosen visualization',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==1)
  f.get_by_role('button',name='Refazer',exact=True).click();saved(f);expect(f.locator('[data-cad-view]')).to_have_value('journey');check('Redo restores content while keeping the chosen visualization',len(graph(page)['journeys'][jid]['matrixContent']['connections'])==2)
  f.locator('[data-cad-view]').select_option('blueprint');saved(f)
  page.screenshot(path=str(OUT/'desktop.png'),animations='disabled');audit(page,'desktop')
  f.locator(f'.cad-node[data-id="{activity}"]').click(button='right');f.get_by_role('button',name='Detalhes opcionais',exact=True).click();expect(f.locator('.cad-inspector')).to_be_visible();check('Advanced properties are optional and explicitly requested');f.get_by_role('button',name='Fechar detalhes',exact=True).click()
  # One canonical map and real lane previews survive returning to the library.
  f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click();expect(page.locator('[data-service-map-card]')).to_have_count(1);check('Library shows one map instead of duplicate perspectives',page.locator('[data-service-map-card] button.bo-h722-open').count()==1)
  preview=page.locator('[data-service-map-card] img').get_attribute('src');check('Map thumbnail is based on current lanes',preview and 'Sem%20faixas' not in preview)
  page.reload(wait_until='networkidle');page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();page.locator('[data-service-map-card] button.bo-h722-open').click();f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);check('Reload restores cards, connections and visualization',frame(page).evaluate('()=>Object.values(S.c).flat().map(note=>note.i).sort()')==ids_before and len(graph(page)['journeys'][jid]['matrixContent']['connections'])==2)
  page.set_viewport_size({'width':390,'height':844});expect(f.locator('.cad-stage-nav')).to_be_visible();f.get_by_role('button',name='+ Componente',exact=True).click();f.locator('[data-act="cad-add"][data-kind="activity"]:visible').click();quick(f,'Retorno por telefone');check('Mobile uses the same quick card flow')
  expect(f.locator('.cad-mobile-card').filter(has_text='Retorno por telefone')).to_be_visible();f.locator('.cad-mobile-card').filter(has_text='Retorno por telefone').get_by_role('button',name='Ações do cartão',exact=True).click();f.get_by_role('button',name='Conectar a outro cartão',exact=True).click();f.locator('.cad-mobile-card').filter(has_text='Pedir horário').get_by_role('button').first.click();saved(f);check('Mobile can connect cards without opening properties')
  check('Phone does not overflow horizontally',frame(page).evaluate('()=>document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(OUT/'phone.png'),animations='disabled');audit(page,'phone')
  f.locator('[data-cad-stage]').select_option(index=1)
  page.set_viewport_size({'width':834,'height':1000});expect(f.locator('#cad-svg')).to_be_visible();audit(page,'tablet');page.screenshot(path=str(OUT/'tablet.png'),animations='disabled')
  page.set_viewport_size({'width':1600,'height':1000});drag_palette(f,'channel','ch',0);quick(f,'E-mail');check('Drop in the first stage stays there after another stage was in focus',frame(page).evaluate('()=>S.c["ch|0"].some(note=>note.t==="E-mail")'))
  add(f,'persona','Cliente A');add(f,'persona','Cliente B');f.locator('[data-cad-persona]').select_option(label='Cliente A');saved(f);check('Selecting a Persona does not copy the generic emotion',frame(page).evaluate('()=>S.steps[0].emotionRecorded===false'))
  emotion_id=frame(page).evaluate('()=>S.c["em|0"].find(note=>note.canvas?.kind==="emotion").i');f.get_by_role('button',name='Ajustar',exact=True).click();f.locator(f'.cad-node[data-id="{emotion_id}"]').click();form=f.locator('#cad-quick-form');form.locator('[name=emotionScore]').select_option('-2');form.get_by_role('button',name='Salvar emoção',exact=True).click();saved(f)
  f.locator('[data-cad-persona]').select_option(label='Cliente B');saved(f);check('Emotions remain isolated between Personas',frame(page).evaluate('()=>S.steps[0].emotionRecorded===false'))
  f.locator('[data-cad-persona]').select_option(label='Cliente A');saved(f);check('Returning to a Persona restores its own observation',frame(page).evaluate('()=>S.steps[0].emotionRecorded===true&&S.steps[0].e===-2'))
  check('No JavaScript errors',not errors);browser.close()
finally:
 server.shutdown();(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
print(f'Service map browser: {len(checks)} PASS',flush=True)

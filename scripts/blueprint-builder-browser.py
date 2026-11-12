#!/usr/bin/env python3
"""Validate the reference-inspired Blueprint interactions on the actual build."""
import functools,json,os,re,shutil,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/blueprint-builder';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_):pass
 def copyfile(self,source,output):
  try:super().copyfile(source,output)
  except (BrokenPipeError,ConnectionResetError):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}'
checks=[]
def check(name,condition=True):
 assert condition,name
 checks.append(name);print('PASS '+name,flush=True)
def graph(page):return page.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def frame(page):return page.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
def saved(f):expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
def create(f,title):
 field=f.locator('#cad-quick-form [name=title]');field.fill(title);field.press('Enter');expect(f.locator('#cad-quick-form')).to_have_count(0);saved(f)
def note(page,title):return frame(page).evaluate('(title)=>Object.values(S.c).flat().find(n=>n.t===title)',title)
def add(f,row,index=0):
 button=f.locator(f'[data-act="cad-cell-add"][data-row="{row}"][data-si="{index}"]');button.focus();button.press('Enter')
 expect(f.locator('.cad-quick--cell')).to_be_visible()
 expect(f.locator('.cad-chooser')).to_have_count(0)

try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or None,args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1600,'height':1000});errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  try:
   page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta',exact=True).click()
   expect(page.get_by_role('heading',name='Bem-vindo ao seu Workspace',exact=True)).to_be_visible();page.screenshot(path=str(OUT/'home.png'),animations='disabled')
   page.get_by_role('button',name='Criar primeiro projeto',exact=True).click();page.get_by_role('button',name='Desenhar um blueprint',exact=False).click();page.get_by_label('Nome do projeto',exact=True).fill('Blueprint · atendimento');page.get_by_role('button',name='Criar projeto e começar',exact=True).click()
   f=page.frame_locator('.bo-blueprint-reference-frame');expect(f.locator('.bo-h756-blueprint')).to_be_visible();saved(f)
   for title in ['Agendamento','Atendimento']:
    f.get_by_role('button',name='Adicionar etapa',exact=True).click();create(f,title)
   # Desktop discovery works with keyboard focus as well as pointer hover.
   page.mouse.move(1570,20)
   button=f.locator('.cad-cell-add[data-row="ac"][data-si="0"]')
   expect(button).to_have_css('opacity','0');f.locator('.cad-cell[data-row="ac"][data-si="0"]').hover(position={'x':5,'y':5});expect(button).to_have_css('opacity','1');expect(f.locator('.cad-cell-group[data-row="ac"][data-si="0"]')).to_have_class(re.compile('is-hovered'));check('Pointer hover highlights the intended cell and reveals Add');page.mouse.move(1570,20);expect(button).to_have_css('opacity','0');button.focus();expect(button).to_have_css('opacity','1');button.press('Enter')
   expect(f.locator('.cad-quick--cell')).to_be_visible();expect(f.locator('#cad-quick-form [name=title]')).to_be_focused()
   check('Keyboard focus reveals Add and opens the cell editor directly')
   frame(page).add_script_tag(content=(ROOT/'node_modules/axe-core/axe.min.js').read_text());violations=frame(page).evaluate("async()=>{const r=await axe.run(document.querySelector('.cad-quick--cell'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}");(OUT/'popover-axe.json').write_text(json.dumps(violations,indent=2));check('The quick editor passes WCAG accessibility checks',not violations);page.screenshot(path=str(OUT/'popover.png'),animations='disabled')
   before=graph(page);f.locator('#cad-quick-form [name=title]').fill('Rascunho descartado');f.locator('#cad-quick-form [name=title]').press('Escape');expect(f.locator('#cad-quick-form')).to_have_count(0)
   check('Escape cancels without creating records',graph(page)==before)
   expect(f.locator('.cad-cell-add[data-row="ac"][data-si="0"]')).to_be_focused()
   add(f,'ac');expect(f.locator('#cad-quick-context')).to_contain_text('Agendamento');expect(f.locator('#cad-quick-context')).to_contain_text('Ações do cliente');create(f,'Pedir horário')
   first=note(page,'Pedir horário');check('Enter creates a canonical customer action in the chosen stage and lane',first['canvas']['kind']=='customer-action' and bool(graph(page)['entities']['customerAction']))
   add(f,'ac');create(f,'Escolher o profissional')
   check('The same populated cell can receive another card',note(page,'Escolher o profissional')['canvas']['kind']=='customer-action')
   check('The add control fits below both cards',frame(page).evaluate("()=>{const row=cadState.layout.rows.find(r=>r.id==='ac');const last=Math.max(...cadState.layout.nodes.filter(n=>n.row==='ac'&&n.stageIndex===0).map(n=>n.y+n.height));return last+40<=row.y+row.height;}"))
   add(f,'ev');f.locator('#cad-quick-form [name=title]').fill('Mensagem de confirmação');f.locator('.cad-quick-details summary').click();f.locator('[data-cad-quick-kind]').select_option('channel');expect(f.locator('#cad-quick-form [name=title]')).to_have_value('Mensagem de confirmação');create(f,'Mensagem de confirmação')
   check('Optional component selection preserves the text and explicit destination',note(page,'Mensagem de confirmação')['canvas']['kind']=='channel' and frame(page).evaluate("()=>S.c['ev|0'].some(n=>n.t==='Mensagem de confirmação')"))
   before=graph(page);add(f,'ch',1);f.locator('#cad-quick-form [name=title]').fill('Não salvar');f.locator('.cad-quick-backdrop').click(position={'x':5,'y':5});expect(f.locator('#cad-quick-form')).to_have_count(0)
   check('Clicking outside cancels an unsaved card',graph(page)==before)
   # Existing edit path keeps card identity and canonical references.
   f.locator(f'.cad-node[data-id="{first["i"]}"]').focus();f.locator(f'.cad-node[data-id="{first["i"]}"]').press('Enter');create(f,'Solicitar um horário')
   check('Inline editing preserves the existing card ID',note(page,'Solicitar um horário')['i']==first['i'])
   if f.locator('.cad-inspector').count() and f.locator('.cad-inspector').is_visible():f.locator('.cad-inspector [data-act="cad-close"]').click()
   f.get_by_role('button',name='Ajustar',exact=True).click()
   (OUT/'desktop-layout.json').write_text(json.dumps(frame(page).evaluate("()=>({camera:cadState.camera,layout:{width:cadState.layout.width,height:cadState.layout.height},svg:document.querySelector('#cad-svg').getBoundingClientRect().toJSON(),viewport:document.querySelector('.cad-viewport').getBoundingClientRect().toJSON(),world:document.querySelector('#cad-world').getAttribute('transform'),cards:[...document.querySelectorAll('.cad-node')].map(n=>n.getBoundingClientRect().toJSON())})"),indent=2))
   expect(f.locator('.cad-node').first).to_be_visible()
   check('Saved cards remain visible after closing details and fitting the map')
   page.mouse.move(1580,30)
   second=note(page,'Escolher o profissional');port=f.locator(f'.cad-port[data-id="{second["i"]}"]')
   expect(port).to_have_css('opacity','0');f.locator(f'.cad-node[data-id="{second["i"]}"]').hover();expect(port).to_have_css('opacity','1');page.mouse.move(1580,30);expect(port).to_have_css('opacity','0');port.focus();expect(port).to_have_css('opacity','1')
   check('Unselected card controls appear on hover or keyboard focus')
   f.locator('[data-f="title"]').focus();page.mouse.move(1580,30)
   page.screenshot(path=str(OUT/'desktop.png'),animations='disabled')
   # Lane controls hide views, retaining records and proper service boundaries.
   f.locator('.cad-library').hover();f.locator('[data-act="cad-sidebar-tab"][data-tab="lanes"]').click()
   f.locator('[data-act="cad-lanes-show-all"]').click();saved(f)
   check('Blueprint keeps frontstage, backstage and support as independent lanes',all(f.locator(f'.cad-reference-lane[data-lane="{r}"]').count()==1 for r in ['fl','bk','sy']))
   labels=f.locator('.cad-boundary-name').all_text_contents();check('All three methodological boundaries remain visible',len(labels)==3 and any('VISIBILIDADE' in label for label in labels))
   f.locator('.cad-library').hover();f.locator('[data-act="cad-lane-toggle"][data-id="ac"]').click();saved(f);expect(f.locator('.cad-reference-lane[data-lane="ac"]')).to_have_count(0)
   check('Hiding a lane retains its saved cards',note(page,'Solicitar um horário')['i']==first['i'])
   f.locator('.cad-library').hover();f.locator('[data-act="cad-lane-toggle"][data-id="ac"]').click();saved(f)
   # Real reload through the project's Home uses the same saved map.
   page.reload(wait_until='networkidle');expect(page.get_by_role('heading',name='Bem-vindo ao seu Workspace',exact=True)).to_be_visible();page.locator('[data-sidebar-item="maps"]').click();page.locator('[data-service-map-card] button.bo-h722-open').first.click();saved(f)
   check('Reload restores the cards and their identities',note(page,'Solicitar um horário')['i']==first['i'] and note(page,'Escolher o profissional'))
   page.set_viewport_size({'width':390,'height':844});expect(f.locator('.cad-mobile-map')).to_be_visible();f.locator('[data-cad-stage]').select_option(index=0)
   mobile=f.locator('.cad-mobile-lane[data-row="ac"] > [data-act="cad-cell-add"]');expect(mobile).to_be_visible();mobile.click();create(f,'Confirmar pelo celular')
   check('Touch layout keeps Add visible and saves in the same real map',bool(note(page,'Confirmar pelo celular')))
   page.screenshot(path=str(OUT/'mobile.png'),animations='disabled')
   check('Mobile editor has no horizontal page overflow',frame(page).evaluate('document.documentElement.scrollWidth<=innerWidth+3'))
   check('No uncaught browser errors',not errors)
   (OUT/'result.json').write_text(json.dumps({'checks':checks,'errors':errors},ensure_ascii=False,indent=2))
  except Exception:
   page.screenshot(path=str(OUT/'failure.png'),animations='disabled');(OUT/'failure.txt').write_text(page.locator('body').inner_text()+'\n'+str(errors));raise
  finally:browser.close()
finally:server.shutdown()

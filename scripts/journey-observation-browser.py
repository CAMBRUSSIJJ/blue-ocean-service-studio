#!/usr/bin/env python3
"""Task acceptance of the independent observational specification B03–B08."""
import functools,json,os,shutil,threading
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/journey-observation';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*_): pass
 def copyfile(self,source,output):
  try: super().copyfile(source,output)
  except (BrokenPipeError,ConnectionResetError): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}';checks=[]
def check(name,ok):
 assert ok,name
 checks.append(name);print('PASS '+name,flush=True)
def graph(p): return p.evaluate("()=>window.BlueOceanRuntime.api('dataBridge').get()")
def saved(f): expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
def frame(p): return p.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
def add(f,key,kind):
 f.locator(f'[data-cell="{key}"]>.content-add').click();f.get_by_role('button',name='Adicionar '+kind,exact=True).click()
def inline(f,key,value,kind='Texto'):
 add(f,key,kind);field=f.locator(f'[data-cell="{key}"] [data-ed="c"]').last;expect(field).to_be_focused();field.fill(value);field.press('Tab');saved(f)
def audit(p,label):
 fr=frame(p);fr.add_script_tag(content=(ROOT/'node_modules/axe-core/axe.min.js').read_text());result=fr.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
 (OUT/(label+'-axe.json')).write_text(json.dumps(result,indent=2));check('No axe violations: '+label,not result)
def stage(f,name):
 f.get_by_role('button',name='Adicionar etapa',exact=True).click();f.get_by_role('textbox',name='Nome da nova etapa',exact=True).fill(name);f.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click();saved(f)
def tool(f,name):
 f.get_by_role('button',name='+ Adicionar faixa',exact=True).click();f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).fill(name);f.get_by_role('button',name='Mostrar '+name,exact=True).click();saved(f)
def link(f,key,kind,record):
 add(f,key,kind);dialog=f.locator('#element-selector');dialog.locator('[data-act="elements-select"][data-source="'+record+'"]').click();dialog.get_by_role('button',name='Vincular à etapa',exact=True).click();saved(f)
def persona(f,id):
 f.get_by_role('combobox',name='Persona da jornada',exact=True).select_option(id);saved(f);expect(f.get_by_role('combobox',name='Persona da jornada',exact=True)).to_be_enabled()
def preset(f,name):
 f.locator('.toolbar>.menu').first.locator('summary').click();f.get_by_role('button',name=name,exact=False).click();saved(f)
def manager(f):
 f.get_by_role('button',name='Visualizações',exact=True).click();return f.get_by_role('dialog',name='Visualizações salvas',exact=True)
def capture(f,name):
 d=manager(f);d.get_by_label('Nome da visualização',exact=True).fill(name);d.get_by_role('button',name='Salvar visualização atual',exact=True).click();expect(d.get_by_role('button',name='Aplicar visualização '+name,exact=True)).to_be_enabled();return d
def visible_rows(f):return f.locator('.matrix>.r[data-row]:not([data-row="st"])').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.row)')
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
  page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta').click();page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('QA Especificação independente');page.get_by_label('Serviço principal',exact=True).fill('Atendimento');page.get_by_role('button',name='Criar projeto',exact=True).click();page.locator('.bo-h724-journey-pane').get_by_role('button',name='Criar Jornada',exact=True).click();page.get_by_role('button',name='Em branco').first.click()
  f=page.frame_locator('.bo-blueprint-reference-frame');expect(f.get_by_role('button',name='Adicionar etapa',exact=True)).to_be_visible();stage(f,'Descobrir');stage(f,'Usar');state=graph(page);jid=next(iter(state['journeys']));sid,second=state['journeys'][jid]['stageIds']
  f.get_by_role('button',name='+ Adicionar faixa',exact=True).click();f.get_by_role('button',name='Faixa personalizada →',exact=True).click();f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).fill('texto');f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).press('Enter');field=f.locator('[data-ed="ln"]').last;lane=f.locator('.r[data-row^="x"]').last.get_attribute('data-row');field.fill('Observações');field.press('Tab');saved(f);key=lane+'|0'
  inline(f,key,'A');inline(f,key,'C');initial=graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane];original_ids=[n['id'] for n in initial]
  f.locator(f'[data-cell="{key}"]>.content-insert').nth(1).click();f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).press('Enter');field=f.locator(f'[data-cell="{key}"] [data-ed="c"]').nth(1);expect(field).to_be_focused();field.fill('B');field.press('Tab');saved(f);notes=graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane]
  check('B03: insertion between existing cards retains their identities and order',[n['text'] for n in notes]==['A','B','C'] and [notes[0]['id'],notes[2]['id']]==original_ids)
  slot=f.locator(f'[data-cell="{key}"]>.content-insert').nth(1);slot.click();f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).press('Escape');expect(slot).to_be_focused();check('B03: cancelling intermediate insertion creates no card',len(graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane])==3)
  f.get_by_role('button',name='Configurar faixa Observações',exact=True).click();f.get_by_label('Conteúdo padrão',exact=True).select_option('emoji');f.get_by_role('button',name='Salvar faixa',exact=True).click();saved(f)
  f.locator(f'[data-cell="{key}"]>.content-add').click();f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True).press('Enter');d=f.get_by_role('dialog',name='Adicionar emoji',exact=True);expect(d).to_be_visible();d.get_by_label('Significado do emoji',exact=True).fill('Satisfeito');d.get_by_role('button',name='Salvar elemento',exact=True).click();saved(f)
  check('B04: empty search Enter selects the lane default',graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane][-1]['type']=='emoji')
  f.locator(f'[data-cell="{key}"]>.content-add').click();search=f.get_by_role('searchbox',name='Buscar tipo de conteúdo',exact=True);search.fill('texto');expect(f.locator('.picker-option[data-quick]:visible')).to_have_count(0);expect(f.locator('.picker-option:visible').first).to_have_attribute('data-type','text');search.press('Enter');field=f.locator(f'[data-cell="{key}"] [data-ed="c"]').last;field.fill('Texto por busca');field.press('Tab');saved(f);check('B04: a nonempty query overrides the default',graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane][-1]['type']=='text')
  page.evaluate("""()=>window.BlueOceanRuntime.api('dataBridge').transact(g=>{const now=new Date().toISOString();for(const [kind,id,title] of [['persona','qa-a','Marina'],['persona','qa-b','João'],['channel','qa-channel','WhatsApp']]){g.entities[kind]||={};g.entities[kind][id]={id,type:kind,serviceId:g.service.id,title,createdAt:now,updatedAt:now}}return g},'Dados fictícios de aceitação')""");saved(f)
  link(f,key,'Canal','qa-channel');block=f.locator(f'[data-cell="{key}"]>.content-block').last;block.focus();block.press('Control+d');saved(f);notes=graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane]
  check('B05: Ctrl+D duplicates a linked card with a new local identity and the same source',notes[-1]['id']!=notes[-2]['id'] and notes[-1]['referenceId']==notes[-2]['referenceId']=='qa-channel' and len(graph(page)['entities']['channel'])==1)
  block=f.locator(f'[data-cell="{key}"]>.content-block').last;expect(block).to_be_focused();block.press('Delete');saved(f);count=len(graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane]);f.get_by_role('button',name='Desfazer',exact=True).click();saved(f);expect(f.locator(f'[data-cell="{key}"]>.content-block')).to_have_count(count+1);f.get_by_role('button',name='Refazer',exact=True).click();saved(f);check('B05: Delete and undo/redo retain the canonical source',len(graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane])==count and len(graph(page)['entities']['channel'])==1)
  field=f.locator(f'[data-cell="{key}"] [data-ed="c"]').first;field.fill('AB');field.evaluate("el=>el.dispatchEvent(new KeyboardEvent('keydown',{key:'d',ctrlKey:true,bubbles:true,cancelable:true}))");field.press('End');field.press('Backspace');field.press('Tab');saved(f);check('B05: shortcuts do not duplicate or remove the card while editing text',len(graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane])==count)
  persona(f,'qa-a');preset(f,'Jornada essencial');f.get_by_role('button',name='Personalizar visualização',exact=True).click();f.locator('[data-act="row-move"][data-id="ac"][data-d="-1"]').click();f.locator('[data-act="row-move"][data-id="ac"][data-d="-1"]').click();f.get_by_role('button',name='Concluir',exact=True).click();saved(f);d=capture(f,'Revisão');d.get_by_role('button',name='Voltar ao mapa',exact=True).click();review_rows=visible_rows(f)
  persona(f,'qa-b');preset(f,'Visão operacional');inline(f,'bk|0','BASTIDORES_EXCLUSIVO');d=capture(f,'Operação');d.get_by_role('button',name='Voltar ao mapa',exact=True).click();inline(f,'ac|0','Dado atual compartilhado')
  d=manager(f);d.get_by_role('button',name='Aplicar visualização Revisão',exact=True).click();expect(d).not_to_be_visible();saved(f)
  # The P6 Persona focus intentionally hides unassigned cards without deleting canonical actions.
  view_graph=graph(page)
  check('B06: saved view restores Persona and rows without losing filtered map data',
   visible_rows(f)==review_rows and
   f.get_by_role('combobox',name='Persona da jornada',exact=True).input_value()=='qa-a' and
   f.locator('[data-cell="ac|0"] [data-ed="c"]').count()==0 and
   view_graph['stages'][sid]['customerAction']=='Dado atual compartilhado' and
   len(view_graph['journeys'])==1)
  d=manager(f);d.get_by_label('Nome da visualização',exact=True).fill('revisão');d.get_by_role('button',name='Salvar visualização atual',exact=True).click();expect(d.locator('.form-error')).to_contain_text('Já existe');check('B07: duplicate names are rejected without saving another configuration',len(graph(page)['journeys'][jid]['savedMatrixViews'])==2)
  original=graph(page)['journeys'][jid]['savedMatrixViews'][0];d.get_by_role('button',name='Renomear visualização Revisão',exact=True).click();d.get_by_label('Novo nome',exact=True).fill('Equipe');d.get_by_role('button',name='Renomear visualização',exact=True).click();expect(d.get_by_role('button',name='Aplicar visualização Equipe',exact=True)).to_be_enabled();check('B07: renaming preserves the captured configuration',graph(page)['journeys'][jid]['savedMatrixViews'][0]['view']==original['view'])
  d.get_by_role('button',name='Aplicar visualização Operação',exact=True).click();saved(f);d=manager(f);d.get_by_role('button',name='Atualizar visualização Equipe',exact=True).click();expect(d.get_by_role('button',name='Aplicar visualização Equipe',exact=True)).to_be_enabled();check('B07: updating explicitly captures the current Persona',graph(page)['journeys'][jid]['savedMatrixViews'][0]['personaId']=='qa-b');d.get_by_role('button',name='Excluir visualização Equipe',exact=True).click();expect(d.get_by_role('button',name='Aplicar visualização Equipe',exact=True)).to_have_count(0);d.get_by_role('button',name='Voltar ao mapa',exact=True).click();f.get_by_role('button',name='Desfazer',exact=True).click();saved(f);check('B07: undo restores an excluded configuration without touching the map',len(graph(page)['journeys'][jid]['savedMatrixViews'])==2 and graph(page)['stages'][sid]['customerAction']=='Dado atual compartilhado')
  preset(f,'Jornada essencial');d=capture(f,'Cliente');d.get_by_role('button',name='Apresentar visualização atual',exact=True).click();expected=review_rows;rendered=f.locator('[data-report-row]').evaluate_all('(nodes)=>[...new Set(nodes.map(n=>n.dataset.reportRow))]');check('B08: presentation includes exactly the visible row set',rendered==expected and 'BASTIDORES_EXCLUSIVO' not in f.locator('.executive-report').inner_text())
  with page.expect_download() as download:f.get_by_role('button',name='Baixar resumo HTML',exact=True).click()
  exported=Path(download.value.path()).read_text()
  export_checks={'viewHeading':'VISUALIZAÇÃO ATUAL' in exported,'otherPersonaUnassignedHidden':'Dado atual compartilhado' not in exported,'backstageHidden':'BASTIDORES_EXCLUSIVO' not in exported}
  if not all(export_checks.values()):print('EXPORT_DIAGNOSTIC',export_checks,flush=True)
  check('B08: the downloadable HTML respects the saved view and Persona filter',all(export_checks.values()))
  f.get_by_role('button',name='Voltar ao mapa',exact=True).click();f.get_by_role('button',name='Apresentar',exact=True).click();check('B08: the full executive summary remains separately available','BASTIDORES_EXCLUSIVO' in f.locator('.executive-report').inner_text());f.get_by_role('button',name='Voltar ao mapa',exact=True).click()
  preset(f,'Matriz completa');f.get_by_role('button',name='Mover etapa para a direita',exact=True).first.click();saved(f);f.get_by_role('button',name='Voltar para Jornadas e Blueprints',exact=True).click();page.reload(wait_until='networkidle');page.get_by_role('button',name='Abrir Jornadas e Blueprints',exact=True).click();page.get_by_role('button',name='Abrir Jornada',exact=True).first.click();f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);notes=graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane];check('B03/B06: stage reorder and reload preserve card identities and named configurations',notes[1]['text']=='B' and notes[2]['id']==original_ids[1] and graph(page)['journeys'][jid]['stageIds']==[second,sid] and len(graph(page)['journeys'][jid]['savedMatrixViews'])==3)
  for width in [1440,834,390]:
   page.set_viewport_size({'width':width,'height':1000});d=manager(f);audit(page,f'views-{width}');box=d.bounding_box();check(f'Saved views fit inside the viewport at {width}px',box['x']>=0 and box['x']+box['width']<=width and box['height']<=1000);page.screenshot(path=str(OUT/f'views-{width}.png'),animations='disabled');d.get_by_role('button',name='Voltar ao mapa',exact=True).click();audit(page,f'map-{width}')
  f.get_by_role('button',name='Voltar para Jornadas e Blueprints',exact=True).click();touch=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,storage_state=page.context.storage_state());mobile=touch.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.add_locator_handler(mobile.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click());mobile.goto(URL,wait_until='networkidle');mobile.get_by_role('button',name='Abrir workspace local sem conta').click();mobile.get_by_role('button',name='Abrir navegação',exact=True).click();mobile.get_by_role('button',name='Abrir Jornadas e Blueprints',exact=True).click();mobile.get_by_role('button',name='Abrir Jornada',exact=True).first.click();mf=mobile.frame_locator('.bo-blueprint-reference-frame');saved(mf)
  key=lane+'|1';slot=mf.locator(f'[data-cell="{key}"]>.content-insert').nth(1);slot.tap();mf.get_by_role('button',name='Adicionar Texto',exact=True).tap();field=mf.locator(f'[data-cell="{key}"] [data-ed="c"]').nth(1);field.fill('TOQUE');field.press('Tab');saved(mf);check('B03: touch inserts at the selected intermediate point',graph(mobile)['journeys'][jid]['matrixContent']['cells'][sid][lane][1]['text']=='TOQUE')
  d=manager(mf);d.get_by_role('button',name='Aplicar visualização Cliente',exact=True).tap();saved(mf);check('B06: touch applies a saved view without dropping map data',visible_rows(mf)==review_rows and graph(mobile)['journeys'][jid]['matrixContent']['cells'][sid][lane][1]['text']=='TOQUE');audit(mobile,'touch-map');touch.close()
  check('No uncaught browser errors',not errors);(OUT/'results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));browser.close()
except Exception:
 print('Browser errors:',errors if 'errors' in globals() else [],flush=True)
 raise
finally:server.shutdown();server.server_close()

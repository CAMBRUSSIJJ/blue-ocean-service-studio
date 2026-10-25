#!/usr/bin/env python3
"""Acceptance of mixed matrix content, canonical projections and responsive composition."""
import base64,functools,json,os,shutil,threading,tempfile
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from map_browser_support import use_matrix, matrix_perspective
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/journey-content';OUT.mkdir(parents=True,exist_ok=True)
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
def saved(f):
    expect(f.locator('[data-save-status]')).to_have_text('Salvo neste navegador')
    use_matrix(f)
def frame(p): return p.locator('.bo-blueprint-reference-frame').element_handle().content_frame()
def add(f,key,kind):
 f.locator(f'[data-cell="{key}"]>.content-add').click();f.get_by_role('button',name='Adicionar '+kind,exact=True).click()
def inline(f,key,value,kind='Texto'):
 add(f,key,kind);field=f.locator(f'[data-cell="{key}"] [data-ed="c"]').last;expect(field).to_be_focused();field.fill(value);field.press('Tab');saved(f)
def menu(f,key,index=0): f.locator(f'[data-cell="{key}"] .note-menu summary').nth(index).click()
def audit(p,label):
 fr=frame(p);fr.add_script_tag(content=(ROOT/'node_modules/axe-core/axe.min.js').read_text());result=fr.evaluate("async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}")
 (OUT/(label+'-axe.json')).write_text(json.dumps(result,indent=2));check('No axe violations: '+label,not result)
def row(f,template):
 f.get_by_role('button',name='+ Adicionar faixa',exact=True).click();f.get_by_role('button',name='Modelos de faixa →',exact=True).click();f.locator('#content-picker').get_by_role('button',name=template,exact=False).click();saved(f)
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.add_locator_handler(page.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click())
  page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta').click();page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('QA Conteúdo da Jornada');page.get_by_label('Serviço principal',exact=True).fill('Atendimento');page.get_by_role('button',name='Criar projeto',exact=True).click();page.get_by_role('button',name='Criar mapa',exact=True).click();page.get_by_role('button',name='Em branco').first.click()
  f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);expect(f.get_by_role('button',name='Adicionar etapa',exact=True)).to_be_visible();jid=next(iter(graph(page)['journeys']))
  for title in ['Descobrir','Solicitar']:
   height=f.locator('[data-row="st"]').bounding_box()['height'];f.get_by_role('button',name='Adicionar etapa',exact=True).click();check('The stage draft floats without increasing header height: '+title,f.locator('[data-row="st"]').bounding_box()['height']<=height+1);f.get_by_role('textbox',name='Nome da nova etapa',exact=True).fill(title);f.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click();saved(f)
  sid,sid2=graph(page)['journeys'][jid]['stageIds']
  inline(f,'ac|0','Pesquisar opções de atendimento','Cartão');check('Cards still update the canonical customer action',graph(page)['stages'][sid]['customerAction']=='Pesquisar opções de atendimento')
  inline(f,'sd|0','Fala do cliente: preciso de uma resposta clara.');check('Additional text preserves the independent canonical context',not graph(page)['stages'][sid].get('thoughts') and graph(page)['journeys'][jid]['matrixContent']['cells'][sid]['sd'][0]['text'].startswith('Fala'))
  add(f,'em|0','Emoji');dialog=f.get_by_role('dialog',name='Adicionar emoji',exact=True);dialog.get_by_label('Significado do emoji').fill('Incerteza relatada');dialog.get_by_role('button',name='Preocupação',exact=True).click();dialog.get_by_role('button',name='Salvar elemento',exact=True).click();saved(f)
  check('A decorative emoji preserves its meaning and does not invent an emotion measurement',f.locator('[data-cell="em|0"] .content-emoji').get_attribute('aria-label')=='Incerteza relatada' and not graph(page)['stages'][sid]['emotionRecorded'])
  f.get_by_role('button',name='+ Adicionar faixa',exact=True).click();f.get_by_role('button',name='Cancelar',exact=True).click();check('Cancelling a lane draft creates no placeholder',not graph(page)['journeys'][jid]['matrixContent']['rows'])
  row(f,'Canais');lane=f.locator('.r[data-row^="x"]').last.get_attribute('data-row');key=lane+'|0';inline(f,key,'WhatsApp','Cartão')
  check('A lane template supplies an icon and default content without copying service data',graph(page)['journeys'][jid]['matrixContent']['rows'][lane]['icon']=='📱' and f.locator(f'[data-cell="{key}"] .content-icon').inner_text()=='📱')
  add(f,key,'Link');dialog=f.get_by_role('dialog',name='Adicionar link',exact=True);dialog.get_by_label('Título do link').fill('Roteiro de atendimento');dialog.get_by_label('Endereço do link').fill('javascript:alert(1)');dialog.get_by_role('button',name='Salvar elemento',exact=True).click();expect(dialog.locator('.form-error')).to_contain_text('HTTP');check('An unsafe link is rejected without changing saved content',len(graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane])==1);dialog.get_by_label('Endereço do link').fill('https://example.com/roteiro');dialog.get_by_role('button',name='Salvar elemento',exact=True).click();saved(f)
  link=f.locator(f'[data-cell="{key}"] a.content-link');check('Reference links use explicit titles and safe external navigation',link.get_attribute('href')=='https://example.com/roteiro' and 'noopener' in link.get_attribute('rel'))
  add(f,key,'Imagem');dialog=f.get_by_role('dialog',name='Adicionar imagem',exact=True);dialog.get_by_label('Descrição da imagem').fill('Tela com a confirmação do atendimento');dialog.get_by_label('Fonte ou autoria').fill('Imagem fictícia de QA')
  dialog.get_by_label('Arquivo de imagem').set_input_files({'name':'grande.png','mimeType':'image/png','buffer':b'x'*(500*1024+1)});expect(dialog.locator('.form-error')).to_contain_text('500 KB')
  fixture=Path(tempfile.gettempdir())/'blue-ocean-content-qa.png';fixture.write_bytes(base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAALQAAABaCAIAAACe4euXAAAA7klEQVR4nO3SMQHAIADAMMC/xDnAAdcMrDc7EgU9Op99BnxZtwP4L3OQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcJHOQzEEyB8kcpBeAeQN195evIQAAAABJRU5ErkJggg=='))
  dialog.get_by_label('Arquivo de imagem').set_input_files(str(fixture));expect(dialog.locator('[data-image-status]')).to_contain_text('KB');audit(page,'image-dialog-desktop');dialog.get_by_role('button',name='Salvar elemento',exact=True).click();saved(f)
  check('Image files retain accessible descriptions and attribution in the real document',f.locator(f'[data-cell="{key}"] img').get_attribute('alt')=='Tela com a confirmação do atendimento' and graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane][-1]['url'].startswith('data:image/png'))
  inline(f,key,'<script>window.badContent=true</script>');check('Rich and plain content remains escaped',frame(page).evaluate('!window.badContent') and f.locator(f'[data-cell="{key}"] script').count()==0)
  menu(f,key,2);f.locator(f'[data-cell="{key}"] [data-act="dn"]').nth(2).click();saved(f);check('Duplicating an image preserves its type, data and credit',f.locator(f'[data-cell="{key}"] img').count()==2)
  f.get_by_role('button',name='Desfazer',exact=True).click();expect(f.locator(f'[data-cell="{key}"] img')).to_have_count(1);f.get_by_role('button',name='Refazer',exact=True).click();expect(f.locator(f'[data-cell="{key}"] img')).to_have_count(2);check('Mixed-content duplication participates in undo and redo',True)
  menu(f,key,3);f.locator(f'[data-cell="{key}"] [data-act="rn"]').nth(3).click();saved(f)
  menu(f,key,0);f.locator(f'[data-cell="{key}"] [data-act="content-move"]').first.click();f.get_by_role('dialog',name='Mover elemento',exact=True).get_by_label('Etapa de destino').select_option('1');f.get_by_role('button',name='Mover elemento',exact=True).click();saved(f)
  check('Keyboard movement preserves type and icon under the destination stage identity',graph(page)['journeys'][jid]['matrixContent']['cells'][sid2][lane][0]['icon']=='📱')
  f.get_by_role('button',name='Configurar faixa Canais',exact=True).click();dialog=f.get_by_role('dialog',name='Configurar faixa',exact=True);dialog.get_by_label('Nome da faixa',exact=True).fill('Canais e referências');dialog.get_by_label('Descrição da faixa',exact=True).fill('Onde o relacionamento acontece');dialog.get_by_label('Conteúdo padrão',exact=True).select_option('emoji');audit(page,'row-dialog-desktop');dialog.get_by_role('button',name='Salvar faixa',exact=True).click();saved(f)
  check('Changing lane settings preserves existing mixed content',f.locator(f'[data-cell="{key}"] img').count()==1 and f.locator(f'[data-cell="{key}"] a').count()==1)
  f.locator(f'[data-cell="{key}"]>.content-add').click();expect(f.locator('.content-choice[data-type="emoji"] .picker-default')).to_be_visible();audit(page,'type-picker-desktop');f.get_by_role('button',name='Fechar tipos de conteúdo',exact=True).click()
  f.locator('.sh').first.get_by_role('button',name='Mover etapa para a direita',exact=True).click();saved(f);check('Reordering stages carries every content type and row settings',graph(page)['journeys'][jid]['stageIds'][1]==sid and graph(page)['journeys'][jid]['matrixContent']['cells'][sid][lane][0]['type']=='link');f.get_by_role('button',name='Desfazer',exact=True).click();expect(f.locator('.sh [data-ed="sn"]').first).to_have_text('Descobrir')
  check('Image captions keep the available card width instead of collapsing beside the image',f.locator('.content-block.type-image').first.evaluate('e=>e.querySelector(".n").getBoundingClientRect().width>=e.getBoundingClientRect().width*.8'))
  source=f.locator(f'[data-cell="{key}"] .content-block.type-link .gh');destination=f.locator(f'[data-cell="{lane}|1"] .content-block .n').first;expect(f.locator('.content-block.type-image img')).to_be_visible();f.locator('.content-block.type-image img').evaluate('img=>img.decode()');source.hover();source.drag_to(destination);saved(f)
  check('Dragging mixed content between stages preserves its link and identity',any(n.get('url')=='https://example.com/roteiro' for n in graph(page)['journeys'][jid]['matrixContent']['cells'][sid2][lane]))
  idx=next(i for i,n in enumerate(graph(page)['journeys'][jid]['matrixContent']['cells'][sid2][lane]) if n['type']=='link');menu(f,lane+'|1',idx);f.locator(f'[data-cell="{lane}|1"] [data-act="content-move"]').nth(idx).click();f.get_by_role('dialog',name='Mover elemento',exact=True).get_by_label('Etapa de destino').select_option('0');f.get_by_role('button',name='Mover elemento',exact=True).click();saved(f)
  f.get_by_role('button',name='Apresentar',exact=True).click();expect(f.locator('.executive-report img')).to_have_count(1);check('Executive presentation includes custom lanes, symbols, images, links and attribution',f.get_by_text('Imagem fictícia de QA',exact=True).count()==1 and f.locator('.executive-report a[href="https://example.com/roteiro"]').count()==1)
  with page.expect_download() as download:f.get_by_role('button',name='Baixar resumo HTML',exact=True).click()
  export=Path(download.value.path()).read_text();check('Standalone export includes the real image and safe rich content','data:image/png;base64,' in export and '&lt;script&gt;' in export and '<script>' not in export and 'Canais e referências' in export)
  f.get_by_role('button',name='Voltar ao mapa',exact=True).click();f.locator('.tools-menu summary').click()
  with page.expect_download() as download:f.get_by_role('button',name='Baixar backup do projeto',exact=True).click()
  backup=Path(download.value.path()).read_text();check('Project backup includes typed content and row settings','matrixContent' in backup and 'Imagem fictícia de QA' in backup and 'Onde o relacionamento acontece' in backup)
  payload=json.loads(backup);page.evaluate("data=>{window.__contentImport='pending';window.BlueOceanRuntime.api('dataBridge').import(data).then(()=>window.__contentImport='ok').catch(e=>window.__contentImport=String(e))}",payload);page.get_by_role('dialog',name='Substituir projeto',exact=True).get_by_role('button',name='Substituir',exact=True).click();page.wait_for_function("window.__contentImport==='ok'");saved(f)
  check('Importing the real backup restores image data, attribution, row configuration and canonical actions',graph(page)['journeys'][jid]['matrixContent']==payload['graph']['journeys'][jid]['matrixContent'] and graph(page)['stages'][sid]['customerAction']=='Pesquisar opções de atendimento')
  f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click();page.reload(wait_until='networkidle');page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();page.get_by_role('button',name='Abrir mapa',exact=True).first.click();f=page.frame_locator('.bo-blueprint-reference-frame');saved(f);expect(f.locator(f'[data-cell="{key}"] img')).to_have_count(1)
  check('Reload preserves all types and canonical customer actions',graph(page)['stages'][sid]['customerAction']=='Pesquisar opções de atendimento' and f.locator(f'[data-cell="{key}"] a').count()==1 and f.locator('[data-cell="em|0"] .content-emoji').inner_text()=='😟')
  for width in [1440,834,390]:
   page.set_viewport_size({'width':width,'height':1000});page.wait_for_timeout(250);audit(page,f'map-{width}');check(f'No document overflow at {width}px',frame(page).evaluate('document.documentElement.scrollWidth<=innerWidth'));page.screenshot(path=str(OUT/f'map-{width}.png'),animations='disabled')
   f.get_by_role('button',name='Configurar faixa Canais e referências',exact=True).click();audit(page,f'row-dialog-{width}');f.get_by_role('button',name='Fechar configuração da faixa',exact=True).click();f.locator(f'[data-cell="{key}"]>.content-add').click();audit(page,f'type-picker-{width}');f.get_by_role('button',name='Fechar tipos de conteúdo',exact=True).click();f.get_by_role('button',name='Apresentar',exact=True).click();audit(page,f'executive-{width}');page.screenshot(path=str(OUT/f'executive-{width}.png'),animations='disabled');f.get_by_role('button',name='Voltar ao mapa',exact=True).click()
  f.get_by_role('button',name='Voltar para mapas do serviço',exact=True).click();touch=browser.new_context(viewport={'width':390,'height':844},has_touch=True,is_mobile=True,storage_state=page.context.storage_state());mobile=touch.new_page();mobile.on('pageerror',lambda e:errors.append(str(e)));mobile.add_locator_handler(mobile.locator('.rt155-recovery-notice.show'),lambda n:n.locator('i').click());mobile.goto(URL,wait_until='networkidle');mobile.get_by_role('button',name='Abrir workspace local sem conta').click();mobile.get_by_role('button',name='Abrir navegação',exact=True).click();mobile.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click();mobile.get_by_role('button',name='Abrir mapa',exact=True).first.click();mf=mobile.frame_locator('.bo-blueprint-reference-frame');saved(mf);mobile.wait_for_function("async()=>{const r=await window.BlueOceanRuntime.api('dataBridge').recovery();return r.durableOk&&r.durableRevision>=r.revision}");mf.locator('.lb').first.click()
  mf.locator('[data-cell="em|0"]>.content-add').tap();mf.get_by_role('button',name='Adicionar Emoji',exact=True).tap();md=mf.get_by_role('dialog',name='Adicionar emoji',exact=True);md.get_by_label('Significado do emoji').fill('Alívio após resposta');md.get_by_role('button',name='Satisfação',exact=True).tap();audit(mobile,'emoji-dialog-touch');md.get_by_role('button',name='Salvar elemento',exact=True).tap();saved(mf)
  check('A real touch device creates accessible mixed content without changing emotional evidence',len(graph(mobile)['journeys'][jid]['matrixContent']['cells'][sid]['em'])==2 and not graph(mobile)['stages'][sid]['emotionRecorded']);audit(mobile,'map-touch');mobile.screenshot(path=str(OUT/'map-touch.png'),animations='disabled');touch.close()
  standalone=browser.new_page(viewport={'width':1440,'height':1000});standalone.on('pageerror',lambda e:errors.append(str(e)));standalone.goto(URL+'/blueprint-reference-original.html',wait_until='networkidle');use_matrix(standalone);add(standalone,'em|0','Emoji');sd=standalone.get_by_role('dialog',name='Adicionar emoji',exact=True);sd.get_by_label('Significado do emoji').fill('Registro no documento independente');sd.get_by_role('button',name='Salvar elemento',exact=True).click();standalone.reload(wait_until='networkidle');expect(standalone.locator('[data-cell="em|0"] .content-emoji')).to_have_count(1);check('The standalone document preserves typed content through its legacy storage migration',standalone.locator('[data-cell="em|0"] .content-emoji').get_attribute('aria-label')=='Registro no documento independente');standalone.close()
  check('No uncaught browser errors',not errors);(OUT/'results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2));browser.close()
except Exception:
 print('Browser errors:',errors if 'errors' in globals() else [],flush=True)
 raise
finally:server.shutdown();server.server_close()

#!/usr/bin/env python3
"""Behavior and visual checks for full-bleed entry and the Journey starting experience."""
import functools,json,os,re,shutil,threading,traceback
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts'/'entry-journey';OUT.mkdir(parents=True,exist_ok=True)
checks=[];failures=[]
def check(name,value):
 checks.append({'name':name,'passed':bool(value)});print(('PASS ' if value else 'FAIL ')+name,flush=True)
 if not value:raise AssertionError(name)
def graph(page):return page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")
def journey(page):
 g=graph(page);return g['journeys'][page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').currentJourneyId()")]
def audit(page,selector,name):
 if not os.environ.get('AXE_PATH'):return
 # Audit the settled surface; entry/card fades temporarily blend text colors.
 page.emulate_media(reduced_motion='reduce')
 page.evaluate("async selector => {const root=document.querySelector(selector);await Promise.race([Promise.allSettled(root.getAnimations({subtree:true}).filter(a=>Number.isFinite(a.effect.getComputedTiming().endTime)).map(a=>a.finished)),new Promise(resolve=>setTimeout(resolve,1000))]);}",selector)
 page.add_script_tag(path=os.environ['AXE_PATH'])
 data=page.evaluate("async selector => (await axe.run({include:[[selector]]},{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))",selector)
 (OUT/(name+'-accessibility.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2))
 check(name+' has no automated WCAG A/AA violations',not data)
def entry(page):
 page.goto(URL,wait_until='networkidle');expect(page.locator('.bo1120-boot')).to_be_hidden();expect(page.get_by_role('heading',name='Bem-vindo de volta',exact=True)).to_be_visible()
 width=page.viewport_size['width'];box=page.locator('.bo-auth-shell').bounding_box()
 check('Entry reaches both edges of the viewport',box['x']==0 and box['y']==0 and box['width']==width)
 check('Entry has no horizontal page overflow',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
 check('Entry is isolated from workspace padding',page.locator('body').evaluate("e=>getComputedStyle(e).padding==='0px'"))
 track=page.locator('.bo-auth-wave__track')
 before=track.evaluate('e=>getComputedStyle(e).transform');page.wait_for_timeout(250);after=track.evaluate('e=>getComputedStyle(e).transform')
 check('The visible ocean waves move',track.is_visible() and before!=after)
 check('Login inputs use one consistent border',page.locator('.bo-auth-input input').first.evaluate("e=>getComputedStyle(e).borderTopWidth==='0px'"))
 audit(page,'.bo-auth-shell','entry-'+str(width))
 page.screenshot(path=str(OUT/f'entry-{width}.png'),full_page=True,animations='disabled')
 page.get_by_role('button',name='Criar perfil local',exact=True).click()
 expect(page.get_by_role('heading',name='Comece com o essencial',exact=True)).to_be_visible()
 check('Signup remains reachable and within the viewport',page.locator('.bo-auth-card').bounding_box()['x']>=0 and page.get_by_placeholder('Seu nome',exact=True).is_visible())
 page.get_by_role('button',name='Voltar',exact=True).click()
 page.get_by_role('button',name='Abrir workspace local sem conta',exact=True).click()
 page.get_by_role('button',name='Novo projeto',exact=True).click()
 page.get_by_label('Nome do projeto',exact=True).fill('Experiência inicial QA');page.get_by_label('Serviço principal',exact=True).fill('Atendimento')
 page.get_by_role('button',name='Criar projeto',exact=True).click()
 # New project navigation starts at its overview; maps live in the primary sidebar.
 expect(page.get_by_role('heading',name='Visão geral do projeto',exact=True)).to_be_visible()
 check('Project opens on its overview before the map library',True)
 check('Project does not display a duplicate top navigation bar',page.locator('main [data-project-context-nav]').count()==0)
 page.screenshot(path=str(OUT/'project-journey-entry.png'),full_page=True,animations='disabled')
 page.get_by_role('button',name='Abrir Mapas do serviço',exact=True).click()
 expect(page.locator('[data-service-map-library]')).to_be_visible()
 check('Service maps library is reachable from primary navigation',True)
 page.get_by_role('button',name='Criar mapa',exact=True).click();page.get_by_role('button',name=re.compile(r'^Em branco')).click()
 expect(page.get_by_role('region',name='Começar a mapear')).to_be_visible()
 before=journey(page)
 check('The visual example does not create stages or cards automatically',not before['stageIds'] and not before.get('mapLayout',{}).get('lanes'))
 check('The Journey keeps a single compact header',page.locator('.bo-h1705-topbar').bounding_box()['height']<=60)
 audit(page,'.bo-focused-journey','journey-welcome')
 page.screenshot(path=str(OUT/'journey-welcome.png'),animations='disabled')
 page.get_by_role('button',name='Usar estrutura inicial',exact=True).click()
 after=journey(page);g=graph(page)
 check('The starter creates the chosen stages and essential lanes',len(after['stageIds'])==3 and len(after['mapLayout']['lanes'])==3)
 check('Suggested stages stay editable and contain no invented observations',all(g['stages'][id]['customerAction']=='' for id in after['stageIds']))
 check('The introduction leaves the editing surface after the choice',page.get_by_role('region',name='Começar a mapear').count()==0)
 page.get_by_role('button',name='Desfazer',exact=True).click()
 check('The entire structure is undone in one action',not journey(page)['stageIds'] and not journey(page).get('mapLayout',{}).get('lanes'))
 page.get_by_role('button',name='Refazer',exact=True).click()
 check('Redo restores the same structure and identities',journey(page)['stageIds']==after['stageIds'])
 page.get_by_label('Ações do cliente em Antes',exact=True).fill('Procura uma solução')
 check('The suggested structure edits real service data',graph(page)['stages'][after['stageIds'][0]]['customerAction']=='Procura uma solução')
 audit(page,'.bo-focused-journey','journey-starter')
 page.screenshot(path=str(OUT/'journey-starter.png'),animations='disabled')
 page.reload(wait_until='networkidle')
 check('The chosen structure and dismissal persist after reload',journey(page)['mapLayout']['introDismissed'] and journey(page)['stageIds']==after['stageIds'])
def custom(page):
 # This flow uses the visible blank-map controls and then adopts the starter.
 page.goto(URL,wait_until='networkidle');page.get_by_role('button',name='Abrir workspace local sem conta',exact=True).click()
 page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('Mapa próprio');page.get_by_label('Serviço principal',exact=True).fill('Suporte');page.get_by_role('button',name='Criar projeto',exact=True).click();
 page.get_by_role('button',name='Criar mapa',exact=True).click();page.get_by_role('button',name=re.compile(r'^Em branco')).click()
 page.get_by_role('button',name='Nova etapa',exact=True).click();page.get_by_placeholder('Nome da etapa',exact=True).fill('Conversa');page.get_by_role('button',name='Criar etapa',exact=True).click()
 page.locator('.bo-h1705-menubar').get_by_role('button',name='Adicionar faixa',exact=True).click();page.locator('.bo-refined-picker').get_by_role('button',name='Texto',exact=True).click()
 page.get_by_label('Nome da faixa',exact=True).fill('Minhas anotações')
 before=journey(page)
 ghost=page.locator('.bo-h1709-add-card[data-empty=true]');check('An empty cell offers a visible writing surface',ghost.is_visible() and ghost.bounding_box()['height']>=100)
 page.get_by_role('button',name='Adicionar faixas essenciais',exact=True).click()
 after=journey(page)
 check('Adopting essentials preserves custom stages and lanes',after['stageIds']==before['stageIds'] and after['mapLayout']['lanes'][0]==before['mapLayout']['lanes'][0])
 check('The lane header displays a consistent icon',page.locator('.bo-journey-lane-icon').count()==4)
 page.screenshot(path=str(OUT/'journey-custom-start.png'),animations='disabled')
def small(page):
 page.goto(URL,wait_until='networkidle');expect(page.locator('.bo1120-boot')).to_be_hidden();expect(page.locator('.bo-auth-card')).to_be_visible();width=page.viewport_size['width'];box=page.locator('.bo-auth-shell').bounding_box()
 check('Small-screen entry reaches the viewport edges',box['x']==0 and box['width']==width)
 check('Small-screen login controls do not overflow',page.locator('.bo-auth-card').evaluate('e=>e.getBoundingClientRect().right<=innerWidth') and page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
 page.get_by_role('button',name='Abrir workspace local sem conta',exact=True).scroll_into_view_if_needed();check('Local entry remains reachable on a short screen',page.get_by_role('button',name='Abrir workspace local sem conta',exact=True).is_visible())
 audit(page,'.bo-auth-shell','entry-'+str(width));page.screenshot(path=str(OUT/f'entry-{width}.png'),full_page=True,animations='disabled')
 page.emulate_media(reduced_motion='reduce');check('Reduced motion stops the ocean animation',page.locator('.bo-auth-wave__track').evaluate("e=>getComputedStyle(e).animationName==='none'"))
 if width==390:
  page.get_by_role('button',name='Abrir workspace local sem conta',exact=True).click()
  page.get_by_role('button',name='Novo projeto',exact=True).click();page.get_by_label('Nome do projeto',exact=True).fill('Jornada no celular');page.get_by_label('Serviço principal',exact=True).fill('Atendimento');page.get_by_role('button',name='Criar projeto',exact=True).click();
  page.get_by_role('button',name='Criar mapa',exact=True).click();page.get_by_role('button',name=re.compile(r'^Em branco')).click()
  welcome=page.get_by_role('region',name='Começar a mapear');expect(welcome).to_be_visible()
  check('The Journey introduction fits a phone',welcome.bounding_box()['x']>=0 and welcome.bounding_box()['x']+welcome.bounding_box()['width']<=391)
  page.get_by_role('button',name='Criar primeira etapa',exact=True).click()
  check('Continuing in blank mode creates no stages or lanes',not journey(page)['stageIds'] and not journey(page).get('mapLayout',{}).get('lanes'))
  expect(page.get_by_placeholder('Nome da etapa',exact=True)).to_be_visible()
  page.reload(wait_until='networkidle')
  check('Choosing blank mode remains saved after reload',journey(page)['mapLayout']['introDismissed'])

def starting_map(page):
 page.emulate_media(reduced_motion='reduce')
 page.goto(URL,wait_until='networkidle')
 page.get_by_role('button',name='Abrir workspace local sem conta',exact=True).click()
 page.get_by_role('button',name='Novo projeto',exact=True).click()
 page.get_by_label('Nome do projeto',exact=True).fill('Novo início da Jornada')
 page.get_by_label('Serviço principal',exact=True).fill('Atendimento ao cliente')
 page.get_by_role('button',name='Criar projeto',exact=True).click()
 page.get_by_role('button',name='Criar mapa',exact=True).click()
 page.get_by_role('button',name=re.compile(r'^Em branco')).click()
 width=page.viewport_size['width']
 welcome=page.get_by_role('region',name='Começar a mapear')
 expect(welcome).to_be_visible()
 check(f'{width}: início oferece duas decisões e prévia sem preencher dados',welcome.get_by_role('button').count()==2 and not journey(page)['stageIds'] and not journey(page).get('mapLayout',{}).get('lanes'))
 check(f'{width}: início cabe na largura disponível',welcome.bounding_box()['x']>=0 and welcome.bounding_box()['x']+welcome.bounding_box()['width']<=width)
 check(f'{width}: ajustar à tela aguarda um mapa real',page.get_by_role('button',name='Ajustar à tela',exact=True).is_disabled())
 audit(page,'.bo-focused-journey',f'novo-inicio-{width}')
 page.screenshot(path=str(OUT/f'novo-inicio-{width}.png'),animations='disabled')
 page.get_by_role('button',name='Criar primeira etapa',exact=True).click()
 field=page.get_by_placeholder('Nome da etapa',exact=True)
 expect(field).to_be_focused()
 check(f'{width}: primeira etapa começa com foco e impede título vazio',page.get_by_role('button',name='Criar etapa',exact=True).is_disabled())
 page.keyboard.press('Escape')
 expect(welcome).to_be_visible()
 page.get_by_role('button',name='Todas as Jornadas',exact=True).click()
 page.locator('[data-journey-library="1"]').get_by_role('button',name='Abrir mapa',exact=True).click()
 expect(welcome).to_be_visible()
 check(f'{width}: mapa vazio dispensado continua oferecendo um ponto de partida',journey(page)['mapLayout']['introDismissed'] and not journey(page)['stageIds'])
 page.get_by_role('button',name='Criar primeira etapa',exact=True).click()
 field.fill('Descobrir o serviço');field.press('Enter')
 expect(page.get_by_role('textbox',name='Nome da etapa 1',exact=True)).to_have_value('Descobrir o serviço')
 suggestions=page.get_by_role('region',name='Faixas sugeridas')
 expect(suggestions).to_be_visible()
 check(f'{width}: faixas sugeridas têm nomes e explicações',all(suggestions.get_by_role('button',name=name,exact=True).is_visible() for name in ['Ações do cliente','Pensamentos','Emoções']))
 audit(page,'.bo-focused-journey',f'primeira-etapa-{width}')
 page.screenshot(path=str(OUT/f'primeira-etapa-{width}.png'),animations='disabled')
 suggestions.get_by_role('button',name='Pensamentos',exact=True).click()
 lane=journey(page)['mapLayout']['lanes'][0]
 check(f'{width}: sugestão cria faixa com vínculo correto',lane['binding']=='thoughts' and lane['label']=='Pensamentos')
 page.get_by_label('Pensamentos em Descobrir o serviço',exact=True).fill('Será que resolve meu problema?')
 first_stage=journey(page)['stageIds'][0]
 for label in ['Solicitar atendimento','Receber ajuda','Avaliar solução','Retornar']:
  page.locator('.bo-h1705-top-actions').get_by_role('button',name='Nova etapa',exact=True).click()
  field.fill(label);field.press('Enter')
 before=json.dumps({'journey':journey(page),'stages':graph(page)['stages']},sort_keys=True)
 page.get_by_role('button',name='Ajustar à tela',exact=True).click()
 page.wait_for_function("""() => {const v=document.querySelector('.bo-h1705-scroll'),m=v.querySelector('.bo-h1706-map'),r=m.getBoundingClientRect(),b=v.getBoundingClientRect(),s=getComputedStyle(v);return r.left>=b.left && r.top>=b.top && r.right<=b.right-parseFloat(s.paddingRight)+1 && r.bottom<=b.bottom-parseFloat(s.paddingBottom)+1;}""")
 check(f'{width}: ajustar à tela enquadra as duas dimensões sem alterar conteúdo',before==json.dumps({'journey':journey(page),'stages':graph(page)['stages']},sort_keys=True))
 page.get_by_role('button',name=re.compile(r'^Zoom .*Restaurar')).click()
 expect(page.get_by_role('button',name='Zoom 100%. Restaurar para 100%',exact=True)).to_be_visible()
 check(f'{width}: conteúdo permanece editável depois de restaurar zoom',graph(page)['stages'][first_stage]['thoughts']=='Será que resolve meu problema?')

class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=None;URL=os.environ.get('BLUE_OCEAN_URL')
if not URL:
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')));threading.Thread(target=server.serve_forever,daemon=True).start();URL=f'http://127.0.0.1:{server.server_port}'
URL += ('&' if '?' in URL else '?') + '__qa_legacy_blueprint=1&__qa_legacy_journey=1'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for name,flow,w,h in [('desktop',entry,1440,1000),('custom',custom,1440,1000),('tablet',small,820,1180),('mobile',small,390,844),('inicio-desktop',starting_map,1440,1000),('inicio-tablet',starting_map,834,1000),('inicio-celular',starting_map,390,844)]:
   context=browser.new_context(viewport={'width':w,'height':h});page=context.new_page();page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   try:flow(page);check(name+' has no JavaScript errors',not errors)
   except Exception:
    failures.append({'flow':name,'traceback':traceback.format_exc(),'errors':errors});print(failures[-1]['traceback'],flush=True);page.screenshot(path=str(OUT/f'{name}-failure.png'))
   context.close()
  browser.close()
finally:
 if server:server.shutdown();server.server_close()
(OUT/'result.json').write_text(json.dumps({'checks':checks,'failures':failures},ensure_ascii=False,indent=2)+'\n')
print(f'Entry and Journey: {sum(c["passed"] for c in checks)}/{len(checks)} checks; {len(failures)} failed workflows')
raise SystemExit(1 if failures or any(not c['passed'] for c in checks) else 0)

#!/usr/bin/env python3
"""End-to-end check: guided reading never replaces the operational Blueprint."""
import functools, json, os, shutil, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=None
url=os.environ.get('BLUE_OCEAN_URL')
if not url:
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT/'dist')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1440,'height':1080})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(url,wait_until='networkidle')
        page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click()
        page.get_by_label('Nome do projeto',exact=True).fill('Leitura guiada QA')
        page.get_by_label('Serviço principal',exact=True).fill('Atendimento')
        page.get_by_role('button',name='Criar projeto',exact=True).click()
        page.locator('[data-service-blueprint-nav="1"]').click()
        page.get_by_role('button',name='Criar Blueprint',exact=True).first.click()
        page.frame_locator('.bo-blueprint-reference-frame').get_by_role('button',name='Modo profissional').click()
        page.get_by_role('button',name='Adicionar etapa',exact=True).click()
        modal=page.get_by_role('dialog',name='Nova etapa',exact=True)
        modal.get_by_placeholder('Ex.: Pagamento',exact=True).fill('Contato')
        modal.get_by_placeholder('Ex.: escolhe uma forma de pagamento',exact=True).fill('Solicita ajuda')
        modal.get_by_role('button',name='Criar etapa',exact=True).click()
        before=page.evaluate("""() => { const g=window.BlueOceanRuntime.api('dataBridge').get();return {stages:JSON.stringify(g.stages),items:JSON.stringify(Object.values(g.views.whiteboards).find(x=>x.viewKind==='blueprint').items)} }""")
        page.get_by_role('button',name='Leitura guiada',exact=True).click()
        guide=page.get_by_role('complementary',name='Leitura guiada do Blueprint')
        expect(guide).to_be_visible()
        expect(guide.get_by_text('O que falta preencher')).to_be_visible()
        assert page.locator('.bo1203-service-lane').count()==6
        assert page.locator('.bo1203-service-line').count()==3
        guide.get_by_role('tab',name='Visão do cliente').click()
        expect(guide.get_by_text('Curva de emoções')).to_be_visible()
        slider=guide.get_by_role('slider',name='Emoção · Contato')
        slider.evaluate("el => {el.value='2';el.dispatchEvent(new Event('change',{bubbles:true}))}")
        saved=page.evaluate("""() => {const g=window.BlueOceanRuntime.api('dataBridge').get();return {stage:Object.values(g.stages).find(s=>s.title==='Contato'),items:JSON.stringify(Object.values(g.views.whiteboards).find(x=>x.viewKind==='blueprint').items)} }""")
        assert saved['stage']['emotionScore']==2 and saved['stage']['emotion']=='positive'
        assert saved['items']==before['items'], 'Guidance must not change operational cards'
        guide.get_by_role('tab',name='Qualidade').click()
        expect(guide.get_by_text('não é SERVQUAL medido com clientes',exact=False)).to_be_visible()
        guide.get_by_role('button',name='Fechar leitura guiada').click()
        expect(guide).to_have_count(0)
        assert page.locator('.bo1203-service-lane').count()==6
        assert not errors,errors
        print('Blueprint guided reading: browser OK')
        browser.close()
finally:
    if server: server.shutdown();server.server_close()

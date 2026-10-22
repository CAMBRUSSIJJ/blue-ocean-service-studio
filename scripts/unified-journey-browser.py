#!/usr/bin/env python3
"""Acceptance: the original HTML replaces Journey, without demo scaffolding or duplicate data."""
import functools, os, shutil, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1536,'height':960})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
    page.get_by_role('button',name='Abrir workspace local sem conta').click()
    page.get_by_role('button',name='Novo projeto',exact=True).click()
    page.get_by_label('Nome do projeto',exact=True).fill('QA Jornada Única')
    page.get_by_label('Serviço principal',exact=True).fill('Atendimento')
    page.get_by_role('button',name='Criar projeto',exact=True).click()
    page.locator('.bo-h724-journey-pane').get_by_role('button',name='Criar Jornada',exact=True).click()
    page.get_by_role('button',name='Em branco',exact=False).click()
    iframe=page.frame_locator('.bo-blueprint-reference-frame')
    expect(iframe.locator('[data-empty-journey="1"]')).to_be_visible(timeout=15000)
    assert page.locator('.bo-h1705-journey').count()==0,'Old Journey appeared instead of HTML map'
    assert iframe.get_by_text('Preencher com o exemplo do café').count()==0,'Example-heavy setup is still visible'
    assert iframe.locator('.sg').count()==0,'Stage-specific suggested demo content leaked into editor'
    graph=page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")
    assert len(graph['journeys'])==1
    journey_id=next(iter(graph['journeys']))
    board=[b for b in graph['views']['whiteboards'].values() if b['viewKind']=='blueprint']
    assert len(board)==1 and board[0]['journeyId']==journey_id
    iframe.locator('button[data-act="step"]').first.click()
    expect(iframe.locator('.bd')).to_be_visible()
    page.wait_for_function("id => window.BlueOceanRuntime.api('dataBridge').get().journeys[id].stageIds.length===1",arg=journey_id)
    stage=page.evaluate("""id => {const g=window.BlueOceanRuntime.api('dataBridge').get();return g.stages[g.journeys[id].stageIds[0]]}""",journey_id)
    assert stage['title']=='Etapa 1'
    iframe.locator('button[data-act="tools"]').click()
    expect(page.get_by_role('dialog',name='Ferramentas do Blueprint')).to_be_visible()
    assert not errors,errors
    print('Unified Journey original HTML: OK')
    browser.close()
finally:
  server.shutdown();server.server_close()

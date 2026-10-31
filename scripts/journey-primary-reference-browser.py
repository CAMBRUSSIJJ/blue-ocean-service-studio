#!/usr/bin/env python3
"""The original Blueprint reference is the primary Journey workflow; operations remain optional."""
import functools, os, shutil, threading
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright, expect
from map_browser_support import wait_saved, use_matrix
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
srv=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=srv.serve_forever,daemon=True).start()
try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':960})
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:'+str(srv.server_port),wait_until='networkidle')
    page.get_by_role('button',name='Abrir workspace local sem conta').click()
    page.get_by_role('button',name='Novo projeto',exact=True).click();page.locator('[data-project-creation-page] .bo-h744-option-grid button').first.click()
    page.get_by_label('Nome do projeto',exact=False).fill('Jornada HTML QA')
    page.locator('details.bo-h744-additional summary').click();page.get_by_label('Nome do serviço',exact=True).fill('Atendimento')
    page.get_by_role('button',name='Criar projeto e começar',exact=True).click()
    page.get_by_role('button',name='Criar mapa',exact=True).click()
    page.get_by_role('button',name='Em branco').first.click()
    exact=page.frame_locator('.bo-blueprint-reference-frame'); wait_saved(exact); use_matrix(exact)
    expect(exact.locator('[data-empty-journey="1"]')).to_be_visible(timeout=15000)
    assert page.locator('.bo-h1705-journey').count()==0,'Retired Journey canvas opened instead'
    assert exact.get_by_text('Preencher com o exemplo do café').count()==0
    assert exact.get_by_text('Ver exemplo pronto').count()==0
    graph=page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")
    j=list(graph['journeys'].values())[-1]
    boards=[b for b in graph['views']['whiteboards'].values() if b.get('journeyId')==j['id'] and b.get('viewKind')=='blueprint']
    assert len(boards)==1,'Primary Journey must use one linked map, not duplicate data'
    exact.locator('button[data-act="step"]').first.click()
    exact.get_by_role('textbox',name='Nome da nova etapa').fill('Etapa 1')
    exact.get_by_role('button',name='Adicionar etapa ao mapa',exact=True).click()
    page.wait_for_function("id => window.BlueOceanRuntime.api('dataBridge').get().journeys[id].stageIds.length===1",arg=j['id'])
    assert exact.locator('.sh').count()==1
    assert not errors,errors
    print('Original HTML is the Journey editor, blank + canonical persistence: OK')
    browser.close()
finally:
  srv.shutdown();srv.server_close()

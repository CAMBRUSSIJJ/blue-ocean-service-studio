#!/usr/bin/env python3
"""The original uploaded HTML is now the Journey, without suggested demo content."""
import functools, json, os, shutil, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'artifacts'/'journey-reference-original';ART.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1512,'height':900})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
    page.get_by_role('button',name='Abrir workspace local sem conta').click()
    page.get_by_role('button',name='Novo projeto',exact=True).click()
    page.get_by_label('Nome do projeto',exact=True).fill('Jornada HTML original')
    page.get_by_label('Serviço principal',exact=True).fill('Atendimento')
    page.get_by_role('button',name='Criar projeto',exact=True).click()
    page.locator('.bo-h724-journey-pane').get_by_role('button',name='Criar Jornada',exact=True).click()
    page.get_by_role('button',name='Em branco',exact=False).click()
    frame=page.frame_locator('.bo-journey-exact iframe')
    expect(frame.locator('#journey-first-stage')).to_be_visible()
    assert frame.get_by_text('Preencher com o exemplo do café').count()==0
    assert frame.locator('.chips').count()==0
    frame.locator('#journey-first-stage').fill('Descoberta')
    frame.get_by_role('button',name='Criar etapa',exact=True).click()
    expect(frame.locator('.bd')).to_be_visible()
    expect(frame.locator('.pnl')).to_be_visible()
    expect(frame.locator('.cvb')).to_be_visible()
    assert frame.locator('.sg').count()==0,'Examples are hidden by default'
    assert frame.get_by_role('button',name='Modo profissional').count()==0
    assert frame.get_by_role('button',name='Blueprint opcional').count()==1
    def current():
      return page.evaluate("""() => {
        const g=window.BlueOceanRuntime.api('dataBridge').get();
        const j=g.journeys[window.BlueOceanRuntime.api('dataBridge').currentJourneyId()];
        return {journey:j,stages:j.stageIds.map(id=>g.stages[id]),entities:g.entities};
      }""")
    page.wait_for_function("""() => {
      const g=window.BlueOceanRuntime.api('dataBridge').get();
      const j=g.journeys[window.BlueOceanRuntime.api('dataBridge').currentJourneyId()];
      return j?.stageIds.length===1&&g.stages[j.stageIds[0]].title==='Descoberta';
    }""",timeout=10000)
    frame.locator('button[data-act="add"][data-k="ac|0"]').click()
    frame.locator('[data-ed="c"][data-k="ac|0"]').fill('Procura informações')
    frame.locator('[data-ed="c"][data-k="ac|0"]').press('Tab')
    page.wait_for_function("""() => {
      const g=window.BlueOceanRuntime.api('dataBridge').get();
      const j=g.journeys[window.BlueOceanRuntime.api('dataBridge').currentJourneyId()];
      return g.stages[j.stageIds[0]].customerAction==='Procura informações';
    }""",timeout=10000)
    frame.locator('button[data-act="alane"]').click()
    expect(frame.locator('[data-ed="ln"]')).to_have_count(1)
    frame.locator('button[data-act="addi"][data-t="d"]').first.click()
    issue=frame.locator('.it.d [data-ed="ix"]').first
    issue.fill('Informação difícil de encontrar');issue.press('Tab')
    page.wait_for_function("""() => Object.values(window.BlueOceanRuntime.api('dataBridge').get().problems||{})
      .some(x=>x.description==='Informação difícil de encontrar')""",timeout=10000)
    page.screenshot(path=str(ART/'journey-html-original.png'),animations='disabled')
    assert current()['journey']['referenceCanvas']['lanes'][0]['n']=='Nova faixa'
    # The Blueprint is optional and uses the same canonical stages.
    frame.get_by_role('button',name='Blueprint opcional').click()
    expect(page.locator('.bo-blueprint-reference-frame')).to_be_visible()
    assert not errors,errors
    print('Journey original HTML without examples + optional Blueprint: OK')
    browser.close()
finally:
  server.shutdown();server.server_close()

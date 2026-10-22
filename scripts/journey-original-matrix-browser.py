#!/usr/bin/env python3
"""Acceptance: Jornadas use the attached HTML matrix, without prefilled examples."""
import functools, os, re, shutil, threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'journey-original-matrix';OUT.mkdir(parents=True,exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1536,'height':960})
        errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='networkidle')
        page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click()
        page.get_by_label('Nome do projeto',exact=True).fill('Jornada matriz original QA')
        page.get_by_label('Serviço principal',exact=True).fill('Atendimento')
        page.get_by_role('button',name='Criar projeto',exact=True).click()
        page.locator('.bo-h724-journey-pane').get_by_role('button',name='Criar Jornada',exact=True).click()
        page.get_by_role('button',name=re.compile(r'^Em branco')).click()
        frame=page.frame_locator('.bo-blueprint-reference-frame')
        expect(frame.locator('#app')).to_be_visible()
        expect(frame.get_by_role('heading',name='Comece sua Jornada')).to_be_visible()
        assert frame.locator('.bo-h1705-journey').count()==0, 'Old Journey editor must not appear'
        assert frame.locator('[data-act="demo"]').count()==0
        assert frame.locator('[data-act="ex"]').count()==0
        assert frame.locator('.sg').count()==0
        assert frame.locator('.chips button').count()==0, 'No default/example stages'
        frame.locator('input[data-f="st:new"]').fill('Primeiro contato')
        frame.get_by_role('button',name='Adicionar',exact=True).click()
        frame.locator('#go').click()
        expect(frame.locator('.bd')).to_be_visible()
        assert frame.locator('.sg').count()==0,'No suggested/example note buttons'
        assert frame.locator('.pnl').count()==1
        assert frame.locator('.cvb').count()==1
        page.wait_for_function("""() => {const g=window.BlueOceanRuntime.api('dataBridge').get();
          return Object.values(g.journeys).some(j=>j.stageIds.some(id=>g.stages[id]?.title==='Primeiro contato'))}""",timeout=12000)
        add=frame.locator('.ad[data-act="add"]').first
        add.click()
        note=frame.locator('.nw [data-ed="c"]').first
        note.fill('Comprovante de atendimento')
        note.press('Tab')
        page.wait_for_function("""() => Object.values(window.BlueOceanRuntime.api('dataBridge').get().entities.evidence||{})
           .some(item=>item.title==='Comprovante de atendimento')""",timeout=12000)
        assert frame.get_by_role('button',name='Modo profissional').count()==0
        page.screenshot(path=str(OUT/'jornada-matriz-original.png'),animations='disabled')
        frame.get_by_role('button',name='Voltar às Jornadas').click()
        expect(page.locator('.bo-h724-journey-pane')).to_be_visible()
        page.locator('.bo-h724-journey-card').get_by_role('button',name='Abrir Jornada').first.click()
        reopened=page.frame_locator('.bo-blueprint-reference-frame')
        expect(reopened.locator('.bd')).to_be_visible()
        expect(reopened.get_by_text('Comprovante de atendimento')).to_be_visible()
        assert not errors,errors
        print('Jornada original: entry + no examples + persistence + reopen OK')
        browser.close()
finally:
    server.shutdown();server.server_close()

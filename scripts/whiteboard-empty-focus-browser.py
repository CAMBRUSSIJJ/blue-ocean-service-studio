#!/usr/bin/env python3
"""Regression: empty Whiteboard -> one click -> editable canvas -> durable re-open."""
from __future__ import annotations
import functools, json, os, shutil, threading, traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'whiteboard-empty-focus'
OUT.mkdir(parents=True,exist_ok=True)

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass

def verify(test,description):
    if not test: raise AssertionError(description)
    print('PASS '+description,flush=True)

def board_data(page):
    return page.evaluate("() => window.BlueOceanRuntime.api('whiteboardCore').list()")

server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1440,'height':900})
        page_errors=[]
        page.on('pageerror',lambda error: page_errors.append(str(error)))
        page.goto(url,wait_until='networkidle')
        page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click()
        page.get_by_label('Nome do projeto',exact=True).fill('Whiteboard Focus QA')
        page.get_by_label('Serviço principal',exact=True).fill('Serviço ilustrativo QA')
        page.get_by_role('button',name='Criar projeto',exact=True).click()
        page.locator('[data-blue-ocean-whiteboard-nav="standard"]').click()
        expect(page.locator('[data-whiteboard-library="1"]')).to_be_visible()
        empty=page.locator('[data-whiteboard-empty-state="1"]')
        expect(empty).to_be_visible()
        verify(page.locator('.bo-h711-commandbar').count()==0,'Busca e filtros ausentes sem quadros')
        verify(page.locator('.bo-h711-summary').count()==0,'Indicadores ausentes sem quadros')
        verify(page.locator('.bo-h1711-flow-hint').count()==0,'Banner de fluxo ausente sem quadros')
        verify(empty.get_by_role('button',name='Criar whiteboard').count()==1,'CTA principal único')
        verify(empty.get_by_role('button',name='Ir para Blueprints').count()==1,'Atalho secundário para Blueprints')
        verify(empty.get_by_role('button',name='Ir para Jornadas').count()==1,'Atalho secundário para Jornadas')
        empty.screenshot(path=str(OUT/'empty-desktop.png'),animations='disabled')
        # One click creates and opens the actual editor, without a naming modal.
        empty.get_by_role('button',name='Criar whiteboard').click()
        expect(page.locator('.bo1174-board')).to_be_visible(timeout=20000)
        verify(page.locator('.bo1189-modal-backdrop').count()==0,'Um clique abre canvas sem modal')
        page.wait_for_function("() => window.BlueOceanRuntime.api('whiteboardCore').list().length === 1")
        created=board_data(page)[0]
        verify(created['name']=='Novo Whiteboard','Quadro padrão persistido pelo runtime')
        # Post-it created through the actual runtime toolbar, not mock state.
        page.locator('.bo1174-board').get_by_role('button',name='Post-it',exact=True).click()
        page.wait_for_function("() => window.BlueOceanRuntime.api('whiteboardCore').list().some(x=>x.itemCount>0)")
        verify(board_data(page)[0]['itemCount']>0,'Post-it editável criado no canvas')
        page.locator('.bo1174-board').screenshot(path=str(OUT/'canvas-with-note.png'),animations='disabled')
        page.locator('.bo1174-board').get_by_role('button',name='Voltar para Whiteboards').click()
        page.wait_for_timeout(300)
        print('RETURN_DIAGNOSTIC',json.dumps({'overlay':page.locator('.bo1174-board').count(),'rootInert':page.locator('#root').get_attribute('inert'),'errors':page_errors[-5:]},ensure_ascii=False),flush=True)
        expect(page.locator('[data-whiteboard-library="1"]')).to_be_visible()
        expect(page.locator('.bo1189-board-grid')).to_be_visible()
        verify(page.locator('[data-whiteboard-empty-state="1"]').count()==0,'Biblioteca substitui estado vazio após criar')
        verify(page.locator('.bo-h711-commandbar').count()==1,'Busca aparece com quadros existentes')
        # Re-open after hard reload to verify persistent graph+board.
        page.reload(wait_until='networkidle')
        if page.locator('[data-whiteboard-library="1"]').count()==0:
            page.locator('[data-blue-ocean-whiteboard-nav="standard"]').click()
        expect(page.locator('[data-whiteboard-library="1"]')).to_be_visible()
        verify(len(board_data(page))==1 and board_data(page)[0]['itemCount']>0,'Whiteboard e post-it sobrevivem ao reload')
        page.get_by_role('button',name='Abrir Novo Whiteboard').click()
        expect(page.locator('.bo1174-board')).to_be_visible()
        verify(board_data(page)[0]['itemCount']>0,'Canvas reabre com conteúdo')
        page.locator('.bo1174-board').get_by_role('button',name='Voltar para Whiteboards').click()
        expect(page.locator('.bo1189-board-grid')).to_be_visible()
        page.locator('.bo-h711-commandbar input').fill('Nenhum resultado QA')
        expect(page.get_by_role('button',name='Limpar filtros')).to_be_visible()
        page.get_by_role('button',name='Limpar filtros').click()
        expect(page.locator('.bo1189-board-grid')).to_be_visible()
        verify(True,'Filtro sem resultados recupera a lista de quadros')
        browser.close()
finally:
    server.shutdown()

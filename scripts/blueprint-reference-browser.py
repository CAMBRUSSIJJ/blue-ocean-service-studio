#!/usr/bin/env python3
"""Blueprint reference — the supplied HTML is the primary map, canonical engine is retained."""
import functools, os, re, shutil, threading, json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=None; URL=os.environ.get('BLUE_OCEAN_URL')
if not URL:
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT/'dist')))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    URL=f'http://127.0.0.1:{server.server_port}'
try:
 with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(12000)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL,wait_until='networkidle')
    page.get_by_role('button',name='Abrir workspace local sem conta').click()
    page.get_by_role('button',name='Novo projeto',exact=True).click()
    page.get_by_label('Nome do projeto',exact=True).fill('Blueprint referência QA')
    page.get_by_label('Serviço principal',exact=True).fill('Atendimento')
    page.get_by_role('button',name='Criar projeto',exact=True).click()
    page.locator('[data-service-blueprint-nav="1"]').click()
    page.get_by_role('button',name='Criar Blueprint',exact=True).first.click()
    expect(page.locator('.bo-ref-root')).to_be_visible()
    expect(page.get_by_text('Vamos montar um blueprint')).to_be_visible()
    page.locator('#br-setup-title').fill('Solicitar atendimento')
    page.locator('#br-setup-persona').fill('Cliente que precisa de suporte')
    page.locator('[data-action="setup-create"]').click()
    expect(page.locator('.bo-ref-workspace')).to_be_visible()
    assert page.locator('.bo-ref-stage[data-stage]').count()==6, 'Wizard must create selected stages'
    assert page.locator('.bo-ref-row .bo-ref-label').count()>=8
    expect(page.get_by_text('Prioridade de melhoria')).to_be_visible()
    expect(page.get_by_text('Cobertura da qualidade (SERVQUAL)')).to_be_visible()
    cells=page.locator('.bo-ref-cell[data-cell-lane="frontstage"]')
    cells.first.get_by_role('button',name=re.compile('O que a equipe faz')).click()
    modal=page.get_by_role('dialog',name=re.compile('Adicionar nota'))
    modal.locator('textarea[name="text"]').fill('Confirma recebimento do contato')
    modal.get_by_role('button',name='Adicionar nota').click()
    expect(page.get_by_text('Confirma recebimento do contato')).to_be_visible()
    graph=page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get()")
    b=next(b for b in graph['views']['whiteboards'].values() if b.get('viewKind')=='blueprint')
    front=next(it for it in b['items'].values() if it.get('objectKind')=='frontstage')
    assert front['serviceStageId'] in graph['stages'], 'New activity must use canonical stage'
    sid=page.locator('.bo-ref-stage[data-stage]').first.get_attribute('data-stage')
    emo=page.locator('[data-change="emotion"][data-stage="'+sid+'"]')
    emo.evaluate("el => {el.value='-2';el.dispatchEvent(new Event('change',{bubbles:true}))}")
    st=page.evaluate("(id) => window.BlueOceanRuntime.api('dataBridge').get().stages[id]",sid)
    assert st['emotionScore']==-2 and st['emotion']=='negative'
    page.locator('[data-action="add-issue"][data-type="pain"]').first.click()
    modal=page.get_by_role('dialog',name=re.compile('Adicionar dor'))
    modal.locator('textarea[name="text"]').fill('Espera sem previsão')
    modal.get_by_role('button',name='Adicionar').click()
    expect(page.get_by_text('Espera sem previsão')).to_be_visible()
    pain=next(iter(page.evaluate("() => window.BlueOceanRuntime.api('dataBridge').get().entities.pain").values()))
    assert pain['stageId']==sid and pain['blueprintSeverity']==2, 'Pain stored in Service Graph'
    page.locator('[data-action="customer-only"]').click()
    assert page.locator('.bo-ref-row .bo-ref-label').filter(has_text='Bastidores').count()==0
    page.locator('[data-action="customer-only"]').click()
    assert page.locator('.bo-ref-row .bo-ref-label').filter(has_text='Bastidores').count()==1
    page.locator('[data-action="advanced"]').click()
    expect(page.locator('.bo1203-service-lane').first).to_be_visible()
    assert page.locator('.bo1203-service-lane').count()==6, 'Legacy 6-layer editor must remain intact'
    page.get_by_role('button',name='Mapa visual',exact=True).click()
    expect(page.locator('.bo-ref-root')).to_be_visible()
    assert page.get_by_text('Confirma recebimento do contato').count()>=1
    assert not errors,errors
    print('Blueprint reference browser: OK · wizard / matrix / canonical data / emotion / pain / advanced')
    browser.close()
finally:
 if server:server.shutdown();server.server_close()

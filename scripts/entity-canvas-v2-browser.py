#!/usr/bin/env python3
"""Entity Canvas v2: real browser flow for Dores, autosave, hidden fields and custom fields."""
import functools, json, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'entity-canvas-v2'
OUT.mkdir(parents=True,exist_ok=True)
assert (ROOT/'dist'/'index.html').exists(), 'Build dist before browser QA'
server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
checks=[]
def check(label,condition):
    checks.append({'name':label,'pass':bool(condition)})
    if not condition: raise AssertionError(label)
    print('PASS '+label,flush=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        page=browser.new_page(viewport={'width':1500,'height':950})
        page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='domcontentloaded')
        page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click()
        page.get_by_label('Nome do projeto',exact=True).fill('Canvas Entity QA')
        page.get_by_label('Serviço principal',exact=True).fill('Checkout digital')
        page.get_by_role('button',name='Criar projeto',exact=True).click()
        page.locator('button[aria-label="Dores"]').first.click()
        library=page.locator('[data-pains-h74="library"]')
        expect(library).to_be_visible()
        library.locator('.bo-h71-toolbar').get_by_role('button',name='Criar Dor').click()
        form=page.locator('form.bo-h71-create-modal')
        expect(form).to_be_visible()
        form.locator('input').first.fill('Abandono no cálculo do frete')
        form.get_by_role('button',name='Criar e abrir').click()
        detail=page.locator('[data-pains-h74="detail"]')
        expect(detail).to_be_visible()
        canvas=detail.locator('[data-entity-canvas="1"]')
        expect(canvas).to_be_visible()
        check('Starts with three essential fields',canvas.locator('.bo-pain-canvas-card').count()==3)
        check('Optional fields initially collapsed',canvas.locator('.bo-pain-canvas-ghost').count()==3)
        detail.get_by_role('textbox',name='Descrição (o que acontece?)').fill('A página não informa o frete durante a compra.')
        detail.get_by_role('textbox',name='Contexto').fill('Compra pelo telefone celular.')
        detail.get_by_role('textbox',name='Impacto').fill('Parte dos clientes desiste do pedido.')
        canvas.get_by_role('button',name='Adicionar campo').click()
        canvas.get_by_role('button',name='Texto',exact=True).click()
        canvas.get_by_role('textbox',name='Texto',exact=True).fill('Observação personalizada persistente.')
        check('Custom text field is editable',canvas.get_by_role('textbox',name='Texto',exact=True).input_value()=='Observação personalizada persistente.')
        detail.get_by_role('textbox',name='Adicionar tag').fill('Pagamento')
        detail.get_by_role('textbox',name='Adicionar tag').press('Enter')
        check('Tags editable as chips',detail.locator('.bo-entity-tag').filter(has_text='Pagamento').count()==1)
        # Optional fields must not discard content on hide.
        canvas.get_by_role('button',name='Sinal observável',exact=True).click()
        canvas.get_by_role('textbox',name='Sinal observável',exact=True).fill('Elevação da taxa de abandono no checkout.')
        item=canvas.locator('.bo-pain-canvas-card').filter(has=page.get_by_role('textbox',name='Sinal observável',exact=True))
        item.get_by_role('button',name='Opções de Sinal observável').click()
        item.get_by_role('button',name='Ocultar bloco (preserva conteúdo)').click()
        check('Hidden optional field retains its data',canvas.locator('.bo-pain-canvas-ghost').filter(has_text='Sinal observável').inner_text().find('Conteúdo preservado')>=0)
        detail.screenshot(path=str(OUT/'entity-canvas-v2.png'),full_page=True)
        detail.locator('.bo-pain-back').click()
        expect(library).to_be_visible()
        library.locator('.bo-h74-pain-name').first.click()
        expect(detail).to_be_visible()
        page.wait_for_timeout(250)
        check('Custom content persisted after reopen',canvas.get_by_role('textbox',name='Texto',exact=True).input_value()=='Observação personalizada persistente.')
        canvas.locator('.bo-pain-canvas-ghost').filter(has_text='Sinal observável').click()
        check('Optional content recovered after reopen',canvas.get_by_role('textbox',name='Sinal observável',exact=True).input_value()=='Elevação da taxa de abandono no checkout.')
        check('Existing graph fields persisted',detail.get_by_role('textbox',name='Contexto').input_value()=='Compra pelo telefone celular.')
        (OUT/'result.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
finally:
    server.shutdown()

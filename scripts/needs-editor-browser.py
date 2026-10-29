#!/usr/bin/env python3
"""Regression gate: dark Needs editor and deletion, in a real browser."""
from __future__ import annotations
import functools, json, threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'needs-editor'
OUT.mkdir(parents=True, exist_ok=True)
assert (ROOT / 'dist' / 'index.html').exists(), 'Build dist before running this test'
server = ThreadingHTTPServer(('127.0.0.1',0), functools.partial(SimpleHTTPRequestHandler,directory=str(ROOT/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
checks = []
def check(label,passed,details=''):
    checks.append({'test':label,'passed':bool(passed),'details':str(details)})
    if not passed: raise AssertionError(f'{label}: {details}')
    print('PASS '+label,flush=True)

def color(page,selector):
    return page.locator(selector).first.evaluate('(element)=>getComputedStyle(element).backgroundColor')

try:
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True)
        page=browser.new_page(viewport={'width':1535,'height':900})
        page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='domcontentloaded')
        page.get_by_role('button',name='Abrir workspace local sem conta').click()
        page.get_by_role('button',name='Novo projeto',exact=True).click()
        page.get_by_label('Nome do projeto',exact=True).fill('QA Necessidades Dark')
        page.get_by_label('Serviço principal',exact=True).fill('Serviço teste')
        page.get_by_role('button',name='Criar projeto',exact=True).click()
        page.locator('button[aria-label="Necessidades"]').first.click()
        library=page.locator('[data-needs-h72="library"]')
        expect(library).to_be_visible()
        library.get_by_role('button',name='Criar necessidade',exact=True).click()
        form=page.locator('.bo-h71-create-modal')
        expect(form).to_be_visible()
        form.locator('input').first.fill('Comparar fornecedores homologados')
        form.get_by_role('button',name='Criar e abrir').click()
        editor=page.locator('.bo-entity-focus-overlay')
        expect(editor).to_be_visible()
        expect(editor.locator('.bo-entity-block')).to_have_count(2)
        expect(editor.locator('.bo-entity-ghost')).to_have_count(3)
        body_color=color(page,'.bo-entity-editor')
        check('Editor is dark', body_color in ['rgb(21, 25, 30)','rgb(21, 25, 31)'],body_color)
        form_color=color(page,'.bo-entity-block textarea')
        check('Textarea remains dark',form_color=='rgb(32, 37, 44)',form_color)
        connect_color=color(page,'.bo-entity-connect')
        check('Conectar button remains dark',connect_color=='rgb(53, 61, 72)',connect_color)
        ghost_color=color(page,'.bo-entity-ghost')
        check('Optional blocks stay transparent',ghost_color in ['rgba(0, 0, 0, 0)','transparent'],ghost_color)
        delete_color=color(page,'.bo-entity-delete')
        check('Delete button is not white',delete_color=='rgb(64, 40, 45)',delete_color)
        check('Inline delete is visible',editor.get_by_role('button',name='Excluir necessidade').is_visible())
        editor.screenshot(path=str(OUT/'needs-dark-after.png'))
        editor.get_by_role('button',name='Excluir necessidade').click()
        dialog=page.get_by_role('alertdialog',name='Confirmar exclusão de necessidade')
        expect(dialog).to_be_visible()
        check('Confirmation displays need title','Comparar fornecedores homologados' in dialog.inner_text())
        dialog.get_by_role('button',name='Excluir necessidade').click()
        expect(page.locator('[data-needs-h72="library"]')).to_be_visible()
        check('Delete removes need from library',page.get_by_role('button',name='Comparar fornecedores homologados').count()==0)
        page.locator('.bo-h71-toolbar').get_by_role('button',name='Criar necessidade').click()
        form=page.locator('.bo-h71-create-modal')
        form.locator('input').first.fill('Outra necessidade temporária')
        form.get_by_role('button',name='Criar e abrir').click()
        expect(editor).to_be_visible()
        editor.get_by_role('button',name='Mais ações').click()
        editor.get_by_role('button',name='Voltar à biblioteca').click()
        expect(library).to_be_visible()
        library.get_by_role('button',name='Excluir necessidade Outra necessidade temporária').click()
        dialog=page.get_by_role('alertdialog',name='Confirmar exclusão de necessidade')
        expect(dialog).to_be_visible()
        dialog.get_by_role('button',name='Excluir necessidade').click()
        check('Library direct delete removes need',page.get_by_role('button',name='Outra necessidade temporária').count()==0)
        (OUT/'result.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
        browser.close()
finally:
    server.shutdown()

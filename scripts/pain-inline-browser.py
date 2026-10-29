#!/usr/bin/env python3
"""Browser regression for the inline light Dores canvas (build output required)."""
import functools
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'pain-inline-canvas'
OUT.mkdir(parents=True, exist_ok=True)
assert (ROOT / 'dist' / 'index.html').exists(), 'Build required before browser testing'
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(SimpleHTTPRequestHandler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}'
checks = []

def check(name, condition):
    checks.append({'name': name, 'pass': bool(condition)})
    if not condition:
        raise AssertionError(name)
    print('PASS ' + name, flush=True)

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1535, 'height': 940})
        page.goto(url, wait_until='domcontentloaded')
        page.get_by_role('button', name='Abrir workspace local sem conta').click()
        page.get_by_role('button', name='Novo projeto', exact=True).click()
        page.get_by_label('Nome do projeto', exact=True).fill('QA Dor e Fricção')
        page.get_by_label('Serviço principal', exact=True).fill('Serviço de exemplo')
        page.get_by_role('button', name='Criar projeto', exact=True).click()
        page.locator('button[aria-label="Dores"]').first.click()
        lib = page.locator('[data-pains-h74="library"]')
        expect(lib).to_be_visible()
        lib.get_by_role('button', name='Criar Dor').click()
        form = page.locator('.bo-h71-create-modal')
        form.locator('input').first.fill('O cliente abandona o carrinho no pagamento')
        form.get_by_role('button', name='Criar e abrir').click()
        detail = page.locator('[data-pains-h74="detail"]')
        expect(detail).to_be_visible()
        check('Um único título, editável', detail.get_by_role('textbox', name='Título da Dor').count() == 1)
        check('Aviso educativo não bloqueante', detail.locator('.bo-pain-hint').count() == 1)
        check('Três blocos essenciais', detail.locator('.bo-context-canvas-card').count() == 3)
        check('Três blocos opcionais', detail.locator('.bo-context-ghost').count() == 3)
        canvas_background = detail.locator('.bo-context-ghost').first.evaluate('(element) => getComputedStyle(element).backgroundColor')
        check('Ghost cards têm fundo claro e não transparente', canvas_background == 'rgb(250, 251, 254)')
        detail.get_by_role('textbox', name='Contexto', exact=True).fill('Durante o cálculo do frete')
        detail.get_by_role('textbox', name='Impacto', exact=True).fill('Perda de vendas')
        detail.get_by_role('button', name='Sinal observável', exact=True).click()
        check('Sinal observável é ativável', detail.locator('[data-context-block="observableSignal"]').count() == 1)
        detail.get_by_role('textbox', name='Sinal observável', exact=True).fill('Taxa de abandono')
        check('Critérios reagem imediatamente', '4/7' in detail.locator('.bo-context-criteria').inner_text() or '5/7' in detail.locator('.bo-context-criteria').inner_text())
        detail.screenshot(path=str(OUT / 'dor-inline-desktop.png'))
        page.wait_for_timeout(950)
        detail.get_by_role('button', name='Dores', exact=True).click()
        expect(lib).to_be_visible()
        lib.get_by_role('button', name='O cliente abandona o carrinho no pagamento').click()
        expect(detail).to_be_visible()
        check('Campos persistem com autosave', detail.get_by_role('textbox', name='Contexto', exact=True).input_value() == 'Durante o cálculo do frete')
        detail.get_by_role('button', name='Mais ações da Dor').click()
        detail.get_by_role('button', name='Excluir Dor').click()
        dialog = detail.get_by_role('alertdialog', name='Confirmar exclusão de Dor')
        expect(dialog).to_be_visible()
        dialog.get_by_role('button', name='Cancelar').click()
        check('Cancelar mantém a Dor', detail.get_by_role('textbox', name='Título da Dor').count() == 1)
        browser.close()
finally:
    server.shutdown()
    (OUT / 'result.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2), encoding='utf-8')

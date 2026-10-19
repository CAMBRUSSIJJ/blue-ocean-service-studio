#!/usr/bin/env python3
"""Browser truth gate for V1.19.5.

Requires Python Playwright + Chromium and a reachable app URL.
Set BLUE_OCEAN_URL if the app is already running. This gate exits 2 when the
browser dependency/environment is unavailable; it never converts UNKNOWN into PASS.
"""
from __future__ import annotations
import json, os, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'v1195-ux-truth'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('BLUE_OCEAN_URL', 'http://127.0.0.1:4173')
result = {'url': URL, 'status': 'UNKNOWN', 'checks': [], 'screenshots': []}

def check(name, cond, detail=''):
    result['checks'].append({'name': name, 'pass': bool(cond), 'detail': detail})
    if not cond:
        raise AssertionError(f'{name}: {detail}')

def save_result(code):
    (OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    sys.exit(code)

try:
    from playwright.sync_api import sync_playwright
except Exception as exc:
    result['status'] = 'UNAVAILABLE'
    result['reason'] = f'Playwright Python indisponível: {exc}'
    save_result(2)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.goto(URL, wait_until='domcontentloaded', timeout=20000)
        if page.get_by_text('Abrir workspace local sem conta', exact=False).count():
            page.get_by_text('Abrir workspace local sem conta', exact=False).click()
        page.wait_for_timeout(600)

        # Fresh local state may already contain a service. The first hard truth check is visual:
        # legacy recipe modal must never be in the DOM and the Service Project surface must be reachable.
        check('modal legado Preparar o Serviço ausente', page.get_by_text('Preparar o Serviço', exact=True).count() == 0)

        if page.get_by_text('+ Criar serviço', exact=True).count():
            page.get_by_text('+ Criar serviço', exact=True).click()
            page.get_by_label('Nome do serviço').fill('Serviço QA V1.19.5') if page.get_by_label('Nome do serviço').count() else None
            # fallback by first dialog input
            if page.locator('[role="dialog"] input').count() and not page.locator('[role="dialog"] input').first.input_value():
                page.locator('[role="dialog"] input').first.fill('Serviço QA V1.19.5')
            page.get_by_text('Criar serviço', exact=True).last.click()
            page.wait_for_timeout(400)

        check('Service Project Home visível', page.locator('[data-service-project-home="1"]').count() > 0)
        check('fase Entender visível', page.get_by_text('ENTENDER', exact=True).count() > 0)
        check('Discovery mostra Personas', page.get_by_text('PERSONAS', exact=True).count() > 0)
        check('Discovery mostra Problemas/Hipóteses', page.get_by_text('PROBLEMAS / HIPÓTESES', exact=True).count() > 0)
        shot = OUT / '01-service-project-home.png'
        page.screenshot(path=str(shot), full_page=True)
        result['screenshots'].append(str(shot.relative_to(ROOT)))

        # Navigate to Whiteboards and verify the structured entry is gated before discovery.
        if page.get_by_text('Whiteboards', exact=True).count():
            page.get_by_text('Whiteboards', exact=True).first.click()
            page.wait_for_timeout(300)
            check('prerequisite Discovery aparece no Whiteboards', page.locator('[data-discovery-prerequisite="1"]').count() > 0 or page.get_by_text('Entenda cliente e problema primeiro', exact=False).count() > 0)
            shot2 = OUT / '02-whiteboards-prerequisite.png'
            page.screenshot(path=str(shot2), full_page=True)
            result['screenshots'].append(str(shot2.relative_to(ROOT)))

        check('copy técnica antiga de exclusão ausente do DOM', page.get_by_text('representação(ões) visuais', exact=False).count() == 0)
        browser.close()
        result['status'] = 'PASS'
        save_result(0)
except Exception as exc:
    msg = repr(exc)
    if any(token in msg for token in ['ERR_CONNECTION_REFUSED','ERR_BLOCKED_BY_ADMINISTRATOR','Executable doesn\'t exist','browserType.launch']):
        result['status'] = 'UNAVAILABLE'
        result['reason'] = msg
        save_result(2)
    result['status'] = 'FAIL'
    result['reason'] = msg
    save_result(1)

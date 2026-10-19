#!/usr/bin/env python3
"""Browser truth gate for V1.20.0 Problem & Evidence Studio."""
from __future__ import annotations
import json, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'v1200-problem-evidence-studio'
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
    result['status'] = 'UNAVAILABLE'; result['reason'] = f'Playwright Python indisponível: {exc}'; save_result(2)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1200})
        page.goto(URL, wait_until='domcontentloaded', timeout=20000)
        if page.get_by_text('Abrir workspace local sem conta', exact=False).count():
            page.get_by_text('Abrir workspace local sem conta', exact=False).click(); page.wait_for_timeout(500)
        if page.get_by_text('+ Criar serviço', exact=True).count():
            page.get_by_text('+ Criar serviço', exact=True).click()
            if page.locator('[role="dialog"] input').count(): page.locator('[role="dialog"] input').first.fill('Serviço QA Problema')
            page.get_by_text('Criar serviço', exact=True).last.click(); page.wait_for_timeout(500)
        check('Discovery Workspace visível', page.locator('[data-discovery-workspace="1"]').count() > 0)
        check('Problem & Evidence Studio visível', page.locator('[data-problem-evidence-studio="1"]').count() > 0)
        check('aba Hipóteses e problemas', page.get_by_text('Hipóteses e problemas', exact=False).count() > 0)
        check('aba Evidências', page.get_by_text('Evidências', exact=True).count() > 0)
        check('ação Nova hipótese', page.get_by_text('+ Nova hipótese', exact=True).count() > 0)
        check('ação Nova evidência', page.get_by_text('+ Nova evidência', exact=True).count() > 0)
        shot = OUT / '01-problem-evidence-studio.png'
        page.screenshot(path=str(shot), full_page=True); result['screenshots'].append(str(shot.relative_to(ROOT)))
        browser.close(); result['status'] = 'PASS'; save_result(0)
except Exception as exc:
    msg = repr(exc)
    if any(token in msg for token in ['ERR_CONNECTION_REFUSED', 'ERR_BLOCKED_BY_ADMINISTRATOR', "Executable doesn't exist", 'browserType.launch', 'BrowserType.launch']):
        result['status'] = 'UNAVAILABLE'; result['reason'] = msg; save_result(2)
    result['status'] = 'FAIL'; result['reason'] = msg; save_result(1)

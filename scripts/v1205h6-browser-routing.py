#!/usr/bin/env python3
"""Browser truth for V1.20.5-H6 Routing & Layer Recovery.

Requires a reachable app and Python Playwright. Never converts unavailable browser
infrastructure into PASS.
"""
from __future__ import annotations
import json, os, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'v1205h6-routing'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('BLUE_OCEAN_URL', 'http://127.0.0.1:4173')
result = {'url': URL, 'status': 'UNKNOWN', 'checks': [], 'screenshots': []}

def record(name, passed, detail=''):
    result['checks'].append({'name': name, 'pass': bool(passed), 'detail': detail})
    if not passed:
        raise AssertionError(f'{name}: {detail}')

def finish(code):
    (OUT / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(code)

try:
    from playwright.sync_api import sync_playwright
except Exception as exc:
    result['status'] = 'UNAVAILABLE'
    result['reason'] = f'Playwright Python indisponível: {exc}'
    finish(2)

LEGACY = ['#bo-v114-workspace-home','#rt187-journey-home','#rt182-blueprint-home']

def legacy_visible(page):
    return page.evaluate("""sels => sels.filter(sel => { const el=document.querySelector(sel); if(!el) return false; const s=getComputedStyle(el); return !el.hidden && s.display!=='none' && s.visibility!=='hidden'; })""", LEGACY)

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1440, 'height': 1000})
        page.goto(URL, wait_until='domcontentloaded', timeout=20000)
        if page.get_by_text('Abrir workspace local sem conta', exact=False).count():
            page.get_by_text('Abrir workspace local sem conta', exact=False).click()
        page.wait_for_timeout(700)

        record('shell React nativo presente', page.locator('aside[data-bo-precision-sidebar-native="1"]').count() == 1)
        record('Workspace legado não injetado', page.locator('[data-bo-workspace-home-nav]').count() == 0)
        record('Criar global legado não injetado', page.locator('[data-bo-global-create]').count() == 0)

        for tab in ['home','whiteboards','journey','context','home']:
            page.evaluate("tab => window.dispatchEvent(new CustomEvent('rt-navigation',{detail:tab}))", tab)
            page.wait_for_timeout(180)
            active = page.locator('main[data-bo-precision-workspace-native="1"]').get_attribute('data-bo-active-view')
            record(f'view ativa = {tab}', active == tab, f'active={active}')
            visible = legacy_visible(page)
            record(f'nenhuma Home/Library legada visível em {tab}', len(visible) == 0, ','.join(visible))
            dashboard_count = page.locator('[data-bo-workspace-home-native="1"]').count()
            record(f'Dashboard ownership correto em {tab}', dashboard_count == (1 if tab == 'home' else 0), f'count={dashboard_count}')

        shot = OUT / 'routing-final.png'
        page.screenshot(path=str(shot), full_page=True)
        result['screenshots'].append(str(shot.relative_to(ROOT)))
        browser.close()
        result['status'] = 'PASS'
        finish(0)
except Exception as exc:
    text = repr(exc)
    if any(token in text for token in ['ERR_CONNECTION_REFUSED','Executable doesn\'t exist','browserType.launch']):
        result['status'] = 'UNAVAILABLE'
        result['reason'] = text
        finish(2)
    result['status'] = 'FAIL'
    result['reason'] = text
    finish(1)

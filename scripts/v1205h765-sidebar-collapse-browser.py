#!/usr/bin/env python3
"""H7.65 visual regression: collapsed sidebar must show ONLY icons."""
import functools
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts' / 'sidebar-collapse-h765'
OUT.mkdir(parents=True, exist_ok=True)


class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def check(value, label):
    print(('OK ' if value else 'FAIL ') + label, flush=True)
    if not value:
        raise AssertionError(label)


server = None
URL = os.environ.get('BLUE_OCEAN_URL')
if not URL:
    server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT / 'dist')))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    URL = f'http://127.0.0.1:{server.server_port}'

try:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=['--no-sandbox', '--disable-dev-shm-usage'])
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto(URL, wait_until='networkidle')
        local = page.get_by_role('button', name='Abrir workspace local sem conta')
        if local.count() and local.is_visible():
            local.click()
        sidebar = page.locator('aside[data-layout-corrigido="H7.65"]')
        expect(sidebar).to_be_visible(timeout=15000)
        expect(sidebar.locator('[data-sidebar-item="home"]')).to_be_visible()
        if sidebar.get_attribute('data-sidebar-collapsed') == '1':
            sidebar.get_by_role('button', name='Expandir sidebar').click()
        expect(sidebar).to_have_attribute('data-sidebar-collapsed', '0')
        page.wait_for_timeout(350)
        expanded = sidebar.evaluate('(el) => el.getBoundingClientRect().width')
        check(abs(expanded - 256) <= 2, f'Expanded sidebar width is 256px (actual {expanded:.1f})')
        check(sidebar.locator('.bo-h764-item-label').first.is_visible(), 'Expanded navigation shows labels')
        check(sidebar.locator('.bo-h764-section-heading > span').first.is_visible(), 'Expanded navigation shows section headers')
        page.screenshot(path=str(OUT / 'expanded.png'), animations='disabled')

        sidebar.get_by_role('button', name='Recolher sidebar').click()
        expect(sidebar).to_have_attribute('data-sidebar-collapsed', '1')
        page.wait_for_timeout(350)
        collapsed = sidebar.evaluate('(el) => el.getBoundingClientRect().width')
        check(abs(collapsed - 72) <= 2, f'Collapsed sidebar width is 72px (actual {collapsed:.1f})')
        hidden = sidebar.evaluate('''(el) => {
          const labels = [...el.querySelectorAll('.bo-h764-item-label, .bo-h764-section-heading > span, .bo-h764-context-text')];
          return labels.length > 4 && labels.every(node => {
            const s = getComputedStyle(node);
            return s.display === 'none' || s.visibility === 'hidden';
          });
        }''')
        check(hidden, 'Collapsed sidebar hides ALL navigation and section labels')
        check(sidebar.locator('.bo-h764-collapse-button').is_visible(), 'Expand button stays visible')
        check(sidebar.get_by_role('button', name='Personas').is_visible(), 'Personas is still accessible by icon')
        overflow = sidebar.evaluate('(el) => el.scrollWidth <= el.clientWidth + 3')
        check(overflow, 'Collapsed sidebar has no overflowing cut-off text')
        page.screenshot(path=str(OUT / 'collapsed.png'), animations='disabled')

        sidebar.get_by_role('button', name='Expandir sidebar').click()
        expect(sidebar).to_have_attribute('data-sidebar-collapsed', '0')
        page.wait_for_timeout(350)
        check(sidebar.get_by_role('button', name='Personas').is_visible(), 'Expanding restores readable navigation')

        # Crucial: mobile drawer must show text even when desktop preference says collapsed.
        sidebar.get_by_role('button', name='Recolher sidebar').click()
        page.set_viewport_size({'width': 390, 'height': 780})
        page.locator('.bo1175-mobile-menu').first.click()
        page.wait_for_timeout(350)
        check(sidebar.locator('.bo-h764-item-label').first.is_visible(), 'Mobile drawer shows labels despite stored desktop collapse')
        mobile_width = sidebar.evaluate('(el) => el.getBoundingClientRect().width')
        check(abs(mobile_width - 256) <= 2, f'Mobile drawer is 256px (actual {mobile_width:.1f})')
        page.screenshot(path=str(OUT / 'mobile.png'), animations='disabled')
        (OUT / 'result.json').write_text(json.dumps({
          'expanded': expanded, 'collapsed': collapsed, 'mobile': mobile_width,
          'labels_hidden_when_collapsed': hidden, 'overflow_free': overflow,
        }, indent=2), encoding='utf-8')
        context.close()
        browser.close()
finally:
    if server:
        server.shutdown()
        server.server_close()

print('H7.65 collapsed-sidebar browser regression: PASS')

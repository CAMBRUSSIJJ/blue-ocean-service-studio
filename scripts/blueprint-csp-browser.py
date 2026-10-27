#!/usr/bin/env python3
"""Validate Blueprint's actual JavaScript execution under Linux production CSP."""
import os
import subprocess
import sys
import time
from urllib.request import urlopen
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = "http://127.0.0.1:4173"
EDITOR = BASE + "/blueprint-reference-original.html"
if not (ROOT / 'dist' / 'index.html').is_file():
    raise SystemExit("Build dist/ não encontrado. Execute npm run build antes do teste.")

env = dict(os.environ)
env.pop('DISPLAY', None)
env.pop('WAYLAND_DISPLAY', None)
process = subprocess.Popen([sys.executable, str(ROOT / 'scripts' / 'serve-linux.py')], cwd=ROOT,
                           env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
                           text=True)
try:
    for _ in range(45):
        if process.poll() is not None:
            raise AssertionError("Servidor encerrou durante a inicialização: " + process.stderr.read()[-2000:])
        try:
            with urlopen(BASE + "/", timeout=1) as response:
                if response.status == 200:
                    break
        except Exception:
            time.sleep(0.25)
    else:
        raise AssertionError("Servidor Linux não respondeu em 4173")

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            page = browser.new_page(viewport={"width": 1340, "height": 850})
            errors, blocked = [], []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("console", lambda msg: blocked.append(msg.text) if 'Content Security Policy' in msg.text else None)
            page.goto(EDITOR, wait_until='domcontentloaded', timeout=30000)
            page.wait_for_function("() => window.BlueOceanJourneyContent && document.querySelector('#app')?.children.length > 0", timeout=15000)
            assert page.locator('#app').is_visible(), "Blueprint vazio"
            assert not blocked, "Política CSP bloqueou editor: " + repr(blocked)
            assert not errors, "Erro de JavaScript no Blueprint: " + repr(errors)
            # The same document must also be allowed as a same-origin iframe.
            page.goto(BASE + "/", wait_until="domcontentloaded", timeout=30000)
            page.evaluate("""() => {
              const iframe=document.createElement('iframe');
              iframe.id='blueprint-csp-regression';
              iframe.src='/blueprint-reference-original.html';
              iframe.style.cssText='width:900px;height:600px';
              document.body.append(iframe);
            }""")
            inner = page.frame_locator('#blueprint-csp-regression')
            inner.locator('#app > *').first.wait_for(state='visible', timeout=15000)
            assert not blocked, "CSP impediu iframe local: " + repr(blocked)
            print("Blueprint Linux: JS incorporado executou e iframe carregou sob CSP restritiva.")
        finally:
            browser.close()
finally:
    process.terminate()
    try:
        process.wait(timeout=6)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)

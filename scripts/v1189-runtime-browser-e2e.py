#!/usr/bin/env python3
from playwright.sync_api import sync_playwright
import json, sys
from pathlib import Path
url=sys.argv[1] if len(sys.argv)>1 else Path(__file__).with_name('v1189-runtime-browser-harness.html').resolve().as_uri()
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-web-security','--allow-file-access-from-files'])
    page=browser.new_page(viewport={"width":1440,"height":900})
    console=[]
    page.on('console', lambda msg: console.append(f'{msg.type}: {msg.text}'))
    page.goto(url, wait_until='networkidle')
    page.wait_for_function('window.__V1189_RESULT__ !== undefined', timeout=30000)
    result=page.evaluate('window.__V1189_RESULT__')
    for row in result.get('checks',[]): print(('OK   ' if row['pass'] else 'FAIL ')+row['name']+((' · '+row.get('detail','')) if row.get('detail') else ''))
    if result.get('errors'):
        print('\nErrors:')
        for e in result['errors']: print(e)
    print(f"\nBrowser Runtime E2E V1.18.9: {sum(1 for x in result.get('checks',[]) if x['pass'])}/{len(result.get('checks',[]))}")
    browser.close()
    sys.exit(0 if result.get('ok') else 1)

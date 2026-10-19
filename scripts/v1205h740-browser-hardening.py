#!/usr/bin/env python3
from __future__ import annotations
import json, shutil, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'v1205h740-browser-hardening'; OUT.mkdir(parents=True,exist_ok=True)
result={'status':'UNKNOWN','checks':[],'browser':None,'scope':'source CSS/runtime capability via about:blank; no app server'}
def check(name,cond,detail=''):
    row={'name':name,'pass':bool(cond),'detail':detail}; result['checks'].append(row); print(('PASS' if cond else 'FAIL'),name,('— '+detail if detail else ''))
def finish(code,status,reason=''):
    result['status']=status
    if reason: result['reason']=reason
    (OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f"\nH7.40 Browser Hardening: {sum(1 for x in result['checks'] if x['pass'])}/{len(result['checks'])} · {status}")
    return code
try:
    from playwright.sync_api import sync_playwright
except Exception as exc:
    raise SystemExit(finish(2,'UNAVAILABLE',f'Playwright indisponível: {exc}'))
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium: raise SystemExit(finish(2,'UNAVAILABLE','Chromium não encontrado'))
css=(ROOT/'src/runtime/product-hardening-h740.css').read_text(encoding='utf-8')
markup='''<section class="bo-h740"><header class="bo-h740-hero"><div><small>H7.40</small><h2>Prontidão</h2><p>Browser gate</p></div><div class="bo-h740-score is-ready"><strong>100</strong><span>/100</span><small>Pronto</small></div></header><section class="bo-h740-area-grid">''' + ''.join('<article><span>✓</span><div><small>Área</small><strong>100%</strong><p>controle</p></div></article>' for _ in range(6)) + '''</section><section class="bo-h740-grid"><article class="bo-h740-panel"><div class="bo-h740-checks"><div class="is-pass"><span>✓</span><div><strong>Controle</strong><p>OK</p></div><em>OK</em></div></div></article><aside class="bo-h740-side"><article class="bo-h740-panel"><div class="bo-h740-actions"><button type="button">Salvar</button></div></article></aside></section></section>'''
try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    result['browser']=browser.version
    page=browser.new_page(viewport={'width':1280,'height':800},reduced_motion='reduce')
    page.set_content(f'<style>{css}</style>{markup}',wait_until='domcontentloaded')
    check('Chromium real iniciou',bool(browser.version),browser.version)
    check('DOM H7.40 renderiza',page.locator('.bo-h740').count()==1)
    check('hero H7.40 renderiza',page.locator('.bo-h740-hero').count()==1)
    check('seis áreas renderizam',page.locator('.bo-h740-area-grid article').count()==6)
    check('IndexedDB API exposta',page.evaluate("() => typeof indexedDB === 'object'"))
    check('BroadcastChannel API exposta',page.evaluate("() => typeof BroadcastChannel === 'function'"))
    check('matchMedia API exposta',page.evaluate("() => typeof matchMedia === 'function'"))
    check('reduced-motion do browser ativo',page.evaluate("() => matchMedia('(prefers-reduced-motion: reduce)').matches"))
    desktop_cols=page.locator('.bo-h740-area-grid').evaluate("e => getComputedStyle(e).gridTemplateColumns.split(' ').length")
    check('desktop usa seis colunas',desktop_cols==6,str(desktop_cols))
    page.set_viewport_size({'width':800,'height':800}); page.wait_for_timeout(40)
    tablet_cols=page.locator('.bo-h740-area-grid').evaluate("e => getComputedStyle(e).gridTemplateColumns.split(' ').length")
    check('tablet reduz para duas colunas',tablet_cols==2,str(tablet_cols))
    page.set_viewport_size({'width':500,'height':800}); page.wait_for_timeout(40)
    mobile_cols=page.locator('.bo-h740-area-grid').evaluate("e => getComputedStyle(e).gridTemplateColumns.split(' ').length")
    check('mobile reduz para uma coluna',mobile_cols==1,str(mobile_cols))
    page.locator('button').focus()
    outline=page.locator('button').evaluate("e => getComputedStyle(e).outlineStyle")
    check('focus visible possui outline',outline!='none',str(outline))
    duration=page.locator('.bo-h740-actions button').evaluate("e => getComputedStyle(e).animationDuration")
    check('reduced-motion neutraliza animação',duration in ('0.001ms','1e-06s','0s'),str(duration))
    page.screenshot(path=str(OUT/'browser-hardening.png'),full_page=True)
    browser.close()
except Exception as exc:
  raise SystemExit(finish(2,'UNAVAILABLE',repr(exc)))
failed=[x for x in result['checks'] if not x['pass']]
raise SystemExit(finish(1 if failed else 0,'FAIL' if failed else 'PASS'))

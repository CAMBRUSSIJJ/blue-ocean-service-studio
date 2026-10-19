#!/usr/bin/env python3
from __future__ import annotations
import json, shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'v1205h740h3-browser-coherence'; OUT.mkdir(parents=True,exist_ok=True)
result={'status':'UNKNOWN','checks':[],'browser':None,'scope':'grouped workspace navigation CSS via Chromium; no app server'}
def check(name,cond,detail=''):
    result['checks'].append({'name':name,'pass':bool(cond),'detail':detail}); print(('PASS' if cond else 'FAIL'),name,('— '+detail if detail else ''))
def finish(code,status,reason=''):
    result['status']=status
    if reason: result['reason']=reason
    (OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(f"\nH7.40-H3 Browser Coherence: {sum(1 for x in result['checks'] if x['pass'])}/{len(result['checks'])} · {status}")
    return code
try:
    from playwright.sync_api import sync_playwright
except Exception as exc:
    raise SystemExit(finish(2,'UNAVAILABLE',f'Playwright indisponível: {exc}'))
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium: raise SystemExit(finish(2,'UNAVAILABLE','Chromium não encontrado'))
css=(ROOT/'src/runtime/unified-service-blueprint-h722.css').read_text(encoding='utf-8')+'\n'+(ROOT/'src/runtime/product-coherence-h740h3.css').read_text(encoding='utf-8')
groups=['Visão geral','Entender','Projetar','Validar','Melhorar','Operar']
sub=['Journey','Canais','Blueprint','Whiteboard']
markup='<section class="bo-h722-service-workspace"><header class="bo-h722-workspace-head"><div class="bo-h722-head-copy"><div class="bo-h722-eyebrow">BLUE OCEAN · SERVIÇO</div><h1>Lavanderia com entrega</h1><p>Workspace agrupado</p></div></header><nav class="bo-h722-tabs bo-h740h3-workspace-groups">'+''.join(f'<button class="{"active" if i==2 else ""}"><span>{g}</span></button>' for i,g in enumerate(groups))+'</nav><nav class="bo-h740h3-workspace-subnav">'+''.join(f'<button class="{"active" if i==0 else ""}"><span>{g}</span></button>' for i,g in enumerate(sub))+'</nav><main style="min-height:500px;padding:24px">Conteúdo</main></section>'
try:
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    result['browser']=browser.version
    page=browser.new_page(viewport={'width':1920,'height':1000})
    page.set_content(f'<style>html,body{{margin:0;max-width:100%;overflow-x:hidden}}*{{box-sizing:border-box}}{css}</style>{markup}',wait_until='domcontentloaded')
    check('Chromium real iniciou',bool(browser.version),browser.version)
    check('seis grupos renderizam',page.locator('.bo-h740h3-workspace-groups button').count()==6)
    check('subnav contextual renderiza',page.locator('.bo-h740h3-workspace-subnav button').count()==4)
    cols=page.locator('.bo-h740h3-workspace-groups').evaluate("e => getComputedStyle(e).gridTemplateColumns.split(' ').length")
    check('desktop 1920 usa seis grupos',cols==6,str(cols))
    overflow=page.evaluate('() => document.documentElement.scrollWidth > window.innerWidth')
    check('desktop sem overflow horizontal global',not overflow,f"scroll={page.evaluate('() => document.documentElement.scrollWidth')} viewport=1920")
    page.set_viewport_size({'width':1000,'height':900}); page.wait_for_timeout(50)
    cols=page.locator('.bo-h740h3-workspace-groups').evaluate("e => getComputedStyle(e).gridTemplateColumns.split(' ').length")
    check('tablet 1000 reduz para três grupos',cols==3,str(cols))
    check('tablet sem overflow global',not page.evaluate('() => document.documentElement.scrollWidth > window.innerWidth'))
    page.set_viewport_size({'width':600,'height':900}); page.wait_for_timeout(50)
    cols=page.locator('.bo-h740h3-workspace-groups').evaluate("e => getComputedStyle(e).gridTemplateColumns.split(' ').length")
    check('mobile 600 reduz para dois grupos',cols==2,str(cols))
    check('mobile sem overflow global',not page.evaluate('() => document.documentElement.scrollWidth > window.innerWidth'))
    check('subnav mantém scroll próprio',page.locator('.bo-h740h3-workspace-subnav').evaluate("e => getComputedStyle(e).overflowX") in ('auto','scroll'))
    page.screenshot(path=str(OUT/'browser-coherence.png'),full_page=True)
    browser.close()
except Exception as exc:
    raise SystemExit(finish(2,'UNAVAILABLE',repr(exc)))
failed=[x for x in result['checks'] if not x['pass']]
raise SystemExit(finish(1 if failed else 0,'FAIL' if failed else 'PASS'))

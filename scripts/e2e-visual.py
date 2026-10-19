#!/usr/bin/env python3
"""E2E visual smoke for CI. Requires `pip install playwright pillow` and Chromium."""
from __future__ import annotations
import argparse, json, os, subprocess, sys, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright
except Exception as exc:
    print('Playwright Python indisponível:', exc, file=sys.stderr); raise SystemExit(2)
try:
    from PIL import Image, ImageChops
except Exception:
    Image=ImageChops=None

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
ART=ROOT/'artifacts'/'e2e-v1162'
BASE=ROOT/'tests'/'visual-baseline'
VIEWPORTS=[('desktop',1440,900),('tablet',1024,768),('mobile',390,844)]

class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def serve():
    handler=lambda *a,**kw: Quiet(*a,directory=str(DIST),**kw)
    server=ThreadingHTTPServer(('127.0.0.1',4173),handler)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    return server

def compare_images(actual: Path, baseline: Path, tolerance: float = 0.012):
    if Image is None or not baseline.exists(): return None
    a=Image.open(actual).convert('RGB'); b=Image.open(baseline).convert('RGB')
    if a.size!=b.size: return 1.0
    diff=ImageChops.difference(a,b)
    hist=diff.histogram(); total=a.size[0]*a.size[1]*3*255
    magnitude=sum((i%256)*count for i,count in enumerate(hist))
    return magnitude/total if total else 0.0

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--update-baseline',action='store_true'); ap.add_argument('--require-baseline',action='store_true'); args=ap.parse_args()
    if not (DIST/'index.html').exists(): print('dist/index.html ausente',file=sys.stderr); return 2
    ART.mkdir(parents=True,exist_ok=True); BASE.mkdir(parents=True,exist_ok=True)
    server=serve(); errors=[]
    try:
      with sync_playwright() as p:
        browser=p.chromium.launch(headless=True)
        for name,w,h in VIEWPORTS:
          page=browser.new_page(viewport={'width':w,'height':h})
          page.on('pageerror',lambda e,n=name: errors.append(f'{n}: pageerror: {e}'))
          page.goto('http://127.0.0.1:4173/',wait_until='networkidle',timeout=30000)
          page.wait_for_selector('#root',timeout=10000)
          body=page.locator('body').inner_text()
          if 'Falha ao iniciar' in body or 'Application error' in body: errors.append(f'{name}: estado fatal visível')
          overflow=page.evaluate('() => document.documentElement.scrollWidth - window.innerWidth')
          if overflow>3: errors.append(f'{name}: overflow horizontal global {overflow}px')
          shot=ART/f'home-{name}.png'; page.screenshot(path=str(shot),full_page=True)
          if name=='desktop':
            ds=browser.new_page(viewport={'width':w,'height':h})
            ds.goto('http://127.0.0.1:4173/?design-system=1',wait_until='networkidle',timeout=30000)
            ds.wait_for_selector('.bo-ds-page',timeout=10000)
            ds.screenshot(path=str(ART/'design-system-desktop.png'),full_page=True)
            ds.close()
          try:
            page.wait_for_function("() => window.BlueOceanRuntime?.api?.('whiteboardCore')",timeout=10000)
            page.evaluate("() => window.BlueOceanRuntime.api('whiteboardCore').createBlank('E2E Visual')")
            page.wait_for_selector('.rt144-overlay',timeout=10000)
            page.wait_for_timeout(500)
            page.screenshot(path=str(ART/f'whiteboard-{name}.png'),full_page=True)
            page.evaluate("() => window.BlueOceanRuntime.api('guidedBuilder')?.open?.()")
            page.wait_for_timeout(500)
            page.screenshot(path=str(ART/f'wizard-{name}.png'),full_page=True)
          except Exception as exc:
            errors.append(f'{name}: whiteboard/wizard: {exc}')
          page.close()
        browser.close()
    finally: server.shutdown(); server.server_close()
    if args.update_baseline:
      for f in ART.glob('*.png'): (BASE/f.name).write_bytes(f.read_bytes())
      print(f'Baseline atualizada: {len(list(BASE.glob("*.png")))} screenshots')
    baseline=list(BASE.glob('*.png'))
    if args.require_baseline and len(baseline)<len(VIEWPORTS)*3: errors.append('baseline visual incompleta; execute --update-baseline e versione tests/visual-baseline')
    diffs={}
    for actual in ART.glob('*.png'):
      ratio=compare_images(actual,BASE/actual.name)
      if ratio is not None:
        diffs[actual.name]=round(ratio,6)
        if ratio>0.012: errors.append(f'{actual.name}: regressão visual {ratio:.2%} > 1.20%')
    manifest={'viewports':[x[0] for x in VIEWPORTS],'screenshots':sorted(x.name for x in ART.glob('*.png')),'visualDiff':diffs,'errors':errors}
    (ART/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    if errors:
      for e in errors: print('FAIL',e,file=sys.stderr)
      return 1
    print(f'E2E visual: OK · {len(manifest["screenshots"])} screenshots')
    return 0
if __name__=='__main__': raise SystemExit(main())

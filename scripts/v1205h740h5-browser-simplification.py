from pathlib import Path
import sys,shutil
ROOT=Path(__file__).resolve().parents[1]
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print('UNAVAILABLE Playwright:',e); sys.exit(2)
css=(ROOT/'src/runtime/service-workspace-simplification-h740h5.css').read_text(encoding='utf-8')
phase=lambda name: f'''<button data-phase="{name}"><header><span>◎</span><em>50%</em></header><strong>{name}</strong><p>Descrição curta da fase.</p><div><span>A</span><span>B</span><span>C</span></div><footer><small>2/3 estruturadas</small><b>Abrir →</b></footer></button>'''
markup='''<main class="bo-h740h5"><div class="bo-h740h5-kpis">'''+''.join('<div><small>KPI</small><strong>50%</strong><span>Status</span></div>' for _ in range(6))+'''</div><section class="bo-h740h5-phase-map"><div class="bo-h740h5-phase-grid">'''+''.join(phase(x) for x in ['understand','design','validate','improve','operate'])+'''</div></section></main>'''
checks=[]
def ck(label,value): checks.append(bool(value)); print(('OK ' if value else 'FAIL ')+label)
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium:
    print('UNAVAILABLE Chromium não encontrado'); sys.exit(2)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1920,'height':1100}); page.set_content(f'<style>body{{margin:0;padding:24px}}{css}</style>{markup}')
    ck('cinco fases renderizam',page.locator('.bo-h740h5-phase-grid>button').count()==5)
    ck('seis KPIs renderizam',page.locator('.bo-h740h5-kpis>div').count()==6)
    ck('desktop usa 5 colunas',len(page.locator('.bo-h740h5-phase-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==5)
    ck('CTA não é absoluto',page.locator('.bo-h740h5-phase-grid footer').first.evaluate("e=>getComputedStyle(e).position")=='static')
    ck('desktop sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':1200,'height':900})
    ck('laptop usa 3 colunas',len(page.locator('.bo-h740h5-phase-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==3)
    ck('laptop sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':800,'height':900})
    ck('tablet usa 2 colunas',len(page.locator('.bo-h740h5-phase-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==2)
    ck('tablet sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':600,'height':1000})
    ck('mobile usa 1 coluna',len(page.locator('.bo-h740h5-phase-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==1)
    ck('mobile sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    browser.close()
print(f"\nH7.40-H5 Browser Simplification: {sum(checks)}/{len(checks)} · {'PASS' if all(checks) else 'FAIL'}")
sys.exit(0 if all(checks) else 1)

from pathlib import Path
import json,sys,shutil
ROOT=Path(__file__).resolve().parents[1]
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print('UNAVAILABLE Playwright:',e); sys.exit(2)
css=(ROOT/'src/runtime/product-polish-h740h4.css').read_text(encoding='utf-8')
markup='''<main class="bo-h740h4"><section class="bo-h740h4-service-guide"><header><div><small>MEU SERVIÇO</small><h2>Lavanderia <span>4/6 fundamentos</span></h2><p>Progresso</p></div><button>Continuar</button></header><div class="bo-h740h4-service-guide__steps">'''+''.join(f'<button class="{"is-done" if i<4 else ""}"><b>{"✓" if i<4 else i+1}</b><span><strong>Etapa {i+1}</strong><small>Detalhe</small></span></button>' for i in range(6))+'''</div><footer><span>Próxima ação</span><em>66% estruturado</em></footer></section><div class="bo-h740h4-metrics-bridge"><div><strong>Catálogo</strong><p>Defina aqui</p></div><button>Resultados</button></div></main>'''
checks=[]
def ck(label,value): checks.append({'label':label,'pass':bool(value)}); print(('OK ' if value else 'FAIL ')+label)
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium:
    print('UNAVAILABLE Chromium não encontrado'); sys.exit(2)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1920,'height':1200}); page.set_content(f'<style>{css}</style>{markup}')
    ck('guia renderiza',page.locator('.bo-h740h4-service-guide').count()==1)
    ck('seis fundamentos',page.locator('.bo-h740h4-service-guide__steps button').count()==6)
    ck('desktop 6 colunas',len(page.locator('.bo-h740h4-service-guide__steps').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==6)
    ck('desktop sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':1000,'height':900})
    ck('tablet 3 colunas',len(page.locator('.bo-h740h4-service-guide__steps').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==3)
    ck('tablet sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':600,'height':900})
    ck('mobile 2 colunas',len(page.locator('.bo-h740h4-service-guide__steps').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==2)
    ck('mobile sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    browser.close()
status=all(x['pass'] for x in checks)
print(f"\nH7.40-H4 Browser Polish: {sum(x['pass'] for x in checks)}/{len(checks)} · {'PASS' if status else 'FAIL'}")
sys.exit(0 if status else 1)

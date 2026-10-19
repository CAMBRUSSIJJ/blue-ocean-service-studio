from pathlib import Path
import sys,shutil
ROOT=Path(__file__).resolve().parents[1]
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print('UNAVAILABLE Playwright:',e); sys.exit(2)
css=(ROOT/'src/runtime/project-home-h740h8.css').read_text(encoding='utf-8')
card=lambda i:f'''<article class="bo-h740h8-project-card"><header><span class="bo-h740h8-project-icon">▣</span><button>☆</button></header><div><small>PROJETO</small><h3>Projeto {i}</h3><p>Serviço {i}</p></div><div class="bo-h740h8-project-meta"><span>Projetar</span><span>2 Journeys</span></div><footer><span>agora</span><button class="primary">Abrir →</button></footer></article>'''
markup='''<section class="bo-h740h8-home"><header class="bo-h740h8-hero"><div><small>BLUE OCEAN</small><h1>Seu trabalho começa aqui</h1><p>Abra um projeto ou continue de onde parou.</p></div><button class="primary">+ Novo projeto</button></header><section class="bo-h740h8-continue"><div><small>CONTINUE DE ONDE PAROU</small><h2>Lavanderia</h2><p>Serviço: Entrega e coleta</p><div><span>Projetar</span><span>2 Journeys</span></div></div><button class="primary">Continuar projeto</button></section><section class="bo-h740h8-section"><header><div><small>PROJETOS</small><h2>Seus projetos</h2></div></header><div class="bo-h740h8-project-grid">'''+''.join(card(i) for i in range(3))+'''</div></section></section>'''
checks=[]
def ck(label,value): checks.append(bool(value)); print(('OK ' if value else 'FAIL ')+label)
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium: print('UNAVAILABLE Chromium não encontrado'); sys.exit(2)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1920,'height':1080}); page.set_content(f'<style>body{{margin:0;background:#f5f8fb;font-family:Arial,sans-serif}}{css}</style>{markup}')
    ck('desktop usa 3 colunas de projetos',len(page.locator('.bo-h740h8-project-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==3)
    ck('hero global não estoura',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    ck('continue de onde parou é visível',page.locator('.bo-h740h8-continue').is_visible())
    page.set_viewport_size({'width':1000,'height':900})
    ck('tablet usa 2 colunas',len(page.locator('.bo-h740h8-project-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==2)
    ck('tablet sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':600,'height':900})
    ck('mobile usa 1 coluna',len(page.locator('.bo-h740h8-project-grid').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==1)
    ck('mobile hero empilha',page.locator('.bo-h740h8-hero').evaluate("e=>getComputedStyle(e).flexDirection")=='column')
    ck('mobile sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    browser.close()
print(f"\nH7.40-H8 Browser Project Home: {sum(checks)}/{len(checks)} · {'PASS' if all(checks) else 'FAIL'}")
sys.exit(0 if all(checks) else 1)

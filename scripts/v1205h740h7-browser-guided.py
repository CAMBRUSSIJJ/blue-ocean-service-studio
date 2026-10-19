from pathlib import Path
import sys,shutil
ROOT=Path(__file__).resolve().parents[1]
try:
    from playwright.sync_api import sync_playwright
except Exception as e:
    print('UNAVAILABLE Playwright:',e); sys.exit(2)
css=(ROOT/'src/runtime/guided-service-workspace-h740h7.css').read_text(encoding='utf-8')
row=lambda i:f'''<li class="is-{'ready' if i==0 else 'progress'}"><div class="bo-h740h7-capability-main"><span>◎</span><div><strong>Capacidade {i+1}</strong><p><i>Em construção</i>Descrição da capacidade.</p></div></div><em>2 itens · 50%</em><button>Abrir</button></li>'''
markup='''<section class="bo-h740h7 is-overview"><header class="bo-h740h7-hero"><div class="bo-h740h7-hero-main"><h1>Serviço</h1><p>Fase por fase</p><div class="bo-h740h7-maturity"><div><strong>Estruturação</strong><span>2 de 16</span></div><div class="bo-h740h7-meter"><i style="width:13%"></i></div><b>13%</b></div></div><aside class="bo-h740h7-next"><small>PRÓXIMO PASSO</small><h2>Crie o Blueprint</h2><p>Recomendação determinística.</p><button>Criar Blueprint</button></aside></header><div class="bo-h740h7-overview"><section class="bo-h740h7-path"><div class="bo-h740h7-stepper">'''+''.join(f'<button class="{"active" if i==1 else ""}"><span>{i+1}</span><div><strong>{x}</strong><small>1 de 3</small></div></button>' for i,x in enumerate(['Entender','Projetar','Validar','Melhorar','Operar']))+'''</div><div class="bo-h740h7-capability-panel"><header><div><h3>Projetar</h3><p>Descrição</p></div><button>Abrir fase</button></header><ul>'''+''.join(row(i) for i in range(4))+'''</ul></div></section></div></section>'''
checks=[]
def ck(label,value): checks.append(bool(value)); print(('OK ' if value else 'FAIL ')+label)
chromium=shutil.which('chromium') or shutil.which('chromium-browser') or shutil.which('google-chrome')
if not chromium:
    print('UNAVAILABLE Chromium não encontrado'); sys.exit(2)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=chromium,args=['--no-sandbox','--disable-dev-shm-usage'])
    page=browser.new_page(viewport={'width':1920,'height':1080}); page.set_content(f'<style>:root{{--bo-surface:#fff;--bo-surface-2:#f7f9fc;--bo-border:#dce6f0;--bo-text:#172033;--bo-muted:#667085}}body{{margin:0;background:#f5f8fb}}{css}</style>{markup}')
    ck('hero desktop em 2 colunas',len(page.locator('.bo-h740h7-hero').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==2)
    ck('cinco fases no stepper',page.locator('.bo-h740h7-stepper>button').count()==5)
    ck('capabilities em rows',page.locator('.bo-h740h7-capability-panel li').count()==4)
    ck('CTA fica no fluxo normal',page.locator('.bo-h740h7-capability-panel li>button').first.evaluate("e=>getComputedStyle(e).position")=='static')
    ck('desktop sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':1000,'height':900})
    ck('tablet hero colapsa para 1 coluna',len(page.locator('.bo-h740h7-hero').evaluate("e=>getComputedStyle(e).gridTemplateColumns.split(' ')"))==1)
    ck('tablet sem overflow',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':700,'height':900})
    ck('stepper continua com cinco fases',page.locator('.bo-h740h7-stepper>button').count()==5)
    ck('mobile capability row não estoura',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    page.set_viewport_size({'width':480,'height':900})
    ck('phone sem overflow global',page.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    browser.close()
print(f"\nH7.40-H7 Browser Guided Workspace: {sum(checks)}/{len(checks)} · {'PASS' if all(checks) else 'FAIL'}")
sys.exit(0 if all(checks) else 1)

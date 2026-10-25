"""Navigate the unified map UI when a regression suite targets the matrix renderer."""
from playwright.sync_api import expect

def wait_saved(frame):
    expect(frame.locator('[data-save-status]')).to_have_text('Salvo neste navegador')

def use_matrix(frame, perspective='journey'):
    if frame.locator('#cad-svg,.cad-mobile-map').count():
        frame.locator('[data-cad-view]').select_option(perspective)
        wait_saved(frame)
        frame.locator('[data-cad-view]').select_option('matrix')
        wait_saved(frame)

def matrix_perspective(frame, name):
    frame.locator('[data-cad-view]').select_option('blueprint' if name == 'Blueprint' else 'journey')
    wait_saved(frame)
    frame.locator('[data-cad-view]').select_option('matrix')
    wait_saved(frame)
    expect(frame.locator('.map-perspective-label')).to_have_text(name)

def create_map(page):
    page.get_by_role('button', name='Criar mapa', exact=True).first.click()
    page.get_by_role('button', name='Em branco', exact=False).first.click()
    wait_saved(page.frame_locator('.bo-blueprint-reference-frame'))


def open_operational(page):
    """Reach the retained full editor through the real advanced tools menu."""
    frame = page.frame_locator('.bo-blueprint-reference-frame')
    wait_saved(frame)
    use_matrix(frame)
    frame.locator('.tools-menu summary').click()
    frame.get_by_role('button', name='Recursos avançados', exact=False).click()
    page.get_by_role('dialog').filter(has=page.get_by_role('button', name='Editor operacional completo', exact=False)).get_by_role('button', name='Editor operacional completo', exact=False).click()
    expect(page.get_by_role('button', name='Voltar à matriz', exact=True)).to_be_visible()

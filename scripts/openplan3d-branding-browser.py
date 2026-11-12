#!/usr/bin/env python3
"""Browser smoke test for Blue Ocean CAD branding, not editor business logic.

Runs against the built Vite preview; catches the SPA fallback regression and
checks that the OpenPlan3D toolbar, side panel, and CSS skin all load. The test
never edits project data.
"""
from pathlib import Path
import shutil
from subprocess import DEVNULL, Popen
from time import monotonic, sleep
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright

BASE = "http://127.0.0.1:4197"
MARKER = "98f9cb467e4045c6abc5d9880ada1f03dff50c68"
SCREENSHOT_DIR = Path("artifacts/e2e-v1162")
proc = Popen(
    ["node", "node_modules/vite/bin/vite.js", "preview",
     "--host", "127.0.0.1", "--port", "4197", "--strictPort"],
    stdout=DEVNULL,
    stderr=DEVNULL,
)
try:
    deadline = monotonic() + 30
    while monotonic() < deadline:
        if proc.poll() is not None:
            raise AssertionError("Vite preview fechou antes do teste CAD.")
        try:
            with urlopen(BASE + "/openplan3d/blue-ocean-source-commit.txt", timeout=2) as r:
                if r.status == 200 and r.read().decode().strip() == MARKER:
                    break
        except Exception:
            pass
        sleep(0.5)
    else:
        raise AssertionError("Build estático OpenPlan3D ausente do dist; não há o marcador esperado.")

    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, executable_path=shutil.which('chromium'), args=['--no-sandbox', '--enable-unsafe-swiftshader'])
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.goto(
            BASE + "/openplan3d/editor/index.html?boSession=blue-ocean-brand-smoke",
            wait_until="domcontentloaded",
            timeout=30000,
        )
        page.wait_for_function(
            "document.documentElement.getAttribute('data-blue-ocean-cad') === '1'",
            timeout=10000,
        )
        toolbar = page.locator(".h-12.bg-gradient-to-r.from-slate-800.to-slate-700")
        toolbar.wait_for(state="visible", timeout=25000)
        assert page.locator("#root").count() == 0, "Blue Ocean carregou dentro do CAD."
        properties = page.locator("[data-plan-properties]")
        assert properties.count() == 1, "O painel de propriedades nativo desapareceu."
        gradient = toolbar.evaluate("(el) => getComputedStyle(el).backgroundImage")
        assert "linear-gradient" in gradient, "A barra superior perdeu o branding do Blue Ocean."
        # Collapse is CSS-only: the original palette stays mounted and returns
        # after the focus state is cleared, preserving its selected tools.
        tool_rail = page.locator("div.w-64.bg-white.border-r.border-gray-200")
        assert tool_rail.count() == 1, "A paleta de ferramentas do OpenPlan3D desapareceu."
        assert not tool_rail.is_visible(), "A biblioteca deve iniciar recolhida."
        page.get_by_role('button', name='Biblioteca de ferramentas', exact=True).click()
        assert tool_rail.is_visible(), "A biblioteca não abriu."
        page.get_by_role('button', name='Biblioteca de ferramentas', exact=True).click()
        assert not tool_rail.is_visible(), "O botão de biblioteca não recolheu o painel."
        assert tool_rail.count() == 1, "Recolher ferramentas não pode desmontar a paleta."
        for width, height in [(1280, 720), (1600, 900), (768, 900), (390, 844)]:
            page.set_viewport_size({"width": width, "height": height})
            assert toolbar.is_visible(), f"Toolbar desapareceu em {width}x{height}."
            if width < 768:
                expect(tool_rail).not_to_be_in_viewport()
            expect(page.get_by_role('button', name='Biblioteca de ferramentas', exact=True)).to_be_in_viewport()
            expect(page.get_by_role('button', name='Save', exact=True)).to_be_in_viewport(ratio=1)
            expect(page.get_by_role('button', name='Planta 2D', exact=True)).to_be_in_viewport(ratio=1)
            expect(page.get_by_role('button', name='Visão 3D', exact=True)).to_be_in_viewport(ratio=1)
            page.screenshot(path=str(SCREENSHOT_DIR / f"openplan3d-brand-{width}x{height}.png"))
        browser.close()
    print("PASSOU: OpenPlan3D, identidade Blue Ocean, paleta recolhível e 4 viewports.")
finally:
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
        proc.wait(timeout=5)

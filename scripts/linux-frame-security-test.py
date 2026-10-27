#!/usr/bin/env python3
"""Regression: Firefox may embed the local Blueprint, with only trusted inline JS."""
import ast
import base64
import functools
import hashlib
import http.server
import re
import tempfile
import threading
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import urlopen

source_path = Path(__file__).with_name("serve-linux.py")
source = source_path.read_text(encoding="utf-8")
tree = ast.parse(source)
handler_class = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == "HardenedHandler")
hash_function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "editor_inline_script_hashes")
namespace = {
    "http": http, "re": re, "hashlib": hashlib, "base64": base64,
    "urlsplit": urlsplit, "EDITOR_PATH": "/blueprint-reference-original.html",
}
exec(compile(ast.Module(body=[hash_function], type_ignores=[]), "serve-linux.py", "exec"), namespace)
html = Path(__file__).resolve().parents[1] / "src/runtime/journey-matrix.html"
hashes = namespace["editor_inline_script_hashes"](html)
assert hashes, "O editor tem scripts incorporados e precisa de hashes CSP"
assert all(item.startswith("'sha256-") for item in hashes)
namespace["EDITOR_SCRIPT_HASHES"] = hashes
exec(compile(ast.Module(body=[handler_class], type_ignores=[]), "serve-linux.py", "exec"), namespace)
Handler = namespace["HardenedHandler"]

with tempfile.TemporaryDirectory(prefix="bo-frame-test-") as tmp:
    Path(tmp, "index.html").write_text("<html lang='pt-BR'><title>Blue Ocean</title></html>", encoding="utf-8")
    Path(tmp, "blueprint-reference-original.html").write_text(html.read_text(encoding="utf-8"), encoding="utf-8")
    handler = functools.partial(Handler, directory=tmp)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        base = f"http://127.0.0.1:{server.server_address[1]}/"
        with urlopen(base, timeout=5) as response:
            assert response.status == 200
            assert response.headers["X-Frame-Options"] == "SAMEORIGIN"
            csp = response.headers["Content-Security-Policy"]
            assert "frame-ancestors 'self'" in csp
            assert "frame-ancestors 'none'" not in csp
            assert "default-src 'self'" in csp
            assert "object-src 'none'" in csp
            assert "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com" in csp
            assert "font-src 'self' data: https://fonts.gstatic.com" in csp
            assert "'sha256-" not in csp, "Somente o editor deve receber hashes"
            assert response.headers["X-Content-Type-Options"] == "nosniff"
            assert response.headers["Cache-Control"].startswith("no-store")
        with urlopen(base + "blueprint-reference-original.html?service-graph=1", timeout=5) as response:
            assert response.status == 200
            editor_csp = response.headers["Content-Security-Policy"]
            assert "frame-ancestors 'self'" in editor_csp
            assert "script-src 'self'" in editor_csp
            for digest in hashes:
                assert digest in editor_csp, "Hash do script do editor ausente"
            assert "'unsafe-inline'" not in editor_csp.split("style-src")[0]
            assert "'unsafe-eval'" not in editor_csp
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

print("Linux Firefox: OK — iframe de mesma origem e bootstrap do Blueprint autorizado por SHA-256.")

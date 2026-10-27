#!/usr/bin/env python3
"""Exercise actual response headers without starting the production port."""
import ast
import functools
import http.server
import tempfile
import threading
from pathlib import Path
from urllib.request import urlopen

source = Path(__file__).with_name("serve-linux.py").read_text(encoding="utf-8")
tree = ast.parse(source)
handler_class = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == "HardenedHandler")
namespace = {"http": http}
exec(compile(ast.Module(body=[handler_class], type_ignores=[]), "serve-linux.py", "exec"), namespace)
Handler = namespace["HardenedHandler"]

with tempfile.TemporaryDirectory(prefix="bo-frame-test-") as tmp:
    Path(tmp, "index.html").write_text("<html lang='pt-BR'><title>Blue Ocean</title></html>", encoding="utf-8")
    handler = functools.partial(Handler, directory=tmp)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with urlopen(f"http://127.0.0.1:{server.server_address[1]}/", timeout=5) as response:
            assert response.status == 200
            assert response.headers["X-Frame-Options"] == "SAMEORIGIN"
            csp = response.headers["Content-Security-Policy"]
            assert "frame-ancestors 'self'" in csp
            assert "frame-ancestors 'none'" not in csp
            assert "default-src 'self'" in csp
            assert "object-src 'none'" in csp
            assert response.headers["X-Content-Type-Options"] == "nosniff"
            assert response.headers["Cache-Control"].startswith("no-store")
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)

print("Linux iframe Firefox: OK — embedded same-origin editor allowed, external sites blocked.")

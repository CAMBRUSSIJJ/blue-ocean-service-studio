#!/usr/bin/env python3
"""Serve the compiled local application without Node dependencies."""
import errno, functools, http.server, json, os, shutil, subprocess, sys, threading
from pathlib import Path
base = Path(__file__).resolve().parents[1]
root = base / 'dist'
try: version = json.loads((base/'package.json').read_text(encoding='utf-8')).get('version','dev')
except Exception: version = 'dev'
url = 'http://127.0.0.1:4173/'
class HardenedHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('X-Frame-Options', 'SAMEORIGIN')
        self.send_header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'")
        super().end_headers()
if not (root/'index.html').exists():
    print('Build dist/ ausente. Execute `npm ci && npm run build` antes de iniciar.', file=sys.stderr); raise SystemExit(2)
handler = functools.partial(HardenedHandler, directory=str(root))
try: server = http.server.ThreadingHTTPServer(('127.0.0.1', 4173), handler)
except OSError as exc:
    if exc.errno == errno.EADDRINUSE:
        print('A porta 4173 já está em uso. Feche a execução anterior antes de iniciar esta versão.', file=sys.stderr)
    else: print(f'Não foi possível iniciar o servidor local: {exc}', file=sys.stderr)
    raise SystemExit(1)
if '--check' in sys.argv:
    server.server_close(); print(f'Servidor local: porta 4173 disponível, BLUE OCEAN V{version} pronto.'); raise SystemExit(0)
print(f'BLUE OCEAN Service Studio V{version} — {url}', flush=True)
print('Mantenha este terminal aberto. Pressione Ctrl+C para encerrar.', flush=True)
def open_browser():
    if (os.environ.get('DISPLAY') or os.environ.get('WAYLAND_DISPLAY')) and shutil.which('xdg-open'):
        subprocess.Popen(['xdg-open', url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
threading.Timer(0.3, open_browser).start()
try: server.serve_forever()
except KeyboardInterrupt: print('\nServidor encerrado.')
finally: server.server_close()

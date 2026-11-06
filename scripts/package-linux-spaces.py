#!/usr/bin/env python3
"""Package complete canonical source plus a verified build, excluding generated/cache recursion."""
import hashlib
import json
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'downloads/Blue-Ocean-Service-Studio-3D-Linux.zip'
PREFIX = 'Blue-Ocean-Service-Studio-3D/'
if not (ROOT / 'dist/build-manifest.json').is_file():
    raise SystemExit('Execute npm run release:verify antes de criar o pacote Linux.')
manifest = json.loads((ROOT / 'dist/build-manifest.json').read_text())
source_hash = subprocess.check_output(['node', '--input-type=module', '-e', "import {sourceFingerprint} from './scripts/source-fingerprint.mjs';process.stdout.write(sourceFingerprint().hash)"], cwd=ROOT).decode()
if manifest.get('sourceSha256') != source_hash:
    raise SystemExit('A build está desatualizada em relação ao código. Execute npm run release:verify.')
listed = subprocess.check_output(['git', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], cwd=ROOT).decode().split('\0')
files = {}
for name in listed:
    if not name or name.startswith(('downloads/', 'artifacts/', 'node_modules/', 'dist/', 'public/blocksuite/', 'public/blue-ocean3d/')):
        continue
    path = ROOT / name
    if not path.is_file() or path.is_symlink() or name == 'public/blueprint-reference-original.html':
        continue
    if path.name == '.env' or (path.name.startswith('.env.') and path.name != '.env.example') or path.suffix in {'.pem', '.key', '.p12', '.pfx'}:
        raise SystemExit('Arquivo privado fora do escopo do pacote: ' + name)
    files[name] = path.read_bytes()
generated_version = ROOT / 'src/generated/app-version.ts'
if generated_version.is_file(): files['src/generated/app-version.ts'] = generated_version.read_bytes()
for path in (ROOT / 'dist').rglob('*'):
    if path.is_file() and not path.is_symlink():
        files[path.relative_to(ROOT).as_posix()] = path.read_bytes()
required = ['ABRIR-LINUX.sh', 'src/views/ServiceSpaces3DView.tsx', 'src/services/service-spaces.ts', 'dist/index.html', 'dist/blue-ocean3d/app/studio-entry.mjs', 'dist/blue-ocean3d/vendor/three/three.module.min.js', 'scripts/serve-linux.py', 'package-lock.json']
for name in required:
    if name not in files: raise SystemExit('Arquivo necessário ausente: ' + name)
OUTPUT.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(OUTPUT, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, contents in sorted(files.items()):
        entry = zipfile.ZipInfo(PREFIX + name, date_time=(2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = (0o100755 if name.endswith('.sh') else 0o100644) << 16
        archive.writestr(entry, contents)
with zipfile.ZipFile(OUTPUT) as archive:
    assert archive.testzip() is None, 'CRC inválido no pacote'
    assert len(archive.namelist()) == len(files)
    for name, contents in files.items(): assert archive.read(PREFIX + name) == contents, name
digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
OUTPUT.with_suffix('.zip.sha256').write_text(f'{digest}  {OUTPUT.name}\n')
print(f'{OUTPUT.name}: {len(files)} arquivos; {OUTPUT.stat().st_size} bytes; SHA-256 {digest}')

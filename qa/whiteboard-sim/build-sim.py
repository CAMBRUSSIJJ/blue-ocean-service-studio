#!/usr/bin/env python3
"""BLUE OCEAN Whiteboard Sim Kit 2.2.

Gera uma cópia instrumentada do source em .generated/ e produz bundle.js.
NÃO escreve dentro do projeto original.

Uso:
  python3 build-sim.py /caminho/Blue-Ocean-Service-Studio-V1.19.2-Linux-Source-Launcher
"""
from __future__ import annotations
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
from datetime import datetime, timezone

if len(sys.argv) != 2:
    raise SystemExit('Uso: python3 build-sim.py /caminho/para/Blue-Ocean-Service-Studio-V1.19.2-Linux-Source-Launcher')

here = pathlib.Path(__file__).resolve().parent
root = pathlib.Path(sys.argv[1]).expanduser().resolve()
source_root = root / 'src'
whiteboard_src = source_root / 'runtime' / 'whiteboard-core.js'
if not whiteboard_src.exists():
    raise SystemExit(f'whiteboard-core.js não encontrado em: {whiteboard_src}')

runtime_registry = source_root / 'runtime' / 'runtime-registry.js'
graph_ops = source_root / 'domain' / 'graph-operations.ts'
for p in (runtime_registry, graph_ops):
    if not p.exists():
        raise SystemExit(f'arquivo necessário não encontrado: {p}')

generated = here / '.generated'
if generated.exists():
    shutil.rmtree(generated)
(generated / 'source').parent.mkdir(parents=True, exist_ok=True)
shutil.copytree(source_root, generated / 'source')

copy_wb = generated / 'source' / 'runtime' / 'whiteboard-core.js'
s = copy_wb.read_text(encoding='utf-8')
marker = "  document.title=`BLUE OCEAN Service Studio"
i = s.rfind(marker)
if i <= 0:
    raise SystemExit('marcador final não encontrado em whiteboard-core.js; atualize o probe do Sim Kit')

probe = r'''
  globalThis.__wb={
    get graph(){return graph}, get meta(){return meta}, get boardId(){return boardId}, get overlay(){return overlay},
    get selected(){return selected}, set selected(v){selected=v}, get zoom(){return zoom}, set zoom(v){zoom=v}, get pan(){return pan}, set pan(v){pan=v},
    get editHistory(){return editHistory}, get editIndex(){return editIndex}, get saveState(){return saveState}, get persistence(){return persistence}, perf,
    get tool(){return tool}, set tool(v){tool=v}, get showInspector(){return showInspector}, get drag(){return drag},
    board, save, renderAll, undoEdit, redoEdit, addFree, addSmart, addEdge, addContainer, createGraphEntityWithTitle, group, ungroup, align, distribute,
    duplicateItems, copySelection, pasteInternalAt, applyLayout, fit, visibleItems, renderableItems, coreAudit, buildExportSvg, exportBoardJson, boardFragment,
    backupPayload, importFragment, removeSelection, lockSelection, close, open, createBoard, deleteBoard, clone, historyPayload, pref, openSmartLayout, applySmartLayout,
    updateFrameMembership, normalizeEdges, content, setVisibility, arrange, toggleContainerCollapse, edgeGeometry, itemCenter, mobileReadOnly, blueprintLanes, VIEW_DEFS,
    serviceBuilderAssistantState, serviceBuilderAssistantProgress, assistantCurrentStep, assistantAnswer, serviceBuilderReview, stageFlowReport
  };
'''
copy_wb.write_text(s[:i] + probe + s[i:], encoding='utf-8')

entry = generated / 'entry.js'
entry.write_text("""
import { createBlankWorkspaceGraph, createServiceGraph, isWorkspaceEmpty } from './source/domain/graph-operations.ts';
import './source/runtime/runtime-registry.js';
import './source/runtime/whiteboard-core.js';
globalThis.__simDomain = { createBlankWorkspaceGraph, createServiceGraph, isWorkspaceEmpty };
""".strip() + '\n', encoding='utf-8')

esbuild = here / 'node_modules' / '.bin' / 'esbuild'
if not esbuild.exists():
    raise SystemExit('esbuild não está instalado no kit. Execute `npm install` dentro de whiteboard-sim antes de gerar o bundle.')
cmd = [
    str(esbuild), str(entry), '--bundle', '--format=iife', '--platform=browser',
    f'--outfile={here / "bundle.js"}', '--log-level=warning'
]
try:
    subprocess.check_call(cmd, cwd=here)
except (FileNotFoundError, subprocess.CalledProcessError) as exc:
    raise SystemExit('falha ao executar esbuild; verifique `npm install` e a versão do Node.') from exc

version_file = root / 'VERSION'
version = version_file.read_text(encoding='utf-8').strip() if version_file.exists() else 'unknown'
sha = hashlib.sha256(whiteboard_src.read_bytes()).hexdigest()
manifest = {
    'simKitVersion': '2.0.0',
    'projectRoot': str(root),
    'projectVersion': version,
    'whiteboardCoreSha256': sha,
    'builtAtUtc': datetime.now(timezone.utc).isoformat(),
    'sourceMutated': False,
}
(here / 'sim-manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'bundle.js pronto — projeto {version}; source original não alterado')

import fs from 'node:fs';
const view=fs.readFileSync('src/views/PainsView.tsx','utf8');
const canvas=fs.readFileSync('src/components/PainCanvas.tsx','utf8');
const style=fs.readFileSync('src/runtime/pain-canvas.css','utf8');
const root=fs.readFileSync('src/style.css','utf8');
const checks=[
 ['Título inline',view.includes('aria-label="Enunciado da dor"')],
 ['Autosave sem barra inferior',view.includes('Dores: autosave')&&!view.includes('bo-h71-detail-actions')],
 ['Propriedades em uma linha',view.includes('bo-pain-properties')],
 ['Cards essenciais', ['description','context','impact'].every(s=>view.includes(`essential:true,value:draft.${s}`))],
 ['Blocos progressivos',canvas.includes('bo-pain-canvas-ghosts')&&canvas.includes('setExpanded')],
 ['Controles contextuais',canvas.includes('bo-pain-canvas-controls')&&style.includes('.bo-pain-canvas-card:hover')],
 ['Reorganização',canvas.includes('onDrop={e=>drop(e,block.id)}')&&canvas.includes('localStorage.setItem')],
 ['Conexões reais',canvas.includes('onToggleRelation(r.id)')&&view.includes('painRelationOptions(graph)')],
 ['Exclusão mantém Service Graph',view.includes("removeContextEntity(current, 'pain', id)")],
 ['CSS importado',root.includes("@import './runtime/pain-canvas.css';")],
];
for(const [name,ok] of checks) console.log((ok?'OK  ':'FAIL ')+name);
if(checks.some(x=>!x[1]))process.exit(1);

import fs from 'node:fs';
const read=(p)=>fs.readFileSync(p,'utf8');
const objects=read('src/design-system/blue-ocean-objects.tsx');
const dashboard=read('src/views/WorkspaceDashboardView.tsx');
const blueprint=read('src/views/BlueprintView.tsx');
const css=read('src/runtime/blue-ocean-object-language-h716.css');
const style=read('src/style.css');
const app=read('src/App.tsx');
const main=read('src/main.tsx');
const preflight=read('preflight-linux.sh');
const pkg=JSON.parse(read('package.json'));
let ok=0,fail=0; const check=(v,l)=>{if(v){console.log('OK  ',l);ok++}else{console.log('FAIL',l);fail++}};

check(objects.includes('export type BlueOceanObjectKind'),'linguagem define tipo canônico de objeto');
check(objects.includes('BLUE_OCEAN_OBJECT_META'),'metadata semântica centralizada');
check(objects.includes("journey: { label: 'Journey', accent: '#2563eb'"),'Journey possui identidade semântica própria');
check(objects.includes("blueprint: { label: 'Blueprint', accent: '#0f8f83'"),'Blueprint possui identidade semântica própria');
check(objects.includes("whiteboard: { label: 'Whiteboard', accent: '#7657d6'"),'Whiteboard possui identidade semântica própria');
check(objects.includes("problem: { label: 'Problema', accent: '#d94b5b'"),'Problema preserva vermelho semântico');
check(objects.includes("evidence: { label: 'Evidência', accent: '#1598c9'"),'Evidência possui cyan semântico');
check(objects.includes("metric: { label: 'Métrica', accent: '#14946d'"),'Métrica possui verde de resultado');
check((objects.match(/case '/g)||[]).length>=20,'família proprietária contém pelo menos 20 glyphs');
check(objects.includes('BlueOceanArtifactPreview'),'thumbnails proprietárias são componente do design system');
check(objects.includes('relationKindFromLabel'),'relações derivam semântica do rótulo');
check(objects.includes("supports: { label: 'Sustenta'")&&objects.includes("contradicts: { label: 'Contradiz'")&&objects.includes("contextualizes: { label: 'Contextualiza'")&&objects.includes("depends: { label: 'Depende de'"),'quatro relações semânticas oficiais presentes');

check(dashboard.includes('data-object-language="7.16"'),'Dashboard declara Object Language 7.16');
check(dashboard.includes('BlueOceanObjectIcon kind="journey"'),'Nova Jornada usa glyph Blue Ocean');
check(dashboard.includes('BlueOceanObjectIcon kind="persona"'),'Nova Persona usa glyph Blue Ocean');
check(dashboard.includes('BlueOceanObjectIcon kind="metric"'),'Nova Métrica usa glyph Blue Ocean');
check(dashboard.includes('BlueOceanArtifactPreview'),'Recentes usam thumbnails proprietárias');
check(dashboard.includes('bo-h716-favorite-icon'),'Favoritos herdam a linguagem de objetos');

check(blueprint.includes('BLUE_OCEAN_OBJECT_META'),'Whiteboard consome metadata semântica central');
check(blueprint.includes('data-bo-object={objectKind}'),'Smart Object expõe tipo semântico no DOM');
check(blueprint.includes('data-bo-object-family={objectMeta.family}'),'Smart Object expõe família de objeto');
check(blueprint.includes('BlueOceanObjectIcon kind={objectKind}'),'Smart Objects usam glyph proprietário');
check(blueprint.includes('bo-h716-object-icon'),'header dos objetos recebe primitive visual H7.16');
check(blueprint.includes('bo-h716-library-icon'),'biblioteca livre usa Object Language');
check(blueprint.includes('bo-h716-library-object-row'),'biblioteca Service Graph usa Object Language');
check(blueprint.includes('relationKindFromLabel(edge.label)'),'canvas diferencia relações semanticamente');
check(blueprint.includes('bo-h716-relation-presets'),'Inspector oferece presets de relações');
check(blueprint.includes('Relação rápida'),'relações são aplicáveis sem digitar manualmente');

check(css.includes('--bo-object-journey')&&css.includes('--bo-object-problem')&&css.includes('--bo-object-evidence'),'tokens de objeto presentes');
check(css.includes('[data-bo-object="problem"]::after'),'Problema possui assinatura de forma própria');
check(css.includes('[data-bo-object="evidence"]::after'),'Evidência possui assinatura de sinal própria');
check(css.includes('[data-bo-object-shape="halo"]'),'família Persona/Pessoa possui forma halo');
check(css.includes('.bo-h716-artifact-preview.is-journey')&&css.includes('.is-blueprint')&&css.includes('.is-whiteboard'),'thumbnails diferenciam os três artefatos centrais');
check(style.includes("@import './runtime/blue-ocean-object-language-h716.css';"),'CSS H7.16 importado');
check(style.indexOf('ocean-workspace-home-h715.css') < style.indexOf('blue-ocean-object-language-h716.css'),'H7.16 sucede H7.15 na cascata');
check(app.includes('data-object-language="7.16"'),'shell declara Object Language 7.16');
check(main.includes("'bo-h716'"),'body recebe marker H7.16');
check(preflight.includes('blue-ocean-object-language-h716.css')&&preflight.includes('v1205h716-blue-ocean-object-language-smoke.mjs'),'preflight conhece artefatos H7.16');
check(Boolean(pkg.scripts['v1205h716:object-language-smoke']),'script H7.16 registrado');
check(pkg.scripts.qa?.includes('v1205h716:object-language-smoke'),'QA acumulado inclui H7.16');

console.log(`\nH7.16 Blue Ocean Object Language: ${ok} OK / ${fail} FAIL`);
process.exit(fail?1:0);

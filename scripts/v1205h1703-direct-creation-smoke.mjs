import fs from 'node:fs';
const read = (p) => fs.readFileSync(p,'utf8');
const ws=read('src/views/BlueprintWorkspaceView.tsx'),app=read('src/App.tsx'),shell=read('src/views/ProjectShellView.tsx');
const persona=read('src/views/PersonasView.tsx'),journey=read('src/views/JourneyView.tsx');
const menu=app.split('data-sidebar-section="management"')[1]?.split('data-sidebar-section=')[0]??'';
const group=ws.split("{ id: 'understand', label:")[1]?.split("{ id: 'design', label:")[0]??'';
const phase=ws.split('const capabilityRows:')[1]?.split('    design: [')[0]??'';
const checks=[
 ['criação direta',ws.includes('data-direct-start="H17.0.3"') || ws.includes('data-journey-reference-flow="H17.0.4"')],
 ['ação Nova Jornada',ws.includes('Nova Jornada') && ws.includes('setJourneyCreateOpen(true)')],
 ['ação Nova Persona',ws.includes('Nova Persona') && ws.includes('openAudience(true)')],
 ['ação Métricas',ws.includes('<strong>Métricas</strong>') || ws.includes('+ Nova Métrica')],
 ['Público-alvo guia Entender',phase.includes("target: 'audience'")],
 ['Público-alvo tem entidades explícitas',phase.includes('Personas, necessidades, Jobs, dores e problemas')],
 ['sem Pesquisa como capacidade na fase',!phase.includes("target: 'research'")],
 ['sem Pesquisa como aba principal de Entender',!group.includes("{ id: 'research', label: 'Pesquisa'")],
 ['sem Pesquisa no menu de Gestão',!menu.includes('title="Pesquisa"')],
 ['Público-alvo na sidebar',app.includes('<span>Público-alvo</span>')],
 ['Projeto abre Público-alvo',shell.includes('<strong>Público-alvo</strong>')],
 ['Jornada em branco ou guiada',ws.includes('journeyStartTemplate') && ws.includes('Em branco') && (ws.includes('Com orientação') || ws.includes('starterTemplates.map'))],
 ['Jornada nova abre editor',ws.includes('setJourneyEditorOpen(true)')],
 ['Persona nova abre construtor',persona.includes("bo-workspace-create-page") && persona.includes('setCreateOpen(true)')],
 ['Jornada permite registrar descobertas',journey.includes('Registrar descoberta') && journey.includes('captureContextDuringJourney')],
 ['Pesquisa histórica preservada como código',fs.existsSync('src/services/research-studio.ts') && fs.existsSync('src/views/ResearchStudioView.tsx')],
 ['modelos antigos de pesquisa retirados do menu',!read('src/views/ProjectHomeView.tsx').includes("{ id: 'research', title: 'Pesquisa de serviço'")],
 ['CSS import na zona de imports',read('src/style.css').includes("@import './runtime/direct-creation-h1703.css';")],
 ['Launcher versão H17.0.3',(read('start-linux.sh').includes('RELEASE="H17.0.3"') || read('start-linux.sh').includes('RELEASE="H17.0.3.1"') || (read('start-linux.sh').includes('RELEASE="H17.0.5"') || read('start-linux.sh').includes('RELEASE="H17.0.4"')))],
 ['recomendação Pesquisa vai para Público-alvo',ws.includes("guidance.target === 'research' ? 'audience'")],
 ['maturidade preserva dados sem exclusão',!ws.includes('delete graph.research')],
];
let pass=0;for(const [name,ok] of checks){if(ok)pass++;else console.error('FAIL',name);}console.log(`H17.0.3 Direct Creation & Audience-first UX: ${pass}/${checks.length} PASS`);if(pass!==checks.length)process.exit(1);

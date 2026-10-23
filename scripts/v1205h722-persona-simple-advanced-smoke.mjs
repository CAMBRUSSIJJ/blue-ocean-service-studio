import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createDiscoveryEntity } from '../src/services/discovery-workspace.ts';
import { ADVANCED_PERSONA_SECTIONS, SIMPLE_PERSONA_SECTIONS, buildPersonaStudioReport, personaProfileFromEntity, updatePersonaProfile, switchPersonaDepth, visiblePersonaSections } from '../src/services/persona-studio.ts';
import { createServiceProjectState } from '../src/services/service-project.ts';

let passed = 0;
const ok = (condition, message) => { assert.ok(condition, message); passed += 1; console.log(`OK   ${message}`); };
const now = '2026-10-08T22:30:00.000Z';
const graph = {
  schemaVersion: 3, persistenceRevision: 1, entities: {}, views: { whiteboards: {} },
  service: { id: 'svc-h722', name: 'Lavanderia', description: '', journeyIds: [], createdAt: now, updatedAt: now, project: createServiceProjectState('svc-h722', now) },
  journeys: {}, stages: {}, touchpoints: {}, problems: {}, opportunities: {}, tasks: {}, blueprintDraft: { evidencias: '', frontstage: '', backstage: '', suporte: '' }, research: { sources: {} },
};
const persona = createDiscoveryEntity({ graph, kind: 'persona', title: 'Pessoa teste', now, id: 'persona-h722' });
graph.entities.persona = { [persona.id]: { ...persona, personaMode: 'simple', personaLayout: 'balanced', personaSections: [...SIMPLE_PERSONA_SECTIONS] } };
let draft = personaProfileFromEntity(graph.entities.persona[persona.id]);
ok(draft.mode === 'simple', 'modo simples é carregado do Service Graph');
ok(draft.layout === 'balanced', 'layout da Persona é persistente');
ok(draft.sections.includes('situation') && draft.sections.includes('evidence'), 'template simples possui blocos essenciais');
let report = buildPersonaStudioReport(graph, persona.id);
ok(Boolean(report) && report.professionalChecks.length === 0, 'modo simples não exige critérios avançados');

draft = { ...draft, mode: 'professional', layout: 'story-first', sections: [...ADVANCED_PERSONA_SECTIONS], context: 'Contexto', primaryGoal: 'Objetivo', situation: 'Momento', quote: 'Frase', channels: ['WhatsApp'], behaviors: ['Compara'], expectations: ['Rapidez'], constraints: ['Tempo'], triggers: ['Acúmulo'], alternatives: ['Lavar em casa'] };
const updated = updatePersonaProfile({ graph, personaId: persona.id, draft, connectedIds: [], now: '2026-10-08T22:31:00.000Z' });
ok(updated.entities.persona[persona.id].personaMode === 'professional', 'modo avançado é persistido');
ok(updated.entities.persona[persona.id].personaLayout === 'story-first', 'layout narrativo é persistido');
ok(Array.isArray(updated.entities.persona[persona.id].personaSections) && updated.entities.persona[persona.id].personaSections.includes('behaviors'), 'blocos selecionados são persistidos');
report = buildPersonaStudioReport(updated, persona.id);
ok(Boolean(report) && report.professionalChecks.length === 5, 'modo avançado calcula apenas blocos avançados selecionados');

// Upgrading exposes advanced sections, but later switches never erase custom choices.
let toggled = switchPersonaDepth(personaProfileFromEntity(graph.entities.persona[persona.id]), 'professional');
ok(toggled.mode === 'professional' && toggled.sections.includes('behaviors') && toggled.sections.includes('constraints'), 'primeira ativação avançada habilita blocos de pesquisa');
toggled = {...toggled, sections:toggled.sections.filter(section => section !== 'expectations')};
toggled = switchPersonaDepth(toggled,'simple');
ok(!visiblePersonaSections(toggled).includes('behaviors') && toggled.sections.includes('behaviors'), 'modo simples oculta pesquisa avançada sem apagar conteúdo');
toggled = switchPersonaDepth(toggled,'professional');
ok(!toggled.sections.includes('expectations') && toggled.sections.includes('behaviors'), 'modo avançado restaurado respeita blocos personalizados');
const customSaved = updatePersonaProfile({graph,personaId:persona.id,draft:toggled,connectedIds:[],now:'2026-10-09T12:00:00.000Z'});
const reopened = switchPersonaDepth(personaProfileFromEntity(customSaved.entities.persona[persona.id]),'simple');
ok(!switchPersonaDepth(reopened,'professional').sections.includes('expectations'), 'configuração avançada é preservada após salvar e reabrir');
const allHidden = {...toggled,sections:[...SIMPLE_PERSONA_SECTIONS]};
const hiddenSaved = updatePersonaProfile({graph,personaId:persona.id,draft:allHidden,connectedIds:[]});
const hiddenReopened = switchPersonaDepth(personaProfileFromEntity(hiddenSaved.entities.persona[persona.id]),'simple');
ok(!switchPersonaDepth(hiddenReopened,'professional').sections.includes('behaviors'), 'até uma configuração avançada com todos blocos ocultos é preservada');
const view = fs.readFileSync('src/views/PersonasView.tsx', 'utf8');
const css = fs.readFileSync('src/runtime/personas-h713.css', 'utf8');
const style = fs.readFileSync('src/style.css', 'utf8');
for (const marker of ['Criar Persona e continuar', 'Profundidade da Persona', 'Personalizar interface', 'Blocos do perfil', 'profile-left', 'story-first', 'createSections']) ok(view.includes(marker), `UI contém ${marker}`);
ok(view.includes('data-personas-h71="create"') && !view.includes('bo-h713-builder-backdrop'), 'criação usa página própria e não modal');
ok(view.includes("layout:id") && view.includes("draft.sections.filter"), 'layout e blocos podem ser alterados no perfil');
for (const marker of ['.bo-h713-persona-builder', '.bo-h713-block-grid', '.bo-h713-layout-options', '.bo-h713-layout-balanced', '.bo-h713-layout-story-first']) ok(css.includes(marker), `CSS contém ${marker}`);
ok(style.includes("@import './runtime/personas-h713.css';"), 'CSS H7.2.2 carregado no pipeline');
ok(!css.toLowerCase().includes('#1d9e75'), 'configurador não reintroduz verde estrutural legado');
console.log(`V1.20.5-H7.2.2 Persona Simple/Advanced Configurator: ${passed} OK / 0 FAIL`);

import fs from 'node:fs';
import assert from 'node:assert/strict';
import { buildDiscoveryWorkspaceReport, createDiscoveryEntity } from '../src/services/discovery-workspace.ts';
import { buildPersonaStudioReport, personaProfileFromEntity, personaRelationOptions, removePersonaFromGraph, updatePersonaProfile } from '../src/services/persona-studio.ts';
import { createServiceProjectState } from '../src/services/service-project.ts';

let passed = 0;
const ok = (condition, message) => { assert.ok(condition, message); passed += 1; };
const now = '2026-10-07T18:00:00.000Z';
const graph = {
  schemaVersion: 3,
  persistenceRevision: 1,
  entities: {},
  views: { whiteboards: {} },
  service: { id: 'svc-persona', name: 'Lavanderia', description: '', journeyIds: [], createdAt: now, updatedAt: now, project: createServiceProjectState('svc-persona', now) },
  journeys: {}, stages: {}, touchpoints: {}, problems: {}, opportunities: {}, tasks: {},
  blueprintDraft: { evidencias: '', frontstage: '', backstage: '', suporte: '' },
  research: { sources: {} },
};

const specs = [
  ['persona', 'Profissional sem tempo', [], undefined],
  ['need', 'Economizar tempo', [], undefined],
  ['job', 'Ter roupas prontas para a semana', [], undefined],
  ['pain', 'Deslocamento até a lavanderia', [], undefined],
  ['problemHypothesis', 'O deslocamento é a maior fricção', [], undefined],
  ['evidence', '7 de 10 entrevistados citam falta de tempo', [], 'high'],
];
for (const [kind, title, relatedIds, confidence] of specs) {
  const entity = createDiscoveryEntity({ graph, kind, title, relatedIds, confidence, now, id: `${kind}-1` });
  graph.entities[kind] = { [entity.id]: entity };
}

let report = buildPersonaStudioReport(graph, 'persona-1');
ok(Boolean(report), 'persona report exists');
ok(report.foundationScore === 14, 'only identity starts complete in simple template');
ok(report.professionalScore === 14, 'simple persona score follows selected simple blocks');
ok(report.connections.length === 0, 'starts without connections');
ok(!report.readyForDefinition, 'persona is not ready without context');
ok(personaProfileFromEntity(graph.entities.persona['persona-1']).mode === 'simple', 'legacy persona defaults to simple');
ok(personaRelationOptions(graph).length === 5, 'five linkable discovery objects');

const draft = {
  title: 'Profissional urbano sem tempo',
  description: 'Pessoa que terceiriza tarefas quando a semana aperta.',
  mode: 'professional',
  layout: 'profile-left',
  sections: ['identity','bio','goal','needs','situation','quote','channels','behaviors','expectations','constraints','triggers','alternatives','evidence','relations'],
  context: 'Mora em apartamento e trabalha em período integral.',
  primaryGoal: 'Ter roupas prontas sem perder tempo útil.',
  situation: 'A necessidade aparece no fim de semanas muito corridas.',
  quote: 'Quero resolver isso sem transformar em outra tarefa.',
  behaviors: ['Resolve pelo celular', 'Compara avaliações'],
  expectations: ['Previsibilidade', 'Rapidez'],
  constraints: ['Pouco tempo', 'Espaço limitado'],
  triggers: ['Acúmulo de roupas', 'Semana intensa'],
  alternatives: ['Lavar em casa', 'Lavanderia tradicional'],
  channels: ['WhatsApp', 'Aplicativo'],
};

const linkedIds = ['need-1', 'job-1', 'pain-1', 'problemHypothesis-1', 'evidence-1'];
const updated = updatePersonaProfile({ graph, personaId: 'persona-1', draft, connectedIds: linkedIds, now: '2026-10-07T18:05:00.000Z' });
const persona = updated.entities.persona['persona-1'];
ok(persona.title === draft.title, 'persona title persisted');
ok(persona.description === draft.description, 'persona description persisted');
ok(persona.personaMode === 'professional', 'professional mode persisted');
ok(persona.context === draft.context, 'context persisted');
ok(persona.primaryGoal === draft.primaryGoal, 'goal persisted');
ok(persona.situation === draft.situation, 'situation persisted');
ok(persona.quote === draft.quote, 'quote persisted');
ok(persona.profileVersion === 1, 'profile version persisted');
ok(Array.isArray(persona.behaviors) && persona.behaviors.length === 2, 'behaviors persisted');
ok(Array.isArray(persona.expectations) && persona.expectations.length === 2, 'expectations persisted');
ok(Array.isArray(persona.constraints) && persona.constraints.length === 2, 'constraints persisted');
ok(Array.isArray(persona.triggers) && persona.triggers.length === 2, 'triggers persisted');
ok(Array.isArray(persona.alternatives) && persona.alternatives.length === 2, 'alternatives persisted');
ok(Array.isArray(persona.channels) && persona.channels.length === 2, 'channels persisted');
ok(persona.relatedIds.length === 5, 'persona has five direct discovery links');
for (const [kind] of specs.slice(1)) {
  const entity = updated.entities[kind][`${kind}-1`];
  ok(entity.relatedIds.includes('persona-1'), `${kind} reverse relatedIds`);
  ok(entity.personaIds.includes('persona-1'), `${kind} personaIds reverse index`);
}

report = buildPersonaStudioReport(updated, 'persona-1');
ok(report.foundationScore === 100, 'foundation reaches 100');
ok(report.professionalScore === 100, 'professional depth reaches 100');
ok(report.readyForDefinition, 'persona ready for definition');
ok(report.connections.length === 5, 'five connections resolved');
ok(report.connectionCounts.need === 1, 'need count');
ok(report.connectionCounts.job === 1, 'job count');
ok(report.connectionCounts.pain === 1, 'pain count');
ok(report.connectionCounts.problemHypothesis === 1, 'hypothesis count');
ok(report.connectionCounts.evidence === 1, 'evidence count');
ok(report.evidenceConfidence.high === 1, 'high-confidence evidence count');
ok(report.connections.every((item) => item.direction === 'both'), 'relations become symmetric');
const discovery = buildDiscoveryWorkspaceReport(updated);
ok(discovery.relationshipCount === 5, 'symmetric links counted once in Discovery');
ok(discovery.score === 100, 'discovery coverage remains 100');

const partial = updatePersonaProfile({ graph: updated, personaId: 'persona-1', draft: { ...draft, mode: 'simple' }, connectedIds: ['need-1', 'evidence-1'], now: '2026-10-07T18:10:00.000Z' });
ok(partial.entities.persona['persona-1'].personaMode === 'simple', 'mode can return to simple');
ok(partial.entities.persona['persona-1'].relatedIds.length === 2, 'deselected relations removed from persona');
ok(!partial.entities.job['job-1'].relatedIds.includes('persona-1'), 'deselected reverse relation removed');
ok(!partial.entities.job['job-1'].personaIds.includes('persona-1'), 'deselected persona index removed');
ok(partial.entities.evidence['evidence-1'].relatedIds.includes('persona-1'), 'selected evidence relation remains');

const removed = removePersonaFromGraph(partial, 'persona-1', '2026-10-07T18:15:00.000Z');
ok(!removed.entities.persona['persona-1'], 'persona deleted');
for (const [kind] of specs.slice(1)) {
  const entity = removed.entities[kind][`${kind}-1`];
  ok(!entity.relatedIds.includes('persona-1'), `${kind} orphan relation removed`);
  ok(!entity.personaIds?.includes('persona-1'), `${kind} orphan persona index removed`);
}
ok(removed.entities.need['need-1'].title === 'Economizar tempo', 'related objects preserved after persona deletion');

const home = fs.readFileSync('src/views/WorkspaceHome.tsx', 'utf8');
const css = fs.readFileSync('src/runtime/service-project-home.css', 'utf8');
const service = fs.readFileSync('src/services/persona-studio.ts', 'utf8');
for (const marker of ['data-persona-studio="1"', 'Persona Studio', 'Entenda a pessoa sem inventar um personagem', 'Simples', 'Profissional', 'Contexto conectado à Persona', 'Salvar Persona', 'Remover Persona']) ok(home.includes(marker), `home marker ${marker}`);
ok(home.includes('Remover Persona?'), 'custom delete dialog exists');
ok(!home.includes('window.confirm'), 'Persona Studio avoids native confirm');
for (const marker of ['Comportamentos', 'Expectativas', 'Restrições', 'Gatilhos', 'Alternativas atuais', 'Canais / ambientes']) ok(home.includes(marker), `professional marker ${marker}`);
for (const marker of ['.bo1199-persona-studio', '.bo1199-persona-layout', '.bo1199-persona-relations', '.bo1199-persona-actions']) ok(css.includes(marker), `css marker ${marker}`);
for (const marker of ['buildPersonaStudioReport', 'updatePersonaProfile', 'removePersonaFromGraph', 'readyForDefinition']) ok(service.includes(marker), `service marker ${marker}`);
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const [pkgMajor,pkgMinor,pkgPatch]=pkg.version.split('.').map(Number);
ok(pkgMajor>1||(pkgMajor===1&&(pkgMinor>19||(pkgMinor===19&&pkgPatch>=9))), 'package version 1.19.9 ou superior');
ok(pkg.scripts['persona:smoke']?.includes('v1199-persona-studio-smoke.mjs'), 'persona smoke registered');
ok(pkg.scripts['persona:browser']?.includes('v1199-browser-persona-studio.py'), 'persona browser truth registered');

console.log(`V1.19.9 Persona Studio: ${passed} OK / 0 FAIL`);

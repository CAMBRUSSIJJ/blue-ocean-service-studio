import { describe, it, expect } from 'vitest';
import { createServiceGraph } from '../../domain/graph-operations.ts';
import {
  personaVisualTemplate,
  normalizePersonaVisualCards,
  personaVisualScale,
  PERSONA_VISUAL_CARD_IDS,
  SIMPLE_PERSONA_SECTIONS,
  ADVANCED_PERSONA_SECTIONS,
  switchPersonaDepth,
  visiblePersonaSections,
  normalizePersonaEvidenceClaims,
  personaEvidenceStatements,
  personaProfileFromEntity,
  buildPersonaStudioReport,
  updatePersonaProfile,
  removePersonaFromGraph,
  personaRelationOptions,
} from '../persona-studio.ts';
import type { ServiceGraph, GraphEntity } from '../../domain/model';

const NOW = '2025-01-01T00:00:00.000Z';

function base(): ServiceGraph { return createServiceGraph('S'); }

function addEntity(graph: ServiceGraph, kind: string, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return {
    ...graph,
    entities: {
      ...graph.entities,
      [kind]: {
        ...(graph.entities?.[kind] ?? {}),
        [id]: { id, type: kind, serviceId: graph.service.id, title: `T-${id}`, description: `D-${id}`, status: 'hypothesis', relatedIds: [], createdAt: NOW, updatedAt: NOW, ...extra },
      },
    },
  } as ServiceGraph;
}

function addPersona(graph: ServiceGraph, id: string, extra: Record<string, unknown> = {}): ServiceGraph {
  return addEntity(graph, 'persona', id, extra);
}

const SIMPLE_DRAFT = {
  title: 'Persona Name', description: 'Desc',
  mode: 'simple' as const, layout: 'profile-left' as const,
  sections: [...SIMPLE_PERSONA_SECTIONS],
  context: 'Context', primaryGoal: 'Goal', situation: 'Situation',
  quote: 'Quote', behaviors: [], expectations: [], constraints: [],
  triggers: [], alternatives: [], channels: ['web'],
};

// ─── personaVisualTemplate ────────────────────────────────────────────────────

describe('personaVisualTemplate', () => {
  it('essential returns 6 cards starting with identity', () => {
    const cards = personaVisualTemplate('essential');
    expect(cards[0].id).toBe('identity');
    expect(cards).toHaveLength(6);
  });

  it('research returns 10 cards starting with identity', () => {
    const cards = personaVisualTemplate('research');
    expect(cards[0].id).toBe('identity');
    expect(cards).toHaveLength(10);
  });

  it('identity and quote are full width', () => {
    const cards = personaVisualTemplate('essential');
    const identity = cards.find((c) => c.id === 'identity');
    const quote = cards.find((c) => c.id === 'quote');
    expect(identity?.width).toBe('full');
    expect(quote?.width).toBe('full');
  });
});

// ─── normalizePersonaVisualCards ──────────────────────────────────────────────

describe('normalizePersonaVisualCards', () => {
  it('falls back to template when not an array', () => {
    const cards = normalizePersonaVisualCards(null, 'simple');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0].id).toBe('identity');
  });

  it('filters invalid card ids', () => {
    const input = [{ id: 'identity', width: 'full' }, { id: 'bogus', width: 'half' }];
    const cards = normalizePersonaVisualCards(input, 'simple');
    expect(cards.map((c) => c.id)).not.toContain('bogus');
  });

  it('deduplicates cards', () => {
    const input = [{ id: 'identity', width: 'full' }, { id: 'identity', width: 'half' }];
    const cards = normalizePersonaVisualCards(input, 'simple');
    expect(cards.filter((c) => c.id === 'identity')).toHaveLength(1);
  });

  it('always includes identity even if omitted', () => {
    const input = [{ id: 'goal', width: 'half' }];
    const cards = normalizePersonaVisualCards(input, 'simple');
    expect(cards.map((c) => c.id)).toContain('identity');
  });

  it('defaults unknown width to half', () => {
    const input = [{ id: 'goal', width: 'wide' }];
    const [card] = normalizePersonaVisualCards([{ id: 'identity', width: 'full' }, ...input], 'simple');
    expect(['half', 'full']).toContain(card.width);
  });
});

// ─── personaVisualScale ───────────────────────────────────────────────────────

describe('personaVisualScale', () => {
  it('returns defaults for null', () => {
    const s = personaVisualScale(null);
    expect(s.left).toBe('Autonomia');
    expect(s.right).toBe('Orientação');
    expect(s.value).toBe(50);
  });

  it('clamps value to 0-100', () => {
    expect(personaVisualScale({ value: -10 }).value).toBe(0);
    expect(personaVisualScale({ value: 150 }).value).toBe(100);
  });

  it('rounds fractional value', () => {
    expect(personaVisualScale({ value: 42.7 }).value).toBe(43);
  });

  it('uses provided left/right labels', () => {
    const s = personaVisualScale({ left: 'L', right: 'R', value: 30 });
    expect(s.left).toBe('L');
    expect(s.right).toBe('R');
  });
});

// ─── switchPersonaDepth ───────────────────────────────────────────────────────

describe('switchPersonaDepth', () => {
  it('returns same draft when mode unchanged', () => {
    const draft = { ...SIMPLE_DRAFT };
    expect(switchPersonaDepth(draft, 'simple')).toBe(draft);
  });

  it('upgrades to professional and sets advancedConfigured', () => {
    const draft = switchPersonaDepth(SIMPLE_DRAFT, 'professional');
    expect(draft.mode).toBe('professional');
    expect(draft.advancedConfigured).toBe(true);
  });

  it('adding advanced sections on first upgrade', () => {
    const draft = switchPersonaDepth({ ...SIMPLE_DRAFT, advancedConfigured: false }, 'professional');
    expect(draft.sections.length).toBeGreaterThan(SIMPLE_PERSONA_SECTIONS.length);
  });

  it('downgrade to simple keeps sections as-is', () => {
    const professional = switchPersonaDepth(SIMPLE_DRAFT, 'professional');
    const back = switchPersonaDepth(professional, 'simple');
    expect(back.mode).toBe('simple');
  });
});

// ─── visiblePersonaSections ───────────────────────────────────────────────────

describe('visiblePersonaSections', () => {
  it('filters to simple sections in simple mode', () => {
    const draft = { ...SIMPLE_DRAFT, mode: 'simple' as const, sections: [...ADVANCED_PERSONA_SECTIONS] };
    const visible = visiblePersonaSections(draft);
    for (const id of visible) expect(SIMPLE_PERSONA_SECTIONS).toContain(id);
  });

  it('shows all sections in professional mode', () => {
    const draft = { ...SIMPLE_DRAFT, mode: 'professional' as const, sections: [...ADVANCED_PERSONA_SECTIONS] };
    expect(visiblePersonaSections(draft)).toEqual(ADVANCED_PERSONA_SECTIONS);
  });
});

// ─── normalizePersonaEvidenceClaims ───────────────────────────────────────────

describe('normalizePersonaEvidenceClaims', () => {
  it('returns empty for non-array', () => {
    expect(normalizePersonaEvidenceClaims(null)).toEqual([]);
  });

  it('filters invalid fields', () => {
    const result = normalizePersonaEvidenceClaims([{ field: 'bogus', statement: 'S', evidenceIds: ['e1'] }]);
    expect(result).toHaveLength(0);
  });

  it('requires non-empty evidenceIds', () => {
    const result = normalizePersonaEvidenceClaims([{ field: 'context', statement: 'S', evidenceIds: [] }]);
    expect(result).toHaveLength(0);
  });

  it('deduplicates same field+statement', () => {
    const result = normalizePersonaEvidenceClaims([
      { field: 'context', statement: 'S', evidenceIds: ['e1'] },
      { field: 'context', statement: 'S', evidenceIds: ['e2'] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].evidenceIds).toContain('e1');
    expect(result[0].evidenceIds).toContain('e2');
  });
});

// ─── personaEvidenceStatements ────────────────────────────────────────────────

describe('personaEvidenceStatements', () => {
  it('returns empty when no evidence field values are set', () => {
    const emptyDraft = {
      ...SIMPLE_DRAFT,
      context: '', primaryGoal: '', situation: '', quote: '',
      behaviors: [], expectations: [], constraints: [], triggers: [], alternatives: [], channels: [],
    };
    expect(personaEvidenceStatements(emptyDraft)).toEqual([]);
  });

  it('extracts statements from draft fields', () => {
    const draft = { ...SIMPLE_DRAFT, context: 'User context' };
    const result = personaEvidenceStatements(draft);
    const fields = result.map((r) => r.field);
    expect(fields).toContain('context');
  });
});

// ─── personaProfileFromEntity ─────────────────────────────────────────────────

describe('personaProfileFromEntity', () => {
  it('maps all fields', () => {
    const entity = {
      id: 'pe1', type: 'persona', title: 'Persona', description: 'Desc',
      personaMode: 'professional', personaLayout: 'balanced',
      context: 'Ctx', primaryGoal: 'Goal', situation: 'Sit',
      quote: 'Q', behaviors: ['B1'], expectations: ['E1'],
      constraints: ['C1'], triggers: ['T1'], alternatives: ['A1'],
      channels: ['web'], relatedIds: [],
    } as unknown as GraphEntity;
    const d = personaProfileFromEntity(entity);
    expect(d.title).toBe('Persona');
    expect(d.mode).toBe('professional');
    expect(d.layout).toBe('balanced');
    expect(d.context).toBe('Ctx');
    expect(d.primaryGoal).toBe('Goal');
    expect(d.behaviors).toEqual(['B1']);
    expect(d.channels).toEqual(['web']);
  });

  it('defaults mode to simple for unknown value', () => {
    const entity = { id: 'pe1', type: 'persona', personaMode: 'unknown', relatedIds: [] } as unknown as GraphEntity;
    expect(personaProfileFromEntity(entity).mode).toBe('simple');
  });

  it('defaults layout to profile-left for unknown value', () => {
    const entity = { id: 'pe1', type: 'persona', personaLayout: 'unknown', relatedIds: [] } as unknown as GraphEntity;
    expect(personaProfileFromEntity(entity).layout).toBe('profile-left');
  });

  it('defaults sections to SIMPLE_PERSONA_SECTIONS for simple mode', () => {
    const entity = { id: 'pe1', type: 'persona', relatedIds: [] } as unknown as GraphEntity;
    const d = personaProfileFromEntity(entity);
    expect(d.sections).toEqual(SIMPLE_PERSONA_SECTIONS);
  });
});

// ─── buildPersonaStudioReport ─────────────────────────────────────────────────

describe('buildPersonaStudioReport', () => {
  it('returns null when persona not found', () => {
    expect(buildPersonaStudioReport(base(), 'missing')).toBeNull();
  });

  it('returns report shape for valid persona', () => {
    const g = addPersona(base(), 'pe1');
    const r = buildPersonaStudioReport(g, 'pe1');
    expect(r).not.toBeNull();
    expect(r!.persona.id).toBe('pe1');
    expect(Array.isArray(r!.connections)).toBe(true);
    expect(Array.isArray(r!.foundationChecks)).toBe(true);
    expect(Array.isArray(r!.professionalChecks)).toBe(true);
    expect(typeof r!.foundationScore).toBe('number');
    expect(typeof r!.professionalScore).toBe('number');
  });

  it('detects inbound need connection via relatedIds', () => {
    let g = addEntity(base(), 'need', 'n1', { relatedIds: ['pe1'] });
    g = addPersona(g, 'pe1');
    const r = buildPersonaStudioReport(g, 'pe1')!;
    expect(r.connectionCounts.need).toBe(1);
  });

  it('detects inbound connection via personaIds', () => {
    let g = addEntity(base(), 'job', 'j1', { personaIds: ['pe1'] });
    g = addPersona(g, 'pe1');
    const r = buildPersonaStudioReport(g, 'pe1')!;
    expect(r.connectionCounts.job).toBe(1);
  });

  it('detects outbound evidence connection', () => {
    let g = addEntity(base(), 'evidence', 'ev1', { confidence: 'medium' });
    g = addPersona(g, 'pe1', { relatedIds: ['ev1'] });
    const r = buildPersonaStudioReport(g, 'pe1')!;
    expect(r.connectionCounts.evidence).toBe(1);
    expect(r.evidenceConfidence.medium).toBe(1);
  });

  it('identity check passes when persona has title', () => {
    const g = addPersona(base(), 'pe1', { title: 'Named Persona' });
    const r = buildPersonaStudioReport(g, 'pe1')!;
    const check = r.foundationChecks.find((c) => c.id === 'identity');
    expect(check?.complete).toBe(true);
  });

  it('readyForDefinition false for incomplete persona', () => {
    const g = addPersona(base(), 'pe1');
    const r = buildPersonaStudioReport(g, 'pe1')!;
    expect(r.readyForDefinition).toBe(false);
  });
});

// ─── updatePersonaProfile ─────────────────────────────────────────────────────

describe('updatePersonaProfile', () => {
  it('no-ops when persona not found', () => {
    const g = base();
    const result = updatePersonaProfile({ graph: g, personaId: 'missing', draft: SIMPLE_DRAFT, connectedIds: [], now: NOW });
    expect(result).toBe(g);
  });

  it('writes title and description', () => {
    const g = addPersona(base(), 'pe1');
    const result = updatePersonaProfile({ graph: g, personaId: 'pe1', draft: SIMPLE_DRAFT, connectedIds: [], now: NOW });
    const updated = result.entities!.persona!['pe1'];
    expect(updated.title).toBe('Persona Name');
    expect(updated.description).toBe('Desc');
  });

  it('sets profileVersion to 1', () => {
    const g = addPersona(base(), 'pe1');
    const result = updatePersonaProfile({ graph: g, personaId: 'pe1', draft: SIMPLE_DRAFT, connectedIds: [], now: NOW });
    expect(result.entities!.persona!['pe1'].profileVersion).toBe(1);
  });

  it('links connected need bidirectionally', () => {
    let g = addEntity(base(), 'need', 'n1');
    g = addPersona(g, 'pe1');
    const result = updatePersonaProfile({ graph: g, personaId: 'pe1', draft: SIMPLE_DRAFT, connectedIds: ['n1'], now: NOW });
    expect(result.entities!.persona!['pe1'].relatedIds).toContain('n1');
    expect(result.entities!.need!['n1'].relatedIds).toContain('pe1');
    expect(result.entities!.need!['n1'].personaIds).toContain('pe1');
  });

  it('removes link when not in connectedIds', () => {
    let g = addEntity(base(), 'need', 'n1', { relatedIds: ['pe1'], personaIds: ['pe1'] });
    g = addPersona(g, 'pe1', { relatedIds: ['n1'] });
    const result = updatePersonaProfile({ graph: g, personaId: 'pe1', draft: SIMPLE_DRAFT, connectedIds: [], now: NOW });
    expect(result.entities!.need!['n1'].relatedIds).not.toContain('pe1');
    expect(result.entities!.need!['n1'].personaIds).not.toContain('pe1');
  });
});

// ─── removePersonaFromGraph ───────────────────────────────────────────────────

describe('removePersonaFromGraph', () => {
  it('no-ops when persona not found', () => {
    const g = base();
    expect(removePersonaFromGraph(g, 'missing', NOW)).toBe(g);
  });

  it('removes persona from entities', () => {
    const g = addPersona(base(), 'pe1');
    const result = removePersonaFromGraph(g, 'pe1', NOW);
    expect(result.entities?.persona?.['pe1']).toBeUndefined();
  });

  it('removes personaId from related need', () => {
    let g = addEntity(base(), 'need', 'n1', { relatedIds: ['pe1'], personaIds: ['pe1'] });
    g = addPersona(g, 'pe1', { relatedIds: ['n1'] });
    const result = removePersonaFromGraph(g, 'pe1', NOW);
    expect(result.entities!.need!['n1'].relatedIds).not.toContain('pe1');
    expect(result.entities!.need!['n1'].personaIds).not.toContain('pe1');
  });
});

// ─── personaRelationOptions ───────────────────────────────────────────────────

describe('personaRelationOptions', () => {
  it('returns empty for empty graph', () => {
    expect(personaRelationOptions(base())).toEqual([]);
  });

  it('returns option with confidence for evidence', () => {
    const g = addEntity(base(), 'evidence', 'ev1', { confidence: 'high' });
    const opts = personaRelationOptions(g);
    const ev = opts.find((o) => o.id === 'ev1');
    expect(ev?.confidence).toBe('high');
  });

  it('non-evidence option has undefined confidence', () => {
    const g = addEntity(base(), 'need', 'n1');
    const opts = personaRelationOptions(g);
    const n = opts.find((o) => o.id === 'n1');
    expect(n?.confidence).toBeUndefined();
  });
});

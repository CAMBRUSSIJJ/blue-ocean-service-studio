import { describe, it, expect } from 'vitest';
import {
  CHANNEL_KIND_META,
  CONTINUITY_DIMENSIONS,
  inferChannelKind,
  materializeLegacyChannels,
  createServiceChannel,
  updateServiceChannel,
  removeServiceChannel,
  assignTouchpointChannel,
  assignTouchpointChannelByName,
  setChannelHandoffRating,
  setChannelHandoffNote,
  buildChannelContinuityReport,
} from '../channel-continuity';
import { createServiceGraph } from '../../domain/graph-operations';
import type { ServiceGraph } from '../../domain/model';

const NOW = '2024-09-01T10:00:00.000Z';

function base(): ServiceGraph {
  const g = createServiceGraph('S');
  return { ...g, service: { ...g.service, id: 'S', updatedAt: NOW } };
}

function withChannel(graph: ServiceGraph, id: string, name: string): ServiceGraph {
  return {
    ...graph,
    channels: {
      ...(graph.channels ?? {}),
      [id]: { id, serviceId: 'S', name, kind: 'digital', description: '', active: true, createdAt: NOW, updatedAt: NOW },
    },
  } as ServiceGraph;
}

function withTouchpoint(graph: ServiceGraph, id: string, channelId?: string, channelName?: string): ServiceGraph {
  return {
    ...graph,
    touchpoints: {
      ...graph.touchpoints,
      [id]: {
        id, serviceId: 'S', name: `TP ${id}`,
        channelId: channelId, channel: channelName ?? '',
        createdAt: NOW, updatedAt: NOW,
      } as ServiceGraph['touchpoints'][string],
    },
  };
}

/** Build a minimal graph with journey → stages → touchpoints for transition detection */
function withJourneySetup(graph: ServiceGraph): ServiceGraph {
  const g = withChannel(withChannel(graph, 'ch1', 'Web App'), 'ch2', 'Telefone');
  const g2 = withTouchpoint(withTouchpoint(g, 'tp1', 'ch1', 'Web App'), 'tp2', 'ch2', 'Telefone');
  return {
    ...g2,
    service: {
      ...g2.service,
      journeyIds: ['j1'],
    },
    journeys: {
      j1: { id: 'j1', serviceId: 'S', name: 'Main Journey', status: 'active', stageIds: ['s1', 's2'], createdAt: NOW, updatedAt: NOW } as ServiceGraph['journeys'][string],
    },
    stages: {
      s1: { id: 's1', journeyId: 'j1', serviceId: 'S', title: 'Stage 1', touchpointIds: ['tp1'], createdAt: NOW, updatedAt: NOW } as ServiceGraph['stages'][string],
      s2: { id: 's2', journeyId: 'j1', serviceId: 'S', title: 'Stage 2', touchpointIds: ['tp2'], createdAt: NOW, updatedAt: NOW } as ServiceGraph['stages'][string],
    },
  } as ServiceGraph;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

describe('CHANNEL_KIND_META', () => {
  it('covers 9 channel kinds', () => {
    expect(Object.keys(CHANNEL_KIND_META)).toHaveLength(9);
    expect(CHANNEL_KIND_META.digital.label).toBe('Digital');
    expect(CHANNEL_KIND_META.in_person.label).toBe('Presencial');
  });
});

describe('CONTINUITY_DIMENSIONS', () => {
  it('has 5 dimensions', () => {
    expect(CONTINUITY_DIMENSIONS).toHaveLength(5);
    const keys = CONTINUITY_DIMENSIONS.map((d) => d.key);
    expect(keys).toContain('context');
    expect(keys).toContain('status');
  });
});

// ─── inferChannelKind ─────────────────────────────────────────────────────────

describe('inferChannelKind', () => {
  it('infers messaging for WhatsApp', () => {
    expect(inferChannelKind('WhatsApp')).toBe('messaging');
  });
  it('infers phone for call center', () => {
    expect(inferChannelKind('Call center')).toBe('phone');
  });
  it('infers email for e-mail', () => {
    expect(inferChannelKind('E-mail corporativo')).toBe('email');
  });
  it('infers digital for web portal', () => {
    expect(inferChannelKind('Portal web')).toBe('digital');
  });
  it('infers in_person for agency', () => {
    expect(inferChannelKind('Agência bancária')).toBe('in_person');
  });
  it('infers physical for document', () => {
    expect(inferChannelKind('Documento físico')).toBe('physical');
  });
  it('infers system for API', () => {
    expect(inferChannelKind('API integração')).toBe('system');
  });
  it('falls back to other for unknown name', () => {
    expect(inferChannelKind('Coisa absolutamente desconhecida')).toBe('other');
  });
});

// ─── materializeLegacyChannels ────────────────────────────────────────────────

describe('materializeLegacyChannels', () => {
  it('no-ops when all touchpoints already have channelId', () => {
    const g = withChannel(withTouchpoint(base(), 'tp1', 'ch1', 'Web App'), 'ch1', 'Web App');
    const r = materializeLegacyChannels(g, NOW);
    expect(r.createdChannelIds).toHaveLength(0);
    expect(r.linkedTouchpointIds).toHaveLength(0);
  });

  it('creates channel and links touchpoint for legacy channel name', () => {
    const g = withTouchpoint(base(), 'tp1', undefined, 'WhatsApp');
    const r = materializeLegacyChannels(g, NOW);
    expect(r.createdChannelIds).toHaveLength(1);
    expect(r.linkedTouchpointIds).toContain('tp1');
    const tp = r.graph.touchpoints['tp1'];
    expect(tp.channelId).toBeTruthy();
    expect(r.graph.channels![tp.channelId!]?.name).toBe('WhatsApp');
  });

  it('reuses existing channel for same name', () => {
    const g = withTouchpoint(withTouchpoint(base(), 'tp1', undefined, 'WhatsApp'), 'tp2', undefined, 'WhatsApp');
    const r = materializeLegacyChannels(g, NOW);
    expect(r.createdChannelIds).toHaveLength(1);
    const ch1 = r.graph.touchpoints['tp1'].channelId;
    const ch2 = r.graph.touchpoints['tp2'].channelId;
    expect(ch1).toBe(ch2);
  });
});

// ─── createServiceChannel ─────────────────────────────────────────────────────

describe('createServiceChannel', () => {
  it('creates a new channel', () => {
    const r = createServiceChannel({ graph: base(), name: 'App Mobile', now: NOW });
    expect(r.created).toBe(true);
    expect(r.channelId).toBeTruthy();
    expect(r.graph.channels![r.channelId!].name).toBe('App Mobile');
  });

  it('returns created: false for empty name', () => {
    const r = createServiceChannel({ graph: base(), name: '  ', now: NOW });
    expect(r.channelId).toBeNull();
    expect(r.created).toBe(false);
  });

  it('returns existing channel id when name already exists (case-insensitive)', () => {
    const g = withChannel(base(), 'ch1', 'App Mobile');
    const r = createServiceChannel({ graph: g, name: 'app mobile', now: NOW });
    expect(r.created).toBe(false);
    expect(r.channelId).toBe('ch1');
  });

  it('infers kind from name', () => {
    const r = createServiceChannel({ graph: base(), name: 'Portal Web', now: NOW });
    expect(r.graph.channels![r.channelId!].kind).toBe('digital');
  });

  it('uses provided kind when specified', () => {
    const r = createServiceChannel({ graph: base(), name: 'Custom', kind: 'partner', now: NOW });
    expect(r.graph.channels![r.channelId!].kind).toBe('partner');
  });
});

// ─── updateServiceChannel ─────────────────────────────────────────────────────

describe('updateServiceChannel', () => {
  it('updates channel name and kind', () => {
    const g = withChannel(base(), 'ch1', 'Old Name');
    const g2 = updateServiceChannel(g, 'ch1', { name: 'New Name', kind: 'phone' }, NOW);
    expect(g2.channels!['ch1'].name).toBe('New Name');
    expect(g2.channels!['ch1'].kind).toBe('phone');
  });

  it('propagates name change to linked touchpoints', () => {
    const g = withTouchpoint(withChannel(base(), 'ch1', 'Web'), 'tp1', 'ch1', 'Web');
    const g2 = updateServiceChannel(g, 'ch1', { name: 'Web App' }, NOW);
    expect(g2.touchpoints['tp1'].channel).toBe('Web App');
  });

  it('no-ops for non-existent channel', () => {
    const r = updateServiceChannel(base(), 'ghost', { name: 'X' }, NOW);
    expect(r.channels?.['ghost']).toBeUndefined();
  });
});

// ─── removeServiceChannel ─────────────────────────────────────────────────────

describe('removeServiceChannel', () => {
  it('removes an unused channel', () => {
    const g = withChannel(base(), 'ch1', 'Web');
    const r = removeServiceChannel(g, 'ch1', NOW);
    expect(r.removed).toBe(true);
    expect(r.graph.channels?.['ch1']).toBeUndefined();
  });

  it('blocked when channel is used by touchpoints', () => {
    const g = withTouchpoint(withChannel(base(), 'ch1', 'Web'), 'tp1', 'ch1', 'Web');
    const r = removeServiceChannel(g, 'ch1', NOW);
    expect(r.removed).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  it('blocked when channel has handoff assessment', () => {
    const g = withChannel(withChannel(base(), 'ch1', 'Web'), 'ch2', 'Phone');
    const g2 = setChannelHandoffRating(g, 'ch1', 'ch2', 'context', 'pass', NOW);
    const r = removeServiceChannel(g2, 'ch1', NOW);
    expect(r.removed).toBe(false);
  });

  it('returns reason when channel not found', () => {
    const r = removeServiceChannel(base(), 'ghost', NOW);
    expect(r.removed).toBe(false);
    expect(r.reason).toBeTruthy();
  });
});

// ─── assignTouchpointChannel ──────────────────────────────────────────────────

describe('assignTouchpointChannel', () => {
  it('assigns a channel to a touchpoint', () => {
    const g = withTouchpoint(withChannel(base(), 'ch1', 'Web'), 'tp1');
    const g2 = assignTouchpointChannel(g, 'tp1', 'ch1', NOW);
    expect(g2.touchpoints['tp1'].channelId).toBe('ch1');
    expect(g2.touchpoints['tp1'].channel).toBe('Web');
  });

  it('no-ops when touchpoint or channel missing', () => {
    const g0 = withChannel(base(), 'ch1', 'Web');
    const g1 = assignTouchpointChannel(g0, 'missing-tp', 'ch1', NOW);
    // should return migrated graph without crash
    expect(g1.channels?.['ch1']).toBeDefined();
  });
});

// ─── assignTouchpointChannelByName ────────────────────────────────────────────

describe('assignTouchpointChannelByName', () => {
  it('creates channel and assigns to touchpoint', () => {
    const g = withTouchpoint(base(), 'tp1');
    const g2 = assignTouchpointChannelByName(g, 'tp1', 'WhatsApp', NOW);
    expect(g2.touchpoints['tp1'].channelId).toBeTruthy();
    expect(g2.touchpoints['tp1'].channel).toBe('WhatsApp');
  });

  it('reuses existing channel with same name', () => {
    const g = withTouchpoint(withChannel(base(), 'ch1', 'Web App'), 'tp1');
    const g2 = assignTouchpointChannelByName(g, 'tp1', 'Web App', NOW);
    expect(g2.touchpoints['tp1'].channelId).toBe('ch1');
  });
});

// ─── setChannelHandoffRating ──────────────────────────────────────────────────

describe('setChannelHandoffRating', () => {
  it('creates handoff assessment with rating', () => {
    const g = withChannel(withChannel(base(), 'ch1', 'Web'), 'ch2', 'Phone');
    const g2 = setChannelHandoffRating(g, 'ch1', 'ch2', 'context', 'pass', NOW);
    const handoffs = Object.values(g2.channelHandoffs ?? {});
    expect(handoffs).toHaveLength(1);
    expect(handoffs[0].ratings.context).toBe('pass');
  });

  it('updates existing handoff rating', () => {
    const g = withChannel(withChannel(base(), 'ch1', 'Web'), 'ch2', 'Phone');
    const g2 = setChannelHandoffRating(g, 'ch1', 'ch2', 'context', 'pass', NOW);
    const g3 = setChannelHandoffRating(g2, 'ch1', 'ch2', 'context', 'fail', NOW);
    const handoffs = Object.values(g3.channelHandoffs ?? {});
    expect(handoffs).toHaveLength(1); // still one handoff
    expect(handoffs[0].ratings.context).toBe('fail');
  });

  it('no-ops when same channel on both sides', () => {
    const g = withChannel(base(), 'ch1', 'Web');
    const g2 = setChannelHandoffRating(g, 'ch1', 'ch1', 'context', 'pass', NOW);
    expect(Object.keys(g2.channelHandoffs ?? {})).toHaveLength(0);
  });
});

// ─── setChannelHandoffNote ────────────────────────────────────────────────────

describe('setChannelHandoffNote', () => {
  it('creates handoff with note when assessment does not exist', () => {
    const g = withChannel(withChannel(base(), 'ch1', 'Web'), 'ch2', 'Phone');
    const g2 = setChannelHandoffNote(g, 'ch1', 'ch2', 'Need to pass ticket ID', NOW);
    const handoffs = Object.values(g2.channelHandoffs ?? {});
    expect(handoffs[0].note).toBe('Need to pass ticket ID');
  });

  it('updates note on existing assessment', () => {
    const g = withChannel(withChannel(base(), 'ch1', 'Web'), 'ch2', 'Phone');
    const g2 = setChannelHandoffRating(g, 'ch1', 'ch2', 'status', 'pass', NOW);
    const g3 = setChannelHandoffNote(g2, 'ch1', 'ch2', 'Updated note', NOW);
    const handoffs = Object.values(g3.channelHandoffs ?? {});
    expect(handoffs[0].note).toBe('Updated note');
    expect(handoffs[0].ratings.status).toBe('pass'); // rating preserved
  });
});

// ─── buildChannelContinuityReport ────────────────────────────────────────────

describe('buildChannelContinuityReport', () => {
  it('returns zero counts for empty graph', () => {
    const r = buildChannelContinuityReport(base());
    expect(r.channelCount).toBe(0);
    expect(r.touchpointCount).toBe(0);
    expect(r.transitions).toHaveLength(0);
    expect(r.continuityScore).toBeNull();
  });

  it('detects channel transition between adjacent stages', () => {
    const r = buildChannelContinuityReport(withJourneySetup(base()));
    expect(r.transitions).toHaveLength(1);
    expect(r.transitions[0].fromName).toBe('Web App'); // tp1 (Web App) → tp2 (Telefone)
    expect(r.transitions[0].toName).toBe('Telefone');
    expect(r.switchCount).toBe(1);
  });

  it('reports unclassified touchpoints as high severity issues', () => {
    const g = withTouchpoint(base(), 'tp1'); // no channel
    const r = buildChannelContinuityReport(g);
    expect(r.unclassifiedTouchpointIds).toContain('tp1');
    const issue = r.issues.find((item) => item.touchpointId === 'tp1');
    expect(issue?.severity).toBe('high');
  });

  it('reports unevaluated transitions as medium severity issues', () => {
    const r = buildChannelContinuityReport(withJourneySetup(base()));
    const medium = r.issues.filter((issue) => issue.severity === 'medium');
    expect(medium.length).toBeGreaterThan(0);
  });

  it('computes continuityScore from assessed transitions', () => {
    const g = withJourneySetup(base());
    const withRating = setChannelHandoffRating(g, 'ch1', 'ch2', 'context', 'pass', NOW);
    const r = buildChannelContinuityReport(withRating);
    expect(r.continuityScore).not.toBeNull();
  });

  it('marks fail-rated dimension as high severity issue', () => {
    const g = withJourneySetup(base());
    // ch1 → ch2 transition exists; rate context as fail
    const withRating = setChannelHandoffRating(g, 'ch1', 'ch2', 'context', 'fail', NOW);
    const r = buildChannelContinuityReport(withRating);
    const breakIssue = r.issues.find((issue) => issue.severity === 'high' && issue.id.includes('break'));
    expect(breakIssue).toBeDefined();
  });

  it('mappedTouchpointCoverage is 100 when all touchpoints have named channels', () => {
    const g = withTouchpoint(withChannel(base(), 'ch1', 'Web'), 'tp1', 'ch1', 'Web');
    const r = buildChannelContinuityReport(g);
    expect(r.mappedTouchpointCoverage).toBe(100);
  });
});

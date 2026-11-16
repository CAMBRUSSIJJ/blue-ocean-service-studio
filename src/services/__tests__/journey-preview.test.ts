import { describe, it, expect } from 'vitest';
import { journeyPreviewSrc } from '../journey-preview.ts';
import type { Journey } from '../../domain/model';

const NOW = '2025-01-01T00:00:00.000Z';

function makeJourney(overrides: Partial<Journey> = {}): Journey {
  return {
    id: 'j1',
    serviceId: 'svc1',
    name: 'Jornada Teste',
    stageIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeGraph(stages: Record<string, { id: string; title: string; customerAction: string; thoughts?: string; emotion: 'positive' | 'negative' | 'neutral'; touchpointIds: string[]; problemIds: string[]; opportunityIds: string[] }> = {}) {
  return { stages } as any;
}

describe('journeyPreviewSrc', () => {
  describe('custom cover', () => {
    it('retorna coverImage quando tem imagem base64 válida (PNG)', () => {
      const journey = makeJourney({ coverImage: 'data:image/png;base64,abc123' });
      const result = journeyPreviewSrc(journey, makeGraph());
      expect(result).toBe('data:image/png;base64,abc123');
    });

    it('retorna coverImage quando tem imagem base64 válida (JPEG)', () => {
      const journey = makeJourney({ coverImage: 'data:image/jpeg;base64,xyz789' });
      const result = journeyPreviewSrc(journey, makeGraph());
      expect(result).toBe('data:image/jpeg;base64,xyz789');
    });

    it('não usa coverImage inválida — gera SVG', () => {
      const journey = makeJourney({ coverImage: 'https://example.com/img.png' });
      const result = journeyPreviewSrc(journey, makeGraph());
      expect(result).toMatch(/^data:image\/svg\+xml/);
    });
  });

  describe('jornada sem etapas', () => {
    it('retorna data:image/svg+xml quando stageIds vazio', () => {
      const journey = makeJourney({ stageIds: [] });
      const result = journeyPreviewSrc(journey, makeGraph());
      expect(result).toMatch(/^data:image\/svg\+xml;charset=utf-8,/);
    });

    it('SVG contém texto de jornada em branco quando não há etapas', () => {
      const journey = makeJourney({ stageIds: [] });
      const result = journeyPreviewSrc(journey, makeGraph());
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Jornada em branco');
    });

    it('SVG contém texto de instrução quando não há etapas', () => {
      const journey = makeJourney({ stageIds: [] });
      const result = journeyPreviewSrc(journey, makeGraph());
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Pronta para suas etapas e faixas');
    });
  });

  describe('jornada com etapas', () => {
    function makeStage(id: string, title: string) {
      return { id, title, customerAction: 'Ação do cliente', emotion: 'neutral' as const, touchpointIds: [], problemIds: [], opportunityIds: [] };
    }

    it('SVG contém título da etapa', () => {
      const journey = makeJourney({ stageIds: ['s1'] });
      const graph = makeGraph({ s1: makeStage('s1', 'Descoberta') });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Descoberta');
    });

    it('trunca título da etapa longa em 19 caracteres', () => {
      const journey = makeJourney({ stageIds: ['s1'] });
      // "Título muito longo ".slice(0,19) = "Título muito longo " (trailing space); 'd' from 'demais' is cut
      const graph = makeGraph({ s1: makeStage('s1', 'Título muito longo demais aqui') });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).not.toContain('demais');
      expect(decoded).toContain('Título muito longo');
    });

    it('trata no máximo 4 etapas mesmo com mais', () => {
      const stageIds = ['s1', 's2', 's3', 's4', 's5'];
      const journey = makeJourney({ stageIds });
      const stages: any = {};
      stageIds.forEach((id, i) => { stages[id] = makeStage(id, `Etapa ${i + 1}`); });
      const graph = makeGraph(stages);
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Etapa 4');
      expect(decoded).not.toContain('Etapa 5');
    });

    it('ignora etapas inexistentes no graph', () => {
      const journey = makeJourney({ stageIds: ['s1', 'missing'] });
      const graph = makeGraph({ s1: makeStage('s1', 'Existente') });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Existente');
    });
  });

  describe('xml escaping', () => {
    function makeStage(id: string, title: string) {
      return { id, title, customerAction: '', emotion: 'neutral' as const, touchpointIds: [], problemIds: [], opportunityIds: [] };
    }

    it('escapa & no título da etapa', () => {
      const journey = makeJourney({ stageIds: ['s1'] });
      const graph = makeGraph({ s1: makeStage('s1', 'Pré & Pós') });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Pré &amp; Pós');
    });

    it('escapa < no título da etapa', () => {
      const journey = makeJourney({ stageIds: ['s1'] });
      const graph = makeGraph({ s1: makeStage('s1', 'A<B') });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('A&lt;B');
    });

    it('escapa > no título da etapa', () => {
      const journey = makeJourney({ stageIds: ['s1'] });
      const graph = makeGraph({ s1: makeStage('s1', 'A>B') });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('A&gt;B');
    });

    it('escapa " no título da etapa', () => {
      const journey = makeJourney({ stageIds: ['s1'] });
      const graph = makeGraph({ s1: makeStage('s1', 'A"B') });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('A&quot;B');
    });

    it("escapa ' no título da etapa", () => {
      const journey = makeJourney({ stageIds: ['s1'] });
      const graph = makeGraph({ s1: makeStage('s1', "A'B") });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('A&apos;B');
    });
  });

  describe('matrixView perspective journey', () => {
    it('usa rows padrão sd, ac, em quando perspective=journey', () => {
      const journey = makeJourney({
        stageIds: ['s1'],
        matrixView: { perspective: 'journey' as any, rowOrder: undefined, hiddenRows: [] },
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: 'Ação', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Contexto'); // label for 'sd'
    });

    it('usa rows padrão sem perspective (blueprint)', () => {
      const journey = makeJourney({
        stageIds: ['s1'],
        matrixView: { perspective: 'blueprint' as any, rowOrder: undefined, hiddenRows: [] },
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: 'Ação', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Evidências'); // label for 'ev'
    });
  });

  describe('rowOrder e hiddenRows', () => {
    it('respeita rowOrder customizado', () => {
      const journey = makeJourney({
        stageIds: ['s1'],
        matrixView: { perspective: 'journey' as any, rowOrder: ['em', 'ac', 'sd'], hiddenRows: [] },
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: 'Ação', emotion: 'positive', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Emoções'); // label for 'em'
    });

    it('oculta rows listadas em hiddenRows', () => {
      const journey = makeJourney({
        stageIds: ['s1'],
        matrixView: { perspective: 'journey' as any, rowOrder: ['sd', 'ac', 'em'], hiddenRows: ['sd'] },
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: 'Ação', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).not.toContain('Contexto'); // 'sd' hidden
      expect(decoded).toContain('Ações do cliente'); // 'ac' visible
    });
  });

  describe('mapLayout.lanes fallback', () => {
    it('usa mapLayout.lanes quando não há matrixContent nem matrixView', () => {
      const journey = makeJourney({
        stageIds: ['s1'],
        mapLayout: {
          lanes: [
            { id: 'lane1', label: 'Minha Faixa', hidden: false, tone: 'blue', type: 'text', binding: undefined, cards: {} },
          ],
        },
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: '', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Minha Faixa');
    });

    it('oculta lanes com hidden=true no mapLayout', () => {
      const journey = makeJourney({
        stageIds: ['s1'],
        mapLayout: {
          lanes: [
            { id: 'lane1', label: 'Faixa Visível', hidden: false, tone: 'neutral', type: 'text', binding: undefined, cards: {} },
            { id: 'lane2', label: 'Faixa Oculta', hidden: true, tone: 'neutral', type: 'text', binding: undefined, cards: {} },
          ],
        },
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: '', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Faixa Visível');
      expect(decoded).not.toContain('Faixa Oculta');
    });
  });

  describe('conteúdo das células', () => {
    it('usa matrixContent.cells quando disponível', () => {
      const journey = makeJourney({
        stageIds: ['s1'],
        matrixView: { perspective: 'journey' as any, rowOrder: ['ac'], hiddenRows: [] },
        matrixContent: {
          rows: {},
          cells: {
            s1: { ac: [{ text: 'Texto da Célula', i: 'n1' }] },
          },
        } as any,
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: '', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Texto da Célula');
    });

    it('usa customerAction da etapa para row ac quando não há matrixContent', () => {
      const journey = makeJourney({
        stageIds: ['s1'],
        matrixView: { perspective: 'journey' as any, rowOrder: ['ac'], hiddenRows: [] },
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: 'Ação do Cliente', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Ação do Cliente');
    });

    it('usa thoughts da etapa para row sd', () => {
      const journey = makeJourney({
        stageIds: ['s1'],
        matrixView: { perspective: 'journey' as any, rowOrder: ['sd'], hiddenRows: [] },
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: '', thoughts: 'Pensamento', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Pensamento');
    });

    it('SVG sem faixas mostra "Sem faixas" quando todas as rows estão ocultas', () => {
      // rowOrder=['sd'] + hiddenRows=['sd'] → rowIds=[] → lanes=[] → "Sem faixas"
      const journey = makeJourney({
        stageIds: ['s1'],
        matrixView: { perspective: 'journey' as any, rowOrder: ['sd'], hiddenRows: ['sd'] },
      });
      const graph = makeGraph({
        s1: { id: 's1', title: 'Etapa', customerAction: '', emotion: 'neutral', touchpointIds: [], problemIds: [], opportunityIds: [] },
      });
      const result = journeyPreviewSrc(journey, graph);
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('Sem faixas');
    });
  });

  describe('formato do SVG retornado', () => {
    it('SVG tem viewBox 560x180', () => {
      const journey = makeJourney();
      const result = journeyPreviewSrc(journey, makeGraph());
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('viewBox="0 0 560 180"');
    });

    it('SVG tem xmlns correto', () => {
      const journey = makeJourney();
      const result = journeyPreviewSrc(journey, makeGraph());
      const decoded = decodeURIComponent(result.replace('data:image/svg+xml;charset=utf-8,', ''));
      expect(decoded).toContain('xmlns="http://www.w3.org/2000/svg"');
    });
  });
});

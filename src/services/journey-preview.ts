import type { Journey, ServiceGraph } from '../domain/model';
import { hasCustomJourneyCover, journeyCoverSrc } from './journey-cover.ts';
import { cardsInCell } from '../domain/journey-card-operations.ts';

const xml = (value: string, max = 25) => value.slice(0, max).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);

/** Lightweight preview of the saved map; existing custom covers retain priority. */
export function journeyPreviewSrc(journey: Journey, graph: ServiceGraph): string {
  if (hasCustomJourneyCover(journey)) return journeyCoverSrc(journey);
  const stages = journey.stageIds.map(id => graph.stages[id]).filter(Boolean).slice(0, 4);
  const lanes = (journey.mapLayout?.lanes ?? []).filter(lane => !lane.hidden).slice(0, 3);
  const colors = { neutral: '#f1f5f9', blue: '#dbeafe', emerald: '#d1fae5', amber: '#fef3c7', rose: '#ffe4e6', violet: '#ede9fe' };
  let body = '<rect width="560" height="180" rx="12" fill="#f8fafc"/>';
  if (!stages.length) body += '<text x="28" y="78" fill="#334155" font-size="18">Jornada em branco</text><text x="28" y="106" fill="#64748b" font-size="12">Pronta para suas etapas e faixas</text>';
  else {
    const width = 422 / stages.length;
    stages.forEach((stage, i) => { const x = 126 + i * width;
      body += `<rect x="${x}" y="12" width="${width - 5}" height="35" rx="5" fill="#e2e8f0"/><text x="${x + 7}" y="33" fill="#334155" font-size="10">${xml(stage.title, 19)}</text>`;
    });
    if (!lanes.length) body += '<text x="20" y="94" fill="#64748b" font-size="12">Sem faixas</text>';
    lanes.forEach((lane, i) => { const y = 55 + i * 38;
      body += `<rect x="12" y="${y}" width="103" height="32" rx="4" fill="${colors[lane.tone ?? 'neutral'] ?? colors.neutral}"/><text x="19" y="${y + 20}" fill="#475569" font-size="10">${xml(lane.label, 17)}</text>`;
      stages.forEach((stage, j) => { const x = 126 + j * width;
        const text = lane.binding === 'customerAction' ? stage.customerAction : lane.binding === 'thoughts' ? stage.thoughts : lane.type === 'emotion' ? ({ positive: 'Satisfeito', neutral: 'Neutro', negative: 'Frustrado' })[stage.emotion] : cardsInCell(lane, stage.id)[0]?.content;
        body += `<rect x="${x}" y="${y}" width="${width - 5}" height="32" rx="4" fill="#fff" stroke="#e2e8f0"/><text x="${x + 7}" y="${y + 20}" fill="#52647b" font-size="9">${xml(text ?? '', 20)}</text>`;
      });
    });
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="560" height="180" viewBox="0 0 560 180"><g font-family="system-ui,sans-serif">${body}</g></svg>`)}`;
}

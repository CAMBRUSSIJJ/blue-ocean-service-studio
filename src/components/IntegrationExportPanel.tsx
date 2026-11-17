/**
 * IntegrationExportPanel — C3.1
 * Exports portfolio initiatives to Jira, Linear, or Notion via downloadable files.
 * Direct API calls are CORS-blocked in browser; we generate downloadable artifacts instead.
 */
import { useState } from 'react';
import { CheckCircle2, Download, ExternalLink, X } from '../design-system/icons';
import type { ServiceGraph, ServiceImprovementInitiative } from '../domain/model';

type ExportTarget = 'jira' | 'linear' | 'notion';

interface ExportOption {
  id: ExportTarget;
  label: string;
  description: string;
  format: string;
  icon: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'jira',
    label: 'Jira',
    description: 'CSV com campos compatíveis com importação nativa do Jira (Summary, Issue Type, Priority, Description, Labels)',
    format: 'CSV (.csv)',
    icon: 'J',
  },
  {
    id: 'linear',
    label: 'Linear',
    description: 'CSV com campos do formato de importação do Linear (title, description, priority, status, estimate)',
    format: 'CSV (.csv)',
    icon: 'L',
  },
  {
    id: 'notion',
    label: 'Notion',
    description: 'Página em Markdown estruturado, pronto para colar ou importar no Notion como Database ou página',
    format: 'Markdown (.md)',
    icon: 'N',
  },
];

const STATUS_LABEL: Record<string, string> = {
  backlog: 'Backlog',
  planned: 'To Do',
  in_progress: 'In Progress',
  validating: 'In Review',
  implemented: 'Done',
};

const RISK_LABEL: Record<string, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const JIRA_PRIORITY: Record<string, string> = {
  1: 'Lowest',
  2: 'Low',
  3: 'Medium',
  4: 'High',
  5: 'Highest',
};

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function buildJiraCsv(initiatives: ServiceImprovementInitiative[]): string {
  const headers = ['Summary', 'Issue Type', 'Priority', 'Status', 'Description', 'Labels', 'Due Date', 'Assignee'];
  const rows = initiatives.map((i) => [
    escapeCsv(i.title),
    escapeCsv('Task'),
    escapeCsv(JIRA_PRIORITY[String(i.expectedImpact)] ?? 'Medium'),
    escapeCsv(STATUS_LABEL[i.status] ?? i.status),
    escapeCsv([
      i.expectedOutcome ? `Resultado esperado: ${i.expectedOutcome}` : '',
      `Esforço: ${i.effort}/5 · Impacto: ${i.expectedImpact}/5 · Risco: ${RISK_LABEL[i.deliveryRisk]}`,
      i.note ? `Notas: ${i.note}` : '',
    ].filter(Boolean).join('\n')),
    escapeCsv('blue-ocean'),
    escapeCsv(i.targetDate ?? ''),
    escapeCsv(i.owner ?? ''),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

function buildLinearCsv(initiatives: ServiceImprovementInitiative[]): string {
  const headers = ['title', 'description', 'priority', 'status', 'estimate', 'dueDate', 'assignee'];
  const priorityMap: Record<number, string> = { 1: 'No priority', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Urgent' };
  const rows = initiatives.map((i) => [
    escapeCsv(i.title),
    escapeCsv([
      i.expectedOutcome ?? '',
      i.note ?? '',
      `Impact ${i.expectedImpact}/5 · Effort ${i.effort}/5 · Risk ${RISK_LABEL[i.deliveryRisk]}`,
    ].filter(Boolean).join(' · ')),
    escapeCsv(priorityMap[i.expectedImpact] ?? 'Medium'),
    escapeCsv(STATUS_LABEL[i.status] ?? i.status),
    escapeCsv(String(i.effort)),
    escapeCsv(i.targetDate ?? ''),
    escapeCsv(i.owner ?? ''),
  ]);
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

function buildNotionMarkdown(initiatives: ServiceImprovementInitiative[], serviceName: string): string {
  const lines: string[] = [
    `# Portfólio de Melhorias — ${serviceName}`,
    '',
    `> Exportado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · ${initiatives.length} iniciativa(s)`,
    '',
    '---',
    '',
  ];

  for (const initiative of initiatives) {
    lines.push(`## ${initiative.title}`);
    lines.push('');
    lines.push(`| Campo | Valor |`);
    lines.push(`|-------|-------|`);
    lines.push(`| Status | ${STATUS_LABEL[initiative.status] ?? initiative.status} |`);
    lines.push(`| Esforço | ${'★'.repeat(initiative.effort)}${'☆'.repeat(5 - initiative.effort)} (${initiative.effort}/5) |`);
    lines.push(`| Impacto esperado | ${'★'.repeat(initiative.expectedImpact)}${'☆'.repeat(5 - initiative.expectedImpact)} (${initiative.expectedImpact}/5) |`);
    lines.push(`| Risco de entrega | ${RISK_LABEL[initiative.deliveryRisk]} |`);
    if (initiative.owner) lines.push(`| Responsável | ${initiative.owner} |`);
    if (initiative.startDate) lines.push(`| Início | ${initiative.startDate} |`);
    if (initiative.targetDate) lines.push(`| Prazo | ${initiative.targetDate} |`);
    if (initiative.progress > 0) lines.push(`| Progresso | ${initiative.progress}% |`);
    if (initiative.expectedOutcome) {
      lines.push('');
      lines.push(`**Resultado esperado:** ${initiative.expectedOutcome}`);
    }
    if (initiative.note) {
      lines.push('');
      lines.push(`**Notas:** ${initiative.note}`);
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function IntegrationExportPanel({
  graph,
  onClose,
}: {
  graph: ServiceGraph;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ExportTarget>('jira');
  const [exported, setExported] = useState<ExportTarget | null>(null);

  const initiatives = Object.values(graph.service.improvementPortfolio?.initiatives ?? {});
  const serviceName = graph.service.name ?? 'Serviço';
  const hasInitiatives = initiatives.length > 0;

  function handleExport() {
    const slug = serviceName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const dateStr = new Date().toISOString().slice(0, 10);

    if (selected === 'jira') {
      const content = buildJiraCsv(initiatives);
      downloadFile(content, `blue-ocean-${slug}-jira-${dateStr}.csv`, 'text/csv;charset=utf-8;');
    } else if (selected === 'linear') {
      const content = buildLinearCsv(initiatives);
      downloadFile(content, `blue-ocean-${slug}-linear-${dateStr}.csv`, 'text/csv;charset=utf-8;');
    } else if (selected === 'notion') {
      const content = buildNotionMarkdown(initiatives, serviceName);
      downloadFile(content, `blue-ocean-${slug}-notion-${dateStr}.md`, 'text/markdown;charset=utf-8;');
    }
    setExported(selected);
  }

  const selectedOption = EXPORT_OPTIONS.find((o) => o.id === selected)!;

  return (
    <div className="bo-c3-export-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bo-c3-export-panel">
        {/* Header */}
        <div className="bo-c3-export-header">
          <div className="bo-c3-export-title">
            <Download size={18} />
            <span>Exportar para Ferramenta</span>
          </div>
          <button type="button" className="bo-c3-export-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="bo-c3-export-body">
          {!hasInitiatives ? (
            <div className="bo-c3-export-empty">
              <Download size={32} />
              <strong>Nenhuma iniciativa no portfólio</strong>
              <p>Adicione iniciativas de melhoria ao portfólio antes de exportar. As iniciativas vêm de oportunidades identificadas no mapa de jornada.</p>
            </div>
          ) : (
            <>
              <p className="bo-c3-export-desc">
                Exporte as <strong>{initiatives.length} iniciativa(s)</strong> do portfólio de melhorias para o formato da sua ferramenta. Os arquivos podem ser importados diretamente ou colados manualmente.
              </p>

              {/* Target selector */}
              <div className="bo-c3-export-options">
                {EXPORT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`bo-c3-export-option${selected === option.id ? ' bo-c3-export-option--selected' : ''}`}
                    onClick={() => { setSelected(option.id); setExported(null); }}
                  >
                    <span className="bo-c3-export-option-icon">{option.icon}</span>
                    <span className="bo-c3-export-option-label">{option.label}</span>
                    <span className="bo-c3-export-option-format">{option.format}</span>
                  </button>
                ))}
              </div>

              {/* Detail card */}
              <div className="bo-c3-export-detail">
                <p className="bo-c3-export-detail-desc">{selectedOption.description}</p>

                {/* Initiative list preview */}
                <div className="bo-c3-export-preview">
                  <div className="bo-c3-export-preview-label">Iniciativas que serão exportadas</div>
                  <ul className="bo-c3-export-initiative-list">
                    {initiatives.slice(0, 6).map((i) => (
                      <li key={i.id} className="bo-c3-export-initiative-item">
                        <span className={`bo-c3-export-status bo-c3-export-status--${i.status}`}></span>
                        <span className="bo-c3-export-initiative-title">{i.title}</span>
                        <span className="bo-c3-export-initiative-meta">{STATUS_LABEL[i.status]}</span>
                      </li>
                    ))}
                    {initiatives.length > 6 && (
                      <li className="bo-c3-export-initiative-more">+{initiatives.length - 6} mais</li>
                    )}
                  </ul>
                </div>

                {selected === 'jira' && (
                  <div className="bo-c3-export-instructions">
                    <strong>Como importar no Jira:</strong>
                    <ol>
                      <li>Acesse <em>Projetos → seu projeto → Issues</em></li>
                      <li>Clique em <em>Importar issues</em></li>
                      <li>Selecione <em>CSV</em> e faça upload do arquivo</li>
                      <li>Mapeie os campos e confirme a importação</li>
                    </ol>
                    <a href="https://support.atlassian.com/jira-software-cloud/docs/import-data-from-a-csv-file/" target="_blank" rel="noopener noreferrer" className="bo-c3-export-link">
                      Documentação do Jira <ExternalLink size={12} />
                    </a>
                  </div>
                )}
                {selected === 'linear' && (
                  <div className="bo-c3-export-instructions">
                    <strong>Como importar no Linear:</strong>
                    <ol>
                      <li>Acesse <em>Settings → Import</em></li>
                      <li>Escolha <em>CSV</em> e faça upload do arquivo</li>
                      <li>Selecione o time e projeto de destino</li>
                      <li>Confirme o mapeamento de campos</li>
                    </ol>
                    <a href="https://linear.app/docs/import-issues" target="_blank" rel="noopener noreferrer" className="bo-c3-export-link">
                      Documentação do Linear <ExternalLink size={12} />
                    </a>
                  </div>
                )}
                {selected === 'notion' && (
                  <div className="bo-c3-export-instructions">
                    <strong>Como importar no Notion:</strong>
                    <ol>
                      <li>Abra o arquivo .md gerado</li>
                      <li>No Notion: <em>Importar → Markdown</em> para criar nova página</li>
                      <li>Ou copie o conteúdo e cole em uma página existente</li>
                      <li>Para transformar em Database, selecione as linhas e converta</li>
                    </ol>
                  </div>
                )}
              </div>

              {/* Export button */}
              <div className="bo-c3-export-actions">
                {exported === selected ? (
                  <div className="bo-c3-export-success">
                    <CheckCircle2 size={16} />
                    <span>Arquivo baixado — verifique seus downloads</span>
                  </div>
                ) : null}
                <button type="button" className="bo-c3-export-btn-primary" onClick={handleExport}>
                  <Download size={15} />
                  Baixar {selectedOption.format}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

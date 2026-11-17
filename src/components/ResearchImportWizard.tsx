import { useRef, useState } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, FileText, Upload, X } from '../design-system/icons';
import type { ResearchMethod, ResearchObservationKind } from '../domain/model';
import type { StudioController } from '../state/useStudioController';
import type { ServiceGraph } from '../domain/model';
import { createResearchObservation, createResearchSource, OBSERVATION_KIND_LABELS, RESEARCH_METHOD_LABELS } from '../services/research-studio';

type WizardStep = 'upload' | 'map' | 'preview' | 'done';

interface CsvRow {
  [key: string]: string;
}

interface ColumnMapping {
  text: string;
  kind: string;
  participant: string;
  observedAt: string;
  context: string;
  sourceTitle: string;
}

const EMPTY_MAPPING: ColumnMapping = {
  text: '',
  kind: '',
  participant: '',
  observedAt: '',
  context: '',
  sourceTitle: '',
};

const KIND_OPTIONS: { value: ResearchObservationKind; label: string }[] = Object.entries(OBSERVATION_KIND_LABELS).map(
  ([value, label]) => ({ value: value as ResearchObservationKind, label }),
);

const METHOD_OPTIONS: { value: ResearchMethod; label: string }[] = Object.entries(RESEARCH_METHOD_LABELS).map(
  ([value, label]) => ({ value: value as ResearchMethod, label }),
);

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.some((v) => v.trim())) {
      const row: CsvRow = {};
      headers.forEach((h, idx) => { row[h] = (values[idx] ?? '').trim(); });
      rows.push(row);
    }
  }
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function guessMapping(headers: string[]): ColumnMapping {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const find = (...candidates: string[]) => headers.find((h) => candidates.some((c) => normalize(h).includes(normalize(c)))) ?? '';
  return {
    text: find('texto', 'observacao', 'observation', 'text', 'fala', 'nota', 'note', 'registro', 'conteudo', 'content', 'descricao', 'description'),
    kind: find('tipo', 'kind', 'type', 'nivel', 'level', 'categoria', 'category'),
    participant: find('participante', 'participant', 'entrevistado', 'respondente', 'usuario', 'user', 'cliente', 'customer'),
    observedAt: find('data', 'date', 'quando', 'when', 'observedat', 'created'),
    context: find('contexto', 'context', 'situacao', 'situation', 'onde', 'where', 'cenario'),
    sourceTitle: find('fonte', 'source', 'material', 'titulo', 'title', 'origin', 'origem'),
  };
}

export function ResearchImportWizard({
  graph,
  studio,
  onClose,
}: {
  graph: ServiceGraph;
  studio: StudioController;
  onClose: () => void;
}) {
  const { setGraph, showToast } = studio;
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<WizardStep>('upload');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [sourceName, setSourceName] = useState('Importação CSV');
  const [sourceMethod, setSourceMethod] = useState<ResearchMethod>('survey');
  const [defaultKind, setDefaultKind] = useState<ResearchObservationKind>('said');
  const [importCount, setImportCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setParseError('Envie um arquivo .csv');
      return;
    }
    setFileName(file.name);
    setParseError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCsv(text);
      if (h.length === 0 || r.length === 0) {
        setParseError('Arquivo vazio ou sem linhas válidas.');
        return;
      }
      setHeaders(h);
      setRows(r);
      setMapping(guessMapping(h));
      setSourceName(file.name.replace(/\.csv$/i, ''));
      setStep('map');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function previewRows() {
    return rows.slice(0, 5).map((row) => ({
      text: mapping.text ? row[mapping.text] : '',
      kind: mapping.kind ? (row[mapping.kind] as ResearchObservationKind) || defaultKind : defaultKind,
      participant: mapping.participant ? row[mapping.participant] : '',
      observedAt: mapping.observedAt ? row[mapping.observedAt] : '',
      context: mapping.context ? row[mapping.context] : '',
      sourceTitle: mapping.sourceTitle ? row[mapping.sourceTitle] : '',
    }));
  }

  function handleImport() {
    let g = graph;
    const now = new Date().toISOString();

    // Create a single research source for the whole import
    const sourceResult = createResearchSource({
      graph: g,
      title: sourceName,
      type: sourceMethod,
      now,
    });
    g = sourceResult.graph;
    const sourceId = sourceResult.sourceId;

    let count = 0;
    for (const row of rows) {
      const text = (mapping.text ? row[mapping.text] : '').trim();
      if (!text) continue;

      const rawKind = mapping.kind ? row[mapping.kind] : '';
      const kind: ResearchObservationKind =
        (Object.keys(OBSERVATION_KIND_LABELS) as ResearchObservationKind[]).includes(rawKind as ResearchObservationKind)
          ? (rawKind as ResearchObservationKind)
          : defaultKind;

      const result = createResearchObservation({
        graph: g,
        text,
        kind,
        sourceId,
        participant: mapping.participant ? row[mapping.participant] : undefined,
        observedAt: mapping.observedAt ? row[mapping.observedAt] : undefined,
        context: mapping.context ? row[mapping.context] : undefined,
        now,
      });
      g = result.graph;
      count++;
    }

    setGraph(() => g, `C3.2: importar ${count} observações de pesquisa`);
    setImportCount(count);
    setStep('done');
    showToast?.(`${count} observações importadas com sucesso`);
  }

  const colOption = (placeholder: string) => (
    <option value="">{placeholder}</option>
  );

  return (
    <div className="bo-c3-import-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bo-c3-import-panel">
        {/* Header */}
        <div className="bo-c3-import-header">
          <div className="bo-c3-import-title">
            <Upload size={18} />
            <span>Importar Pesquisa</span>
            {step !== 'upload' && (
              <span className="bo-c3-import-step-badge">
                {step === 'map' ? 'Mapeamento' : step === 'preview' ? 'Prévia' : 'Concluído'}
              </span>
            )}
          </div>
          <button type="button" className="bo-c3-import-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="bo-c3-import-body">
            <p className="bo-c3-import-desc">
              Importe observações de pesquisa a partir de um arquivo CSV. Funciona com exportações do Typeform, NPS, Google Forms e qualquer planilha com colunas de texto.
            </p>
            <div
              className={`bo-c3-import-dropzone${isDragging ? ' bo-c3-import-dropzone--over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <FileText size={32} />
              <span>Arraste um arquivo CSV aqui</span>
              <span className="bo-c3-import-dropzone-sub">ou clique para selecionar</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
            </div>
            {parseError && (
              <div className="bo-c3-import-error">
                <AlertCircle size={14} />
                <span>{parseError}</span>
              </div>
            )}
            <p className="bo-c3-import-hint">
              Formato esperado: primeira linha com cabeçalhos, colunas separadas por vírgula, encoding UTF-8.
            </p>
          </div>
        )}

        {/* Step: Map */}
        {step === 'map' && (
          <div className="bo-c3-import-body">
            <div className="bo-c3-import-file-badge">
              <FileText size={14} />
              <span>{fileName}</span>
              <span className="bo-c3-import-file-count">{rows.length} linhas</span>
            </div>

            <div className="bo-c3-import-section-label">Fonte de pesquisa</div>
            <div className="bo-c3-import-row">
              <label className="bo-c3-import-field">
                <span>Nome da fonte</span>
                <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="Ex: Pesquisa NPS Julho" />
              </label>
              <label className="bo-c3-import-field">
                <span>Método</span>
                <select value={sourceMethod} onChange={(e) => setSourceMethod(e.target.value as ResearchMethod)}>
                  {METHOD_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="bo-c3-import-section-label">Mapear colunas do CSV</div>
            <div className="bo-c3-import-grid">
              <label className="bo-c3-import-field bo-c3-import-field--required">
                <span>Texto da observação <em>*</em></span>
                <select value={mapping.text} onChange={(e) => setMapping({ ...mapping, text: e.target.value })}>
                  {colOption('— selecione —')}
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <label className="bo-c3-import-field">
                <span>Nível (kind)</span>
                <select value={mapping.kind} onChange={(e) => setMapping({ ...mapping, kind: e.target.value })}>
                  {colOption('— usar padrão —')}
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <label className="bo-c3-import-field">
                <span>Participante</span>
                <select value={mapping.participant} onChange={(e) => setMapping({ ...mapping, participant: e.target.value })}>
                  {colOption('— ignorar —')}
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <label className="bo-c3-import-field">
                <span>Data</span>
                <select value={mapping.observedAt} onChange={(e) => setMapping({ ...mapping, observedAt: e.target.value })}>
                  {colOption('— ignorar —')}
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <label className="bo-c3-import-field">
                <span>Contexto</span>
                <select value={mapping.context} onChange={(e) => setMapping({ ...mapping, context: e.target.value })}>
                  {colOption('— ignorar —')}
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <label className="bo-c3-import-field">
                <span>Nível padrão</span>
                <select value={defaultKind} onChange={(e) => setDefaultKind(e.target.value as ResearchObservationKind)}>
                  {KIND_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="bo-c3-import-actions">
              <button type="button" className="bo-c3-import-btn-secondary" onClick={() => setStep('upload')}>Voltar</button>
              <button
                type="button"
                className="bo-c3-import-btn-primary"
                disabled={!mapping.text}
                onClick={() => setStep('preview')}
              >
                Ver prévia <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <div className="bo-c3-import-body">
            <p className="bo-c3-import-desc">
              Prévia das primeiras {Math.min(5, rows.length)} de {rows.length} linhas. Registros sem texto serão ignorados.
            </p>
            <div className="bo-c3-import-preview-table-wrap">
              <table className="bo-c3-import-preview-table">
                <thead>
                  <tr>
                    <th>Texto</th>
                    <th>Nível</th>
                    <th>Participante</th>
                    <th>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows().map((row, i) => (
                    <tr key={i} className={!row.text ? 'bo-c3-import-preview-empty' : ''}>
                      <td className="bo-c3-import-preview-text">{row.text || <em>—</em>}</td>
                      <td><span className="bo-c3-import-kind-badge">{row.kind}</span></td>
                      <td>{row.participant || <em>—</em>}</td>
                      <td>{row.observedAt || <em>—</em>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bo-c3-import-summary">
              <strong>{rows.filter((r) => mapping.text ? r[mapping.text]?.trim() : false).length}</strong> observações serão importadas para a fonte <strong>{sourceName}</strong>
            </div>
            <div className="bo-c3-import-actions">
              <button type="button" className="bo-c3-import-btn-secondary" onClick={() => setStep('map')}>Voltar</button>
              <button type="button" className="bo-c3-import-btn-primary" onClick={handleImport}>
                Importar agora <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <div className="bo-c3-import-body bo-c3-import-body--done">
            <CheckCircle2 size={48} className="bo-c3-import-done-icon" />
            <div className="bo-c3-import-done-title">{importCount} observações importadas</div>
            <p className="bo-c3-import-done-desc">
              Todas as observações foram adicionadas ao campo de pesquisa na fonte <strong>{sourceName}</strong>.
              Acesse a aba <em>Campo e materiais</em> no Research Studio para visualizá-las.
            </p>
            <button type="button" className="bo-c3-import-btn-primary" onClick={onClose}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

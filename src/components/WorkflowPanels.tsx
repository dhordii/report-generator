import { Fragment, useState } from 'react';
import type {
  AnalysisConfig,
  AnalysisResult,
  DataCorrection,
  DataIssue,
  OrderField,
  OrderStatus,
  ParsedWorkbook,
  ProductField,
} from '../domain/types';
import { orderFields, productFields } from '../domain/types';
import { WorkbookIcon } from './WorkbookIcon';

interface MappingPanelProps {
  orders: ParsedWorkbook;
  products: ParsedWorkbook;
  config: AnalysisConfig;
  busy: boolean;
  onConfigChange: (config: AnalysisConfig) => void;
  onAnalyze: () => void;
}

function MappingSelect<T extends string>({
  field,
  headers,
  value,
  onChange,
}: {
  field: T;
  headers: string[];
  value: string;
  onChange: (field: T, header: string) => void;
}) {
  return (
    <label className="mapping-row">
      <span>{field}</span>
      <select value={value} onChange={(event) => onChange(field, event.target.value)}>
        <option value="">Choose a column…</option>
        {headers.map((header) => <option key={header} value={header}>{header}</option>)}
      </select>
    </label>
  );
}

function MappingPanel({ orders, products, config, busy, onConfigChange, onAnalyze }: MappingPanelProps) {
  const orderSheet = orders.sheets.find((sheet) => sheet.name === config.ordersSheet) ?? orders.sheets[0]!;
  const productSheet = products.sheets.find((sheet) => sheet.name === config.productsSheet) ?? products.sheets[0]!;

  const setOrderMapping = (field: OrderField, header: string) => onConfigChange({ ...config, orderMapping: { ...config.orderMapping, [field]: header } });
  const setProductMapping = (field: ProductField, header: string) => onConfigChange({ ...config, productMapping: { ...config.productMapping, [field]: header } });
  const allMapped = Object.values(config.orderMapping).every(Boolean)
    && Object.values(config.productMapping).every(Boolean)
    && Object.values(config.statusMapping).every(Boolean);

  return (
    <section className="workflow-panel mapping-panel" aria-labelledby="mapping-title">
      <header className="workflow-panel__header">
        <div>
          <h2 id="mapping-title">Map source columns</h2>
          <p>Exact header matches are preselected. Nothing else is guessed.</p>
        </div>
        <span className="state-badge state-badge--info">Explicit mapping</span>
      </header>

      <div className="mapping-layout">
        <section className="mapping-card">
          <div className="mapping-card__title">
            <div><h3>Orders workbook</h3><p>{orders.fileName} · {orderSheet.rows.length.toLocaleString('en-US')} rows</p></div>
            {orders.sheets.length > 1 && (
              <label>Worksheet<select value={config.ordersSheet} onChange={(event) => onConfigChange({ ...config, ordersSheet: event.target.value })}>{orders.sheets.map((sheet) => <option key={sheet.name}>{sheet.name}</option>)}</select></label>
            )}
          </div>
          <div className="mapping-list">
            {orderFields.map((field) => <MappingSelect key={field} field={field} headers={orderSheet.headers} value={config.orderMapping[field]} onChange={setOrderMapping} />)}
          </div>
        </section>

        <section className="mapping-card">
          <div className="mapping-card__title">
            <div><h3>Products workbook</h3><p>{products.fileName} · {productSheet.rows.length.toLocaleString('en-US')} rows</p></div>
            {products.sheets.length > 1 && (
              <label>Worksheet<select value={config.productsSheet} onChange={(event) => onConfigChange({ ...config, productsSheet: event.target.value })}>{products.sheets.map((sheet) => <option key={sheet.name}>{sheet.name}</option>)}</select></label>
            )}
          </div>
          <div className="mapping-list mapping-list--products">
            {productFields.map((field) => <MappingSelect key={field} field={field} headers={productSheet.headers} value={config.productMapping[field]} onChange={setProductMapping} />)}
          </div>

          <div className="format-grid">
            <label>Text number format<select value={config.textNumberFormat} onChange={(event) => onConfigChange({ ...config, textNumberFormat: event.target.value as AnalysisConfig['textNumberFormat'] })}><option value="us">1,234.56</option><option value="eu">1 234,56</option></select></label>
            <label>Text date format<select value={config.textDateFormat} onChange={(event) => onConfigChange({ ...config, textDateFormat: event.target.value as AnalysisConfig['textDateFormat'] })}><option value="yyyy-mm-dd">YYYY-MM-DD</option><option value="mm/dd/yyyy">MM/DD/YYYY</option><option value="dd/mm/yyyy">DD/MM/YYYY</option></select></label>
          </div>

          <div className="status-mapping">
            <h3>Status mapping</h3>
            <p>Only Completed contributes to financial KPIs.</p>
            {Object.entries(config.statusMapping).map(([source, target]) => (
              <label className="mapping-row" key={source}>
                <span>{source}</span>
                <select value={target} onChange={(event) => onConfigChange({ ...config, statusMapping: { ...config.statusMapping, [source]: event.target.value as OrderStatus | '' } })}>
                  <option value="">Choose status…</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Pending">Pending</option>
                </select>
              </label>
            ))}
          </div>
        </section>
      </div>

      <footer className="workflow-actions">
        <p>{allMapped ? 'All required mappings are ready.' : 'Complete every required field and source status.'}</p>
        <button className="button button--primary action-button" type="button" disabled={!allMapped || busy} onClick={onAnalyze}>{busy ? 'Validating…' : 'Validate data'}</button>
      </footer>
    </section>
  );
}

interface ReviewPanelProps {
  result: AnalysisResult;
  corrections: DataCorrection[];
  confirmed: boolean;
  busy: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
  onBack: () => void;
  onGenerate: () => void;
  onSaveCorrection: (correction: DataCorrection) => void;
  onUndoCorrection: (correction: DataCorrection) => void;
}

const severityOrder: Record<DataIssue['severity'], number> = { blocker: 0, error: 1, warning: 2, info: 3 };

function correctionKey(correction: Pick<DataCorrection, 'dataset' | 'sourceRow' | 'field'>): string {
  return `${correction.dataset}:${correction.sourceRow}:${correction.field}`;
}

function ReviewPanel({ result, corrections, confirmed, busy, onConfirmedChange, onBack, onGenerate, onSaveCorrection, onUndoCorrection }: ReviewPanelProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const sortedIssues = [...result.issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const canGenerate = result.blockers === 0 && (!result.requiresConfirmation || confirmed);
  const correctionMap = new Map(corrections.map((correction) => [correctionKey(correction), correction]));

  const startEditing = (item: DataIssue) => {
    if (item.sourceRow === undefined || !item.field) return;
    const key = correctionKey({ dataset: item.dataset, sourceRow: item.sourceRow, field: item.field });
    setEditingKey(key);
    setDraftValue(correctionMap.get(key)?.value ?? item.correctedValue ?? item.originalValue ?? '');
  };

  const saveEditing = (item: DataIssue) => {
    if (item.sourceRow === undefined || !item.field) return;
    onSaveCorrection({ dataset: item.dataset, sourceRow: item.sourceRow, field: item.field, value: draftValue });
    setEditingKey(null);
  };

  return (
    <section className="workflow-panel review-panel" aria-labelledby="review-title">
      <header className="workflow-panel__header">
        <div><h2 id="review-title">Review validation results</h2><p>Nothing was silently corrected or removed.</p></div>
        <span className={`state-badge ${result.blockers > 0 ? 'state-badge--danger' : result.issues.length > 0 ? 'state-badge--warning' : 'state-badge--success'}`}>
          {result.blockers > 0 ? `${result.blockers} blocker${result.blockers === 1 ? '' : 's'}` : `${result.issues.length} issue${result.issues.length === 1 ? '' : 's'}`}
        </span>
      </header>

      <dl className="review-metrics">
        <div><dt>Valid rows</dt><dd>{result.processedRows.length.toLocaleString('en-US')}</dd></div>
        <div><dt>Excluded order rows</dt><dd>{result.summary.excludedOrderRows.toLocaleString('en-US')}</dd></div>
        <div><dt>Excluded product rows</dt><dd>{result.summary.excludedProductRows.toLocaleString('en-US')}</dd></div>
        <div><dt>Session corrections</dt><dd>{corrections.length.toLocaleString('en-US')}</dd></div>
      </dl>

      <div className="correction-note">
        <strong>Fix individual values without changing your files.</strong>
        <span>Save reruns the full validation. Unresolved error rows stay excluded from the report and KPIs; every correction and exclusion remains in the audit sheet.</span>
      </div>

      <div className="issues-table-wrap" role="region" aria-label="Data issues" tabIndex={0}>
        <table className="issues-table">
          <thead><tr><th>Severity</th><th>Source</th><th>Field</th><th>Value</th><th>Issue</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {sortedIssues.length === 0 ? <tr><td colSpan={7}>No data issues were detected.</td></tr> : sortedIssues.map((item, index) => {
              const canEdit = item.editable && item.severity === 'error' && item.sourceRow !== undefined && Boolean(item.field);
              const key = item.sourceRow !== undefined && item.field
                ? correctionKey({ dataset: item.dataset, sourceRow: item.sourceRow, field: item.field })
                : `${item.dataset}:${item.code}:${index}`;
              const correction = correctionMap.get(key);
              const isEditing = editingKey === key;
              const currentValue = correction?.value ?? item.correctedValue ?? item.originalValue ?? '—';
              const status = item.resolution === 'corrected' ? 'Corrected' : item.resolution === 'excluded' ? 'Excluded' : 'Review';
              return (
                <Fragment key={`${item.code}-${key}-${index}`}>
                  <tr>
                    <td><span className={`severity severity--${item.severity}`}>{item.severity}</span></td>
                    <td><strong>{item.dataset}</strong><small>{item.sourceFile ?? '—'} · row {item.sourceRow ?? '—'}</small></td>
                    <td><code>{item.field ?? '—'}</code></td>
                    <td className="issue-value"><span>{currentValue || '(blank)'}</span>{correction && <small>Original: {item.originalValue || '(blank)'}</small>}</td>
                    <td>{item.message}</td>
                    <td><span className={`resolution resolution--${item.resolution ?? 'review'}`}>{status}</span></td>
                    <td className="issue-actions">
                      <span>{item.action}</span>
                      <span className="issue-actions__buttons">
                        {canEdit && <button className="button button--table" type="button" disabled={busy} onClick={() => startEditing(item)}>{correction ? 'Edit correction' : 'Edit value'}</button>}
                        {correction && <button className="button button--table button--table-muted" type="button" disabled={busy} onClick={() => onUndoCorrection(correction)}>Undo</button>}
                      </span>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr className="correction-editor-row">
                      <td colSpan={7}>
                        <div className="correction-editor">
                          <label>
                            <span>Replacement for {item.dataset} row {item.sourceRow}, {item.field}</span>
                            {item.field === 'status' ? (
                              <select autoFocus value={draftValue} onChange={(event) => setDraftValue(event.target.value)}>
                                <option value="">Choose status…</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                                <option value="Pending">Pending</option>
                              </select>
                            ) : <input autoFocus value={draftValue} onChange={(event) => setDraftValue(event.target.value)} />}
                          </label>
                          <span className="correction-editor__original">Original: <code>{item.originalValue || '(blank)'}</code></span>
                          <div className="correction-editor__actions">
                            <button className="button button--secondary button--compact" type="button" disabled={busy} onClick={() => setEditingKey(null)}>Cancel</button>
                            <button className="button button--primary button--compact" type="button" disabled={busy} onClick={() => saveEditing(item)}>{busy ? 'Revalidating…' : 'Save & revalidate'}</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {result.requiresConfirmation && result.blockers === 0 && (
        <label className="confirmation-box">
          <input type="checkbox" checked={confirmed} onChange={(event) => onConfirmedChange(event.target.checked)} />
          <span><strong>Generate from valid rows</strong><small>I reviewed the exclusions, cached-formula warnings, and duplicate handling recorded above.</small></span>
        </label>
      )}

      <footer className="workflow-actions">
        <button className="button button--secondary action-button" type="button" onClick={onBack}>Back to mapping</button>
        <button className="button button--primary action-button" type="button" disabled={!canGenerate || busy} onClick={onGenerate}>{busy ? 'Building workbook…' : 'Generate Excel report'}</button>
      </footer>
    </section>
  );
}

interface ReportPanelProps {
  result: AnalysisResult;
  downloadUrl: string | null;
  busy: boolean;
  onReset: () => void;
}

function usd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function ReportPanel({ result, downloadUrl, busy, onReset }: ReportPanelProps) {
  return (
    <section className="workflow-panel report-panel" aria-labelledby="report-title">
      <header className="workflow-panel__header">
        <div><h2 id="report-title">Your sales report is ready</h2><p>Six worksheets, five embedded PNG charts, and a complete audit trail.</p></div>
        <span className="state-badge state-badge--success">Generated locally</span>
      </header>

      <dl className="report-metrics">
        <div><dt>Revenue</dt><dd>{usd(result.summary.revenue)}</dd></div>
        <div><dt>Estimated profit</dt><dd>{usd(result.summary.estimatedProfit)}</dd></div>
        <div><dt>Completed orders</dt><dd>{result.summary.completedOrders.toLocaleString('en-US')}</dd></div>
        <div><dt>Data issues</dt><dd>{result.issues.length.toLocaleString('en-US')}</dd></div>
      </dl>

      <div className="report-delivery">
        <div className="report-file-mark"><WorkbookIcon /></div>
        <div><h3>Sales Report.xlsx</h3><p>Overview · Products · Customers · Monthly Trends · Data Issues · Processed Data</p></div>
        {downloadUrl ? <a className="button button--primary action-button" href={downloadUrl} download="Sales Report.xlsx">Download report</a> : <button className="button button--primary action-button" type="button" disabled>{busy ? 'Preparing download…' : 'Download unavailable'}</button>}
      </div>

      <div className="narrative-block">
        <h3>Factual summary</h3>
        <ul>{result.narrative.map((line) => <li key={line}>{line}</li>)}</ul>
      </div>

      <footer className="workflow-actions">
        <p>The report is a static snapshot. Source formulas were not recalculated.</p>
        <button className="button button--secondary action-button" type="button" onClick={onReset}>Start over</button>
      </footer>
    </section>
  );
}

export { MappingPanel, ReportPanel, ReviewPanel };
export type { MappingPanelProps, ReportPanelProps, ReviewPanelProps };

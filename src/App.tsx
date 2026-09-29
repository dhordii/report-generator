import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { MappingPanel, ReportPanel, ReviewPanel } from './components/WorkflowPanels';
import { WorkbookIcon } from './components/WorkbookIcon';
import { renderReportCharts } from './domain/chartRenderer';
import { collectSourceStatuses, suggestOrderMapping, suggestProductMapping, suggestStatusMapping } from './domain/processing';
import { createSampleWorkbooks } from './domain/sampleData';
import type { AnalysisConfig, AnalysisResult, DataCorrection, DatasetKind, ParsedWorkbook } from './domain/types';
import { analyzeInWorker, generateInWorker, parseWorkbookFile } from './workers/client';

type Theme = 'light' | 'dark';
type Step = 'files' | 'map' | 'review' | 'report';

interface FileSelection {
  file: File | null;
  name: string;
  size: number;
}

interface IconProps {
  children: ReactNode;
  size?: number;
}

function Icon({ children, size = 20 }: IconProps) {
  return <svg aria-hidden="true" className="icon" fill="none" height={size} viewBox="0 0 24 24" width={size}>{children}</svg>;
}

function LockIcon() {
  return <Icon size={16}><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" /></Icon>;
}

function FileIcon() {
  return <Icon size={24}><path d="M7 3h7l4 4v14H7z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /><path d="M14 3v5h5M10 13h5M10 17h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></Icon>;
}

function SheetIcon() {
  return <Icon size={19}><rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.7" /><path d="M8 8h8M8 12h8M8 16h8M11 8v8" stroke="currentColor" strokeWidth="1.4" /></Icon>;
}

function ThemeIcon({ theme }: { theme: Theme }) {
  return theme === 'light'
    ? <Icon size={17}><circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.7" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></Icon>
    : <Icon size={17}><path d="M20 15.2A8 8 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" /></Icon>;
}

interface FileIntakeProps {
  selection: FileSelection | null;
  kind: DatasetKind;
  onChange: (kind: DatasetKind, file: File | null) => void;
}

function FileIntake({ selection, kind, onChange }: FileIntakeProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const title = kind === 'orders' ? 'Orders workbook' : 'Products workbook';

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(kind, event.target.files?.[0] ?? null);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    onChange(kind, event.dataTransfer.files[0] ?? null);
  };

  const handlePickerKeyDown = (event: KeyboardEvent<HTMLLabelElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    inputRef.current?.click();
  };

  return (
    <section
      className={`file-intake file-intake--${kind}`}
      aria-labelledby={`${inputId}-title`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <span className="file-intake__icon"><FileIcon /></span>
      <span className="file-intake__copy">
        <strong id={`${inputId}-title`}>{title}</strong>
        <small>{selection?.name ?? 'Choose .xlsx or drag and drop'}</small>
        <span>{selection ? `${Math.max(1, Math.round(selection.size / 1024)).toLocaleString('en-US')} KB` : '10 MB max · .xlsx only'}</span>
      </span>
      <label className="button button--quiet" htmlFor={inputId} role="button" tabIndex={0} onKeyDown={handlePickerKeyDown}>{selection ? 'Replace' : 'Choose .xlsx'}</label>
      <input ref={inputRef} id={inputId} accept=".xlsx" type="file" tabIndex={-1} onChange={handleChange} />
    </section>
  );
}

const workflowSteps: ReadonlyArray<{ step: Step; label: string }> = [
  { step: 'files', label: 'Files' },
  { step: 'map', label: 'Map columns' },
  { step: 'review', label: 'Review issues' },
  { step: 'report', label: 'Download report' },
];

const worksheetRows = [
  ['Overview', 'Key metrics and charts'], ['Products', 'Product performance'], ['Customers', 'Customer breakdown'],
  ['Monthly Trends', 'Revenue and orders'], ['Data Issues', 'Validation audit trail'], ['Processed Data', 'Rows used for reporting'],
] as const;

const productRows = [
  ['1', 'Wireless Headphones', 'WH-001', '1,024', '$153,600', '12.3%'], ['2', 'Mechanical Keyboard', 'KB-004', '892', '$124,880', '10.0%'],
  ['3', 'USB-C Hub', 'UH-002', '765', '$91,800', '7.4%'], ['4', '27” 4K Monitor', 'MN-027', '421', '$84,200', '6.7%'],
  ['5', 'Ergonomic Chair', 'CH-100', '312', '$74,880', '6.0%'],
] as const;

const stepIndex: Record<Step, number> = { files: 0, map: 1, review: 2, report: 3 };

function RevenueChart() {
  const points = [118, 112, 103, 94, 77, 77, 60, 45, 37, 17, 27, 34];
  const horizontalGrid = [[18, '$200K'], [45, '$150K'], [72, '$100K'], [99, '$50K'], [126, '$0']] as const;
  const verticalGrid = [60, 136, 212, 288, 364, 440, 516, 592, 668, 744, 820, 900];
  return (
    <svg className="revenue-chart" role="img" aria-label="Synthetic monthly revenue line chart" viewBox="0 0 930 150">
      <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2563eb" stopOpacity="0.16" /><stop offset="1" stopColor="#2563eb" stopOpacity="0" /></linearGradient></defs>
      {horizontalGrid.map(([y, label]) => <g key={label}><text x="0" y={y + 3} className="chart-axis-label">{label}</text><line x1="58" y1={y} x2="910" y2={y} className="chart-grid" /></g>)}
      {verticalGrid.map((x) => <line key={x} x1={x} y1="18" x2={x} y2="126" className="chart-grid chart-grid--vertical" />)}
      <path d="M60 118L136 112L212 103L288 94L364 77L440 77L516 60L592 45L668 37L744 17L820 27L900 34L900 132L60 132Z" fill="url(#chartFill)" />
      <path d="M60 118L136 112L212 103L288 94L364 77L440 77L516 60L592 45L668 37L744 17L820 27L900 34" className="chart-line" />
      {[60, 136, 212, 288, 364, 440, 516, 592, 668, 744, 820, 900].map((x, index) => <circle key={x} cx={x} cy={points[index]} r="3" className="chart-dot" />)}
    </svg>
  );
}

function createConfig(orders: ParsedWorkbook, products: ParsedWorkbook): AnalysisConfig {
  const orderSheet = orders.sheets[0]!;
  const productSheet = products.sheets[0]!;
  const orderMapping = suggestOrderMapping(orderSheet.headers);
  return {
    ordersSheet: orderSheet.name,
    productsSheet: productSheet.name,
    orderMapping,
    productMapping: suggestProductMapping(productSheet.headers),
    statusMapping: suggestStatusMapping(collectSourceStatuses(orderSheet, orderMapping)),
    textNumberFormat: 'us',
    textDateFormat: 'yyyy-mm-dd',
  };
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const [step, setStep] = useState<Step>('files');
  const [ordersSelection, setOrdersSelection] = useState<FileSelection | null>(null);
  const [productsSelection, setProductsSelection] = useState<FileSelection | null>(null);
  const [ordersWorkbook, setOrdersWorkbook] = useState<ParsedWorkbook | null>(null);
  const [productsWorkbook, setProductsWorkbook] = useState<ParsedWorkbook | null>(null);
  const [config, setConfig] = useState<AnalysisConfig | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [corrections, setCorrections] = useState<DataCorrection[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);

  const clearAnalysis = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setAnalysis(null);
    setConfirmed(false);
  };

  const handleFileChange = (kind: DatasetKind, file: File | null) => {
    setError(null);
    if (file && !file.name.toLowerCase().endsWith('.xlsx')) {
      setError('Choose an .xlsx workbook. Older .xls files are not supported.');
      return;
    }
    if (file && file.size > 10 * 1024 * 1024) {
      setError(`${file.name} is larger than the 10 MB per-file limit.`);
      return;
    }
    const selection = file ? { file, name: file.name, size: file.size } : null;
    if (kind === 'orders') {
      setOrdersSelection(selection);
      setOrdersWorkbook(null);
    } else {
      setProductsSelection(selection);
      setProductsWorkbook(null);
    }
    setConfig(null);
    setCorrections([]);
    clearAnalysis();
    if (step !== 'files') setStep('files');
  };

  const openMapping = (orders: ParsedWorkbook, products: ParsedWorkbook) => {
    setOrdersWorkbook(orders);
    setProductsWorkbook(products);
    setConfig(createConfig(orders, products));
    setCorrections([]);
    clearAnalysis();
    setStep('map');
  };

  const loadSampleData = () => {
    setError(null);
    const sample = createSampleWorkbooks();
    setOrdersSelection({ file: null, name: sample.orders.fileName, size: 248_000 });
    setProductsSelection({ file: null, name: sample.products.fileName, size: 96_000 });
    openMapping(sample.orders, sample.products);
  };

  const continueFromFiles = async () => {
    if (!ordersSelection?.file || !productsSelection?.file) return;
    setBusy(true);
    setError(null);
    try {
      const [orders, products] = await Promise.all([
        parseWorkbookFile('orders', ordersSelection.file),
        parseWorkbookFile('products', productsSelection.file),
      ]);
      openMapping(orders, products);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The workbooks could not be read.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfigChange = (next: AnalysisConfig) => {
    if (!ordersWorkbook || !productsWorkbook || !config) return;
    let resolved = next;
    if (next.ordersSheet !== config.ordersSheet) {
      const sheet = ordersWorkbook.sheets.find((candidate) => candidate.name === next.ordersSheet)!;
      const orderMapping = suggestOrderMapping(sheet.headers);
      resolved = { ...resolved, orderMapping, statusMapping: suggestStatusMapping(collectSourceStatuses(sheet, orderMapping)) };
    }
    if (next.productsSheet !== config.productsSheet) {
      const sheet = productsWorkbook.sheets.find((candidate) => candidate.name === next.productsSheet)!;
      resolved = { ...resolved, productMapping: suggestProductMapping(sheet.headers) };
    }
    if (next.orderMapping.status !== config.orderMapping.status) {
      const sheet = ordersWorkbook.sheets.find((candidate) => candidate.name === next.ordersSheet)!;
      resolved = { ...resolved, statusMapping: suggestStatusMapping(collectSourceStatuses(sheet, next.orderMapping)) };
    }
    clearAnalysis();
    setCorrections([]);
    setConfig(resolved);
  };

  const validateData = async () => {
    if (!ordersWorkbook || !productsWorkbook || !config) return;
    setBusy(true);
    setError(null);
    try {
      const result = await analyzeInWorker(ordersWorkbook, productsWorkbook, config, corrections);
      setAnalysis(result);
      setConfirmed(false);
      setStep('review');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Validation failed.');
    } finally {
      setBusy(false);
    }
  };

  const reanalyzeWithCorrections = async (nextCorrections: DataCorrection[]) => {
    if (!ordersWorkbook || !productsWorkbook || !config) return;
    setBusy(true);
    setError(null);
    setConfirmed(false);
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    try {
      const result = await analyzeInWorker(ordersWorkbook, productsWorkbook, config, nextCorrections);
      setCorrections(nextCorrections);
      setAnalysis(result);
      setStep('review');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The correction could not be revalidated.');
    } finally {
      setBusy(false);
    }
  };

  const saveCorrection = (correction: DataCorrection) => {
    const nextCorrections = corrections.filter((item) => !(
      item.dataset === correction.dataset
      && item.sourceRow === correction.sourceRow
      && item.field === correction.field
    ));
    void reanalyzeWithCorrections([...nextCorrections, correction]);
  };

  const undoCorrection = (correction: DataCorrection) => {
    const nextCorrections = corrections.filter((item) => !(
      item.dataset === correction.dataset
      && item.sourceRow === correction.sourceRow
      && item.field === correction.field
    ));
    void reanalyzeWithCorrections(nextCorrections);
  };

  const generateReport = async () => {
    if (!analysis || analysis.blockers > 0) return;
    setBusy(true);
    setError(null);
    setStep('report');
    try {
      const images = await renderReportCharts(analysis);
      const buffer = await generateInWorker(analysis, images);
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The Excel report could not be generated.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setOrdersSelection(null);
    setProductsSelection(null);
    setOrdersWorkbook(null);
    setProductsWorkbook(null);
    setConfig(null);
    setAnalysis(null);
    setCorrections([]);
    setConfirmed(false);
    setError(null);
    setStep('files');
  };

  const readyForParse = Boolean(ordersSelection?.file && productsSelection?.file);
  const currentStep = stepIndex[step];
  const stepAvailability: Record<Step, boolean> = {
    files: true,
    map: Boolean(ordersWorkbook && productsWorkbook && config),
    review: Boolean(analysis),
    report: Boolean(analysis && downloadUrl),
  };

  const navigateToStep = (target: Step) => {
    if (busy || target === step || !stepAvailability[target]) return;
    setError(null);
    setStep(target);
  };

  return (
    <main className="app-shell">
      <div className={`comp-frame ${step !== 'files' ? 'comp-frame--workflow' : ''}`}>
        <header className="utility-header r-utility-header">
          <button className="wordmark wordmark--button" type="button" onClick={reset}>REPORT GENERATOR</button>
          <nav aria-label="Utilities">
            <span className="privacy-mini"><LockIcon /> Files stay in your browser</span>
            <a href="#how-it-works">Help</a>
            <button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')}>
              <ThemeIcon theme={theme} /><span className="theme-toggle__track" aria-hidden="true"><span /></span>
            </button>
          </nav>
        </header>

        <section className="intro" id="generator">
          <h1 className="r-page-heading">Create a sales report from your Excel files.</h1>
          <p className="r-page-subtitle">Upload your Orders.xlsx and Products.xlsx and we’ll turn them into an auditable sales workbook, entirely in your browser.</p>
        </section>

        <section className="intake-strip" aria-label="Workbook inputs">
          <div className="r-orders-intake"><FileIntake selection={ordersSelection} kind="orders" onChange={handleFileChange} /></div>
          <div className="r-products-intake"><FileIntake selection={productsSelection} kind="products" onChange={handleFileChange} /></div>
          <button className="button button--primary r-sample-action" type="button" onClick={loadSampleData}>Try sample data</button>
        </section>

        <ol className="progress-rail r-progress-rail" aria-label="Report workflow" id="how-it-works">
          {workflowSteps.map(({ step: target, label }, index) => {
            const isCurrent = index === currentStep;
            const isAvailable = stepAvailability[target] && !busy;
            return (
              <li className={`${isCurrent ? 'is-active' : index < currentStep ? 'is-complete' : ''} ${isAvailable && !isCurrent ? 'is-available' : ''}`.trim()} key={label}>
                <button
                  className="progress-step-button"
                  type="button"
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Go to ${label}`}
                  disabled={isCurrent || !isAvailable}
                  onClick={() => navigateToStep(target)}
                >
                  {index + 1}
                </button>
                <strong>{label}</strong>
              </li>
            );
          })}
        </ol>

        <p className="mobile-advice">Mobile view is fully usable; a desktop screen is recommended for reviewing wide report tables.</p>

        {error && <div className="error-banner" role="alert"><strong>Couldn’t continue.</strong><span>{error}</span></div>}
        <div className="status-announcer" aria-live="polite">{busy ? 'Processing. Please wait.' : ''}</div>

        {step === 'files' && (
          <section className="report-preview" aria-label="Synthetic sample report preview">
            <div className="analysis-proof">
              <div className="preview-heading r-preview-title"><h2>Synthetic sample — Sales overview</h2><p>This is example output based on sample data.</p></div>
              <dl className="kpi-row r-kpi-row">
                <div><dt>Total revenue</dt><dd>$1,248,320</dd><span>Synthetic sample</span></div><div><dt>Total orders</dt><dd>4,892</dd><span>Synthetic sample</span></div>
                <div><dt>Unique customers</dt><dd>1,173</dd><span>Synthetic sample</span></div><div><dt>Average order value</dt><dd>$255.14</dd><span>Synthetic sample</span></div>
              </dl>
              <section className="chart-block r-revenue-chart">
                <div className="section-heading r-revenue-chart-title"><h3>Monthly revenue</h3><span>Synthetic sample</span></div><RevenueChart />
                <div className="chart-months" aria-hidden="true">{['Jan 2024', 'Feb 2024', 'Mar 2024', 'Apr 2024', 'May 2024', 'Jun 2024', 'Jul 2024', 'Aug 2024', 'Sep 2024', 'Oct 2024', 'Nov 2024', 'Dec 2024'].map((month) => <span key={month}>{month}</span>)}</div>
              </section>
              <section className="table-block r-products-table">
                <div className="section-heading r-products-table-title"><h3>Top products by revenue</h3><span>Synthetic sample</span></div>
                <table><thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Units sold</th><th>Revenue</th><th>% of total</th></tr></thead><tbody>{productRows.map((row) => <tr key={row[0]}>{row.map((cell) => <td key={cell}>{cell}</td>)}</tr>)}</tbody></table>
              </section>
            </div>

            <aside className="workbook-proof r-workbook-proof">
              <div className="workbook-title"><span className="excel-mark"><WorkbookIcon /></span><div><h2>Sales Report.xlsx</h2><span>Synthetic sample</span></div></div>
              <h3>Worksheets (6)</h3><ul>{worksheetRows.map(([title, description]) => <li key={title}><span><SheetIcon /></span><div><strong>{title}</strong><small>{description}</small></div></li>)}</ul>
              <button className="button button--continue" type="button" disabled={!readyForParse || busy} onClick={continueFromFiles}>{busy ? 'Reading workbooks…' : 'Continue'}</button>
              <p>{readyForParse ? 'Ready to inspect worksheet headers.' : 'Upload both files to continue to mapping.'}</p>
            </aside>
          </section>
        )}

        {step === 'map' && ordersWorkbook && productsWorkbook && config && <MappingPanel orders={ordersWorkbook} products={productsWorkbook} config={config} busy={busy} onConfigChange={handleConfigChange} onAnalyze={validateData} />}
        {step === 'review' && analysis && <ReviewPanel result={analysis} corrections={corrections} confirmed={confirmed} busy={busy} onConfirmedChange={setConfirmed} onBack={() => setStep('map')} onGenerate={generateReport} onSaveCorrection={saveCorrection} onUndoCorrection={undoCorrection} />}
        {step === 'report' && analysis && <ReportPanel result={analysis} downloadUrl={downloadUrl} busy={busy} onReset={reset} />}

        <footer className="page-footer">
          <p className="r-privacy-footer"><LockIcon /> Your files never leave your browser. All processing happens locally for your privacy.</p>
          <span className="r-product-footer">Report Generator</span>
        </footer>
      </div>
    </main>
  );
}

export { App };

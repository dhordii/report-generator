import type { AnalysisConfig, AnalysisResult, DataCorrection, DatasetKind, ParsedWorkbook, ReportChartImages } from '../domain/types';

type WorkerPayloadMap = {
  parse: { kind: DatasetKind; fileName: string; buffer: ArrayBuffer };
  analyze: { orders: ParsedWorkbook; products: ParsedWorkbook; config: AnalysisConfig; corrections: DataCorrection[] };
  generate: { result: AnalysisResult; images: ReportChartImages };
};

type WorkerResultMap = {
  parse: ParsedWorkbook;
  analyze: AnalysisResult;
  generate: ArrayBuffer;
};

interface WorkerResponse {
  id: number;
  ok: boolean;
  result?: unknown;
  error?: string;
}

const worker = new Worker(new URL('./report.worker.ts', import.meta.url), { type: 'module' });
let nextId = 1;
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (reason: Error) => void }>();

worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
  const request = pending.get(event.data.id);
  if (!request) return;
  pending.delete(event.data.id);
  if (event.data.ok) request.resolve(event.data.result);
  else request.reject(new Error(event.data.error ?? 'The report worker failed.'));
});

worker.addEventListener('error', (event) => {
  for (const request of pending.values()) request.reject(new Error(event.message || 'The report worker stopped unexpectedly.'));
  pending.clear();
});

function callWorker<T extends keyof WorkerPayloadMap>(type: T, payload: WorkerPayloadMap[T], transfer: Transferable[] = []): Promise<WorkerResultMap[T]> {
  const id = nextId;
  nextId += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: (value) => resolve(value as WorkerResultMap[T]), reject });
    worker.postMessage({ id, type, payload }, transfer);
  });
}

export async function parseWorkbookFile(kind: DatasetKind, file: File): Promise<ParsedWorkbook> {
  if (!file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Choose an .xlsx workbook.');
  if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} exceeds the 10 MB limit.`);
  const buffer = await file.arrayBuffer();
  return callWorker('parse', { kind, fileName: file.name, buffer }, [buffer]);
}

export function analyzeInWorker(orders: ParsedWorkbook, products: ParsedWorkbook, config: AnalysisConfig, corrections: DataCorrection[] = []): Promise<AnalysisResult> {
  return callWorker('analyze', { orders, products, config, corrections });
}

export function generateInWorker(result: AnalysisResult, images: ReportChartImages): Promise<ArrayBuffer> {
  return callWorker('generate', { result, images });
}

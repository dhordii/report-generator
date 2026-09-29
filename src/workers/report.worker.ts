/// <reference lib="webworker" />

import ExcelJS from 'exceljs';
import { analyzeWorkbooks } from '../domain/processing';
import { buildReportWorkbook } from '../domain/workbook';
import type { AnalysisConfig, AnalysisResult, DataCorrection, DatasetKind, ParsedSheet, ParsedWorkbook, RawCell, RawRow, ReportChartImages } from '../domain/types';

type WorkerRequest =
  | { id: number; type: 'parse'; payload: { kind: DatasetKind; fileName: string; buffer: ArrayBuffer } }
  | { id: number; type: 'analyze'; payload: { orders: ParsedWorkbook; products: ParsedWorkbook; config: AnalysisConfig; corrections: DataCorrection[] } }
  | { id: number; type: 'generate'; payload: { result: AnalysisResult; images: ReportChartImages } };

type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

const scope = self as DedicatedWorkerGlobalScope;

function primitiveCell(value: unknown, original: string): RawCell {
  if (value === null || value === undefined || value === '') return { value: null, original, kind: 'blank' };
  if (value instanceof Date) return { value: value.toISOString(), original, kind: 'date' };
  if (typeof value === 'number') return { value, original, kind: 'number' };
  if (typeof value === 'boolean') return { value, original, kind: 'boolean' };
  if (typeof value === 'string') return { value, original, kind: 'string' };
  return { value: original, original, kind: 'string' };
}

function normalizeCell(cell: ExcelJS.Cell): RawCell {
  const value = cell.value;
  const original = cell.text ?? '';
  if (value && typeof value === 'object' && 'formula' in value) {
    const formulaValue = value as ExcelJS.CellFormulaValue;
    const result = formulaValue.result;
    const normalized = primitiveCell(result, original || `=${formulaValue.formula}`);
    return {
      ...normalized,
      kind: 'formula',
      formula: formulaValue.formula,
      cached: result !== undefined && result !== null,
    };
  }
  if (value && typeof value === 'object' && 'richText' in value) {
    const text = value.richText.map((part) => part.text).join('');
    return { value: text, original: text, kind: 'string' };
  }
  if (value && typeof value === 'object' && 'text' in value) {
    const text = String(value.text);
    return { value: text, original: text, kind: 'string' };
  }
  return primitiveCell(value, original);
}

function worksheetToSheet(worksheet: ExcelJS.Worksheet, rowLimit: number): ParsedSheet | null {
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const header = String(cell.text ?? '').trim();
    headers[columnNumber - 1] = header;
  });
  while (headers.length > 0 && !headers.at(-1)) headers.pop();
  if (headers.length === 0) return null;
  const namedHeaders = headers.filter(Boolean);
  const duplicateHeaders = [...new Set(namedHeaders.filter((header, index) => namedHeaders.indexOf(header) !== index))];
  if (duplicateHeaders.length > 0) {
    throw new Error(`Worksheet “${worksheet.name}” has duplicate header${duplicateHeaders.length === 1 ? '' : 's'}: ${duplicateHeaders.join(', ')}. Rename duplicate columns before mapping.`);
  }
  if (worksheet.actualRowCount - 1 > rowLimit) throw new Error(`Worksheet “${worksheet.name}” exceeds the ${rowLimit.toLocaleString('en-US')} row limit.`);

  const rows: RawRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells: Record<string, RawCell> = {};
    let hasValue = false;
    headers.forEach((header, index) => {
      if (!header) return;
      const normalized = normalizeCell(row.getCell(index + 1));
      if (normalized.kind !== 'blank') hasValue = true;
      cells[header] = normalized;
    });
    if (hasValue) rows.push({ sourceRow: rowNumber, cells });
  });
  return { name: worksheet.name, headers, rows };
}

async function parseWorkbook(kind: DatasetKind, fileName: string, buffer: ArrayBuffer): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const rowLimit = kind === 'orders' ? 25_000 : 5_000;
  const sheets = workbook.worksheets.map((worksheet) => worksheetToSheet(worksheet, rowLimit)).filter((sheet): sheet is ParsedSheet => sheet !== null && sheet.rows.length > 0);
  if (sheets.length === 0) throw new Error(`${fileName} has no non-empty worksheet with a header row.`);
  return { fileName, sheets };
}

scope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  try {
    if (request.type === 'parse') {
      const result = await parseWorkbook(request.payload.kind, request.payload.fileName, request.payload.buffer);
      scope.postMessage({ id: request.id, ok: true, result } satisfies WorkerResponse);
      return;
    }
    if (request.type === 'analyze') {
      const result = analyzeWorkbooks(request.payload.orders, request.payload.products, request.payload.config, request.payload.corrections);
      scope.postMessage({ id: request.id, ok: true, result } satisfies WorkerResponse);
      return;
    }
    const result = await buildReportWorkbook(request.payload.result, request.payload.images);
    scope.postMessage({ id: request.id, ok: true, result } satisfies WorkerResponse, [result]);
  } catch (error) {
    scope.postMessage({ id: request.id, ok: false, error: error instanceof Error ? error.message : 'Unexpected worker failure.' } satisfies WorkerResponse);
  }
};

export {};

export type CellKind = 'blank' | 'string' | 'number' | 'boolean' | 'date' | 'formula';
export type CellPrimitive = string | number | boolean | null;
export type DatasetKind = 'orders' | 'products';
export type OrderStatus = 'Completed' | 'Cancelled' | 'Pending';
export type IssueSeverity = 'blocker' | 'error' | 'warning' | 'info';

export interface RawCell {
  value: CellPrimitive;
  original: string;
  kind: CellKind;
  formula?: string;
  cached?: boolean;
}

export interface RawRow {
  sourceRow: number;
  cells: Record<string, RawCell>;
}

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: RawRow[];
}

export interface ParsedWorkbook {
  fileName: string;
  sheets: ParsedSheet[];
}

export const orderFields = [
  'order_line_id',
  'order_id',
  'customer_id',
  'product_id',
  'quantity',
  'unit_price',
  'order_date',
  'status',
] as const;

export const productFields = ['product_id', 'product_name', 'category', 'unit_cost'] as const;

export type OrderField = (typeof orderFields)[number];
export type ProductField = (typeof productFields)[number];
export type CorrectionField = OrderField | ProductField;
export type OrderMapping = Record<OrderField, string>;
export type ProductMapping = Record<ProductField, string>;

export interface AnalysisConfig {
  ordersSheet: string;
  productsSheet: string;
  orderMapping: OrderMapping;
  productMapping: ProductMapping;
  statusMapping: Record<string, OrderStatus | ''>;
  textNumberFormat: 'us' | 'eu';
  textDateFormat: 'yyyy-mm-dd' | 'mm/dd/yyyy' | 'dd/mm/yyyy';
}

export interface DataIssue {
  severity: IssueSeverity;
  code: string;
  dataset: DatasetKind;
  sourceFile?: string;
  sourceRow?: number;
  field?: CorrectionField;
  message: string;
  originalValue?: string;
  correctedValue?: string;
  resolution?: 'corrected' | 'excluded';
  editable?: boolean;
  action: string;
}

export interface DataCorrection {
  dataset: DatasetKind;
  sourceRow: number;
  field: CorrectionField;
  value: string;
}

export interface ProcessedRow {
  sourceRow: number;
  orderLineId: string;
  orderId: string;
  customerId: string;
  productId: string;
  productName: string;
  category: string;
  orderDate: string;
  status: OrderStatus;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  revenue: number;
  estimatedCost: number;
  estimatedProfit: number;
  estimatedMargin: number | null;
  includedInKpi: boolean;
  kpiReason: string;
}

export interface ProductAggregate {
  productId: string;
  productName: string;
  category: string;
  units: number;
  revenue: number;
  estimatedProfit: number;
}

export interface CustomerAggregate {
  customerId: string;
  revenue: number;
  estimatedProfit: number;
  categories: Record<string, number>;
}

export interface MonthAggregate {
  month: string;
  revenue: number;
  estimatedProfit: number;
  completedOrders: number;
}

export interface CategoryAggregate {
  category: string;
  revenue: number;
  estimatedProfit: number;
  units: number;
}

export interface AnalysisSummary {
  revenue: number;
  estimatedProfit: number;
  completedOrders: number;
  uniqueCustomers: number;
  excludedRows: number;
  excludedOrderRows: number;
  excludedProductRows: number;
  cancelledRows: number;
  pendingRows: number;
}

export interface AnalysisResult {
  summary: AnalysisSummary;
  narrative: string[];
  processedRows: ProcessedRow[];
  issues: DataIssue[];
  products: ProductAggregate[];
  customers: CustomerAggregate[];
  months: MonthAggregate[];
  categories: CategoryAggregate[];
  blockers: number;
  requiresConfirmation: boolean;
  identicalProductDuplicates: number;
  identicalOrderDuplicates: number;
}

export interface ReportChartImages {
  monthly: string;
  products: string;
  customers: string;
  units: string;
  categories: string;
}

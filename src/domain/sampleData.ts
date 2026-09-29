import type { ParsedWorkbook, RawCell, RawRow } from './types';

function cell(value: string | number | boolean | null, kind?: RawCell['kind']): RawCell {
  const resolvedKind = kind ?? (value === null ? 'blank' : typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'boolean' : 'string');
  return {
    value,
    original: value === null ? '' : String(value),
    kind: resolvedKind,
  };
}

function row(sourceRow: number, values: Record<string, RawCell['value']>): RawRow {
  return {
    sourceRow,
    cells: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, cell(value)])),
  };
}

const categories = ['Electronics', 'Home & Living', 'Apparel', 'Sports', 'Beauty', 'Office'];
const productNames = [
  'Wireless Headphones', 'Mechanical Keyboard', 'USB-C Hub', '27” 4K Monitor', 'Ergonomic Chair', 'Ceramic Mug',
  'Desk Lamp', 'Notebook Set', 'Running Shoes', 'Yoga Mat', 'Water Bottle', 'Travel Backpack',
  'Smart Speaker', 'Webcam', 'Laptop Stand', 'Coffee Maker', 'Storage Basket', 'Cotton Throw',
  'Linen Shirt', 'Everyday Hoodie', 'Training Shorts', 'Resistance Bands', 'Face Cleanser', 'Hand Cream',
  'Gel Pens', 'Document Tray', 'Portable Charger', 'Cable Organizer', 'Chef Knife', 'Cutting Board',
  'Scented Candle', 'Bath Towel', 'Baseball Cap', 'Fitness Tracker', 'Lip Balm', 'Weekly Planner',
];

export function createSampleWorkbooks(): { orders: ParsedWorkbook; products: ParsedWorkbook } {
  const productRows = productNames.map((name, index) => {
    const productId = `P-${String(index + 1).padStart(4, '0')}`;
    const unitCost = 6 + ((index * 17) % 115);
    return row(index + 2, {
      product_id: productId,
      product_name: name,
      category: categories[index % categories.length] ?? 'Other',
      unit_cost: unitCost,
    });
  });

  productRows.push({ ...productRows[5]!, sourceRow: productRows.length + 2 });

  const orderRows: RawRow[] = [];
  const start = Date.UTC(2024, 0, 1);
  for (let index = 0; index < 1_200; index += 1) {
    const productIndex = (index * 7 + Math.floor(index / 17)) % productNames.length;
    const date = new Date(start + ((index * 17) % 730) * 86_400_000);
    const quantity = 1 + ((index * 3) % 5);
    const unitCost = 6 + ((productIndex * 17) % 115);
    const status = index % 19 === 0 ? 'Cancelled' : index % 13 === 0 ? 'Pending' : 'Completed';
    const values: Record<string, RawCell['value']> = {
      order_line_id: `OL-${String(index + 1).padStart(5, '0')}`,
      order_id: `ORD-${String(Math.floor(index / 2) + 1).padStart(5, '0')}`,
      customer_id: `C-${String((index * 11) % 180 + 1).padStart(4, '0')}`,
      product_id: `P-${String(productIndex + 1).padStart(4, '0')}`,
      quantity,
      unit_price: Number((unitCost * (1.55 + ((index % 7) * 0.05))).toFixed(2)),
      order_date: date.toISOString().slice(0, 10),
      status,
    };
    orderRows.push(row(index + 2, values));
  }

  orderRows[10]!.cells.quantity = cell('two');
  orderRows[28]!.cells.product_id = cell('P-9999');
  orderRows.push({ ...orderRows[48]!, sourceRow: orderRows.length + 2 });
  const conflicting = structuredClone(orderRows[78]!);
  conflicting.sourceRow = orderRows.length + 2;
  conflicting.cells.quantity = cell(9);
  orderRows.push(conflicting);
  orderRows[100]!.cells.unit_price = {
    value: orderRows[100]!.cells.unit_price!.value,
    original: '=ROUND(42*1.65,2)',
    kind: 'formula',
    formula: 'ROUND(42*1.65,2)',
    cached: true,
  };

  return {
    orders: {
      fileName: 'orders_sample.xlsx',
      sheets: [{
        name: 'Orders',
        headers: ['order_line_id', 'order_id', 'customer_id', 'product_id', 'quantity', 'unit_price', 'order_date', 'status'],
        rows: orderRows,
      }],
    },
    products: {
      fileName: 'products_sample.xlsx',
      sheets: [{
        name: 'Products',
        headers: ['product_id', 'product_name', 'category', 'unit_cost'],
        rows: productRows,
      }],
    },
  };
}

export function createConflictingProductWorkbooks(): { orders: ParsedWorkbook; products: ParsedWorkbook } {
  const sample = createSampleWorkbooks();
  const conflictingProduct = structuredClone(sample.products.sheets[0]!.rows[0]!);
  conflictingProduct.sourceRow = sample.products.sheets[0]!.rows.length + 2;
  conflictingProduct.cells.product_name = cell('Conflicting product name');
  sample.products.sheets[0]!.rows.push(conflictingProduct);
  sample.orders.fileName = 'orders_blocking_fixture.xlsx';
  sample.products.fileName = 'products_blocking_fixture.xlsx';
  return sample;
}

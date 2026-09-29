# Report Generator

Report Generator turns an orders workbook and a products workbook into a validated, auditable Excel sales report. It runs entirely in the browser: uploaded files are not sent to a server, and a visitor can try the full flow with deterministic synthetic data.

## What it produces

`Sales Report.xlsx` contains six worksheets:

1. `Overview`
2. `Products`
3. `Customers`
4. `Monthly Trends`
5. `Data Issues`
6. `Processed Data`

The workbook includes five embedded PNG charts. Financial KPIs use completed orders only. Cancelled and pending rows remain in `Processed Data`, with an explicit KPI inclusion flag and reason. Profit and margin are estimates based on the standard `unit_cost` supplied in the products workbook.

## Source workbook contract

The app accepts `.xlsx` files up to 10 MB each, with at most 25,000 order rows and 5,000 product rows. Row 1 is the header row.

Orders require these fields:

```text
order_line_id, order_id, customer_id, product_id,
quantity, unit_price, order_date, status
```

Products require:

```text
product_id, product_name, category, unit_cost
```

Exact header and status matches are preselected. Other mappings are always explicit; the app does not use fuzzy matching. Text dates can be interpreted as `YYYY-MM-DD`, `MM/DD/YYYY`, or `DD/MM/YYYY`; text numbers can use `1,234.56` or `1 234,56`.

Identifier values are conservative: numeric `123` matches text `"123"`, while `"00123"`, case, and whitespace remain distinct. Cached formula results produce a warning and require confirmation. Formula cells without cached results are excluded as invalid because the browser does not recalculate source workbooks.

In **Review issues**, an error value can be replaced field by field. A saved correction exists only in browser memory, triggers the complete validation again, and never modifies the uploaded workbook. Corrections can be undone. Any order row that remains invalid is excluded from processed data and KPIs. An invalid or conflicting product row is excluded together with orders that depend on that product. The `Data Issues` sheet records the source file and row, field, original value, corrected value, final status, reason, and action for every correction or exclusion.

## Local development

Requirements: Node.js 22+ and pnpm 11+.

```powershell
pnpm install
pnpm run dev
```

The stable production preview path is:

```powershell
pnpm run build
pnpm run preview
```

## Verification

```powershell
pnpm run lint
pnpm run typecheck
pnpm test
pnpm run test:e2e
pnpm run build
```

The unit suite verifies corrections, undo-safe source preservation, duplicate/conflict policy, and reopens the generated workbook to inspect its worksheets, images, tables, corrected processed values, and audit content. The end-to-end test runs the complete synthetic-data correction flow in a real browser, downloads the report, reopens it with ExcelJS, and checks the same delivery contract.

Rebuild the downloadable source fixtures with:

```powershell
pnpm run fixtures
```

`fixtures/orders_sample.xlsx` and `fixtures/products_sample.xlsx` exercise the review path with manual corrections, safe exclusions, and duplicate warnings. The separate `*_blocking_fixture.xlsx` pair contains a conflicting product definition; the affected product and its related orders must be excluded while the remaining valid data stays reportable.

On Windows, the Playwright configuration uses the installed Microsoft Edge binary. In CI it uses the downloaded Chromium build.

## Architecture

- `src/App.tsx` coordinates the four-step workflow and browser state.
- `src/components/WorkflowPanels.tsx` contains mapping, review, and delivery surfaces.
- `src/domain/processing.ts` contains deterministic validation, deduplication, and aggregation rules.
- `src/domain/workbook.ts` creates the Excel deliverable.
- `src/domain/chartRenderer.ts` renders chart images on the main browser thread.
- `src/workers/report.worker.ts` parses and generates workbooks away from the UI thread.
- `src/domain/sampleData.ts` contains the safe synthetic demo and a separate blocking product-conflict fixture used by tests.

No backend, analytics, runtime CDN, cookies, accounts, or environment variables are required.

## GitHub Pages

The Vite build uses relative asset URLs and can be hosted from a GitHub Pages project path. `.github/workflows/deploy-pages.yml` is intentionally manual (`workflow_dispatch`) so publication remains an explicit release action. Before deploying, run the full verification matrix, review the intended commit, trigger the workflow, and smoke-test the public URL.

Rollback is a deployment of the previous verified commit. Do not treat a successful CI run alone as proof that the public site works.

## Current scope boundaries

The MVP does not support `.xls`, CSV input, multiple currencies, taxes, discounts, returns, forecasts, recommendations, inventory, API integrations, or live workbook formulas. The mobile layout is usable for the workflow, but a desktop screen is recommended for reviewing wide tables.

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, TypeScript, and Vite. The application is built as a static site for GitHub Pages and processes spreadsheets entirely in the browser.

## Users

The primary user is an owner, manager, or analyst at a small online store who needs a trustworthy sales report without building formulas or pivot tables. A second audience is a prospective freelance client evaluating the developer's ability to turn business files into a finished, auditable deliverable.

## Product Purpose

Report Generator turns an orders workbook and a products workbook into a validated Excel sales report. Success means a first-time visitor can try synthetic data or upload their own files, review every material data issue, explicitly approve exclusions, and download a clear report without installing software or sending source data to a server.

## Positioning

The product combines flexible source-column and status mapping with conservative validation, explicit review, and a client-ready Excel output. It does not silently repair, discard, merge, or reinterpret source data.

## Operating Context

The app opens directly as a generator on GitHub Pages. The user uploads `orders.xlsx` and `products.xlsx`, selects worksheets when necessary, maps fields and source statuses, chooses date and number formats for textual values, reviews validation results, optionally corrects individual invalid values in memory, confirms any remaining exclusions, and downloads a report snapshot.

The official workflow targets current desktop Chrome, Edge, and Firefox. The responsive mobile view remains readable but recommends desktop for report generation.

## Capabilities and Constraints

- Input is limited to `.xlsx`, at most 10 MB per file, 25,000 order rows, and 5,000 product rows.
- Required order fields are `order_line_id`, `order_id`, `customer_id`, `product_id`, `quantity`, `unit_price`, `order_date`, and `status`.
- Required product fields are `product_id`, `product_name`, `category`, and `unit_cost`.
- Exact column and status matches are preselected; every other mapping is explicit. Fuzzy guessing is forbidden.
- Completed orders alone feed financial KPIs. Cancelled and pending orders remain visible in processed data.
- Product `unit_cost` is a standard cost applied across the reporting period. Profit and margin are labeled as estimates on that basis.
- The output is a fixed report snapshot with six worksheets and five embedded PNG charts, not a live formula model.
- Uploaded workbook data remains in browser memory and is cleared on reset or reload. There is no backend, account, analytics service, or runtime CDN.
- Formulas in source cells are not recalculated. A cached value may be used only after a visible warning; a formula without a cached value is invalid.
- Manual corrections are limited to individual required fields, live only for the current browser session, and trigger full revalidation. They never overwrite source workbooks and can be undone.
- Unresolved invalid order rows are excluded from processed data and KPIs. Invalid or conflicting product rows, plus every order that depends on them, are excluded without blocking the remaining valid report.
- The audit distinguishes corrected and excluded outcomes and retains source file, source row, field, original value, corrected value, reason, and action.
- Multiple currencies, taxes, discounts, returns, forecasting, recommendations, inventory, machine learning, API integrations, and mobile-first generation are outside the MVP.

## Brand Commitments

The product name is Report Generator. User-facing copy and workbook labels are in concise professional English. The interface supports light and dark themes with system detection and a manual toggle.

## Evidence on Hand

No customer logos, testimonials, production datasets, benchmarks, or commercial claims are available and none may be invented. The project will ship reproducible synthetic demonstration workbooks covering two years of sales and clearly label them as synthetic.

## Product Principles

1. Make the useful path immediate: a visitor can upload files or try sample data in the first viewport.
2. Preserve evidence: retain original values, source row references, exclusions, mappings, and reasons.
3. Require consent for ambiguity: never silently normalize, deduplicate, repair, or choose conflicting data.
4. Keep the report traceable: every KPI can be followed to processed rows and validation outcomes.
5. Prefer a focused, finished workflow over a configurable BI platform.

## Accessibility & Inclusion

The product provides keyboard-complete navigation, visible focus, semantic labels and status announcements, adequate contrast in both themes, non-color-only status meaning, stable layouts, and readable recovery guidance. Reduced-motion preferences are respected.

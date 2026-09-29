---
name: "Report Generator"
description: "A precise, proof-first interface for turning local Excel files into an auditable sales report."
colors:
  canvas: "#f7f8f8"
  surface: "#ffffff"
  surface-subtle: "#f6f7f9"
  ink: "#080c2f"
  muted: "#667085"
  muted-strong: "#475467"
  line: "#d9dde6"
  line-soft: "#e9ecf2"
  accent: "#195cf8"
  accent-strong: "#124bd2"
  accent-soft: "#eaf1ff"
  success: "#14804a"
  warning: "#b45309"
  focus: "#7ca3ff"
  excel: "#107c41"
  dark-canvas: "#0b1020"
  dark-surface: "#11182a"
  dark-surface-subtle: "#151d31"
  dark-ink: "#f5f7ff"
  dark-muted: "#aab2c4"
  dark-muted-strong: "#ccd2df"
  dark-line: "#2a354d"
  dark-line-soft: "#202a40"
  dark-accent: "#7aa2ff"
  dark-accent-strong: "#9ab8ff"
  dark-accent-soft: "#172a54"
  dark-success: "#57c78d"
  dark-warning: "#f5b861"
  dark-focus: "#a8c0ff"
typography:
  display:
    fontFamily: "Mukta Malar, Inter Variable, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.024em"
  headline:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, sans-serif"
    fontSize: "11px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "normal"
  data:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
    fontFeature: "tabular-nums"
rounded:
  field: "6px"
  nested: "7px"
  control: "8px"
  panel: "10px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  shell: "55px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  button-quiet:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 18px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "44px"
  select-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.field}"
    padding: "0 32px 0 10px"
    height: "38px"
  workflow-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  state-badge:
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 10px"
    height: "26px"
---

# Design System: Report Generator

## Overview

**Creative North Star: "The Auditable Workbench"**

Report Generator feels like a compact professional workbench where every input, decision, issue, and output remains visible. White or cool-gray planes, navy ink, hairline rules, restrained status color, and dense tabular details make the interface credible without turning it into an enterprise dashboard.

The system is quiet until action or risk requires emphasis. Blue advances the workflow, green confirms completion, amber asks for attention, and red identifies blocking conditions. Motion is brief and functional; the report preview, audit tables, and workbook proof carry the visual weight instead of decorative imagery.

**Key Characteristics:**

- Proof-first hierarchy with the working interface visible immediately.
- Compact system typography, tabular figures, and explicit labels.
- Flat bordered surfaces with one restrained action shadow.
- Semantic light and dark themes built from the same roles.
- Stable, keyboard-complete controls with visible focus and non-color status text.

## Colors

The palette pairs cool paper-like neutrals with one precise blue accent; semantic colors appear only when the workflow has something specific to communicate.

### Primary

- **Action Blue** (`accent`): primary actions, the active workflow step, chart lines, and selected text.
- **Pressed Blue** (`accent-strong`): hover emphasis and high-contrast blue text on pale action surfaces.
- **Action Wash** (`accent-soft`): quiet upload controls, factual-summary fields, and mobile guidance.

### Secondary

- **Workbook Green** (`excel`): the Excel file mark and no other brand-neutral control.
- **Confirmed Green** (`success`): completed steps and positive status meaning.

### Neutral

- **Cool Canvas** (`canvas`): the page and footer plane outside the working surfaces.
- **Paper Surface** (`surface`): headers, panels, cards, fields, and report proof.
- **Subtle Plane** (`surface-subtle`): icons, table headers, action footers, and nested delivery containers.
- **Navy Ink** (`ink`): headings, data values, and the strongest control text.
- **Slate Copy** (`muted-strong`): field labels and secondary operational text.
- **Quiet Slate** (`muted`): descriptions, annotations, axes, and helper copy.
- **Hairline** (`line`) and **Soft Hairline** (`line-soft`): structure without visual weight.
- **Night Canvas**, **Night Surface**, and their dark semantic companions (`dark-*`): direct role-for-role replacements when the theme is dark, never an unrelated palette.

### Tertiary

- **Warning Amber** (`warning`): warning meaning and confirmation-required states.
- **Focus Periwinkle** (`focus`): the three-pixel keyboard focus outline in both themes.

### Named Rules

**The Blue Does Work Rule.** Blue is reserved for actions, the current step, data visualization, selection, and focus-related emphasis; it is not decoration.

**The Status Has Words Rule.** Success, warning, and error colors always travel with a label, count, icon, or actionable explanation.

## Typography

**Display Font:** Mukta Malar (with Inter Variable and sans-serif fallbacks)

**Body Font:** Inter Variable (with Inter, ui-sans-serif, and sans-serif fallbacks)

**Data Font:** Inter Variable with tabular numerals

**Character:** Mukta Malar gives the page and analytical section headings a compact, assured cadence. Inter carries every operational label, control, table, and numerical proof with minimal personality drift.

### Hierarchy

- **Display** (700, `display`, 1.2): the centered page promise; it reduces to 27px on mobile.
- **Headline** (700, `headline`, 1.2): workflow panel titles and primary completion messages.
- **Title** (700, `title`, 1.2): preview, workbook, and delivery headings.
- **Body** (400, `body`, 1.5): introductory and explanatory copy; the desktop intro is constrained to 880px.
- **Label** (650, `label`, 1.2): field labels, metadata, axes, badges, and compact guidance.
- **Data** (700, `data`, 1.2): KPI values with tabular figures and tightened tracking.

### Named Rules

**The Numbers Line Up Rule.** Financial values, counts, and table numerals use tabular figures; scanning and reconciliation outrank typographic flourish.

**The Labels Stay Literal Rule.** Labels name the file, field, state, or consequence directly; no clever copy replaces operational meaning.

## Layout

The desktop shell is centered at a maximum width of 1586px with 55px side gutters. The first view moves from a 50px utility header to a compact centered introduction, then a three-column intake strip, a four-step rail, and a broad proof area. The proof area uses a flexible analysis column beside a 405px workbook column; workflow screens replace it with one bordered panel and keep the same outer gutter.

Spacing follows a compact 4/8/12/16/24 rhythm, with 55px reserved for the outer desktop frame. One-pixel rules separate dense regions and let padding, rather than independent cards, create grouping.

At 980px and below, the intake becomes two columns with the sample action spanning both, the proof stacks to one column, mapping cards stack, and outer gutters reduce to 28px. At 640px and below, controls become one column, outer gutters reduce to 16px, the workflow metrics become a two-by-two grid, actions become full-width, and a visible advisory recommends desktop for wide report review. Charts and tables preserve their readable minimum widths and scroll horizontally instead of compressing labels into illegibility.

**The Wide Evidence Rule.** Preserve the integrity of tables and charts with explicit overflow; do not squeeze audit evidence until values or headers become ambiguous.

## Elevation & Depth

The system is flat by default. Depth comes from tonal planes, one-pixel borders, nested backgrounds, and density changes. Workflow panels explicitly use no shadow. The only ambient lift is attached to the large sample-data action so the immediate path is unmistakable.

### Shadow Vocabulary

- **Primary invitation** (`0 8px 20px rgba(25, 92, 248, 0.18)`): only the large first-view sample action.

### Named Rules

**The Flat-by-Default Rule.** Cards, tables, panels, and report containers remain border-defined at rest; shadows never become a substitute for hierarchy.

## Shapes

The form language is gently squared: 6px fields, 7px nested marks, 8px controls and primary cards, and 10px workflow panels. Pills are reserved for status badges, while circles are reserved for numbered workflow steps and the theme-toggle thumb. Hairline solid borders define surfaces; the two file-drop regions alone use a pale dashed border to signal drag-and-drop behavior.

Workbook marks use a compact green rounded square, and all supporting line icons use simple outlined geometry. No decorative blobs, gradients, ornamental clipping, or unrelated silhouettes belong in this system.

**The Radius Carries Meaning Rule.** Use gentle corners for work surfaces, full pills only for compact state labels, and circles only for progress or toggle mechanisms.

## Components

### Buttons

Buttons are compact, direct, and stateful rather than expressive.

- **Shape:** gently rounded controls (`control`); general actions keep a 42px floor, workflow actions are 44px high, the compact file picker is 36px high, and the first-view sample action is 66px on desktop (48px below 980px).
- **Primary:** Action Blue with white text, 700-weight labels, and no shadow except on the large 66px sample-data action.
- **Hover / Focus / Active:** darken to Pressed Blue on hover, show the three-pixel Focus Periwinkle outline on keyboard focus, and move down one pixel on active press. State transitions run for 160ms.
- **Quiet:** Action Wash with Pressed Blue text and a pale blue border for file selection.
- **Secondary:** Paper Surface with Navy Ink and a Hairline border for reversible actions such as Back or Start over.
- **Disabled:** reduce opacity for generic actions; the Continue control uses an explicit gray fill and message below it so unavailable behavior is explained.

### Chips

- **Style:** compact 26px pills with 11px, 750-weight text.
- **State:** blue means informational, green means success, amber means warning, and red means blocker or error. Each chip includes literal state copy or a count.

### Cards / Containers

- **Corner Style:** 8px for primary proof cards and 10px for workflow panels.
- **Background:** Paper Surface over Cool Canvas; nested structures use Subtle Plane.
- **Shadow Strategy:** flat at rest, following the Flat-by-Default Rule.
- **Border:** one-pixel Hairline, with Soft Hairline for internal divisions.
- **Internal Padding:** usually 16px to 24px, tightened to 12px in dense intake and table regions.

### Inputs / Fields

- **Style:** 38px selects on Paper Surface with a one-pixel Hairline border and 6px corners.
- **Focus:** a three-pixel Focus Periwinkle outline offset by two pixels.
- **Error / Disabled:** errors appear in a separate alert with a plain-language heading and recovery copy; disabled actions remain visibly unavailable and retain a reason nearby.

### Issue Correction

The review table exposes an **Edit value** action only for a specific editable error field. Its editor opens in a full-width row directly beneath the issue, preserving the table context without turning the review screen into a spreadsheet. It shows the exact dataset, source row, field, and original value; status corrections use a three-option select and other fields use one text input. **Save & revalidate**, **Cancel**, and **Undo** are literal actions. Corrected and Excluded outcome pills always include text, and the nearby note states that source files remain unchanged.

### Navigation

The utility header is a 50px Paper Surface bar with a bold wordmark, privacy reassurance, Help link, and explicit theme toggle. At mobile width it becomes 56px tall and hides the privacy sentence and Help link, retaining the wordmark and theme control. The four-step workflow rail always exposes the complete path; active and completed circles change semantically while labels remain visible. Available step numbers are keyboard-operable navigation buttons, while unavailable future steps remain disabled until their required data exists.

### File Intake

Each file intake is a bordered drop region with an outlined file icon, a three-line evidence stack, and an explicit Choose or Replace control. Long filenames truncate rather than shifting adjacent controls, and the hidden native file input is activated from a keyboard-operable label.

### Report Proof

The report proof pairs tabular KPIs, chart evidence, issue tables, and a six-worksheet inventory. Sample content is repeatedly labeled synthetic. Final delivery keeps the workbook name, sheet inventory, factual summary, and download action together so the result remains auditable at the moment of export.

### Motion

Control color and press transitions last 160ms; the theme-toggle thumb lasts 180ms; workflow panels arrive with a 280ms fade-and-eight-pixel rise. All use restrained ease-out curves. Under `prefers-reduced-motion: reduce`, scrolling becomes immediate and transitions collapse to 0.01ms.

## Do's and Don'ts

### Do:

- **Do** keep the useful task and its evidence visible before promotional or explanatory material.
- **Do** use Action Blue only for actions, active progress, chart data, selection, and focus-adjacent emphasis.
- **Do** preserve original values, row references, exclusions, and issue reasons in the visual hierarchy.
- **Do** keep light and dark themes role-equivalent and verify contrast, focus, disabled, warning, error, and success states in both.
- **Do** preserve readable table and chart widths with horizontal scrolling on small screens.
- **Do** label sample figures as synthetic and status color with explicit words.

### Don't:

- **Don't** add gradients, decorative imagery, ornamental cards, or unrelated accent colors.
- **Don't** hide the four-step path or collapse review into an unexplained progress indicator.
- **Don't** use shadows on ordinary cards, workflow panels, tables, or inputs.
- **Don't** silently compress, truncate, or summarize away audit evidence that affects a user's decision.
- **Don't** rely on color alone for severity, completion, selection, or validation meaning.
- **Don't** introduce motion that delays work, shifts neighboring content, or ignores reduced-motion preferences.

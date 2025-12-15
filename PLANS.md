# Household Life Plan Simulator ExecPlan

This ExecPlan is a living document. Update every section as progress is made. Maintain this document in accordance with `PLANS.md` at the repository root.

## Purpose / Big Picture

Deliver a browser-based interactive simulator that lets households model long-term finances under multiple what-if scenarios. A user should be able to define a resident profile including age, take-home income, expenses that vary by life stage or special events, housing and vehicle costs, and savings accounts with growth rates. They can run two or more scenarios side by side, observe cash-flow and balance projections on charts and tables, and adjust parameters live to see how retirement bonuses, tuition periods, or mortgage payoffs change the outlook. Acceptance is demonstrated when loading the app in a browser allows entering at least two scenarios and the displayed projections update immediately after tweaking any input.

## Progress

- [x] (2025-02-14 05:15Z) Captured domain objects plus comparison requirements; scaffolded Vite React app with dependencies to handle residents, housing, vehicle, living, and savings inputs.
- [x] (2025-02-14 05:30Z) Implemented TypeScript models and simulation engine with Vitest coverage for income growth, event-driven expenses, and savings compounding.
- [x] (2025-02-14 05:40Z) Delivered interactive UI (React + Zustand + react-hook-form + Victory) featuring multi-scenario editing, charts, persistence, and manual verification via dev server.
- [x] (2025-02-15 04:30Z) Added preset infrastructure (education + resident + housing) including JSON catalogs, hooks, and dialogs wired into ScenarioForm for rapid input.
- [x] (2025-02-15 05:10Z) Delivered vehicle preset data/hook/dialog and wired it into the 車一覧セクション so users can add loan or一括モデル instantly.
- [x] (2025-02-15 05:45Z) Added savings preset catalog/hook/dialog and connected it to the 貯蓄口座一覧セクション for rapid口座追加.
- [x] (2025-02-15 06:05Z) Expanded resident presets with child education patterns (私立小〜大学院、下宿含む) to accelerate dependent setup.
- [x] (2025-12-13) Expanded JSON import/export flows with scenario-level export plus append/replace imports.
- [x] (2025-12-13) Added optional slider controls for key numeric inputs in the editor.
- [x] (2025-12-13) Improved net worth chart: axis padding, hover crosshair + ages tooltip, and reveal animation.
- [x] (2025-12-13) Added resident career phases (job change + pension) via `jobs[]` and updated income projection.
- [x] (2025-12-13) Clarified savings account roles (生活防衛/目的別/長期投資) with grouped UI, contribution/withdraw rules, and deficit-handling logic + event logging.
- [x] (2025-12-14) Improved mobile support: editor overlay now switches between “一覧/編集” tabs on small screens, and form inputs avoid iOS zoom with 16px font size.
- [x] (2025-12-14) Added “AIで作成（コピー&貼り付け）” flow to import Scenario JSON generated in ChatGPT/Gemini UI (no BYOK/server required).
- [x] (2025-12-14) Added AI request template presets (questionnaire-style) selectable in the AI dialog to improve prompt quality and consistency.
- [x] (2025-12-15) Switched Wizard quick input from “おまかせ” autofill to preset-based input (residents/housing/vehicle/living/savings).
- [x] (2025-12-15) Added cashflow year picker + per-year waterfall breakdown panel (single scenario + overview compare).

## Surprises & Discoveries

- Observation: Node.js was missing on the workstation, blocking `npm create vite@latest` until Homebrew installed Node 25.
  Evidence: `zsh:1: command not found: npm` followed by successful `brew install node`.
- Observation: React Hook Form’s `watch` caused a React Compiler lint warning; swapped to `useWatch` to keep the debounced update path compatible.
  Evidence: ESLint `react-hooks/incompatible-library` warning cleared after the refactor.
- Observation: Legacy JSON payloads shaped as `{ "scenarios": [...] }` (including the shipped sample) caused the UI to crash before rendering; persistence/import helpers now coerce this format automatically.
  Evidence: Users saw a white screen until the runtime error was fixed.
- Observation: React 19 surfaced `useSyncExternalStore` errors when Zustand selectors returned freshly constructed objects (ScenarioList aggregated multiple values), producing an infinite render loop and blank screen.
  Evidence: Headless Chromium via Playwright reproduced `Maximum update depth exceeded` until the selector switched to `useShallow`.

## Decision Log

- Decision: Use a Vite-powered React + TypeScript frontend with Zustand for state management and Victory for charts to keep dependencies lightweight and well-documented.
  Rationale: Tooling is familiar, fast to spin up, works entirely in-browser, and supports interactive charts without server-side work.
  Date/Author: 2024-05-16 / Codex
- Decision: Load scenarios from snapshot URLs first, then localStorage, then bundled samples to keep the simulator stateless and easily shareable.
  Rationale: Enables copying a link to reproduce inputs without a backend, while still persisting data between sessions.
  Date/Author: 2025-02-14 / Codex
- Decision: Normalize imported/persisted scenario JSON by accepting both array and `{scenarios: []}` envelopes to avoid blank screens from malformed localStorage entries.
  Rationale: Early sample files used the envelope form and would otherwise brick the UI when reloaded.
  Date/Author: 2025-02-14 / Codex
- Decision: Use `useShallow` with the aggregated ScenarioList selector so Zustand returns cached snapshots compatible with React 19’s stricter `useSyncExternalStore`.
  Rationale: Prevents infinite update loops while keeping ergonomic access to the store tuple.
  Date/Author: 2025-02-14 / Codex

## Outcomes & Retrospective

The shipped simulator meets the purpose: users can maintain multiple what-if scenarios, edit residents/expenses/vehicles/housing/savings interactively, and visualize cash flow plus net worth trends. JSON import/export, snapshot URLs, and localStorage persistence keep workflows flexible. Remaining opportunities include richer tooltips, monthly granularity, and automated integration tests for the React components, but the foundation is end-to-end testable via Vitest, linting, and manual browser verification.

## Context and Orientation

The repository currently has only planning artifacts, so the first code will live under `app/` (frontend implementation) and `docs/` (user guide and sample data). The simulator consists of three conceptual layers. The data layer describes `Scenario` definitions composed of one or more `Resident` entries plus financing objects (housing, vehicles, life expenses, savings vehicles) as provided by the user request. The simulation layer expands each scenario into a normalized time series of yearly (and optionally monthly) entries with cash inflow, outflow, cumulative balance, and notable events. The presentation layer offers a browser UI that edits inputs, runs simulations on demand, and visualizes comparisons. Because there is no backend, all persistence is local (browser storage or downloadable JSON). Treat the provided Japanese terms as canonical domain names where helpful (e.g., class 住人 (Resident), 習い事 (lessons), 退職金 (retirement bonus)).

## Plan of Work

Start with Milestone 1 (Domain Modeling) by scaffolding a Vite React project in `app/`, configuring ESLint/Prettier to keep TypeScript strict, and defining TypeScript interfaces for `Resident`, `IncomeEvent`, `ExpenseBand`, `HousingProfile`, `VehicleProfile`, `LivingCostProfile`, and `SavingsAccount`. Ensure expenses account for school phases (小学生 to 大学院生) plus extracurricular periods by letting each `ExpenseBand` describe a label, start age, end age, and yearly amount. Income must support base salary, annual growth rates, as well as arbitrary adjustments (promotions, maternity leave, retirement bonuses). Savings accounts include both deposits (manual or rule-based) and compounding via per-account annual interest rates.

Milestone 2 (Simulation Engine) focuses on a pure TypeScript module at `app/src/simulation/engine.ts`. Implement helper functions: `expandExpenseBands(resident: Resident): YearlyExpense[]`, `projectIncome(resident: Resident): YearlyIncome[]`, and `simulateScenario(scenario: Scenario, horizonYears: number): Projection`. The simulation should iterate from the earliest resident age to a configurable horizon (default 60 years), summing incomes, expenses, housing, vehicle, lifestyle, and savings events for each year. Support one-off inflows like 退職金 via `IncomeEvent` objects with `triggerAge` or `triggerYear`. Housing needs amortization of mortgage and management fees; vehicles add recurring maintenance, loan payments, inspections (車検), and parking. Savings balances should track separate accounts (e.g., deposit vs. stocks) with distinct interest rates, applied after yearly net cash is added. Provide a scenario comparison service `compareScenarios(scenarios: Scenario[]): ScenarioComparison` that normalizes outputs for chart overlays (net worth, yearly surplus/deficit, risk indicators such as negative balance years).

Milestone 3 (Interactive UI) builds `app/src/components`. Create a multi-pane layout: left column for scenario list and input forms, right column for charts/tables. Allow duplicating a scenario to tweak conditions for comparison. Each scenario editor will group sections: Resident info (age, dependents, base income, growth rate, events); Education and extracurricular costs (list of ExpenseBands that can be added/removed); Housing (built year, mortgage remaining, payment schedule, management fees); Vehicles (loan terms, inspection cadence, parking fees, maintenance); Daily living expenses (food, utilities, insurance); Savings (two tabs: deposits and investments with adjustable interest). Tie form state to a Zustand store that maintains `Scenario[]` plus derived projections. When inputs change, debounce-run `simulateScenario` so charts update instantly. Present at least two visualizations: stacked bar for yearly cash flow and line chart for cumulative balance per scenario. Complement charts with tabular comparison summarizing metrics (e.g., first year of deficit, balance at age 65). Provide ability to save/load scenario sets via JSON download/upload and snapshot URLs encoded via base64 when possible. Add an “教育・習い事プリセット” dialog reachable from the Education section so users can pull predefined expense patterns into the current scenario. The preset picker should show cards grouped by school stage (e.g., 小学生 公立, 中学生 私立, 習い事) with description, yearly cost, and duration hints; choosing a preset injects one or more `ExpenseBand` rows that the user can fine-tune afterward. Persist several default presets under `docs/presets/education.json` and expose CRUD hooks for custom presets in localStorage. Extend the conditions editor so retirement age, take-home income, and annual raises are modeled exclusively as `IncomeEvent` entries, enabling multiple job/転職 patterns per resident. Income inputs should accept 万円 units (UI converts to JPY internally) and percentage fields (e.g., raises) show `%` suffixes to clarify expectations. Mirror the preset experience for other sections—housing (マンション/戸建/リノベ), vehicles (ローン/一括, 車種別維持費), living expenses (ライフステージ別生活費), savings/investment strategies (ドルコスト, 積立NISA など), and resident personas (単身, 共働き, ファミリー, シニア)—so each editor can load recommended templates from `docs/presets/*.json` and user-defined collections. Resident presets should bundle age, base income trajectory, dependents, and typical education/expense profiles to accelerate scenario bootstrapping.

Milestone 4 (Validation & UX refinements) adds guardrails: highlight years where balances go negative, allow manual overrides (e.g., reducing income for childcare), and show textual callouts for major events (tuition spikes, retirement). Incorporate responsive design so key info remains accessible on laptops and tablets. Document the workflow under `docs/USER_GUIDE.md` with Japanese/English labels clarifying terminology. Add a living cost scheduler so users can define life-stage specific `LivingExpenseBand` entries (start year/age, end, category such as 食費/保険/光熱費) to reflect changes like育児期 or 介護期; the simulation must aggregate these bands per year similar to education presets.

## Concrete Steps

1. `cd /Users/fooping/python_ws/LifePlanSim && npm create vite@latest app -- --template react-ts` to scaffold the frontend. Expect prompts for project name (accept defaults) and a directory `app/`.
2. `cd app && npm install zustand immer victory chart.js react-hook-form date-fns` to fetch state, immutability, and chart libraries.
3. `npm install -D eslint prettier @types/node @types/react @typescript-eslint/eslint-plugin @typescript-eslint/parser` to enforce consistent code style.
4. Configure ESLint and tsconfig strict mode; add path aliases for `@simulation`, `@components`, `@models`.
5. Implement domain models in `app/src/models/` with files `resident.ts`, `finance.ts`, `scenario.ts`, each exporting TypeScript interfaces.
6. Build the simulation engine module plus unit tests via Vitest: `npm install -D vitest @testing-library/react @testing-library/jest-dom` and create suites under `app/src/simulation/__tests__/`.
7. Construct UI components sequentially: ScenarioList, ScenarioForm, ExpenseBandEditor, SavingsEditor, ComparisonCharts, and SummaryTable.
8. Wire Zustand store in `app/src/store/scenarioStore.ts` to hold scenarios, selected scenario IDs, and derived projections; expose actions for add/remove/duplicate/update.
9. Implement persistence utilities in `app/src/utils/persistence.ts` for localStorage saves and JSON import/export.
10. Build preset dialogs for each major input group:
    - Education preset dialog (`EducationPresetPicker`) plus hook (`useEducationPresets`) that loads built-in presets from `docs/presets/education.json` and user-defined entries.
    - Housing preset dialog for property/ローン/住み替えテンプレート (`docs/presets/housing.json`).
    - Vehicle preset dialog for loan vs 一括購入シナリオ (`docs/presets/vehicles.json`).
    - Living expense preset dialog for `LivingExpenseBand` templates (`docs/presets/living.json`).
    - Savings/investment preset dialog to quickly add貯蓄/投資戦略 (`docs/presets/savings.json`).
    - Resident preset dialog (`docs/presets/residents.json`) covering persona-based defaults (年齢レンジ、収入曲線、家族構成、初期教育バンド) that can seed an entire resident card.
    Each dialog should present cards, filtering controls, and CRUD actions mirroring the education picker so users can load recommended templates or maintain custom libraries.
11. Expand the housing section to support multiple housing/住み替え entries (2回目以降も含む). Each entry must capture its period (start/end age or year) and support both owned housing (mortgage + 管理費/修繕費) and rental/apartment scenarios (rent + fees), plus optional purchase/sale events so the simulation engine can apply costs/proceeds at the right time.
12. Introduce `LivingExpenseBand` modeling in both schema and UI: allow users to add multiple life-stage living cost blocks with start/ end ages, category, and 年間費用 so the engine can vary living expenses over time.
13. Update `app/src/App.tsx` to render layout, forms, charts, and call-to-action for adding scenarios. Use React Router only if multiple views are needed (optional).
14. Polish chart UX to avoid visual overflow/collisions:
    - Reduce the net worth (純資産推移) chart size so it does not clip/overflow its container.
    - Prevent the cash flow tooltip/flyout (キャッシュフローの吹き出し) from overflowing the chart area by clamping/positioning within bounds.
    - Avoid overlap between the net worth y-axis ticks and the unit label “万円” (adjust padding, axis label offset, or layout).
15. Run `npm run lint`, `npm run test`, and `npm run dev` to verify. Record results in `Validation and Acceptance`.
16. Compact the “条件の編集” (ScenarioForm) so the overall state is understandable within a single screen as much as possible:
    - Remove nested scroll traps inside sections/cards (prefer a single scroll container) so users can reach all fields without “scroll inside scroll”.
    - Introduce a dense layout mode for form sections (smaller vertical spacing, tighter cards, reduced label/input padding) via CSS variables and a single wrapper class, rather than per-component one-off tweaks.
    - For high-field groups like “住宅コスト”, use a multi-column grid that adapts to available width/height and add an “詳細” (advanced) fold to hide rarely-changed fields (e.g., 入退去費用 / 売却額) while keeping core numbers visible at a glance.
    - Add a per-section header summary (e.g., totals / key monthly costs) so the collapsed state still communicates the essential values, enabling “scan all sections” on one screen.
    - Verify the layout at the editor panel sizes (`min(1280px, 96vw)` × `min(920px, 94vh)`) and common breakpoints to ensure all primary sections remain usable without excessive scrolling.
17. Standardize ScenarioForm inputs to a grid-based layout for consistent density and scanability:
    - Unify section bodies to use `form-section--grid` (or a new shared grid class) for all input groups (基本情報 / 住宅 / 車 / 生活費 / 貯蓄 / イベント / 住人内サブフォーム), avoiding mixed “grid vs. stacked” layouts that look inconsistent.
    - For list-style editors (住居/車/貯蓄/イベント), render each item card body as a grid (e.g., `collapsible-card__body form-section--grid`) and reserve stacked layout only for free-form text areas or long descriptions.
    - Define responsive grid rules once in CSS (min column width + auto-fit) and reuse everywhere; ensure action rows (preset/add/remove) span full width via a `grid-column: 1 / -1` utility so buttons don’t distort the grid.
    - Introduce a shared “field group” pattern (e.g., `fieldset` + legend or a small heading row) to visually separate logically related numeric inputs inside a grid without adding large padding/margins.
    - Validate keyboard navigation and readability: tab order remains logical, labels stay attached, and no field becomes too narrow on smaller widths (fallback to 1-column when needed).
18. Improve UI scanability with color + icons while keeping the app dependency-light:
    - Add a small internal icon set as inline SVG React components (no external icon library) for section headings and key metrics (住人/住宅/車/生活/貯蓄/イベント/グラフ).
    - Introduce a semantic color system via CSS variables (e.g., `--c-income`, `--c-housing`, `--c-vehicle`, `--c-warning`) aligned with existing chart colors; use it consistently for badges, pills, and section accents.
    - Apply subtle section accents: a left border or header chip color matching the section domain (住宅=green, 車=purple, 教育=orange, 生活=blue, 貯蓄=pink) to visually group related inputs without overwhelming the screen.
    - Add “summary badges” next to section titles (icon + short text) using the same semantic colors; ensure contrast and avoid relying on color alone (icon/text redundancy).
    - Ensure accessibility: `aria-label` for icon-only controls, sufficient contrast ratios, and a “reduced color” fallback (e.g., grayscale mode) by swapping CSS variables.
    - Validate that colors do not clash with the charts and that the compact mode remains readable; keep styling changes localized to `app/src/App.css` (or a dedicated `theme.css`) and small reusable UI components.
19. Refine collapsed section summaries so key values remain visible when sections are folded:
    - Residents: show the number of residents plus the primary resident’s take-home annual income (or total across residents), e.g. `2人 / 手取り 620万/年`.
    - Housing / Vehicles / Living / Savings contribution: format summaries as `月額(年額)` with the annual in parentheses, e.g. `12.0万(144万)`; use consistent rounding and units (`万`).
    - Apply the same pattern across sections: `住宅コスト` (active plan), `車一覧` (sum across vehicles), `生活費` (current year), `積立費` (sum across accounts).
    - Keep summaries short and stable: prefer current/default-year values, avoid long lists, and clamp overflow with ellipsis.
    - Add unit helpers (e.g., `formatManYenMonthlyAnnual`) shared by ScenarioForm so summary formatting is consistent and easy to change.
20. Add monthly living cost inputs and living presets:
    - Switch “生活費” inputs from annual to monthly entry while keeping the stored schema in annual yen (convert `monthly * 12` into `living.*Annual` fields to avoid simulation engine changes).
    - Add a living preset catalog (`app/public/presets/living.json`) plus a preset picker dialog (similar to housing/vehicle/savings) that applies monthly templates into the annual fields.
    - Ensure backward compatibility: existing scenarios with annual living costs display correctly as derived monthly values.
21. Support time-phased living costs (life-stage based changes):
    - Replace single `living` profile with a list of living cost periods (e.g., `livingPlans[]`) each with start/end year offsets (or ages), monthly amounts, and an optional inflation rate override.
    - Update the simulation engine to compute living cost per year by selecting the active living plan for the year (fallback to legacy `living` if plans are absent for backward compatibility).
    - Update the ScenarioForm “生活費” section to manage multiple periods (add/remove/duplicate), with compact summaries showing which years each plan applies; keep monthly entry UX.
    - Extend living presets to optionally insert a multi-period template (e.g., “育児期→通常期”) as well as single-period presets.
    - Migration: on load, auto-convert legacy `living` into a single `livingPlans[0]` entry spanning the full horizon so existing saved data continues to work without user intervention.
22. Enable GitHub Pages deployment (static hosting) for the Vite app:
    - Add a GitHub Actions workflow that builds the app from `app/` and deploys `app/dist` to Pages using `actions/upload-pages-artifact` + `actions/deploy-pages`.
    - Configure Vite `base` for Pages (repository subpath) so assets resolve correctly at `https://<user>.github.io/<repo>/` (use an env-driven base such as `process.env.VITE_BASE` or derive from `GITHUB_REPOSITORY` during CI).
    - Document deployment prerequisites: Pages source “GitHub Actions”, default branch build, and (optionally) custom domain notes in the root `README.md`.
23. Surface a build/version identifier in the top bar and make updates discoverable:
    - Define a single “Build ID” string exposed to the client (prefer `VITE_BUILD_ID`) and embed it into the UI top bar (e.g., `v0.1.0+<short_sha>` or `2025-12-13.1`).
    - Populate `VITE_BUILD_ID` during CI builds (GitHub Actions) from `${{ github.sha }}` (short) and/or run number; keep local dev fallback to `app/package.json` version.
    - Add a lightweight “更新チェック” mechanism:
      - Option A (simple): fetch `./version.json` from the deployed site (generated at build time) and compare to the current Build ID; show a small “更新あり / 再読み込み” pill.
      - Option B (no extra file): poll `ETag`/`Last-Modified` of `index.html` (may be cache/CDN dependent) and prompt reload when changed.
    - For GitHub Pages caching behavior, recommend a “hard refresh” button that calls `location.reload()` and optionally clears Service Worker caches if introduced later.
    - Keep the feature dependency-free; implement as a small `useBuildInfo()` hook + topbar UI badge.
24. Expand JSON import/export workflows (scenario-level and full set):
    - Add “シナリオ単位のJSON書き出し”: export only the currently selected scenario as a single-element `Scenario[]` (or optionally `Scenario`), to simplify sharing/editing one plan.
    - Add “シナリオ単位のJSON読み込み（追記）”: import a JSON file and append scenarios to the existing list (dedupe by `id` with auto-regeneration if conflicts, or prompt to overwrite).
    - Keep “全シナリオ一覧のJSON書き出し”: current `downloadScenarioSet(scenarios)` remains, but ensure the UI label clarifies “全件”.
    - Keep “全シナリオ一覧のJSON読み込み（置換）”: current load flow replaces scenarios; make this explicit in UI and optionally add a confirmation dialog.
    - Validation rules: accept both `Scenario[]` and legacy `{scenarios: Scenario[]}`; normalize defaults via `ensureScenarioDefaults` after import; handle malformed files with a user-friendly error.
25. Make JSON import/export UI clearer (icons + grouping):
    - Replace the four flat buttons with a small “ファイル” or “JSON” action group that is readable at a glance (e.g., 2-column grid or split-menu).
    - Group by intent with clear labels and icons (inline SVG; no new deps):
      - 書き出し（⬇︎ icon）
        - 全件を書き出し
        - 選択中のみを書き出し
      - 読み込み（⬆︎ icon）
        - 追加で読み込み（追記）
        - 置換で読み込み（全件置換・確認ダイアログ）
    - Add short helper text under each action (1 line) to reduce mistakes (e.g., “既存は残す / 既存を消して置き換える”).
    - Keep keyboard accessibility: buttons are real `<button>`, menu (if used) supports focus/ESC, and the hidden `<input type="file">` is triggered from the chosen action.
    - Improve feedback UX:
      - Show which mode was executed in the status line (“書き出し: 全件 / 読み込み: 追加”).
      - On import errors, show a friendly message + expected formats (`Scenario[]` / `{scenarios: []}`).
    - Acceptance: users can correctly choose “追加/置換” without reading docs; visually distinct icons and labels prevent accidental replacement.
26. Add optional slider input for numeric fields (dual input UX):
    - Introduce a small reusable component (e.g., `NumberInputWithSlider`) used across forms where it improves speed/intuition (amounts, ages, rates).
    - UX:
      - Keep the existing numeric input as the source of truth; the slider is an optional secondary control.
      - Provide a compact toggle per field (e.g., “スライダ”) or a global “スライダ表示” switch to avoid clutter.
      - Display the current value with units (万円 / % / 年 / 円) next to the slider; keep rounding consistent with existing 万円入力ルール.
    - Ranges and steps:
      - Define sensible defaults per field type (e.g., 年齢 0–100 step 1, 利率 0–10% step 0.1, 月額(万円) 0–100 step 0.5).
      - Allow per-field override via props so high/low ranges (住宅ローン残高、購入価格など) can be tuned.
      - Add “fine control” behavior: when holding Shift (or a small “微調整” toggle), use smaller step.
    - Integration points (incremental):
      - Start with the most-used fields in `ScenarioForm` (生活費、住宅費、車費、貯蓄積立、年収/昇給率).
      - Expand to expense bands and events where it makes sense (年額、発生年齢/年).
    - State handling:
      - Ensure slider changes use the same onChange path as the input (react-hook-form controlled field) to keep validation and debounce simulation consistent.
      - Clamp values to min/max; show validation errors as currently done.
    - Accessibility:
      - Use native `<input type="range">` with proper `aria-label`, value text, and keyboard support.
      - Keep focus order predictable; do not trap focus inside slider UI.
    - Styling:
      - Compact row layout: label + input + optional slider on the next line within the same grid cell.
      - Use CSS variables or existing tokens; avoid heavy new styles.
    - Acceptance:
      - Users can adjust key numeric fields by dragging without breaking existing manual entry.
      - No regression in calculations (values persisted and imported/exported unchanged).
27. Improve “純資産推移” chart (axis visibility, richer hover, and intro animation):
    - Ensure the Y-axis is fully visible at all viewport sizes:
      - Increase left padding / `domainPadding` for the net-worth chart and avoid clipping of tick labels + unit label.
      - Re-check responsive container sizing so the chart never overflows its parent; prefer using `padding={{ left: ... }}` consistently.
      - Acceptance: Y-axis ticks and the unit label are not cut off in desktop and in the editor overlay.
    - Enhance hover interaction on net-worth chart:
      - On cursor hover, show a vertical guide line at the active year (crosshair).
      - Show a tooltip-like panel that includes:
        - Year
        - Each resident’s age for that year (derived from `agesByResident`)
        - Net worth value formatted as `残高: **百万円` (convert JPY to millions, keep precision reasonable, e.g. 0.1).
      - Implementation approach:
        - Use Victory `VictoryVoronoiContainer` (or existing container pattern) to capture hover and compute nearest datum.
        - Render a `VictoryLine` for the vertical guide line using the hovered x, and a small absolutely-positioned overlay for the tooltip to avoid SVG clipping.
      - Acceptance: Hovering any point/year shows the guide line + ages + net worth in 百万円 without overflowing.
    - Add left-to-right reveal animation when the chart is shown:
      - Use Victory’s `animate` prop (if applicable) for line drawing, or implement a simple clip-path mask that expands from left to right on mount.
      - Respect reduced motion: disable animation when `prefers-reduced-motion: reduce` is set (or when “色を抑える” mode is enabled if you choose to reuse that).
    - Acceptance: On opening the results tab, the net-worth line reveals smoothly; no jank; reduced-motion users see no animation.
28. Add “職業/キャリア” modeling for residents (job-based income phases, job changes, and pension switch):
    - Goal: Make `手取り年収`, `退職年齢`, `年次上昇率` configurable per “職業” and allow transitions such as job changes (転職) and switching to pension income.
    - Data model (minimal, backward-compatible):
      - Add `Resident.jobs?: JobPhase[]` where each phase defines:
        - `id`, `label` (e.g., “会社員”, “公務員”, “自営業”, “年金”)
        - `startAge` / `endAge?`
        - `netIncomeAnnual` (base take-home for the phase)
        - `annualGrowthRate` (phase-specific growth)
        - Optional: `bonusAnnual?`, `retirementAllowance?` (if you want to model separately later)
      - Keep legacy fields `baseNetIncome`, `annualIncomeGrowthRate`, `retirementAge` for existing saved data:
        - Migration: on load, if `jobs` is missing, synthesize a single phase from legacy values (start at currentAge, end at retirementAge).
    - Presets / selection UX:
      - Provide a small “職業テンプレート” catalog (JSON + hook) similar to other presets:
        - 会社員（昇給あり）, 公務員（安定）, 自営業（変動少）, パート, 無職, 年金受給
      - In the 住人カードに “職業/キャリア” セクション:
        - Add button: “職業を追加” / “プリセットから追加”
        - Each job phase is a compact card row (start/end age, 年収, 上昇率) with optional slider support.
        - Add “転職” UX: duplicate current phase and set next startAge = previous endAge + 1.
        - Add “年金に切り替え” shortcut: append a “年金” phase starting at a chosen age with configurable pension amount and (usually) 0% growth.
    - Simulation engine changes:
      - Update income computation to use active `jobs` phase for each year:
        - Determine age per resident per year; select the phase where `startAge <= age <= endAge` (or last started if endAge omitted).
        - Income = phase.netIncomeAnnual grown by phase.annualGrowthRate since phase start.
      - Retire/stop salary is naturally modeled by phase end; pension modeled by a “年金” phase.
      - Keep existing `incomeEvents` as additive adjustments on top of job phase income (bonuses, one-offs).
    - Validation rules:
      - Prevent overlapping phases; ensure phases cover at least currentAge..horizon (or allow gaps that yield 0 income).
      - Provide inline warnings when `startAge > endAge` or when phases overlap.
    - Import/export and snapshots:
      - Include `jobs` in scenario JSON (already works via plain objects).
      - Ensure migration keeps old JSON files valid.
    - Acceptance:
      - A resident can represent: “会社員(35–45) → 転職(46–60) → 年金(65〜)” with different net income/growth.
      - Charts/tables update correctly and no legacy scenarios break.
29. Clarify “口座間の役割” (account roles + contribution/withdraw rules + grouped UI):
    - Goal: Help users understand what each account is for (生活防衛資金/目的別/長期投資など) and what happens during deficits and contributions.
    - Data model changes (backward-compatible):
      - Add `SavingsAccount.role?: AccountRole` where `AccountRole` is an enum/string union:
        - `emergency` (生活防衛資金/現金・預金)
        - `short_term` (短期目的/積立)
        - `goal_education`, `goal_house`, `goal_other` (目的別資金)
        - `long_term` (長期投資/株)
      - Add optional rule fields (can be derived from role defaults if omitted):
        - `contributionPolicy?: 'fixed' | 'surplus_only'`
        - `minBalance?: number` (emergency floor)
        - `withdrawPolicy?: 'never' | 'last_resort' | 'normal'`
      - Migration: if missing, infer role from existing `type`:
        - `deposit` → `emergency` (or `short_term` depending on label)
        - `investment` → `long_term`
        - Auto-set `withdrawPriority` defaults from role (emergency first, long_term last).
    - UI (貯蓄口座一覧) changes:
      - Group accounts by role with section headers + icon/color:
        - Emergency / Goals / Long-term
      - Each account card shows a compact “役割タグ” + one-line rules summary in collapsed view:
        - e.g., “生活防衛資金 / 最低残高 200万 / 赤字補填=優先”
      - Add a role selector and quick role presets:
        - “生活防衛資金にする”, “長期投資にする”, “教育資金にする”
      - Keep advanced controls under “詳細” (minBalance, policies) to avoid clutter.
    - Simulation behavior (make roles meaningful):
      - Contribution ordering:
        - Option A: Expenses first → then contributions (surplus-only means contribute only if `cashOnHand > 0`).
        - Option B: Maintain emergency buffer first (top up emergency to minBalance) → then allocate to other contributions.
      - Deficit handling:
        - Withdraw from `emergency` down to `minBalance`, then `short_term/goal`, and only then `long_term` (last resort).
        - Respect `withdrawPolicy: never` to prevent auto-selling long-term investments unless explicitly allowed.
      - Keep current `withdrawPriority` for power users, but role defaults should cover typical cases.
    - Reporting / explainability:
      - In yearly events, log “生活防衛資金から取り崩し”, “投資口座を取り崩し(最後の手段)” etc.
      - Add small legend text near results explaining the withdrawal order.
    - Acceptance:
      - Users can immediately see which account is “生活防衛資金” vs “株(長期投資)”.
      - In a deficit scenario, withdrawal order matches the role rules and the UI makes this predictable.
30. Fix mobile layout (スマホ画面でも正しく表示):
    - Goal: Small screens (iPhone/Android) でも、結果/編集/ダイアログが崩れず操作できる状態にする。
    - Audit (現状把握):
      - 主要画面（シナリオ一覧、条件編集、結果タブ、JSON入出力、共有リンク、プリセット）を 360×800 前後で目視確認。
      - クリック不能・横スクロール・固定ヘッダ重なり・ツールチップはみ出し等をリスト化し、優先順位を付ける。
    - CSS/レイアウト対応:
      - レイアウトの基本方針: 2カラム→1カラム（左=編集、右=結果）へ自動切替。
      - `overflow-x` の原因（長いラベル/数値/チップ/ボタン行）を潰す:
        - 省略表示（ellipsis）、折返し、ボタンを縦積み、アイコン化（既存アイコン流用）を検討。
      - `position: sticky` / `max-height` / `100vh` の扱いを見直し:
        - iOS Safari のアドレスバー変動を考慮し、必要に応じて `100dvh` を採用。
        - Safe area (`env(safe-area-inset-*)`) をパネル余白に反映。
    - Charts/Tooltip:
      - グラフは横スクロールを最小化しつつ、最低限の可読性（軸/凡例/ホバー情報）を維持。
      - Tooltip はスマホで「タップで固定/もう一度タップで解除」等の挙動も検討（hover 依存を減らす）。
    - Acceptance:
      - 360px 幅で横スクロールなし（チャートの意図的 `overflow-x: auto` を除く）。
      - 主要操作（追加/削除/折りたたみ/保存/インポート/共有リンク/結果閲覧）が指で実行できる。
31. Make the condition editor mobile-friendly (条件編集画面をスマホでも入力可能に):
    - Goal: スマホで「入力しやすい」「迷わない」「指で操作できる」編集体験にする。
    - Form UI改善（入力体験）:
      - 1行の入力密度を調整:
        - ラベルと入力を縦積みに切替（小画面時のみ）。
        - 数値入力は `inputMode` を適切に設定（円/年齢/%）。
      - スライダ入力（既存）をスマホ前提で調整:
        - スライダを常に十分な幅に確保し、値表示は別行/固定幅でレイアウト崩れを防止。
      - 行内ボタンの最適化:
        - 「プリセットから追加」「追加」「削除」などを、スマホではアイコン+短文、またはメニュー化。
    - ナビゲーション:
      - セクションジャンプ（アンカー）をスマホではドロップダウン化/固定フッタにする等で迷子を減らす。
      - 折りたたみカードのサマリを強化（重要値の表示）して、開かなくても全体把握できるようにする。
    - Validation/Feedback:
      - エラー表示が画面外に行かないよう、カード内の近接位置に表示。
      - 連続入力の邪魔にならないトースト/控えめなガイドを使用。
    - Acceptance:
      - スマホで「住人/住宅/車/生活費/貯蓄/イベント」を最後まで入力してシミュレーションできる。
      - 主要操作のタップ領域が十分（最小 44px 目安）で、誤タップが減る。
32. Integrate with ChatGPT/Gemini UI via copy/paste (APIキー不要のUI連携):
    - Goal: BYOK/サーバ運用なしで、ChatGPT/Gemini等の既存UIを使って条件（Scenario JSON）を生成できるようにする。
    - UX（基本フロー）:
      - 条件編集画面に「AIで作成（コピー&貼り付け）」ボタンを追加。
      - モーダル内で以下を提供:
        - ① ユーザー入力（自然文の要望）欄
        - ② “AIに渡す指示文” の自動生成プレビュー（テンプレ）
        - ③ 「コピー」ボタン（クリップボードへコピー）
        - ④ “AIの回答(JSON)” 貼り付け欄
        - ⑤ 「検証」→「新規シナリオとして追加」/「現在に追記」/「上書き適用」
      - 失敗時: JSONパース/スキーマ不一致の理由を表示し、再貼り付けや手修正へ誘導。
    - プロンプト（指示文）テンプレ設計:
      - 目的: “余計な文章を出さず、JSONだけ返す” を強制する。
      - 含めるもの:
        - 「返答はJSONのみ」「コードフェンス禁止」「日本円は円（number）」等の制約
        - Scenarioの最小スキーマ（必須/任意、型、単位、例）
        - 既存ドメインルールの要点:
          - 生活費は年額/期間、教育費は住人教育費に入れない等
          - 貯蓄口座 role（生活防衛/目的別/長期投資）と推奨初期値
      - 生成対象の選択:
        - Option A: Scenario 1件（完全なScenarioを生成）
        - Option B: “差分パッチ”（既存Scenarioに追記/上書きしやすいPartial生成）
    - JSON検証/正規化:
      - 既存の import/migration と同様に、取り込み前に必ず正規化:
        - 既定値補完（id付与、未指定フィールドのデフォルト）
        - 数値範囲のクランプ（年齢/利率/金額など）
        - 互換: `{scenarios: []}` 包装の受理、古い形式の補正（既存パスを再利用）
      - スキーマ不一致のとき:
        - どのキーが不足/型違いかをリスト表示
        - 自動修正候補（例: “万円入力っぽいので円に換算しますか？”）は段階的に導入
    - 実装ポイント:
      - クリップボード: `navigator.clipboard.writeText` を優先し、失敗時は手動コピー用の選択UIを用意。
      - サンプル/テンプレ管理: `docs/` か `app/src/utils/` にプロンプト雛形を置き、将来更新しやすくする。
      - UI導線: 既存のJSON入出力UI（エクスポート/インポート）と近い場所に配置し、迷わないようにする。
    - プライバシー/注意書き:
      - ChatGPT/Geminiに貼り付けた内容は各サービス側に送信される旨を明示。
      - 「個人情報を含めない」ガイドと、送信前プレビュー（実際にコピーされる文字列）を表示。
    - Acceptance:
      - APIキーなしで、ChatGPT/Gemini UIを使ってScenario JSONを生成→貼り付け→追加/適用できる。
      - 不正な出力でも白画面にならず、エラー理由が分かる。
33. Provide AI prompt template presets (AIで条件生成用テンプレートを複数用意):
    - Goal: ユーザーが「何を書けば良いか分からない」問題を解消し、ChatGPT/Geminiでの生成品質と再現性を上げる。
    - Template方針:
      - 「自由入力」ではなく、よくあるケースの“質問票形式”テンプレを複数用意し、コピペでそのまま使える。
      - 出力は既存の “厳格な出力テンプレ（JSONのみ）” と併用し、入力側だけを改善する（BYOK不要）。
      - テンプレ内で単位（円/万円/月/年）と不明時の推定方針（0にしない）を明記。
    - 用意するテンプレ例（初期セット）:
      - Template A: 共働き+子ども（教育費推定あり、住宅ローンあり、車買い替えあり）
      - Template B: 単身（賃貸/持ち家どちらも、貯蓄と投資口座の役割分け）
      - Template C: 夫婦のみ（子なし、住宅/車あり、退職金・年金移行を明示）
      - Template D: 子ども3人以上（教育費と生活費が段階で変わる想定を促す）
      - Template E: 住み替えあり（賃貸→購入 / 購入→売却→賃貸 など、housingPlansの期間入力を促す）
    - データ実装:
      - `app/public/presets/ai-prompt-templates.json` を追加し、以下の形で管理:
        - `id`, `title`, `description`, `requestTemplateText`（ユーザーが埋める入力文テンプレ）
      - 将来拡張: `localStorage` にユーザー独自テンプレを保存できる仕組み（任意）。
    - UI実装（AiScenarioDialog）:
      - 「要望」欄の上にテンプレ選択（select）を追加。
      - 選択時に “要望テキスト” にテンプレを挿入（既存入力がある場合は確認ダイアログ）。
      - 「コピー」時は、選択テンプレ + ユーザー記入内容を、現在の指示文テンプレに組み込んで出力。
      - スマホ向け: テンプレ選択とコピー導線を最上部に配置して迷いを減らす。
    - 互換/品質:
      - 既存のsanitize（“ ” 自動変換）とJSON検証導線は維持。
      - テンプレに合わせて指示文側の “不足時の推定” を一貫させる（0にしない/未定は推定）。
    - Acceptance:
      - テンプレから入力→コピー→ChatGPT/Gemini→貼り付け→検証→追加/上書きが一連で迷わず行える。
      - テンプレAで生成したJSONが、子ども住人/教育費帯/住宅費/車買い替え/貯蓄口座が欠けにくい。
34. Add a guided “wizard” input UI (画像のような優しい入力UI):
    - Goal: 初見でも迷わず入力できる「ステップ式（ウィザード）」編集画面を用意し、スマホでもストレスなく入力できるようにする。
    - UXコンセプト（画像の要素）:
      - 上部: ステップ進行バー（完了/入力中の状態が分かる）
      - 左: セクションに合わせたイラスト（親しみやすい）
      - 右: 必須入力を最小限に絞ったフォーム
      - 「おまかせ設定で入力」トグル（平均的な値を自動入力/推定）
      - 下部: 「戻る」「次へ進む」ボタン
    - 画面構成:
      - Wizardは“既存の詳細編集（ScenarioForm）”とは別モードとして提供:
        - 条件編集画面に「かんたん入力」「詳細編集」の切替を追加（デフォルトはスマホで“かんたん”）
        - 既存の詳細編集は残し、パワーユーザー/微調整はそちらで対応
      - ステップ定義（例）:
        1) 基本情報（開始年/初期現金）
        2) 住人（夫/妻/子の追加、年齢、年収、退職/退職金）
        3) 住宅（賃貸/持ち家、ローン/家賃、管理費/修繕/税）
        4) 車（現車、年間維持費、買い替え）
        5) 生活費（現状 + 期間での増減）
        6) 貯蓄/投資（役割別に初期残高・積立）
        7) 追加イベント（任意）
        8) 確認（要約と差分、結果のプレビュー導線）
    - “おまかせ設定”の実装:
      - ステップ単位のトグル（住宅だけ/車だけ など）を基本にし、ON時は:
        - 未入力の項目に代表値を補完（0を減らす）
        - 入力から推定（例: 生活費=月額×12、子の学年→年齢→教育費帯の自動生成）
      - 推定は “上書きしない” が原則:
        - 既に入力済みの値は維持し、空欄/0のみ補完（必要なら「再推定」ボタン）
      - 推定ロジックは関数化してテスト可能に:
        - `app/src/utils/estimates/*` に集約（住宅管理費/修繕、退職金目安、車の維持費、教育費帯など）
    - UIコンポーネント設計:
      - `WizardEditor`（モード切替/ステップ状態/次へ戻る）
      - `WizardStepper`（進捗UI: 完了/現在/未）
      - `WizardCard`（左イラスト+右フォーム+トグル+ナビ）
      - 既存の `YenInput` / `SliderControl` を再利用しつつ、かんたんモードでは項目数を絞る
    - 状態管理:
      - “完了”状態はシナリオ入力の妥当性から算出（例: 住人が1人以上、生活費が0でない等）
      - Wizard UIの一時状態（現在ステップ、トグルON/OFF）は localStorage（または Zustand UI slice）に保存（シナリオとは分離）
    - スタイル/アクセシビリティ:
      - スマホ優先レイアウト（1カラム、ボタンは固定フッタも検討）
      - ステッパーとトグルはキーボード操作/ARIA対応
      - イラストはSVG（既存アイコン拡張 or 新規 `app/src/components/illustrations/*`）
    - 段階導入（最短で価値が出る順）:
      1) Wizard骨組み + ステッパー + 次へ/戻る（中身は既存セクションの簡易版）
      2) 住宅/車/生活費の“おまかせ”補完（0削減に効く）
      3) 住人（子の追加 + 教育費帯の自動生成）
      4) 貯蓄（役割別の初期口座作成と代表値補完）
      5) 確認画面（要約/編集へのリンク）
    - Acceptance:
      - スマホでウィザードだけを使って一通り入力→結果表示まで到達できる。
      - “おまかせON”で、住宅の管理費/修繕/税、退職金、車維持費、教育費帯が 0 のままになりにくい。
      - 詳細編集に切り替えても同じシナリオが壊れず、値の往復ができる。
35. Add “キャッシュフロー” waterfall visualization (ウォーターフォール図風の内訳表示):
    - Goal: 年ごとのキャッシュフロー（収入→支出内訳→差引）を「何が効いているか」直感的に把握できるようにする。
    - UX（段階導入）:
      - Phase 1: 既存のキャッシュフロー図（時系列）に「年選択」を追加し、選択した1年の内訳を右側（または下）に “ウォーターフォール” で表示。
        - Year picker: グラフ上のクリック/ホバー、またはスライダー/セレクトで `year` を選べる。
        - Waterfall panel: `0 → 収入(+) → 支出カテゴリ(-) → 純増減(=netCashFlow)` をステップ表示。
      - Phase 2: シナリオ比較（2本以上）時は、同一年でシナリオごとに小さなウォーターフォールを並べて差分が分かるようにする（最大2〜3列）。
      - Phase 3（任意）: “純資産” も含めて `期首残高 → 年間純増減 → 期末残高` の補助ウォーターフォールも表示し、資産推移の理由付けを強化。
    - Data/計算:
      - 入力: `Projection.yearly[]` の `YearlyBreakdown` を利用（すでに `income`, `expenses.{living,education,housing,vehicle,other,savingsContribution}`, `netCashFlow` がある）。
      - Waterfall用の段（segments）を生成する純関数を追加:
        - `buildCashFlowWaterfall(year: YearlyBreakdown): Array<{ key: string; label: string; delta: number; start: number; end: number }>`
        - `delta` は収入は正、支出は負。`start/end` は累積（0起点）で計算。
      - 表示順序（例）:
        - 収入（+）
        - 生活費 / 教育 / 住宅 / 車 / その他 / 貯蓄積立（-）
        - 差引（netCashFlow）を “合計バー” として強調（色・ラベル）
      - 表示上の注意:
        - マイナス方向のバー/ラベルの可読性（0線、負側のラベル位置、桁あふれ対策）。
        - 単位は `万円` 表示（ツールチップは `円` + `万円` 併記でも可）。
    - UI/実装方針（Victory前提）:
      - `VictoryBar` を “floating bar” として使い、各段に `y0`（start）と `y`（end）を持たせる（正負両対応）。
      - 0ラインは `VictoryLine` で明示し、カテゴリ色は既存のCSS変数（`--c-income` など）に揃える。
      - Hover/tooltip は SVG clipping を避けるため、既存と同様に absolutely-positioned overlay を検討。
      - “年選択” 状態は UI state（ZustandのUI slice か local state）に保持し、シナリオ切替でも破綻しないようにする。
    - 受け入れ基準:
      - キャッシュフロー図から年を選ぶと、同年の内訳が即座にウォーターフォール表示され、各段の金額が確認できる。
      - マイナス年（赤字）でも見切れず、0線を跨いだ表現が破綻しない。
      - 複数シナリオでも同一年の比較ができ、「どの費目が差を作っているか」が分かる。
      - `prefers-reduced-motion: reduce` では過度なアニメーションを無効化する。
36. Make charts “feel premium” (純資産推移 / キャッシュフロー / ウォーターフォールを統合したいけてるUI):
    - Goal: 3つの可視化を「迷わず・気持ちよく」行き来でき、年選択・比較・根拠（内訳）が一貫して見える結果画面を作る。
    - IA / レイアウト:
      - Resultsは “1画面=1ストーリー” にする:
        - 上: KPIバー（最終純資産 / 赤字開始年 / 収支ピーク / 重要イベント数 など、クリックで該当年へジャンプ）
        - 中: 2カラム（左=主グラフ、右=詳細パネル）
          - 左: `純資産推移` と `キャッシュフロー` をタブ切替（タイトル+ヘルプは共通）
          - 右: “選択年パネル” を固定表示（年/年齢/差引/内訳ウォーターフォール/イベントログ）
        - 下: 補助情報（凡例、注意書き、比較サマリーへの導線）
      - スマホ: 1カラム化し、右パネルは “下にスライドする詳細” or “モーダル（内訳を見る）” に切替。
    - Interaction（年選択を共通状態に）:
      - `selectedYear` を “結果画面の共通state” にする（グラフ間で同期）:
        - 純資産: カーソル移動/クリックで年選択（クロスヘア+ツールチップパネルは画面内で完結）
        - キャッシュフロー: クリック/タップで年選択（吹き出しは基本OFF、必要なら右パネルで表示）
        - ウォーターフォール: 常に `selectedYear` の内訳を表示（年が変わると即更新）
      - 年選択の補助:
        - 年セレクト（select/slider）＋ “次/前” ボタン（±1年）
        - 赤字年/イベント年はマーク（dot/badge）して飛べる
    - Waterfall UX（“根拠”を強く）:
      - 右パネルに “年の内訳（ウォーターフォール）” を常時表示（PC）:
        - 収入（+）→ 支出カテゴリ（-）→ 差引（合計バー）
        - 差引が赤字のときはバー/ラベルを警告色に
      - “貯蓄残高” の見せ方（任意拡張）:
        - 右パネルに小さな補助カードで `期首残高 / 差引 / 期末残高` を表示（純資産推移の説明になる）
        - 可能なら `savingsByAccount` のトップ2口座と変化量も表示
    - Visual design（いけてる見た目の指針）:
      - 一貫した色システム:
        - `収入=緑 / 支出=カテゴリ色 / 差引=黒 or 赤 / 0ライン=薄い境界色`
        - CSS変数で管理し、凡例・バッジ・ウォーターフォールの合計バーに同じ色を使う
      - “余白と整列”:
        - 見出し（h3/h4）と数値のタイポを統一（数字は tabular-nums）
        - 右パネルはカード化し、スクロールしても選択年が分かるヘッダー固定
      - Motion:
        - 純資産は軽いリビール、年選択時は 100–150ms の控えめなハイライトのみ
        - `prefers-reduced-motion: reduce` では全停止
    - Accessibility / 操作性:
      - キーボード: 左右キーで年移動、Enterで固定、Escで選択解除（任意）
      - スクリーンリーダ: `aria-live` で選択年と差引を読み上げ（過剰更新は避ける）
    - Performance / 安定性:
      - 再計算を抑える: `selectedYear` 依存のウォーターフォール計算は `useMemo` で局所化
      - レイアウト崩れ対策: SVGの横溢れは `overflow-x: auto` で吸収し、軸ラベルは切れないpadding
    - Acceptance:
      - 3つの可視化が「年」で連動し、どの年が選択中かが常に分かる。
      - キャッシュフロー棒をクリックすると右側（or モーダル）にウォーターフォールが即表示される。
      - スマホでも結果が追える（横スクロール最小、必要ならモーダルに退避）。

## Validation and Acceptance

Run commands from `LifePlanSim/app`:

    npm run lint
    npm run test
    npm run dev

- `npm run lint` confirms ESLint passes (verified 2025-02-14).
- `npm run test` executes Vitest (1 file / 4 tests) covering income growth, expenses, and savings behaviors.
- `npm run dev` serves `http://localhost:5173/`; use it to duplicate scenarios, tweak resident events, confirm charts/tables update instantly, and exercise JSON import/export plus snapshot link copying. Negative-balance years highlight in the chart info panel.

## Idempotence and Recovery

The simulator runs entirely on local assets, so re-running `npm run dev` is safe. Scaffolding commands can be rerun after deleting the `app/` directory; avoid partial installs by running `rm -rf app/node_modules` followed by `npm install` if dependencies break. Because persistence relies on localStorage, provide a “Reset Data” action that wipes stored scenarios to recover from corrupted state. Keep simulation functions pure so restarting the dev server or refreshing the browser cannot corrupt data.

## Artifacts and Notes

Maintain sample scenario definitions in `docs/samples/baseline.json` showing two residents (e.g., parents) with staged expenses for 小学生 through 大学院生 periods and lump-sum retirement income. Store illustrative output snippets to aid future debugging, for example:

    Year 2035 (Age 45): Income 7.2M JPY, Expenses 5.8M JPY (Education spike), Net +1.1M JPY, Savings Deposit 0.5M JPY @ 1.2% -> Balance 8.3M JPY

Document Japanese labels alongside English equivalents in UI strings to keep terminology consistent (e.g., `習い事 (Extracurricular Lessons)`).

## Interfaces and Dependencies

Define the following TypeScript interfaces.

    export interface Resident {
      id: string;
      name: string;
      currentAge: number;
      retirementAge: number;
      baseNetIncome: number;
      annualIncomeGrowthRate: number;
      incomeEvents: IncomeEvent[];
      expenseBands: ExpenseBand[];
    }

    export interface IncomeEvent {
      id: string;
      label: string;
      triggerAge: number;
      amount: number;
      type: 'bonus' | 'reduction' | 'raise' | 'retirement';
    }

    export interface ExpenseBand {
      id: string;
      label: string;
      startAge: number;
      endAge: number;
      annualAmount: number;
      category: 'education' | 'housing' | 'vehicle' | 'living' | 'lessons';
    }

    export interface HousingProfile {
      builtYear: number;
      mortgageRemaining: number;
      monthlyMortgage: number;
      managementFeeMonthly: number;
      maintenanceReserveMonthly: number;
    }

    export interface VehicleProfile {
      purchasePrice: number;
      loanRemaining: number;
      monthlyLoan: number;
      inspectionCycleYears: number;
      inspectionCost: number;
      maintenanceAnnual: number;
      parkingMonthly: number;
    }

    export interface SavingsAccount {
      id: string;
      label: string;
      type: 'deposit' | 'investment';
      balance: number;
      annualContribution: number;
      annualInterestRate: number;
      adjustable: boolean;
    }

React components should accept these interfaces as props, and the simulation engine should expose `simulateScenario(scenario: Scenario, options?: SimulationOptions): Projection` plus `compareScenarios(scenarios: Scenario[]): ScenarioComparison`. Chart components should depend on Victory’s `<VictoryChart>` and `<VictoryLine>` for readability. Keep dependencies minimal; do not introduce backend code since all calculations run in the browser.

---
Revision 2024-05-16: Initial ExecPlan drafted to capture requirements for the interactive household finance simulator per user request.
Revision 2025-02-14: Plan updated after implementation to record progress, surprises, decisions, and validation evidence.

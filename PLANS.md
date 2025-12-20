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
- [x] (2025-12-15) Added first-launch onboarding: auto-open “かんたん入力” wizard with quick entry options (wizard / JSON import / AI).
- [x] (2025-12-19) Added attribute-based preset recommendations (2〜3問→おすすめ→新規シナリオ作成→ウィザードで上書き).

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

37. Open “かんたん入力ウィザード” on initial launch (初期起動でウィザードを自動表示):
    - Goal: 初回起動時にユーザーが迷わず入力を開始できるよう、結果画面ではなく「かんたん入力ウィザード」を自動で開く。
    - 表示条件（初期案）:
      - 初回起動のみ自動表示（localStorageでフラグ管理）。
      - 例外: すでにユーザーが「閉じる」した後は自動表示しない（ユーザーの意思を尊重）。
      - 例外: URLスナップショット（`#snapshot=` 等）で読み込んだ場合は自動表示しない（共有リンク閲覧を妨げない）。
    - UI/導線:
      - 起動直後に編集オーバーレイを開き、入力モードは `wizard` を選択した状態にする。
      - 画面幅が狭い（例: max-width 900px）場合は既存方針どおり `wizard`、広い場合も初回は `wizard` を優先。
      - ウィザード内に「閉じる / あとで入力する」導線を残し、閉じたらフラグを保存。
      - 既存の上部「条件を編集」ボタンでいつでも再度開ける（現状維持）。
      - 任意: もう一度表示したい人向けに「初回ガイドを再表示」トグル/ボタンをどこかに用意（設定 or 条件編集内）。
    - 実装方針:
      - `App.tsx` に初回起動判定を追加:
        - `lifePlan.onboarding.dismissed.v1` のようなキーで `dismissed=true` を保存。
        - `useEffect` で初回のみ `setEditorOpen(true)`, `setEditorTab('form')`, `setEditorMode('wizard')` を実行。
      - 共有リンク判定:
        - 既存の `extractSnapshotFromLocation()`（`@utils/persistence`）を流用し、snapshotが存在する場合は自動表示を抑止。
      - 閉じる時の挙動:
        - 既存の閉じるボタン/`WizardEditor.onClose` 経由で `dismissed=true` を保存（少なくとも「初回自動表示」は止める）。
    - Acceptance:
      - 初回起動で自動的に「かんたん入力」が開き、すぐ入力開始できる。
      - 閉じた後の再訪では勝手に開かない。
      - 共有リンク（snapshot）を開いたときは勝手に開かず、結果閲覧ができる。
      - `npm run lint`, `npm test` が通り、`npm run build`（CI）でも型エラーが出ない。

38. Show “読み込み(インポート)” と “AIで作成” を初期起動ガイドに含める:
    - Goal: 初回起動で「入力する」以外の開始方法（読み込み / AIで作成）も同時に提示し、ユーザーが最短で目的に到達できるようにする。
    - 体験設計（初回のみ）:
      - 起動直後は編集オーバーレイを開き、上部に「開始方法」セクションを追加:
        - かんたん入力（ウィザードを開く）…推奨（Primary）
        - 読み込み（JSON/ファイル）…既存のインポートUIへ誘導（Secondary）
        - AIで作成（コピー&貼り付け）…既存のAIダイアログへ誘導（Secondary）
      - それぞれ1行の説明（何ができるか/必要なもの）を付ける（迷いを減らす）。
    - 実装方針:
      - `App.tsx`:
        - 初回起動時の `editorTab` は `form` のまま開く（既存構成を維持）。
        - 初回ガイド用に `editorMode` を `wizard` に設定しつつ、ガイドパネル（開始方法）を表示できるフラグを追加。
      - `WizardEditor`（またはWizard用のラッパー）:
        - 上部に「開始方法」カードを表示（初回のみ/または “ガイド表示” がONのとき）。
        - 「読み込み」ボタン:
          - 既存の読み込み導線（ScenarioList側のインポートUI）へジャンプするため、`onSwitchToList` を新設して `editorTab='list'` に切替。
          - 可能なら “読み込み（追加/置換）” の説明も表示（事故防止）。
        - 「AIで作成」ボタン:
          - 既存のAIダイアログを開くコールバックを受け取る（`onOpenAiDialog`）。
          - 既存UIがScenarioList側にある場合は `editorTab='list'` へ切替してからAIを開く（2段階でも良い）。
      - 状態保存:
        - 初回ガイドの非表示フラグは 37 と同じ `lifePlan.onboarding.dismissed.v1` でまとめて扱う（分岐を増やさない）。
    - Acceptance:
      - 初回起動で「かんたん入力」だけでなく「読み込み」「AIで作成」の導線が画面内に見える。
      - 「読み込み」を押すと読み込み操作ができる画面へ到達できる（最低限一覧タブへ移動）。
      - 「AIで作成」を押すとAI作成画面へ到達できる（ダイアログが開く/またはAIセクションへスクロール）。
      - 2回目以降は自動表示されず、必要なら任意で再表示できる。

39. Apply “とっつきやすさ” のエッセンスをLifePlanSimに反映（入口の明確化 / 不安解消 / 読む量削減）:
    - Goal: 初見ユーザーが「何をすれば良いか」が3秒で分かり、最短で入力〜結果確認まで到達できるようにする（Nani翻訳の導線設計を参考にする）。
    - 入口を3択に固定（Start options）:
      - 開始方法（かんたん入力/JSON読み込み/AIで作成）は “入力モード（かんたん/詳細）” より上位の概念として扱う（タブの中に閉じ込めない）。
      - 初期起動ガイドと編集画面の上部に、開始方法を常設（または目立つ導線を常設）:
        - ① かんたん入力（推奨）: 「3分で最低限の条件を入れて結果を見る」
        - ② JSON読み込み: 「以前のデータ / 共有JSONを取り込む」
        - ③ AIで作成: 「ChatGPT/Geminiで生成→貼り付け」
      - 各ボタンに “必要なもの/できること” を1行で添える（迷いを減らす）。
    - UI配置（開始方法カードの置き場所）:
      - 編集オーバーレイのヘッダー直下（`App.tsx` の editor panel 内）に “開始方法” を表示する。
      - 初回起動時は説明を厚めにし、通常時はコンパクト表示にする（1行説明 + 3ボタン）。
      - 既存の「かんたん入力 / 詳細」タブは “入力中の編集モード切替” として残す。
      - クリック時の遷移:
        - かんたん入力: `editorTab='form'`, `editorMode='wizard'`
        - JSON読み込み: `editorTab='list'`（必要なら読み込みセクションにスクロール/強調）
        - AIで作成: `editorTab='list'` + AIダイアログを開く
      - “あとで” は初回ガイド時のみ表示し、閉じたら自動表示しない（既存方針維持）。
    - 価値訴求を短文化（Top message）:
      - ヘッダー直下 or 初期ガイド内に、1文の価値（例: 「赤字の年と原因が一目で分かる家計シミュレーター」）+ 3ステップ説明（例: 「入力 → 年を選ぶ → 内訳を見る」）を表示。
      - 「結果を見る」導線は常に見える（編集完了画面だけでなく、編集オーバーレイ上部にも配置検討）。
    - 不安の先回り（Trust & Safety）:
      - 初期ガイドに “データは端末内(localStorage)に保存” を明記し、共有リンクは “URLに情報が入るため取扱注意” を注記。
      - 詳細は `/help` 的なセクション（既存のREADME/ヘルプ導線）へリンク。
    - 読む量を減らすUI（Progressive disclosure）:
      - かんたん入力は「必須最小」→「任意詳細」を折りたたみで段階表示（今のWizard構成を維持しつつ、補足説明は help text へ寄せる）。
      - 単位・期間が誤解されやすい項目は常時ラベル（万円/月/年）を表示し、入力欄の横で固定化する。
    - 次のアクション提示（Next actions）:
      - 結果画面に「次にやること」カード（例: シナリオ複製して比較 / 赤字開始年へジャンプ / 生活費を±10%で比較）を追加。
    - 実装ポイント（候補）:
      - `app/src/App.tsx`: 初期ガイド/開始導線の配置、説明文の追加。
      - `app/src/App.tsx`: 開始方法カードの表示・クリック時の遷移（wizard/list/AI）を集約する。
      - `app/src/components/WizardEditor.tsx`: ウィザード内の開始方法カードは撤去し、入力ステップに集中させる。
      - `app/src/components/ScenarioList.tsx`: 読み込み/AIセクションの強調（任意）。
      - `app/src/components/ScenarioResultsTabs.tsx`: 次のアクションカード（結果→行動）導線。
      - `app/index.html`: description/OG等の整備（SEO/共有時の信頼感補強）。
    - Acceptance:
      - 初回起動で「何をすれば良いか」が迷わず分かる（開始3択が見える）。
      - “保存場所/共有の注意” が見えて不安が減る。
      - 入力完了後に「次に何をするか」が提示される。
      - `npm run lint`, `npm run test`, `npm run build` が通る。

40. Recommend presets from minimal user attributes (属性ベースのおすすめプリセット):
    - Goal: 初回起動で「数字がないと何も始まらない」感をなくし、ユーザーが“未来図を見ながら”自分の条件へ段階的に近づけられるようにする。
    - 方針（押し付けない）:
      - 自動で勝手に上書き適用はしない（不信感を避ける）。
      - “おすすめプリセットを提示” し、ユーザーが「これで始める」を押したら反映する。
      - 反映した箇所は可視化する（何が変わったかが分かる）。
    - 体験設計:
      - 開始方法カードの下に「あなたにおすすめ」セクションを表示（初回は特に目立つ）。
      - 2〜3問だけ先に聞く（最小の属性入力）:
        - 世帯タイプ: 単身 / 夫婦 / 子あり
        - 住居: 賃貸 / 持ち家
        - 車: なし / あり（任意）
        - 収入レンジ: ざっくり（任意、後でウィザードで詳細入力）
      - 回答に基づいておすすめプリセットを2〜3件表示し、1件をハイライトする。
      - 「このプリセットで始める」→ かんたん入力へ遷移し、プリセット反映済み状態で編集を開始できる。
      - 反映後は “住人→住宅→生活費…” の順で上書き入力できる（ウィザードの流れを維持）。
    - データ/アルゴリズム:
      - プリセットは既存の resident/housing/vehicle/living/savings のカタログを組み合わせる（新たな巨大プリセットを増やしすぎない）。
      - おすすめロジックはルールベースで開始（透明性重視）:
        - 例: 「単身×賃貸×車なし」→ 住人=単身プリセット + 賃貸住宅 + 車なし + 生活費(単身) + 貯蓄(生活防衛/投資)
        - 例: 「夫婦×持ち家×車あり」→ 住人=夫婦 + 持ち家ローン + 車(ファミリー) + 生活費(夫婦) + 貯蓄(防衛/目的/投資)
      - 将来拡張: スコアリング（一致度）と説明文（なぜおすすめか）を表示。
    - UI実装（候補）:
      - `app/src/App.tsx`:
        - StartOptionsCardの下に `RecommendedPresets` セクションを追加（初回/通常の双方で表示可）。
        - 選択結果は localStorage（例: `lifePlan.recommendation.profile.v1`）に保存して、次回も同じ候補を出す。
      - `app/src/components/...`:
        - 小さな `UserProfileMiniForm`（2〜3問のselect）を用意。
        - `PresetRecommendationCard`（おすすめ1件の説明 + 適用ボタン）を用意。
      - 適用の実装:
        - 現在のアクティブシナリオを “置換/上書き” するのではなく、
          - ① 新規シナリオとして追加（推奨、失敗しても戻れる）
          - ② 現在のシナリオに上書き（確認ダイアログ必須）
        - 適用後に `editorMode='wizard'` にして入力を続けられるようにする。
    - Acceptance:
      - 2〜3問に答えるだけで、2〜3個の“それっぽい”候補が出る。
      - 「これで始める」で結果がすぐ見え、ウィザードで順番に現実へ近づけられる。
      - 勝手に上書きされず、何が反映されたかが分かる。
      - `npm run lint`, `npm run test`, `npm run build` が通る。

41. Add a lightweight landing screen (ランディング画面を挟む・ルーティングなし):
    - Goal: 初見で「どこから始めるか」を最上位にし、結果画面をいきなり見せないことで迷いをなくす。
    - 方針:
      - ルーティング/新規依存は追加しない（`App.tsx` の表示分岐で実現）。
      - ランディング →（開始）→ 既存の編集オーバーレイ/ウィザード/読み込み/AIへ接続する。
    - 画面設計（Landing）:
      - タイトル + 1文価値訴求（例: 「赤字の年と原因まで一目で分かる」）
      - “開始方法” 3択（Primary/Secondary）:
        - かんたん入力（推奨）
        - JSON読み込み
        - AIで作成（コピー&貼り付け）
      - “あなたにおすすめ” ミニフォーム（世帯/住居/車）+ おすすめカード（既存40のUIを流用）
      - Trust note（データ保存/共有リンク注意）を小さく表示
      - 既存ユーザー向け: 「そのまま結果を見る」リンク（Landingをスキップしてapp画面へ）
    - 表示条件:
      - 初回起動のみ（既存の `lifePlan.onboarding.dismissed.v1` で管理）+ スナップショット閲覧時は出さない。
      - 既存ユーザーでも、メニューから再表示できる（“はじめ方” などのボタン）。
    - 実装方針:
      - `App.tsx` に `screen`（例: `'landing' | 'main'`）を追加し、初回は `landing` を表示。
      - Landing での各ボタンは既存の状態遷移を呼ぶ:
        - かんたん入力 → `editorOpen=true` + `editorMode='wizard'` + `editorTab='form'`
        - JSON → `editorOpen=true` + `editorTab='list'`
        - AI → `editorOpen=true` + `editorTab='list'` + AIダイアログ
        - おすすめ適用 → 新規シナリオ作成→（結果を見る or ウィザードへ）を選べる
      - `App.css` に landing レイアウト（中央寄せ・カード・レスポンシブ）を追加。
    - Acceptance:
      - 初回起動でランディングが表示され、3択から迷わず開始できる。
      - スナップショット閲覧はランディングに邪魔されない。
      - 既存の編集/結果UIは壊れず、`npm run lint/test/build` が通る。

42. Improve landing conversion (使いたくなるランディング改善: 出力イメージ/選択負荷/次の一手):
    - Goal: 初見ユーザーが「結果がどう見えるか」を即理解し、迷わず開始できる（離脱を減らす）。
    - 施策A: 結果プレビュー（出力イメージ）を常設
      - ランディング内に小さな “結果プレビュー” を表示（サムネでOK）:
        - KPI（例: 最終純資産 / 赤字開始年 / ピーク純資産）
        - 純資産推移のミニチャート（数点でも良い）
        - 年選択→内訳ウォーターフォールのミニ表示（固定の例データでOK）
      - 「サンプルを見る」ボタンを開始3択の近くに置く（クリックで `screen='main'` + サンプルシナリオ選択、もしくは結果タブへ）。
      - Acceptance: ランディングだけ見ても “どんな画面が出るか” が想像できる。
    - 施策B: Primary CTA のコピーを具体化
      - かんたん入力ボタン直下に “得られるもの” を1行で添える（例: 「3分で“赤字の年”が分かる」）。
      - 「おすすめ」セクションにも “あとから上書きOK” を短く入れる（既存文言の短文化）。
    - 施策C: 「あなたにおすすめ」の選択コストを下げる
      - 3カード同時表示をやめ、まずは “おすすめ1件” を大きく表示:
        - 「他の候補を見る（▼）」で残り2件を展開（折りたたみ）。
      - 初期の属性入力（世帯/住居/車）はそのまま維持しつつ、変更時の再計算が即分かるUI（ハイライト/ラベル）にする。
      - Acceptance: ユーザーが迷う時間が短くなる（選ぶものが少ない）。
    - 施策D: Trust note を短文化 + 詳細へ逃がす
      - 先頭は「データは端末内保存」だけにし、共有リンクの注意は “詳細” リンク配下に畳む（必要な人だけ読む）。
      - `README` か `help` 相当のページ/モーダルへリンクを用意（軽量ならモーダルでOK）。
    - 施策E: 適用後の「次の一手」チェックリスト
      - プリセット適用後に、ウィザードの先頭で “まず入れる3つ” を提示（例: 年収/住居費/貯蓄）し、該当ステップへジャンプできる。
      - Acceptance: 適用後に迷わず編集を進められる。
    - 実装ポイント（候補）:
      - `app/src/App.tsx`: ランディングのプレビュー/サンプル導線/Trust note 折りたたみ。
      - `app/src/components/RecommendedPresets.tsx`: 1枚表示 + 折りたたみ展開、適用後の次アクションフック。
      - `app/src/components/WizardEditor.tsx`: “次の一手” 表示とステップジャンプ（任意）。
      - `app/src/App.css`: ランディングの2カラム（プレビュー付き）レイアウト調整。
    - Acceptance (overall):
      - 初見が “何が得られるか/どう見えるか” を理解しやすい。
      - クリック数が少なく開始できる。
      - `npm run lint/test/build` が通る。

43. Redesign LP into “use-it-now” landing (CTA1 / 質問式 / 段階開示 / 上級者折りたたみ / エラー非露出):
    1. 現状の問題点（ユーザー心理・情報設計・導線）
      - 認知負荷が高い: 初見のファーストビューに選択肢が多く、判断コストが高い（「何から始めるべきか」を考えさせてしまう）。
      - 上級者導線の露出が早い: 「JSON」「AIで作成」が初期から目に入り、一般ユーザーにとって“難しそう/危なそう”な印象を与える。
      - 結果プレビューが怖い: 「最終純資産」など重い金額をいきなり提示し、失敗/不安の感情を先に喚起して離脱要因になる。
      - 価値の体験が遅い: “入力→結果”の距離が長く、最初の成功体験（ティザー）までに力尽きる。
      - エラー露出が不適切: プリセット取得失敗など内部事情がファーストビューに出ると信頼を損なう。

    2. ToBe情報設計（ページ構造の新しい階層、表示/非表示、折りたたみ条件）
      - Hero（常時表示）
        - 価値訴求（安心/手軽さ） + 主要CTAは1つだけ「今すぐ試す」
        - 安心文言（会員登録なし / だいたいでOK / 端末保存 / あとで修正可）
      - かんたん診断（CTA押下で表示 / もしくはHero直下でステップ表示）
        - 3〜5問、すべて選択式（数値入力は出さない）
        - 進捗（例: 1/4）と所要時間（3分）を表示
      - 結果ティザー（診断完了で表示、常に“軽い情報”のみ）
        - 赤字リスク（低/中/高） + 赤字開始年（概算、なければ「赤字なし（概算）」）
        - 「内訳を見る」ボタンで初めて詳細を開示
      - 詳細結果（折りたたみ、ティザーのCTAで開く）
        - グラフ/ウォーターフォール/重い数値（最終純資産・ピーク等）
        - 既存の結果画面（ScenarioResultsTabs）へ遷移する導線を提供
      - 上級者向け（折りたたみパネル、初期は閉）
        - JSON読み込み/AI作成/インポート/共有 など
        - 初見のファーストビューには露出しない（「詳細」扱い）
      - エラー表示の方針
        - LPのHero〜診断〜ティザーにはエラーを表示しない（静かなフォールバックへ）
        - エラーは上級者パネル内、または「詳細」内のみに限定して表示する

    3. 画面単位の仕様
      - Hero
        - 見出し: 「赤字の年と原因がわかる家計シミュレーター」
        - サブ: 「会員登録なし / だいたいでOK / 3分で試せる / 端末に保存」
        - CTA: ボタン1つ「今すぐ試す」
        - CTA押下: かんたん診断のStep1へスクロール/表示（状態 `lpStage='quiz'`）
      - かんたん診断（質問式）
        - 形式: 1問ずつ表示（次へ条件=選択済み、戻るあり）
        - 進捗: “3分 / 4問” 表示 + 1/4 のステップ
        - 質問例（3〜5問）
          1) 世帯: 単身 / 夫婦 / 子あり
          2) 住居: 賃貸 / 持ち家 / これから購入したい
          3) 車: なし / 1台 / 2台以上
          4) 収入感: 低め / ふつう / 高め（レンジは見せず感覚でOK）
          5) 教育: 子どもは公立中心 / 私立も検討（子あり時のみ）
        - 次へ条件:
          - 必須: 1)世帯, 2)住居, 3)車
          - 任意: 4)収入感, 5)教育
        - 途中保存: localStorage に `lifePlan.lpQuiz.v1` を保存し復元
        - 完了時: 推奨プリセットを裏で適用して「ティザー」へ（状態 `lpStage='teaser'`）
      - 結果ティザー
        - 表示情報（段階開示の第1段）:
          - 危険度（低/中/高）: “赤字年がある/なし” と “赤字の深さ(概算)” から分類
          - 赤字開始年（概算）: `projection.summary.firstNegativeYear`（なければ“赤字なし”）
        - 文言:
          - 「これは概算です。あとで細かく直せます。」
        - CTA:
          - Primary: 「内訳を見る」（詳細開示 `lpStage='details'`）
          - Secondary: 「この条件を編集する」（ウィザードを開く）
      - 詳細結果（開示条件）
        - 開示トリガー: ティザーの「内訳を見る」押下
        - 表示内容（段階開示の第2段）:
          - KPI（最終純資産/ピーク純資産/総運用益 等）とミニグラフ
          - 年選択→ウォーターフォール/イベント（既存のUIを再利用）
        - 導線:
          - 「結果画面で詳しく見る」→ `screen='main'` へ + 結果タブへフォーカス
      - 上級者パネル（JSON/AI）
        - 初期は閉（`AdvancedPanel`）
        - 見出し: 「詳細（上級者向け）」、説明: 「JSON/AI/インポートはこちら」
        - 内容:
          - JSON読み込み（既存ScenarioListの読み込みUIへ遷移）
          - AIで作成（既存AiScenarioDialogを開く）
        - エラー表示:
          - プリセット取得失敗などのエラーはここでのみ表示（LP本体では表示しない）

    4. 受け入れ基準（Acceptance Criteria）
      - CTAが1つであること: Heroの主要CTAは「今すぐ試す」1つのみ（他は折りたたみ/Secondary扱い）
      - 初見が3分以内に結果ティザー到達できること: 3〜5問の選択のみで完了し、ティザーが出る
      - 上級者導線が初期表示で露出しないこと: JSON/AIは「詳細（上級者向け）」の折りたたみ内
      - プリセット取得エラーがファーストビューに表示されないこと: Hero/診断/ティザーにはエラー表示が出ない
      - 段階開示が機能すること:
        - 初回は危険度+赤字開始年のみ
        - 「内訳を見る」で初めて詳細数値/グラフが出る

    5. 実装タスク分解（エンジニア向け）
      - UIコンポーネント単位
        - `LandingHero`: 価値訴求 + CTA1（今すぐ試す） + 安心文言
        - `QuickWizard`（=かんたん診断）: 1問ずつの選択UI、進捗、戻る/次へ
        - `ResultTeaser`: 危険度+赤字開始年のみ（軽い表示）
        - `ResultDetails`: 詳細結果（既存の `ScenarioResultsTabs` の一部UIを再利用、もしくはミニ版）
        - `AdvancedPanel`: JSON/AI/インポートの折りたたみ
        - `SilentErrorBoundary`（または `safeFetch` ヘルパ）: LPではエラーを握りつぶしフォールバック
      - 状態管理（ステート設計、URLクエリ、localStorage、復元）
        - `lpStage: 'hero' | 'quiz' | 'teaser' | 'details'` を `App.tsx`（またはUI store）で管理
        - `lifePlan.lpQuiz.v1`: 診断回答（復元用）
        - `lifePlan.onboarding.dismissed.v1`: 初回表示の管理は現状踏襲
        - URLクエリは任意（最小で開始/詳細を `?lp=1&stage=...` で共有できると便利だが後回し可）
      - 既存機能のリファクタリング方針（互換性維持、段階移行）
        - 既存の `RecommendedPresets` は “診断→おすすめ” の内部実装として再利用し、LP上からは “カード一覧” を直接見せない
        - 既存の結果UI（`ScenarioResultsTabs`）は壊さず、LP詳細は “再利用 or ミニ版” で段階導入
        - 既存のオーバーレイ（条件編集）導線は維持
      - 既存のJSON読み込み/貼り付け導線の移設
        - `AdvancedPanel` から `editorTab='list'` に遷移して ScenarioList の読み込み/AIを使わせる
        - LP本体からは直接露出しない

    6. 変更影響範囲とリスク（回帰箇所、計測・ログ、デザイン崩れ）
      - 回帰箇所:
        - `App.tsx` の screen/lpStage 分岐、編集オーバーレイの開閉導線
        - `RecommendedPresets` の再利用/表示切替
      - リスク:
        - LPの状態分岐が増えてバグりやすい → state遷移表を作り、E2E手動確認項目を固定化
        - モバイルでのレイアウト崩れ → 1カラム優先、折りたたみのデフォルトを厳守
        - プリセットfetch失敗時のフォールバック → LPでは静かにデフォルトに落とす/読み込み導線へ誘導

    7. 計測プラン（最低限）
      - 収集イベント（localStorageに一時記録→将来送信できる形にしても良い、追加ライブラリなし）
        - `lp_cta_click`（今すぐ試す）
        - `lp_quiz_complete`
        - `lp_teaser_view`
        - `lp_details_open`
        - `lp_advanced_open`
        - `lp_exit_point`（stage別離脱の推定: 最終ステージを保存）
      - 指標:
        - CTAクリック率、診断完了率、ティザー到達率、詳細開示率、離脱ポイント
      - A/B案（コピー違い2案）
        - A: 「今すぐ試す（3分）」 / B: 「無料で試す（会員登録なし）」

	    8. マイルストーン（1日〜数日単位で現実的に）
	      - Day 1: 情報設計の反映（Hero/CTA1/Advanced折りたたみ）+ lpStage実装 + 既存導線接続
	      - Day 2: QuickWizard（3〜5問）実装 + ティザー表示 + localStorage復元
	      - Day 3: 段階開示の詳細（details）実装 + 既存結果UI再利用 + エラー非露出フォールバック
	      - Day 4: 文言/デザイン調整（モバイル含む）+ 計測（最小ログ）+ 回帰確認（lint/test/build）

44. Expand Landing QuickWizard child/family/housing/recreation interview (子供ヒアリング拡張 + 夫婦の就業 + 持ち家詳細 + レクリエーション):
    - Goal: “子あり家庭の前提” と “生活のニュアンス” をランディングの選択式だけで拾い、概算の納得感を上げる（数値入力は後回し）。
    - 追加/変更する質問（Landingのかんたん診断）:
      - 就業（世帯入力の直後に挿入）
        - 単身: 本人の就業 = `正社員` / `パート・バイト`
        - 夫婦/子あり: 夫の就業 = `正社員` / `パート・バイト`、妻の就業 = `正社員` / `パート・バイト`
        - 方針: “任意” は不可にして必須扱い（収入構造に直結するため）。ただし UIは押したら自動で次へ（クリック数増加を防ぐ）。
      - 子ありの場合
        - 子供の人数 = `1人` / `2人` / `3人以上`
        - 教育の方針（子ありのみ表示）:
          - `大学から私立`
          - `高校から私立`
          - `中学から私立`
          - `小学校から私立`
          - `高卒で働く`
      - 持ち家の場合（housing=own のときだけ表示）
        - 物件の状態 = `新築` / `中古`
        - 物件タイプ = `戸建て` / `マンション`
      - レクリエーション（全世帯）
        - 余暇・趣味の支出感 = `控えめ` / `ふつう` / `多め`

    - シナリオ生成の反映（概算ロジックは壊さず、buildScenarioFromQuiz 内で差分反映）
      - 就業 → 住人の `baseNetIncome` と `annualIncomeGrowthRate` を調整
        - 例: 正社員=ベース高め/昇給率やや高め、パート=ベース低め/昇給率控えめ（詳細は後でウィザードで修正可能にする）
        - 単身/夫婦で “家計総額” のレンジが極端に外れないように、既存 `incomeFeel` との合成ルールを定義する
      - 子供人数 → `Resident`（子）を人数分生成し、教育費の `expenseBands` を人数分作る
      - 教育方針 → 学年ごとの教育費 band を構成（子の現在年齢から開始）
        - 大学から私立: 小〜高は公立、大学(18〜22)は私立
        - 高校から私立: 小中は公立、高〜大学は私立
        - 中学から私立: 小は公立、中〜大学は私立
        - 小学校から私立: 小〜大学は私立
        - 高卒で働く: 小〜高(18)まで教育費 + 大学費用なし（オプションで 18歳以降に子の所得を小さく追加しても良い）
      - 持ち家（新築/中古 × 戸建/マンション） → 住宅の概算パラメータ（ローン額/返済/月管理費/修繕/税など）を切り替え
        - 方針: “マンション” は管理費・修繕積立を上げる、”中古” は購入額/ローン残高を下げるが修繕や維持コストを上げる、等のルールを明文化する
      - レクリエーション → 生活費の “裁量” を倍率で調整（例: discretionaryAnnual を 0.8/1.0/1.3 倍）

    - UI実装（候補）
      - `app/src/App.tsx`
        - QuickWizard の `quizAnswers` と `getQuizSteps` を拡張し、条件分岐（子あり/持ち家/車あり等）に応じて質問を追加・スキップする
        - `buildScenarioFromQuiz` に “就業/子供人数/教育方針/持ち家詳細/レクリエーション” の反映を追加
      - 文言:
        - 就業の説明は “だいたいでOK（あとで直せます）” を明示し、心理的負荷を上げない

    - Acceptance:
      - 夫婦/単身で就業が必ず聞かれ、回答すると自動で次へ進む
      - 子ありのときだけ “人数” と “教育方針” が表示され、シナリオに教育費が反映される
      - 持ち家を選ぶと “新築/中古・戸建/マンション” が追加で聞かれ、住宅費の構造が反映される
      - レクリエーションの選択で生活費（裁量）が変わり、キャッシュフローに差が出る
      - `npm run lint`, `npm run test`, `npm run build` が通る

45. Add clickable KPI breakdown popovers for selected-year details (選択年KPIクリックで計算内訳をポップアップ表示):
    - Goal: 「純資産 / 差引 / 運用益」の数字が *何の合計か* をその場で理解できるようにし、編集の次アクションに繋げる。
    - 対象UI:
      - 結果画面の右パネル「選択年」内 KPI:
        - 純資産（netWorth）
        - 差引（netCashFlow）
        - 運用益（investmentIncome）
      - ※ 単一シナリオの選択年パネルを優先（全体グラフの詳細パネルは後追いでも可）。

    - UI仕様（ポップアップ/右パネル内の小さな詳細）:
      - KPIの値（`strong` 部分）をクリックできるようにする（カーソル/ホバーを付与）。
      - クリックでポップアップ（Popover/Modal）を表示:
        - タイトル: `純資産の内訳（{year}年）` / `差引の内訳（{year}年）` / `運用益の内訳（{year}年）`
        - 内容は箇条書き（通貨表記）で “構成要素” を提示し、最後に合計を太字で表示。
        - 閉じ方: × / 背景クリック / Esc
      - 数字が存在しない（undefined/0など）場合も “0円” として表示し、エラー表示はしない。

    - 表示する内訳の定義（データ）:
      - 差引（netCashFlow）
        - `収入合計`（`YearlyBreakdown.income`）
        - `支出合計`（`YearlyBreakdown.expense`）
        - `住居`（housing）/ `車`（vehicle）/ `生活費`（living）/ `教育`（education）などのカテゴリ別が取れる場合はカテゴリ別に展開（なければ合計のみ）
        - `差引 = 収入 - 支出`
      - 運用益（investmentIncome）
        - `投資口座の利息合計`（`YearlyBreakdown.investmentIncome`）
        - 可能なら、口座別（`savingsAccounts[].label`）に利息を出す（現状ログが年次集計のみなら、まずは合計のみでOK）
      - 純資産（netWorth）
        - `前年純資産`
        - `当年差引（netCashFlow）`
        - `運用益（investmentIncome）`
        - 可能なら `資産売却/購入` 等があればイベント扱いで補足（まずは主要3項で可）

    - 実装タスク:
      - `app/src/components/ScenarioResultsTabs.tsx`
        - KPI表示を `button` もしくはクリック可能要素に変更
        - `kpiBreakdownOpen: null | 'netWorth' | 'netCashFlow' | 'investmentIncome'` の状態を追加
        - 選択年の `YearlyBreakdown` と `scenario.summary/series` から内訳データを組み立てるヘルパを追加
        - `KpiBreakdownPopover`（新規小コンポーネント）を追加し、右パネル内 or portal で表示
      - `app/src/App.css`
        - KPIをクリック可能に見せるスタイル（下線/ホバー/カーソル）
        - Popover/Modal の見た目（背景/影/最大幅/モバイル対応）

    - Acceptance:
      - 「純資産」「差引」「運用益」の値をクリックすると、その年の内訳がポップアップで表示される
      - ポップアップは ×/背景/Esc で閉じられる
      - 表示される合計が、元のKPI値と一致する（丸め差は許容範囲）
      - `npm run build` が通る

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

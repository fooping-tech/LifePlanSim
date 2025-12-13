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

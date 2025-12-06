# Household Life Plan Simulator ExecPlan

This ExecPlan is a living document. Update every section as progress is made. Maintain this document in accordance with `PLANS.md` at the repository root.

## Purpose / Big Picture

Deliver a browser-based interactive simulator that lets households model long-term finances under multiple what-if scenarios. A user should be able to define a resident profile including age, take-home income, expenses that vary by life stage or special events, housing and vehicle costs, and savings accounts with growth rates. They can run two or more scenarios side by side, observe cash-flow and balance projections on charts and tables, and adjust parameters live to see how retirement bonuses, tuition periods, or mortgage payoffs change the outlook. Acceptance is demonstrated when loading the app in a browser allows entering at least two scenarios and the displayed projections update immediately after tweaking any input.

## Progress

- [ ] (2024-05-16 12:00Z) Capture domain details and confirm scenario comparison requirements with sample data covering resident, housing, vehicle, living, and savings inputs.
- [ ] (2024-05-16 12:00Z) Implement simulation engine that converts inputs into yearly cash-flow and balance series plus scenario comparison metrics.
- [ ] (2024-05-16 12:00Z) Build interactive UI (React + TypeScript) with multi-scenario editor, visualizations, and persistence hooks, then verify through manual end-to-end run.

## Surprises & Discoveries

- Observation: None recorded yet; update this list as soon as unexpected behaviors, data quirks, or performance findings emerge.
  Evidence: N/A

## Decision Log

- Decision: Use a Vite-powered React + TypeScript frontend with Zustand for state management and Victory for charts to keep dependencies lightweight and well-documented.
  Rationale: Tooling is familiar, fast to spin up, works entirely in-browser, and supports interactive charts without server-side work.
  Date/Author: 2024-05-16 / Codex

## Outcomes & Retrospective

No implementation has started; record milestones, remaining risks, and lessons here once work proceeds. Summaries should compare the realized simulator behavior against the purpose stated above.

## Context and Orientation

The repository currently has only planning artifacts, so the first code will live under `app/` (frontend implementation) and `docs/` (user guide and sample data). The simulator consists of three conceptual layers. The data layer describes `Scenario` definitions composed of one or more `Resident` entries plus financing objects (housing, vehicles, life expenses, savings vehicles) as provided by the user request. The simulation layer expands each scenario into a normalized time series of yearly (and optionally monthly) entries with cash inflow, outflow, cumulative balance, and notable events. The presentation layer offers a browser UI that edits inputs, runs simulations on demand, and visualizes comparisons. Because there is no backend, all persistence is local (browser storage or downloadable JSON). Treat the provided Japanese terms as canonical domain names where helpful (e.g., class 住人 (Resident), 習い事 (lessons), 退職金 (retirement bonus)).

## Plan of Work

Start with Milestone 1 (Domain Modeling) by scaffolding a Vite React project in `app/`, configuring ESLint/Prettier to keep TypeScript strict, and defining TypeScript interfaces for `Resident`, `IncomeEvent`, `ExpenseBand`, `HousingProfile`, `VehicleProfile`, `LivingCostProfile`, and `SavingsAccount`. Ensure expenses account for school phases (小学生 to 大学院生) plus extracurricular periods by letting each `ExpenseBand` describe a label, start age, end age, and yearly amount. Income must support base salary, annual growth rates, as well as arbitrary adjustments (promotions, maternity leave, retirement bonuses). Savings accounts include both deposits (manual or rule-based) and compounding via per-account annual interest rates.

Milestone 2 (Simulation Engine) focuses on a pure TypeScript module at `app/src/simulation/engine.ts`. Implement helper functions: `expandExpenseBands(resident: Resident): YearlyExpense[]`, `projectIncome(resident: Resident): YearlyIncome[]`, and `simulateScenario(scenario: Scenario, horizonYears: number): Projection`. The simulation should iterate from the earliest resident age to a configurable horizon (default 60 years), summing incomes, expenses, housing, vehicle, lifestyle, and savings events for each year. Support one-off inflows like 退職金 via `IncomeEvent` objects with `triggerAge` or `triggerYear`. Housing needs amortization of mortgage and management fees; vehicles add recurring maintenance, loan payments, inspections (車検), and parking. Savings balances should track separate accounts (e.g., deposit vs. stocks) with distinct interest rates, applied after yearly net cash is added. Provide a scenario comparison service `compareScenarios(scenarios: Scenario[]): ScenarioComparison` that normalizes outputs for chart overlays (net worth, yearly surplus/deficit, risk indicators such as negative balance years).

Milestone 3 (Interactive UI) builds `app/src/components`. Create a multi-pane layout: left column for scenario list and input forms, right column for charts/tables. Allow duplicating a scenario to tweak conditions for comparison. Each scenario editor will group sections: Resident info (age, dependents, base income, growth rate, events); Education and extracurricular costs (list of ExpenseBands that can be added/removed); Housing (built year, mortgage remaining, payment schedule, management fees); Vehicles (loan terms, inspection cadence, parking fees, maintenance); Daily living expenses (food, utilities, insurance); Savings (two tabs: deposits and investments with adjustable interest). Tie form state to a Zustand store that maintains `Scenario[]` plus derived projections. When inputs change, debounce-run `simulateScenario` so charts update instantly. Present at least two visualizations: stacked bar for yearly cash flow and line chart for cumulative balance per scenario. Complement charts with tabular comparison summarizing metrics (e.g., first year of deficit, balance at age 65). Provide ability to save/load scenario sets via JSON download/upload and snapshot URLs encoded via base64 when possible.

Milestone 4 (Validation & UX refinements) adds guardrails: highlight years where balances go negative, allow manual overrides (e.g., reducing income for childcare), and show textual callouts for major events (tuition spikes, retirement). Incorporate responsive design so key info remains accessible on laptops and tablets. Document the workflow under `docs/USER_GUIDE.md` with Japanese/English labels clarifying terminology.

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
10. Update `app/src/App.tsx` to render layout, forms, charts, and call-to-action for adding scenarios. Use React Router only if multiple views are needed (optional).
11. Run `npm run lint`, `npm run test`, and `npm run dev` to verify. Record results in `Validation and Acceptance`.

## Validation and Acceptance

Validation occurs in three layers. First, unit tests under `app/src/simulation/__tests__/engine.test.ts` should cover income growth, event-driven expenses, and savings compounding; they must fail before implementing and pass afterward. Second, integration tests via Testing Library should mount ScenarioForm and confirm that editing income or expense fields triggers recomputation of projections within 200ms (verify by spying on the Zustand store). Third, manual acceptance requires running `npm run dev`, opening `http://localhost:5173/`, creating two scenarios (e.g., baseline vs. increased tuition), and confirming the charts update and comparison table reflects divergence in net worth. Acceptance criteria: users can add arbitrary income events (retirement bonus), per-phase expenses (elementary through grad school plus extracurriculars), housing loans and management fees, vehicle costs (loan, 車検, maintenance, parking), living costs, and per-account savings with interest. The UI must highlight if any scenario hits negative balances, and JSON export/import must reproduce scenarios accurately.

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

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Draft } from 'immer'
import type { Projection, Scenario, ScenarioComparison } from '@models/scenario'
import { compareScenarios, simulateScenario } from '@simulation/engine'
import { buildSampleScenarios, createBlankScenario } from '@utils/sampleData'
import {
  buildSnapshotUrl,
  extractSnapshotFromLocation,
  loadScenariosFromStorage,
  persistScenariosToStorage,
} from '@utils/persistence'
import { createId } from '@utils/id'

interface ScenarioStoreState {
  scenarios: Scenario[]
  activeScenarioId: string | null
  projections: Projection[]
  comparison: ScenarioComparison | null
  addScenario: () => void
  duplicateScenario: (id: string) => void
  removeScenario: (id: string) => void
  updateScenario: (scenario: Scenario) => void
  selectScenario: (id: string) => void
  loadScenarios: (scenarios: Scenario[]) => void
  resetToSamples: () => void
  generateSnapshotLink: () => string
}

const bootstrapScenarios = (): Scenario[] => {
  const snapshot = extractSnapshotFromLocation()
  if (snapshot?.length) {
    return snapshot
  }
  const stored = loadScenariosFromStorage()
  if (stored?.length) {
    return stored
  }
  return buildSampleScenarios()
}

const ensureScenarioDefaults = (scenario: Scenario): Scenario => {
  return {
    currency: 'JPY',
    expenseBands: [],
    customIncomeEvents: [],
    vehicles: [],
    ...scenario,
    residents: scenario.residents ?? [],
    savingsAccounts: scenario.savingsAccounts ?? [],
    living: {
      baseAnnual: scenario.living?.baseAnnual ?? 0,
      insuranceAnnual: scenario.living?.insuranceAnnual,
      utilitiesAnnual: scenario.living?.utilitiesAnnual,
      discretionaryAnnual: scenario.living?.discretionaryAnnual,
      healthcareAnnual: scenario.living?.healthcareAnnual,
      inflationRate: scenario.living?.inflationRate,
    },
  }
}

const recalc = (draft: Draft<ScenarioStoreState>) => {
  draft.scenarios = draft.scenarios.map((scenario) => ensureScenarioDefaults(scenario))
  draft.projections = draft.scenarios.map((scenario) => simulateScenario(scenario))
  draft.comparison = compareScenarios(draft.scenarios)
  persistScenariosToStorage(draft.scenarios)
}

const initialScenarios = bootstrapScenarios().map((scenario) => ensureScenarioDefaults(scenario))
const initialProjections = initialScenarios.map((scenario) => simulateScenario(scenario))
const initialComparison = compareScenarios(initialScenarios)

export const useScenarioStore = create<ScenarioStoreState>()(
  immer((set, get) => ({
    scenarios: initialScenarios,
    activeScenarioId: initialScenarios[0]?.id ?? null,
    projections: initialProjections,
    comparison: initialComparison,
    addScenario: () =>
      set((state) => {
        state.scenarios.push(createBlankScenario(`シナリオ${state.scenarios.length + 1}`))
        state.activeScenarioId = state.scenarios[state.scenarios.length - 1]?.id ?? null
        recalc(state)
      }),
    duplicateScenario: (id) =>
      set((state) => {
        const original = state.scenarios.find((scenario) => scenario.id === id)
        if (!original) {
          return
        }
        const copy: Scenario = {
          ...JSON.parse(JSON.stringify(original)) as Scenario,
          id: createId('scenario'),
          name: `${original.name} (コピー)`,
        }
        state.scenarios.push(copy)
        state.activeScenarioId = copy.id
        recalc(state)
      }),
    removeScenario: (id) =>
      set((state) => {
        state.scenarios = state.scenarios.filter((scenario) => scenario.id !== id)
        if (!state.scenarios.length) {
          state.scenarios.push(createBlankScenario('新規シナリオ'))
        }
        if (!state.scenarios.some((scenario) => scenario.id === state.activeScenarioId)) {
          state.activeScenarioId = state.scenarios[0]?.id ?? null
        }
        recalc(state)
      }),
    updateScenario: (scenario) =>
      set((state) => {
        const index = state.scenarios.findIndex((item) => item.id === scenario.id)
        if (index === -1) {
          return
        }
        state.scenarios[index] = ensureScenarioDefaults({ ...scenario })
        recalc(state)
      }),
    selectScenario: (id) =>
      set((state) => {
        state.activeScenarioId = id
      }),
    loadScenarios: (scenarios) =>
      set((state) => {
        state.scenarios = scenarios.map((scenario) => ensureScenarioDefaults(scenario))
        state.activeScenarioId = state.scenarios[0]?.id ?? null
        recalc(state)
      }),
    resetToSamples: () =>
      set((state) => {
        state.scenarios = buildSampleScenarios()
        state.activeScenarioId = state.scenarios[0]?.id ?? null
        recalc(state)
      }),
    generateSnapshotLink: () => buildSnapshotUrl(get().scenarios),
  })),
)

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
import type { JobPhase } from '@models/resident'

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
  appendScenarios: (scenarios: Scenario[]) => void
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
  const normalizedHousingPlans = (() => {
    if (scenario.housingPlans?.length) {
      return scenario.housingPlans.map((plan) => {
        if (plan.type === 'rent') {
          return {
            id: plan.id ?? createId('housing'),
            label: plan.label ?? '賃貸',
            type: 'rent' as const,
            startYearOffset: plan.startYearOffset ?? 0,
            endYearOffset: plan.endYearOffset,
            monthlyRent: plan.monthlyRent ?? 0,
            monthlyFees: plan.monthlyFees ?? 0,
            extraAnnualCosts: plan.extraAnnualCosts ?? 0,
            moveInCost: plan.moveInCost ?? 0,
            moveOutCost: plan.moveOutCost ?? 0,
          }
        }
        return {
          id: plan.id ?? createId('housing'),
          label: plan.label ?? '住宅',
          type: 'own' as const,
          startYearOffset: plan.startYearOffset ?? 0,
          endYearOffset: plan.endYearOffset,
          builtYear: plan.builtYear ?? 0,
          mortgageRemaining: plan.mortgageRemaining ?? 0,
          monthlyMortgage: plan.monthlyMortgage ?? 0,
          managementFeeMonthly: plan.managementFeeMonthly ?? 0,
          maintenanceReserveMonthly: plan.maintenanceReserveMonthly ?? 0,
          extraAnnualCosts: plan.extraAnnualCosts ?? 0,
          purchaseCost: plan.purchaseCost ?? 0,
          saleValue: plan.saleValue ?? 0,
        }
      })
    }
    if (scenario.housing) {
      return [
        {
          id: createId('housing'),
          label: '住宅',
          type: 'own' as const,
          startYearOffset: 0,
          endYearOffset: undefined,
          builtYear: scenario.housing.builtYear ?? 0,
          mortgageRemaining: scenario.housing.mortgageRemaining ?? 0,
          monthlyMortgage: scenario.housing.monthlyMortgage ?? 0,
          managementFeeMonthly: scenario.housing.managementFeeMonthly ?? 0,
          maintenanceReserveMonthly: scenario.housing.maintenanceReserveMonthly ?? 0,
          extraAnnualCosts: scenario.housing.extraAnnualCosts ?? 0,
          purchaseCost: 0,
          saleValue: 0,
        },
      ]
    }
    return []
  })()

  const normalizedLivingPlans = (() => {
    if (scenario.livingPlans?.length) {
      return scenario.livingPlans.map((plan) => ({
        id: plan.id ?? createId('living'),
        label: plan.label ?? '生活費',
        startYearOffset: plan.startYearOffset ?? 0,
        endYearOffset: plan.endYearOffset,
        baseAnnual: plan.baseAnnual ?? 0,
        insuranceAnnual: plan.insuranceAnnual ?? 0,
        utilitiesAnnual: plan.utilitiesAnnual ?? 0,
        discretionaryAnnual: plan.discretionaryAnnual ?? 0,
        healthcareAnnual: plan.healthcareAnnual ?? 0,
        inflationRate: plan.inflationRate,
      }))
    }
    if (scenario.living) {
      return [
        {
          id: createId('living'),
          label: '生活費',
          startYearOffset: 0,
          endYearOffset: undefined,
          baseAnnual: scenario.living.baseAnnual ?? 0,
          insuranceAnnual: scenario.living.insuranceAnnual ?? 0,
          utilitiesAnnual: scenario.living.utilitiesAnnual ?? 0,
          discretionaryAnnual: scenario.living.discretionaryAnnual ?? 0,
          healthcareAnnual: scenario.living.healthcareAnnual ?? 0,
          inflationRate: scenario.living.inflationRate,
        },
      ]
    }
    return [
      {
        id: createId('living'),
        label: '生活費',
        startYearOffset: 0,
        endYearOffset: undefined,
        baseAnnual: 0,
        insuranceAnnual: 0,
        utilitiesAnnual: 0,
        discretionaryAnnual: 0,
        healthcareAnnual: 0,
        inflationRate: undefined,
      },
    ]
  })()

  return {
    currency: 'JPY',
    expenseBands: [],
    customIncomeEvents: [],
    vehicles: [],
    ...scenario,
    housingPlans: normalizedHousingPlans,
    residents:
      scenario.residents?.map((resident) => {
        const normalizedJobs: JobPhase[] = (() => {
          if (resident.jobs?.length) {
            return resident.jobs.map((job) => ({
              id: job.id ?? createId('job'),
              type: job.type ?? 'employee',
              label: job.label ?? '会社員',
              startAge: job.startAge ?? resident.currentAge,
              endAge: job.endAge,
              netIncomeAnnual: job.netIncomeAnnual ?? resident.baseNetIncome ?? 0,
              annualGrowthRate: job.annualGrowthRate ?? resident.annualIncomeGrowthRate ?? 0,
            }))
          }
          return [
            {
              id: createId('job'),
              type: 'employee',
              label: '会社員',
              startAge: resident.currentAge ?? 0,
              endAge: resident.retirementAge,
              netIncomeAnnual: resident.baseNetIncome ?? 0,
              annualGrowthRate: resident.annualIncomeGrowthRate ?? 0,
            },
          ]
        })()
        return {
          ...resident,
          incomeEvents: resident.incomeEvents ?? [],
          expenseBands: resident.expenseBands ?? [],
          jobs: normalizedJobs,
        }
      }) ?? [],
    savingsAccounts: scenario.savingsAccounts ?? [],
    livingPlans: normalizedLivingPlans,
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

const normalizeScenarioForAppend = (scenario: Scenario, usedScenarioIds: Set<string>): Scenario => {
  const cloned = JSON.parse(JSON.stringify(scenario)) as Scenario
  const hasConflict = !cloned.id || usedScenarioIds.has(cloned.id)
  if (hasConflict) {
    cloned.id = createId('scenario')
    cloned.name = cloned.name ? `${cloned.name} (インポート)` : 'インポートシナリオ'
    if (cloned.residents?.length) {
      cloned.residents = cloned.residents.map((resident) => ({
        ...resident,
        id: createId('resident'),
        incomeEvents: (resident.incomeEvents ?? []).map((event) => ({ ...event, id: createId('event') })),
        expenseBands: (resident.expenseBands ?? []).map((band) => ({ ...band, id: createId('expense') })),
      }))
    }
    if (cloned.vehicles?.length) {
      cloned.vehicles = cloned.vehicles.map((vehicle) => ({ ...vehicle, id: createId('vehicle') }))
    }
    if (cloned.housingPlans?.length) {
      cloned.housingPlans = cloned.housingPlans.map((plan) => ({ ...plan, id: createId('housing') }))
    }
    if (cloned.livingPlans?.length) {
      cloned.livingPlans = cloned.livingPlans.map((plan) => ({ ...plan, id: createId('living') }))
    }
    if (cloned.savingsAccounts?.length) {
      cloned.savingsAccounts = cloned.savingsAccounts.map((account) => ({ ...account, id: createId('savings') }))
    }
    if (cloned.expenseBands?.length) {
      cloned.expenseBands = cloned.expenseBands.map((band) => ({ ...band, id: createId('expense') }))
    }
    if (cloned.customIncomeEvents?.length) {
      cloned.customIncomeEvents = cloned.customIncomeEvents.map((event) => ({ ...event, id: createId('event') }))
    }
  }
  usedScenarioIds.add(cloned.id)
  return ensureScenarioDefaults(cloned)
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
    appendScenarios: (scenarios) =>
      set((state) => {
        const usedScenarioIds = new Set(state.scenarios.map((scenario) => scenario.id))
        const appended = scenarios.map((scenario) => normalizeScenarioForAppend(scenario, usedScenarioIds))
        state.scenarios.push(...appended)
        state.activeScenarioId = state.activeScenarioId ?? state.scenarios[0]?.id ?? null
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

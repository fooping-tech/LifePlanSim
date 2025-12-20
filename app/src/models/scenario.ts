import type {
  HousingPlan,
  HousingProfile,
  LivingCostProfile,
  LivingPlan,
  SavingsAccount,
  VehicleProfile,
} from './finance'
import type { ExpenseBand, IncomeEvent, Resident } from './resident'

export interface Scenario {
  id: string
  name: string
  description?: string
  startYear: number
  residents: Resident[]
  housingPlans?: HousingPlan[]
  housing?: HousingProfile
  vehicles?: VehicleProfile[]
  livingPlans?: LivingPlan[]
  living: LivingCostProfile
  savingsAccounts: SavingsAccount[]
  expenseBands?: ExpenseBand[]
  customIncomeEvents?: IncomeEvent[]
  initialCash?: number
  horizonYears?: number
  currency?: 'JPY' | 'USD' | 'EUR'
}

export interface SimulationOptions {
  horizonYears?: number
}

export interface YearlyBreakdown {
  year: number
  index: number
  agesByResident: Record<string, number>
  income: number
  investmentIncome?: number
  investmentIncomeByAccount?: Record<string, number>
  expenses: {
    living: number
    education: number
    housing: number
    vehicle: number
    other: number
    savingsContribution: number
  }
  netCashFlow: number
  netWorth: number
  savingsByAccount: Record<string, number>
  events: string[]
}

export interface ProjectionSummary {
  totalIncome: number
  totalExpenses: number
  finalNetWorth: number
  firstNegativeYear: number | null
  negativeYears: number[]
  peakNetWorth: number
}

export interface Projection {
  scenarioId: string
  scenarioName: string
  yearly: YearlyBreakdown[]
  summary: ProjectionSummary
}

export interface ScenarioComparison {
  projections: Projection[]
  earliestNegativeYear: {
    scenarioId: string
    year: number
  } | null
}

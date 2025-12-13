export type IncomeEventType = 'bonus' | 'reduction' | 'raise' | 'retirement' | 'custom'

export interface IncomeEvent {
  id: string
  label: string
  amount: number
  type: IncomeEventType
  triggerAge?: number
  triggerYearOffset?: number
  repeatEveryYears?: number
  durationYears?: number
}

export type ExpenseBandCategory = 'education' | 'housing' | 'vehicle' | 'living' | 'lessons' | 'event' | 'other'

export interface ExpenseBand {
  id: string
  label: string
  startAge: number
  endAge: number
  annualAmount: number
  category: ExpenseBandCategory
  notes?: string
}

export type JobType = 'employee' | 'civilService' | 'selfEmployed' | 'partTime' | 'unemployed' | 'pension'

export interface JobPhase {
  id: string
  type: JobType
  label: string
  startAge: number
  endAge?: number
  netIncomeAnnual: number
  annualGrowthRate: number
}

export interface Resident {
  id: string
  name: string
  currentAge: number
  retirementAge: number
  baseNetIncome: number
  annualIncomeGrowthRate: number
  dependents?: number
  jobs?: JobPhase[]
  incomeEvents: IncomeEvent[]
  expenseBands: ExpenseBand[]
}

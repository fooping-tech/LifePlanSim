import { describe, expect, it } from 'vitest'
import { expandExpenseBands, projectIncome, simulateScenario, compareScenarios } from '@simulation/engine'
import type { Resident } from '@models/resident'
import type { Scenario } from '@models/scenario'

const sampleResident: Resident = {
  id: 'resident-1',
  name: 'Aiko',
  currentAge: 35,
  retirementAge: 60,
  baseNetIncome: 5400000,
  annualIncomeGrowthRate: 0.03,
  dependents: 2,
  incomeEvents: [
    {
      id: 'raise',
      label: '昇給',
      amount: 200000,
      triggerAge: 37,
      type: 'raise',
    },
    {
      id: 'leave',
      label: '育休',
      amount: -400000,
      triggerAge: 38,
      durationYears: 1,
      type: 'reduction',
    },
  ],
  expenseBands: [
    {
      id: 'elementary',
      label: '小学生',
      startAge: 40,
      endAge: 45,
      annualAmount: 350000,
      category: 'education',
    },
  ],
}

const baseScenario: Scenario = {
  id: 'baseline',
  name: 'Baseline',
  description: '標準的な家計シナリオ',
  startYear: 2025,
  residents: [sampleResident],
  housing: {
    builtYear: 2010,
    mortgageRemaining: 12000000,
    monthlyMortgage: 90000,
    managementFeeMonthly: 12000,
    maintenanceReserveMonthly: 10000,
    extraAnnualCosts: 200000,
  },
  vehicles: [
    {
      id: 'family-car',
      label: 'ミニバン',
      purchasePrice: 3000000,
      loanRemaining: 2000000,
      monthlyLoan: 40000,
      inspectionCycleYears: 2,
      inspectionCost: 120000,
      maintenanceAnnual: 80000,
      parkingMonthly: 15000,
      insuranceAnnual: 90000,
    },
  ],
  living: {
    baseAnnual: 2600000,
    insuranceAnnual: 400000,
    utilitiesAnnual: 360000,
    discretionaryAnnual: 240000,
    healthcareAnnual: 150000,
    inflationRate: 0.01,
  },
  savingsAccounts: [
    {
      id: 'cash',
      label: '預金口座',
      type: 'deposit',
      balance: 3000000,
      annualContribution: 600000,
      annualInterestRate: 0.01,
      adjustable: true,
    },
    {
      id: 'stocks',
      label: '投資信託',
      type: 'investment',
      balance: 1500000,
      annualContribution: 300000,
      annualInterestRate: 0.04,
      adjustable: true,
      withdrawPriority: 2,
    },
  ],
  expenseBands: [
    {
      id: 'lessons',
      label: '習い事',
      startAge: 0,
      endAge: 4,
      annualAmount: 200000,
      category: 'lessons',
    },
  ],
  initialCash: 500000,
}

describe('projectIncome', () => {
  it('applies growth rates and income events across the horizon', () => {
    const series = projectIncome(sampleResident, 5)
    expect(series).toHaveLength(5)
    expect(series[0].amount).toBeCloseTo(5400000)
    expect(series[2].amount).toBeGreaterThan(series[1].amount)
    const eventYear = series.find((entry) => entry.yearIndex === 3)
    expect(eventYear?.events).toContain('育休')
    expect(eventYear?.amount).toBeLessThan(series[2].amount)
  })
})

describe('expandExpenseBands', () => {
  it('converts resident expense bands into yearly entries', () => {
    const expenses = expandExpenseBands(sampleResident, 10)
    const uniqueYears = new Set(expenses.map((entry) => entry.yearIndex))
    expect(uniqueYears.size).toBeGreaterThan(0)
    expect(expenses[0].category).toBe('education')
    expect(expenses.every((entry) => entry.residentId === sampleResident.id)).toBe(true)
  })
})

describe('simulateScenario', () => {
  it('produces yearly projections with balances and event markers', () => {
    const projection = simulateScenario(baseScenario, { horizonYears: 10 })
    expect(projection.yearly).toHaveLength(10)
    expect(projection.summary.totalIncome).toBeGreaterThan(0)
    expect(projection.summary.totalExpenses).toBeGreaterThan(0)
    expect(projection.summary.firstNegativeYear).toBeNull()
    const firstYear = projection.yearly[0]
    expect(firstYear.expenses.living).toBeGreaterThan(0)
    expect(firstYear.savingsByAccount.cash).toBeGreaterThan(0)
  })
})

describe('compareScenarios', () => {
  it('identifies the earliest scenario that dips into negative net worth', () => {
    const highExpenseScenario: Scenario = {
      ...baseScenario,
      id: 'stress',
      name: 'Stress Test',
      living: {
        ...baseScenario.living,
        baseAnnual: 8000000,
      },
    }
    const comparison = compareScenarios(
      [baseScenario, highExpenseScenario],
      { horizonYears: 10 },
    )
    expect(comparison.projections).toHaveLength(2)
    expect(comparison.earliestNegativeYear?.scenarioId).toBe('stress')
  })
})

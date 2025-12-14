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

  it('models vehicle replacement using purchaseYear/disposalYear', () => {
    const startYear = 2025
    const projection = simulateScenario(
      {
        ...baseScenario,
        startYear,
        living: { ...baseScenario.living, baseAnnual: 0, insuranceAnnual: 0, utilitiesAnnual: 0, discretionaryAnnual: 0, healthcareAnnual: 0, inflationRate: 0 },
        housing: {
          builtYear: 2010,
          mortgageRemaining: 0,
          monthlyMortgage: 0,
          managementFeeMonthly: 0,
          maintenanceReserveMonthly: 0,
          extraAnnualCosts: 0,
        },
        savingsAccounts: [
          { ...baseScenario.savingsAccounts[0], id: 'cash', balance: 10_000_000, annualContribution: 0, annualInterestRate: 0 },
        ],
        vehicles: [
          {
            id: 'old',
            label: '旧車',
            purchaseYear: 2018,
            purchasePrice: 0,
            disposalYear: startYear + 2,
            disposalValue: 300000,
            loanRemaining: 0,
            monthlyLoan: 0,
            inspectionCycleYears: 2,
            inspectionCost: 100000,
            maintenanceAnnual: 60000,
            parkingMonthly: 0,
            insuranceAnnual: 60000,
          },
          {
            id: 'new',
            label: '新車',
            purchaseYear: startYear + 3,
            purchasePrice: 500000,
            disposalYear: undefined,
            disposalValue: 0,
            loanRemaining: 0,
            monthlyLoan: 0,
            inspectionCycleYears: 2,
            inspectionCost: 100000,
            maintenanceAnnual: 60000,
            parkingMonthly: 0,
            insuranceAnnual: 60000,
          },
        ],
      },
      { horizonYears: 6 },
    )

    const year0 = projection.yearly[0]
    const year2 = projection.yearly[2]
    const year3 = projection.yearly[3]

    expect(year0.events.join(' ')).not.toContain('新車: 購入')
    expect(year2.events.join(' ')).toContain('旧車: 売却')
    expect(year3.events.join(' ')).toContain('新車: 購入')
  })

  it('covers deficits respecting emergency minBalance and last-resort rules', () => {
    const projection = simulateScenario(
      {
        ...baseScenario,
        id: 'deficit-rules',
        name: 'Deficit Rules',
        residents: [
          {
            ...sampleResident,
            baseNetIncome: 0,
            annualIncomeGrowthRate: 0,
            incomeEvents: [],
          },
        ],
        housing: {
          builtYear: 2010,
          mortgageRemaining: 0,
          monthlyMortgage: 0,
          managementFeeMonthly: 0,
          maintenanceReserveMonthly: 0,
          extraAnnualCosts: 0,
        },
        vehicles: [],
        living: {
          baseAnnual: 0,
          insuranceAnnual: 0,
          utilitiesAnnual: 0,
          discretionaryAnnual: 0,
          healthcareAnnual: 0,
          inflationRate: 0,
        },
        expenseBands: [
          {
            id: 'stress',
            label: '赤字要因',
            startAge: 0,
            endAge: 120,
            annualAmount: 400000,
            category: 'other',
          },
        ],
        savingsAccounts: [
          {
            id: 'emergency',
            label: '生活防衛資金',
            type: 'deposit',
            role: 'emergency',
            balance: 1000000,
            minBalance: 800000,
            annualContribution: 0,
            annualInterestRate: 0,
            contributionPolicy: 'fixed',
            withdrawPolicy: 'normal',
            adjustable: true,
            withdrawPriority: 0,
          },
          {
            id: 'goal',
            label: '目的別資金',
            type: 'deposit',
            role: 'goal_other',
            balance: 500000,
            annualContribution: 0,
            annualInterestRate: 0,
            contributionPolicy: 'fixed',
            withdrawPolicy: 'normal',
            adjustable: true,
            withdrawPriority: 1,
          },
          {
            id: 'long',
            label: '長期投資',
            type: 'investment',
            role: 'long_term',
            balance: 500000,
            annualContribution: 0,
            annualInterestRate: 0,
            contributionPolicy: 'fixed',
            withdrawPolicy: 'last_resort',
            adjustable: false,
            withdrawPriority: 2,
          },
        ],
        initialCash: 0,
      },
      { horizonYears: 1 },
    )
    const year = projection.yearly[0]
    expect(year).toBeTruthy()
    expect(year.savingsByAccount.emergency).toBe(800000)
    expect(year.savingsByAccount.goal).toBeLessThan(500000)
    expect(year.savingsByAccount.long).toBe(500000)
    expect(year.events.join(' ')).toContain('生活防衛資金: 赤字補填')
    expect(year.events.join(' ')).not.toContain('長期投資: 赤字補填')
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

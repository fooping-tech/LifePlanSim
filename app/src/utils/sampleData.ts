import type { Scenario } from '@models/scenario'
import { createId } from './id'

const currentYear = new Date().getFullYear()

const buildResident = ({
  id,
  name,
  currentAge,
  retirementAge,
  baseNetIncome,
  annualIncomeGrowthRate,
  incomeEvents = [],
  expenseBands = [],
}: {
  id?: string
  name: string
  currentAge: number
  retirementAge: number
  baseNetIncome: number
  annualIncomeGrowthRate: number
  incomeEvents?: Scenario['residents'][number]['incomeEvents']
  expenseBands?: Scenario['residents'][number]['expenseBands']
}) => ({
  id: id ?? createId('resident'),
  name,
  currentAge,
  retirementAge,
  baseNetIncome,
  annualIncomeGrowthRate,
  incomeEvents,
  expenseBands,
})

const buildScenario = (overrides?: Partial<Scenario>): Scenario => {
  return {
    id: createId('scenario'),
    name: '新規シナリオ',
    description: '手取り収入とライフイベントをもとにした家計予測',
    startYear: currentYear,
    residents: [
      buildResident({
        name: '佐藤 太郎',
        currentAge: 38,
        retirementAge: 65,
        baseNetIncome: 6200000,
        annualIncomeGrowthRate: 0.025,
        incomeEvents: [
          {
            id: createId('event'),
            label: '昇進ボーナス',
            amount: 350000,
            triggerAge: 42,
            type: 'bonus',
          },
          {
            id: createId('event'),
            label: '退職金',
            amount: 12000000,
            triggerAge: 65,
            type: 'retirement',
          },
        ],
        expenseBands: [
          {
            id: createId('expense'),
            label: '小学生 (習い事込み)',
            startAge: 42,
            endAge: 47,
            annualAmount: 480000,
            category: 'education',
          },
          {
            id: createId('expense'),
            label: '大学院',
            startAge: 57,
            endAge: 60,
            annualAmount: 900000,
            category: 'education',
          },
        ],
      }),
    ],
    housingPlans: [
      {
        id: createId('housing'),
        label: '自宅',
        type: 'own',
        startYearOffset: 0,
        builtYear: 2012,
        mortgageRemaining: 18000000,
        monthlyMortgage: 95000,
        managementFeeMonthly: 13000,
        maintenanceReserveMonthly: 11000,
        extraAnnualCosts: 150000,
        purchaseCost: 0,
        saleValue: 0,
      },
    ],
    vehicles: [
      {
        id: createId('vehicle'),
        label: 'ファミリーカー',
        purchasePrice: 3200000,
        loanRemaining: 1800000,
        monthlyLoan: 52000,
        inspectionCycleYears: 2,
        inspectionCost: 130000,
        maintenanceAnnual: 90000,
        parkingMonthly: 14000,
        insuranceAnnual: 95000,
      },
    ],
    living: {
      baseAnnual: 2800000,
      insuranceAnnual: 420000,
      utilitiesAnnual: 420000,
      discretionaryAnnual: 300000,
      healthcareAnnual: 160000,
      inflationRate: 0.012,
    },
    savingsAccounts: [
      {
        id: createId('savings'),
        label: '普通預金',
        type: 'deposit',
        balance: 2500000,
        annualContribution: 500000,
        annualInterestRate: 0.01,
        adjustable: true,
      },
      {
        id: createId('savings'),
        label: '積立NISA',
        type: 'investment',
        balance: 1500000,
        annualContribution: 400000,
        annualInterestRate: 0.05,
        adjustable: true,
        withdrawPriority: 2,
      },
    ],
    expenseBands: [
      {
        id: createId('expense'),
        label: '習い事',
        startAge: 0,
        endAge: 5,
        annualAmount: 280000,
        category: 'lessons',
      },
    ],
    customIncomeEvents: [],
    initialCash: 800000,
    currency: 'JPY',
    ...overrides,
  }
}

export const buildSampleScenarios = (): Scenario[] => {
  const base = buildScenario({
    name: '標準プラン',
    description: '現状維持モデル',
  })
  const tuitionFocused = buildScenario({
    name: '教育費増額プラン',
    description: 'お子さまの習い事と大学費用を増額',
  })
  tuitionFocused.expenseBands = [
    {
      id: createId('expense'),
      label: '習い事強化',
      startAge: 0,
      endAge: 7,
      annualAmount: 500000,
      category: 'lessons',
    },
  ]
  tuitionFocused.residents = tuitionFocused.residents.map((resident) => ({
    ...resident,
    expenseBands: [
      ...resident.expenseBands,
      {
        id: createId('expense'),
        label: '海外留学',
        startAge: resident.currentAge + 20,
        endAge: resident.currentAge + 21,
        annualAmount: 1600000,
        category: 'education',
      },
    ],
  }))
  return [base, tuitionFocused]
}

export const createBlankScenario = (label = '新規シナリオ'): Scenario => {
  return buildScenario({
    name: label,
    description: '自由にカスタマイズできます',
    residents: [
      buildResident({
        name: '新しい住人',
        currentAge: 35,
        retirementAge: 65,
        baseNetIncome: 5000000,
        annualIncomeGrowthRate: 0.02,
        incomeEvents: [],
        expenseBands: [],
      }),
    ],
    savingsAccounts: [
      {
        id: createId('savings'),
        label: '預金',
        type: 'deposit',
        balance: 1000000,
        annualContribution: 300000,
        annualInterestRate: 0.005,
        adjustable: true,
      },
    ],
    housingPlans: [
      {
        id: createId('housing'),
        label: '住居',
        type: 'own',
        startYearOffset: 0,
        builtYear: currentYear,
        mortgageRemaining: 0,
        monthlyMortgage: 0,
        managementFeeMonthly: 0,
        maintenanceReserveMonthly: 0,
        extraAnnualCosts: 0,
        purchaseCost: 0,
        saleValue: 0,
      },
    ],
    expenseBands: [],
    customIncomeEvents: [],
    initialCash: 500000,
  })
}

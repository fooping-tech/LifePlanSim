import type {
  HousingPlan,
  LivingCostProfile,
  LivingPlan,
  SavingsAccount,
  VehicleProfile,
} from '@models/finance'
import type { ExpenseBand, IncomeEvent, Resident } from '@models/resident'
import type {
  Projection,
  Scenario,
  ScenarioComparison,
  SimulationOptions,
  YearlyBreakdown,
} from '@models/scenario'

export interface YearlyExpense {
  yearIndex: number
  amount: number
  label: string
  category: ExpenseBand['category']
  residentId?: string
}

export interface YearlyIncome {
  yearIndex: number
  amount: number
  events: string[]
}

interface HousingCostBreakdown {
  total: number
  mortgage: number
  management: number
  maintenance: number
  extra: number
  rent: number
}

interface VehicleCostBreakdown {
  total: number
  loan: number
  inspection: number
  maintenance: number
  parking: number
  insurance: number
}

interface ExpenseCategoryTotals {
  education: number
  housing: number
  vehicle: number
  living: number
  other: number
}

interface SavingsAccountState extends SavingsAccount {
  balance: number
}

const DEFAULT_HORIZON_YEARS = 60

export const expandExpenseBands = (resident: Resident, horizonYears: number): YearlyExpense[] => {
  const entries: YearlyExpense[] = []
  resident.expenseBands.forEach((band) => {
    const startIndex = Math.max(0, band.startAge - resident.currentAge)
    const endIndex = Math.min(horizonYears - 1, band.endAge - resident.currentAge)
    for (let idx = startIndex; idx <= endIndex; idx += 1) {
      entries.push({
        yearIndex: idx,
        amount: band.annualAmount,
        label: band.label,
        category: band.category,
        residentId: resident.id,
      })
    }
  })
  return entries
}

export const projectIncome = (resident: Resident, horizonYears: number): YearlyIncome[] => {
  const series: YearlyIncome[] = []
  for (let yearIndex = 0; yearIndex < horizonYears; yearIndex += 1) {
    const age = resident.currentAge + yearIndex
    let total = 0
    const triggeredEvents: string[] = []
    if (age <= resident.retirementAge) {
      const yearsWorked = Math.max(0, age - resident.currentAge)
      total = resident.baseNetIncome * Math.pow(1 + resident.annualIncomeGrowthRate, yearsWorked)
    }
    resident.incomeEvents.forEach((event) => {
      if (shouldTriggerIncomeEvent(event, { yearIndex, age })) {
        total += event.amount
        triggeredEvents.push(event.label)
      }
    })
    series.push({
      yearIndex,
      amount: total,
      events: triggeredEvents,
    })
  }
  return series
}

const shouldTriggerIncomeEvent = (
  event: IncomeEvent,
  context: { yearIndex: number; age?: number },
): boolean => {
  const { yearIndex, age } = context
  if (typeof event.triggerAge === 'number' && typeof age === 'number') {
    const diff = age - event.triggerAge
    if (!matchesEventTiming(diff, event)) {
      return false
    }
    return true
  }
  if (typeof event.triggerYearOffset === 'number') {
    const diff = yearIndex - event.triggerYearOffset
    if (!matchesEventTiming(diff, event)) {
      return false
    }
    return true
  }
  return false
}

const matchesEventTiming = (diff: number, event: IncomeEvent): boolean => {
  if (diff < 0) {
    return false
  }
  if (event.repeatEveryYears && event.repeatEveryYears > 0) {
    if (diff % event.repeatEveryYears !== 0) {
      return false
    }
  } else if (diff !== 0) {
    return false
  }
  if (typeof event.durationYears === 'number' && event.durationYears > 0) {
    return diff < event.durationYears
  }
  return true
}

const expandScenarioExpenseBands = (
  bands: ExpenseBand[] | undefined,
  horizonYears: number,
): YearlyExpense[] => {
  if (!bands?.length) {
    return []
  }
  const entries: YearlyExpense[] = []
  bands.forEach((band) => {
    const startIndex = Math.max(0, band.startAge)
    const endIndex = Math.min(horizonYears - 1, band.endAge)
    for (let idx = startIndex; idx <= endIndex; idx += 1) {
      entries.push({
        yearIndex: idx,
        amount: band.annualAmount,
        category: band.category,
        label: band.label,
      })
    }
  })
  return entries
}

const buildExpenseMap = (entries: YearlyExpense[]): Map<number, YearlyExpense[]> => {
  return entries.reduce((map, entry) => {
    const existing = map.get(entry.yearIndex) ?? []
    existing.push(entry)
    map.set(entry.yearIndex, existing)
    return map
  }, new Map<number, YearlyExpense[]>())
}

const categorizeExpenses = (entries: YearlyExpense[]): ExpenseCategoryTotals => {
  return entries.reduce<ExpenseCategoryTotals>(
    (totals, entry) => {
      switch (entry.category) {
        case 'education':
        case 'lessons':
          totals.education += entry.amount
          break
        case 'housing':
          totals.housing += entry.amount
          break
        case 'vehicle':
          totals.vehicle += entry.amount
          break
        case 'living':
          totals.living += entry.amount
          break
        default:
          totals.other += entry.amount
      }
      return totals
    },
    { education: 0, housing: 0, vehicle: 0, living: 0, other: 0 },
  )
}

const computeLivingCost = (profile: LivingCostProfile, yearIndex: number): number => {
  const base =
    profile.baseAnnual +
    (profile.insuranceAnnual ?? 0) +
    (profile.utilitiesAnnual ?? 0) +
    (profile.discretionaryAnnual ?? 0) +
    (profile.healthcareAnnual ?? 0)
  const inflationRate = profile.inflationRate ?? 0
  const multiplier = Math.pow(1 + inflationRate, yearIndex)
  return base * multiplier
}

const selectActiveLivingPlan = (plans: LivingPlan[], yearIndex: number): LivingPlan | undefined => {
  const candidates = plans.filter((plan) => {
    if (yearIndex < plan.startYearOffset) {
      return false
    }
    if (typeof plan.endYearOffset === 'number' && yearIndex > plan.endYearOffset) {
      return false
    }
    return true
  })
  if (!candidates.length) {
    return undefined
  }
  return candidates.reduce((latest, plan) =>
    plan.startYearOffset >= latest.startYearOffset ? plan : latest,
  )
}

const computeLivingCostForYear = (scenario: Scenario, yearIndex: number): number => {
  const plans = scenario.livingPlans ?? []
  if (plans.length) {
    const active = selectActiveLivingPlan(plans, yearIndex)
    if (active) {
      const base =
        active.baseAnnual +
        (active.insuranceAnnual ?? 0) +
        (active.utilitiesAnnual ?? 0) +
        (active.discretionaryAnnual ?? 0) +
        (active.healthcareAnnual ?? 0)
      const inflationRate = active.inflationRate ?? scenario.living?.inflationRate ?? 0
      const elapsed = Math.max(0, yearIndex - active.startYearOffset)
      const multiplier = Math.pow(1 + inflationRate, elapsed)
      return base * multiplier
    }
  }
  return computeLivingCost(scenario.living, yearIndex)
}

const computeHousingCost = (
  plan: HousingPlan | undefined,
  state: { mortgageRemaining: number } | null,
  yearIndex: number,
  yearEvents: string[],
): HousingCostBreakdown => {
  if (!plan) {
    return { total: 0, mortgage: 0, management: 0, maintenance: 0, extra: 0, rent: 0 }
  }

  if (plan.type === 'rent') {
    const rent = plan.monthlyRent * 12
    const management = (plan.monthlyFees ?? 0) * 12
    const maintenance = 0
    const extraAnnual = plan.extraAnnualCosts ?? 0
    const moveIn = yearIndex === plan.startYearOffset ? (plan.moveInCost ?? 0) : 0
    const moveOut =
      typeof plan.endYearOffset === 'number' && yearIndex === plan.endYearOffset
        ? (plan.moveOutCost ?? 0)
        : 0
    if (moveIn > 0) {
      yearEvents.push(`${plan.label}: 入居費用`)
    }
    if (moveOut > 0) {
      yearEvents.push(`${plan.label}: 退去費用`)
    }
    const total = rent + management + extraAnnual + moveIn + moveOut
    return {
      total,
      mortgage: 0,
      management,
      maintenance,
      extra: extraAnnual + moveIn + moveOut,
      rent,
    }
  }

  if (!state) {
    return { total: 0, mortgage: 0, management: 0, maintenance: 0, extra: 0, rent: 0 }
  }

  const management = plan.managementFeeMonthly * 12
  const maintenance = plan.maintenanceReserveMonthly * 12
  const extraAnnual = plan.extraAnnualCosts ?? 0
  const purchase = yearIndex === plan.startYearOffset ? (plan.purchaseCost ?? 0) : 0
  if (purchase > 0) {
    yearEvents.push(`${plan.label}: 購入費用`)
  }

  const mortgagePayment =
    state.mortgageRemaining > 0
      ? Math.min(state.mortgageRemaining, plan.monthlyMortgage * 12)
      : 0
  state.mortgageRemaining = Math.max(0, state.mortgageRemaining - mortgagePayment)
  if (state.mortgageRemaining === 0 && mortgagePayment > 0) {
    yearEvents.push(`住宅ローン完済 (Year ${yearIndex + 1})`)
  }

  const total = mortgagePayment + management + maintenance + extraAnnual + purchase
  return {
    total,
    mortgage: mortgagePayment,
    management,
    maintenance,
    extra: extraAnnual + purchase,
    rent: 0,
  }
}

const normalizeHousingPlans = (scenario: Scenario): HousingPlan[] => {
  if (scenario.housingPlans?.length) {
    return scenario.housingPlans
  }
  if (scenario.housing) {
    return [
      {
        id: 'legacy-housing',
        label: '住宅',
        type: 'own',
        startYearOffset: 0,
        endYearOffset: undefined,
        ...scenario.housing,
      },
    ]
  }
  return []
}

const selectActiveHousingPlan = (plans: HousingPlan[], yearIndex: number): HousingPlan | undefined => {
  const candidates = plans.filter((plan) => {
    if (yearIndex < plan.startYearOffset) {
      return false
    }
    if (typeof plan.endYearOffset === 'number' && yearIndex > plan.endYearOffset) {
      return false
    }
    return true
  })
  if (!candidates.length) {
    return undefined
  }
  return candidates.reduce((latest, plan) =>
    plan.startYearOffset >= latest.startYearOffset ? plan : latest,
  )
}

const computeVehicleCost = (
  vehicles: VehicleProfile[] | undefined,
  states: { loanRemaining: number }[] | undefined,
  yearIndex: number,
  yearEvents: string[],
): VehicleCostBreakdown => {
  if (!vehicles?.length || !states?.length) {
    return { total: 0, loan: 0, inspection: 0, maintenance: 0, parking: 0, insurance: 0 }
  }
  let loan = 0
  let inspection = 0
  let maintenance = 0
  let parking = 0
  let insurance = 0
  vehicles.forEach((vehicle, idx) => {
    const state = states[idx]
    const yearlyLoanPayment =
      state.loanRemaining > 0 ? Math.min(vehicle.monthlyLoan * 12, state.loanRemaining) : 0
    state.loanRemaining = Math.max(0, state.loanRemaining - yearlyLoanPayment)
    loan += yearlyLoanPayment
    if (state.loanRemaining === 0 && yearlyLoanPayment > 0) {
      yearEvents.push(`${vehicle.label} ローン完済`)
    }
    if (
      vehicle.inspectionCycleYears > 0 &&
      yearIndex % vehicle.inspectionCycleYears === 0
    ) {
      inspection += vehicle.inspectionCost
      yearEvents.push(`${vehicle.label} 車検`)
    }
    maintenance += vehicle.maintenanceAnnual
    parking += vehicle.parkingMonthly * 12
    insurance += vehicle.insuranceAnnual ?? 0
  })
  const total = loan + inspection + maintenance + parking + insurance
  return { total, loan, inspection, maintenance, parking, insurance }
}

const applySavingsContributions = (accounts: SavingsAccountState[]): number => {
  let totalContribution = 0
  accounts.forEach((account) => {
    totalContribution += account.annualContribution
    account.balance += account.annualContribution
  })
  return totalContribution
}

const applySavingsInterest = (accounts: SavingsAccountState[]): void => {
  accounts.forEach((account) => {
    const growth = account.balance * account.annualInterestRate
    account.balance += growth
  })
}

const coverDeficitWithSavings = (
  accounts: SavingsAccountState[],
  deficit: number,
): number => {
  if (deficit <= 0) {
    return 0
  }
  const ordered = [...accounts].sort((a, b) => {
    const priorityA = a.withdrawPriority ?? (a.type === 'deposit' ? 0 : 1)
    const priorityB = b.withdrawPriority ?? (b.type === 'deposit' ? 0 : 1)
    return priorityA - priorityB
  })
  let remaining = deficit
  ordered.forEach((account) => {
    if (remaining <= 0) {
      return
    }
    const withdrawal = Math.min(account.balance, remaining)
    account.balance -= withdrawal
    remaining -= withdrawal
  })
  return remaining
}

const totalSavings = (accounts: SavingsAccountState[]): number =>
  accounts.reduce((sum, account) => sum + account.balance, 0)

export const simulateScenario = (
  scenario: Scenario,
  options?: SimulationOptions,
): Projection => {
  const horizon = options?.horizonYears ?? scenario.horizonYears ?? DEFAULT_HORIZON_YEARS
  const startYear = scenario.startYear ?? new Date().getFullYear()
  const residentIncomeSeries = scenario.residents.map((resident) =>
    projectIncome(resident, horizon),
  )
  const residentExpenses = scenario.residents.flatMap((resident) =>
    expandExpenseBands(resident, horizon),
  )
  const scenarioExpenses = expandScenarioExpenseBands(scenario.expenseBands, horizon)
  const expenseMap = buildExpenseMap([...residentExpenses, ...scenarioExpenses])

  const housingPlans = normalizeHousingPlans(scenario)
  const housingStates = new Map<string, { mortgageRemaining: number }>()
  housingPlans.forEach((plan) => {
    if (plan.type !== 'own') {
      return
    }
    housingStates.set(plan.id, { mortgageRemaining: plan.mortgageRemaining })
  })
  const vehicleStates = scenario.vehicles?.map((vehicle) => ({ loanRemaining: vehicle.loanRemaining }))
  const savingsAccounts: SavingsAccountState[] = scenario.savingsAccounts.map((account) => ({
    ...account,
    balance: account.balance,
  }))

  const yearly: YearlyBreakdown[] = []
  let cashOnHand = scenario.initialCash ?? 0
  let totalIncome = 0
  let totalExpenses = 0
  let peakNetWorth = cashOnHand + totalSavings(savingsAccounts)
  const negativeYears: number[] = []
  let firstNegativeYear: number | null = null

  for (let yearIndex = 0; yearIndex < horizon; yearIndex += 1) {
    const year = startYear + yearIndex
    const agesByResident = scenario.residents.reduce<Record<string, number>>((acc, resident) => {
      acc[resident.id] = resident.currentAge + yearIndex
      return acc
    }, {})

    const yearEvents: string[] = []

    let incomeForYear = residentIncomeSeries.reduce((sum, series, idx) => {
      const entry = series[yearIndex]
      if (!entry) {
        return sum
      }
      if (entry.events.length) {
        entry.events.forEach((label) => {
          const residentName = scenario.residents[idx]?.name ?? '住人'
          yearEvents.push(`${residentName}: ${label}`)
        })
      }
      return sum + entry.amount
    }, 0)

    scenario.customIncomeEvents?.forEach((event) => {
      if (shouldTriggerIncomeEvent(event, { yearIndex })) {
        yearEvents.push(event.label)
        incomeForYear += event.amount
      }
    })

    const livingCost = computeLivingCostForYear(scenario, yearIndex)
    const activeHousingPlan = selectActiveHousingPlan(housingPlans, yearIndex)
    const housingState =
      activeHousingPlan && activeHousingPlan.type === 'own'
        ? (housingStates.get(activeHousingPlan.id) ?? null)
        : null
    const housingCost = computeHousingCost(activeHousingPlan, housingState, yearIndex, yearEvents)
    if (
      activeHousingPlan?.type === 'own' &&
      typeof activeHousingPlan.endYearOffset === 'number' &&
      yearIndex === activeHousingPlan.endYearOffset &&
      (activeHousingPlan.saleValue || (housingState?.mortgageRemaining ?? 0) > 0)
    ) {
      const remaining = housingState?.mortgageRemaining ?? 0
      const saleValue = activeHousingPlan.saleValue ?? 0
      const netProceeds = saleValue - remaining
      if (housingState) {
        housingState.mortgageRemaining = 0
      }
      if (saleValue > 0 || remaining > 0) {
        yearEvents.push(`${activeHousingPlan.label}: 売却`)
      }
      incomeForYear += netProceeds
    }
    const vehicleCost = computeVehicleCost(scenario.vehicles, vehicleStates, yearIndex, yearEvents)
    const bandExpenses = categorizeExpenses(expenseMap.get(yearIndex) ?? [])

    cashOnHand += incomeForYear
    totalIncome += incomeForYear

    const educationCost = bandExpenses.education
    const housingExtras = bandExpenses.housing
    const vehicleExtras = bandExpenses.vehicle
    const livingExtras = bandExpenses.living
    const otherCost = bandExpenses.other

    const totalHousingCost = housingCost.total + housingExtras
    const totalVehicleCost = vehicleCost.total + vehicleExtras
    const totalLivingCost = livingCost + livingExtras

    const baseExpenseTotal =
      totalLivingCost + totalHousingCost + totalVehicleCost + educationCost + otherCost

    cashOnHand -= baseExpenseTotal
    totalExpenses += baseExpenseTotal

    const totalContribution = applySavingsContributions(savingsAccounts)
    cashOnHand -= totalContribution
    totalExpenses += totalContribution

    if (cashOnHand < 0) {
      const deficit = Math.abs(cashOnHand)
      const remainingDeficit = coverDeficitWithSavings(savingsAccounts, deficit)
      cashOnHand = remainingDeficit > 0 ? -remainingDeficit : 0
      if (remainingDeficit > 0) {
        yearEvents.push('貯蓄を超える赤字')
      }
    }

    applySavingsInterest(savingsAccounts)
    const savingsSnapshot: Record<string, number> = {}
    savingsAccounts.forEach((account) => {
      savingsSnapshot[account.id] = account.balance
    })

    const netWorth = cashOnHand + totalSavings(savingsAccounts)
    if (netWorth > peakNetWorth) {
      peakNetWorth = netWorth
    }
    if (netWorth < 0) {
      negativeYears.push(year)
      if (firstNegativeYear === null) {
        firstNegativeYear = year
      }
    }

    const netCashFlow = incomeForYear - (baseExpenseTotal + totalContribution)

    yearly.push({
      year,
      index: yearIndex,
      agesByResident,
      income: incomeForYear,
      expenses: {
        living: totalLivingCost,
        education: educationCost,
        housing: totalHousingCost,
        vehicle: totalVehicleCost,
        other: otherCost,
        savingsContribution: totalContribution,
      },
      netCashFlow,
      netWorth,
      savingsByAccount: savingsSnapshot,
      events: yearEvents,
    })
  }

  return {
    scenarioId: scenario.id,
    scenarioName: scenario.name,
    yearly,
    summary: {
      totalIncome,
      totalExpenses,
      finalNetWorth: yearly.at(-1)?.netWorth ?? 0,
      firstNegativeYear,
      negativeYears,
      peakNetWorth,
    },
  }
}

export const compareScenarios = (
  scenarios: Scenario[],
  options?: SimulationOptions,
): ScenarioComparison => {
  const projections = scenarios.map((scenario) => simulateScenario(scenario, options))
  let earliestNegativeYear: { scenarioId: string; year: number } | null = null
  projections.forEach((projection) => {
    if (projection.summary.firstNegativeYear === null) {
      return
    }
    if (
      !earliestNegativeYear ||
      projection.summary.firstNegativeYear < earliestNegativeYear.year
    ) {
      earliestNegativeYear = {
        scenarioId: projection.scenarioId,
        year: projection.summary.firstNegativeYear,
      }
    }
  })
  return { projections, earliestNegativeYear }
}

import type { ExpenseBand, IncomeEvent, Resident } from '@models/resident'
import type { HousingPlan, VehicleProfile } from '@models/finance'
import { createId } from '@utils/id'

export type EducationPlanPreset = 'public_all' | 'private_highschool' | 'private_juniorhigh' | 'private_elementary'

export const estimateRetirementAllowanceYen = (netIncomeAnnual: number): number => {
  const income = Number.isFinite(netIncomeAnnual) ? netIncomeAnnual : 0
  if (income <= 0) return 0
  const millions = income / 1_000_000
  // Very rough heuristic: higher income tends to correlate with larger allowances.
  // Clamp to a realistic range to avoid extreme outputs.
  const estimated = 8_000_000 + Math.max(0, millions - 4) * 2_000_000
  return Math.round(Math.min(20_000_000, Math.max(5_000_000, estimated)) / 100_000) * 100_000
}

export const upsertRetirementEvent = (resident: Resident, amount?: number): Resident => {
  const triggerAge = Number.isFinite(resident.retirementAge) ? resident.retirementAge : 65
  const estimated =
    typeof amount === 'number' ? amount : estimateRetirementAllowanceYen(resident.baseNetIncome ?? 0)
  const nextEvents = [...(resident.incomeEvents ?? [])]
  const idx = nextEvents.findIndex((e) => e.type === 'retirement' || e.label === '退職金')
  if (idx >= 0) {
    nextEvents[idx] = {
      ...nextEvents[idx],
      id: nextEvents[idx].id ?? createId('event'),
      label: nextEvents[idx].label ?? '退職金',
      type: 'retirement',
      triggerAge,
      amount: estimated,
    }
  } else {
    nextEvents.push({
      id: createId('event'),
      label: '退職金',
      type: 'retirement',
      triggerAge,
      amount: estimated,
    } satisfies IncomeEvent)
  }
  return { ...resident, incomeEvents: nextEvents }
}

export const estimateHousingMonthlyFees = (): { managementFeeMonthly: number; maintenanceReserveMonthly: number } => {
  return { managementFeeMonthly: 15_000, maintenanceReserveMonthly: 12_000 }
}

export const ensureHousingPlanDefaults = (plan: HousingPlan): HousingPlan => {
  if (plan.type === 'rent') {
    return {
      ...plan,
      id: plan.id ?? createId('housing'),
      label: plan.label ?? '賃貸',
      startYearOffset: plan.startYearOffset ?? 0,
      monthlyFees: plan.monthlyFees ?? 8_000,
      extraAnnualCosts: plan.extraAnnualCosts ?? 0,
      moveInCost: plan.moveInCost ?? 300_000,
      moveOutCost: plan.moveOutCost ?? 150_000,
    }
  }
  const fees = estimateHousingMonthlyFees()
  return {
    ...plan,
    id: plan.id ?? createId('housing'),
    label: plan.label ?? '持ち家',
    startYearOffset: plan.startYearOffset ?? 0,
    managementFeeMonthly: plan.managementFeeMonthly || plan.managementFeeMonthly === 0 ? plan.managementFeeMonthly : fees.managementFeeMonthly,
    maintenanceReserveMonthly:
      plan.maintenanceReserveMonthly || plan.maintenanceReserveMonthly === 0 ? plan.maintenanceReserveMonthly : fees.maintenanceReserveMonthly,
    extraAnnualCosts: plan.extraAnnualCosts ?? 200_000,
    purchaseCost: plan.purchaseCost ?? 0,
    saleValue: plan.saleValue ?? 0,
  }
}

export const estimateVehicleDefaults = (): Pick<
  VehicleProfile,
  'inspectionCycleYears' | 'inspectionCost' | 'maintenanceAnnual' | 'parkingMonthly' | 'insuranceAnnual'
> => ({
  inspectionCycleYears: 2,
  inspectionCost: 120_000,
  maintenanceAnnual: 120_000,
  parkingMonthly: 12_000,
  insuranceAnnual: 70_000,
})

export const buildChildEducationBands = (
  childCurrentAge: number,
  plan: EducationPlanPreset,
): ExpenseBand[] => {
  const age = Number.isFinite(childCurrentAge) ? childCurrentAge : 0
  const stages: Array<{ label: string; startAge: number; endAge: number; annualAmount: number }> = []

  // Preschool: 3–5
  stages.push({ label: '幼稚園/保育園', startAge: 3, endAge: 5, annualAmount: 400_000 })

  // Elementary: 6–11
  stages.push({
    label: plan === 'private_elementary' ? '私立小学校' : '公立小学校',
    startAge: 6,
    endAge: 11,
    annualAmount: plan === 'private_elementary' ? 900_000 : 150_000,
  })

  // Junior high: 12–14
  stages.push({
    label: plan === 'private_elementary' || plan === 'private_juniorhigh' ? '私立中学校' : '公立中学校',
    startAge: 12,
    endAge: 14,
    annualAmount: plan === 'private_elementary' || plan === 'private_juniorhigh' ? 1_000_000 : 200_000,
  })

  // High school: 15–17
  stages.push({
    label: plan === 'public_all' ? '公立高校' : '私立高校',
    startAge: 15,
    endAge: 17,
    annualAmount: plan === 'public_all' ? 300_000 : 900_000,
  })

  // University: 18–21
  stages.push({
    label: plan === 'public_all' ? '国公立大学' : '私立大学',
    startAge: 18,
    endAge: 21,
    annualAmount: plan === 'public_all' ? 700_000 : 1_200_000,
  })

  return stages
    .map((stage) => ({
      id: createId('expense'),
      label: stage.label,
      startAge: Math.max(0, stage.startAge),
      endAge: Math.max(stage.startAge, stage.endAge),
      annualAmount: stage.annualAmount,
      category: 'education' as const,
      notes: `推定（子の現在年齢 ${age}歳）`,
    }))
    .filter((band) => band.endAge >= 0)
}

export interface HousingProfile {
  builtYear: number
  mortgageRemaining: number
  monthlyMortgage: number
  managementFeeMonthly: number
  maintenanceReserveMonthly: number
  extraAnnualCosts?: number
}

export type HousingPlanType = 'own' | 'rent'

export interface HousingPlanBase {
  id: string
  label: string
  type: HousingPlanType
  startYearOffset: number
  endYearOffset?: number
}

export interface OwnHousingPlan extends HousingPlanBase, HousingProfile {
  type: 'own'
  purchaseCost?: number
  saleValue?: number
}

export interface RentHousingPlan extends HousingPlanBase {
  type: 'rent'
  monthlyRent: number
  monthlyFees?: number
  extraAnnualCosts?: number
  moveInCost?: number
  moveOutCost?: number
}

export type HousingPlan = OwnHousingPlan | RentHousingPlan

export interface VehicleProfile {
  id: string
  label: string
  purchaseYear?: number
  purchasePrice: number
  disposalYear?: number
  disposalValue?: number
  loanRemaining: number
  monthlyLoan: number
  inspectionCycleYears: number
  inspectionCost: number
  maintenanceAnnual: number
  parkingMonthly: number
  insuranceAnnual?: number
}

export interface LivingCostProfile {
  baseAnnual: number
  insuranceAnnual?: number
  utilitiesAnnual?: number
  discretionaryAnnual?: number
  healthcareAnnual?: number
  inflationRate?: number
}

export interface LivingPlan {
  id: string
  label: string
  startYearOffset: number
  endYearOffset?: number
  baseAnnual: number
  insuranceAnnual?: number
  utilitiesAnnual?: number
  discretionaryAnnual?: number
  healthcareAnnual?: number
  inflationRate?: number
}

export type SavingsAccountType = 'deposit' | 'investment'

export interface SavingsAccount {
  id: string
  label: string
  type: SavingsAccountType
  balance: number
  annualContribution: number
  annualInterestRate: number
  adjustable: boolean
  withdrawPriority?: number
}

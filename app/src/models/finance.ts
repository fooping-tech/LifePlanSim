export interface HousingProfile {
  builtYear: number
  mortgageRemaining: number
  monthlyMortgage: number
  managementFeeMonthly: number
  maintenanceReserveMonthly: number
  extraAnnualCosts?: number
}

export interface VehicleProfile {
  id: string
  label: string
  purchasePrice: number
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

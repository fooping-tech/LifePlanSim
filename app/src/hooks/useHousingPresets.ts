import { useEffect, useMemo, useState } from 'react'
import type { HousingPlan } from '@models/finance'

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never
export type HousingPlanTemplate = WithoutId<HousingPlan>

export interface HousingPreset {
  id: string
  title: string
  description: string
  plan: HousingPlanTemplate
}

const HOUSING_PRESET_STORAGE = 'lifePlan.housingPresets.custom'

const FALLBACK_PRESETS: HousingPreset[] = [
  {
    id: 'condo-35yr',
    title: '新築マンション・35年ローン',
    description: '築0年のマンションを35年ローンで購入するモデルケース',
    plan: {
      label: '新築マンション',
      type: 'own',
      startYearOffset: 0,
      builtYear: new Date().getFullYear(),
      mortgageRemaining: 42000000,
      monthlyMortgage: 115000,
      managementFeeMonthly: 15000,
      maintenanceReserveMonthly: 12000,
      extraAnnualCosts: 180000,
      purchaseCost: 0,
      saleValue: 0,
    },
  },
  {
    id: 'house-20yr',
    title: '郊外戸建て・20年ローン残',
    description: '築10年の戸建て。管理費なし、修繕積立のみ',
    plan: {
      label: '郊外戸建て',
      type: 'own',
      startYearOffset: 0,
      builtYear: new Date().getFullYear() - 10,
      mortgageRemaining: 22000000,
      monthlyMortgage: 92000,
      managementFeeMonthly: 0,
      maintenanceReserveMonthly: 8000,
      extraAnnualCosts: 120000,
      purchaseCost: 0,
      saleValue: 0,
    },
  },
  {
    id: 'rent-apartment',
    title: '賃貸アパート',
    description: '家賃と共益費のみのシンプルな賃貸モデル',
    plan: {
      label: '賃貸アパート',
      type: 'rent',
      startYearOffset: 0,
      monthlyRent: 110000,
      monthlyFees: 6000,
      extraAnnualCosts: 0,
      moveInCost: 0,
      moveOutCost: 0,
    },
  },
]

const readCustomPresets = (): HousingPreset[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(HOUSING_PRESET_STORAGE)
    if (!raw) {
      return []
    }
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) {
      return []
    }
    return data
      .map((entry) => {
        const preset = entry as Partial<HousingPreset> & { profile?: unknown }
        if (preset.plan) {
          return preset as HousingPreset
        }
        const legacy = preset as Partial<HousingPreset> & { profile?: Record<string, unknown> }
        if (!legacy.profile) {
          return null
        }
        return {
          id: legacy.id ?? `custom-${Date.now()}`,
          title: legacy.title ?? 'カスタム住宅',
          description: legacy.description ?? '',
          plan: {
            label: legacy.title ?? '住宅',
            type: 'own',
            startYearOffset: 0,
            builtYear: Number(legacy.profile.builtYear ?? 0),
            mortgageRemaining: Number(legacy.profile.mortgageRemaining ?? 0),
            monthlyMortgage: Number(legacy.profile.monthlyMortgage ?? 0),
            managementFeeMonthly: Number(legacy.profile.managementFeeMonthly ?? 0),
            maintenanceReserveMonthly: Number(legacy.profile.maintenanceReserveMonthly ?? 0),
            extraAnnualCosts: Number(legacy.profile.extraAnnualCosts ?? 0),
            purchaseCost: 0,
            saleValue: 0,
          },
        } satisfies HousingPreset
      })
      .filter((preset): preset is HousingPreset => Boolean(preset))
  } catch {
    return []
  }
}

const writeCustomPresets = (presets: HousingPreset[]) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(HOUSING_PRESET_STORAGE, JSON.stringify(presets))
  } catch {
    // ignore
  }
}

export const useHousingPresets = () => {
  const [builtin, setBuiltin] = useState<HousingPreset[]>(FALLBACK_PRESETS)
  const [custom, setCustom] = useState<HousingPreset[]>(() => readCustomPresets())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const response = await fetch('/presets/housing.json')
        if (!response.ok) {
          throw new Error('読み込みに失敗しました')
        }
        const data = (await response.json()) as HousingPreset[]
        if (mounted) {
          setBuiltin(data)
        }
      } catch (err) {
        if (mounted) {
          setError((err as Error).message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const presets = useMemo(() => [...builtin, ...custom], [builtin, custom])

  const addCustomPreset = (preset: HousingPreset) => {
    setCustom((prev) => {
      const next = [...prev, preset]
      writeCustomPresets(next)
      return next
    })
  }

  const removeCustomPreset = (presetId: string) => {
    setCustom((prev) => {
      const next = prev.filter((preset) => preset.id !== presetId)
      writeCustomPresets(next)
      return next
    })
  }

  return {
    presets,
    loading,
    error,
    addCustomPreset,
    removeCustomPreset,
  }
}

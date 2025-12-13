import { useEffect, useMemo, useState } from 'react'
import type { VehicleProfile } from '@models/finance'

export interface VehiclePreset {
  id: string
  title: string
  description: string
  profile: VehicleProfile
}

const VEHICLE_PRESET_STORAGE = 'lifePlan.vehiclePresets.custom'

const FALLBACK_PRESETS: VehiclePreset[] = [
  {
    id: 'compact-loan',
    title: 'コンパクトカー（5年ローン）',
    description: '車両価格200万円を5年ローンで購入するモデルケース',
    profile: {
      id: '',
      label: 'コンパクトカー',
      purchaseYear: new Date().getFullYear() - 1,
      purchasePrice: 2000000,
      disposalYear: new Date().getFullYear() + 4,
      disposalValue: 800000,
      loanRemaining: 1200000,
      monthlyLoan: 35000,
      inspectionCycleYears: 2,
      inspectionCost: 110000,
      maintenanceAnnual: 80000,
      parkingMonthly: 15000,
      insuranceAnnual: 70000,
    },
  },
  {
    id: 'minivan-cash',
    title: 'ミニバン（現金一括）',
    description: '350万円を現金で購入し、維持費のみ計上',
    profile: {
      id: '',
      label: 'ミニバン',
      purchaseYear: new Date().getFullYear() - 2,
      purchasePrice: 3500000,
      disposalYear: new Date().getFullYear() + 8,
      disposalValue: 1000000,
      loanRemaining: 0,
      monthlyLoan: 0,
      inspectionCycleYears: 2,
      inspectionCost: 130000,
      maintenanceAnnual: 120000,
      parkingMonthly: 18000,
      insuranceAnnual: 95000,
    },
  },
]

const readCustomPresets = (): VehiclePreset[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(VEHICLE_PRESET_STORAGE)
    if (!raw) {
      return []
    }
    return JSON.parse(raw) as VehiclePreset[]
  } catch {
    return []
  }
}

const writeCustomPresets = (presets: VehiclePreset[]) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(VEHICLE_PRESET_STORAGE, JSON.stringify(presets))
  } catch {
    // ignore
  }
}

export const useVehiclePresets = () => {
  const [builtin, setBuiltin] = useState<VehiclePreset[]>(FALLBACK_PRESETS)
  const [custom, setCustom] = useState<VehiclePreset[]>(() => readCustomPresets())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const response = await fetch('/presets/vehicles.json')
        if (!response.ok) {
          throw new Error('プリセット読込に失敗しました')
        }
        const data = (await response.json()) as VehiclePreset[]
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

  const addCustomPreset = (preset: VehiclePreset) => {
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

  const buildVehiclePayload = (preset: VehiclePreset, index: number): VehicleProfile => ({
    ...preset.profile,
    id: preset.profile.id || `vehicle-preset-${preset.id}-${index}-${Math.random().toString(36).slice(2, 6)}`,
  })

  return {
    presets,
    loading,
    error,
    addCustomPreset,
    removeCustomPreset,
    buildVehiclePayload,
  }
}

import { useEffect, useMemo, useState } from 'react'
import type { SavingsAccount } from '@models/finance'

export interface SavingsPreset {
  id: string
  title: string
  description: string
  account: Omit<SavingsAccount, 'id'>
}

const SAVINGS_PRESET_STORAGE = 'lifePlan.savingsPresets.custom'

const FALLBACK_PRESETS: SavingsPreset[] = [
  {
    id: 'cash-buffer',
    title: '生活防衛資金（普通預金）',
    description: '当座費用6か月分を預金で確保するテンプレート',
    account: {
      label: '普通預金',
      type: 'deposit',
      balance: 1500000,
      annualContribution: 300000,
      annualInterestRate: 0.001,
      adjustable: true,
      withdrawPriority: 1,
    },
  },
  {
    id: 'tsumitate-nisa',
    title: '積立NISA (インデックス投資)',
    description: '年間80万円を積立。期待利回り5%',
    account: {
      label: '積立NISA',
      type: 'investment',
      balance: 500000,
      annualContribution: 800000,
      annualInterestRate: 0.05,
      adjustable: false,
      withdrawPriority: 3,
    },
  },
]

const readCustomPresets = (): SavingsPreset[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(SAVINGS_PRESET_STORAGE)
    if (!raw) {
      return []
    }
    return JSON.parse(raw) as SavingsPreset[]
  } catch {
    return []
  }
}

const writeCustomPresets = (presets: SavingsPreset[]) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(SAVINGS_PRESET_STORAGE, JSON.stringify(presets))
  } catch {
    // ignore
  }
}

export const useSavingsPresets = () => {
  const [builtin, setBuiltin] = useState<SavingsPreset[]>(FALLBACK_PRESETS)
  const [custom, setCustom] = useState<SavingsPreset[]>(() => readCustomPresets())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const response = await fetch('/presets/savings.json')
        if (!response.ok) {
          throw new Error('プリセット読込に失敗しました')
        }
        const data = (await response.json()) as SavingsPreset[]
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

  const addCustomPreset = (preset: SavingsPreset) => {
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

  const buildAccountPayload = (preset: SavingsPreset): SavingsAccount => ({
    id: crypto.randomUUID?.() ?? `savings-${Math.random().toString(36).slice(2, 8)}`,
    ...preset.account,
  })

  return {
    presets,
    loading,
    error,
    addCustomPreset,
    removeCustomPreset,
    buildAccountPayload,
  }
}

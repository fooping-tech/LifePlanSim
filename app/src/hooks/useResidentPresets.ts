import { useEffect, useMemo, useState } from 'react'
import type { ExpenseBand, Resident } from '@models/resident'

export interface ResidentPreset {
  id: string
  title: string
  description: string
  resident: Resident
}

const RESIDENT_PRESET_STORAGE = 'lifePlan.residentPresets.custom'

const FALLBACK_PRESETS: ResidentPreset[] = [
  {
    id: 'dual-income-husband',
    title: '夫（共働き）',
    description: '共働き世帯の夫テンプレート（子どもは別途追加）',
    resident: {
      id: 'preset-husband',
      name: '夫',
      currentAge: 34,
      retirementAge: 65,
      baseNetIncome: 6000000,
      annualIncomeGrowthRate: 0.025,
      dependents: 0,
      incomeEvents: [
        { id: 'event-1', label: '昇進', type: 'raise', amount: 600000, triggerAge: 40 },
        { id: 'event-2', label: '退職金', type: 'bonus', amount: 15000000, triggerAge: 60 },
      ],
      expenseBands: [],
    },
  },
  {
    id: 'dual-income-wife',
    title: '妻（共働き）',
    description: '共働き世帯の妻テンプレート（子どもは別途追加）',
    resident: {
      id: 'preset-wife',
      name: '妻',
      currentAge: 33,
      retirementAge: 65,
      baseNetIncome: 5200000,
      annualIncomeGrowthRate: 0.02,
      dependents: 0,
      incomeEvents: [
        { id: 'event-3', label: '昇給', type: 'raise', amount: 400000, triggerAge: 38 },
        {
          id: 'event-4',
          label: '育休',
          type: 'reduction',
          amount: -800000,
          triggerAge: 35,
          durationYears: 1,
        },
        { id: 'event-4b', label: '退職金', type: 'bonus', amount: 12000000, triggerAge: 60 },
      ],
      expenseBands: [],
    },
  },
  {
    id: 'husband-part-time',
    title: '夫（パートタイム）',
    description: 'パートタイム/時短勤務を想定した夫テンプレート（子どもは別途追加）',
    resident: {
      id: 'preset-husband-part',
      name: '夫（パート）',
      currentAge: 34,
      retirementAge: 65,
      baseNetIncome: 2800000,
      annualIncomeGrowthRate: 0.01,
      dependents: 0,
      incomeEvents: [
        { id: 'event-pt-1', label: '昇給', type: 'raise', amount: 200000, triggerAge: 40 },
        { id: 'event-pt-2', label: '退職金', type: 'bonus', amount: 5000000, triggerAge: 60 },
      ],
      expenseBands: [],
    },
  },
  {
    id: 'wife-part-time',
    title: '妻（パートタイム）',
    description: 'パートタイム/時短勤務を想定した妻テンプレート（子どもは別途追加）',
    resident: {
      id: 'preset-wife-part',
      name: '妻（パート）',
      currentAge: 33,
      retirementAge: 65,
      baseNetIncome: 2400000,
      annualIncomeGrowthRate: 0.01,
      dependents: 0,
      incomeEvents: [
        { id: 'event-pt-3', label: '昇給', type: 'raise', amount: 150000, triggerAge: 40 },
        { id: 'event-pt-4', label: '退職金', type: 'bonus', amount: 4000000, triggerAge: 60 },
      ],
      expenseBands: [],
    },
  },
  {
    id: 'late-retiree',
    title: 'シニア再雇用',
    description: '定年後も再雇用で70歳まで働くシニア向けテンプレート',
    resident: {
      id: 'preset-late',
      name: '次郎',
      currentAge: 58,
      retirementAge: 70,
      baseNetIncome: 4800000,
      annualIncomeGrowthRate: 0.015,
      dependents: 0,
      incomeEvents: [
        { id: 'event-5', label: '再雇用開始', type: 'reduction', amount: -1200000, triggerAge: 65 },
        { id: 'event-6', label: '年金加算', type: 'bonus', amount: 1800000, triggerAge: 68 },
      ],
      expenseBands: [
        {
          id: 'exp-6',
          label: '親介護費用',
          category: 'living',
          startAge: 60,
          endAge: 65,
          annualAmount: 800000,
        },
      ],
    },
  },
  {
    id: 'child-public-all',
    title: '子ども: 全て国公立',
    description: '小学校〜大学まで国公立で進学する想定',
    resident: {
      id: 'child-public',
      name: '子ども(国公立)',
      currentAge: 0,
      retirementAge: 22,
      baseNetIncome: 0,
      annualIncomeGrowthRate: 0,
      dependents: 0,
      incomeEvents: [],
      expenseBands: [
        {
          id: 'child-public-es',
          label: '小学校 公立',
          category: 'education',
          startAge: 6,
          endAge: 12,
          annualAmount: 400000,
        },
        {
          id: 'child-public-jh',
          label: '中学校 公立',
          category: 'education',
          startAge: 12,
          endAge: 15,
          annualAmount: 500000,
        },
        {
          id: 'child-public-hs',
          label: '高校 公立',
          category: 'education',
          startAge: 15,
          endAge: 18,
          annualAmount: 600000,
        },
        {
          id: 'child-public-univ',
          label: '大学 国公立',
          category: 'education',
          startAge: 18,
          endAge: 22,
          annualAmount: 800000,
        },
      ],
    },
  },
  {
    id: 'child-private-full',
    title: '子ども: 小学校から私立',
    description: '小学校から大学まで私立に通う想定',
    resident: {
      id: 'child-full',
      name: '子ども(私立一貫)',
      currentAge: 0,
      retirementAge: 22,
      baseNetIncome: 0,
      annualIncomeGrowthRate: 0,
      dependents: 0,
      incomeEvents: [],
      expenseBands: [
        {
          id: 'child-full-es',
          label: '小学校 私立',
          category: 'education',
          startAge: 6,
          endAge: 12,
          annualAmount: 900000,
        },
        {
          id: 'child-full-jh',
          label: '中学校 私立',
          category: 'education',
          startAge: 12,
          endAge: 15,
          annualAmount: 1200000,
        },
        {
          id: 'child-full-hs',
          label: '高校 私立',
          category: 'education',
          startAge: 15,
          endAge: 18,
          annualAmount: 1400000,
        },
        {
          id: 'child-full-univ',
          label: '大学 私立',
          category: 'education',
          startAge: 18,
          endAge: 22,
          annualAmount: 1600000,
        },
      ],
    },
  },
  {
    id: 'child-private-from-junior',
    title: '子ども: 中学から私立',
    description: '小学校までは公立、中学から私立に通うパターン',
    resident: {
      id: 'child-junior',
      name: '子ども(中学から私立)',
      currentAge: 0,
      retirementAge: 22,
      baseNetIncome: 0,
      annualIncomeGrowthRate: 0,
      dependents: 0,
      incomeEvents: [],
      expenseBands: [
        {
          id: 'child-junior-es',
          label: '小学校 公立',
          category: 'education',
          startAge: 6,
          endAge: 12,
          annualAmount: 400000,
        },
        {
          id: 'child-jh',
          label: '中学校 私立',
          category: 'education',
          startAge: 12,
          endAge: 15,
          annualAmount: 1100000,
        },
        {
          id: 'child-hs',
          label: '高校 私立',
          category: 'education',
          startAge: 15,
          endAge: 18,
          annualAmount: 1350000,
        },
        {
          id: 'child-univ',
          label: '大学 私立',
          category: 'education',
          startAge: 18,
          endAge: 22,
          annualAmount: 1600000,
        },
      ],
    },
  },
  {
    id: 'child-private-college',
    title: '子ども: 大学から私立',
    description: '大学のみ私立に進学し、それ以前は公立の想定',
    resident: {
      id: 'child-college',
      name: '子ども(大学から私立)',
      currentAge: 0,
      retirementAge: 22,
      baseNetIncome: 0,
      annualIncomeGrowthRate: 0,
      dependents: 0,
      incomeEvents: [],
      expenseBands: [
        {
          id: 'child-college-es',
          label: '小学校 公立',
          category: 'education',
          startAge: 6,
          endAge: 12,
          annualAmount: 400000,
        },
        {
          id: 'child-college-jh',
          label: '中学校 公立',
          category: 'education',
          startAge: 12,
          endAge: 15,
          annualAmount: 500000,
        },
        {
          id: 'child-college-hs',
          label: '高校 公立',
          category: 'education',
          startAge: 15,
          endAge: 18,
          annualAmount: 600000,
        },
        {
          id: 'child-college-univ',
          label: '大学 私立',
          category: 'education',
          startAge: 18,
          endAge: 22,
          annualAmount: 1400000,
        },
      ],
    },
  },
]

const normalizeExpenseIds = (bands: ExpenseBand[]) =>
  bands.map((band) => ({
    ...band,
    id: band.id ?? crypto.randomUUID?.() ?? `exp-${Math.random().toString(36).slice(2, 8)}`,
  }))

const readCustomPresets = (): ResidentPreset[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(RESIDENT_PRESET_STORAGE)
    if (!raw) {
      return []
    }
    const data = JSON.parse(raw) as ResidentPreset[]
    return data
  } catch {
    return []
  }
}

const writeCustomPresets = (presets: ResidentPreset[]) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(RESIDENT_PRESET_STORAGE, JSON.stringify(presets))
  } catch {
    // ignore
  }
}

export const useResidentPresets = () => {
  const [builtin, setBuiltin] = useState<ResidentPreset[]>(FALLBACK_PRESETS)
  const [custom, setCustom] = useState<ResidentPreset[]>(() => readCustomPresets())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const response = await fetch('/presets/residents.json')
        if (!response.ok) {
          throw new Error('プリセットの取得に失敗しました')
        }
        const data = (await response.json()) as ResidentPreset[]
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

  const addCustomPreset = (preset: ResidentPreset) => {
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

  const toResidentPayload = (preset: ResidentPreset): Resident => ({
    ...preset.resident,
    id: crypto.randomUUID?.() ?? `resident-${Math.random().toString(36).slice(2, 8)}`,
    incomeEvents: preset.resident.incomeEvents?.map((event) => ({
      ...event,
      id: event.id ?? crypto.randomUUID?.() ?? `event-${Math.random().toString(36).slice(2, 8)}`,
    })) ?? [],
    expenseBands: normalizeExpenseIds(preset.resident.expenseBands ?? []),
  })

  return {
    presets,
    loading,
    error,
    addCustomPreset,
    removeCustomPreset,
    toResidentPayload,
  }
}

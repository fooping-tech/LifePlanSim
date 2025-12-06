import { useEffect, useMemo, useState } from 'react'
import { createId } from '@utils/id'

export const EDUCATION_STAGE_OPTIONS = [
  { id: 'elementary', label: '小学生' },
  { id: 'juniorHigh', label: '中学生' },
  { id: 'highSchool', label: '高校生' },
  { id: 'college', label: '大学/専門' },
  { id: 'lessons', label: '習い事' },
] as const

export type EducationPresetStage = (typeof EDUCATION_STAGE_OPTIONS)[number]['id']

export type EducationPresetBandTemplate = {
  label: string
  category: 'education' | 'lessons' | 'event' | 'other'
  annualAmount: number
  startAge: number
  endAge: number
}

export type EducationPresetSource = 'builtin' | 'custom'

export interface EducationPreset {
  id: string
  stage: EducationPresetStage
  title: string
  description: string
  bands: EducationPresetBandTemplate[]
  source: EducationPresetSource
}

const BUILTIN_FALLBACK: EducationPreset[] = [
  {
    id: 'elementary-public',
    stage: 'elementary',
    title: '小学生（公立）',
    description: '公立小学校に通うケース。学用品や習い事1つ程度を含めた平均モデル。',
    bands: [
      {
        label: '小学生 公立',
        category: 'education',
        annualAmount: 400000,
        startAge: 6,
        endAge: 12,
      },
    ],
    source: 'builtin',
  },
  {
    id: 'junior-private',
    stage: 'juniorHigh',
    title: '中学生（私立）',
    description: '私立中学の授業料と塾費用を合わせたモデル。',
    bands: [
      {
        label: '中学生 私立',
        category: 'education',
        annualAmount: 950000,
        startAge: 12,
        endAge: 15,
      },
    ],
    source: 'builtin',
  },
  {
    id: 'high-cram',
    stage: 'highSchool',
    title: '高校＋受験予備校',
    description: '高校3年間と大学受験向け予備校費用を含めたセット。',
    bands: [
      {
        label: '高校 授業料',
        category: 'education',
        annualAmount: 650000,
        startAge: 15,
        endAge: 18,
      },
      {
        label: '大学受験予備校',
        category: 'lessons',
        annualAmount: 500000,
        startAge: 17,
        endAge: 18,
      },
    ],
    source: 'builtin',
  },
  {
    id: 'college-private',
    stage: 'college',
    title: '私立大学（文系）＋仕送り',
    description: '入学金・学費に加え毎年の仕送りを含めた私立文系モデル。',
    bands: [
      {
        label: '私立大学 学費',
        category: 'education',
        annualAmount: 1200000,
        startAge: 18,
        endAge: 22,
      },
      {
        label: '仕送り',
        category: 'other',
        annualAmount: 960000,
        startAge: 18,
        endAge: 22,
      },
    ],
    source: 'builtin',
  },
  {
    id: 'lessons-piano',
    stage: 'lessons',
    title: 'ピアノ＋スポーツクラブ',
    description: '年間を通じて継続する習い事2種をまとめて登録。',
    bands: [
      {
        label: 'ピアノ教室',
        category: 'lessons',
        annualAmount: 240000,
        startAge: 5,
        endAge: 14,
      },
      {
        label: 'スポーツクラブ',
        category: 'lessons',
        annualAmount: 180000,
        startAge: 7,
        endAge: 15,
      },
    ],
    source: 'builtin',
  },
]

type FetchablePreset = Omit<EducationPreset, 'source'>

const CUSTOM_PRESET_STORAGE = 'lifePlan.educationPresets.custom'

const readCustomStorage = ():EducationPreset[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(CUSTOM_PRESET_STORAGE)
    if (!raw) {
      return []
    }
    const data = JSON.parse(raw) as Array<FetchablePreset & { source?: EducationPresetSource }>
    return data.map((preset) => {
      const { source, ...rest } = preset
      void source
      return {
        ...rest,
        source: 'custom' as const,
      }
    })
  } catch {
    return []
  }
}

const writeCustomStorage = (presets: EducationPreset[]) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    const payload = JSON.stringify(presets)
    window.localStorage.setItem(CUSTOM_PRESET_STORAGE, payload)
  } catch {
    // noop
  }
}

export type CustomPresetInput = {
  title: string
  description: string
  stage: EducationPresetStage
  bands: EducationPresetBandTemplate[]
}

export const useEducationPresets = () => {
  const [builtinPresets, setBuiltinPresets] = useState<EducationPreset[]>([])
  const [customPresets, setCustomPresets] = useState<EducationPreset[]>(() => readCustomStorage())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const loadPresets = async () => {
      try {
        const response = await fetch('/presets/education.json')
        if (!response.ok) {
          throw new Error('プリセットの取得に失敗しました')
        }
        const data = (await response.json()) as FetchablePreset[]
        if (!mounted) {
          return
        }
        setBuiltinPresets(
          data.map((preset) => ({
            ...preset,
            source: 'builtin' as const,
          })),
        )
      } catch (err) {
        if (mounted) {
          setBuiltinPresets(BUILTIN_FALLBACK)
          setError((err as Error).message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadPresets()
    return () => {
      mounted = false
    }
  }, [])

  const addCustomPreset = (input: CustomPresetInput) => {
    const preset: EducationPreset = {
      ...input,
      id: createId('eduPreset'),
      source: 'custom',
    }
    setCustomPresets((prev) => {
      const next = [...prev, preset]
      writeCustomStorage(next)
      return next
    })
    return preset
  }

  const removeCustomPreset = (presetId: string) => {
    setCustomPresets((prev) => {
      const next = prev.filter((preset) => preset.id !== presetId)
      writeCustomStorage(next)
      return next
    })
  }

  const presets = useMemo(() => [...builtinPresets, ...customPresets], [builtinPresets, customPresets])

  return {
    presets,
    builtinPresets,
    customPresets,
    loading,
    error,
    addCustomPreset,
    removeCustomPreset,
    stageOptions: EDUCATION_STAGE_OPTIONS,
  }
}

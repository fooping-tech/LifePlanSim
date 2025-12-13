import { useEffect, useMemo, useState } from 'react'

export type LivingPreset = {
  id: string
  title: string
  description: string
  monthly: {
    base: number
    insurance?: number
    utilities?: number
    discretionary?: number
    healthcare?: number
  }
  inflationRate?: number
}

export const useLivingPresets = () => {
  const [presets, setPresets] = useState<LivingPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const response = await fetch('/presets/living.json')
        if (!response.ok) {
          throw new Error('読み込みに失敗しました')
        }
        const data = (await response.json()) as LivingPreset[]
        if (mounted) {
          setPresets(data)
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

  return useMemo(
    () => ({
      presets,
      loading,
      error,
    }),
    [presets, loading, error],
  )
}


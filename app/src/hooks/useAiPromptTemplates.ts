import { useEffect, useMemo, useState } from 'react'

export interface AiPromptTemplate {
  id: string
  title: string
  description: string
  requestTemplateText: string
}

const FALLBACK_TEMPLATES: AiPromptTemplate[] = [
  {
    id: 'dual-income-kids-mortgage-car',
    title: '共働き + 子ども + 住宅ローン + 車買い替え',
    description: '教育費や住宅費・車の買い替えまで、漏れやすい項目を埋める質問票です。',
    requestTemplateText:
      '【家族】（必要に応じて変更してください）\n- 夫: 年齢40歳 / 手取り年収800万円 / 退職年齢65歳 / 昇給率1.0% / 退職金1500万円\n- 妻: 年齢40歳 / 手取り年収500万円 / 退職年齢65歳 / 昇給率1.0% / 退職金1000万円\n- 子ども: 小5（11歳）, 小3（9歳） / 高校から私立 / 大学は私立\n\n【開始年】\n- startYear: 2025\n\n【生活費（月額）】\n- 月50万円（込み込み）\n\n【住宅（持ち家）】\n- ローン残高1800万円 / 月々85000円 / 管理費15000円/月 / 修繕12000円/月 / 税など15万円/年\n\n【車】\n- 現在: VOXY（購入2018年、売却2030年、売却50万円）\n- 年間コスト: 車検12万/回(2年), 保険7万/年, 駐車場1.2万/月, メンテ12万/年\n- 買い替え: 2030年に400万円（頭金50万、ローン350万、月々6万）\n\n【資産（現在残高）】\n- 現金200万円（最低残高100万円）\n- 投資（会社/分散/NISA）: 500万/500万/1000万\n- 年間積立100万円/年',
  },
]

export const useAiPromptTemplates = () => {
  const [builtin, setBuiltin] = useState<AiPromptTemplate[]>(FALLBACK_TEMPLATES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const response = await fetch('/presets/ai-prompt-templates.json')
        if (!response.ok) {
          throw new Error('テンプレート読込に失敗しました')
        }
        const data = (await response.json()) as AiPromptTemplate[]
        if (mounted && Array.isArray(data) && data.length) {
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

  const templates = useMemo(() => builtin, [builtin])

  return { templates, loading, error }
}

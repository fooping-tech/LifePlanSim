import { FormEvent, useMemo, useState } from 'react'
import {
  EDUCATION_STAGE_OPTIONS,
  type EducationPresetStage,
  type EducationPresetBandTemplate,
  useEducationPresets,
} from '@hooks/useEducationPresets'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)

type CustomFormState = {
  title: string
  description: string
  stage: EducationPresetStage
  label: string
  category: EducationPresetBandTemplate['category']
  startAge: number
  endAge: number
  annualAmount: number
}

const initialCustomState: CustomFormState = {
  title: '',
  description: '',
  stage: 'elementary',
  label: '',
  category: 'education',
  startAge: 6,
  endAge: 12,
  annualAmount: 300000,
}

interface EducationPresetDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (bands: EducationPresetBandTemplate[]) => void
}

export const EducationPresetDialog = ({ isOpen, onClose, onApply }: EducationPresetDialogProps) => {
  const { presets, loading, error, addCustomPreset, removeCustomPreset } = useEducationPresets()
  const [stageFilter, setStageFilter] = useState<'all' | EducationPresetStage>('all')
  const [search, setSearch] = useState('')
  const [customForm, setCustomForm] = useState<CustomFormState>(initialCustomState)
  const [feedback, setFeedback] = useState<string | null>(null)

  const filteredPresets = useMemo(() => {
    if (!presets.length) {
      return []
    }
    const lowerSearch = search.trim().toLowerCase()
    return presets.filter((preset) => {
      const matchesStage = stageFilter === 'all' || preset.stage === stageFilter
      if (!matchesStage) {
        return false
      }
      if (!lowerSearch) {
        return true
      }
      return (
        preset.title.toLowerCase().includes(lowerSearch) ||
        preset.description.toLowerCase().includes(lowerSearch)
      )
    })
  }, [presets, stageFilter, search])

  if (!isOpen) {
    return null
  }

  const handleCustomChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setCustomForm((prev) => ({
      ...prev,
      [name]: name === 'annualAmount' || name === 'startAge' || name === 'endAge' ? Number(value) : value,
    }))
  }

  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!customForm.title.trim()) {
      setFeedback('タイトルを入力してください')
      return
    }
    const formLabel = customForm.label.trim() || customForm.title.trim()
    const startAge = Number(customForm.startAge)
    const endAge = Number(customForm.endAge)
    const annualAmount = Number(customForm.annualAmount)
    if (!Number.isFinite(startAge) || !Number.isFinite(endAge) || endAge <= startAge) {
      setFeedback('開始年齢と終了年齢を確認してください')
      return
    }
    addCustomPreset({
      title: customForm.title.trim(),
      description: customForm.description.trim(),
      stage: customForm.stage,
      bands: [
        {
          label: formLabel,
          category: customForm.category,
          startAge,
          endAge,
          annualAmount,
        },
      ],
    })
    setCustomForm(initialCustomState)
    setFeedback('カスタムプリセットを保存しました')
  }

  const handleApply = (bands: EducationPresetBandTemplate[]) => {
    onApply(bands)
    onClose()
  }

  const activeStageLabel =
    stageFilter === 'all' ? 'すべて' : EDUCATION_STAGE_OPTIONS.find((stage) => stage.id === stageFilter)?.label ?? ''

  return (
    <div className="preset-modal" role="dialog" aria-modal="true" aria-label="教育・習い事プリセット">
      <div className="preset-modal__panel">
        <header className="preset-modal__header">
          <div>
            <h3>教育・習い事プリセット</h3>
            <p>学費や習い事をプリセットから素早く登録できます。</p>
          </div>
          <button type="button" className="preset-modal__close-btn" onClick={onClose}>
            閉じる
          </button>
        </header>
        <div className="preset-modal__filters">
          <div className="preset-stage-filter" role="tablist" aria-label="教育段階フィルター">
            <button
              type="button"
              role="tab"
              aria-selected={stageFilter === 'all'}
              className={['preset-stage-filter__btn', stageFilter === 'all' ? 'is-active' : ''].join(' ')}
              onClick={() => setStageFilter('all')}
            >
              すべて
            </button>
            {EDUCATION_STAGE_OPTIONS.map((stage) => (
              <button
                key={stage.id}
                type="button"
                role="tab"
                aria-selected={stageFilter === stage.id}
                className={['preset-stage-filter__btn', stageFilter === stage.id ? 'is-active' : ''].join(' ')}
                onClick={() => setStageFilter(stage.id)}
              >
                {stage.label}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="プリセットを検索"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {error ? <p className="preset-modal__status">プリセット読込中に問題が発生しました: {error}</p> : null}
        {loading ? (
          <p className="preset-modal__status">プリセットを読込中です…</p>
        ) : (
          <div className="preset-modal__grid" aria-live="polite">
            {filteredPresets.length ? (
              filteredPresets.map((preset) => {
                const totalYears = preset.bands.reduce(
                  (sum, band) => sum + Math.max(0, band.endAge - band.startAge),
                  0,
                )
                const totalAnnual = preset.bands.reduce((sum, band) => sum + band.annualAmount, 0)
                const stageLabel =
                  EDUCATION_STAGE_OPTIONS.find((stage) => stage.id === preset.stage)?.label ?? preset.stage
                return (
                  <article key={preset.id} className="preset-card">
                    <header>
                      <div>
                        <p className="preset-card__stage">{stageLabel}</p>
                        <h4>{preset.title}</h4>
                      </div>
                      <span className="preset-card__source">{preset.source === 'builtin' ? '標準' : 'カスタム'}</span>
                    </header>
                    <p className="preset-card__description">{preset.description}</p>
                    <ul className="preset-card__bands">
                      {preset.bands.map((band, index) => (
                        <li key={`${preset.id}-${band.label}-${index}`}>
                          <strong>{band.label}</strong>
                          <span>{formatCurrency(band.annualAmount)} / 年</span>
                          <span>
                            {band.startAge}歳〜{band.endAge}歳
                          </span>
                          <span className="preset-card__category-tag">{band.category}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="preset-card__meta">
                      <span>年間合計: {formatCurrency(totalAnnual)}</span>
                      <span>期間合計: {totalYears}年</span>
                    </div>
                    <div className="preset-card__actions">
                      <button type="button" onClick={() => handleApply(preset.bands)}>
                        このプリセットを適用
                      </button>
                      {preset.source === 'custom' ? (
                        <button type="button" className="link-button" onClick={() => removeCustomPreset(preset.id)}>
                          削除
                        </button>
                      ) : null}
                    </div>
                  </article>
                )
              })
            ) : (
              <p className="preset-modal__status">
                {activeStageLabel}のプリセットが見つかりませんでした。条件を変更してください。
              </p>
            )}
          </div>
        )}
        <section className="preset-modal__custom">
          <h4>カスタムプリセットを登録</h4>
          <form onSubmit={handleCustomSubmit} className="preset-custom-form">
            <label>
              タイトル
              <input name="title" value={customForm.title} onChange={handleCustomChange} required />
            </label>
            <label>
              説明
              <textarea name="description" value={customForm.description} onChange={handleCustomChange} rows={2} />
            </label>
            <label>
              対象
              <select name="stage" value={customForm.stage} onChange={handleCustomChange}>
                {EDUCATION_STAGE_OPTIONS.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              バンド名
              <input name="label" value={customForm.label} onChange={handleCustomChange} placeholder="例: 高校授業料" />
            </label>
            <label>
              カテゴリ
              <select name="category" value={customForm.category} onChange={handleCustomChange}>
                <option value="education">教育</option>
                <option value="lessons">習い事</option>
                <option value="event">イベント</option>
                <option value="other">その他</option>
              </select>
            </label>
            <label>
              開始年齢
              <input
                type="number"
                name="startAge"
                value={customForm.startAge}
                onChange={handleCustomChange}
                min={0}
              />
            </label>
            <label>
              終了年齢
              <input type="number" name="endAge" value={customForm.endAge} onChange={handleCustomChange} min={0} />
            </label>
            <label>
              年間支出
              <input
                type="number"
                name="annualAmount"
                value={customForm.annualAmount}
                onChange={handleCustomChange}
                min={0}
              />
            </label>
            <button type="submit" className="preset-custom-form__submit">
              カスタムプリセットを保存
            </button>
          </form>
          {feedback ? <p className="preset-modal__status">{feedback}</p> : null}
        </section>
      </div>
    </div>
  )
}

import { useLivingPresets } from '@hooks/useLivingPresets'
import type { LivingPreset } from '@hooks/useLivingPresets'

const formatYen = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)

interface LivingPresetDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (preset: LivingPreset) => void
}

export const LivingPresetDialog = ({ isOpen, onClose, onApply }: LivingPresetDialogProps) => {
  const { presets, loading, error } = useLivingPresets()

  if (!isOpen) {
    return null
  }

  return (
    <div className="preset-modal" role="dialog" aria-modal="true" aria-label="生活費プリセット">
      <div className="preset-modal__panel">
        <header className="preset-modal__header">
          <div>
            <h3>生活費プリセット</h3>
            <p>月額のテンプレートを読み込み、生活費へ適用できます。</p>
          </div>
          <button type="button" className="preset-modal__close-btn" onClick={onClose}>
            閉じる
          </button>
        </header>
        {error ? <p className="preset-modal__status">プリセット取得に失敗しました: {error}</p> : null}
        {loading ? (
          <p className="preset-modal__status">読込中...</p>
        ) : (
          <div className="preset-modal__grid">
            {presets.map((preset) => (
              <article key={preset.id} className="preset-card">
                <header>
                  <div>
                    <p className="preset-card__stage">物価上昇率: {preset.inflationRate ?? 0}</p>
                    <h4>{preset.title}</h4>
                  </div>
                </header>
                <p className="preset-card__description">{preset.description}</p>
                <ul className="preset-card__bands">
                  <li>基本生活費: {formatYen(preset.monthly.base)}/月</li>
                  <li>保険: {formatYen(preset.monthly.insurance ?? 0)}/月</li>
                  <li>光熱費: {formatYen(preset.monthly.utilities ?? 0)}/月</li>
                  <li>自由費: {formatYen(preset.monthly.discretionary ?? 0)}/月</li>
                  <li>医療費: {formatYen(preset.monthly.healthcare ?? 0)}/月</li>
                </ul>
                <div className="preset-card__actions">
                  <button type="button" onClick={() => onApply(preset)}>
                    この条件を適用
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


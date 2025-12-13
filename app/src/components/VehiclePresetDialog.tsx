import { useVehiclePresets } from '@hooks/useVehiclePresets'
import type { VehicleProfile } from '@models/finance'

const formatYen = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)

interface VehiclePresetDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (profile: VehicleProfile) => void
}

export const VehiclePresetDialog = ({ isOpen, onClose, onApply }: VehiclePresetDialogProps) => {
  const { presets, loading, error } = useVehiclePresets()

  if (!isOpen) {
    return null
  }

  return (
    <div className="preset-modal" role="dialog" aria-modal="true" aria-label="車プリセット">
      <div className="preset-modal__panel">
        <header className="preset-modal__header">
          <div>
            <h3>車プリセット</h3>
            <p>ローン／一括・維持費をまとめた車テンプレートから選択できます。</p>
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
                    <p className="preset-card__stage">{preset.profile.label}</p>
                    <h4>{preset.title}</h4>
                  </div>
                </header>
                <p className="preset-card__description">{preset.description}</p>
                <ul className="preset-card__bands">
                  <li>購入価格: {formatYen(preset.profile.purchasePrice)}（{preset.profile.purchaseYear ?? '-'}年）</li>
                  <li>ローン残額: {formatYen(preset.profile.loanRemaining)}</li>
                  <li>月々ローン: {formatYen(preset.profile.monthlyLoan)}</li>
                  <li>売却/廃棄年: {preset.profile.disposalYear ?? '-'} / 売却額 {formatYen(preset.profile.disposalValue ?? 0)}</li>
                  <li>車検費用: {formatYen(preset.profile.inspectionCost)} / {preset.profile.inspectionCycleYears}年</li>
                  <li>年間メンテ: {formatYen(preset.profile.maintenanceAnnual)}</li>
                  <li>駐車場: {formatYen(preset.profile.parkingMonthly)} / 月</li>
                  <li>保険: {formatYen(preset.profile.insuranceAnnual ?? 0)}</li>
                </ul>
                <div className="preset-card__actions">
                  <button type="button" onClick={() => onApply(preset.profile)}>
                    この車を追加
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

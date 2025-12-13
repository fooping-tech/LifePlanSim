import { useHousingPresets } from '@hooks/useHousingPresets'
import type { HousingPlanTemplate } from '@hooks/useHousingPresets'

const formatYen = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)

interface HousingPresetDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (plan: HousingPlanTemplate) => void
}

export const HousingPresetDialog = ({ isOpen, onClose, onApply }: HousingPresetDialogProps) => {
  const { presets, loading, error } = useHousingPresets()

  if (!isOpen) {
    return null
  }

  return (
    <div className="preset-modal" role="dialog" aria-modal="true" aria-label="住宅プリセット">
      <div className="preset-modal__panel">
        <header className="preset-modal__header">
          <div>
            <h3>住宅プリセット</h3>
            <p>ローン・管理費などを含むテンプレートから住宅条件を読み込めます。</p>
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
                    <p className="preset-card__stage">
                      {preset.plan.type === 'own'
                        ? `築年: ${preset.plan.builtYear || 'N/A'}`
                        : '賃貸'}
                    </p>
                    <h4>{preset.title}</h4>
                  </div>
                </header>
                <p className="preset-card__description">{preset.description}</p>
                <ul className="preset-card__bands">
                  {preset.plan.type === 'own' ? (
                    <>
                      <li>残ローン: {formatYen(preset.plan.mortgageRemaining)}</li>
                      <li>月々ローン: {formatYen(preset.plan.monthlyMortgage)}</li>
                      <li>管理費: {formatYen(preset.plan.managementFeeMonthly)}/月</li>
                      <li>修繕積立: {formatYen(preset.plan.maintenanceReserveMonthly)}/月</li>
                      <li>その他年間費用: {formatYen(preset.plan.extraAnnualCosts ?? 0)}</li>
                    </>
                  ) : (
                    <>
                      <li>家賃: {formatYen(preset.plan.monthlyRent)}/月</li>
                      <li>共益費など: {formatYen(preset.plan.monthlyFees ?? 0)}/月</li>
                      <li>その他年間費用: {formatYen(preset.plan.extraAnnualCosts ?? 0)}</li>
                    </>
                  )}
                </ul>
                <div className="preset-card__actions">
                  <button type="button" onClick={() => onApply(preset.plan)}>
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

import type { Resident } from '@models/resident'
import { useResidentPresets } from '@hooks/useResidentPresets'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)

interface ResidentPresetDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (resident: Resident) => void
}

export const ResidentPresetDialog = ({ isOpen, onClose, onApply }: ResidentPresetDialogProps) => {
  const { presets, loading, error, toResidentPayload } = useResidentPresets()

  if (!isOpen) {
    return null
  }

  return (
    <div className="preset-modal" role="dialog" aria-modal="true" aria-label="住人プリセット">
      <div className="preset-modal__panel">
        <header className="preset-modal__header">
          <div>
            <h3>住人プリセット</h3>
            <p>よくある家族構成やキャリアパターンから住人を追加できます。</p>
          </div>
          <button type="button" className="preset-modal__close-btn" onClick={onClose}>
            閉じる
          </button>
        </header>
        {error ? <p className="preset-modal__status">プリセットの取得に失敗しました: {error}</p> : null}
        {loading ? (
          <p className="preset-modal__status">読込中...</p>
        ) : (
          <div className="preset-modal__grid">
            {presets.map((preset) => (
              <article key={preset.id} className="preset-card">
                <header>
                  <div>
                    <p className="preset-card__stage">
                      {preset.resident.currentAge}歳 / 退職{preset.resident.retirementAge}歳
                    </p>
                    <h4>{preset.title}</h4>
                  </div>
                </header>
                <p className="preset-card__description">{preset.description}</p>
                <div className="preset-card__meta">
                  <span>手取り: {formatCurrency(preset.resident.baseNetIncome)}</span>
                  <span>年次上昇率: {(preset.resident.annualIncomeGrowthRate * 100).toFixed(1)}%</span>
                </div>
                <section className="preset-card__bands">
                  <strong>代表的なイベント</strong>
                  <ul>
                    {preset.resident.incomeEvents?.map((event) => (
                      <li key={event.id ?? event.label}>
                        {event.label}（{event.triggerAge ?? '--'}歳）: {formatCurrency(event.amount)}
                      </li>
                    ))}
                  </ul>
                </section>
                {preset.resident.expenseBands?.length ? (
                  <section className="preset-card__bands">
                    <strong>教育・生活バンド</strong>
                    <ul>
                      {preset.resident.expenseBands.map((band) => (
                        <li key={band.id ?? band.label}>
                          {band.label} ({band.startAge}〜{band.endAge}歳) / {formatCurrency(band.annualAmount)}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}
                <div className="preset-card__actions">
                  <button type="button" onClick={() => onApply(toResidentPayload(preset))}>
                    住人として追加
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

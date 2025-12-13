import { useSavingsPresets } from '@hooks/useSavingsPresets'
import type { SavingsAccount } from '@models/finance'

const formatYen = (value: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(value)

interface SavingsPresetDialogProps {
  isOpen: boolean
  onClose: () => void
  onApply: (account: SavingsAccount) => void
}

export const SavingsPresetDialog = ({ isOpen, onClose, onApply }: SavingsPresetDialogProps) => {
  const { presets, loading, error, buildAccountPayload } = useSavingsPresets()

  if (!isOpen) {
    return null
  }

  return (
    <div className="preset-modal" role="dialog" aria-modal="true" aria-label="貯蓄・投資プリセット">
      <div className="preset-modal__panel">
        <header className="preset-modal__header">
          <div>
            <h3>貯蓄・投資プリセット</h3>
            <p>よく使う積立や投資戦略をすぐ追加できます。</p>
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
                    <p className="preset-card__stage">{preset.account.type === 'deposit' ? '預金' : '投資'}</p>
                    <h4>{preset.title}</h4>
                  </div>
                </header>
                <p className="preset-card__description">{preset.description}</p>
                <ul className="preset-card__bands">
                  <li>初期残高: {formatYen(preset.account.balance)}</li>
                  <li>年間積立額: {formatYen(preset.account.annualContribution)}</li>
                  <li>年利: {(preset.account.annualInterestRate * 100).toFixed(2)}%</li>
                  <li>引出優先度: {preset.account.withdrawPriority ?? '-'} </li>
                  <li>任意増額: {preset.account.adjustable ? '可' : '不可'}</li>
                </ul>
                <div className="preset-card__actions">
                  <button type="button" onClick={() => onApply(buildAccountPayload(preset))}>
                    追加
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

import { useState } from 'react'
import { useScenarioStore } from '@store/scenarioStore'
import { IconCalendar, IconChart } from '@components/icons'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)

const formatMillionYen = (value: number) =>
  new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }).format(value / 1_000_000)

const computeDomain = (values: number[]) => {
  const finiteValues = values.filter((value) => Number.isFinite(value))
  if (!finiteValues.length) {
    return { min: 0, max: 1 }
  }
  const min = Math.min(...finiteValues)
  const max = Math.max(...finiteValues)
  if (min === max) {
    return { min: min - 1, max: max + 1 }
  }
  const pad = (max - min) * 0.08
  return { min: min - pad, max: max + pad }
}

export const LandingPreview = ({ scenarioId }: { scenarioId?: string }) => {
  const projections = useScenarioStore((state) => state.projections)
  const comparison = useScenarioStore((state) => state.comparison)

  const primary =
    (scenarioId ? projections.find((item) => item.scenarioId === scenarioId) : null) ??
    projections[0] ??
    null
  const [previewYear, setPreviewYear] = useState<number>(() => primary?.yearly[0]?.year ?? new Date().getFullYear())

  const primaryYearly = primary?.yearly ?? []
  const previewEntry =
    primaryYearly.find((entry) => entry.year === previewYear) ?? primaryYearly[0] ?? null

  const years = primaryYearly.map((entry) => entry.year)
  const series = primaryYearly.map((entry) => entry.netWorth)
  const domain = computeDomain(series)

  const polyline = (() => {
    if (!primaryYearly.length) {
      return ''
    }
    const width = 360
    const height = 120
    const padX = 8
    const padY = 10
    const plotW = width - padX * 2
    const plotH = height - padY * 2
    const values = primaryYearly.map((entry) => entry.netWorth)
    const n = values.length
    if (n <= 1) {
      return ''
    }
    const toX = (i: number) => padX + (i / (n - 1)) * plotW
    const toY = (v: number) => {
      const t = (v - domain.min) / (domain.max - domain.min || 1)
      return padY + (1 - t) * plotH
    }
    return values.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ')
  })()

  const firstNegative = comparison?.earliestNegativeYear?.year ?? primary?.summary.firstNegativeYear ?? null

  return (
    <section className="landing-preview" aria-label="結果プレビュー">
      <header className="landing-preview__header">
        <h3>結果プレビュー</h3>
        <p>「標準プラン」の例です（あとから自分の条件で上書きできます）。</p>
      </header>

      {primary ? (
        <>
          <div className="landing-preview__kpis">
            <div>
              <span>最終純資産</span>
              <strong>{formatMillionYen(primary.summary.finalNetWorth)}百万円</strong>
            </div>
            <div>
              <span>赤字開始年</span>
              <strong>{firstNegative ?? 'なし'}</strong>
            </div>
            <div>
              <span>ピーク純資産</span>
              <strong>{formatMillionYen(primary.summary.peakNetWorth)}百万円</strong>
            </div>
          </div>

      <div className="landing-preview__chart">
        <div className="landing-preview__chart-header">
          <strong>
            <span className="landing-preview__icon" aria-hidden>
              <IconChart />
            </span>
            純資産推移（ミニ）
          </strong>
          <span>{years.length ? `${years[0]}〜${years.at(-1)}` : ''}</span>
        </div>
        <svg width={360} height={120} role="img" aria-label="純資産推移のプレビュー">
          <rect x={0} y={0} width={360} height={120} fill="#ffffff" rx={12} />
              <polyline points={polyline} fill="none" stroke="#2563eb" strokeWidth={3} />
            </svg>
          </div>

          {previewEntry ? (
            <div className="landing-preview__breakdown">
              <div className="landing-preview__breakdown-header">
                <strong>内訳（例）</strong>
                <label className="landing-preview__year">
                  <span className="landing-preview__icon" aria-hidden>
                    <IconCalendar />
                  </span>
                  年{' '}
                  <select value={previewEntry.year} onChange={(event) => setPreviewYear(Number(event.target.value))}>
                    {years.slice(0, 10).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <ul className="landing-preview__breakdown-list">
                <li>
                  収入 <span>{formatCurrency(previewEntry.income)}</span>
                </li>
                <li>
                  生活 <span>{formatCurrency(previewEntry.expenses.living)}</span>
                </li>
                <li>
                  住宅 <span>{formatCurrency(previewEntry.expenses.housing)}</span>
                </li>
                <li>
                  車 <span>{formatCurrency(previewEntry.expenses.vehicle)}</span>
                </li>
                <li>
                  教育 <span>{formatCurrency(previewEntry.expenses.education)}</span>
                </li>
                <li>
                  その他 <span>{formatCurrency(previewEntry.expenses.other)}</span>
                </li>
                <li className="landing-preview__breakdown-net">
                  差引 <span>{formatCurrency(previewEntry.netCashFlow)}</span>
                </li>
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="landing-preview__status">プレビューを準備しています...</p>
      )}
    </section>
  )
}

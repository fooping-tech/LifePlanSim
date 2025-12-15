import { useLayoutEffect, useMemo, useState } from 'react'
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryCursorContainer,
  VictoryLine,
  VictoryStack,
  VictoryTooltip,
  VictoryVoronoiContainer,
  VictoryTheme,
} from 'victory'
import { useScenarioStore } from '@store/scenarioStore'
import type { YearlyBreakdown } from '@models/scenario'

const colors = ['#2563eb', '#16a34a', '#f97316', '#9333ea', '#0ea5e9', '#f43f5e']
const INCOME_CATEGORY = { key: 'income', label: '収入', color: '#22c55e' as const }

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value)

const formatAxisManYen = (value: number) =>
  new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(value / 10_000)

const defaultChartPadding = { top: 40, bottom: 100, left: 110, right: 40 }
const netWorthChartPadding = { top: 40, bottom: 88, left: 150, right: 48 }
const dependentAxisStyle = {
  axisLabel: { padding: 62, fontSize: 12, fill: '#475569' },
  tickLabels: { fontSize: 10, padding: 4 },
}
const netWorthAxisStyle = {
  axisLabel: { padding: 72, fontSize: 12, fill: '#475569' },
  tickLabels: { fontSize: 10, padding: 6 },
}

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

const findNearestPoint = <T extends { x: number; y: number }>(series: T[], year: number): T | null => {
  if (!series.length) {
    return null
  }
  let best = series[0]
  let bestDiff = Math.abs(series[0].x - year)
  for (let i = 1; i < series.length; i += 1) {
    const diff = Math.abs(series[i].x - year)
    if (diff < bestDiff) {
      best = series[i]
      bestDiff = diff
    }
  }
  return best
}

const findNearestYearlyEntry = (yearly: YearlyBreakdown[], year: number): YearlyBreakdown | null => {
  if (!yearly.length) {
    return null
  }
  let best = yearly[0]
  let bestDiff = Math.abs(yearly[0].year - year)
  for (let i = 1; i < yearly.length; i += 1) {
    const diff = Math.abs(yearly[i].year - year)
    if (diff < bestDiff) {
      best = yearly[i]
      bestDiff = diff
    }
  }
  return best
}

const useMeasuredWidth = () => {
  const [node, setNode] = useState<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(640)

  useLayoutEffect(() => {
    if (!node) {
      return
    }
    const element = node
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect?.width
      if (!next) {
        return
      }
      setWidth(Math.max(320, Math.floor(next)))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [node])

  return { setContainer: setNode, width }
}

const expenseCategories = [
  { key: 'living', label: '生活', color: '#2563eb' },
  { key: 'education', label: '教育', color: '#f97316' },
  { key: 'housing', label: '住宅', color: '#16a34a' },
  { key: 'vehicle', label: '車', color: '#9333ea' },
  { key: 'other', label: 'その他', color: '#0ea5e9' },
  { key: 'savingsContribution', label: '貯蓄積立', color: '#f43f5e' },
] as const

type ExpenseKey = (typeof expenseCategories)[number]['key']

type CashFlowSeriesEntry = {
  x: number
  y: number
  category: ExpenseKey
  categoryLabel: string
  color: string
}

type CashExpenseSeriesEntry = CashFlowSeriesEntry & {
  y: number
}

type IncomeSeriesEntry = {
  x: number
  y: number
  categoryLabel: string
  color: string
}

type WaterfallEntry = {
  index: number
  key: string
  label: string
  value: number
  y: number
  y0: number
  color: string
}

const buildCashFlowSeries = (yearly: YearlyBreakdown[]): CashFlowSeriesEntry[] => {
  return yearly.flatMap((entry) =>
    expenseCategories.map((cat) => ({
      x: entry.year,
      y: entry.expenses[cat.key as ExpenseKey] ?? 0,
      category: cat.key,
      categoryLabel: cat.label,
      color: cat.color,
    })),
  )
}

const buildIncomeSeries = (yearly: YearlyBreakdown[]): IncomeSeriesEntry[] =>
  yearly.map((entry) => ({
    x: entry.year,
    y: entry.income,
    categoryLabel: INCOME_CATEGORY.label,
    color: INCOME_CATEGORY.color,
  }))

const buildWaterfallData = (yearly: YearlyBreakdown[]): WaterfallEntry[] => {
  if (!yearly.length) {
    return []
  }
  const totalIncome = yearly.reduce((sum, entry) => sum + entry.income, 0)
  const totalsByCategory = expenseCategories.reduce<Record<ExpenseKey, number>>((acc, cat) => {
    acc[cat.key] = 0
    return acc
  }, {} as Record<ExpenseKey, number>)

  yearly.forEach((entry) => {
    expenseCategories.forEach((cat) => {
      totalsByCategory[cat.key] += entry.expenses[cat.key as ExpenseKey] ?? 0
    })
  })

  const data: WaterfallEntry[] = []
  let cumulative = 0
  let index = 0
  data.push({
    index,
    key: 'income',
    label: '総収入',
    value: totalIncome,
    y: totalIncome,
    y0: 0,
    color: '#22c55e',
  })
  cumulative = totalIncome
  index += 1

  expenseCategories.forEach((cat) => {
    const amount = totalsByCategory[cat.key]
    if (!amount) {
      return
    }
    const next = cumulative - amount
    data.push({
      index,
      key: cat.key,
      label: cat.label,
      value: -amount,
      y: Math.max(cumulative, next),
      y0: Math.min(cumulative, next),
      color: cat.color,
    })
    cumulative = next
    index += 1
  })

  data.push({
    index,
    key: 'net',
    label: '最終差額',
    value: cumulative,
    y: Math.max(0, cumulative),
    y0: Math.min(0, cumulative),
    color: cumulative >= 0 ? '#0f172a' : '#ef4444',
  })
  return data
}

const buildCashFlowWaterfall = (entry: YearlyBreakdown): WaterfallEntry[] => {
  const income = Number.isFinite(entry.income) ? entry.income : 0
  const expensesByCategory = expenseCategories.reduce<Record<ExpenseKey, number>>((acc, cat) => {
    acc[cat.key] = Number.isFinite(entry.expenses[cat.key]) ? entry.expenses[cat.key] : 0
    return acc
  }, {} as Record<ExpenseKey, number>)

  const data: WaterfallEntry[] = []
  let cumulative = 0
  let index = 0

  data.push({
    index,
    key: 'income',
    label: '収入',
    value: income,
    y: income,
    y0: 0,
    color: INCOME_CATEGORY.color,
  })
  cumulative = income
  index += 1

  expenseCategories.forEach((cat) => {
    const amount = expensesByCategory[cat.key] ?? 0
    if (!amount) {
      return
    }
    const next = cumulative - amount
    data.push({
      index,
      key: cat.key,
      label: cat.label,
      value: -amount,
      y: Math.max(cumulative, next),
      y0: Math.min(cumulative, next),
      color: cat.color,
    })
    cumulative = next
    index += 1
  })

  data.push({
    index,
    key: 'net',
    label: '差引',
    value: cumulative,
    y: Math.max(0, cumulative),
    y0: Math.min(0, cumulative),
    color: cumulative >= 0 ? '#0f172a' : '#ef4444',
  })

  return data
}

export const ScenarioResultsTabs = () => {
  const projections = useScenarioStore((state) => state.projections)
  const scenarios = useScenarioStore((state) => state.scenarios)
  const comparison = useScenarioStore((state) => state.comparison)
  const SPECIAL_TABS = {
    overview: 'overview',
    comparison: 'comparison',
  } as const

  const [activeTab, setActiveTab] = useState<string>(() => projections[0]?.scenarioId ?? SPECIAL_TABS.overview)

  const chartData = useMemo(
    () =>
      projections.map((projection, index) => {
        const netWorthSeries = projection.yearly.map((entry) => ({
          x: entry.year,
          y: Number.isFinite(entry.netWorth) ? entry.netWorth : 0,
          meta: entry,
        }))
        const netCashSeries = projection.yearly.map((entry) => ({
          x: entry.year,
          y: Number.isFinite(entry.netCashFlow) ? entry.netCashFlow : 0,
        }))
        const incomeSeries = buildIncomeSeries(projection.yearly)
        const expenseSeries = buildCashFlowSeries(projection.yearly)
        const expenseSeriesNegative = expenseSeries.map((entry) => ({
          ...entry,
          y: -entry.y,
        }))
        const inputScenario = scenarios.find((scenario) => scenario.id === projection.scenarioId)
        const residents = (inputScenario?.residents ?? []).map((resident) => ({ id: resident.id, name: resident.name }))
        return {
          id: projection.scenarioId,
          label: projection.scenarioName,
          color: colors[index % colors.length],
          netWorth: netWorthSeries,
          netCashFlow: netCashSeries,
          cashIncomeSeries: incomeSeries,
        cashFlowSeries: expenseSeries,
        cashExpenseSeries: expenseSeriesNegative,
          yearly: projection.yearly,
          residents,
          waterfallData: buildWaterfallData(projection.yearly),
          summary: projection.summary,
        }
      }),
    [projections, scenarios],
  )

  const resolvedTab =
    activeTab === SPECIAL_TABS.comparison ||
    activeTab === SPECIAL_TABS.overview ||
    chartData.some((scenario) => scenario.id === activeTab)
      ? activeTab
      : chartData[0]?.id ?? SPECIAL_TABS.overview

  if (!chartData.length) {
    return (
      <section className="panel results-panel">
        <p>シナリオを追加してシミュレーションを開始してください。</p>
      </section>
    )
  }

  const activeScenario =
    chartData.find((scenario) => scenario.id === resolvedTab) ?? chartData[0]

  return (
    <section className="panel results-panel">
      <div className="tab-nav" role="tablist" aria-label="シミュレーション結果">
        {chartData.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            role="tab"
            aria-selected={resolvedTab === scenario.id}
            className={['tab-nav__btn', resolvedTab === scenario.id ? 'is-active' : ''].join(' ').trim()}
            onClick={() => setActiveTab(scenario.id)}
          >
            {scenario.label}
          </button>
        ))}
        <button
          type="button"
          role="tab"
          aria-selected={resolvedTab === SPECIAL_TABS.overview}
          className={['tab-nav__btn', resolvedTab === SPECIAL_TABS.overview ? 'is-active' : ''].join(' ').trim()}
          onClick={() => setActiveTab(SPECIAL_TABS.overview)}
        >
          全体グラフ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={resolvedTab === SPECIAL_TABS.comparison}
          className={['tab-nav__btn', resolvedTab === SPECIAL_TABS.comparison ? 'is-active' : ''].join(' ').trim()}
          onClick={() => setActiveTab(SPECIAL_TABS.comparison)}
        >
          比較サマリー
        </button>
      </div>
      <div className="tab-panel results-panel__content">
        {resolvedTab === SPECIAL_TABS.comparison ? (
          <ComparisonSummary />
        ) : resolvedTab === SPECIAL_TABS.overview ? (
          <CombinedCharts scenarios={chartData} />
        ) : (
          <ScenarioCharts key={activeScenario.id} scenario={activeScenario} color={activeScenario.color} />
        )}
      </div>
      {comparison?.earliestNegativeYear ? (
        <p className="warning results-panel__warning">
          最速で赤字になるのは{' '}
          <strong>
            {
              chartData.find((scenario) => scenario.id === comparison.earliestNegativeYear?.scenarioId)
                ?.label
            }
          </strong>
          （{comparison.earliestNegativeYear.year} 年）
        </p>
      ) : (
        <p className="results-panel__warning">どのシナリオも赤字は発生しません。</p>
      )}
    </section>
  )
}

interface ScenarioChartsProps {
  scenario: {
    id: string
    label: string
    netWorth: { x: number; y: number; meta?: YearlyBreakdown }[]
    netCashFlow: { x: number; y: number }[]
    cashIncomeSeries: IncomeSeriesEntry[]
    cashExpenseSeries: CashExpenseSeriesEntry[]
    cashFlowSeries: CashFlowSeriesEntry[]
    yearly: YearlyBreakdown[]
    residents: Array<{ id: string; name: string }>
    waterfallData: WaterfallEntry[]
    summary: {
      totalIncome: number
      totalExpenses: number
      finalNetWorth: number
      peakNetWorth: number
      firstNegativeYear: number | null
    }
  }
  color: string
}

const ScenarioCharts = ({ scenario, color }: ScenarioChartsProps) => {
  const [view, setView] = useState<'netWorth' | 'cashFlow'>('netWorth')
  const [selectedYear, setSelectedYear] = useState<number>(() => scenario.yearly[0]?.year ?? new Date().getFullYear())
  const yearOptions = useMemo(() => scenario.yearly.map((entry) => entry.year), [scenario.yearly])
  const selectedYearEntry = useMemo(
    () => findNearestYearlyEntry(scenario.yearly, selectedYear),
    [scenario.yearly, selectedYear],
  )
  const selectedWaterfall = useMemo(
    () => (selectedYearEntry ? buildCashFlowWaterfall(selectedYearEntry) : []),
    [selectedYearEntry],
  )
  const { setContainer: setNetWorthContainer, width: netWorthWidth } = useMeasuredWidth()
  const { setContainer: setCashFlowContainer, width: cashFlowWidth } = useMeasuredWidth()
  const netWorthDomain = useMemo(() => computeDomain(scenario.netWorth.map((point) => point.y)), [scenario.netWorth])
  const [hover, setHover] = useState<{ year: number; netWorth: number; ages: string } | null>(null)

  return (
    <div className="scenario-results">
      <div className="sub-tab-nav" role="tablist" aria-label="グラフ切り替え">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'netWorth'}
          className={['sub-tab-nav__btn', view === 'netWorth' ? 'is-active' : ''].join(' ')}
          onClick={() => setView('netWorth')}
        >
          純資産推移
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'cashFlow'}
          className={['sub-tab-nav__btn', view === 'cashFlow' ? 'is-active' : ''].join(' ')}
          onClick={() => setView('cashFlow')}
        >
          キャッシュフロー
        </button>
      </div>

      {view === 'netWorth' && (
        <div className="chart-block">
          <div className="chart-block__header">
            <h3>{scenario.label} - 純資産推移</h3>
            <span>最終: {formatCurrency(scenario.summary.finalNetWorth)}</span>
          </div>
          {hover ? (
            <div className="chart-hover-panel" aria-live="polite">
              <span>年: {hover.year}</span>
              <span>年齢: {hover.ages}</span>
              <span>残高: {formatMillionYen(hover.netWorth)}百万円</span>
            </div>
          ) : (
            <div className="chart-hover-panel chart-hover-panel--hint">グラフにカーソルを合わせると詳細が表示されます</div>
          )}
          <div ref={setNetWorthContainer} className="chart-reveal chart-reveal--animate">
            <VictoryChart
              theme={VictoryTheme.material}
              height={300}
              width={netWorthWidth}
              padding={netWorthChartPadding}
              domain={{ y: [netWorthDomain.min, netWorthDomain.max] }}
              containerComponent={
                <VictoryCursorContainer
                  cursorDimension="x"
                  cursorLabel={() => ''}
                  cursorLabelComponent={<VictoryTooltip flyoutStyle={{ display: 'none' }} style={{ display: 'none' }} />}
                  onCursorChange={(value) => {
                    if (typeof value !== 'number' || !Number.isFinite(value)) {
                      setHover(null)
                      return
                    }
                    const year = Math.round(value)
                    const nearest = findNearestPoint(scenario.netWorth, year)
                    if (!nearest) {
                      setHover(null)
                      return
                    }
                    const netWorth = Number(nearest.y)
                    const meta = (nearest as { meta?: YearlyBreakdown }).meta
                    const ages =
                      meta?.agesByResident
                        ? scenario.residents
                            .map((resident) => {
                              const age = meta.agesByResident[resident.id]
                              return typeof age === 'number' ? `${resident.name} ${age}歳` : null
                            })
                            .filter(Boolean)
                            .join(' / ')
                        : ''
                    setHover({ year, netWorth, ages })
                  }}
                />
              }
            >
              <VictoryAxis tickFormat={(tick) => `${tick}`} />
              <VictoryAxis
                dependentAxis
                tickFormat={formatAxisManYen}
                label="万円"
                style={netWorthAxisStyle}
              />
              <VictoryLine
                data={scenario.netWorth}
                style={{
                  data: {
                    stroke: color,
                    strokeWidth: 3,
                  },
                }}
              />
            </VictoryChart>
          </div>
          <p className="chart-note">
            赤字時の自動取り崩しは「生活防衛資金（最低残高まで）→ 目的別資金 → 長期投資（最後の手段）」の順です（口座の「取り崩し」設定で変更できます）。
          </p>
        </div>
      )}

      {view === 'cashFlow' && (
        <div className="chart-block">
          <div className="chart-block__header">
            <h3>{scenario.label} - キャッシュフロー</h3>
            <label className="chart-inline-control">
              年{' '}
              <select
                value={selectedYearEntry?.year ?? selectedYear}
                onChange={(event) => setSelectedYear(Number(event.target.value))}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <>
            <div className="cashflow-layout">
              <div className="cashflow-layout__chart">
                <div ref={setCashFlowContainer}>
                  <VictoryChart
                    theme={VictoryTheme.material}
                    height={340}
                    width={cashFlowWidth}
                    padding={defaultChartPadding}
                    containerComponent={
                      <VictoryVoronoiContainer
                        voronoiDimension="x"
                        labels={() => ''}
                        onActivated={(points) => {
                          const first = points?.[0] as { x?: unknown } | undefined
                          const year = typeof first?.x === 'number' ? first.x : Number(first?.x)
                          if (!Number.isFinite(year)) return
                          setSelectedYear(Math.round(year))
                        }}
                      />
                    }
                  >
                    <VictoryAxis tickFormat={(tick) => `${tick}`} />
                    <VictoryAxis
                      dependentAxis
                      tickFormat={formatAxisManYen}
                      label="万円"
                      style={dependentAxisStyle}
                    />
                    <VictoryBar
                      data={scenario.cashIncomeSeries}
                      style={{ data: { fill: INCOME_CATEGORY.color, opacity: 0.9 } }}
                      events={[
                        {
                          target: 'data',
                          eventHandlers: {
                            onClick: (_event, props) => {
                              setSelectedYear(Math.round(props.datum.x))
                              return null
                            },
                          },
                        },
                      ]}
                    />
                    <VictoryStack>
                      {expenseCategories.map((cat) => (
                        <VictoryBar
                          key={cat.key}
                          data={scenario.cashFlowSeries
                            .filter((entry: CashFlowSeriesEntry) => entry.category === cat.key)
                            .map((entry) => ({ ...entry, y: -entry.y }))}
                          style={{ data: { fill: cat.color } }}
                          events={[
                            {
                              target: 'data',
                              eventHandlers: {
                                onClick: (_event, props) => {
                                  setSelectedYear(Math.round(props.datum.x))
                                  return null
                                },
                              },
                            },
                          ]}
                        />
                      ))}
                    </VictoryStack>
                  </VictoryChart>
                </div>
                <div className="chart-legend">
                  <div className="chart-legend__item">
                    <span className="chart-legend__swatch" style={{ backgroundColor: INCOME_CATEGORY.color }} />
                    {INCOME_CATEGORY.label}
                  </div>
                  {expenseCategories.map((cat) => (
                    <div key={cat.key} className="chart-legend__item">
                      <span className="chart-legend__swatch" style={{ backgroundColor: cat.color }} />
                      {cat.label}
                    </div>
                  ))}
                </div>
              </div>
              {selectedYearEntry ? (
                <div className="cashflow-layout__waterfall">
                  <div className="chart-block__header">
                    <h4>{selectedYearEntry.year} 年の内訳（ウォーターフォール）</h4>
                    <span>差引 {formatCurrency(selectedYearEntry.netCashFlow)}</span>
                  </div>
                  <WaterfallChart data={selectedWaterfall} width={560} height={300} />
                  <p className="chart-note">棒をクリックすると、その年の内訳が表示されます。</p>
                </div>
              ) : null}
            </div>
          </>
        </div>
      )}

      <ul className="scenario-results__summary">
        <li>
          総収入 <strong>{formatCurrency(scenario.summary.totalIncome)}</strong>
        </li>
        <li>
          総支出 <strong>{formatCurrency(scenario.summary.totalExpenses)}</strong>
        </li>
        <li>
          ピーク純資産 <strong>{formatCurrency(scenario.summary.peakNetWorth)}</strong>
        </li>
        <li>
          {scenario.summary.firstNegativeYear
            ? `${scenario.summary.firstNegativeYear} 年に赤字へ転落`
            : '赤字なし'}
        </li>
      </ul>
    </div>
  )
}

const WaterfallChart = ({ data, width = 640, height = 340 }: { data: WaterfallEntry[]; width?: number; height?: number }) => {
  if (!data.length) {
    return <p>ウォーターフローのデータが不足しています。</p>
  }
  const paddingX = 60
  const paddingY = 30
  const chartWidth = width - paddingX * 2
  const chartHeight = height - paddingY * 2
  const yMax = Math.max(...data.map((entry) => Math.max(entry.y, entry.y0)))
  const yMin = Math.min(...data.map((entry) => Math.min(entry.y, entry.y0)))
  const range = yMax - yMin || 1
  const scaleY = (value: number) => paddingY + chartHeight - ((value - yMin) / range) * chartHeight
  const slotWidth = chartWidth / data.length
  const barWidth = Math.max(20, slotWidth - 20)
  const zeroY = scaleY(0)

  return (
    <div className="waterfall-chart">
      <svg width={width} height={height} role="img" aria-label="ウォーターフロー">
        <line x1={paddingX - 10} x2={width - paddingX + 10} y1={zeroY} y2={zeroY} stroke="#cbd5f5" strokeWidth={1} />
        {data.map((entry, idx) => {
          const startY = scaleY(entry.y)
          const endY = scaleY(entry.y0)
          const barHeight = Math.abs(endY - startY)
          const y = Math.min(startY, endY)
          const x = paddingX + idx * slotWidth + (slotWidth - barWidth) / 2
          return (
            <g key={entry.key}>
              <rect x={x} y={y} width={barWidth} height={Math.max(barHeight, 2)} fill={entry.color} rx={4} />
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize={12}
                fill="#0f172a"
              >
                {formatCurrency(entry.value)}
              </text>
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fontSize={12}
                fill="#475569"
                transform={`rotate(-30 ${x + barWidth / 2},${height - 8})`}
              >
                {entry.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

const CombinedCharts = ({
  scenarios,
}: {
  scenarios: Array<{
    id: string
    label: string
    netWorth: { x: number; y: number; meta?: YearlyBreakdown }[]
    netCashFlow: { x: number; y: number }[]
    cashIncomeSeries: IncomeSeriesEntry[]
    cashExpenseSeries: CashExpenseSeriesEntry[]
    cashFlowSeries: CashFlowSeriesEntry[]
    yearly: YearlyBreakdown[]
    color: string
  }>
}) => {
  const [view, setView] = useState<'netWorth' | 'cashFlow'>('netWorth')
  const { setContainer: setNetWorthContainer, width: netWorthWidth } = useMeasuredWidth()
  const { setContainer: setCashFlowContainer, width: cashFlowWidth } = useMeasuredWidth()
  const [hover, setHover] = useState<{ year: number; points: Array<{ label: string; value: number }> } | null>(null)
  const allYears = useMemo(() => {
    const years = new Set<number>()
    scenarios.forEach((scenario) => scenario.yearly.forEach((entry) => years.add(entry.year)))
    return Array.from(years).sort((a, b) => a - b)
  }, [scenarios])
  const [selectedYear, setSelectedYear] = useState<number>(() => allYears[0] ?? new Date().getFullYear())
  const [waterfallOpen, setWaterfallOpen] = useState(false)
  const netWorthDomain = useMemo(
    () => computeDomain(scenarios.flatMap((scenario) => scenario.netWorth.map((point) => point.y))),
    [scenarios],
  )
  return (
    <div className="scenario-results">
      <div className="sub-tab-nav" role="tablist" aria-label="全体グラフ切り替え">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'netWorth'}
          className={['sub-tab-nav__btn', view === 'netWorth' ? 'is-active' : ''].join(' ')}
          onClick={() => setView('netWorth')}
        >
          純資産推移
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'cashFlow'}
          className={['sub-tab-nav__btn', view === 'cashFlow' ? 'is-active' : ''].join(' ')}
          onClick={() => setView('cashFlow')}
        >
          キャッシュフロー
        </button>
      </div>
      {view === 'netWorth' ? (
        <div className="chart-block">
          <div className="chart-block__header">
            <h3>全シナリオ純資産比較</h3>
          </div>
          {hover ? (
            <div className="chart-hover-panel" aria-live="polite">
              <span>年: {hover.year}</span>
              <span>
                残高:{' '}
                {hover.points.map((point) => `${point.label} ${formatMillionYen(point.value)}百万円`).join(' / ')}
              </span>
            </div>
          ) : (
            <div className="chart-hover-panel chart-hover-panel--hint">グラフにカーソルを合わせると詳細が表示されます</div>
          )}
          <div ref={setNetWorthContainer} className="chart-reveal chart-reveal--animate">
            <VictoryChart
              theme={VictoryTheme.material}
              height={300}
              width={netWorthWidth}
              padding={netWorthChartPadding}
              domain={{ y: [netWorthDomain.min, netWorthDomain.max] }}
              containerComponent={
                <VictoryCursorContainer
                  cursorDimension="x"
                  cursorLabel={() => ''}
                  cursorLabelComponent={<VictoryTooltip flyoutStyle={{ display: 'none' }} style={{ display: 'none' }} />}
                  onCursorChange={(value) => {
                    if (typeof value !== 'number' || !Number.isFinite(value)) {
                      setHover(null)
                      return
                    }
                    const year = Math.round(value)
                    const points = scenarios
                      .map((scenario) => {
                        const nearest = findNearestPoint(scenario.netWorth, year)
                        if (!nearest) {
                          return null
                        }
                        return { label: scenario.label, value: Number(nearest.y) }
                      })
                      .filter(Boolean) as Array<{ label: string; value: number }>
                    setHover({ year, points })
                  }}
                />
              }
            >
              <VictoryAxis tickFormat={(tick) => `${tick}`} />
              <VictoryAxis
                dependentAxis
                tickFormat={formatAxisManYen}
                label="万円"
                style={netWorthAxisStyle}
              />
              {scenarios.map((scenario) => (
                <VictoryLine
                  key={scenario.id}
                  data={scenario.netWorth}
                  style={{ data: { stroke: scenario.color, strokeWidth: 2 } }}
                />
              ))}
            </VictoryChart>
          </div>
          <div className="chart-legend">
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ backgroundColor: scenario.color }} />
                {scenario.label}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="chart-block">
          <div className="chart-block__header">
            <h3>全シナリオキャッシュフロー比較</h3>
            <label className="chart-inline-control">
              年{' '}
              <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {allYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="chart-inline-btn" onClick={() => setWaterfallOpen(true)}>
              内訳を見る
            </button>
          </div>
          <div ref={setCashFlowContainer}>
            <VictoryChart
              theme={VictoryTheme.material}
              height={340}
              width={cashFlowWidth}
              padding={defaultChartPadding}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={() => ''}
                  onActivated={(points) => {
                    const first = points?.[0] as { x?: unknown } | undefined
                    const year = typeof first?.x === 'number' ? first.x : Number(first?.x)
                    if (!Number.isFinite(year)) return
                    setSelectedYear(Math.round(year))
                  }}
                />
              }
            >
              <VictoryAxis tickFormat={(tick) => `${tick}`} />
              <VictoryAxis
                dependentAxis
                tickFormat={formatAxisManYen}
                label="万円"
                style={dependentAxisStyle}
              />
              {scenarios.map((scenario, index) => {
                const offset = (index - (scenarios.length - 1) / 2) * 0.3
                return (
                  <g key={scenario.id}>
                    <VictoryBar
                      data={scenario.cashIncomeSeries.map((entry) => ({
                        ...entry,
                        x: entry.x + offset,
                        scenarioLabel: scenario.label,
                      }))}
                      style={{ data: { fill: INCOME_CATEGORY.color, opacity: 0.85 } }}
                      events={[
                        {
                          target: 'data',
                          eventHandlers: {
                            onClick: (_event, props) => {
                              setSelectedYear(Math.round(props.datum.x))
                              return null
                            },
                          },
                        },
                      ]}
                    />
                    <VictoryStack>
                      {expenseCategories.map((cat) => (
                        <VictoryBar
                          key={cat.key}
                          data={scenario.cashExpenseSeries
                            .filter((entry: CashExpenseSeriesEntry) => entry.category === cat.key)
                            .map((entry: CashExpenseSeriesEntry) => ({
                              ...entry,
                              x: entry.x + offset,
                              scenarioLabel: scenario.label,
                            }))}
                          style={{ data: { fill: cat.color, opacity: 0.8 } }}
                          events={[
                            {
                              target: 'data',
                              eventHandlers: {
                                onClick: (_event, props) => {
                                  setSelectedYear(Math.round(props.datum.x))
                                  return null
                                },
                              },
                            },
                          ]}
                        />
                      ))}
                    </VictoryStack>
                  </g>
                )
              })}
            </VictoryChart>
          </div>
          <div className="chart-legend">
            <div className="chart-legend__item">
              <span className="chart-legend__swatch" style={{ backgroundColor: INCOME_CATEGORY.color }} />
              {INCOME_CATEGORY.label}
            </div>
            {expenseCategories.map((cat) => (
              <div key={cat.key} className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ backgroundColor: cat.color }} />
                {cat.label}
              </div>
            ))}
          </div>
        </div>
      )}
      {waterfallOpen ? (
        <div className="preset-modal" role="dialog" aria-modal="true" aria-label="キャッシュフロー内訳">
          <div className="preset-modal__panel">
            <header className="preset-modal__header">
              <div>
                <h3>{selectedYear} 年の内訳（ウォーターフォール）</h3>
                <p>棒をクリックして年を選択できます（比較表示は最大3シナリオ）。</p>
              </div>
              <button type="button" className="preset-modal__close-btn" onClick={() => setWaterfallOpen(false)}>
                閉じる
              </button>
            </header>
            <div className="waterfall-grid">
              {scenarios.slice(0, 3).map((scenario) => {
                const yearEntry = findNearestYearlyEntry(scenario.yearly, selectedYear)
                if (!yearEntry) return null
                const waterfall = buildCashFlowWaterfall(yearEntry)
                return (
                  <div key={scenario.id} className="waterfall-panel">
                    <div className="waterfall-panel__header">
                      <strong>{scenario.label}</strong>
                      <span>差引 {formatCurrency(yearEntry.netCashFlow)}</span>
                    </div>
                    <WaterfallChart data={waterfall} width={520} height={280} />
                  </div>
                )
              })}
            </div>
            {scenarios.length > 3 ? <p className="chart-note">比較表示は最大3シナリオまで表示します。</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

const ComparisonSummary = () => {
  const comparison = useScenarioStore((state) => state.comparison)

  if (!comparison) {
    return <p>比較できるシナリオがありません。</p>
  }

  return (
    <div className="comparison-summary">
      <h3>比較サマリー</h3>
      <table>
        <thead>
          <tr>
            <th>シナリオ</th>
            <th>総収入</th>
            <th>総支出</th>
            <th>最終純資産</th>
            <th>赤字開始年</th>
          </tr>
        </thead>
        <tbody>
          {comparison.projections.map((projection, index) => (
            <tr key={projection.scenarioId}>
              <td>
                <span
                  className="comparison-summary__color"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                {projection.scenarioName}
              </td>
              <td>{formatCurrency(projection.summary.totalIncome)}</td>
              <td>{formatCurrency(projection.summary.totalExpenses)}</td>
              <td>{formatCurrency(projection.summary.finalNetWorth)}</td>
              <td>{projection.summary.firstNegativeYear ?? 'なし'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

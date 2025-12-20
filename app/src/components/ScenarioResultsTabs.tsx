import { useLayoutEffect, useMemo, useState } from 'react'
import {
  VictoryArea,
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
import { useAppActions } from '@utils/appActionsContext'

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

const defaultChartPadding = { top: 28, bottom: 78, left: 96, right: 28 }
const netWorthChartPadding = { top: 28, bottom: 70, left: 30, right: 28 }

const gridStyle = {
  stroke: 'rgba(148, 163, 184, 0.38)',
  strokeDasharray: '3,6',
}

const axisBaseStyle = {
  axis: { stroke: '#cbd5e1' },
  ticks: { stroke: '#cbd5e1', size: 4 },
  tickLabels: { fontSize: 10, padding: 4, fill: '#475569' },
  grid: gridStyle,
}

const dependentAxisStyle = {
  ...axisBaseStyle,
  axisLabel: { padding: 62, fontSize: 12, fill: '#475569' },
}

const netWorthAxisStyle = {
  ...axisBaseStyle,
  axisLabel: { padding: 32, fontSize: 12, fill: '#475569' },
  tickLabels: { fontSize: 10, padding: -14, fill: '#475569' },
}

const makeAreaStyle = (fill: string, opacity: number) => ({
  data: {
    fill,
    fillOpacity: opacity,
    stroke: 'transparent',
    pointerEvents: 'none',
  },
})

const makeLineStyle = (stroke: string, width: number) => ({
  data: {
    stroke,
    strokeWidth: width,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    filter: 'drop-shadow(0 10px 18px rgba(15, 23, 42, 0.12))',
  },
})

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
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId)
  const selectScenario = useScenarioStore((state) => state.selectScenario)
  const SPECIAL_TABS = {
    overview: 'overview',
    comparison: 'comparison',
  } as const

  const [activeTab, setActiveTab] = useState<string>(() => activeScenarioId ?? projections[0]?.scenarioId ?? SPECIAL_TABS.overview)

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
        const savingsAccountsMeta = (inputScenario?.savingsAccounts ?? []).map((account) => ({
          id: account.id,
          label: account.label,
          annualInterestRate: account.annualInterestRate,
        }))
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
          savingsAccountsMeta,
          waterfallData: buildWaterfallData(projection.yearly),
          summary: projection.summary,
        }
      }),
    [projections, scenarios],
  )

  const resolvedTab = (() => {
    if (activeTab === SPECIAL_TABS.comparison || activeTab === SPECIAL_TABS.overview) {
      return activeTab
    }
    if (activeScenarioId && chartData.some((scenario) => scenario.id === activeScenarioId)) {
      return activeScenarioId
    }
    if (chartData.some((scenario) => scenario.id === activeTab)) {
      return activeTab
    }
    return chartData[0]?.id ?? SPECIAL_TABS.overview
  })()

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
            onClick={() => {
              setActiveTab(scenario.id)
              selectScenario(scenario.id)
            }}
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
    savingsAccountsMeta: Array<{ id: string; label: string; annualInterestRate: number }>
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
  const { openEditor } = useAppActions()
  const duplicateScenario = useScenarioStore((state) => state.duplicateScenario)
  const [selectedYear, setSelectedYear] = useState<number>(() => scenario.yearly[0]?.year ?? new Date().getFullYear())
  const [kpiModal, setKpiModal] = useState<null | 'netWorth' | 'netCashFlow' | 'investmentIncome'>(null)
  const yearOptions = useMemo(() => scenario.yearly.map((entry) => entry.year), [scenario.yearly])
  const totalInvestmentIncome = useMemo(
    () => scenario.yearly.reduce((sum, entry) => sum + (entry.investmentIncome ?? 0), 0),
    [scenario.yearly],
  )
  const selectedYearEntry = useMemo(
    () => findNearestYearlyEntry(scenario.yearly, selectedYear),
    [scenario.yearly, selectedYear],
  )
  const selectedWaterfall = useMemo(
    () => (selectedYearEntry ? buildCashFlowWaterfall(selectedYearEntry) : []),
    [selectedYearEntry],
  )
  const { setContainer: setChartContainer, width: chartWidth } = useMeasuredWidth()
  const combinedDomain = useMemo(() => {
    const expenseTotals = scenario.yearly.map((entry) =>
      expenseCategories.reduce((sum, cat) => sum + (entry.expenses[cat.key as ExpenseKey] ?? 0), 0),
    )
    const incomeSeries = scenario.cashIncomeSeries.map((point) => point.y)
    const netWorthSeries = scenario.netWorth.map((point) => point.y)
    return computeDomain([...expenseTotals, ...incomeSeries, ...netWorthSeries])
  }, [scenario.cashIncomeSeries, scenario.netWorth, scenario.yearly])
  const selectedAgesLabel = useMemo(() => {
    const meta = selectedYearEntry
    if (!meta?.agesByResident) {
      return ''
    }
    return scenario.residents
      .map((resident) => {
        const age = meta.agesByResident[resident.id]
        return typeof age === 'number' ? `${resident.name} ${age}歳` : null
      })
      .filter(Boolean)
      .join(' / ')
  }, [scenario.residents, selectedYearEntry])

  const selectedYearResolved = selectedYearEntry?.year ?? selectedYear
  const selectedYearIndex = useMemo(
    () => yearOptions.findIndex((year) => year === selectedYearResolved),
    [yearOptions, selectedYearResolved],
  )

  useLayoutEffect(() => {
    if (!kpiModal) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setKpiModal(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [kpiModal])

  return (
    <div className="scenario-results">
      <div className="results-split">
        <div className="results-split__main">
          <div className="chart-block">
            <div className="chart-block__header">
              <h3>{scenario.label} - 純資産×キャッシュフロー</h3>
              <span>最終: {formatCurrency(scenario.summary.finalNetWorth)}</span>
            </div>
            <div ref={setChartContainer} className="chart-reveal chart-reveal--animate">
              <VictoryChart
                theme={VictoryTheme.material}
                height={340}
                width={chartWidth}
                padding={netWorthChartPadding}
                domain={{ y: [combinedDomain.min, combinedDomain.max] }}
                containerComponent={
                  <VictoryCursorContainer
                    cursorDimension="x"
                    cursorLabel={() => ''}
                    cursorLabelComponent={<VictoryTooltip flyoutStyle={{ display: 'none' }} style={{ display: 'none' }} />}
                    onCursorChange={(value) => {
                      if (typeof value !== 'number' || !Number.isFinite(value)) {
                        return
                      }
                      setSelectedYear(Math.round(value))
                    }}
                  />
                }
              >
                <VictoryAxis tickFormat={(tick) => `${tick}`} style={axisBaseStyle} />
                <VictoryAxis dependentAxis tickFormat={formatAxisManYen} label="万円" style={netWorthAxisStyle} />
                <VictoryStack>
                  {expenseCategories.map((cat) => (
                    <VictoryBar
                      key={cat.key}
                      data={scenario.cashFlowSeries.filter((entry: CashFlowSeriesEntry) => entry.category === cat.key)}
                      style={{ data: { fill: cat.color, opacity: 0.85 } }}
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
                <VictoryArea
                  data={scenario.cashIncomeSeries}
                  interpolation="monotoneX"
                  y0={() => (combinedDomain.min > 0 ? combinedDomain.min : 0)}
                  style={makeAreaStyle(INCOME_CATEGORY.color, 0.16)}
                />
                <VictoryArea
                  data={scenario.netWorth}
                  interpolation="monotoneX"
                  y0={() => combinedDomain.min}
                  style={makeAreaStyle(color, 0.1)}
                />
                <VictoryLine
                  data={scenario.cashIncomeSeries}
                  interpolation="monotoneX"
                  style={makeLineStyle(INCOME_CATEGORY.color, 2.6)}
                />
                <VictoryLine data={scenario.netWorth} interpolation="monotoneX" style={makeLineStyle(color, 3.1)} />
              </VictoryChart>
            </div>
            <div className="chart-legend">
              <div className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ backgroundColor: color }} />
                純資産（折れ線）
              </div>
              <div className="chart-legend__item">
                <span className="chart-legend__swatch" style={{ backgroundColor: INCOME_CATEGORY.color }} />
                収入（折れ線）
              </div>
              {expenseCategories.map((cat) => (
                <div key={cat.key} className="chart-legend__item">
                  <span className="chart-legend__swatch" style={{ backgroundColor: cat.color }} />
                  {cat.label}（積み上げ）
                </div>
              ))}
            </div>
            <p className="chart-note">年を選ぶと右側に内訳（ウォーターフォール）とイベントが表示されます。</p>
          </div>
        </div>

        <aside className="results-split__detail" aria-label="選択年の詳細">
          <div className="results-detail__header">
            <strong>選択年</strong>
            <div className="results-detail__controls">
              <button
                type="button"
                className="chart-inline-btn"
                onClick={() => {
                  if (selectedYearIndex <= 0) return
                  setSelectedYear(yearOptions[selectedYearIndex - 1])
                }}
                disabled={selectedYearIndex <= 0}
              >
                ←
              </button>
              <label className="chart-inline-control">
                <select value={selectedYearResolved} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="chart-inline-btn"
                onClick={() => {
                  if (selectedYearIndex < 0 || selectedYearIndex >= yearOptions.length - 1) return
                  setSelectedYear(yearOptions[selectedYearIndex + 1])
                }}
                disabled={selectedYearIndex < 0 || selectedYearIndex >= yearOptions.length - 1}
              >
                →
              </button>
            </div>
          </div>

          {selectedYearEntry ? (
            <>
              <div className="results-detail__kpis">
                <div>
                  <span>年齢</span>
                  <strong>{selectedAgesLabel || '-'}</strong>
                </div>
                <div>
                  <span>純資産</span>
                  <button
                    type="button"
                    className="kpi-value-btn"
                    aria-haspopup="dialog"
                    onClick={() => setKpiModal('netWorth')}
                  >
                    {formatMillionYen(selectedYearEntry.netWorth)}百万円
                  </button>
                </div>
                <div>
                  <span>差引</span>
                  <button
                    type="button"
                    className="kpi-value-btn"
                    aria-haspopup="dialog"
                    onClick={() => setKpiModal('netCashFlow')}
                  >
                    {formatCurrency(selectedYearEntry.netCashFlow)}
                  </button>
                </div>
                <div>
                  <span>運用益</span>
                  <button
                    type="button"
                    className="kpi-value-btn"
                    aria-haspopup="dialog"
                    onClick={() => setKpiModal('investmentIncome')}
                  >
                    {formatCurrency(selectedYearEntry.investmentIncome ?? 0)}
                  </button>
                </div>
              </div>
	              <div className="results-detail__waterfall">
	                <div className="chart-block__header">
	                  <h4>内訳（ウォーターフォール）</h4>
	                  <span>差引 {formatCurrency(selectedYearEntry.netCashFlow)}</span>
	                </div>
	                <WaterfallChart data={selectedWaterfall} width={420} height={180} />
	              </div>
              {selectedYearEntry.events?.length ? (
                <div className="results-detail__events">
                  <h4>イベント</h4>
                  <ul>
                    {selectedYearEntry.events.map((event, index) => (
                      <li key={`${selectedYearEntry.year}-${index}`}>{event}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="results-detail__events results-detail__events--empty">
                  <h4>イベント</h4>
                  <p className="chart-note">この年にイベントはありません。</p>
                </div>
              )}

              <div className="results-next-actions" aria-label="次にやること">
                <h4>次にやること</h4>
                <div className="results-next-actions__buttons">
                  <button
                    type="button"
                    className="chart-inline-btn chart-inline-btn--primary"
                    onClick={() => openEditor({ mode: 'wizard', tab: 'form' })}
                  >
                    詳細条件を確認する
                  </button>
                  <button
                    type="button"
                    className="chart-inline-btn"
                    onClick={() => duplicateScenario(scenario.id)}
                  >
                    シナリオを複製して比較
                  </button>
                  {scenario.summary.firstNegativeYear ? (
                    <button
                      type="button"
                      className="chart-inline-btn"
                      onClick={() => setSelectedYear(scenario.summary.firstNegativeYear ?? selectedYearResolved)}
                    >
                      赤字開始年へ移動
                    </button>
                  ) : null}
                </div>
                <p className="chart-note">
                  生活費や住宅費を少し変えて、差がどこで出るか（右側の内訳）で確認するのがおすすめです。
                </p>
              </div>
            </>
          ) : (
            <p className="chart-note">年データがありません。</p>
          )}
        </aside>
      </div>

      {kpiModal && selectedYearEntry ? (
        <div
          className="kpi-modal"
          role="dialog"
          aria-modal="true"
          aria-label="計算内訳"
          onClick={() => setKpiModal(null)}
        >
          <div className="kpi-modal__panel" onClick={(event) => event.stopPropagation()}>
            <header className="kpi-modal__header">
              <div>
                <h3 className="kpi-modal__title">
                  {selectedYearEntry.year}年の
                  {kpiModal === 'netWorth' ? '純資産' : kpiModal === 'netCashFlow' ? '差引' : '運用益'} 内訳
                </h3>
                <p className="kpi-modal__subtitle">クリックした値の計算に使った要素を表示します（概算）。</p>
              </div>
              <button type="button" className="kpi-modal__close-btn" onClick={() => setKpiModal(null)}>
                閉じる
              </button>
            </header>

            {kpiModal === 'netCashFlow' ? (
              <div className="kpi-modal__body">
                <dl className="kpi-breakdown">
                  <div className="kpi-breakdown__row">
                    <dt>収入（給与など）</dt>
                    <dd>{formatCurrency(selectedYearEntry.income - (selectedYearEntry.investmentIncome ?? 0))}</dd>
                  </div>
                  <div className="kpi-breakdown__row">
                    <dt>運用益</dt>
                    <dd>{formatCurrency(selectedYearEntry.investmentIncome ?? 0)}</dd>
                  </div>
                  <div className="kpi-breakdown__divider" />
                  <div className="kpi-breakdown__row">
                    <dt>生活費</dt>
                    <dd>-{formatCurrency(selectedYearEntry.expenses.living)}</dd>
                  </div>
                  <div className="kpi-breakdown__row">
                    <dt>教育費</dt>
                    <dd>-{formatCurrency(selectedYearEntry.expenses.education)}</dd>
                  </div>
                  <div className="kpi-breakdown__row">
                    <dt>住宅費</dt>
                    <dd>-{formatCurrency(selectedYearEntry.expenses.housing)}</dd>
                  </div>
                  <div className="kpi-breakdown__row">
                    <dt>車</dt>
                    <dd>-{formatCurrency(selectedYearEntry.expenses.vehicle)}</dd>
                  </div>
                  <div className="kpi-breakdown__row">
                    <dt>その他</dt>
                    <dd>-{formatCurrency(selectedYearEntry.expenses.other)}</dd>
                  </div>
                  <div className="kpi-breakdown__row">
                    <dt>貯蓄積立</dt>
                    <dd>-{formatCurrency(selectedYearEntry.expenses.savingsContribution)}</dd>
                  </div>
                  <div className="kpi-breakdown__divider" />
                  <div className="kpi-breakdown__row kpi-breakdown__row--total">
                    <dt>差引</dt>
                    <dd>{formatCurrency(selectedYearEntry.netCashFlow)}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {kpiModal === 'netWorth' ? (
              <div className="kpi-modal__body">
                {(() => {
                  const savingsTotal = Object.values(selectedYearEntry.savingsByAccount ?? {}).reduce((sum, value) => sum + value, 0)
                  const cashOnHand = selectedYearEntry.netWorth - savingsTotal
                  return (
                    <dl className="kpi-breakdown">
                      <div className="kpi-breakdown__row">
                        <dt>現金</dt>
                        <dd>{formatCurrency(cashOnHand)}</dd>
                      </div>
                      <div className="kpi-breakdown__divider" />
                      {scenario.savingsAccountsMeta.map((account) => (
                        <div key={account.id} className="kpi-breakdown__row">
                          <dt>{account.label}</dt>
                          <dd>{formatCurrency(selectedYearEntry.savingsByAccount?.[account.id] ?? 0)}</dd>
                        </div>
                      ))}
                      <div className="kpi-breakdown__divider" />
                      <div className="kpi-breakdown__row kpi-breakdown__row--total">
                        <dt>純資産</dt>
                        <dd>{formatCurrency(selectedYearEntry.netWorth)}</dd>
                      </div>
                    </dl>
                  )
                })()}
              </div>
            ) : null}

            {kpiModal === 'investmentIncome' ? (
              <div className="kpi-modal__body">
                <dl className="kpi-breakdown">
                  {scenario.savingsAccountsMeta.map((account) => {
                    const growth = selectedYearEntry.investmentIncomeByAccount?.[account.id] ?? 0
                    return (
                      <div key={account.id} className="kpi-breakdown__row">
                        <dt>
                          {account.label}
                          <span className="kpi-breakdown__meta">（年利 {Math.round(account.annualInterestRate * 1000) / 10}%）</span>
                        </dt>
                        <dd>{formatCurrency(growth)}</dd>
                      </div>
                    )
                  })}
                  <div className="kpi-breakdown__divider" />
                  <div className="kpi-breakdown__row kpi-breakdown__row--total">
                    <dt>運用益 合計</dt>
                    <dd>{formatCurrency(selectedYearEntry.investmentIncome ?? 0)}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <ul className="scenario-results__summary">
        <li>
          総収入 <strong>{formatCurrency(scenario.summary.totalIncome)}</strong>
        </li>
        <li>
          総運用益 <strong>{formatCurrency(totalInvestmentIncome)}</strong>
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

const formatManYenLabel = (valueYen: number) => {
  const sign = valueYen < 0 ? '-' : ''
  const man = Math.round(Math.abs(valueYen) / 10_000)
  return `${sign}${man.toLocaleString('ja-JP')}万`
}

const formatManYenWithYen = (valueYen: number) => `${formatManYenLabel(valueYen)}（${formatCurrency(valueYen)}）`

const WaterfallChart = ({ data, width = 640, height = 340 }: { data: WaterfallEntry[]; width?: number; height?: number }) => {
  const { setContainer, width: measuredWidth } = useMeasuredWidth()
  const [activeKey, setActiveKey] = useState<string | null>(null)
  if (!data.length) {
    return <p>ウォーターフローのデータが不足しています。</p>
  }
  const resolvedWidth = Math.max(260, Math.min(width, measuredWidth))
  const resolvedHeight = Math.max(120, Math.round((height / width) * resolvedWidth))
  const paddingX = resolvedWidth < 420 ? 40 : 60
  const paddingY = 30
  const chartWidth = resolvedWidth - paddingX * 2
  const chartHeight = resolvedHeight - paddingY * 2
  const yMax = Math.max(...data.map((entry) => Math.max(entry.y, entry.y0)))
  const yMin = Math.min(...data.map((entry) => Math.min(entry.y, entry.y0)))
  const range = yMax - yMin || 1
  const scaleY = (value: number) => paddingY + chartHeight - ((value - yMin) / range) * chartHeight
  const slotWidth = chartWidth / data.length
  const barWidth = Math.max(20, slotWidth - 20)
  const zeroY = scaleY(0)

  const labelMode: 'full' | 'compact' | 'selectedOnly' = slotWidth >= 90 ? 'full' : slotWidth >= 60 ? 'compact' : 'selectedOnly'
  const valueFontSize = labelMode === 'full' ? 12 : 10
  const selectedEntry = activeKey ? data.find((entry) => entry.key === activeKey) ?? null : null

  return (
    <div ref={setContainer} className="waterfall-chart">
      <svg
        width={resolvedWidth}
        height={resolvedHeight}
        viewBox={`0 0 ${resolvedWidth} ${resolvedHeight}`}
        role="img"
        aria-label="ウォーターフロー"
      >
        {labelMode === 'selectedOnly' && selectedEntry ? (
          <text x={paddingX} y={Math.max(16, paddingY - 8)} fontSize={12} fill="#0f172a">
            {selectedEntry.label}: {formatManYenWithYen(selectedEntry.value)}
          </text>
        ) : null}
        <line
          x1={paddingX - 10}
          x2={resolvedWidth - paddingX + 10}
          y1={zeroY}
          y2={zeroY}
          stroke="#cbd5f5"
          strokeWidth={1}
        />
        {data.map((entry, idx) => {
          const startY = scaleY(entry.y)
          const endY = scaleY(entry.y0)
          const barHeight = Math.abs(endY - startY)
          const y = Math.min(startY, endY)
          const valueLabelY = Math.max(14, y - 6)
          const x = paddingX + idx * slotWidth + (slotWidth - barWidth) / 2
          const showValueLabel = labelMode !== 'selectedOnly'
          const valueLabel = labelMode === 'full' ? formatManYenWithYen(entry.value) : formatManYenLabel(entry.value)
          return (
            <g key={entry.key}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                fill={entry.color}
                rx={4}
                stroke={entry.key === activeKey ? 'rgba(15, 23, 42, 0.55)' : 'transparent'}
                strokeWidth={entry.key === activeKey ? 2 : 0}
                onClick={() => setActiveKey(entry.key)}
                style={{ cursor: labelMode === 'selectedOnly' ? 'pointer' : 'default' }}
              />
              {showValueLabel ? (
                <text
                  x={x + barWidth / 2}
                  y={valueLabelY}
                  textAnchor="middle"
                  fontSize={valueFontSize}
                  fill="#0f172a"
                >
                  {valueLabel}
                </text>
              ) : null}
              <text
                x={x + barWidth / 2}
                y={resolvedHeight - 8}
                textAnchor="middle"
                fontSize={12}
                fill="#475569"
                transform={`rotate(-30 ${x + barWidth / 2},${resolvedHeight - 8})`}
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
  const netWorthDomain = useMemo(
    () => computeDomain(scenarios.flatMap((scenario) => scenario.netWorth.map((point) => point.y))),
    [scenarios],
  )
  const selectedYearResolved = useMemo(() => {
    if (!allYears.length) {
      return selectedYear
    }
    if (allYears.includes(selectedYear)) {
      return selectedYear
    }
    const nearest = findNearestPoint(allYears.map((year) => ({ x: year, y: year })), selectedYear)
    return nearest ? Math.round(nearest.x) : selectedYear
  }, [allYears, selectedYear])
  const selectedYearIndex = useMemo(
    () => allYears.findIndex((year) => year === selectedYearResolved),
    [allYears, selectedYearResolved],
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
      <div className="results-split">
        <div className="results-split__main">
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
                        setSelectedYear(year)
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
                  <VictoryAxis tickFormat={(tick) => `${tick}`} style={axisBaseStyle} />
                  <VictoryAxis dependentAxis tickFormat={formatAxisManYen} label="万円" style={netWorthAxisStyle} />
                  {scenarios.map((scenario) => (
                    <VictoryArea
                      key={`${scenario.id}-area`}
                      data={scenario.netWorth}
                      interpolation="monotoneX"
                      y0={() => netWorthDomain.min}
                      style={makeAreaStyle(scenario.color, 0.08)}
                    />
                  ))}
                  {scenarios.map((scenario) => (
                    <VictoryLine
                      key={scenario.id}
                      data={scenario.netWorth}
                      interpolation="monotoneX"
                      style={makeLineStyle(scenario.color, 2.4)}
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
              <p className="chart-note">年を選ぶと右側に各シナリオの内訳（ウォーターフォール）とイベントが表示されます。</p>
            </div>
          ) : (
            <div className="chart-block">
              <div className="chart-block__header">
                <h3>全シナリオキャッシュフロー比較</h3>
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
                  <VictoryAxis dependentAxis tickFormat={formatAxisManYen} label="万円" style={dependentAxisStyle} />
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
              <p className="chart-note">棒をクリックすると右側の内訳とイベントが更新されます。</p>
            </div>
          )}
        </div>

        <aside className="results-split__detail" aria-label="選択年の詳細（全シナリオ）">
          <div className="results-detail__header">
            <strong>選択年</strong>
            <div className="results-detail__controls">
              <button
                type="button"
                className="chart-inline-btn"
                onClick={() => {
                  if (selectedYearIndex <= 0) return
                  setSelectedYear(allYears[selectedYearIndex - 1] ?? selectedYearResolved)
                }}
                disabled={selectedYearIndex <= 0}
              >
                ←
              </button>
              <label className="chart-inline-control">
                <select value={selectedYearResolved} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                  {allYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="chart-inline-btn"
                onClick={() => {
                  if (selectedYearIndex < 0 || selectedYearIndex >= allYears.length - 1) return
                  setSelectedYear(allYears[selectedYearIndex + 1] ?? selectedYearResolved)
                }}
                disabled={selectedYearIndex < 0 || selectedYearIndex >= allYears.length - 1}
              >
                →
              </button>
            </div>
          </div>

          <div className="results-detail__scenario-list">
            {scenarios.map((scenario) => {
              const yearEntry = findNearestYearlyEntry(scenario.yearly, selectedYearResolved)
              if (!yearEntry) {
                return (
                  <div key={scenario.id} className="results-detail__scenario">
                    <div className="results-detail__scenario-header">
                      <strong>{scenario.label}</strong>
                      <span className="chart-note">データなし</span>
                    </div>
                  </div>
                )
              }
              const waterfall = buildCashFlowWaterfall(yearEntry)
              return (
                <div key={scenario.id} className="results-detail__scenario">
                  <div className="results-detail__scenario-header">
                    <strong>
                      <span className="chart-legend__swatch" style={{ backgroundColor: scenario.color }} /> {scenario.label}
                    </strong>
                    <span>差引 {formatCurrency(yearEntry.netCashFlow)}</span>
                  </div>
	                  <div className="results-detail__scenario-waterfall">
	                    <WaterfallChart data={waterfall} width={420} height={170} />
	                  </div>
                  {yearEntry.events?.length ? (
                    <div className="results-detail__scenario-events">
                      <h4>イベント</h4>
                      <ul>
                        {yearEntry.events.map((event, index) => (
                          <li key={`${scenario.id}-${yearEntry.year}-${index}`}>{event}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="results-detail__scenario-events results-detail__scenario-events--empty">
                      <h4>イベント</h4>
                      <p className="chart-note">この年にイベントはありません。</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </aside>
      </div>
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

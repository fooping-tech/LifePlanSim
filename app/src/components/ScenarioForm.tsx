import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { Control, UseFormRegister } from 'react-hook-form'
import type { Scenario } from '@models/scenario'
import { EducationPresetDialog } from '@components/EducationPresetDialog'
import type { EducationPresetBandTemplate } from '@hooks/useEducationPresets'
import { useScenarioStore } from '@store/scenarioStore'
import { createBlankScenario } from '@utils/sampleData'
import { createId } from '@utils/id'
import { useDebouncedCallback } from '@utils/useDebouncedCallback'

const YEN_STEP = 10000

export const ScenarioForm = () => {
  const scenario = useScenarioStore((state) =>
    state.scenarios.find((item) => item.id === state.activeScenarioId),
  )
  const updateScenario = useScenarioStore((state) => state.updateScenario)
  const blankScenario = useMemo(() => createBlankScenario('temp'), [])
  const form = useForm<Scenario>({
    mode: 'onChange',
    defaultValues: scenario ?? blankScenario,
  })
  const { register, control, reset } = form
  const watchedValues = useWatch({ control })
  const activeScenarioIdRef = useRef<string | null>(scenario?.id ?? null)

  useEffect(() => {
    if (scenario && scenario.id !== activeScenarioIdRef.current) {
      activeScenarioIdRef.current = scenario.id
      reset(scenario)
    }
  }, [scenario, reset])

  const debouncedUpdate = useDebouncedCallback((values: Scenario) => {
    if (!scenario) {
      return
    }
    updateScenario({ ...values, id: scenario.id })
  }, 250)

  useEffect(() => {
    if (!scenario) {
      return
    }
    debouncedUpdate(watchedValues as Scenario)
  }, [watchedValues, debouncedUpdate, scenario])

  const {
    fields: residentFields,
    append: appendResident,
    remove: removeResident,
  } = useFieldArray({
    control,
    name: 'residents',
    keyName: 'fieldKey',
  })

  const {
    fields: vehicleFields,
    append: appendVehicle,
    remove: removeVehicle,
  } = useFieldArray({
    control,
    name: 'vehicles',
    keyName: 'fieldKey',
  })

  const {
    fields: savingsFields,
    append: appendSavings,
    remove: removeSavings,
  } = useFieldArray({
    control,
    name: 'savingsAccounts',
    keyName: 'fieldKey',
  })

  const {
    fields: expenseFields,
    append: appendScenarioExpense,
    remove: removeScenarioExpense,
  } = useFieldArray({
    control,
    name: 'expenseBands',
    keyName: 'fieldKey',
  })

  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({})
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  if (!scenario) {
    return (
      <section className="panel scenario-form">
        <p>シナリオを選択してください。</p>
      </section>
    )
  }

  const sections: { id: string; label: string; content: React.ReactNode }[] = [
    {
      id: 'basic-info',
      label: '基本情報',
      content: (
        <div className="form-section form-section--grid">
          <label>
            シナリオ名
            <input {...register('name')} />
          </label>
          <label>
            説明
            <input {...register('description')} />
          </label>
          <label>
            開始年
            <input type="number" inputMode="numeric" {...register('startYear', { valueAsNumber: true })} />
          </label>
        </div>
      ),
    },
    {
      id: 'residents-list',
      label: '住人リスト',
      content: (
        <div className="form-section">
          {residentFields.map((field, index) => {
            const entityId = (field as { id?: string }).id ?? (field as { fieldKey?: string }).fieldKey
            const cardKey = `resident-${entityId ?? index}`
            const collapsed = collapsedMap[cardKey] ?? false
            return (
              <ResidentCard
                key={field.fieldKey ?? entityId ?? index}
                index={index}
                register={register}
                control={control}
                onRemove={() => removeResident(index)}
                collapsed={collapsed}
                onToggle={() =>
                  setCollapsedMap((prev) => ({
                    ...prev,
                    [cardKey]: !collapsed,
                  }))
                }
              />
            )
          })}
          <button
            type="button"
            onClick={() =>
              appendResident({
                id: createId('resident'),
                name: '新しい住人',
                currentAge: 35,
                retirementAge: 65,
                baseNetIncome: 5000000,
                annualIncomeGrowthRate: 0.02,
                incomeEvents: [],
                expenseBands: [],
              })
            }
          >
            + 住人を追加
          </button>
        </div>
      ),
    },
    {
      id: 'housing-costs',
      label: '住宅コスト',
      content: (
        <div className="form-section form-section--grid">
          <label>
            ローン残額
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('housing.mortgageRemaining', { valueAsNumber: true })}
            />
          </label>
          <label>
            月々のローン
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('housing.monthlyMortgage', { valueAsNumber: true })}
            />
          </label>
          <label>
            管理費（月額）
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('housing.managementFeeMonthly', { valueAsNumber: true })}
            />
          </label>
          <label>
            修繕積立（月額）
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('housing.maintenanceReserveMonthly', { valueAsNumber: true })}
            />
          </label>
          <label>
            その他年間費用
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('housing.extraAnnualCosts', { valueAsNumber: true })}
            />
          </label>
        </div>
      ),
    },
    {
      id: 'vehicle-list',
      label: '車一覧',
      content: (
        <div className="form-section form-section--grid">
          {vehicleFields.map((field, index) => {
            const entityId = (field as { id?: string }).id ?? (field as { fieldKey?: string }).fieldKey
            const cardKey = `vehicle-${entityId ?? index}`
            const collapsed = collapsedMap[cardKey] ?? false
            return (
              <div key={field.fieldKey ?? entityId ?? index} className="card collapsible-card">
                <div className="collapsible-card__header">
                  <button
                    type="button"
                    className="collapsible-subheader"
                    onClick={() =>
                      setCollapsedMap((prev) => ({
                        ...prev,
                        [cardKey]: !collapsed,
                      }))
                    }
                  >
                    <span>車 {index + 1}</span>
                    <span className="collapse-icon">{collapsed ? '+' : '−'}</span>
                  </button>
                  <button type="button" className="link-button" onClick={() => removeVehicle(index)}>
                    削除
                  </button>
                </div>
                {!collapsed ? (
                  <div className="collapsible-card__body">
                    <label>
                      名称
                      <input {...register(`vehicles.${index}.label` as const)} />
                    </label>
                    <label>
                      ローン残額
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`vehicles.${index}.loanRemaining` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      月々のローン
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`vehicles.${index}.monthlyLoan` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      車検周期（年）
                      <input
                        type="number"
                        {...register(`vehicles.${index}.inspectionCycleYears` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      車検費用
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`vehicles.${index}.inspectionCost` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      年間メンテ費用
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`vehicles.${index}.maintenanceAnnual` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      駐車場（月額）
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`vehicles.${index}.parkingMonthly` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      保険（年額）
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`vehicles.${index}.insuranceAnnual` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            )
          })}
          <button
            type="button"
            onClick={() =>
              appendVehicle({
                id: createId('vehicle'),
                label: '新しい車',
                loanRemaining: 0,
                monthlyLoan: 0,
                inspectionCycleYears: 2,
                inspectionCost: 100000,
                maintenanceAnnual: 60000,
                parkingMonthly: 0,
                insuranceAnnual: 60000,
                purchasePrice: 0,
              })
            }
          >
            + 車を追加
          </button>
        </div>
      ),
    },
    {
      id: 'living-costs',
      label: '生活費',
      content: (
        <div className="form-section form-section--grid">
          <label>
            基本生活費（年）
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('living.baseAnnual', { valueAsNumber: true })}
            />
          </label>
          <label>
            保険（年）
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('living.insuranceAnnual', { valueAsNumber: true })}
            />
          </label>
          <label>
            光熱費（年）
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('living.utilitiesAnnual', { valueAsNumber: true })}
            />
          </label>
          <label>
            自由費（年）
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('living.discretionaryAnnual', { valueAsNumber: true })}
            />
          </label>
          <label>
            医療費（年）
            <input
              type="number"
              inputMode="numeric"
              step={YEN_STEP}
              {...register('living.healthcareAnnual', { valueAsNumber: true })}
            />
          </label>
          <label>
            物価上昇率
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              {...register('living.inflationRate', { valueAsNumber: true })}
            />
          </label>
        </div>
      ),
    },
    {
      id: 'savings-list',
      label: '貯蓄口座一覧',
      content: (
        <div className="form-section">
          {savingsFields.map((field, index) => {
            const entityId = (field as { id?: string }).id ?? (field as { fieldKey?: string }).fieldKey
            const cardKey = `savings-${entityId ?? index}`
            const collapsed = collapsedMap[cardKey] ?? false
            return (
              <div key={field.fieldKey ?? entityId ?? index} className="card collapsible-card">
                <div className="collapsible-card__header">
                  <button
                    type="button"
                    className="collapsible-subheader"
                    onClick={() =>
                      setCollapsedMap((prev) => ({
                        ...prev,
                        [cardKey]: !collapsed,
                      }))
                    }
                  >
                    <span>{field.label || `口座 ${index + 1}`}</span>
                    <span className="collapse-icon">{collapsed ? '+' : '−'}</span>
                  </button>
                  <button type="button" className="link-button" onClick={() => removeSavings(index)}>
                    削除
                  </button>
                </div>
                {!collapsed ? (
                  <div className="collapsible-card__body">
                    <label>
                      名称
                      <input {...register(`savingsAccounts.${index}.label` as const)} />
                    </label>
                    <label>
                      種類
                      <select {...register(`savingsAccounts.${index}.type` as const)}>
                        <option value="deposit">預金</option>
                        <option value="investment">投資</option>
                      </select>
                    </label>
                    <label>
                      残高
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`savingsAccounts.${index}.balance` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      年間積立額
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`savingsAccounts.${index}.annualContribution` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      年利
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        {...register(`savingsAccounts.${index}.annualInterestRate` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      引き出し優先度
                      <input
                        type="number"
                        {...register(`savingsAccounts.${index}.withdrawPriority` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        {...register(`savingsAccounts.${index}.adjustable` as const)}
                      />
                      任意に増額
                    </label>
                  </div>
                ) : null}
              </div>
            )
          })}
          <button
            type="button"
            onClick={() =>
              appendSavings({
                id: createId('savings'),
                label: '新しい口座',
                type: 'deposit',
                balance: 0,
                annualContribution: 0,
                annualInterestRate: 0.01,
                adjustable: true,
              })
            }
          >
            + 貯蓄を追加
          </button>
        </div>
      ),
    },
    {
      id: 'event-list',
      label: 'イベント支出一覧',
      content: (
        <div className="form-section">
          {expenseFields.map((field, index) => {
            const entityId = (field as { id?: string }).id ?? (field as { fieldKey?: string }).fieldKey
            const cardKey = `expense-${entityId ?? index}`
            const collapsed = collapsedMap[cardKey] ?? false
            return (
              <div key={field.fieldKey ?? entityId ?? index} className="card collapsible-card">
                <div className="collapsible-card__header">
                  <button
                    type="button"
                    className="collapsible-subheader"
                    onClick={() =>
                      setCollapsedMap((prev) => ({
                        ...prev,
                        [cardKey]: !collapsed,
                      }))
                    }
                  >
                    <span>{field.label || `イベント ${index + 1}`}</span>
                    <span className="collapse-icon">{collapsed ? '+' : '−'}</span>
                  </button>
                  <button type="button" className="link-button" onClick={() => removeScenarioExpense(index)}>
                    削除
                  </button>
                </div>
                {!collapsed ? (
                  <div className="collapsible-card__body">
                    <label>
                      ラベル
                      <input {...register(`expenseBands.${index}.label` as const)} />
                    </label>
                    <label>
                      開始年（開始からの年数）
                      <input
                        type="number"
                        {...register(`expenseBands.${index}.startAge` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      終了年
                      <input
                        type="number"
                        {...register(`expenseBands.${index}.endAge` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      年間支出
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`expenseBands.${index}.annualAmount` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      カテゴリ
                      <select {...register(`expenseBands.${index}.category` as const)}>
                        <option value="education">教育</option>
                        <option value="lessons">習い事</option>
                        <option value="housing">住宅</option>
                        <option value="vehicle">車</option>
                        <option value="living">生活</option>
                        <option value="event">イベント</option>
                        <option value="other">その他</option>
                      </select>
                    </label>
                  </div>
                ) : null}
              </div>
            )
          })}
          <button
            type="button"
            onClick={() =>
              appendScenarioExpense({
                id: createId('expense'),
                label: '新しい支出',
                startAge: 0,
                endAge: 0,
                annualAmount: 0,
                category: 'education',
              })
            }
          >
            + 支出を追加
          </button>
        </div>
      ),
    },
  ]

  return (
    <section className="panel scenario-form">
      <header className="panel__header">
        <h2>条件の編集</h2>
        <p>入力するとグラフがリアルタイムで更新されます。</p>
      </header>
      <form className="form-grid">
        <div className="section-jump section-jump--pinned" role="navigation" aria-label="条件セクション一覧">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className="section-jump__btn"
              onClick={() => {
                setCollapsedMap((prev) => ({
                  ...prev,
                  [section.id]: false,
                }))
                sectionRefs.current[section.id]?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start',
                })
              }}
            >
              {section.label}
            </button>
          ))}
        </div>
        <div className="sections-stack sections-stack--scroll">
          {sections.map((section) => {
            const collapsed = collapsedMap[section.id] ?? true
            return (
              <div
                key={section.id}
                className="collapsible-section"
                ref={(el) => {
                  sectionRefs.current[section.id] = el
                }}
              >
                <button
                  type="button"
                  className="collapsible-header"
                  onClick={() =>
                    setCollapsedMap((prev) => ({
                      ...prev,
                      [section.id]: !collapsed,
                    }))
                  }
                >
                  <span>{section.label}</span>
                  <span className="collapse-icon">{collapsed ? '+' : '−'}</span>
                </button>
                {!collapsed ? section.content : null}
              </div>
            )
          })}
        </div>
      </form>
    </section>
  )
}

interface ResidentCardProps {
  index: number
  control: Control<Scenario>
  register: UseFormRegister<Scenario>
  onRemove: () => void
  collapsed: boolean
  onToggle: () => void
}

const ResidentCard = ({
  index,
  control,
  register,
  onRemove,
  collapsed,
  onToggle,
}: ResidentCardProps) => {
  const {
    fields: incomeEventFields,
    append: appendIncomeEvent,
    remove: removeIncomeEvent,
  } = useFieldArray({
    control,
    name: `residents.${index}.incomeEvents` as const,
    keyName: 'fieldKey',
  })

  const {
    fields: expenseBandFields,
    append: appendExpenseBand,
    remove: removeExpenseBand,
  } = useFieldArray({
    control,
    name: `residents.${index}.expenseBands` as const,
    keyName: 'fieldKey',
  })
  const [presetOpen, setPresetOpen] = useState(false)

  const handlePresetApply = (bands: EducationPresetBandTemplate[]) => {
    bands.forEach((band) =>
      appendExpenseBand({
        id: createId('expense'),
        label: band.label,
        startAge: band.startAge,
        endAge: band.endAge,
        annualAmount: band.annualAmount,
        category: band.category,
      }),
    )
  }

  return (
    <div className="card collapsible-card">
      <div className="collapsible-card__header">
        <button type="button" className="collapsible-subheader" onClick={onToggle}>
          <span>住人 {index + 1}</span>
          <span className="collapse-icon">{collapsed ? '+' : '−'}</span>
        </button>
        <button type="button" className="link-button" onClick={onRemove}>
          削除
        </button>
      </div>
      {!collapsed ? (
        <div className="collapsible-card__body">
          <label>
            氏名
            <input {...register(`residents.${index}.name` as const)} />
          </label>
          <div className="grid-2">
            <label>
              現在年齢
              <input
                type="number"
                {...register(`residents.${index}.currentAge` as const, { valueAsNumber: true })}
              />
            </label>
            <label>
              退職年齢
              <input
                type="number"
                {...register(`residents.${index}.retirementAge` as const, { valueAsNumber: true })}
              />
            </label>
          </div>
          <div className="grid-2">
            <label>
              手取り収入（年）
              <input
                type="number"
                inputMode="numeric"
                step={YEN_STEP}
                {...register(`residents.${index}.baseNetIncome` as const, { valueAsNumber: true })}
              />
            </label>
            <label>
              年次上昇率
              <input
                type="number"
                step="0.01"
                {...register(`residents.${index}.annualIncomeGrowthRate` as const, {
                  valueAsNumber: true,
                })}
              />
            </label>
          </div>
          <details open>
            <summary>収入イベント</summary>
            {incomeEventFields.map((field, eventIndex) => (
              <div key={field.id} className="inline-card">
                <label>
                  ラベル
                  <input
                    {...register(
                      `residents.${index}.incomeEvents.${eventIndex}.label` as const,
                    )}
                  />
                </label>
                <label>
                  金額
                  <input
                    type="number"
                    inputMode="numeric"
                    step={YEN_STEP}
                    {...register(
                      `residents.${index}.incomeEvents.${eventIndex}.amount` as const,
                      { valueAsNumber: true },
                    )}
                  />
                </label>
                <label>
                  開始年齢
                  <input
                    type="number"
                    {...register(
                      `residents.${index}.incomeEvents.${eventIndex}.triggerAge` as const,
                      { valueAsNumber: true },
                    )}
                  />
                </label>
                <button type="button" onClick={() => removeIncomeEvent(eventIndex)}>
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                appendIncomeEvent({
                  id: createId('event'),
                  label: 'イベント',
                  amount: 0,
                  triggerAge: 40,
                  type: 'custom',
                })
              }
            >
              + 収入イベント追加
            </button>
          </details>

          <details open>
            <summary>教育・習い事など</summary>
            <div className="preset-inline-actions">
              <button type="button" className="link-button" onClick={() => setPresetOpen(true)}>
                プリセットから追加
              </button>
            </div>
            {expenseBandFields.map((field, expenseIndex) => (
              <div key={field.id} className="inline-card">
                <label>
                  ラベル
                  <input
                    {...register(
                      `residents.${index}.expenseBands.${expenseIndex}.label` as const,
                    )}
                  />
                </label>
                <label>
                  開始年齢
                  <input
                    type="number"
                    {...register(
                      `residents.${index}.expenseBands.${expenseIndex}.startAge` as const,
                      { valueAsNumber: true },
                    )}
                  />
                </label>
                <label>
                  終了年齢
                  <input
                    type="number"
                    {...register(
                      `residents.${index}.expenseBands.${expenseIndex}.endAge` as const,
                      { valueAsNumber: true },
                    )}
                  />
                </label>
                <label>
                  年間支出
                  <input
                    type="number"
                    inputMode="numeric"
                    step={YEN_STEP}
                    {...register(
                      `residents.${index}.expenseBands.${expenseIndex}.annualAmount` as const,
                      { valueAsNumber: true },
                    )}
                  />
                </label>
                <label>
                  カテゴリ
                  <select
                    {...register(
                      `residents.${index}.expenseBands.${expenseIndex}.category` as const,
                    )}
                  >
                    <option value="education">教育</option>
                    <option value="lessons">習い事</option>
                    <option value="event">イベント</option>
                    <option value="other">その他</option>
                  </select>
                </label>
                <button type="button" onClick={() => removeExpenseBand(expenseIndex)}>
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                appendExpenseBand({
                  id: createId('expense'),
                  label: '教育費',
                  startAge: 40,
                  endAge: 43,
                  annualAmount: 300000,
                  category: 'education',
                })
              }
            >
              + 教育費を追加
            </button>
          </details>
          <EducationPresetDialog
            isOpen={presetOpen}
            onClose={() => setPresetOpen(false)}
            onApply={(bands) => handlePresetApply(bands)}
          />
        </div>
      ) : null}
    </div>
  )
}

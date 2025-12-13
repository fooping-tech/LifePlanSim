import { useEffect, useMemo, useRef, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { Control, UseFormRegister } from 'react-hook-form'
import type { Scenario } from '@models/scenario'
import type { Resident } from '@models/resident'
import type { HousingPlan, LivingPlan, SavingsAccount, VehicleProfile } from '@models/finance'
import { EducationPresetDialog } from '@components/EducationPresetDialog'
import { ResidentPresetDialog } from '@components/ResidentPresetDialog'
import { HousingPresetDialog } from '@components/HousingPresetDialog'
import { VehiclePresetDialog } from '@components/VehiclePresetDialog'
import { SavingsPresetDialog } from '@components/SavingsPresetDialog'
import { LivingPresetDialog } from '@components/LivingPresetDialog'
import {
  IconCalendar,
  IconCar,
  IconHeartPulse,
  IconHome,
  IconSettings,
  IconUsers,
  IconWallet,
} from '@components/icons'
import type { EducationPresetBandTemplate } from '@hooks/useEducationPresets'
import { useScenarioStore } from '@store/scenarioStore'
import { createBlankScenario } from '@utils/sampleData'
import { createId } from '@utils/id'
import { useDebouncedCallback } from '@utils/useDebouncedCallback'

const YEN_STEP = 10000
const formatManYen = (value: number, digits = 1) =>
  new Intl.NumberFormat('ja-JP', { maximumFractionDigits: digits }).format(value / 10_000)

const formatManYenMonthlyAnnual = (annualYen: number): string => {
  const annual = Number.isFinite(annualYen) ? annualYen : 0
  const monthly = annual / 12
  return `月額${formatManYen(monthly, 1)}万(年額${formatManYen(annual, 0)}万)`
}

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
    fields: livingFields,
    append: appendLivingPlan,
    remove: removeLivingPlan,
  } = useFieldArray({
    control,
    name: 'livingPlans',
    keyName: 'fieldKey',
  })

  const {
    fields: housingFields,
    append: appendHousingPlan,
    remove: removeHousingPlan,
  } = useFieldArray({
    control,
    name: 'housingPlans',
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
  const [residentPresetOpen, setResidentPresetOpen] = useState(false)
  const [housingPresetOpen, setHousingPresetOpen] = useState(false)
  const [vehiclePresetOpen, setVehiclePresetOpen] = useState(false)
  const [livingPresetOpen, setLivingPresetOpen] = useState(false)
  const [livingPresetTargetIndex, setLivingPresetTargetIndex] = useState<number | null>(null)
  const [savingsPresetOpen, setSavingsPresetOpen] = useState(false)
  const [compactMode, setCompactMode] = useState(true)
  const [reducedColorMode, setReducedColorMode] = useState(false)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }
    document.body.classList.toggle('reduced-color', reducedColorMode)
  }, [reducedColorMode])

  if (!scenario) {
    return (
      <section className="panel scenario-form">
        <p>シナリオを選択してください。</p>
      </section>
    )
  }

  const handleApplyResidentPreset = (presetResident: Resident) => {
    appendResident({
      ...presetResident,
      id: createId('resident'),
      incomeEvents: presetResident.incomeEvents?.map((event) => ({
        ...event,
        id: createId('event'),
      })) ?? [],
      expenseBands: presetResident.expenseBands?.map((band) => ({
        ...band,
        id: createId('expense'),
      })) ?? [],
    })
  }

  const handleApplyVehiclePreset = (profile: VehicleProfile) => {
    appendVehicle({
      id: createId('vehicle'),
      label: profile.label,
      purchaseYear: profile.purchaseYear,
      purchasePrice: profile.purchasePrice,
      disposalYear: profile.disposalYear,
      disposalValue: profile.disposalValue,
      loanRemaining: profile.loanRemaining,
      monthlyLoan: profile.monthlyLoan,
      inspectionCycleYears: profile.inspectionCycleYears,
      inspectionCost: profile.inspectionCost,
      maintenanceAnnual: profile.maintenanceAnnual,
      parkingMonthly: profile.parkingMonthly,
      insuranceAnnual: profile.insuranceAnnual,
    })
  }

  const handleApplySavingsPreset = (account: SavingsAccount) => {
    appendSavings({
      ...account,
      id: createId('savings'),
    })
  }

  const handleApplyHousingPreset = (plan: Omit<HousingPlan, 'id'>) => {
    appendHousingPlan({
      ...plan,
      id: createId('housing'),
    } as HousingPlan)
  }

  const scenarioValues = watchedValues as Scenario
  const livingPlans = (scenarioValues.livingPlans ?? []) as LivingPlan[]
  const getSectionSummary = (sectionId: string): string | null => {
    switch (sectionId) {
      case 'basic-info': {
        const startYear = scenarioValues.startYear
        const horizonYears = scenarioValues.horizonYears
        if (typeof startYear === 'number' && typeof horizonYears === 'number') {
          return `開始 ${startYear} / ${horizonYears}年`
        }
        if (typeof startYear === 'number') {
          return `開始 ${startYear}`
        }
        return null
      }
      case 'residents-list': {
        const residents = scenarioValues.residents ?? []
        if (!residents.length) {
          return null
        }
        const total = residents.reduce((sum, resident) => sum + (resident.baseNetIncome ?? 0), 0)
        return `${residents.length}人 / 手取り${formatManYen(total, 0)}万/年`
      }
      case 'housing-costs': {
        const plans = scenarioValues.housingPlans ?? []
        if (!plans.length) {
          return null
        }
        const active = plans
          .filter((plan) => plan.startYearOffset <= 0 && (plan.endYearOffset == null || 0 <= plan.endYearOffset))
          .sort((a, b) => b.startYearOffset - a.startYearOffset)[0]
        if (!active) {
          return `${plans.length}件`
        }
        const annual =
          active.type === 'rent'
            ? active.monthlyRent * 12 + (active.monthlyFees ?? 0) * 12 + (active.extraAnnualCosts ?? 0)
            : active.monthlyMortgage * 12 +
              active.managementFeeMonthly * 12 +
              active.maintenanceReserveMonthly * 12 +
              (active.extraAnnualCosts ?? 0)
        const suffix = plans.length > 1 ? `・${plans.length}件` : ''
        return `${formatManYenMonthlyAnnual(annual)}${suffix}`
      }
      case 'vehicle-list': {
        const vehicles = scenarioValues.vehicles ?? []
        if (!vehicles.length) {
          return null
        }
        const annual = vehicles.reduce((sum, vehicle) => {
          const monthly = (vehicle.monthlyLoan ?? 0) + (vehicle.parkingMonthly ?? 0)
          const yearlyInspection =
            vehicle.inspectionCycleYears && vehicle.inspectionCycleYears > 0
              ? (vehicle.inspectionCost ?? 0) / vehicle.inspectionCycleYears
              : 0
          return (
            sum +
            monthly * 12 +
            (vehicle.maintenanceAnnual ?? 0) +
            (vehicle.insuranceAnnual ?? 0) +
            yearlyInspection
          )
        }, 0)
        return `${formatManYenMonthlyAnnual(annual)}・${vehicles.length}台`
      }
      case 'living-costs': {
        if (!livingPlans.length) {
          return null
        }
        const active = livingPlans
          .filter((plan) => plan.startYearOffset <= 0 && (plan.endYearOffset == null || 0 <= plan.endYearOffset))
          .sort((a, b) => b.startYearOffset - a.startYearOffset)[0]
        if (!active) {
          return `${livingPlans.length}件`
        }
        const annual =
          (active.baseAnnual ?? 0) +
          (active.insuranceAnnual ?? 0) +
          (active.utilitiesAnnual ?? 0) +
          (active.discretionaryAnnual ?? 0) +
          (active.healthcareAnnual ?? 0)
        const suffix = livingPlans.length > 1 ? `・${livingPlans.length}件` : ''
        return annual ? `${formatManYenMonthlyAnnual(annual)}${suffix}` : `${formatManYenMonthlyAnnual(0)}${suffix}`
      }
      case 'savings-list': {
        const accounts = scenarioValues.savingsAccounts ?? []
        if (!accounts.length) {
          return null
        }
        const annual = accounts.reduce((sum, account) => sum + (account.annualContribution ?? 0), 0)
        const suffix = accounts.length > 1 ? `・${accounts.length}` : ''
        return `${formatManYenMonthlyAnnual(annual)}${suffix}`
      }
      case 'event-list': {
        const bands = scenarioValues.expenseBands ?? []
        if (!bands.length) {
          return null
        }
        const annual = bands.reduce((sum, band) => sum + (band.annualAmount ?? 0), 0)
        return `${bands.length}件 / 年額${formatManYen(annual)}万`
      }
      default:
        return null
    }
  }

  const getSectionDecor = (sectionId: string) => {
    switch (sectionId) {
      case 'basic-info':
        return { className: 'collapsible-section--basic', icon: <IconSettings className="section-icon" aria-hidden /> }
      case 'residents-list':
        return { className: 'collapsible-section--residents', icon: <IconUsers className="section-icon" aria-hidden /> }
      case 'housing-costs':
        return { className: 'collapsible-section--housing', icon: <IconHome className="section-icon" aria-hidden /> }
      case 'vehicle-list':
        return { className: 'collapsible-section--vehicle', icon: <IconCar className="section-icon" aria-hidden /> }
      case 'living-costs':
        return { className: 'collapsible-section--living', icon: <IconHeartPulse className="section-icon" aria-hidden /> }
      case 'savings-list':
        return { className: 'collapsible-section--savings', icon: <IconWallet className="section-icon" aria-hidden /> }
      case 'event-list':
        return { className: 'collapsible-section--events', icon: <IconCalendar className="section-icon" aria-hidden /> }
      default:
        return { className: '', icon: null }
    }
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
          <div className="action-row">
            <button type="button" onClick={() => setResidentPresetOpen(true)}>
              プリセットから追加
            </button>
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
        </div>
      ),
    },
    {
      id: 'housing-costs',
      label: '住宅コスト',
      content: (
        <div className="form-section">
          {housingFields.map((field, index) => {
            const entityId = (field as { id?: string }).id ?? (field as { fieldKey?: string }).fieldKey
            const cardKey = `housing-${entityId ?? index}`
            const collapsed = collapsedMap[cardKey] ?? false
            const type = (watchedValues.housingPlans?.[index] as HousingPlan | undefined)?.type ?? 'own'

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
                    <span>住居 {index + 1}</span>
                    <span className="collapse-icon">{collapsed ? '+' : '−'}</span>
                  </button>
                  <button type="button" className="link-button" onClick={() => removeHousingPlan(index)}>
                    削除
                  </button>
                </div>
                {!collapsed ? (
                  <div className="collapsible-card__body form-section--grid">
                    <label>
                      名称
                      <input {...register(`housingPlans.${index}.label` as const)} />
                    </label>
                    <label>
                      種別
                      <select
                        {...register(`housingPlans.${index}.type` as const)}
                        onChange={(event) => {
                          const nextType = event.target.value as HousingPlan['type']
                          form.setValue(`housingPlans.${index}.type` as const, nextType, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                          if (nextType === 'rent') {
                            form.setValue(`housingPlans.${index}.monthlyRent` as const, 120000, {
                              shouldDirty: true,
                            })
                            form.setValue(`housingPlans.${index}.monthlyFees` as const, 0, {
                              shouldDirty: true,
                            })
                          } else {
                            form.setValue(`housingPlans.${index}.mortgageRemaining` as const, 0, {
                              shouldDirty: true,
                            })
                            form.setValue(`housingPlans.${index}.monthlyMortgage` as const, 0, {
                              shouldDirty: true,
                            })
                            form.setValue(`housingPlans.${index}.managementFeeMonthly` as const, 0, {
                              shouldDirty: true,
                            })
                            form.setValue(`housingPlans.${index}.maintenanceReserveMonthly` as const, 0, {
                              shouldDirty: true,
                            })
                            form.setValue(`housingPlans.${index}.builtYear` as const, new Date().getFullYear(), {
                              shouldDirty: true,
                            })
                          }
                        }}
                      >
                        <option value="own">持ち家</option>
                        <option value="rent">賃貸（アパート等）</option>
                      </select>
                    </label>
                    <label>
                      開始（年オフセット）
                      <input
                        type="number"
                        inputMode="numeric"
                        {...register(`housingPlans.${index}.startYearOffset` as const, { valueAsNumber: true })}
                      />
                    </label>
                    <label>
                      終了（年オフセット）
                      <input
                        type="number"
                        inputMode="numeric"
                        {...register(`housingPlans.${index}.endYearOffset` as const, {
                          setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)),
                        })}
                      />
                    </label>

                    {type === 'rent' ? (
                      <>
                        <label>
                          家賃（月額）
                          <input
                            type="number"
                            inputMode="numeric"
                            step={YEN_STEP}
                            {...register(`housingPlans.${index}.monthlyRent` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <label>
                          共益費など（月額）
                          <input
                            type="number"
                            inputMode="numeric"
                            step={YEN_STEP}
                            {...register(`housingPlans.${index}.monthlyFees` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <details className="grid-span-all">
                          <summary>詳細</summary>
                          <div className="inline-card">
                            <label>
                              入居費用（初年度のみ）
                              <input
                                type="number"
                                inputMode="numeric"
                                step={YEN_STEP}
                                {...register(`housingPlans.${index}.moveInCost` as const, { valueAsNumber: true })}
                              />
                            </label>
                            <label>
                              退去費用（終了年のみ）
                              <input
                                type="number"
                                inputMode="numeric"
                                step={YEN_STEP}
                                {...register(`housingPlans.${index}.moveOutCost` as const, { valueAsNumber: true })}
                              />
                            </label>
                            <label>
                              その他年間費用
                              <input
                                type="number"
                                inputMode="numeric"
                                step={YEN_STEP}
                                {...register(`housingPlans.${index}.extraAnnualCosts` as const, { valueAsNumber: true })}
                              />
                            </label>
                          </div>
                        </details>
                      </>
                    ) : (
                      <>
                        <label>
                          築年
                          <input
                            type="number"
                            inputMode="numeric"
                            {...register(`housingPlans.${index}.builtYear` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <label>
                          ローン残額
                          <input
                            type="number"
                            inputMode="numeric"
                            step={YEN_STEP}
                            {...register(`housingPlans.${index}.mortgageRemaining` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <label>
                          月々のローン
                          <input
                            type="number"
                            inputMode="numeric"
                            step={YEN_STEP}
                            {...register(`housingPlans.${index}.monthlyMortgage` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <label>
                          管理費（月額）
                          <input
                            type="number"
                            inputMode="numeric"
                            step={YEN_STEP}
                            {...register(`housingPlans.${index}.managementFeeMonthly` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <label>
                          修繕積立（月額）
                          <input
                            type="number"
                            inputMode="numeric"
                            step={YEN_STEP}
                            {...register(`housingPlans.${index}.maintenanceReserveMonthly` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <details className="grid-span-all">
                          <summary>詳細</summary>
                          <div className="inline-card">
                            <label>
                              購入費用（開始年のみ）
                              <input
                                type="number"
                                inputMode="numeric"
                                step={YEN_STEP}
                                {...register(`housingPlans.${index}.purchaseCost` as const, { valueAsNumber: true })}
                              />
                            </label>
                            <label>
                              売却額（終了年のみ）
                              <input
                                type="number"
                                inputMode="numeric"
                                step={YEN_STEP}
                                {...register(`housingPlans.${index}.saleValue` as const, { valueAsNumber: true })}
                              />
                            </label>
                            <label>
                              その他年間費用
                              <input
                                type="number"
                                inputMode="numeric"
                                step={YEN_STEP}
                                {...register(`housingPlans.${index}.extraAnnualCosts` as const, { valueAsNumber: true })}
                              />
                            </label>
                          </div>
                        </details>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}

          <div className="action-row">
            <button type="button" onClick={() => setHousingPresetOpen(true)}>
              プリセットから追加
            </button>
            <button
              type="button"
              onClick={() =>
                appendHousingPlan({
                  id: createId('housing'),
                  label: '住居',
                  type: 'own',
                  startYearOffset: 0,
                  builtYear: new Date().getFullYear(),
                  mortgageRemaining: 0,
                  monthlyMortgage: 0,
                  managementFeeMonthly: 0,
                  maintenanceReserveMonthly: 0,
                  extraAnnualCosts: 0,
                  purchaseCost: 0,
                  saleValue: 0,
                })
              }
            >
              + 住居を追加
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'vehicle-list',
      label: '車一覧',
      content: (
        <div className="form-section">
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
                  <div className="collapsible-card__body form-section--grid">
                    <label>
                      名称
                      <input {...register(`vehicles.${index}.label` as const)} />
                    </label>
                    <label>
                      購入年
                      <input
                        type="number"
                        {...register(`vehicles.${index}.purchaseYear` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      購入額（一括）
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`vehicles.${index}.purchasePrice` as const, {
                          valueAsNumber: true,
                        })}
                      />
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
                    <label>
                      売却/廃棄年
                      <input
                        type="number"
                        {...register(`vehicles.${index}.disposalYear` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                    <label>
                      売却額
                      <input
                        type="number"
                        inputMode="numeric"
                        step={YEN_STEP}
                        {...register(`vehicles.${index}.disposalValue` as const, {
                          valueAsNumber: true,
                        })}
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            )
          })}
          <div className="action-row">
            <button type="button" onClick={() => setVehiclePresetOpen(true)}>
              プリセットから追加
            </button>
            <button
              type="button"
              onClick={() =>
                appendVehicle({
                  id: createId('vehicle'),
                  label: '新しい車',
                  purchaseYear: new Date().getFullYear(),
                  disposalYear: undefined,
                  disposalValue: 0,
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
        </div>
      ),
    },
    {
      id: 'living-costs',
      label: '生活費',
      content: (
        <div className="form-section">
          {livingFields.map((field, index) => {
            const entityId = (field as { id?: string }).id ?? (field as { fieldKey?: string }).fieldKey
            const cardKey = `living-${entityId ?? index}`
            const collapsed = collapsedMap[cardKey] ?? false
            const plan = livingPlans[index]
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
                    <span>{plan?.label || `生活費 ${index + 1}`}</span>
                    <span className="collapse-icon">{collapsed ? '+' : '−'}</span>
                  </button>
                  <button type="button" className="link-button" onClick={() => removeLivingPlan(index)}>
                    削除
                  </button>
                </div>
                {!collapsed ? (
                  <div className="collapsible-card__body form-section--grid">
                    <label>
                      名称
                      <input {...register(`livingPlans.${index}.label` as const)} />
                    </label>
                    <label>
                      開始（年オフセット）
                      <input
                        type="number"
                        inputMode="numeric"
                        {...register(`livingPlans.${index}.startYearOffset` as const, { valueAsNumber: true })}
                      />
                    </label>
                    <label>
                      終了（年オフセット）
                      <input
                        type="number"
                        inputMode="numeric"
                        {...register(`livingPlans.${index}.endYearOffset` as const, {
                          setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)),
                        })}
                      />
                    </label>
                    <label>
                      基本生活費（月）
                      <input
                        type="number"
                        inputMode="numeric"
                        step={1000}
                        value={Math.round(((plan?.baseAnnual ?? 0) as number) / 12)}
                        onChange={(event) => {
                          const nextMonthly = Number(event.target.value || 0)
                          form.setValue(`livingPlans.${index}.baseAnnual` as const, nextMonthly * 12, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }}
                      />
                    </label>
                    <label>
                      保険（月）
                      <input
                        type="number"
                        inputMode="numeric"
                        step={1000}
                        value={Math.round(((plan?.insuranceAnnual ?? 0) as number) / 12)}
                        onChange={(event) => {
                          const nextMonthly = Number(event.target.value || 0)
                          form.setValue(`livingPlans.${index}.insuranceAnnual` as const, nextMonthly * 12, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }}
                      />
                    </label>
                    <label>
                      光熱費（月）
                      <input
                        type="number"
                        inputMode="numeric"
                        step={1000}
                        value={Math.round(((plan?.utilitiesAnnual ?? 0) as number) / 12)}
                        onChange={(event) => {
                          const nextMonthly = Number(event.target.value || 0)
                          form.setValue(`livingPlans.${index}.utilitiesAnnual` as const, nextMonthly * 12, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }}
                      />
                    </label>
                    <label>
                      自由費（月）
                      <input
                        type="number"
                        inputMode="numeric"
                        step={1000}
                        value={Math.round(((plan?.discretionaryAnnual ?? 0) as number) / 12)}
                        onChange={(event) => {
                          const nextMonthly = Number(event.target.value || 0)
                          form.setValue(`livingPlans.${index}.discretionaryAnnual` as const, nextMonthly * 12, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }}
                      />
                    </label>
                    <label>
                      医療費（月）
                      <input
                        type="number"
                        inputMode="numeric"
                        step={1000}
                        value={Math.round(((plan?.healthcareAnnual ?? 0) as number) / 12)}
                        onChange={(event) => {
                          const nextMonthly = Number(event.target.value || 0)
                          form.setValue(`livingPlans.${index}.healthcareAnnual` as const, nextMonthly * 12, {
                            shouldDirty: true,
                            shouldTouch: true,
                          })
                        }}
                      />
                    </label>
                    <label>
                      物価上昇率
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        {...register(`livingPlans.${index}.inflationRate` as const, {
                          setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)),
                        })}
                      />
                    </label>
                    <div className="action-row grid-span-all">
                      <button
                        type="button"
                        onClick={() => {
                          setLivingPresetTargetIndex(index)
                          setLivingPresetOpen(true)
                        }}
                      >
                        プリセットから適用
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            )
          })}
          <div className="action-row">
            <button
              type="button"
              onClick={() =>
                appendLivingPlan({
                  id: createId('living'),
                  label: '生活費',
                  startYearOffset: 0,
                  endYearOffset: undefined,
                  baseAnnual: 0,
                  insuranceAnnual: 0,
                  utilitiesAnnual: 0,
                  discretionaryAnnual: 0,
                  healthcareAnnual: 0,
                  inflationRate: undefined,
                })
              }
            >
              + 期間を追加
            </button>
          </div>
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
                  <div className="collapsible-card__body form-section--grid">
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
          <div className="action-row">
            <button type="button" onClick={() => setSavingsPresetOpen(true)}>
              プリセットから追加
            </button>
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
                  <div className="collapsible-card__body form-section--grid">
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
    <section className={['panel scenario-form', compactMode ? 'is-compact' : ''].join(' ')}>
      <header className="panel__header">
        <div className="panel__header-row">
          <h2>条件の編集</h2>
          <div>
            <button
              type="button"
              className="link-button"
              aria-pressed={compactMode}
              onClick={() => setCompactMode((prev) => !prev)}
            >
              {compactMode ? '表示を通常に' : '表示をコンパクトに'}
            </button>
            <button
              type="button"
              className="link-button"
              aria-pressed={reducedColorMode}
              onClick={() => setReducedColorMode((prev) => !prev)}
            >
              {reducedColorMode ? '色を戻す' : '色を抑える'}
            </button>
          </div>
        </div>
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
            const summary = getSectionSummary(section.id)
            const decor = getSectionDecor(section.id)
            return (
              <div
                key={section.id}
                className={['collapsible-section', decor.className].filter(Boolean).join(' ')}
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
                  <span className="collapsible-header__label">
                    {decor.icon}
                    {section.label}
                  </span>
                  <span className="collapsible-header__meta">
                    {summary ? <span className="collapsible-header__summary">{summary}</span> : null}
                    <span className="collapse-icon">{collapsed ? '+' : '−'}</span>
                  </span>
                </button>
                {!collapsed ? section.content : null}
              </div>
            )
          })}
        </div>
      </form>
      <ResidentPresetDialog
        isOpen={residentPresetOpen}
        onClose={() => setResidentPresetOpen(false)}
        onApply={(resident) => {
          handleApplyResidentPreset(resident)
          setResidentPresetOpen(false)
        }}
      />
      <HousingPresetDialog
        isOpen={housingPresetOpen}
        onClose={() => setHousingPresetOpen(false)}
        onApply={(plan) => {
          handleApplyHousingPreset(plan)
          setHousingPresetOpen(false)
        }}
      />
      <VehiclePresetDialog
        isOpen={vehiclePresetOpen}
        onClose={() => setVehiclePresetOpen(false)}
        onApply={(profile) => {
          handleApplyVehiclePreset(profile)
          setVehiclePresetOpen(false)
        }}
      />
      <LivingPresetDialog
        isOpen={livingPresetOpen}
        onClose={() => setLivingPresetOpen(false)}
        onApply={(preset) => {
          const targetIndex = livingPresetTargetIndex ?? 0
          if (!scenarioValues.livingPlans?.length) {
            appendLivingPlan({
              id: createId('living'),
              label: '生活費',
              startYearOffset: 0,
              endYearOffset: undefined,
              baseAnnual: 0,
              insuranceAnnual: 0,
              utilitiesAnnual: 0,
              discretionaryAnnual: 0,
              healthcareAnnual: 0,
              inflationRate: undefined,
            })
          }
          form.setValue(`livingPlans.${targetIndex}.baseAnnual` as const, preset.monthly.base * 12, {
            shouldDirty: true,
            shouldTouch: true,
          })
          form.setValue(`livingPlans.${targetIndex}.insuranceAnnual` as const, (preset.monthly.insurance ?? 0) * 12, {
            shouldDirty: true,
            shouldTouch: true,
          })
          form.setValue(`livingPlans.${targetIndex}.utilitiesAnnual` as const, (preset.monthly.utilities ?? 0) * 12, {
            shouldDirty: true,
            shouldTouch: true,
          })
          form.setValue(`livingPlans.${targetIndex}.discretionaryAnnual` as const, (preset.monthly.discretionary ?? 0) * 12, {
            shouldDirty: true,
            shouldTouch: true,
          })
          form.setValue(`livingPlans.${targetIndex}.healthcareAnnual` as const, (preset.monthly.healthcare ?? 0) * 12, {
            shouldDirty: true,
            shouldTouch: true,
          })
          if (typeof preset.inflationRate === 'number') {
            form.setValue(`livingPlans.${targetIndex}.inflationRate` as const, preset.inflationRate, {
              shouldDirty: true,
              shouldTouch: true,
            })
          }
          setLivingPresetTargetIndex(null)
          setLivingPresetOpen(false)
        }}
      />
      <SavingsPresetDialog
        isOpen={savingsPresetOpen}
        onClose={() => setSavingsPresetOpen(false)}
        onApply={(account) => {
          handleApplySavingsPreset(account)
          setSavingsPresetOpen(false)
        }}
      />
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
        <div className="collapsible-card__body form-section--grid">
          <label>
            氏名
            <input {...register(`residents.${index}.name` as const)} />
          </label>
          <div className="grid-2 grid-span-all">
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
          <div className="grid-2 grid-span-all">
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
          <details open className="grid-span-all">
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

          <details open className="grid-span-all">
            <summary>教育・習い事など</summary>
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
            <div className="action-row grid-span-all">
              <button type="button" onClick={() => setPresetOpen(true)}>
                プリセットから追加
              </button>
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
            </div>
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

import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import type { FieldPath, FieldPathValue } from 'react-hook-form'
import type { Scenario } from '@models/scenario'
import type { HousingPlan, LivingPlan, SavingsAccount, VehicleProfile } from '@models/finance'
import type { Resident } from '@models/resident'
import { useScenarioStore } from '@store/scenarioStore'
import { useDebouncedCallback } from '@utils/useDebouncedCallback'
import { createId } from '@utils/id'
import { YenInput } from '@components/YenInput'
import { WizardStepper } from '@components/WizardStepper'
import { IconCar, IconHeartPulse, IconHome, IconUsers, IconWallet } from '@components/icons'
import { ResidentPresetDialog } from '@components/ResidentPresetDialog'
import { HousingPresetDialog } from '@components/HousingPresetDialog'
import { VehiclePresetDialog } from '@components/VehiclePresetDialog'
import { LivingPresetDialog } from '@components/LivingPresetDialog'
import { SavingsPresetDialog } from '@components/SavingsPresetDialog'
import type { LivingPreset } from '@hooks/useLivingPresets'
import {
  buildChildEducationBands,
  estimateVehicleDefaults,
  type EducationPlanPreset,
  upsertRetirementEvent,
} from '@utils/estimates'

type WizardStepId = 'basic' | 'residents' | 'housing' | 'vehicle' | 'living' | 'savings' | 'review'

const WIZARD_UI_STORAGE = 'lifePlan.wizardUiState.v2'
const WIZARD_STEP_ORDER: WizardStepId[] = ['basic', 'residents', 'housing', 'vehicle', 'living', 'savings', 'review']

type WizardUiState = {
  step: WizardStepId
  childEducationPlanByResidentId: Record<string, EducationPlanPreset>
}

const readWizardUiState = (): WizardUiState => {
  if (typeof window === 'undefined') {
    return {
      step: 'basic',
      childEducationPlanByResidentId: {},
    }
  }
  try {
    const raw = window.localStorage.getItem(WIZARD_UI_STORAGE)
    if (!raw) {
      throw new Error('missing')
    }
    const parsed = JSON.parse(raw) as Partial<WizardUiState>
    return {
      step: parsed.step ?? 'basic',
      childEducationPlanByResidentId: parsed.childEducationPlanByResidentId ?? {},
    }
  } catch {
    return {
      step: 'basic',
      childEducationPlanByResidentId: {},
    }
  }
}

const writeWizardUiState = (state: WizardUiState) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(WIZARD_UI_STORAGE, JSON.stringify(state))
  } catch {
    // ignore
  }
}

const formatYen = (value: number) => new Intl.NumberFormat('ja-JP').format(Math.round(value))

const annualFromMonthlyManYen = (monthlyManYen: number) => Math.round((monthlyManYen * 10_000 * 12) / 1000) * 1000

type WizardEditorProps = {
  onClose?: () => void
  onSwitchToDetail?: () => void
}

type WizardSteps = ComponentProps<typeof WizardStepper>['steps']

export const WizardEditor = ({
  onClose,
  onSwitchToDetail,
}: WizardEditorProps) => {
  const scenario = useScenarioStore((state) =>
    state.scenarios.find((item) => item.id === state.activeScenarioId),
  )
  const updateScenario = useScenarioStore((state) => state.updateScenario)
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId)

  const initialUiState = useMemo(() => readWizardUiState(), [])
  const uiStateRef = useRef<WizardUiState>(initialUiState)
  const [step, setStep] = useState<WizardStepId>(initialUiState.step)
  const [childEducationPlanByResidentId, setChildEducationPlanByResidentId] = useState<Record<string, EducationPlanPreset>>(
    initialUiState.childEducationPlanByResidentId,
  )

  const persistUiState = (next: Partial<WizardUiState>) => {
    uiStateRef.current = {
      step,
      childEducationPlanByResidentId,
      ...next,
    } as WizardUiState
    writeWizardUiState(uiStateRef.current)
  }

  const form = useForm<Scenario>({
    mode: 'onChange',
    defaultValues: scenario ?? undefined,
  })
  const { control, register, reset, setValue } = form

  const activeScenarioIdRef = useRef<string | null>(scenario?.id ?? null)
  useEffect(() => {
    if (!scenario) return
    if (scenario.id !== activeScenarioIdRef.current) {
      activeScenarioIdRef.current = scenario.id
      reset(scenario)
    }
  }, [scenario, reset])

  const watchedValues = useWatch({ control })

  const debouncedUpdate = useDebouncedCallback((values: Scenario) => {
    if (!scenario) return
    updateScenario({ ...values, id: scenario.id })
  }, 200)

  useEffect(() => {
    if (!scenario) return
    debouncedUpdate(watchedValues as Scenario)
  }, [watchedValues, debouncedUpdate, scenario])

  const { fields: residentFields, append: appendResident, update: updateResident, remove: removeResident } = useFieldArray({
    control,
    name: 'residents',
    keyName: 'fieldKey',
  })

  const {
    fields: housingFields,
    append: appendHousing,
    update: updateHousing,
    replace: replaceHousing,
  } = useFieldArray({
    control,
    name: 'housingPlans',
    keyName: 'fieldKey',
  })

  const { fields: vehicleFields, append: appendVehicle, remove: removeVehicle } = useFieldArray({
    control,
    name: 'vehicles',
    keyName: 'fieldKey',
  })

  const { fields: livingFields, append: appendLiving, replace: replaceLiving } = useFieldArray({
    control,
    name: 'livingPlans',
    keyName: 'fieldKey',
  })

  const { fields: savingsFields, append: appendSavings, remove: removeSavings } = useFieldArray({
    control,
    name: 'savingsAccounts',
    keyName: 'fieldKey',
  })


  const [residentPresetOpen, setResidentPresetOpen] = useState(false)
  const [housingPresetOpen, setHousingPresetOpen] = useState(false)
  const [vehiclePresetOpen, setVehiclePresetOpen] = useState(false)
  const [livingPresetOpen, setLivingPresetOpen] = useState(false)
  const [savingsPresetOpen, setSavingsPresetOpen] = useState(false)

  const ensureMinimumArrays = useCallback(() => {
    if (!housingFields.length) {
      appendHousing({
        id: createId('housing'),
        label: '持ち家',
        type: 'own',
        startYearOffset: 0,
        endYearOffset: undefined,
        builtYear: 2012,
        mortgageRemaining: 0,
        monthlyMortgage: 0,
        managementFeeMonthly: 15000,
        maintenanceReserveMonthly: 12000,
        extraAnnualCosts: 200000,
        purchaseCost: 0,
        saleValue: 0,
      })
    }
    if (!livingFields.length) {
      appendLiving({
        id: createId('living'),
        label: '生活費',
        startYearOffset: 0,
        endYearOffset: undefined,
        baseAnnual: 0,
        insuranceAnnual: 0,
        utilitiesAnnual: 0,
        discretionaryAnnual: 0,
        healthcareAnnual: 0,
        inflationRate: 0.01,
      })
    }
    if (!savingsFields.length) {
      appendSavings({
        id: createId('savings'),
        label: '現金',
        type: 'deposit',
        role: 'emergency',
        contributionPolicy: 'fixed',
        withdrawPolicy: 'normal',
        minBalance: 1_000_000,
        balance: 2_000_000,
        annualContribution: 0,
        annualInterestRate: 0.001,
        adjustable: true,
        withdrawPriority: 0,
      } satisfies SavingsAccount)
    }
  }, [appendHousing, appendLiving, appendSavings, housingFields.length, livingFields.length, savingsFields.length])

  useEffect(() => {
    if (!scenario) return
    ensureMinimumArrays()
  }, [scenario?.id, scenario, ensureMinimumArrays])

  const completion = useMemo(() => {
    const v = watchedValues as Scenario
    const basicDone = Boolean(v.name?.trim()) && Number.isFinite(v.startYear)
    const residentsDone = (v.residents?.length ?? 0) > 0 && (v.residents?.some((r) => (r.baseNetIncome ?? 0) > 0) ?? false)
    const housingDone = (v.housingPlans?.length ?? 0) > 0
    const vehicleDone = true
    const livingDone = (v.livingPlans?.length ?? 0) > 0
    const savingsDone = (v.savingsAccounts?.length ?? 0) > 0
    return { basicDone, residentsDone, housingDone, vehicleDone, livingDone, savingsDone }
  }, [watchedValues])

  const stepsForUi = useMemo<WizardSteps>(() => {
    const isDone = (id: WizardStepId) => {
      switch (id) {
        case 'basic':
          return completion.basicDone
        case 'residents':
          return completion.residentsDone
        case 'housing':
          return completion.housingDone
        case 'vehicle':
          return completion.vehicleDone
        case 'living':
          return completion.livingDone
        case 'savings':
          return completion.savingsDone
        case 'review':
          return completion.basicDone && completion.residentsDone
      }
    }
    return WIZARD_STEP_ORDER.map((id) => ({
      id,
      label:
        id === 'basic'
          ? '基本'
          : id === 'residents'
            ? '住人'
            : id === 'housing'
              ? '住宅'
              : id === 'vehicle'
                ? '車'
                : id === 'living'
                  ? '生活費'
                  : id === 'savings'
                  ? '貯蓄'
                  : '確認',
      status: (id === step ? 'active' : isDone(id) ? 'done' : 'todo') as WizardSteps[number]['status'],
    }))
  }, [completion, step])

  const goStep = (next: WizardStepId) => {
    ensureMinimumArrays()
    setStep(next)
    persistUiState({ step: next })
  }

  const setFormValue = <TPath extends FieldPath<Scenario>>(
    path: TPath,
    value: FieldPathValue<Scenario, TPath>,
  ) => setValue(path, value, { shouldDirty: true, shouldTouch: true, shouldValidate: true })

  const stepIndex = WIZARD_STEP_ORDER.indexOf(step)
  const prevStep = stepIndex > 0 ? WIZARD_STEP_ORDER[stepIndex - 1] : null
  const nextStep = stepIndex < WIZARD_STEP_ORDER.length - 1 ? WIZARD_STEP_ORDER[stepIndex + 1] : null

  if (!scenario || !activeScenarioId) {
    return (
      <section className="panel scenario-form">
        <p>シナリオを選択してください。</p>
      </section>
    )
  }

  return (
    <section className="wizard-editor">
      <WizardStepper
        steps={stepsForUi}
        onStepSelect={(id) => {
          const next = id as WizardStepId
          const nextIndex = WIZARD_STEP_ORDER.indexOf(next)
          if (nextIndex < 0) return
          if (nextIndex > stepIndex) return
          goStep(next)
        }}
      />

      <div className="wizard-card">
        <aside className="wizard-card__art" aria-hidden>
          <div className="wizard-card__icon" aria-hidden>
            {step === 'residents' ? (
              <IconUsers />
            ) : step === 'housing' ? (
              <IconHome />
            ) : step === 'vehicle' ? (
              <IconCar />
            ) : step === 'living' ? (
              <IconHeartPulse />
            ) : step === 'savings' ? (
              <IconWallet />
            ) : (
              <IconWallet />
            )}
          </div>
        </aside>

        <div className="wizard-card__body">
          {step === 'basic' ? (
            <>
              <h3>基本情報</h3>
              <div className="wizard-grid">
                <label>
                  シナリオ名
                  <input {...register('name')} placeholder="例: 共働き+子ども2人" />
                </label>
                <label>
                  開始年
                  <input type="number" inputMode="numeric" {...register('startYear', { valueAsNumber: true })} />
                </label>
                <label className="wizard-span-2">
                  初期現金（任意）
                  <Controller
                    control={control}
                    name={'initialCash' as const}
                    render={({ field }) => (
                      <YenInput
                        value={field.value ?? 0}
                        ariaLabel="初期現金"
                        onChange={(next) => field.onChange(next)}
                        onBlur={() => field.onBlur()}
                      />
                    )}
                  />
                </label>
              </div>
            </>
          ) : null}

          {step === 'residents' ? (
            <>
              <div className="wizard-row">
                <h3>住人</h3>
                <div className="wizard-row__actions">
                  <button
                    type="button"
                    className="wizard-mini-btn"
                    onClick={() => {
                      ensureMinimumArrays()
                      setResidentPresetOpen(true)
                    }}
                  >
                    プリセットから追加
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      appendResident({
                        id: createId('resident'),
                        name: `住人${residentFields.length + 1}`,
                        currentAge: 35,
                        retirementAge: 65,
                        baseNetIncome: 0,
                        annualIncomeGrowthRate: 0,
                        dependents: 0,
                        incomeEvents: [],
                        expenseBands: [],
                      })
                    }
                  >
                    + 住人を追加
                  </button>
                </div>
              </div>
              <div className="wizard-list">
                {residentFields.map((field, idx) => {
                  const resident = (watchedValues.residents?.[idx] as Resident | undefined) ?? (field as unknown as Resident)
                  const isChild = (resident.baseNetIncome ?? 0) === 0 && (resident.currentAge ?? 0) < 25
                  const retirementEvent = (resident.incomeEvents ?? []).find(
                    (event) => event.type === 'retirement' || event.label === '退職金',
                  )
                  const retirementTriggerAge = Number.isFinite(retirementEvent?.triggerAge)
                    ? retirementEvent?.triggerAge
                    : Number.isFinite(resident.retirementAge)
                      ? resident.retirementAge
                      : 65
                  return (
                    <div key={field.fieldKey} className="wizard-mini-card">
                      <div className="wizard-mini-card__header">
                        <strong>{resident.name || `住人 ${idx + 1}`}</strong>
                        <button
                          type="button"
                          className="wizard-mini-btn wizard-mini-btn--danger"
                          onClick={() => {
                            const ok = window.confirm('この住人を削除しますか？')
                            if (!ok) return
                            const targetId = resident.id
                            removeResident(idx)
                            if (targetId) {
                              setChildEducationPlanByResidentId((prev) => {
                                if (!prev[targetId]) return prev
                                const rest = { ...prev }
                                delete rest[targetId]
                                persistUiState({ childEducationPlanByResidentId: rest })
                                return rest
                              })
                            }
                          }}
                        >
                          削除
                        </button>
                        {isChild ? (
                          <select
                            value={childEducationPlanByResidentId[resident.id] ?? 'private_highschool'}
                            onChange={(e) => {
                              const plan = e.target.value as EducationPlanPreset
                              setChildEducationPlanByResidentId((prev) => {
                                const next = { ...prev, [resident.id]: plan }
                                persistUiState({ childEducationPlanByResidentId: next })
                                return next
                              })
                              updateResident(idx, { ...resident, expenseBands: buildChildEducationBands(resident.currentAge, plan) })
                            }}
                          >
                            <option value="public_all">全て公立（大学は国公立）</option>
                            <option value="private_highschool">高校から私立</option>
                            <option value="private_juniorhigh">中学から私立</option>
                            <option value="private_elementary">小学校から私立</option>
                          </select>
                        ) : null}
                      </div>
                      <div className="wizard-grid">
                        <label className="wizard-span-2">
                          名前
                          <input {...register(`residents.${idx}.name` as const)} placeholder={`例: ${idx === 0 ? '本人' : '配偶者'}`} />
                        </label>
                        <label>
                          年齢
                          <input
                            type="number"
                            inputMode="numeric"
                            {...register(`residents.${idx}.currentAge` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <label>
                          退職年齢
                          <input
                            type="number"
                            inputMode="numeric"
                            {...register(`residents.${idx}.retirementAge` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <label className="wizard-span-2">
                          手取り年収
                          <Controller
                            control={control}
                            name={`residents.${idx}.baseNetIncome` as const}
                            render={({ field: incomeField }) => (
                              <YenInput
                                value={incomeField.value ?? 0}
                                ariaLabel="手取り年収"
                                onChange={(next) => incomeField.onChange(next)}
                                onBlur={() => incomeField.onBlur()}
                              />
                            )}
                          />
                        </label>
                        <label>
                          昇給率（年）
                          <input
                            type="number"
                            step="0.005"
                            inputMode="decimal"
                            {...register(`residents.${idx}.annualIncomeGrowthRate` as const, { valueAsNumber: true })}
                          />
                        </label>
                        <button
                          type="button"
                          className="wizard-mini-btn"
                          onClick={() => updateResident(idx, upsertRetirementEvent(resident))}
                          disabled={isChild}
                        >
                          退職金を推定
                        </button>
                        <span className="wizard-help wizard-span-2">
                          退職金: {formatYen(retirementEvent?.amount ?? 0)} 円（{retirementTriggerAge}歳）
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}

          {step === 'housing' ? (
            <>
              <div className="wizard-row">
                <h3>住宅</h3>
                <div className="wizard-row__actions">
                  <button
                    type="button"
                    className="wizard-mini-btn"
                    onClick={() => {
                      ensureMinimumArrays()
                      setHousingPresetOpen(true)
                    }}
                  >
                    プリセットから入力
                  </button>
                </div>
              </div>
              <div className="wizard-grid">
                <label className="wizard-span-2">
                  住まい
                  <select
                    value={(watchedValues.housingPlans?.[0] as HousingPlan | undefined)?.type ?? 'own'}
                    onChange={(e) => {
                      const type = e.target.value as HousingPlan['type']
                      const current =
                        (watchedValues.housingPlans?.[0] as HousingPlan | undefined) ?? (housingFields[0] as unknown as HousingPlan)
                      if (type === 'rent') {
                        updateHousing(0, {
                          id: current?.id ?? createId('housing'),
                          label: '賃貸',
                          type: 'rent',
                          startYearOffset: 0,
                          endYearOffset: undefined,
                          monthlyRent: 100_000,
                          monthlyFees: 8_000,
                          extraAnnualCosts: 0,
                          moveInCost: 300_000,
                          moveOutCost: 150_000,
                        })
                      } else {
                        updateHousing(0, {
                          id: current?.id ?? createId('housing'),
                          label: '持ち家',
                          type: 'own',
                          startYearOffset: 0,
                          endYearOffset: undefined,
                          builtYear: 2012,
                          mortgageRemaining: 18_000_000,
                          monthlyMortgage: 85_000,
                          managementFeeMonthly: 15_000,
                          maintenanceReserveMonthly: 12_000,
                          extraAnnualCosts: 200_000,
                          purchaseCost: 0,
                          saleValue: 0,
                        })
                      }
                    }}
                  >
                    <option value="own">持ち家</option>
                    <option value="rent">賃貸</option>
                  </select>
                </label>
              </div>
              {(() => {
                const plan = (watchedValues.housingPlans?.[0] as HousingPlan | undefined) ?? (housingFields[0] as unknown as HousingPlan)
                if (!plan) return null
                if (plan.type === 'rent') {
                  return (
                    <div className="wizard-grid">
                      <label>
                        家賃（月額）
                        <Controller
                          control={control}
                          name={'housingPlans.0.monthlyRent' as const}
                          render={({ field }) => (
                            <YenInput
                              value={field.value ?? 0}
                              ariaLabel="家賃"
                              onChange={(next) => field.onChange(next)}
                              onBlur={() => field.onBlur()}
                            />
                          )}
                        />
                      </label>
                      <label>
                        管理費（月額）
                        <Controller
                          control={control}
                          name={'housingPlans.0.monthlyFees' as const}
                          render={({ field }) => (
                            <YenInput
                              value={field.value ?? 0}
                              ariaLabel="管理費"
                              onChange={(next) => field.onChange(next)}
                              onBlur={() => field.onBlur()}
                            />
                          )}
                        />
                      </label>
                      <label>
                        入居費用
                        <Controller
                          control={control}
                          name={'housingPlans.0.moveInCost' as const}
                          render={({ field }) => (
                            <YenInput
                              value={field.value ?? 0}
                              ariaLabel="入居費用"
                              onChange={(next) => field.onChange(next)}
                              onBlur={() => field.onBlur()}
                            />
                          )}
                        />
                      </label>
                      <label>
                        退去費用
                        <Controller
                          control={control}
                          name={'housingPlans.0.moveOutCost' as const}
                          render={({ field }) => (
                            <YenInput
                              value={field.value ?? 0}
                              ariaLabel="退去費用"
                              onChange={(next) => field.onChange(next)}
                              onBlur={() => field.onBlur()}
                            />
                          )}
                        />
                      </label>
                    </div>
                  )
                }
                return (
                  <div className="wizard-grid">
                    <label>
                      ローン残高
                      <Controller
                        control={control}
                        name={'housingPlans.0.mortgageRemaining' as const}
                        render={({ field }) => (
                          <YenInput
                            value={field.value ?? 0}
                            ariaLabel="ローン残高"
                            onChange={(next) => field.onChange(next)}
                            onBlur={() => field.onBlur()}
                          />
                        )}
                      />
                    </label>
                    <label>
                      ローン（月額）
                      <Controller
                        control={control}
                        name={'housingPlans.0.monthlyMortgage' as const}
                        render={({ field }) => (
                          <YenInput
                            value={field.value ?? 0}
                            ariaLabel="ローン（月額）"
                            onChange={(next) => field.onChange(next)}
                            onBlur={() => field.onBlur()}
                          />
                        )}
                      />
                    </label>
                    <label>
                      管理費（月額）
                      <Controller
                        control={control}
                        name={'housingPlans.0.managementFeeMonthly' as const}
                        render={({ field }) => (
                          <YenInput
                            value={field.value ?? 0}
                            ariaLabel="管理費（月額）"
                            onChange={(next) => field.onChange(next)}
                            onBlur={() => field.onBlur()}
                          />
                        )}
                      />
                    </label>
                    <label>
                      修繕積立（月額）
                      <Controller
                        control={control}
                        name={'housingPlans.0.maintenanceReserveMonthly' as const}
                        render={({ field }) => (
                          <YenInput
                            value={field.value ?? 0}
                            ariaLabel="修繕積立（月額）"
                            onChange={(next) => field.onChange(next)}
                            onBlur={() => field.onBlur()}
                          />
                        )}
                      />
                    </label>
                    <label className="wizard-span-2">
                      税・保険・修理など（年額）
                      <Controller
                        control={control}
                        name={'housingPlans.0.extraAnnualCosts' as const}
                        render={({ field }) => (
                          <YenInput
                            value={field.value ?? 0}
                            ariaLabel="税・保険・修理など（年額）"
                            onChange={(next) => field.onChange(next)}
                            onBlur={() => field.onBlur()}
                          />
                        )}
                      />
                    </label>
                  </div>
                )
              })()}
            </>
          ) : null}

          {step === 'vehicle' ? (
            <>
              <div className="wizard-row">
                <h3>車</h3>
                <div className="wizard-row__actions">
                  <button
                    type="button"
                    className="wizard-mini-btn"
                    onClick={() => {
                      ensureMinimumArrays()
                      setVehiclePresetOpen(true)
                    }}
                  >
                    プリセットから追加
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaults = estimateVehicleDefaults()
                      appendVehicle({
                        id: createId('vehicle'),
                        label: `車${vehicleFields.length + 1}`,
                        purchaseYear: scenario.startYear,
                        purchasePrice: 0,
                        disposalYear: undefined,
                        disposalValue: 0,
                        loanRemaining: 0,
                        monthlyLoan: 0,
                        ...defaults,
                      } satisfies VehicleProfile)
                    }}
                  >
                    + 車を追加
                  </button>
                </div>
              </div>
              <div className="wizard-list">
                {vehicleFields.map((field, idx) => {
                  const vehicle = (watchedValues.vehicles?.[idx] as VehicleProfile | undefined) ?? (field as unknown as VehicleProfile)
                  return (
                    <div key={field.fieldKey} className="wizard-mini-card">
                      <div className="wizard-mini-card__header">
                        <strong>{vehicle.label || `車 ${idx + 1}`}</strong>
                        <button
                          type="button"
                          className="wizard-mini-btn wizard-mini-btn--danger"
                          onClick={() => {
                            const ok = window.confirm('この車を削除しますか？')
                            if (!ok) return
                            removeVehicle(idx)
                          }}
                        >
                          削除
                        </button>
                      </div>
                      <div className="wizard-grid">
                        <label>
                          購入年
                          <input type="number" inputMode="numeric" {...register(`vehicles.${idx}.purchaseYear` as const, { valueAsNumber: true })} />
                        </label>
                        <label>
                          売却年
                          <input type="number" inputMode="numeric" {...register(`vehicles.${idx}.disposalYear` as const, { valueAsNumber: true })} />
                        </label>
                        <label>
                          購入額（一括）
                          <Controller
                            control={control}
                            name={`vehicles.${idx}.purchasePrice` as const}
                            render={({ field: yenField }) => (
                              <YenInput value={yenField.value ?? 0} ariaLabel="購入額" onChange={yenField.onChange} onBlur={yenField.onBlur} />
                            )}
                          />
                        </label>
                        <label>
                          売却額
                          <Controller
                            control={control}
                            name={`vehicles.${idx}.disposalValue` as const}
                            render={({ field: yenField }) => (
                              <YenInput value={yenField.value ?? 0} ariaLabel="売却額" onChange={yenField.onChange} onBlur={yenField.onBlur} />
                            )}
                          />
                        </label>
                        <label className="wizard-span-2">
                          維持費（年額）
                          <Controller
                            control={control}
                            name={`vehicles.${idx}.maintenanceAnnual` as const}
                            render={({ field: yenField }) => (
                              <YenInput value={yenField.value ?? 0} ariaLabel="維持費（年額）" onChange={yenField.onChange} onBlur={yenField.onBlur} />
                            )}
                          />
                        </label>
                        <label>
                          駐車場（月額）
                          <Controller
                            control={control}
                            name={`vehicles.${idx}.parkingMonthly` as const}
                            render={({ field: yenField }) => (
                              <YenInput value={yenField.value ?? 0} ariaLabel="駐車場（月額）" onChange={yenField.onChange} onBlur={yenField.onBlur} />
                            )}
                          />
                        </label>
                        <label>
                          保険（年額）
                          <Controller
                            control={control}
                            name={`vehicles.${idx}.insuranceAnnual` as const}
                            render={({ field: yenField }) => (
                              <YenInput value={yenField.value ?? 0} ariaLabel="保険（年額）" onChange={yenField.onChange} onBlur={yenField.onBlur} />
                            )}
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}

          {step === 'living' ? (
            <>
              <div className="wizard-row">
                <h3>生活費</h3>
                <div className="wizard-row__actions">
                  <button
                    type="button"
                    className="wizard-mini-btn"
                    onClick={() => {
                      ensureMinimumArrays()
                      setLivingPresetOpen(true)
                    }}
                  >
                    プリセットから入力
                  </button>
                </div>
              </div>
              <div className="wizard-grid">
                <label className="wizard-span-2">
                  生活費（月額・万円）
                  <Controller
                    control={control}
                    name={'livingPlans.0.baseAnnual' as const}
                    render={({ field }) => {
                      const monthlyMan = (field.value ?? 0) / 12 / 10_000
                      return (
                        <div className="wizard-unit-input">
                          <input
                            type="number"
                            step="0.5"
                            inputMode="decimal"
                            value={Number.isFinite(monthlyMan) ? monthlyMan : 0}
                            onChange={(e) => field.onChange(annualFromMonthlyManYen(Number(e.target.value)))}
                            onBlur={() => field.onBlur()}
                          />
                          <span className="wizard-unit" aria-hidden>
                            万円
                          </span>
                        </div>
                      )
                    }}
                  />
                  <span className="wizard-help">年額: {formatYen(Number((watchedValues.livingPlans?.[0] as LivingPlan | undefined)?.baseAnnual ?? 0))} 円</span>
                </label>
                <label>
                  物価上昇（年）
                  <input type="number" step="0.005" inputMode="decimal" {...register('livingPlans.0.inflationRate' as const, { valueAsNumber: true })} />
                </label>
              </div>
            </>
          ) : null}

          {step === 'savings' ? (
            <>
              <div className="wizard-row">
                <h3>貯蓄</h3>
                <div className="wizard-row__actions">
                  <button
                    type="button"
                    className="wizard-mini-btn"
                    onClick={() => {
                      ensureMinimumArrays()
                      setSavingsPresetOpen(true)
                    }}
                  >
                    プリセットから追加
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      appendSavings({
                        id: createId('savings'),
                        label: `口座${savingsFields.length + 1}`,
                        type: 'deposit',
                        role: 'goal_other',
                        contributionPolicy: 'fixed',
                        withdrawPolicy: 'normal',
                        minBalance: 0,
                        balance: 0,
                        annualContribution: 0,
                        annualInterestRate: 0.01,
                        adjustable: true,
                        withdrawPriority: 1,
                      } satisfies SavingsAccount)
                    }
                  >
                    + 口座を追加
                  </button>
                </div>
              </div>
              <div className="wizard-list">
                {savingsFields.map((field, idx) => {
                  const account = (watchedValues.savingsAccounts?.[idx] as SavingsAccount | undefined) ?? (field as unknown as SavingsAccount)
                  return (
                    <div key={field.fieldKey} className="wizard-mini-card">
                      <div className="wizard-mini-card__header">
                        <strong>{account.label || `口座 ${idx + 1}`}</strong>
                        <button
                          type="button"
                          className="wizard-mini-btn wizard-mini-btn--danger"
                          onClick={() => {
                            if (savingsFields.length <= 1) return
                            const ok = window.confirm('この口座を削除しますか？')
                            if (!ok) return
                            removeSavings(idx)
                          }}
                          disabled={savingsFields.length <= 1}
                        >
                          削除
                        </button>
                      </div>
                      <div className="wizard-grid">
                        <label>
                          役割
                          <select
                            {...register(`savingsAccounts.${idx}.role` as const)}
                            onChange={(e) => {
                              const nextRole = e.target.value as NonNullable<SavingsAccount['role']>
                              setValue(`savingsAccounts.${idx}.role` as const, nextRole, { shouldDirty: true, shouldTouch: true })
                            }}
                          >
                            <option value="emergency">生活防衛</option>
                            <option value="goal_education">教育資金</option>
                            <option value="goal_house">住宅資金</option>
                            <option value="goal_other">目的別</option>
                            <option value="long_term">長期投資</option>
                          </select>
                        </label>
                        <label className="wizard-span-2">
                          残高
                          <Controller
                            control={control}
                            name={`savingsAccounts.${idx}.balance` as const}
                            render={({ field: yenField }) => (
                              <YenInput value={yenField.value ?? 0} ariaLabel="残高" onChange={yenField.onChange} onBlur={yenField.onBlur} />
                            )}
                          />
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : null}

          {step === 'review' ? (
            <>
              <h3>確認</h3>
              {completion.basicDone && completion.residentsDone && completion.housingDone && completion.livingDone && completion.savingsDone ? (
                <div className="wizard-complete">
                  <strong>入力完了！</strong>
                  <span>次はシミュレーション結果を確認しましょう。</span>
                </div>
              ) : null}
              <div className="wizard-summary">
                <div>
                  <span>住人数</span>
                  <strong>{residentFields.length}人</strong>
                </div>
                <div>
                  <span>住宅</span>
                  <strong>{(watchedValues.housingPlans?.[0] as HousingPlan | undefined)?.type === 'rent' ? '賃貸' : '持ち家'}</strong>
                </div>
                <div>
                  <span>生活費（年額）</span>
                  <strong>{formatYen(Number((watchedValues.livingPlans?.[0] as LivingPlan | undefined)?.baseAnnual ?? 0))}円</strong>
                </div>
              </div>
              <div className="wizard-review-actions">
                <button
                  type="button"
                  className="wizard-nav__btn wizard-nav__btn--primary"
                  onClick={() => {
                    onClose?.()
                  }}
                >
                  結果を見る（閉じる）
                </button>
                <button
                  type="button"
                  className="wizard-nav__btn wizard-nav__btn--ghost"
                  onClick={() => {
                    onSwitchToDetail?.()
                  }}
                >
                  詳細で微調整
                </button>
              </div>
              <p className="wizard-help">※ 右上の「閉じる」でも結果に戻れます。</p>
            </>
          ) : null}
        </div>
      </div>

      <div className="wizard-nav">
        <div className="wizard-nav__left">
          {prevStep ? (
            <button type="button" className="wizard-nav__btn wizard-nav__btn--ghost" onClick={() => goStep(prevStep)}>
              戻る
            </button>
          ) : (
            <span />
          )}
        </div>
        <div className="wizard-nav__right">
          {nextStep ? (
            <button type="button" className="wizard-nav__btn wizard-nav__btn--primary" onClick={() => goStep(nextStep)}>
              次へ進む
            </button>
          ) : (
            <button
              type="button"
              className="wizard-nav__btn wizard-nav__btn--primary"
              onClick={() => {
                if (step === 'review') {
                  onClose?.()
                  return
                }
                goStep('basic')
              }}
            >
              {step === 'review' ? '結果を見る' : '先頭に戻る'}
            </button>
          )}
        </div>
      </div>

      <ResidentPresetDialog
        isOpen={residentPresetOpen}
        onClose={() => setResidentPresetOpen(false)}
        onApply={(presetResident) => {
          appendResident({
            ...presetResident,
            id: createId('resident'),
            jobs: presetResident.jobs?.map((job) => ({ ...job, id: createId('job') })),
            incomeEvents: (presetResident.incomeEvents ?? []).map((event) => ({ ...event, id: createId('event') })),
            expenseBands: (presetResident.expenseBands ?? []).map((band) => ({ ...band, id: createId('expense') })),
          })
          setResidentPresetOpen(false)
        }}
      />
      <HousingPresetDialog
        isOpen={housingPresetOpen}
        onClose={() => setHousingPresetOpen(false)}
        onApply={(plan) => {
          const nextPlans = [{ ...plan, id: createId('housing') } as HousingPlan]
          replaceHousing(nextPlans)
          setFormValue('housingPlans', nextPlans)
          setFormValue('housingPlans.0.type' as const, nextPlans[0]?.type)
          setFormValue('housingPlans.0.label' as const, nextPlans[0]?.label)
          setFormValue('housingPlans.0.startYearOffset' as const, nextPlans[0]?.startYearOffset ?? 0)
          setFormValue('housingPlans.0.endYearOffset' as const, nextPlans[0]?.endYearOffset)
          if (nextPlans[0]?.type === 'rent') {
            setFormValue('housingPlans.0.monthlyRent' as const, nextPlans[0].monthlyRent)
            setFormValue('housingPlans.0.monthlyFees' as const, nextPlans[0].monthlyFees ?? 0)
            setFormValue('housingPlans.0.extraAnnualCosts' as const, nextPlans[0].extraAnnualCosts ?? 0)
            setFormValue('housingPlans.0.moveInCost' as const, nextPlans[0].moveInCost ?? 0)
            setFormValue('housingPlans.0.moveOutCost' as const, nextPlans[0].moveOutCost ?? 0)
          } else if (nextPlans[0]?.type === 'own') {
            setFormValue('housingPlans.0.builtYear' as const, nextPlans[0].builtYear)
            setFormValue('housingPlans.0.mortgageRemaining' as const, nextPlans[0].mortgageRemaining)
            setFormValue('housingPlans.0.monthlyMortgage' as const, nextPlans[0].monthlyMortgage)
            setFormValue('housingPlans.0.managementFeeMonthly' as const, nextPlans[0].managementFeeMonthly)
            setFormValue('housingPlans.0.maintenanceReserveMonthly' as const, nextPlans[0].maintenanceReserveMonthly)
            setFormValue('housingPlans.0.extraAnnualCosts' as const, nextPlans[0].extraAnnualCosts ?? 0)
            setFormValue('housingPlans.0.purchaseCost' as const, nextPlans[0].purchaseCost ?? 0)
            setFormValue('housingPlans.0.saleValue' as const, nextPlans[0].saleValue ?? 0)
          }
          setHousingPresetOpen(false)
        }}
      />
      <VehiclePresetDialog
        isOpen={vehiclePresetOpen}
        onClose={() => setVehiclePresetOpen(false)}
        onApply={(profile) => {
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
          setVehiclePresetOpen(false)
        }}
      />
      <LivingPresetDialog
        isOpen={livingPresetOpen}
        onClose={() => setLivingPresetOpen(false)}
        onApply={(preset: LivingPreset) => {
          const nextPlans = [
            {
              id: createId('living'),
              label: '生活費',
              startYearOffset: 0,
              endYearOffset: undefined,
              baseAnnual: preset.monthly.base * 12,
              insuranceAnnual: (preset.monthly.insurance ?? 0) * 12,
              utilitiesAnnual: (preset.monthly.utilities ?? 0) * 12,
              discretionaryAnnual: (preset.monthly.discretionary ?? 0) * 12,
              healthcareAnnual: (preset.monthly.healthcare ?? 0) * 12,
              inflationRate: preset.inflationRate,
            },
          ]
          replaceLiving(nextPlans)
          setFormValue('livingPlans', nextPlans)
          setFormValue('livingPlans.0.baseAnnual' as const, nextPlans[0]?.baseAnnual ?? 0)
          setFormValue('livingPlans.0.insuranceAnnual' as const, nextPlans[0]?.insuranceAnnual ?? 0)
          setFormValue('livingPlans.0.utilitiesAnnual' as const, nextPlans[0]?.utilitiesAnnual ?? 0)
          setFormValue('livingPlans.0.discretionaryAnnual' as const, nextPlans[0]?.discretionaryAnnual ?? 0)
          setFormValue('livingPlans.0.healthcareAnnual' as const, nextPlans[0]?.healthcareAnnual ?? 0)
          setFormValue('livingPlans.0.inflationRate' as const, nextPlans[0]?.inflationRate)
          setLivingPresetOpen(false)
        }}
      />
      <SavingsPresetDialog
        isOpen={savingsPresetOpen}
        onClose={() => setSavingsPresetOpen(false)}
        onApply={(account) => {
          appendSavings({ ...account, id: createId('savings') })
          setSavingsPresetOpen(false)
        }}
      />
    </section>
  )
}

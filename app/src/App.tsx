import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { ScenarioList } from '@components/ScenarioList'
import { ScenarioForm } from '@components/ScenarioForm'
import { ScenarioResultsTabs } from '@components/ScenarioResultsTabs'
import { useBuildInfo } from '@hooks/useBuildInfo'
import { WizardEditor } from '@components/WizardEditor'
import { LandingPreview } from '@components/LandingPreview'
import { IconCalendar, IconChart, IconCheck, IconClock, IconSettings, IconShield, IconSparkles, IconUpload, IconWallet } from '@components/icons'
import { simulateScenario } from '@simulation/engine'
import { createId } from '@utils/id'
import type { Scenario } from '@models/scenario'
import type { LivingCostProfile, SavingsAccount, VehicleProfile, HousingPlan } from '@models/finance'
import type { Resident } from '@models/resident'
import { useScenarioStore } from '@store/scenarioStore'
import { readScenarioFile } from '@utils/persistence'
import { AppActionsProvider, type EditorMode, type EditorTab } from '@utils/appActionsContext'

const ONBOARDING_DISMISSED_KEY = 'lifePlan.onboarding.dismissed.v1'
const LANDING_SKIPPED_KEY = 'lifePlan.landing.skipped.v1'

const hasSnapshotParam = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  if (hashParams.get('s') || hashParams.get('snapshot')) {
    return true
  }
  const params = new URLSearchParams(window.location.search)
  return Boolean(params.get('s') || params.get('snapshot'))
}

type AppScreen = 'landing' | 'main'

const readLandingSkipped = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.localStorage.getItem(LANDING_SKIPPED_KEY) === 'true'
  } catch {
    return false
  }
}

const useBodyScrollLock = (locked: boolean) => {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }
    if (!locked) {
      return
    }

    const scrollY = window.scrollY
    const body = document.body
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.left = previous.left
      body.style.right = previous.right
      body.style.width = previous.width
      body.style.overflow = previous.overflow
      window.scrollTo(0, scrollY)
    }
  }, [locked])
}

type LandingScreenProps = {
  onOpenWizard: () => void
  onOpenImport: () => void
  onOpenAi: () => void
  onShowMainResults: () => void
  onSkipLanding: () => void
  onDismissOnboarding: () => void
}

const LandingScreen = ({
  onOpenWizard,
  onOpenImport,
  onOpenAi,
  onShowMainResults,
  onSkipLanding,
  onDismissOnboarding,
}: LandingScreenProps) => {
  const [lpStage, setLpStage] = useState<'hero' | 'quiz' | 'done' | 'teaser' | 'details'>('hero')
  const [trustExpanded, setTrustExpanded] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<{
    ageBand?: '20s' | '30s' | '40s' | '50s' | '60plus'
    household?: 'single' | 'couple' | 'family'
    employmentSelf?: 'full_time' | 'part_time'
    employmentHusband?: 'full_time' | 'part_time'
    employmentWife?: 'full_time' | 'part_time'
    childCount?: '1' | '2' | '3plus'
    educationTrack?: 'private_from_univ' | 'private_from_high' | 'private_from_junior' | 'private_from_elem' | 'work_after_high'
    housing?: 'rent' | 'own' | 'buy'
    homeCondition?: 'new' | 'used'
    homeType?: 'detached' | 'condo'
    carCount?: 'none' | 'one' | 'two_plus'
    carCycleYears?: '5' | '7' | '10'
    carCondition?: 'new' | 'used'
    carGrade?: 'compact' | 'standard' | 'minivan'
    savingsFeel?: 'none' | 'some' | 'plenty' | 'unknown'
    recreationFeel?: 'low' | 'normal' | 'high'
    incomeFeel?: 'low' | 'normal' | 'high'
  }>({})
  const [quizStep, setQuizStep] = useState(0)
  const [lpScenarioId, setLpScenarioId] = useState<string | null>(null)
  const [doneSecondsLeft, setDoneSecondsLeft] = useState(0)

  const appendScenarios = useScenarioStore((state) => state.appendScenarios)
  const selectScenario = useScenarioStore((state) => state.selectScenario)
  const projections = useScenarioStore((state) => state.projections)

  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [importStatus, setImportStatus] = useState('')

  const lpProjection = lpScenarioId ? projections.find((p) => p.scenarioId === lpScenarioId) ?? null : null

  type QuizStepId =
    | 'ageBand'
    | 'household'
    | 'employmentSelf'
    | 'employmentHusband'
    | 'employmentWife'
    | 'childCount'
    | 'educationTrack'
    | 'housing'
    | 'homeCondition'
    | 'homeType'
    | 'carCount'
    | 'carCycleYears'
    | 'carCondition'
    | 'carGrade'
    | 'savingsFeel'
    | 'recreationFeel'
    | 'incomeFeel'

  type QuizStep = { id: QuizStepId; title: string; required: boolean }

  const getQuizSteps = (answers: typeof quizAnswers): QuizStep[] => {
    const firstEmploymentStepId: QuizStepId = answers.household === 'single' ? 'employmentSelf' : 'employmentHusband'
    const steps: QuizStep[] = []
    steps.push({ id: 'ageBand', title: '年代を選んでください', required: true })
    steps.push({ id: 'household', title: '世帯を選んでください', required: true })
    steps.push({ id: firstEmploymentStepId, title: '就業はどれですか？', required: true })
    if (answers.household !== 'single') {
      steps.push({ id: 'employmentWife', title: '（もう一人）就業はどれですか？', required: true })
    }
    if (answers.household === 'family') {
      steps.push({ id: 'childCount', title: '子供は何人ですか？', required: true })
      steps.push({ id: 'educationTrack', title: '教育はどこから私立のイメージですか？', required: true })
    }
    steps.push({ id: 'housing', title: '住居はどれですか？', required: true })
    if (answers.housing === 'own') {
      steps.push({ id: 'homeCondition', title: '持ち家は新築/中古どちらですか？', required: true })
      steps.push({ id: 'homeType', title: '持ち家は戸建て/マンションどちらですか？', required: true })
    }
    steps.push({ id: 'carCount', title: '車は何台ですか？', required: true })
    if (answers.carCount && answers.carCount !== 'none') {
      steps.push({ id: 'carCycleYears', title: '買い替え周期は？', required: true })
      steps.push({ id: 'carCondition', title: '新車/中古はどちらですか？', required: true })
      steps.push({ id: 'carGrade', title: 'グレード（ざっくり）', required: true })
    }
    steps.push({ id: 'savingsFeel', title: '貯蓄のいまの感覚は？', required: true })
    steps.push({ id: 'recreationFeel', title: 'レクリエーション（余暇/趣味）は？', required: true })
    steps.push({ id: 'incomeFeel', title: '収入感はどれですか？（任意）', required: false })
    return steps
  }

  const quizSteps = getQuizSteps(quizAnswers)

  const totalSteps = quizSteps.length
  const currentStep = quizSteps[Math.min(quizStep, totalSteps - 1)]

  const buildScenarioFromQuiz = (answers: typeof quizAnswers): Scenario => {
    const nowYear = new Date().getFullYear()
    const ageBand = answers.ageBand ?? '30s'
    const household = answers.household ?? 'couple'
    const housing = answers.housing ?? 'rent'
    const carCount = answers.carCount ?? 'none'
    const carCycleYears = Number(answers.carCycleYears ?? '7')
    const carCondition = answers.carCondition ?? 'used'
    const carGrade = answers.carGrade ?? 'compact'
    const savingsFeel = answers.savingsFeel ?? 'some'
    const recreationFeel = answers.recreationFeel ?? 'normal'
    const incomeFeel = answers.incomeFeel ?? 'normal'
    const childCount = answers.childCount ?? '1'
    const educationTrack = answers.educationTrack ?? 'private_from_high'
    const homeCondition = answers.homeCondition ?? 'used'
    const homeType = answers.homeType ?? 'detached'

    const scenarioName = (() => {
      const ageLabel =
        ageBand === '20s' ? '20代' : ageBand === '40s' ? '40代' : ageBand === '50s' ? '50代' : ageBand === '60plus' ? '60代以上' : '30代'
      const householdLabel = household === 'single' ? '単身' : household === 'family' ? '子あり' : '夫婦'
      const housingLabel = housing === 'rent' ? '賃貸' : housing === 'buy' ? '購入予定' : '持ち家'
      const carsLabel =
        carCount === 'none'
          ? '車なし'
          : `${carCount === 'two_plus' ? '車2台+' : '車1台'} ${carCondition === 'new' ? '新車' : '中古'} ${carGrade === 'minivan' ? 'ミニバン' : carGrade === 'standard' ? 'ミドル' : 'コンパクト'}`
      const savingsLabel = savingsFeel === 'none' ? '貯蓄少なめ' : savingsFeel === 'plenty' ? '貯蓄多め' : savingsFeel === 'unknown' ? '貯蓄不明' : '貯蓄ふつう'
      const kidsLabel =
        household === 'family'
          ? childCount === '3plus'
            ? '子3+'
            : `子${childCount}`
          : null
      const educationLabel =
        household === 'family'
          ? educationTrack === 'work_after_high'
            ? '高卒就職'
            : educationTrack === 'private_from_elem'
              ? '小〜私立'
              : educationTrack === 'private_from_junior'
                ? '中〜私立'
                : educationTrack === 'private_from_high'
                  ? '高〜私立'
                  : '大〜私立'
          : null
      const housingDetailLabel =
        housing === 'own' ? `${homeCondition === 'new' ? '新築' : '中古'}${homeType === 'condo' ? 'マンション' : '戸建'}` : null
      const recreationLabel = recreationFeel === 'low' ? '趣味控えめ' : recreationFeel === 'high' ? '趣味多め' : null
      return [
        `${ageLabel} ${householdLabel}`,
        kidsLabel,
        educationLabel,
        housingDetailLabel ? `/${housingLabel}(${housingDetailLabel})` : `/${housingLabel}`,
        `/${carsLabel}`,
        `/${savingsLabel}`,
        recreationLabel ? `/${recreationLabel}` : null,
      ]
        .filter(Boolean)
        .join(' ')
    })()

    const adultAge = (() => {
      switch (ageBand) {
        case '20s':
          return 27
        case '40s':
          return 45
        case '50s':
          return 55
        case '60plus':
          return 62
        default:
          return 35
      }
    })()

    const childAge = (() => {
      switch (ageBand) {
        case '20s':
          return 3
        case '40s':
          return 10
        case '50s':
          return 16
        case '60plus':
          return 18
        default:
          return 6
      }
    })()

    const vehicleOwnershipEndYear = nowYear + Math.max(0, 85 - adultAge)

    const recreationMultiplier = recreationFeel === 'low' ? 0.8 : recreationFeel === 'high' ? 1.35 : 1

    const livingMonthlyBase = incomeFeel === 'low' ? 180_000 : incomeFeel === 'high' ? 300_000 : 230_000
    const livingMonthlyInsurance = incomeFeel === 'low' ? 25_000 : incomeFeel === 'high' ? 50_000 : 35_000
    const livingMonthlyUtilities = incomeFeel === 'low' ? 25_000 : incomeFeel === 'high' ? 45_000 : 35_000
    const livingMonthlyDiscretionary = Math.round(
      (incomeFeel === 'low' ? 15_000 : incomeFeel === 'high' ? 50_000 : 25_000) * recreationMultiplier,
    )
    const livingMonthlyHealthcare = incomeFeel === 'low' ? 10_000 : incomeFeel === 'high' ? 25_000 : 15_000
    const inflationRate = incomeFeel === 'high' ? 0.015 : incomeFeel === 'low' ? 0.01 : 0.012

    const living: LivingCostProfile = {
      baseAnnual: livingMonthlyBase * 12,
      insuranceAnnual: livingMonthlyInsurance * 12,
      utilitiesAnnual: livingMonthlyUtilities * 12,
      discretionaryAnnual: livingMonthlyDiscretionary * 12,
      healthcareAnnual: livingMonthlyHealthcare * 12,
      inflationRate,
    }

    const employmentIncomeMultiplier = (employment: typeof answers.employmentSelf) =>
      employment === 'part_time' ? 0.6 : 1
    const employmentGrowthAdjust = (employment: typeof answers.employmentSelf) => (employment === 'part_time' ? -0.01 : 0)

    const baseAdult = (name: string, baseNetIncome: number, annualIncomeGrowthRate: number, employment: typeof answers.employmentSelf): Resident => ({
      id: createId('resident'),
      name,
      currentAge: adultAge,
      retirementAge: 65,
      baseNetIncome: Math.round(baseNetIncome * employmentIncomeMultiplier(employment)),
      annualIncomeGrowthRate: annualIncomeGrowthRate + employmentGrowthAdjust(employment),
      dependents: 0,
      incomeEvents: [
        {
          id: createId('event'),
          label: '退職金',
          type: 'bonus',
          amount: Math.round(baseNetIncome * employmentIncomeMultiplier(employment) * 2.5),
          triggerAge: Math.max(60, adultAge),
        },
      ],
      expenseBands: [],
    })

    const residents: Resident[] = (() => {
      const selfEmployment = answers.employmentSelf ?? 'full_time'
      const husbandEmployment = answers.employmentHusband ?? 'full_time'
      const wifeEmployment = answers.employmentWife ?? 'full_time'

      if (household === 'single') {
        return [
          baseAdult(
            '本人',
            incomeFeel === 'high' ? 7_000_000 : incomeFeel === 'low' ? 3_800_000 : 5_500_000,
            0.02,
            selfEmployment,
          ),
        ]
      }
      if (household === 'family') {
        const husband = baseAdult(
          '夫',
          incomeFeel === 'high' ? 7_200_000 : incomeFeel === 'low' ? 4_800_000 : 6_000_000,
          0.025,
          husbandEmployment,
        )
        const wife = baseAdult(
          '妻',
          incomeFeel === 'high' ? 6_200_000 : incomeFeel === 'low' ? 4_000_000 : 5_200_000,
          0.02,
          wifeEmployment,
        )

        const kidCountNumber = childCount === '3plus' ? 3 : Number(childCount)
        const children: Resident[] = Array.from({ length: Math.max(1, kidCountNumber) }, (_, index) => {
          const age = Math.max(0, childAge - index * 2)
          return {
            id: createId('resident'),
            name: kidCountNumber > 1 ? `子${index + 1}` : '子',
            currentAge: age,
            retirementAge: 65,
            baseNetIncome: 0,
            annualIncomeGrowthRate: 0,
            dependents: 0,
            incomeEvents: [],
            expenseBands: [],
          }
        })

        const stageBands = [
          { key: 'elem', label: '小学校', startAge: 6, endAge: 12, publicAnnual: 300_000, privateAnnual: 900_000 },
          { key: 'junior', label: '中学校', startAge: 12, endAge: 15, publicAnnual: 400_000, privateAnnual: 1_000_000 },
          { key: 'high', label: '高校', startAge: 15, endAge: 18, publicAnnual: 450_000, privateAnnual: 1_050_000 },
          { key: 'univ', label: '大学', startAge: 18, endAge: 22, publicAnnual: 800_000, privateAnnual: 1_500_000 },
        ] as const

        const isPrivateStage = (stageKey: (typeof stageBands)[number]['key']) => {
          switch (educationTrack) {
            case 'private_from_elem':
              return true
            case 'private_from_junior':
              return stageKey !== 'elem'
            case 'private_from_high':
              return stageKey === 'high' || stageKey === 'univ'
            case 'private_from_univ':
              return stageKey === 'univ'
            case 'work_after_high':
              return false
          }
        }

        const shouldIncludeStage = (stageKey: (typeof stageBands)[number]['key']) => {
          if (educationTrack !== 'work_after_high') return true
          return stageKey !== 'univ'
        }

        children.forEach((child) => {
          stageBands.forEach((stage) => {
            if (!shouldIncludeStage(stage.key)) return
            const startAge = Math.max(stage.startAge, child.currentAge)
            if (startAge >= stage.endAge) return
            const isPrivate = isPrivateStage(stage.key)
            child.expenseBands.push({
              id: createId('expense'),
              label: `教育（${stage.label}${isPrivate ? '私立' : '公立'}）`,
              category: 'education',
              startAge,
              endAge: stage.endAge,
              annualAmount: isPrivate ? stage.privateAnnual : stage.publicAnnual,
            })
          })
        })

        return [husband, wife, ...children]
      }
      return [
        baseAdult(
          '夫',
          incomeFeel === 'high' ? 7_200_000 : incomeFeel === 'low' ? 4_800_000 : 6_000_000,
          0.025,
          husbandEmployment,
        ),
        baseAdult(
          '妻',
          incomeFeel === 'high' ? 6_200_000 : incomeFeel === 'low' ? 4_000_000 : 5_200_000,
          0.02,
          wifeEmployment,
        ),
      ]
    })()

    const housingPlans: HousingPlan[] = (() => {
      if (housing === 'rent') {
        return [
          {
            id: createId('housing'),
            label: '賃貸',
            type: 'rent',
            startYearOffset: 0,
            monthlyRent: household === 'single' ? 95_000 : 110_000,
            monthlyFees: 6_000,
            extraAnnualCosts: 0,
            moveInCost: 0,
            moveOutCost: 0,
          },
        ]
      }
      if (housing === 'buy') {
        return [
          {
            id: createId('housing'),
            label: '賃貸（当面）',
            type: 'rent',
            startYearOffset: 0,
            endYearOffset: 4,
            monthlyRent: household === 'single' ? 90_000 : 110_000,
            monthlyFees: 6_000,
            extraAnnualCosts: 0,
            moveInCost: 0,
            moveOutCost: 0,
          },
          {
            id: createId('housing'),
            label: '購入（概算）',
            type: 'own',
            startYearOffset: 5,
            builtYear: 0,
            mortgageRemaining: household === 'single' ? 28_000_000 : 42_000_000,
            monthlyMortgage: household === 'single' ? 92_000 : 115_000,
            managementFeeMonthly: household === 'single' ? 12_000 : 15_000,
            maintenanceReserveMonthly: household === 'single' ? 9_000 : 12_000,
            extraAnnualCosts: 180_000,
            purchaseCost: 0,
            saleValue: 0,
          },
        ]
      }
      return [
        {
          id: createId('housing'),
          label: '持ち家',
          type: 'own',
          startYearOffset: 0,
          builtYear: homeCondition === 'new' ? nowYear : nowYear - 20,
          mortgageRemaining: Math.round((household === 'single' ? 18_000_000 : 22_000_000) * (homeCondition === 'new' ? 1.25 : 0.85)),
          monthlyMortgage: Math.round((household === 'single' ? 82_000 : 92_000) * (homeCondition === 'new' ? 1.2 : 0.9)),
          managementFeeMonthly: homeType === 'condo' ? (household === 'single' ? 13_000 : 16_000) : 0,
          maintenanceReserveMonthly: homeType === 'condo' ? (household === 'single' ? 11_000 : 14_000) : 6_000,
          extraAnnualCosts: homeType === 'condo' ? 90_000 : homeCondition === 'new' ? 120_000 : 160_000,
          purchaseCost: 0,
          saleValue: 0,
        },
      ]
    })()

    const savingsAccounts: SavingsAccount[] = (() => {
      const savingsMultiplier = savingsFeel === 'none' ? 0.25 : savingsFeel === 'plenty' ? 3 : 1
      const contributionMultiplier = savingsFeel === 'none' ? 0.25 : savingsFeel === 'plenty' ? 1.7 : 1

      const emergency: SavingsAccount = {
        id: createId('savings'),
        label: '普通預金',
        type: 'deposit',
        role: 'emergency',
        contributionPolicy: 'fixed',
        withdrawPolicy: 'normal',
        minBalance: household === 'single' ? 1_000_000 : 1_500_000,
        balance: Math.round((household === 'single' ? 1_000_000 : 1_500_000) * savingsMultiplier),
        annualContribution: Math.round((household === 'single' ? 240_000 : 300_000) * contributionMultiplier),
        annualInterestRate: 0.001,
        adjustable: true,
        withdrawPriority: 0,
      }
      const invest: SavingsAccount = {
        id: createId('savings'),
        label: '積立NISA',
        type: 'investment',
        role: 'long_term',
        contributionPolicy: 'fixed',
        withdrawPolicy: 'last_resort',
        balance: Math.round((household === 'single' ? 300_000 : 500_000) * savingsMultiplier),
        annualContribution: Math.round(
          (incomeFeel === 'high' ? 1_200_000 : incomeFeel === 'low' ? 500_000 : 800_000) * contributionMultiplier,
        ),
        annualInterestRate: 0.05,
        adjustable: false,
        withdrawPriority: 2,
      }
      const accounts = [emergency, invest]
      if (household === 'family') {
        accounts.push({
          id: createId('savings'),
          label: '教育資金ファンド',
          type: 'investment',
          role: 'goal_education',
          contributionPolicy: 'fixed',
          withdrawPolicy: 'normal',
          balance: 1_000_000,
          annualContribution: 600_000,
          annualInterestRate: 0.035,
          adjustable: true,
          withdrawPriority: 1,
        })
      }
      return accounts
    })()

    const vehicles: VehicleProfile[] = (() => {
      if (carCount === 'none') return []

      const gradeSpec = (() => {
        switch (carGrade) {
          case 'minivan':
            return { label: 'ミニバン', newPrice: 3_800_000, maintenanceAnnual: 95_000, insuranceAnnual: 85_000 }
          case 'standard':
            return { label: 'ミドル', newPrice: 2_800_000, maintenanceAnnual: 85_000, insuranceAnnual: 78_000 }
          default:
            return { label: 'コンパクト', newPrice: 2_000_000, maintenanceAnnual: 75_000, insuranceAnnual: 70_000 }
        }
      })()

      const price = Math.round(gradeSpec.newPrice * (carCondition === 'new' ? 1 : 0.65))
      const disposalRate = carCondition === 'new' ? 0.35 : 0.25

      const buildOneVehicle = (labelPrefix: string, purchaseYear: number, disposalYear: number): VehicleProfile => ({
        id: createId('vehicle'),
        label: `${labelPrefix}${gradeSpec.label}${carCondition === 'new' ? '（新車）' : '（中古）'}`,
        purchaseYear,
        purchasePrice: price,
        disposalYear,
        disposalValue: Math.round(price * disposalRate),
        loanRemaining: 0,
        monthlyLoan: 0,
        inspectionCycleYears: 2,
        inspectionCost: 110_000,
        maintenanceAnnual: gradeSpec.maintenanceAnnual,
        parkingMonthly: 15_000,
        insuranceAnnual: gradeSpec.insuranceAnnual,
      })

      const buildVehicleSequence = (labelPrefix: string): VehicleProfile[] => {
        const list: VehicleProfile[] = []
        let purchaseYear = nowYear - 1
        while (purchaseYear < vehicleOwnershipEndYear) {
          const disposalYear = Math.min(purchaseYear + carCycleYears, vehicleOwnershipEndYear)
          const entry = buildOneVehicle(labelPrefix, purchaseYear, disposalYear)
          list.push(entry)
          if (disposalYear <= purchaseYear) break
          purchaseYear = disposalYear
        }
        return list
      }

      const count = carCount === 'two_plus' ? 2 : 1
      const list: VehicleProfile[] = []
      for (let i = 0; i < count; i += 1) {
        const prefix = count > 1 ? `車${i + 1}: ` : ''
        list.push(...buildVehicleSequence(prefix))
      }
      return list
    })()

    return {
      id: createId('scenario'),
      name: scenarioName,
      description: '質問に答えて作成した概算プラン（あとから修正できます）',
      startYear: nowYear,
      residents,
      housingPlans,
      vehicles,
      living,
      livingPlans: [
        {
          id: createId('living'),
          label: '生活費',
          startYearOffset: 0,
          endYearOffset: undefined,
          ...living,
        },
      ],
      savingsAccounts,
      expenseBands: [],
      customIncomeEvents: [],
      initialCash:
        savingsFeel === 'none' ? (household === 'single' ? 150_000 : 300_000) : household === 'single' ? 400_000 : 800_000,
      currency: 'JPY',
    }
  }

  const computeRisk = (projection: ReturnType<typeof simulateScenario>) => {
    if (!projection.yearly.length) {
      return { level: '低' as const, firstNegativeYear: null as number | null }
    }
    const first = projection.summary.firstNegativeYear
    if (!first) {
      return { level: '低' as const, firstNegativeYear: null as number | null }
    }
    const minWorth = Math.min(...projection.yearly.map((y) => y.netWorth))
    if (minWorth < -5_000_000) {
      return { level: '高' as const, firstNegativeYear: first }
    }
    const idx = projection.yearly.findIndex((y) => y.year === first)
    if (idx >= 0 && idx <= 10) return { level: '高' as const, firstNegativeYear: first }
    if (idx >= 0 && idx <= 20) return { level: '中' as const, firstNegativeYear: first }
    return { level: '中' as const, firstNegativeYear: first }
  }

  const [teaser, setTeaser] = useState<{ level: '低' | '中' | '高'; firstNegativeYear: number | null } | null>(null)

  const startQuiz = () => {
    onDismissOnboarding()
    setLpStage('quiz')
    setQuizStep(0)
  }

  const applyQuizWithAnswers = (answers: typeof quizAnswers) => {
    const scenario = buildScenarioFromQuiz(answers)
    const projection = simulateScenario(scenario)
    setTeaser(computeRisk(projection))
    setLpScenarioId(scenario.id)
    appendScenarios([scenario])
    selectScenario(scenario.id)
    setLpStage('done')
  }

  useEffect(() => {
    if (lpStage !== 'done') return
    setDoneSecondsLeft(3)
    const intervalId = window.setInterval(() => {
      setDoneSecondsLeft((prev) => Math.max(0, prev - 1))
    }, 1000)
    const timeoutId = window.setTimeout(() => {
      window.clearInterval(intervalId)
      onShowMainResults()
    }, 3000)
    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [lpStage, onShowMainResults])

	  return (
	    <section className="landing" aria-label="開始画面">
	      <div className="landing__panel">
	        {lpStage === 'hero' ? (
	          <div className="lp-skip-row">
	            <button type="button" className="lp-skip" onClick={onSkipLanding}>
	              スキップ（前回の結果を見る）
	            </button>
	          </div>
	        ) : null}
		        <header className="lp-hero">
		          <h1>もし来年から家計が苦しくなるなら、いつ気づきたいですか？</h1>
		          <p className="lp-hero__subtitle">
		            よくある質問に答えるだけで、「赤字のはじまり」と理由のあたりがつかめます。
	          </p>
	          <ul className="lp-hero__assurance" aria-label="安心ポイント">
	            <li>
	              <span className="lp-hero__assurance-icon" aria-hidden>
	                <IconShield />
	              </span>
	              会員登録なし
	            </li>
	            <li>
	              <span className="lp-hero__assurance-icon" aria-hidden>
	                <IconCheck />
	              </span>
	              だいたいでOK
	            </li>
	            <li>
	              <span className="lp-hero__assurance-icon" aria-hidden>
	                <IconWallet />
	              </span>
	              端末に保存
	            </li>
	            <li>
	              <span className="lp-hero__assurance-icon" aria-hidden>
	                <IconSettings />
	              </span>
	              あとで修正可
	            </li>
	          </ul>
	        </header>

	        <section className="lp-quiz" aria-label="かんたん診断" data-stage={lpStage}>
	          <header className="lp-quiz__header">
	            <h2>かんたん診断</h2>
	            {lpStage === 'hero' ? null : (
	              <span className="lp-quiz__progress">
	                あと約3分 / {Math.min(quizStep + 1, totalSteps)}/{totalSteps}
	              </span>
	            )}
	          </header>

	          {lpStage === 'hero' ? (
	            <>
	              <p className="lp-quiz__hint">世帯・住まい・車など、イメージしやすいところから選びます。</p>
	              <p className="lp-quiz__catch">
	                <span className="lp-quiz__catch-icon" aria-hidden>
	                  <IconClock />
	                </span>
	                最初は「赤字の年」だけ。重い数字はあとから見られます。
	              </p>
	              <div className="lp-hero__cta lp-quiz__cta">
	                <button type="button" className="lp-hero__cta-btn" onClick={startQuiz}>
	                  今すぐ試す
	                </button>
	                <span className="lp-hero__cta-note">約3分 / 全{totalSteps}問</span>
	              </div>
	              <ul className="lp-quiz__steps" aria-label="このあと">
	                <li>
	                  <span className="lp-quiz__step-icon" aria-hidden>
	                    <IconCheck />
	                  </span>
	                  選ぶだけで概算
	                </li>
	                <li>
	                  <span className="lp-quiz__step-icon" aria-hidden>
	                    <IconCalendar />
	                  </span>
	                  赤字の年を確認
	                </li>
	                <li>
	                  <span className="lp-quiz__step-icon" aria-hidden>
	                    <IconChart />
	                  </span>
	                  内訳で原因を見る
	                </li>
	              </ul>
	            </>
	          ) : lpStage === 'done' ? (
	            <div className="lp-done" role="status" aria-live="polite">
	              <h3>入力完了🎉</h3>
	              <p>{doneSecondsLeft || 3}秒後に結果画面へ移動します…</p>
	              <div className="lp-done__progress" aria-label="移動までの進捗">
	                <div className="lp-done__progress-bar" />
	              </div>
	              <div className="lp-done__actions">
	                <button type="button" className="lp-nav-btn lp-nav-btn--primary" onClick={onShowMainResults}>
	                  今すぐ結果を見る
	                </button>
	              </div>
	            </div>
	          ) : currentStep ? (
	            <div className="lp-quiz__card">
	              <h3>{currentStep.title}</h3>

              {currentStep.id === 'ageBand' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: '20s', label: '20代' },
                    { value: '30s', label: '30代' },
                    { value: '40s', label: '40代' },
                    { value: '50s', label: '50代' },
                    { value: '60plus', label: '60代以上' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.ageBand === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, ageBand: opt.value as typeof quizAnswers.ageBand }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'household' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'single', label: '単身' },
                    { value: 'couple', label: '夫婦' },
                    { value: 'family', label: '子あり' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.household === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, household: opt.value as typeof quizAnswers.household }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'employmentSelf' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'full_time', label: '正社員' },
                    { value: 'part_time', label: 'パート・バイト' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={[
                        'lp-choice',
                        quizAnswers.employmentSelf === opt.value ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, employmentSelf: opt.value as typeof quizAnswers.employmentSelf }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'employmentHusband' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'full_time', label: '夫: 正社員' },
                    { value: 'part_time', label: '夫: パート・バイト' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={[
                        'lp-choice',
                        quizAnswers.employmentHusband === opt.value ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, employmentHusband: opt.value as typeof quizAnswers.employmentHusband }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'employmentWife' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'full_time', label: '妻: 正社員' },
                    { value: 'part_time', label: '妻: パート・バイト' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.employmentWife === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, employmentWife: opt.value as typeof quizAnswers.employmentWife }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'childCount' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: '1', label: '1人' },
                    { value: '2', label: '2人' },
                    { value: '3plus', label: '3人以上' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.childCount === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, childCount: opt.value as typeof quizAnswers.childCount }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'educationTrack' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'private_from_univ', label: '大学から私立' },
                    { value: 'private_from_high', label: '高校から私立' },
                    { value: 'private_from_junior', label: '中学から私立' },
                    { value: 'private_from_elem', label: '小学校から私立' },
                    { value: 'work_after_high', label: '高卒で働く' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.educationTrack === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, educationTrack: opt.value as typeof quizAnswers.educationTrack }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'housing' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'rent', label: '賃貸' },
                    { value: 'own', label: '持ち家' },
                    { value: 'buy', label: 'これから購入したい' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.housing === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, housing: opt.value as typeof quizAnswers.housing }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'homeCondition' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'new', label: '新築' },
                    { value: 'used', label: '中古' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.homeCondition === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, homeCondition: opt.value as typeof quizAnswers.homeCondition }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'homeType' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'detached', label: '戸建て' },
                    { value: 'condo', label: 'マンション' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.homeType === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, homeType: opt.value as typeof quizAnswers.homeType }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'carCount' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'none', label: 'なし' },
                    { value: 'one', label: '1台' },
                    { value: 'two_plus', label: '2台以上' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.carCount === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, carCount: opt.value as typeof quizAnswers.carCount }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'carCycleYears' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: '5', label: '5年' },
                    { value: '7', label: '7年' },
                    { value: '10', label: '10年' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.carCycleYears === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, carCycleYears: opt.value as typeof quizAnswers.carCycleYears }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'carCondition' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'new', label: '新車' },
                    { value: 'used', label: '中古' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.carCondition === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, carCondition: opt.value as typeof quizAnswers.carCondition }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'carGrade' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'compact', label: 'コンパクト' },
                    { value: 'standard', label: 'ミドル' },
                    { value: 'minivan', label: 'ミニバン/SUV' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.carGrade === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, carGrade: opt.value as typeof quizAnswers.carGrade }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'savingsFeel' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'none', label: 'ほぼない' },
                    { value: 'some', label: 'ある程度ある' },
                    { value: 'plenty', label: '余裕がある' },
                    { value: 'unknown', label: 'わからない' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.savingsFeel === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, savingsFeel: opt.value as typeof quizAnswers.savingsFeel }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'recreationFeel' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'low', label: '控えめ' },
                    { value: 'normal', label: 'ふつう' },
                    { value: 'high', label: '多め' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.recreationFeel === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, recreationFeel: opt.value as typeof quizAnswers.recreationFeel }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {currentStep.id === 'incomeFeel' ? (
                <div className="lp-quiz__choices">
                  {[
                    { value: 'low', label: '低め' },
                    { value: 'normal', label: 'ふつう' },
                    { value: 'high', label: '高め' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={['lp-choice', quizAnswers.incomeFeel === opt.value ? 'is-selected' : ''].filter(Boolean).join(' ')}
                      onClick={() => {
                        const nextAnswers = { ...quizAnswers, incomeFeel: opt.value as typeof quizAnswers.incomeFeel }
                        const nextSteps = getQuizSteps(nextAnswers)
                        setQuizAnswers(nextAnswers)
                        if (quizStep >= nextSteps.length - 1) {
                          applyQuizWithAnswers(nextAnswers)
                          return
                        }
                        setQuizStep((prev) => Math.min(nextSteps.length - 1, prev + 1))
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="lp-quiz__nav">
                <button
                  type="button"
                  className="lp-nav-btn"
	                  onClick={() => setQuizStep((prev) => Math.max(0, prev - 1))}
	                  disabled={quizStep <= 0}
	                >
	                  戻る
	                </button>
	                {!currentStep?.required ? (
	                  <button
	                    type="button"
	                    className="lp-nav-btn lp-nav-btn--primary"
	                    onClick={() => {
	                      if (quizStep >= totalSteps - 1) {
	                        applyQuizWithAnswers(quizAnswers)
	                        return
	                      }
	                      setQuizStep((prev) => Math.min(totalSteps - 1, prev + 1))
	                    }}
	                  >
	                    スキップ
	                  </button>
	                ) : null}
	              </div>
              <p className="lp-quiz__note">数値はあとから直せます。まずはイメージでOKです。</p>
            </div>
          ) : null}
        </section>

        {lpStage === 'teaser' && teaser ? (
          <section className="lp-teaser" aria-label="結果ティザー">
            <header className="lp-teaser__header">
              <h2>結果ティザー（概算）</h2>
              <p>まずは“赤字の有無”だけ確認しましょう。細かい数字は後から見られます。</p>
            </header>
            <div className={['lp-teaser__badge', `is-${teaser.level}`].join(' ')}>
              危険度: <strong>{teaser.level}</strong>
            </div>
            <div className="lp-teaser__line">
              赤字開始年（概算）: <strong>{teaser.firstNegativeYear ?? '赤字なし'}</strong>
            </div>
            <div className="lp-teaser__actions">
              <button type="button" className="lp-nav-btn lp-nav-btn--primary" onClick={() => setLpStage('details')}>
                内訳を見る
              </button>
              <button type="button" className="lp-nav-btn" onClick={onOpenWizard}>
                この条件を編集する
              </button>
              <button type="button" className="lp-nav-btn" onClick={() => setLpStage('quiz')}>
                別の条件で試す
              </button>
            </div>
          </section>
        ) : null}

        {lpStage === 'details' && lpScenarioId ? (
          <section className="lp-details" aria-label="詳細結果">
            <header className="lp-details__header">
              <h2>詳細結果</h2>
              <p>重い数字やグラフはここで初めて表示します（概算なので後で修正OK）。</p>
            </header>
            <LandingPreview scenarioId={lpScenarioId} />
            <div className="lp-details__actions">
              <button type="button" className="lp-nav-btn lp-nav-btn--primary" onClick={onShowMainResults}>
                結果画面で詳しく見る
              </button>
              <button type="button" className="lp-nav-btn" onClick={onOpenWizard}>
                この条件を編集する
              </button>
            </div>
            {lpProjection?.yearly?.length ? (
              <p className="lp-details__note">年を変えて内訳を見ると「何が原因か」が掴みやすいです。</p>
            ) : null}
          </section>
        ) : null}

        <section className="lp-advanced" aria-label="上級者向け">
          <button
            type="button"
            className="lp-advanced__toggle"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((prev) => !prev)}
          >
            詳細（上級者向け）{advancedOpen ? ' ▲' : ' ▼'}
          </button>
	          {advancedOpen ? (
	            <div className="lp-advanced__panel">
	              <p className="lp-advanced__hint">JSONの読み込み/AIでの作成はここから行えます。</p>
	              <div className="lp-advanced__actions">
	                <button
	                  type="button"
	                  className="landing__btn"
	                  onClick={() => {
	                    setImportStatus('読み込み: ファイルを選択してください（追加で読み込み）')
	                    importInputRef.current?.click()
	                  }}
	                >
	                  <span className="landing__btn-title">
	                    <span className="landing__btn-icon" aria-hidden>
	                      <IconUpload />
	                    </span>
	                    JSONを読み込む
	                  </span>
	                  <span className="landing__btn-sub">既存データを取り込む</span>
	                </button>
	                <button type="button" className="landing__btn" onClick={onOpenAi}>
                  <span className="landing__btn-title">
                    <span className="landing__btn-icon" aria-hidden>
                      <IconSparkles />
                    </span>
                    AIで作成
                  </span>
	                  <span className="landing__btn-sub">回答(JSON)を貼り付け</span>
	                </button>
	              </div>
	              <input
	                ref={importInputRef}
	                type="file"
	                accept="application/json"
	                className="sr-only"
	                onChange={async (event) => {
	                  const file = event.target.files?.[0]
	                  if (!file) {
	                    setImportStatus('')
	                    return
	                  }
	                  try {
	                    const data = await readScenarioFile(file)
	                    appendScenarios(data)
	                    setImportStatus('読み込み: 追加しました')
	                    onOpenImport()
	                  } catch (error) {
	                    const message = (error as Error).message
	                    if (message === 'Invalid scenario JSON format') {
	                      setImportStatus('読込エラー: JSON形式が不正です（Scenario[] または {scenarios: Scenario[]}）')
	                    } else {
	                      setImportStatus(`読込エラー: ${message}`)
	                    }
	                  } finally {
	                    event.target.value = ''
	                  }
	                }}
	              />
	              {importStatus ? <p className="lp-advanced__status">{importStatus}</p> : null}
	              <div className="landing__trust">
	                <span>データは端末内（localStorage）に保存されます。</span>
	                <button type="button" className="landing__trust-more" onClick={() => setTrustExpanded((prev) => !prev)}>
	                  {trustExpanded ? '詳細を閉じる' : '詳細'}
	                </button>
                {trustExpanded ? (
                  <p className="landing__trust-detail">
                    共有リンクはURLに情報が入るため、取り扱いにご注意ください（第三者へ共有する場合は内容を確認してください）。
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </section>
  )
	}

function App() {
  const initialLaunch = useMemo(() => {
    if (typeof window === 'undefined') {
      return { screen: 'main' as const }
    }
    try {
      const showLanding = !hasSnapshotParam() && !readLandingSkipped()
      return { screen: (showLanding ? 'landing' : 'main') as AppScreen }
    } catch {
      return { screen: 'main' as const }
    }
  }, [])

  const [screen, setScreen] = useState<AppScreen>(initialLaunch.screen)
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [editorTab, setEditorTab] = useState<'list' | 'form'>('form')
  const [editorMode, setEditorMode] = useState<'wizard' | 'detail'>('detail')
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const { local, updateAvailable, reload } = useBuildInfo()

  useBodyScrollLock(isEditorOpen)

  const openEditor = (options?: { mode?: EditorMode; tab?: EditorTab }) => {
    const preferWizard = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)')?.matches
    setEditorMode(options?.mode ?? (preferWizard ? 'wizard' : 'detail'))
    setEditorTab(options?.tab ?? 'form')
    setAiDialogOpen(false)
    setScreen('main')
    setEditorOpen(true)
  }

  const dismissOnboarding = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
      } catch {
        // ignore
      }
    }
  }

  const skipLanding = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(LANDING_SKIPPED_KEY, 'true')
      } catch {
        // ignore
      }
    }
    setScreen('main')
  }

  return (
    <AppActionsProvider value={{ openEditor }}>
      <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar__title">
          <strong>Life Plan Simulator</strong>
          <span className="app-topbar__subtitle">赤字の年と原因まで一目で分かる家計シミュレーター</span>
          <span className="topbar-badge" aria-label={`ビルド ${local.label}`}>
            {local.label}
          </span>
          {updateAvailable ? (
            <button type="button" className="topbar-pill" onClick={reload}>
              更新あり / 再読み込み
            </button>
          ) : null}
        </div>
        {screen === 'landing' ? null : (
          <div className="app-topbar__actions">
            <button
              type="button"
              className="topbar-btn"
              onClick={() => {
                setScreen('landing')
                setEditorOpen(false)
                setAiDialogOpen(false)
              }}
            >
              はじめ方
            </button>
	            <button
	              type="button"
	              className="topbar-btn"
	              onClick={() => {
	                openEditor()
	              }}
	            >
	              条件を編集
	            </button>
	          </div>
	        )}
      </header>
      <main className="app-grid">
        <div className="right-column">
	          {screen === 'landing' ? (
	            <LandingScreen
	              onDismissOnboarding={dismissOnboarding}
	              onSkipLanding={skipLanding}
	              onOpenWizard={() => {
	                openEditor({ mode: 'wizard', tab: 'form' })
	              }}
	              onOpenImport={() => {
	                openEditor({ mode: 'detail', tab: 'list' })
	              }}
	              onOpenAi={() => {
	                openEditor({ mode: 'detail', tab: 'list' })
	                setAiDialogOpen(true)
	              }}
	              onShowMainResults={() => setScreen('main')}
	            />
	          ) : (
	            <ScenarioResultsTabs />
          )}
        </div>
      </main>
      {isEditorOpen ? (
        <div className="editor-overlay" role="dialog" aria-modal="true" aria-label="条件編集画面">
          <div className="editor-panel">
            <header className="editor-panel__header">
              <div>
                <h2>条件の編集</h2>
                <p>シナリオ一覧と条件を大きな画面で編集できます。</p>
              </div>
              <div className="editor-panel__header-actions">
                <nav className="editor-panel__nav" aria-label="編集画面の表示切替">
                  <button
                    type="button"
                    className={['editor-nav-btn', editorTab === 'list' ? 'is-active' : ''].filter(Boolean).join(' ')}
                    onClick={() => setEditorTab('list')}
                  >
                    一覧
                  </button>
                  <button
                    type="button"
                    className={['editor-nav-btn', editorTab === 'form' ? 'is-active' : ''].filter(Boolean).join(' ')}
                    onClick={() => setEditorTab('form')}
                  >
                    編集
                  </button>
                </nav>
                <nav className="editor-panel__nav editor-panel__nav--mode" aria-label="入力モード">
                  <button
                    type="button"
                    className={['editor-nav-btn', editorMode === 'wizard' ? 'is-active' : ''].filter(Boolean).join(' ')}
                    onClick={() => setEditorMode('wizard')}
                  >
                    かんたん入力
                  </button>
                  <button
                    type="button"
                    className={['editor-nav-btn', editorMode === 'detail' ? 'is-active' : ''].filter(Boolean).join(' ')}
                    onClick={() => setEditorMode('detail')}
                  >
                    詳細
                  </button>
                </nav>
                <button
                  type="button"
                  className="editor-close-btn"
	                  onClick={() => {
	                    setEditorOpen(false)
	                    setEditorTab('form')
	                    setEditorMode('detail')
	                    dismissOnboarding()
	                    setAiDialogOpen(false)
	                  }}
	                >
                  閉じる
                </button>
              </div>
            </header>
            <div className="editor-panel__body" data-tab={editorTab} data-mode={editorMode}>
              <div className="editor-panel__column editor-panel__column--list">
	                <ScenarioList aiOpen={aiDialogOpen} onAiOpenChange={setAiDialogOpen} />
	              </div>
	              <div className="editor-panel__column editor-panel__column--form">
	                {editorMode === 'wizard' ? (
	                  <WizardEditor
	                    onClose={() => {
	                      setEditorOpen(false)
	                      setEditorTab('form')
	                      setEditorMode('detail')
	                      dismissOnboarding()
	                      setAiDialogOpen(false)
	                    }}
	                    onSwitchToDetail={() => setEditorMode('detail')}
	                  />
	                ) : (
	                  <ScenarioForm />
	                )}
	              </div>
	            </div>
	          </div>
	        </div>
	      ) : null}
	    </div>
    </AppActionsProvider>
  )
}

export default App

import { useMemo, useState } from 'react'
import { useResidentPresets } from '@hooks/useResidentPresets'
import { useHousingPresets } from '@hooks/useHousingPresets'
import { useLivingPresets } from '@hooks/useLivingPresets'
import { useSavingsPresets } from '@hooks/useSavingsPresets'
import { useVehiclePresets } from '@hooks/useVehiclePresets'
import { createBlankScenario } from '@utils/sampleData'
import { createId } from '@utils/id'
import { useScenarioStore } from '@store/scenarioStore'
import { IconCar, IconCheck, IconHome, IconUsers } from '@components/icons'

type HouseholdType = 'single' | 'couple' | 'family'
type HousingType = 'rent' | 'own'
type CarPreference = 'none' | 'yes'

type UserProfile = {
  household: HouseholdType
  housing: HousingType
  car: CarPreference
}

const PROFILE_STORAGE_KEY = 'lifePlan.recommendation.profile.v1'

const readProfile = (): UserProfile => {
  if (typeof window === 'undefined') {
    return { household: 'couple', housing: 'rent', car: 'none' }
  }
  try {
    const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY)
    if (!raw) {
      throw new Error('missing')
    }
    const parsed = JSON.parse(raw) as Partial<UserProfile>
    return {
      household: parsed.household ?? 'couple',
      housing: parsed.housing ?? 'rent',
      car: parsed.car ?? 'none',
    }
  } catch {
    return { household: 'couple', housing: 'rent', car: 'none' }
  }
}

const writeProfile = (profile: UserProfile) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // ignore
  }
}

type RecommendationTemplate = {
  id: string
  title: string
  description: string
  residentPresetIds: string[]
  housingPresetId: string
  livingPresetId: string
  savingsPresetIds: string[]
  vehiclePresetId?: string
  expected: {
    household: HouseholdType
    housing: HousingType
    car: CarPreference
  }
}

const TEMPLATES: RecommendationTemplate[] = [
  {
    id: 'single-rent-no-car',
    title: '単身 × 賃貸 × 車なし',
    description: 'まずは家賃・生活費・貯蓄のバランスを見るための最小構成です。',
    residentPresetIds: ['dual-income-husband'],
    housingPresetId: 'rent-apartment',
    livingPresetId: 'compact',
    savingsPresetIds: ['cash-buffer', 'tsumitate-nisa'],
    expected: { household: 'single', housing: 'rent', car: 'none' },
  },
  {
    id: 'couple-rent-car',
    title: '夫婦 × 賃貸 × 車あり',
    description: '共働き+賃貸+車の標準ケース。差引と内訳がイメージしやすい構成です。',
    residentPresetIds: ['dual-income-husband', 'dual-income-wife'],
    housingPresetId: 'rent-apartment',
    livingPresetId: 'standard-family',
    savingsPresetIds: ['cash-buffer', 'tsumitate-nisa'],
    vehiclePresetId: 'compact-loan',
    expected: { household: 'couple', housing: 'rent', car: 'yes' },
  },
  {
    id: 'family-own-car',
    title: '夫婦+子1人 × 持ち家 × 車あり',
    description: '教育資金も含めたファミリー向け。赤字年と原因（教育/住宅/車）を掴みやすい構成です。',
    residentPresetIds: ['dual-income-husband', 'dual-income-wife', 'child-public-all'],
    housingPresetId: 'house-20yr',
    livingPresetId: 'standard-family',
    savingsPresetIds: ['cash-buffer', 'tsumitate-nisa', 'education-fund'],
    vehiclePresetId: 'minivan-cash',
    expected: { household: 'family', housing: 'own', car: 'yes' },
  },
]

const scoreTemplate = (profile: UserProfile, template: RecommendationTemplate): number => {
  let score = 0
  if (profile.household === template.expected.household) score += 2
  if (profile.housing === template.expected.housing) score += 1
  if (profile.car === template.expected.car) score += 1
  return score
}

const buildMatchLabel = (profile: UserProfile, template: RecommendationTemplate): string => {
  const parts: string[] = []
  if (profile.household === template.expected.household) parts.push('世帯')
  if (profile.housing === template.expected.housing) parts.push('住居')
  if (profile.car === template.expected.car) parts.push('車')
  return parts.length ? `一致: ${parts.join(' / ')}` : '一致なし'
}

export const RecommendedPresets = ({
  onApplied,
  onClose,
  variant = 'full',
}: {
  onApplied?: () => void
  onClose?: () => void
  variant?: 'landing' | 'full'
}) => {
  const [profile, setProfile] = useState<UserProfile>(() => readProfile())
  const [showMore, setShowMore] = useState(false)
  const { presets: residentPresets, loading: residentsLoading, error: residentsError, toResidentPayload } = useResidentPresets()
  const { presets: housingPresets, loading: housingLoading, error: housingError } = useHousingPresets()
  const { presets: livingPresets, loading: livingLoading, error: livingError } = useLivingPresets()
  const { presets: savingsPresets, loading: savingsLoading, error: savingsError, buildAccountPayload } = useSavingsPresets()
  const { presets: vehiclePresets, loading: vehicleLoading, error: vehicleError, buildVehiclePayload } = useVehiclePresets()

  const appendScenarios = useScenarioStore((state) => state.appendScenarios)
  const selectScenario = useScenarioStore((state) => state.selectScenario)

  const isLoading = residentsLoading || housingLoading || livingLoading || savingsLoading || vehicleLoading
  const error = residentsError || housingError || livingError || savingsError || vehicleError

  const recommended = useMemo(() => {
    const scored = [...TEMPLATES]
      .map((template) => ({ template, score: scoreTemplate(profile, template) }))
      .sort((a, b) => b.score - a.score)

    const hasAnyMatch = scored.some((entry) => entry.score > 0)
    const filtered = hasAnyMatch ? scored.filter((entry) => entry.score > 0) : scored
    return filtered.slice(0, 3)
  }, [profile])

  const visibleCards = useMemo(() => {
    if (variant !== 'landing') {
      return recommended
    }
    if (showMore) {
      return recommended
    }
    return recommended.slice(0, 1)
  }, [recommended, showMore, variant])

  const applyTemplate = (template: RecommendationTemplate) => {
    const scenario = createBlankScenario(`おすすめ: ${template.title}`)
    scenario.description = template.description

    const residents = template.residentPresetIds
      .map((id) => residentPresets.find((preset) => preset.id === id))
      .filter(Boolean)
      .map((preset) => toResidentPayload(preset!))
      .map((resident, idx) => {
        if (template.expected.household === 'single' && idx === 0) {
          return { ...resident, name: '本人' }
        }
        if (resident.name?.includes('子') || template.residentPresetIds[idx]?.startsWith('child')) {
          return { ...resident, name: '子' }
        }
        return resident
      })
    if (residents.length) {
      scenario.residents = residents
    }

    const housingPreset = housingPresets.find((preset) => preset.id === template.housingPresetId)
    if (housingPreset) {
      scenario.housingPlans = [
        {
          id: createId('housing'),
          ...housingPreset.plan,
        },
      ]
    }

    const livingPreset = livingPresets.find((preset) => preset.id === template.livingPresetId)
    if (livingPreset) {
      scenario.livingPlans = [
        {
          id: createId('living'),
          label: '生活費',
          startYearOffset: 0,
          endYearOffset: undefined,
          baseAnnual: livingPreset.monthly.base * 12,
          insuranceAnnual: (livingPreset.monthly.insurance ?? 0) * 12,
          utilitiesAnnual: (livingPreset.monthly.utilities ?? 0) * 12,
          discretionaryAnnual: (livingPreset.monthly.discretionary ?? 0) * 12,
          healthcareAnnual: (livingPreset.monthly.healthcare ?? 0) * 12,
          inflationRate: livingPreset.inflationRate,
        },
      ]
    }

    const accounts = template.savingsPresetIds
      .map((id) => savingsPresets.find((preset) => preset.id === id))
      .filter(Boolean)
      .map((preset) => ({ ...buildAccountPayload(preset!), id: createId('savings') }))
    if (accounts.length) {
      scenario.savingsAccounts = accounts
    }

    if (template.vehiclePresetId) {
      const vehiclePreset = vehiclePresets.find((preset) => preset.id === template.vehiclePresetId)
      if (vehiclePreset) {
        const profilePayload = buildVehiclePayload(vehiclePreset, 0)
        scenario.vehicles = [
          {
            id: createId('vehicle'),
            label: profilePayload.label,
            purchaseYear: profilePayload.purchaseYear,
            purchasePrice: profilePayload.purchasePrice,
            disposalYear: profilePayload.disposalYear,
            disposalValue: profilePayload.disposalValue,
            loanRemaining: profilePayload.loanRemaining,
            monthlyLoan: profilePayload.monthlyLoan,
            inspectionCycleYears: profilePayload.inspectionCycleYears,
            inspectionCost: profilePayload.inspectionCost,
            maintenanceAnnual: profilePayload.maintenanceAnnual,
            parkingMonthly: profilePayload.parkingMonthly,
            insuranceAnnual: profilePayload.insuranceAnnual,
          },
        ]
      }
    } else {
      scenario.vehicles = []
    }

    appendScenarios([scenario])
    selectScenario(scenario.id)
    onApplied?.()
  }

  return (
    <section className={['recommend-presets', variant === 'landing' ? 'recommend-presets--landing' : ''].filter(Boolean).join(' ')} aria-label="あなたにおすすめ">
      <header className="recommend-presets__header">
        <div className="recommend-presets__header-row">
          <h3>あなたにおすすめ</h3>
          {onClose ? (
            <button type="button" className="recommend-presets__close" onClick={onClose} aria-label="おすすめを閉じる">
              ×
            </button>
          ) : null}
        </div>
        <p>少し選ぶだけで、よくあるパターンから始められます（あとから上書きOK）。</p>
      </header>

      <div className="recommend-presets__form" role="group" aria-label="おすすめ条件">
        <label>
          世帯
          <select
            value={profile.household}
            onChange={(event) => {
              const next = { ...profile, household: event.target.value as HouseholdType }
              setProfile(next)
              writeProfile(next)
            }}
          >
            <option value="single">単身</option>
            <option value="couple">夫婦</option>
            <option value="family">子あり</option>
          </select>
        </label>
        <label>
          住居
          <select
            value={profile.housing}
            onChange={(event) => {
              const next = { ...profile, housing: event.target.value as HousingType }
              setProfile(next)
              writeProfile(next)
            }}
          >
            <option value="rent">賃貸</option>
            <option value="own">持ち家</option>
          </select>
        </label>
        <label>
          車
          <select
            value={profile.car}
            onChange={(event) => {
              const next = { ...profile, car: event.target.value as CarPreference }
              setProfile(next)
              writeProfile(next)
            }}
          >
            <option value="none">なし</option>
            <option value="yes">あり</option>
          </select>
        </label>
      </div>

      {error ? <p className="recommend-presets__status">読込エラー: {error}</p> : null}
      {isLoading ? (
        <p className="recommend-presets__status">おすすめを準備しています...</p>
      ) : (
        <>
          <div className="recommend-presets__grid">
            {visibleCards.map(({ template, score }) => (
            <article key={template.id} className={['recommend-card', score > 0 ? 'is-highlight' : ''].filter(Boolean).join(' ')}>
              <header className="recommend-card__header">
                <h4>{template.title}</h4>
                <span className="recommend-card__badge">{score >= 3 ? 'おすすめ' : '候補'}</span>
              </header>
              <p className="recommend-card__desc">{template.description}</p>
              <p className="recommend-card__match">{buildMatchLabel(profile, template)}</p>
              <ul className="recommend-card__meta">
                <li>
                  <span className="recommend-card__meta-icon" aria-hidden>
                    <IconUsers />
                  </span>
                  住人: {template.residentPresetIds.length}人
                </li>
                <li>
                  <span className="recommend-card__meta-icon" aria-hidden>
                    <IconHome />
                  </span>
                  住居: {template.expected.housing === 'rent' ? '賃貸' : '持ち家'}
                </li>
                <li>
                  <span className="recommend-card__meta-icon" aria-hidden>
                    <IconCar />
                  </span>
                  車: {template.expected.car === 'yes' ? 'あり' : 'なし'}
                </li>
              </ul>
              <div className="recommend-card__actions">
                <button type="button" onClick={() => applyTemplate(template)}>
                  <span className="recommend-card__action-icon" aria-hidden>
                    <IconCheck />
                  </span>
                  このプリセットで始める（新規シナリオ）
                </button>
              </div>
            </article>
            ))}
          </div>
          {variant === 'landing' && recommended.length > 1 ? (
            <div className="recommend-presets__more">
              <button type="button" className="recommend-presets__more-btn" onClick={() => setShowMore((prev) => !prev)}>
                {showMore ? '候補を閉じる ▲' : '他の候補を見る ▼'}
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

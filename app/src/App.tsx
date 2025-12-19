import { useMemo, useState } from 'react'
import './App.css'
import { ScenarioList } from '@components/ScenarioList'
import { ScenarioForm } from '@components/ScenarioForm'
import { ScenarioResultsTabs } from '@components/ScenarioResultsTabs'
import { useBuildInfo } from '@hooks/useBuildInfo'
import { WizardEditor } from '@components/WizardEditor'
import { RecommendedPresets } from '@components/RecommendedPresets'
import { LandingPreview } from '@components/LandingPreview'
import { IconSparkles, IconUpload, IconUsers } from '@components/icons'

const ONBOARDING_DISMISSED_KEY = 'lifePlan.onboarding.dismissed.v1'

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

const readOnboardingDismissed = (): boolean => {
  if (typeof window === 'undefined') {
    return true
  }
  try {
    return window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) === 'true'
  } catch {
    return true
  }
}

type StartOptionsCardProps = {
  showOnboarding: boolean
  onDismissOnboarding: () => void
  onClose: () => void
  onStartWizard: () => void
  onOpenImport: () => void
  onOpenAi: () => void
  onLater: () => void
}

const StartOptionsCard = ({
  showOnboarding,
  onDismissOnboarding,
  onClose,
  onStartWizard,
  onOpenImport,
  onOpenAi,
  onLater,
}: StartOptionsCardProps) => {
  return (
    <section
      className={['start-options', showOnboarding ? 'start-options--onboarding' : 'start-options--compact'].join(' ')}
      aria-label="開始方法"
    >
      <div className="start-options__header">
        <h3>{showOnboarding ? 'まずは開始方法を選びましょう' : '開始方法'}</h3>
        <button type="button" className="start-options__close" onClick={onClose} aria-label="開始方法を閉じる">
          ×
        </button>
      </div>
      {showOnboarding ? (
        <>
          <p className="start-options__help">3分で入力して結果が見られます。過去データがある場合は読み込み/AIも使えます。</p>
          <p className="start-options__help">データは基本的にブラウザ内（localStorage）に保存されます。共有リンクはURLに情報が入るため取扱注意です。</p>
        </>
      ) : (
        <p className="start-options__help">入力 / JSON読み込み / AI作成 の3つから始められます。</p>
      )}
      <div className="start-options__actions">
        <button
          type="button"
          className="start-options__btn start-options__btn--primary"
          onClick={() => {
            if (showOnboarding) onDismissOnboarding()
            onStartWizard()
          }}
        >
          かんたん入力（推奨）
        </button>
        <button
          type="button"
          className="start-options__btn"
          onClick={() => {
            if (showOnboarding) onDismissOnboarding()
            onOpenImport()
          }}
        >
          JSON読み込み
        </button>
        <button
          type="button"
          className="start-options__btn"
          onClick={() => {
            if (showOnboarding) onDismissOnboarding()
            onOpenAi()
          }}
        >
          AIで作成
        </button>
      </div>
      {showOnboarding ? (
        <div className="start-options__footer">
          <button
            type="button"
            className="start-options__later"
            onClick={() => {
              onDismissOnboarding()
              onLater()
            }}
          >
            あとで
          </button>
        </div>
      ) : null}
    </section>
  )
}

type LandingScreenProps = {
  onStartWizard: () => void
  onOpenImport: () => void
  onOpenAi: () => void
  onShowResults: () => void
  onDismissOnboarding: () => void
}

const LandingScreen = ({
  onStartWizard,
  onOpenImport,
  onOpenAi,
  onShowResults,
  onDismissOnboarding,
}: LandingScreenProps) => {
  const [trustExpanded, setTrustExpanded] = useState(false)
  return (
    <section className="landing" aria-label="開始画面">
      <div className="landing__panel">
        <div className="landing__layout">
          <div className="landing__left">
            <header className="landing__header">
              <h1>Life Plan Simulator</h1>
              <p className="landing__subtitle">赤字の年と原因まで一目で分かる家計シミュレーター</p>
            </header>

            <div className="landing__actions" aria-label="開始方法">
              <button
                type="button"
                className="landing__btn landing__btn--primary"
                onClick={() => {
                  onDismissOnboarding()
                  onStartWizard()
                }}
              >
                <span className="landing__btn-title">
                  <span className="landing__btn-icon" aria-hidden>
                    <IconUsers />
                  </span>
                  かんたん入力で始める（推奨）
                </span>
                <span className="landing__btn-sub">3分で「赤字の年」と原因が見える</span>
              </button>
              <button
                type="button"
                className="landing__btn"
                onClick={() => {
                  onDismissOnboarding()
                  onOpenImport()
                }}
              >
                <span className="landing__btn-title">
                  <span className="landing__btn-icon" aria-hidden>
                    <IconUpload />
                  </span>
                  JSONを読み込む
                </span>
                <span className="landing__btn-sub">以前のデータ/共有JSONを取り込む</span>
              </button>
              <button
                type="button"
                className="landing__btn"
                onClick={() => {
                  onDismissOnboarding()
                  onOpenAi()
                }}
              >
                <span className="landing__btn-title">
                  <span className="landing__btn-icon" aria-hidden>
                    <IconSparkles />
                  </span>
                  AIで作成（コピー&貼り付け）
                </span>
                <span className="landing__btn-sub">ChatGPT/Geminiの回答(JSON)を貼る</span>
              </button>
            </div>

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

            <RecommendedPresets
              variant="landing"
              onApplied={() => {
                onDismissOnboarding()
                onStartWizard()
              }}
            />

            <div className="landing__footer">
              <button
                type="button"
                className="landing__link"
                onClick={() => {
                  onDismissOnboarding()
                  onShowResults()
                }}
              >
                サンプル結果を見る
              </button>
            </div>
          </div>

          <div className="landing__right">
            <LandingPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

function App() {
  const initialLaunch = useMemo(() => {
    if (typeof window === 'undefined') {
      return { screen: 'main' as const, showOnboarding: false }
    }
    try {
      const dismissed = readOnboardingDismissed()
      const showLanding = !dismissed && !hasSnapshotParam()
      return { screen: (showLanding ? 'landing' : 'main') as AppScreen, showOnboarding: showLanding }
    } catch {
      return { screen: 'main' as const, showOnboarding: false }
    }
  }, [])

  const [screen, setScreen] = useState<AppScreen>(initialLaunch.screen)
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [editorTab, setEditorTab] = useState<'list' | 'form'>('form')
  const [editorMode, setEditorMode] = useState<'wizard' | 'detail'>('detail')
  const [showOnboarding, setShowOnboarding] = useState(initialLaunch.showOnboarding)
  const [startOptionsOpen, setStartOptionsOpen] = useState(false)
  const [recommendedOpen, setRecommendedOpen] = useState(true)
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const { local, updateAvailable, reload } = useBuildInfo()

  const dismissOnboarding = () => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true')
      } catch {
        // ignore
      }
    }
    setShowOnboarding(false)
  }

  return (
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
              const preferWizard =
                typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)')?.matches
              setEditorMode(preferWizard ? 'wizard' : 'detail')
              setEditorTab('form')
              setShowOnboarding(false)
              setStartOptionsOpen(true)
              setRecommendedOpen(true)
              setAiDialogOpen(false)
              setScreen('main')
              setEditorOpen(true)
            }}
          >
            条件を編集
          </button>
        </div>
      </header>
      <main className="app-grid">
        <div className="right-column">
          {screen === 'landing' ? (
            <LandingScreen
              onDismissOnboarding={dismissOnboarding}
              onStartWizard={() => {
                setScreen('main')
                setEditorOpen(true)
                setEditorTab('form')
                setEditorMode('wizard')
                setStartOptionsOpen(false)
                setAiDialogOpen(false)
              }}
              onOpenImport={() => {
                setScreen('main')
                setEditorOpen(true)
                setEditorTab('list')
                setEditorMode('detail')
                setStartOptionsOpen(false)
                setAiDialogOpen(false)
              }}
              onOpenAi={() => {
                setScreen('main')
                setEditorOpen(true)
                setEditorTab('list')
                setEditorMode('detail')
                setStartOptionsOpen(false)
                setAiDialogOpen(true)
              }}
              onShowResults={() => setScreen('main')}
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
                    setStartOptionsOpen(false)
                    setRecommendedOpen(false)
                    setAiDialogOpen(false)
                  }}
                >
                  閉じる
                </button>
              </div>
            </header>
            <div className="editor-panel__start">
              {startOptionsOpen ? (
                <>
                  <StartOptionsCard
                    showOnboarding={showOnboarding}
                    onDismissOnboarding={dismissOnboarding}
                    onClose={() => setStartOptionsOpen(false)}
                    onStartWizard={() => {
                      setStartOptionsOpen(false)
                      setEditorTab('form')
                      setEditorMode('wizard')
                      setAiDialogOpen(false)
                    }}
                    onOpenImport={() => {
                      setStartOptionsOpen(false)
                      setEditorTab('list')
                      setAiDialogOpen(false)
                    }}
                    onOpenAi={() => {
                      setStartOptionsOpen(false)
                      setEditorTab('list')
                      setAiDialogOpen(true)
                    }}
                    onLater={() => {
                      setStartOptionsOpen(false)
                      setEditorOpen(false)
                      setEditorTab('form')
                      setEditorMode('detail')
                      setAiDialogOpen(false)
                    }}
                  />
                  {recommendedOpen ? (
                    <RecommendedPresets
                      onClose={() => setRecommendedOpen(false)}
                      onApplied={() => {
                        setRecommendedOpen(false)
                        dismissOnboarding()
                        setAiDialogOpen(false)
                        setEditorTab('form')
                        setEditorMode('wizard')
                      }}
                    />
                  ) : (
                    <div className="recommend-presets-collapsed">
                      <button type="button" className="recommend-presets-collapsed__btn" onClick={() => setRecommendedOpen(true)}>
                        あなたにおすすめを開く
                      </button>
                      <span className="recommend-presets-collapsed__help">世帯/住居/車からおすすめを表示</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="start-options-collapsed">
                  <button type="button" className="start-options-collapsed__btn" onClick={() => setStartOptionsOpen(true)}>
                    開始方法を開く
                  </button>
                  <span className="start-options-collapsed__help">かんたん入力 / JSON / AI</span>
                </div>
              )}
            </div>
            <div className="editor-panel__body" data-tab={editorTab}>
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
                      setStartOptionsOpen(false)
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
  )
}

export default App

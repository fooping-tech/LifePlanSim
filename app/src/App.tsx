import { useState } from 'react'
import './App.css'
import { ScenarioList } from '@components/ScenarioList'
import { ScenarioForm } from '@components/ScenarioForm'
import { ScenarioResultsTabs } from '@components/ScenarioResultsTabs'
import { useBuildInfo } from '@hooks/useBuildInfo'
import { WizardEditor } from '@components/WizardEditor'

function App() {
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [editorTab, setEditorTab] = useState<'list' | 'form'>('form')
  const [editorMode, setEditorMode] = useState<'wizard' | 'detail'>('detail')
  const { local, updateAvailable, reload } = useBuildInfo()

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar__title">
          <strong>Life Plan Simulator</strong>
          <span className="app-topbar__subtitle">家計の将来設計をブラウザで比較</span>
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
              const preferWizard =
                typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)')?.matches
              setEditorMode(preferWizard ? 'wizard' : 'detail')
              setEditorTab('form')
              setEditorOpen(true)
            }}
          >
            条件を編集
          </button>
        </div>
      </header>
      <main className="app-grid">
        <div className="right-column">
          <ScenarioResultsTabs />
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
                  }}
                >
                  閉じる
                </button>
              </div>
            </header>
            <div className="editor-panel__body" data-tab={editorTab}>
              <div className="editor-panel__column editor-panel__column--list">
                <ScenarioList />
              </div>
              <div className="editor-panel__column editor-panel__column--form">
                {editorMode === 'wizard' ? (
                  <WizardEditor
                    onClose={() => {
                      setEditorOpen(false)
                      setEditorTab('form')
                      setEditorMode('detail')
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

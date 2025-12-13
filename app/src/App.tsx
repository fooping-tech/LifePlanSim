import { useState } from 'react'
import './App.css'
import { ScenarioList } from '@components/ScenarioList'
import { ScenarioForm } from '@components/ScenarioForm'
import { ScenarioResultsTabs } from '@components/ScenarioResultsTabs'
import { useBuildInfo } from '@hooks/useBuildInfo'

function App() {
  const [isEditorOpen, setEditorOpen] = useState(false)
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
          <button type="button" className="topbar-btn" onClick={() => setEditorOpen(true)}>
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
              <button type="button" className="editor-close-btn" onClick={() => setEditorOpen(false)}>
                閉じる
              </button>
            </header>
            <div className="editor-panel__body">
              <div className="editor-panel__column editor-panel__column--list">
                <ScenarioList />
              </div>
              <div className="editor-panel__column editor-panel__column--form">
                <ScenarioForm />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App

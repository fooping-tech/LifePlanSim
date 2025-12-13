import { useRef, useState } from 'react'
import { useScenarioStore } from '@store/scenarioStore'
import { useShallow } from 'zustand/react/shallow'
import { downloadScenarioSet, readScenarioFile } from '@utils/persistence'

export const ScenarioList = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState('')
  const {
    scenarios,
    activeScenarioId,
    selectScenario,
    addScenario,
    duplicateScenario,
    removeScenario,
    loadScenarios,
    resetToSamples,
    generateSnapshotLink,
  } = useScenarioStore(
    useShallow((state) => ({
      scenarios: state.scenarios,
      activeScenarioId: state.activeScenarioId,
      selectScenario: state.selectScenario,
      addScenario: state.addScenario,
      duplicateScenario: state.duplicateScenario,
      removeScenario: state.removeScenario,
      loadScenarios: state.loadScenarios,
      resetToSamples: state.resetToSamples,
      generateSnapshotLink: state.generateSnapshotLink,
    })),
  )

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    try {
      const data = await readScenarioFile(file)
      loadScenarios(data)
      setStatus('JSONを読み込みました')
    } catch (error) {
      setStatus(`読込エラー: ${(error as Error).message}`)
    } finally {
      event.target.value = ''
    }
  }

  const handleShare = async () => {
    const link = generateSnapshotLink()
    if (!link) {
      return
    }
    try {
      if (link.length > 50000) {
        setStatus('共有リンクが長すぎます（上限超過）。JSON書き出しをご利用ください。')
        return
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link)
        setStatus('共有リンクをコピーしました')
      } else {
        window.prompt('共有リンク', link)
      }
    } catch (error) {
      setStatus(`コピーに失敗しました: ${(error as Error).message}`)
    }
  }

  return (
    <section className="panel scenario-list">
      <header className="panel__header">
        <h2>シナリオ一覧</h2>
        <div className="panel__header-actions">
          <button type="button" onClick={addScenario}>
            + 新規
          </button>
          <button type="button" onClick={resetToSamples}>
            サンプル
          </button>
        </div>
      </header>
      <>
        <ul className="scenario-list__items">
          {scenarios.map((scenario) => (
            <li
              key={scenario.id}
              className={['scenario-list__item', scenario.id === activeScenarioId ? 'is-active' : '']
                .filter(Boolean)
                .join(' ')}
            >
              <button type="button" onClick={() => selectScenario(scenario.id)}>
                <div>
                  <strong>{scenario.name}</strong>
                  {scenario.description ? <p>{scenario.description}</p> : null}
                </div>
              </button>
              <div className="scenario-list__item-actions">
                <button type="button" onClick={() => duplicateScenario(scenario.id)}>
                  複製
                </button>
                <button type="button" onClick={() => removeScenario(scenario.id)}>
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="scenario-list__footer">
          <button type="button" onClick={() => downloadScenarioSet(scenarios)}>
            JSON書き出し
          </button>
          <button type="button" onClick={handleImportClick}>
            JSON読込
          </button>
          <button type="button" onClick={handleShare}>
            共有リンク
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={handleFileChange}
          />
          {status ? <p className="scenario-list__status">{status}</p> : null}
        </div>
      </>
    </section>
  )
}

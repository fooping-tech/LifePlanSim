import { useCallback, useRef, useState } from 'react'
import { useScenarioStore } from '@store/scenarioStore'
import { useShallow } from 'zustand/react/shallow'
import { downloadScenarioSet, readScenarioFile } from '@utils/persistence'
import { IconDownload, IconFileJson, IconLink, IconUpload } from '@components/icons'
import { AiScenarioDialog } from '@components/AiScenarioDialog'
import type { Scenario } from '@models/scenario'

type ScenarioListProps = {
  aiOpen?: boolean
  onAiOpenChange?: (open: boolean) => void
}

export const ScenarioList = ({ aiOpen: aiOpenProp, onAiOpenChange }: ScenarioListProps) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState('')
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace')
  const [aiOpenInternal, setAiOpenInternal] = useState(false)
  const aiOpen = typeof aiOpenProp === 'boolean' ? aiOpenProp : aiOpenInternal
  const setAiOpen = useCallback(
    (next: boolean) => {
      if (typeof aiOpenProp !== 'boolean') {
        setAiOpenInternal(next)
      }
      onAiOpenChange?.(next)
    },
    [aiOpenProp, onAiOpenChange],
  )
  const {
    scenarios,
    activeScenarioId,
    selectScenario,
    addScenario,
    duplicateScenario,
    removeScenario,
    updateScenario,
    loadScenarios,
    appendScenarios,
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
      updateScenario: state.updateScenario,
      loadScenarios: state.loadScenarios,
      appendScenarios: state.appendScenarios,
      resetToSamples: state.resetToSamples,
      generateSnapshotLink: state.generateSnapshotLink,
    })),
  )

  const buildScenarioFileName = (name: string) => {
    const base = name?.trim() ? `life-plan-scenario-${name.trim()}.json` : 'life-plan-scenario.json'
    return base.replace(/[\\/:*?"<>|]/g, '_')
  }

  const handleImportClick = (mode: 'replace' | 'append') => {
    setImportMode(mode)
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    try {
      const data = await readScenarioFile(file)
      if (importMode === 'replace') {
        const ok = window.confirm('現在のシナリオ一覧を置き換えます。よろしいですか？')
        if (!ok) {
          return
        }
        loadScenarios(data)
        setStatus('読み込み: 置換しました')
      } else {
        appendScenarios(data)
        setStatus('読み込み: 追加しました')
      }
    } catch (error) {
      const message = (error as Error).message
      if (message === 'Invalid scenario JSON format') {
        setStatus('読込エラー: JSON形式が不正です（Scenario[] または {scenarios: Scenario[]}）')
      } else {
        setStatus(`読込エラー: ${message}`)
      }
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

  const activeScenarioName = scenarios.find((scenario) => scenario.id === activeScenarioId)?.name

  const handleAiApply = (payload: Scenario[], mode: 'append' | 'replace' | 'overwrite') => {
    if (!payload.length) {
      return
    }
    if (mode === 'replace') {
      const ok = window.confirm('現在のシナリオ一覧を置き換えます。よろしいですか？')
      if (!ok) {
        return
      }
      loadScenarios(payload)
      setStatus('AI: 置換しました')
      setAiOpen(false)
      return
    }
    if (mode === 'overwrite') {
      const activeId = activeScenarioId
      const active = scenarios.find((scenario) => scenario.id === activeId)
      if (!activeId || !active) {
        setStatus('AI: 上書き対象のシナリオが見つかりません')
        return
      }
      const ok = window.confirm(`選択中のシナリオ「${active.name}」を上書きします。よろしいですか？`)
      if (!ok) {
        return
      }
      updateScenario({ ...payload[0], id: activeId })
      selectScenario(activeId)
      setStatus('AI: 上書きしました')
      setAiOpen(false)
      return
    }

    appendScenarios(payload)
    setStatus('AI: 追加しました')
    setAiOpen(false)
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
          <div className="scenario-file-actions" aria-label="JSONの書き出しと読み込み">
            <div className="scenario-file-actions__group">
              <p className="scenario-file-actions__title">
                <IconDownload title="書き出し" /> 書き出し
              </p>
              <button
                type="button"
                className="scenario-file-actions__btn"
                onClick={() => {
                  downloadScenarioSet(scenarios, 'life-plan-scenarios.json')
                  setStatus('書き出し: 全件')
                }}
              >
                <span className="scenario-file-actions__btn-label">
                  <IconFileJson title="JSON" />
                  全件を書き出し
                </span>
                <span className="scenario-file-actions__btn-help">すべてのシナリオを保存します</span>
              </button>
              <button
                type="button"
                className="scenario-file-actions__btn"
                onClick={() => {
                  const active = scenarios.find((scenario) => scenario.id === activeScenarioId)
                  if (!active) {
                    setStatus('書き出し: 対象のシナリオが見つかりません')
                    return
                  }
                  downloadScenarioSet([active], buildScenarioFileName(active.name))
                  setStatus('書き出し: 選択中のみ')
                }}
              >
                <span className="scenario-file-actions__btn-label">
                  <IconFileJson title="JSON" />
                  選択中のみを書き出し
                </span>
                <span className="scenario-file-actions__btn-help">今見ているシナリオだけ保存します</span>
              </button>
            </div>
            <div className="scenario-file-actions__group">
              <p className="scenario-file-actions__title">
                <IconUpload title="読み込み" /> 読み込み
              </p>
              <button type="button" className="scenario-file-actions__btn" onClick={() => handleImportClick('append')}>
                <span className="scenario-file-actions__btn-label">
                  <IconFileJson title="JSON" />
                  追加で読み込み
                </span>
                <span className="scenario-file-actions__btn-help">既存は残して追加します</span>
              </button>
              <button type="button" className="scenario-file-actions__btn" onClick={() => handleImportClick('replace')}>
                <span className="scenario-file-actions__btn-label">
                  <IconFileJson title="JSON" />
                  置換で読み込み
                </span>
                <span className="scenario-file-actions__btn-help">既存を消して置き換えます</span>
              </button>
            </div>
            <div className="scenario-file-actions__group">
              <p className="scenario-file-actions__title">
                <IconLink title="共有" /> 共有
              </p>
              <button type="button" className="scenario-file-actions__btn" onClick={handleShare}>
                <span className="scenario-file-actions__btn-label">
                  <IconLink title="共有リンク" />
                  共有リンクをコピー
                </span>
                <span className="scenario-file-actions__btn-help">
                  長すぎる場合はJSON書き出しをご利用ください
                </span>
              </button>
            </div>
            <div className="scenario-file-actions__group">
              <p className="scenario-file-actions__title">
                <IconFileJson title="AI" /> AI
              </p>
              <button type="button" className="scenario-file-actions__btn" onClick={() => setAiOpen(true)}>
                <span className="scenario-file-actions__btn-label">
                  <IconFileJson title="JSON" />
                  AIで作成（コピー&貼り付け）
                </span>
                <span className="scenario-file-actions__btn-help">ChatGPT/GeminiのUIで生成したJSONを取り込みます</span>
              </button>
            </div>
          </div>
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
      {aiOpen ? (
        <AiScenarioDialog
          isOpen
          onClose={() => setAiOpen(false)}
          activeScenarioName={activeScenarioName}
          onApply={handleAiApply}
        />
      ) : null}
    </section>
  )
}

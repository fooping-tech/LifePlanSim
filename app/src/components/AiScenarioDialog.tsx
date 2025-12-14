import { useMemo, useState } from 'react'
import type { Scenario } from '@models/scenario'

type ApplyMode = 'append' | 'replace' | 'overwrite'

const stripCodeFences = (text: string): string => {
  const trimmed = text.trim()
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  return match ? match[1].trim() : trimmed
}

const coerceScenarioArray = (value: unknown): Scenario[] | null => {
  if (Array.isArray(value)) {
    return value as Scenario[]
  }
  if (typeof value === 'object' && value !== null) {
    const asRecord = value as Record<string, unknown>
    if (Array.isArray(asRecord.scenarios)) {
      return asRecord.scenarios as Scenario[]
    }
    // single Scenario object
    if (typeof asRecord.name === 'string' || typeof asRecord.startYear === 'number' || Array.isArray(asRecord.residents)) {
      return [value as Scenario]
    }
  }
  return null
}

const buildPromptTemplate = (requestText: string) => {
  const nowYear = new Date().getFullYear()
  const request = requestText.trim() || '（ここに要望を入力してください）'
  return `あなたは家計のライフプラン条件をJSONで作るアシスタントです。
以下の要望から、Scenario(JSON)を1つ生成してください。

重要:
- 返答はJSONのみ（説明文/コードフェンス/箇条書きは禁止）
- 通貨は日本円（数値は「円」単位）
- 利率は小数（例: 5% -> 0.05）
- id は省略してOK（アプリ側で付与します）

要望:
${request}

出力スキーマ（目安）:
{
  "name": "シナリオ名",
  "description": "説明",
  "startYear": ${nowYear},
  "initialCash": 0,
  "residents": [
    {
      "name": "住人名",
      "currentAge": 35,
      "retirementAge": 65,
      "baseNetIncome": 5000000,
      "annualIncomeGrowthRate": 0.02,
      "dependents": 0,
      "incomeEvents": [],
      "expenseBands": []
    }
  ],
  "housingPlans": [],
  "vehicles": [],
  "livingPlans": [
    {
      "label": "生活費",
      "startYearOffset": 0,
      "baseAnnual": 0,
      "insuranceAnnual": 0,
      "utilitiesAnnual": 0,
      "discretionaryAnnual": 0,
      "healthcareAnnual": 0
    }
  ],
  "savingsAccounts": [
    {
      "label": "普通預金",
      "type": "deposit",
      "role": "emergency",
      "minBalance": 0,
      "balance": 0,
      "annualContribution": 0,
      "annualInterestRate": 0.01,
      "contributionPolicy": "fixed",
      "withdrawPolicy": "normal",
      "withdrawPriority": 0,
      "adjustable": true
    }
  ],
  "expenseBands": [],
  "customIncomeEvents": []
}`
}

interface AiScenarioDialogProps {
  isOpen: boolean
  onClose: () => void
  activeScenarioName?: string
  onApply: (scenarios: Scenario[], mode: ApplyMode) => void
}

export const AiScenarioDialog = ({ isOpen, onClose, activeScenarioName, onApply }: AiScenarioDialogProps) => {
  const [request, setRequest] = useState('')
  const [response, setResponse] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [parsed, setParsed] = useState<Scenario[] | null>(null)

  const prompt = useMemo(() => buildPromptTemplate(request), [request])

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(prompt)
        setStatus('指示文をコピーしました。ChatGPT/Geminiに貼り付けて実行してください。')
      } else {
        window.prompt('指示文をコピーしてください', prompt)
      }
    } catch (error) {
      setStatus(`コピーに失敗しました: ${(error as Error).message}`)
    }
  }

  const handleValidate = () => {
    try {
      const cleaned = stripCodeFences(response)
      const data = JSON.parse(cleaned) as unknown
      const scenarios = coerceScenarioArray(data)
      if (!scenarios?.length) {
        setParsed(null)
        setStatus('JSON形式が不正です（Scenario / Scenario[] / {scenarios: Scenario[]}）')
        return
      }
      setParsed(scenarios)
      const first = scenarios[0]
      setStatus(`検証OK: ${scenarios.length}件（先頭: ${first?.name ?? '名称なし'}）`)
    } catch (error) {
      setParsed(null)
      setStatus(`JSONを解析できません: ${(error as Error).message}`)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="preset-modal" role="dialog" aria-modal="true" aria-label="AIで条件を作成（コピー&貼り付け）">
      <div className="preset-modal__panel">
        <header className="preset-modal__header">
          <div>
            <h3>AIで条件を作成（コピー&貼り付け）</h3>
            <p>APIキー不要で、ChatGPT/GeminiのUIを使ってシナリオJSONを作成できます。</p>
          </div>
          <button type="button" className="preset-modal__close-btn" onClick={onClose}>
            閉じる
          </button>
        </header>
        <div className="ai-dialog__grid">
          <section className="ai-dialog__pane">
            <h4>1) 要望</h4>
            <textarea
              rows={6}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="例: 夫35歳(手取り600万) 妻33歳(手取り300万)… 住宅ローン… 子ども2人…"
            />
            <div className="ai-dialog__actions">
              <button type="button" onClick={handleCopy}>
                2) 指示文をコピー
              </button>
            </div>
            <h4>指示文（プレビュー）</h4>
            <textarea readOnly rows={10} value={prompt} />
            <p className="ai-dialog__hint">
              生成した指示文をChatGPT/Geminiに貼り付けて実行し、返ってきたJSONを右側に貼り付けてください。
            </p>
          </section>

          <section className="ai-dialog__pane">
            <h4>3) AIの回答（JSON）</h4>
            <textarea
              rows={16}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="ここにAIの返答(JSON)を貼り付けます（```json ... ``` でもOK）"
            />
            <div className="ai-dialog__actions">
              <button type="button" onClick={handleValidate}>
                検証
              </button>
              <button type="button" disabled={!parsed?.length} onClick={() => parsed && onApply(parsed, 'append')}>
                新規シナリオとして追加
              </button>
              <button type="button" disabled={!parsed?.length} onClick={() => parsed && onApply(parsed, 'replace')}>
                シナリオ一覧を置換
              </button>
              <button type="button" disabled={!parsed?.length} onClick={() => parsed && onApply(parsed, 'overwrite')}>
                選択中を上書き{activeScenarioName ? `（${activeScenarioName}）` : ''}
              </button>
            </div>
            {status ? <p className="preset-modal__status">{status}</p> : null}
          </section>
        </div>
      </div>
    </div>
  )
}

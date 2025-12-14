import { useMemo, useState } from 'react'
import type { Scenario } from '@models/scenario'
import { sanitizeJsonText } from '@utils/sanitizeJsonText'

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
  return `あなたは「Life Plan Simulator」用の Scenario(JSON) を作るアシスタントです。
以下の要望から、Scenario(JSON)を1つだけ生成してください。

最重要ルール（必ず守る）:
1) 返答は JSON のみ（説明文/コードフェンス/箇条書きは禁止）
2) 未定の値は 0 または妥当な推定を入れる（空欄を作らない）
3) “このアプリのスキーマ” に存在しないキーは絶対に出さない（例: loanBalance / annualPayment / currentValue 等は禁止）
4) 通貨は日本円（数値は「円」単位）、利率は小数（例: 1.68% -> 0.0168）
5) id は省略してOK（アプリ側で付与）

要望:
${request}

スキーマの注意（よく間違える点）:
- 住宅ローン:
  - 住宅は housingPlans の type="own" を使う
  - ローン残高は mortgageRemaining（円）
  - 月々の支払いは monthlyMortgage（円/月）
  - このアプリは“住宅ローン金利”を直接持たないので、金利情報は description に書くか、支払額（monthlyMortgage）に織り込むこと
  - 管理費/修繕積立金は managementFeeMonthly / maintenanceReserveMonthly（円/月）。未指定なら推定して 0 にしない（例: 各1〜2万円/月）
- 車:
  - vehicles は「車ごとの年間コスト」と「購入/売却の年」を入れる
  - 買い替えは vehicles に “今の車(売却年あり)” と “次の車(購入年あり)” の2台を入れて表現する
  - purchaseYear / disposalYear は西暦（例: 2030）
  - purchasePrice は購入時の一括支出（頭金など）。ローンは loanRemaining + monthlyLoan で表現
- 教育費:
  - 子どもは residents に “住人(子ども)” として追加し、教育費は子どもの expenseBands に入れる（カテゴリ category:"education"）
  - residents[*].expenseBands の startAge/endAge は “その住人の年齢” で指定する
  - 学費は「幼稚園/保育園 → 公立小 → 公立中 → 私立高 → 私立大」まで一通り入れる（未指定は相場感で埋めて 0 にしない）
  - 子どもの年齢推定: 学年 + 6（小5=11歳、小3=9歳）として良い
- 退職金:
  - 退職金は residents[*].incomeEvents に {type:"retirement", triggerAge:退職年齢, amount:非0} として入れる
  - 明示がない場合の相場感: 会社員なら 1,000万〜2,000万円/人 程度を目安に入れる（0にしない）
- 貯蓄:
  - initialCash は原則 0 にして、資産は savingsAccounts に全て入れる
  - savingsAccounts.role は次のどれかのみ:
    emergency / short_term / goal_education / goal_house / goal_other / long_term
  - savingsAccounts.contributionPolicy は fixed か surplus_only のみ
  - savingsAccounts.withdrawPolicy は normal / last_resort / never のみ

厳格な出力テンプレ（このキーだけを使う）:
{
  "name": "シナリオ名",
  "description": "説明（住宅ローン金利など、スキーマ外の補足はここに記載）",
  "startYear": ${nowYear},
  "initialCash": 0,
  "residents": [
    {
      "name": "夫",
      "currentAge": 40,
      "retirementAge": 65,
      "baseNetIncome": 8000000,
      "annualIncomeGrowthRate": 0.01,
      "dependents": 2,
      "incomeEvents": [
        { "label": "退職金", "amount": 15000000, "type": "retirement", "triggerAge": 65 }
      ],
      "expenseBands": []
    },
    {
      "name": "妻",
      "currentAge": 40,
      "retirementAge": 65,
      "baseNetIncome": 5000000,
      "annualIncomeGrowthRate": 0.01,
      "dependents": 2,
      "incomeEvents": [
        { "label": "退職金", "amount": 10000000, "type": "retirement", "triggerAge": 65 }
      ],
      "expenseBands": []
    },
    {
      "name": "子1",
      "currentAge": 11,
      "retirementAge": 65,
      "baseNetIncome": 0,
      "annualIncomeGrowthRate": 0,
      "dependents": 0,
      "incomeEvents": [],
      "expenseBands": [
        { "label": "幼稚園/保育園", "startAge": 3, "endAge": 5, "annualAmount": 400000, "category": "education" },
        { "label": "公立小学校", "startAge": 6, "endAge": 11, "annualAmount": 150000, "category": "education" },
        { "label": "公立中学校", "startAge": 12, "endAge": 14, "annualAmount": 200000, "category": "education" },
        { "label": "私立高校", "startAge": 15, "endAge": 17, "annualAmount": 900000, "category": "education" },
        { "label": "私立大学", "startAge": 18, "endAge": 21, "annualAmount": 1200000, "category": "education" }
      ]
    },
    {
      "name": "子2",
      "currentAge": 9,
      "retirementAge": 65,
      "baseNetIncome": 0,
      "annualIncomeGrowthRate": 0,
      "dependents": 0,
      "incomeEvents": [],
      "expenseBands": [
        { "label": "幼稚園/保育園", "startAge": 3, "endAge": 5, "annualAmount": 400000, "category": "education" },
        { "label": "公立小学校", "startAge": 6, "endAge": 11, "annualAmount": 150000, "category": "education" },
        { "label": "公立中学校", "startAge": 12, "endAge": 14, "annualAmount": 200000, "category": "education" },
        { "label": "私立高校", "startAge": 15, "endAge": 17, "annualAmount": 900000, "category": "education" },
        { "label": "私立大学", "startAge": 18, "endAge": 21, "annualAmount": 1200000, "category": "education" }
      ]
    }
  ],
  "housingPlans": [
    {
      "label": "持ち家",
      "type": "own",
      "startYearOffset": 0,
      "endYearOffset": null,
      "builtYear": 2012,
      "mortgageRemaining": 18000000,
      "monthlyMortgage": 85000,
      "managementFeeMonthly": 15000,
      "maintenanceReserveMonthly": 12000,
      "extraAnnualCosts": 200000,
      "purchaseCost": 0,
      "saleValue": 0
    }
  ],
  "vehicles": [
    {
      "label": "VOXY",
      "purchaseYear": ${nowYear - 8},
      "purchasePrice": 0,
      "loanRemaining": 0,
      "monthlyLoan": 0,
      "inspectionCycleYears": 2,
      "inspectionCost": 120000,
      "maintenanceAnnual": 120000,
      "parkingMonthly": 12000,
      "insuranceAnnual": 70000
    },
    {
      "label": "買い替え後の車",
      "purchaseYear": ${nowYear + 5},
      "purchasePrice": 500000,
      "disposalYear": null,
      "disposalValue": 0,
      "loanRemaining": 3500000,
      "monthlyLoan": 60000,
      "inspectionCycleYears": 2,
      "inspectionCost": 120000,
      "maintenanceAnnual": 120000,
      "parkingMonthly": 12000,
      "insuranceAnnual": 70000
    }
  ],
  "livingPlans": [
    {
      "label": "生活費（込み）",
      "startYearOffset": 0,
      "endYearOffset": null,
      "baseAnnual": 0,
      "insuranceAnnual": 0,
      "utilitiesAnnual": 0,
      "discretionaryAnnual": 0,
      "healthcareAnnual": 0,
      "inflationRate": 0.01
    }
  ],
  "savingsAccounts": [
    {
      "label": "現金",
      "type": "deposit",
      "role": "emergency",
      "contributionPolicy": "fixed",
      "withdrawPolicy": "normal",
      "minBalance": 0,
      "balance": 0,
      "annualContribution": 0,
      "annualInterestRate": 0.001,
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
      const cleaned = sanitizeJsonText(stripCodeFences(response))
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

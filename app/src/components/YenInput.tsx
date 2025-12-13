import { useMemo, useState } from 'react'

type YenInputProps = {
  value: number | null | undefined
  onChange: (nextValue: number) => void
  onBlur?: () => void
  className?: string
  ariaLabel?: string
  placeholder?: string
}

const formatYen = (value: number) => `${Math.round(value).toLocaleString('ja-JP')}円`

const parseYen = (raw: string): number | null => {
  const cleaned = raw
    .replace(/,/g, '')
    .replace(/円/g, '')
    .replace(/\s/g, '')
    .replace(/[^\d-]/g, '')

  if (!cleaned || cleaned === '-') {
    return null
  }
  const parsed = Number(cleaned)
  if (!Number.isFinite(parsed)) {
    return null
  }
  return parsed
}

export const YenInput = ({ value, onChange, onBlur, className, ariaLabel, placeholder }: YenInputProps) => {
  const displayValue = useMemo(() => (Number.isFinite(value as number) ? (value as number) : 0), [value])
  const [focused, setFocused] = useState(false)
  const [editingText, setEditingText] = useState('')

  return (
    <input
      type="text"
      inputMode="numeric"
      className={['yen-input', className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={focused ? editingText : formatYen(displayValue)}
      onFocus={() => {
        setFocused(true)
        setEditingText(String(Math.round(displayValue)))
      }}
      onChange={(event) => {
        const nextText = event.target.value
        setEditingText(nextText)
        const parsed = parseYen(nextText)
        if (parsed == null) {
          return
        }
        onChange(parsed)
      }}
      onBlur={() => {
        setFocused(false)
        const parsed = parseYen(editingText) ?? 0
        onChange(parsed)
        onBlur?.()
        setEditingText('')
      }}
    />
  )
}

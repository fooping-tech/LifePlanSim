import type { ChangeEventHandler, KeyboardEventHandler } from 'react'

type SliderControlProps = {
  value: number
  min: number
  max: number
  step: number
  fineStep?: number
  ariaLabel: string
  onChange: (nextValue: number) => void
  formatValue?: (value: number) => string
}

export const SliderControl = ({
  value,
  min,
  max,
  step,
  fineStep,
  ariaLabel,
  onChange,
  formatValue,
}: SliderControlProps) => {
  const label = formatValue ? formatValue(value) : String(value)

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    onChange(Number(event.target.value))
  }

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (!fineStep || !event.shiftKey) {
      return
    }
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1
    const next = Math.min(max, Math.max(min, value + direction * fineStep))
    onChange(next)
  }

  return (
    <div className="slider-control">
      <div className="slider-control__row">
        <div className="slider-control__range">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={Number.isFinite(value) ? value : min}
            aria-label={ariaLabel}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />
        </div>
        <span className="slider-control__value" title={label}>
          {label}
        </span>
      </div>
      {fineStep ? <span className="slider-control__hint">Shift+矢印で微調整</span> : null}
    </div>
  )
}

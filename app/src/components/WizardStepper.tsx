type WizardStep = {
  id: string
  label: string
  status: 'done' | 'active' | 'todo'
}

interface WizardStepperProps {
  steps: WizardStep[]
  onStepSelect?: (id: string) => void
}

export const WizardStepper = ({ steps, onStepSelect }: WizardStepperProps) => {
  return (
    <ol className="wizard-stepper" aria-label="入力ステップ">
      {steps.map((step) => {
        return (
          <li key={step.id} className={['wizard-stepper__step', `is-${step.status}`].join(' ')}>
            <span className="wizard-stepper__dot" aria-hidden />
            {onStepSelect ? (
              <button
                type="button"
                className="wizard-stepper__btn"
                onClick={() => {
                  onStepSelect(step.id)
                }}
                aria-current={step.status === 'active' ? 'step' : undefined}
              >
                {step.label}
              </button>
            ) : (
              <span className="wizard-stepper__label">{step.label}</span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

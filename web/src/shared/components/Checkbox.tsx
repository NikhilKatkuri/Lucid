import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import './components.css'

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  error?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, error, id, className, ...rest }, ref) {
    const reactId = useId()
    const inputId = id ?? `cb-${reactId}`

    return (
      <div className={['checkbox-wrap', className].filter(Boolean).join(' ')}>
        <label className="checkbox" htmlFor={inputId}>
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            {...rest}
          />
          <span className="checkbox__box" aria-hidden="true" />
          <span className="checkbox__label">{label}</span>
        </label>
        {error && (
          <p className="field__msg field__msg--error" role="alert">
            <span>{error}</span>
          </p>
        )}
      </div>
    )
  },
)

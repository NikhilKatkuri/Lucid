import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import './components.css'

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible field label (always required for a11y). */
  label: string
  /** Error message — sets aria-invalid and role="alert" on the message. */
  error?: string
  helperText?: string
  /** Material Symbols name rendered inside the field (leading). */
  startIcon?: string
  /** Rendered inside the control on the trailing edge (e.g. reveal button). */
  endAdornment?: ReactNode
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      error,
      helperText,
      startIcon,
      endAdornment,
      id,
      className,
      ...rest
    },
    ref,
  ) {
    const reactId = useId()
    const inputId = id ?? `tf-${reactId}`
    const messageId = `${inputId}-msg`

    return (
      <div className={['field', className].filter(Boolean).join(' ')}>
        <label className="field__label" htmlFor={inputId}>
          {label}
        </label>
        <div
          className={['field__control', error ? 'field__control--error' : '']
            .filter(Boolean)
            .join(' ')}
        >
          {startIcon && (
            <Icon name={startIcon} size={20} className="field__lead-icon" />
          )}
          <input
            ref={ref}
            id={inputId}
            className="field__input"
            aria-invalid={error ? true : undefined}
            aria-describedby={error || helperText ? messageId : undefined}
            {...rest}
          />
          {endAdornment && <div className="field__end">{endAdornment}</div>}
        </div>
        {(error || helperText) && (
          <p
            id={messageId}
            className={error ? 'field__msg field__msg--error' : 'field__msg'}
            role={error ? 'alert' : undefined}
          >
            {error && <Icon name="error" size={16} />}
            <span>{error ?? helperText}</span>
          </p>
        )}
      </div>
    )
  },
)

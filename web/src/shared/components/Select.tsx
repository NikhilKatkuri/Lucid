import { forwardRef, useId } from 'react'
import type { ReactNode, SelectHTMLAttributes } from 'react'
import { Icon } from './Icon'
import './components.css'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  helperText?: string
  /** Options — pass <option> elements. */
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select(
    { label, error, helperText, id, className, children, ...rest },
    ref,
  ) {
    const reactId = useId()
    const selectId = id ?? `sel-${reactId}`
    const messageId = `${selectId}-msg`

    return (
      <div className={['field', className].filter(Boolean).join(' ')}>
        <label className="field__label" htmlFor={selectId}>
          {label}
        </label>
        <div
          className={[
            'field__control',
            'select__control',
            error ? 'field__control--error' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <select
            ref={ref}
            id={selectId}
            className="field__input"
            aria-invalid={error ? true : undefined}
            aria-describedby={error || helperText ? messageId : undefined}
            {...rest}
          >
            {children}
          </select>
          <Icon name="expand_more" size={24} className="select__chevron" />
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

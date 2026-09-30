import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './components.css'

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — icon-only controls must be labelled for screen readers. */
  label: string
  variant?: 'standard' | 'tonal' | 'filled'
  size?: number
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { label, variant = 'standard', size = 24, className, children, type = 'button', ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={[
          'icon-btn',
          'state-layer',
          `icon-btn--${variant}`,
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      >
        <span style={{ fontSize: size, lineHeight: 1 }} className="ms-icon">
          {children}
        </span>
      </button>
    )
  },
)

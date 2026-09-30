import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'
import './components.css'

export type ButtonVariant =
  | 'filled'
  | 'tonal'
  | 'outlined'
  | 'text'
  | 'destructive'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  /** Renders a spinner and disables the button. */
  loading?: boolean
  startIcon?: ReactNode
  endIcon?: ReactNode
  fullWidth?: boolean
  /** Larger touch target (48px) — used on auth forms. */
  large?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = 'filled',
      loading = false,
      startIcon,
      endIcon,
      fullWidth,
      large,
      className,
      children,
      disabled,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={[
          'btn',
          'state-layer',
          `btn--${variant}`,
          fullWidth ? 'btn--full' : '',
          large ? 'btn--lg' : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...rest}
      >
        {loading ? <Spinner size={18} /> : startIcon}
        <span className="btn__label">{children}</span>
        {!loading && endIcon}
      </button>
    )
  },
)

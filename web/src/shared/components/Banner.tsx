import type { ReactNode } from 'react'
import { Icon } from './Icon'
import './components.css'

export type BannerTone = 'info' | 'success' | 'warning' | 'error'

export interface BannerProps {
  tone?: BannerTone
  title?: string
  children?: ReactNode
  action?: ReactNode
  onDismiss?: () => void
}

const TONE_ICON: Record<BannerTone, string> = {
  info: 'info',
  success: 'check_circle',
  warning: 'warning',
  error: 'error',
}

/** Inline status banner — error-container style, per DESIGN.md §9. */
export function Banner({
  tone = 'info',
  title,
  children,
  action,
  onDismiss,
}: BannerProps) {
  return (
    <div
      className={`banner banner--${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <Icon name={TONE_ICON[tone]} size={20} className="banner__icon" />
      <div className="banner__content">
        {title && <p className="t-label-lg banner__title">{title}</p>}
        {children && <div className="t-body-md banner__text">{children}</div>}
      </div>
      {action && <div className="banner__action">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          className="banner__dismiss"
          aria-label="Dismiss banner"
          onClick={onDismiss}
        >
          <Icon name="close" size={18} />
        </button>
      )}
    </div>
  )
}

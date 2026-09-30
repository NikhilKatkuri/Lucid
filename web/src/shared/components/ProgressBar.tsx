import './components.css'

export interface ProgressBarProps {
  /** 0–100. Omit for the indeterminate bar. */
  value?: number
  label?: string
  className?: string
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const determinate = typeof value === 'number'
  const clamped = Math.max(0, Math.min(100, value ?? 0))
  return (
    <div
      className={[
        'progress',
        determinate ? '' : 'progress--indeterminate',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuenow={determinate ? clamped : undefined}
      aria-valuemin={determinate ? 0 : undefined}
      aria-valuemax={determinate ? 100 : undefined}
    >
      <div className="progress__bar" style={{ width: `${clamped}%` }} />
    </div>
  )
}

export interface SpinnerProps {
  size?: number
  className?: string
}

/** Indeterminate circular spinner (inherits currentColor). */
export function Spinner({ size = 20, className }: SpinnerProps) {
  return (
    <span
      className={['spinner', className].filter(Boolean).join(' ')}
      style={{ width: size, height: size, borderWidth: Math.max(2, size / 10) }}
      aria-hidden="true"
    />
  )
}

import type { CSSProperties } from 'react'

export interface IconProps {
  /** Material Symbols ligature name, e.g. "inventory_2" */
  name: string
  size?: number
  filled?: boolean
  className?: string
  style?: CSSProperties
}

/** Material Symbols Outlined icon (aria-hidden by default). */
export function Icon({ name, size, filled, className, style }: IconProps) {
  return (
    <span
      className={['ms-icon', className].filter(Boolean).join(' ')}
      aria-hidden="true"
      style={{
        fontSize: size ? `${size}px` : undefined,
        fontVariationSettings: filled ? "'FILL' 1" : undefined,
        ...style,
      }}
    >
      {name}
    </span>
  )
}

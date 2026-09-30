import type { HTMLAttributes, ReactNode } from 'react'
import './components.css'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'md' | 'lg'
  /** Adds hover elevation — only for interactive cards. */
  interactive?: boolean
  children: ReactNode
}

export function Card({
  padding = 'md',
  interactive,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        'card',
        `card--pad-${padding}`,
        interactive ? 'card--interactive' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </div>
  )
}

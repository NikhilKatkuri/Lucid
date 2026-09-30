import type { CSSProperties } from 'react'
import './components.css'

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: string
  className?: string
}

/** Shimmer placeholder — loading state per DESIGN.md §9 (never a full-page spinner). */
export function Skeleton({ width = '100%', height = 16, radius, className }: SkeletonProps) {
  const style: CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: radius,
  }
  return (
    <span
      className={['skeleton', className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    />
  )
}

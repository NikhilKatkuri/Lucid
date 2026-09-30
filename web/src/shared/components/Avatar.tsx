import type { CSSProperties } from 'react'
import './components.css'

export type AvatarAccent = 'blue' | 'purple' | 'cyan' | 'orange' | 'pink' | 'green'

const ACCENTS: AvatarAccent[] = ['blue', 'purple', 'cyan', 'orange', 'pink', 'green']

/** Stable hash so a given id always maps to the same accent color. */
export function accentFor(seed: string): AvatarAccent {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return ACCENTS[hash % ACCENTS.length]
}

export interface AvatarProps {
  name: string
  /** Stable id used to pick the accent color (tenant id, user id…). */
  seed?: string
  size?: number
  className?: string
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Circular initials avatar tinted from the accent palette. */
export function Avatar({ name, seed, size = 40, className }: AvatarProps) {
  const accent = accentFor(seed ?? name)
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.4),
    background: `var(--sys-${accent}-container)`,
    color: `var(--sys-on-${accent}-container)`,
  }
  return (
    <span
      className={['avatar', className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

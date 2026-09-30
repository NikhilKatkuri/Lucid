import { useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Icon } from './Icon'
import './components.css'

export interface TabItem {
  id: string
  label: string
  icon?: string
}

export interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (id: string) => void
  ariaLabel?: string
}

/** Accessible tablist with arrow-key navigation and a 3px indicator. */
export function Tabs({ items, value, onChange, ariaLabel = 'Sections' }: TabsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = items.findIndex((item) => item.id === value)
    let next = index
    if (event.key === 'ArrowRight') next = (index + 1) % items.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = items.length - 1
    else return
    event.preventDefault()
    onChange(items[next].id)
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    buttons?.[next]?.focus()
  }

  return (
    <div
      ref={listRef}
      className="tabs"
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
    >
      {items.map((item) => {
        const selected = item.id === value
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="tab state-layer"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
          >
            {item.icon && <Icon name={item.icon} size={20} />}
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import './components.css'

export interface MenuItem {
  id: string
  label: string
  icon?: string
  danger?: boolean
  dividerBefore?: boolean
  /** Renders as a non-interactive group heading (e.g. an organization name). */
  header?: boolean
  /** Renders a trailing checkmark (current selection). */
  selected?: boolean
  onSelect?: () => void
}

export interface MenuProps {
  /** Rendered as the menu trigger — must be a button-compatible element. */
  trigger: ReactNode
  items: MenuItem[]
  align?: 'start' | 'end'
  ariaLabel?: string
}

/** Lightweight dropdown menu: click-outside + Escape close, grouped items. */
export function Menu({ trigger, items, align = 'end', ariaLabel = 'Menu' }: MenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="menu" ref={wrapRef}>
      <button
        ref={triggerRef}
        type="button"
        className="menu__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      {open && (
        <div
          id={menuId}
          className={`menu__popup menu__popup--${align}`}
          role="menu"
          aria-label={ariaLabel}
        >
          {items.map((item) =>
            item.header ? (
              <div key={item.id} className="menu__group">
                {item.dividerBefore && <hr className="menu__divider" />}
                <p className="menu__header">{item.label}</p>
              </div>
            ) : (
              <div key={item.id} className="menu__row">
                {item.dividerBefore && <hr className="menu__divider" />}
                <button
                  type="button"
                  role="menuitemradio"
                  aria-checked={item.selected ?? false}
                  className={[
                    'menu__item',
                    'state-layer',
                    item.danger ? 'menu__item--danger' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    setOpen(false)
                    item.onSelect?.()
                  }}
                >
                  {item.icon ? (
                    <Icon name={item.icon} size={20} />
                  ) : (
                    <span className="menu__icon-spacer" aria-hidden="true" />
                  )}
                  <span className="menu__label">{item.label}</span>
                  {item.selected && <Icon name="check" size={20} />}
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  )
}

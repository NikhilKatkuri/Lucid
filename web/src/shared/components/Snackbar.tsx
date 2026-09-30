import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { IconButton } from './IconButton'
import './components.css'

export type SnackbarVariant = 'default' | 'success' | 'error'

export interface SnackbarOptions {
  message: string
  variant?: SnackbarVariant
  action?: { label: string; onClick: () => void }
  durationMs?: number
}

interface SnackbarState extends Required<Pick<SnackbarOptions, 'message'>> {
  id: number
  variant: SnackbarVariant
  action?: { label: string; onClick: () => void }
}

interface SnackbarContextValue {
  show: (message: string, options?: Omit<SnackbarOptions, 'message'>) => void
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null)

/** Must be mounted once, near the app root. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<SnackbarState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback(
    (
      messageOrOptions: string | SnackbarOptions,
      options?: Omit<SnackbarOptions, 'message'>,
    ) => {
      const opts: SnackbarOptions =
        typeof messageOrOptions === 'string'
          ? { ...options, message: messageOrOptions }
          : messageOrOptions
      setCurrent({
        id: Date.now(),
        message: opts.message,
        variant: opts.variant ?? 'default',
        action: opts.action,
      })
      const duration = opts.durationMs ?? 4000
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCurrent(null), duration)
    },
    [],
  )

  useEffect(() => () => clearTimeout(timer.current), [])

  const value = useMemo(() => ({ show }), [show])

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {current && (
        <div
          className="snackbar-host"
          role="status"
          aria-live="polite"
          key={current.id}
        >
          <div className={`snackbar snackbar--${current.variant}`}>
            {current.variant === 'success' && <Icon name="check_circle" size={20} />}
            {current.variant === 'error' && <Icon name="error" size={20} />}
            <span className="snackbar__msg">{current.message}</span>
            {current.action && (
              <button
                type="button"
                className="snackbar__action"
                onClick={() => {
                  current.action?.onClick()
                  setCurrent(null)
                }}
              >
                {current.action.label}
              </button>
            )}
            <IconButton
              label="Dismiss"
              size={18}
              className="snackbar__close"
              onClick={() => setCurrent(null)}
            >
              close
            </IconButton>
          </div>
        </div>
      )}
    </SnackbarContext.Provider>
  )
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext)
  if (!ctx) throw new Error('useSnackbar must be used within SnackbarProvider')
  return ctx
}
